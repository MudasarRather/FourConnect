<template>
  <div class="expense-page">

    <!-- ─── HEADER ─── -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.back()">
          <ArrowLeft :size="16" />
        </button>
        <div class="header-text">
          <label>Expense Management</label>
          <h1>New Expense</h1>
        </div>
      </div>
      <div class="header-right">
        <span class="draft-badge">
          <Circle :size="8" /> Draft
        </span>
      </div>
    </header>

    <!-- ─── HORIZONTAL STEPPER ─── -->
    <div class="stepper-container">
      <div class="stepper-track">
        <div
          v-for="(step, idx) in steps"
          :key="idx"
          class="step-node"
          :class="{
            active: currentStep === idx,
            completed: idx < currentStep,
            clickable: idx <= maxVisited,
          }"
          @click="goToStep(idx)"
        >
          <div class="node-dot">
            <Check v-if="idx < currentStep" :size="12" />
            <component v-else :is="step.icon" :size="14" />
          </div>
          <span class="node-label">{{ step.label }}</span>
        </div>

        <!-- Progress line -->
        <div class="progress-line">
          <div class="progress-fill" :style="{ width: progressWidth }"></div>
        </div>
      </div>
    </div>

    <!-- ─── FORM CARD ─── -->
    <div class="form-card">
      <div class="card-header">
        <div class="card-title-row">
          <component :is="steps[currentStep].icon" :size="18" class="card-icon" />
          <div>
            <h2>{{ steps[currentStep].label }}</h2>
            <p>{{ steps[currentStep].desc }}</p>
          </div>
        </div>
        <span class="step-badge">{{ currentStep + 1 }}/{{ steps.length }}</span>
      </div>

      <div class="card-body">
        <transition name="step-slide" mode="out-in">

          <!-- ① Basic Info -->
          <div v-if="currentStep === 0" class="step-content" key="s0">
            <div class="form-grid">
              <div class="form-group">
                <label>Expense Title <span class="req">*</span></label>
                <input v-model="form.title" type="text" placeholder="e.g. Travel to Client Site" class="text-input" :class="{ 'has-error': v.title }" />
                <span v-if="v.title" class="field-error"><AlertTriangle :size="11" /> Title is required</span>
              </div>
              <div class="form-group">
                <label>Category <span class="req">*</span></label>
                <CustomSelect
                  v-model="form.category"
                  :options="categoryOptions"
                  placeholder="Select category"
                  labelKey="label"
                  valueKey="value"
                  :error="v.category"
                />
                <span v-if="v.category" class="field-error"><AlertTriangle :size="11" /> Category is required</span>
              </div>
              <div class="form-group">
                <label>Expense Date <span class="req">*</span></label>
                <CompactDatePicker v-model="form.expense_date" placeholder="Select date" :error="v.expense_date" :maxDate="todayStr" />
                <span v-if="v.expense_date" class="field-error"><AlertTriangle :size="11" /> Expense date is required</span>
              </div>
              <div class="form-group">
                <label>Project</label>
                <CustomSelect
                  v-model="form.project_id"
                  :options="projectOptions"
                  placeholder="None (general)"
                  labelKey="label"
                  valueKey="value"
                />
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
                <label>Expense Type <span class="req">*</span></label>
                <CustomSelect
                  v-model="form.expense_type"
                  :options="typeOptions"
                  placeholder="Select type"
                  labelKey="label"
                  valueKey="value"
                  :error="v.expense_type"
                />
                <span v-if="v.expense_type" class="field-error"><AlertTriangle :size="11" /> Expense type is required</span>
              </div>
              <div class="form-group">
                <label>Priority</label>
                <div class="chip-row">
                  <button v-for="p in ['low','medium','high','critical']" :key="p" class="chip" :class="{ active: form.priority === p, [p]: form.priority === p }" @click="form.priority = p">
                    {{ p }}
                  </button>
                </div>
              </div>
              <div class="form-group full">
                <label>Description <span class="req">*</span></label>
                <textarea v-model="form.description" rows="3" placeholder="Brief description..." class="text-input" :class="{ 'has-error': v.description }"></textarea>
                <span v-if="v.description" class="field-error"><AlertTriangle :size="11" /> Description is required</span>
              </div>
            </div>
          </div>

          <!-- ② Financial Details -->
          <div v-else-if="currentStep === 1" class="step-content" key="s1">
            <div class="form-grid">
              <div class="form-group">
                <label>Amount <span class="req">*</span></label>
                <div class="input-with-prefix" :class="{ 'has-error': v.amount }">
                  <span class="prefix">{{ currencySymbol }}</span>
                  <input v-model.number="form.amount" type="text" inputmode="decimal" placeholder="0.00" class="text-input mono no-arrows" @input="onAmountInput" @keypress="onlyNumeric" />
                </div>
                <span v-if="v.amount" class="field-error"><AlertTriangle :size="11" /> Amount is required</span>
              </div>
              <div class="form-group">
                <label>Currency</label>
                <CustomSelect
                  v-model="form.currency"
                  :options="currencyOptions"
                  placeholder="Select currency"
                  labelKey="label"
                  valueKey="value"
                />
              </div>
              <div class="form-group">
                <label>Payment Method</label>
                <div class="chip-row">
                  <button v-for="m in ['cash','bank','card','online']" :key="m" class="chip" :class="{ active: form.payment_method === m }" @click="form.payment_method = m">
                    <component :is="paymentIcons[m]" :size="13" />
                    {{ m }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label>Payment Status</label>
                <div class="chip-row">
                  <button v-for="s in ['paid','unpaid','partial']" :key="s" class="chip" :class="{ active: form.payment_status === s }" @click="form.payment_status = s">
                    {{ s }}
                  </button>
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

          <!-- ③ Vendor -->
          <div v-else-if="currentStep === 2" class="step-content" key="s2">
            <div class="form-grid">
              <div class="form-group">
                <label>Vendor Name <span class="req">*</span></label>
                <input v-model="form.vendor_name" type="text" placeholder="e.g. Acme Corp" class="text-input" :class="{ 'has-error': v.vendor_name }" />
                <span v-if="v.vendor_name" class="field-error"><AlertTriangle :size="11" /> Vendor name is required</span>
              </div>
              <div class="form-group">
                <label>Vendor Type <span class="req">*</span></label>
                <div class="chip-row" :class="{ 'chip-error': v.vendor_type }">
                  <button class="chip" :class="{ active: form.vendor_type === 'internal' }" @click="form.vendor_type = 'internal'"><Building2 :size="13" /> Internal</button>
                  <button class="chip" :class="{ active: form.vendor_type === 'external' }" @click="form.vendor_type = 'external'"><Globe :size="13" /> External</button>
                </div>
                <span v-if="v.vendor_type" class="field-error"><AlertTriangle :size="11" /> Select a vendor type</span>
              </div>
              <div class="form-group">
                <label>Vendor Contact</label>
                <input v-model="form.vendor_contact" type="text" placeholder="Phone or email (optional)" class="text-input" />
              </div>
              <div class="form-group">
                <label>Vendor Tax ID</label>
                <input v-model="form.vendor_tax_id" type="text" placeholder="e.g. GSTIN / TIN (optional)" class="text-input" />
              </div>
              <div class="form-group">
                <label>Invoice Number</label>
                <input v-model="form.invoice_number" type="text" placeholder="INV-001" class="text-input" @blur="checkDuplicate" />
                <span v-if="duplicateWarning" class="err-msg"><AlertTriangle :size="11" /> {{ duplicateWarning }}</span>
              </div>
              <div class="form-group">
                <label>Invoice Date</label>
                <DatePicker v-model="form.invoice_date" placeholder="Select date" />
              </div>
              <div class="form-group full">
                <label>Purchase Order Ref</label>
                <input v-model="form.purchase_order_ref" type="text" placeholder="PO-2025-001 (optional)" class="text-input" />
              </div>
            </div>
          </div>

          <!-- ④ Tax -->
          <div v-else-if="currentStep === 3" class="step-content" key="s3">
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
                  <CustomSelect
                    v-model="form.tax_type"
                    :options="[{label:'GST',value:'GST'},{label:'VAT',value:'VAT'},{label:'Custom',value:'custom'}]"
                    placeholder="Select type"
                    labelKey="label"
                    valueKey="value"
                    :error="v.tax_type"
                    @update:modelValue="onTaxTypeChange"
                  />
                  <span v-if="v.tax_type" class="field-error"><AlertTriangle :size="11" /> Tax type is required when tax is applicable</span>
                </div>
                <div class="form-group">
                  <label>Tax Percentage <span class="req">*</span></label>
                  <CustomSelect
                    v-model="form.tax_percentage"
                    :options="taxPercentageOptions"
                    placeholder="Select rate"
                    labelKey="label"
                    valueKey="value"
                    :key="form.tax_type"
                    :error="v.tax_percentage"
                  />
                  <span v-if="v.tax_percentage" class="field-error"><AlertTriangle :size="11" /> Tax percentage is required</span>
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

          <!-- ⑤ Allocation -->
          <div v-else-if="currentStep === 4" class="step-content" key="s4">
            <div class="alloc-section">
              <!-- Allocation choice cards -->
              <div class="alloc-choice-row">
                <div class="alloc-choice-card" :class="{ active: form.allocation_type === 'full' }" @click="form.allocation_type = 'full'">
                  <div class="alloc-choice-icon"><Target :size="22" /></div>
                  <div class="alloc-choice-text">
                    <span class="alloc-choice-title">Full Allocation</span>
                    <span class="alloc-choice-desc">Entire expense assigned to a single cost center or category</span>
                  </div>
                  <div class="alloc-choice-check" v-if="form.allocation_type === 'full'"><Check :size="16" /></div>
                </div>
                <div class="alloc-choice-card" :class="{ active: form.allocation_type === 'split' }" @click="form.allocation_type = 'split'">
                  <div class="alloc-choice-icon"><Split :size="22" /></div>
                  <div class="alloc-choice-text">
                    <span class="alloc-choice-title">Split Allocation</span>
                    <span class="alloc-choice-desc">Distribute across multiple categories or cost centers</span>
                  </div>
                  <div class="alloc-choice-check" v-if="form.allocation_type === 'split'"><Check :size="16" /></div>
                </div>
              </div>

              <!-- Full allocation info -->
              <div v-if="form.allocation_type === 'full'" class="alloc-full-info">
                <div class="alloc-full-card">
                  <div class="alloc-full-icon"><PieChart :size="20" /></div>
                  <div class="alloc-full-body">
                    <span class="alloc-full-label">100% allocated to primary cost center</span>
                    <span class="alloc-full-value">{{ currencySymbol }}{{ allocDisplayAmount.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <!-- Split allocation table -->
              <div v-if="form.allocation_type === 'split'" class="alloc-split-section">
                <div class="alloc-table">
                  <div class="alloc-head">
                    <span>Category</span><span>Cost Center</span><span>%</span><span>Amount</span><span></span>
                  </div>
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
                  <PieChart :size="14" />
                  Total: {{ allocTotal.toFixed(1) }}%
                  <span v-if="allocTotal !== 100"> — Must equal 100%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ⑥ Attachments -->
          <div v-else-if="currentStep === 5" class="step-content" key="s5">
            <div class="attachment-mandatory-notice" v-if="v.attachments">
              <AlertTriangle :size="14" /> At least one attachment is required
            </div>
            <div
              class="drop-zone"
              :class="{ active: dragActive, 'has-error': v.attachments }"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onFileDrop"
            >
              <UploadCloud :size="28" class="drop-icon" />
              <p class="drop-title">Drag & drop files here</p>
              <span class="drop-or">or</span>
              <label class="browse-btn">
                Browse Files
                <input type="file" multiple hidden accept=".pdf,image/*" @change="onFileSelect" />
              </label>
              <p class="drop-hint">PDF or Image only — max 5 MB each <span class="req">*</span></p>
            </div>
            <div v-if="form.attachments.length" class="file-list">
              <div v-for="(f, i) in form.attachments" :key="i" class="file-row">
                <div class="file-meta">
                  <FileText :size="15" />
                  <span>{{ f.file_name }}</span>
                  <span class="file-size">{{ (f.size / 1024 / 1024).toFixed(2) }} MB</span>
                </div>
                <CustomSelect
                  v-model="f.doc_type"
                  :options="[{label:'Invoice',value:'invoice'},{label:'Receipt',value:'receipt'},{label:'Contract',value:'contract'},{label:'Screenshot',value:'screenshot'},{label:'Other',value:'other'}]"
                  labelKey="label"
                  valueKey="value"
                  class="compact-select"
                />
                <button class="icon-btn" @click="removeFile(i)"><X :size="14" /></button>
              </div>
            </div>
          </div>

          <!-- ⑦ Notes -->
          <div v-else-if="currentStep === 6" class="step-content" key="s6">
            <div class="notes-section">
              <div class="notes-card">
                <div class="notes-card-header">
                  <StickyNote :size="16" />
                  <span>Expense Notes</span>
                </div>
                <textarea v-model="form.notes" rows="8" placeholder="Add any notes, comments, or justifications for this expense..." class="notes-textarea"></textarea>
              </div>
              <div class="notes-switch-card">
                <div class="notes-switch-left">
                  <div class="notes-switch-icon"><ShieldCheck :size="16" /></div>
                  <div class="notes-switch-text">
                    <span class="notes-switch-title">Internal Note</span>
                    <span class="notes-switch-desc">This note will be strictly visible only to you (the creator) and hidden from everyone else, including admins</span>
                  </div>
                </div>
                <button class="modern-switch" :class="{ on: form.is_internal_note }" @click="form.is_internal_note = !form.is_internal_note">
                  <span class="modern-switch-thumb"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- ⑧ Review & Submit -->
          <div v-else-if="currentStep === 7" class="step-content" key="s7">
            <div class="approval-section">
              <!-- Approval workflow — only for >50K -->
              <template v-if="needsApproval">
                <h3><ShieldCheck :size="18" /> Admin Approval Required</h3>
                <p class="approval-sub">This expense exceeds ₹50,000 and requires admin approval before processing.</p>
                <div class="approval-chain">
                  <div class="approval-card required">
                    <div class="approval-icon"><UserCheck :size="16" /></div>
                    <div class="approval-text">
                      <span class="approval-role">Admin</span>
                      <span class="approval-range">Expenses above ₹50,000</span>
                    </div>
                    <span class="approval-tag">required</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <h3><Check :size="18" class="text-green" /> Direct Submission</h3>
                <p class="approval-sub">This expense is under ₹50,000 — it will be recorded directly without admin approval.</p>
              </template>

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
                  <div class="summary-row"><span>Attachments</span><span>{{ form.attachments.length }} file(s)</span></div>
                </div>
              </div>

              <!-- Actions -->
              <div class="submit-actions">
                <button class="btn-ghost" @click="saveDraft" :disabled="submitting">
                  <Save :size="15" /> Save as Draft
                </button>
                <template v-if="needsApproval">
                  <button class="btn-primary" @click="submitForApproval" :disabled="submitting">
                    <Send :size="15" /> Submit for Approval
                  </button>
                </template>
                <template v-else>
                  <button class="btn-primary" @click="submitDirect" :disabled="submitting">
                    <Send :size="15" /> Submit
                  </button>
                  <button class="btn-primary" @click="submitAndNew" :disabled="submitting">
                    <RefreshCw :size="15" /> Submit & New
                  </button>
                </template>
              </div>
            </div>
          </div>

        </transition>
      </div>

      <!-- Card Footer (Back / Next) — hidden on last step -->
      <div class="card-footer" v-if="currentStep < steps.length - 1">
        <button v-if="currentStep > 0" class="btn-back" @click="prevStep">
          <ArrowLeft :size="14" /> Back
        </button>
        <div v-else></div>
        <button class="btn-next" @click="nextStep">
          Next <ArrowRight :size="14" />
        </button>
      </div>
      <div v-else class="card-footer">
        <button class="btn-back" @click="prevStep">
          <ArrowLeft :size="14" /> Back
        </button>
        <button class="btn-cancel" @click="$router.back()">Cancel</button>
      </div>
    </div>

    <!-- ─── FLOATING CALCULATOR WIDGET ─── -->
    <div class="calc-widget" :class="{ open: calcOpen }">
      <transition name="calc-scale">
        <div v-if="calcOpen" class="calc-panel" @click.stop>
          <div class="calc-header">
            <span class="calc-title"><Calculator :size="14" /> Calculator</span>
            <button class="calc-close" @click="calcOpen = false"><X :size="14" /></button>
          </div>
          <div class="calc-display">
            <div class="calc-expression">{{ calcExpression || '0' }}</div>
            <div class="calc-result">{{ calcDisplayResult }}</div>
          </div>
          <div class="calc-memory-row" v-if="calcMemory !== 0">
            <span class="calc-mem-badge">M = {{ calcMemory }}</span>
          </div>
          <div class="calc-grid">
            <button class="calc-btn fn" @click="calcAction('MC')">MC</button>
            <button class="calc-btn fn" @click="calcAction('MR')">MR</button>
            <button class="calc-btn fn" @click="calcAction('M+')">M+</button>
            <button class="calc-btn fn" @click="calcAction('M-')">M−</button>

            <button class="calc-btn fn" @click="calcAction('AC')">AC</button>
            <button class="calc-btn fn" @click="calcAction('backspace')">⌫</button>
            <button class="calc-btn fn" @click="calcAction('%')">%</button>
            <button class="calc-btn op" @click="calcAction('/')">÷</button>

            <button class="calc-btn num" @click="calcAction('7')">7</button>
            <button class="calc-btn num" @click="calcAction('8')">8</button>
            <button class="calc-btn num" @click="calcAction('9')">9</button>
            <button class="calc-btn op" @click="calcAction('*')">×</button>

            <button class="calc-btn num" @click="calcAction('4')">4</button>
            <button class="calc-btn num" @click="calcAction('5')">5</button>
            <button class="calc-btn num" @click="calcAction('6')">6</button>
            <button class="calc-btn op" @click="calcAction('-')">−</button>

            <button class="calc-btn num" @click="calcAction('1')">1</button>
            <button class="calc-btn num" @click="calcAction('2')">2</button>
            <button class="calc-btn num" @click="calcAction('3')">3</button>
            <button class="calc-btn op" @click="calcAction('+')">+</button>

            <button class="calc-btn num zero" @click="calcAction('0')">0</button>
            <button class="calc-btn num" @click="calcAction('.')">.</button>
            <button class="calc-btn eq" @click="calcAction('=')">=</button>
          </div>
          <button class="calc-apply-btn" @click="applyCalcToAmount">
            <ArrowRight :size="14" /> Apply ₹{{ calcDisplayResult }} to Amount
          </button>
        </div>
      </transition>
      <button class="calc-fab" @click.stop="calcOpen = !calcOpen">
        <transition name="rotate-fade" mode="out-in">
          <Calculator v-if="!calcOpen" :size="20" key="icon" />
          <X v-else :size="20" key="close" />
        </transition>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'

// Today's date string for maxDate on expense_date (adjust for local timezone)
const tzOffset = new Date().getTimezoneOffset() * 60000
const todayStr = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0]
import axios from 'axios'
import CustomSelect from '../components/ui/CustomSelect.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import CompactDatePicker from '../components/ui/CompactDatePicker.vue'
import {
  ArrowLeft, ArrowRight, Check, X, Plus, Circle,
  FileText, UploadCloud, AlertTriangle,
  Save, RefreshCw, Send, UserCheck, ShieldCheck,
  ClipboardList, DollarSign, Building2, Receipt,
  PieChart, Paperclip, StickyNote, Globe, Target,
  Banknote, Landmark, CreditCard, Wifi, Split, Calculator
} from 'lucide-vue-next'

const router = useRouter()
const basePath = computed(() => router.currentRoute.value.path.startsWith('/admin') ? '/admin' : '/user')
const { success: toastSuccess, error: toastError } = useToast()
const API = 'http://localhost:8000/api'
const getHeaders = () => {
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
  return { Authorization: `Bearer ${token}` }
}

const currentStep = ref(0)
const maxVisited = ref(0)
const submitting = ref(false)
const dragActive = ref(false)
const duplicateWarning = ref('')
const categories = ref([])
const expenseTypes = ref([])
const projects = ref([])
const taxRates = ref({ GST: [0, 5, 12, 18, 28], VAT: [0, 5, 10, 20] })

const paymentIcons = { cash: Banknote, bank: Landmark, card: CreditCard, online: Wifi }

const steps = [
  { label: 'Basic Info', desc: 'Title, category & dates', icon: ClipboardList },
  { label: 'Financial', desc: 'Amount & payment details', icon: DollarSign },
  { label: 'Vendor', desc: 'Vendor & invoice info', icon: Building2 },
  { label: 'Tax', desc: 'Tax calculations', icon: Receipt },
  { label: 'Allocation', desc: 'Cost split & allocation', icon: PieChart },
  { label: 'Attachments', desc: 'Upload documents', icon: Paperclip },
  { label: 'Notes', desc: 'Additional notes', icon: StickyNote },
  { label: 'Review', desc: 'Review & submit', icon: ShieldCheck },
]

const form = reactive({
  title: '', category: '', expense_date: '', project_id: '', task_id: '',
  department: '', cost_center: '', expense_type: '', priority: 'medium', description: '',
  amount: null, currency: 'INR', exchange_rate: 1.0, payment_method: 'cash',
  payment_status: 'paid', expense_status: 'draft', is_recurring: false, installment_count: null,
  vendor_name: '', vendor_type: '', vendor_contact: '', vendor_tax_id: '',
  invoice_number: '', invoice_date: '', purchase_order_ref: '',
  tax_applicable: false, tax_type: '', tax_percentage: 0, withholding_tax: 0,
  allocation_type: 'full', allocations: [{ category: '', cost_center: '', percentage: 100, amount: 0 }],
  attachments: [],
  notes: '', is_internal_note: false,
})

const v = reactive({ title: false, category: false, expense_date: false, amount: false, expense_type: false, description: false, vendor_name: false, vendor_type: false, vendor_contact: false, tax_type: false, tax_percentage: false, attachments: false })

/* Option arrays for CustomSelect */
const categoryOptions = computed(() => categories.value.map(c => ({ label: c, value: c })))
const typeOptions = computed(() => expenseTypes.value.map(t => ({ label: t, value: t })))
const projectOptions = computed(() => projects.value.map(p => ({ label: p.project_name || p.name, value: p.id })))
const currencyOptions = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'INR (₹)', value: 'INR' },
  { label: 'AED (د.إ)', value: 'AED' },
]

/* Computed */
const currencySymbol = computed(() => ({ USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ' }[form.currency] || '$'))
const taxAmount = computed(() => form.tax_applicable ? (form.amount || 0) * ((form.tax_percentage || 0) / 100) : 0)
const totalAfterTax = computed(() => (form.amount || 0) + taxAmount.value)
const allocDisplayAmount = computed(() => form.tax_applicable ? totalAfterTax.value : (form.amount || 0))
const allocTotal = computed(() => form.allocations.reduce((s, r) => s + (r.percentage || 0), 0))
const progressWidth = computed(() => ((currentStep.value) / (steps.length - 1) * 100) + '%')
const taxPercentageOptions = computed(() => {
  const type = form.tax_type || 'GST'
  const rates = taxRates.value[type] || taxRates.value.GST || [0, 5, 12, 18, 28]
  return rates.map(r => ({ label: `${r}%`, value: r }))
})

/* Needs admin approval if amount > 50000 INR */
const needsApproval = computed(() => (form.amount || 0) > 50000)

/* Amount input helper (strips non-numeric except dot) */
const onAmountInput = (e) => {
  const val = e.target.value.replace(/[^0-9.]/g, '')
  form.amount = val ? parseFloat(val) : null
}
/* Block non-numeric keys */
const onlyNumeric = (e) => {
  if (!/[0-9.]/.test(e.key)) e.preventDefault()
}

/* Reset tax_percentage when tax_type changes */
const onTaxTypeChange = () => {
  form.tax_percentage = 0
  v.tax_percentage = false
}



/* Navigation */
const goToStep = (idx) => { if (idx <= maxVisited.value) currentStep.value = idx }
const prevStep = () => { if (currentStep.value > 0) currentStep.value-- }
const nextStep = () => {
  if (currentStep.value === 0) {
    v.title = !form.title.trim(); v.category = !form.category; v.expense_date = !form.expense_date; v.expense_type = !form.expense_type; v.description = !form.description?.trim()
    if (v.title || v.category || v.expense_date || v.expense_type || v.description) return
  }
  if (currentStep.value === 1) {
    v.amount = !form.amount || form.amount <= 0
    if (v.amount) return
  }
  if (currentStep.value === 2) {
    v.vendor_name = !form.vendor_name?.trim(); v.vendor_type = !form.vendor_type
    if (v.vendor_name || v.vendor_type) return
  }
  if (currentStep.value === 3 && form.tax_applicable) {
    v.tax_type = !form.tax_type; v.tax_percentage = !form.tax_percentage || form.tax_percentage <= 0
    if (v.tax_type || v.tax_percentage) return
  }
  if (currentStep.value === 5) {
    v.attachments = form.attachments.length === 0
    if (v.attachments) return
  }
  currentStep.value++
  if (currentStep.value > maxVisited.value) maxVisited.value = currentStep.value
}

/* Allocation helpers */
const updateAllocAmount = (i) => { form.allocations[i].amount = ((form.amount || 0) * (form.allocations[i].percentage || 0)) / 100 }
const addAlloc = () => form.allocations.push({ category: '', cost_center: '', percentage: 0, amount: 0 })
const removeAlloc = (i) => form.allocations.splice(i, 1)

/* File helpers — 5MB limit, PDF/image only */
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']

const validateAndAddFile = async (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toastError(`"${file.name}" is not a valid file. Only PDF and images are allowed.`)
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    toastError(`"${file.name}" exceeds 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`)
    return false
  }
  // PDF inner content check
  if (file.type === 'application/pdf') {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer.slice(0, 5))
      const header = String.fromCharCode(...bytes)
      if (header !== '%PDF-') {
        toastError(`"${file.name}" appears to be corrupted or not a valid PDF file.`)
        return false
      }
    } catch {
      toastError(`Could not verify "${file.name}". Please re-upload.`)
      return false
    }
  }
  form.attachments.push({ file_name: file.name, file_url: URL.createObjectURL(file), doc_type: 'other', size: file.size, _file: file })
  v.attachments = false
  return true
}
const onFileDrop = (e) => { dragActive.value = false; Array.from(e.dataTransfer.files).forEach(f => validateAndAddFile(f)) }
const onFileSelect = (e) => { Array.from(e.target.files).forEach(f => validateAndAddFile(f)); e.target.value = '' }
const removeFile = (i) => form.attachments.splice(i, 1)

/* Duplicate check */
const checkDuplicate = async () => {
  if (!form.invoice_number) { duplicateWarning.value = ''; return }
  try {
    const { data } = await axios.post(`${API}/expenses/check-duplicate`, { invoice_number: form.invoice_number, vendor_name: form.vendor_name || null }, { headers: getHeaders() })
    duplicateWarning.value = data.is_duplicate ? `Duplicate: matches "${data.matching_title}"` : ''
  } catch { duplicateWarning.value = '' }
}

/* Submit helpers */
const buildPayload = (status) => ({
  // Basic Info
  title: form.title,
  category: form.category,
  expense_date: form.expense_date,
  project_id: form.project_id || null,
  task_id: form.task_id || null,
  department: form.department || null,
  cost_center: form.cost_center || null,
  expense_type: form.expense_type || null,
  priority: form.priority || 'medium',
  description: form.description || null,
  // Financial — keep the raw amount, don't double tax it
  amount: form.amount || 0,
  currency: form.currency || 'INR',
  exchange_rate: form.exchange_rate || 1.0,
  base_amount: form.amount || 0,
  payment_method: form.payment_method || 'cash',
  payment_status: form.payment_status || 'unpaid',
  expense_status: status,
  is_recurring: form.is_recurring || false,
  installment_count: form.installment_count || null,
  // Vendor
  vendor_name: form.vendor_name || null,
  vendor_type: form.vendor_type || null,
  vendor_contact: form.vendor_contact || null,
  vendor_tax_id: form.vendor_tax_id || null,
  invoice_number: form.invoice_number || null,
  invoice_date: form.invoice_date || null,
  purchase_order_ref: form.purchase_order_ref || null,
  // Tax
  tax_applicable: form.tax_applicable || false,
  tax_type: form.tax_type || null,
  tax_percentage: form.tax_percentage || 0,
  tax_amount: taxAmount.value,
  withholding_tax: 0,
  total_after_tax: totalAfterTax.value,
  // Allocation
  allocation_type: form.allocation_type || 'full',
  allocations: form.allocation_type === 'split'
    ? form.allocations.map(a => ({ category: a.category, cost_center: a.cost_center, percentage: a.percentage, amount: a.amount }))
    : null,
  // Attachments (should be server URLs by now, drop _file)
  attachments: form.attachments.map(a => ({ file_name: a.file_name, file_url: a.file_url, doc_type: a.doc_type, size: a.size })),
  // Notes
  notes: form.notes || null,
  is_internal_note: form.is_internal_note || false,
})

const uploadAttachments = async () => {
  for (let i = 0; i < form.attachments.length; i++) {
    const att = form.attachments[i]
    if (att._file) {
      try {
        const formData = new FormData()
        formData.append('file', att._file)
        const { data } = await axios.post(`${API}/uploads/expense-attachment`, formData, {
          headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
        })
        if (data.success) {
           att.file_url = data.file_url // Use the server URL
           delete att._file // Remove blob reference
        }
      } catch (e) {
        console.error('File upload failed', e)
        throw new Error(`Failed to upload ${att.file_name}`)
      }
    }
  }
}

const saveDraft = async () => {
  submitting.value = true
  try {
    await uploadAttachments()
    await axios.post(`${API}/expenses/`, buildPayload('draft'), { headers: getHeaders() })
    toastSuccess('Expense saved as draft')
    router.push(`${basePath.value}/expenses/draftexpenses`)
  } catch (e) { console.error(e); toastError(e.message || 'Failed to save draft') }
  finally { submitting.value = false }
}

/* Validate all mandatory fields */
const validateAll = () => {
  v.title = !form.title.trim(); v.category = !form.category; v.expense_date = !form.expense_date; v.expense_type = !form.expense_type; v.description = !form.description?.trim(); v.amount = !form.amount || form.amount <= 0
  v.vendor_name = !form.vendor_name?.trim(); v.vendor_type = !form.vendor_type
  if (form.tax_applicable) { v.tax_type = !form.tax_type; v.tax_percentage = !form.tax_percentage || form.tax_percentage <= 0 }
  v.attachments = form.attachments.length === 0
  const step0Err = v.title || v.category || v.expense_date || v.expense_type || v.description
  const step1Err = v.amount
  const step2Err = v.vendor_name || v.vendor_type
  const step3Err = form.tax_applicable && (v.tax_type || v.tax_percentage)
  const step5Err = v.attachments
  if (step0Err || step1Err || step2Err || step3Err || step5Err) {
    currentStep.value = step0Err ? 0 : step1Err ? 1 : step2Err ? 2 : step3Err ? 3 : 5
    return false
  }
  return true
}

const submitForApproval = async () => {
  if (!validateAll()) return
  submitting.value = true
  try {
    await uploadAttachments()
    await axios.post(`${API}/expenses/`, buildPayload('submitted'), { headers: getHeaders() })
    toastSuccess('Expense submitted for approval')
    router.push(`${basePath.value}/expenses/all`)
  } catch (e) { console.error(e); toastError(e.message || 'Failed to submit expense') }
  finally { submitting.value = false }
}

const submitDirect = async () => {
  if (!validateAll()) return
  submitting.value = true
  try {
    await uploadAttachments()
    await axios.post(`${API}/expenses/`, buildPayload('approved'), { headers: getHeaders() })
    toastSuccess('Expense submitted successfully')
    router.push(`${basePath.value}/expenses/all`)
  } catch (e) { console.error(e); toastError(e.message || 'Failed to submit expense') }
  finally { submitting.value = false }
}

const submitAndNew = async () => {
  if (!validateAll()) return
  submitting.value = true
  try {
    await uploadAttachments()
    await axios.post(`${API}/expenses/`, buildPayload('approved'), { headers: getHeaders() })
    toastSuccess('Expense submitted! Starting a new one.')
    Object.assign(form, { title: '', category: '', expense_date: '', project_id: '', description: '', amount: null, expense_type: '', vendor_name: '', vendor_type: '', vendor_contact: '', vendor_tax_id: '', invoice_number: '', notes: '', attachments: [] })
    currentStep.value = 0; maxVisited.value = 0
  } catch (e) { console.error(e); toastError(e.message || 'Failed to submit expense') }
  finally { submitting.value = false }
}

onMounted(async () => {
  try {
    const h = getHeaders()
    const [catRes, typeRes, projRes, taxRes] = await Promise.all([
      axios.get(`${API}/expenses/categories`, { headers: h }),
      axios.get(`${API}/expenses/expense-types`, { headers: h }),
      axios.get(`${API}/projects/`, { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/project-financials/tax-rates`, { headers: h }).catch(() => ({ data: { GST: [0, 5, 12, 18, 28], VAT: [0, 5, 10, 20] } })),
    ])
    categories.value = catRes.data
    expenseTypes.value = typeRes.data
    
    // Filter projects to only those accepted/owned/admin
    const pData = projRes.data
    const allProjects = Array.isArray(pData) ? pData : (pData.items || [])
    projects.value = allProjects.filter(p => 
      ['owner', 'admin', 'accepted'].includes(p.current_user_membership_status)
    )
    
    if (taxRes.data) taxRates.value = taxRes.data
  } catch (e) { console.error('Failed to load options', e) }
})

/* ── Calculator Logic ── */
const calcOpen = ref(false)
const calcExpression = ref('')
const calcResult = ref(0)
const calcMemory = ref(0)
const calcJustEvaluated = ref(false)

const calcDisplayResult = computed(() => {
  const num = calcResult.value
  if (Number.isNaN(num) || !Number.isFinite(num)) return '0'
  return Number(num.toFixed(10)).toLocaleString('en-IN', { maximumFractionDigits: 10 })
})

const evaluateExpression = (expr) => {
  try {
    // Safe eval: only allow numbers and operators
    const sanitized = expr.replace(/[^0-9+\-*/.()%]/g, '')
    if (!sanitized) return 0
    return new Function('return ' + sanitized)()
  } catch { return 0 }
}

const calcAction = (key) => {
  if (key === 'AC') {
    calcExpression.value = ''
    calcResult.value = 0
    calcJustEvaluated.value = false
    return
  }
  if (key === 'backspace') {
    calcExpression.value = calcExpression.value.slice(0, -1)
    calcResult.value = evaluateExpression(calcExpression.value)
    return
  }
  if (key === 'MC') { calcMemory.value = 0; return }
  if (key === 'MR') {
    if (calcJustEvaluated.value || !calcExpression.value) calcExpression.value = String(calcMemory.value)
    else calcExpression.value += String(calcMemory.value)
    calcResult.value = evaluateExpression(calcExpression.value)
    calcJustEvaluated.value = false
    return
  }
  if (key === 'M+') { calcMemory.value += calcResult.value; return }
  if (key === 'M-') { calcMemory.value -= calcResult.value; return }
  if (key === '%') {
    // Smart percentage: "10+5%" → "10+0.5" (5% of 10)
    const expr = calcExpression.value
    const match = expr.match(/^(.+?)([+\-*/])(\d+\.?\d*)$/)
    if (match) {
      const base = evaluateExpression(match[1])
      const pctVal = parseFloat(match[3])
      const computed = base * (pctVal / 100)
      calcExpression.value = match[1] + match[2] + String(computed)
      calcResult.value = evaluateExpression(calcExpression.value)
    } else {
      // No operator — just divide by 100
      calcResult.value = calcResult.value / 100
      calcExpression.value = String(calcResult.value)
    }
    calcJustEvaluated.value = true
    return
  }
  if (key === '=') {
    calcResult.value = evaluateExpression(calcExpression.value)
    calcJustEvaluated.value = true
    return
  }
  // Number or operator
  const isOperator = ['+', '-', '*', '/'].includes(key)
  if (calcJustEvaluated.value && !isOperator) {
    calcExpression.value = key
  } else if (calcJustEvaluated.value && isOperator) {
    calcExpression.value = String(calcResult.value) + key
  } else {
    calcExpression.value += key
  }
  calcJustEvaluated.value = false
  if (!isOperator) calcResult.value = evaluateExpression(calcExpression.value)
}

/* Keyboard support for calculator */
const onCalcKeydown = (e) => {
  if (!calcOpen.value) return
  const key = e.key
  if (/^[0-9]$/.test(key)) { calcAction(key); e.preventDefault() }
  else if (key === '.') { calcAction('.'); e.preventDefault() }
  else if (key === '+') { calcAction('+'); e.preventDefault() }
  else if (key === '-') { calcAction('-'); e.preventDefault() }
  else if (key === '*') { calcAction('*'); e.preventDefault() }
  else if (key === '/') { calcAction('/'); e.preventDefault() }
  else if (key === '%') { calcAction('%'); e.preventDefault() }
  else if (key === 'Enter' || key === '=') { calcAction('='); e.preventDefault() }
  else if (key === 'Backspace') { calcAction('backspace'); e.preventDefault() }
  else if (key === 'Escape') { calcOpen.value = false; e.preventDefault() }
  else if (key === 'Delete') { calcAction('AC'); e.preventDefault() }
}

window.addEventListener('keydown', onCalcKeydown)
onUnmounted(() => window.removeEventListener('keydown', onCalcKeydown))

const applyCalcToAmount = () => {
  const val = Math.round(calcResult.value * 100) / 100
  if (!val || val <= 0) { toastError('Calculator result is empty or zero'); return }
  form.amount = val
  v.amount = false
  calcOpen.value = false
  // If on step 1, check mandatory and inform
  if (currentStep.value === 0) {
    const missingStep1 = !form.title.trim() || !form.category || !form.expense_date || !form.expense_type || !form.description?.trim()
    if (missingStep1) {
      toastSuccess(`₹${val.toLocaleString('en-IN')} saved! Complete Step 1 first, then proceed to Financial.`)
    } else {
      currentStep.value = 1
      if (1 > maxVisited.value) maxVisited.value = 1
      toastSuccess(`₹${val.toLocaleString('en-IN')} applied to Amount — moved to Financial`)
    }
  } else {
    if (currentStep.value !== 1) { currentStep.value = 1 }
    toastSuccess(`₹${val.toLocaleString('en-IN')} applied to Amount`)
  }
}
</script>

<style scoped>
/* ════════════════════════════════════════════
   NEW EXPENSE PAGE — Redesigned
   Warm palette · Glassmorphism · Horizontal stepper
   Matches: Financials Dashboard / PaymentList / CreateMilestoneModal
   ════════════════════════════════════════════ */

.expense-page {
  min-height: 100vh;
  color: #f5f5f7;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 0 40px 40px;
  max-width: 900px;
  margin: 0 auto;
}

/* ─── HEADER ─── */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 0 16px;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.back-btn {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.header-text label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4); font-weight: 600;
}
.header-text h1 {
  font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.02em;
}
.draft-badge {
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4);
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
}

/* ─── HORIZONTAL STEPPER ─── */
.stepper-container {
  margin-bottom: 24px; padding: 24px 0;
}
.stepper-track {
  display: flex; align-items: flex-start; justify-content: space-between;
  position: relative; padding: 0 8px;
}
.progress-line {
  position: absolute; top: 16px; left: 24px; right: 24px; height: 2px;
  background: rgba(255,255,255,0.06); z-index: 0;
  border-radius: 1px;
}
.progress-fill {
  height: 100%; background: #F59E0B; border-radius: 1px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.step-node {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  z-index: 1; cursor: default; opacity: 0.35;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 64px;
}
.step-node.clickable { cursor: pointer; }
.step-node.active, .step-node.completed { opacity: 1; }
.step-node:hover.clickable { opacity: 0.8; }

.node-dot {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.step-node.active .node-dot {
  background: rgba(245, 158, 11, 0.12);
  border-color: #F59E0B;
  color: #F59E0B;
  box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.06);
  animation: pulse-amber 2s ease-in-out infinite;
}
.step-node.completed .node-dot {
  background: #F59E0B; border-color: #F59E0B; color: #000;
}
@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.06); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.03); }
}
.node-label {
  font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.4);
  white-space: nowrap; letter-spacing: 0.01em;
}
.step-node.active .node-label { color: #F59E0B; }
.step-node.completed .node-label { color: rgba(255,255,255,0.7); }

/* ─── FORM CARD ─── */
.form-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  overflow: hidden;
}
.card-header {
  padding: 20px 28px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.card-title-row { display: flex; align-items: center; gap: 12px; }
.card-icon { color: #F59E0B; }
.card-header h2 { font-size: 16px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.card-header p { font-size: 12px; color: rgba(255,255,255,0.4); margin: 2px 0 0; }
.step-badge {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.04); padding: 4px 10px; border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

.card-body { padding: 28px; min-height: 340px; }

/* Step transition */
.step-slide-enter-active { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.step-slide-leave-active { animation: slideOut 0.15s ease-in; }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-12px); } }

/* ─── FORM ELEMENTS ─── */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group.mt-3 { margin-top: 12px; }

label {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: rgba(255,255,255,0.45); margin-left: 2px;
}
.req { color: #F59E0B; }

.text-input, textarea {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 14px;
  color: #f5f5f7; font-size: 13px; font-family: inherit;
  width: 100%; outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.text-input:focus, textarea:focus {
  border-color: #F59E0B; background: rgba(255,255,255,0.06);
}
.text-input.has-error { border-color: #ef4444; }
.text-input.sm { padding: 7px 10px; font-size: 12px; }
.text-input.long { min-height: 180px; line-height: 1.6; resize: vertical; }
.mono { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; letter-spacing: -0.5px; }
.err-msg { font-size: 11px; color: #ef4444; display: flex; align-items: center; gap: 4px; margin-top: 2px; }

.input-with-prefix {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; overflow: hidden;
  transition: border-color 0.2s;
}
.input-with-prefix:focus-within { border-color: #F59E0B; }
.prefix {
  padding: 10px 0 10px 14px; color: rgba(255,255,255,0.4);
  font-size: 13px; font-weight: 600;
}
.input-with-prefix .text-input { border: none; background: transparent; }

.readonly-value {
  padding: 10px 14px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.1);
  color: #FBBF24; font-weight: 600; font-size: 14px;
  font-family: 'SF Mono', monospace;
}
.readonly-value.sm { padding: 7px 10px; font-size: 12px; }
.readonly-value.accent {
  background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.12);
  color: #34d399; font-size: 16px;
}

/* Chip buttons */
.chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  padding: 8px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5); cursor: pointer; text-transform: capitalize;
  display: flex; align-items: center; gap: 6px;
  transition: all 0.2s;
}
.chip:hover { background: rgba(255,255,255,0.06); color: #fff; }
.chip.active {
  background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3);
  color: #FBBF24;
}
.chip.active.low { background: rgba(113,113,122,0.12); border-color: rgba(113,113,122,0.25); color: #a1a1aa; }
.chip.active.medium { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: #FBBF24; }
.chip.active.high { background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.3); color: #fb923c; }
.chip.active.critical { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #f87171; }

/* Switch toggle */
.switch-label {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  font-size: 13px !important; text-transform: none !important;
  font-weight: 500 !important; color: rgba(255,255,255,0.6) !important;
  letter-spacing: 0 !important;
}
.switch-track {
  width: 36px; height: 20px; border-radius: 10px;
  background: rgba(255,255,255,0.1); position: relative;
  transition: background 0.2s; flex-shrink: 0;
}
.switch-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(255,255,255,0.5); transition: all 0.2s;
}
.switch-track.on { background: #F59E0B; }
.switch-track.on .switch-thumb { left: 18px; background: #fff; }

/* ─── ALLOCATION TABLE ─── */
.alloc-table { display: flex; flex-direction: column; gap: 8px; }
.alloc-head, .alloc-row { display: grid; grid-template-columns: 1fr 1fr 80px 110px 32px; gap: 8px; align-items: center; }
.alloc-head span { font-size: 10px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.25); letter-spacing: 0.05em; }
.alloc-summary { font-size: 12px; font-weight: 600; color: #34d399; margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(16,185,129,0.05); }
.alloc-summary.error { color: #ef4444; background: rgba(239,68,68,0.05); }
.add-row-btn {
  display: flex; align-items: center; gap: 6px;
  background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.25);
  color: #FBBF24; padding: 8px 14px; border-radius: 8px; font-size: 12px;
  cursor: pointer; transition: all 0.2s; font-weight: 600;
}
.add-row-btn:hover { background: rgba(245, 158, 11, 0.12); }
.icon-btn {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; background: transparent; color: rgba(255,255,255,0.3); transition: all 0.2s;
}
.icon-btn:hover { background: rgba(239,68,68,0.12); color: #ef4444; }

/* ─── ATTACHMENTS ─── */
.drop-zone {
  border: 2px dashed rgba(255,255,255,0.08); border-radius: 16px;
  padding: 36px; text-align: center; transition: all 0.3s;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  color: rgba(255,255,255,0.4);
}
.drop-zone.active { border-color: #F59E0B; background: rgba(245,158,11,0.03); }
.drop-zone.has-error { border-color: #ef4444; background: rgba(239,68,68,0.03); }
.attachment-mandatory-notice {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 10px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: #f87171; font-size: 12px; font-weight: 600;
  margin-bottom: 12px;
  animation: shakeX 0.4s ease;
}
@keyframes shakeX {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
/* Subtle component animations */
.form-group { animation: fadeUp 0.35s ease both; }
.form-group:nth-child(1) { animation-delay: 0ms; }
.form-group:nth-child(2) { animation-delay: 50ms; }
.form-group:nth-child(3) { animation-delay: 100ms; }
.form-group:nth-child(4) { animation-delay: 150ms; }
.form-group:nth-child(5) { animation-delay: 200ms; }
.form-group:nth-child(6) { animation-delay: 250ms; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.chip { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.chip:hover { transform: translateY(-1px); }
.chip:active { transform: scale(0.97); }
.file-row { animation: slideRight 0.3s ease both; }
@keyframes slideRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
.drop-icon { color: rgba(255,255,255,0.2); }
.drop-title { font-size: 14px; font-weight: 500; margin: 0; }
.drop-or { font-size: 11px; color: rgba(255,255,255,0.2); }
.drop-hint { font-size: 11px; color: rgba(255,255,255,0.2); margin-top: 4px; }
.browse-btn {
  padding: 7px 18px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: rgba(245,158,11,0.1); color: #FBBF24; cursor: pointer;
  border: 1px solid rgba(245,158,11,0.25); transition: all 0.2s;
}
.browse-btn:hover { background: rgba(245,158,11,0.18); }
.file-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.file-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  gap: 12px;
}
.file-meta { display: flex; align-items: center; gap: 8px; color: #e4e4e7; font-size: 13px; flex: 1; min-width: 0; }
.file-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compact-select { width: 120px; flex-shrink: 0; }

/* ─── APPROVAL SECTION ─── */
.approval-section h3 {
  font-size: 16px; font-weight: 600; color: #f5f5f7; margin: 0 0 4px;
  display: flex; align-items: center; gap: 8px;
}
.approval-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 20px; }
.approval-chain { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
.approval-card {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.2s;
}
.approval-card.required { border-color: rgba(245, 158, 11, 0.15); }
.approval-icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.08); color: #FBBF24;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.approval-card.skipped .approval-icon { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.25); }
.approval-text { flex: 1; display: flex; flex-direction: column; }
.approval-role { font-size: 13px; font-weight: 600; color: #e4e4e7; }
.approval-range { font-size: 11px; color: rgba(255,255,255,0.3); }
.approval-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 3px 8px; border-radius: 6px;
}
.approval-card.required .approval-tag { background: rgba(245, 158, 11, 0.1); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.2); }
.approval-card.skipped .approval-tag { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.06); }

/* Summary Preview (step 8) */
.summary-preview {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px; padding: 20px; margin-bottom: 24px;
}
.summary-preview h4 {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: rgba(255,255,255,0.35); margin: 0 0 14px;
}
.summary-grid { display: flex; flex-direction: column; gap: 8px; }
.summary-row {
  display: flex; justify-content: space-between; font-size: 13px;
  color: rgba(255,255,255,0.5);
}
.summary-row span:last-child { color: #e4e4e7; font-weight: 500; text-transform: capitalize; }
.summary-row.total { padding-top: 8px; font-size: 15px; }
.summary-row.total span:last-child { color: #34d399; font-weight: 700; font-size: 16px; }
.summary-row .danger { color: #f87171; }
.summary-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 4px 0; }
.priority-chip {
  display: flex; align-items: center; gap: 5px;
}
.priority-chip.low { color: #a1a1aa; }
.priority-chip.medium { color: #FBBF24; }
.priority-chip.high { color: #fb923c; }
.priority-chip.critical { color: #f87171; }

/* Submit actions (only on step 8) */
.submit-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

/* ─── CARD FOOTER ─── */
.card-footer {
  padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.04);
  display: flex; justify-content: space-between; align-items: center;
}

/* ─── BUTTONS ─── */
.btn-back, .btn-cancel {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.15s;
}
.btn-back:hover, .btn-cancel:hover { background: rgba(255,255,255,0.07); color: #fff; }
.btn-cancel { color: rgba(239,68,68,0.7); border-color: rgba(239,68,68,0.15); }
.btn-cancel:hover { background: rgba(239,68,68,0.08); color: #ef4444; }

.btn-next {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 22px; border-radius: 10px; font-size: 13px; font-weight: 600;
  border: none; background: #F59E0B; color: #000; cursor: pointer;
  transition: all 0.15s;
}
.btn-next:hover { background: #FBBF24; transform: translateY(-1px); }
.btn-next:active { transform: scale(0.98); }

.btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.07); color: #fff; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 22px; border-radius: 10px; font-size: 13px; font-weight: 600;
  border: none; background: #F59E0B; color: #000; cursor: pointer;
  transition: all 0.15s;
}
.btn-primary:hover { background: #FBBF24; transform: translateY(-1px); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
::-webkit-scrollbar-track { background: transparent; }

/* ─── FIELD ERROR LABELS ─── */
.field-error {
  font-size: 11px; color: #ef4444; display: flex; align-items: center; gap: 4px;
  margin-top: 4px; font-weight: 500;
  animation: shake 0.3s ease;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

/* ─── NO BROWSER ARROWS ON NUMBER INPUTS ─── */
.no-arrows { -moz-appearance: textfield; }
.no-arrows::-webkit-outer-spin-button,
.no-arrows::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* ─── CHIP ERROR STATE ─── */
.chip-error .chip { border-color: rgba(239, 68, 68, 0.4); }

/* ─── HAS-ERROR ON PREFIX INPUT ─── */
.input-with-prefix.has-error { border-color: #ef4444; }

/* ─── ALLOCATION STEP REDESIGNED ─── */
.alloc-section { display: flex; flex-direction: column; gap: 20px; }

.alloc-choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.alloc-choice-card {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 18px 20px; border-radius: 14px;
  background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.06);
  cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.alloc-choice-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
.alloc-choice-card.active {
  background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.06);
}

.alloc-choice-icon {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4); transition: all 0.2s;
}
.alloc-choice-card.active .alloc-choice-icon {
  background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2);
  color: #F59E0B;
}

.alloc-choice-text { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.alloc-choice-title { font-size: 14px; font-weight: 600; color: #e4e4e7; }
.alloc-choice-desc { font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.4; }
.alloc-choice-card.active .alloc-choice-title { color: #FBBF24; }

.alloc-choice-check {
  position: absolute; top: 12px; right: 12px;
  width: 24px; height: 24px; border-radius: 50%;
  background: #F59E0B; color: #000; display: flex;
  align-items: center; justify-content: center;
  animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }

/* Full allocation info card */
.alloc-full-info { margin-top: 4px; }
.alloc-full-card {
  display: flex; align-items: center; gap: 16px;
  padding: 20px 24px; border-radius: 14px;
  background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.12);
}
.alloc-full-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(16, 185, 129, 0.1); color: #34d399;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.alloc-full-body { display: flex; flex-direction: column; gap: 2px; }
.alloc-full-label { font-size: 13px; color: rgba(255,255,255,0.5); }
.alloc-full-value {
  font-size: 18px; font-weight: 700; color: #34d399;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Split allocation section */
.alloc-split-section { margin-top: 4px; display: flex; flex-direction: column; gap: 10px; }

.alloc-summary {
  font-size: 12px; font-weight: 600; color: #34d399;
  margin-top: 4px; padding: 10px 14px; border-radius: 10px;
  background: rgba(16,185,129,0.05); display: flex; align-items: center; gap: 6px;
}
.alloc-summary.error { color: #ef4444; background: rgba(239,68,68,0.05); }

/* ─── NOTES SECTION REDESIGN ─── */
.notes-section { display: flex; flex-direction: column; gap: 16px; }

.notes-card {
  border-radius: 14px; overflow: hidden;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
}
.notes-card-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 18px; font-size: 13px; font-weight: 600; color: #e4e4e7;
  background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.04);
}
.notes-card-header svg { color: #F59E0B; }
.notes-textarea {
  width: 100%; border: none; background: transparent; color: #e4e4e7;
  padding: 16px 18px; font-size: 13.5px; line-height: 1.7; resize: vertical;
  font-family: inherit; outline: none; min-height: 180px;
}
.notes-textarea::placeholder { color: rgba(255,255,255,0.2); }

.notes-switch-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-radius: 14px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
}
.notes-switch-left { display: flex; align-items: center; gap: 14px; }
.notes-switch-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.15);
  display: flex; align-items: center; justify-content: center; color: #F59E0B;
}
.notes-switch-text { display: flex; flex-direction: column; gap: 2px; }
.notes-switch-title { font-size: 14px; font-weight: 600; color: #e4e4e7; }
.notes-switch-desc { font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.4; }

/* ─── MODERN TOGGLE SWITCH ─── */
.modern-switch {
  position: relative; width: 48px; height: 26px; flex-shrink: 0;
  border-radius: 13px; border: none; cursor: pointer;
  background: rgba(255,255,255,0.08); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modern-switch.on { background: #F59E0B; }
.modern-switch-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modern-switch.on .modern-switch-thumb { transform: translateX(22px); }

/* ─── FILE SIZE BADGE ─── */
.file-size {
  font-size: 10px; color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* ─── UTILITY ─── */
.text-green { color: #34d399; }

/* ═══════════════════════════════════════════
   FLOATING CALCULATOR WIDGET
   ═══════════════════════════════════════════ */
.calc-widget {
  position: fixed; bottom: 32px; right: 32px; z-index: 200;
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
}

/* FAB Button */
.calc-fab {
  width: 50px; height: 50px; border-radius: 50%;
  background: #F59E0B; color: #1c1917;
  border: 1px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
  animation: calc-levitate 4s ease-in-out infinite;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.calc-fab:hover {
  transform: scale(1.1) rotate(5deg);
  background: #FBBF24;
  animation-play-state: paused;
}
.calc-widget.open .calc-fab {
  background: #27272a; color: white; border-color: rgba(255,255,255,0.1);
  transform: rotate(90deg); animation: none;
}
@keyframes calc-levitate {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* Panel */
.calc-panel {
  width: 280px;
  background: rgba(14, 14, 16, 0.92);
  backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  transform-origin: bottom right;
  margin-bottom: 8px;
}

/* Header */
.calc-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: rgba(245,158,11,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.calc-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #FBBF24;
  display: flex; align-items: center; gap: 6px;
}
.calc-close {
  background: rgba(255,255,255,0.06); border: none; color: rgba(255,255,255,0.5);
  width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.calc-close:hover { background: rgba(255,255,255,0.12); color: white; }

/* Display */
.calc-display {
  padding: 14px 16px 10px;
  text-align: right;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  min-height: 62px;
  display: flex; flex-direction: column; justify-content: flex-end;
}
.calc-expression {
  font-size: 11px; color: rgba(255,255,255,0.35);
  font-family: 'SF Mono', 'Fira Code', monospace;
  min-height: 16px; word-break: break-all;
  margin-bottom: 4px;
}
.calc-result {
  font-size: 26px; font-weight: 700; color: #f5f5f7;
  font-family: 'SF Mono', 'Fira Code', monospace;
  letter-spacing: -0.02em;
  line-height: 1;
}

/* Memory Row */
.calc-memory-row {
  padding: 4px 16px 0;
}
.calc-mem-badge {
  font-size: 9px; font-weight: 600; color: #a78bfa;
  background: rgba(139,92,246,0.1); padding: 2px 6px; border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Button Grid */
.calc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
}
.calc-btn {
  height: 40px; border: none; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex; align-items: center; justify-content: center;
  font-family: 'SF Mono', 'Fira Code', monospace;
}
.calc-btn:active { transform: scale(0.93); }

.calc-btn.num {
  background: rgba(255,255,255,0.06);
  color: #f5f5f7;
}
.calc-btn.num:hover { background: rgba(255,255,255,0.12); }

.calc-btn.fn {
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.55);
  font-size: 12px;
}
.calc-btn.fn:hover { background: rgba(255,255,255,0.08); color: white; }

.calc-btn.op {
  background: rgba(245,158,11,0.12);
  color: #FBBF24;
}
.calc-btn.op:hover { background: rgba(245,158,11,0.22); }

.calc-btn.eq {
  background: #F59E0B;
  color: #1c1917;
}
.calc-btn.eq:hover { background: #FBBF24; }

.calc-btn.zero {
  grid-column: span 2;
}

/* Apply Button */
.calc-apply-btn {
  width: calc(100% - 16px);
  margin: 4px 8px 10px;
  padding: 10px 14px;
  border: 1px solid rgba(245,158,11,0.25);
  background: rgba(245,158,11,0.08);
  color: #FBBF24;
  border-radius: 10px;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.2s;
}
.calc-apply-btn:hover {
  background: rgba(245,158,11,0.16);
  border-color: rgba(245,158,11,0.4);
  transform: translateY(-1px);
}

/* Transitions */
.calc-scale-enter-active, .calc-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.calc-scale-enter-from, .calc-scale-leave-to {
  opacity: 0; transform: translateY(12px) scale(0.9);
}
.rotate-fade-enter-active, .rotate-fade-leave-active { transition: all 0.2s; }
.rotate-fade-enter-from, .rotate-fade-leave-to { opacity: 0; transform: rotate(90deg); }
</style>
