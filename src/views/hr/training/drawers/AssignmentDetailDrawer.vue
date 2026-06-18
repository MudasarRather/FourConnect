<template>
  <TrnDrawer :open="open" eyebrow="Enrollment" :title="assignment?.employee_name || ''" :icon="UserRound" @close="$emit('close')">
    <template v-if="assignment">
     <div class="ad-stack">

      <!-- ── status console: medallion + identity + trajectory ── -->
      <Motion as="section" class="ad-hero" :style="{ '--sc': ringColor }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
        <span class="ad-hero-aura" aria-hidden="true" />
        <span class="ad-hero-grain trn-grain" aria-hidden="true" />

        <div class="ad-hero-top">
          <!-- medallion -->
          <div class="ad-medal">
            <span class="ad-medal-glow" aria-hidden="true" />
            <span v-if="stage.status === 'IN_PROGRESS' && !isOverdue" class="ad-medal-comet" aria-hidden="true"><i /></span>
            <svg :viewBox="`0 0 ${MEDAL} ${MEDAL}`" class="ad-medal-svg">
              <circle :cx="MC" :cy="MC" :r="MR" fill="none" :stroke-width="MS" class="ad-medal-track" />
              <circle :cx="MC" :cy="MC" :r="MR" fill="none" :stroke-width="MS" stroke-linecap="round" class="ad-medal-arc"
                :stroke="ringColor" :stroke-dasharray="medalCirc" :stroke-dashoffset="ready ? medalOffset : medalCirc"
                :transform="`rotate(-90 ${MC} ${MC})`" />
            </svg>
            <span class="ad-medal-core" :style="{ color: ringColor }">
              <component :is="stage.icon" :size="26" :class="{ spin: stage.status === 'IN_PROGRESS' && !isOverdue }" />
            </span>
          </div>

          <!-- identity + stamps -->
          <div class="ad-id">
            <span class="ad-id-avatar" aria-hidden="true">{{ initialOf(assignment.employee_name) }}</span>
            <div class="ad-id-meta">
              <strong class="ad-id-name">{{ assignment.employee_name || 'Unknown learner' }}</strong>
              <span class="ad-id-prog"><BookOpen :size="12" /> {{ assignment.program_name || '—' }}</span>
            </div>
            <div class="ad-id-stamps">
              <TrnStatusStamp :status="assignment.status" kind="assignment" />
              <TrnTypeBadge :type="assignment.program_type" />
              <span v-if="assignment.process_id" class="ad-chip linked"><Link2 :size="11" /> Onboarding-linked</span>
            </div>
          </div>
        </div>

        <!-- verdict line -->
        <Motion v-if="verdict" as="div" class="ad-verdict" :class="verdict.tone"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.16 }">
          <component :is="verdict.icon" :size="14" />
          <span>{{ verdict.text }}</span>
        </Motion>

        <!-- stage trajectory -->
        <div class="ad-hero-traj">
          <TrnTrajectory :key="assignment.id + assignment.status" :status="assignment.status" :overdue="isOverdue" />
        </div>
      </Motion>

      <!-- ── journey timeline ── -->
      <Motion as="section" class="ad-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="ad-card-h"><Route :size="12" /> Journey timeline</h4>
        <ol class="ad-tl">
          <Motion v-for="(n, i) in timeline" :key="n.key" as="li" class="ad-tl-row" :class="{ lit: n.lit }" :style="{ '--nc': n.color }"
            :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.4, delay: 0.16 + i * 0.08, ease: [0.16, 1, 0.3, 1] }">
            <span class="ad-tl-dot"><component :is="n.icon" :size="13" /></span>
            <div class="ad-tl-body">
              <span class="ad-tl-lab">{{ n.label }}</span>
              <span class="ad-tl-date">{{ n.date ? fmtDate(n.date) : '—' }}</span>
            </div>
            <span class="ad-tl-rel">{{ n.rel }}</span>
          </Motion>
        </ol>
        <div v-if="completionDuration" class="ad-tl-foot">
          <Hourglass :size="13" /> Turnaround <b>{{ completionDuration }}</b> from assignment to completion
        </div>
      </Motion>

      <!-- ── score meter (only when graded) ── -->
      <Motion v-if="hasScore" as="section" class="ad-card ad-score" :style="{ '--sc': scoreColor }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
        <div class="ad-score-top">
          <span class="ad-score-ic"><Gauge :size="15" /></span>
          <div class="ad-score-meta">
            <span class="ad-score-lab">Assessment score</span>
            <span class="ad-score-val trn-mono"><TrnCountUp :value="scoreNum" /><i>/ 100</i></span>
          </div>
        </div>
        <div class="ad-score-bar"><span class="ad-score-fill" :style="{ width: (ready ? scorePct : 0) + '%' }" /></div>
      </Motion>

      <!-- ── program context ── -->
      <Motion as="section" class="ad-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="ad-card-h"><BookOpen :size="12" /> Program details</h4>

        <div v-if="program" class="ad-prog-flags">
          <span v-if="program.certification_required" class="ad-chip ok"><Award :size="11" /> Awards certificate</span>
          <span v-if="program.is_compliance" class="ad-chip warn"><ShieldCheck :size="11" /> Compliance</span>
          <span v-if="program.is_mandatory_for_new_joiners" class="ad-chip"><UserPlus :size="11" /> Joiner-mandatory</span>
          <span class="ad-chip" :class="program.is_active ? 'ok' : 'off'"><span class="ad-fdot" /> {{ program.is_active ? 'Active' : 'Inactive' }}</span>
        </div>

        <dl class="ad-facts">
          <div class="ad-fact"><dt><Hash :size="11" /> Code</dt><dd class="trn-mono">{{ program?.code || '—' }}</dd></div>
          <div class="ad-fact"><dt><Clock :size="11" /> Duration</dt><dd>{{ program?.duration_hours ? program.duration_hours + ' h' : '—' }}</dd></div>
          <div class="ad-fact"><dt><MonitorPlay :size="11" /> Delivery</dt><dd class="cap">{{ prettyMode(program?.delivery_mode) }}</dd></div>
          <div class="ad-fact"><dt><Presentation :size="11" /> Trainer</dt><dd>{{ program?.trainer_name || '—' }}</dd></div>
        </dl>

        <p v-if="program?.description" class="ad-about">{{ program.description }}</p>

        <a v-if="program?.materials_url" class="ad-link" :href="program.materials_url" target="_blank" rel="noopener">
          <FileText :size="14" /> Open training materials <ExternalLink :size="12" />
        </a>
      </Motion>

      <!-- ── certificate ── -->
      <Motion v-if="assignment.certification_url" as="a" class="ad-cert" :href="assignment.certification_url" target="_blank" rel="noopener"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.26 }"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.98 }">
        <span class="ad-cert-ic"><Award :size="16" /></span>
        <span class="ad-cert-meta"><strong>Certificate of completion</strong><span>Issued for this enrollment</span></span>
        <ExternalLink :size="14" />
      </Motion>

      <!-- ── notes ── -->
      <Motion v-if="assignment.notes" as="section" class="ad-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="ad-card-h"><StickyNote :size="12" /> Notes</h4>
        <p class="ad-notes">{{ assignment.notes }}</p>
      </Motion>

     </div>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-danger ad-del" title="Remove enrollment" @click="$emit('delete', assignment)"><Trash2 :size="14" /></button>
      <button class="trn-btn trn-btn-ghost" @click="$emit('update', assignment)"><Pencil :size="14" /> Update progress</button>
      <button class="trn-btn trn-btn-primary" @click="$emit('close')">Done</button>
    </template>
  </TrnDrawer>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  UserRound, BookOpen, Award, ExternalLink, Pencil, Link2, Trash2,
  Route, CalendarClock, Flag, CheckCircle2, XCircle, MinusCircle, Hourglass,
  Circle, Loader, Gauge, Hash, Clock, MonitorPlay, Presentation, ShieldCheck,
  UserPlus, FileText, StickyNote, AlarmClock, CalendarCheck, CalendarDays, Sparkles,
} from 'lucide-vue-next'
import TrnDrawer from '../components/TrnDrawer.vue'
import TrnTypeBadge from '../components/TrnTypeBadge.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import TrnTrajectory from '../components/TrnTrajectory.vue'
import TrnCountUp from '../components/TrnCountUp.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  assignment: { type: Object, default: null },
  programs: { type: Array, default: () => [] },
})
defineEmits(['close', 'update', 'delete'])

// ── medallion geometry ──
const MEDAL = 104, MS = 8
const MC = MEDAL / 2
const MR = MEDAL / 2 - MS
const medalCirc = 2 * Math.PI * MR

// trigger arc / bar fills after the panel paints
const ready = ref(false)
watch(() => props.open, async (o) => {
  ready.value = false
  if (o) { await nextTick(); requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })) }
})

// ── date helpers ──
const MS_DAY = 86400000
const plural = (n) => (Math.abs(n) === 1 ? '' : 's')
const parseDate = (d) => {
  if (!d) return null
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? null : dt
}
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const dayDiff = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / MS_DAY) // to − from, in days
const fmtDate = (d) => {
  const dt = parseDate(d)
  return dt ? dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
const relFromToday = (d) => {
  const dt = parseDate(d)
  if (!dt) return '—'
  const n = dayDiff(new Date(), dt)
  if (n === 0) return 'today'
  return n < 0 ? `${-n} day${plural(n)} ago` : `in ${n} day${plural(n)}`
}
const initialOf = (n) => (n ? n.trim().charAt(0).toUpperCase() : '?')
const prettyMode = (m) => (m ? String(m).replace(/_/g, ' ').toLowerCase() : '—')

// ── resolve the full program record (richer than the assignment snapshot) ──
const program = computed(() => {
  const pid = props.assignment?.program_id
  if (!pid) return null
  return (props.programs || []).find(p => String(p.id) === String(pid)) || null
})

// ── status stage → medallion + colors ──
const OPEN = new Set(['NOT_STARTED', 'IN_PROGRESS'])
const STAGE = {
  NOT_STARTED: { status: 'NOT_STARTED', pct: 4, color: 'var(--trn-st-not-started)', icon: Circle },
  IN_PROGRESS: { status: 'IN_PROGRESS', pct: 52, color: 'var(--trn-st-in-progress)', icon: Loader },
  COMPLETED:   { status: 'COMPLETED', pct: 100, color: 'var(--trn-st-completed)', icon: CheckCircle2 },
  FAILED:      { status: 'FAILED', pct: 100, color: 'var(--trn-st-failed)', icon: XCircle },
  WAIVED:      { status: 'WAIVED', pct: 100, color: 'var(--trn-st-waived)', icon: MinusCircle },
}
const stage = computed(() => STAGE[props.assignment?.status] || STAGE.NOT_STARTED)

const isOverdue = computed(() => {
  const a = props.assignment
  if (!a?.due_date || !OPEN.has(a.status)) return false
  const due = parseDate(a.due_date)
  return !!due && startOfDay(due) < startOfDay(new Date())
})

const ringColor = computed(() => (isOverdue.value ? 'var(--trn-st-failed)' : stage.value.color))
const medalOffset = computed(() => medalCirc * (1 - stage.value.pct / 100))

// ── verdict (the punchy insight line) ──
const verdict = computed(() => {
  const a = props.assignment
  if (!a) return null
  const due = parseDate(a.due_date)
  const comp = parseDate(a.completion_date)

  if (a.status === 'COMPLETED') {
    if (due && comp) {
      const d = dayDiff(due, comp) // comp − due
      if (d > 0) return { tone: 'bad', icon: AlarmClock, text: `Completed ${d} day${plural(d)} after the due date` }
      if (d < 0) return { tone: 'good', icon: CalendarCheck, text: `Completed ${-d} day${plural(d)} before the due date` }
      return { tone: 'good', icon: CalendarCheck, text: 'Completed right on the due date' }
    }
    return { tone: 'good', icon: CheckCircle2, text: 'Completed' }
  }
  if (a.status === 'FAILED') return { tone: 'bad', icon: XCircle, text: 'Marked failed' }
  if (a.status === 'WAIVED') return { tone: 'neutral', icon: MinusCircle, text: 'Requirement waived' }

  // open statuses — drive off the due date
  if (due) {
    const d = dayDiff(new Date(), due) // due − today
    if (d < 0) return { tone: 'bad', icon: AlarmClock, text: `Overdue by ${-d} day${plural(d)}` }
    if (d === 0) return { tone: 'warn', icon: AlarmClock, text: 'Due today' }
    if (d <= 7) return { tone: 'warn', icon: CalendarClock, text: `Due in ${d} day${plural(d)}` }
    return { tone: 'neutral', icon: CalendarClock, text: `Due in ${d} day${plural(d)}` }
  }
  return { tone: 'neutral', icon: Sparkles, text: a.status === 'IN_PROGRESS' ? 'In progress — no due date set' : 'Not started yet — no due date set' }
})

// ── journey timeline ──
const dueRel = computed(() => {
  const a = props.assignment
  if (!a?.due_date) return 'not set'
  if (a.status === 'COMPLETED') {
    const due = parseDate(a.due_date), comp = parseDate(a.completion_date)
    if (due && comp) {
      const d = dayDiff(due, comp)
      if (d > 0) return `missed by ${d} day${plural(d)}`
      if (d < 0) return `met ${-d} day${plural(d)} early`
      return 'met on the day'
    }
    return 'met'
  }
  if (isOverdue.value) {
    const n = Math.abs(dayDiff(new Date(), parseDate(a.due_date)))
    return `overdue by ${n} day${plural(n)}`
  }
  return relFromToday(a.due_date)
})

const outcomeNode = computed(() => {
  const a = props.assignment
  if (a.status === 'COMPLETED') return { key: 'out', label: 'Completed', icon: CheckCircle2, color: 'var(--trn-st-completed)', lit: true, date: a.completion_date, rel: a.completion_date ? relFromToday(a.completion_date) : 'done' }
  if (a.status === 'FAILED') return { key: 'out', label: 'Failed', icon: XCircle, color: 'var(--trn-st-failed)', lit: true, date: a.completion_date, rel: a.completion_date ? relFromToday(a.completion_date) : 'attempt recorded' }
  if (a.status === 'WAIVED') return { key: 'out', label: 'Waived', icon: MinusCircle, color: 'var(--trn-st-waived)', lit: true, date: a.completion_date, rel: 'requirement waived' }
  return { key: 'out', label: 'Outcome pending', icon: Hourglass, color: 'var(--trn-text-dim)', lit: false, date: null, rel: a.status === 'IN_PROGRESS' ? 'in progress' : 'awaiting start' }
})

const timeline = computed(() => {
  const a = props.assignment
  if (!a) return []
  return [
    { key: 'asg', label: 'Assigned', icon: Flag, color: 'var(--trn-amber)', lit: true, date: a.assigned_date, rel: relFromToday(a.assigned_date) },
    a.due_date
      ? { key: 'due', label: 'Due', icon: CalendarClock, color: isOverdue.value ? 'var(--trn-st-failed)' : 'var(--trn-amber-strong)', lit: true, date: a.due_date, rel: dueRel.value }
      : { key: 'due', label: 'No due date', icon: CalendarDays, color: 'var(--trn-text-dim)', lit: false, date: null, rel: 'open-ended' },
    outcomeNode.value,
  ]
})

const completionDuration = computed(() => {
  const a = props.assignment
  if (a?.status !== 'COMPLETED') return null
  const asg = parseDate(a.assigned_date), comp = parseDate(a.completion_date)
  if (!asg || !comp) return null
  const d = dayDiff(asg, comp)
  if (d <= 0) return 'same day'
  return `${d} day${plural(d)}`
})

// ── score meter ──
const hasScore = computed(() => {
  const s = props.assignment?.score
  return s != null && s !== '' && !Number.isNaN(Number(s))
})
const scoreNum = computed(() => Math.round(Number(props.assignment?.score || 0) * 10) / 10)
const scorePct = computed(() => Math.max(0, Math.min(100, scoreNum.value)))
const scoreColor = computed(() => {
  if (props.assignment?.status === 'FAILED') return 'var(--trn-st-failed)'
  if (scorePct.value >= 50) return 'var(--trn-st-completed)'
  return 'var(--trn-st-waived)'
})
</script>

<style scoped>
.ad-stack { display: flex; flex-direction: column; gap: 14px; }

/* ── shared card ── */
.ad-card { position: relative; border: 1px solid var(--trn-border-soft); border-radius: 18px; padding: 16px 18px; background: var(--trn-surface); }
.ad-card-h { display: flex; align-items: center; gap: 6px; margin: 0 0 13px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-muted); }
.ad-card-h :deep(svg) { color: var(--trn-amber-strong); }

/* ── status console ── */
.ad-hero { position: relative; overflow: hidden; isolation: isolate; border-radius: 20px; padding: 18px 18px 20px;
  background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.ad-hero-aura { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.85;
  background: radial-gradient(90% 75% at 0% 0%, color-mix(in srgb, var(--sc) 16%, transparent), transparent 58%),
    radial-gradient(80% 80% at 100% 0%, color-mix(in srgb, var(--trn-amber) 9%, transparent), transparent 62%); }
.ad-hero-grain { z-index: 0; opacity: 0.05; }
.ad-hero > *:not(.ad-hero-aura):not(.ad-hero-grain) { position: relative; z-index: 1; }

.ad-hero-top { display: flex; align-items: center; gap: 16px; }

/* medallion */
.ad-medal { position: relative; width: 104px; height: 104px; flex-shrink: 0; display: grid; place-items: center; }
.ad-medal-glow { position: absolute; inset: 16px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--sc) 30%, transparent), transparent 70%);
  filter: blur(8px); animation: trn-core-breathe 4.5s ease-in-out infinite; }
.ad-medal-svg { position: relative; z-index: 1; width: 100%; height: 100%; }
.ad-medal-track { stroke: var(--trn-border-strong); opacity: 0.5; }
.ad-medal-arc { transition: stroke-dashoffset 1.25s var(--trn-spring);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sc) 45%, transparent)); }
.ad-medal-core { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; }
.ad-medal-core .spin { animation: trn-orbit-spin 1.6s linear infinite; }
.ad-medal-comet { position: absolute; inset: 12px; z-index: 1; animation: trn-orbit-spin 5s linear infinite; }
.ad-medal-comet i { position: absolute; top: -2px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%;
  background: var(--sc); box-shadow: 0 0 10px var(--sc); }

/* identity */
.ad-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.ad-id-avatar { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;
  font-family: var(--trn-mono); font-size: 13px; font-weight: 700; color: #1a1206; flex-shrink: 0;
  background: var(--trn-grad-rail); box-shadow: 0 3px 10px -4px rgba(251, 146, 60, 0.5); }
.ad-id-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ad-id-name { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text); line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-id-prog { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--trn-text-secondary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-id-prog :deep(svg) { color: var(--trn-amber-strong); flex-shrink: 0; }
.ad-id-stamps { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }

/* chips */
.ad-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); white-space: nowrap; }
.ad-chip.ok { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 26%, transparent); }
.ad-chip.warn { color: var(--trn-ember); background: var(--trn-st-waived-soft); border-color: color-mix(in srgb, var(--trn-ember) 26%, transparent); }
.ad-chip.linked { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border-color: color-mix(in srgb, var(--trn-amber) 28%, transparent); }
.ad-chip.off { color: var(--trn-text-dim); }
.ad-fdot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* verdict */
.ad-verdict { display: inline-flex; align-items: center; gap: 8px; margin-top: 15px; padding: 8px 13px; border-radius: 11px;
  font-size: 12.5px; font-weight: 600; border: 1px solid transparent; }
.ad-verdict.good { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 24%, transparent); }
.ad-verdict.bad { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 24%, transparent); }
.ad-verdict.warn { color: var(--trn-ember); background: var(--trn-st-waived-soft); border-color: color-mix(in srgb, var(--trn-ember) 24%, transparent); }
.ad-verdict.neutral { color: var(--trn-text-secondary); background: var(--trn-surface); border-color: var(--trn-border-soft); }

.ad-hero-traj { margin-top: 16px; padding: 0 2px; }

/* ── timeline ── */
.ad-tl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.ad-tl-row { position: relative; display: flex; align-items: center; gap: 12px; padding: 7px 0; }
.ad-tl-row::before { content: ''; position: absolute; left: 13px; top: 50%; bottom: -50%; width: 2px;
  background: var(--trn-border-strong); z-index: 0; }
.ad-tl-row:last-child::before { display: none; }
.ad-tl-row.lit::before { background: linear-gradient(180deg, color-mix(in srgb, var(--nc) 60%, transparent), var(--trn-border-strong)); }
.ad-tl-dot { position: relative; z-index: 1; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  color: var(--trn-text-dim); background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); }
.ad-tl-row.lit .ad-tl-dot { color: var(--nc); border-color: color-mix(in srgb, var(--nc) 55%, transparent);
  background: color-mix(in srgb, var(--nc) 14%, var(--trn-surface-elevated)); box-shadow: 0 0 12px -3px var(--nc); }
.ad-tl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ad-tl-lab { font-size: 12.5px; font-weight: 700; color: var(--trn-text); }
.ad-tl-date { font-size: 11.5px; color: var(--trn-text-muted); font-weight: 600; }
.ad-tl-rel { font-size: 11px; font-weight: 600; color: var(--trn-text-dim); white-space: nowrap; flex-shrink: 0; }
.ad-tl-row.lit .ad-tl-rel { color: color-mix(in srgb, var(--nc) 75%, var(--trn-text-muted)); }
.ad-tl-foot { display: flex; align-items: center; gap: 7px; margin-top: 11px; padding-top: 12px; border-top: 1px solid var(--trn-border-soft);
  font-size: 12px; color: var(--trn-text-muted); }
.ad-tl-foot :deep(svg) { color: var(--trn-amber-strong); flex-shrink: 0; }
.ad-tl-foot b { color: var(--trn-text); font-weight: 700; }

/* ── score ── */
.ad-score-top { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
.ad-score-ic { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--sc); background: color-mix(in srgb, var(--sc) 15%, transparent); }
.ad-score-meta { display: flex; flex-direction: column; gap: 1px; }
.ad-score-lab { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-dim); }
.ad-score-val { font-size: 24px; font-weight: 800; color: var(--trn-text); line-height: 1; }
.ad-score-val i { font-size: 12px; font-style: normal; color: var(--trn-text-dim); margin-left: 4px; font-family: var(--trn-mono); }
.ad-score-bar { position: relative; height: 10px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface-elevated); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2); }
.ad-score-fill { position: relative; display: block; height: 100%; border-radius: 999px; transition: width 1.1s var(--trn-spring);
  background: linear-gradient(90deg, color-mix(in srgb, var(--sc) 55%, transparent), var(--sc)); box-shadow: 0 0 12px -2px var(--sc); }
.ad-score-fill::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, 0.4) 50%, transparent 75%); background-size: 220% 100%;
  animation: trn-sheen 3s linear infinite; }

/* ── program details ── */
.ad-prog-flags { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 0 13px; }
.ad-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
.ad-fact { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 11px;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.ad-fact dt { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-dim); }
.ad-fact dd { margin: 0; font-size: 13px; color: var(--trn-text); font-weight: 600; }
.ad-fact dd.cap { text-transform: capitalize; }
.ad-about { margin: 13px 0 0; font-size: 13px; line-height: 1.6; color: var(--trn-text-secondary); }
.ad-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 13px; padding: 9px 13px; border-radius: 11px;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); color: var(--trn-amber); font-size: 12.5px; font-weight: 600; text-decoration: none; transition: background 0.2s; }
.ad-link:hover { background: var(--trn-surface); }

/* ── certificate ── */
.ad-cert { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 16px; text-decoration: none;
  background: var(--trn-surf-card); border: 1px solid color-mix(in srgb, var(--trn-amber) 26%, transparent); box-shadow: var(--trn-card-shadow); }
.ad-cert-ic { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 16%, transparent); }
.ad-cert-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ad-cert-meta strong { font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.ad-cert-meta span { font-size: 11.5px; color: var(--trn-text-muted); }
.ad-cert > :deep(svg:last-child) { color: var(--trn-text-muted); flex-shrink: 0; }

/* ── notes ── */
.ad-notes { margin: 0; font-size: 13px; line-height: 1.6; color: var(--trn-text-secondary); white-space: pre-wrap; }

/* ── footer ── */
.ad-del { margin-right: auto; padding-left: 12px; padding-right: 12px; }

@media (prefers-reduced-motion: reduce) {
  .ad-medal-arc, .ad-score-fill { transition: none; }
  .ad-medal-glow, .ad-medal-comet, .ad-medal-core .spin, .ad-score-fill::after { animation: none; }
}
@media (max-width: 460px) {
  .ad-hero-top { flex-direction: column; align-items: flex-start; }
  .ad-facts { grid-template-columns: 1fr; }
}
</style>
