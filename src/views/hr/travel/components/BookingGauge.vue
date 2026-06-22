<template>
  <div ref="el" class="gauge">
    <!-- semicircular fulfilment dial -->
    <div class="dial">
      <svg viewBox="0 0 200 110" class="dial-svg">
        <!-- track -->
        <path class="g-track" d="M16,100 A84,84 0 0 1 184,100" />
        <!-- ticks -->
        <line v-for="t in ticks" :key="t.k" class="g-tick" :class="{ major: t.major }"
          :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" />
        <!-- value arc -->
        <path class="g-val" d="M16,100 A84,84 0 0 1 184,100"
          :style="{ strokeDasharray: ARC, strokeDashoffset: visible ? ARC * (1 - pct) : ARC }" />
        <!-- needle -->
        <g class="g-needle" :style="{ transform: `rotate(${visible ? needleDeg : -90}deg)` }">
          <line x1="100" y1="100" x2="100" y2="38" />
          <circle cx="100" cy="100" r="5.5" class="g-hub" />
        </g>
      </svg>
    </div>
    <!-- reading sits below the pivot so it never collides with the needle/hub -->
    <div class="dial-read">
      <TrvCountUp class="dial-pct" :value="visible ? Math.round(pct * 100) : 0" suffix="%" />
      <span class="dial-lbl">Itineraries confirmed</span>
    </div>

    <!-- segment-type mix ribbon -->
    <div class="mix">
      <div class="mix-bar">
        <span v-for="(m, i) in mix" :key="m.key" class="mix-fill" :style="{
          '--c': m.hex, '--w': m.pct + '%', '--d': (0.1 + i * 0.08) + 's',
          width: visible ? m.pct + '%' : '0%',
        }" />
        <span v-if="!total" class="mix-empty" />
      </div>
      <div class="mix-legend">
        <span v-for="m in mix" :key="m.key" class="leg" :style="{ '--c': m.hex }">
          <component :is="m.icon" :size="11" /> {{ m.label }} <b>{{ m.count }}</b>
        </span>
        <span v-if="!total" class="leg empty">No segments booked yet</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TrvCountUp from './TrvCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'
import { BOOKING_TYPES, bookingMeta } from '@/composables/useTravel'

const props = defineProps({
  bookings: { type: Array, default: () => [] },
})

const el = ref(null)
const { visible } = useInView(el, { threshold: 0.3 })

const ARC = Math.PI * 84 // length of the semicircle stroke

const CONFIRMED = new Set(['CONFIRMED', 'COMPLETED'])
const total = computed(() => props.bookings.length)
const confirmed = computed(() => props.bookings.filter(b => CONFIRMED.has(b.status)).length)
const pct = computed(() => (total.value ? confirmed.value / total.value : 0))
const needleDeg = computed(() => pct.value * 180 - 90)

// tick marks around the arc
const ticks = computed(() => {
  const out = []
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI // 180° → 0°
    const cx = 100, cy = 100, rOuter = 84, major = i % 2 === 0
    const rInner = rOuter - (major ? 11 : 6)
    out.push({
      k: i, major,
      x1: cx + rOuter * Math.cos(a), y1: cy - rOuter * Math.sin(a),
      x2: cx + rInner * Math.cos(a), y2: cy - rInner * Math.sin(a),
    })
  }
  return out
})

const mix = computed(() => {
  const t = total.value || 1
  return BOOKING_TYPES
    .map(bt => {
      const count = props.bookings.filter(b => b.booking_type === bt.key).length
      return { key: bt.key, label: bt.label, icon: bt.icon, hex: bt.hex, count, pct: (count / t) * 100 }
    })
    .filter(m => m.count > 0)
})
</script>

<style scoped>
.gauge { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 320px; }

.dial { position: relative; line-height: 0; }
.dial-svg { width: 100%; height: auto; overflow: visible; }
.g-track { fill: none; stroke: var(--trv-border-strong); stroke-width: 9; stroke-linecap: round; }
.g-tick { stroke: var(--trv-border-strong); stroke-width: 1.4; }
.g-tick.major { stroke: var(--trv-text-dim); stroke-width: 2; }
.g-val {
  fill: none; stroke: var(--trv-amber); stroke-width: 9; stroke-linecap: round;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5));
  transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.g-needle { transform-origin: 100px 100px; transition: transform 1.5s cubic-bezier(0.34, 1.4, 0.5, 1); }
.g-needle line { stroke: var(--trv-amber-bright); stroke-width: 3; stroke-linecap: round; filter: drop-shadow(0 0 5px rgba(252, 211, 77, 0.7)); }
.g-hub { fill: var(--trv-surface-elevated); stroke: var(--trv-amber); stroke-width: 2.5; }
.dial-read { text-align: center; margin-top: -10px; }
.dial-pct { display: block; font-size: 28px; font-weight: 850; color: var(--trv-text); line-height: 1; font-variant-numeric: tabular-nums; }
.dial-lbl { display: block; margin-top: 2px; font-size: 10.5px; letter-spacing: 0.05em; color: var(--trv-text-muted); }

.mix { display: flex; flex-direction: column; gap: 8px; }
.mix-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.mix-fill { height: 100%; background: var(--c); transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1); transition-delay: var(--d); }
.mix-fill + .mix-fill { box-shadow: -1px 0 0 var(--trv-surface-elevated); }
.mix-empty { width: 100%; background: repeating-linear-gradient(45deg, var(--trv-border) 0 6px, transparent 6px 12px); }
.mix-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.leg { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--trv-text-muted); }
.leg svg { color: var(--c); }
.leg b { color: var(--trv-text); font-weight: 800; }
.leg.empty { color: var(--trv-text-dim); font-style: italic; }

@media (prefers-reduced-motion: reduce) {
  .g-val, .g-needle, .mix-fill { transition: none; }
}
</style>
