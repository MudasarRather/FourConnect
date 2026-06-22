<template>
  <div class="fm">
    <div class="fm-window">
      <span class="fm-label trv-mono">DAILY ALLOWANCE</span>
      <div class="fm-readout trv-mono">
        <span class="fm-cur">₹</span><TrvCountUp :value="amount" />
      </div>
      <div class="fm-breakdown trv-mono">{{ days }}d × ₹{{ rate.toLocaleString('en-IN') }} · {{ tier }}</div>
    </div>
    <div class="fm-bezel">
      <span class="fm-tick" v-for="n in 14" :key="n" :class="{ lit: n <= litTicks }" />
    </div>
    <div class="fm-flag" :class="{ running }">
      <span class="fm-dot" /> {{ running ? 'METER RUNNING' : 'FOR HIRE' }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TrvCountUp from './TrvCountUp.vue'
const props = defineProps({
  amount: { type: Number, default: 0 },
  days: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  tier: { type: String, default: '—' },
  running: { type: Boolean, default: true },
})
const litTicks = computed(() => Math.min(14, Math.round((props.days || 0))))
</script>

<style scoped>
.fm { border-radius: 16px; overflow: hidden; background: linear-gradient(180deg, #15161a, #0c0c0e); border: 1px solid var(--trv-border-strong); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
.fm-window { padding: 18px 18px 10px; text-align: center; }
.fm-label { font-size: 9px; letter-spacing: 0.2em; color: var(--trv-text-dim); }
.fm-readout { font-size: 38px; font-weight: 850; color: var(--trv-flap-text); line-height: 1.05; text-shadow: 0 0 16px rgba(251,191,36,0.35); margin: 6px 0 4px; display: flex; align-items: baseline; justify-content: center; gap: 2px; }
.fm-cur { font-size: 22px; opacity: 0.7; }
.fm-breakdown { font-size: 11px; color: var(--trv-text-muted); }
.fm-bezel { display: flex; gap: 3px; padding: 8px 18px; justify-content: center; }
.fm-tick { width: 100%; height: 6px; border-radius: 2px; background: rgba(255,255,255,0.06); transition: background 0.3s; }
.fm-tick.lit { background: var(--trv-grad-hero); }
.fm-flag { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 8px; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--trv-text-dim); border-top: 1px solid var(--trv-flap-seam); }
.fm-flag.running { color: var(--trv-amber); }
.fm-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.fm-flag.running .fm-dot { animation: trv-blip 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .fm-flag.running .fm-dot { animation: none; } }
</style>
