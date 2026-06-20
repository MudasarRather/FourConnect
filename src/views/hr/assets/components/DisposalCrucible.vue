<template>
  <div class="fc" :class="{ compact, cold: intensity === 0 }" :style="gaugeStyle" ref="root">
    <!-- brushed-steel outer bezel -->
    <span class="fc-bezel" aria-hidden="true" />

    <!-- recovery gauge ring (conic, molten) — --p / --tip set on the owning
         element so their registered-custom-property transitions actually fire -->
    <span class="fc-ring" aria-hidden="true" :style="{ '--p': pDeg }" />
    <span class="fc-tip" aria-hidden="true" :style="{ '--tip': tipDeg }"><i /></span>

    <!-- crucible interior -->
    <span class="fc-disc" aria-hidden="true">
      <span class="fc-floor" />
      <span class="fc-haze" />
      <span class="fc-sheen" />
      <template v-if="!reduced">
        <span v-for="e in embers" :key="e.i" class="fc-ember" :style="e.style" />
      </template>
    </span>

    <!-- center readout -->
    <div class="fc-core">
      <span class="fc-flame"><Flame :size="compact ? 13 : 16" /></span>
      <b class="fc-val"><AssetCountUp :value="recovery" :start="start" :duration="1.5" suffix="%" /></b>
      <small class="fc-lab">{{ label }}</small>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Flame } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  recovery: { type: Number, default: 0 },   // 0..100+ — actual shown in core, ring clamps to 100
  intensity: { type: Number, default: 0 },  // active disposals — drives molten breath speed
  size: { type: Number, default: 208 },
  label: { type: String, default: 'value recovered' },
  start: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
})

const root = ref(null)
const reduced = prefersReduced()
const drawn = ref(false)

const clamped = computed(() => Math.max(0, Math.min(100, props.recovery || 0)))
// breath cadence: hotter (more active) → faster pulse, floored so it stays calm.
const breath = computed(() => {
  const n = props.intensity || 0
  if (!n) return 6.5
  return Math.max(2.4, 5.5 - Math.min(n, 10) * 0.32)
})

const pct = computed(() => drawn.value ? clamped.value : 0)
const pDeg = computed(() => pct.value * 3.6 + 'deg')
const tipDeg = computed(() => -90 + pct.value * 3.6 + 'deg')
const gaugeStyle = computed(() => ({
  width: props.size + 'px',
  height: props.size + 'px',
  '--breath': breath.value + 's',
}))

// deterministic ember field — stable positions, no Math.random
const count = computed(() => props.compact ? 6 : 11)
const embers = computed(() => {
  const wx = seededWave(7, count.value)
  const wd = seededWave(23, count.value)
  const ws = seededWave(41, count.value)
  return Array.from({ length: count.value }, (_, i) => ({
    i,
    style: {
      '--ex': (12 + wx[i] * 76).toFixed(1) + '%',
      '--drift': ((wd[i] - 0.5) * 26).toFixed(1) + 'px',
      '--sz': (2 + ws[i] * 3.4).toFixed(1) + 'px',
      '--dur': (2.6 + wd[i] * 2.6).toFixed(2) + 's',
      '--delay': (-(wx[i] * 4.5)).toFixed(2) + 's',
      '--op': (0.5 + ws[i] * 0.5).toFixed(2),
    },
  }))
})

watch(() => props.start, (s) => { if (s && !drawn.value) nextTick(() => { drawn.value = true }) })
onMounted(() => { if (props.start) nextTick(() => { drawn.value = true }) })
</script>

<style scoped>
.fc { position: relative; flex-shrink: 0; display: grid; place-items: center; isolation: isolate; }

/* ── outer brushed-steel bezel ── */
.fc-bezel {
  position: absolute; inset: 0; border-radius: 50%; pointer-events: none; z-index: 0;
  background: var(--as-bezel-ring); opacity: 0.5;
  -webkit-mask: radial-gradient(closest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
          mask: radial-gradient(closest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45));
}

/* ── conic recovery ring (the molten gauge) ── */
.fc-ring {
  position: absolute; inset: 9px; border-radius: 50%; pointer-events: none; z-index: 1;
  background: conic-gradient(from -90deg,
    var(--as-ember-deep) 0deg,
    var(--as-ember) calc(var(--p) * 0.45),
    var(--as-amber) calc(var(--p) * 0.82),
    var(--as-amber-bright) var(--p),
    color-mix(in srgb, var(--as-steel) 16%, transparent) var(--p),
    color-mix(in srgb, var(--as-steel) 16%, transparent) 360deg);
  -webkit-mask: radial-gradient(closest-side, transparent calc(100% - 15px), #000 calc(100% - 14px));
          mask: radial-gradient(closest-side, transparent calc(100% - 15px), #000 calc(100% - 14px));
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--as-ember) 45%, transparent));
  transition: --p 1.4s var(--as-ease), filter 0.6s ease;
}
.fc.cold .fc-ring { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--as-steel) 30%, transparent)); }

/* leading glow tip riding the arc head */
.fc-tip { position: absolute; inset: 9px; z-index: 2; pointer-events: none; transform: rotate(var(--tip)); transition: transform 1.4s var(--as-ease); }
.fc-tip i { position: absolute; top: 1px; left: 50%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%;
  background: var(--as-amber-bright); box-shadow: 0 0 12px 3px color-mix(in srgb, var(--as-amber) 80%, transparent); }
.fc.cold .fc-tip i { opacity: 0; }

/* ── crucible interior ── */
.fc-disc {
  position: absolute; inset: 26px; border-radius: 50%; overflow: hidden; z-index: 1; pointer-events: none;
  background: radial-gradient(120% 130% at 50% 24%, #1b140c 0%, #0c0907 62%, #060504 100%);
  box-shadow: inset 0 3px 14px rgba(0,0,0,0.7), inset 0 -8px 22px color-mix(in srgb, var(--as-ember) 24%, transparent);
}
[data-theme="light"] .fc-disc { background: radial-gradient(120% 130% at 50% 24%, #2c2012 0%, #1a120a 64%, #0e0a06 100%); }
.fc.compact .fc-disc { inset: 20px; }

/* molten pool pinned to the bottom of the bowl */
.fc-floor {
  position: absolute; inset: 0;
  background: radial-gradient(85% 72% at 50% 122%,
    #fff3d6 0%, var(--as-amber-bright) 14%, var(--as-amber) 28%,
    var(--as-ember) 46%, var(--as-ember-deep) 62%, transparent 80%);
  transform-origin: 50% 100%;
  animation: fc-breathe var(--breath, 5s) ease-in-out infinite;
}
.fc.cold .fc-floor { opacity: 0.28; animation: none; filter: saturate(0.5) brightness(0.7); }

/* heat-haze shimmer sweeping above the pool */
.fc-haze {
  position: absolute; left: -20%; right: -20%; bottom: 8%; height: 46%; border-radius: 50%;
  background: radial-gradient(60% 100% at 50% 100%, color-mix(in srgb, var(--as-amber) 22%, transparent), transparent 70%);
  filter: blur(7px); mix-blend-mode: screen; animation: fc-haze 3.4s ease-in-out infinite;
}
.fc.cold .fc-haze { display: none; }

/* slow top sheen for machined depth */
.fc-sheen { position: absolute; inset: 0; background: radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,0.12), transparent 60%); }

/* rising embers */
.fc-ember {
  position: absolute; left: var(--ex); bottom: 14%; width: var(--sz); height: var(--sz); border-radius: 50%;
  background: radial-gradient(circle, #fff3d6, var(--as-amber) 45%, var(--as-ember) 100%);
  box-shadow: 0 0 6px color-mix(in srgb, var(--as-amber) 70%, transparent);
  opacity: 0; will-change: transform, opacity;
  animation: fc-ember var(--dur) ease-in var(--delay) infinite;
}

/* ── center readout ── */
.fc-core {
  position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 2px;
  line-height: 1; text-align: center; pointer-events: none; margin-bottom: 4px;
}
.fc-flame { color: var(--as-amber-bright); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--as-amber) 70%, transparent)); }
.fc.cold .fc-flame { color: var(--as-steel-dim); filter: none; }
.fc-val { font-size: 34px; font-weight: 850; letter-spacing: -0.02em; color: #fdf6e8;
  text-shadow: 0 2px 18px rgba(0,0,0,0.7), 0 0 22px color-mix(in srgb, var(--as-amber) 28%, transparent); }
.fc.compact .fc-val { font-size: 25px; }
.fc-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #d8c6a6; }

@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

@keyframes fc-breathe {
  0%, 100% { transform: translateY(2%) scaleY(0.96); filter: brightness(0.92); }
  50%      { transform: translateY(-3%) scaleY(1.05); filter: brightness(1.12); }
}
@keyframes fc-haze {
  0%, 100% { opacity: 0.5; transform: translateY(0) scaleX(1); }
  50%      { opacity: 0.85; transform: translateY(-6%) scaleX(1.08); }
}
@keyframes fc-ember {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  12%  { opacity: var(--op, 0.8); }
  78%  { opacity: var(--op, 0.8); }
  100% { transform: translate(var(--drift, 0), -150px) scale(0.35); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .fc-floor, .fc-haze, .fc-ember, .fc-ring, .fc-tip { animation: none !important; transition: none !important; }
}
</style>
