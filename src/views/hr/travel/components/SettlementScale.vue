<template>
  <div class="ss">
    <svg viewBox="0 0 220 150" class="ss-svg" role="img" aria-label="Settlement balance">
      <!-- base -->
      <line x1="110" y1="30" x2="110" y2="120" stroke="var(--trv-border-strong)" stroke-width="3" stroke-linecap="round" />
      <path d="M86 124 L134 124 L128 132 L92 132 Z" fill="var(--trv-steel-soft)" stroke="var(--trv-border-strong)" />
      <!-- beam -->
      <g :style="{ transform: `rotate(${tilt}deg)`, transformOrigin: '110px 30px', transition: 'transform 0.9s var(--trv-spring)' }">
        <line x1="40" y1="30" x2="180" y2="30" stroke="var(--trv-amber)" stroke-width="3" stroke-linecap="round" />
        <circle cx="110" cy="30" r="5" fill="var(--trv-amber-bright)" />
        <!-- left pan (payable) -->
        <line x1="40" y1="30" x2="40" y2="58" stroke="var(--trv-border-strong)" stroke-width="1.5" />
        <path d="M22 58 A18 12 0 0 0 58 58 Z" fill="var(--trv-st-approved-soft)" stroke="var(--trv-st-approved)" stroke-width="1.5" />
        <!-- right pan (recoverable) -->
        <line x1="180" y1="30" x2="180" y2="58" stroke="var(--trv-border-strong)" stroke-width="1.5" />
        <path d="M162 58 A18 12 0 0 0 198 58 Z" fill="var(--trv-st-rejected-soft)" stroke="var(--trv-st-rejected)" stroke-width="1.5" />
      </g>
    </svg>
    <div class="ss-legend">
      <div class="ss-side payable"><span class="ss-lab">Payable</span><b class="trv-mono">{{ fmt(payable) }}</b></div>
      <div class="ss-verdict">{{ verdict }}</div>
      <div class="ss-side recover"><span class="ss-lab">Recoverable</span><b class="trv-mono">{{ fmt(recoverable) }}</b></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtINR } from '@/composables/useTravel'
const props = defineProps({ payable: { type: Number, default: 0 }, recoverable: { type: Number, default: 0 } })
const fmt = (n) => fmtINR(n)
const tilt = computed(() => {
  const p = Number(props.payable) || 0, r = Number(props.recoverable) || 0
  if (p === r) return 0
  return p > r ? -10 : 10
})
const verdict = computed(() => {
  const p = Number(props.payable) || 0, r = Number(props.recoverable) || 0
  if (p > 0) return 'Company owes employee'
  if (r > 0) return 'Employee owes company'
  return 'Balanced'
})
</script>

<style scoped>
.ss { display: flex; flex-direction: column; gap: 10px; }
.ss-svg { width: 100%; max-width: 240px; margin: 0 auto; }
.ss-legend { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.ss-side { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.ss-side.recover { text-align: right; }
.ss-lab { font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.ss-side.payable b { color: var(--trv-st-approved); }
.ss-side.recover b { color: var(--trv-st-rejected); }
.ss-side b { font-size: 15px; font-weight: 800; }
.ss-verdict { font-size: 10px; font-weight: 700; text-align: center; color: var(--trv-text-muted); max-width: 90px; }
</style>
