<template>
  <div class="ml" :class="{ compact }">
    <div class="ml-track">
      <div v-for="(seg, i) in segments" :key="i" class="ml-seg" :style="segStyle(seg)" :title="`${seg.label}: ${seg.scoreRange} → ${seg.hikeRange}`">
        <span v-if="!compact && seg.widthPct > 9" class="ml-seg-hike">{{ seg.hikeLabel }}</span>
      </div>
    </div>
    <div v-if="!compact" class="ml-legend">
      <span v-for="(seg, i) in segments" :key="i" class="ml-leg" :style="{ '--c': seg.color }">
        <i class="ml-dot" />
        <b>{{ seg.label }}</b>
        <em>{{ seg.hikeRange }}</em>
        <LifeBuoy v-if="seg.auto_pip" :size="10" class="ml-pip" />
      </span>
    </div>
    <div v-else class="ml-axis"><span>Low</span><span>Score</span><span>High</span></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LifeBuoy } from 'lucide-vue-next'
import { bandTone } from '@/composables/usePerformance'

const props = defineProps({
  bands: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const fmtPct = (v) => {
  const n = Number(v || 0)
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}

const segments = computed(() => {
  const sorted = [...(props.bands || [])].sort((a, b) => (Number(a.frac_min) || 0) - (Number(b.frac_min) || 0))
  return sorted.map((b) => {
    const lo = Math.max(0, Math.min(1, Number(b.frac_min) || 0))
    const hi = Math.max(0, Math.min(1, Number(b.frac_max) > 1 ? 1 : Number(b.frac_max) || 0))
    const hMin = Number(b.hike_min_pct) || 0
    const hMax = Number(b.hike_max_pct) || 0
    return {
      label: b.label || b.key || 'Band',
      color: bandTone(b.key),
      leftPct: lo * 100,
      widthPct: Math.max(0, (hi - lo) * 100),
      scoreRange: `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`,
      hikeRange: hMin === hMax ? `${fmtPct(hMin)}` : `${fmtPct(hMin)}–${fmtPct(hMax)}`,
      hikeLabel: hMax > 0 ? (hMin === hMax ? fmtPct(hMin) : `${hMin}–${hMax}%`) : '0%',
      auto_pip: !!b.auto_pip,
    }
  })
})

const segStyle = (seg) => ({
  left: `${seg.leftPct}%`,
  width: `${seg.widthPct}%`,
  background: `linear-gradient(180deg, color-mix(in srgb, ${seg.color} 92%, transparent), color-mix(in srgb, ${seg.color} 70%, transparent))`,
})
</script>

<style scoped>
.ml { display: flex; flex-direction: column; gap: 10px; }
.ml-track { position: relative; height: 26px; border-radius: 8px; overflow: hidden; background: var(--set-trace-idle, rgba(255,255,255,0.07)); }
.ml.compact .ml-track { height: 14px; border-radius: 6px; }
.ml-seg { position: absolute; top: 0; bottom: 0; display: grid; place-items: center; border-right: 2px solid var(--set-canvas, #060607); transition: left 0.4s var(--set-spring, ease), width 0.4s var(--set-spring, ease); }
.ml-seg:last-child { border-right: none; }
.ml-seg-hike { font-size: 9.5px; font-weight: 800; color: #1a1206; font-variant-numeric: tabular-nums; letter-spacing: 0.2px; text-shadow: 0 1px 1px rgba(255,255,255,0.25); }
.ml-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; }
.ml-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--set-text-muted, #8d8d94); }
.ml-dot { width: 8px; height: 8px; border-radius: 3px; background: var(--c); flex-shrink: 0; }
.ml-leg b { font-weight: 700; color: var(--set-text-secondary, #c6c6cb); }
.ml-leg em { font-style: normal; font-weight: 800; color: var(--c); font-variant-numeric: tabular-nums; }
.ml-pip { color: var(--set-conflict, #f87171); }
.ml-axis { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim, #66666d); }
@media (prefers-reduced-motion: reduce) { .ml-seg { transition: none; } }
</style>
