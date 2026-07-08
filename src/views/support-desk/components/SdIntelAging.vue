<template>
  <!-- Dwell time — the left-luggage rack. How long the active desk has been
       standing in the hall: each shelf's bar fills with a travelling sheen,
       counts sit on miniature flap cells, and anything past 3 days trips the
       LEFT LUGGAGE lamp. -->
  <div class="sd-iag">
    <div class="iag-head">
      <span class="iag-total"><SdCountUp :value="totalActive" /><em>waiting in the hall</em></span>
      <span class="iag-lamp sd-mono" :class="{ warn: stale > 0 }">
        <i aria-hidden="true" />{{ stale > 0 ? 'LEFT LUGGAGE' : 'ALL CLEAR' }}
      </span>
    </div>

    <div v-for="(b, i) in bars" :key="b.key" class="ag-row" :class="{ zero: !b.value, hot: b.hot && b.value }" :style="{ '--i': i }">
      <span class="ag-k sd-mono">{{ b.key }}</span>
      <span class="ag-track">
        <i class="ag-fill" :style="{ width: b.pct + '%', background: b.color, animationDelay: `${i * 0.09}s` }">
          <em class="ag-sheen" aria-hidden="true" />
        </i>
      </span>
      <span class="ag-pct sd-mono">{{ b.share }}%</span>
      <span class="ag-flap"><SdIntelFlap :value="b.value" :min-cells="2" size="sm" :tone="b.hot && b.value ? 'dn' : ''" :boot-delay="150 + i * 110" /></span>
    </div>

    <p class="ag-note sd-mono" :class="{ warn: stale > 0 }">
      {{ stale > 0 ? `${stale} TICKET${stale === 1 ? '' : 'S'} STANDING OVER 3 DAYS — CLEAR THE RACK` : 'NO LONG-STAY TICKETS ON THE FLOOR' }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SdCountUp from './SdCountUp.vue'
import SdIntelFlap from './SdIntelFlap.vue'

const props = defineProps({
  aging: { type: Object, default: () => ({}) },  // { '<4h', '4-24h', '1-3d', '3-7d', '>7d' }
})

const ORDER = ['<4h', '4-24h', '1-3d', '3-7d', '>7d']
const COLORS = ['var(--intel-up)', 'var(--intel-bright)', 'var(--intel)', 'var(--intel-deep)', 'var(--intel-dn)']
const totalActive = computed(() => ORDER.reduce((a, k) => a + (props.aging?.[k] || 0), 0))
const bars = computed(() => {
  const max = Math.max(1, ...ORDER.map(k => props.aging?.[k] || 0))
  return ORDER.map((k, i) => {
    const v = props.aging?.[k] || 0
    return {
      key: k, value: v, color: COLORS[i], hot: i >= 3,
      pct: Math.round((v / max) * 100),
      share: totalActive.value ? Math.round((v / totalActive.value) * 100) : 0,
    }
  })
})
const stale = computed(() => (props.aging?.['3-7d'] || 0) + (props.aging?.['>7d'] || 0))
</script>

<style scoped>
.sd-iag { display: flex; flex-direction: column; gap: 9px; }

.iag-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 2px; }
.iag-total { font-size: 24px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; }
.iag-total em { font-style: normal; font-size: 10.5px; font-weight: 600; color: var(--sd-text-dim); margin-left: 7px; letter-spacing: 0.06em; }
.iag-lamp { display: inline-flex; align-items: center; gap: 6px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em;
  padding: 4px 10px; border-radius: 999px; color: var(--intel-up);
  border: 1px solid color-mix(in srgb, var(--intel-up) 35%, transparent);
  background: color-mix(in srgb, var(--intel-up) 7%, transparent); }
.iag-lamp i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.iag-lamp.warn { color: var(--intel-dn);
  border-color: color-mix(in srgb, var(--intel-dn) 40%, transparent);
  background: color-mix(in srgb, var(--intel-dn) 8%, transparent); }
.iag-lamp.warn i { animation: sd-iag-lamp 1.3s steps(2, jump-none) infinite; }
@keyframes sd-iag-lamp { 50% { opacity: 0.3; } }

.ag-row { display: grid; grid-template-columns: 44px 1fr 34px auto; align-items: center; gap: 10px;
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.06s);
  transition: opacity 0.2s; }
.ag-row.zero { opacity: 0.5; }
.ag-k { font-size: 10px; color: var(--sd-text-muted); letter-spacing: 0.06em; }
.ag-row.hot .ag-k { color: var(--intel-dn); font-weight: 700; }
.ag-track { height: 10px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.ag-fill { position: relative; display: block; height: 100%; border-radius: 999px; transform-origin: left; overflow: hidden;
  box-shadow: 0 0 10px color-mix(in srgb, var(--intel) 30%, transparent);
  animation: sd-bar-grow 0.8s var(--sd-spring) backwards; transition: width 0.5s var(--sd-spring); }
.ag-sheen { position: absolute; top: 0; bottom: 0; width: 34%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: sd-iag-sheen 2.6s ease-in-out infinite; animation-delay: inherit; }
@keyframes sd-iag-sheen { 0% { left: -40%; } 55%, 100% { left: 110%; } }
.ag-pct { font-size: 9px; color: var(--sd-text-dim); text-align: right; letter-spacing: 0.04em; }

.ag-note { margin: 2px 0 0; font-size: 9px; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.ag-note.warn { color: var(--intel-dn); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ag-row, html:not([data-cinematic="on"]) .ag-fill,
  html:not([data-cinematic="on"]) .ag-sheen, html:not([data-cinematic="on"]) .iag-lamp.warn i { animation: none; }
}
</style>
