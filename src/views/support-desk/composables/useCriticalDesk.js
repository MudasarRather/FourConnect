/*
  useCriticalDesk — the SHARED data spine for both Critical Incident desks
  (agent "Fault Grid" + admin "Command Funnel" oversight). One composable kills
  the legacy desk bugs at the root, once:
    · 100-row truncation → server-paged listIncidents({ lens:'critical', live:1, … })
    · chip-count drift   → every count comes from /incidents/stats THROUGH the
      CRIT_LENSES / EXPOSURE_LENSES selectors below — the same predicates the list
      filters with, so a chip's number always equals its click's rows. Desks must
      NEVER inline stats.critical.x in a template; if the backend shape ever
      shifts, this file is the whole blast radius.
    · poll hygiene       → 1s now tick + 60s SILENT poll that skips hidden tabs
      and any open modal/drawer (uiHold), clamps the pager when the board
      shrinks, and reports arrivals to the hero instrument instead of yanking
      the board out from under the user.

  Usage (a desk is a thin orchestrator over this spine):
    const desk = useCriticalDesk({ panel: props.panel, limit: 10 })
    onMounted(desk.start); onBeforeUnmount(desk.stop)
    // hold the poll while any modal is open:
    watch(anyModalOpen, (v) => { desk.uiHold.value = v })
*/
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listIncidents, fetchIncidentStats, normalizeIncidentRow,
} from '@/composables/useSupportDesk'

/* ─────────────────────────── Lens translation maps ───────────────────────────
   chip key → list params (the server-side filter) → stats selector (the count).
   The name translation lives HERE and nowhere else:
     cmdr_unstaffed ⇔ stats.roles_unassigned · mi_proposed ⇔ stats.mi_proposals_pending
     at_risk/breached ⇔ stats.sla.* · sev1/sev2 ⇔ stats.critical.sev1/2_active
     unacked ⇔ stats.critical.sev2_unacked (falls back to the desk-wide stats.unacked) */
export const CRIT_LENSES = {
  sev1: { label: 'SEV1', params: { sev: 1 }, stat: (s) => s?.critical?.sev1_active ?? 0 },
  sev2: { label: 'SEV2', params: { sev: 2 }, stat: (s) => s?.critical?.sev2_active ?? 0 },
  unacked: { label: 'UNACKED', params: { flag: 'unacked' }, stat: (s) => s?.critical?.sev2_unacked ?? s?.unacked ?? 0 },
  at_risk: { label: 'AT RISK', params: { flag: 'at_risk' }, stat: (s) => s?.sla?.at_risk ?? 0 },
  breached: { label: 'BREACHED', params: { flag: 'breached' }, stat: (s) => s?.sla?.breached ?? 0 },
  unowned: { label: 'UNOWNED', params: { flag: 'unowned' }, stat: (s) => s?.unowned ?? 0 },
  cmdr_unstaffed: { label: 'CMDR UNSTAFFED', params: { flag: 'cmdr_unstaffed' }, stat: (s) => s?.roles_unassigned ?? 0 },
  update_overdue: { label: 'UPDATE OVERDUE', params: { flag: 'update_overdue' }, stat: (s) => s?.update_overdue ?? 0 },
  mi_proposed: { label: 'MI PROPOSED', params: { flag: 'mi_proposed' }, stat: (s) => s?.mi_proposals_pending ?? 0 },
}
/* Exposure-surface lenses (revenue / compliance / security / public / unassessed) —
   flags land with the stats.critical.exposure block (B3), counts ⇔ rows in lockstep. */
export const EXPOSURE_LENSES = {
  exposure_revenue: { label: 'REVENUE', params: { flag: 'exposure_revenue' }, stat: (s) => s?.critical?.exposure?.revenue_flagged ?? 0 },
  exposure_compliance: { label: 'COMPLIANCE', params: { flag: 'exposure_compliance' }, stat: (s) => s?.critical?.exposure?.compliance ?? 0 },
  exposure_security: { label: 'SECURITY', params: { flag: 'exposure_security' }, stat: (s) => s?.critical?.exposure?.security ?? 0 },
  exposure_public: { label: 'PUBLIC', params: { flag: 'exposure_public' }, stat: (s) => s?.critical?.exposure?.public ?? 0 },
  unassessed: { label: 'UNASSESSED', params: { flag: 'unassessed' }, stat: (s) => s?.critical?.exposure?.unassessed ?? 0 },
}
const ALL_LENSES = { ...CRIT_LENSES, ...EXPOSURE_LENSES }

/* The "recently landed" shelf — the newest TERMINAL rows on the critical lens.
   Verified against the backend list endpoint: `status` filters by single-value
   equality (SdTicket.status == value) and lens=critical does NOT exclude terminal
   statuses when `live` is omitted (utils/incidents.lens_condition filters only
   is_deleted + merged) — so status='resolved' pages exactly the shelf. Returns
   normalized rows (each carries a derived `sev`). */
export const landedFetch = async () => {
  const res = await listIncidents({
    lens: 'critical', status: 'resolved', limit: 8, sort_by: 'created_at', sort_dir: 'desc',
  })
  return (res.items || []).map(normalizeIncidentRow)
}

export function useCriticalDesk (opts = {}) {
  const { panel = 'admin', limit = 10 } = opts
  const route = useRoute()
  const router = useRouter()

  /* ── state (declare every ref BEFORE any computed/watch — TDZ) ── */
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false)
  const stats = ref(null)
  const now = ref(Date.now())
  // consumed by the hero instrument; count accumulates across polls — the
  // instrument resets it after flashing: desk.arrivals.value = { count: 0, ids: [] }
  const arrivals = ref({ count: 0, ids: [] })
  const q = ref('')
  const sevToken = ref(null)                    // 1 | 2 (SEV lenses)
  const flagToken = ref(null)                   // any flag key from the maps above
  const uiHold = ref(false)                     // desks set true while a modal/drawer is open
  const sortKey = ref(null)                     // created_at | ticket_number
  const sortDir = ref('desc')
  const focusId = ref(null)                     // ?focus= deep link, consumed by the desk
  let tick = null
  let poll = null
  let qTimer = null
  let knownIds = new Set()
  let started = false
  let refreshSeq = 0                            // stale-response guard
  let syncing = false                           // route↔state loop breaker

  /* ── the server window: lens=critical&live=1 + the active tokens ── */
  const params = () => ({
    lens: 'critical',
    live: 1,
    page: page.value,
    limit,
    q: q.value.trim() || undefined,
    sev: sevToken.value || undefined,
    flag: flagToken.value || undefined,
    sort_by: sortKey.value || undefined,
    sort_dir: sortKey.value ? sortDir.value : undefined,
  })

  const refresh = async (silent = true) => {
    const seq = ++refreshSeq
    if (!silent) loading.value = true
    try {
      const [list, st] = await Promise.all([listIncidents(params()), fetchIncidentStats()])
      if (seq !== refreshSeq) return            // superseded — never paint stale pages
      const items = (list.items || []).map(normalizeIncidentRow)
      // arrivals: only meaningful on silent polls once the board is known —
      // the instrument flashes, the board never reorders under the pointer
      if (silent && knownIds.size) {
        const fresh = items.filter((r) => !knownIds.has(String(r.id))).map((r) => String(r.id))
        if (fresh.length) arrivals.value = { count: arrivals.value.count + fresh.length, ids: fresh }
      }
      items.forEach((r) => knownIds.add(String(r.id)))
      rows.value = items
      total.value = list.total || 0
      stats.value = st
      // clamp: a shrinking board must never strand the pager past the last page
      const maxPage = Math.max(1, Math.ceil(total.value / limit))
      if (page.value > maxPage) page.value = maxPage
    } catch { /* board keeps last good state; empty/loading UI reads from rows/loading */ }
    finally { if (seq === refreshSeq) loading.value = false }
  }

  /* ── lens vocabulary: single active lens = sev token XOR flag token ── */
  const lensKey = computed(() => {
    if (sevToken.value === 1) return 'sev1'
    if (sevToken.value === 2) return 'sev2'
    return flagToken.value || null
  })
  // ALL stats reads go through this — never inline stats.critical.x in a template.
  const statOf = (key) => (ALL_LENSES[key] ? ALL_LENSES[key].stat(stats.value || {}) : 0)
  const applyLens = (key) => {
    const def = ALL_LENSES[key]
    if (!def) { sevToken.value = null; flagToken.value = null; return }
    if (def.params.sev) {
      sevToken.value = sevToken.value === def.params.sev ? null : def.params.sev
      flagToken.value = null
    } else {
      flagToken.value = flagToken.value === def.params.flag ? null : def.params.flag
      sevToken.value = null
    }
  }
  const clearLenses = () => { sevToken.value = null; flagToken.value = null; q.value = '' }
  const onSort = (key) => {
    if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    else { sortKey.value = key; sortDir.value = 'asc' }
    refresh(false)
  }
  const setFocus = (id) => { focusId.value = id ? String(id) : null; syncQuery() }

  /* ── deep links: ?lens= / ?q= / ?focus= (router.replace — never pollutes history) ── */
  const hydrateFromRoute = (query) => {
    syncing = true
    if (query.lens && ALL_LENSES[String(query.lens)]) {
      const def = ALL_LENSES[String(query.lens)]
      if (def.params.sev) { sevToken.value = def.params.sev; flagToken.value = null }
      else { flagToken.value = def.params.flag; sevToken.value = null }
    }
    if (query.q != null) q.value = String(query.q)
    focusId.value = query.focus ? String(query.focus) : focusId.value
    syncing = false
  }
  const syncQuery = () => {
    if (!started || syncing) return
    const next = { ...route.query }
    delete next.lens; delete next.q; delete next.focus
    if (lensKey.value) next.lens = lensKey.value
    if (q.value.trim()) next.q = q.value.trim()
    if (focusId.value) next.focus = focusId.value
    const cur = route.query
    const same = ['lens', 'q', 'focus'].every((k) => String(cur[k] ?? '') === String(next[k] ?? ''))
    if (!same) router.replace({ query: next }).catch(() => {})
  }

  /* ── filters → refetch (debounced text; page resets on every filter change) ── */
  watch(q, () => {
    clearTimeout(qTimer)
    qTimer = setTimeout(() => { page.value = 1; refresh(false); syncQuery() }, 300)
  })
  watch([sevToken, flagToken], () => { page.value = 1; refresh(false); syncQuery() })
  watch(page, () => refresh(false))
  // dashboards deep-link INTO a mounted desk (?lens=/?q=/?focus=) — re-hydrate;
  // our own router.replace echoes identical values back, so nothing re-fires
  watch(() => route.query, (query) => { if (started) hydrateFromRoute(query) })

  /* ── lifecycle: explicit start()/stop() so desks own their mount order ── */
  const start = () => {
    if (started) return
    started = true
    hydrateFromRoute(route.query)
    refresh(false)
    tick = setInterval(() => { now.value = Date.now() }, 1000)
    poll = setInterval(() => {
      if (!document.hidden && !uiHold.value) refresh(true)
    }, 60000)
  }
  const stop = () => {
    started = false
    refreshSeq++                                 // drop any in-flight response
    clearInterval(tick); clearInterval(poll); clearTimeout(qTimer)
    tick = null; poll = null; qTimer = null
  }

  return {
    // state
    rows, total, page, loading, stats, now, arrivals, q, sevToken, flagToken,
    uiHold, sortKey, sortDir, focusId,
    // derived + selectors
    lensKey, statOf,
    // actions
    refresh, applyLens, clearLenses, onSort, setFocus, start, stop,
  }
}
