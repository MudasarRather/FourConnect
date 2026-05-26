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
            <button
              class="prog-del"
              type="button"
              :title="`Delete ${p.name}`"
              @click="openRemoveProgram(p)"
            >
              <Trash2 :size="13" />
            </button>
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

    <!-- Program in use — must clear assignees before delete -->
    <OnbModal
      :open="!!blockedProgram"
      title="Program is in use"
      :subtitle="blockedProgram ? `${blockedList.length} assignee${blockedList.length === 1 ? '' : 's'} still attached to ${blockedProgram.name}.` : ''"
      :icon="AlertTriangle"
      :width="560"
      @close="closeBlocked"
    >
      <div class="tr-blocked">
        <div class="tr-blocked-note">
          <ShieldAlert :size="15" />
          <span>
            A program can't be deleted while joiners are assigned to it — that would orphan their
            training records. Remove the assignees below first; deletion continues automatically once the list is clear.
          </span>
        </div>
        <ul class="tr-blocked-list">
          <Motion v-for="(a, i) in blockedList" :key="a.id" as="li" class="tr-blocked-row"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="tr-blocked-avatar"><User :size="13" /></span>
            <div class="tr-blocked-main">
              <div class="tr-blocked-name">{{ a.employee_name || 'Unknown assignee' }}</div>
              <div class="tr-blocked-meta">
                <span class="assign-status" :data-status="a.status">{{ a.status }}</span>
                <span v-if="a.due_date">due {{ formatDate(a.due_date) }}</span>
              </div>
            </div>
            <Motion as="button" type="button" class="tr-blocked-remove"
              :disabled="removingAssignId === a.id || clearingAll"
              :whileHover="(removingAssignId === a.id || clearingAll) ? {} : { y: -1 }"
              :whileTap="(removingAssignId === a.id || clearingAll) ? {} : { scale: 0.96 }"
              @click="removeOneAssignment(a)"
            >
              <Loader2 v-if="removingAssignId === a.id" :size="12" class="tr-spin" />
              <X v-else :size="12" />
              Remove
            </Motion>
          </Motion>
        </ul>
      </div>
      <template #footer>
        <button class="onb-btn-ghost" :disabled="clearingAll" @click="closeBlocked">Cancel</button>
        <Motion as="button" type="button" class="onb-btn-danger tr-clear-all"
          :disabled="clearingAll || !blockedList.length"
          :whileHover="(clearingAll || !blockedList.length) ? {} : { y: -1, scale: 1.02 }"
          :whileTap="(clearingAll || !blockedList.length) ? {} : { scale: 0.97 }"
          @click="removeAllAssignments"
        >
          <Loader2 v-if="clearingAll" :size="13" class="tr-spin" />
          <Trash2 v-else :size="13" />
          {{ clearingAll ? 'Removing…' : 'Remove all & continue' }}
        </Motion>
      </template>
    </OnbModal>

    <!-- Delete program modal -->
    <OnbDeleteModal
      :open="!!pendingDelete"
      title="Delete training program?"
      :subtitle="pendingDelete ? `Permanently remove ${pendingDelete.name} from the catalog.` : ''"
      :target-label="pendingDelete?.name"
      :target-meta="pendingDelete ? `${pendingDelete.training_type?.replace('_', ' ') || ''} · ${pendingDelete.duration_hours || 0}h` : ''"
      :target-tag="pendingDelete?.is_mandatory_for_new_joiners ? 'MANDATORY' : 'OPTIONAL'"
      :target-icon="GraduationCap"
      :presets="PROGRAM_PRESETS"
      warning="No assignees remain. The program will be permanently removed from the catalog."
      confirm-label="Delete program"
      submitting-label="Deleting…"
      :submitting="removingProgram"
      @close="pendingDelete = null"
      @confirm="confirmRemoveProgram"
    />

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
import { RefreshCw, Plus, GraduationCap, User, Calendar, Clock, Trash2, AlertTriangle, ShieldAlert, Loader2, X } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbDeleteModal from '../components/OnbDeleteModal.vue'
import OnbField from '../components/OnbField.vue'
import { fetchProcessDetail } from '../composables/useOnboarding'
import {
  fetchTrainingPrograms, createTrainingProgram, deleteTrainingProgram,
  fetchTrainingAssignments, createTrainingAssignment, patchTrainingAssignment,
  deleteTrainingAssignment,
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

// Delete-program modal flow
const PROGRAM_PRESETS = [
  'Program retired — superseded by a newer version',
  'Created by mistake / duplicate entry',
  'No longer mandatory after policy change',
  'Vendor or materials are no longer available',
]
const pendingDelete = ref(null)
const removingProgram = ref(false)

// "Program in use" gate — assignees must be cleared before a program can be deleted
const blockedProgram = ref(null)
const blockedList = ref([])
const removingAssignId = ref(null)
const clearingAll = ref(false)

const programAssignments = (p) =>
  assignments.value.filter(a => String(a.program_id) === String(p.id))

const openRemoveProgram = (p) => {
  const linked = programAssignments(p)
  if (linked.length) {
    blockedProgram.value = p
    blockedList.value = linked
  } else {
    pendingDelete.value = p
  }
}

const closeBlocked = () => {
  if (clearingAll.value || removingAssignId.value) return
  blockedProgram.value = null
  blockedList.value = []
}

// Once the assignee list is empty, hand off to the delete-reason modal
const advanceToDelete = () => {
  const prog = blockedProgram.value
  blockedProgram.value = null
  blockedList.value = []
  pendingDelete.value = prog
}

const removeOneAssignment = async (a) => {
  removingAssignId.value = a.id
  try {
    await deleteTrainingAssignment(a.id)
    assignments.value = assignments.value.filter(x => x.id !== a.id)
    blockedList.value = blockedList.value.filter(x => x.id !== a.id)
    toast.success(`${a.employee_name || 'Assignee'} removed from ${a.program_name}`)
    if (!blockedList.value.length) advanceToDelete()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove assignment')
  } finally {
    removingAssignId.value = null
  }
}

const removeAllAssignments = async () => {
  if (!blockedList.value.length) return
  clearingAll.value = true
  const targets = [...blockedList.value]
  try {
    for (const a of targets) {
      await deleteTrainingAssignment(a.id)
    }
    const removed = new Set(targets.map(a => a.id))
    assignments.value = assignments.value.filter(x => !removed.has(x.id))
    blockedList.value = []
    toast.success('All assignees removed')
    advanceToDelete()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove assignments')
    await reload()
    // Refresh the blocked list from the reloaded assignments in case some succeeded
    if (blockedProgram.value) blockedList.value = programAssignments(blockedProgram.value)
  } finally {
    clearingAll.value = false
  }
}

const confirmRemoveProgram = async (reason) => {
  if (!pendingDelete.value) return
  removingProgram.value = true
  try {
    await deleteTrainingProgram(pendingDelete.value.id)
    programs.value = programs.value.filter(x => x.id !== pendingDelete.value.id)
    pendingDelete.value = null
    await reload()
    toast.success(reason ? `Program deleted — ${reason.split('\n')[0]}` : 'Program deleted')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete program')
  } finally {
    removingProgram.value = false
  }
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

.prog-row, .assign-row { position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-top: 1px solid var(--hr-border); }
.prog-row:first-child, .assign-row:first-child { border-top: 0; }
.prog-row { transition: background .18s var(--hr-spring); }
.prog-row:hover { background: rgba(251, 191, 36, 0.04); }

/* Program delete affordance — sits at the trailing edge of the row,
   reveals on hover. Mirrors .ses-del + .ac-card-del language. */
.prog-del {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(248, 113, 113, 0.10);
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 8px;
  color: #fca5a5;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity .18s var(--hr-spring),
              background .18s var(--hr-spring),
              border-color .18s var(--hr-spring),
              color .18s var(--hr-spring),
              transform .15s var(--hr-spring);
}
.prog-row:hover .prog-del { opacity: 0.95; }
.prog-del:hover {
  opacity: 1;
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.60);
  color: #f87171;
  transform: rotate(-8deg) scale(1.08);
}
.prog-del:active { transform: scale(0.92); }
[data-theme="light"] .prog-row:hover { background: rgba(217, 119, 6, 0.06); }
[data-theme="light"] .prog-del {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #b91c1c;
}
[data-theme="light"] .prog-del:hover {
  background: rgba(220, 38, 38, 0.22);
  border-color: rgba(220, 38, 38, 0.55);
  color: #7f1d1d;
}

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

/* ── "Program in use" blocking modal ── */
.tr-blocked { display: flex; flex-direction: column; gap: 16px; }
.tr-blocked-note {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.28);
  font-size: 12px; line-height: 1.55; color: var(--hr-text-secondary);
}
.tr-blocked-note svg { color: var(--hr-accent-gold); flex-shrink: 0; margin-top: 1px; }

.tr-blocked-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
  max-height: 320px; overflow-y: auto;
}
.tr-blocked-list::-webkit-scrollbar { width: 6px; }
.tr-blocked-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
.tr-blocked-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.tr-blocked-avatar {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
}
.tr-blocked-main { flex: 1; min-width: 0; }
.tr-blocked-name { font-size: 13px; font-weight: 700; color: var(--hr-text); }
.tr-blocked-meta {
  font-size: 10.5px; color: var(--hr-text-muted);
  display: flex; gap: 8px; align-items: center; margin-top: 3px; flex-wrap: wrap;
}
.tr-blocked-remove {
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
  padding: 6px 12px; font-size: 11.5px; font-weight: 700;
  border-radius: 9px; cursor: pointer;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.32);
  color: #fca5a5;
  transition: background .18s var(--hr-spring), border-color .18s var(--hr-spring), color .18s var(--hr-spring);
}
.tr-blocked-remove:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.6);
  color: #f87171;
}
.tr-blocked-remove:disabled { opacity: 0.55; cursor: not-allowed; }
.tr-clear-all { display: inline-flex; align-items: center; gap: 6px; }
.tr-spin { animation: tr-spin 0.8s linear infinite; }
@keyframes tr-spin { to { transform: rotate(360deg); } }

/* ── Light theme overrides ── */
[data-theme="light"] .tr-blocked-note {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.30);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .tr-blocked-note svg { color: #b45309; }
[data-theme="light"] .tr-blocked-row {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .tr-blocked-remove {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #b91c1c;
}
[data-theme="light"] .tr-blocked-remove:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.20);
  border-color: rgba(220, 38, 38, 0.55);
  color: #7f1d1d;
}
</style>
