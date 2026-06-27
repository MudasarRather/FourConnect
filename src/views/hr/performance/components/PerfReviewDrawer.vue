<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="pd-ov perf-scope"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @click.self="$emit('close')">
        <Motion as="aside" class="pd" :initial="reduced ? false : { x: 70, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
          :exit="{ x: 50, opacity: 0 }" :transition="{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }">
          <span class="pd-edge" aria-hidden="true" />
          <span class="pd-aura" aria-hidden="true" />

          <!-- ── header ── -->
          <header class="pd-head">
            <span class="pd-av">{{ initials }}</span>
            <div class="pd-head-id">
              <b :title="r.employee_name">{{ r.employee_name || '—' }}</b>
              <span>{{ [r.designation_name, r.department_name].filter(Boolean).join(' · ') || r.employee_code || '' }}</span>
            </div>
            <PerfStatusStamp :status="r.status" />
            <button class="pd-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- ── hero score band ── -->
          <div class="pd-hero">
            <div class="pd-gauge" :style="{ '--perf-p': gaugeDeg + 'deg', '--c': scoreColor }">
              <span class="pd-gauge-glow" aria-hidden="true" />
              <div class="pd-gauge-in">
                <span v-if="r.overall_score != null" class="pd-gauge-val">{{ Number(r.overall_score).toFixed(1) }}<i>/{{ max }}</i></span>
                <span v-else class="pd-gauge-val muted">—</span>
                <span class="pd-gauge-lab">Overall</span>
              </div>
            </div>

            <div class="pd-mini">
              <div class="pd-mini-row">
                <div class="pd-mini-cell" :class="{ on: r.self_overall != null }">
                  <span class="pd-mini-k"><PencilRuler :size="11" /> Self</span>
                  <b :style="{ color: tone(r.self_overall) }">{{ fmt(r.self_overall) }}<i>/{{ max }}</i></b>
                </div>
                <div class="pd-mini-cell" :class="{ on: r.manager_overall != null }">
                  <span class="pd-mini-k"><UserCheck :size="11" /> Manager</span>
                  <b :style="{ color: tone(r.manager_overall) }">{{ fmt(r.manager_overall) }}<i>/{{ max }}</i></b>
                </div>
              </div>
              <div class="pd-facts">
                <span class="pd-fact"><CalendarRange :size="12" />{{ r.period_label || r.cycle }}</span>
                <button class="pd-fact link" type="button" @click="goSettings('appraisal-templates')" :title="`Rubric: ${r.template_name || ''}`">
                  <FileText :size="12" />{{ r.template_code || r.template_name || 'rubric' }}<ArrowUpRight :size="10" />
                </button>
                <span class="pd-fact"><UserCheck :size="12" />{{ r.reviewer_name || 'No reviewer' }}</span>
                <span class="pd-fact" :class="{ overdue }"><Clock :size="12" />{{ dueLabel }}</span>
                <span v-if="hikeBadge" class="pd-fact hike" :style="{ '--hc': hikeBadge.color }"><component :is="hikeBadge.icon" :size="12" />{{ hikeBadge.label }}</span>
              </div>
            </div>
          </div>

          <!-- ── flowing workflow stepper ── -->
          <div class="pd-steps" :class="{ cancelled: r.status === 'CANCELLED' }">
            <span class="pd-steps-rail"><span class="pd-steps-fill" :style="{ width: railPct + '%' }" /></span>
            <div v-for="(p, i) in PIPELINE" :key="p.key" class="pd-step" :class="stepClass(i)">
              <span class="pd-step-dot"><component :is="stepClass(i) === 'done' ? Check : p.icon" :size="12" /></span>
              <span class="pd-step-lab">{{ p.label }}</span>
            </div>
          </div>

          <!-- pending-increment nudge (sign-off won't decide pay) -->
          <Presence>
            <Motion v-if="pendingHike && tab !== 'merit'" key="nudge" as="button" type="button" class="pd-nudge"
              :initial="reduced ? false : { opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }" @click="tab = 'merit'">
              <TrendingUp :size="13" />
              <span>A <b>+{{ r.recommended_hike_pct }}%</b> increment is recommended — awaiting your decision.</span>
              <ArrowRight :size="13" />
            </Motion>
          </Presence>

          <!-- ── segmented tabs ── -->
          <div class="pd-tabs">
            <button v-for="t in TABS" :key="t.key" class="pd-tab" :class="{ on: tab === t.key }" type="button" @click="tab = t.key">
              <component :is="t.icon" :size="13" /> {{ t.label }}
              <span v-if="t.key === 'merit' && meritAttention" class="pd-tab-dot" />
            </button>
            <span class="pd-tab-thumb" :style="{ transform: `translateX(${tabIdx * 100}%)`, width: `calc(100% / ${TABS.length})` }" />
          </div>

          <!-- ── body ── -->
          <div class="pd-body">
            <transition :name="reduced ? '' : 'pd-fade'" mode="out-in">
              <div v-if="tab === 'score'" key="score">
                <PerfScoreSheet :draft="draft" :role="editMode ? 'manager' : 'view'" :rating-max="max" :rating-labels="r.rating_labels" :show-overall="false" />
              </div>

              <div v-else-if="tab === 'merit'" key="merit">
                <PerfMeritPanel :review="r" @mutated="onPanelMutated" @go="(t) => $emit('go', t)" />
              </div>

              <div v-else key="timeline" class="pd-timeline">
                <div class="pd-tl-head"><History :size="13" /> Activity trail<span>{{ timeline.filter(e => !e.pending).length }} events</span></div>
                <div class="pd-tl-list">
                  <span class="pd-tl-spine" aria-hidden="true"><span class="pd-tl-spine-fill" /></span>
                  <div v-for="(ev, i) in timeline" :key="i" class="pd-tl" :class="{ pending: ev.pending, latest: i === latestIdx }" :style="{ '--c': ev.color, '--i': i }">
                    <span class="pd-tl-node"><component :is="ev.icon" :size="13" /><span v-if="i === latestIdx" class="pd-tl-pulse" /></span>
                    <div class="pd-tl-card">
                      <div class="pd-tl-row"><b>{{ ev.label }}</b><span class="pd-tl-rel">{{ relTime(ev.date) }}</span></div>
                      <span class="pd-tl-date">{{ ev.date ? fmtDateTime(ev.date) : '—' }}</span>
                    </div>
                  </div>
                </div>
                <p v-if="!timeline.length" class="pd-tl-empty">No activity recorded yet.</p>
              </div>
            </transition>
          </div>

          <!-- acknowledge-with-pending-hike confirm -->
          <Presence>
            <Motion v-if="ackConfirm" key="ackbar" as="div" class="pd-ackbar"
              :initial="reduced ? false : { opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.28 }">
              <div class="pd-ackbar-in">
                <TriangleAlert :size="16" />
                <div class="pd-ackbar-txt">
                  <b>Sign off with a pending increment?</b>
                  <span>A <b>+{{ r.recommended_hike_pct }}%</b> hike is recommended but not yet approved. Acknowledging signs off the assessment — it won’t decide pay.</span>
                </div>
              </div>
              <div class="pd-ackbar-acts">
                <button class="perf-btn" type="button" @click="gotoMerit"><Coins :size="13" /> Decide in Merit &amp; Pay</button>
                <button class="perf-btn perf-btn-primary" type="button" :disabled="busy" @click="doAck">
                  <Loader2 v-if="busy === 'Acknowledge'" :size="13" class="perf-spin" /><BadgeCheck v-else :size="13" /> Acknowledge anyway
                </button>
              </div>
            </Motion>
          </Presence>

          <!-- ── footer ── -->
          <footer class="pd-foot">
            <template v-if="editMode">
              <button class="perf-btn perf-btn-ghost" type="button" @click="cancelEdit">Cancel</button>
              <span class="pd-grow" />
              <button class="perf-btn" type="button" :disabled="saving" @click="saveManager(false)">
                <Loader2 v-if="saving === 'draft'" :size="14" class="perf-spin" /><Check v-else :size="14" /> Save draft
              </button>
              <button class="perf-btn perf-btn-primary" type="button" :disabled="saving" @click="saveManager(true)">
                <Loader2 v-if="saving === 'submit'" :size="14" class="perf-spin" /><CheckCircle2 v-else :size="14" /> Save &amp; complete
              </button>
            </template>
            <template v-else>
              <button class="perf-btn pd-del" type="button" :disabled="busy" @click="$emit('request-delete', r)"><Trash2 :size="14" /></button>
              <span class="pd-grow" />
              <button v-for="a in actions" :key="a.label" class="perf-btn" :class="a.primary ? 'perf-btn-primary' : ''" type="button"
                :disabled="busy" @click="a.fn">
                <Loader2 v-if="busy === a.label" :size="14" class="perf-spin" /><component v-else :is="a.icon" :size="14" /> {{ a.label }}
              </button>
            </template>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Loader2, Check, Trash2, ArrowRight, ArrowUpRight, UserCheck, RotateCcw, CircleSlash, BadgeCheck, CheckCircle2,
  CalendarRange, FileText, Clock, PencilRuler, ClipboardList, Coins, History, FilePlus2, TrendingUp, TriangleAlert } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfScoreSheet from './PerfScoreSheet.vue'
import PerfStatusStamp from './PerfStatusStamp.vue'
import PerfMeritPanel from './PerfMeritPanel.vue'
import { scoreTone, hikeStatusMeta, PIPELINE, STATUS_ORDER, adminManagerScores, transitionReview } from '@/composables/usePerformance'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: { type: Boolean, default: false }, review: { type: Object, default: null } })
const emit = defineEmits(['close', 'mutated', 'go', 'request-delete'])
const toast = useToast()
const router = useRouter()
const reduced = prefersReduced()

const r = reactive({})
const draft = reactive({ sections: [], self_comments: '', manager_comments: '' })
const editMode = ref(false)
const saving = ref(false)
const busy = ref(false)
const tab = ref('score')
const ackConfirm = ref(false)

const TABS = [
  { key: 'score', label: 'Scorecard', icon: ClipboardList },
  { key: 'merit', label: 'Merit & Pay', icon: Coins },
  { key: 'timeline', label: 'Timeline', icon: History },
]
const tabIdx = computed(() => Math.max(0, TABS.findIndex(t => t.key === tab.value)))

const clone = (x) => JSON.parse(JSON.stringify(x || []))
function hydrate(src) {
  Object.keys(r).forEach(k => delete r[k])
  Object.assign(r, src || {})
  // hydrate the scorecard draft so it renders LIVE in view mode (not only when editing)
  draft.sections = clone(src?.sections)
  draft.self_comments = src?.self_comments || ''
  draft.manager_comments = src?.manager_comments || ''
  editMode.value = false
  ackConfirm.value = false
}
watch(() => props.review, (v) => { if (v) hydrate(v) }, { immediate: true })
watch(() => props.open, (v) => { if (v && props.review) { hydrate(props.review); tab.value = 'score' } })

const max = computed(() => r.rating_max || 5)
const initials = computed(() => (r.employee_name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const scoreColor = computed(() => scoreTone(r.overall_score, max.value))
const gaugeDeg = computed(() => r.overall_score != null ? Math.round((r.overall_score / max.value) * 360) : 0)
const curStep = computed(() => STATUS_ORDER.indexOf(r.status))
const railPct = computed(() => r.status === 'CANCELLED' ? 0 : Math.max(0, Math.min(100, (curStep.value / (PIPELINE.length - 1)) * 100)))
const stepClass = (i) => {
  if (r.status === 'CANCELLED') return 'cancel'
  if (i < curStep.value) return 'done'
  if (i === curStep.value) return 'active'
  return ''
}
const tone = (v) => scoreTone(v, max.value)
const fmt = (v) => v == null ? '—' : Number(v).toFixed(1)

const overdue = computed(() => {
  if (!r.due_date || ['COMPLETED', 'ACKNOWLEDGED', 'CANCELLED'].includes(r.status)) return false
  try { return new Date(r.due_date) < new Date() } catch { return false }
})
const dueLabel = computed(() => {
  if (!r.due_date) return 'No due date'
  const d = fmtDate(r.due_date)
  return overdue.value ? `Overdue · ${d}` : `Due ${d}`
})
const hikeBadge = computed(() => (r.hike_status && r.hike_status !== 'NONE') ? hikeStatusMeta(r.hike_status) : null)
const meritAttention = computed(() =>
  (r.status === 'COMPLETED' && ['NONE', 'REJECTED'].includes(r.hike_status || 'NONE')) || r.hike_status === 'RECOMMENDED')
// a recommended-but-undecided increment — acknowledging (sign-off) won't decide it,
// so we surface a nudge + intercept the Acknowledge action with a confirm (no loophole)
const pendingHike = computed(() => r.status === 'COMPLETED' && r.hike_status === 'RECOMMENDED')

// timeline built from review dates
const timeline = computed(() => {
  const evs = []
  const add = (date, label, icon, color, sub) => { if (date) evs.push({ date, label, icon, color, sub }) }
  add(r.created_at, 'Review opened', FilePlus2, 'var(--perf-text-dim)')
  add(r.self_submitted_at, 'Self-reflection submitted', PencilRuler, 'var(--perf-amber)')
  add(r.manager_submitted_at, 'Manager assessment submitted', UserCheck, 'var(--perf-orange)')
  add(r.completed_at, 'Review completed', CheckCircle2, 'var(--perf-gold)')
  add(r.recommended_at, r.recommended_hike_pct != null ? `Hike recommended · ${r.recommended_hike_pct}%` : 'Hike recommended', TrendingUp, 'var(--perf-amber)')
  add(r.approved_at, r.approved_hike_pct != null ? `Hike approved & applied · +${r.approved_hike_pct}%` : 'Hike approved', Coins, 'var(--perf-ok)')
  add(r.acknowledged_at, 'Acknowledged by employee', BadgeCheck, 'var(--perf-ok)')
  evs.sort((a, b) => new Date(a.date) - new Date(b.date))
  if (r.due_date && !['COMPLETED', 'ACKNOWLEDGED', 'CANCELLED'].includes(r.status)) {
    evs.push({ date: r.due_date, label: overdue.value ? 'Due date passed' : 'Due', icon: Clock, color: overdue.value ? 'var(--perf-conflict)' : 'var(--perf-text-dim)', pending: true })
  }
  return evs
})
const latestIdx = computed(() => {
  let idx = -1
  timeline.value.forEach((e, i) => { if (!e.pending) idx = i })
  return idx
})
function relTime(iso) {
  if (!iso) return ''
  try {
    const d = (Date.now() - new Date(iso).getTime()) / 86400000
    if (d < 0) return 'upcoming'
    if (d < 1) return 'today'
    if (d < 2) return 'yesterday'
    if (d < 30) return `${Math.floor(d)}d ago`
    if (d < 365) return `${Math.floor(d / 30)}mo ago`
    return `${Math.floor(d / 365)}y ago`
  } catch { return '' }
}

function startEdit() {
  draft.sections = clone(r.sections)
  draft.self_comments = r.self_comments || ''
  draft.manager_comments = r.manager_comments || ''
  editMode.value = true
  tab.value = 'score'
}
function cancelEdit() { editMode.value = false }

async function saveManager(submit) {
  saving.value = submit ? 'submit' : 'draft'
  try {
    const payload = {
      sections: draft.sections.map(s => ({ key: s.key, rating: s.manager_rating ?? null, comment: s.manager_comment ?? null })),
      comments: draft.manager_comments,
      submit,
    }
    const updated = await adminManagerScores(r.id, payload)
    hydrate(updated)
    emit('mutated', updated)
    toast.success(submit ? 'Review completed' : 'Manager scores saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save scores') }
  finally { saving.value = false }
}

async function doTransition(to, msg, label) {
  busy.value = label
  try {
    const updated = await transitionReview(r.id, { to })
    hydrate(updated)
    emit('mutated', updated)
    toast.success(msg)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { busy.value = false }
}
function onPanelMutated(updated) { hydrate(updated); emit('mutated', updated) }
function goSettings(t) { router.push(`/admin/hr/settings/${t}`) }

// acknowledge: decoupled from comp (Workday/Google standard), but if an increment is
// still RECOMMENDED (undecided) intercept with a confirm so it can't be silently skipped
function requestAck() { if (pendingHike.value) { ackConfirm.value = true } else doAck() }
function doAck() { ackConfirm.value = false; doTransition('ACKNOWLEDGED', 'Acknowledged', 'Acknowledge') }
function gotoMerit() { ackConfirm.value = false; tab.value = 'merit' }

const actions = computed(() => {
  const a = []
  const st = r.status
  if (st === 'SELF_ASSESSMENT') {
    a.push({ label: 'To manager', icon: ArrowRight, fn: () => doTransition('MANAGER_ASSESSMENT', 'Moved to manager review', 'To manager') })
    a.push({ label: 'Score now', icon: UserCheck, primary: true, fn: startEdit })
  } else if (st === 'MANAGER_ASSESSMENT') {
    a.push({ label: 'Back to self', icon: RotateCcw, fn: () => doTransition('SELF_ASSESSMENT', 'Returned to self review', 'Back to self') })
    a.push({ label: 'Score as manager', icon: UserCheck, primary: true, fn: startEdit })
  } else if (st === 'COMPLETED') {
    a.push({ label: 'Re-score', icon: RotateCcw, fn: () => doTransition('MANAGER_ASSESSMENT', 'Reopened for manager', 'Re-score') })
    a.push({ label: 'Acknowledge', icon: BadgeCheck, primary: true, fn: requestAck })
  } else if (st === 'ACKNOWLEDGED') {
    a.push({ label: 'Reopen', icon: RotateCcw, fn: () => doTransition('COMPLETED', 'Reopened', 'Reopen') })
  } else if (st === 'CANCELLED') {
    a.push({ label: 'Reopen', icon: RotateCcw, primary: true, fn: () => doTransition('MANAGER_ASSESSMENT', 'Reopened', 'Reopen') })
  }
  if (['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(st)) {
    a.push({ label: 'Cancel', icon: CircleSlash, fn: () => doTransition('CANCELLED', 'Review cancelled', 'Cancel') })
  }
  return a
})

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso } }
const fmtDateTime = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso } }
</script>

<style scoped>
.pd-ov { position: fixed; inset: 0; z-index: 1300; display: flex; justify-content: flex-end;
  background: rgba(5, 5, 6, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.pd { position: relative; width: min(600px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--perf-surface-elevated); border-left: 1px solid var(--perf-border-strong); box-shadow: -30px 0 80px -40px rgba(0,0,0,0.9); }
.pd-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--perf-grad-hero); opacity: 0.9; z-index: 3; }
.pd-aura { position: absolute; top: -14%; right: -12%; width: 50%; height: 40%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 14%, transparent), transparent 70%); filter: blur(46px); }

.pd-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; padding: 16px 18px 13px; border-bottom: 1px solid var(--perf-border); }
.pd-av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; font-size: 14px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--perf-orange) 70%, transparent); }
.pd-head-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pd-head-id b { font-size: 16px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pd-head-id span { font-size: 11.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pd-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; cursor: pointer;
  color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.pd-x:hover { color: var(--perf-text); transform: rotate(90deg); }

/* hero */
.pd-hero { position: relative; z-index: 1; display: flex; align-items: center; gap: 18px; padding: 16px 18px; }
.pd-gauge { position: relative; width: 88px; height: 88px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); }
.pd-gauge-glow { position: absolute; inset: -6px; border-radius: 50%; pointer-events: none; opacity: 0.5;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 40%, transparent), transparent 70%); filter: blur(10px); }
.pd-gauge-in { position: absolute; inset: 7px; border-radius: 50%; background: var(--perf-surface-elevated); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.pd-gauge-val { font-size: 22px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pd-gauge-val.muted { color: var(--perf-text-dim); }
.pd-gauge-val i { font-size: 11px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.pd-gauge-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-text-muted); }
.pd-mini { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.pd-mini-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pd-mini-cell { display: flex; flex-direction: column; gap: 2px; padding: 7px 11px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); opacity: 0.55; transition: opacity 0.3s; }
.pd-mini-cell.on { opacity: 1; }
.pd-mini-k { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.pd-mini-k :deep(svg) { color: var(--perf-text-dim); }
.pd-mini-cell b { font-size: 18px; font-weight: 850; font-variant-numeric: tabular-nums; line-height: 1; }
.pd-mini-cell b i { font-size: 10px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.pd-facts { display: flex; flex-wrap: wrap; gap: 5px; }
.pd-fact { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 650; color: var(--perf-text-secondary);
  padding: 4px 9px; border-radius: 8px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.pd-fact :deep(svg) { color: var(--perf-gold); flex-shrink: 0; }
.pd-fact.link { cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 650; transition: all 0.18s; }
.pd-fact.link:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.pd-fact.overdue { color: var(--perf-conflict); background: var(--perf-conflict-soft); border-color: color-mix(in srgb, var(--perf-conflict) 28%, transparent); }
.pd-fact.overdue :deep(svg) { color: var(--perf-conflict); }
.pd-fact.hike { color: var(--hc); background: color-mix(in srgb, var(--hc) 12%, transparent); border-color: color-mix(in srgb, var(--hc) 30%, transparent); }
.pd-fact.hike :deep(svg) { color: var(--hc); }

/* stepper */
.pd-steps { position: relative; z-index: 1; display: flex; gap: 6px; padding: 4px 22px 14px; }
.pd-steps-rail { position: absolute; left: 38px; right: 38px; top: 17px; height: 2px; border-radius: 2px; background: var(--perf-track); overflow: hidden; }
.pd-steps-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 2px; background: var(--perf-grad-hero); transition: width 0.7s var(--perf-spring); }
.pd-steps-fill::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: pd-sheen 2.4s linear infinite; }
@keyframes pd-sheen { 0% { transform: translateX(-100%); } 100% { transform: translateX(220%); } }
.pd-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.pd-step-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: var(--perf-text-dim); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.3s; }
.pd-step-lab { font-size: 9px; font-weight: 700; color: var(--perf-text-dim); }
.pd-step.done .pd-step-dot { color: #06281c; background: var(--perf-ok); border-color: transparent; }
.pd-step.active .pd-step-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 14px color-mix(in srgb, var(--perf-gold) 50%, transparent); animation: pd-beat 2.2s ease-in-out infinite; }
@keyframes pd-beat { 0%, 100% { box-shadow: 0 0 12px color-mix(in srgb, var(--perf-gold) 40%, transparent); } 50% { box-shadow: 0 0 20px color-mix(in srgb, var(--perf-gold) 65%, transparent); } }
.pd-step.active .pd-step-lab, .pd-step.done .pd-step-lab { color: var(--perf-text); }
.pd-steps.cancelled .pd-step-dot { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); background: var(--perf-conflict-soft); }

/* tabs */
.pd-tabs { position: relative; z-index: 1; display: flex; margin: 0 18px; padding: 4px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.pd-tab { position: relative; z-index: 1; flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 0; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; color: var(--perf-text-muted); background: none; border: none; transition: color 0.25s; }
.pd-tab.on { color: #1a1206; }
.pd-tab-dot { position: absolute; top: 6px; right: 10px; width: 6px; height: 6px; border-radius: 50%; background: var(--perf-amber); box-shadow: 0 0 7px var(--perf-amber); }
.pd-tab.on .pd-tab-dot { background: #1a1206; box-shadow: none; }
.pd-tab-thumb { position: absolute; z-index: 0; top: 4px; left: 4px; height: calc(100% - 8px); border-radius: 9px; background: var(--perf-grad-hero); box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--perf-orange) 70%, transparent); transition: transform 0.32s var(--perf-spring); }

.pd-body { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 15px 18px; }
.pd-fade-enter-active, .pd-fade-leave-active { transition: opacity 0.2s, transform 0.2s var(--perf-spring); }
.pd-fade-enter-from { opacity: 0; transform: translateY(8px); }
.pd-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* timeline */
.pd-timeline { display: flex; flex-direction: column; gap: 12px; }
.pd-tl-head { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pd-tl-head :deep(svg) { color: var(--perf-gold); }
.pd-tl-head span { margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: 0; text-transform: none; color: var(--perf-text-dim); padding: 3px 8px; border-radius: 999px; background: var(--perf-track); }
.pd-tl-list { position: relative; display: flex; flex-direction: column; gap: 9px; padding-left: 2px; }
.pd-tl-spine { position: absolute; left: 16px; top: 12px; bottom: 18px; width: 2px; border-radius: 2px; background: var(--perf-border); overflow: hidden; }
.pd-tl-spine-fill { position: absolute; inset: 0; background: linear-gradient(180deg, var(--perf-amber), var(--perf-gold), var(--perf-ok));
  transform-origin: top; animation: pd-tl-draw 0.9s var(--perf-spring) both; }
@keyframes pd-tl-draw { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.pd-tl { position: relative; display: flex; align-items: flex-start; gap: 12px;
  animation: pd-tl-in 0.45s var(--perf-spring) both; animation-delay: calc(0.1s + var(--i) * 0.07s); }
@keyframes pd-tl-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
.pd-tl-node { position: relative; z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, var(--perf-surface-elevated)); border: 1.5px solid color-mix(in srgb, var(--c) 38%, transparent);
  box-shadow: 0 4px 12px -6px color-mix(in srgb, var(--c) 60%, transparent); }
.pd-tl.pending .pd-tl-node { border-style: dashed; box-shadow: none; }
.pd-tl-pulse { position: absolute; inset: -2px; border-radius: 50%; border: 1.5px solid var(--c); animation: pd-tl-ring 2.4s ease-out infinite; }
@keyframes pd-tl-ring { 0% { opacity: 0.6; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.7); } }
.pd-tl-card { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 7px 12px; border-radius: 12px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.22s, transform 0.22s; }
.pd-tl:hover .pd-tl-card { border-color: color-mix(in srgb, var(--c) 30%, var(--perf-border)); transform: translateX(2px); }
.pd-tl.latest .pd-tl-card { border-color: color-mix(in srgb, var(--c) 36%, transparent); background: color-mix(in srgb, var(--c) 7%, var(--perf-surface)); }
.pd-tl.pending .pd-tl-card { border-style: dashed; opacity: 0.8; }
.pd-tl-row { display: flex; align-items: baseline; gap: 8px; }
.pd-tl-row b { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 750; color: var(--perf-text); }
.pd-tl-rel { font-size: 10px; font-weight: 700; color: var(--c); white-space: nowrap; }
.pd-tl-date { font-size: 10.5px; color: var(--perf-text-dim); }
.pd-tl-empty { text-align: center; font-size: 12px; color: var(--perf-text-dim); font-style: italic; padding: 20px; }

/* pending-hike nudge */
.pd-nudge { display: flex; align-items: center; gap: 8px; width: calc(100% - 36px); margin: 0 18px 4px; padding: 8px 12px; border-radius: 11px; cursor: pointer; font: inherit; text-align: left;
  color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-amber) 30%, transparent); transition: background 0.2s; }
.pd-nudge:hover { background: color-mix(in srgb, var(--perf-amber) 18%, transparent); }
.pd-nudge span { flex: 1; min-width: 0; font-size: 11.5px; font-weight: 650; color: var(--perf-text-secondary); }
.pd-nudge span b { color: var(--perf-amber); font-weight: 850; }
.pd-nudge :deep(svg) { color: var(--perf-amber); flex-shrink: 0; }

/* acknowledge-with-pending confirm */
.pd-ackbar { overflow: hidden; border-top: 1px solid var(--perf-border); background: color-mix(in srgb, var(--perf-amber) 8%, var(--perf-surface)); }
.pd-ackbar-in { display: flex; gap: 10px; padding: 14px 18px 10px; }
.pd-ackbar-in > :deep(svg) { color: var(--perf-amber); flex-shrink: 0; margin-top: 1px; }
.pd-ackbar-txt { display: flex; flex-direction: column; gap: 2px; }
.pd-ackbar-txt b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.pd-ackbar-txt span { font-size: 11.5px; line-height: 1.45; color: var(--perf-text-muted); }
.pd-ackbar-txt span b { color: var(--perf-amber); }
.pd-ackbar-acts { display: flex; gap: 9px; justify-content: flex-end; padding: 0 18px 14px; }

.pd-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.pd-grow { flex: 1; }
.pd-del { color: var(--perf-text-muted); padding: 9px 11px; }
.pd-del:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); background: var(--perf-conflict-soft); }

@media (max-width: 600px) { .pd { width: 100%; } .pd-mini-row { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .pd-x:hover { transform: none; }
  .pd-steps-fill::after, .pd-step.active .pd-step-dot, .pd-tl, .pd-tl-spine-fill, .pd-tl-pulse { animation: none; }
  .pd-tl:hover .pd-tl-card { transform: none; }
}
</style>
