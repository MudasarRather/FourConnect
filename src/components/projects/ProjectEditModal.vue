<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div v-if="isOpen" class="modal-backdrop" :class="{ 'preview-backdrop-bg': mode === 'view' }" @click.self="handleClose">
        <!-- Floating ambient orbs (preview mode only) -->
        <div v-if="mode === 'view'" class="ambient-orbs" aria-hidden="true">
          <span class="orb orb-1"></span>
          <span class="orb orb-2"></span>
          <span class="orb orb-3"></span>
        </div>
        <Transition name="modal-content" appear>
          <div v-if="isOpen" class="modal-container" :class="{ 'preview-mode': mode === 'view' }" @mousemove="onModalMouseMove" @mouseleave="onModalMouseLeave">
            <!-- Header -->
            <div class="modal-header">
              <div class="header-left">
                <span class="project-code">{{ project?.code }}</span>
                <div class="status-badge" :class="statusClass">
                  <CheckCircle2 v-if="mode === 'view'" :size="12" />
                  {{ displayStatus }}
                </div>
              </div>
              <div class="header-right">
                <span class="mode-label">
                  <Eye v-if="mode === 'view'" :size="12" />
                  {{ mode === 'view' ? 'Preview' : 'Edit' }}
                </span>
                <button class="close-btn" @click="handleClose">
                  <X :size="16" />
                </button>
              </div>
            </div>

            <!-- Compact Step Indicators -->
            <div class="step-bar">
              <div 
                v-for="(step, idx) in steps" 
                :key="idx"
                class="step-dot"
                :class="{ active: currentStep === idx + 1, completed: currentStep > idx + 1 }"
                @click="goToStep(idx + 1)"
              >
                <div class="dot">
                  <Check v-if="currentStep > idx + 1" :size="10" />
                  <span v-else>{{ idx + 1 }}</span>
                </div>
                <span class="step-name">{{ step.label }}</span>
              </div>
              <div class="step-line-bg">
                <div class="step-line-progress" :style="{ width: progressWidth }"></div>
              </div>
            </div>

            <!-- Body -->
            <div class="modal-body">
              <!-- Step 1: Details -->
              <div v-show="currentStep === 1" class="step-content">
                <!-- Government order block: visible if any govt field is set OR we're editing -->
                <div class="govt-block" v-if="mode === 'edit' || form.government_order_no || form.category || form.priority || form.lifecycle_status">
                  <div class="govt-block-title">
                    <Crown :size="11"/> GOVERNMENT ORDER
                  </div>
                  <div class="form-grid compact">
                    <div class="field-group">
                      <label><Hash :size="12"/> Order No.</label>
                      <input v-if="mode === 'edit'" v-model="form.government_order_no" class="input-sm" placeholder="e.g. GO/2024/12345"/>
                      <div v-else class="preview-value">{{ form.government_order_no || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Building :size="12"/> Issuing Authority</label>
                      <input v-if="mode === 'edit'" v-model="form.issuing_authority" class="input-sm" placeholder="Ministry / Authority"/>
                      <div v-else class="preview-value">{{ form.issuing_authority || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Layers :size="12"/> Department</label>
                      <input v-if="mode === 'edit'" v-model="form.department" class="input-sm" placeholder="Department / Executing Agency"/>
                      <div v-else class="preview-value">{{ form.department || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Tag :size="12"/> Category</label>
                      <CustomSelect v-if="mode === 'edit'" v-model="form.category" :options="categoryOptionsEdit" labelKey="label" valueKey="value" placeholder="Choose category" compact/>
                      <div v-else class="preview-value">{{ form.category || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Flame :size="12"/> Priority</label>
                      <CustomSelect v-if="mode === 'edit'" v-model="form.priority" :options="priorityOptionsEdit" labelKey="label" valueKey="value" placeholder="Choose priority" compact/>
                      <div v-else class="preview-value">{{ form.priority || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Activity :size="12"/> Lifecycle Status</label>
                      <CustomSelect v-if="mode === 'edit'" v-model="form.lifecycle_status" :options="lifecycleOptionsEdit" labelKey="label" valueKey="value" placeholder="Choose stage" compact/>
                      <div v-else class="preview-value">{{ form.lifecycle_status || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><MapPin :size="12"/> State</label>
                      <input v-if="mode === 'edit'" v-model="form.state" class="input-sm" placeholder="State / Province"/>
                      <div v-else class="preview-value">{{ form.state || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><MapPin :size="12"/> District</label>
                      <input v-if="mode === 'edit'" v-model="form.district" class="input-sm" placeholder="District / City"/>
                      <div v-else class="preview-value">{{ form.district || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Coins :size="12"/> Funding Type</label>
                      <CustomSelect v-if="mode === 'edit'" v-model="form.funding_type" :options="fundingOptionsEdit" labelKey="label" valueKey="value" placeholder="Funding source" compact/>
                      <div v-else class="preview-value">{{ form.funding_type || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><User :size="12"/> Project Head</label>
                      <input v-if="mode === 'edit'" v-model="form.project_head_name" class="input-sm" placeholder="Head Name"/>
                      <div v-else class="preview-value">{{ form.project_head_name || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Briefcase :size="12"/> Designation</label>
                      <input v-if="mode === 'edit'" v-model="form.project_head_designation" class="input-sm" placeholder="Head Designation"/>
                      <div v-else class="preview-value">{{ form.project_head_designation || '—' }}</div>
                    </div>
                    <div class="field-group">
                      <label><Mail :size="12"/> Head Contact</label>
                      <input v-if="mode === 'edit'" v-model="form.project_head_contact" class="input-sm" placeholder="phone or email"/>
                      <div v-else class="preview-value">{{ form.project_head_contact || '—' }}</div>
                    </div>
                  </div>
                </div>

                <div class="form-grid compact">
                  <div class="field-group full name-field">
                    <label><FileText :size="12" /> Project Name</label>
                    <input
                      v-if="mode === 'edit'"
                      v-model="form.name"
                      class="input-sm"
                      placeholder="Project name"
                    />
                    <div v-else class="preview-value hero-name">{{ form.name || '-' }}</div>
                  </div>

                  <div class="field-group full desc-field">
                    <label><AlignLeft :size="12" /> Description</label>
                    <textarea
                      v-if="mode === 'edit'"
                      v-model="form.description"
                      class="textarea-sm"
                      rows="2"
                      placeholder="Brief description..."
                    ></textarea>
                    <div v-else class="preview-value desc hero-desc">{{ form.description || 'No description' }}</div>
                  </div>

                  <div class="field-group">
                    <label><Layers :size="12" /> Project Type</label>
                    <CustomSelect 
                      v-if="mode === 'edit'"
                      v-model="form.project_type" 
                      :options="projectTypes" 
                      labelKey="name" 
                      valueKey="id"
                      placeholder="Select type"
                      compact
                    />
                    <div v-else class="preview-value">{{ getProjectTypeName(form.project_type) }}</div>
                  </div>

                  <div class="field-group full">
                    <label><Building :size="12" /> Organization</label>
                    <div class="preview-value readonly">{{ form.organization || 'Fourconnect' }}</div>
                  </div>
                </div>
              </div>

              <!-- Step 2: Schedule -->
              <div v-show="currentStep === 2" class="step-content">
                <div class="form-grid compact">
                  <div class="field-group">
                    <label><Calendar :size="12" /> Start Date</label>
                    <DatePicker 
                      v-if="mode === 'edit'"
                      v-model="form.start_date" 
                      placeholder="Select start"
                      :minDate="todayDate"
                      compact
                    />
                    <div v-else class="preview-value">{{ formatDate(form.start_date) }}</div>
                  </div>

                  <div class="field-group">
                    <label><CalendarCheck :size="12" /> End Date</label>
                    <DatePicker 
                      v-if="mode === 'edit'"
                      v-model="form.end_date" 
                      placeholder="Select end"
                      :minDate="form.start_date"
                      compact
                    />
                    <div v-else class="preview-value">{{ formatDate(form.end_date) }}</div>
                  </div>

                  <div v-if="projectDuration" class="field-group full">
                    <div class="duration-chip">
                      <Clock :size="12" />
                      <span>Duration: {{ projectDuration }}</span>
                    </div>
                  </div>

                  <div class="field-group full">
                    <div class="info-box">
                      <div class="info-row">
                        <User :size="12" />
                        <span class="info-label">Created By:</span>
                        <span class="info-value">{{ createdByName }}</span>
                      </div>
                      <div class="info-row">
                        <Clock :size="12" />
                        <span class="info-label">Created:</span>
                        <span class="info-value">{{ formatDate(project?.created_at) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 3: Financials & Actions -->
              <div v-show="currentStep === 3" class="step-content">
                <div class="form-grid compact">
                  <div class="field-group budget-field">
                    <label><DollarSign :size="12" /> Budget Amount</label>
                    <CurrencyInput
                      v-if="mode === 'edit'"
                      v-model="form.budget_amount"
                      :currency="form.currency"
                      placeholder="0.00"
                    />
                    <div v-else class="preview-value budget hero-budget">
                      <span class="hero-budget-glow"></span>
                      {{ formatCurrency(form.budget_amount, form.currency) }}
                    </div>
                  </div>

                  <div class="field-group">
                    <label><Globe :size="12" /> Currency</label>
                    <CustomSelect 
                      v-if="mode === 'edit'"
                      v-model="form.currency" 
                      :options="currencies" 
                      labelKey="code" 
                      valueKey="code"
                      compact
                    />
                    <div v-else class="preview-value">{{ form.currency }}</div>
                  </div>

                  <!-- Summary Card -->
                  <div class="field-group full">
                    <div class="summary-mini">
                      <div class="sum-item">
                        <span class="sum-label">Project</span>
                        <span class="sum-value">{{ form.name || 'Untitled' }}</span>
                      </div>
                      <div class="sum-item">
                        <span class="sum-label">Budget</span>
                        <span class="sum-value highlight">{{ formatCurrency(form.budget_amount, form.currency) }}</span>
                      </div>
                      <div class="sum-item">
                        <span class="sum-label">Status</span>
                        <div class="sum-value display-status-badge" :class="statusClass">{{ displayStatus }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <div class="footer-nav">
                <button v-if="currentStep > 1" class="btn-nav" @click="prevStep">
                  <ChevronLeft :size="14" />
                </button>
                <span class="step-indicator">{{ currentStep }} / {{ steps.length }}</span>
                <button v-if="currentStep < 3" class="btn-nav" @click="nextStep">
                  <ChevronRight :size="14" />
                </button>
              </div>

              <!-- Admin Footer Actions -->
              <div class="footer-actions" v-if="currentStep === 3 && isAdmin">
                <!-- If Approved: Only Update -->
                <template v-if="project?.status === 'Approved'">
                  <button class="btn-action save" @click="handleUpdateOnly" :disabled="isSubmitting">
                    <Save :size="14" />
                    <span>Update</span>
                  </button>
                </template>
                
                <!-- If Draft (Admin's own draft): Save Draft + Submit -->
                <template v-else-if="project?.status === 'Draft'">
                  <button class="btn-action save" @click="handleAdminSaveDraft" :disabled="isSubmitting">
                    <Save :size="14" />
                    <span>Save Draft</span>
                  </button>
                  <button class="btn-action approve" @click="showAdminPreview = true" :disabled="isSubmitting">
                    <CheckCircle :size="14" />
                    <span>Review & Submit</span>
                  </button>
                </template>
                
                <!-- If Other (Pending/Rejected - user projects): Full Actions -->
                <template v-else>
                  <button class="btn-action reject" @click="handleReject" :disabled="isSubmitting">
                    <XCircle :size="14" />
                    <span>Reject</span>
                  </button>
                  <button class="btn-action save" @click="handleSave" :disabled="isSubmitting">
                    <Save :size="14" />
                    <span>Save</span>
                  </button>
                  <button class="btn-action approve" @click="handleApprove" :disabled="isSubmitting">
                    <CheckCircle :size="14" />
                    <span>Approve</span>
                  </button>
                </template>
              </div>

              <!-- User Footer Actions (for drafts only) -->
              <div class="footer-actions" v-if="currentStep === 3 && !isAdmin && mode === 'edit'">
                <button class="btn-action save" @click="handleSave" :disabled="isSubmitting">
                  <Save :size="14" />
                  <span>Save Draft</span>
                </button>
                <button class="btn-action approve" @click="showUserPreview = true" :disabled="isSubmitting">
                  <CheckCircle :size="14" />
                  <span>Review & Submit</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- User Preview Modal (for confirming draft submission) -->
    <Transition name="modal-backdrop">
      <div v-if="showUserPreview" class="preview-backdrop" @click.self="showUserPreview = false">
        <div class="modal-container preview-mode" style="max-width: 500px; min-height: auto;">
          <div class="modal-header">
            <span class="mode-label">Confirm Submission</span>
            <button class="close-btn" @click="showUserPreview = false"><X :size="16" /></button>
          </div>
          <div class="modal-body" style="text-align: center; padding: 40px 20px;">
            <div style="width: 60px; height: 60px; background: rgba(59,130,246,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #3b82f6;">
              <Activity :size="32" />
            </div>
            <h3 style="color: #fff; margin-bottom: 8px;">Submit for Approval?</h3>
            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">
              This will change the project status to <strong>Pending Approval</strong> and notify the admin.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button class="btn-action" style="background: rgba(255,255,255,0.1); color: #fff;" @click="showUserPreview = false">Cancel</button>
              <button class="btn-action" style="background: #3b82f6; color: #fff;" @click="confirmUserSubmit">Submit Project</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Admin Preview Modal (for confirming draft submission - auto-approve) -->
    <Transition name="modal-backdrop">
      <div v-if="showAdminPreview" class="preview-backdrop" @click.self="showAdminPreview = false">
        <div class="modal-container preview-mode" style="max-width: 500px; min-height: auto;">
          <div class="modal-header">
            <span class="mode-label">Review & Submit</span>
            <button class="close-btn" @click="showAdminPreview = false"><X :size="16" /></button>
          </div>
          <div class="modal-body" style="text-align: center; padding: 40px 20px;">
            <div style="width: 60px; height: 60px; color: #10b981; background: rgba(16,185,129,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
              <CheckCircle :size="32" />
            </div>
            <h3 style="color: #fff; margin-bottom: 8px;">Approve Project?</h3>
            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">
              As an admin, submitting this draft will automatically mark it as <strong>Approved</strong>.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button class="btn-action" style="background: rgba(255,255,255,0.1); color: #fff;" @click="showAdminPreview = false">Cancel</button>
              <button class="btn-action" style="background: #10b981; color: #000;" @click="confirmAdminSubmit">Approve & Publish</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { 
  X, Check, ChevronLeft, ChevronRight, CheckCircle, XCircle, Save, Info,
  FileText, AlignLeft, Layers, Target, Building, Calendar, CalendarCheck,
  Clock, User, DollarSign, Globe, PieChart, TrendingUp, Activity,
  Eye, CheckCircle2, Crown, Hash, Tag, Flame, MapPin, Coins, Briefcase, Mail
} from 'lucide-vue-next'

// Govt-aware dropdown options for the new fields. Kept local — no shared module.
const categoryOptionsEdit = [
  { value: 'Infrastructure',           label: 'Infrastructure' },
  { value: 'Roads & Bridges',          label: 'Roads & Bridges' },
  { value: 'Water & Sanitation',       label: 'Water & Sanitation' },
  { value: 'Buildings & Construction', label: 'Buildings & Construction' },
  { value: 'IT & Digital',             label: 'IT & Digital' },
  { value: 'Social Welfare',           label: 'Social Welfare' },
  { value: 'Defence',                  label: 'Defence' },
  { value: 'Energy',                   label: 'Energy' },
  { value: 'Other',                    label: 'Other' },
]
const priorityOptionsEdit = [
  { value: 'High',   label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low',    label: 'Low' },
]
const lifecycleOptionsEdit = [
  { value: 'Order Received', label: 'Order Received' },
  { value: 'Planning',       label: 'Planning' },
  { value: 'Tendering',      label: 'Tendering' },
  { value: 'In Progress',    label: 'In Progress' },
  { value: 'Active',         label: 'Active' },
  { value: 'Completed',      label: 'Completed' },
]
const fundingOptionsEdit = [
  { value: 'Central Govt.',   label: 'Central Govt.' },
  { value: 'State Govt.',     label: 'State Govt.' },
  { value: 'Central + State', label: 'Central + State' },
  { value: 'External Aid',    label: 'External Aid' },
  { value: 'PPP',             label: 'PPP' },
]
import { useToast } from '../../composables/useToast'
import DatePicker from '../ui/DatePicker.vue'
import CurrencyInput from '../ui/CurrencyInput.vue'
import CustomSelect from '../ui/CustomSelect.vue'

const props = defineProps({
  isOpen: Boolean,
  project: Object,
  mode: { type: String, default: 'edit' }, // 'edit' or 'view'
  cardRect: Object,
  isAdmin: { type: Boolean, default: false },
  customStatusLabel: { type: String, default: '' }
})

const emit = defineEmits(['close', 'updated'])
const { success, error } = useToast()

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const createdByName = ref('Unknown')
const showUserPreview = ref(false)
const showAdminPreview = ref(false)
const validationErrors = ref({})

const form = ref({
  name: '',
  description: '',
  project_type: '',
  organization: '',
  start_date: '',
  end_date: '',
  budget_amount: 0,
  currency: 'USD',
  // --- Government-order fields (optional on edit; legacy projects show blank) ---
  government_order_no: '',
  order_date: '',
  issuing_authority: '',
  order_received_date: '',
  department: '',
  category: '',
  priority: '',
  state: '',
  district: '',
  funding_type: '',
  project_head_name: '',
  project_head_designation: '',
  project_head_contact: '',
  nodal_officer: '',
  contractor: '',
  lifecycle_status: '',
})

// Settings
const projectTypes = ref([])
const currencies = ref([
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' }
])

const steps = [
  { label: 'Details' },
  { label: 'Schedule' },
  { label: 'Review' }
]

// Computed
const displayStatus = computed(() => {
  if (props.customStatusLabel) return props.customStatusLabel
  const status = props.project?.status || 'Draft'
  return status === 'Pending Approval' ? 'Pending' : status
})

const statusClass = computed(() => {
  if (props.customStatusLabel) return props.customStatusLabel.toLowerCase().replace(' ', '-')
  return (props.project?.status || 'draft').toLowerCase().replace(' ', '-').replace('pending-approval', 'pending')
})

const progressWidth = computed(() => {
  return `${((currentStep.value - 1) / (steps.length - 1)) * 100}%`
})

const projectDuration = computed(() => {
  if (!form.value.start_date || !form.value.end_date) return null
  const start = new Date(form.value.start_date)
  const end = new Date(form.value.end_date)
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  if (days <= 0) return null
  if (days < 30) return `${days} days`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''}`
})

// Today's date in YYYY-MM-DD format for minDate validation
const todayDate = computed(() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

// Watchers
watch(() => props.project, async (p) => {
  if (p) {
    form.value = {
      name: p.name || '',
      description: p.description || '',
      project_type: p.project_type || '',
      organization: p.organization || '',
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : '',
      budget_amount: p.budget_amount || 0,
      currency: p.currency || 'USD',
      // Govt fields — null on legacy rows
      government_order_no: p.government_order_no || '',
      order_date: p.order_date ? p.order_date.split('T')[0] : '',
      issuing_authority: p.issuing_authority || '',
      order_received_date: p.order_received_date ? p.order_received_date.split('T')[0] : '',
      department: p.department || '',
      category: p.category || '',
      priority: p.priority || '',
      state: p.state || '',
      district: p.district || '',
      funding_type: p.funding_type || '',
      project_head_name: p.project_head_name || '',
      project_head_designation: p.project_head_designation || '',
      project_head_contact: p.project_head_contact || '',
      nodal_officer: p.nodal_officer || '',
      contractor: p.contractor || '',
      lifecycle_status: p.lifecycle_status || '',
    }
    currentStep.value = 1
    await fetchCreatorName(p.created_by_id)
  }
}, { immediate: true })

watch(() => props.isOpen, (open) => {
  if (open) fetchSettingsData()
})

// API
const fetchSettingsData = async () => {
  try {
    const token = props.isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    const headers = { Authorization: `Bearer ${token}` }
    const pt = await axios.get('http://localhost:8000/api/settings/project-types', { headers })
    projectTypes.value = pt.data
  } catch (e) {
    console.error('Failed to fetch settings:', e)
  }
}

const fetchCreatorName = async (userId) => {
  // Use created_by_name from project response if available
  if (props.project?.created_by_name) {
    createdByName.value = props.project.created_by_name
    return
  }
  // Fallback to fetching if not available
  if (!userId) { createdByName.value = 'Unknown'; return }
  try {
    const token = props.isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    // Users might not have permission to list all users, handle gracefully
    // If user, maybe we don't fetch or fetch public profile if available. 
    // But assuming the endpoint might allow reading basic info.
    const res = await axios.get(`http://localhost:8000/api/auth/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const user = res.data.find(u => String(u.id) === String(userId))
    createdByName.value = user?.full_name || 'Unknown'
  } catch (e) {
    createdByName.value = 'Unknown'
  }
}

// Validation
const validateStep = (step) => {
  validationErrors.value = {}
  
  if (step === 1) {
    if (!form.value.name?.trim()) validationErrors.value.name = 'Project name is required'
    if (!form.value.description?.trim()) validationErrors.value.description = 'Description is required'
    if (!form.value.project_type) validationErrors.value.project_type = 'Project type is required'
  }

  if (step === 2) {
    if (!form.value.start_date) validationErrors.value.start_date = 'Start date is required'
    if (!form.value.end_date) validationErrors.value.end_date = 'End date is required'
  }

  if (step === 3) {
    if (!form.value.budget_amount || Number(form.value.budget_amount) <= 0) {
      validationErrors.value.budget_amount = 'Order Value must be greater than 0'
    }
    if (!form.value.currency) validationErrors.value.currency = 'Currency is required'
  }
  
  return Object.keys(validationErrors.value).length === 0
}

// Navigation
const goToStep = (s) => {
  // Validate current step before allowing navigation to a later step
  if (s > currentStep.value) {
    if (!validateStep(currentStep.value)) {
      error('Please fill in all required fields')
      return
    }
  }
  currentStep.value = s
}

const nextStep = () => {
  if (currentStep.value < 3) {
    if (!validateStep(currentStep.value)) {
      error('Please fill in all required fields before proceeding')
      return
    }
    currentStep.value++
  }
}

const prevStep = () => { if (currentStep.value > 1) currentStep.value-- }
const handleClose = () => emit('close')

// Pointer-tracking glow (preview mode only)
const onModalMouseMove = (e) => {
  if (props.mode !== 'view') return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
  el.style.setProperty('--glow-opacity', '1')
}
const onModalMouseLeave = (e) => {
  if (props.mode !== 'view') return
  e.currentTarget.style.setProperty('--glow-opacity', '0')
}

// Actions
const validateAllFields = () => {
  validationErrors.value = {}

  // Step 1 checks
  if (!form.value.name?.trim()) validationErrors.value.name = 'Project name is required'
  if (!form.value.description?.trim()) validationErrors.value.description = 'Description is required'
  if (!form.value.project_type) validationErrors.value.project_type = 'Project type is required'

  // Step 2 checks
  if (!form.value.start_date) validationErrors.value.start_date = 'Start date is required'
  if (!form.value.end_date) validationErrors.value.end_date = 'End date is required'

  // Step 3 checks
  if (!form.value.budget_amount || Number(form.value.budget_amount) <= 0) {
    validationErrors.value.budget_amount = 'Order Value must be greater than 0'
  }
  if (!form.value.currency) validationErrors.value.currency = 'Currency is required'

  return Object.keys(validationErrors.value).length === 0
}

const updateProject = async (status) => {
  // Validate before submission
  if (!validateAllFields()) {
    error('Please fill in all required fields. Budget must be greater than 0.')
    return
  }
  
  isSubmitting.value = true
  try {
    // Use correct token based on admin context
    const token = props.isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    await axios.put(
      `http://localhost:8000/api/projects/${props.project.id}`,
      { ...form.value, status },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const msgs = {
      'Draft': 'Draft saved',
      'Pending Approval': 'Submitted for approval! 🎉',
      'Approved': 'Project approved! 🎉',
      'Rejected': 'Project rejected'
    }
    success(msgs[status] || 'Updated')
    emit('updated')
    emit('close')
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to update')
  } finally {
    isSubmitting.value = false
  }
}

const handleSave = () => {
  // For admin: save as Pending Approval, for user: save as Draft
  updateProject(props.isAdmin ? 'Pending Approval' : 'Draft')
}
const handleUpdateOnly = () => {
  // Keep existing status (for Approved projects)
  updateProject(props.project?.status || 'Approved')
}
const handleApprove = () => updateProject('Approved')
const handleReject = () => updateProject('Rejected')
const handleUserSubmit = () => updateProject('Pending Approval')

// Admin Draft handlers
const handleAdminSaveDraft = () => updateProject('Draft')
const handleAdminSubmit = () => updateProject('Approved')

// User submit with preview confirmation
const confirmUserSubmit = async () => {
  await handleUserSubmit()
  showUserPreview.value = false
}

// Admin submit with preview confirmation (auto-approve)
const confirmAdminSubmit = async () => {
  await handleAdminSubmit()
  showAdminPreview.value = false
}

// Helpers
const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatCurrency = (amt, cur) => {
  const syms = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' }
  return `${syms[cur] || '$'}${Number(amt || 0).toLocaleString()}`
}

const getProjectTypeName = (id) => {
  const pt = projectTypes.value.find(p => p.id === id)
  return pt?.name || id || '-'
}

</script>

<style scoped>
/* Base Transition & Container */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #18181b;
  width: 90%; max-width: 800px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column;
  max-height: 90vh;
  transition: all 0.3s ease;
}

/* Header */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.project-code { 
  font-family: 'SF Mono', 'Monaco', monospace; font-size: 13px; 
  color: #71717a; background: rgba(255,255,255,0.05); 
  padding: 4px 8px; border-radius: 6px; 
}
.status-badge {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 4px 8px; border-radius: 6px;
}
.status-badge.draft { background: rgba(113, 113, 122, 0.15); color: #a1a1aa; border: 1px solid rgba(113, 113, 122, 0.2); }
.status-badge.pending { background: rgba(234, 179, 8, 0.15); color: #fbbf24; border: 1px solid rgba(234, 179, 8, 0.2); }
.status-badge.approved, .status-badge.completed { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
.status-badge.rejected { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

.header-right { display: flex; align-items: center; gap: 12px; }
.mode-label {
  font-size: 12px; font-weight: 500; color: #a1a1aa;
  padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.05);
}
.close-btn { 
  background: none; border: none; color: #71717a; cursor: pointer; display: flex; 
  transition: color 0.2s; 
}
.close-btn:hover { color: #fff; }

/* Step Bar */
.step-bar {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 40px; position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.step-line-bg {
  position: absolute; top: 36px; left: 56px; right: 56px; height: 2px;
  background: rgba(255,255,255,0.1); z-index: 0;
}
.step-line-progress {
  height: 100%; background: #3b82f6; transition: width 0.3s ease;
}
.step-dot {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; opacity: 0.5; transition: all 0.2s;
}
.step-dot.active, .step-dot.completed { opacity: 1; }
.dot {
  width: 32px; height: 32px; border-radius: 50%;
  background: #18181b; border: 2px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; color: #71717a;
  transition: all 0.2s;
}
.step-dot.active .dot { border-color: #3b82f6; color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
.step-dot.completed .dot { background: #3b82f6; border-color: #3b82f6; color: #fff; }
.step-name { font-size: 12px; color: #a1a1aa; }
.step-dot.active .step-name { color: #fff; }

/* Body */
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.step-content { animation: fadeIn 0.3s ease; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.form-grid.compact { gap: 16px; }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-group.full { grid-column: 1 / -1; }
label { font-size: 12px; font-weight: 500; color: #a1a1aa; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.05em; }

.input-sm, .textarea-sm, textarea {
  background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
  color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 14px; width: 100%;
  font-family: inherit; transition: all 0.2s;
}
.input-sm:focus, .textarea-sm:focus, textarea:focus { 
  outline: none; border-color: #3b82f6; background: rgba(0,0,0,0.4);
}
.budget-type-selector { display: flex; gap: 10px; }
.type-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #71717a; cursor: pointer;
  transition: all 0.2s;
}
.type-btn.active { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.5); color: #3b82f6; }
.type-btn:hover:not(.active) { background: rgba(255,255,255,0.1); color: #fff; }

/* Readonly / Preview Values in Edit Mode */
.preview-value { 
  padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; 
  color: #e4e4e7; font-size: 14px; border: 1px solid transparent; 
}
.preview-value.budget { font-family: 'SF Mono', monospace; letter-spacing: -0.5px; }

/* Info Box */
.info-box {
  background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px;
  display: flex; gap: 24px;
}
.info-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.info-label { color: #71717a; } .info-value { color: #e4e4e7; font-weight: 500; }

/* Summary Mini */
.summary-mini {
  display: flex; gap: 16px; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
}
.sum-item { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.sum-label { font-size: 11px; color: #a1a1aa; text-transform: uppercase; }
.sum-value { font-size: 14px; color: #fff; font-weight: 500; }
.sum-value.highlight { color: #fbbf24; font-family: 'SF Mono', monospace; }

/* Footer */
.modal-footer {
  padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; justify-content: space-between; align-items: center;
}
.footer-nav { display: flex; align-items: center; gap: 12px; }
.btn-nav {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center; color: #a1a1aa;
  cursor: pointer; background: transparent; transition: all 0.2s;
}
.btn-nav:hover { background: rgba(255,255,255,0.1); color: #fff; }
.step-indicator { font-size: 12px; color: #71717a; font-variant-numeric: tabular-nums; }
.footer-actions { display: flex; gap: 10px; }
.btn-action {
  padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px; cursor: pointer; border: none;
  transition: all 0.2s;
}
.btn-action.save { background: rgba(255,255,255,0.1); color: #fff; }
.btn-action.save:hover { background: rgba(255,255,255,0.2); }
.btn-action.approve { background: #10b981; color: #000; }
.btn-action.approve:hover { background: #34d399; }
.btn-action.reject { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.btn-action.reject:hover { background: rgba(239, 68, 68, 0.2); }

/* Transitions */
.modal-content-enter-active, .modal-content-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-content-enter-from { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-content-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }

.preview-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1100;
    display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);
}

/* ╔══════════════════════════════════════════════════════════════╗ */
/* ║ ULTRA-MODERN PREVIEW MODE — sleek glass + animated accents  ║ */
/* ╚══════════════════════════════════════════════════════════════╝ */

/* Backdrop variant for preview — darker with warm vignette */
.preview-backdrop-bg {
  background:
    radial-gradient(ellipse at 30% 20%, rgba(120, 60, 10, 0.25), transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(60, 30, 5, 0.35), transparent 60%),
    rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

/* Ambient floating orbs behind the modal */
.ambient-orbs {
  position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0;
}
.orb {
  position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.55;
  will-change: transform;
}
.orb-1 {
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 65%);
  top: -120px; left: -80px;
  animation: orbDrift1 18s ease-in-out infinite;
}
.orb-2 {
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.35), transparent 65%);
  bottom: -100px; right: -60px;
  animation: orbDrift2 22s ease-in-out infinite;
}
.orb-3 {
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(217, 119, 6, 0.30), transparent 65%);
  top: 40%; left: 50%;
  animation: orbDrift3 26s ease-in-out infinite;
}
@keyframes orbDrift1 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(60px, 40px) scale(1.15); }
}
@keyframes orbDrift2 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(-50px, -60px) scale(1.1); }
}
@keyframes orbDrift3 {
  0%,100% { transform: translate(-50%, -50%) scale(0.9); }
  50%     { transform: translate(-30%, -65%) scale(1.05); }
}

/* Container — slimmer, premium glass, animated border */
.modal-container.preview-mode {
  max-width: 680px;
  background:
    linear-gradient(135deg, rgba(28, 22, 16, 0.78) 0%, rgba(18, 14, 10, 0.92) 100%);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(251, 191, 36, 0.12);
  border-radius: 24px;
  box-shadow:
    0 50px 100px -20px rgba(0, 0, 0, 0.75),
    0 0 80px -20px rgba(251, 191, 36, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  --mx: 50%; --my: 50%; --glow-opacity: 0;
  animation: containerRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
@keyframes containerRise {
  from { opacity: 0; transform: translateY(24px) scale(0.96); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

/* Rotating conic-gradient border */
.modal-container.preview-mode::before {
  content: ''; position: absolute; inset: -1px;
  border-radius: 24px; padding: 1px;
  background: conic-gradient(from 0deg,
    rgba(251, 191, 36, 0.5) 0%,
    rgba(245, 158, 11, 0.05) 25%,
    rgba(251, 191, 36, 0.4) 50%,
    rgba(245, 158, 11, 0.05) 75%,
    rgba(251, 191, 36, 0.5) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  animation: rotateConic 12s linear infinite;
  opacity: 0.7;
}
@keyframes rotateConic {
  to { transform: rotate(360deg); }
}

/* Pointer-tracking radial glow */
.modal-container.preview-mode::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(380px circle at var(--mx) var(--my),
    rgba(251, 191, 36, 0.10), transparent 60%);
  opacity: var(--glow-opacity);
  transition: opacity 0.3s ease;
  z-index: 0;
}

/* Lift content above ::after */
.modal-container.preview-mode > * { position: relative; z-index: 1; }

/* ── Header ───────────────────────────────────────────── */
.modal-container.preview-mode .modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid rgba(251, 191, 36, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
}

.modal-container.preview-mode .project-code {
  color: rgba(251, 191, 36, 0.9);
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.20);
  font-weight: 600; letter-spacing: 0.04em;
  position: relative; overflow: hidden;
  animation: chipFadeIn 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.modal-container.preview-mode .project-code::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.25) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: codeShimmer 4s 1s infinite;
}
@keyframes codeShimmer {
  0%, 100% { transform: translateX(-100%); }
  20%, 80% { transform: translateX(100%); }
}

.modal-container.preview-mode .status-badge {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(245, 158, 11, 0.10)) !important;
  color: #fcd34d !important;
  border: 1px solid rgba(251, 191, 36, 0.30) !important;
  display: inline-flex; align-items: center; gap: 6px;
  position: relative;
  animation: chipFadeIn 0.6s 0.15s cubic-bezier(0.16, 1, 0.3, 1) backwards, statusPulse 3s 1s ease-in-out infinite;
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.12);
}
.modal-container.preview-mode .status-badge.approved,
.modal-container.preview-mode .status-badge.completed {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.20), rgba(16, 185, 129, 0.10)) !important;
  color: #6ee7b7 !important;
  border-color: rgba(52, 211, 153, 0.35) !important;
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.18);
}
.modal-container.preview-mode .status-badge.rejected {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.20), rgba(239, 68, 68, 0.10)) !important;
  color: #fca5a5 !important;
  border-color: rgba(248, 113, 113, 0.35) !important;
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.16);
}
@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 14px rgba(251, 191, 36, 0.12); }
  50%      { box-shadow: 0 0 22px rgba(251, 191, 36, 0.28); }
}
@keyframes chipFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-container.preview-mode .mode-label {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.14), rgba(245, 158, 11, 0.08));
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.28);
  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  font-size: 10px; padding: 5px 10px;
  display: inline-flex; align-items: center; gap: 6px;
  animation: chipFadeIn 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.modal-container.preview-mode .mode-label svg {
  animation: eyeBlink 4s ease-in-out infinite;
}
@keyframes eyeBlink {
  0%, 92%, 100% { transform: scaleY(1); }
  94%, 98%      { transform: scaleY(0.1); }
}

.modal-container.preview-mode .close-btn {
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.25s, color 0.25s, border-color 0.25s;
}
.modal-container.preview-mode .close-btn:hover {
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.30);
  color: #fca5a5;
  transform: rotate(90deg) scale(1.08);
}

/* ── Step bar — refined ──────────────────────────────── */
.modal-container.preview-mode .step-bar {
  padding: 22px 56px 18px;
  border-bottom: 1px solid rgba(251, 191, 36, 0.06);
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.015));
}
.modal-container.preview-mode .step-line-bg {
  top: 36px; height: 1px;
  background: rgba(255, 255, 255, 0.06);
}
.modal-container.preview-mode .step-line-progress {
  background: linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d);
  height: 1px; box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
  position: relative;
}
.modal-container.preview-mode .step-line-progress::after {
  content: ''; position: absolute; right: -3px; top: 50%; transform: translateY(-50%);
  width: 6px; height: 6px; border-radius: 50%;
  background: #fcd34d; box-shadow: 0 0 10px rgba(251, 191, 36, 0.9);
  animation: dotPulse 1.8s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { transform: translateY(-50%) scale(1); opacity: 1; }
  50%      { transform: translateY(-50%) scale(1.6); opacity: 0.6; }
}
.modal-container.preview-mode .step-dot .dot {
  width: 28px; height: 28px; font-size: 11px;
  background: rgba(20, 16, 12, 0.9);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-container.preview-mode .step-dot.active .dot {
  border-color: #fbbf24; color: #fcd34d;
  background: rgba(251, 191, 36, 0.08);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.12), 0 0 16px rgba(251, 191, 36, 0.35);
  transform: scale(1.08);
}
.modal-container.preview-mode .step-dot.completed .dot {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-color: #fbbf24; color: #1a0f00;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}
.modal-container.preview-mode .step-name {
  font-size: 10px; letter-spacing: 0.10em; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4); font-weight: 600;
  transition: color 0.3s;
}
.modal-container.preview-mode .step-dot.active .step-name { color: #fcd34d; }
.modal-container.preview-mode .step-dot.completed .step-name { color: rgba(251, 191, 36, 0.7); }

/* ── Body & content transitions ──────────────────────── */
.modal-container.preview-mode .modal-body {
  padding: 28px 28px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.2) transparent;
}
.modal-container.preview-mode .modal-body::-webkit-scrollbar { width: 6px; }
.modal-container.preview-mode .modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.15));
  border-radius: 6px;
}

.modal-container.preview-mode .step-content {
  animation: stepEnter 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes stepEnter {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}

/* ── Labels — refined ────────────────────────────────── */
.modal-container.preview-mode label {
  font-size: 9.5px; letter-spacing: 0.18em; color: rgba(251, 191, 36, 0.65);
  font-weight: 700; text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 6px;
  margin-bottom: 6px;
}
.modal-container.preview-mode label svg {
  color: #fbbf24; opacity: 0.85;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.3));
}

/* ── Preview values — clean, no boxes ─────────────────── */
.modal-container.preview-mode .preview-value {
  background: transparent;
  border: none;
  padding: 4px 0 10px 0;
  color: #f5f3ee;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: -0.005em;
  position: relative;
  border-bottom: 1px solid rgba(251, 191, 36, 0.06);
  transition: border-color 0.25s;
}
.modal-container.preview-mode .field-group {
  gap: 0;
  animation: fieldSlide 0.55s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.modal-container.preview-mode .step-content .field-group:nth-child(1) { animation-delay: 0.05s; }
.modal-container.preview-mode .step-content .field-group:nth-child(2) { animation-delay: 0.10s; }
.modal-container.preview-mode .step-content .field-group:nth-child(3) { animation-delay: 0.15s; }
.modal-container.preview-mode .step-content .field-group:nth-child(4) { animation-delay: 0.20s; }
.modal-container.preview-mode .step-content .field-group:nth-child(5) { animation-delay: 0.25s; }
.modal-container.preview-mode .step-content .field-group:nth-child(6) { animation-delay: 0.30s; }
@keyframes fieldSlide {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.modal-container.preview-mode .field-group:hover .preview-value {
  border-bottom-color: rgba(251, 191, 36, 0.30);
}

/* ── Hero treatments ─────────────────────────────────── */
.modal-container.preview-mode .hero-name {
  font-size: 26px; font-weight: 700; line-height: 1.2;
  background: linear-gradient(135deg, #fff 30%, #fcd34d 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding: 6px 0 14px 0;
  letter-spacing: -0.02em;
  border-bottom: 1px solid rgba(251, 191, 36, 0.10);
}
.modal-container.preview-mode .hero-desc {
  font-size: 14px; line-height: 1.6; color: rgba(245, 243, 238, 0.78);
  font-weight: 400;
  padding: 6px 0 14px 0;
  border-bottom: 1px solid rgba(251, 191, 36, 0.06);
}

.modal-container.preview-mode .hero-budget {
  font-size: 32px; font-weight: 700;
  font-family: 'SF Mono', 'Monaco', monospace;
  background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.03em;
  padding: 8px 0 14px 0;
  border-bottom: 1px solid rgba(251, 191, 36, 0.12);
  position: relative;
  display: block;
  animation: budgetCountUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s backwards;
}
@keyframes budgetCountUp {
  from { opacity: 0; transform: translateY(8px) scale(0.92); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
.hero-budget-glow {
  position: absolute; left: -10px; top: 50%; width: 70%; height: 24px;
  transform: translateY(-50%);
  background: radial-gradient(ellipse, rgba(251, 191, 36, 0.35), transparent 65%);
  filter: blur(18px);
  pointer-events: none;
  animation: glowPulse 3s ease-in-out infinite;
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.6; transform: translateY(-50%) scale(1); }
  50%      { opacity: 1;   transform: translateY(-50%) scale(1.15); }
}

/* ── Info box (Created by) — refined glass card ─────── */
.modal-container.preview-mode .info-box {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.05), rgba(245, 158, 11, 0.02));
  border: 1px solid rgba(251, 191, 36, 0.12);
  border-radius: 12px;
  padding: 14px 16px;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}
.modal-container.preview-mode .info-box::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, #fbbf24, transparent);
  animation: sideBarPulse 2.5s ease-in-out infinite;
}
@keyframes sideBarPulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}
.modal-container.preview-mode .info-row { font-size: 12px; }
.modal-container.preview-mode .info-row svg { color: #fbbf24; opacity: 0.7; }
.modal-container.preview-mode .info-label { color: rgba(251, 191, 36, 0.55); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 10px; }
.modal-container.preview-mode .info-value { color: #f5f3ee; font-weight: 500; }

/* ── Duration chip — refined ─────────────────────────── */
.modal-container.preview-mode .duration-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px; margin: 4px 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.06));
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 999px;
  color: #fcd34d; font-weight: 600; font-size: 13px;
  letter-spacing: 0.01em;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.08);
  animation: chipFadeIn 0.55s 0.25s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.modal-container.preview-mode .duration-chip svg { color: #fbbf24; }

/* ── Summary mini — premium card ─────────────────────── */
.modal-container.preview-mode .summary-mini {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.06), rgba(245, 158, 11, 0.02));
  border: 1px solid rgba(251, 191, 36, 0.14);
  border-radius: 16px;
  padding: 18px 20px;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
  animation: chipFadeIn 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.modal-container.preview-mode .summary-mini::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 40%, rgba(251, 191, 36, 0.08) 50%, transparent 60%);
  transform: translateX(-100%);
  animation: sweepShine 4s 1s infinite;
}
@keyframes sweepShine {
  0%, 100% { transform: translateX(-100%); }
  20%, 80% { transform: translateX(100%); }
}
.modal-container.preview-mode .sum-item { position: relative; z-index: 1; }
.modal-container.preview-mode .sum-label { color: rgba(251, 191, 36, 0.7); font-size: 10px; letter-spacing: 0.14em; font-weight: 700; }
.modal-container.preview-mode .sum-value { color: #fff; font-weight: 600; font-size: 13px; }
.modal-container.preview-mode .sum-value.highlight {
  background: linear-gradient(135deg, #fcd34d, #f59e0b);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: 'SF Mono', monospace;
}
.modal-container.preview-mode .display-status-badge {
  display: inline-flex !important; padding: 3px 8px !important;
  border-radius: 999px !important; font-size: 10px !important;
  font-weight: 700 !important; letter-spacing: 0.06em !important;
  text-transform: uppercase;
}

/* ── Govt block — refined accent card ───────────────── */
.modal-container.preview-mode .govt-block {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.07), rgba(245, 158, 11, 0.03));
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 14px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
}
.modal-container.preview-mode .govt-block::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, #fbbf24, transparent);
  animation: topLineSweep 3.5s ease-in-out infinite;
}
@keyframes topLineSweep {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 1; }
}
.modal-container.preview-mode .govt-block-title {
  color: #fcd34d; font-size: 9.5px; letter-spacing: 0.24em;
  margin-bottom: 12px;
}
.modal-container.preview-mode .govt-block-title svg {
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
}
.modal-container.preview-mode .govt-block .field-group {
  padding: 8px 0;
}
.modal-container.preview-mode .govt-block .preview-value {
  font-size: 13px; padding: 2px 0 8px 0;
}

/* ── Footer — refined ────────────────────────────────── */
.modal-container.preview-mode .modal-footer {
  padding: 14px 24px;
  border-top: 1px solid rgba(251, 191, 36, 0.08);
  background: linear-gradient(0deg, rgba(251, 191, 36, 0.02), transparent);
}
.modal-container.preview-mode .btn-nav {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.15);
  color: rgba(251, 191, 36, 0.7);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-container.preview-mode .btn-nav:hover {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.40);
  color: #fcd34d;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(251, 191, 36, 0.18);
}
.modal-container.preview-mode .step-indicator {
  color: rgba(251, 191, 36, 0.6);
  font-weight: 600; letter-spacing: 0.06em;
}

/* Generic keyframes used by other parts */
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* Government-order block at top of Step 1 (extension — non-breaking) */
.govt-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.06), rgba(245, 158, 11, 0.025));
  border: 1px solid rgba(251, 191, 36, 0.20);
}
.govt-block-title {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: #fbbf24;
  margin-bottom: 8px;
}
.govt-block-title svg { color: #f59e0b; }
.govt-block .form-grid.compact { gap: 8px 12px; }

/* ─── Light theme overrides ─────────────────────────────────────────────── */
[data-theme="light"] .modal-backdrop { background: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .modal-container {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(40, 25, 10, 0.12);
  color: var(--text-primary);
  box-shadow: 0 40px 90px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .modal-header,
[data-theme="light"] .modal-footer {
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .project-code {
  color: var(--text-secondary);
  background: rgba(40, 25, 10, 0.05);
}
[data-theme="light"] .preview-btn {
  color: var(--text-secondary);
  background: rgba(40, 25, 10, 0.05);
}
[data-theme="light"] .close-btn { color: var(--text-secondary); }
[data-theme="light"] .close-btn:hover { color: var(--text-primary); }
[data-theme="light"] .progress-bar { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .step-dot .dot {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(40, 25, 10, 0.20);
  color: var(--text-secondary);
}
[data-theme="light"] .step-dot.active .step-name,
[data-theme="light"] .step-dot.completed .step-name { color: var(--text-primary); }
[data-theme="light"] .step-name { color: var(--text-secondary); }
[data-theme="light"] label {
  color: var(--text-secondary);
}
[data-theme="light"] .input-sm,
[data-theme="light"] .textarea-sm,
[data-theme="light"] .select-sm {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .input-sm:focus,
[data-theme="light"] .textarea-sm:focus,
[data-theme="light"] .select-sm:focus {
  background: rgba(255, 246, 226, 0.95);
  border-color: var(--input-focus);
}
[data-theme="light"] .type-btn {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .type-btn:hover:not(.active) {
  background: rgba(40, 25, 10, 0.08);
  color: var(--text-primary);
}
[data-theme="light"] .type-btn.active {
  background: rgba(29, 78, 216, 0.12);
  border-color: rgba(29, 78, 216, 0.40);
  color: #1d4ed8;
}
[data-theme="light"] .preview-value {
  background: rgba(40, 25, 10, 0.04);
  color: var(--text-primary);
}
[data-theme="light"] .info-row,
[data-theme="light"] .info-box {
  background: rgba(40, 25, 10, 0.04);
}
[data-theme="light"] .info-label { color: var(--text-secondary); }
[data-theme="light"] .info-value { color: var(--text-primary); }
[data-theme="light"] .summary-mini {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .sum-label { color: var(--text-secondary); }
[data-theme="light"] .sum-value { color: var(--text-primary); }
[data-theme="light"] .sum-value.highlight { color: #b45309; }
[data-theme="light"] .btn-nav { color: var(--text-secondary); }
[data-theme="light"] .btn-nav:hover {
  background: rgba(40, 25, 10, 0.08);
  color: var(--text-primary);
}
[data-theme="light"] .step-indicator { color: var(--text-tertiary); }
[data-theme="light"] .btn-action.save {
  background: rgba(40, 25, 10, 0.08);
  color: var(--text-primary);
}
[data-theme="light"] .btn-action.save:hover { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .govt-block {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.10), rgba(245, 158, 11, 0.06));
  border-color: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .govt-block-title { color: #92400e; }
[data-theme="light"] .govt-block-title svg { color: #b45309; }
[data-theme="light"] .status-badge.draft {
  background: rgba(75, 65, 55, 0.10);
  color: #44362a;
  border-color: rgba(75, 65, 55, 0.28);
}
[data-theme="light"] .status-badge.pending {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .status-badge.approved,
[data-theme="light"] .status-badge.completed {
  background: rgba(5, 150, 105, 0.14);
  color: #047857;
  border-color: rgba(5, 150, 105, 0.32);
}
[data-theme="light"] .status-badge.rejected {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.32);
}

/* ╔══════════════════════════════════════════════════════════════╗ */
/* ║ LIGHT THEME — Ultra-modern preview mode (warm cream glass)  ║ */
/* ╚══════════════════════════════════════════════════════════════╝ */
[data-theme="light"] .preview-backdrop-bg {
  background:
    radial-gradient(ellipse at 30% 20%, rgba(217, 119, 6, 0.20), transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(180, 83, 9, 0.18), transparent 60%),
    rgba(40, 25, 10, 0.42);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

[data-theme="light"] .orb-1 {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.32), transparent 65%);
  opacity: 0.65;
}
[data-theme="light"] .orb-2 {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.28), transparent 65%);
  opacity: 0.6;
}
[data-theme="light"] .orb-3 {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.22), transparent 65%);
  opacity: 0.5;
}

[data-theme="light"] .modal-container.preview-mode {
  background:
    linear-gradient(135deg, rgba(255, 250, 240, 0.78) 0%, rgba(252, 240, 220, 0.92) 100%);
  border: 1px solid rgba(217, 119, 6, 0.18);
  box-shadow:
    0 50px 100px -20px rgba(120, 60, 10, 0.28),
    0 0 80px -20px rgba(217, 119, 6, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -1px 0 rgba(120, 60, 10, 0.06);
}

[data-theme="light"] .modal-container.preview-mode::before {
  background: conic-gradient(from 0deg,
    rgba(217, 119, 6, 0.55) 0%,
    rgba(245, 158, 11, 0.10) 25%,
    rgba(217, 119, 6, 0.45) 50%,
    rgba(245, 158, 11, 0.10) 75%,
    rgba(217, 119, 6, 0.55) 100%);
  opacity: 0.6;
}

[data-theme="light"] .modal-container.preview-mode::after {
  background: radial-gradient(380px circle at var(--mx) var(--my),
    rgba(217, 119, 6, 0.14), transparent 60%);
}

[data-theme="light"] .modal-container.preview-mode .modal-header {
  border-bottom: 1px solid rgba(217, 119, 6, 0.12);
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.4), transparent);
}

[data-theme="light"] .modal-container.preview-mode .project-code {
  color: #b45309;
  background: rgba(217, 119, 6, 0.10);
  border: 1px solid rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .modal-container.preview-mode .project-code::after {
  background: linear-gradient(110deg, transparent 30%, rgba(217, 119, 6, 0.30) 50%, transparent 70%);
}

[data-theme="light"] .modal-container.preview-mode .status-badge {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(245, 158, 11, 0.10)) !important;
  color: #92400e !important;
  border: 1px solid rgba(217, 119, 6, 0.36) !important;
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .modal-container.preview-mode .status-badge.approved,
[data-theme="light"] .modal-container.preview-mode .status-badge.completed {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.20), rgba(16, 185, 129, 0.10)) !important;
  color: #047857 !important;
  border-color: rgba(5, 150, 105, 0.38) !important;
  box-shadow: 0 0 14px rgba(5, 150, 105, 0.18);
}
[data-theme="light"] .modal-container.preview-mode .status-badge.rejected {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.16), rgba(239, 68, 68, 0.08)) !important;
  color: #991b1b !important;
  border-color: rgba(220, 38, 38, 0.38) !important;
  box-shadow: 0 0 14px rgba(220, 38, 38, 0.16);
}

[data-theme="light"] .modal-container.preview-mode .mode-label {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(245, 158, 11, 0.08));
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.32);
}

[data-theme="light"] .modal-container.preview-mode .close-btn {
  background: rgba(120, 60, 10, 0.05);
  border: 1px solid rgba(120, 60, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .modal-container.preview-mode .close-btn:hover {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.35);
  color: #991b1b;
}

[data-theme="light"] .modal-container.preview-mode .step-bar {
  border-bottom: 1px solid rgba(217, 119, 6, 0.10);
  background: linear-gradient(180deg, transparent, rgba(217, 119, 6, 0.03));
}
[data-theme="light"] .modal-container.preview-mode .step-line-bg {
  background: rgba(120, 60, 10, 0.10);
}
[data-theme="light"] .modal-container.preview-mode .step-line-progress {
  background: linear-gradient(90deg, #d97706, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.5);
}
[data-theme="light"] .modal-container.preview-mode .step-line-progress::after {
  background: #d97706; box-shadow: 0 0 10px rgba(217, 119, 6, 0.7);
}
[data-theme="light"] .modal-container.preview-mode .step-dot .dot {
  background: rgba(255, 250, 240, 0.95);
  border: 1.5px solid rgba(120, 60, 10, 0.18);
  color: #6b5840;
}
[data-theme="light"] .modal-container.preview-mode .step-dot.active .dot {
  border-color: #d97706; color: #b45309;
  background: rgba(217, 119, 6, 0.10);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.14), 0 0 16px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .modal-container.preview-mode .step-dot.completed .dot {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #d97706; color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .modal-container.preview-mode .step-name { color: #8c6d4a; }
[data-theme="light"] .modal-container.preview-mode .step-dot.active .step-name { color: #92400e; }
[data-theme="light"] .modal-container.preview-mode .step-dot.completed .step-name { color: #b45309; }

[data-theme="light"] .modal-container.preview-mode .modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.4), rgba(245, 158, 11, 0.2));
}

[data-theme="light"] .modal-container.preview-mode label {
  color: rgba(146, 64, 14, 0.78);
}
[data-theme="light"] .modal-container.preview-mode label svg {
  color: #b45309;
  filter: drop-shadow(0 0 4px rgba(217, 119, 6, 0.25));
}

[data-theme="light"] .modal-container.preview-mode .preview-value {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(217, 119, 6, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .modal-container.preview-mode .field-group:hover .preview-value {
  border-bottom-color: rgba(217, 119, 6, 0.35);
}

[data-theme="light"] .modal-container.preview-mode .hero-name {
  background: linear-gradient(135deg, #1a0f00 30%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  border-bottom: 1px solid rgba(217, 119, 6, 0.16);
}
[data-theme="light"] .modal-container.preview-mode .hero-desc {
  color: rgba(60, 40, 20, 0.78);
  border-bottom: 1px solid rgba(217, 119, 6, 0.10);
}

[data-theme="light"] .modal-container.preview-mode .hero-budget {
  background: linear-gradient(135deg, #b45309 0%, #d97706 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  border-bottom: 1px solid rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .modal-container.preview-mode .hero-budget-glow {
  background: radial-gradient(ellipse, rgba(217, 119, 6, 0.35), transparent 65%);
}

[data-theme="light"] .modal-container.preview-mode .info-box {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(245, 158, 11, 0.03));
  border: 1px solid rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .modal-container.preview-mode .info-box::before {
  background: linear-gradient(180deg, #d97706, transparent);
}
[data-theme="light"] .modal-container.preview-mode .info-row svg { color: #b45309; }
[data-theme="light"] .modal-container.preview-mode .info-label { color: rgba(146, 64, 14, 0.7); }
[data-theme="light"] .modal-container.preview-mode .info-value { color: var(--text-primary); }

[data-theme="light"] .modal-container.preview-mode .duration-chip {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(245, 158, 11, 0.08));
  border: 1px solid rgba(217, 119, 6, 0.30);
  color: #92400e;
  box-shadow: 0 0 16px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .modal-container.preview-mode .duration-chip svg { color: #b45309; }

[data-theme="light"] .modal-container.preview-mode .summary-mini {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(245, 158, 11, 0.04));
  border: 1px solid rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .modal-container.preview-mode .summary-mini::before {
  background: linear-gradient(120deg, transparent 40%, rgba(217, 119, 6, 0.10) 50%, transparent 60%);
}
[data-theme="light"] .modal-container.preview-mode .sum-label { color: rgba(146, 64, 14, 0.78); }
[data-theme="light"] .modal-container.preview-mode .sum-value { color: var(--text-primary); }
[data-theme="light"] .modal-container.preview-mode .sum-value.highlight {
  background: linear-gradient(135deg, #b45309, #d97706);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}

[data-theme="light"] .modal-container.preview-mode .govt-block {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.10), rgba(245, 158, 11, 0.04));
  border: 1px solid rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .modal-container.preview-mode .govt-block::before {
  background: linear-gradient(90deg, transparent, #d97706, transparent);
}
[data-theme="light"] .modal-container.preview-mode .govt-block-title { color: #92400e; }
[data-theme="light"] .modal-container.preview-mode .govt-block-title svg {
  color: #b45309;
  filter: drop-shadow(0 0 4px rgba(217, 119, 6, 0.4));
}

[data-theme="light"] .modal-container.preview-mode .modal-footer {
  border-top: 1px solid rgba(217, 119, 6, 0.12);
  background: linear-gradient(0deg, rgba(217, 119, 6, 0.03), transparent);
}
[data-theme="light"] .modal-container.preview-mode .btn-nav {
  background: rgba(217, 119, 6, 0.06);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #b45309;
}
[data-theme="light"] .modal-container.preview-mode .btn-nav:hover {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.45);
  color: #92400e;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .modal-container.preview-mode .step-indicator {
  color: rgba(146, 64, 14, 0.7);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .modal-container.preview-mode,
  .modal-container.preview-mode *,
  .modal-container.preview-mode::before,
  .modal-container.preview-mode::after,
  .ambient-orbs .orb {
    animation: none !important;
    transition: none !important;
  }
}
</style>
