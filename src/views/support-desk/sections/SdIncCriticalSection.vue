<template>
  <!-- SdIncCriticalSection — the AGENT Critical Incidents desk, rebuilt as
       "THE DAILY FAULT" (1:1 port of the winning agent-05 artifact): the shift's
       SEV1∪SEV2 exposure as a living broadsheet that writes, annotates and corrects
       itself in red ink. Thin orchestrator over useCriticalDesk (server-paged rows,
       lockstep lens counts, poll hygiene, deep links) + useIncidentPeek (per-row
       intel cache). SdIncFrontPage is the hero instrument; SdIncRegistry hosts the
       pencil-tray verb rail; the band below carries the printed protocol checklist
       and yesterday's resolutions; the colophon prints the desk telemetry. -->
  <div class="tdf">
    <div class="tdf-sheet">
      <SdIncFrontPage :stats="stats" :rows="rows" :now="now" :arrivals="arrivals" :reduced="reduced"
        :indices="indices" :exposures="exposures" :total="total" :active-key="activeKey" :q="q"
        :lead="lead" :second="second" :candidate="candidate" :can-rule="canRule"
        :can-withdraw="canWithdrawCandidate" :promo-counts="promoCounts" :intel="intel"
        :desk-name="deskName"
        @lens="applyLensKey" @focus="jumpTo" @open="(id) => emit('open', id)"
        @ack="ackNext" @war="onWar" @sitrep="onSitrep" @declare="onDeclare"
        @withdraw="onWithdraw" @clear-q="q = ''" />

      <SdIncRegistry :rows="rows" :now="now" :loading="loading" :total="total"
        :filtered="!!lensKey || !!q" :me-id="me?.id" :pinned-id="lead?.id"
        :expanded-id="expandedId" :busy-id="busyId" :flash-id="flashId"
        :arrival-ids="arrivals.ids" :reduced="reduced"
        @open="(id) => emit('open', id)" @lens="applyLensKey" @war="onWar"
        @ack="onAck" @update="(r) => openModal('update', r)" @playbook="onPlaybook"
        @roster="(r) => openModal('roster', r)" @impact="(r) => openModal('impact', r)"
        @decision="(r) => openModal('decision', r)" @link="(r) => openModal('link', r)"
        @propose="onDeclare" @declare="onDeclare" @bridge="onBridge"
        @reclassify="onReclassify" @escalate="onEscalate" @playbook-changed="onPlaybookChanged" />

      <SdIncPager :page="page" :total="total" :limit="10" @update:page="page = $event" />

      <!-- ░░ PROTOCOL + RESOLUTIONS band ░░ -->
      <div class="band">
        <section class="protocol" aria-label="Response playbook — printed checklist">
          <div class="section-rule">The Protocol — Printed Checklist
            <span class="tag num">{{ lead ? `${lead.ticket_number} · RESPONSE PLAYBOOK` : 'NO FAULT ON THE STONE' }}</span>
          </div>
          <p class="proto-sub">
            <span>DESK-WIDE: <b>{{ playbookCounts.armed }} ARMED</b></span>
            <span>OPEN TASKS: <b>{{ playbookCounts.open }}</b></span>
            <span>DONE: <b>{{ playbookCounts.done }}</b></span>
            <span v-if="lead">THIS FAULT: <b>{{ lead.task_done }}/{{ lead.task_total }}</b></span>
          </p>
          <SdIncPlaybook v-if="lead" :key="lead.id" :ticket="lead" class="proto-pbk"
            @changed="onPlaybookChanged(lead)" />
          <p v-else class="proto-empty">The checklist typesets itself when a fault takes the lead.</p>
          <p class="proto-foot"><span>HAND-TICKED BY THE BRIDGE AS STEPS LAND</span>
            <b>· {{ noPlaybookNote }}</b></p>
        </section>

        <section class="resolutions" aria-label="Yesterday's resolutions — recently landed">
          <div class="section-rule">Yesterday’s Resolutions <span class="tag">RECENTLY LANDED</span></div>
          <div v-for="r in landed.slice(0, 5)" :key="r.id" class="res-item" role="button" tabindex="0"
            @click="emit('open', r.id)" @keydown.enter="emit('open', r.id)">
            <span><span class="rid num">{{ r.ticket_number }}</span><span class="rsev">SEV{{ r.sev }}</span></span>
            <span class="rt">{{ r.subject }}</span>
            <span class="rmttr num">{{ durLabel(r) }}<small>MTTR</small></span>
            <span class="pir" :class="pirClass(r)">{{ pirLabel(r) }}</span>
          </div>
          <p v-if="!landed.length" class="proto-empty">Nothing landed this week — the column waits for its first resolution.</p>
          <p class="proto-foot"><span>THE OWED PIR IS CIRCLED IN RED UNTIL IT IS FILED.</span></p>
        </section>
      </div>

      <!-- ░░ COLOPHON ░░ -->
      <footer class="colophon">
        <span><span class="brand">THE DAILY FAULT</span> · SET CONTINUOUSLY BY THE FAULT GRID · SCOPE: SEV1∪SEV2 ONLY</span>
        <span>MTTA <b class="num">{{ mttaLabel }}</b> · MTTR <b class="num">{{ mttrLabel }}</b>
          <span v-if="trendLabel" class="up num"> {{ trendLabel }}</span> ·
          ACK COVERAGE <b class="num">{{ ackCoverageLabel }}</b> ·
          OLDEST SEV2 ON THE FLOOR <b class="num">{{ oldestLabel }}</b></span>
      </footer>
    </div>

    <!-- ░░ COMMAND MODALS (z2700 family) + WAR ROOM (z5200; MI modal rides 5300) ░░ -->
    <SdIncUpdateModal :open="modal === 'update'" :ticket="target" @close="modal = null" @done="onVerbDone" />
    <SdIncRolesModal :open="modal === 'roster'" :ticket="target" @close="modal = null" @done="onVerbDone" />
    <SdIncDecisionModal :open="modal === 'decision'" :ticket="target" @close="modal = null" @done="onVerbDone" />
    <SdIncImpactModal :open="modal === 'impact'" :ticket="target" @close="modal = null" @done="onVerbDone" />
    <SdIncLinkModal :open="modal === 'link'" :ticket="target" @close="modal = null" @done="onVerbDone" />
    <SdIncReclassifyModal :open="modal === 'reclassify'" :ticket="target" :direction="reclassifyDir"
      @close="modal = null" @done="onVerbDone" />
    <!-- :z=5300 — co-rendered with SdWarRoomConsole (z5200): the declare ceremony must clear it -->
    <SdMajorIncidentModal :open="declareOpen" :ticket="declareTarget" :tickets="declarePool" :agent="true"
      :z="5300" @close="declareOpen = false" @done="onMiDone" />
    <SdWarRoomConsole :open="!!warTarget" :ticket="warTarget" :agent="true" :me="me" :now="now"
      :viewers="viewers" @close="warTarget = null" @changed="onWarChanged"
      @open-ticket="(id) => emit('open', id)" @declare="(t) => onDeclare(t)" />
  </div>
</template>

<script setup>
/*
  Workspace contract: props { panel, agentReveal }; emits ['open','go','changed','new'];
  row/story opens ride emit('open', id) — the drawer lives at the workspace root.
  Every verb @done → peek.invalidate(id) + desk.refresh() so the next peek is honest;
  desk.uiHold rides high while ANY modal / the war-room console is open (poll pause);
  the presence heartbeat beats ~25s ONLY while the war room is open.
*/
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import SdIncFrontPage from '../components/SdIncFrontPage.vue'
import SdIncRegistry from '../components/SdIncRegistry.vue'
import SdIncPager from '../components/SdIncPager.vue'
import SdIncPlaybook from '../components/SdIncPlaybook.vue'
import SdIncUpdateModal from '../modals/SdIncUpdateModal.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncDecisionModal from '../modals/SdIncDecisionModal.vue'
import SdIncImpactModal from '../modals/SdIncImpactModal.vue'
import SdIncLinkModal from '../modals/SdIncLinkModal.vue'
import SdIncReclassifyModal from '../modals/SdIncReclassifyModal.vue'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import SdWarRoomConsole from '../drawers/SdWarRoomConsole.vue'
import { useCriticalDesk, landedFetch } from '../composables/useCriticalDesk'
import { useIncidentPeek, isPossibleRepeat } from '../composables/useIncidentPeek'
import {
  ackTicket, exportSitrepPdf, warRoomHref, withdrawMiProposal, ticketPresence,
  fetchMe, fetchCapabilities, useCapabilities,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  // part of the workspace's ticket-tool contract; gating is the registry's job (agentOnly)
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'changed', 'new'])

const router = useRouter()
const toast = useToast()
const caps = useCapabilities()

/* ── the data spine (all refs BEFORE any computed/watch — TDZ) ── */
const desk = useCriticalDesk({ panel: props.panel, limit: 10 })
const {
  rows, total, page, loading, stats, now, arrivals, q, uiHold, focusId, lensKey, statOf,
} = desk
const peek = useIncidentPeek()

const me = ref(null)
const landed = ref([])
const reduced = ref(false)
const flashId = ref(null)
const expandedId = ref(null)
const busyId = ref(null)
const pdfBusy = ref(false)
const modal = ref(null)              // update | roster | decision | impact | link | reclassify
const target = ref(null)
const reclassifyDir = ref('promote')
const declareOpen = ref(false)
const declareTarget = ref(null)
const warTarget = ref(null)
const viewers = ref([])
const intelState = ref(null)
let heartbeat = null
let arrivalsTimer = null
let focusDone = ''
let mq = null
const setReduced = () => {
  reduced.value = !!(mq?.matches) && document.documentElement.dataset.cinematic !== 'on'
}

/* ── press-room derived state ── */
const rank = (r) => (r.sev * 1000)
  - (r.sla_resolution_breached || r.sla_response_breached ? 500 : 0)
  - (!r.acknowledged_at ? 200 : 0)
  - (r.is_major_incident ? 100 : 0)
const ranked = computed(() => [...rows.value].sort((a, b) =>
  rank(a) - rank(b) || new Date(a.created_at) - new Date(b.created_at)))
const lead = computed(() => ranked.value[0] || null)
const second = computed(() => ranked.value[1] || null)
const candidate = computed(() => rows.value.find((r) => r.mi_proposed_at && !r.is_major_incident) || null)

/* posture indices — EVERY count reads through the desk's selectors (statOf), never
   stats.critical.x inline. 9 chips = the artifact's grid, cmdr_unstaffed stays a
   deep-link-only lens (plan D lens strip). */
const indices = computed(() => [
  { key: 'all', label: 'ALL FAULTS', count: statOf('sev1') + statOf('sev2'), red: false },
  { key: 'sev1', label: 'SEV1', count: statOf('sev1'), red: false },
  { key: 'sev2', label: 'SEV2', count: statOf('sev2'), red: false },
  { key: 'unacked', label: 'UNACKED', count: statOf('unacked'), red: true },
  { key: 'breached', label: 'BREACHED', count: statOf('breached'), red: true },
  { key: 'at_risk', label: 'AT-RISK <4h', count: statOf('at_risk'), red: false },
  { key: 'unowned', label: 'UNOWNED', count: statOf('unowned'), red: true },
  { key: 'update_overdue', label: 'UPDATE OVERDUE', count: statOf('update_overdue'), red: true },
  { key: 'mi_proposed', label: 'MI CANDIDATES', count: statOf('mi_proposed'), red: false },
])
const exposures = computed(() => [
  { key: 'exposure_revenue', label: 'Revenue', cls: 'b-rev', count: statOf('exposure_revenue') },
  { key: 'exposure_public', label: 'Public', cls: 'b-pub', count: statOf('exposure_public') },
  { key: 'unassessed', label: 'Unassessed', cls: 'b-una', count: statOf('unassessed') },
  { key: 'exposure_compliance', label: 'Compliance', cls: 'b-com', count: statOf('exposure_compliance') },
  { key: 'exposure_security', label: 'Security', cls: 'b-sec', count: statOf('exposure_security') },
  { key: 'all', label: 'Faults', cls: 'b-usr', count: statOf('sev1') + statOf('sev2') },
])
const activeKey = computed(() => lensKey.value || 'all')
const applyLensKey = (key) => { if (key === 'all') desk.clearLenses(); else desk.applyLens(key) }

/* stats.critical reads stay in script scope, defensively chained (one-file blast radius
   for the shape is useCriticalDesk; these are display-only extras) */
const crit = computed(() => stats.value?.critical || {})
const promoCounts = computed(() => ({
  proposed: crit.value.mi_proposed_30d || 0,
  confirmed: crit.value.mi_confirmed_30d || 0,
  declined: crit.value.mi_declined_30d || 0,
}))
const playbookCounts = computed(() => ({
  armed: crit.value.playbook?.tickets_with_tasks || 0,
  open: crit.value.playbook?.tasks_open || 0,
  done: crit.value.playbook?.tasks_done || 0,
}))
const noPlaybookNote = computed(() => {
  const bare = rows.value.filter((r) => !r.task_total).map((r) => r.ticket_number).slice(0, 3)
  return bare.length
    ? `${bare.join(' AND ')} RUN WITHOUT A PLAYBOOK — APPLY FROM THEIR ROWS`
    : 'EVERY STANDING FAULT CARRIES A PLAYBOOK'
})

// The hero's "Rule — confirm / decline" acts on THIS candidate, so its authority
// gate must be the candidate's team — same per-row seal the verb rail (SdIncVerbRail)
// and the modal's canDeclare use, and the backend's _require_incident_lead (403).
// A bare `leadTeamIds.length > 0` let a lead of team A open a dead-end ruling modal
// on a team-B candidate they only belong to (canDeclare false → no ruling, no propose).
const canRule = computed(() => !!candidate.value && (caps.isAdmin
  || (!!candidate.value.team_id && caps.leadTeamIds.includes(String(candidate.value.team_id)))))
const canWithdrawCandidate = computed(() => !!candidate.value
  && (caps.isAdmin || (me.value && String(candidate.value.mi_proposed_by_id) === String(me.value.id))))
const deskName = computed(() => {
  const n = String(me.value?.full_name || me.value?.email || '').trim()
  if (!n) return ''
  const p = n.split(/\s+/)
  return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : n
})

/* similar-incident intel — peeked on the lead row, 60s TTL cache */
watch(() => lead.value?.id, (id) => { intelState.value = id ? peek.peek(id) : null }, { immediate: true })
const intel = computed(() => {
  const sim = intelState.value?.similar
  if (!Array.isArray(sim) || !sim.length) return null
  const strong = sim.filter((s) => (s?.score ?? 0) >= 3)
  return { item: sim[0], repeat: isPossibleRepeat(sim), count: strong.length, reason: sim[0]?.reason || '' }
})

/* ── colophon telemetry ── */
const minLabel = (m) => (m == null ? '—' : (m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`))
const mttaLabel = computed(() => minLabel(stats.value?.mtta_minutes_30d))
const mttrLabel = computed(() => minLabel(stats.value?.mttr_minutes_current_month))
const trendLabel = computed(() => {
  const t = stats.value?.mttr_trend_pct
  if (t == null) return ''
  return `${t > 0 ? '▲' : '▼'}${Math.abs(t)}% m/m`
})
const ackCoverageLabel = computed(() =>
  (crit.value.ack_coverage_pct == null ? '—' : `${Math.round(crit.value.ack_coverage_pct)}%`))
const oldestLabel = computed(() => minLabel(crit.value.oldest_sev2_age_minutes))

/* ── yesterday's resolutions (the terminal window shelf) ── */
const loadLanded = async () => { try { landed.value = await landedFetch() } catch { /* shelf keeps last good */ } }
const durLabel = (r) => {
  const a = new Date(r.incident_detected_at || r.created_at).getTime()
  const b = new Date(r.resolved_at || r.closed_at || 0).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return '—'
  const m = Math.round((b - a) / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}
const pirClass = (r) => (!r.has_pir ? 'owed'
  : (['approved', 'published'].includes(String(r.pir_status || '')) ? 'approved' : 'filed'))
const pirLabel = (r) => (!r.has_pir ? 'PIR OWED'
  : (['approved', 'published'].includes(String(r.pir_status || '')) ? 'PIR APPROVED' : 'PIR FILED'))

/* ── verbs (every mutation → invalidate + refresh; toasts carry the backend detail) ── */
const openModal = (kind, r) => { target.value = r; modal.value = kind }
const onVerbDone = () => {
  const id = target.value?.id
  modal.value = null
  if (id) peek.invalidate(id)
  desk.refresh()
  loadLanded()
  emit('changed')
}
const onAck = async (r) => {
  if (busyId.value) return
  busyId.value = r.id
  const before = r.acknowledged_at
  r.acknowledged_at = new Date().toISOString()   // optimistic flip — the rail hides Ack at once
  try {
    await ackTicket(r.id)
    toast.success(`${r.ticket_number} acknowledged — MTTA clock stopped`)
    peek.invalidate(r.id)
    desk.refresh()
    emit('changed')
  } catch (e) {
    r.acknowledged_at = before
    toast.error(e?.response?.data?.detail || 'Could not acknowledge')
  } finally { busyId.value = null }
}
const ackNext = () => {
  const r = ranked.value.find((x) => !x.acknowledged_at)
  if (!r) { toast.success('Every standing fault is acknowledged — the price is paid.'); return }
  jumpTo(r.id)
  onAck(r)
}
const onBridge = (r) => {
  const href = warRoomHref(r?.war_room_url, props.panel)
  if (!href) { toast.error('No bridge link on this fault — arm one from the MI console'); return }
  if (String(href).startsWith('/')) router.push(href)
  else window.open(href, '_blank', 'noopener')
}
const onWar = (r) => {
  if (r && (r.is_major_incident || r.war_room_url)) { warTarget.value = r; return }
  toast.info?.('No war room is live — declare a major to open one')
  if (!toast.info) toast.error('No war room is live — declare a major to open one')
}
const onSitrep = async (r) => {
  if (!r || pdfBusy.value) return
  pdfBusy.value = true
  try {
    const blob = await exportSitrepPdf(r.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `SITREP-${r.ticket_number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error(e?.response?.status === 503 ? 'PDF engine offline on the backend host' : 'Could not print the sitrep')
  } finally { pdfBusy.value = false }
}
const onReclassify = ({ row, direction }) => {
  target.value = row
  reclassifyDir.value = direction === 'de_escalate' ? 'de_escalate' : 'promote'
  modal.value = 'reclassify'
}
const onDeclare = (r) => { declareTarget.value = r || null; declareOpen.value = true }
const declarePool = computed(() => rows.value.filter((r) => !r.is_major_incident))
const onMiDone = () => {
  const id = declareTarget.value?.id
  declareOpen.value = false
  if (id) peek.invalidate(id)
  desk.refresh()
  emit('changed')
}
const onWithdraw = async (r) => {
  if (!r || busyId.value) return
  busyId.value = r.id
  try {
    await withdrawMiProposal(r.id)
    toast.success('Proposal withdrawn — the notice comes off the page')
    peek.invalidate(r.id)
    desk.refresh()
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not withdraw the proposal') }
  finally { busyId.value = null }
}
const onPlaybook = (r) => {
  expandedId.value = String(expandedId.value) === String(r.id) ? null : r.id
  if (expandedId.value) peek.prefetch(r.id)
}
const onPlaybookChanged = (r) => {
  peek.invalidate(r.id)
  desk.refresh()
  emit('changed')
}
// The agent rail carries no escalate verb (oversight-tier); if a host ever emits it,
// hand off to the drawer where the corporate escalation console lives.
const onEscalate = (r) => emit('open', r.id)
const onWarChanged = () => {
  if (warTarget.value) peek.invalidate(warTarget.value.id)
  declareOpen.value = false
  desk.refresh()
  loadLanded()
  emit('changed')
}

/* ── focus + jump choreography ── */
const jumpTo = (id) => {
  flashId.value = null
  nextTick(() => { flashId.value = String(id) })
}
watch([() => focusId.value, () => rows.value, () => loading.value], ([fid, , ld]) => {
  if (!fid || focusDone === String(fid) || ld) return
  focusDone = String(fid)
  jumpTo(fid)
  emit('open', fid)                       // ?focus= deep link opens the drawer too
  desk.setFocus(null)
})

/* ── poll hygiene: hold while any console is open; hand arrivals back after the flash ── */
const anyOpen = computed(() => !!modal.value || declareOpen.value || !!warTarget.value)
watch(anyOpen, (v) => { uiHold.value = v })
watch(() => arrivals.value.count, (c) => {
  if (!c) return
  clearTimeout(arrivalsTimer)
  arrivalsTimer = setTimeout(() => { arrivals.value = { count: 0, ids: [] } }, 1600)
})

/* presence heartbeat — ~25s ONLY while the war room is open (viewer collision) */
watch(warTarget, (t) => {
  clearInterval(heartbeat); heartbeat = null; viewers.value = []
  if (!t) return
  const beat = async () => { try { viewers.value = (await ticketPresence(t.id))?.viewers || [] } catch { /* presence is best-effort */ } }
  beat()
  heartbeat = setInterval(beat, 25000)
})

onMounted(async () => {
  mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  setReduced()
  mq.addEventListener?.('change', setReduced)
  desk.start()
  loadLanded()
  fetchCapabilities()
  me.value = await fetchMe()
})
onBeforeUnmount(() => {
  desk.stop()
  clearInterval(heartbeat)
  clearTimeout(arrivalsTimer)
  mq?.removeEventListener?.('change', setReduced)
})
</script>

<style scoped>
/* ══════════ THE DAILY FAULT — the sheet (sepia newsprint built over --sd-inc-* / --sd-*) ══════════ */
.tdf {
  /* the paper — every ground derives from the token families, never a free palette */
  --df-serif: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  --df-canvas: color-mix(in srgb, var(--sd-inc-stage) 55%, var(--sd-canvas));
  --df-paper: color-mix(in srgb, var(--sd-inc-stage) 98%, var(--sd-inc-core));
  --df-paper-hi: color-mix(in srgb, var(--sd-inc-stage) 94%, var(--sd-inc-core));
  --df-ink: color-mix(in srgb, var(--sd-text) 72%, var(--sd-inc-screen-ink));
  --df-ink-2: color-mix(in srgb, var(--df-ink) 62%, var(--sd-inc-dim));
  --df-ink-3: color-mix(in srgb, var(--df-ink) 30%, var(--sd-inc-dim));
  --df-rule: color-mix(in srgb, var(--df-ink) 16%, transparent);
  --df-rule-strong: color-mix(in srgb, var(--df-ink) 34%, transparent);
  --df-goldwash: color-mix(in srgb, var(--sd-inc-core) 8%, transparent);
  --df-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);

  position: relative;
  color: var(--df-ink);
  font-weight: 300;
  background:
    radial-gradient(1200px 500px at 50% -8%, var(--df-goldwash), transparent 60%),
    var(--df-canvas);
  border-radius: 6px;
  padding: 0 clamp(6px, 1.6vw, 26px);
}
.tdf-sheet {
  max-width: 1520px; margin: 0 auto; padding: 0 clamp(20px, 3vw, 48px) 72px;
  background:
    repeating-linear-gradient(0deg, transparent 0 3px, color-mix(in srgb, var(--sd-inc-dim) 4%, transparent) 3px 4px),
    var(--df-paper);
  box-shadow: var(--df-shadow);
  border-left: 1px solid var(--df-rule);
  border-right: 1px solid var(--df-rule);
  position: relative;
}
.num { font-family: var(--sd-mono); font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
.tdf :deep(.incp) { border-bottom: 1px solid var(--df-rule); }
:focus-visible { outline: 2px solid var(--sd-inc-core); outline-offset: 3px; border-radius: 2px; }

/* ░░ protocol + resolutions band ░░ */
.band { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 26px;
  padding: 26px 0; border-top: 3px double var(--df-rule-strong); }
.section-rule { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 11px;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--df-ink-2);
  padding: 12px 0; border-bottom: 1px solid var(--df-rule); margin-bottom: 14px; }
.section-rule::after { content: ""; flex: 1; height: 1px; background: var(--df-rule); }
.section-rule .tag { font-family: var(--sd-mono); font-weight: 500; font-size: 9.5px;
  letter-spacing: 0.18em; color: var(--sd-inc-core); border: 1px solid var(--sd-inc-brd);
  padding: 3px 8px; border-radius: 2px; }
.proto-sub { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--df-ink-3); margin: 0 0 14px; display: flex;
  gap: 16px; flex-wrap: wrap; }
.proto-sub b { color: var(--sd-inc-core); font-weight: 600; }
.proto-foot { margin: 14px 0 0; font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--df-ink-3); display: flex; gap: 18px; flex-wrap: wrap; }
.proto-foot b { color: var(--df-ink-2); font-weight: 600; }
.proto-empty { margin: 4px 0 0; font-family: var(--df-serif); font-style: italic; font-size: 13.5px;
  color: var(--df-ink-3); }

/* the printed-checklist skin over SdIncPlaybook */
.proto-pbk { --pbk-accent: var(--sd-inc-core); }
.proto-pbk :deep(.pbk-list) { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 26px; }
.proto-pbk :deep(.pbk-row) { background: transparent; border: 0; border-bottom: 1px dotted var(--df-rule);
  border-radius: 0; padding: 8px 0; }
.proto-pbk :deep(.pr-body b) { font-family: var(--df-serif); font-weight: 400; font-size: 13.5px;
  color: var(--df-ink-2); }
.proto-pbk :deep(.pbk-row.done .pr-body b) { color: var(--df-ink); }
.proto-pbk :deep(.pr-state) { width: 17px; height: 17px; border-radius: 2px; background: transparent;
  border: 1.5px solid var(--df-rule-strong); color: var(--sd-inc-live); }
.proto-pbk :deep(.pbk-row.skipped .pr-state) { border-style: dashed; }
.proto-pbk :deep(.pr-btn), .proto-pbk :deep(.pbk-refresh) { border-radius: 2px; background: transparent;
  border-color: var(--df-rule-strong); }
.proto-pbk :deep(.pbk-add input), .proto-pbk :deep(.pr-note input) { background: var(--df-paper-hi);
  border-radius: 2px; border-color: var(--df-rule-strong); }
.proto-pbk :deep(.pbk-btn) { border-radius: 2px; }
.proto-pbk :deep(.pbk-btn.ghost) { background: transparent; border-color: var(--df-rule-strong); }
@media (max-width: 980px) { .proto-pbk :deep(.pbk-list) { grid-template-columns: 1fr; } }

/* yesterday's resolutions */
.res-item { display: grid; grid-template-columns: 92px minmax(0, 1fr) 92px 108px; gap: 10px;
  align-items: baseline; padding: 12px 0; border-bottom: 1px dotted var(--df-rule); cursor: pointer;
  transition: background 0.25s; }
.res-item:hover { background: var(--df-goldwash); }
.res-item .rid { font-size: 12px; font-weight: 700; color: var(--df-ink); }
.res-item .rsev { font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.12em;
  color: var(--df-ink-3); display: block; margin-top: 2px; }
.res-item .rt { font-family: var(--df-serif); font-size: 13.5px; color: var(--df-ink-2);
  line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.res-item .rmttr { font-size: 12px; font-weight: 600; color: var(--sd-inc-live); }
.res-item .rmttr small { display: block; font-size: 8.5px; letter-spacing: 0.14em; color: var(--df-ink-3);
  font-weight: 500; text-transform: uppercase; margin-top: 2px; }
.pir { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; padding: 4px 8px; border-radius: 2px; text-align: center; }
.pir.filed { border: 1px solid var(--df-rule-strong); color: var(--df-ink-2); }
.pir.approved { border: 1px solid var(--sd-inc-live); color: var(--sd-inc-live); }
.pir.owed { position: relative; border: 1.5px solid var(--sd-inc-arc); color: var(--sd-inc-arc); }
.pir.owed::after { content: ""; position: absolute; inset: -6px -8px; border: 1.6px solid var(--sd-inc-arc);
  border-radius: 50%; opacity: 0.75; transform: rotate(-2deg); pointer-events: none; }

/* ░░ colophon ░░ */
.colophon { margin-top: 8px; border-top: 3px double var(--df-rule-strong); padding: 18px 2px 0;
  display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap;
  font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--df-ink-3); line-height: 2; }
.colophon b { color: var(--df-ink-2); font-weight: 600; }
.colophon .up { color: var(--sd-inc-live); }
.colophon .brand { color: var(--sd-inc-core); font-weight: 700; }

@media (max-width: 1180px) { .band { grid-template-columns: 1fr; } }
@media (max-width: 640px) {
  .res-item { grid-template-columns: 92px minmax(0, 1fr); }
  .res-item .rmttr, .res-item .pir { grid-column: 2; justify-self: start; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .tdf {
  --df-canvas: var(--sd-inc-bus);
  --df-paper: var(--sd-inc-stage);
  --df-paper-hi: color-mix(in srgb, var(--sd-inc-stage) 55%, white);
  --df-ink: color-mix(in srgb, var(--sd-text) 82%, var(--sd-inc-deep));
  --df-shadow: 0 24px 60px rgba(90, 70, 40, 0.18);
}
</style>
