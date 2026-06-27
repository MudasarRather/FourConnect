<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="pm-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <span class="pm-mesh" aria-hidden="true" />
        <Motion as="div" class="pm" :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="pm-edge" aria-hidden="true" />
          <span class="pm-aura" aria-hidden="true" />

          <header class="pm-head">
            <span class="pm-ic"><component :is="launch ? Rocket : ClipboardList" :size="18" /></span>
            <div class="pm-titles">
              <b>{{ launch ? 'Launch a review cycle' : 'New review' }}</b>
              <span>{{ launch ? 'Open one rubric across a cohort' : 'Score one employee against a rubric' }}</span>
            </div>
            <button class="pm-x" type="button" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="pm-body">
            <!-- ═══ live preview — the Review Pass ═══ -->
            <aside class="pm-preview">
              <div class="pm-pass" :class="{ ready: canSave }">
                <span class="pm-pass-grain" aria-hidden="true" />
                <div class="pm-pass-top">
                  <span class="pm-pass-kind"><component :is="launch ? Users : UserCheck" :size="11" /> {{ launch ? 'Cohort' : 'Single' }}</span>
                  <span class="pm-pass-stamp" :class="{ ready: canSave }">{{ canSave ? 'READY' : 'DRAFT' }}</span>
                </div>

                <!-- rubric orbit motif -->
                <div class="pm-pass-orbit" :class="{ live: !!selectedTemplate }">
                  <span class="pm-orbit-ring" />
                  <span class="pm-orbit-ring two" />
                  <div class="pm-orbit-core" :style="{ '--perf-p': weightDeg + 'deg' }">
                    <b>{{ sectionCount || '—' }}</b><i>sec</i>
                  </div>
                  <span v-for="d in orbitDots" :key="d" class="pm-orbit-dot" :style="{ '--a': (d / orbitDots * 360) + 'deg' }" />
                </div>

                <div class="pm-pass-name">{{ selectedTemplate ? selectedTemplate.name : 'Select a rubric' }}</div>
                <div class="pm-pass-code">{{ selectedTemplate ? `${selectedTemplate.code} · ${cycleMeta(form.cycle).label}` : 'Appraisal template' }}</div>

                <div class="pm-pass-rows">
                  <div class="pm-pass-row"><CalendarRange :size="12" /><span>Period</span><b>{{ form.period_label || '—' }}</b></div>
                  <div class="pm-pass-row"><Clock :size="12" /><span>Due</span><b>{{ form.due_date ? fmtDate(form.due_date) : '—' }}</b></div>
                  <div class="pm-pass-row"><component :is="launch ? Users : UserCheck" :size="12" /><span>{{ launch ? 'Cohort' : 'Employee' }}</span>
                    <b>{{ targetLabel }}</b></div>
                  <div class="pm-pass-row"><ShieldCheck :size="12" /><span>Scope</span>
                    <b>{{ selectedTemplate ? scopeText(selectedTemplate) : '—' }}</b></div>
                </div>

                <div class="pm-pass-foot">
                  <span class="pm-pass-weight" :class="weightClass"><Scale :size="11" /> weights {{ weightTotal }}%</span>
                  <span v-if="selectedTemplate && fitSummary" class="pm-pass-fit" :class="scopeWarn ? 'warn' : 'ok'">
                    <component :is="scopeWarn ? TriangleAlert : ShieldCheck" :size="11" /> {{ fitSummary.fit }}/{{ fitSummary.total }} fit
                  </span>
                </div>

                <!-- lifecycle the review enters -->
                <div class="pm-life">
                  <span class="pm-life-h">Enters the workflow at</span>
                  <div class="pm-life-rail">
                    <span class="pm-life-track" />
                    <div v-for="(s, i) in LIFE" :key="s.key" class="pm-life-node" :class="{ entry: i === 1 }" :style="{ '--c': s.color }">
                      <span class="pm-life-dot"><component :is="s.icon" :size="11" /></span>
                      <span class="pm-life-lab">{{ s.label }}</span>
                    </div>
                  </div>
                  <p class="pm-life-note"><component :is="launch ? Users : UserCheck" :size="10" /> Opens at <b>Manager review</b> against the rubric → on completion the score resolves a <b>merit band</b> for the increment.</p>
                </div>
              </div>
            </aside>

            <!-- ═══ form ═══ -->
            <div class="pm-form">
              <!-- mode segmented -->
              <div class="pm-field" style="--i:0">
                <label class="pm-lab">Review type</label>
                <div class="pm-seg">
                  <button type="button" class="pm-seg-btn" :class="{ on: !launch }" @click="setMode('single')">
                    <UserCheck :size="14" /> Single
                  </button>
                  <button type="button" class="pm-seg-btn" :class="{ on: launch }" @click="setMode('launch')">
                    <Users :size="14" /> Cohort
                  </button>
                  <span class="pm-seg-thumb" :style="{ transform: launch ? 'translateX(100%)' : 'translateX(0)' }" />
                </div>
              </div>

              <div class="pm-field" style="--i:1">
                <label class="pm-lab">Appraisal rubric <i>*</i></label>
                <PerfSelect :model-value="form.template_id" :options="templateOptions" placeholder="Select a template…"
                  search-placeholder="Search rubrics…" @update:model-value="onPickTemplate" />
                <p v-if="!templates.length" class="pm-hint warn"><TriangleAlert :size="11" /> No appraisal templates yet — create one in Settings → Appraisal Templates first.</p>
                <template v-else-if="selectedTemplate">
                  <div v-if="scopeWarn" class="pm-scope warn">
                    <TriangleAlert :size="13" />
                    <span>
                      Scoped to <b>{{ scopeText(selectedTemplate) }}</b> —
                      <template v-if="launch">{{ scopeWarn.out }} of {{ scopeWarn.total }} selected fall outside.</template>
                      <template v-else>{{ empName(selectedEmployees[0]) }} is outside it.</template>
                      You can still launch.
                    </span>
                    <button v-if="scopeWarn.better" type="button" class="pm-scope-fix" @click="useRecommended">
                      <Sparkles :size="11" /> Use {{ scopeWarn.better.code }}
                    </button>
                  </div>
                  <p v-else-if="scopeOk === 'fit'" class="pm-scope ok"><ShieldCheck :size="12" /> In scope · {{ scopeText(selectedTemplate) }}</p>
                  <p v-else-if="scopeOk === 'all'" class="pm-scope all"><Globe :size="12" /> Applies to all employees</p>
                </template>
              </div>

              <div class="pm-row" style="--i:2">
                <div class="pm-field">
                  <label class="pm-lab">Cycle</label>
                  <PerfSelect v-model="form.cycle" :options="cycleOptions" />
                </div>
                <div class="pm-field">
                  <label class="pm-lab">Period label</label>
                  <input v-model="form.period_label" class="pm-input" placeholder="e.g. FY 2025-26" />
                </div>
              </div>

              <div class="pm-field" style="--i:3">
                <label class="pm-lab">Due date</label>
                <HrDatePicker v-model="form.due_date" :min="today" placeholder="dd / mm / yyyy" />
              </div>

              <div class="pm-field" style="--i:4">
                <div class="pm-lab-row">
                  <label class="pm-lab">{{ launch ? 'Cohort' : 'Employee' }} <i>*</i></label>
                  <span v-if="launch" class="pm-sel-count">{{ form.employee_ids.length }} selected</span>
                </div>
                <div class="pm-search">
                  <Search :size="14" />
                  <input v-model="search" class="pm-search-in" placeholder="Search employees…" />
                  <button v-if="launch && filteredEmps.length" type="button" class="pm-selall" @click="toggleAll">
                    {{ allSelected ? 'Clear' : 'Select all' }}
                  </button>
                </div>
                <div class="pm-emps">
                  <div v-if="loadingEmps" class="pm-emps-load"><Loader2 :size="16" class="perf-spin" /> Loading…</div>
                  <button v-for="(e, i) in filteredEmps" :key="e.id" type="button" class="pm-emp" :class="{ on: isPicked(e.id) }"
                    :style="{ '--i': i }" @click="pick(e.id)">
                    <span class="pm-emp-av">{{ initials(empName(e)) }}</span>
                    <span class="pm-emp-txt"><b>{{ empName(e) }}</b><span>{{ e.designation_name || e.employee_id || '' }}</span></span>
                    <component :is="isPicked(e.id) ? CheckCircle2 : (launch ? Circle : CircleDot)" :size="16" class="pm-emp-tick" :class="{ on: isPicked(e.id) }" />
                  </button>
                  <p v-if="!loadingEmps && !filteredEmps.length" class="pm-emps-empty">No employees match.</p>
                </div>
              </div>
            </div>
          </div>

          <footer class="pm-foot">
            <button class="perf-btn perf-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
            <button class="perf-btn perf-btn-primary" type="button" :disabled="!canSave || saving" @click="submit">
              <Loader2 v-if="saving" :size="14" class="perf-spin" /><component v-else :is="launch ? Rocket : Plus" :size="14" />
              {{ launch ? `Launch (${form.employee_ids.length})` : 'Create review' }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Search, Loader2, Plus, Rocket, ClipboardList, CheckCircle2, Circle, CircleDot, Users, UserCheck, CalendarRange, Clock, Scale, TriangleAlert, ShieldCheck, Sparkles, Globe, PencilRuler, BadgeCheck, Coins } from 'lucide-vue-next'
import PerfSelect from './PerfSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fetchEmployeesForReview } from '@/composables/usePerformance'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { listMaster } from '@/views/hr/settings/composables/useHrSettings'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'single' },     // single | launch
  templates: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])
const reduced = prefersReduced()

// the lifecycle a new review enters (it opens at Manager review by default)
const LIFE = [
  { key: 'self', label: 'Reflect', icon: PencilRuler, color: 'var(--perf-amber)' },
  { key: 'mgr', label: 'Manager', icon: UserCheck, color: 'var(--perf-orange)' },
  { key: 'done', label: 'Complete', icon: CheckCircle2, color: 'var(--perf-gold)' },
  { key: 'ack', label: 'Signed', icon: BadgeCheck, color: 'var(--perf-ok)' },
  { key: 'merit', label: 'Merit', icon: Coins, color: 'var(--perf-ok)' },
]

const mode = ref(props.mode)
const launch = computed(() => mode.value === 'launch')
const setMode = (m) => { if (mode.value === m) return; mode.value = m; form.employee_ids = [] }

const form = reactive({ template_id: null, cycle: 'ANNUAL', period_label: '', due_date: '', employee_ids: [] })
const search = ref('')
const emps = ref([])
const loadingEmps = ref(false)
const manualTpl = ref(false)              // user overrode the auto-picked rubric
const pickedMap = reactive({})            // id → employee object (survives search changes)
const gradeMap = ref({})                  // grade_id → code/name (for human scope chips)
const deptMap = ref({})                   // department_id → name

const today = new Date().toISOString().slice(0, 10)

// ── template ⇄ employee scope (the appraisal-template applies_to_json) ────────
// A template applies to an employee when, for every scoped dimension (grade /
// department), the employee matches; an unscoped template is universal.
function tplScope(t) {
  const a = (t && t.applies_to_json) || {}
  const g = Array.isArray(a.grade_ids) ? a.grade_ids.map(String) : []
  const d = Array.isArray(a.department_ids) ? a.department_ids.map(String) : []
  return { g, d, universal: g.length === 0 && d.length === 0 }
}
function appliesTo(t, emp) {
  if (!emp) return true
  const { g, d, universal } = tplScope(t)
  if (universal) return true
  const gradeOk = g.length === 0 || (emp.grade_id && g.includes(String(emp.grade_id)))
  const deptOk = d.length === 0 || (emp.department_id && d.includes(String(emp.department_id)))
  return gradeOk && deptOk
}
function scopeText(t) {
  const { g, d, universal } = tplScope(t)
  if (universal) return 'All employees'
  const parts = []
  if (d.length) parts.push(d.map(id => deptMap.value[id] || 'Dept').join(', '))
  if (g.length) parts.push(g.map(id => gradeMap.value[id] || 'Grade').join(', '))
  return parts.join(' · ') || 'Scoped'
}

const selectedEmployees = computed(() => form.employee_ids.map(id => pickedMap[id]).filter(Boolean))

// per-template fit vs the current selection: all | fit | partial | out | scoped(none selected)
function tplFit(t) {
  const sel = selectedEmployees.value
  const { universal } = tplScope(t)
  if (!sel.length) return universal ? 'all' : 'scoped'
  if (universal) return 'all'
  const fit = sel.filter(e => appliesTo(t, e)).length
  if (fit === sel.length) return 'fit'
  if (fit === 0) return 'out'
  return 'partial'
}
const FIT_DOT = { all: 'var(--perf-gold)', fit: 'var(--perf-ok)', partial: 'var(--perf-amber)', out: 'var(--perf-conflict)', scoped: 'var(--perf-text-dim)' }
const FIT_TAG = { all: 'All', fit: 'In scope', partial: 'Partial', out: 'Out of scope', scoped: 'Scoped' }

const templateOptions = computed(() => props.templates.map(t => {
  const fit = tplFit(t)
  const n = (t.sections || []).length
  return {
    value: t.id, label: t.name, icon: ClipboardList, dot: FIT_DOT[fit],
    sub: `${t.code} · ${n} section${n === 1 ? '' : 's'} · ${scopeText(t)}`,
  }
}))
const cycleOptions = computed(() => CYCLES.map(c => ({ value: c, label: cycleMeta(c).label })))

// the rubric that best fits the current selection (most-specific applicable wins)
function bestTemplateFor(sel) {
  const cand = props.templates
  if (!cand.length) return null
  if (!sel.length) return cand[0]?.id || null
  let best = null, bestScore = -1
  for (const t of cand) {
    const fit = sel.filter(e => appliesTo(t, e)).length
    if (fit === 0) continue
    const { g, d, universal } = tplScope(t)
    const spec = universal ? 0 : (g.length ? 1 : 0) + (d.length ? 1 : 0)
    const score = (fit / sel.length) * 100 + spec * 10
    if (score > bestScore) { bestScore = score; best = t }
  }
  return (best || cand[0]).id
}
const recommendedTemplateId = computed(() => bestTemplateFor(selectedEmployees.value))
// auto-pick the applicable rubric as the cohort changes — until the user overrides
watch([recommendedTemplateId, () => props.templates], () => {
  if (!manualTpl.value && recommendedTemplateId.value) form.template_id = recommendedTemplateId.value
})
function onPickTemplate(v) { form.template_id = v; manualTpl.value = true }
function useRecommended() { if (recommendedTemplateId.value) { form.template_id = recommendedTemplateId.value; manualTpl.value = true } }

const fitSummary = computed(() => {
  const t = selectedTemplate.value
  const sel = selectedEmployees.value
  if (!t || !sel.length) return null
  const fit = sel.filter(e => appliesTo(t, e)).length
  return { fit, total: sel.length, out: sel.length - fit }
})
const scopeWarn = computed(() => {
  const t = selectedTemplate.value
  if (!t || tplScope(t).universal) return null
  const s = fitSummary.value
  if (!s || s.out === 0) return null
  const better = recommendedTemplateId.value && recommendedTemplateId.value !== form.template_id
    ? props.templates.find(x => x.id === recommendedTemplateId.value && appliesTo(x, selectedEmployees.value[0]))
    : null
  return { ...s, better }
})
const scopeOk = computed(() => {
  const t = selectedTemplate.value
  if (!t) return null
  if (tplScope(t).universal) return 'all'
  const s = fitSummary.value
  return s && s.out === 0 ? 'fit' : null
})

const selectedTemplate = computed(() => props.templates.find(t => t.id === form.template_id) || null)
const sectionCount = computed(() => (selectedTemplate.value?.sections || []).length)
const orbitDots = computed(() => Math.min(8, Math.max(0, sectionCount.value)))
const weightTotal = computed(() => Math.round((selectedTemplate.value?.sections || []).reduce((a, s) => a + (Number(s.weight) || 0), 0)))
const weightDeg = computed(() => Math.min(360, weightTotal.value / 100 * 360))
const weightClass = computed(() => {
  if (!selectedTemplate.value) return 'none'
  if (weightTotal.value === 100) return 'ok'
  return weightTotal.value > 100 ? 'over' : 'under'
})
watch(selectedTemplate, (t) => { if (t && t.cycle) form.cycle = t.cycle })

const fmtDate = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso } }
const targetLabel = computed(() => {
  if (launch.value) return form.employee_ids.length ? `${form.employee_ids.length} selected` : '—'
  if (!form.employee_ids.length) return '—'
  const e = emps.value.find(x => x.id === form.employee_ids[0])
  return e ? empName(e) : '1 selected'
})

function reset() {
  mode.value = props.mode
  manualTpl.value = false
  for (const k of Object.keys(pickedMap)) delete pickedMap[k]
  form.template_id = props.templates[0]?.id || null
  form.cycle = props.templates[0]?.cycle || 'ANNUAL'
  form.period_label = ''
  form.due_date = ''
  form.employee_ids = []
  search.value = ''
}
async function loadEmps() {
  loadingEmps.value = true
  try {
    const data = await fetchEmployeesForReview({ search: search.value || undefined })
    emps.value = data.items || data || []
  } catch { emps.value = [] }
  finally { loadingEmps.value = false }
}
let refsLoaded = false
async function loadRefs() {
  if (refsLoaded) return
  refsLoaded = true
  try {
    const [grades, depts] = await Promise.all([listMaster('grades'), listMaster('departments')])
    gradeMap.value = Object.fromEntries((grades || []).map(g => [String(g.id), g.code || g.name]))
    deptMap.value = Object.fromEntries((depts || []).map(d => [String(d.id), d.name || d.code]))
  } catch { /* names are optional polish — applicability still works on ids */ }
}
watch(() => props.open, (v) => { if (v) { reset(); loadEmps(); loadRefs() } })
let t = null
watch(search, () => { clearTimeout(t); t = setTimeout(loadEmps, 300) })

const empName = (e) => e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_id || '—'
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const filteredEmps = computed(() => emps.value)
const isPicked = (id) => launch.value ? form.employee_ids.includes(id) : form.employee_ids[0] === id
function pick(id) {
  const emp = emps.value.find(e => e.id === id)
  if (emp) pickedMap[id] = emp
  if (launch.value) {
    const i = form.employee_ids.indexOf(id)
    if (i >= 0) form.employee_ids.splice(i, 1); else form.employee_ids.push(id)
  } else {
    form.employee_ids = [id]
  }
}
const allSelected = computed(() => filteredEmps.value.length > 0 && filteredEmps.value.every(e => form.employee_ids.includes(e.id)))
function toggleAll() {
  if (allSelected.value) form.employee_ids = []
  else { form.employee_ids = filteredEmps.value.map(e => e.id); for (const e of filteredEmps.value) pickedMap[e.id] = e }
}

const canSave = computed(() => form.template_id && form.employee_ids.length > 0)
function submit() {
  if (!canSave.value) return
  const base = { template_id: form.template_id, cycle: form.cycle, period_label: form.period_label || null, due_date: form.due_date || null }
  if (launch.value) emit('save', { ...base, employee_ids: [...form.employee_ids] })
  else emit('save', { ...base, employee_id: form.employee_ids[0] })
}
</script>

<style scoped>
.pm-ov { position: fixed; inset: 0; z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.66); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.pm-mesh { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.7;
  background:
    radial-gradient(40% 50% at 18% 22%, color-mix(in srgb, var(--perf-gold) 14%, transparent), transparent 60%),
    radial-gradient(44% 50% at 84% 78%, color-mix(in srgb, var(--perf-orange) 12%, transparent), transparent 60%);
  animation: pm-mesh 16s ease-in-out infinite alternate; }
@keyframes pm-mesh { 0% { transform: translate(-2%, -1%) scale(1); } 100% { transform: translate(2%, 1%) scale(1.08); } }
.pm { position: relative; width: 100%; max-width: 780px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 48px 110px -44px rgba(0,0,0,0.9); }
.pm-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--perf-grad-hero); z-index: 2; }
.pm-aura { position: absolute; top: -30%; right: -10%; width: 50%; height: 70%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 70%); filter: blur(40px); }

.pm-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 17px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.pm-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--perf-gold);
  background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.pm-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pm-titles b { font-size: 16px; font-weight: 800; color: var(--perf-text); }
.pm-titles span { font-size: 12px; color: var(--perf-text-muted); }
.pm-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.pm-x:hover { color: var(--perf-text); transform: rotate(90deg); border-color: var(--perf-border-warm); }

.pm-body { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: 248px 1fr; }

/* ── preview pass ── */
.pm-preview { position: sticky; top: 0; align-self: start; padding: 18px; border-right: 1px solid var(--perf-border); }
.pm-pass { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 16px; border-radius: 18px;
  background: linear-gradient(165deg, color-mix(in srgb, var(--perf-gold) 8%, var(--perf-surface)), var(--perf-panel));
  border: 1px solid var(--perf-border); transition: border-color 0.4s, box-shadow 0.4s; }
.pm-pass.ready { border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); box-shadow: 0 0 30px -14px color-mix(in srgb, var(--perf-ok) 60%, transparent); }
.pm-pass-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 16px 16px; mask-image: radial-gradient(110% 90% at 50% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(110% 90% at 50% 0%, #000, transparent 80%); }
.pm-pass-top { position: relative; display: flex; align-items: center; justify-content: space-between; }
.pm-pass-kind { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-gold); }
.pm-pass-stamp { font-size: 9.5px; font-weight: 900; letter-spacing: 0.12em; padding: 3px 8px; border-radius: 6px; color: var(--perf-text-dim); background: var(--perf-track); transition: all 0.4s; }
.pm-pass-stamp.ready { color: #06281c; background: var(--perf-ok); box-shadow: 0 0 16px -4px var(--perf-ok); }

.pm-pass-orbit { position: relative; align-self: center; width: 92px; height: 92px; margin: 4px 0; }
.pm-orbit-ring { position: absolute; inset: 8px; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--perf-gold) 30%, transparent); animation: pm-spin 24s linear infinite; }
.pm-orbit-ring.two { inset: 20px; border-style: dotted; animation-duration: 16s; animation-direction: reverse; }
@keyframes pm-spin { to { transform: rotate(360deg); } }
.pm-orbit-core { position: absolute; inset: 28px; border-radius: 50%; display: grid; place-content: center; text-align: center; line-height: 1;
  background: conic-gradient(var(--perf-gold) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.7s var(--perf-spring); }
.pm-orbit-core::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: var(--perf-surface-elevated); }
.pm-orbit-core b { position: relative; z-index: 1; font-size: 16px; font-weight: 900; color: var(--perf-text); }
.pm-orbit-core i { position: relative; z-index: 1; display: block; font-style: normal; font-size: 8px; color: var(--perf-text-muted); }
.pm-orbit-dot { position: absolute; top: 50%; left: 50%; width: 7px; height: 7px; margin: -3.5px; border-radius: 50%; background: var(--perf-gold);
  box-shadow: 0 0 7px var(--perf-gold); transform: rotate(var(--a)) translateY(-42px); opacity: 0; transition: opacity 0.4s; }
.pm-pass-orbit.live .pm-orbit-dot { opacity: 0.9; }

.pm-pass-name { position: relative; font-size: 14px; font-weight: 850; color: var(--perf-text); line-height: 1.2; }
.pm-pass-code { position: relative; font-size: 10.5px; color: var(--perf-text-muted); margin-top: -6px; }
.pm-pass-rows { position: relative; display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--perf-border); }
.pm-pass-row { display: flex; align-items: center; gap: 7px; font-size: 11px; }
.pm-pass-row :deep(svg) { color: var(--perf-text-dim); flex-shrink: 0; }
.pm-pass-row span { color: var(--perf-text-muted); }
.pm-pass-row b { margin-left: auto; font-weight: 750; color: var(--perf-text); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
.pm-pass-foot { position: relative; display: flex; flex-wrap: wrap; gap: 6px; }
.pm-pass-weight { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 750; padding: 4px 9px; border-radius: 999px; }
.pm-pass-weight.ok { color: var(--perf-ok); background: var(--perf-ok-soft); }
.pm-pass-weight.under { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 14%, transparent); }
.pm-pass-weight.over { color: var(--perf-conflict); background: var(--perf-conflict-soft); }
.pm-pass-weight.none { color: var(--perf-text-dim); background: var(--perf-track); }

/* lifecycle the review enters */
.pm-life { position: relative; display: flex; flex-direction: column; gap: 7px; padding-top: 10px; border-top: 1px solid var(--perf-border); }
.pm-life-h { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-text-muted); }
.pm-life-rail { position: relative; display: flex; justify-content: space-between; }
.pm-life-track { position: absolute; left: 8px; right: 8px; top: 9px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, var(--perf-amber), var(--perf-orange), var(--perf-gold), var(--perf-ok)); opacity: 0.4; }
.pm-life-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.pm-life-dot { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, var(--perf-surface-elevated)); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.pm-life-node.entry .pm-life-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 12px -2px color-mix(in srgb, var(--perf-orange) 70%, transparent);
  animation: pm-life-beat 2.4s ease-in-out infinite; }
@keyframes pm-life-beat { 0%, 100% { box-shadow: 0 0 8px -2px color-mix(in srgb, var(--perf-orange) 60%, transparent); } 50% { box-shadow: 0 0 16px 0 color-mix(in srgb, var(--perf-orange) 75%, transparent); } }
.pm-life-lab { font-size: 7.5px; font-weight: 700; color: var(--perf-text-dim); }
.pm-life-node.entry .pm-life-lab { color: var(--perf-text); }
.pm-life-note { display: flex; align-items: flex-start; gap: 5px; margin: 2px 0 0; font-size: 9.5px; line-height: 1.45; color: var(--perf-text-muted); }
.pm-life-note :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }
.pm-life-note b { color: var(--perf-text-secondary); font-weight: 750; }

/* ── form ── */
.pm-form { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.pm-row { display: grid; grid-template-columns: 1fr 1.1fr; gap: 11px; }
.pm-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; animation: perf-deal 0.45s var(--perf-spring) both; animation-delay: calc(0.05s + var(--i, 0) * 0.06s); }
.pm-row { animation: perf-deal 0.45s var(--perf-spring) both; animation-delay: calc(0.05s + var(--i, 0) * 0.06s); }
.pm-lab { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.pm-lab i { color: var(--perf-conflict); font-style: normal; }
.pm-lab-row { display: flex; align-items: center; justify-content: space-between; }
.pm-sel-count { font-size: 11px; font-weight: 800; color: var(--perf-gold); }
.pm-hint { display: flex; align-items: center; gap: 5px; margin: 0; font-size: 11px; color: var(--perf-text-dim); }
.pm-hint.warn { color: var(--perf-orange); }

/* template ⇄ employee scope feedback */
.pm-scope { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; line-height: 1.4; padding: 8px 10px; border-radius: 10px; }
.pm-scope :deep(svg) { flex-shrink: 0; }
.pm-scope b { font-weight: 800; }
.pm-scope.ok { color: var(--perf-ok); background: var(--perf-ok-soft); }
.pm-scope.all { color: var(--perf-text-secondary); background: var(--perf-track); }
.pm-scope.all :deep(svg) { color: var(--perf-gold); }
.pm-scope.warn { color: var(--perf-orange); align-items: flex-start;
  background: color-mix(in srgb, var(--perf-orange) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 28%, transparent); }
.pm-scope.warn :deep(svg) { color: var(--perf-orange); margin-top: 1px; }
.pm-scope.warn span { flex: 1; min-width: 0; }
.pm-scope-fix { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font: inherit; font-size: 10.5px; font-weight: 800; cursor: pointer;
  padding: 4px 8px; border-radius: 8px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--perf-gold) 32%, transparent); transition: background 0.2s; }
.pm-scope-fix:hover { background: color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.pm-pass-fit { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 750; padding: 4px 9px; border-radius: 999px; }
.pm-pass-fit.ok { color: var(--perf-ok); background: var(--perf-ok-soft); }
.pm-pass-fit.warn { color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 14%, transparent); }

.pm-input { width: 100%; height: 42px; padding: 0 12px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, box-shadow 0.2s; }
.pm-input:focus { outline: none; border-color: color-mix(in srgb, var(--perf-gold) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--perf-gold) 12%, transparent); }

/* segmented */
.pm-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 4px; border-radius: 12px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.pm-seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 0; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700; color: var(--perf-text-muted); background: none; border: none; transition: color 0.25s; }
.pm-seg-btn.on { color: #1a1206; }
.pm-seg-thumb { position: absolute; z-index: 0; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px); border-radius: 9px; background: var(--perf-grad-hero); box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--perf-orange) 70%, transparent); transition: transform 0.32s var(--perf-spring); }

.pm-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.pm-search :deep(svg) { color: var(--perf-text-muted); flex-shrink: 0; }
.pm-search-in { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 13px; color: var(--perf-text); }
.pm-search-in:focus { outline: none; }
.pm-selall { font: inherit; font-size: 11px; font-weight: 800; color: var(--perf-gold); background: none; border: none; cursor: pointer; flex-shrink: 0; }

.pm-emps { display: flex; flex-direction: column; gap: 5px; max-height: 252px; overflow-y: auto; padding: 4px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.pm-emps-load, .pm-emps-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 22px; font-size: 12px; color: var(--perf-text-muted); }
.pm-emp { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit;
  background: transparent; border: 1px solid transparent; transition: all 0.16s; animation: perf-deal 0.32s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.02s); }
.pm-emp:hover { background: var(--perf-surface-elevated); transform: translateX(2px); }
.pm-emp.on { background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.pm-emp-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.pm-emp-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pm-emp-txt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-emp-txt span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-emp-tick { color: var(--perf-text-dim); flex-shrink: 0; }
.pm-emp-tick.on { color: var(--perf-gold); }

.pm-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }

@media (max-width: 680px) {
  .pm-body { grid-template-columns: 1fr; }
  .pm-preview { position: static; border-right: none; border-bottom: 1px solid var(--perf-border); }
  .pm-row { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .pm-x:hover { transform: none; }
  .pm-orbit-ring, .pm-orbit-ring.two { animation: none; }
  .pm-field, .pm-row, .pm-emp { animation: none; }
  .pm-emp:hover { transform: none; }
  .pm-seg-thumb { transition: none; }
  .pm-mesh, .pm-life-node.entry .pm-life-dot { animation: none; }
}
</style>
