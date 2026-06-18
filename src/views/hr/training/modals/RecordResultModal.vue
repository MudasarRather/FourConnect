<template>
  <TrnModal :open="open" wide title="Record result"
    :subtitle="assessment ? assessment.title : 'Log a score against this assessment'" :icon="ClipboardPen" @close="$emit('close')">
    <div class="rr-layout">
      <!-- form -->
      <div class="rr-form">
        <Motion as="div" class="rr-ctx"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.04 }">
          <span class="rr-ctx-ic"><component :is="typeIcon" :size="15" /></span>
          <div class="rr-ctx-txt">
            <span class="rr-ctx-prog">{{ assessment?.program_name || 'Untitled program' }}</span>
            <span class="rr-ctx-sub trn-mono">{{ assessment?.assessment_type }} · pass {{ num(assessment?.pass_score) }}/{{ num(assessment?.max_score) }}</span>
          </div>
        </Motion>

        <Motion as="div"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.1 }">
          <TrnSelect v-model="form.employee_id" label="Employee" required searchable
            search-placeholder="Search employees…" :options="employeeOptions"
            :placeholder="loadingEmployees ? 'Loading employees…' : (employeeOptions.length ? 'Select an employee…' : 'No employees found')" />
        </Motion>

        <Motion as="div"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.14 }">
          <TrnSelect v-model="form.assignment_id" label="Linked enrolment" :options="assignmentOptions"
            :placeholder="assignmentPlaceholder" :disabled="!form.employee_id" />
          <span class="rr-help">Optional — pick this program's enrolment to auto-complete it on a pass.</span>
        </Motion>

        <!-- prior attempts -->
        <Presence>
          <Motion v-if="form.employee_id" as="div" class="rr-attempts"
            :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
            :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
            <span class="rr-attempts-l"><History :size="13" /> Attempt <b>#{{ attemptNumber }}</b></span>
            <span v-if="bestPrior != null" class="rr-attempts-best">prev best {{ bestPrior }}</span>
            <span class="rr-attempts-r" :class="{ warn: attemptsLeft !== null && attemptsLeft <= 0 }">
              {{ attemptsLeft === null ? 'unlimited attempts' : (attemptsLeft <= 0 ? 'no attempts left' : `${attemptsLeft} left`) }}
            </span>
          </Motion>
        </Presence>

        <Motion as="div"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.18 }">
          <label class="rr-score-lab">Score<i>*</i></label>
          <div class="rr-score-row">
            <input class="rr-score-in" type="number" inputmode="decimal" :max="num(assessment?.max_score)" min="0"
              v-model="scoreModel" placeholder="0" @focus="$event.target.select()" />
            <span class="rr-score-of trn-mono">/ {{ num(assessment?.max_score) }}</span>
            <div class="rr-score-stepper">
              <button type="button" @click="bump(5)">+5</button>
              <button type="button" @click="bump(-5)">−5</button>
            </div>
          </div>
        </Motion>
      </div>

      <!-- live scorecard -->
      <aside class="rr-card" :class="verdict">
        <span class="rr-card-aura" aria-hidden="true" />
        <span class="rr-card-eyebrow"><Sparkles :size="12" /> Live verdict</span>
        <div class="rr-gauge">
          <svg :viewBox="`0 0 ${SZ} ${SZ}`" aria-hidden="true">
            <path class="rr-g-track" :d="arc(0, 1)" fill="none" :stroke-width="GW" stroke-linecap="round" />
            <path class="rr-g-fill" :d="arc(0, 1)" fill="none" :stroke-width="GW" stroke-linecap="round"
              :stroke-dasharray="ARC" :stroke-dashoffset="ARC * (1 - scoreFrac)" />
            <line class="rr-g-passmark" :x1="passMark.x1" :y1="passMark.y1" :x2="passMark.x2" :y2="passMark.y2" />
          </svg>
          <div class="rr-gauge-c">
            <span class="rr-gauge-val">{{ scoreDisplay }}</span>
            <span class="rr-gauge-of">/ {{ num(assessment?.max_score) }}</span>
          </div>
        </div>
        <Presence>
          <Motion :key="verdict" as="div" class="rr-stamp" :class="verdict"
            :initial="{ opacity: 0, scale: 0.6, rotate: -8 }" :animate="{ opacity: 1, scale: 1, rotate: verdict === 'none' ? 0 : -5 }"
            :transition="{ type: 'spring', stiffness: 320, damping: 16 }">
            <component :is="verdict === 'pass' ? CheckCircle2 : (verdict === 'fail' ? XCircle : MinusCircle)" :size="16" />
            {{ verdictLabel }}
          </Motion>
        </Presence>
        <Presence>
          <Motion :key="nextEffectKey" as="p" class="rr-next"
            :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.26 }">
            <component :is="nextIcon" :size="13" /> <span>{{ nextEffect }}</span>
          </Motion>
        </Presence>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="trn-btn rr-go" :class="verdict === 'fail' ? 'is-fail' : 'is-pass'"
        :disabled="!canSave || saving" :whileHover="canSave && !saving ? { y: -2 } : {}" :whileTap="canSave && !saving ? { scale: 0.97 } : {}" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><ClipboardPen v-else :size="15" /> Record result
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ClipboardPen, Loader, Sparkles, CheckCircle2, XCircle, MinusCircle, History,
  ListChecks, ScrollText, Wrench, MessagesSquare, GraduationCap, Award, AlertTriangle, FileText,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import TrnModal from '../components/TrnModal.vue'
import TrnSelect from '../components/TrnSelect.vue'
import { recordAssessmentResult, fetchTrainingAssignments, fetchAssessmentResults } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  assessment: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)

const TYPE_ICON = { QUIZ: ListChecks, EXAM: ScrollText, PRACTICAL: Wrench, SURVEY: MessagesSquare }
const typeIcon = computed(() => TYPE_ICON[props.assessment?.assessment_type] || ListChecks)
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : (v ?? 0) }

const employees = ref([])
const loadingEmployees = ref(false)
const assignments = ref([])
const loadingAssignments = ref(false)
const priorAttempts = ref([])

const blank = () => ({ employee_id: '', assignment_id: '', score: null })
const form = ref(blank())

const scoreModel = computed({
  get: () => (form.value.score === null || form.value.score === undefined ? '' : form.value.score),
  set: (v) => { form.value.score = v === '' || v === null ? null : Number(v) },
})
const bump = (d) => {
  const max = Number(props.assessment?.max_score) || 100
  const cur = Number(form.value.score) || 0
  form.value.score = Math.max(0, Math.min(max, cur + d))
}

const employeeOptions = computed(() => (employees.value || []).map(e => ({
  value: e.id, label: e.full_name || e.name || e.employee_id || 'Unnamed', hint: e.employee_id || e.employee_code || '',
})))
const assignmentOptions = computed(() => {
  const progId = props.assessment?.program_id
  const rows = (assignments.value || []).filter(a => !progId || a.program_id === progId)
  const opts = [{ value: '', label: 'None — score only' }]
  for (const a of rows) {
    const status = (a.status || '').replace(/_/g, ' ').toLowerCase()
    opts.push({ value: a.id, label: status ? `${a.program_name || 'Program'} · ${status}` : (a.program_name || 'Program') })
  }
  return opts
})
const assignmentPlaceholder = computed(() => {
  if (!form.value.employee_id) return 'Pick an employee first…'
  if (loadingAssignments.value) return 'Loading enrolments…'
  return 'None — score only'
})

// ── attempts ─────────────────────────────────────────────────────────────────
const attemptNumber = computed(() => priorAttempts.value.length + 1)
const attemptsLeft = computed(() => {
  const max = props.assessment?.max_attempts
  if (max == null) return null
  return Math.max(0, max - priorAttempts.value.length)
})
const bestPrior = computed(() => {
  const scored = priorAttempts.value.filter(r => r.score != null)
  if (!scored.length) return null
  return Math.max(...scored.map(r => Number(r.score)))
})

// ── verdict + gauge ──────────────────────────────────────────────────────────
const hasScore = computed(() => form.value.score !== null && form.value.score !== undefined && form.value.score !== '')
const verdict = computed(() => {
  if (!hasScore.value) return 'none'
  return Number(form.value.score) >= Number(props.assessment?.pass_score ?? 0) ? 'pass' : 'fail'
})
const verdictLabel = computed(() => ({ pass: 'PASS', fail: 'FAIL', none: 'Enter a score' }[verdict.value]))
const scoreDisplay = computed(() => hasScore.value ? num(form.value.score) : '—')
const scoreFrac = computed(() => {
  const max = Number(props.assessment?.max_score) || 0
  if (!max || !hasScore.value) return 0
  return Math.max(0, Math.min(1, Number(form.value.score) / max))
})

const nextEffectKey = computed(() => `${verdict.value}-${!!form.value.assignment_id}-${attemptsLeft.value}`)
const nextEffect = computed(() => {
  if (!hasScore.value) return 'Enter a score to preview the outcome.'
  if (!form.value.assignment_id) return 'Records a standalone score — no enrolment is changed.'
  if (verdict.value === 'pass') return 'Completes the linked enrolment and mints its certificate (if the program awards one).'
  if (attemptsLeft.value !== null && attemptsLeft.value <= 1) return 'Final attempt — marks the linked enrolment as failed.'
  return 'Logs a failed attempt; the enrolment stays open for re-attempt.'
})
const nextIcon = computed(() => {
  if (!hasScore.value) return FileText
  if (verdict.value === 'pass' && form.value.assignment_id) return Award
  if (verdict.value === 'pass') return GraduationCap
  return AlertTriangle
})

const canSave = computed(() => !!form.value.employee_id && hasScore.value && !(attemptsLeft.value !== null && attemptsLeft.value <= 0))

// ── data loaders ─────────────────────────────────────────────────────────────
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
  } finally { loadingEmployees.value = false }
}
const loadAssignments = async (employeeId) => {
  assignments.value = []
  if (!employeeId) return
  loadingAssignments.value = true
  try { assignments.value = await fetchTrainingAssignments({ employee_id: employeeId }) || [] }
  catch { /* select falls back to None */ }
  finally { loadingAssignments.value = false }
}
const loadPrior = async (employeeId) => {
  priorAttempts.value = []
  if (!employeeId || !props.assessment) return
  try { priorAttempts.value = await fetchAssessmentResults({ assessment_id: props.assessment.id, employee_id: employeeId }) || [] }
  catch { priorAttempts.value = [] }
}

watch(() => props.open, (o) => {
  if (o) { form.value = blank(); assignments.value = []; priorAttempts.value = []; loadEmployees() }
})
watch(() => form.value.employee_id, (id) => {
  form.value.assignment_id = ''
  loadAssignments(id)
  loadPrior(id)
})

const save = async () => {
  if (!canSave.value || !props.assessment) return
  saving.value = true
  try {
    const payload = { assessment_id: props.assessment.id, employee_id: form.value.employee_id, score: Number(form.value.score) }
    if (form.value.assignment_id) payload.assignment_id = form.value.assignment_id
    await recordAssessmentResult(payload)
    toast.success(verdict.value === 'pass'
      ? (form.value.assignment_id ? 'Result recorded — enrolment marked complete' : 'Result recorded — PASS')
      : 'Result recorded')
    emit('saved'); emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not record result')
  } finally { saving.value = false }
}

// ── gauge geometry (270° arc) ──
const SZ = 168, C = SZ / 2, GW = 13
const R = C - GW / 2 - 8
const START = 135, SWEEP = 270
const rd = (d) => (d * Math.PI) / 180
const pt = (deg, r = R) => ({ x: C + r * Math.cos(rd(deg)), y: C + r * Math.sin(rd(deg)) })
const ARC = (2 * Math.PI * R) * (SWEEP / 360)
const arc = () => {
  const a = pt(START), b = pt(START + SWEEP)
  return `M ${a.x} ${a.y} A ${R} ${R} 0 1 1 ${b.x} ${b.y}`
}
const passMark = computed(() => {
  const max = Number(props.assessment?.max_score) || 1
  const pass = Number(props.assessment?.pass_score) || 0
  const deg = START + SWEEP * Math.max(0, Math.min(1, pass / max))
  const a = pt(deg, R - GW / 2 - 2), b = pt(deg, R + GW / 2 + 2)
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
})
</script>

<style scoped>
.rr-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 22px; }
.rr-form { display: flex; flex-direction: column; gap: 14px; }

.rr-ctx { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 13px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rr-ctx-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 13%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 26%, transparent); }
.rr-ctx-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rr-ctx-prog { font-size: 13.5px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-ctx-sub { font-size: 10.5px; color: var(--trn-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

.rr-help { display: block; margin-top: 5px; font-size: 11px; color: var(--trn-text-dim); }

.rr-attempts { display: flex; align-items: center; gap: 10px; overflow: hidden; padding: 9px 12px; border-radius: 11px;
  background: color-mix(in srgb, var(--trn-amber) 7%, var(--trn-surface)); border: 1px solid var(--trn-border-soft); font-size: 12px; color: var(--trn-text-secondary); }
.rr-attempts-l { display: inline-flex; align-items: center; gap: 6px; }
.rr-attempts-l :deep(svg) { color: var(--trn-amber-strong); }
.rr-attempts-l b { color: var(--trn-text); }
.rr-attempts-best { font-family: var(--trn-mono); font-size: 11px; color: var(--trn-text-muted); }
.rr-attempts-r { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--trn-text-muted); }
.rr-attempts-r.warn { color: var(--trn-st-failed); }

.rr-score-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.rr-score-lab i { color: var(--trn-st-failed); font-style: normal; margin-left: 2px; }
.rr-score-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.rr-score-in { width: 110px; font: inherit; font-family: var(--trn-mono); font-size: 24px; font-weight: 850; color: var(--trn-text); text-align: center;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); border-radius: 12px; padding: 8px 10px; transition: border-color 0.2s, box-shadow 0.2s; }
.rr-score-in:focus { outline: none; border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.rr-score-of { font-size: 15px; font-weight: 700; color: var(--trn-text-muted); }
.rr-score-stepper { display: flex; flex-direction: column; gap: 5px; margin-left: auto; }
.rr-score-stepper button { font: inherit; font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 8px; cursor: pointer;
  color: var(--trn-text-secondary); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.18s; }
.rr-score-stepper button:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: color-mix(in srgb, var(--trn-amber) 32%, transparent); }

/* live scorecard */
.rr-card { --vc: var(--trn-text-dim); position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 18px 16px; border-radius: 18px; background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); transition: border-color 0.3s; }
.rr-card.pass { --vc: var(--trn-st-completed); border-color: color-mix(in srgb, var(--trn-st-completed) 30%, transparent); }
.rr-card.fail { --vc: var(--trn-st-failed); border-color: color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.rr-card-aura { position: absolute; inset: -30% -10% auto -10%; height: 160px; pointer-events: none; filter: blur(38px); opacity: 0.5; transition: background 0.4s;
  background: radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--vc) 40%, transparent), transparent 70%); }
.rr-card-eyebrow { position: relative; display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-amber-strong); }
.rr-card-eyebrow :deep(svg) { color: var(--trn-amber); }
.rr-gauge { position: relative; width: 168px; height: 168px; }
.rr-gauge svg { width: 100%; height: 100%; }
.rr-g-track { stroke: var(--trn-border-strong); opacity: 0.45; }
.rr-g-fill { stroke: var(--vc); transition: stroke-dashoffset 0.6s var(--trn-spring), stroke 0.4s; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--vc) 45%, transparent)); }
.rr-card.none .rr-g-fill { stroke: var(--trn-amber); }
.rr-g-passmark { stroke: var(--trn-text); stroke-width: 2.5; opacity: 0.85; }
.rr-gauge-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rr-gauge-val { font-family: var(--trn-mono); font-size: 40px; font-weight: 850; line-height: 1; color: var(--trn-text); }
.rr-gauge-of { font-family: var(--trn-mono); font-size: 12px; color: var(--trn-text-muted); margin-top: 2px; }
.rr-stamp { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 13px; font-weight: 850; letter-spacing: 0.08em;
  padding: 5px 14px; border-radius: 999px; color: var(--vc); background: color-mix(in srgb, var(--vc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--vc) 34%, transparent); }
.rr-card.none .rr-stamp { font-size: 11px; font-weight: 600; letter-spacing: 0; color: var(--trn-text-muted); background: var(--trn-surface); }
.rr-next { display: flex; align-items: flex-start; gap: 6px; margin: 0; text-align: left; font-size: 11.5px; line-height: 1.5; color: var(--trn-text-secondary); }
.rr-next :deep(svg) { color: var(--vc); flex-shrink: 0; margin-top: 1px; }
.rr-card.none .rr-next :deep(svg) { color: var(--trn-text-dim); }

.rr-go { color: #fff; border: none; }
.rr-go.is-pass { background: var(--hr-gradient-hero); color: #2a1a06; box-shadow: 0 8px 22px -10px rgba(251, 146, 60, 0.6); }
.rr-go.is-fail { background: linear-gradient(120deg, var(--trn-st-failed), color-mix(in srgb, var(--trn-st-failed) 72%, #000)); color: #fff; box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--trn-st-failed) 70%, transparent); }
.rr-go:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@media (max-width: 720px) { .rr-layout { grid-template-columns: 1fr; } .rr-card { order: -1; } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .rr-g-fill { transition: none; } }
</style>
