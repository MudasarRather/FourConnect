<template>
  <Motion as="section" class="rx as-card" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="rx-aura" aria-hidden="true" />

    <header class="rx-head">
      <span class="rx-eyebrow"><Radar :size="13" /> Fleet status reactor</span>
      <span class="rx-total as-mono"><AssetCountUp :value="total" :start="draw" /> units</span>
    </header>

    <div class="rx-body">
      <!-- the reactor -->
      <div class="rx-core-wrap" @pointerleave="hover = ''">
        <span v-if="!reduced" class="rx-ticks" aria-hidden="true" />
        <svg class="rx-svg" viewBox="0 0 100 100" role="img" aria-label="Status distribution">
          <g transform="rotate(-90 50 50)">
            <template v-for="(r, i) in rings" :key="r.key">
              <circle class="rx-track" :cx="50" :cy="50" :r="r.radius" :stroke-width="RING_W" pathLength="100" />
              <circle class="rx-arc" :class="{ dim: hover && hover !== r.key }" :style="{ '--c': r.color }"
                :cx="50" :cy="50" :r="r.radius" :stroke-width="RING_W" pathLength="100"
                :stroke-dasharray="draw ? `${r.share} 100` : '0 100'" :stroke-dashoffset="0"
                @pointerenter="hover = r.key" />
            </template>
          </g>
        </svg>
        <!-- center core -->
        <div class="rx-core">
          <Presence mode="wait">
            <Motion v-if="hover" :key="hover" as="div" class="rx-core-in"
              :initial="{ opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.8 }" :transition="{ duration: 0.2 }">
              <b class="rx-core-num" :style="{ color: hovered.color }"><AssetCountUp :value="hovered.value" /></b>
              <span class="rx-core-lab">{{ hovered.label }}</span>
              <span class="rx-core-sub as-mono">{{ hovered.share }}% of fleet</span>
            </Motion>
            <Motion v-else key="util" as="div" class="rx-core-in"
              :initial="{ opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.8 }" :transition="{ duration: 0.2 }">
              <b class="rx-core-num"><AssetCountUp :value="utilization" :start="draw" :duration="1.4" />%</b>
              <span class="rx-core-lab">In service</span>
              <span class="rx-core-sub as-mono">{{ stats.allocated || 0 }}/{{ total }} deployed</span>
            </Motion>
          </Presence>
        </div>
        <span class="rx-core-glow" aria-hidden="true" />
      </div>

      <!-- legend -->
      <div class="rx-legend">
        <Motion v-for="(r, i) in rings" :key="r.key" as="button" type="button" class="rx-leg" :class="{ hot: hover === r.key }"
          :style="{ '--c': r.color }"
          :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.15 + i * 0.06 }"
          :whileHover="reduced ? {} : { x: 3 }" :whileTap="{ scale: 0.98 }"
          @pointerenter="hover = r.key" @pointerleave="hover = ''" @click="$emit('pick', r.key)">
          <span class="rx-leg-dot" />
          <span class="rx-leg-lab">{{ r.label }}</span>
          <span class="rx-leg-val as-mono"><AssetCountUp :value="r.value" :start="draw" /></span>
          <span class="rx-leg-share as-mono">{{ r.share }}%</span>
          <span class="rx-leg-bar"><span class="rx-leg-fill" :style="{ width: draw ? r.share + '%' : '0%' }" /></span>
        </Motion>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Radar } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { statusMeta, ASSET_STATUSES } from '@/composables/useAssets'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: () => ({}) } })
defineEmits(['pick'])

const RING_W = 4
const STATUS_COLOR = {
  AVAILABLE: 'var(--as-st-available)', ALLOCATED: 'var(--as-st-allocated)', RESERVED: 'var(--as-st-reserved)',
  MAINTENANCE: 'var(--as-st-maintenance)', RETIRED: 'var(--as-st-retired)',
}
// outer → inner; kept in an outer band so the center stays clear for the readout
const RADII = [46, 41, 36, 31, 26]

const root = ref(null)
const reduced = prefersReduced()
const hover = ref('')
const { visible } = useInView(root, { threshold: 0.25 })
const draw = ref(false)
onMounted(() => { nextTick(() => requestAnimationFrame(() => { draw.value = true })) })

const total = computed(() => props.stats.total || ASSET_STATUSES.reduce((s, k) => s + (props.stats.by_status?.[k] || 0), 0) || 0)
const valueOf = (k) => props.stats[k.toLowerCase()] ?? (props.stats.by_status?.[k] || 0)
const rings = computed(() => ASSET_STATUSES.map((k, i) => {
  const v = valueOf(k)
  return {
    key: k, label: statusMeta(k).label, color: STATUS_COLOR[k] || 'var(--as-amber)',
    value: v, share: total.value ? Math.round((v / total.value) * 100) : 0, radius: RADII[i],
  }
}))
const utilization = computed(() => total.value ? Math.round(((props.stats.allocated || 0) / total.value) * 100) : 0)
const hovered = computed(() => rings.value.find(r => r.key === hover.value) || rings.value[0])
</script>

<style scoped>
.rx { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.rx-aura { position: absolute; inset: -40% -10% auto -10%; height: 70%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(12px); }
.rx > * { position: relative; z-index: 1; }

.rx-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rx-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); }
.rx-eyebrow :deep(svg) { color: var(--as-amber); }
.rx-total { font-size: 11px; color: var(--as-text-dim); }

.rx-body { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }

/* reactor */
.rx-core-wrap { position: relative; width: 200px; height: 200px; flex-shrink: 0; margin: 0 auto; }
.rx-ticks { position: absolute; inset: -4px; border-radius: 50%; pointer-events: none;
  background: repeating-conic-gradient(from 0deg, var(--as-border-strong) 0 0.5deg, transparent 0.5deg 9deg);
  -webkit-mask: radial-gradient(closest-side, transparent 93%, #000 94%); mask: radial-gradient(closest-side, transparent 93%, #000 94%);
  opacity: 0.5; animation: as-spin 90s linear infinite; }
.rx-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.rx-track { fill: none; stroke: var(--as-border-soft); opacity: 0.7; }
.rx-arc { fill: none; stroke: var(--c); stroke-linecap: round; transition: stroke-dasharray 1.3s var(--as-spring), opacity 0.25s ease, filter 0.25s ease;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 55%, transparent)); cursor: pointer; }
.rx-arc.dim { opacity: 0.28; filter: none; }

.rx-core { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; pointer-events: none; }
.rx-core-in { display: flex; flex-direction: column; align-items: center; gap: 1px; max-width: 96px; }
.rx-core-num { font-size: 30px; font-weight: 850; line-height: 1; color: var(--as-text); letter-spacing: -0.02em; }
.rx-core-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-muted); margin-top: 3px; }
.rx-core-sub { font-size: 9.5px; color: var(--as-text-dim); }
.rx-core-glow { position: absolute; left: 50%; top: 50%; width: 78px; height: 78px; transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--as-amber) 18%, transparent), transparent 70%); animation: rx-breathe 3.4s ease-in-out infinite; }

/* legend */
.rx-legend { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 7px; }
.rx-leg { position: relative; display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 9px; padding: 7px 10px 11px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, background 0.2s; }
.rx-leg:hover, .rx-leg.hot { border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 8%, transparent); }
.rx-leg-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px color-mix(in srgb, var(--c) 70%, transparent); }
.rx-leg-lab { font-size: 12.5px; font-weight: 600; color: var(--as-text-secondary); }
.rx-leg-val { font-size: 14px; font-weight: 800; color: var(--as-text); }
.rx-leg-share { font-size: 10.5px; color: var(--as-text-dim); min-width: 30px; text-align: right; }
.rx-leg-bar { position: absolute; left: 10px; right: 10px; bottom: 5px; height: 2px; border-radius: 2px; background: var(--as-border-soft); overflow: hidden; grid-column: 1 / -1; }
.rx-leg-fill { display: block; height: 100%; border-radius: 2px; background: var(--c); transition: width 1.1s var(--as-spring); box-shadow: 0 0 6px var(--c); }

@keyframes rx-breathe { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.12); } }
@media (prefers-reduced-motion: reduce) {
  .rx-ticks, .rx-core-glow { animation: none; }
  .rx-arc, .rx-leg-fill { transition: none; }
}
@media (max-width: 460px) { .rx-core-wrap { width: 168px; height: 168px; } }
</style>
