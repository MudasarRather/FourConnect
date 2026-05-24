<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-panel">
          
          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <h2>Update Tracker</h2>
              <p>Record actual progress for {{ milestone?.name }}</p>
            </div>
            <button class="close-btn" @click="close">
              <X :size="20" />
            </button>
          </div>

          <!-- Progress -->
          <div class="progress-bar-container">
            <div class="progress-track">
               <div class="progress-fill" :style="{ width: ((currentStep / 2) * 100) + '%' }"></div>
            </div>
            <div class="step-meta">
              <span class="step-label">Step {{ currentStep }}</span>
              <span class="step-total">of 2</span>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            
             <!-- BLOCKING STATES -->
             <div v-if="isPendingAssignee" class="block-overlay">
                 <div class="block-content">
                    <div class="icon-circle warning">
                         <div class="pulse-ring"></div>
                         <Clock :size="24" />
                    </div>
                    <h3>Accept Invitation</h3>
                    <p>You must accept the milestone invitation before you can track progress.</p>
                    <button class="btn-pill primary" @click="handleAccept" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Accepting...' : 'Accept Invitation' }}
                    </button>
                 </div>
             </div>

             <div v-if="isDeclinedAssignee" class="block-overlay">
                 <div class="block-content">
                    <div class="icon-circle error">
                         <X :size="24" />
                    </div>
                    <h3>Invitation Declined</h3>
                    <p>You have declined this milestone and cannot update its progress.</p>
                 </div>
             </div>

             <div v-if="isExpired && !currentUser.is_superuser" class="block-overlay">
                 <div class="block-content">
                    <div class="icon-circle error">
                         <Clock :size="24" />
                    </div>
                    <h3>Milestone Expired</h3>
                    <p>The due date has passed. No further work can be recorded on this milestone.</p>
                 </div>
             </div>
             
             <!-- STEP 1: Task Checklist -->
             <!-- Only show if canEditTracker OR it's just view mode? But modal implies edit. -->
             <!-- We just hide content if blocked, overlay is absolute or takes flow. -->
             <div v-if="!canEditTracker && !isPendingAssignee && !isDeclinedAssignee && !currentUser?.is_superuser && !isCreator" class="block-overlay">
                 <!-- Fallback for non-assignees trying to edit? -->
                 <div class="block-content">
                    <p>You do not have permission to update this tracker.</p>
                 </div>
             </div>

             <div v-if="currentStep === 1 && !isPendingAssignee && !isDeclinedAssignee" class="step-content">
                <div class="form-group">
                   <label>Select Completed Tasks</label>
                   
                   <div v-if="localTasks.length === 0" class="empty-state">
                      <p>No tasks defined for this milestone.</p>
                   </div>

                   <div v-else class="task-list">
                      <div 
                        v-for="(task, idx) in localTasks" 
                        :key="idx"
                        class="task-item"
                        :class="{ 'completed': task.is_completed, 'disabled': task.is_completed && task.completed_by }"
                        @click="toggleTask(idx)"
                      >
                         <div class="checkbox">
                            <Check v-if="task.is_completed" :size="12" stroke-width="3" />
                         </div>
                         <div class="task-info">
                            <span class="task-name">{{ task.name }}</span>
                            <div class="task-sub-row">
                                <span v-if="task.completed_by" class="completion-info">
                                   Done by {{ task.completed_by.full_name }}
                                </span>
                                <span v-else class="text-muted">Pending</span>
                            </div>
                         </div>
                         
                         <!-- Est Time Column -->
                         <div class="task-metric-col">
                            <span class="metric-label">Est. Time</span>
                            <span class="metric-val">{{ formatTime(task.estimated_minutes) }}</span>
                         </div>
                         
                         <!-- Contribution Column -->
                         <div class="task-metric-col wide">
                             <div class="metric-row">
                                <span class="metric-label">Contribution</span>
                                <span class="metric-val">{{ task.weightage }}%</span>
                             </div>
                             <div class="contrib-bar-track">
                                <div class="contrib-bar-fill" :style="{ width: `${task.weightage}%` }"></div>
                             </div>
                         </div>
                      </div>
                   </div>
                   
                   <p class="hint">Mark at least one new task to proceed.</p>
                </div>
             </div>

             <!-- STEP 2: Details -->
             <div v-else class="step-content">
                 <!-- Actual Dates -->
                 <div class="row-group">
                    <div class="form-group flex-1">
                       <label>Actual Start Date</label>
                       <DatePicker 
                          v-model="form.actual_start_date" 
                          placeholder="Select Date" 
                          @update:modelValue="validateStartDate"
                       />
                    </div>
                    <div class="form-group flex-1">
                       <label>Actual End Date</label>
                       <DatePicker 
                          v-model="form.actual_end_date" 
                          placeholder="Select Date" 
                          @update:modelValue="validateEndDate"
                       />
                    </div>
                 </div>

                 <!-- Delay Reason (Conditional) -->
                 <transition name="slide-fade">
                    <div v-if="isDelayed" class="form-group mt-4">
                        <label class="text-warning">Delay Reason (Required)</label>
                        <input 
                           v-model="form.delay_reason"
                           type="text"
                           class="input-compact"
                           placeholder="Why did this start late?"
                        />
                    </div>
                 </transition>

                 <!-- Risk Level REMOVED -->

                 <!-- Remarks -->
                 <div class="form-group mt-4">
                    <label>Remarks</label>
                    <textarea 
                       v-model="form.remarks"
                       rows="3"
                       class="text-area"
                       placeholder="Add any additional notes or updates..."
                    ></textarea>
                 </div>
             </div>

          </div>

          <!-- Footer -->
          <div class="modal-footer">
             <button v-if="currentStep > 1" class="btn-text secondary" @click="currentStep--">Back</button>
             <button v-else class="btn-text secondary" @click="close">Cancel</button>

             <button v-if="currentStep < 2" class="btn-pill primary" @click="nextStep" :disabled="!hasNewProgress || !canEditTracker">
                <span>Next Step</span>
                <ArrowRight :size="16" />
             </button>
             <button v-else class="btn-pill primary" @click="save" :disabled="isSubmitting || !canEditTracker">
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span>{{ isSubmitting ? 'Saving...' : 'Update Tracker' }}</span>
             </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue'
import { X, Save, ArrowRight, Check, Loader2, Clock } from 'lucide-vue-next'
import DatePicker from '../ui/CompactDatePicker.vue'
import CustomSelect from '../ui/CustomSelect.vue'
import axios from 'axios'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  modelValue: Boolean,
  milestone: Object,
  currentUser: Object
})

const emit = defineEmits(['update:modelValue', 'refresh', 'updated']) // Added updated for accept flow
const { addToast } = useToast()

const isSubmitting = ref(false)
const currentStep = ref(1)
const showPendingBlock = ref(false)

const myAssignment = computed(() => {
    if (!props.currentUser || !props.milestone?.assignments) return null
    const myId = String(props.currentUser.id)
    return props.milestone.assignments.find(a => String(a.user_id) === myId)
})

const isExpired = computed(() => {
    if (!props.milestone?.due_date) return false
    // Strict comparison: If due date was yesterday, it's expired today.
    // If due date is today, it's NOT expired (until midnight).
    const due = new Date(props.milestone.due_date)
    const today = new Date()
    due.setHours(0,0,0,0)
    today.setHours(0,0,0,0)
    return due < today
})
  
const canEditTracker = computed(() => {
    // If Admin/Creator -> True
    if (!props.currentUser) return false
    if (props.currentUser.is_superuser) return true

    // Strict Expiry check (Admins can override in backend, but let's block UI for consistency unless superuser)
    if (isExpired.value && !props.currentUser.is_superuser) return false

    // Stringify both sides — created_by_id and currentUser.id can be UUID/string mix
    if (String(props.milestone?.created_by_id) === String(props.currentUser.id)) return true

    // If Assignee -> Check status
    if (myAssignment.value) {
        return ['in_progress', 'completed'].includes(myAssignment.value.status)
    }
    return false
})

// Stringified comparison helper for template — also fixes the "no permission" overlay
const isCreator = computed(() => {
    if (!props.currentUser || !props.milestone) return false
    return String(props.milestone.created_by_id) === String(props.currentUser.id)
})

const isPendingAssignee = computed(() => myAssignment.value?.status === 'pending')
const isDeclinedAssignee = computed(() => myAssignment.value?.status === 'declined')

const handleAccept = async () => {
    isSubmitting.value = true
    try {
         await axios.post(
           `http://localhost:8000/api/milestones/${props.milestone.id}/accept`,
           {},
           { headers: { Authorization: `Bearer ${localStorage.getItem('user_token')}` } }
         )
         addToast('Invitation accepted. You can now update progress.', 'success')
         emit('refresh') // Refresh data to get new status
         // We might simply need to close and reopen or force local state update?
         // Ideally refresh triggers re-fetch in parent which passes new milestone prop.
         // We can do a quick local fix to unblock UI immediately:
         if (myAssignment.value) myAssignment.value.status = 'in_progress'
    } catch (e) {
         addToast('Failed to accept: ' + (e.response?.data?.detail || e.message), 'error')
    } finally {
         isSubmitting.value = false
    }
}

const form = reactive({
   actual_start_date: '',
   actual_end_date: '',
   delay_reason: '',
   remarks: ''
})

const localTasks = ref([])

// Computed Logic
// hasNewProgress defined below

const isDelayed = computed(() => {
    if (!form.actual_start_date || !props.milestone?.start_date) return false
    
    const actual = new Date(form.actual_start_date)
    const plan = new Date(props.milestone.start_date)
    actual.setHours(0,0,0,0)
    plan.setHours(0,0,0,0)
    
    return actual > plan
})

const formatTime = (mins) => {
    if (!mins) return '0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const formatDate = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    return d.toLocaleDateString()
}

const toggleTask = (idx) => {
    const task = localTasks.value[idx]
    
    // Lock ONLY if it is completed AND has sign-off (Prevents locking reopened tasks or dirty data)
    if (task.is_completed && task.completed_by) return 

    task.is_completed = !task.is_completed
}

const validateStartDate = (val) => {
    if (!val) return
    
    // Parse input (YYYY-MM-DD) safely to Local Date Midnight
    const parts = val.split('-')
    const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    
    const today = new Date()
    today.setHours(0,0,0,0) // Local Midnight
    
    // 1. Cannot be in the future
    if (selected > today) {
         addToast('Invalid: Start Date cannot be a future date.', 'error')
         setTimeout(() => form.actual_start_date = '', 10)
         return
    }

    // 2. Cannot be before Milestone Planned Start Date
    if (props.milestone?.start_date) {
        const planned = new Date(props.milestone.start_date)
        planned.setHours(0,0,0,0)
        
        if (selected < planned) {
             addToast('Invalid: Actual Start Date cannot be before the Planned Start Date.', 'error')
             setTimeout(() => form.actual_start_date = '', 10)
        }
    }
}

const validateEndDate = (val) => {
    if (!val) return
    // Standard Check vs Due Date
    if (props.milestone?.due_date) {
        const selected = new Date(val)
        const due = new Date(props.milestone.due_date)
        selected.setHours(0,0,0,0); due.setHours(0,0,0,0)
        if (selected > due) {
             addToast('Warning: Actual End Date is past the Due Date.', 'error')
        }
    }
    
    // Check for Future Date
    const selected = new Date(val)
    const today = new Date()
    today.setHours(0,0,0,0); selected.setHours(0,0,0,0)
    
    if (selected > today) {
        addToast('Invalid: Actual End Date cannot be in the future.', 'error')
        setTimeout(() => form.actual_end_date = '', 10)
        return
    }

    // Logic against Actual Start Date
    if (form.actual_start_date) {
        const start = new Date(form.actual_start_date)
        start.setHours(0,0,0,0)
        
        if (selected < start) {
            addToast('Invalid: Actual End Date cannot be before Actual Start Date.', 'error')
            setTimeout(() => form.actual_end_date = '', 10)
        }
    }
}
const fetchFreshDetails = async () => {
    if (!props.milestone?.id) return
    try {
        const res = await axios.get(`http://localhost:8000/api/milestones/${props.milestone.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('user_token')}` }
        })
        // Update local form with fresh data
        const fresh = res.data
        form.actual_start_date = fresh.actual_start_date || ''
        form.actual_end_date = fresh.actual_end_date || ''
        // RESET: Do NOT populate remarks/reason from DB history, start fresh for new entry.
        form.delay_reason = ''
        form.remarks = ''
        
        // Update tasks merging with fresh state
        localTasks.value = (fresh.tasks || []).map(t => ({...t}))
    } catch (e) {
        // Fallback to props
        console.warn("Fetch failed, using props", e)
        initFromProps()
    }
}

const initFromProps = () => {
    if (!props.milestone) return
    form.actual_start_date = props.milestone.actual_start_date || ''
    form.actual_end_date = props.milestone.actual_end_date || ''
    // RESET: Do NOT populate remarks/reason
    form.delay_reason = ''
    form.remarks = ''
    localTasks.value = (props.milestone.tasks || []).map(t => ({...t}))
}

watch(() => props.modelValue, (isOpen) => {
   if (isOpen) {
      currentStep.value = 1
      if (props.milestone) {
          fetchFreshDetails() // Actual Real-Time Fetch
      }
   } else {
      // Clear on close
      form.actual_start_date = ''
      form.actual_end_date = ''
      form.delay_reason = ''
      form.remarks = ''
      localTasks.value = []
   }
}, { immediate: true })

// Duplicate removed

const hasNewProgress = computed(() => {
    // Check if any task is marked completed NOW that wasn't completed in the DB (no completed_by)
    return localTasks.value.some(t => t.is_completed && !t.completed_by)
})
const nextStep = () => {
    if (!hasNewProgress.value) {
        addToast('Please mark at least one new task as completed to proceed.', 'warning')
        return
    }
    currentStep.value++
}

const close = () => {
    emit('update:modelValue', false)
    setTimeout(() => currentStep.value = 1, 300)
}

const save = async () => {
   if (!props.milestone) return
   isSubmitting.value = true
   try {
      const formData = new FormData()
      if (form.actual_start_date) formData.append('actual_start_date', form.actual_start_date)
      if (form.actual_end_date) formData.append('actual_end_date', form.actual_end_date)
      if (form.delay_reason) formData.append('delay_reason', form.delay_reason)
      if (form.remarks) formData.append('remarks', form.remarks)
      
      // Serialize Tasks
      if (localTasks.value.length > 0) {
          // Identify newly completed tasks locally? Backend handles check, but we pass all
          formData.append('tasks', JSON.stringify(localTasks.value))
      }

      await axios.patch(`http://localhost:8000/api/milestones/${props.milestone.id}`, formData, {
         headers: { Authorization: `Bearer ${localStorage.getItem('user_token')}` } 
      })
      
      addToast('Tracker updated successfully', 'success')
      emit('refresh')
      close()
   } catch (e) {
      const msg = e.response?.data?.detail || 'Update failed'
      addToast(msg, 'error')
      console.error(e)
   } finally {
      isSubmitting.value = false
   }
}
</script>

<style scoped>
/* Reuse modal styles from CreateMilestoneModal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0, 0, 0, 0.6); 
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}

.glass-panel {
  background: #0f0f10; /* Pure dark for premium feel */
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 80px rgba(0,0,0,0.8), 0 12px 24px rgba(0,0,0,0.4);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column;
  overflow: visible; 
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  padding: 24px 32px;
  display: flex; justify-content: space-between; align-items: flex-start;
  /* No Border for cleaner look */
}
.header-text h2 { font-size: 20px; font-weight: 700; color: #f5f5f7; margin: 0 0 6px 0; letter-spacing: -0.01em; }
.header-text p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

.close-btn { 
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.4);
  width: 32px; height: 32px; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
  cursor: pointer; transition: 0.3s;
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: white; transform: rotate(90deg); }

/* Progress */
.progress-bar-container { padding: 0 32px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
.progress-track { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #007AFF; /* Apple Blue */ border-radius: 2px; transition: width 0.4s ease; }

.step-meta { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.3); }
.step-label { color: #007AFF; }

/* Body */
.modal-body { padding: 0 32px 32px; min-height: 380px; }
.step-content { display: flex; flex-direction: column; gap: 20px; animation: slideIn 0.3s ease-out; }

@keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

.form-group label { display: block; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.text-warning { color: #f59e0b !important; }

.text-area {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px; color: white; font-size: 14px;
  resize: vertical; outline: none; transition: border-color 0.2s; font-family: inherit;
}
.text-area:focus { border-color: #007AFF; background: rgba(255,255,255,0.05); }

.input-compact {
  width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 8px 12px; color: white; font-size: 13px; outline: none; transition: 0.2s;
}
.input-compact:focus { border-color: #f59e0b; background: rgba(255,255,255,0.05); }

.row-group { display: flex; gap: 16px; }
.flex-1 { flex: 1; }

.hint { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 12px; line-height: 1.4; }

/* Transitions */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease; max-height: 100px; opacity: 1; }
.slide-fade-enter-from, .slide-fade-leave-to { max-height: 0; opacity: 0; margin-top: 0; overflow: hidden; }


/* Task List - Premium Design */
.task-list { display: flex; flex-direction: column; gap: 12px; max-height: 280px; overflow-y: auto; padding-right: 4px; }
.task-item {
    display: flex; gap: 16px; align-items: flex-start;
    padding: 16px; border-radius: 16px;
    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
    cursor: pointer; transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.task-item:hover { 
    background: rgba(255,255,255,0.04); 
    border-color: rgba(255,255,255,0.1);
    transform: translateY(-1px);
}
.task-item.completed { 
    background: rgba(0, 122, 255, 0.05); 
    border-color: rgba(0, 122, 255, 0.2); 
}
.task-item.disabled { 
    opacity: 0.8; 
    cursor: default;
    background: rgba(255,255,255,0.01);
    border-color: rgba(255,255,255,0.04);
}
.task-item.disabled:hover { transform: none; }

.checkbox {
    min-width: 22px; height: 22px; border-radius: 6px;
    border: 2px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    margin-top: 2px;
}
.task-item:hover .checkbox { border-color: rgba(255,255,255,0.4); }
.task-item.completed .checkbox { 
    background: #007AFF; border-color: #007AFF; color: white; 
    transform: scale(1.05);
}

.task-info { display: flex; flex-direction: column; gap: 2px; flex: 2; min-width: 0; }
.task-name { font-size: 14px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-item.completed .task-name { opacity: 0.9; }

.task-sub-row { display: flex; align-items: center; height: 16px; }
.text-muted { color: rgba(255,255,255,0.2); font-size: 11px; font-style: italic; }

.task-metric-col { display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 0 8px; border-left: 1px solid rgba(255,255,255,0.05); }
.task-metric-col.wide { flex: 1.5; }

.metric-label { font-size: 9px; text-transform: uppercase; color: rgba(255,255,255,0.3); font-weight: 600; letter-spacing: 0.05em; }
.metric-val { font-size: 12px; color: rgba(255,255,255,0.8); font-family: 'SF Mono', monospace; }
.metric-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }

.contrib-bar-track { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 2px; }
.contrib-bar-fill { height: 100%; background: #f97316; border-radius: 2px; }

.completion-info { 
    color: #34C759; /* Apple Green */ 
    font-weight: 500; 
    font-size: 11px;
    letter-spacing: 0.01em;
}

/* Footer */
.modal-footer {
  padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(0,0,0,0.1);
  border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;
}

.btn-text.secondary { 
  background: none; border: none; color: rgba(255,255,255,0.5); 
  font-size: 13px; cursor: pointer; font-weight: 600; 
  transition: color 0.2s; padding: 10px 16px;
}
.btn-text.secondary:hover { color: white; }

.btn-pill.primary {
  display: flex; align-items: center; gap: 8px;
  background: white; color: black;
  border: none; padding: 12px 28px; border-radius: 30px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}
.btn-pill.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.2);
}
.btn-pill.primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); box-shadow: none; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }


/* Blocking Overlays */
.block-overlay {
    position: absolute; inset: 0; z-index: 50;
    background: rgba(15, 15, 16, 0.95);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    border-radius: 20px;
}
.block-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px; }
.block-content h3 { font-size: 18px; font-weight: 700; color: white; margin: 0; }
.block-content p { font-size: 14px; color: rgba(255,255,255,0.6); max-width: 260px; line-height: 1.5; margin: 0; }

.icon-circle { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; position: relative; }
.icon-circle.warning { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2); }
.icon-circle.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

.pulse-ring {
    position: absolute; inset: -4px; border-radius: 50%;
    border: 2px solid #fbbf24; opacity: 0.4;
    animation: pulseBig 2s infinite;
}
@keyframes pulseBig { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.5); opacity: 0; } }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

/* ═════════ LIGHT THEME OVERRIDES — frosted-glass cream, golden palette ═════ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
[data-theme="light"] .glass-panel {
  background: rgba(255, 250, 240, 0.62);
  border: 1px solid rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 40px 80px rgba(40, 25, 10, 0.26),
    0 12px 24px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
  color: var(--text-primary);
}
[data-theme="light"] .modal-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .header-text h2 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .header-text p { color: #6b5840; }
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.50);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}

[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .progress-fill {
  background: linear-gradient(90deg, #d97706, #b45309);
}
[data-theme="light"] .step-meta { color: #92400e; }
[data-theme="light"] .step-label { color: #b45309; }

[data-theme="light"] .form-group label { color: #b45309; }
[data-theme="light"] .text-warning { color: #c2410c !important; }

[data-theme="light"] .text-area,
[data-theme="light"] .input-compact {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .text-area::placeholder,
[data-theme="light"] .input-compact::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .text-area:focus,
[data-theme="light"] .input-compact:focus {
  background: rgba(255, 246, 226, 0.92);
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .hint { color: #6b5840; }

/* Task list — translucent cream cards with amber borders */
[data-theme="light"] .task-item {
  background: rgba(255, 250, 240, 0.45);
  border-color: rgba(217, 119, 6, 0.16);
}
[data-theme="light"] .task-item:hover {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .task-item.completed {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .task-item.disabled {
  background: rgba(40, 25, 10, 0.03);
  border-color: rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .checkbox {
  border-color: rgba(40, 25, 10, 0.30);
  background: rgba(255, 250, 240, 0.55);
}
[data-theme="light"] .task-item:hover .checkbox {
  border-color: rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .task-item.completed .checkbox {
  background: #d97706;
  border-color: #d97706;
  color: #fff;
}
[data-theme="light"] .task-name { color: var(--text-primary); }
[data-theme="light"] .text-muted { color: #92400e; }
[data-theme="light"] .task-metric-col {
  border-left-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .metric-label { color: #6b5840; }
[data-theme="light"] .metric-val { color: var(--text-primary); }
[data-theme="light"] .contrib-bar-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .contrib-bar-fill { background: #d97706; }
[data-theme="light"] .completion-info { color: #047857; }

[data-theme="light"] .empty-state { color: #6b5840; }
[data-theme="light"] .empty-state p { color: #92400e; }

/* Footer */
[data-theme="light"] .modal-footer {
  background: rgba(255, 250, 240, 0.35);
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .btn-text.secondary { color: #6b5840; }
[data-theme="light"] .btn-text.secondary:hover { color: #92400e; }

[data-theme="light"] .btn-pill.primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn-pill.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px rgba(217, 119, 6, 0.40);
  background: linear-gradient(135deg, #c2410c, #92400e);
}
[data-theme="light"] .btn-pill.primary:disabled {
  background: rgba(40, 25, 10, 0.14);
  color: rgba(26, 20, 16, 0.40);
  box-shadow: none;
}

/* Blocking overlay (e.g. "no permission") — cream frosted glass */
[data-theme="light"] .block-overlay {
  background: rgba(255, 250, 240, 0.85);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
}
[data-theme="light"] .block-content h3 { color: var(--text-primary); }
[data-theme="light"] .block-content p { color: #6b5840; }
[data-theme="light"] .icon-circle.warning {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.36);
}
[data-theme="light"] .icon-circle.error {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.30);
}
[data-theme="light"] .pulse-ring { border-color: #d97706; }

/* Scrollbar */
[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.30); }
[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: rgba(217, 119, 6, 0.50); }
[data-theme="light"] .close-btn:hover { color: var(--text-primary); }
[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(40, 25, 10, 0.20); }
[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: rgba(40, 25, 10, 0.35); }
</style>
