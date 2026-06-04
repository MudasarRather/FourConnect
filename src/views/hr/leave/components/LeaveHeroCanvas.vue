<template>
  <section class="lv-hero" :data-loading="loading" ref="heroRef" @mousemove="onMove" @mouseleave="resetMove">
    <!-- ═══ Ambient layers ═══ -->
    <div class="hero-atm" aria-hidden="true">
      <!-- Parallax orbs — driven by mouse via CSS variables -->
      <span class="orb a1" :style="orbStyle(1)" />
      <span class="orb a2" :style="orbStyle(0.6)" />
      <span class="orb a3" :style="orbStyle(0.3)" />
      <span class="orb a4" :style="orbStyle(-0.4)" />

      <!-- Grain + grid -->
      <span class="hero-grain" />
      <span class="hero-grid" />

      <!-- Mesh gradient stripes (Tesla/SpaceX-style angled lines) -->
      <svg class="hero-mesh" viewBox="0 0 1200 320" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="meshA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"  stop-color="#fde047" stop-opacity="0.0" />
            <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0.0" />
          </linearGradient>
          <linearGradient id="meshB" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"  stop-color="#ea580c" stop-opacity="0.0" />
            <stop offset="50%" stop-color="#f97316" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#fde047" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path class="mesh-line mp1" d="M 0 200 Q 300 80 600 180 T 1200 120" fill="none" stroke="url(#meshA)" stroke-width="1.4" />
        <path class="mesh-line mp2" d="M 0 240 Q 400 140 800 220 T 1200 180" fill="none" stroke="url(#meshB)" stroke-width="1.2" />
        <path class="mesh-line mp3" d="M 0 160 Q 250 240 550 140 T 1200 80"  fill="none" stroke="url(#meshA)" stroke-width="1" />
      </svg>
    </div>

    <!-- ═══ Content row ═══ -->
    <div class="hero-row">
      <!-- LEFT: editorial copy + mini KPI strip -->
      <div class="hero-left">
        <Motion class="hero-eyebrow leave-mono" as="span"
          :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="eb-glyph">
            <span class="eb-ring" /><span class="eb-core" />
          </span>
          <span>HRMS · Leave & Absence</span>
          <span class="eb-sep">·</span>
          <span class="eb-fy">FY {{ fyLabel }}</span>
        </Motion>

        <h1 class="hero-title">
          <Motion class="ht-line ht-line-1" as="span"
            :initial="{ y: 28, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }"
          >Good <em>{{ partOfDay }}</em>, Commander.</Motion>
          <Motion class="ht-line ht-line-2" as="span"
            :initial="{ y: 28, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.14, ease: [0.16, 1, 0.3, 1] }"
          >
            <span>Here's the </span>
            <span class="grad-italic">leave control deck</span>
            <span class="ht-period">.</span>
          </Motion>
        </h1>

        <Motion class="hero-sub" as="p"
          :initial="{ y: 10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.55, delay: 0.24 }"
        >
          Manager review · HR review · attendance &amp; payroll integration · audit trail.
          Every approved leave automatically flips the attendance status and debits the right balance.
        </Motion>

        <!-- Live ticker line — micro-motion meter -->
        <Motion class="hero-ticker" as="div"
          :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.5, delay: 0.32 }"
        >
          <span class="tick-dot" />
          <span class="tick-lbl leave-mono">LIVE</span>
          <span class="tick-vline" />
          <span class="tick-meta">
            {{ totalQueued }} pending · {{ onLeaveToday }} away today · {{ approvedToday }} cleared
          </span>
          <span class="tick-flow" />
        </Motion>

        <!-- KPI strip (4-up) -->
        <div class="hero-kpis">
          <Motion as="button" v-for="(m, i) in metrics" :key="m.key"
            type="button"
            class="kpi" :data-tone="m.tone || 'neutral'"
            :initial="{ opacity: 0, y: 22, filter: 'blur(8px)' }"
            :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.55, delay: 0.4 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -4, scale: 1.025 }"
            :whileTap="{ scale: 0.97 }"
            @click="$emit('go', m.go)"
          >
            <span class="kpi-corner" aria-hidden="true">
              <span class="kc tl" /><span class="kc tr" />
              <span class="kc bl" /><span class="kc br" />
            </span>
            <span class="kpi-sweep" aria-hidden="true" />
            <header class="kpi-head">
              <span class="kpi-icon"><component :is="m.icon" :size="13" /></span>
              <span class="kpi-label">{{ m.label }}</span>
            </header>
            <div class="kpi-value">
              <span class="kpi-num leave-mono">{{ formatVal(m.value) }}</span>
              <span v-if="m.foot" class="kpi-foot leave-mono">{{ m.foot }}</span>
            </div>
            <div class="kpi-bar">
              <Motion class="kpi-fill"
                :initial="{ scaleX: 0 }"
                :animate="{ scaleX: kpiPct(m, i) }"
                :transition="{ duration: 0.9, delay: 0.6 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
              />
            </div>
          </Motion>
        </div>
      </div>

      <!-- RIGHT: animated radial control gauge -->
      <Motion class="hero-right" as="div"
        :initial="{ opacity: 0, scale: 0.86, rotate: -8 }"
        :animate="{ opacity: 1, scale: 1, rotate: 0 }"
        :transition="{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="gauge-wrap">
          <!-- Outer scale ring with ticks (rotates slowly) -->
          <svg class="gauge gauge-outer" viewBox="0 0 240 240" aria-hidden="true">
            <g class="g-rot">
              <circle cx="120" cy="120" r="112" fill="none" class="g-rim" />
              <g v-for="n in 60" :key="n">
                <line :x1="120" :y1="6" :x2="120" :y2="(n % 5 === 0 ? 16 : 12)"
                  class="g-tick" :class="{ 'g-tick-major': n % 5 === 0 }"
                  :transform="`rotate(${(n / 60) * 360} 120 120)`" />
              </g>
            </g>
          </svg>

          <!-- Middle progress arc (animated dashoffset) -->
          <svg class="gauge gauge-arc" viewBox="0 0 240 240" aria-hidden="true">
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stop-color="#fde047" />
                <stop offset="55%"  stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
              <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="120" cy="120" r="92" fill="none" class="g-arc-bg" />
            <circle cx="120" cy="120" r="92" fill="none" class="g-arc-fill"
              stroke="url(#arcGrad)" filter="url(#arcGlow)"
              :stroke-dasharray="arcCirc"
              :stroke-dashoffset="arcOffset" />
          </svg>

          <!-- Inner spinning ring (counter-rotation) -->
          <svg class="gauge gauge-inner" viewBox="0 0 240 240" aria-hidden="true">
            <g class="g-rot-r">
              <circle cx="120" cy="120" r="76" fill="none" class="g-inner-ring" />
              <g v-for="n in 24" :key="n">
                <line :x1="120" :y1="40" :x2="120" :y2="48"
                  class="g-tick-inner" :transform="`rotate(${(n / 24) * 360} 120 120)`" />
              </g>
            </g>
          </svg>

          <!-- Center readout -->
          <div class="gauge-readout">
            <div class="gr-eye leave-mono">APPROVAL THROUGHPUT</div>
            <div class="gr-num">
              <span class="gr-int">{{ throughputInt }}</span><span class="gr-pct">%</span>
            </div>
            <div class="gr-lbl">cleared this month</div>
            <div class="gr-divider" />
            <div class="gr-foot leave-mono">
              <span class="gr-fk">{{ approvedThisMonth }}</span>
              <span class="gr-fs">approved</span>
              <span class="gr-fdot">·</span>
              <span class="gr-fk fk-r">{{ rejectedThisMonth }}</span>
              <span class="gr-fs">rejected</span>
            </div>
          </div>

          <!-- Floating chips around the gauge -->
          <Motion class="g-chip g-chip-t" as="div"
            :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.55 }"
          >
            <span class="chip-icon" data-tone="warn">⟳</span>
            <div>
              <div class="chip-num leave-mono">{{ pendingHr }}</div>
              <div class="chip-lbl">HR queue</div>
            </div>
          </Motion>

          <Motion class="g-chip g-chip-r" as="div"
            :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.5, delay: 0.65 }"
          >
            <span class="chip-icon" data-tone="info">☀</span>
            <div>
              <div class="chip-num leave-mono">{{ onLeaveToday }}</div>
              <div class="chip-lbl">today</div>
            </div>
          </Motion>

          <Motion class="g-chip g-chip-b" as="div"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.75 }"
          >
            <span class="chip-icon" data-tone="success">✓</span>
            <div>
              <div class="chip-num leave-mono">{{ approvedToday }}</div>
              <div class="chip-lbl">cleared today</div>
            </div>
          </Motion>
        </div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'

const props = defineProps({
  metrics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  fyLabel: { type: String, default: '' },
  stats: { type: Object, default: () => ({}) },
})
defineEmits(['go'])

const heroRef = ref(null)
const mx = ref(0)
const my = ref(0)

const onMove = (e) => {
  const r = heroRef.value?.getBoundingClientRect()
  if (!r) return
  mx.value = ((e.clientX - r.left) / r.width - 0.5) * 2   // -1 → 1
  my.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const resetMove = () => { mx.value = 0; my.value = 0 }

const orbStyle = (depth) => ({
  transform: `translate3d(${(mx.value * depth * 22).toFixed(2)}px, ${(my.value * depth * 18).toFixed(2)}px, 0)`,
})

const partOfDay = computed(() => {
  const h = new Date().getHours()
  if (h < 5)  return 'evening'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})

const formatVal = (v) => {
  if (v == null) return '—'
  if (typeof v === 'number' && v >= 10000) return `${Math.round(v / 100) / 10}k`
  return v
}

// Pull from metrics array — KPI tiles already carry value/foot
const valFor = (key) => {
  const m = props.metrics.find(x => x.key === key)
  return Number(m?.value || 0)
}

const totalQueued = computed(() => valFor('pending-hr') + valFor('pmgr'))
const onLeaveToday = computed(() => valFor('on-leave') || valFor('today'))
const approvedToday = computed(() => valFor('approved-today') || 0)
const approvedThisMonth = computed(() => valFor('approved-mo') || 0)
const rejectedThisMonth = computed(() => valFor('rejected') || 0)
const pendingHr = computed(() => valFor('pending-hr') || 0)

// Gauge throughput = approved / (approved + rejected) %
const throughputInt = computed(() => {
  const a = approvedThisMonth.value
  const r = rejectedThisMonth.value
  if (a + r === 0) return 100
  return Math.round((a / (a + r)) * 100)
})

const arcCirc = 2 * Math.PI * 92
const arcOffset = computed(() => arcCirc - (throughputInt.value / 100) * arcCirc)

// KPI fill bar — normalize value within metrics row
const kpiPct = (m, i) => {
  const max = Math.max(...props.metrics.map(x => Number(x.value) || 0), 1)
  const v = Number(m.value) || 0
  return Math.max(0.05, Math.min(1, v / max))
}
</script>

<style scoped>
.lv-hero {
  position: relative;
  padding: 36px 36px 30px;
  border-radius: 26px;
  background:
    radial-gradient(90% 100% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(70% 100% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 60%),
    linear-gradient(135deg, #0c0703 0%, #150a04 50%, #100805 100%);
  border: 1px solid var(--leave-border);
  overflow: hidden; isolation: isolate;
  margin-bottom: 18px;
  min-height: 380px;
}
[data-theme="light"] .lv-hero {
  background:
    radial-gradient(90% 100% at 0% 0%, rgba(251, 191, 36, 0.30), transparent 60%),
    radial-gradient(70% 100% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 60%),
    linear-gradient(135deg, #fffdf5, #fff4e0);
}

/* ── Ambient layers ─────────────────────────────────────────────────── */
.hero-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; }

.orb {
  position: absolute; border-radius: 50%;
  filter: blur(64px);
  will-change: transform;
  transition: transform 0.5s var(--leave-ease);
}
.orb.a1 {
  width: 420px; height: 420px; top: -140px; left: -120px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55), transparent 65%);
  animation: hero-orb-1 22s ease-in-out infinite;
}
.orb.a2 {
  width: 360px; height: 360px; bottom: -120px; right: -110px;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.50), transparent 65%);
  animation: hero-orb-2 28s ease-in-out infinite reverse;
}
.orb.a3 {
  width: 260px; height: 260px; top: 18%; right: 30%;
  background: radial-gradient(circle, rgba(253, 224, 71, 0.36), transparent 65%);
  animation: hero-orb-1 18s ease-in-out infinite;
}
.orb.a4 {
  width: 200px; height: 200px; bottom: 8%; left: 38%;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.32), transparent 65%);
  animation: hero-orb-2 24s ease-in-out infinite;
}
@keyframes hero-orb-1 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.9; }
  50%      { transform: translate(28px, -22px) scale(1.08); opacity: 1; }
}
@keyframes hero-orb-2 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
  50%      { transform: translate(-24px, 18px) scale(1.10); opacity: 1; }
}

.hero-grain {
  position: absolute; inset: 0; opacity: 0.06;
  mix-blend-mode: overlay; pointer-events: none;
  background-image:
    radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px),
    radial-gradient(rgba(234, 88, 12, 0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px;
  background-position: 0 0, 2px 3px;
}
.hero-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(var(--leave-grid-line) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%);
  opacity: 0.55;
}

.hero-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.6; pointer-events: none; }
.mesh-line { stroke-dasharray: 6 10; animation: mesh-flow 26s linear infinite; opacity: 0.7; }
.mesh-line.mp2 { animation-duration: 32s; opacity: 0.5; }
.mesh-line.mp3 { animation-duration: 38s; opacity: 0.35; }
@keyframes mesh-flow { to { stroke-dashoffset: -200; } }

/* ── Content row ─────────────────────────────────────────────────────── */
.hero-row {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1.35fr 1fr; gap: 32px;
  align-items: center;
}
@media (max-width: 1100px) {
  .hero-row { grid-template-columns: 1fr; gap: 28px; }
  .hero-right { justify-self: center; }
}

/* Left — copy + KPIs */
.hero-left { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--w-gold-200);
  width: max-content; max-width: 100%;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.34);
  backdrop-filter: blur(6px);
}
[data-theme="light"] .hero-eyebrow { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.20); border-color: rgba(217, 119, 6, 0.34); }
.eb-glyph { position: relative; width: 11px; height: 11px; }
.eb-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid var(--w-gold-300);
  animation: eb-spin 2.8s linear infinite;
}
.eb-ring::after {
  content: ""; position: absolute; top: -2px; left: 50%;
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--w-gold-200);
  box-shadow: 0 0 8px var(--w-gold-200);
  transform: translateX(-50%);
}
.eb-core {
  position: absolute; inset: 3px; border-radius: 50%;
  background: var(--w-gold-300);
  box-shadow: 0 0 10px var(--w-gold-300);
  animation: leave-eyebrow-pulse 1.8s ease-in-out infinite;
}
@keyframes eb-spin { to { transform: rotate(360deg); } }
.eb-sep { opacity: 0.5; }
.eb-fy { color: var(--leave-text); }
[data-theme="light"] .eb-fy { color: var(--leave-text); }

.hero-title {
  margin: 6px 0 0;
  font-size: clamp(34px, 4.8vw, 64px);
  font-weight: 800;
  letter-spacing: -0.030em;
  line-height: 0.98;
  color: #fff8dc;
  text-wrap: balance;
}
[data-theme="light"] .hero-title { color: #2a1100; }

.ht-line { display: block; overflow: hidden; }
.ht-line em {
  font-style: italic; font-weight: 800;
  background: linear-gradient(135deg, #fde047, #fbbf24 55%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.ht-line-2 { display: block; margin-top: 0; }
.grad-italic {
  font-style: italic; font-weight: 800;
  background: linear-gradient(135deg, #fde047, #f59e0b 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
  position: relative;
}
.grad-italic::after {
  content: ""; position: absolute; left: 1%; right: 1%; bottom: 6%;
  height: 8px; border-radius: 8px;
  background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.55), transparent);
  filter: blur(5px);
  z-index: -1;
}
.ht-period { color: var(--w-gold-300); }

.hero-sub {
  margin: 6px 0 0; max-width: 72ch;
  font-size: 13.5px; line-height: 1.62;
  color: var(--w-gold-100); opacity: 0.86;
}
[data-theme="light"] .hero-sub { color: #6b3d12; opacity: 1; }

/* Live ticker */
.hero-ticker {
  display: flex; align-items: center; gap: 10px;
  margin: 6px 0 4px;
  font-size: 11px;
  color: var(--leave-text-secondary);
  padding: 6px 12px; border-radius: 999px;
  background: rgba(20, 14, 8, 0.55);
  border: 1px solid var(--leave-border);
  width: max-content; max-width: 100%;
  overflow: hidden;
  position: relative;
}
[data-theme="light"] .hero-ticker { background: rgba(255, 250, 235, 0.85); }
.tick-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--w-gold-200);
  box-shadow: 0 0 10px var(--w-gold-200);
  animation: leave-eyebrow-pulse 1.4s ease-in-out infinite;
}
.tick-lbl { font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--w-gold-200); }
[data-theme="light"] .tick-lbl { color: var(--w-gold-700); }
.tick-vline { width: 1px; height: 12px; background: var(--leave-border-strong); }
.tick-meta { font-variant-numeric: tabular-nums; }
.tick-flow {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.20), transparent);
  background-size: 200% 100%;
  animation: leave-gradient-pan 4s ease-in-out infinite;
  pointer-events: none;
}

/* KPI strip */
.hero-kpis {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}
@media (max-width: 1100px) {
  .hero-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.kpi {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px 11px;
  border-radius: 14px; text-align: left;
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 60%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.55));
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(10px);
  color: var(--leave-text);
  font: inherit; cursor: pointer;
  isolation: isolate;
  transition: border-color .22s, transform .22s, box-shadow .22s;
}
[data-theme="light"] .kpi {
  background:
    radial-gradient(80% 60% at 0% 0%, rgba(251, 191, 36, 0.12), transparent 60%),
    rgba(255, 250, 235, 0.85);
}
.kpi:hover {
  border-color: var(--leave-brand);
  box-shadow: 0 14px 36px -16px rgba(251, 191, 36, 0.45);
}
.kpi-corner { position: absolute; inset: 0; pointer-events: none; }
.kc {
  position: absolute; width: 10px; height: 10px;
  border: 1.5px solid var(--leave-brand);
  opacity: 0; transition: opacity .22s;
}
.kpi:hover .kc { opacity: 0.85; }
.kc.tl { top: 4px; left: 4px; border-right: 0; border-bottom: 0; }
.kc.tr { top: 4px; right: 4px; border-left: 0; border-bottom: 0; }
.kc.bl { bottom: 4px; left: 4px; border-right: 0; border-top: 0; }
.kc.br { bottom: 4px; right: 4px; border-left: 0; border-top: 0; }

.kpi-sweep {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 0%, rgba(251, 191, 36, 0.12) 50%, transparent 100%);
  transform: translateX(-100%);
}
.kpi:hover .kpi-sweep { animation: leave-ember-sweep 0.9s ease-out; }

.kpi-head { display: flex; align-items: center; gap: 8px; }
.kpi-icon {
  display: inline-grid; place-items: center;
  width: 22px; height: 22px; border-radius: 6px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.34);
  color: var(--w-gold-200);
  flex-shrink: 0;
}
.kpi[data-tone="warn"]    .kpi-icon { color: var(--leave-pending-mgr); background: var(--leave-pending-mgr-soft); border-color: color-mix(in srgb, var(--leave-pending-mgr) 38%, transparent); }
.kpi[data-tone="success"] .kpi-icon { color: var(--leave-approved); background: var(--leave-approved-soft); border-color: color-mix(in srgb, var(--leave-approved) 38%, transparent); }
.kpi[data-tone="danger"]  .kpi-icon { color: var(--leave-rejected); background: var(--leave-rejected-soft); border-color: color-mix(in srgb, var(--leave-rejected) 38%, transparent); }
.kpi[data-tone="info"]    .kpi-icon { color: var(--w-gold-200); }
.kpi-label {
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.kpi-value { display: flex; align-items: baseline; gap: 8px; }
.kpi-num {
  font-size: 28px; font-weight: 800; line-height: 1;
  letter-spacing: -0.022em;
  color: var(--leave-text);
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 60%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.kpi[data-tone="danger"]  .kpi-num { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.kpi[data-tone="success"] .kpi-num { background: linear-gradient(135deg, #fde047, #fbbf24); background-clip: text; -webkit-background-clip: text; color: transparent; }
.kpi-foot { font-size: 9.5px; color: var(--leave-text-muted); letter-spacing: 0.04em; }

.kpi-bar {
  height: 3px; border-radius: 2px;
  background: rgba(251, 191, 36, 0.10);
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.16);
}
.kpi-fill {
  height: 100%; transform-origin: left center;
  background: linear-gradient(90deg, #fde047, #fbbf24 50%, #ea580c);
  border-radius: 2px;
}
.kpi[data-tone="danger"]  .kpi-fill { background: linear-gradient(90deg, #ff8a4c, #e34a0a); }

/* ════════════════════════════════════════════════════════════════════════
   Right — radial control gauge
   ──────────────────────────────────────────────────────────────────────── */
.hero-right {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  min-height: 320px;
}
.gauge-wrap {
  position: relative;
  width: 340px; height: 340px;
}

.gauge {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}

.gauge-outer .g-rot { transform-origin: 120px 120px; animation: leave-orb-spin 50s linear infinite; }
.gauge-outer .g-rim { stroke: rgba(251, 191, 36, 0.22); stroke-width: 1; }
[data-theme="light"] .gauge-outer .g-rim { stroke: rgba(180, 83, 9, 0.30); }
.g-tick { stroke: rgba(251, 191, 36, 0.35); stroke-width: 1; }
.g-tick-major { stroke: rgba(251, 191, 36, 0.7); stroke-width: 1.4; }
[data-theme="light"] .g-tick { stroke: rgba(180, 83, 9, 0.40); }
[data-theme="light"] .g-tick-major { stroke: rgba(180, 83, 9, 0.75); }

.gauge-arc { transform: rotate(-90deg); }
.g-arc-bg {
  stroke: rgba(251, 191, 36, 0.10);
  stroke-width: 8;
}
.g-arc-fill {
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.gauge-inner .g-rot-r { transform-origin: 120px 120px; animation: leave-orb-spin-r 70s linear infinite; }
.gauge-inner .g-inner-ring {
  stroke: rgba(234, 88, 12, 0.24);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.g-tick-inner {
  stroke: rgba(234, 88, 12, 0.4);
  stroke-width: 1;
}

/* Center readout */
.gauge-readout {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; text-align: center;
}
.gr-eye {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.20em; text-transform: uppercase;
  color: var(--w-gold-200);
  padding: 3px 9px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
[data-theme="light"] .gr-eye { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.18); border-color: rgba(217, 119, 6, 0.30); }
.gr-num {
  display: flex; align-items: baseline; gap: 2px;
  margin-top: 6px;
}
.gr-int {
  font-size: 64px; font-weight: 800; line-height: 1;
  letter-spacing: -0.030em;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.gr-pct {
  font-size: 26px; font-weight: 800;
  color: var(--w-gold-200);
  margin-left: 2px;
}
[data-theme="light"] .gr-pct { color: var(--w-gold-600); }
.gr-lbl {
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--leave-text-secondary);
  text-align: center;
  margin-top: 2px;
}
.gr-divider {
  width: 24px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--w-gold-300), transparent);
  margin: 6px 0;
}
.gr-foot {
  display: flex; align-items: baseline; gap: 4px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--leave-text-muted);
}
.gr-fk { color: var(--leave-approved); font-weight: 800; font-variant-numeric: tabular-nums; }
.gr-fk.fk-r { color: var(--leave-rejected); }
.gr-fdot { opacity: 0.5; }

/* Floating chips around the gauge */
.g-chip {
  position: absolute;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 12px;
  background: rgba(20, 14, 8, 0.85);
  border: 1px solid var(--leave-border-strong);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px -16px rgba(0, 0, 0, 0.7);
  z-index: 2;
  animation: chip-float 4s ease-in-out infinite;
}
[data-theme="light"] .g-chip { background: rgba(255, 250, 235, 0.95); }
.g-chip-t { top: -8px; left: 50%; transform: translateX(-50%); }
.g-chip-r { right: -16px; top: 50%; transform: translateY(-50%); animation-delay: -1.5s; }
.g-chip-b { bottom: -8px; left: 50%; transform: translateX(-50%); animation-delay: -3s; }
@keyframes chip-float {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -4px; }
}
.chip-icon {
  display: inline-grid; place-items: center;
  width: 24px; height: 24px; border-radius: 8px;
  background: rgba(251, 191, 36, 0.20);
  border: 1px solid var(--leave-brand);
  color: var(--w-gold-200);
  font-size: 13px; font-weight: 800;
}
.chip-icon[data-tone="warn"]    { color: var(--leave-pending-mgr); border-color: var(--leave-pending-mgr); background: var(--leave-pending-mgr-soft); }
.chip-icon[data-tone="success"] { color: var(--leave-approved); border-color: var(--leave-approved); background: var(--leave-approved-soft); }
.chip-icon[data-tone="info"]    { color: var(--w-gold-200); }
.chip-num {
  font-size: 16px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.02em;
  line-height: 1;
}
.chip-lbl {
  margin-top: 2px;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--leave-text-muted);
}

/* Reduced-motion: cull continuous loops */
@media (prefers-reduced-motion: reduce) {
  .orb, .gauge-outer .g-rot, .gauge-inner .g-rot-r,
  .mesh-line, .eb-ring, .eb-core, .tick-dot, .tick-flow,
  .g-chip { animation: none !important; }
}
</style>
