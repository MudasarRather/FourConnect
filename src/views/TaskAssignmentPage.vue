<template>
  <div class="assignment-page-wrapper" :class="{ 'hub-mode': !task }">
    <!-- NANO BANANA PRO HEADER -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <ChevronLeft :size="20" />
        </button>
        <div class="header-titles">
          <h1>Task Assignment Hub</h1>
          <p v-if="task">Refining ownership for <span>{{ task.task_code || 'Task' }}</span></p>
          <p v-else>Select a task to begin the assignment journey</p>
        </div>
      </div>
      <div class="header-right" v-if="task">
        <div class="status-indicator-box glass-panel">
          <div class="indicator-item">
            <span class="label">Priority</span>
            <div class="indicator-value">
              <div class="priority-dot" :class="task.priority"></div>
              <span class="text" :class="task.priority">{{ task.priority }}</span>
            </div>
          </div>
          <div class="indicator-sep"></div>
          <div class="indicator-item">
            <span class="label">Status</span>
            <div class="indicator-value">
              <span class="text status">{{ task.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT AREA -->
    <div class="main-content-area">
      <!-- LOADING STATE -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spin" :size="48" />
        <p>Syncing Assignment Data...</p>
      </div>

      <!-- TASK SELECTION GRID (If no task selected) -->
      <div v-else-if="!task" class="task-selection-view">
        <div class="selection-header">
          <div class="search-wrap">
            <Search :size="18" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search by ID, name, or project..." 
              class="search-input"
            />
            <div class="search-count" v-if="filteredAvailableTasks.length">
              {{ filteredAvailableTasks.length }} Tasks
            </div>
          </div>
          <div class="filter-pills">
            <button 
              v-for="filter in ['All', 'Open', 'In Progress', 'Upcoming', 'Expired', 'Extended']" 
              :key="filter"
              class="filter-pill"
              :class="{ active: activeFilter === filter }"
              @click="activeFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
        </div>

        <div class="task-grid-scroll">
          <div class="task-grid" v-if="filteredAvailableTasks.length">
            <div 
              v-for="t in filteredAvailableTasks" 
              :key="t.id" 
              class="task-selection-card glass-panel"
              @click="handleSelectTask(t)"
            >
              <div class="card-top">
                <span class="task-code">{{ t.task_code || t.id.substring(0,8).toUpperCase() }}</span>
                <span class="p-pill" :class="t.priority">{{ t.priority }}</span>
              </div>
              <h3 class="task-title">{{ t.title }}</h3>
              <div class="card-meta">
                <div class="meta-item">
                  <Folder :size="12" />
                  <span>{{ t.project_name || 'Standalone' }}</span>
                </div>
                <div class="meta-item">
                  <User :size="12" />
                  <span>{{ t.assignee_name || 'Unassigned' }}</span>
                </div>
              </div>
              <div class="selection-hover-overlay">
                <span>Start Assignment Journey</span>
                <ChevronRight :size="16" />
              </div>
            </div>
          </div>
          <div v-else class="empty-results">
            <Activity :size="48" class="muted-icon" />
            <p>No assignable tasks found matching your criteria.</p>
          </div>
        </div>
      </div>

      <!-- ASSIGNMENT JOURNEY (If task selected) -->
      <div v-else class="assignment-journey-view" :key="task.id">
        <div class="assignment-content-grid">
          <!-- LEFT COL: THE JOURNEY -->
          <div class="journey-column">
            <div class="journey-card glass-panel">
              <!-- Top Row for Actions -->
              <div class="card-top-actions">
                <button class="reset-task-btn" @click="resetCurrentTask">
                  <Grid :size="14" /> Change Task
                </button>
              </div>

              <!-- Step Indicators -->
              <div class="journey-steps">
                <div 
                  v-for="step in 4" 
                  :key="step" 
                  class="step-indicator"
                  :class="{ 
                    'active': currentStep === step, 
                    'completed': currentStep > step 
                  }"
                >
                  <div class="step-num">
                    <Check v-if="currentStep > step" :size="14" />
                    <span v-else>{{ step }}</span>
                  </div>
                  <div class="step-line" v-if="step < 4"></div>
                </div>
              </div>

              <!-- Step Content -->
              <div class="step-content-box">
                <!-- Step 1: Verification -->
                <div v-if="currentStep === 1" class="step-fade">
                  <h2>Verify Current State</h2>
                  <p class="subtitle">Review the existing task configuration before making changes.</p>
                  <div class="verification-card">
                    <div class="v-row">
                      <label>Project</label>
                      <span>{{ task.project_name || 'Standalone' }}</span>
                    </div>
                    <div class="v-row">
                      <label>Type</label>
                      <span class="type-badge">{{ task.task_type }}</span>
                    </div>
                    <div class="v-row personal">
                      <div class="person-info">
                        <label>Current Assignee</label>
                        <div class="person-card">
                          <img v-if="task.assignee_avatar" :src="task.assignee_avatar" class="mini-avatar" />
                          <div v-else class="mini-avatar placeholder">{{ task.assignee_name?.charAt(0) || '?' }}</div>
                          <span class="name">{{ task.assignee_name || 'Unassigned' }}</span>
                        </div>
                      </div>
                      <div class="person-info">
                        <label>Task Creator</label>
                        <div class="person-card">
                          <img v-if="task.creator_avatar" :src="task.creator_avatar" class="mini-avatar" />
                          <div v-else class="mini-avatar placeholder">{{ task.creator_name?.charAt(0) || '?' }}</div>
                          <span class="name">{{ task.creator_name || 'System' }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="v-row">
                      <label>Original Deadline</label>
                      <span class="deadline-val">{{ formatDate(task.due_date) }}</span>
                    </div>
                    <div class="v-row desc">
                      <label>Description</label>
                      <p>{{ task.description || 'No description found.' }}</p>
                    </div>
                  </div>
                </div>

                <!-- Step 2: Ownership & Visibility -->
                <div v-if="currentStep === 2" class="step-fade">
                  <h2>Ownership & Visibility</h2>
                  <p class="subtitle">Assign the primary owner and add watchers for transparency.</p>
                  
                  <div class="field-group">
                    <label>Primary Assignee <span class="required">*</span></label>
                    <UserSelector 
                      v-model="form.assigned_to" 
                      placeholder="Search for a team member..."
                      :exclude-admins="true"
                      @change="handleUserChange"
                    />
                  </div>

                  <div class="field-group">
                    <ParticipantSelector 
                      v-model="form.watchers" 
                      label="Watchers"
                      :exclude-admins="true"
                      :exclude-ids="[form.assigned_to].filter(Boolean)"
                    />
                  </div>

                  <div class="info-alert" v-if="task.assignee_id && form.assigned_to && task.assignee_id !== form.assigned_to">
                    <ShieldAlert :size="16" />
                    <span>Reassigning from <b>{{ task.assignee_name }}</b>.</span>
                  </div>
                </div>

                <!-- Step 3: Constraints & Context -->
                <div v-if="currentStep === 3" class="step-fade">
                  <h2>Constraints & Context</h2>
                  <p class="subtitle">Adjust the timeline if needed and provide an audit reason.</p>
                  
                  <div class="field-group">
                    <label>New Deadline (Optional)</label>
                    <DueDatePicker 
                      v-model="form.new_due_date"
                      :original-date="task.due_date"
                      :start-date="task.start_date"
                    />
                  </div>

                  <div class="field-group">
                    <label>Assignment Notes <span class="required">*</span></label>
                    <textarea 
                      v-model="form.notes"
                      placeholder="Why is this assignment being changed? This will be recorded in history."
                      class="nano-textarea"
                    ></textarea>
                  </div>
                </div>

                <!-- Step 4: Finalize -->
                <div v-if="currentStep === 4" class="step-fade">
                  <h2>Finalize & Alerts</h2>
                  <p class="subtitle">Execute the transitions and notify all related parties.</p>

                  <div class="summary-card">
                     <div class="summary-line">
                       <UserPlus :size="14" />
                       <span>New Assignee: <b>{{ selectedUserName }}</b></span>
                     </div>
                     <div class="summary-line" v-if="form.new_due_date">
                       <Calendar :size="14" />
                       <span>Deadline shifted to <b>{{ formatDate(form.new_due_date) }}</b></span>
                     </div>
                     <div class="summary-line">
                       <Users :size="14" />
                       <span>{{ form.watchers.length }} Watchers monitoring this task</span>
                     </div>
                  </div>

                  <div class="notif-box">
                    <label>Communication Strategy</label>
                    <NotificationSettings v-model="form.notifications" />
                  </div>
                </div>
              </div>

              <!-- Footer Actions -->
              <div class="journey-footer">
                <button 
                  class="btn-nav secondary" 
                  @click="prevStep" 
                >
                  <ChevronLeft :size="16" /> Back
                </button>
                
                <button 
                  v-if="currentStep < 4" 
                  class="btn-nav primary" 
                  @click="nextStep"
                  :disabled="!canGoNext"
                >
                  Confirm & Next <ChevronRight :size="16" />
                </button>
                
                <button 
                  v-else 
                  class="btn-nav glow" 
                  @click="handleAssign"
                  :disabled="submitting || !canSubmit"
                >
                  <Loader2 v-if="submitting" class="spin" :size="16" />
                  <span v-else>Confirm Assignment Lifecycle</span>
                </button>
              </div>
            </div>
          </div>

          <!-- RIGHT COL: HISTORY TIMELINE -->
          <div class="history-column">
            <div class="sticky-history-wrap">
              <TaskAssignmentHistory :task-id="task.id" ref="historyRef" />
              <div class="history-context-aid glass-panel">
                <div class="aid-header">
                  <Info :size="14" />
                  <span>Pro-Tip</span>
                </div>
                <p>History records all primary assignee changes. Adding watchers or reviewers does not modify the primary history timeline but is logged in the activity audit.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="style-overrides">
    </div>
  </div>
</template>

<style>
/* Global style overrides to remove neon/shadows */
.glass-panel {
  box-shadow: none !important;
}
.required {
  color: #f87171;
  margin-left: 4px;
}
</style>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import axios from 'axios'
import { 
  ChevronLeft, ChevronRight, Check, Activity, Loader2, Search,
  User, Calendar, Info, Users, ShieldAlert, Grid, Folder, UserPlus
} from 'lucide-vue-next'

// Components
import UserSelector from '../components/tasks/UserSelector.vue'
import ParticipantSelector from '../components/tasks/ParticipantSelector.vue'
import DueDatePicker from '../components/tasks/DueDatePicker.vue'
import NotificationSettings from '../components/tasks/NotificationSettings.vue'
import TaskAssignmentHistory from '../components/tasks/TaskAssignmentHistory.vue'
import { API } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const { addToast } = useToast()

// Global State
const loading = ref(true)
const task = ref(null)
const availableTasks = ref([])
const currentStep = ref(1)
const submitting = ref(false)
const historyRef = ref(null)

// Filtering State
const searchQuery = ref('')
const activeFilter = ref('All')
const selectedUserObj = ref(null)

// Form State
const form = reactive({
  assigned_to: null,
  reviewers: [],
  watchers: [],
  new_due_date: null,
  notes: '',
  notifications: {
    notify_assignee: true,
    notify_watchers: true,
    notify_reviewers: true,
    notify_manager: false
  }
})

const fetchInitialData = async () => {
  loading.value = true
  const taskId = route.query.taskId
  
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    
    // Always fetch available tasks for the selector (or if we need to fall back)
    const listRes = await axios.get(`${API}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    availableTasks.value = listRes.data.items || []

    if (taskId) {
      const taskRes = await axios.get(`${API}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const t = taskRes.data
      if (!isAdmin.value && t.status?.toLowerCase() === 'expired') {
        addToast("Expired tasks cannot be reassigned.", "error")
        router.push('/user/tasks/assign')
        return
      }
      selectTask(t)
    }
  } catch (e) {
    addToast("Initialization failed", "error")
    console.error(e)
  } finally {
    loading.value = false
  }
}

const filteredAvailableTasks = computed(() => {
  let list = availableTasks.value
  
  if (activeFilter.value !== 'All') {
    const filterMap = {
      'Open': 'open',
      'In Progress': 'in_progress',
      'Upcoming': 'upcoming',
      'Expired': 'expired',
      'Extended': 'extended'
    }
    const statusToMatch = filterMap[activeFilter.value]
    list = list.filter(t => t.status?.toLowerCase() === statusToMatch)
  }
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => 
      t.title?.toLowerCase().includes(q) || 
      t.task_code?.toLowerCase().includes(q) ||
      t.project_name?.toLowerCase().includes(q)
    )
  }
  
  return list
})

const selectTask = (t) => {
  task.value = t
  currentStep.value = 1
  // Initialize form
  form.assigned_to = t.assignee_id
  form.reviewers = t.reviewers || []
  form.watchers = t.watchers || []
  form.new_due_date = null
  form.notes = ''
  selectedUserObj.value = { id: t.assignee_id, full_name: t.assignee_name }
}

const handleUserChange = (u) => {
  selectedUserObj.value = u
}

const canGoNext = computed(() => {
  if (currentStep.value === 2) return !!form.assigned_to
  if (currentStep.value === 3) return form.notes.trim().length > 5
  return true
})

const canSubmit = computed(() => {
  return form.assigned_to && form.notes.trim().length > 5
})

const selectedUserName = computed(() => {
  return selectedUserObj.value?.full_name || '—'
})

const nextStep = () => { if (currentStep.value < 4) currentStep.value++ }
const prevStep = () => { 
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    resetCurrentTask()
  }
}

const handleSelectTask = (t) => {
  if (!isAdmin.value && t.status?.toLowerCase() === 'expired') {
    addToast("Expired tasks cannot be reassigned.", "error")
    return
  }
  router.push({ query: { ...route.query, taskId: t.id } })
}

const resetCurrentTask = () => {
  task.value = null
  router.push({ query: { ...route.query, taskId: undefined } })
}

const goBack = () => {
  if (task.value) {
    resetCurrentTask()
  } else {
    router.push(isAdmin.value ? '/admin/tasks' : '/user/tasks')
  }
}

const handleAssign = async () => {
  submitting.value = true
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    await axios.post(`${API}/tasks/${task.value.id}/assign`, {
      ...form,
      reviewers: [], // Explicitly clear reviewers as they were removed from UI
      assignment_type: task.value.assignee_id ? 'reassignment' : 'new_assignment'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    addToast("Assignment executed successfully", "success")
    historyRef.value?.refresh()
    
    // Delay redirect
    setTimeout(() => {
        goBack()
    }, 2000)
    
  } catch (e) {
    addToast(e.response?.data?.detail || "Execution failed", "error")
  } finally {
    submitting.value = false
  }
}

const isAdmin = computed(() => route.path.startsWith('/admin'))

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

onMounted(fetchInitialData)

// Watch for route ID changes (direct nav)
watch(() => route.query.taskId, (newId) => {
  if (newId) {
    const found = availableTasks.value.find(t => t.id === newId)
    if (found) selectTask(found)
  } else {
    task.value = null
  }
})
</script>

<style scoped>
.assignment-page-wrapper {
  min-height: calc(100vh - 120px);
  padding: 20px 0;
  background: radial-gradient(circle at top right, rgba(250, 204, 21, 0.03), transparent 40%),
              radial-gradient(circle at bottom left, rgba(135, 88, 255, 0.03), transparent 40%);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assignment-page-wrapper.hub-mode {
  height: calc(100vh - 120px);
  overflow: hidden;
  padding-bottom: 0;
}

.assignment-page-wrapper::-webkit-scrollbar {
  width: 8px;
}
.assignment-page-wrapper::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}
.assignment-page-wrapper::-webkit-scrollbar-thumb {
  background: #facc15;
  border-radius: 4px;
  border: 2px solid #000;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.back-btn {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #facc15;
  transform: translateX(-4px);
}

.header-titles h1 {
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: -0.03em;
}

.header-titles p {
  margin: 6px 0 0 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.4);
}

.header-titles p span {
  color: #facc15;
  font-weight: 700;
}

.status-indicator-box {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 16px;
  background: rgba(15, 15, 17, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

.indicator-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.indicator-item .label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.05em;
}

.indicator-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.priority-dot.low { background: #4ade80; color: rgba(74, 222, 128, 0.4); }
.priority-dot.medium { background: #60a5fa; color: rgba(96, 165, 250, 0.4); }
.priority-dot.high, .priority-dot.critical { background: #f87171; color: rgba(248, 113, 113, 0.4); }

.indicator-value .text {
  font-size: 13px;
  font-weight: 700;
  color: white;
  text-transform: capitalize;
}

.indicator-value .text.status { color: #facc15; }

.indicator-sep {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.08);
}

/* Step 1 Styles */
.type-badge {
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.v-row.personal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.005));
  padding: 22px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.v-row.personal::before {
  content: ''; position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.45), transparent);
  animation: vRowTopLine 4.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes vRowTopLine {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
.v-row.personal:hover {
  border-color: rgba(250, 204, 21, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.22);
}
.v-row.personal .person-info {
  position: relative;
  z-index: 1;
}

.person-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mini-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  object-fit: cover;
}

.mini-avatar.placeholder {
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: #facc15;
  border: 1px solid rgba(250, 204, 21, 0.2);
}

.person-card .name {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.field-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  margin-top: 8px;
  font-style: italic;
}

.deadline-val {
  color: #facc15;
  font-weight: 700;
  font-family: 'SF Mono', monospace;
}

.main-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Critical for flex scrolling */
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px;
  color: #facc15;
}

.loading-state p { margin-top: 20px; font-weight: 600; opacity: 0.8; }

/* Task Selection View */
.task-selection-view {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1; 
  min-height: 0;
  padding-top: 10px; /* Reduced from 40px */
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 32px;
}

.search-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-count {
  position: absolute;
  right: 16px;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  color: #facc15;
  border: 1px solid rgba(250, 204, 21, 0.2);
}

.search-wrap svg {
  position: absolute;
  left: 20px;
  color: rgba(255, 255, 255, 0.2);
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 80px 16px 54px;
  color: white;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #facc15;
  background: rgba(250, 204, 21, 0.02);
}

.filter-pills {
  display: flex;
  gap: 12px;
}

.filter-pill {
  padding: 10px 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-pill:hover { border-color: rgba(255, 255, 255, 0.2); }
.filter-pill.active { background: #facc15; border-color: #facc15; color: #111; }

.task-grid-scroll {
  flex: 1; /* Take all available space in selection view */
  overflow-y: scroll !important;
  padding: 30px 24px 80px 20px;
  min-height: 0; /* Allow shrinking */
  scrollbar-width: thin;
  scrollbar-color: #facc15 rgba(255, 255, 255, 0.03);
}

/* Chrome, Edge, Safari */
.task-grid-scroll::-webkit-scrollbar {
  width: 10px;
  display: block !important;
}

.task-grid-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  margin: 10px 0;
}

.task-grid-scroll::-webkit-scrollbar-thumb {
  background: #facc15;
  border-radius: 20px;
  border: 3px solid #111;
  min-height: 40px;
}

.task-grid-scroll::-webkit-scrollbar-thumb:hover {
  background: #ffffff;
}


.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 32px;
  padding-top: 20px; /* Room for card hover translation */
  padding-bottom: 20px;
}

.task-selection-card {
  padding: 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  will-change: transform;
  transform: translateZ(0);
}

.task-selection-card:hover {
  transform: translateY(-8px) translateZ(0);
  border-color: rgba(250, 204, 21, 0.3);
}

.card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.task-code {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 8px;
}

.p-pill {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
}

.p-pill.high, .p-pill.critical { background: rgba(239, 68, 68, 0.1); color: #f87171; }

.task-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin: 0 0 20px 0;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.selection-hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #facc15;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #111;
  font-weight: 800;
  font-size: 16px;
  opacity: 0;
  z-index: 50; /* Ensure it stays on top of all card content */
  border-radius: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.task-selection-card:hover .selection-hover-overlay {
  opacity: 1;
}

/* Journey View */
.assignment-journey-view {
  animation: journeyEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  flex: 1;
}

@keyframes journeyEntrance {
  from { opacity: 0; transform: scale(0.98) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.assignment-content-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 40px;
  max-width: 100%; /* Proper full-page width */
  margin: 0;
}

.glass-panel {
  background: rgba(15, 15, 17, 0.6);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
}

.journey-card {
  padding: 32px 60px; /* Condensed vertical padding */
  position: relative;
  min-height: 480px; /* Reduced to ensure footer visibility */
}

.card-top-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 48px; /* Guaranteed clearance for step indicators */
}

.reset-task-btn {
  padding: 8px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.reset-task-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

.journey-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  margin-bottom: 32px; /* Reduced to pull content up */
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.step-indicator { display: flex; align-items: center; flex: 1; }
.step-indicator:last-child { flex: 0; }

.step-num {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800;
  transition: all 0.4s;
}

.step-indicator.active .step-num {
  background: #facc15;
  border-color: #facc15;
  color: #111;
  transform: scale(1.1);
}

.step-indicator.completed .step-num {
  background: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
  color: #4ade80;
}

.step-line {
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
  flex: 1;
  margin: 0 12px;
  transition: all 0.4s;
}

.step-indicator.completed .step-line { background: #4ade80; }

.step-content-box h2 {
  font-size: 32px; font-weight: 800; color: white; margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.subtitle { color: rgba(255, 255, 255, 0.4); font-size: 15px; margin: 0 0 16px 0; } /* Maximum compactness */

.verification-card {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.v-row { display: flex; justify-content: space-between; align-items: center; }
.v-row label { color: rgba(255, 255, 255, 0.3); font-size: 12px; font-weight: 800; text-transform: uppercase; }
.v-row span { color: white; font-weight: 600; font-size: 15px; }
.v-row.desc { flex-direction: column; align-items: flex-start; gap: 10px; }
.v-row.desc p { color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0; line-height: 1.6; }

.selectors-stack { display: flex; flex-direction: column; gap: 32px; }

.info-alert {
  margin-top: 24px;
  padding: 16px;
  background: rgba(250, 204, 21, 0.05);
  border: 1px solid rgba(250, 204, 21, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.info-alert b { color: #facc15; }

.field-group { margin-bottom: 32px; }
.field-group label { display: block; color: rgba(255, 255, 255, 0.3); font-size: 13px; font-weight: 700; margin-bottom: 12px; }

.nano-textarea {
  width: 100%;
  min-height: 100px; /* Reduced from 140px to prevent Step 3 clipping */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  color: white;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s;
}

.nano-textarea:focus { border-color: #facc15; background: rgba(250, 204, 21, 0.02); }

.summary-card {
  background: rgba(250, 204, 21, 0.05);
  padding: 24px; border-radius: 20px;
  display: flex; flex-direction: column; gap: 16px;
  margin-bottom: 40px;
}

.summary-line { display: flex; align-items: center; gap: 16px; color: rgba(255, 255, 255, 0.8); }
.summary-line b { color: #facc15; }

.journey-footer { display: flex; justify-content: space-between; margin-top: 32px; } /* Reduced from 64px */

.btn-nav {
  padding: 14px 28px; border-radius: 14px;
  font-size: 15px; font-weight: 700;
  cursor: pointer; border: none;
  display: flex; align-items: center; gap: 12px;
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.btn-nav:disabled { opacity: 0.3; cursor: not-allowed; transform: none !important; }

.btn-nav.primary { background: #facc15; color: #111; }
.btn-nav.secondary { background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid rgba(255, 255, 255, 0.1); }
.btn-nav.glow { background: #facc15; color: #111; }

.btn-nav:not(:disabled):hover { transform: translateY(-4px); }

/* History Sidebar */
.history-column {
  display: flex; flex-direction: column; gap: 32px;
}

.sticky-history-wrap {
  position: sticky;
  top: 100px;
  display: flex; flex-direction: column; gap: 24px;
}

.history-context-aid {
  padding: 24px;
}

.aid-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: #facc15; }
.aid-header span { font-weight: 800; font-size: 12px; text-transform: uppercase; }
.history-context-aid p { font-size: 13px; color: rgba(255, 255, 255, 0.4); margin: 0; line-height: 1.6; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.step-fade { animation: stepFade 0.5s ease-out; }
@keyframes stepFade { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* No items state */
.empty-results { padding: 80px; text-align: center; color: rgba(255, 255, 255, 0.2); }
.muted-icon { margin-bottom: 20px; }

.p-pill.low { border: 1px solid rgba(74, 222, 128, 0.2); color: #4ade80; }
.p-pill.medium { border: 1px solid rgba(59, 130, 246, 0.2); color: #60a5fa; }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .assignment-page-wrapper { color: var(--text-primary); }
[data-theme="light"] .header-titles h1 { color: var(--text-primary); }
[data-theme="light"] .header-titles p { color: var(--text-secondary); }
[data-theme="light"] .page-header { border-bottom-color: rgba(26, 20, 16, 0.10); }
[data-theme="light"] .status-indicator-box {
  background: rgba(26, 20, 16, 0.05);
  border-color: rgba(26, 20, 16, 0.10);
}
[data-theme="light"] .indicator-item .label { color: var(--text-tertiary); }
[data-theme="light"] .indicator-value .text { color: var(--text-primary); }
[data-theme="light"] .task-title { color: var(--text-primary); }
[data-theme="light"] .task-code {
  background: rgba(26, 20, 16, 0.08);
  color: var(--text-tertiary);
}
[data-theme="light"] .meta-item { color: var(--text-secondary); }
[data-theme="light"] .verification-card {
  background: rgba(26, 20, 16, 0.05);
  border-color: rgba(26, 20, 16, 0.10);
}
[data-theme="light"] .v-row label { color: var(--text-tertiary); }
[data-theme="light"] .v-row span { color: var(--text-primary); }
[data-theme="light"] .step-content-box h2 { color: var(--text-primary); }
[data-theme="light"] .subtitle { color: var(--text-secondary); }
[data-theme="light"] .field-group label { color: var(--text-secondary); }
[data-theme="light"] .empty-results { color: var(--text-tertiary); }
[data-theme="light"] .p-pill.low {
  border-color: rgba(34, 197, 94, 0.30);
  color: #166534;
}
[data-theme="light"] .p-pill.medium {
  border-color: rgba(29, 78, 216, 0.30);
  color: #1d4ed8;
}

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║ ULTRA-MODERN ENHANCEMENTS — apply to BOTH themes                      ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */

/* Back button — refined rotate + glow */
.back-btn { transition: background 0.3s ease, border-color 0.3s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
.back-btn:hover {
  box-shadow: 0 6px 18px rgba(250, 204, 21, 0.18), inset 0 0 0 1px rgba(250, 204, 21, 0.32);
}
.back-btn svg { transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.back-btn:hover svg { transform: translateX(-3px); }

/* Header-right status box — ultra modern glass with gradient hairline */
.status-indicator-box {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)) !important;
  border: 1px solid rgba(250, 204, 21, 0.18) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.status-indicator-box::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.65), transparent);
  animation: hbTopLine 4s ease-in-out infinite;
}
@keyframes hbTopLine {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
.priority-dot {
  box-shadow: 0 0 8px currentColor;
  animation: dotPulseTA 2.4s ease-in-out infinite;
}
@keyframes dotPulseTA {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.25); }
}

/* Search input — animated focus halo */
.search-input:focus {
  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.14), 0 4px 18px -4px rgba(250, 204, 21, 0.30);
}
.search-wrap svg { transition: color 0.25s, transform 0.25s; }
.search-wrap:focus-within svg { color: #facc15; transform: scale(1.06); }

/* Filter pills — smooth elastic */
.filter-pill { transition: background 0.25s, border-color 0.25s, color 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.filter-pill:hover { transform: translateY(-2px); }
.filter-pill.active { box-shadow: 0 6px 18px rgba(250, 204, 21, 0.32); }

/* Task selection card — refined motion + shimmer + spotlight on hover */
.task-selection-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  animation: tscFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.task-selection-card:nth-child(1) { animation-delay: 0.05s; }
.task-selection-card:nth-child(2) { animation-delay: 0.10s; }
.task-selection-card:nth-child(3) { animation-delay: 0.15s; }
.task-selection-card:nth-child(4) { animation-delay: 0.20s; }
.task-selection-card:nth-child(5) { animation-delay: 0.25s; }
.task-selection-card:nth-child(6) { animation-delay: 0.30s; }
.task-selection-card:nth-child(7) { animation-delay: 0.35s; }
.task-selection-card:nth-child(8) { animation-delay: 0.40s; }
@keyframes tscFade {
  from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0); filter: blur(0); }
}
.task-selection-card::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(120deg, transparent 25%, rgba(250, 204, 21, 0.08) 50%, transparent 75%);
  transform: translateX(-100%);
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.task-selection-card:hover::after { transform: translateX(100%); }
.task-selection-card:hover {
  box-shadow: 0 22px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(250, 204, 21, 0.18), 0 0 36px -10px rgba(250, 204, 21, 0.30);
}

/* type-badge — keep yellow palette, refined */
.type-badge { transition: background 0.25s, color 0.25s, transform 0.25s; }
.type-badge:hover { transform: translateY(-1px); }

/* Reset task button — refined hover */
.reset-task-btn { transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.reset-task-btn:hover { transform: translateY(-1px); border-color: rgba(250, 204, 21, 0.32); }

/* Step indicator num — gentle pulse on active */
.step-indicator.active .step-num {
  box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.14), 0 6px 18px rgba(250, 204, 21, 0.30);
  animation: stepNumPulse 2.4s ease-in-out infinite;
}
@keyframes stepNumPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.14), 0 6px 18px rgba(250, 204, 21, 0.30); }
  50%      { box-shadow: 0 0 0 8px rgba(250, 204, 21, 0.06), 0 6px 18px rgba(250, 204, 21, 0.30); }
}

/* Verification card + step content — entrance stagger */
.verification-card,
.field-group,
.summary-card {
  animation: stepEnterTA 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.field-group { animation-delay: 0.08s; }
.summary-card { animation-delay: 0.12s; }
@keyframes stepEnterTA {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Btn-nav — refined */
.btn-nav { transition: background 0.25s, color 0.25s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s; }
.btn-nav.primary,
.btn-nav.glow {
  background: linear-gradient(135deg, #facc15, #f59e0b);
  box-shadow: 0 6px 18px rgba(250, 204, 21, 0.30);
}
.btn-nav.primary:not(:disabled):hover,
.btn-nav.glow:not(:disabled):hover {
  background: linear-gradient(135deg, #fbbf24, #facc15);
  box-shadow: 0 14px 32px rgba(250, 204, 21, 0.45);
  transform: translateY(-3px);
}
.btn-nav.glow {
  position: relative; overflow: hidden;
}
.btn-nav.glow::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.42) 50%, transparent 70%);
  transform: translateX(-100%);
  transition: transform 0.7s;
}
.btn-nav.glow:not(:disabled):hover::before { transform: translateX(100%); }

/* history-context-aid — refined accent + animated leading bar */
.history-context-aid {
  position: relative;
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.04), rgba(250, 204, 21, 0.01)) !important;
  border: 1px solid rgba(250, 204, 21, 0.18) !important;
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.history-context-aid::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, #facc15, transparent);
  animation: hcaBar 2.6s ease-in-out infinite;
}
@keyframes hcaBar {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 1; }
}
.aid-header svg { filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.40)); }

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║ LIGHT THEME — every widget that bleeds dark on cream                  ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */

/* Back button */
[data-theme="light"] .back-btn {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .back-btn:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .back-btn svg { color: var(--text-primary); }

/* Header-right status box */
[data-theme="light"] .status-indicator-box {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78), rgba(252, 240, 220, 0.62)) !important;
  border: 1px solid rgba(217, 119, 6, 0.22) !important;
  box-shadow: 0 6px 20px rgba(40, 25, 10, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .status-indicator-box::before {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.55), transparent);
}
[data-theme="light"] .indicator-sep { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .header-titles p span { color: #b45309; }
[data-theme="light"] .indicator-value .text.status { color: #b45309; }
/* priority dots keep their semantic palette */

/* Search wrap + input */
[data-theme="light"] .search-wrap svg {
  color: rgba(60, 45, 30, 0.55);
}
[data-theme="light"] .search-wrap:focus-within svg { color: #b45309; }
[data-theme="light"] .search-input {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .search-input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .search-input:focus {
  background: rgba(255, 246, 226, 0.92);
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14), 0 4px 18px -4px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .search-count {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.36);
  color: #92400e;
}

/* Filter pills */
[data-theme="light"] .filter-pill {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: rgba(60, 45, 30, 0.65);
}
[data-theme="light"] .filter-pill:hover {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(40, 25, 10, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .filter-pill.active {
  background: #fbbf24;
  border-color: #fbbf24;
  color: #1a0f00;
  box-shadow: 0 6px 18px rgba(250, 204, 21, 0.32);
}

/* Task selection cards */
[data-theme="light"] .task-selection-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78), rgba(252, 240, 220, 0.55));
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .task-selection-card:hover {
  border-color: rgba(217, 119, 6, 0.32);
  box-shadow: 0 22px 50px -10px rgba(40, 25, 10, 0.22), 0 0 0 1px rgba(217, 119, 6, 0.18), 0 0 36px -10px rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .task-selection-card::after {
  background: linear-gradient(120deg, transparent 25%, rgba(217, 119, 6, 0.10) 50%, transparent 75%);
}

/* type-badge — red background in light theme (text stays default) */
[data-theme="light"] .type-badge {
  background: rgba(239, 68, 68, 0.18) !important;
  border: 1px solid rgba(239, 68, 68, 0.45) !important;
}

/* mini-avatar placeholder — visible cream chip with yellow initials */
[data-theme="light"] .mini-avatar.placeholder {
  background: rgba(250, 204, 21, 0.14);
  color: #b45309;
  border: 1px solid rgba(217, 119, 6, 0.40);
}

/* v-row.personal — ultra-modern card (light theme) */
[data-theme="light"] .v-row.personal {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78), rgba(252, 240, 220, 0.55));
  border: 1px solid rgba(217, 119, 6, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 4px 14px rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .v-row.personal::before {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.55), transparent);
}
[data-theme="light"] .v-row.personal:hover {
  border-color: rgba(217, 119, 6, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 8px 24px rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .v-row.personal .person-info { color: var(--text-primary); }

/* Assignment history border in light theme */
[data-theme="light"] .assignment-history,
[data-theme="light"] .history-wrapper {
  border-color: rgba(40, 25, 10, 0.10);
  background: rgba(40, 25, 10, 0.03);
}

/* Scrollbar */
[data-theme="light"] .task-grid-scroll::-webkit-scrollbar-track {
  background: rgba(40, 25, 10, 0.05);
}
[data-theme="light"] .task-grid-scroll::-webkit-scrollbar-thumb {
  background: #d97706;
  border: 3px solid rgba(255, 250, 240, 0.85);
}
[data-theme="light"] .task-grid-scroll::-webkit-scrollbar-thumb:hover { background: #b45309; }

/* Reset task button */
[data-theme="light"] .reset-task-btn {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .reset-task-btn:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
}

/* Journey column — step indicators */
[data-theme="light"] .step-num {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.14);
  color: rgba(60, 45, 30, 0.55);
}
[data-theme="light"] .step-indicator.active .step-num {
  background: #fbbf24;
  border-color: #fbbf24;
  color: #1a0f00;
}
[data-theme="light"] .step-indicator.completed .step-num {
  background: rgba(34, 197, 94, 0.14);
  border-color: #16a34a;
  color: #166534;
}
[data-theme="light"] .step-line { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .step-indicator.completed .step-line { background: #16a34a; }

/* Verification card */
[data-theme="light"] .v-row.desc p { color: var(--text-secondary); }
[data-theme="light"] .v-row.personal {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.10);
}

/* Info alert */
[data-theme="light"] .info-alert {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.32);
  color: var(--text-primary);
}
[data-theme="light"] .info-alert b { color: #b45309; }

/* Textarea */
[data-theme="light"] .nano-textarea {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .nano-textarea::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .nano-textarea:focus {
  background: rgba(255, 246, 226, 0.92);
  border-color: rgba(217, 119, 6, 0.55);
}

/* Summary card */
[data-theme="light"] .summary-card {
  background: rgba(217, 119, 6, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .summary-line { color: var(--text-primary); }
[data-theme="light"] .summary-line b { color: #b45309; }

/* Btn-nav */
[data-theme="light"] .btn-nav.secondary {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .btn-nav.secondary:hover:not(:disabled) {
  background: rgba(40, 25, 10, 0.10);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .btn-nav.primary,
[data-theme="light"] .btn-nav.glow {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .btn-nav.primary:not(:disabled):hover,
[data-theme="light"] .btn-nav.glow:not(:disabled):hover {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 14px 32px rgba(217, 119, 6, 0.45);
}

/* History column + context aid */
[data-theme="light"] .history-context-aid {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(217, 119, 6, 0.03)) !important;
  border: 1px solid rgba(217, 119, 6, 0.28) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .history-context-aid::before {
  background: linear-gradient(180deg, #d97706, transparent);
}
[data-theme="light"] .aid-header { color: #b45309; }
[data-theme="light"] .aid-header svg {
  color: #b45309;
  filter: drop-shadow(0 0 6px rgba(217, 119, 6, 0.40));
}
[data-theme="light"] .history-context-aid p { color: var(--text-secondary); }

/* Empty state inside grid */
[data-theme="light"] .muted-icon,
[data-theme="light"] .empty-results { color: rgba(60, 45, 30, 0.50); }
</style>
