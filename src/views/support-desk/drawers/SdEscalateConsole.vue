<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="esc-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="esc sd-grain"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ambient -->
          <div class="esc-atm" aria-hidden="true"><span class="esc-orb" /><span class="esc-rays" /></div>

          <!-- ░░ HEADER ░░ -->
          <header class="esc-head">
            <span class="esc-ic"><Flame :size="19" /><i class="esc-ic-pulse" /></span>
            <div class="esc-titles">
              <p class="esc-eyebrow sd-mono">RAISE A TIER · ESCALATION</p>
              <h3>Escalate ticket</h3>
            </div>
            <button class="esc-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div v-if="ticket" class="esc-body">
            <!-- ticket identity -->
            <Motion class="esc-ticket"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(0)">
              <div class="et-row">
                <span class="et-no sd-mono"><Hash :size="12" />{{ ticket.ticket_number }}</span>
                <span class="et-pill" :style="{ '--pc': priColor(ticket.priority) }"><i />{{ priLabel(ticket.priority) }}</span>
                <span v-if="ticket.is_escalated" class="et-pill esc"><Flame :size="10" /> L{{ ticket.escalation_level }}</span>
              </div>
              <p class="et-subj">{{ ticket.subject }}</p>
              <span class="et-req"><Building2 :size="11" /> {{ ticket.organization_name || ticket.raised_by_name || ticket.contact_name || 'Internal request' }}</span>
            </Motion>

            <!-- ░░ TIER-LIFT LADDER (signature instrument) ░░ -->
            <Motion as="section" class="esc-ladder"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(1)">
              <div class="lad-head">
                <span class="lad-eyebrow sd-mono"><Layers :size="11" /> ESCALATION PATH</span>
                <span class="lad-route">{{ currentTier.name }} <ArrowRight :size="12" /> {{ targetTier.name }}</span>
              </div>
              <div class="lad-track">
                <div class="lad-rail">
                  <span class="lad-fill" :style="{ width: railFill }" />
                  <span class="lad-packet" :style="{ left: packetFrom, '--from': packetFrom, '--to': packetTo }" />
                </div>
                <div class="lad-nodes">
                  <div
                    v-for="(t, i) in TIERS" :key="t.key" class="lad-node"
                    :class="{ done: i < curIdx, cur: i === curIdx, target: i === tgtIdx, future: i > tgtIdx }"
                    :style="{ '--i': i }"
                  >
                    <span class="ln-dot"><component :is="t.icon" :size="15" /></span>
                    <span class="ln-name">{{ t.name }}</span>
                    <span class="ln-role">{{ t.role }}</span>
                  </div>
                </div>
              </div>
            </Motion>

            <!-- ░░ LIVE SLA CONTEXT ░░ -->
            <Motion class="esc-sla" :class="sla.state"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(2)">
              <span class="es-ring" :style="{ '--sd-p': sla.angle }"><i class="es-ring-core"><Timer :size="14" /></i></span>
              <div class="es-body">
                <span class="es-eyebrow sd-mono">SLA CLOCK</span>
                <b class="es-label">{{ sla.label }}</b>
                <span class="es-sub">{{ sla.sub }}</span>
              </div>
              <span class="es-risk" :class="sla.state">{{ sla.risk }}</span>
            </Motion>

            <!-- ░░ TYPE ░░ -->
            <Motion class="f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(3)">
              <span class="fl">Escalation type</span>
              <div class="seg type">
                <button type="button" class="seg-b" :class="{ on: form.type === 'hierarchical' }" @click="form.type = 'hierarchical'">
                  <ArrowUpFromLine :size="15" /><b>Hierarchical</b><i>Up the management chain</i>
                </button>
                <button type="button" class="seg-b" :class="{ on: form.type === 'functional' }" @click="form.type = 'functional'">
                  <Share2 :size="15" /><b>Functional</b><i>To a specialist team</i>
                </button>
              </div>
            </Motion>

            <!-- ░░ REASON ░░ -->
            <Motion as="label" class="f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(4)">
              <span class="fl">Reason <em>*</em><i class="opt">recorded on the ticket</i></span>
              <textarea v-model="form.reason" rows="3" class="fi" placeholder="Why does this need a higher tier? Be specific — it goes on the audit trail." />
              <div class="rchips">
                <button v-for="r in REASONS" :key="r" type="button" class="rchip" @click="addReason(r)">{{ r }}</button>
              </div>
            </Motion>

            <!-- unassigned-ticket gate: must give it an owner to escalate -->
            <Presence>
              <Motion v-if="needsOwner" class="esc-ownwarn"
                :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }"
                :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
                <UserPlus :size="14" /><span><b>This ticket is unassigned.</b> Assign an owner below to escalate it — a ticket nobody is working can't be raised a tier.</span>
              </Motion>
            </Presence>

            <!-- ░░ ROUTE ░░ -->
            <Motion class="f2" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(5)">
              <div class="f">
                <span class="fl"><Users :size="12" /> Route to team <i class="opt" :class="{ req: needsTeam }">{{ needsTeam ? 'required' : 'optional' }}</i></span>
                <SdSelect v-if="teams.length" v-model="form.team_id" :options="teamOpts" placeholder="No specific team" />
                <input v-else v-model="form.support_team" class="fi" type="text" placeholder="e.g. Infrastructure · Tier 2" />
                <span v-if="!teams.length" class="f-hint"><Info :size="11" /> No teams configured yet — type the destination team for the record.</span>
              </div>
              <div class="f">
                <span class="fl"><UserPlus :size="12" /> {{ hasOwner ? 'Reassign to' : 'Assign owner' }} <i class="opt" :class="{ req: needsOwner }">{{ needsOwner ? 'required' : 'optional' }}</i></span>
                <SdSelect v-if="reassignPool.length" v-model="form.assignee" :options="assigneeOpts" :placeholder="hasOwner ? 'Keep current owner' : 'Select an owner…'" />
                <span v-else class="f-hint"><Info :size="11" /> {{ form.team_id ? 'This team has no assignable members yet — pick another team or escalate hierarchically.' : 'No agents available to assign.' }}</span>
              </div>
            </Motion>

            <!-- ░░ REASSESS PRIORITY (ITIL impact × urgency) ░░ -->
            <Motion class="f reassess" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(6)">
              <button type="button" class="reassess-tog" :class="{ on: showReassess }" @click="showReassess = !showReassess">
                <Gauge :size="14" /> Reassess priority <span class="rt-meta">{{ derived ? priorityP(derived) : 'optional' }}</span>
                <ChevronDown :size="14" class="rt-chev" :class="{ up: showReassess }" />
              </button>
              <Presence>
                <Motion v-if="showReassess" class="reassess-body"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                  <div class="mtx-axis">
                    <span class="mtx-k">Impact</span>
                    <div class="seg sm">
                      <button v-for="o in IMPACT_URGENCY" :key="o.value" type="button" class="seg-b sm" :class="{ on: form.impact === o.value }" @click="form.impact = o.value">{{ o.label }}</button>
                    </div>
                  </div>
                  <div class="mtx-axis">
                    <span class="mtx-k">Urgency</span>
                    <div class="seg sm">
                      <button v-for="o in IMPACT_URGENCY" :key="o.value" type="button" class="seg-b sm" :class="{ on: form.urgency === o.value }" @click="form.urgency = o.value">{{ o.label }}</button>
                    </div>
                  </div>
                  <div class="derived" :class="{ active: applyPriority && priorityChange }">
                    <div class="dv-l">
                      <span class="dv-k">Derived priority</span>
                      <b v-if="derived" class="dv-v" :style="{ color: priColor(derived) }">{{ priorityP(derived) }} · {{ priLabel(derived) }}</b>
                      <b v-else class="dv-v muted">Set both axes</b>
                    </div>
                    <button type="button" class="dv-apply" :class="{ on: applyPriority }" :disabled="!priorityChange" @click="applyPriority = !applyPriority">
                      <Check v-if="applyPriority" :size="12" /> {{ applyPriority ? 'Will apply' : 'Apply' }}
                    </button>
                  </div>
                </Motion>
              </Presence>
            </Motion>

            <!-- ░░ NOTIFY CHAIN ░░ -->
            <Motion class="f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(7)">
              <span class="fl"><BellRing :size="12" /> Notify on escalation</span>
              <div class="notify">
                <button v-for="n in NOTIFY" :key="n.key" type="button" class="nb" :class="{ on: notify[n.key] }" @click="notify[n.key] = !notify[n.key]">
                  <span class="nb-tk"><Check :size="11" /></span><component :is="n.icon" :size="13" /> {{ n.label }}
                </button>
              </div>
            </Motion>

            <!-- ░░ SUMMARY PREVIEW ░░ -->
            <Motion class="esc-summary" :class="{ ready: valid }"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="ft(8)">
              <span class="sum-stamp" :class="{ ready: valid }">{{ valid ? 'READY' : 'DRAFT' }}</span>
              <span class="sum-eyebrow sd-mono"><Sparkles :size="11" /> ON ESCALATE</span>
              <ul class="sum-list">
                <li><ArrowUpFromLine :size="13" /> Lifts <b>{{ currentTier.name }} → {{ targetTier.name }}</b> · level L{{ ticket.escalation_level || 0 }} → L{{ (ticket.escalation_level || 0) + 1 }}</li>
                <li v-if="routeTeamName"><Users :size="13" /> Routed to <b>{{ routeTeamName }}</b></li>
                <li v-if="form.assignee"><UserPlus :size="13" /> Reassigned to <b>{{ assigneeName }}</b></li>
                <li v-if="applyPriority && priorityChange"><Gauge :size="13" /> Priority <b>{{ priLabel(ticket.priority) }} → {{ priLabel(derived) }}</b></li>
                <li v-if="notifyList.length"><BellRing :size="13" /> Notifies <b>{{ notifyList.join(', ') }}</b></li>
                <li class="rec"><Lock :size="13" /> Reason logged as an internal note &amp; activity</li>
              </ul>
            </Motion>

            <p v-if="error" class="esc-err"><AlertTriangle :size="14" /> {{ error }}</p>
          </div>

          <footer class="esc-foot">
            <button class="esc-btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" type="button" class="esc-btn primary" :disabled="saving || !valid"
              :whileHover="!saving && valid ? { y: -2, scale: 1.02 } : {}" :whileTap="!saving && valid ? { scale: 0.97 } : {}"
              @click="run">
              <component :is="saving ? LoaderCircle : Flame" :size="15" :class="{ spin: saving }" />
              {{ saving ? 'Escalating…' : `Escalate to ${targetTier.name}` }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Flame, Hash, Layers, ArrowRight, ArrowUpFromLine, Share2, Timer, Users, UserPlus,
  Gauge, ChevronDown, Check, BellRing, Sparkles, Lock, AlertTriangle, LoaderCircle, Building2,
  Headset, Wrench, Cpu, ShieldAlert, Bell, Megaphone, Info,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import {
  escalateTicket, updateTicket, assignTicket, listTicketAssignees, listTeams,
  IMPACT_URGENCY, priorityFromMatrix, priorityP, priorityLabel, priorityColor,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  me: { type: Object, default: () => ({}) },
  assignees: { type: Array, default: () => [] },   // [{ value, label }]
  now: { type: Number, default: () => Date.now() },
})
const emit = defineEmits(['close', 'done'])

const priColor = (v) => priorityColor(v)
const priLabel = (v) => priorityLabel(v)
const ft = (i) => ({ duration: 0.42, delay: 0.05 + i * 0.045, ease: [0.16, 1, 0.3, 1] })

/* ── tier ladder ── */
const TIERS = [
  { key: 't1', name: 'Tier 1', role: 'Front-line', icon: Headset },
  { key: 't2', name: 'Tier 2', role: 'Specialist', icon: Wrench },
  { key: 't3', name: 'Tier 3', role: 'Engineering', icon: Cpu },
  { key: 't4', name: 'Leadership', role: 'Management', icon: ShieldAlert },
]
const curIdx = computed(() => Math.min(TIERS.length - 1, props.ticket?.escalation_level || 0))
const tgtIdx = computed(() => Math.min(TIERS.length - 1, curIdx.value + 1))
const currentTier = computed(() => TIERS[curIdx.value])
const targetTier = computed(() => TIERS[tgtIdx.value])
const railFill = computed(() => `${(curIdx.value / (TIERS.length - 1)) * 100}%`)
const packetFrom = computed(() => `${(curIdx.value / (TIERS.length - 1)) * 100}%`)
const packetTo = computed(() => `${(tgtIdx.value / (TIERS.length - 1)) * 100}%`)

/* ── form ── */
const REASONS = ['SLA at risk', 'Beyond my expertise', 'Needs authority to resolve', 'VIP / key account', 'Blocked by dependency', 'Repeated reopen']
const blank = () => ({ type: 'hierarchical', reason: '', support_team: '', team_id: '', assignee: '', impact: '', urgency: '' })
const form = reactive(blank())
const teams = ref([])
const showReassess = ref(false)
const applyPriority = ref(false)
const NOTIFY = [
  { key: 'assignee', label: 'New owner', icon: Headset },
  { key: 'manager', label: 'Manager', icon: ShieldAlert },
  { key: 'requester', label: 'Requester', icon: Bell },
  { key: 'watchers', label: 'Watchers', icon: Megaphone },
]
const notify = reactive({ assignee: true, manager: true, requester: false, watchers: false })
const saving = ref(false)
const error = ref('')
const fetchedAssignees = ref([])

watch(() => props.open, (v) => {
  if (v) {
    Object.assign(form, blank())
    form.support_team = props.ticket?.support_team || ''
    form.team_id = props.ticket?.team_id || ''
    form.impact = props.ticket?.impact || ''
    form.urgency = props.ticket?.urgency || ''
    showReassess.value = false; applyPriority.value = false; error.value = ''
    notify.assignee = true; notify.manager = true; notify.requester = false; notify.watchers = false
    // Pull the ticket's routable people so reassignment works for any agent, not just managers.
    fetchedAssignees.value = []
    if (props.ticket?.id) {
      listTicketAssignees(props.ticket.id)
        .then(r => { fetchedAssignees.value = (r || []).filter(a => !a.is_current).map(a => ({ value: a.id, label: a.name })) })
        .catch(() => { /* requester-only or no roster — degrade to team-prop / route-to-team field */ })
    }
    // Load real support teams so "Route to team" is a true picker, not a blind text box.
    if (!teams.value.length) listTeams().then(r => { teams.value = r?.items || r || [] }).catch(() => { teams.value = [] })
  }
})

// Switching teams must drop a stale pick from the previous team (it may not belong to the new one).
watch(() => form.team_id, () => { form.assignee = '' })

const addReason = (r) => { form.reason = form.reason.trim() ? `${form.reason.trim()}. ${r}` : r }
// Merge the manager-supplied team roster with the ticket's own routable assignees (deduped),
// and ALWAYS drop the current owner — reassigning to whoever already owns it is a no-op loophole.
const rawAssignees = computed(() => {
  const seen = new Set(); const out = []
  const ownerId = String(props.ticket?.assigned_agent_id || '')
  for (const a of [...props.assignees, ...fetchedAssignees.value]) {
    const k = String(a.value)
    if (!a.value || seen.has(k) || (ownerId && k === ownerId)) continue
    seen.add(k); out.push(a)
  }
  return out
})
const hasOwner = computed(() => !!props.ticket?.assigned_agent_id)

// Real support teams → a true dropdown. "" = don't route to a specific team.
const teamOpts = computed(() => [{ value: '', label: 'No specific team' }, ...teams.value.map(t => ({ value: t.id, label: t.name }))])
const selectedTeam = computed(() => teams.value.find(t => String(t.id) === String(form.team_id)))
const routeTeamName = computed(() => selectedTeam.value?.name || form.support_team.trim())

// Reassign candidates. When a team is routed to, the owner must come FROM that team, so
// scope the pool to the team's working members (drop visibility-only collaborators + the
// current owner). With no team chosen (hierarchical), fall back to the general agent roster.
const ownerId = computed(() => String(props.ticket?.assigned_agent_id || ''))
const teamMemberOpts = computed(() => {
  const seen = new Set(); const out = []
  for (const m of (selectedTeam.value?.members || [])) {
    const k = String(m.id)
    if (!m.id || m.role === 'collaborator' || seen.has(k) || (ownerId.value && k === ownerId.value)) continue
    seen.add(k); out.push({ value: m.id, label: m.role === 'lead' ? `${m.name || 'Member'} · lead` : (m.name || 'Member') })
  }
  return out
})
const reassignPool = computed(() => (form.team_id ? teamMemberOpts.value : rawAssignees.value))
const assigneeOpts = computed(() => [
  { value: '', label: hasOwner.value ? 'Keep current owner' : 'Select an owner…' },
  ...reassignPool.value,
])
const assigneeName = computed(() => reassignPool.value.find(a => String(a.value) === String(form.assignee))?.label || '')

const derived = computed(() => priorityFromMatrix(form.impact, form.urgency))
const priorityChange = computed(() => !!derived.value && derived.value !== props.ticket?.priority)
const notifyList = computed(() => NOTIFY.filter(n => notify[n.key]).map(n => n.label))

/* ── live SLA context ── */
const sla = computed(() => {
  const t = props.ticket || {}
  if (['resolved', 'closed'].includes(t.status)) return { state: 'done', angle: '360deg', label: 'Closed', sub: 'No active clock', risk: 'Resolved' }
  if (t.sla_resolution_breached) return { state: 'breached', angle: '360deg', label: 'SLA breached', sub: 'Resolution target already passed', risk: 'Breached' }
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : null
  if (!due) return { state: 'none', angle: '20deg', label: 'No SLA clock', sub: 'No resolution target set', risk: 'Untimed' }
  const created = t.created_at ? new Date(t.created_at).getTime() : (due - 86400000)
  const total = Math.max(1, due - created), remain = due - props.now
  const frac = Math.max(0, Math.min(1, remain / total))
  const h = Math.abs(remain) / 3600000
  const txt = h >= 48 ? `${Math.round(h / 24)}d` : h >= 1 ? `${Math.round(h)}h` : `${Math.max(1, Math.round(Math.abs(remain) / 60000))}m`
  if (remain <= 0) return { state: 'breached', angle: '360deg', label: `${txt} overdue`, sub: 'Resolution target passed', risk: 'Breached' }
  const state = frac < 0.25 ? 'risk' : 'ok'
  return { state, angle: `${(1 - frac) * 360}deg`, label: `${txt} to target`, sub: `${Math.round((1 - frac) * 100)}% of SLA window used`, risk: state === 'risk' ? 'At risk' : 'On track' }
})

// Functional escalation = "route to a specialist team", so it MUST name a target team
// (picked from the dropdown, or typed when no teams are configured). Hierarchical just
// lifts the tier, so a team is optional there. Closes the "functional → nowhere" loophole.
const needsTeam = computed(() => form.type === 'functional')
const hasTeam = computed(() => !!form.team_id || !!form.support_team.trim())
// Assignment-before-action: a ticket nobody owns can't be escalated. If it's unassigned, the
// agent MUST give it an owner here (assign-then-escalate, one flow) — matches the backend guard.
const needsOwner = computed(() => !hasOwner.value)
const valid = computed(() => !!props.ticket && form.reason.trim().length >= 3
  && (!needsTeam.value || hasTeam.value)
  && (!needsOwner.value || !!form.assignee))

/* Map the free-text reason to the backend EscalationReason taxonomy (drives the
   reason-composition analytics on the escalated desk). Chip texts map exactly;
   anything else falls to keyword sniffing, then 'other'. */
const guessReasonCode = (txt) => {
  const s = (txt || '').toLowerCase()
  if (form.type === 'functional' && /expertis|specialist|beyond my/.test(s)) return 'expertise'
  if (/sla|breach|deadline|overdue/.test(s)) return 'sla_risk'
  if (/vip|key account|executive/.test(s)) return 'vip'
  if (/vendor|third.?party|supplier/.test(s)) return 'vendor_stall'
  if (/reopen|repeat|again/.test(s)) return 'repeat_incident'
  if (/customer (asked|request|demand)|client (asked|request)/.test(s)) return 'customer_request'
  if (/expertis|specialist|beyond my|authority/.test(s)) return 'expertise'
  if (/complex|difficult|blocked|dependency/.test(s)) return 'complexity'
  if (/major incident|outage/.test(s)) return 'major_incident'
  return 'other'
}

/* ── run ── */
const run = async () => {
  if (!valid.value || saving.value) return
  saving.value = true; error.value = ''
  const id = props.ticket.id
  try {
    // 1. classification reassessment (single PATCH — team routing now travels on the
    //    escalate call itself so escalated_to_team_id is stamped)
    const patch = {}
    if (applyPriority.value && priorityChange.value) patch.priority = derived.value
    if (form.impact && form.impact !== props.ticket.impact) patch.impact = form.impact
    if (form.urgency && form.urgency !== props.ticket.urgency) patch.urgency = form.urgency
    if (Object.keys(patch).length) await updateTicket(id, patch)

    // 2. reassign owner
    if (form.assignee) await assignTicket(id, { assigned_agent_id: form.assignee })

    // 3. ONE structured escalate — the backend persists type/reason(+code)/target team,
    //    stamps escalated_by, arms the receiving tier's ack clock and posts the
    //    [Escalation] internal note itself (replaces the old comment-smuggling wiring).
    await escalateTicket(id, {
      reason: form.reason.trim(),
      reason_code: guessReasonCode(form.reason),
      escalation_type: form.type,
      team_id: form.team_id || undefined,
      support_team: (!form.team_id && routeTeamName.value) ? routeTeamName.value : undefined,
    })
    emit('done')
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Escalation failed.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.esc-overlay { position: fixed; inset: 0; z-index: 2400; display: flex; justify-content: flex-end; background: rgba(4, 5, 6, 0.58); backdrop-filter: blur(7px); }
[data-theme="light"] .esc-overlay { background: rgba(40, 25, 10, 0.32); }
.esc { position: relative; width: min(520px, 100vw); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-border-strong); box-shadow: -24px 0 70px rgba(0, 0, 0, 0.55); }
.esc::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--sd-st-escalated), var(--sd-ember), var(--sd-danger)); z-index: 3; }

/* ambient */
.esc-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.esc-orb { position: absolute; top: -120px; right: -90px; width: 320px; height: 320px; border-radius: 50%; filter: blur(64px); opacity: 0.5;
  background: radial-gradient(circle, color-mix(in srgb, var(--sd-st-escalated) 38%, transparent), transparent 66%); animation: esc-orb 18s ease-in-out infinite; }
.esc-rays { position: absolute; inset: 0; opacity: 0.35;
  background: radial-gradient(rgba(249, 115, 22, 0.06) 1px, transparent 1px); background-size: 22px 22px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 60%); mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 60%); }

/* header */
.esc-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 13px; padding: 19px 22px 15px; border-bottom: 1px solid var(--sd-border); }
.esc-ic { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--sd-st-escalated); background: var(--sd-st-escalated-soft); border: 1px solid color-mix(in srgb, var(--sd-st-escalated) 30%, transparent); }
.esc-ic-pulse { position: absolute; inset: 0; border-radius: 13px; border: 1px solid var(--sd-st-escalated); animation: esc-ping 2.4s ease-out infinite; }
.esc-titles { flex: 1; min-width: 0; }
.esc-eyebrow { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-st-escalated); margin: 0 0 2px; }
.esc-head h3 { font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0; letter-spacing: -0.01em; }
.esc-x { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); flex-shrink: 0; transition: all 0.18s; }
.esc-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }

/* body */
.esc-body { position: relative; z-index: 1; flex: 1; overflow-y: auto; padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 15px; }

/* ticket identity */
.esc-ticket { padding: 13px 15px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.et-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 7px; }
.et-no { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.et-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--pc); background: color-mix(in srgb, var(--pc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--pc) 32%, transparent); }
.et-pill i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); }
.et-pill.esc { --pc: var(--sd-st-escalated); }
.et-subj { display: block; font-size: 14px; font-weight: 700; color: var(--sd-text); line-height: 1.35; margin-bottom: 6px; }
.et-req { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }

/* TIER LADDER */
.esc-ladder { padding: 16px 16px 18px; border-radius: 16px; background: linear-gradient(165deg, var(--sd-surface), var(--sd-panel)); border: 1px solid var(--sd-border-strong); overflow: hidden; }
.lad-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 18px; }
.lad-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.lad-route { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--sd-st-escalated); }
.lad-track { position: relative; padding: 0 6px; }
.lad-rail { position: absolute; left: 28px; right: 28px; top: 16px; height: 3px; border-radius: 3px; background: var(--sd-border-strong); overflow: visible; }
.lad-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--sd-amber), var(--sd-ember)); transition: width 0.5s var(--sd-spring); }
.lad-packet { position: absolute; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%; background: var(--sd-st-escalated);
  box-shadow: 0 0 12px var(--sd-st-escalated); animation: lad-lift 2.6s var(--sd-spring) infinite; }
.lad-nodes { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); }
.lad-node { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; opacity: 0.45;
  animation: esc-pop 0.5s var(--sd-spring) both; animation-delay: calc(0.15s + var(--i) * 0.08s); }
.lad-node.done, .lad-node.cur, .lad-node.target { opacity: 1; }
.ln-dot { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: var(--sd-text-muted); background: var(--sd-surface-elevated); border: 1.5px solid var(--sd-border-strong); transition: all 0.3s var(--sd-spring); z-index: 1; }
.lad-node.done .ln-dot { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.lad-node.cur .ln-dot { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; box-shadow: var(--sd-glow); }
[data-theme="light"] .lad-node.cur .ln-dot { color: #fff8ec; }
.lad-node.target .ln-dot { color: var(--sd-st-escalated); border-color: var(--sd-st-escalated); background: var(--sd-st-escalated-soft); animation: esc-target 1.8s ease-in-out infinite; }
.ln-name { font-size: 11px; font-weight: 700; color: var(--sd-text-secondary); }
.lad-node.cur .ln-name, .lad-node.target .ln-name { color: var(--sd-text); }
.ln-role { font-size: 9px; font-weight: 600; color: var(--sd-text-dim); text-transform: uppercase; letter-spacing: 0.04em; }

/* SLA */
.esc-sla { display: flex; align-items: center; gap: 13px; padding: 13px 15px; border-radius: 14px; --sc: var(--sd-steel);
  background: color-mix(in srgb, var(--sc) 8%, var(--sd-surface)); border: 1px solid color-mix(in srgb, var(--sc) 28%, var(--sd-border)); }
.esc-sla.ok { --sc: var(--sd-success); } .esc-sla.risk { --sc: var(--sd-warning); } .esc-sla.breached { --sc: var(--sd-danger); } .esc-sla.done { --sc: var(--sd-success); } .esc-sla.none { --sc: var(--sd-steel); }
.es-ring { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(from -90deg, var(--sc) 0 var(--sd-p), color-mix(in srgb, var(--sd-text) 11%, transparent) var(--sd-p) 360deg); transition: --sd-p 0.9s var(--sd-spring); }
.es-ring-core { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--sd-surface-elevated); color: var(--sc); }
.esc-sla.breached .es-ring { animation: sd-breach-flash 2.2s ease-out infinite; }
.es-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.es-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: var(--sc); }
.es-label { font-size: 15px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.es-sub { font-size: 11px; color: var(--sd-text-muted); }
.es-risk { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; padding: 4px 10px; border-radius: 999px; color: var(--sc); background: color-mix(in srgb, var(--sc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--sc) 30%, transparent); white-space: nowrap; }

/* form */
.f { display: flex; flex-direction: column; gap: 8px; }
.f2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; align-items: start; }
.f2 > .f:only-child { grid-column: 1 / -1; }
.f-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--sd-text-dim); line-height: 1.4; }
.esc-ownwarn { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.45;
  color: var(--sd-text-secondary); background: var(--sd-warning-soft); border: 1px solid var(--sd-amber-border); }
.esc-ownwarn svg { flex-shrink: 0; margin-top: 1px; color: var(--sd-warning); }
.esc-ownwarn span { min-width: 0; }
.esc-ownwarn b { color: var(--sd-warning); font-weight: 800; }
.fl { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.fl em { color: var(--sd-danger); font-style: normal; }
.fl .opt { margin-left: auto; font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 10.5px; }
.fl .opt.req { color: var(--sd-st-escalated); font-weight: 700; }
.fi { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; transition: border-color 0.18s, box-shadow 0.18s; }
.fi:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }

.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.seg.sm { display: flex; flex-wrap: wrap; gap: 6px; }
.seg-b { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 11px 13px; border-radius: 12px; cursor: pointer; font-family: inherit; text-align: left;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.18s var(--sd-spring); }
.seg-b b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.seg-b i { font-size: 10.5px; font-style: normal; color: var(--sd-text-dim); }
.seg-b svg { color: var(--sd-text-muted); }
.seg-b:hover { border-color: var(--sd-amber-border); }
.seg-b.on { color: var(--sd-st-escalated); background: var(--sd-st-escalated-soft); border-color: color-mix(in srgb, var(--sd-st-escalated) 45%, transparent); }
.seg-b.on b, .seg-b.on svg { color: var(--sd-st-escalated); }
.seg-b.sm { flex-direction: row; align-items: center; padding: 7px 13px; font-size: 12px; font-weight: 600; }
.seg-b.sm.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }

.rchips { display: flex; flex-wrap: wrap; gap: 6px; }
.rchip { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); transition: all 0.16s; }
.rchip:hover { color: var(--sd-st-escalated); border-color: color-mix(in srgb, var(--sd-st-escalated) 40%, transparent); border-style: solid; background: var(--sd-st-escalated-soft); }

/* reassess */
.reassess { gap: 0; }
.reassess-tog { display: flex; align-items: center; gap: 8px; width: 100%; padding: 11px 13px; border-radius: 11px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 650;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.18s; }
.reassess-tog:hover, .reassess-tog.on { color: var(--sd-text); border-color: var(--sd-amber-border); }
.rt-meta { margin-left: auto; font-family: var(--sd-mono); font-size: 11px; font-weight: 800; color: var(--sd-amber); }
.rt-chev { transition: transform 0.25s var(--sd-spring); color: var(--sd-text-muted); }
.rt-chev.up { transform: rotate(180deg); }
.reassess-body { overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding-top: 11px; }
.mtx-axis { display: flex; flex-direction: column; gap: 6px; }
.mtx-k { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); }
.derived { display: flex; align-items: center; gap: 12px; padding: 10px 13px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.25s; }
.derived.active { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.dv-l { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.dv-k { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); }
.dv-v { font-size: 15px; font-weight: 800; }
.dv-v.muted { font-size: 12px; font-weight: 600; color: var(--sd-text-dim); }
.dv-apply { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.18s; }
.dv-apply.on { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .dv-apply.on { color: #fff8ec; }
.dv-apply:disabled { opacity: 0.45; cursor: not-allowed; }

/* notify */
.notify { display: flex; flex-wrap: wrap; gap: 7px; }
.nb { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.18s; }
.nb-tk { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 5px; color: transparent; background: var(--sd-surface); border: 1.5px solid var(--sd-border-strong); transition: all 0.18s var(--sd-spring); }
.nb.on { color: var(--sd-text); border-color: var(--sd-amber-border); }
.nb.on .nb-tk { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .nb.on .nb-tk { color: #fff8ec; }

/* summary */
.esc-summary { position: relative; padding: 15px 16px; border-radius: 14px; border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); transition: all 0.3s var(--sd-spring); }
.esc-summary.ready { border-style: solid; border-color: color-mix(in srgb, var(--sd-st-escalated) 40%, transparent); background: color-mix(in srgb, var(--sd-st-escalated) 6%, var(--sd-surface-glass)); }
.sum-stamp { position: absolute; top: 13px; right: 14px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; padding: 3px 8px; border-radius: 6px; color: var(--sd-text-dim); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.sum-stamp.ready { color: var(--sd-st-escalated); background: var(--sd-st-escalated-soft); border-color: color-mix(in srgb, var(--sd-st-escalated) 32%, transparent); }
.sum-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; color: var(--sd-text-muted); }
.sum-list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.sum-list li { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--sd-text-secondary); }
.sum-list li svg { color: var(--sd-st-escalated); flex-shrink: 0; }
.sum-list li b { color: var(--sd-text); font-weight: 700; }
.sum-list li.rec { color: var(--sd-text-muted); }
.sum-list li.rec svg { color: var(--sd-text-dim); }

.esc-err { display: flex; align-items: center; gap: 7px; color: var(--sd-danger); font-size: 12.5px; margin: 0; padding: 9px 12px; border-radius: 9px; background: var(--sd-danger-soft); }

/* footer */
.esc-foot { position: relative; z-index: 2; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.esc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.esc-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.esc-btn.ghost:hover { color: var(--sd-text); }
.esc-btn.primary { color: #fff; background: linear-gradient(135deg, var(--sd-st-escalated), var(--sd-danger)); box-shadow: 0 10px 26px color-mix(in srgb, var(--sd-st-escalated) 30%, transparent); }
.esc-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.esc-btn .spin { animation: sd-spin-slow 1s linear infinite; }

@keyframes esc-orb { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-22px, 20px); } }
@keyframes esc-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes esc-pop { 0% { opacity: 0; transform: translateY(10px) scale(0.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes esc-target { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-st-escalated) 45%, transparent); } 50% { box-shadow: 0 0 0 7px transparent; } }
@keyframes lad-lift { 0% { left: var(--from, 0%); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: var(--to); opacity: 0; } }

@media (max-width: 520px) { .f2 { grid-template-columns: 1fr; } .seg.type { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .esc-orb,
  html:not([data-cinematic="on"]) .esc-ic-pulse,
  html:not([data-cinematic="on"]) .lad-packet,
  html:not([data-cinematic="on"]) .lad-node,
  html:not([data-cinematic="on"]) .lad-node.target .ln-dot,
  html:not([data-cinematic="on"]) .esc-sla.breached .es-ring,
  html:not([data-cinematic="on"]) .esc-btn .spin { animation: none !important; }
}
</style>
