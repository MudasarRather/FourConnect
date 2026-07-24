/*
  useIncidentTimeline — the SHARED data spine for both Incident Timeline desks
  (agent "Service Diagram" + admin "Annual Report"). Same contract discipline
  as useCriticalDesk: the sections are thin orchestrators over this spine and
  render completely differently.

    · one sealed server window   → fetchIncidentTimeline(params) (backend seals;
      panel only sets defaults — admin exposes the team lens, agent "my incidents")
    · hero instruments           → fetchIncidentTimelinePulse over the SAME filters
    · chips from server truth    → fetchIncidentEventCatalog merged over the client
      overlays (incidentTaxonomy.mergeCatalog) — desks never declare action maps
    · LIVE mode                  → 18s since-cursor incremental polls land in a
      BUFFER (never repaint under the pointer); flushBuffer() folds them into the
      day buckets and feeds `arrivals` so the hero flashes instead of the board
      yanking; the 60s full poll stays page-1-only (legacy behavior)
    · milestones                 → independent milestones=1 fetch so the pinned
      spine survives every filter; pin/unpin are optimistic with rollback
    · deep links                 → ?kinds/?sev/?from/?to/?q/?team/?actor/?actor_id/
      ?exposure/?mi/?stones/?live/?focus (router.replace, loop-broken)

  Usage:
    const desk = useIncidentTimeline({ panel: props.panel })
    onMounted(desk.start); onBeforeUnmount(desk.stop)
    watch(anyOverlayOpen, (v) => { desk.uiHold.value = v })
*/
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchIncidentTimeline, fetchIncidentTimelinePulse, fetchIncidentEventCatalog,
  pinTimelineMilestone, unpinTimelineMilestone, fetchMe,
} from '@/composables/useSupportDesk'
import { mergeCatalog, metaOf } from './incidentTaxonomy'

const LIMIT = 100
const LIVE_EVERY = 18000
const POLL_EVERY = 60000
// Deep-link input whitelists — a hand-crafted / stale URL is the only way an
// out-of-range value reaches these refs (every in-app control is already bounded),
// and the backend 422s them; refresh() swallows that into a silent stale board, so
// validate at the door instead. (kinds is validated post-catalog in loadCatalog.)
const EXPOSURE_KEYS = ['security', 'compliance', 'public', 'revenue']

/* Local day key for client-side bucket merges — mirrors the server's tz_offset
   bucketing (both read the caller's local calendar). */
const dayKeyOf = (at) => {
  const d = new Date(at)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function useIncidentTimeline (opts = {}) {
  const { panel = 'admin' } = opts
  const route = useRoute()
  const router = useRouter()

  /* ── state (refs before computeds — TDZ) ── */
  const days = ref([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const pulse = ref(null)
  const catalog = ref(mergeCatalog(null))          // usable pre-fetch fallback
  const catalogRaw = ref(null)
  const stones = ref([])                           // pinned milestones (filter-proof)
  const q = ref('')
  const kinds = ref([])                            // active kind chips (validated keys)
  const sev = ref(null)
  const from = ref('')                             // yyyy-mm-dd
  const to = ref('')
  const teamId = ref('')                           // admin lens
  const actorId = ref('')                          // manager deep-link / person focus
  const actorKind = ref('')                        // '' | human | system
  const exposure = ref('')                         // '' | security|compliance|public|revenue
  const miOnly = ref(false)
  const stonesOnly = ref(false)
  const mine = ref(false)                          // agent "MY INCIDENTS" (owner_id=me)
  const live = ref(false)
  const cursor = ref(null)
  const buffer = ref([])                           // since-cursor arrivals, unflushed
  const arrivals = ref({ count: 0, ids: [] })
  const uiHold = ref(false)
  const focusId = ref(null)
  const now = ref(Date.now())
  const me = ref(null)
  let tick = null
  let poll = null
  let livePoll = null
  let qTimer = null
  let started = false
  let refreshSeq = 0
  let syncing = false

  const events = computed(() => days.value.flatMap((d) => d.events || []))
  const metaFor = (action) => metaOf(catalog.value, action)

  /* Normalize the date window: end-date extends to end-of-day, and a reversed range
     (from > to) is swapped rather than sent as-is — the pulse endpoint 422s on
     from >= to, which would silently blank the hero while the feed still paints. */
  const windowISO = () => {
    let f = from.value || ''
    let t = to.value || ''
    if (f && t && new Date(f) > new Date(t)) { const s = f; f = t; t = s }
    const fromISO = f ? new Date(f).toISOString() : undefined
    let toISO
    if (t) { const d = new Date(t); d.setHours(23, 59, 59, 999); toISO = d.toISOString() }
    return { from: fromISO, to: toISO }
  }

  /* ── the server window ── */
  const params = () => ({
    page: page.value,
    limit: LIMIT,
    q: q.value.trim() || undefined,
    kinds: kinds.value.length ? kinds.value.join(',') : undefined,
    sev: sev.value || undefined,
    ...windowISO(),
    team_id: teamId.value || undefined,
    actor_id: actorId.value || (mine.value && me.value?.id ? me.value.id : undefined),
    actor: actorKind.value || undefined,
    exposure: exposure.value || undefined,
    mi_only: miOnly.value ? 1 : undefined,
    milestones: stonesOnly.value ? 1 : undefined,
  })
  /* pulse rides the ticket-side subset of the same window */
  const pulseParams = () => {
    const p = params()
    return {
      from: p.from, to: p.to, sev: p.sev, team_id: p.team_id,
      owner_id: mine.value && me.value?.id ? me.value.id : undefined,
      mi_only: p.mi_only,
    }
  }

  const refresh = async (silent = true) => {
    const seq = ++refreshSeq
    if (!silent) loading.value = true
    try {
      const [list, pl] = await Promise.all([
        fetchIncidentTimeline(params()),
        fetchIncidentTimelinePulse(pulseParams()).catch(() => null),
      ])
      if (seq !== refreshSeq) return
      days.value = list.days || []
      total.value = list.total || 0
      if (page.value === 1 && list.cursor) cursor.value = list.cursor
      if (pl) pulse.value = pl
      buffer.value = []                            // full paint supersedes the buffer
      const maxPage = Math.max(1, Math.ceil(total.value / LIMIT))
      if (page.value > maxPage) page.value = maxPage
    } catch { /* keep last good board */ }
    finally { if (seq === refreshSeq) loading.value = false }
  }

  const refreshStones = async () => {
    try {
      const res = await fetchIncidentTimeline({ milestones: 1, limit: 24, page: 1 })
      stones.value = (res.days || []).flatMap((d) => d.events || [])
    } catch { /* strip keeps last good */ }
  }

  const loadCatalog = async () => {
    try {
      catalogRaw.value = await fetchIncidentEventCatalog()
      catalog.value = mergeCatalog(catalogRaw.value)
      // A stale / hand-crafted ?kinds deep-link can carry an action the server no
      // longer knows — the feed 422s the whole request and refresh() swallows it into
      // a silent stale board (filter appears dead). Once the real catalog lands, drop
      // unknown kinds so the record self-corrects (the watch refetches + syncQuery
      // cleans the URL). Emptying to [] is the safe fallback = the whole index.
      if (kinds.value.length) {
        const known = new Set(Object.keys(catalog.value || {}))
        const pruned = kinds.value.filter((k) => known.has(k))
        if (pruned.length !== kinds.value.length) kinds.value = pruned
      }
    } catch { /* overlays fallback already in place */ }
  }

  /* ── LIVE mode: incremental since-cursor → buffer (never repaints) ── */
  const livePull = async () => {
    if (!live.value || !cursor.value || page.value !== 1) return
    if (document.hidden || uiHold.value) return
    try {
      const res = await fetchIncidentTimeline({ ...params(), page: 1, since: cursor.value })
      const fresh = (res.days || []).flatMap((d) => d.events || [])
      if (res.cursor) cursor.value = res.cursor
      if (!fresh.length) return
      const known = new Set(buffer.value.map((e) => String(e.id)))
      const add = fresh.filter((e) => !known.has(String(e.id)))
      if (add.length) buffer.value = [...add, ...buffer.value]
    } catch { /* next pull retries */ }
  }

  const flushBuffer = () => {
    if (!buffer.value.length) return
    const add = [...buffer.value]
    buffer.value = []
    const byDay = new Map(days.value.map((d) => [String(d.day), d]))
    // newest-first insertion so each bucket keeps its descending order
    for (const e of [...add].sort((a, b) => new Date(a.at) - new Date(b.at))) {
      const key = dayKeyOf(e.at)
      if (byDay.has(key)) {
        byDay.get(key).events.unshift(e)
      } else {
        const bucket = { day: key, events: [e] }
        days.value.unshift(bucket)
        byDay.set(key, bucket)
      }
    }
    total.value += add.length
    arrivals.value = {
      count: arrivals.value.count + add.length,
      ids: add.map((e) => String(e.id)),
    }
  }

  /* ── milestone pins: optimistic + rollback; strip refreshes silently ── */
  const findEvent = (id) => events.value.find((e) => String(e.id) === String(id)) ||
    buffer.value.find((e) => String(e.id) === String(id)) ||
    stones.value.find((e) => String(e.id) === String(id))
  const pin = async (eventId) => {
    const ev = findEvent(eventId)
    if (ev) ev.is_milestone = true
    try {
      await pinTimelineMilestone(eventId)
      refreshStones()
    } catch (err) {
      if (ev) ev.is_milestone = false
      throw err
    }
  }
  const unpin = async (eventId) => {
    const ev = findEvent(eventId)
    if (ev) ev.is_milestone = false
    try {
      await unpinTimelineMilestone(eventId)
      refreshStones()
    } catch (err) {
      if (ev) ev.is_milestone = true
      throw err
    }
  }

  const clearFilters = () => {
    q.value = ''; kinds.value = []; sev.value = null; from.value = ''; to.value = ''
    teamId.value = ''; actorId.value = ''; actorKind.value = ''; exposure.value = ''
    miOnly.value = false; stonesOnly.value = false; mine.value = false
  }
  const toggleKind = (k) => {
    kinds.value = kinds.value.includes(k)
      ? kinds.value.filter((x) => x !== k) : [...kinds.value, k]
  }
  const setFocus = (id) => { focusId.value = id ? String(id) : null; syncQuery() }
  const hasFilters = computed(() =>
    !!(q.value.trim() || kinds.value.length || sev.value || from.value || to.value ||
       teamId.value || actorId.value || actorKind.value || exposure.value ||
       miOnly.value || stonesOnly.value || mine.value))

  /* ── deep links (reserved workspace keys `new`/`ticket` untouched) ── */
  const hydrateFromRoute = (query) => {
    syncing = true
    if (query.kinds != null) kinds.value = String(query.kinds).split(',').filter(Boolean)
    if (query.sev != null) { const n = Number(query.sev); sev.value = (n >= 1 && n <= 4) ? n : null }
    if (query.from != null) from.value = String(query.from)
    if (query.to != null) to.value = String(query.to)
    if (query.q != null) q.value = String(query.q)
    if (query.team != null) teamId.value = String(query.team)
    if (query.actor_id != null) actorId.value = String(query.actor_id)
    if (query.actor != null && ['human', 'system'].includes(String(query.actor))) actorKind.value = String(query.actor)
    if (query.exposure != null) { const ex = String(query.exposure); exposure.value = EXPOSURE_KEYS.includes(ex) ? ex : '' }
    if (query.mi != null) miOnly.value = query.mi === '1'
    if (query.stones != null) stonesOnly.value = query.stones === '1'
    if (query.mine != null) mine.value = query.mine === '1'
    if (query.live != null) live.value = query.live === '1'
    focusId.value = query.focus ? String(query.focus) : focusId.value
    syncing = false
  }
  const OWN_KEYS = ['kinds', 'sev', 'from', 'to', 'q', 'team', 'actor', 'actor_id',
                    'exposure', 'mi', 'stones', 'mine', 'live', 'focus']
  const syncQuery = () => {
    if (!started || syncing) return
    const next = { ...route.query }
    OWN_KEYS.forEach((k) => delete next[k])
    if (kinds.value.length) next.kinds = kinds.value.join(',')
    if (sev.value) next.sev = String(sev.value)
    if (from.value) next.from = from.value
    if (to.value) next.to = to.value
    if (q.value.trim()) next.q = q.value.trim()
    if (teamId.value) next.team = teamId.value
    if (actorId.value) next.actor_id = actorId.value
    if (actorKind.value) next.actor = actorKind.value
    if (exposure.value) next.exposure = exposure.value
    if (miOnly.value) next.mi = '1'
    if (stonesOnly.value) next.stones = '1'
    if (mine.value) next.mine = '1'
    if (live.value) next.live = '1'
    if (focusId.value) next.focus = focusId.value
    const cur = route.query
    const same = OWN_KEYS.every((k) => String(cur[k] ?? '') === String(next[k] ?? ''))
    if (!same) router.replace({ query: next }).catch(() => {})
  }

  /* ── filters → refetch (debounced text; page resets; deep link syncs) ── */
  watch(q, () => {
    clearTimeout(qTimer)
    qTimer = setTimeout(() => { page.value = 1; refresh(false); syncQuery() }, 300)
  })
  watch([kinds, sev, from, to, teamId, actorId, actorKind, exposure, miOnly, stonesOnly, mine],
        () => { page.value = 1; refresh(false); syncQuery() }, { deep: true })
  watch(page, () => refresh(false))
  watch(live, () => syncQuery())
  watch(() => route.query, (query) => { if (started) hydrateFromRoute(query) })

  /* ── lifecycle ── */
  const start = () => {
    if (started) return
    started = true
    hydrateFromRoute(route.query)
    refresh(false)
    refreshStones()
    loadCatalog()
    fetchMe().then((u) => { me.value = u }).catch(() => {})
    tick = setInterval(() => { now.value = Date.now() }, 1000)
    poll = setInterval(() => {
      // full repaint only on page 1 (legacy behavior); deeper pages refresh pulse only
      if (document.hidden || uiHold.value) return
      if (page.value === 1) refresh(true)
      else fetchIncidentTimelinePulse(pulseParams()).then((pl) => { pulse.value = pl }).catch(() => {})
    }, POLL_EVERY)
    livePoll = setInterval(livePull, LIVE_EVERY)
  }
  const stop = () => {
    started = false
    refreshSeq++
    clearInterval(tick); clearInterval(poll); clearInterval(livePoll); clearTimeout(qTimer)
    tick = null; poll = null; livePoll = null; qTimer = null
  }

  return {
    // state
    days, events, total, page, limit: LIMIT, loading, pulse, catalog, catalogRaw,
    stones, q, kinds, sev, from, to, teamId, actorId, actorKind, exposure,
    miOnly, stonesOnly, mine, live, cursor, buffer, arrivals, uiHold, focusId, now, me,
    // derived + helpers
    metaFor, hasFilters, params,
    // actions
    refresh, refreshStones, flushBuffer, pin, unpin, toggleKind, clearFilters,
    setFocus, start, stop,
  }
}
