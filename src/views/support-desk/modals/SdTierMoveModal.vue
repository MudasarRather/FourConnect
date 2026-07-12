<template>
  <SdModalShell :open="!!ticket" :eyebrow="isUp ? 'TIER LADDER · ESCALATE' : 'TIER LADDER · SEND BACK'"
    :title="isUp ? `Escalate to ${targetMeta.label}` : `Send back to ${targetMeta.label}`"
    width="560px" @close="$emit('close')">
    <div v-if="ticket" class="tmm">
      <!-- the ladder graphic: from → to -->
      <div class="tmm-ladder" :style="{ '--fc': fromMeta.accent, '--tc2': targetMeta.accent }">
        <span class="tmm-rung from sd-mono">{{ fromMeta.short }}</span>
        <span class="tmm-arrow" :class="{ down: !isUp }" aria-hidden="true">
          <component :is="isUp ? ArrowUpRight : ArrowDownLeft" :size="17" />
          <i class="tmm-arrow-run" />
        </span>
        <span class="tmm-rung to sd-mono">{{ targetMeta.short }}</span>
        <span class="tmm-tno sd-mono">{{ ticket.ticket_number }}</span>
      </div>

      <!-- target platform picker (only when the current tier has neighbours both ways) -->
      <div v-if="tierChoices.length > 1" class="tmm-f">
        <span>Target platform</span>
        <div class="tmm-seg">
          <button v-for="t in tierChoices" :key="t" type="button" class="tmm-seg-b" :class="{ on: toTier === t }"
            :style="{ '--sc': TIER_META[t].accent }" @click="toTier = t">
            {{ TIER_META[t].short }} · {{ TIER_META[t].label.split('· ')[1] }}
          </button>
        </div>
      </div>

      <!-- target queue -->
      <div class="tmm-f">
        <span>Target lane <i>· auto-picks the category match when left on Auto</i></span>
        <SdSelect v-model="queueId" :options="queueOpts" placeholder="Auto — best lane at the tier" />
        <p v-if="!tierQueues.length" class="tmm-warn">
          <TriangleAlert :size="12" /> No active {{ targetMeta.short }} lane exists yet — an admin must lay one in the Interlocking Tower first.
        </p>
        <p v-if="isTerminal" class="tmm-warn">
          <TriangleAlert :size="12" /> This ticket is {{ ticket?.status }} — reopen it before a tier move.
        </p>
      </div>

      <!-- reason -->
      <div class="tmm-f">
        <span>Reason</span>
        <div class="tmm-seg wrap">
          <button v-for="r in reasonOpts" :key="r.value" type="button" class="tmm-seg-b sm" :class="{ on: reasonCode === r.value }"
            :style="{ '--sc': targetMeta.accent }" @click="reasonCode = r.value">{{ r.label }}</button>
        </div>
        <textarea v-model="note" class="tmm-inp" rows="2"
          :placeholder="isUp ? 'Context for the receiving tier…' : 'What should the lower tier do with it?'" />
      </div>

      <!-- L3 diagnosis gate -->
      <div v-if="isUp && toTier === 3" class="tmm-f">
        <span>Technical diagnosis <i class="req">· required for an L3 handoff</i></span>
        <textarea v-model="diagnosis" class="tmm-inp diag" rows="3"
          placeholder="What was tried, what was ruled out, suspected root cause…" />
        <p class="tmm-hint">Lands as an internal note on the ticket — the engineering tier starts from your work, not from zero.</p>
      </div>
    </div>
    <template #footer>
      <button class="tmm-btn" @click="$emit('close')">Cancel</button>
      <button class="tmm-btn primary" :disabled="busy || !valid" :style="{ '--pc': targetMeta.accent }" @click="confirm">
        <Loader v-if="busy" :size="13" class="tmm-spin" />
        {{ isUp ? `Escalate to ${targetMeta.short}` : `Send back to ${targetMeta.short}` }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdTierMoveModal — ONE modal for both directions of the tier ladder. mode='escalate'
   → POST /tickets/{id}/tier-escalate (functional escalation + lane re-park; L3 demands
   a diagnosis). mode='descend' → POST /tickets/{id}/tier-descend (reason-coded send-
   back; the backend un-assigns owners who aren't on the receiving team). Queues at the
   target tier come from the caller (the tier board already knows its lanes) or are
   fetched on open. */
import { ref, computed, watch } from 'vue'
import { ArrowUpRight, ArrowDownLeft, TriangleAlert, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  tierEscalate, tierDescend, listQueues, TIER_META, TIER_DESCEND_REASONS,
} from '@/composables/useSupportDesk'

const ESCALATE_REASONS = [
  { value: 'complexity', label: 'Technical complexity' },
  { value: 'needs_approval', label: 'Needs approval' },
  { value: 'sla_risk', label: 'SLA risk' },
  { value: 'customer_request', label: 'Customer request' },
]

const props = defineProps({
  ticket: { type: Object, default: null },
  mode: { type: String, default: 'escalate' },     // escalate | descend
  fromTier: { type: Number, default: 1 },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const isUp = computed(() => props.mode === 'escalate')
const tierChoices = computed(() => (isUp.value
  ? [2, 3].filter(t => t > (props.fromTier || 1))
  : [1, 2].filter(t => t < (props.fromTier || 3))))
const toTier = ref(2)
const fromMeta = computed(() => TIER_META[props.fromTier] || TIER_META[1])
const targetMeta = computed(() => TIER_META[toTier.value] || TIER_META[2])
const reasonOpts = computed(() => (isUp.value ? ESCALATE_REASONS : TIER_DESCEND_REASONS))

const queueId = ref('')
const reasonCode = ref('')
const note = ref('')
const diagnosis = ref('')
const busy = ref(false)

const allQueues = ref([])
watch(() => props.ticket, async (t) => {
  if (!t) return
  toTier.value = isUp.value ? Math.min(3, (props.fromTier || 1) + 1) : Math.max(1, (props.fromTier || 2) - 1)
  queueId.value = ''
  reasonCode.value = reasonOpts.value[0]?.value || ''
  note.value = ''; diagnosis.value = ''; busy.value = false
  try { allQueues.value = await listQueues() } catch { allQueues.value = [] }
})
const tierQueues = computed(() => (allQueues.value || []).filter(q => q.tier === toTier.value && q.is_active))
const queueOpts = computed(() => [{ value: '', label: 'Auto — best lane at the tier' },
  ...tierQueues.value.map(q => ({ value: q.id, label: `${q.name}${q.team_name ? ' · ' + q.team_name : ''}` }))])

/* Terminal seal — the backend 409s tier moves on resolved/closed/archived/merged
   tickets; block here too so no caller can submit-and-fail. */
const isTerminal = computed(() =>
  !!props.ticket && (['resolved', 'closed', 'archived'].includes(props.ticket.status) || props.ticket.merged_into_id))

const valid = computed(() => {
  if (!props.ticket || !tierQueues.value.length || isTerminal.value) return false
  if (isUp.value && toTier.value === 3 && diagnosis.value.trim().length < 10) return false
  return true
})

const confirm = async () => {
  if (!valid.value) return
  busy.value = true
  const payload = {
    to_tier: toTier.value,
    reason_code: reasonCode.value || null,
    reason: note.value.trim() || null,
    queue_id: queueId.value || null,
  }
  try {
    if (isUp.value) await tierEscalate(props.ticket.id, { ...payload, diagnosis: diagnosis.value.trim() || null })
    else await tierDescend(props.ticket.id, payload)
    toast.success(`${props.ticket.ticket_number} ${isUp.value ? 'escalated to' : 'sent back to'} ${targetMeta.value.short}`)
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Tier move failed')
  } finally { busy.value = false }
}
</script>

<style scoped>
.tmm { display: flex; flex-direction: column; gap: 14px; }

.tmm-ladder { position: relative; display: flex; align-items: center; justify-content: center; gap: 18px;
  padding: 16px; border-radius: 13px; border: 1px dashed var(--sd-border-strong);
  background: linear-gradient(115deg, color-mix(in srgb, var(--fc) 7%, transparent), color-mix(in srgb, var(--tc2) 9%, transparent)); }
.tmm-rung { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 13px;
  font-size: 15px; font-weight: 800; }
.tmm-rung.from { color: var(--fc); border: 1.5px solid color-mix(in srgb, var(--fc) 50%, transparent); background: color-mix(in srgb, var(--fc) 10%, transparent); }
.tmm-rung.to { color: var(--tc2); border: 1.5px solid var(--tc2); background: color-mix(in srgb, var(--tc2) 14%, transparent);
  box-shadow: 0 0 22px -6px var(--tc2); }
.tmm-arrow { position: relative; display: grid; place-items: center; color: var(--tc2); width: 60px; }
.tmm-arrow-run { position: absolute; left: 0; right: 0; bottom: -7px; height: 2px; overflow: hidden; border-radius: 2px;
  background: color-mix(in srgb, var(--tc2) 22%, transparent); }
.tmm-arrow-run::after { content: ''; position: absolute; top: 0; bottom: 0; width: 20px;
  background: var(--tc2); border-radius: 2px; animation: tmm-run 1.4s linear infinite; }
.tmm-arrow.down .tmm-arrow-run::after { animation-direction: reverse; }
.tmm-tno { position: absolute; top: 8px; right: 12px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-text-dim); }

.tmm-f { display: flex; flex-direction: column; gap: 6px; }
.tmm-f > span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.tmm-f i { font-style: normal; color: var(--sd-text-dim); font-weight: 600; }
.tmm-f i.req { color: var(--sd-qs-warn); }
.tmm-hint { margin: 0; font-size: 10.5px; color: var(--sd-text-dim); }
.tmm-warn { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 11px; font-weight: 600; color: var(--sd-qs-warn); }

.tmm-seg { display: flex; gap: 6px; }
.tmm-seg.wrap { flex-wrap: wrap; }
.tmm-seg-b { padding: 8px 13px; border-radius: 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.tmm-seg-b.sm { padding: 7px 11px; font-size: 11px; }
.tmm-seg-b.on { border-color: var(--sc); color: var(--sc); background: color-mix(in srgb, var(--sc) 11%, transparent); }

.tmm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.tmm-inp:focus { outline: none; border-color: var(--sd-qs-core); }
.tmm-inp.diag:focus { border-color: var(--sd-qs-warn); }

.tmm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.tmm-btn.primary { border-color: transparent; color: #1b1206;
  background: linear-gradient(135deg, color-mix(in srgb, var(--pc) 70%, #fff), var(--pc)); }
.tmm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.tmm-spin { animation: tmm-rot 0.9s linear infinite; }

@keyframes tmm-run { 0% { left: -20px; } 100% { left: 100%; } }
@keyframes tmm-rot { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tmm-arrow-run::after { animation: none; }
}
</style>
