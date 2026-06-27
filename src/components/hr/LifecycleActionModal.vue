<template>
  <transition name="lc-modal">
    <div
      v-if="open && template"
      class="lc-backdrop"
      @click.self="onCancel"
      @keydown.esc="onCancel"
      tabindex="-1"
    >
      <!-- ambient drifting mesh -->
      <div class="lc-mesh" aria-hidden="true" />

      <div class="lc-card hr-spotlight" :class="`tone-${template.tone}`" ref="cardRef">
        <div class="lc-aura" aria-hidden="true" />
        <div class="lc-edge" aria-hidden="true" />

        <!-- ───────── Header ───────── -->
        <header class="lc-head">
          <span class="lc-head-icon">
            <component :is="template.icon" :size="17" />
          </span>
          <div class="lc-head-text">
            <span class="lc-head-eyebrow">Lifecycle action</span>
            <h4>{{ template.title }}</h4>
          </div>
          <div v-if="employee" class="lc-head-emp">
            <span class="lc-emp-name">{{ employee.full_name || employee.user?.full_name || '—' }}</span>
            <span class="lc-emp-id mono">{{ employee.employee_id }}</span>
          </div>
          <button class="lc-close" @click="onCancel" aria-label="Close">
            <X :size="16" />
          </button>
        </header>

        <!-- ───────── Body: form (left) · briefing (right) ───────── -->
        <div class="lc-body">
          <!-- Left — the form -->
          <div class="lc-form lc-scroll">
            <p v-if="template.desc" class="lc-desc">{{ template.desc }}</p>

            <div class="lc-fields">
              <Motion
                v-for="(f, i) in template.fields"
                :key="`${action}:${f.key}`"
                as="div"
                class="lc-field"
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
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
                <HrDepartmentSelect
                  v-else-if="f.type === 'department'"
                  v-model="values[f.key]"
                  :departments="props.reference.departments || []"
                  :placeholder="f.placeholder || 'Select department'"
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
              </Motion>
            </div>
          </div>

          <!-- Right — the briefing / live impact -->
          <aside class="lc-brief lc-scroll">
            <div class="lc-brief-eye"><Sparkles :size="12" /> Action briefing</div>

            <!-- state transition -->
            <div class="lc-transition">
              <span class="lc-state from">{{ fmtState(fromState) }}</span>
              <span class="lc-tr-track" :class="`tone-${template.tone}`"><ArrowRight :size="13" /></span>
              <span v-if="toState" class="lc-state to" :class="`tone-${template.tone}`">{{ fmtState(toState) }}</span>
              <span v-else class="lc-state to keep">{{ template.change || 'Updated' }}</span>
            </div>

            <!-- promote: live salary impact (restructured into cards) -->
            <template v-if="isPromote">
              <!-- performance-review evidence (read-only) -->
              <div v-if="latestReview" class="imp-card">
                <span class="imp-card-eye"><Gauge :size="11" /> Latest performance review</span>
                <div class="imp-net">
                  <span class="imp-net-val">{{ latestReview.overall_score.toFixed(1) }} / {{ latestReview.rating_max }}</span>
                </div>
                <p class="imp-msg">{{ latestReview.period_label || latestReview.cycle }}{{ latestReview.template_name ? ' · ' + latestReview.template_name : '' }} — evidence for this decision.</p>
              </div>

              <div class="imp-eye">
                <Sparkles :size="11" /> New salary impact
                <span v-if="promoStructureName" class="imp-sub">{{ promoStructureName }} · {{ promoRegime }}</span>
              </div>

              <!-- take-home -->
              <div class="imp-card">
                <span class="imp-card-eye">Monthly take-home</span>
                <div v-if="promoPreview" class="imp-net">
                  <span class="imp-net-val" :key="promoPreview.net_pay">{{ inrFmt(promoPreview.net_pay) }}</span>
                  <span v-if="promoDelta" class="imp-delta" :class="promoDelta.up ? 'up' : 'down'">
                    <component :is="promoDelta.up ? ArrowUp : ArrowDown" :size="11" />
                    {{ promoDelta.up ? '+' : '−' }}{{ inrFmt(Math.abs(promoDelta.diff)) }}/yr · {{ promoDelta.pct >= 0 ? '+' : '' }}{{ promoDelta.pct.toFixed(1) }}%
                  </span>
                </div>
                <p v-else-if="promoPreviewing" class="imp-msg"><Loader2 class="spin" :size="13" /> Computing the new structure…</p>
                <p v-else-if="promoNote" class="imp-msg warn">{{ promoNote }}</p>
                <p v-else class="imp-msg">Enter a new <b>Monthly CTC</b> to preview the salary split.</p>

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
              </div>

              <!-- grade band -->
              <div v-if="promoBand && promoBand.status !== 'none'" class="imp-card imp-band" :class="promoBand.status">
                <span class="imp-card-eye">Grade band</span>
                <div class="imp-band-row">
                  <span class="imp-band-range">{{ promoBand.min != null ? inrFmt(promoBand.min) : '—' }}–{{ promoBand.max != null ? inrFmt(promoBand.max) : '—' }}/yr</span>
                  <span class="imp-band-pill" :class="promoBand.status">
                    {{ promoBand.status === 'below' ? 'Below band' : promoBand.status === 'above' ? 'Above band' : promoBand.status === 'ok' ? 'Within band' : '—' }}
                  </span>
                </div>
                <p v-if="promoBand.status === 'below' || promoBand.status === 'above'" class="imp-band-warn">⚠ {{ promoBand.message }}</p>
              </div>

              <!-- breakdown -->
              <div v-if="promoPreview" class="imp-card imp-breakdown">
                <span class="imp-card-eye">Breakdown</span>
                <div class="imp-rows lc-scroll">
                  <div v-for="(l, i) in promoLines.earnings" :key="'e'+l.component_code" class="imp-row" :style="{ '--i': i }">
                    <span class="irl">{{ l.component_name }}<em v-if="l.calc_note"> · {{ l.calc_note }}</em></span>
                    <span class="irv">{{ inrFmt(l.amount) }}</span>
                  </div>
                  <div v-for="(l, i) in promoLines.deductions" :key="'d'+l.component_code" class="imp-row ded" :style="{ '--i': promoLines.earnings.length + i }">
                    <span class="irl">{{ l.component_name }} <em>(−)</em></span>
                    <span class="irv">{{ inrFmt(l.amount) }}</span>
                  </div>
                </div>
              </div>

              <!-- totals -->
              <div v-if="promoPreview" class="imp-totals">
                <div><span>Gross</span><b>{{ inrFmt(promoPreview.gross_earnings) }}</b></div>
                <div><span>Deductions</span><b class="d">{{ inrFmt(promoPreview.total_deductions) }}</b></div>
                <div><span>Employer</span><b>{{ inrFmt(promoPreview.employer_contributions) }}</b></div>
                <div class="ctc"><span>Annual CTC</span><b>{{ inrFmt(Number(promoPreview.ctc_value) * 12) }}</b></div>
              </div>
            </template>

            <!-- what happens (every action) -->
            <div v-if="effects.length" class="lc-effects">
              <span class="lc-effects-eye">What happens</span>
              <ul>
                <Motion
                  v-for="(e, i) in effects"
                  :key="e"
                  as="li"
                  :initial="{ opacity: 0, x: 8 }"
                  :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.35, delay: 0.18 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
                >
                  <span class="lc-eff-tick" :class="`tone-${template.tone}`"><Check :size="11" /></span>
                  <span>{{ e }}</span>
                </Motion>
              </ul>
            </div>

            <!-- caution -->
            <div v-if="template.caution" class="lc-caution" :class="template.caution.tone">
              <AlertTriangle v-if="template.caution.tone === 'danger'" :size="13" />
              <Info v-else :size="13" />
              <span>{{ template.caution.text }}</span>
            </div>
          </aside>
        </div>

        <!-- ───────── Footer ───────── -->
        <footer class="lc-foot">
          <button class="ghost" @click="onCancel">Cancel</button>
          <Motion
            as="button"
            class="primary"
            :class="`tone-${template.tone}`"
            :disabled="submitting"
            :whileHover="submitting ? {} : { y: -2, scale: 1.02 }"
            :whileTap="submitting ? {} : { scale: 0.97 }"
            @click="onConfirm"
          >
            <Loader2 v-if="submitting" class="spin" :size="13" />
            <component v-else :is="template.icon" :size="13" />
            {{ template.confirmLabel || 'Confirm' }}
          </Motion>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import axios from 'axios'
import {
  X, Loader2, Check, Info, AlertTriangle,
  CheckCircle, ArrowUp, ArrowDown, ArrowRight, Pause, Play, Briefcase, LogOut, Archive,
  Undo2, Gauge, Sparkles, RotateCcw,
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
import HrDepartmentSelect from './forms/HrDepartmentSelect.vue'
import { payLevelForGrade, gradeCtcBand } from '@/composables/useEmployees'
import { fetchEmployeeLatestReview } from '@/composables/usePerformance'

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
//   to      → resulting lifecycle state (drives the FROM→TO briefing badge; null = no state change)
//   change  → label shown when `to` is null (role/org change, not a state move)
//   effects → the "what happens" workflow surfaced in the briefing aside
//   caution → optional tone-aware callout
const TEMPLATES = {
  confirm: {
    title: 'Confirm Employee',
    desc: "Convert this probationary employee to a permanent role. Confirmation date is recorded and the lifecycle state moves to ACTIVE.",
    icon: CheckCircle,
    tone: 'green',
    confirmLabel: 'Confirm Employee',
    to: 'ACTIVE',
    effects: ['Records the confirmation date', 'Lifecycle moves to Active (permanent)', 'Logged to employee history'],
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
    to: 'ON_PROBATION',
    effects: ['Opens a probation window', 'Lifecycle moves to On Probation', 'Sets a confirmation review date', 'Logged to employee history'],
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
    to: 'SUSPENDED',
    effects: ['Lifecycle moves to Suspended', 'Duties & access are paused', 'Reason logged to audit history'],
    caution: { tone: 'warn', text: 'Reversible — restore any time via Reinstate.' },
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
    to: 'ACTIVE',
    effects: ['Lifecycle returns to Active', 'Restores duties & access', 'Logged to employee history'],
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
    to: 'ON_NOTICE',
    effects: ['Lifecycle moves to On Notice', 'Records notice start & last working date', 'Starts the offboarding clock', 'Logged to employee history'],
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
    to: 'EXITED',
    effects: ['Lifecycle moves to Exited', 'Records the final exit date', 'Sets rehire eligibility', 'Logged to employee history'],
    caution: { tone: 'danger', text: 'Irreversible — use Archive instead if you are unsure.' },
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
    to: 'ARCHIVED',
    effects: ['Lifecycle moves to Archived (read-only)', 'Removed from active rosters', 'History stays available for audit'],
    caution: { tone: 'neutral', text: 'Restorable later from the Archived tab.' },
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
    to: 'ACTIVE',
    effects: ['Lifecycle returns to Active', 'Returns to active rosters', 'Prior employment data intact'],
    fields: [
      { key: 'reason', label: 'Restoration reason', type: 'textarea', placeholder: 'Optional', full: true },
    ],
  },
  rehire: {
    title: 'Rehire Employee',
    desc: "Bring this former employee back on a fresh tenure. Requires their exit case to be marked 'eligible for rehire'. Their record, history and original join date are preserved; onboarding re-opens.",
    icon: RotateCcw,
    tone: 'gold',
    confirmLabel: 'Rehire',
    to: 'ACTIVE',
    effects: ['Starts a fresh tenure', 'Lifecycle returns to Active', 'Re-opens onboarding', 'Preserves the original record & history'],
    fields: [
      { key: 'joining_date', label: 'New Joining Date', type: 'date', required: true, helper: 'Start of the new tenure' },
      { key: 'on_probation', label: 'Start on probation?', type: 'radio', options: [
        { value: true,  label: 'Yes' },
        { value: false, label: 'No' },
      ], full: true },
      { key: 'probation_months', label: 'Probation length (months)', type: 'number', step: 1, helper: 'If on probation — defaults to 6' },
      { key: 'designation_id', label: 'Designation', type: 'select', dynamic: 'designations', helper: 'Blank = keep prior' },
      { key: 'department_id', label: 'Department', type: 'department', helper: 'Blank = keep prior' },
      { key: 'grade_id', label: 'Grade', type: 'select', dynamic: 'grades' },
      { key: 'work_location_id', label: 'Work Location', type: 'select', dynamic: 'locations' },
      { key: 'reason', label: 'Reason / Notes', type: 'textarea', placeholder: 'e.g. Rejoining the team after a year — strong prior performance.', full: true },
    ],
  },
  promote: {
    title: 'Promote Employee',
    desc: 'Update designation, grade, and pay. Annual CTC auto-recalculates from monthly × 12 if you set Monthly CTC.',
    icon: ArrowUp,
    tone: 'gold',
    confirmLabel: 'Promote',
    to: null,
    change: 'Role & pay update',
    effects: ['Updates designation, grade & pay level', 'Creates an active Promotion revision in Payroll → Compensation', 'Recorded in employee history & audit log'],
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
    to: null,
    change: 'Org placement update',
    effects: ['Moves department, location, or reporting manager', 'Updates the org placement', 'Recorded in employee history'],
    fields: [
      { key: 'new_department_id', label: 'New Department', type: 'department', full: true },
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

// ── Briefing: state transition + workflow effects ──
const STATE_LABELS = {
  ACTIVE: 'Active', ON_PROBATION: 'On Probation', PROBATION: 'On Probation',
  SUSPENDED: 'Suspended', ON_NOTICE: 'On Notice', EXITED: 'Exited',
  ARCHIVED: 'Archived', INACTIVE: 'Inactive', PENDING: 'Pending',
}
const fmtState = (s) => STATE_LABELS[s] || (s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—')
const fromState = computed(() => props.employee?.lifecycle_state || null)
const toState = computed(() => template.value?.to || null)
const effects = computed(() => template.value?.effects || [])

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

// Auto-fill "New Pay Level" from the chosen grade's default (promote only).
// Overwrites whenever the grade changes so pay level follows the grade; the
// admin can still type a custom value afterwards.
watch(() => values.new_grade_id, (gid) => {
  if (props.action !== 'promote' || !gid) return
  const pl = payLevelForGrade(props.reference.grades, gid)
  if (pl) values.new_pay_level = pl
})

// Soft, non-blocking CTC-band check for the promotion's new grade.
const promoBand = computed(() => {
  if (!isPromote.value) return null
  const g = (props.reference.grades || []).find(x => String(x.id) === String(values.new_grade_id))
  const annual = (Number(values.new_monthly_ctc) || 0) * 12
  return gradeCtcBand(g, annual)
})

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
const latestReview = ref(null)   // performance-review evidence for the promote screen
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
  promoPreview.value = null; promoNote.value = ''; latestReview.value = null
  if (on) {
    resolvePromoStructure()
    const eid = props.employee?.id
    if (eid) {
      fetchEmployeeLatestReview(eid)
        .then(d => { latestReview.value = (d && d.overall_score != null) ? d : null })
        .catch(() => { latestReview.value = null })
    }
  }
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
/* ════════════════ Backdrop + ambient mesh ════════════════ */
.lc-backdrop {
  position: fixed; inset: 0; z-index: 1400;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
}
.lc-mesh {
  position: absolute; inset: -20%;
  pointer-events: none; opacity: 0.9;
  background:
    radial-gradient(38% 42% at 18% 22%, rgba(251, 191, 36, 0.14), transparent 60%),
    radial-gradient(36% 40% at 82% 78%, rgba(251, 146, 60, 0.12), transparent 62%),
    radial-gradient(30% 36% at 70% 18%, rgba(217, 119, 6, 0.10), transparent 60%);
  animation: lc-mesh-drift 22s ease-in-out infinite alternate;
}
@keyframes lc-mesh-drift {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  100% { transform: translate3d(2.5%, -2%, 0) scale(1.06); }
}

/* ════════════════ Card ════════════════ */
.lc-card {
  position: relative;
  width: 100%; max-width: 880px;
  max-height: 88vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.97), rgba(18, 18, 22, 0.97));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 36px 100px -24px rgba(0, 0, 0, 0.82),
    0 0 0 1px rgba(0, 0, 0, 0.3);
}
.lc-aura {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(60% 80% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 60%),
    radial-gradient(50% 70% at 100% 0%, rgba(251, 146, 60, 0.12), transparent 60%);
  animation: hr-aurora 14s ease-in-out infinite;
}
.lc-card.tone-red .lc-aura { background: radial-gradient(60% 80% at 0% 0%, rgba(248, 113, 113, 0.14), transparent 60%), radial-gradient(50% 70% at 100% 0%, rgba(239, 68, 68, 0.10), transparent 60%); }
.lc-card.tone-green .lc-aura { background: radial-gradient(60% 80% at 0% 0%, rgba(52, 211, 153, 0.13), transparent 60%), radial-gradient(50% 70% at 100% 0%, rgba(16, 185, 129, 0.10), transparent 60%); }
.lc-edge {
  position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--hr-accent-gold), transparent);
  opacity: 0.7;
}
.lc-card.tone-red .lc-edge { background: linear-gradient(90deg, transparent, #f87171, transparent); }
.lc-card.tone-green .lc-edge { background: linear-gradient(90deg, transparent, #34d399, transparent); }

/* ════════════════ Header ════════════════ */
.lc-head {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 13px;
  padding: 17px 20px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.lc-head-icon {
  width: 40px; height: 40px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 13px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  animation: lc-pop 360ms var(--hr-spring);
}
.tone-red .lc-head-icon { background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.32); color: var(--hr-suspended, #f87171); }
.tone-orange .lc-head-icon { background: rgba(251, 146, 60, 0.12); border-color: rgba(251, 146, 60, 0.32); color: var(--hr-orange); }
.tone-green .lc-head-icon { background: rgba(52, 211, 153, 0.12); border-color: rgba(52, 211, 153, 0.32); color: var(--hr-active, #34d399); }
.tone-neutral .lc-head-icon { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.12); color: var(--hr-text-secondary); }
@keyframes lc-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }

.lc-head-text { flex: 1; min-width: 0; }
.lc-head-eyebrow { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-text-muted); }
.lc-head-text h4 { margin: 1px 0 0; font-size: 16.5px; font-weight: 700; letter-spacing: -0.01em; color: var(--hr-text); }

.lc-head-emp {
  display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
  padding: 5px 11px; border-radius: 11px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0; max-width: 42%;
}
.lc-emp-name { font-size: 12px; font-weight: 600; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.lc-emp-id { font-size: 10.5px; color: var(--hr-accent-gold); font-weight: 700; }
.mono { font-family: var(--hr-mono); }

.lc-close {
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 200ms var(--hr-spring);
}
.lc-close:hover { background: rgba(255, 255, 255, 0.08); color: var(--hr-text); transform: rotate(90deg); }

/* ════════════════ Body: two-pane ════════════════ */
.lc-body {
  position: relative; z-index: 1;
  flex: 1 1 auto; min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
}
.lc-form {
  padding: 18px 22px 20px;
  overflow-y: auto; min-height: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}
.lc-desc {
  margin: 0 0 16px;
  font-size: 12.5px; line-height: 1.55;
  color: var(--hr-text-secondary);
}
.lc-fields { display: flex; flex-direction: column; gap: 14px; }
.lc-field { display: flex; flex-direction: column; gap: 7px; }
/* This form is single-column, so HrFieldLabel's reserved empty-helper line and
   bottom margin (kept for two-column grid alignment elsewhere) only create a
   dead gap between the label and its input. Collapse both here — fields that
   carry a real helper still render it. */
.lc-field :deep(.hr-field-label) { margin-bottom: 0; }
.lc-field :deep(.lbl-helper.is-placeholder) { display: none; }

/* ── Briefing aside ── */
.lc-brief {
  padding: 18px 18px 20px;
  overflow-y: auto; min-height: 0;
  display: flex; flex-direction: column; gap: 13px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0));
}
.lc-brief-eye {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--hr-accent-gold);
}
.lc-brief-eye svg { animation: lc-spark 3s ease-in-out infinite; }
@keyframes lc-spark { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }

.lc-transition {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  padding: 11px 13px; border-radius: 13px;
  background: rgba(0, 0, 0, 0.22); border: 1px solid var(--hr-border);
}
.lc-state {
  font-size: 12px; font-weight: 700;
  padding: 4px 11px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--hr-text-secondary);
}
.lc-state.to.tone-gold { background: var(--hr-accent-gold-soft); border-color: var(--hr-accent-gold-border); color: var(--hr-accent-gold); }
.lc-state.to.tone-green { background: rgba(52, 211, 153, 0.14); border-color: rgba(52, 211, 153, 0.34); color: var(--hr-active, #34d399); }
.lc-state.to.tone-orange { background: rgba(251, 146, 60, 0.14); border-color: rgba(251, 146, 60, 0.34); color: var(--hr-orange); }
.lc-state.to.tone-red { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.34); color: #f87171; }
.lc-state.to.tone-neutral { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.14); color: var(--hr-text); }
.lc-state.to.keep { background: var(--hr-accent-gold-soft); border-color: var(--hr-accent-gold-border); color: var(--hr-accent-gold); }
.lc-tr-track { display: inline-flex; align-items: center; color: var(--hr-text-muted); }
.lc-tr-track svg { animation: lc-arrow 1.6s ease-in-out infinite; }
@keyframes lc-arrow { 0%, 100% { transform: translateX(0); opacity: 0.6; } 50% { transform: translateX(3px); opacity: 1; } }

/* ── What happens (effects) ── */
.lc-effects { display: flex; flex-direction: column; gap: 8px; }
.lc-effects-eye { font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-text-muted); }
.lc-effects ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.lc-effects li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.45; color: var(--hr-text-secondary); }
.lc-eff-tick {
  width: 17px; height: 17px; flex-shrink: 0; margin-top: 1px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
}
.lc-eff-tick.tone-green { background: rgba(52, 211, 153, 0.14); color: var(--hr-active, #34d399); }
.lc-eff-tick.tone-red { background: rgba(239, 68, 68, 0.14); color: #f87171; }
.lc-eff-tick.tone-orange { background: rgba(251, 146, 60, 0.14); color: var(--hr-orange); }
.lc-eff-tick.tone-neutral { background: rgba(255, 255, 255, 0.07); color: var(--hr-text-secondary); }

/* ── Caution ── */
.lc-caution {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 11px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--hr-border); color: var(--hr-text-secondary);
}
.lc-caution svg { flex-shrink: 0; margin-top: 1px; }
.lc-caution.danger { background: rgba(239, 68, 68, 0.10); border-color: rgba(239, 68, 68, 0.32); color: #fca5a5; }
.lc-caution.danger svg { color: #f87171; }
.lc-caution.warn { background: rgba(251, 146, 60, 0.10); border-color: rgba(251, 146, 60, 0.30); color: #fdba74; }
.lc-caution.warn svg { color: var(--hr-orange); }

/* ════════════════ Promote salary impact (restructured) ════════════════ */
.imp-eye {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-accent-gold);
  margin-top: 2px;
}
.imp-sub { font-weight: 700; letter-spacing: 0.03em; color: var(--hr-text-muted); text-transform: none; }

.imp-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 13px; border-radius: 13px;
  background: rgba(0, 0, 0, 0.22); border: 1px solid var(--hr-border);
}
.imp-card-eye { font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-muted); }

.imp-net { display: flex; flex-direction: column; gap: 5px; }
.imp-net-val { font-family: var(--hr-mono); font-size: 25px; font-weight: 800; line-height: 1.05; color: var(--hr-active, #34d399); animation: imp-pop 0.5s var(--hr-spring); }
.imp-delta { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; font-size: 11px; font-weight: 700; font-family: var(--hr-mono); padding: 2px 9px; border-radius: 999px; }
.imp-delta.up { color: var(--hr-active, #34d399); background: rgba(52, 211, 153, 0.14); }
.imp-delta.down { color: var(--hr-orange); background: rgba(251, 146, 60, 0.14); }
.imp-msg { display: flex; align-items: center; gap: 6px; margin: 2px 0; font-size: 12px; color: var(--hr-text-muted); line-height: 1.5; }
.imp-msg.warn { color: var(--hr-orange); }
.imp-msg b { color: var(--hr-text); }

.imp-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: rgba(255, 255, 255, 0.07); }
.imp-bar-seg { display: block; min-width: 2px; }
.imp-bar-seg.net { background: linear-gradient(90deg, #34d399, #10b981); animation: imp-grow 0.7s var(--hr-spring); transform-origin: left; }
.imp-bar-seg.ded { background: linear-gradient(90deg, #fb923c, #ea580c); }
.imp-legend { display: flex; align-items: center; gap: 14px; font-size: 10px; color: var(--hr-text-muted); }
.imp-legend .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; vertical-align: middle; }
.imp-legend .dot.net { background: #34d399; }
.imp-legend .dot.ded { background: #fb923c; }
.imp-legend-gross { margin-left: auto; font-family: var(--hr-mono); }

.imp-band-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.imp-band-range { font-family: var(--hr-mono); font-size: 12.5px; color: var(--hr-text); font-weight: 600; }
.imp-band-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); color: var(--hr-text-muted); }
.imp-band-pill.ok { background: rgba(52, 211, 153, 0.14); color: var(--hr-active, #34d399); }
.imp-band-pill.below, .imp-band-pill.above { background: rgba(251, 146, 60, 0.16); color: var(--hr-orange); }
.imp-band-warn { font-size: 11px; color: var(--hr-orange); font-weight: 700; }
.imp-card.imp-band.below, .imp-card.imp-band.above { border-color: rgba(251, 146, 60, 0.34); }

.imp-breakdown { gap: 6px; }
.imp-rows { display: flex; flex-direction: column; gap: 5px; max-height: 180px; overflow-y: auto; padding-right: 4px; }
.imp-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12px;
  animation: imp-row-in 0.4s var(--hr-spring) both; animation-delay: calc(var(--i, 0) * 40ms); }
.imp-row .irl { color: var(--hr-text-secondary); min-width: 0; }
.imp-row .irl em { font-style: normal; color: var(--hr-text-muted); font-size: 10px; font-family: var(--hr-mono); }
.imp-row .irv { font-family: var(--hr-mono); color: var(--hr-text); font-weight: 600; white-space: nowrap; }
.imp-row.ded .irv { color: var(--hr-orange); }

.imp-totals { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.imp-totals > div { display: flex; flex-direction: column; gap: 2px; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--hr-border); border-radius: 11px; padding: 8px 10px; }
.imp-totals span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hr-text-muted); }
.imp-totals b { font-family: var(--hr-mono); font-size: 13px; color: var(--hr-text); }
.imp-totals b.d { color: var(--hr-orange); }
.imp-totals .ctc { grid-column: span 2; border-color: var(--hr-accent-gold-border); background: rgba(251, 191, 36, 0.09); }
.imp-totals .ctc b { color: var(--hr-accent-gold); font-size: 15px; }

@keyframes imp-pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
@keyframes imp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes imp-row-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }

/* ════════════════ Footer ════════════════ */
.lc-foot {
  position: relative; z-index: 1;
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 8, 10, 0.45);
}
.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 16px; border-radius: 11px;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.2px; cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 220ms var(--hr-spring), color 220ms var(--hr-spring), box-shadow 220ms var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255, 255, 255, 0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active); border-color: var(--hr-accent-gold); color: #1a1a1c;
  box-shadow: 0 8px 22px -8px rgba(251, 146, 60, 0.55);
}
.primary:hover:not(:disabled) { box-shadow: 0 12px 28px -8px rgba(251, 146, 60, 0.75), 0 0 36px rgba(251, 191, 36, 0.32); }
.primary:disabled { opacity: 0.6; cursor: wait; }
.primary.tone-red { background: linear-gradient(180deg, #ef4444, #b91c1c); border-color: rgba(239, 68, 68, 0.7); color: #fff; box-shadow: 0 8px 22px -8px rgba(239, 68, 68, 0.55); }
.primary.tone-orange { background: linear-gradient(180deg, #fb923c, #ea580c); border-color: rgba(251, 146, 60, 0.7); color: #1a1a1c; }
.primary.tone-green { background: linear-gradient(180deg, #34d399, #059669); border-color: rgba(52, 211, 153, 0.7); color: #0a0f0d; }
.primary.tone-neutral { background: linear-gradient(180deg, #6b7280, #374151); border-color: rgba(156, 163, 175, 0.6); color: #fff; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ════════════════ Custom scrollbar (matches the gold design) ════════════════ */
.lc-scroll { scrollbar-width: thin; scrollbar-color: rgba(251, 191, 36, 0.3) transparent; }
.lc-scroll::-webkit-scrollbar { width: 9px; }
.lc-scroll::-webkit-scrollbar-track { background: transparent; }
.lc-scroll::-webkit-scrollbar-thumb {
  background: rgba(251, 191, 36, 0.22);
  border-radius: 999px;
  border: 2px solid transparent; background-clip: padding-box;
}
.lc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(251, 191, 36, 0.5); background-clip: padding-box; }

/* ════════════════ Enter / leave ════════════════ */
.lc-modal-enter-active, .lc-modal-leave-active { transition: opacity 240ms var(--hr-spring); }
.lc-modal-enter-active .lc-card, .lc-modal-leave-active .lc-card { transition: transform 340ms var(--hr-spring), opacity 240ms var(--hr-spring); }
.lc-modal-enter-from, .lc-modal-leave-to { opacity: 0; }
.lc-modal-enter-from .lc-card, .lc-modal-leave-to .lc-card { opacity: 0; transform: translateY(14px) scale(0.96); }

/* ════════════════ Responsive ════════════════ */
@media (max-width: 760px) {
  .lc-card { max-width: 560px; }
  .lc-body { grid-template-columns: 1fr; }
  .lc-form { border-right: none; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
  .lc-head-emp { max-width: 38%; }
}

@media (prefers-reduced-motion: reduce) {
  .lc-mesh, .lc-aura, .lc-brief-eye svg, .lc-tr-track svg,
  .imp-net-val, .imp-bar-seg.net, .imp-row, .lc-head-icon { animation: none !important; }
}

/* ════════════════════════ LIGHT THEME ════════════════════════ */
[data-theme="light"] .lc-backdrop { background: rgba(40, 25, 10, 0.38); }
[data-theme="light"] .lc-mesh {
  background:
    radial-gradient(38% 42% at 18% 22%, rgba(217, 119, 6, 0.16), transparent 60%),
    radial-gradient(36% 40% at 82% 78%, rgba(249, 115, 22, 0.13), transparent 62%),
    radial-gradient(30% 36% at 70% 18%, rgba(180, 83, 9, 0.10), transparent 60%);
}
[data-theme="light"] .lc-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 246, 226, 0.98));
  border: 1px solid rgba(217, 119, 6, 0.26);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 36px 100px -24px rgba(40, 25, 10, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.4);
}
[data-theme="light"] .lc-head { border-bottom-color: rgba(40, 25, 10, 0.1); }
[data-theme="light"] .lc-head-eyebrow, [data-theme="light"] .lc-effects-eye, [data-theme="light"] .imp-card-eye { color: #8d7b62; }
[data-theme="light"] .lc-head-text h4, [data-theme="light"] .lc-emp-name { color: #1a1410; }
[data-theme="light"] .lc-emp-id { color: #b45309; }
[data-theme="light"] .lc-head-emp { background: rgba(40, 25, 10, 0.04); border-color: rgba(40, 25, 10, 0.1); }
[data-theme="light"] .lc-close { background: rgba(255, 250, 240, 0.62); border-color: rgba(40, 25, 10, 0.14); color: #6b5840; }
[data-theme="light"] .lc-close:hover { background: rgba(217, 119, 6, 0.14); color: #92400e; }
[data-theme="light"] .lc-form { border-right-color: rgba(40, 25, 10, 0.1); }
[data-theme="light"] .lc-desc { color: #44362a; }
[data-theme="light"] .lc-brief { background: linear-gradient(180deg, rgba(40, 25, 10, 0.03), transparent); }
[data-theme="light"] .lc-brief-eye, [data-theme="light"] .imp-eye { color: #b45309; }
[data-theme="light"] .lc-transition, [data-theme="light"] .imp-card, [data-theme="light"] .imp-totals > div { background: rgba(40, 25, 10, 0.04); border-color: rgba(40, 25, 10, 0.12); }
[data-theme="light"] .lc-state { background: rgba(40, 25, 10, 0.06); border-color: rgba(40, 25, 10, 0.12); color: #6b5840; }
[data-theme="light"] .lc-effects li { color: #44362a; }
[data-theme="light"] .lc-caution { background: rgba(40, 25, 10, 0.04); border-color: rgba(40, 25, 10, 0.12); color: #6b5840; }
[data-theme="light"] .lc-caution.danger { background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.28); color: #b91c1c; }
[data-theme="light"] .lc-caution.danger svg { color: #dc2626; }
[data-theme="light"] .lc-caution.warn { background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.3); color: #c2410c; }
[data-theme="light"] .imp-net-val { color: #047857; }
[data-theme="light"] .imp-delta.up { color: #047857; background: rgba(4, 120, 87, 0.1); }
[data-theme="light"] .imp-band-range, [data-theme="light"] .imp-totals b { color: #1a1410; }
[data-theme="light"] .imp-band-pill.ok { background: rgba(4, 120, 87, 0.12); color: #047857; }
[data-theme="light"] .imp-band-warn, [data-theme="light"] .imp-band-pill.below, [data-theme="light"] .imp-band-pill.above { color: #c2410c; }
[data-theme="light"] .imp-bar { background: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .imp-row .irl { color: #44362a; }
[data-theme="light"] .imp-row .irv { color: #1a1410; }
[data-theme="light"] .imp-totals .ctc { background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.3); }
[data-theme="light"] .imp-totals .ctc b { color: #b45309; }
[data-theme="light"] .lc-foot { background: rgba(255, 250, 240, 0.55); border-top-color: rgba(40, 25, 10, 0.1); }
[data-theme="light"] .ghost { color: #6b5840; border-color: rgba(40, 25, 10, 0.14); }
[data-theme="light"] .ghost:hover { background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.32); color: #92400e; }
[data-theme="light"] .primary { background: linear-gradient(180deg, #d97706, #b45309); border-color: rgba(217, 119, 6, 0.55); color: #fff; box-shadow: 0 8px 22px -8px rgba(217, 119, 6, 0.55); }
[data-theme="light"] .primary.tone-neutral { background: linear-gradient(180deg, #6b5840, #44362a); color: #fff; }
[data-theme="light"] .lc-scroll { scrollbar-color: rgba(217, 119, 6, 0.35) transparent; }
[data-theme="light"] .lc-scroll::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.28); }
[data-theme="light"] .lc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(217, 119, 6, 0.55); }
</style>
