<template>
  <div class="wtb">
    <!-- ═══ hero ═══ -->
    <div class="wt-top">
      <div>
        <div class="wt-eyebrow">MAJOR INCIDENT COMMAND · THE WAR TABLE</div>
        <h1 class="wt-h1">Position is the report. <em>Drift is the story.</em></h1>
        <p class="wt-sub">Every major sits on the table where its state puts it — right means contained, high means wide blast radius.
          Markers drift as phases advance. Candidates wait in the tray until you clear them onto the table.</p>
      </div>
      <div class="wt-census">
        <div class="cs" :class="{ red: live.length > 0 }"><b>{{ live.length }}</b><span>ON TABLE</span></div>
        <div class="cs" :class="{ w: candidates.length > 0 }"><b>{{ candidates.length }}</b><span>IN TRAY</span></div>
        <div class="cs"><b>{{ watchCount }}</b><span>WATCHLIST</span></div>
        <div class="cs org"><b>{{ minLabel(stats?.phase_minutes_30d?.ack_to_resolve) }}</b><span>ACK→RES</span></div>
        <div class="cs" :class="{ red: (stats?.actions_overdue || 0) > 0 }"><b>{{ stats?.actions_overdue || 0 }}</b><span>ACT. OVERDUE</span></div>
      </div>
    </div>

    <div class="wt-wrap">
      <!-- ═══ the table ═══ -->
      <div class="wt-table">
        <div class="tbl-cap">— THE TABLE · POSITION = BLAST RADIUS × CONTAINMENT —</div>
        <svg viewBox="0 0 1000 520" preserveAspectRatio="none">
          <g class="gridl">
            <line x1="60" y1="90" x2="960" y2="90" /><line x1="60" y1="190" x2="960" y2="190" />
            <line x1="60" y1="290" x2="960" y2="290" /><line x1="60" y1="390" x2="960" y2="390" />
            <line x1="60" y1="470" x2="960" y2="470" />
            <line x1="240" y1="60" x2="240" y2="480" /><line x1="420" y1="60" x2="420" y2="480" />
            <line x1="600" y1="60" x2="600" y2="480" /><line x1="780" y1="60" x2="780" y2="480" />
          </g>
        </svg>
        <div class="sweep" />

        <!-- candidates tray -->
        <div v-if="candidates.length" class="tray">
          <h6><i />THE TRAY — MI CANDIDATES · {{ candidates.length }}</h6>
          <template v-for="c in candidates.slice(0, 1)" :key="c.id">
            <div class="tnum">{{ c.ticket_number }} · {{ (c.mi_proposed_by_name || 'AGENT').toUpperCase() }} · {{ hhmm(c.mi_proposed_at) }}</div>
            <div class="tsub" :title="c.subject">{{ c.subject }}</div>
            <div class="tby">“{{ c.mi_proposal_note }}”</div>
            <div class="topts">
              <label><input v-model="armCadence" type="checkbox" />CADENCE 30M</label>
              <label><input v-model="armWarRoom" type="checkbox" />WAR ROOM</label>
            </div>
            <div v-if="decliningId === c.id" class="tdecline">
              <input v-model="declineNote" class="tnote" maxlength="500" placeholder="Why this stays a normal incident (required)…" />
              <div class="tv">
                <button class="tno solid" :disabled="busyId === c.id || declineNote.trim().length < 3" @click="doDecline(c)">SEND DECLINE</button>
                <button class="tno" @click="decliningId = null">BACK</button>
              </div>
            </div>
            <div v-else class="tv">
              <button class="tgo" :disabled="busyId === c.id" @click="doConfirm(c)">✓ TO THE TABLE</button>
              <button class="tno" @click="decliningId = c.id; declineNote = ''">DECLINE</button>
            </div>
            <div v-if="candidates.length > 1" class="tmore">+{{ candidates.length - 1 }} MORE IN THE TRAY</div>
          </template>
        </div>

        <!-- live markers -->
        <div v-for="r in live" :key="r.id" class="mk" :class="{ sel: selected?.id === r.id }"
          :style="{ left: posX(r) + '%', top: posY(r) + '%' }" @click="select(r)">
          <span class="trail" /><span class="dot" />
          <span class="tag">{{ r.ticket_number }}<small>{{ runClock(r) }} · {{ markerPhase(r) }}</small></span>
        </div>
        <!-- landed markers -->
        <div v-for="(r, i) in landed.slice(0, 4)" :key="r.id" class="mk done"
          :style="{ left: (88 + (i % 2) * 4) + '%', top: (72 + i * 7) + '%' }" @click="select(r)">
          <span class="dot" />
          <span v-if="!r.has_pir" class="tag debt">{{ r.ticket_number }}<small>PIR OWED</small></span>
        </div>

        <div class="axis-y"><span>WIDE BLAST</span><span>CONTAINED BLAST</span></div>
        <div class="axis-x"><span>UNCONTAINED</span><span>ACKED</span><span>MITIGATING</span><span>RESOLVING</span><span>LANDED</span></div>
        <div v-if="!live.length && !candidates.length" class="tbl-empty">
          <b>TABLE CLEAR — NO MAJORS DECLARED</b>
          <span>{{ watchCount }} SEV2 criticals sit on the watchlist. Candidates proposed by agents land in the tray here.</span>
        </div>
      </div>

      <!-- ═══ dossier ═══ -->
      <aside class="dossier">
        <div class="ds-cap">DOSSIER — SELECTED MARKER</div>
        <template v-if="selected">
          <div class="ds-num">{{ selected.ticket_number }}<template v-if="selected.incident_commander_name"> · CMDR {{ shortName(selected.incident_commander_name).toUpperCase() }}</template></div>
          <div class="ds-sub">{{ selected.subject }}</div>
          <div class="ds-run">{{ runClock(selected) }}<small>{{ isTerminal(selected) ? 'LANDED' : 'RUNNING' }} · SEV1 MAJOR
            <template v-if="selected.resolution_due_at && !selected.sla_resolution_breached"> · SLA −{{ untilShort(selected.resolution_due_at) }}</template>
            <template v-else-if="selected.sla_resolution_breached"> · SLA BREACHED</template></small></div>
          <div class="ds-ph">
            <i v-for="(p, k) in burnSeq(selected)" :key="k" :class="p" />
          </div>
          <div class="ds-phl"><span>START</span><span>DETECT</span><span>DECLARE</span><span>ACK</span><span>MITIG</span><span>RESOLVE</span><span>CLOSE</span></div>

          <div class="ds-sec">
            <h4>COMMAND & COMMS</h4>
            <div class="ds-line">
              <b>{{ selected.incident_commander_name || '—' }}</b> commander ·
              <b>{{ selected.comms_lead_name || '—' }}</b> comms ·
              <span :class="selected.ops_lead_id ? '' : 'r'">{{ selected.ops_lead_name || 'ops seat open' }}</span>
            </div>
            <div class="ds-line">Cadence <b>{{ selected.update_interval_minutes ? selected.update_interval_minutes + ' min' : 'off' }}</b>
              <template v-if="selected.next_update_due_at"> · next <b :class="{ r: updOverdue(selected) }">{{ updOverdue(selected) ? 'OVERDUE ' + sinceShort(selected.next_update_due_at) : untilShort(selected.next_update_due_at) }}</b></template>
              <template v-if="sitrep"> · <b>{{ sitrep.watchers_total }}</b> subscribers</template></div>
            <div v-if="sitrep?.last_update?.at" class="ds-line">Last: <span class="a">“{{ (sitrep.last_update.preview || '').slice(0, 90) }}”</span> · {{ hhmm(sitrep.last_update.at) }}</div>
          </div>

          <div class="ds-sec">
            <h4>BLAST RADIUS & RECORDS</h4>
            <div class="ds-line">{{ (selected.affected_services || []).join(' · ') || 'services unstamped' }}
              <template v-if="selected.affected_users != null"> · <b>{{ compact(selected.affected_users) }} users</b></template>
              <template v-if="selected.revenue_impact"> · <b>{{ selected.revenue_impact }}</b></template></div>
            <div class="ds-line">
              <span v-if="selected.public_impact" class="a">⚑ PUBLIC </span>
              <span v-if="selected.compliance_impact" class="a">⚑ COMPLIANCE </span>
              <span v-if="selected.security_impact" class="a">⚑ SECURITY </span>
              children <b>{{ selected.child_count || 0 }}</b>
              <template v-if="sitrep"> · decisions <b>{{ sitrep.decisions?.count || 0 }}</b></template>
              · PIR <span :class="selected.has_pir ? 'g' : 'r'">{{ selected.pir_status || 'not opened' }}</span></div>
          </div>

          <div class="ds-verbs">
            <button class="dv p" :disabled="pdfBusy" @click="downloadSitrep(selected)">{{ pdfBusy ? 'EXPORTING…' : '📄 SITREP PDF' }}</button>
            <button v-if="!isTerminal(selected) && selected.assigned_agent_id" class="dv" :disabled="busyId === selected.id" @click="doNudge(selected)">⚡ NUDGE OWNER</button>
            <button v-if="!isTerminal(selected)" class="dv" @click="rolesTarget = selected">ROSTER</button>
            <button v-if="!selected.has_pir && isTerminal(selected)" class="dv" @click="goTab('post-incident')">CHASE PIR</button>
            <button v-if="!isTerminal(selected)" class="dv hot" @click="manageTarget = selected">⏻ STAND DOWN</button>
            <button class="dv" @click="$emit('open', selected.id)">OPEN TICKET</button>
          </div>
        </template>
        <div v-else class="ds-empty">
          <b>NO MARKER SELECTED</b>
          <span>Click a marker on the table — its full dossier, comms state and command verbs land here.</span>
        </div>
      </aside>
    </div>

    <!-- ═══ lower desks ═══ -->
    <div class="wt-desks">
      <section class="desk">
        <h3>FOLLOW-THROUGH — PIR ACTION ITEMS
          <span class="n" :class="{ r: actionCounts.overdue > 0 }">{{ actionCounts.open }}<template v-if="actionCounts.overdue"> · {{ actionCounts.overdue }} OVER</template></span></h3>
        <div v-if="actions.length">
          <div v-for="a in actions" :key="a.pir_id + a.kind + a.index" class="ft" :class="{ g: a.status === 'done' }">
            <span class="burn" :style="{ '--b': a.status === 'done' ? '100%' : (a.overdue ? '94%' : '42%') }" />
            <div class="ft-txt">{{ a.action }}
              <small>{{ a.ticket_number }} · {{ a.kind }} · {{ a.owner_name || 'unowned' }} ·
                <span v-if="a.status === 'done'" class="g">DONE</span>
                <span v-else-if="a.overdue" class="r">OVERDUE</span>
                <template v-else-if="a.target_date">{{ dueLabel(a.target_date) }}</template>
                <template v-else>no target date</template></small></div>
            <button v-if="a.status !== 'done' && actionReady(a)" class="ft-done" @click="doneAction(a)">DONE</button>
            <span v-else-if="a.status !== 'done'" class="ft-lock"
              :title="`Closeable once the post-incident report is approved (currently ${(a.pir_status || 'draft')})`">PIR {{ (a.pir_status || 'draft').toUpperCase() }}</span>
          </div>
        </div>
        <div v-else class="ds-empty pad"><span>No open action items — the last fires paid their debts.</span></div>
      </section>
      <section class="desk">
        <h3>PROGRAM ANALYTICS — 30D</h3>
        <div class="an-strip">
          <div class="an-row"><b>{{ minLabel(stats?.mttd_minutes_30d) }}</b><span>MTTD</span></div>
          <div class="an-row"><b>{{ minLabel(stats?.phase_minutes_30d?.detect_to_ack) }}</b><span>DETECT→ACK</span></div>
          <div class="an-row org"><b>{{ minLabel(stats?.phase_minutes_30d?.ack_to_resolve) }}</b><span>ACK→RESOLVE</span>
            <span v-if="stats?.mttr_trend_pct != null" class="tr" :class="stats.mttr_trend_pct > 0 ? 'up' : 'dn'">
              {{ stats.mttr_trend_pct > 0 ? '▲' : '▼' }}{{ Math.abs(stats.mttr_trend_pct) }}%</span></div>
          <div>
            <div class="bars">
              <i v-for="(d, k) in trend" :key="k" :style="{ '--k': k, height: barH(d) }" :class="{ hot: d.created > d.resolved }" />
            </div>
            <div class="an-cap">MI FLOW / DAY · 14D · RED = CREATED OUTPACED RESOLVED</div>
          </div>
        </div>
      </section>
    </div>

    <div class="wt-foot">
      <span>DESK-WIDE SEAL (SUPERUSER) · POLL 60S · EVERY VERB AUDITED</span>
      <span>MARKERS DRIFT RIGHT AS PHASES ADVANCE · CLICK A MARKER FOR ITS DOSSIER</span>
    </div>

    <!-- modals -->
    <SdMajorIncidentModal :open="!!manageTarget" :ticket="manageTarget" :agent="false"
      @close="manageTarget = null" @done="onChanged" />
    <SdIncRolesModal :open="!!rolesTarget" :ticket="rolesTarget" @close="rolesTarget = null" @done="onChanged" />
  </div>
</template>

<script setup>
/*
  SdIncMajorCommandSection — the ADMIN Major desk, "THE WAR TABLE" (round-3 pick, built
  1:1 to the approved artifact). A strategic FIELD where each major's POSITION is its
  report: X = containment (derived phase progress), Y = blast radius (affected users /
  impact). Markers drift as phases advance; MI candidates wait in THE TRAY until the
  admin clears them onto the table (confirm arms cadence + war room) or declines with a
  note; landed majors cool at the contained edge with their PIR debt. The dossier reads
  the live sitrep; the follow-through desk closes PIR action items; program analytics
  ride the new phase-clock stats. Data-rich at ZERO majors by design.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import {
  listIncidents, fetchIncidentStats, fetchIncidentSitrep, exportSitrepPdf,
  listIncidentActions, patchPirAction, confirmMiProposal, declineMiProposal,
  nudgeTicketOwner,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'new'])

const router = useRouter()
const route = useRoute()
const toast = useToast()
const base = computed(() => (props.panel === 'employee' ? '/user/support' : '/admin/support-desk'))
const goTab = (tab) => router.push(`${base.value}/incidents/${tab}`)

const rows = ref([])
const candidates = ref([])
const watchCount = ref(0)
const stats = ref(null)
const actions = ref([])
const actionCounts = ref({ open: 0, done: 0, overdue: 0 })
const sitrep = ref(null)
const sitrepPhases = ref({})   // id → Set(lit phase keys) for positioning
const selected = ref(null)
const now = ref(Date.now())
const busyId = ref(null)
const pdfBusy = ref(false)
const manageTarget = ref(null)
const rolesTarget = ref(null)
const armCadence = ref(true)
const armWarRoom = ref(true)
const decliningId = ref(null)
const declineNote = ref('')
let tick = null
let poll = null

const TERMINAL = new Set(['resolved', 'closed'])
const isTerminal = (r) => TERMINAL.has(r.status)
const live = computed(() => rows.value.filter(r => !isTerminal(r)))
const landed = computed(() => rows.value.filter(r => isTerminal(r)
  && (r.resolved_at || r.closed_at)
  && (now.value - new Date(r.resolved_at || r.closed_at).getTime()) < 7 * 864e5))

const refresh = async () => {
  try {
    const [mi, cand, crit, st, act] = await Promise.all([
      listIncidents({ lens: 'major', limit: 100 }),
      listIncidents({ lens: 'active', flag: 'mi_proposed', limit: 50 }),
      // Watchlist = LIVE SEV2 criticals only (server-sealed live+sev) — the count that feeds
      // the "SEV2 criticals sit on the watchlist" line. limit:1 because we only read .total.
      listIncidents({ lens: 'critical', live: true, sev: 2, limit: 1, page: 1 }),
      fetchIncidentStats(),
      listIncidentActions({ limit: 6 }),
    ])
    rows.value = mi.items || []
    candidates.value = cand.items || []
    watchCount.value = crit.total || 0
    stats.value = st
    actions.value = act.items || []
    actionCounts.value = act.counts || { open: 0, done: 0, overdue: 0 }
    // phase enrichment for positioning + keep the dossier fresh
    for (const r of live.value.slice(0, 10)) {
      fetchIncidentSitrep(r.id).then(s => {
        sitrepPhases.value = { ...sitrepPhases.value, [r.id]: new Set((s.phases || []).filter(p => p.at).map(p => p.key)) }
        if (selected.value?.id === r.id) sitrep.value = s
      }).catch(() => {})
    }
    if (selected.value) {
      const still = rows.value.find(r => r.id === selected.value.id)
      selected.value = still || null
      if (!still) sitrep.value = null
    }
    if (!selected.value && live.value.length) select(live.value[0])
  } catch { /* keep last good */ }
}
const onChanged = () => { manageTarget.value = null; refresh() }

const select = (r) => {
  selected.value = r
  sitrep.value = null
  fetchIncidentSitrep(r.id).then(s => { if (selected.value?.id === r.id) sitrep.value = s }).catch(() => {})
}

/* ── table geometry: X = containment, Y = blast ── */
const PHASE_ORDER = ['started', 'detected', 'declared', 'acknowledged', 'first_mitigation', 'resolved', 'closed']
const litSet = (r) => {
  const s = sitrepPhases.value[r.id]
  if (s) return s
  const lit = new Set(['detected', 'declared'])
  if (r.incident_started_at) lit.add('started')
  if (r.acknowledged_at) lit.add('acknowledged')
  if (r.resolved_at) lit.add('resolved')
  if (r.closed_at) lit.add('closed')
  return lit
}
const containment = (r) => {
  const lit = litSet(r)
  // uncontained 0 → acked 0.3 → mitigating 0.55 → resolving 0.8 → landed 1
  if (lit.has('closed') || lit.has('resolved')) return 1
  if (lit.has('first_mitigation')) return r.next_update_due_at && !updOverdue(r) ? 0.62 : 0.5
  if (lit.has('acknowledged')) return 0.32
  return 0.08
}
const posX = (r) => 10 + containment(r) * 76
const posY = (r) => {
  const u = r.affected_users
  if (u == null || u <= 0) {
    const rank = { critical: 30, high: 44, medium: 58, low: 68 }[r.business_impact] ?? 56
    return rank
  }
  // log scale: 10 users → 78%, 100k users → 16%
  const t = Math.min(1, Math.max(0, (Math.log10(u) - 1) / 4))
  return 78 - t * 62
}
const markerPhase = (r) => {
  const lit = litSet(r)
  if (lit.has('first_mitigation')) return updOverdue(r) ? 'UPDATE OVERDUE' : 'MITIGATING'
  if (lit.has('acknowledged')) return 'STAFFED'
  return 'UNCONTAINED'
}
const burnSeq = (r) => {
  const lit = litSet(r)
  const out = PHASE_ORDER.map(k => (lit.has(k) ? 'f' : ''))
  const ign = out.indexOf('')
  if (ign !== -1 && !isTerminal(r)) out[ign] = 'h'
  return out
}

/* ── clocks & labels ── */
const pad = (n) => String(n).padStart(2, '0')
const fmtHMS = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` }
const runClock = (r) => (isTerminal(r)
  ? shortMin(new Date(r.resolved_at || r.closed_at).getTime() - new Date(r.incident_detected_at || r.created_at).getTime())
  : fmtHMS(now.value - new Date(r.incident_detected_at || r.created_at).getTime()))
const shortMin = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m` }
const sinceShort = (ts) => shortMin(now.value - new Date(ts).getTime())
const untilShort = (ts) => shortMin(new Date(ts).getTime() - now.value)
const hhmm = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')
const updOverdue = (r) => r.next_update_due_at && new Date(r.next_update_due_at).getTime() < now.value
const shortName = (n) => { const p = String(n || '').split(/\s+/); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : (n || '') }
const compact = (n) => (n >= 1000 ? `~${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)
const minLabel = (m) => (m == null ? '—' : (m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`))
const dueLabel = (d) => `DUE ${new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}`
// A PIR action's status can only be moved once its report is approved/published — the
// document stays sealed while draft/in-review (backend 409s). Gate the DONE verb so we
// never click through to that error.
const actionReady = (a) => a.pir_status === 'approved' || a.pir_status === 'published'
const trend = computed(() => stats.value?.trend_14d || [])
const barH = (d) => {
  const max = Math.max(1, ...trend.value.map(x => Math.max(x.created, x.resolved)))
  return `${Math.max(8, Math.round((Math.max(d.created, d.resolved) / max) * 100))}%`
}

/* ── authority verbs ── */
const doConfirm = async (c) => {
  busyId.value = c.id
  try {
    const r = await confirmMiProposal(c.id, {
      update_interval_minutes: armCadence.value ? 30 : null,
      open_war_room: armWarRoom.value,
    })
    toast.success(`${c.ticket_number} confirmed — on the table${r.war_room_url ? ', war room open' : ''}`)
    refresh()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not confirm the candidate') }
  finally { busyId.value = null }
}
const doDecline = async (c) => {
  busyId.value = c.id
  try {
    await declineMiProposal(c.id, { note: declineNote.value.trim() })
    toast.success(`${c.ticket_number} declined — the proposer has your note`)
    decliningId.value = null
    refresh()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not decline') }
  finally { busyId.value = null }
}
const doNudge = async (r) => {
  busyId.value = r.id
  try { await nudgeTicketOwner(r.id); toast.success(`Owner nudged on ${r.ticket_number}`) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Nudge throttled or refused') }
  finally { busyId.value = null }
}
const doneAction = async (a) => {
  try {
    // aid is the authoritative address (survives draft-era reorders); index is the fallback.
    await patchPirAction(a.pir_id, a.kind, a.index, { status: 'done', aid: a.aid })
    toast.success(`Action closed on ${a.report_number}`)
    refresh()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not close the action') }
}
const downloadSitrep = async (r) => {
  pdfBusy.value = true
  try {
    const blob = await exportSitrepPdf(r.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `SITREP-${r.ticket_number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine offline on the backend host' : 'Could not export the sitrep') }
  finally { pdfBusy.value = false }
}

onMounted(async () => {
  await refresh()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(refresh, 60000)
  // ?focus=<ticket_id> — deep-link a marker into the dossier (parity with the agent wall)
  const focus = route.query.focus
  if (focus) {
    const t = rows.value.find(r => String(r.id) === String(focus))
    if (t) select(t)
    router.replace({ query: { ...route.query, focus: undefined } })
  }
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(poll) })
</script>

<style scoped>
/* ═══════════ THE WAR TABLE — admin Major desk (--sd-fun-* family) ═══════════ */
.wtb { display: flex; flex-direction: column; }

/* hero */
.wt-top { display: flex; align-items: flex-end; gap: 40px; flex-wrap: wrap; }
.wt-eyebrow { display: flex; align-items: center; gap: 12px; color: var(--sd-text-dim);
  font-family: var(--sd-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.34em; }
.wt-eyebrow::after { content: ""; height: 1px; width: 120px; background: linear-gradient(90deg, var(--sd-fun-brd), transparent); }
.wt-h1 { margin-top: 12px; font-size: clamp(30px, 3.8vw, 48px); font-weight: 215; letter-spacing: -0.018em; line-height: 1.06; color: var(--sd-text); }
.wt-h1 em { font-style: normal; font-weight: 530;
  background: linear-gradient(92deg, var(--sd-fun-hi), var(--sd-fun-core));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.wt-sub { color: var(--sd-text-secondary); margin-top: 8px; max-width: 640px; font-size: 14px; }
.wt-census { margin-left: auto; display: flex; gap: 24px; text-align: right; }
.cs b { display: block; font-family: var(--sd-mono); font-size: 32px; font-weight: 250; line-height: 1; color: var(--sd-text); }
.cs.red b { color: var(--sd-fun-esc); } .cs.org b { color: var(--sd-fun-core); } .cs.w b { color: var(--sd-warning); }
.cs span { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.2em; color: var(--sd-text-dim); }

/* the table */
.wt-wrap { display: grid; grid-template-columns: 1fr 390px; gap: 20px; margin-top: 26px; align-items: stretch; }
@media (max-width: 1150px) { .wt-wrap { grid-template-columns: 1fr; } }
.wt-table { position: relative; border: 1px solid var(--sd-fun-brd); border-radius: 26px; overflow: hidden; min-height: 520px;
  background: radial-gradient(80% 70% at 50% 40%, color-mix(in srgb, var(--sd-fun-core) 7%, transparent), transparent 75%), var(--sd-fun-wall);
  box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.45); }
.wt-table svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.gridl line { stroke: var(--sd-fun-wall-line); stroke-width: 0.8; }
.tbl-cap { position: absolute; top: 16px; left: 0; right: 0; text-align: center; font-family: var(--sd-mono);
  font-size: 9px; font-weight: 600; letter-spacing: 0.34em; color: var(--sd-fun-wall-dim); pointer-events: none; z-index: 2; }
.axis-x { position: absolute; left: 0; right: 0; bottom: 10px; display: flex; justify-content: space-between; padding: 0 60px;
  font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.24em; color: var(--sd-fun-wall-dim); pointer-events: none; }
.axis-y { position: absolute; top: 60px; bottom: 60px; left: 14px; display: flex; flex-direction: column; justify-content: space-between;
  font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.24em; color: var(--sd-fun-wall-dim);
  writing-mode: vertical-lr; transform: rotate(180deg); pointer-events: none; }
.sweep { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 44%, color-mix(in srgb, var(--sd-fun-core) 5%, transparent) 50%, transparent 56%);
  background-size: 300% 100%; animation: wt-sweep 9s ease-in-out infinite; }
@keyframes wt-sweep { 0%, 100% { background-position: 130% 0; } 50% { background-position: -30% 0; } }
.tbl-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; text-align: center; padding: 0 60px; z-index: 2; }
.tbl-empty b { font-family: var(--sd-mono); font-size: 12px; font-weight: 800; letter-spacing: 0.24em; color: var(--sd-fun-wall-ink); }
.tbl-empty span { font-size: 13px; color: var(--sd-fun-wall-dim); max-width: 480px; }

/* markers */
.mk { position: absolute; transform: translate(-50%, -50%); cursor: pointer; z-index: 3;
  transition: left 1.2s ease, top 1.2s ease; }
.mk .dot { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--sd-fun-esc); position: relative;
  box-shadow: 0 0 22px color-mix(in srgb, var(--sd-fun-esc) 70%, transparent); }
.mk .dot::after { content: ""; position: absolute; inset: -8px; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--sd-fun-esc) 55%, transparent); animation: wt-ring 2.2s ease-out infinite; }
@keyframes wt-ring { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1.6); opacity: 0; } }
.mk.sel .dot::before { content: ""; position: absolute; inset: -15px; border-radius: 50%;
  border: 1.5px dashed var(--sd-fun-hi); animation: wt-spin 10s linear infinite; }
@keyframes wt-spin { to { transform: rotate(360deg); } }
.mk .tag { position: absolute; left: 22px; top: -10px; white-space: nowrap; font-family: var(--sd-mono);
  font-size: 10.5px; font-weight: 700; color: var(--sd-fun-wall-ink); letter-spacing: 0.04em; }
.mk .tag small { display: block; font-size: 9px; font-weight: 500; color: var(--sd-fun-wall-dim); letter-spacing: 0.05em; margin-top: 2px; }
.mk .tag.debt small { color: var(--sd-fun-esc); }
.mk .trail { position: absolute; right: 14px; top: 7px; height: 1.5px; width: 70px;
  background: linear-gradient(270deg, color-mix(in srgb, var(--sd-fun-esc) 60%, transparent), transparent); pointer-events: none; }
.mk.done .dot { width: 11px; height: 11px; background: var(--sd-fun-resolved);
  box-shadow: 0 0 12px color-mix(in srgb, var(--sd-fun-resolved) 55%, transparent); }
.mk.done .dot::after { display: none; }

/* tray */
.tray { position: absolute; left: 26px; top: 52px; width: 226px; z-index: 4;
  border: 1px dashed color-mix(in srgb, var(--sd-warning) 45%, transparent); border-radius: 14px;
  background: color-mix(in srgb, var(--sd-warning) 5%, rgba(18, 14, 10, 0.86)); backdrop-filter: blur(8px); padding: 12px 14px; }
.tray h6 { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.24em; color: var(--sd-warning);
  display: flex; align-items: center; gap: 7px; }
.tray h6 i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-warning); animation: wt-blink 1.4s infinite; }
@keyframes wt-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.tnum { font-family: var(--sd-mono); font-size: 10px; font-weight: 600; color: var(--sd-warning); margin-top: 9px; letter-spacing: 0.03em; }
.tsub { font-size: 12px; font-weight: 570; line-height: 1.35; margin-top: 3px; color: var(--sd-fun-wall-ink);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tby { font-size: 10.5px; font-style: italic; color: var(--sd-fun-wall-dim); margin-top: 6px; line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.topts { display: flex; gap: 6px; margin-top: 10px; font-family: var(--sd-mono); font-size: 7.5px; font-weight: 700;
  letter-spacing: 0.08em; color: var(--sd-fun-wall-dim); }
.topts label { display: flex; gap: 5px; align-items: center; border: 1px solid var(--sd-fun-wall-line); border-radius: 7px;
  padding: 6px 8px; cursor: pointer; }
.topts input { accent-color: var(--sd-fun-core); }
.tv { display: flex; gap: 6px; margin-top: 10px; }
.tgo { flex: 1; border: 1px solid color-mix(in srgb, var(--sd-fun-resolved) 40%, transparent); border-radius: 9px; padding: 9px 0;
  text-align: center; background: color-mix(in srgb, var(--sd-fun-resolved) 16%, transparent); color: var(--sd-fun-wall-ink);
  font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s; }
.tgo:hover { transform: translateY(-2px); }
.tgo:disabled { opacity: 0.5; cursor: wait; }
.tno { flex: 1; border: 1px solid var(--sd-fun-wall-line); border-radius: 9px; background: none; color: var(--sd-fun-wall-dim);
  font-family: var(--sd-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s; padding: 9px 0; }
.tno:hover { color: var(--sd-fun-esc); border-color: color-mix(in srgb, var(--sd-fun-esc) 45%, transparent); }
.tno.solid { color: var(--sd-fun-wall-ink); background: color-mix(in srgb, var(--sd-fun-esc) 22%, transparent);
  border-color: color-mix(in srgb, var(--sd-fun-esc) 45%, transparent); }
.tno.solid:disabled { opacity: 0.5; cursor: not-allowed; }
.tdecline { margin-top: 10px; }
.tnote { width: 100%; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-family: inherit;
  color: var(--sd-fun-wall-ink); background: rgba(0, 0, 0, 0.3); border: 1px solid var(--sd-fun-wall-line); outline: none; }
.tnote:focus { border-color: var(--sd-fun-esc); }
.tmore { margin-top: 8px; font-family: var(--sd-mono); font-size: 7.5px; font-weight: 700; letter-spacing: 0.2em;
  color: var(--sd-fun-wall-dim); text-align: center; }

/* dossier */
.dossier { border: 1px solid var(--sd-fun-brd); border-radius: 24px;
  background: color-mix(in srgb, var(--sd-surface) 90%, var(--sd-fun-core) 3%); backdrop-filter: blur(20px);
  padding: 22px 24px; overflow: hidden; position: relative; }
.dossier::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--sd-fun-core), transparent); opacity: 0.7; }
.ds-cap { font-family: var(--sd-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.3em; color: var(--sd-text-dim);
  display: flex; align-items: center; gap: 9px; }
.ds-cap::after { content: ""; height: 1px; flex: 1; background: var(--sd-fun-brd); }
.ds-num { margin-top: 13px; font-family: var(--sd-mono); font-size: 12.5px; font-weight: 600; color: var(--sd-fun-core); }
.ds-sub { font-size: 17px; font-weight: 620; line-height: 1.3; margin-top: 4px; color: var(--sd-text); }
.ds-run { font-family: var(--sd-mono); font-size: 34px; font-weight: 250; line-height: 1; margin-top: 12px;
  font-variant-numeric: tabular-nums; color: var(--sd-text); }
.ds-run small { display: block; font-size: 8px; font-weight: 600; letter-spacing: 0.22em; color: var(--sd-text-dim); margin-top: 5px; }
.ds-ph { margin-top: 14px; display: flex; gap: 4px; align-items: center; }
.ds-ph i { height: 5px; flex: 1; border-radius: 5px; background: var(--sd-fun-brd); position: relative; overflow: hidden; }
.ds-ph i.f::after { content: ""; position: absolute; inset: 0; background: var(--sd-fun-core); border-radius: 5px; }
.ds-ph i.h::after { content: ""; position: absolute; inset: 0; width: 55%; background: var(--sd-fun-core); border-radius: 5px;
  animation: wt-crawl 2.2s ease-in-out infinite alternate; }
@keyframes wt-crawl { from { width: 36%; } to { width: 68%; } }
.ds-phl { display: flex; justify-content: space-between; font-family: var(--sd-mono); font-size: 7px; font-weight: 600;
  letter-spacing: 0.1em; color: var(--sd-text-dim); margin-top: 6px; }
.ds-sec { margin-top: 15px; border-top: 1px dashed var(--sd-fun-brd); padding-top: 13px; }
.ds-sec h4 { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.26em; color: var(--sd-text-dim); margin-bottom: 9px; }
.ds-line { font-size: 12px; color: var(--sd-text-secondary); padding: 3px 0; line-height: 1.5; }
.ds-line b { color: var(--sd-text); font-weight: 600; }
.ds-line .r { color: var(--sd-fun-esc); } .ds-line .g { color: var(--sd-fun-resolved); } .ds-line .a { color: var(--sd-warning); }
.ds-verbs { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
.dv { border: 1px solid var(--sd-fun-brd); background: none; color: var(--sd-text-muted); font-family: var(--sd-mono);
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.dv:hover { transform: translateY(-2px); color: var(--sd-text); border-color: color-mix(in srgb, var(--sd-fun-core) 55%, transparent);
  background: color-mix(in srgb, var(--sd-fun-core) 10%, transparent); }
.dv.p { background: linear-gradient(180deg, color-mix(in srgb, var(--sd-fun-core) 26%, transparent), color-mix(in srgb, var(--sd-fun-core) 9%, transparent));
  color: var(--sd-text); }
.dv.hot:hover { color: var(--sd-fun-esc); border-color: color-mix(in srgb, var(--sd-fun-esc) 50%, transparent); }
.dv:disabled { opacity: 0.5; cursor: wait; }
.ds-empty { display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center; padding: 60px 20px; }
.ds-empty.pad { padding: 24px 10px; }
.ds-empty b { font-family: var(--sd-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.24em; color: var(--sd-text-muted); }
.ds-empty span { font-size: 12.5px; color: var(--sd-text-dim); max-width: 300px; }

/* lower desks */
.wt-desks { display: grid; grid-template-columns: 1.35fr 1fr; gap: 18px; margin-top: 22px; }
@media (max-width: 1000px) { .wt-desks { grid-template-columns: 1fr; } }
.desk { border: 1px solid var(--sd-fun-brd); border-radius: 20px;
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent); padding: 16px 22px; }
.desk h3 { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.3em; color: var(--sd-text-dim);
  display: flex; gap: 10px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--sd-fun-brd); }
.desk h3 .n { margin-left: auto; font-size: 17px; font-weight: 300; color: var(--sd-fun-core); }
.desk h3 .n.r { color: var(--sd-fun-esc); }
.ft { padding: 11px 2px; border-bottom: 1px dashed var(--sd-fun-brd); display: flex; gap: 12px; align-items: flex-start; }
.ft:last-child { border-bottom: 0; }
.burn { position: relative; width: 46px; height: 6px; border-radius: 6px; background: var(--sd-fun-brd); overflow: hidden;
  flex: 0 0 auto; margin-top: 7px; }
.burn::after { content: ""; position: absolute; inset: 0; width: var(--b, 60%); border-radius: 6px;
  background: linear-gradient(90deg, var(--sd-fun-core), var(--sd-fun-esc)); animation: wt-burn 2.6s ease-in-out infinite alternate; }
@keyframes wt-burn { from { opacity: 0.7; } to { opacity: 1; } }
.ft.g .burn::after { background: var(--sd-fun-resolved); animation: none; }
.ft-txt { font-size: 12.5px; line-height: 1.45; flex: 1; color: var(--sd-text); }
.ft-txt small { display: block; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 500; letter-spacing: 0.06em;
  color: var(--sd-text-dim); margin-top: 4px; }
.ft-txt small .r { color: var(--sd-fun-esc); } .ft-txt small .g { color: var(--sd-fun-resolved); }
.ft-done { border: 1px solid var(--sd-fun-brd); background: none; border-radius: 8px; color: var(--sd-text-muted);
  font-family: var(--sd-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; padding: 7px 10px; cursor: pointer;
  transition: all 0.2s; flex: 0 0 auto; }
.ft-done:hover { color: var(--sd-fun-resolved); border-color: color-mix(in srgb, var(--sd-fun-resolved) 45%, transparent); transform: translateY(-1px); }
.ft-lock { flex: 0 0 auto; align-self: center; font-family: var(--sd-mono); font-size: 8px; font-weight: 700;
  letter-spacing: 0.12em; color: var(--sd-text-dim); border: 1px dashed var(--sd-fun-brd); border-radius: 8px;
  padding: 6px 9px; cursor: default; white-space: nowrap; }
.an-strip { display: flex; flex-direction: column; gap: 13px; margin-top: 14px; }
.an-row { display: flex; align-items: baseline; gap: 12px; }
.an-row b { font-family: var(--sd-mono); font-size: 26px; font-weight: 300; min-width: 80px; color: var(--sd-text); }
.an-row.org b { color: var(--sd-fun-core); }
.an-row span { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.an-row .tr { margin-left: auto; font-size: 9.5px; font-weight: 600; }
.tr.up { color: var(--sd-fun-esc); } .tr.dn { color: var(--sd-fun-resolved); }
.bars { display: flex; gap: 3px; align-items: flex-end; height: 38px; margin-top: 2px; }
.bars i { flex: 1; background: color-mix(in srgb, var(--sd-fun-core) 45%, transparent); border-radius: 3px 3px 0 0;
  animation: wt-grow 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--k) * 50ms); transform-origin: bottom; }
@keyframes wt-grow { from { transform: scaleY(0); } to { transform: none; } }
.bars i.hot { background: var(--sd-fun-esc); }
.an-cap { font-family: var(--sd-mono); font-size: 8px; font-weight: 600; letter-spacing: 0.2em; color: var(--sd-text-dim); margin-top: 6px; }

.wt-foot { margin-top: 24px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap;
  color: var(--sd-text-dim); font-family: var(--sd-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.22em;
  border-top: 1px solid var(--sd-fun-brd); padding-top: 15px; }

/* ═════ LIGHT THEME OVERRIDES ═════
   The table felt (--sd-fun-wall) stays obsidian in BOTH themes — display-panel rule,
   same as the Command Funnel wall. Only the stage around it is theme-native. */
[data-theme="light"] .wt-table { box-shadow: inset 0 0 70px rgba(0, 0, 0, 0.5); }
[data-theme="light"] .dossier { background: color-mix(in srgb, #fffcf4 92%, var(--sd-fun-core) 3%); }
[data-theme="light"] .tray { background: color-mix(in srgb, var(--sd-warning) 6%, rgba(24, 18, 12, 0.88)); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sweep,
  html:not([data-cinematic="on"]) .mk .dot::after,
  html:not([data-cinematic="on"]) .mk.sel .dot::before,
  html:not([data-cinematic="on"]) .tray h6 i,
  html:not([data-cinematic="on"]) .ds-ph i.h::after,
  html:not([data-cinematic="on"]) .burn::after,
  html:not([data-cinematic="on"]) .bars i { animation: none; }
}
</style>
