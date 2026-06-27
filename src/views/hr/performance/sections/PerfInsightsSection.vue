<template>
  <div class="pi-sec">
    <PerfHero eyebrow="People · Insights" title="Performance" accent="Spectrum" :icon="BarChart3"
      sub="Org-wide analytics across every appraisal cycle — the score spectrum, review pipeline, goal health, departmental strength, cycle trend and the people pulling ahead or needing a hand.">
      <template #actions>
        <div class="pi-cycle">
          <Activity :size="14" class="pi-cycle-ic" />
          <select v-model="cycle" class="pi-cycle-sel" @change="load">
            <option value="">All cycles</option>
            <option v-for="c in CYCLES" :key="c" :value="c">{{ cycleMeta(c).label }}</option>
          </select>
          <span v-if="loading" class="pi-cycle-spin"><span class="perf-spin" /></span>
        </div>
      </template>
      <template #lenses>
        <div class="pi-lenses">
          <button v-for="l in lenses" :key="l.key" class="pi-lens" type="button" :style="{ '--acc': l.color }" @click="$emit('go', l.go)">
            <span class="pi-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="pi-lens-val"><SetCountUp :value="l.value" :decimals="l.decimals || 0" :suffix="l.suffix || ''" /></span>
            <span class="pi-lens-lab">{{ l.label }}</span>
            <span class="pi-lens-bar" />
          </button>
        </div>
      </template>
    </PerfHero>

    <!-- SIGNATURE — score-distribution spectrograph -->
    <PerfSpectrum :key="'spec' + specKey" :bands="reviews.distribution || []" :avg="reviews.avg_overall ?? null" :total="scoredTotal" :max="5" />

    <!-- ROW — completion + pipeline | goal health -->
    <div class="pi-row pi-row-a">
      <div class="pi-panel" :style="{ '--i': 0 }">
        <div class="pi-panel-head"><Gauge :size="14" /> Completion & pipeline</div>
        <div class="pi-comp">
          <div class="pi-comp-ring" :style="{ '--perf-p': compDeg + 'deg' }">
            <span><SetCountUp :value="reviews.completion_rate || 0" :decimals="0" /><i>%</i></span>
          </div>
          <div class="pi-comp-txt">
            <b>{{ reviews.completed || 0 }} of {{ reviews.total || 0 }}</b>
            <span>reviews finalized this scope</span>
            <span class="pi-comp-flight"><i /> {{ inFlight }} still in flight</span>
          </div>
        </div>
        <!-- review-lifecycle funnel (surfaces by_status) -->
        <div class="pi-pipe">
          <div class="pi-pipe-bar">
            <span v-for="s in pipeline" :key="s.key" class="pi-pipe-seg" :style="{ width: s.pct + '%', background: s.color }"
              :class="{ on: ready }" :title="`${s.label}: ${s.count}`" />
          </div>
          <div class="pi-pipe-legend">
            <button v-for="s in pipeline" :key="s.key" class="pi-pipe-leg" type="button" :style="{ '--c': s.color }" @click="$emit('go', 'reviews')">
              <span class="pi-pipe-dot" /><component :is="s.icon" :size="11" /><em>{{ s.label }}</em><b>{{ s.count }}</b>
            </button>
          </div>
        </div>
      </div>

      <div class="pi-panel" :style="{ '--i': 1 }">
        <div class="pi-panel-head"><Target :size="14" /> Goal health
          <button class="pi-head-link" type="button" @click="$emit('go', 'goals')">Open <ArrowUpRight :size="11" /></button>
        </div>
        <div class="pi-goals">
          <div class="pi-goal-ring" :style="{ background: goalConic }">
            <span class="pi-goal-core">
              <b><SetCountUp :value="goals.avg_progress || 0" :decimals="0" /><i>%</i></b>
              <em>avg progress</em>
            </span>
          </div>
          <div class="pi-goal-legend">
            <button v-for="g in goalHealth" :key="g.key" class="pi-goal-leg" type="button" :style="{ '--c': g.color }" @click="$emit('go', 'goals')">
              <span class="pi-goal-dot" /><em>{{ g.label }}</em><b>{{ g.count }}</b>
            </button>
            <p v-if="!goalTotal" class="pi-empty pi-empty-sm">No goals set for this scope.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ROW — department ranking | cycle trend -->
    <div class="pi-row pi-row-b">
      <div class="pi-panel" :style="{ '--i': 2 }">
        <div class="pi-panel-head"><Building2 :size="14" /> Department ranking</div>
        <div v-if="departments.length" class="pi-depts">
          <div v-for="(d, i) in departments" :key="d.department" class="pi-dept-row" :class="{ lead: i === 0 }">
            <span class="pi-dept-rank" :style="{ color: i < 3 ? medal(i) : 'var(--perf-text-dim)' }">{{ i + 1 }}</span>
            <span class="pi-dept-name" :title="d.department">{{ d.department }}</span>
            <span class="pi-dept-track">
              <i class="pi-dept-fill" :style="{ width: ready ? Math.min(100, (d.avg || 0) / 5 * 100) + '%' : '0%', background: scoreTone(d.avg, 5), transitionDelay: (i * 0.05) + 's' }" />
            </span>
            <b class="pi-dept-avg" :style="{ color: scoreTone(d.avg, 5) }">{{ d.avg != null ? d.avg.toFixed(1) : '—' }}</b>
            <span class="pi-dept-n">{{ d.count }}</span>
          </div>
        </div>
        <p v-else class="pi-empty">No departmental scores yet.</p>
      </div>

      <div class="pi-panel" :style="{ '--i': 3 }">
        <div class="pi-panel-head"><TrendingUp :size="14" /> Cycle trend
          <span class="pi-head-meta" v-if="trendDelta != null" :class="trendDelta >= 0 ? 'up' : 'down'">
            <component :is="trendDelta >= 0 ? TrendingUp : TrendingDown" :size="11" />
            {{ trendDelta >= 0 ? '+' : '' }}{{ trendDelta.toFixed(1) }}
          </span>
        </div>
        <div v-if="trend.length >= 2" class="pi-spark">
          <svg class="pi-spark-svg" :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="piSparkArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--perf-amber)" stop-opacity="0.32" />
                <stop offset="100%" stop-color="var(--perf-amber)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <polygon class="pi-spark-area" :class="{ on: ready }" :points="areaPoints" fill="url(#piSparkArea)" />
            <polyline class="pi-spark-line" :class="{ on: ready }" :points="linePoints" fill="none"
              stroke="var(--perf-amber)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"
              :style="{ strokeDasharray: sparkLen, strokeDashoffset: ready ? 0 : sparkLen }" />
            <g v-for="(p, i) in sparkPts" :key="i" class="pi-spark-pt" :class="{ on: ready }" :style="{ transitionDelay: (0.4 + i * 0.08) + 's' }">
              <circle :cx="p.x" :cy="p.y" r="3.4" fill="var(--perf-surface)" stroke="var(--perf-amber)" stroke-width="2" />
            </g>
          </svg>
          <div class="pi-spark-labels">
            <span v-for="(t, i) in trend" :key="i" class="pi-spark-lab">
              <b>{{ t.avg != null ? t.avg.toFixed(1) : '—' }}</b>
              <em>{{ cycleMeta(t.cycle).label }}</em>
            </span>
          </div>
        </div>
        <p v-else class="pi-empty">Not enough cycles to chart a trend.</p>
      </div>
    </div>

    <!-- ROW — top performers podium + needs attention -->
    <div class="pi-row pi-row-c">
      <div class="pi-panel" :style="{ '--i': 4 }">
        <div class="pi-panel-head pi-head-ok"><Trophy :size="14" /> Top performers
          <button class="pi-head-link" type="button" @click="$emit('go', 'reviews')">Reviews <ArrowUpRight :size="11" /></button>
        </div>
        <div v-if="topPerformers.length" class="pi-people">
          <Motion v-for="(p, i) in topPerformers" :key="p.id" as="button" type="button" class="pi-prow" :class="{ champ: i === 0 }"
            :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="reduced ? {} : { x: 3 }" @click="$emit('go', 'reviews')">
            <span class="pi-rank" :style="{ color: i < 3 ? medal(i) : 'var(--perf-text-dim)' }">
              <Crown v-if="i === 0" :size="13" /><template v-else>{{ i + 1 }}</template>
            </span>
            <span class="pi-av pi-av-ok">{{ initials(p.employee_name) }}</span>
            <span class="pi-ptxt">
              <b>{{ p.employee_name }}</b>
              <span>{{ p.period_label || cycleMeta(p.cycle).label }}</span>
            </span>
            <span class="pi-pscore" :style="{ color: scoreTone(p.overall_score, p.rating_max || 5) }">
              {{ p.overall_score != null ? p.overall_score.toFixed(1) : '—' }}<i>/{{ p.rating_max || 5 }}</i>
            </span>
          </Motion>
        </div>
        <p v-else class="pi-empty">No scored reviews yet.</p>
      </div>

      <div class="pi-panel" :style="{ '--i': 5 }">
        <div class="pi-panel-head pi-head-warn"><AlertTriangle :size="14" /> Needs attention
          <button class="pi-head-link" type="button" @click="$emit('go', 'pips')">Improvement <ArrowUpRight :size="11" /></button>
        </div>
        <div v-if="needsAttention.length" class="pi-people">
          <Motion v-for="(p, i) in needsAttention" :key="p.id" as="button" type="button" class="pi-prow"
            :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="reduced ? {} : { x: 3 }" @click="$emit('go', 'pips')">
            <span class="pi-av pi-av-warn">{{ initials(p.employee_name) }}</span>
            <span class="pi-ptxt">
              <b>{{ p.employee_name }}</b>
              <span>{{ p.period_label || cycleMeta(p.cycle).label }}</span>
            </span>
            <span class="pi-pscore" :style="{ color: scoreTone(p.overall_score, p.rating_max || 5) }">
              {{ p.overall_score != null ? p.overall_score.toFixed(1) : '—' }}<i>/{{ p.rating_max || 5 }}</i>
            </span>
          </Motion>
        </div>
        <p v-else class="pi-empty">No scored reviews yet.</p>
      </div>
    </div>

    <!-- CONNECTIVITY — "from rubric to raise" -->
    <div class="pi-flow" :style="{ '--i': 6 }">
      <div class="pi-flow-head"><Workflow :size="14" /> From rubric to raise
        <span class="pi-flow-sub">how a score becomes a fair, funded increment</span>
      </div>
      <div class="pi-flow-track">
        <span class="pi-flow-line" aria-hidden="true"><i class="pi-flow-pulse" /></span>
        <button v-for="(s, i) in flow" :key="s.key" class="pi-stn" type="button" :style="{ '--c': s.color, '--i': i }" @click="goStation(s)">
          <span class="pi-stn-node"><component :is="s.icon" :size="16" /></span>
          <span class="pi-stn-txt"><b>{{ s.label }}</b><em>{{ s.sub }}</em></span>
          <span class="pi-stn-go"><ArrowUpRight :size="12" /></span>
        </button>
      </div>
    </div>

    <!-- footer signals (clickable) -->
    <div class="pi-signals">
      <button class="pi-sig" type="button" :style="{ '--c': 'var(--perf-gold)' }" @click="$emit('go', 'goals')">
        <Target :size="15" /><span>Goals achieved</span><b>{{ goals.achieved || 0 }}</b>
      </button>
      <button class="pi-sig" type="button" :style="{ '--c': 'var(--perf-conflict)' }" @click="$emit('go', 'goals')">
        <AlertTriangle :size="15" /><span>Goals at risk</span><b>{{ goals.at_risk || 0 }}</b>
      </button>
      <button class="pi-sig" type="button" :style="{ '--c': 'var(--perf-orange)' }" @click="$emit('go', 'feedback')">
        <Orbit :size="15" /><span>360° invited</span><b>{{ feedback.invited || 0 }}</b>
      </button>
      <button class="pi-sig" type="button" :style="{ '--c': 'var(--perf-ember)' }" @click="$emit('go', 'pips')">
        <LifeBuoy :size="15" /><span>Active PIPs</span><b>{{ pip.active || 0 }}</b>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  BarChart3, TrendingUp, TrendingDown, Trophy, AlertTriangle, Gauge, Building2,
  Target, Orbit, LifeBuoy, Activity, Crown, Workflow, ArrowUpRight,
  SlidersHorizontal, ClipboardList, Grid3x3, Coins, Settings2,
} from 'lucide-vue-next'
import PerfHero from '../components/PerfHero.vue'
import PerfSpectrum from '../components/PerfSpectrum.vue'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import {
  fetchAnalyticsOverview, scoreTone, PIPELINE, statusMeta, goalStatusMeta,
} from '@/composables/usePerformance'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go'])
const router = useRouter()

const reduced = prefersReduced()
const cycle = ref('')
const loading = ref(false)
const ready = ref(false)
const specKey = ref(0)

const reviews = ref({})
const goals = ref({})
const feedback = ref({})
const pip = ref({})
const topPerformersRaw = ref([])
const needsAttentionRaw = ref([])

const topPerformers = computed(() => topPerformersRaw.value || [])
const needsAttention = computed(() => needsAttentionRaw.value || [])
const scoredTotal = computed(() => (reviews.value.distribution || []).reduce((s, d) => s + (d.count || 0), 0))

const compDeg = computed(() => Math.round((reviews.value.completion_rate || 0) / 100 * 360))
const inFlight = computed(() => Math.max(0, (reviews.value.total || 0) - (reviews.value.completed || 0)))

// review-lifecycle funnel (surfaces reviews.by_status — was ignored)
const pipeline = computed(() => {
  const bs = reviews.value.by_status || {}
  const get = (k) => bs[k] ?? bs[k.toLowerCase?.()] ?? 0
  const rows = PIPELINE.map(p => ({ key: p.key, label: statusMeta(p.key).label, color: statusMeta(p.key).color, icon: p.icon, count: get(p.key) }))
  const tot = Math.max(1, rows.reduce((s, r) => s + r.count, 0))
  return rows.map(r => ({ ...r, pct: r.count / tot * 100 }))
})

// goal-health breakdown (surfaces goals.by_status — was ignored)
const GOAL_KEYS = ['ON_TRACK', 'ACHIEVED', 'AT_RISK', 'OFF_TRACK']
const goalHealth = computed(() => {
  const bs = goals.value.by_status || {}
  const get = (k) => bs[k] ?? bs[k.toLowerCase?.()] ?? 0
  return GOAL_KEYS.map(k => ({ key: k, label: goalStatusMeta(k).label, color: goalStatusMeta(k).color, count: get(k) }))
})
const goalTotal = computed(() => goalHealth.value.reduce((s, g) => s + g.count, 0))
const goalConic = computed(() => {
  if (!goalTotal.value) return 'var(--perf-track)'
  let acc = 0
  const stops = goalHealth.value.map(g => {
    const from = acc / goalTotal.value * 360
    acc += g.count
    const to = acc / goalTotal.value * 360
    return `${g.color} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
})

const departments = computed(() =>
  [...(reviews.value.by_department || [])]
    .filter(d => d.department)
    .sort((a, b) => (b.avg || 0) - (a.avg || 0))
    .slice(0, 8))
const medal = (i) => ['var(--perf-gold)', 'var(--perf-amber)', 'var(--perf-ember)'][i] || 'var(--perf-text-dim)'

// ── trend sparkline ─────────────────────────────────────────────────────────
const SPARK_W = 300
const SPARK_H = 84
const trend = computed(() => (reviews.value.trend || []).filter(t => t.avg != null).slice(-8))
const sparkPts = computed(() => {
  const t = trend.value
  if (t.length < 2) return []
  const max = 5, min = 0, padX = 14, padY = 12
  const span = SPARK_W - padX * 2, h = SPARK_H - padY * 2
  return t.map((d, i) => {
    const x = padX + (i / (t.length - 1)) * span
    const norm = (Math.min(max, Math.max(min, d.avg)) - min) / (max - min)
    return { x: +x.toFixed(1), y: +(padY + (1 - norm) * h).toFixed(1) }
  })
})
const linePoints = computed(() => sparkPts.value.map(p => `${p.x},${p.y}`).join(' '))
const areaPoints = computed(() => {
  const p = sparkPts.value
  if (!p.length) return ''
  return `${p[0].x},${SPARK_H} ${linePoints.value} ${p[p.length - 1].x},${SPARK_H}`
})
const sparkLen = computed(() => {
  const p = sparkPts.value
  let len = 0
  for (let i = 1; i < p.length; i++) len += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y)
  return Math.ceil(len) || 1
})
const trendDelta = computed(() => {
  const t = trend.value
  if (t.length < 2) return null
  return (t[t.length - 1].avg || 0) - (t[t.length - 2].avg || 0)
})

// ── hero lenses (pip → pips: was a dead link) ─────────────────────────────────
const lenses = computed(() => [
  { key: 'avg', label: 'Avg score', value: reviews.value.avg_overall || 0, decimals: 1, color: 'var(--perf-gold)', icon: Gauge, go: 'reviews' },
  { key: 'comp', label: 'Completion', value: reviews.value.completion_rate || 0, suffix: '%', color: 'var(--perf-ok)', icon: TrendingUp, go: 'reviews' },
  { key: 'goal', label: 'Goal progress', value: goals.value.avg_progress || 0, suffix: '%', color: 'var(--perf-amber)', icon: Target, go: 'goals' },
  { key: 'fb', label: '360 response', value: feedback.value.response_rate || 0, suffix: '%', color: 'var(--perf-orange)', icon: Orbit, go: 'feedback' },
  { key: 'pip', label: 'Active PIPs', value: pip.value.active || 0, color: 'var(--perf-ember)', icon: LifeBuoy, go: 'pips' },
])

// ── connectivity flow: rubric → score → calibration → merit → bands ──────────
const flow = [
  { key: 'rubric', label: 'Appraisal rubric', sub: 'Weights & rating scale', icon: SlidersHorizontal, color: 'var(--perf-gold)', route: '/admin/hr/settings/appraisal-templates' },
  { key: 'score', label: 'Reviews scored', sub: 'Self → manager → done', icon: ClipboardList, color: 'var(--perf-orange)', tab: 'reviews' },
  { key: 'calib', label: 'Calibration', sub: '9-box fairness check', icon: Grid3x3, color: 'var(--perf-amber)', tab: 'calibration' },
  { key: 'merit', label: 'Merit & increments', sub: 'Score → recommended hike', icon: Coins, color: 'var(--perf-ember)', tab: 'merit' },
  { key: 'bands', label: 'Merit bands', sub: 'Hike policy & budget', icon: Settings2, color: 'var(--perf-rust)', route: '/admin/hr/settings/merit-policy' },
]
function goStation(s) {
  if (s.route) router.push(s.route)
  else if (s.tab) emit('go', s.tab)
}

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

// ── load ────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  ready.value = false
  try {
    const d = await fetchAnalyticsOverview({ cycle: cycle.value || undefined })
    reviews.value = d.reviews || {}
    goals.value = d.goals || {}
    feedback.value = d.feedback || {}
    pip.value = d.pip || {}
    topPerformersRaw.value = d.top_performers || []
    needsAttentionRaw.value = d.needs_attention || []
  } catch {
    reviews.value = {}; goals.value = {}; feedback.value = {}; pip.value = {}
    topPerformersRaw.value = []; needsAttentionRaw.value = []
  } finally {
    loading.value = false
    specKey.value++
    requestAnimationFrame(() => { ready.value = true })
  }
}
onMounted(load)
</script>

<style scoped>
.pi-sec { display: flex; flex-direction: column; gap: 18px; }

/* cycle select in hero actions */
.pi-cycle { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; height: 38px; border-radius: 11px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); }
.pi-cycle-ic { color: var(--perf-gold); flex-shrink: 0; }
.pi-cycle-sel { appearance: none; -webkit-appearance: none; background: transparent; border: none; outline: none; cursor: pointer;
  font: inherit; font-size: 12.5px; font-weight: 700; color: var(--perf-text); padding-right: 16px;
  background-image: linear-gradient(45deg, transparent 50%, var(--perf-text-muted) 50%), linear-gradient(135deg, var(--perf-text-muted) 50%, transparent 50%);
  background-position: right 4px top 16px, right 0 top 16px; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
.pi-cycle-sel option { background: var(--perf-surface-elevated); color: var(--perf-text); }
.pi-cycle-spin { display: grid; place-items: center; width: 18px; height: 18px; }

/* hero lenses */
.pi-lenses { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pi-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left; padding: 12px 13px 14px; border-radius: 14px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.25s var(--perf-spring), border-color 0.25s; --acc: var(--perf-gold); }
.pi-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.pi-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.pi-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pi-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pi-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--perf-spring); }
.pi-lens:hover .pi-lens-bar { transform: scaleX(1); }

/* panels */
.pi-row { display: grid; gap: 14px; align-items: stretch; }
.pi-row-a { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); }
.pi-row-b, .pi-row-c { grid-template-columns: 1fr 1fr; }
.pi-panel { padding: 16px 17px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  display: flex; flex-direction: column; gap: 14px; animation: perf-deal 0.5s var(--perf-spring) backwards; animation-delay: calc(var(--i, 0) * 0.06s);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s var(--perf-spring); }
.pi-panel:hover { border-color: var(--perf-border-strong); }
.pi-panel-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pi-panel-head :deep(svg) { color: var(--perf-gold); }
.pi-head-ok :deep(svg) { color: var(--perf-ok); }
.pi-head-warn :deep(svg) { color: var(--perf-conflict); }
.pi-head-link { margin-left: auto; display: inline-flex; align-items: center; gap: 3px; font: inherit; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
  cursor: pointer; padding: 3px 8px; border-radius: 8px; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.pi-head-link:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.pi-head-meta { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; text-transform: none; letter-spacing: 0; color: var(--perf-text-muted); }
.pi-head-meta.up { color: var(--perf-ok); } .pi-head-meta.down { color: var(--perf-conflict); }

/* completion ring + pipeline */
.pi-comp { display: flex; align-items: center; gap: 16px; }
.pi-comp-ring { position: relative; width: 88px; height: 88px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--perf-ok) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.95s var(--perf-spring); box-shadow: 0 0 0 1px var(--perf-border) inset; }
.pi-comp-ring::after { content: ''; position: absolute; inset: 9px; border-radius: 50%; background: var(--perf-surface); }
.pi-comp-ring span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 22px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pi-comp-ring span i { font-size: 10px; font-style: normal; color: var(--perf-text-muted); margin-left: 1px; align-self: flex-start; margin-top: 24px; }
.pi-comp-txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.pi-comp-txt b { font-size: 16px; font-weight: 850; color: var(--perf-text); }
.pi-comp-txt span { font-size: 11.5px; color: var(--perf-text-muted); }
.pi-comp-flight { display: inline-flex; align-items: center; gap: 6px; }
.pi-comp-flight i { width: 8px; height: 8px; border-radius: 2px; background: var(--perf-track); box-shadow: 0 0 0 1px var(--perf-border-strong) inset; }
.pi-pipe { display: flex; flex-direction: column; gap: 9px; margin-top: auto; padding-top: 13px; border-top: 1px solid var(--perf-border); }
.pi-pipe-bar { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; background: var(--perf-track); }
.pi-pipe-seg { height: 100%; border-radius: 2px; transform: scaleX(0); transform-origin: left; transition: transform 0.7s var(--perf-spring); }
.pi-pipe-seg.on { transform: scaleX(1); }
.pi-pipe-legend { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; }
.pi-pipe-leg { display: inline-flex; align-items: center; gap: 6px; font: inherit; cursor: pointer; background: transparent; border: none; padding: 0; --c: var(--perf-gold); }
.pi-pipe-leg :deep(svg) { color: var(--c); flex-shrink: 0; }
.pi-pipe-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
.pi-pipe-leg em { font-style: normal; font-size: 11px; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pi-pipe-leg b { margin-left: auto; font-size: 12px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pi-pipe-leg:hover em { color: var(--perf-text); }

/* goal health */
.pi-goals { display: flex; align-items: center; gap: 18px; }
.pi-goal-ring { position: relative; width: 104px; height: 104px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 1px var(--perf-border) inset; transition: background 0.8s var(--perf-spring); }
.pi-goal-ring::after { content: ''; position: absolute; inset: 13px; border-radius: 50%; background: var(--perf-surface); }
.pi-goal-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.pi-goal-core b { font-size: 22px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pi-goal-core b i { font-size: 11px; font-style: normal; color: var(--perf-text-muted); }
.pi-goal-core em { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-dim); }
.pi-goal-legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.pi-goal-leg { display: inline-flex; align-items: center; gap: 8px; font: inherit; cursor: pointer; background: transparent; border: none; padding: 0; --c: var(--perf-gold); }
.pi-goal-dot { width: 9px; height: 9px; border-radius: 3px; background: var(--c); flex-shrink: 0; }
.pi-goal-leg em { font-style: normal; font-size: 11.5px; color: var(--perf-text-secondary); }
.pi-goal-leg b { margin-left: auto; font-size: 12.5px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pi-goal-leg:hover em { color: var(--perf-text); }

/* department ranking */
.pi-depts { display: flex; flex-direction: column; gap: 9px; }
.pi-dept-row { display: grid; grid-template-columns: 16px 104px 1fr 30px 24px; align-items: center; gap: 10px; }
.pi-dept-row.lead { padding: 4px 7px; margin: -4px -7px; border-radius: 10px; background: color-mix(in srgb, var(--perf-gold) 7%, transparent); }
.pi-dept-rank { font-size: 12px; font-weight: 850; text-align: center; font-variant-numeric: tabular-nums; }
.pi-dept-name { font-size: 11.5px; font-weight: 650; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pi-dept-track { height: 9px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.pi-dept-fill { display: block; height: 100%; border-radius: 999px; box-shadow: 0 0 10px -1px currentColor; transition: width 0.9s var(--perf-spring); }
.pi-dept-avg { font-size: 12.5px; font-weight: 850; text-align: right; font-variant-numeric: tabular-nums; }
.pi-dept-n { font-size: 10px; font-weight: 700; color: var(--perf-text-dim); text-align: right; font-variant-numeric: tabular-nums; }

/* cycle trend sparkline */
.pi-spark { display: flex; flex-direction: column; gap: 10px; }
.pi-spark-svg { width: 100%; height: 108px; display: block; overflow: visible; }
.pi-spark-area { opacity: 0; transition: opacity 0.7s ease 0.3s; }
.pi-spark-area.on { opacity: 1; }
.pi-spark-line { transition: stroke-dashoffset 1.1s var(--perf-spring); filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--perf-amber) 40%, transparent)); }
.pi-spark-pt { opacity: 0; transform: scale(0); transform-origin: center; transform-box: fill-box; transition: opacity 0.3s ease, transform 0.4s var(--perf-spring); }
.pi-spark-pt.on { opacity: 1; transform: scale(1); }
.pi-spark-labels { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; }
.pi-spark-lab { display: flex; flex-direction: column; align-items: center; gap: 1px; flex: 1; min-width: 0; }
.pi-spark-lab b { font-size: 12px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pi-spark-lab em { font-size: 9px; font-style: normal; font-weight: 650; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

/* people lists */
.pi-people { display: flex; flex-direction: column; gap: 4px; }
.pi-prow { display: flex; align-items: center; gap: 11px; padding: 8px 9px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit;
  background: transparent; border: 1px solid transparent; transition: background 0.18s, border-color 0.18s; }
.pi-prow:hover { background: var(--perf-surface-elevated); border-color: var(--perf-border); }
.pi-prow.champ { background: color-mix(in srgb, var(--perf-gold) 8%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 28%, transparent); }
.pi-rank { display: grid; place-items: center; width: 18px; font-size: 12px; font-weight: 850; text-align: center; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.pi-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #1a1206; }
.pi-av-ok { background: linear-gradient(135deg, #fbbf24, #34d399); }
.pi-av-warn { background: linear-gradient(135deg, #fb923c, #ef4444); color: #fff; }
.pi-ptxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pi-ptxt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pi-ptxt span { font-size: 10px; color: var(--perf-text-dim); }
.pi-pscore { font-size: 15px; font-weight: 850; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.pi-pscore i { font-size: 9.5px; font-style: normal; font-weight: 700; color: var(--perf-text-dim); }

/* connectivity flow ribbon */
.pi-flow { position: relative; padding: 16px 18px; border-radius: 18px; background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  animation: perf-deal 0.5s var(--perf-spring) backwards; animation-delay: calc(var(--i, 0) * 0.06s); }
.pi-flow-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 16px; }
.pi-flow-head :deep(svg) { color: var(--perf-gold); }
.pi-flow-sub { margin-left: 4px; font-size: 10.5px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--perf-text-dim); }
.pi-flow-track { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pi-flow-line { position: absolute; left: 6%; right: 6%; top: 22px; height: 2px; border-radius: 2px; overflow: hidden;
  background: linear-gradient(90deg, transparent, var(--perf-border-strong), transparent); }
.pi-flow-pulse { position: absolute; top: 0; left: 0; width: 30%; height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--perf-gold), transparent); }
.pi-sec .pi-flow-pulse { animation: pi-flow 3.2s linear infinite; }
@keyframes pi-flow { 0% { transform: translateX(-120%); } 100% { transform: translateX(440%); } }
.pi-stn { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; cursor: pointer;
  font: inherit; padding: 4px 6px 10px; border-radius: 12px; background: transparent; border: 1px solid transparent; --c: var(--perf-gold);
  transition: background 0.2s, border-color 0.2s, transform 0.2s var(--perf-spring); }
.pi-stn:hover { background: var(--perf-surface-elevated); border-color: color-mix(in srgb, var(--c) 36%, transparent); transform: translateY(-3px); }
.pi-stn-node { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); box-shadow: 0 0 0 4px var(--perf-surface); }
.pi-stn-txt { display: flex; flex-direction: column; gap: 1px; }
.pi-stn-txt b { font-size: 11.5px; font-weight: 800; color: var(--perf-text); }
.pi-stn-txt em { font-style: normal; font-size: 9.5px; color: var(--perf-text-muted); }
.pi-stn-go { position: absolute; top: 6px; right: 8px; color: var(--perf-text-dim); opacity: 0; transition: opacity 0.2s; }
.pi-stn:hover .pi-stn-go { opacity: 1; color: var(--c); }

/* footer signal strip */
.pi-signals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.pi-sig { display: flex; align-items: center; gap: 10px; padding: 13px 15px; border-radius: 14px; --c: var(--perf-gold); cursor: pointer; text-align: left; font: inherit;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); transition: transform 0.2s var(--perf-spring), border-color 0.2s; }
.pi-sig:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.pi-sig :deep(svg) { color: var(--c); flex-shrink: 0; }
.pi-sig span { flex: 1; min-width: 0; font-size: 11.5px; font-weight: 650; color: var(--perf-text-secondary); }
.pi-sig b { font-size: 19px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }

.pi-empty { margin: auto 0; padding: 28px 0; text-align: center; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }
.pi-empty-sm { padding: 6px 0; text-align: left; }

[data-theme="light"] .pi-av-warn { color: #fff; }

@media (max-width: 1080px) {
  .pi-row-a, .pi-row-b, .pi-row-c { grid-template-columns: 1fr; }
  .pi-lenses { grid-template-columns: repeat(3, 1fr); }
  .pi-signals { grid-template-columns: repeat(2, 1fr); }
  .pi-flow-track { grid-template-columns: repeat(5, 1fr); gap: 4px; }
}
@media (max-width: 760px) {
  .pi-flow-track { grid-template-columns: 1fr 1fr; row-gap: 12px; }
  .pi-flow-line { display: none; }
}
@media (max-width: 620px) { .pi-lenses { grid-template-columns: repeat(2, 1fr); } }

@media (prefers-reduced-motion: reduce) {
  .pi-lens:hover, .pi-stn:hover, .pi-sig:hover { transform: none; }
  .pi-dept-fill, .pi-comp-ring, .pi-goal-ring, .pi-pipe-seg { transition: none; }
  .pi-spark-line, .pi-spark-area, .pi-spark-pt { transition: none; }
  .pi-spark-line { stroke-dashoffset: 0 !important; }
  .pi-spark-area, .pi-spark-pt { opacity: 1 !important; transform: none !important; }
  .pi-pipe-seg { transform: scaleX(1) !important; }
  .pi-panel, .pi-flow { animation: none; }
  .pi-flow-pulse { animation: none; display: none; }
}
</style>
