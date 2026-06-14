<template>
  <div class="mtl" :class="{ compact }">
    <div class="mtl-track">
      <span class="mtl-grid" aria-hidden="true" />
      <span v-for="t in 3" :key="'t'+t" class="mtl-tick" :style="{ left: (t * 25) + '%' }" aria-hidden="true" />

      <span v-for="(b, i) in bands" :key="'b'+i" class="mtl-band"
        :style="{ left: b.left + '%', width: b.width + '%', '--band': color }">
        <span class="mtl-band-fill" :style="{ animationDelay: (0.12 + i * 0.08) + 's' }" />
        <span class="mtl-band-glow" />
      </span>

      <span v-if="showNow" class="mtl-now" :style="{ left: nowPct + '%' }" aria-hidden="true">
        <span class="mtl-now-dot" />
      </span>
    </div>

    <div v-if="showLabels" class="mtl-labels">
      <span class="mtl-time">{{ startLabel }}</span>
      <span class="mtl-dur">{{ durLabel }}</span>
      <span class="mtl-time">{{ endLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { shortTime } from '@/composables/useShifts'

const props = defineProps({
  start: { type: String, default: '' },     // 'HH:MM'
  end: { type: String, default: '' },        // 'HH:MM'
  color: { type: String, default: 'var(--shift-amber)' },
  showNow: { type: Boolean, default: false },
  showLabels: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
})

const toMin = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const pct = (min) => (min / 1440) * 100

// Wrap-aware bands: an overnight shift (end <= start) renders two segments.
const bands = computed(() => {
  const s = toMin(props.start)
  const e = toMin(props.end)
  if (!props.start || !props.end) return []
  if (e > s) return [{ left: pct(s), width: pct(e - s) }]
  // overnight wrap
  return [
    { left: pct(s), width: pct(1440 - s) },
    { left: 0, width: pct(e) },
  ]
})

const durMin = computed(() => {
  const s = toMin(props.start), e = toMin(props.end)
  let d = e - s
  if (d <= 0) d += 1440
  return d
})
const durLabel = computed(() => {
  const h = Math.floor(durMin.value / 60), m = durMin.value % 60
  return m ? `${h}h ${m}m` : `${h}h`
})
const startLabel = computed(() => shortTime(props.start))
const endLabel = computed(() => shortTime(props.end))

// Live "now" marker
const nowPct = ref(0)
let timer = null
const computeNow = () => {
  const d = new Date()
  nowPct.value = pct(d.getHours() * 60 + d.getMinutes())
}
onMounted(() => {
  if (!props.showNow) return
  computeNow()
  timer = setInterval(computeNow, 30000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.mtl { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.mtl-track {
  position: relative; height: 14px; border-radius: 8px; overflow: hidden;
  background: var(--shift-surface-2);
  border: 1px solid var(--shift-border-soft);
}
.mtl.compact .mtl-track { height: 9px; border-radius: 6px; }
.mtl-grid {
  position: absolute; inset: 0; pointer-events: none;
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent calc(100% / 24 - 1px), var(--shift-grid-line) calc(100% / 24 - 1px), var(--shift-grid-line) calc(100% / 24));
  opacity: 0.6;
}
.mtl-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--shift-grid-line); opacity: 0.9; }

.mtl-band { position: absolute; top: 2px; bottom: 2px; border-radius: 5px; overflow: hidden; }
.mtl.compact .mtl-band { top: 1px; bottom: 1px; border-radius: 4px; }
.mtl-band-fill {
  position: absolute; inset: 0; transform-origin: left center;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--band) 92%, transparent),
    color-mix(in srgb, var(--band) 55%, transparent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--band) 60%, transparent);
  animation: mtl-grow 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes mtl-grow { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
.mtl-band-glow {
  position: absolute; inset: -40% -2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--band) 70%, transparent), transparent);
  mix-blend-mode: screen; opacity: 0.5;
  animation: mtl-sheen 3.2s linear infinite;
}
@keyframes mtl-sheen { 0% { transform: translateX(-120%); } 60%, 100% { transform: translateX(220%); } }

.mtl-now { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--shift-text); border-radius: 2px; box-shadow: 0 0 6px rgba(0,0,0,0.4); }
.mtl-now-dot {
  position: absolute; top: -3px; left: 50%; width: 6px; height: 6px; border-radius: 50%; transform: translateX(-50%);
  background: var(--shift-ok); box-shadow: 0 0 0 0 var(--shift-ok);
  animation: shift-ring-pulse 2.2s ease-in-out infinite;
}

.mtl-labels { display: flex; align-items: center; justify-content: space-between; }
.mtl-time { font-family: var(--shift-mono); font-size: 10px; color: var(--shift-text-muted); }
.mtl-dur { font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-dim); letter-spacing: 0.04em; }

@media (prefers-reduced-motion: reduce) {
  .mtl-band-fill { animation: none; }
  .mtl-band-glow { animation: none; opacity: 0.3; }
}
</style>
