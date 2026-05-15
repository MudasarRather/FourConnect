<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-panel">
          
          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <h2>New Milestone</h2>
              <p>Create a checkpoint for the project.</p>
            </div>
            <button class="close-btn" @click="close">
              <X :size="20" />
            </button>
          </div>

          <!-- Progress -->
          <div class="progress-bar-container">
            <div class="progress-track">
               <div class="progress-fill" :style="{ width: ((currentStep / 3) * 100) + '%' }"></div>
            </div>
            <div class="step-meta">
              <span class="step-label">Step {{ currentStep }}</span>
              <span class="step-total">of 3</span>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            
            <!-- STEP 1: Basics -->
            <div v-if="currentStep === 1" class="step-content">
              <!-- Name -->
              <div class="form-group">
                <label>Milestone Name <span class="req">*</span></label>
                <input 
                  v-model="form.name" 
                  type="text" 
                  maxlength="40"
                  placeholder="e.g. Design Approval" 
                  class="text-input"
                  :class="{ 'has-error': errors.name }"
                  autofocus
                />
                <span v-if="errors.name" class="err-msg">Name is required</span>
              </div>

              <!-- Priority (Custom Select) -->
              <div class="form-group">
                <label>Priority <span class="req">*</span></label>
                <CustomSelect 
                   v-model="form.priority" 
                   :options="priorityOptions"
                   placeholder="Select Priority"
                   labelKey="label"
                   valueKey="value"
                   :error="errors.priority"
                />
              </div>

              <!-- Dates (Custom DatePickers) -->
              <div class="row-group">
                <div class="form-group flex-1">
                  <label>Start Date <span class="req">*</span></label>
                  <DatePicker 
                     v-model="form.start_date" 
                     placeholder="Select Start" 
                     :error="errors.start_date"
                  />
                </div>
                <div class="form-group flex-1">
                  <label>Due Date <span class="req">*</span></label>
                  <DatePicker 
                     v-model="form.due_date" 
                     placeholder="Select Due Date" 
                     :minDate="form.start_date"
                     :error="errors.due_date"
                  />
                </div>
              </div>
              
              <!-- Type (Moved to Step 1) -->
              <div class="form-group mt-3">
                 <label>Milestone Type <span class="req">*</span></label>
                 <CustomSelect 
                    v-model="form.milestone_type"
                    :options="typeOptions"
                    placeholder="Select Type"
                    valueKey="value"
                    labelKey="value"
                    :error="errors.milestone_type"
                 />
              </div>

              <span v-if="errors.start_date || errors.due_date || errors.milestone_type" class="err-msg">Fields are required</span>

            </div>

            <!-- STEP 2: Tasks & Details -->
            <div v-else-if="currentStep === 2" class="step-content">
               
               <!-- Task Breakdown -->
               <div class="form-group">
                 <label>Task Breakdown</label>
                 <CompactTaskCreator v-model="form.tasks" />
                 <p class="hint">Define tasks to assist with tracking. Total time will be calculated automatically.</p>
               </div>

                <!-- Budget & Totals -->
                <div class="row-group">
                  <div class="form-group" style="flex: 2;">
                    <label>Budget <span class="req">*</span></label>
                    <div class="combo-input">
                     <div class="prefix-select">
                          <CustomSelect 
                            v-model="form.currency"
                            :options="currencyOptions"
                            valueKey="value"
                            labelKey="symbol"
                            placement="bottom"
                          />
                       </div>
                      <CustomNumberInput v-model="form.budget_amount" placeholder="0.00" :error="errors.budget_amount" />
                    </div>
                    <!-- Conversion Display -->
                    <div v-if="convertedAmount && form.currency !== (currency || 'USD')" class="conversion-pill">
                       <span class="approx">≈</span>
                       <span class="conv-val">{{ currency || 'USD' }} {{ formatNumber(convertedAmount) }}</span>
                       <span class="rate-info">({{ form.currency }} 1 = {{ (exchangeRate).toFixed(4) }})</span>
                    </div>

                    <!-- Currency Warning -->
                    <div v-if="form.currency !== (currency || 'USD')" class="currency-warning mt-2">
                        <AlertTriangle :size="14" />
                        <span>
                            Note: Conversion to Project Currency ({{ currency || 'USD' }}) will apply. 
                            It is recommended to use the original project currency to avoid exchange rate fluctuations.
                        </span>
                    </div>
                  </div>
                  
                  <!-- Computed Totals (Disabled) -->
                  <div class="form-group" style="flex: 1;">
                     <label>Est. Time</label>
                     <input :value="computedTotalTime" disabled class="text-input disabled-input" />
                  </div>
                  <div class="form-group" style="flex: 1.2;">
                     <label>Contribution</label>
                     <div class="input-wrapper-disabled">
                        <input :value="milestoneContributionProject" disabled class="text-input disabled-input" style="padding-right: 20px;" />
                        <span class="suffix">%</span>
                     </div>
                  </div>
                </div>
                <span v-if="errors.budget_amount" class="err-msg">Budget is required</span>
            </div>

            <!-- STEP 3: Assign & File -->
            <div v-else class="step-content">
               <!-- Assignment (Multi-Select) -->
               <div class="form-group">
                 <label>Assign To (Optional)</label>
                 
                 <CompactSelectionList
                    v-model="form.assigned_to_ids"
                    :options="assignableMembers"
                    emptyText="No team members available."
                 />

                 <p class="hint">Select team members to assign. If empty, it will be assigned to you.</p>
               </div>

               <!-- File Upload -->
               <div class="form-group">
                 <label>Attachment <span class="optional">(Optional)</span></label>
                 <FileUpload 
                    v-model="dummyFileModel"
                    accept=".pdf"
                    :maxSizeMB="5"
                    helperText="Project Specification (PDF) - Max 5MB"
                    @file-selected="onFileSelected"
                    @error="(msg) => addToast(msg, 'error')"
                    :error="errors.file"
                 />
                 <span v-if="errors.file" class="err-msg">{{ errors.file }}</span>
               </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button v-if="currentStep > 1" class="btn-text secondary" @click="currentStep--">Back</button>
            <button v-else class="btn-text secondary" @click="close">Cancel</button>

            <button v-if="currentStep < 3" class="btn-pill primary" @click="nextStep">
              <span>Next Step</span>
              <ArrowRight :size="16" />
            </button>
            <button v-else class="btn-pill primary" :disabled="isSubmitting" @click="handleSubmit">
              <Loader2 v-if="isSubmitting" :size="16" class="spin" />
              <span>{{ isSubmitting ? 'Creating...' : 'Create Milestone' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { X, Loader2, ArrowRight, AlertTriangle } from 'lucide-vue-next'
import axios from 'axios'

// Custom Components
import CustomSelect from '../ui/CustomSelect.vue'
import DatePicker from '../ui/CompactDatePicker.vue'
import CustomNumberInput from '../ui/CustomNumberInput.vue'
import FileUpload from '../ui/FileUpload.vue'
import PremiumMultiSelect from '../ui/PremiumMultiSelect.vue'
import CompactSelectionList from '../ui/CompactSelectionList.vue'
import CompactTaskCreator from '../ui/CompactTaskCreator.vue'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  modelValue: Boolean,
  projectId: String,
  token: String,
  teamMembers: { type: Array, default: () => [] },
  projectStartDate: String,
  projectEndDate: String,
  projectBudget: Number,
  budgetUtilized: Number,
  currency: String,
  currency: String,
  isAdmin: Boolean,
  currentUser: Object
})

const emit = defineEmits(['update:modelValue', 'created'])

// OPTIONS
const priorityOptions = [
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' }
]
const typeOptions = [
  { value: 'Deliverable' }, { value: 'Review' }, { value: 'Payment' }, 
  { value: 'Launch' }, { value: 'Meeting' }, { value: 'Other' }
]

// Fetch from API
const currencyOptions = ref([])

onMounted(async () => {
    try {
        const res = await axios.get('http://localhost:8000/api/settings/currencies', {
            headers: { Authorization: `Bearer ${props.token}` }
        })
        // Ensure options have 'value' key
        currencyOptions.value = (Array.isArray(res.data) ? res.data : []).map(c => ({
            ...c,
            value: c.code || c.iso_code || c.value,
            symbol: c.symbol || '$'
        }))
    } catch (e) {
         currencyOptions.value = [
          { value: 'USD', symbol: '$' }, { value: 'EUR', symbol: '€' },
          { value: 'GBP', symbol: '£' }, { value: 'INR', symbol: '₹' }
        ]
    }
})

// Team Members
const assignableMembers = computed(() => {
  if (!props.teamMembers) return []

  // 1. Get base members
  // If Admin, show everyone. If User, show team members (excluding other admins logic if needed, but simple filter is safer)
  const list = props.teamMembers
  
  // 2. Format
  const formatted = list.map(m => {
       const cleanName = (m.name || m.user_name || 'Unknown').split('(')[0].trim()
       // Fallback for ID if API returns user_id
       return { 
          id: m.id || m.user_id, 
          label: m.name || m.user_name, 
          initials: cleanName.split(' ').map(n => n[0]).filter(x => x).join('').substring(0, 2).toUpperCase() 
       }
    })

  // 3. Admin Self-Assign Override
  if (props.isAdmin && props.currentUser) {
      // Check if already in list
      const exists = formatted.find(x => x.id === props.currentUser.id)
      if (!exists) {
         // Create object for Admin self
         const adminObj = {
             id: props.currentUser.id,
             label: props.currentUser.full_name || 'Admin (You)',
             initials: (props.currentUser.full_name || 'Admin').substring(0, 2).toUpperCase()
         }
         formatted.unshift(adminObj)
      }
  }

  return formatted
})

const computedTotalTime = computed(() => {
    let totalMins = 0
    ;(form.tasks || []).forEach(t => {
        // Safe parse
        let val = parseInt(t.time_val) || 0
        if (t.unit === 'hours') val *= 60
        if (t.unit === 'days') val *= 60 * 8
        totalMins += val
    })
    
    if (totalMins === 0) return '0 min'
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const milestoneContributionProject = computed(() => {
    if (!props.projectBudget || props.projectBudget === 0) return '0.00'
    
    // Use converted amount (if currency differs) or raw budget
    const raw = parseFloat(form.budget_amount) || 0
    let val = raw
    
    // If currency differs, used convertedAmount (which is auto-updated by watcher)
    if (form.currency !== (props.currency || 'USD')) {
        val = convertedAmount.value || 0
    }
    
    const percent = (val / props.projectBudget) * 100
    
    // Precision: Show up to 4 decimals, but trim if integer-like
    // e.g. 3.33333 -> 3.3333
    return parseFloat(percent.toFixed(4)).toString() 
})

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const dummyFileModel = ref('') // Trigger clear
const { addToast } = useToast()

// Currency State
const exchangeRate = ref(1)
const convertedAmount = ref(0)
const isFetchingRate = ref(false)

const form = reactive({
  name: '', description: '', start_date: '', due_date: '',
  priority: '', milestone_type: '',
  estimated_time_val: '', estimated_time_unit: 'hours',
  budget_amount: '', currency: 'USD',
  assigned_to_ids: [], // Array
  tasks: [], // Array
  file: null
})

const errors = reactive({
  name: false, priority: false, start_date: false, due_date: false,
  milestone_type: false, description: false,
  estimated_time_val: false, budget_amount: false,
  file: null
})

// Watchers for Currency
import { watch } from 'vue'

watch(() => [form.currency, form.budget_amount], async ([newCurrency]) => {
    if (!newCurrency) return
    const base = props.currency || 'USD'
    
    // If same currency, 1:1
    if (newCurrency === base) {
        exchangeRate.value = 1
        convertedAmount.value = parseFloat(form.budget_amount) || 0
        return
    }

    try {
        isFetchingRate.value = true
        // FREE API: Open Exchange Rates (No key required for base use)
        const res = await axios.get(`https://open.er-api.com/v6/latest/${newCurrency}`)
        const rates = res.data.rates
        if (rates && rates[base]) {
            exchangeRate.value = rates[base]
            const amt = parseFloat(form.budget_amount) || 0
            convertedAmount.value = amt * exchangeRate.value
        }
    } catch (e) {
        console.error('Rate fetch failed', e)
    } finally {
        isFetchingRate.value = false
    }
})

// Sync Currency when Modal Opens
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        // Ensure default is distinct so watcher triggers if needed, but primarily set the value
        form.currency = props.currency || 'USD'
        // Also valid to reset other fields here if not relying solely on close() cleanup
    }
})

// Methods
const formatNumber = (val) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(val)
}

const toggleMember = (id) => {
  const index = form.assigned_to_ids.indexOf(id)
  if (index === -1) {
    form.assigned_to_ids.push(id)
  } else {
    form.assigned_to_ids.splice(index, 1)
  }
}

const getInitials = (name) => {
  if (!name) return '??'
  const clean = name.split('(')[0].trim()
  return clean.split(' ').map(n => n[0]).filter(x => x).join('').substring(0, 2).toUpperCase()
}

// Consistent colors for avatars
const getColor = (name) => {
    const colors = ['#fbbf24', '#f59e0b', '#f97316', '#d97706', '#fdba74', '#facc15']
    let hash = 0
    const clean = name ? name.split('(')[0].trim() : ''
    for(let i=0; i<clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
}

const close = () => {
  emit('update:modelValue', false)
  setTimeout(resetForm, 300)
}

const resetForm = () => {
  currentStep.value = 1
  dummyFileModel.value = ''
  Object.assign(form, {
    name: '', description: '', start_date: '', due_date: '',
    priority: '', milestone_type: '', 
    estimated_time_val: '', estimated_time_unit: 'hours',
    budget_amount: '', currency: props.currency || 'USD', 
    assigned_to_ids: [], file: null,
    tasks: []
  })
}

const onFileSelected = ({ file, setError }) => {
  form.file = file
  dummyFileModel.value = file.name // Update model to show success state in FileUpload
  errors.file = null
}

const nextStep = () => {
  // Step 1 Validation
  if (currentStep.value === 1) {
    errors.name = !form.name.trim()
    errors.priority = !form.priority
    errors.start_date = !form.start_date
    errors.due_date = !form.due_date
    errors.milestone_type = !form.milestone_type // Moved here

    if (errors.name || errors.priority || errors.start_date || errors.due_date || errors.milestone_type) {
       addToast('Please fill all required fields', 'error')
       return
    }

    // Name Length Validation
    if (form.name.length > 40) {
        addToast('Milestone name cannot exceed 40 characters', 'error')
        return
    }

    // Date Logic Validation
    const mStart = new Date(form.start_date)
    const mDue = new Date(form.due_date)
    const pStart = props.projectStartDate ? new Date(props.projectStartDate) : null
    const pEnd = props.projectEndDate ? new Date(props.projectEndDate) : null
    
    // 1. Strict Project Start Date Check (Applies to Admin too per request)
    if (pStart && mStart < pStart) {
       addToast(`Milestone cannot start before project (${new Date(pStart).toLocaleDateString()})`, 'error')
       return
    }

    if (!props.isAdmin) {
      if (mStart > mDue) {
         addToast('Start date cannot be after due date', 'error')
         return
      }
  
      // Validate Start Date >= Today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // Append time to force local interpretation of YYYY-MM-DD string
      const mStartLocal = new Date(form.start_date + 'T00:00:00')
  
      if (mStartLocal < today) {
         addToast('Start date cannot be in the past', 'error')
         return
      }
      
      // Project boundary checks... (omitted short version for brevity in diff, but must keep same logic!)
      // RE-INSERTING logic carefully
       if (pStart && mStart < pStart) {
          addToast(`Milestone cannot start before project (${new Date(pStart).toLocaleDateString()})`, 'error')
          return
       }
  
       if (pEnd && mDue > pEnd) {
          addToast(`Milestone cannot end after project (${new Date(pEnd).toLocaleDateString()})`, 'error')
          return
       }
    }
  }
  
  // Step 2 Validation
  if (currentStep.value === 2) {
    errors.budget_amount = !form.budget_amount || parseFloat(form.budget_amount) <= 0
    
    // Validate Tasks: Name and Time required
    const invalidTask = (form.tasks || []).find(t => !t.name.trim() || !t.time_val)
    if (invalidTask) {
        addToast('Please fill all fields (Name, Time) for all tasks', 'error')
        return
    }

    if (errors.budget_amount) {
        addToast('Budget must be greater than 0', 'error')
        return
    }

    // Budget Overflow Check (Frontend)
    if (!props.isAdmin) {
       const currentUsage = props.budgetUtilized || 0
       const totalBudget = props.projectBudget || 0
       
       // USE CONVERTED AMOUNT for validation
       const newAmountNormalized = convertedAmount.value || parseFloat(form.budget_amount) || 0
       
       const budgetCurrency = props.currency || 'USD'
       
       if (totalBudget > 0 && (currentUsage + newAmountNormalized > totalBudget)) {
           const remaining = Math.max(0, totalBudget - currentUsage)
           // Content Writer style message
           addToast(`Budget Limit Exceeded: This milestone (≈ ${budgetCurrency} ${formatNumber(newAmountNormalized)}) exceeds your remaining budget (${budgetCurrency} ${formatNumber(remaining)}). Contact an admin to increase the limit.`, 'error')
           return
       }
    }
  }

  currentStep.value++
}

const handleSubmit = async () => {
  // File is optional now
  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('priority', form.priority)
    formData.append('start_date', form.start_date)
    formData.append('due_date', form.due_date)
    formData.append('milestone_type', form.milestone_type)
    
    // Tasks (JSON)
    // Tasks (JSON) -- Auto-distribute weights since removed from UI
    if (form.tasks && form.tasks.length > 0) {
        const count = form.tasks.length
        const share = (100 / count).toFixed(2)
        const tasksWithWeight = form.tasks.map(t => ({
            ...t,
            weightage: share // Standard equal distribution
        }))
        formData.append('tasks', JSON.stringify(tasksWithWeight))
    }
    
    // Legacy calc (optional, pass 0/null to let backend overwrite)
    formData.append('estimated_hours', 0)

    formData.append('budget_amount', form.budget_amount || 0)
    formData.append('currency', form.currency)
    
    // NEW: Assigned To IDs (JSON)
    if (form.assigned_to_ids && form.assigned_to_ids.length > 0) {
        formData.append('assigned_to_ids', JSON.stringify(form.assigned_to_ids))
    }
    
    if (form.file) formData.append('file', form.file)

    await axios.post(
      `http://localhost:8000/api/projects/${props.projectId}/milestones`,
      formData,
      { headers: { 
          Authorization: `Bearer ${props.token}`,
          'Content-Type': 'multipart/form-data'
      } }
    )
    emit('created')
    addToast('Milestone created successfully', 'success')
    close()
  } catch (e) {
    console.error(e)
    let msg = e.response?.data?.detail || 'Failed to create milestone'
    // Cleaner error message for budget (strip 400 prefix if exists)
    if (msg.includes('Cannot create milestone:')) {
        msg = msg.split('Cannot create milestone:')[1].trim()
    }
    addToast(msg, 'error')
  } finally {
    isSubmitting.value = false
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
}

/* Glass Panel (Matches ConsoleHero/Landing) */
.glass-panel {
  background: rgba(30, 30, 33, 0.6); /* Slightly more opaque for modal */
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 12px 24px rgba(0,0,0,0.3);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  width: 100%; max-width: 500px;
  display: flex; flex-direction: column;
  overflow: visible; /* Fix DatePicker Clipping */
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Header */
.modal-header {
  padding: 24px 32px;
  display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.header-text h2 { font-size: 20px; font-weight: 600; color: #f5f5f7; margin: 0 0 4px 0; letter-spacing: -0.01em; }
.header-text p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

.close-btn { 
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.4);
  width: 32px; height: 32px; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
  cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.close-btn:hover { 
  background: rgba(255,255,255,0.1); 
  color: white; 
  transform: rotate(90deg); /* Subtle rotation */
}

/* Progress */
.progress-bar-container { padding: 20px 32px 0; display: flex; flex-direction: column; gap: 8px; }
.progress-track { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 2px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 8px rgba(245, 158, 11, 0.4); }

.step-meta { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.4); }
.step-label { color: #fbbf24; }

/* Body */
.modal-body { padding: 24px 32px 32px; min-height: 380px; }
.step-content { display: flex; flex-direction: column; gap: 20px; animation: slideIn 0.3s ease-out; }

/* Inputs */

.form-group { display: flex; flex-direction: column; gap: 8px; position: relative; }
.step-content > div:nth-child(1) { z-index: 50; }
.step-content > div:nth-child(2) { z-index: 40; }
.step-content > div:nth-child(3) { z-index: 30; }
.step-content > div:nth-child(4) { z-index: 20; }
.step-content > div:nth-child(5) { z-index: 10; }

.form-group label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: rgba(255,255,255,0.4); letter-spacing: 0.05em; margin-left: 2px; }
.req { color: #f5f5f7; }
.optional { color: rgba(255,255,255,0.2); text-transform: none; font-weight: 400; }

.text-input {
  background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  padding: 10px 12px; color: #f5f5f7; font-size: 13px; font-family: inherit; width: 100%;
  transition: 0.2s;
}
.text-input:focus { outline: none; border-color: #f59e0b; background: rgba(0,0,0,0.4); box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.10); }
.text-input.has-error { border-color: #ef4444; }
.textarea { resize: none; line-height: 1.5; }

.row-group { display: flex; gap: 16px; }
.flex-1 { flex: 1; }

.combo-input { display: flex; gap: 8px; align-items: center; }
.suffix-select, .prefix-select { width: 80px; flex-shrink: 0; }

.err-msg { font-size: 11px; color: #ef4444; margin-left: 2px; }
.hint { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-left: 2px; line-height: 1.4; }

/* Conversion Display */
.conversion-pill {
    margin-top: 8px;
    background: rgba(245, 158, 11, 0.10);
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: 6px;
    padding: 6px 10px;
    display: flex; align-items: center; gap: 6px;
    font-size: 11px;
    color: #fbbf24;
    width: fit-content;
}
.approx { opacity: 0.7; }
.conv-val { font-weight: 600; color: #fdba74; }
.rate-info { color: rgba(255,255,255,0.4); margin-left: 4px; font-size: 10px; }

/* Currency Warning */
.currency-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: rgba(245, 158, 11, 0.1); /* Amber/Orange tint */
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 11px;
    color: #fbbf24; /* Amber-400 */
    line-height: 1.4;
    margin-top: 8px;
}
.currency-warning span {
    opacity: 0.9;
}

/* Footer */
.modal-footer {
  padding: 24px 32px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(0,0,0,0.2);
  /* Ensure border radius is respected despite overflow: visible on parent */
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.btn-text.secondary { 
  background: none; border: none; color: rgba(255,255,255,0.5); 
  font-size: 13px; cursor: pointer; font-weight: 500; 
  transition: color 0.2s; padding: 8px 16px;
}
.btn-text.secondary:hover { color: white; }

/* Premium White Pill Button (Matches Landing Page) */
.btn-pill.primary {
  display: flex; align-items: center; gap: 8px;
  background: white; color: black;
  border: none; padding: 10px 24px; border-radius: 30px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-pill.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 255, 255, 0.2);
}
.btn-pill.primary:disabled { opacity: 0.7; cursor: wait; transform: none; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
@keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
::-webkit-scrollbar-track { background: transparent; }

.disabled-input {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.3);
    border-color: transparent;
    cursor: default;
}

.input-wrapper-disabled {
    position: relative;
}
.input-wrapper-disabled .suffix {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    color: rgba(255,255,255,0.3); font-size: 11px;
}
</style>
