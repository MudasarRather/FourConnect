<template>
  <div class="asg" :class="{ live: live && !reduced, empty: !cells.length }" :style="gridStyle" ref="rootEl">
    <span v-for="(s, i) in cells" :key="i" class="asg-cell" :data-state="s" :style="{ '--i': i }" />
    <span v-if="!cells.length" class="asg-idle">awaiting muster</span>
    <span v-if="cells.length && !reduced" class="asg-scan" aria-hidden="true" />
    <span class="asg-grid-lines" aria-hidden="true" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({}) }, // { found, mismatch, damaged, missing, pending }
  cell: { type: Number, default: 15 },   // cell min size px
  gap: { type: Number, default: 4 },
  max: { type: Number, default: 140 },    // cap rendered cells (scaled proportionally)
  live: { type: Boolean, default: false },
})

const reduced = prefersReduced()
const rootEl = ref(null)
const ORDER = ['found', 'mismatch', 'damaged', 'missing', 'pending']

const cells = computed(() => {
  const raw = ORDER.map(k => Math.max(0, Math.round(Number(props.counts?.[k] || 0))))
  let total = raw.reduce((a, b) => a + b, 0)
  if (!total) return []
  // scale down proportionally if over cap, preserving ≥1 for any nonzero bucket
  let targets = raw
  if (total > props.max) {
    const scale = props.max / total
    targets = raw.map(n => (n ? Math.max(1, Math.round(n * scale)) : 0))
  }
  const totalCells = targets.reduce((a, b) => a + b, 0)
  // dithered even-spread so each category scatters across the matrix (deterministic)
  const assigned = targets.map(() => 0)
  const out = []
  for (let s = 0; s < totalCells; s++) {
    let best = -1, bestScore = Infinity
    for (let i = 0; i < targets.length; i++) {
      if (!targets[i]) continue
      const score = assigned[i] / targets[i]
      if (score < bestScore) { bestScore = score; best = i }
    }
    out.push(ORDER[best]); assigned[best]++
  }
  return out
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(auto-fill, minmax(${props.cell}px, 1fr))`,
  gap: `${props.gap}px`,
}))
</script>

<style scoped>
.asg { position: relative; display: grid; align-content: start; min-height: 24px; overflow: hidden; border-radius: 12px; padding: 1px; }
.asg.empty { display: grid; place-items: center; min-height: 60px; }
.asg-idle { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }

.asg-cell {
  aspect-ratio: 1; border-radius: 3px; background: color-mix(in srgb, var(--cc) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--cc) 42%, transparent);
  box-shadow: inset 0 0 4px color-mix(in srgb, var(--cc) 30%, transparent);
  animation: asg-pop 0.42s var(--as-spring) both; animation-delay: calc(min(var(--i) * 9, 700) * 1ms);
}
.asg-cell[data-state="found"]    { --cc: var(--as-st-available); }
.asg-cell[data-state="mismatch"] { --cc: var(--as-st-reserved); }
.asg-cell[data-state="damaged"]  { --cc: var(--as-al-damaged); }
.asg-cell[data-state="missing"]  { --cc: var(--as-al-lost); }
.asg-cell[data-state="pending"]  { --cc: var(--as-steel-dim); background: color-mix(in srgb, var(--cc) 12%, transparent); border-color: color-mix(in srgb, var(--cc) 26%, transparent); box-shadow: none; }
.asg.live .asg-cell[data-state="pending"] { animation: asg-pop 0.42s var(--as-spring) both, asg-breathe 2.6s ease-in-out infinite; animation-delay: calc(min(var(--i) * 9, 700) * 1ms), calc(min(var(--i) * 9, 700) * 1ms); }

/* sweeping scanline */
.asg-scan { position: absolute; top: 0; bottom: 0; left: 0; width: 26%; pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 22%, transparent) 55%, color-mix(in srgb, var(--as-amber) 6%, transparent) 70%, transparent);
  mix-blend-mode: screen; transform: translateX(-120%); }
.asg.live .asg-scan { animation: asg-sweep 3.4s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
[data-theme="light"] .asg-scan { mix-blend-mode: multiply; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 18%, transparent) 55%, transparent); }

.asg-grid-lines { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 17px 17px; mask-image: radial-gradient(120% 100% at 50% 50%, #000, transparent 92%); -webkit-mask-image: radial-gradient(120% 100% at 50% 50%, #000, transparent 92%); }

@keyframes asg-pop { 0% { opacity: 0; transform: scale(0.2); } 60% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes asg-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes asg-sweep { 0% { transform: translateX(-120%); } 55% { transform: translateX(420%); } 100% { transform: translateX(420%); } }

@media (prefers-reduced-motion: reduce) { .asg-cell { animation: none !important; } .asg-scan { display: none; } }
</style>
