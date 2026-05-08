<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 1: Client Information</h2>
      <p>Define the core parties entering into this Service Level Agreement.</p>
    </div>

    <div class="form-grid">
      <!-- Client Section -->
      <div class="form-section">
        <h3 class="section-title">Client Details</h3>
        <div class="input-group">
          <label :class="{ 'error-label': errors.client_organization_name }">Organization Name <span class="required">*</span> <span v-if="errors.client_organization_name" class="error-msg">- Required</span></label>
          <input 
            type="text" 
            :value="form.client_organization_name" 
            @input="update('client_organization_name', $event.target.value)"
            placeholder="e.g. Acme Corp"
            class="premium-input"
          />
        </div>
        
        <div class="input-row">
          <div class="input-group">
            <label :class="{ 'error-label': errors.client_contact_person }">Contact Person <span class="required">*</span> <span v-if="errors.client_contact_person" class="error-msg">- Required</span></label>
            <input 
              type="text" 
              :value="form.client_contact_person" 
              @input="update('client_contact_person', $event.target.value)"
              placeholder="Full Name"
              class="premium-input"
            />
          </div>
          <div class="input-group">
            <label :class="{ 'error-label': errors.client_email }">Contact Email <span class="required">*</span> <span v-if="errors.client_email" class="error-msg">- Required</span></label>
            <input 
              type="email" 
              :value="form.client_email" 
              @input="update('client_email', $event.target.value)"
              placeholder="email@example.com"
              class="premium-input"
            />
          </div>
          <div class="input-group">
            <label :class="{ 'error-label': errors.client_phone }">Contact Phone <span class="required">*</span> <span v-if="errors.client_phone" class="error-msg">- Required</span></label>
            <input 
              type="text" 
              inputmode="numeric"
              :value="form.client_phone" 
              @input="update('client_phone', $event.target.value.replace(/[^0-9]/g, ''))"
              @keypress="onlyNumeric"
              placeholder="e.g. 1234567890"
              class="premium-input"
            />
          </div>
        </div>

        <div class="input-group">
          <label :class="{ 'error-label': errors.client_address }">Registered Address <span class="required">*</span> <span v-if="errors.client_address" class="error-msg">- Required</span></label>
          <textarea 
            :value="form.client_address" 
            @input="update('client_address', $event.target.value)"
            placeholder="Full physical or billing address"
            class="premium-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Provider Section -->
      <div class="form-section provider-section">
        <h3 class="section-title text-yellow">Service Provider</h3>
        <div class="input-group">
          <label :class="{ 'error-label': errors.provider_name }">Provider Name <span class="required">*</span> <span v-if="errors.provider_name" class="error-msg">- Required</span></label>
          <input 
            type="text" 
            :value="form.provider_name" 
            @input="update('provider_name', $event.target.value)"
            class="premium-input highlighted"
          />
        </div>
        
        <div class="input-row">
           <div class="input-group">
            <label :class="{ 'error-label': errors.provider_registration_number }">Registration Number <span class="required">*</span> <span v-if="errors.provider_registration_number" class="error-msg">- Required</span></label>
            <input 
              type="text" 
              :value="form.provider_registration_number" 
              @input="update('provider_registration_number', $event.target.value)"
              placeholder="Company ID"
              class="premium-input"
            />
          </div>
          <div class="input-group">
            <label :class="{ 'error-label': errors.provider_tax_id }">Tax ID / GST <span class="required">*</span> <span v-if="errors.provider_tax_id" class="error-msg">- Required</span></label>
            <input 
              type="text" 
              :value="form.provider_tax_id" 
              @input="update('provider_tax_id', $event.target.value)"
              placeholder="Tax Identification"
              class="premium-input"
            />
          </div>
        </div>

        <div class="input-group">
          <label :class="{ 'error-label': errors.provider_address }">Provider Address <span class="required">*</span> <span v-if="errors.provider_address" class="error-msg">- Required</span></label>
          <textarea 
            :value="form.provider_address" 
            @input="update('provider_address', $event.target.value)"
            placeholder="Headquarters address"
            class="premium-textarea"
            rows="2"
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

const onlyNumeric = (e) => {
  if (!/[0-9]/.test(e.key)) e.preventDefault()
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

.provider-section {
  background: rgba(255, 235, 59, 0.02);
  border-color: rgba(255, 235, 59, 0.1);
}

.section-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 20px 0;
  font-weight: 600;
}

.text-yellow {
  color: rgba(255, 235, 59, 0.6);
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
}

.premium-input:focus, .premium-textarea:focus {
  outline: none;
  border-color: #ffeb3b;
  box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1);
}

.highlighted {
  color: #ffeb3b;
  font-weight: 500;
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
</style>
