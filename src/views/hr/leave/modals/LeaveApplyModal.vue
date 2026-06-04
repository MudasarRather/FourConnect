<template>
  <Teleport to="body">
    <transition name="apw">
      <div v-if="open" class="apw-scrim" @click.self="close">
        <Motion class="apw-card" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.96 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- Ambient -->
          <div class="apw-atm" aria-hidden="true">
            <span class="orb a1" /><span class="orb a2" /><span class="orb a3" />
            <span class="grid" />
            <span class="scan" />
            <span class="perforation" />
          </div>

          <!-- ───── HEAD ─────────────────────────────────────────────── -->
          <header class="apw-head">
            <div class="apw-head-l">
              <span class="apw-eye leave-mono">
                <span class="apw-eye-dot" /> New leave request
              </span>
              <h2 class="apw-title">{{ headlineForStep(stepIndex) }}</h2>
            </div>
            <button class="apw-close" @click="close" aria-label="Close"><X :size="15" /></button>
          </header>

          <!-- ───── STEPPER RAIL ─────────────────────────────────────── -->
          <nav class="apw-stepper">
            <div class="apw-stepper-track">
              <span class="apw-stepper-fill" :style="{ width: stepperFillPct }" />
            </div>
            <button v-for="(s, i) in steps" :key="s.key"
              class="apw-step"
              :class="{ active: i === stepIndex, done: i < stepIndex }"
              :disabled="i > stepIndex"
              @click="i < stepIndex && (stepIndex = i)"
            >
              <span class="apw-step-bubble">
                <Check v-if="i < stepIndex" :size="11" />
                <span v-else class="apw-step-num leave-mono">{{ i + 1 }}</span>
              </span>
              <span class="apw-step-lbl">{{ s.label }}</span>
            </button>
          </nav>

          <!-- ───── BODY ─────────────────────────────────────────────── -->
          <main class="apw-body">
            <transition :name="`apw-flip-${flipDir}`" mode="out-in">

              <!-- STEP 1: Type -->
              <section v-if="stepIndex === 0" key="type" class="apw-step-pane">
                <h3 class="apw-h3">Pick a leave type</h3>
                <p class="apw-p">Each type has its own quota and rules. Cards highlighted in green still have balance.</p>
                <div class="type-grid">
                  <button v-for="(t, i) in LEAVE_TYPES" :key="t.key" type="button"
                    class="type-card"
                    :class="{ active: form.leave_type === t.key, 'no-bal': balanceFor(t.key) === 0 }"
                    :style="{ '--tc': t.hex, 'animation-delay': (i * 35) + 'ms' }"
                    @click="pickType(t)"
                  >
                    <span class="tc-glow" />
                    <span class="tc-ico-wrap">
                      <LeaveTypeIcon :type="t.key" :size="18" ambient />
                    </span>
                    <span class="tc-meta">
                      <span class="tc-name">{{ t.label }}</span>
                      <span v-if="balanceFor(t.key) !== null" class="tc-bal leave-mono">{{ balanceFor(t.key) }} left</span>
                      <span v-else class="tc-bal leave-mono">no policy</span>
                    </span>
                    <span class="tc-pick">
                      <Check v-if="form.leave_type === t.key" :size="11" />
                    </span>
                  </button>
                </div>
              </section>

              <!-- STEP 2: Dates — OnbField-backed pickers + animated range bar -->
              <section v-else-if="stepIndex === 1" key="dates" class="apw-step-pane">
                <h3 class="apw-h3">When?</h3>
                <p class="apw-p">Pick the date range. We'll subtract holidays / week-offs automatically based on policy.</p>

                <div class="dates-row">
                  <OnbField
                    v-model="form.from_date"
                    type="date"
                    label="From"
                    required
                    placeholder="dd / mm / yyyy"
                  />
                  <OnbField
                    v-model="form.to_date"
                    type="date"
                    label="To"
                    required
                    placeholder="dd / mm / yyyy"
                  />
                </div>

                <!-- Half-day pill switch -->
                <div class="dates-half-block" :class="{ disabled: !sameDate }">
                  <button type="button" class="half-toggle"
                    :class="{ on: form.is_half_day }"
                    :disabled="!sameDate"
                    @click="form.is_half_day = !form.is_half_day"
                  >
                    <span class="half-toggle-knob" />
                    <span class="half-toggle-track" />
                  </button>
                  <div class="half-toggle-text">
                    <strong>Half day only</strong>
                    <small>{{ sameDate ? 'Available because From and To match' : 'Set the same From and To to enable a half-day' }}</small>
                  </div>
                </div>

                <!-- Session radios — flip cards -->
                <transition name="apw-fade">
                  <div v-if="form.is_half_day && sameDate" class="dates-session">
                    <button type="button" class="session-card"
                      :class="{ active: form.which_session === 'FIRST' }"
                      @click="form.which_session = 'FIRST'"
                    >
                      <span class="session-clock"><Sunrise :size="14" /></span>
                      <div>
                        <strong>First half</strong>
                        <small>Morning session</small>
                      </div>
                    </button>
                    <button type="button" class="session-card"
                      :class="{ active: form.which_session === 'SECOND' }"
                      @click="form.which_session = 'SECOND'"
                    >
                      <span class="session-clock"><Sunset :size="14" /></span>
                      <div>
                        <strong>Second half</strong>
                        <small>Afternoon session</small>
                      </div>
                    </button>
                  </div>
                </transition>

                <!-- Net days card -->
                <div class="net-card" :class="{ 'net-card-error': blocked }">
                  <div class="net-icon">
                    <AlertTriangle v-if="blocked" :size="18" />
                    <CalendarDays v-else :size="18" />
                  </div>
                  <div class="net-content">
                    <span class="net-eye leave-mono">{{ blocked ? 'CANNOT APPLY' : 'NET DEDUCTION' }}</span>
                    <div class="net-val leave-mono">
                      <span v-if="blocked">0</span>
                      <span v-else>{{ netDays }}</span>
                      <small>{{ Number(netDays) === 1 && !blocked ? 'day' : 'days' }}</small>
                      <small v-if="previewLoading" class="net-spinner" aria-label="Calculating…" />
                    </div>
                    <div v-if="blocked" class="net-sub net-sub-error">
                      {{ blockReason || 'Selected range contains no working days. Pick a range with at least one working day.' }}
                    </div>
                    <div v-else class="net-sub">
                      will be debited from your <b>{{ typeLabel(form.leave_type) || 'leave' }}</b> balance
                      <span v-if="preview && preview.off_days > 0" class="net-sub-aux">
                        · {{ preview.off_days }} off-day{{ preview.off_days === 1 ? '' : 's' }} (week-off / holiday) excluded automatically
                      </span>
                    </div>
                  </div>
                  <span class="net-pulse" />
                </div>

                <!-- Per-day classification chip strip — visible whenever the
                     wizard has a preview, makes it crystal-clear which days
                     count as working / week-off / holiday. -->
                <transition name="apw-fade">
                  <div v-if="preview && Array.isArray(preview.breakdown) && preview.breakdown.length" class="dayclass-strip">
                    <div v-for="(d, i) in preview.breakdown.slice(0, 21)" :key="i"
                      class="dayclass-cell"
                      :data-state="d.is_holiday ? 'holiday' : d.is_week_off ? 'weekoff' : 'working'"
                      :title="dayChipTitle(d)"
                    >
                      <span class="dc-dow leave-mono">{{ dowLabel(d.on_date) }}</span>
                      <span class="dc-day leave-mono">{{ dayLabel(d.on_date) }}</span>
                      <span class="dc-marker">
                        <Check v-if="!d.is_holiday && !d.is_week_off" :size="9" />
                        <X v-else :size="9" />
                      </span>
                    </div>
                    <div v-if="preview.breakdown.length > 21" class="dayclass-more leave-mono">
                      +{{ preview.breakdown.length - 21 }}
                    </div>
                  </div>
                </transition>

                <!-- Holiday explainer — one row per exempted holiday in the
                     range so the user sees WHY a date was excluded. Without
                     this, an imported national holiday silently shrinks the
                     deduction and the admin/employee can't trace it. -->
                <transition name="apw-fade">
                  <div v-if="exemptedHolidays.length" class="holiday-explainer">
                    <div class="he-eye leave-mono">
                      <Info :size="11" /> Off-day holidays in this range (auto-excluded)
                    </div>
                    <div v-for="h in exemptedHolidays" :key="h.on_date" class="he-row">
                      <span class="he-date leave-mono">{{ fmtChipDate(h.on_date) }}</span>
                      <span class="he-name">{{ h.holiday_name || 'Holiday' }}</span>
                      <span v-if="h.holiday_type" class="he-pill" :data-type="h.holiday_type">
                        {{ holidayTypeLabel(h.holiday_type) }}
                      </span>
                      <span v-if="h.holiday_source && h.holiday_source !== 'manual'" class="he-pill he-pill-imported">
                        Imported
                      </span>
                    </div>
                  </div>
                </transition>
              </section>

              <!-- STEP 3: Reason -->
              <section v-else-if="stepIndex === 2" key="reason" class="apw-step-pane">
                <h3 class="apw-h3">Tell us why</h3>
                <p class="apw-p">Your manager and HR will see this. Be specific — it helps approval go through faster.</p>

                <div class="apw-field">
                  <span class="apw-field-label">Reason <em>*</em></span>
                  <div class="apw-field-wrap" :data-len="form.reason.length > 7 ? 'ok' : 'short'">
                    <textarea v-model.trim="form.reason" rows="5" maxlength="2000"
                      :placeholder="reasonPlaceholder"
                    />
                    <span class="apw-field-line" />
                  </div>
                  <div class="apw-field-foot">
                    <span class="leave-mono">{{ form.reason.length }}/2000</span>
                    <span v-if="form.reason.length < 8" class="apw-field-hint">Need at least 8 characters</span>
                    <span v-else class="apw-field-hint ok"><Check :size="10" /> Good to go</span>
                  </div>
                </div>

                <div class="apw-field">
                  <span class="apw-field-label">Contact during leave <em class="opt">optional</em></span>
                  <div class="apw-field-wrap">
                    <input type="text" v-model.trim="form.contact_during_leave" placeholder="Phone or email" />
                    <span class="apw-field-line" />
                  </div>
                </div>
              </section>

              <!-- STEP 4: Review -->
              <section v-else key="review" class="apw-step-pane">
                <h3 class="apw-h3">Looks good?</h3>
                <p class="apw-p">Review and submit. Your request goes to your reporting manager first, then HR.</p>

                <div class="review-card" :style="{ '--tc': typeColor(form.leave_type) }">
                  <span class="rv-rail" />
                  <header class="rv-row">
                    <span class="rv-ico"><LeaveTypeIcon :type="form.leave_type" :size="18" ambient /></span>
                    <div class="rv-meta">
                      <span class="rv-type">{{ typeLabel(form.leave_type) }}</span>
                      <span class="rv-range leave-mono">{{ fmtDate(form.from_date) }} → {{ fmtDate(form.to_date) }}{{ form.is_half_day ? ` · ${(form.which_session || '').toLowerCase()} half` : '' }}</span>
                    </div>
                    <span class="rv-days">
                      <strong>{{ netDays }}</strong>
                      <small>{{ netDays === 1 ? 'day' : 'days' }}</small>
                    </span>
                  </header>
                  <p class="rv-reason"><Quote :size="11" />{{ form.reason }}</p>
                  <div v-if="form.contact_during_leave" class="rv-contact leave-mono"><Phone :size="11" />{{ form.contact_during_leave }}</div>
                </div>

                <div class="approval-pipeline">
                  <span class="apw-field-label">Approval flow</span>
                  <LeaveStatusPipeline :status="'PENDING_MANAGER'" />
                </div>
              </section>

            </transition>
          </main>

          <!-- ───── FOOTER ───────────────────────────────────────────── -->
          <footer class="apw-foot">
            <button v-if="stepIndex > 0" class="apw-btn ghost" @click="back">
              <ChevronLeft :size="13" /><span>Back</span>
            </button>
            <span style="flex:1" />
            <span class="apw-foot-step leave-mono">Step {{ stepIndex + 1 }} / {{ steps.length }}</span>
            <button v-if="stepIndex < steps.length - 1" class="apw-btn primary"
              :class="{ armed: stepValid }"
              :disabled="!stepValid"
              @click="next"
            >
              <span>Continue</span>
              <ChevronRight :size="13" />
              <span class="apw-btn-flare" />
            </button>
            <button v-else class="apw-btn primary"
              :class="{ armed: stepValid && !submitting }"
              :disabled="!stepValid || submitting"
              @click="submit"
            >
              <Send v-if="!submitting" :size="13" />
              <span v-if="submitting" class="apw-spinner" />
              <span>{{ submitting ? 'Submitting…' : 'Submit request' }}</span>
              <span class="apw-btn-flare" />
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, ChevronLeft, ChevronRight, Send, Check, Sunrise, Sunset,
  CalendarDays, Quote, Phone, AlertTriangle, Info,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveStatusPipeline from '../components/LeaveStatusPipeline.vue'
import OnbField from '../../onboarding/components/OnbField.vue'
import { LEAVE_TYPES, createMyLeave, typeMeta, fetchLeavePreview } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  // [{leave_type, closing_balance}, ...] for "X left" hints on the type cards
  balances: { type: Array, default: () => [] },
  // Optional pre-selected leave type — used by quick-apply chips on the
  // self-service page. When set, the wizard opens directly on the dates
  // step with this type already chosen.
  defaultType: { type: String, default: null },
})
const emit = defineEmits(['close', 'submitted'])
const toast = useToast()

const todayIso = new Date().toISOString().slice(0, 10)
const steps = [
  { key: 'type',   label: 'Type' },
  { key: 'dates',  label: 'Dates' },
  { key: 'reason', label: 'Reason' },
  { key: 'review', label: 'Review' },
]
const stepIndex = ref(0)
const flipDir = ref('next')

const blank = () => ({
  leave_type: '',
  from_date: todayIso, to_date: todayIso,
  is_half_day: false, which_session: 'FIRST',
  reason: '',
  contact_during_leave: '',
  emergency_contact: '',
  attachment_id: null,
})
const form = ref(blank())
const submitting = ref(false)

watch(() => props.open, (v) => {
  if (v) {
    form.value = blank()
    if (props.defaultType) {
      form.value.leave_type = props.defaultType
      stepIndex.value = 1  // skip the "pick a type" step
    } else {
      stepIndex.value = 0
    }
  }
})

const sameDate = computed(() => form.value.from_date === form.value.to_date && !!form.value.from_date)

// ─── Live preview ─────────────────────────────────────────────────────────
// Server-authoritative breakdown — working days vs week-off vs holiday — so
// the wizard agrees with the backend and we can block submit when the range
// falls entirely on off-days. See GET /api/hr/leaves/me/preview.
const preview = ref(null)         // { working_days, total_days, has_off_day_only, holiday_names, breakdown, ... }
const previewError = ref('')
const previewLoading = ref(false)
let previewDebounce = null
let previewSeq = 0

const fetchPreview = async () => {
  // Reset prior state
  previewError.value = ''
  const f = form.value
  if (!f.leave_type || !f.from_date || !f.to_date || f.to_date < f.from_date) {
    preview.value = null
    previewLoading.value = false
    return
  }
  // half-day pickers only allowed on same-day requests
  if (f.is_half_day && f.from_date !== f.to_date) {
    preview.value = null
    return
  }
  const seq = ++previewSeq
  previewLoading.value = true
  try {
    const data = await fetchLeavePreview({
      leave_type: f.leave_type,
      from_date: f.from_date,
      to_date: f.to_date,
      is_half_day: f.is_half_day,
      which_session: f.is_half_day ? f.which_session : undefined,
    })
    if (seq !== previewSeq) return    // stale response — newer call in flight
    preview.value = data
  } catch (e) {
    if (seq !== previewSeq) return
    preview.value = null
    previewError.value = e?.response?.data?.detail || 'Could not preview these dates'
  } finally {
    if (seq === previewSeq) previewLoading.value = false
  }
}

watch(
  () => [form.value.leave_type, form.value.from_date, form.value.to_date, form.value.is_half_day, form.value.which_session],
  () => {
    clearTimeout(previewDebounce)
    previewDebounce = setTimeout(fetchPreview, 250)
  },
  { immediate: false },
)

// Fire the first preview whenever the wizard opens with both type + dates ready
watch(() => props.open, (v) => {
  if (v) {
    clearTimeout(previewDebounce)
    previewDebounce = setTimeout(fetchPreview, 100)
  } else {
    preview.value = null
    previewError.value = ''
  }
})

const workingDays = computed(() => preview.value?.working_days ?? null)
const offDayOnly  = computed(() => !!preview.value?.all_off_days)
const blocked     = computed(() => !!preview.value?.blocked)
const blockReason = computed(() => preview.value?.block_reason || '')
const holidayNames = computed(() => preview.value?.holiday_names || [])

// Displayed deduction — prefers the server total; fallback to client calendar
// diff so the card never goes blank while the first preview is in flight.
const netDays = computed(() => {
  if (preview.value) return Number(preview.value.total_days || 0)
  if (!form.value.from_date || !form.value.to_date) return 0
  if (form.value.is_half_day && sameDate.value) return 0.5
  const s = new Date(form.value.from_date); const e = new Date(form.value.to_date)
  if (e < s) return 0
  return Math.floor((e - s) / 86400000) + 1
})

const stepValid = computed(() => {
  if (stepIndex.value === 0) return !!form.value.leave_type
  if (stepIndex.value === 1) {
    if (!form.value.from_date || !form.value.to_date) return false
    // Server's verdict is authoritative — the wizard blocks Continue when the
    // server says the range is invalid (entire range off-days, or start/end
    // lands on an off-day).
    if (blocked.value) return false
    if (preview.value) return Number(preview.value.total_days || 0) > 0
    // First-open fallback (preview hasn't returned yet) — naive calendar diff
    return netDays.value > 0
  }
  if (stepIndex.value === 2) return form.value.reason.trim().length >= 8
  return true
})

const balanceFor = (key) => {
  const r = props.balances.find(b => b.leave_type === key)
  if (!r) return null
  const n = Number(r.closing_balance || r.available || 0)
  return Number.isInteger(n) ? n : n.toFixed(1)
}

const reasonPlaceholder = computed(() => {
  const t = form.value.leave_type
  if (t === 'SICK') return 'Sharing the nature of illness helps HR triage faster…'
  if (t === 'EARNED') return 'Travel, family event, recharge — give your manager a heads-up so they can plan…'
  if (t === 'MATERNITY' || t === 'PATERNITY') return 'Expected dates and supporting documents…'
  return 'Provide enough context so manager + HR can decide quickly…'
})

const typeLabel = (k) => typeMeta(k).label
const typeColor = (k) => typeMeta(k).hex || '#fbbf24'

const fmtDate = (v) => {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return v }
}
const dowLabel = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2).toUpperCase() }
  catch { return '' }
}
const dayLabel = (iso) => {
  try { return String(new Date(iso).getDate()).padStart(2, '0') }
  catch { return '' }
}
const fmtChipDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }
  catch { return iso }
}
const holidayTypeLabel = (t) => {
  switch ((t || '').toUpperCase()) {
    case 'NATIONAL': return 'National'
    case 'COMPANY':  return 'Company'
    case 'REGIONAL': return 'Regional'
    case 'RESTRICTED': return 'Restricted'
    default: return t || ''
  }
}

// Build a rich tooltip for each day-chip — gives the user a one-hover answer
// to "why is this day off?" (e.g. "Aug 25 · Milad-un-Nabi · National holiday
// (imported)" rather than just "Aug 25 — off").
const dayChipTitle = (d) => {
  if (d.is_holiday) {
    const parts = [d.holiday_name || 'Holiday']
    if (d.holiday_type) parts.push(`${holidayTypeLabel(d.holiday_type)} holiday`)
    if (d.holiday_source && d.holiday_source !== 'manual') parts.push('imported')
    return parts.join(' · ')
  }
  if (d.is_week_off) return 'Week-off (your shift\'s rest day)'
  return 'Working day — will count toward leave'
}

// Holidays inside the selected range that were excluded from the deduction.
// Drives the explainer rows below the day-chip strip.
const exemptedHolidays = computed(() => {
  const list = preview.value?.breakdown
  if (!Array.isArray(list)) return []
  return list.filter(d => d.is_holiday)
})

const headlineForStep = (i) => ({
  0: 'Choose what kind of leave',
  1: 'Set the date range',
  2: 'Share the context',
  3: 'Final review',
}[i] || 'New leave request')

const stepperFillPct = computed(() => {
  if (!steps.length) return '0%'
  // Fill goes from 0 at step 0 to 100 at last step
  const pct = (stepIndex.value / (steps.length - 1)) * 100
  return `${pct}%`
})

const pickType = (t) => { form.value.leave_type = t.key }

const back = () => { flipDir.value = 'prev'; stepIndex.value = Math.max(0, stepIndex.value - 1) }
const next = () => { flipDir.value = 'next'; stepIndex.value = Math.min(steps.length - 1, stepIndex.value + 1) }

const submit = async () => {
  submitting.value = true
  try {
    const payload = { ...form.value }
    if (!payload.is_half_day) { payload.which_session = null }
    const out = await createMyLeave(payload)
    toast.success(`Submitted · ${out.reference_no}`)
    emit('submitted', out)
    close()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to submit')
  } finally { submitting.value = false }
}

const close = () => { if (!submitting.value) emit('close') }
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════
   SCRIM
   ════════════════════════════════════════════════════════════════════════════ */
.apw-scrim {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  background:
    radial-gradient(60% 60% at 50% 30%, rgba(251, 146, 60, 0.30), transparent 65%),
    radial-gradient(60% 60% at 50% 50%, rgba(20, 14, 8, 0.65), rgba(0, 0, 0, 0.78));
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  padding: 20px;
  perspective: 1500px;
}
[data-theme="light"] .apw-scrim {
  background:
    radial-gradient(60% 60% at 50% 30%, rgba(217, 119, 6, 0.34), transparent 65%),
    radial-gradient(60% 60% at 50% 50%, rgba(40, 25, 10, 0.40), rgba(20, 14, 8, 0.55));
}
/* ════════════════════════════════════════════════════════════════════════════
   CARD SHELL
   ════════════════════════════════════════════════════════════════════════════ */
.apw-card {
  position: relative;
  width: 720px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 40px);
  border-radius: 26px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(250, 204, 21, 0.12), transparent 60%),
    radial-gradient(60% 60% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 70%),
    linear-gradient(180deg, rgba(22, 16, 10, 0.97), rgba(14, 10, 6, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow:
    0 60px 120px -40px rgba(0,0,0,0.85),
    0 0 0 1px rgba(251, 191, 36, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
}
[data-theme="light"] .apw-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(250, 204, 21, 0.18), transparent 60%),
    radial-gradient(60% 60% at 100% 0%, rgba(251, 146, 60, 0.16), transparent 70%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 244, 218, 0.98));
  border-color: rgba(180, 83, 9, 0.32);
  box-shadow:
    0 50px 100px -36px rgba(120, 53, 15, 0.40),
    0 0 0 1px rgba(180, 83, 9, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* Ambient layers */
.apw-atm { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.orb.a1 {
  width: 380px; height: 380px; top: -150px; left: -120px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55), transparent 70%);
  opacity: 0.65;
  animation: apw-orb-a 22s ease-in-out infinite;
}
.orb.a2 {
  width: 320px; height: 320px; bottom: -120px; right: -100px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 70%);
  opacity: 0.60;
  animation: apw-orb-b 26s ease-in-out infinite;
}
.orb.a3 {
  width: 220px; height: 220px; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(253, 224, 71, 0.18), transparent 70%);
  opacity: 0.5;
  animation: apw-orb-c 18s ease-in-out infinite;
}
@keyframes apw-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-22px,40px) scale(1.08); } }
@keyframes apw-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(36px,-28px) scale(1.10); } }
@keyframes apw-orb-c { 0%,100% { transform: translate(-50%,-50%) scale(0.9); } 50% { transform: translate(-50%,-50%) scale(1.12); } }

.grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 80%);
  opacity: 0.7;
}
[data-theme="light"] .grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}

/* One-shot scan line on mount */
.scan {
  position: absolute; left: 0; right: 0; height: 140px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.16), transparent);
  filter: blur(18px);
  transform: translateY(-100%);
  animation: apw-scan 1.6s 0.2s cubic-bezier(0.16,1,0.3,1) forwards;
}
@keyframes apw-scan {
  to { transform: translateY(110vh); opacity: 0; }
}

/* Perforated edge — punch-card motif on left */
.perforation {
  position: absolute; left: 12px; top: 22px; bottom: 22px; width: 4px;
  background:
    radial-gradient(circle at 50% 5px,  rgba(251, 191, 36, 0.45) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(251, 191, 36, 0.45) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(251, 191, 36, 0.45) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(251, 191, 36, 0.45) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
  opacity: 0.55;
}
[data-theme="light"] .perforation {
  background:
    radial-gradient(circle at 50% 5px,  rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
}

/* ════════════════════════════════════════════════════════════════════════════
   HEAD
   ════════════════════════════════════════════════════════════════════════════ */
.apw-head {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;
  padding: 22px 26px 12px;
}
.apw-head-l { display: flex; flex-direction: column; gap: 5px; }
.apw-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .apw-eye { color: #b45309; }
.apw-eye-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fb923c; box-shadow: 0 0 8px rgba(251, 146, 60, 0.85);
  animation: apw-eye-pulse 1.8s ease-in-out infinite;
}
@keyframes apw-eye-pulse {
  0%,100% { opacity: 0.75; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.4); }
}
.apw-title {
  margin: 0;
  font-size: 22px; font-weight: 900; letter-spacing: -0.018em;
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.15;
}
[data-theme="light"] .apw-title {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}

.apw-close {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, color .25s, border-color .25s;
  flex-shrink: 0;
}
.apw-close:hover {
  transform: rotate(90deg);
  background: rgba(251, 146, 60, 0.18);
  border-color: rgba(251, 146, 60, 0.55);
  color: #fef3c7;
}
[data-theme="light"] .apw-close {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}

/* ════════════════════════════════════════════════════════════════════════════
   STEPPER RAIL
   ════════════════════════════════════════════════════════════════════════════ */
.apw-stepper {
  position: relative; z-index: 2;
  display: flex; gap: 4px; align-items: center; justify-content: space-between;
  padding: 14px 26px 16px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .apw-stepper { border-bottom-color: rgba(180, 83, 9, 0.22); }
.apw-stepper-track {
  position: absolute; left: 26px; right: 26px; top: 50%;
  height: 2px;
  background: rgba(251, 191, 36, 0.14);
  border-radius: 999px;
  transform: translateY(-50%);
  z-index: 0;
  overflow: hidden;
}
[data-theme="light"] .apw-stepper-track { background: rgba(180, 83, 9, 0.16); }
.apw-stepper-fill {
  display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #fbbf24, #fb923c, #ea580c);
  background-size: 200% 100%;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  animation: apw-stepper-flow 3.2s linear infinite;
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.45);
}
@keyframes apw-stepper-flow { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

.apw-step {
  position: relative; z-index: 1;
  display: inline-flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--hr-text-muted);
  font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.apw-step:disabled { cursor: not-allowed; }
.apw-step-bubble {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.95), rgba(20, 14, 8, 0.95));
  border: 2px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
  font-size: 12px; font-weight: 800;
  transition: all .35s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px -6px rgba(0, 0, 0, 0.45);
}
[data-theme="light"] .apw-step-bubble {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.95), rgba(255, 244, 218, 0.95));
  border-color: rgba(180, 83, 9, 0.30);
}
.apw-step.active .apw-step-bubble {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #f59e0b);
  border-color: #fb923c;
  color: #2a1100;
  transform: scale(1.15);
  box-shadow:
    0 8px 24px -8px rgba(251, 146, 60, 0.65),
    0 0 0 4px rgba(251, 191, 36, 0.18);
}
.apw-step.done .apw-step-bubble {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-color: #f59e0b;
  color: #2a1100;
}
.apw-step.active .apw-step-lbl { color: var(--hr-text); }
.apw-step.done .apw-step-lbl   { color: #fbbf24; }
[data-theme="light"] .apw-step.done .apw-step-lbl { color: #b45309; }

/* ════════════════════════════════════════════════════════════════════════════
   BODY
   ════════════════════════════════════════════════════════════════════════════ */
.apw-body {
  position: relative; z-index: 2;
  padding: 18px 26px;
  flex: 1; overflow-y: auto; min-height: 320px;
  transform-style: preserve-3d;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.28) transparent;
}
.apw-body::-webkit-scrollbar { width: 5px; }
.apw-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.28), rgba(217, 119, 6, 0.42));
  border-radius: 3px;
}
.apw-step-pane { display: flex; flex-direction: column; gap: 14px; }
.apw-h3 {
  margin: 0;
  font-size: 18px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.014em;
}
.apw-p { margin: 0; font-size: 12.5px; color: var(--hr-text-secondary); line-height: 1.55; }

/* ════════════════════════════════════════════════════════════════════════════
   STEP 1 — TYPE GRID
   ════════════════════════════════════════════════════════════════════════════ */
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
}
.type-card {
  --tc: #fbbf24;
  position: relative;
  display: flex; align-items: center; gap: 11px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.18);
  color: var(--hr-text);
  font: inherit; cursor: pointer; text-align: left;
  overflow: hidden;
  isolation: isolate;
  opacity: 0; transform: translateY(12px);
  animation: tc-in .55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transition: border-color .25s, transform .25s var(--leave-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), box-shadow .25s;
}
@keyframes tc-in { to { opacity: 1; transform: translateY(0); } }
[data-theme="light"] .type-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.18);
}
.type-card:hover:not(.active) {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--tc) 55%, transparent);
  box-shadow: 0 14px 30px -16px color-mix(in srgb, var(--tc) 65%, transparent);
}
.type-card.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--tc) 20%, transparent), color-mix(in srgb, var(--tc) 6%, transparent));
  border-color: color-mix(in srgb, var(--tc) 70%, transparent);
  box-shadow:
    0 18px 36px -16px color-mix(in srgb, var(--tc) 75%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  transform: translateY(-2px);
}
.tc-glow {
  position: absolute; right: -50px; top: -50px;
  width: 130px; height: 130px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tc) 50%, transparent), transparent 70%);
  filter: blur(30px);
  opacity: 0.6;
  z-index: 0;
  pointer-events: none;
}
.type-card.active .tc-glow { opacity: 0.95; }
.tc-ico-wrap { flex-shrink: 0; position: relative; z-index: 1; }
.tc-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; position: relative; z-index: 1; }
.tc-name {
  font-size: 12.5px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.005em;
}
.tc-bal {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
}
.type-card.active .tc-bal { color: var(--tc); }
.tc-pick {
  display: grid; place-items: center;
  width: 20px; height: 20px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: transparent;
  transition: background .22s, border-color .22s, color .22s;
  position: relative; z-index: 1;
  flex-shrink: 0;
}
.type-card.active .tc-pick {
  background: linear-gradient(135deg, var(--tc), color-mix(in srgb, var(--tc) 50%, #fb923c));
  border-color: color-mix(in srgb, var(--tc) 75%, transparent);
  color: #2a1100;
}
[data-theme="light"] .tc-pick {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(180, 83, 9, 0.22);
}
.type-card.no-bal:not(.active) { opacity: 0.55; }

/* ════════════════════════════════════════════════════════════════════════════
   STEP 2 — DATES
   ════════════════════════════════════════════════════════════════════════════ */
.dates-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
@media (max-width: 540px) { .dates-row { grid-template-columns: 1fr; } }

.dates-half-block {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.18);
  transition: border-color .25s, background .25s, opacity .25s;
}
[data-theme="light"] .dates-half-block { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.18); }
.dates-half-block.disabled { opacity: 0.5; }
.half-toggle {
  position: relative;
  width: 42px; height: 24px;
  border: 0; padding: 0;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}
.half-toggle:disabled { cursor: not-allowed; }
.half-toggle-track {
  position: absolute; inset: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: background .35s, border-color .35s;
}
[data-theme="light"] .half-toggle-track { background: rgba(180, 83, 9, 0.16); border-color: rgba(180, 83, 9, 0.22); }
.half-toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%;
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.65);
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), background .35s;
  z-index: 2;
}
.half-toggle.on .half-toggle-track {
  background: linear-gradient(90deg, #fbbf24, #fb923c);
  border-color: rgba(251, 146, 60, 0.55);
}
.half-toggle.on .half-toggle-knob {
  transform: translateX(18px);
  background: linear-gradient(135deg, #fef3c7, #fbbf24);
}
.half-toggle-text strong {
  display: block;
  font-size: 13px; font-weight: 800; color: var(--hr-text);
}
.half-toggle-text small {
  display: block;
  font-size: 10.5px; color: var(--hr-text-muted);
  margin-top: 1px;
}

.dates-session {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.session-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(251, 191, 36, 0.20);
  color: var(--hr-text);
  font: inherit; cursor: pointer; text-align: left;
  transition: border-color .25s, background .25s, transform .25s;
}
[data-theme="light"] .session-card { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.18); }
.session-card:hover { transform: translateY(-2px); border-color: rgba(251, 146, 60, 0.55); }
.session-card.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(251, 146, 60, 0.08));
  border-color: rgba(251, 146, 60, 0.65);
  box-shadow: 0 14px 28px -14px rgba(251, 146, 60, 0.55);
}
.session-clock {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(251, 146, 60, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fbbf24;
  flex-shrink: 0;
}
.session-card.active .session-clock {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #2a1100;
  border-color: transparent;
}
.session-card strong {
  display: block;
  font-size: 13px; font-weight: 800; color: var(--hr-text);
}
.session-card small { display: block; font-size: 10.5px; color: var(--hr-text-muted); margin-top: 1px; }

/* Net days card */
.net-card {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  background:
    radial-gradient(80% 100% at 100% 0%, rgba(251, 146, 60, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.68), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.32);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .net-card {
  background:
    radial-gradient(80% 100% at 100% 0%, rgba(251, 146, 60, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.28);
}
.net-icon {
  display: grid; place-items: center;
  width: 44px; height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  color: #2a1100;
  flex-shrink: 0;
  box-shadow: 0 10px 22px -10px rgba(251, 146, 60, 0.55);
}
.net-content { flex: 1; }
.net-eye {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.net-val {
  font-size: 32px; font-weight: 900; letter-spacing: -0.025em;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1; margin: 2px 0 4px;
  font-variant-numeric: tabular-nums;
}
.net-val small { font-size: 13px; font-weight: 700; color: var(--hr-text-muted); margin-left: 4px; -webkit-text-fill-color: var(--hr-text-muted); }
.net-sub { font-size: 12px; color: var(--hr-text-secondary); }
.net-sub b { color: var(--hr-text); font-weight: 800; }
.net-pulse {
  position: absolute; right: -40px; top: -40px;
  width: 140px; height: 140px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.25), transparent 70%);
  animation: net-pulse 3.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes net-pulse {
  0%,100% { transform: scale(0.85); opacity: 0.4; }
  50%     { transform: scale(1.15); opacity: 1; }
}

/* Error variant — when the picked range is entirely on weekends/holidays */
.net-card-error {
  background:
    radial-gradient(80% 70% at 0% 0%, rgba(234, 88, 12, 0.16), transparent 55%),
    rgba(56, 16, 10, 0.55) !important;
  border-color: rgba(234, 88, 12, 0.42) !important;
}
[data-theme="light"] .net-card-error {
  background:
    radial-gradient(80% 70% at 0% 0%, rgba(234, 88, 12, 0.16), transparent 55%),
    rgba(255, 240, 232, 0.92) !important;
}
.net-card-error .net-icon {
  background: rgba(234, 88, 12, 0.24) !important;
  border-color: rgba(234, 88, 12, 0.42) !important;
  color: #ffc7a8 !important;
}
[data-theme="light"] .net-card-error .net-icon { color: #7c2d12 !important; }
.net-card-error .net-eye { color: var(--leave-rejected) !important; }
.net-card-error .net-val { color: var(--leave-rejected) !important; -webkit-text-fill-color: var(--leave-rejected) !important; }
.net-card-error .net-pulse {
  background: radial-gradient(circle, rgba(234, 88, 12, 0.30), transparent 70%);
}
.net-sub-error {
  color: var(--leave-rejected) !important;
  font-weight: 600;
}
.net-sub-aux {
  color: var(--leave-text-muted);
  font-weight: 600;
}

/* Tiny inline spinner that appears while the preview is in flight */
.net-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.25);
  border-top-color: var(--leave-brand);
  margin-left: 8px;
  vertical-align: -2px;
  animation: net-spin .8s linear infinite;
}
@keyframes net-spin { to { transform: rotate(360deg); } }

/* ─── Day classification chip strip ─── */
.dayclass-strip {
  margin-top: 12px;
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.04);
  border: 1px solid var(--leave-border-soft);
}
[data-theme="light"] .dayclass-strip { background: rgba(255, 244, 210, 0.5); border-color: rgba(180, 83, 9, 0.10); }
.dayclass-cell {
  flex: 0 0 auto;
  min-width: 42px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 8px 7px;
  border-radius: 9px;
  border: 1px solid transparent;
  font-variant-numeric: tabular-nums;
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), background .22s;
}
.dayclass-cell:hover { transform: translateY(-2px); }
.dayclass-cell[data-state="working"] {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.32);
  color: var(--w-gold-200);
}
[data-theme="light"] .dayclass-cell[data-state="working"] { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.16); border-color: rgba(180, 83, 9, 0.26); }
.dayclass-cell[data-state="weekoff"] {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--leave-text-muted);
  opacity: 0.78;
}
[data-theme="light"] .dayclass-cell[data-state="weekoff"] { background: rgba(120, 53, 15, 0.05); border-color: rgba(120, 53, 15, 0.16); }
.dayclass-cell[data-state="holiday"] {
  background: rgba(234, 88, 12, 0.10);
  border: 1px dashed rgba(234, 88, 12, 0.42);
  color: #ff8a4c;
}
[data-theme="light"] .dayclass-cell[data-state="holiday"] { color: var(--w-ember-700); background: rgba(234, 88, 12, 0.10); }

.dc-dow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.10em; opacity: 0.8; }
.dc-day { font-size: 14px; font-weight: 800; letter-spacing: -0.014em; }
.dc-marker { display: grid; place-items: center; height: 11px; }
.dc-marker svg { opacity: 0.85; }
.dayclass-more {
  align-self: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.12);
  color: var(--leave-text-muted);
  font-size: 10px; font-weight: 800; letter-spacing: 0.10em;
}

/* ─── Holiday explainer rows — close the "why was this day off?" loop ─── */
.holiday-explainer {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(234, 88, 12, 0.08);
  border: 1px solid rgba(234, 88, 12, 0.22);
  display: flex; flex-direction: column; gap: 6px;
}
[data-theme="light"] .holiday-explainer {
  background: rgba(255, 240, 232, 0.85);
  border-color: rgba(194, 65, 12, 0.24);
}
.he-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--w-ember-300, #ff8a4c);
}
[data-theme="light"] .he-eye { color: var(--w-ember-700, #8b2906); }
.he-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 4px 0 4px 4px;
  font-size: 12px;
  color: var(--leave-text);
}
.he-date {
  font-size: 11px; font-weight: 800;
  padding: 2px 8px; border-radius: 5px;
  background: rgba(234, 88, 12, 0.16);
  color: var(--w-ember-200, #ffb088);
  letter-spacing: 0.04em;
}
[data-theme="light"] .he-date { color: var(--w-ember-700, #8b2906); background: rgba(234, 88, 12, 0.16); }
.he-name { font-weight: 700; }
.he-pill {
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.10em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  border: 1px solid currentColor;
  background: transparent;
}
.he-pill[data-type="NATIONAL"]   { color: #fbbf24; }
.he-pill[data-type="COMPANY"]    { color: #fcd34d; }
.he-pill[data-type="REGIONAL"]   { color: #fb923c; }
.he-pill[data-type="RESTRICTED"] { color: #f97316; }
[data-theme="light"] .he-pill[data-type="NATIONAL"]   { color: var(--w-gold-700); }
[data-theme="light"] .he-pill[data-type="COMPANY"]    { color: var(--w-gold-700); }
[data-theme="light"] .he-pill[data-type="REGIONAL"]   { color: var(--w-orange-700); }
[data-theme="light"] .he-pill[data-type="RESTRICTED"] { color: var(--w-orange-700); }
.he-pill-imported {
  color: var(--w-ember-200, #ffb088) !important;
  background: rgba(234, 88, 12, 0.12);
  border-color: rgba(234, 88, 12, 0.36);
}
[data-theme="light"] .he-pill-imported {
  color: var(--w-ember-700, #8b2906) !important;
  background: rgba(234, 88, 12, 0.10);
  border-color: rgba(194, 65, 12, 0.30);
}

/* ════════════════════════════════════════════════════════════════════════════
   STEP 3 — REASON (custom field)
   ════════════════════════════════════════════════════════════════════════════ */
.apw-field { display: flex; flex-direction: column; gap: 6px; }
.apw-field-label {
  font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 5px;
}
.apw-field-label em {
  font-style: normal;
  color: #fbbf24;
}
.apw-field-label em.opt {
  font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
  padding: 2px 6px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
}
[data-theme="light"] .apw-field-label em.opt { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.16); }

.apw-field-wrap {
  position: relative;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color .25s, box-shadow .25s, background .25s;
}
[data-theme="light"] .apw-field-wrap { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.20); }
.apw-field-wrap:focus-within {
  border-color: rgba(251, 146, 60, 0.65);
  background: rgba(251, 191, 36, 0.10);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.08), 0 0 24px -8px rgba(251, 191, 36, 0.45);
}
.apw-field-wrap[data-len="ok"] { border-color: rgba(20, 184, 166, 0.55); }
.apw-field-wrap > input,
.apw-field-wrap > textarea {
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: 0; outline: none;
  color: var(--hr-text);
  font: inherit; font-size: 13.5px; line-height: 1.55;
  font-family: inherit;
  resize: vertical;
}
.apw-field-wrap > input::placeholder,
.apw-field-wrap > textarea::placeholder { color: var(--hr-text-muted); }
.apw-field-line {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, #fbbf24, #fb923c, #ea580c);
  transform: scaleX(0); transform-origin: left;
  transition: transform .4s cubic-bezier(0.22, 1, 0.36, 1);
}
.apw-field-wrap:focus-within .apw-field-line { transform: scaleX(1); }
.apw-field-foot {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10px; color: var(--hr-text-muted);
}
.apw-field-foot .leave-mono { letter-spacing: 0.06em; }
.apw-field-hint { display: inline-flex; align-items: center; gap: 4px; }
.apw-field-hint.ok { color: #34d399; }
[data-theme="light"] .apw-field-hint.ok { color: #047857; }

/* ════════════════════════════════════════════════════════════════════════════
   STEP 4 — REVIEW
   ════════════════════════════════════════════════════════════════════════════ */
.review-card {
  --tc: #fbbf24;
  position: relative;
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 18px 14px 22px;
  border-radius: 16px;
  background:
    radial-gradient(60% 80% at 100% 0%, color-mix(in srgb, var(--tc) 16%, transparent), transparent 70%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.80));
  border: 1px solid color-mix(in srgb, var(--tc) 38%, transparent);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .review-card {
  background:
    radial-gradient(60% 80% at 100% 0%, color-mix(in srgb, var(--tc) 18%, transparent), transparent 70%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: color-mix(in srgb, var(--tc) 42%, transparent);
}
.rv-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(180deg, var(--tc), color-mix(in srgb, var(--tc) 30%, transparent));
}
.rv-row {
  display: flex; align-items: center; gap: 12px;
}
.rv-ico { flex-shrink: 0; }
.rv-meta { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.rv-type {
  font-size: 14.5px; font-weight: 900; color: var(--hr-text); letter-spacing: -0.005em;
}
.rv-range {
  font-size: 11px; font-weight: 700; color: var(--hr-text-muted); letter-spacing: 0.04em;
}
.rv-days {
  display: inline-flex; align-items: baseline; gap: 3px;
  padding: 6px 10px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent);
}
.rv-days strong {
  font-size: 18px; font-weight: 900; color: var(--tc); letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.rv-days small { font-size: 10px; font-weight: 700; color: var(--hr-text-muted); }
[data-theme="light"] .rv-days { background: rgba(255, 250, 240, 0.7); }

.rv-reason {
  margin: 0;
  display: flex; gap: 8px; align-items: flex-start;
  font-size: 12.5px; line-height: 1.55;
  font-style: italic;
  color: var(--hr-text-secondary);
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .rv-reason { background: rgba(255, 244, 218, 0.65); border-color: rgba(180, 83, 9, 0.10); }
.rv-reason svg { color: var(--tc); flex-shrink: 0; margin-top: 3px; opacity: 0.7; }
.rv-contact {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text-muted);
}
.rv-contact svg { color: var(--tc); }

.approval-pipeline { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; }

/* Step 2 — dates */
.dates-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dates-field { display: flex; flex-direction: column; gap: 5px; }
.dates-field > span { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-text-muted); }
.dates-field > input {
  padding: 10px 12px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text); font: inherit;
}
[data-theme="light"] .dates-field > input { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.20); }
.dates-half { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--hr-text); cursor: pointer; }
.dates-session { display: flex; gap: 14px; font-size: 12.5px; color: var(--hr-text); }

.net-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 14px;
  background: var(--leave-approved-soft);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 35%, transparent);
}
.net-card > .leave-mono {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-approved);
}
.net-val { font-size: 26px; font-weight: 800; color: var(--leave-approved); letter-spacing: -0.014em; }
.net-val small { font-size: 12px; color: var(--hr-text-muted); margin-left: 4px; }
.net-sub { font-size: 11.5px; color: var(--hr-text-secondary); }
.net-sub b { color: var(--hr-text); font-weight: 800; }

/* Step 4 — review */
.review-card {
  padding: 14px 16px; border-radius: 14px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 32%, transparent);
}
.rv-row { display: flex; align-items: center; gap: 8px; }
.rv-type { flex: 1; font-size: 14px; font-weight: 800; color: var(--hr-text); }
.rv-days { font-size: 14px; font-weight: 800; color: var(--leave-approved); }
.rv-range { font-size: 11.5px; color: var(--hr-text-secondary); margin-top: 4px; }
.rv-reason { margin: 8px 0 0; font-style: italic; font-size: 12.5px; line-height: 1.55; color: var(--hr-text-secondary); }
.rv-contact { font-size: 11px; color: var(--hr-text-muted); margin-top: 6px; }
.approval-pipeline { padding-top: 6px; }

/* ════════════════════════════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════════════════════════════ */
.apw-foot {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 26px;
  border-top: 1px dashed rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .apw-foot { border-top-color: rgba(180, 83, 9, 0.22); }
.apw-foot-step {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  color: var(--hr-text-muted);
  text-transform: uppercase;
}

.apw-btn {
  position: relative;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 16px;
  border-radius: 11px;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.04em;
  border: 1px solid;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition: transform .22s var(--leave-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), background .25s, border-color .25s, color .25s, box-shadow .25s, letter-spacing .3s;
}
.apw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.apw-btn.ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(251, 191, 36, 0.22);
  color: var(--hr-text-muted);
}
.apw-btn.ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 146, 60, 0.55);
  color: var(--hr-text);
  transform: translateY(-1px);
}
[data-theme="light"] .apw-btn.ghost {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color: #6b5840;
}
[data-theme="light"] .apw-btn.ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(180, 83, 9, 0.42);
  color: #3a1f0b;
}

.apw-btn.primary {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  background-size: 200% 200%;
  border-color: rgba(251, 191, 36, 0.55);
  color: #1f1408;
  box-shadow:
    0 14px 30px -10px rgba(251, 146, 60, 0.55),
    0 0 0 1px rgba(251, 191, 36, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}
.apw-btn.primary:hover:not(:disabled) {
  background-position: 100% 0;
  transform: translateY(-2px);
  letter-spacing: 0.06em;
  box-shadow:
    0 22px 44px -12px rgba(251, 146, 60, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.apw-btn.primary.armed::after {
  content: ''; position: absolute; inset: -2px;
  border-radius: inherit;
  border: 1.5px solid rgba(251, 191, 36, 0.55);
  pointer-events: none;
  animation: apw-armed 2.6s ease-out infinite;
}
@keyframes apw-armed {
  0%   { transform: scale(1); opacity: 0.85; }
  100% { transform: scale(1.14); opacity: 0; }
}

.apw-btn-flare {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
}
.apw-btn.primary.armed .apw-btn-flare {
  animation: apw-flare 2.4s linear infinite;
}
@keyframes apw-flare {
  0%   { transform: translateX(-130%); }
  60%  { transform: translateX(130%); }
  100% { transform: translateX(130%); }
}

.apw-spinner {
  width: 12px; height: 12px;
  border: 1.5px solid currentColor; border-top-color: transparent;
  border-radius: 50%;
  animation: apw-spin 0.7s linear infinite;
}
@keyframes apw-spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════════════════════════════════════════════
   STEP TRANSITIONS
   ════════════════════════════════════════════════════════════════════════════ */
.apw-flip-next-enter-active, .apw-flip-prev-enter-active {
  transition: opacity .42s cubic-bezier(0.16, 1, 0.3, 1), transform .5s cubic-bezier(0.16, 1, 0.3, 1);
}
.apw-flip-next-leave-active, .apw-flip-prev-leave-active {
  transition: opacity .25s ease, transform .3s ease;
}
.apw-flip-next-enter-from { opacity: 0; transform: rotateY(30deg) translateX(40px); }
.apw-flip-prev-enter-from { opacity: 0; transform: rotateY(-30deg) translateX(-40px); }
.apw-flip-next-leave-to   { opacity: 0; transform: rotateY(-20deg) translateX(-30px) scale(0.98); }
.apw-flip-prev-leave-to   { opacity: 0; transform: rotateY(20deg) translateX(30px) scale(0.98); }

.apw-fade-enter-active, .apw-fade-leave-active { transition: opacity .25s, transform .35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.apw-fade-enter-from, .apw-fade-leave-to { opacity: 0; transform: translateY(-6px); }

.apw-enter-active, .apw-leave-active { transition: opacity .35s; }
.apw-enter-from, .apw-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .apw-flip-next-enter-from, .apw-flip-prev-enter-from,
  .apw-flip-next-leave-to, .apw-flip-prev-leave-to { transform: none; }
  .orb, .scan, .net-pulse, .apw-stepper-fill, .apw-btn.primary.armed::after,
  .apw-btn.primary.armed .apw-btn-flare, .type-card, .apw-eye-dot { animation: none !important; }
}
</style>
