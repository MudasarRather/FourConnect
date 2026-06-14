<template>
  <OnbModal
    :open="open"
    :title="editing ? 'Update rotation' : 'New shift rotation'"
    :subtitle="stepSubtitle"
    :icon="RefreshCcw"
    :width="960"
    @close="$emit('close')"
  >
    <div class="wz">
      <!-- ════════ STEPPER ════════ -->
      <nav class="wz-steps" aria-label="Wizard steps">
        <div class="wz-steps-line"><span class="wz-steps-fill" :style="{ width: fillPct + '%' }" /></div>
        <button v-for="(st, i) in STEPS" :key="st.key" type="button" class="wz-step"
          :class="{ active: i === step, done: i < step, invalid: i < step && !stepValid(i) }"
          :disabled="i > maxReached" @click="goto(i)">
          <span class="wz-step-dot"><component :is="i < step ? Check : st.icon" :size="14" /></span>
          <span class="wz-step-label">{{ st.label }}</span>
        </button>
      </nav>

      <div class="wz-body">
        <!-- ════════ STEP CONTENT ════════ -->
        <div class="wz-pane">
          <transition :name="`wz-${dir}`" mode="out-in">
            <div :key="step" class="wz-step-content">

              <!-- STEP 0 — CADENCE -->
              <div v-if="step === 0" class="wz-fields">
                <p class="wz-lead">Name the cycle and choose how often it advances. The anchor date is day-one of the pattern — projected step dates count forward from it.</p>
                <div class="sf-row tri">
                  <label class="sf-field"><span>Name <em>*</em></span><input v-model="form.name" placeholder="3-week rotating" class="sf-input" /></label>
                  <label class="sf-field"><span>Code</span><input v-model="form.code" class="sf-input mono" placeholder="ROT-3W" @input="form.code = form.code.toUpperCase()" /></label>
                  <label class="sf-field"><span>Anchor date</span><HrDatePicker v-model="form.anchor_date" placeholder="Day one" /></label>
                </div>

                <label class="sf-field"><span>Cadence</span></label>
                <div class="cycle-picker">
                  <Motion v-for="(c, ci) in CYCLES" :key="c.key" as="button" type="button"
                    class="cycle-card" :class="{ on: form.cycle === c.key }"
                    :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ delay: 0.04 * ci, duration: 0.3 }"
                    :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="form.cycle = c.key">
                    <component :is="c.icon" :size="16" />
                    <b>{{ c.label }}</b>
                    <small>{{ c.hint }}</small>
                  </Motion>
                </div>

                <div class="sf-row duo">
                  <label class="sf-field" v-if="form.cycle === 'CUSTOM'"><span>Step length (days) <em>*</em></span><input v-model.number="form.frequency_days" type="number" min="1" class="sf-input mono" /></label>
                  <label class="sf-field" :class="{ wide: form.cycle !== 'CUSTOM' }"><span>Description</span><input v-model="form.description" placeholder="Optional note about this rotation" class="sf-input" /></label>
                </div>
              </div>

              <!-- STEP 1 — SEQUENCE -->
              <div v-else-if="step === 1" class="wz-fields">
                <p class="wz-lead">Order the steps each member moves through. A step is a shift template, or an OFF (rest) block. The cycle loops back to step 1 after the last.</p>
                <div class="seq-list">
                  <Motion v-for="(s, i) in form.steps" :key="s._k" as="div" class="seq-row"
                    :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.28 }">
                    <span class="seq-no" :class="{ off: !s.shift_id }">{{ i + 1 }}</span>
                    <HrSelect :model-value="s.shift_id" :options="stepShiftOptions" style="flex:1;min-width:0"
                      @update:model-value="v => s.shift_id = v" />
                    <input v-model="s.label" placeholder="Label" class="sf-input seq-lbl" />
                    <div class="seq-reorder">
                      <button type="button" :disabled="i === 0" @click="move(i, -1)" title="Move up"><ChevronUp :size="13" /></button>
                      <button type="button" :disabled="i === form.steps.length - 1" @click="move(i, 1)" title="Move down"><ChevronDown :size="13" /></button>
                    </div>
                    <button type="button" class="seq-del" :disabled="form.steps.length <= 1" @click="removeStep(i)"><X :size="13" /></button>
                  </Motion>
                </div>
                <button type="button" class="sf-ghost" @click="addStep"><Plus :size="13" />Add step</button>
              </div>

              <!-- STEP 2 — CREW -->
              <div v-else-if="step === 2" class="wz-fields">
                <p class="wz-lead">Pick the members who ride this rotation. Each advance schedules their next shift automatically. You can add members later, too.</p>
                <div class="sf-search"><Search :size="15" /><input v-model="empSearch" placeholder="Search employees…" @input="onSearch" /><span v-if="form.member_employee_ids.length" class="sf-count">{{ form.member_employee_ids.length }} selected</span></div>
                <div class="emps" v-if="filteredEmps.length">
                  <Motion v-for="(e, i) in filteredEmps" :key="e.id" as="button" type="button" class="emp"
                    :class="{ on: form.member_employee_ids.includes(e.id) }"
                    :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.25, delay: Math.min(i, 14) * 0.02 }"
                    :whileTap="{ scale: 0.97 }" @click="toggleEmp(e.id)">
                    <span class="emp-av">{{ initials(e.full_name) }}</span>
                    <span class="emp-meta"><b>{{ e.full_name }}</b><small>{{ e.department_name || '—' }}</small></span>
                    <Check v-if="form.member_employee_ids.includes(e.id)" :size="15" class="emp-ck" />
                  </Motion>
                </div>
                <div v-else class="emps-empty"><Loader2 v-if="loadingEmps" :size="15" class="spin" /> {{ loadingEmps ? 'Loading…' : 'No employees match' }}</div>
              </div>

              <!-- STEP 3 — REVIEW -->
              <div v-else class="wz-fields">
                <p class="wz-lead">Confirm the cycle. {{ editing ? 'Saving updates the pattern; the current step index is preserved.' : 'On create the rotation starts at step 1 from the anchor date.' }}</p>
                <div class="rv-grid">
                  <div class="rv-item"><span>Name</span><b>{{ form.name || '—' }}</b></div>
                  <div class="rv-item"><span>Code</span><b class="mono">{{ form.code || '—' }}</b></div>
                  <div class="rv-item"><span>Cadence</span><b>{{ cycleLabel }} · {{ stepDays }}d</b></div>
                  <div class="rv-item"><span>Anchor</span><b class="mono">{{ form.anchor_date || '—' }}</b></div>
                  <div class="rv-item"><span>Steps</span><b>{{ form.steps.length }}</b></div>
                  <div class="rv-item"><span>Members</span><b>{{ form.member_employee_ids.length }}</b></div>
                </div>
                <div class="rv-schedule">
                  <div class="rv-sched-head"><CalendarClock :size="13" /> Projected step dates</div>
                  <div class="rv-sched-list">
                    <span v-for="(p, i) in projection" :key="i" class="rv-sched-row">
                      <b>{{ i + 1 }}</b><span class="rv-sched-lbl">{{ p.label }}</span><span class="rv-sched-date mono">{{ p.date }}</span>
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </transition>
        </div>

        <!-- ════════ LIVE ORBIT PREVIEW ════════ -->
        <aside class="wz-preview">
          <div class="pv-tag">Cycle preview</div>
          <div class="pv-card">
            <div class="pv-name">{{ form.name || 'Untitled rotation' }}</div>
            <div class="pv-cadence">{{ cycleLabel }} · {{ stepDays }}-day step · {{ form.steps.length }} steps</div>

            <div class="pv-orbit">
              <span class="pv-sweep" aria-hidden="true" />
              <span class="pv-track" aria-hidden="true" />
              <span v-for="(s, si) in form.steps" :key="s._k" class="pv-dot" :class="{ off: !s.shift_id }" :style="dotStyle(si, form.steps.length)" :title="stepName(s)" />
              <span class="pv-core">{{ form.steps.length }}<small>steps</small></span>
            </div>

            <div class="pv-seq">
              <span v-for="(s, si) in form.steps" :key="s._k" class="pv-chip" :class="{ off: !s.shift_id }">
                <b>{{ si + 1 }}</b>{{ stepName(s) }}
              </span>
            </div>

            <div class="pv-foot">
              <span><UsersRound :size="12" />{{ form.member_employee_ids.length }} member{{ form.member_employee_ids.length === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <template #footer>
      <span class="wz-foot-note">Step {{ step + 1 }} of {{ STEPS.length }} · {{ editing ? 'Editing' : 'Creating' }}</span>
      <button v-if="step > 0" class="sf-ghost" @click="back"><ChevronLeft :size="14" />Back</button>
      <button v-else class="sf-ghost" @click="$emit('close')">Cancel</button>
      <button v-if="step < STEPS.length - 1" class="sf-primary" :disabled="!stepValid(step)" @click="next">Next<ChevronRight :size="14" /></button>
      <button v-else class="sf-primary" :disabled="!isValid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" />
        {{ saving ? 'Saving…' : (editing ? 'Save rotation' : 'Create rotation') }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCcw, Plus, X, Search, Check, CheckCircle2, Loader2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CalendarClock,
  Repeat, ListOrdered, UsersRound, ClipboardCheck, CalendarRange, CalendarDays, Sparkles,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { createRotation, updateRotation, fetchEmployeesLite, todayIso, isoOffsetDays } from '@/composables/useShifts'

const props = defineProps({
  open: { type: Boolean, default: false },
  rotation: { type: Object, default: null },
  shifts: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const STEPS = [
  { key: 'cadence',  label: 'Cadence',  icon: Repeat },
  { key: 'sequence', label: 'Sequence', icon: ListOrdered },
  { key: 'crew',     label: 'Crew',     icon: UsersRound },
  { key: 'review',   label: 'Review',   icon: ClipboardCheck },
]
const CYCLES = [
  { key: 'WEEKLY',   label: 'Weekly',   hint: '7-day step',  icon: CalendarRange },
  { key: 'BIWEEKLY', label: 'Biweekly', hint: '14-day step', icon: CalendarDays },
  { key: 'MONTHLY',  label: 'Monthly',  hint: '30-day step', icon: CalendarClock },
  { key: 'CUSTOM',   label: 'Custom',   hint: 'Set days',    icon: Sparkles },
]
const CYCLE_DAYS = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 }

const editing = computed(() => !!props.rotation?.id)
const saving = ref(false)
const step = ref(0)
const maxReached = ref(0)
const dir = ref('fwd')
const employees = ref([])
const empSearch = ref('')
const loadingEmps = ref(false)

let keySeq = 0
const mkStep = (shift_id = null, label = '') => ({ shift_id, label, _k: ++keySeq })
const blank = () => ({
  name: '', code: '', cycle: 'WEEKLY', frequency_days: 7, description: '',
  anchor_date: todayIso(), steps: [mkStep()], member_employee_ids: [],
})
const form = reactive(blank())

watch(() => props.open, async (o) => {
  if (!o) return
  step.value = 0; maxReached.value = 0; dir.value = 'fwd'
  if (props.rotation?.id) {
    const r = props.rotation
    Object.assign(form, {
      name: r.name, code: r.code || '', cycle: r.cycle || 'WEEKLY', frequency_days: r.frequency_days || 7,
      description: r.description || '', anchor_date: r.anchor_date || todayIso(),
      steps: (r.steps || []).map(s => mkStep(s.shift_id || null, s.label || '')),
      member_employee_ids: (r.members || []).map(m => m.employee_id),
    })
    if (!form.steps.length) form.steps = [mkStep()]
  } else {
    Object.assign(form, blank())
  }
  await loadEmps()
})

const loadEmps = async (q = '') => {
  loadingEmps.value = true
  try { employees.value = await fetchEmployeesLite(q) }
  catch { /* best-effort */ }
  finally { loadingEmps.value = false }
}
let timer = null
const onSearch = () => { clearTimeout(timer); timer = setTimeout(() => loadEmps(empSearch.value.trim()), 280) }

const filteredEmps = computed(() => {
  const q = empSearch.value.trim().toLowerCase()
  const list = !q ? employees.value : employees.value.filter(e => (e.full_name || '').toLowerCase().includes(q) || (e.department_name || '').toLowerCase().includes(q))
  return list.slice(0, 80)
})
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const toggleEmp = (id) => {
  const i = form.member_employee_ids.indexOf(id)
  if (i >= 0) form.member_employee_ids.splice(i, 1); else form.member_employee_ids.push(id)
}

/* ── steps ── */
const addStep = () => form.steps.push(mkStep())
const removeStep = (i) => { if (form.steps.length > 1) form.steps.splice(i, 1) }
const move = (i, d) => {
  const j = i + d
  if (j < 0 || j >= form.steps.length) return
  const [it] = form.steps.splice(i, 1)
  form.steps.splice(j, 0, it)
}
const stepShiftOptions = computed(() => [{ value: null, label: '○ OFF — rest block' }, ...props.shifts.map(sh => ({ value: sh.id, label: `${sh.name} (${sh.code})` }))])
const shiftName = (id) => props.shifts.find(s => s.id === id)?.name || null
const stepName = (s) => s.label || shiftName(s.shift_id) || 'OFF'

/* ── cadence helpers ── */
const cycleLabel = computed(() => (CYCLES.find(c => c.key === form.cycle) || {}).label || form.cycle)
const stepDays = computed(() => form.cycle === 'CUSTOM' ? (Number(form.frequency_days) || 1) : (CYCLE_DAYS[form.cycle] || 7))
const projection = computed(() => form.steps.map((s, i) => ({
  label: stepName(s),
  date: form.anchor_date ? isoOffsetDays(i * stepDays.value, new Date(form.anchor_date)) : '—',
})))

const dotStyle = (i, total) => {
  const ang = (i / (total || 1)) * Math.PI * 2 - Math.PI / 2
  const R = 46
  return { left: `calc(50% + ${(R * Math.cos(ang)).toFixed(1)}px)`, top: `calc(50% + ${(R * Math.sin(ang)).toFixed(1)}px)` }
}

/* ── validation / nav ── */
const stepValid = (i) => {
  if (i === 0) return !!form.name.trim() && (form.cycle !== 'CUSTOM' || Number(form.frequency_days) > 0)
  if (i === 1) return form.steps.length > 0
  return true
}
const isValid = computed(() => stepValid(0) && stepValid(1))
const fillPct = computed(() => STEPS.length <= 1 ? 0 : (step.value / (STEPS.length - 1)) * 100)
const stepSubtitle = computed(() => ([
  'Cadence — name, cycle and anchor date',
  'Sequence — order the shift / OFF steps',
  'Crew — members who ride the rotation',
  editing.value ? 'Review and save the cycle' : 'Review and create the cycle',
][step.value] || ''))

const next = () => { if (!stepValid(step.value)) return; if (step.value < STEPS.length - 1) { dir.value = 'fwd'; step.value++; maxReached.value = Math.max(maxReached.value, step.value) } }
const back = () => { if (step.value > 0) { dir.value = 'back'; step.value-- } }
const goto = (i) => { if (i > maxReached.value) return; dir.value = i > step.value ? 'fwd' : 'back'; step.value = i }

const submit = async () => {
  if (!isValid.value) { toast.warning('Please complete the required fields'); return }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(), code: form.code.trim() || null, cycle: form.cycle,
      frequency_days: form.cycle === 'CUSTOM' ? (Number(form.frequency_days) || 7) : null,
      description: form.description || null, anchor_date: form.anchor_date || null,
      department_ids: [],
      steps: form.steps.map((s, i) => ({ sequence: i, shift_id: s.shift_id || null, label: s.label || null })),
      member_employee_ids: form.member_employee_ids,
    }
    if (editing.value) { await updateRotation(props.rotation.id, payload); toast.success('Rotation updated') }
    else { await createRotation(payload); toast.success('Rotation created') }
    emit('saved'); emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save rotation')
  } finally { saving.value = false }
}
</script>

<style scoped>
.wz { display: flex; flex-direction: column; gap: 18px; }

/* ════════ STEPPER ════════ */
.wz-steps { position: relative; display: flex; justify-content: space-between; gap: 4px; }
.wz-steps-line { position: absolute; left: 18px; right: 18px; top: 15px; height: 2px; background: var(--shift-border-soft); border-radius: 2px; z-index: 0; }
.wz-steps-fill { display: block; height: 100%; border-radius: 2px; background: var(--shift-grad-cta); transition: width 0.45s var(--shift-ease); box-shadow: 0 0 10px -2px var(--shift-amber); }
.wz-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; flex: 1; background: none; border: 0; cursor: pointer; padding: 0; }
.wz-step:disabled { cursor: default; }
.wz-step-dot { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--shift-surface-2); border: 1.5px solid var(--shift-border-soft); color: var(--shift-text-dim); transition: all 0.3s var(--shift-spring); }
.wz-step.active .wz-step-dot { background: var(--shift-grad-cta); border-color: transparent; color: #1f1408; box-shadow: 0 0 0 5px rgba(251,191,36,0.14), 0 6px 16px -6px var(--shift-amber); transform: scale(1.08); }
.wz-step.done .wz-step-dot { background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 40%, transparent); color: var(--shift-ok); }
.wz-step.invalid .wz-step-dot { border-color: var(--shift-alert); color: var(--shift-alert); }
.wz-step-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; color: var(--shift-text-dim); transition: color 0.25s; font-family: var(--shift-mono); text-transform: uppercase; }
.wz-step.active .wz-step-label { color: var(--shift-amber); }
.wz-step.done .wz-step-label { color: var(--shift-text-2); }

/* ════════ BODY ════════ */
.wz-body { display: grid; grid-template-columns: 1fr 296px; gap: 20px; align-items: start; }
.wz-pane { min-width: 0; min-height: 300px; }
.wz-step-content { min-height: 300px; }
.wz-fields { display: flex; flex-direction: column; gap: 14px; }
.wz-lead { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); }

.sf-row { display: grid; gap: 12px; }
.sf-row.tri { grid-template-columns: 1fr 1fr 1fr; }
.sf-row.duo { grid-template-columns: 1fr 2fr; }
.sf-field { display: flex; flex-direction: column; gap: 5px; }
.sf-field.wide { grid-column: 1 / -1; }
.sf-field > span { font-size: 11px; color: var(--shift-text-muted); }
.sf-field em { color: var(--shift-amber); font-style: normal; }
.sf-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 9px 11px; color: var(--shift-text); font: inherit; font-size: 13px; transition: border-color 0.2s, box-shadow 0.2s; }
.sf-input.mono { font-family: var(--shift-mono); }
.sf-input:focus { outline: none; border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.sf-input.grow { flex: 1; }
/* strip native number-input spinner arrows */
.sf-input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.sf-input[type="number"]::-webkit-outer-spin-button,
.sf-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }

/* cycle picker */
.cycle-picker { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
.cycle-card { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 12px 13px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: border-color 0.2s, background 0.2s; }
.cycle-card svg { color: var(--shift-text-muted); transition: color 0.2s; }
.cycle-card b { font-size: 13px; color: var(--shift-text); }
.cycle-card small { font-size: 10px; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.cycle-card.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.cycle-card.on svg { color: var(--shift-amber); }

/* sequence */
.seq-list { display: flex; flex-direction: column; gap: 8px; }
.seq-row { display: flex; align-items: center; gap: 8px; }
.seq-no { width: 28px; height: 28px; flex-shrink: 0; border-radius: 9px; display: grid; place-items: center; font-family: var(--shift-mono); font-size: 12px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; }
.seq-no.off { background: rgba(148,163,184,0.16); color: var(--shift-text-dim); }
.seq-lbl { width: 130px; flex-shrink: 0; }
.seq-reorder { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.seq-reorder button { width: 26px; height: 14px; border-radius: 5px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; }
.seq-reorder button:hover:not(:disabled) { color: var(--shift-amber); border-color: var(--shift-border); }
.seq-reorder button:disabled { opacity: 0.35; cursor: not-allowed; }
.seq-del { width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; display: grid; place-items: center; }
.seq-del:disabled { opacity: 0.4; cursor: not-allowed; }

/* crew */
.sf-search { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 12px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); transition: border-color 0.2s; }
.sf-search:focus-within { border-color: var(--shift-amber); }
.sf-search input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.sf-count { font-size: 11px; font-family: var(--shift-mono); color: var(--shift-amber); }
.emps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.emps::-webkit-scrollbar { width: 7px; } .emps::-webkit-scrollbar-thumb { background: var(--shift-border-soft); border-radius: 4px; }
.emp { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; cursor: pointer; text-align: left; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: border-color 0.18s, background 0.18s, transform 0.18s; }
.emp:hover { border-color: var(--shift-border); transform: translateY(-1px); }
.emp.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.emp-av { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 11px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.emp.on .emp-av { background: var(--shift-grad-cta); color: #1f1408; }
.emp-meta { display: flex; flex-direction: column; min-width: 0; }
.emp-meta b { font-size: 12.5px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.emp-meta small { font-size: 10.5px; color: var(--shift-text-muted); }
.emp-ck { margin-left: auto; color: var(--shift-amber); flex-shrink: 0; }
.emps-empty { padding: 24px; text-align: center; color: var(--shift-text-dim); font-size: 12.5px; display: flex; align-items: center; justify-content: center; gap: 8px; }

/* review */
.rv-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.rv-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rv-item span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.rv-item b { font-size: 13px; color: var(--shift-text); font-weight: 700; }
.rv-schedule { border: 1px solid var(--shift-border-soft); border-radius: 13px; padding: 12px 14px; }
.rv-sched-head { display: flex; align-items: center; gap: 7px; font-size: 11px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-amber-strong); margin-bottom: 9px; }
.rv-sched-list { display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; }
.rv-sched-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--shift-text-2); }
.rv-sched-row b { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; font-family: var(--shift-mono); font-size: 9px; background: rgba(251,191,36,0.16); color: var(--shift-amber); flex-shrink: 0; }
.rv-sched-lbl { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv-sched-date { color: var(--shift-text-muted); }

/* ════════ LIVE PREVIEW ════════ */
.wz-preview { position: sticky; top: 0; }
.pv-tag { font-size: 9.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.12em; color: var(--shift-amber-strong); margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px; }
.pv-tag::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 6px var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }
.pv-card { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px; background: var(--shift-surface-2); border: 1px solid var(--shift-border); overflow: hidden; }
.pv-card::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 80% at 0% 0%, rgba(251,191,36,0.1), transparent 60%); }
.pv-card > * { position: relative; z-index: 1; }
.pv-name { font-size: 15px; font-weight: 700; color: var(--shift-text); }
.pv-cadence { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); margin-top: -6px; }
.pv-orbit { position: relative; width: 124px; height: 124px; margin: 6px auto 2px; }
.pv-track { position: absolute; inset: 14px; border-radius: 50%; border: 1px dashed var(--shift-border); }
.pv-sweep { position: absolute; inset: 14px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0deg, transparent 280deg, color-mix(in srgb, var(--shift-amber) 50%, transparent) 350deg, var(--shift-amber-bright) 360deg);
  mask: radial-gradient(circle, transparent 40%, #000 42%); -webkit-mask: radial-gradient(circle, transparent 40%, #000 42%); animation: orbit-spin 5s linear infinite; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
.pv-dot { position: absolute; width: 12px; height: 12px; border-radius: 50%; transform: translate(-50%, -50%); background: var(--shift-amber); border: 2px solid var(--shift-surface-2); box-shadow: 0 0 8px -2px var(--shift-amber); z-index: 2; }
.pv-dot.off { background: var(--shift-text-dim); box-shadow: none; }
.pv-core { position: absolute; inset: 30px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--shift-mono); font-size: 18px; font-weight: 800; color: var(--shift-amber); background: radial-gradient(circle, rgba(251,191,36,0.14), transparent 72%); border: 1px solid var(--shift-border); }
.pv-core small { font-size: 8px; color: var(--shift-text-dim); letter-spacing: 0.1em; text-transform: uppercase; }
.pv-seq { display: flex; flex-wrap: wrap; gap: 5px; }
.pv-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--shift-text-muted); background: var(--shift-surface); border: 1px solid var(--shift-border-soft); padding: 2px 8px 2px 3px; border-radius: 999px; }
.pv-chip b { display: grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; font-size: 8px; background: rgba(251,191,36,0.18); color: var(--shift-amber); }
.pv-chip.off { opacity: 0.7; }
.pv-foot { display: flex; gap: 10px; padding-top: 4px; border-top: 1px solid var(--shift-border-soft); }
.pv-foot span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-text-muted); }
.pv-foot svg { color: var(--shift-amber); }

/* ════════ FOOTER ════════ */
.wz-foot-note { flex: 1; font-size: 11px; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.sf-ghost { padding: 9px 15px; border-radius: 11px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; transition: 0.18s; }
.sf-ghost:hover { border-color: var(--shift-border); color: var(--shift-text); }
.sf-primary { padding: 9px 18px; border-radius: 11px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); transition: 0.2s; }
.sf-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }

/* ════════ STEP TRANSITIONS ════════ */
.wz-fwd-enter-active, .wz-fwd-leave-active, .wz-back-enter-active, .wz-back-leave-active { transition: opacity 0.3s var(--shift-ease), transform 0.3s var(--shift-ease); }
.wz-fwd-enter-from { opacity: 0; transform: translateX(26px); }
.wz-fwd-leave-to { opacity: 0; transform: translateX(-26px); }
.wz-back-enter-from { opacity: 0; transform: translateX(-26px); }
.wz-back-leave-to { opacity: 0; transform: translateX(26px); }
@media (prefers-reduced-motion: reduce) { .wz-fwd-enter-from, .wz-fwd-leave-to, .wz-back-enter-from, .wz-back-leave-to { transform: none; } }

@media (max-width: 780px) {
  .wz-body { grid-template-columns: 1fr; }
  .wz-preview { position: static; order: -1; }
  .sf-row.tri { grid-template-columns: 1fr; }
  .cycle-picker { grid-template-columns: 1fr 1fr; }
  .rv-grid { grid-template-columns: 1fr 1fr; }
  .emps { grid-template-columns: 1fr; }
  .wz-step-label { display: none; }
}

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .pv-dot { border-color: var(--shift-surface-2); }
[data-theme="light"] .seq-no.off { background: rgba(40,32,20,0.1); }
</style>
