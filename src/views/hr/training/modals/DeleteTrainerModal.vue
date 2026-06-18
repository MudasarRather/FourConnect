<template>
  <TrnModal :open="open" title="Remove trainer" subtitle="Removes this faculty member from the roster." :icon="Trash2" @close="close">
    <template v-if="trainer">
      <Motion as="div" class="dt-target" :style="{ '--c': accent }"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="dt-av">{{ initials }}</span>
        <div class="dt-target-meta">
          <span class="dt-name">{{ trainer.name }}</span>
          <span class="dt-sub"><span class="dt-type"><span class="tt-dot" />{{ typeLabel }}</span></span>
        </div>
      </Motion>

      <!-- BLOCKED: leading programs -->
      <Motion v-if="blocked" as="div" class="dt-block-warn"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.06 }">
        <span class="dtw-ic"><Lock :size="18" /></span>
        <div>
          <h4>Can't remove — leading {{ linked }} program{{ linked === 1 ? '' : 's' }}</h4>
          <p>Reassign this trainer's programs to someone else (in the Programs tab) before removing them from the roster.</p>
        </div>
      </Motion>

      <!-- reason workflow -->
      <template v-else>
        <Motion as="div" class="dt-warn"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.05 }">
          <AlertTriangle :size="15" class="dtw-pulse" />
          <span>This removes the trainer from the faculty roster. It's reversible only from the database.</span>
        </Motion>

        <Motion as="div" class="dt-fields"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.12 }">
          <TrnSelect v-model="reason" label="Reason for removal" required :options="REASONS" placeholder="Choose a reason…" />
          <label class="dt-note">
            <span class="dt-note-label">Note <i>(optional)</i></span>
            <textarea v-model="note" rows="2" maxlength="240" placeholder="Add context for the audit trail…" />
          </label>
          <label class="dt-confirm">
            <span class="dt-note-label">Type <b>{{ trainer.name }}</b> to confirm</span>
            <input v-model="confirmText" :placeholder="trainer.name" autocomplete="off" spellcheck="false" :class="{ ok: nameMatches }" />
          </label>
        </Motion>
      </template>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="close">{{ blocked ? 'Close' : 'Cancel' }}</button>
      <Motion v-if="!blocked" as="button" class="trn-btn trn-btn-danger dt-go" :class="{ armed: canDelete }"
        :disabled="!canDelete || deleting" :whileHover="canDelete && !deleting ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="confirm">
        <Loader v-if="deleting" :size="14" class="spin" /><Trash2 v-else :size="14" />
        Remove trainer
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Trash2, AlertTriangle, Lock, Loader } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnSelect from '../components/TrnSelect.vue'
import { deleteTrainer } from '@/composables/useTraining'

const props = defineProps({ open: { type: Boolean, default: false }, trainer: { type: Object, default: null } })
const emit = defineEmits(['close', 'deleted'])
const toast = useToast()

const REASONS = [
  { value: 'Left the organization', label: 'Left the organization' },
  { value: 'No longer engaged', label: 'No longer engaged' },
  { value: 'Duplicate record', label: 'Duplicate record' },
  { value: 'Created in error', label: 'Created in error' },
  { value: 'Other', label: 'Other reason' },
]
const TYPE_COLORS = { INTERNAL: 'var(--trn-amber)', EXTERNAL: 'var(--trn-ember)', VENDOR: 'var(--trn-amber-strong)' }

const reason = ref('')
const note = ref('')
const confirmText = ref('')
const deleting = ref(false)

watch(() => props.open, (o) => { if (o) { reason.value = ''; note.value = ''; confirmText.value = ''; deleting.value = false } })

const accent = computed(() => TYPE_COLORS[props.trainer?.trainer_type] || 'var(--trn-amber)')
const typeLabel = computed(() => {
  const t = props.trainer?.trainer_type || 'INTERNAL'
  return t.charAt(0) + t.slice(1).toLowerCase()
})
const initials = computed(() => (props.trainer?.name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const linked = computed(() => Number(props.trainer?.program_count) || 0)
const blocked = computed(() => linked.value > 0)
const nameMatches = computed(() => (confirmText.value || '').trim() === (props.trainer?.name || '').trim())
const canDelete = computed(() => !blocked.value && !!reason.value && nameMatches.value)

const close = () => emit('close')
const confirm = async () => {
  if (!canDelete.value) return
  deleting.value = true
  try {
    await deleteTrainer(props.trainer.id, { reason: reason.value, note: note.value })
    toast.success('Trainer removed')
    emit('deleted')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove trainer')
    deleting.value = false
  }
}
</script>

<style scoped>
.dt-target { display: flex; align-items: center; gap: 13px; padding: 13px 14px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); margin-bottom: 16px; }
.dt-av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 14px; font-weight: 700; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.dt-target-meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.dt-name { font-size: 14.5px; font-weight: 700; color: var(--trn-text); }
.dt-type { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.tt-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }

.dt-block-warn { display: flex; gap: 12px; padding: 16px; border-radius: 14px;
  background: var(--trn-st-failed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.dtw-ic { display: inline-flex; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; align-items: center; justify-content: center;
  color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 16%, transparent); }
.dt-block-warn h4 { margin: 0 0 4px; font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.dt-block-warn p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }

.dt-warn { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; margin-bottom: 16px;
  background: var(--trn-cert-pending-soft); border: 1px solid color-mix(in srgb, var(--trn-ember) 26%, transparent);
  font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }
.dt-warn :deep(svg) { color: var(--trn-ember); flex-shrink: 0; margin-top: 1px; }
.dtw-pulse { animation: trn-pulse-dot 2.2s ease-out infinite; border-radius: 50%; }

.dt-fields { display: flex; flex-direction: column; gap: 13px; }
.dt-note, .dt-confirm { display: flex; flex-direction: column; gap: 6px; }
.dt-note-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.dt-note-label i { font-weight: 400; color: var(--trn-text-dim); font-style: normal; }
.dt-note-label b { color: var(--trn-amber-strong); font-weight: 700; }
.dt-note textarea, .dt-confirm input { width: 100%; font: inherit; font-size: 13.5px; color: var(--trn-text);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); border-radius: 11px; padding: 9px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.dt-note textarea { resize: vertical; min-height: 52px; }
.dt-note textarea:focus, .dt-confirm input:focus { outline: none; border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.dt-confirm input.ok { border-color: color-mix(in srgb, var(--trn-st-completed) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-st-completed) 14%, transparent); }

.dt-go { margin-left: 0; opacity: 0.6; transition: opacity 0.25s, box-shadow 0.25s; }
.dt-go.armed { opacity: 1; box-shadow: 0 0 20px -6px color-mix(in srgb, var(--trn-st-failed) 60%, transparent); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@media (prefers-reduced-motion: reduce) { .dtw-pulse { animation: none; } }
</style>
