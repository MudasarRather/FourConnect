<template>
  <div ref="pageRoot" class="forge-root">
    <!-- Atmospheric backdrop unique to project pages: blueprint grid + sapphire orbs -->
    <div class="forge-backdrop" aria-hidden="true" data-anim="backdrop">
      <div class="forge-base"></div>
      <svg class="forge-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="bp-grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(245,158,11,0.06)" stroke-width="0.2"/>
          </pattern>
          <pattern id="bp-grid-major" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(245,158,11,0.10)" stroke-width="0.4"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#bp-grid)"/>
        <rect width="100" height="100" fill="url(#bp-grid-major)"/>
      </svg>
      <div class="forge-orb forge-orb-1" data-orb="1"></div>
      <div class="forge-orb forge-orb-2" data-orb="2"></div>
    </div>

    <!-- ORDER NOTICE -->
    <div class="order-notice" data-anim="order-notice">
      <div class="on-seal">
        <Crown :size="18"/>
      </div>
      <div class="on-body">
        <div class="on-eyebrow"><Sparkles :size="10"/> GOVERNMENT ORDER NOTICE</div>
        <div class="on-text">This project is being created against an <strong>officially received government order</strong>. Section&nbsp;1 fields are mandatory before operational stages begin.</div>
      </div>
      <div class="on-decoration">
        <span class="on-corner-1"></span>
        <span class="on-corner-2"></span>
      </div>
    </div>

    <!-- HERO -->
    <header class="forge-hero">
      <div class="hero-left">
        <div class="hero-eyebrow" data-anim="hero-eyebrow"><Hammer :size="11"/> CIVIC FORGE</div>
        <h1 class="hero-title" data-anim="hero-title">Initiate a new <span>government project</span>.</h1>
        <p class="hero-sub" data-anim="hero-subtitle">Five sections. One ceremonial stamp. Your project enters the records hall.</p>
      </div>
      <div class="hero-meta">
        <div class="hero-meta-pill">
          <UserIcon :size="11"/>
          <span><strong>{{ user.full_name || 'User' }}</strong></span>
        </div>
        <div class="hero-meta-pill" v-if="user.organisation">
          <Building :size="11"/>
          <span>{{ user.organisation }}</span>
        </div>
        <div class="hero-meta-pill">
          <CalendarDays :size="11"/>
          <span>{{ createdDate }}</span>
        </div>
      </div>
    </header>

    <!-- BODY: 2-COLUMN -->
    <div class="forge-body">
      <!-- LEFT: form sections -->
      <div class="forge-form custom-scroll">

        <!-- §1 Government Order Details -->
        <section class="section-card" data-anim="section">
          <div class="sc-header">
            <div class="sc-seal">01</div>
            <div>
              <h3>Government Order Details</h3>
              <p>Identifying information from the issuing authority</p>
            </div>
          </div>
          <div class="sc-grid two-col">
            <div class="field">
              <label>Government Order No. <span class="req">*</span></label>
              <input ref="firstFieldRef" v-model.trim="form.government_order_no" type="text" class="civic-input" placeholder="e.g. GO/2024/12345" :class="{ 'has-error': errors.government_order_no }"/>
              <ErrorText :message="errors.government_order_no"/>
            </div>
            <div class="field">
              <label>Order Date <span class="req">*</span></label>
              <DatePicker v-model="form.order_date" :max-date="todayDate" :class="{ 'has-error': errors.order_date }"/>
              <ErrorText :message="errors.order_date"/>
            </div>
            <div class="field">
              <label>Issuing Authority / Ministry <span class="req">*</span></label>
              <input v-model.trim="form.issuing_authority" type="text" class="civic-input" placeholder="e.g. Ministry of Urban Affairs" :class="{ 'has-error': errors.issuing_authority }"/>
              <ErrorText :message="errors.issuing_authority"/>
            </div>
            <div class="field">
              <label>Order Received Date <span class="req">*</span></label>
              <DatePicker v-model="form.order_received_date" :max-date="todayDate" :class="{ 'has-error': errors.order_received_date }"/>
              <ErrorText :message="errors.order_received_date"/>
            </div>
          </div>
        </section>

        <!-- §2 Project Information -->
        <section class="section-card" data-anim="section">
          <div class="sc-header">
            <div class="sc-seal">02</div>
            <div>
              <h3>Project Information</h3>
              <p>Core identifiers and classification</p>
            </div>
          </div>
          <div class="sc-grid two-col">
            <div class="field">
              <label>Project Name <span class="req">*</span></label>
              <input v-model.trim="form.name" type="text" class="civic-input" placeholder="e.g. Smart Streetlights Phase II" :class="{ 'has-error': errors.name }"/>
              <ErrorText :message="errors.name"/>
            </div>
            <div class="field">
              <label>Project Code <span class="req">*</span></label>
              <div class="code-row">
                <input v-model.trim="form.code" type="text" class="civic-input mono" placeholder="PRJ-YYYYMM-XXXX" :class="{ 'has-error': errors.code }"/>
                <button type="button" class="suggest-btn" @click="suggestCode" :disabled="isSuggesting">
                  <Wand2 :size="12"/>
                  <span>{{ isSuggesting ? '…' : 'Suggest' }}</span>
                </button>
              </div>
              <ErrorText :message="errors.code"/>
            </div>
            <div class="field">
              <label>Department / Executing Agency <span class="req">*</span></label>
              <input v-model.trim="form.department" type="text" class="civic-input" placeholder="e.g. Smart City Mission" :class="{ 'has-error': errors.department }"/>
              <ErrorText :message="errors.department"/>
            </div>
            <div class="field">
              <label>Project Category <span class="req">*</span></label>
              <CustomSelect v-model="form.category" :options="categoryOptions" labelKey="label" valueKey="value" placeholder="Choose category…"/>
              <ErrorText :message="errors.category"/>
            </div>
            <div class="field">
              <label>Priority <span class="req">*</span></label>
              <CustomSelect v-model="form.priority" :options="priorityOptions" labelKey="label" valueKey="value" placeholder="Choose priority…"/>
              <ErrorText :message="errors.priority"/>
            </div>
            <div class="field">
              <label>Project Type <span class="req">*</span></label>
              <CustomSelect v-model="form.project_type" :options="projectTypeOptions" labelKey="label" valueKey="value" placeholder="Choose type…"/>
              <ErrorText :message="errors.project_type"/>
            </div>
            <div class="field full">
              <label>Project Description</label>
              <textarea v-model.trim="form.description" rows="3" class="civic-input" placeholder="Brief description of scope, objectives, expected outcomes…"></textarea>
            </div>
          </div>
        </section>

        <!-- §3 Location & Timeline -->
        <section class="section-card" data-anim="section">
          <div class="sc-header">
            <div class="sc-seal">03</div>
            <div>
              <h3>Location & Timeline</h3>
              <p>Geographic scope and execution window</p>
            </div>
          </div>
          <div class="sc-grid two-col">
            <div class="field">
              <label>State / Province <span class="req">*</span></label>
              <input v-model.trim="form.state" type="text" class="civic-input" placeholder="e.g. Karnataka" :class="{ 'has-error': errors.state }"/>
              <ErrorText :message="errors.state"/>
            </div>
            <div class="field">
              <label>District / City</label>
              <input v-model.trim="form.district" type="text" class="civic-input" placeholder="e.g. Bengaluru"/>
            </div>
            <div class="field">
              <label>Expected Start Date <span class="req">*</span></label>
              <DatePicker v-model="form.start_date" :class="{ 'has-error': errors.start_date }"/>
              <ErrorText :message="errors.start_date"/>
            </div>
            <div class="field">
              <label>Deadline / Completion Date <span class="req">*</span></label>
              <DatePicker v-model="form.end_date" :min-date="form.start_date || todayDate" :class="{ 'has-error': errors.end_date }"/>
              <ErrorText :message="errors.end_date"/>
            </div>
          </div>
          <div class="duration-strip" v-if="projectDuration">
            <Clock :size="12"/> <span>Duration: <strong>{{ projectDuration }}</strong></span>
          </div>
        </section>

        <!-- §4 Budget -->
        <section class="section-card" data-anim="section">
          <div class="sc-header">
            <div class="sc-seal">04</div>
            <div>
              <h3>Budget</h3>
              <p>Order value and funding source</p>
            </div>
          </div>
          <div class="sc-grid three-col">
            <div class="field">
              <label>Order Value <span class="req">*</span></label>
              <CurrencyInput v-model="form.budget_amount" :currency="form.currency" :class="{ 'has-error': errors.budget_amount }"/>
              <ErrorText :message="errors.budget_amount"/>
            </div>
            <div class="field">
              <label>Currency</label>
              <CustomSelect v-model="form.currency" :options="currencyOptions" labelKey="label" valueKey="value"/>
            </div>
            <div class="field">
              <label>Funding Type</label>
              <CustomSelect v-model="form.funding_type" :options="fundingTypeOptions" labelKey="label" valueKey="value" placeholder="Choose funding source…"/>
            </div>
          </div>
        </section>

        <!-- §5 Team & Responsibility -->
        <section class="section-card" data-anim="section">
          <div class="sc-header">
            <div class="sc-seal">05</div>
            <div>
              <h3>Team & Responsibility</h3>
              <p>Project leadership and stakeholders</p>
            </div>
          </div>
          <div class="sc-grid two-col">
            <div class="field">
              <label>Project Head Name <span class="req">*</span></label>
              <input v-model.trim="form.project_head_name" type="text" class="civic-input" placeholder="Full name" :class="{ 'has-error': errors.project_head_name }"/>
              <ErrorText :message="errors.project_head_name"/>
            </div>
            <div class="field">
              <label>Project Head Designation <span class="req">*</span></label>
              <input v-model.trim="form.project_head_designation" type="text" class="civic-input" placeholder="e.g. Director, Smart City" :class="{ 'has-error': errors.project_head_designation }"/>
              <ErrorText :message="errors.project_head_designation"/>
            </div>
            <div class="field full">
              <label>Project Head Contact</label>
              <input v-model.trim="form.project_head_contact" type="text" class="civic-input" placeholder="phone or email"/>
            </div>
            <div class="field">
              <label>Nodal Officer</label>
              <input v-model.trim="form.nodal_officer" type="text" class="civic-input" placeholder="Liaison officer"/>
            </div>
            <div class="field">
              <label>Contractor / Agency Assigned</label>
              <input v-model.trim="form.contractor" type="text" class="civic-input" placeholder="Vendor / executing agency"/>
            </div>
            <div class="field full">
              <label>Initial Project Status</label>
              <CustomSelect v-model="form.lifecycle_status" :options="lifecycleOptions" labelKey="label" valueKey="value"/>
            </div>
          </div>
        </section>

        <!-- §6 Project Order PDF (REQUIRED) -->
        <section class="section-card" :class="{ 'has-error-glow': errors.project_order_path }" data-anim="section">
          <div class="sc-header">
            <div class="sc-seal">06</div>
            <div>
              <h3>Order Document <span class="req">*</span></h3>
              <p>Upload the official government order PDF (mandatory)</p>
            </div>
          </div>
          <FileUpload
            :model-value="uploadedFileName"
            accept="application/pdf"
            :max-size-mb="5"
            @file-selected="handleFileUpload"
            @file-removed="handleFileRemove"
          />
          <ErrorText :message="errors.project_order_path || errors.project_order"/>
        </section>

        <!-- ACTION BAR -->
        <div class="forge-actions cascade-right" style="animation-delay: 0.46s">
          <button type="button" class="btn-ghost" @click="onCancel">
            <X :size="14"/> Cancel
          </button>
          <button type="button" class="btn-draft" @click="onSubmit('draft')" :disabled="isSubmitting">
            <FileEdit :size="14"/> Save as Draft
          </button>
          <button
            type="button"
            class="btn-stamp"
            :class="{ stamping: stampAnim }"
            @click="onSubmit('create')"
            :disabled="isSubmitting"
          >
            <Loader2 v-if="isSubmitting" class="spin" :size="14"/>
            <Stamp v-else :size="14"/>
            <span>{{ isSubmitting ? 'Stamping…' : 'Create Project' }}</span>
            <span class="stamp-flash" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <!-- RIGHT: live preview rail -->
      <aside class="forge-preview">
        <div class="preview-sticky">
          <div class="prv-eyebrow"><Eye :size="10"/> LIVE PREVIEW</div>
          <h4 class="prv-headline">As recorded in the registry</h4>
          <div class="prv-card" data-anim="preview-card" ref="previewCardRef">
            <div class="prv-card-top">
              <div class="prv-cat-chip" :class="`cat-${(form.category || 'other').toLowerCase().replace(/[^a-z]/g, '')}`">{{ form.category || 'Uncategorized' }}</div>
              <div class="prv-prio" :class="`prio-${(form.priority || 'low').toLowerCase()}`" :title="`Priority: ${form.priority || '—'}`">
                <span class="prio-dot"></span>
                {{ form.priority || '—' }}
              </div>
            </div>
            <div class="prv-title">{{ form.name || 'Project name will appear here' }}</div>
            <div class="prv-sub">{{ form.department || 'Executing agency' }} · {{ form.state || 'State' }}</div>
            <div class="prv-sep"></div>
            <div class="prv-budget">
              <span class="prv-cur">{{ form.currency || 'USD' }}</span>
              <span class="prv-amt">{{ formatAmount(form.budget_amount) }}</span>
            </div>
            <div class="prv-foot">
              <span class="prv-code">{{ form.code || 'PRJ-XXXX-XXXX' }}</span>
              <span class="prv-stage">{{ form.lifecycle_status || 'Order Received' }}</span>
            </div>
          </div>

          <!-- Stage track -->
          <div class="prv-stages">
            <div class="prv-stages-eyebrow">LIFECYCLE</div>
            <div class="prv-stages-track">
              <div
                v-for="(s, i) in lifecycleStages"
                :key="s"
                class="prv-stage-pill"
                :class="{ active: form.lifecycle_status === s, past: stageIndex > i }"
              >
                <span class="ps-dot"></span>
                <span>{{ s }}</span>
              </div>
            </div>
          </div>

          <!-- Head -->
          <div class="prv-head" v-if="form.project_head_name">
            <div class="prv-head-eyebrow">PROJECT HEAD</div>
            <div class="prv-head-card">
              <div class="prv-head-avatar">{{ getInitials(form.project_head_name) }}</div>
              <div class="prv-head-info">
                <div class="prv-head-name">{{ form.project_head_name }}</div>
                <div class="prv-head-role">{{ form.project_head_designation || 'Designation' }}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import CustomSelect from '../components/ui/CustomSelect.vue'
import ErrorText from '../components/ui/ErrorText.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import CurrencyInput from '../components/ui/CurrencyInput.vue'
import FileUpload from '../components/ui/FileUpload.vue'
import {
  Crown, Sparkles, Hammer, User as UserIcon, Building, CalendarDays, Clock,
  Wand2, X, FileEdit, Stamp, Loader2, Eye
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useGsapAnim } from '../composables/useGsapAnim'
import { useParallaxOrbs } from '../composables/useParallaxOrbs'
import { createProjectEntry, pulseScale, focusGlow, blurGlow, errorShake } from '../animations/pageChoreography'

const pageRoot = ref(null)
const previewCardRef = ref(null)

const router = useRouter()
const route = useRoute()
const toast = useToast()
const API_BASE = 'http://localhost:8000'
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const getToken = () => isAdminRoute.value
  ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token'))
  : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))
const portal = computed(() => isAdminRoute.value ? 'admin' : 'user')

// User / draft state
const user = ref({})
const isSubmitting = ref(false)
const isSuggesting = ref(false)
const uploadedFileName = ref('')
const stampAnim = ref(false)
const firstFieldRef = ref(null)

// Form (binds DB column names verbatim — keeps backend contract clean)
const form = reactive({
  // §1 Government Order
  government_order_no: '',
  order_date: '',
  issuing_authority: '',
  order_received_date: '',
  // §2 Project Information
  name: '',
  code: '',
  department: '',
  category: '',
  priority: 'Medium',
  project_type: 'Other',
  description: '',
  // §3 Location & Timeline
  state: '',
  district: '',
  start_date: '',
  end_date: '',
  // §4 Budget
  budget_amount: '',
  currency: 'INR',
  funding_type: '',
  // §5 Team
  project_head_name: '',
  project_head_designation: '',
  project_head_contact: '',
  nodal_officer: '',
  contractor: '',
  lifecycle_status: 'Order Received',
  // §6 Order PDF
  project_order_path: '',
})

const errors = ref({})

// Dropdown options
const categoryOptions = [
  { value: 'Infrastructure',            label: 'Infrastructure' },
  { value: 'Roads & Bridges',           label: 'Roads & Bridges' },
  { value: 'Water & Sanitation',        label: 'Water & Sanitation' },
  { value: 'Buildings & Construction',  label: 'Buildings & Construction' },
  { value: 'IT & Digital',              label: 'IT & Digital' },
  { value: 'Social Welfare',            label: 'Social Welfare' },
  { value: 'Defence',                   label: 'Defence' },
  { value: 'Energy',                    label: 'Energy' },
  { value: 'Other',                     label: 'Other' },
]
const priorityOptions = [
  { value: 'High',   label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low',    label: 'Low' },
]
const projectTypeOptions = [
  { value: 'Government', label: 'Government' },
  { value: 'Civic',      label: 'Civic' },
  { value: 'Infra',      label: 'Infrastructure' },
  { value: 'Service',    label: 'Service' },
  { value: 'Other',      label: 'Other' },
]
const currencyOptions = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
]
const fundingTypeOptions = [
  { value: 'Central Govt.',    label: 'Central Govt.' },
  { value: 'State Govt.',      label: 'State Govt.' },
  { value: 'Central + State',  label: 'Central + State' },
  { value: 'External Aid',     label: 'External Aid' },
  { value: 'PPP',              label: 'PPP (Public-Private Partnership)' },
]
const lifecycleOptions = [
  { value: 'Order Received', label: 'Order Received' },
  { value: 'Planning',       label: 'Planning' },
  { value: 'Tendering',      label: 'Tendering' },
  { value: 'In Progress',    label: 'In Progress' },
]
const lifecycleStages = ['Order Received', 'Planning', 'Tendering', 'In Progress', 'Active', 'Completed']

// Derived helpers
const todayDate = computed(() => new Date().toISOString().split('T')[0])
const createdDate = computed(() =>
  new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
)
const projectDuration = computed(() => {
  if (!form.start_date || !form.end_date) return null
  const start = new Date(form.start_date); const end = new Date(form.end_date)
  const days = Math.ceil(Math.abs(end - start) / 86400000)
  if (days < 30) return `${days} days`
  if (days < 365) {
    const m = Math.floor(days / 30); const d = days % 30
    return d ? `${m} months, ${d} days` : `${m} months`
  }
  const y = Math.floor(days / 365); const m = Math.floor((days % 365) / 30)
  return m ? `${y} years, ${m} months` : `${y} years`
})
const stageIndex = computed(() => lifecycleStages.indexOf(form.lifecycle_status))
const getInitials = (n) => (n || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const formatAmount = (n) => {
  const v = Number(n)
  if (!v) return '—'
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L'
  if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'
  return v.toLocaleString()
}

// ---- Suggest code ----
const suggestCode = async () => {
  isSuggesting.value = true
  try {
    const res = await axios.get(`${API_BASE}/api/projects/suggest-code`, { headers: { Authorization: `Bearer ${getToken()}` } })
    form.code = res.data.code
    if (errors.value.code) delete errors.value.code
  } catch (e) {
    toast.error('Could not suggest a code — please type one.')
  } finally { isSuggesting.value = false }
}

// ---- File upload (same flow as legacy form) ----
const handleFileUpload = async (file) => {
  if (!file) return
  try {
    if (form.project_order_path) {
      const oldFilename = form.project_order_path.split('/').pop()
      if (oldFilename) {
        try { await axios.delete(`${API_BASE}/api/uploads/project-order/${oldFilename}`, { headers: { Authorization: `Bearer ${getToken()}` } }) } catch {}
      }
    }
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(`${API_BASE}/api/uploads/project-order`, fd, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${getToken()}` }
    })
    if (res.data?.success) {
      form.project_order_path = res.data.file_path
      uploadedFileName.value = res.data.original_filename
      if (errors.value.project_order) delete errors.value.project_order
      toast.success('Order document uploaded')
    }
  } catch (e) {
    errors.value.project_order = e.response?.data?.detail || 'Upload failed'
    toast.error(errors.value.project_order)
  }
}
const handleFileRemove = async () => {
  if (form.project_order_path) {
    const fn = form.project_order_path.split('/').pop()
    try { await axios.delete(`${API_BASE}/api/uploads/project-order/${fn}`, { headers: { Authorization: `Bearer ${getToken()}` } }) } catch {}
  }
  form.project_order_path = ''
  uploadedFileName.value = ''
}

// ---- Validation ----
// Required fields for the *full* Create flow. Draft path validates a subset.
const REQUIRED_CREATE = [
  ['government_order_no',      'Government Order No. is required'],
  ['order_date',                'Order Date is required'],
  ['issuing_authority',         'Issuing Authority is required'],
  ['order_received_date',       'Order Received Date is required'],
  ['name',                      'Project Name is required'],
  ['code',                      'Project Code is required'],
  ['department',                'Department is required'],
  ['category',                  'Category is required'],
  ['priority',                  'Priority is required'],
  ['project_type',              'Project Type is required'],
  ['state',                     'State is required'],
  ['start_date',                'Start Date is required'],
  ['end_date',                  'Deadline is required'],
  ['budget_amount',             'Order Value is required'],
  ['project_head_name',         'Project Head Name is required'],
  ['project_head_designation',  'Project Head Designation is required'],
  ['project_order_path',        'Order Document (PDF) is required'],
]
const REQUIRED_DRAFT = [
  ['government_order_no',  'Government Order No. is required'],
  ['issuing_authority',    'Issuing Authority is required'],
  ['name',                 'Project Name is required'],
  ['code',                 'Project Code is required'],
  ['project_order_path',   'Order Document (PDF) is required'],
]

const validate = (mode) => {
  const list = mode === 'draft' ? REQUIRED_DRAFT : REQUIRED_CREATE
  const next = {}
  for (const [field, msg] of list) {
    const v = form[field]
    if (v === '' || v == null || v === undefined) next[field] = msg
  }
  if (mode === 'create' && form.budget_amount && Number(form.budget_amount) <= 0) {
    next.budget_amount = 'Amount must be greater than 0'
  }
  if (form.end_date && form.start_date && new Date(form.end_date) < new Date(form.start_date)) {
    next.end_date = 'Deadline must be after start date'
  }
  errors.value = next
  return Object.keys(next).length === 0
}

const scrollToFirstError = async () => {
  await nextTick()
  const el = document.querySelector('.has-error') || document.querySelector('.civic-input.has-error')
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ---- Submit ----
const buildPayload = () => {
  const today = new Date().toISOString()
  // Backend ProjectBase still treats name/description/project_type/cost_center/start_date/end_date/budget_amount/budget_type as required.
  // For drafts we ship safe defaults so the API doesn't 422 — the user can refine later.
  return {
    name:          form.name || `Draft — ${form.government_order_no || 'untitled'}`,
    description:   form.description || ' ',
    project_type:  form.project_type || 'Other',
    start_date:    form.start_date || today,
    end_date:      form.end_date   || today,
    budget_amount: Number(form.budget_amount || 0),
    currency:      form.currency || 'INR',
    code:          form.code,
    project_order_path: form.project_order_path || null,
    // Government fields
    government_order_no:  form.government_order_no || null,
    order_date:           form.order_date || null,
    issuing_authority:    form.issuing_authority || null,
    order_received_date:  form.order_received_date || null,
    department:           form.department || null,
    category:             form.category || null,
    priority:             form.priority || null,
    state:                form.state || null,
    district:             form.district || null,
    funding_type:         form.funding_type || null,
    project_head_name:        form.project_head_name || null,
    project_head_designation: form.project_head_designation || null,
    project_head_contact:     form.project_head_contact || null,
    nodal_officer:            form.nodal_officer || null,
    contractor:               form.contractor || null,
    lifecycle_status:         form.lifecycle_status || 'Order Received',
  }
}

const onSubmit = async (mode) => {
  if (!validate(mode)) {
    toast.error('Please fix the highlighted fields')
    scrollToFirstError()
    return
  }
  isSubmitting.value = true
  stampAnim.value = mode === 'create'
  setTimeout(() => (stampAnim.value = false), 800)
  try {
    const payload = buildPayload()
    if (mode === 'draft') payload.status = 'Draft'
    const res = await axios.post(`${API_BASE}/api/projects/`, payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
    })
    toast.success(mode === 'draft' ? 'Draft saved' : 'Project created — entered the records hall.')
    // Navigate to the new project's details
    router.push(`/${portal.value}/projects/projectdetails/${res.data.id}`)
  } catch (e) {
    const msg = e.response?.data?.detail || 'Failed to create project'
    toast.error(typeof msg === 'string' ? msg : 'Failed to create project')
    if (typeof msg === 'string' && /code/i.test(msg)) errors.value.code = msg
  } finally { isSubmitting.value = false }
}

const onCancel = () => router.push(`/${portal.value}/projects/allprojects`)

// ---- Init ----
const fetchUser = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
    user.value = res.data
  } catch { /* silent */ }
}

// GSAP animation wiring
const { run } = useGsapAnim(pageRoot)
useParallaxOrbs(pageRoot, { strength: 28 })
run(() => { createProjectEntry(pageRoot.value) })

// Reactive preview pulse — debounced + cooled-down to avoid spam-tweens
let _previewCooldown = 0
let _previewDebounce = null
const triggerPreviewPulse = () => {
  if (!previewCardRef.value) return
  const now = Date.now()
  if (now - _previewCooldown < 200) return
  _previewCooldown = now
  pulseScale(previewCardRef.value, { scale: 1.015, duration: 0.18 })
}
watch(
  () => [form.name, form.code, form.category, form.priority, form.budget_amount, form.lifecycle_status],
  () => {
    if (_previewDebounce) clearTimeout(_previewDebounce)
    _previewDebounce = setTimeout(triggerPreviewPulse, 80)
  },
  { deep: false }
)

// Form field focus/blur glow (delegated, single listener)
const handleFieldFocus = (e) => {
  const el = e.target
  if (el.matches && el.matches('.civic-input')) focusGlow(el)
}
const handleFieldBlur = (e) => {
  const el = e.target
  if (el.matches && el.matches('.civic-input')) blurGlow(el)
}

// Error shake on first error appearance
const _previousErrors = {}
watch(() => ({ ...(errors.value || {}) }), (val) => {
  Object.keys(val || {}).forEach((k) => {
    if (val[k] && !_previousErrors[k]) {
      const inputEl = pageRoot.value?.querySelector(`.has-error`)
      if (inputEl) errorShake(inputEl)
    }
    _previousErrors[k] = val[k]
  })
}, { deep: false })

onMounted(async () => {
  pageRoot.value?.addEventListener('focusin', handleFieldFocus)
  pageRoot.value?.addEventListener('focusout', handleFieldBlur)
  await fetchUser()
  await suggestCode()  // pre-fill code on mount for convenience
  await nextTick()
  firstFieldRef.value?.focus?.()
})
</script>

<style scoped>
/* ============================================================
   CIVIC FORGE — Create Project page
   Palette tokens (sapphire/cyan accent, amber kept for required-field marker):
     --civic-primary:        #f59e0b   sapphire
     --civic-primary-dark:   #d97706
     --civic-secondary:      #f97316   cyan
     --civic-gradient:       linear-gradient(135deg, #f59e0b 0%, #f97316 100%)
     --required-mark:        #fbbf24   amber (kept from family)
   ============================================================ */
.forge-root {
  position: relative;
  min-height: calc(100vh - 52px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 28px 28px 80px;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Outfit", sans-serif;
}

/* ----- BACKDROP ----- */
.forge-backdrop { position: fixed; inset: 52px 0 0 0; pointer-events: none; z-index: -1; overflow: hidden; }
.forge-base { position: absolute; inset: 0; background: radial-gradient(ellipse at top left, #061018 0%, #04070b 50%, #02030a 100%); }
.forge-grid { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; mix-blend-mode: screen; }
.forge-orb { position: absolute; border-radius: 50%; filter: blur(90px); will-change: transform; transform: translate(var(--orb-parallax-x, 0px), var(--orb-parallax-y, 0px)); }
.forge-orb-1 { width: 520px; height: 520px; top: -160px; right: -120px; background: radial-gradient(circle, rgba(245, 158, 11, 0.16), transparent 70%); }
.forge-orb-2 { width: 380px; height: 380px; bottom: -100px; left: -80px; background: radial-gradient(circle, rgba(249, 115, 22, 0.12), transparent 70%); }
@keyframes orb-drift-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-30px, 30px) scale(1.06); }
}
@keyframes orb-drift-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(40px, -25px) scale(1.05); }
}

/* ----- ORDER NOTICE BANNER ----- */
.order-notice {
  position: relative; display: flex; align-items: center; gap: 16px;
  padding: 16px 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.10) 0%, rgba(245, 158, 11, 0.05) 100%);
  border: 1px solid rgba(251, 191, 36, 0.30);
  overflow: hidden;
  margin-bottom: 24px;
}
.on-seal {
  flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #1a1208;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35), 0 0 0 4px rgba(251, 191, 36, 0.08);
}
.on-body { flex: 1; min-width: 0; }
.on-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: #fbbf24; margin-bottom: 4px; }
.on-text { font-size: 13px; color: rgba(255, 255, 255, 0.78); line-height: 1.5; }
.on-text strong { color: #fbbf24; }
.on-decoration { position: absolute; inset: 0; pointer-events: none; }
.on-corner-1, .on-corner-2 {
  position: absolute; width: 80px; height: 80px;
  border-radius: 50%; filter: blur(50px);
}
.on-corner-1 { top: -40px; right: 80px; background: rgba(251, 191, 36, 0.20); }
.on-corner-2 { bottom: -40px; right: -20px; background: rgba(245, 158, 11, 0.15); }

/* ----- HERO ----- */
.forge-hero {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 32px;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 28px;
}
.hero-left { flex: 1; min-width: 0; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em;
  color: #f97316;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.20);
  margin-bottom: 14px;
}
.hero-title {
  font-family: 'Outfit', sans-serif;
  font-size: 44px; font-weight: 700; line-height: 1.05; margin: 0 0 8px;
  letter-spacing: -0.022em;
  color: #fff;
}
.hero-title span {
  background: linear-gradient(120deg, #f59e0b 0%, #f97316 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 13px; color: rgba(255, 255, 255, 0.50); margin: 0; max-width: 500px; }
.hero-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.hero-meta-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 11px; color: rgba(255, 255, 255, 0.70);
}
.hero-meta-pill svg { color: #f97316; }
.hero-meta-pill strong { color: #fff; font-weight: 600; }

/* ----- BODY ----- */
.forge-body {
  display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: flex-start;
}
.forge-form { display: flex; flex-direction: column; gap: 18px; min-width: 0; }

/* ----- SECTION CARD ----- */
.section-card {
  position: relative;
  padding: 24px 26px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.005) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  overflow: hidden;
}
.section-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, #f59e0b 0%, #f97316 100%);
  border-radius: 18px 0 0 18px;
  opacity: 0.55;
  transition: opacity 0.3s ease;
}
.section-card:hover::before { opacity: 0.95; }

.sc-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.sc-seal {
  font-family: 'Outfit', sans-serif;
  font-size: 14px; font-weight: 700; letter-spacing: 0.08em;
  padding: 6px 12px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(249, 115, 22, 0.10));
  color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.25);
}
.sc-header h3 { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #fff; margin: 0; letter-spacing: -0.01em; }
.sc-header p { font-size: 11px; color: rgba(255, 255, 255, 0.40); margin: 2px 0 0; }

.sc-grid { display: grid; gap: 16px; }
.sc-grid.two-col { grid-template-columns: 1fr 1fr; }
.sc-grid.three-col { grid-template-columns: 1fr 1fr 1fr; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field.full { grid-column: 1 / -1; }
.field label { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; }
.req { color: #fbbf24; font-weight: 800; }

.civic-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.30); border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 11px; padding: 11px 14px; color: #fff; font-size: 13px;
  transition: all 0.25s ease;
  font-family: inherit;
}
.civic-input::placeholder { color: rgba(255, 255, 255, 0.28); }
.civic-input:focus {
  outline: none; border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.04);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.10);
}
.civic-input.mono { font-family: 'SF Mono', ui-monospace, monospace; letter-spacing: 0.02em; }
.civic-input.has-error,
.has-error :deep(.input-wrap),
.has-error :deep(.dp-input) {
  border-color: rgba(239, 68, 68, 0.45) !important;
  background: rgba(239, 68, 68, 0.04) !important;
  animation: amber-pulse 1.2s ease-out 1;
}
@keyframes amber-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55); }
  100% { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
}
textarea.civic-input { resize: vertical; min-height: 70px; line-height: 1.5; }

.code-row { display: flex; gap: 6px; }
.code-row .civic-input { flex: 1; }
.suggest-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0 14px; border-radius: 11px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(249, 115, 22, 0.10));
  border: 1px solid rgba(245, 158, 11, 0.30);
  color: #fde68a; font-size: 11px; font-weight: 600;
  cursor: pointer; flex-shrink: 0;
  transition: all 0.2s ease;
}
.suggest-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(249, 115, 22, 0.16));
  color: #fff; transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.20);
}
.suggest-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.suggest-btn svg { color: #f97316; }

.duration-strip {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 16px;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.18);
  font-size: 11px; color: rgba(255, 255, 255, 0.70);
}
.duration-strip strong { color: #fbbf24; font-weight: 700; }

/* ----- ACTION BAR ----- */
.forge-actions {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 18px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 6px;
}
.btn-ghost, .btn-draft, .btn-stamp {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 18px; border-radius: 12px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
}
.btn-ghost:hover { background: rgba(255, 255, 255, 0.04); color: #fff; border-color: rgba(255, 255, 255, 0.18); }
.btn-draft {
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}
.btn-draft:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(251, 191, 36, 0.40);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(251, 191, 36, 0.15);
}
.btn-stamp {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #fff; border: none;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.30);
}
.btn-stamp:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(245, 158, 11, 0.42);
}
.btn-stamp:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-stamp.stamping {
  animation: civic-stamp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.btn-stamp .stamp-flash {
  position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.40), transparent 60%);
}
.btn-stamp.stamping .stamp-flash { animation: stamp-flash 0.7s ease-out; }
@keyframes civic-stamp {
  0%   { transform: rotate(0deg) scale(1); }
  30%  { transform: rotate(-3deg) scale(0.96); }
  60%  { transform: rotate(4deg) scale(1.04); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes stamp-flash {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0; }
}

/* ----- LIVE PREVIEW RAIL ----- */
.forge-preview { position: relative; }
.preview-sticky {
  position: sticky; top: 76px;
  display: flex; flex-direction: column; gap: 18px;
}
.prv-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: #f97316; }
.prv-headline { font-family: 'Outfit', sans-serif; font-size: 13px; color: rgba(255, 255, 255, 0.55); font-weight: 500; margin: 4px 0 0; }
.prv-card {
  position: relative;
  padding: 18px 20px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(255, 255, 255, 0.02) 60%),
    rgba(8, 10, 14, 0.65);
  border: 1px solid rgba(245, 158, 11, 0.20);
  backdrop-filter: blur(24px);
  overflow: hidden;
  transition: all 0.3s ease;
}
.prv-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; }
.prv-cat-chip {
  font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.25);
  letter-spacing: 0.04em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;
}
.prv-prio {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.80);
}
.prio-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, 0.50); }
.prv-prio.prio-high   { background: rgba(239, 68, 68, 0.08);  border-color: rgba(239, 68, 68, 0.30);  color: #fda4af; }
.prv-prio.prio-high .prio-dot   { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.7); animation: hi-pulse 2.4s ease-in-out infinite; }
.prv-prio.prio-medium { background: rgba(251, 191, 36, 0.08); border-color: rgba(251, 191, 36, 0.30); color: #fde68a; }
.prv-prio.prio-medium .prio-dot { background: #fbbf24; }
.prv-prio.prio-low    { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.30); color: #6ee7b7; }
.prv-prio.prio-low .prio-dot    { background: #10b981; }
@keyframes hi-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.7); transform: scale(1); }
  50%      { box-shadow: 0 0 14px rgba(239, 68, 68, 1); transform: scale(1.18); }
}

.prv-title {
  font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #fff;
  line-height: 1.3; margin: 0 0 4px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.prv-sub { font-size: 11px; color: rgba(255, 255, 255, 0.45); }
.prv-sep { height: 1px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.10), transparent); margin: 12px 0; }
.prv-budget { display: flex; align-items: baseline; gap: 6px; }
.prv-cur { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.40); }
.prv-amt { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; color: #fff;
  background: linear-gradient(180deg, #fff, #fde68a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.prv-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.06); font-size: 10px; }
.prv-code { font-family: 'SF Mono', monospace; color: rgba(255, 255, 255, 0.45); }
.prv-stage { color: #fbbf24; font-weight: 600; letter-spacing: 0.04em; }

/* Stage track */
.prv-stages { display: flex; flex-direction: column; gap: 6px; }
.prv-stages-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: rgba(255, 255, 255, 0.40); }
.prv-stages-track { display: flex; flex-direction: column; gap: 4px; }
.prv-stage-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 11px; color: rgba(255, 255, 255, 0.40);
  transition: all 0.25s ease;
}
.prv-stage-pill .ps-dot {
  flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.20);
  transition: all 0.25s ease;
}
.prv-stage-pill.active {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.14), rgba(249, 115, 22, 0.06));
  border-color: rgba(245, 158, 11, 0.35);
  color: #fff;
}
.prv-stage-pill.active .ps-dot { background: linear-gradient(135deg, #f59e0b, #f97316); box-shadow: 0 0 10px rgba(245, 158, 11, 0.55); }
.prv-stage-pill.past .ps-dot { background: rgba(34, 211, 238, 0.5); }
.prv-stage-pill.past { color: rgba(255, 255, 255, 0.60); }

/* Project head card in preview */
.prv-head { display: flex; flex-direction: column; gap: 6px; }
.prv-head-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: rgba(255, 255, 255, 0.40); }
.prv-head-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.05);
}
.prv-head-avatar {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 11px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.30);
}
.prv-head-name { font-size: 13px; font-weight: 600; color: #fff; line-height: 1.2; }
.prv-head-role { font-size: 11px; color: rgba(255, 255, 255, 0.45); margin-top: 1px; }

/* ----- Animations ----- */
.cascade-right { animation: cascade-right-anim 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes cascade-right-anim {
  0%   { opacity: 0; transform: translateX(24px); filter: blur(4px); }
  100% { opacity: 1; transform: translateX(0); filter: blur(0); }
}
.fade-up { animation: fade-up-anim 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes fade-up-anim {
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pop-in { animation: pop-in-anim 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes pop-in-anim {
  0%   { opacity: 0; transform: scale(0.94); }
  60%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.20); border-radius: 999px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.40); }

/* Responsive */
@media (max-width: 1080px) {
  .forge-body { grid-template-columns: 1fr; }
  .forge-preview { display: none; }
}
@media (max-width: 720px) {
  .sc-grid.two-col, .sc-grid.three-col { grid-template-columns: 1fr; }
  .hero-title { font-size: 32px; }
  .forge-hero { flex-direction: column; align-items: flex-start; gap: 16px; }
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .forge-root { color: var(--text-primary); }
[data-theme="light"] .forge-base {
  background: radial-gradient(ellipse at top left, #f5f0eb 0%, #faf7f0 50%, #faf7f0 100%);
}
[data-theme="light"] .forge-grid { opacity: 0.25; }

[data-theme="light"] .order-notice {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.16), rgba(249, 115, 22, 0.10));
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 6px 24px rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .on-seal {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #faf7f0;
}
[data-theme="light"] .on-eyebrow { color: #b45309; font-weight: 800; }
[data-theme="light"] .on-text { color: #44362a; }
[data-theme="light"] .on-text strong { color: #b45309; font-weight: 700; }

[data-theme="light"] .hero-eyebrow {
  color: #c2410c;
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(217, 119, 6, 0.25);
}
[data-theme="light"] .hero-title { color: var(--text-primary); }
[data-theme="light"] .hero-title span {
  background: linear-gradient(120deg, #d97706, #c2410c);
  -webkit-background-clip: text;
          background-clip: text;
  color: transparent;
}
[data-theme="light"] .hero-sub { color: var(--text-tertiary); }
[data-theme="light"] .hero-meta-pill {
  background: rgba(26, 20, 16, 0.04);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .hero-meta-pill svg { color: #c2410c; }
[data-theme="light"] .hero-meta-pill strong { color: var(--text-primary); }

[data-theme="light"] .section-card {
  background: linear-gradient(180deg, rgba(250, 247, 240, 0.65), rgba(250, 247, 240, 0.45));
  border-color: var(--card-border);
}
[data-theme="light"] .section-card::before {
  background: linear-gradient(180deg, #d97706, #c2410c);
  opacity: 0.45;
}
[data-theme="light"] .section-card:hover::before { opacity: 0.70; }
[data-theme="light"] .sc-seal {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(249, 115, 22, 0.10));
  color: #92400e;
  border-color: rgba(153, 76, 0, 0.20);
}
[data-theme="light"] .sc-header h3 { color: var(--text-primary); }
[data-theme="light"] .sc-header p { color: var(--text-tertiary); }

[data-theme="light"] .field label { color: #6b5840; font-weight: 600; }
[data-theme="light"] .req { color: #dc2626; }
[data-theme="light"] .hero-sub { color: #6b5840; }
[data-theme="light"] .sc-header h3 { color: var(--text-primary); }
[data-theme="light"] .sc-header p { color: #6b5840; }
[data-theme="light"] .civic-input {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-primary);
}
[data-theme="light"] .civic-input::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .civic-input:focus {
  border-color: rgba(217, 119, 6, 0.45);
  background: rgba(217, 119, 6, 0.04);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.08);
}

[data-theme="light"] .suggest-btn {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(249, 115, 22, 0.08));
  border-color: rgba(153, 76, 0, 0.18);
  color: #92400e;
}
[data-theme="light"] .suggest-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(249, 115, 22, 0.14));
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.15);
}
[data-theme="light"] .suggest-btn svg { color: #c2410c; }

[data-theme="light"] .duration-strip {
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(217, 119, 6, 0.15);
  color: var(--text-secondary);
}
[data-theme="light"] .duration-strip strong { color: #b45309; }

[data-theme="light"] .forge-actions { border-top-color: rgba(26, 20, 16, 0.06); }
[data-theme="light"] .btn-ghost {
  background: transparent;
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .btn-ghost:hover {
  background: rgba(26, 20, 16, 0.04);
  color: var(--text-primary);
  border-color: rgba(26, 20, 16, 0.20);
}
[data-theme="light"] .btn-draft {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.22);
  color: #92400e;
}
[data-theme="light"] .btn-draft:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.15);
  border-color: rgba(217, 119, 6, 0.35);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .btn-stamp {
  background: linear-gradient(135deg, #d97706, #c2410c);
  color: #fff;
  border: none;
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.25);
}
[data-theme="light"] .btn-stamp:hover:not(:disabled) {
  box-shadow: 0 10px 28px rgba(217, 119, 6, 0.35);
}

/* Live preview panel */
[data-theme="light"] .prv-eyebrow { color: #c2410c; }
[data-theme="light"] .prv-headline { color: var(--text-secondary); }
[data-theme="light"] .prv-card {
  background:
    linear-gradient(180deg, rgba(217, 119, 6, 0.05), rgba(250, 247, 240, 0.4) 60%),
    rgba(250, 247, 240, 0.7);
  border-color: rgba(153, 76, 0, 0.15);
}
[data-theme="light"] .prv-cat-chip {
  color: #92400e;
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(153, 76, 0, 0.18);
}
[data-theme="light"] .prv-prio {
  border-color: rgba(26, 20, 16, 0.08);
  color: var(--text-secondary);
}
[data-theme="light"] .prv-prio .prio-dot { background: rgba(26, 20, 16, 0.30); }
[data-theme="light"] .prv-prio.prio-high {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.25);
  color: #7f1d1d;
}
[data-theme="light"] .prv-prio.prio-medium {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(153, 76, 0, 0.20);
  color: #92400e;
}
[data-theme="light"] .prv-prio.prio-low {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.22);
  color: #166534;
}
[data-theme="light"] .prv-title { color: var(--text-primary); }
[data-theme="light"] .prv-sub { color: var(--text-tertiary); }
[data-theme="light"] .prv-sep { background: linear-gradient(90deg, rgba(26, 20, 16, 0.06), transparent); }
[data-theme="light"] .prv-cur { color: var(--text-tertiary); }
[data-theme="light"] .prv-amt {
  background: linear-gradient(180deg, var(--text-primary), #92400e);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .prv-code { color: var(--text-tertiary); }
[data-theme="light"] .prv-stage { color: #92400e; }
[data-theme="light"] .prv-stages-eyebrow { color: var(--text-tertiary); }
[data-theme="light"] .prv-stage-pill {
  background: rgba(26, 20, 16, 0.03);
  border-color: rgba(26, 20, 16, 0.06);
  color: var(--text-tertiary);
}
[data-theme="light"] .prv-stage-pill .ps-dot { background: rgba(26, 20, 16, 0.15); }
[data-theme="light"] .prv-stage-pill.active {
  background: linear-gradient(90deg, rgba(217, 119, 6, 0.10), rgba(249, 115, 22, 0.05));
  border-color: rgba(153, 76, 0, 0.25);
  color: var(--text-primary);
}
[data-theme="light"] .prv-stage-pill.active .ps-dot {
  background: linear-gradient(135deg, #d97706, #c2410c);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .prv-stage-pill.past .ps-dot { background: rgba(34, 197, 94, 0.4); }
[data-theme="light"] .prv-stage-pill.past { color: var(--text-secondary); }
[data-theme="light"] .prv-head-eyebrow { color: var(--text-tertiary); }
[data-theme="light"] .prv-head-card {
  background: rgba(26, 20, 16, 0.03);
  border-color: rgba(26, 20, 16, 0.08);
}
[data-theme="light"] .prv-head-avatar {
  background: linear-gradient(135deg, #d97706, #c2410c);
  color: #faf7f0;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .prv-head-name { color: var(--text-primary); }
[data-theme="light"] .prv-head-role { color: var(--text-tertiary); }
[data-theme="light"] .custom-scroll::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.15); }
[data-theme="light"] .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(217, 119, 6, 0.30); }
</style>
