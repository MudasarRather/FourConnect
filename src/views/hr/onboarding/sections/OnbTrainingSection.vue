<template>
  <section class="onb-tr">
    <Motion as="header" class="onb-section-banner tr-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Programs · assignments · completions</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Training</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Assignment</span>
        </h2>
        <p class="onb-banner-sub">Define training programs and assign them to new joiners. Track completions live as assignees mark them done.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ programs.length }}</span>
          <span class="onb-banner-stat-label">Programs</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ assignments.length }}</span>
          <span class="onb-banner-stat-label">Active</span>
        </div>
        <div class="tr-banner-actions">
          <button class="onb-btn-ghost" @click="reload"><RefreshCw :size="13" />Refresh</button>
          <button class="onb-btn-primary" @click="showNew = true"><Plus :size="13" />New program</button>
        </div>
      </div>
    </Motion>

    <div class="tr-grid">
      <!-- Programs -->
      <Motion as="section" class="tr-card programs-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <div>
            <h3 class="card-title">Programs</h3>
            <p class="card-sub">{{ programs.length }} active</p>
          </div>
        </header>
        <ul class="tr-list">
          <Motion v-for="(p, i) in programs" :key="p.id" as="li" class="prog-row"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.32, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="prog-type-pill" :data-type="p.training_type">{{ p.training_type.replace('_', ' ') }}</span>
            <div class="prog-main">
              <div class="prog-name">{{ p.name }}</div>
              <div class="prog-meta">
                <Clock :size="10" /> {{ p.duration_hours || 0 }}h
                <span v-if="p.is_mandatory_for_new_joiners" class="prog-must">MANDATORY</span>
                <span v-if="p.certification_required">· Cert</span>
              </div>
            </div>
            <button class="onb-btn-ghost mini" @click="assignTo(p)">Assign</button>
          </Motion>
          <li v-if="!programs.length" class="tr-empty">No programs defined.</li>
        </ul>
      </Motion>

      <!-- Assignments -->
      <Motion as="section" class="tr-card assigns-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <div>
            <h3 class="card-title">Assignments</h3>
            <p class="card-sub">{{ assignments.length }} active</p>
          </div>
        </header>
        <ul class="tr-list">
          <Motion v-for="(a, i) in assignments" :key="a.id" as="li" class="assign-row"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.32, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <div class="assign-main">
              <div class="assign-title">{{ a.program_name }}</div>
              <div class="assign-meta">
                <User :size="10" /> {{ a.employee_name }}
                <span v-if="a.due_date"><Calendar :size="10" /> due {{ formatDate(a.due_date) }}</span>
              </div>
            </div>
            <span class="assign-status" :data-status="a.status">{{ a.status }}</span>
            <button v-if="a.status !== 'COMPLETED'" class="onb-btn-ghost mini" @click="markComplete(a)">Mark done</button>
          </Motion>
          <li v-if="!assignments.length" class="tr-empty">No assignments yet.</li>
        </ul>
      </Motion>
    </div>

    <!-- New program modal -->
    <OnbModal :open="showNew" title="New training program" subtitle="Define a reusable course" :icon="GraduationCap" :width="620" @close="showNew = false">
      <div class="form-stack">
        <OnbField v-model="newProgram.name" label="Program name" placeholder="Security Orientation 2026" required full />
        <div class="form-grid-2">
          <OnbField v-model="newProgram.code" label="Code" placeholder="SEC-ORI-26" required />
          <OnbField v-model="newProgram.training_type" type="select" label="Type" required
            :options="TYPES.map(t => ({ value: t, label: t.replace('_', ' ') }))" />
          <OnbField v-model.number="newProgram.duration_hours" type="number" step="0.5" label="Duration (hours)" required />
          <OnbField v-model="newProgram.is_mandatory_for_new_joiners" type="select" label="Mandatory for joiners" required
            :options="[{value: false, label: 'No'}, {value: true, label: 'Yes'}]" />
          <OnbField v-model="newProgram.certification_required" type="select" label="Cert required" required
            :options="[{value: false, label: 'No'}, {value: true, label: 'Yes'}]" />
          <OnbField v-model="newProgram.materials_url" label="Materials URL" placeholder="https://…" required />
        </div>
        <OnbField v-model="newProgram.description" type="textarea" label="Description" placeholder="What does this program cover?" full hint="Optional — extra context for assignees." />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showNew = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!isProgramValid" @click="doCreate"><Plus :size="13" />Create program</button>
      </template>
    </OnbModal>

    <!-- Assign modal -->
    <OnbModal :open="!!assignProgram" :title="`Assign ${assignProgram?.name || ''}`" subtitle="Pick a joiner and set a due date" :icon="GraduationCap" :width="520" @close="assignProgram = null">
      <div class="form-stack">
        <OnbProcessPicker v-model="assignProcessId" label="Assign to" />
        <OnbField v-model="assignForm.due_date" type="date" label="Due date" />
        <OnbField v-model="assignForm.notes" type="textarea" label="Notes" placeholder="Optional context for the assignee..." full />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="assignProgram = null">Cancel</button>
        <button class="onb-btn-primary" :disabled="!assignProcessId" @click="doAssign">Assign</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, Plus, GraduationCap, User, Calendar, Clock } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import { fetchProcessDetail } from '../composables/useOnboarding'
import {
  fetchTrainingPrograms, createTrainingProgram, fetchTrainingAssignments,
  createTrainingAssignment, patchTrainingAssignment,
} from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const TYPES = ['HR_ORIENTATION','SECURITY','SOFTWARE','COMPLIANCE','SAFETY','DEPARTMENT','OTHER']

const programs = ref([])
const assignments = ref([])

const showNew = ref(false)
const newProgram = reactive({
  name: '', code: '', training_type: 'HR_ORIENTATION', duration_hours: null,
  is_mandatory_for_new_joiners: false, certification_required: false,
  materials_url: '', description: '',
})
const isProgramValid = computed(() => {
  const p = newProgram
  return Boolean(
    p.name && p.code && p.training_type
    && p.duration_hours != null && p.duration_hours !== ''
    && p.is_mandatory_for_new_joiners != null
    && p.certification_required != null
    && p.materials_url
  )
})

const assignProgram = ref(null)
const assignProcessId = ref('')
const assignForm = reactive({ due_date: '', notes: '' })

const reload = async () => {
  try {
    programs.value = await fetchTrainingPrograms()
    assignments.value = await fetchTrainingAssignments()
  } catch (e) { toast.error('Could not load training') }
}
onMounted(reload)

const doCreate = async () => {
  try {
    const payload = { ...newProgram }
    if (payload.duration_hours == null) delete payload.duration_hours
    await createTrainingProgram(payload)
    showNew.value = false
    Object.assign(newProgram, {
      name: '', code: '', training_type: 'HR_ORIENTATION', duration_hours: null,
      is_mandatory_for_new_joiners: false, certification_required: false,
      materials_url: '', description: '',
    })
    toast.success('Program created')
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed') }
}

const assignTo = (p) => { assignProgram.value = p; assignProcessId.value = ''; Object.assign(assignForm, { due_date: '', notes: '' }) }
const doAssign = async () => {
  try {
    const detail = await fetchProcessDetail(assignProcessId.value)
    const payload = {
      program_id: assignProgram.value.id,
      employee_id: detail.process.employee_id,
      process_id: assignProcessId.value,
      notes: assignForm.notes || null,
    }
    if (assignForm.due_date) payload.due_date = assignForm.due_date
    await createTrainingAssignment(payload)
    toast.success('Assigned')
    assignProgram.value = null
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Assign failed') }
}

const markComplete = async (a) => {
  try {
    await patchTrainingAssignment(a.id, { status: 'COMPLETED' })
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Update failed') }
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-tr { display: flex; flex-direction: column; gap: 16px; }

.tr-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.tr-banner-actions { display: flex; gap: 8px; align-self: flex-end; }

.tr-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; }
@media (max-width: 1100px) { .tr-grid { grid-template-columns: 1fr; } }

.tr-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke); border-radius: 22px; overflow: hidden;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
}
.card-head { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.card-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--hr-text); }
.card-sub { margin: 2px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }

.tr-list { list-style: none; margin: 0; padding: 0; max-height: 520px; overflow-y: auto; }
.tr-list::-webkit-scrollbar { width: 6px; } .tr-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }

.prog-row, .assign-row { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-top: 1px solid var(--hr-border); }
.prog-row:first-child, .assign-row:first-child { border-top: 0; }
.prog-type-pill {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px;
  padding: 3px 9px; border-radius: 6px;
  background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-border-warm); color: var(--hr-accent-gold);
  min-width: 110px; text-align: center;
}
.prog-type-pill[data-type="SECURITY"] { background: rgba(248, 113, 113, 0.16); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.prog-type-pill[data-type="COMPLIANCE"] { background: rgba(192, 132, 252, 0.16); color: #c084fc; border-color: rgba(192, 132, 252, 0.32); }
.prog-type-pill[data-type="HR_ORIENTATION"] { background: rgba(251, 191, 36, 0.18); color: #fbbf24; border-color: rgba(251, 191, 36, 0.32); }
.prog-main, .assign-main { flex: 1; min-width: 0; }
.prog-name, .assign-title { font-size: 13px; font-weight: 700; color: var(--hr-text); }
.prog-meta, .assign-meta { font-size: 10.5px; color: var(--hr-text-muted); display: flex; gap: 8px; align-items: center; margin-top: 2px; flex-wrap: wrap; }
.prog-meta > svg, .assign-meta > svg { color: var(--hr-text-muted); }
.prog-meta > span, .assign-meta > span { display: inline-flex; align-items: center; gap: 3px; }
.prog-must { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); }
.assign-status { font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05); color: var(--hr-text-muted); }
.assign-status[data-status="COMPLETED"] { background: rgba(52, 211, 153, 0.16); color: #34d399; }
.assign-status[data-status="IN_PROGRESS"] { background: rgba(251, 146, 60, 0.16); color: #fb923c; }
.mini { padding: 4px 10px; font-size: 11px; }
.tr-empty { padding: 22px; font-size: 12px; color: var(--hr-text-dim); text-align: center; }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
