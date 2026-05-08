<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-panel">
          
          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <h2>{{ isEditMode ? 'Update Payment' : 'Record Payment' }}</h2>
              <p class="payment-id">{{ generatedPaymentId }}</p>
            </div>
            <button class="close-btn" @click="close">
              <X :size="20" />
            </button>
          </div>

          <!-- Progress Steps -->
          <div class="progress-container">
            <div class="step-indicators">
              <div 
                v-for="(step, index) in steps" 
                :key="index"
                class="step-dot"
                :class="{ 
                  active: currentStep === index + 1, 
                  completed: currentStep > index + 1 
                }"
                @click="goToStep(index + 1)"
              >
                <component :is="step.icon" :size="14" />
                <span class="step-label">{{ step.label }}</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- Body with Step Animation -->
          <div class="modal-body">
            <Transition :name="slideDirection" mode="out-in">
              <div v-if="currentStep === 1" key="step1" class="step-content">
                <div class="step-header">
                  <Briefcase :size="20" />
                  <span>Project & Milestone Details</span>
                </div>

                <!-- Project Name (Auto) -->
                <div class="form-group">
                  <label>Project Name</label>
                  <input :value="projectName" disabled class="text-input disabled-input" />
                </div>

                  <!-- Milestones Multi-Select -->
                <div class="form-group">
                  <label>Link Milestones <span class="req">*</span> <span class="optional">(Select one or more)</span></label>
                  
                  <!-- New Custom Component -->
                  <div :class="{ 'input-error-wrapper': errors.milestone_ids }">
                      <MilestoneSelector 
                        v-model="form.milestone_ids" 
                        :milestones="availableMilestones" 
                        :project-currency="projectCurrency"
                        :project-budget="projectBudget"
                        :disabled-ids="unavailableMilestoneIds"
                      />
                  </div>
                  <span v-if="errors.milestone_ids" class="error-text">Link Milestones is required</span>
                  
                </div>

                <!-- Milestone Budget Values -->
                <div class="budget-card-premium">
                   <div class="bc-content">
                      <span class="bc-label">Total Milestone Budget</span>
                      <span class="bc-value">{{ formatCurrency(form.milestone_budget_sum, projectCurrency) }}</span>
                   </div>
                   <div class="bc-pill">
                      <Calculator :size="10" />
                      <span>Auto-calculated</span>
                   </div>
                </div>

                <!-- Contract / Work Order -->
                <div class="form-group">
                  <label>Contract / Work Order No. <span class="req">*</span></label>
                  <input v-model="form.contract_work_order_no" class="text-input" :class="{ 'has-error': errors.contract_work_order_no }" placeholder="E.g. WO-2024-001" />
                  <span v-if="errors.contract_work_order_no" class="error-text">Work Order is required</span>
                </div>
              </div>

              <div v-else-if="currentStep === 2" key="step2" class="step-content">
                <div class="step-header">
                  <Building2 :size="20" />
                  <span>Vendor Information</span>
                </div>

                <div class="form-wrapper-column"> 
                  <div class="form-group">
                    <label>Vendor Name <span class="req">*</span></label>
                    <input v-model="form.vendor_name" class="text-input" :class="{ 'has-error': errors.vendor_name }" placeholder="Who is receiving payment" />
                    <span v-if="errors.vendor_name" class="error-text">Vendor Name is required</span>
                  </div>

                  <div class="form-group payment-method-group">
                    <label>Payment Method <span class="req">*</span></label>
                    <div class="radio-pills" :class="{ 'has-input-error': errors.payment_method }">
                      <div 
                        v-for="method in ['Bank Transfer', 'Credit Card', 'PayPal', 'Cash']" 
                        :key="method"
                        class="radio-pill"
                        :class="{ active: form.payment_method === method }"
                        @click="form.payment_method = method"
                      >
                        <component :is="getMethodIcon(method)" :size="14" />
                        {{ method }}
                      </div>
                    </div>
                     <span v-if="errors.payment_method" class="error-text">Payment Method is required</span>
                  </div>
                </div>
              </div>


              <div v-else-if="currentStep === 3" key="step3" class="step-content">
                <div class="step-header">
                  <Receipt :size="20" />
                  <span>Invoice & Amount Details</span>
                </div>

                <!-- Budget Summary Card -->
                <div class="budget-summary-card">
                   <div class="bs-row">
                      <span class="bs-label">Total Milestone Budget</span>
                      <span class="bs-value highlight">{{ formatCurrency(form.milestone_budget_sum, projectCurrency) }}</span>
                   </div>
                </div>

                <div class="form-grid-2-col"> <!-- 2 Column Grid -->
                  <div class="form-group">
                    <label>Invoice Number <span class="req">*</span></label>
                    <input v-model="form.invoice_number" class="text-input" :class="{ 'has-error': errors.invoice_number }" placeholder="Vendor invoice ref" />
                    <span v-if="errors.invoice_number" class="error-text">Invoice Number is required</span>
                  </div>
                  <div class="form-group">
                    <label>Invoice Date <span class="req">*</span></label>
                     <div :class="{ 'input-error-wrapper': errors.invoice_date }">
                        <DatePicker v-model="form.invoice_date" placeholder="Select Date" />
                     </div>
                     <span v-if="errors.invoice_date" class="error-text">Invoice Date is required</span>
                  </div>
                </div>

                <div class="form-group" style="margin-top: 16px;">
                  <label>Invoice Amount (Gross) <span class="req">*</span></label>
                  <div class="amount-combo-bar">
                    <div class="currency-wrapper">
                        <!-- Read-only Currency Display -->
                        <div class="currency-display-fixed">
                            {{ form.currency || projectCurrency }}
                        </div>
                    </div>
                    <div class="amount-input-wrapper" :class="{ 'has-error': errors.invoice_amount_gross }">
                        <input type="number" v-model.number="form.invoice_amount_gross" class="text-input amount-field" placeholder="0.00" @keydown="onlyNumeric" />
                        <div class="number-controls">
                            <button @click="form.invoice_amount_gross++" class="num-btn"><Plus :size="10"/></button>
                            <button @click="form.invoice_amount_gross--" class="num-btn"><Minus :size="10"/></button>
                        </div>
                    </div>

                  </div>
                  <span v-if="errors.invoice_amount_gross" class="error-text">Amount is required and must be numeric</span>
                </div>

                <!-- Tax Section -->
                <div class="section-divider">
                    <span>Tax & Deductions</span>
                    <div class="toggle-wrapper">
                        <label class="toggle-label">Tax Inclusive <span class="req">*</span></label>
                        <button class="toggle-switch" :class="{ active: form.tax_inclusive }" @click="form.tax_inclusive = !form.tax_inclusive">
                            <div class="toggle-thumb"></div>
                        </button>
                    </div>
                </div>

                <div class="form-grid-3-col">
                    <div class="form-group">
                      <label>Tax Type <span class="req">*</span></label>
                      <div :class="{ 'input-error-wrapper': errors.tax_type }">
                          <CustomSelect 
                            :options="taxTypeOptions" 
                            v-model="form.tax_type"
                            label-key="label"
                            value-key="value"
                          />
                      </div>
                      <span v-if="errors.tax_type" class="error-text">Required</span>
                    </div>
                    
                    <!-- Dynamic Tax Rate Dropdown -->
                    <div class="form-group" v-if="['GST', 'VAT'].includes(form.tax_type)">
                      <label>{{ form.tax_type }} % <span class="req">*</span></label>
                      <div :class="{ 'input-error-wrapper': errors.tax_percent }">
                          <CustomSelect 
                            :options="getTaxRates(form.tax_type)"
                            v-model="form.tax_percent"
                            label-key="label"
                            value-key="value"
                            placeholder="%"
                            :searchable="false"
                          />
                      </div>
                      <span v-if="errors.tax_percent" class="error-text">Required</span>
                    </div>
                    
                    <!-- TDS Input (Custom Arrows) -->
                    <div class="form-group">
                      <label>TDS %</label>
                      <div class="custom-num-input">
                          <input type="number" v-model.number="form.tds_percent" placeholder="0" @keydown="onlyNumeric" />
                          <div class="num-spinners">
                             <button @click="form.tds_percent++"><Plus :size="8"/></button>
                             <button @click="form.tds_percent--"><Minus :size="8"/></button>
                          </div>
                      </div>

                    </div>
                </div>

                <div class="form-grid-2-col">
                    <div class="form-group">
                      <label>Other Deductions (%)</label>
                      <div class="custom-num-input">
                          <input type="number" v-model.number="form.other_deductions_percent" placeholder="0%" @keydown="onlyNumeric" />
                          <div class="num-spinners">
                             <button @click="form.other_deductions_percent++"><Plus :size="8"/></button>
                             <button @click="form.other_deductions_percent--"><Minus :size="8"/></button>
                          </div>
                      </div>

      
                    <div class="form-group">
                      <label>Description</label>
                      <input v-model="form.other_deductions_desc" class="text-input" placeholder="Reason..." />
                    </div>
                </div>

                <!-- Net Calculations -->
                <div class="net-calculation-bar">
                    <div class="net-item">
                        <label>Net Receivable</label>
                        <span class="net-value">{{ formatCurrency(netReceivable, form.currency) }}</span>
                    </div>
                    <div class="net-item-small">
                        <label>Retention ({{ stats?.remainingPercent?.toFixed(1) || 0 }}%)</label>
                        <div class="custom-num-input small fa-dark">
                             <input type="text" :value="stats?.remainingPercent?.toFixed(1) + '%'" disabled placeholder="%" />
                             <!-- Hidden spinner, explicit control only if needed, keeps it clean per design -->
                        </div>
                    </div>
                </div>
              </div>

              </div>

              <div v-else-if="currentStep === 4" key="step4" class="step-content">
                <div class="step-header">
                  <Landmark :size="20" />
                  <div class="header-text">
                    <h3>Bank & Payment Details</h3>
                    <p class="sub-text">Enter payment instrument details</p>
                  </div>
                </div>

                <div class="form-group">
                  <label>Payment Mode</label>
                  <div class="payment-mode-selector">
                    <div 
                      v-for="mode in paymentModes" 
                      :key="mode"
                      class="mode-card"
                      :class="{ active: form.payment_mode === mode }"
                      @click="selectPaymentMode(mode)"
                    >
                      <div class="check-circle" v-if="form.payment_mode === mode">
                        <Check :size="12" />
                      </div>
                      <div class="mode-icon">
                        <component :is="getMethodIcon(mode)" :size="20" />
                      </div>
                      <span>{{ mode }}</span>
                    </div>
                  </div>
                </div>

                <!-- Bank Details Grid -->
                <div v-if="form.payment_mode !== 'Cash'" class="fields-container slide-in">
                    <div class="form-grid-2-col">
                      <div class="form-group">
                        <label>Bank Name <span class="req">*</span></label>
                        <input v-model="form.bank_name" class="text-input" :class="{ 'has-error': errors.bank_name }" placeholder="e.g. HDFC Bank" />
                        <span v-if="errors.bank_name" class="error-text">Required</span>
                      </div>
                      <div class="form-group">
                        <label>Account Holder <span class="req">*</span></label>
                        <input v-model="form.account_holder_name" class="text-input" :class="{ 'has-error': errors.account_holder_name }" placeholder="Beneficiary Name" />
                        <span v-if="errors.account_holder_name" class="error-text">Required</span>
                      </div>
                    </div>

                    <div class="form-grid-2-col">
                      <div class="form-group">
                        <div style="display: flex; justify-content: space-between;">
                           <label>Account Number <span class="req">*</span></label>
                           <span v-if="form.account_number?.length >= 25" class="error-text" style="font-size: 10px;">Max Limit (25)</span>
                        </div>
                        <input v-model="form.account_number" class="text-input" :class="{ 'has-error': errors.account_number }" placeholder="XXXX-XXXX-XXXX" @keydown="onlyNumeric" maxlength="25" />
                        <span v-if="errors.account_number" class="error-text">Required</span>
                      </div>

                      <div class="form-group">
                        <label>IFSC / SWIFT <span class="req">*</span></label>
                        <input v-model="form.ifsc_swift_code" class="text-input" :class="{ 'has-error': errors.ifsc_swift_code }" placeholder="Code" />
                        <span v-if="errors.ifsc_swift_code" class="error-text">Required</span>
                      </div>
                    </div>
                </div>

                <!-- Cheque Details -->
                <div v-if="form.payment_mode === 'Cheque'" class="form-grid-2-col slide-in">
                  <div class="form-group">
                    <label>Cheque Number <span class="req">*</span></label>
                    <input v-model="form.cheque_no" class="text-input" :class="{ 'has-error': errors.cheque_no }" placeholder="######" />
                    <span v-if="errors.cheque_no" class="error-text">Required</span>
                  </div>
                  <div class="form-group">
                     <!-- Empty placeholder for alignment or extra cheque field -->
                  </div>
                </div>

                <!-- Transaction & Date Grid -->
                <!-- Dynamic layout based on mode -->
                <div class="form-grid-2-col">
                   <div class="form-group" v-if="form.payment_mode !== 'Cash'">
                    <label>Reference No. (UTR)</label>
                    <input v-model="form.utr_transaction_ref" class="text-input" placeholder="Transaction ID" />
                  </div>
                  
                  <div class="form-group">
                    <label>Payment Date <span class="req">*</span></label>
                    <div :class="{ 'input-error-wrapper': errors.payment_date }">
                        <DatePicker v-model="form.payment_date" placeholder="Select Date" />
                    </div>
                    <span v-if="errors.payment_date" class="error-text">Required</span>
                  </div>
                </div>

                <div class="form-group">
                    <label>Payment Status</label>
                    <CustomSelect 
                        :options="paymentStatuses" 
                        v-model="form.status"
                        placeholder="Select Status"
                    />
                </div>
              </div>

              <div v-else-if="currentStep === 5" key="step5" class="step-content">
                <div class="step-header">
                  <div class="header-icon-wrapper">
                    <Paperclip :size="20" />
                  </div>
                  <div class="header-text">
                    <h3>Attachments & Documents</h3>
                    <p class="sub-text">Upload required proofs for audit compliance</p>
                  </div>
                </div>

                <div class="attachments-grid-premium">
                  <div class="attachment-card" v-for="att in attachmentTypes" :key="att.key" :class="{ 'filled': form.attachments[att.key], 'has-error': errors.invoice_pdf && att.key === 'invoice' }">
                    
                    <!-- Header -->
                    <div class="card-header">
                      <div class="card-title">
                        <component :is="att.icon" :size="16" class="type-icon" />
                        <span>{{ att.label }}</span>
                      </div>
                      <span v-if="att.required && !(errors.invoice_pdf && att.key === 'invoice')" class="badge-required">Required</span>
                      <span v-if="errors.invoice_pdf && att.key === 'invoice'" class="badge-required error-badge">Required *</span>
                      <span v-else-if="!att.required" class="badge-optional">Optional</span>
                    </div>

                    <!-- Upload Zone (Empty State) -->
                    <div 
                      v-if="!form.attachments[att.key]"
                      class="upload-zone-premium"
                      @click="triggerUpload(att.key)"
                      @dragover.prevent
                      @drop.prevent="handleDrop($event, att.key)"
                    >
                      <input 
                        type="file" 
                        :ref="el => fileInputRefs[att.key] = el"
                        accept=".pdf,.jpg,.jpeg,.png"
                        @change="handleFileChange($event, att.key)"
                        hidden
                      />
                      <div class="upload-placeholder">
                        <div class="icon-circle">
                            <Upload :size="18" />
                        </div>
                        <span class="upload-cta">Click to upload</span>
                        <span class="upload-hint">PDF, JPG, PNG (Max 5MB)</span>
                      </div>
                    </div>

                    <!-- File Preview (Filled State) -->
                    <div v-else class="file-preview-card">
                        <div class="file-icon-large">
                            <FileText :size="24" v-if="getFileName(form.attachments[att.key]).toLowerCase().endsWith('.pdf')" />
                            <FileCheck :size="24" v-else />
                        </div>
                        <div class="file-info">
                            <span class="file-name" :title="getFileName(form.attachments[att.key])">{{ getFileName(form.attachments[att.key]) }}</span>
                            <span class="file-meta">{{ form.attachments[att.key].id ? 'Stored' : 'Ready for upload' }}</span>
                        </div>
                        <button class="action-btn remove" @click.stop="removeFile(att.key)">
                            <X :size="16" />
                        </button>
                    </div>

                  </div>
                </div>
              </div>

            </Transition>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button v-if="currentStep > 1" class="btn-text secondary" @click="prevStep">
              <ArrowLeft :size="16" />
              <span>Back</span>
            </button>
            <button v-else class="btn-text secondary" @click="close">Cancel</button>

            <div class="footer-right">
              <button v-if="currentStep < 5" class="btn-pill primary" @click="nextStep">
                <span>Continue</span>
                <ArrowRight :size="16" />
              </button>
              <button v-else class="btn-pill primary" :disabled="isSubmitting" @click="handleSubmit">
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span>{{ isSubmitting ? (isEditMode ? 'Updating...' : 'Recording...') : (isEditMode ? 'Update Payment' : 'Record Payment') }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Ensure smooth transition between steps */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.2s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { 
  X, Plus, Minus, Check, Briefcase, Building2, Receipt, Landmark, 
  Paperclip, Upload, FileText, FileCheck, ArrowLeft, ArrowRight, Loader2,
  CreditCard, Wallet, Banknote, Calculator
} from 'lucide-vue-next'
import MilestoneSelector from './MilestoneSelector.vue'
import CustomSelect from '../../ui/CustomSelect.vue'
import DatePicker from '../../ui/CompactDatePicker.vue'
import { useToast } from '../../../composables/useToast'
import axios from 'axios'


const props = defineProps({
  modelValue: Boolean,
  projectId: String,
  projectName: String,
  projectCurrency: { type: String, default: 'USD' },
  projectBudget: Number,
  milestones: { type: Array, default: () => [] },
  token: String,
  initialData: { type: Object, default: null },
  isEditMode: { type: Boolean, default: false },
  isEditMode: { type: Boolean, default: false },
  paidMilestoneIds: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ remaining: 0, remainingPercent: 0 }) }
})

const emit = defineEmits(['update:modelValue', 'save'])
const { success, error } = useToast()

// Utilities
const getFileName = (att) => {
    if (!att) return ''
    return att.name || att.file_name || ''
}

const close = () => emit('update:modelValue', false)

// Constants
// Constants
const paymentStatuses = ['Received', 'In Transit']
const paymentModes = ['Bank Transfer', 'Cheque', 'Credit Card', 'Cash']
const currencies = [
  { label: 'USD - US Dollar', symbol: '$', value: 'USD' },
  { label: 'EUR - Euro', symbol: '€', value: 'EUR' },
  { label: 'GBP - British Pound', symbol: '£', value: 'GBP' },
  { label: 'INR - Indian Rupee', symbol: '₹', value: 'INR' },
  { label: 'AED - Dirham', symbol: 'AED', value: 'AED' },
  { label: 'SGD - Singapore Dollar', symbol: 'S$', value: 'SGD' }
]
const taxTypeOptions = [
  { label: 'GST', value: 'GST' },
  { label: 'VAT', value: 'VAT' },
  { label: 'Sales Tax', value: 'Sales Tax' },
  { label: 'Non Taxable', value: 'Non Taxable' },
  { label: 'Out of Scope', value: 'Out of Scope' },
  { label: 'Non GST Supply', value: 'Non GST Supply' }
]

// Helpers
const getMethodIcon = (method) => {
  switch(method) {
    case 'Bank Transfer': return Landmark
    case 'Credit Card': return CreditCard
    case 'PayPal': return Wallet
    case 'Cash': return Banknote
    default: return Landmark
  }
}

const selectPaymentMode = (mode) => {
    console.log('DEBUG: Payment Mode Clicked:', mode)
    form.payment_mode = mode
    console.log('DEBUG: Form Payment Mode set to:', form.payment_mode)
}

const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const getTaxRates = (type) => {
    if (type === 'GST') return [
        { label: '5%', value: 5 },
        { label: '12%', value: 12 },
        { label: '18%', value: 18 },
        { label: '28%', value: 28 }
    ]
    if (type === 'VAT') return [
        { label: '5%', value: 5 },
        { label: '10%', value: 10 },
        { label: '15%', value: 15 },
        { label: '20%', value: 20 }
    ]
    return []
}

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const fileInputRefs = ref({})

const defaultForm = {
  milestone_ids: [],
  milestone_budget_sum: 0,
  contract_work_order_no: '',
  client_type: 'Private',
  client_department: '',
  vendor_name: '',
  payment_method: 'Bank Transfer',
  payment_category: 'Services',
  invoice_number: '',
  invoice_date: '',
  invoice_amount_gross: 0,
  currency: 'USD',
  tax_type: 'GST', 
  tax_percent: 18, 
  tax_inclusive: false, 
  gst_percent: 0, 
  tds_percent: 0,
  other_deductions_percent: 0,
  other_deductions_desc: '',
  retention_amount: 0,
  payment_mode: 'Bank Transfer',
  bank_name: '',
  account_holder_name: '',
  account_number: '',
  ifsc_swift_code: '',
  cheque_no: '',
  utr_transaction_ref: '',
  payment_date: new Date().toISOString().split('T')[0],
  status: 'Received',
  attachments: {}
}

const form = reactive({ ...defaultForm })


const unavailableMilestoneIds = computed(() => {
    if (!props.isEditMode) return props.paidMilestoneIds
    // If editing, allow milestones that are already part of THIS payment
    const currentPaymentMilestones = props.initialData?.milestone_ids || []
    return props.paidMilestoneIds.filter(id => !currentPaymentMilestones.includes(id))
})


watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        currentStep.value = 1
        if (props.isEditMode && props.initialData) {
            console.log('PaymentEntryModal: Edit Mode Data', props.initialData)
            
            // Clone and prepare data
            const data = { ...props.initialData }
            
            // Transform attachments list to object map for UI
            if (Array.isArray(data.attachments)) {
                console.log('PaymentEntryModal: Found attachments array', data.attachments)
                const map = {}
                data.attachments.forEach(att => {
                    // Try exact match then lowercase
                    if (att.category) {
                        map[att.category] = att
                        if (att.category.toLowerCase() !== att.category) {
                             map[att.category.toLowerCase()] = att
                        }
                    }
                })
                console.log('PaymentEntryModal: Mapped attachments', map)
                data.attachments = map
            } else if (!data.attachments) {
                data.attachments = {}
            }
            
            // Populate form
            Object.assign(form, data)
            
            // Map backend fields to frontend form model
            if (data.other_deductions) {
                form.other_deductions_percent = data.other_deductions
            }
            
            // Ensure null safe values for text fields
            form.bank_name = data.bank_name || ''
            form.account_holder_name = data.account_holder_name || ''
            form.account_number = data.account_number || ''
            form.ifsc_swift_code = data.ifsc_swift_code || ''
            form.cheque_no = data.cheque_no || ''
            form.utr_transaction_ref = data.utr_transaction_ref || ''
            
            // Ensure array consistency if backend sends null
            if (!form.milestone_ids) form.milestone_ids = []
            if (!form.attachments) form.attachments = {}
            if (!form.currency) form.currency = props.projectCurrency // Fallback
        } else {
            console.log('PaymentEntryModal: Create Mode')
            // Reset form
            Object.assign(form, defaultForm)
            form.milestone_ids = [] 
            form.attachments = {}
            form.currency = props.projectCurrency // Default to project currency
        }
    }
})

const errors = reactive({
  milestone_ids: false,
  contract_work_order_no: false,
  vendor_name: false,
  payment_method: false,
  invoice_number: false,
  invoice_date: false,
  invoice_amount_gross: false,
  tax_type: false,
  tax_percent: false,
  bank_name: false,
  account_holder_name: false,
  account_number: false,
  ifsc_swift_code: false,
  cheque_no: false,
  payment_date: false,
  invoice_pdf: false
})

// Steps Configuration
const steps = [
  { label: 'Project Info', icon: Briefcase },
  { label: 'Vendor', icon: Building2 },
  { label: 'Invoice', icon: Receipt },
  { label: 'Payment', icon: Landmark },
  { label: 'Documents', icon: Paperclip }
]

// Attachment Types
const attachmentTypes = [
    { key: 'invoice', label: 'Tax Invoice', icon: FileText, required: true },
    { key: 'w9', label: 'W-9 / Tax Form', icon: FileText, required: false },
    { key: 'agreement', label: 'Contract / SLA', icon: FileText, required: false },
    { key: 'approval', label: 'Approval Email', icon: FileCheck, required: false }
]

// Filter Milestones
const availableMilestones = computed(() => {
    return props.milestones.filter(m => m.status.toLowerCase() === 'completed')
})

// Watchers
watch(() => form.milestone_ids, (newIds) => {
    if (!newIds || newIds.length === 0) {
        form.milestone_budget_sum = 0
        // Optional: Reset invoice amount if no milestones? 
        // form.invoice_amount_gross = 0 
        return
    }
    const selected = props.milestones.filter(m => newIds.includes(m.id))
    // Use budget_amount_converted to match MilestoneSelector display
    const total = selected.reduce((sum, m) => {
        const val = m.budget_amount_converted || m.converted_amount || m.allocated_amount || m.budget_amount || m.amount || 0
        return sum + parseFloat(val)
    }, 0)
    
    form.milestone_budget_sum = total
    
    // Auto-fill Invoice Amount
    // Only auto-fill if the user hasn't manually entered a VERY different amount? 
    // For now, simple auto-fill as requested.
    form.invoice_amount_gross = total
    
}, { deep: true })





// Currency conversion
const exchangeRate = ref(1)
const convertedAmount = computed(() => {
  return form.invoice_amount_gross * exchangeRate.value
})

// Computed
const generatedPaymentId = computed(() => {
  const year = new Date().getFullYear()
  return `PAY-${year}-XXXX`
})

const progressPercent = computed(() => {
  return (currentStep.value / 5) * 100
})

const netReceivable = computed(() => {
  let base = form.invoice_amount_gross || 0
  
  // Invoice Amount is numeric check handled by input type but good to enforce
  if (isNaN(base)) base = 0;

  // Add Tax (GST/VAT)
  const isTaxTypeValid = !['Non Taxable', 'Out of Scope', 'Non GST Supply'].includes(form.tax_type)
  if (isTaxTypeValid && form.tax_percent > 0) {
    if (!form.tax_inclusive) {
        base += (base * form.tax_percent / 100)
    }
  }
  
  // Subtract TDS
  if (form.tds_percent > 0) {
    base -= (form.invoice_amount_gross * form.tds_percent / 100)
  }
  
  // Subtract other deductions (Percentage)
  if (form.other_deductions_percent > 0) {
     const deductionAmt = (form.invoice_amount_gross * form.other_deductions_percent / 100)
     base -= deductionAmt
  }
  
  // Subtract retention
  base -= (form.retention_amount || 0)
  
  return Math.max(0, base)
})

const retentionPercent = computed(() => {
  if (!props.projectBudget || props.projectBudget === 0) return 0
  return ((form.retention_amount || 0) / props.projectBudget) * 100
})

// ... Watchers & onMounted ...

// Methods
// ... existing helper methods ...

// Validation Logic
const validatePdfSignature = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = (e) => {
            const arr = (new Uint8Array(e.target.result)).subarray(0, 4);
            let header = "";
            for(let i = 0; i < arr.length; i++) {
                header += arr[i].toString(16);
            }
            // PDF signature is 25 50 44 46 (%PDF)
            resolve(header === "25504446");
        };
        reader.readAsArrayBuffer(file.slice(0, 4));
    });
}

const validateStep = (step) => {
    // Reset errors for this step
    Object.keys(errors).forEach(k => errors[k] = false)
    let isValid = true

    if (step === 1) {
        if (form.milestone_ids.length === 0) {
            errors.milestone_ids = true; isValid = false;
        }
        if (!form.contract_work_order_no.trim()) {
            errors.contract_work_order_no = true; isValid = false;
        }
    }
    
    if (step === 2) {
        if (!form.vendor_name.trim()) {
            errors.vendor_name = true; isValid = false;
        }
        if (!form.payment_method) { // Was payment_type, fixed to payment_method
            errors.payment_method = true; isValid = false;
        }
    }

    if (step === 3) {
        if (!form.invoice_number.trim()) { errors.invoice_number = true; isValid = false; }
        
        if (!form.invoice_date) { 
            errors.invoice_date = true; isValid = false; 
        } else {
            const d = new Date(form.invoice_date);
            const today = new Date();
            today.setHours(23,59,59,999);
            if (d > today) {
                error("Invoice date cannot be in the future");
                errors.invoice_date = true; isValid = false;
            }
        }

        if (!form.invoice_amount_gross || form.invoice_amount_gross <= 0) {
            errors.invoice_amount_gross = true; isValid = false;
        }
        if (!form.tax_type) { errors.tax_type = true; isValid = false; }
        
        const isTaxable = !['Non Taxable', 'Out of Scope', 'Non GST Supply'].includes(form.tax_type)
        if (isTaxable && (form.tax_percent === null || form.tax_percent === undefined)) {
             errors.tax_percent = true; isValid = false;
        }
    }

    if (step === 4) {
        if (form.payment_mode !== 'Cash') {
            if (!form.bank_name.trim()) { errors.bank_name = true; isValid = false; }
            if (!form.account_holder_name.trim()) { errors.account_holder_name = true; isValid = false; }
            if (!form.account_number.trim()) { errors.account_number = true; isValid = false; }
            if (!form.ifsc_swift_code.trim()) { errors.ifsc_swift_code = true; isValid = false; }
        }
        if (form.payment_mode === 'Cheque' && !form.cheque_no.trim()) {
             errors.cheque_no = true; isValid = false;
        }
        if (!form.payment_date) { errors.payment_date = true; isValid = false; }
    }

    if (step === 5) {
        if (!form.attachments['invoice']) {
             errors.invoice_pdf = true; isValid = false;
        }
    }

    return isValid
}

// Attachments
const triggerUpload = (key) => {
  if (fileInputRefs.value[key]) fileInputRefs.value[key].click()
}

const handleFileChange = (e, key) => {
  const file = e.target.files[0]
  if (file) handleFile(file, key)
}

const handleDrop = (e, key) => {
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file, key)
}

const handleFile = async (file, key) => {
  if (file.size > 5 * 1024 * 1024) {
    error('File size too large (Max 5MB)')
    return
  }
  
  if (key === 'invoice') {
      if (file.type !== 'application/pdf') {
          error("Invoice must be a PDF file");
          return;
      }
      // Content check
      const isValidPdf = await validatePdfSignature(file);
      if (!isValidPdf) {
          error("Invalid PDF file content");
          return;
      }
  }
  
  form.attachments[key] = file
  // Clear error if set
  if (key === 'invoice') errors.invoice_pdf = false;
}

const removeFile = (key) => {
    if (form.attachments[key]) {
        delete form.attachments[key]
        // Reset file input
        if (fileInputRefs.value[key]) fileInputRefs.value[key].value = ''
    }
}

// Navigation Methods

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const goToStep = (step) => {
  if (step < currentStep.value) currentStep.value = step
}


const nextStep = () => {
  if (validateStep(currentStep.value)) {
      if (currentStep.value < 5) currentStep.value++
  }
}

// ... prevStep, goToStep ...

const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Get token (using props or localStorage directly as backup)
    const token = props.token || localStorage.getItem('user_token')
    
    const res = await axios.post('http://localhost:8000/api/uploads/payment-document', formData, {
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        }
    })
    return res.data // { success, file_path, original_filename }
}

const handleSubmit = async () => {
    // Validate all steps implicitly by checking current step (should be 5)
    if (!validateStep(5)) return;

    isSubmitting.value = true
    try {
        // 1. Upload Attachments
        const attachmentsList = []
        
        for (const [key, fileOrObj] of Object.entries(form.attachments)) {
            // If it's a raw File object (new upload)
            if (fileOrObj instanceof File) {
                try {
                    const uploadRes = await uploadFile(fileOrObj)
                    attachmentsList.push({
                        category: key, // 'invoice', 'w9', etc.
                        file_name: uploadRes.original_filename,
                        file_url: uploadRes.file_path,
                        file_size_bytes: uploadRes.file_size || 0
                    })
                } catch (err) {
                    console.error(`Failed to upload ${key}`, err)
                    // Continue or block? Let's warn but continue for now, or block invoice.
                    if (key === 'invoice') throw new Error("Failed to upload Invoice PDF")
                }
            } 
            // If it's already an object (e.g. edit mode, pre-filled - unlikely here but good practice)
            else if (fileOrObj.file_url) {
                attachmentsList.push(fileOrObj)
            }
        }

        // 2. Prepare Payload
        const payload = {
            milestone_ids: form.milestone_ids,
            milestone_budget_sum: form.milestone_budget_sum,
            contract_work_order_no: form.contract_work_order_no,
            client_type: form.client_type,
            client_department: form.client_department,
            vendor_name: form.vendor_name,
            payment_type: form.payment_type || 'Running Bill', // Default
            payment_category: form.payment_category || 'Services',
            invoice_number: form.invoice_number,
            invoice_date: form.invoice_date || null,
            invoice_amount_gross: form.invoice_amount_gross,
            currency: form.currency,
            exchange_rate: exchangeRate.value,
            converted_amount: convertedAmount.value,
            tax_type: form.tax_type,
            gst_percent: form.gst_percent,
            tds_percent: form.tds_percent,
            other_deductions: form.other_deductions_percent || 0, // Ensure value
            other_deductions_desc: form.other_deductions_desc,
            net_receivable_amount: netReceivable.value,
            retention_amount: form.retention_amount,
            retention_percent: retentionPercent.value,
            balance_remaining: 0, 
            payment_mode: form.payment_mode,
            bank_name: form.bank_name,
            account_holder_name: form.account_holder_name,
            account_number: form.account_number,
            ifsc_swift_code: form.ifsc_swift_code,
            cheque_no: form.cheque_no,
            utr_transaction_ref: form.utr_transaction_ref,
            payment_date: form.payment_date,
            status: form.status,
            attachments: attachmentsList, // The processed list
            // Legacy fields for backward compatibility
            amount_paid: netReceivable.value,
            transaction_ref: form.utr_transaction_ref
        }
    
        emit('save', payload)
        // Close handles in parent after success, or here? 
        // Usually parent handles success. But we close here for UI snap.
        // Let's emit and wait? No, standard pattern is emit and close.
        // Actually, parent might fail. Ideally we wait.
        // But for this codebase, emit -> close is fine as error handling is usually minimal.
        
    } catch (e) {
        console.error('Failed to record payment', e)
        error(e.message || "Failed to submit payment")
    } finally {
        isSubmitting.value = false
    }
}

// Strict Numeric Validation (Allow only 0-9 and controls)
const onlyNumeric = (e) => {
  const charCode = (e.which) ? e.which : e.keyCode
  // Allow: backspace, delete, tab, escape, enter
  if ([46, 8, 9, 27, 13].indexOf(charCode) !== -1 ||
      // Allow: Ctrl+A,C,V,X
      (e.ctrlKey === true && [65, 67, 86, 88].indexOf(charCode) !== -1) ||
      // Allow: home, end, left, right
      (charCode >= 35 && charCode <= 39)) {
      return
  }
  // Ensure that it is a number and stop the keypress
  if ((e.shiftKey || (charCode < 48 || charCode > 57)) && (charCode < 96 || charCode > 105)) {
      e.preventDefault();
  }
}
</script>

<style scoped>

/* Modal Overlay */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.4); 
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

/* Glass Panel (Matches ConsoleHero/Landing) */
.glass-panel {
  background: rgba(30, 30, 33, 0.75); /* Slightly more opaque */
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 12px 24px rgba(0,0,0,0.3);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  width: 100%; max-width: 600px;
  display: flex; flex-direction: column;
  max-height: 90vh; /* Constrain height */
  overflow: hidden; /* clean corners */
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Header */
.modal-header {
  padding: 20px 32px;
  display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
.header-text h2 { 
  font-size: 22px; font-weight: 600; color: #ffffff; 
  margin: 0 0 4px 0; letter-spacing: -0.01em; 
}
.payment-id {
  font-size: 13px; color: rgba(255,255,255,0.5);
  font-family: 'SF Mono', 'Menlo', monospace; letter-spacing: 0.5px;
}

.close-btn { 
  background: rgba(255,255,255,0.06); border: none; color: rgba(255,255,255,0.6);
  width: 32px; height: 32px; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
  cursor: pointer; transition: all 0.2s ease;
}
.close-btn:hover { 
  background: rgba(255,255,255,0.15); 
  color: white; 
}

/* Progress */
.progress-container {
  padding: 20px 32px 16px;
}

.step-indicators {
  display: flex; justify-content: space-between; margin-bottom: 14px;
  position: relative; z-index: 2;
}

.step-dot {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; opacity: 0.4; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.step-dot:hover { opacity: 0.7; }
.step-dot.active { opacity: 1; transform: scale(1.05); }
.step-dot.active svg { color: #F59E0B; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.5)); }
.step-dot.completed { opacity: 0.8; }
.step-dot.completed svg { color: #10b981; }

.step-label {
  font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;
  color: rgba(255,255,255,0.7);
}

.progress-track {
  width: 100%; height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px; overflow: hidden;
  margin-top: -8px; /* Visual alignment */
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B, #FBBF24); /* Orange/Yellow Gradient */
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Body */
.modal-body {
  padding: 0 32px;
  min-height: 360px;
  max-height: 55vh;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  display: flex; flex-direction: column; justify-content: flex-start; /* Ensure top align */
}

/* Smooth Slide Animations */
.step-content {
  display: flex; flex-direction: column; gap: 20px;
  width: 100%;
  padding-bottom: 24px;
  animation: fadeIn 0.3s ease-out;
  flex: 1; /* Take available space but align top */
  justify-content: flex-start;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Form Elements - Premium Style */
/* Header Icon & Text Alignment */
.step-header {
  display: flex; align-items: center; gap: 12px; /* Ensure gap and alignment */
  margin-bottom: 8px; /* Tighter gap */
  color: rgba(255,255,255,0.9);
  font-weight: 500;
}
/* Ensure icon SVG doesn't shrink or overlap */
.step-header svg { flex-shrink: 0; } 

/* Inputs (Yellow Focus, No Neon) */
.text-input {
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.1); 
  border-radius: 10px;
  padding: 12px 14px; 
  color: #ffffff; 
  font-size: 14px; 
  width: 100%;
  transition: border-color 0.2s; /* Only animate border color */
}

.text-input:focus { 
  outline: none; 
  border-color: #F59E0B; /* Yellow Border */
  background: rgba(255,255,255,0.05); /* Slight light bg, no glow */
  box-shadow: none; /* No Neon Glow */
}

/* STANDARD DESIGN SYSTEM (HEIGHT 42px) */

/* 1. Global Input Overrides */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; margin: 0; display: none; /* Force Hide */
}
input[type=number] {
  -moz-appearance: textfield; /* Firefox */
}
/* Deep selector for Child Components (CompactDatePicker & CustomSelect) */
:deep(.compact-input), 
:deep(.select-trigger) {
  height: 42px !important; /* Force Height */
  background: rgba(255,255,255,0.03) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 10px !important;
  font-size: 14px !important;
  box-shadow: none !important;
}
:deep(.select-trigger.is-open) {
  border-color: #F59E0B !important;
  background: rgba(255,255,255,0.05) !important;
}
:deep(.options-menu) {
  z-index: 10000 !important; /* Force Dropdown on Top */
  background: #1e1e21 !important; /* Ensure visibility */
  border: 1px solid rgba(255,255,255,0.1) !important;
}

/* 2. Text Input Styling */
.text-input {
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.1); 
  border-radius: 10px;
  padding: 0 14px; /* Horizontal padding only */
  height: 42px;    /* Force Height */
  color: #ffffff; 
  font-size: 14px; 
  width: 100%;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.text-input:focus { 
  outline: none; border-color: #F59E0B; background: rgba(255,255,255,0.05); 
}

/* 3. Combined Amount Bar (Height 42px) */
.amount-combo-bar { display: flex; align-items: stretch; gap: 8px; height: 42px; }
.currency-wrapper { width: 90px; }
.amount-input-wrapper { 
    flex: 1; position: relative; display: flex; 
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
    align-items: stretch; /* Stretch children */
    overflow: hidden;
}
.amount-field { 
    background: transparent; border: none; flex: 1; 
    padding: 0 14px; font-size: 14px; color: white;
    height: 100%; /* Fill wrapper */
}
.amount-field:focus { outline: none; }

/* Custom Arrows for Input */
.number-controls { 
    display: flex; flex-direction: column; width: 26px; 
    border-left: 1px solid rgba(255,255,255,0.1);
}
.num-btn { 
    flex: 1; border: none; background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.5); 
    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
}
.num-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.num-btn:first-child { border-bottom: 1px solid rgba(255,255,255,0.1); }

/* 4. Premium Toggle Switch (Apple Style) */
.toggle-wrapper { display: flex; align-items: center; gap: 12px; }
.toggle-label { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500; }
.toggle-switch {
    width: 48px; height: 28px; 
    background: rgba(255,255,255,0.15); 
    border-radius: 20px; border: none;
    position: relative; cursor: pointer; transition: background 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}
.toggle-switch.active { background: #34C759; /* Apple Green */ }
.toggle-thumb {
    width: 24px; height: 24px; 
    background: white; border-radius: 50%;
    position: absolute; top: 2px; left: 2px; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}
.toggle-switch.active .toggle-thumb { transform: translateX(20px); }

/* 5. Custom Num Input (TDS/Deductions) */
.custom-num-input {
    display: flex; background: rgba(255,255,255,0.03); 
    border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; 
    height: 42px; overflow: hidden; align-items: stretch;
}
.custom-num-input input {
    flex: 1; background: transparent; border: none; 
    padding: 0 14px; color: white; font-size: 14px; 
    height: 100%;
}
.custom-num-input input:focus { outline: none; }
.num-spinners {
    display: flex; flex-direction: column; width: 24px; 
    border-left: 1px solid rgba(255,255,255,0.1);
}
.num-spinners button {
    flex: 1; border: none; background: transparent; color: rgba(255,255,255,0.5); 
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.num-spinners button:hover { background: rgba(255,255,255,0.1); color: white; }

/* 6. Net Receivable Layout Fix */
.net-calculation-bar {
    display: flex; align-items: center; justify-content: space-between; /* Fix Separation */
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 16px 20px;
    margin-top: 10px;
}
.net-item { display: flex; flex-direction: column; gap: 4px; }
.net-item label { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; text-transform: uppercase; }
.net-value { font-size: 20px; font-weight: 700; color: #34C759; letter-spacing: -0.5px; }

.net-item-small { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.net-item-small label { font-size: 11px; color: rgba(255,255,255,0.4); }
.custom-num-input.small { height: 32px; width: 100px; border-radius: 8px; font-size: 12px; }
.custom-num-input.small input { font-size: 12px; padding: 0 8px; }

/* 7. Step 2 Layout Fix (Reduced Gap) */
.form-wrapper-column { 
  display: flex; flex-direction: column; 
  gap: 12px; /* Standardize Gap to 12px */
  padding-top: 8px;
  width: 100%; align-items: stretch; justify-content: flex-start;
}
.payment-method-group { margin-top: 4px; } /* Reduction */

/* 8. Footer & Back Button */
.modal-footer { padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; }
.btn-text { 
    background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; 
    font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; 
    transition: color 0.2s; 
}
.btn-text:hover { color: white; }

/* Missing / Restored Styles */
.radio-pills { display: flex; flex-wrap: wrap; gap: 10px; }
.radio-pill {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: rgba(255,255,255,0.6);
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.radio-pill:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); }
.radio-pill.active {
  background: rgba(245, 158, 11, 0.15); /* Yellow Tint */
  border-color: #F59E0B; 
  color: #F59E0B; /* Yellow Text/Icon */
  box-shadow: none;
}

/* Budget Summary Card */
.budget-summary-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 12px 16px;
  display: flex; justify-content: space-between; align-items: center;
}
.bs-label { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; }
.bs-value { font-size: 14px; font-weight: 600; color: #F59E0B; font-family: 'JetBrains Mono', monospace; }

/* Utilities */
.form-grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.form-grid-3-col { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 12px; margin-top: 12px; }
.milestone-selector-container { margin-bottom: 20px; }
.section-divider { display: flex; align-items: center; justify-content: space-between; padding: 16px 0 8px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 16px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }

/* Restore missing styles */
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 0.05em; }
.req { color: #fbbf24; }


/* Footer */
.modal-footer { padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; }
.btn-text { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 13px; font-weight: 600; transition: color 0.2s; }

/* --- New Premium Step 4 Styles --- */
.payment-mode-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
}

.mode-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

.mode-card:hover {
    background: rgba(255,255,255,0.06);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.mode-card.active {
    background: rgba(245, 158, 11, 0.1);
    border-color: #F59E0B;
    color: #F59E0B;
}

.mode-icon {
    width: 36px; height: 36px;
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.6);
    transition: all 0.2s;
}

.mode-card.active .mode-icon {
    background: #F59E0B;
    color: white;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.mode-label {
    font-size: 12px;
    font-weight: 600;
    text-align: center;
}

.active-indicator {
    position: absolute;
    top: 6px; right: 6px;
    width: 16px; height: 16px;
    background: #F59E0B;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: white;
    font-size: 10px;
    animation: scaleIn 0.2s;
}

@keyframes scaleIn {
    from { transform: scale(0); }
    to { transform: scale(1); }
}

.fields-container {
    margin-top: 16px;
    display: flex; flex-direction: column; gap: 4px; /* Tight gap */
}

/* Animations */
.slide-in {
    animation: slideUpFade 0.3s ease-out forwards;
}

@keyframes slideUpFade {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* --- New Premium Step 5 Styles --- */
.step-header {
    display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px;
}
.header-icon-wrapper {
    width: 44px; height: 44px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: #F59E0B;
    flex-shrink: 0;
}
.header-text h3 {
    font-size: 16px; font-weight: 600; color: white; margin: 0 0 4px 0;
}
.sub-text {
    font-size: 13px; color: rgba(255,255,255,0.5); margin: 0;
}

.attachments-grid-premium {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;
}

.attachment-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: flex; flex-direction: column;
}
.attachment-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.15);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}
.attachment-card.filled {
    background: rgba(245, 158, 11, 0.05);
    border-color: rgba(245, 158, 11, 0.2);
}

.card-header {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; justify-content: space-between; align-items: center;
}
.card-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);
}
.type-icon { color: #F59E0B; }

.badge-required {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    background: rgba(245, 158, 11, 0.15); color: #F59E0B;
    padding: 2px 8px; border-radius: 4px;
}
.badge-optional {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
    padding: 2px 8px; border-radius: 4px;
}

/* Upload Zone */
.upload-zone-premium {
    padding: 24px 16px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer;
    background: transparent;
    transition: background 0.2s;
    height: 140px; /* Specific height for consistency */
}
.upload-zone-premium:hover .icon-circle {
    transform: scale(1.1);
    background: rgba(245, 158, 11, 0.2);
    color: #F59E0B;
}
.upload-placeholder {
    display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
}
.icon-circle {
    width: 40px; height: 40px;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.4);
    margin-bottom: 4px;
    transition: all 0.3s;
}
.upload-cta { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.8); }
.upload-hint { font-size: 11px; color: rgba(255,255,255,0.4); }

/* File Preview */
.file-preview-card {
    padding: 20px 16px;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    height: 140px; justify-content: center;
    position: relative;
}
.file-icon-large {
    color: #F59E0B;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
.file-info {
    display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; width: 100%;
}
.file-name {
    font-size: 13px; font-weight: 600; color: white;
    max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-meta { font-size: 11px; color: #34C759; font-weight: 500; }

/* Glassmorphism & Typography (Match Create Milestone) */
.form-group label { 
    font-size: 11px; text-transform: uppercase; font-weight: 700; 
    color: rgba(255,255,255,0.4); letter-spacing: 0.05em; margin-left: 2px;
}

/* Premium Input Styles */
.text-input, input[type="number"], input[type="text"] {
  background: rgba(255,255,255,0.02) !important; /* Premium Transparency */
  border: 1px solid rgba(255,255,255,0.08) !important; 
  border-radius: 8px !important;
  padding: 10px 12px; color: #f5f5f7; font-size: 13px; font-family: inherit; width: 100%;
  transition: 0.2s;
  box-shadow: none !important;
  backdrop-filter: blur(4px); /* Subtle glass effect on input itself */
}
.text-input:disabled, .disabled-input {
    background: rgba(255,255,255,0.05) !important; /* Slightly more opaque for disabled */
    color: rgba(255,255,255,0.4) !important;
    cursor: not-allowed;
    border-color: transparent !important;
}
.text-input:focus, input:focus { 
    outline: none; 
    border-color: #F59E0B !important; /* Yellow focus */
    background: rgba(0,0,0,0.4) !important; 
    box-shadow: none !important; /* No neon glow */
}

.action-btn.remove {
  position: absolute; top: 10px; right: 10px;
  width: 24px; height: 24px;
  background: rgba(0,0,0,0.3); border: none; border-radius: 50%;
  color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.2s;
}
.action-btn.remove:hover { background: #ef4444; color: white; }

.close-btn {
  background: rgba(255, 255, 255, 0.05); /* Subtle bg */
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  color: #9ca3af;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  display: flex; align-items: center; justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: rotate(90deg) scale(1.1); /* Apple-style interaction */
}
.btn-text:hover { color: white; }
.btn-pill { height: 40px; padding: 0 24px; border-radius: 20px; border: none; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
.btn-pill.primary {
  background: #F59E0B; color: black;
  border: none; padding: 10px 24px; border-radius: 20px;
  font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  transition: background 0.2s;
}
.btn-pill.primary:hover { background: #d97706; }
.btn-pill.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Premium Budget Card */
.budget-card-premium {
  background: linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(0,0,0,0));
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.bc-content { display: flex; flex-direction: column; gap: 2px; }
.bc-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.5); font-weight: 600; }
.bc-value { font-size: 18px; font-weight: 700; color: #F59E0B; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.bc-pill {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  padding: 4px 10px; border-radius: 20px;
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #F59E0B; font-weight: 500;
}

/* Transitions */
.step-content {
  animation: fadeSlide 0.3s ease-out;
}
@keyframes fadeSlide {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Validation Styles */
.has-error, .input-error-wrapper { border-color: #ef4444 !important; }
.error-text { display: block; font-size: 11px; color: #ef4444; margin-top: 4px; font-weight: 500; }
.req { color: #ef4444; margin-left: 2px; }
.error-badge { background: #ef4444 !important; color: white !important; }
.has-input-error { border: 1px solid #ef4444; border-radius: 6px; }
.currency-display-fixed {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    font-weight: 600;
    padding: 0 12px;
    height: 100%;
    display: flex;
    align-items: center;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 60px;
    justify-content: center;
}
</style>
