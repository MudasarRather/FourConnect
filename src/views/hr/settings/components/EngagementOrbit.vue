<template>
  <div ref="rootEl" class="eo" :class="{ reduced }">
    <span class="eo-grain" aria-hidden="true" />
    <span class="eo-aura" aria-hidden="true" />

    <!-- donut -->
    <div class="eo-dial">
      <svg class="eo-svg" viewBox="0 0 300 300" role="img" aria-label="Workforce composition by employment type">
        <defs>
          <radialGradient id="eoCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--set-deep)" stop-opacity="0.32" />
            <stop offset="70%" stop-color="var(--set-deep)" stop-opacity="0.05" />
            <stop offset="100%" stop-color="var(--set-deep)" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle class="eo-core-glow" cx="150" cy="150" r="92" fill="url(#eoCore)" />
        <circle class="eo-track" cx="150" cy="150" :r="R" />

        <!-- placeholder ring (no employees yet) -->
        <template v-if="empty">
          <circle v-for="(t, i) in types.slice(0, 8)" :key="'ph'+i" class="eo-ph"
            cx="150" cy="150" :r="R" :stroke-dasharray="`${phDash} ${C}`"
            :transform="`rotate(${(i / Math.max(1, Math.min(types.length, 8))) * 360 - 90} 150 150)`" />
        </template>

        <!-- proportional arcs -->
        <circle v-for="(s, i) in segments" :key="s.code" class="eo-arc"
          :class="{ dim: hovered && hovered !== s.code, lit: hovered === s.code, off: !s.active }"
          cx="150" cy="150" :r="R" :stroke="s.color"
          :style="{ strokeDasharray: grown ? `${s.dash} ${C}` : `0 ${C}`, transitionDelay: `${0.12 + i * 0.09}s` }"
          :transform="`rotate(${s.startDeg} 150 150)`"
          @mouseenter="hovered = s.code" @mouseleave="hovered = null"
          @click="emitSelect(s.code)" />

        <!-- rotating reticle -->
        <circle class="eo-reticle" cx="150" cy="150" :r="R + 22" />
      </svg>

      <!-- center readout -->
      <div class="eo-center">
        <Transition name="eo-swap" mode="out-in">
          <div v-if="focus" :key="focus.code" class="eo-center-in">
            <span class="eo-c-dot" :style="{ background: focus.color }" />
            <b class="eo-c-num">{{ focus.count }}</b>
            <span class="eo-c-lab">{{ focus.label }}</span>
            <span class="eo-c-sub">{{ focus.share }}% of workforce</span>
          </div>
          <div v-else key="total" class="eo-center-in">
            <b class="eo-c-num">{{ displayTotal }}</b>
            <span class="eo-c-lab">{{ empty ? 'none engaged yet' : 'engaged' }}</span>
            <span class="eo-c-sub">across {{ activeCount }} model{{ activeCount === 1 ? '' : 's' }}</span>
          </div>
        </Transition>
      </div>
    </div>

    <!-- legend / channels -->
    <div class="eo-legend">
      <header class="eo-legend-head"><PieChart :size="13" /> Composition</header>
      <button v-for="(s, i) in legend" :key="s.code" type="button" class="eo-row"
        :class="{ lit: hovered === s.code, dim: hovered && hovered !== s.code, off: !s.active }"
        :style="{ '--c': s.color, '--i': i }"
        @mouseenter="hovered = s.code" @mouseleave="hovered = null" @click="emitSelect(s.code)">
        <span class="eo-row-dot" />
        <div class="eo-row-id">
          <b>{{ s.label }}</b>
          <span class="eo-row-meta">
            <span class="set-mono">{{ s.code }}</span>
            <span v-if="s.system" class="eo-row-sys"><Lock :size="8" /> built-in</span>
            <span v-if="!s.active" class="eo-row-inactive">inactive</span>
          </span>
        </div>
        <div class="eo-row-val">
          <b>{{ s.count }}</b>
          <span>{{ s.share }}%</span>
        </div>
        <span class="eo-row-bar"><i :style="{ width: grown ? s.share + '%' : '0%', background: s.color, transitionDelay: `${0.15 + i * 0.06}s` }" /></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { PieChart, Lock } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  types: { type: Array, default: () => [] },        // [{ id, code, label, is_active, is_system }]
  usageByCode: { type: Object, default: () => ({}) }, // { CODE: count }
})
const emit = defineEmits(['select'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const reduced = prefersReduced()
const hovered = ref(null)
const grown = ref(false)

const R = 110
const C = 2 * Math.PI * R
const GAP = (3 / 360) * C   // ~3° gap between arcs
const phDash = (C / Math.max(1, Math.min(props.types.length || 1, 8))) - GAP

const PALETTE = [
  'var(--set-gold)', 'var(--set-orange)', 'var(--set-ok)', 'var(--set-amber)',
  'var(--set-ember)', 'var(--set-rust)', 'var(--set-gold-bright)', 'var(--set-deep)',
]
const colorAt = (i) => PALETTE[i % PALETTE.length]

const countOf = (code) => Number(props.usageByCode[code] || 0)
const total = computed(() => props.types.reduce((a, t) => a + countOf(t.code), 0))
const activeCount = computed(() => props.types.filter(t => t.is_active).length)
const empty = computed(() => total.value === 0)

// proportional arc segments (only types that actually have headcount)
const segments = computed(() => {
  const t = total.value
  if (!t) return []
  const withCount = props.types
    .map((row, idx) => ({ row, idx, count: countOf(row.code) }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
  let acc = 0
  return withCount.map(({ row, count }, i) => {
    const frac = count / t
    const startDeg = acc * 360 - 90
    acc += frac
    return {
      code: row.code, label: row.label, count, active: !!row.is_active, system: !!row.is_system,
      color: colorAt(i), share: Math.round(frac * 100),
      startDeg, dash: Math.max(2, frac * C - GAP),
    }
  })
})

// legend lists every type (incl. zero-count + inactive), colour-aligned to arcs
const legend = computed(() => {
  const segColor = Object.fromEntries(segments.value.map(s => [s.code, s.color]))
  const t = total.value || 1
  return [...props.types]
    .map((row, idx) => ({ row, idx, count: countOf(row.code) }))
    .sort((a, b) => b.count - a.count || a.row.sort_order - b.row.sort_order)
    .map(({ row, count }, i) => ({
      code: row.code, label: row.label, count, active: !!row.is_active, system: !!row.is_system,
      color: segColor[row.code] || colorAt(i),
      share: total.value ? Math.round((count / t) * 100) : 0,
    }))
})

const focus = computed(() => hovered.value ? legend.value.find(s => s.code === hovered.value) : null)
const emitSelect = (code) => { const row = props.types.find(t => t.code === code); if (row) emit('select', row) }

// ── count-up core ────────────────────────────────────────────────────────────
const displayTotal = ref(0)
let raf = null
function tweenTo(target) {
  if (reduced) { displayTotal.value = target; return }
  const from = displayTotal.value, start = performance.now(), dur = 850
  cancelAnimationFrame(raf)
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - p, 3)
    displayTotal.value = Math.round(from + (target - from) * e)
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
onMounted(() => { requestAnimationFrame(() => { grown.value = true }); tweenTo(total.value) })
watch(total, (v) => tweenTo(v))
</script>

<style scoped>
.eo {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 18px; align-items: center;
  padding: 18px; border-radius: 18px;
  background:
    radial-gradient(120% 90% at 22% 30%, color-mix(in srgb, var(--set-deep) 9%, transparent), transparent 60%),
    var(--set-surface);
  border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); min-height: 300px;
}
@media (max-width: 620px) { .eo { grid-template-columns: 1fr; } }

.eo-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-deep) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-deep) 6%, transparent) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: radial-gradient(120% 120% at 20% 20%, #000 8%, transparent 72%);
  -webkit-mask-image: radial-gradient(120% 120% at 20% 20%, #000 8%, transparent 72%); }
.eo-aura { position: absolute; inset: -30% auto auto -20%; width: 60%; height: 60%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-deep) 22%, transparent), transparent 70%); filter: blur(40px); }

/* dial */
.eo-dial { position: relative; z-index: 1; width: 100%; max-width: 260px; margin: 0 auto; aspect-ratio: 1; }
.eo-svg { width: 100%; height: 100%; display: block; transform: rotate(0deg); }
.eo-core-glow { animation: eo-breathe 5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes eo-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.eo-track { fill: none; stroke: var(--set-border); stroke-width: 26; opacity: 0.5; }
.eo-ph { fill: none; stroke: var(--set-unset); stroke-width: 18; opacity: 0.3; stroke-linecap: butt; }

.eo-arc { fill: none; stroke-width: 26; stroke-linecap: butt; cursor: pointer;
  transition: stroke-dasharray 0.95s var(--set-spring), stroke-width 0.3s var(--set-spring), opacity 0.3s;
  filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 0%, transparent)); }
.eo-arc.lit { stroke-width: 32; filter: drop-shadow(0 0 10px color-mix(in srgb, var(--set-gold) 50%, transparent)); }
.eo-arc.dim { opacity: 0.3; }
.eo-arc.off { stroke-dasharray: 4 4 !important; opacity: 0.5; }

.eo-reticle { fill: none; stroke: color-mix(in srgb, var(--set-deep) 40%, transparent); stroke-width: 1; stroke-dasharray: 2 10; opacity: 0.5;
  transform-box: fill-box; transform-origin: center; animation: eo-spin 40s linear infinite; }
@keyframes eo-spin { to { transform: rotate(360deg); } }

/* center */
.eo-center { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.eo-center-in { display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; }
.eo-c-dot { width: 8px; height: 8px; border-radius: 50%; margin-bottom: 3px; box-shadow: 0 0 8px currentColor; }
.eo-c-num { font-size: 38px; font-weight: 850; line-height: 1; letter-spacing: -0.02em; color: var(--set-text);
  font-variant-numeric: tabular-nums; }
.eo-c-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-muted); margin-top: 3px; }
.eo-c-sub { font-size: 10.5px; color: var(--set-text-dim); }
.eo-swap-enter-active, .eo-swap-leave-active { transition: opacity 0.2s, transform 0.2s var(--set-spring); }
.eo-swap-enter-from { opacity: 0; transform: translateY(6px) scale(0.96); }
.eo-swap-leave-to { opacity: 0; transform: translateY(-6px) scale(0.96); }

/* legend */
.eo-legend { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; max-height: 290px; overflow-y: auto; padding-right: 2px; }
.eo-legend-head { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-deep); margin-bottom: 2px; }
.eo-legend-head :deep(svg) { color: var(--set-deep); }
.eo-row { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  padding: 9px 11px 13px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s + 0.1s); }
.eo-row:hover, .eo-row.lit { border-color: color-mix(in srgb, var(--c) 45%, transparent); transform: translateX(2px); }
.eo-row.dim { opacity: 0.45; }
.eo-row.off { opacity: 0.62; }
.eo-row-dot { width: 11px; height: 11px; border-radius: 4px; background: var(--c); box-shadow: 0 0 8px -1px var(--c); }
.eo-row.off .eo-row-dot { background: var(--set-unset); box-shadow: none; }
.eo-row-id { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.eo-row-id b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.eo-row-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; color: var(--set-text-dim); }
.eo-row-sys { display: inline-flex; align-items: center; gap: 3px; color: var(--set-text-muted); }
.eo-row-inactive { color: var(--set-partial); font-weight: 700; }
.eo-row-val { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
.eo-row-val b { font-size: 14px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.eo-row-val span { font-size: 9.5px; color: var(--set-text-dim); }
.eo-row-bar { position: absolute; left: 11px; right: 11px; bottom: 7px; height: 3px; border-radius: 2px; background: var(--set-border); overflow: hidden; }
.eo-row-bar i { display: block; height: 100%; border-radius: 2px; transition: width 0.9s var(--set-spring); }

.eo.reduced .eo-core-glow, .eo.reduced .eo-reticle { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .eo-core-glow, .eo-reticle { animation: none; }
  .eo-arc, .eo-row-bar i { transition: none; }
  .eo-row { animation: none; }
}
</style>
