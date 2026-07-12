<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="bam-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="bam sd-grain" role="dialog" aria-modal="true" :style="{ '--ac': meta.accent }"
          :initial="{ opacity: 0, y: 30, scale: 0.965 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="bam-accent" aria-hidden="true" />
          <span class="bam-grain-dots" aria-hidden="true" />
          <button class="bam-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <!-- ───────── CONFIGURE / REVIEW ───────── -->
          <template v-if="!done">
            <header class="bam-head">
              <Motion class="bam-ic" :initial="{ rotate: -18, scale: 0.6, opacity: 0 }" :animate="{ rotate: 0, scale: 1, opacity: 1 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
                <component :is="meta.icon" :size="20" />
                <span class="bam-ic-ring" aria-hidden="true" />
              </Motion>
              <div class="bam-titles">
                <p class="bam-eyebrow sd-mono">{{ meta.eyebrow }} · {{ total }} TICKET{{ total === 1 ? '' : 'S' }}</p>
                <h2 class="bam-title">{{ meta.title }}</h2>
                <p class="bam-sub">{{ meta.sub }}</p>
              </div>
            </header>

            <!-- process stepper -->
            <div class="bam-steps">
              <span class="step on"><span class="sd-dot" /> Configure</span>
              <ChevronRight :size="13" class="step-sep" />
              <span class="step" :class="{ on: readyCount > 0 }"><span class="sd-dot" /> Review impact</span>
              <ChevronRight :size="13" class="step-sep" />
              <span class="step"><span class="sd-dot" /> Apply</span>
            </div>

            <div class="bam-body">
              <!-- ══ LEFT: configuration ══ -->
              <div class="bam-config">
                <!-- ASSIGN -->
                <template v-if="mode === 'assign'">
                  <section class="f">
                    <label class="fl"><Users :size="12" /> Route ownership to <em>*</em></label>
                    <SdSelect v-if="assigneeOptions.length > 1" v-model="form.assignee" :options="assigneeOptions" placeholder="Choose an owner…" />
                    <div v-else class="who-card">
                      <span class="who-ava">{{ initials(me.name || me.email) }}</span>
                      <div class="who-meta"><b>{{ me.name || me.email || 'You' }}</b><i>{{ me.email }}</i></div>
                      <span class="who-tag">You</span>
                    </div>
                  </section>
                </template>

                <!-- STATUS -->
                <template v-else-if="mode === 'status'">
                  <section class="f">
                    <label class="fl"><RefreshCw :size="12" /> Move to status <em>*</em></label>
                    <SdSelect v-model="form.status" :options="statusOpts" placeholder="Choose a work state…" />
                    <p class="fhint"><Info :size="12" /> Resolve &amp; close run from their own buttons — this only moves a ticket between active work states.</p>
                  </section>
                  <!-- On Hold rides the governed hold action — reason taxonomy + release date land on every ticket -->
                  <section v-if="form.status === 'on_hold'" class="f">
                    <label class="fl"><Pause :size="12" /> Hold reason <i class="opt">coded — drives the Suspension Dock</i></label>
                    <div class="cause-row">
                      <button v-for="r in HOLD_REASON_CODES" :key="r.value" type="button" class="cause-pill"
                        :class="{ on: form.hold_reason_code === r.value }"
                        @click="form.hold_reason_code = form.hold_reason_code === r.value ? '' : r.value">{{ r.label }}</button>
                    </div>
                    <SdDateTimePicker v-model="form.hold_until" placeholder="Release date (optional) — auto-resumes when it passes" />
                  </section>
                  <!-- Pending Vendor rides the Relay Station dispatch — a bare set-status would land
                       every ticket as an unnamed, unchaseable hand-off with no overdue watch -->
                  <section v-if="form.status === 'pending_vendor'" class="f">
                    <label class="fl"><Truck :size="12" /> Vendor hand-off <em>*</em> <i class="opt">applied to every ticket · internal only</i></label>
                    <input v-model="form.vendor_name" class="fi" type="text" placeholder="Vendor name * — e.g. Acme Networks" />
                    <SdSelect v-model="form.vendor_wait_reason" :options="VENDOR_WAIT_REASONS" placeholder="Waiting on… (why is it blocked?)" />
                    <SdDateTimePicker v-model="form.vendor_due_at" placeholder="Expected back (ETA) — arms the overdue watch" />
                  </section>
                  <label class="f"><span class="fl">Note <i class="opt">internal · optional</i></span>
                    <textarea v-model="form.note" rows="2" class="fi" placeholder="Why the change? (kept on each ticket’s timeline)" /></label>
                </template>

                <!-- PRIORITY -->
                <template v-else-if="mode === 'priority'">
                  <section class="f">
                    <label class="fl"><Flag :size="12" /> Set priority to <em>*</em></label>
                    <div class="sev">
                      <Motion as="button" v-for="(p, i) in PRIORITIES" :key="p.value" type="button"
                        class="sev-chip" :class="{ on: form.priority === p.value }" :style="{ '--cc': priorityColor(p.value) }"
                        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.28, delay: 0.03 * i }"
                        :whileTap="{ scale: 0.95 }" @click="form.priority = p.value">
                        <span class="sev-bar" :style="{ height: (28 + i * 9) + '%' }" /> {{ p.label }}
                      </Motion>
                    </div>
                  </section>
                </template>

                <!-- ESCALATE -->
                <template v-else-if="mode === 'escalate'">
                  <section class="f">
                    <label class="fl"><Flame :size="12" /> Escalation type</label>
                    <div class="esc-seg">
                      <button type="button" class="esc-seg-b" :class="{ on: form.escalation_type === 'hierarchical' }" @click="form.escalation_type = 'hierarchical'">
                        <ArrowUpFromLine :size="14" /><b>Hierarchical</b><i>Up the management chain</i>
                      </button>
                      <button type="button" class="esc-seg-b" :class="{ on: form.escalation_type === 'functional' }" @click="form.escalation_type = 'functional'">
                        <Share2 :size="14" /><b>Functional</b><i>To a specialist team</i>
                      </button>
                    </div>
                  </section>
                  <label class="f"><span class="fl">Why escalate? <em>*</em></span>
                    <textarea v-model="form.reason" rows="3" class="fi" placeholder="What’s blocked / breached / needs a senior? Kept on every ticket + posted as an internal note." autofocus /></label>
                  <div class="cause-row">
                    <button v-for="r in ESC_REASONS" :key="r" type="button" class="cause-pill" @click="addReason(r)">{{ r }}</button>
                  </div>
                  <section class="f">
                    <label class="fl"><Users :size="12" /> Route to team <i class="opt" :class="{ req: form.escalation_type === 'functional' }">{{ form.escalation_type === 'functional' ? 'required' : 'optional' }}</i></label>
                    <SdSelect v-if="teams.length" v-model="form.team_id" :options="teamOpts" placeholder="No specific team" />
                    <input v-else v-model="form.support_team" class="fi" type="text" placeholder="e.g. Infrastructure · Tier 2" />
                    <p v-if="!teams.length" class="fhint"><Info :size="12" /> No teams configured yet — type the destination team for the record.</p>
                  </section>
                  <section class="f">
                    <label class="fl"><UserPlus :size="12" /> Reassign to <i class="opt">optional · applies to all</i></label>
                    <SdSelect v-if="escReassignPool.length" v-model="form.assignee" :options="escAssigneeOpts" placeholder="Keep current owners" />
                    <span v-else class="fhint"><Info :size="12" /> {{ form.team_id ? 'This team has no assignable members yet.' : 'No agents available to assign.' }}</span>
                  </section>
                  <p class="fhint"><Info :size="12" /> A ticket with no owner can only be escalated if you set one here — unassigned tickets are skipped otherwise.</p>
                </template>

                <!-- RESOLVE -->
                <template v-else-if="mode === 'resolve'">
                  <section class="f">
                    <label class="fl"><ShieldCheck :size="12" /> Resolution code <em>*</em></label>
                    <div class="code-grid">
                      <Motion as="button" v-for="(c, i) in RESOLUTION_CODES" :key="c.value" type="button"
                        class="code-chip" :class="{ on: form.resolution_code === c.value }"
                        :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.24, delay: 0.02 * i }"
                        :whileTap="{ scale: 0.96 }" @click="form.resolution_code = c.value">
                        <component :is="codeIcon(c.value)" :size="13" /> {{ c.label }}
                      </Motion>
                    </div>
                  </section>
                  <section class="f">
                    <label class="fl">Root cause <i class="opt">helps prevent repeats</i></label>
                    <div class="cause-row">
                      <button v-for="r in ROOT_CAUSES" :key="r.value" type="button" class="cause-pill"
                        :class="{ on: form.resolution_category === r.value }"
                        @click="form.resolution_category = form.resolution_category === r.value ? '' : r.value">{{ r.label }}</button>
                    </div>
                  </section>
                  <label class="f"><span class="fl">Resolution summary <em>*</em></span>
                    <textarea v-model="form.resolution_summary" rows="2" class="fi" placeholder="What was the fix? Applied to every resolved ticket + kept on the record." /></label>
                  <section class="f">
                    <label class="fl">Time spent <i class="opt">added to each ticket</i></label>
                    <div class="time-row">
                      <button v-for="m in [15, 30, 60, 120]" :key="m" type="button" class="time-pill" :class="{ on: form.time_spent_minutes === m }" @click="form.time_spent_minutes = m">{{ m < 60 ? m + 'm' : (m / 60) + 'h' }}</button>
                      <input type="number" min="0" v-model.number="form.time_spent_minutes" class="time-in" placeholder="min" />
                    </div>
                  </section>
                  <label class="f"><span class="fl">Reply to requester <i class="opt">public · optional</i></span>
                    <textarea v-model="form.note" rows="2" class="fi" placeholder="A message the requester sees with the resolution…" /></label>
                  <div class="toggles">
                    <button class="tog" :class="{ on: form.notify_customer }" @click="form.notify_customer = !form.notify_customer"><span class="tk"><Bell :size="10" /></span> Notify requester</button>
                    <button class="tog" :class="{ on: form.close }" @click="form.close = !form.close"><span class="tk"><Lock :size="10" /></span> Resolve &amp; close</button>
                  </div>
                </template>

                <!-- TAG -->
                <template v-else-if="mode === 'tag'">
                  <section class="f">
                    <label class="fl"><Tag :size="12" /> Tag to add <em>*</em></label>
                    <input v-model="form.tag" class="fi" type="text" maxlength="40"
                      placeholder="e.g. printer-outage, q3-audit, vip" autofocus />
                    <p class="fhint"><Info :size="12" /> One tag per run. Tickets that already carry it are skipped; works on sealed and archived records too.</p>
                  </section>
                </template>

                <!-- MERGE -->
                <template v-else-if="mode === 'merge'">
                  <section class="f">
                    <label class="fl"><Crown :size="12" /> Keep as master <em>*</em></label>
                    <p class="fhint"><Info :size="12" /> The master survives with the full history; the others fold into it, get closed and cross-noted.</p>
                    <div class="master-list">
                      <button v-for="t in tickets" :key="t.id" type="button" class="master-opt" :class="{ on: String(form.master_id) === String(t.id) }" @click="form.master_id = t.id">
                        <span class="mo-radio"><span /></span>
                        <span class="mo-no sd-mono">{{ t.ticket_number }}</span>
                        <span class="mo-subj">{{ t.subject }}</span>
                        <span class="mo-age">{{ ago(t.created_at) }}</span>
                      </button>
                    </div>
                  </section>
                  <label class="f"><span class="fl">Merge note <i class="opt">optional</i></span>
                    <input v-model="form.reason" class="fi" type="text" placeholder="e.g. Same outage reported by multiple users" /></label>
                </template>

                <!-- workflow consequences -->
                <ul class="bam-flow">
                  <li v-for="(s, i) in flow" :key="i">
                    <span class="wf-dot" /> {{ s.t }} <b v-if="s.b">{{ s.b }}</b>{{ s.post || '' }}
                  </li>
                </ul>
              </div>

              <!-- ══ RIGHT: impact ledger ══ -->
              <aside class="bam-impact">
                <div class="imp-head">
                  <div class="imp-gauge" :style="{ '--bam-p': gaugeAngle + 'deg' }">
                    <span class="ig-val">{{ readyCount }}</span>
                    <span class="ig-tot">/ {{ mode === 'merge' ? total - 1 : total }}</span>
                  </div>
                  <div class="imp-tally">
                    <p class="it-ready"><Check :size="13" /> {{ readyCount }} will be {{ meta.verb }}</p>
                    <p v-if="skipCount" class="it-skip"><Ban :size="12" /> {{ skipCount }} skipped</p>
                    <p class="it-cap">Only eligible tickets are touched.</p>
                  </div>
                </div>

                <div class="imp-list">
                  <Motion v-for="(e, i) in evaluated" :key="e.t.id" class="imp-row" :class="e.state"
                    :style="{ '--sc': statusColor(e.t.status) }"
                    :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: Math.min(0.04 * i, 0.4), ease: [0.16, 1, 0.3, 1] }">
                    <span class="ir-spine" aria-hidden="true" />
                    <div class="ir-main">
                      <div class="ir-top">
                        <span class="ir-no sd-mono">{{ e.t.ticket_number }}</span>
                        <SdPill kind="status" :value="e.t.status" />
                        <span class="ir-pri" :style="{ '--pc': priorityColor(e.t.priority) }" :title="priorityLabel(e.t.priority)" />
                      </div>
                      <p class="ir-subj">{{ e.t.subject || 'Untitled ticket' }}</p>
                      <p class="ir-who">
                        <span class="ir-ava">{{ initials(e.t.raised_by_name || e.t.contact_name || e.t.organization_name) }}</span>
                        {{ e.t.raised_by_name || e.t.contact_name || e.t.organization_name || 'Unknown requester' }}
                        <span class="ir-agent">· {{ e.t.assigned_agent_name || 'Unassigned' }}</span>
                      </p>
                    </div>
                    <span class="ir-badge" :class="e.state" :title="e.reason">
                      <component :is="e.state === 'master' ? Crown : e.state === 'ready' ? ArrowRight : e.state === 'pending' ? Clock : Ban" :size="12" />
                      <i>{{ e.reason }}</i>
                    </span>
                  </Motion>
                </div>
              </aside>
            </div>

            <p v-if="err" class="bam-err"><TriangleAlert :size="14" /> {{ err }}</p>

            <footer class="bam-foot">
              <span class="foot-note">
                <component :is="readyCount ? Zap : Info" :size="13" />
                {{ readyCount ? `${readyCount} ticket${readyCount === 1 ? '' : 's'} ready` : 'Nothing eligible yet' }}
              </span>
              <div class="foot-acts">
                <button class="bam-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
                <Motion as="button" class="bam-btn primary" :disabled="!valid" :whileHover="valid ? { y: -2 } : {}" :whileTap="valid ? { scale: 0.97 } : {}" @click="run">
                  <component :is="busy ? LoaderCircle : meta.icon" :size="15" :class="{ spin: busy }" />
                  {{ busy ? 'Working…' : `${meta.cta}${readyCount ? ' ' + readyCount : ''}` }}
                </Motion>
              </div>
            </footer>
          </template>

          <!-- ───────── RESULT ───────── -->
          <div v-else class="bam-result">
            <Motion class="bam-seal" :initial="{ scale: 0.4, opacity: 0 }" :animate="{ scale: 1, opacity: 1 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
              <span class="seal-ring" /><span class="seal-ring r2" />
              <span class="seal-core"><Check :size="28" /></span>
            </Motion>
            <p class="bam-eyebrow sd-mono center">{{ meta.eyebrow }} COMPLETE</p>
            <h2 class="bam-title center">{{ result.updated }} ticket{{ result.updated === 1 ? '' : 's' }} {{ meta.verb }}</h2>
            <p class="bam-sub center">
              <template v-if="result.skipped">{{ result.skipped }} skipped — see the breakdown below.</template>
              <template v-else>Every selected ticket was processed.</template>
            </p>
            <div class="res-list">
              <Motion v-for="(r, i) in result.rows" :key="i" class="res-row" :class="r.state"
                :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.26, delay: Math.min(0.035 * i, 0.4) }">
                <component :is="r.state === 'ok' ? CircleCheck : r.state === 'err' ? TriangleAlert : Ban" :size="14" class="rr-ic" />
                <span class="rr-no sd-mono">{{ r.ticket_number }}</span>
                <span class="rr-reason">{{ r.reason || (r.state === 'ok' ? meta.verb : '—') }}</span>
              </Motion>
            </div>
            <button class="bam-btn primary wide" @click="$emit('close')"><Check :size="15" /> Done</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, UserCheck, RefreshCw, Flag, Flame, CircleCheck, GitMerge, TriangleAlert, Info,
  LoaderCircle, Check, ArrowRight, Bell, Lock, Crown, ShieldCheck, Wrench, SearchX, Copy,
  Settings2, BookOpen, Ban, Clock, ChevronRight, Users, Zap, Lightbulb, ArrowUpFromLine, Share2, UserPlus,
  Pause, Truck, Tag,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdPill from '../components/SdPill.vue'
import SdDateTimePicker from '../components/SdDateTimePicker.vue'
import {
  bulkTickets, mergeTicket, listTeams, vendorDispatch, useCapabilities, fetchCapabilities,
  RESOLUTION_CODES, ROOT_CAUSES, PRIORITIES, HOLD_REASON_CODES, VENDOR_WAIT_REASONS,
  statusColor, priorityColor, statusLabel, priorityLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'status' },     // assign|status|priority|escalate|resolve|merge
  tickets: { type: Array, default: () => [] },    // full selected ticket objects
  me: { type: Object, default: () => ({}) },
  assignees: { type: Array, default: () => [] },  // [{ value, label }] team members (optional)
  now: { type: Number, default: () => Date.now() },
})
const emit = defineEmits(['close', 'done'])

/* ── form ── */
const blank = () => ({
  assignee: '', status: '', priority: '', reason: '', support_team: '', team_id: '', escalation_type: 'hierarchical',
  resolution_code: 'solved', resolution_category: '', resolution_summary: '',
  time_spent_minutes: 0, note: '', notify_customer: false, close: false, master_id: '',
  hold_reason_code: '', hold_until: '',
  vendor_name: '', vendor_wait_reason: '', vendor_due_at: '',
  tag: '',
})
const form = ref(blank())
const busy = ref(false)
const done = ref(false)
const err = ref('')
const teams = ref([])
const result = ref({ updated: 0, skipped: 0, rows: [] })

const ESC_REASONS = ['SLA at risk', 'Beyond my expertise', 'Needs authority to resolve', 'VIP / key account', 'Blocked by dependency', 'Repeated reopen']
const addReason = (r) => { form.value.reason = form.value.reason.trim() ? `${form.value.reason.trim()}. ${r}` : r }

watch(() => props.open, (v) => {
  if (!v) return
  // Hydrate the caps singleton the ownerTier precheck reads — sections that open
  // this modal without ever opening a drawer would otherwise leave a LEAD's caps
  // empty and every teammate row falsely skipped as "Owned by another agent".
  fetchCapabilities().catch(() => {})
  form.value = blank()
  busy.value = false; done.value = false; err.value = ''; result.value = { updated: 0, skipped: 0, rows: [] }
  if (props.mode === 'assign') form.value.assignee = props.me?.id || ''
  if (props.mode === 'merge') form.value.master_id = defaultMaster()
  if (props.mode === 'escalate' && !teams.value.length) listTeams().then(r => { teams.value = r?.items || r || [] }).catch(() => { teams.value = [] })
})

/* escalate — real team routing + team-scoped reassignment (mirrors the single-ticket console) */
const teamOpts = computed(() => [{ value: '', label: 'No specific team' }, ...teams.value.map(t => ({ value: t.id, label: t.name }))])
const selectedTeam = computed(() => teams.value.find(t => String(t.id) === String(form.value.team_id)))
const routeTeamName = computed(() => selectedTeam.value?.name || form.value.support_team.trim())
// reassign pool: the routed team's working members (drop collaborators), else the general roster
const escTeamMembers = computed(() => (selectedTeam.value?.members || [])
  .filter(m => m.role !== 'collaborator' && m.id)
  .map(m => ({ value: m.id, label: m.role === 'lead' ? `${m.name || 'Member'} · lead` : (m.name || 'Member') })))
const escReassignPool = computed(() => (form.value.team_id ? escTeamMembers.value : (props.assignees || [])))
const escAssigneeOpts = computed(() => [{ value: '', label: 'Keep current owners' }, ...escReassignPool.value])
const escAssigneeName = computed(() => escReassignPool.value.find(a => String(a.value) === String(form.value.assignee))?.label || '')
// switching the routed team drops a stale pick that may not belong to the new team
watch(() => form.value.team_id, () => { form.value.assignee = '' })

/* ── action metadata ── */
const META = {
  assign:   { eyebrow: 'ASSIGN',   title: 'Assign tickets',   sub: 'Route ownership so someone is accountable before work begins.', icon: UserCheck,   accent: 'var(--sd-amber)',         cta: 'Assign',        verb: 'assigned' },
  status:   { eyebrow: 'STATUS',   title: 'Update status',    sub: 'Move tickets between active work states — the workflow is enforced per ticket.', icon: RefreshCw, accent: 'var(--sd-st-progress)', cta: 'Update',        verb: 'updated' },
  priority: { eyebrow: 'PRIORITY', title: 'Set priority',     sub: 'Re-rank severity; SLA targets recompute where no response has been logged yet.', icon: Flag,    accent: 'var(--sd-warning)',       cta: 'Set priority',  verb: 'reprioritised' },
  escalate: { eyebrow: 'ESCALATE', title: 'Escalate tickets', sub: 'Raise a level and flag for a senior. A reason is required and kept on the record.', icon: Flame, accent: 'var(--sd-st-escalated)',  cta: 'Escalate',      verb: 'escalated' },
  resolve:  { eyebrow: 'RESOLVE',  title: 'Resolve tickets',  sub: 'Close the loop with an ITIL resolution. Only assigned tickets can be resolved.', icon: CircleCheck, accent: 'var(--sd-success)',   cta: 'Resolve',       verb: 'resolved' },
  merge:    { eyebrow: 'MERGE',    title: 'Merge duplicates', sub: 'Fold duplicates into one master ticket and close the rest.', icon: GitMerge,        accent: 'var(--sd-amber)',         cta: 'Merge',         verb: 'merged' },
  tag:      { eyebrow: 'TAG',      title: 'Add a tag',        sub: 'Stamp one label on every selected ticket — filters, reports and sweeps read it.', icon: Tag, accent: 'var(--sd-amber)',    cta: 'Add tag',       verb: 'tagged' },
}
const meta = computed(() => META[props.mode] || META.status)

/* ── options ── */
const WORK_KEYS = ['open', 'in_progress', 'pending_customer', 'pending_vendor', 'on_hold']
const statusOpts = WORK_KEYS.map(k => ({ value: k, label: statusLabel(k), dot: statusColor(k) }))
const assigneeOptions = computed(() => {
  const out = []
  const meId = props.me?.id
  if (meId) out.push({ value: meId, label: `${props.me.name || props.me.email || 'You'} · you` })
  for (const a of props.assignees) if (String(a.value) !== String(meId)) out.push(a)
  return out
})
const assigneeLabel = computed(() => assigneeOptions.value.find(o => String(o.value) === String(form.value.assignee))?.label || 'the new owner')

const CODE_ICONS = {
  solved: ShieldCheck, workaround: Wrench, no_fault_found: SearchX, duplicate: Copy,
  not_reproducible: SearchX, configuration: Settings2, known_error: BookOpen, cancelled: Ban,
}
const codeIcon = (v) => CODE_ICONS[v] || Lightbulb

/* ── helpers ── */
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const initials = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—'
const ago = (iso) => {
  if (!iso) return ''
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m old`
  if (s < 86400) return `${Math.floor(s / 3600)}h old`
  return `${Math.floor(s / 86400)}d old`
}
function defaultMaster() {
  if (!props.tickets.length) return ''
  return [...props.tickets].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].id
}

/* ── per-ticket eligibility (mirrors the backend workflow guard) ── */
const ready = (reason) => ({ state: 'ready', reason })
const skip = (reason) => ({ state: 'skip', reason })
const pending = (reason) => ({ state: 'pending', reason })
/* Owner-tier (backend _BULK_OWNER_TIER): assignee ∪ collaborator ∪ team lead ∪
   admin; unassigned rows are claim-eligible triage. The backend skips rows
   outside the tier per-ticket — mirror it here so the impact ledger says
   'Owned by another agent' up front instead of promising 'ready' and failing. */
const capsBulk = useCapabilities()
const ownerTier = (t) => {
  if (capsBulk.isAdmin) return true
  const my = String(props.me?.id || '')
  if (!t.assigned_agent_id || String(t.assigned_agent_id) === my) return true
  if ((t.collaborators || []).map(String).includes(my)) return true
  return (capsBulk.leadTeamIds || []).map(String).includes(String(t.team_id))
}
const notMine = (t) => skip(`Owned by ${t.assigned_agent_name || 'another agent'}`)
function evalTicket(t) {
  const f = form.value
  switch (props.mode) {
    case 'assign':
      if (isTerminal(t)) return skip('Resolved/closed')
      if (String(t.assigned_agent_id) === String(f.assignee)) return skip('Already owns it')
      if (!ownerTier(t)) return notMine(t)
      return ready('Will be assigned')
    case 'status':
      if (!f.status) return pending('Choose a status')
      if (isTerminal(t)) return skip('Reopen first')
      if (t.status === f.status) return skip(`Already ${statusLabel(f.status)}`)
      if (f.status === 'in_progress' && !t.assigned_agent_id) return skip('Assign an owner first')
      if (!ownerTier(t)) return notMine(t)
      return ready(`→ ${statusLabel(f.status)}`)
    case 'priority':
      if (isTerminal(t)) return skip('Resolved/closed')
      if (!f.priority) return pending('Choose a priority')
      if (t.priority === f.priority) return skip(`Already ${priorityLabel(f.priority)}`)
      if (!ownerTier(t)) return notMine(t)
      return ready(`→ ${priorityLabel(f.priority)}`)
    case 'escalate':
      if (isTerminal(t)) return skip('Resolved/closed')
      if (!t.assigned_agent_id && !f.assignee) return skip('Assign an owner first')
      if (!ownerTier(t)) return notMine(t)
      return ready(`L${t.escalation_level || 0} → L${(t.escalation_level || 0) + 1}`)
    case 'resolve':
      if (isTerminal(t)) return skip('Already resolved/closed')
      if (!t.assigned_agent_id) return skip('Assign an owner first')
      if (!ownerTier(t)) return notMine(t)
      return ready(f.close ? 'Resolve & close' : 'Will resolve')
    case 'merge':
      if (String(t.id) === String(f.master_id)) return { state: 'master', reason: 'Master · survives' }
      if (t.merged_into_id && String(t.merged_into_id) === String(f.master_id)) return skip('Already merged')
      if (!ownerTier(t)) return notMine(t)
      return ready('Folds into master')
    case 'tag': {
      // add_tag is team-open server-side (excluded from _BULK_OWNER_TIER) — no ownerTier gate.
      const tagv = f.tag.trim()
      if (!tagv) return pending('Type a tag')
      if ((t.tags || []).includes(tagv)) return skip('Tag already present')
      return ready(`+ ${tagv}`)
    }
    default:
      return pending('')
  }
}
const evaluated = computed(() => props.tickets.map(t => ({ t, ...evalTicket(t) })))
const total = computed(() => props.tickets.length)
const readyCount = computed(() => evaluated.value.filter(e => e.state === 'ready').length)
const skipCount = computed(() => evaluated.value.filter(e => e.state === 'skip').length)
const gaugeAngle = computed(() => {
  const denom = props.mode === 'merge' ? Math.max(1, total.value - 1) : Math.max(1, total.value)
  return Math.round((readyCount.value / denom) * 360)
})

/* ── workflow consequences ── */
const flow = computed(() => {
  const f = form.value
  switch (props.mode) {
    case 'assign': return [
      { t: 'Ownership is routed to', b: assigneeLabel.value },
      { t: 'The new owner is notified instantly' },
      { t: 'Surfaces under their', b: 'My Tickets', post: ' queue' },
      { t: 'Resolved / closed tickets are skipped' },
    ]
    case 'status': {
      const rows = [{ t: 'Each eligible ticket moves to', b: f.status ? statusLabel(f.status) : 'the chosen state' }]
      if (['pending_customer', 'pending_vendor', 'on_hold'].includes(f.status))
        rows.push({ t: 'The SLA clock', b: 'freezes', post: ' — paused time is credited back on exit' })
      if (f.status === 'pending_vendor')
        rows.push({ t: 'Dispatched to', b: f.vendor_name.trim() || 'the vendor', post: ' — the overdue watch arms at the ETA' })
      if (f.status === 'on_hold')
        rows.push({ t: f.hold_until ? 'Auto-resumes at the release date' : 'No release date — flagged for review in 7 days' })
      if (f.status === 'in_progress') rows.push({ t: 'In Progress requires an', b: 'assigned owner' })
      rows.push({ t: 'The change is logged on every timeline' })
      return rows
    }
    case 'priority': return [
      { t: 'Severity becomes', b: f.priority ? priorityLabel(f.priority) : 'the chosen level' },
      { t: 'SLA targets recompute if not yet responded' },
      { t: 'Logged on each ticket’s timeline' },
    ]
    case 'escalate': return [
      { t: f.escalation_type === 'functional' ? 'Functional escalation' : 'Hierarchical escalation', b: '+1 level', post: ' on each ticket' },
      { t: 'Your reason is kept on every ticket’s record' },
      { t: routeTeamName.value ? 'Routed to ' : 'Stays with the current team', b: routeTeamName.value || '' },
      f.assignee ? { t: 'Owner set to ', b: escAssigneeName.value } : { t: 'Unassigned tickets are skipped — they need an owner' },
    ]
    case 'resolve': return [
      { t: 'The SLA clock', b: 'stops', post: ' on resolve' },
      { t: 'Logged with ITIL code', b: resolutionLabelLocal(f.resolution_code) },
      { t: `Requester ${f.notify_customer ? 'is notified' : 'sees it in their portal'}` },
      { t: 'Moves to', b: f.close ? 'Closed' : 'Resolved' },
    ]
    case 'merge': return [
      { t: `${Math.max(0, readyCount.value)} duplicate(s) fold into the master` },
      { t: 'Duplicates are', b: 'closed', post: ' + cross-noted' },
      { t: 'The master keeps the full conversation' },
    ]
    default: return []
  }
})
const resolutionLabelLocal = (v) => RESOLUTION_CODES.find(r => r.value === v)?.label || v

/* ── validity ── */
const valid = computed(() => {
  if (busy.value) return false
  const f = form.value
  switch (props.mode) {
    case 'assign': return !!f.assignee && readyCount.value > 0
    // A vendor hand-off needs a named vendor — otherwise the Relay Station gets N unchaseable rows.
    case 'status': return !!f.status && readyCount.value > 0
      && (f.status !== 'pending_vendor' || f.vendor_name.trim().length >= 2)
    case 'priority': return !!f.priority && readyCount.value > 0
    case 'escalate': {
      // functional escalation = route to a specialist team → a team is mandatory
      const teamOk = f.escalation_type !== 'functional' || !!f.team_id || !!f.support_team.trim()
      return f.reason.trim().length >= 3 && teamOk && readyCount.value > 0
    }
    case 'resolve': return !!f.resolution_code && f.resolution_summary.trim().length >= 3 && readyCount.value > 0
    case 'merge': return !!f.master_id && readyCount.value >= 1
    case 'tag': return f.tag.trim().length >= 2 && readyCount.value > 0
    default: return false
  }
})

/* ── submit ── */
function buildPayload(ids) {
  const f = form.value
  switch (props.mode) {
    case 'assign': return { ids, action: 'assign', assigned_agent_id: f.assignee }
    case 'status':
      // On Hold goes through the governed 'hold' action so the reason taxonomy + release
      // date land on every ticket (bare set_status leaves the Suspension Dock blind).
      if (f.status === 'on_hold') return {
        ids, action: 'hold',
        hold_reason: f.note.trim() || undefined,
        hold_reason_code: f.hold_reason_code || undefined,
        hold_until: f.hold_until || undefined,
      }
      return { ids, action: 'set_status', status: f.status, note: f.note.trim() || undefined }
    case 'priority': return { ids, action: 'set_priority', priority: f.priority }
    case 'escalate': {
      const teamName = selectedTeam.value?.name || f.support_team.trim()
      const typeLbl = f.escalation_type === 'functional' ? 'Functional' : 'Hierarchical'
      const reason = `${typeLbl}: ${f.reason.trim()}` + (teamName ? ` · routed to ${teamName}` : '')
      return { ids, action: 'escalate', reason, support_team: teamName || undefined, team_id: f.team_id || undefined, assigned_agent_id: f.assignee || undefined }
    }
    case 'resolve': return {
      ids, action: f.close ? 'close' : 'resolve', resolution_code: f.resolution_code,
      resolution_category: f.resolution_category || undefined,
      resolution_summary: f.resolution_summary.trim() || undefined,
      time_spent_minutes: f.time_spent_minutes || undefined,
      note: f.note.trim() || undefined, notify_customer: f.notify_customer,
    }
    case 'tag': return { ids, action: 'add_tag', tag: f.tag.trim() }
    default: return { ids, action: props.mode }
  }
}
const shortId = (id) => String(id || '').slice(0, 8)

const run = async () => {
  if (!valid.value) return
  busy.value = true; err.value = ''
  try {
    if (props.mode === 'merge') {
      const masterId = form.value.master_id
      const master = props.tickets.find(t => String(t.id) === String(masterId))
      const dups = evaluated.value.filter(e => e.state === 'ready').map(e => e.t)
      const rows = []; let updated = 0
      for (const d of dups) {
        try {
          await mergeTicket(d.id, { target_id: masterId, comment: form.value.reason.trim() || undefined })
          updated++; rows.push({ ticket_number: d.ticket_number, state: 'ok', reason: `Merged into ${master?.ticket_number || 'master'}` })
        } catch (e) {
          rows.push({ ticket_number: d.ticket_number, state: 'err', reason: e?.response?.data?.detail || 'Merge failed' })
        }
      }
      result.value = { updated, skipped: skipCount.value, rows }
    } else if (props.mode === 'status' && form.value.status === 'pending_vendor') {
      // No bulk vendor-dispatch action exists server-side — run the guarded per-ticket
      // dispatch (same endpoint as the Relay Station) so vendor identity + ETA land on
      // every ticket and each one is individually workflow-checked.
      const targets = evaluated.value.filter(e => e.state === 'ready').map(e => e.t)
      const rows = []; let updated = 0
      for (const t of targets) {
        try {
          await vendorDispatch(t.id, {
            vendor_name: form.value.vendor_name.trim(),
            vendor_wait_reason: form.value.vendor_wait_reason || undefined,
            vendor_due_at: form.value.vendor_due_at || undefined,
            note: form.value.note.trim() || undefined,
          })
          updated++; rows.push({ ticket_number: t.ticket_number, state: 'ok', reason: `Dispatched to ${form.value.vendor_name.trim()}` })
        } catch (e) {
          rows.push({ ticket_number: t.ticket_number, state: 'err', reason: e?.response?.data?.detail || 'Dispatch failed' })
        }
      }
      result.value = { updated, skipped: skipCount.value, rows }
    } else {
      const res = await bulkTickets(buildPayload(props.tickets.map(t => t.id)))
      result.value = {
        updated: res.updated || 0,
        skipped: res.skipped ?? (res.results || []).filter(r => r.skipped).length,
        rows: (res.results || []).map(r => ({
          ticket_number: r.ticket_number || shortId(r.id),
          state: r.ok ? (r.skipped ? 'skip' : 'ok') : 'err',
          reason: r.error || '',
        })),
      }
    }
    done.value = true
    setTimeout(() => emit('done', { updated: result.value.updated, skipped: result.value.skipped }), 1150)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'The action could not be completed.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
@property --bam-p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.bam-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 22px;
  background: rgba(4, 5, 6, 0.66); backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .bam-overlay { background: rgba(40, 25, 10, 0.4); }

.bam { position: relative; width: min(880px, 96vw); max-height: 93vh; display: flex; flex-direction: column; overflow: hidden;
  padding: 24px 26px 18px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong);
  border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
.bam-accent { position: absolute; inset: 0 0 auto 0; height: 3px; z-index: 3; border-radius: 24px 24px 0 0;
  background: linear-gradient(90deg, transparent, var(--ac) 18%, var(--ac) 82%, transparent); opacity: 0.95; }
.bam-grain-dots { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: 24px;
  background-image: radial-gradient(color-mix(in srgb, var(--ac) 7%, transparent) 1px, transparent 1px); background-size: 20px 20px; }
.bam-x { position: absolute; top: 15px; right: 15px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px;
  cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); z-index: 4; }
.bam-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.bam-x:disabled { opacity: 0.4; cursor: not-allowed; }

/* header */
.bam-head { display: flex; align-items: flex-start; gap: 14px; padding-right: 36px; flex-shrink: 0; }
.bam-ic { position: relative; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  color: var(--ac); background: color-mix(in srgb, var(--ac) 14%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 30%, transparent); }
.bam-ic-ring { position: absolute; inset: -5px; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--ac) 30%, transparent);
  opacity: 0; animation: bam-ping 2.6s ease-out infinite; }
.bam-titles { min-width: 0; }
.bam-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; color: var(--ac); margin: 1px 0 4px; }
.bam-eyebrow.center { text-align: center; }
.bam-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); margin: 0; }
.bam-title.center { text-align: center; }
.bam-sub { font-size: 12.5px; line-height: 1.5; color: var(--sd-text-secondary); margin: 5px 0 0; }
.bam-sub.center { text-align: center; max-width: 44ch; margin: 6px auto 0; }

/* process stepper */
.bam-steps { display: flex; align-items: center; gap: 8px; margin: 15px 0 4px; flex-wrap: wrap; flex-shrink: 0; }
.step { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--sd-text-dim); padding: 4px 10px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.25s; }
.step .sd-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.step.on { color: var(--ac); border-color: color-mix(in srgb, var(--ac) 40%, transparent); background: color-mix(in srgb, var(--ac) 10%, transparent); }
.step-sep { color: var(--sd-text-dim); flex-shrink: 0; }

/* body grid */
.bam-body { display: grid; grid-template-columns: 1.18fr 1fr; gap: 18px; margin-top: 14px; min-height: 0; flex: 1; }
.bam-config { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding: 2px 8px 4px 2px; min-height: 0;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ac) 55%, transparent) transparent; }
.bam-config::-webkit-scrollbar { width: 7px; }
.bam-config::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--ac) 55%, transparent); border: 2px solid transparent; background-clip: padding-box; }

.f { display: flex; flex-direction: column; gap: 8px; }
.fl { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.fl em { color: var(--sd-danger); font-style: normal; }
.fl .opt, .fl i { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; margin-left: 4px; }
.fhint { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; line-height: 1.45; color: var(--sd-text-muted); margin: 0; }
.fhint svg { flex-shrink: 0; margin-top: 1px; color: var(--ac); }
.fl .opt.req { color: var(--sd-st-escalated); font-weight: 700; }

/* escalation type segmented buttons (mirrors the escalate console) */
.esc-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.esc-seg-b { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 10px 12px; border-radius: 12px; cursor: pointer; font-family: inherit; text-align: left;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.18s var(--sd-spring); }
.esc-seg-b b { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.esc-seg-b i { font-size: 10.5px; font-style: normal; color: var(--sd-text-dim); }
.esc-seg-b svg { color: var(--sd-text-muted); }
.esc-seg-b:hover { border-color: color-mix(in srgb, var(--ac) 45%, transparent); }
.esc-seg-b.on { color: var(--ac); background: color-mix(in srgb, var(--ac) 11%, transparent); border-color: color-mix(in srgb, var(--ac) 50%, transparent); }
.esc-seg-b.on b, .esc-seg-b.on svg { color: var(--ac); }
.fi { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.fi:focus { outline: none; border-color: color-mix(in srgb, var(--ac) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ac) 14%, transparent); }

.who-card { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.who-ava { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; font-size: 13px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .who-ava { color: #fff8ec; }
.who-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.who-meta b { font-size: 13.5px; font-weight: 700; color: var(--sd-text); }
.who-meta i { font-style: normal; font-size: 11.5px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who-tag { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ac); padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--ac) 13%, transparent); }

/* priority severity bars */
.sev { display: flex; gap: 8px; }
.sev-chip { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 7px; height: 64px; padding: 8px 4px; border-radius: 12px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.sev-chip .sev-bar { width: 60%; border-radius: 4px 4px 0 0; background: color-mix(in srgb, var(--cc) 40%, transparent); transition: all 0.2s; }
.sev-chip:hover { border-color: color-mix(in srgb, var(--cc) 45%, transparent); }
.sev-chip.on { color: var(--cc); background: color-mix(in srgb, var(--cc) 11%, transparent); border-color: color-mix(in srgb, var(--cc) 50%, transparent); }
.sev-chip.on .sev-bar { background: var(--cc); box-shadow: 0 0 12px color-mix(in srgb, var(--cc) 50%, transparent); }

/* resolution code grid */
.code-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
.code-chip { display: inline-flex; align-items: center; gap: 7px; padding: 9px 11px; border-radius: 11px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.code-chip:hover { border-color: color-mix(in srgb, var(--ac) 45%, transparent); }
.code-chip.on { color: var(--ac); background: color-mix(in srgb, var(--ac) 12%, transparent); border-color: color-mix(in srgb, var(--ac) 45%, transparent); }
.cause-row { display: flex; flex-wrap: wrap; gap: 6px; }
.cause-pill { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s; }
.cause-pill.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }

.time-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.time-pill { padding: 7px 12px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.time-pill.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.time-in { width: 70px; padding: 7px 10px; border-radius: 9px; font-family: inherit; font-size: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }

.toggles { display: flex; flex-wrap: wrap; gap: 8px; }
.tog { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tog .tk { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 6px; color: var(--sd-text-dim); background: var(--sd-surface); transition: all 0.18s; }
.tog.on { color: var(--sd-text); border-color: color-mix(in srgb, var(--ac) 45%, transparent); }
.tog.on .tk { color: #fff; background: var(--ac); }

/* merge master list */
.master-list { display: flex; flex-direction: column; gap: 6px; }
.master-opt { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 11px; cursor: pointer; font-family: inherit; text-align: left; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s; }
.master-opt:hover { border-color: color-mix(in srgb, var(--ac) 40%, transparent); }
.master-opt.on { background: color-mix(in srgb, var(--ac) 10%, transparent); border-color: color-mix(in srgb, var(--ac) 50%, transparent); }
.mo-radio { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--sd-border-strong); flex-shrink: 0; }
.mo-radio span { width: 8px; height: 8px; border-radius: 50%; background: var(--ac); transform: scale(0); transition: transform 0.18s var(--sd-spring); }
.master-opt.on .mo-radio { border-color: var(--ac); }
.master-opt.on .mo-radio span { transform: scale(1); }
.mo-no { font-size: 11px; font-weight: 700; color: var(--ac); flex-shrink: 0; }
.mo-subj { flex: 1; font-size: 12.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-age { font-size: 10.5px; color: var(--sd-text-dim); font-family: var(--sd-mono); flex-shrink: 0; }

/* workflow consequences */
.bam-flow { list-style: none; margin: 4px 0 0; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); display: flex; flex-direction: column; gap: 8px; }
.bam-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); }
.bam-flow b { color: var(--sd-text); font-weight: 700; }
.wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ac); flex-shrink: 0; box-shadow: 0 0 8px color-mix(in srgb, var(--ac) 70%, transparent); }

/* impact ledger */
.bam-impact { display: flex; flex-direction: column; gap: 12px; min-height: 0; border-left: 1px solid var(--sd-border); padding-left: 18px; }
.imp-head { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.imp-gauge { position: relative; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(from -90deg, var(--ac) 0 var(--bam-p), color-mix(in srgb, var(--sd-text) 10%, transparent) var(--bam-p) 360deg);
  transition: --bam-p 0.7s var(--sd-spring); }
.imp-gauge::before { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--sd-surface-elevated); }
.ig-val { position: relative; font-size: 20px; font-weight: 800; line-height: 1; color: var(--ac); font-family: var(--sd-mono); }
.ig-tot { position: relative; font-size: 10px; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.imp-tally { min-width: 0; }
.imp-tally p { margin: 0 0 3px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 650; }
.it-ready { color: var(--ac); }
.it-skip { color: var(--sd-text-muted); font-weight: 600 !important; }
.it-cap { color: var(--sd-text-dim); font-weight: 500 !important; font-size: 10.5px !important; }

.imp-list { display: flex; flex-direction: column; gap: 7px; overflow-y: auto; padding: 2px 4px 4px 2px; min-height: 0; flex: 1;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ac) 50%, transparent) transparent; }
.imp-list::-webkit-scrollbar { width: 7px; }
.imp-list::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--ac) 50%, transparent); border: 2px solid transparent; background-clip: padding-box; }
.imp-row { position: relative; display: flex; align-items: flex-start; gap: 9px; padding: 9px 11px 9px 13px; border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border); overflow: hidden; transition: opacity 0.2s; }
.imp-row.skip { opacity: 0.62; }
.ir-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sc); opacity: 0.7; }
.ir-main { flex: 1; min-width: 0; }
.ir-top { display: flex; align-items: center; gap: 7px; }
.ir-no { font-size: 10.5px; font-weight: 700; color: var(--sd-amber); flex-shrink: 0; }
.ir-pri { width: 8px; height: 8px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 6px color-mix(in srgb, var(--pc) 60%, transparent); flex-shrink: 0; margin-left: auto; }
.ir-subj { font-size: 12.5px; font-weight: 600; color: var(--sd-text); margin: 4px 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ir-who { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-text-muted); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ir-ava { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; font-size: 8px; font-weight: 800; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); flex-shrink: 0; }
.ir-agent { color: var(--sd-text-dim); overflow: hidden; text-overflow: ellipsis; }
.ir-badge { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 4px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; max-width: 118px; }
.ir-badge i { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ir-badge.ready { color: var(--ac); background: color-mix(in srgb, var(--ac) 13%, transparent); }
.ir-badge.master { color: var(--sd-amber); background: var(--sd-amber-soft); }
.ir-badge.skip { color: var(--sd-text-muted); background: var(--sd-surface-glass); }
.ir-badge.pending { color: var(--sd-text-dim); background: var(--sd-surface-glass); }

/* error + footer */
.bam-err { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; font-size: 12.5px; color: var(--sd-danger); padding: 9px 12px; border-radius: 10px; background: var(--sd-danger-soft); flex-shrink: 0; }
.bam-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--sd-border); flex-shrink: 0; flex-wrap: wrap; }
.foot-note { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--sd-text-muted); }
.foot-note svg { color: var(--ac); }
.foot-acts { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.bam-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.bam-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.bam-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.bam-btn.primary { color: #1a1206; background: var(--ac); box-shadow: 0 10px 24px color-mix(in srgb, var(--ac) 32%, transparent); }
[data-theme="light"] .bam-btn.primary { color: #fff8ec; }
.bam-btn.primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.bam-btn .spin { animation: bam-spin 1s linear infinite; }
.bam-btn.wide { width: 100%; margin-top: 6px; }

/* result */
.bam-result { display: flex; flex-direction: column; align-items: center; padding: 8px 4px 4px; overflow-y: auto; }
.bam-seal { position: relative; width: 66px; height: 66px; margin: 6px auto 14px; display: grid; place-items: center; flex-shrink: 0; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--ac) 45%, transparent); animation: bam-ping 2.4s ease-out infinite; }
.seal-ring.r2 { animation-delay: 1.2s; }
.seal-core { position: relative; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; color: #1a1206; background: var(--ac); box-shadow: 0 0 26px color-mix(in srgb, var(--ac) 45%, transparent); }
[data-theme="light"] .seal-core { color: #fff8ec; }
.res-list { width: 100%; display: flex; flex-direction: column; gap: 6px; margin: 16px 0 4px; max-height: 40vh; overflow-y: auto; padding: 2px;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ac) 50%, transparent) transparent; }
.res-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.res-row .rr-ic { flex-shrink: 0; }
.res-row.ok .rr-ic { color: var(--sd-success); }
.res-row.skip { opacity: 0.7; }
.res-row.skip .rr-ic { color: var(--sd-text-muted); }
.res-row.err { border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }
.res-row.err .rr-ic { color: var(--sd-danger); }
.rr-no { font-size: 11.5px; font-weight: 700; color: var(--sd-amber); flex-shrink: 0; }
.rr-reason { font-size: 12px; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@keyframes bam-ping { 0% { transform: scale(0.85); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes bam-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .bam-body { grid-template-columns: 1fr; }
  .bam-impact { border-left: none; padding-left: 0; border-top: 1px solid var(--sd-border); padding-top: 14px; }
  .imp-list { max-height: 240px; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .bam-ic-ring,
  html:not([data-cinematic="on"]) .seal-ring,
  html:not([data-cinematic="on"]) .bam-btn .spin { animation: none !important; }
  html:not([data-cinematic="on"]) .imp-gauge { transition: none; }
}
</style>
