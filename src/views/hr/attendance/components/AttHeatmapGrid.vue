<template>
  <div class="att-heat" :class="{ 'is-flipped': isFlipped }">
    <header class="att-heat-head">
      <div class="att-heat-title">
        <span class="att-eyebrow"><span class="att-eyebrow-dot" />Floor pulse</span>
        <h4>Weekly heatmap</h4>
      </div>
      <div class="att-heat-legend">
        <span class="att-heat-legend-label">cool</span>
        <span class="att-heat-ramp">
          <i v-for="r in 7" :key="r" :style="{ background: `var(--att-heat-${r-1})` }" />
        </span>
        <span class="att-heat-legend-label">hot</span>
      </div>
    </header>

    <div class="att-heat-grid" :style="gridStyle">
      <!-- corner spacer -->
      <span class="att-heat-corner" />
      <!-- hour axis -->
      <span v-for="h in (isFlipped ? days : hours)" :key="`x-${h}`" class="att-heat-axis-x">{{ isFlipped ? dayLabel(h) : hourLabel(h) }}</span>
      <!-- rows -->
      <template v-for="row in (isFlipped ? hours : days)" :key="`row-${row}`">
        <span class="att-heat-axis-y">{{ isFlipped ? hourLabel(row) : dayLabel(row) }}</span>
        <Motion
          v-for="(col, ci) in (isFlipped ? days : hours)"
          :key="`c-${row}-${col}`"
          as="button"
          type="button"
          class="att-heat-cell"
          :style="{ background: cellBg(row, col) }"
          :data-density="cellDensity(row, col)"
          :initial="{ opacity: 0, scale: 0.5 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.32, delay: 0.4 + (row * 0.025) + (ci * 0.006), ease: [0.22, 1, 0.36, 1] }"
          :whileHover="reduced ? {} : { scale: 1.18, zIndex: 5 }"
          :title="cellTitle(row, col)"
          @click="$emit('cell-click', { day: isFlipped ? col : row, hour: isFlipped ? row : col })"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'

const props = defineProps({
  cells: { type: Array, default: () => [] },  // [{ day, hour, density }]
  reduced: { type: Boolean, default: false },
})
defineEmits(['cell-click'])

// Flip the orientation on narrow viewports
const isFlipped = ref(false)
let resizeObs = null
const measure = () => { isFlipped.value = window.innerWidth < 960 }
onMounted(() => {
  measure()
  window.addEventListener('resize', measure, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))

const days = [0, 1, 2, 3, 4, 5, 6]
const hours = Array.from({ length: 24 }, (_, i) => i)

const map = computed(() => {
  const m = new Map()
  for (const c of props.cells || []) {
    m.set(`${c.day}-${c.hour}`, c)
  }
  return m
})

const cellDensity = (day, hour) => {
  const k = isFlipped.value ? `${hour}-${day}` : `${day}-${hour}`
  const c = map.value.get(k)
  return c ? Math.min(1, Math.max(0, c.density || 0)) : 0
}

const cellBg = (row, col) => {
  const day  = isFlipped.value ? col : row
  const hour = isFlipped.value ? row : col
  const c = map.value.get(`${day}-${hour}`)
  if (!c || !c.density) return 'var(--att-heat-0)'
  const idx = Math.min(6, Math.max(0, Math.round((c.density || 0) * 6)))
  return `var(--att-heat-${idx})`
}

const cellTitle = (row, col) => {
  const day  = isFlipped.value ? col : row
  const hour = isFlipped.value ? row : col
  const c = map.value.get(`${day}-${hour}`)
  const present = c?.present || 0
  return `${dayLabel(day)} · ${hourLabel(hour)} — ${present} present`
}

const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const dayLabel = (d) => dayLabels[d] || ''
const hourLabel = (h) => String(h).padStart(2, '0')

const gridStyle = computed(() => {
  if (isFlipped.value) {
    return { gridTemplateColumns: `auto repeat(7, 18px)` }
  }
  return { gridTemplateColumns: `auto repeat(24, 16px)` }
})
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-heat {
  position: relative;
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 18px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  border-radius: 18px;
  backdrop-filter: var(--att-glass-blur);
  -webkit-backdrop-filter: var(--att-glass-blur);
  box-shadow: var(--att-glass-shadow);
}
.att-heat-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.att-heat-title h4 { margin: 4px 0 0; font-size: 14px; font-weight: 700; color: var(--hr-text); letter-spacing: -0.01em; }
.att-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--att-teal-100);
}
.att-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-orange-200);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}

.att-heat-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--hr-text-muted); }
.att-heat-legend-label { letter-spacing: 0.6px; text-transform: uppercase; }
.att-heat-ramp { display: inline-flex; gap: 2px; }
.att-heat-ramp i {
  display: inline-block; width: 14px; height: 6px; border-radius: 2px;
}

.att-heat-grid {
  display: grid;
  gap: 2px;
  align-items: center;
}
.att-heat-corner { display: block; }
.att-heat-axis-x, .att-heat-axis-y {
  font-size: 8.5px; letter-spacing: 0.4px;
  color: var(--hr-text-muted);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.att-heat-axis-y { text-align: right; padding-right: 6px; font-weight: 700; }

.att-heat-cell {
  width: 16px; height: 16px;
  padding: 0; border: 0;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  background: var(--att-heat-0);
  box-shadow: inset 0 0 0 1px var(--att-heat-stroke);
  transition: transform .18s var(--att-spring), box-shadow .18s var(--att-spring);
}
.att-heat-cell[data-density="0"] { opacity: 0.4; }
.att-heat-cell:hover {
  box-shadow: 0 0 0 2px var(--att-teal-100), 0 8px 20px -8px rgba(20, 184, 166, 0.55);
}

.att-heat.is-flipped .att-heat-cell { width: 18px; height: 16px; }

/* Light theme */
[data-theme="light"] .att-eyebrow { color: var(--att-teal-400); }
[data-theme="light"] .att-heat-cell:hover {
  box-shadow: 0 0 0 2px var(--att-teal-400), 0 8px 20px -8px rgba(13, 148, 136, 0.45);
}
</style>
