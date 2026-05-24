<template>
  <RecModal
    :open="open"
    :title="initial ? 'Edit Candidate' : 'Add Candidate'"
    :subtitle="initial ? `Updating ${initial.full_name}` : 'New candidate profile'"
    :icon="UserPlus"
    :width="780"
    @close="onClose"
  >
    <WizardStepper :steps="stepCfg" :current-index="stepIdx" @step="goTo" />

    <transition :name="`wiz-${slideDir}`" mode="out-in">
      <section :key="stepIdx" class="wiz-step">
        <!-- Step 1: Basic Info -->
        <div v-if="stepIdx === 0" class="grid">
          <div class="field-block full">
            <HrFieldLabel label="Full Name" required :error="!!errors.full_name" />
            <HrInput v-model="form.full_name" placeholder="Jane Doe"
                     :error="!!errors.full_name" :error-text="errors.full_name" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Email" required :error="!!errors.email" />
            <HrInput v-model="form.email" type="email" placeholder="jane@example.com"
                     :error="!!errors.email" :error-text="errors.email" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Mobile" required :error="!!errors.mobile" />
            <HrInput v-model="form.mobile" placeholder="10-digit mobile number"
                     inputmode="numeric" digits :maxlength="10"
                     :error="!!errors.mobile" :error-text="errors.mobile" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Gender" required :error="!!errors.gender" />
            <HrSelect v-model="form.gender" :options="genderOptions" placeholder="Select" />
            <div v-if="errors.gender" class="field-err">{{ errors.gender }}</div>
          </div>
          <div class="field-block">
            <HrFieldLabel label="Date of Birth" required :error="!!errors.dob" />
            <HrDatePicker v-model="form.dob" :max="todayIso" />
            <div v-if="errors.dob" class="field-err">{{ errors.dob }}</div>
          </div>
          <div class="field-block">
            <HrFieldLabel label="Source" required :error="!!errors.source" />
            <HrSelect v-model="form.source" :options="sourceOptions" />
            <div v-if="errors.source" class="field-err">{{ errors.source }}</div>
          </div>
          <div class="field-block">
            <HrFieldLabel label="Current City" required :error="!!errors.current_city" />
            <HrInput v-model="form.current_city" placeholder="Bengaluru"
                     :error="!!errors.current_city" :error-text="errors.current_city" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Current State" required :error="!!errors.current_state" />
            <HrInput v-model="form.current_state" placeholder="Karnataka"
                     :error="!!errors.current_state" :error-text="errors.current_state" />
          </div>
          <div class="field-block full">
            <HrFieldLabel label="Country" required :error="!!errors.current_country" />
            <HrInput v-model="form.current_country" placeholder="India"
                     :error="!!errors.current_country" :error-text="errors.current_country" />
          </div>
        </div>

        <!-- Step 2: Professional -->
        <div v-else-if="stepIdx === 1" class="grid">
          <div class="field-block">
            <HrFieldLabel label="Current Company" required :error="!!errors.current_company" />
            <HrInput v-model="form.current_company" placeholder="Acme Pvt Ltd"
                     :error="!!errors.current_company" :error-text="errors.current_company" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Current Designation" required :error="!!errors.current_designation" />
            <HrInput v-model="form.current_designation" placeholder="SDE 2"
                     :error="!!errors.current_designation" :error-text="errors.current_designation" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Total Experience (yrs)" required :error="!!errors.total_experience_years" />
            <HrNumberInput v-model="form.total_experience_years" :step-by="0.5" :min="0" :max="60"
                           :error="!!errors.total_experience_years" :error-text="errors.total_experience_years" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Relevant Experience (yrs)" required :error="!!errors.relevant_experience_years" />
            <HrNumberInput v-model="form.relevant_experience_years" :step-by="0.5" :min="0" :max="60"
                           :error="!!errors.relevant_experience_years" :error-text="errors.relevant_experience_years" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Current Salary (Annual CTC)" required helper="Yearly gross — not monthly"
                          :error="!!errors.current_salary" />
            <HrNumberInput v-model="form.current_salary" :step-by="50000" :min="0"
                           :error="!!errors.current_salary" :error-text="errors.current_salary" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Expected Salary (Annual CTC)" required helper="Yearly gross — not monthly"
                          :error="!!errors.expected_salary" />
            <HrNumberInput v-model="form.expected_salary" :step-by="50000" :min="0"
                           :error="!!errors.expected_salary" :error-text="errors.expected_salary" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Currency" required :error="!!errors.currency" />
            <HrInput v-model="form.currency" mono placeholder="INR" :maxlength="3"
                     :error="!!errors.currency" :error-text="errors.currency" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Notice Period (days)" required :error="!!errors.notice_period_days" />
            <HrNumberInput v-model="form.notice_period_days" :step-by="15" :min="0" :max="365"
                           :error="!!errors.notice_period_days" :error-text="errors.notice_period_days" />
          </div>

          <h4 class="subheader full">Online & Profiles</h4>
          <div class="field-block full">
            <HrFieldLabel label="LinkedIn URL" :error="!!errors.linkedin_url" />
            <HrInput v-model="form.linkedin_url" placeholder="https://linkedin.com/in/…"
                     :error="!!errors.linkedin_url" :error-text="errors.linkedin_url" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Portfolio URL" :error="!!errors.portfolio_url" />
            <HrInput v-model="form.portfolio_url" placeholder="https://…"
                     :error="!!errors.portfolio_url" :error-text="errors.portfolio_url" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="GitHub URL" :error="!!errors.github_url" />
            <HrInput v-model="form.github_url" placeholder="https://github.com/…"
                     :error="!!errors.github_url" :error-text="errors.github_url" />
          </div>
        </div>

        <!-- Step 3: Education & Skills -->
        <div v-else-if="stepIdx === 2" class="grid">
          <h4 class="subheader full">Education</h4>
          <div class="field-block full">
            <HrFieldLabel label="Highest Qualification" required :error="!!errors.highest_qualification" />
            <HrInput v-model="form.highest_qualification" placeholder="B.Tech CS"
                     :error="!!errors.highest_qualification" :error-text="errors.highest_qualification" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="University / Institute" required :error="!!errors.university" />
            <HrInput v-model="form.university" placeholder="IIT …"
                     :error="!!errors.university" :error-text="errors.university" />
          </div>
          <div class="field-block">
            <HrFieldLabel label="Passing Year" required :error="!!errors.passing_year" />
            <HrNumberInput v-model="form.passing_year" :step-by="1" :min="1950" :max="2099" :allow-decimal="false"
                           :error="!!errors.passing_year" :error-text="errors.passing_year" />
          </div>

          <h4 class="subheader full">Skills</h4>
          <div class="field-block full">
            <HrFieldLabel label="Skills" required helper="Comma-separated" :error="!!errors.skills" />
            <HrInput v-model="skillsText" placeholder="Python, SQL, React"
                     :error="!!errors.skills" :error-text="errors.skills" />
            <div class="tag-row">
              <span v-for="(s, i) in parsedSkills" :key="i" class="tag-pill">{{ s }}</span>
            </div>
          </div>
          <div class="field-block full">
            <HrFieldLabel label="Tags (optional)" helper="Internal labels for filtering" />
            <HrInput v-model="tagsText" placeholder="senior, remote, urgent" />
            <div class="tag-row">
              <span v-for="(t, i) in parsedTags" :key="i" class="tag-pill alt">{{ t }}</span>
            </div>
          </div>
        </div>

        <!-- Step 4: Documents & Notes -->
        <div v-else-if="stepIdx === 3" class="grid">
          <div class="field-block full">
            <HrFieldLabel label="Resume" required helper="PDF or DOC up to 10MB"
                          :error="!!errors.resume_url" />
            <FileUploadField
              :value="form.resume_url"
              accept=".pdf,.doc,.docx"
              kind="resume"
              :uploading="uploading.resume"
              :error="errors.resume_url"
              @upload="onResumeUpload"
              @clear="form.resume_url = ''"
            />
          </div>
          <div class="field-block full">
            <HrFieldLabel label="Cover Letter" required helper="PDF or DOC up to 10MB"
                          :error="!!errors.cover_letter_url" />
            <FileUploadField
              :value="form.cover_letter_url"
              accept=".pdf,.doc,.docx"
              kind="cover-letter"
              :uploading="uploading.coverLetter"
              :error="errors.cover_letter_url"
              @upload="onCoverLetterUpload"
              @clear="form.cover_letter_url = ''"
            />
          </div>
          <div class="field-block full">
            <HrFieldLabel label="Internal Notes (optional)" />
            <HrTextarea v-model="form.notes" :rows="3" placeholder="Anything teammates should know…" />
          </div>

          <div class="note full">
            <Sparkles :size="14" />
            <span>
              Candidate will be created with status <strong>NEW</strong>. After saving you can apply
              them to open positions to start the pipeline.
            </span>
          </div>
        </div>
      </section>
    </transition>

    <template #footer>
      <button class="ghost" :disabled="stepIdx === 0" @click="prev">
        <ChevronLeft :size="14" /> Back
      </button>
      <div class="grow" />
      <button v-if="stepIdx < stepCfg.length - 1" class="primary" @click="next">
        Next <ChevronRight :size="14" />
      </button>
      <button v-else class="primary" :disabled="submitting" @click="submit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Save v-else :size="14" />
        {{ initial ? 'Save Changes' : 'Add Candidate' }}
      </button>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import {
  UserPlus, ChevronLeft, ChevronRight, Save, Loader2, Sparkles,
} from 'lucide-vue-next'

import RecModal from '../components/RecModal.vue'
import WizardStepper from '../../../../components/hr/WizardStepper.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import HrNumberInput from '../../../../components/hr/forms/HrNumberInput.vue'
import FileUploadField from '../components/FileUploadField.vue'

import axios from 'axios'
import { useToast } from '../../../../composables/useToast'
import { API } from '@/utils/api'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const { error } = useToast()

const stepCfg = [
  { key: 'basic',         label: 'Basic Info' },
  { key: 'professional',  label: 'Professional' },
  { key: 'education',     label: 'Education & Skills' },
  { key: 'docs',          label: 'Documents' },
]
const stepIdx = ref(0)
const slideDir = ref('forward')
const errors = reactive({})

const todayIso = new Date().toISOString().slice(0, 10)

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]
const sourceOptions = [
  { value: 'PORTAL',   label: 'Portal' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'NAUKRI',   label: 'Naukri' },
  { value: 'INDEED',   label: 'Indeed' },
  { value: 'AGENCY',   label: 'Agency' },
  { value: 'WALK_IN',  label: 'Walk-in' },
  { value: 'CAMPUS',   label: 'Campus' },
  { value: 'DIRECT',   label: 'Direct' },
  { value: 'OTHER',    label: 'Other' },
]

const blank = () => ({
  full_name: '', email: '', mobile: '', gender: null, dob: null,
  current_city: '', current_state: '', current_country: '',
  current_company: '', current_designation: '',
  total_experience_years: null, relevant_experience_years: null,
  current_salary: null, expected_salary: null,
  currency: 'INR', notice_period_days: null,
  linkedin_url: '', portfolio_url: '', github_url: '',
  highest_qualification: '', university: '', passing_year: null,
  source: 'DIRECT',
  resume_url: '', cover_letter_url: '',
  notes: '',
})

const form = ref(blank())
const skillsText = ref('')
const tagsText = ref('')

const uploading = reactive({ resume: false, coverLetter: false })

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const uploadFile = async (file) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await axios.post(`${API}/uploads/`, fd, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
  })
  // Common backends return either { url } or { path } or { filename }
  const url = res.data?.url || res.data?.path || res.data?.file_url || ''
  if (!url && res.data?.filename) return `/uploads/${res.data.filename}`
  return url
}

const onResumeUpload = async (e) => {
  if (e?.error) { error(e.error); return }
  if (!e?.file) return
  uploading.resume = true
  errors.resume_url = ''
  try {
    const url = await uploadFile(e.file)
    if (!url) throw new Error('Upload did not return a URL')
    form.value.resume_url = url
  } catch (err) {
    errors.resume_url = err?.response?.data?.detail || 'Resume upload failed'
    error(errors.resume_url)
  } finally {
    uploading.resume = false
  }
}

const onCoverLetterUpload = async (e) => {
  if (e?.error) { error(e.error); return }
  if (!e?.file) return
  uploading.coverLetter = true
  errors.cover_letter_url = ''
  try {
    const url = await uploadFile(e.file)
    if (!url) throw new Error('Upload did not return a URL')
    form.value.cover_letter_url = url
  } catch (err) {
    errors.cover_letter_url = err?.response?.data?.detail || 'Cover letter upload failed'
    error(errors.cover_letter_url)
  } finally {
    uploading.coverLetter = false
  }
}

const initFrom = (data) => {
  Object.keys(errors).forEach(k => delete errors[k])
  stepIdx.value = 0
  if (!data) {
    form.value = blank()
    skillsText.value = ''
    tagsText.value = ''
    return
  }
  form.value = { ...blank(), ...data }
  if (form.value.dob) form.value.dob = String(form.value.dob).slice(0, 10)
  skillsText.value = (data.skills || []).join(', ')
  tagsText.value = (data.tags || []).join(', ')
}
watch(() => props.open, (v) => { if (v) initFrom(props.initial) })

const parsedSkills = computed(() =>
  skillsText.value.split(',').map(s => s.trim()).filter(Boolean)
)
const parsedTags = computed(() =>
  tagsText.value.split(',').map(t => t.trim()).filter(Boolean)
)

const isValidUrl = (s) => {
  if (!s) return true
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

const validateStep = (i) => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (i === 0) {
    if (!form.value.full_name?.trim()) errors.full_name = 'Full name is required'
    if (!form.value.email?.trim()) errors.email = 'Email is required'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.email)) {
      errors.email = 'Invalid email format'
    }
    if (!form.value.mobile?.trim()) errors.mobile = 'Mobile is required'
    else if (!/^\d{10}$/.test(form.value.mobile.replace(/\D/g, ''))) {
      errors.mobile = 'Enter exactly 10 digits'
    }
    if (!form.value.gender) errors.gender = 'Gender is required'
    if (!form.value.dob) errors.dob = 'Date of birth is required'
    if (!form.value.source) errors.source = 'Source is required'
    if (!form.value.current_city?.trim()) errors.current_city = 'City is required'
    if (!form.value.current_state?.trim()) errors.current_state = 'State is required'
    if (!form.value.current_country?.trim()) errors.current_country = 'Country is required'
  }
  if (i === 1) {
    if (!form.value.current_company?.trim()) errors.current_company = 'Current company is required'
    if (!form.value.current_designation?.trim()) errors.current_designation = 'Current designation is required'
    if (form.value.total_experience_years == null || form.value.total_experience_years === '') {
      errors.total_experience_years = 'Total experience is required'
    } else if (Number(form.value.total_experience_years) < 0) {
      errors.total_experience_years = 'Cannot be negative'
    }
    if (form.value.relevant_experience_years == null || form.value.relevant_experience_years === '') {
      errors.relevant_experience_years = 'Relevant experience is required'
    } else if (Number(form.value.relevant_experience_years) < 0) {
      errors.relevant_experience_years = 'Cannot be negative'
    } else if (form.value.total_experience_years != null &&
               Number(form.value.relevant_experience_years) > Number(form.value.total_experience_years)) {
      errors.relevant_experience_years = 'Cannot exceed total experience'
    }
    if (form.value.current_salary == null || form.value.current_salary === '') {
      errors.current_salary = 'Current salary is required'
    } else if (Number(form.value.current_salary) < 0) {
      errors.current_salary = 'Cannot be negative'
    }
    if (form.value.expected_salary == null || form.value.expected_salary === '') {
      errors.expected_salary = 'Expected salary is required'
    } else if (Number(form.value.expected_salary) < 0) {
      errors.expected_salary = 'Cannot be negative'
    }
    if (!form.value.currency?.trim()) errors.currency = 'Currency is required'
    if (form.value.notice_period_days == null || form.value.notice_period_days === '') {
      errors.notice_period_days = 'Notice period is required'
    } else if (Number(form.value.notice_period_days) < 0) {
      errors.notice_period_days = 'Cannot be negative'
    }
    // LinkedIn / GitHub / Portfolio are OPTIONAL per spec, but validate format if filled
    if (form.value.linkedin_url && !isValidUrl(form.value.linkedin_url)) {
      errors.linkedin_url = 'Enter a valid URL'
    }
    if (form.value.portfolio_url && !isValidUrl(form.value.portfolio_url)) {
      errors.portfolio_url = 'Enter a valid URL'
    }
    if (form.value.github_url && !isValidUrl(form.value.github_url)) {
      errors.github_url = 'Enter a valid URL'
    }
  }
  if (i === 2) {
    if (!form.value.highest_qualification?.trim()) errors.highest_qualification = 'Qualification is required'
    if (!form.value.university?.trim()) errors.university = 'University is required'
    if (form.value.passing_year == null || form.value.passing_year === '') {
      errors.passing_year = 'Passing year is required'
    } else {
      const y = Number(form.value.passing_year)
      const currentYear = new Date().getFullYear()
      if (y < 1950 || y > currentYear + 6) {
        errors.passing_year = `Year must be between 1950 and ${currentYear + 6}`
      }
    }
    if (!parsedSkills.value.length) errors.skills = 'At least one skill is required'
    // Tags are OPTIONAL per spec
  }
  if (i === 3) {
    if (!form.value.resume_url?.trim()) errors.resume_url = 'Resume upload is required'
    if (!form.value.cover_letter_url?.trim()) errors.cover_letter_url = 'Cover letter upload is required'
    // Internal notes are OPTIONAL per spec
  }
  return Object.keys(errors).length === 0
}

const next = () => {
  if (!validateStep(stepIdx.value)) { error('Some fields need attention'); return }
  slideDir.value = 'forward'
  if (stepIdx.value < stepCfg.length - 1) stepIdx.value++
}
const prev = () => {
  slideDir.value = 'back'
  if (stepIdx.value > 0) stepIdx.value--
}
const goTo = (i) => {
  if (i < stepIdx.value) { slideDir.value = 'back'; stepIdx.value = i }
}

const submit = () => {
  for (let i = 0; i < stepCfg.length; i++) {
    if (!validateStep(i)) { stepIdx.value = i; error('Some fields need attention'); return }
  }
  const payload = { ...form.value, skills: parsedSkills.value, tags: parsedTags.value }
  for (const [k, v] of Object.entries(payload)) {
    if (v === '' || v === null || v === undefined) delete payload[k]
  }
  emit('submit', payload)
}

const onClose = () => emit('close')
</script>

<style scoped>
.wiz-step { min-height: 200px; padding-top: 12px; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
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
.tag-pill.alt {
  background: rgba(251, 146, 60, 0.10);
  border-color: rgba(251, 146, 60, 0.32);
  color: var(--hr-orange);
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
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover:not(:disabled) { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled { opacity: 0.55; cursor: not-allowed; }
.grow { flex: 1; }

.wiz-forward-enter-active, .wiz-forward-leave-active,
.wiz-back-enter-active, .wiz-back-leave-active {
  transition: opacity 0.24s var(--hr-spring), transform 0.24s var(--hr-spring);
}
.wiz-forward-enter-from { opacity: 0; transform: translateX(24px); }
.wiz-forward-leave-to   { opacity: 0; transform: translateX(-24px); }
.wiz-back-enter-from    { opacity: 0; transform: translateX(-24px); }
.wiz-back-leave-to      { opacity: 0; transform: translateX(24px); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
  .field-block.full, .subheader, .note { grid-column: span 1; }
}
</style>
