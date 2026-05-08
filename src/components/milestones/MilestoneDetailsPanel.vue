<template>
  <Teleport to="body">
    <Transition name="panel-slide">
      <div v-if="isOpen" class="panel-overlay" @click.self="close">
        <div class="panel-content glass-panel">
          
          <!-- Header -->
          <div class="panel-header">
            <div class="header-left">
              <div class="type-badge" v-if="milestone.milestone_type">{{ milestone.milestone_type }}</div>
              <div class="status-badge" :class="milestone.status">{{ formatStatus(milestone.status) }}</div>
              <!-- Premium Contribution Badge -->
              <MilestoneContributionBadge 
                 v-if="totalWeightage > 0 && !isEditing" 
                 :value="totalWeightage" 
              />
            </div>
            <button class="close-btn" @click="close">
              <X :size="20" />
            </button>
          </div>

          <!-- Assignment Status Banner (For Current User) -->
          <div v-if="myAssignment?.status === 'pending' && !isEditing" class="pending-banner">
             <div class="banner-content">
                <span v-if="isExpired">Invited (Expired)</span>
                <span v-else>You have been assigned this milestone.</span>
                
                <div class="banner-actions">
                   <button 
                      class="btn-sm success" 
                      @click="handleAccept" 
                      :disabled="isSubmitting || isExpired"
                      :title="isExpired ? 'Milestone has expired' : 'Accept'"
                   >
                     <Check :size="14" /> Accept
                   </button>
                   <button 
                      class="btn-sm danger" 
                      @click="() => { modalAction = 'decline'; showReasonModal = true; }" 
                      :disabled="isSubmitting || isExpired"
                      :title="isExpired ? 'Milestone has expired' : 'Decline'"
                   >
                     <XCircle :size="14" /> Decline
                   </button>
                </div>
             </div>
          </div>

          <div v-if="myAssignment?.status === 'declined' && !isEditing" class="declined-banner">
             <div class="banner-content error">
                <div class="flex-col">
                   <span class="font-bold">You declined this milestone</span>
                   <span class="reason-text">"{{ myAssignment.decline_reason }}"</span>
                </div>
                <button v-if="canModify" class="btn-sm secondary" @click="startEdit">
                     Reassign / Edit
                </button>
             </div>
          </div>

          <!-- Declined Reasons (Visible to Creator/Admin) -->
          <div v-if="canModify && declinedAssignments.length > 0 && !isEditing" class="declined-list-banner">
             <div class="banner-title">
                <XCircle :size="14" /> {{ declinedAssignments.length }} Member(s) Declined
             </div>
             <div v-for="assign in declinedAssignments" :key="assign.user_id">
                 <DeclineReasonItem 
                    :user="assign.user"
                    :reason="assign.decline_reason"
                    @view="openDeclineModal(assign)"
                 />
             </div>
          </div>

          <!-- Body -->
          <div class="panel-body">
            
             <!-- View Mode Header -->
             <div class="title-section" v-if="!isEditing">
               <h2>{{ milestone.name }}</h2>
               <!-- Task Preview -->
               <CompactTaskPreview :tasks="milestone.tasks" />
             </div>

             <!-- Edit Mode Header -->
              <div class="form-group" v-else>
                <label>Name</label>
                <input v-model="form.name" class="text-input" maxlength="40" />

                <label class="mt-4">Tasks Breakdown</label>
                <CompactTaskCreator v-model="form.tasks" />
              </div>


            <!-- Divider -->
            <div class="divider"></div>

            <!-- Details Grid -->
            <div class="details-grid">
              
              <!-- Priority -->
              <div class="detail-item">
                <label>Priority</label>
                <div v-if="!isEditing" class="value priority-tag" :class="milestone.priority">
                  <Flag :size="14" /> {{ milestone.priority }}
                </div>
                <CustomSelect 
                   v-else
                   v-model="form.priority" 
                   :options="priorityOptions"
                   labelKey="label"
                   valueKey="value"
                />
              </div>

              <!-- Due Date -->
              <div class="detail-item">
                <label>Due Date</label>
                <div v-if="!isEditing" class="value">
                  <Calendar :size="14" /> {{ formatDate(milestone.due_date) }}
                </div>
                 <DatePicker 
                     v-else
                     v-model="form.due_date" 
                     placeholder="Due Date"
                  />
              </div>

              <!-- Start Date -->
              <div class="detail-item">
                <label>Start Date</label>

                <div v-if="!isEditing" class="value">
                   <PlayCircle :size="14" class="text-emerald-400" /> 
                   {{ formatDate(milestone.start_date) || '—' }}
                </div>
                 <DatePicker 
                     v-else
                     v-model="form.start_date" 
                     placeholder="Start Date"
                  />
              </div>

              <!-- Budget -->
              <div class="detail-item">
                <label>Budget</label>
                <div v-if="!isEditing" class="value mono">
                  <CreditCard :size="14" class="text-amber-400" />
                  {{ milestone.currency }} {{ formatNumber(milestone.budget_amount) }}
                </div>
                 <div v-else class="combo-input">
                    <CustomSelect 
                      v-model="form.currency"
                      :options="currencies"
                      valueKey="value"
                      labelKey="symbol"
                      placement="top"
                      width="60px"
                    />
                    <CustomNumberInput v-model="form.budget_amount" />
                 </div>
              </div>

               <!-- Hours -->
              <div class="detail-item">
                <label>Est. Hours</label>

                <div v-if="!isEditing" class="value">
                   <Clock :size="14" class="text-blue-400" />
                   {{ formatHours(milestone.estimated_hours) }}
                </div>
                <template v-else>
                    <div v-if="form.tasks && form.tasks.length > 0" class="value readonly-time-input">
                        <span class="font-mono">{{ formattedTotalTime }}</span>
                        <Lock :size="12" class="opacity-50 ml-auto" />
                    </div>
                    <div v-else class="combo-input">
                       <CustomNumberInput v-model="form.estimated_time_val" placeholder="0" />
                       <div class="suffix-select" style="width: 80px;">
                          <CustomSelect 
                             v-model="form.estimated_time_unit"
                             :options="timeUnits"
                             valueKey="value"
                             labelKey="label"
                             placement="top"
                          />
                       </div>
                    </div>
                </template>
              </div>

               <!-- Milestone Type -->
              <div class="detail-item">
                 <label>Milestone Type</label>

                 <div v-if="!isEditing" class="value">
                    <Tag :size="14" class="text-purple-400" />
                    {{ milestone.milestone_type || 'Other' }}
                 </div>
                 <CustomSelect 
                    v-else
                    v-model="form.milestone_type" 
                    :options="typeOptions"
                    labelKey="value"
                    valueKey="value"
                 />
              </div>

               <!-- Assignees -->
               <div class="detail-item full-width">
                 <label>Assigned Team</label>
                 
                 <!-- View Mode: Compact Grid -->
                 <div v-if="!isEditing">
                   <div v-if="viewModeUsers.length > 0">
                      <CompactUserGrid :users="viewModeUsers" readonly />
                   </div>
                   <div v-else class="text-muted italic text-xs">Unassigned</div>
                 </div>

                 <!-- Edit Mode: Compact Grid -->
                 <div v-else>
                    <CompactUserGrid 
                       :model-value="form.assigned_to_ids"
                       :users="assignableMembers"
                       @update:model-value="handleGridUpdate"
                       @disabled-click="(u) => {
                           if (u.isCreator) {
                               addToast('The milestone creator cannot be removed.', 'error')
                           } else if (u.isPermanentLock) {
                               addToast('This user has declined twice and is permanently removed.', 'error')
                           } else if (u.isPendingLocked) {
                               addToast('This member has not accepted the milestone invitation yet.', 'error')
                           } else {
                               addToast('You cannot remove an Admin from the milestone.', 'error')
                           }
                       }"
                    />
                 </div>
               </div>

               <!-- Divider -->
               <div class="divider full-width"></div>

               <!-- Attachment (View Mode) -->
               <div class="detail-item full-width" v-if="!isEditing">
                 <label>Attachment</label>
                 <a v-if="milestone.file_path" :href="getFileUrl(milestone.file_path)" target="_blank" class="attachment-link">
                    <FileText :size="16" />
                    <span>View Attachment (PDF)</span>
                    <ExternalLink :size="12" class="ext-icon"/>
                 </a>
                 <div v-else class="no-attachment">
                    <span class="text-muted">No PDF attached</span>
                 </div>
               </div>

               <!-- Attachment (Edit Mode) -->
               <div class="detail-item full-width" v-else>
                 <label>Attachment (Edit)</label>
                 <div class="attachment-manager">
                    <div v-if="milestone.file_path" class="existing-file-card">
                       <div class="file-row">
                          <FileText :size="14" class="text-indigo-400"/>
                          <span class="file-name-scroll">{{ milestone.file_path.split('/').pop() }}</span>
                       </div>
                       <a :href="getFileUrl(milestone.file_path)" target="_blank" class="link-view">View</a>
                    </div>
                    
                    <div class="upload-wrapper">
                       <CompactFileUpload 
                          label="Select New PDF"
                          placeholder="No new file selected"
                          @file-selected="onCompactFileSelected"
                          @error="(msg) => addToast(msg, 'error')"
                          @clear="onCompactFileClear"
                       />
                    </div>
                 </div>
               </div>

            </div>
          
            <!-- System Meta -->
            <div class="meta-section" v-if="!isEditing">
               <p>Created by {{ milestone.created_by?.full_name }} on {{ formatDate(milestone.created_at) }}</p>
               <br>
               <div v-if="milestone.last_updated_by" class="last-updated">

                  <p class="highlight">Last updated by {{ milestone.last_updated_by.full_name }}</p>
                  <p class="summary" v-if="milestone.last_update_summary">"{{ milestone.last_update_summary }}"</p>
               </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="panel-footer">
            <template v-if="canModify"> 
               <button v-if="!isEditing" class="btn-text delete" @click="handleDelete">
                 <Trash2 :size="16" /> Delete
               </button>
               <button v-else class="btn-text secondary" @click="cancelEdit">Cancel</button>

               <button v-if="!isEditing" class="btn-pill primary" @click.stop="startEdit">
                 <Edit2 :size="14" /> Edit Milestone
               </button>
               <button v-else class="btn-pill primary" @click="handleSave" :disabled="isSubmitting">
                 <Save :size="14" /> {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
               </button>
            </template>
            <div v-else class="permission-note">
              <Lock :size="12" /> View Only
            </div>
          </div>

      </div>
      </div>
    </Transition>
  </Teleport>
  
     <!-- Inner Modal for Decline Reason -->
    <Transition name="fade">
      <div v-if="selectedDeclinedReason" class="inner-modal-overlay" @click.self="selectedDeclinedReason = null">
         <div class="inner-modal-card">
            <div class="modal-content-wrapper">
                <h3>Decline Reason</h3>
                <div class="user-header-large">
                    <XCircle :size="20" class="icon" />
                    <span>{{ selectedDeclinedUser }}</span>
                </div>
                <div class="reason-scroll">
                   {{ selectedDeclinedReason }}
                </div>
            </div>
            <div class="modal-actions">
                 <button class="btn-sm secondary" @click="selectedDeclinedReason = null">Close</button>
            </div>
         </div>
      </div>
    </Transition>

  <ReasonModal 
     v-model="showReasonModal" 
     :is-submitting="isSubmitting"
     :title="modalTitle"
     :description="modalDesc"
     :confirm-text="modalConfirmText"
     @confirm="handleReasonSubmit"
  />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { X, Calendar, Flag, Edit2, Save, Trash2, Lock, FileText, ExternalLink, Clock, PieChart, PlayCircle, CreditCard, Tag } from 'lucide-vue-next'
import axios from 'axios'

import CustomSelect from '../ui/CustomSelect.vue'
import DatePicker from '../ui/CompactDatePicker.vue'
import CustomNumberInput from '../ui/CustomNumberInput.vue'
import ReasonModal from './ReasonModal.vue'
import CompactFileUpload from '../ui/CompactFileUpload.vue'
import CompactUserGrid from '../ui/CompactUserGrid.vue'
import CompactTaskCreator from '../ui/CompactTaskCreator.vue'
import CompactTaskPreview from '../ui/CompactTaskPreview.vue'
import MilestoneContributionBadge from '../ui/MilestoneContributionBadge.vue'
import DeclineReasonItem from './DeclineReasonItem.vue'
import { Check, XCircle } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  isOpen: Boolean,
  milestone: { type: Object, default: () => ({}) },
  projectId: String,
  token: String,
  currentUser: Object, // Needed for permission check
  projectOwnerId: String,
  isAdmin: Boolean, // Explicit admin overrides
  teamMembers: { type: Array, default: () => [] },
  projectStartDate: String,
  projectEndDate: String
})

const emit = defineEmits(['close', 'updated', 'deleted'])

// State
const isEditing = ref(false)
const isSubmitting = ref(false)
const showReasonModal = ref(false)
const modalAction = ref('decline') // 'decline' or 'delete'
const selectedFile = ref(null)
const targetRemoveId = ref(null)

// Decline Reason Modal
const selectedDeclinedReason = ref(null)
const selectedDeclinedUser = ref('')

const openDeclineModal = (assign) => {
    selectedDeclinedReason.value = assign.decline_reason
    selectedDeclinedUser.value = assign.user?.full_name || 'Unknown'
}

const onCompactFileSelected = (file) => {
  selectedFile.value = file
}

const onCompactFileClear = () => {
  selectedFile.value = null
}

const modalTitle = computed(() => {
    if (modalAction.value === 'delete') return 'Delete Milestone'
    if (modalAction.value === 'remove') return 'Remove User'
    return 'Decline Milestone'
})
const modalDesc = computed(() => {
    if (modalAction.value === 'delete') return 'This action cannot be undone. Please provide a reason for deletion.'
    if (modalAction.value === 'remove') return 'Please confirm removal of this user from the milestone.'
    return 'Please provide a reason for declining this milestone assignment.'
})
const modalConfirmText = computed(() => {
    if (modalAction.value === 'delete') return 'Delete Milestone'
    if (modalAction.value === 'remove') return 'Remove User'
    return 'Decline Milestone'
})

const form = reactive({
  name: '', description: '',
  milestone_type: '', 
  priority: '', due_date: '', start_date: '',
  budget_amount: '', currency: 'USD',
  estimated_time_val: '', estimated_time_unit: 'hours',
  assigned_to_ids: [] // Array
})

const { addToast } = useToast()

const close = () => {
  emit('close')
  isEditing.value = false
  selectedFile.value = null
}

// Logic
const isExpired = computed(() => {
  // Completed milestones are NOT expired, they are done.
  if (props.milestone.status === 'completed') return false
  
  if (!props.milestone.due_date) return false
  const due = new Date(props.milestone.due_date)
  due.setHours(0,0,0,0)
  const today = new Date()
  today.setHours(0,0,0,0)
  return due < today
})

const formattedTotalTime = computed(() => {
    if (!form.tasks || form.tasks.length === 0) return '0m'
    
    let totalMins = 0
    form.tasks.forEach(t => {
        let val = parseInt(t.time_val) || 0
        if (t.unit === 'hours') val *= 60
        if (t.unit === 'days') val *= 60 * 8
        totalMins += val
    })
    
    if (totalMins === 0) return '0 min'
    
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
})

const totalWeightage = computed(() => {
   return props.milestone.contribution_percentage || 0
})

// Find assignment for current user
const myAssignment = computed(() => {
   if (!props.currentUser || !props.milestone.assignments) return null
   return props.milestone.assignments.find(a => a.user_id === props.currentUser.id)
})

const canModify = computed(() => {
  if (!props.currentUser) return false
  const isAdminUser = props.currentUser.is_superuser || props.isAdmin
  if (isAdminUser) return true 
  
  // Completed Milestones are IMMUTABLE (View Only)
  if (props.milestone.status === 'completed') return false
  
  if (isExpired.value) return false
  
  const isCreator = props.milestone.created_by_id === props.currentUser.id
  return isCreator
})

const isPending = computed(() => props.milestone.status === 'pending') // Overall status
const isDeclined = computed(() => props.milestone.status === 'declined') // Overall status? Or use assignment?

const declinedAssignments = computed(() => {
    if (!props.milestone.assignments) return []
    return props.milestone.assignments.filter(a => a.status === 'declined')
})

// Helpers for UI
const assignableMembers = computed(() => {
  return props.teamMembers
    .filter(m => {
       // Logic: Show all regular members.
       // For Admins: Show ONLY if they are already assigned (so we can show them as locked).
       // If current user is Admin, show all Admins (to add/remove).
       
       const canManageAdmins = (props.currentUser && props.currentUser.is_superuser) || props.isAdmin
       if (canManageAdmins) return true
       
       const isAdminMember = m.role === 'Admin' || m.is_superuser
       
       if (isAdminMember) {
           // Show only if already assigned
            if (props.milestone.assignments && props.milestone.assignments.some(a => a.user_id === m.id && a.status !== 'removed')) {
               return true
           }
           return false // Hide unassigned admins
       }
       return true
    })
    .map(m => {
        const canManageAdmins = (props.currentUser && props.currentUser.is_superuser) || props.isAdmin
        const isAdminMember = m.role === 'Admin' || m.is_superuser
        const isAssignedAdmin = isAdminMember && !canManageAdmins
        
        // Find assignment status
        const assignment = props.milestone.assignments ? props.milestone.assignments.find(a => String(a.user_id) === String(m.id)) : null
        const isPendingInvite = assignment && assignment.status === 'pending'
        
        // Check 2-Strike Lock
        const declineCount = assignment ? (assignment.decline_count || 0) : 0
        const isPermanentLock = declineCount >= 2
        
        const isCreator = props.milestone.created_by_id === m.id
        
        // Strict Lock in User View: 
        // 1. Locked if Pending (unless Admin)
        // 2. Locked if Permanent Lock (unless Admin) -> This implements the override logic!
        const lockPending = isPendingInvite && !props.isAdmin
        
        // Locked if Permanent Lock AND NOT Admin
        // This ensures Creator sees it checked (if assigned) but DISABLED (cannot remove).
        const lockBanned = isPermanentLock && !canManageAdmins
        
        let label = m.name
        if (m.role) label += ` (${m.role})`
        if (isCreator) label += ` (Creator)`
        if (isPendingInvite) label += ` - Pending`
        if (isPermanentLock) label = `${m.name} (Banned)`

        // Fix avatar glitch: Pass pure initials derived from name (clean) to override potential parentheses in label
        const cleanName = m.name.split('(')[0].trim()
        const initials = cleanName ? cleanName.split(' ').map(c => c[0]).filter(x => x).join('').substring(0, 2).toUpperCase() : '??'

        return { 
            id: m.id, 
            label: label,
            initials: initials,
            // Disabled if: Admin (assigned) OR Pending (Locked) OR Banned (Locked) OR Creator
            disabled: isAssignedAdmin || lockPending || lockBanned || isCreator,
            isCreator: isCreator,
            isPendingLocked: lockPending,
            isPermanentLock: isPermanentLock,
            declineCount: declineCount
        }
    })
})

const formatHours = (h) => {
    if (!h) return '0 hrs'
    const totalMins = Math.round(h * 60)
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
}

const viewModeUsers = computed(() => {
   if (!props.milestone.assignments) return []
    return props.milestone.assignments
       // Fix: Allow 2-strike users if actively assigned (Admin Override)
       .filter(a => ((a.decline_count || 0) < 2 || a.status === 'in_progress') && a.status !== 'removed')
       .map(a => ({
           id: a.user_id,
           label: a.user?.full_name || 'Unknown',
           status: a.status
       }))
})

// Intercept Grid Updates to trigger Modal Logic
const handleGridUpdate = (newIds) => {
    // Diff to find changed ID
    const oldIds = form.assigned_to_ids
    let changedId = null
    
    // Check for removal
    if (oldIds.length > newIds.length) {
        changedId = oldIds.find(id => !newIds.includes(id))
    } 
    // Check for addition
    else if (newIds.length > oldIds.length) {
        changedId = newIds.find(id => !oldIds.includes(id))
    }
    
    if (changedId) {
        // Use toggleMember to route through Modal logic
        // Note: toggleMember usually modifies form.assigned_to_ids directly.
        // Since we intercepted the event, form.assigned_to_ids is NOT YET updated.
        // So calling toggleMember is the correct action.
        toggleMember(changedId)
    }
}

// UI Methods for Edit Form
const toggleMember = (id) => {
  const index = form.assigned_to_ids.indexOf(id)
  if (index === -1) {
    form.assigned_to_ids.push(id)
  } else {
    // FORCE MODAL for all removals (User Request + Debugging)
    const userAssign = props.milestone.assignments?.find(a => String(a.user_id) === String(id))
    
    // Check if it's the Creator (Still block removal of creator)
    if (userAssign?.isCreator) { 
        // Let standard Toast handle it or add check here
        // But for now, just show modal, handle "Delete" separate
    }

    // Force Modal
    targetRemoveId.value = id
    modalAction.value = 'remove'
    showReasonModal.value = true
    return
  }
}

// Consistent colors for avatars
const getColor = (name) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']
    let hash = 0
    if (name) {
        for(let i=0; i<name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

// Options
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

const currencies = [
  { symbol: '$', value: 'USD' },
  { symbol: '€', value: 'EUR' },
  { symbol: '£', value: 'GBP' },
  { symbol: '₹', value: 'INR' }
]

const timeUnits = [
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
  { label: 'Months', value: 'months' }
]

const startEdit = () => {
  // Logic to guess best unit
  let hours = props.milestone.estimated_hours || 0
  let unit = 'hours'
  let val = hours
  
  if (hours > 0 && hours % 160 === 0) {
    unit = 'months'
    val = hours / 160
  } else if (hours > 0 && hours % 8 === 0) {
    unit = 'days'
    val = hours / 8
  }

  // Populate IDs
  let currentIds = []
  if (props.milestone.assignments) {
      // Filter out 'declined' checks so they appear unselected (removed on save if untouched)
      currentIds = props.milestone.assignments
        .filter(a => a.status !== 'declined' && a.status !== 'removed')
        .map(a => a.user_id)
  } else if (props.milestone.assigned_to_id) {
      currentIds = [props.milestone.assigned_to_id] // Fallback
  }

  Object.assign(form, {
    name: props.milestone.name,
    description: props.milestone.description,
    milestone_type: props.milestone.milestone_type || 'Other',
    priority: props.milestone.priority,
    due_date: props.milestone.due_date,
    start_date: props.milestone.start_date,
    budget_amount: props.milestone.budget_amount,
    currency: props.milestone.currency || 'USD',
    estimated_time_val: val,
    estimated_time_unit: unit,
    assigned_to_ids: currentIds,
    tasks: (props.milestone.tasks || []).map(t => ({
        ...t,
        time_val: t.estimated_minutes, // Ensure validation passes
        unit: 'mins' // Default unit
    })) 
  })
  isEditing.value = true
}

// ... cancelEdit same ...

// ... file handlers same ...

const handleSave = async () => {
  // Validation: Name
  if (!form.name || !form.name.trim()) {
      addToast('Milestone name is required', 'error')
      return
  }

  if (form.name.length > 40) {
      addToast('Milestone name cannot exceed 40 characters', 'error')
      return
  }

  // Validation: Budget
  if (!form.budget_amount || parseFloat(form.budget_amount) <= 0) {
      addToast('Budget must be greater than 0', 'error')
      return
  }

  // Validation: Dates
  if (!form.start_date || !form.due_date) {
      addToast('Start and Due dates are required', 'error')
      return
  }

  if (form.start_date && form.due_date) {
      const mStart = new Date(form.start_date)
      const mDue = new Date(form.due_date)
      const pStart = props.projectStartDate ? new Date(props.projectStartDate) : null
      const pEnd = props.projectEndDate ? new Date(props.projectEndDate) : null
      
      // Start > Due
      if (mStart > mDue) {
          addToast('Start date cannot be after due date', 'error')
          return
      }

      // Start < Today (Strict "Same as Create" logic)
      // UPDATE: Only enforce if date CHANGED. Allow preserving existing past dates.
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const mStartLocal = new Date(form.start_date + 'T00:00:00')
      
      const originalStart = props.milestone.start_date
      const hasStartChanged = form.start_date !== originalStart

      if (hasStartChanged && mStartLocal < today) {
          addToast('Start date cannot be in the past', 'error')
          return
      }

      // Project Boundaries
      if (pStart && mStart < pStart) {
          addToast(`Milestone cannot start before project (${new Date(pStart).toLocaleDateString()})`, 'error')
          return
      }
  
       if (pEnd && mDue > pEnd) {
          addToast(`Milestone cannot end after project (${new Date(pEnd).toLocaleDateString()})`, 'error')
          return
       }
  }

  // Validation: Check for empty tasks
  // Validation: Check for empty tasks
      const invalidTask = form.tasks.find(t => 
        !t.name || t.name.trim() === '' || 
        t.time_val === null || t.time_val === undefined || String(t.time_val).trim() === ''
      )
      
      if (invalidTask) {
          addToast('Please ensure all tasks have a Name and Time.', 'error')
          return
      }

  isSubmitting.value = true
  try {
    // Calc hours
    let hours = parseFloat(form.estimated_time_val || 0)
    if (form.estimated_time_unit === 'days') hours *= 8
    if (form.estimated_time_unit === 'months') hours *= 160

    const formData = new FormData()
    formData.append('name', form.name)
    // if (form.description) formData.append('description', form.description) // REMOVED
    if (form.milestone_type) formData.append('milestone_type', form.milestone_type) 
    if (form.priority) formData.append('priority', form.priority)
    if (form.start_date) formData.append('start_date', form.start_date)
    if (form.due_date) formData.append('due_date', form.due_date)
    formData.append('budget_amount', parseFloat(form.budget_amount || 0))
    if (form.currency) formData.append('currency', form.currency)
    
    // Tasks: Ensure we send a clean JSON string
    if (form.tasks && form.tasks.length > 0) {
        // Strip out any UI-specific fields if necessary, but default object is fine
        formData.append('tasks', JSON.stringify(form.tasks))
    } else {
        formData.append('estimated_hours', hours) // Fallback manual
    }

    // IDs
    if (form.assigned_to_ids) {
        formData.append('assigned_to_ids', JSON.stringify(form.assigned_to_ids))
    }
    
    if (selectedFile.value) {
        formData.append('file', selectedFile.value)
    }

    const res = await axios.patch(
      `http://localhost:8000/api/milestones/${props.milestone.id}`,
      formData,
      { 
         headers: { 
             Authorization: `Bearer ${props.token}`,
             'Content-Type': 'multipart/form-data'
         } 
      }
    )
    
    emit('updated', res.data)
    isEditing.value = false
    addToast('Milestone updated successfully', 'success')
  } catch (e) {
    addToast(e.response?.data?.detail || 'Failed to update milestone', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async () => {
  // 1. Permission Check
  // Admin & Creator -> Reason Modal
  
  const isCreator = props.milestone.created_by_id === props.currentUser?.id
  const isAdmin = props.currentUser?.is_superuser === true || props.isAdmin

  // User requested Admin should also mention reason
  if (isAdmin || isCreator) {
      modalAction.value = 'delete'
      showReasonModal.value = true
      return
  }
  
  // Project Owner (not creator) - Should be blocked by UI but just in case
  addToast('Only the Creator or Admin can delete this milestone.', 'error')
}

const executeDelete = async (reason = null) => {
  try {
     // Always use the specific delete endpoint
     const endpoint = `http://localhost:8000/api/milestones/${props.milestone.id}/delete`
     
     // Always send reason (it might be empty string but endpoint expects JSON body)
     await axios.post(endpoint, { reason: reason || "Admin Delete" }, { headers: { Authorization: `Bearer ${props.token}` } })
     
    emit('deleted', props.milestone.id)
     
    emit('deleted', props.milestone.id)
    addToast('Milestone deleted', 'success')
    close()
    showReasonModal.value = false
  } catch (e) {
     addToast(e.response?.data?.detail || 'Failed to delete milestone', 'error')
  }
}

const handleAccept = async () => {
  if (isExpired.value) {
      addToast('Cannot accept invitation: Milestone has expired.', 'error')
      return
  }
  isSubmitting.value = true
  try {
     const res = await axios.post(
       `http://localhost:8000/api/milestones/${props.milestone.id}/accept`,
       {},
       { headers: { Authorization: `Bearer ${props.token}` } }
     )
     emit('updated', res.data)
     addToast('Milestone accepted', 'success')
  } catch (e) {
     addToast(e.response?.data?.detail || 'Failed to accept', 'error')
  } finally {
     isSubmitting.value = false
  }
}

const handleReasonSubmit = (reason) => {
    if (modalAction.value === 'delete') {
        executeDelete(reason)
    } else if (modalAction.value === 'remove') {
          // Process Removal locally
          // alert("DEBUG: Handle Remove. Target: " + targetRemoveId.value)
          
          if (targetRemoveId.value) {
              // Use loose comparison to ensure we find the ID regardless of type (String/Number)
              const index = form.assigned_to_ids.findIndex(uid => String(uid) === String(targetRemoveId.value))
              
              // alert("DEBUG: Found Index: " + index + " in list of size " + form.assigned_to_ids.length)

              if (index !== -1) {
                  form.assigned_to_ids.splice(index, 1)
                  // addToast('User removed from selection', 'info') // Deferred to Save
              } else {
                  console.warn("DEBUG: Could not find ID to remove:", targetRemoveId.value, "in", form.assigned_to_ids)
                  // Fallback: Try force filtering just in case
                  form.assigned_to_ids = form.assigned_to_ids.filter(uid => String(uid) !== String(targetRemoveId.value))
                  // alert("DEBUG: Force Filter applied.")
              }
          } else {
              // alert("DEBUG: Error - targetRemoveId is NULL")
          }
          showReasonModal.value = false
          targetRemoveId.value = null
    } else {
        handleDecline(reason)
    }
}

const handleDecline = async (reason) => {
  if (isExpired.value) {
      addToast('Cannot decline invitation: Milestone has expired.', 'error')
      return
  }
  isSubmitting.value = true
  try {
     const res = await axios.post(
       `http://localhost:8000/api/milestones/${props.milestone.id}/decline`,
       { reason },
       { headers: { Authorization: `Bearer ${props.token}` } }
     )
     emit('updated', res.data)
     showReasonModal.value = false
     addToast('Milestone declined', 'info')
     close()
  } catch (e) {
     addToast(e.response?.data?.detail || 'Failed to decline', 'error')
  } finally {
     isSubmitting.value = false
  }
}

// Formatters
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n || 0)
const formatStatus = (s) => s ? s.replace('_', ' ').toUpperCase() : ''
const getInitials = (n) => n ? n.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() : '??'
const getFileUrl = (path) => `http://localhost:8000/${path}`

</script>

<style scoped>
/* ... existing styles ... */
/* Edit List (Scoped Copy) */
.member-list-container {
  display: flex; flex-direction: column; gap: 8px;
  background: rgba(0,0,0,0.2); 
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 8px;
  max-height: 200px; overflow-y: auto;
}

.member-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255,255,255,0.02);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.member-item:hover { background: rgba(255,255,255,0.05); }

.member-item.selected {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.4);
}

.member-info { display: flex; align-items: center; gap: 10px; color: #f5f5f7; font-size: 13px; }

.checkbox-circle {
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  transition: 0.2s;
}

.member-item.selected .checkbox-circle {
  background: #3b82f6;
  border-color: #3b82f6;
}
.check-icon { font-size: 12px; color: white; font-weight: 800; }

/* Add Attachment Link Style */
.attachment-link {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.05); padding: 10px 12px;
  border-radius: 8px; color: #f5f5f7; text-decoration: none;
  font-size: 13px; font-weight: 500; border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.2s;
}
.attachment-link:hover {
  background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);
}
.ext-icon { opacity: 0.5; margin-left: auto; }

.panel-overlay {

  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0, 0, 0, 0.4); 
  backdrop-filter: blur(4px);
  display: flex; justify-content: flex-end;
}

.panel-content {
  width: 450px; height: 100vh;
  background: #18181b; 
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; flex-direction: column;
}

.glass-panel {
    /* Using solid background for better readability in side panel, but keeping glass feel */
    background: rgba(20, 20, 23, 0.85); /* Slightly more transparent to match modal feel */
    backdrop-filter: blur(20px);
}

/* Header */
.panel-header {
  padding: 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.header-left { display: flex; gap: 8px; align-items: center; }

.type-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: rgba(255,255,255,0.7); }

.status-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
.status-badge.pending { color: #fbbf24; background: rgba(245, 158, 11, 0.1); }
.status-badge.in_progress { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.status-badge.completed { color: #34d399; background: rgba(16, 185, 129, 0.1); }

.close-btn { 
  background: none; border: none; color: rgba(255,255,255,0.4); 
  cursor: pointer; width: 32px; height: 32px; 
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.close-btn:hover { 
  color: white; 
  background: rgba(255,255,255,0.1);
  transform: rotate(90deg);
}


/* Body */
.panel-body {
  padding: 16px; 
  flex: 1; overflow-y: auto;
}

/* Custom Scrollbar for Panel Body */
.panel-body::-webkit-scrollbar { width: 6px; }
.panel-body::-webkit-scrollbar-thumb { 
    background: rgba(255,255,255,0.1); 
    border-radius: 4px; 
}
.panel-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
.panel-body::-webkit-scrollbar-track { background: transparent; }

.title-section h2 { font-size: 20px; font-weight: 600; color: #f5f5f7; margin: 0 0 12px 0; }
.description { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.7); white-space: pre-wrap; }

.divider { height: 1px; background: rgba(255,255,255,0.05); margin: 16px 0; }
.divider.full-width { grid-column: span 2; }

.details-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}

.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { grid-column: span 2; }

.detail-item label { font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em; }
.detail-item .value { font-size: 14px; color: #f5f5f7; display: flex; align-items: center; gap: 6px; }

.priority-tag { font-weight: 500; text-transform: capitalize; }
.priority-tag.urgent { color: #ef4444; }
.priority-tag.high { color: #f97316; }
.priority-tag.medium { color: #fbbf24; }
.priority-tag.low { color: #3b82f6; }

.user-chip { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #f5f5f7; }
.avatar-xs { width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; }

.meta-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.3); font-style: italic; }

/* Edit Form Styles */
.form-group { display: flex; flex-direction: column; gap: 8px; }
.mt-4 { margin-top: 16px; }
.text-input { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #f5f5f7; width: 100%; }
.textarea { resize: none; font-family: inherit; }
.combo-input { display: flex; gap: 8px; }

.readonly-time-input {
    background: rgba(0,0,0,0.2); 
    border: 1px solid rgba(255,255,255,0.05); 
    border-radius: 8px; 
    padding: 8px 12px; 
    color: rgba(255,255,255,0.5); /* Disabled text color */
    width: 100%;
    display: flex; align-items: center; gap: 8px;
    font-size: 13px;
    cursor: not-allowed;
}

/* Footer */
.panel-footer {
  padding: 24px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; align-items: center;
}

.btn-text {
  background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 500;
  padding: 8px 16px; border-radius: 20px; transition: all 0.2s;
}

.btn-text.secondary { 
  color: rgba(255,255,255,0.6); 
  border: 1px solid rgba(255,255,255,0.1);
}
.btn-text.secondary:hover { color: white; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }

.btn-text.delete { 
  color: #ef4444; opacity: 0.8; display: flex; align-items: center; gap: 6px; 
  padding: 8px 12px; border-radius: 8px; transition: all 0.2s;
}
.btn-text.delete:hover { background: rgba(239, 68, 68, 0.1); opacity: 1; }

.btn-pill { background: white; color: black; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-pill:hover { background: #f5f5f7; }

.permission-note { font-size: 12px; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 6px; }


/* Transitions */
.panel-slide-enter-active, .panel-slide-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: translateX(100%); }

.pending-banner {
  background: rgba(251, 191, 36, 0.1); border-bottom: 1px solid rgba(251, 191, 36, 0.2);
  padding: 12px 24px;
}
.banner-content { display: flex; justify-content: space-between; align-items: center; color: #fbbf24; font-size: 13px; font-weight: 500; }
.banner-actions { display: flex; gap: 8px; }

.btn-sm { 
  display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; 
  border: none; font-size: 11px; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.02em;
}
.btn-sm.success { background: #10b981; color: white; }
.btn-sm.success:hover { background: #059669; }
.btn-sm.danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.btn-sm.danger:hover { background: rgba(239, 68, 68, 0.3); }

/* Compact Attachment Manager */
.attachment-manager { 
  display: flex; flex-direction: column; gap: 8px; margin-top: 2px; 
}

.existing-file-card {
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; 
  padding: 8px 10px; /* Reduced specific padding */
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}

/* Make card single row if possible */
.file-header { display: none; } /* Hide label to save space, icon is enough */

.file-row { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; }

.text-indigo-400 { color: #818cf8; flex-shrink: 0; }

.file-name-scroll { 
  font-size: 12px; color: #f5f5f7; font-family: monospace; 
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.9; 
}

.link-view { font-size: 11px; color: #818cf8; text-decoration: none; font-weight: 600; cursor: pointer; white-space: nowrap; }
.link-view:hover { text-decoration: underline; color: #a5b4fc; }

/* Decline Banner */
.declined-banner {
  background: rgba(239, 68, 68, 0.1); border-bottom: 1px solid rgba(239, 68, 68, 0.2);
  padding: 12px 24px;
}
.banner-content.error { color: #ef4444; align-items: flex-start; }
.flex-col { display: flex; flex-direction: column; gap: 4px; }
.font-bold { font-weight: 700; }
.reason-text { font-style: italic; opacity: 0.9; font-size: 13px; }

/* Audit Footer */
.last-updated { margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.05); }
.highlight { color: rgba(255,255,255,0.6); font-weight: 500; margin-bottom: 4px; }
.summary { font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.4); }

.upload-wrapper {
   /* No extra margin */
}

/* Assignee List View */
.assignee-list-view {
  display: flex; flex-direction: column; gap: 8px;
  background: rgba(255,255,255,0.02); border-radius: 8px; padding: 8px;
}
.assignee-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 8px; border-radius: 6px;
  background: rgba(255,255,255,0.03);
}
.assignee-row.declined {
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.05);
}
.row-left { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #f5f5f7; }
.row-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }

.status-pill {
    font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px;
}
.status-pill.pending { color: #fbbf24; background: rgba(245, 158, 11, 0.1); }
.status-pill.in_progress { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.status-pill.declined { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.status-pill.completed { color: #34d399; background: rgba(16, 185, 129, 0.1); }

.reason-mini { font-size: 10px; color: #ef4444; font-style: italic; max-width: 150px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.assignee-select-wrapper { margin-top: 4px; }

/* Declined List for Creator */
.declined-list-banner {
    margin: 16px 24px 0;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    padding: 12px;
}
.declined-list-banner .banner-title {
    display: flex; align-items: center; gap: 8px;
    color: #f87171; font-weight: 600; font-size: 13px;
    margin-bottom: 8px;
}
.declined-item {
    display: flex; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.8);
    margin-bottom: 4px; padding-left: 22px;
}
.declined-item .user-name { font-weight: 600; color: #fca5a5; }
.declined-item .reason { font-style: italic; color: rgba(255,255,255,0.6); }

/* Inner Modal - Premium Redesign */
.inner-modal-overlay {
  position: fixed; inset: 0; z-index: 99999; /* Top level */
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.inner-modal-card {
  background: #18181b; 
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  border-radius: 16px;
  width: 90%; max-width: 600px; 
  max-height: 90vh; /* Main scroll container */
  display: flex; flex-direction: column;
  overflow-y: auto; 
  transform-origin: center;
  animation: modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-content-wrapper {
  padding: 32px; 
}

.inner-modal-card h3 {
  font-size: 12px; color: rgba(255,255,255,0.5); 
  text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
  margin-bottom: 8px;
}

.user-header-large {
  font-size: 20px; font-weight: 600; color: #f5f5f7;
  margin-bottom: 24px;
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.user-header-large .icon { color: #ef4444; }

.reason-scroll {
  font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.9);
  padding: 0;
  min-height: 60px;
  white-space: pre-wrap;
  word-break: break-word; /* Force wrap for long strings */
  overflow-wrap: anywhere; 
  font-family: 'Inter', sans-serif;
}

.modal-actions {
  padding: 24px 32px;
  background: rgba(255,255,255,0.01);
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: flex-end;
  margin-top: auto; 
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

</style>
