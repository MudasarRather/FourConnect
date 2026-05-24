<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-panel">

          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <h2>Edit Draft</h2>
              <p class="expense-id">{{ expense?.id ? `EXP-${String(expense.id).substring(0,8).toUpperCase()}` : '' }}</p>
            </div>
            <button class="close-btn" @click="close"><X :size="20" /></button>
          </div>

          <!-- Progress Steps -->
          <div class="progress-container">
            <div class="step-indicators">
              <div
                v-for="(step, index) in steps"
                :key="index"
                class="step-dot"
                :class="{ active: currentStep === index, completed: currentStep > index }"
                @click="goToStep(index)"
              >
                <Check v-if="currentStep > index" :size="12" />
                <component v-else :is="step.icon" :size="14" />
                <span class="step-label">{{ step.label }}</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <Transition :name="slideDirection" mode="out-in">

              <!-- Step 1: Basic Info -->
              <div v-if="currentStep === 0" key="s0" class="step-content">
                <div class="step-header"><ClipboardList :size="20" /><span>Basic Information</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Expense Title <span class="req">*</span></label>
                    <input v-model="form.title" type="text" placeholder="e.g. Travel to Client Site" class="text-input" :class="{ 'has-error': v.title }" />
                    <span v-if="v.title" class="field-error"><AlertTriangle :size="11" /> Title is required</span>
                  </div>
                  <div class="form-group">
                    <label>Category <span class="req">*</span></label>
                    <CustomSelect v-model="form.category" :options="categoryOptions" placeholder="Select category" labelKey="label" valueKey="value" :error="v.category" />
                    <span v-if="v.category" class="field-error"><AlertTriangle :size="11" /> Category is required</span>
                  </div>
                  <div class="form-group">
                    <label>Expense Date <span class="req">*</span></label>
                    <DatePicker v-model="form.expense_date" placeholder="Select date" :error="v.expense_date" :maxDate="todayStr" />
                    <span v-if="v.expense_date" class="field-error"><AlertTriangle :size="11" /> Date required</span>
                  </div>
                  <div class="form-group">
                    <label>Expense Type <span class="req">*</span></label>
                    <CustomSelect v-model="form.expense_type" :options="typeOptions" placeholder="Select type" labelKey="label" valueKey="value" :error="v.expense_type" />
                    <span v-if="v.expense_type" class="field-error"><AlertTriangle :size="11" /> Type required</span>
                  </div>
                  <div class="form-group">
                    <label>Department</label>
                    <input v-model="form.department" type="text" placeholder="e.g. Engineering" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Cost Center</label>
                    <input v-model="form.cost_center" type="text" placeholder="e.g. CC-100" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Priority</label>
                    <div class="chip-row">
                      <button v-for="p in ['low','medium','high','critical']" :key="p" class="chip" :class="{ active: form.priority === p, [p]: form.priority === p }" @click="form.priority = p">{{ p }}</button>
                    </div>
                  </div>
                  <div class="form-group full">
                    <label>Description <span class="req">*</span></label>
                    <textarea v-model="form.description" rows="3" placeholder="Brief description..." class="text-input" :class="{ 'has-error': v.description }"></textarea>
                    <span v-if="v.description" class="field-error"><AlertTriangle :size="11" /> Description required</span>
                  </div>
                </div>
              </div>

              <!-- Step 2: Financial -->
              <div v-else-if="currentStep === 1" key="s1" class="step-content">
                <div class="step-header"><DollarSign :size="20" /><span>Financial Details</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Amount <span class="req">*</span></label>
                    <div class="input-with-prefix" :class="{ 'has-error': v.amount }">
                      <span class="prefix">{{ currencySymbol }}</span>
                      <input v-model.number="form.amount" type="text" inputmode="decimal" placeholder="0.00" class="text-input mono no-arrows" @keypress="onlyNumeric" />
                    </div>
                    <span v-if="v.amount" class="field-error"><AlertTriangle :size="11" /> Amount required</span>
                  </div>
                  <div class="form-group">
                    <label>Currency</label>
                    <CustomSelect v-model="form.currency" :options="currencyOptions" placeholder="Currency" labelKey="label" valueKey="value" />
                  </div>
                  <div class="form-group">
                    <label>Payment Method</label>
                    <div class="chip-row">
                      <button v-for="m in ['cash','bank','card','online']" :key="m" class="chip" :class="{ active: form.payment_method === m }" @click="form.payment_method = m">
                        <component :is="paymentIcons[m]" :size="13" /> {{ m }}
                      </button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Payment Status</label>
                    <div class="chip-row">
                      <button v-for="s in ['paid','unpaid','partial']" :key="s" class="chip" :class="{ active: form.payment_status === s }" @click="form.payment_status = s">{{ s }}</button>
                    </div>
                  </div>
                  <div class="form-group full">
                    <label class="switch-label" @click="form.is_recurring = !form.is_recurring">
                      <span class="switch-track" :class="{ on: form.is_recurring }"><span class="switch-thumb"></span></span>
                      Recurring Expense
                    </label>
                  </div>
                  <div v-if="form.is_recurring" class="form-group">
                    <label>Installments</label>
                    <input v-model.number="form.installment_count" type="text" inputmode="numeric" placeholder="Number of installments" class="text-input no-arrows" />
                  </div>
                </div>
              </div>

              <!-- Step 3: Vendor -->
              <div v-else-if="currentStep === 2" key="s2" class="step-content">
                <div class="step-header"><Building2 :size="20" /><span>Vendor & Invoice Info</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Vendor Name <span class="req">*</span></label>
                    <input v-model="form.vendor_name" type="text" placeholder="e.g. Acme Corp" class="text-input" :class="{ 'has-error': v.vendor_name }" />
                    <span v-if="v.vendor_name" class="field-error"><AlertTriangle :size="11" /> Required</span>
                  </div>
                  <div class="form-group">
                    <label>Vendor Type <span class="req">*</span></label>
                    <div class="chip-row" :class="{ 'chip-error': v.vendor_type }">
                      <button class="chip" :class="{ active: form.vendor_type === 'internal' }" @click="form.vendor_type = 'internal'"><Building2 :size="13" /> Internal</button>
                      <button class="chip" :class="{ active: form.vendor_type === 'external' }" @click="form.vendor_type = 'external'"><Globe :size="13" /> External</button>
                    </div>
                    <span v-if="v.vendor_type" class="field-error"><AlertTriangle :size="11" /> Select type</span>
                  </div>
                  <div class="form-group">
                    <label>Vendor Contact</label>
                    <input v-model="form.vendor_contact" type="text" placeholder="Phone or email" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Vendor Tax ID</label>
                    <input v-model="form.vendor_tax_id" type="text" placeholder="GSTIN / TIN" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Invoice Number</label>
                    <input v-model="form.invoice_number" type="text" placeholder="INV-001" class="text-input" />
                  </div>
                  <div class="form-group">
                    <label>Invoice Date</label>
                    <DatePicker v-model="form.invoice_date" placeholder="Select date" />
                  </div>
                  <div class="form-group full">
                    <label>Purchase Order Ref</label>
                    <input v-model="form.purchase_order_ref" type="text" placeholder="PO-2025-001" class="text-input" />
                  </div>
                </div>
              </div>

              <!-- Step 4: Tax -->
              <div v-else-if="currentStep === 3" key="s3" class="step-content">
                <div class="step-header"><Receipt :size="20" /><span>Tax Calculations</span></div>
                <div class="form-grid">
                  <div class="form-group full">
                    <label class="switch-label" @click="form.tax_applicable = !form.tax_applicable">
                      <span class="switch-track" :class="{ on: form.tax_applicable }"><span class="switch-thumb"></span></span>
                      Tax Applicable
                    </label>
                  </div>
                  <template v-if="form.tax_applicable">
                    <div class="form-group">
                      <label>Tax Type <span class="req">*</span></label>
                      <CustomSelect v-model="form.tax_type" :options="[{label:'GST',value:'GST'},{label:'VAT',value:'VAT'},{label:'Custom',value:'custom'}]" placeholder="Select type" labelKey="label" valueKey="value" :error="v.tax_type" @update:modelValue="onTaxTypeChange" />
                      <span v-if="v.tax_type" class="field-error"><AlertTriangle :size="11" /> Required</span>
                    </div>
                    <div class="form-group">
                      <label>Tax Percentage <span class="req">*</span></label>
                      <CustomSelect v-model="form.tax_percentage" :options="taxPercentageOptions" placeholder="Select rate" labelKey="label" valueKey="value" :key="form.tax_type" :error="v.tax_percentage" />
                      <span v-if="v.tax_percentage" class="field-error"><AlertTriangle :size="11" /> Required</span>
                    </div>
                    <div class="form-group">
                      <label>Tax Amount</label>
                      <div class="readonly-value">{{ currencySymbol }}{{ taxAmount.toFixed(2) }}</div>
                    </div>

                    <div class="form-group full">
                      <label>Total After Tax</label>
                      <div class="readonly-value accent">{{ currencySymbol }}{{ totalAfterTax.toFixed(2) }}</div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Step 5: Allocation -->
              <div v-else-if="currentStep === 4" key="s4" class="step-content">
                <div class="step-header"><PieChart :size="20" /><span>Cost Allocation</span></div>
                <div class="alloc-section">
                  <div class="alloc-choice-row">
                    <div class="alloc-choice-card" :class="{ active: form.allocation_type === 'full' }" @click="form.allocation_type = 'full'">
                      <div class="alloc-choice-icon"><Target :size="22" /></div>
                      <div class="alloc-choice-text">
                        <span class="alloc-choice-title">Full Allocation</span>
                        <span class="alloc-choice-desc">Single cost center</span>
                      </div>
                      <div class="alloc-choice-check" v-if="form.allocation_type === 'full'"><Check :size="16" /></div>
                    </div>
                    <div class="alloc-choice-card" :class="{ active: form.allocation_type === 'split' }" @click="form.allocation_type = 'split'">
                      <div class="alloc-choice-icon"><Split :size="22" /></div>
                      <div class="alloc-choice-text">
                        <span class="alloc-choice-title">Split Allocation</span>
                        <span class="alloc-choice-desc">Multiple cost centers</span>
                      </div>
                      <div class="alloc-choice-check" v-if="form.allocation_type === 'split'"><Check :size="16" /></div>
                    </div>
                  </div>
                  <div v-if="form.allocation_type === 'full'" class="alloc-full-info">
                    <div class="alloc-full-card">
                      <div class="alloc-full-icon"><PieChart :size="20" /></div>
                      <div class="alloc-full-body">
                        <span class="alloc-full-label">100% allocated to primary cost center</span>
                        <span class="alloc-full-value">{{ currencySymbol }}{{ allocDisplayAmount.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="form.allocation_type === 'split'" class="alloc-split-section">
                    <div class="alloc-table">
                      <div class="alloc-head"><span>Category</span><span>Cost Center</span><span>%</span><span>Amount</span><span></span></div>
                      <div v-for="(row, i) in form.allocations" :key="i" class="alloc-row">
                        <input v-model="row.category" placeholder="Category" class="text-input sm" />
                        <input v-model="row.cost_center" placeholder="CC" class="text-input sm" />
                        <input v-model.number="row.percentage" type="text" inputmode="numeric" class="text-input sm mono no-arrows" @input="updateAllocAmount(i)" @keypress="onlyNumeric" />
                        <div class="readonly-value sm">{{ currencySymbol }}{{ (row.amount || 0).toFixed(2) }}</div>
                        <button class="icon-btn" @click="removeAlloc(i)"><X :size="14" /></button>
                      </div>
                      <button class="add-row-btn" @click="addAlloc"><Plus :size="14" /> Add Row</button>
                    </div>
                    <div class="alloc-summary" :class="{ error: allocTotal !== 100 }">
                      <PieChart :size="14" /> Total: {{ allocTotal.toFixed(1) }}%
                      <span v-if="allocTotal !== 100"> — Must equal 100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 6: Attachments -->
              <div v-else-if="currentStep === 5" key="s5" class="step-content">
                <div class="step-header"><Paperclip :size="20" /><span>Attachments</span></div>
                <div class="drop-zone" :class="{ active: dragActive }" @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop.prevent="onFileDrop">
                  <UploadCloud :size="28" class="drop-icon" />
                  <p class="drop-title">Drag & drop files here</p>
                  <span class="drop-or">or</span>
                  <label class="browse-btn">Browse Files<input type="file" multiple hidden accept=".pdf,image/*" @change="onFileSelect" /></label>
                  <p class="drop-hint">PDF or Image — max 5 MB each</p>
                </div>
                <div v-if="form.attachments && form.attachments.length" class="file-list">
                  <div v-for="(f, i) in form.attachments" :key="i" class="file-row">
                    <div class="file-meta"><FileText :size="15" /><span>{{ f.file_name }}</span><span class="file-size">{{ ((f.size || 0) / 1024 / 1024).toFixed(2) }} MB</span></div>
                    <button class="icon-btn" @click="removeFile(i)"><X :size="14" /></button>
                  </div>
                </div>
              </div>

              <!-- Step 7: Notes -->
              <div v-else-if="currentStep === 6" key="s6" class="step-content">
                <div class="step-header"><StickyNote :size="20" /><span>Additional Notes</span></div>
                <div class="notes-section">
                  <div class="notes-card">
                    <div class="notes-card-header"><StickyNote :size="16" /><span>Expense Notes</span></div>
                    <textarea v-model="form.notes" rows="8" placeholder="Add any notes, comments, or justifications..." class="notes-textarea"></textarea>
                  </div>

                  <div class="notes-switch-card">
                    <div class="notes-switch-left">
                      <div class="notes-switch-icon"><ShieldCheck :size="16" /></div>
                      <div class="notes-switch-text">
                        <span class="notes-switch-title">Internal Note</span>
                        <span class="notes-switch-desc">Not visible to approvers</span>
                      </div>
                    </div>
                    <button class="modern-switch" :class="{ on: form.is_internal_note }" @click="form.is_internal_note = !form.is_internal_note">
                      <span class="modern-switch-thumb"></span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 8: Review -->
              <div v-else-if="currentStep === 7" key="s7" class="step-content">
                <div class="step-header"><ShieldCheck :size="20" /><span>Review & Submit Draft</span></div>
                <div class="summary-preview">
                  <h4>Expense Summary</h4>
                  <div class="summary-grid">
                    <div class="summary-row"><span>Title</span><span>{{ form.title || '—' }}</span></div>
                    <div class="summary-row"><span>Category</span><span>{{ form.category || '—' }}</span></div>
                    <div class="summary-row"><span>Amount</span><span class="mono">{{ currencySymbol }}{{ (form.amount || 0).toFixed(2) }}</span></div>
                    <div class="summary-row" v-if="form.tax_applicable"><span>Tax ({{ form.tax_percentage }}%)</span><span class="mono">+{{ currencySymbol }}{{ taxAmount.toFixed(2) }}</span></div>
                    <div class="summary-divider"></div>
                    <div class="summary-row total"><span>Total</span><span class="mono">{{ currencySymbol }}{{ totalAfterTax.toFixed(2) }}</span></div>
                    <div class="summary-row"><span>Priority</span><span class="priority-chip" :class="form.priority"><Circle :size="6" /> {{ form.priority }}</span></div>
                    <div class="summary-row"><span>Payment</span><span>{{ form.payment_method }}</span></div>
                    <div v-if="form.vendor_name" class="summary-row"><span>Vendor</span><span>{{ form.vendor_name }}</span></div>
                    <div class="summary-row"><span>Attachments</span><span>{{ (form.attachments || []).length }} file(s)</span></div>
                  </div>
                </div>
              </div>

            </Transition>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button v-if="currentStep > 0" class="btn-text secondary" @click="prevStep">
              <ArrowLeft :size="16" /><span>Back</span>
            </button>
            <button v-else class="btn-text secondary" @click="close">Cancel</button>
            <div class="footer-right">
              <button v-if="currentStep < steps.length - 1" class="btn-pill primary" @click="nextStep">
                <span>Continue</span><ArrowRight :size="16" />
              </button>
              <div v-else style="display: flex; gap: 8px;">
                <button class="btn-pill secondary" :disabled="isSubmitting" @click="handleSubmit('draft')">
                  <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                  <span>Save Draft</span>
                </button>
                <button class="btn-pill primary" :disabled="isSubmitting" @click="handleSubmit()">
                  <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                  <span>{{ isSubmitting ? 'Submitting...' : 'Submit Draft' }}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import {
  X, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle, Plus, Circle,
  ClipboardList, DollarSign, Building2, Receipt, PieChart, Paperclip, StickyNote, ShieldCheck,
  Globe, Target, Split, Banknote, Landmark, CreditCard, Wifi, UploadCloud, FileText, ExternalLink
} from 'lucide-vue-next'
import CustomSelect from '../ui/CustomSelect.vue'
import DatePicker from '../ui/DatePicker.vue'
import { useToast } from '../../composables/useToast'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: Boolean,
  expense: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'submitted'])
const route = useRoute()
const { success: toastSuccess, error: toastError } = useToast()

const close = () => emit('update:modelValue', false)

const tzOffset = new Date().getTimezoneOffset() * 60000
const todayStr = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0]

const paymentIcons = { cash: Banknote, bank: Landmark, card: CreditCard, online: Wifi }

const steps = [
  { label: 'Basic Info', icon: ClipboardList },
  { label: 'Financial', icon: DollarSign },
  { label: 'Vendor', icon: Building2 },
  { label: 'Tax', icon: Receipt },
  { label: 'Allocation', icon: PieChart },
  { label: 'Attachments', icon: Paperclip },
  { label: 'Notes', icon: StickyNote },
  { label: 'Review', icon: ShieldCheck },
]

const currentStep = ref(0)
const isSubmitting = ref(false)
const dragActive = ref(false)
const slideDirection = ref('slide-left')
const categories = ref([])
const expenseTypes = ref([])

const form = reactive({
  title: '', category: '', expense_date: '', project_id: '', task_id: '',
  department: '', cost_center: '', expense_type: '', priority: 'medium', description: '',
  amount: null, currency: 'INR', exchange_rate: 1.0, payment_method: 'cash',
  payment_status: 'paid', is_recurring: false, installment_count: null,
  vendor_name: '', vendor_type: '', vendor_contact: '', vendor_tax_id: '',
  invoice_number: '', invoice_date: '', purchase_order_ref: '',
  tax_applicable: false, tax_type: '', tax_percentage: 0, withholding_tax: 0,
  allocation_type: 'full', allocations: [{ category: '', cost_center: '', percentage: 100, amount: 0 }],
  attachments: [],
  notes: '', is_internal_note: false,
})

const v = reactive({ title: false, category: false, expense_date: false, amount: false, expense_type: false, description: false, vendor_name: false, vendor_type: false, tax_type: false, tax_percentage: false })

// Fetch categories and types
const fetchMeta = async () => {
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    const headers = { Authorization: `Bearer ${token}` }
    const [catRes, typeRes] = await Promise.all([
      axios.get(`${API}/expenses/categories`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${API}/expenses/types`, { headers }).catch(() => ({ data: [] }))
    ])
    categories.value = catRes.data?.length ? catRes.data : ['Travel', 'Office Supplies', 'Software', 'Marketing', 'Utilities', 'Meals', 'Equipment', 'Training', 'Professional Services', 'Miscellaneous']
    expenseTypes.value = typeRes.data?.length ? typeRes.data : ['Reimbursement', 'Direct Payment', 'Petty Cash', 'Corporate Card', 'Advance']
  } catch { /* use defaults */ }
}

const categoryOptions = computed(() => categories.value.map(c => ({ label: c, value: c })))
const typeOptions = computed(() => expenseTypes.value.map(t => ({ label: t, value: t })))
const currencyOptions = [
  { label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' }, { label: 'INR (₹)', value: 'INR' }, { label: 'AED (د.إ)', value: 'AED' },
]
const taxRates = { GST: [0, 5, 12, 18, 28], VAT: [0, 5, 10, 20] }
const taxPercentageOptions = computed(() => {
  const type = form.tax_type || 'GST'
  const rates = taxRates[type] || taxRates.GST
  return rates.map(r => ({ label: `${r}%`, value: r }))
})

const currencySymbol = computed(() => ({ USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ' }[form.currency] || '$'))
const taxAmount = computed(() => form.tax_applicable ? (form.amount || 0) * ((form.tax_percentage || 0) / 100) : 0)
const totalAfterTax = computed(() => (form.amount || 0) + taxAmount.value)
const allocDisplayAmount = computed(() => form.tax_applicable ? totalAfterTax.value : (form.amount || 0))
const allocTotal = computed(() => (form.allocations || []).reduce((s, r) => s + (r.percentage || 0), 0))
const progressPercent = computed(() => ((currentStep.value) / (steps.length - 1)) * 100)

// Watch for modal open — populate form from expense prop
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && props.expense) {
    currentStep.value = 0
    fetchMeta()
    const e = props.expense
    Object.assign(form, {
      title: e.title || '', category: e.category || '', expense_date: e.expense_date || '',
      project_id: e.project_id || '', task_id: e.task_id || '',
      department: e.department || '', cost_center: e.cost_center || '',
      expense_type: e.expense_type || '', priority: (e.priority || 'medium').toLowerCase(),
      description: e.description || '',
      amount: (e.total_after_tax !== null && e.tax_amount != null && e.tax_applicable) 
          ? Number((e.total_after_tax - e.tax_amount).toFixed(2)) 
          : (e.amount || null),
      currency: e.currency || 'INR', exchange_rate: e.exchange_rate || 1.0,
      payment_method: (e.payment_method || 'cash').toLowerCase(),
      payment_status: (e.payment_status || 'paid').toLowerCase(),
      is_recurring: e.is_recurring || false, installment_count: e.installment_count || null,
      vendor_name: e.vendor_name || '', vendor_type: (e.vendor_type || '').toLowerCase(),
      vendor_contact: e.vendor_contact || '', vendor_tax_id: e.vendor_tax_id || '',
      invoice_number: e.invoice_number || '', invoice_date: e.invoice_date || '',
      purchase_order_ref: e.purchase_order_ref || '',
      tax_applicable: e.tax_applicable || false, tax_type: e.tax_type || '',
      tax_percentage: e.tax_percentage || 0, withholding_tax: e.withholding_tax || 0,
      allocation_type: (e.allocation_type || 'full').toLowerCase(),
      allocations: e.allocations && e.allocations.length ? JSON.parse(JSON.stringify(e.allocations)) : [{ category: '', cost_center: '', percentage: 100, amount: 0 }],
      attachments: e.attachments && e.attachments.length ? JSON.parse(JSON.stringify(e.attachments)) : [],
      notes: e.notes || '', is_internal_note: e.is_internal_note || false,
    })
    // Reset validation
    Object.keys(v).forEach(k => v[k] = false)
  }
})

const onlyNumeric = (e) => { if (!/[0-9.]/.test(e.key)) e.preventDefault() }
const onTaxTypeChange = () => { form.tax_percentage = 0; v.tax_percentage = false }

// Navigation
const goToStep = (idx) => { if (idx <= currentStep.value) { slideDirection.value = idx < currentStep.value ? 'slide-right' : 'slide-left'; currentStep.value = idx } }
const prevStep = () => { if (currentStep.value > 0) { slideDirection.value = 'slide-right'; currentStep.value-- } }
const nextStep = () => {
  if (currentStep.value === 0) {
    v.title = !form.title?.trim(); v.category = !form.category; v.expense_date = !form.expense_date; v.expense_type = !form.expense_type; v.description = !form.description?.trim()
    if (v.title || v.category || v.expense_date || v.expense_type || v.description) return
  }
  if (currentStep.value === 1) { v.amount = !form.amount || form.amount <= 0; if (v.amount) return }
  if (currentStep.value === 2) { v.vendor_name = !form.vendor_name?.trim(); v.vendor_type = !form.vendor_type; if (v.vendor_name || v.vendor_type) return }
  if (currentStep.value === 3 && form.tax_applicable) {
    v.tax_type = !form.tax_type; v.tax_percentage = !form.tax_percentage || form.tax_percentage <= 0
    if (v.tax_type || v.tax_percentage) return
  }
  slideDirection.value = 'slide-left'
  currentStep.value++
}

// Allocation
const updateAllocAmount = (i) => { form.allocations[i].amount = ((form.amount || 0) * (form.allocations[i].percentage || 0)) / 100 }
const addAlloc = () => form.allocations.push({ category: '', cost_center: '', percentage: 0, amount: 0 })
const removeAlloc = (i) => form.allocations.splice(i, 1)

// File helpers
const onFileDrop = (e) => { dragActive.value = false; Array.from(e.dataTransfer.files).forEach(addFileToList) }
const onFileSelect = (e) => { Array.from(e.target.files).forEach(addFileToList); e.target.value = '' }
const addFileToList = (file) => {
  if (file.size > 5 * 1024 * 1024) { toastError(`${file.name} exceeds 5 MB`); return }
  form.attachments.push({ file_name: file.name, size: file.size, file_url: URL.createObjectURL(file), doc_type: 'other' })
}
const removeFile = (i) => form.attachments.splice(i, 1)
const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

// Submit
const handleSubmit = async (overrideStatus = null) => {
  isSubmitting.value = true
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    const isAdmin = route.path.startsWith('/admin')
    const authToken = isAdmin ? (localStorage.getItem('admin_token') || token) : token

    // Auto-approve if total after tax is less than 50,000
    const finalTotal = totalAfterTax.value
    const newStatus = overrideStatus === 'draft' ? 'draft' : (finalTotal < 50000 ? 'approved' : 'submitted')

    const payload = {
      title: form.title, category: form.category, expense_date: form.expense_date,
      expense_type: form.expense_type, priority: form.priority, description: form.description,
      amount: form.amount, currency: form.currency, exchange_rate: form.exchange_rate,
      payment_method: form.payment_method, payment_status: form.payment_status,
      is_recurring: form.is_recurring, installment_count: form.installment_count,
      vendor_name: form.vendor_name, vendor_type: form.vendor_type || null,
      vendor_contact: form.vendor_contact, vendor_tax_id: form.vendor_tax_id,
      invoice_number: form.invoice_number, invoice_date: form.invoice_date || null,
      purchase_order_ref: form.purchase_order_ref,
      tax_applicable: form.tax_applicable, tax_type: form.tax_type || null,
      tax_percentage: form.tax_percentage, withholding_tax: form.withholding_tax,
      tax_amount: taxAmount.value, total_after_tax: finalTotal,
      allocation_type: form.allocation_type,
      allocations: form.allocation_type === 'split' ? form.allocations : null,
      attachments: form.attachments, notes: form.notes, is_internal_note: form.is_internal_note,
      department: form.department, cost_center: form.cost_center,
      expense_status: newStatus,
    }
    await axios.put(`${API}/expenses/${props.expense.id}`, payload, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    if (newStatus === 'draft') {
      toastSuccess('Draft saved successfully')
    } else if (newStatus === 'approved') {
      toastSuccess('Draft approved automatically (under ₹50,000)')
    } else {
      toastSuccess('Draft submitted for approval (₹50,000 or above)')
    }
    emit('submitted')
    close()
  } catch (e) {
    console.error(e)
    toastError(e.response?.data?.detail || 'Failed to submit draft')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* Modal Overlay & Glass Panel */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2000; display: flex; align-items: center; justify-content: center;
}
.modal-content.glass-panel {
  width: 640px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;
  background: linear-gradient(135deg, rgba(30,30,34,0.4) 0%, rgba(22,22,26,0.6) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1); overflow: hidden;
}

/* Header */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 28px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header .header-text h2 { font-size: 18px; font-weight: 700; color: #f5f5f7; margin: 0; }
.expense-id { font-size: 11px; color: #f59e0b; font-family: 'SF Mono', monospace; margin-top: 4px; }
.close-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center;
  justify-content: center; color: #8e8e93; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.close-btn:hover { 
  background: rgba(245,158,11,0.15); 
  border-color: rgba(245,158,11,0.4);
  color: #f59e0b; 
  transform: rotate(90deg) scale(1.05); 
}

/* Progress */
.progress-container { padding: 16px 28px 12px; }
.step-indicators { display: flex; gap: 4px; justify-content: space-between; margin-bottom: 10px; }
.step-dot {
  display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;
  color: rgba(255,255,255,0.3); transition: all 0.2s; flex: 1;
}
.step-dot.active { color: #f59e0b; }
.step-dot.completed { color: #10b981; }
.step-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.progress-track { height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 2px; transition: width 0.4s ease; }

/* Body */
.modal-body { flex: 1; overflow-y: auto; padding: 20px 28px; }
.step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #f5f5f7; font-size: 15px; font-weight: 600; }
.step-content { min-height: 200px; }

/* Form Grid */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.04em; }
.req { color: #ef4444; }

/* Inputs */
.text-input {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 14px; color: #f5f5f7; font-size: 14px;
  transition: border-color 0.2s; outline: none; width: 100%; font-family: inherit;
}
.text-input:focus { border-color: rgba(245,158,11,0.4); }
.text-input.has-error { border-color: #ef4444; }
.text-input.mono { font-family: 'SF Mono', 'Fira Code', monospace; }
.no-arrows::-webkit-inner-spin-button, .no-arrows::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
textarea.text-input { resize: vertical; min-height: 70px; }

.input-with-prefix { display: flex; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
.input-with-prefix.has-error { border-color: #ef4444; }
.input-with-prefix .prefix { padding: 0 12px; color: #f59e0b; font-weight: 700; font-size: 16px; border-right: 1px solid rgba(255,255,255,0.06); }
.input-with-prefix .text-input { border: none; background: transparent; border-radius: 0; }

.field-error { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ef4444; }

/* Chips */
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-error .chip { border-color: rgba(239,68,68,0.3); }
.chip {
  display: flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all 0.2s; text-transform: capitalize;
}
.chip:hover { border-color: rgba(255,255,255,0.15); color: #fff; }
.chip.active { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
.chip.active.low { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.chip.active.high { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }
.chip.active.critical { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); color: #a855f7; }

/* Switch */
.switch-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); }
.switch-track { width: 40px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.1); position: relative; transition: background 0.3s; flex-shrink: 0; }
.switch-track.on { background: #f59e0b; }
.switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.switch-track.on .switch-thumb { transform: translateX(18px); }

/* Readonly */
.readonly-value { padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: rgba(255,255,255,0.5); font-size: 14px; font-family: 'SF Mono', monospace; }
.readonly-value.accent { color: #f59e0b; font-weight: 700; }
.readonly-value.sm { padding: 6px 10px; font-size: 12px; }

/* Allocation */
.alloc-section { display: flex; flex-direction: column; gap: 16px; }
.alloc-choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.alloc-choice-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.alloc-choice-card:hover { border-color: rgba(255,255,255,0.12); }
.alloc-choice-card.active { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.25); }
.alloc-choice-icon { color: rgba(255,255,255,0.4); }
.alloc-choice-card.active .alloc-choice-icon { color: #f59e0b; }
.alloc-choice-text { flex: 1; display: flex; flex-direction: column; }
.alloc-choice-title { font-size: 13px; font-weight: 600; color: #f5f5f7; }
.alloc-choice-desc { font-size: 11px; color: rgba(255,255,255,0.4); }
.alloc-choice-check { color: #f59e0b; }
.alloc-full-info { margin-top: 4px; }
.alloc-full-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.12); border-radius: 12px; }
.alloc-full-icon { color: #f59e0b; }
.alloc-full-body { display: flex; flex-direction: column; }
.alloc-full-label { font-size: 12px; color: rgba(255,255,255,0.5); }
.alloc-full-value { font-size: 16px; font-weight: 700; color: #f59e0b; font-family: 'SF Mono', monospace; }
.alloc-split-section { display: flex; flex-direction: column; gap: 10px; }
.alloc-table { display: flex; flex-direction: column; gap: 6px; }
.alloc-head, .alloc-row { display: grid; grid-template-columns: 2fr 1.5fr 0.7fr 1.2fr 30px; gap: 6px; align-items: center; }
.alloc-head span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; }
.alloc-row .text-input.sm { padding: 6px 8px; font-size: 12px; }
.icon-btn { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; }
.icon-btn:hover { color: #ef4444; }
.add-row-btn { display: flex; align-items: center; gap: 6px; color: #f59e0b; background: none; border: 1px dashed rgba(245,158,11,0.2); border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 4px; }
.alloc-summary { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #10b981; font-weight: 600; }
.alloc-summary.error { color: #ef4444; }

/* Attachments */
.drop-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 32px; border: 2px dashed rgba(255,255,255,0.08); border-radius: 14px; background: rgba(255,255,255,0.02); transition: all 0.2s; text-align: center; }
.drop-zone.active { border-color: #f59e0b; background: rgba(245,158,11,0.04); }
.drop-icon { color: rgba(255,255,255,0.25); }
.drop-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); margin: 0; }
.drop-or { font-size: 12px; color: rgba(255,255,255,0.3); }
.browse-btn { color: #f59e0b; font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: underline; }
.drop-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
.file-list { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.file-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
.file-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.7); overflow: hidden; }
.file-size { font-size: 11px; color: rgba(255,255,255,0.35); }

/* Notes */
.notes-section { display: flex; flex-direction: column; gap: 14px; }
.notes-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
.notes-card-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; }
.notes-textarea { width: 100%; background: transparent; border: none; padding: 14px 16px; color: #f5f5f7; font-size: 14px; resize: none; outline: none; font-family: inherit; }
.notes-switch-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
.notes-switch-left { display: flex; align-items: center; gap: 12px; }
.notes-switch-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(245,158,11,0.08); display: flex; align-items: center; justify-content: center; color: #f59e0b; }
.notes-switch-text { display: flex; flex-direction: column; }
.notes-switch-title { font-size: 13px; font-weight: 600; color: #f5f5f7; }
.notes-switch-desc { font-size: 11px; color: rgba(255,255,255,0.4); }
.modern-switch { width: 44px; height: 24px; border-radius: 12px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; position: relative; transition: background 0.3s; }
.modern-switch.on { background: #f59e0b; }
.modern-switch-thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.modern-switch.on .modern-switch-thumb { transform: translateX(20px); }

/* Summary */
.summary-preview { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; }
.summary-preview h4 { font-size: 14px; font-weight: 700; color: #f5f5f7; margin: 0 0 14px; }
.summary-grid { display: flex; flex-direction: column; gap: 10px; }
.summary-row { display: flex; justify-content: space-between; font-size: 13px; }
.summary-row span:first-child { color: rgba(255,255,255,0.5); }
.summary-row span:last-child { color: #f5f5f7; font-weight: 500; }
.summary-row.total span { font-weight: 700; color: #f59e0b; font-size: 15px; }
.summary-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; }
.priority-chip { display: flex; align-items: center; gap: 4px; text-transform: capitalize; }
.priority-chip.low { color: #10b981; }
.priority-chip.medium { color: #f59e0b; }
.priority-chip.high { color: #ef4444; }
.priority-chip.critical { color: #a855f7; }

/* Footer */
.modal-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.06);
}
.btn-text { display: flex; align-items: center; gap: 6px; background: none; border: none; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-text:hover { color: #fff; }
.footer-right { display: flex; gap: 10px; }
.btn-pill {
  display: flex; align-items: center; gap: 6px; padding: 10px 22px; border-radius: 12px;
  font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s;
}
.btn-pill.primary { background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; }
.btn-pill.primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.btn-pill.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.slide-left-enter-active, .slide-left-leave-active, .slide-right-enter-active, .slide-right-leave-active { transition: all 0.25s ease; }
.slide-left-enter-from { opacity: 0; transform: translateX(30px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-30px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-30px); }
.slide-right-leave-to { opacity: 0; transform: translateX(30px); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar */
.modal-body::-webkit-scrollbar { width: 5px; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║ ULTRA-MODERN ENTRANCE + ANIMATIONS (BOTH THEMES)                      ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */

.modal-overlay {
  animation: emOverlayFade 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes emOverlayFade {
  from { opacity: 0; backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); }
  to   { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
}

.modal-content.glass-panel {
  animation: emPanelRise 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
@keyframes emPanelRise {
  from { opacity: 0; transform: translateY(24px) scale(0.96); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
.modal-content.glass-panel::before {
  content: ''; position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.55), transparent);
  animation: emTopLine 4.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes emTopLine {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}

/* Step content stagger entrance */
.step-content .form-group {
  animation: emFieldFade 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.step-content .form-group:nth-child(1) { animation-delay: 0.05s; }
.step-content .form-group:nth-child(2) { animation-delay: 0.10s; }
.step-content .form-group:nth-child(3) { animation-delay: 0.15s; }
.step-content .form-group:nth-child(4) { animation-delay: 0.20s; }
.step-content .form-group:nth-child(5) { animation-delay: 0.25s; }
.step-content .form-group:nth-child(6) { animation-delay: 0.30s; }
@keyframes emFieldFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Active step pulse on icon */
.step-dot.active svg {
  animation: emStepPulse 2.4s ease-in-out infinite;
}
@keyframes emStepPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.12); }
}

/* Progress shimmer */
.progress-fill {
  position: relative; overflow: hidden;
}
.progress-fill::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: translateX(-100%);
  animation: emShimmer 2s infinite;
}
@keyframes emShimmer { to { transform: translateX(100%); } }

/* Focus halo on inputs */
.text-input:focus, textarea:focus {
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14), 0 4px 14px -4px rgba(245, 158, 11, 0.20);
}

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║ LIGHT THEME — warm cream frosted glass (matches CreateMilestoneModal) ║
   ║ Preserves orange / yellow / golden palette                            ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
}
[data-theme="light"] .modal-content.glass-panel {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.65) 0%, rgba(252, 240, 220, 0.78) 100%);
  border: 1px solid rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 40px 80px rgba(40, 25, 10, 0.26),
    0 12px 24px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
  color: var(--text-primary);
}
[data-theme="light"] .modal-content.glass-panel::before {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.55), transparent);
}

/* Header */
[data-theme="light"] .modal-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .modal-header .header-text h2 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .expense-id { color: #b45309; }
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.50);
  border: 1px solid rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.35);
  color: #92400e;
}

/* Progress strip */
[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .progress-fill {
  background: linear-gradient(90deg, #d97706, #f59e0b);
}
[data-theme="light"] .step-dot { color: rgba(40, 25, 10, 0.35); }
[data-theme="light"] .step-dot.active { color: #b45309; }
[data-theme="light"] .step-dot.completed { color: #15803d; }

/* Step header */
[data-theme="light"] .step-header { color: var(--text-primary); }
[data-theme="light"] .step-header svg { color: #b45309; }

/* Form labels + inputs */
[data-theme="light"] .form-group label { color: #b45309; }
[data-theme="light"] .req { color: #dc2626; }
[data-theme="light"] .text-input,
[data-theme="light"] textarea,
[data-theme="light"] .input-with-prefix {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .text-input::placeholder,
[data-theme="light"] textarea::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .text-input:focus,
[data-theme="light"] textarea:focus {
  background: rgba(255, 246, 226, 0.92);
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14), 0 4px 14px -4px rgba(217, 119, 6, 0.20);
}

/* Prefix inside input wrapper */
[data-theme="light"] .prefix {
  background: transparent;
  color: #6b5840;
  border-right-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .input-with-prefix .text-input {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* Chips (priority) */
[data-theme="light"] .chip {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .chip:hover { background: rgba(40, 25, 10, 0.08); color: var(--text-primary); }
[data-theme="light"] .chip.active { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.40); color: #b45309; }
[data-theme="light"] .chip.active.low { background: rgba(16, 185, 129, 0.10); border-color: rgba(16, 185, 129, 0.40); color: #047857; }
[data-theme="light"] .chip.active.high { background: rgba(239, 68, 68, 0.10); border-color: rgba(239, 68, 68, 0.40); color: #b91c1c; }
[data-theme="light"] .chip.active.critical { background: rgba(168, 85, 247, 0.10); border-color: rgba(168, 85, 247, 0.40); color: #6b21a8; }

/* Section divider eyebrow */
[data-theme="light"] .section-divider span { color: #6b5840; }
[data-theme="light"] .section-divider::after { background: rgba(40, 25, 10, 0.10); }

/* Drop zone */
[data-theme="light"] .drop-zone {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.18);
  color: var(--text-secondary);
}
[data-theme="light"] .drop-zone.active {
  background: rgba(245, 158, 11, 0.08);
  border-color: #d97706;
}
[data-theme="light"] .drop-icon { color: #b45309; }
[data-theme="light"] .drop-title { color: var(--text-primary); }

/* Files list */
[data-theme="light"] .file-row {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .file-meta { color: var(--text-primary); }
[data-theme="light"] .file-meta svg { color: #b45309; }

/* Review cards */
[data-theme="light"] .review-card,
[data-theme="light"] .summary-card {
  background: rgba(40, 25, 10, 0.04);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .card-title { color: #6b5840; }
[data-theme="light"] .rev-label,
[data-theme="light"] .summary-row { color: var(--text-secondary); }
[data-theme="light"] .rev-val,
[data-theme="light"] .summary-row span:last-child { color: var(--text-primary); }

/* Toggle switch */
[data-theme="light"] .switch-track { background: rgba(40, 25, 10, 0.18); }
[data-theme="light"] .switch-track.on { background: #d97706; }

/* Allocation choice cards */
[data-theme="light"] .alloc-choice-card {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .alloc-choice-card:hover {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .alloc-choice-card.active {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .alloc-choice-icon {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-secondary);
}
[data-theme="light"] .alloc-choice-card.active .alloc-choice-icon {
  background: rgba(217, 119, 6, 0.16);
  color: #b45309;
}
[data-theme="light"] .alloc-choice-title { color: var(--text-primary); }
[data-theme="light"] .alloc-choice-desc { color: var(--text-secondary); }
[data-theme="light"] .alloc-choice-card.active .alloc-choice-title { color: #b45309; }
[data-theme="light"] .alloc-choice-check { background: #d97706; color: #fff; }

/* Allocation full info */
[data-theme="light"] .alloc-full-card {
  background: rgba(40, 25, 10, 0.04);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .alloc-full-icon {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .alloc-full-label { color: var(--text-secondary); }
[data-theme="light"] .alloc-full-value { color: #b45309; }

/* Allocation table */
[data-theme="light"] .alloc-head span { color: var(--text-tertiary); }
[data-theme="light"] .alloc-row { background: transparent; border: none; }
[data-theme="light"] .alloc-summary {
  color: #166534;
  background: rgba(34, 197, 94, 0.10);
  border: 1px solid rgba(34, 197, 94, 0.28);
}
[data-theme="light"] .alloc-summary.error {
  color: #991b1b;
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.30);
}
[data-theme="light"] .add-row-btn {
  background: rgba(245, 158, 11, 0.10);
  border: 1px dashed rgba(217, 119, 6, 0.45);
  color: #b45309;
}
[data-theme="light"] .add-row-btn:hover {
  background: rgba(245, 158, 11, 0.22);
  border-color: #d97706;
}

/* Notes switch */
[data-theme="light"] .notes-switch-card {
  background: rgba(40, 25, 10, 0.04);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .notes-switch-title { color: var(--text-primary); }
[data-theme="light"] .notes-switch-desc { color: var(--text-secondary); }
[data-theme="light"] .modern-switch { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .modern-switch.on { background: #d97706; }
[data-theme="light"] .switch-label {
  background: transparent !important;
  border: none !important;
  color: var(--text-primary) !important;
}

/* Footer */
[data-theme="light"] .modal-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .btn-text,
[data-theme="light"] .btn-back,
[data-theme="light"] .btn-cancel {
  background: rgba(40, 25, 10, 0.05);
  border: 1px solid rgba(40, 25, 10, 0.12);
  color: var(--text-primary);
}
[data-theme="light"] .btn-text:hover,
[data-theme="light"] .btn-back:hover,
[data-theme="light"] .btn-cancel:hover {
  background: rgba(40, 25, 10, 0.10);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .btn-pill.primary,
[data-theme="light"] .btn-primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn-pill.primary:hover:not(:disabled),
[data-theme="light"] .btn-primary:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgba(217, 119, 6, 0.42);
}

/* Scrollbar */
[data-theme="light"] .modal-body::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.18);
}

/* Card header text */
[data-theme="light"] .card-header h2 { color: var(--text-primary); }
[data-theme="light"] .card-header p { color: var(--text-secondary); }
[data-theme="light"] .card-icon { color: #b45309; }
</style>

 
