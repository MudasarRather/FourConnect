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

const props = defineProps({
  modelValue: Boolean,
  task: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'updated'])
const { success: toastSuccess, error: toastError } = useToast()

const API = 'http://localhost:8000/api'
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

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em; }
.req { color: #ef4444; }

.text-input {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 14px; color: #f5f5f7; font-size: 14px;
  transition: border-color 0.2s; outline: none; width: 100%;
}
.text-input:focus { border-color: rgba(245,158,11,0.4); }
.text-input.has-error { border-color: #ef4444; }
.text-input.sm { padding: 6px 12px; font-size: 13px; }
.text-input.search { padding-left: 36px; }

.input-with-prefix { display: flex; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
.prefix { padding: 0 12px; color: rgba(255,255,255,0.4); border-right: 1px solid rgba(255,255,255,0.06); }
.input-with-prefix .text-input { border: none; background: transparent; }

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

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
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
</style>
