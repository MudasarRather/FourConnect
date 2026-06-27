<template>
  <!-- Self-service Improvement-Plan drawer — "Recovery Monitor". mode='employee' → read +
       acknowledge; mode='manager' → run the plan (edit context/objectives, log check-ins,
       activate / extend / close). HR keeps cancel/reopen/delete in the admin module. -->
  <teleport to="body">
    <Presence>
      <Motion v-if="open && m.id" key="ov" as="div" class="spd-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="aside" class="spd" :class="{ over: overdue, reduced }" :style="{ '--c': meta.color }"
          :initial="{ x: 580, opacity: 0.5 }" :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: 580, opacity: 0.35 }" :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">

          <!-- ── cinematic backdrop ── -->
          <div class="spd-bg" aria-hidden="true">
            <span class="spd-bg-mesh" />
            <span class="spd-bg-grid" />
            <span class="spd-orb o1" /><span class="spd-orb o2" />
          </div>
          <span class="spd-edge" aria-hidden="true" />

          <!-- ── header ── -->
          <header class="spd-head">
            <span class="spd-av">
              <span class="spd-av-ring" aria-hidden="true" />
              {{ initials }}
            </span>
            <div class="spd-titles">
              <span class="spd-eyebrow"><span class="spd-eyebrow-dot" /> {{ mode === 'manager' ? 'Recovery monitor' : 'Your improvement plan' }}</span>
              <b>{{ mode === 'manager' ? m.employee_name : m.title }}</b>
              <span>{{ mode === 'manager' ? (m.designation_name || m.department_name || 'Improvement plan') : (m.employee_name || '') }}</span>
            </div>
            <span class="spd-stamp"><component :is="meta.icon" :size="11" />{{ meta.label }}</span>
            <button class="spd-x" type="button" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <!-- ── the monitor (signature instrument) ── -->
          <div class="spd-monitor">
            <div class="spd-ecg">
              <span class="spd-ecg-grid" aria-hidden="true" />
              <svg class="spd-ecg-svg" viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
                <path class="spd-ecg-ghost" :d="ecgPath" />
                <path class="spd-ecg-line" :d="ecgPath" />
              </svg>
              <span class="spd-ecg-scan" aria-hidden="true" />
              <span class="spd-ecg-cap"><Zap :size="10" /> Recovery pulse <em>· {{ checkInCount }} check-in{{ checkInCount === 1 ? '' : 's' }}</em></span>
            </div>

            <div class="spd-vitals2">
              <div class="spd-ring2" :style="{ '--perf-p': objDeg + 'deg' }">
                <span class="spd-ring2-in"><b>{{ metCount }}</b><i>/{{ objCount }}</i></span>
                <span class="spd-ring2-lab">objectives met</span>
              </div>
              <div class="spd-window2" :class="{ over: overdue }">
                <span class="spd-window2-top"><CalendarClock :size="13" /> <b>{{ timeLabel }}</b></span>
                <span class="spd-window2-bar"><i :style="{ width: windowPct + '%' }" /></span>
                <span class="spd-window2-sub">{{ windowLabel || 'No window set' }}</span>
              </div>
            </div>
          </div>

          <!-- ── lifecycle stepper ── -->
          <div class="spd-steps">
            <template v-for="(s, i) in lifecycle" :key="s.key">
              <div class="spd-step" :class="{ done: s.done, current: s.current }" :style="{ '--sc': s.color }">
                <span class="spd-step-node"><component :is="s.icon" :size="13" /></span>
                <span class="spd-step-lab">{{ s.label }}</span>
              </div>
              <span v-if="i < lifecycle.length - 1" class="spd-step-conn" :class="{ filled: s.done, flow: s.current }" />
            </template>
          </div>

          <!-- employee ack ribbon -->
          <div v-if="mode === 'employee' && m.employee_ack_at" class="spd-ackbar"><BadgeCheck :size="14" /> You acknowledged this plan on {{ fmtShort(m.employee_ack_at) }}</div>

          <!-- ── body ── -->
          <div class="spd-body">
            <!-- context -->
            <section class="spd-sec">
              <h4 class="spd-h"><span class="spd-h-ic"><AlertTriangle :size="12" /></span> Reason for the plan</h4>
              <textarea v-if="mode === 'manager'" v-model="form.reason" class="spd-area" rows="2" placeholder="What performance gap prompted this plan?" />
              <p v-else class="spd-read">{{ m.reason || '— Not specified' }}</p>
            </section>
            <div class="spd-row2">
              <section class="spd-sec">
                <h4 class="spd-h"><span class="spd-h-ic"><Target :size="12" /></span> Expectations</h4>
                <textarea v-if="mode === 'manager'" v-model="form.expectations" class="spd-area" rows="2" placeholder="The standard to reach." />
                <p v-else class="spd-read">{{ m.expectations || '— Not specified' }}</p>
              </section>
              <section class="spd-sec">
                <h4 class="spd-h"><span class="spd-h-ic"><LifeBuoy :size="12" /></span> Support offered</h4>
                <textarea v-if="mode === 'manager'" v-model="form.support" class="spd-area" rows="2" placeholder="Coaching / resources offered." />
                <p v-else class="spd-read">{{ m.support || '— Not specified' }}</p>
              </section>
            </div>

            <!-- schedule (manager editable) -->
            <div v-if="mode === 'manager'" class="spd-row2">
              <section class="spd-sec">
                <h4 class="spd-h"><span class="spd-h-ic"><CalendarRange :size="12" /></span> Start date</h4>
                <HrDatePicker v-model="form.start_date" placeholder="dd / mm / yyyy" />
              </section>
              <section class="spd-sec">
                <h4 class="spd-h"><span class="spd-h-ic"><Flag :size="12" /></span> Target end date</h4>
                <HrDatePicker v-model="form.end_date" :min="form.start_date || ''" placeholder="dd / mm / yyyy" />
              </section>
            </div>

            <!-- objectives -->
            <section class="spd-sec">
              <h4 class="spd-h"><span class="spd-h-ic"><Target :size="12" /></span> Objectives <span class="spd-h-tally">{{ metCount }}/{{ objCount }} met</span></h4>
              <PipObjectivesEditor v-if="mode === 'manager'" :objectives="form.objectives" :manage="true" @add="addObjective" @remove="removeObjective" @set-status="setObjStatus" />
              <div v-else class="spd-objs-read">
                <div v-for="(o, i) in (m.objectives || [])" :key="i" class="spd-obj-read" :style="{ '--c': ostColor(o.status) }">
                  <span class="spd-obj-st"><component :is="ostIcon(o.status)" :size="11" />{{ ostLabel(o.status) }}</span>
                  <div class="spd-obj-txt"><b>{{ o.title }}</b><span v-if="o.measure || o.target">{{ [o.measure, o.target].filter(Boolean).join(' · ') }}</span></div>
                </div>
                <p v-if="!(m.objectives || []).length" class="spd-read">No objectives set yet.</p>
              </div>
            </section>

            <!-- check-ins -->
            <section class="spd-sec">
              <h4 class="spd-h"><span class="spd-h-ic"><MessageSquarePlus :size="12" /></span> Check-ins</h4>
              <div v-if="orderedCheckIns.length" class="spd-timeline">
                <div v-for="(c, i) in orderedCheckIns" :key="i" class="spd-ci">
                  <span class="spd-ci-dot" :class="{ ack: c.kind === 'ack' }" aria-hidden="true" />
                  <div class="spd-ci-body">
                    <div class="spd-ci-head">
                      <span v-if="c.rating" class="spd-ci-rating" :class="ratingClass(c.rating)">{{ c.rating }}</span>
                      <span v-else-if="c.kind === 'ack'" class="spd-ci-rating ok"><BadgeCheck :size="10" /> Acknowledged</span>
                      <span class="spd-ci-at"><Clock :size="11" /> {{ fmtShort(c.at) }}</span>
                      <span v-if="c.by" class="spd-ci-by">{{ c.by }}</span>
                    </div>
                    <p class="spd-ci-note">{{ c.note }}</p>
                  </div>
                </div>
              </div>
              <p v-else class="spd-read">No check-ins logged yet.</p>

              <!-- manager: add check-in -->
              <div v-if="mode === 'manager' && isOpen" class="spd-ci-form">
                <div class="spd-ci-presets">
                  <button v-for="r in CHECK_RATINGS" :key="r.key" type="button" class="spd-ci-preset" :class="[ratingClass(r.key), { on: ci.rating === r.key }]" @click="ci.rating = (ci.rating === r.key ? '' : r.key)"><component :is="r.icon" :size="12" /> {{ r.key }}</button>
                </div>
                <div class="spd-ci-row">
                  <input v-model="ci.note" class="spd-input" placeholder="Log a check-in note…" @keyup.enter="logCheckIn" />
                  <button class="perf-btn perf-btn-primary" type="button" :disabled="!ci.note.trim() || busy" @click="logCheckIn">
                    <Loader2 v-if="busy === 'ci'" :size="14" class="perf-spin" /><MessageSquarePlus v-else :size="14" /> Log
                  </button>
                </div>
              </div>
            </section>

            <!-- outcome -->
            <section v-if="mode === 'manager' || m.outcome" class="spd-sec">
              <h4 class="spd-h"><span class="spd-h-ic"><FileText :size="12" /></span> Outcome / closing note</h4>
              <textarea v-if="mode === 'manager'" v-model="form.outcome" class="spd-area" rows="2" placeholder="Summary of the plan's result — recorded on close." />
              <p v-else class="spd-read">{{ m.outcome }}</p>
            </section>

            <!-- employee acknowledge -->
            <section v-if="mode === 'employee' && isOpen && !m.employee_ack_at" class="spd-ackbox">
              <div class="spd-ackbox-h"><BellRing :size="14" /> Acknowledge receipt</div>
              <p>Confirm you’ve read and understood this plan. Your manager runs the check-ins; this records that you received it.</p>
              <input v-model="ackNote" class="spd-input" placeholder="Optional note to your manager…" />
            </section>
          </div>

          <!-- ── footer ── -->
          <footer class="spd-foot">
            <template v-if="mode === 'manager'">
              <button class="perf-btn perf-btn-ghost" type="button" :disabled="busy" @click="save">
                <Loader2 v-if="busy === 'save'" :size="14" class="perf-spin" /><Check v-else :size="14" /> Save
              </button>
              <span class="spd-grow" />
              <button v-for="a in transitions" :key="a.to" class="perf-btn" :class="a.primary ? 'perf-btn-primary' : ''" type="button" :disabled="busy" @click="doTransition(a)">
                <Loader2 v-if="busy === a.to" :size="14" class="perf-spin" /><component v-else :is="a.icon" :size="14" /> {{ a.label }}
              </button>
              <span v-if="!transitions.length" class="spd-hr-note"><Lock :size="11" /> Closed — HR reopens</span>
            </template>
            <template v-else>
              <button class="perf-btn perf-btn-ghost" type="button" @click="$emit('close')">Close</button>
              <span class="spd-grow" />
              <button v-if="isOpen && !m.employee_ack_at" class="perf-btn perf-btn-primary" type="button" :disabled="busy" @click="acknowledge">
                <Loader2 v-if="busy === 'ack'" :size="14" class="perf-spin" /><BadgeCheck v-else :size="14" /> Acknowledge plan
              </button>
              <span v-else-if="m.employee_ack_at" class="spd-acked"><BadgeCheck :size="14" /> Acknowledged</span>
            </template>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Loader2, Check, Target, LifeBuoy, AlertTriangle, Flag, CalendarRange, CalendarClock,
  MessageSquarePlus, FileText, Clock, BadgeCheck, BellRing, Lock, Zap,
  Activity, CheckCircle2, MinusCircle, CircleDot, CirclePlay, ArrowRight, Smile, Meh, Frown,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { seededWave, prefersReduced } from '@/composables/useShiftMotion'
import PipObjectivesEditor from './PipObjectivesEditor.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  pipStatusMeta, acknowledgeMyPip, updateTeamPip, teamPipCheckIn, teamPipTransition,
} from '@/composables/usePerformance'

const props = defineProps({
  open: { type: Boolean, default: false },
  pip: { type: Object, default: null },
  mode: { type: String, default: 'employee' },   // 'employee' | 'manager'
})
const emit = defineEmits(['close', 'mutated'])
const toast = useToast()
const reduced = prefersReduced()

const m = reactive({})
const form = reactive({ reason: '', expectations: '', support: '', start_date: '', end_date: '', outcome: '', objectives: [] })
const ci = reactive({ note: '', rating: '' })
const ackNote = ref('')
const busy = ref(false)

let objSeq = 0
const keyed = (arr) => (Array.isArray(arr) ? arr : []).map(o => ({ title: o.title || '', measure: o.measure || '', target: o.target || '', status: o.status || 'OPEN', _k: 'o' + (objSeq++) }))

function hydrate(src) {
  Object.keys(m).forEach(k => delete m[k])
  Object.assign(m, src || {})
  form.reason = src?.reason || ''
  form.expectations = src?.expectations || ''
  form.support = src?.support || ''
  form.start_date = (src?.start_date || '').slice(0, 10)
  form.end_date = (src?.end_date || '').slice(0, 10)
  form.outcome = src?.outcome || ''
  form.objectives = keyed(src?.objectives)
}
watch(() => props.open, (v) => { if (v && props.pip) { hydrate(props.pip); ci.note = ''; ci.rating = ''; ackNote.value = '' } })

const meta = computed(() => pipStatusMeta(m.status))
const initials = computed(() => {
  const n = props.mode === 'manager' ? m.employee_name : (m.employee_name || m.title)
  return (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
})
const objCount = computed(() => form.objectives.filter(o => (o.title || '').trim()).length || (m.objectives || []).length)
const metCount = computed(() => (props.mode === 'manager' ? form.objectives : (m.objectives || [])).filter(o => o.status === 'MET').length)
const objDeg = computed(() => objCount.value ? Math.round(metCount.value / objCount.value * 360) : 0)
const isOpen = computed(() => ['ACTIVE', 'EXTENDED'].includes(m.status))
const overdue = computed(() => isOpen.value && m.end_date && new Date(m.end_date) < new Date())
const checkInCount = computed(() => (m.check_ins || []).length)
const timeLabel = computed(() => {
  if (['SUCCESSFUL', 'UNSUCCESSFUL', 'CANCELLED'].includes(m.status)) return 'Closed'
  if (!m.end_date) return 'No deadline'
  const days = Math.round((new Date(m.end_date).getTime() - Date.now()) / 86400000)
  if (days < 0) return `${-days}d overdue`
  if (days === 0) return 'Due today'
  return `${days}d left`
})
const windowLabel = computed(() => {
  if (!m.start_date || !m.end_date) return ''
  const d = Math.round((new Date(m.end_date) - new Date(m.start_date)) / 86400000)
  return d > 0 ? `${d}-day window` : ''
})
const windowPct = computed(() => {
  if (!m.start_date || !m.end_date) return 0
  const s = new Date(m.start_date).getTime(), e = new Date(m.end_date).getTime()
  if (!(e > s)) return 0
  return Math.max(0, Math.min(100, Math.round(((Date.now() - s) / (e - s)) * 100)))
})

// lifecycle stepper: Draft → Active/Extended → Outcome
const STATUS_STAGE = { DRAFT: 0, ACTIVE: 1, EXTENDED: 1, SUCCESSFUL: 2, UNSUCCESSFUL: 2, CANCELLED: 2 }
const lifecycle = computed(() => {
  const cur = STATUS_STAGE[m.status] ?? 0
  const outcome = m.status === 'SUCCESSFUL' ? { label: 'Recovered', color: 'var(--perf-ok)', icon: CheckCircle2 }
    : m.status === 'UNSUCCESSFUL' ? { label: 'Unsuccessful', color: 'var(--perf-conflict)', icon: MinusCircle }
    : m.status === 'CANCELLED' ? { label: 'Cancelled', color: 'var(--perf-unset)', icon: MinusCircle }
    : { label: 'Outcome', color: 'var(--perf-text-dim)', icon: Flag }
  return [
    { key: 'draft', label: 'Draft', icon: CircleDot, color: 'var(--perf-amber)' },
    { key: 'active', label: m.status === 'EXTENDED' ? 'Extended' : 'Active', icon: Activity, color: 'var(--perf-gold)' },
    { key: 'outcome', label: outcome.label, icon: outcome.icon, color: outcome.color },
  ].map((s, i) => ({ ...s, done: i < cur, current: i === cur }))
})

const orderedCheckIns = computed(() => [...(m.check_ins || [])].sort((a, b) => new Date(b.at) - new Date(a.at)))
const fmtShort = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return iso; return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
const ratingClass = (r) => r === 'Improving' ? 'good' : r === 'On-track' ? 'mid' : r === 'No change' ? 'low' : ''

const OST = { OPEN: { label: 'Open', color: 'var(--perf-amber)', icon: CircleDot }, MET: { label: 'Met', color: 'var(--perf-ok)', icon: CheckCircle2 }, MISSED: { label: 'Missed', color: 'var(--perf-conflict)', icon: MinusCircle } }
const ostLabel = (s) => (OST[s] || OST.OPEN).label
const ostColor = (s) => (OST[s] || OST.OPEN).color
const ostIcon = (s) => (OST[s] || OST.OPEN).icon

const CHECK_RATINGS = [{ key: 'Improving', icon: Smile }, { key: 'On-track', icon: Meh }, { key: 'No change', icon: Frown }]

const MGR_TRANSITIONS = {
  DRAFT: [{ to: 'ACTIVE', label: 'Activate plan', icon: CirclePlay, primary: true }],
  ACTIVE: [{ to: 'EXTENDED', label: 'Extend', icon: CalendarRange }, { to: 'SUCCESSFUL', label: 'Mark recovered', icon: CheckCircle2, primary: true, outcome: true }, { to: 'UNSUCCESSFUL', label: 'Unsuccessful', icon: MinusCircle, outcome: true }],
  EXTENDED: [{ to: 'SUCCESSFUL', label: 'Mark recovered', icon: CheckCircle2, primary: true, outcome: true }, { to: 'UNSUCCESSFUL', label: 'Unsuccessful', icon: MinusCircle, outcome: true }, { to: 'ACTIVE', label: 'Back to active', icon: ArrowRight }],
}
const transitions = computed(() => props.mode === 'manager' ? (MGR_TRANSITIONS[m.status] || []) : [])

// objectives editing (manager, local until Save)
function addObjective() { form.objectives.push({ title: '', measure: '', target: '', status: 'OPEN', _k: 'o' + (objSeq++) }) }
function removeObjective(i) { form.objectives.splice(i, 1) }
function setObjStatus(i, status) { form.objectives[i].status = status }
const cleanObjectives = () => form.objectives.filter(o => (o.title || '').trim()).map(o => ({ title: o.title.trim(), measure: (o.measure || '').trim(), target: (o.target || '').trim(), status: o.status || 'OPEN' }))

const ecgPath = computed(() => {
  const rated = (m.check_ins || []).filter(c => c.rating).map(c => ({ Improving: 0.92, 'On-track': 0.6, 'No change': 0.28 }[c.rating] ?? 0.5))
  let vals = rated
  if (vals.length < 2) { const seed = (m.id || 'pip').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0); vals = seededWave(seed, 12) }
  const n = vals.length, W = 320, H = 100, pad = 6
  return vals.map((v, i) => { const x = pad + (i / (n - 1)) * (W - pad * 2); const y = H - pad - v * (H - pad * 2); return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) }).join(' ')
})

async function save() {
  busy.value = 'save'
  try {
    const updated = await updateTeamPip(m.id, {
      reason: form.reason.trim() || null, expectations: form.expectations.trim() || null,
      support: form.support.trim() || null, start_date: form.start_date || null,
      end_date: form.end_date || null, outcome: form.outcome.trim() || null, objectives: cleanObjectives(),
    })
    hydrate(updated); emit('mutated', updated); toast.success('Plan saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save') }
  finally { busy.value = false }
}
async function logCheckIn() {
  if (!ci.note.trim()) return
  busy.value = 'ci'
  try {
    const payload = { note: ci.note.trim() }; if (ci.rating) payload.rating = ci.rating
    const updated = await teamPipCheckIn(m.id, payload); hydrate(updated); emit('mutated', updated)
    ci.note = ''; ci.rating = ''; toast.success('Check-in logged')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to log check-in') }
  finally { busy.value = false }
}
async function doTransition(a) {
  busy.value = a.to
  try {
    const payload = { to: a.to }; if (a.outcome && form.outcome.trim()) payload.outcome = form.outcome.trim()
    const updated = await teamPipTransition(m.id, payload); hydrate(updated); emit('mutated', updated)
    toast.success(`${a.label} · ${pipStatusMeta(a.to).label}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { busy.value = false }
}
async function acknowledge() {
  busy.value = 'ack'
  try {
    const updated = await acknowledgeMyPip(m.id, { note: ackNote.value.trim() || undefined })
    hydrate(updated); emit('mutated', updated); toast.success('Plan acknowledged')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to acknowledge') }
  finally { busy.value = false }
}
</script>

<style scoped>
/* Recovery Monitor drawer — cinematic ECG + lifecycle stepper. */
.spd-ov { position: fixed; inset: 0; z-index: 1320; display: flex; justify-content: flex-end;
  background: rgba(5, 5, 6, 0.62); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.spd { position: relative; width: min(560px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  --c: var(--perf-gold);
  background: var(--perf-surface-elevated); border-left: 1px solid var(--perf-border-strong); box-shadow: -48px 0 100px -42px rgba(0,0,0,0.85); }

/* ── cinematic backdrop ── */
.spd-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.spd-bg-mesh { position: absolute; inset: -20%;
  background:
    radial-gradient(40% 30% at 80% 8%, color-mix(in srgb, var(--c) 26%, transparent), transparent 70%),
    radial-gradient(46% 34% at 8% 86%, color-mix(in srgb, var(--perf-orange) 18%, transparent), transparent 72%);
  filter: blur(8px); animation: spd-mesh 22s var(--perf-ease) infinite alternate; }
.spd-bg-grid { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(var(--perf-border) 1px, transparent 1px), linear-gradient(90deg, var(--perf-border) 1px, transparent 1px);
  background-size: 40px 40px; mask-image: radial-gradient(circle at 80% 0%, #000, transparent 72%); -webkit-mask-image: radial-gradient(circle at 80% 0%, #000, transparent 72%); }
.spd-orb { position: absolute; border-radius: 50%; filter: blur(60px); }
.spd-orb.o1 { width: 260px; height: 260px; top: -120px; right: -70px; background: radial-gradient(circle, color-mix(in srgb, var(--c) 42%, transparent), transparent 70%); opacity: 0.5; animation: spd-drift 17s var(--perf-ease) infinite alternate; }
.spd-orb.o2 { width: 240px; height: 240px; bottom: -130px; left: -60px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 40%, transparent), transparent 70%); opacity: 0.4; animation: spd-drift 21s var(--perf-ease) infinite alternate-reverse; }
.spd-edge { position: absolute; top: 0; left: 0; bottom: 0; width: 3px; z-index: 2;
  background: linear-gradient(180deg, transparent, var(--c), var(--perf-orange), var(--c), transparent); background-size: 100% 280%; animation: spd-edge 5s linear infinite; }

.spd-head, .spd-monitor, .spd-steps, .spd-ackbar, .spd-body, .spd-foot { position: relative; z-index: 1; }

/* ── header ── */
.spd-head { display: flex; align-items: center; gap: 12px; padding: 18px 18px 14px; border-bottom: 1px solid var(--perf-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 7%, transparent), transparent); }
.spd-av { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; font-size: 14px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.spd-av-ring { position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--c) 55%, transparent); animation: spd-spin 14s linear infinite; }
.spd-av-ring::before { content: ''; position: absolute; top: -3px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.spd-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.spd-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-gold); }
.spd-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 8px var(--perf-gold); animation: spd-pulse 2s ease-in-out infinite; }
.spd-titles b { font-size: 16px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spd-titles > span:last-child { font-size: 11.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spd-stamp { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; font-size: 10.5px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.spd-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.spd-x:hover { color: var(--perf-text); border-color: var(--perf-border-warm); transform: rotate(90deg); }

/* ── the monitor ── */
.spd-monitor { display: flex; align-items: stretch; gap: 12px; padding: 14px 18px 12px;
  animation: spd-fade 0.6s var(--perf-spring) 0.08s backwards; }
.spd-ecg { position: relative; flex: 1; min-width: 0; height: 100px; border-radius: 14px; overflow: hidden;
  background: linear-gradient(180deg, color-mix(in srgb, var(--perf-noir, #000) 30%, var(--perf-surface)), color-mix(in srgb, var(--perf-noir, #000) 12%, var(--perf-surface)));
  border: 1px solid var(--perf-border); box-shadow: inset 0 0 30px rgba(0,0,0,0.4); }
.spd-ecg-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--c) 16%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--c) 16%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; animation: spd-griddrift 6s linear infinite; }
.spd-ecg-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.spd-ecg-ghost { fill: none; stroke: color-mix(in srgb, var(--perf-text-muted) 22%, transparent); stroke-width: 1.4; }
.spd-ecg-line { fill: none; stroke: var(--c); stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 60%, transparent));
  stroke-dasharray: 460; stroke-dashoffset: 460; animation: spd-draw 1.3s var(--perf-ease) 0.25s forwards, spd-glow 3s ease-in-out 1.6s infinite; }
.spd-ecg-scan { position: absolute; top: 0; bottom: 0; left: 0; width: 2px;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--c) 90%, #fff), transparent);
  box-shadow: 0 0 14px 2px color-mix(in srgb, var(--c) 70%, transparent); opacity: 0.8; animation: spd-scan 3.4s linear 1.2s infinite; }
.spd-ecg-cap { position: absolute; bottom: 4px; left: 9px; display: inline-flex; align-items: center; gap: 4px; font-size: 8.5px; font-weight: 850; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-secondary); }
.spd-ecg-cap em { font-style: normal; color: var(--perf-text-muted); }
.spd-ecg-cap :deep(svg) { color: var(--c); }

.spd-vitals2 { display: flex; flex-direction: column; gap: 10px; width: 150px; flex-shrink: 0; }
.spd-ring2 { position: relative; width: 56px; height: 56px; margin: 2px auto 12px; border-radius: 50%;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0deg); transition: --perf-p 1s var(--perf-spring);
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 32%, transparent)); }
.spd-ring2-in { position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-surface-elevated); display: flex; align-items: baseline; justify-content: center; }
.spd-ring2-in b { font-size: 17px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.spd-ring2-in i { font-size: 10px; font-style: normal; color: var(--perf-text-muted); }
.spd-ring2-lab { position: absolute; bottom: -15px; left: -16px; right: -16px; text-align: center; font-size: 8px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-muted); }
.spd-window2 { display: flex; flex-direction: column; gap: 5px; padding: 9px 11px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.spd-window2-top { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }
.spd-window2-top :deep(svg) { color: var(--c); flex-shrink: 0; }
.spd-window2-top b { font-size: 13px; font-weight: 850; color: var(--perf-text); }
.spd-window2-bar { height: 5px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.spd-window2-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--c), var(--perf-orange)); transition: width 1s var(--perf-spring); }
.spd-window2-sub { font-size: 9.5px; color: var(--perf-text-muted); }
.spd-window2.over .spd-window2-top b { color: var(--perf-conflict); }
.spd-window2.over .spd-window2-top :deep(svg) { color: var(--perf-conflict); }
.spd-window2.over .spd-window2-bar i { background: linear-gradient(90deg, var(--perf-conflict), #fb7185); }

/* ── lifecycle stepper ── */
.spd-steps { display: flex; align-items: center; gap: 0; padding: 4px 22px 14px; border-bottom: 1px solid var(--perf-border);
  animation: spd-fade 0.6s var(--perf-spring) 0.14s backwards; }
.spd-step { display: flex; flex-direction: column; align-items: center; gap: 5px; flex-shrink: 0; --sc: var(--perf-unset); }
.spd-step-node { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  color: var(--perf-text-dim); background: var(--perf-surface); border: 1.5px solid var(--perf-border-strong); transition: all 0.3s var(--perf-spring); }
.spd-step-lab { font-size: 10px; font-weight: 750; color: var(--perf-text-muted); white-space: nowrap; transition: color 0.3s; }
.spd-step.done .spd-step-node { color: #1a1206; background: var(--sc); border-color: transparent; }
.spd-step.current .spd-step-node { color: var(--sc); background: color-mix(in srgb, var(--sc) 16%, transparent); border-color: var(--sc); box-shadow: 0 0 0 4px color-mix(in srgb, var(--sc) 16%, transparent); animation: spd-nodepulse 2s ease-in-out infinite; }
.spd-step.done .spd-step-lab, .spd-step.current .spd-step-lab { color: var(--perf-text); }
.spd-step-conn { flex: 1; height: 2px; margin: 0 4px; margin-bottom: 20px; border-radius: 2px; background: var(--perf-border-strong); position: relative; overflow: hidden; }
.spd-step-conn.filled { background: linear-gradient(90deg, var(--perf-amber), var(--perf-gold)); }
.spd-step-conn.flow::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--perf-gold) 85%, transparent), transparent); animation: spd-flow 1.8s linear infinite; }

.spd-ackbar { display: flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 11.5px; font-weight: 700; color: var(--perf-ok); background: var(--perf-ok-soft); border-bottom: 1px solid color-mix(in srgb, var(--perf-ok) 22%, var(--perf-border)); }

/* ── body ── */
.spd-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 15px; }
.spd-body > * { animation: spd-fade 0.5s var(--perf-spring) backwards; }
.spd-body > *:nth-child(1) { animation-delay: 0.18s; } .spd-body > *:nth-child(2) { animation-delay: 0.23s; }
.spd-body > *:nth-child(3) { animation-delay: 0.28s; } .spd-body > *:nth-child(4) { animation-delay: 0.33s; }
.spd-body > *:nth-child(5) { animation-delay: 0.38s; } .spd-body > *:nth-child(n+6) { animation-delay: 0.43s; }
.spd-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.spd-sec { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.spd-h { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 11px; font-weight: 850; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); }
.spd-h-ic { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.spd-h-tally { margin-left: auto; text-transform: none; letter-spacing: 0; font-size: 10.5px; font-weight: 850; color: var(--perf-gold); }
.spd-read { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--perf-text-secondary); white-space: pre-wrap; word-break: break-word; }
.spd-area, .spd-input { width: 100%; padding: 10px 12px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, box-shadow 0.2s; }
.spd-area { resize: vertical; line-height: 1.5; min-height: 54px; }
.spd-input { height: 40px; }
.spd-area:focus, .spd-input:focus { outline: none; border-color: var(--perf-border-warm); box-shadow: 0 0 0 3px color-mix(in srgb, var(--perf-gold) 12%, transparent); }

.spd-objs-read { display: flex; flex-direction: column; gap: 7px; }
.spd-obj-read { display: flex; align-items: flex-start; gap: 10px; padding: 9px 11px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); border-left: 3px solid var(--c); --c: var(--perf-amber); }
.spd-obj-st { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.spd-obj-txt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.spd-obj-txt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); }
.spd-obj-txt span { font-size: 10.5px; color: var(--perf-text-muted); }

.spd-timeline { display: flex; flex-direction: column; gap: 0; padding-left: 4px; }
.spd-ci { position: relative; display: flex; gap: 12px; padding: 0 0 12px 14px; border-left: 2px solid var(--perf-border); }
.spd-ci:last-child { border-left-color: transparent; padding-bottom: 2px; }
.spd-ci-dot { position: absolute; left: -6px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--perf-grad-hero); box-shadow: 0 0 0 3px var(--perf-surface-elevated), 0 0 10px color-mix(in srgb, var(--perf-gold) 60%, transparent); }
.spd-ci-dot.ack { background: var(--perf-ok); box-shadow: 0 0 0 3px var(--perf-surface-elevated), 0 0 10px color-mix(in srgb, var(--perf-ok) 60%, transparent); }
.spd-ci-body { flex: 1; min-width: 0; }
.spd-ci-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.spd-ci-rating { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.spd-ci-rating.good, .spd-ci-rating.ok { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 30%, transparent); }
.spd-ci-rating.mid { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 13%, transparent); border-color: color-mix(in srgb, var(--perf-amber) 30%, transparent); }
.spd-ci-rating.low { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.spd-ci-at { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.spd-ci-at :deep(svg) { color: var(--perf-text-dim); }
.spd-ci-by { font-size: 10.5px; color: var(--perf-text-dim); }
.spd-ci-note { margin: 3px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--perf-text-secondary); white-space: pre-wrap; word-break: break-word; }
.spd-ci-form { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--perf-border); }
.spd-ci-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.spd-ci-preset { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 650; color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.spd-ci-preset:hover { border-color: var(--perf-border-warm); }
.spd-ci-preset.on.good { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 36%, transparent); }
.spd-ci-preset.on.mid { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 13%, transparent); border-color: color-mix(in srgb, var(--perf-amber) 36%, transparent); }
.spd-ci-preset.on.low { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); border-color: color-mix(in srgb, var(--perf-conflict) 36%, transparent); }
.spd-ci-row { display: flex; gap: 8px; }
.spd-ci-row .spd-input { flex: 1; }

.spd-ackbox { display: flex; flex-direction: column; gap: 8px; padding: 13px 14px; border-radius: 13px; background: color-mix(in srgb, var(--perf-gold) 7%, var(--perf-panel)); border: 1px solid var(--perf-border-warm); }
.spd-ackbox-h { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 850; color: var(--perf-gold); }
.spd-ackbox p { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-muted); }

/* ── footer ── */
.spd-foot { display: flex; align-items: center; gap: 8px; padding: 13px 18px; border-top: 1px solid var(--perf-border); flex-wrap: wrap;
  background: linear-gradient(0deg, color-mix(in srgb, var(--c) 5%, transparent), transparent); }
.spd-grow { flex: 1; }
.spd-hr-note { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--perf-text-muted); }
.spd-acked { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: var(--perf-ok); }

/* ── keyframes ── */
@keyframes spd-draw { to { stroke-dashoffset: 0; } }
@keyframes spd-glow { 0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 45%, transparent)); } 50% { filter: drop-shadow(0 0 9px color-mix(in srgb, var(--c) 75%, transparent)); } }
@keyframes spd-scan { 0% { left: -2%; opacity: 0; } 10% { opacity: 0.85; } 90% { opacity: 0.85; } 100% { left: 102%; opacity: 0; } }
@keyframes spd-griddrift { from { background-position: 0 0; } to { background-position: 22px 0; } }
@keyframes spd-mesh { from { transform: translate(0, 0) scale(1); } to { transform: translate(-26px, 22px) scale(1.08); } }
@keyframes spd-drift { from { transform: translate(0, 0); } to { transform: translate(-26px, 20px); } }
@keyframes spd-edge { to { background-position: 0 280%; } }
@keyframes spd-spin { to { transform: rotate(360deg); } }
@keyframes spd-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
@keyframes spd-nodepulse { 0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--sc) 16%, transparent); } 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--sc) 8%, transparent); } }
@keyframes spd-flow { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes spd-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

@media (max-width: 560px) {
  .spd-row2 { grid-template-columns: 1fr; }
  .spd-monitor { flex-direction: column; }
  .spd-vitals2 { width: auto; flex-direction: row; align-items: center; }
  .spd-ring2 { margin: 2px 0; } .spd-ring2-lab { display: none; } .spd-window2 { flex: 1; }
}

/* ── reduced motion ── */
.spd.reduced .spd-bg-mesh, .spd.reduced .spd-orb, .spd.reduced .spd-edge, .spd.reduced .spd-ecg-grid,
.spd.reduced .spd-ecg-scan, .spd.reduced .spd-ecg-line, .spd.reduced .spd-av-ring, .spd.reduced .spd-eyebrow-dot,
.spd.reduced .spd-step.current .spd-step-node, .spd.reduced .spd-step-conn.flow::after { animation: none; }
.spd.reduced .spd-ecg-line { stroke-dashoffset: 0; }
.spd.reduced .spd-monitor, .spd.reduced .spd-steps, .spd.reduced .spd-body > * { animation: none; opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .spd-bg-mesh, .spd-orb, .spd-edge, .spd-ecg-grid, .spd-ecg-scan, .spd-ecg-line, .spd-av-ring, .spd-eyebrow-dot,
  .spd-step.current .spd-step-node, .spd-step-conn.flow::after { animation: none; }
  .spd-ecg-line { stroke-dashoffset: 0; }
  .spd-monitor, .spd-steps, .spd-body > * { animation: none; opacity: 1; transform: none; }
  .spd-x:hover { transform: none; }
  .spd-ring2, .spd-window2-bar i { transition: none; }
}
</style>
