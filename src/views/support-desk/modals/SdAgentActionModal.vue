<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="aam-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="aam" role="dialog" aria-modal="true" :style="{ '--acc': meta.accent }"
          :initial="{ opacity: 0, y: 30, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="aam-grain" aria-hidden="true" />
          <span class="aam-aura" aria-hidden="true" />
          <button class="aam-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <!-- morphing seal -->
          <div class="aam-seal" :class="{ done }">
            <span class="seal-ring" /><span class="seal-ring r2" />
            <span class="seal-core"><component :is="done ? CheckCircle2 : meta.icon" :size="25" /></span>
          </div>

          <p class="aam-eyebrow sd-mono">{{ meta.eyebrow }}</p>
          <h2 class="aam-title">{{ done ? meta.doneTitle : meta.title }}</h2>
          <p class="aam-sub">{{ done ? meta.doneSub : meta.sub }}</p>

          <!-- ticket chip -->
          <div v-if="!done" class="aam-chip">
            <span class="ac-no sd-mono">{{ ticket?.ticket_number }}</span>
            <span class="ac-subj">{{ ticket?.subject }}</span>
          </div>

          <!-- workflow strip -->
          <div v-if="!done" class="aam-flow">
            <template v-for="(s, i) in meta.flow" :key="s">
              <span class="af-step"><i class="af-dot">{{ i + 1 }}</i>{{ s }}</span>
              <span v-if="i < meta.flow.length - 1" class="af-arrow"><ChevronRight :size="13" /></span>
            </template>
          </div>

          <!-- ░░ BODY (mode-specific) ░░ -->
          <div v-if="!done" class="aam-scroll">
            <p v-if="err" class="aam-err"><AlertTriangle :size="13" /> {{ err }}</p>

            <!-- ASSIGN (take ownership) -->
            <template v-if="mode === 'assign'">
              <p class="aam-note"><UserCheck :size="12" /> You become the accountable owner. The ticket moves into your queue and the SLA clock keeps running.</p>
              <div class="aam-person on" style="cursor: default">
                <span class="ap-ava">{{ initials(me.name || me.email) }}</span>
                <span class="ap-body"><b>{{ me.name || me.email || 'You' }} (you)</b><i>{{ me.email || 'New owner' }}</i></span>
                <Shield :size="13" class="ap-flag" />
              </div>
              <p v-if="ticket?.assigned_agent_name" class="aam-note"><RotateCcw :size="12" /> Currently owned by <b>{{ ticket.assigned_agent_name }}</b> — assigning takes it over.</p>
            </template>

            <!-- ESCALATE -->
            <template v-else-if="mode === 'escalate'">
              <div class="aam-tier"><span class="tier from">L{{ ticket?.escalation_level || 0 }}</span><ChevronRight :size="15" /><span class="tier to">L{{ (ticket?.escalation_level || 0) + 1 }}</span></div>
              <section class="aam-f">
                <label class="aam-k">Why escalate? <em>*</em></label>
                <div class="chip-row">
                  <button v-for="r in ESCALATE_REASONS" :key="r" type="button" class="aam-chip-btn" :class="{ on: reasonText === r }" @click="reasonText = r">{{ r }}</button>
                </div>
                <textarea v-model="reasonText" rows="3" class="aam-inp" placeholder="What's blocked / breached / needs a senior? Kept on the record + posted as an internal note." />
              </section>
              <section class="aam-f">
                <label class="aam-k">Route to team <i>optional — functional escalation</i></label>
                <input v-model="escalateTeam" class="aam-inp" placeholder="e.g. Infrastructure L2" />
              </section>
            </template>

            <!-- DE-ESCALATE -->
            <template v-else-if="mode === 'deescalate'">
              <p class="aam-note"><ChevronDown :size="12" /> Lowers the tier (L{{ ticket?.escalation_level || 0 }} → L{{ Math.max(0, (ticket?.escalation_level || 0) - 1) }}). At L0 the ticket returns to In Progress.</p>
              <section class="aam-f">
                <label class="aam-k">Reason <i>optional — posted as an internal note</i></label>
                <textarea v-model="reasonText" rows="2" class="aam-inp" placeholder="Why is this no longer escalated?" />
              </section>
            </template>

            <!-- RESUME -->
            <template v-else-if="mode === 'resume'">
              <p class="aam-note"><Play :size="12" /> Lifts the hold and returns the ticket to active work. The paused time is credited — its SLA deadlines shift out by exactly the held duration.</p>
              <div v-if="ticket?.hold_reason || ticket?.hold_reason_code" class="aam-chip">
                <span class="ac-no sd-mono">HELD</span>
                <span class="ac-subj">{{ holdReasonLabel(ticket?.hold_reason_code) }}{{ ticket?.hold_reason ? ' — ' + ticket.hold_reason : '' }}</span>
              </div>
              <div class="aam-return">
                <span class="ar-lbl sd-mono">RETURNS TO</span>
                <ChevronRight :size="13" />
                <span class="ar-status">{{ resumeTargetLabel }}</span>
              </div>
              <section class="aam-f">
                <label class="aam-k">Resume note <i>optional — lands on the timeline</i></label>
                <textarea v-model="reasonText" rows="2" class="aam-inp" placeholder="e.g. CAB approved · parts arrived · blocker cleared…" />
              </section>
            </template>

            <!-- HOLD -->
            <template v-else-if="mode === 'hold'">
              <section class="aam-f">
                <label class="aam-k">Hold reason <em>*</em></label>
                <div class="chip-row">
                  <button v-for="r in HOLD_REASON_CODES" :key="r.value" type="button" class="aam-chip-btn" :class="{ on: holdCode === r.value }" @click="holdCode = r.value">{{ r.label }}</button>
                </div>
                <input v-model="reasonText" class="aam-inp" placeholder="Add detail — what exactly are we waiting on?" />
              </section>
              <section class="aam-f">
                <label class="aam-k">Release date <i>optional — the hold AUTO-RESUMES when it passes</i></label>
                <SdDateTimePicker v-model="holdUntil" :min="todayIso" placeholder="No release date — hold until reviewed" />
              </section>
              <p class="aam-note"><Pause :size="12" /> The SLA clock freezes while held. Without a release date the hold is flagged for review after {{ STALE_HOLD_DAYS }} days.</p>
            </template>

            <!-- HOLD-EXTEND (review an active hold) -->
            <template v-else-if="mode === 'hold-extend'">
              <div class="aam-return held">
                <span class="ar-lbl sd-mono">HELD {{ heldForLabel }}</span>
                <ChevronRight :size="13" />
                <span class="ar-status">{{ holdReasonLabel(ticket?.hold_reason_code) }}</span>
                <span v-if="ticket?.hold_review_count" class="ar-rev sd-mono">{{ ticket.hold_review_count }} review(s)</span>
              </div>
              <section class="aam-f">
                <label class="aam-k">New release date <i>auto-resumes when it passes</i></label>
                <SdDateTimePicker v-model="holdUntil" :min="todayIso" placeholder="Keep no release date" />
              </section>
              <section class="aam-f">
                <label class="aam-k">Re-code the reason <i>optional</i></label>
                <div class="chip-row">
                  <button v-for="r in HOLD_REASON_CODES" :key="r.value" type="button" class="aam-chip-btn" :class="{ on: holdCode === r.value }" @click="holdCode = holdCode === r.value ? '' : r.value">{{ r.label }}</button>
                </div>
              </section>
              <section class="aam-f">
                <label class="aam-k">Review note <i>optional — lands on the timeline</i></label>
                <textarea v-model="reasonText" rows="2" class="aam-inp" placeholder="Why does this stay on hold?" />
              </section>
              <p class="aam-note"><CalendarClock :size="12" /> This counts as a hold review — the stale-hold flag resets and the governance trail records it.</p>
            </template>

            <!-- REOPEN -->
            <template v-else-if="mode === 'reopen'">
              <section class="aam-f">
                <label class="aam-k">Verdict on the failed fix</label>
                <div class="chip-row">
                  <button v-for="r in REOPEN_REASON_CODES" :key="r.value" type="button" class="aam-chip-btn"
                    :class="{ on: reopenCode === r.value }" @click="reopenCode = reopenCode === r.value ? '' : r.value">{{ r.label }}</button>
                </div>
              </section>
              <section class="aam-f">
                <label class="aam-k">Why reopen? <em>*</em></label>
                <textarea v-model="reasonText" rows="3" class="aam-inp" placeholder="Describe what's still happening…" />
              </section>
              <p class="aam-note"><RotateCcw :size="12" /> Reopening re-arms a FRESH resolution SLA, preserves the failed fix on the record, and notifies everyone working the ticket.</p>
            </template>

            <!-- REMIND -->
            <template v-else-if="mode === 'remind'">
              <p class="aam-note"><BellRing :size="12" /> The requester is nudged that their reply is awaited. {{ ticket?.reminder_count || 0 }} reminder(s) sent so far.</p>
              <section class="aam-f">
                <label class="aam-k">Message <i>optional</i></label>
                <textarea v-model="remindMsg" rows="3" class="aam-inp" placeholder="A short, friendly nudge…" />
              </section>
            </template>

            <!-- MAJOR INCIDENT -->
            <template v-else-if="mode === 'incident'">
              <label class="aam-switch" :class="{ on: inc.is_major_incident }" @click="inc.is_major_incident = !inc.is_major_incident">
                <span class="sw-track"><span class="sw-knob" /></span>
                <span><b>Declare major incident</b><i>Raises visibility across the desk</i></span>
              </label>
              <section class="aam-f">
                <label class="aam-k">Business impact</label>
                <SdSelect v-model="inc.business_impact" :options="IMPACT_OPTS" />
              </section>
              <div class="aam-grid2">
                <section class="aam-f"><label class="aam-k">Affected users</label><input v-model.number="inc.affected_users" type="number" min="0" class="aam-inp" placeholder="0" /></section>
                <section class="aam-f"><label class="aam-k">Revenue impact</label><input v-model="inc.revenue_impact" class="aam-inp" placeholder="e.g. 2L / day" /></section>
              </div>
              <section class="aam-f">
                <label class="aam-k">War-room link</label>
                <input v-model="inc.war_room_url" class="aam-inp" placeholder="https://meet…" />
              </section>
            </template>

            <!-- RCA lives in the dedicated SdRcaConsole (Breached desk) — not here. -->

            <!-- ROUTE -->
            <template v-else-if="mode === 'route'">
              <p class="aam-note"><UserCheck :size="12" /> Hand the ticket to the best owner — they're notified instantly.</p>
              <div v-if="peopleLoading" class="aam-loading"><Loader :size="15" class="spin" /> Loading the routing pool…</div>
              <div v-else class="aam-people">
                <button v-for="p in routePool" :key="p.id" type="button" class="aam-person" :class="{ on: pickedAssignee === p.id }" @click="pickedAssignee = p.id">
                  <span class="ap-ava">{{ initials(p.name) }}</span>
                  <span class="ap-body"><b>{{ p.name }}{{ String(p.id) === String(me.id) ? ' (you)' : '' }}</b><i>{{ p.role || p.designation || p.email }}</i></span>
                  <Shield v-if="p.is_agent" :size="13" class="ap-flag" />
                  <Check v-if="pickedAssignee === p.id" :size="16" class="ap-pick" />
                </button>
                <p v-if="!routePool.length" class="aam-empty">No eligible owners to route to.</p>
              </div>
            </template>

            <!-- COLLABORATORS -->
            <template v-else-if="mode === 'collab'">
              <p class="aam-note"><UsersRound :size="12" /> Collaborators can see and work the ticket alongside the owner.</p>
              <div v-if="liveCollabs.length" class="aam-chips">
                <span v-for="c in liveCollabs" :key="c.id" class="aam-collab-chip">
                  <span class="acc-ava">{{ initials(c.name) }}</span>{{ c.name }}
                  <button :disabled="busy" @click="doRemoveCollab(c.id)"><X :size="11" /></button>
                </span>
              </div>
              <p v-else class="aam-empty">No collaborators yet.</p>
              <div class="aam-search"><Search :size="14" /><input v-model="collabQuery" placeholder="Type 2+ letters to search colleagues…" /></div>
              <div v-if="collabQuery.trim()" class="aam-people">
                <button v-for="p in collabMatches" :key="p.id" type="button" class="aam-person" :disabled="busy" @click="doAddCollab(p)">
                  <span class="ap-ava">{{ initials(p.name) }}</span>
                  <span class="ap-body"><b>{{ p.name }}</b><i>{{ [p.designation, p.department].filter(Boolean).join(' · ') || p.email }}</i></span>
                  <Plus :size="15" />
                </button>
                <p v-if="!collabMatches.length" class="aam-empty">No matches.</p>
              </div>
            </template>
          </div>

          <!-- footer -->
          <div v-if="!done" class="aam-foot">
            <button class="aam-btn ghost" :disabled="busy" @click="$emit('close')">{{ mode === 'collab' ? 'Done' : 'Cancel' }}</button>
            <Motion v-if="mode !== 'collab'" as="button" class="aam-btn primary" :whileTap="{ scale: 0.97 }" :disabled="busy || !canSubmit" @click="submit">
              <component :is="busy ? Loader : meta.icon" :size="15" :class="{ spin: busy }" /> {{ meta.cta }}
            </Motion>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, ChevronRight, ChevronDown, AlertTriangle, Pause, Play, RotateCcw, BellRing, Siren,
  UserCheck, UsersRound, Search, Plus, Shield, Check, Loader, CheckCircle2, Flame, CalendarClock,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdDateTimePicker from '../components/SdDateTimePicker.vue'
import {
  holdTicket, reopenTicket, remindTicket, setMajorIncident, assignTicket,
  reopenMyTicket, managerAssignTicket, listTicketAssignees, listTeamPeople,
  addTicketCollaborator, removeTicketCollaborator, addMyCollaborator, removeMyCollaborator,
  escalateTicket, deEscalateTicket, resumeTicket, extendHold, addTicketComment,
  IMPACT_URGENCY, HOLD_REASON_CODES, holdReasonLabel, STALE_HOLD_DAYS, statusLabel,
  REOPEN_REASON_CODES,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'hold' }, // hold|reopen|remind|incident|rca|route|collab|assign|escalate|deescalate|resume
  ticket: { type: Object, default: null },
  agent: { type: Boolean, default: true },
  me: { type: Object, default: () => ({ id: null }) },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const META_MAP = {
  assign: { eyebrow: 'TAKE OWNERSHIP', title: 'Assign to you', sub: 'Become the accountable owner — the ticket moves into your queue.', doneTitle: 'Assigned to you', doneSub: 'You own this ticket now — it’s in your queue and the SLA clock keeps running.', icon: UserCheck, accent: 'var(--sd-amber)', flow: ['Take ownership', 'Continue SLA', 'You can resolve'], cta: 'Assign to me' },
  escalate: { eyebrow: 'RAISE A TIER', title: 'Escalate this ticket', sub: 'Raise the level and flag for a senior. A reason is required and kept on the record.', doneTitle: 'Escalated', doneSub: 'Raised a tier — the assignee was notified and your reason is on the record.', icon: Flame, accent: 'var(--sd-st-escalated)', flow: ['Raise a tier', 'Capture reason', 'Notify senior'], cta: 'Escalate' },
  deescalate: { eyebrow: 'LOWER A TIER', title: 'De-escalate this ticket', sub: 'Bring the escalation back down a level once it’s under control.', doneTitle: 'De-escalated', doneSub: 'The tier was lowered and the change is logged.', icon: ChevronDown, accent: 'var(--sd-st-progress)', flow: ['Lower a tier', 'Update status', 'Log'], cta: 'De-escalate' },
  resume: { eyebrow: 'RESUME WORK', title: 'Resume from hold', sub: 'Lift the hold and return the ticket to active work.', doneTitle: 'Resumed', doneSub: 'The ticket is active again and its SLA clock resumed.', icon: Play, accent: 'var(--sd-success)', flow: ['Lift hold', 'Resume SLA', 'Back to work'], cta: 'Resume ticket' },
  hold: { eyebrow: 'SUSPEND · PAUSE WORK', title: 'Put ticket on hold', sub: 'Park it with a coded reason and a release date — the SLA clock freezes until it lifts.', doneTitle: 'On hold', doneSub: 'Suspended in the dock. It auto-resumes on its release date, or when you lift it.', icon: Pause, accent: 'var(--sd-st-hold)', flow: ['Freeze SLA', 'Set release', 'Auto-resume'], cta: 'Hold ticket' },
  'hold-extend': { eyebrow: 'HOLD REVIEW', title: 'Extend this hold', sub: 'Push the release date, re-code the reason, and record why it stays parked.', doneTitle: 'Hold extended', doneSub: 'Review recorded — the release schedule and reason are updated.', icon: CalendarClock, accent: 'var(--sd-st-hold)', flow: ['Review hold', 'New release', 'Log'], cta: 'Extend hold' },
  reopen: { eyebrow: 'REOPEN', title: 'Reopen this ticket', sub: 'Bring a resolved ticket back into the active queue.', doneTitle: 'Reopened', doneSub: 'The ticket is active again and the resolution SLA has restarted.', icon: RotateCcw, accent: 'var(--sd-warning)', flow: ['Reactivate', 'Restart SLA', 'Notify'], cta: 'Reopen ticket' },
  remind: { eyebrow: 'NUDGE', title: 'Send a reminder', sub: 'Notify the requester that their reply is awaited.', doneTitle: 'Reminder sent', doneSub: 'The requester has been nudged.', icon: BellRing, accent: 'var(--sd-st-pending)', flow: ['Compose', 'Notify requester', 'Log'], cta: 'Send reminder' },
  incident: { eyebrow: 'MAJOR INCIDENT', title: 'Capture business impact', sub: 'Raise visibility and record the impact of this incident.', doneTitle: 'Incident updated', doneSub: 'Impact captured and visibility raised.', icon: Siren, accent: 'var(--sd-danger)', flow: ['Flag', 'Capture impact', 'War-room'], cta: 'Save incident' },
  // (rca mode removed — root cause routes through the Breached desk's SdRcaConsole,
  //  which adds the SLA-anatomy evidence header + the coded breach-reason taxonomy)
  route: { eyebrow: 'ROUTE', title: 'Route this ticket', sub: 'Hand the ticket to the right owner.', doneTitle: 'Routed', doneSub: 'The new owner has been notified.', icon: UserCheck, accent: 'var(--sd-amber)', flow: ['Pick owner', 'Reassign', 'Notify'], cta: 'Assign owner' },
  collab: { eyebrow: 'COLLABORATE', title: 'Manage collaborators', sub: 'Add teammates who can see and work this ticket.', doneTitle: '', doneSub: '', icon: UsersRound, accent: 'var(--sd-amber)', flow: ['Search', 'Add', 'Work together'], cta: 'Done' },
}
const meta = computed(() => META_MAP[props.mode] || META_MAP.hold)

const ESCALATE_REASONS = ['SLA at risk', 'Needs senior expertise', 'Customer escalation', 'Blocked dependency', 'Repeated reopen']
const IMPACT_OPTS = [{ value: '', label: '—' }, ...IMPACT_URGENCY]

const busy = ref(false)
const done = ref(false)
const err = ref('')

/* per-mode state */
const reasonText = ref('')
const reopenCode = ref('')        // coded verdict on the failed fix (ReopenReason taxonomy)
const escalateTeam = ref('')
const holdUntil = ref('')
const holdCode = ref('')
const remindMsg = ref('')
const inc = reactive({ is_major_incident: true, business_impact: '', affected_users: null, revenue_impact: '', war_room_url: '' })
const pickedAssignee = ref('')
const routePool = ref([])
const peopleLoading = ref(false)
const collabPeople = ref([])
const collabQuery = ref('')
const liveCollabs = ref([])

const initials = (n) => ((n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const tid = computed(() => props.ticket?.id)
const todayIso = computed(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })

const resumeTargetLabel = computed(() => {
  const from = props.ticket?.held_from_status
  const OPEN_SET = ['open', 'in_progress', 'pending_customer', 'pending_vendor', 'escalated']
  if (from && OPEN_SET.includes(from)) return statusLabel(from)
  return props.ticket?.assigned_agent_id ? statusLabel('in_progress') : statusLabel('open')
})
const heldForLabel = computed(() => {
  const ms = Number(props.ticket?.time_on_hold_ms) || (props.ticket?.held_at ? Date.now() - new Date(props.ticket.held_at).getTime() : 0)
  const DAY = 86400000, HOUR = 3600000
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))}m`
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`
  return `${Math.round(ms / DAY)}d`
})

const canSubmit = computed(() => {
  switch (props.mode) {
    case 'hold': return !!holdCode.value
    case 'hold-extend': return !!(holdUntil.value || holdCode.value || reasonText.value.trim())
    case 'reopen': return reasonText.value.trim().length > 1
    case 'escalate': return reasonText.value.trim().length > 1
    case 'deescalate': return reasonText.value.trim().length >= 3   // backend requires a reason
    case 'assign': return !!props.me?.id
    case 'route': return !!pickedAssignee.value && String(pickedAssignee.value) !== String(props.ticket?.assigned_agent_id)
    default: return true
  }
})

const collabMatches = computed(() => {
  const term = collabQuery.value.trim().toLowerCase()
  if (!term) return []
  const taken = new Set([String(props.ticket?.assigned_agent_id), ...liveCollabs.value.map(c => String(c.id))])
  return collabPeople.value.filter(p => !taken.has(String(p.id)))
    .filter(p => `${p.name} ${p.email} ${p.designation || ''} ${p.department || ''}`.toLowerCase().includes(term)).slice(0, 6)
})

const toLocalDt = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const resetState = () => {
  busy.value = false; done.value = false; err.value = ''
  reasonText.value = ''; escalateTeam.value = props.ticket?.support_team || ''; holdUntil.value = ''; remindMsg.value = ''
  holdCode.value = ''; reopenCode.value = ''
  if (props.mode === 'hold-extend') {
    holdCode.value = props.ticket?.hold_reason_code || ''
    holdUntil.value = toLocalDt(props.ticket?.hold_until)
  }
  inc.is_major_incident = !!props.ticket?.is_major_incident; inc.business_impact = props.ticket?.business_impact || ''
  inc.affected_users = props.ticket?.affected_users ?? null; inc.revenue_impact = props.ticket?.revenue_impact || ''; inc.war_room_url = props.ticket?.war_room_url || ''
  pickedAssignee.value = ''; routePool.value = []; collabQuery.value = ''
  liveCollabs.value = [...(props.ticket?.collaborator_people || [])]
}

/* Server-driven typeahead — the backend search-gates /teams/people for agents
   (a 2+ char query, small page); bulk directory dumps are superuser-only now. */
let collabTimer = null
watch(collabQuery, (v) => {
  clearTimeout(collabTimer)
  const term = (v || '').trim()
  if (term.length < 2) { collabPeople.value = []; return }
  collabTimer = setTimeout(() => {
    listTeamPeople({ q: term, limit: 8 })
      .then(r => { collabPeople.value = r || [] })
      .catch(() => { collabPeople.value = [] })
  }, 220)
})
const loadRoutePool = async () => {
  peopleLoading.value = true
  // Primary = the ticket's eligible-assignee pool. The bulk-people fallback only
  // still works for superusers (agents get the search-gated 422 → empty list).
  try { routePool.value = await listTicketAssignees(tid.value) }
  catch { try { routePool.value = await listTeamPeople({ limit: 500 }) } catch { routePool.value = [] } }
  finally { peopleLoading.value = false }
}

watch(() => props.open, (o) => {
  if (o) {
    resetState()
    if (props.mode === 'route') loadRoutePool()
  }
}, { immediate: true })

const finish = (msg) => { done.value = true; toast.success(msg); setTimeout(() => emit('done', props.mode), 720) }

const submit = async () => {
  if (!canSubmit.value || busy.value) return
  busy.value = true; err.value = ''
  try {
    if (props.mode === 'assign') { await assignTicket(tid.value, { assigned_agent_id: props.me?.id }); finish('Assigned to you') }
    else if (props.mode === 'escalate') { await escalateTicket(tid.value, { reason: reasonText.value.trim(), support_team: escalateTeam.value.trim() || null }); finish('Ticket escalated') }
    else if (props.mode === 'deescalate') {
      // Reason is REQUIRED by the backend now; it posts the [De-escalation] note itself.
      await deEscalateTicket(tid.value, { reason: reasonText.value.trim() }); finish('Ticket de-escalated')
    }
    else if (props.mode === 'resume') { await resumeTicket(tid.value, reasonText.value.trim() ? { reason: reasonText.value.trim() } : {}); finish('Ticket resumed') }
    else if (props.mode === 'hold') {
      await holdTicket(tid.value, {
        hold_reason: reasonText.value.trim() || null,
        hold_reason_code: holdCode.value || null,
        hold_until: holdUntil.value || null,
      })
      finish('Ticket on hold')
    }
    else if (props.mode === 'hold-extend') {
      await extendHold(tid.value, {
        hold_until: holdUntil.value || null,
        hold_reason_code: holdCode.value || null,
        note: reasonText.value.trim() || null,
      })
      finish('Hold extended')
    }
    else if (props.mode === 'reopen') {
      const body = { reason: reasonText.value.trim(), reason_code: reopenCode.value || null }
      if (props.agent) await reopenTicket(tid.value, body)
      else await reopenMyTicket(tid.value, body)
      finish('Ticket reopened')
    } else if (props.mode === 'remind') { await remindTicket(tid.value, { message: remindMsg.value || null }); finish('Reminder sent') }
    else if (props.mode === 'incident') { await setMajorIncident(tid.value, { ...inc }); finish('Incident updated') }
    else if (props.mode === 'route') {
      if (props.agent) await assignTicket(tid.value, { assigned_agent_id: pickedAssignee.value })
      else await managerAssignTicket(tid.value, { assigned_agent_id: pickedAssignee.value })
      finish('Ticket routed')
    }
  } catch (e) { err.value = e?.response?.data?.detail || 'Action failed.'; busy.value = false }
}

/* collaborators — live add/remove, modal stays open */
const doAddCollab = async (p) => {
  busy.value = true; err.value = ''
  try {
    if (props.agent) await addTicketCollaborator(tid.value, { user_id: p.id })
    else await addMyCollaborator(tid.value, { user_id: p.id })
    liveCollabs.value.push({ id: p.id, name: p.name }); collabQuery.value = ''
    toast.success(`${p.name} added`); emit('done', 'collab-silent')
  } catch (e) { err.value = e?.response?.data?.detail || 'Could not add.'; toast.error(err.value) }
  finally { busy.value = false }
}
const doRemoveCollab = async (id) => {
  busy.value = true; err.value = ''
  try {
    if (props.agent) await removeTicketCollaborator(tid.value, id)
    else await removeMyCollaborator(tid.value, id)
    liveCollabs.value = liveCollabs.value.filter(c => String(c.id) !== String(id))
    toast.success('Collaborator removed'); emit('done', 'collab-silent')
  } catch (e) { err.value = e?.response?.data?.detail || 'Could not remove.'; toast.error(err.value) }
  finally { busy.value = false }
}
</script>

<style scoped>
.aam-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(60% 60% at 50% 30%, color-mix(in srgb, var(--acc, var(--sd-amber)) 12%, transparent), transparent 70%), rgba(4, 5, 6, 0.66); backdrop-filter: blur(10px) saturate(115%); }
[data-theme="light"] .aam-overlay { background: radial-gradient(60% 60% at 50% 30%, color-mix(in srgb, var(--acc, var(--sd-amber)) 10%, transparent), transparent 70%), rgba(40, 25, 10, 0.4); }
.aam { position: relative; width: min(520px, 96vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; padding: 26px 26px 0;
  border-radius: 22px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow-hover); --acc: var(--sd-amber); }
.aam-grain { position: absolute; inset: 0; opacity: 0.4; pointer-events: none; border-radius: 22px; background-image: radial-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px); background-size: 18px 18px; -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 70%); mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 70%); }
.aam-aura { position: absolute; top: -120px; left: 50%; transform: translateX(-50%); width: 320px; height: 240px; pointer-events: none; background: radial-gradient(circle, color-mix(in srgb, var(--acc) 30%, transparent), transparent 68%); filter: blur(18px); opacity: 0.55; }
.aam-x { position: absolute; top: 16px; right: 16px; z-index: 2; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.18s; }
.aam-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); transform: rotate(90deg); }

.aam-seal { position: relative; width: 64px; height: 64px; margin: 4px auto 14px; display: grid; place-items: center; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--acc) 40%, transparent); animation: aam-ring 3.4s ease-in-out infinite; }
.seal-ring.r2 { inset: -8px; border-style: dashed; opacity: 0.5; animation: aam-spin 14s linear infinite; }
.seal-core { position: relative; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 14%, var(--sd-surface)); border: 1px solid color-mix(in srgb, var(--acc) 32%, transparent); transition: all 0.4s var(--sd-spring); }
.aam-seal.done .seal-core { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 40%, transparent); transform: scale(1.06); }
.aam-seal.done .seal-ring { border-color: color-mix(in srgb, var(--sd-success) 40%, transparent); }
@keyframes aam-ring { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.08); opacity: 0.3; } }
@keyframes aam-spin { to { transform: rotate(360deg); } }

.aam-eyebrow { text-align: center; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--acc); margin: 0 0 4px; }
.aam-title { text-align: center; font-size: 20px; font-weight: 800; color: var(--sd-text); margin: 0 0 6px; letter-spacing: -0.01em; }
.aam-sub { text-align: center; font-size: 13px; color: var(--sd-text-muted); margin: 0 auto 16px; max-width: 40ch; line-height: 1.5; }

.aam-chip { display: flex; align-items: center; gap: 10px; padding: 10px 13px; border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 13px; }
.ac-no { font-size: 12px; font-weight: 700; color: var(--sd-amber); flex-shrink: 0; }
.ac-subj { font-size: 13px; font-weight: 600; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.aam-tier { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 2px 0 4px; }
.aam-tier .tier { display: grid; place-items: center; min-width: 54px; padding: 8px 14px; border-radius: 12px; font-family: var(--sd-mono); font-size: 17px; font-weight: 800; }
.aam-tier .tier.from { color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.aam-tier .tier.to { color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 42%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--acc) 28%, transparent); }
.aam-tier svg { color: var(--acc); }

.aam-flow { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
.af-step { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); padding: 5px 10px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.af-dot { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; font-size: 9px; font-weight: 800; color: #1a1206; background: var(--acc); font-style: normal; }
[data-theme="light"] .af-dot { color: #fff8ec; }
.af-arrow { color: var(--sd-text-dim); }

.aam-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 13px; padding: 2px 2px 4px; margin: 0 -2px; }
.aam-f { display: flex; flex-direction: column; gap: 7px; }
.aam-k { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--sd-text-dim); }
.aam-k em { color: var(--sd-danger); font-style: normal; }
.aam-k i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--sd-text-dim); opacity: 0.8; }
.aam-inp { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical;
  transition: border-color 0.22s var(--sd-spring), box-shadow 0.28s var(--sd-spring), background 0.22s, transform 0.22s var(--sd-spring); }
.aam-inp::placeholder { color: var(--sd-text-dim); }
.aam-inp:hover:not(:focus) { border-color: var(--sd-amber-border); }
.aam-inp:focus { outline: none; border-color: var(--sd-amber-border); background: var(--sd-surface-glass); box-shadow: 0 0 0 3px var(--sd-amber-soft), 0 6px 18px -8px var(--sd-fluid-glow); }
.aam-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.aam-chip-btn { font-size: 12px; font-weight: 600; padding: 6px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: all 0.16s; }
.aam-chip-btn:hover { border-color: var(--sd-amber-border); color: var(--sd-text); }
.aam-chip-btn.on { color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border-color: color-mix(in srgb, var(--acc) 40%, transparent); }
.aam-note { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: var(--sd-text-muted); margin: 0; line-height: 1.5; padding: 9px 11px; border-radius: 10px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.aam-return { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 12px; background: color-mix(in srgb, var(--sd-success) 7%, var(--sd-surface)); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.aam-return.held { background: color-mix(in srgb, var(--sd-st-hold) 9%, var(--sd-surface)); border-color: color-mix(in srgb, var(--sd-st-hold) 34%, transparent); }
.aam-return svg { color: var(--sd-text-dim); flex-shrink: 0; }
.ar-lbl { font-size: 9px; font-weight: 800; letter-spacing: 0.13em; color: var(--sd-text-muted); flex-shrink: 0; }
.ar-status { font-size: 13px; font-weight: 750; color: var(--sd-text); }
.aam-return:not(.held) .ar-status { color: var(--sd-success); }
.ar-rev { margin-left: auto; font-size: 9.5px; font-weight: 700; color: var(--sd-text-muted); padding: 3px 8px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.aam-err { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--sd-danger); margin: 0; }

.aam-switch { display: flex; align-items: center; gap: 11px; cursor: pointer; padding: 10px 12px; border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.aam-switch.on { border-color: color-mix(in srgb, var(--acc) 40%, transparent); background: color-mix(in srgb, var(--acc) 8%, transparent); }
.sw-track { flex-shrink: 0; width: 38px; height: 22px; border-radius: 999px; background: var(--sd-border-strong); position: relative; transition: background 0.22s; }
.aam-switch.on .sw-track { background: var(--acc); }
.sw-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.24s var(--sd-spring); }
.aam-switch.on .sw-knob { transform: translateX(16px); }
.aam-switch b { display: block; font-size: 13px; font-weight: 700; color: var(--sd-text); }
.aam-switch i { display: block; font-size: 11.5px; font-style: normal; color: var(--sd-text-muted); }

.aam-loading { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--sd-text-muted); padding: 16px; justify-content: center; }
.aam-people { display: flex; flex-direction: column; gap: 5px; }
.aam-person { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 11px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary); text-align: left; transition: all 0.16s; }
.aam-person:hover { border-color: var(--sd-amber-border); color: var(--sd-text); background: var(--sd-amber-soft); }
.aam-person.on { border-color: color-mix(in srgb, var(--acc) 45%, transparent); background: color-mix(in srgb, var(--acc) 10%, transparent); }
.aam-person:disabled { opacity: 0.5; cursor: not-allowed; }
.ap-ava { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; font-size: 11px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); flex-shrink: 0; }
.ap-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ap-body b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.ap-body i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.ap-flag { color: var(--sd-amber); }
.ap-pick { color: var(--acc); }
.aam-empty { text-align: center; font-size: 12.5px; color: var(--sd-text-dim); padding: 14px; margin: 0; }
.aam-search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.aam-search:focus-within { border-color: var(--sd-amber-border); }
.aam-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.aam-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.aam-collab-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); padding: 3px 5px 3px 8px; border-radius: 999px; }
.acc-ava { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 50%; font-size: 9px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); }
.aam-collab-chip button { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; cursor: pointer; background: none; border: none; color: var(--sd-text-dim); }
.aam-collab-chip button:hover { color: var(--sd-danger); }

.aam-foot { display: flex; justify-content: flex-end; gap: 9px; padding: 16px 0; margin-top: 4px; border-top: 1px solid var(--sd-border); flex-shrink: 0; background: var(--sd-surface-elevated); }
.aam-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 650; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: all 0.18s; }
.aam-btn.ghost:hover { border-color: var(--sd-border-strong); color: var(--sd-text); }
.aam-btn.primary { border: none; color: #1a1206; background: linear-gradient(135deg, color-mix(in srgb, var(--acc) 80%, #fff 6%), var(--acc)); box-shadow: 0 8px 22px color-mix(in srgb, var(--acc) 30%, transparent); }
[data-theme="light"] .aam-btn.primary { color: #fff8ec; }
.aam-btn.primary:hover:not(:disabled) { filter: brightness(1.06); }
.aam-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: aam-spin 1s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seal-ring,
  html:not([data-cinematic="on"]) .spin { animation: none; }
}
</style>
