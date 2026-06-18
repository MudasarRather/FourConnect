<template>
  <TrnModal :open="open" wide title="Assign training"
    subtitle="Enroll an employee into a program — it appears instantly in their self-service." :icon="UserPlus" @close="$emit('close')">
    <div class="at-layout">
      <!-- ── fields ── -->
      <div class="at-form">
        <Motion as="section" class="at-group"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="at-gtitle"><BookOpen :size="13" /> What &amp; who</h4>
          <div class="at-fields">
            <TrnSelect v-model="form.program_id" label="Program" required searchable
              search-placeholder="Search programs…" :options="programOptions" placeholder="Select a program…" />
            <TrnSelect v-model="form.employee_id" label="Employee" required searchable
              search-placeholder="Search employees…" :options="employeeOptions"
              :placeholder="loadingEmployees ? 'Loading employees…' : (employeeOptions.length ? 'Select an employee…' : 'No employees found')" />
          </div>
        </Motion>

        <Motion as="section" class="at-group"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.13, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="at-gtitle"><CalendarClock :size="13" /> Schedule &amp; notes</h4>
          <div class="at-fields">
            <label class="at-date">
              <span class="at-date-lab">Due date</span>
              <HrDatePicker v-model="form.due_date" :min="todayIso" placeholder="Pick a due date" />
            </label>
            <TrnField v-model="form.notes" label="Notes" type="textarea" :rows="3"
              placeholder="Optional context for this enrollment…" />
          </div>
        </Motion>

        <!-- duplicate guard -->
        <Presence>
          <Motion v-if="duplicate" as="div" class="at-dup"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }"
            :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
            <AlertTriangle :size="15" />
            <span><b>{{ selectedEmployee?.label }}</b> already has an active enrollment in this program ({{ statusMeta(duplicate.status).label }}).</span>
          </Motion>
        </Presence>
      </div>

      <!-- ── live preview ── -->
      <aside class="at-aside">
        <span class="at-aside-eyebrow"><Sparkles :size="12" /> Enrollment preview</span>
        <Motion as="div" class="at-preview" :animate="{ scale: ready ? 1 : 0.98 }">
          <div class="ap-who">
            <span class="ap-av" :class="{ ghost: !selectedEmployee }">{{ empInitials }}</span>
            <ArrowRight :size="16" class="ap-arrow" />
            <span class="ap-prog-ic" :style="{ '--c': progAccent }"><BookOpen :size="16" /></span>
          </div>
          <div class="ap-lines">
            <span class="ap-emp">{{ selectedEmployee?.label || 'Select an employee' }}</span>
            <span class="ap-prog">{{ selectedProgram?.label || 'Select a program' }}</span>
          </div>
          <div class="ap-meta">
            <TrnTypeBadge v-if="selectedProgramObj" :type="selectedProgramObj.training_type" />
            <span class="ap-status"><span class="aps-dot" /> Not started</span>
          </div>
          <TrnTrajectory status="NOT_STARTED" />
          <div class="ap-due">
            <CalendarClock :size="12" />
            {{ form.due_date ? `Due ${fmtDate(form.due_date)}` : 'No due date set' }}
          </div>
        </Motion>
        <p class="at-hint">The employee is notified and can track progress in their self-service portal.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!canSave || saving"
        :whileHover="!canSave || saving ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><UserPlus v-else :size="15" />
        Assign training
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { UserPlus, Loader, BookOpen, CalendarClock, Sparkles, ArrowRight, AlertTriangle } from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnTypeBadge from '../components/TrnTypeBadge.vue'
import TrnTrajectory from '../components/TrnTrajectory.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { createTrainingAssignment, typeMeta, statusMeta } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  programs: { type: Array, default: () => [] },
  existing: { type: Array, default: () => [] }, // current assignments — for the dup guard
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)
const ready = ref(false)

const employees = ref([])
const loadingEmployees = ref(false)

const blank = () => ({ program_id: '', employee_id: '', due_date: '', notes: '' })
const form = ref(blank())

const todayIso = new Date().toISOString().slice(0, 10)

const programOptions = computed(() => (props.programs || []).map(p => ({
  value: p.id, label: p.name, dot: `var(${typeMeta(p.training_type).cssVar})`,
})))
const employeeOptions = computed(() => (employees.value || []).map(e => ({
  value: e.id, label: e.full_name || e.name || e.employee_id || 'Unnamed',
  hint: e.employee_id || e.employee_code || '',
})))
const selectedProgram = computed(() => programOptions.value.find(o => o.value === form.value.program_id) || null)
const selectedProgramObj = computed(() => (props.programs || []).find(p => p.id === form.value.program_id) || null)
const selectedEmployee = computed(() => employeeOptions.value.find(o => o.value === form.value.employee_id) || null)
const progAccent = computed(() => selectedProgramObj.value ? `var(${typeMeta(selectedProgramObj.value.training_type).cssVar})` : 'var(--trn-amber)')
const empInitials = computed(() => {
  const n = selectedEmployee.value?.label
  if (!n) return '?'
  return n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
})

const ACTIVE = new Set(['NOT_STARTED', 'IN_PROGRESS'])
const duplicate = computed(() => {
  if (!form.value.program_id || !form.value.employee_id) return null
  return (props.existing || []).find(a =>
    String(a.program_id) === String(form.value.program_id) &&
    String(a.employee_id) === String(form.value.employee_id) &&
    ACTIVE.has(a.status)) || null
})
const canSave = computed(() => !!form.value.program_id && !!form.value.employee_id && !duplicate.value)

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

// Load ALL employees (paged) — the old code asked for limit=200 which the API
// rejects (le=100) → 422 → empty dropdown. Page through at limit=100 instead.
const loadEmployees = async () => {
  if (employees.value.length) return
  loadingEmployees.value = true
  try {
    const all = []
    let page = 1, total = Infinity
    while (all.length < total && page <= 60) {
      const { data } = await axios.get(`${API}/hr/employees/`, {
        headers: authHeader(), params: { page, limit: 100, sort_by: 'created_at', sort_dir: 'desc' },
      })
      const items = data.items || []
      all.push(...items)
      total = data.total ?? all.length
      if (!items.length) break
      page++
    }
    employees.value = all
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load employees')
  } finally {
    loadingEmployees.value = false
  }
}

watch(() => props.open, (o) => {
  if (o) {
    form.value = blank()
    ready.value = false
    loadEmployees()
    requestAnimationFrame(() => { ready.value = true })
  }
})

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = { program_id: form.value.program_id, employee_id: form.value.employee_id }
    if (form.value.due_date) payload.due_date = form.value.due_date
    if (form.value.notes) payload.notes = form.value.notes
    await createTrainingAssignment(payload)
    toast.success('Training assigned')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not assign training')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.at-layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 22px; }
.at-form { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.at-group { display: flex; flex-direction: column; gap: 12px; }
.at-gtitle { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.at-fields { display: flex; flex-direction: column; gap: 13px; }
.at-date { display: flex; flex-direction: column; gap: 6px; }
.at-date-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }

.at-dup { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px;
  background: var(--trn-st-failed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 30%, transparent);
  font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }
.at-dup :deep(svg) { color: var(--trn-st-failed); flex-shrink: 0; margin-top: 1px; }
.at-dup b { color: var(--trn-text); }

/* preview */
.at-aside { display: flex; flex-direction: column; gap: 10px; align-self: start; position: sticky; top: 0; }
.at-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.at-preview { display: flex; flex-direction: column; gap: 13px; padding: 18px; border-radius: 18px;
  background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.ap-who { display: flex; align-items: center; gap: 10px; }
.ap-av { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 15px; font-weight: 700; color: #1a1206; background: var(--trn-grad-rail);
  box-shadow: 0 4px 12px -4px rgba(251, 146, 60, 0.5); }
.ap-av.ghost { color: var(--trn-text-dim); background: var(--trn-surface-elevated); box-shadow: none; }
.ap-arrow { color: var(--trn-text-dim); flex-shrink: 0; }
.ap-prog-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.ap-lines { display: flex; flex-direction: column; gap: 3px; }
.ap-emp { font-size: 14.5px; font-weight: 700; color: var(--trn-text); }
.ap-prog { font-size: 12.5px; color: var(--trn-text-muted); }
.ap-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ap-status { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--trn-st-not-started); }
.aps-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-st-not-started); }
.ap-due { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trn-text-muted); }
.ap-due :deep(svg) { color: var(--trn-text-dim); }
.at-hint { margin: 0; font-size: 11px; line-height: 1.45; color: var(--trn-text-dim); }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@media (max-width: 720px) {
  .at-layout { grid-template-columns: 1fr; }
  .at-aside { position: static; order: -1; }
}
</style>
