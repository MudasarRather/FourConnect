<template>
  <div class="ico">
    <!-- ═══ OBSIDIAN GLASS — the monumental spatial hero (masthead → glass stage → verb sheet).
         Pure projection: every verb emits back into the SAME handlers the bento/board use. -->
    <SdIncObsidianHero :rows="rows" :stats="stats" :now="nowMs" :arrivals="arrivals" :reduced="reduced"
      :busy-id="busyId" :pirs="pirs" :pirs-approved="pirsApproved" :landed="landed" :intel="intel"
      :last-ruling="lastRuling" :caps-ready="capsReady" :can-govern="canGovern" :can-rule="canRule"
      :can-publish="canPublish" :active-lens="lensKey" :peek-of="peekOf"
      @lens="onLens" @go="onGo" @open="onOpen" @peek="onPeek" @hold="heroHold = $event"
      @confirm-mi="onConfirmMi" @decline-mi="onDeclineMi" @nudge="onNudge"
      @assign="(r) => (assignTarget = r)" @roster="(r) => (rolesTarget = r)"
      @reclassify="onReclassify" @escalate="(r) => (escalateTarget = r)"
      @watchers="(r) => (watchersTarget = r)" @sitrep="onSitrep"
      @pir-sign="(p) => (pirSign = p)" @pir-publish="onPirPublish" />

    <!-- ═══ GOVERNANCE BENTO — the adaptive instrument on the obsidian stage ═══ -->
    <SdIncGovBento :rows="rows" :stats="stats" :now="nowMs" :reduced="reduced" :busy-id="busyId"
      :pirs="pirs" :pirs-approved="pirsApproved" :landed="landed" :cmdr-pool="cmdrPool"
      :intel="intel" :nudged-ids="nudgedIds" :last-ruling="lastRuling"
      :caps-ready="capsReady" :can-govern="canGovern" :can-rule="canRule" :can-publish="canPublish" :active-lens="lensKey"
      @confirm-mi="onConfirmMi" @decline-mi="onDeclineMi" @nudge="onNudge"
      @open="onOpen" @roster="(r) => (rolesTarget = r)" @escalate="(r) => (escalateTarget = r)"
      @reclassify="onReclassify" @pir-sign="(p) => (pirSign = p)" @pir-publish="onPirPublish"
      @lens="onLens" @go="onGo" />

    <!-- ═══ THE FULL BOARD (chrome layer) ═══ -->
    <section class="board-sec">
      <div class="board-head">
        <h2>The <b>full board</b></h2>
        <span class="note sd-mono">SEV1∪SEV2 · {{ total }} LIVE · HOVER FOR VERBS</span>
        <div class="bd-q">
          <Search :size="12" />
          <input v-model="q" type="text" maxlength="80" placeholder="Search the board…" />
        </div>
        <button class="bd-refresh" title="Refresh" @click="refresh(false)">
          <RefreshCw :size="13" :class="{ spin: loading }" /></button>
      </div>

      <div class="lenses">
        <button class="lens sd-mono" :class="{ on: !lensKey }" @click="clearLenses()">
          ALL FAULTS <span class="n sd-mono">{{ allCount }}</span></button>
        <button v-for="(def, key) in CRIT_LENSES" :key="key" class="lens sd-mono"
          :class="[lensTone(key), { on: lensKey === key }]" @click="applyLens(key)">
          {{ def.label }} <span class="n sd-mono">{{ statOf(key) }}</span></button>
      </div>

      <SdIncGovBoard :rows="rows" :now="nowMs" :loading="loading" :page="page" :total="total"
        :limit="12" :busy-id="busyId" :focus-id="focusId" :sort-key="sortKey" :watch-of="watchOf"
        @open="onOpen" @page="page = $event" @sort="onSort" @peek="onPeek"
        @confirm-mi="onConfirmMi" @decline-mi="onDeclineMi" @assign="(r) => (assignTarget = r)"
        @nudge="onNudge" @roster="(r) => (rolesTarget = r)" @reclassify="onReclassify"
        @escalate="(r) => (escalateTarget = r)" @watchers="(r) => (watchersTarget = r)"
        @sitrep="onSitrep" />

      <!-- footer telemetry -->
      <footer class="foot sd-mono">
        <span>COMMAND FUNNEL · GOVERNANCE VIEW · POLL 60S · NO ACK ON THIS DESK</span>
        <span class="sp" />
        <span>MTTA <b>{{ minLabel(footer.mtta) }}</b></span>
        <span>MTTR <b>{{ minLabel(footer.mttr) }}</b>
          <em v-if="footer.trend != null" :class="footer.trend > 0 ? 'up' : 'dn'">
            {{ footer.trend > 0 ? '▲' : '▼' }}{{ Math.abs(footer.trend) }}%</em></span>
        <span>ACK COVERAGE <b>{{ footer.ack != null ? `${Math.round(footer.ack)}%` : '—' }}</b></span>
        <span>OLDEST SEV2 <b>{{ minLabel(footer.oldest) }}</b></span>
      </footer>
    </section>

    <!-- ═══ modals + popovers (all z2700 family; poll holds while any is open) ═══ -->
    <SdIncRolesModal :open="!!rolesTarget" :ticket="rolesTarget"
      @close="rolesTarget = null" @done="() => verbDone(rolesTarget?.id)" />
    <SdIncReclassifyModal :open="!!reclassifyTarget" :ticket="reclassifyTarget?.row || null"
      :direction="reclassifyTarget?.direction || 'de_escalate'"
      @close="reclassifyTarget = null" @done="() => verbDone(reclassifyTarget?.row?.id)" />
    <SdIncPirApproveModal :open="!!pirSign" :pir="pirSign?.pir || null" :mode="pirSign?.mode || 'approve'"
      @close="pirSign = null" @done="() => verbDone(pirSign?.pir?.ticket_id)" />
    <SdIncAssignPop :open="!!assignTarget" :ticket="assignTarget"
      @close="assignTarget = null" @done="() => verbDone(assignTarget?.id)" />
    <SdIncWatchersPop :open="!!watchersTarget" :ticket="watchersTarget"
      @close="watchersTarget = null" @changed="() => verbDone(watchersTarget?.id, false)" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me || {}"
      :assignees="[]" :now="nowMs"
      @close="escalateTarget = null" @done="() => verbDone(escalateTarget?.id)" />

    <!-- rail-launched MI decline (the bento docket owns its own inline flow) -->
    <Teleport to="body">
      <div v-if="declinePrompt" class="dcl-overlay" @mousedown.self="declinePrompt = null">
        <div class="dcl" role="dialog" aria-modal="true" aria-label="Decline MI candidate">
          <p class="dcl-eyebrow sd-mono"><FlagOff :size="11" /> DECLINE MI CANDIDATE</p>
          <p class="dcl-subj">{{ declinePrompt.ticket_number }} — {{ declinePrompt.subject }}</p>
          <textarea v-model="declineNote" class="dcl-ta" rows="3" maxlength="500"
            placeholder="Why this stays a normal incident (required) — returned to the proposer…" />
          <div class="dcl-foot">
            <button class="dcl-btn ghost" @click="declinePrompt = null">Cancel</button>
            <button class="dcl-btn hot" :disabled="declineNote.trim().length < 3 || busyId === declinePrompt.id"
              @click="fireRailDecline">Send decline</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/*
  SdIncCriticalOversightSection — the ADMIN Critical Incidents desk, rebuilt as the
  user-picked HYBRID: hero = "OBSIDIAN GLASS" (spatial glass strata w/ pointer
  parallax), body = "GOVERNANCE BENTO" (urgency-weighted adaptive bento — tile size
  IS urgency, FLIP re-flow on every poll re-weigh) + the full board with the
  oversight verb rail. Thin orchestrator over useCriticalDesk({ panel, limit: 12 })
  — server-paged lens=critical&live=1 window, selector-backed chip counts, poll
  hygiene (uiHold while any modal is open), ?lens/?q/?focus deep links.
  Governance verbs only — deliberately NO ack (admin acks poison MTTA), no cadence
  composing, playbooks read-only. Every privileged control fail-closes on the
  capabilities probe; non-rulers get a graceful read-only desk.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import { Search, RefreshCw, FlagOff } from 'lucide-vue-next'
import SdIncObsidianHero from '../components/SdIncObsidianHero.vue'
import SdIncGovBento from '../components/SdIncGovBento.vue'
import SdIncGovBoard from '../components/SdIncGovBoard.vue'
import SdIncAssignPop from '../components/SdIncAssignPop.vue'
import SdIncWatchersPop from '../components/SdIncWatchersPop.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncReclassifyModal from '../modals/SdIncReclassifyModal.vue'
import SdIncPirApproveModal from '../modals/SdIncPirApproveModal.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import { useCriticalDesk, CRIT_LENSES, landedFetch } from '../composables/useCriticalDesk'
import { useIncidentPeek } from '../composables/useIncidentPeek'
import {
  useCapabilities, fetchCapabilities, fetchMe, confirmMiProposal, declineMiProposal,
  nudgeTicketOwner, exportSitrepPdf, listPirs, publishPir, fetchRosterCandidates,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'changed', 'new'])
const toast = useToast()

/* ── the shared data spine ── */
const desk = useCriticalDesk({ panel: props.panel, limit: 12 })
const {
  rows, total, page, loading, stats, arrivals, q, uiHold, sortKey, focusId,
  lensKey, statOf, refresh, applyLens, clearLenses, onSort,
} = desk
const nowMs = computed(() => desk.now.value)

/* ── capabilities (fail-closed) + identity ── */
const caps = useCapabilities()
const me = ref(null)
const capsReady = computed(() => caps.checked)
const canRule = (row) => caps.isAdmin
  || (!!row?.team_id && caps.leadTeamIds.includes(String(row.team_id)))
const canGovern = computed(() => capsReady.value && (caps.isAdmin || caps.leadTeamIds.length > 0))
// PIR publish is superuser-only on the backend — mirror that on the verb (leads can
// approve/reject via canGovern, but only an admin seals it to the knowledge record).
const canPublish = computed(() => capsReady.value && caps.isAdmin)

/* ── per-row intel cache + honest lazy watch counts ── */
const peek = useIncidentPeek()
const watchStates = reactive({})
const onPeek = (id) => {
  const k = String(id)
  if (!watchStates[k]) watchStates[k] = peek.peek(id)
}
const watchOf = (id) => watchStates[String(id)]?.sitrep?.watchers_total ?? null
// the hero reads the whole settled peek state (sitrep watchers + playbook template key)
const peekOf = (id) => watchStates[String(id)] || null

/* ── side data: PIR folios · landed shelf · commander pool · similar intel ── */
const pirs = ref([])
const pirsApproved = ref([])
const landed = ref([])
const cmdrPool = ref([])
const intelState = ref(null)
let sideAt = 0
const refreshSide = async (force = false) => {
  if (!force && Date.now() - sideAt < 45000) return
  sideAt = Date.now()
  try {
    const [rev, appr, land] = await Promise.all([
      listPirs({ status: 'in_review', limit: 4 }),
      listPirs({ status: 'approved', limit: 3 }),
      landedFetch(),
    ])
    pirs.value = rev.items || []
    pirsApproved.value = appr.items || []
    landed.value = land
  } catch { /* keep last good */ }
}
watch(stats, () => refreshSide())

const TERMINAL = new Set(['resolved', 'closed', 'archived'])
const liveRow = (r) => !TERMINAL.has(String(r.status || '')) && !r.merged_into_id
const docketRow = computed(() => rows.value.find((r) => r.mi_proposed_at && !r.is_major_incident && liveRow(r)) || null)
const cmdrRow = computed(() => rows.value.find((r) => liveRow(r) && r.sev === 1 && !r.incident_commander_id) || null)
watch(() => cmdrRow.value?.id, async (id) => {
  if (!id) { cmdrPool.value = []; return }
  try {
    const res = await fetchRosterCandidates(id)
    cmdrPool.value = (res.candidates || [])
      .filter((p) => p.is_lead || p.is_agent)
      .sort((a, b) => (a.command_load || 0) - (b.command_load || 0))
      .slice(0, 3)
  } catch { cmdrPool.value = [] }
}, { immediate: true })
const intelBase = computed(() => docketRow.value || rows.value[0] || null)
watch(() => intelBase.value?.id, (id) => { intelState.value = id ? peek.peek(id) : null }, { immediate: true })
const intel = computed(() => (intelBase.value
  ? { base: intelBase.value, items: intelState.value?.similar || [] }
  : null))

/* ── verb state ── */
const busyId = ref(null)
const nudgedIds = ref([])
const lastRuling = ref('')
const rolesTarget = ref(null)
const reclassifyTarget = ref(null)   // { row, direction }
const pirSign = ref(null)            // { pir, mode }
const assignTarget = ref(null)
const watchersTarget = ref(null)
const escalateTarget = ref(null)
const declinePrompt = ref(null)      // rail-launched decline (row)
const declineNote = ref('')
const pdfBusy = ref(false)
const heroHold = ref(false)          // the hero's verb sheet is open

/* poll holds while ANY overlay is open (incl. the hero's verb sheet) */
const anyOverlay = computed(() => !!(rolesTarget.value || reclassifyTarget.value || pirSign.value
  || assignTarget.value || watchersTarget.value || escalateTarget.value || declinePrompt.value
  || heroHold.value))
watch(anyOverlay, (v) => { uiHold.value = v })

/* every verb lands here: invalidate the row's intel, refetch, tell the workspace.
   refetch=false (watchers pop) keeps its overlay open — it mutates incrementally. */
const closeOverlays = () => {
  rolesTarget.value = null; reclassifyTarget.value = null; pirSign.value = null
  assignTarget.value = null; escalateTarget.value = null
}
const verbDone = (id, refetch = true) => {
  if (id != null) {
    peek.invalidate(id)
    delete watchStates[String(id)]
  }
  if (refetch) { closeOverlays(); refresh(); refreshSide(true) }
  emit('changed')
}

/* ── governance verbs ── */
const onConfirmMi = async (p) => {
  const row = p?.row || p
  if (!row || busyId.value) return
  const cadence = p?.cadence ?? 30
  const warRoom = p?.warRoom ?? true
  busyId.value = row.id
  try {
    const r = await confirmMiProposal(row.id, {
      update_interval_minutes: cadence || null,
      open_war_room: !!warRoom,
    })
    lastRuling.value = `${row.ticket_number} CONFIRMED MI · CADENCE ${cadence}M ARMED${r?.war_room_url ? ' · WAR ROOM SPINNING UP' : ''}`
    toast.success(`${row.ticket_number} confirmed — major incident declared${r?.war_room_url ? ', war room open' : ''}`)
    verbDone(row.id)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not confirm the candidate') }
  finally { busyId.value = null }
}
const declineCall = async (row, note) => {
  busyId.value = row.id
  try {
    await declineMiProposal(row.id, { note })
    lastRuling.value = `${row.ticket_number} DECLINED (${note.split('—')[0].trim()}) · STAYS SEV2 ON THE BOARD`
    toast.success(`${row.ticket_number} declined — the proposer has your note`)
    declinePrompt.value = null
    verbDone(row.id)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not decline') }
  finally { busyId.value = null }
}
const onDeclineMi = (p) => {
  // bento sends { row, note } (reason-gated inline); the rail sends the bare row →
  // open the compact note prompt (decline is ALWAYS note-gated).
  if (p?.note && p?.row) { declineCall(p.row, p.note); return }
  declinePrompt.value = p?.row || p
  declineNote.value = ''
}
const fireRailDecline = () => {
  if (declinePrompt.value && declineNote.value.trim().length >= 3) {
    declineCall(declinePrompt.value, declineNote.value.trim())
  }
}
const onNudge = async (row) => {
  if (!row || busyId.value) return
  busyId.value = row.id
  try {
    await nudgeTicketOwner(row.id)
    nudgedIds.value = [...nudgedIds.value, String(row.id)]
    toast.success(`Owner nudged on ${row.ticket_number}`)
    peek.invalidate(row.id)
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Nudge throttled or refused') }
  finally { busyId.value = null }
}
const onReclassify = ({ row, direction }) => { reclassifyTarget.value = { row, direction } }
const onPirPublish = async (pir) => {
  if (busyId.value) return
  busyId.value = pir.id
  try {
    await publishPir(pir.id)
    toast.success(`${pir.report_number} published to the knowledge record`)
    verbDone(pir.ticket_id)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not publish the report') }
  finally { busyId.value = null }
}
const onSitrep = async (row) => {
  if (pdfBusy.value) return
  pdfBusy.value = true
  try {
    const blob = await exportSitrepPdf(row.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `SITREP-${row.ticket_number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error(e?.response?.status === 503 ? 'PDF engine offline on the backend host' : 'Could not export the sitrep')
  } finally { pdfBusy.value = false }
}

/* ── navigation + lenses ── */
const onOpen = (id) => emit('open', String(id))
const onLens = (key) => applyLens(key)
const onGo = (dest) => {
  if (dest === 'docket') {
    document.getElementById('sd-gov-bento')?.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'start' })
    return
  }
  if (dest === 'pirs') emit('go', 'incidents/post-incident')
}
const lensTone = (key) => (key === 'breached' ? 'esc'
  : ['unacked', 'update_overdue', 'at_risk'].includes(key) ? 'warn' : '')
const allCount = computed(() => statOf('sev1') + statOf('sev2'))

/* ── footer telemetry (single gathered read — chips stay on selectors) ── */
const footer = computed(() => {
  const s = stats.value || {}
  const c = s.critical || {}
  return {
    mtta: s.mtta_minutes_30d,
    mttr: s.mttr_minutes_current_month,
    trend: s.mttr_trend_pct,
    ack: c.ack_coverage_pct,
    oldest: c.oldest_sev2_age_minutes,
  }
})
const minLabel = (m) => (m == null ? '—'
  : m >= 1440 ? `${Math.floor(m / 1440)}d` : m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`)

/* ── reduced-motion posture (data-cinematic="on" overrides the OS setting) ── */
const reduced = ref(false)

/* ── arrivals: the hero flashes, then the badge stands down ── */
let arrTimer = null
watch(() => arrivals.value.count, (n) => {
  if (!n) return
  clearTimeout(arrTimer)
  arrTimer = setTimeout(() => { arrivals.value = { count: 0, ids: [] } }, 6000)
})

onMounted(async () => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && document.documentElement.getAttribute('data-cinematic') !== 'on'
  desk.start()
  refreshSide(true)
  fetchCapabilities()
  me.value = await fetchMe()
})
onBeforeUnmount(() => { desk.stop(); clearTimeout(arrTimer) })
</script>

<style scoped>
.ico { display: flex; flex-direction: column; gap: 16px; }

/* ── board section (theme-native chrome) ── */
.board-sec { display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }
.board-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.board-head h2 { margin: 0; font-size: 25px; font-weight: 240; letter-spacing: -0.01em;
  color: var(--sd-text); }
.board-head h2 b { font-weight: 620; }
.board-head .note { font-size: 9.5px; font-weight: 600; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.bd-q { margin-left: auto; display: flex; align-items: center; gap: 7px; padding: 8px 12px;
  border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); min-width: 210px; }
.bd-q input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: 11.5px; color: var(--sd-text); }
.bd-q input::placeholder { color: var(--sd-text-muted); }
.bd-q:focus-within { border-color: var(--sd-fun-brd); }
.bd-refresh { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px;
  cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: color 0.2s, border-color 0.2s; align-self: center; }
.bd-refresh:hover { color: var(--sd-fun-core); border-color: var(--sd-fun-brd); }
.spin { animation: sd-spin-slow 1.1s linear infinite; }

/* lens chips — chip count ⇔ its click's rows, always (selector-backed) */
.lenses { display: flex; gap: 9px; flex-wrap: wrap; }
.lens { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.14em; color: var(--sd-text-secondary); padding: 9px 13px; border-radius: 11px;
  cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  transition: transform 0.28s var(--sd-spring), border-color 0.2s, color 0.2s, box-shadow 0.28s; }
.lens:hover { transform: translateY(-2px); border-color: var(--sd-fun-brd); color: var(--sd-text); }
.lens .n { font-weight: 700; color: var(--sd-text); background: var(--sd-border); border-radius: 6px;
  padding: 3px 7px; min-width: 24px; text-align: center; }
.lens.on { border-color: var(--sd-fun-core); color: var(--sd-text);
  box-shadow: 0 6px 20px var(--sd-fun-soft), inset 0 0 0 1px var(--sd-fun-brd); }
.lens.on .n { background: var(--sd-fun-grad); color: #170d03; }
.lens.warn .n { color: var(--sd-warning); }
.lens.esc .n { color: var(--sd-fun-esc); }
.lens.on.warn .n, .lens.on.esc .n { color: #170d03; }

/* footer telemetry */
.foot { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 4px;
  padding-top: 15px; border-top: 1px solid var(--sd-border); font-size: 9.5px; font-weight: 600;
  letter-spacing: 0.18em; color: var(--sd-text-dim); line-height: 1.7; }
.foot .sp { flex: 1; }
.foot b { color: var(--sd-text); font-weight: 700; }
.foot em { font-style: normal; margin-left: 5px; font-size: 9px; }
.foot em.dn { color: var(--sd-fun-resolved); }
.foot em.up { color: var(--sd-fun-esc); }

/* rail-launched decline prompt (z2700 family) */
.dcl-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.58); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.dcl { width: min(440px, 94vw); border-radius: 18px; padding: 18px;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid color-mix(in srgb, var(--sd-fun-esc) 35%, var(--sd-border));
  box-shadow: var(--sd-shadow-hover); }
.dcl-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-fun-esc); }
.dcl-subj { margin: 0 0 11px; font-size: 12.5px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dcl-ta { width: 100%; resize: vertical; min-height: 70px; padding: 10px 12px; border-radius: 12px;
  font: inherit; font-size: 12px; line-height: 1.5; color: var(--sd-text);
  background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none; }
.dcl-ta:focus { border-color: color-mix(in srgb, var(--sd-fun-esc) 45%, transparent); }
.dcl-ta::placeholder { color: var(--sd-text-muted); }
.dcl-foot { display: flex; justify-content: flex-end; gap: 9px; margin-top: 13px; }
.dcl-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; border: 1px solid transparent; }
.dcl-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface);
  border-color: var(--sd-border); }
.dcl-btn.hot { color: #fff4f0; background: linear-gradient(122deg, #ff8a7e, var(--sd-fun-esc) 60%, #a02c22); }
.dcl-btn:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 760px) { .bd-q { min-width: 0; width: 100%; margin-left: 0; } }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .bd-q, [data-theme="light"] .lens { background: rgba(255, 250, 240, 0.65); }
[data-theme="light"] .lens.on .n, [data-theme="light"] .lens.on.warn .n,
[data-theme="light"] .lens.on.esc .n { color: #fff8ec; }
[data-theme="light"] .dcl { background: linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 250, 240, 0.86)); }
[data-theme="light"] .dcl-overlay { background: rgba(40, 25, 10, 0.32); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .spin { animation: none !important; }
}
</style>
