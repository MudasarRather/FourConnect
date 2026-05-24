<template>
  <div class="onb-dash">

    <!-- Premium section banner -->
    <Motion as="header" class="onb-section-banner dash-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Live · onboarding command centre</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Joining</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Pipeline</span>
        </h2>
        <p class="onb-banner-sub">Real-time pulse on every joiner — pre-join, documents, identity, assets, training, and probation — all in one floating glass canvas.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ stats?.today_joining || 0 }}</span>
          <span class="onb-banner-stat-label">Today</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ totalInProgress }}</span>
          <span class="onb-banner-stat-label">In progress</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ stats?.probation_employees || 0 }}</span>
          <span class="onb-banner-stat-label">Probation</span>
        </div>
      </div>
    </Motion>

    <!-- BENTO GRID — asymmetric layout -->
    <div class="bento">
      <!-- 1. Big KPI hero card -->
      <Motion as="article" class="bento-card hero-pulse" data-tone="gold"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="hp-head">
          <span class="hp-label">Joining Mission Status</span>
          <span class="hp-pulse" />
        </header>
        <div class="hp-value">
          <OnbAnimatedNumber :value="totalInProgress" />
          <span class="hp-suffix">joiners</span>
        </div>
        <div class="hp-foot">
          <span class="hp-foot-stat"><FileText :size="11" /> {{ stats?.pending_documents || 0 }} docs pending</span>
          <span class="hp-foot-stat"><Package :size="11" /> {{ stats?.pending_asset_allocation || 0 }} assets to issue</span>
        </div>
        <div class="hp-trend">
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" class="hp-spark" aria-hidden="true">
            <defs>
              <linearGradient id="onbSpark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path :d="sparkArea" fill="url(#onbSpark)" />
            <path :d="sparkLine" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
      </Motion>

      <!-- 2. Today joining + today stats -->
      <Motion as="article" class="bento-card today-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="today-head">
          <div class="today-title">
            <CalendarDays :size="13" />
            <span>Today</span>
          </div>
          <span class="today-date">{{ todayLabel }}</span>
        </header>
        <div class="today-value">
          <OnbAnimatedNumber :value="stats?.today_joining || 0" />
          <span class="today-unit">reporting</span>
        </div>
        <div class="today-strip">
          <span class="today-row"><span class="today-dot dot-gold"/> Pre-Join · {{ stageCount('PRE_JOIN') }}</span>
          <span class="today-row"><span class="today-dot dot-amber"/> Documents · {{ stageCount('DOCS') }}</span>
          <span class="today-row"><span class="today-dot dot-orange"/> Training · {{ stageCount('TRAINING') }}</span>
        </div>
      </Motion>

      <!-- 3. Probation gauge -->
      <Motion as="article" class="bento-card prob-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <Gauge :size="13" />
          <span>On Probation</span>
        </header>
        <div class="prob-num">
          <OnbAnimatedNumber :value="stats?.probation_employees || 0" />
        </div>
        <div class="prob-bar">
          <div class="prob-bar-fill" :style="{ width: probationFill + '%' }"></div>
        </div>
        <span class="prob-caption">vs {{ totalActive || 0 }} active employees</span>
      </Motion>

      <!-- 4. Department-wise (mini bar chart) -->
      <Motion as="article" class="bento-card dept-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head">
          <Building2 :size="13" />
          <span>Joiners by Department</span>
        </header>
        <ul class="dept-rows">
          <li v-for="(d, i) in topDepts" :key="d.department">
            <span class="dept-name">{{ d.department }}</span>
            <Motion as="span" class="dept-bar"
              :initial="{ scaleX: 0 }"
              :animate="{ scaleX: 1 }"
              :transition="{ duration: 0.6, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }"
            >
              <span class="dept-fill" :style="{ width: deptPct(d.count) + '%' }"></span>
            </Motion>
            <span class="dept-count">{{ d.count }}</span>
          </li>
          <li v-if="!topDepts.length" class="dept-empty">No active onboardings.</li>
        </ul>
      </Motion>

      <!-- 5. Cohort lanes — horizontal scroll -->
      <Motion as="article" class="bento-card lanes-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="lanes-head">
          <div class="lanes-title">
            <Workflow :size="14" />
            <span>Cohort lanes</span>
          </div>
          <button class="onb-btn-ghost" @click="reloadProcesses"><RefreshCw :size="13" />Refresh</button>
        </header>
        <div class="lanes-scroll">
          <div v-for="(lane, idx) in lanes" :key="lane.key" class="lane" :data-stage="lane.key">
            <header class="lane-head">
              <span class="lane-name">{{ lane.label }}</span>
              <span class="lane-count">{{ lane.processes.length }}</span>
            </header>
            <div class="lane-cards">
              <Motion v-for="(p, i) in lane.processes" :key="p.id" as="button" class="cohort-card"
                :initial="{ opacity: 0, y: 14 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.05 * i + 0.02 * idx, ease: [0.22, 1, 0.36, 1] }"
                :whileHover="{ y: -3, transition: { duration: 0.18 } }"
                @click="$emit('go', 'checklist')"
              >
                <div class="cohort-top">
                  <span class="cohort-avatar">{{ initials(p.employee_name) }}</span>
                  <span class="cohort-stage" :data-stage="p.current_stage">{{ STAGE_LABELS[p.current_stage] }}</span>
                </div>
                <div class="cohort-name">{{ p.employee_name || 'Joiner' }}</div>
                <div class="cohort-code">{{ p.employee_code || '—' }}</div>
                <div class="cohort-prog">
                  <div class="cohort-prog-bar"><div class="cohort-prog-fill" :style="{ width: (p.progress_pct || 0) + '%' }"/></div>
                  <span class="cohort-prog-pct">{{ p.progress_pct || 0 }}%</span>
                </div>
              </Motion>
              <div v-if="!lane.processes.length" class="lane-empty">Empty</div>
            </div>
          </div>
        </div>
      </Motion>

      <!-- 6. Hot tasks -->
      <Motion as="article" class="bento-card tasks-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="card-head between">
          <div class="card-head-left">
            <Flame :size="13" />
            <span>Hot tasks</span>
          </div>
          <button class="onb-btn-ghost" @click="$emit('go', 'tasks')"><ArrowRight :size="13" />Tasks</button>
        </header>
        <ul class="task-list">
          <Motion v-for="(t, i) in hotTasks" :key="t.id" as="li"
            class="task-row" :class="{ 'is-breach': t.sla_breach }"
            :initial="{ opacity: 0, x: -8 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.36, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
          >
            <span class="task-pri" :data-pri="t.priority">{{ t.priority }}</span>
            <div class="task-main">
              <div class="task-title">{{ t.title }}</div>
              <div class="task-meta">
                <span>{{ t.employee_name || '—' }}</span>
                <span v-if="t.due_date" class="task-due">due {{ formatDate(t.due_date) }}</span>
              </div>
            </div>
            <span class="task-status" :data-status="t.status">{{ t.status }}</span>
          </Motion>
          <li v-if="!hotTasks.length" class="task-empty">No active tasks. Nice work.</li>
        </ul>
      </Motion>

      <!-- 7. Calendar mini -->
      <Motion as="article" class="bento-card cal-card"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="cal-head">
          <span class="cal-month">{{ monthLabel }}</span>
          <span class="cal-sub">joining days highlighted</span>
        </header>
        <div class="cal-week">
          <span v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="cal-week-day">{{ d }}</span>
        </div>
        <div class="cal-grid">
          <span v-for="(c, i) in calendarCells" :key="i" class="cal-cell"
                :class="{ 'is-today': c.today, 'has-joiners': c.count > 0, 'is-other': c.other }">
            <span class="cal-num">{{ c.day }}</span>
            <span v-if="c.count > 0" class="cal-dot">{{ c.count }}</span>

            <!-- Hover tooltip — joiners landing on this day -->
            <div v-if="c.count > 0" class="onb-cal-tip" role="tooltip">
              <header class="onb-cal-tip-head">
                <span class="onb-cal-tip-date">{{ c.fullDate }}</span>
                <span class="onb-cal-tip-count">{{ c.count }} {{ c.count === 1 ? 'joiner' : 'joiners' }}</span>
              </header>
              <ul class="onb-cal-tip-list">
                <li v-for="(j, ji) in c.joiners.slice(0, 6)" :key="ji" class="onb-cal-tip-row">
                  <span class="onb-cal-tip-avatar">{{ initials(j.employee_name) }}</span>
                  <span class="onb-cal-tip-name">{{ j.employee_name || 'Joiner' }}</span>
                  <span class="onb-cal-tip-stage">{{ STAGE_LABELS[j.current_stage] || j.current_stage }}</span>
                </li>
              </ul>
              <div v-if="c.joiners.length > 6" class="onb-cal-tip-more">
                +{{ c.joiners.length - 6 }} more
              </div>
            </div>
          </span>
        </div>
      </Motion>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  FileText, Package, CalendarDays, Gauge, Building2, Workflow,
  Flame, ArrowRight, RefreshCw,
} from 'lucide-vue-next'
import OnbAnimatedNumber from '../components/OnbAnimatedNumber.vue'
import { fetchProcesses } from '../composables/useOnboarding'

const props = defineProps({
  stats: { type: Object, default: null },
  hotTasks: { type: Array, default: () => [] },
  journey: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['refresh', 'go'])

const STAGE_ORDER = ['PRE_JOIN', 'APPROVAL', 'DOCS', 'IDENTITY', 'ASSETS', 'TRAINING', 'ACTIVE']
const STAGE_LABELS = {
  PRE_JOIN: 'Pre-Join', APPROVAL: 'Approval', DOCS: 'Documents',
  IDENTITY: 'Identity', ASSETS: 'Assets', TRAINING: 'Training', ACTIVE: 'Active',
}

const processes = ref([])
const reloadProcesses = async () => {
  try {
    const data = await fetchProcesses({ limit: 200 })
    processes.value = data.items || []
  } catch {}
}
onMounted(reloadProcesses)

const totalInProgress = computed(() => props.stats?.incomplete_onboarding || 0)
const totalActive = computed(() => processes.value.filter(p => p.current_stage === 'ACTIVE').length)
const probationFill = computed(() => {
  const total = (processes.value.length || 0)
  if (!total) return 0
  return Math.min(100, Math.round(((props.stats?.probation_employees || 0) / Math.max(1, total)) * 100))
})

const stageCount = (key) => processes.value.filter(p => p.current_stage === key).length

const lanes = computed(() =>
  STAGE_ORDER.map(key => ({
    key, label: STAGE_LABELS[key],
    processes: processes.value.filter(p => p.current_stage === key).slice(0, 6),
  }))
)

const topDepts = computed(() => {
  const list = props.stats?.department_wise_joining || []
  return [...list].sort((a, b) => b.count - a.count).slice(0, 6)
})
const deptMax = computed(() => Math.max(1, ...topDepts.value.map(d => d.count)))
const deptPct = (c) => Math.round((c / deptMax.value) * 100)

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
const initials = (name) => (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

// Sparkline – synthesize a smooth wave reflecting incomplete vs trend
const sparkPoints = computed(() => {
  const base = totalInProgress.value
  const series = Array.from({ length: 12 }, (_, i) => Math.max(0, base * (0.55 + 0.35 * Math.sin(i * 0.6 + base * 0.1))))
  const max = Math.max(...series, 1)
  return series.map((v, i) => ({ x: (i / (series.length - 1)) * 200, y: 36 - (v / max) * 30 }))
})
const sparkLine = computed(() => sparkPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '))
const sparkArea = computed(() => `${sparkLine.value} L200,40 L0,40 Z`)

// Today label
const todayLabel = computed(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' }))
const monthLabel = computed(() => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))

// Calendar cells (current month, mark today + days with joiners + tooltip data)
const calendarCells = computed(() => {
  const today = new Date()
  const y = today.getFullYear(), m = today.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  // Build joiner list per day from processes' target dates within this month
  const byDay = {}
  for (const p of processes.value) {
    if (!p.target_joining_date) continue
    const d = new Date(p.target_joining_date)
    if (d.getFullYear() === y && d.getMonth() === m) {
      const day = d.getDate()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(p)
    }
  }
  const monthName = today.toLocaleString('en-IN', { month: 'long' })
  const cells = []
  // Leading blanks
  for (let i = 0; i < firstDay; i++) cells.push({ day: '', other: true, count: 0, today: false, joiners: [], fullDate: '' })
  for (let d = 1; d <= daysInMonth; d++) {
    const joiners = byDay[d] || []
    cells.push({
      day: d,
      other: false,
      count: joiners.length,
      today: d === today.getDate(),
      joiners,
      fullDate: `${monthName} ${d}, ${y}`,
    })
  }
  return cells
})
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-dash { display: flex; flex-direction: column; gap: 16px; }

.dash-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}

/* ── Bento ── */
.bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: minmax(170px, auto);
  gap: 14px;
}
.bento-card {
  position: relative;
  background: var(--onb-glass);
  border: 1px solid var(--onb-glass-border);
  border-radius: 22px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  padding: 20px 22px;
  display: flex; flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  transition:
    border-color .3s var(--hr-spring),
    transform .35s var(--hr-spring),
    box-shadow .4s var(--hr-spring),
    background .3s var(--hr-spring);
  animation: onb-card-enter 0.65s var(--hr-spring) both;
}
.bento-card::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.08), transparent 35%),
    radial-gradient(70% 50% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 70%);
  pointer-events: none;
  z-index: -1;
}
.bento-card::after {
  content: ''; position: absolute; inset: -1px;
  border-radius: inherit; padding: 1px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.55), rgba(251, 146, 60, 0.25) 45%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity .35s var(--hr-spring);
  pointer-events: none;
}
.bento-card:hover { border-color: var(--onb-card-hover-border); transform: translateY(-3px); box-shadow: var(--onb-glass-shadow-hi); }
.bento-card:hover::after { opacity: 1; }

/* Hero pulse card – wide left */
.hero-pulse { grid-column: span 5; grid-row: span 2; }
.hero-pulse[data-tone="gold"] {
  background:
    radial-gradient(100% 100% at 100% 0%, rgba(251, 146, 60, 0.22), transparent 65%),
    radial-gradient(60% 80% at 0% 100%, rgba(192, 132, 252, 0.10), transparent 70%),
    linear-gradient(180deg, rgba(28, 22, 16, 0.55), rgba(14, 11, 9, 0.55));
  border-color: rgba(251, 191, 36, 0.22);
}
.hp-head { display: flex; align-items: center; justify-content: space-between; }
.hp-label { font-size: 10px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--hr-accent-gold); }
.hp-pulse { width: 10px; height: 10px; border-radius: 50%; background: var(--hr-accent-gold); box-shadow: 0 0 0 0 var(--hr-accent-gold); animation: hr-pulse-dot-gold 2s ease-in-out infinite; }
.hp-value {
  display: flex; align-items: baseline; gap: 12px;
  margin-top: 18px;
  font-size: 72px; font-weight: 800; letter-spacing: -0.04em;
  color: var(--hr-text); font-variant-numeric: tabular-nums; line-height: 0.95;
  background: linear-gradient(180deg, #fde68a 0%, #fbbf24 60%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  filter: drop-shadow(0 8px 24px rgba(251, 146, 60, 0.3));
}
.hp-value :deep(span) { color: transparent; }
.hp-suffix { font-size: 13px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.4px; -webkit-text-fill-color: var(--hr-text-muted); }
.hp-foot { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
.hp-foot-stat {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.18);
  font-size: 11px; color: var(--hr-text-secondary);
}
.hp-trend { margin-top: auto; padding-top: 16px; position: relative; }
.hp-trend::before {
  content: ''; position: absolute; left: -22px; right: -22px; top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.22), transparent);
}
.hp-spark { width: 100%; height: 56px; display: block; }

/* Today card */
.today-card { grid-column: span 4; grid-row: span 1; }
.today-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.today-title { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--hr-text-muted); }
.today-date {
  font-size: 10px; color: var(--hr-accent-gold); font-family: var(--hr-mono);
  padding: 3px 8px; border-radius: 6px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.18);
}
.today-value {
  display: flex; align-items: baseline; gap: 10px;
  margin-top: 12px;
  font-size: 48px; font-weight: 800; letter-spacing: -0.03em;
  color: var(--hr-text); font-variant-numeric: tabular-nums; line-height: 1;
}
.today-unit { font-size: 12px; color: var(--hr-text-muted); }
.today-strip { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; font-size: 11px; color: var(--hr-text-secondary); }
.today-row { display: inline-flex; align-items: center; gap: 10px; padding: 4px 0; }
.today-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
.dot-gold { background: var(--hr-accent-gold); color: var(--hr-accent-gold); }
.dot-amber { background: var(--hr-amber); color: var(--hr-amber); }
.dot-orange { background: var(--hr-orange); color: var(--hr-orange); }

/* Probation card */
.prob-card { grid-column: span 3; grid-row: span 1; }
.card-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--hr-text-muted); }
.card-head.between { display: flex; justify-content: space-between; }
.card-head-left { display: inline-flex; align-items: center; gap: 6px; }
.prob-num {
  font-size: 48px; font-weight: 800; letter-spacing: -0.03em;
  background: linear-gradient(180deg, #fde68a, #f59e0b);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  margin-top: 10px; line-height: 1;
}
.prob-bar { height: 8px; background: rgba(255, 255, 255, 0.06); border-radius: 999px; overflow: hidden; margin-top: 12px; box-shadow: inset 0 1px 0 rgba(0,0,0,0.2); }
.prob-bar-fill { height: 100%; background: linear-gradient(90deg, #fde68a, #f59e0b, #f87171); border-radius: inherit; transition: width 1.2s var(--hr-ease-quint); box-shadow: 0 0 10px rgba(251, 146, 60, 0.4); }
.prob-caption { font-size: 11px; color: var(--hr-text-muted); margin-top: 8px; }

/* Department card */
.dept-card { grid-column: span 4; grid-row: span 1; }
.dept-rows { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.dept-rows li { display: grid; grid-template-columns: 100px 1fr 44px; gap: 12px; align-items: center; }
.dept-name { font-size: 11.5px; color: var(--hr-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.dept-bar {
  position: relative; display: block;
  height: 8px; background: rgba(255, 255, 255, 0.05);
  border-radius: 999px; overflow: hidden;
  transform-origin: left center;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.2);
}
.dept-fill { display: block; height: 100%; background: var(--hr-gradient-hero); border-radius: inherit; box-shadow: 0 0 10px rgba(251, 146, 60, 0.45); }
.dept-count { font-size: 13px; font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; color: var(--hr-text); }
.dept-empty { font-size: 11px; color: var(--hr-text-dim); padding: 16px; text-align: center; }

/* Cohort lanes */
.lanes-card { grid-column: span 8; grid-row: span 2; }
.lanes-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.lanes-title { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--hr-text); letter-spacing: -0.01em; }
.lanes-scroll {
  position: relative;
  display: flex; gap: 12px; overflow-x: auto; margin-top: 14px;
  padding: 0 2px 12px;
  /* Edge fade so cards look like they sit in a slick rail, not behind a hard scrollbar */
  mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.45) transparent;
}
.lanes-scroll::-webkit-scrollbar {
  height: 4px;
}
.lanes-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.lanes-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.55), rgba(251, 146, 60, 0.55));
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.45);
}
.lanes-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, var(--hr-accent-gold), #fb923c);
}
.lane {
  flex: 0 0 210px;
  background: rgba(14, 11, 9, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px; padding: 12px;
  display: flex; flex-direction: column; gap: 10px; min-height: 240px;
  backdrop-filter: blur(10px);
}
.lane-head { display: flex; justify-content: space-between; align-items: center; }
.lane-name { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--hr-text-muted); }
.lane-count {
  font-size: 10.5px; font-weight: 800;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  padding: 2px 8px; border-radius: 999px;
  border: 1px solid rgba(251, 191, 36, 0.22);
}
.lane-cards { display: flex; flex-direction: column; gap: 8px; }
.cohort-card {
  position: relative;
  background: rgba(20, 20, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  color: var(--hr-text);
  font: inherit;
  overflow: hidden;
  transition: border-color .2s var(--hr-spring), background .2s var(--hr-spring);
}
.cohort-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--hr-gradient-hero); border-radius: 2px;
  transform: scaleY(0); transform-origin: top; transition: transform .35s var(--hr-spring);
}
.cohort-card:hover { border-color: var(--hr-accent-gold-border); background: rgba(28, 24, 20, 0.55); }
.cohort-card:hover::before { transform: scaleY(1); }
.cohort-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.cohort-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-gradient-hero); color: #1f1408;
  font-size: 10px; font-weight: 800;
  box-shadow: 0 4px 12px -4px rgba(251, 146, 60, 0.55);
}
.cohort-stage { font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 5px;
                background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid rgba(251, 191, 36, 0.18); }
.cohort-name { font-size: 12px; font-weight: 700; color: var(--hr-text); margin-top: 6px; }
.cohort-code { font-size: 9.5px; font-family: var(--hr-mono); color: var(--hr-text-muted); margin-top: 1px; }
.cohort-prog { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.cohort-prog-bar { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.07); border-radius: 999px; overflow: hidden; }
.cohort-prog-fill { height: 100%; background: var(--hr-gradient-hero); border-radius: inherit; transition: width .8s var(--hr-ease-quint); box-shadow: 0 0 6px rgba(251, 146, 60, 0.45); }
.cohort-prog-pct { font-size: 10px; font-weight: 800; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.lane-empty { font-size: 10px; color: var(--hr-text-dim); border: 1px dashed rgba(251, 191, 36, 0.18); border-radius: 8px; padding: 14px 8px; text-align: center; }

/* Tasks card */
.tasks-card { grid-column: span 4; grid-row: span 2; }
.task-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 340px; overflow-y: auto; padding-right: 4px; }
.task-list::-webkit-scrollbar { width: 4px; }
.task-list::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.18); border-radius: 4px; }
.task-row {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(14, 11, 9, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: border-color .2s var(--hr-spring), background .2s var(--hr-spring), transform .2s var(--hr-spring);
}
.task-row:hover { border-color: var(--hr-accent-gold-border); transform: translateX(2px); }
.task-row.is-breach { background: rgba(248, 113, 113, 0.10); border-color: rgba(248, 113, 113, 0.32); }
.task-pri { font-size: 9px; font-weight: 800; letter-spacing: 0.5px; padding: 3px 7px; border-radius: 5px; background: rgba(255,255,255,0.06); color: var(--hr-text-muted); }
.task-pri[data-pri="HIGH"]    { background: rgba(251, 146, 60, 0.16); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.22); }
.task-pri[data-pri="URGENT"]  { background: rgba(248, 113, 113, 0.16); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.32); animation: hr-pulse-dot-gold 1.6s ease-in-out infinite; }
.task-main { flex: 1; min-width: 0; }
.task-title { font-size: 12.5px; font-weight: 700; color: var(--hr-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-meta { display: flex; gap: 10px; font-size: 10px; color: var(--hr-text-muted); margin-top: 2px; }
.task-due { font-family: var(--hr-mono); }
.task-status { font-size: 9px; font-weight: 800; padding: 3px 7px; border-radius: 999px; background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); }
.task-status[data-status="DONE"] { background: rgba(52, 211, 153, 0.16); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }
.task-status[data-status="BLOCKED"] { background: rgba(248, 113, 113, 0.16); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.task-empty { padding: 24px; text-align: center; color: var(--hr-text-dim); font-size: 12px; }

/* Calendar */
.cal-card { grid-column: span 4; grid-row: span 2; overflow: visible; }
.cal-grid { overflow: visible; }
.cal-cell { z-index: 1; }
.cal-cell:hover { z-index: 50; }
.cal-head { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin-bottom: 12px; }
.cal-month { font-size: 16px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.02em; }
.cal-sub { font-size: 10px; color: var(--hr-text-muted); letter-spacing: 0.4px; }
.cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; padding: 2px 0 8px; }
.cal-week-day { font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; color: var(--hr-text-muted); text-align: center; text-transform: uppercase; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  font-size: 12px; font-weight: 700;
  color: var(--hr-text-secondary);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all .25s var(--hr-spring);
  cursor: pointer;
}
.cal-cell:hover { transform: scale(1.05); border-color: var(--hr-accent-gold-border); }
.cal-cell.is-other { color: var(--hr-text-dim); background: transparent; border-color: transparent; }
.cal-cell.is-today {
  background: var(--hr-gradient-hero); color: #1f1408; font-weight: 800;
  box-shadow: 0 8px 24px -6px rgba(251, 146, 60, 0.65), inset 0 1px 0 rgba(255,255,255,0.3);
  animation: onb-ripple 2.4s ease-out infinite;
}
.cal-cell.has-joiners {
  background: rgba(251, 191, 36, 0.14);
  border-color: var(--hr-border-warm);
  color: var(--hr-accent-gold);
}
.cal-cell.is-today .cal-num { color: #1f1408; }
.cal-cell .cal-num { display: block; }
.cal-dot {
  position: absolute; bottom: 3px;
  font-size: 8.5px; font-weight: 800;
  padding: 1px 5px;
  background: rgba(31, 20, 8, 0.75);
  color: #fde68a;
  border-radius: 6px;
}
.cal-cell.is-today .cal-dot { background: rgba(255,255,255,0.92); color: #1f1408; }

/* responsive collapse */
@media (max-width: 1200px) {
  .bento { grid-template-columns: repeat(8, 1fr); }
  .hero-pulse { grid-column: span 4; grid-row: span 2; }
  .today-card { grid-column: span 4; }
  .prob-card  { grid-column: span 4; }
  .dept-card  { grid-column: span 4; }
  .lanes-card { grid-column: span 8; }
  .tasks-card { grid-column: span 4; }
  .cal-card   { grid-column: span 4; }
}
@media (max-width: 800px) {
  .bento { grid-template-columns: 1fr; }
  .hero-pulse, .today-card, .prob-card, .dept-card, .lanes-card, .tasks-card, .cal-card { grid-column: span 1; grid-row: auto; }
}
</style>
