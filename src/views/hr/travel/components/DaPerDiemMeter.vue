<template>
  <div ref="root" class="meter trv-grain">
    <span class="meter-sheen" aria-hidden="true" />

    <!-- ── header ── -->
    <div class="meter-head">
      <span class="m-eyebrow"><Vault :size="12" /> Per-diem treasury</span>
      <span class="m-pending" :class="{ live: pending > 0 }">
        <i class="mp-dot" /> {{ pending }} awaiting approval
      </span>
    </div>

    <!-- ── ring + readout (side by side — headline OUTSIDE the ring, no overlap) ── -->
    <div class="meter-main">
      <div class="meter-core">
        <span class="core-glow" aria-hidden="true" />
        <svg class="core-ring" viewBox="0 0 150 150" role="img" aria-label="DA pipeline split">
          <circle class="ring-track" cx="75" cy="75" :r="R" />
          <circle v-for="s in arcs" :key="s.key" class="ring-arc" :class="{ shown }" cx="75" cy="75" :r="R"
            :stroke="s.hex" :stroke-dasharray="shown ? `${s.len} ${C}` : `0 ${C}`" :stroke-dashoffset="-s.start"
            :style="{ transitionDelay: s.delay + 's' }" />
        </svg>
        <div class="core-center">
          <DaOdometer v-if="grandTotal > 0" :value="paidPct" prefix="" class="cc-pct" />
          <span v-else class="cc-pct trv-mono">0</span>
          <span class="cc-unit">{{ grandTotal > 0 ? '% settled' : 'no DA yet' }}</span>
        </div>
      </div>

      <div class="meter-readout">
        <span class="mr-lab">Total daily allowance</span>
        <DaOdometer :value="grandTotal" class="mr-odo" />
        <div class="mr-chips">
          <span class="mr-chip payable"><Banknote :size="11" /> {{ compactRupee(payable) }} payable</span>
          <span class="mr-chip settled"><BadgeCheck :size="11" /> {{ compactRupee(paid) }} settled</span>
        </div>
        <div class="meter-legend">
          <span v-for="seg in segments" :key="seg.key" class="mleg" :style="{ '--c': seg.hex }">
            <i class="mleg-dot" /> {{ seg.label }} <b class="trv-mono">{{ compactRupee(seg.val) }}</b>
          </span>
        </div>
      </div>
    </div>

    <!-- ── city-tier rate card ── -->
    <div class="meter-eq">
      <span class="eq-title trv-mono"><MapPin :size="11" /> City-tier rate card · ₹/day</span>
      <div class="eq-bars">
        <div v-for="(t, i) in eqTiers" :key="t.label" class="eq-col" :style="{ '--c': t.hex }">
          <span class="eq-val trv-mono">{{ t.rate ? compact(t.rate) : '—' }}</span>
          <div class="eq-track">
            <span class="eq-fill" :class="{ shown }" :style="{ height: (shown ? t.pct : 0) + '%', transitionDelay: (0.15 + i * 0.08) + 's' }" />
          </div>
          <span class="eq-lab">{{ t.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Vault, Banknote, BadgeCheck, MapPin } from 'lucide-vue-next'
import DaOdometer from './DaOdometer.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { fmtCompactINR, CITY_CATEGORIES } from '@/composables/useTravel'

const props = defineProps({
  total: { type: Number, default: 0 },          // payable (APPROVED but not yet paid)
  segments: { type: Array, default: () => [] }, // [{ key,label,val,hex }]
  pending: { type: Number, default: 0 },
  tiers: { type: Array, default: () => [] },     // [{ key,label,hex,rate }]
})

const root = ref(null)
const shown = ref(false)
const R = 58
const C = 2 * Math.PI * R

const compact = (n) => fmtCompactINR(n).replace('₹', '')
const compactRupee = (n) => fmtCompactINR(n)

const payable = computed(() => Number(props.total) || 0)
const grandTotal = computed(() => props.segments.reduce((a, s) => a + (Number(s.val) || 0), 0))
const paid = computed(() => Number(props.segments.find(s => s.key === 'paid')?.val) || 0)
const paidPct = computed(() => grandTotal.value > 0 ? Math.round((paid.value / grandTotal.value) * 100) : 0)

const arcs = computed(() => {
  const segs = props.segments.filter(s => Number(s.val) > 0)
  const base = segs.reduce((a, s) => a + Number(s.val), 0) || 1
  let cursor = 0
  return segs.map((s, i) => {
    const frac = Number(s.val) / base
    const len = frac * C
    const start = cursor * C
    cursor += frac
    return { ...s, len, start, delay: 0.12 + i * 0.18 }
  })
})

const eqTiers = computed(() => {
  const src = props.tiers.length ? props.tiers
    : CITY_CATEGORIES.map(c => ({ key: c.key, label: c.label, hex: c.hex, rate: 0 }))
  const max = Math.max(1, ...src.map(t => Number(t.rate) || 0))
  return src.map(t => ({ ...t, pct: Math.max(6, (Number(t.rate) || 0) / max * 100) }))
})

onMounted(() => {
  if (prefersReduced()) { shown.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true }))
})
</script>

<style scoped>
.meter {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 15px;
  width: 100%; padding: 18px 20px; border-radius: 20px;
  background:
    radial-gradient(120% 90% at 88% 0%, color-mix(in srgb, var(--trv-amber) 12%, transparent), transparent 60%),
    linear-gradient(158deg, color-mix(in srgb, var(--trv-amber) 7%, var(--trv-surface)), var(--trv-panel));
  border: 1px solid var(--trv-border-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), var(--trv-card-shadow);
}
.meter-sheen {
  position: absolute; inset: -60% 30% 60% -30%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 60% at 30% 20%, rgba(251, 191, 36, 0.14), transparent 70%);
  animation: trv-aura-drift 11s ease-in-out infinite;
}

/* header */
.meter-head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.m-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); }
.m-pending { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; color: var(--trv-text-muted); padding: 3px 10px; border-radius: 999px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.mp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trv-steel); }
.m-pending.live { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.m-pending.live .mp-dot { background: var(--trv-amber); box-shadow: 0 0 8px var(--trv-amber); animation: trv-beacon 1.7s ease-in-out infinite; }

/* ring + readout */
.meter-main { position: relative; z-index: 1; display: flex; align-items: center; gap: 20px; }
.meter-core { position: relative; width: 132px; height: 132px; flex-shrink: 0; display: grid; place-items: center; }
.core-glow {
  position: absolute; inset: -8%; border-radius: 50%; pointer-events: none; opacity: 0.7;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--trv-amber) 22%, transparent), transparent 38%);
  animation: m-rot 16s linear infinite;
}
.core-ring { position: relative; width: 132px; height: 132px; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: color-mix(in srgb, var(--trv-text) 9%, transparent); stroke-width: 11; }
.ring-arc {
  fill: none; stroke-width: 11; stroke-linecap: round;
  transition: stroke-dasharray 1.1s cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 45%, transparent));
}
.core-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.cc-pct { font-size: 30px; font-weight: 850; color: var(--trv-text); line-height: 1; --odo-color: var(--trv-text); }
.cc-unit { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }

.meter-readout { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.mr-lab { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); }
.mr-odo { font-size: 32px; --odo-color: var(--trv-amber-strong); }
.mr-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px; }
.mr-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 7px; }
.mr-chip.payable { color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.mr-chip.settled { color: var(--trv-st-completed); background: var(--trv-st-completed-soft); border: 1px solid color-mix(in srgb, var(--trv-st-completed) 30%, transparent); }

.meter-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; }
.mleg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.mleg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px color-mix(in srgb, var(--c) 55%, transparent); }
.mleg b { color: var(--trv-text); font-weight: 800; }

/* rate card */
.meter-eq { position: relative; z-index: 1; border-top: 1px solid var(--trv-border); padding-top: 13px; }
.eq-title { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trv-text-muted); margin-bottom: 11px; }
.eq-bars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: end; }
.eq-col { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.eq-val { font-size: 12px; font-weight: 850; color: var(--trv-text); }
.eq-track { width: 100%; height: 54px; border-radius: 8px; background: color-mix(in srgb, var(--trv-text) 6%, transparent); border: 1px solid var(--trv-border); display: flex; align-items: flex-end; overflow: hidden; }
.eq-fill { width: 100%; border-radius: 7px 7px 0 0; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 60%, transparent)); transition: height 0.9s cubic-bezier(0.16, 1, 0.3, 1); position: relative; box-shadow: 0 0 10px color-mix(in srgb, var(--c) 40%, transparent); }
.eq-fill::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent 40%); opacity: 0.5; animation: eq-shimmer 3.4s ease-in-out infinite; }
.eq-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; color: var(--trv-text-muted); }

@keyframes eq-shimmer { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.6; } }
@keyframes m-rot { to { transform: rotate(360deg); } }

@media (max-width: 520px) {
  .meter-main { flex-direction: column; gap: 14px; }
  .meter-readout { width: 100%; align-items: center; text-align: center; }
  .meter-legend { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .meter-sheen, .core-glow, .ring-arc, .eq-fill, .eq-fill::after, .m-pending.live .mp-dot { animation: none; transition: none; }
}
</style>
