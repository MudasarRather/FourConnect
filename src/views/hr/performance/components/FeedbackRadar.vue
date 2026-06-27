<template>
  <div class="fr">
    <svg class="fr-svg" :viewBox="`0 0 ${SIZE} ${SIZE}`" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <!-- rings -->
      <polygon v-for="ring in rings" :key="ring" :points="ringPoints(ring)" class="fr-ring" />
      <!-- axes -->
      <line v-for="(a, i) in axes" :key="'a' + i" :x1="C" :y1="C" :x2="a.ax" :y2="a.ay" class="fr-axis" />
      <!-- value polygon -->
      <polygon :points="valuePoints" class="fr-poly" :style="{ opacity: ready ? 1 : 0, transform: ready ? 'scale(1)' : 'scale(0.2)' }" />
      <!-- value dots -->
      <circle v-for="(p, i) in valueDots" :key="'d' + i" :cx="p.x" :cy="p.y" r="3.5" class="fr-dot" :style="{ opacity: ready ? 1 : 0 }" />
    </svg>
    <!-- labels -->
    <div class="fr-labels">
      <span v-for="(a, i) in axes" :key="'l' + i" class="fr-lab" :style="labelStyle(a)">
        <b>{{ a.label }}</b><i>{{ a.avg != null ? a.avg.toFixed(1) : '—' }}</i>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  competencies: { type: Array, default: () => [] },   // [{key,label,avg,count}]
  max: { type: Number, default: 5 },
})

const SIZE = 240
const C = SIZE / 2
const R = 86
const rings = [0.33, 0.66, 1]
const ready = ref(false)

const axes = computed(() => {
  const list = props.competencies.slice(0, 8)
  const n = Math.max(1, list.length)
  return list.map((c, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2
    const frac = Math.max(0, Math.min(1, (Number(c.avg) || 0) / (props.max || 5)))
    return {
      label: c.label || c.key, avg: c.avg != null ? Number(c.avg) : null,
      cos: Math.cos(ang), sin: Math.sin(ang), frac,
      ax: C + Math.cos(ang) * R, ay: C + Math.sin(ang) * R,
    }
  })
})

const ringPoints = (scale) => axes.value.map(a => `${C + a.cos * R * scale},${C + a.sin * R * scale}`).join(' ')
const valuePoints = computed(() => axes.value.map(a => `${C + a.cos * R * a.frac},${C + a.sin * R * a.frac}`).join(' '))
const valueDots = computed(() => axes.value.map(a => ({ x: C + a.cos * R * a.frac, y: C + a.sin * R * a.frac })))

const labelStyle = (a) => {
  const x = 50 + (a.cos * (R + 16)) / SIZE * 100
  const y = 50 + (a.sin * (R + 16)) / SIZE * 100
  return { left: x + '%', top: y + '%', transform: `translate(-50%, -50%)`, textAlign: a.cos > 0.3 ? 'left' : a.cos < -0.3 ? 'right' : 'center' }
}

onMounted(() => requestAnimationFrame(() => { ready.value = true }))
</script>

<style scoped>
.fr { position: relative; width: 100%; max-width: 320px; margin: 0 auto; aspect-ratio: 1; }
.fr-svg { display: block; width: 100%; height: 100%; overflow: visible; }
.fr-ring { fill: none; stroke: var(--perf-border); stroke-width: 1; opacity: 0.55; }
.fr-axis { stroke: var(--perf-border); stroke-width: 1; opacity: 0.5; }
.fr-poly { fill: color-mix(in srgb, var(--perf-gold) 22%, transparent); stroke: var(--perf-gold); stroke-width: 2; stroke-linejoin: round;
  transform-origin: center; transition: opacity 0.6s ease, transform 0.7s var(--perf-spring); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--perf-gold) 40%, transparent)); }
.fr-dot { fill: var(--perf-gold); transition: opacity 0.6s ease 0.2s; }
.fr-labels { position: absolute; inset: 0; pointer-events: none; }
.fr-lab { position: absolute; display: flex; flex-direction: column; gap: 1px; max-width: 84px; }
.fr-lab b { font-size: 9.5px; font-weight: 700; color: var(--perf-text-secondary); line-height: 1.2; }
.fr-lab i { font-size: 11px; font-style: normal; font-weight: 850; color: var(--perf-gold); font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) { .fr-poly, .fr-dot { transition: none; } }
</style>
