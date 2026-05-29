<template>
  <section class="att-dash">
    <!-- ════════════════════════════════════════════════════════
         COMMAND ROW — On-time gauge (orbital ring) + Floor stream
         A deliberately asymmetric layout — looks nothing like the
         "grid of cards" you'll see in onboarding/recruitment/docs.
         ════════════════════════════════════════════════════════ -->
    <div class="command-row">
      <!-- LEFT: orbital on-time gauge -->
      <Motion as="article" class="dash-card on-time-orb"
        :initial="{ opacity: 0, y: 14, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="orb-glow" />
        <header class="card-head minimal">
          <div>
            <span class="card-eyebrow"><span class="card-eyebrow-dot" />On-time today</span>
            <h3 class="card-title">Punctuality core</h3>
          </div>
        </header>

        <div class="orbital">
          <svg viewBox="0 0 220 220" class="orb-svg" aria-hidden="true">
            <defs>
              <linearGradient id="onTimeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fde68a" />
                <stop offset="50%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#fb923c" />
              </linearGradient>
            </defs>
            <!-- outer dotted ring -->
            <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(251, 191, 36, 0.18)" stroke-width="1" stroke-dasharray="2 6" class="orb-dotted" />
            <!-- track -->
            <circle cx="110" cy="110" r="84" fill="none" stroke="rgba(251, 191, 36, 0.18)" stroke-width="10" />
            <!-- progress -->
            <circle cx="110" cy="110" r="84" fill="none" stroke="url(#onTimeGrad)" stroke-width="10" stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 84"
              :stroke-dashoffset="(2 * Math.PI * 84) * (1 - onTimePct / 100)"
              transform="rotate(-90 110 110)" class="orb-arc" />
            <!-- inner ticks -->
            <g class="orb-ticks">
              <line v-for="n in 12" :key="n"
                :x1="110 + 70 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
                :y1="110 + 70 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
                :x2="110 + (n % 3 === 0 ? 60 : 65) * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
                :y2="110 + (n % 3 === 0 ? 60 : 65) * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
                :stroke="n % 3 === 0 ? 'rgba(251,191,36,0.7)' : 'rgba(251,191,36,0.3)'" stroke-width="1.4" />
            </g>
          </svg>
          <div class="orb-center">
            <div class="orb-num">
              <OnbAnimatedNumber :value="onTimePct" />
              <span class="orb-pct">%</span>
            </div>
            <div class="orb-label">on time</div>
            <div class="orb-meta">
              <span class="orb-meta-dot" /> live · auto refresh
            </div>
          </div>
        </div>

        <button class="onb-btn-ghost orb-refresh" @click="$emit('refresh')" :disabled="loading">
          <RefreshCw :size="13" :class="{ spinning: loading }" />
          {{ loading ? 'Syncing…' : 'Refresh' }}
        </button>
      </Motion>

      <!-- RIGHT: live floor — animated mission-control dashboard
           with concentric mini-radar, scanning beam, status pulse pills,
           segmented punch bar + shift progress. -->
      <Motion as="article" class="dash-card floor-stream"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="fs-aurora a1" aria-hidden="true" />
        <span class="fs-aurora a2" aria-hidden="true" />
        <span class="fs-grid" aria-hidden="true" />
        <span class="fs-scan" aria-hidden="true" />

        <header class="card-head fs-head">
          <div>
            <span class="card-eyebrow"><span class="card-eyebrow-dot" />Live floor · realtime</span>
            <h3 class="card-title">On the floor right now</h3>
          </div>
          <span class="floor-headcount onb-mono">
            <Users :size="11" /> {{ stats?.headcount || 0 }}
          </span>
        </header>

        <!-- Pulse pills row — small radar-style indicators -->
        <div class="fs-pulse-row" aria-hidden="true">
          <span class="fs-pulse-pill present">
            <span class="fs-pulse-ring" /><span class="fs-pulse-dot" />
            <span class="fs-pulse-label">PRESENT</span>
            <b class="fs-pulse-num onb-mono">{{ stats?.present_today || 0 }}</b>
          </span>
          <span class="fs-pulse-pill late">
            <span class="fs-pulse-ring" /><span class="fs-pulse-dot" />
            <span class="fs-pulse-label">LATE</span>
            <b class="fs-pulse-num onb-mono">{{ stats?.late_count || 0 }}</b>
          </span>
          <span class="fs-pulse-pill wfh">
            <span class="fs-pulse-ring" /><span class="fs-pulse-dot" />
            <span class="fs-pulse-label">WFH</span>
            <b class="fs-pulse-num onb-mono">{{ stats?.on_wfh || 0 }}</b>
          </span>
          <span class="fs-pulse-pill absent">
            <span class="fs-pulse-ring" /><span class="fs-pulse-dot" />
            <span class="fs-pulse-label">ABSENT</span>
            <b class="fs-pulse-num onb-mono">{{ stats?.absent_today || 0 }}</b>
          </span>
        </div>

        <!-- segmented punch-card bar -->
        <div class="seg-bar-wrap">
          <div class="seg-bar">
            <Motion as="div" class="seg-bar-fill present"
              :style="{ width: pct('present_today') + '%' }"
              :initial="{ width: 0 }" :animate="{ width: pct('present_today') + '%' }"
              :transition="{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }">
              <span class="seg-glow" />
            </Motion>
            <Motion as="div" class="seg-bar-fill late"
              :style="{ width: pct('late_count') + '%' }"
              :initial="{ width: 0 }" :animate="{ width: pct('late_count') + '%' }"
              :transition="{ duration: 0.9, delay: 0.06 }" />
            <Motion as="div" class="seg-bar-fill wfh"
              :style="{ width: pct('on_wfh') + '%' }"
              :initial="{ width: 0 }" :animate="{ width: pct('on_wfh') + '%' }"
              :transition="{ duration: 0.9, delay: 0.12 }" />
            <Motion as="div" class="seg-bar-fill absent"
              :style="{ width: pct('absent_today') + '%' }"
              :initial="{ width: 0 }" :animate="{ width: pct('absent_today') + '%' }"
              :transition="{ duration: 0.9, delay: 0.18 }" />
          </div>
          <div class="seg-legend">
            <span class="seg-leg present" @click="$emit('go','daily')">
              <span class="seg-dot" />
              <span class="seg-leg-label">Present</span>
              <b>{{ stats?.present_today || 0 }}</b>
            </span>
            <span class="seg-leg late" @click="$emit('go','daily')">
              <span class="seg-dot" />
              <span class="seg-leg-label">Late</span>
              <b>{{ stats?.late_count || 0 }}</b>
            </span>
            <span class="seg-leg wfh" @click="$emit('go','wfh')">
              <span class="seg-dot" />
              <span class="seg-leg-label">WFH</span>
              <b>{{ stats?.on_wfh || 0 }}</b>
            </span>
            <span class="seg-leg absent" @click="$emit('go','daily')">
              <span class="seg-dot" />
              <span class="seg-leg-label">Absent</span>
              <b>{{ stats?.absent_today || 0 }}</b>
            </span>
          </div>
        </div>

        <!-- mini shift progress -->
        <div class="shift-mini">
          <div class="sm-head">
            <span class="sm-eyebrow"><Clock :size="10" /> Shift</span>
            <span class="sm-times onb-mono">{{ shiftWindow }}</span>
          </div>
          <div class="sm-track">
            <div class="sm-fill" :style="{ width: shiftProgress + '%' }" />
            <span class="sm-marker" :style="{ left: shiftProgress + '%' }">
              <span class="sm-marker-pin" />
            </span>
          </div>
          <div class="sm-meta">
            <span class="onb-mono">{{ shiftProgress }}% elapsed</span>
            <span>{{ remainingLabel }}</span>
          </div>
        </div>
      </Motion>
    </div>

    <!-- ════════════════════════════════════════════════════════
         METRIC TICKETS — six punch-card style KPI tiles
         ════════════════════════════════════════════════════════ -->
    <div class="ticket-row">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="button" type="button"
        class="metric-ticket"
        :data-tone="t.toneClass"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
        @click="$emit('go', t.go)"
      >
        <span class="mt-perf-l" />
        <span class="mt-perf-r" />
        <span class="mt-glow" />
        <header class="mt-head">
          <span class="mt-icon"><component :is="t.icon" :size="14" /></span>
          <span class="mt-label">{{ t.label }}</span>
        </header>
        <div class="mt-value">
          <OnbAnimatedNumber :value="t.value || 0" />
        </div>
        <div class="mt-sub">{{ t.sub }}</div>
        <span class="mt-arrow"><ArrowUpRight :size="11" /></span>
      </Motion>
    </div>

    <!-- ════════════════════════════════════════════════════════
         WATCHPOINTS — three live counters with ambient pulse
         ════════════════════════════════════════════════════════ -->
    <Motion as="article" class="dash-card watch-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }"
    >
      <header class="card-head">
        <div>
          <span class="card-eyebrow"><span class="card-eyebrow-dot" />Watchpoints</span>
          <h3 class="card-title">Needs your attention</h3>
        </div>
      </header>
      <div class="watchpoints">
        <button class="watch-item" @click="$emit('go','overtime')">
          <span class="watch-orb"><TimerReset :size="14" /></span>
          <span class="watch-num"><OnbAnimatedNumber :value="stats?.overtime_count || 0" /></span>
          <span class="watch-label">On overtime</span>
          <span class="watch-arrow"><ArrowUpRight :size="11" /></span>
        </button>
        <span class="watch-divider" />
        <button class="watch-item" @click="$emit('go','corrections')">
          <span class="watch-orb"><Pencil :size="14" /></span>
          <span class="watch-num"><OnbAnimatedNumber :value="stats?.pending_corrections || 0" /></span>
          <span class="watch-label">Pending corrections</span>
          <span class="watch-arrow"><ArrowUpRight :size="11" /></span>
        </button>
        <span class="watch-divider" />
        <button class="watch-item" @click="$emit('go','wfh')">
          <span class="watch-orb"><Home :size="14" /></span>
          <span class="watch-num"><OnbAnimatedNumber :value="stats?.pending_wfh || 0" /></span>
          <span class="watch-label">Pending WFH</span>
          <span class="watch-arrow"><ArrowUpRight :size="11" /></span>
        </button>
      </div>
    </Motion>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Users, Clock, Clock4, AlertTriangle, Home, TimerReset, Pencil, CheckCircle2, ArrowUpRight,
} from 'lucide-vue-next'
import OnbAnimatedNumber from '../../onboarding/components/OnbAnimatedNumber.vue'

const props = defineProps({
  stats: { type: Object, default: null },
  liveShift: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['refresh', 'go'])

const onTimePct = computed(() => Math.max(0, Math.min(100, Math.round(props.stats?.on_time_pct || 0))))

const kpiTiles = computed(() => {
  const s = props.stats || {}
  // "Late arrivals" tracks confirmed LATE attendance rows. When an employee
  // submits a late-punch request, the punch hasn't landed yet — it sits in
  // the corrections table. Surface that as a sub-line so admins notice
  // pending approvals on the same card instead of having to navigate away.
  const pendingLate = Number(s.pending_late_count || 0)
  const lateSub = pendingLate > 0
    ? `${pendingLate} pending approval`
    : 'past grace window'
  return [
    { key: 'headcount', label: 'Total headcount',   value: s.headcount ?? 0,           sub: 'in active roster',   icon: Users,         go: 'daily',       toneClass: 'success' },
    { key: 'present',   label: 'Present today',     value: s.present_today ?? 0,        sub: 'incl. late-ins',     icon: CheckCircle2,  go: 'daily',       toneClass: 'success' },
    { key: 'late',      label: 'Late arrivals',     value: s.late_count ?? 0,           sub: lateSub,              icon: Clock4,        go: pendingLate > 0 ? 'corrections' : 'daily', toneClass: 'gold' },
    { key: 'absent',    label: 'Absent',            value: s.absent_today ?? 0,         sub: 'no-shows today',     icon: AlertTriangle, go: 'daily',       toneClass: 'orange' },
    { key: 'wfh',       label: 'Working remote',    value: s.on_wfh ?? 0,               sub: 'approved WFH',       icon: Home,          go: 'wfh',         toneClass: 'success' },
    { key: 'ot',        label: 'On overtime',       value: s.overtime_count ?? 0,       sub: 'exceeded shift',     icon: TimerReset,    go: 'overtime',    toneClass: 'amber' },
  ]
})

const denom = computed(() => Math.max(1, props.stats?.headcount || 1))
const pct = (k) => Math.round(((props.stats?.[k] || 0) / denom.value) * 100)

const shiftWindow = computed(() => {
  const ls = props.liveShift
  if (!ls || !ls.shiftStart || !ls.shiftEnd) return 'No shift assigned today'
  const f = (d) => {
    const x = d instanceof Date ? d : new Date(d)
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(x.getHours())}:${pad(x.getMinutes())}`
  }
  return `${f(ls.shiftStart)} – ${f(ls.shiftEnd)}`
})

const shiftProgress = computed(() => {
  const ls = props.liveShift
  if (!ls || !ls.shiftStart || !ls.shiftEnd) return 0
  const start = new Date(ls.shiftStart).getTime()
  const end = new Date(ls.shiftEnd).getTime()
  const now = Date.now()
  if (now <= start) return 0
  if (now >= end) return 100
  return Math.round(((now - start) / (end - start)) * 100)
})

const remainingLabel = computed(() => {
  const ls = props.liveShift
  if (!ls?.shiftEnd) return ''
  const remaining = new Date(ls.shiftEnd).getTime() - Date.now()
  if (remaining <= 0) return 'shift ended'
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2,'0')}m left`
})
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-dash { display: flex; flex-direction: column; gap: 18px; padding-top: 4px; }

/* ════════════ COMMAND ROW ════════════ */
.command-row {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}
@media (max-width: 1100px) { .command-row { grid-template-columns: 1fr; } }

.dash-card {
  position: relative; overflow: hidden;
  padding: 22px 24px;
  border-radius: 22px;
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(251, 191, 36, 0.08), transparent 60%),
    linear-gradient(160deg, rgba(28, 22, 18, 0.55), rgba(20, 16, 14, 0.72));
  border: 1px solid rgba(251, 191, 36, 0.22);
  backdrop-filter: var(--att-glass-blur);
  -webkit-backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 26px 60px -28px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column; gap: 16px;
}

/* On-Time Orbital card */
.on-time-orb {
  display: flex; flex-direction: column; align-items: center;
  gap: 18px; padding: 24px;
}
.orb-glow {
  position: absolute; top: 0; right: 0; width: 200px; height: 200px;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.28), transparent 70%);
  filter: blur(40px); pointer-events: none;
  animation: att-warm-aurora 14s ease-in-out infinite;
}
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; width: 100%; }
.card-head.minimal { justify-content: center; text-align: center; }
.card-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase; color: var(--att-teal-100);
}
.card-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-orange-200);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.card-title { margin: 4px 0 0; font-size: 16px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }

.orbital {
  position: relative;
  width: 220px; height: 220px;
}
.orb-svg { width: 100%; height: 100%; filter: drop-shadow(0 12px 30px rgba(251, 146, 60, 0.30)); }
.orb-dotted { animation: att-hand-sweep 50s linear infinite; transform-origin: 110px 110px; }
.orb-arc { transition: stroke-dashoffset 0.9s var(--att-ease-quint); }
.orb-ticks { opacity: 0.6; }
.orb-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; pointer-events: none;
}
.orb-num {
  display: inline-flex; align-items: baseline; gap: 1px;
  font-size: 50px; font-weight: 800; letter-spacing: -0.03em;
  background: var(--att-gradient-hero);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: att-title-shimmer 8s ease-in-out infinite;
  line-height: 1; font-variant-numeric: tabular-nums;
}
.orb-pct { font-size: 22px; -webkit-text-fill-color: var(--att-teal-100); color: var(--att-teal-100); }
.orb-label {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase; color: var(--hr-text-muted);
  margin-top: 4px;
}
.orb-meta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
  color: var(--att-success-100); text-transform: uppercase;
}
.orb-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-success-100);
  box-shadow: 0 0 6px var(--att-success-100);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.orb-refresh { align-self: stretch; justify-content: center; }

.spinning { animation: att-hand-sweep 1s linear infinite; }

/* Floor stream — mission-control style: dual aurora, animated grid, scan beam,
   pulse-pill row, segmented bar with sheen, shift progress. */
.floor-stream {
  display: flex; flex-direction: column; gap: 16px;
  overflow: hidden;
  isolation: isolate;
}
.fs-aurora {
  position: absolute; pointer-events: none; z-index: 0;
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.85;
}
.fs-aurora.a1 {
  top: -60px; right: -40px; width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.42), transparent 70%);
  animation: att-warm-aurora 14s ease-in-out infinite;
}
.fs-aurora.a2 {
  bottom: -80px; left: -50px; width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.28), transparent 70%);
  animation: att-warm-aurora 18s ease-in-out infinite reverse;
}
.fs-grid {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
  -webkit-mask: radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 95%);
          mask: radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 95%);
  opacity: 0.55;
}
.fs-scan {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(251, 191, 36, 0.10) 30%,
    rgba(251, 146, 60, 0.18) 50%,
    rgba(251, 191, 36, 0.10) 70%,
    transparent 100%);
  background-size: 100% 240%;
  animation: att-dock-scan 11s linear infinite;
  mix-blend-mode: screen;
}
.fs-head { position: relative; z-index: 2; }
.floor-stream > .seg-bar-wrap,
.floor-stream > .shift-mini,
.floor-stream > .fs-pulse-row { position: relative; z-index: 2; }

/* Pulse pills row — 4 mini-radars side-by-side */
.fs-pulse-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.fs-pulse-pill {
  position: relative; overflow: hidden;
  display: grid;
  grid-template-columns: 18px 1fr auto;
  grid-template-rows: auto auto;
  grid-template-areas:
    "dot label num"
    "dot label num";
  align-items: center;
  gap: 2px 8px;
  padding: 9px 12px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(28, 22, 18, 0.65), rgba(20, 16, 14, 0.85));
  border: 1px solid rgba(251, 191, 36, 0.18);
  font: inherit;
  --pulse-color: var(--att-success-100);
  transition: border-color .25s var(--att-spring), transform .22s var(--att-spring);
}
.fs-pulse-pill:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--pulse-color) 55%, transparent); }
.fs-pulse-pill.present { --pulse-color: #34d399; }
.fs-pulse-pill.late    { --pulse-color: #fbbf24; }
.fs-pulse-pill.wfh     { --pulse-color: #fcd34d; }
.fs-pulse-pill.absent  { --pulse-color: #fb923c; }

.fs-pulse-pill .fs-pulse-dot {
  grid-area: dot;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--pulse-color);
  box-shadow: 0 0 8px var(--pulse-color);
  justify-self: center;
  z-index: 1;
}
.fs-pulse-pill .fs-pulse-ring {
  grid-area: dot;
  width: 9px; height: 9px; border-radius: 50%;
  border: 1.5px solid var(--pulse-color);
  justify-self: center;
  transform: scale(1);
  animation: att-pulse-emanate 2.4s ease-out infinite;
  opacity: 0;
}
.fs-pulse-pill.late .fs-pulse-ring { animation-delay: 0.6s; }
.fs-pulse-pill.wfh .fs-pulse-ring { animation-delay: 1.2s; }
.fs-pulse-pill.absent .fs-pulse-ring { animation-delay: 1.8s; }

.fs-pulse-pill .fs-pulse-label {
  grid-area: label;
  font-size: 9px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  line-height: 1.1;
}
.fs-pulse-pill .fs-pulse-num {
  grid-area: num;
  font-size: 18px; font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

@media (max-width: 720px) {
  .fs-pulse-row { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .fs-aurora, .fs-scan, .fs-pulse-ring { animation: none !important; }
}
.floor-headcount {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 999px;
  background: var(--att-success-soft);
  border: 1px solid var(--att-success-border-soft);
  color: var(--att-success-100);
  font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
}
.floor-headcount svg { color: var(--att-success-100); }

/* segmented bar with sheen on the largest segment */
.seg-bar-wrap { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
.seg-bar {
  position: relative;
  height: 18px; border-radius: 999px; overflow: hidden;
  background: rgba(251, 191, 36, 0.06);
  display: flex;
  box-shadow:
    inset 0 1px 3px rgba(0,0,0,0.35),
    inset 0 -1px 0 rgba(255,255,255,0.06);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
/* Subtle tick marks behind the bar (12 vertical hour gridlines) */
.seg-bar::before {
  content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(90deg, rgba(251, 191, 36, 0.12) 1px, transparent 1px);
  background-size: 8.333% 100%;
  pointer-events: none;
  z-index: 0;
}
.seg-bar-fill { position: relative; height: 100%; transition: width 0.9s var(--att-ease-quint); overflow: hidden; }
.seg-bar-fill.present { background: linear-gradient(90deg, #10b981, #34d399); }
.seg-bar-fill.late    { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.seg-bar-fill.wfh     { background: linear-gradient(90deg, #fde68a, #fcd34d); }
.seg-bar-fill.absent  { background: linear-gradient(90deg, #ea580c, #c2410c); }
.seg-glow {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: att-ticket-sheen 3.4s ease-in-out infinite;
}
.seg-legend {
  display: flex; gap: 10px; flex-wrap: wrap;
  font-size: 11px;
}
.seg-leg {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 11px 6px 9px; border-radius: 999px;
  background: rgba(20, 16, 14, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.18);
  color: var(--hr-text-secondary); cursor: pointer;
  transition: border-color .25s var(--att-spring), background .25s, transform .22s;
}
.seg-leg:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 146, 60, 0.55);
  background: rgba(28, 22, 18, 0.85);
}
.seg-dot { width: 8px; height: 8px; border-radius: 50%; }
.seg-leg.present .seg-dot { background: #10b981; }
.seg-leg.late .seg-dot { background: #f59e0b; }
.seg-leg.wfh .seg-dot { background: #fcd34d; }
.seg-leg.absent .seg-dot { background: #ea580c; }
.seg-leg-label { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
.seg-leg b { color: var(--hr-text); font-weight: 800; font-variant-numeric: tabular-nums; font-family: var(--hr-mono); }

/* mini shift progress */
.shift-mini {
  display: flex; flex-direction: column; gap: 6px;
  padding-top: 14px; border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
.sm-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: var(--hr-text-muted);
}
.sm-eyebrow { display: inline-flex; align-items: center; gap: 4px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--att-teal-100); }
.sm-times { color: var(--hr-text); font-weight: 700; font-size: 13px; letter-spacing: 0.4px; }
.sm-track {
  position: relative;
  height: 6px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  overflow: visible;
}
.sm-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: linear-gradient(90deg, #fde68a, #f59e0b 50%, #fb923c);
  border-radius: 999px;
  transition: width 0.9s var(--att-ease-quint);
}
.sm-marker {
  position: absolute; top: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.9s var(--att-ease-quint);
}
.sm-marker-pin {
  display: block;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--att-orange-200);
  border: 2px solid #1f1408;
  box-shadow: 0 0 10px rgba(251, 146, 60, 0.7), 0 0 0 4px rgba(251, 191, 36, 0.18);
  animation: att-live-pulse 2.4s ease-in-out infinite;
}
.sm-meta {
  display: flex; justify-content: space-between;
  font-size: 10px; letter-spacing: 0.5px; color: var(--hr-text-muted);
  text-transform: uppercase;
}

/* ════════════ METRIC TICKETS ════════════ */
.ticket-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.metric-ticket {
  position: relative;
  overflow: hidden;
  padding: 14px 16px 16px;
  background:
    radial-gradient(80% 80% at 100% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(160deg, rgba(28, 22, 18, 0.62), rgba(20, 16, 14, 0.85));
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font: inherit; color: var(--hr-text);
  transition: border-color .25s var(--att-spring), transform .22s var(--att-spring), box-shadow .25s;
  display: flex; flex-direction: column; gap: 6px;
}
.metric-ticket:hover {
  border-color: var(--att-orange-200);
  box-shadow: 0 18px 36px -16px rgba(251, 146, 60, 0.45);
}
.mt-perf-l, .mt-perf-r {
  position: absolute; top: 8px; bottom: 8px; width: 3px;
  background:
    radial-gradient(circle at 50% 3px, rgba(251, 191, 36, 0.6) 1px, transparent 1.4px),
    radial-gradient(circle at 50% 9px, rgba(251, 191, 36, 0.6) 1px, transparent 1.4px),
    radial-gradient(circle at 50% 15px, rgba(251, 191, 36, 0.6) 1px, transparent 1.4px);
  background-repeat: repeat-y; background-size: 3px 8px;
  opacity: 0.55;
  pointer-events: none;
}
.mt-perf-l { left: 3px; }
.mt-perf-r { right: 3px; }
.mt-glow {
  position: absolute; top: -50%; right: -10%;
  width: 150%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.18), transparent 70%);
  filter: blur(40px); pointer-events: none; z-index: -1;
}
.metric-ticket[data-tone="success"] .mt-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.22), transparent 70%); }
.metric-ticket[data-tone="amber"]   .mt-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(245, 158, 11, 0.22), transparent 70%); }
.metric-ticket[data-tone="orange"]  .mt-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(234, 88, 12, 0.22), transparent 70%); }
.metric-ticket[data-tone="gold"]    .mt-glow { background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.22), transparent 70%); }

.mt-head {
  display: flex; align-items: center; gap: 8px;
  /* Reserve room for the absolutely-positioned mt-arrow chip so labels
     never slide under it. */
  padding-right: 30px;
  min-height: 24px;
}
.mt-head .mt-label { min-width: 0; flex: 1; }
.mt-icon {
  width: 24px; height: 24px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.16); color: var(--att-teal-100);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
.metric-ticket[data-tone="success"] .mt-icon { background: var(--att-success-soft); color: var(--att-success-100); border-color: var(--att-success-border-soft); }
.metric-ticket[data-tone="orange"]  .mt-icon { background: rgba(234, 88, 12, 0.18); color: var(--att-orange-200); border-color: rgba(234, 88, 12, 0.36); }
.metric-ticket[data-tone="amber"]   .mt-icon { background: rgba(245, 158, 11, 0.20); color: #fbbf24; border-color: rgba(245, 158, 11, 0.40); }
.metric-ticket[data-tone="gold"]    .mt-icon { background: rgba(251, 191, 36, 0.20); color: #fde68a; border-color: rgba(251, 191, 36, 0.42); }
.mt-label {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.mt-value {
  font-family: var(--hr-mono);
  font-size: 32px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text); font-variant-numeric: tabular-nums; line-height: 1;
  margin: 2px 0 0;
}
.mt-sub { font-size: 11px; color: var(--hr-text-muted); }
.mt-arrow {
  position: absolute; top: 12px; right: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-muted);
  transition: transform .22s var(--att-spring), background .22s;
}
.metric-ticket:hover .mt-arrow {
  transform: translate(2px, -2px);
  background: rgba(251, 191, 36, 0.20); color: var(--att-orange-200);
}

/* ════════════ WATCHPOINTS ════════════ */
.watch-card { padding: 18px 24px 20px; }
.watchpoints {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 8px; align-items: center;
  padding-top: 10px;
}
.watch-item {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  font: inherit; color: inherit;
  transition: border-color .22s, background .22s;
}
.watch-item:hover {
  border-color: rgba(251, 191, 36, 0.28);
  background: rgba(251, 191, 36, 0.04);
}
.watch-orb {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.14); color: var(--att-teal-100);
  border: 1px solid rgba(251, 191, 36, 0.34);
  margin-bottom: 4px;
}
.watch-num {
  font-family: var(--hr-mono);
  font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text); font-variant-numeric: tabular-nums; line-height: 1;
}
.watch-label { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--hr-text-muted); text-align: center; }
.watch-arrow {
  position: absolute; top: 8px; right: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-muted);
  opacity: 0; transition: opacity .25s, background .25s;
}
.watch-item:hover .watch-arrow { opacity: 1; background: rgba(251, 191, 36, 0.20); color: var(--att-orange-200); }
.watch-divider {
  width: 1px; height: 36px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.30), transparent);
}

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .dash-card {
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(217, 119, 6, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.28);
  box-shadow:
    0 26px 60px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .orb-glow {
  background: radial-gradient(closest-side, rgba(217, 119, 6, 0.30), transparent 70%);
}
[data-theme="light"] .card-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .card-eyebrow-dot { background: var(--att-orange-500); }
[data-theme="light"] .orb-svg circle:first-of-type,
[data-theme="light"] .orb-svg circle:nth-of-type(2) { stroke: rgba(180, 83, 9, 0.24); }
[data-theme="light"] .orb-ticks line { stroke: rgba(180, 83, 9, 0.40) !important; }
[data-theme="light"] .orb-ticks line:nth-child(3n) { stroke: rgba(194, 65, 12, 0.70) !important; }
[data-theme="light"] .orb-num {
  background: linear-gradient(110deg, #92400e, #d97706 35%, #ea580c 100%);
  -webkit-background-clip: text; background-clip: text;
}
[data-theme="light"] .orb-pct { color: var(--att-teal-500); -webkit-text-fill-color: var(--att-teal-500); }
[data-theme="light"] .orb-label { color: var(--hr-text-muted); }
[data-theme="light"] .orb-meta { color: var(--att-success-500); }
[data-theme="light"] .orb-meta-dot { background: var(--att-success-300); box-shadow: 0 0 6px var(--att-success-300); }

[data-theme="light"] .fs-aurora.a1 { background: radial-gradient(circle, rgba(217, 119, 6, 0.55), transparent 70%); opacity: 0.85; }
[data-theme="light"] .fs-aurora.a2 { background: radial-gradient(circle, rgba(13, 148, 136, 0.30), transparent 70%); }
[data-theme="light"] .fs-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.08) 1px, transparent 1px);
}
[data-theme="light"] .fs-scan {
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(217, 119, 6, 0.10) 30%,
    rgba(194, 65, 12, 0.18) 50%,
    rgba(217, 119, 6, 0.10) 70%,
    transparent 100%);
  mix-blend-mode: multiply;
  opacity: 0.55;
}
[data-theme="light"] .fs-pulse-pill {
  background: linear-gradient(160deg, rgba(255, 250, 240, 0.85), rgba(255, 246, 226, 0.92));
  border-color: rgba(180, 83, 9, 0.22);
}
[data-theme="light"] .fs-pulse-pill .fs-pulse-label { color: var(--hr-text-muted); }
[data-theme="light"] .fs-pulse-pill .fs-pulse-num { color: var(--hr-text); }
[data-theme="light"] .fs-pulse-pill.present { --pulse-color: #0d9488; }
[data-theme="light"] .fs-pulse-pill.late    { --pulse-color: #ca8a04; }
[data-theme="light"] .fs-pulse-pill.wfh     { --pulse-color: #b45309; }
[data-theme="light"] .fs-pulse-pill.absent  { --pulse-color: #c2410c; }

[data-theme="light"] .floor-headcount {
  background: var(--att-success-soft);
  border-color: var(--att-success-border-soft);
  color: var(--att-success-500);
}
[data-theme="light"] .seg-bar {
  background: rgba(180, 83, 9, 0.08);
  border-color: rgba(180, 83, 9, 0.22);
  box-shadow: inset 0 1px 2px rgba(120, 53, 15, 0.10);
}
[data-theme="light"] .seg-leg {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.18);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .seg-leg:hover { background: rgba(255, 250, 240, 0.92); border-color: rgba(180, 83, 9, 0.34); }
[data-theme="light"] .seg-leg b { color: var(--hr-text); }
[data-theme="light"] .shift-mini { border-top-color: rgba(180, 83, 9, 0.28); }
[data-theme="light"] .sm-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .sm-track { background: rgba(180, 83, 9, 0.10); }
[data-theme="light"] .sm-fill { background: linear-gradient(90deg, #fbbf24, #ea580c 70%); }
[data-theme="light"] .sm-marker-pin { background: var(--att-orange-500); border-color: #fff; box-shadow: 0 0 10px rgba(194, 65, 12, 0.7), 0 0 0 4px rgba(180, 83, 9, 0.18); }
[data-theme="light"] .sm-meta { color: var(--hr-text-muted); }

[data-theme="light"] .metric-ticket {
  background:
    radial-gradient(80% 80% at 100% 0%, rgba(217, 119, 6, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.28);
  color: var(--hr-text);
}
[data-theme="light"] .metric-ticket:hover { border-color: rgba(194, 65, 12, 0.5); box-shadow: 0 18px 36px -16px rgba(180, 83, 9, 0.40); }
[data-theme="light"] .mt-perf-l,
[data-theme="light"] .mt-perf-r {
  background:
    radial-gradient(circle at 50% 3px, rgba(180, 83, 9, 0.5) 1px, transparent 1.4px),
    radial-gradient(circle at 50% 9px, rgba(180, 83, 9, 0.5) 1px, transparent 1.4px),
    radial-gradient(circle at 50% 15px, rgba(180, 83, 9, 0.5) 1px, transparent 1.4px);
  background-repeat: repeat-y; background-size: 3px 8px;
}
[data-theme="light"] .mt-icon { background: rgba(180, 83, 9, 0.10); color: var(--att-teal-500); border-color: rgba(180, 83, 9, 0.28); }
[data-theme="light"] .metric-ticket[data-tone="success"] .mt-icon { background: rgba(13, 148, 136, 0.14); color: var(--att-success-500); border-color: rgba(13, 148, 136, 0.34); }
[data-theme="light"] .metric-ticket[data-tone="orange"]  .mt-icon { background: rgba(194, 65, 12, 0.16); color: var(--att-orange-500); border-color: rgba(194, 65, 12, 0.34); }
[data-theme="light"] .metric-ticket[data-tone="amber"]   .mt-icon { background: rgba(245, 158, 11, 0.20); color: #b45309; border-color: rgba(245, 158, 11, 0.40); }
[data-theme="light"] .metric-ticket[data-tone="gold"]    .mt-icon { background: rgba(217, 119, 6, 0.18); color: #92400e; border-color: rgba(217, 119, 6, 0.42); }
[data-theme="light"] .mt-label { color: var(--hr-text-muted); }
[data-theme="light"] .mt-value { color: var(--hr-text); }
[data-theme="light"] .mt-sub { color: var(--hr-text-muted); }
[data-theme="light"] .mt-arrow { background: rgba(180, 83, 9, 0.06); color: var(--hr-text-muted); }
[data-theme="light"] .metric-ticket:hover .mt-arrow { background: rgba(217, 119, 6, 0.20); color: var(--att-orange-500); }

[data-theme="light"] .watch-orb { background: rgba(217, 119, 6, 0.12); color: var(--att-teal-500); border-color: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .watch-num { color: var(--hr-text); }
[data-theme="light"] .watch-label { color: var(--hr-text-muted); }
[data-theme="light"] .watch-item:hover { border-color: rgba(180, 83, 9, 0.28); background: rgba(217, 119, 6, 0.06); }
[data-theme="light"] .watch-divider { background: linear-gradient(180deg, transparent, rgba(180, 83, 9, 0.30), transparent); }
</style>
