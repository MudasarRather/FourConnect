<template>
  <SdModalShell :open="open" eyebrow="TEAM OPS · HANDOFF" title="Pass the baton" width="520px" @close="$emit('close')">
    <div v-if="ticket" class="ho">
      <!-- the ticket being passed -->
      <div class="ho-ticket">
        <span class="ho-no sd-mono">{{ ticket.ticket_number }}</span>
        <p class="ho-subj">{{ ticket.subject }}</p>
        <div class="ho-pills">
          <SdPill kind="priority" :value="ticket.priority" />
          <SdPill kind="status" :value="ticket.status" />
        </div>
      </div>

      <!-- the relay: from → baton → to -->
      <div class="ho-relay" :class="{ armed: !!toId, firing }">
        <div class="ho-runner from">
          <span class="ho-ava">{{ ini(fromName) }}</span>
          <b>{{ fromName }}</b>
          <i>current owner</i>
        </div>
        <div class="ho-track" aria-hidden="true">
          <span class="ho-lane" />
          <span class="ho-baton"><ArrowRight :size="11" /></span>
        </div>
        <div class="ho-runner to" :class="{ empty: !toId }">
          <span class="ho-ava">{{ toId ? ini(toName) : '?' }}</span>
          <b>{{ toId ? toName : 'Pick a teammate' }}</b>
          <i>{{ toId ? 'receives it' : '—' }}</i>
        </div>
      </div>

      <label class="ho-lbl">Hand off to</label>
      <SdSelect v-model="toId" :options="targetOpts" placeholder="Choose a teammate…" />

      <label class="ho-lbl">Why the handoff? <span class="ho-opt">(recorded on the timeline)</span></label>
      <div class="ho-reasons">
        <button v-for="r in HANDOFF_REASONS" :key="r.value" class="ho-reason" :class="{ on: reason === r.value }"
          :title="r.desc" @click="reason = reason === r.value ? '' : r.value">{{ r.label }}</button>
      </div>

      <label class="ho-lbl">Note <span class="ho-opt">(optional — travels with the baton)</span></label>
      <textarea v-model="note" class="ho-note" rows="2" placeholder="Context the receiver should have…" />

      <p v-if="err" class="ho-err"><AlertTriangle :size="13" /> {{ err }}</p>
    </div>
    <template #footer>
      <button class="ho-btn" @click="$emit('close')">Cancel</button>
      <button class="ho-btn primary" :disabled="busy || !toId" @click="confirm">
        <component :is="busy ? LoaderCircle : ArrowLeftRight" :size="14" :class="{ spin: busy }" />
        {{ busy ? 'Handing off…' : 'Hand off ticket' }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdHandoffModal — the Team Ops relay console. First-class audited transfer: pick the
   receiving teammate (server-validated pool via /assignees), a coded reason and a note;
   the relay strip animates the baton from the current owner to the receiver on confirm.
   POSTs /me/tickets/{id}/handoff (409 on terminal / already-owner). */
import { ref, computed, watch } from 'vue'
import { ArrowRight, ArrowLeftRight, AlertTriangle, LoaderCircle } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import SdPill from '../components/SdPill.vue'
import { listTicketAssignees, handoffTicket, HANDOFF_REASONS } from '@/composables/useSupportDesk'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  presetAgentId: { type: [String, null], default: null },   // drag-to-tile pre-aim
  meId: { type: [String, null], default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const toId = ref('')
const reason = ref('')
const note = ref('')
const busy = ref(false)
const firing = ref(false)
const err = ref('')
const assignees = ref([])

watch(() => props.open, async (o) => {
  if (!o) return
  toId.value = props.presetAgentId || ''
  reason.value = props.presetAgentId ? 'workload_balance' : ''
  note.value = ''; err.value = ''; firing.value = false
  assignees.value = []
  if (props.ticket) {
    try { assignees.value = await listTicketAssignees(props.ticket.id) } catch { assignees.value = [] }
  }
})

const fromName = computed(() => props.ticket?.assigned_agent_name || 'Unassigned')
const toName = computed(() => {
  const a = assignees.value.find(a => String(a.id) === String(toId.value))
  return a?.name || 'Teammate'
})
const ini = (n) => (n || '·').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const roleLabel = (r) => ({ lead: 'Team lead', agent: 'Agent', collaborator: 'Collaborator', report: 'Direct report', me: 'You' }[r] || 'Member')
const targetOpts = computed(() => assignees.value
  .filter(a => String(a.id) !== String(props.ticket?.assigned_agent_id || ''))
  .map(a => ({
    value: String(a.id),
    label: a.name + (String(a.id) === String(props.meId) ? ' (you)' : ''),
    desc: roleLabel(a.role),
  })))

const confirm = async () => {
  if (!toId.value || !props.ticket) return
  busy.value = true; err.value = ''; firing.value = true
  try {
    await handoffTicket(props.ticket.id, {
      to_agent_id: toId.value,
      ...(reason.value ? { reason_code: reason.value } : {}),
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    })
    toast.success(`Handed off to ${toName.value}`)
    emit('done')
    emit('close')
  } catch (e) {
    firing.value = false
    err.value = e?.response?.data?.detail || 'Handoff failed.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.ho { display: flex; flex-direction: column; gap: 11px; }
.ho-ticket { padding: 13px 15px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.ho-no { font-size: 11px; font-weight: 700; color: var(--sd-team-core); }
.ho-subj { font-size: 14px; font-weight: 650; color: var(--sd-text); margin: 4px 0 9px; line-height: 1.3; }
.ho-pills { display: flex; flex-wrap: wrap; gap: 6px; }

/* relay strip */
.ho-relay { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px;
  padding: 13px 15px; border-radius: 14px; background: var(--sd-team-deep-bg); border: 1px solid var(--sd-team-brd); }
[data-theme="light"] .ho-relay { background: var(--sd-team-stage); }
.ho-runner { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
.ho-ava { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800;
  color: var(--sd-team-hi); background: var(--sd-team-deep-soft); border: 1.5px solid var(--sd-team-brd); }
[data-theme="light"] .ho-ava { color: var(--sd-team-deep); }
.ho-runner.to.empty .ho-ava { border-style: dashed; opacity: 0.6; }
.ho-runner b { font-size: 12px; font-weight: 750; color: var(--sd-text); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-theme="light"] .ho-relay .ho-runner b { color: var(--sd-team-deep); }
.ho-runner i { font-style: normal; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); }
.ho-track { position: relative; width: clamp(70px, 16vw, 120px); height: 22px; display: grid; align-items: center; }
.ho-lane { height: 2px; border-radius: 2px; background: repeating-linear-gradient(90deg, var(--sd-team-brd) 0 8px, transparent 8px 14px); }
.ho-baton { position: absolute; left: 0; top: 50%; width: 20px; height: 20px; margin-top: -10px; border-radius: 50%;
  display: grid; place-items: center; color: #1c1204; background: var(--sd-team-grad); opacity: 0.35;
  transition: opacity 0.25s; }
.ho-relay.armed .ho-baton { opacity: 1; animation: ho-shuttle 2.2s var(--sd-spring) infinite; }
.ho-relay.firing .ho-baton { animation: ho-fire 0.6s var(--sd-spring) forwards; }
@keyframes ho-shuttle { 0%, 12% { left: 0; } 55%, 70% { left: calc(100% - 20px); } 100% { left: 0; } }
@keyframes ho-fire { from { left: 0; } to { left: calc(100% - 20px); } }

.ho-lbl { font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.ho-opt { font-weight: 500; color: var(--sd-text-dim); }
.ho-reasons { display: flex; flex-wrap: wrap; gap: 6px; }
.ho-reason { padding: 6px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 650;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.ho-reason:hover { border-color: var(--sd-team-brd); color: var(--sd-text); }
.ho-reason.on { color: var(--sd-team-core); background: var(--sd-team-soft); border-color: var(--sd-team-brd); }
.ho-note { width: 100%; resize: vertical; padding: 10px 12px; border-radius: 12px; font-family: inherit; font-size: 13px;
  color: var(--sd-text); background: var(--sd-input-bg, var(--sd-surface)); border: 1px solid var(--sd-border-strong); }
.ho-err { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--sd-danger); margin: 0; }

.ho-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.ho-btn.primary { border: none; background: var(--sd-team-grad); color: #1c1204; }
[data-theme="light"] .ho-btn.primary { color: #fff8ec; }
.ho-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ho-btn .spin { animation: ho-rot 1s linear infinite; }
@keyframes ho-rot { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ho-baton { animation: none; }
}
</style>
