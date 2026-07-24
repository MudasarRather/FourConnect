<template>
  <div class="rds">
    <!-- ═══ THE TEARDOWN · hero instrument (whole region, never compressed) ═══ -->
    <SdRcaAgentHero
      :board="rows" :stats="stats" :analytics="analytics" :aging="aging"
      :arrivals="arrivals" :now="now" :reduced="reduced"
      :active-lens="lensKey" :selected="selected"
      @lens="(k) => desk.applyLens(k)"
      @open="(id) => emit('open', id)"
      @focus="(id) => { selectedId = String(id) }"
      @arrivals-seen="() => { arrivals = { count: 0, ids: [] } }" />

    <!-- ═══ lens strip · bench lenses + grep + actor seal ═══ -->
    <div class="rds-lenses">
      <span class="lens-title sd-mono">BENCH LENSES</span>
      <Motion v-for="(l, key) in RCA_LENSES" :key="key" as="button"
        class="rlens" :class="[`rlens--${key}`, { on: lensKey === key }]"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
        :aria-pressed="lensKey === key" @click="desk.applyLens(key)">
        {{ l.label }} <b class="sd-mono">{{ desk.statOf(key) }}</b>
      </Motion>
      <span v-if="actorId" class="actor-chip sd-mono">
        ACTOR SEAL · {{ actorId }}
        <button class="ac-x" aria-label="Clear actor filter" @click="desk.setActor(null)"><X :size="10" /></button>
      </span>
      <label class="rds-grep">
        <Search :size="12" />
        <input ref="searchRef" v-model="q" type="text" class="sd-mono"
          placeholder="grep number · subject — press /" aria-label="Search RCA board" />
      </label>
    </div>

    <!-- ═══ the work floor · trace buffer + frame inspector ═══ -->
    <div class="rds-floor">
      <div class="rds-left">
        <h2 class="zone-title sd-mono">{{ queueTitle }}
          <span class="cnt">· {{ total }}</span></h2>
        <SdRcaQueueBoard
          :rows="rows" :now="now" :selected-id="selectedId" :loading="loading" :focus-id="focusId"
          @select="(id) => { selectedId = String(id) }"
          @open="(id) => emit('open', id)"
          @file="(row) => openConsole(row)" />
        <SdIncPager :page="page" :total="total" :limit="8" @update:page="(p) => { page = p }" />

        <!-- similar traces · precedent (A1: lives under the queue) -->
        <h2 class="zone-title sd-mono" style="margin-top: 18px">SIMILAR TRACES ·
          <span class="cnt">PRECEDENT</span></h2>
        <SdRcaPrecedentList :ticket-id="selected?.ticket_id" strip
          @open="(id) => emit('open', id)" />
      </div>

      <div class="rds-right">
        <h2 class="zone-title sd-mono">FRAME INSPECTOR ·
          <span class="hot">RESOLVE THE STACK</span></h2>
        <!-- Reviewer verdict — leads/admins only, and only on a FILED filing (fail-closed
             via SdRcaReviewVerbs). The agent portal is where team leads live, so the
             backend's lead review rights (four-eyes) surface here, not just on admin. -->
        <div v-if="reviewSelected" class="ri-review">
          <span class="ri-review-k sd-mono">REVIEWER VERDICT · YOUR DESK</span>
          <SdRcaReviewVerbs :row="selected" :busy="busyId === selected.ticket_id"
            :caps-ready="capsReady" :can-review="canReview(selected)" :me-id="meId" :can-self-validate="caps.isAdmin"
            @validate="onValidate(selected)" @return="onReturn(selected)"
            @open="emit('open', selected.ticket_id)" />
        </div>
        <SdRcaWorkbench :ticket="selected" :now="now"
          @file="() => openConsole(selected)"
          @open="() => selected && emit('open', selected.ticket_id)"
          @go="() => emit('go', 'problems')"
          @promote="() => openConsole(selected)" />
      </div>
    </div>

    <!-- ═══ readout · RCA coverage + debt aging (A1 bottom cards) ═══ -->
    <div class="rds-readout">
      <div class="ro-card">
        <h2 class="zone-title ro-title sd-mono">RCA COVERAGE · DESK OF {{ eligibleN }} RESOLVED INCIDENTS</h2>
        <div class="cov-top">
          <span class="cov-num"><b class="sd-mono">{{ coveragePct }}</b><i>%</i></span>
          <span class="cov-lbl sd-mono">FILED OR VALIDATED<br />TARGET ≥ 90%</span>
        </div>
        <div class="cov-bar" role="img" :aria-label="`RCA coverage ${coveragePct}%`">
          <i class="c-val" :style="{ width: covW(validatedN) }" />
          <i class="c-fil" :style="{ width: covW(filedN) }" />
          <i class="c-ret" :style="{ width: covW(returnedN + staleN) }" />
          <i class="c-owe" :style="{ width: covW(owedN) }" />
        </div>
        <div class="cov-leg">
          <button class="leg sd-mono" :class="{ on: lensKey === 'validated' }" @click="desk.applyLens('validated')"><i class="lv" />VALIDATED {{ validatedN }}</button>
          <button class="leg sd-mono" :class="{ on: lensKey === 'pending' }" @click="desk.applyLens('pending')"><i class="lf" />FILED {{ filedN }}</button>
          <button class="leg sd-mono" :class="{ on: lensKey === 'returned' }" @click="desk.applyLens('returned')"><i class="lr" />RETURNED {{ returnedN }}</button>
          <button class="leg sd-mono" :class="{ on: lensKey === 'owed' }" @click="desk.applyLens('owed')"><i class="lo" />OWED {{ owedN }}</button>
        </div>
      </div>
      <div class="ro-card">
        <h2 class="zone-title ro-title sd-mono">RCA DEBT AGING · SINCE RESOLVE</h2>
        <div class="aging" aria-label="RCA debt aging since resolve">
          <div v-for="b in agingCols" :key="b.key" class="age-col" :class="b.cls">
            <span class="n sd-mono">{{ b.n }}</span>
            <i class="bar" :style="{ height: b.h }" />
            <span class="l sd-mono">{{ b.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ footer readout · scope seal + program one-liner ═══ -->
    <footer class="rds-foot">
      <span class="rf-scope sd-mono">{{ scopeNote }}</span>
      <span class="rf-line sd-mono">
        COVERAGE <b>{{ coveragePct }}%</b> · MEDIAN FILE TIME <b>{{ cycleMedian }}</b>
        · REVIEW LATENCY <b>{{ reviewMedian }}</b>
        <template v-if="kedbKnown"> · KEDB <b>{{ kedbKnown }}</b> KNOWN ERRORS</template>
      </span>
    </footer>

    <!-- ═══ the console — file / re-file / revise ═══ -->
    <SdRcaConsole :open="consoleOpen" :ticket="consoleTicket" :now="now"
      @close="() => { consoleOpen = false }"
      @saved="() => { consoleOpen = false; desk.afterVerb() }" />

    <!-- ═══ reviewer return (lead/admin bounce with mandatory note) ═══ -->
    <SdRcaReturnModal :open="!!returnTarget" :ticket="returnTarget"
      @close="returnTarget = null" @done="() => { returnTarget = null; desk.afterVerb() }" />
  </div>
</template>

<script setup>
/*
  SdIncRcaDeskSection — the AGENT RCA desk orchestrator. Hero = "THE TEARDOWN"
  (A7 exploded-view instrument), body = "THE STACK DESCENT" (A1 debugger floor):
  lens strip → unsymbolicated-trace queue + pager (left) and the frame-inspector
  workbench + precedent (right). Data spine: useRcaDesk (sealed board — rows,
  chip stats and debt aging land in ONE response so counts can never drift).
  Verbs route through SdRcaConsole; every save calls desk.afterVerb() so board
  + analytics move together. Deep links (?lens/?q/?focus/?actor) are the spine's.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Search, X } from 'lucide-vue-next'
import SdRcaAgentHero from '../components/SdRcaAgentHero.vue'
import SdRcaQueueBoard from '../components/SdRcaQueueBoard.vue'
import SdRcaWorkbench from '../components/SdRcaWorkbench.vue'
import SdRcaPrecedentList from '../components/SdRcaPrecedentList.vue'
import SdRcaReviewVerbs from '../components/SdRcaReviewVerbs.vue'
import SdIncPager from '../components/SdIncPager.vue'
import SdRcaConsole from '../modals/SdRcaConsole.vue'
import SdRcaReturnModal from '../modals/SdRcaReturnModal.vue'
import { useToast } from 'vue-toastification'
import { useRcaDesk, RCA_LENSES } from '../composables/useRcaDesk'
import { useCinematic } from '@/composables/useCinematic'
import { useCapabilities, fetchCapabilities, fetchMe, validateTicketRca } from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new'])

/* ── the data spine ── */
const desk = useRcaDesk({ panel: props.panel, limit: 8, defaultLens: 'owed', analytics: true })
const {
  rows, total, page, loading, stats, aging, analytics, now, arrivals,
  q, actorId, uiHold, lensKey, focusId,
} = desk

/* ── reduced motion (OS preference, overridable by Cinematic mode) ── */
const { cinematic } = useCinematic()
const reduced = computed(() => !cinematic.value
  && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/* ── selection: local, defaulting to the first row; honors ?focus deep links ── */
const selectedId = ref(null)
const selected = computed(() =>
  rows.value.find((r) => String(r.ticket_id) === String(selectedId.value)) || null)
watch(rows, (list) => {
  if (!list?.length) { selectedId.value = null; return }
  if (focusId.value && list.some((r) => String(r.ticket_id) === String(focusId.value))) {
    selectedId.value = String(focusId.value)
    return
  }
  if (!list.some((r) => String(r.ticket_id) === String(selectedId.value))) {
    selectedId.value = String(list[0].ticket_id)
  }
})
watch(focusId, (f) => {
  if (f && rows.value.some((r) => String(r.ticket_id) === String(f))) selectedId.value = String(f)
})

/* ── the console — call sites read ticket.id, board rows carry ticket_id ── */
const consoleOpen = ref(false)
const consoleTicket = ref(null)
const toast = useToast()
const openConsole = (row) => {
  const r = row || selected.value
  if (!r) return
  // Owner-tier gate mirrors POST /{id}/rca — surfaced pre-flight so the agent never
  // fills the whole console only to be 403'd. can_file is server-computed on the row;
  // undefined (older payload) is treated as allowed so nothing regresses.
  if (r.can_file === false) {
    toast.info('This ticket is assigned to another agent — only they, the team lead, or an admin can file its RCA.')
    return
  }
  consoleTicket.value = { ...r, id: r.ticket_id }
  consoleOpen.value = true
}
/* ── reviewer verdict (leads ∪ admin) — parity with the Clearinghouse governance
   desk. Team leads live on the agent portal, and the backend grants them
   validate/return (four-eyes); the verbs surface here so a lead can settle their
   own desk without needing admin-panel access. Fail-closed until caps land. ── */
const caps = useCapabilities()
const me = ref(null)
const capsReady = computed(() => caps.checked)
const meId = computed(() => (me.value?.id != null ? String(me.value.id) : null))
const canReview = (row) => caps.isAdmin || (!!row?.team_id && caps.leadTeamIds.includes(String(row.team_id)))
const reviewSelected = computed(() => {
  const r = selected.value
  return !!(r && capsReady.value && canReview(r) && r.rca_status === 'filed')
})

const busyId = ref(null)
const returnTarget = ref(null)
const detailOf = (e) => {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' · ')
  return e?.message || 'The verdict did not post — try again.'
}
const onValidate = async (row) => {
  if (!row || busyId.value) return
  busyId.value = row.ticket_id
  const rollback = desk.applyOptimistic(row.ticket_id, { rca_status: 'validated' })
  try {
    await validateTicketRca(row.ticket_id, {})
    toast.success(`${row.ticket_number} — root cause validated`)
    desk.afterVerb()
  } catch (e) { rollback(); toast.error(detailOf(e)) }
  finally { busyId.value = null }
}
const onReturn = (row) => { if (row) returnTarget.value = row }

// console OR return modal open ⇒ pause the silent poll
watch([consoleOpen, returnTarget], ([c, r]) => { uiHold.value = !!c || !!r })

/* ── queue title follows the active lens (A1 LENS_TITLES, app lens vocabulary) ── */
const LENS_TITLES = {
  owed: 'UNSYMBOLICATED TRACES',
  returned: 'RETURNED · REVIEWER EXCEPTIONS',
  pending: 'FILED · AWAITING REVIEW',
  validated: 'VALIDATED · RESOLVED SYMBOLS',
  stale: 'STALE · INVALIDATED BY REOPEN',
  all: 'ALL TRACES · FULL SESSION',
}
const queueTitle = computed(() => LENS_TITLES[lensKey.value] || LENS_TITLES.owed)

/* ── readout cards: counts through the lens map (never inline stats.x) ── */
const owedN = computed(() => desk.statOf('owed'))
const filedN = computed(() => desk.statOf('pending'))
const returnedN = computed(() => desk.statOf('returned'))
const validatedN = computed(() => desk.statOf('validated'))
const staleN = computed(() => desk.statOf('stale'))
const covTotal = computed(() => owedN.value + filedN.value + returnedN.value + validatedN.value + staleN.value)
const covW = (n) => (covTotal.value ? `${(n / covTotal.value) * 100}%` : '0%')
/* stats.eligible counts RCA-REQUIRED terminals only — a desk of voluntary
   filings would read "DESK OF 0"; the lens total is the honest floor */
const eligibleN = computed(() => Math.max(stats.value?.eligible ?? 0, covTotal.value))
const agingCols = computed(() => {
  const buckets = [
    ['d0_3', '0–3d', 'a0'], ['d3_7', '3–7d', 'a1'],
    ['d7_14', '7–14d', 'a2'], ['d14_plus', '14d+', 'a3'],
  ]
  const ns = buckets.map(([k]) => desk.agingOf(k))
  const max = Math.max(1, ...ns)
  return buckets.map(([key, label, cls], i) => ({
    key, label, cls, n: ns[i], h: ns[i] ? `${14 + Math.round((ns[i] / max) * 44)}px` : '4px',
  }))
})

/* ── footer readout (defensive over the analytics shape) ── */
const coveragePct = computed(() =>
  analytics.value?.coverage?.pct ?? stats.value?.coverage_pct ?? 100)
const fmtH = (h) => {
  if (h == null) return '—'
  if (h < 48) return `${Math.round(h)}h`
  return `${Math.floor(h / 24)}d ${String(Math.round(h % 24)).padStart(2, '0')}h`
}
const cycleMedian = computed(() => (analytics.value?.cycle_time?.n
  ? fmtH(analytics.value.cycle_time.median_hours) : '—'))
const reviewMedian = computed(() => (analytics.value?.review_latency?.n
  ? fmtH(analytics.value.review_latency.median_hours) : '—'))
const kedbKnown = computed(() => analytics.value?.kedb?.known_errors ?? 0)
const scopeNote = computed(() => (props.panel === 'admin'
  ? 'DESK-WIDE SEAL · ADMIN GOVERNANCE VIEW · WINDOW 30D'
  : 'TEAM-SEALED BENCH · YOUR TEAMS ONLY · WINDOW 30D'))

/* ── '/' focuses the grep field ── */
const searchRef = ref(null)
const onGlobalKey = (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  const tag = (t?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || t?.isContentEditable) return
  e.preventDefault()
  searchRef.value?.focus()
}

/* ── lifecycle ── */
onMounted(async () => {
  desk.start()
  window.addEventListener('keydown', onGlobalKey)
  fetchCapabilities()
  me.value = await fetchMe()
})
onBeforeUnmount(() => {
  desk.stop()
  window.removeEventListener('keydown', onGlobalKey)
})
</script>

<style scoped>
.rds { display: flex; flex-direction: column; gap: 14px; }

/* ══ lens strip — theme-native chrome (the stage above is dark both themes) ══ */
.rds-lenses { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lens-title { font-size: 8.5px; font-weight: 800; letter-spacing: 0.3em;
  color: var(--sd-text-muted); margin-right: 4px; }
.rlens { display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px;
  border-radius: 999px; cursor: pointer; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.rlens b { font-size: 12.5px; font-weight: 800; color: var(--sd-text);
  font-variant-numeric: tabular-nums; }
.rlens:hover { border-color: var(--sd-rca-brd); color: var(--sd-text); }
.rlens.on { color: var(--sd-rca-core); background: var(--sd-rca-soft);
  border-color: var(--sd-rca-brd); box-shadow: var(--sd-rca-glow); }
.rlens--owed b, .rlens--returned b { color: var(--sd-rca-defect); }
.rlens--validated b { color: var(--sd-rca-live); }
.rlens--stale b { color: var(--sd-rca-warn); }

.actor-chip { display: inline-flex; align-items: center; gap: 7px; padding: 6px 8px 6px 12px;
  border-radius: 999px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em;
  color: var(--sd-rca-core); background: var(--sd-rca-soft); border: 1px solid var(--sd-rca-brd); }
.ac-x { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  cursor: pointer; color: var(--sd-rca-core); background: transparent; border: none;
  transition: background-color 0.2s; }
.ac-x:hover { background: color-mix(in srgb, var(--sd-rca-core) 18%, transparent); }

.rds-grep { margin-left: auto; display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 13px; border-radius: 11px; min-width: 250px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted);
  transition: border-color 0.22s var(--sd-spring), box-shadow 0.22s var(--sd-spring); }
.rds-grep:focus-within { border-color: var(--sd-rca-brd);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-rca-core) 12%, transparent); }
.rds-grep input { flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font-size: 11px; letter-spacing: 0.04em; color: var(--sd-text); }
.rds-grep input::placeholder { color: var(--sd-text-muted); }

/* ══ work floor ══ */
.rds-floor { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: 16px; align-items: start; }
.zone-title { display: flex; align-items: center; gap: 10px; margin: 0 0 10px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--sd-text-muted); }
.zone-title::after { content: ""; flex: 1; height: 1px; background: var(--sd-border); }
.zone-title .cnt { color: var(--sd-rca-core); letter-spacing: 0.1em; }
.zone-title .hot { color: var(--sd-rca-core); letter-spacing: 0.1em; }
.rds-left { min-width: 0; }
.rds-right { min-width: 0; }

/* reviewer verdict cluster — leads/admins only, sits above the workbench */
.ri-review { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  flex-wrap: wrap; margin-bottom: 10px; padding: 9px 12px; border-radius: 11px;
  background: var(--sd-rca-soft); border: 1px solid var(--sd-rca-brd); }
.ri-review-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-rca-core); }

/* ══ readout cards — coverage + debt aging on the dark bench (A1, both themes) ══ */
.rds-readout { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 16px; align-items: stretch; }
.ro-card { padding: 18px 22px; border-radius: 16px;
  background: var(--sd-rca-bench);
  border: 1px solid color-mix(in srgb, var(--sd-rca-core) 18%, transparent);
  box-shadow: 0 24px 60px color-mix(in srgb, var(--sd-rca-stage) 45%, transparent); }
.ro-card .zone-title { color: var(--sd-rca-stage-dim); }
.ro-card .zone-title::after { background: color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent); }
.cov-top { display: flex; align-items: baseline; gap: 14px; margin: 4px 0 14px; }
.cov-num { font-size: 46px; font-weight: 200; line-height: 1; color: var(--sd-rca-stage-ink);
  font-variant-numeric: tabular-nums; }
.cov-num b { font-weight: 800; color: var(--sd-rca-core); }
.cov-num i { font-style: normal; font-size: 22px; color: var(--sd-rca-stage-dim); }
.cov-lbl { font-size: 8.5px; letter-spacing: 0.22em; color: var(--sd-rca-stage-dim); line-height: 1.8; }
.cov-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 5%, transparent); }
.cov-bar i { display: block; height: 100%; transition: width 1s var(--sd-spring); }
.cov-bar .c-val { background: linear-gradient(90deg,
  color-mix(in srgb, var(--sd-rca-live) 75%, var(--sd-rca-stage)), var(--sd-rca-live)); }
.cov-bar .c-fil { background: linear-gradient(90deg, var(--sd-rca-deep), var(--sd-rca-core)); }
.cov-bar .c-ret { background: color-mix(in srgb, var(--sd-rca-defect) 70%, var(--sd-rca-core)); }
.cov-bar .c-owe { background: repeating-linear-gradient(135deg,
  color-mix(in srgb, var(--sd-rca-defect) 75%, transparent) 0 6px,
  color-mix(in srgb, var(--sd-rca-defect) 40%, transparent) 6px 12px); }
.cov-leg { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 11px; }
.leg { display: inline-flex; align-items: center; gap: 6px; font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.14em; color: var(--sd-rca-stage-dim); cursor: pointer; padding: 5px 9px;
  border-radius: 6px; border: 1px solid transparent; background: transparent;
  transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.leg:hover { color: var(--sd-rca-stage-ink); transform: translateY(-1px); }
.leg.on { color: var(--sd-rca-core); border-color: var(--sd-rca-brd); background: var(--sd-rca-soft); }
.leg i { width: 8px; height: 8px; border-radius: 2px; }
.leg .lv { background: var(--sd-rca-live); } .leg .lf { background: var(--sd-rca-core); }
.leg .lr { background: color-mix(in srgb, var(--sd-rca-defect) 70%, var(--sd-rca-core)); }
.leg .lo { background: var(--sd-rca-defect); }

.aging { display: flex; gap: 14px; align-items: flex-end; min-height: 96px; margin-top: 8px; }
.age-col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end;
  align-items: center; gap: 7px; text-align: center; }
.age-col .bar { display: block; width: 100%; border-radius: 5px 5px 2px 2px;
  transform-origin: bottom; transition: height 0.9s var(--sd-spring); }
.age-col .n { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.age-col .l { font-size: 8.5px; letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 80%, transparent); }
.age-col.a0 .bar { background: linear-gradient(180deg, var(--sd-rca-core),
  color-mix(in srgb, var(--sd-rca-core) 40%, transparent)); }
.age-col.a0 .n { color: var(--sd-rca-core); }
.age-col.a1 .bar { background: linear-gradient(180deg, var(--sd-rca-hi),
  color-mix(in srgb, var(--sd-rca-hi) 35%, transparent)); }
.age-col.a1 .n { color: var(--sd-rca-hi); }
.age-col.a2 .bar { background: linear-gradient(180deg, var(--sd-rca-warn),
  color-mix(in srgb, var(--sd-rca-warn) 35%, transparent)); }
.age-col.a2 .n { color: var(--sd-rca-warn); }
.age-col.a3 .bar { background: linear-gradient(180deg, var(--sd-rca-defect),
  color-mix(in srgb, var(--sd-rca-defect) 35%, transparent));
  animation: rds-throb 2.8s ease-in-out infinite; }
.age-col.a3 .n { color: var(--sd-rca-defect); }
@keyframes rds-throb { 0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 16px color-mix(in srgb, var(--sd-rca-defect) 30%, transparent); } }

/* ══ footer readout ══ */
.rds-foot { display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  padding: 13px 18px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.rf-scope { font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.rf-line { margin-left: auto; font-size: 9px; letter-spacing: 0.12em; color: var(--sd-text-secondary); }
.rf-line b { color: var(--sd-rca-core); font-weight: 800; }

@media (max-width: 980px) {
  .rds-floor { grid-template-columns: 1fr; }
  .rds-readout { grid-template-columns: 1fr; }
  .rds-grep { margin-left: 0; width: 100%; }
  .rf-line { margin-left: 0; }
}

/* ═════ LIGHT THEME OVERRIDES ═════
   Stage + bench stay dark by token decree; the chrome here is already
   token-native — only the active-lens glow needs a gentler ring on cream. */
[data-theme="light"] .rlens.on { box-shadow: none; }
/* theme-light-rescue.css's [class*="page"] h2 catch-all (0,3,1) would ink the
   readout-card titles invisible on the dark bench — re-pin them. */
[data-theme="light"] .ro-card .zone-title { color: var(--sd-rca-stage-dim) !important; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rds-grep,
  html:not([data-cinematic="on"]) .rlens { transition: none !important; }
}
</style>
