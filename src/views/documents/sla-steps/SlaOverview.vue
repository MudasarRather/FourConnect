<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 2: Agreement Overview</h2>
      <p>Configure the foundational terms and validity of this agreement.</p>
    </div>

    <div class="form-grid">
      <div class="form-section">
        <h3 class="section-title">Core Document Details</h3>
        
        <div class="input-group">
          <label :class="{ 'error-label': errors.title }">SLA Title <span class="required">*</span> <span v-if="errors.title" class="error-msg">- Required</span></label>
          <input 
            type="text" 
            :value="form.title" 
            @input="update('title', $event.target.value)"
            placeholder="e.g. Master Services Agreement 2026"
            class="premium-input highlighted"
          />
        </div>

        <div class="input-row">
          <div class="input-group">
            <label :class="{ 'error-label': errors.agreement_type }">Agreement Type <span class="required">*</span> <span v-if="errors.agreement_type" class="error-msg">- Required</span></label>
            <SlaSelect 
              :modelValue="form.agreement_type" 
              @update:modelValue="update('agreement_type', $event)"
              :options="agreementTypeOptions"
            />
          </div>
          
          <div class="input-group">
            <label :class="{ 'error-label': errors.contract_reference }">Contract Reference Number <span class="required">*</span> <span v-if="errors.contract_reference" class="error-msg">- Required</span></label>
            <input 
              type="text" 
              :value="form.contract_reference" 
              @input="update('contract_reference', $event.target.value)"
              placeholder="e.g. MSA-2026-001"
              class="premium-input"
            />
          </div>
          
          <div class="input-group">
            <label>Version</label>
            <input 
              type="text" 
              :value="form.version" 
              @input="update('version', $event.target.value)"
              placeholder="1.0"
              class="premium-input"
            />
          </div>
        </div>

        <div class="input-group">
          <label :class="{ 'error-label': errors.description }">Agreement Description <span class="required">*</span> <span v-if="errors.description" class="error-msg">- Required</span></label>
          <textarea 
            :value="form.description" 
            @input="update('description', $event.target.value)"
            placeholder="Briefly describe the purpose of this agreement..."
            class="premium-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="form-section timeline-section">
        <h3 class="section-title">Validity & Timeline</h3>
        
        <div class="input-row">
          <div class="input-group">
            <label :class="{ 'error-label': errors.start_date }">Start Date <span class="required">*</span> <span v-if="errors.start_date" class="error-msg">- Required</span></label>
            <CompactDatePicker
              :modelValue="form.start_date"
              @update:modelValue="update('start_date', $event)"
              placeholder="Start Date"
            />
          </div>
          <div class="input-group">
            <label :class="{ 'error-label': errors.end_date }">End Date <span class="required">*</span> <span v-if="errors.end_date" class="error-msg">- Required</span></label>
            <CompactDatePicker
              :modelValue="form.end_date"
              @update:modelValue="update('end_date', $event)"
              placeholder="End Date"
            />
          </div>
          <div class="input-group">
            <label :class="{ 'error-label': errors.renewal_type }">Renewal Terms <span class="required">*</span> <span v-if="errors.renewal_type" class="error-msg">- Required</span></label>
            <SlaSelect 
              :modelValue="form.renewal_type" 
              @update:modelValue="update('renewal_type', $event)"
              :options="renewalTypeOptions"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SlaSelect from '../../../components/ui/SlaSelect.vue'
import CompactDatePicker from '../../../components/ui/CompactDatePicker.vue'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

const agreementTypeOptions = [
  'Support SLA',
  'Managed Services SLA',
  'Infrastructure SLA',
  'Software SLA',
  'Hybrid SLA'
]

const renewalTypeOptions = [
  'Auto Renewal',
  'Manual Renewal',
  'Fixed Term'
]

const update = (key, value) => {
  emit('updateForm', key, value)
}
</script>

<style scoped>
.step-container {
  max-width: 800px;
  margin: 0 auto;
}

.step-header {
  margin-bottom: 32px;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.step-header p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin: 0;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
}

.timeline-section {
  position: relative;
  overflow: hidden;
}

.timeline-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #ffeb3b;
  box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
}

.section-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 20px 0;
  font-weight: 600;
}

.input-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.input-row .input-group {
  flex: 1;
  margin-bottom: 0;
}

.input-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.required { color: #ff5252; }
.error-label { color: #ff5252 !important; }
.error-msg { color: #ff5252; font-size: 11px; margin-left: 4px; text-transform: none; font-weight: normal; }

.premium-input, .premium-textarea {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.date-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.6;
  cursor: pointer;
}

.premium-input:focus, .premium-textarea:focus {
  outline: none;
  border-color: #ffeb3b;
  box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1);
}

.highlighted {
  color: #ffeb3b;
  font-weight: 500;
  font-size: 16px;
}

.slide-up-enter {
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* DEEP CSS OVERRIDES FOR APPLE-GRADE GLASSMORPHISM */
:deep(input.premium-input), 
:deep(textarea.premium-textarea), 
:deep(input.table-input), 
:deep(input[type="text"]), 
:deep(input[type="number"]), 
:deep(input[type="email"]), 
:deep(select),
:deep(textarea), 
:deep(.design-select .select-selected) {
    background: rgba(255,255,255,0.03) !important; 
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
    color: #fff !important; 
    font-size: 14px !important;
    font-weight: 400 !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
    backdrop-filter: blur(10px) !important;
    font-family: 'Inter', sans-serif !important;
    height: auto !important;
}

:deep(select option) { background: #1a1a1c !important; color: #fff !important; }

:deep(input:focus), :deep(textarea:focus), :deep(select:focus), :deep(.design-select .select-selected:focus) { 
    border-color: rgba(245,158,11,0.4) !important; 
    background: rgba(255,255,255,0.06) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.1), inset 0 2px 4px rgba(0,0,0,0.1) !important;
}
</style>
