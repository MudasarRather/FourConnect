<template>
  <OnbModal :open="open" :title="cfg.title" :subtitle="cfg.subtitle" :width="520" @close="$emit('close')">
    <div class="dm" v-if="open && swap">
      <!-- animated focal icon -->
      <Motion as="div" class="dm-iconwrap" :data-tone="cfg.tone"
        :initial="{ opacity: 0, scale: 0.6 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }">
        <span class="dm-ring" aria-hidden="true" />
        <span class="dm-ring r2" aria-hidden="true" />
        <span class="dm-ic"><component :is="cfg.icon" :size="26" /></span>
      </Motion>

      <!-- what you're acting on -->
      <Motion as="div" class="dm-summary"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
        <div class="dm-party">
          <span class="dm-av">{{ initials(swap.requester_name) }}</span>
          <div class="dm-id"><b>{{ swap.requester_name || '—' }}</b><span class="dm-chip">{{ swap.requester_shift_code || '—' }}</span></div>
        </div>
        <div class="dm-mid">
          <ArrowLeftRight :size="15" />
          <small>{{ formatDate(swap.swap_date) }}</small>
        </div>
        <div class="dm-party right">
          <div class="dm-id ar"><b>{{ swap.counterparty_name || '—' }}</b><span class="dm-chip alt">{{ swap.counterparty_shift_code || '—' }}</span></div>
          <span class="dm-av alt">{{ initials(swap.counterparty_name) }}</span>
        </div>
      </Motion>

      <Motion as="div" class="dm-field"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
        <OnbField type="textarea" :rows="3" :label="cfg.label" :placeholder="cfg.placeholder"
          :model-value="notes" @update:model-value="v => notes = v" />
        <p v-if="cfg.danger" class="dm-warn"><AlertTriangle :size="12" /> {{ cfg.danger }}</p>
      </Motion>
    </div>

    <template #footer>
      <span class="dm-foot">{{ cfg.foot }}</span>
      <button class="dm-ghost" @click="$emit('close')">Cancel</button>
      <button class="dm-confirm" :data-tone="cfg.tone" :disabled="busy || (cfg.requireReason && !notes.trim())" @click="confirm">
        <component v-if="!busy" :is="cfg.icon" :size="14" /><Loader2 v-else :size="14" class="spin" />
        {{ cfg.cta }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Ban, Undo2, Trash2, ArrowLeftRight, AlertTriangle, Loader2 } from 'lucide-vue-next'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import OnbField from '../../onboarding/components/OnbField.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'reject' }, // reject | withdraw | delete
  swap: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const notes = ref('')
watch(() => props.open, (o) => { if (o) notes.value = '' })

const MODES = {
  reject: {
    title: 'Reject swap', subtitle: 'Decline this exchange — both employees keep their original shifts.',
    icon: Ban, tone: 'danger', cta: 'Reject swap', requireReason: true,
    label: 'Reason for rejection *', placeholder: 'Explain why this swap is being declined…',
    foot: 'The requester is notified with your reason.', danger: '',
  },
  withdraw: {
    title: 'Withdraw request', subtitle: 'Pull this request out of the queue before it is approved.',
    icon: Undo2, tone: 'amber', cta: 'Withdraw request', requireReason: false,
    label: 'Reason (optional)', placeholder: 'Why is this request being withdrawn?',
    foot: 'The request is cancelled — no shifts change.', danger: '',
  },
  delete: {
    title: 'Delete swap', subtitle: 'Remove this request from the queue entirely.',
    icon: Trash2, tone: 'danger', cta: 'Delete forever', requireReason: false,
    label: 'Note for the audit trail (optional)', placeholder: 'Add an internal note…',
    foot: 'This removes the record from the queue.', danger: 'This cannot be undone.',
  },
}
const cfg = computed(() => MODES[props.mode] || MODES.reject)

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const formatDate = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return iso } }

const confirm = () => {
  if (cfg.value.requireReason && !notes.value.trim()) return
  emit('confirm', notes.value.trim())
}
</script>

<style scoped>
.dm { display: flex; flex-direction: column; align-items: center; gap: 18px; }

.dm-iconwrap { position: relative; width: 72px; height: 72px; display: grid; place-items: center; }
.dm-ic { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; z-index: 1; }
.dm-ring { position: absolute; inset: 6px; border-radius: 20px; opacity: 0; }
.dm-ring.r2 { inset: 6px; }
.dm-iconwrap[data-tone="danger"] .dm-ic { background: var(--shift-alert-soft, rgba(239,68,68,0.13)); color: var(--shift-alert, #ef4444); }
.dm-iconwrap[data-tone="danger"] .dm-ring { border: 1.5px solid var(--shift-alert, #ef4444); animation: dm-pulse 2.6s ease-out infinite; }
.dm-iconwrap[data-tone="danger"] .dm-ring.r2 { animation-delay: 1.3s; }
.dm-iconwrap[data-tone="amber"] .dm-ic { background: rgba(251,191,36,0.13); color: var(--shift-amber-strong, #f59e0b); }
.dm-iconwrap[data-tone="amber"] .dm-ring { border: 1.5px solid var(--shift-amber, #fbbf24); animation: dm-pulse 2.6s ease-out infinite; }
.dm-iconwrap[data-tone="amber"] .dm-ring.r2 { animation-delay: 1.3s; }

.dm-summary { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; width: 100%;
  padding: 13px 15px; border-radius: 14px; background: var(--shift-surface-2, rgba(26,29,34,0.86)); border: 1px solid var(--shift-border-soft, rgba(255,255,255,0.06)); }
.dm-party { display: flex; align-items: center; gap: 9px; min-width: 0; }
.dm-party.right { justify-content: flex-end; }
.dm-av { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 800; flex-shrink: 0;
  font-family: var(--shift-mono); background: radial-gradient(circle at 38% 32%, #fff4d6, #fbbf24 65%, #b45309); color: #2a1a05; }
.dm-av.alt { background: radial-gradient(circle at 38% 32%, #ffe2c4, #fb923c 62%, #c2410c); color: #2a1205; }
.dm-id { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.dm-id.ar { align-items: flex-end; }
.dm-id b { font-size: 12.5px; font-weight: 700; color: var(--shift-text, #f4f6fa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-chip { font-family: var(--shift-mono); font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 5px; background: rgba(251,191,36,0.14); color: var(--shift-amber, #fbbf24); }
.dm-chip.alt { background: rgba(251,146,60,0.16); color: var(--shift-ember, #fb923c); }
.dm-mid { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--shift-amber, #fbbf24); flex-shrink: 0; }
.dm-mid small { font-family: var(--shift-mono); font-size: 9px; color: var(--shift-text-muted, #8a91a0); }

.dm-field { width: 100%; }
.dm-warn { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 11.5px; color: var(--shift-alert, #ef4444); }

.dm-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim, #5f6675); }
.dm-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft, rgba(255,255,255,0.06)); background: transparent;
  color: var(--shift-text-2, #c2c8d2); cursor: pointer; font-size: 13px; font-weight: 600; transition: border-color 0.18s, color 0.18s; }
.dm-ghost:hover { border-color: var(--shift-border, rgba(251,191,36,0.13)); color: var(--shift-text, #f4f6fa); }
.dm-confirm { display: inline-flex; align-items: center; gap: 7px; padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer;
  font-size: 13px; font-weight: 700; color: #1f1408; transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s; }
.dm-confirm[data-tone="danger"] { background: linear-gradient(135deg, #f87171, #ef4444 55%, #b91c1c); color: #fff; }
.dm-confirm[data-tone="amber"] { background: var(--shift-grad-cta, linear-gradient(135deg,#fbbf24,#f59e0b 52%,#ea580c)); }
.dm-confirm:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.28); }
.dm-confirm:disabled { opacity: 0.5; cursor: default; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

@keyframes dm-pulse { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }

@media (max-width: 480px) {
  .dm-summary { grid-template-columns: 1fr; gap: 8px; }
  .dm-party.right { justify-content: flex-start; }
  .dm-id.ar { align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) { .dm-ring { animation: none !important; } }

/* ════════════ LIGHT THEME ════════════ */
[data-theme="light"] .dm-summary { background: rgba(255,250,240,0.7); border-color: rgba(40,32,20,0.10); }
[data-theme="light"] .dm-confirm[data-tone="danger"] { color: #fff; }
</style>
