<template>
  <div ref="root" class="frg">
    <svg viewBox="0 0 320 320" class="frg-svg" role="img" aria-label="Flight radar">
      <defs>
        <radialGradient id="frg-dome" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stop-color="rgba(251,191,36,0.16)" />
          <stop offset="55%" stop-color="rgba(251,146,60,0.05)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="frg-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#fb923c" />
        </linearGradient>
      </defs>

      <!-- globe -->
      <circle cx="160" cy="160" r="120" fill="url(#frg-dome)" stroke="var(--trv-border-strong)" stroke-width="1" />
      <ellipse cx="160" cy="160" rx="120" ry="44" fill="none" stroke="var(--trv-border)" stroke-width="0.8" />
      <ellipse cx="160" cy="160" rx="120" ry="84" fill="none" stroke="var(--trv-border)" stroke-width="0.8" />
      <ellipse cx="160" cy="160" rx="44" ry="120" fill="none" stroke="var(--trv-border)" stroke-width="0.8" />
      <ellipse cx="160" cy="160" rx="84" ry="120" fill="none" stroke="var(--trv-border)" stroke-width="0.8" />
      <line x1="40" y1="160" x2="280" y2="160" stroke="var(--trv-border)" stroke-width="0.8" />
      <line x1="160" y1="40" x2="160" y2="280" stroke="var(--trv-border)" stroke-width="0.8" />

      <!-- radar sweep -->
      <g class="frg-sweep" style="transform-origin:160px 160px">
        <path d="M160 160 L160 40 A120 120 0 0 1 268 108 Z" fill="url(#frg-dome)" opacity="0.5" />
      </g>

      <!-- great-circle arcs -->
      <path v-for="(a, i) in arcs" :key="'a' + i" :d="a.d" fill="none"
        stroke="url(#frg-arc)" :stroke-width="a.w"
        stroke-linecap="round" class="frg-route"
        :style="{ strokeDasharray: a.len, strokeDashoffset: a.len, animationDelay: (i * 0.35) + 's', '--trv-arc-len': a.len }" />

      <!-- nodes -->
      <g>
        <circle cx="160" cy="160" r="4" fill="#fcd34d" />
        <circle v-for="(n, i) in nodes" :key="'n' + i" :cx="n.x" :cy="n.y" :r="n.r"
          fill="#fb923c" class="frg-blip" :style="{ animationDelay: (i * 0.4) + 's' }" />
      </g>
    </svg>
    <div class="frg-readout trv-mono">
      <span class="frg-rd-val">{{ count }}</span>
      <span class="frg-rd-lab">live routes</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  routes: { type: Array, default: () => [] },  // [{route, count}]
  count: { type: Number, default: 0 },
})

// deterministic hash → angle, so arcs are stable per route string
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const polar = (ang, r) => [160 + Math.cos(ang) * r, 160 + Math.sin(ang) * r]

const built = computed(() => {
  const list = (props.routes && props.routes.length)
    ? props.routes.slice(0, 6)
    : Array.from({ length: 4 }, (_, i) => ({ route: 'R' + i, count: 1 }))
  const arcs = []; const nodes = []
  list.forEach((r, i) => {
    const h = hash(r.route || ('r' + i))
    const a1 = (h % 360) * Math.PI / 180
    const a2 = ((h >> 4) % 360) * Math.PI / 180
    const r1 = 50 + (h % 60), r2 = 50 + ((h >> 8) % 60)
    const [x1, y1] = polar(a1, r1)
    const [x2, y2] = polar(a2, r2)
    const mx = (x1 + x2) / 2 + ((h >> 3) % 40 - 20)
    const my = (y1 + y2) / 2 - 30 - ((h >> 5) % 30)
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
    const len = Math.round(Math.hypot(x2 - x1, y2 - y1) + 80)
    arcs.push({ d, len, w: 1.2 + Math.min(2, (r.count || 1) * 0.4) })
    nodes.push({ x: x1, y: y1, r: 2.6 }, { x: x2, y: y2, r: 2.6 })
  })
  return { arcs, nodes }
})
const arcs = computed(() => built.value.arcs)
const nodes = computed(() => built.value.nodes)
</script>

<style scoped>
.frg { position: relative; width: 100%; max-width: 340px; aspect-ratio: 1; margin: 0 auto; }
.frg-svg { width: 100%; height: 100%; display: block; }
.frg-sweep { animation: trv-radar-sweep 7s linear infinite; }
.frg-route { animation: trv-arc-fly 2.6s var(--trv-spring) forwards; }
.frg-blip { animation: trv-blip 2.4s ease-in-out infinite; }
.frg-readout {
  position: absolute; left: 50%; bottom: 8%; transform: translateX(-50%); text-align: center;
}
.frg-rd-val { display: block; font-size: 24px; font-weight: 800; color: var(--trv-amber-bright); }
.frg-rd-lab { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-text-dim); }
@media (prefers-reduced-motion: reduce) {
  .frg-sweep, .frg-blip { animation: none; }
  .frg-route { animation: none; stroke-dashoffset: 0 !important; }
}
</style>
