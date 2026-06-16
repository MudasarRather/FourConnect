<template>
  <div class="rcr" ref="rootRef">
    <div class="rcr-ring">
      <svg class="rcr-svg" :viewBox="`0 0 ${S} ${S}`">
        <defs>
          <filter :id="`${uid}-soft`" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" /></filter>
        </defs>
        <circle :cx="C" :cy="C" :r="R" fill="none" stroke="var(--rmb-grid-line)" :stroke-width="track + 2" />
        <g :transform="`rotate(-90 ${C} ${C})`">
          <circle v-for="(seg, i) in renderSegs" :key="seg.key" :cx="C" :cy="C" :r="R" fill="none"
            :stroke="seg.color" :stroke-width="hover === i ? track + 5 : track" stroke-linecap="butt"
            :stroke-dasharray="`${seg.len.toFixed(2)} ${(CIRC - seg.len).toFixed(2)}`"
            :stroke-dashoffset="(-seg.offset).toFixed(2)" class="rcr-seg"
            :class="{ dim: hover >= 0 && hover !== i }"
            @mouseenter="hover = i" @mouseleave="hover = -1" />
        </g>
      </svg>
      <div class="rcr-center">
        <span class="rc-eyebrow">{{ active ? active.name : 'Total' }}</span>
        <span class="rc-val rmb-mono">
          <span class="cur">₹</span><RmbCountUp :value="active ? active.amount : total" :decimals="0" />
        </span>
        <span class="rc-sub rmb-mono">{{ active ? (active.count + ' claim' + (active.count === 1 ? '' : 's')) : (rows.length + ' categories') }}</span>
      </div>
    </div>

    <div class="rcr-legend">
      <button v-for="(r, i) in rows" :key="r.key" class="leg" :class="{ on: hover === i }"
        @mouseenter="hover = i" @mouseleave="hover = -1">
        <span class="leg-dot" :style="{ background: r.color }" />
        <span class="leg-name">{{ r.name }}</span>
        <span class="leg-pct rmb-mono">{{ pct(r.amount) }}%</span>
        <span class="leg-bar"><i :style="{ width: pct(r.amount) + '%', background: r.color }" /></span>
        <span class="leg-amt rmb-mono">{{ fmtCompactINR(r.amount) }}</span>
      </button>
      <p v-if="!rows.length" class="rcr-empty">No category spend recorded yet.</p>
    </div>
  </div>
</template>

<script>
let _rcrUid = 0
</script>

<script setup>
import { ref, computed } from 'vue'
import RmbCountUp from './RmbCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'
import { fmtCompactINR } from '@/composables/useReimbursements'

const props = defineProps({
  // items: [{ name, color, count, amount }]
  items: { type: Array, default: () => [] },
})

const uid = `rcr-${_rcrUid++}`
const S = 200, C = S / 2, track = 18, R = C - 24
const CIRC = 2 * Math.PI * R
const GAP = CIRC * 0.014

const rootRef = ref(null)
const hover = ref(-1)
const { visible } = useInView(rootRef, { threshold: 0.3 })
const progress = computed(() => (visible.value ? 1 : 0))

const rows = computed(() =>
  props.items
    .map((r, i) => ({ key: r.key ?? i, name: r.name || '—', color: r.color || 'var(--rmb-amber)', count: Number(r.count) || 0, amount: Number(r.amount) || 0 }))
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount))

const total = computed(() => rows.value.reduce((a, r) => a + r.amount, 0))
const active = computed(() => (hover.value >= 0 ? rows.value[hover.value] : null))
const pct = (a) => (total.value > 0 ? Math.round((a / total.value) * 100) : 0)

const renderSegs = computed(() => {
  const t = total.value
  if (t <= 0) return []
  let offset = 0
  return rows.value.map((r, i) => {
    const raw = (r.amount / t) * CIRC
    const len = Math.max(0, raw - (rows.value.length > 1 ? GAP : 0)) * progress.value
    const seg = { key: r.key, color: r.color, offset, len }
    offset += raw
    return seg
  })
})
</script>

<style scoped>
.rcr { display: grid; grid-template-columns: 188px 1fr; gap: 18px; align-items: center; }
.rcr-ring { position: relative; width: 188px; height: 188px; display: grid; place-items: center; }
.rcr-svg { width: 100%; height: 100%; overflow: visible; }
.rcr-seg { transition: stroke-dasharray 1.1s var(--rmb-spring), stroke-dashoffset 1.1s var(--rmb-spring),
  stroke-width 0.3s var(--rmb-spring), opacity 0.3s; cursor: pointer;
  filter: drop-shadow(0 0 5px color-mix(in srgb, currentColor 0%, transparent)); }
.rcr-seg:hover { filter: drop-shadow(0 0 9px color-mix(in srgb, currentColor 55%, transparent)); }
.rcr-seg.dim { opacity: 0.32; }

.rcr-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; }
.rc-eyebrow { font-family: var(--rmb-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.rc-val { font-size: 22px; font-weight: 800; color: var(--rmb-money); display: inline-flex; align-items: baseline; gap: 1px; }
.rc-val .cur { font-size: 0.66em; opacity: 0.72; }
.rc-sub { font-size: 9px; color: var(--rmb-text-muted); margin-top: 2px; }

.rcr-legend { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.leg { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; grid-template-areas: "dot name pct" "dot bar amt"; column-gap: 8px; row-gap: 2px;
  align-items: center; padding: 6px 8px; border-radius: 9px; background: transparent; border: 1px solid transparent; cursor: pointer; text-align: left; transition: background 0.2s, border-color 0.2s; }
.leg:hover, .leg.on { background: var(--rmb-surface); border-color: var(--rmb-border-soft); }
.leg-dot { grid-area: dot; width: 9px; height: 9px; border-radius: 3px; }
.leg-name { grid-area: name; font-size: 12px; color: var(--rmb-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.leg.on .leg-name { color: var(--rmb-text); }
.leg-pct { grid-area: pct; font-size: 10.5px; color: var(--rmb-text-muted); justify-self: end; }
.leg-bar { grid-area: bar; height: 4px; border-radius: 999px; background: var(--rmb-grid-line); overflow: hidden; }
.leg-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.9s var(--rmb-ease); }
.leg-amt { grid-area: amt; font-size: 10.5px; color: var(--rmb-text); justify-self: end; }
.rcr-empty { color: var(--rmb-text-muted); font-size: 13px; padding: 12px 4px; }

@media (max-width: 560px) { .rcr { grid-template-columns: 1fr; justify-items: center; } }
@media (prefers-reduced-motion: reduce) { .rcr-seg, .leg-bar i { transition: stroke-width 0.3s, opacity 0.3s; } }
</style>
