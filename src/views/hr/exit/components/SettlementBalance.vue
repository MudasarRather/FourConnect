<template>
  <div ref="el" class="sb ex-grain">
    <svg viewBox="0 0 320 180" class="sb-svg" role="img" aria-label="Settlement balance">
      <defs>
        <linearGradient id="sbEarn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" /><stop offset="100%" stop-color="#34d39955" /></linearGradient>
        <linearGradient id="sbRec" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef4444" /><stop offset="100%" stop-color="#ef444455" /></linearGradient>
      </defs>
      <!-- stand -->
      <line x1="160" y1="36" x2="160" y2="150" class="sb-post" />
      <path d="M132 150 H188" class="sb-base" />
      <!-- beam (tilts toward heavier side) -->
      <g class="sb-beam" :style="{ '--tilt': tilt + 'deg' }">
        <line x1="56" y1="40" x2="264" y2="40" class="sb-bar" />
        <!-- left pan: earnings -->
        <line x1="56" y1="40" x2="56" y2="64" class="sb-cord" />
        <path d="M30 64 H82 L72 92 H40 Z" fill="url(#sbEarn)" class="sb-pan" />
        <!-- right pan: recoveries -->
        <line x1="264" y1="40" x2="264" y2="64" class="sb-cord" />
        <path d="M238 64 H290 L280 92 H248 Z" fill="url(#sbRec)" class="sb-pan" />
        <circle cx="160" cy="40" r="6" class="sb-pivot" />
      </g>
    </svg>
    <div class="sb-readout">
      <div class="sb-side"><span class="ss-lab earn">Earnings</span><span class="ss-val"><ExCountUp :value="earnings" :format="fmt" /></span></div>
      <div class="sb-net" :class="dir">
        <span class="sn-lab">{{ dir === 'recoverable' ? 'Recoverable' : dir === 'payable' ? 'Net payable' : 'Balanced' }}</span>
        <span class="sn-val"><ExCountUp :value="Math.abs(net)" :format="fmt" /></span>
      </div>
      <div class="sb-side"><span class="ss-lab rec">Recoveries</span><span class="ss-val"><ExCountUp :value="recoveries" :format="fmt" /></span></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ExCountUp from './ExCountUp.vue'
import { fmtINR } from '@/composables/useExit'

const props = defineProps({
  earnings: { type: Number, default: 0 },
  recoveries: { type: Number, default: 0 },
})
const el = ref(null)
const fmt = fmtINR
const net = computed(() => Number(props.earnings) - Number(props.recoveries))
const dir = computed(() => net.value > 0 ? 'payable' : net.value < 0 ? 'recoverable' : 'balanced')
const tilt = computed(() => {
  const total = Math.abs(props.earnings) + Math.abs(props.recoveries)
  if (!total) return 0
  const ratio = (props.recoveries - props.earnings) / total   // +ve → recoveries heavier → tilt right
  return Math.max(-12, Math.min(12, ratio * 12))
})
</script>

<style scoped>
.sb { position: relative; padding: 12px; border-radius: 16px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.sb-svg { width: 100%; height: auto; max-height: 180px; }
.sb-post { stroke: var(--ex-steel); stroke-width: 3; stroke-linecap: round; }
.sb-base { stroke: var(--ex-steel); stroke-width: 4; fill: none; stroke-linecap: round; }
.sb-beam { transform: rotate(var(--tilt, 0deg)); transform-origin: 160px 40px; transition: transform 1s var(--ex-spring); }
.sb-bar { stroke: var(--ex-violet); stroke-width: 4; stroke-linecap: round; }
.sb-cord { stroke: var(--ex-steel-dim); stroke-width: 1.5; }
.sb-pan { opacity: 0.85; stroke: rgba(255,255,255,0.25); stroke-width: 1; }
.sb-pivot { fill: var(--ex-violet-bright); filter: drop-shadow(0 0 6px var(--ex-violet)); }
.sb-readout { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; margin-top: 6px; }
.sb-side { display: flex; flex-direction: column; align-items: center; }
.ss-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.ss-lab.earn { color: var(--ex-cleared); } .ss-lab.rec { color: var(--ex-blocked); }
.ss-val { font-family: var(--ex-mono); font-size: 14px; font-weight: 800; color: var(--ex-text); }
.sb-net { display: flex; flex-direction: column; align-items: center; padding: 6px 14px; border-radius: 12px; }
.sb-net.payable { background: var(--ex-cleared-soft); } .sb-net.recoverable { background: var(--ex-blocked-soft); }
.sn-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); }
.sn-val { font-family: var(--ex-mono); font-size: 19px; font-weight: 850; }
.sb-net.payable .sn-val { color: var(--ex-cleared); } .sb-net.recoverable .sn-val { color: var(--ex-blocked); }
@media (prefers-reduced-motion: reduce) { .sb-beam { transition: none; } }
</style>
