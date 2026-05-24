<template>
  <header class="onb-hero" ref="rootEl">
    <!-- ambient layers -->
    <div class="onb-hero-bg" aria-hidden="true">
      <div class="ax-noise"></div>
      <div class="ax-grid"></div>
      <div class="ax-glow ax-glow-1"></div>
      <div class="ax-glow ax-glow-2"></div>
      <div class="ax-glow ax-glow-3"></div>
    </div>

    <!-- TOP RIBBON: identity + live metrics -->
    <div class="onb-hero-top">
      <Motion
        as="div"
        class="onb-hero-id"
        :initial="{ opacity: 0, y: -6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="id-mark">
          <Sparkles :size="13" />
        </span>
        <div class="id-text">
          <span class="id-eyebrow">Onboarding · Joining Mission Control</span>
          <h1 class="id-title">
            <span class="id-title-word">Welcome</span>
            <span class="id-title-word">aboard</span>
            <span class="id-title-blink" aria-hidden="true">_</span>
          </h1>
        </div>
      </Motion>

      <Motion
        as="div"
        class="onb-hero-now"
        :initial="{ opacity: 0, y: -6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="now-time">{{ clock }}</div>
        <div class="now-meta">{{ today }} · {{ liveDot }}</div>
      </Motion>
    </div>

    <!-- BODY: split — left metrics ladder | right portrait + counters -->
    <div class="onb-hero-body">
      <!-- LEFT: METRICS LADDER -->
      <Motion
        as="div"
        class="onb-hero-ladder"
        :initial="{ opacity: 0, x: -8 }"
        :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }"
      >
        <Motion
          v-for="(m, i) in metrics"
          :key="m.key"
          as="button"
          class="ladder-rung"
          :style="{ '--accent': m.color }"
          :initial="{ opacity: 0, x: -10 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.42, delay: 0.12 + i * 0.05, ease: [0.22, 1, 0.36, 1] }"
          :whileHover="{ x: 4, transition: { duration: 0.18 } }"
          :whileTap="{ scale: 0.98 }"
          @click="$emit('go', m.go)"
        >
          <span class="ladder-rail" />
          <span class="ladder-bullet">
            <component :is="m.icon" :size="12" />
          </span>
          <span class="ladder-meta">
            <span class="ladder-label">{{ m.label }}</span>
            <span class="ladder-sub">{{ m.sub || '' }}</span>
          </span>
          <span class="ladder-value">
            <OnbAnimatedNumber :value="m.value || 0" />
          </span>
          <span class="ladder-arrow">
            <ArrowUpRight :size="12" />
          </span>
        </Motion>
      </Motion>

      <!-- RIGHT: PORTRAIT TILES + counters -->
      <div class="onb-hero-stage">
        <!-- Counter rings -->
        <Motion
          as="div"
          class="stage-rings"
          :initial="{ opacity: 0, scale: 0.92 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }"
        >
          <OnbProgressRing
            v-for="r in rings"
            :key="r.key"
            :value="r.value"
            :total="100"
            :label="r.label"
            :sub-label="r.sub"
            :color="r.color"
            :size="78"
            :stroke="6"
          />
        </Motion>

        <!-- Floating tile montage -->
        <div class="stage-tiles">
          <Motion
            v-for="(t, i) in tiles"
            :key="i"
            as="div"
            class="stage-tile"
            :class="`tile-${i}`"
            :style="{ '--tone': t.color }"
            :initial="{ opacity: 0, y: 20, scale: 0.86, rotate: t.rot - 3 }"
            :animate="{ opacity: 1, y: 0, scale: 1, rotate: t.rot }"
            :transition="{ duration: 0.7, delay: 0.25 + i * 0.07, ease: [0.22, 1, 0.36, 1] }"
            :whileHover="{ y: -4, rotate: 0, scale: 1.04, transition: { duration: 0.25 } }"
          >
            <span class="tile-mark">
              <component :is="t.icon" :size="14" />
            </span>
            <div class="tile-text">
              <span class="tile-label">{{ t.label }}</span>
              <span class="tile-value">{{ t.value }}</span>
            </div>
            <span class="tile-glow" />
          </Motion>

          <!-- Drifting joiner avatars -->
          <div class="stage-avatars" aria-hidden="true">
            <span v-for="i in 6" :key="i" :class="`drift drift-${i}`">{{ ['A','M','R','S','P','K'][i-1] }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Sparkles, ArrowUpRight,
  FileCheck2, IdCard, Laptop, Gauge, GraduationCap, Users, Hourglass, Briefcase, Package,
} from 'lucide-vue-next'
import OnbAnimatedNumber from './OnbAnimatedNumber.vue'
import OnbProgressRing from './OnbProgressRing.vue'

const props = defineProps({
  metrics: { type: Array, required: true },
  rings:   { type: Array, default: () => [] },
})
defineEmits(['go'])

const rootEl = ref(null)

// Tiles montage on the right side
const tiles = computed(() => [
  { label: 'Docs Verified',    value: (props.rings.find(r => r.key === 'docs')?.value ?? 0) + '%', icon: FileCheck2,    color: '#fbbf24', rot:  -7 },
  { label: 'ID Provisioned',   value: 'Issuing',                                                    icon: IdCard,        color: '#f59e0b', rot:   4 },
  { label: 'Asset Allocated',  value: 'In Stock',                                                   icon: Laptop,        color: '#fb923c', rot:  -3 },
  { label: 'Training Ready',   value: (props.rings.find(r => r.key === 'training')?.value ?? 0) + '%', icon: GraduationCap, color: '#34d399', rot:   6 },
])

// Clock + date
const clock = ref('--:--')
const today = ref('')
const liveDot = ref('LIVE')
let clockHandle = null
const tick = () => {
  const d = new Date()
  clock.value = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  today.value = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
}
onMounted(() => { tick(); clockHandle = setInterval(tick, 1000 * 30) })
onBeforeUnmount(() => clearInterval(clockHandle))
</script>

<style scoped>
.onb-hero {
  position: relative;
  border-radius: 26px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(20, 16, 14, 0.94), rgba(8, 7, 6, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 22px 24px 28px;
  margin-bottom: 14px;
  box-shadow:
    0 30px 60px -30px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

/* ── Ambient background ── */
.onb-hero-bg { position: absolute; inset: 0; pointer-events: none; }
.ax-noise {
  position: absolute; inset: 0;
  opacity: 0.6;
  background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1.4px);
  background-size: 5px 5px;
  -webkit-mask: linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
          mask: linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
}
.ax-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask: radial-gradient(ellipse 70% 60% at 75% 50%, #000 30%, transparent 90%);
          mask: radial-gradient(ellipse 70% 60% at 75% 50%, #000 30%, transparent 90%);
  transform: perspective(800px) rotateX(58deg);
  transform-origin: 50% 100%;
  bottom: -20%;
  height: 80%;
}
.ax-glow {
  position: absolute; border-radius: 50%;
  filter: blur(70px); opacity: 0.55;
  animation: onb-orb-float 16s ease-in-out infinite;
}
.ax-glow-1 { top: -40px; left: -30px; width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.55), transparent 70%); }
.ax-glow-2 { bottom: -80px; left: 40%; width: 320px; height: 320px;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.42), transparent 70%);
  animation-delay: 3s; animation-duration: 20s; }
.ax-glow-3 { top: 10%; right: -60px; width: 360px; height: 360px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.4), transparent 70%);
  animation-delay: 6s; animation-duration: 22s; }

/* ── Top ribbon ── */
.onb-hero-top {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-bottom: 14px;
}
.onb-hero-id { display: flex; align-items: center; gap: 14px; }
.id-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 12px;
  background: var(--hr-gradient-hero);
  color: #1f1408;
  box-shadow: 0 12px 24px -10px rgba(251, 146, 60, 0.7),
              inset 0 1px 0 rgba(255,255,255,0.5);
}
.id-text { display: flex; flex-direction: column; gap: 2px; }
.id-eyebrow {
  font-size: 9.5px; font-weight: 700; letter-spacing: 2.2px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.id-title {
  margin: 0;
  font-size: 32px; font-weight: 800;
  letter-spacing: -0.025em; line-height: 1;
  color: var(--hr-text);
  display: inline-flex; align-items: baseline; gap: 8px;
}
/* id-title-word animation lives in onboarding-theme.css globally so it
   applies to both words. Stagger the second word by overriding delay. */
.id-title-word:nth-child(2) {
  animation-delay: 0.12s, 1.22s;
}
.id-title-blink { color: var(--hr-accent-gold); animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

.onb-hero-now {
  text-align: right;
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 14px;
  border-left: 1px solid var(--hr-border);
}
.now-time {
  font-family: var(--hr-mono);
  font-size: 22px; font-weight: 700; letter-spacing: 1px;
  color: var(--hr-text);
}
.now-meta { font-size: 10.5px; letter-spacing: 1.4px; color: var(--hr-text-muted); text-transform: uppercase; }

/* ── Body: split ── */
.onb-hero-body {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.05fr;
  gap: 22px;
  align-items: center;
}
@media (max-width: 1100px) {
  .onb-hero-body { grid-template-columns: 1fr; }
}

/* LEFT — metrics ladder */
.onb-hero-ladder {
  display: flex; flex-direction: column; gap: 6px;
}
.ladder-rung {
  position: relative;
  display: grid;
  grid-template-columns: 4px 24px 1fr auto auto;
  gap: 12px;
  align-items: center;
  background: rgba(20, 20, 22, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 9px 14px;
  color: var(--hr-text); font: inherit;
  cursor: pointer;
  overflow: hidden;
}
.ladder-rung::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent, color-mix(in srgb, var(--accent) 18%, transparent), transparent);
  opacity: 0; transition: opacity .3s ease;
  pointer-events: none;
}
.ladder-rung:hover { border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
.ladder-rung:hover::before { opacity: 1; }
.ladder-rail {
  width: 4px; height: 22px; border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 80%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 60%, transparent);
}
.ladder-bullet {
  width: 24px; height: 24px; border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
}
.ladder-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ladder-label { font-size: 12px; font-weight: 600; color: var(--hr-text); }
.ladder-sub   { font-size: 10px; color: var(--hr-text-muted); }
.ladder-value {
  font-size: 18px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text); font-variant-numeric: tabular-nums;
}
.ladder-arrow {
  width: 22px; height: 22px; border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted);
  transition: transform .2s var(--hr-spring), background .2s var(--hr-spring), color .2s var(--hr-spring);
}
.ladder-rung:hover .ladder-arrow {
  transform: translate(2px, -2px);
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
}

/* RIGHT — stage with rings + floating tiles */
.onb-hero-stage {
  position: relative;
  min-height: 240px;
  display: flex; flex-direction: column; gap: 14px;
}
.stage-rings {
  display: flex; gap: 12px;
  justify-content: flex-end;
}
.stage-tiles {
  position: relative;
  height: 180px;
}
.stage-tile {
  position: absolute;
  display: inline-flex; align-items: center; gap: 10px;
  background: rgba(14, 14, 16, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 10px 14px;
  cursor: default;
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.6);
  transform-origin: center;
}
.tile-0 { top: 14px;  left: 0;   --tile-w: 200px; }
.tile-1 { top: 4px;   right: 0;  --tile-w: 200px; }
.tile-2 { top: 100px; left: 14%; --tile-w: 200px; }
.tile-3 { top: 96px;  right: 6%; --tile-w: 200px; }
.stage-tile { min-width: 200px; }
.tile-mark {
  width: 26px; height: 26px; border-radius: 8px;
  background: color-mix(in srgb, var(--tone) 18%, transparent);
  color: var(--tone);
  display: inline-flex; align-items: center; justify-content: center;
}
.tile-text { display: flex; flex-direction: column; gap: 0; }
.tile-label { font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--hr-text-muted); }
.tile-value { font-size: 13px; font-weight: 700; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.tile-glow {
  position: absolute; inset: -1px; border-radius: 14px;
  pointer-events: none;
  background: linear-gradient(135deg, color-mix(in srgb, var(--tone) 40%, transparent), transparent 60%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  padding: 1px;
  opacity: 0.85;
}

/* Drifting avatars across the stage */
.stage-avatars {
  position: absolute; inset: 0; pointer-events: none;
}
.drift {
  position: absolute;
  width: 28px; height: 28px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.18);
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: var(--hr-accent-gold);
  font-size: 10.5px; font-weight: 800;
  animation: onb-tile-drift 7s ease-in-out infinite;
}
.drift-1 { top: 60%; left: 6%;  animation-delay: 0s; }
.drift-2 { top: 30%; left: 30%; animation-delay: 1.2s; opacity: .6; }
.drift-3 { top: 78%; left: 44%; animation-delay: 2.4s; opacity: .8; }
.drift-4 { top: 50%; left: 60%; animation-delay: 3.6s; opacity: .9; }
.drift-5 { top: 22%; left: 78%; animation-delay: 4.8s; opacity: .55; }
.drift-6 { top: 70%; left: 88%; animation-delay: 6s;   opacity: .9; }

@media (prefers-reduced-motion: reduce) {
  .ax-glow, .drift, .id-title-blink { animation: none !important; }
}

/* ─── Light theme overrides ─────────────────────────────────────────────── */
[data-theme="light"] .onb-hero {
  background:
    linear-gradient(180deg, rgba(255, 248, 232, 0.95), rgba(252, 240, 215, 0.95));
  border-color: rgba(217, 119, 6, 0.20);
  box-shadow:
    0 30px 60px -30px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .ax-noise {
  background-image: radial-gradient(rgba(40, 25, 10, 0.06) 1px, transparent 1.4px);
  opacity: 0.4;
}
[data-theme="light"] .ax-grid {
  background-image:
    linear-gradient(rgba(217, 119, 6, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(217, 119, 6, 0.10) 1px, transparent 1px);
}
[data-theme="light"] .ax-glow { opacity: 0.42; filter: blur(60px); }
[data-theme="light"] .ax-glow-1 { background: radial-gradient(circle, rgba(217, 119, 6, 0.55), transparent 70%); }
[data-theme="light"] .ax-glow-2 { background: radial-gradient(circle, rgba(234, 88, 12, 0.45), transparent 70%); }
[data-theme="light"] .ax-glow-3 { background: radial-gradient(circle, rgba(251, 146, 60, 0.40), transparent 70%); }

/* Metrics ladder — was dark glass, becomes cream card on light */
[data-theme="light"] .ladder-rung {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .ladder-arrow {
  background: rgba(40, 25, 10, 0.05);
  color: var(--hr-text-secondary);
}

/* Floating stage tiles — dark glass becomes cream glass */
[data-theme="light"] .stage-tile {
  background: rgba(255, 250, 240, 0.82);
  border-color: rgba(40, 25, 10, 0.12);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 40px -22px rgba(40, 25, 10, 0.30);
}

/* Drift avatars — gold-tinted bg becomes saturated gold on cream */
[data-theme="light"] .drift {
  background: rgba(217, 119, 6, 0.20);
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
}

/* Divider before clock — warm-tinted divider */
[data-theme="light"] .onb-hero-now { border-left-color: rgba(40, 25, 10, 0.12); }
</style>
