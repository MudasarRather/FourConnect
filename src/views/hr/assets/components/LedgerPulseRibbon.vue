<template>
  <div class="lpr" ref="root" :class="{ empty: !buckets.length }">
    <!-- header -->
    <div class="lpr-head">
      <span class="lpr-title"><AudioLines :size="13" /> Activity pulse</span>
      <span class="lpr-window as-mono">{{ windowLabel }}</span>
      <span v-if="maxCount" class="lpr-peak"><Signal :size="11" /> peak {{ maxCount }}/bin</span>
    </div>

    <!-- chart -->
    <div class="lpr-chart" @pointerleave="hover = -1">
      <span class="lpr-grid" aria-hidden="true" />
      <span class="lpr-baseline" aria-hidden="true" />

      <!-- skeleton -->
      <div v-if="loading" class="lpr-skel">
        <span v-for="n in 32" :key="n" class="lpr-skel-bar" :style="{ '--i': n, height: (12 + (n * 37 % 60)) + '%' }" />
      </div>

      <!-- bars -->
      <div v-else-if="buckets.length" class="lpr-bars" :key="nonce">
        <span v-for="b in buckets" :key="b.i" class="lpr-bar"
          :class="{ hot: hover === b.i, dim: hover !== -1 && hover !== b.i, void: !b.count }"
          :style="{ '--i': b.i, '--v': b.value, '--c': b.color }"
          @pointerenter="hover = b.i">
          <span class="lpr-bar-fill" />
          <span v-if="b.count" class="lpr-bar-cap" />
        </span>
      </div>

      <div v-else class="lpr-none"><Waves :size="15" /> Awaiting signal…</div>

      <!-- sweeping read-head -->
      <span v-if="!reduced && buckets.length" class="lpr-head-beam" aria-hidden="true">
        <span class="lpr-head-dot" />
      </span>

      <!-- hover tooltip -->
      <Transition name="lpr-tip">
        <div v-if="hovered" class="lpr-tip" :style="{ left: tipLeft }">
          <b class="as-mono">{{ hovered.count }}</b>
          <span>event{{ hovered.count === 1 ? '' : 's' }}</span>
          <i class="as-mono">{{ tipTime }}</i>
        </div>
      </Transition>
    </div>

    <!-- axis -->
    <div v-if="buckets.length" class="lpr-axis as-mono">
      <span>{{ axisLeft }}</span>
      <span class="lpr-axis-mid">{{ axisMid }}</span>
      <span class="lpr-axis-now"><span class="lpr-live" /> now</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { AudioLines, Signal, Waves } from 'lucide-vue-next'
import { prefersReduced } from '@/composables/useShiftMotion'
import { relTime } from './histEventMeta.js'

const props = defineProps({
  buckets: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 0 },
  minTime: { type: Number, default: 0 },
  maxTime: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const root = ref(null)
const reduced = prefersReduced()
const hover = ref(-1)
const nonce = ref(0)
watch(() => props.buckets, () => { nonce.value++; hover.value = -1 })

const n = computed(() => props.buckets.length || 1)
const hovered = computed(() => props.buckets.find(b => b.i === hover.value) || null)
const tipLeft = computed(() => `${((hover.value + 0.5) / n.value) * 100}%`)
const tipTime = computed(() => hovered.value ? fmtClock(hovered.value.t) : '')

const windowLabel = computed(() => {
  if (!props.buckets.length) return '—'
  const days = (props.maxTime - props.minTime) / 86400000
  if (days < 1) return 'last 24h'
  if (days < 2) return 'last 2 days'
  return `last ${Math.ceil(days)} days`
})
const axisLeft = computed(() => props.minTime ? relTime(props.minTime) : '')
const axisMid = computed(() => props.minTime ? relTime(props.minTime + (props.maxTime - props.minTime) / 2) : '')

function fmtClock(t) {
  if (!t) return ''
  return new Date(t).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·')
}
</script>

<style scoped>
.lpr { position: relative; display: flex; flex-direction: column; gap: 10px; }

.lpr-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lpr-title { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.lpr-title :deep(svg) { color: var(--as-amber); }
.lpr-window { margin-left: auto; font-size: 10.5px; color: var(--as-text-dim); letter-spacing: 0.04em; }
.lpr-peak { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--as-amber); padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }

/* chart */
.lpr-chart { position: relative; height: 92px; border-radius: 13px; overflow: hidden; padding: 0 2px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-amber) 4%, transparent), transparent 70%), var(--as-surface);
  border: 1px solid var(--as-border-soft); }
.lpr-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background-image: repeating-linear-gradient(0deg, var(--as-border-soft) 0 1px, transparent 1px 23px); }
.lpr-baseline { position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--as-border-strong); }

.lpr-bars, .lpr-skel { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 2px; padding: 8px 4px 0; }
.lpr-bar { position: relative; flex: 1; min-width: 0; height: calc(8% + var(--v) * 92%); display: flex; align-items: flex-end; justify-content: center;
  transform-origin: bottom; transform: scaleY(0); animation: lpr-grow 0.6s var(--as-spring) forwards; animation-delay: calc(var(--i) * 0.016s);
  transition: opacity 0.2s ease, filter 0.2s ease; cursor: crosshair; }
.lpr-bar-fill { width: 100%; height: 100%; border-radius: 3px 3px 1px 1px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 26%, transparent));
  box-shadow: 0 0 9px -2px color-mix(in srgb, var(--c) 70%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent); }
.lpr-bar.void { height: 5%; }
.lpr-bar.void .lpr-bar-fill { background: var(--as-border-strong); box-shadow: none; opacity: 0.6; }
.lpr-bar-cap { position: absolute; top: -1px; width: 60%; height: 2px; border-radius: 2px; background: color-mix(in srgb, var(--c) 92%, #fff);
  box-shadow: 0 0 8px 1px var(--c); opacity: 0.95; }
.lpr-bar.dim { opacity: 0.38; filter: saturate(0.6); }
.lpr-bar.hot { filter: brightness(1.18); }
.lpr-bar.hot .lpr-bar-fill { box-shadow: 0 0 16px 0 color-mix(in srgb, var(--c) 85%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 30%, transparent); }

/* skeleton bars */
.lpr-skel-bar { flex: 1; border-radius: 3px; align-self: flex-end;
  background: linear-gradient(180deg, var(--as-surface-elevated), var(--as-surface)); animation: as-sheen 1.4s ease infinite; opacity: 0.5; }

.lpr-none { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: var(--as-text-dim); }
.lpr-none :deep(svg) { color: var(--as-amber); }

/* read-head sweep */
.lpr-head-beam { position: absolute; top: 0; bottom: 1px; width: 2px; pointer-events: none; z-index: 3; left: -2px;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--as-amber) 75%, transparent), transparent);
  box-shadow: 0 0 14px 2px color-mix(in srgb, var(--as-amber) 55%, transparent); animation: lpr-sweep 6.5s linear infinite; }
.lpr-head-dot { position: absolute; top: -3px; left: 50%; width: 6px; height: 6px; border-radius: 50%; transform: translateX(-50%);
  background: var(--as-amber); box-shadow: 0 0 10px 2px var(--as-amber); }

/* tooltip */
.lpr-tip { position: absolute; bottom: calc(100% - 4px); transform: translateX(-50%); z-index: 5; pointer-events: none;
  display: inline-flex; align-items: baseline; gap: 5px; padding: 5px 9px; border-radius: 9px; white-space: nowrap;
  background: var(--as-glass-deep); border: 1px solid var(--as-border-strong); box-shadow: var(--as-card-shadow); backdrop-filter: blur(8px); }
.lpr-tip b { font-size: 13px; font-weight: 800; color: var(--as-amber); }
.lpr-tip span { font-size: 10.5px; color: var(--as-text-secondary); }
.lpr-tip i { font-style: normal; font-size: 10px; color: var(--as-text-dim); margin-left: 4px; }
.lpr-tip-enter-active, .lpr-tip-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.lpr-tip-enter-from, .lpr-tip-leave-to { opacity: 0; transform: translateX(-50%) translateY(4px); }

/* axis */
.lpr-axis { display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: var(--as-text-dim); letter-spacing: 0.05em; text-transform: uppercase; }
.lpr-axis-mid { opacity: 0.7; }
.lpr-axis-now { display: inline-flex; align-items: center; gap: 5px; color: var(--as-amber); }
.lpr-live { width: 6px; height: 6px; border-radius: 50%; background: var(--as-st-available); box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-st-available) 60%, transparent); animation: lpr-live 1.8s ease infinite; }

@keyframes lpr-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes lpr-sweep { 0% { left: -2px; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
@keyframes lpr-live { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-st-available) 55%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--as-st-available) 0%, transparent); } }

@media (prefers-reduced-motion: reduce) {
  .lpr-bar { animation: none; transform: none; }
  .lpr-head-beam, .lpr-skel-bar, .lpr-live { animation: none; }
}
</style>
