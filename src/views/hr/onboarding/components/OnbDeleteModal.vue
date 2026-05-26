<template>
  <OnbModal
    :open="open"
    :title="title"
    :subtitle="subtitle"
    :icon="ShieldAlert"
    :width="520"
    @close="cancel"
  >
    <div class="odm-stack">
      <!-- Target summary -->
      <Motion
        v-if="targetLabel"
        class="odm-target"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.34, delay: 0.06, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="odm-target-icon">
          <component :is="targetIcon || FileWarning" :size="16" />
        </div>
        <div class="odm-target-body">
          <div class="odm-target-label">{{ targetLabel }}</div>
          <div v-if="targetMeta" class="odm-target-meta">
            <span>{{ targetMeta }}</span>
            <span v-if="targetTag" class="odm-target-sep">·</span>
            <span v-if="targetTag" class="odm-target-tag">{{ targetTag }}</span>
          </div>
        </div>
      </Motion>

      <!-- Preset chips -->
      <Motion
        class="odm-presets"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.32, delay: 0.12, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="odm-presets-label">Common reasons</span>
        <div class="odm-chips">
          <Motion
            v-for="(p, idx) in presets"
            :key="p"
            as="button"
            type="button"
            class="odm-chip"
            :initial="{ opacity: 0, scale: 0.85 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.26, delay: 0.16 + idx * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="{ y: -2 }"
            :whileTap="{ scale: 0.95 }"
            @click="pick(p)"
          >
            <Plus :size="11" /> {{ p }}
          </Motion>
        </div>
      </Motion>

      <!-- Reason -->
      <Motion
        class="odm-field"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.32, delay: 0.22, ease: [0.22, 1, 0.36, 1] }"
      >
        <label class="odm-field-label">
          Reason for deletion <span v-if="reasonRequired" class="odm-req">*</span>
          <span v-else class="odm-opt">(optional)</span>
        </label>
        <textarea
          ref="reasonInputRef"
          v-model="localReason"
          class="odm-textarea"
          :class="{ 'has-error': hasError }"
          rows="4"
          :placeholder="reasonPlaceholder"
          @input="hasError = false"
        ></textarea>
        <span v-if="hasError" class="odm-field-error">
          <AlertTriangle :size="11" /> Reason is required.
        </span>
      </Motion>

      <!-- Warning -->
      <Motion
        class="odm-warn"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.32, delay: 0.28, ease: [0.22, 1, 0.36, 1] }"
      >
        <ShieldAlert :size="13" />
        <span>{{ warning }}</span>
      </Motion>
    </div>

    <template #footer>
      <button class="onb-btn-ghost" :disabled="submitting" @click="cancel">Cancel</button>
      <Motion
        as="button"
        type="button"
        class="onb-btn-danger odm-confirm-btn"
        :whileHover="(submitting || (reasonRequired && !localReason.trim())) ? {} : { y: -1, scale: 1.02 }"
        :whileTap="(submitting || (reasonRequired && !localReason.trim())) ? {} : { scale: 0.97 }"
        :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }"
        :disabled="submitting || (reasonRequired && !localReason.trim())"
        @click="confirm"
      >
        <Loader2 v-if="submitting" :size="13" class="odm-spin" />
        <Trash2 v-else :size="13" />
        {{ submitting ? submittingLabel : confirmLabel }}
      </Motion>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { ShieldAlert, AlertTriangle, Loader2, Trash2, Plus, FileWarning } from 'lucide-vue-next'
import OnbModal from './OnbModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Delete item?' },
  subtitle: { type: String, default: 'This action cannot be undone.' },
  targetLabel: { type: String, default: '' },
  targetMeta:  { type: String, default: '' },
  targetTag:   { type: String, default: '' },
  targetIcon:  { type: [Object, Function], default: null },
  presets: {
    type: Array,
    default: () => [
      'Created by mistake',
      'Duplicate entry',
      'No longer required',
      'Replacing with updated record',
    ],
  },
  reasonRequired: { type: Boolean, default: true },
  reasonPlaceholder: {
    type: String,
    default: 'Briefly explain why this item is being removed...',
  },
  warning: {
    type: String,
    default: 'This will permanently remove the record and notify any subscribers.',
  },
  confirmLabel: { type: String, default: 'Delete' },
  submittingLabel: { type: String, default: 'Deleting…' },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const localReason = ref('')
const hasError = ref(false)
const reasonInputRef = ref(null)

watch(() => props.open, async (v) => {
  if (v) {
    localReason.value = ''
    hasError.value = false
    await nextTick()
    reasonInputRef.value?.focus()
  }
})

const pick = (preset) => {
  localReason.value = localReason.value
    ? `${localReason.value.replace(/\s*$/, '')}\n${preset}`
    : preset
  hasError.value = false
  nextTick(() => reasonInputRef.value?.focus())
}

const cancel = () => {
  if (props.submitting) return
  emit('close')
}

const confirm = () => {
  if (props.submitting) return
  if (props.reasonRequired && !localReason.value.trim()) {
    hasError.value = true
    return
  }
  emit('confirm', localReason.value.trim())
}
</script>

<style scoped>
.odm-stack { display: flex; flex-direction: column; gap: 16px; }

/* Target summary */
.odm-target {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(248, 113, 113, 0.10), rgba(251, 146, 60, 0.04)),
    rgba(20, 16, 12, 0.30);
  border: 1px solid rgba(248, 113, 113, 0.24);
  backdrop-filter: blur(12px);
}
.odm-target-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(248, 113, 113, 0.18);
  color: #fca5a5;
  flex-shrink: 0;
}
.odm-target-body { min-width: 0; flex: 1; }
.odm-target-label { font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.odm-target-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; color: var(--hr-text-muted);
  margin-top: 2px;
}
.odm-target-sep { opacity: 0.5; }
.odm-target-tag {
  font-weight: 700; letter-spacing: 0.5px;
  padding: 1px 6px; border-radius: 4px;
  background: rgba(248, 113, 113, 0.18); color: #fca5a5;
  text-transform: uppercase;
}

/* Preset chips */
.odm-presets { display: flex; flex-direction: column; gap: 8px; }
.odm-presets-label {
  font-size: 10px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.odm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.odm-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 10px;
  font-size: 11px; font-weight: 600;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: border-color .18s var(--hr-spring), background .18s var(--hr-spring), color .18s var(--hr-spring);
}
.odm-chip:hover {
  border-color: rgba(248, 113, 113, 0.40);
  background: rgba(248, 113, 113, 0.10);
  color: #fca5a5;
}

/* Reason textarea */
.odm-field { display: flex; flex-direction: column; gap: 6px; }
.odm-field-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 8px;
}
.odm-req { color: #f87171; font-weight: 800; }
.odm-opt { color: var(--hr-text-dim); font-weight: 500; letter-spacing: 0.2px; text-transform: none; }
.odm-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px; line-height: 1.55;
  color: var(--hr-text);
  font-family: inherit;
  resize: vertical;
  min-height: 96px;
  outline: none;
  transition: border-color .2s var(--hr-spring), box-shadow .2s var(--hr-spring), background .2s var(--hr-spring);
}
.odm-textarea::placeholder { color: rgba(255, 255, 255, 0.35); }
.odm-textarea:focus {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(248, 113, 113, 0.05);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.14);
}
.odm-textarea.has-error {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.18);
}
.odm-field-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #f87171;
}

/* Warning line */
.odm-warn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11.5px; color: var(--hr-text-muted);
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.22);
}
.odm-warn svg { color: var(--hr-accent-gold); flex-shrink: 0; }

/* Confirm button */
.odm-confirm-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  color: #fff !important;
  border-color: transparent !important;
  box-shadow: 0 8px 22px -8px rgba(220, 38, 38, 0.55);
}
.odm-confirm-btn:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 12px 30px -8px rgba(220, 38, 38, 0.72);
}
.odm-confirm-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.odm-spin { animation: odm-spin 0.8s linear infinite; }
@keyframes odm-spin { to { transform: rotate(360deg); } }

/* ── Light theme overrides ── */
[data-theme="light"] .odm-target {
  background:
    linear-gradient(135deg, rgba(220, 38, 38, 0.10), rgba(251, 146, 60, 0.06)),
    rgba(255, 250, 240, 0.80);
  border-color: rgba(220, 38, 38, 0.30);
}
[data-theme="light"] .odm-target-icon {
  background: rgba(220, 38, 38, 0.16);
  color: #b91c1c;
}
[data-theme="light"] .odm-target-tag {
  background: rgba(220, 38, 38, 0.16);
  color: #b91c1c;
}
[data-theme="light"] .odm-chip {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.12);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .odm-chip:hover {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.36);
  color: #b91c1c;
}
[data-theme="light"] .odm-textarea {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text);
}
[data-theme="light"] .odm-textarea::placeholder { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .odm-textarea:focus {
  border-color: rgba(220, 38, 38, 0.55);
  background: rgba(255, 246, 226, 0.95);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .odm-textarea.has-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .odm-field-error { color: #b91c1c; }
[data-theme="light"] .odm-req { color: #b91c1c; }
[data-theme="light"] .odm-warn {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.32);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .odm-warn svg { color: #b45309; }
[data-theme="light"] .odm-confirm-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
  box-shadow: 0 8px 22px -8px rgba(220, 38, 38, 0.60);
}
</style>
