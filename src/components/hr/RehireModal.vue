<!--
  RehireModal — the advanced, corporate-standard "boomerang" rehire workflow.

  A single shared component used by BOTH:
    • /admin/hr/recruitment/rehire  (RecRehireSection alumni roster)
    • /admin/hr/employees/profile/:id  (EmployeeProfilePage lifecycle action)
    • the Employees workspace drawer / lifecycle board (HrEmployeesWorkspacePage)

  The flow mirrors how mature HRMS suites (Google/Microsoft "boomerang" rehire)
  gate a re-joiner: Verify eligibility → Placement → Tenure & onboarding →
  Authorize (justification + acknowledgement). It self-resolves rehire
  eligibility from `GET /hr/employees/rehire-eligible` so it works the same no
  matter where it's opened from, then POSTs the same body the backend
  `lifecycle/rehire` handler expects.

  Props
    open      Boolean
    candidate Object  — either a rehire-eligible roster row OR an
                        EmployeeDetailResponse (profile). Normalised internally.
  Emits
    close  — user dismissed
    done   — rehire committed (parent should refresh)
-->
<template>
  <Teleport to="body">
    <transition name="rh-fade">
      <div v-if="open" class="rh-scrim" @mousedown.self="close">
        <Motion as="div" class="rh-card" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">
          <span class="rh-edge" aria-hidden="true" />
          <span class="rh-aura" aria-hidden="true" />

          <!-- ───────── Header ───────── -->
          <header class="rh-head">
            <span class="rh-ic"><RotateCcw :size="18" /></span>
            <div class="rh-h-meta">
              <h3>Rehire <span class="rh-h-name">{{ name }}</span></h3>
              <p>{{ code }} · Boomerang rehire workflow</p>
            </div>
            <button class="rh-x" @click="close" aria-label="Close"><X :size="18" /></button>
          </header>

          <!-- ───────── Stepper ───────── -->
          <nav class="rh-steps" aria-label="Rehire steps">
            <div class="rh-steps-rail"><span class="rh-steps-fill" :style="{ width: fillPct }" /></div>
            <button
              v-for="(s, i) in STEPS" :key="s.key" type="button"
              class="rh-step" :class="{ on: i === step, done: i < step }"
              :disabled="i > maxReached" @click="goStep(i)"
            >
              <span class="rh-step-dot">
                <Check v-if="i < step" :size="13" />
                <component v-else :is="s.icon" :size="13" />
              </span>
              <span class="rh-step-lbl">{{ s.label }}</span>
            </button>
          </nav>

          <!-- ───────── Body ───────── -->
          <div class="rh-body">
            <transition :name="slideDir" mode="out-in">
              <div :key="step" class="rh-pane">

                <!-- ══ STEP 1 — Verify eligibility & alumni ══ -->
                <template v-if="step === 0">
                  <!-- alumnus identity -->
                  <div class="rh-alum">
                    <span class="rh-av">{{ initials(name) }}</span>
                    <div class="rh-alum-meta">
                      <b>{{ name }}</b>
                      <span class="rh-alum-sub">
                        {{ desig || '—' }}<template v-if="dept"> · {{ dept }}</template>
                      </span>
                    </div>
                    <span v-if="rehireCount" class="rh-chip warn" title="Times previously rehired">
                      <RotateCcw :size="11" /> Boomerang ×{{ rehireCount }}
                    </span>
                  </div>

                  <!-- eligibility verdict -->
                  <div class="rh-verdict" :class="elig">
                    <span class="rh-verdict-ic">
                      <Loader2 v-if="elig === 'checking'" :size="15" class="rh-spin" />
                      <BadgeCheck v-else-if="elig === 'eligible'" :size="15" />
                      <ShieldAlert v-else-if="elig === 'ineligible'" :size="15" />
                      <ShieldQuestion v-else :size="15" />
                    </span>
                    <div class="rh-verdict-txt">
                      <b v-if="elig === 'checking'">Verifying rehire eligibility…</b>
                      <b v-else-if="elig === 'eligible'">Cleared for rehire</b>
                      <b v-else-if="elig === 'ineligible'">Not eligible for rehire</b>
                      <b v-else>Eligibility couldn't be auto-verified</b>

                      <small v-if="elig === 'checking'">Checking the exit case rehire flag.</small>
                      <small v-else-if="elig === 'eligible'">
                        Their exit case is marked <i>eligible for rehire</i>.<template v-if="caseNo"> Ref {{ caseNo }}.</template>
                      </small>
                      <small v-else-if="elig === 'ineligible'">
                        This former employee was not flagged <i>eligible for rehire</i> on exit. Update their exit case in the Exit module before rehiring.
                      </small>
                      <small v-else>The system will re-check on submit; if the exit case isn't flagged, the rehire will be declined.</small>
                    </div>
                  </div>

                  <!-- prior service summary -->
                  <div class="rh-grid">
                    <div class="rh-fact">
                      <span class="rh-fact-k"><CalendarClock :size="12" /> Original join</span>
                      <span class="rh-fact-v">{{ fmtDate(origJoin) }}</span>
                    </div>
                    <div class="rh-fact">
                      <span class="rh-fact-k"><CalendarOff :size="12" /> Last exit</span>
                      <span class="rh-fact-v">{{ fmtDate(exitDate) }}</span>
                    </div>
                    <div class="rh-fact">
                      <span class="rh-fact-k"><History :size="12" /> Prior service</span>
                      <span class="rh-fact-v">{{ priorService }}</span>
                    </div>
                    <div class="rh-fact" :class="{ alert: coolingFlag }">
                      <span class="rh-fact-k"><Hourglass :size="12" /> Time away</span>
                      <span class="rh-fact-v">{{ timeAway }}</span>
                    </div>
                  </div>

                  <p v-if="exitReason" class="rh-reason-chip">
                    <FileText :size="12" /> Left as <b>{{ prettyReason(exitReason) }}</b>
                  </p>

                  <p class="rh-note">
                    <Info :size="12" />
                    Prior service, history and the original joining date are preserved across a rehire — only a fresh tenure starts.
                  </p>
                </template>

                <!-- ══ STEP 2 — Placement (role & org) ══ -->
                <template v-else-if="step === 1">
                  <p class="rh-pane-lead">Confirm where they re-join. Leave a field on <i>keep current</i> to carry their prior placement forward.</p>

                  <label class="rh-field">
                    <span class="rh-lbl">New joining date <i>*</i></span>
                    <HrDatePicker v-model="form.joining_date" :min="todayIso" :clearable="false" />
                  </label>

                  <div class="rh-row">
                    <label class="rh-field">
                      <span class="rh-lbl">Designation</span>
                      <HrSelect v-model="form.designation_id" :options="desigOptions" placeholder="Keep current" />
                    </label>
                    <label class="rh-field">
                      <span class="rh-lbl">Department</span>
                      <HrSelect v-model="form.department_id" :options="deptOptions" placeholder="Keep current" />
                    </label>
                  </div>

                  <div class="rh-row">
                    <label class="rh-field">
                      <span class="rh-lbl">Grade</span>
                      <HrSelect v-model="form.grade_id" :options="gradeOptions" placeholder="Keep current" />
                    </label>
                    <label class="rh-field">
                      <span class="rh-lbl">Work location</span>
                      <HrSelect v-model="form.work_location_id" :options="locationOptions" placeholder="Keep current" />
                    </label>
                  </div>

                  <label class="rh-field">
                    <span class="rh-lbl">Reporting manager</span>
                    <HrSearchCombobox
                      v-model="form.reporting_manager_id"
                      :search="searchUsers"
                      :selected-label="form.reporting_manager_label"
                      placeholder="Search by name or email…"
                      @change="onManagerPicked"
                    />
                    <span class="rh-help">Blank = keep their previous reporting line.</span>
                  </label>
                </template>

                <!-- ══ STEP 3 — Tenure & onboarding ══ -->
                <template v-else-if="step === 2">
                  <div class="rh-prob">
                    <button type="button" class="rh-toggle" :class="{ on: form.on_probation }"
                      @click="form.on_probation = !form.on_probation" role="switch" :aria-checked="form.on_probation">
                      <span class="rh-knob" />
                    </button>
                    <div class="rh-prob-meta">
                      <b>Start on probation</b>
                      <small>Re-joiners typically serve a fresh probation. Off = confirmed (permanent) from day one.</small>
                    </div>
                    <label v-if="form.on_probation" class="rh-months">
                      <HrNumberInput v-model="form.probation_months" :min="1" :step-by="1" />
                      <span>months</span>
                    </label>
                  </div>

                  <div class="rh-info-card">
                    <span class="rh-info-ic emerald"><ShieldCheck :size="15" /></span>
                    <div>
                      <b>Continuity of service preserved</b>
                      <small>Their original joining date (<i>{{ fmtDate(origJoin) }}</i>) stays on record for seniority &amp; gratuity. This becomes rehire #{{ (rehireCount || 0) + 1 }}.</small>
                    </div>
                  </div>

                  <div class="rh-info-card">
                    <span class="rh-info-ic gold"><Workflow :size="15" /></span>
                    <div>
                      <b>Onboarding re-opens automatically</b>
                      <small>A fresh onboarding journey is created so the re-joiner re-runs the joining formalities.</small>
                      <div class="rh-journey">
                        <span v-for="(j, i) in JOURNEY" :key="j" class="rh-journey-node" :style="{ '--ji': i }">
                          <span class="rh-journey-dot" /> {{ j }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- ══ STEP 4 — Authorize ══ -->
                <template v-else>
                  <p class="rh-pane-lead">Review the rehire and authorize. This is recorded against your account in the employee's history.</p>

                  <div class="rh-summary">
                    <div class="rh-sum-hero">
                      <span class="rh-av sm">{{ initials(name) }}</span>
                      <div>
                        <b>{{ name }}</b>
                        <span class="rh-state-to">
                          <span class="rh-pill old">{{ stateLabel(alumState) }}</span>
                          <ArrowRight :size="12" />
                          <span class="rh-pill new">{{ form.on_probation ? 'On probation' : 'Active' }}</span>
                        </span>
                      </div>
                    </div>

                    <div class="rh-sum-rows">
                      <div class="rh-sum-row"><span>Joining date</span><b>{{ fmtDate(form.joining_date) }}</b></div>
                      <div class="rh-sum-row"><span>Employment</span><b>{{ form.on_probation ? `Probationary · ${form.probation_months || 6} mo` : 'Permanent' }}</b></div>
                      <div class="rh-sum-row"><span>Designation</span><b>{{ labelFor(desigOptions, form.designation_id) || (desig || '—') + ' (kept)' }}</b></div>
                      <div class="rh-sum-row"><span>Department</span><b>{{ labelFor(deptOptions, form.department_id) || (dept || '—') + ' (kept)' }}</b></div>
                      <div class="rh-sum-row" v-if="form.grade_id"><span>Grade</span><b>{{ labelFor(gradeOptions, form.grade_id) }}</b></div>
                      <div class="rh-sum-row" v-if="form.work_location_id"><span>Work location</span><b>{{ labelFor(locationOptions, form.work_location_id) }}</b></div>
                      <div class="rh-sum-row" v-if="form.reporting_manager_id"><span>Reporting manager</span><b>{{ form.reporting_manager_label || '—' }}</b></div>
                    </div>
                  </div>

                  <label class="rh-field">
                    <span class="rh-lbl">Reason / justification <i>*</i></span>
                    <HrTextarea v-model="form.reason" :rows="3"
                      placeholder="e.g. Rejoining the Platform team after 14 months — strong prior performance; backfills an open req." />
                    <span class="rh-help">Required for the audit trail.</span>
                  </label>

                  <button type="button" class="rh-ack" :class="{ on: form.ack }" @click="form.ack = !form.ack">
                    <span class="rh-ack-box"><Check v-if="form.ack" :size="12" /></span>
                    <span class="rh-ack-txt">
                      I confirm this rehire has the necessary approvals and complies with the company's rehire policy. Prior service, history and the original joining date will be preserved.
                    </span>
                  </button>
                </template>

              </div>
            </transition>
          </div>

          <!-- ───────── Footer ───────── -->
          <footer class="rh-actions">
            <button v-if="step > 0" class="rh-btn ghost" :disabled="busy" @click="back">
              <ChevronLeft :size="15" /> Back
            </button>
            <button v-else class="rh-btn ghost" :disabled="busy" @click="close">Cancel</button>

            <span class="rh-step-count">Step {{ step + 1 }} of {{ STEPS.length }}</span>

            <Motion v-if="step < STEPS.length - 1" as="button" class="rh-btn primary"
              :disabled="!canNext" :whileHover="canNext ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="next">
              Continue <ChevronRight :size="15" />
            </Motion>
            <Motion v-else as="button" class="rh-btn primary"
              :disabled="!canSubmit || busy" :whileHover="(canSubmit && !busy) ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }" @click="submit">
              <Loader2 v-if="busy" :size="15" class="rh-spin" /><RotateCcw v-else :size="15" />
              {{ busy ? 'Rehiring…' : 'Confirm rehire' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import {
  X, RotateCcw, Loader2, Check, ChevronLeft, ChevronRight, ArrowRight,
  CalendarOff, CalendarClock, BadgeCheck, ShieldAlert, ShieldQuestion, ShieldCheck,
  Info, FileText, History, Hourglass, Workflow,
  UserCheck, MapPin, ClipboardCheck,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { API } from '@/utils/api'
import { useEmployees, useHrReference, fetchRehireEligible } from '@/composables/useEmployees'

import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrSearchCombobox from '@/components/hr/forms/HrSearchCombobox.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import HrNumberInput from '@/components/hr/forms/HrNumberInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  candidate: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])

const toast = useToast()
const { lifecycle } = useEmployees()
const { reference, loadReferenceData } = useHrReference()

const todayIso = new Date().toISOString().slice(0, 10)

const STEPS = [
  { key: 'verify',    label: 'Verify',    icon: UserCheck },
  { key: 'placement', label: 'Placement', icon: MapPin },
  { key: 'tenure',    label: 'Tenure',    icon: ClipboardCheck },
  { key: 'authorize', label: 'Authorize', icon: ShieldCheck },
]
const JOURNEY = ['Pre-join', 'Documents', 'Provisioning', 'Induction']

const step = ref(0)
const maxReached = ref(0)
const slideDir = ref('rh-slide-next')
const busy = ref(false)

// ─── Eligibility resolution (uniform across both entry points) ───
const elig = ref('checking')        // checking | eligible | ineligible | unknown
const alum = ref({})                // candidate merged with the resolved roster row

const blankForm = () => ({
  joining_date: todayIso,
  designation_id: '',
  department_id: '',
  grade_id: '',
  work_location_id: '',
  reporting_manager_id: null,
  reporting_manager_label: '',
  on_probation: true,
  probation_months: 6,
  reason: '',
  ack: false,
})
const form = reactive(blankForm())

// ─── Normalised getters (works for roster row OR EmployeeDetailResponse) ───
const a = computed(() => alum.value || {})
const name = computed(() => a.value.full_name || a.value.user?.full_name || a.value.name || 'former employee')
const code = computed(() => a.value.employee_id || '—')
const desig = computed(() => a.value.designation_name || a.value.designation?.name || '')
const dept = computed(() => a.value.department_name || a.value.department?.name || '')
const origJoin = computed(() => a.value.original_joining_date || a.value.joining_date || null)
const exitDate = computed(() => a.value.exit_date || null)
const rehireCount = computed(() => a.value.rehire_count || 0)
const caseNo = computed(() => a.value.exit_case_number || '')
const exitReason = computed(() => a.value.exit_reason_category || '')
const alumState = computed(() => a.value.lifecycle_state || 'EXITED')

const priorService = computed(() => humanGap(origJoin.value, exitDate.value) || '—')
const timeAway = computed(() => humanGap(exitDate.value, todayIso) || '—')
// Flag an unusually short gap (< 30 days away) — corporate rehire policies
// usually want a cooling-off period; surface it but never hard-block.
const coolingFlag = computed(() => {
  const d = daysBetween(exitDate.value, todayIso)
  return d !== null && d < 30
})

// ─── Reference option lists ───
const toOpts = (arr, fmt) => (arr || []).map(fmt)
const desigOptions = computed(() => toOpts(reference.designations, d => ({ value: d.id, label: d.name })))
const deptOptions = computed(() => toOpts(reference.departments, d => ({ value: d.id, label: d.name })))
const gradeOptions = computed(() => toOpts(reference.grades, g => ({ value: g.id, label: `${g.code} — ${g.name}` })))
const locationOptions = computed(() => toOpts(reference.locations, l => ({ value: l.id, label: l.name })))
const labelFor = (opts, val) => (opts.find(o => o.value === val)?.label) || ''

// ─── Step gating ───
const fillPct = computed(() => `${(step.value / (STEPS.length - 1)) * 100}%`)
const canNext = computed(() => {
  if (step.value === 0) return elig.value === 'eligible' || elig.value === 'unknown'
  if (step.value === 1) return !!form.joining_date
  if (step.value === 2) return !form.on_probation || (Number(form.probation_months) >= 1)
  return true
})
const canSubmit = computed(() =>
  (elig.value === 'eligible' || elig.value === 'unknown') &&
  !!form.joining_date &&
  form.reason.trim().length >= 5 &&
  form.ack
)

const goStep = (i) => {
  if (i > maxReached.value) return
  slideDir.value = i > step.value ? 'rh-slide-next' : 'rh-slide-prev'
  step.value = i
}
const next = () => {
  if (!canNext.value || step.value >= STEPS.length - 1) return
  slideDir.value = 'rh-slide-next'
  step.value++
  maxReached.value = Math.max(maxReached.value, step.value)
}
const back = () => {
  if (step.value === 0) return
  slideDir.value = 'rh-slide-prev'
  step.value--
}

// ─── Manager search (mirrors LifecycleActionModal) ───
const searchUsers = async (term) => {
  if (!term || term.length < 2) return []
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const res = await axios.get(`${API}/auth/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
    const t = term.toLowerCase()
    return (res.data || [])
      .filter(u => !u.is_superuser)
      .filter(u =>
        (u.full_name || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t) ||
        (u.employee_code || '').toLowerCase().includes(t)
      )
      .slice(0, 10)
      .map(u => ({ id: u.id, full_name: u.full_name, email: u.email, employee_id: u.employee_code, avatar_url: u.avatar_url }))
  } catch { return [] }
}
const onManagerPicked = (u) => { form.reporting_manager_label = u ? (u.full_name || u.email || '') : '' }

// ─── Lifecycle ───
const resolveEligibility = async () => {
  const c = props.candidate || {}
  alum.value = { ...c }
  // A candidate sourced from the recruitment "rehire-eligible" roster already
  // carries proof of eligibility (it only lists flagged alumni).
  const seeded = !!c.exit_case_number
  elig.value = 'checking'
  try {
    const data = await fetchRehireEligible(c.employee_id || '')
    const row = (data.items || []).find(r => String(r.id) === String(c.id))
    if (row) { alum.value = { ...c, ...row }; elig.value = 'eligible' }
    else elig.value = seeded ? 'eligible' : 'ineligible'
  } catch {
    // Couldn't reach the check — don't hard-block; the backend still gates.
    elig.value = seeded ? 'eligible' : 'unknown'
  }
}

watch(() => props.open, (o) => {
  if (!o) return
  step.value = 0
  maxReached.value = 0
  slideDir.value = 'rh-slide-next'
  Object.assign(form, blankForm())
  loadReferenceData()
  resolveEligibility()
}, { immediate: true })

const close = () => { if (!busy.value) emit('close') }

const submit = async () => {
  if (!canSubmit.value || busy.value) return
  const c = props.candidate || {}
  if (!c.id) return
  busy.value = true
  try {
    const body = {
      joining_date: form.joining_date,
      on_probation: form.on_probation,
      probation_months: form.on_probation ? (Number(form.probation_months) || 6) : null,
      designation_id: form.designation_id || null,
      department_id: form.department_id || null,
      grade_id: form.grade_id || null,
      work_location_id: form.work_location_id || null,
      reporting_manager_id: form.reporting_manager_id || null,
      reason: form.reason.trim() || null,
    }
    await lifecycle(c.id, 'rehire', body)
    toast.success(`${name.value} rehired — onboarding re-opened`)
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not rehire')
  } finally {
    busy.value = false
  }
}

// ─── formatting helpers ───
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00')
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
const stateLabel = (s) => ({ EXITED: 'Exited', ARCHIVED: 'Archived', INACTIVE: 'Inactive' }[s] || s)
const prettyReason = (r) => String(r || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const f = new Date(String(fromIso).slice(0, 10) + 'T00:00:00')
  const t = new Date(String(toIso).slice(0, 10) + 'T00:00:00')
  if (isNaN(f) || isNaN(t)) return null
  return Math.round((t - f) / 86400000)
}
function humanGap(fromIso, toIso) {
  const days = daysBetween(fromIso, toIso)
  if (days === null) return ''
  if (days < 0) return '—'
  if (days < 31) return `${days} day${days === 1 ? '' : 's'}`
  const months = Math.floor(days / 30.44)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const remM = months % 12
  return remM ? `${years}y ${remM}m` : `${years} year${years === 1 ? '' : 's'}`
}
</script>

<style scoped>
.rh-scrim {
  position: fixed; inset: 0;
  z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}
.rh-card {
  position: relative;
  width: 100%;
  max-width: 600px;
  max-height: 92vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.97), rgba(18, 18, 22, 0.97));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 36px 100px -22px rgba(0, 0, 0, 0.82);
}
.rh-edge {
  position: absolute; top: 0; left: 24px; right: 24px; height: 2px;
  background: linear-gradient(90deg, transparent, var(--hr-accent-gold), transparent);
  opacity: 0.7; pointer-events: none;
}
.rh-aura {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(60% 90% at 0% 0%, rgba(251, 191, 36, 0.12), transparent 60%),
    radial-gradient(46% 70% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 60%);
}

/* Header */
.rh-head {
  position: relative;
  display: flex; align-items: center; gap: 13px;
  padding: 20px 22px 14px;
}
.rh-ic {
  width: 40px; height: 40px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 13px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.rh-h-meta { flex: 1; min-width: 0; }
.rh-h-meta h3 {
  margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text);
}
.rh-h-name { color: var(--hr-accent-gold); }
.rh-h-meta p { margin: 3px 0 0; font-size: 11.5px; color: var(--hr-text-muted); font-family: var(--hr-mono); letter-spacing: 0.2px; }
.rh-x {
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 200ms var(--hr-spring);
}
.rh-x:hover { background: rgba(255, 255, 255, 0.08); color: var(--hr-text); transform: rotate(90deg); }

/* Stepper */
.rh-steps {
  position: relative;
  display: flex; justify-content: space-between;
  gap: 6px;
  padding: 6px 26px 16px;
}
.rh-steps-rail {
  position: absolute; left: 42px; right: 42px; top: 18px; height: 2px;
  background: rgba(255, 255, 255, 0.08); border-radius: 2px; overflow: hidden;
}
.rh-steps-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, var(--hr-accent-gold), var(--hr-orange));
  border-radius: 2px;
  transition: width 420ms var(--hr-spring);
}
.rh-step {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: transparent; border: 0; cursor: pointer;
  flex: 1; min-width: 0;
}
.rh-step:disabled { cursor: default; }
.rh-step-dot {
  width: 26px; height: 26px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-surface-elevated, rgba(40,40,46,0.9));
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--hr-text-muted);
  transition: all 280ms var(--hr-spring);
}
.rh-step.on .rh-step-dot {
  background: var(--hr-accent-gold); border-color: var(--hr-accent-gold); color: #1a1a1c;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.16);
}
.rh-step.done .rh-step-dot {
  background: rgba(52, 211, 153, 0.16); border-color: rgba(52, 211, 153, 0.5); color: var(--hr-active);
}
.rh-step-lbl {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--hr-text-muted); text-transform: uppercase;
  white-space: nowrap;
}
.rh-step.on .rh-step-lbl { color: var(--hr-accent-gold); }
.rh-step.done .rh-step-lbl { color: var(--hr-text-secondary); }

/* Body */
.rh-body {
  position: relative; flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
  padding: 4px 22px 20px;
}
.rh-pane { display: flex; flex-direction: column; gap: 13px; }
.rh-pane-lead { margin: 2px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--hr-text-secondary); }
.rh-pane-lead i { color: var(--hr-text); font-style: italic; }

/* Alumni identity */
.rh-alum {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.rh-av {
  width: 42px; height: 42px; flex-shrink: 0;
  border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-gradient-rail-active, linear-gradient(135deg, #fbbf24, #f97316));
  color: #1a1a1c; font-weight: 800; font-size: 15px;
}
.rh-av.sm { width: 38px; height: 38px; font-size: 13px; border-radius: 11px; }
.rh-alum-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rh-alum-meta b { font-size: 14px; font-weight: 700; color: var(--hr-text); }
.rh-alum-sub { font-size: 11.5px; color: var(--hr-text-muted); }
.rh-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; font-weight: 700;
  padding: 4px 9px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05); color: var(--hr-text-secondary);
}
.rh-chip.warn { background: rgba(251, 146, 60, 0.14); color: var(--hr-orange); }

/* Verdict banner */
.rh-verdict {
  display: flex; align-items: flex-start; gap: 11px;
  padding: 12px 14px; border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.rh-verdict-ic {
  width: 30px; height: 30px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05); color: var(--hr-text-muted);
}
.rh-verdict-txt { display: flex; flex-direction: column; gap: 2px; }
.rh-verdict-txt b { font-size: 13px; font-weight: 700; color: var(--hr-text); }
.rh-verdict-txt small { font-size: 11.5px; line-height: 1.5; color: var(--hr-text-muted); }
.rh-verdict-txt i { font-style: italic; color: var(--hr-text-secondary); }
.rh-verdict.eligible { background: rgba(52, 211, 153, 0.08); border-color: rgba(52, 211, 153, 0.28); }
.rh-verdict.eligible .rh-verdict-ic { background: rgba(52, 211, 153, 0.16); color: var(--hr-active); }
.rh-verdict.ineligible { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.30); }
.rh-verdict.ineligible .rh-verdict-ic { background: rgba(239, 68, 68, 0.16); color: var(--hr-suspended); }
.rh-verdict.unknown { background: rgba(251, 146, 60, 0.08); border-color: rgba(251, 146, 60, 0.28); }
.rh-verdict.unknown .rh-verdict-ic { background: rgba(251, 146, 60, 0.16); color: var(--hr-orange); }

/* Fact grid */
.rh-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rh-fact {
  display: flex; flex-direction: column; gap: 4px;
  padding: 10px 12px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rh-fact.alert { border-color: rgba(251, 146, 60, 0.32); background: rgba(251, 146, 60, 0.07); }
.rh-fact-k {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--hr-text-muted);
}
.rh-fact-v { font-size: 13px; font-weight: 700; color: var(--hr-text); font-family: var(--hr-mono); }

.rh-reason-chip {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  margin: 0; font-size: 11.5px; color: var(--hr-text-secondary);
  padding: 6px 11px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06);
}
.rh-reason-chip b { color: var(--hr-text); }
.rh-note {
  display: flex; align-items: flex-start; gap: 7px;
  margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--hr-text-muted);
}
.rh-note svg { color: var(--hr-accent-gold); flex-shrink: 0; margin-top: 1px; }

/* Fields */
.rh-field { display: flex; flex-direction: column; gap: 6px; }
.rh-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rh-lbl { font-size: 11.5px; font-weight: 700; color: var(--hr-text-secondary); letter-spacing: 0.2px; }
.rh-lbl i { color: var(--hr-suspended); font-style: normal; }
.rh-help { font-size: 10.5px; color: var(--hr-text-dim); }

/* Probation toggle */
.rh-prob {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 14px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.rh-toggle {
  width: 44px; height: 26px; flex-shrink: 0;
  border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer; padding: 0; position: relative;
  transition: all 240ms var(--hr-spring);
}
.rh-toggle.on { background: var(--hr-accent-gold); border-color: var(--hr-accent-gold); }
.rh-knob {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  transition: transform 240ms var(--hr-spring);
}
.rh-toggle.on .rh-knob { transform: translateX(18px); }
.rh-prob-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rh-prob-meta b { font-size: 13px; font-weight: 700; color: var(--hr-text); }
.rh-prob-meta small { font-size: 11px; line-height: 1.45; color: var(--hr-text-muted); }
.rh-months { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
.rh-months :deep(.hr-num-shell) { width: 104px; }
.rh-months > span { font-size: 11.5px; color: var(--hr-text-muted); }

/* Info cards */
.rh-info-card {
  display: flex; align-items: flex-start; gap: 11px;
  padding: 12px 14px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.rh-info-ic {
  width: 30px; height: 30px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 9px;
}
.rh-info-ic.emerald { background: rgba(52, 211, 153, 0.14); color: var(--hr-active); }
.rh-info-ic.gold { background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); }
.rh-info-card > div { display: flex; flex-direction: column; gap: 3px; }
.rh-info-card b { font-size: 13px; font-weight: 700; color: var(--hr-text); }
.rh-info-card small { font-size: 11.5px; line-height: 1.5; color: var(--hr-text-muted); }
.rh-info-card i { font-style: normal; color: var(--hr-text-secondary); font-family: var(--hr-mono); }
.rh-journey { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.rh-journey-node {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 600; color: var(--hr-text-secondary);
  padding: 4px 9px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  animation: rh-node-in 0.4s var(--hr-spring) backwards;
  animation-delay: calc(var(--ji) * 70ms);
}
.rh-journey-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--hr-accent-gold); }
@keyframes rh-node-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* Summary (step 4) */
.rh-summary {
  border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
}
.rh-sum-hero {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 15px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.08), transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.rh-sum-hero > div { display: flex; flex-direction: column; gap: 4px; }
.rh-sum-hero b { font-size: 14px; font-weight: 700; color: var(--hr-text); }
.rh-state-to { display: inline-flex; align-items: center; gap: 7px; color: var(--hr-text-muted); }
.rh-pill {
  font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.rh-pill.old { background: rgba(255, 255, 255, 0.06); color: var(--hr-text-muted); }
.rh-pill.new { background: rgba(52, 211, 153, 0.16); color: var(--hr-active); }
.rh-sum-rows { display: flex; flex-direction: column; }
.rh-sum-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 15px; font-size: 12.5px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.rh-sum-row:first-child { border-top: 0; }
.rh-sum-row span { color: var(--hr-text-muted); }
.rh-sum-row b { color: var(--hr-text); font-weight: 600; text-align: right; }

/* Acknowledgement */
.rh-ack {
  display: flex; align-items: flex-start; gap: 10px; text-align: left;
  padding: 12px 14px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer; transition: all 200ms var(--hr-spring);
}
.rh-ack:hover { border-color: rgba(251, 191, 36, 0.3); }
.rh-ack.on { background: rgba(251, 191, 36, 0.07); border-color: var(--hr-accent-gold-border); }
.rh-ack-box {
  width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px;
  border-radius: 6px; border: 1.5px solid rgba(255, 255, 255, 0.22);
  display: inline-flex; align-items: center; justify-content: center;
  color: #1a1a1c; transition: all 200ms var(--hr-spring);
}
.rh-ack.on .rh-ack-box { background: var(--hr-accent-gold); border-color: var(--hr-accent-gold); }
.rh-ack-txt { font-size: 11.5px; line-height: 1.5; color: var(--hr-text-secondary); }

/* Footer */
.rh-actions {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 8, 10, 0.45);
}
.rh-step-count {
  flex: 1; text-align: center;
  font-size: 11px; font-weight: 600; color: var(--hr-text-dim);
  font-family: var(--hr-mono); letter-spacing: 0.4px;
}
.rh-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 16px; border-radius: 11px;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.2px;
  cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 220ms var(--hr-spring);
}
.rh-btn.ghost { background: transparent; color: var(--hr-text-secondary); }
.rh-btn.ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.rh-btn.primary {
  background: var(--hr-gradient-rail-active, linear-gradient(180deg, #fbbf24, #f97316));
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 8px 22px -8px rgba(251, 146, 60, 0.55);
}
.rh-btn.primary:hover:not(:disabled) { box-shadow: 0 12px 28px -8px rgba(251, 146, 60, 0.75), 0 0 36px rgba(251, 191, 36, 0.3); }
.rh-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

.rh-spin { animation: rh-spin 0.9s linear infinite; }
@keyframes rh-spin { to { transform: rotate(360deg); } }

/* Pane slide transitions */
.rh-slide-next-enter-active, .rh-slide-next-leave-active,
.rh-slide-prev-enter-active, .rh-slide-prev-leave-active {
  transition: opacity 240ms var(--hr-spring), transform 280ms var(--hr-spring);
}
.rh-slide-next-enter-from { opacity: 0; transform: translateX(22px); }
.rh-slide-next-leave-to   { opacity: 0; transform: translateX(-18px); }
.rh-slide-prev-enter-from { opacity: 0; transform: translateX(-22px); }
.rh-slide-prev-leave-to   { opacity: 0; transform: translateX(18px); }

/* Scrim fade */
.rh-fade-enter-active, .rh-fade-leave-active { transition: opacity 260ms var(--hr-spring); }
.rh-fade-enter-from, .rh-fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .rh-card, .rh-steps-fill, .rh-journey-node, .rh-knob, .rh-step-dot,
  .rh-slide-next-enter-active, .rh-slide-next-leave-active,
  .rh-slide-prev-enter-active, .rh-slide-prev-leave-active { animation: none !important; transition: none !important; }
}

@media (max-width: 540px) {
  .rh-row, .rh-grid { grid-template-columns: 1fr; }
  .rh-step-lbl { display: none; }
}

/* ───────────────── LIGHT THEME OVERRIDES — warm cream + amber ───────────── */
[data-theme="light"] .rh-scrim { background: rgba(40, 25, 10, 0.38); }
[data-theme="light"] .rh-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 246, 226, 0.98));
  border-color: rgba(217, 119, 6, 0.28);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 36px 100px -22px rgba(40, 25, 10, 0.3);
}
[data-theme="light"] .rh-aura {
  background:
    radial-gradient(60% 90% at 0% 0%, rgba(217, 119, 6, 0.16), transparent 60%),
    radial-gradient(46% 70% at 100% 0%, rgba(249, 115, 22, 0.12), transparent 60%);
}
[data-theme="light"] .rh-h-meta h3 { color: #1a1410; }
[data-theme="light"] .rh-h-name { color: #b45309; }
[data-theme="light"] .rh-h-meta p { color: #6b5840; }
[data-theme="light"] .rh-x {
  background: rgba(255, 250, 240, 0.62); border-color: rgba(40, 25, 10, 0.14); color: #6b5840;
}
[data-theme="light"] .rh-x:hover { background: rgba(217, 119, 6, 0.14); color: #92400e; }
[data-theme="light"] .rh-steps-rail { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .rh-step-dot {
  background: rgba(255, 250, 240, 0.9); border-color: rgba(40, 25, 10, 0.16); color: #8d7b62;
}
[data-theme="light"] .rh-step.on .rh-step-dot {
  background: #d97706; border-color: #d97706; color: #fff; box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .rh-step.done .rh-step-dot { background: rgba(4, 120, 87, 0.14); border-color: rgba(4, 120, 87, 0.4); color: #047857; }
[data-theme="light"] .rh-step-lbl { color: #8d7b62; }
[data-theme="light"] .rh-step.on .rh-step-lbl { color: #b45309; }
[data-theme="light"] .rh-step.done .rh-step-lbl { color: #6b5840; }
[data-theme="light"] .rh-pane-lead { color: #44362a; }
[data-theme="light"] .rh-pane-lead i { color: #1a1410; }
[data-theme="light"] .rh-alum,
[data-theme="light"] .rh-verdict,
[data-theme="light"] .rh-fact,
[data-theme="light"] .rh-reason-chip,
[data-theme="light"] .rh-prob,
[data-theme="light"] .rh-info-card,
[data-theme="light"] .rh-summary,
[data-theme="light"] .rh-ack {
  background: rgba(255, 250, 240, 0.66); border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .rh-alum-meta b,
[data-theme="light"] .rh-fact-v,
[data-theme="light"] .rh-verdict-txt b,
[data-theme="light"] .rh-info-card b,
[data-theme="light"] .rh-prob-meta b,
[data-theme="light"] .rh-sum-hero b,
[data-theme="light"] .rh-sum-row b,
[data-theme="light"] .rh-reason-chip b { color: #1a1410; }
[data-theme="light"] .rh-alum-sub,
[data-theme="light"] .rh-verdict-txt small,
[data-theme="light"] .rh-info-card small,
[data-theme="light"] .rh-prob-meta small,
[data-theme="light"] .rh-fact-k,
[data-theme="light"] .rh-sum-row span,
[data-theme="light"] .rh-note,
[data-theme="light"] .rh-help { color: #6b5840; }
[data-theme="light"] .rh-verdict.eligible { background: rgba(4, 120, 87, 0.08); border-color: rgba(4, 120, 87, 0.28); }
[data-theme="light"] .rh-verdict.eligible .rh-verdict-ic { background: rgba(4, 120, 87, 0.14); color: #047857; }
[data-theme="light"] .rh-verdict.ineligible { background: rgba(185, 28, 28, 0.08); border-color: rgba(185, 28, 28, 0.28); }
[data-theme="light"] .rh-verdict.ineligible .rh-verdict-ic { background: rgba(185, 28, 28, 0.14); color: #b91c1c; }
[data-theme="light"] .rh-verdict.unknown { background: rgba(194, 65, 12, 0.08); border-color: rgba(194, 65, 12, 0.26); }
[data-theme="light"] .rh-verdict.unknown .rh-verdict-ic { background: rgba(194, 65, 12, 0.14); color: #c2410c; }
[data-theme="light"] .rh-chip.warn { background: rgba(194, 65, 12, 0.14); color: #c2410c; }
[data-theme="light"] .rh-fact.alert { background: rgba(194, 65, 12, 0.08); border-color: rgba(194, 65, 12, 0.3); }
[data-theme="light"] .rh-info-ic.emerald { background: rgba(4, 120, 87, 0.14); color: #047857; }
[data-theme="light"] .rh-pill.old { background: rgba(40, 25, 10, 0.08); color: #6b5840; }
[data-theme="light"] .rh-pill.new { background: rgba(4, 120, 87, 0.14); color: #047857; }
[data-theme="light"] .rh-sum-hero { background: linear-gradient(180deg, rgba(217, 119, 6, 0.10), transparent); border-bottom-color: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .rh-sum-row { border-top-color: rgba(40, 25, 10, 0.06); }
[data-theme="light"] .rh-ack-txt { color: #44362a; }
[data-theme="light"] .rh-ack-box { border-color: rgba(40, 25, 10, 0.25); }
[data-theme="light"] .rh-ack.on .rh-ack-box { background: #d97706; border-color: #d97706; color: #fff; }
[data-theme="light"] .rh-actions { background: rgba(255, 250, 240, 0.55); border-top-color: rgba(40, 25, 10, 0.1); }
[data-theme="light"] .rh-step-count { color: #8d7b62; }
[data-theme="light"] .rh-btn { border-color: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .rh-btn.ghost { color: #6b5840; }
[data-theme="light"] .rh-btn.ghost:hover:not(:disabled) { background: rgba(217, 119, 6, 0.1); color: #92400e; }
[data-theme="light"] .rh-btn.primary {
  background: linear-gradient(180deg, #d97706, #b45309); border-color: rgba(217, 119, 6, 0.55); color: #fff;
  box-shadow: 0 8px 22px -8px rgba(217, 119, 6, 0.55);
}
</style>
