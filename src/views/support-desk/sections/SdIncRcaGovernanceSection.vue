<template>
  <div class="rcg">
    <!-- ═══ THE CLEARINGHOUSE — hero ported whole (tape · book · index · depth · lenses) ═══ -->
    <SdRcaGovernanceHero :board="rows" :stats="stats" :analytics="analytics" :aging="aging"
      :arrivals="arrivals" :now="now" :reduced="reduced" :active-lens="lensKey"
      @lens="desk.applyLens" @open="(id) => $emit('open', id)" @arrivals-seen="onArrivalsSeen" />

    <!-- ═══ search + actor strip ═══ -->
    <div class="rcg-strip">
      <label class="q-box">
        <Search :size="13" aria-hidden="true" />
        <input v-model="q" class="q-in" type="text"
          placeholder="Search the book — number, subject, cause…" />
      </label>
      <span v-if="actorId" class="actor-chip sd-mono">
        ACTOR-SEALED VIEW
        <button type="button" aria-label="Clear actor filter" @click="desk.setActor(null)"><X :size="11" /></button>
      </span>
      <button v-if="filtersDirty" class="clear-chip sd-mono" type="button" @click="desk.clearLenses()">
        CLEAR BOOK FILTERS
      </button>
      <span class="strip-note sd-mono">{{ total }} POSITIONS IN THE {{ lensLabel }} BOOK</span>
    </div>

    <!-- ═══ review docket (settlement blotter) + pager ═══ -->
    <div class="rcg-docket">
      <SdRcaReviewDocket :rows="rows" :now="now" :busy-id="busyId" :caps-ready="capsReady"
        :can-review="canReview" :me-id="meId" :can-self-validate="caps.isAdmin" :loading="loading"
        @validate="onValidate" @return="onReturn" @open="(id) => $emit('open', id)" />
      <SdIncPager :page="page" :total="total" :limit="10" @update:page="page = $event" />
    </div>

    <!-- ═══ risk & margin analytics desks ═══ -->
    <SdRcaCauseAnalytics :analytics="analytics" :aging="aging" :loading="analyticsLoading"
      :reduced="reduced" @lens="desk.applyLens" />

    <!-- ═══ correlated exposure + standing instructions (KEDB) ═══ -->
    <div class="low-grid">
      <SdRcaRecurrencePanel :clusters="clusters" :loading="clustersLoading"
        @nominate="(c) => (nominateTarget = c)" @open="(id) => $emit('open', id)"
        @refresh="() => desk.refreshClusters()" />

      <section class="kedb sd-card">
        <header class="kedb-bar">
          <span class="kedb-name sd-mono"><BookMarked :size="12" aria-hidden="true" /> STANDING INSTRUCTIONS — KEDB</span>
        </header>
        <div class="kedb-trio">
          <div class="kt sd-mono"><b>{{ kedbStats.known_errors ?? 0 }}</b><span>KNOWN ERRORS</span></div>
          <div class="kt sd-mono"><b>{{ kedbStats.published_workarounds ?? 0 }}</b><span>PUBLISHED W/A</span></div>
          <div class="kt sd-mono"><b>{{ kedbStats.linked_ticket_total ?? 0 }}</b><span>LINKED TICKETS</span></div>
        </div>
        <div v-if="kedbRows.length" class="kedb-rows">
          <div v-for="p in kedbRows" :key="String(p.id)" class="ke-row">
            <b class="sd-mono">{{ p.problem_number || 'PROBLEM' }}</b>
            <span class="ke-body">
              <em class="ke-title">{{ p.title }}</em>
              <span class="ke-wa">{{ p.workaround ? trunc(p.workaround, 90) : 'No workaround documented yet.' }}</span>
            </span>
            <i v-if="p.workaround_published" class="ke-pub sd-mono">● LIVE</i>
            <i v-else class="ke-draft sd-mono">○ DRAFT</i>
          </div>
        </div>
        <p v-else-if="!kedbLoading" class="kedb-empty sd-mono">NO KNOWN ERRORS FILED IN THE ARCHIVE YET.</p>
        <Motion as="button" class="kedb-cta sd-mono" type="button" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="$emit('go', 'problems')">
          <ArrowUpRight :size="13" /> OPEN PROBLEM WORKBENCH
        </Motion>
      </section>
    </div>

    <!-- ═══ colophon: export + scope seal ═══ -->
    <footer class="rcg-foot">
      <span class="foot-note sd-mono">THE CLEARINGHOUSE · RCA GOVERNANCE — LEADS SETTLE THEIR OWN DESKS; SUPERUSERS CLEAR THE WHOLE BOOK.</span>
      <button class="chip-x sd-mono" type="button" @click="exportCsv">
        <Download :size="12" /> EXPORT CSV — CURRENT BOOK
      </button>
    </footer>

    <!-- ═══ command modals ═══ -->
    <SdRcaReturnModal :open="!!returnTarget" :ticket="returnTarget"
      @close="returnTarget = null" @done="() => { returnTarget = null; desk.afterVerb() }" />
    <SdRcaNominateModal :open="!!nominateTarget" :cluster="nominateTarget"
      @close="nominateTarget = null"
      @done="() => { nominateTarget = null; desk.afterVerb(); desk.refreshClusters() }" />
  </div>
</template>

<script setup>
/*
  SdIncRcaGovernanceSection — THE CLEARINGHOUSE (admin RCA governance desk).
  Orchestrator only: useRcaDesk is the sealed data spine (board + lockstep stats +
  aging + analytics + clusters); this section owns the verb API calls (validate
  optimistic-with-rollback; return via the note-required modal), the capability
  gate (admin ∪ team lead — fail-closed until caps land), the KEDB strip, and the
  CSV colophon. NO ack verbs on this desk — RCA speaks in verdicts.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Search, Download, BookMarked, ArrowUpRight, X } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdRcaGovernanceHero from '../components/SdRcaGovernanceHero.vue'
import SdRcaReviewDocket from '../components/SdRcaReviewDocket.vue'
import SdRcaCauseAnalytics from '../components/SdRcaCauseAnalytics.vue'
import SdRcaRecurrencePanel from '../components/SdRcaRecurrencePanel.vue'
import SdRcaNominateModal from '../modals/SdRcaNominateModal.vue'
import SdRcaReturnModal from '../modals/SdRcaReturnModal.vue'
import SdIncPager from '../components/SdIncPager.vue'
import { useRcaDesk, RCA_LENSES } from '../composables/useRcaDesk'
import { useCinematic } from '@/composables/useCinematic'
import {
  useCapabilities, fetchCapabilities, fetchMe, validateTicketRca, listProblems,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
defineEmits(['open', 'go', 'new'])
const toast = useToast()

/* ── data spine ── */
const desk = useRcaDesk({ panel: props.panel, limit: 10, defaultLens: 'pending', analytics: true, clusters: true })
const {
  rows, total, page, loading, stats, aging, analytics, analyticsLoading,
  clusters, clustersLoading, now, arrivals, q, actorId, uiHold, lensKey,
} = desk

const lensLabel = computed(() => RCA_LENSES[lensKey.value]?.label || 'FILED')
const filtersDirty = computed(() => lensKey.value !== 'pending' || !!q.value.trim() || !!actorId.value)
const onArrivalsSeen = () => { arrivals.value = { count: 0, ids: [] } }

/* ── reduced motion (OS preference, overridable by Cinematic mode) ── */
const { cinematic } = useCinematic()
const prefersReduced = ref(false)
const reduced = computed(() => prefersReduced.value && !cinematic.value)

/* ── capabilities (fail-closed) + identity — the oversight-desk precedent ── */
const caps = useCapabilities()
const me = ref(null)
const capsReady = computed(() => caps.checked)
const canReview = (row) => caps.isAdmin
  || (!!row?.team_id && caps.leadTeamIds.includes(String(row.team_id)))
const meId = computed(() => (me.value?.id != null ? String(me.value.id) : null))

/* ── verdict verbs — the section owns the API ── */
const busyId = ref(null)
const detailOf = (e) => {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' · ')
  return e?.message || 'The verdict did not post — try again.'
}
const onValidate = async (row) => {
  if (busyId.value) return
  busyId.value = row.ticket_id
  const rollback = desk.applyOptimistic(row.ticket_id, { rca_status: 'validated' })
  try {
    await validateTicketRca(row.ticket_id, {})
    toast.success(`▲ ${row.ticket_number} SETTLED — posted to the cleared blotter.`)
    desk.afterVerb()
  } catch (e) {
    rollback()
    toast.error(detailOf(e))
  } finally { busyId.value = null }
}
const returnTarget = ref(null)
const onReturn = (row) => { returnTarget.value = row }

/* ── nominate (cluster → problem) ── */
const nominateTarget = ref(null)

/* ── modal presence pauses the silent poll ── */
watch([returnTarget, nominateTarget], ([a, b]) => { uiHold.value = !!a || !!b })

/* ── KEDB — standing instructions strip (self-fetched known errors) ── */
const kedbRows = ref([])
const kedbLoading = ref(false)
const kedbStats = computed(() => analytics.value?.kedb || {})
const loadKedb = async () => {
  kedbLoading.value = true
  try {
    const r = await listProblems({ known_only: true, limit: 5 })
    kedbRows.value = Array.isArray(r) ? r : (r?.items || [])
  } catch { kedbRows.value = [] } finally { kedbLoading.value = false }
}
const trunc = (s, n) => {
  const t = String(s || '')
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

/* ── colophon: client CSV of the current book (page rows, current lens) ── */
const exportCsv = () => {
  const cols = [
    ['POS', (r) => r.ticket_number], ['SUBJECT', (r) => r.subject], ['SEV', (r) => `SEV${r.sev ?? 4}`],
    ['DESK', (r) => r.team_name], ['STATE', (r) => r.rca_status], ['CAUSE', (r) => r.rca_category],
    ['BREACH REASON', (r) => r.breach_reason], ['FILED BY', (r) => r.rca_filed_by_name],
    ['FILED AT', (r) => r.rca_filed_at], ['REVIEWED BY', (r) => r.rca_reviewed_by_name],
    ['REVIEWED AT', (r) => r.rca_reviewed_at], ['OWED AGE (H)', (r) => r.owed_age_hours],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [cols.map((c) => c[0]).join(',')]
  for (const r of rows.value) lines.push(cols.map((c) => esc(c[1](r))).join(','))
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rca-clearinghouse-${lensKey.value}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast.success(`⇩ Settlement CSV exported — ${rows.value.length} positions from the ${lensLabel.value} book.`)
}

/* ── lifecycle ── */
onMounted(async () => {
  prefersReduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  desk.start()
  fetchCapabilities()
  loadKedb()
  me.value = await fetchMe()
})
onBeforeUnmount(() => { desk.stop() })
</script>

<style scoped>
.rcg { display: flex; flex-direction: column; gap: 14px; }

/* ── search + actor strip ── */
.rcg-strip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.q-box { display: flex; align-items: center; gap: 8px; flex: 1 1 260px; max-width: 420px;
  padding: 9px 13px; border-radius: 12px; color: var(--sd-text-muted);
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, box-shadow 0.2s; }
.q-box:focus-within { border-color: var(--sd-rcg-core); box-shadow: 0 0 0 3px var(--sd-rcg-soft); }
.q-in { flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font-size: 12.5px; color: var(--sd-text); }
.q-in::placeholder { color: var(--sd-text-muted); }
.actor-chip { display: inline-flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-rcg-warn); padding: 6px 8px 6px 12px; border-radius: 999px;
  background: var(--sd-rcg-warn-soft);
  border: 1px solid color-mix(in srgb, var(--sd-rcg-warn) 40%, transparent); }
.actor-chip button { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%;
  cursor: pointer; color: inherit; background: transparent; border: 1px solid currentColor; }
.clear-chip { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-muted);
  cursor: pointer; padding: 7px 13px; border-radius: 999px; background: transparent;
  border: 1px dashed var(--sd-border-strong, var(--sd-border)); transition: color 0.2s, border-color 0.2s; }
.clear-chip:hover { color: var(--sd-rcg-core); border-color: var(--sd-rcg-brd); }
.strip-note { margin-left: auto; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted);
  font-variant-numeric: tabular-nums; }

/* ── docket shell ── */
.rcg-docket { display: flex; flex-direction: column; gap: 2px; }

/* ── low grid: clusters + KEDB ── */
.low-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 14px; align-items: start; }

.kedb { display: flex; flex-direction: column; gap: 12px; border-radius: 18px; padding: 14px 16px 16px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); min-width: 0; }
.kedb-bar { border-bottom: 1px solid var(--sd-rcg-brd); padding-bottom: 9px; }
.kedb-name { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px;
  letter-spacing: 0.24em; font-weight: 800; color: var(--sd-rcg-core); }
.kedb-trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.kt { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px;
  border-radius: 10px; background: var(--sd-rcg-soft);
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 20%, transparent); }
.kt b { font-size: 21px; font-weight: 200; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.kt span { font-size: 7px; letter-spacing: 0.18em; color: var(--sd-text-muted); text-align: center; }
.kedb-rows { display: flex; flex-direction: column; }
.ke-row { display: grid; grid-template-columns: 74px 1fr auto; gap: 10px; align-items: start;
  padding: 9px 2px; border-bottom: 1px solid var(--sd-border); }
.ke-row:last-child { border-bottom: none; }
.ke-row > b { font-size: 9.5px; color: var(--sd-rcg-core); padding-top: 1px; font-variant-numeric: tabular-nums; }
.ke-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ke-title { font-style: normal; font-size: 11.5px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ke-wa { font-size: 10.5px; line-height: 1.5; color: var(--sd-text-secondary); }
.ke-pub { font-style: normal; font-size: 8px; letter-spacing: 0.12em; color: var(--sd-rcg-settle); }
.ke-draft { font-style: normal; font-size: 8px; letter-spacing: 0.12em; color: var(--sd-rcg-warn); }
.kedb-empty { margin: 0; padding: 14px 4px; font-size: 8.5px; letter-spacing: 0.16em;
  color: var(--sd-text-muted); text-align: center; }
.kedb-cta { display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 16px; border-radius: 10px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em;
  cursor: pointer; color: var(--sd-rcg-core); background: transparent;
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 40%, transparent);
  transition: background 0.2s, box-shadow 0.2s; }
.kedb-cta:hover { background: var(--sd-rcg-soft); box-shadow: var(--sd-rcg-glow); }

/* ── colophon ── */
.rcg-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  flex-wrap: wrap; border-top: 1px solid var(--sd-rcg-brd); padding-top: 12px; }
.foot-note { font-size: 8px; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.chip-x { display: inline-flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-rcg-core); cursor: pointer; padding: 7px 14px;
  border-radius: 999px; background: transparent;
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 38%, transparent);
  transition: background 0.2s, transform 0.18s var(--sd-spring); }
.chip-x:hover { background: var(--sd-rcg-soft); transform: translateY(-1px); }
.chip-x:active { transform: scale(0.96); }

@media (max-width: 1080px) { .low-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .chip-x,
  html:not([data-cinematic="on"]) .kedb-cta { transition: none; }
}
</style>
