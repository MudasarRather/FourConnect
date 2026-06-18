<template>
  <TrnDrawer :open="open" wide eyebrow="Assessment results" :title="assessment?.title || ''" :icon="BarChart3" @close="$emit('close')">
    <template v-if="assessment">
      <!-- ── header: meta + pass-rate gauge ── -->
      <Motion as="div" class="ar-hero"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
        <div class="ar-hero-l">
          <div class="ar-hero-badges">
            <span class="ar-type" :class="`t-${typeKey}`"><component :is="typeIcon" :size="12" /> {{ assessment.assessment_type }}</span>
            <span class="ar-active" :class="{ on: assessment.is_active !== false }"><span /> {{ assessment.is_active !== false ? 'Active' : 'Inactive' }}</span>
          </div>
          <span class="ar-prog"><BookOpen :size="13" /> {{ assessment.program_name || 'Untitled program' }}</span>
          <div class="ar-facts">
            <span><Target :size="12" /> pass <b class="trn-mono">{{ num(assessment.pass_score) }}/{{ num(assessment.max_score) }}</b></span>
            <span><Layers :size="12" /> {{ assessment.max_attempts ?? '∞' }} attempts</span>
            <span v-if="assessment.duration_minutes"><Timer :size="12" /> {{ assessment.duration_minutes }}m</span>
          </div>
        </div>
        <div class="ar-gauge">
          <svg :viewBox="`0 0 ${GZ} ${GZ}`" aria-hidden="true">
            <circle class="ar-gauge-track" :cx="GC" :cy="GC" :r="GR" fill="none" :stroke-width="GSW" />
            <circle class="ar-gauge-fill" :cx="GC" :cy="GC" :r="GR" fill="none" :stroke-width="GSW" stroke-linecap="round"
              :stroke-dasharray="GCIRC" :stroke-dashoffset="loaded ? GCIRC * (1 - passRate / 100) : GCIRC" :transform="`rotate(-90 ${GC} ${GC})`" />
          </svg>
          <div class="ar-gauge-c"><span><TrnCountUp :value="passRate" suffix="%" /></span><small>attempt pass</small></div>
        </div>
      </Motion>

      <template v-if="!loading && results.length">
        <!-- ── vitals ── -->
        <Motion as="div" class="ar-vitals"
          :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 }">
          <div v-for="(v, i) in vitals" :key="v.key" class="ar-vital" :class="v.tone" :style="{ '--d': (0.08 + i * 0.05) + 's' }">
            <span class="ar-vital-ic"><component :is="v.icon" :size="14" /></span>
            <strong><TrnCountUp :value="v.value" :decimals="v.decimals || 0" :suffix="v.suffix || ''" /></strong>
            <span class="ar-vital-lab">{{ v.label }}</span>
          </div>
        </Motion>

        <!-- ── insight chips ── -->
        <Motion as="div" class="ar-insights"
          :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
          <span class="ar-insight"><Users :size="12" /> {{ candidatePassRate }}% of people passed</span>
          <span class="ar-insight"><Zap :size="12" /> {{ firstTryRate }}% passed first try</span>
          <span v-if="avgAttemptsToPass" class="ar-insight"><Activity :size="12" /> {{ avgAttemptsToPass }} avg tries to pass</span>
          <span class="ar-insight"><Link2 :size="12" /> {{ linkedCount }} tied to enrolments</span>
        </Motion>

        <!-- ── score distribution ── -->
        <Motion as="div" class="ar-dist"
          :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.15 }">
          <div class="ar-dist-head">
            <h4>Score distribution</h4>
            <span class="ar-dist-meta trn-mono">med {{ median }} · hi {{ highest }} · lo {{ lowest }}</span>
          </div>
          <div class="ar-dist-chart">
            <span class="ar-dist-passline" :style="{ left: passPct + '%' }"><i>pass</i></span>
            <div v-for="(b, i) in distribution" :key="i" class="ar-dist-col" :title="`${b.lo}–${b.hi}: ${b.count}`">
              <span class="ar-dist-bar" :class="b.pass ? 'ok' : 'bad'"
                :style="{ height: loaded ? Math.max(b.count ? 6 : 0, b.pct) + '%' : '0%', transitionDelay: (0.2 + i * 0.05) + 's' }">
                <span v-if="b.count" class="ar-dist-n">{{ b.count }}</span>
              </span>
            </div>
          </div>
          <div class="ar-dist-axis"><span>0</span><span class="trn-mono">{{ num(assessment.max_score) }}</span></div>
        </Motion>

        <!-- ── view toggle ── -->
        <div class="ar-viewbar">
          <div class="ar-seg" :style="{ '--idx': view === 'attempts' ? 1 : 0 }">
            <span class="ar-seg-ind" aria-hidden="true" />
            <button type="button" :class="{ on: view === 'candidates' }" @click="view = 'candidates'"><Trophy :size="13" /> By candidate</button>
            <button type="button" :class="{ on: view === 'attempts' }" @click="view = 'attempts'"><Activity :size="13" /> By attempt</button>
          </div>
          <span class="ar-view-n trn-mono">{{ view === 'candidates' ? candidates.length + ' people' : results.length + ' attempts' }}</span>
        </div>

        <!-- ── candidate leaderboard ── -->
        <TransitionGroup v-if="view === 'candidates'" name="ar-row" tag="div" class="ar-list">
          <Motion v-for="(c, i) in candidates" :key="c.employee_id" as="div" class="ar-cand" :class="c.verdict.key"
            :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.36, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }">
            <span class="ar-rank" :class="`r${i < 3 ? i + 1 : 0}`">
              <Crown v-if="i === 0" :size="12" /><template v-else>{{ i + 1 }}</template>
            </span>
            <span class="ar-av" aria-hidden="true">{{ initials(c.name) }}</span>
            <div class="ar-cand-main">
              <div class="ar-cand-top">
                <span class="ar-name">{{ c.name || '—' }}</span>
                <span class="ar-best trn-mono">{{ c.best }}<small>/{{ num(assessment.max_score) }}</small></span>
              </div>
              <div class="ar-bar-track">
                <span class="ar-bar-fill" :class="c.verdict.key === 'passed' ? 'ok' : 'bad'"
                  :style="{ width: loaded ? bestPct(c) + '%' : '0%', transitionDelay: (0.1 + i * 0.03) + 's' }" />
                <span class="ar-bar-mark" :style="{ left: passPct + '%' }" />
              </div>
              <div class="ar-cand-foot">
                <span class="ar-dots">
                  <i v-for="(a, k) in c.attempts.slice(0, 6)" :key="k" class="ar-dot" :class="a.passed ? 'ok' : 'bad'" :title="`#${a.attempt_number}: ${num(a.score)}`" />
                  <i v-if="c.attempts.length > 6" class="ar-dots-more">+{{ c.attempts.length - 6 }}</i>
                </span>
                <span class="ar-cand-att">{{ c.attempts.length }}/{{ assessment.max_attempts ?? '∞' }} tries</span>
              </div>
            </div>
            <span class="ar-vstamp" :class="c.verdict.key"><component :is="c.verdict.icon" :size="11" /> {{ c.verdict.label }}</span>
          </Motion>
        </TransitionGroup>

        <!-- ── attempt log ── -->
        <TransitionGroup v-else name="ar-row" tag="div" class="ar-list">
          <Motion v-for="(r, i) in results" :key="r.id" as="div" class="ar-row" :class="{ pass: r.passed, fail: r.passed === false }"
            :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.34, delay: Math.min(i * 0.035, 0.28), ease: [0.16, 1, 0.3, 1] }">
            <span class="ar-av" aria-hidden="true">{{ initials(r.employee_name) }}</span>
            <div class="ar-cand-main">
              <div class="ar-cand-top">
                <span class="ar-name">{{ r.employee_name || '—' }}</span>
                <span class="ar-attempt trn-mono">#{{ r.attempt_number }}</span>
              </div>
              <div class="ar-bar-track">
                <span class="ar-bar-fill" :class="r.passed ? 'ok' : 'bad'" :style="{ width: loaded ? scorePct(r) + '%' : '0%', transitionDelay: (0.1 + i * 0.03) + 's' }" />
                <span class="ar-bar-mark" :style="{ left: passPct + '%' }" />
              </div>
              <div class="ar-cand-foot">
                <span v-if="r.assignment_id" class="ar-link"><Link2 :size="11" /> enrolment</span>
                <span class="ar-date">{{ fmtDate(r.submitted_at || r.created_at) }}</span>
              </div>
            </div>
            <div class="ar-verdict" :class="r.passed ? 'pass' : 'fail'">
              <span class="ar-score trn-mono">{{ num(r.score) }}</span>
              <span class="ar-flag"><component :is="r.passed ? CheckCircle2 : XCircle" :size="11" /> {{ r.passed ? 'PASS' : 'FAIL' }}</span>
            </div>
          </Motion>
        </TransitionGroup>
      </template>

      <div v-else-if="loading" class="ar-list">
        <div class="trn-skel" style="height: 84px; border-radius: 16px" />
        <div class="ar-vitals">
          <div v-for="n in 6" :key="n" class="trn-skel" style="height: 62px; border-radius: 12px" />
        </div>
        <div v-for="n in 4" :key="'r'+n" class="trn-skel" style="height: 64px; border-radius: 13px" />
      </div>

      <div v-else class="ar-empty">
        <ClipboardX :size="28" />
        <p>No results recorded yet</p>
        <span>Record the first result and it will appear here with its verdict, score distribution and a candidate leaderboard.</span>
        <button class="trn-btn trn-btn-primary" @click="$emit('record', assessment)" style="margin-top: 6px"><ClipboardPen :size="14" /> Record result</button>
      </div>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-primary" @click="$emit('record', assessment)"><ClipboardPen :size="14" /> Record result</button>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Done</button>
    </template>
  </TrnDrawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  BarChart3, BookOpen, ClipboardX, ClipboardPen, Link2, CheckCircle2, XCircle,
  ListChecks, ScrollText, Wrench, MessagesSquare, Target, Layers, Timer, Users, Zap,
  Activity, Trophy, Crown, BadgeCheck, Repeat2, Ban, Clock3,
} from 'lucide-vue-next'
import TrnDrawer from '../components/TrnDrawer.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import { fetchAssessmentResults } from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  assessment: { type: Object, default: null },
})
defineEmits(['close', 'record'])
const reduced = prefersReduced()

const results = ref([])
const loading = ref(false)
const loaded = ref(false)
const view = ref('candidates')

const TYPE = {
  QUIZ: { icon: ListChecks, key: 'quiz' }, EXAM: { icon: ScrollText, key: 'exam' },
  PRACTICAL: { icon: Wrench, key: 'practical' }, SURVEY: { icon: MessagesSquare, key: 'survey' },
}
const typeIcon = computed(() => (TYPE[props.assessment?.assessment_type] || TYPE.QUIZ).icon)
const typeKey = computed(() => (TYPE[props.assessment?.assessment_type] || TYPE.QUIZ).key)

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : (v ?? 0) }
const maxScore = computed(() => Number(props.assessment?.max_score) || 0)
const passScore = computed(() => Number(props.assessment?.pass_score) || 0)
const passPct = computed(() => maxScore.value ? Math.max(0, Math.min(100, (passScore.value / maxScore.value) * 100)) : 0)

// ── attempt-level stats ──
const passedAttempts = computed(() => results.value.filter(r => r.passed).length)
const failedAttempts = computed(() => results.value.filter(r => r.passed === false).length)
const passRate = computed(() => results.value.length ? Math.round((passedAttempts.value / results.value.length) * 100) : 0)
const scored = computed(() => results.value.filter(r => r.score != null).map(r => Number(r.score)))
const avgScore = computed(() => scored.value.length ? Math.round(scored.value.reduce((s, x) => s + x, 0) / scored.value.length) : 0)
const highest = computed(() => scored.value.length ? Math.max(...scored.value) : 0)
const lowest = computed(() => scored.value.length ? Math.min(...scored.value) : 0)
const median = computed(() => {
  if (!scored.value.length) return 0
  const s = [...scored.value].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2)
})
const linkedCount = computed(() => results.value.filter(r => r.assignment_id).length)

// ── candidate grouping ──
const candidates = computed(() => {
  const map = new Map()
  for (const r of results.value) {
    if (!map.has(r.employee_id)) map.set(r.employee_id, { employee_id: r.employee_id, name: r.employee_name, attempts: [] })
    map.get(r.employee_id).attempts.push(r)
  }
  const max = props.assessment?.max_attempts
  const rows = [...map.values()].map(c => {
    c.attempts.sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0))
    const sc = c.attempts.filter(a => a.score != null).map(a => Number(a.score))
    c.best = sc.length ? Math.max(...sc) : 0
    const passed = c.attempts.some(a => a.passed)
    c.firstPass = c.attempts.find(a => a.passed)?.attempt_number || null
    c.firstTry = c.attempts[0]?.passed === true
    c.verdict = passed
      ? { key: 'passed', label: 'PASSED', icon: BadgeCheck }
      : (max != null && c.attempts.length >= max)
        ? { key: 'exhausted', label: 'EXHAUSTED', icon: Ban }
        : { key: 'open', label: 'OPEN', icon: Clock3 }
    return c
  })
  // passed first (by fewest attempts then best), then open, then exhausted; ties by best score
  const order = { passed: 0, open: 1, exhausted: 2 }
  return rows.sort((a, b) =>
    (order[a.verdict.key] - order[b.verdict.key]) || (b.best - a.best) || (a.attempts.length - b.attempts.length))
})
const passedCandidates = computed(() => candidates.value.filter(c => c.verdict.key === 'passed').length)
const candidatePassRate = computed(() => candidates.value.length ? Math.round((passedCandidates.value / candidates.value.length) * 100) : 0)
const firstTryRate = computed(() => candidates.value.length ? Math.round((candidates.value.filter(c => c.firstTry).length / candidates.value.length) * 100) : 0)
const avgAttemptsToPass = computed(() => {
  const fp = candidates.value.filter(c => c.firstPass).map(c => c.firstPass)
  if (!fp.length) return 0
  return Math.round((fp.reduce((s, x) => s + x, 0) / fp.length) * 10) / 10
})

const vitals = computed(() => [
  { key: 'cand', label: 'Candidates', icon: Users, value: candidates.value.length },
  { key: 'att', label: 'Attempts', icon: Repeat2, value: results.value.length },
  { key: 'pass', label: 'Passed', icon: BadgeCheck, value: passedAttempts.value, tone: 'ok' },
  { key: 'fail', label: 'Failed', icon: XCircle, value: failedAttempts.value, tone: 'bad' },
  { key: 'avg', label: 'Avg score', icon: Target, value: avgScore.value },
  { key: 'hi', label: 'Highest', icon: Trophy, value: highest.value },
])

// ── distribution histogram ──
const BUCKETS = 8
const distribution = computed(() => {
  const max = maxScore.value || 100
  const size = max / BUCKETS
  const counts = Array(BUCKETS).fill(0)
  for (const s of scored.value) counts[Math.min(BUCKETS - 1, Math.max(0, Math.floor(s / size)))]++
  const peak = Math.max(1, ...counts)
  return counts.map((count, i) => {
    const lo = Math.round(i * size), hi = Math.round((i + 1) * size)
    const mid = lo + size / 2
    return { lo, hi, count, pct: Math.round((count / peak) * 100), pass: mid >= passScore.value }
  })
})

const bestPct = (c) => maxScore.value ? Math.max(4, Math.min(100, (c.best / maxScore.value) * 100)) : 0
const scorePct = (r) => maxScore.value ? Math.max(3, Math.min(100, (Number(r.score) / maxScore.value) * 100)) : 0

const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const load = async () => {
  if (!props.assessment) return
  loading.value = true; loaded.value = false
  try { results.value = await fetchAssessmentResults({ assessment_id: props.assessment.id }) || [] }
  catch { results.value = [] }
  finally {
    loading.value = false
    requestAnimationFrame(() => { loaded.value = true })
  }
}
watch(() => props.open, (o) => { if (o) { results.value = []; view.value = 'candidates'; load() } })
watch(() => props.assessment?.id, () => { if (props.open) load() })

// gauge geometry
const GZ = 78, GC = GZ / 2, GSW = 8, GR = GC - GSW / 2 - 1
const GCIRC = 2 * Math.PI * GR
</script>

<style scoped>
/* ── header hero ── */
.ar-hero { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 15px 17px; border-radius: 17px; margin-bottom: 14px;
  background: var(--trn-grad-hero), var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ar-hero-l { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.ar-hero-badges { display: flex; align-items: center; gap: 7px; }
.ar-type { --c: var(--trn-amber); display: inline-flex; align-items: center; gap: 5px; font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.ar-type.t-quiz { --c: var(--trn-amber); } .ar-type.t-exam { --c: var(--trn-ember); }
.ar-type.t-practical { --c: var(--trn-amber-strong); } .ar-type.t-survey { --c: var(--trn-star-dim); }
.ar-active { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--trn-text-dim); }
.ar-active span { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-text-dim); }
.ar-active.on { color: var(--trn-st-completed); } .ar-active.on span { background: var(--trn-st-completed); box-shadow: 0 0 6px var(--trn-st-completed); }
.ar-prog { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.ar-prog :deep(svg) { color: var(--trn-amber-strong); flex-shrink: 0; }
.ar-facts { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11.5px; color: var(--trn-text-muted); }
.ar-facts span { display: inline-flex; align-items: center; gap: 5px; }
.ar-facts :deep(svg) { color: var(--trn-text-dim); }
.ar-facts b { color: var(--trn-text-secondary); font-weight: 700; }
.ar-gauge { position: relative; width: 78px; height: 78px; flex-shrink: 0; }
.ar-gauge svg { width: 100%; height: 100%; }
.ar-gauge-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.ar-gauge-fill { stroke: var(--trn-st-completed); transition: stroke-dashoffset 1.2s var(--trn-spring) 0.2s; filter: drop-shadow(0 0 5px color-mix(in srgb, var(--trn-st-completed) 45%, transparent)); }
.ar-gauge-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ar-gauge-c span { font-family: var(--trn-mono); font-size: 18px; font-weight: 850; color: var(--trn-text); line-height: 1; }
.ar-gauge-c small { font-size: 7.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trn-text-dim); }

/* ── vitals ── */
.ar-vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.ar-vital { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 13px; background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft);
  opacity: 0; transform: translateY(8px); animation: ar-rise 0.5s var(--trn-spring) forwards; animation-delay: var(--d); }
.ar-vital-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); margin-bottom: 3px; }
.ar-vital.ok .ar-vital-ic { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.ar-vital.bad .ar-vital-ic { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.ar-vital strong { font-family: var(--trn-mono); font-size: 19px; font-weight: 850; color: var(--trn-text); line-height: 1; }
.ar-vital.ok strong { color: var(--trn-st-completed); } .ar-vital.bad strong { color: var(--trn-st-failed); }
.ar-vital-lab { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--trn-text-dim); }

/* ── insights ── */
.ar-insights { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }
.ar-insight { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 999px;
  color: var(--trn-text-secondary); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ar-insight :deep(svg) { color: var(--trn-amber-strong); }

/* ── distribution ── */
.ar-dist { margin-bottom: 16px; padding: 14px 15px; border-radius: 15px; background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); }
.ar-dist-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ar-dist-head h4 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-muted); }
.ar-dist-meta { font-size: 10.5px; color: var(--trn-text-dim); }
.ar-dist-chart { position: relative; display: flex; align-items: flex-end; gap: 5px; height: 92px; padding-top: 12px; }
.ar-dist-col { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; }
.ar-dist-bar { position: relative; width: 100%; border-radius: 5px 5px 2px 2px; min-height: 0; transition: height 0.8s var(--trn-spring); }
.ar-dist-bar.ok { background: linear-gradient(180deg, var(--trn-st-completed), color-mix(in srgb, var(--trn-st-completed) 35%, transparent)); }
.ar-dist-bar.bad { background: linear-gradient(180deg, var(--trn-st-failed), color-mix(in srgb, var(--trn-st-failed) 35%, transparent)); }
.ar-dist-n { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-family: var(--trn-mono); font-size: 10px; font-weight: 700; color: var(--trn-text-secondary); }
.ar-dist-passline { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1.5px dashed color-mix(in srgb, var(--trn-amber) 70%, transparent); z-index: 2; }
.ar-dist-passline i { position: absolute; top: -2px; left: 3px; font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trn-amber-strong); }
.ar-dist-axis { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; font-size: 10px; color: var(--trn-text-dim); }

/* ── view toggle ── */
.ar-viewbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 11px; }
.ar-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 3px; border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ar-seg-ind { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc((100% - 6px) / 2); border-radius: 9px; z-index: 0;
  background: color-mix(in srgb, var(--trn-amber) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--trn-amber) 32%, transparent);
  transform: translateX(calc(var(--idx) * 100%)); transition: transform 0.35s var(--trn-spring); }
.ar-seg button { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600;
  padding: 7px 13px; border: 0; background: transparent; cursor: pointer; color: var(--trn-text-muted); transition: color 0.25s; white-space: nowrap; }
.ar-seg button.on { color: var(--trn-amber-strong); }
.ar-view-n { font-size: 11px; color: var(--trn-text-dim); }

/* ── shared list ── */
.ar-list { display: flex; flex-direction: column; gap: 8px; position: relative; }
.ar-av { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px;
  font-family: var(--trn-mono); font-size: 11px; font-weight: 700; color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.ar-cand-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.ar-cand-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ar-name { font-size: 13px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ar-attempt { font-size: 11px; font-weight: 700; color: var(--trn-text-dim); flex-shrink: 0; }
.ar-bar-track { position: relative; height: 6px; border-radius: 999px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); overflow: visible; }
.ar-bar-fill { display: block; height: 100%; border-radius: 999px; transition: width 1s var(--trn-spring); }
.ar-bar-fill.ok { background: linear-gradient(90deg, color-mix(in srgb, var(--trn-st-completed) 50%, transparent), var(--trn-st-completed)); }
.ar-bar-fill.bad { background: linear-gradient(90deg, color-mix(in srgb, var(--trn-st-failed) 50%, transparent), var(--trn-st-failed)); }
.ar-bar-mark { position: absolute; top: -2px; bottom: -2px; width: 2px; border-radius: 2px; background: var(--trn-amber-strong); box-shadow: 0 0 6px color-mix(in srgb, var(--trn-amber) 55%, transparent); }
.ar-cand-foot { display: flex; align-items: center; gap: 10px; font-size: 10.5px; color: var(--trn-text-dim); }
.ar-link { display: inline-flex; align-items: center; gap: 4px; color: var(--trn-st-completed); }

/* candidate row */
.ar-cand { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 14px; background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); }
.ar-cand.passed { border-left: 3px solid var(--trn-st-completed); }
.ar-cand.exhausted { border-left: 3px solid var(--trn-st-failed); }
.ar-cand.open { border-left: 3px solid var(--trn-st-in-progress); }
.ar-rank { display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 800;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ar-rank.r1 { color: #1a1206; background: linear-gradient(135deg, var(--trn-amber-bright), var(--trn-amber-strong)); border-color: transparent; box-shadow: 0 3px 10px -3px color-mix(in srgb, var(--trn-amber) 70%, transparent); }
.ar-rank.r2 { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 40%, transparent); }
.ar-rank.r3 { color: var(--trn-ember); border-color: color-mix(in srgb, var(--trn-ember) 40%, transparent); }
.ar-best { font-family: var(--trn-mono); font-size: 15px; font-weight: 850; color: var(--trn-text); flex-shrink: 0; }
.ar-best small { font-size: 10px; font-weight: 600; color: var(--trn-text-dim); }
.ar-dots { display: inline-flex; align-items: center; gap: 3px; }
.ar-dot { width: 7px; height: 7px; border-radius: 50%; }
.ar-dot.ok { background: var(--trn-st-completed); } .ar-dot.bad { background: var(--trn-st-failed); }
.ar-dots-more { font-size: 9px; font-weight: 700; color: var(--trn-text-dim); font-style: normal; margin-left: 2px; }
.ar-cand-att { margin-left: auto; }
.ar-vstamp { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; font-family: var(--trn-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 999px; }
.ar-vstamp.passed { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.ar-vstamp.exhausted { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.ar-vstamp.open { color: var(--trn-st-in-progress); background: var(--trn-st-in-progress-soft); }

/* attempt row */
.ar-row { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 13px; background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); }
.ar-row.pass { border-left: 3px solid var(--trn-st-completed); }
.ar-row.fail { border-left: 3px solid var(--trn-st-failed); }
.ar-verdict { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.ar-score { font-size: 16px; font-weight: 850; color: var(--trn-text); }
.ar-flag { display: inline-flex; align-items: center; gap: 3px; font-family: var(--trn-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 999px; }
.ar-verdict.pass .ar-flag { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.ar-verdict.fail .ar-flag { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }

.ar-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 36px 20px; text-align: center; border-radius: 14px;
  border: 1.5px dashed var(--trn-border-strong); color: var(--trn-text-muted); }
.ar-empty :deep(svg) { color: var(--trn-text-dim); }
.ar-empty p { margin: 4px 0 0; font-size: 14px; font-weight: 700; color: var(--trn-text-secondary); }
.ar-empty span { font-size: 12px; color: var(--trn-text-dim); max-width: 34ch; }

.ar-row-enter-active, .ar-row-leave-active { transition: all 0.35s var(--trn-spring); }
.ar-row-enter-from { opacity: 0; transform: translateX(10px); }
.ar-row-leave-to { opacity: 0; }
.ar-row-move { transition: transform 0.4s var(--trn-spring); }

@keyframes ar-rise { to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .ar-gauge-fill, .ar-bar-fill, .ar-dist-bar, .ar-seg-ind { transition: none !important; }
  .ar-vital { animation: none; opacity: 1; transform: none; }
}
</style>
