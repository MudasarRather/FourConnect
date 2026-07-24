/*
  usePirDesk — the SHARED data spine for both Post-Incident desks
  (agent author's desk + admin governance desk — concept skins pending picks).
  Mirrors useRcaDesk's mechanics over GET /incidents/pirs/board: rows + chip
  stats arrive in the SAME sealed response, so a chip's number can never drift
  from the rows its click returns.

    · lenses          → PIR_LENSES below; single active lens, toggle-off falls
      back to the desk's defaultLens (agent 'owed', admin 'in_review').
    · poll hygiene    → 1s now tick + 60s SILENT poll gated on document.hidden
      and uiHold, refreshSeq stale-response guard, pager clamp, arrivals Set.
    · actions         → /incidents/actions (my follow-through strip / the admin
      governance table) on demand + after verbs.
    · verbs           → applyOptimistic(id, patch) returns a rollback fn; the
      section owns the API call and calls afterVerb() on success.
    · legacy deep link → dashboards emit goTab('post-incident', { status }) —
      hydrate maps ?status= onto the matching lens so old links keep working.

  Usage:
    const desk = usePirDesk({ panel: props.panel, limit: 10 })
    onMounted(desk.start); onBeforeUnmount(desk.stop)
    watch(anyModalOpen, (v) => { desk.uiHold.value = v })
*/
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPirBoard, listIncidentActions } from '@/composables/useSupportDesk'

/* ─────────────────────────── Lens translation map ───────────────────────────
   chip key → board `lens` param → stats selector over the board's lockstep
   stats block. Desks must NEVER inline stats.x in a template — this map is the
   whole blast radius if the backend shape ever shifts. */
export const PIR_LENSES = {
  owed:        { label: 'OWED',        params: { lens: 'owed' },        stat: (s) => s?.owed ?? 0 },
  drafting:    { label: 'DRAFTING',    params: { lens: 'drafting' },    stat: (s) => s?.draft ?? 0 },
  in_review:   { label: 'IN REVIEW',   params: { lens: 'in_review' },   stat: (s) => s?.in_review ?? 0 },
  approved:    { label: 'APPROVED',    params: { lens: 'approved' },    stat: (s) => s?.approved ?? 0 },
  published:   { label: 'PUBLISHED',   params: { lens: 'published' },   stat: (s) => s?.published ?? 0 },
  actions_due: { label: 'ACTIONS DUE', params: { lens: 'actions_due' }, stat: (s) => s?.actions_due ?? 0 },
  all:         { label: 'ALL RECORDS', params: { lens: 'all' },         stat: (s) => (s?.draft ?? 0) + (s?.in_review ?? 0) + (s?.approved ?? 0) + (s?.published ?? 0) },
}
export const PIR_SORTS = ['updated', 'submitted', 'created', 'sev', 'age']
// dashboards' legacy goTab('post-incident', { status }) deep link → lens
const LEGACY_STATUS_TO_LENS = {
  draft: 'drafting', in_review: 'in_review', approved: 'approved', published: 'published',
}

export function usePirDesk (opts = {}) {
  const {
    panel = 'admin', limit = 10,
    defaultLens = panel === 'admin' ? 'in_review' : 'owed',
    actions: wantActions = true,
  } = opts
  const route = useRoute()
  const router = useRouter()

  /* ── state (declare every ref BEFORE any computed/watch — TDZ) ── */
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const stats = ref(null)                       // board's lockstep chip counts
  const actions = ref({ total: 0, counts: null, items: [] })
  const actionsLoading = ref(false)
  const now = ref(Date.now())
  // consumed by the hero instrument; the section resets after flashing:
  // desk.arrivals.value = { count: 0, ids: [] }
  const arrivals = ref({ count: 0, ids: [] })
  const q = ref('')
  const lens = ref(defaultLens)                 // exactly one active lens, always set
  const sevFilter = ref(null)
  const actorId = ref(null)                     // manager deep link (?actor=)
  const uiHold = ref(false)
  const sortKey = ref('updated')
  const focusId = ref(null)
  let tick = null
  let poll = null
  let qTimer = null
  let knownIds = new Set()
  let started = false
  let refreshSeq = 0                            // stale-response guard
  let actionsSeq = 0
  let syncing = false                           // route↔state loop breaker

  const params = () => ({
    lens: lens.value,
    page: page.value,
    limit,
    q: q.value.trim() || undefined,
    sev: sevFilter.value || undefined,
    sort: sortKey.value || undefined,
  })

  const rowKey = (r) => String(r.pir_id || r.ticket_id)

  const refresh = async (silent = true) => {
    const seq = ++refreshSeq
    if (!silent) loading.value = true
    try {
      const res = await fetchPirBoard(params())
      if (seq !== refreshSeq) return            // superseded — never paint stale pages
      const items = res.items || []
      if (silent && knownIds.size) {
        const fresh = items.filter((r) => !knownIds.has(rowKey(r))).map(rowKey)
        if (fresh.length) arrivals.value = { count: arrivals.value.count + fresh.length, ids: fresh }
      }
      items.forEach((r) => knownIds.add(rowKey(r)))
      rows.value = items
      total.value = res.total || 0
      stats.value = res.stats || null
      const maxPage = Math.max(1, Math.ceil(total.value / limit))
      if (page.value > maxPage) page.value = maxPage
    } catch { /* board keeps last good state */ }
    finally { if (seq === refreshSeq) loading.value = false }
  }

  // Follow-through strip/table. The agent desk passes { owner_id: me } for the
  // "my actions" strip; the admin governance table calls it unfiltered.
  const refreshActions = async (extra = {}, silent = true) => {
    if (!wantActions) return
    const seq = ++actionsSeq
    if (!silent) actionsLoading.value = true
    try {
      const res = await listIncidentActions({ status: 'open', limit: 50, ...extra })
      if (seq === actionsSeq) actions.value = res || { total: 0, counts: null, items: [] }
    } catch { /* keep last good */ }
    finally { if (seq === actionsSeq) actionsLoading.value = false }
  }

  /* ── lens vocabulary ── */
  const lensKey = computed(() => lens.value)
  // ALL stats reads go through this — never inline stats.x in a template.
  const statOf = (key) => (PIR_LENSES[key] ? PIR_LENSES[key].stat(stats.value || {}) : 0)
  const applyLens = (key) => {
    if (!PIR_LENSES[key]) return
    // toggling the active lens off falls back to the desk's home lens
    lens.value = (lens.value === key && key !== defaultLens) ? defaultLens : key
  }
  const clearLenses = () => { lens.value = defaultLens; q.value = ''; sevFilter.value = null; actorId.value = null }
  const onSort = (key) => {
    if (!PIR_SORTS.includes(key)) return
    sortKey.value = key
    refresh(false)
  }
  const setFocus = (id) => { focusId.value = id ? String(id) : null; syncQuery() }
  const setActor = (id) => { actorId.value = id ? String(id) : null; page.value = 1; refresh(false); syncQuery() }
  const setSev = (s) => { sevFilter.value = s || null; page.value = 1; refresh(false) }

  /* ── optimistic verbs: flip the row locally, return a rollback ── */
  const applyOptimistic = (id, patch) => {
    const idx = rows.value.findIndex((r) => rowKey(r) === String(id))
    if (idx < 0) return () => {}
    const before = { ...rows.value[idx] }
    rows.value[idx] = { ...rows.value[idx], ...patch }
    return () => { const i = rows.value.findIndex((r) => rowKey(r) === String(id)); if (i >= 0) rows.value[i] = before }
  }
  // after ANY successful verb: board (counts moved) + follow-through (registers moved)
  const afterVerb = (actionsExtra = {}) => { refresh(true); refreshActions(actionsExtra, true) }

  /* ── deep links: ?lens / ?q / ?focus / ?actor / ?sev (+ legacy ?status) ── */
  const hydrateFromRoute = (query) => {
    syncing = true
    if (query.lens && PIR_LENSES[String(query.lens)]) lens.value = String(query.lens)
    // legacy: the module dashboards deep-link ?status=<pir status>
    else if (query.status && LEGACY_STATUS_TO_LENS[String(query.status)]) {
      lens.value = LEGACY_STATUS_TO_LENS[String(query.status)]
    }
    if (query.q != null) q.value = String(query.q)
    if (query.actor) actorId.value = String(query.actor)
    if (query.sev && [1, 2, 3, 4].includes(Number(query.sev))) sevFilter.value = Number(query.sev)
    focusId.value = query.focus ? String(query.focus) : focusId.value
    syncing = false
  }
  const syncQuery = () => {
    if (!started || syncing) return
    const next = { ...route.query }
    delete next.lens; delete next.q; delete next.focus; delete next.actor
    delete next.sev; delete next.status
    if (lens.value !== defaultLens) next.lens = lens.value
    if (q.value.trim()) next.q = q.value.trim()
    if (focusId.value) next.focus = focusId.value
    if (actorId.value) next.actor = actorId.value
    if (sevFilter.value) next.sev = String(sevFilter.value)
    const cur = route.query
    const same = ['lens', 'q', 'focus', 'actor', 'sev'].every((k) => String(cur[k] ?? '') === String(next[k] ?? ''))
    if (!same) router.replace({ query: next }).catch(() => {})
  }

  watch(q, () => {
    clearTimeout(qTimer)
    qTimer = setTimeout(() => { page.value = 1; refresh(false); syncQuery() }, 300)
  })
  watch(lens, () => { page.value = 1; refresh(false); syncQuery() })
  watch(page, () => refresh(false))
  watch(() => route.query, (query) => { if (started) hydrateFromRoute(query) })

  /* ── lifecycle ── */
  const start = (actionsExtra = {}) => {
    if (started) return
    started = true
    hydrateFromRoute(route.query)
    refresh(false)
    refreshActions(actionsExtra, false)
    tick = setInterval(() => { now.value = Date.now() }, 1000)
    poll = setInterval(() => {
      if (!document.hidden && !uiHold.value) refresh(true)
    }, 60000)
  }
  const stop = () => {
    started = false
    refreshSeq++; actionsSeq++
    clearInterval(tick); clearInterval(poll); clearTimeout(qTimer)
    tick = null; poll = null; qTimer = null
  }

  return {
    // state
    rows, total, page, loading, stats, actions, actionsLoading, now, arrivals,
    q, lens, sevFilter, actorId, uiHold, sortKey, focusId,
    // derived + selectors
    lensKey, statOf,
    // actions
    refresh, refreshActions, applyLens, clearLenses, onSort, setFocus, setActor,
    setSev, applyOptimistic, afterVerb, start, stop,
  }
}
