<template>
  <SetModal :open="open" :title="`Delete ${domain.noun}`" :subtitle="target?.name || ''"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="640" aside-placement="bottom" mode="delete" @close="$emit('close')">
    <div class="md">
      <Motion as="div" class="md-target"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="md-ic"><component :is="domain.icon" :size="18" /></span>
        <div class="md-target-id">
          <b>{{ target?.name || target?.label || '—' }}</b>
          <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
        </div>
        <span class="md-target-stamp">Pending removal</span>
      </Motion>

      <Motion as="label" class="md-reason"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
        <span class="md-reason-lab">Reason for removal <i>(optional — recorded in the audit ledger)</i></span>
        <textarea v-model="reason" rows="3" class="md-textarea" placeholder="e.g. Merged into another department / no longer in use…" />
      </Motion>

      <Motion as="div" class="md-confirm-note"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.4, delay: 0.16 }">
        <ShieldAlert :size="13" /> This action is logged against your account and is reversible by a super administrator.
      </Motion>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="Trash2"
        title="What removal does" :summary="summary" :steps="steps" :affects="affects"
        :note="note" danger :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn md-confirm" :class="{ disabled: loading }"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" /> Delete {{ domain.noun }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Archive, ShieldCheck, History, RotateCcw, ShieldAlert } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  domain: { type: Object, required: true },
  target: { type: Object, default: null },
})
defineEmits(['close', 'confirm'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const affects = computed(() => (props.domain.governs || [])
  .map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label })))
const summary = computed(() => `Removing this ${props.domain.noun} retires it from new selections. It is a soft-delete — nothing is erased. Here is exactly what happens.`)
const steps = computed(() => {
  const noun = props.domain.noun
  return [
    { icon: Archive, title: 'Soft-delete', text: `The ${noun} is tombstoned — hidden from every picker, but the row is retained in the database.` },
    { icon: ShieldCheck, title: 'Guarded', text: 'If any live record still references it, the delete is blocked until those records are reassigned.' },
    { icon: History, title: 'Audited', text: 'The removal and your reason are sealed into the immutable settings ledger.' },
    { icon: RotateCcw, title: 'Reversible', text: 'A super administrator can restore it later from the recovery view.' },
  ]
})
const note = computed(() => `Records currently pointing at this ${props.domain.noun} are not deleted with it — reassign them first, or the delete returns an error.`)
</script>

<style scoped>
.md { display: flex; flex-direction: column; gap: 14px; }
.md-target { display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.md-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.md-target-id { flex: 1; min-width: 0; }
.md-target-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); }
.md-target-id span { font-size: 11px; color: var(--set-text-muted); }
.md-target-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; color: var(--set-conflict); background: var(--set-conflict-soft);
  border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); }
.md-reason { display: flex; flex-direction: column; gap: 6px; }
.md-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.md-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.md-textarea { width: 100%; resize: vertical; min-height: 70px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.md-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.md-textarea::placeholder { color: var(--hr-input-placeholder); }
.md-confirm-note { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.md-confirm-note :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

.md-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.md-confirm:hover { color: #fff; }
</style>
