<template>
  <Teleport to="body">
    <Transition name="slide-fade">
      <div v-if="isOpen && task" class="drawer-overlay" @click="close">
        <div class="drawer-panel" @click.stop>
          
          <!-- Header (Styled exactly like Payments) -->
          <div class="drawer-header">
            <div class="header-top">
              <div class="id-badge">
                <span class="label">TASK ID</span>
                <div class="id-value-row">
                  <span class="value">{{ task.task_code || task.id?.substring(0,8).toUpperCase() || '—' }}</span>
                  <span v-if="(task.status || '').toLowerCase() === 'expired'" class="expired-badge">Task Incompleted</span>
                </div>
              </div>
              
              <div style="display: flex; align-items: center;">
                  <button v-if="!viewOnly && ['open', 'upcoming'].includes((task.status || '').toLowerCase())" class="start-btn" @click="startTaskBtn">
                    <Play :size="14" />
                    <span>Start Task</span>
                  </button>
                  <button v-if="!viewOnly" class="delete-btn" :class="{ 'confirm': showDeleteConfirm }" @click="handleDeleteClick">
                    <Trash2 :size="14" />
                    <span v-if="showDeleteConfirm">Confirm?</span>
                    <span v-else>Delete</span>
                  </button>
                  
                  <button class="close-btn" @click="close">
                    <X :size="20" />
                  </button>
              </div>
            </div>
            
            <div class="header-main">
              <div class="vendor-group">
                <div class="vendor-avatar">
                  <CheckSquare :size="24" />
                </div>
                <div class="vendor-info">
                  <h2>{{ task.title || 'Untitled Task' }}</h2>
                  <span class="category">{{ task.project_name || 'No Project' }} &bull; {{ task.task_type || 'General' }}</span>
                </div>
              </div>
              
              <div class="amount-display">
                <span class="currency">Est. Hours</span>
                <span class="amount">{{ task.estimated_hours || 0 }}<span style="font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.4); margin-left: 4px;">h</span></span>
              </div>
            </div>

            <!-- Status Bar -->
            <div class="status-bar" :class="task.status?.toLowerCase() || 'open'">
              <Check v-if="task.status==='completed'" :size="16" />
              <AlertCircle v-else-if="task.status?.toLowerCase()==='expired'" :size="16" />
              <Clock v-else-if="task.status?.toLowerCase()==='extended'" :size="16" />
              <Clock v-else :size="16" />
              <span>{{ task.status?.toLowerCase() === 'expired' ? 'Expired' : (task.status?.toLowerCase() === 'extended' ? 'Extended' : capitalize(task.status)) }}</span>
              <span class="date">Due on {{ formatDate(task.due_date) }}</span>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="drawer-content">
            
            <!-- Overall Progress (Auto-calculated) -->
            <div class="detail-section progress-section" v-if="task.checklist && task.checklist.length">
                <div class="progress-header">
                    <span class="label">OVERALL PROGRESS</span>
                    <span class="percent">{{ task.progress }}%</span>
                </div>
                <div class="progress-bar-wrap" :title="`${task.checklist.filter(i => i.is_completed).length} of ${task.checklist.length} subtasks completed`">
                    <div class="progress-bar-fill" :style="{ width: task.progress + '%' }"></div>
                </div>
            </div>

            <!-- Section: Primary Details -->
            <div class="detail-section">
              <h3>Task Details</h3>
              <div class="detail-grid">
                <div class="field">
                  <label>Relation</label>
                  <div class="value">{{ task.project_id ? 'Project Task' : 'Standalone Task' }}</div>
                </div>
                <div class="field">
                  <label>Assignee</label>
                  <div class="value-pill">
                    <User :size="14" />
                    {{ task.assignee_name || 'Unassigned' }}
                  </div>
                </div>
                <div class="field">
                  <label>Created By</label>
                  <div class="value">{{ task.creator_name || 'System' }}</div>
                </div>
                <div class="field">
                  <label>Priority</label>
                  <div class="value-pill" :class="task.priority?.toLowerCase() || 'medium'">
                    {{ capitalize(task.priority || 'Medium') }}
                  </div>
                </div>
                <div class="field">
                  <label>Start Date</label>
                  <div class="value">{{ formatDate(task.start_date) }}</div>
                </div>
                <div class="field">
                  <label>Due Date</label>
                  <div class="value">{{ formatDate(task.due_date) }}</div>
                </div>
                <div class="field" v-if="task.completed_at">
                  <label>Completed On</label>
                  <div class="value text-green">{{ formatDate(task.completed_at) }}</div>
                </div>
                <div class="field" v-if="task.module">
                  <label>Module Area</label>
                  <div class="value">{{ task.module }}</div>
                </div>
                <div class="field">
                  <label>Task Type</label>
                  <div class="value font-mono">{{ capitalize((task.task_type || 'General').replace('_', ' ')) }}</div>
                </div>
              </div>
            </div>

            <!-- Section: Relations & Connectivity -->
            <div class="detail-section">
              <h3>Connections</h3>
              <div class="detail-grid">
                 <div class="field">
                    <label>Watchers ({{ task.watchers?.length || 0 }})</label>
                    <div class="val" style="display:flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                        <span v-for="w in (task.watchers || [])" :key="w" class="value-pill" style="font-size: 11px;">
                            <Users :size="12" /> {{ task.watcher_names && task.watcher_names[w] ? task.watcher_names[w] : getUserName(w) }}
                        </span>
                        <span v-if="!task.watchers?.length" class="val" style="font-size:12px; color: rgba(255,255,255,0.4);">No watchers assigned</span>
                    </div>
                 </div>
                 <div class="field">
                    <label>Dependencies ({{ task.dependencies?.length || 0 }})</label>
                    <div class="val" style="display:flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                        <span v-for="d in (task.dependencies || [])" :key="d.id" class="value-pill" style="font-size: 11px;">
                            <Link2 :size="12" /> Task {{ d.depends_on_code || (typeof d === 'string' ? getTaskCode(d) : '???') }}
                        </span>
                        <span v-if="!task.dependencies?.length" class="val" style="font-size:12px; color: rgba(255,255,255,0.4);">No dependencies</span>
                    </div>
                 </div>
              </div>
            </div>
            
            <!-- Section: Checklist -->
            <div class="detail-section" v-if="task.checklist && task.checklist.length">
              <h3>Checklist ({{ task.checklist.length }})</h3>
              <div class="detail-card checklist-card">
                 <div class="chk-item" v-for="(item, i) in task.checklist" :key="i">
                    <CheckSquare v-if="item.is_completed" :size="16" class="icon-done" />
                    <Square v-else :size="16" class="icon-open" />
                    <span :class="{ 'done-text': item.is_completed }">{{ item.item_text }}</span>
                 </div>
              </div>
            </div>

            <!-- Section: Description -->
            <div class="detail-section" v-if="task.description">
              <h3>Description</h3>
              <div class="detail-card">
                  <p class="desc-text">{{ task.description }}</p>
              </div>
            </div>

            <!-- Section: Preferences -->
            <div class="detail-section">
              <h3>Preferences</h3>
              <div class="detail-grid">
                 <div class="field">
                    <label>Notify Assignee</label>
                    <div class="value" :class="{ 'text-green': task.notify_assignee }">{{ task.notify_assignee ? 'Yes' : 'No' }}</div>
                 </div>
                 <div class="field">
                    <label>Notify Watchers</label>
                    <div class="value" :class="{ 'text-green': task.notify_watchers }">{{ task.notify_watchers ? 'Yes' : 'No' }}</div>
                 </div>
                 <div class="field">
                    <label>Status Change Notice</label>
                    <div class="value" :class="{ 'text-green': task.notify_on_status_change }">{{ task.notify_on_status_change ? 'Yes' : 'No' }}</div>
                 </div>
              </div>
            </div>

            <!-- Section: Attachments -->
            <div class="detail-section">
              <h3>Attachments ({{ task.attachments?.length || 0 }})</h3>
              <div class="attachment-grid" v-if="task.attachments?.length">
                <div 
                  v-for="(file, idx) in task.attachments" 
                  :key="idx"
                  class="file-card"
                  @click="openAttachment(file)"
                >
                  <div class="file-icon">
                    <FileText :size="20" />
                  </div>
                  <div class="file-info">
                    <span class="name">{{ file.file_name || file.name || file }}</span>
                  </div>
                  <ExternalLink :size="14" class="link-icon" />
                </div>
              </div>
              <div v-else class="detail-card" style="text-align: center; color: rgba(255,255,255,0.3); font-size: 12px; padding: 24px;">
                No attachments uploaded yet
              </div>
            </div>

            <!-- Section: Assignment History -->
            <div class="detail-section">
               <TaskAssignmentHistory :task-id="task.id" ref="historyRef" />
            </div>

            <!-- Audit Trail (Directly from Expense pattern) -->
            <div class="detail-section" style="padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
               <h3>Audit Trail</h3>
               <div class="audit-card">
                  <div class="audit-avatar" v-if="task.creator_avatar">
                    <img :src="task.creator_avatar" style="width:100%; height:100%; border-radius:inherit; object-fit:cover;" />
                  </div>
                  <div class="audit-avatar" v-else>{{ getInitials(creatorName) }}</div>
                  <div class="audit-info">
                     <span class="audit-action">Created Task</span>
                     <span class="audit-user">by {{ creatorName }}</span>
                     <span class="audit-time">{{ formatDate(task.created_at || new Date()) }} at {{ formatTime(task.created_at || new Date()) }}</span>
                  </div>
               </div>
            </div>

          </div>

          <div class="drawer-footer" v-if="!viewOnly">
             <button class="btn-custom secondary" @click="handleEditClick" v-if="isAdmin && ['expired', 'extended'].includes((task.status || '').toLowerCase())">
                <Clock :size="16" /> Extend Task
             </button>
             <button class="btn-custom secondary" @click="handleEditClick" v-else>
                <Edit2 :size="16" /> Edit Task
             </button>
             <button class="btn-custom secondary" @click="openSubtaskModal" v-if="task.checklist && task.checklist.length">
                <ListChecks :size="16" /> Mark subtasks
             </button>
             <button class="btn-custom primary" @click="markTaskCompleted">
               <Check :size="16" /> Mark Task
             </button>
          </div>
          <div class="drawer-footer" v-else-if="viewOnly" style="justify-content: center; padding: 16px;">
             <span style="font-size: 12px; color: rgba(255,255,255,0.4);">
                <Check v-if="task.status === 'completed'" :size="12" style="display:inline; margin-bottom:-2px; margin-right:4px;" />
                <Clock v-else :size="12" style="display:inline; margin-bottom:-2px; margin-right:4px;" />
                {{ task.status === 'completed' ? 'Task is finished and is now View Only' : (task.status === 'cancelled' ? 'Task is cancelled and is now View Only' : 'Task is past due and is now View Only') }}
             </span>
          </div>

        </div>

        <!-- Subtask Modal Overlay -->
        <Transition name="fade">
          <div v-if="showSubtaskModal" class="subtask-modal-overlay" @click.stop>
            <div class="subtask-panel glass-panel">
              <div class="subtask-header">
                  <div class="subtask-icon-wrap">
                     <ListChecks :size="20" />
                  </div>
                  <div class="subtask-titles">
                    <h3>Mark Subtasks</h3>
                    <p>Check off the tasks you have completed</p>
                  </div>
              </div>
              
              <div class="checklist-items-modern">
                <label 
                  v-for="(item, i) in editingChecklist" 
                  :key="item.id || i" 
                  class="chk-item-modern"
                  :class="{ 'is-done': item.is_completed }"
                >
                  <input type="checkbox" hidden v-model="item.is_completed" />
                  <div class="chk-box">
                      <Check v-if="item.is_completed" :size="14" />
                  </div>
                  <span class="chk-text">{{ item.item_text }}</span>
                </label>
              </div>

              <div class="modal-footer-modern">
                <button class="btn-blur" @click="showSubtaskModal = false">Cancel</button>
                <button class="btn-glow" @click="saveSubtasks">Save Progress</button>
              </div>
            </div>
          </div>
        </Transition>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../../composables/useToast'
import {
  X, Check, Clock, User, Users, CheckSquare, Square, 
  Trash2, Play, Paperclip, FileText, ExternalLink, Edit2, ListChecks, Link2, AlertCircle
} from 'lucide-vue-next'
import TaskAssignmentHistory from './TaskAssignmentHistory.vue'

const { addToast } = useToast()

const props = defineProps({
  isOpen: Boolean,
  task: Object,
  users: { type: Array, default: () => [] },
  allTasks: { type: Array, default: () => [] },
  isAdmin: { type: Boolean, default: false }
})

const router = useRouter()
const historyRef = ref(null)

const viewOnly = computed(() => {
  if (props.isAdmin) return false;
  if (!props.task || !props.task.due_date) return false;
  
  if (props.task.status === 'completed' || props.task.status === 'cancelled') return true;

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const due = new Date(props.task.due_date);
  due.setHours(0,0,0,0);
  
  return due < today;
})

const currentUser = ref(null)
try {
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
  if (token) {
     const b64Url = token.split('.')[1]
     const b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/')
     currentUser.value = JSON.parse(decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')))
  }
} catch (e) {}

const creatorName = computed(() => {
    if (props.task.creator_name) {
         return props.task.creator_name
    }
    const currentId = currentUser.value?.sub || currentUser.value?.id
    if (currentUser.value && props.task.created_by === currentId) {
        return `${currentUser.value.full_name || 'User'} (You)`
    }
    return 'System'
})

const getUserName = (userId) => {
    const user = props.users.find(u => u.id === userId)
    return user ? user.full_name : 'Unknown User'
}

const getTaskCode = (taskId) => {
    const t = props.allTasks.find(t => t.id === taskId)
    return t ? (t.task_code || t.id.substring(0,8).toUpperCase()) : taskId.substring(0,8).toUpperCase()
}

const emit = defineEmits(['close', 'edit', 'delete', 'start', 'complete', 'updateChecklist', 'showError', 'open-subtasks'])

const close = () => {
  emit('close')
}

const showDeleteConfirm = ref(false)

const handleDeleteClick = () => {
  if (!showDeleteConfirm.value) {
    showDeleteConfirm.value = true
    setTimeout(() => { showDeleteConfirm.value = false }, 3000)
    return
  }
  emit('delete', props.task.id)
  showDeleteConfirm.value = false
}

const openAttachment = (f) => {
   let url = f;
   if (typeof f === 'string') {
       try {
           const parsed = JSON.parse(f);
           url = parsed.file_url || parsed;
       } catch (e) {
           // String but not JSON
       }
   } else if (typeof f === 'object' && f.file_url) {
       url = f.file_url;
   }
   
   if (typeof url === 'string') {
       if (url.startsWith('storage/')) {
           url = `http://localhost:8000/${url}`;
       }
       window.open(url, '_blank')
   }
}

const showSubtaskModal = ref(false)
const editingChecklist = ref([])

const openSubtaskModal = () => {
  const status = (props.task.status || '').toLowerCase()
  if (status !== 'in_progress' && status !== 'extended') {
    addToast("Please start the task first to mark subtasks.", 'error')
    return
  }
  editingChecklist.value = JSON.parse(JSON.stringify(props.task.checklist || []))
  showSubtaskModal.value = true
}

const saveSubtasks = () => {
  emit('updateChecklist', { taskId: props.task.id, checklist: editingChecklist.value })
  showSubtaskModal.value = false
}

const handleEditClick = () => {
    if (props.isAdmin) {
        emit('edit', props.task)
        return
    }
    
    const currentId = currentUser.value?.sub || currentUser.value?.id
    if (currentId && props.task.created_by === currentId) {
        emit('edit', props.task)
    } else {
        addToast("You don't have permission to edit this task.", 'error')
    }
}

const startTaskBtn = () => {
  emit('start', props.task.id)
}

const markTaskCompleted = () => {
   if (!props.isAdmin) {
      const status = (props.task.status || 'open').toLowerCase()
      if (status !== 'in_progress' && status !== 'extended') {
         addToast("Task must be In Progress or Extended to be marked as finished.", 'error')
         return
      }

      if (props.task.checklist && props.task.checklist.length > 0) {
         const allDone = props.task.checklist.every(c => c.is_completed)
         if (!allDone) {
            addToast("Complete all subtasks before marking task as finished.", 'error')
            return
         }
      }
   }
   emit('complete', props.task.id)
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
}

const capitalize = (s) => {
  if (!s) return 'Open'
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
}

const getInitials = (name) => {
  if (!name) return 'U'
  return name.substring(0, 2).toUpperCase()
}

const formatTime = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
/* Transition */
.slide-fade-enter-active, .slide-fade-leave-active { transition: opacity 0.3s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; }
.slide-fade-enter-active .drawer-panel, .slide-fade-leave-active .drawer-panel { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-enter-from .drawer-panel { transform: translateX(100%); }
.slide-fade-leave-to .drawer-panel { transform: translateX(100%); }

/* Layout - EXACTLY LIKE PAYMENTS DRAWER */
.drawer-overlay {
  position: fixed; inset: 0; 
  background: rgba(0, 0, 0, 0.4); 
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex; justify-content: flex-end;
}

.drawer-panel {
  width: 100%; max-width: 480px;
  background: rgba(15, 15, 17, 0.65); /* Transparent Dark */
  backdrop-filter: blur(28px); /* Glassmorphism */
  -webkit-backdrop-filter: blur(28px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -20px 0 50px rgba(0,0,0,0.5);
  display: flex; flex-direction: column;
  height: 100vh;
}

/* Header */
.drawer-header {
  padding: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.header-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.id-badge {
  display: flex; flex-direction: column;
}
.id-value-row {
  display: flex; align-items: center; gap: 12px; margin-top: 4px;
}
.id-badge .label { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; font-weight: 700; text-transform: uppercase; }
.id-badge .value { font-family: 'SF Mono', monospace; font-size: 13px; color: rgba(255,255,255,0.7); }

.close-btn {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.6);
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.delete-btn {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600;
  margin-right: 8px; /* Spacing from close btn */
}
.delete-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
.delete-btn.confirm { background: #ef4444; color: white; border-color: #ef4444; }

.start-btn {
  background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); color: #4ade80;
  height: 32px; padding: 0 12px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  font-size: 11px; font-weight: 600;
  margin-right: 8px;
}
.start-btn:hover { background: rgba(74, 222, 128, 0.2); border-color: #4ade80; }

.header-main {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px;
}

.vendor-group { display: flex; gap: 12px; align-items: center; }
.vendor-avatar {
  width: 48px; height: 48px; border-radius: 12px;
  background: linear-gradient(135deg, #F59E0B, #D97706); color: white;
  display: flex; align-items: center; justify-content: center;
  /* box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); Removed to prevent modal blur neon bleed */
}
.vendor-info h2 { font-size: 18px; font-weight: 600; color: white; margin: 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vendor-info .category { font-size: 13px; color: rgba(255,255,255,0.5); text-transform: capitalize; }

.amount-display { text-align: right; }
.amount-display .currency { display: block; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
.amount-display .amount { font-size: 24px; font-weight: 700; color: white; letter-spacing: -0.02em; }

.status-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500; text-transform: capitalize;
}
.status-bar.expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.status-bar.extended { background: rgba(135, 88, 255, 0.1); color: #a78bfa; }
.status-bar.completed { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
.status-bar.open, .status-bar.in_progress, .status-bar.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.status-bar.blocked, .status-bar.failed { background: rgba(248, 113, 113, 0.1); color: #f87171; }
.status-bar .date { margin-left: auto; color: inherit; opacity: 0.7; font-weight: 400; font-size: 12px; text-transform: none; }

.expired-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.05em;
  animation: pulse-expired 2s infinite;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

@keyframes pulse-expired {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}

/* Content */
.drawer-content {
  flex: 1; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 32px;
}

.detail-section h3 {
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 16px; margin-top: 0;
}

.detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.field label { display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.field .value { font-size: 14px; color: #f5f5f7; }
.font-mono { font-family: 'SF Mono', monospace; }
.value-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;
  font-size: 13px; color: rgba(255,255,255,0.8); text-transform: capitalize;
}
.value-pill.high, .value-pill.critical { background: rgba(239, 68, 68, 0.1); color: #f87171; }
.value-pill.low { color: #4ade80; }

.detail-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 16px;
}
.desc-text { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.6; margin: 0; white-space: pre-wrap; }

.field-mini { display: flex; flex-direction: column; gap: 4px; }
.field-mini label { display: block; font-size: 10px; color: rgba(255,255,255,0.4); }
.field-mini .val { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 600; }
.field-mini .val.text-green { color: #4ade80; }

.checklist-card { display: flex; flex-direction: column; gap: 12px; }
.chk-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.9); }
.icon-done { color: #F59E0B; flex-shrink: 0; margin-top: 2px; }
.icon-open { color: rgba(255,255,255,0.2); flex-shrink: 0; margin-top: 2px; }
.done-text { text-decoration: line-through; color: rgba(255,255,255,0.4); }

/* Footer */
.drawer-footer {
  padding: 24px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; gap: 12px;
}
.btn-custom {
  flex: 1; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 12px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.2s; letter-spacing: 0.01em;
}
.btn-custom.secondary { 
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); 
}
.btn-custom.secondary:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-1px); }

.btn-custom.primary { 
    background: #F59E0B; border: none; color: black; 
}
.btn-custom.primary:hover { background: #fbbf24; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2); }

/* Attachments */
.attachment-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.file-card {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);
  padding: 12px; border-radius: 8px; cursor: pointer;
  transition: all 0.2s;
}
.file-card:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
.file-icon { color: #F59E0B; }
.file-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.file-info .name { font-size: 13px; color: #f5f5f7; font-weight: 500; }
.link-icon { color: rgba(255,255,255,0.3); }

/* Subtask Modal Extensions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; backdrop-filter: blur(0px); }

.subtask-modal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  z-index: 100; display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.subtask-panel.glass-panel {
  background: rgba(15, 15, 17, 0.65);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  padding: 28px; border-radius: 20px;
  width: 100%; max-width: 420px;
  transform: translateY(0) scale(1);
  animation: modalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Progress Bar Styles */
.progress-section { margin-bottom: 24px; }
.progress-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.progress-header .label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3); letter-spacing: 0.05em; }
.progress-header .percent { font-size: 14px; font-weight: 700; color: #f59e0b; }
.progress-bar-wrap { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 3px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes modalPop {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* Audit Trail (Matching AllExpenses design) */
.audit-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px; padding: 14px;
}
.audit-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.1); color: #F59E0B;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; flex-shrink: 0;
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.audit-info { display: flex; flex-direction: column; gap: 2px; }
.audit-action { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }
.audit-user { font-size: 14px; font-weight: 600; color: white; }
.audit-time { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }

.subtask-header {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.subtask-icon-wrap {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.subtask-titles h3 { margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #fff; letter-spacing: -0.01em; }
.subtask-titles p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.5); }

.checklist-items-modern {
  display: flex; flex-direction: column; gap: 8px;
  max-height: 320px; overflow-y: auto; padding-right: 4px;
}
.checklist-items-modern::-webkit-scrollbar { width: 4px; }
.checklist-items-modern::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.chk-item-modern {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; 
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.chk-item-modern:hover {
  background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1);
  transform: translateY(-1px);
}
.chk-item-modern.is-done {
  background: rgba(74, 222, 128, 0.05);
  border-color: rgba(74, 222, 128, 0.15);
}

.chk-box {
  width: 20px; height: 20px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; color: #151515;
}
.chk-item-modern.is-done .chk-box {
  background: #4ade80; border-color: #4ade80;
}
.chk-text {
  font-size: 14px; color: rgba(255,255,255,0.9); transition: all 0.2s;
}
.chk-item-modern.is-done .chk-text {
  color: #4ade80; text-decoration: line-through; opacity: 0.8;
}

.modal-footer-modern {
  display: flex; gap: 12px; margin-top: 32px;
}
.btn-blur {
  flex: 1; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 14px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;
  cursor: pointer; transition: all 0.2s;
}
.btn-blur:hover { background: rgba(255,255,255,0.1); }

.btn-glow {
  flex: 1; padding: 14px; border-radius: 12px; font-weight: 600; font-size: 14px;
  background: #F59E0B; border: none; color: #111;
  cursor: pointer; transition: all 0.2s;
}
.btn-glow:hover { 
  background: #fcd34d;
  transform: translateY(-1px);
}
</style>
