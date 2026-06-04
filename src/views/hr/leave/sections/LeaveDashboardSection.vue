<template>
  <div class="md">
    <!-- ═══════════════════════════════════════════════════════════
         01 · Command tiles — asymmetric oversized stat cards
    ═══════════════════════════════════════════════════════════ -->
    <section class="md-section">
      <header class="md-sec-head">
        <span class="ms-num leave-mono">01</span>
        <span class="ms-rule" />
        <h3 class="ms-title">Command tiles</h3>
        <span class="ms-meta leave-mono">{{ tiles.length }} signals · live</span>
      </header>

      <div class="md-tiles">
        <Motion v-for="(t, i) in tiles" :key="t.key" as="article"
          class="tile" :data-tone="t.tone" :data-size="t.size || 'std'"
          :initial="{ opacity: 0, y: 22, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -4, scale: 1.015 }"
          @click="t.go && $emit('go', t.go)"
        >
          <!-- Background motifs -->
          <span class="t-grain" aria-hidden="true" />
          <span class="t-aura" aria-hidden="true" />
          <span class="t-sweep" aria-hidden="true" />

          <!-- Arc ring (animated) — only on size=hero/lg tiles -->
          <svg v-if="t.size === 'hero' || t.size === 'lg'" class="t-arc" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient :id="`tg${i}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="#fde047" />
                <stop offset="55%"  stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="48" fill="none" class="ta-bg" />
            <circle cx="60" cy="60" r="48" fill="none" class="ta-fill"
              :stroke="`url(#tg${i})`"
              :stroke-dasharray="arcCirc(48)"
              :stroke-dashoffset="arcOffset(48, t.pct ?? 0)"
            />
          </svg>

          <header class="t-head">
            <span class="t-icon"><component :is="t.icon" :size="14" /></span>
            <div class="t-meta">
              <span class="t-eye leave-mono">{{ t.eye }}</span>
              <span class="t-label">{{ t.label }}</span>
            </div>
            <ArrowUpRight v-if="t.go" :size="13" class="t-go" />
          </header>

          <div class="t-body">
            <span class="t-num">{{ formatVal(t.value) }}</span>
            <span class="t-suf leave-mono">{{ t.suf || '' }}</span>
          </div>

          <footer class="t-foot">
            <span v-if="t.delta != null" class="t-delta" :data-pos="t.delta >= 0">
              <span class="td-arrow">{{ t.delta >= 0 ? '▲' : '▼' }}</span>
              {{ Math.abs(t.delta) }}{{ t.deltaSuf || '%' }}
            </span>
            <span v-if="t.foot" class="t-foot-meta leave-mono">{{ t.foot }}</span>
          </footer>
        </Motion>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         02 · Mission control — radial breakdown + pipeline flow
    ═══════════════════════════════════════════════════════════ -->
    <section class="md-section">
      <header class="md-sec-head">
        <span class="ms-num leave-mono">02</span>
        <span class="ms-rule" />
        <h3 class="ms-title">Mission control</h3>
        <span class="ms-meta leave-mono">YTD distribution · live pipeline</span>
      </header>

      <div class="md-row">
        <!-- LEFT: multi-ring radial gauge -->
        <Motion class="card multi-ring" as="article"
          :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
        >
          <header class="card-head">
            <div>
              <span class="card-eye leave-mono">YTD by leave type</span>
              <h4 class="card-title">Distribution map</h4>
            </div>
            <div class="card-actions">
              <span class="card-pill leave-mono">{{ totalDays || 0 }}d total</span>
            </div>
          </header>

          <div class="mr-stage">
            <!-- Decorative ticks ring -->
            <svg class="mr-ticks" viewBox="0 0 260 260" aria-hidden="true">
              <g class="mr-rot">
                <circle cx="130" cy="130" r="120" fill="none" class="mr-rim" />
                <g v-for="n in 48" :key="n">
                  <line :x1="130" :y1="10" :x2="130" :y2="(n % 4 === 0 ? 22 : 16)"
                    class="mr-tick" :class="{ 'mr-tick-major': n % 4 === 0 }"
                    :transform="`rotate(${(n / 48) * 360} 130 130)`" />
                </g>
              </g>
            </svg>

            <!-- Three concentric type-rings -->
            <svg class="mr-rings" viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r="98" fill="none" class="mr-track" stroke-width="12" />
              <circle cx="130" cy="130" r="80" fill="none" class="mr-track" stroke-width="10" />
              <circle cx="130" cy="130" r="64" fill="none" class="mr-track" stroke-width="8" />

              <!-- Top 3 by-type segments drawn on concentric rings -->
              <g v-for="(seg, idx) in topThreeSegments" :key="seg.key">
                <circle cx="130" cy="130" :r="ringR(idx)" fill="none"
                  class="mr-seg" :stroke="seg.color" :stroke-width="ringW(idx)"
                  :stroke-dasharray="`${seg.dashLen(ringR(idx))} ${ringCirc(ringR(idx))}`"
                  stroke-linecap="round"
                  :transform="`rotate(-90 130 130)`"
                />
              </g>
            </svg>

            <!-- Center readout -->
            <div class="mr-center">
              <div class="mr-num">{{ totalRequests || 0 }}</div>
              <div class="mr-sub leave-mono">REQUESTS · FY</div>
            </div>
          </div>

          <!-- Legend — magazine-style type chips with sparkbars and percent rings -->
          <div class="mr-legend">
            <Motion v-for="(seg, i) in allSegments" :key="seg.key" as="div"
              class="lg-row" :style="{ '--c': seg.color }"
              :initial="{ opacity: 0, x: -10 }"
              :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.4, delay: 0.4 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="{ x: 3 }"
            >
              <span class="lg-rank leave-mono">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="lg-glyph">
                <span class="lg-glyph-ring" />
                <span class="lg-glyph-dot" />
              </span>
              <div class="lg-body">
                <div class="lg-row-top">
                  <span class="lg-name">{{ seg.label }}</span>
                  <span class="lg-pct leave-mono">{{ seg.pct }}%</span>
                </div>
                <div class="lg-bar">
                  <Motion class="lg-fill"
                    :initial="{ scaleX: 0 }"
                    :animate="{ scaleX: seg.pct / 100 }"
                    :transition="{ duration: 0.9, delay: 0.5 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
                  />
                  <span class="lg-bar-sheen" />
                </div>
              </div>
              <span class="lg-val leave-mono">
                <span class="lg-val-num">{{ seg.days }}</span>
                <span class="lg-val-suf">d</span>
              </span>
            </Motion>
            <div v-if="!allSegments.length" class="lg-empty leave-mono">No data this fiscal year</div>
          </div>
        </Motion>

        <!-- RIGHT: vertical pipeline flow -->
        <Motion class="card flow-card" as="article"
          :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.26, ease: [0.16, 1, 0.3, 1] }"
        >
          <header class="card-head">
            <div>
              <span class="card-eye leave-mono">Live pipeline</span>
              <h4 class="card-title">Flow status</h4>
            </div>
            <div class="card-actions">
              <span class="card-dot" /><span class="card-mini leave-mono">REAL-TIME</span>
            </div>
          </header>

          <div class="flow">
            <Motion v-for="(node, i) in flowNodes" :key="node.key" as="div"
              class="flow-node" :data-tone="node.tone"
              :initial="{ opacity: 0, x: -18 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.5, delay: 0.34 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
            >
              <span class="fn-rail" />
              <span class="fn-bead">
                <span class="fn-pulse" />
                <component :is="node.icon" :size="13" />
              </span>
              <div class="fn-body">
                <div class="fn-row">
                  <span class="fn-label">{{ node.label }}</span>
                  <span class="fn-num leave-mono">{{ node.count }}</span>
                </div>
                <div class="fn-bar">
                  <Motion class="fn-fill"
                    :initial="{ scaleX: 0 }"
                    :animate="{ scaleX: node.pct / 100 }"
                    :transition="{ duration: 0.9, delay: 0.5 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
                  />
                </div>
                <div class="fn-meta leave-mono">{{ node.foot }}</div>
              </div>
            </Motion>
          </div>
        </Motion>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         03 · Operations · needs attention
    ═══════════════════════════════════════════════════════════ -->
    <section class="md-section">
      <header class="md-sec-head">
        <span class="ms-num leave-mono">03</span>
        <span class="ms-rule" />
        <h3 class="ms-title">Needs attention</h3>
        <button class="ms-action leave-btn leave-btn-sm" @click="$emit('go', 'hr-queue')">
          <Inbox :size="13" /> Open HR queue
        </button>
      </header>

      <div class="attn">
        <Motion v-for="(cell, i) in attnCells" :key="cell.key" as="button"
          class="attn-cell" :data-tone="cell.tone"
          :initial="{ opacity: 0, y: 14, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.06 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3, scale: 1.025 }"
          @click="$emit('go', cell.go)"
        >
          <span class="ac-aura" />
          <span class="ac-icon"><component :is="cell.icon" :size="18" /></span>
          <div class="ac-num">{{ cell.value }}</div>
          <div class="ac-lbl">{{ cell.label }}</div>
          <div class="ac-sub leave-mono">{{ cell.sub }}</div>
          <ArrowUpRight :size="14" class="ac-arrow" />
        </Motion>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Inbox, UserCheck, CalendarRange, ListChecks, Sparkles, CheckCircle2, XCircle, Hourglass,
  ArrowUpRight, Flame, Zap, Activity, AlarmClock,
} from 'lucide-vue-next'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})
defineEmits(['go', 'refresh'])

const formatVal = (v) => {
  if (v == null) return '—'
  if (typeof v === 'number' && v >= 10000) return `${Math.round(v / 100) / 10}k`
  return v
}

// ─── Command tiles (asymmetric) ──────────────────────────────────────
const tiles = computed(() => {
  const s = props.stats || {}
  const pending = (s.pending_hr || 0) + (s.pending_manager || 0)
  const approvedMo = s.approved_this_month || 0
  const rejectedMo = s.rejected_this_month || 0
  const totalDecidedMo = approvedMo + rejectedMo
  const throughput = totalDecidedMo > 0 ? Math.round((approvedMo / totalDecidedMo) * 100) : 100

  return [
    {
      key: 'pending', size: 'hero', tone: 'warn',
      eye: 'Awaiting decision', label: 'Open requests',
      icon: Hourglass,
      value: pending, suf: '',
      delta: pending > 0 ? null : null,
      foot: `${s.pending_manager || 0} mgr · ${s.pending_hr || 0} HR`,
      pct: Math.min(100, pending * 5),
      go: 'hr-queue',
    },
    {
      key: 'throughput', size: 'lg', tone: 'success',
      eye: 'This month', label: 'Approval throughput',
      icon: Zap,
      value: throughput, suf: '%',
      delta: throughput - 75, deltaSuf: '%',
      foot: `${approvedMo} approved · ${rejectedMo} rejected`,
      pct: throughput,
      go: 'applications',
    },
    {
      key: 'today', size: 'std', tone: 'info',
      eye: 'Today', label: 'On leave',
      icon: Sparkles,
      value: s.on_leave_today || 0,
      foot: 'team availability',
      go: 'calendar',
    },
    {
      key: 'upcoming', size: 'std', tone: 'neutral',
      eye: 'Next 30 days', label: 'Upcoming',
      icon: CalendarRange,
      value: s.upcoming_30d || 0,
      foot: 'starts soon',
      go: 'calendar',
    },
    {
      key: 'approved-today', size: 'std', tone: 'success',
      eye: 'Today', label: 'Cleared',
      icon: CheckCircle2,
      value: s.approved_today || 0,
      foot: 'green-lit',
      go: 'applications',
    },
    {
      key: 'rejected-mo', size: 'std', tone: 'danger',
      eye: 'This month', label: 'Rejected',
      icon: XCircle,
      value: rejectedMo,
      foot: 'declined',
      go: 'applications',
    },
  ]
})

// ─── Arc geometry ────────────────────────────────────────────────────
const arcCirc = (r) => 2 * Math.PI * r
const arcOffset = (r, pct) => arcCirc(r) - (Math.min(100, Math.max(0, pct)) / 100) * arcCirc(r)

// ─── Multi-ring radial breakdown ─────────────────────────────────────
const RING_R = [98, 80, 64]
const RING_W = [12, 10, 8]
const ringR = (i) => RING_R[i % 3]
const ringW = (i) => RING_W[i % 3]
const ringCirc = (r) => 2 * Math.PI * r

const totalDays = computed(() =>
  (props.stats?.by_type_ytd || []).reduce((a, b) => a + Number(b.days || 0), 0)
)
const totalRequests = computed(() =>
  (props.stats?.by_type_ytd || []).reduce((a, b) => a + Number(b.count || 0), 0)
)

const allSegments = computed(() => {
  const rows = (props.stats?.by_type_ytd || []).filter(r => Number(r.days) > 0)
  const total = rows.reduce((a, b) => a + Number(b.days || 0), 0) || 1
  return rows
    .sort((a, b) => Number(b.days) - Number(a.days))
    .map(r => {
      const meta = typeMeta(r.leave_type)
      const days = Number(r.days || 0)
      const pct = (days / total) * 100
      return {
        key: r.leave_type, label: meta.label, color: meta.hex,
        days, pct: Math.round(pct),
        dashLen: (radius) => (pct / 100) * ringCirc(radius),
      }
    })
})

const topThreeSegments = computed(() => allSegments.value.slice(0, 3))

// ─── Vertical pipeline flow ──────────────────────────────────────────
const flowNodes = computed(() => {
  const s = props.stats || {}
  const total = (s.pending_manager || 0) + (s.pending_hr || 0) + (s.approved_this_month || 0) + (s.rejected_this_month || 0) || 1
  const mk = (count, foot) => ({ count, pct: Math.round((count / total) * 100), foot })
  return [
    { key: 'submitted', icon: Activity,   label: 'Submitted',       tone: 'info',    ...mk(total, 'total this month') },
    { key: 'pending-m', icon: UserCheck,  label: 'Pending · Manager', tone: 'warn',  ...mk(s.pending_manager || 0, 'mgr review') },
    { key: 'pending-h', icon: Inbox,      label: 'Pending · HR',      tone: 'warn',  ...mk(s.pending_hr || 0, 'HR review') },
    { key: 'approved',  icon: CheckCircle2, label: 'Approved',        tone: 'success', ...mk(s.approved_this_month || 0, 'green-lit') },
    { key: 'rejected',  icon: XCircle,    label: 'Rejected',          tone: 'danger', ...mk(s.rejected_this_month || 0, 'declined') },
  ]
})

// ─── Attention cells ────────────────────────────────────────────────
const attnCells = computed(() => {
  const s = props.stats || {}
  return [
    { key: 'hr',      icon: Inbox,        value: s.pending_hr || 0,        label: 'HR review',    sub: 'awaiting decision', tone: 'warn',    go: 'hr-queue' },
    { key: 'mgr',     icon: UserCheck,    value: s.pending_manager || 0,   label: 'Manager queue',sub: 'awaiting decision', tone: 'warn',    go: 'manager-queue' },
    { key: 'today',   icon: CalendarRange,value: s.on_leave_today || 0,    label: 'On leave today',sub: 'team availability',tone: 'info',    go: 'calendar' },
    { key: 'soon',    icon: Sparkles,     value: s.upcoming_30d || 0,      label: 'Upcoming · 30d',sub: 'starts soon',      tone: 'neutral', go: 'calendar' },
  ]
})
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.md { display: flex; flex-direction: column; gap: 24px; }

/* ────────────────────────────────────────────────────────────────────
   Section header
   ──────────────────────────────────────────────────────────────────── */
.md-section { display: flex; flex-direction: column; gap: 12px; }
.md-sec-head {
  display: flex; align-items: center; gap: 12px;
}
.ms-num {
  font-size: 10px; font-weight: 800;
  color: var(--leave-brand);
  padding: 3px 8px; border-radius: 5px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.32);
  letter-spacing: 0.06em;
}
.ms-rule {
  width: 24px; height: 1px;
  background: linear-gradient(90deg, var(--leave-brand), transparent);
}
.ms-title {
  margin: 0;
  font-size: 16px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.012em;
}
.ms-meta {
  margin-left: auto;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.ms-action { margin-left: auto; }

/* ════════════════════════════════════════════════════════════════════
   01 · Command tiles (asymmetric)
   ──────────────────────────────────────────────────────────────────── */
.md-tiles {
  display: grid;
  grid-template-columns: 1.5fr 1.2fr 1fr 1fr;
  grid-template-rows: minmax(150px, auto) minmax(120px, auto);
  gap: 12px;
}
@media (max-width: 1100px) {
  .md-tiles { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
}
@media (max-width: 640px) {
  .md-tiles { grid-template-columns: 1fr; }
}

.tile {
  position: relative; overflow: hidden;
  padding: 18px 20px;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.78));
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px) saturate(140%);
  display: flex; flex-direction: column; gap: 10px;
  cursor: default; isolation: isolate;
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease), transform .22s;
}
[data-theme="light"] .tile {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.16), transparent 60%),
    rgba(255, 250, 235, 0.92);
}
.tile[data-size="hero"] { grid-column: span 2; grid-row: span 2; }
.tile[data-size="lg"]   { grid-column: span 1; grid-row: span 2; }
@media (max-width: 1100px) {
  .tile[data-size="hero"], .tile[data-size="lg"] { grid-column: span 2; grid-row: span 1; }
}
@media (max-width: 640px) {
  .tile[data-size="hero"], .tile[data-size="lg"] { grid-column: span 1; }
}
.tile[data-tone] { cursor: pointer; }
.tile:hover { border-color: var(--leave-brand); box-shadow: var(--leave-shadow-lift); }
.tile[data-tone="danger"]:hover  { border-color: var(--leave-rejected); }
.tile[data-tone="success"]:hover { border-color: var(--leave-approved); }

.t-grain {
  position: absolute; inset: 0; opacity: 0.05;
  mix-blend-mode: overlay;
  background-image:
    radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px);
  background-size: 6px 6px;
  pointer-events: none;
}
.t-aura {
  position: absolute; inset: -30% -10% auto auto;
  width: 60%; height: 80%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.30), transparent 65%);
  filter: blur(38px);
  pointer-events: none;
  z-index: -1;
}
.tile[data-tone="warn"]    .t-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(250, 204, 21, 0.40), transparent 65%); }
.tile[data-tone="danger"]  .t-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(234, 88, 12, 0.34), transparent 65%); }
.tile[data-tone="info"]    .t-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(253, 224, 71, 0.30), transparent 65%); }
.tile[data-tone="success"] .t-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.36), transparent 65%); }
.t-sweep {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 0%, rgba(251, 191, 36, 0.12) 50%, transparent 100%);
  transform: translateX(-100%);
}
.tile:hover .t-sweep { animation: leave-ember-sweep 1s ease-out; }

/* Arc ring on big tiles — positioned as backdrop, NOT overlapping the number */
.t-arc {
  position: absolute;
  width: 96px; height: 96px;
  z-index: 0;
  opacity: 0.85;
  pointer-events: none;
}
/* HERO tile: arc as a large halo behind the number, right-center vertically */
.tile[data-size="hero"] .t-arc {
  width: 280px; height: 280px;
  right: 28px; top: 50%; bottom: auto;
  transform: translateY(-50%);
  opacity: 0.5;
}
/* LG tile: smaller arc nested behind the centered number (gauge style) */
.tile[data-size="lg"] .t-arc {
  width: 168px; height: 168px;
  right: 50%; top: 52%; bottom: auto;
  transform: translate(50%, -50%);
  opacity: 0.95;
}
.ta-bg { stroke: rgba(251, 191, 36, 0.10); stroke-width: 6; }
.ta-fill {
  stroke-width: 6; stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 60px 60px;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5));
  transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
/* Stronger arc stroke for the gauge-style lg tile */
.tile[data-size="lg"] .ta-bg { stroke-width: 10; }
.tile[data-size="lg"] .ta-fill {
  stroke-width: 10;
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.6));
}

.t-head { display: flex; align-items: center; gap: 10px; position: relative; z-index: 2; }
/* LG: head and foot stay flex children, body floats centered */
.tile[data-size="lg"] { position: relative; }
.tile[data-size="lg"] .t-foot { margin-top: auto; }
.t-icon {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px; border-radius: 9px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.36);
  color: var(--w-gold-200);
}
.tile[data-tone="warn"]    .t-icon { color: var(--leave-pending-mgr); background: var(--leave-pending-mgr-soft); border-color: color-mix(in srgb, var(--leave-pending-mgr) 40%, transparent); }
.tile[data-tone="success"] .t-icon { color: var(--leave-approved); background: var(--leave-approved-soft); border-color: color-mix(in srgb, var(--leave-approved) 40%, transparent); }
.tile[data-tone="danger"]  .t-icon { color: var(--leave-rejected); background: var(--leave-rejected-soft); border-color: color-mix(in srgb, var(--leave-rejected) 40%, transparent); }
.t-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.t-eye {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--w-gold-200);
}
[data-theme="light"] .t-eye { color: var(--w-gold-700); }
.t-label {
  font-size: 13px; font-weight: 700;
  color: var(--leave-text);
  letter-spacing: -0.005em;
}
.t-go {
  color: var(--leave-text-muted);
  transition: transform .22s, color .22s;
}
.tile:hover .t-go { transform: translate(2px, -2px); color: var(--leave-brand); }

.t-body {
  display: flex; align-items: baseline; gap: 4px;
  position: relative; z-index: 2;
  margin-top: auto;
}
/* Hero — center the number/suffix vertically in the open area */
.tile[data-size="hero"] .t-body {
  flex: 1;
  align-items: center;
  justify-content: flex-start;
  margin-top: 0;
  padding: 12px 0;
}
/* LG — center the percentage inside the gauge ring (anchored to the arc's
   center, NOT stretched across the whole tile so the number doesn't drift
   up to the header) */
.tile[data-size="lg"] .t-body {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  margin: 0;
  width: auto;
  align-items: baseline;
  justify-content: center;
  z-index: 3;
  pointer-events: none;
}
.t-num {
  font-size: 48px; font-weight: 800;
  letter-spacing: -0.030em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.tile[data-size="hero"] .t-num { font-size: 96px; }
.tile[data-size="lg"]   .t-num { font-size: 46px; }
.tile[data-tone="danger"] .t-num { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.tile[data-tone="success"] .t-num { background: linear-gradient(135deg, #fde047, #fbbf24); background-clip: text; -webkit-background-clip: text; color: transparent; }
.t-suf {
  font-size: 22px; font-weight: 700;
  color: var(--leave-text-muted);
  letter-spacing: -0.01em;
}
.tile[data-size="hero"] .t-suf { font-size: 32px; }
.tile[data-size="lg"]   .t-suf { font-size: 18px; }

.t-foot {
  display: flex; align-items: center; gap: 10px;
  position: relative; z-index: 2;
  font-size: 10.5px;
  flex-wrap: wrap;
}
.t-delta {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 999px;
  font-size: 10px; font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.t-delta[data-pos="true"]  { background: rgba(251, 191, 36, 0.14); color: var(--leave-approved); border: 1px solid color-mix(in srgb, var(--leave-approved) 36%, transparent); }
.t-delta[data-pos="false"] { background: var(--leave-rejected-soft); color: var(--leave-rejected); border: 1px solid color-mix(in srgb, var(--leave-rejected) 36%, transparent); }
.td-arrow { font-size: 9px; }
.t-foot-meta {
  color: var(--leave-text-muted);
  font-size: 9.5px;
  letter-spacing: 0.04em;
}

/* ════════════════════════════════════════════════════════════════════
   02 · Mission control row
   ──────────────────────────────────────────────────────────────────── */
.md-row {
  display: grid; grid-template-columns: 1.05fr 1fr; gap: 14px;
}
@media (max-width: 1080px) { .md-row { grid-template-columns: 1fr; } }

.card {
  position: relative; overflow: hidden;
  padding: 20px 22px;
  border-radius: 20px;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.65));
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px);
  display: flex; flex-direction: column; gap: 16px;
}
[data-theme="light"] .card {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 60%),
    rgba(255, 250, 235, 0.92);
}
.card-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.card-eye {
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--w-gold-200);
}
[data-theme="light"] .card-eye { color: var(--w-gold-700); }
.card-title {
  margin: 4px 0 0;
  font-size: 17px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.014em;
}
.card-actions { display: flex; align-items: center; gap: 8px; }
.card-pill {
  font-size: 9.5px; font-weight: 800;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: var(--w-gold-200);
  letter-spacing: 0.04em;
}
[data-theme="light"] .card-pill { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.18); border-color: rgba(217, 119, 6, 0.30); }
.card-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--leave-approved);
  box-shadow: 0 0 8px var(--leave-approved);
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}
.card-mini {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.20em;
  color: var(--leave-approved);
}

/* Multi-ring */
.multi-ring { min-height: 380px; }
.mr-stage {
  position: relative;
  width: 280px; height: 280px;
  align-self: center;
}
.mr-ticks { position: absolute; inset: 0; width: 100%; height: 100%; }
.mr-rot { transform-origin: 130px 130px; animation: leave-orb-spin 80s linear infinite; }
.mr-rim {
  stroke: rgba(251, 191, 36, 0.18);
  stroke-width: 1;
}
[data-theme="light"] .mr-rim { stroke: rgba(180, 83, 9, 0.24); }
.mr-tick { stroke: rgba(251, 191, 36, 0.30); stroke-width: 1; }
.mr-tick-major { stroke: rgba(251, 191, 36, 0.65); stroke-width: 1.4; }
[data-theme="light"] .mr-tick { stroke: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .mr-tick-major { stroke: rgba(180, 83, 9, 0.65); }

.mr-rings { position: absolute; inset: 0; width: 100%; height: 100%; }
.mr-track {
  stroke: rgba(251, 191, 36, 0.08);
  fill: none;
}
.mr-seg {
  fill: none;
  filter: drop-shadow(0 0 4px currentColor);
  transition: stroke-dasharray 1s var(--leave-spring);
}

.mr-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px;
}
.mr-num {
  font-size: 52px; font-weight: 800; line-height: 1;
  letter-spacing: -0.026em;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.mr-sub {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.20em;
  color: var(--leave-text-muted);
  margin-top: 4px;
}

/* ═══ Legend — refined magazine-style rows ═══ */
.mr-legend {
  margin: 12px 0 0;
  padding: 12px;
  display: flex; flex-direction: column; gap: 4px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.04), rgba(251, 191, 36, 0.01));
  border: 1px solid rgba(251, 191, 36, 0.10);
}
[data-theme="light"] .mr-legend {
  background: linear-gradient(180deg, rgba(255, 244, 210, 0.5), rgba(255, 250, 235, 0.3));
  border-color: rgba(180, 83, 9, 0.10);
}
.lg-row {
  display: grid;
  grid-template-columns: 22px 22px 1fr auto;
  align-items: center; gap: 12px;
  padding: 7px 8px;
  border-radius: 9px;
  cursor: default;
  transition: background .22s var(--leave-ease);
  position: relative;
}
.lg-row::before {
  content: ""; position: absolute; left: 0; top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 2px; height: 60%;
  background: var(--c);
  border-radius: 2px;
  box-shadow: 0 0 8px var(--c);
  transition: transform .26s var(--leave-ease);
  transform-origin: center;
}
.lg-row:hover { background: rgba(251, 191, 36, 0.05); }
.lg-row:hover::before { transform: translateY(-50%) scaleY(1); }
[data-theme="light"] .lg-row:hover { background: rgba(180, 83, 9, 0.05); }

.lg-rank {
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.10em;
  color: var(--leave-text-muted);
  text-align: center;
  opacity: 0.7;
}

/* Glyph — concentric ring + center dot in the type color */
.lg-glyph {
  position: relative; width: 22px; height: 22px;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.lg-glyph-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--c);
  opacity: 0.45;
  transition: opacity .22s var(--leave-ease), transform .26s var(--leave-ease);
}
.lg-glyph-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 10px var(--c), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform .25s var(--leave-spring), box-shadow .22s var(--leave-ease);
}
.lg-row:hover .lg-glyph-ring { opacity: 0.85; transform: scale(1.10); }
.lg-row:hover .lg-glyph-dot  { transform: scale(1.18); box-shadow: 0 0 16px var(--c), inset 0 1px 0 rgba(255, 255, 255, 0.6); }

.lg-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.lg-row-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lg-name {
  font-size: 12px; font-weight: 700;
  color: var(--leave-text);
  letter-spacing: -0.004em;
}
.lg-pct {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--c);
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
}

.lg-bar {
  position: relative;
  height: 5px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.10);
}
[data-theme="light"] .lg-bar {
  background: rgba(180, 83, 9, 0.06);
  border-color: rgba(180, 83, 9, 0.10);
}
.lg-fill {
  display: block; height: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--c) 65%, #fde047),
    var(--c),
    color-mix(in srgb, var(--c) 80%, #ea580c)
  );
  border-radius: 999px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--c) 60%, transparent);
}
.lg-bar-sheen {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
  background-size: 220% 100%;
  animation: leave-gradient-pan 3s linear infinite;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.lg-val {
  display: inline-flex; align-items: baseline; gap: 1px;
  font-weight: 800;
  color: var(--leave-text);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.lg-val-num { font-size: 16px; letter-spacing: -0.020em; }
.lg-val-suf {
  font-size: 10px;
  color: var(--leave-text-muted);
  margin-left: 2px;
  font-weight: 700;
}

.lg-empty {
  text-align: center;
  font-size: 10.5px;
  color: var(--leave-text-muted);
  padding: 18px 8px;
  letter-spacing: 0.08em;
}

@media (prefers-reduced-motion: reduce) {
  .lg-bar-sheen { animation: none !important; }
}

/* Flow */
.flow-card { min-height: 380px; }
.flow {
  display: flex; flex-direction: column;
  gap: 0;
  flex: 1;
}
.flow-node {
  position: relative;
  display: grid; grid-template-columns: 28px 1fr; gap: 14px;
  padding: 14px 4px;
  transition: background .22s;
  border-radius: 10px;
}
.flow-node:hover { background: rgba(251, 191, 36, 0.04); }
.fn-rail {
  position: absolute;
  left: 17px; top: 38px; bottom: -8px;
  width: 2px;
  background: linear-gradient(180deg, var(--leave-border-strong) 0%, transparent 100%);
}
.flow-node:last-child .fn-rail { display: none; }
.flow-node[data-tone="success"] .fn-rail { background: linear-gradient(180deg, var(--leave-approved), transparent); }
.flow-node[data-tone="danger"]  .fn-rail { background: linear-gradient(180deg, var(--leave-rejected), transparent); }
.flow-node[data-tone="warn"]    .fn-rail { background: linear-gradient(180deg, var(--leave-pending-mgr), transparent); }

.fn-bead {
  position: relative;
  width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(251, 191, 36, 0.14);
  border: 1.5px solid var(--leave-brand);
  color: var(--w-gold-200);
  box-shadow: 0 0 12px color-mix(in srgb, var(--leave-brand) 50%, transparent);
}
.flow-node[data-tone="success"] .fn-bead { background: var(--leave-approved-soft); border-color: var(--leave-approved); color: var(--leave-approved); box-shadow: 0 0 12px color-mix(in srgb, var(--leave-approved) 50%, transparent); }
.flow-node[data-tone="danger"]  .fn-bead { background: var(--leave-rejected-soft); border-color: var(--leave-rejected); color: var(--leave-rejected); box-shadow: 0 0 12px color-mix(in srgb, var(--leave-rejected) 50%, transparent); }
.flow-node[data-tone="warn"]    .fn-bead { background: var(--leave-pending-mgr-soft); border-color: var(--leave-pending-mgr); color: var(--leave-pending-mgr); box-shadow: 0 0 12px color-mix(in srgb, var(--leave-pending-mgr) 40%, transparent); }
.fn-pulse {
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 1px solid currentColor;
  opacity: 0;
  animation: fn-ping 2s ease-out infinite;
}
@keyframes fn-ping {
  0%   { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.5); opacity: 0; }
}

.fn-body { display: flex; flex-direction: column; gap: 4px; }
.fn-row { display: flex; align-items: baseline; justify-content: space-between; }
.fn-label { font-size: 12.5px; font-weight: 700; color: var(--leave-text); }
.fn-num {
  font-size: 18px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.fn-bar {
  height: 5px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.16);
}
.fn-fill {
  height: 100%; transform-origin: left center;
  background: linear-gradient(90deg, var(--leave-brand), var(--w-orange-400));
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}
.flow-node[data-tone="success"] .fn-fill { background: linear-gradient(90deg, #fde047, var(--leave-approved)); }
.flow-node[data-tone="danger"]  .fn-fill { background: linear-gradient(90deg, #ff8a4c, var(--leave-rejected)); }
.flow-node[data-tone="warn"]    .fn-fill { background: linear-gradient(90deg, #fde047, var(--leave-pending-mgr)); }
.fn-fill::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  background-size: 200% 100%;
  animation: leave-gradient-pan 2.4s linear infinite;
}
.fn-meta {
  font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--leave-text-muted);
  text-transform: uppercase;
}

/* ════════════════════════════════════════════════════════════════════
   03 · Attention cells
   ──────────────────────────────────────────────────────────────────── */
.attn {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
@media (max-width: 720px) { .attn { grid-template-columns: repeat(2, 1fr); } }

.attn-cell {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 16px 18px;
  border-radius: 16px;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.65));
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(10px);
  color: var(--leave-text); cursor: pointer;
  font: inherit; text-align: left;
  transition: border-color .22s, transform .18s, box-shadow .22s;
}
[data-theme="light"] .attn-cell {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 60%),
    rgba(255, 250, 235, 0.92);
}
.attn-cell:hover { border-color: var(--leave-brand); box-shadow: var(--leave-shadow-lift); }
.ac-aura {
  position: absolute; inset: -30% -20% auto auto;
  width: 60%; height: 80%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.30), transparent 65%);
  filter: blur(36px);
  pointer-events: none;
  z-index: -1;
  opacity: 0; transition: opacity .25s;
}
.attn-cell:hover .ac-aura { opacity: 0.7; }
.attn-cell[data-tone="warn"]    .ac-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(250, 204, 21, 0.42), transparent 65%); }
.attn-cell[data-tone="danger"]  .ac-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(234, 88, 12, 0.36), transparent 65%); }
.attn-cell[data-tone="info"]    .ac-aura { background: radial-gradient(50% 50% at 50% 50%, rgba(253, 224, 71, 0.32), transparent 65%); }
.ac-icon {
  display: inline-grid; place-items: center;
  width: 36px; height: 36px; border-radius: 11px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.36);
  color: var(--w-gold-200);
  margin-bottom: 4px;
}
.attn-cell[data-tone="warn"]    .ac-icon { color: var(--leave-pending-mgr); background: var(--leave-pending-mgr-soft); border-color: color-mix(in srgb, var(--leave-pending-mgr) 40%, transparent); }
.attn-cell[data-tone="danger"]  .ac-icon { color: var(--leave-rejected); background: var(--leave-rejected-soft); border-color: color-mix(in srgb, var(--leave-rejected) 40%, transparent); }
.attn-cell[data-tone="info"]    .ac-icon { color: var(--w-gold-200); }
.ac-num {
  font-size: 36px; font-weight: 800;
  letter-spacing: -0.024em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.attn-cell[data-tone="danger"] .ac-num { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.ac-lbl {
  font-size: 13px; font-weight: 700;
  color: var(--leave-text);
  margin-top: 4px;
  letter-spacing: -0.005em;
}
.ac-sub {
  font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--leave-text-muted);
  margin-top: 2px;
}
.ac-arrow {
  position: absolute; top: 14px; right: 14px;
  color: var(--leave-text-muted);
  transition: transform .22s, color .22s;
}
.attn-cell:hover .ac-arrow { transform: translate(2px, -2px); color: var(--leave-brand); }

@media (prefers-reduced-motion: reduce) {
  .mr-rot, .fn-fill::after, .fn-pulse, .card-dot, .t-sweep { animation: none !important; }
}
</style>
