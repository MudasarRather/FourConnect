<template>
  <!-- ═══════════ THE WEIGHTING WHEEL ═══════════
       A live calibration dial: each weighted section is an arc; the ring only
       CLOSES into a full circle when the weights total exactly 100%. Under-
       weight leaves a hatched gap (amber, "uncalibrated"); at 100% it snaps
       shut, glows emerald and emits a "calibrated" pulse. The signature
       instrument for the appraisal rubric editor — and its live preview. -->
  <div ref="rootEl" class="ww" :class="stateClass">
    <div class="ww-stage">
      <svg class="ww-svg" viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <radialGradient id="wwCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--ww-core-a)" />
            <stop offset="100%" stop-color="transparent" />
          </radialGradient>
        </defs>

        <!-- aura -->
        <circle class="ww-aura" cx="120" cy="120" r="104" fill="url(#wwCore)" />

        <!-- emit rings (calibrated) -->
        <circle class="ww-emit e1" cx="120" cy="120" r="92" />
        <circle class="ww-emit e2" cx="120" cy="120" r="92" />

        <!-- base track -->
        <circle class="ww-track" cx="120" cy="120" r="92" />

        <!-- the under-weight gap (hatched, only visible < 100) -->
        <circle class="ww-gap" cx="120" cy="120" r="92"
          :stroke-dasharray="`${gapLen} ${C}`" :stroke-dashoffset="gapOffset"
          transform="rotate(-90 120 120)" />

        <!-- weighted section arcs -->
        <g transform="rotate(-90 120 120)">
          <circle v-for="seg in segments" :key="seg.key" class="ww-seg"
            :class="{ hot: activeIndex === seg.i, dim: activeIndex !== null && activeIndex !== seg.i }"
            cx="120" cy="120" r="92"
            :stroke="seg.color" :stroke-dasharray="`${seg.len} ${C}`" :stroke-dashoffset="seg.offset"
            @pointerenter="$emit('hover', seg.i)" @pointerleave="$emit('hover', null)" />
        </g>

        <!-- rotating sheen -->
        <circle class="ww-sheen" cx="120" cy="120" r="92" />

        <!-- needle -->
        <line class="ww-needle" x1="120" y1="120" :x2="needle.x" :y2="needle.y" />
        <circle class="ww-hub" cx="120" cy="120" r="5" />
      </svg>

      <!-- center read-out -->
      <div class="ww-core">
        <span class="ww-total" :class="stateClass">{{ total }}<i>%</i></span>
        <span class="ww-state">
          <component :is="stateIcon" :size="11" />
          {{ stateLabel }}
        </span>
        <div class="ww-core-meta">
          <span><component :is="cyc.icon" :size="10" />{{ cyc.label }}</span>
          <span><Star :size="10" />1–{{ ratingMax }}</span>
          <span><Layers :size="10" />{{ sections.length }}</span>
        </div>
      </div>
    </div>

    <!-- legend -->
    <div v-if="segments.length" class="ww-legend">
      <button v-for="seg in segments" :key="seg.key" class="ww-leg" type="button"
        :class="{ hot: activeIndex === seg.i }" :style="{ '--c': seg.color }"
        @pointerenter="$emit('hover', seg.i)" @pointerleave="$emit('hover', null)">
        <span class="ww-leg-dot" />
        <span class="ww-leg-lab">{{ seg.title || sectionMeta(seg.type).label }}</span>
        <b>{{ seg.weight }}%</b>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Star, Layers, CircleCheck, TriangleAlert, Gauge } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { sectionMeta, typeColor, cycleMeta } from '../composables/appraisalVocab'

const props = defineProps({
  sections: { type: Array, default: () => [] },   // [{ title, section_type, weight }]
  cycle: { type: String, default: 'ANNUAL' },
  ratingMax: { type: Number, default: 5 },
  activeIndex: { type: Number, default: null },
})
defineEmits(['hover'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)

const R = 92
const C = 2 * Math.PI * R

const total = computed(() => props.sections.reduce((s, x) => s + (Number(x.weight) || 0), 0))
const cyc = computed(() => cycleMeta(props.cycle))

const segments = computed(() => {
  let cum = 0
  return props.sections.map((s, i) => {
    const w = Math.max(0, Number(s.weight) || 0)
    const seg = {
      key: i, i, type: s.section_type, title: s.title, weight: w,
      color: typeColor(s.section_type),
      len: (Math.min(w, 100) / 100) * C,
      offset: -(cum / 100) * C,
    }
    cum += w
    return seg
  })
})

const gapLen = computed(() => Math.max(0, (100 - Math.min(100, total.value)) / 100) * C)
const gapOffset = computed(() => -(Math.min(100, total.value) / 100) * C)

const state = computed(() => total.value === 100 ? 'ok' : (total.value > 100 ? 'over' : 'under'))
const stateClass = computed(() => `is-${state.value}`)
const stateLabel = computed(() =>
  state.value === 'ok' ? 'Calibrated'
    : state.value === 'over' ? `${total.value - 100}% over`
      : `${100 - total.value}% to go`)
const stateIcon = computed(() => state.value === 'ok' ? CircleCheck : (state.value === 'over' ? TriangleAlert : Gauge))

// needle points to the total (0..100 → -90..+ clockwise, capped at 100)
const needle = computed(() => {
  const frac = Math.min(100, total.value) / 100
  const ang = (-90 + frac * 360) * Math.PI / 180
  const r = 66
  return { x: (120 + Math.cos(ang) * r).toFixed(1), y: (120 + Math.sin(ang) * r).toFixed(1) }
})
</script>

<style scoped>
.ww { display: flex; flex-direction: column; gap: 12px; align-items: center;
  --ww-core-a: color-mix(in srgb, var(--set-deep) 26%, transparent); --mx: 0.5; --my: 0.5; }
.ww.is-ok { --ww-core-a: color-mix(in srgb, var(--set-ok) 28%, transparent); }
.ww.is-over { --ww-core-a: color-mix(in srgb, var(--set-conflict) 26%, transparent); }

.ww-stage { position: relative; width: 100%; max-width: 260px; aspect-ratio: 1; }
.ww-svg { position: absolute; inset: 0; width: 100%; height: 100%;
  transform: translate(calc((var(--mx) - 0.5) * 8px), calc((var(--my) - 0.5) * 8px)); transition: transform 0.4s var(--set-spring); }

.ww-aura { transform-box: fill-box; transform-origin: center; animation: ww-breathe 6s ease-in-out infinite; }
.ww-track { fill: none; stroke: var(--set-trace-idle); stroke-width: 16; }
.ww-gap { fill: none; stroke-width: 16; stroke-linecap: butt;
  stroke: var(--set-partial); opacity: 0.16; transition: stroke-dasharray 0.6s var(--set-spring), stroke-dashoffset 0.6s var(--set-spring), opacity 0.4s; }
.ww.is-ok .ww-gap { opacity: 0; }
.ww.is-over .ww-gap { stroke: var(--set-conflict); opacity: 0.2; }

.ww-seg { fill: none; stroke-width: 16; stroke-linecap: butt; cursor: pointer;
  transition: stroke-dasharray 0.6s var(--set-spring), stroke-dashoffset 0.6s var(--set-spring), stroke-width 0.25s, opacity 0.25s, filter 0.25s;
  filter: drop-shadow(0 0 5px color-mix(in srgb, currentColor 0%, transparent)); }
.ww-seg.hot { stroke-width: 20; filter: drop-shadow(0 0 9px color-mix(in srgb, var(--set-deep) 55%, transparent)); }
.ww-seg.dim { opacity: 0.4; }
.ww.is-ok .ww-seg { filter: drop-shadow(0 0 7px color-mix(in srgb, var(--set-ok) 40%, transparent)); }

.ww-emit { fill: none; stroke: var(--set-ok); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; }
.ww.is-ok .ww-emit.e1 { animation: ww-emit 3.4s ease-out infinite; }
.ww.is-ok .ww-emit.e2 { animation: ww-emit 3.4s ease-out infinite 1.7s; }

.ww-sheen { fill: none; stroke: rgba(255, 255, 255, 0.5); stroke-width: 16; stroke-linecap: round;
  stroke-dasharray: 26 552; transform-box: fill-box; transform-origin: center; opacity: 0.18;
  animation: ww-spin 5.5s linear infinite; mix-blend-mode: overlay; }
[data-theme="light"] .ww-sheen { stroke: rgba(255, 255, 255, 0.8); mix-blend-mode: normal; opacity: 0.4; }

.ww-needle { stroke: var(--set-text); stroke-width: 2; stroke-linecap: round; opacity: 0.6;
  transition: all 0.6s var(--set-spring); }
.ww.is-ok .ww-needle { stroke: var(--set-ok); opacity: 0.9; }
.ww.is-over .ww-needle { stroke: var(--set-conflict); }
.ww-hub { fill: var(--set-text); }
.ww.is-ok .ww-hub { fill: var(--set-ok); }

.ww-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; pointer-events: none;
  transform: translate(calc((var(--mx) - 0.5) * 4px), calc((var(--my) - 0.5) * 4px)); transition: transform 0.4s var(--set-spring); }
.ww-total { font-size: 40px; font-weight: 850; line-height: 1; color: var(--set-text); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.ww-total i { font-size: 18px; font-weight: 700; font-style: normal; color: var(--set-text-muted); margin-left: 1px; }
.ww-total.is-ok { color: var(--set-ok); }
.ww-total.is-over { color: var(--set-conflict); }
.ww-state { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-muted); }
.ww.is-ok .ww-state { color: var(--set-ok); }
.ww.is-over .ww-state { color: var(--set-conflict); }
.ww-core-meta { display: flex; gap: 9px; margin-top: 5px; }
.ww-core-meta span { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 650; color: var(--set-text-dim); }
.ww-core-meta span :deep(svg) { color: var(--set-text-muted); }

.ww-legend { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.ww-leg { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 10.5px; font-weight: 650; color: var(--set-text-secondary);
  background: color-mix(in srgb, var(--c) 8%, var(--set-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--c) 22%, transparent); transition: all 0.2s var(--set-spring); }
.ww-leg:hover, .ww-leg.hot { transform: translateY(-1px); border-color: color-mix(in srgb, var(--c) 50%, transparent); }
.ww-leg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px color-mix(in srgb, var(--c) 70%, transparent); flex-shrink: 0; }
.ww-leg-lab { max-width: 12ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ww-leg b { color: var(--set-text); font-variant-numeric: tabular-nums; }

@keyframes ww-breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.05); opacity: 1; } }
@keyframes ww-spin { to { transform: rotate(360deg); } }
@keyframes ww-emit { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.22); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .ww-aura, .ww-sheen, .ww-emit { animation: none !important; }
  .ww-svg, .ww-core, .ww-seg, .ww-gap, .ww-needle { transition: none; }
}
</style>
