<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-panel">

          <!-- Header -->
          <div class="modal-header">
            <div class="header-text">
              <h2>Edit Task</h2>
              <p class="task-code">{{ task?.task_code || 'TSK-XXXX' }}</p>
            </div>
            <button class="close-btn" @click="close"><X :size="20" /></button>
          </div>

          <!-- Progress Steps -->
          <div class="progress-container">
            <div class="step-indicators">
              <div
                v-for="(step, index) in steps"
                :key="index"
                class="step-dot"
                :class="{ active: currentStep === index, completed: currentStep > index }"
                @click="goToStep(index)"
              >
                <Check v-if="currentStep > index" :size="12" />
                <component v-else :is="step.icon" :size="14" />
                <span class="step-label">{{ step.label }}</span>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <Transition :name="slideDirection" mode="out-in">

              <!-- Step 1: Basic Info -->
              <div v-if="currentStep === 0" key="s0" class="step-content">
                <div class="step-header"><ClipboardList :size="20" /><span>Basic Information</span></div>
                <div class="form-grid">
                  <div class="form-group full">
                    <label>Task Title <span class="req">*</span></label>
                    <input v-model="form.title" type="text" placeholder="What needs to be done?" class="text-input" :class="{ 'has-error': v.title }" />
                    <span v-if="v.title" class="field-error"><AlertTriangle :size="11" /> Title is required</span>
                  </div>
                  <div class="form-group">
                    <label>Task Type</label>
                    <CustomSelect v-model="form.task_type" :options="typeOptions" placeholder="Select type" labelKey="label" valueKey="value" />
                  </div>
                  <div class="form-group">
                    <label>Project</label>
                    <CustomSelect v-model="form.project_id" :options="projectOptions" placeholder="Select project" labelKey="label" valueKey="value" />
                  </div>
                  <div class="form-group">
                    <label>Module / Phase</label>
                    <CustomSelect
                      v-model="form.module"
                      :options="moduleOptions"
                      placeholder="Select Module"
                      labelKey="label"
                      valueKey="value"
                    />
                  </div>
                  <div class="form-group full">
                    <label>Description</label>
                    <textarea v-model="form.description" rows="3" placeholder="Provide more details..." class="text-input"></textarea>
                  </div>
                </div>
              </div>

              <!-- Step 2: Scheduling -->
              <div v-else-if="currentStep === 1" key="s1" class="step-content">
                <div class="step-header"><Calendar :size="20" /><span>Scheduling & Priority</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Start Date</label>
                    <CompactDatePicker v-model="form.start_date" placeholder="Select start date" :min-date="minStartDate" :disabled="isStartDateLocked" />
                    <p v-if="isStartDateLocked" class="progress-hint" style="margin-top: 4px; color: #f59e0b;">Start date is locked for extended tasks</p>
                  </div>
                  <div class="form-group">
                    <label>Due Date <span class="req">*</span></label>
                    <CompactDatePicker v-model="form.due_date" placeholder="Select due date" :error="v.due_date || startDateAfterDueDate || isInvalidAdminDueDate" :min-date="minDueDate" :disabled="isExtendedTaskLocked" />
                    <span v-if="v.due_date" class="field-error"><AlertTriangle :size="11" /> Due date required</span>
                    <span v-else-if="startDateAfterDueDate" class="field-error"><AlertTriangle :size="11" /> Start date cannot be greater than due date</span>
                    <span v-else-if="isInvalidAdminDueDate" class="field-error"><AlertTriangle :size="11" /> New due date must be strictly greater than previous due date</span>
                    <p v-if="isExtendedTaskLocked" class="progress-hint" style="margin-top: 4px; color: #f59e0b;">Due date is locked for extended tasks</p>
                  </div>
                  <div class="form-group">
                    <label>Estimated Hours</label>
                    <div class="input-with-prefix">
                      <span class="prefix"><Clock :size="14" /></span>
                      <input v-model.number="form.estimated_hours" type="text" inputmode="decimal" placeholder="0.0" class="text-input mono no-arrows" @keypress="onlyNumeric" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Priority</label>
                    <div class="chip-row">
                      <button v-for="p in ['low','medium','high','critical']" :key="p" class="chip" :class="{ active: form.priority === p, [p]: form.priority === p }" @click="form.priority = p">{{ p }}</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <CustomSelect v-model="form.status" :options="statusOptions" placeholder="Select status" labelKey="label" valueKey="value" />
                  </div>
                  <div class="form-group">
                    <div class="flex justify-between items-center mb-1">
                      <label>Progress ({{ form.progress }}%)</label>
                    </div>
                    <input 
                      v-model.number="form.progress" 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="1" 
                      class="range-input" 
                      :disabled="form.checklist && form.checklist.length > 0"
                    />
                    <p v-if="form.checklist && form.checklist.length > 0" class="progress-hint">
                      Progress is auto-calculated based on subtasks
                    </p>
                  </div>
                </div>
              </div>

              <!-- Step 3: Assignment -->
              <div v-else-if="currentStep === 2" key="s2" class="step-content">
                <div class="step-header"><User :size="20" /><span>Assignment & Watching</span></div>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Assignee</label>
                    <CustomSelect v-model="form.assigned_to" :options="userOptions" placeholder="Select user" labelKey="label" valueKey="value" />
                  </div>
                  <div class="form-group full">
                    <label>Watchers</label>
                    <div class="multiselect-box">
                      <div class="selected-tags">
                        <div v-for="id in form.watchers" :key="id" class="tag">
                          <span>{{ getUserName(id) }}</span>
                          <button @click="removeWatcher(id)"><X :size="10" /></button>
                        </div>
                      </div>
                      <CustomSelect :options="watcherOptions" placeholder="Add watcher..." labelKey="label" valueKey="value" @update:modelValue="addWatcher" />
                    </div>
                  </div>
                  <div class="form-group full">
                    <label class="switch-label" @click="form.notify_on_status_change = !form.notify_on_status_change">
                      <span class="switch-track" :class="{ on: form.notify_on_status_change }"><span class="switch-thumb"></span></span>
                      Notify on status change
                    </label>
                  </div>
                </div>
              </div>

              <!-- Step 4: Checklist & Deps -->
              <div v-else-if="currentStep === 3" key="s3" class="step-content">
                <div class="step-header"><ListChecks :size="20" /><span>Checklist & Dependencies</span></div>
                
                <div class="section-divider"><span>Sub-tasks Checklist</span></div>
                <div class="checklist-builder">
                  <div v-for="(item, i) in form.checklist" :key="i" class="cl-row">
                    <div class="cl-checkbox" :class="{ active: item.is_completed }" @click="item.is_completed = !item.is_completed">
                      <Check v-if="item.is_completed" :size="12" stroke-width="3" />
                    </div>
                    <input v-model="item.item_text" placeholder="Action item..." class="cl-input" :class="{'is-done': item.is_completed}" @keydown.enter="addCheckItem" />
                    <button class="icon-btn-danger" @click="removeCheckItem(i)"><X :size="14" /></button>
                  </div>
                  <button class="btn-ghost sm btn-add-item" @click="addCheckItem"><Plus :size="14" /> Add Item</button>
                </div>

                <div class="section-divider"><span>Task Dependencies</span></div>
                <div class="deps-builder">
                    <div class="selected-deps mt-2" v-if="form.dependencies?.length">
                        <div v-for="(dep, i) in form.dependencies" :key="dep.depends_on_task_id" class="dep-item">
                            <span class="dep-code">{{ getTaskCode(dep.depends_on_task_id) }}</span>
                            <span class="dep-title">{{ getTaskTitle(dep.depends_on_task_id) }}</span>
                            <button class="dismiss-btn" @click="removeDependency(i)"><X :size="12" /></button>
                        </div>
                    </div>
                    <div class="search-wrap mt-3">
                        <Search :size="14" class="search-icon" />
                        <input 
                            v-model="depSearch" 
                            placeholder="Search tasks to add as dependency..." 
                            class="text-input search"
                            @input="onDepSearch"
                        />
                        <div v-if="depResults.length" class="search-results">
                            <div v-for="res in depResults" :key="res.id" class="res-item" @click="addDependency(res)">
                                <span class="res-code">{{ res.task_code }}</span>
                                <span class="res-title">{{ res.title }}</span>
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              <!-- Step 5: Attachments -->
              <div v-else-if="currentStep === 4" key="s4" class="step-content">
                <div class="step-header"><Paperclip :size="20" /><span>Attachments</span></div>
                <div class="drop-zone" :class="{ active: dragActive }" @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop.prevent="onFileDrop">
                  <UploadCloud :size="28" class="drop-icon" />
                  <p class="drop-title">Drag & drop files here</p>
                  <span class="drop-or">or</span>
                  <label class="browse-btn">Browse Files<input type="file" multiple hidden @change="onFileSelect" /></label>
                </div>
                <div v-if="form.attachments && form.attachments.length" class="file-list mt-4">
                  <div v-for="(f, i) in form.attachments" :key="i" class="file-row">
                    <div class="file-meta"><FileText :size="15" /><span>{{ f.file_name }}</span></div>
                    <button class="dismiss-btn" @click="removeFile(i)"><X :size="14" /></button>
                  </div>
                </div>
              </div>

              <!-- Step 6: Review -->
              <div v-else-if="currentStep === 5" key="s5" class="step-content">
                <div class="step-header"><ShieldCheck :size="20" /><span>Review & Update</span></div>
                <div class="review-grid">
                  <div class="review-card main-info">
                    <div class="card-title">Basic Details</div>
                    <div class="review-row">
                      <div class="rev-label">Title</div>
                      <div class="rev-val">{{ form.title || '—' }}</div>
                    </div>
                    <div class="review-row-group">
                      <div class="review-row">
                        <div class="rev-label">Type</div>
                        <div class="rev-val badge">{{ form.task_type || 'General' }}</div>
                      </div>
                      <div class="review-row">
                        <div class="rev-label">Priority</div>
                        <div class="rev-val priority-pill" :class="form.priority">
                          <Circle :size="8" fill="currentColor" /> {{ form.priority }}
                        </div>
                      </div>
                    </div>
                    <div class="review-row">
                      <div class="rev-label">Status</div>
                      <div class="rev-val status-pill">{{ form.status.replace('_', ' ') }}</div>
                    </div>
                  </div>

                  <div class="review-card secondary-info">
                    <div class="card-title">Schedule & Assignment</div>
                    <div class="review-row">
                      <div class="rev-label">Dates</div>
                      <div class="rev-val font-mono">{{ formatDate(form.start_date) }} → {{ formatDate(form.due_date) }}</div>
                    </div>
                    <div class="review-row">
                      <div class="rev-label">Assignee</div>
                      <div class="rev-val user-chip">
                        <User :size="12" /> {{ getUserName(form.assigned_to) || 'Unassigned' }}
                      </div>
                    </div>
                    <div class="review-row">
                      <div class="rev-label">Progress</div>
                      <div class="progress-preview-bar">
                        <div class="p-fill" :style="{ width: form.progress + '%' }"></div>
                        <span class="p-text">{{ form.progress }}%</span>
                      </div>
                    </div>
                  </div>

                  <div class="review-card stats-info">
                    <div class="card-title">Sub-tasks & Deps</div>
                    <div class="stats-row">
                      <div class="stat-box">
                        <span class="s-val">{{ form.checklist?.length || 0 }}</span>
                        <span class="s-lab">Items</span>
                      </div>
                      <div class="stat-box">
                        <span class="s-val">{{ form.dependencies?.length || 0 }}</span>
                        <span class="s-lab">Deps</span>
                      </div>
                      <div class="stat-box">
                        <span class="s-val">{{ form.attachments?.length || 0 }}</span>
                        <span class="s-lab">Files</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </Transition>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button v-if="currentStep > 0" class="btn-text secondary" @click="prevStep">
              <ArrowLeft :size="16" /><span>Back</span>
            </button>
            <button v-else class="btn-text secondary" @click="close">Cancel</button>
            <div class="footer-right">
              <button v-if="currentStep < steps.length - 1" class="btn-pill primary" @click="nextStep">
                <span>Continue</span><ArrowRight :size="16" />
              </button>
              <button v-else class="btn-pill primary" :disabled="isSubmitting" @click="handleSubmit">
                <Loader2 v-if="isSubmitting" :size="16" class="spin" />
                <span>{{ isSubmitting ? 'Updating...' : 'Update Task' }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import {
  X, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle, Plus, Circle,
  ClipboardList, Calendar, Clock, User, ListChecks, Paperclip, ShieldCheck,
  Search, UploadCloud, FileText
} from 'lucide-vue-next'
import CustomSelect from '../ui/CustomSelect.vue'
import CompactDatePicker from '../ui/CompactDatePicker.vue'
import { useToast } from '../../composables/useToast'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: Boolean,
  task: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'updated'])
const { success: toastSuccess, error: toastError } = useToast()

const isAdmin = computed(() => window.location.pathname.startsWith('/admin'))
const getHeaders = () => {
    const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    return { Authorization: `Bearer ${token}` }
}

const steps = [
  { label: 'Basic Info', icon: ClipboardList },
  { label: 'Scheduling', icon: Calendar },
  { label: 'Assignment', icon: User },
  { label: 'Checklist', icon: ListChecks },
  { label: 'Files', icon: Paperclip },
  { label: 'Review', icon: ShieldCheck },
]


const currentStep = ref(0)
const isSubmitting = ref(false)
const dragActive = ref(false)
const slideDirection = ref('slide-left')
const progressPercent = computed(() => ((currentStep.value) / (steps.length - 1)) * 100)

const projects = ref([])
const users = ref([])
const depSearch = ref('')
const depResults = ref([])
const originalTask = ref(null)

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const minStartDate = computed(() => {
  if (isAdmin.value) return '' // Admin can set any start date
  return todayStr.value
})

const minDueDate = computed(() => {
  const origStatus = originalTask.value?.status?.toLowerCase()
  if (isAdmin.value && (origStatus === 'expired' || origStatus === 'extended')) {
    const origDue = originalTask.value?.due_date
    if (origDue) {
      // Calculate the day after the original due date
      const d = new Date(origDue)
      d.setDate(d.getDate() + 1)
      const nextDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      // The min selectable date is the later of 'today' or 'the day after origDue'
      return nextDayStr > todayStr.value ? nextDayStr : todayStr.value
    }
    return todayStr.value
  }
  if (!isAdmin.value) return todayStr.value
  return ''
})

const startDateAfterDueDate = computed(() => {
  return form.start_date && form.due_date && form.start_date > form.due_date
})

const isInvalidAdminDueDate = computed(() => {
  if (!isAdmin.value || !form.due_date) return false
  const origStatus = originalTask.value?.status?.toLowerCase()
  if (origStatus === 'expired' || origStatus === 'extended') {
    const origDue = originalTask.value?.due_date
    if (origDue && form.due_date <= origDue) {
      return true
    }
  }
  return false
})

const isExtendedTaskLocked = computed(() => {
  return !isAdmin.value && originalTask.value?.status?.toLowerCase() === 'extended'
})

const isStartDateLocked = computed(() => {
  return originalTask.value?.status?.toLowerCase() === 'extended'
})

const form = reactive({
  title: '', task_type: 'general', project_id: '', module: '', description: '',
  start_date: '', due_date: '', estimated_hours: null, priority: 'medium', status: 'open', progress: 0,
  assigned_to: '', watchers: [], notify_on_status_change: true,
  checklist: [], dependencies: [], attachments: []
})

// Update progress automatically if checklist exists
watch(() => form.checklist, (newVal) => {
  if (newVal && newVal.length > 0) {
    const completed = newVal.filter(i => i.is_completed).length
    form.progress = Math.round((completed / newVal.length) * 100)
  }
}, { deep: true })

const v = reactive({ title: false, due_date: false })

const typeOptions = [
  { label: 'Improvement', value: 'improvement' },
  { label: 'Internal Finance', value: 'finance_task' },
]

const moduleOptions = [
  { label: 'Frontend', value: 'Frontend' },
  { label: 'Backend', value: 'Backend' },
  { label: 'Design UI/UX', value: 'Design' },
  { label: 'Quality Assurance', value: 'QA' },
  { label: 'Infrastructure', value: 'Infrastructure' },
]

const statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Extended', value: 'extended' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Blocked', value: 'blocked' }
]

const projectOptions = computed(() => projects.value.filter(p => p.current_user_membership_status === 'owner' || p.current_user_membership_status === 'admin' || p.current_user_membership_status === 'accepted').map(p => ({ label: p.project_name || p.name, value: p.id })))
const userOptions = computed(() => users.value.filter(u => isAdmin.value || !u.is_superuser).map(u => ({ label: u.full_name, value: u.id })))
const watcherOptions = computed(() => userOptions.value.filter(u => !form.watchers.includes(u.value)))

// Watch for modal open — populate form from task prop
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.task) {
    currentStep.value = 0
    await fetchMeta()
    
    // Fetch full task details
    try {
        const { data: t } = await axios.get(`${API}/tasks/${props.task.id}`, { headers: getHeaders() })
        originalTask.value = JSON.parse(JSON.stringify(t))
        Object.assign(form, {
            title: t.title || '',
            task_type: t.task_type || 'general',
            project_id: t.project_id || '',
            module: t.module || '',
            description: t.description || '',
            start_date: t.start_date || '',
            due_date: t.due_date || '',
            estimated_hours: t.estimated_hours || null,
            priority: (t.priority?.value || t.priority || 'medium').toLowerCase(),
            status: (t.status?.value || t.status || 'open'),
            progress: t.progress || 0,
            assigned_to: t.assigned_to || '',
            watchers: t.watchers || [],
            notify_on_status_change: t.notify_on_status_change !== false,
            checklist: t.checklist?.length ? JSON.parse(JSON.stringify(t.checklist)) : [],
            dependencies: t.dependencies?.length ? JSON.parse(JSON.stringify(t.dependencies)) : [],
            attachments: t.attachments?.length ? JSON.parse(JSON.stringify(t.attachments)) : []
        })
    } catch (e) {
        toastError('Failed to fetch task details')
    }
  } else {
    originalTask.value = null
  }
})

// Date Validation Watchers
watch(() => form.start_date, (newVal) => {
  if (newVal && minStartDate.value && newVal < minStartDate.value) {
    // Only error if it's different from the original task's start date
    if (newVal !== originalTask.value?.start_date) {
      toastError("Start date cannot be in the past")
      form.start_date = originalTask.value?.start_date || todayStr.value
    }
  }
})

watch(() => form.due_date, (newVal, oldVal) => {
  if (!newVal) return

  // Skip validation if it's the same as the original due date
  // This prevents the toast from appearing when the modal first opens
  if (newVal === originalTask.value?.due_date) return

  // User restriction
  if (!isAdmin.value && newVal < todayStr.value) {
    toastError("Due date cannot be in the past")
    form.due_date = originalTask.value?.due_date || todayStr.value
    return
  }
})

const fetchMeta = async () => {
    try {
        const [projRes, userRes] = await Promise.all([
            axios.get(`${API}/projects?limit=200`, { headers: getHeaders() }),
            axios.get(`${API}/tasks/users/list`, { headers: getHeaders() })
        ])
        projects.value = projRes.data.items || []
        users.value = userRes.data || []
    } catch (e) { console.error(e) }
}

const getUserName = (id) => users.value.find(u => u.id === id)?.full_name || id
const getTaskCode = (id) => {
    const dep = form.dependencies.find(d => d.depends_on_task_id === id)
    return dep?.depends_on_code || 'TSK-XXX'
}
const getTaskTitle = (id) => {
    const dep = form.dependencies.find(d => d.depends_on_task_id === id)
    return dep?.depends_on_title || ''
}

// Navigation
const close = () => emit('update:modelValue', false)
const goToStep = (idx) => { if (idx <= currentStep.value) { slideDirection.value = idx < currentStep.value ? 'slide-right' : 'slide-left'; currentStep.value = idx } }
const prevStep = () => { if (currentStep.value > 0) { slideDirection.value = 'slide-right'; currentStep.value-- } }
const nextStep = () => {
  if (currentStep.value === 0) {
    v.title = !form.title?.trim()
    if (v.title) return
  }
  if (currentStep.value === 1) {
    v.due_date = !form.due_date
    if (v.due_date || startDateAfterDueDate.value || isInvalidAdminDueDate.value) return
  }
  slideDirection.value = 'slide-left'
  currentStep.value++
}

// Logic
const onlyNumeric = (e) => { if (!/[0-9.]/.test(e.key)) e.preventDefault() }
const addWatcher = (id) => { if (id && !form.watchers.includes(id)) form.watchers.push(id) }
const removeWatcher = (id) => { form.watchers = form.watchers.filter(w => w !== id) }

const addCheckItem = () => form.checklist.push({ item_text: '', is_completed: false })
const removeCheckItem = (i) => form.checklist.splice(i, 1)

const onDepSearch = async () => {
    if (depSearch.value.length < 2) { depResults.value = []; return }
    try {
        const { data } = await axios.get(`${API}/tasks/search?q=${depSearch.value}`, { headers: getHeaders() })
        depResults.value = data.filter(t => t.id !== props.task.id)
    } catch (e) { console.error(e) }
}
const addDependency = (task) => {
    if (!form.dependencies.find(d => d.depends_on_task_id === task.id)) {
        form.dependencies.push({
            depends_on_task_id: task.id,
            depends_on_code: task.task_code,
            depends_on_title: task.title
        })
    }
    depSearch.value = ''
    depResults.value = []
}
const removeDependency = (i) => form.dependencies.splice(i, 1)

const onFileDrop = (e) => { dragActive.value = false; Array.from(e.dataTransfer.files).forEach(addFileToList) }
const onFileSelect = (e) => { Array.from(e.target.files).forEach(addFileToList); e.target.value = '' }
const addFileToList = (file) => {
    form.attachments.push({ file_name: file.name, size: file.size, file_url: URL.createObjectURL(file), doc_type: 'other' })
}
const removeFile = (i) => form.attachments.splice(i, 1)

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const handleSubmit = async () => {
  if (startDateAfterDueDate.value) {
    toastError('Start date cannot be greater than due date')
    return
  }
  isSubmitting.value = true
  try {
    const payload = {
      ...form,
      priority: form.priority.toLowerCase()
    }
    await axios.put(`${API}/tasks/${props.task.id}`, payload, { headers: getHeaders() })
    toastSuccess('Task updated successfully')
    emit('updated')
    close()
  } catch (e) {
    toastError(e.response?.data?.detail || 'Failed to update task')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2000; display: flex; align-items: center; justify-content: center;
}
.modal-content.glass-panel {
  width: 680px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column;
  background: linear-gradient(135deg, rgba(30,30,34,0.4) 0%, rgba(22,22,26,0.6) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1); overflow: hidden;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 28px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header h2 { font-size: 18px; font-weight: 700; color: #f5f5f7; margin: 0; }
.task-code { font-size: 11px; color: #f59e0b; font-family: 'SF Mono', monospace; margin-top: 4px; }
.close-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center;
  justify-content: center; color: #8e8e93; cursor: pointer; transition: all 0.3s;
}
.close-btn:hover { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #f59e0b; transform: rotate(90deg); }

.progress-container { padding: 16px 28px 12px; }
.step-indicators { display: flex; gap: 4px; justify-content: space-between; margin-bottom: 10px; }
.step-dot {
  display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;
  color: rgba(255,255,255,0.3); transition: all 0.2s; flex: 1;
}
.step-dot.active { color: #f59e0b; }
.step-dot.completed { color: #10b981; }
.step-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.progress-track { height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 2px; transition: width 0.4s ease; }

.modal-body { flex: 1; overflow-y: auto; padding: 20px 28px; }
.step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #f5f5f7; font-size: 15px; font-weight: 600; }
.step-content { min-height: 250px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 16px; }
.form-group {
  display: flex; flex-direction: column; gap: 8px;
  position: relative;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.form-group.full { grid-column: 1 / -1; }
.form-group label {
  font-size: 10.5px; font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase; letter-spacing: 0.10em;
  display: inline-flex; align-items: center; gap: 8px;
  margin-left: 2px;
  transition: color 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
/* Refined leading dot before each label — orange in active, fades with field */
.form-group label::before {
  content: '';
  width: 4px; height: 4px; border-radius: 50%;
  background: rgba(245, 158, 11, 0.5);
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.35);
  transition: background 0.25s, box-shadow 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.form-group:focus-within label {
  color: #f59e0b;
}
.form-group:focus-within label::before {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.65);
  transform: scale(1.4);
}
.req { color: #ef4444; }

.text-input {
  background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 11px;
  padding: 11px 14px;
  color: #f5f5f7;
  font-size: 14px;
  outline: none;
  width: 100%;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.text-input:hover {
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.035) 100%);
  border-color: rgba(255,255,255,0.14);
}
.text-input:focus {
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(245,158,11,0.04) 100%);
  border-color: rgba(245,158,11,0.55);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14), 0 4px 14px -4px rgba(245, 158, 11, 0.20);
}
.text-input.has-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}
.text-input.sm { padding: 6px 12px; font-size: 13px; }
.text-input.search { padding-left: 36px; }

.input-with-prefix {
  display: flex; align-items: center;
  background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 11px;
  overflow: hidden;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}
.input-with-prefix:focus-within {
  border-color: rgba(245,158,11,0.55);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14);
}
.prefix {
  padding: 0 14px;
  color: rgba(255,255,255,0.5);
  font-weight: 600;
  border-right: 1px solid rgba(255,255,255,0.08);
  align-self: stretch;
  display: flex; align-items: center;
}
.input-with-prefix .text-input { border: none; background: transparent; box-shadow: none; }
.input-with-prefix .text-input:focus { background: transparent; box-shadow: none; }

.field-error { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ef4444; margin-top: 2px; }

.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 6px 14px; border-radius: 20px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all 0.2s; text-transform: capitalize;
}
.chip.active { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
.chip.active.low { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.chip.active.high { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }
.chip.active.critical { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); color: #a855f7; }

.range-input {
  width: 100%; -webkit-appearance: none; appearance: none;
  background: rgba(255, 255, 255, 0.08); height: 6px; border-radius: 6px;
  outline: none; transition: all 0.2s;
}
.range-input::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px; border-radius: 50%;
  background: #f59e0b; cursor: pointer;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  border: 4px solid #1c1c21;
}
.range-input::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: #f59e0b; cursor: pointer;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  border: 4px solid #1c1c21;
}
.range-input:hover { background: rgba(255, 255, 255, 0.12); }
.range-input:disabled { opacity: 0.6; cursor: not-allowed; }
.progress-hint { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 6px; font-style: italic; }

.switch-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); }
.switch-track { width: 40px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.1); position: relative; transition: background 0.3s; }
.switch-track.on { background: #f59e0b; }
.switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.3s; }
.switch-track.on .switch-thumb { transform: translateX(18px); }

.multiselect-box { display: flex; flex-direction: column; gap: 8px; }
.selected-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px; color: #fff;
}
.tag button { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; }
.tag button:hover { color: #ef4444; }

.section-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0 16px; }
.section-divider span { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
.section-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

.dep-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 8px;
  transition: all 0.2s;
}
.dep-item:hover { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.02); }
.dep-code { font-size: 11px; font-weight: 700; color: #f59e0b; background: rgba(245,158,11,0.12); padding: 3px 8px; border-radius: 6px; }
.dep-title { font-size: 13px; color: #f5f5f7; flex: 1; font-weight: 500; }
.dismiss-btn {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.4);
  width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.dismiss-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

.checklist-builder { display: flex; flex-direction: column; gap: 12px; }
.cl-row { display: flex; align-items: center; gap: 12px; animation: slideIn 0.3s ease-out; }
.cl-checkbox {
  width: 20px; height: 20px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
  background: rgba(255,255,255,0.03); color: transparent;
}
.cl-checkbox.active { background: #f59e0b; border-color: #f59e0b; color: #000; }
.cl-input { flex: 1; height: 38px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0 12px; font-size: 13px; color: #fff; outline: none; transition: all 0.2s; }
.cl-input:focus { border-color: rgba(245,158,11,0.4); background: rgba(255,255,255,0.04); }
.cl-input.is-done { color: rgba(255,255,255,0.3); text-decoration: line-through; }
.icon-btn-danger { background: none; border: none; color: rgba(239,68,68,0.4); cursor: pointer; transition: color 0.2s; }
.icon-btn-danger:hover { color: #ef4444; }
.btn-add-item { width: 100%; border-style: dashed !important; justify-content: center !important; font-size: 12px !important; margin-top: 8px; height: 38px !important; }

@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.search-wrap { position: relative; }
.search-icon { position: absolute; left: 14px; top: 50%; translate: 0 -50%; color: rgba(255,255,255,0.3); }
.search-results {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 10; margin-top: 4px;
  background: #1c1c21; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  max-height: 200px; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.res-item { padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.res-item:hover { background: rgba(255,255,255,0.05); }
.res-code { font-size: 10px; font-weight: 700; color: #f59e0b; }
.res-title { font-size: 13px; color: rgba(255,255,255,0.8); }

.drop-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 32px;
  border: 2px dashed rgba(255,255,255,0.08); border-radius: 14px; background: rgba(255,255,255,0.02); transition: all 0.2s;
}
.drop-zone.active { border-color: #f59e0b; background: rgba(245,158,11,0.04); }
.drop-icon { color: rgba(255,255,255,0.25); }
.drop-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); }

.file-list { display: flex; flex-direction: column; gap: 8px; }
.file-row {
  display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
  transition: all 0.2s;
}
.file-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
.file-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #f5f5f7; font-weight: 500; }
.file-meta svg { color: #f59e0b; }

.review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.review-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
}
.review-card.stats-info { grid-column: span 2; }
.card-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.review-row { display: flex; flex-direction: column; gap: 4px; }
.review-row-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rev-label { font-size: 11px; color: rgba(255,255,255,0.4); }
.rev-val { font-size: 14px; color: #fff; font-weight: 500; }
.rev-val.badge { display: inline-block; padding: 2px 8px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 12px; }
.priority-pill { display: flex; align-items: center; gap: 6px; width: fit-content; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
.priority-pill.critical { background: rgba(239,68,68,0.1); color: #ef4444; }
.priority-pill.high { background: rgba(249,115,22,0.1); color: #f97316; }
.priority-pill.medium { background: rgba(59,130,246,0.1); color: #3b82f6; }
.priority-pill.low { background: rgba(113,113,122,0.1); color: #71717a; }
.user-chip { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px; width: fit-content; font-size: 13px; }
.progress-preview-bar { height: 24px; background: rgba(255,255,255,0.05); border-radius: 8px; position: relative; overflow: hidden; }
.p-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 8px; transition: width 0.4s ease; }
.p-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.stat-box { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.04); }
.s-val { font-size: 18px; font-weight: 700; color: #f59e0b; }
.s-lab { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; }

.modal-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.06);
}
.btn-text { background: none; border: none; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.footer-right { display: flex; gap: 10px; }
.btn-pill {
  padding: 10px 24px; border-radius: 12px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 8px;
}
.btn-pill.primary { background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; }
.btn-pill.primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.btn-pill.primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Modal entrance — backdrop blur-in + panel scale/blur reveal ── */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.4s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}
.modal-fade-enter-active .modal-content.glass-panel {
  animation: panelRise 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-fade-leave-active .modal-content.glass-panel {
  animation: panelRise 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse;
}
@keyframes panelRise {
  from { opacity: 0; transform: translateY(24px) scale(0.96); filter: blur(8px); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

/* Step header icon + title get a subtle entrance shimmer */
.step-header {
  animation: stepHeader 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-header svg {
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.35));
}
@keyframes stepHeader {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Form groups stagger in when entering a step */
.step-content .form-group {
  animation: fieldFade 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.step-content .form-group:nth-child(1) { animation-delay: 0.05s; }
.step-content .form-group:nth-child(2) { animation-delay: 0.10s; }
.step-content .form-group:nth-child(3) { animation-delay: 0.15s; }
.step-content .form-group:nth-child(4) { animation-delay: 0.20s; }
.step-content .form-group:nth-child(5) { animation-delay: 0.25s; }
.step-content .form-group:nth-child(6) { animation-delay: 0.30s; }
@keyframes fieldFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Input focus glow halo */
.text-input:focus {
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.55);
}

/* Active step dot — gentle pulse on the active icon */
.step-dot.active svg {
  animation: stepDotPulse 2.4s ease-in-out infinite;
}
@keyframes stepDotPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.12); }
}

/* Progress fill — moving shimmer overlay */
.progress-fill {
  position: relative;
  overflow: hidden;
}
.progress-fill::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: translateX(-100%);
  animation: progressShimmer 2s infinite;
}
@keyframes progressShimmer {
  to { transform: translateX(100%); }
}

/* Primary button — soft lift + shadow grow on hover */
.btn-pill.primary {
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.30);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, filter 0.2s;
}
.btn-pill.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(245, 158, 11, 0.42);
}

/* Close button — match drawer/preview behavior */
.close-btn { transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-left-enter-active, .slide-left-leave-active, .slide-right-enter-active, .slide-right-leave-active { transition: all 0.25s ease; }
.slide-left-enter-from { opacity: 0; transform: translateX(20px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-20px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-20px); }
.slide-right-leave-to { opacity: 0; transform: translateX(20px); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.mono { font-family: 'SF Mono', monospace; }
.no-arrows::-webkit-inner-spin-button, .no-arrows::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }

/* ═════════════════════════════════════════════════════════════════════════
   LIGHT THEME — warm cream frosted glass (matches CreateMilestoneModal).
   Preserves transparency; brand palette stays the same in both themes.
   ═════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .modal-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
[data-theme="light"] .modal-content.glass-panel {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.65) 0%, rgba(252, 240, 220, 0.78) 100%);
  border: 1px solid rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 40px 80px rgba(40, 25, 10, 0.26),
    0 12px 24px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
  color: var(--text-primary);
}

/* Header */
[data-theme="light"] .modal-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .modal-header h2 {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .task-code { color: #b45309; }
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.50);
  border-color: rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.35);
  color: #92400e;
}

/* Progress strip */
[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .step-dot { color: rgba(40, 25, 10, 0.35); }
[data-theme="light"] .step-dot.active { color: #b45309; }
[data-theme="light"] .step-dot.completed { color: #15803d; }
[data-theme="light"] .step-label { color: inherit; }

/* Step header */
[data-theme="light"] .step-header { color: var(--text-primary); }
[data-theme="light"] .step-header svg {
  filter: drop-shadow(0 0 6px rgba(217, 119, 6, 0.30));
  color: #b45309;
}

/* Form labels + inputs */
[data-theme="light"] .form-group label { color: #b45309; }
[data-theme="light"] .form-group label::before {
  background: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .form-group:focus-within label { color: #92400e; }
[data-theme="light"] .form-group:focus-within label::before {
  background: #d97706;
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.65);
}
[data-theme="light"] .req { color: #dc2626; }
[data-theme="light"] .text-input,
[data-theme="light"] .cl-input,
[data-theme="light"] .input-with-prefix {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.65) 0%, rgba(255, 250, 240, 0.40) 100%);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .text-input:hover {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.85) 0%, rgba(255, 250, 240, 0.55) 100%);
  border-color: rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .text-input::placeholder,
[data-theme="light"] .cl-input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .text-input:focus,
[data-theme="light"] .cl-input:focus {
  background: linear-gradient(135deg, rgba(255, 246, 226, 0.95) 0%, rgba(255, 240, 210, 0.85) 100%);
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14), 0 4px 14px -4px rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .input-with-prefix:focus-within {
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .text-input.has-error { border-color: #dc2626; }
[data-theme="light"] .field-error { color: #dc2626; }
[data-theme="light"] .prefix {
  background: transparent;
  color: #6b5840;
  border-right-color: rgba(40, 25, 10, 0.10);
}

/* Progress bar percent label — dark text on the gold fill in light theme */
[data-theme="light"] .p-text {
  color: #1a0f00;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.55);
}

/* Chips (priority chips) — keep brand palette */
[data-theme="light"] .chip {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .chip:hover { background: rgba(40, 25, 10, 0.08); color: var(--text-primary); }
[data-theme="light"] .chip.active { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.40); color: #b45309; }
[data-theme="light"] .chip.active.low { background: rgba(16, 185, 129, 0.10); border-color: rgba(16, 185, 129, 0.40); color: #047857; }
[data-theme="light"] .chip.active.high { background: rgba(239, 68, 68, 0.10); border-color: rgba(239, 68, 68, 0.40); color: #b91c1c; }
[data-theme="light"] .chip.active.critical { background: rgba(168, 85, 247, 0.10); border-color: rgba(168, 85, 247, 0.40); color: #6b21a8; }

/* Range slider track */
[data-theme="light"] .range-input { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .range-input:hover { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .range-input::-webkit-slider-thumb {
  border-color: rgba(255, 250, 240, 0.95);
}
[data-theme="light"] .range-input::-moz-range-thumb {
  border-color: rgba(255, 250, 240, 0.95);
}
[data-theme="light"] .progress-hint { color: #6b5840; }

/* Switch */
[data-theme="light"] .switch-label { color: var(--text-primary); }
[data-theme="light"] .switch-track { background: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .switch-track.on { background: #d97706; }

/* Tags + multiselect */
[data-theme="light"] .tag {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .tag button { color: #6b5840; }
[data-theme="light"] .tag button:hover { color: #dc2626; }

/* Section divider eyebrow */
[data-theme="light"] .section-divider span { color: #6b5840; }
[data-theme="light"] .section-divider::after { background: rgba(40, 25, 10, 0.10); }

/* Dependency row */
[data-theme="light"] .dep-item {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .dep-item:hover {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.35);
}
[data-theme="light"] .dep-code { color: #b45309; background: rgba(245, 158, 11, 0.16); }
[data-theme="light"] .dep-title { color: var(--text-primary); }
[data-theme="light"] .dismiss-btn { background: rgba(40, 25, 10, 0.06); color: #6b5840; }
[data-theme="light"] .dismiss-btn:hover { background: rgba(239, 68, 68, 0.14); color: #b91c1c; }

/* Checklist builder */
[data-theme="light"] .cl-checkbox {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .cl-checkbox.active { background: #d97706; border-color: #d97706; color: #fff; }
[data-theme="light"] .cl-input.is-done { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .icon-btn-danger { color: rgba(239, 68, 68, 0.55); }
[data-theme="light"] .icon-btn-danger:hover { color: #b91c1c; }

/* Search dropdown */
[data-theme="light"] .search-icon { color: #6b5840; }
[data-theme="light"] .search-results {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(40, 25, 10, 0.14);
  box-shadow: 0 10px 30px rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .res-item { border-bottom-color: rgba(40, 25, 10, 0.06); }
[data-theme="light"] .res-item:hover { background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .res-code { color: #b45309; }
[data-theme="light"] .res-title { color: var(--text-primary); }

/* Drop zone */
[data-theme="light"] .drop-zone {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .drop-zone.active {
  background: rgba(245, 158, 11, 0.08);
  border-color: #d97706;
}
[data-theme="light"] .drop-icon { color: rgba(40, 25, 10, 0.35); }
[data-theme="light"] .drop-title { color: #6b5840; }

/* Files list */
[data-theme="light"] .file-row {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .file-row:hover { background: rgba(255, 250, 240, 0.85); border-color: rgba(40, 25, 10, 0.18); }
[data-theme="light"] .file-meta { color: var(--text-primary); }
[data-theme="light"] .file-meta svg { color: #b45309; }

/* Review cards */
[data-theme="light"] .review-card {
  background: rgba(40, 25, 10, 0.04);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .card-title { color: #6b5840; }
[data-theme="light"] .rev-label { color: #6b5840; }
[data-theme="light"] .rev-val { color: var(--text-primary); }
[data-theme="light"] .rev-val.badge {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-primary);
}
[data-theme="light"] .priority-pill.critical { background: rgba(239, 68, 68, 0.10); color: #b91c1c; }
[data-theme="light"] .priority-pill.high { background: rgba(249, 115, 22, 0.10); color: #c2410c; }
[data-theme="light"] .priority-pill.medium { background: rgba(59, 130, 246, 0.10); color: #1d4ed8; }
[data-theme="light"] .priority-pill.low { background: rgba(113, 113, 122, 0.10); color: #44403c; }
[data-theme="light"] .user-chip {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
}
[data-theme="light"] .progress-preview-bar { background: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .stat-box {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .s-val { color: #b45309; }
[data-theme="light"] .s-lab { color: #6b5840; }

/* Footer */
[data-theme="light"] .modal-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .btn-text { color: #6b5840; }
[data-theme="light"] .btn-text:hover { color: #92400e; }
[data-theme="light"] .btn-pill.primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .btn-pill.primary:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgba(217, 119, 6, 0.42);
}
</style>
