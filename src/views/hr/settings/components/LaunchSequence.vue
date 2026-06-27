<template>
  <div ref="rootEl" class="ls" :class="{ ready }">
    <span class="ls-grain" aria-hidden="true" />
    <span class="ls-aura" aria-hidden="true" />

    <!-- starfield (data-independent → never empty) -->
    <div class="ls-stars" aria-hidden="true">
      <span v-for="s in stars" :key="s.id" class="ls-star"
        :style="{ left: s.x + '%', top: s.y + '%', '--d': s.dur + 's', '--dl': s.delay + 's', '--sz': s.sz + 'px' }" />
    </div>

    <div class="ls-stage">
      <!-- trajectory -->
      <svg class="ls-arc" viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient :id="`lsArc-${uid}`" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="var(--set-ember)" />
            <stop offset="55%" stop-color="var(--set-gold)" />
            <stop offset="100%" stop-color="var(--set-ok)" />
          </linearGradient>
        </defs>
        <path :d="arcD" class="ls-arc-base" fill="none" />
        <path :d="arcD" class="ls-arc-flow" fill="none" :stroke="`url(#lsArc-${uid})`" />
      </svg>

      <!-- launch pad -->
      <span class="ls-pad" :style="nodeStyle(0)" aria-hidden="true" />
      <!-- orbit / liftoff -->
      <span class="ls-orbit" :class="{ hot: activeCount > 0 }" :style="nodeStyle(6)" aria-hidden="true">
        <span class="ls-orbit-ring r1" /><span class="ls-orbit-ring r2" />
      </span>

      <!-- stage gantries -->
      <div v-for="(n, i) in nodes" :key="n.key" class="ls-node" :class="{ lit: n.count > 0 }"
        :style="{ left: n.left + '%', top: n.top + '%', '--c': n.color, '--i': i }">
        <span v-if="n.count > 0" class="ls-node-pulse" />
        <svg class="ls-node-ring" viewBox="0 0 46 46">
          <circle class="trk" cx="23" cy="23" r="20" />
          <circle class="fil" cx="23" cy="23" r="20" :style="{ strokeDashoffset: ready ? n.dash : RING_C }" />
        </svg>
        <span class="ls-node-ic"><component :is="n.icon" :size="15" /></span>
        <span v-if="n.count > 0" class="ls-node-badge">{{ n.count }}</span>
        <span class="ls-node-lab">{{ n.label }}</span>
      </div>

      <!-- rocket riding the arc -->
      <div class="ls-rocket" :style="{ left: rocket.left + '%', top: rocket.top + '%', transform: `translate(-50%,-50%) rotate(${rocket.angle}deg)` }">
        <span class="ls-rocket-bob">
          <span class="ls-exhaust" aria-hidden="true" />
          <Rocket :size="20" class="ls-rocket-ic" />
        </span>
      </div>

      <!-- telemetry sweep -->
      <span class="ls-scan" aria-hidden="true" />
    </div>

    <!-- HUD -->
    <div class="ls-hud">
      <span class="ls-hud-live"><i /> Joining pipeline</span>
      <div class="ls-hud-grid">
        <div class="ls-hud-cell"><b><SetCountUp :value="inJourney" /></b><span>In journey</span></div>
        <div class="ls-hud-cell"><b class="ok"><SetCountUp :value="activeCount" /></b><span>Reached active</span></div>
        <div class="ls-hud-cell"><b><SetCountUp :value="cohortPct" :decimals="0" suffix="%" /></b><span>Cohort progress</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Rocket } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { usePointerSpotlight, prefersReduced, seededWave } from '@/composables/useShiftMotion'
import { toneColor } from '../composables/onboardingVocab'

const props = defineProps({
  // [{ key, label, tone, icon, count }] in journey order (7 stages)
  stages: { type: Array, default: () => [] },
})

const rootEl = ref(null)
const uid = Math.round(seededWave(13, 1)[0] * 1e6).toString(36)
usePointerSpotlight(rootEl)
const ready = ref(false)
onMounted(() => { requestAnimationFrame(() => { ready.value = true }) })

// quadratic bezier control points in the 1000×440 viewBox
const P0 = [80, 370], P1 = [520, 22], P2 = [945, 206]
const bez = (t) => {
  const u = 1 - t
  return [
    u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0],
    u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1],
  ]
}
const tangentAngle = (t) => {
  const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0])
  const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1])
  return Math.atan2(dy, dx) * 180 / Math.PI + 90 // icon nose points up by default
}
const arcD = `M ${P0[0]} ${P0[1]} Q ${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`
const RING_C = 2 * Math.PI * 20

const nodeStyle = (i) => {
  const [x, y] = bez(i / 6)
  return { left: (x / 1000 * 100) + '%', top: (y / 440 * 100) + '%' }
}

const nodes = computed(() => {
  const max = Math.max(1, ...props.stages.map(s => s.count || 0))
  return props.stages.map((s, i) => {
    const [x, y] = bez(i / 6)
    const fill = (s.count || 0) / max
    return {
      ...s,
      color: toneColor(s.tone),
      left: x / 1000 * 100,
      top: y / 440 * 100,
      dash: RING_C * (1 - fill),
    }
  })
})

const counts = computed(() => props.stages.map(s => s.count || 0))
const inJourney = computed(() => counts.value.slice(0, 6).reduce((a, b) => a + b, 0))
const activeCount = computed(() => props.stages.find(s => s.key === 'ACTIVE')?.count || 0)
const total = computed(() => counts.value.reduce((a, b) => a + b, 0))
// cohort centre-of-mass along the 7 stages → rocket position & progress %
const com = computed(() => {
  if (!total.value) return 0
  const weighted = counts.value.reduce((acc, c, i) => acc + c * i, 0)
  return weighted / (6 * total.value) // 0..1
})
const cohortPct = computed(() => Math.round(com.value * 100))

const rocket = computed(() => {
  const t = Math.max(0.02, com.value)
  const [x, y] = bez(t)
  return { left: x / 1000 * 100, top: y / 440 * 100, angle: tangentAngle(t) }
})

const stars = computed(() => {
  if (prefersReduced()) return []
  const w = seededWave(53, 46)
  return Array.from({ length: 46 }, (_, i) => ({
    id: i,
    x: w[i] * 100,
    y: w[(i + 9) % 46] * 92,
    dur: 2.4 + w[(i + 3) % 46] * 3.4,
    delay: -w[(i + 5) % 46] * 5,
    sz: 1 + Math.round(w[(i + 7) % 46] * 2),
  }))
})
</script>

<style scoped>
.ls { position: relative; overflow: hidden; border-radius: 20px; padding: 18px;
  min-height: 420px; display: flex; flex-direction: column;
  background:
    radial-gradient(120% 90% at 86% 92%, color-mix(in srgb, var(--set-ok) 10%, transparent), transparent 60%),
    radial-gradient(90% 80% at 6% 8%, color-mix(in srgb, var(--set-ember) 12%, transparent), transparent 62%),
    var(--set-panel);
  border: 1px solid var(--set-border); --mx: 0.5; --my: 0.5; }
.ls-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(130% 120% at 50% 100%, #000 10%, transparent 72%);
  -webkit-mask-image: radial-gradient(130% 120% at 50% 100%, #000 10%, transparent 72%); }
.ls-aura { position: absolute; inset: auto -10% -40% 30%; height: 70%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle at 70% 100%, color-mix(in srgb, var(--set-ok) 20%, transparent), transparent 64%); filter: blur(34px);
  transform: translate(calc((var(--mx) - 0.5) * -18px), calc((var(--my) - 0.5) * -12px)); }

.ls-stars { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  transform: translate(calc((var(--mx) - 0.5) * 16px), calc((var(--my) - 0.5) * 10px)); }
.ls-star { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: var(--set-gold-bright);
  box-shadow: 0 0 6px color-mix(in srgb, var(--set-gold) 70%, transparent); opacity: 0.2;
  animation: ls-twinkle var(--d) ease-in-out infinite; animation-delay: var(--dl); }
@keyframes ls-twinkle { 0%, 100% { opacity: 0.12; transform: scale(0.7); } 50% { opacity: 0.9; transform: scale(1.1); } }

.ls-stage { position: relative; z-index: 2; width: 100%; aspect-ratio: 1000 / 440; margin: auto 0; }

.ls-arc { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;
  transform: translate(calc((var(--mx) - 0.5) * 8px), calc((var(--my) - 0.5) * 6px)); }
.ls-arc-base { stroke: var(--set-trace-idle); stroke-width: 6; stroke-linecap: round; }
.ls-arc-flow { stroke-width: 4; stroke-linecap: round; stroke-dasharray: 26 230;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--set-gold) 55%, transparent));
  animation: ls-arc-travel 4.5s linear infinite; }
@keyframes ls-arc-travel { to { stroke-dashoffset: -256; } }

.ls-pad { position: absolute; width: 56px; height: 56px; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-ember) 45%, transparent), transparent 70%); filter: blur(3px); }
.ls-orbit { position: absolute; width: 30px; height: 30px; transform: translate(-50%, -50%); border-radius: 50%; }
.ls-orbit-ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--set-ok) 45%, transparent); opacity: 0; }
.ls-orbit.hot .ls-orbit-ring.r1 { animation: ls-emit 3s ease-out infinite; }
.ls-orbit.hot .ls-orbit-ring.r2 { animation: ls-emit 3s ease-out infinite 1.5s; }
@keyframes ls-emit { 0% { opacity: 0.7; transform: scale(0.5); } 100% { opacity: 0; transform: scale(3.4); } }

/* gantry nodes */
.ls-node { position: absolute; width: 46px; height: 46px; transform: translate(-50%, -50%);
  opacity: 0; animation: ls-pop 0.5s var(--set-spring) forwards; animation-delay: calc(var(--i) * 0.08s + 0.1s); }
.ready .ls-node { }
@keyframes ls-pop { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.ls-node-pulse { position: absolute; inset: -3px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
  animation: ls-node-pulse 2.6s ease-out infinite; }
@keyframes ls-node-pulse { 0% { opacity: 0.6; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.7); } }
.ls-node-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.ls-node-ring .trk { fill: color-mix(in srgb, var(--set-canvas) 80%, transparent); stroke: var(--set-border-strong); stroke-width: 3; }
.ls-node-ring .fil { fill: none; stroke: var(--c); stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 125.66; transition: stroke-dashoffset 1s var(--set-spring) calc(var(--i) * 0.08s + 0.2s);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 60%, transparent)); }
.ls-node-ic { position: absolute; inset: 0; display: grid; place-items: center; color: var(--c); }
.ls-node.lit .ls-node-ic { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 60%, transparent)); }
.ls-node-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px;
  display: grid; place-items: center; font-size: 10px; font-weight: 850; color: #1a1206; background: var(--c);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 60%, transparent); font-variant-numeric: tabular-nums; }
.ls-node-lab { position: absolute; top: calc(100% + 5px); left: 50%; transform: translateX(-50%); white-space: nowrap;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--set-text-muted); text-transform: uppercase; }
.ls-node.lit .ls-node-lab { color: var(--set-text-secondary); }

/* rocket */
.ls-rocket { position: absolute; z-index: 4; transition: left 1.1s var(--set-spring), top 1.1s var(--set-spring), transform 1.1s var(--set-spring); }
.ls-rocket-bob { position: relative; display: grid; place-items: center; animation: ls-bob 3.4s ease-in-out infinite; }
@keyframes ls-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.ls-rocket-ic { color: var(--set-gold-bright); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--set-gold) 75%, transparent)); }
.ls-exhaust { position: absolute; top: 100%; left: 50%; width: 10px; height: 30px; transform: translateX(-50%);
  background: linear-gradient(180deg, color-mix(in srgb, var(--set-ember) 80%, transparent), transparent 85%);
  border-radius: 0 0 50% 50%; filter: blur(2px); animation: ls-flame 0.5s ease-in-out infinite alternate; transform-origin: top center; }
@keyframes ls-flame { from { transform: translateX(-50%) scaleY(0.7); opacity: 0.7; } to { transform: translateX(-50%) scaleY(1.15); opacity: 1; } }

.ls-scan { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold) 14%, transparent), transparent);
  width: 30%; animation: ls-scan 6s linear infinite; }
@keyframes ls-scan { 0% { transform: translateX(-120%); } 100% { transform: translateX(450%); } }

/* HUD */
.ls-hud { position: absolute; top: 16px; left: 16px; z-index: 5; padding: 11px 13px; border-radius: 14px; min-width: 192px;
  background: var(--set-surface-glass); border: 1px solid var(--set-border-strong);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 20px 44px -28px rgba(0,0,0,0.7); }
.ls-hud-live { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.ls-hud-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 9px var(--set-ok); animation: ls-blink 2.4s ease-in-out infinite; }
@keyframes ls-blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
.ls-hud-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.ls-hud-cell { display: flex; flex-direction: column; gap: 1px; }
.ls-hud-cell b { font-size: 17px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.ls-hud-cell b.ok { color: var(--set-ok); }
.ls-hud-cell span { font-size: 8.5px; font-weight: 600; color: var(--set-text-dim); text-transform: uppercase; letter-spacing: 0.04em; }

@media (max-width: 640px) { .ls-hud { position: static; margin-bottom: 12px; } }
@media (prefers-reduced-motion: reduce) {
  .ls-star, .ls-arc-flow, .ls-orbit-ring, .ls-node-pulse, .ls-rocket-bob, .ls-exhaust, .ls-scan, .ls-hud-live i { animation: none !important; }
  .ls-node { opacity: 1; animation: none; }
  .ls-rocket { transition: none; }
}
</style>
