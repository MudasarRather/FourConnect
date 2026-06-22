<template>
  <div ref="root" class="mm">
    <div class="mm-head">
      <span class="mm-title trv-mono">{{ title }}</span>
      <span class="mm-est trv-mono">{{ fmtINR(estimated) }}</span>
    </div>

    <!-- estimated reference -->
    <div class="mm-row ref">
      <span class="mm-lab"><Target :size="12" /> Estimated budget</span>
      <span class="mm-track"><i class="mm-fill ref" :class="{ shown }" /></span>
      <span class="mm-val trv-mono">{{ fmtCompactINR(estimated) }}</span>
    </div>

    <!-- disbursement components, scaled to the estimate -->
    <div v-for="(it, i) in items" :key="it.label" class="mm-row" :style="{ '--c': it.hex }">
      <span class="mm-lab"><component :is="it.icon" v-if="it.icon" :size="12" /> {{ it.label }}</span>
      <span class="mm-track"><i class="mm-fill" :class="{ shown }" :style="{ width: (shown ? pct(it.value) : 0) + '%', transitionDelay: (0.1 + i * 0.08) + 's' }" /></span>
      <span class="mm-val trv-mono">{{ fmtCompactINR(it.value) }}</span>
    </div>

    <p class="mm-note"><Info :size="12" /> {{ note }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Target, Info } from 'lucide-vue-next'
import { fmtINR, fmtCompactINR } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  estimated: { type: Number, default: 0 },
  items: { type: Array, default: () => [] }, // [{ label, value, hex, icon? }]
  title: { type: String, default: 'BUDGET MAP' },
  note: { type: String, default: 'DA is a fixed per-diem; flights, hotel & local settle via booking and actual bills — so disbursed totals won’t equal the estimate.' },
})

const root = ref(null)
const shown = ref(false)
const pct = (v) => {
  const base = Number(props.estimated) || 0
  if (base <= 0) return Math.min(100, Number(v) > 0 ? 100 : 0)
  return Math.min(100, Math.max(0, (Number(v) || 0) / base * 100))
}
onMounted(() => {
  if (prefersReduced()) { shown.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true }))
})
</script>

<style scoped>
.mm { display: flex; flex-direction: column; gap: 9px; }
.mm-head { display: flex; align-items: baseline; justify-content: space-between; }
.mm-title { font-size: 9px; letter-spacing: 0.16em; color: var(--trv-text-dim); }
.mm-est { font-size: 14px; font-weight: 800; color: var(--trv-text); }
.mm-row { display: grid; grid-template-columns: 124px 1fr 58px; align-items: center; gap: 9px; }
.mm-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-lab svg { color: var(--c, var(--trv-text-dim)); flex-shrink: 0; }
.mm-row.ref .mm-lab svg { color: var(--trv-text-dim); }
.mm-track { height: 8px; border-radius: 999px; background: var(--trv-steel-soft); overflow: hidden; }
.mm-fill { display: block; height: 100%; border-radius: 999px; width: 0; background: var(--c, var(--trv-amber)); transition: width 0.9s cubic-bezier(0.16,1,0.3,1); }
.mm-fill.ref { width: 0; background: repeating-linear-gradient(90deg, var(--trv-steel) 0 6px, transparent 6px 10px); opacity: 0.5; }
.mm-fill.ref.shown { width: 100%; }
.mm-val { font-size: 11.5px; font-weight: 700; color: var(--trv-text-secondary); text-align: right; font-variant-numeric: tabular-nums; }
.mm-row.ref .mm-val { color: var(--trv-text); }
.mm-note { display: flex; align-items: flex-start; gap: 6px; font-size: 10.5px; color: var(--trv-text-dim); line-height: 1.45; margin: 2px 0 0; }
.mm-note svg { flex-shrink: 0; margin-top: 1px; color: var(--trv-amber); }
@media (prefers-reduced-motion: reduce) { .mm-fill, .mm-fill.ref { transition: none; } }
</style>
