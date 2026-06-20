<template>
  <div class="arr" :class="{ live: live && !reduced }" :style="{ width: size + 'px', height: size + 'px' }" ref="rootEl">
    <span class="arr-track" :style="{ background: conic }" aria-hidden="true" />
    <span v-if="live && !reduced && total" class="arr-sheen" aria-hidden="true" />
    <span class="arr-hole">
      <b class="arr-pct"><AssetCountUp :value="coveragePct" :start="inView" :duration="1.4" suffix="%" /></b>
      <small>{{ label }}</small>
    </span>
    <template v-if="size >= 92">
      <span class="arr-tick" v-for="t in 60" :key="t" :style="{ transform: `rotate(${t * 6}deg)` }" aria-hidden="true" />
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({}) }, // { found, mismatch, damaged, missing, pending }
  size: { type: Number, default: 116 },
  thickness: { type: Number, default: 12 },
  label: { type: String, default: 'reconciled' },
  live: { type: Boolean, default: false },
})

const reduced = prefersReduced()
const rootEl = ref(null)
const { visible: inView } = useInView(rootEl, { threshold: 0.3 })

const SEG = [
  { k: 'found', c: 'var(--as-st-available)' },
  { k: 'mismatch', c: 'var(--as-st-reserved)' },
  { k: 'damaged', c: 'var(--as-al-damaged)' },
  { k: 'missing', c: 'var(--as-al-lost)' },
  { k: 'pending', c: 'color-mix(in srgb, var(--as-steel-dim) 38%, transparent)' },
]
const total = computed(() => SEG.reduce((s, x) => s + Number(props.counts?.[x.k] || 0), 0))
const conic = computed(() => {
  if (!total.value) return `conic-gradient(color-mix(in srgb, var(--as-steel-dim) 30%, transparent) 0 100%)`
  let acc = 0
  const stops = []
  for (const seg of SEG) {
    const n = Number(props.counts?.[seg.k] || 0)
    if (!n) continue
    const start = (acc / total.value) * 100
    acc += n
    const end = (acc / total.value) * 100
    stops.push(`${seg.c} ${start.toFixed(2)}% ${end.toFixed(2)}%`)
  }
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
})
const coveragePct = computed(() => {
  if (!total.value) return 0
  const scanned = ['found', 'mismatch', 'damaged', 'missing'].reduce((s, k) => s + Number(props.counts?.[k] || 0), 0)
  return Math.round((scanned / total.value) * 100)
})
const holeInset = computed(() => `${props.thickness}px`)
</script>

<style scoped>
.arr { position: relative; border-radius: 50%; display: grid; place-items: center; }
.arr-track { position: absolute; inset: 0; border-radius: 50%; -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - v-bind(holeInset)), #000 calc(100% - v-bind(holeInset))); mask: radial-gradient(farthest-side, transparent calc(100% - v-bind(holeInset)), #000 calc(100% - v-bind(holeInset))); transition: background 0.6s var(--as-ease); }
.arr-sheen { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; z-index: 2;
  background: conic-gradient(from 0deg, transparent 0 78%, color-mix(in srgb, #fff 45%, transparent) 90%, transparent 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - v-bind(holeInset)), #000 calc(100% - v-bind(holeInset))); mask: radial-gradient(farthest-side, transparent calc(100% - v-bind(holeInset)), #000 calc(100% - v-bind(holeInset)));
  mix-blend-mode: overlay; animation: arr-spin 4.5s linear infinite; }
.arr-hole { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.arr-pct { font-size: calc(v-bind(size) * 0.205px); font-weight: 850; color: var(--as-text); font-variant-numeric: tabular-nums; }
.arr-hole small { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.arr-tick { position: absolute; top: 1px; left: 50%; width: 1px; height: 4px; margin-left: -0.5px; transform-origin: 50% calc(v-bind(size) * 0.5px); background: var(--as-border-strong); opacity: 0.4; pointer-events: none; }

@keyframes arr-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .arr-sheen { animation: none; } }
</style>
