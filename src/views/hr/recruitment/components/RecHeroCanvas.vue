<template>
  <header class="rec-hero" :class="{ 'is-mounted': mounted, 'is-reduced': reducedMotion }">
    <!-- Layered ambient backdrop -->
    <div class="hero-glow" aria-hidden="true" />
    <div class="hero-orbs" aria-hidden="true">
      <span class="orb orb-a" />
      <span class="orb orb-b" />
      <span class="orb orb-c" />
    </div>
    <div class="hero-grid-bg" aria-hidden="true" />
    <div class="hero-scanline" aria-hidden="true" />

    <div class="hero-grid">
      <!-- Left: title block -->
      <div class="hero-text">
        <div class="hero-badge anim-fade-in" style="--d: 80ms">
          <span class="badge-dot rec-pulse-gold" />
          <span class="badge-text">Recruitment Suite</span>
          <span class="badge-sep">·</span>
          <span class="badge-phase">Mission Control</span>
        </div>

        <h1 class="hero-title anim-fade-in" style="--d: 200ms">
          <span class="rec-text-gradient">Talent Stream</span>
        </h1>

        <p class="hero-sub anim-fade-in" style="--d: 360ms">
          From requisition through approval, screening, interviews and offers —
          one cohesive surface for the entire hiring pipeline.
        </p>

        <div class="hero-stats">
          <button
            v-for="(m, i) in metrics"
            :key="m.key"
            class="stat-pill anim-fade-in"
            :style="{ '--d': `${520 + i * 70}ms`, '--c': m.color }"
            :title="m.label"
            type="button"
            @click="$emit('go', m.go)"
          >
            <span class="stat-icon" :style="{ color: m.color }">
              <component :is="m.icon" :size="13" />
            </span>
            <span class="stat-value">
              <span v-if="loading" class="rec-skel" style="display:inline-block;width:24px;height:14px" />
              <RecTicker v-else :value="m.value" />
            </span>
            <span class="stat-label">{{ m.label }}</span>
            <span class="pill-glow" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Right: animated orbit visualization -->
      <div class="hero-visual" aria-hidden="true">
        <div class="orbit-stage">
          <span class="orb-core">
            <span class="core-inner" />
            <span class="core-ring core-ring-a" />
            <span class="core-ring core-ring-b" />
            <span class="core-ring core-ring-c" />
          </span>
          <span class="orbit orbit-1">
            <span class="orbit-node" />
          </span>
          <span class="orbit orbit-2">
            <span class="orbit-node" />
          </span>
          <span class="orbit orbit-3">
            <span class="orbit-node" />
          </span>
        </div>
      </div>
    </div>

    <div class="hero-rule" />
  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import RecTicker from './RecTicker.vue'
import { prefersReducedMotion } from '../../../../composables/useTheatre'

defineProps({
  metrics: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
defineEmits(['go'])

const mounted = ref(false)
const reducedMotion = ref(false)

onMounted(() => {
  reducedMotion.value = prefersReducedMotion()
  mounted.value = true
})
</script>

<style scoped>
.rec-hero {
  position: relative;
  margin: 4px 4px 16px;
  padding: 30px 28px 26px;
  border-radius: 24px;
  border: 1px solid var(--hr-border);
  background:
    linear-gradient(180deg, rgba(18, 17, 22, 0.85) 0%, rgba(8, 8, 11, 0.95) 100%),
    var(--hr-surface);
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 30px 60px -30px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(251, 191, 36, 0.04) inset;
}

/* Border halo */
.rec-hero::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg,
    rgba(251, 191, 36, 0.35) 0%,
    rgba(251, 146, 60, 0.18) 35%,
    rgba(255, 255, 255, 0.04) 60%,
    rgba(251, 146, 60, 0.25) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  opacity: 0.55;
  z-index: 0;
}

/* Soft glow layer */
.hero-glow {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  background:
    radial-gradient(70% 50% at 14% 0%, rgba(251,191,36,0.18), transparent 70%),
    radial-gradient(60% 45% at 100% 100%, rgba(251,146,60,0.14), transparent 70%);
  filter: blur(2px);
  z-index: 0;
}

/* Floating orbs */
.hero-orbs {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.hero-orbs .orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.55;
  will-change: transform;
}
.orb-a {
  width: 200px; height: 200px;
  top: -60px; left: 10%;
  background: radial-gradient(circle, rgba(251,191,36,0.65), transparent 70%);
  animation: rec-orb-float-a 14s ease-in-out infinite;
}
.orb-b {
  width: 260px; height: 260px;
  bottom: -90px; right: 12%;
  background: radial-gradient(circle, rgba(251,146,60,0.5), transparent 70%);
  animation: rec-orb-float-b 18s ease-in-out infinite;
}
.orb-c {
  width: 160px; height: 160px;
  top: 30%; right: 30%;
  background: radial-gradient(circle, rgba(234,88,12,0.36), transparent 70%);
  animation: rec-orb-float-c 22s ease-in-out infinite;
}

/* Subtle grid lines behind content */
.hero-grid-bg {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 42px 42px;
  background-position: center;
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 0%, transparent 75%);
          mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 0%, transparent 75%);
  opacity: 0.5;
}

/* Animated scan line that sweeps down once on mount */
.hero-scanline {
  position: absolute;
  left: 0; right: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(251,191,36,0.0) 15%,
    rgba(251,191,36,0.85) 50%,
    rgba(251,191,36,0.0) 85%,
    transparent 100%);
  filter: blur(0.5px);
  pointer-events: none;
  z-index: 1;
  animation: rec-scanline 4.2s ease-in-out infinite;
  animation-delay: 1.2s;
}
.is-reduced .hero-scanline { display: none; }

/* Layout */
.hero-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 240px;
  gap: 28px;
  align-items: center;
}

.hero-text { display: flex; flex-direction: column; gap: 8px; }

/* Animated entrance — initial hidden, slide-in on mount */
.anim-fade-in {
  opacity: 0;
  transform: translateY(10px);
  animation: rec-hero-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--d, 0ms);
  will-change: opacity, transform;
}
.is-reduced .anim-fade-in {
  animation: none;
  opacity: 1;
  transform: none;
}
@keyframes rec-hero-in {
  0%   { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}

.hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  width: max-content;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(251, 191, 36, 0.04));
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--hr-accent-gold);
  backdrop-filter: blur(6px);
  box-shadow: 0 0 24px -6px rgba(251, 191, 36, 0.45);
}
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--hr-accent-gold);
  box-shadow: 0 0 8px 1px rgba(251, 191, 36, 0.85);
}
.badge-sep   { opacity: 0.45; }
.badge-phase { color: var(--hr-orange); }

.hero-title {
  margin: 8px 0 0;
  font-size: 46px;
  font-weight: 800;
  letter-spacing: -0.028em;
  line-height: 1.02;
  filter: drop-shadow(0 10px 36px rgba(251, 146, 60, 0.28));
}

.hero-sub {
  margin: 10px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--hr-text-secondary);
  max-width: 620px;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.stat-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 14px 7px 9px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: var(--hr-text);
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 240ms var(--hr-spring),
              transform 240ms var(--hr-spring),
              background 240ms var(--hr-spring),
              box-shadow 240ms var(--hr-spring);
}
.stat-pill .pill-glow {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: radial-gradient(120% 80% at 0% 50%, var(--c, #fbbf24) 0%, transparent 60%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 240ms var(--hr-spring);
  mix-blend-mode: overlay;
}
.stat-pill:hover {
  border-color: var(--hr-accent-gold-border);
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(255, 255, 255, 0.02));
  box-shadow: 0 8px 22px -10px rgba(251, 146, 60, 0.55);
}
.stat-pill:hover .pill-glow { opacity: 0.25; }
.stat-pill:active { transform: translateY(0); }

.stat-icon {
  display: inline-grid; place-items: center;
  width: 22px; height: 22px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
}
.stat-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.stat-label {
  font-size: 10.5px;
  color: var(--hr-text-muted);
  letter-spacing: 0.04em;
}

/* Right column orbit visual */
.hero-visual {
  position: relative;
  width: 240px;
  height: 220px;
  margin-left: auto;
  display: grid;
  place-items: center;
}
.orbit-stage {
  position: relative;
  width: 200px;
  height: 200px;
  display: grid;
  place-items: center;
}
.orb-core {
  position: relative;
  width: 56px; height: 56px;
  border-radius: 50%;
  display: grid; place-items: center;
}
.core-inner {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle, #fde68a 0%, #fb923c 60%, #ea580c 100%);
  box-shadow:
    0 0 24px 4px rgba(251, 146, 60, 0.65),
    0 0 0 1px rgba(251, 191, 36, 0.4);
  animation: rec-core-pulse 3s ease-in-out infinite;
}
.core-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(251, 191, 36, 0.35);
}
.core-ring-a { width: 56px; height: 56px; animation: rec-core-pulse-ring 3s ease-out infinite; }
.core-ring-b { width: 56px; height: 56px; animation: rec-core-pulse-ring 3s ease-out 1s infinite; }
.core-ring-c { width: 56px; height: 56px; animation: rec-core-pulse-ring 3s ease-out 2s infinite; }

.orbit {
  position: absolute;
  top: 50%; left: 50%;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.15);
  transform: translate(-50%, -50%);
}
.orbit-1 { width: 110px; height: 110px; animation: rec-orbit-spin 10s linear infinite; }
.orbit-2 { width: 160px; height: 160px; animation: rec-orbit-spin 18s linear infinite reverse; }
.orbit-3 { width: 210px; height: 210px; animation: rec-orbit-spin 26s linear infinite; }
.orbit-node {
  position: absolute;
  top: -4px; left: 50%;
  width: 8px; height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: var(--hr-accent-gold);
  box-shadow: 0 0 12px 2px rgba(251, 191, 36, 0.7);
}
.orbit-2 .orbit-node { background: var(--hr-orange); box-shadow: 0 0 12px 2px rgba(251, 146, 60, 0.7); }
.orbit-3 .orbit-node { background: #ea580c; box-shadow: 0 0 12px 2px rgba(234, 88, 12, 0.7); }

.is-reduced .orbit { animation: none; }
.is-reduced .core-ring,
.is-reduced .core-inner { animation: none; }
.is-reduced .orb-a,
.is-reduced .orb-b,
.is-reduced .orb-c { animation: none; }

.hero-rule {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(251,191,36,0.4) 30%,
    rgba(251,146,60,0.55) 50%,
    rgba(251,191,36,0.4) 70%,
    transparent 100%);
  z-index: 1;
}

@keyframes rec-orb-float-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(20px, 30px) scale(1.12); }
}
@keyframes rec-orb-float-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-26px, -18px) scale(1.08); }
}
@keyframes rec-orb-float-c {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
  50%      { transform: translate(14px, -22px) scale(0.92); opacity: 0.7; }
}
@keyframes rec-scanline {
  0%, 100% { transform: translateY(0); opacity: 0; }
  10%      { opacity: 1; }
  50%      { transform: translateY(180px); opacity: 0.8; }
  90%      { opacity: 0; }
}
@keyframes rec-core-pulse {
  0%, 100% { transform: scale(1);   filter: brightness(1); }
  50%      { transform: scale(1.1); filter: brightness(1.25); }
}
@keyframes rec-core-pulse-ring {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0;   }
}

@media (max-width: 1100px) {
  .hero-grid { grid-template-columns: 1fr; gap: 12px; }
  .hero-visual { display: none; }
}
@media (max-width: 640px) {
  .rec-hero { padding: 24px 18px; }
  .hero-title { font-size: 30px; }
}
</style>
