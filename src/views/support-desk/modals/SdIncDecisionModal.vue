<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="idm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="idm" role="dialog" aria-modal="true" aria-label="Log a command decision"
          :initial="{ opacity: 0, y: 30, scale: 0.955 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">
          <span class="idm-beam" aria-hidden="true" />
          <button class="idm-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="17" /></button>

          <!-- ░░ HEADER ░░ -->
          <header class="idm-head">
            <p class="idm-eyebrow sd-mono"><Gavel :size="11" /> DECISION LOG · COMMAND ACCOUNTABILITY</p>
            <div class="idm-tr">
              <h2 class="idm-title">Command ledger — <em>{{ ticket?.ticket_number }}</em></h2>
              <SdIncSevBadge :sev="sev" />
              <span v-if="ticket?.is_major_incident" class="idm-mi sd-mono">MAJOR</span>
              <span class="idm-st sd-mono" :class="{ dead: sealed }">{{ statusLabel }}</span>
            </div>
            <p v-if="ticket?.subject" class="idm-subj">{{ ticket.subject }}</p>
            <p class="idm-sub">Every entry is immutable — <b>who decided what, when, and why</b>.
              DR / failover / BCP calls are <b>recorded</b> here, not automated.</p>
          </header>

          <!-- ░░ COMPOSER (left) ░░ -->
          <div class="idm-main">
            <!-- sealed / merged plate: the ledger stays readable, writing is over -->
            <Motion v-if="sealed" class="idm-seal"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <span class="seal-ring"><component :is="sealKind === 'merged' ? GitMerge : Lock" :size="22" /></span>
              <p class="seal-t sd-mono">LEDGER SEALED</p>
              <p class="seal-d" v-if="sealKind === 'merged'">
                This ticket was merged — log decisions on the surviving incident. The entries
                below remain part of the permanent record.</p>
              <p class="seal-d" v-else>
                This incident is {{ statusLabel }} — the decision log is closed to new entries.
                Record follow-ups in the <b>post-incident report</b> instead.</p>
            </Motion>

            <template v-else>
              <!-- §0 SIGNATURE — who is signing this entry -->
              <Motion as="section" class="idm-sig" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                <span class="sig-av" aria-hidden="true">
                  <svg viewBox="0 0 48 48"><circle class="sig-ring" cx="24" cy="24" r="21" pathLength="100" /></svg>
                  <i>{{ initials(meName) }}</i>
                </span>
                <span class="sig-meta">
                  <b>{{ meName }}</b>
                  <span class="sig-roles">
                    <em v-for="r in myRoles" :key="r" class="sd-mono" :class="{ hot: r === 'COMMANDER' }">{{ r }}</em>
                  </span>
                </span>
                <span class="sig-right">
                  <b class="sd-mono">{{ utcClock }}</b>
                  <em class="sd-mono">ENTRY {{ entryNo != null ? '№ ' + entryNo : '№ —' }}</em>
                </span>
              </Motion>

              <!-- witness wire: who hears about this entry -->
              <Motion as="p" class="idm-wire" :class="{ warn: !ticket?.incident_commander_id }"
                :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="fT(1)">
                <component :is="ticket?.incident_commander_id ? Radio : TriangleAlert" :size="12" />
                <template v-if="notifyTarget">Commander <b>{{ notifyTarget }}</b> is notified the moment this logs.</template>
                <template v-else-if="ticket?.incident_commander_id">You hold command — this entry logs under your own authority.</template>
                <template v-else>No commander staffed — this call will be logged <b>unwitnessed</b>. Consider staffing the roster first.</template>
              </Motion>

              <!-- §1 DECISION TYPE — the taxonomy deck -->
              <section class="idm-f">
                <label class="idm-k">Decision type <em class="req">*</em></label>
                <div class="idm-deck">
                  <Motion v-for="(k, i) in normalKinds" :key="k.value" as="button" type="button"
                    class="tcard" :class="{ on: form.kind === k.value }"
                    :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.35, delay: 0.08 + i * 0.03, ease: [0.16, 1, 0.3, 1] }"
                    :while-tap="{ scale: 0.97 }" @click="form.kind = k.value">
                    <component :is="k.icon" :size="15" class="ti" />
                    <b>{{ k.label }}</b><span class="tw">{{ k.whisper }}</span>
                    <Motion v-if="form.kind === k.value" class="tick"
                      :initial="{ scale: 0, rotate: -30 }" :animate="{ scale: 1, rotate: 0 }"
                      :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"><Check :size="10" /></Motion>
                  </Motion>
                </div>
                <p class="idm-gsep sd-mono"><TriangleAlert :size="10" /> GRAVE CALLS — ARMED BEFORE LOGGING</p>
                <div class="idm-deck">
                  <Motion v-for="(k, i) in graveKinds" :key="k.value" as="button" type="button"
                    class="tcard grave" :class="{ on: form.kind === k.value }"
                    :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.35, delay: 0.22 + i * 0.03, ease: [0.16, 1, 0.3, 1] }"
                    :while-tap="{ scale: 0.97 }" @click="form.kind = k.value">
                    <component :is="k.icon" :size="15" class="ti" />
                    <b>{{ k.label }}</b><span class="tw">{{ k.whisper }}</span>
                    <Motion v-if="form.kind === k.value" class="tick"
                      :initial="{ scale: 0, rotate: -30 }" :animate="{ scale: 1, rotate: 0 }"
                      :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"><Check :size="10" /></Motion>
                  </Motion>
                </div>
              </section>

              <!-- §2 WHY — structured rationale, recorded beside the statement -->
              <Motion as="section" class="idm-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(2)">
                <label class="idm-k">Why this call <i>recorded on the entry — pick one or write your own</i></label>
                <div class="idm-rchips">
                  <button v-for="r in reasonPresets" :key="r" type="button" class="rchip"
                    :class="{ on: form.reason === r }" @click="pickReason(r)">{{ r }}</button>
                </div>
                <div class="idm-inrow">
                  <input v-model="form.reason" class="idm-in" type="text" maxlength="300"
                    placeholder="Or type the rationale in your own words…" />
                  <span class="cnt sd-mono" :class="{ hot: form.reason.length > 270 }">{{ form.reason.length }}/300</span>
                </div>
              </Motion>

              <!-- §3 THE DECISION -->
              <Motion as="section" class="idm-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
                <label class="idm-k">The decision <em class="req">*</em></label>
                <textarea ref="taRef" v-model="form.decision" class="idm-ta" rows="2" maxlength="600"
                  placeholder="e.g. Failing over payments to the DR region; vendor bridge stays open…" />
                <div class="idm-inrow tight">
                  <span class="hint sd-mono" :class="{ ok: decisionOk }">{{ decisionOk ? 'STATEMENT COMPLETE' : 'MIN 3 CHARACTERS' }}</span>
                  <span class="cnt sd-mono" :class="{ hot: form.decision.length > 540 }">{{ form.decision.length }}/600</span>
                </div>
              </Motion>

              <!-- §4 CONTEXT -->
              <Motion as="section" class="idm-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(4)">
                <label class="idm-k">Context <i>optional — evidence, alternatives, who was consulted</i></label>
                <textarea v-model="form.note" class="idm-ta" rows="3" maxlength="2000"
                  placeholder="Evidence, alternatives considered, who was consulted…" />
                <div class="idm-inrow tight">
                  <span />
                  <span class="cnt sd-mono" :class="{ hot: form.note.length > 1800 }">{{ form.note.length }}/2000</span>
                </div>
              </Motion>

              <!-- §5 ARM — grave calls take a deliberate second motion -->
              <Presence>
                <Motion v-if="isGrave" class="idm-arm" :class="{ armed }"
                  :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                  <button type="button" class="arm-sw" role="switch" :aria-checked="armed"
                    aria-label="Arm this grave call" @click="armed = !armed"><i /></button>
                  <span class="arm-tx"><b>ARM THIS CALL</b> — I hold the authority to record a
                    {{ kindLabel(form.kind).toLowerCase() }} on this incident.</span>
                </Motion>
              </Presence>
            </template>
          </div>

          <!-- ░░ LEDGER RAIL (right) — the record writes itself as you type ░░ -->
          <aside class="idm-rail">
            <p class="rail-h sd-mono"><ScrollText :size="11" /> THE LEDGER
              <em v-if="histState === 'ready'">· {{ decisions.length }} {{ decisions.length === 1 ? 'ENTRY' : 'ENTRIES' }}</em></p>

            <!-- live ghost entry -->
            <Motion v-if="!sealed" class="ghost" :class="{ ready: canLog, grave: isGrave }"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(1)">
              <span class="g-stamp sd-mono">{{ canLog ? 'READY' : 'DRAFT' }}</span>
              <div class="l-top">
                <span class="l-seq sd-mono">№ {{ entryNo != null ? entryNo : '—' }}</span>
                <span class="kchip sd-mono" :class="kTone(form.kind)">{{ kindLabel(form.kind) }}</span>
                <span class="l-when sd-mono">NOW</span>
              </div>
              <p class="l-text" :class="{ ph: !form.decision.trim() }">
                {{ form.decision.trim() || 'Your decision statement writes itself here…' }}</p>
              <p v-if="form.reason.trim()" class="l-why">WHY — {{ form.reason.trim() }}</p>
              <div class="l-foot"><i class="l-dot">{{ initials(meName) }}</i><span>{{ meName }}</span></div>
            </Motion>

            <div class="rail-list">
              <template v-if="histState === 'loading'">
                <div v-for="i in 3" :key="i" class="lrow shim" :style="{ '--i': i }" aria-hidden="true" />
              </template>
              <p v-else-if="histState === 'error'" class="rail-empty">
                Couldn’t load prior entries — logging still works.</p>
              <p v-else-if="histState === 'ready' && !decisions.length" class="rail-empty">
                No decisions yet — {{ sealed ? 'this ledger closed empty.' : 'this entry opens the ledger.' }}</p>
              <div v-else v-for="(d, i) in decisions" :key="d.id" class="lrow" :style="{ '--i': i }">
                <div class="l-top">
                  <span class="l-seq sd-mono">№ {{ d.seq }}</span>
                  <span class="kchip sd-mono" :class="kTone(d.kind)">{{ kindLabel(d.kind) }}</span>
                  <span class="l-when sd-mono" :title="fmtAbs(d.at)">{{ ago(d.at) }}</span>
                </div>
                <p class="l-text">{{ d.decision }}</p>
                <p v-if="d.reason" class="l-why">WHY — {{ d.reason }}</p>
                <div class="l-foot">
                  <i class="l-dot">{{ initials(d.actor) }}</i><span>{{ d.actor }}</span>
                  <StickyNote v-if="d.note" :size="10" class="l-note" :title="d.note" />
                </div>
              </div>
            </div>

            <!-- who is working this fault — the response roster, pinned to the rail floor -->
            <div class="rail-roster">
              <p class="ros-h sd-mono"><UserRound :size="10" /> ON THE BRIDGE · WORKING THIS FAULT</p>
              <div class="ros-grid">
                <div v-for="(s, i) in roster" :key="s.label" class="seat" :style="{ '--i': i }"
                  :class="{ hot: s.hot && s.name, open: !s.name, crit: !s.name && s.hot }">
                  <i class="s-dot">{{ s.name ? initials(s.name) : '—' }}</i>
                  <span class="s-tx">
                    <em class="sd-mono">{{ s.label }}</em>
                    <b :title="s.name || ''">{{ s.name || 'Seat open' }}</b>
                  </span>
                </div>
              </div>
              <p class="ros-meta sd-mono">
                <span v-if="ticket?.team_name" class="rm-team" :title="ticket.team_name">{{ ticket.team_name }}</span>
                <span v-else class="rm-team">NO TEAM LANE</span>
                <span class="rm-ack" :class="acked ? 'ok' : 'bad'">{{ acked ? 'ACKED' : 'UNACKED' }}</span>
                <span v-if="ticket?.escalation_level" class="rm-esc">L{{ ticket.escalation_level }}</span>
              </p>
            </div>
          </aside>

          <!-- ░░ FOOTER ░░ -->
          <footer class="idm-foot">
            <span class="idm-stamp sd-mono" :class="stampTone">
              <component :is="sealed ? Lock : Gavel" :size="13" /> {{ stampLabel }}
            </span>
            <em class="idm-oath sd-mono">LOGGED FOREVER · EDITED NEVER</em>
            <div class="idm-actions">
              <button class="idm-btn ghost" :disabled="busy" @click="$emit('close')">{{ sealed ? 'Close' : 'Cancel' }}</button>
              <Motion v-if="!sealed" as="button" class="idm-btn primary" :class="{ grave: isGrave }"
                :disabled="!canLog || busy" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="save">
                <Loader v-if="busy" :size="14" class="idm-spin" /><Gavel v-else :size="14" />
                {{ isGrave ? 'Log grave call' : 'Log decision' }}
              </Motion>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdIncDecisionModal — "THE COMMAND LEDGER".
   POST /tickets/{id}/decision → immutable decision_logged activity row (kind + statement +
   structured reason + note). The rail shows the incident's full decision history (per-ticket
   activities, team-sealed server-side); the ghost entry is the live preview of the row being
   written. Grave calls (failover / DR / BCP / exec) require an explicit ARM. Terminal/merged
   incidents render the SEALED plate — readable ledger, no new entries (mirrors backend 409). */
import { reactive, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Loader, Gavel, Check, Lock, Radio, ScrollText, StickyNote, TriangleAlert, GitMerge, UserRound,
  Wrench, Crown, ArrowLeftRight, LifeBuoy, ShieldAlert, Undo2, Handshake, Megaphone, FlagOff, Ellipsis,
} from 'lucide-vue-next'
import {
  logIncidentDecision, listTicketActivities, fetchMe, sevOf, DECISION_KINDS,
} from '@/composables/useSupportDesk'
import SdIncSevBadge from '../components/SdIncSevBadge.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

/* ── taxonomy meta (icons + whispers) over the shared DECISION_KINDS contract ── */
const GRAVE = new Set(['failover', 'activate_dr', 'invoke_bcp', 'escalate_executive'])
const KIND_META = {
  mitigation: { icon: Wrench, whisper: 'Contain or reduce impact' },
  escalate_executive: { icon: Crown, whisper: 'Pull in executive command' },
  failover: { icon: ArrowLeftRight, whisper: 'Shift load to standby' },
  activate_dr: { icon: LifeBuoy, whisper: 'Disaster recovery invoked' },
  invoke_bcp: { icon: ShieldAlert, whisper: 'Business continuity plan' },
  rollback: { icon: Undo2, whisper: 'Revert the change' },
  vendor_engaged: { icon: Handshake, whisper: 'Third party pulled in' },
  comms: { icon: Megaphone, whisper: 'Stakeholder messaging' },
  stand_down: { icon: FlagOff, whisper: 'Lower the posture' },
  other: { icon: Ellipsis, whisper: 'Everything else' },
}
const enriched = DECISION_KINDS.map((k) => ({ ...k, ...(KIND_META[k.value] || KIND_META.other) }))
const normalKinds = enriched.filter((k) => !GRAVE.has(k.value))
const graveKinds = enriched.filter((k) => GRAVE.has(k.value))
const kindLabel = (v) => (DECISION_KINDS.find((k) => k.value === v)?.label) || v
const kTone = (v) => (GRAVE.has(v) ? 'arc' : v === 'stand_down' ? 'live'
  : (v === 'comms' || v === 'vendor_engaged') ? 'hi' : v === 'other' ? 'dim' : 'core')

/* ── per-kind rationale presets (free text always allowed; capped at 300 like the API) ── */
const REASONS = {
  mitigation: ['Stop the bleed while root cause is investigated', 'Cheapest reversible action available now', 'Buy time for the durable fix to land'],
  escalate_executive: ['Customer-visible outage beyond SLA tolerance', 'Revenue / contractual exposure needs exec air-cover', 'Cross-org resources required', 'Regulatory or press exposure likely'],
  failover: ['Primary degraded beyond recovery tolerance', 'Failing path unrecoverable within RTO', 'Health checks red across the primary', 'Vendor ETA exceeds failover cost'],
  activate_dr: ['Primary site loss — RTO clock running', 'Data-layer corruption suspected on primary', 'Extended outage confirmed by provider', 'BC plan mandates DR at this severity'],
  invoke_bcp: ['Core business process is blocked', 'Continuity workaround needed beyond IT recovery', 'Multi-site impact — continuity over restoration', 'Regulatory continuity obligation triggered'],
  rollback: ['Regression traced to the latest release', 'Fix-forward slower than rollback', 'Canary metrics degraded post-deploy', 'Restore last known good — window closed'],
  vendor_engaged: ['Fault isolated to the vendor’s domain', 'Contractual support entitlement invoked', 'Vendor-side telemetry needed to progress', 'Climbing the vendor’s severity ladder'],
  comms: ['Stakeholders need proactive notice', 'Status-page / customer messaging call', 'Update cadence changed for this phase', 'Holding statement agreed before RCA'],
  stand_down: ['Impact cleared and stable — monitoring continues', 'Severity re-assessed below MI threshold', 'Response folded under the parent incident', 'False alarm — no customer impact found'],
  other: ['Judgment call outside the standard taxonomy', 'Process exception approved for this incident', 'Risk accepted after options review'],
}
const reasonPresets = computed(() => REASONS[form.kind] || REASONS.other)

const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })
const form = reactive({ kind: 'mitigation', decision: '', reason: '', note: '' })
const armed = ref(false)
const busy = ref(false)
const me = ref(null)
const history = ref([])            // chronological asc, seq-stamped
const histState = ref('idle')      // idle | loading | ready | error
const nowTick = ref(Date.now())
const taRef = ref(null)
let clockTimer = null
let fetchSeq = 0                   // stale-response guard for the history fetch

/* ── derived context ── */
const sev = computed(() => props.ticket?.sev ?? sevOf(props.ticket))
const statusLabel = computed(() => String(props.ticket?.status || '').replace(/_/g, ' ') || '—')
const sealed = computed(() => {
  const t = props.ticket
  if (!t) return false
  return ['resolved', 'closed', 'archived'].includes(String(t.status || '')) || !!t.merged_into_id
})
const sealKind = computed(() => (props.ticket?.merged_into_id ? 'merged' : 'terminal'))
const isGrave = computed(() => GRAVE.has(form.kind))
const decisionOk = computed(() => form.decision.trim().length >= 3)
const canLog = computed(() => !sealed.value && !!form.kind && decisionOk.value && (!isGrave.value || armed.value))

const meName = computed(() => me.value?.full_name || me.value?.email || 'You')
const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const myRoles = computed(() => {
  const t = props.ticket, m = me.value
  if (!t || !m) return ['RESPONDER']
  const id = String(m.id), out = []
  if (String(t.incident_commander_id || '') === id) out.push('COMMANDER')
  if (String(t.comms_lead_id || '') === id) out.push('COMMS LEAD')
  if (String(t.ops_lead_id || '') === id) out.push('OPS LEAD')
  if (String(t.assigned_agent_id || '') === id) out.push('OWNER')
  if (!out.length) out.push(m.is_superuser ? 'ADMIN' : 'RESPONDER')
  return out
})
const notifyTarget = computed(() => {
  const t = props.ticket
  if (!t?.incident_commander_id) return null
  if (me.value && String(me.value.id) === String(t.incident_commander_id)) return null
  return t.incident_commander_name || 'the incident commander'
})

/* the response roster — who is working this fault (names ride IncidentRow; a
   drawer-launched TicketResponse only carries ids → generic "Staffed") */
const roster = computed(() => {
  const t = props.ticket || {}
  const seat = (label, id, name, hot = false) =>
    ({ label, name: name || (id ? 'Staffed' : null), hot })
  return [
    seat('COMMANDER', t.incident_commander_id, t.incident_commander_name, true),
    seat('COMMS LEAD', t.comms_lead_id, t.comms_lead_name),
    seat('OPS LEAD', t.ops_lead_id, t.ops_lead_name),
    seat('OWNER', t.assigned_agent_id, t.assigned_agent_name),
  ]
})
const acked = computed(() => !!props.ticket?.acknowledged_at)

const decisions = computed(() => [...history.value].reverse())          // newest first
const entryNo = computed(() => (histState.value === 'ready' ? history.value.length + 1 : null))
const utcClock = computed(() => { void nowTick.value; return new Date().toISOString().slice(11, 19) + ' UTC' })

const stampLabel = computed(() => sealed.value ? 'LEDGER SEALED'
  : canLog.value ? 'READY TO LOG'
    : (isGrave.value && decisionOk.value && !armed.value) ? 'ARM TO LOG' : 'AWAITING DECISION')
const stampTone = computed(() => sealed.value ? 'dead'
  : canLog.value ? 'ready' : (isGrave.value && decisionOk.value && !armed.value) ? 'arm' : '')

/* ── time helpers (backend datetimes are naive UTC — pin the zone before diffing) ── */
const asUtc = (iso) => new Date(/Z$|[+-]\d\d:?\d\d$/.test(String(iso)) ? iso : iso + 'Z')
const ago = (iso) => {
  if (!iso) return ''
  const s = Math.max(0, (nowTick.value - asUtc(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const fmtAbs = (iso) => (iso ? asUtc(iso).toLocaleString() : '')

/* ── the ledger: this incident's decision_logged rows, team-sealed server-side ── */
const loadHistory = async () => {
  const t = props.ticket
  if (!t?.id) { histState.value = 'ready'; return }
  const seq = ++fetchSeq
  histState.value = 'loading'
  try {
    const rows = await listTicketActivities(t.id)
    if (seq !== fetchSeq) return                                  // superseded or modal closed
    history.value = (rows || [])
      .filter((r) => r.action === 'decision_logged')
      .map((r, i) => ({
        id: r.id, seq: i + 1, at: r.created_at, actor: r.actor_name || 'System',
        kind: r.detail?.kind || 'other', decision: r.detail?.decision || '',
        reason: r.detail?.reason || null, note: r.detail?.note || null,
      }))
    histState.value = 'ready'
  } catch { if (seq === fetchSeq) histState.value = 'error' }
}

/* ── open/close lifecycle: reset, hydrate, tick, listen — and tear all of it down ── */
const onKey = (e) => { if (e.key === 'Escape' && !busy.value) emit('close') }
watch(() => props.open, (v) => {
  if (v) {
    form.kind = 'mitigation'; form.decision = ''; form.reason = ''; form.note = ''
    armed.value = false; history.value = []; histState.value = 'idle'
    fetchMe().then((u) => { me.value = u })
    loadHistory()
    nowTick.value = Date.now()
    clockTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
    window.addEventListener('keydown', onKey)
    if (!sealed.value) nextTick(() => setTimeout(() => taRef.value?.focus?.(), 380))
  } else {
    fetchSeq++                                                     // invalidate any in-flight fetch
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
    window.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  window.removeEventListener('keydown', onKey)
})

/* a different kind is a different call — stale rationale/arming must never carry over */
watch(() => form.kind, () => { armed.value = false; form.reason = '' })

const pickReason = (r) => { form.reason = form.reason === r ? '' : r }

const save = async () => {
  if (!props.ticket || !canLog.value || busy.value) return
  busy.value = true
  try {
    const payload = { kind: form.kind, decision: form.decision.trim(), note: form.note.trim() || null }
    const reason = form.reason.trim()
    if (reason) payload.reason = reason
    await logIncidentDecision(props.ticket.id, payload)
    toast.success(isGrave.value ? 'Grave call recorded on the ledger' : 'Decision logged to the timeline')
    emit('done')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not log the decision')
  } finally { busy.value = false }
}
</script>

<style scoped>
.idm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.6); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.idm { position: relative; width: min(920px, 96vw); max-height: 90vh; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1fr) 316px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: 'head head' 'main rail' 'foot foot';
  border-radius: 20px; border: 1px solid var(--sd-inc-brd); box-shadow: var(--sd-shadow-hover);
  background:
    radial-gradient(640px 320px at 10% -10%, var(--sd-inc-soft), transparent 70%),
    linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface)); }
[data-theme="light"] .idm { background:
  radial-gradient(640px 320px at 10% -10%, var(--sd-inc-soft), transparent 70%),
  linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 250, 240, 0.86)); }

/* the beam — a light sweep riding the top edge (ties the modal to the Active desk) */
.idm-beam { position: absolute; inset: 0 0 auto 0; height: 3px; overflow: hidden;
  background: var(--sd-inc-grad); z-index: 2; }
.idm-beam::after { content: ''; position: absolute; inset: 0; width: 38%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent);
  animation: idm-beam-sweep 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
@keyframes idm-beam-sweep { from { transform: translateX(-110%); } to { transform: translateX(380%); } }

.idm-x { position: absolute; top: 14px; right: 14px; z-index: 3; display: grid; place-items: center;
  width: 30px; height: 30px; border-radius: 10px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: color 0.2s, border-color 0.2s; }
.idm-x:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); }

/* ── header ── */
.idm-head { grid-area: head; padding: 22px 52px 14px 24px; border-bottom: 1px solid var(--sd-border); }
.idm-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 7px;
  font-size: 9.5px; letter-spacing: 0.18em; color: var(--sd-inc-core); }
.idm-tr { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.idm-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--sd-text); }
.idm-title em { font-style: normal; background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.idm-mi { padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.idm-st { padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--sd-text-secondary); background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border); }
.idm-st.dead { color: var(--sd-inc-dim); }
.idm-subj { margin: 5px 0 0; font-size: 12px; font-weight: 600; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 92%; }
.idm-sub { margin: 6px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-muted); }
.idm-sub b { color: var(--sd-text-secondary); font-weight: 700; }

/* ── composer column ── */
.idm-main { grid-area: main; min-height: 0; overflow-y: auto; display: flex; flex-direction: column;
  gap: 14px; padding: 16px 18px 16px 24px; }

/* custom scroll — a thin amber line riding the surfaces, not the browser default */
.idm-main, .rail-list, .idm-ta { scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--sd-inc-core) 50%, transparent) transparent; }
.idm-main::-webkit-scrollbar, .rail-list::-webkit-scrollbar, .idm-ta::-webkit-scrollbar {
  width: 6px; height: 6px; }
.idm-main::-webkit-scrollbar-track, .rail-list::-webkit-scrollbar-track,
.idm-ta::-webkit-scrollbar-track { background: transparent; }
.idm-main::-webkit-scrollbar-thumb, .rail-list::-webkit-scrollbar-thumb,
.idm-ta::-webkit-scrollbar-thumb { border-radius: 20px;
  background: color-mix(in srgb, var(--sd-inc-core) 45%, transparent); }
.idm-main::-webkit-scrollbar-thumb:hover, .rail-list::-webkit-scrollbar-thumb:hover,
.idm-ta::-webkit-scrollbar-thumb:hover { background: var(--sd-inc-core); }
.idm-f { display: flex; flex-direction: column; gap: 7px; }
.idm-k { font-size: 11.5px; font-weight: 800; letter-spacing: 0.03em; color: var(--sd-text); }
.idm-k i { font-style: normal; font-weight: 600; color: var(--sd-text-muted); }
.req { color: var(--sd-inc-arc); font-style: normal; }

/* signature card */
.idm-sig { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface); }
.sig-av { position: relative; width: 44px; height: 44px; flex: none; }
.sig-av svg { position: absolute; inset: -2px; width: 48px; height: 48px; transform: rotate(-90deg); }
.sig-ring { fill: none; stroke: var(--sd-inc-core); stroke-width: 2.5; stroke-linecap: round;
  stroke-dasharray: 100; stroke-dashoffset: 0; animation: idm-ring 1.1s cubic-bezier(0.16, 1, 0.3, 1) both 0.15s; }
@keyframes idm-ring { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
.sig-av i { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%;
  font-style: normal; font-size: 13px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--sd-inc-hi); background: var(--sd-inc-soft); }
[data-theme="light"] .sig-av i { color: var(--sd-inc-deep); }
.sig-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sig-meta b { font-size: 13.5px; font-weight: 800; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sig-roles { display: flex; flex-wrap: wrap; gap: 4px; }
.sig-roles em { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em;
  padding: 1.5px 7px; border-radius: 20px; color: var(--sd-text-muted);
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); }
.sig-roles em.hot { color: var(--sd-inc-core); background: var(--sd-inc-soft);
  border-color: var(--sd-inc-brd); }
.sig-right { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
.sig-right b { font-size: 14px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text);
  font-variant-numeric: tabular-nums; }
.sig-right em { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.14em;
  color: var(--sd-inc-core); }

/* witness wire */
.idm-wire { display: flex; align-items: center; gap: 7px; margin: -4px 0 0; padding: 0 2px;
  font-size: 11px; line-height: 1.45; color: var(--sd-text-muted); }
.idm-wire svg { flex: none; color: var(--sd-inc-core); }
.idm-wire b { color: var(--sd-text-secondary); font-weight: 700; }
.idm-wire.warn { color: color-mix(in srgb, var(--sd-inc-arc) 82%, var(--sd-text)); }
.idm-wire.warn svg { color: var(--sd-inc-arc); }

/* decision-type deck */
.idm-deck { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.tcard { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
  padding: 10px 11px 9px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, transform 0.25s var(--sd-spring), box-shadow 0.25s; }
.tcard:hover { transform: translateY(-2px); border-color: var(--sd-inc-brd); }
.tcard .ti { color: var(--sd-text-muted); transition: color 0.2s, transform 0.3s var(--sd-spring); }
.tcard b { font-size: 11.5px; font-weight: 800; color: var(--sd-text); }
.tcard .tw { font-size: 9.5px; color: var(--sd-text-muted); }
.tcard.on { border-color: transparent; box-shadow: 0 6px 18px var(--sd-inc-soft);
  background: linear-gradient(var(--sd-surface-elevated), var(--sd-surface-elevated)) padding-box,
    var(--sd-inc-grad) border-box; }
.tcard.on .ti { color: var(--sd-inc-core); transform: scale(1.15); }
.tcard.grave .ti { color: color-mix(in srgb, var(--sd-inc-arc) 60%, var(--sd-text-muted)); }
.tcard.grave.on { box-shadow: 0 6px 18px var(--sd-inc-arc-soft);
  background: linear-gradient(var(--sd-surface-elevated), var(--sd-surface-elevated)) padding-box,
    linear-gradient(122deg, #ff9d94, var(--sd-inc-arc)) border-box; }
.tcard.grave.on .ti { color: var(--sd-inc-arc); }
.tick { position: absolute; top: 7px; right: 7px; display: grid; place-items: center;
  width: 16px; height: 16px; border-radius: 50%; color: #1a1206; background: var(--sd-inc-grad); }
.tcard.grave .tick { background: linear-gradient(122deg, #ff9d94, var(--sd-inc-arc)); color: #fff; }
[data-theme="light"] .tick { color: #fff8ec; }
.idm-gsep { display: flex; align-items: center; gap: 6px; margin: 6px 0 0; font-size: 8.5px;
  font-weight: 800; letter-spacing: 0.16em; color: color-mix(in srgb, var(--sd-inc-arc) 80%, var(--sd-text-muted)); }
.idm-gsep::after { content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--sd-inc-arc-soft), transparent); }

/* reason chips + input */
.idm-rchips { display: flex; flex-wrap: wrap; gap: 6px; }
.rchip { padding: 5px 11px; border-radius: 20px; cursor: pointer; font: inherit; font-size: 10.5px;
  font-weight: 700; color: var(--sd-text-secondary); background: var(--sd-surface);
  border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.rchip:hover { color: var(--sd-text); border-color: var(--sd-inc-brd); transform: translateY(-1px); }
.rchip.on { color: #1a1206; background: var(--sd-inc-grad); border-color: transparent; }
[data-theme="light"] .rchip.on { color: #fff8ec; }
.idm-inrow { display: flex; align-items: center; gap: 8px; }
.idm-inrow.tight { justify-content: space-between; margin-top: -2px; }
.idm-in { flex: 1; min-width: 0; padding: 8px 11px; border-radius: 11px; font: inherit; font-size: 12px;
  color: var(--sd-text); background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s; }
.idm-in:focus { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.idm-in::placeholder { color: var(--sd-text-muted); }
.cnt { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.cnt.hot { color: var(--sd-inc-arc); }
.hint { font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-muted); }
.hint.ok { color: var(--sd-inc-live); }

.idm-ta { width: 100%; resize: vertical; padding: 10px 12px; border-radius: 12px; font: inherit;
  font-size: 12.5px; line-height: 1.5; color: var(--sd-text); background: var(--sd-surface);
  border: 1px solid var(--sd-border); outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
.idm-ta:focus { border-color: var(--sd-inc-brd); box-shadow: 0 0 0 3px var(--sd-inc-soft); }
.idm-ta::placeholder { color: var(--sd-text-muted); }

/* arm row */
.idm-arm { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--sd-inc-arc) 45%, transparent);
  background: var(--sd-inc-arc-soft); }
.idm-arm.armed { border-style: solid; animation: idm-arm-pulse 2s ease-in-out infinite; }
@keyframes idm-arm-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 18px 0 var(--sd-inc-arc-soft); } }
.arm-sw { position: relative; flex: none; width: 40px; height: 22px; border-radius: 20px; cursor: pointer;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  transition: background 0.25s, border-color 0.25s; }
.arm-sw i { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--sd-text-muted); transition: transform 0.3s var(--sd-spring), background 0.25s; }
.idm-arm.armed .arm-sw { background: var(--sd-inc-arc);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 70%, transparent); }
.idm-arm.armed .arm-sw i { transform: translateX(18px); background: #fff; }
.arm-tx { font-size: 11px; line-height: 1.45; color: var(--sd-text-secondary); }
.arm-tx b { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; font-family: var(--sd-mono);
  color: color-mix(in srgb, var(--sd-inc-arc) 85%, var(--sd-text)); }

/* sealed plate */
.idm-seal { display: flex; flex-direction: column; align-items: center; gap: 9px; text-align: center;
  margin: auto 0; padding: 34px 22px; border: 1px dashed var(--sd-border); border-radius: 16px;
  background: var(--sd-surface); }
.seal-ring { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%;
  color: var(--sd-inc-dim); background: var(--sd-inc-dim-soft);
  border: 1px solid color-mix(in srgb, var(--sd-inc-dim) 40%, transparent); }
.seal-t { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-secondary); }
.seal-d { margin: 0; max-width: 380px; font-size: 12px; line-height: 1.55; color: var(--sd-text-muted); }
.seal-d b { color: var(--sd-text-secondary); }

/* ── ledger rail ── */
.idm-rail { grid-area: rail; min-height: 0; display: flex; flex-direction: column; gap: 10px;
  padding: 16px 16px 12px 16px; border-left: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent); }
.rail-h { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 9px; font-weight: 800;
  letter-spacing: 0.18em; color: var(--sd-inc-core); }
.rail-h em { font-style: normal; color: var(--sd-text-muted); letter-spacing: 0.1em; }

.ghost { position: relative; flex: none; padding: 10px 11px 9px; border-radius: 12px;
  border: 1px dashed var(--sd-inc-brd); background: var(--sd-inc-soft);
  transition: border-color 0.3s, background 0.3s; }
.ghost.ready { border-style: solid;
  border-color: color-mix(in srgb, var(--sd-inc-live) 50%, transparent);
  background: var(--sd-inc-live-soft); }
.ghost.ready.grave { border-color: color-mix(in srgb, var(--sd-inc-arc) 50%, transparent);
  background: var(--sd-inc-arc-soft); }
.g-stamp { position: absolute; top: 7px; right: 9px; font-size: 8px; font-weight: 800;
  letter-spacing: 0.18em; color: var(--sd-inc-core); transform: rotate(3deg); }
.ghost.ready .g-stamp { color: var(--sd-inc-live); }
.ghost.ready.grave .g-stamp { color: var(--sd-inc-arc); }

.rail-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
  padding-right: 2px; }
.rail-empty { margin: 14px 4px; font-size: 11px; line-height: 1.5; color: var(--sd-text-muted); }
.lrow { flex: none; padding: 9px 11px 8px; border-radius: 12px; background: var(--sd-surface);
  border: 1px solid var(--sd-border); animation: idm-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i) * 0.06s); }
@keyframes idm-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.lrow.shim { height: 74px; border-style: dashed; position: relative; overflow: hidden; }
.lrow.shim::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, var(--sd-inc-soft) 50%, transparent 70%);
  animation: idm-shim 1.4s linear infinite; }
@keyframes idm-shim { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

.l-top { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.ghost .l-top { padding-right: 46px; }
.l-seq { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-text-muted); }
.l-when { margin-left: auto; font-size: 8.5px; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.ghost .l-when { margin-left: 0; }
.kchip { padding: 1.5px 7px; border-radius: 20px; font-size: 8px; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; border: 1px solid transparent; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 132px; }
.kchip.core { color: var(--sd-inc-core); background: var(--sd-inc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-core) 36%, transparent); }
.kchip.hi { color: var(--sd-inc-hi); background: var(--sd-inc-hi-soft);
  border-color: color-mix(in srgb, var(--sd-inc-hi) 36%, transparent); }
.kchip.arc { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.kchip.live { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 36%, transparent); }
.kchip.dim { color: var(--sd-text-muted); background: var(--sd-surface-elevated); border-color: var(--sd-border); }
.l-text { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.l-text.ph { color: var(--sd-text-muted); font-style: italic; }
.l-why { margin: 4px 0 0; font-size: 9.5px; line-height: 1.4; letter-spacing: 0.02em;
  color: var(--sd-inc-core); font-family: var(--sd-mono);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.l-foot { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 10px;
  color: var(--sd-text-secondary); }
.l-dot { flex: none; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  font-style: normal; font-size: 7px; font-weight: 800; color: var(--sd-inc-hi);
  background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
[data-theme="light"] .l-dot { color: var(--sd-inc-deep); }
.l-foot span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.l-note { flex: none; margin-left: auto; color: var(--sd-text-muted); }

/* response roster — pinned to the rail floor so the column never trails off empty */
.rail-roster { flex: none; margin-top: auto; display: flex; flex-direction: column; gap: 8px;
  padding-top: 10px; border-top: 1px dashed var(--sd-border); }
.ros-h { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.16em; color: var(--sd-text-muted); }
.ros-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.seat { display: flex; align-items: center; gap: 7px; min-width: 0; padding: 7px 8px;
  border-radius: 10px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: idm-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.15s + var(--i) * 0.05s); }
.seat.hot { border-color: var(--sd-inc-brd); background: var(--sd-inc-soft); }
.seat.open { border-style: dashed; }
.seat.open .s-dot { color: var(--sd-text-muted); background: var(--sd-surface-elevated);
  border-color: var(--sd-border); }
.seat.open .s-tx b { color: var(--sd-text-muted); font-style: italic; font-weight: 600; }
.seat.crit { border-color: color-mix(in srgb, var(--sd-inc-arc) 45%, transparent);
  background: var(--sd-inc-arc-soft); }
.seat.crit .s-tx em, .seat.crit .s-tx b { color: var(--sd-inc-arc); }
.seat.crit .s-dot { color: var(--sd-inc-arc); background: transparent;
  border-color: color-mix(in srgb, var(--sd-inc-arc) 45%, transparent); }
.s-dot { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.02em;
  color: var(--sd-inc-hi); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd); }
[data-theme="light"] .s-dot { color: var(--sd-inc-deep); }
.s-tx { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.s-tx em { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em;
  font-family: var(--sd-mono); color: var(--sd-text-muted); }
.seat.hot .s-tx em { color: var(--sd-inc-core); }
.s-tx b { font-size: 11px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ros-meta { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 8px; font-weight: 700;
  letter-spacing: 0.14em; color: var(--sd-text-muted); }
.rm-team { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-transform: uppercase; }
.rm-ack { flex: none; margin-left: auto; padding: 1.5px 7px; border-radius: 20px;
  border: 1px solid transparent; }
.rm-ack.ok { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 36%, transparent); }
.rm-ack.bad { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.rm-esc { flex: none; color: var(--sd-inc-core); }

/* ── footer ── */
.idm-foot { grid-area: foot; display: flex; align-items: center; gap: 10px;
  padding: 13px 18px 13px 24px; border-top: 1px solid var(--sd-border); }
.idm-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 20px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-muted);
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); white-space: nowrap; }
.idm-stamp.ready { color: var(--sd-inc-live); background: var(--sd-inc-live-soft);
  border-color: color-mix(in srgb, var(--sd-inc-live) 40%, transparent); }
.idm-stamp.arm { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 40%, transparent); }
.idm-stamp.dead { color: var(--sd-inc-dim); }
.idm-oath { flex: 1; text-align: center; font-size: 8px; font-weight: 700; letter-spacing: 0.22em;
  color: var(--sd-text-muted); opacity: 0.75; white-space: nowrap; overflow: hidden; }
.idm-actions { display: flex; gap: 9px; }
.idm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; }
.idm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.idm-btn.primary { color: #1a1206; background: var(--sd-inc-grad); box-shadow: 0 8px 20px var(--sd-inc-soft); }
.idm-btn.primary.grave { background: linear-gradient(122deg, #ff9d94, var(--sd-inc-arc)); color: #fff;
  box-shadow: 0 8px 20px var(--sd-inc-arc-soft); }
[data-theme="light"] .idm-btn.primary { color: #fff8ec; }
.idm-btn:disabled { opacity: 0.55; cursor: default; }
.idm-spin { animation: sd-spin-slow 1s linear infinite; }

/* ── responsive: rail folds under the composer ── */
@media (max-width: 860px) {
  .idm { width: min(600px, 96vw); grid-template-columns: 1fr;
    grid-template-areas: 'head' 'main' 'rail' 'foot'; grid-template-rows: auto minmax(0, 1fr) auto auto; }
  .idm-rail { border-left: none; border-top: 1px solid var(--sd-border); max-height: 250px; }
  .idm-deck { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .idm-oath { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .idm-beam::after { animation: none !important; }
  html:not([data-cinematic="on"]) .sig-ring { animation: none !important; }
  html:not([data-cinematic="on"]) .idm-arm.armed { animation: none !important; }
  html:not([data-cinematic="on"]) .lrow { animation: none !important; }
  html:not([data-cinematic="on"]) .seat { animation: none !important; }
  html:not([data-cinematic="on"]) .lrow.shim::after { animation: none !important; }
  html:not([data-cinematic="on"]) .idm-spin { animation: none !important; }
}
</style>
