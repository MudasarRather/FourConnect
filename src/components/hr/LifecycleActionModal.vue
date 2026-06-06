<template>
  <transition name="lc-modal">
    <div
      v-if="open && template"
      class="lc-modal-backdrop"
      @click.self="onCancel"
      @keydown.esc="onCancel"
      tabindex="-1"
    >
      <div class="lc-modal-card hr-spotlight" :class="{ 'is-wide': isPromote }" ref="cardRef">
        <div class="aurora" aria-hidden="true" />

        <!-- Header -->
        <header class="lc-modal-head" :class="`tone-${template.tone}`">
          <span class="head-icon">
            <component :is="template.icon" :size="16" />
          </span>
          <div class="head-text">
            <h4>{{ template.title }}</h4>
            <p v-if="employee">{{ employee.full_name || employee.user?.full_name || '—' }} · <span class="mono">{{ employee.employee_id }}</span></p>
          </div>
          <button class="close-x" @click="onCancel" aria-label="Close">
            <X :size="16" />
          </button>
        </header>

        <p v-if="template.desc" class="lc-modal-desc">{{ template.desc }}</p>

        <!-- Form + (promote) live salary impact -->
        <div class="lc-modal-scroll" :class="{ split: isPromote }">
        <div class="lc-modal-fields">
          <div
            v-for="f in template.fields"
            :key="f.key"
            class="modal-field"
            :class="{ full: f.full }"
          >
            <HrFieldLabel :label="f.label" :helper="f.helper || ''" :required="!!f.required" :error="!!fieldErrors[f.key]" />
            <HrDatePicker
              v-if="f.type === 'date'"
              v-model="values[f.key]"
              :min="f.min || ''"
              :max="f.max || ''"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrTextarea
              v-else-if="f.type === 'textarea'"
              v-model="values[f.key]"
              :rows="f.rows || 3"
              :placeholder="f.placeholder || ''"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrSelect
              v-else-if="f.type === 'select'"
              v-model="values[f.key]"
              :options="dynamicOptions(f)"
              :placeholder="f.placeholder || 'Select…'"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrSearchCombobox
              v-else-if="f.type === 'user-search'"
              v-model="values[f.key]"
              :search="searchUsers"
              :selected-label="values[`__${f.key}_label`] || ''"
              :placeholder="f.placeholder || 'Search users…'"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
              @change="(u) => onUserPicked(f.key, u)"
            />
            <HrNumberInput
              v-else-if="f.type === 'number'"
              v-model="values[f.key]"
              :min="f.min ?? 0"
              :step-by="f.step ?? 1000"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
            <HrRadio
              v-else-if="f.type === 'radio'"
              v-model="values[f.key]"
              :options="f.options || []"
            />
            <HrInput
              v-else
              v-model="values[f.key]"
              :placeholder="f.placeholder || ''"
              :error="!!fieldErrors[f.key]"
              :error-text="fieldErrors[f.key]"
            />
          </div>
        </div>

        <!-- Promotion: live new-salary impact (uses the payroll engine) -->
        <transition name="promo-fade">
          <aside v-if="isPromote" class="lc-impact">
            <div class="imp-eye">
              <Sparkles :size="12" /> NEW SALARY IMPACT
              <span v-if="promoStructureName" class="imp-sub">· {{ promoStructureName }} · {{ promoRegime }}</span>
            </div>

            <!-- hero take-home -->
            <div v-if="promoPreview" class="imp-hero">
              <span class="imp-hero-label">Monthly take-home</span>
              <span class="imp-hero-val" :key="promoPreview.net_pay">{{ inrFmt(promoPreview.net_pay) }}</span>
              <span v-if="promoDelta" class="imp-delta" :class="promoDelta.up ? 'up' : 'down'">
                <component :is="promoDelta.up ? ArrowUp : ArrowDown" :size="12" />
                {{ promoDelta.up ? '+' : '−' }}{{ inrFmt(Math.abs(promoDelta.diff)) }}/yr CTC · {{ promoDelta.pct >= 0 ? '+' : '' }}{{ promoDelta.pct.toFixed(1) }}%
              </span>
            </div>

            <!-- gross composition bar -->
            <template v-if="promoPreview">
              <div class="imp-bar">
                <span class="imp-bar-seg net" :style="{ flexGrow: Math.max(0.001, Number(promoPreview.net_pay)) }" />
                <span class="imp-bar-seg ded" :style="{ flexGrow: Math.max(0.001, Number(promoPreview.total_deductions)) }" />
              </div>
              <div class="imp-legend">
                <span><i class="dot net" /> Net</span>
                <span><i class="dot ded" /> Deductions</span>
                <span class="imp-legend-gross">Gross {{ inrFmt(promoPreview.gross_earnings) }}/mo</span>
              </div>
            </template>

            <p v-if="promoPreviewing" class="imp-msg"><Loader2 class="spin" :size="13" /> Computing the new structure…</p>
            <p v-else-if="promoNote" class="imp-msg warn">{{ promoNote }}</p>
            <p v-else-if="!promoPreview" class="imp-msg">Enter a new <b>Monthly CTC</b> to preview the salary split this promotion creates.</p>

            <div v-else class="imp-rows">
              <div v-for="(l, i) in promoLines.earnings" :key="'e'+l.component_code" class="imp-row" :style="{ '--i': i }">
                <span class="irl">{{ l.component_name }}<em v-if="l.calc_note"> · {{ l.calc_note }}</em></span>
                <span class="irv">{{ inrFmt(l.amount) }}</span>
              </div>
              <div v-for="(l, i) in promoLines.deductions" :key="'d'+l.component_code" class="imp-row ded" :style="{ '--i': promoLines.earnings.length + i }">
                <span class="irl">{{ l.component_name }} <em>(−)</em></span>
                <span class="irv">{{ inrFmt(l.amount) }}</span>
              </div>
            </div>

            <div v-if="promoPreview" class="imp-totals">
              <div><span>Gross</span><b>{{ inrFmt(promoPreview.gross_earnings) }}</b></div>
              <div><span>Deductions</span><b class="d">{{ inrFmt(promoPreview.total_deductions) }}</b></div>
              <div><span>Employer</span><b>{{ inrFmt(promoPreview.employer_contributions) }}</b></div>
              <div class="ctc"><span>Annual CTC</span><b>{{ inrFmt(Number(promoPreview.ctc_value) * 12) }}</b></div>
            </div>

            <p class="imp-hint"><ArrowUp :size="12" /> Confirming creates an active <b>Promotion</b> revision in Payroll → Compensation.</p>
          </aside>
        </transition>
        </div>

        <!-- Footer -->
        <footer class="lc-modal-foot">
          <button class="ghost" @click="onCancel">Cancel</button>
          <button
            class="primary"
            :class="`tone-${template.tone}`"
            :disabled="submitting"
            @click="onConfirm"
          >
            <Loader2 v-if="submitting" class="spin" :size="13" />
            <component v-else :is="template.icon" :size="13" />
            {{ template.confirmLabel || 'Confirm' }}
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import {
  X, Loader2,
  CheckCircle, ArrowUp, ArrowDown, ArrowRight, Pause, Play, Briefcase, LogOut, Archive,
  Undo2, Gauge, Sparkles,
} from 'lucide-vue-next'

import HrFieldLabel from './forms/HrFieldLabel.vue'
import HrInput from './forms/HrInput.vue'
import HrTextarea from './forms/HrTextarea.vue'
import HrSelect from './forms/HrSelect.vue'
import HrDatePicker from './forms/HrDatePicker.vue'
import HrNumberInput from './forms/HrNumberInput.vue'
import HrRadio from './forms/HrRadio.vue'
import HrSearchCombobox from './forms/HrSearchCombobox.vue'
import { useSpotlight } from '../../composables/useSpotlight'
import { API } from '@/utils/api'
import { previewStructure, fetchCurrentComp, fetchStructures, inr } from '@/composables/usePayroll'

const props = defineProps({
  open: { type: Boolean, required: true },
  action: { type: String, default: '' },
  employee: { type: Object, default: null },
  reference: { type: Object, default: () => ({ departments: [], designations: [], grades: [], locations: [] }) },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const cardRef = ref(null)
useSpotlight(cardRef)

const todayIso = () => new Date().toISOString().slice(0, 10)

// All lifecycle action templates — keep these in lockstep with backend
// schemas in app/schemas/hr/employee_lifecycle.py. Required fields mirror
// the Pydantic `Field(...)` declarations exactly.
const TEMPLATES = {
  confirm: {
    title: 'Confirm Employee',
    desc: "Convert this probationary employee to a permanent role. Confirmation date is recorded and the lifecycle state moves to ACTIVE.",
    icon: CheckCircle,
    tone: 'green',
    confirmLabel: 'Confirm Employee',
    fields: [
      { key: 'effective_date', label: 'Confirmation Date', type: 'date', helper: 'Defaults to today', required: false, full: true },
      { key: 'reason', label: 'Notes', type: 'textarea', placeholder: 'Optional — recorded in history', full: true },
    ],
  },
  'put-on-probation': {
    title: 'Place on Probation',
    desc: 'Move this ACTIVE employee onto a probation window for a performance review. Their lifecycle state becomes ON_PROBATION and a confirmation review date is set.',
    icon: Gauge,
    tone: 'orange',
    confirmLabel: 'Place on Probation',
    fields: [
      { key: 'probation_months', label: 'Probation length (months)', type: 'number', step: 1, helper: 'Defaults to 6 months', required: true },
      { key: 'effective_date', label: 'Start date', type: 'date', helper: 'Defaults to today' },
      { key: 'confirmation_date', label: 'Review / Confirmation date', type: 'date', helper: 'Optional — auto-calculated from start + months', full: true },
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'e.g. Performance review window, role transition…', full: true },
    ],
  },
  suspend: {
    title: 'Suspend Employee',
    desc: 'Suspension is reversible via Reinstate. The reason is mandatory and will be visible in audit history.',
    icon: Pause,
    tone: 'red',
    confirmLabel: 'Suspend',
    fields: [
      { key: 'reason', label: 'Reason for suspension', type: 'textarea', placeholder: 'Required — describe the cause', required: true, full: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date', helper: 'Defaults to today', full: true },
    ],
  },
  reinstate: {
    title: 'Reinstate Employee',
    desc: 'Restore this employee from Suspended back to Active.',
    icon: Play,
    tone: 'green',
    confirmLabel: 'Reinstate',
    fields: [
      { key: 'effective_date', label: 'Effective Date', type: 'date', full: true },
      { key: 'reason', label: 'Reinstatement notes', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  'give-notice': {
    title: 'Serve Notice',
    desc: 'Records the notice period and last working date. The lifecycle state moves to ON_NOTICE.',
    icon: Briefcase,
    tone: 'orange',
    confirmLabel: 'Serve Notice',
    fields: [
      { key: 'notice_period_start_date', label: 'Notice Start Date', type: 'date', required: true },
      { key: 'last_working_date', label: 'Last Working Date', type: 'date', required: true },
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'Optional — visible in history', full: true },
    ],
  },
  exit: {
    title: 'Mark as Exited',
    desc: 'Records the final exit date and closes employment. This is irreversible — use Archive instead if unsure.',
    icon: LogOut,
    tone: 'red',
    confirmLabel: 'Mark Exited',
    fields: [
      { key: 'exit_date', label: 'Exit Date', type: 'date', required: true },
      { key: 'eligible_for_rehire', label: 'Eligible for Rehire?', type: 'radio', options: [
        { value: true,  label: 'Yes' },
        { value: false, label: 'No' },
      ], full: true },
      { key: 'reason', label: 'Exit Reason', type: 'textarea', placeholder: 'Optional — recorded in history', full: true },
    ],
  },
  archive: {
    title: 'Archive Employee',
    desc: 'Archive moves the record to a read-only state. The profile remains available for audit history and can be restored later.',
    icon: Archive,
    tone: 'neutral',
    confirmLabel: 'Archive',
    fields: [
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  unarchive: {
    title: 'Restore from Archive',
    desc: 'Move this archived employee back to Active. Their previous employment data remains intact.',
    icon: Undo2,
    tone: 'gold',
    confirmLabel: 'Restore',
    fields: [
      { key: 'reason', label: 'Restoration reason', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  promote: {
    title: 'Promote Employee',
    desc: 'Update designation, grade, and pay. Annual CTC auto-recalculates from monthly × 12 if you set Monthly CTC.',
    icon: ArrowUp,
    tone: 'gold',
    confirmLabel: 'Promote',
    fields: [
      { key: 'new_designation_id', label: 'New Designation', type: 'select', dynamic: 'designations', required: true, full: true },
      { key: 'new_grade_id', label: 'New Grade', type: 'select', dynamic: 'grades' },
      { key: 'new_pay_level', label: 'New Pay Level', placeholder: 'e.g. P4' },
      { key: 'new_monthly_ctc', label: 'New Monthly CTC (₹)', type: 'number', step: 1000, full: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date' },
      { key: 'reason', label: 'Reason / Justification', type: 'textarea', full: true },
    ],
  },
  transfer: {
    title: 'Transfer Employee',
    desc: 'Move to a new department, location, or under a different reporting manager. At least one change is required.',
    icon: ArrowRight,
    tone: 'gold',
    confirmLabel: 'Transfer',
    fields: [
      { key: 'new_department_id', label: 'New Department', type: 'select', dynamic: 'departments', full: true },
      { key: 'new_work_location_id', label: 'New Work Location', type: 'select', dynamic: 'locations', full: true },
      { key: 'new_reporting_manager_id', label: 'New Reporting Manager', type: 'user-search', placeholder: 'Search by name or email…', full: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date', helper: 'Defaults to today' },
      { key: 'reason', label: 'Transfer Reason', type: 'textarea', placeholder: 'e.g. Org restructure, role move…', full: true },
    ],
  },
}

const template = computed(() => (props.action ? TEMPLATES[props.action] : null))

const values = reactive({})
const fieldErrors = reactive({})

const dynamicOptions = (f) => {
  if (f.options) return f.options
  if (!f.dynamic) return []
  const src = props.reference[f.dynamic] || []
  if (f.dynamic === 'grades') return src.map(g => ({ value: g.id, label: `${g.code} — ${g.name}` }))
  return src.map(x => ({ value: x.id, label: x.name }))
}

// Reset form when the action / employee changes
watch(
  () => [props.open, props.action, props.employee?.id],
  ([o, a]) => {
    Object.keys(values).forEach(k => delete values[k])
    Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
    if (!o || !a) return
    const tpl = TEMPLATES[a]
    if (!tpl) return
    for (const f of tpl.fields) {
      if (f.type === 'date') values[f.key] = todayIso()
      else if (f.type === 'radio' && f.options?.length) values[f.key] = f.options[0].value
      else values[f.key] = ''
    }
  },
  { immediate: true }
)

// User search for "Reporting Manager" lookup, etc.
const searchUsers = async (term) => {
  if (!term || term.length < 2) return []
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const res = await axios.get(`${API}/auth/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const t = term.toLowerCase()
    return (res.data || [])
      .filter(u => !u.is_superuser)
      .filter(u =>
        (u.full_name || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t) ||
        (u.employee_code || '').toLowerCase().includes(t)
      )
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        employee_id: u.employee_code,
        avatar_url: u.avatar_url,
      }))
  } catch {
    return []
  }
}

const onUserPicked = (key, user) => {
  values[`__${key}_label`] = user ? (user.full_name || user.email || '') : ''
}

/* ─── Promotion: live salary-structure preview for the NEW CTC ───────────────
   Uses the SAME payroll engine (previewStructure) the Compensation drawer uses,
   so what the manager sees on promote == what the activated revision will be. */
const isPromote = computed(() => props.action === 'promote')
const promoStructureId = ref(null)
const promoStructureName = ref('')
const promoRegime = ref('NEW')
const promoPreview = ref(null)
const promoPreviewing = ref(false)
const promoNote = ref('')
let promoTimer = null

const inrFmt = (v) => inr(Math.round(Number(v || 0)))

const promoDelta = computed(() => {
  const cur = Number(props.employee?.annual_ctc) || 0
  const next = (Number(values.new_monthly_ctc) || 0) * 12
  if (!cur || !next || next === cur) return null
  const diff = next - cur
  return { cur, next, diff, pct: (diff / cur) * 100, up: diff >= 0 }
})

const promoLines = computed(() => {
  const p = promoPreview.value
  if (!p) return { earnings: [], deductions: [] }
  const isEmployer = (l) => l.is_employer_cost || l.component_type === 'EMPLOYER_CONTRIBUTION'
  return {
    earnings: (p.lines || []).filter(l => ['EARNING', 'REIMBURSEMENT'].includes(l.component_type) && !isEmployer(l)),
    deductions: (p.lines || []).filter(l => ['DEDUCTION', 'STATUTORY_DEDUCTION'].includes(l.component_type) && !isEmployer(l)),
  }
})

const resolvePromoStructure = async () => {
  promoStructureId.value = null
  promoStructureName.value = ''
  promoRegime.value = String(props.employee?.tax_regime || 'NEW').toUpperCase()
  if (!props.employee?.id) return
  try {
    const c = await fetchCurrentComp(props.employee.id)
    if (c && c.structure_id) {
      promoStructureId.value = c.structure_id
      promoStructureName.value = c.structure_name || 'Salary structure'
      promoRegime.value = String(c.tax_regime || promoRegime.value).toUpperCase()
      return
    }
  } catch { /* fall through to default */ }
  if (props.employee?.salary_structure_id) { promoStructureId.value = props.employee.salary_structure_id }
  try {
    const list = (await fetchStructures({ limit: 100 })).items || []
    const def = list.find(s => s.is_default) || (promoStructureId.value && list.find(s => s.id === promoStructureId.value))
    if (def) { promoStructureId.value = promoStructureId.value || def.id; promoStructureName.value = (list.find(s => s.id === promoStructureId.value) || def).name }
  } catch { /* no list */ }
}

const runPromoPreview = async () => {
  const ctc = Number(values.new_monthly_ctc)
  promoNote.value = ''
  if (!isPromote.value || !ctc || ctc <= 0) { promoPreview.value = null; return }
  if (!promoStructureId.value) {
    promoPreview.value = null
    promoNote.value = 'No salary structure resolves for this employee — assign one in Payroll → Compensation to preview take-home.'
    return
  }
  promoPreviewing.value = true
  try {
    promoPreview.value = await previewStructure({
      structure_id: promoStructureId.value,
      monthly_ctc: ctc,
      regime: promoRegime.value,
    })
  } catch (e) {
    promoPreview.value = null
    promoNote.value = e?.response?.data?.detail || 'Could not compute take-home for this structure.'
  } finally { promoPreviewing.value = false }
}

watch(() => props.open && isPromote.value, (on) => {
  promoPreview.value = null; promoNote.value = ''
  if (on) resolvePromoStructure()
}, { immediate: true })

watch(() => values.new_monthly_ctc, () => {
  if (!isPromote.value) return
  if (promoTimer) clearTimeout(promoTimer)
  promoTimer = setTimeout(runPromoPreview, 450)
})

const validate = () => {
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  if (!template.value) return false
  for (const f of template.value.fields) {
    if (!f.required) continue
    const v = values[f.key]
    if (v === null || v === undefined || v === '') {
      fieldErrors[f.key] = 'Required'
    }
  }
  // Cross-field rules
  if (props.action === 'give-notice') {
    const s = values.notice_period_start_date
    const e = values.last_working_date
    if (s && e && new Date(e) < new Date(s)) {
      fieldErrors.last_working_date = 'Must be on or after the notice start date'
    }
  }
  if (props.action === 'transfer') {
    if (!values.new_department_id && !values.new_work_location_id && !values.new_reporting_manager_id) {
      fieldErrors.new_department_id = 'Pick at least one — department, location, or manager'
    }
  }
  return Object.keys(fieldErrors).length === 0
}

const onCancel = () => emit('close')

const onConfirm = () => {
  if (!validate()) return
  // Build payload — strip empty strings and the private __label entries
  const payload = {}
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith('__')) continue
    if (v === '' || v === null || v === undefined) continue
    payload[k] = v
  }
  emit('confirm', { action: props.action, employee: props.employee, body: payload })
}
</script>

<style scoped>
.lc-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.lc-modal-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: max-width 380ms var(--hr-spring);
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.96), rgba(18, 18, 22, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 30px 90px -20px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(0, 0, 0, 0.3);
}
.aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(70% 100% at 0% 0%, rgba(251, 191, 36, 0.16), transparent 60%),
    radial-gradient(50% 80% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 60%);
  pointer-events: none;
  animation: hr-aurora 14s ease-in-out infinite;
}

.lc-modal-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.head-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  flex-shrink: 0;
  animation: head-pop 320ms var(--hr-spring);
}
.lc-modal-head.tone-red .head-icon { background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.32); color: var(--hr-suspended); }
.lc-modal-head.tone-orange .head-icon { background: rgba(251, 146, 60, 0.12); border-color: rgba(251, 146, 60, 0.32); color: var(--hr-orange); }
.lc-modal-head.tone-green .head-icon { background: rgba(52, 211, 153, 0.12); border-color: rgba(52, 211, 153, 0.32); color: var(--hr-active); }
.lc-modal-head.tone-neutral .head-icon { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.12); color: var(--hr-text-secondary); }

@keyframes head-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); opacity: 1; }
}

.head-text { flex: 1; min-width: 0; }
.head-text h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.head-text p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--hr-text-muted);
}
.mono { font-family: var(--hr-mono); color: var(--hr-accent-gold); font-weight: 600; }

.close-x {
  width: 30px; height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.close-x:hover { background: rgba(255, 255, 255, 0.08); color: var(--hr-text); transform: rotate(90deg); }

.lc-modal-desc {
  position: relative;
  margin: 0;
  padding: 14px 22px 6px;
  font-size: 12.5px;
  color: var(--hr-text-secondary);
  line-height: 1.55;
}
/* Wide, two-column layout when promoting (form left · live impact right) */
.lc-modal-card.is-wide { max-width: 920px; }
.lc-modal-scroll { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.lc-modal-scroll.split {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  overflow: hidden; align-items: stretch;
}
.lc-modal-fields {
  position: relative;
  padding: 14px 22px 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.lc-modal-scroll.split .lc-modal-fields {
  grid-template-columns: 1fr;
  overflow-y: auto; min-height: 0;
  align-content: start;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}
.lc-modal-scroll.split .modal-field.full { grid-column: span 1; }
.modal-field { display: flex; flex-direction: column; gap: 2px; }
.modal-field.full { grid-column: span 2; }

.lc-modal-foot {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 8, 10, 0.45);
}
.ghost, .primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 220ms var(--hr-spring);
  letter-spacing: 0.2px;
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 8px 22px -8px rgba(251, 146, 60, 0.55);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(251, 146, 60, 0.75), 0 0 36px rgba(251, 191, 36, 0.32);
  transform: translateY(-1px);
}
.primary:disabled { opacity: 0.6; cursor: wait; }

.primary.tone-red {
  background: linear-gradient(180deg, #ef4444, #b91c1c);
  border-color: rgba(239, 68, 68, 0.7);
  color: #ffffff;
  box-shadow: 0 8px 22px -8px rgba(239, 68, 68, 0.55);
}
.primary.tone-red:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(239, 68, 68, 0.7), 0 0 30px rgba(239, 68, 68, 0.35);
}
.primary.tone-orange {
  background: linear-gradient(180deg, #fb923c, #ea580c);
  border-color: rgba(251, 146, 60, 0.7);
  color: #1a1a1c;
}
.primary.tone-green {
  background: linear-gradient(180deg, #34d399, #059669);
  border-color: rgba(52, 211, 153, 0.7);
  color: #0a0f0d;
}
.primary.tone-neutral {
  background: linear-gradient(180deg, #6b7280, #374151);
  border-color: rgba(156, 163, 175, 0.6);
  color: #ffffff;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ─── Promotion live salary impact (right column) ─── */
.lc-impact {
  position: relative; overflow-y: auto; min-height: 0;
  padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 11px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.08), rgba(251, 146, 60, 0.02));
}
.lc-impact::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--hr-accent-gold), transparent);
  opacity: 0.6;
}
.imp-eye { display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-accent-gold); }
.imp-eye svg { animation: imp-spark 3s ease-in-out infinite; }
.imp-sub { font-weight: 700; letter-spacing: 0.04em; color: var(--hr-text-muted); }
.imp-hero { display: flex; flex-direction: column; gap: 1px; }
.imp-hero-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--hr-text-muted); }
.imp-hero-val { font-family: var(--hr-mono); font-size: 26px; font-weight: 800; line-height: 1.05; color: var(--hr-active);
  animation: imp-pop 0.5s var(--hr-spring); }
.imp-delta { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; margin-top: 5px;
  font-size: 11px; font-weight: 700; font-family: var(--hr-mono); padding: 2px 9px; border-radius: 999px; }
.imp-delta.up { color: var(--hr-active); background: rgba(52, 211, 153, 0.14); }
.imp-delta.down { color: var(--hr-orange); background: rgba(251, 146, 60, 0.14); }
.imp-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: rgba(255, 255, 255, 0.07); margin-top: 2px; }
.imp-bar-seg { display: block; min-width: 2px; }
.imp-bar-seg.net { background: linear-gradient(90deg, #34d399, #10b981); animation: imp-grow 0.7s var(--hr-spring); transform-origin: left; }
.imp-bar-seg.ded { background: linear-gradient(90deg, #fb923c, #ea580c); }
.imp-legend { display: flex; align-items: center; gap: 14px; font-size: 10px; color: var(--hr-text-muted); }
.imp-legend .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; vertical-align: middle; }
.imp-legend .dot.net { background: #34d399; }
.imp-legend .dot.ded { background: #fb923c; }
.imp-legend-gross { margin-left: auto; font-family: var(--hr-mono); }
.imp-msg { display: flex; align-items: center; gap: 6px; margin: 6px 0; font-size: 12px; color: var(--hr-text-muted); line-height: 1.5; }
.imp-msg.warn { color: var(--hr-orange); }
.imp-msg b { color: var(--hr-text); }
.imp-rows { display: flex; flex-direction: column; gap: 5px; }
.imp-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12px;
  animation: imp-row-in 0.4s var(--hr-spring) both; animation-delay: calc(var(--i, 0) * 45ms); }
.imp-row .irl { color: var(--hr-text-secondary); min-width: 0; }
.imp-row .irl em { font-style: normal; color: var(--hr-text-muted); font-size: 10px; font-family: var(--hr-mono); }
.imp-row .irv { font-family: var(--hr-mono); color: var(--hr-text); font-weight: 600; white-space: nowrap; }
.imp-row.ded .irv { color: var(--hr-orange); }
.imp-totals { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;
  border-top: 1px dashed var(--hr-border-strong); padding-top: 12px; }
.imp-totals > div { display: flex; flex-direction: column; gap: 2px;
  background: rgba(0, 0, 0, 0.18); border-radius: 10px; padding: 8px 10px; }
.imp-totals span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hr-text-muted); }
.imp-totals b { font-family: var(--hr-mono); font-size: 13px; color: var(--hr-text); }
.imp-totals b.d { color: var(--hr-orange); }
.imp-totals .ctc { grid-column: span 2; border: 1px solid var(--hr-accent-gold-border); background: rgba(251, 191, 36, 0.09); }
.imp-totals .ctc b { color: var(--hr-accent-gold); font-size: 15px; }
.imp-hint { display: flex; gap: 6px; align-items: flex-start; margin: 2px 0 0; font-size: 10.5px; color: var(--hr-text-muted); line-height: 1.5; }
.imp-hint svg { color: var(--hr-accent-gold); flex-shrink: 0; margin-top: 1px; }
.imp-hint b { color: var(--hr-accent-gold); }
@keyframes imp-pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
@keyframes imp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes imp-row-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes imp-spark { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
.promo-fade-enter-active, .promo-fade-leave-active { transition: opacity 240ms var(--hr-spring); }
.promo-fade-enter-from, .promo-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .imp-hero-val, .imp-bar-seg.net, .imp-row, .imp-eye svg { animation: none; }
}
[data-theme="light"] .lc-impact { background: linear-gradient(180deg, rgba(245, 158, 11, 0.10), rgba(249, 115, 22, 0.03)); }
[data-theme="light"] .lc-modal-scroll.split .lc-modal-fields { border-right-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .imp-hero-val { color: #047857; }
[data-theme="light"] .imp-delta.up { color: #047857; background: rgba(4, 120, 87, 0.10); }
[data-theme="light"] .imp-bar { background: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .imp-totals > div { background: rgba(40, 25, 10, 0.04); }

/* Enter / leave */
.lc-modal-enter-active, .lc-modal-leave-active {
  transition: opacity 240ms var(--hr-spring);
}
.lc-modal-enter-active .lc-modal-card,
.lc-modal-leave-active .lc-modal-card {
  transition: transform 320ms var(--hr-spring), opacity 240ms var(--hr-spring);
}
.lc-modal-enter-from, .lc-modal-leave-to { opacity: 0; }
.lc-modal-enter-from .lc-modal-card,
.lc-modal-leave-to .lc-modal-card {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* Stack the promote split (form over impact) on narrower screens */
@media (max-width: 780px) {
  .lc-modal-scroll.split { display: block; overflow-y: auto; }
  .lc-modal-scroll.split .lc-modal-fields { overflow: visible; border-right: none; }
  .lc-impact { border-top: 1px solid rgba(255, 255, 255, 0.06); }
}
@media (max-width: 600px) {
  .lc-modal-fields { grid-template-columns: 1fr; }
  .modal-field.full { grid-column: span 1; }
}

/* ─── LIGHT THEME OVERRIDES — warm cream + amber/golden palette ─────────── */
[data-theme="light"] .lc-modal-backdrop {
  background: rgba(40, 25, 10, 0.38);
}
[data-theme="light"] .lc-modal-card {
  background: linear-gradient(180deg,
    rgba(255, 250, 240, 0.97),
    rgba(255, 246, 226, 0.97));
  border: 1px solid rgba(217, 119, 6, 0.28);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.60) inset,
    0 30px 90px -20px rgba(40, 25, 10, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.40);
}
[data-theme="light"] .aurora {
  background:
    radial-gradient(70% 100% at 0% 0%, rgba(217, 119, 6, 0.18), transparent 60%),
    radial-gradient(50% 80% at 100% 0%, rgba(249, 115, 22, 0.14), transparent 60%);
}
[data-theme="light"] .lc-modal-head { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .lc-modal-head.tone-neutral .head-icon {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .head-text h4 { color: #1a1410; }
[data-theme="light"] .head-text p { color: #6b5840; }
[data-theme="light"] .mono { color: #b45309; }
[data-theme="light"] .close-x {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .close-x:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}
[data-theme="light"] .lc-modal-desc { color: #44362a; }
[data-theme="light"] .lc-modal-foot {
  background: rgba(255, 250, 240, 0.55);
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .ghost, [data-theme="light"] .primary {
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .ghost { color: #6b5840; }
[data-theme="light"] .ghost:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.32);
  color: #92400e;
}
[data-theme="light"] .primary {
  background: linear-gradient(180deg, #d97706, #b45309);
  border-color: rgba(217, 119, 6, 0.55);
  color: #fff;
  box-shadow: 0 8px 22px -8px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .primary:hover:not(:disabled) {
  box-shadow: 0 12px 28px -8px rgba(217, 119, 6, 0.70),
              0 0 36px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .primary.tone-neutral {
  background: linear-gradient(180deg, #6b5840, #44362a);
  border-color: rgba(75, 65, 55, 0.55);
  color: #fff;
}
</style>
