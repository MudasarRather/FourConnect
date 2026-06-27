<template>
  <!-- "Growth Momentum" — three concentric activity rings, one per personal-growth
       track: Goals & OKRs (outer), Feedback to give (middle), Improvement (inner).
       Each ring fills to its completion %, glows a leading tip, and pulses when it
       needs the employee. Center reads how many actions are waiting. Legend rows +
       the arcs themselves cross-highlight and emit @go to jump to that section. -->
  <div ref="root" class="gr" :class="{ reduced }" @pointermove="onMove" @pointerleave="reset">
    <!-- ambient field -->
    <div class="gr-fx" aria-hidden="true" :style="parallax">
      <span class="gr-conic" />
      <span class="gr-aura" />
      <span v-for="n in 8" :key="n" class="gr-mote" :style="moteStyle(n)" />
    </div>

    <span class="gr-eye"><Activity :size="11" /> Growth momentum</span>

    <div class="gr-stage">
      <svg class="gr-svg" viewBox="0 0 208 208" role="img" :aria-label="ariaLabel">
        <defs>
          <filter id="grGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g v-for="rg in view" :key="rg.key" class="gr-ring" :class="{ dim: active && active !== rg.key, hot: active === rg.key }"
          @mouseenter="active = rg.key" @mouseleave="active = null" @click="emit('go', rg.key)">
          <!-- track -->
          <circle class="gr-track" :cx="CX" :cy="CY" :r="rg.r" :stroke-width="SW" />
          <!-- progress arc (rotated so it starts at 12 o'clock, sweeps clockwise) -->
          <circle class="gr-arc" :cx="CX" :cy="CY" :r="rg.r" :stroke-width="SW" :stroke="rg.tone"
            :stroke-dasharray="rg.c" :stroke-dashoffset="rg.offset" :transform="`rotate(-90 ${CX} ${CY})`" filter="url(#grGlow)" />
          <!-- leading tip + alert ping -->
          <template v-if="rg.showTip">
            <circle v-if="rg.alert && !reduced" class="gr-ping" :cx="rg.tip.x" :cy="rg.tip.y" r="6" :style="{ stroke: rg.tone }" />
            <circle class="gr-tip" :cx="rg.tip.x" :cy="rg.tip.y" r="4.6" :style="{ fill: rg.tone }" filter="url(#grGlow)" />
          </template>
        </g>
      </svg>

      <!-- center readout -->
      <div class="gr-core">
        <template v-if="(focus.count || 0) > 0">
          <b class="gr-core-num"><SetCountUp :value="focus.count" /></b>
          <span class="gr-core-lab">{{ focus.label || 'need you' }}</span>
        </template>
        <template v-else>
          <span class="gr-core-ok"><CheckCircle2 :size="26" /></span>
          <span class="gr-core-lab">All clear</span>
        </template>
      </div>
    </div>

    <!-- legend rail -->
    <div class="gr-legend">
      <button v-for="rg in view" :key="rg.key" type="button" class="gr-leg" :class="{ on: active === rg.key, alert: rg.alert }"
        :style="{ '--c': rg.tone }" @mouseenter="active = rg.key" @mouseleave="active = null"
        @focus="active = rg.key" @blur="active = null" @click="emit('go', rg.key)">
        <span class="gr-leg-ic"><component :is="rg.icon" :size="13" /></span>
        <span class="gr-leg-txt"><em>{{ rg.label }}</em><span class="gr-leg-sub">{{ rg.sub }}</span></span>
        <b class="gr-leg-val">{{ rg.valueText }}</b>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { Activity, CheckCircle2 } from 'lucide-vue-next'
import SetCountUp from '../../settings/components/SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  // [{ key, label, icon, tone, pct, valueText, sub, alert }] — outer→inner
  rings: { type: Array, default: () => [] },
  focus: { type: Object, default: () => ({ count: 0, label: 'need you' }) },
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits(['go'])

const CX = 104, CY = 104, SW = 13
const RADII = [84, 65, 46]   // outer / middle / inner
const circ = (r) => +(2 * Math.PI * r).toFixed(2)

// armed after mount so each arc sweeps from empty to its value
const armed = ref(false)
onMounted(() => nextTick(() => { armed.value = true }))
const active = ref(null)

const view = computed(() => props.rings.slice(0, 3).map((rg, i) => {
  const r = RADII[i] ?? 46
  const c = circ(r)
  const frac = Math.max(0, Math.min(1, (Number(rg.pct) || 0) / 100))
  const shown = (armed.value || props.reduced) ? frac : 0
  const offset = +(c * (1 - shown)).toFixed(2)
  const ang = (-90 + shown * 360) * Math.PI / 180
  return {
    ...rg, r, c, offset,
    tip: { x: +(CX + r * Math.cos(ang)).toFixed(2), y: +(CY + r * Math.sin(ang)).toFixed(2) },
    showTip: shown > 0.012,
  }
}))

const ariaLabel = computed(() =>
  'Growth momentum: ' + props.rings.map(r => `${r.label} ${r.valueText}`).join(', '))

// ambient motes — deterministic placement
const moteStyle = (n) => {
  const x = 14 + (n * 67) % 72, y = 16 + (n * 41) % 60, dur = 7 + (n % 5), del = (n % 6) * 0.7
  return { left: x + '%', top: y + '%', '--md': dur + 's', '--mdelay': del + 's' }
}

// pointer parallax on the atmosphere
const root = ref(null)
usePointerSpotlight(root)
const parallax = ref({})
function onMove(e) {
  if (props.reduced || !root.value) return
  const r = root.value.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  parallax.value = { transform: `translate3d(${(-dx * 12).toFixed(1)}px, ${(-dy * 9).toFixed(1)}px, 0)` }
}
const reset = () => { parallax.value = {} }
</script>

<style scoped>
.gr { position: relative; overflow: hidden; border-radius: 20px; padding: 14px 16px 15px; min-height: 232px;
  display: flex; flex-direction: column;
  background:
    radial-gradient(92% 80% at 50% 0%, color-mix(in srgb, var(--perf-gold) 10%, transparent), transparent 62%),
    linear-gradient(180deg, var(--perf-surface), var(--perf-panel));
  border: 1px solid var(--perf-border); }

.gr-fx { position: absolute; inset: 0; pointer-events: none; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.gr-conic { position: absolute; left: 50%; top: 116px; width: 300px; height: 300px; transform: translate(-50%, -50%);
  border-radius: 50%; opacity: 0.5; mix-blend-mode: screen;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--perf-gold) 24%, transparent), transparent 40%, color-mix(in srgb, var(--perf-orange) 22%, transparent), transparent 70%, color-mix(in srgb, var(--perf-ok) 20%, transparent), transparent);
  filter: blur(20px); animation: gr-spin 28s linear infinite; }
.gr-aura { position: absolute; left: 50%; top: 70px; width: 220px; height: 200px; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 18%, transparent), transparent 70%); filter: blur(40px); opacity: 0.5;
  animation: gr-breathe 7.5s var(--perf-ease) infinite; }
.gr-mote { position: absolute; width: 2.5px; height: 2.5px; border-radius: 50%; background: color-mix(in srgb, var(--perf-gold) 72%, transparent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--perf-gold) 85%, transparent); opacity: 0; animation: gr-mote var(--md, 8s) ease-in-out infinite; animation-delay: var(--mdelay, 0s); }

.gr-eye { position: relative; z-index: 2; align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--perf-gold); }
.gr-eye :deep(svg) { color: var(--perf-gold); }

.gr-stage { position: relative; z-index: 1; display: grid; place-items: center; margin: 4px auto 2px; width: 100%; }
.gr-svg { width: 100%; max-width: 208px; overflow: visible; }
.gr-track { fill: none; stroke: var(--perf-track); stroke-linecap: round; }
.gr-arc { fill: none; stroke-linecap: round; opacity: 0.92;
  transition: stroke-dashoffset 1.15s var(--perf-spring), stroke-width 0.3s, opacity 0.3s;
  filter: drop-shadow(0 0 5px color-mix(in srgb, currentColor 40%, transparent)); }
.gr-ring { cursor: pointer; }
.gr-ring .gr-arc, .gr-ring .gr-track { pointer-events: stroke; }
.gr-ring.dim { opacity: 0.42; transition: opacity 0.3s; }
.gr-ring.hot .gr-arc { stroke-width: 15; }
.gr-tip { stroke: var(--perf-surface-elevated); stroke-width: 2; }
.gr-ping { fill: none; stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: gr-ping 2.2s ease-out infinite; }

.gr-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; }
.gr-core-num { font-size: 34px; font-weight: 850; line-height: 1; color: var(--perf-text); font-variant-numeric: tabular-nums;
  text-shadow: 0 0 18px color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.gr-core-ok { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: var(--perf-ok);
  background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 32%, transparent); }
.gr-core-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); margin-top: 2px; }

.gr-legend { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 4px; margin-top: auto; padding-top: 12px; }
.gr-leg { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 8px; border-radius: 11px; cursor: pointer; text-align: left;
  font: inherit; background: transparent; border: 1px solid transparent; transition: background 0.2s, border-color 0.2s; --c: var(--perf-gold); }
.gr-leg:hover, .gr-leg.on { background: color-mix(in srgb, var(--c) 9%, transparent); border-color: color-mix(in srgb, var(--c) 26%, transparent); }
.gr-leg-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.gr-leg-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.gr-leg-txt em { font-size: 11.5px; font-style: normal; font-weight: 750; color: var(--perf-text); }
.gr-leg-sub { font-size: 10px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gr-leg-val { flex-shrink: 0; font-size: 11.5px; font-weight: 800; color: var(--c); font-variant-numeric: tabular-nums; }
.gr-leg.alert .gr-leg-ic::after { content: ''; position: absolute; margin: -4px 0 0 18px; width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px var(--c); animation: gr-pulse 1.7s ease-in-out infinite; }
.gr-leg-ic { position: relative; }

@keyframes gr-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes gr-breathe { 0%, 100% { opacity: 0.35; transform: translateX(-50%) scale(1); } 50% { opacity: 0.6; transform: translateX(-50%) scale(1.08); } }
@keyframes gr-mote { 0% { transform: translateY(8px); opacity: 0; } 30% { opacity: 0.85; } 70% { opacity: 0.7; } 100% { transform: translateY(-22px); opacity: 0; } }
@keyframes gr-ping { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(2.5); } }
@keyframes gr-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

.gr.reduced .gr-conic, .gr.reduced .gr-aura, .gr.reduced .gr-mote, .gr.reduced .gr-ping { animation: none; }
.gr.reduced .gr-mote { display: none; }
.gr.reduced .gr-arc { transition: none; }
.gr.reduced .gr-fx { transition: none; }
.gr.reduced .gr-leg.alert .gr-leg-ic::after { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .gr-conic, .gr-aura, .gr-mote, .gr-ping { animation: none; }
  .gr-mote { display: none; }
  .gr-arc { transition: none; }
  .gr-leg.alert .gr-leg-ic::after { animation: none; }
}
</style>
