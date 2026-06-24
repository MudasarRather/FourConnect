<template>
  <Motion as="div" class="ee ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="ee-aura" aria-hidden="true" />
    <span class="ee-grain-dots" aria-hidden="true" />

    <!-- decorative gateway scene (kept in its own stacking layer — never overlaps the copy) -->
    <div class="ee-stage" aria-hidden="true">
      <!-- distant skyline of thresholds -->
      <svg class="ee-skyline" viewBox="0 0 260 60" preserveAspectRatio="xMidYMax meet">
        <path v-for="(a, i) in arches" :key="i" :d="a.d" :style="{ opacity: a.o }" />
      </svg>

      <!-- rising embers -->
      <span v-for="(e, i) in embers" :key="'e' + i" class="ee-ember"
        :style="{ left: e.x + '%', width: e.size + 'px', height: e.size + 'px', animationDuration: e.dur + 's', animationDelay: e.delay + 's' }" />

      <!-- portal: slow rays + pulsing rings + floating medallion -->
      <span class="ee-portal">
        <svg class="ee-rays" viewBox="0 0 120 120">
          <line v-for="(r, i) in rays" :key="'r' + i" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2" />
        </svg>
        <span class="ee-ring r1" />
        <span class="ee-ring r2" />
        <span class="ee-med"><component :is="icon || DoorOpen" :size="30" /></span>
      </span>
    </div>

    <div class="ee-copy">
      <h3 class="ee-title">{{ title }}</h3>
      <p v-if="subtitle" class="ee-sub">{{ subtitle }}</p>
      <div v-if="$slots.action" class="ee-action"><slot name="action" /></div>
    </div>

    <span class="ee-horizon" aria-hidden="true" />
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { DoorOpen } from 'lucide-vue-next'
import { prefersReduced } from '@/composables/useShiftMotion'

defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, default: 'Nothing here yet' },
  subtitle: { type: String, default: '' },
})
const reduced = prefersReduced()

// deterministic decorative geometry (no Math.random — stable across renders)
const arches = (() => {
  const out = []
  const xs = [24, 70, 118, 150, 198, 242]
  xs.forEach((x, i) => {
    const w = 14 + (i % 3) * 6
    const h = 22 + ((i * 13) % 22)
    const r = w / 2
    out.push({ d: `M ${x - r} 56 V ${56 - h + r} A ${r} ${r} 0 0 1 ${x + r} ${56 - h + r} V 56`, o: 0.12 + (i % 3) * 0.05 })
  })
  return out
})()
const embers = Array.from({ length: 10 }, (_, i) => {
  let s = (i * 9301 + 49297) % 233280
  const x = 8 + (s / 233280) * 84
  s = (s * 9301 + 49297) % 233280
  const dur = 4.5 + (s / 233280) * 4
  return { x, dur, delay: (i % 6) * 0.7, size: 2 + (i % 3) }
})
const rays = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  const inner = 36, outer = i % 2 ? 52 : 44
  return { x1: 60 + Math.cos(a) * inner, y1: 60 + Math.sin(a) * inner, x2: 60 + Math.cos(a) * outer, y2: 60 + Math.sin(a) * outer }
})
</script>

<style scoped>
.ee {
  position: relative; overflow: hidden; min-height: 340px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 40px 30px 44px;
  border-radius: 20px; background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
}
.ee-aura { position: absolute; inset: -30% 20% 30% 20%; pointer-events: none;
  background: radial-gradient(60% 70% at 50% 18%, rgba(251, 146, 60, 0.18), transparent 70%); animation: ex-aura-drift 11s ease-in-out infinite; }
.ee-grain-dots { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: inherit;
  background-image: radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px); background-size: 3px 3px; }

/* decorative scene */
.ee-stage { position: relative; width: 100%; max-width: 280px; height: 150px; display: grid; place-items: center; }
.ee-skyline { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 60px; }
.ee-skyline path { fill: none; stroke: var(--ex-violet); stroke-width: 1.3; }

.ee-ember { position: absolute; bottom: 6px; border-radius: 50%; background: var(--ex-amber-bright);
  box-shadow: 0 0 6px var(--ex-ember); opacity: 0; animation: ee-rise linear infinite; }

.ee-portal { position: relative; width: 120px; height: 120px; display: grid; place-items: center; }
.ee-rays { position: absolute; inset: 0; width: 100%; height: 100%; transform-box: fill-box; transform-origin: center; animation: ee-spin 60s linear infinite; }
.ee-rays line { stroke: rgba(252, 211, 77, 0.4); stroke-width: 1.4; stroke-linecap: round; }
.ee-ring { position: absolute; border-radius: 50%; border: 1px solid var(--ex-violet-border); }
.ee-ring.r1 { width: 78px; height: 78px; animation: ee-pulse 3.4s ease-out infinite; }
.ee-ring.r2 { width: 78px; height: 78px; animation: ee-pulse 3.4s ease-out infinite; animation-delay: 1.7s; }
.ee-med { position: relative; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border);
  box-shadow: var(--ex-violet-glow), inset 0 1px 0 rgba(255, 255, 255, 0.08); animation: ee-float 5s ease-in-out infinite; }

/* copy (separate stacking block — guaranteed clear of the scene) */
.ee-copy { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 420px; }
.ee-title { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 0; line-height: 1.2; }
.ee-sub { font-size: 12.5px; color: var(--ex-text-muted); margin: 0; line-height: 1.55; }
.ee-action { margin-top: 8px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

.ee-horizon { position: absolute; left: 12%; right: 12%; bottom: 0; height: 1px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--ex-amber-border), var(--ex-violet-border), var(--ex-amber-border), transparent); }

@keyframes ee-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translateY(-130px) scale(0.4); opacity: 0; } }
@keyframes ee-spin { to { transform: rotate(360deg); } }
@keyframes ee-pulse { 0% { transform: scale(0.62); opacity: 0.7; } 100% { transform: scale(1.25); opacity: 0; } }
@keyframes ee-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }

@media (prefers-reduced-motion: reduce) {
  .ee-aura, .ee-ember, .ee-rays, .ee-ring, .ee-med { animation: none !important; }
  .ee-ember { display: none; }
}
</style>
