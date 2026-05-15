<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div v-if="isOpen" class="modal-backdrop" @click.self="handleClose">
        <Transition name="modal-content" appear>
          <div v-if="isOpen" class="modal-container" :class="{ 'preview-mode': mode === 'view' }">
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
                  <div class="field-group full">
                    <label><FileText :size="12" /> Project Name</label>
                    <input
                      v-if="mode === 'edit'"
                      v-model="form.name"
                      class="input-sm"
                      placeholder="Project name"
                    />
                    <div v-else class="preview-value">{{ form.name || '-' }}</div>
                  </div>

                  <div class="field-group full">
                    <label><AlignLeft :size="12" /> Description</label>
                    <textarea 
                      v-if="mode === 'edit'" 
                      v-model="form.description" 
                      class="textarea-sm" 
                      rows="2"
                      placeholder="Brief description..."
                    ></textarea>
                    <div v-else class="preview-value desc">{{ form.description || 'No description' }}</div>
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
                  <div class="field-group">
                    <label><DollarSign :size="12" /> Budget Amount</label>
                    <CurrencyInput 
                      v-if="mode === 'edit'"
                      v-model="form.budget_amount" 
                      :currency="form.currency"
                      placeholder="0.00"
                    />
                    <div v-else class="preview-value budget">
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

/* ========================================= */
/* PREVIEW MODE STYLES (Glassmorphism) */
/* ========================================= */
.modal-container.preview-mode {
  background: rgba(20, 20, 20, 0.65); /* Dark Glass */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 12px 24px rgba(0,0,0,0.3);
  border-radius: 20px;
}

/* Neutral Code */
.modal-container.preview-mode .project-code {
  color: rgba(255, 255, 255, 0.7); 
  background: rgba(255, 255, 255, 0.05); 
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* White Status Badge with Icon */
.modal-container.preview-mode .status-badge {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  display: flex; align-items: center; gap: 6px;
}

/* White Preview Badge with Icon */
.modal-container.preview-mode .mode-label {
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  font-weight: 700;
  letter-spacing: 0.05em;
  display: flex; align-items: center; gap: 6px;
}

/* Yellow Accents for Steps */
.modal-container.preview-mode .step-dot.active .dot {
  border-color: #fbbf24; color: #fbbf24;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
}
.modal-container.preview-mode .step-line-progress { background: #fbbf24; }
.modal-container.preview-mode .step-dot.completed .dot { background: #fbbf24; border-color: #fbbf24; color: #000; }
.modal-container.preview-mode .step-dot.active .step-name { color: #fbbf24; }

/* Neutral Glass Fields */
.modal-container.preview-mode .preview-value {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #f4f4f5;
}
.modal-container.preview-mode .info-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.modal-container.preview-mode .modal-footer { border-top: 1px solid rgba(255, 255, 255, 0.05); }

/* Icons in Labels - Yellow Accent */
.modal-container.preview-mode label svg { color: #fbbf24; }

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
</style>
