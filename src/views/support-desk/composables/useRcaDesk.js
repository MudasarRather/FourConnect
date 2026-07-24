/*
  useRcaDesk — the SHARED data spine for both RCA desks
  (agent "Teardown × Stack Descent" + admin "Clearinghouse" governance).
  Mirrors useCriticalDesk's mechanics with ONE structural upgrade: the board
  endpoint returns rows + chip stats + debt aging in the SAME sealed response
  (GET /incidents/rca/board), so a chip's number can never drift from the rows
  its click returns — there is no second stats fetch to fall out of sync.

    · lenses          → RCA_LENSES below; single active lens, toggle-off falls
      back to the desk's defaultLens (agent 'owed', admin 'pending').
    · poll hygiene    → 1s now tick + 60s SILENT poll gated on document.hidden
      and uiHold, refreshSeq stale-response guard, pager clamp, arrivals Set.
    · analytics       → /incidents/rca/analytics on a 300s cadence + forced by
      afterVerb() (filing/validating/returning moves coverage immediately).
    · clusters        → /incidents/rca/clusters, manual + after a nomination.
    · verbs           → applyOptimistic(id, patch) returns a rollback fn; the
      section owns the API call and calls afterVerb() on success.

  Usage:
    const desk = useRcaDesk({ panel: props.panel, limit: 10, defaultLens: 'owed',
                              analytics: true, clusters: false })
    onMounted(desk.start); onBeforeUnmount(desk.stop)
    watch(anyModalOpen, (v) => { desk.uiHold.value = v })
*/
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchRcaBoard, fetchRcaAnalytics, fetchRcaClusters,
} from '@/composables/useSupportDesk'

/* ─────────────────────────── Lens translation map ───────────────────────────
   chip key → board `lens` param → stats selector over the board's lockstep
   stats block. Desks must NEVER inline stats.x in a template — this map is the
   whole blast radius if the backend shape ever shifts. */
export const RCA_LENSES = {
  owed:      { label: 'OWED',      params: { lens: 'owed' },      stat: (s) => s?.owed ?? 0 },
  returned:  { label: 'RETURNED',  params: { lens: 'returned' },  stat: (s) => s?.returned ?? 0 },
  pending:   { label: 'FILED',     params: { lens: 'pending' },   stat: (s) => s?.pending ?? 0 },
  validated: { label: 'VALIDATED', params: { lens: 'validated' }, stat: (s) => s?.validated ?? 0 },
  stale:     { label: 'STALE',     params: { lens: 'stale' },     stat: (s) => s?.stale ?? 0 },
  all:       { label: 'ALL',       params: { lens: 'all' },       stat: (s) => (s?.owed ?? 0) + (s?.pending ?? 0) + (s?.returned ?? 0) + (s?.validated ?? 0) + (s?.stale ?? 0) },
}
export const RCA_SORTS = ['owed_age', 'resolved_at', 'filed_at', 'sev']

export function useRcaDesk (opts = {}) {
  const {
    panel = 'admin', limit = 10,
    defaultLens = panel === 'admin' ? 'pending' : 'owed',
    analytics: wantAnalytics = true,
    clusters: wantClusters = false,
    days = 30,
  } = opts
  const route = useRoute()
  const router = useRouter()

  /* ── state (declare every ref BEFORE any computed/watch — TDZ) ── */
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const stats = ref(null)                       // board's lockstep chip counts
  const aging = ref(null)                       // board's lockstep debt ladder
  const analytics = ref(null)
  const analyticsLoading = ref(false)
  const clusters = ref([])
  const clustersLoading = ref(false)
  const now = ref(Date.now())
  // consumed by the hero instrument; the section resets after flashing:
  // desk.arrivals.value = { count: 0, ids: [] }
  const arrivals = ref({ count: 0, ids: [] })
  const q = ref('')
  const lens = ref(defaultLens)                 // exactly one active lens, always set
  const actorId = ref(null)                     // manager deep link (?actor=)
  const uiHold = ref(false)
  const sortKey = ref('owed_age')
  const focusId = ref(null)
  let tick = null
  let poll = null
  let analyticsPoll = null
  let qTimer = null
  let knownIds = new Set()
  let started = false
  let refreshSeq = 0                            // stale-response guard
  let analyticsSeq = 0
  let syncing = false                           // route↔state loop breaker

  const params = () => ({
    lens: lens.value,
    days,
    page: page.value,
    limit,
    q: q.value.trim() || undefined,
    owner_id: actorId.value || undefined,
    sort: sortKey.value || undefined,
  })

  const refresh = async (silent = true) => {
    const seq = ++refreshSeq
    if (!silent) loading.value = true
    try {
      const res = await fetchRcaBoard(params())
      if (seq !== refreshSeq) return            // superseded — never paint stale pages
      const items = res.items || []
      if (silent && knownIds.size) {
        const fresh = items.filter((r) => !knownIds.has(String(r.ticket_id))).map((r) => String(r.ticket_id))
        if (fresh.length) arrivals.value = { count: arrivals.value.count + fresh.length, ids: fresh }
      }
      items.forEach((r) => knownIds.add(String(r.ticket_id)))
      rows.value = items
      total.value = res.total || 0
      stats.value = res.stats || null
      aging.value = res.stats?.aging || null
      const maxPage = Math.max(1, Math.ceil(total.value / limit))
      if (page.value > maxPage) page.value = maxPage
    } catch { /* board keeps last good state */ }
    finally { if (seq === refreshSeq) loading.value = false }
  }

  const refreshAnalytics = async (silent = true) => {
    if (!wantAnalytics) return
    const seq = ++analyticsSeq
    if (!silent) analyticsLoading.value = true
    try {
      const res = await fetchRcaAnalytics({ days: 90 })
      if (seq === analyticsSeq) analytics.value = res
    } catch { /* keep last good */ }
    finally { if (seq === analyticsSeq) analyticsLoading.value = false }
  }

  const refreshClusters = async () => {
    if (!wantClusters) return
    clustersLoading.value = true
    try {
      const res = await fetchRcaClusters({ days: 90, min_size: 3, limit: 10 })
      clusters.value = res.clusters || []
    } catch { /* keep last good */ }
    finally { clustersLoading.value = false }
  }

  /* ── lens vocabulary ── */
  const lensKey = computed(() => lens.value)
  // ALL stats reads go through this — never inline stats.x in a template.
  const statOf = (key) => (RCA_LENSES[key] ? RCA_LENSES[key].stat(stats.value || {}) : 0)
  const agingOf = (bucket) => aging.value?.[bucket] ?? 0
  const applyLens = (key) => {
    if (!RCA_LENSES[key]) return
    // toggling the active lens off falls back to the desk's home lens
    lens.value = (lens.value === key && key !== defaultLens) ? defaultLens : key
  }
  const clearLenses = () => { lens.value = defaultLens; q.value = ''; actorId.value = null }
  const onSort = (key) => {
    if (!RCA_SORTS.includes(key)) return
    sortKey.value = key
    refresh(false)
  }
  const setFocus = (id) => { focusId.value = id ? String(id) : null; syncQuery() }
  const setActor = (id) => { actorId.value = id ? String(id) : null; page.value = 1; refresh(false); syncQuery() }

  /* ── optimistic verbs: flip the row locally, return a rollback ── */
  const applyOptimistic = (id, patch) => {
    const idx = rows.value.findIndex((r) => String(r.ticket_id) === String(id))
    if (idx < 0) return () => {}
    const before = { ...rows.value[idx] }
    rows.value[idx] = { ...rows.value[idx], ...patch }
    return () => { const i = rows.value.findIndex((r) => String(r.ticket_id) === String(id)); if (i >= 0) rows.value[i] = before }
  }
  // after ANY successful verb: board (counts moved) + analytics (coverage moved)
  const afterVerb = () => { refresh(true); refreshAnalytics(true) }

  /* ── deep links: ?lens / ?q / ?focus / ?actor (router.replace — no history spam) ── */
  const hydrateFromRoute = (query) => {
    syncing = true
    if (query.lens && RCA_LENSES[String(query.lens)]) lens.value = String(query.lens)
    if (query.q != null) q.value = String(query.q)
    if (query.actor) actorId.value = String(query.actor)
    focusId.value = query.focus ? String(query.focus) : focusId.value
    syncing = false
  }
  const syncQuery = () => {
    if (!started || syncing) return
    const next = { ...route.query }
    delete next.lens; delete next.q; delete next.focus; delete next.actor
    if (lens.value !== defaultLens) next.lens = lens.value
    if (q.value.trim()) next.q = q.value.trim()
    if (focusId.value) next.focus = focusId.value
    if (actorId.value) next.actor = actorId.value
    const cur = route.query
    const same = ['lens', 'q', 'focus', 'actor'].every((k) => String(cur[k] ?? '') === String(next[k] ?? ''))
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
  const start = () => {
    if (started) return
    started = true
    hydrateFromRoute(route.query)
    refresh(false)
    refreshAnalytics(false)
    refreshClusters()
    tick = setInterval(() => { now.value = Date.now() }, 1000)
    poll = setInterval(() => {
      if (!document.hidden && !uiHold.value) refresh(true)
    }, 60000)
    if (wantAnalytics) {
      analyticsPoll = setInterval(() => {
        if (!document.hidden && !uiHold.value) refreshAnalytics(true)
      }, 300000)
    }
  }
  const stop = () => {
    started = false
    refreshSeq++; analyticsSeq++
    clearInterval(tick); clearInterval(poll); clearInterval(analyticsPoll); clearTimeout(qTimer)
    tick = null; poll = null; analyticsPoll = null; qTimer = null
  }

  return {
    // state
    rows, total, page, loading, stats, aging, analytics, analyticsLoading,
    clusters, clustersLoading, now, arrivals, q, lens, actorId, uiHold,
    sortKey, focusId,
    // derived + selectors
    lensKey, statOf, agingOf,
    // actions
    refresh, refreshAnalytics, refreshClusters, applyLens, clearLenses, onSort,
    setFocus, setActor, applyOptimistic, afterVerb, start, stop,
  }
}
