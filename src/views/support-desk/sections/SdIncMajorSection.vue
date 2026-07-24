<template>
  <div class="cwl">
    <!-- ═══ hero ═══ -->
    <div class="cw-top">
      <div class="cw-lead">
        <div class="cw-eyebrow">MAJOR INCIDENTS · THE COUNTDOWN WALL</div>
        <h1 class="cw-h1">Every major gets a console. <em>Every clock is live.</em></h1>
        <p class="cw-sub">One launch console per burning incident — count-up clock, go/no-go board, burn sequence, telemetry.
          Candidates hold on the pad until a lead clears them. The range board watches everything one step from major.</p>
      </div>
      <div class="cw-census">
        <div class="cs" :class="{ red: liveRows.length > 0 }"><b>{{ liveRows.length }}</b><span>BURNING</span><i /></div>
        <div class="cs" :class="{ warn: candidates.length > 0 }"><b>{{ candidates.length }}</b><span>ON THE PAD</span><i /></div>
        <div class="cs"><b>{{ rangeRows.length }}</b><span>RANGE SEV2</span><i /></div>
        <div class="cs gold"><b>{{ mttrLabel }}</b><span>MTTR M/M</span><i /></div>
        <div class="cs grn"><b>{{ landed.length }}</b><span>SPLASHED 7D</span><i /></div>
      </div>
    </div>

    <!-- ═══ console wall ═══ -->
    <div v-if="liveRows.length || candidates.length" class="cw-wall">
      <!-- live consoles -->
      <Motion v-for="(r, i) in pagedConsoles" :key="r.id" as="section" class="console"
        :initial="{ opacity: 0, y: 22, filter: 'brightness(2)' }" :animate="{ opacity: 1, y: 0, filter: 'brightness(1)' }"
        :transition="{ duration: 0.7, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] }">
        <div class="c-head">
          <span class="c-num">{{ r.ticket_number }}</span>
          <span class="c-mission">CONSOLE {{ String(i + 1 + (page - 1) * PER_PAGE).padStart(2, '0') }} · {{ consolePhase(r) }}</span>
        </div>
        <div class="c-subj" :title="r.subject">{{ r.subject }}</div>
        <div class="t-clock"><span class="tt">T+</span><b>{{ runClock(r) }}</b></div>
        <div class="t-sub">
          <span v-if="r.incident_commander_name">CMDR {{ shortName(r.incident_commander_name).toUpperCase() }}</span>
          <span v-else class="r">NO COMMANDER</span>
          <template v-if="r.next_update_due_at">
            · <span :class="updOverdue(r) ? 'r' : 'a'">{{ updOverdue(r) ? `UPDATE OVERDUE ${sinceShort(r.next_update_due_at)}` : `NEXT UPDATE ${untilShort(r.next_update_due_at)}` }}</span>
          </template>
          <template v-if="r.resolution_due_at && !r.sla_resolution_breached"> · SLA −{{ untilShort(r.resolution_due_at) }}</template>
          <span v-else-if="r.sla_resolution_breached" class="r"> · SLA BREACHED</span>
        </div>
        <div class="lamps">
          <div class="lamp" :class="r.acknowledged_at ? 'go' : 'nogo'"><b>{{ r.acknowledged_at ? 'GO' : 'NO-GO' }}</b><span>ACK</span></div>
          <div class="lamp" :class="r.incident_commander_id ? 'go' : 'nogo'"><b>{{ r.incident_commander_id ? 'GO' : 'NO-GO' }}</b><span>CMDR</span></div>
          <div class="lamp" :class="r.comms_lead_id ? 'go' : 'nogo'"><b>{{ r.comms_lead_id ? 'GO' : 'NO-GO' }}</b><span>COMMS</span></div>
          <div class="lamp" :class="r.ops_lead_id ? 'go' : 'nogo'"><b>{{ r.ops_lead_id ? 'GO' : 'NO-GO' }}</b><span>OPS</span></div>
          <div class="lamp" :class="cadenceLamp(r)"><b>{{ cadenceLamp(r) === 'go' ? 'GO' : (cadenceLamp(r) === 'nogo' ? 'NO-GO' : 'OFF') }}</b><span>CADENCE</span></div>
        </div>
        <div class="burnseq">
          <span v-for="(p, k) in burnSeq(r)" :key="k" class="bs" :class="p" />
        </div>
        <div class="burn-lbl"><span>START</span><span>DETECT</span><span>DECLARE</span><span>ACK</span><span>MITIGATE</span><span>RESOLVE</span><span>CLOSE</span></div>
        <div class="telem">
          <span v-if="r.affected_users != null">USERS <b>{{ compact(r.affected_users) }}</b></span>
          <span v-if="r.revenue_impact">REV <b>{{ r.revenue_impact }}</b></span>
          <span v-if="r.child_count">CHILDREN <b>{{ r.child_count }}</b></span>
          <span v-if="sitreps[r.id]">SUBS <b>{{ sitreps[r.id].watchers_total }}</b></span>
          <span v-if="sitreps[r.id]">DECISIONS <b>{{ sitreps[r.id].decisions?.count || 0 }}</b></span>
          <span v-if="exposure(r)" class="a">⚑ {{ exposure(r) }}</span>
          <span v-if="!r.has_pir && isTerminal(r)" class="r">PIR NOT OPENED</span>
          <span v-else-if="r.pir_status" class="a">PIR {{ r.pir_status.toUpperCase() }}</span>
        </div>
        <div class="keys">
          <!-- owner-tier verbs (canCommand) — hidden for a plain teammate so they never
               click through to a 403; War Room / Sitrep / Open stay open to all in scope. -->
          <template v-if="canCommandRow(r)">
            <button v-if="!r.acknowledged_at" class="key p" @click="doAck(r)">ACK</button>
            <button class="key" :class="{ p: r.acknowledged_at }" @click="updateTarget = r">UPDATE</button>
            <button class="key" @click="decisionTarget = r">DECISION</button>
            <button class="key" @click="rolesTarget = r">ROSTER</button>
            <button class="key" @click="impactTarget = r">IMPACT</button>
            <button class="key" @click="linkTarget = r">LINK</button>
          </template>
          <button class="key" @click="openWar(r)">WAR ROOM</button>
          <button class="key" :disabled="pdfBusy === r.id" @click="downloadSitrep(r)">{{ pdfBusy === r.id ? '…' : 'SITREP' }}</button>
          <button v-if="canCommandRow(r)" class="key hot" @click="openManage(r)">STAND DOWN</button>
          <button class="key" @click="$emit('open', r.id)">OPEN</button>
        </div>
      </Motion>

      <!-- candidate consoles (on the pad) -->
      <Motion v-for="(r, i) in candidates" :key="r.id" as="section" class="console hold"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.7, delay: (pagedConsoles.length + i) * 0.14, ease: [0.16, 1, 0.3, 1] }">
        <div class="c-head"><span class="c-num">{{ r.ticket_number }}</span><span class="c-mission">ON THE PAD · MI CANDIDATE</span></div>
        <div class="c-subj" :title="r.subject">{{ r.subject }}</div>
        <div class="t-clock"><span class="tt hold-t">HOLD</span><b class="hold-b">{{ sinceClock(r.mi_proposed_at) }}</b></div>
        <div class="t-sub">PROPOSED BY {{ (r.mi_proposed_by_name || 'A TEAMMATE').toUpperCase() }} · {{ hhmm(r.mi_proposed_at) }}
          <template v-if="r.business_impact"> · IMPACT {{ r.business_impact.toUpperCase() }}</template></div>
        <div class="clearance">“{{ r.mi_proposal_note }}”</div>
        <div class="await"><i />AWAITING LAUNCH CLEARANCE — TEAM LEAD / ADMIN</div>
        <div class="lamps" style="margin-top: 14px">
          <div class="lamp holdl"><b>ARM</b><span>CADENCE</span></div>
          <div class="lamp holdl"><b>ARM</b><span>WAR ROOM</span></div>
          <div class="lamp"><b>—</b><span>CMDR</span></div>
          <div class="lamp"><b>—</b><span>COMMS</span></div>
          <div class="lamp"><b>—</b><span>OPS</span></div>
        </div>
        <div class="keys">
          <button v-if="canRule" class="key go" @click="openManage(r)">CLEAR TO LAUNCH</button>
          <button class="key" @click="$emit('open', r.id)">OPEN TICKET</button>
          <button v-if="canWithdraw(r)" class="key hot" :disabled="busyId === r.id" @click="doWithdraw(r)">WITHDRAW PROPOSAL</button>
        </div>
      </Motion>
    </div>

    <!-- empty wall -->
    <Motion v-else as="div" class="cw-empty" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6 }">
      <Siren :size="22" />
      <b>NO CONSOLES POWERED — ZERO MAJORS BURNING</b>
      <span>The range board below watches every SEV2 that could become one. Propose the first candidate when a signal grows.</span>
      <button class="key p big" @click="openPropose()">⚑ {{ canRule ? 'DECLARE / PROPOSE MAJOR' : 'PROPOSE MAJOR' }}</button>
    </Motion>

    <SdIncPager v-if="consolePages > 1" :page="page" :total="liveRows.length" :limit="PER_PAGE"
      @update:page="page = $event" />

    <!-- ═══ range board ═══ -->
    <section class="range">
      <h3>THE RANGE — SEV2 · ONE STEP FROM A CONSOLE <span class="n">{{ rangeRows.length }}</span></h3>
      <div v-if="rangeRows.length" class="range-strip">
        <div v-for="r in rangeRows.slice(0, 8)" :key="r.id" class="blip" @click="$emit('open', r.id)">
          <div class="b1">
            <span class="dot" :class="{ m: !rangeHot(r) }" /><span class="num">{{ r.ticket_number }}</span>
            <button class="prop" @click.stop="openPropose(r)">⚑ {{ canRule ? 'DECLARE' : 'PROPOSE' }}</button>
          </div>
          <div class="b2" :title="r.subject">{{ r.subject }}</div>
          <div class="b3">
            <span v-if="!r.acknowledged_at" class="r">UNACKED {{ sinceShort(r.created_at) }}</span>
            <span v-else>ACKED</span>
            <template v-if="!r.assigned_agent_id"> · <span class="r">NO OWNER</span></template>
            <template v-if="r.sla_resolution_breached"> · <span class="r">BREACHED</span></template>
            <template v-if="r.category_name"> · {{ r.category_name }}</template>
          </div>
        </div>
        <div class="blip more" @click="goTab('critical')"><div class="b3">ALL {{ rangeRows.length }} →<br>CRITICAL DESK</div></div>
      </div>
      <div v-else class="range-empty">RANGE CLEAR — NO LIVE SEV2 CRITICALS ON YOUR SEAL</div>
    </section>

    <!-- ═══ splashdown log + my actions ═══ -->
    <div class="cw-lower">
      <section class="log">
        <h3>SPLASHDOWN LOG — LANDED 7D <span class="n">{{ landed.length }}</span></h3>
        <div v-if="landed.length">
          <div v-for="r in landed.slice(0, 5)" :key="r.id" class="lrow" @click="$emit('open', r.id)">
            <span class="st" :class="{ debt: !r.has_pir }" />
            <b :title="r.subject">{{ r.subject }}</b>
            <span class="meta">{{ r.ticket_number }} · {{ durLabel(r) }} ·
              <span v-if="!r.has_pir" class="r">PIR OWED</span>
              <span v-else class="g">PIR {{ (r.pir_status || '').toUpperCase() }}</span>
            </span>
            <button v-if="!r.has_pir" class="key mini" @click.stop="goTab('post-incident')">DRAFT PIR</button>
          </div>
        </div>
        <div v-else class="range-empty">NOTHING LANDED THIS WEEK</div>
      </section>
      <section class="acts">
        <h3>MY ACTION ITEMS <span class="n" :class="{ r: myOverdue > 0 }">{{ myActions.length }}<template v-if="myOverdue"> · {{ myOverdue }} OVER</template></span></h3>
        <div v-if="myActions.length">
          <div v-for="a in myActions" :key="a.pir_id + a.kind + a.index" class="arow">
            <span v-if="actionReady(a)" class="cb" :title="'Mark done — ' + a.report_number" @click="doneAction(a)" />
            <span v-else class="cb lock"
              :title="`Closeable once the report is approved (currently ${(a.pir_status || 'draft')})`" />
            <span class="atxt" :title="a.action">{{ a.action }}</span>
            <span v-if="a.overdue" class="ov">OVERDUE</span>
            <span v-else-if="a.target_date" class="du">{{ dueLabel(a.target_date) }}</span>
          </div>
        </div>
        <div v-else class="range-empty">NO OPEN ACTIONS ON YOUR NAME</div>
      </section>
    </div>

    <div class="cw-foot">
      <span>TEAM-SEALED · POLL 60S · ?FOCUS= DEEP LINK</span>
      <span v-if="stats">
        MTTD {{ minLabel(stats.mttd_minutes_30d) }} · DETECT→ACK {{ minLabel(stats.phase_minutes_30d?.detect_to_ack) }} ·
        ACK→RESOLVE {{ minLabel(stats.phase_minutes_30d?.ack_to_resolve) }}
        <template v-if="stats.mttr_trend_pct != null"> ({{ stats.mttr_trend_pct > 0 ? '▲' : '▼' }}{{ Math.abs(stats.mttr_trend_pct) }}%)</template>
      </span>
    </div>

    <!-- consoles & modals -->
    <SdWarRoomConsole :open="!!warTarget" :ticket="warTarget" :agent="true" :me="me" :now="now" :viewers="viewers"
      @close="warTarget = null" @changed="onChanged" @open-ticket="(id) => $emit('open', id)" @declare="(t) => openManage(t)" />
    <!-- :z=5300 — co-rendered with SdWarRoomConsole (z5200): the declare ceremony must clear it -->
    <SdMajorIncidentModal :open="declareOpen" :ticket="declareTarget" :tickets="declarePool" :agent="true"
      :z="5300" @close="declareOpen = false" @done="onChanged" />
    <SdIncUpdateModal :open="!!updateTarget" :ticket="updateTarget" @close="updateTarget = null" @done="onChanged" />
    <SdIncRolesModal :open="!!rolesTarget" :ticket="rolesTarget" @close="rolesTarget = null" @done="onChanged" />
    <SdIncDecisionModal :open="!!decisionTarget" :ticket="decisionTarget" @close="decisionTarget = null" @done="onChanged" />
    <SdIncImpactModal :open="!!impactTarget" :ticket="impactTarget" @close="impactTarget = null" @done="onChanged" />
    <SdIncLinkModal :open="!!linkTarget" :ticket="linkTarget" @close="linkTarget = null" @done="onChanged" />
  </div>
</template>

<script setup>
/*
  SdIncMajorSection — the AGENT Major desk, "THE COUNTDOWN WALL" (round-3 pick, built 1:1
  to the approved artifact). One LAUNCH CONSOLE per burning major: T+ count-up clock,
  go/no-go lamp board (ACK/CMDR/COMMS/OPS/CADENCE), 7-stage burn sequence (from
  /incidents/{id}/phases via the sitrep), telemetry and console keys. MI candidates hold
  ON THE PAD (propose→confirm workflow) until a lead clears them; the RANGE BOARD watches
  SEV2 criticals one step from major; the SPLASHDOWN LOG carries landed majors + PIR debt;
  MY ACTION ITEMS one-tap-closes PIR follow-ups. Data-rich at ZERO majors by design.
*/
import { ref, computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Siren } from 'lucide-vue-next'
import SdIncPager from '../components/SdIncPager.vue'
import SdWarRoomConsole from '../drawers/SdWarRoomConsole.vue'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import SdIncUpdateModal from '../modals/SdIncUpdateModal.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncDecisionModal from '../modals/SdIncDecisionModal.vue'
import SdIncImpactModal from '../modals/SdIncImpactModal.vue'
import SdIncLinkModal from '../modals/SdIncLinkModal.vue'
import {
  listIncidents, fetchIncidentStats, fetchIncidentSitrep, exportSitrepPdf, listIncidentActions,
  patchPirAction, withdrawMiProposal, ackTicket, ticketPresence, fetchMe,
  fetchCapabilities, useCapabilities,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const caps = useCapabilities()
const base = computed(() => (props.panel === 'employee' ? '/user/support' : '/admin/support-desk'))
const goTab = (tab) => router.push(`${base.value}/incidents/${tab}`)

const PER_PAGE = 6
const rows = ref([])          // lens=major (live + terminal)
const candidates = ref([])    // flag=mi_proposed
const rangeRows = ref([])     // SEV2 criticals, non-MI, non-candidate
const myActions = ref([])
const stats = ref(null)
const sitreps = reactive({})  // id → sitrep (decisions count / watchers / phases)
const me = ref(null)
const viewers = ref([])
const now = ref(Date.now())
const page = ref(1)
const busyId = ref(null)
const pdfBusy = ref(null)
const warTarget = ref(null)
const declareOpen = ref(false)
const declareTarget = ref(null)
const declarePool = ref([])
const updateTarget = ref(null)
const rolesTarget = ref(null)
const decisionTarget = ref(null)
const impactTarget = ref(null)
const linkTarget = ref(null)
let tick = null
let poll = null
let heartbeat = null

const TERMINAL = new Set(['resolved', 'closed'])
const isTerminal = (r) => TERMINAL.has(r.status)
const liveRows = computed(() => rows.value.filter(r => !isTerminal(r)))
const landed = computed(() => rows.value.filter(r => isTerminal(r)
  && (r.resolved_at || r.closed_at)
  && (now.value - new Date(r.resolved_at || r.closed_at).getTime()) < 7 * 864e5))
const consolePages = computed(() => Math.max(1, Math.ceil(liveRows.value.length / PER_PAGE)))
const pagedConsoles = computed(() => liveRows.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch(consolePages, (p) => { if (page.value > p) page.value = p })

const canRule = computed(() => caps.isAdmin || caps.leadTeamIds.length > 0)
const canWithdraw = (r) => caps.isAdmin || (me.value && String(r.mi_proposed_by_id) === String(me.value.id))
/* OWNER-TIER gate — mirrors the backend _require_ticket_actor so we never show a console
   verb that would 403 on click (ack/update/decision/roster/impact/link/stand-down are all
   owner-tier). Same shape as the L2/L3 boards' canCommandRow: assignee ∪ named collaborator
   ∪ owning-team lead ∪ admin ∪ unassigned triage. The rarer swarm-participant + manager
   cases still act through OPEN → the drawer, which gates them exactly. Read verbs
   (War Room / Sitrep / Open) stay open to everyone in scope. */
const canCommandRow = (r) => {
  if (!r) return false
  if (caps.isAdmin) return true
  const my = String(me.value?.id || '')
  if (!r.assigned_agent_id || String(r.assigned_agent_id) === my) return true
  if ((r.collaborators || []).map(String).includes(my)) return true
  return (caps.leadTeamIds || []).map(String).includes(String(r.team_id))
}

const refresh = async () => {
  try {
    const [mi, cand, crit, st] = await Promise.all([
      listIncidents({ lens: 'major', limit: 100 }),
      listIncidents({ lens: 'active', flag: 'mi_proposed', limit: 50 }),
      // Live SEV2 criticals only — sealed server-side (live+sev) so terminal/SEV1 rows can't
      // crowd the live watchlist out of the page cap. Candidates on the pad are still filtered.
      listIncidents({ lens: 'critical', live: true, sev: 2, limit: 50 }),
      fetchIncidentStats(),
    ])
    rows.value = mi.items || []
    candidates.value = cand.items || []
    rangeRows.value = (crit.items || []).filter(r => !r.mi_proposed_at)
    stats.value = st
    declarePool.value = rangeRows.value
    // enrich the visible consoles with their sitrep (decisions / subscribers / phases)
    for (const r of liveRows.value.slice(0, PER_PAGE * 2)) {
      fetchIncidentSitrep(r.id).then(s => { sitreps[r.id] = s }).catch(() => {})
    }
    if (me.value) {
      listIncidentActions({ status: 'open', owner_id: me.value.id, limit: 5 })
        .then(a => { myActions.value = a.items || [] }).catch(() => {})
    }
  } catch { /* keep last good */ }
}
const onChanged = () => { declareOpen.value = false; refresh() }

/* ── clocks & labels ── */
const pad = (n) => String(n).padStart(2, '0')
const fmtHMS = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}
const runClock = (r) => fmtHMS(now.value - new Date(r.incident_detected_at || r.created_at).getTime())
const sinceClock = (ts) => (ts ? fmtHMS(now.value - new Date(ts).getTime()) : '—')
const shortMin = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`
}
const sinceShort = (ts) => shortMin(now.value - new Date(ts).getTime())
const untilShort = (ts) => shortMin(new Date(ts).getTime() - now.value)
const hhmm = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')
const updOverdue = (r) => r.next_update_due_at && new Date(r.next_update_due_at).getTime() < now.value
const cadenceLamp = (r) => (!r.update_interval_minutes ? '' : (updOverdue(r) ? 'nogo' : 'go'))
const shortName = (n) => { const p = String(n || '').split(/\s+/); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : (n || '') }
const compact = (n) => (n >= 1000 ? `~${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)
const exposure = (r) => [r.public_impact && 'PUBLIC', r.compliance_impact && 'COMPLIANCE', r.security_impact && 'SECURITY'].filter(Boolean).join(' · ')
const minLabel = (m) => (m == null ? '—' : (m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`))
const mttrLabel = computed(() => minLabel(stats.value?.mttr_minutes_current_month))
const durLabel = (r) => {
  const a = new Date(r.incident_detected_at || r.created_at).getTime()
  const b = new Date(r.resolved_at || r.closed_at).getTime()
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? shortMin(b - a) : '—'
}
const dueLabel = (d) => `DUE ${new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}`
const consolePhase = (r) => {
  const s = sitreps[r.id]
  const lit = s?.phases ? s.phases.filter(p => p.at).map(p => p.key) : null
  if (lit?.includes('first_mitigation')) return 'MITIGATING'
  if (lit?.includes('acknowledged') || r.acknowledged_at) return r.next_update_due_at ? 'MITIGATING' : 'STAFFED'
  return 'STAFFING'
}
const rangeHot = (r) => !r.acknowledged_at || !r.assigned_agent_id || r.sla_resolution_breached
// PIR action status is only mutable once the report is approved/published (backend 409s
// on draft/in-review) — gate the tick so it never clicks through to that error.
const actionReady = (a) => a.pir_status === 'approved' || a.pir_status === 'published'

/* burn sequence: 7 cells — f = lit, ign = current, '' = dark */
const PHASE_ORDER = ['started', 'detected', 'declared', 'acknowledged', 'first_mitigation', 'resolved', 'closed']
const burnSeq = (r) => {
  const s = sitreps[r.id]
  let litKeys
  if (s?.phases) litKeys = new Set(s.phases.filter(p => p.at).map(p => p.key))
  else {
    litKeys = new Set(['detected', 'declared'])
    if (r.incident_started_at) litKeys.add('started')
    if (r.acknowledged_at) litKeys.add('acknowledged')
    if (r.resolved_at) litKeys.add('resolved')
    if (r.closed_at) litKeys.add('closed')
  }
  const out = PHASE_ORDER.map(k => (litKeys.has(k) ? 'f' : ''))
  const ign = out.indexOf('')
  if (ign !== -1 && !isTerminal(r)) out[ign] = 'ign'
  return out
}

/* ── verbs ── */
const doAck = async (r) => {
  try { await ackTicket(r.id, {}); toast.success(`${r.ticket_number} acknowledged — MTTA clock stopped`); refresh() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge') }
}
const doWithdraw = async (r) => {
  busyId.value = r.id
  try { await withdrawMiProposal(r.id); toast.success('Candidate withdrawn — back off the pad'); refresh() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not withdraw') }
  finally { busyId.value = null }
}
const doneAction = async (a) => {
  try {
    await patchPirAction(a.pir_id, a.kind, a.index, { status: 'done', aid: a.aid })
    toast.success(`Action closed on ${a.report_number}`)
    myActions.value = myActions.value.filter(x => !(x.pir_id === a.pir_id && x.kind === a.kind && x.index === a.index))
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not close the action') }
}
const downloadSitrep = async (r) => {
  pdfBusy.value = r.id
  try {
    const blob = await exportSitrepPdf(r.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `SITREP-${r.ticket_number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine offline on the backend host' : 'Could not export the sitrep') }
  finally { pdfBusy.value = null }
}
const openManage = (r) => { declareTarget.value = r; declareOpen.value = true }
const openPropose = (r = null) => { declareTarget.value = r; declareOpen.value = true }
const openWar = (r) => { warTarget.value = r }

/* presence heartbeat while the war room is open (viewer collision) */
watch(warTarget, (t) => {
  clearInterval(heartbeat); heartbeat = null; viewers.value = []
  if (!t) return
  const beat = async () => { try { viewers.value = (await ticketPresence(t.id))?.viewers || [] } catch {} }
  beat(); heartbeat = setInterval(beat, 25000)
})

onMounted(async () => {
  fetchCapabilities()
  me.value = await fetchMe()
  await refresh()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(refresh, 60000)
  const focus = route.query.focus
  if (focus) {
    const t = rows.value.find(r => String(r.id) === String(focus))
    if (t) warTarget.value = t
    router.replace({ query: { ...route.query, focus: undefined } })
  }
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(poll); clearInterval(heartbeat) })
</script>

<style scoped>
/* ═══════════ THE COUNTDOWN WALL — agent Major desk (--sd-inc-* family) ═══════════ */
.cwl { position: relative; display: flex; flex-direction: column; gap: 0; }

/* hero */
.cw-top { display: flex; align-items: flex-end; gap: 40px; flex-wrap: wrap; }
.cw-eyebrow { display: flex; align-items: center; gap: 12px; color: var(--sd-text-dim);
  font-family: var(--sd-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.34em; }
.cw-eyebrow::after { content: ""; height: 1px; width: 110px; background: linear-gradient(90deg, var(--sd-inc-brd), transparent); }
.cw-h1 { margin-top: 12px; font-size: clamp(30px, 3.8vw, 50px); font-weight: 215; letter-spacing: -0.018em; line-height: 1.06; color: var(--sd-text); }
.cw-h1 em { font-style: normal; font-weight: 530;
  background: linear-gradient(92deg, var(--sd-inc-hi), var(--sd-inc-core));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.cw-sub { color: var(--sd-text-secondary); margin-top: 8px; max-width: 640px; font-size: 14px; }
.cw-census { margin-left: auto; display: flex; gap: 24px; text-align: right; }
.cs b { display: block; font-family: var(--sd-mono); font-size: 32px; font-weight: 250; line-height: 1; color: var(--sd-text); }
.cs.red b { color: var(--sd-inc-arc); } .cs.gold b { color: var(--sd-inc-core); }
.cs.grn b { color: var(--sd-inc-live); } .cs.warn b { color: var(--sd-inc-warn); }
.cs span { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.cs i { display: block; height: 2px; margin-top: 7px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--sd-inc-core)); animation: cw-meter 3s ease-in-out infinite alternate; }
@keyframes cw-meter { from { transform: scaleX(0.5); } to { transform: scaleX(1); } }

/* console wall */
.cw-wall { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 28px; align-items: stretch; }
@media (max-width: 1400px) { .cw-wall { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 940px) { .cw-wall { grid-template-columns: 1fr; } }
.console { position: relative; border: 1px solid var(--sd-inc-brd); border-radius: 22px;
  background: color-mix(in srgb, var(--sd-surface) 88%, var(--sd-inc-core) 4%);
  backdrop-filter: blur(16px); padding: 20px 22px 18px; overflow: hidden; }
.console::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--sd-inc-core), transparent); opacity: 0.7; }
.console::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--sd-inc-core) 4%, transparent) 50%, transparent 100%);
  background-size: 100% 260px; animation: cw-scan 7s linear infinite; }
@keyframes cw-scan { to { background-position: 0 260px; } }
.console.hold { border-color: color-mix(in srgb, var(--sd-inc-warn) 42%, transparent); border-style: dashed; }
.console.hold::before { background: linear-gradient(90deg, transparent, var(--sd-inc-warn), transparent); }
.c-head { display: flex; align-items: center; gap: 10px; }
.c-num { font-family: var(--sd-mono); font-size: 13px; font-weight: 700; color: var(--sd-inc-core); letter-spacing: 0.04em; }
.console.hold .c-num { color: var(--sd-inc-warn); }
.c-mission { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.22em; color: var(--sd-text-dim); margin-left: auto; }
.c-subj { margin-top: 8px; font-size: 15.5px; font-weight: 590; line-height: 1.3; min-height: 40px; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.t-clock { margin-top: 14px; display: flex; align-items: baseline; gap: 10px; }
.t-clock .tt { font-family: var(--sd-mono); font-size: 12px; font-weight: 700; color: var(--sd-inc-arc); letter-spacing: 0.1em; }
.t-clock .tt.hold-t { color: var(--sd-inc-warn); }
.t-clock b { font-family: var(--sd-mono); font-size: 40px; font-weight: 250; line-height: 1; letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums; color: var(--sd-text);
  text-shadow: 0 0 26px color-mix(in srgb, var(--sd-inc-core) 34%, transparent); }
.t-clock b.hold-b { color: var(--sd-inc-warn); }
.t-sub { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 500; letter-spacing: 0.14em; color: var(--sd-text-dim); margin-top: 5px; }
.t-sub .r { color: var(--sd-inc-arc); } .t-sub .a { color: var(--sd-inc-warn); }

.lamps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-top: 16px; }
.lamp { border: 1px solid var(--sd-inc-brd); border-radius: 9px; padding: 8px 4px 7px; text-align: center;
  background: color-mix(in srgb, var(--sd-inc-core) 6%, transparent); transition: all 0.3s; }
.lamp b { display: block; font-family: var(--sd-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-text-dim); }
.lamp span { display: block; font-family: var(--sd-mono); font-size: 6.5px; font-weight: 600; letter-spacing: 0.14em; color: var(--sd-text-dim); margin-top: 4px; }
.lamp.go { background: color-mix(in srgb, var(--sd-inc-live) 13%, transparent); border-color: color-mix(in srgb, var(--sd-inc-live) 38%, transparent); }
.lamp.go b { color: var(--sd-inc-live); }
.lamp.nogo { background: color-mix(in srgb, var(--sd-inc-arc) 13%, transparent); border-color: color-mix(in srgb, var(--sd-inc-arc) 42%, transparent); animation: cw-blink 1.4s infinite; }
.lamp.nogo b { color: var(--sd-inc-arc); }
.lamp.holdl { background: color-mix(in srgb, var(--sd-inc-warn) 12%, transparent); border-color: color-mix(in srgb, var(--sd-inc-warn) 40%, transparent); }
.lamp.holdl b { color: var(--sd-inc-warn); }
@keyframes cw-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.burnseq { margin-top: 16px; display: flex; gap: 4px; align-items: center; }
.bs { flex: 1; height: 5px; border-radius: 5px; background: var(--sd-inc-brd); position: relative; overflow: hidden; }
.bs.f::after { content: ""; position: absolute; inset: 0; background: var(--sd-inc-core); border-radius: 5px; }
.bs.ign::after { content: ""; position: absolute; inset: 0; width: 56%; border-radius: 5px;
  background: linear-gradient(90deg, var(--sd-inc-core), var(--sd-inc-hi)); animation: cw-ign 1.9s ease-in-out infinite alternate; }
@keyframes cw-ign { from { width: 38%; } to { width: 70%; } }
.burn-lbl { display: flex; justify-content: space-between; font-family: var(--sd-mono); font-size: 7px; font-weight: 600; letter-spacing: 0.1em; color: var(--sd-text-dim); margin-top: 6px; }

.telem { display: flex; gap: 14px; margin-top: 14px; font-family: var(--sd-mono); font-size: 10px; font-weight: 500;
  letter-spacing: 0.06em; color: var(--sd-text-dim); flex-wrap: wrap; }
.telem b { color: var(--sd-text); font-weight: 620; } .telem .r { color: var(--sd-inc-arc); } .telem .a { color: var(--sd-inc-warn); }

.keys { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px; border-top: 1px dashed var(--sd-inc-brd); padding-top: 13px; }
.key { border: 1px solid var(--sd-inc-brd); border-bottom-width: 3px; background: none; color: var(--sd-text-muted);
  font-family: var(--sd-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.1em; padding: 9px 11px; border-radius: 9px;
  cursor: pointer; transition: all 0.15s; }
.key:hover { color: var(--sd-text); border-color: color-mix(in srgb, var(--sd-inc-core) 55%, transparent);
  background: color-mix(in srgb, var(--sd-inc-core) 12%, transparent); }
.key:active { transform: translateY(2px); border-bottom-width: 1px; }
.key.p { background: color-mix(in srgb, var(--sd-inc-core) 18%, transparent); color: var(--sd-text); }
.key.go { background: color-mix(in srgb, var(--sd-inc-live) 16%, transparent); color: var(--sd-inc-live);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.key.hot:hover { color: var(--sd-inc-arc); border-color: color-mix(in srgb, var(--sd-inc-arc) 50%, transparent);
  background: color-mix(in srgb, var(--sd-inc-arc) 10%, transparent); }
.key.mini { padding: 6px 9px; font-size: 8.5px; border-bottom-width: 1px; margin-left: auto; flex-shrink: 0; }
.key.big { padding: 12px 22px; font-size: 11px; }
.key:disabled { opacity: 0.5; cursor: wait; }

.clearance { margin-top: 14px; border: 1px dashed color-mix(in srgb, var(--sd-inc-warn) 40%, transparent); border-radius: 12px;
  padding: 11px 13px; font-size: 12px; color: var(--sd-text-secondary); font-style: italic; line-height: 1.55; }
.await { margin-top: 12px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--sd-inc-warn); display: flex; align-items: center; gap: 8px; }
.await i { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-inc-warn); animation: cw-blink 1.2s infinite; }

/* empty wall */
.cw-empty { margin-top: 28px; border: 1px dashed var(--sd-inc-brd); border-radius: 22px; padding: 44px 30px;
  display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: var(--sd-inc-core); }
.cw-empty b { font-family: var(--sd-mono); font-size: 12px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-text); }
.cw-empty span { font-size: 13px; color: var(--sd-text-secondary); max-width: 520px; }

/* range board */
.range { margin-top: 22px; border: 1px solid var(--sd-inc-brd); border-radius: 20px;
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent); padding: 16px 22px; }
.range h3, .log h3, .acts h3 { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.3em;
  color: var(--sd-text-dim); display: flex; gap: 10px; align-items: center; }
.range h3 .n { margin-left: auto; font-size: 17px; font-weight: 300; color: var(--sd-inc-arc); }
.range-strip { display: flex; gap: 12px; margin-top: 14px; overflow-x: auto; padding-bottom: 6px; }
.blip { flex: 0 0 auto; min-width: 250px; max-width: 290px; border: 1px solid var(--sd-inc-brd); border-radius: 13px; padding: 11px 14px;
  background: color-mix(in srgb, var(--sd-surface) 90%, var(--sd-inc-core) 3%); display: flex; flex-direction: column; gap: 7px;
  transition: all 0.25s; cursor: pointer; }
.blip:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--sd-inc-core) 45%, transparent); }
.blip.more { align-items: center; justify-content: center; min-width: 140px; border-style: dashed; }
.blip.more .b3 { text-align: center; line-height: 1.8; }
.b1 { display: flex; gap: 8px; align-items: center; font-family: var(--sd-mono); font-size: 10.5px; font-weight: 600; }
.b1 .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-inc-arc); animation: cw-blink 1.8s infinite; }
.b1 .dot.m { background: var(--sd-inc-warn); animation-duration: 2.8s; }
.b1 .num { color: var(--sd-inc-core); }
.b1 .prop { margin-left: auto; border: 1px solid var(--sd-inc-brd); background: none; color: var(--sd-text-muted);
  font-family: var(--sd-mono); font-size: 8px; font-weight: 700; letter-spacing: 0.1em; padding: 6px 8px; border-radius: 7px;
  cursor: pointer; transition: all 0.2s; }
.b1 .prop:hover { color: var(--sd-inc-warn); border-color: color-mix(in srgb, var(--sd-inc-warn) 50%, transparent); }
.b2 { font-size: 12px; font-weight: 560; line-height: 1.3; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.b3 { font-family: var(--sd-mono); font-size: 9px; font-weight: 500; letter-spacing: 0.08em; color: var(--sd-text-dim); }
.b3 .r { color: var(--sd-inc-arc); }
.range-empty { margin-top: 14px; font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.18em; color: var(--sd-text-dim);
  text-align: center; padding: 14px 0 6px; }

/* splashdown + actions */
.cw-lower { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin-top: 22px; }
@media (max-width: 1000px) { .cw-lower { grid-template-columns: 1fr; } }
.log, .acts { border: 1px solid var(--sd-inc-brd); border-radius: 20px;
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent); padding: 16px 22px; }
.log h3, .acts h3 { padding-bottom: 12px; border-bottom: 1px solid var(--sd-inc-brd); }
.log h3 .n { margin-left: auto; font-size: 17px; font-weight: 300; color: var(--sd-inc-live); }
.acts h3 .n { margin-left: auto; font-size: 17px; font-weight: 300; color: var(--sd-text-muted); }
.acts h3 .n.r { color: var(--sd-inc-arc); }
.lrow { display: flex; gap: 11px; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--sd-inc-brd);
  font-size: 12.5px; cursor: pointer; }
.lrow:last-child { border-bottom: 0; }
.lrow .st { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-inc-live); flex: 0 0 auto; }
.lrow .st.debt { background: var(--sd-inc-arc); animation: cw-blink 1.8s infinite; }
.lrow b { font-weight: 580; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lrow .meta { margin-left: auto; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 500; letter-spacing: 0.06em;
  color: var(--sd-text-dim); text-align: right; flex-shrink: 0; }
.lrow .meta .r { color: var(--sd-inc-arc); } .lrow .meta .g { color: var(--sd-inc-live); }
.arow { display: flex; gap: 10px; align-items: center; font-size: 12.5px; padding: 9px 0; border-bottom: 1px dashed var(--sd-inc-brd); }
.arow:last-child { border-bottom: 0; }
.cb { width: 16px; height: 16px; border-radius: 5px; border: 1.5px solid color-mix(in srgb, var(--sd-inc-core) 50%, transparent);
  cursor: pointer; flex: 0 0 auto; transition: all 0.2s; }
.cb:hover { background: color-mix(in srgb, var(--sd-inc-core) 24%, transparent); transform: scale(1.12); }
.cb.lock { border-style: dashed; border-color: var(--sd-inc-brd); cursor: not-allowed; opacity: 0.5; }
.cb.lock:hover { background: none; transform: none; }
.atxt { color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.arow .ov { margin-left: auto; font-family: var(--sd-mono); font-size: 8.5px; font-weight: 700; color: var(--sd-inc-arc); letter-spacing: 0.12em; flex-shrink: 0; }
.arow .du { margin-left: auto; font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; color: var(--sd-text-dim); letter-spacing: 0.12em; flex-shrink: 0; }

.cw-foot { margin-top: 24px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap;
  color: var(--sd-text-dim); font-family: var(--sd-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.22em;
  border-top: 1px solid var(--sd-inc-brd); padding-top: 15px; }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .console { background: color-mix(in srgb, #fffcf4 92%, var(--sd-inc-core) 4%); }
[data-theme="light"] .t-clock b { text-shadow: 0 0 20px color-mix(in srgb, var(--sd-inc-core) 22%, transparent); }
[data-theme="light"] .blip { background: color-mix(in srgb, #fffcf4 94%, var(--sd-inc-core) 3%); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .console::after,
  html:not([data-cinematic="on"]) .lamp.nogo,
  html:not([data-cinematic="on"]) .bs.ign::after,
  html:not([data-cinematic="on"]) .cs i,
  html:not([data-cinematic="on"]) .await i,
  html:not([data-cinematic="on"]) .b1 .dot,
  html:not([data-cinematic="on"]) .lrow .st.debt { animation: none; }
}
</style>
