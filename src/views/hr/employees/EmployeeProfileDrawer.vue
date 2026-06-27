<template>
  <ProfileDrawer :model-value="open" @update:model-value="$emit('update:open', $event)" :aria-label="ariaLabel">
    <!-- ════════════════ Header ════════════════ -->
    <header class="drawer-header hr-spotlight" :class="{ loading }" ref="headerRef">
      <div class="aurora-bg" aria-hidden="true" />
      <button class="close-btn" @click="$emit('update:open', false)" aria-label="Close">
        <X :size="18" />
      </button>
      <div class="header-content">
        <EmployeeAvatar
          :name="displayName"
          :avatar-url="user?.avatar_url"
          :seed="emp?.employee_id"
          size="xl"
          aurora
        />
        <div class="header-text">
          <h2 class="emp-name">{{ displayName }}</h2>
          <div class="emp-meta">
            <span class="emp-id">{{ emp?.employee_id || '—' }}</span>
            <span v-if="designationName" class="emp-designation">· {{ designationName }}</span>
          </div>
          <LifecycleBadge v-if="emp?.lifecycle_state" :state="emp.lifecycle_state" size="md" />
        </div>
      </div>
    </header>

    <!-- ════════════════ Tab strip ════════════════ -->
    <nav class="tab-strip" ref="tabStripRef">
      <button
        v-for="(tab, idx) in tabs"
        :key="tab.key"
        ref="tabRefs"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="setTab(tab.key, idx)"
      >
        <component :is="tab.icon" :size="14" />
        <span>{{ tab.label }}</span>
      </button>
      <span class="tab-underline" :style="underlineStyle" />
    </nav>

    <!-- ════════════════ Body ════════════════ -->
    <div class="drawer-body" ref="bodyRef">
      <div v-if="loading" class="drawer-loading">
        <Loader2 class="spin" :size="24" />
        <p>Loading profile…</p>
      </div>

      <div v-else-if="!emp" class="drawer-empty">
        <UserX :size="32" />
        <p>Profile not available.</p>
      </div>

      <transition :name="`tab-slide-${slideDir}`" mode="out-in">
        <section v-if="!loading && emp" :key="activeTab" class="tab-content">
          <!-- ═══════ Basic Info ═══════ -->
          <div v-if="activeTab === 'basic'" class="section">
            <div class="section-head">
              <h3>Basic Information</h3>
              <button v-if="!editing.basic" class="edit-btn" @click="startEdit('basic')">
                <Edit :size="13" /> Edit
              </button>
              <div v-else class="edit-actions">
                <button class="cancel-btn" @click="cancelEdit('basic')">Cancel</button>
                <button class="save-btn" @click="saveSection('basic')" :disabled="saving">
                  <Loader2 v-if="saving" class="spin" :size="12" />
                  <Check v-else :size="13" /> Save
                </button>
              </div>
            </div>

            <template v-if="!editing.basic">
              <EmpDetailRow label="Employee ID" :value="emp.employee_id" />
              <EmpDetailRow label="Employee Code" :value="emp.employee_code" />
              <EmpDetailRow label="Full Name" :value="displayName" />
              <EmpDetailRow label="Gender" :value="emp.gender" />
              <EmpDetailRow label="Date of Birth" :value="fmtDate(emp.dob) + (emp.dob ? ` (age ${age})` : '')" />
              <EmpDetailRow label="Marital Status" :value="emp.marital_status" />
              <EmpDetailRow label="Blood Group" :value="emp.blood_group" />
              <EmpDetailRow label="Nationality" :value="emp.nationality" />
              <EmpDetailRow label="Religion" :value="emp.religion" />
              <h4 class="subsection">Statutory IDs</h4>
              <EmpDetailRow label="Aadhaar (last 4)" :value="emp.aadhaar_last_4 ? 'XXXX-XXXX-' + emp.aadhaar_last_4 : ''" />
              <EmpDetailRow label="PAN" :value="emp.pan" />
              <EmpDetailRow label="Passport No." :value="emp.passport_number" />
              <EmpDetailRow label="Passport Expiry" :value="fmtDate(emp.passport_expiry)" />
              <EmpDetailRow label="Driving License" :value="emp.driving_license" />
            </template>

            <div v-else class="edit-grid">
              <div class="field-block"><HrFieldLabel label="Gender" /><HrSelect v-model="form.gender" :options="genderOpts" placeholder="—" /></div>
              <div class="field-block"><HrFieldLabel label="Date of Birth" /><HrDatePicker v-model="form.dob" /></div>
              <div class="field-block"><HrFieldLabel label="Marital Status" /><HrSelect v-model="form.marital_status" :options="maritalOpts" placeholder="—" /></div>
              <div class="field-block"><HrFieldLabel label="Blood Group" /><HrInput v-model="form.blood_group" placeholder="e.g. B+" /></div>
              <div class="field-block"><HrFieldLabel label="Nationality" /><HrInput v-model="form.nationality" /></div>
              <div class="field-block"><HrFieldLabel label="Religion" /><HrInput v-model="form.religion" /></div>
              <div class="field-block full"><HrFieldLabel label="Aadhaar (last 4)" /><HrInput v-model="form.aadhaar_last_4" :maxlength="4" mono placeholder="4 digits only" /></div>
              <div class="field-block full"><HrFieldLabel label="PAN" /><HrInput v-model="form.pan" :maxlength="10" mono placeholder="ABCDE1234F" @blur="form.pan = form.pan ? form.pan.toUpperCase() : ''" /></div>
              <div class="field-block"><HrFieldLabel label="Passport No." /><HrInput v-model="form.passport_number" /></div>
              <div class="field-block"><HrFieldLabel label="Passport Expiry" /><HrDatePicker v-model="form.passport_expiry" /></div>
              <div class="field-block full"><HrFieldLabel label="Driving License" /><HrInput v-model="form.driving_license" /></div>
            </div>
          </div>

          <!-- ═══════ Contact ═══════ -->
          <div v-else-if="activeTab === 'contact'" class="section">
            <div class="section-head">
              <h3>Contact Information</h3>
              <button v-if="!editing.contact" class="edit-btn" @click="startEdit('contact')"><Edit :size="13" /> Edit</button>
              <div v-else class="edit-actions">
                <button class="cancel-btn" @click="cancelEdit('contact')">Cancel</button>
                <button class="save-btn" @click="saveSection('contact')" :disabled="saving"><Check :size="13" /> Save</button>
              </div>
            </div>

            <template v-if="!editing.contact">
              <EmpDetailRow label="Mobile" :value="emp.mobile" />
              <EmpDetailRow label="Email" :value="user?.email" />
              <h4 class="subsection">Emergency Contact</h4>
              <EmpDetailRow label="Name" :value="emp.emergency_contact_name" />
              <EmpDetailRow label="Phone" :value="emp.emergency_contact_phone" />
              <EmpDetailRow label="Relation" :value="emp.emergency_contact_relation" />
              <h4 class="subsection">Addresses</h4>
              <EmpDetailRow label="Permanent" :value="emp.permanent_address" />
              <EmpDetailRow label="Current" :value="emp.current_same_as_permanent ? '(same as permanent)' : emp.current_address" />
            </template>

            <div v-else class="edit-grid">
              <div class="field-block full"><HrFieldLabel label="Mobile" /><HrInput v-model="form.mobile" placeholder="+91 98765 43210" /></div>
              <div class="field-block"><HrFieldLabel label="Emergency Name" /><HrInput v-model="form.emergency_contact_name" /></div>
              <div class="field-block"><HrFieldLabel label="Emergency Phone" /><HrInput v-model="form.emergency_contact_phone" /></div>
              <div class="field-block full"><HrFieldLabel label="Relation" /><HrSelect v-model="form.emergency_contact_relation" :options="relationOpts" placeholder="Select relation" /></div>
              <div class="field-block full"><HrFieldLabel label="Permanent Address" /><HrTextarea v-model="form.permanent_address" :rows="2" /></div>
              <div class="field-block full">
                <HrCheckbox v-model="form.current_same_as_permanent" label="Current address same as permanent" />
              </div>
              <div v-if="!form.current_same_as_permanent" class="field-block full">
                <HrFieldLabel label="Current Address" />
                <HrTextarea v-model="form.current_address" :rows="2" />
              </div>
            </div>
          </div>

          <!-- ═══════ Employment ═══════ -->
          <div v-else-if="activeTab === 'employment'" class="section">
            <div class="section-head">
              <h3>Employment Information</h3>
              <button v-if="!editing.employment" class="edit-btn" @click="startEdit('employment')"><Edit :size="13" /> Edit</button>
              <div v-else class="edit-actions">
                <button class="cancel-btn" @click="cancelEdit('employment')">Cancel</button>
                <button class="save-btn" @click="saveSection('employment')" :disabled="saving"><Check :size="13" /> Save</button>
              </div>
            </div>

            <template v-if="!editing.employment">
              <EmpDetailRow label="Department" :value="emp.department?.name" />
              <EmpDetailRow label="Designation" :value="emp.designation?.name" />
              <EmpDetailRow label="Employment Type" :value="emp.employment_type" />
              <EmpDetailRow label="Category" :value="emp.employee_category" />
              <EmpDetailRow label="Joining Date" :value="fmtDate(emp.joining_date)" />
              <EmpDetailRow label="Confirmation Date" :value="fmtDate(emp.confirmation_date)" />
              <EmpDetailRow v-if="emp.contract_end_date" label="Contract End Date" :value="fmtDate(emp.contract_end_date)" />
              <EmpDetailRow label="Tenure" :value="tenure" />
              <EmpDetailRow label="Probation (months)" :value="emp.probation_months" />
              <EmpDetailRow label="Reporting Manager" :value="emp.reporting_manager?.full_name" />
              <EmpDetailRow label="HR Manager" :value="emp.hr_manager?.full_name" />
              <EmpDetailRow label="Grade" :value="emp.grade?.name" />
              <EmpDetailRow label="Pay Level" :value="emp.pay_level" />
              <EmpDetailRow label="Work Location" :value="workLocationValue" />
              <EmpDetailRow label="Notice Period" :value="emp.notice_period_days ? `${emp.notice_period_days} days` : ''" />
              <EmpDetailRow label="Shift" :value="'— (Phase 2)'" />
            </template>

            <div v-else class="edit-grid">
              <div class="field-block full"><HrFieldLabel label="Department" /><HrDepartmentSelect v-model="form.department_id" :departments="reference.departments" /></div>
              <div class="field-block full"><HrFieldLabel label="Designation" /><HrSelect v-model="form.designation_id" :options="designationOpts" placeholder="Select designation" /></div>
              <div class="field-block full"><HrFieldLabel label="Employment Type" /><HrRadio v-model="form.employment_type" :options="employmentTypeOpts" /></div>
              <div class="field-block"><HrFieldLabel label="Joining Date" /><HrDatePicker v-model="form.joining_date" /></div>
              <div class="field-block"><HrFieldLabel label="Contract End Date" /><HrDatePicker v-model="form.contract_end_date" /></div>
              <div class="field-block"><HrFieldLabel label="Probation Months" /><HrNumberInput v-model="form.probation_months" :min="0" :max="36" /></div>
              <div class="field-block"><HrFieldLabel label="Notice Period (days)" /><HrNumberInput v-model="form.notice_period_days" :min="0" :max="365" /></div>
              <div class="field-block"><HrFieldLabel label="Pay Level" /><HrInput v-model="form.pay_level" /></div>
              <div class="field-block full"><HrFieldLabel label="Grade" /><HrSelect v-model="form.grade_id" :options="gradeOpts" placeholder="Select grade" @change="onGradePicked" /></div>
              <div class="field-block full"><HrFieldLabel label="Work Location" helper="Pick a configured site to inherit its timezone" /><HrLocationSelect v-model="form.work_location_id" v-model:customText="form.work_location_text" :locations="reference.locations" /></div>
            </div>
          </div>

          <!-- ═══════ Bank & Salary ═══════ -->
          <div v-else-if="activeTab === 'bank'" class="section">
            <div class="section-head">
              <h3>Bank & Salary</h3>
              <button v-if="!editing.bank" class="edit-btn" @click="onEditBank"><Edit :size="13" /> Edit</button>
              <div v-else class="edit-actions">
                <button class="cancel-btn" @click="cancelEdit('bank')">Cancel</button>
                <button class="save-btn" @click="saveSection('bank')" :disabled="saving"><Check :size="13" /> Save</button>
              </div>
            </div>

            <template v-if="!editing.bank">
              <EmpDetailRow label="Bank Name" :value="emp.bank_name" />
              <EmpDetailRow label="Account No.">
                <template #value>
                  <span class="row-value mono">{{ revealBank ? unmaskedAccount : maskedAccount }}</span>
                </template>
              </EmpDetailRow>
              <div class="reveal-row">
                <button class="ghost-mini" @click="toggleRevealBank">
                  <component :is="revealBank ? EyeOff : Eye" :size="12" />
                  {{ revealBank ? 'Hide' : 'Reveal' }} account number
                </button>
              </div>
              <EmpDetailRow label="IFSC" :value="emp.ifsc" />
              <h4 class="subsection">Statutory</h4>
              <EmpDetailRow label="UAN" :value="emp.uan" />
              <EmpDetailRow label="PF Number" :value="emp.pf_number" />
              <EmpDetailRow label="ESI Number" :value="emp.esic_number" />
              <EmpDetailRow label="Tax Regime" :value="emp.tax_regime" />
              <h4 class="subsection">Compensation</h4>
              <EmpDetailRow label="Monthly CTC" :value="formatINR(emp.monthly_ctc)" />
              <EmpDetailRow label="Annual CTC" :value="formatINR(emp.annual_ctc)" />
              <EmpDetailRow label="Salary Structure" :value="'— (Phase 3 — Payroll)'" />
            </template>

            <div v-else class="edit-grid">
              <div class="warn-banner">
                <ShieldAlert :size="14" />
                <span>You are editing sensitive bank/statutory information. Double-check before saving.</span>
              </div>
              <div class="field-block full"><HrFieldLabel label="Bank Name" /><HrInput v-model="form.bank_name" /></div>
              <div class="field-block full"><HrFieldLabel label="Account Number" /><HrInput v-model="form.account_number" mono /></div>
              <div class="field-block"><HrFieldLabel label="IFSC" /><HrInput v-model="form.ifsc" :maxlength="11" mono @blur="form.ifsc = form.ifsc ? form.ifsc.toUpperCase() : ''" /></div>
              <div class="field-block"><HrFieldLabel label="Tax Regime" /><HrRadio v-model="form.tax_regime" :options="taxRegimeOpts" /></div>
              <div class="field-block"><HrFieldLabel label="UAN" /><HrInput v-model="form.uan" mono /></div>
              <div class="field-block"><HrFieldLabel label="PF Number" /><HrInput v-model="form.pf_number" mono /></div>
              <div class="field-block full"><HrFieldLabel label="ESI Number" /><HrInput v-model="form.esic_number" mono /></div>
              <div class="field-block"><HrFieldLabel label="Monthly CTC (₹)" /><HrNumberInput v-model="form.monthly_ctc" :min="0" :step-by="1000" /></div>
              <div class="field-block"><HrFieldLabel label="Annual CTC (₹)" /><HrNumberInput v-model="form.annual_ctc" :min="0" :step-by="10000" /></div>
            </div>
          </div>

          <!-- ═══════ History ═══════ -->
          <div v-else-if="activeTab === 'history'" class="section">
            <div class="section-head"><h3>Lifecycle History</h3></div>
            <div v-if="historyLoading" class="loading-row"><Loader2 class="spin" :size="16" /> Loading…</div>
            <ol v-else-if="historyRows.length" class="timeline">
              <li v-for="row in historyRows" :key="row.id" class="timeline-item">
                <div class="t-marker" :class="`type-${row.change_type.toLowerCase()}`">
                  <component :is="historyIcon(row.change_type)" :size="14" />
                </div>
                <div class="t-content">
                  <div class="t-head">
                    <strong>{{ formatChangeType(row.change_type) }}</strong>
                    <span class="t-date">{{ fmtDate(row.effective_date) || fmtDate(row.created_at) }}</span>
                  </div>
                  <p v-if="row.reason" class="t-reason">{{ row.reason }}</p>
                  <p v-if="row.actioned_by_name" class="t-actor">by {{ row.actioned_by_name }}</p>
                </div>
              </li>
            </ol>
            <p v-else class="muted">No lifecycle events yet.</p>
          </div>
        </section>
      </transition>
    </div>

    <!-- ════════════════ Footer: lifecycle actions ════════════════ -->
    <footer v-if="emp && !loading" class="drawer-footer">
      <button
        v-for="action in availableActions"
        :key="action.key"
        type="button"
        class="footer-btn"
        :class="`tone-${action.tone}`"
        @click="$emit('lifecycle-action', { action: action.key, employee: emp })"
      >
        <component :is="action.icon" :size="14" />
        {{ action.label }}
      </button>
    </footer>
  </ProfileDrawer>
</template>

<script setup>
import { computed, h, ref, reactive, watch } from 'vue'
import {
  X, Edit, Check, Loader2, UserX, Eye, EyeOff, ShieldAlert,
  IdCard, Phone, Briefcase, Banknote, History,
  Plus, ArrowUp, ArrowRight, CheckCircle, Pause, Play, LogOut, Archive, Undo2, Gauge, RotateCcw,
} from 'lucide-vue-next'

import ProfileDrawer from '../../../components/hr/ProfileDrawer.vue'
import EmployeeAvatar from '../../../components/hr/EmployeeAvatar.vue'
import LifecycleBadge from '../../../components/hr/LifecycleBadge.vue'
import EmpDetailRow from '../../../components/hr/EmpDetailRow.vue'

import HrFieldLabel from '../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../components/hr/forms/HrInput.vue'
import HrNumberInput from '../../../components/hr/forms/HrNumberInput.vue'
import HrTextarea from '../../../components/hr/forms/HrTextarea.vue'
import HrSelect from '../../../components/hr/forms/HrSelect.vue'
import HrDepartmentSelect from '../../../components/hr/forms/HrDepartmentSelect.vue'
import HrLocationSelect from '../../../components/hr/forms/HrLocationSelect.vue'
import HrDatePicker from '../../../components/hr/forms/HrDatePicker.vue'
import HrCheckbox from '../../../components/hr/forms/HrCheckbox.vue'
import HrRadio from '../../../components/hr/forms/HrRadio.vue'

import { useEmployees, useHrReference, payLevelForGrade, employmentTypeOptions } from '../../../composables/useEmployees'
import { useNow, tzOffsetMinutes, offsetLabel, isValidTz } from '../settings/composables/useLocationClock'
import { useToast } from '../../../composables/useToast'
import { useSpotlight } from '../../../composables/useSpotlight'

const genderOpts = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]
const maritalOpts = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'OTHER', label: 'Other' },
]
// Sourced from HR Settings masters — deactivated values hidden (current kept).
const employmentTypeOpts = computed(() => employmentTypeOptions(form.employment_type))
const taxRegimeOpts = [
  { value: 'OLD', label: 'Old Regime' },
  { value: 'NEW', label: 'New Regime' },
]
const relationOpts = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Child', label: 'Child' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Other', label: 'Other' },
]

const props = defineProps({
  open: { type: Boolean, required: true },
  employeeId: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'lifecycle-action', 'updated'])

const { success, error } = useToast()
const { reference, loadReferenceData } = useHrReference()
const { getOne, update, history } = useEmployees()

const designationOpts = computed(() => reference.designations.map(d => ({ value: d.id, label: d.name })))
const gradeOpts = computed(() => reference.grades.map(g => ({ value: g.id, label: `${g.code} — ${g.name}` })))

// ── Work location display (name + inherited timezone) ──
const _now = useNow()
const workLocationValue = computed(() => {
  const e = emp.value
  if (!e) return ''
  // Custom free-text takes precedence; otherwise the live FK name.
  const name = e.work_location_text || e.work_location?.name || ''
  if (e.work_location_text) return name  // custom value carries no managed timezone
  // Resolve timezone from the enriched detail payload, then the reference cache.
  const ref = (reference.locations || []).find(l => String(l.id) === String(e.work_location?.id))
  const tz = e.work_location?.timezone || ref?.timezone
  if (name && tz && isValidTz(tz)) {
    return `${name} · ${tz} (${offsetLabel(tzOffsetMinutes(tz, _now.value))})`
  }
  return name
})

// Picking a grade pre-fills the pay level from that grade's default (editable).
const onGradePicked = (gradeId) => {
  const pl = payLevelForGrade(reference.grades, gradeId)
  if (pl) form.pay_level = pl
}

const headerRef = ref(null)
useSpotlight(headerRef)

const emp = ref(null)
const user = computed(() => emp.value?.user || null)
const loading = ref(false)
const saving = ref(false)
const revealBank = ref(false)

const tabs = [
  { key: 'basic', label: 'Basic Info', icon: IdCard },
  { key: 'contact', label: 'Contact', icon: Phone },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'bank', label: 'Bank & Salary', icon: Banknote },
  { key: 'history', label: 'History', icon: History },
]

const activeTab = ref('basic')
const slideDir = ref('right')
const tabRefs = ref([])
const tabStripRef = ref(null)
const underlineStyle = ref({ left: '0px', width: '0px', opacity: 0 })

const editing = reactive({ basic: false, contact: false, employment: false, bank: false })
const form = reactive({})

const historyRows = ref([])
const historyLoading = ref(false)

const ariaLabel = computed(() => emp.value ? `Profile: ${emp.value.user?.full_name || emp.value.employee_id}` : 'Profile')
const displayName = computed(() => user.value?.full_name || '—')
const designationName = computed(() => emp.value?.designation?.name || '')

const age = computed(() => {
  if (!emp.value?.dob) return ''
  const d = new Date(emp.value.dob)
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a
})

const tenure = computed(() => {
  if (!emp.value?.joining_date) return '—'
  const start = new Date(emp.value.joining_date)
  const end = emp.value.exit_date ? new Date(emp.value.exit_date) : new Date()
  const ms = end - start
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years > 0) return `${years}y ${months}m`
  return `${months}m`
})

const maskedAccount = computed(() => emp.value?.account_number || '—')
const unmaskedAccount = ref('')

const fmtDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d }
}
const formatINR = (n) => {
  if (n === null || n === undefined || n === '') return ''
  const num = Number(n)
  if (!Number.isFinite(num)) return ''
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

const setTab = (key, idx) => {
  const prevIdx = tabs.findIndex(t => t.key === activeTab.value)
  slideDir.value = idx >= prevIdx ? 'right' : 'left'
  activeTab.value = key
  // Wait one tick then position the underline.
  requestAnimationFrame(() => positionUnderline())
}

const positionUnderline = () => {
  const refs = tabRefs.value
  if (!refs || !refs.length) return
  const idx = tabs.findIndex(t => t.key === activeTab.value)
  const btn = refs[idx]
  if (!btn) return
  underlineStyle.value = {
    left: `${btn.offsetLeft}px`,
    width: `${btn.offsetWidth}px`,
    opacity: 1,
  }
}

// ─── Edit lifecycle ───
const collectFormFromEmp = () => {
  if (!emp.value) return
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, {
    gender: emp.value.gender || '',
    dob: emp.value.dob || '',
    marital_status: emp.value.marital_status || '',
    blood_group: emp.value.blood_group || '',
    nationality: emp.value.nationality || '',
    religion: emp.value.religion || '',
    aadhaar_last_4: emp.value.aadhaar_last_4 || '',
    pan: emp.value.pan || '',
    passport_number: emp.value.passport_number || '',
    passport_expiry: emp.value.passport_expiry || '',
    driving_license: emp.value.driving_license || '',
    mobile: emp.value.mobile || '',
    emergency_contact_name: emp.value.emergency_contact_name || '',
    emergency_contact_phone: emp.value.emergency_contact_phone || '',
    emergency_contact_relation: emp.value.emergency_contact_relation || '',
    permanent_address: emp.value.permanent_address || '',
    current_address: emp.value.current_address || '',
    current_same_as_permanent: !!emp.value.current_same_as_permanent,
    department_id: emp.value.department?.id || null,
    designation_id: emp.value.designation?.id || null,
    employment_type: emp.value.employment_type || '',
    joining_date: emp.value.joining_date || '',
    contract_end_date: emp.value.contract_end_date || '',
    probation_months: emp.value.probation_months ?? null,
    notice_period_days: emp.value.notice_period_days ?? null,
    grade_id: emp.value.grade?.id || null,
    pay_level: emp.value.pay_level || '',
    work_location_id: emp.value.work_location?.id || null,
    // Keep the two fields mutually exclusive: managed employees carry the FK
    // (text empty), legacy/custom employees carry the text. Don't seed text
    // from the FK name or HrLocationSelect would open in custom mode.
    work_location_text: emp.value.work_location_text || '',
    bank_name: emp.value.bank_name || '',
    account_number: '',
    ifsc: emp.value.ifsc || '',
    uan: emp.value.uan || '',
    pf_number: emp.value.pf_number || '',
    esic_number: emp.value.esic_number || '',
    tax_regime: emp.value.tax_regime || '',
    monthly_ctc: emp.value.monthly_ctc ?? null,
    annual_ctc: emp.value.annual_ctc ?? null,
  })
}

const SECTION_FIELDS = {
  basic: ['gender','dob','marital_status','blood_group','nationality','religion','aadhaar_last_4','pan','passport_number','passport_expiry','driving_license'],
  contact: ['mobile','emergency_contact_name','emergency_contact_phone','emergency_contact_relation','permanent_address','current_address','current_same_as_permanent'],
  employment: ['department_id','designation_id','employment_type','joining_date','contract_end_date','probation_months','notice_period_days','grade_id','pay_level','work_location_id','work_location_text'],
  bank: ['bank_name','account_number','ifsc','uan','pf_number','esic_number','tax_regime','monthly_ctc','annual_ctc'],
}

const startEdit = (section) => {
  collectFormFromEmp()
  editing[section] = true
}
const cancelEdit = (section) => { editing[section] = false }

const onEditBank = () => {
  if (!confirm('Editing bank / statutory information is sensitive. Continue?')) return
  startEdit('bank')
}

const saveSection = async (section) => {
  if (!emp.value) return
  saving.value = true
  try {
    const patch = {}
    for (const k of SECTION_FIELDS[section]) {
      const v = form[k]
      if (v === '' || v === undefined) {
        patch[k] = null
      } else {
        patch[k] = v
      }
    }
    // PAN uppercase
    if (patch.pan) patch.pan = String(patch.pan).toUpperCase()
    if (patch.ifsc) patch.ifsc = String(patch.ifsc).toUpperCase()
    // Drop account_number if blank in section=bank (don't accidentally wipe)
    if (section === 'bank' && (!form.account_number || form.account_number.startsWith('X'))) {
      delete patch.account_number
    }
    const updated = await update(emp.value.id, patch)
    emp.value = updated
    editing[section] = false
    success('Profile updated')
    emit('updated', updated)
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to save')
  } finally {
    saving.value = false
  }
}

// ─── Bank reveal ───
const toggleRevealBank = async () => {
  if (revealBank.value) {
    revealBank.value = false
    return
  }
  try {
    const fresh = await getOne(emp.value.id, { revealBank: true })
    unmaskedAccount.value = fresh.account_number
    revealBank.value = true
  } catch (e) {
    error('Failed to reveal account number')
  }
}

// ─── History ───
const loadHistory = async () => {
  if (!emp.value) return
  historyLoading.value = true
  try {
    historyRows.value = await history(emp.value.id)
  } catch (e) {
    historyRows.value = []
  } finally {
    historyLoading.value = false
  }
}

const formatChangeType = (t) => {
  const map = {
    HIRED: 'Hired',
    PROFILE_UPDATED: 'Profile Updated',
    PROMOTED: 'Promoted',
    TRANSFERRED: 'Transferred',
    CONFIRMED: 'Confirmed',
    SUSPENDED: 'Suspended',
    REINSTATED: 'Reinstated',
    NOTICE_SERVED: 'Notice Served',
    EXITED: 'Exited',
    ARCHIVED: 'Archived',
    REHIRED: 'Rehired',
  }
  return map[t] || t
}
const historyIcon = (t) => {
  const map = {
    HIRED: Plus,
    PROFILE_UPDATED: Edit,
    PROMOTED: ArrowUp,
    TRANSFERRED: ArrowRight,
    CONFIRMED: CheckCircle,
    SUSPENDED: Pause,
    REINSTATED: Play,
    NOTICE_SERVED: Briefcase,
    EXITED: LogOut,
    ARCHIVED: Archive,
    REHIRED: RotateCcw,
  }
  return map[t] || History
}

// ─── Lifecycle action buttons (contextual) ───
const availableActions = computed(() => {
  if (!emp.value) return []
  const s = emp.value.lifecycle_state
  const out = []
  if (s === 'ON_PROBATION') out.push({ key: 'confirm', label: 'Confirm', icon: CheckCircle, tone: 'gold' })
  if (s === 'ACTIVE') out.push({ key: 'put-on-probation', label: 'Put on Probation', icon: Gauge, tone: 'orange' })
  if (['ACTIVE','ON_PROBATION'].includes(s)) {
    out.push({ key: 'promote', label: 'Promote', icon: ArrowUp, tone: 'gold' })
    out.push({ key: 'transfer', label: 'Transfer', icon: ArrowRight, tone: 'neutral' })
    out.push({ key: 'suspend', label: 'Suspend', icon: Pause, tone: 'red' })
  }
  if (s === 'SUSPENDED') out.push({ key: 'reinstate', label: 'Reinstate', icon: Play, tone: 'green' })
  // Separation hands off to the Exit module (clearance → assets → F&F → letters);
  // the workspace's onLifecycleAction routes `initiate-exit` to /admin/hr/exit.
  if (['ACTIVE','ON_PROBATION','ON_NOTICE','SUSPENDED'].includes(s)) {
    out.push({ key: 'initiate-exit', label: s === 'ON_NOTICE' ? 'Manage Exit' : 'Initiate Exit', icon: LogOut, tone: 'red' })
  }
  if (s === 'ARCHIVED') out.push({ key: 'unarchive', label: 'Restore', icon: Undo2, tone: 'green' })
  // Archive is post-separation cleanup only.
  if (['EXITED','INACTIVE'].includes(s)) out.push({ key: 'archive', label: 'Archive', icon: Archive, tone: 'neutral' })
  // Rehire a former employee (gated server-side on the exit case being
  // eligible-for-rehire). Opens the shared lifecycle modal's `rehire` form.
  if (['EXITED','ARCHIVED','INACTIVE'].includes(s)) out.push({ key: 'rehire', label: 'Rehire', icon: RotateCcw, tone: 'gold' })
  return out
})

// ─── Load on open ───
const reload = async () => {
  if (!props.employeeId) return
  loading.value = true
  revealBank.value = false
  try {
    await loadReferenceData()
    const data = await getOne(props.employeeId)
    emp.value = data
  } catch (e) {
    emp.value = null
    error('Failed to load profile')
  } finally {
    loading.value = false
    requestAnimationFrame(() => positionUnderline())
  }
}

watch(() => [props.open, props.employeeId], async ([o, id]) => {
  if (o && id) {
    activeTab.value = 'basic'
    await reload()
  }
})

// Reload history when entering History tab
watch(activeTab, (t) => { if (t === 'history') loadHistory() })

defineExpose({ reload })

// FormField inline helper component (lightweight)
const FormField = {
  props: { label: { type: String, default: '' }, full: { type: Boolean, default: false } },
  setup(_, { slots, attrs }) {
    return () => h('label', { class: ['form-field', { full: _.full }], ...attrs },
      [_.label ? h('span', { class: 'form-field-label' }, _.label) : null, slots.default?.()]
    )
  },
}
</script>

<style scoped>
/* ──────────────── Header ──────────────── */
.drawer-header {
  position: relative;
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--hr-border);
  overflow: hidden;
}
.aurora-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(80% 100% at 20% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(192, 132, 252, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
  background-size: 200% 200%;
  animation: hr-aurora 12s ease-in-out infinite;
  pointer-events: none;
}
.close-btn {
  position: absolute;
  top: 16px; right: 16px;
  width: 32px; height: 32px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--hr-border-strong);
  border-radius: 8px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  z-index: 2;
}
.close-btn:hover { background: rgba(255,255,255,0.10); color: var(--hr-text); }

.header-content { position: relative; display: flex; align-items: flex-end; gap: 14px; padding-top: 16px; }
.header-text { display: flex; flex-direction: column; gap: 4px; }
.emp-name { font-size: 22px; font-weight: 700; color: var(--hr-text); margin: 0; letter-spacing: -0.02em; }
.emp-meta { font-size: 12px; color: var(--hr-text-muted); display: flex; gap: 4px; flex-wrap: wrap; }
.emp-id { font-family: ui-monospace, monospace; color: var(--hr-accent-gold); font-weight: 600; }

/* ──────────────── Tab strip ──────────────── */
.tab-strip {
  position: relative;
  display: flex;
  gap: 4px;
  padding: 0 14px;
  border-bottom: 1px solid var(--hr-border);
  background: rgba(20, 20, 22, 0.55);
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: none;
  padding: 12px 10px;
  color: var(--hr-text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s var(--hr-spring);
}
.tab-btn:hover { color: var(--hr-text-secondary); }
.tab-btn.active { color: var(--hr-accent-gold); }
.tab-underline {
  position: absolute;
  bottom: -1px;
  height: 2px;
  background: var(--hr-accent-gold);
  border-radius: 2px 2px 0 0;
  box-shadow: var(--hr-accent-gold-glow);
  transition: left 0.22s var(--hr-spring), width 0.22s var(--hr-spring), opacity 0.2s;
}

/* ──────────────── Body ──────────────── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* never bleed horizontally */
  padding: 20px 24px;
  scroll-behavior: smooth;
  min-width: 0;
}
.section { display: flex; flex-direction: column; gap: 2px; }
.section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.section-head h3 {
  font-size: 13px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--hr-text);
}
.subsection {
  font-size: 11px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 14px 0 4px;
}

/* Tab slide transitions */
.tab-slide-right-enter-active, .tab-slide-right-leave-active,
.tab-slide-left-enter-active,  .tab-slide-left-leave-active {
  transition: opacity 0.18s var(--hr-spring), transform 0.18s var(--hr-spring);
}
.tab-slide-right-enter-from { opacity: 0; transform: translateX(12px); }
.tab-slide-right-leave-to   { opacity: 0; transform: translateX(-12px); }
.tab-slide-left-enter-from  { opacity: 0; transform: translateX(-12px); }
.tab-slide-left-leave-to    { opacity: 0; transform: translateX(12px); }

/* ──────────────── Edit ──────────────── */
.edit-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--hr-border-strong);
  border-radius: 999px;
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.edit-btn:hover {
  background: var(--hr-accent-gold-soft);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}

.edit-actions { display: flex; gap: 6px; }
.cancel-btn, .save-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
}
.cancel-btn { background: transparent; color: var(--hr-text-secondary); }
.cancel-btn:hover { background: rgba(255,255,255,0.04); }
.save-btn {
  background: var(--hr-accent-gold);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
}
.save-btn:hover { background: var(--hr-accent-gold-strong); }
.save-btn:disabled { opacity: 0.6; cursor: wait; }

.edit-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px 12px;
  margin-top: 6px;
  /* Prevent any single overflowing field from pushing a horizontal scroll */
  min-width: 0;
  max-width: 100%;
}
.edit-grid .field-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.edit-grid .field-block.full { grid-column: 1 / -1; }
.edit-grid :deep(.form-field.full) { grid-column: 1 / -1; }
.edit-grid :deep(.form-field) {
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0;
}
.edit-grid :deep(.form-field-label) {
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
@media (max-width: 540px) {
  .edit-grid { grid-template-columns: minmax(0, 1fr); }
  .edit-grid .field-block.full { grid-column: span 1; }
}
.hr-input {
  height: 36px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--hr-border-strong);
  border-radius: 8px;
  color: var(--hr-text);
  font-size: 12px;
  padding: 0 10px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
}
.hr-input:focus { border-color: var(--hr-accent-gold-border); background: rgba(0,0,0,0.5); }
.hr-input.textarea { height: auto; padding: 8px 10px; min-height: 60px; line-height: 1.5; }
.hr-input.mono { font-family: ui-monospace, monospace; letter-spacing: 0.05em; }

.checkbox {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px;
  color: var(--hr-text-secondary);
  cursor: pointer;
}

.warn-banner {
  grid-column: span 2;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 8px;
  color: var(--hr-accent-gold);
  font-size: 11px;
}

/* Bank reveal */
.reveal-row { display: flex; justify-content: flex-end; }
.ghost-mini {
  background: transparent;
  border: none;
  color: var(--hr-text-muted);
  font-size: 11px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 2px;
}
.ghost-mini:hover { color: var(--hr-accent-gold); }
.row-value.mono { font-family: ui-monospace, monospace; letter-spacing: 0.05em; }

/* ──────────────── Loading/empty ──────────────── */
.drawer-loading, .drawer-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; gap: 12px; color: var(--hr-text-muted);
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.muted { color: var(--hr-text-dim); font-size: 12px; }
.loading-row { display: flex; align-items: center; gap: 8px; color: var(--hr-text-muted); font-size: 12px; padding: 10px 0; }

/* ──────────────── Timeline ──────────────── */
.timeline {
  list-style: none;
  padding: 0;
  margin: 6px 0;
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: 11px;
  width: 1px;
  background: var(--hr-border);
}
.timeline-item {
  display: flex; gap: 12px;
  padding: 10px 0;
  position: relative;
}
.t-marker {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-surface-elevated);
  border: 1px solid var(--hr-border-strong);
  color: var(--hr-text-muted);
  flex-shrink: 0;
  z-index: 1;
}
.t-marker.type-hired { color: var(--hr-active); border-color: rgba(52,211,153,0.35); }
.t-marker.type-confirmed { color: var(--hr-active); border-color: rgba(52,211,153,0.35); }
.t-marker.type-promoted { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.t-marker.type-transferred { color: var(--hr-text-secondary); }
.t-marker.type-suspended { color: var(--hr-suspended); border-color: rgba(248,113,113,0.35); }
.t-marker.type-reinstated { color: var(--hr-active); }
.t-marker.type-exited { color: var(--hr-exited); border-color: rgba(192,132,252,0.35); }
.t-marker.type-archived { color: var(--hr-inactive); }
.t-marker.type-profile_updated { color: var(--hr-text-secondary); }
.t-marker.type-notice_served { color: var(--hr-notice); border-color: rgba(251,146,60,0.35); }
.t-content { flex: 1; padding-bottom: 4px; }
.t-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.t-head strong { color: var(--hr-text); font-size: 13px; font-weight: 600; }
.t-date { color: var(--hr-text-muted); font-size: 11px; font-family: ui-monospace, monospace; }
.t-reason { color: var(--hr-text-secondary); font-size: 12px; margin: 4px 0 0; }
.t-actor { color: var(--hr-text-dim); font-size: 11px; margin: 2px 0 0; }

/* ──────────────── Footer ──────────────── */
.drawer-footer {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 14px 18px;
  border-top: 1px solid var(--hr-border);
  background: rgba(14, 14, 16, 0.85);
}
.footer-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--hr-border-strong);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--hr-spring);
}
.footer-btn:hover { transform: translateY(-1px); }
.footer-btn.tone-gold { background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.footer-btn.tone-gold:hover { background: rgba(251, 191, 36, 0.18); }
.footer-btn.tone-green { background: rgba(52,211,153,0.10); color: var(--hr-active); border-color: rgba(52,211,153,0.25); }
.footer-btn.tone-orange { background: rgba(251,146,60,0.10); color: var(--hr-notice); border-color: rgba(251,146,60,0.25); }
.footer-btn.tone-red { background: rgba(248,113,113,0.10); color: var(--hr-suspended); border-color: rgba(248,113,113,0.28); }

/* ─── LIGHT THEME OVERRIDES — warm cream + amber/golden palette ─────────── */
[data-theme="light"] .aurora-bg {
  background:
    radial-gradient(80% 100% at 20% 0%, rgba(217, 119, 6, 0.18), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(147, 51, 234, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.30), transparent);
}
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}
[data-theme="light"] .emp-name { color: #1a1410; }
[data-theme="light"] .emp-meta { color: #6b5840; }
[data-theme="light"] .emp-id { color: #b45309; }

[data-theme="light"] .tab-strip {
  background: rgba(255, 250, 240, 0.55);
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .tab-btn { color: #92400e; }
[data-theme="light"] .tab-btn:hover { color: #1a1410; }
[data-theme="light"] .tab-btn.active { color: #b45309; }
[data-theme="light"] .tab-underline {
  background: #d97706;
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.40);
}

[data-theme="light"] .section-head h3 { color: #1a1410; }
[data-theme="light"] .subsection { color: #92400e; }

[data-theme="light"] .edit-btn {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .edit-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
}
[data-theme="light"] .cancel-btn { color: #6b5840; border-color: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .cancel-btn:hover { background: rgba(40, 25, 10, 0.06); }
[data-theme="light"] .save-btn {
  background: linear-gradient(180deg, #d97706, #b45309);
  border-color: rgba(217, 119, 6, 0.55);
  color: #fff;
}
[data-theme="light"] .save-btn:hover { background: linear-gradient(180deg, #c2410c, #92400e); }

[data-theme="light"] .hr-input {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #1a1410;
}
[data-theme="light"] .hr-input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .hr-input:focus {
  background: rgba(255, 246, 226, 0.95);
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .edit-grid :deep(.form-field-label) { color: #92400e; }
[data-theme="light"] .checkbox { color: #44362a; }
[data-theme="light"] .warn-banner {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.32);
  color: #b45309;
}
[data-theme="light"] .ghost-mini { color: #92400e; }
[data-theme="light"] .ghost-mini:hover { color: #b45309; }
[data-theme="light"] .muted { color: #8d7b62; }
[data-theme="light"] .loading-row, [data-theme="light"] .drawer-loading, [data-theme="light"] .drawer-empty { color: #6b5840; }

/* Timeline */
[data-theme="light"] .timeline::before { background: rgba(40, 25, 10, 0.16); }
[data-theme="light"] .t-marker {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .t-head strong { color: #1a1410; }
[data-theme="light"] .t-date { color: #92400e; }
[data-theme="light"] .t-reason { color: #44362a; }
[data-theme="light"] .t-actor { color: #8d7b62; }

/* Drawer footer */
[data-theme="light"] .drawer-footer {
  background: rgba(255, 250, 240, 0.55);
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .footer-btn {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .footer-btn.tone-gold {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.36);
}
[data-theme="light"] .footer-btn.tone-gold:hover { background: rgba(217, 119, 6, 0.22); }
[data-theme="light"] .footer-btn.tone-green {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
  border-color: rgba(5, 150, 105, 0.32);
}
[data-theme="light"] .footer-btn.tone-orange {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.32);
}
[data-theme="light"] .footer-btn.tone-red {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.32);
}
</style>
