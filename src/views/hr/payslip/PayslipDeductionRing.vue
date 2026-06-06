<template>
  <div class="ring-wrap">
    <svg viewBox="0 0 120 120" class="ring">
      <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="14" />
      <circle v-for="(s, i) in segs" :key="i" cx="60" cy="60" r="46" fill="none" :stroke="s.color"
        stroke-width="14" :stroke-dasharray="`${s.len} ${circ - s.len}`" :stroke-dashoffset="-s.offset"
        transform="rotate(-90 60 60)" class="seg" />
      <text x="60" y="55" text-anchor="middle" class="cap">Net</text>
      <text x="60" y="73" text-anchor="middle" class="val">{{ netPct }}%</text>
    </svg>
    <ul class="legend">
      <li><span class="dot" style="background:var(--pay-net)" />Net pay <b>{{ inrShort(net) }}</b></li>
      <li><span class="dot" style="background:var(--pay-deduction)" />Deductions <b>{{ inrShort(deductions) }}</b></li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { inrShort } from '@/composables/usePayroll'
const props = defineProps({ gross: { default: 0 }, deductions: { default: 0 }, net: { default: 0 } })
const circ = 2 * Math.PI * 46
const total = computed(() => Number(props.net || 0) + Number(props.deductions || 0) || 1)
const netPct = computed(() => Math.round((Number(props.net || 0) / total.value) * 100))
const segs = computed(() => {
  const data = [
    { raw: Number(props.net || 0), color: 'var(--pay-net)' },
    { raw: Number(props.deductions || 0), color: 'var(--pay-deduction)' },
  ]
  let offset = 0
  return data.map(d => { const len = (d.raw / total.value) * circ; const s = { ...d, len, offset }; offset += len; return s })
})
</script>

<style scoped>
.ring-wrap { display: flex; align-items: center; gap: 18px; }
.ring { width: 130px; height: 130px; flex-shrink: 0; }
.seg { transition: stroke-dasharray 0.8s var(--pay-ease); }
.cap { fill: var(--pay-text-muted); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; }
.val { fill: var(--pay-net); font-size: 18px; font-weight: 800; font-family: var(--pay-mono); }
.legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--pay-text-2); }
.dot { width: 10px; height: 10px; border-radius: 3px; }
.legend b { margin-left: auto; font-family: var(--pay-mono); color: var(--pay-text); padding-left: 16px; }
</style>
