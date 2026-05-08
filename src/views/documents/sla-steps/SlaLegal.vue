<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 9: Legal Terms</h2>
      <p>Configure custom liability, termination, and intellectual property clauses. These overrides standard templates.</p>
    </div>

    <div class="form-grid">
      <div class="input-group">
        <label :class="{ 'error-label': errors.liability_limit }">Limitation of Liability <span class="required">*</span> <span v-if="errors.liability_limit" class="error-msg">- Required</span></label>
        <textarea 
          :value="form.liability_limit" 
          @input="update('liability_limit', $event.target.value)"
          placeholder="Specify damages caps, exclusions, and indirect damage waivers..."
          class="premium-textarea"
          rows="4"
        ></textarea>
      </div>

      <div class="input-group">
        <label :class="{ 'error-label': errors.termination_conditions }">Termination Conditions <span class="required">*</span> <span v-if="errors.termination_conditions" class="error-msg">- Required</span></label>
        <textarea 
          :value="form.termination_conditions" 
          @input="update('termination_conditions', $event.target.value)"
          placeholder="Clarify breach conditions, cure periods, and notice requirements for termination..."
          class="premium-textarea"
          rows="4"
        ></textarea>
      </div>

      <div class="input-group">
        <label :class="{ 'error-label': errors.confidentiality_clause }">Confidentiality Clause (NDA override) <span class="required">*</span> <span v-if="errors.confidentiality_clause" class="error-msg">- Required</span></label>
        <textarea 
          :value="form.confidentiality_clause" 
          @input="update('confidentiality_clause', $event.target.value)"
          placeholder="Non-disclosure terms governing shared data during this SLA..."
          class="premium-textarea"
          rows="3"
        ></textarea>
      </div>

      <div class="input-row">
        <div class="input-group">
          <label :class="{ 'error-label': errors.force_majeure_clause }">Force Majeure <span class="required">*</span> <span v-if="errors.force_majeure_clause" class="error-msg">- Required</span></label>
          <textarea 
            :value="form.force_majeure_clause" 
            @input="update('force_majeure_clause', $event.target.value)"
            placeholder="Acts of God, Pandemics, Grid Failure conditions..."
            class="premium-textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="input-group">
          <label :class="{ 'error-label': errors.intellectual_property_clause }">Intellectual Property <span class="required">*</span> <span v-if="errors.intellectual_property_clause" class="error-msg">- Required</span></label>
          <textarea 
            :value="form.intellectual_property_clause" 
            @input="update('intellectual_property_clause', $event.target.value)"
            placeholder="Who owns configurations/data architectures produced under this SLA..."
            class="premium-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

const update = (key, value) => {
  emit('updateForm', key, value)
}
</script>

<style scoped>
.step-container { max-width: 800px; margin: 0 auto; }
.step-header { margin-bottom: 32px; }
.step-header h2 { font-size: 24px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.5px; }
.step-header p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0; }

.form-grid { 
  display: flex; 
  flex-direction: column; 
  gap: 24px; 
  background: rgba(255, 255, 255, 0.02); 
  border: 1px solid rgba(255, 255, 255, 0.05); 
  border-radius: 12px; 
  padding: 32px; 
}

.input-row { display: flex; gap: 24px; }
.input-row .input-group { flex: 1; }

.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 0.5px;}
.required { color: #f44336; margin-left: 2px; }
.error-label { color: #ff5252 !important; }
.error-msg { color: #ff5252; font-size: 11px; margin-left: 4px; text-transform: none; font-weight: normal; }

.premium-textarea {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
}

.premium-textarea:focus {
  outline: none;
  border-color: #ffeb3b;
  box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1);
  background: rgba(0,0,0,0.8);
}

.slide-up-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
