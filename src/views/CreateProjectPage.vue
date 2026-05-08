<template>
  <div class="page-container">
    <div class="header">
      <h1>Create New Project</h1>
      <p class="subtitle">Initialize a new project with approval workflow</p>
    </div>

    <!-- Stepper Header -->
    <div class="stepper-header">
      <div 
        v-for="(step, index) in steps" 
        :key="index"
        class="step-item"
        :class="{ active: currentStep === index + 1, completed: currentStep > index + 1 }"
      >
        <div class="step-circle">
          <span v-if="currentStep > index + 1"><Check :size="16" /></span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step }}</span>
        <div class="step-line" v-if="index < steps.length - 1"></div>
      </div>
    </div>

    <div class="wizard-card">
      <form @submit.prevent>
        
        <!-- STEP 1: User Context -->
        <div v-show="currentStep === 1" class="step-content">
          <h3>User Info</h3>
          <p class="section-desc">Verify your details before proceeding. This will be logged in the audit trail.</p>
          
          <div class="form-grid">
            <div class="input-wrapper">
              <label class="floating-label">Full Name</label>
              <div class="readonly-field">
                <UserIcon :size="16" class="field-icon" />
                {{ user.full_name || 'Loading...' }}
              </div>
            </div>
            
            <div class="input-wrapper">
              <label class="floating-label">Employee ID</label>
              <div class="readonly-field">
                <Hash :size="16" class="field-icon" />
                {{ user.employee_code || 'N/A' }}
              </div>
            </div>

            <div class="input-wrapper">
              <label class="floating-label">Role</label>
              <div class="readonly-field">
                <Shield :size="16" class="field-icon" />
                {{ isSuperuser ? 'Super Admin' : 'Standard User' }}
              </div>
            </div>

             <div class="input-wrapper">
              <label class="floating-label">Department</label>
              <div class="readonly-field">
                <Building :size="16" class="field-icon" />
                {{ user.department || 'General' }}
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 2: Core Details -->
        <div v-show="currentStep === 2" class="step-content">
          <h3>Project Core Details</h3>
          <p class="section-desc">Define the primary attributes of the project.</p>

          <div class="form-grid">
            <div class="input-wrapper span-full" :class="{ 'has-error': errors.name }">
              <label class="floating-label">Project Name <span class="req">*</span></label>
              <input v-model="form.name" class="minimal-input" placeholder="e.g. Q4 Infrastructure Upgrade" />
              <ErrorText v-if="errors.name">{{ errors.name }}</ErrorText>
            </div>

            <div class="input-wrapper">
               <label class="floating-label">Project Code</label>
               <input :value="projectCode" class="minimal-input disabled-field" placeholder="Auto-generated" disabled />
            </div>

            <div class="input-wrapper" :class="{ 'has-error': errors.project_type }">
               <label class="floating-label">Project Type <span class="req">*</span></label>
               <CustomSelect 
                 v-model="form.project_type" 
                 :options="projectTypes" 
                 labelKey="name" 
                 valueKey="id"
                 placeholder="Select Type"
               />
               <ErrorText v-if="errors.project_type">{{ errors.project_type }}</ErrorText>
            </div>

            <div class="input-wrapper" :class="{ 'has-error': errors.cost_center }">
               <label class="floating-label">Cost Center <span class="req">*</span></label>
               <CustomSelect 
                 v-model="form.cost_center" 
                 :options="costCenters" 
                 labelKey="name" 
                 valueKey="id" 
                 placeholder="Select Cost Center"
                 searchable
               />
               <ErrorText v-if="errors.cost_center">{{ errors.cost_center }}</ErrorText>
            </div>

            <div class="input-wrapper" :class="{ 'has-error': errors.start_date }">
              <label class="floating-label">Start Date <span class="req">*</span></label>
              <DatePicker 
                v-model="form.start_date" 
                placeholder="Select start date"
                :minDate="todayDate"
                :error="errors.start_date"
              />
              <ErrorText v-if="errors.start_date">{{ errors.start_date }}</ErrorText>
            </div>

            <div class="input-wrapper" :class="{ 'has-error': errors.end_date }">
              <label class="floating-label">End Date <span class="req">*</span></label>
              <DatePicker 
                v-model="form.end_date" 
                placeholder="Select end date"
                :minDate="form.start_date || todayDate"
                :error="errors.end_date"
              />
              <ErrorText v-if="errors.end_date">{{ errors.end_date }}</ErrorText>
            </div>

            <!-- Duration Display -->
            <div v-if="projectDuration" class="duration-box span-full">
              <Clock :size="14" class="duration-icon" />
              <span class="duration-label">Project Duration:</span>
              <span class="duration-value">{{ projectDuration }}</span>
            </div>

            <div class="input-wrapper span-full" :class="{ 'has-error': errors.description }">
              <label class="floating-label">Description <span class="req">*</span></label>
              <textarea v-model="form.description" class="minimal-textarea" placeholder="Project goals and scope..."></textarea>
              <ErrorText v-if="errors.description">{{ errors.description }}</ErrorText>
            </div>

            <!-- Project Order PDF Upload -->
            <div class="input-wrapper span-full" :class="{ 'has-error': errors.project_order }">
              <label class="floating-label">Project Order (PDF) <span class="req">*</span></label>
              <div style="margin-top: 8px;">
                <FileUpload
                  v-model="form.project_order_path"
                  v-model:fileName="uploadedFileName"
                  label="Project Order (PDF)"
                  helperText="PDF (max. 5MB)"
                  accept=".pdf"
                  :maxSizeMB="5"
                  @file-selected="handleFileSelected"
                  @error="(msg) => errors.project_order = msg"
                  @remove="errors.project_order = ''"
                />
              </div>
              <ErrorText v-if="errors.project_order">{{ errors.project_order }}</ErrorText>
            </div>
          </div>
        </div>

        <!-- STEP 3: Financials -->
        <div v-show="currentStep === 3" class="step-content">
           <h3>Financial Overview</h3>
           <p class="section-desc">Estimate the required budget and classification.</p>

           <div class="form-grid">
             <div class="input-wrapper" :class="{ 'has-error': errors.budget_amount }">
               <label class="floating-label">Estimated Budget <span class="req">*</span></label>
               <CurrencyInput 
                 v-model="form.budget_amount" 
                 :currency="form.currency"
                 placeholder="0.00"
               />
               <ErrorText v-if="errors.budget_amount">{{ errors.budget_amount }}</ErrorText>
             </div>

             <div class="input-wrapper">
               <label class="floating-label">Currency</label>
               <CustomSelect 
                 v-model="form.currency" 
                 :options="currencies" 
                 labelKey="code" 
                 valueKey="code" 
               />
             </div>

             <div class="input-wrapper span-full" :class="{ 'has-error': errors.budget_type }">
               <label class="label-heading">Budget Classification <span class="req">*</span></label>
               <div class="radio-group">
                 <label class="radio-card" :class="{ active: form.budget_type === 'Capex' }">
                   <input type="radio" value="Capex" v-model="form.budget_type" />
                   <div class="radio-content">
                     <span class="radio-title">CAPEX</span>
                     <span class="radio-desc">Capital Expenditure (Long-term assets)</span>
                   </div>
                 </label>
                 <label class="radio-card" :class="{ active: form.budget_type === 'Opex' }">
                   <input type="radio" value="Opex" v-model="form.budget_type" />
                   <div class="radio-content">
                     <span class="radio-title">OPEX</span>
                     <span class="radio-desc">Operational Expenditure (Day-to-day)</span>
                   </div>
                 </label>
               </div>
             </div>
           </div>
        </div>

        <!-- Actions -->
        <div class="wizard-actions">
           <button 
             v-if="currentStep > 1" 
             class="btn-secondary" 
             @click="prevStep" 
             type="button"
           >
             Back
           </button>
           <div class="spacer"></div>
           
           <!-- Save Draft (only on Step 3) -->
           <button 
             v-if="currentStep === steps.length" 
             class="btn-draft" 
             @click="saveDraft" 
             type="button"
           >
             Save Draft
           </button>
           
           <button 
             v-if="currentStep < steps.length" 
             class="btn-primary" 
             @click="nextStep" 
             type="button"
           >
             Next Step <ChevronRight :size="16" />
           </button>
           <button 
             v-else 
             class="btn-submit" 
             @click="openPreview" 
             type="button"
           >
             Review & Submit <Check :size="16" />
           </button>
        </div>

      </form>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreview" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
           <h3>Confirm Project Creation</h3>
           <button class="close-btn" @click="showPreview = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
           <div class="review-grid">
             <div class="review-item">
               <span class="label">Project Name</span>
               <span class="value">{{ form.name }}</span>
             </div>
             <div class="review-item">
               <span class="label">Type</span>
               <span class="value">{{ getTypeName(form.project_type) }}</span>
             </div>
             <div class="review-item">
               <span class="label">Cost Center</span>
               <span class="value">{{ getCCName(form.cost_center) }}</span>
             </div>
             <div class="review-item">
               <span class="label">Budget</span>
               <span class="value">{{ form.currency }} {{ form.budget_amount?.toLocaleString() || '0' }} ({{ form.budget_type }})</span>
             </div>
             <div class="review-item">
               <span class="label">Duration</span>
               <span class="value">{{ projectDuration || 'Not set' }}</span>
             </div>
             <div class="review-item">
               <span class="label">Created Date</span>
               <span class="value">{{ createdDate }}</span>
             </div>
             <div class="review-item">
               <span class="label">Created By</span>
               <span class="value">{{ user.full_name || 'Current User' }}</span>
             </div>
           </div>
           <p class="modal-note" v-if="isSuperuser">
              <Info :size="14" /> 
              This project will be created and <b>automatically approved</b> since you are an administrator.
            </p>
            <p class="modal-note" v-else>
              <Info :size="14" /> 
              This project will be created in <b>Pending Approval</b> state. Admin approval is required before activation.
            </p>
        </div>
        <div class="modal-footer">
           <button class="btn-text" @click="showPreview = false">Cancel</button>
           <button class="btn-primary" @click="submitProject" :disabled="isSubmitting">
             <span v-if="!isSubmitting">Confirm Creation</span>
             <span v-else>Creating...</span>
           </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import CustomSelect from '../components/ui/CustomSelect.vue'
import ErrorText from '../components/ui/ErrorText.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import CurrencyInput from '../components/ui/CurrencyInput.vue'
import FileUpload from '../components/ui/FileUpload.vue'
import { Check, ChevronRight, User as UserIcon, Shield, Building, Hash, X, Info, Clock } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { success, error } = useToast()

// State
const currentStep = ref(1)
const steps = ['User Info', 'Core Details', 'Financials']
const showPreview = ref(false)
const isSubmitting = ref(false)
const isDataLoaded = ref(false)

// File upload state - reduced to just filename as component handles the rest
const uploadedFileName = ref('')

const user = ref({})
const isSuperuser = ref(false)
const projectCode = ref('')

// Generate project code
const generateProjectCode = () => {
  const prefix = 'PRJ'
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${year}${month}-${random}`
}

// Dropdown Data
const projectTypes = ref([])
const costCenters = ref([])
const currencies = ref([])

// Computed
const todayDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const projectDuration = computed(() => {
  if (!form.start_date || !form.end_date) return null
  const start = new Date(form.start_date)
  const end = new Date(form.end_date)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) return `${diffDays} days`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    const days = diffDays % 30
    return days > 0 ? `${months} months, ${days} days` : `${months} months`
  }
  const years = Math.floor(diffDays / 365)
  const months = Math.floor((diffDays % 365) / 30)
  return months > 0 ? `${years} years, ${months} months` : `${years} years`
})

const createdDate = computed(() => {
  return new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
})

// Form Data
const form = reactive({
  name: '',
  description: '',
  project_type: '',
  cost_center: '',
  start_date: '',
  end_date: '',
  budget_amount: '',
  currency: 'USD',
  budget_type: 'Capex',
  project_order_path: ''  // Path to uploaded PDF
})

const errors = ref({})

// Helpers
const getTypeName = (id) => projectTypes.value.find(p => p.id === id)?.name || id
const getCCName = (id) => costCenters.value.find(c => c.id === id)?.name || id

// API Calls
onMounted(async () => {
  const isAdminRoute = window.location.pathname.startsWith('/admin')
  const token = isAdminRoute ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  isSuperuser.value = isAdminRoute // Admin routes imply superuser
  
  if (!token) {
    console.warn('No auth token found. Redirecting to login.')
    error('Please log in to continue.')
    return
  }
  
  const headers = { Authorization: `Bearer ${token}` }
  
  try {
    // Fetch user info first
    const userRes = await axios.get('http://localhost:8000/api/auth/me', { headers })
    user.value = userRes.data
    console.log('User loaded:', user.value)
  } catch (e) {
    console.error('Failed to load user:', e.response?.status, e.message)
    error('Failed to load user data. Please log in again.')
    return
  }
  
  try {
    // Fetch settings data in parallel
    const [ptRes, ccRes, curRes] = await Promise.all([
      axios.get('http://localhost:8000/api/settings/project-types', { headers }),
      axios.get('http://localhost:8000/api/settings/cost-centers', { headers }),
      axios.get('http://localhost:8000/api/settings/currencies', { headers })
    ])
    
    projectTypes.value = ptRes.data
    costCenters.value = ccRes.data
    currencies.value = curRes.data
    
    isDataLoaded.value = true
    console.log('Wizard Data Loaded:', { types: projectTypes.value.length, ccs: costCenters.value.length })
    
  } catch (e) {
    console.error('Failed to load settings:', e.response?.status, e.message)
    error('Failed to load form data. Please refresh.')
  }
})

// Validation
const validateStep = (step) => {
   errors.value = {}
   let valid = true
   
   // Step 1 validation - ensure data is loaded
   if (step === 1) {
     if (!isDataLoaded.value) {
       error('Please wait for data to load or refresh the page.')
       return false
     }
   }
   
   if (step === 2) {
      if (!form.name.trim()) { errors.value.name = 'Project Name is required'; valid = false; }
      if (!form.project_type) { errors.value.project_type = 'Type is required'; valid = false; }
      if (!form.cost_center) { errors.value.cost_center = 'Cost Center is required'; valid = false; }
      if (!form.description || !form.description.trim()) { errors.value.description = 'Description is required'; valid = false; }
      
      // Date validation
      if (!form.start_date) { 
        errors.value.start_date = 'Start Date is required'; valid = false; 
      } else if (form.start_date < todayDate.value) {
        errors.value.start_date = 'Start Date cannot be in the past'; valid = false;
      }
      
      if (!form.end_date) { 
        errors.value.end_date = 'End Date is required'; valid = false; 
      } else if (form.start_date && form.end_date <= form.start_date) {
        errors.value.end_date = 'End Date must be after Start Date'; valid = false;
      }
      
      // Project Order PDF validation
      if (!form.project_order_path) {
        errors.value.project_order = 'Project Order PDF is required'; valid = false;
      }
    }
   
   if (step === 3) {
      const budgetValue = Number(form.budget_amount)
      if (!form.budget_amount || isNaN(budgetValue) || budgetValue <= 0) { errors.value.budget_amount = 'Budget amount is required and must be greater than 0'; valid = false; }
      if (!form.currency) { errors.value.currency = 'Currency is required'; valid = false; }
      if (!form.budget_type) { errors.value.budget_type = 'Budget type (Capex/Opex) is required'; valid = false; }
    }
   
   return valid
}

// Navigation
const nextStep = () => {
  if (validateStep(currentStep.value)) {
    // Generate project code when leaving Step 1
    if (currentStep.value === 1 && !projectCode.value) {
      projectCode.value = generateProjectCode()
    }
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

// Open preview only after validating Step 3
const openPreview = () => {
  if (validateStep(3)) {
    showPreview.value = true
  }
}

// Submit
const submitProject = async () => {
  isSubmitting.value = true
  const isAdmin = window.location.pathname.startsWith('/admin')
  const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  
  try {
    await axios.post('http://localhost:8000/api/projects/', form, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success('Project created successfully!')
    router.push(isAdmin ? '/admin/projects/adminprojects' : '/dashboard/projects/all')
  } catch (e) {
    if (e.response?.data?.detail) {
      error(e.response.data.detail)
    } else {
      error('Failed to create project')
    }
  } finally {
    isSubmitting.value = false
    showPreview.value = false
  }
}

// Save as Draft
const saveDraft = async () => {
  // Validate budget before saving draft
  if (!validateStep(3)) {
    return
  }
  
  const isAdmin = window.location.pathname.startsWith('/admin')
  const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  
  try {
    await axios.post('http://localhost:8000/api/projects/', {
      ...form,
      status: 'Draft'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success('Project saved as draft!')
    router.push(isAdmin ? '/admin/projects/adminprojects' : '/dashboard/projects/all')
  } catch (e) {
    if (e.response?.data?.detail) {
      error(e.response.data.detail)
    } else {
      error('Failed to save draft')
    }
  }
}

// File Upload Handler
const handleFileSelected = async ({ file, setUploading, setError }) => {
  setUploading(true)
  
  const isAdmin = window.location.pathname.startsWith('/admin')
  const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  const authHeaders = { Authorization: `Bearer ${token}` }

  try {
    // Delete previous file if exists
    if (form.project_order_path) {
      const oldFilename = form.project_order_path.split('/').pop()
      if (oldFilename) {
        try {
          await axios.delete(`http://localhost:8000/api/uploads/project-order/${oldFilename}`, {
            headers: authHeaders
          })
          console.log('Previous file deleted:', oldFilename)
        } catch (delErr) {
          console.warn('Failed to delete previous file:', delErr)
          // Continue with upload even if delete fails
        }
      }
    }

    const formData = new FormData()
    formData.append('file', file)

    const res = await axios.post('http://localhost:8000/api/uploads/project-order', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...authHeaders
      }
    })
    
    if (res.data.success) {
      form.project_order_path = res.data.file_path
      uploadedFileName.value = res.data.original_filename
      if (errors.value.project_order) delete errors.value.project_order
      success('Project Order uploaded successfully')
    }
  } catch (e) {
    console.error('Upload failed:', e)
    setError(e.response?.data?.detail || 'Failed to upload file')
    error(e.response?.data?.detail || 'Failed to upload file')
  } finally {
    setUploading(false)
  }
}

</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.header {
  margin-bottom: 40px;
  text-align: center;
}
.header h1 { font-size: 28px; font-weight: 700; color: #f5f5f5; margin-bottom: 8px; }
.subtitle { color: #8e8e93; font-size: 15px; }

/* Stepper */
.stepper-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40px;
}

.step-item {
  display: flex;
  align-items: center;
  position: relative;
}

.step-circle {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #2c2c2e;
  border: 2px solid #3a3a3c;
  color: #8e8e93;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  z-index: 2;
  transition: all 0.3s;
}

.step-label {
  margin-left: 10px;
  margin-right: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #8e8e93;
}

.step-line {
  width: 60px;
  height: 2px;
  background: #3a3a3c;
  margin-right: 20px;
}

/* Active/Completed States */
.step-item.active .step-circle {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.step-item.active .step-label { color: #f5f5f5; }

.step-item.completed .step-circle {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}
.step-item.completed .step-line { background: #3b82f6; }


/* Form Card */
.wizard-card {
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
}

.step-content h3 { font-size: 18px; font-weight: 600; color: #f5f5f5; margin-bottom: 6px; }
.section-desc { color: #8e8e93; font-size: 13px; margin-bottom: 24px; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.span-full { grid-column: span 2; }

/* Input Styles - Compact */
.input-wrapper { display: flex; flex-direction: column; gap: 4px; }
.floating-label { font-size: 10px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; }
.req { color: #ff453a; }

.minimal-input, .minimal-textarea {
  background: #121214;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  padding: 0 10px;
  color: #f5f5f5;
  font-size: 13px;
  transition: all 0.2s;
}
.minimal-input { height: 36px; }
.minimal-textarea { height: 70px; padding: 8px 10px; font-family: inherit; resize: vertical; }

.minimal-input:focus, .minimal-textarea:focus { border-color: #3b82f6; background: #000; outline: none; }
.minimal-input:disabled { opacity: 0.5; cursor: not-allowed; background: #0a0a0a; }

/* Disabled/Readonly Field Styling */
.disabled-field {
  background: #0a0a0a !important;
  border: 1px dashed #3a3a3c !important;
  color: #6e6e73 !important;
  cursor: not-allowed;
}

.readonly-field {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0a0a0a;
  border: 1px dashed #3a3a3c;
  border-radius: 6px;
  padding: 0 10px;
  color: #6e6e73;
  font-size: 13px;
}
.field-icon { color: #5e5e63; }

.hint { font-size: 10px; color: #6e6e73; }

/* Input with Icon Prefix */
.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  color: #6e6e73;
  pointer-events: none;
  z-index: 1;
}

.icon-input {
  padding-left: 32px !important;
}

/* Radio Group */
.radio-group { display: flex; gap: 12px; }
.radio-card {
  flex: 1;
  background: #121214;
  border: 1px solid #3a3a3c;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 0.2s;
}
.radio-card:hover { border-color: #666; }
.radio-card.active { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }

.radio-content { display: flex; flex-direction: column; }
.radio-title { font-weight: 600; color: #f5f5f5; font-size: 14px; }
.radio-desc { font-size: 12px; color: #8e8e93; }

/* Duration Display */
.duration-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  margin-top: 8px;
}

.duration-icon { color: #3b82f6; }
.duration-label { font-size: 12px; color: #8e8e93; }
.duration-value { font-size: 13px; font-weight: 600; color: #3b82f6; }

/* Actions */
.wizard-actions {
  display: flex;
  gap: 12px;
  margin-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 24px;
}
.spacer { flex: 1; }

.btn-primary, .btn-secondary {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border: none;
  transition: transform 0.1s;
}

.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-primary.success { background: #10b981; }
.btn-primary.success:hover { background: #059669; }

.btn-secondary { background: transparent; color: #8e8e93; border: 1px solid #3a3a3c; }
.btn-secondary:hover { color: #f5f5f5; border-color: #666; }

/* Draft Button */
.btn-draft {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: rgba(255, 149, 0, 0.1);
  color: #ff9500;
  border: 1px solid rgba(255, 149, 0, 0.3);
  transition: all 0.2s;
}
.btn-draft:hover {
  background: rgba(255, 149, 0, 0.2);
  border-color: #ff9500;
}

/* Submit Button */
.btn-submit {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  transition: all 0.2s;
}
.btn-submit:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
}

/* Modal */
.modal-backdrop {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000;
}
.modal-card {
  background: #1c1c1e;
  border: 1px solid #3a3a3c;
  border-radius: 16px;
  width: 500px;
  max-width: 90%;
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { font-size: 16px; font-weight: 600; color: #f5f5f5; }
.close-btn { background: none; border: none; color: #8e8e93; cursor: pointer; }

.modal-body { padding: 24px; }
.review-grid { display: grid; gap: 12px; margin-bottom: 20px; }
.review-item { display: flex; justify-content: space-between; font-size: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.review-item .label { color: #8e8e93; }
.review-item .value { color: #f5f5f5; font-weight: 500; }

.modal-note {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px; color: #93c5fd;
  display: flex; gap: 10px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; justify-content: flex-end; gap: 12px;
}
.btn-text { background: none; border: none; color: #8e8e93; font-weight: 600; cursor: pointer; }

/* Animation */
.fade-in { animation: fadeInUp 0.5s ease-out; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Error Text helper */
.error-text-component { font-size: 11px; color: #ff453a; display: block; margin-top: 4px; }
</style>
