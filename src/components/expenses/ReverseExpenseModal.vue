<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <Motion
          class="modal-panel"
          :initial="{ opacity: 0, y: 28, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.96 }"
          :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- Subtle glow border accent -->
          <div class="panel-aura" aria-hidden="true"></div>

          <!-- Header -->
          <Motion
            class="modal-header"
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.38, delay: 0.10, ease: [0.16, 1, 0.3, 1] }"
          >
            <Motion
              class="modal-header-icon"
              :initial="{ scale: 0.5, rotate: -45, opacity: 0 }"
              :animate="{ scale: 1, rotate: 0, opacity: 1 }"
              :transition="{ duration: 0.5, delay: 0.14, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <RotateCcw :size="18" />
            </Motion>
            <div>
              <h2>Reverse Expense</h2>
              <p class="modal-subtitle">Create an accounting reversal entry</p>
            </div>
            <Motion
              as="button"
              type="button"
              class="modal-close"
              :whileHover="{ rotate: 90, scale: 1.05 }"
              :whileTap="{ scale: 0.94 }"
              :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
              @click="$emit('close')"
            >
              <X :size="18" />
            </Motion>
          </Motion>

          <!-- Body -->
          <div class="modal-body">
            <!-- Financial Preview -->
            <Motion
              class="preview-card"
              :initial="{ opacity: 0, y: 14 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.42, delay: 0.16, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="preview-grid">
                <div class="preview-item">
                  <span class="pv-label">Original Amount</span>
                  <span class="pv-value">₹{{ Number(preview?.original_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                </div>
                <div class="preview-item">
                  <span class="pv-label">Already Reversed</span>
                  <span class="pv-value danger">₹{{ Number(preview?.already_reversed_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                </div>
                <div class="preview-item highlight">
                  <span class="pv-label">Remaining Reversible</span>
                  <span class="pv-value accent">₹{{ Number(preview?.remaining_reversible_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                </div>
              </div>
            </Motion>

            <!-- Reversal Type -->
            <Motion
              class="field-group"
              :initial="{ opacity: 0, y: 14 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.42, delay: 0.22, ease: [0.16, 1, 0.3, 1] }"
            >
              <label class="field-label">Reversal Type</label>
              <div class="radio-group">
                <Motion
                  as="label"
                  class="radio-option"
                  :class="{ active: form.reversal_type === 'FULL' }"
                  :whileHover="{ y: -2 }"
                  :whileTap="{ scale: 0.98 }"
                  :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
                >
                  <input type="radio" v-model="form.reversal_type" value="FULL" />
                  <div class="radio-dot"></div>
                  <div class="radio-text">
                    <span class="radio-title">Full Reversal</span>
                    <span class="radio-desc">Reverse entire remaining amount</span>
                  </div>
                </Motion>
                <Motion
                  as="label"
                  class="radio-option"
                  :class="{ active: form.reversal_type === 'PARTIAL' }"
                  :whileHover="{ y: -2 }"
                  :whileTap="{ scale: 0.98 }"
                  :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
                >
                  <input type="radio" v-model="form.reversal_type" value="PARTIAL" />
                  <div class="radio-dot"></div>
                  <div class="radio-text">
                    <span class="radio-title">Partial Reversal</span>
                    <span class="radio-desc">Reverse a specific amount</span>
                  </div>
                </Motion>
              </div>
            </Motion>

            <!-- Partial Amount -->
            <Transition name="rev-collapse">
              <Motion
                v-if="form.reversal_type === 'PARTIAL'"
                class="field-group"
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
              >
                <label class="field-label">Reversal Amount <span class="req">*</span></label>
                <div class="input-with-prefix">
                  <span class="prefix">₹</span>
                  <input v-model.number="form.reversed_amount" type="number" placeholder="Enter amount" :max="preview?.remaining_reversible_amount" min="1" />
                </div>
                <span class="field-hint" v-if="form.reversed_amount > (preview?.remaining_reversible_amount || 0)">
                  Cannot exceed ₹{{ Number(preview?.remaining_reversible_amount || 0).toLocaleString('en-IN') }}
                </span>
              </Motion>
            </Transition>

            <!-- Reason -->
            <Motion
              class="field-group"
              :initial="{ opacity: 0, y: 14 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.42, delay: 0.28, ease: [0.16, 1, 0.3, 1] }"
            >
              <label class="field-label">Reason Category <span class="req">*</span></label>
              <CustomSelect
                v-model="form.reason_category"
                :options="reasonOptions"
                placeholder="Select a reason"
                labelKey="label"
                valueKey="value"
              />
            </Motion>

            <Transition name="rev-collapse">
              <Motion
                v-if="form.reason_category === 'Other' || form.reason_category"
                class="field-group"
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
              >
                <label class="field-label">Additional Details</label>
                <textarea v-model="form.reason_details" rows="3" class="field-textarea" placeholder="Describe the reason for this reversal..."></textarea>
              </Motion>
            </Transition>

            <!-- Financial Impact Preview -->
            <Transition name="rev-collapse">
              <Motion
                v-if="impactAmount > 0"
                class="impact-card"
                :initial="{ opacity: 0, y: 14, scale: 0.98 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
              >
                <h4><TrendingDown :size="14" /> Financial Impact Preview</h4>
                <div class="impact-grid">
                  <div class="impact-row">
                    <span>Reversal Amount</span>
                    <span class="impact-value danger">-₹{{ impactAmount.toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                  </div>
                  <div class="impact-row">
                    <span>Budget Restored</span>
                    <span class="impact-value success">+₹{{ impactAmount.toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                  </div>
                  <div class="impact-row">
                    <span>Net Expense After</span>
                    <span class="impact-value">₹{{ Math.max(0, (preview?.original_amount || 0) - (preview?.already_reversed_amount || 0) - impactAmount).toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                  </div>
                </div>
              </Motion>
            </Transition>
          </div>

          <!-- Footer -->
          <Motion
            class="modal-footer"
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.38, delay: 0.34, ease: [0.16, 1, 0.3, 1] }"
          >
            <Motion
              as="button"
              type="button"
              class="btn-cancel"
              :whileHover="{ y: -1 }"
              :whileTap="{ scale: 0.97 }"
              @click="$emit('close')"
            >
              Cancel
            </Motion>
            <Motion
              as="button"
              type="button"
              class="btn-submit"
              :whileHover="!isValid || loading ? {} : { y: -2, scale: 1.02 }"
              :whileTap="!isValid || loading ? {} : { scale: 0.97 }"
              :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }"
              :disabled="!isValid || loading"
              @click="handleSubmit"
            >
              <Loader2 v-if="loading" :size="14" class="spin" />
              <RotateCcw v-else :size="14" />
              {{ loading ? 'Processing...' : 'Submit Reversal' }}
            </Motion>
          </Motion>
        </Motion>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, RotateCcw, Loader2, TrendingDown } from 'lucide-vue-next'
import { Motion } from 'motion-v'
import CustomSelect from '../ui/CustomSelect.vue'

const props = defineProps({
  isOpen: Boolean,
  preview: Object,
  loading: Boolean,
})

const emit = defineEmits(['close', 'confirm'])

const form = ref({
  reversal_type: 'FULL',
  reversed_amount: null,
  reason_category: '',
  reason_details: '',
})

const reasonOptions = [
  { label: 'Wrong Amount', value: 'Wrong Amount' },
  { label: 'Duplicate Entry', value: 'Duplicate Entry' },
  { label: 'Vendor Refund', value: 'Vendor Refund' },
  { label: 'Wrong Project', value: 'Wrong Project' },
  { label: 'Policy Violation', value: 'Policy Violation' },
  { label: 'Audit Correction', value: 'Audit Correction' },
  { label: 'Other', value: 'Other' },
]

const impactAmount = computed(() => {
  if (form.value.reversal_type === 'FULL') return props.preview?.remaining_reversible_amount || 0
  return Math.min(form.value.reversed_amount || 0, props.preview?.remaining_reversible_amount || 0)
})

const isValid = computed(() => {
  if (!form.value.reason_category) return false
  if (form.value.reversal_type === 'PARTIAL') {
    if (!form.value.reversed_amount || form.value.reversed_amount <= 0) return false
    if (form.value.reversed_amount > (props.preview?.remaining_reversible_amount || 0)) return false
  }
  return true
})

const handleSubmit = () => {
  if (!isValid.value) return
  emit('confirm', { ...form.value })
}

watch(() => props.isOpen, (val) => {
  if (val) {
    form.value = { reversal_type: 'FULL', reversed_amount: null, reason_category: '', reason_details: '' }
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.modal-panel {
  position: relative;
  width: 540px; max-width: 95vw; max-height: 90vh;
  display: flex; flex-direction: column;
  background: linear-gradient(135deg, rgba(28, 26, 22, 0.92) 0%, rgba(20, 18, 14, 0.95) 100%);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 22px;
  box-shadow:
    0 32px 80px rgba(0,0,0,0.6),
    0 12px 28px rgba(245, 158, 11, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.08);
  isolation: isolate;
  overflow: hidden;
}
/* Header + footer don't shrink; body fills + scrolls internally */
.modal-header { flex-shrink: 0; }
.modal-footer { flex-shrink: 0; }
.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(245, 158, 11, 0.25) transparent;
}
.modal-body::-webkit-scrollbar { width: 6px; }
.modal-body::-webkit-scrollbar-track { background: transparent; }
.modal-body::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.20);
  border-radius: 3px;
}
.modal-body::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.40); }
/* Subtle radial aura behind the panel */
.panel-aura {
  position: absolute;
  inset: -1px;
  border-radius: 22px;
  background:
    radial-gradient(60% 40% at 0% 0%, rgba(245, 158, 11, 0.10), transparent 60%),
    radial-gradient(55% 45% at 100% 100%, rgba(249, 115, 22, 0.08), transparent 65%);
  z-index: -1;
  pointer-events: none;
  opacity: 0.9;
}
.modal-header {
  display: flex; align-items: center; gap: 12px;
  padding: 24px 28px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);
  display: flex; align-items: center; justify-content: center;
  color: #f59e0b; flex-shrink: 0;
}
.modal-header h2 { font-size: 16px; font-weight: 700; color: white; margin: 0; }
.modal-subtitle { font-size: 12px; color: rgba(255,255,255,0.4); margin: 2px 0 0; }
.modal-close {
  margin-left: auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s;
}
.modal-close:hover { background: rgba(255,255,255,0.1); color: white; }

.modal-body { padding: 20px 28px; display: flex; flex-direction: column; gap: 20px; }

/* Preview Card */
.preview-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 16px;
}
.preview-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.preview-item { display: flex; flex-direction: column; gap: 4px; }
.pv-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
.pv-value { font-size: 15px; font-weight: 700; color: white; font-family: 'SF Mono', monospace; }
.pv-value.danger { color: #ef4444; }
.pv-value.accent { color: #f59e0b; }
.preview-item.highlight { background: rgba(245,158,11,0.05); border-radius: 8px; padding: 8px; margin: -8px; }

/* Fields */
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); }
.req { color: #ef4444; }
.field-hint { font-size: 11px; color: #ef4444; }

.radio-group { display: flex; gap: 10px; }
.radio-option {
  flex: 1; display: flex; align-items: flex-start; gap: 10px;
  padding: 14px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.2s;
}
.radio-option:hover { border-color: rgba(255,255,255,0.12); }
.radio-option.active { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.05); }
.radio-option input { display: none; }
.radio-dot {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
  border: 2px solid rgba(255,255,255,0.2); transition: all 0.2s;
}
.radio-option.active .radio-dot { border-color: #f59e0b; background: #f59e0b; box-shadow: inset 0 0 0 3px rgba(24,24,27,0.9); }
.radio-text { display: flex; flex-direction: column; gap: 2px; }
.radio-title { font-size: 13px; font-weight: 600; color: white; }
.radio-desc { font-size: 11px; color: rgba(255,255,255,0.4); }

.input-with-prefix {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; overflow: hidden;
}
.input-with-prefix .prefix {
  padding: 0 12px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.4);
  border-right: 1px solid rgba(255,255,255,0.06);
}
.input-with-prefix input {
  flex: 1; background: transparent; border: none; outline: none;
  padding: 10px 12px; color: white; font-size: 14px; font-weight: 600;
  font-family: 'SF Mono', monospace;
}
/* Hide number spinners */
.input-with-prefix input::-webkit-outer-spin-button,
.input-with-prefix input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.input-with-prefix input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.field-select, .field-textarea {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 12px; color: white; font-size: 13px;
  outline: none; transition: border-color 0.2s;
}
.field-select:focus, .field-textarea:focus { border-color: rgba(245,158,11,0.4); }
.field-select option { background: #18181b; color: white; }
.field-textarea { resize: vertical; min-height: 60px; font-family: inherit; }

/* Impact Card */
.impact-card {
  background: rgba(245,158,11,0.03); border: 1px solid rgba(245,158,11,0.1);
  border-radius: 12px; padding: 16px;
}
.impact-card h4 {
  font-size: 12px; font-weight: 700; color: #f59e0b; margin: 0 0 12px;
  display: flex; align-items: center; gap: 6px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.impact-grid { display: flex; flex-direction: column; gap: 8px; }
.impact-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: rgba(255,255,255,0.6);
}
.impact-value { font-weight: 700; font-family: 'SF Mono', monospace; }
.impact-value.danger { color: #ef4444; }
.impact-value.success { color: #22c55e; }

/* Footer */
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 28px 24px; border-top: 1px solid rgba(255,255,255,0.06);
}
.btn-cancel {
  padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.2s;
}
.btn-cancel:hover { background: rgba(255,255,255,0.1); }
.btn-submit {
  padding: 10px 24px; border-radius: 10px; font-size: 13px; font-weight: 600;
  background: #eab308; border: none; color: black;
  cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 6px;
}
.btn-submit:hover:not(:disabled) { background: #facc15; transform: translateY(-1px); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-panel, .modal-fade-leave-to .modal-panel { transform: translateY(20px) scale(0.97); }

/* Collapse transition for conditional sections */
.rev-collapse-enter-active {
  transition: opacity 0.32s ease, transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.32s ease;
  overflow: hidden;
}
.rev-collapse-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease, max-height 0.22s ease;
  overflow: hidden;
}
.rev-collapse-enter-from,
.rev-collapse-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}
.rev-collapse-enter-to,
.rev-collapse-leave-from {
  max-height: 400px;
}

/* ═════════════════════════════════════════════════════════════════════
   LIGHT THEME — warm cream frosted glass (matches EditTaskModal palette)
   ═════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
[data-theme="light"] .modal-panel {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.92) 0%, rgba(252, 240, 220, 0.96) 100%);
  border-color: rgba(217, 119, 6, 0.28);
  box-shadow:
    0 40px 80px rgba(40, 25, 10, 0.26),
    0 12px 24px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .panel-aura {
  background:
    radial-gradient(60% 40% at 0% 0%, rgba(217, 119, 6, 0.10), transparent 60%),
    radial-gradient(55% 45% at 100% 100%, rgba(180, 83, 9, 0.08), transparent 65%);
}

/* Header */
[data-theme="light"] .modal-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .modal-header h2 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .modal-subtitle { color: #6b5840; }
[data-theme="light"] .modal-header-icon {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.30);
  color: #b45309;
}
[data-theme="light"] .modal-close {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.12);
  color: #6b5840;
}
[data-theme="light"] .modal-close:hover {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.35);
  color: #92400e;
}

/* Preview card */
[data-theme="light"] .preview-card {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .pv-label { color: #6b5840; }
[data-theme="light"] .pv-value { color: var(--text-primary); }
[data-theme="light"] .pv-value.danger { color: #b91c1c; }
[data-theme="light"] .pv-value.accent { color: #b45309; }
[data-theme="light"] .preview-item.highlight { background: rgba(217, 119, 6, 0.10); }

/* Field labels */
[data-theme="light"] .field-label { color: #6b5840; }
[data-theme="light"] .req { color: #dc2626; }
[data-theme="light"] .field-hint { color: #dc2626; }

/* Radio cards */
[data-theme="light"] .radio-option {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .radio-option:hover { border-color: rgba(40, 25, 10, 0.18); }
[data-theme="light"] .radio-option.active {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .radio-dot {
  border-color: rgba(40, 25, 10, 0.30);
}
[data-theme="light"] .radio-option.active .radio-dot {
  background: #d97706;
  border-color: #d97706;
  box-shadow: inset 0 0 0 3px rgba(255, 250, 240, 0.95);
}
[data-theme="light"] .radio-title { color: var(--text-primary); }
[data-theme="light"] .radio-desc { color: #6b5840; }

/* Inputs */
[data-theme="light"] .input-with-prefix {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.70) 0%, rgba(255, 250, 240, 0.45) 100%);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .input-with-prefix:focus-within {
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
  background: linear-gradient(135deg, rgba(255, 246, 226, 0.95) 0%, rgba(255, 240, 210, 0.85) 100%);
}
[data-theme="light"] .input-with-prefix .prefix {
  color: #b45309;
  border-right-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .input-with-prefix input { color: var(--text-primary); }
[data-theme="light"] .input-with-prefix input::placeholder { color: rgba(26, 20, 16, 0.40); }

[data-theme="light"] .field-select,
[data-theme="light"] .field-textarea {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.70) 0%, rgba(255, 250, 240, 0.45) 100%);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .field-textarea::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .field-textarea:focus,
[data-theme="light"] .field-select:focus {
  background: linear-gradient(135deg, rgba(255, 246, 226, 0.95) 0%, rgba(255, 240, 210, 0.85) 100%);
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}

/* Impact card */
[data-theme="light"] .impact-card {
  background: rgba(217, 119, 6, 0.06);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .impact-card h4 { color: #b45309; }
[data-theme="light"] .impact-row { color: var(--text-secondary); }
[data-theme="light"] .impact-value { color: var(--text-primary); }
[data-theme="light"] .impact-value.danger { color: #b91c1c; }
[data-theme="light"] .impact-value.success { color: #047857; }

/* Footer */
[data-theme="light"] .modal-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .btn-cancel {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.12);
  color: #6b5840;
}
[data-theme="light"] .btn-cancel:hover {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
  color: #92400e;
}
[data-theme="light"] .btn-submit {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .btn-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #b45309, #92400e);
  box-shadow: 0 12px 28px rgba(217, 119, 6, 0.42);
}
[data-theme="light"] .btn-submit:disabled {
  background: rgba(40, 25, 10, 0.10);
  color: rgba(40, 25, 10, 0.40);
  box-shadow: none;
}

/* Scrollbar — light */
[data-theme="light"] .modal-body {
  scrollbar-color: rgba(217, 119, 6, 0.30) transparent;
}
[data-theme="light"] .modal-body::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.25); }
[data-theme="light"] .modal-body::-webkit-scrollbar-thumb:hover { background: rgba(217, 119, 6, 0.50); }
</style>
