<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-panel">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-header-icon">
              <RotateCcw :size="18" />
            </div>
            <div>
              <h2>Reverse Expense</h2>
              <p class="modal-subtitle">Create an accounting reversal entry</p>
            </div>
            <button class="modal-close" @click="$emit('close')"><X :size="18" /></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Financial Preview -->
            <div class="preview-card">
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
            </div>

            <!-- Reversal Type -->
            <div class="field-group">
              <label class="field-label">Reversal Type</label>
              <div class="radio-group">
                <label class="radio-option" :class="{ active: form.reversal_type === 'FULL' }">
                  <input type="radio" v-model="form.reversal_type" value="FULL" />
                  <div class="radio-dot"></div>
                  <div class="radio-text">
                    <span class="radio-title">Full Reversal</span>
                    <span class="radio-desc">Reverse entire remaining amount</span>
                  </div>
                </label>
                <label class="radio-option" :class="{ active: form.reversal_type === 'PARTIAL' }">
                  <input type="radio" v-model="form.reversal_type" value="PARTIAL" />
                  <div class="radio-dot"></div>
                  <div class="radio-text">
                    <span class="radio-title">Partial Reversal</span>
                    <span class="radio-desc">Reverse a specific amount</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Partial Amount -->
            <div class="field-group" v-if="form.reversal_type === 'PARTIAL'">
              <label class="field-label">Reversal Amount <span class="req">*</span></label>
              <div class="input-with-prefix">
                <span class="prefix">₹</span>
                <input v-model.number="form.reversed_amount" type="number" placeholder="Enter amount" :max="preview?.remaining_reversible_amount" min="1" />
              </div>
              <span class="field-hint" v-if="form.reversed_amount > (preview?.remaining_reversible_amount || 0)">
                Cannot exceed ₹{{ Number(preview?.remaining_reversible_amount || 0).toLocaleString('en-IN') }}
              </span>
            </div>

            <!-- Reason -->
            <div class="field-group">
              <label class="field-label">Reason Category <span class="req">*</span></label>
              <CustomSelect
                v-model="form.reason_category"
                :options="reasonOptions"
                placeholder="Select a reason"
                labelKey="label"
                valueKey="value"
              />
            </div>

            <div class="field-group" v-if="form.reason_category === 'Other' || form.reason_category">
              <label class="field-label">Additional Details</label>
              <textarea v-model="form.reason_details" rows="3" class="field-textarea" placeholder="Describe the reason for this reversal..."></textarea>
            </div>

            <!-- Financial Impact Preview -->
            <div class="impact-card" v-if="impactAmount > 0">
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
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" @click="$emit('close')">Cancel</button>
            <button class="btn-submit" @click="handleSubmit" :disabled="!isValid || loading">
              <Loader2 v-if="loading" :size="14" class="spin" />
              <RotateCcw v-else :size="14" />
              {{ loading ? 'Processing...' : 'Submit Reversal' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, RotateCcw, Loader2, TrendingDown } from 'lucide-vue-next'
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
  background: rgba(0,0,0,0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.modal-panel {
  width: 520px; max-height: 85vh; overflow-y: auto;
  background: rgba(24, 24, 27, 0.65);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.02);
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
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-panel, .modal-fade-leave-to .modal-panel { transform: translateY(20px) scale(0.97); }
</style>
