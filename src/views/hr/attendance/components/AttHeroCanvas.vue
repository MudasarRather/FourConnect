<template>
  <header class="att-hero" ref="rootEl">
    <!-- ════════════════════════════════════════════════════════
         AMBIENT LAYERS — "Time Engine" backdrop
         A unique attendance motif: an analog clock face floats inside
         a perspective hour-grid, while a biometric pulse line runs
         across the floor, hour-tick papers drift down, and pulse
         waves emanate from the central core.
         ════════════════════════════════════════════════════════ -->
    <div class="att-hero-bg" aria-hidden="true">
      <!-- Layer 1 — warm aurora glow blobs -->
      <span class="hero-aurora aurora-a" />
      <span class="hero-aurora aurora-b" />
      <span class="hero-aurora aurora-c" />

      <!-- Layer 2 — perspective hour grid (24 columns, perspective tilt) -->
      <div class="hour-grid">
        <span v-for="n in 24" :key="n" class="hour-col"
          :style="{ left: ((n - 0.5) / 24 * 100) + '%' }">
          <i class="hr-tick" :class="{ 'is-major': n % 6 === 0 }" />
        </span>
        <span class="hour-baseline" />
      </div>

      <!-- Layer 3 — orbiting hour markers (clock motif replaces drifting papers) -->
      <div class="orbit-field" aria-hidden="true">
        <span v-for="i in 8" :key="i" :class="`orbit-marker om-${i}`" :style="orbiterStyle(i)">
          <span class="om-dot" />
        </span>
      </div>
      <!-- Layer 3b — animated waveform / motion-graph (ECG style) on the right -->
      <svg class="motion-graph" viewBox="0 0 800 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="mgFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stop-color="rgba(251, 191, 36, 0)" />
            <stop offset="50%"  stop-color="rgba(251, 191, 36, 0.85)" />
            <stop offset="100%" stop-color="rgba(251, 146, 60, 0)" />
          </linearGradient>
        </defs>
        <path class="mg-wave"
          d="M0 50 Q 40 30, 80 50 T 160 50 T 240 50 L 260 50 L 270 12 L 285 88 L 300 50 L 380 50 T 460 50 T 540 50 L 560 50 L 570 22 L 585 78 L 600 50 L 800 50"
          fill="none" stroke="url(#mgFade)" stroke-width="1.4" stroke-linecap="round"
        />
      </svg>

      <!-- Layer 4 — biometric pulse line (heartbeat across the floor) -->
      <svg class="pulse-floor" viewBox="0 0 900 64" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stop-color="rgba(251, 191, 36, 0)" />
            <stop offset="50%"  stop-color="rgba(251, 191, 36, 0.85)" />
            <stop offset="100%" stop-color="rgba(251, 146, 60, 0)" />
          </linearGradient>
        </defs>
        <path
          d="M0 32 L80 32 L100 8 L120 56 L160 32 L240 32 L260 18 L280 46 L320 32 L460 32 L480 6 L500 58 L540 32 L740 32 L760 14 L780 50 L820 32 L900 32"
          fill="none" stroke="url(#pulseGrad)" stroke-width="1.6"
          class="pulse-line"
        />
      </svg>

      <!-- Layer 5 — soft scanline drifting top→bottom -->
      <span class="dock-scan" />
      <span class="noise-veil" />
    </div>

    <!-- ════════════════════════════════════════════════════════
         TOP RIBBON — identity badge + live clock
         ════════════════════════════════════════════════════════ -->
    <div class="att-hero-top">
      <Motion as="div" class="att-hero-id"
        :initial="{ opacity: 0, y: -8 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="id-mark">
          <!-- Mini clock face on the brand mark -->
          <svg viewBox="0 0 32 32" class="id-mark-svg">
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.6"/>
            <line v-for="n in 12" :key="n"
              :x1="16 + 11 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
              :y1="16 + 11 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
              :x2="16 + 13 * Math.cos((n - 1) * (Math.PI / 6) - Math.PI / 2)"
              :y2="16 + 13 * Math.sin((n - 1) * (Math.PI / 6) - Math.PI / 2)"
              stroke="rgba(255,255,255,0.7)" stroke-width="1.2" />
            <line :x1="16" :y1="16" :x2="16" :y2="7" stroke="#3a2810" stroke-width="2" stroke-linecap="round" class="id-hand id-hand-min"/>
            <line :x1="16" :y1="16" :x2="22" :y2="16" stroke="#3a2810" stroke-width="1.4" stroke-linecap="round" class="id-hand id-hand-hr"/>
            <circle cx="16" cy="16" r="1.6" fill="#3a2810"/>
          </svg>
          <span class="id-mark-pulse" />
        </span>
        <div class="id-text">
          <span class="id-eyebrow"><span class="id-eyebrow-dot" />Attendance · Live Floor</span>
          <h1 class="id-title">
            <span class="id-title-word">Punch</span>
            <span class="id-title-word" style="animation-delay: 80ms">In</span>
            <span class="id-title-word" style="animation-delay: 160ms">Pulse</span>
            <span class="id-title-blink" aria-hidden="true">_</span>
          </h1>
        </div>
      </Motion>

      <Motion as="div" class="att-hero-clock"
        :initial="{ opacity: 0, y: -6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.08 }"
      >
        <div class="att-clock-now">
          <span class="hh">{{ hh }}</span>
          <span class="sep">:</span>
          <span class="mm">{{ mm }}</span>
          <span class="sep small">:</span>
          <span class="ss">{{ ss }}</span>
        </div>
        <div class="att-clock-meta">
          {{ today }} · <span class="att-clock-live">LIVE</span>
        </div>
      </Motion>
    </div>

    <!-- ════════════════════════════════════════════════════════
         BODY — central animated clock core + heatmap
         ════════════════════════════════════════════════════════ -->
    <div class="att-hero-body">
      <Motion as="div" class="att-hero-radial"
        :initial="{ opacity: 0, scale: 0.92 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.65, delay: 0.16, ease: [0.22, 1, 0.36, 1] }"
      >
        <!-- The hero clock core: live-rendered analog clock that breathes -->
        <div class="hero-core" :class="{ 'reduced': reduced }">
          <!-- pulse waves emanating from center -->
          <span v-for="i in 3" :key="i" class="core-wave" :style="{ animationDelay: ((i - 1) * 1.1) + 's' }" />
          <!-- Outer dotted ring (rotates very slowly) -->
          <svg class="core-orbit" viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="112" fill="none"
              stroke="rgba(251, 191, 36, 0.30)" stroke-width="1.2" stroke-dasharray="2 7" />
          </svg>
          <!-- Live clock (replaces radial timer with our own SVG so we can theme it) -->
          <AttLiveClock
            :shift-start="liveShift?.shiftStart"
            :shift-end="liveShift?.shiftEnd"
            :reduced="reduced"
            :size="220"
          />
        </div>
        <div class="att-hero-radial-meta">
          <div class="att-meta-row">
            <Clock :size="11" />
            <span>{{ shiftWindow }}</span>
          </div>
          <div class="att-meta-row" v-if="liveShift?.shiftName">
            <Sparkles :size="11" />
            <span>{{ liveShift.shiftName }}</span>
          </div>
        </div>
      </Motion>

      <Motion as="div" class="att-hero-heatmap"
        :initial="{ opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }"
      >
        <AttHeatmapGrid :cells="heatmap?.cells || []" :reduced="reduced" @cell-click="$emit('cell-click', $event)" />
      </Motion>
    </div>

    <!-- ════════════════════════════════════════════════════════
         FOOT — KPI pills (now punch-card style)
         ════════════════════════════════════════════════════════ -->
    <Motion as="div" class="att-hero-foot"
      :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.5 }"
    >
      <Motion
        v-for="(m, i) in metrics"
        :key="m.key"
        as="button"
        type="button"
        class="att-hero-pill"
        :style="{ '--accent': m.color }"
        :initial="{ opacity: 0, y: 6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.56 + i * 0.05, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="reduced ? {} : { y: -2, scale: 1.02 }"
        :whileTap="reduced ? {} : { scale: 0.97 }"
        @click="$emit('go', m.go)"
      >
        <span class="pill-perf" aria-hidden="true" />
        <span class="pill-icon"><component :is="m.icon" :size="13" /></span>
        <span class="pill-text">
          <span class="pill-label">{{ m.label }}</span>
          <span class="pill-value">{{ m.value }}</span>
        </span>
        <span class="pill-arrow"><ArrowUpRight :size="12" /></span>
      </Motion>
    </Motion>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Clock, ArrowUpRight, Sparkles } from 'lucide-vue-next'
import AttLiveClock from './AttLiveClock.vue'
import AttHeatmapGrid from './AttHeatmapGrid.vue'

const props = defineProps({
  metrics:   { type: Array, default: () => [] },
  heatmap:   { type: Object, default: () => ({ cells: [] }) },
  liveShift: { type: Object, default: null },
  reduced:   { type: Boolean, default: false },
})
defineEmits(['go', 'cell-click'])

const rootEl = ref(null)
const hh = ref('--')
const mm = ref('--')
const ss = ref('--')
const today = ref('')

let tickId = null
const tick = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  hh.value = pad(d.getHours())
  mm.value = pad(d.getMinutes())
  ss.value = pad(d.getSeconds())
  today.value = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
}
onMounted(() => { tick(); tickId = setInterval(tick, 1000) })
onBeforeUnmount(() => { if (tickId) clearInterval(tickId) })

const formatT = (v) => {
  if (!v) return '--:--'
  const d = v instanceof Date ? v : new Date(v)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const shiftWindow = computed(() => {
  const ls = props.liveShift
  if (!ls || !ls.shiftStart || !ls.shiftEnd) return 'No shift assigned today'
  return `${formatT(ls.shiftStart)} – ${formatT(ls.shiftEnd)}`
})

// Orbiting hour-marker positions — each gets a unique radius + angular delay.
const orbiterSeeds = Array.from({ length: 8 }, (_, i) => ({
  delay: i * 1.1,
  duration: 18 + (i % 4) * 4,
  startAngle: (i / 8) * 360,
}))
const orbiterStyle = (i) => {
  const s = orbiterSeeds[i - 1]
  return {
    animationDelay: s.delay + 's',
    animationDuration: s.duration + 's',
    '--start-angle': s.startAngle + 'deg',
  }
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-hero {
  position: relative;
  border-radius: 28px;
  padding: 22px 24px 24px;
  margin-bottom: 8px;
  /* Deep warm gradient — totally different from teal/cyan of other modules */
  background:
    radial-gradient(140% 90% at 0% 0%,   rgba(251, 191, 36, 0.10), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 12, 0.94), rgba(14, 10, 8, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(251, 191, 36, 0.08);
}

/* ════════════ ambient layers ════════════ */
.att-hero-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; border-radius: inherit; }

/* warm aurora blobs */
.hero-aurora {
  position: absolute; border-radius: 50%;
  filter: blur(85px);
  animation: att-warm-aurora 18s ease-in-out infinite;
  pointer-events: none;
}
.aurora-a { top: -90px; left: -60px; width: 360px; height: 360px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.50), transparent 70%); }
.aurora-b { bottom: -120px; left: 32%; width: 420px; height: 420px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.42), transparent 70%);
  animation-delay: 4s; animation-duration: 22s; }
.aurora-c { top: 8%; right: -80px; width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.42), transparent 70%);
  animation-delay: 8s; animation-duration: 25s; }

/* perspective hour grid — attendance signature backdrop */
.hour-grid {
  position: absolute; left: 0; right: 0; bottom: -10%; height: 70%;
  transform: perspective(900px) rotateX(62deg);
  transform-origin: 50% 100%;
  -webkit-mask: radial-gradient(ellipse 80% 60% at 50% 50%, #000 30%, transparent 95%);
          mask: radial-gradient(ellipse 80% 60% at 50% 50%, #000 30%, transparent 95%);
  opacity: 0.55;
}
.hour-col {
  position: absolute; top: 0; bottom: 0; width: 1px;
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.20) 35%, rgba(251, 191, 36, 0.35) 80%, transparent);
}
.hr-tick {
  position: absolute; bottom: 26%; left: -3px;
  width: 7px; height: 2px; border-radius: 1px;
  background: rgba(251, 191, 36, 0.55);
}
.hr-tick.is-major { width: 10px; height: 3px; background: rgba(251, 146, 60, 0.85); box-shadow: 0 0 6px rgba(251, 146, 60, 0.6); }
.hour-baseline {
  position: absolute; left: 0; right: 0; bottom: 26%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.45) 20%, rgba(251, 191, 36, 0.45) 80%, transparent);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.45);
}

/* Orbiting hour markers — pure clock motif replacing the falling-paper field.
   Each marker rotates around a virtual center inside the hero. */
.orbit-field {
  position: absolute; inset: 0;
  pointer-events: none;
  perspective: 800px;
}
.orbit-marker {
  position: absolute; top: 50%; left: 30%;
  width: 14px; height: 14px;
  transform-origin: center;
  animation: orbit-spin linear infinite;
  --start-angle: 0deg;
}
.om-dot {
  display: block; width: 6px; height: 6px; border-radius: 50%;
  background: var(--att-yellow-200);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.85), 0 0 4px rgba(254, 243, 199, 1);
  margin: 4px auto;
}
.orbit-marker.om-1 .om-dot { background: var(--att-yellow-100); }
.orbit-marker.om-2 .om-dot { background: var(--att-orange-100); }
.orbit-marker.om-3 .om-dot { background: var(--att-orange-200); }
.orbit-marker.om-4 .om-dot { background: var(--att-yellow-200); }
.orbit-marker.om-5 .om-dot { background: var(--att-yellow-100); }
.orbit-marker.om-6 .om-dot { background: #fde68a; }
.orbit-marker.om-7 .om-dot { background: var(--att-orange-100); }
.orbit-marker.om-8 .om-dot { background: var(--att-yellow-300); }
@keyframes orbit-spin {
  from { transform: rotate(var(--start-angle, 0deg)) translateX(180px) rotate(calc(-1 * var(--start-angle, 0deg))); }
  to   { transform: rotate(calc(var(--start-angle, 0deg) + 360deg)) translateX(180px) rotate(calc(-1 * (var(--start-angle, 0deg) + 360deg))); }
}

/* Motion-graph (ECG-style waveform) — runs across the hero, dashed and animated */
.motion-graph {
  position: absolute; left: 0; right: 0;
  bottom: 22%; height: 80px;
  width: 100%;
  opacity: 0.65;
  pointer-events: none;
}
.mg-wave {
  stroke-dasharray: 1200 0;
  animation: mg-march 14s linear infinite;
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.65));
}
@keyframes mg-march { to { stroke-dashoffset: -2400; } }

/* biometric pulse line (heartbeat across the floor) */
.pulse-floor {
  position: absolute; left: 0; right: 0; bottom: 14%;
  width: 100%; height: 60px;
  opacity: 0.85; pointer-events: none;
}
.pulse-line {
  stroke-dasharray: 8 0;
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.65));
  animation: att-dash-march 8s linear infinite;
}
@keyframes att-dash-march { to { stroke-dasharray: 800 0; stroke-dashoffset: -200; } }

/* drifting scanline */
.dock-scan {
  position: absolute; left: 0; right: 0; top: 0; height: 100%;
  background: linear-gradient(180deg, transparent 0%, rgba(251, 191, 36, 0.10) 30%, rgba(251, 191, 36, 0.18) 50%, rgba(251, 191, 36, 0.10) 70%, transparent 100%);
  background-size: 100% 240%;
  animation: att-dock-scan 9s linear infinite;
  mix-blend-mode: screen;
  pointer-events: none;
}

.noise-veil {
  position: absolute; inset: 0; opacity: 0.35;
  background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1.4px);
  background-size: 6px 6px;
  -webkit-mask: linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%);
          mask: linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%);
  pointer-events: none;
}

/* ════════════ top ribbon ════════════ */
.att-hero-top {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin-bottom: 16px;
}
.att-hero-id { display: flex; align-items: center; gap: 14px; }
.id-mark {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 14px;
  background: var(--att-gradient-punch);
  color: #3a2810;
  flex-shrink: 0;
  box-shadow:
    0 14px 32px -10px rgba(251, 146, 60, 0.65),
    inset 0 1px 0 rgba(255,255,255,0.55),
    0 0 0 1px rgba(251, 191, 36, 0.45);
}
.id-mark-svg { width: 30px; height: 30px; }
.id-hand-min {
  transform-origin: 16px 16px;
  animation: att-hand-sweep-slow 60s linear infinite;
}
.id-hand-hr {
  transform-origin: 16px 16px;
  animation: att-hand-sweep-slow 720s linear infinite;
}
.id-mark-pulse {
  position: absolute; inset: -2px; border-radius: 16px;
  background: radial-gradient(closest-side, rgba(251, 191, 36, 0.5), transparent 70%);
  z-index: -1; opacity: 0.8; pointer-events: none;
  animation: att-warm-aurora 6s ease-in-out infinite;
}
.id-text { display: flex; flex-direction: column; gap: 4px; }
.id-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 2px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.id-eyebrow-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 10px #fb923c, 0 0 0 0 rgba(251, 146, 60, 0.6);
  animation: att-live-pulse 2.2s ease-in-out infinite;
  flex-shrink: 0;
}
.id-title {
  margin: 0; font-size: 36px; font-weight: 800;
  letter-spacing: -0.025em; line-height: 1;
  display: inline-flex; align-items: baseline; gap: 10px;
  color: var(--hr-text);
}
.id-title-word {
  display: inline-block;
  background: var(--att-gradient-hero);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: att-title-shimmer 7s ease-in-out infinite;
}
.id-title-blink {
  color: var(--att-teal-100);
  animation: att-blink 1s steps(1) infinite;
}

/* live clock with separated digits */
.att-hero-clock {
  text-align: right;
  display: flex; flex-direction: column; gap: 4px;
  padding: 6px 16px 6px 14px;
  border-left: 1px solid rgba(251, 191, 36, 0.20);
}
.att-clock-now {
  font-family: var(--hr-mono);
  font-size: 26px; font-weight: 700; letter-spacing: 0.5px;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 1px;
  text-shadow: 0 2px 16px rgba(251, 146, 60, 0.20);
}
.hh, .mm { color: var(--hr-text); }
.ss {
  color: var(--att-yellow-200);
  font-size: 20px;
  letter-spacing: 0.5px;
  text-shadow: 0 0 12px rgba(250, 204, 21, 0.45);
}
.sep {
  display: inline-block;
  margin: 0 1px;
  color: var(--att-yellow-200);
  animation: att-blink 1s steps(1) infinite;
}
.sep.small { font-size: 18px; }
.att-clock-meta {
  font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--hr-text-muted);
}
.att-clock-live {
  color: var(--att-orange-200); font-weight: 700;
}

/* ════════════ body — clock core + heatmap ════════════ */
.att-hero-body {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: center;
}
@media (max-width: 1100px) {
  .att-hero-body { grid-template-columns: 1fr; }
}

.att-hero-radial {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}

/* The new hero core — analog clock with breathing + pulse waves + orbit ring */
.hero-core {
  position: relative;
  width: 240px; height: 240px;
  display: flex; align-items: center; justify-content: center;
  animation: att-core-breathe 8s ease-in-out infinite;
}
.hero-core.reduced { animation: none; }

.core-wave {
  position: absolute; top: 50%; left: 50%;
  width: 240px; height: 240px;
  border-radius: 50%;
  border: 1.5px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4.5s ease-out infinite;
  pointer-events: none;
}
.hero-core.reduced .core-wave { animation: none; opacity: 0; }

.core-orbit {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  animation: att-hand-sweep 80s linear infinite;
}
.hero-core.reduced .core-orbit { animation: none; }

.att-hero-radial-meta {
  display: flex; flex-direction: column; gap: 4px; align-items: center;
}
.att-meta-row {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text-muted); letter-spacing: 0.2px;
}
.att-meta-row svg { color: var(--att-teal-100); }

.att-hero-heatmap { min-width: 0; }

/* ════════════ foot — punch-card pills ════════════ */
.att-hero-foot {
  position: relative; z-index: 2;
  display: flex; gap: 10px; flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
.att-hero-pill {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background:
    radial-gradient(80% 100% at 0% 50%, rgba(251, 191, 36, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(28, 22, 18, 0.78), rgba(20, 16, 14, 0.92));
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 14px;
  color: var(--hr-text);
  font: inherit;
  cursor: pointer;
  transition: border-color .25s var(--att-spring), background .25s var(--att-spring), transform .22s var(--att-spring);
}
/* Punch-card perforated edge */
.pill-perf {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background:
    radial-gradient(circle at 50% 5px, rgba(251, 191, 36, 0.65) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 11px, rgba(251, 191, 36, 0.65) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 17px, rgba(251, 191, 36, 0.65) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 23px, rgba(251, 191, 36, 0.65) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 29px, rgba(251, 191, 36, 0.65) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 35px, rgba(251, 191, 36, 0.65) 1.2px, transparent 1.6px);
  background-repeat: repeat-y; background-size: 4px 12px;
  opacity: 0.7;
  pointer-events: none;
}
.att-hero-pill:hover {
  border-color: color-mix(in srgb, var(--accent) 65%, transparent);
  background:
    radial-gradient(80% 100% at 0% 50%, rgba(251, 191, 36, 0.15), transparent 60%),
    linear-gradient(180deg, rgba(40, 30, 22, 0.85), rgba(28, 22, 18, 0.95));
}
.pill-icon {
  width: 28px; height: 28px; border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
}
.pill-text { display: flex; flex-direction: column; gap: 2px; }
.pill-label { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--hr-text-muted); }
.pill-value { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.pill-arrow {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-muted);
  transition: transform .2s var(--att-spring), background .2s var(--att-spring), color .2s var(--att-spring);
}
.att-hero-pill:hover .pill-arrow {
  transform: translate(2px, -2px);
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .att-hero {
  background:
    radial-gradient(140% 90% at 0% 0%,   rgba(251, 191, 36, 0.18), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(255, 248, 232, 0.95), rgba(252, 236, 210, 0.96));
  border-color: rgba(180, 83, 9, 0.30);
  box-shadow:
    0 30px 80px -30px rgba(40, 25, 10, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.50),
    inset 0 -1px 0 rgba(180, 83, 9, 0.10);
}
[data-theme="light"] .hero-aurora { filter: blur(70px); opacity: 1; mix-blend-mode: normal; }
[data-theme="light"] .aurora-a { background: radial-gradient(circle, rgba(234, 88, 12, 0.85), transparent 65%); }
[data-theme="light"] .aurora-b { background: radial-gradient(circle, rgba(217, 119, 6, 0.78), transparent 65%); }
[data-theme="light"] .aurora-c { background: radial-gradient(circle, rgba(245, 158, 11, 0.80), transparent 65%); }
/* Boost ambient backdrop layers on cream — perspective grid, motion graph, pulse line, scanline */
[data-theme="light"] .hour-grid { opacity: 0.85; }
[data-theme="light"] .motion-graph { opacity: 0.95; }
[data-theme="light"] .mg-wave {
  stroke: rgba(180, 83, 9, 0.85) !important;
  filter: drop-shadow(0 0 6px rgba(217, 119, 6, 0.55));
}
[data-theme="light"] .pulse-floor { opacity: 1; }
[data-theme="light"] .pulse-line {
  stroke: rgba(180, 83, 9, 0.85) !important;
  stroke-width: 2;
  filter: drop-shadow(0 0 8px rgba(217, 119, 6, 0.55));
}
[data-theme="light"] .orbit-marker .om-dot {
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.95), 0 0 6px rgba(194, 65, 12, 0.85);
}
[data-theme="light"] .hour-col { background: linear-gradient(180deg, transparent, rgba(180, 83, 9, 0.30) 35%, rgba(180, 83, 9, 0.45) 80%, transparent); }
[data-theme="light"] .hr-tick { background: rgba(180, 83, 9, 0.65); }
[data-theme="light"] .hr-tick.is-major { background: rgba(194, 65, 12, 0.95); box-shadow: 0 0 6px rgba(194, 65, 12, 0.7); }
[data-theme="light"] .hour-baseline {
  background: linear-gradient(90deg, transparent, rgba(180, 83, 9, 0.55) 20%, rgba(180, 83, 9, 0.55) 80%, transparent);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .tick-paper {
  background: linear-gradient(135deg, #fff 0%, rgba(251, 191, 36, 0.95) 100%);
  border-color: rgba(180, 83, 9, 0.55);
}
[data-theme="light"] .pulse-line {
  filter: drop-shadow(0 0 6px rgba(194, 65, 12, 0.65));
}
[data-theme="light"] .dock-scan {
  background: linear-gradient(180deg, transparent 0%, rgba(217, 119, 6, 0.14) 30%, rgba(217, 119, 6, 0.20) 50%, rgba(217, 119, 6, 0.14) 70%, transparent 100%);
  mix-blend-mode: multiply;
  opacity: 0.65;
}
[data-theme="light"] .noise-veil { opacity: 0.25; }
[data-theme="light"] .id-mark {
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 55%, #c2410c 100%);
  color: #fff;
  box-shadow:
    0 14px 32px -10px rgba(180, 83, 9, 0.55),
    inset 0 1px 0 rgba(255,255,255,0.55),
    0 0 0 1px rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .id-mark-svg circle:first-of-type { stroke: rgba(255,255,255,0.65); }
[data-theme="light"] .id-mark-svg line { stroke: rgba(255,255,255,0.8); }
[data-theme="light"] .id-hand-min, [data-theme="light"] .id-hand-hr { stroke: #1f1408; }
[data-theme="light"] .id-mark-svg circle:last-of-type { fill: #1f1408; }
[data-theme="light"] .id-mark-pulse {
  background: radial-gradient(closest-side, rgba(217, 119, 6, 0.5), transparent 70%);
}
[data-theme="light"] .id-eyebrow-dot {
  background: #c2410c;
  box-shadow: 0 0 10px rgba(194, 65, 12, 0.7);
}
[data-theme="light"] .id-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .id-title-word {
  background: linear-gradient(110deg, #92400e, #d97706 35%, #ea580c 65%, #c2410c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .id-title-blink { color: var(--att-teal-500); }
[data-theme="light"] .att-clock-now { color: var(--hr-text); text-shadow: 0 2px 8px rgba(255, 255, 255, 0.65); }
[data-theme="light"] .ss { color: var(--att-orange-500); text-shadow: none; }
[data-theme="light"] .sep { color: var(--att-orange-500); }
[data-theme="light"] .att-clock-meta { color: var(--hr-text-muted); }
[data-theme="light"] .att-clock-live { color: var(--att-orange-500); }
[data-theme="light"] .att-hero-clock { border-left-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .att-meta-row svg { color: var(--att-teal-500); }
[data-theme="light"] .att-hero-foot { border-top-color: rgba(180, 83, 9, 0.28); }
[data-theme="light"] .att-hero-pill {
  background:
    radial-gradient(80% 100% at 0% 50%, rgba(217, 119, 6, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.28);
  color: var(--hr-text);
}
[data-theme="light"] .att-hero-pill:hover {
  background:
    radial-gradient(80% 100% at 0% 50%, rgba(217, 119, 6, 0.16), transparent 60%),
    rgba(255, 250, 240, 0.92);
}
[data-theme="light"] .pill-perf {
  background:
    radial-gradient(circle at 50% 5px, rgba(180, 83, 9, 0.7) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 11px, rgba(180, 83, 9, 0.7) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 17px, rgba(180, 83, 9, 0.7) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 23px, rgba(180, 83, 9, 0.7) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 29px, rgba(180, 83, 9, 0.7) 1.2px, transparent 1.6px),
    radial-gradient(circle at 50% 35px, rgba(180, 83, 9, 0.7) 1.2px, transparent 1.6px);
  background-repeat: repeat-y; background-size: 4px 12px;
}
[data-theme="light"] .pill-label { color: var(--hr-text-muted); }
[data-theme="light"] .pill-value { color: var(--hr-text); }
[data-theme="light"] .pill-arrow { background: rgba(180, 83, 9, 0.08); color: var(--hr-text-muted); }
[data-theme="light"] .core-wave { border-color: rgba(217, 119, 6, 0.50); }
[data-theme="light"] .core-orbit circle { stroke: rgba(180, 83, 9, 0.35); }

/* ════════════ Reduced motion ════════════ */
@media (prefers-reduced-motion: reduce) {
  .hero-aurora, .dock-scan, .orbit-marker, .mg-wave, .pulse-line,
  .id-mark-pulse, .id-eyebrow-dot, .id-hand-min, .id-hand-hr,
  .id-title-word, .id-title-blink, .sep,
  .core-wave, .core-orbit, .hero-core { animation: none !important; }
}
</style>
