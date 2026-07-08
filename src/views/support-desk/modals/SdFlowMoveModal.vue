<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="fmm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="fmm" role="dialog" aria-modal="true" :style="{ '--ac': toColor }"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="fmm-accent" aria-hidden="true" />
          <span class="fmm-grain" aria-hidden="true" />
          <button class="fmm-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <template v-if="!done">
            <!-- morphing seal -->
            <div class="fmm-seal">
              <span class="seal-ring" /><span class="seal-ring r2" />
              <span class="seal-core"><component :is="toIcon" :size="24" /></span>
            </div>

            <p class="fmm-eyebrow sd-mono">MOVE TICKET · WORK STATE</p>
            <h2 class="fmm-title">Move to {{ toLabel }}</h2>

            <!-- ticket chip -->
            <div class="fmm-chip">
              <span class="fc-no sd-mono">{{ ticket?.ticket_number }}</span>
              <span class="fc-subj">{{ ticket?.subject }}</span>
              <span class="fc-pri" :style="{ '--pc': priorityColor(ticket?.priority) }">{{ priorityLabel(ticket?.priority) }}</span>
            </div>

            <!-- PROCESS: from → to -->
            <div class="fmm-process">
              <span class="pr-node" :style="{ '--sc': fromColor }">
                <i class="pr-dot" /> <b>{{ fromLabel }}</b>
              </span>
              <span class="pr-flow" aria-hidden="true"><span class="pr-run" /><ArrowRight :size="15" /></span>
              <span class="pr-node to" :style="{ '--sc': toColor }">
                <i class="pr-dot" /> <b>{{ toLabel }}</b>
              </span>
            </div>

            <div class="fmm-scroll">
              <!-- WHO: requester + owner -->
              <div class="fmm-people">
                <div class="who">
                  <span class="who-ava req">{{ initials(requesterName) }}</span>
                  <div class="who-meta"><i>Requester</i><b>{{ requesterName || 'Unknown' }}</b></div>
                </div>
                <span class="who-div" />
                <div class="who">
                  <span class="who-ava" :class="{ none: !ownerName }">{{ ownerName ? initials(ownerName) : '—' }}</span>
                  <div class="who-meta"><i>Owner</i><b>{{ ownerName || 'Unassigned' }}</b></div>
                </div>
              </div>

              <!-- owner requirement (In Progress needs an owner) -->
              <section v-if="needsOwner" class="fmm-owner">
                <p class="fo-warn"><ShieldAlert :size="14" /> <b>In Progress needs an owner.</b> Assign one to start work.</p>
                <SdSelect v-if="ownerOptions.length > 1" v-model="ownerId" :options="ownerOptions" placeholder="Choose an owner…" />
                <button v-else type="button" class="fo-me" :class="{ on: ownerId === myId }" @click="ownerId = ownerId === myId ? '' : myId">
                  <span class="fo-me-ava">{{ initials(me?.name || me?.email) }}</span>
                  <span class="fo-me-txt"><b>{{ me?.name || me?.email || 'You' }}</b><i>Assign to me</i></span>
                  <Check v-if="ownerId === myId" :size="15" class="fo-me-ck" />
                </button>
              </section>

              <!-- HOLD governance (moving into the Suspension Dock captures reason + release) -->
              <section v-if="to === 'on_hold'" class="fmm-f">
                <label class="fmm-k">Hold reason <i>coded — drives the Suspension Dock analytics</i></label>
                <div class="fmm-chips">
                  <button v-for="r in HOLD_REASON_CODES" :key="r.value" type="button" class="rz-chip"
                    :class="{ on: holdCode === r.value }" @click="holdCode = holdCode === r.value ? '' : r.value">{{ r.label }}</button>
                </div>
                <SdDateTimePicker v-model="holdUntil" :min="todayIso" placeholder="Release date (optional) — auto-resumes when it passes" />
              </section>

              <!-- VENDOR hand-off (moving into Pending Vendor routes through the Relay Station
                   dispatch — a bare set-status would land it as "Unnamed vendor" with no ETA) -->
              <section v-if="to === 'pending_vendor'" class="fmm-f">
                <label class="fmm-k">Vendor hand-off <em class="req">*</em> <i>internal — never shown on the client portal</i></label>
                <div class="fmm-two">
                  <input v-model="vend.vendor_name" class="fmm-input" placeholder="Vendor name * — e.g. Acme Networks" />
                  <input v-model="vend.vendor_ticket_ref" class="fmm-input" placeholder="Vendor case # (optional)" />
                </div>
                <SdSelect v-model="vend.vendor_wait_reason" :options="VENDOR_WAIT_REASONS" placeholder="Waiting on… (why is it blocked?)" />
                <div class="fmm-two">
                  <SdDateTimePicker v-model="vend.vendor_due_at" placeholder="Expected back (ETA) — arms the overdue watch" />
                  <input v-model="vend.vendor_po_ref" class="fmm-input" placeholder="PO / cost ref (optional)" />
                </div>
              </section>

              <!-- REASON + quick chips -->
              <section class="fmm-f">
                <label class="fmm-k">{{ to === 'on_hold' ? 'Detail' : 'Reason' }} <i>kept on the ticket timeline · optional</i></label>
                <div v-if="reasonChips.length" class="fmm-chips">
                  <button v-for="r in reasonChips" :key="r" type="button" class="rz-chip" @click="addReason(r)">{{ r }}</button>
                </div>
                <textarea v-model="note" rows="2" class="fmm-input" :placeholder="`Why move to ${toLabel}? (posted to the timeline)`" />
              </section>

              <!-- WORKFLOW consequences -->
              <ul class="fmm-flow">
                <li v-for="(s, i) in consequences" :key="i" :class="{ warn: s.warn }">
                  <span class="wf-dot" /> {{ s.t }} <b v-if="s.b">{{ s.b }}</b>{{ s.post || '' }}
                </li>
              </ul>
            </div>

            <p v-if="err" class="fmm-err"><TriangleAlert :size="13" /> {{ err }}</p>

            <div class="fmm-foot">
              <button class="fmm-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <Motion as="button" class="fmm-btn primary" :disabled="busy || !valid"
                :whileHover="valid && !busy ? { y: -2 } : {}" :whileTap="valid && !busy ? { scale: 0.97 } : {}" @click="confirm">
                <component :is="busy ? LoaderCircle : toIcon" :size="15" :class="{ spin: busy }" />
                {{ busy ? 'Moving…' : `Move to ${toLabel}` }}
              </Motion>
            </div>
          </template>

          <!-- SUCCESS -->
          <div v-else class="fmm-result">
            <Motion class="fmm-seal done" :initial="{ scale: 0.4, opacity: 0 }" :animate="{ scale: 1, opacity: 1 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
              <span class="seal-ring" /><span class="seal-ring r2" />
              <span class="seal-core"><Check :size="26" /></span>
            </Motion>
            <p class="fmm-eyebrow sd-mono center">MOVED</p>
            <h2 class="fmm-title center">{{ ticket?.ticket_number }} → {{ toLabel }}</h2>
            <p class="fmm-sub center">The change is on the timeline{{ note.trim() ? ' with your note' : '' }}.</p>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, ArrowRight, Check, LoaderCircle, TriangleAlert, ShieldAlert,
  Activity, PlayCircle, Hourglass, Truck, Pause, Flame,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdDateTimePicker from '../components/SdDateTimePicker.vue'
import {
  changeTicketStatus, assignTicket, managerAssignTicket, holdTicket, vendorDispatch,
  statusColor, statusLabel, priorityColor, priorityLabel, HOLD_REASON_CODES, VENDOR_WAIT_REASONS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  agent: { type: Boolean, default: false },
  me: { type: Object, default: () => ({}) },
  assignees: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
})
const emit = defineEmits(['close', 'done'])

const note = ref('')
const ownerId = ref('')
const holdCode = ref('')
const holdUntil = ref('')
const blankVendor = () => ({ vendor_name: '', vendor_ticket_ref: '', vendor_wait_reason: '', vendor_due_at: '', vendor_po_ref: '' })
const vend = reactive(blankVendor())
const busy = ref(false)
const done = ref(false)
const err = ref('')

const myId = computed(() => props.me?.id || '')
const todayIso = computed(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })

watch(() => props.open, (v) => {
  if (!v) return
  note.value = ''; busy.value = false; done.value = false; err.value = ''
  holdCode.value = ''; holdUntil.value = ''
  // pre-fill the dispatch memo from anything already on the ticket (re-dispatch keeps context)
  Object.assign(vend, blankVendor())
  const t = props.ticket || {}
  vend.vendor_name = t.vendor_name || ''
  vend.vendor_ticket_ref = t.vendor_ticket_ref || ''
  vend.vendor_wait_reason = t.vendor_wait_reason || ''
  vend.vendor_po_ref = t.vendor_po_ref || ''
  // pre-select "me" when an owner is required
  ownerId.value = needsOwner.value ? (props.me?.id || '') : ''
})

const ST_ICON = { open: Activity, in_progress: PlayCircle, pending_customer: Hourglass, pending_vendor: Truck, on_hold: Pause, escalated: Flame }
const toIcon = computed(() => ST_ICON[props.to] || Activity)
const toColor = computed(() => statusColor(props.to))
const fromColor = computed(() => statusColor(props.from))
const toLabel = computed(() => statusLabel(props.to))
const fromLabel = computed(() => statusLabel(props.from))

const requesterName = computed(() => props.ticket?.raised_by_name || props.ticket?.contact_name || props.ticket?.organization_name || '')
const ownerName = computed(() => props.ticket?.assigned_agent_name || '')

const needsOwner = computed(() => props.to === 'in_progress' && !props.ticket?.assigned_agent_id)
const ownerOptions = computed(() => {
  const out = []
  if (myId.value) out.push({ value: myId.value, label: `${props.me?.name || props.me?.email || 'You'} · you` })
  for (const a of props.assignees) if (String(a.value) !== String(myId.value)) out.push(a)
  return out
})

const initials = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—'

const REASONS = {
  open: ['Returned for triage', 'Needs a re-check', 'Re-opened the investigation'],
  in_progress: ['Started working', 'Investigating', 'Reproduced the issue'],
  pending_customer: ['Awaiting customer info', 'Requested logs / screenshots', 'Sent a clarifying question'],
  pending_vendor: ['Raised with the vendor', 'Awaiting vendor fix', 'Vendor ticket opened'],
  on_hold: ['Planned maintenance', 'Awaiting approval', 'Deprioritised to backlog'],
}
const reasonChips = computed(() => REASONS[props.to] || [])
const addReason = (r) => { note.value = note.value.trim() ? `${note.value.trim()}. ${r}` : r }

const CONSEQ = {
  open: [
    { t: 'Returns to the', b: 'active work queue' },
    { t: 'The SLA clock keeps running' },
    { t: 'Logged on the ticket timeline' },
  ],
  in_progress: [
    { t: 'Marks the ticket as', b: 'actively being worked' },
    { t: 'Requires an', b: 'assigned owner' },
    { t: 'The SLA clock keeps running' },
    { t: 'Requester sees status', b: 'In Progress' },
  ],
  pending_customer: [
    { t: 'Waiting on the', b: 'requester', post: ' — they are notified to respond' },
    { t: 'The SLA clock', b: 'freezes', post: ' — paused time is credited back on reply' },
    { t: 'A customer reply', b: 'auto-reactivates', post: ' the ticket' },
    { t: 'Auto-closes after 7 quiet days (warning at 4)' },
  ],
  pending_vendor: [
    { t: 'Dispatched to a', b: 'third-party vendor', post: ' — logged as a relay hand-off' },
    { t: 'The SLA clock', b: 'freezes', post: ' while it’s off-network' },
    { t: 'The overdue watch arms at the', b: 'expected-back date' },
    { t: 'Vendor identity stays internal — never on the client portal' },
  ],
  on_hold: [
    { t: 'Suspended in the', b: 'dock' },
    { t: 'The SLA clock', b: 'freezes', post: ' — paused time is credited on release' },
    { t: 'A release date', b: 'auto-resumes', post: ' it; without one it’s flagged for review in 7 days' },
    { t: 'Resume returns it to its prior state' },
  ],
}
const consequences = computed(() => CONSEQ[props.to] || [{ t: 'Moves to', b: toLabel.value }])

const valid = computed(() => {
  if (busy.value) return false
  if (needsOwner.value && !ownerId.value) return false
  // A vendor hand-off with nobody named is untrackable — the Relay Station would show
  // "Unnamed vendor" with nothing to chase. Mirrors SdVendorDispatchModal's gate.
  if (props.to === 'pending_vendor' && vend.vendor_name.trim().length < 2) return false
  return !!props.to && !!props.ticket?.id
})

const confirm = async () => {
  if (!valid.value) return
  busy.value = true; err.value = ''
  try {
    if (needsOwner.value && ownerId.value) {
      const assignFn = props.agent ? assignTicket : managerAssignTicket
      await assignFn(props.ticket.id, { assigned_agent_id: ownerId.value })
    }
    if (props.to === 'on_hold') {
      // Route through the dedicated hold endpoint so the reason taxonomy + release date
      // land on the record (a bare set-status would leave the Suspension Dock blind).
      await holdTicket(props.ticket.id, {
        hold_reason: note.value.trim() || null,
        hold_reason_code: holdCode.value || null,
        hold_until: holdUntil.value || null,
      })
    } else if (props.to === 'pending_vendor') {
      // Route through the Relay Station dispatch so the vendor identity, wait reason and
      // ETA land on the record and the overdue watch arms (a bare set-status leaves the
      // Pending Vendor board with an unnamed, unchaseable hand-off).
      await vendorDispatch(props.ticket.id, {
        vendor_name: vend.vendor_name.trim(),
        vendor_ticket_ref: vend.vendor_ticket_ref.trim() || undefined,
        vendor_wait_reason: vend.vendor_wait_reason || undefined,
        vendor_due_at: vend.vendor_due_at || undefined,
        vendor_po_ref: vend.vendor_po_ref.trim() || undefined,
        note: note.value.trim() || undefined,
      })
    } else {
      await changeTicketStatus(props.ticket.id, { status: props.to, note: note.value.trim() || undefined })
    }
    done.value = true
    setTimeout(() => emit('done'), 850)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not move the ticket.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.fmm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 24px; background: rgba(4,5,6,0.66); backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .fmm-overlay { background: rgba(40,25,10,0.4); }
.fmm { position: relative; width: min(500px, 95vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; padding: 26px 26px 20px; text-align: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
.fmm-accent { position: absolute; inset: 0 0 auto 0; height: 3px; z-index: 2; border-radius: 24px 24px 0 0; background: linear-gradient(90deg, transparent, var(--ac) 18%, var(--ac) 82%, transparent); opacity: 0.95; }
.fmm-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: 24px; background-image: radial-gradient(color-mix(in srgb, var(--ac) 7%, transparent) 1px, transparent 1px); background-size: 20px 20px; }
.fmm-x { position: absolute; top: 15px; right: 15px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); z-index: 3; }
.fmm-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.fmm-x:disabled { opacity: 0.4; cursor: not-allowed; }

.fmm-seal { position: relative; width: 64px; height: 64px; margin: 2px auto 12px; display: grid; place-items: center; flex-shrink: 0; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--ac) 45%, transparent); animation: fmm-ping 2.4s ease-out infinite; }
.seal-ring.r2 { animation-delay: 1.2s; }
.seal-core { position: relative; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; color: #0d0f12; background: var(--ac); box-shadow: 0 0 26px color-mix(in srgb, var(--ac) 45%, transparent); }
[data-theme="light"] .seal-core { color: #fff8ec; }
.fmm-seal.done .seal-core { background: linear-gradient(140deg, var(--sd-success), #059669); color: #fff; box-shadow: 0 0 26px color-mix(in srgb, var(--sd-success) 45%, transparent); }

.fmm-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: var(--ac); margin: 0 0 6px; }
.fmm-eyebrow.center { text-align: center; }
.fmm-title { font-size: 20px; font-weight: 800; color: var(--sd-text); margin: 0 0 12px; letter-spacing: -0.02em; }
.fmm-title.center { text-align: center; }
.fmm-sub { font-size: 12.5px; color: var(--sd-text-secondary); margin: 6px auto 0; max-width: 40ch; }

.fmm-chip { display: flex; align-items: center; gap: 9px; text-align: left; padding: 10px 13px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 12px; }
.fc-no { font-size: 11px; font-weight: 700; color: var(--sd-amber); flex-shrink: 0; }
.fc-subj { flex: 1; font-size: 13px; font-weight: 650; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-pri { font-size: 10px; font-weight: 700; color: var(--pc); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--pc) 14%, transparent); flex-shrink: 0; }

/* process */
.fmm-process { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 14px; }
.pr-node { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 12px; font-size: 12.5px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.pr-node b { color: var(--sd-text); font-weight: 700; }
.pr-node.to { color: var(--sc); border-color: color-mix(in srgb, var(--sc) 45%, transparent); background: color-mix(in srgb, var(--sc) 10%, transparent); }
.pr-node.to b { color: var(--sc); }
.pr-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sc); box-shadow: 0 0 8px var(--sc); }
.pr-flow { position: relative; display: inline-flex; align-items: center; color: var(--sd-text-dim); width: 46px; justify-content: center; }
.pr-run { position: absolute; left: 0; right: 14px; top: 50%; height: 2px; transform: translateY(-50%); border-radius: 2px; background: linear-gradient(90deg, transparent, var(--ac)); background-size: 200% 100%; animation: fmm-run 1.8s linear infinite; }

.fmm-scroll { overflow-y: auto; text-align: left; display: flex; flex-direction: column; gap: 13px; padding: 2px; margin: 0 -2px 2px;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ac) 55%, transparent) transparent; }
.fmm-scroll::-webkit-scrollbar { width: 7px; }
.fmm-scroll::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--ac) 55%, transparent); border: 2px solid transparent; background-clip: padding-box; }

/* people */
.fmm-people { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.who { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; }
.who-ava { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .who-ava { color: #fff8ec; }
.who-ava.req { background: linear-gradient(140deg, var(--sd-amber), var(--sd-ember)); }
.who-ava.none { color: var(--sd-text-dim); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); }
.who-meta { display: flex; flex-direction: column; min-width: 0; }
.who-meta i { font-style: normal; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); }
.who-meta b { font-size: 12.5px; font-weight: 650; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who-div { width: 1px; align-self: stretch; background: var(--sd-border); }

/* owner requirement */
.fmm-owner { display: flex; flex-direction: column; gap: 9px; padding: 12px 13px; border-radius: 13px; background: color-mix(in srgb, var(--sd-st-progress) 8%, transparent); border: 1px solid color-mix(in srgb, var(--sd-st-progress) 35%, transparent); }
.fo-warn { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-secondary); margin: 0; }
.fo-warn svg { color: var(--sd-st-progress); flex-shrink: 0; }
.fo-warn b { color: var(--sd-text); }
.fo-me { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 11px; cursor: pointer; font-family: inherit; text-align: left; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.fo-me.on { border-color: color-mix(in srgb, var(--sd-st-progress) 50%, transparent); background: color-mix(in srgb, var(--sd-st-progress) 10%, transparent); }
.fo-me-ava { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; font-size: 12px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .fo-me-ava { color: #fff8ec; }
.fo-me-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.fo-me-txt b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.fo-me-txt i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.fo-me-ck { color: var(--sd-st-progress); }

/* reason */
.fmm-f { display: flex; flex-direction: column; gap: 8px; }
.fmm-k { font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.fmm-k i { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; margin-left: 4px; }
.fmm-k .req { color: var(--sd-danger); font-style: normal; margin-left: 2px; }
.fmm-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (max-width: 560px) { .fmm-two { grid-template-columns: 1fr; } }
.fmm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rz-chip { padding: 6px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s; }
.rz-chip:hover { color: var(--ac); border-color: color-mix(in srgb, var(--ac) 45%, transparent); }
.rz-chip.on { color: var(--ac); background: color-mix(in srgb, var(--ac) 13%, transparent); border-color: color-mix(in srgb, var(--ac) 45%, transparent); }
.fmm-input { width: 100%; padding: 11px 13px; border-radius: 12px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.fmm-input:focus { outline: none; border-color: color-mix(in srgb, var(--ac) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ac) 14%, transparent); }

/* workflow */
.fmm-flow { list-style: none; margin: 0; padding: 12px 14px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); display: flex; flex-direction: column; gap: 8px; }
.fmm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); }
.fmm-flow li.warn { color: var(--sd-warning); }
.fmm-flow b { color: var(--sd-text); font-weight: 700; }
.fmm-flow li.warn b { color: var(--sd-warning); }
.wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ac); flex-shrink: 0; box-shadow: 0 0 8px color-mix(in srgb, var(--ac) 70%, transparent); }
.fmm-flow li.warn .wf-dot { background: var(--sd-warning); box-shadow: 0 0 8px var(--sd-warning); }

.fmm-err { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 10px 0 0; font-size: 12.5px; color: var(--sd-danger); }
.fmm-foot { display: flex; gap: 10px; margin-top: 16px; flex-shrink: 0; }
.fmm-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 18px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.fmm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.fmm-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.fmm-btn.primary { color: #0d0f12; background: var(--ac); box-shadow: 0 10px 24px color-mix(in srgb, var(--ac) 32%, transparent); }
[data-theme="light"] .fmm-btn.primary { color: #fff8ec; }
.fmm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.fmm-btn .spin { animation: fmm-spin 1s linear infinite; }

.fmm-result { display: flex; flex-direction: column; align-items: center; padding: 8px 4px; }

@keyframes fmm-ping { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes fmm-run { to { background-position: -200% 0; } }
@keyframes fmm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seal-ring,
  html:not([data-cinematic="on"]) .pr-run,
  html:not([data-cinematic="on"]) .fmm-btn .spin { animation: none !important; }
}
</style>
