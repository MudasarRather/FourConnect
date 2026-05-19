<template>
  <div class="rec-analytics rec-fade-up">
    <!-- KPI strip -->
    <RecKpiRow :chips="kpiChips" :readonly="true" />

    <!-- Top grid: Hiring trend + Sources donut -->
    <section class="ana-grid">
      <article class="ana-card chart-card glass-card">
        <div class="card-glow" aria-hidden="true" />
        <header class="card-head">
          <div>
            <h3 class="card-title">
              <span class="title-icon"><LineChart :size="14" /></span>
              Hiring Volume Trend
            </h3>
            <p class="card-sub">Applications vs hires over the last 6 months</p>
          </div>
          <div class="trend-legend">
            <span class="lg lg-a"><span class="d" /> Applications</span>
            <span class="lg lg-b"><span class="d" /> Hires</span>
          </div>
        </header>
        <div class="chart-wrap">
          <Line v-if="hasTrend" :data="trendData" :options="trendOptions" />
          <div v-else class="empty-mini">
            <LineChart :size="20" /> <span>No trend data yet</span>
          </div>
        </div>
      </article>

      <article class="ana-card sources-card glass-card">
        <div class="card-glow" aria-hidden="true" />
        <header class="card-head">
          <div>
            <h3 class="card-title">
              <span class="title-icon"><Users :size="14" /></span>
              Candidate Sources
            </h3>
            <p class="card-sub">Where your pipeline came from</p>
          </div>
        </header>
        <div v-if="!sources.length" class="empty-mini">
          <Users :size="20" /> <span>No source data yet</span>
        </div>
        <div v-else class="sources-row">
          <div class="donut-wrap">
            <Doughnut :data="sourcesData" :options="sourcesOptions" class="sources-donut" />
            <div class="donut-center">
              <span class="donut-count">{{ sourcesTotal }}</span>
              <span class="donut-label">Total</span>
            </div>
          </div>
          <ul class="sources-legend">
            <li
              v-for="(s, i) in sources"
              :key="s.stage"
              class="src-row"
              :style="{ '--i': i, '--c': sourceColor(i) }"
            >
              <span class="leg-dot" :style="{ background: sourceColor(i) }" />
              <span class="leg-label">{{ humanSource(s.stage) }}</span>
              <span class="leg-bar">
                <span class="leg-bar-fill"
                  :style="{
                    '--final': pct(s.count, sourcesTotal) + '%',
                    background: sourceColor(i),
                  }" />
              </span>
              <span class="leg-count rec-mono">{{ s.count }}</span>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <!-- Department performance grouped bars -->
    <section class="ana-card chart-card glass-card">
      <div class="card-glow" aria-hidden="true" />
      <header class="card-head">
        <div>
          <h3 class="card-title">
            <span class="title-icon"><Building2 :size="14" /></span>
            Department Performance
          </h3>
          <p class="card-sub">Open positions, applications, hires per department</p>
        </div>
        <div class="trend-legend">
          <span class="lg lg-a"><span class="d" /> Open</span>
          <span class="lg lg-b"><span class="d" /> Applications</span>
          <span class="lg lg-c"><span class="d" /> Hires</span>
        </div>
      </header>
      <div class="chart-wrap large">
        <Bar v-if="hasDept" :data="deptData" :options="deptOptions" />
        <div v-else class="empty-mini">
          <Building2 :size="20" /> <span>No department data yet</span>
        </div>
      </div>
    </section>

    <!-- Funnel drop-off -->
    <section class="ana-card funnel-card glass-card">
      <div class="card-glow" aria-hidden="true" />
      <header class="card-head">
        <div>
          <h3 class="card-title">
            <span class="title-icon"><GitBranch :size="14" /></span>
            Funnel Drop-off
          </h3>
          <p class="card-sub">Conversion at each stage of the pipeline</p>
        </div>
      </header>
      <div v-if="!funnel.length" class="empty-mini">
        <GitBranch :size="20" /> <span>No funnel data yet</span>
      </div>
      <div v-else class="funnel-bars">
        <div
          v-for="(f, i) in funnel"
          :key="f.stage"
          class="funnel-row"
          :style="{ '--i': i }"
        >
          <span class="f-stage">
            <span class="stage-dot" :style="{ background: stageColor(f.stage), boxShadow: `0 0 10px ${stageColor(f.stage)}` }" />
            {{ humanStage(f.stage) }}
          </span>
          <div class="f-track">
            <div
              class="f-fill"
              :style="{
                '--w': pct(f.count, maxFunnel) + '%',
                background: stageGrad(f.stage),
                boxShadow: `0 0 16px ${stageColor(f.stage)}44, inset 0 0 0 1px ${stageColor(f.stage)}66`,
                '--i': i,
              }"
            >
              <span class="f-shine" />
              <span class="f-count">{{ f.count }}</span>
            </div>
          </div>
          <div class="f-conv" :class="{ neg: conversion(i) < 0 }">
            <span v-if="i > 0" class="conv-chip" :class="{ neg: conversion(i) < 0 }">
              <ArrowDown v-if="conversion(i) < 0" :size="11" />
              <ArrowUp v-else :size="11" />
              {{ Math.abs(conversion(i)) }}%
            </span>
            <span v-else class="rec-mono dim">—</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import {
  Building2, LineChart, GitBranch, Users, Clock, Target,
  Award, ArrowUp, ArrowDown,
} from 'lucide-vue-next'

import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  ArcElement,
  Title, Tooltip, Legend, Filler,
)

import RecKpiRow from '../components/RecKpiRow.vue'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const stats = computed(() => props.dashboard?.stats || {})
const funnel = computed(() => props.dashboard?.funnel || [])
const dept = computed(() => props.dashboard?.department_hiring || [])
const monthly = computed(() => props.dashboard?.monthly_trend || [])
const sources = computed(() => props.dashboard?.sources_distribution || [])

const sourcesTotal = computed(() =>
  sources.value.reduce((acc, s) => acc + (s.count || 0), 0))

const kpiChips = computed(() => [
  { key: 'tth',  label: 'Time to Hire',   value: stats.value.avg_time_to_hire_days || 0, tone: 'gold',   icon: Clock,  suffix: 'd' },
  { key: 'oar',  label: 'Offer Accept',   value: stats.value.offer_acceptance_rate || 0, tone: 'orange', icon: Target, suffix: '%' },
  { key: 'pipe', label: 'Pipeline',       value: stats.value.candidates_in_pipeline || 0,tone: 'gold',   icon: Users },
  { key: 'hire', label: 'Hires/Mo',       value: stats.value.hires_this_month || 0,      tone: 'green',  icon: Award },
])

// Build a vertical gradient against canvas height — looks far richer than a flat colour
function makeAreaGradient(ctx, area, colorHex, alphaTop = 0.55, alphaBot = 0.0) {
  if (!area) return colorHex
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom)
  const rgb = hexToRgb(colorHex)
  g.addColorStop(0,    `rgba(${rgb}, ${alphaTop})`)
  g.addColorStop(0.6,  `rgba(${rgb}, ${alphaTop * 0.45})`)
  g.addColorStop(1,    `rgba(${rgb}, ${alphaBot})`)
  return g
}
function hexToRgb(hex) {
  const h = hex.replace('#','')
  const bigint = parseInt(h, 16)
  return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`
}

// ─── Chart.js datasets ───
const hasTrend = computed(() => monthly.value.length > 0)
const trendData = computed(() => ({
  labels: monthly.value.map(m => shortMonth(m.month)),
  datasets: [
    {
      label: 'Applications',
      data: monthly.value.map(m => m.applications),
      borderColor: '#fbbf24',
      backgroundColor: (ctx) => makeAreaGradient(ctx.chart.ctx, ctx.chart.chartArea, '#fbbf24', 0.45, 0),
      pointBackgroundColor: '#fbbf24',
      pointBorderColor: 'rgba(8,8,11,0.95)',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      tension: 0.45,
      fill: true,
      borderWidth: 2.6,
    },
    {
      label: 'Hires',
      data: monthly.value.map(m => m.hires),
      borderColor: '#fb923c',
      backgroundColor: (ctx) => makeAreaGradient(ctx.chart.ctx, ctx.chart.chartArea, '#fb923c', 0.42, 0),
      pointBackgroundColor: '#fb923c',
      pointBorderColor: 'rgba(8,8,11,0.95)',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      tension: 0.45,
      fill: true,
      borderWidth: 2.6,
    },
  ],
}))

const trendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animation: { duration: 1100, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(14, 14, 16, 0.96)',
      titleColor: '#f5f5f7',
      bodyColor: '#c5c5c8',
      borderColor: 'rgba(251, 191, 36, 0.32)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      displayColors: true,
      boxPadding: 4,
      titleFont: { weight: '700', size: 12 },
      bodyFont: { size: 11.5 },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8e8e93', font: { size: 11, family: 'ui-monospace, monospace' } },
      grid: { display: false },
      border: { color: 'rgba(255,255,255,0.06)' },
    },
    y: {
      ticks: { color: '#8e8e93', font: { size: 11 }, precision: 0 },
      grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
      border: { display: false },
      beginAtZero: true,
    },
  },
}

const SOURCE_COLORS = ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#fde68a', '#f97316', '#dc2626', '#34d399', '#9ca3af']
const sourceColor = (i) => SOURCE_COLORS[i % SOURCE_COLORS.length]

const sourcesData = computed(() => ({
  labels: sources.value.map(s => humanSource(s.stage)),
  datasets: [{
    data: sources.value.map(s => s.count),
    backgroundColor: sources.value.map((_, i) => sourceColor(i)),
    borderColor: 'rgba(8,8,11,0.95)',
    borderWidth: 3,
    hoverOffset: 12,
    hoverBorderColor: 'rgba(251, 191, 36, 0.6)',
  }],
}))

const sourcesOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  animation: { animateRotate: true, animateScale: true, duration: 1200, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(14, 14, 16, 0.96)',
      titleColor: '#f5f5f7',
      bodyColor: '#c5c5c8',
      borderColor: 'rgba(251, 191, 36, 0.32)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
    },
  },
}

const hasDept = computed(() => dept.value.length > 0)
const deptData = computed(() => ({
  labels: dept.value.map(d => d.department),
  datasets: [
    {
      label: 'Open',
      data: dept.value.map(d => d.open_positions),
      backgroundColor: (ctx) => makeAreaGradient(ctx.chart.ctx, ctx.chart.chartArea, '#fbbf24', 0.95, 0.35),
      borderRadius: 8,
      borderSkipped: false,
    },
    {
      label: 'Applications',
      data: dept.value.map(d => d.applications),
      backgroundColor: (ctx) => makeAreaGradient(ctx.chart.ctx, ctx.chart.chartArea, '#fb923c', 0.95, 0.35),
      borderRadius: 8,
      borderSkipped: false,
    },
    {
      label: 'Hires',
      data: dept.value.map(d => d.hires),
      backgroundColor: (ctx) => makeAreaGradient(ctx.chart.ctx, ctx.chart.chartArea, '#34d399', 0.95, 0.35),
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
}))
const deptOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 1100, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(14, 14, 16, 0.96)',
      titleColor: '#f5f5f7',
      bodyColor: '#c5c5c8',
      borderColor: 'rgba(251, 191, 36, 0.32)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: '#8e8e93', font: { size: 11 } },
      grid: { display: false },
      border: { color: 'rgba(255,255,255,0.06)' },
    },
    y: {
      ticks: { color: '#8e8e93', font: { size: 11 }, precision: 0 },
      grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
      border: { display: false },
      beginAtZero: true,
    },
  },
}

// ─── Funnel helpers ───
const maxFunnel = computed(() => Math.max(1, ...funnel.value.map(f => f.count)))
const pct = (v, max) => Math.max(2, ((v || 0) / (max || 1)) * 100)

const conversion = (i) => {
  if (i === 0) return 0
  const prev = funnel.value[i - 1]?.count || 0
  const cur  = funnel.value[i]?.count || 0
  if (!prev) return 0
  return Math.round(((cur - prev) / prev) * 100)
}

const stageColor = (s) => ({
  APPLIED: '#fde68a', SCREENING: '#fbbf24', SHORTLISTED: '#f59e0b',
  INTERVIEW: '#fb923c', SELECTED: '#ea580c', OFFER: '#f97316',
  JOINED: '#34d399', REJECTED: '#f87171',
}[s] || '#9ca3af')
const stageGrad = (s) => {
  const c = stageColor(s)
  return `linear-gradient(90deg, ${c}, ${c}cc)`
}

const humanStage = (s) =>
  ({ APPLIED:'Applied', SCREENING:'Screening', SHORTLISTED:'Shortlisted',
    INTERVIEW:'Interview', SELECTED:'Selected', OFFER:'Offer',
    JOINED:'Joined', REJECTED:'Rejected', WITHDRAWN:'Withdrawn' }[s] || s)

const humanSource = (s) => ({
  PORTAL: 'Portal', REFERRAL: 'Referral', LINKEDIN: 'LinkedIn',
  NAUKRI: 'Naukri', INDEED: 'Indeed', AGENCY: 'Agency',
  WALK_IN: 'Walk-in', CAMPUS: 'Campus', DIRECT: 'Direct', OTHER: 'Other',
}[s] || s)

const shortMonth = (m) => {
  if (!m) return ''
  const [, mo] = m.split('-')
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo, 10) - 1] || m
}
</script>

<style scoped>
.rec-analytics { display: flex; flex-direction: column; gap: 16px; }

/* ─── Glass card with animated border halo and inner glow ─── */
.glass-card {
  position: relative;
  background:
    linear-gradient(180deg, rgba(20, 19, 24, 0.85) 0%, rgba(10, 10, 12, 0.92) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 22px 24px;
  overflow: hidden;
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  box-shadow:
    0 24px 60px -32px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(251, 191, 36, 0.025) inset;
  animation: rec-rise-soft 0.5s var(--hr-spring) backwards;
}
.glass-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg,
    rgba(251, 191, 36, 0.28) 0%,
    rgba(251, 146, 60, 0.1) 35%,
    rgba(255, 255, 255, 0.04) 60%,
    rgba(251, 146, 60, 0.22) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  opacity: 0.45;
  z-index: 0;
}
.glass-card > *:not(.card-glow) { position: relative; z-index: 1; }

.card-glow {
  position: absolute;
  top: -50%;
  left: -10%;
  width: 60%;
  height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.16), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
  animation: rec-glow-drift 16s ease-in-out infinite;
  z-index: 0;
}
.glass-card:nth-of-type(2n) .card-glow {
  left: auto; right: -10%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 146, 60, 0.14), transparent 70%);
}

@keyframes rec-glow-drift {
  0%, 100% { transform: translate(0, 0); }
  33%      { transform: translate(20%, 10%); }
  66%      { transform: translate(-10%, -20%); }
}

.card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; margin-bottom: 16px;
}
.card-title {
  margin: 0;
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 15px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.title-icon {
  display: inline-grid; place-items: center;
  width: 26px; height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(251, 146, 60, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.24);
  color: var(--hr-accent-gold);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}
.card-sub { margin: 4px 0 0 35px; font-size: 12px; color: var(--hr-text-muted); }

.trend-legend {
  display: inline-flex; gap: 10px; flex-wrap: wrap;
  font-size: 11px;
  color: var(--hr-text-muted);
  align-items: center;
}
.lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
}
.lg .d {
  width: 8px; height: 8px;
  border-radius: 50%;
}
.lg-a .d { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; }
.lg-b .d { background: #fb923c; box-shadow: 0 0 8px #fb923c; }
.lg-c .d { background: #34d399; box-shadow: 0 0 8px #34d399; }

.ana-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}

.chart-wrap {
  position: relative;
  height: 260px;
}
.chart-wrap.large { height: 340px; }

.empty-mini {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 60px 16px;
  color: var(--hr-text-muted);
  font-size: 12px;
}

/* ─── Sources donut with center label and animated bars ─── */
.sources-row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 22px;
  align-items: center;
}
.donut-wrap {
  position: relative;
  width: 220px; height: 220px;
}
.sources-donut { width: 220px !important; height: 220px !important; }
.donut-center {
  position: absolute;
  inset: 0;
  display: grid; place-items: center;
  pointer-events: none;
}
.donut-center .donut-count {
  font-size: 30px;
  font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.02em;
  background: var(--hr-gradient-hero);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 4px 12px rgba(251, 146, 60, 0.4));
}
.donut-center .donut-label {
  margin-top: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
.sources-legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
.src-row {
  display: grid;
  grid-template-columns: 14px 1fr 100px auto;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--hr-text-secondary);
  animation: rec-rise-soft 0.42s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}
.leg-dot   { width: 12px; height: 12px; border-radius: 4px; box-shadow: 0 0 8px var(--c); }
.leg-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
}
.leg-bar-fill {
  position: absolute;
  inset: 0;
  width: 0;
  border-radius: inherit;
  animation: rec-bar-grow 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--i, 0) * 70ms + 200ms);
}
@keyframes rec-bar-grow { to { width: var(--final, 100%); } }
.leg-count { font-weight: 800; color: var(--hr-text); font-variant-numeric: tabular-nums; }

/* ─── Funnel drop-off (animated horizontal bars with shine) ─── */
.funnel-bars { display: flex; flex-direction: column; gap: 12px; }
.funnel-row {
  display: grid;
  grid-template-columns: 140px 1fr 90px;
  align-items: center;
  gap: 14px;
  animation: rec-rise 0.5s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 80ms);
}
.f-stage {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12.5px;
  color: var(--hr-text-secondary);
  font-weight: 600;
}
.stage-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
}
.f-track {
  position: relative;
  height: 30px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.f-fill {
  position: relative;
  height: 100%;
  width: 0;
  display: flex; align-items: center; justify-content: flex-end;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
  color: #1a1a1c;
  border-radius: 8px;
  animation: rec-funnel-fill 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--i, 0) * 110ms + 200ms);
}
.f-shine {
  position: absolute;
  top: 0; left: -40%;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
  filter: blur(2px);
  animation: rec-funnel-shine 2.6s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 110ms + 1.2s);
}
.f-count { position: relative; z-index: 1; text-shadow: 0 1px 0 rgba(255,255,255,0.25); }

@keyframes rec-funnel-fill { to { width: var(--w, 100%); } }
@keyframes rec-funnel-shine {
  0%   { transform: translateX(0); }
  60%  { transform: translateX(420%); }
  100% { transform: translateX(420%); }
}

.f-conv {
  display: inline-flex; align-items: center; justify-content: flex-end;
  font-size: 11px;
  font-weight: 700;
}
.conv-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.32);
  color: #34d399;
}
.conv-chip.neg {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.32);
  color: #f87171;
}
.dim { color: var(--hr-text-muted); }

@media (max-width: 1100px) {
  .ana-grid { grid-template-columns: 1fr; }
  .sources-row { grid-template-columns: 1fr; }
  .donut-wrap { margin: 0 auto; }
  .funnel-row { grid-template-columns: 100px 1fr 70px; gap: 10px; }
}
</style>
