<template>
  <div class="step-container slide-up-enter">
    <div class="step-header">
      <h2>Step 8: Payment & Penalties</h2>
      <p>Configure commercial terms and service credit penalty clauses.</p>
    </div>

    <div class="form-grid">
      <div class="form-section billing-section">
        <h3 class="section-title">Commercial Terms</h3>
        
        <div class="input-row">
          <div class="input-group">
            <label :class="{ 'error-label': errors.agreement_value }">Agreement Value <span class="required">*</span> <span v-if="errors.agreement_value" class="error-msg">- Required</span></label>
            <div class="currency-input-wrapper">
              <span class="currency-symbol">{{ currencySymbol }}</span>
              <input 
                type="text" 
                inputmode="numeric"
                :value="form.agreement_value" 
                @input="update('agreement_value', $event.target.value.replace(/[^0-9]/g, '') || null)"
                @keypress="onlyNumeric"
                placeholder="Amount (e.g. 5000)"
                class="premium-input pl-8"
              />
            </div>
          </div>
          
          <div class="input-group">
            <label :class="{ 'error-label': errors.currency }">Currency <span class="required">*</span> <span v-if="errors.currency" class="error-msg">- Required</span></label>
            <SlaSelect 
              :modelValue="form.currency" 
              @update:modelValue="update('currency', $event)" 
              :options="currencyOptions"
              class="premium-select"
            />
          </div>
        </div>

        <div class="input-row mt-4">
          <div class="input-group">
            <label :class="{ 'error-label': errors.billing_frequency }">Billing Frequency <span class="required">*</span> <span v-if="errors.billing_frequency" class="error-msg">- Required</span></label>
            <SlaSelect 
              :modelValue="form.billing_frequency" 
              @update:modelValue="update('billing_frequency', $event)" 
              :options="billingFrequencyOptions"
              class="premium-select"
            />
          </div>
          
          <div class="input-group">
            <label :class="{ 'error-label': errors.payment_method }">Payment Method <span class="required">*</span> <span v-if="errors.payment_method" class="error-msg">- Required</span></label>
            <SlaSelect 
              :modelValue="form.payment_method" 
              @update:modelValue="update('payment_method', $event)" 
              :options="paymentMethodOptions"
              class="premium-select"
            />
          </div>
        </div>
      </div>

      <div class="form-section penalty-section">
        <div class="table-header-row">
          <h3 class="section-title text-red">Penalty Clauses & Service Credits</h3>
          <button class="add-btn pb-btn" @click="addPenalty">
            <Plus :size="14" /> Add Clause
          </button>
        </div>

        <div class="premium-table-wrapper">
          <table class="premium-table">
            <thead>
              <tr>
                <th width="35%">SLA Violation Code</th>
                <th width="20%">Penalty Mode</th>
                <th width="20%">Credit / Penalty Value</th>
                <th width="20%">Cap / Max Limit</th>
                <th width="5%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="localPenalties.length === 0">
                <td colspan="5" class="empty-state text-center">
                  <span class="dim-text">No penalty clauses defined.</span>
                  <button class="text-link" @click="addPenalty">Add One</button>
                </td>
              </tr>
              <tr v-for="(pen, index) in localPenalties" :key="index">
                <td>
                  <input type="text" v-model="pen.sla_violation" placeholder="e.g. Uptime falls below 99.9%" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <SlaSelect 
                    v-model="pen.penalty_type" 
                    :options="penaltyTypeOptions"
                    class="table-select" 
                    @change="syncToParent"
                  />
                </td>
                <td>
                  <input type="text" v-model="pen.penalty_value" placeholder="e.g. 5% of monthly fee" class="table-input" @blur="syncToParent"/>
                </td>
                <td>
                  <input type="text" v-model="pen.maximum_limit" placeholder="e.g. Max 100% of fee" class="table-input" @blur="syncToParent"/>
                </td>
                <td class="text-center">
                  <button class="icon-btn delete-btn" @click="removePenalty(index)">
                    <Trash2 :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import SlaSelect from '../../../components/ui/SlaSelect.vue'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['updateForm'])

const localPenalties = ref([])

onMounted(() => {
  if (props.form.penalties && props.form.penalties.length > 0) {
    localPenalties.value = JSON.parse(JSON.stringify(props.form.penalties))
  } else {
    // Scaffold an example default
    localPenalties.value = [{
      sla_violation: 'Uptime drops below 99.9% target',
      penalty_type: 'Service Credit',
      penalty_value: '5% of monthly recurring fee',
      maximum_limit: 'Cap at 50% of monthly fee'
    }]
    syncToParent()
  }
})

const currencySymbol = computed(() => {
  const map = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: '$' }
  return map[props.form.currency] || '$'
})

const addPenalty = () => {
  localPenalties.value.push({
    sla_violation: '',
    penalty_type: 'Service Credit',
    penalty_value: '',
    maximum_limit: ''
  })
  syncToParent()
}

const removePenalty = (index) => {
  localPenalties.value.splice(index, 1)
  syncToParent()
}

const syncToParent = () => {
  emit('updateForm', 'penalties', localPenalties.value)
}

const update = (key, value) => {
  emit('updateForm', key, value)
}

const currencyOptions = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'INR (₹)', value: 'INR' },
  { label: 'AUD ($)', value: 'AUD' }
]

const billingFrequencyOptions = [
  'Monthly',
  'Quarterly',
  'Annually',
  'Milestone Based'
]

const paymentMethodOptions = [
  { label: 'Bank Transfer (ACH/NEFT)', value: 'Bank Transfer' },
  { label: 'Wire Transfer', value: 'Wire Transfer' },
  { label: 'Online Payment (Card/Stripe)', value: 'Online Payment' }
]

const penaltyTypeOptions = [
  'Service Credit',
  'Invoice Discount',
  'Financial Penalty'
]

const onlyNumeric = (e) => {
  if (!/[0-9]/.test(e.key)) e.preventDefault()
}
</script>

<style scoped>
.step-container { max-width: 900px; margin: 0 auto; }
.step-header { margin-bottom: 32px; }
.step-header h2 { font-size: 24px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.5px; }
.step-header p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0; }

.form-grid { display: flex; flex-direction: column; gap: 32px; }
.form-section { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; }
.billing-section { background: rgba(33, 150, 243, 0.02); border-color: rgba(33, 150, 243, 0.1); }
.penalty-section { background: rgba(244, 67, 54, 0.02); border-color: rgba(244, 67, 54, 0.1); }

.section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255, 255, 255, 0.4); margin: 0 0 20px 0; font-weight: 600; }
.text-red { color: #f44336; }

.table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.table-header-row .section-title { margin: 0; }

.input-row { display: flex; gap: 16px; }
.input-row .input-group { flex: 1; margin-bottom: 0; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.7); }
.mt-4 { margin-top: 20px; }

.currency-input-wrapper { position: relative; }
.currency-symbol { position: absolute; left: 14px; top: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.5); }
.pl-8 { padding-left: 32px !important; }

.premium-input { background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; padding: 12px 16px; border-radius: 8px; font-size: 14px; transition: all 0.2s; width: 100%; box-sizing: border-box; }
.premium-input:focus { outline: none; border-color: #ffeb3b; box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1); }

/* Remove number input arrows */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] {
  -moz-appearance: textfield;
}

.add-btn { background: rgba(255, 235, 59, 0.1); color: #ffeb3b; border: 1px solid rgba(255, 235, 59, 0.2); height: 32px; padding: 0 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.pb-btn { background: rgba(244, 67, 54, 0.1); color: #f44336; border-color: rgba(244, 67, 54, 0.2); }
.pb-btn:hover { background: rgba(244, 67, 54, 0.15); transform: translateY(-1px); }

.premium-table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.3); }
.premium-table { width: 100%; border-collapse: collapse; text-align: left; }
.premium-table th { background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-weight: 600; }
.premium-table td { padding: 8px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); vertical-align: middle; }

.table-input { width: 100%; background: transparent; border: 1px solid transparent; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 13px; transition: all 0.2s; box-sizing: border-box; }
.table-input:hover { background: rgba(255, 255, 255, 0.03); }
.table-input:focus { outline: none; background: rgba(0, 0, 0, 0.5); border-color: #f44336; }

.text-center { text-align: center; }
.dim-text { color: rgba(255, 255, 255, 0.3); font-size: 13px; margin-right: 8px;}
.text-link { background: none; border: none; color: #f44336; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 0;}

.icon-btn { background: transparent; border: none; color: rgba(255, 255, 255, 0.3); cursor: pointer; padding: 6px; border-radius: 4px; transition: all 0.2s; }
.delete-btn:hover { color: #f44336; background: rgba(244, 67, 54, 0.1); }

.slide-up-enter { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* DEEP CSS OVERRIDES FOR APPLE-GRADE GLASSMORPHISM */
:deep(.premium-select .select-selected),
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

:deep(input:focus), :deep(textarea:focus), :deep(select:focus), :deep(.design-select .select-selected:focus), :deep(.premium-select .select-selected:focus) { 
    border-color: rgba(245,158,11,0.4) !important; 
    background: rgba(255,255,255,0.06) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.1), inset 0 2px 4px rgba(0,0,0,0.1) !important;
}
</style>
