<template>
  <RecFormDrawer
    :open="open"
    :title="initial ? 'Edit Requisition' : 'New Requisition'"
    :subtitle="initial ? `Updating ${initial.requisition_number}` : 'Internal hiring request'"
    :icon="FileText"
    :confetti-tick="confettiTick"
    @close="onClose"
  >
    <div class="grid">
      <div class="field-block full">
        <HrFieldLabel label="Job Title" required :error="!!errors.job_title" />
        <HrInput v-model="form.job_title" placeholder="e.g. Senior Backend Engineer"
                 :error="!!errors.job_title" :error-text="errors.job_title" />
      </div>

      <div class="field-block">
        <HrFieldLabel label="Department" required :error="!!errors.department_id" />
        <HrSelect v-model="form.department_id" :options="deptOptions" placeholder="Select department" searchable />
        <div v-if="errors.department_id" class="field-err">{{ errors.department_id }}</div>
      </div>
      <div class="field-block">
        <HrFieldLabel label="Designation" required :error="!!errors.designation_id" />
        <HrSelect v-model="form.designation_id" :options="desigOptions" placeholder="Select designation" searchable />
        <div v-if="errors.designation_id" class="field-err">{{ errors.designation_id }}</div>
      </div>
      <div class="field-block">
        <HrFieldLabel label="Grade" required :error="!!errors.grade_id" />
        <HrSelect v-model="form.grade_id" :options="gradeOptions" placeholder="Select grade" />
        <div v-if="errors.grade_id" class="field-err">{{ errors.grade_id }}</div>
      </div>
      <div class="field-block">
        <HrFieldLabel label="Location" required :error="!!errors.location_id" />
        <HrSelect v-model="form.location_id" :options="locOptions" placeholder="Select location" searchable />
        <div v-if="errors.location_id" class="field-err">{{ errors.location_id }}</div>
      </div>

      <h4 class="subheader full">Hiring Details</h4>
      <div class="field-block">
        <HrFieldLabel label="Hiring Type" required />
        <HrSelect v-model="form.hiring_type" :options="hiringTypeOptions" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Employment Type" required />
        <HrSelect v-model="form.employment_type" :options="employmentTypeOptions" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Number of Openings" required :error="!!errors.number_of_openings" />
        <HrNumberInput v-model="form.number_of_openings" :min="1" :max="999" :step-by="1"
                       :error="!!errors.number_of_openings" :error-text="errors.number_of_openings" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Priority" required />
        <HrSelect v-model="form.priority" :options="priorityOptions" />
      </div>

      <h4 class="subheader full">Compensation & Profile</h4>
      <div class="field-block">
        <HrFieldLabel label="Budget — Min" required :error="!!errors.budgeted_salary_min" />
        <HrNumberInput v-model="form.budgeted_salary_min" :step-by="10000" :min="0"
                       :error="!!errors.budgeted_salary_min" :error-text="errors.budgeted_salary_min" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Budget — Max" required :error="!!errors.budgeted_salary_max" />
        <HrNumberInput v-model="form.budgeted_salary_max" :step-by="10000" :min="0"
                       :error="!!errors.budgeted_salary_max" :error-text="errors.budgeted_salary_max" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Experience — Min (yrs)" required :error="!!errors.experience_min_years" />
        <HrNumberInput v-model="form.experience_min_years" :step-by="0.5" :min="0" :max="60"
                       :error="!!errors.experience_min_years" :error-text="errors.experience_min_years" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Experience — Max (yrs)" required :error="!!errors.experience_max_years" />
        <HrNumberInput v-model="form.experience_max_years" :step-by="0.5" :min="0" :max="60"
                       :error="!!errors.experience_max_years" :error-text="errors.experience_max_years" />
      </div>
      <div class="field-block full">
        <HrFieldLabel label="Qualification" required :error="!!errors.qualification" />
        <HrInput v-model="form.qualification" placeholder="B.Tech / MBA / …"
                 :error="!!errors.qualification" :error-text="errors.qualification" />
      </div>
      <div class="field-block full">
        <HrFieldLabel label="Required Skills" required helper="Comma-separated" :error="!!errors.required_skills" />
        <HrInput v-model="skillsText" placeholder="Python, FastAPI, PostgreSQL"
                 :error="!!errors.required_skills" :error-text="errors.required_skills" />
        <div class="tag-row">
          <span v-for="(s, i) in parsedSkills" :key="i" class="tag-pill">{{ s }}</span>
        </div>
      </div>

      <h4 class="subheader full">Description</h4>
      <div class="field-block full">
        <HrFieldLabel label="Job Description" required :error="!!errors.job_description" />
        <HrTextarea v-model="form.job_description" :rows="4" placeholder="Detailed JD…" />
        <div v-if="errors.job_description" class="field-err">{{ errors.job_description }}</div>
      </div>
      <div class="field-block full">
        <HrFieldLabel label="Reason for Hiring" required :error="!!errors.reason_for_hiring" />
        <HrTextarea v-model="form.reason_for_hiring" :rows="2" placeholder="Why are we hiring for this role?" />
        <div v-if="errors.reason_for_hiring" class="field-err">{{ errors.reason_for_hiring }}</div>
      </div>
      <div class="field-block">
        <HrFieldLabel label="Expected Joining Date" required :error="!!errors.expected_joining_date" />
        <HrDatePicker v-model="form.expected_joining_date" />
        <div v-if="errors.expected_joining_date" class="field-err">{{ errors.expected_joining_date }}</div>
      </div>
      <div class="field-block">
        <HrFieldLabel label="Currency" required :error="!!errors.currency" />
        <HrInput v-model="form.currency" mono placeholder="INR" :maxlength="3"
                 :error="!!errors.currency" :error-text="errors.currency" />
      </div>

      <div class="note full">
        <Sparkles :size="14" />
        <span>
          Requisitions are created as <strong>DRAFT</strong>. Use the row actions to
          submit for approval, then convert to an Open Position once approved.
        </span>
      </div>
    </div>

    <template #footer>
      <button class="ghost" @click="onClose">Cancel</button>
      <div class="grow" />
      <button ref="submitBtnRef" class="primary" :disabled="submitting" @click="submit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Save v-else :size="14" />
        {{ initial ? 'Save Changes' : 'Save Draft' }}
      </button>
    </template>
  </RecFormDrawer>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { FileText, Save, Loader2, Sparkles } from 'lucide-vue-next'

import RecFormDrawer from '../components/RecFormDrawer.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import HrNumberInput from '../../../../components/hr/forms/HrNumberInput.vue'

import { useMagnetic } from '../../../../composables/useMagnetic'
import { useToast } from '../../../../composables/useToast'
import { employmentTypeOptions as buildEmploymentTypeOptions } from '../../../../composables/useEmployees'

const props = defineProps({
  open: { type: Boolean, default: false },
  reference: { type: Object, required: true },
  initial: { type: Object, default: null },
})
const emit = defineEmits(['close', 'submit'])

const { error } = useToast()
const submitBtnRef = ref(null)
useMagnetic(submitBtnRef, { strength: 0.2 })

const confettiTick = ref(0)
const submitting = ref(false)
const errors = reactive({})

const hiringTypeOptions = [
  { value: 'NEW',         label: 'New role' },
  { value: 'REPLACEMENT', label: 'Replacement' },
  { value: 'BACKFILL',    label: 'Backfill' },
]
// Sourced from HR Settings masters — deactivated types are hidden from new picks.
const employmentTypeOptions = computed(() => buildEmploymentTypeOptions(form.value?.employment_type))
const priorityOptions = [
  { value: 'LOW',    label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const deptOptions  = computed(() => (props.reference?.departments  || []).map(d => ({ value: d.id, label: d.name })))
const desigOptions = computed(() => (props.reference?.designations || []).map(d => ({ value: d.id, label: d.name })))
const gradeOptions = computed(() => (props.reference?.grades       || []).map(g => ({ value: g.id, label: `${g.code} — ${g.name}` })))
const locOptions   = computed(() => (props.reference?.locations    || []).map(l => ({ value: l.id, label: l.name })))

const blank = () => ({
  job_title: '',
  department_id: null, designation_id: null, grade_id: null, location_id: null,
  hiring_type: 'NEW', employment_type: 'FULL_TIME',
  number_of_openings: 1, priority: 'MEDIUM',
  budgeted_salary_min: null, budgeted_salary_max: null,
  experience_min_years: null, experience_max_years: null,
  qualification: '',
  job_description: '', reason_for_hiring: '',
  expected_joining_date: null,
  currency: 'INR',
})

const form = ref(blank())
const skillsText = ref('')

const initFrom = (data) => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!data) { form.value = blank(); skillsText.value = ''; return }
  form.value = { ...blank(), ...data }
  if (form.value.expected_joining_date) {
    form.value.expected_joining_date = String(form.value.expected_joining_date).slice(0, 10)
  }
  skillsText.value = (data.required_skills || []).join(', ')
}
watch(() => props.open, (v) => { if (v) initFrom(props.initial) })

const parsedSkills = computed(() =>
  skillsText.value.split(',').map(s => s.trim()).filter(Boolean)
)

const validate = () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.value.job_title?.trim()) errors.job_title = 'Job title is required'
  if (!form.value.department_id) errors.department_id = 'Department is required'
  if (!form.value.designation_id) errors.designation_id = 'Designation is required'
  if (!form.value.grade_id) errors.grade_id = 'Grade is required'
  if (!form.value.location_id) errors.location_id = 'Location is required'
  if (!form.value.number_of_openings || Number(form.value.number_of_openings) < 1) {
    errors.number_of_openings = 'At least 1 opening required'
  }

  const expMin = form.value.experience_min_years
  const expMax = form.value.experience_max_years
  if (expMin == null || expMin === '') errors.experience_min_years = 'Min experience is required'
  else if (Number(expMin) < 0) errors.experience_min_years = 'Cannot be negative'
  if (expMax == null || expMax === '') errors.experience_max_years = 'Max experience is required'
  else if (Number(expMax) < 0) errors.experience_max_years = 'Cannot be negative'
  if (expMin != null && expMax != null && Number(expMax) < Number(expMin)) {
    errors.experience_max_years = 'Must be ≥ minimum'
  }

  const bMin = form.value.budgeted_salary_min
  const bMax = form.value.budgeted_salary_max
  if (bMin == null || bMin === '') errors.budgeted_salary_min = 'Min budget is required'
  else if (Number(bMin) < 0) errors.budgeted_salary_min = 'Cannot be negative'
  if (bMax == null || bMax === '') errors.budgeted_salary_max = 'Max budget is required'
  else if (Number(bMax) < 0) errors.budgeted_salary_max = 'Cannot be negative'
  if (bMin != null && bMax != null && Number(bMax) < Number(bMin)) {
    errors.budgeted_salary_max = 'Must be ≥ minimum'
  }

  if (!form.value.qualification?.trim()) errors.qualification = 'Qualification is required'
  if (!parsedSkills.value.length) errors.required_skills = 'At least one skill is required'
  if (!form.value.job_description?.trim()) errors.job_description = 'Job description is required'
  if (!form.value.reason_for_hiring?.trim()) errors.reason_for_hiring = 'Reason for hiring is required'
  if (!form.value.expected_joining_date) errors.expected_joining_date = 'Expected joining date is required'
  if (!form.value.currency?.trim()) errors.currency = 'Currency is required'

  return Object.keys(errors).length === 0
}

const submit = async () => {
  if (!validate()) { error('Some fields need attention'); return }
  const payload = { ...form.value, required_skills: parsedSkills.value }
  for (const [k, v] of Object.entries(payload)) {
    if (v === '' || v === null || v === undefined) delete payload[k]
  }
  submitting.value = true
  try {
    await emit('submit', payload)
    confettiTick.value++
  } finally {
    submitting.value = false
  }
}

const onClose = () => emit('close')
</script>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-block { display: flex; flex-direction: column; gap: 2px; }
.field-block.full { grid-column: span 2; }
.field-err {
  font-size: 11px;
  color: var(--hr-input-error, #f87171);
  margin-top: 2px;
  font-weight: 500;
}

.subheader {
  grid-column: span 2;
  margin: 10px 0 -4px;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--hr-orange);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  display: inline-flex; align-items: center; gap: 8px;
}
.subheader::before {
  content: '';
  width: 14px; height: 2px;
  background: var(--hr-accent-gold);
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag-pill {
  display: inline-flex; align-items: center;
  padding: 3px 9px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  font-size: 11px; font-weight: 600;
  color: var(--hr-accent-gold);
}

.note {
  grid-column: span 2;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--hr-text-secondary);
  display: flex; align-items: center; gap: 8px;
}

.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.grow { flex: 1; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
  .field-block.full, .subheader, .note { grid-column: span 1; }
}
</style>
