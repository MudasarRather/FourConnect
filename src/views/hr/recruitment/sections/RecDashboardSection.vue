<template>
  <div class="rec-dash rec-fade-up">
    <!-- ═══ Hiring Pipeline grid ═══════════════════════════════════════ -->
    <section class="dash-card pipe-card">
      <header class="pipe-head">
        <div>
          <h3 class="card-title">Hiring Pipeline</h3>
          <p class="card-sub">Live snapshot of every open position across each stage</p>
        </div>
        <button class="rec-ghost-mini" @click="$emit('go', 'pipeline')">
          Open full pipeline →
        </button>
      </header>

      <div class="pipe-grid-wrap rec-scroll-x">
        <table class="pipe-grid">
          <colgroup>
            <col class="col-pos" />
            <col v-for="s in stages" :key="s.stage" />
          </colgroup>
          <thead>
            <tr>
              <th class="pos-th">Position</th>
              <th v-for="s in stages" :key="s.stage" class="stage-th">{{ s.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingPipeline">
              <td colspan="99">
                <div v-for="i in 4" :key="i" class="rec-skel" style="height:48px;margin:8px 0" />
              </td>
            </tr>
            <tr
              v-for="(row, ri) in pipelineRows"
              :key="row.positionId"
              class="pipe-row"
              :style="{ '--i': ri }"
            >
              <td class="pos-cell">
                <div class="pos-title">{{ row.title }}</div>
                <div class="pos-sub">{{ row.subtitle }}</div>
              </td>
              <td v-for="s in stages" :key="s.stage" class="stage-cell">
                <PipelineCell
                  :stage="s.stage"
                  :count="row.counts[s.stage] || 0"
                  :active="isActive(row.counts, s.stage)"
                  :draggable="false"
                  @click="row.counts[s.stage] ? $emit('go', 'pipeline') : null"
                />
              </td>
            </tr>
            <tr v-if="!loadingPipeline && !pipelineRows.length">
              <td colspan="99">
                <RecEmptyState
                  :icon="GitBranch"
                  title="Pipeline is empty"
                  body="Once candidates apply to open positions they'll show up here."
                  cta-label="Create a Position"
                  :cta-icon="Briefcase"
                  @cta="$emit('go', 'positions')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ═══ KPI cards with sparklines ══════════════════════════════════ -->
    <section class="kpi-cards">
      <article
        v-for="(k, i) in kpiCards"
        :key="k.key"
        class="kpi-card"
        :style="{ '--i': i }"
      >
        <header class="kpi-head">
          <div class="kpi-icon" :style="{ color: k.color, background: k.bg }">
            <component :is="k.icon" :size="16" />
          </div>
          <span class="kpi-label">{{ k.label }}</span>
        </header>
        <div class="kpi-value-row">
          <div class="kpi-value">
            <span v-if="loading" class="rec-skel" style="display:inline-block;width:80px;height:32px" />
            <RecTicker v-else :value="k.value" />
          </div>
          <span v-if="k.delta != null" class="kpi-delta" :class="k.delta >= 0 ? 'pos' : 'neg'">
            {{ k.delta >= 0 ? '+' : '' }}{{ k.delta }}{{ k.deltaSuffix || '' }}
          </span>
        </div>
        <svg
          v-if="k.series && k.series.length"
          class="kpi-spark"
          viewBox="0 0 120 36"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient :id="`spark-${k.key}`" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" :stop-color="k.color" stop-opacity="0.55" />
              <stop offset="100%" :stop-color="k.color" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path
            :d="sparkArea(k.series)"
            :fill="`url(#spark-${k.key})`"
            class="spark-area"
          />
          <path
            :d="sparkLine(k.series)"
            :stroke="k.color"
            stroke-width="1.6"
            fill="none"
            stroke-linecap="round"
            class="spark-line"
          />
        </svg>
      </article>
    </section>

    <!-- ═══ Bottom: Upcoming interviews + Sources donut ════════════════ -->
    <section class="bottom-grid">
      <article class="dash-card upcoming-card">
        <header class="card-head">
          <div>
            <h3 class="card-title">Upcoming interviews</h3>
            <p class="card-sub">Next 5 scheduled rounds</p>
          </div>
          <button class="rec-ghost-mini" @click="$emit('go', 'interviews')">View all →</button>
        </header>
        <div v-if="loadingInterviews" class="upcoming-list">
          <div v-for="i in 4" :key="i" class="rec-skel" style="height:54px;margin-bottom:8px" />
        </div>
        <div v-else-if="!upcomingInterviews.length" class="empty-mini">
          <CalendarClock :size="20" />
          <span>No interviews scheduled</span>
        </div>
        <ul v-else class="upcoming-list">
          <li
            v-for="(iv, idx) in upcomingInterviews"
            :key="iv.id"
            class="upcoming-item"
            :style="{ '--i': idx }"
          >
            <div class="date-pill">
              <span class="date-d">{{ fmtDay(iv.scheduled_at) }}</span>
              <span class="date-m">{{ fmtMonth(iv.scheduled_at) }}</span>
            </div>
            <div class="ie-body">
              <div class="ie-title">{{ humanType(iv.interview_type) }} interview</div>
              <div class="ie-meta">
                {{ fmtTime(iv.scheduled_at) }} · {{ iv.candidate_name || '—' }}
                <span v-if="iv.position_title" class="mono"> · {{ iv.position_title }}</span>
              </div>
            </div>
          </li>
        </ul>
      </article>

      <article class="dash-card sources-card">
        <header class="card-head">
          <div>
            <h3 class="card-title">Candidate sources</h3>
            <p class="card-sub">Where your pipeline came from</p>
          </div>
        </header>
        <div v-if="loading" class="rec-skel" style="height:200px" />
        <div v-else-if="!sources.length" class="empty-mini">
          <Users :size="20" />
          <span>No source data yet</span>
        </div>
        <div v-else class="sources-row">
          <svg class="sources-donut" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="74" stroke="rgba(255,255,255,0.05)" stroke-width="14" fill="none" />
            <circle
              v-for="(s, idx) in donutArcs"
              :key="s.source"
              cx="100" cy="100" r="74"
              :stroke="sourceColor(idx)"
              stroke-width="14"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="`${s.length} ${donutCircumference - s.length}`"
              :stroke-dashoffset="-s.offset"
              transform="rotate(-90 100 100)"
              style="transition: stroke-dasharray 1100ms var(--hr-spring);
                     filter: drop-shadow(0 0 4px currentColor);"
            />
            <text x="100" y="96" text-anchor="middle" dominant-baseline="middle"
              fill="#f5f5f7" font-size="32" font-weight="800" style="letter-spacing:-0.02em">
              <tspan>{{ totalSources }}</tspan>
            </text>
            <text x="100" y="120" text-anchor="middle"
              fill="#8e8e93" font-size="9" letter-spacing="2" font-weight="600">
              CANDIDATES
            </text>
          </svg>
          <ul class="sources-legend">
            <li v-for="(s, idx) in sources" :key="s.stage">
              <span class="leg-dot" :style="{ background: sourceColor(idx) }" />
              <span class="leg-label">{{ humanSource(s.stage) }}</span>
              <span class="leg-count rec-mono">{{ s.count }}</span>
            </li>
          </ul>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  GitBranch, Briefcase, ClipboardList, UserPlus, CalendarClock, Users,
} from 'lucide-vue-next'

import RecTicker from '../components/RecTicker.vue'
import PipelineCell from '../components/PipelineCell.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import {
  fetchPipeline, useInterviews,
} from '../../../../composables/useRecruitment'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['refresh', 'go'])

// ─── Stages displayed on dashboard grid (subset of system stages) ───
const stages = [
  { stage: 'APPLIED',     label: 'Applying' },
  { stage: 'SCREENING',   label: 'Screening' },
  { stage: 'SHORTLISTED', label: 'Shortlisted' },
  { stage: 'INTERVIEW',   label: 'Interview' },
  { stage: 'SELECTED',    label: 'Selected' },
  { stage: 'OFFER',       label: 'Offer' },
  { stage: 'JOINED',      label: 'Joined' },
]

// ─── Pipeline data — group cards by position ───
const loadingPipeline = ref(false)
const pipelineRows = ref([])

const loadPipelineGrid = async () => {
  loadingPipeline.value = true
  try {
    const data = await fetchPipeline(null)
    // data is an array of { stage, cards: [{position_code, position_title, ...}] }
    const byPos = new Map()
    for (const stageBlock of data) {
      for (const c of stageBlock.cards) {
        const key = c.position_code || c.position_title || 'unknown'
        if (!byPos.has(key)) {
          byPos.set(key, {
            positionId: key,
            title: c.position_title || '—',
            subtitle: c.position_code || '',
            counts: {},
          })
        }
        const row = byPos.get(key)
        row.counts[stageBlock.stage] = (row.counts[stageBlock.stage] || 0) + 1
      }
    }
    // Sort by total candidates desc, top 7
    pipelineRows.value = Array.from(byPos.values())
      .map(r => ({ ...r, _total: Object.values(r.counts).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b._total - a._total)
      .slice(0, 7)
  } catch (e) {
    pipelineRows.value = []
  } finally {
    loadingPipeline.value = false
  }
}

// "Active" stage = right-most stage with a count in that row
const isActive = (counts, stage) => {
  const idx = stages.findIndex(s => s.stage === stage)
  if (idx < 0) return false
  // Active if this is the right-most non-zero cell
  for (let i = idx + 1; i < stages.length; i++) {
    if (counts[stages[i].stage]) return false
  }
  return (counts[stage] || 0) > 0
}

// ─── KPI cards ───
const monthlySeries = computed(() => props.dashboard?.monthly_trend || [])

const seriesApps = computed(() => monthlySeries.value.map(m => m.applications))
const seriesHires = computed(() => monthlySeries.value.map(m => m.hires))

// "Total interviews completed in last 6 months" — approximate from monthly_trend by halving (we have no direct field). Use stats.pending_interviews as the present count instead.
const kpiCards = computed(() => {
  const s = props.dashboard?.stats || {}
  return [
    {
      key: 'apps',
      label: 'Total applications',
      icon: ClipboardList,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.12)',
      value: s.applications_received || 0,
      delta: deltaPct(seriesApps.value),
      deltaSuffix: '%',
      series: seriesApps.value,
    },
    {
      key: 'pipe',
      label: 'In pipeline',
      icon: GitBranch,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      value: s.candidates_in_pipeline || 0,
      delta: null,
      series: seriesApps.value, // visual aid only
    },
    {
      key: 'hires',
      label: 'Hires this month',
      icon: UserPlus,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.12)',
      value: s.hires_this_month || 0,
      delta: deltaAbs(seriesHires.value),
      deltaSuffix: '',
      series: seriesHires.value,
    },
    {
      key: 'open',
      label: 'Open positions',
      icon: Briefcase,
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.12)',
      value: s.open_positions || 0,
      delta: null,
      series: seriesApps.value,
    },
  ]
})

function deltaPct(series) {
  if (!series || series.length < 2) return null
  const prev = series[series.length - 2] || 0
  const last = series[series.length - 1] || 0
  if (!prev) return null
  return Math.round(((last - prev) / prev) * 100)
}
function deltaAbs(series) {
  if (!series || series.length < 2) return null
  const prev = series[series.length - 2] || 0
  const last = series[series.length - 1] || 0
  return last - prev
}

// ─── Sparkline path helpers ───
function sparkPoints(series) {
  if (!series?.length) return []
  const max = Math.max(1, ...series)
  return series.map((v, i) => ({
    x: (i / Math.max(1, series.length - 1)) * 120,
    y: 30 - (v / max) * 26,
  }))
}
function sparkLine(series) {
  const pts = sparkPoints(series)
  if (!pts.length) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp1x = (pts[i-1].x + pts[i].x) / 2
    const cp1y = pts[i-1].y
    const cp2x = (pts[i-1].x + pts[i].x) / 2
    const cp2y = pts[i].y
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x} ${pts[i].y}`
  }
  return d
}
function sparkArea(series) {
  const line = sparkLine(series)
  if (!line) return ''
  return line + ' L 120 36 L 0 36 Z'
}

// ─── Upcoming interviews ───
const interviews = useInterviews()
const loadingInterviews = computed(() => interviews.loading.value)
const upcomingInterviews = computed(() => (interviews.items.value || []).slice(0, 5))

const loadUpcoming = async () => {
  interviews.setFilters({ upcoming_only: true, status: null, limit: 5 })
  await interviews.fetchList()
}

// ─── Sources donut ───
const sources = computed(() => props.dashboard?.sources_distribution || [])
const totalSources = computed(() => sources.value.reduce((a, b) => a + (b.count || 0), 0))
const donutCircumference = 2 * Math.PI * 74 // ≈ 465

const donutArcs = computed(() => {
  const total = totalSources.value || 1
  let offset = 0
  return sources.value.map(s => {
    const length = (s.count / total) * donutCircumference
    const arc = { source: s.stage, length, offset }
    offset += length
    return arc
  })
})

const SOURCE_COLORS = ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#fde68a', '#f97316', '#dc2626', '#34d399', '#9ca3af']
const sourceColor = (idx) => SOURCE_COLORS[idx % SOURCE_COLORS.length]

// ─── Helpers ───
const humanSource = (s) => ({
  PORTAL: 'Portal', REFERRAL: 'Referral', LINKEDIN: 'LinkedIn',
  NAUKRI: 'Naukri', INDEED: 'Indeed', AGENCY: 'Agency',
  WALK_IN: 'Walk-in', CAMPUS: 'Campus', DIRECT: 'Direct', OTHER: 'Other',
}[s] || s)

const humanType = (t) => ({
  HR: 'HR', TECHNICAL: 'Technical', MANAGERIAL: 'Managerial',
  CULTURAL: 'Cultural', FINAL: 'Final', CLIENT: 'Client',
}[t] || t)

const fmtDay   = (iso) => iso ? String(new Date(iso).getDate()).padStart(2, '0') : '—'
const fmtMonth = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short' }) : ''
const fmtTime  = (iso) => iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—'

onMounted(async () => {
  await Promise.all([loadPipelineGrid(), loadUpcoming()])
})
watch(() => props.dashboard, () => {
  if (props.dashboard) loadPipelineGrid()
})
</script>

<style scoped>
.rec-dash { display: flex; flex-direction: column; gap: 16px; }

.dash-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  overflow: hidden;
  padding: 20px 22px;
}

.card-title  { margin: 0; font-size: 15px; font-weight: 700; color: var(--hr-text); letter-spacing: -0.01em; }
.card-sub    { margin: 4px 0 0; font-size: 12px; color: var(--hr-text-muted); }
.card-head   { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }

/* ═══ Hiring Pipeline grid ═══════════════════════════════════════════ */
.pipe-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.pipe-grid-wrap {
  overflow-x: auto;
}
.pipe-grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 6px;
  min-width: 760px;
}
.pipe-grid .col-pos { width: 220px; }

.pipe-grid thead th {
  padding: 6px 10px 10px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  text-align: center;
  white-space: nowrap;
}
.pipe-grid .pos-th { text-align: left; padding-left: 4px; }

.pipe-row {
  animation: rec-rise 0.42s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}
.pipe-row td {
  padding: 10px 8px;
  text-align: center;
}
.pipe-row .pos-cell {
  text-align: left;
  padding-left: 4px;
}
.pos-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--hr-text);
}
.pos-sub {
  font-size: 10.5px;
  font-family: var(--rec-mono);
  color: var(--hr-accent-gold);
  letter-spacing: 0.3px;
  margin-top: 2px;
}

/* ═══ KPI cards ══════════════════════════════════════════════════════ */
.kpi-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 16px 18px 14px;
  overflow: hidden;
  animation: rec-rise 0.42s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
  transition: border-color 220ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--hr-accent-gold-border);
}
.kpi-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.kpi-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: grid; place-items: center;
}
.kpi-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}

.kpi-value-row {
  display: flex; align-items: baseline; gap: 10px;
}
.kpi-value {
  font-size: 30px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--hr-text);
  letter-spacing: -0.025em;
}
.kpi-delta {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.kpi-delta.pos { background: rgba(52,211,153,0.14); color: #34d399; }
.kpi-delta.neg { background: rgba(248,113,113,0.14); color: #f87171; }

.kpi-spark {
  width: 100%;
  height: 36px;
  margin-top: 10px;
}
.spark-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: spark-draw 1200ms var(--hr-spring) forwards;
}
@keyframes spark-draw { to { stroke-dashoffset: 0; } }

/* ═══ Bottom grid ════════════════════════════════════════════════════ */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.upcoming-card {
  background: rgba(8, 8, 11, 0.62);
  border-color: rgba(255, 255, 255, 0.04);
}
.upcoming-list { display: flex; flex-direction: column; gap: 8px; list-style: none; padding: 0; margin: 0; }
.upcoming-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  animation: rec-rise-soft 0.34s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 40ms);
  transition: border-color 220ms var(--hr-spring), background 220ms var(--hr-spring);
}
.upcoming-item:hover {
  border-color: var(--hr-accent-gold-border);
  background: rgba(251, 191, 36, 0.04);
}
.date-pill {
  display: flex; flex-direction: column; align-items: center;
  min-width: 42px;
  padding: 6px 0 5px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  color: var(--hr-accent-gold);
}
.date-d { font-size: 18px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
.date-m { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }

.ie-title  { font-size: 13px; font-weight: 600; color: var(--hr-text); }
.ie-meta   { font-size: 11px; color: var(--hr-text-muted); margin-top: 3px; }
.ie-meta .mono { font-family: var(--rec-mono); color: var(--hr-accent-gold); }

.empty-mini {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 40px 16px;
  color: var(--hr-text-muted);
  font-size: 12px;
}

/* Sources donut */
.sources-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 18px;
  align-items: center;
}
.sources-donut { width: 200px; height: 200px; }
.sources-legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.sources-legend li {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--hr-text-secondary);
}
.leg-dot   { width: 10px; height: 10px; border-radius: 3px; box-shadow: 0 0 6px currentColor; }
.leg-count { font-weight: 700; color: var(--hr-text); }

@media (max-width: 1100px) {
  .kpi-cards { grid-template-columns: repeat(2, 1fr); }
  .bottom-grid { grid-template-columns: 1fr; }
  .sources-row { grid-template-columns: 1fr; }
  .sources-donut { margin: 0 auto; }
}
@media (max-width: 600px) {
  .kpi-cards { grid-template-columns: 1fr; }
}
</style>
