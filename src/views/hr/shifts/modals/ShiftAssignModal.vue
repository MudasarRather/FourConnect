<template>
  <Teleport to="body">
    <transition name="dep-modal" appear>
      <div v-if="open" class="dep-scrim" @click.self="onClose">
        <!-- ambient drifting motes behind the console -->
        <div class="dep-motes" aria-hidden="true">
          <span v-for="n in 16" :key="n" class="dep-mote" :style="moteStyle(n)" />
        </div>

        <Motion as="div" class="dep-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 30, scale: 0.93, rotateX: -7 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">

          <!-- ambient layers -->
          <div class="dep-aurora" aria-hidden="true">
            <span class="orb a1" /><span class="orb a2" /><span class="orb a3" />
          </div>
          <div class="dep-grid" aria-hidden="true" />
          <div class="dep-scan" aria-hidden="true" />
          <span class="dep-edge" aria-hidden="true" />

          <!-- ═══ HEADER ═══ -->
          <header class="dep-head">
            <div class="dh-row">
              <div class="dh-icon">
                <Rocket :size="19" />
                <span class="dh-icon-ring" /><span class="dh-icon-glow" />
              </div>
              <div class="dh-text">
                <span class="dh-eyebrow"><span class="eye-dot" /> DEPLOYMENT SEQUENCE</span>
                <h2 class="dh-title">{{ shift ? shift.name : 'Assign shift' }}</h2>
                <p class="dh-sub" v-if="shift">
                  Roll <span class="mono">{{ shift.code }}</span> out to your workforce over a defined window
                </p>
              </div>
            </div>
            <button class="dh-close" @click="onClose" aria-label="Close"><X :size="16" /></button>
          </header>

          <!-- ═══ STEP RAIL ═══ -->
          <div class="dep-rail" v-if="!deployed">
            <div class="rail-line"><span class="rail-fill" :style="{ width: railPct + '%' }" /></div>
            <button v-for="s in STEPS" :key="s.n" type="button" class="rail-node"
              :class="{ done: step > s.n, active: step === s.n }"
              :disabled="s.n > maxReached" @click="goStep(s.n)">
              <span class="rn-dot">
                <Check v-if="step > s.n" :size="12" />
                <component v-else :is="s.icon" :size="13" />
              </span>
              <span class="rn-label">{{ s.label }}</span>
            </button>
          </div>

          <!-- ═══ BODY ═══ -->
          <div class="dep-body" v-if="shift">
            <!-- success scene -->
            <transition name="dep-fade">
              <div v-if="deployed" class="dep-success">
                <div class="ds-burst">
                  <span class="ds-ring r1" /><span class="ds-ring r2" /><span class="ds-ring r3" />
                  <span class="ds-check"><Check :size="34" /></span>
                  <span v-for="n in 10" :key="n" class="ds-spark" :style="sparkStyle(n)" />
                </div>
                <h3>Deployment confirmed</h3>
                <p><b>{{ lastDeployCount }}</b> crew now on <span class="mono">{{ shift.code }}</span></p>
              </div>
            </transition>

            <transition v-if="!deployed" :name="stepDir === 'back' ? 'wiz-back' : 'wiz-fwd'" mode="out-in">
              <!-- ─────────────── STEP 1 · WINDOW ─────────────── -->
              <div v-if="step === 1" key="s1" class="wiz-step">
                <Motion as="div" class="shift-brief"
                  :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, ease: [0.16,1,0.3,1] }">
                  <div class="sb-top">
                    <span class="sb-code" :style="{ '--c': typeColor }">{{ shift.code }}</span>
                    <span class="sb-name">{{ shift.name }}</span>
                    <span class="sb-type" :style="{ color: typeColor, borderColor: typeColor }">{{ shift.shift_type }}</span>
                  </div>
                  <ShiftMiniTimeline :start="(shift.start_time || '').slice(0,5)" :end="(shift.end_time || '').slice(0,5)" :color="typeColor" show-now />
                  <div class="sb-facts">
                    <span><Clock :size="12" />{{ shortTime((shift.start_time||'').slice(0,5)) }} – {{ shortTime((shift.end_time||'').slice(0,5)) }}</span>
                    <span v-if="shift.break_minutes != null"><Coffee :size="12" />{{ shift.break_minutes }}m break</span>
                    <span v-if="shift.grace_minutes != null"><Hourglass :size="12" />{{ shift.grace_minutes }}m grace</span>
                  </div>
                </Motion>

                <Motion as="div" class="wiz-block"
                  :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.08, ease: [0.16,1,0.3,1] }">
                  <div class="wb-head"><CalendarRange :size="12" /> Effective window</div>
                  <div class="date-grid">
                    <div class="date-field">
                      <span>From <em>*</em></span>
                      <HrDatePicker v-model="form.effective_from" :max="openEnded ? '' : (form.effective_until || '')" :clearable="false" placeholder="Start date" />
                    </div>
                    <div class="date-field" :class="{ muted: openEnded }">
                      <span>Until {{ openEnded ? '' : '*' }}</span>
                      <HrDatePicker v-model="form.effective_until" :min="form.effective_from || ''" :clearable="false" :disabled="openEnded" :placeholder="openEnded ? 'Open-ended' : 'End date'" />
                    </div>
                  </div>
                  <div class="presets">
                    <button v-for="p in PRESETS" :key="p.key" type="button" class="preset"
                      :class="{ on: activePreset === p.key }" @click="applyPreset(p)">
                      {{ p.label }}
                    </button>
                  </div>
                </Motion>

                <Motion as="div" class="span-readout" :class="{ open: openEnded, bad: !openEnded && daySpan == null }"
                  :initial="{ opacity: 0, scale: 0.96 }" :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.4, delay: 0.16, ease: [0.16,1,0.3,1] }">
                  <InfinityIcon v-if="openEnded" :size="16" /><CalendarClock v-else :size="16" />
                  <span v-if="openEnded">Open-ended — runs until removed</span>
                  <span v-else-if="daySpan != null">Covers <b>{{ daySpan }}</b> day{{ daySpan === 1 ? '' : 's' }}</span>
                  <span v-else class="warn-txt">Pick an end date or choose open-ended</span>
                </Motion>

                <Motion as="button" type="button" class="default-toggle" :class="{ on: form.is_default }"
                  :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.22 }" @click="form.is_default = !form.is_default">
                  <span class="dt-switch"><span class="dt-knob" /></span>
                  <span class="dt-text"><b>Set as primary shift</b><small>Becomes each employee's default roster — clears any "unassigned" flag</small></span>
                  <Star :size="14" class="dt-star" />
                </Motion>
              </div>

              <!-- ─────────────── STEP 2 · CREW ─────────────── -->
              <div v-else-if="step === 2" key="s2" class="wiz-step">
                <Motion as="div" class="crew-bar"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
                  <div class="dep-search">
                    <Search :size="14" />
                    <input v-model="search" placeholder="Search name, code or department…" />
                  </div>
                  <div class="crew-tools">
                    <span class="sel-badge" :class="{ live: form.employee_ids.length }">{{ form.employee_ids.length }} selected</span>
                    <button type="button" class="mini-btn" @click="selectAllVisible" :disabled="!selectableVisible.length">Select all</button>
                    <button type="button" class="mini-btn" @click="form.employee_ids = []" :disabled="!form.employee_ids.length">Clear</button>
                  </div>
                </Motion>

                <div class="dept-chips" v-if="departments.length">
                  <button type="button" class="dchip" :class="{ on: !deptFilter }" @click="deptFilter = null">All</button>
                  <button v-for="d in departments" :key="d" type="button" class="dchip" :class="{ on: deptFilter === d }" @click="deptFilter = deptFilter === d ? null : d">
                    <Building2 :size="11" /> {{ d }}
                  </button>
                </div>

                <div class="crew-grid" v-if="filteredEmps.length">
                  <TransitionGroup name="crew-pop" appear>
                    <button v-for="(e, i) in filteredEmps" :key="e.id" type="button" class="crew-pick"
                      :class="{ on: form.employee_ids.includes(e.id), busy: assignedIds.has(e.id), elsewhere: !!otherShift[e.id] }"
                      :style="{ '--i': Math.min(i, 16) }" @click="toggle(e.id)">
                      <span class="cp-av" :class="{ on: form.employee_ids.includes(e.id) }">{{ initials(e.full_name) }}</span>
                      <span class="cp-meta">
                        <b>{{ e.full_name }}</b>
                        <small>{{ e.employee_code || '—' }}<template v-if="e.department_name"> · {{ e.department_name }}</template></small>
                      </span>
                      <span class="cp-state">
                        <Check v-if="form.employee_ids.includes(e.id)" :size="14" class="cp-ck" />
                        <span v-else-if="assignedIds.has(e.id)" class="cp-tag">on shift</span>
                        <span v-else-if="otherShift[e.id]" class="cp-elsewhere" :title="`Already on ${otherShift[e.id].shift_code}`"><Lock :size="10" /> {{ otherShift[e.id].shift_code }}</span>
                      </span>
                    </button>
                  </TransitionGroup>
                </div>
                <div v-else class="dep-mini-empty">
                  <Loader2 v-if="loadingEmps" :size="15" class="spin" />
                  <Users v-else :size="15" />
                  {{ loadingEmps ? 'Loading crew…' : 'No employees match this filter.' }}
                </div>

                <div v-if="current.length" class="onshift-strip">
                  <span class="oss-head"><UsersRound :size="11" /> Already on {{ shift.code }} ({{ current.length }})</span>
                  <div class="oss-list">
                    <span v-for="a in current" :key="a.id" class="oss-chip">{{ a.employee_name || 'Employee' }}</span>
                  </div>
                </div>
              </div>

              <!-- ─────────────── STEP 3 · DEPLOY ─────────────── -->
              <div v-else key="s3" class="wiz-step">
                <Motion as="div" class="review-grid"
                  :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
                  <div class="rv-card">
                    <span class="rv-label"><Layers3 :size="12" /> Shift</span>
                    <div class="rv-shift">
                      <span class="sb-code" :style="{ '--c': typeColor }">{{ shift.code }}</span>
                      <b>{{ shift.name }}</b>
                    </div>
                    <ShiftMiniTimeline :start="(shift.start_time||'').slice(0,5)" :end="(shift.end_time||'').slice(0,5)" :color="typeColor" :show-labels="true" compact />
                  </div>
                  <div class="rv-card">
                    <span class="rv-label"><CalendarClock :size="12" /> Window</span>
                    <div class="rv-window">
                      <span class="mono">{{ form.effective_from || '—' }}</span>
                      <ArrowRight :size="13" />
                      <span class="mono">{{ openEnded ? 'open' : (form.effective_until || '—') }}</span>
                    </div>
                    <span class="rv-span">{{ openEnded ? 'Open-ended' : (daySpan != null ? daySpan + ' days' : '—') }}<template v-if="form.is_default"> · primary</template></span>
                  </div>
                </Motion>

                <Motion as="div" class="rv-crew"
                  :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
                  <span class="rv-label"><UsersRound :size="12" /> {{ form.employee_ids.length }} crew selected</span>
                  <div class="rv-avs">
                    <span v-for="(e, i) in selectedEmps.slice(0, 14)" :key="e.id" class="rv-av" :style="{ zIndex: 20 - i }" :title="e.full_name">{{ initials(e.full_name) }}</span>
                    <span v-if="selectedEmps.length > 14" class="rv-av more">+{{ selectedEmps.length - 14 }}</span>
                  </div>
                </Motion>

                <Motion as="label" class="notes-block"
                  :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
                  <span class="wb-head"><NotebookPen :size="12" /> Deployment note <small>optional</small></span>
                  <textarea v-model.trim="form.notes" rows="2" maxlength="500" class="dep-textarea"
                    placeholder="e.g. Q3 night coverage ramp-up…" />
                </Motion>

                <transition name="dep-fade">
                  <div v-if="conflicts.length" class="conflict-box">
                    <div class="cb-head"><ShieldAlert :size="14" /> {{ conflicts.length }} conflict{{ conflicts.length === 1 ? '' : 's' }} — these block the deploy</div>
                    <ul>
                      <li v-for="c in conflicts" :key="c.assignment_id">
                        <b>{{ c.employee_name }}</b> already on <span class="mono">{{ c.conflicting_shift_code }}</span>
                        ({{ c.conflicting_from }}<template v-if="c.conflicting_until"> → {{ c.conflicting_until }}</template><template v-else> · open</template>)
                      </li>
                    </ul>
                    <button type="button" class="cb-fix" @click="goStep(2)"><RotateCcw :size="12" /> Adjust crew or window</button>
                  </div>
                </transition>
              </div>
            </transition>
          </div>

          <!-- ═══ FOOTER ═══ -->
          <footer class="dep-foot" v-if="!deployed">
            <span class="foot-ctx">{{ footCtx }}</span>
            <div class="foot-actions">
              <button v-if="step > 1" type="button" class="dep-btn ghost" @click="back" :disabled="assigning"><ArrowLeft :size="14" /> Back</button>
              <button v-else type="button" class="dep-btn ghost" @click="onClose">Cancel</button>

              <button v-if="step < 3" type="button" class="dep-btn primary" :disabled="!stepValid" @click="next">
                {{ step === 1 ? 'Select crew' : 'Review' }} <ArrowRight :size="14" />
              </button>
              <button v-else type="button" class="dep-btn primary deploy" :class="{ armed: canDeploy }" :disabled="!canDeploy" @click="deploy">
                <Loader2 v-if="assigning" :size="15" class="spin" /><Rocket v-else :size="15" />
                {{ assigning ? 'Deploying…' : `Deploy ${form.employee_ids.length} to ${shift?.code || ''}` }}
                <span v-if="canDeploy && !assigning" class="btn-flare" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, UsersRound, Search, Check, Loader2, ShieldAlert, Rocket,
  CalendarRange, CalendarClock, ArrowRight, ArrowLeft, Clock, Coffee, Hourglass,
  Users, Star, NotebookPen, Building2, RotateCcw, Layers3, Lock, Infinity as InfinityIcon,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftMiniTimeline from '../components/ShiftMiniTimeline.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  fetchEmployeesLite, fetchShiftAssignments, assignShiftBulk,
  todayIso, isoOffsetDays, shiftTypeMeta, shortTime,
} from '@/composables/useShifts'

const props = defineProps({
  open: { type: Boolean, default: false },
  shift: { type: Object, default: null },
})
const emit = defineEmits(['close', 'assigned'])
const toast = useToast()

const STEPS = [
  { n: 1, label: 'Window', icon: CalendarRange },
  { n: 2, label: 'Crew', icon: UsersRound },
  { n: 3, label: 'Deploy', icon: Rocket },
]
const PRESETS = [
  { key: '1w', label: '1 week', days: 7 },
  { key: '2w', label: '2 weeks', days: 14 },
  { key: '1m', label: '1 month', days: 30 },
  { key: '3m', label: '3 months', days: 90 },
  { key: 'open', label: 'Open-ended', days: null },
]

const step = ref(1)
const maxReached = ref(1)
const stepDir = ref('fwd')
const openEnded = ref(false)
const employees = ref([])
const current = ref([])
const otherShift = ref({}) // employee_id -> { shift_id, shift_code, shift_name } for crew already on a DIFFERENT active shift
const search = ref('')
const deptFilter = ref(null)
const loadingEmps = ref(false)
const assigning = ref(false)
const deployed = ref(false)
const lastDeployCount = ref(0)
const conflicts = ref([])

const form = reactive({
  employee_ids: [],
  effective_from: todayIso(),
  effective_until: isoOffsetDays(30),
  is_default: true,
  notes: '',
})

const typeColor = computed(() => shiftTypeMeta(props.shift?.shift_type).color)
const railPct = computed(() => ((step.value - 1) / (STEPS.length - 1)) * 100)

// ── window ──
const daySpan = computed(() => {
  if (openEnded.value) return null
  if (!form.effective_from || !form.effective_until) return null
  const a = new Date(form.effective_from), b = new Date(form.effective_until)
  if (isNaN(a) || isNaN(b) || b < a) return null
  return Math.round((b - a) / 86400000)
})
const activePreset = computed(() => {
  if (openEnded.value) return 'open'
  const span = daySpan.value
  if (span == null) return null
  const hit = PRESETS.find(p => p.days === span)
  return hit ? hit.key : null
})
const applyPreset = (p) => {
  if (p.days == null) { openEnded.value = true; form.effective_until = ''; return }
  openEnded.value = false
  form.effective_from = form.effective_from || todayIso()
  form.effective_until = isoOffsetDays(p.days, new Date(form.effective_from))
}

// ── crew ──
const departments = computed(() => {
  const set = new Set()
  for (const e of employees.value) if (e.department_name) set.add(e.department_name)
  return [...set].sort()
})
const filteredEmps = computed(() => {
  const q = search.value.trim().toLowerCase()
  return employees.value.filter(e => {
    if (deptFilter.value && e.department_name !== deptFilter.value) return false
    if (!q) return true
    return (e.full_name || '').toLowerCase().includes(q)
      || (e.employee_code || '').toLowerCase().includes(q)
      || (e.department_name || '').toLowerCase().includes(q)
  }).slice(0, 120)
})
const assignedIds = computed(() => new Set(current.value.map(a => a.employee_id)))
const selectableVisible = computed(() => filteredEmps.value.filter(e => !assignedIds.value.has(e.id) && !otherShift.value[e.id]))
// selDetails caches the employee object at selection time so review-step avatars
// and the count survive server-side search re-fetches (large orgs, >100 employees).
const selDetails = reactive({})
const selectedEmps = computed(() =>
  form.employee_ids.map(id => selDetails[id] || employees.value.find(e => e.id === id)).filter(Boolean))
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

const toggle = (id) => {
  if (assignedIds.value.has(id) && !form.employee_ids.includes(id)) {
    toast.warning('Already on this shift — remove the row from the roster first to re-date.')
    return
  }
  const other = otherShift.value[id]
  if (other && !form.employee_ids.includes(id)) {
    toast.warning(`Already deployed to ${other.shift_code} for an active period — stand them down from that shift first.`)
    return
  }
  const i = form.employee_ids.indexOf(id)
  if (i >= 0) { form.employee_ids.splice(i, 1); delete selDetails[id] }
  else { form.employee_ids.push(id); const e = employees.value.find(x => x.id === id); if (e) selDetails[id] = e }
}
const selectAllVisible = () => {
  selectableVisible.value.forEach(e => {
    if (!form.employee_ids.includes(e.id)) { form.employee_ids.push(e.id); selDetails[e.id] = e }
  })
}

// ── validation / nav ──
const step1Valid = computed(() => !!form.effective_from && (openEnded.value || (!!form.effective_until && daySpan.value != null)))
const step2Valid = computed(() => form.employee_ids.length > 0)
const stepValid = computed(() => step.value === 1 ? step1Valid.value : step.value === 2 ? step2Valid.value : true)
const canDeploy = computed(() => step1Valid.value && step2Valid.value && !assigning.value)

const footCtx = computed(() => {
  if (step.value === 1) return openEnded.value ? 'Open-ended deployment' : (daySpan.value != null ? `${daySpan.value}-day window` : 'Set the window')
  if (step.value === 2) return `${form.employee_ids.length} of ${employees.value.length} selected`
  return conflicts.value.length ? 'Resolve conflicts to deploy' : 'Ready to deploy'
})

const goStep = (n) => {
  if (n > maxReached.value || n === step.value) return
  stepDir.value = n > step.value ? 'fwd' : 'back'
  step.value = n
}
const next = () => {
  if (!stepValid.value) return
  stepDir.value = 'fwd'
  step.value = Math.min(3, step.value + 1)
  maxReached.value = Math.max(maxReached.value, step.value)
}
const back = () => { stepDir.value = 'back'; step.value = Math.max(1, step.value - 1) }

// ── lifecycle ──
const reset = () => {
  step.value = 1; maxReached.value = 1; stepDir.value = 'fwd'
  openEnded.value = false; deployed.value = false; conflicts.value = []
  search.value = ''; deptFilter.value = null
  current.value = []; otherShift.value = {}
  form.employee_ids = []
  for (const k of Object.keys(selDetails)) delete selDetails[k]
  form.effective_from = todayIso()
  form.effective_until = isoOffsetDays(30)
  form.is_default = true
  form.notes = ''
}
watch(() => props.open, async (o) => {
  if (!o || !props.shift) return
  reset()
  await Promise.all([loadEmps(''), loadCurrent()])
})

// Server-side search so crew beyond the first 100 stay findable.
let searchTimer = null
watch(search, (q) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadEmps(q.trim()), 280)
})

const loadEmps = async (q = '') => {
  loadingEmps.value = true
  try { employees.value = await fetchEmployeesLite(q) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load employees') }
  finally { loadingEmps.value = false }
}
const loadCurrent = async () => {
  try {
    // Pull EVERY active assignment so we can flag crew already on a different
    // shift — an employee can only hold one shift over an overlapping window,
    // so the UI blocks double-booking before the backend has to 409.
    const data = await fetchShiftAssignments({ active_on: todayIso() })
    const rows = Array.isArray(data) ? data : (data?.items || [])
    const sid = String(props.shift.id)
    current.value = rows.filter(a => String(a.shift_id) === sid)
    const m = {}
    for (const a of rows) {
      if (String(a.shift_id) !== sid && !m[a.employee_id]) {
        m[a.employee_id] = { shift_id: a.shift_id, shift_code: a.shift_code, shift_name: a.shift_name }
      }
    }
    otherShift.value = m
  } catch { current.value = []; otherShift.value = {} }
}

const deploy = async () => {
  if (!canDeploy.value) return
  assigning.value = true
  conflicts.value = []
  try {
    const res = await assignShiftBulk(props.shift.id, {
      employee_ids: form.employee_ids,
      effective_from: form.effective_from,
      effective_until: openEnded.value ? null : form.effective_until,
      is_default: form.is_default,
      notes: form.notes || null,
    })
    const a = res?.assigned || 0, ext = res?.extended || 0
    lastDeployCount.value = a + ext
    deployed.value = true
    toast.success(`${a} deployed${ext ? `, ${ext} extended` : ''} to ${props.shift.code}`)
    emit('assigned')
    setTimeout(() => { onClose() }, 1500)
  } catch (e) {
    const d = e?.response?.data?.detail
    if (e?.response?.status === 409 && d?.conflicts) {
      conflicts.value = d.conflicts
      toast.error(d.message || 'Assignment conflicts block this deploy')
    } else {
      toast.error((typeof d === 'string' && d) || 'Could not deploy shift')
    }
  } finally { assigning.value = false }
}

const onClose = () => { emit('close') }

// ── decorative ──
const moteStyle = (n) => {
  const x = (n * 47) % 100, y = (n * 83) % 100
  const dur = 7 + ((n * 3) % 8), delay = (n % 6) * 0.5, size = 2 + (n % 3)
  return { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }
}
const sparkStyle = (n) => {
  const ang = (n / 10) * Math.PI * 2
  return { '--dx': `${Math.cos(ang) * 60}px`, '--dy': `${Math.sin(ang) * 60}px`, animationDelay: `${0.1 + n * 0.03}s` }
}
</script>

<style scoped>
/* ═══ SCRIM ═══ */
.dep-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center; padding: 26px;
  background:
    radial-gradient(70% 60% at 50% 35%, rgba(251, 146, 60, 0.16), transparent 65%),
    radial-gradient(90% 90% at 50% 50%, rgba(6, 7, 10, 0.62), rgba(2, 3, 5, 0.78));
  backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%);
  perspective: 1500px; overflow-y: auto;
}
.dep-motes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.dep-mote {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.9), rgba(251, 191, 36, 0));
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); opacity: 0.6;
  animation: dep-float linear infinite;
}
@keyframes dep-float {
  0% { transform: translate3d(0, 18vh, 0) scale(0.6); opacity: 0; }
  15% { opacity: 0.6; } 85% { opacity: 0.6; }
  100% { transform: translate3d(36px, -116vh, 0) scale(1.2); opacity: 0; }
}

/* ═══ MODAL SHELL ═══ */
.dep-modal {
  position: relative; width: 760px; max-width: calc(100vw - 32px); max-height: calc(100vh - 52px);
  display: flex; flex-direction: column; border-radius: 24px; overflow: hidden; isolation: isolate;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, rgba(234, 88, 12, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(18, 20, 24, 0.92), rgba(12, 13, 16, 0.94));
  border: 1px solid var(--shift-border);
  box-shadow: 0 60px 120px -40px rgba(0,0,0,0.92), 0 0 0 1px rgba(251, 191, 36, 0.05), 0 0 100px -16px rgba(251, 146, 60, 0.22);
}
.dep-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.dep-aurora .orb { position: absolute; border-radius: 50%; filter: blur(72px); opacity: 0.5; }
.dep-aurora .a1 { width: 340px; height: 340px; top: -130px; right: -110px; background: radial-gradient(circle, rgba(251, 191, 36, 0.5), transparent 70%); animation: dep-orb-a 19s ease-in-out infinite; }
.dep-aurora .a2 { width: 300px; height: 300px; bottom: -120px; left: -90px; background: radial-gradient(circle, rgba(234, 88, 12, 0.42), transparent 70%); animation: dep-orb-b 23s ease-in-out infinite; }
.dep-aurora .a3 { width: 220px; height: 220px; top: 45%; right: -70px; background: radial-gradient(circle, rgba(245, 158, 11, 0.32), transparent 70%); animation: dep-orb-c 27s ease-in-out infinite; }
@keyframes dep-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-28px,38px) scale(1.08); } }
@keyframes dep-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(34px,-24px) scale(1.1); } }
@keyframes dep-orb-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-14px,16px) scale(0.94); } }
.dep-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(var(--shift-grid-line) 1px, transparent 1px);
  background-size: 22px 22px; opacity: 0.5;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 80%);
}
.dep-scan { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.dep-scan::after {
  content: ''; position: absolute; left: 0; right: 0; height: 90px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.14), transparent); filter: blur(6px);
  transform: translateY(-100%); animation: dep-scan-sweep 1.8s 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
}
@keyframes dep-scan-sweep { to { transform: translateY(100vh); opacity: 0; } }
.dep-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 4; background: var(--shift-grad-cta); }

/* ═══ HEADER ═══ */
.dep-head { position: relative; z-index: 3; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 20px 22px 14px; }
.dh-row { display: flex; align-items: center; gap: 13px; }
.dh-icon { position: relative; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(234, 88, 12, 0.18)); border: 1px solid var(--shift-border); color: var(--shift-amber); box-shadow: 0 10px 28px -12px rgba(251, 146, 60, 0.6); }
.dh-icon-ring { position: absolute; inset: -5px; border-radius: 18px; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, var(--shift-amber), transparent 28%, transparent 55%, var(--shift-ember), transparent 82%);
  -webkit-mask: radial-gradient(transparent 56%, #000 58%); mask: radial-gradient(transparent 56%, #000 58%); animation: dep-ring 6s linear infinite; opacity: 0.8; }
@keyframes dep-ring { to { transform: rotate(360deg); } }
.dh-icon-glow { position: absolute; inset: -16px; border-radius: 28px; pointer-events: none; z-index: -1; background: radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent 65%); animation: dep-glow 3.6s ease-in-out infinite; }
@keyframes dep-glow { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.14); } }
.dh-text { min-width: 0; }
.dh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--shift-amber-strong); }
.eye-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 8px var(--shift-ok); animation: dep-eye 1.6s ease-in-out infinite; }
@keyframes dep-eye { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
.dh-title { margin: 4px 0 2px; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--shift-text); line-height: 1.1; }
.dh-sub { margin: 0; font-size: 12px; color: var(--shift-text-muted); }
.dh-sub .mono, .mono { font-family: var(--shift-mono); color: var(--shift-text-2); }
.dh-close { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: transform .35s var(--shift-spring), background .25s, color .25s; }
.dh-close:hover { transform: rotate(90deg); background: rgba(255,255,255,0.1); color: var(--shift-text); }

/* ═══ STEP RAIL ═══ */
.dep-rail { position: relative; z-index: 3; display: flex; justify-content: space-between; gap: 8px; padding: 4px 30px 16px; }
.rail-line { position: absolute; top: 16px; left: 52px; right: 52px; height: 2px; background: var(--shift-border-soft); border-radius: 2px; overflow: hidden; }
.rail-fill { display: block; height: 100%; background: var(--shift-grad-cta); border-radius: 2px; transition: width 0.5s var(--shift-ease); box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
.rail-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; cursor: pointer; flex: 1; }
.rail-node:disabled { cursor: default; }
.rn-dot { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--shift-surface-2); border: 1.5px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.3s var(--shift-spring); }
.rail-node.active .rn-dot { background: var(--shift-grad-cta); border-color: transparent; color: #1f1408; transform: scale(1.12); box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.7); }
.rail-node.done .rn-dot { background: rgba(52, 211, 153, 0.16); border-color: var(--shift-ok); color: var(--shift-ok); }
.rn-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--shift-text-muted); transition: color 0.3s; }
.rail-node.active .rn-label { color: var(--shift-text); }
.rail-node.done .rn-label { color: var(--shift-text-2); }

/* ═══ BODY ═══ */
.dep-body { position: relative; z-index: 3; flex: 1; min-height: 0; overflow-y: auto; padding: 4px 24px 22px;
  scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.dep-body::-webkit-scrollbar { width: 6px; }
.dep-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(251,191,36,0.3), rgba(234,88,12,0.4)); border-radius: 3px; }
.wiz-step { display: flex; flex-direction: column; gap: 14px; }

/* shift brief */
.shift-brief { display: flex; flex-direction: column; gap: 11px; padding: 15px 16px; border-radius: 16px;
  background: linear-gradient(135deg, var(--shift-surface-2), var(--shift-surface)); border: 1px solid var(--shift-border-soft); }
.sb-top { display: flex; align-items: center; gap: 10px; }
.sb-code { font-family: var(--shift-mono); font-size: 12px; font-weight: 800; padding: 3px 9px; border-radius: 7px;
  color: var(--c, var(--shift-amber)); background: color-mix(in srgb, var(--c, var(--shift-amber)) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c, var(--shift-amber)) 35%, transparent); }
.sb-name { font-size: 14.5px; font-weight: 700; color: var(--shift-text); flex: 1; }
.sb-type { font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
.sb-facts { display: flex; flex-wrap: wrap; gap: 14px; }
.sb-facts span { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--shift-text-muted); }
.sb-facts svg { color: var(--shift-amber); }

/* generic blocks */
.wiz-block { display: flex; flex-direction: column; gap: 10px; }
.wb-head { display: flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-text-muted); }
.wb-head svg { color: var(--shift-amber); }
.wb-head small { margin-left: auto; font-size: 9px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--shift-text-dim); }

.date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.date-field { display: flex; flex-direction: column; gap: 5px; }
.date-field > span { font-size: 11px; color: var(--shift-text-muted); }
.date-field.muted { opacity: 0.55; }
.date-field em { color: var(--shift-amber); font-style: normal; }

.presets { display: flex; flex-wrap: wrap; gap: 7px; }
.preset { padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 11.5px; font-weight: 600;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.18s; }
.preset:hover { border-color: var(--shift-border); color: var(--shift-text); transform: translateY(-1px); }
.preset.on { background: rgba(251,191,36,0.14); border-color: var(--shift-amber); color: var(--shift-amber); }

.span-readout { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; padding: 9px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 600;
  background: var(--shift-ok-soft); border: 1px solid color-mix(in srgb, var(--shift-ok) 30%, transparent); color: var(--shift-ok); }
.span-readout.open { background: rgba(251,191,36,0.12); border-color: var(--shift-border); color: var(--shift-amber); }
.span-readout.bad { background: var(--shift-warn-soft); border-color: color-mix(in srgb, var(--shift-ember) 30%, transparent); color: var(--shift-ember-strong); }
.span-readout b { font-family: var(--shift-mono); font-size: 14px; }
.span-readout .warn-txt { color: var(--shift-ember-strong); }
.span-readout svg { flex-shrink: 0; }

.default-toggle { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.default-toggle:hover { border-color: var(--shift-border); }
.default-toggle.on { background: rgba(251,191,36,0.08); border-color: var(--shift-border); }
.dt-switch { position: relative; width: 38px; height: 22px; border-radius: 999px; background: var(--shift-border-soft); flex-shrink: 0; transition: background 0.25s; }
.default-toggle.on .dt-switch { background: var(--shift-grad-cta); }
.dt-knob { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--shift-text); transition: transform 0.28s var(--shift-spring); }
.default-toggle.on .dt-knob { transform: translateX(16px); background: #1f1408; }
.dt-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.dt-text b { font-size: 12.5px; color: var(--shift-text); }
.dt-text small { font-size: 10.5px; color: var(--shift-text-muted); line-height: 1.4; }
.dt-star { color: var(--shift-text-dim); transition: color 0.25s, transform 0.3s var(--shift-spring); }
.default-toggle.on .dt-star { color: var(--shift-amber); transform: scale(1.15) rotate(8deg); }

/* crew step */
.crew-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dep-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); transition: border-color 0.2s; }
.dep-search:focus-within { border-color: var(--shift-amber); }
.dep-search input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.crew-tools { display: flex; align-items: center; gap: 7px; }
.sel-badge { font-family: var(--shift-mono); font-size: 11px; padding: 5px 10px; border-radius: 999px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.2s; }
.sel-badge.live { background: rgba(251,191,36,0.14); border-color: var(--shift-amber); color: var(--shift-amber); }
.mini-btn { font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 8px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.18s; }
.mini-btn:hover:not(:disabled) { border-color: var(--shift-border); color: var(--shift-text); }
.mini-btn:disabled { opacity: 0.4; cursor: default; }

.dept-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dchip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 600;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.18s; }
.dchip:hover { border-color: var(--shift-border); color: var(--shift-text-2); }
.dchip.on { background: rgba(251,191,36,0.12); border-color: var(--shift-amber); color: var(--shift-amber); }

.crew-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 280px; overflow-y: auto; padding: 2px 4px 2px 2px;
  scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.crew-grid::-webkit-scrollbar { width: 5px; }
.crew-grid::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.3); border-radius: 3px; }
.crew-pick { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: border-color .18s, background .18s, transform .18s; }
.crew-pick:hover { border-color: var(--shift-border); transform: translateY(-1px); }
.crew-pick.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.crew-pick.busy:not(.on) { opacity: 0.55; }
.crew-pick.elsewhere:not(.on) { opacity: 0.62; cursor: not-allowed; }
.crew-pick.elsewhere:not(.on):hover { transform: none; border-color: var(--shift-border-soft); }
.cp-av { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 11px; font-weight: 800; font-family: var(--shift-mono);
  background: rgba(251,191,36,0.14); color: var(--shift-amber); transition: 0.2s; }
.cp-av.on { background: var(--shift-grad-cta); color: #1f1408; }
.cp-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.cp-meta b { font-size: 12.5px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-meta small { font-size: 10.5px; color: var(--shift-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-state { margin-left: auto; flex-shrink: 0; display: grid; place-items: center; }
.cp-ck { color: var(--shift-amber); }
.cp-tag { font-size: 9px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-dim); }
.cp-elsewhere { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-family: var(--shift-mono); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
  padding: 2px 6px; border-radius: 999px; color: var(--shift-ember-strong); background: var(--shift-warn-soft); border: 1px solid color-mix(in srgb, var(--shift-ember) 30%, transparent); }

.dep-mini-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 30px; color: var(--shift-text-dim); font-size: 12.5px; }
.onshift-strip { border-top: 1px dashed var(--shift-border-soft); padding-top: 12px; }
.oss-head { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--shift-text-muted); margin-bottom: 8px; }
.oss-list { display: flex; flex-wrap: wrap; gap: 6px; }
.oss-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }

/* review step */
.review-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 11px; }
.rv-card { display: flex; flex-direction: column; gap: 9px; padding: 14px; border-radius: 14px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rv-label { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-text-muted); }
.rv-label svg { color: var(--shift-amber); }
.rv-shift { display: flex; align-items: center; gap: 9px; }
.rv-shift b { font-size: 13.5px; color: var(--shift-text); }
.rv-window { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--shift-text); }
.rv-window svg { color: var(--shift-text-dim); }
.rv-span { font-family: var(--shift-mono); font-size: 11px; color: var(--shift-amber); }
.rv-crew { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 14px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rv-avs { display: flex; }
.rv-av { width: 30px; height: 30px; border-radius: 50%; margin-left: -7px; display: grid; place-items: center; font-size: 10.5px; font-weight: 800; font-family: var(--shift-mono);
  background: rgba(251,191,36,0.18); color: var(--shift-amber); border: 2px solid var(--shift-surface); }
.rv-av:first-child { margin-left: 0; }
.rv-av.more { background: var(--shift-surface); color: var(--shift-text-muted); }

.notes-block { display: flex; flex-direction: column; gap: 8px; }
.dep-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 10px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; line-height: 1.5; outline: none; transition: border-color .2s, box-shadow .2s; }
.dep-textarea:focus { border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.dep-textarea::placeholder { color: var(--shift-text-dim); }

.conflict-box { border: 1px solid color-mix(in srgb, var(--shift-alert) 36%, transparent); background: var(--shift-alert-soft); border-radius: 13px; padding: 12px 14px; }
.cb-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: var(--shift-alert); margin-bottom: 7px; }
.conflict-box ul { margin: 0 0 8px; padding-left: 18px; }
.conflict-box li { font-size: 12px; color: var(--shift-text-2); line-height: 1.6; }
.cb-fix { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 9px; cursor: pointer; font-size: 11.5px; font-weight: 600;
  background: rgba(239,68,68,0.12); border: 1px solid color-mix(in srgb, var(--shift-alert) 30%, transparent); color: var(--shift-alert); }

/* success scene */
.dep-success { display: grid; place-items: center; text-align: center; gap: 8px; padding: 44px 24px; }
.ds-burst { position: relative; width: 110px; height: 110px; display: grid; place-items: center; margin-bottom: 8px; }
.ds-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--shift-ok); opacity: 0; animation: ds-ring-out 1.1s cubic-bezier(0.16,1,0.3,1) forwards; }
.ds-ring.r2 { animation-delay: 0.12s; }
.ds-ring.r3 { animation-delay: 0.24s; }
@keyframes ds-ring-out { 0% { transform: scale(0.3); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
.ds-check { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 50%; color: #06140f;
  background: linear-gradient(135deg, #6ee7b7, #10b981); box-shadow: 0 18px 40px -12px rgba(16, 185, 129, 0.65);
  animation: ds-pop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes ds-pop { from { transform: scale(0); } to { transform: scale(1); } }
.ds-spark { position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; border-radius: 50%; background: var(--shift-amber);
  animation: ds-spark-fly 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes ds-spark-fly { 0% { transform: translate(-50%,-50%) scale(1); opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0); opacity: 0; } }
.dep-success h3 { margin: 0; font-size: 18px; font-weight: 800; color: var(--shift-text); }
.dep-success p { margin: 0; font-size: 13px; color: var(--shift-text-muted); }
.dep-success p b { color: var(--shift-amber); font-family: var(--shift-mono); }

/* ═══ FOOTER ═══ */
.dep-foot { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 22px; border-top: 1px solid var(--shift-border-soft); background: rgba(12,13,16,0.5); }
.foot-ctx { font-size: 11px; font-family: var(--shift-mono); color: var(--shift-text-dim); }
.foot-actions { display: flex; gap: 9px; }
.dep-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 17px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 700; transition: transform .2s, background .25s, border-color .25s, color .25s, box-shadow .25s; position: relative; overflow: hidden; }
.dep-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dep-btn.ghost { background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.dep-btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: var(--shift-text); transform: translateY(-1px); }
.dep-btn.primary { background: var(--shift-grad-cta); border: none; color: #1f1408; }
.dep-btn.primary:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 12px 28px -10px rgba(251, 146, 60, 0.7); }
.dep-btn.deploy.armed { animation: dep-armed 2s ease-in-out infinite; }
@keyframes dep-armed { 0%,100% { box-shadow: 0 10px 26px -10px rgba(251, 146, 60, 0.6); } 50% { box-shadow: 0 12px 34px -8px rgba(251, 146, 60, 0.85); } }
.btn-flare { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); transform: translateX(-120%); animation: dep-flare 2.6s linear infinite; pointer-events: none; }
@keyframes dep-flare { 0% { transform: translateX(-120%); } 55%,100% { transform: translateX(160%); } }
.spin { animation: shift-spin 0.9s linear infinite; }
.spin :deep(svg) { animation: shift-spin 0.9s linear infinite; }

/* ═══ TRANSITIONS ═══ */
.dep-modal-enter-active { transition: opacity .4s var(--shift-ease); }
.dep-modal-leave-active { transition: opacity .3s ease; }
.dep-modal-enter-from, .dep-modal-leave-to { opacity: 0; }
.dep-modal-leave-active .dep-modal { transition: transform .3s var(--shift-ease), opacity .3s; }
.dep-modal-leave-to .dep-modal { transform: translateY(14px) scale(0.97); opacity: 0; }

.wiz-fwd-enter-active, .wiz-back-enter-active { transition: opacity .32s var(--shift-ease), transform .32s var(--shift-ease); }
.wiz-fwd-leave-active, .wiz-back-leave-active { transition: opacity .2s var(--shift-ease), transform .2s var(--shift-ease); }
.wiz-fwd-enter-from { opacity: 0; transform: translateX(26px); }
.wiz-fwd-leave-to { opacity: 0; transform: translateX(-22px); }
.wiz-back-enter-from { opacity: 0; transform: translateX(-26px); }
.wiz-back-leave-to { opacity: 0; transform: translateX(22px); }

.dep-fade-enter-active { transition: opacity .35s var(--shift-ease), transform .35s var(--shift-ease); }
.dep-fade-leave-active { transition: opacity .2s ease; }
.dep-fade-enter-from { opacity: 0; transform: translateY(8px); }
.dep-fade-leave-to { opacity: 0; }

/* crew list stagger */
.crew-pop-enter-active { transition: opacity .4s var(--shift-ease), transform .4s var(--shift-ease); transition-delay: calc(var(--i, 0) * 0.025s); }
.crew-pop-enter-from { opacity: 0; transform: translateY(10px) scale(0.97); }
.crew-pop-leave-active { transition: opacity .2s ease; position: absolute; }
.crew-pop-leave-to { opacity: 0; }

@media (max-width: 680px) {
  .dep-modal { width: 100%; }
  .date-grid, .crew-grid, .review-grid { grid-template-columns: 1fr; }
  .dep-rail { padding: 4px 16px 14px; }
  .rail-line { left: 40px; right: 40px; }
}
@media (prefers-reduced-motion: reduce) {
  .dep-mote, .dep-aurora .orb, .dep-scan::after, .dh-icon-ring, .dh-icon-glow, .btn-flare, .ds-ring, .ds-spark, .dep-btn.deploy.armed { animation: none; }
}

/* ═══════════════ LIGHT THEME OVERRIDES ═══════════════ */
[data-theme="light"] .dep-scrim {
  background:
    radial-gradient(70% 60% at 50% 35%, rgba(251, 146, 60, 0.16), transparent 65%),
    radial-gradient(90% 90% at 50% 50%, rgba(40, 30, 18, 0.22), rgba(30, 22, 14, 0.34));
}
[data-theme="light"] .dep-modal {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.16), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, rgba(234, 88, 12, 0.12), transparent 60%),
    rgba(255, 251, 245, 0.96);
  border-color: var(--shift-border);
  box-shadow: 0 60px 120px -40px rgba(40, 25, 10, 0.32), 0 0 0 1px rgba(217, 119, 6, 0.1), 0 0 90px -16px rgba(251, 146, 60, 0.2);
}
[data-theme="light"] .dep-aurora .orb { opacity: 0.3; }
[data-theme="light"] .dep-grid { opacity: 0.35; }
[data-theme="light"] .dh-close { background: rgba(40,25,10,0.05); color: var(--shift-text-2); }
[data-theme="light"] .dh-close:hover { background: rgba(40,25,10,0.1); }
[data-theme="light"] .dep-btn.ghost { background: rgba(40,25,10,0.04); color: var(--shift-text-2); }
[data-theme="light"] .dep-btn.ghost:hover:not(:disabled) { background: rgba(40,25,10,0.09); color: var(--shift-text); }
[data-theme="light"] .dep-foot { background: rgba(252, 245, 232, 0.6); }
[data-theme="light"] .rn-dot { background: var(--shift-surface-2); }
[data-theme="light"] .ds-check { color: #fff; }
</style>
