<template>
  <div ref="rootRef" class="trend">
    <header class="trend-head">
      <div>
        <span class="trend-eyebrow"><BarChart3 :size="12" /> Last 6 months</span>
        <h3 class="trend-title">Spend trajectory</h3>
      </div>
      <div class="trend-legend">
        <span class="tl-item"><i class="tl-dot est" /> Estimated</span>
        <span class="tl-item"><i class="tl-dot set" /> Settled</span>
      </div>
    </header>

    <div class="trend-plot" @pointerleave="hover = -1">
      <div class="trend-bars">
        <div v-for="(m, i) in rows" :key="m.month" class="tb-col" :class="{ hot: hover === i }"
          @pointerenter="hover = i" @click="$emit('go', 'reports')">
          <span class="tb-track">
            <span class="tb-fill" :class="{ drawn }" :style="{ height: (drawn ? m.estPct : 0) + '%', transitionDelay: (0.1 + i * 0.07) + 's' }" />
          </span>
          <span class="tb-label">{{ m.label }}</span>
        </div>
      </div>

      <svg class="trend-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="tl-area" :class="{ drawn }" :d="areaPath" />
        <path class="tl-stroke" :d="linePath" pathLength="1" stroke-dasharray="1" :stroke-dashoffset="drawn ? 0 : 1" />
        <circle v-for="(p, i) in linePts" :key="'d' + i" class="tl-node" :class="{ drawn, hot: hover === i }"
          :cx="p[0]" :cy="p[1]" :r="hover === i ? 2.6 : 1.7" :style="{ transitionDelay: (0.6 + i * 0.05) + 's' }" />
      </svg>

      <!-- hover tooltip -->
      <Transition name="tt">
        <div v-if="hover > -1" class="trend-tip" :style="{ left: tipLeft + '%' }">
          <span class="tt-month">{{ rows[hover].label }}</span>
          <span class="tt-row est"><i /> Est <b class="trv-mono">{{ fmtCompactINR(rows[hover].estimated) }}</b></span>
          <span class="tt-row set"><i /> Settled <b class="trv-mono">{{ fmtCompactINR(rows[hover].settled) }}</b></span>
          <span class="tt-row cnt"><i /> Tours <b class="trv-mono">{{ rows[hover].count }}</b></span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import { fmtCompactINR } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ data: { type: Array, default: () => [] } })
defineEmits(['go'])

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const rootRef = ref(null)
const drawn = ref(false)
const hover = ref(-1)

const max = computed(() => Math.max(1, ...props.data.flatMap(m => [Number(m.estimated) || 0, Number(m.settled) || 0])))
const rows = computed(() => props.data.map(m => {
  const [y, mo] = String(m.month || '').split('-')
  return {
    month: m.month,
    label: MONTHS[(Number(mo) || 1) - 1] || m.month,
    estimated: Number(m.estimated) || 0,
    settled: Number(m.settled) || 0,
    count: Number(m.count) || 0,
    estPct: Math.round(((Number(m.estimated) || 0) / max.value) * 100),
  }
}))
const linePts = computed(() => {
  const n = rows.value.length
  if (!n) return []
  return rows.value.map((m, i) => [
    +((i + 0.5) / n * 100).toFixed(2),
    +(100 - (m.settled / max.value) * 96 - 2).toFixed(2),
  ])
})
const linePath = computed(() => linePts.value.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' '))
const areaPath = computed(() => linePts.value.length ? `${linePath.value} L 100,100 L 0,100 Z` : '')
const tipLeft = computed(() => {
  const n = rows.value.length || 1
  return Math.min(82, Math.max(6, (hover.value + 0.5) / n * 100 - 8))
})

onMounted(() => {
  if (prefersReduced()) { drawn.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))
})
</script>

<style scoped>
.trend { position: relative; padding: 18px 20px 16px; border-radius: 18px; background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.trend-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.trend-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-ember); }
.trend-title { font-size: 15px; font-weight: 800; color: var(--trv-text); margin: 5px 0 0; }
.trend-legend { display: flex; gap: 12px; }
.tl-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.tl-dot { width: 9px; height: 9px; border-radius: 3px; }
.tl-dot.est { background: linear-gradient(180deg, #fcd34d, #f59e0b); }
.tl-dot.set { background: var(--trv-st-approved); border-radius: 50%; }

.trend-plot { position: relative; height: 150px; }
.trend-bars { position: absolute; inset: 0 0 0 0; display: flex; align-items: stretch; gap: 7px; }
.tb-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; cursor: pointer; }
.tb-track { flex: 1; width: 100%; max-width: 34px; border-radius: 8px 8px 4px 4px; background: color-mix(in srgb, var(--trv-text) 5%, transparent); border: 1px solid var(--trv-border); display: flex; align-items: flex-end; overflow: hidden; transition: background 0.2s; }
.tb-col.hot .tb-track { background: color-mix(in srgb, var(--trv-amber) 10%, transparent); }
.tb-fill { width: 100%; border-radius: 7px 7px 0 0; height: 0; background: linear-gradient(180deg, #fcd34d, #f59e0b); box-shadow: 0 0 12px -2px color-mix(in srgb, var(--trv-amber) 55%, transparent);
  transition: height 0.9s cubic-bezier(0.16,1,0.3,1), filter 0.2s; }
.tb-col.hot .tb-fill { filter: brightness(1.15); }
.tb-label { font-size: 10px; font-weight: 650; color: var(--trv-text-muted); }

.trend-line { position: absolute; left: 0; right: 0; top: 0; bottom: 25px; width: 100%; height: calc(100% - 25px); overflow: visible; pointer-events: none; }
.tl-area { fill: color-mix(in srgb, var(--trv-st-approved) 12%, transparent); opacity: 0; transition: opacity 0.8s ease 0.4s; }
.tl-area.drawn { opacity: 1; }
.tl-stroke { fill: none; stroke: var(--trv-st-approved); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke;
  transition: stroke-dashoffset 1.3s cubic-bezier(0.16,1,0.3,1); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--trv-st-approved) 55%, transparent)); }
.tl-node { fill: var(--trv-st-completed); opacity: 0; transition: opacity 0.3s, r 0.2s; }
.tl-node.drawn { opacity: 1; }

.trend-tip { position: absolute; top: -6px; z-index: 4; display: flex; flex-direction: column; gap: 2px; min-width: 116px; padding: 9px 11px; border-radius: 11px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); pointer-events: none; }
.tt-month { font-size: 11px; font-weight: 800; color: var(--trv-text); margin-bottom: 2px; }
.tt-row { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--trv-text-muted); }
.tt-row b { margin-left: auto; color: var(--trv-text); }
.tt-row i { width: 7px; height: 7px; border-radius: 2px; }
.tt-row.est i { background: #f59e0b; }
.tt-row.set i { background: var(--trv-st-approved); border-radius: 50%; }
.tt-row.cnt i { background: var(--trv-steel); }
.tt-enter-active, .tt-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.tt-enter-from, .tt-leave-to { opacity: 0; transform: translateY(4px); }

@media (prefers-reduced-motion: reduce) { .tb-fill, .tl-area, .tl-stroke, .tl-node { transition: none; } }
</style>
