<template>
  <section class="qag sd-card">
    <header class="qag-head">
      <span class="qag-title sd-mono"><Hourglass :size="12" /> TICKET AGE · <b>OPEN WORK</b></span>
      <span class="qag-sub sd-mono">{{ total }} OPEN</span>
    </header>

    <div class="qag-bars">
      <div v-for="(b, i) in bars" :key="b.key" class="qag-col" :class="{ hot: b.key === 'gt_3d' && b.n > 0 }"
        :title="`${b.label}: ${b.n} open ticket(s)`">
        <span class="qag-n sd-mono">{{ b.n }}</span>
        <span class="qag-bar" :style="{ height: b.h + '%', '--d': (i * 0.08) + 's' }" />
        <span class="qag-l sd-mono">{{ b.label }}</span>
      </div>
    </div>
    <p v-if="dredge" class="qag-dredge sd-mono">⚠ {{ dredge }} TICKET{{ dredge === 1 ? '' : 'S' }} OLDER THAN 3 DAYS — CLEAR THE OLDEST FIRST</p>
  </section>
</template>

<script setup>
/* SdVitalsAging — the fleet aging histogram: five grow-in columns from <1h to >3d;
   the sediment (>3d) column pulses red while anything is rotting. Fed by overview.aging. */
import { computed } from 'vue'
import { Hourglass } from 'lucide-vue-next'

const props = defineProps({
  aging: { type: Object, default: () => ({}) },   // {lt_1h,h1_4,h4_24,d1_3,gt_3d}
})

const LABELS = [['lt_1h', '<1H'], ['h1_4', '1–4H'], ['h4_24', '4–24H'], ['d1_3', '1–3D'], ['gt_3d', '>3D']]
const total = computed(() => LABELS.reduce((a, [k]) => a + (props.aging[k] || 0), 0))
const bars = computed(() => {
  const max = Math.max(1, ...LABELS.map(([k]) => props.aging[k] || 0))
  return LABELS.map(([key, label]) => {
    const n = props.aging[key] || 0
    return { key, label, n, h: Math.max(n ? 8 : 3, Math.round((n / max) * 100)) }
  })
})
const dredge = computed(() => props.aging.gt_3d || 0)
</script>

<style scoped>
.qag { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
.qag-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 13px 16px; border-bottom: 1px solid var(--sd-border); }
.qag-title { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; letter-spacing: 0.18em;
  font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; }
.qag-title b { color: var(--sd-qv-core); }
.qag-sub { font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.qag-bars { display: flex; gap: 8px; align-items: flex-end; height: 128px; padding: 16px 16px 10px; flex: 1; }
.qag-col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 5px;
  height: 100%; }
.qag-n { font-size: 11.5px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.qag-bar { width: 100%; border-radius: 6px 6px 3px 3px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--sd-qv-core), color-mix(in srgb, var(--sd-qv-core) 22%, transparent));
  animation: qag-grow 1s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--d); }
.qag-col.hot .qag-bar { background: linear-gradient(180deg, var(--sd-qv-halt), color-mix(in srgb, var(--sd-qv-halt) 20%, transparent));
  animation: qag-grow 1s cubic-bezier(0.16, 1, 0.3, 1) both, qag-pulse 2.4s ease-in-out 1.4s infinite; }
.qag-l { font-size: 8px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.qag-dredge { margin: 0; padding: 9px 16px 12px; font-size: 8.5px; letter-spacing: 0.14em;
  color: var(--sd-qv-halt); font-weight: 800; }

@keyframes qag-grow { from { transform: scaleY(0); } }
@keyframes qag-pulse { 50% { filter: brightness(1.35); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qag-bar { animation: none; }
}
</style>
