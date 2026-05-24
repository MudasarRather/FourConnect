<template>
  <div class="settings-page">
    <div class="settings-header stagger-1">
      <h1 class="page-title">New Task</h1>
      <p class="page-subtitle">Create and assign a new task within the workspace</p>
    </div>

    <div class="settings-layout stagger-2">
      <!-- Sidebar Navigation (Stepper) -->
      <aside class="settings-sidebar">
        <nav class="sidebar-nav">
          <button v-for="(step, idx) in steps" :key="idx" 
                  @click="goToStep(idx)"
                  :class="['nav-tab', { active: currentStep === idx }, { completed: idx < currentStep }, { locked: idx > maxVisited }]">
            <component :is="step.icon" :size="16" class="tab-icon" />
            <span class="tab-label">{{ step.label }}</span>
            <Check v-if="idx < currentStep" :size="14" class="check-icon" />
          </button>
        </nav>
      </aside>

      <!-- Main Content Area (Form Card) -->
      <main class="settings-content">
        <transition name="step-transition" mode="out-in">

          <!-- ① Basic Info -->
          <section v-if="currentStep === 0" key="step-0" class="settings-card">
            <h3 class="card-title">{{ steps[0].label }}</h3>
            <p class="card-desc">{{ steps[0].desc }}</p>
            
            <div class="form-grid">
              <div class="input-wrapper span-full">
                <label class="floating-label">Task Title <span class="required">*</span></label>
                <input v-model="form.title" type="text" placeholder="e.g. Implement payment gateway" class="minimal-input" :class="{ 'has-error': v.title }" />
                <span v-if="v.title" class="error-text">Title is required</span>
              </div>
              
              <div class="input-wrapper">
                <label class="floating-label">Task Type</label>
                <CustomSelect
                  v-model="form.task_type"
                  :options="typeOptions"
                  placeholder="Select Type"
                  labelKey="label"
                  valueKey="value"
                />
              </div>

              <div class="input-wrapper">
                <label class="floating-label">Project</label>
                <CustomSelect
                  v-model="form.project_id"
                  :options="projectOptions"
                  placeholder="Standalone Task"
                  labelKey="label"
                  valueKey="value"
                />
              </div>

              <div class="input-wrapper span-full">
                <label class="floating-label">Module Area</label>
                <CustomSelect
                  v-model="form.module"
                  :options="moduleOptions"
                  placeholder="Select Module"
                  labelKey="label"
                  valueKey="value"
                />
              </div>

              <div class="input-wrapper span-full">
                <label class="floating-label">Description</label>
                <textarea v-model="form.description" rows="4" placeholder="Add detailed context, instructions, or acceptance criteria..." class="minimal-textarea"></textarea>
              </div>
            </div>

            <footer class="card-footer">
               <button @click="$router.back()" class="btn-cancel">Cancel</button>
               <button @click="nextStep" class="btn-primary">Next Step <ArrowRight :size="14" /></button>
            </footer>
          </section>

          <!-- ② Scheduling & Priority -->
          <section v-else-if="currentStep === 1" key="step-1" class="settings-card">
            <h3 class="card-title">{{ steps[1].label }}</h3>
            <p class="card-desc">{{ steps[1].desc }}</p>

            <div class="form-grid">
              <div class="input-wrapper">
                <label class="floating-label">Start Date <span class="required">*</span></label>
                <CompactDatePicker v-model="form.start_date" placeholder="Select Start Date" :minDate="todayStr" :error="v.start_date" />
                <span v-if="v.start_date" class="error-text">Start date is required</span>
              </div>
              <div class="input-wrapper">
                <label class="floating-label" :class="{ 'has-error': v.due_date }">Due Date <span class="required">*</span></label>
                <CompactDatePicker v-model="form.due_date" placeholder="Select Due Date" :minDate="todayStr" :error="v.due_date" />
                <span v-if="v.due_date" class="error-text">Please select a valid due date that occurs on or after the start date.</span>
              </div>
              
              <div class="input-wrapper">
                <label class="floating-label" :class="{ 'has-error': v.estimated_hours }">Estimated Hours <span class="required">*</span></label>
                <input v-model.number="form.estimated_hours" type="number" step="0.5" min="0" placeholder="0.0" onkeypress="return (event.charCode >= 48 && event.charCode <= 57) || event.charCode === 46" class="minimal-input no-arrows" :class="{'has-error': v.estimated_hours || v.capacity_exceeded}" />
                <span v-if="v.estimated_hours" class="error-text">Please enter a valid numeric value for estimated hours.</span>
                <span v-if="v.capacity_exceeded" class="error-text">Estimated hours cannot exceed the total hours in the selected date range.</span>
              </div>

              <div class="input-wrapper span-full mt-2">
                <label class="floating-label">Priority</label>
                <div class="chip-row">
                  <button v-for="p in ['low','medium','high','critical']" :key="p" 
                          class="chip" :class="{ active: form.priority === p, [p]: form.priority === p }" 
                          @click="form.priority = p">
                    {{ p }}
                  </button>
                </div>
              </div>
            </div>

            <footer class="card-footer">
               <button @click="prevStep" class="btn-back"><ArrowLeft :size="14" /> Back</button>
               <button @click="nextStep" class="btn-primary">Next Step <ArrowRight :size="14" /></button>
            </footer>
          </section>

          <!-- ③ Assignment & Roles -->
          <section v-else-if="currentStep === 2" key="step-2" class="settings-card">
            <h3 class="card-title">{{ steps[2].label }}</h3>
            <p class="card-desc">{{ steps[2].desc }}</p>

            <div class="form-grid">
              <div class="input-wrapper span-full">
                <label class="floating-label" :class="{ 'has-error': v.assigned_to }">Assignee <span class="required">*</span></label>
                <CustomSelect
                  v-model="form.assigned_to"
                  :options="userOptions"
                  placeholder="Select Assignee"
                  labelKey="label"
                  valueKey="value"
                  :error="v.assigned_to"
                  searchable
                />
                <span v-if="v.assigned_to" class="error-text">Please select an assignee.</span>
              </div>
              
              <div class="input-wrapper span-full">
                <label class="floating-label">Assigned By</label>
                <input :value="currentUserName" class="minimal-input" disabled style="opacity: 0.6; cursor: not-allowed; background: rgba(255,255,255,0.02);" />
              </div>

              <div class="input-wrapper span-full mt-2">
                <label class="floating-label">Watchers (Optional)</label>
                <div class="multi-select-container">
                  <div class="selected-chips">
                    <div v-for="w in form.watchers" :key="w" class="chip sm">
                      {{ getUserName(w) }}
                      <button @click.stop="removeWatcher(w)" class="chip-remove"><X :size="12" /></button>
                    </div>
                  </div>
                  <CustomSelect
                    :modelValue="''"
                    :options="availableWatchers"
                    placeholder="Add a watcher..."
                    labelKey="label"
                    valueKey="value"
                    @update:modelValue="addWatcher"
                    searchable
                  />
                </div>
              </div>
            </div>

            <footer class="card-footer">
               <button @click="prevStep" class="btn-back"><ArrowLeft :size="14" /> Back</button>
               <button @click="nextStep" class="btn-primary">Next Step <ArrowRight :size="14" /></button>
            </footer>
          </section>

          <!-- ④ Checklist & Links -->
          <section v-else-if="currentStep === 3" key="step-3" class="settings-card">
            <h3 class="card-title">{{ steps[3].label }}</h3>
            <p class="card-desc">{{ steps[3].desc }}</p>

            <div class="checklist-section">
              <label class="floating-label mb-2" style="display:block; margin-bottom:8px;">Sub-Tasks / Checklist <span class="required">*</span></label>
              <div class="checklist-builder">
                <TransitionGroup name="list-anim">
                  <div v-for="(item, i) in form.checklist" :key="`cl-${i}`" class="cl-row">
                    <div class="cl-checkbox" :class="{ active: item.is_completed }" @click="item.is_completed = !item.is_completed">
                      <Check v-if="item.is_completed" :size="12" stroke-width="3" />
                    </div>
                    <input v-model="item.item_text" class="minimal-input cl-input" :class="{'is-done': item.is_completed}" placeholder="Action item..." @keydown.enter="addChecklistItem" />
                    <button class="icon-btn-danger" @click="form.checklist.splice(i, 1)"><X :size="14" /></button>
                  </div>
                </TransitionGroup>
                <button class="btn-ghost sm btn-add-item" @click="addChecklistItem"><Plus :size="14" /> Add Item</button>
                <span v-if="v.checklist" class="error-text mt-2 block" style="display:block; margin-top:8px;">Sub-tasks / Checklist are mandatory. Please add at least one item.</span>
              </div>

              <div class="mt-8">
                <label class="floating-label mb-2" style="display:block; margin-bottom:8px; margin-top:24px;">Task Dependencies</label>
                <div class="dependency-builder">
                  <div class="dep-search-box input-wrapper" style="position: relative;">
                    <Search :size="14" class="input-icon" style="position: absolute; top: 13px; left: 12px; color: rgba(255,255,255,0.4);" />
                    <input v-model="depSearch" class="minimal-input" placeholder="Search task by title to add dependency..." @input="searchDependencies" style="padding-left: 36px;" />
                    
                    <div v-if="depResults.length > 0" class="dep-results-dropdown" style="z-index: 100;">
                      <div v-for="t in depResults" :key="t.id" class="dep-result-item" @click="addDependency(t)">
                        <span class="dep-code">{{ t.task_code }}</span>
                        <span class="dep-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">{{ t.title }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="form.dependencies.length > 0" class="selected-deps mt-3" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <div v-for="(dep, i) in form.dependencies" :key="i" class="chip outline" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; justify-content: space-between;">
                      <span style="overflow: hidden; text-overflow: ellipsis;"><GitBranch :size="14" style="margin-right: 4px; vertical-align: text-bottom;" /> {{ dep.task_code }} — {{ dep.title }}</span>
                      <button @click="form.dependencies.splice(i, 1)" class="chip-remove" style="margin-left: 8px;"><X :size="12" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer class="card-footer">
               <button @click="prevStep" class="btn-back"><ArrowLeft :size="14" /> Back</button>
               <button @click="nextStep" class="btn-primary">Next Step <ArrowRight :size="14" /></button>
            </footer>
          </section>

          <!-- ⑤ Attachments -->
          <section v-else-if="currentStep === 4" key="step-4" class="settings-card">
            <h3 class="card-title">{{ steps[4].label }}</h3>
            <p class="card-desc">{{ steps[4].desc }}</p>

            <div
              class="drop-zone"
              :class="{ active: dragActive }"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onFileDrop"
              @click="$refs.fileInput.click()"
              style="cursor: pointer;"
            >
              <UploadCloud :size="28" class="drop-icon" />
              <p class="drop-title">Drag & drop files here</p>
              <span class="drop-or">or</span>
              <label class="browse-btn" @click.stop>
                Browse Files
                <input type="file" multiple hidden ref="fileInput" @change="onFileSelect" />
              </label>
              <p class="drop-hint">PDF, Images, Excel, Logs — max 10 MB each</p>
            </div>
            
            <div v-if="form.attachments.length" class="file-list mt-4">
              <div v-for="(f, i) in form.attachments" :key="i" class="file-row">
                <div class="file-meta">
                  <FileText :size="15" />
                  <span>{{ f.file_name }}</span>
                </div>
                <button class="icon-btn-danger" @click="removeFile(i)"><X :size="14" /></button>
              </div>
            </div>

            <footer class="card-footer">
               <button @click="prevStep" class="btn-back"><ArrowLeft :size="14" /> Back</button>
               <button @click="nextStep" class="btn-primary">Next Step <ArrowRight :size="14" /></button>
            </footer>
          </section>

          <!-- ⑥ Notifications & Submit -->
          <section v-else-if="currentStep === 5" key="step-5" class="settings-card">
            <h3 class="card-title">{{ steps[5].label }}</h3>
            <p class="card-desc">{{ steps[5].desc }}</p>

            <div class="review-grid">
              
              <!-- Left Column: Task Summary Bento Card -->
              <div class="review-section summary-preview">
                <div class="review-header">
                  <div class="review-icon-wrap"><ClipboardList :size="16" /></div>
                  <h4>Task Summary</h4>
                </div>
                <div class="summary-grid">
                  <div class="summary-row"><span>Title</span><span class="value clamp" :title="form.title">{{ form.title || '—' }}</span></div>
                  <div class="summary-row"><span>Type</span><span class="value capitalize">{{ form.task_type || '—' }}</span></div>
                  <div class="summary-row"><span>Assignee</span><span class="value">{{ getUserName(form.assigned_to) || '—' }}</span></div>
                  <div class="summary-row"><span>Priority</span><span class="priority-chip" :class="form.priority"><Circle :size="8" fill="currentColor" /> {{ form.priority }}</span></div>
                  <div class="summary-row" v-if="form.due_date"><span>Due Date</span><span class="value">{{ form.due_date }}</span></div>
                  <div class="summary-row"><span>Checklists</span><span class="value">{{ form.checklist.filter(c => c.item_text.trim()).length }} items</span></div>
                  <div class="summary-row"><span>Dependencies</span><span class="value">{{ form.dependencies.length }}</span></div>
                </div>
              </div>

              <!-- Right Column: Notifications list -->
              <div class="review-section notifications-preview">
                <div class="review-header mb-6">
                  <div class="review-icon-wrap"><Bell :size="16" /></div>
                  <h4>Notifications</h4>
                </div>
                <div class="toggle-list">
                   <div class="toggle-item">
                      <div class="toggle-info">
                        <User :size="18" class="toggle-icon" />
                        <div>
                          <h5>Notify Assignee</h5>
                          <p>Send an automated alert.</p>
                        </div>
                      </div>
                      <label class="switch">
                        <input type="checkbox" v-model="form.notify_assignee" />
                        <span class="slider"></span>
                      </label>
                   </div>
                   
                   <div class="toggle-item">
                      <div class="toggle-info">
                        <Users :size="18" class="toggle-icon" />
                        <div>
                          <h5>Notify Watchers</h5>
                          <p>Alert everyone following this task.</p>
                        </div>
                      </div>
                      <label class="switch">
                        <input type="checkbox" v-model="form.notify_watchers" />
                        <span class="slider"></span>
                      </label>
                   </div>
                   
                   <div class="toggle-item">
                      <div class="toggle-info">
                        <Bell :size="18" class="toggle-icon" />
                        <div>
                          <h5>Status Changes</h5>
                          <p>Updates on progress and blocks.</p>
                        </div>
                      </div>
                      <label class="switch">
                        <input type="checkbox" v-model="form.notify_on_status_change" />
                        <span class="slider"></span>
                      </label>
                   </div>
                </div>
              </div>

            </div>

            <footer class="card-footer">
               <button @click="prevStep" class="btn-back"><ArrowLeft :size="14" /> Back</button>
               <button @click="handleSubmit" :disabled="submitting" class="btn-primary shadow">
                 <Send :size="14" /> Create Task
               </button>
            </footer>
          </section>

        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import axios from 'axios'
import CustomSelect from '../components/ui/CustomSelect.vue'
import CompactDatePicker from '../components/ui/CompactDatePicker.vue'
import { API } from '@/utils/api'
import {
  ArrowLeft, ArrowRight, Check, X, Circle,
  AlertTriangle, Send, FileText, UploadCloud, Plus,
  ClipboardList, CalendarClock, Users, ListChecks, Paperclip, Bell, Search, GitBranch, User
} from 'lucide-vue-next'

const router = useRouter()
const { success: toastSuccess, error: toastError } = useToast()
const isAdmin = computed(() => window.location.pathname.startsWith('/admin'))
const getHeaders = () => {
  const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  return { Authorization: `Bearer ${token}` }
}

// ── State ──
const currentStep = ref(0)
const maxVisited = ref(0)
const submitting = ref(false)
const dragActive = ref(false)

const users = ref([])
const projects = ref([])

const currentUserName = ref('You')
try {
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]))
    currentUserName.value = payload.full_name || 'You'
  }
} catch (e) {}

const steps = [
  { label: 'Basic Info', desc: 'Title, type & description', icon: ClipboardList },
  { label: 'Scheduling', desc: 'Dates & Priority', icon: CalendarClock },
  { label: 'Assignment', desc: 'Assignees & Roles', icon: Users },
  { label: 'Checklist', desc: 'Sub-tasks & Tracking', icon: ListChecks },
  { label: 'Attachments', desc: 'Upload documents', icon: Paperclip },
  { label: 'Review', desc: 'Notifications & Submit', icon: Bell },
]

const form = reactive({
  title: '', description: '', task_type: 'general', project_id: '', module: '',
  assigned_to: '', priority: 'medium', start_date: '', due_date: '', estimated_hours: null,
  watchers: [], notify_assignee: true, notify_watchers: true, notify_on_status_change: true,
  checklist: [{ item_text: '', is_completed: false }],
  dependencies: [],
  attachments: []
})

const v = reactive({ title: false, start_date: false, due_date: false, estimated_hours: false, capacity_exceeded: false, assigned_to: false, checklist: false })

// Use local timezone instead of UTC so the calendar matches the user's literal visual date
const d = new Date()
const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]

/* Dropdown Options */
const typeOptions = [
  { label: 'General Task', value: 'general' },
  { label: 'Bug / Issue', value: 'bug' },
  { label: 'Feature Request', value: 'feature' },
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

const projectOptions = computed(() => {
  const list = projects.value
    .filter(p => p.current_user_membership_status === 'owner' || p.current_user_membership_status === 'admin' || p.current_user_membership_status === 'accepted')
    .map(p => ({ label: p.project_name || p.name, value: p.id }))
  return [{ label: 'Standalone Task', value: null }, ...list]
})
const userOptions = computed(() => users.value.filter(u => isAdmin.value || !u.is_superuser).map(u => ({ label: u.full_name, value: u.id })))
const availableWatchers = computed(() => users.value.filter(u => !form.watchers.includes(u.id) && (isAdmin.value || !u.is_superuser)).map(u => ({ label: u.full_name, value: u.id })))


/* Navigation */
const goToStep = (idx) => { if (idx <= maxVisited.value) currentStep.value = idx }
const prevStep = () => { if (currentStep.value > 0) currentStep.value-- }
const nextStep = () => {
  // Validations
  if (currentStep.value === 0) {
    v.title = !form.title.trim()
    if (v.title) return
  }
  if (currentStep.value === 1) {
    v.start_date = !form.start_date
    v.due_date = !form.due_date || (form.start_date && form.due_date && form.due_date < form.start_date)
    v.estimated_hours = !form.estimated_hours || form.estimated_hours <= 0
    
    // Capacity Validation: (due_date - start_date + 1) * 24
    if (!v.start_date && !v.due_date && form.estimated_hours > 0) {
      const s = new Date(form.start_date)
      const d = new Date(form.due_date)
      const diffTime = Math.abs(d - s)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      const totalHours = diffDays * 24
      v.capacity_exceeded = form.estimated_hours > totalHours
    } else {
      v.capacity_exceeded = false
    }

    if (v.start_date || v.due_date || v.estimated_hours || v.capacity_exceeded) return
  }
  if (currentStep.value === 2) {
    v.assigned_to = !form.assigned_to
    if (v.assigned_to) return
  }
  if (currentStep.value === 3) {
    const validChecklist = form.checklist.filter(c => c.item_text.trim())
    v.checklist = validChecklist.length === 0
    if (v.checklist) return
  }

  currentStep.value++
  if (currentStep.value > maxVisited.value) maxVisited.value = currentStep.value
}

/* Watchers & Checklists */
const getUserName = (id) => users.value.find(u => u.id === id)?.full_name || 'User'
const addWatcher = (val) => { if (val && !form.watchers.includes(val)) form.watchers.push(val) }
const removeWatcher = (val) => form.watchers = form.watchers.filter(w => w !== val)
const addChecklistItem = () => form.checklist.push({ item_text: '', is_completed: false })

/* Dependencies Search */
const depSearch = ref('')
const depResults = ref([])
let depTimeout = null

const searchDependencies = () => {
  clearTimeout(depTimeout)
  depTimeout = setTimeout(async () => {
    if (!depSearch.value.trim()) { depResults.value = []; return }
    try {
      let url = `${API}/tasks/search?q=${encodeURIComponent(depSearch.value)}`
      if (form.project_id) {
         url += `&project_id=${form.project_id}`
      }
      const { data } = await axios.get(url, { headers: getHeaders() })
      
      // Filter the results to only include tasks from the selected project OR standalone tasks
      if (form.project_id) {
         depResults.value = data.filter(t => !t.project_id || t.project_id === form.project_id)
      } else {
         depResults.value = data
      }
    } catch (e) { depResults.value = [] }
  }, 300)
}
const addDependency = (t) => {
  if (!form.dependencies.find(d => d.depends_on_task_id === t.id)) {
    form.dependencies.push({ depends_on_task_id: t.id, task_code: t.task_code, title: t.title })
  }
  depSearch.value = ''
  depResults.value = []
}

/* File Upload */
const onFileDrop = (e) => { dragActive.value = false; Array.from(e.dataTransfer.files).forEach(uploadFile) }
const onFileSelect = (e) => { Array.from(e.target.files).forEach(uploadFile); e.target.value = '' }

const validateMagicBytes = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = function(e) {
      if (!e.target.result) return resolve(false);
      const arr = new Uint8Array(e.target.result);
      let header = "";
      for (let i = 0; i < arr.length; i++) header += arr[i].toString(16);
      
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      
      if (type.includes('pdf') || name.endsWith('.pdf')) {
          resolve(header.startsWith("25504446"));
      } else if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          if (header.startsWith("89504e47")) resolve(true); // png
          else if (header.startsWith("ffd8")) resolve(true); // jpg
          else if (header.startsWith("47494638")) resolve(true); // gif
          else if (header.startsWith("52494646")) resolve(true); // webp
          else resolve(false);
      } else {
          resolve(true); 
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

const uploadFile = async (file) => {
  try {
    if (file.size > 5 * 1024 * 1024) {
       toastError(`File ${file.name} is larger than 5MB.`);
       return;
    }
    const isValid = await validateMagicBytes(file);
    if (!isValid) {
       toastError(`File ${file.name} appears corrupted or is not a valid PDF/Image format.`);
       return;
    }
    const fd = new FormData(); fd.append('file', file)
    const { data } = await axios.post(`${API}/uploads/task-attachment`, fd, { headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }})
    form.attachments.push({ file_name: file.name, file_url: data.file_path || data.url || file.name, doc_type: 'other' })
  } catch(e) { toastError(`Upload failed check network or payload limits.`); }
}
const removeFile = (i) => form.attachments.splice(i, 1)

/* Data Fetching */
onMounted(async () => {
  try {
    const h = getHeaders()
    const [uRes, pRes] = await Promise.all([
      axios.get(`${API}/tasks/users/list`, { headers: h }),
      axios.get(`${API}/projects/?limit=100`, { headers: h })
    ])
    users.value = uRes.data || []
    projects.value = pRes.data?.items || pRes.data || []
  } catch (e) {
    if (e.response?.status === 401) router.push('/authentication/user/login')
  }
})

/* Submit */
const handleSubmit = async () => {
  submitting.value = true
  try {
    const payload = {
      ...form, 
      project_id: form.project_id || null, 
      assigned_to: form.assigned_to || null,
      checklist: form.checklist.filter(c => c.item_text.trim()),
      dependencies: form.dependencies.map(d => ({ depends_on_task_id: d.depends_on_task_id })),
    }
    await axios.post(`${API}/tasks/`, payload, { headers: getHeaders() })
    toastSuccess('Task successfully created!')
    router.push(isAdmin.value ? '/admin/dashboard' : '/user/dashboard')
  } catch (e) {
    toastError(e.response?.data?.detail || 'Failed to create task')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* SettingsPage Core Layout Extracted for Reusability */
.settings-page {
  padding: 40px 60px;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Initial Staggered Entrances */
.stagger-1 { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px); }
.stagger-2 { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; transform: translateY(20px); }

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}

.settings-header { margin-bottom: 40px; }
.page-title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #fff, rgba(255,255,255,0.6));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.page-subtitle { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; }

.settings-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 60px;
}

.settings-sidebar { position: sticky; top: 100px; height: fit-content; }
.sidebar-nav { display: flex; flex-direction: column; gap: 8px; position: relative; }

/* Stepper Progress Line Indicator */
.sidebar-nav::before {
  content: ''; position: absolute; left: 24px; top: 20px; bottom: 20px;
  width: 2px; background: rgba(255,255,255,0.05); border-radius: 2px;
  z-index: 0;
}

.nav-tab {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px; border-radius: 16px; background: transparent;
  border: 1px solid transparent; color: rgba(255,255,255,0.4); font-size: 14px;
  font-weight: 600; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left; position: relative; z-index: 1;
  overflow: hidden;
}
.nav-tab::before { /* Hover highlight effect */
  content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 100%);
  opacity: 0; transition: opacity 0.3s ease; z-index: -1;
}
.nav-tab:hover:not(.locked)::before { opacity: 1; }
.nav-tab:hover:not(.locked) { color: #fff; transform: translateX(4px); border-color: rgba(255,255,255,0.05); }
.nav-tab.locked { opacity: 0.3; cursor: not-allowed; }

.nav-tab.completed { color: #fff; }
.nav-tab.active { 
  background: rgba(245, 158, 11, 0.05); 
  color: #FBBF24; 
  border-color: rgba(245, 158, 11, 0.15);
  transform: scale(1.02);
}
.tab-icon { opacity: 0.6; transition: all 0.4s ease; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
.nav-tab:hover:not(.locked) .tab-icon { transform: scale(1.1) rotate(-5deg); opacity: 1; }
.nav-tab.active .tab-icon, .nav-tab.completed .tab-icon { opacity: 1; color: #fff; }
.nav-tab.active .tab-icon { color: #FBBF24; background: rgba(245, 158, 11, 0.15); }


.check-icon { position: absolute; right: 16px; color: #34d399; }
.nav-tab.active .check-icon { color: transparent; }

.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }

.settings-content { min-height: 600px; perspective: 1000px; }

.settings-card {
  background: rgba(20, 20, 22, 0.6);
  backdrop-filter: blur(60px) saturate(180%); -webkit-backdrop-filter: blur(60px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px; 
  padding: 48px; 
  width: 100%;
  box-shadow: 0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
  transform-style: preserve-3d;
}

.card-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
.card-desc { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 36px; line-height: 1.5; }

/* Form Components Minimal - Animated */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px 24px; width: 100%; }
.span-full { grid-column: span 2; }
.input-wrapper { position: relative; display: flex; flex-direction: column; gap: 10px; width: 100%; }
.input-wrapper > * { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.input-wrapper:nth-child(1) > * { animation-delay: 0.1s; }
.input-wrapper:nth-child(2) > * { animation-delay: 0.15s; }
.input-wrapper:nth-child(3) > * { animation-delay: 0.2s; }
.input-wrapper:nth-child(4) > * { animation-delay: 0.25s; }
.input-wrapper:nth-child(5) > * { animation-delay: 0.3s; }

@keyframes slideInUp {
  0% { opacity: 0; transform: translateY(15px); }
  100% { opacity: 1; transform: translateY(0); }
}

.floating-label {
  font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em; margin-left: 4px; transition: color 0.3s ease;
}
.floating-label .required { color: #ff453a; margin-left: 2px;}
.floating-label.has-error { color: #ef4444; }
.error-text { color: #ef4444; font-size: 12px; font-weight: 500; margin-left: 4px; margin-top: -4px; animation: slideInUp 0.3s ease backwards; }

.minimal-input {
  width: 100%; height: 48px; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  padding: 0 16px; font-size: 14px; color: #fff;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); outline: none; font-family: inherit;
}
.minimal-input:hover { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.15); }
.minimal-input:focus { 
  background: rgba(255,255,255,0.04); border-color: #F59E0B; 
  transform: translateY(-2px);
}
.minimal-input.has-error { border-color: #ef4444; }
.minimal-input.sm { height: 38px; padding: 0 14px; font-size: 13px; border-radius: 10px; }
.minimal-input.is-done { color: rgba(255,255,255,0.3); text-decoration: line-through; }

.minimal-textarea {
  width: 100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 16px; font-size: 14px;
  color: #fff; resize: none; outline: none; font-family: inherit; 
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.minimal-textarea:hover { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.15); }
.minimal-textarea:focus { 
  background: rgba(255,255,255,0.04); border-color: #F59E0B; 
  transform: translateY(-2px);
}

.no-arrows { appearance: textfield; -moz-appearance: textfield; }
.no-arrows::-webkit-outer-spin-button, .no-arrows::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* Step 6 Toggles */
.toggle-list { display: flex; flex-direction: column; gap: 16px; width: 100%; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.toggle-item:hover { background: rgba(255,255,255,0.04); transform: translateY(-3px); border-color: rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
.toggle-info { display: flex; align-items: center; gap: 16px; }
.toggle-icon { margin-top: 0; color: rgba(255,255,255,0.6); }
.toggle-item h5 { font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: #fff; letter-spacing: -0.01em; }
.toggle-item p { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }
.switch { position: relative; display: inline-block; width: 52px; height: 32px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .4s cubic-bezier(0.25, 1, 0.5, 1); border-radius: 32px; }
.slider:before { position: absolute; content: ""; height: 28px; width: 28px; left: 2px; bottom: 2px; background-color: white; transition: .4s cubic-bezier(0.25, 1, 0.5, 1); border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
input:checked + .slider { background-color: #F59E0B; }
input:checked + .slider:before { transform: translateX(20px); }

/* Footers & Actions */
.card-footer {
  margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; align-items: center;
}
.btn-primary { 
  display: flex; align-items: center; gap: 10px; padding: 12px 28px; 
  background: #F59E0B; color: #000; 
  font-size: 14px; font-weight: 700; border: none; border-radius: 14px; 
  cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}
.btn-primary:hover:not(:disabled) { transform: translateY(-3px) scale(1.02); filter: brightness(1.1); }
.btn-primary:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.btn-primary:disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; box-shadow: none; }
.btn-cancel, .btn-back, .btn-ghost { 
  display: flex; align-items: center; gap: 8px; padding: 12px 24px; 
  background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.8); 
  font-size: 14px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); 
  cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 14px;
  backdrop-filter: blur(10px);
}
.btn-cancel:hover, .btn-ghost:hover { color: #fff; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); transform: translateY(-2px); }
.btn-back { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
.btn-back:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateX(-4px); border-color: rgba(255,255,255,0.2); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
.btn-cancel { color: rgba(239,68,68,0.8); border-color: rgba(239,68,68,0.2); }
.btn-cancel:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); transform: translateY(-2px); }

/* Chips */
.chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
.chip { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); text-transform: capitalize; backdrop-filter: blur(10px); }
.chip:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.06); color: #fff; transform: translateY(-2px) scale(1.05); }
.chip:active { transform: translateY(0) scale(0.95); }
.chip.active { color: #000; background: #FBBF24; border-color: #FBBF24; }
.chip.active.low { background: #E4E4E7; border-color: #E4E4E7; color: #18181B; }
.chip.active.medium { background: #FBBF24; border-color: #FBBF24; color: #000; }
.chip.active.high { background: #FB923C; border-color: #FB923C; color: #000; }
.chip.active.critical { background: #EF4444; border-color: #EF4444; color: #fff; }
.chip.sm { padding: 6px 12px; font-size: 12px; }
.chip.outline { background: transparent; border-style: dashed; }
.chip-remove { background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; padding: 0 2px; }
.chip-remove:hover { opacity: 1; color: #ff453a; }
.selected-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }

/* Checklist */
.checklist-builder { display: flex; flex-direction: column; gap: 8px; }
.cl-row { display: flex; align-items: stretch; gap: 12px; padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); transition: all 0.2s; min-height: 44px; }
.cl-row:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.12); }
.cl-checkbox { width: 22px; height: 22px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; color: transparent; flex-shrink: 0; transition: all 0.2s; background: rgba(255,255,255,0.03); align-self: center; }
.cl-checkbox.active { background: #F59E0B; border-color: #FBBF24; color: #000; }
.cl-input { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 4px !important; height: auto !important; outline: none !important; flex: 1; font-size: 14px; line-height: 24px; color: #fff; display: flex; align-items: center; }
.icon-btn-danger { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 6px; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.icon-btn-danger:hover { color: #f87171; background: rgba(239,68,68,0.1); }
.btn-add-item { width: 100%; justify-content: center; padding: 12px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.4); margin-top: 4px; transition: all 0.2s; }
.btn-add-item:hover { background: rgba(255,255,255,0.04); color: #fff; border-color: rgba(255,255,255,0.2); }

/* Dropzones & Items */
.drop-zone { border: 2px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 40px 20px; text-align: center; transition: all 0.2s; background: rgba(255,255,255,0.02); }
.drop-zone.active { border-color: var(--accent-primary); background: rgba(0,122,255,0.05); }
.drop-icon { color: var(--text-tertiary); margin-bottom: 12px; }
.drop-title { font-size: 15px; font-weight: 500; margin: 0 0 8px 0; }
.drop-or { font-size: 12px; color: var(--text-tertiary); margin: 0 8px; }
.browse-btn { color: var(--accent-primary); font-weight: 500; cursor: pointer; font-size: 14px; }
.browse-btn:hover { text-decoration: underline; }
.drop-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 16px; }

.file-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px; }
.file-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; }
.file-meta svg { color: var(--text-secondary); }

/* Deps summary */
.dep-results-dropdown { position: absolute; z-index: 10; width: 100%; top: calc(100% + 4px); background: #2c2c2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
.dep-result-item { padding: 10px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); }
.dep-result-item:hover { background: rgba(255,255,255,0.05); }
.dep-code { font-family: monospace; font-size: 11px; color: #ff9f0a; font-weight: 600; }
.dep-title { font-size: 13px; color: #fff; }

/* Step 6 Review Grid & Details */
.review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;}
.review-section { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; }
.review-header { display: flex; align-items: center; gap: 14px; margin-bottom: 32px; }
.review-icon-wrap { background: rgba(245, 158, 11, 0.1); color: #F59E0B; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.review-header h4 { margin: 0; font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }

.summary-grid { display: flex; flex-direction: column; gap: 20px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding-bottom: 16px; border-bottom: 1px dashed rgba(255,255,255,0.08); }
.summary-row:last-child { border-bottom: none; padding-bottom: 0; }
.summary-row span:first-child { color: rgba(255,255,255,0.5); font-weight: 500; }
.summary-row .value { color: #fff; font-weight: 600; text-align: right; max-width: 65%; }
.summary-row .clamp { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.capitalize { text-transform: capitalize; }
.priority-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
.priority-chip.low { background: rgba(228, 228, 231, 0.1); color: #E4E4E7; }
.priority-chip.medium { background: rgba(245, 158, 11, 0.1); color: #FBBF24; }
.priority-chip.high { background: rgba(251, 146, 60, 0.1); color: #FB923C; }
.priority-chip.critical { background: rgba(239, 68, 68, 0.15); color: #EF4444; }

/* Transitions */
.step-transition-enter-active, .step-transition-leave-active { transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
.step-transition-enter-from { opacity: 0; transform: translateY(30px) scale(0.98); filter: blur(4px); }
.step-transition-leave-to { opacity: 0; transform: translateY(-30px) scale(0.98); filter: blur(4px); }
.list-anim-enter-active, .list-anim-leave-active { transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
.list-anim-enter-from, .list-anim-leave-to { opacity: 0; transform: translateY(-20px) scale(0.95); filter: blur(2px); }

/* Local accent token — global text tokens are owned by theme.css; do NOT override
   --text-primary etc. here or the light theme breaks on this page. */
.settings-page { --accent-primary: #0a84ff; }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .settings-page { color: var(--text-primary); }
[data-theme="light"] .page-title {
  background: none;
  -webkit-text-fill-color: unset;
  color: var(--text-primary);
}
[data-theme="light"] .floating-label { color: var(--text-secondary); }
[data-theme="light"] .floating-label .required { color: #dc2626; }
[data-theme="light"] .minimal-input,
[data-theme="light"] .minimal-textarea {
  background: rgba(26, 20, 16, 0.04);
  border-color: rgba(26, 20, 16, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .minimal-input::placeholder,
[data-theme="light"] .minimal-textarea::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .card-title { color: var(--text-primary); }
[data-theme="light"] .card-desc { color: var(--text-secondary); }
[data-theme="light"] .chip {
  background: rgba(26, 20, 16, 0.05);
  color: var(--text-secondary);
  border-color: rgba(26, 20, 16, 0.10);
}
[data-theme="light"] .chip.active.low {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.30);
}
[data-theme="light"] .chip.active.medium {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .chip.active.high {
  background: rgba(220, 38, 38, 0.10);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .error-text { color: #dc2626; }

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║ ULTRA-MODERN ENHANCEMENTS — apply to BOTH themes                      ║
   ║ Refined borders, animated glows, advanced micro-interactions          ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */

/* Settings card — entrance + subtle animated border */
.settings-card {
  position: relative;
  animation: cardRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
@keyframes cardRise {
  from { opacity: 0; transform: translateY(20px) scale(0.985); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
.settings-card::after {
  content: ''; position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.45), transparent);
  opacity: 0;
  animation: cardTopLine 0.9s 0.3s ease-out forwards;
  pointer-events: none;
}
@keyframes cardTopLine {
  to { opacity: 1; }
}

/* Sidebar nav — smoother indicator + connecting line glow on active */
.sidebar-nav::before { background: rgba(255, 255, 255, 0.06); }
.nav-tab {
  position: relative;
}
.nav-tab.active::before {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%);
  opacity: 1;
}
.nav-tab.active::after {
  content: '';
  position: absolute; left: -3px; top: 50%; transform: translateY(-50%);
  width: 3px; height: 24px; border-radius: 4px;
  background: linear-gradient(180deg, #FBBF24, #F59E0B);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.55);
  animation: navIndicator 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes navIndicator {
  from { height: 0; opacity: 0; }
  to   { height: 24px; opacity: 1; }
}
.nav-tab.active .tab-icon {
  animation: tabIconPulse 2.6s ease-in-out infinite;
}
@keyframes tabIconPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.18); }
  50%      { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
}

/* Inputs — gold focus halo (already there, but make consistent) */
.minimal-input:focus,
.minimal-textarea:focus {
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14), 0 4px 14px -4px rgba(245, 158, 11, 0.20);
}

/* Chip — gentle elastic press */
.chip { transition: background 0.25s, border-color 0.25s, color 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.chip.active { box-shadow: 0 6px 18px rgba(245, 158, 11, 0.30); }
.chip.active.low { box-shadow: 0 6px 18px rgba(228, 228, 231, 0.18); }
.chip.active.high { box-shadow: 0 6px 18px rgba(251, 146, 60, 0.30); }
.chip.active.critical { box-shadow: 0 6px 18px rgba(239, 68, 68, 0.30); }

/* Checklist row — refined hover with glow line on left */
.cl-row { position: relative; overflow: hidden; }
.cl-row::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #FBBF24, #F59E0B);
  transform: scaleY(0); transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.cl-row:hover::before, .cl-row:focus-within::before { transform: scaleY(1); }
.cl-checkbox { transition: background 0.25s, border-color 0.25s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.cl-checkbox.active { transform: scale(1.05); box-shadow: 0 0 10px rgba(245, 158, 11, 0.40); }
.cl-checkbox svg { animation: checkPopCT 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes checkPopCT {
  from { transform: scale(0) rotate(-90deg); }
  to   { transform: scale(1) rotate(0); }
}

/* Primary button — refined lift */
.btn-primary {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.30);
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #FBBF24, #F59E0B);
  box-shadow: 0 14px 32px rgba(245, 158, 11, 0.45);
}

/* Review section — animated entry with stagger via nth-child */
.review-section {
  animation: reviewSectionFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
.review-section:nth-child(1) { animation-delay: 0.10s; }
.review-section:nth-child(2) { animation-delay: 0.18s; }
.review-section:nth-child(3) { animation-delay: 0.26s; }
.review-section:nth-child(4) { animation-delay: 0.34s; }
@keyframes reviewSectionFade {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.review-icon-wrap {
  position: relative;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.10)) !important;
  border: 1px solid rgba(245, 158, 11, 0.32);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.review-icon-wrap::after {
  content: ''; position: absolute; inset: -2px; border-radius: 14px;
  border: 1px solid rgba(245, 158, 11, 0.30);
  opacity: 0; animation: iconRingCT 2.4s ease-in-out infinite;
}
@keyframes iconRingCT {
  0%, 100% { opacity: 0; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.08); }
}

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║ LIGHT THEME — full pass for every widget that was missed              ║
   ║ Preserves orange / yellow / golden brand palette in both themes       ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */

/* Settings card shell */
[data-theme="light"] .settings-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.78) 0%, rgba(252, 240, 220, 0.62) 100%);
  border: 1px solid rgba(217, 119, 6, 0.16);
  box-shadow:
    0 30px 60px rgba(40, 25, 10, 0.18),
    0 8px 24px rgba(40, 25, 10, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .settings-card::after {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.55), transparent);
}

/* Sidebar nav */
[data-theme="light"] .sidebar-nav::before { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .nav-tab {
  color: rgba(60, 45, 30, 0.55);
}
[data-theme="light"] .nav-tab:hover:not(.locked) {
  color: var(--text-primary);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .nav-tab.completed { color: var(--text-primary); }
[data-theme="light"] .nav-tab.active {
  background: rgba(217, 119, 6, 0.10);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .nav-tab.active::after {
  background: linear-gradient(180deg, #f59e0b, #d97706);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .tab-icon {
  background: rgba(40, 25, 10, 0.06);
  color: rgba(60, 45, 30, 0.7);
}
[data-theme="light"] .nav-tab.active .tab-icon,
[data-theme="light"] .nav-tab.completed .tab-icon { color: #b45309; }
[data-theme="light"] .nav-tab.active .tab-icon { background: rgba(217, 119, 6, 0.16); }
[data-theme="light"] .check-icon { color: #15803d; }

/* Card footer / footers / buttons */
[data-theme="light"] .card-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .btn-cancel,
[data-theme="light"] .btn-back,
[data-theme="light"] .btn-ghost {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
  border: 1px solid rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .btn-cancel:hover,
[data-theme="light"] .btn-ghost:hover {
  background: rgba(40, 25, 10, 0.10);
  color: var(--text-primary);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .btn-back {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
}
[data-theme="light"] .btn-back:hover {
  background: rgba(40, 25, 10, 0.10);
  color: var(--text-primary);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .btn-cancel {
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.28);
  background: rgba(220, 38, 38, 0.06);
}
[data-theme="light"] .btn-cancel:hover {
  background: rgba(220, 38, 38, 0.14);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.45);
}
[data-theme="light"] .btn-primary {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 14px 32px rgba(217, 119, 6, 0.45);
}

/* Chips — preserve dark-theme palette */
[data-theme="light"] .chip {
  background: rgba(40, 25, 10, 0.05);
  color: rgba(60, 45, 30, 0.70);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .chip:hover {
  background: rgba(40, 25, 10, 0.10);
  color: var(--text-primary);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .chip.active {
  background: #fbbf24;
  color: #1a0f00;
  border-color: #fbbf24;
}
[data-theme="light"] .chip.active.low { background: #e4e4e7; color: #18181b; border-color: #d4d4d8; }
[data-theme="light"] .chip.active.medium { background: #fbbf24; color: #1a0f00; border-color: #fbbf24; }
[data-theme="light"] .chip.active.high { background: #fb923c; color: #1a0f00; border-color: #fb923c; }
[data-theme="light"] .chip.active.critical { background: #ef4444; color: #fff; border-color: #ef4444; }
[data-theme="light"] .chip-remove:hover { color: #b91c1c; }

/* Checklist builder */
[data-theme="light"] .cl-row {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .cl-row:hover {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .cl-checkbox {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(40, 25, 10, 0.30);
}
[data-theme="light"] .cl-checkbox.active {
  background: #d97706;
  border-color: #f59e0b;
  color: #fff;
}
[data-theme="light"] .cl-input {
  color: var(--text-primary) !important;
}
[data-theme="light"] .cl-input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .icon-btn-danger {
  color: rgba(220, 38, 38, 0.6);
  background: rgba(220, 38, 38, 0.06);
}
[data-theme="light"] .icon-btn-danger:hover {
  color: #991b1b;
  background: rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .btn-add-item {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.18);
  color: rgba(60, 45, 30, 0.65);
}
[data-theme="light"] .btn-add-item:hover {
  background: rgba(217, 119, 6, 0.08);
  color: var(--text-primary);
  border-color: rgba(217, 119, 6, 0.45);
}

/* Drop zone + file row */
[data-theme="light"] .drop-zone {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .drop-zone.active {
  background: rgba(217, 119, 6, 0.08);
  border-color: #d97706;
}
[data-theme="light"] .drop-icon,
[data-theme="light"] .drop-or,
[data-theme="light"] .drop-hint { color: rgba(60, 45, 30, 0.50); }
[data-theme="light"] .drop-title { color: var(--text-primary); }
[data-theme="light"] .browse-btn { color: #d97706; }
[data-theme="light"] .file-row {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .file-meta { color: var(--text-primary); }
[data-theme="light"] .file-meta svg { color: #b45309; }

/* Dependency dropdown */
[data-theme="light"] .dep-results-dropdown {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(40, 25, 10, 0.14);
  box-shadow: 0 10px 30px rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .dep-result-item { border-bottom-color: rgba(40, 25, 10, 0.06); }
[data-theme="light"] .dep-result-item:hover { background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .dep-code { color: #b45309; }
[data-theme="light"] .dep-title { color: var(--text-primary); }

/* Toggles (Step 6) */
[data-theme="light"] .toggle-item {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .toggle-item:hover {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .toggle-item h5 { color: var(--text-primary); }
[data-theme="light"] .toggle-item p { color: var(--text-secondary); }
[data-theme="light"] .toggle-icon { color: rgba(60, 45, 30, 0.65); }
[data-theme="light"] .slider { background-color: rgba(40, 25, 10, 0.14); }
[data-theme="light"] input:checked + .slider { background-color: #d97706; }

/* Review grid + sections */
[data-theme="light"] .review-section {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .review-header h4 { color: var(--text-primary); }
[data-theme="light"] .review-icon-wrap {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(180, 83, 9, 0.10)) !important;
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .review-icon-wrap::after { border-color: rgba(217, 119, 6, 0.45); }
[data-theme="light"] .summary-row { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .summary-row span:first-child { color: var(--text-secondary); }
[data-theme="light"] .summary-row .value { color: var(--text-primary); }

/* Priority chip in review */
[data-theme="light"] .priority-chip.low { background: rgba(113, 113, 122, 0.12); color: #44403c; }
[data-theme="light"] .priority-chip.medium { background: rgba(217, 119, 6, 0.14); color: #92400e; }
[data-theme="light"] .priority-chip.high { background: rgba(234, 88, 12, 0.14); color: #c2410c; }
[data-theme="light"] .priority-chip.critical { background: rgba(220, 38, 38, 0.14); color: #991b1b; }

/* Section dividers / dashed separators */
[data-theme="light"] .section-divider span { color: rgba(60, 45, 30, 0.55); }
[data-theme="light"] .section-divider::after { background: rgba(40, 25, 10, 0.10); }
</style>
