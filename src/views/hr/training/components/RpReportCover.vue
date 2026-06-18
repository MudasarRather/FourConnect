<template>
  <div class="rpc" :style="{ '--a': accent, '--d': accentDeep || accent }" :data-motif="motif">
    <span class="rpc-sheen" aria-hidden="true" />
    <span class="rpc-grain trn-grain" aria-hidden="true" />

    <!-- BARS family: ledger · funnel · grid -->
    <div v-if="family === 'bars'" class="rpc-bars" :class="motif">
      <span v-for="(h, i) in barHeights" :key="i" class="rpc-bar" :style="{ '--h': h + '%', '--i': i }" />
    </div>

    <!-- FUEL: vault -->
    <div v-else-if="family === 'fuel'" class="rpc-fuel">
      <span class="rpc-fuel-spent" /><span class="rpc-fuel-comm" />
    </div>

    <!-- GAUGE family: dial · gauge · ratingarc -->
    <svg v-else-if="family === 'gauge'" class="rpc-gauge" viewBox="0 0 120 70" aria-hidden="true">
      <path d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="9" stroke-linecap="round" />
      <path class="rpc-arc" d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" />
      <circle class="rpc-needle" cx="60" cy="60" r="4" fill="#fff" />
    </svg>

    <!-- RINGS: radar -->
    <div v-else-if="family === 'rings'" class="rpc-rings">
      <span class="rr r1" /><span class="rr r2" /><span class="rr r3" /><span class="rr core" />
    </div>

    <!-- STARS: stars -->
    <div v-else-if="family === 'stars'" class="rpc-stars">
      <span v-for="i in 5" :key="i" class="rpc-star" :style="{ '--i': i }">★</span>
    </div>

    <!-- TIMELINE: timeline -->
    <div v-else-if="family === 'timeline'" class="rpc-timeline">
      <span class="rt s1" /><span class="rt s2" /><span class="rt s3" />
      <span class="rt-head" aria-hidden="true" />
    </div>

    <!-- PIPELINE: pipeline -->
    <div v-else class="rpc-pipe">
      <span class="rp-node" /><span class="rp-link"><i /></span>
      <span class="rp-node" /><span class="rp-link"><i style="animation-delay:.8s" /></span>
      <span class="rp-node" />
    </div>

    <component :is="icon" :size="22" class="rpc-icon" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  motif: { type: String, default: 'ledger' },
  accent: { type: String, default: '#fbbf24' },
  accentDeep: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
})

const FAMILY = {
  ledger: 'bars', funnel: 'bars', grid: 'bars', vault: 'fuel',
  dial: 'gauge', gauge: 'gauge', ratingarc: 'gauge',
  radar: 'rings', stars: 'stars', timeline: 'timeline', pipeline: 'pipeline',
}
const family = computed(() => FAMILY[props.motif] || 'bars')
const barHeights = computed(() => {
  if (props.motif === 'funnel') return [92, 74, 58, 42, 30]
  if (props.motif === 'grid') return [80, 64, 70, 50, 60]
  return [46, 72, 54, 88, 62] // ledger
})
</script>

<style scoped>
.rpc { position: relative; height: 100px; border-radius: 14px; overflow: hidden; display: grid; place-items: center;
  background: radial-gradient(130% 130% at 26% -16%, color-mix(in srgb, var(--a) 92%, #fff), var(--a) 55%, var(--d) 100%);
  isolation: isolate; }
.rpc-sheen { position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.5) 50%, transparent 62%);
  background-size: 240% 100%; animation: rpc-sheen 4.5s linear infinite; }
.rpc-grain { z-index: 1; opacity: 0.08; mix-blend-mode: overlay; }
.rpc-icon { position: absolute; right: 11px; bottom: 9px; z-index: 4; color: #1a1206;
  filter: drop-shadow(0 1px 4px rgba(26,18,6,0.35)); opacity: 0.92; }

/* bars */
.rpc-bars { position: relative; z-index: 2; display: flex; align-items: flex-end; gap: 6px; height: 56px; }
.rpc-bar { width: 10px; height: var(--h); border-radius: 3px 3px 1px 1px; background: rgba(26,18,6,0.82);
  transform-origin: bottom; animation: rpc-bar 2.4s var(--trn-spring) infinite; animation-delay: calc(var(--i) * 0.12s); }
.rpc-bars.grid .rpc-bar, .rpc-bars.funnel .rpc-bar { background: rgba(255,255,255,0.9); }

/* fuel */
.rpc-fuel { position: relative; z-index: 2; width: 70%; height: 16px; border-radius: 8px; overflow: hidden;
  background: rgba(255,255,255,0.35); display: flex; }
.rpc-fuel-spent { width: 0; background: rgba(26,18,6,0.82); animation: rpc-fuel-s 2.6s var(--trn-spring) infinite alternate; }
.rpc-fuel-comm { width: 0; background: rgba(255,255,255,0.9); animation: rpc-fuel-c 2.6s var(--trn-spring) infinite alternate; }

/* gauge */
.rpc-gauge { position: relative; z-index: 2; width: 118px; }
.rpc-arc { stroke-dasharray: 151; stroke-dashoffset: 151; animation: rpc-draw 2.8s var(--trn-spring) infinite alternate; }
.rpc-needle { transform-origin: 60px 60px; animation: rpc-needle 2.8s var(--trn-spring) infinite alternate; }

/* rings */
.rpc-rings { position: relative; z-index: 2; width: 64px; height: 64px; }
.rr { position: absolute; inset: 0; margin: auto; border-radius: 50%; border: 1.5px dashed rgba(255,255,255,0.7); }
.rr.r1 { width: 64px; height: 64px; animation: rpc-spin 9s linear infinite; }
.rr.r2 { width: 44px; height: 44px; border-color: rgba(26,18,6,0.5); animation: rpc-spin-r 7s linear infinite; }
.rr.r3 { width: 24px; height: 24px; border-style: solid; border-color: rgba(255,255,255,0.55); }
.rr.core { width: 10px; height: 10px; border: none; background: rgba(26,18,6,0.85); box-shadow: 0 0 10px rgba(26,18,6,0.5); }

/* stars */
.rpc-stars { position: relative; z-index: 2; display: flex; gap: 4px; font-size: 22px; color: rgba(26,18,6,0.85); }
.rpc-star { animation: rpc-twinkle 2.4s ease-in-out infinite; animation-delay: calc(var(--i) * 0.18s); }

/* timeline */
.rpc-timeline { position: relative; z-index: 2; display: flex; gap: 4px; width: 70%; height: 13px; }
.rt { height: 100%; border-radius: 4px; }
.rt.s1 { flex: 3; background: rgba(26,18,6,0.8); } .rt.s2 { flex: 2; background: rgba(255,255,255,0.85); } .rt.s3 { flex: 1; background: rgba(26,18,6,0.5); }
.rt-head { position: absolute; top: -4px; bottom: -4px; width: 3px; border-radius: 2px; background: #fff;
  box-shadow: 0 0 8px #fff; animation: rpc-play 3.2s var(--trn-ease) infinite; }

/* pipeline */
.rpc-pipe { position: relative; z-index: 2; display: flex; align-items: center; }
.rp-node { width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.92); border: 2px solid rgba(26,18,6,0.7); }
.rp-link { position: relative; width: 26px; height: 3px; background: rgba(26,18,6,0.4); border-radius: 2px; }
.rp-link i { position: absolute; top: 50%; left: 0; width: 5px; height: 5px; margin-top: -2.5px; border-radius: 50%; background: #1a1206;
  box-shadow: 0 0 6px #fff; animation: rpc-packet 1.6s var(--trn-ease) infinite; }

@keyframes rpc-sheen { 0% { background-position: 150% 0; } 100% { background-position: -60% 0; } }
@keyframes rpc-bar { 0%, 100% { transform: scaleY(0.78); } 50% { transform: scaleY(1.05); } }
@keyframes rpc-fuel-s { 0% { width: 20%; } 100% { width: 58%; } }
@keyframes rpc-fuel-c { 0% { width: 8%; } 100% { width: 24%; } }
@keyframes rpc-draw { 0% { stroke-dashoffset: 151; } 100% { stroke-dashoffset: 46; } }
@keyframes rpc-needle { 0% { transform: rotate(-86deg); } 100% { transform: rotate(28deg); } }
@keyframes rpc-spin { to { transform: rotate(360deg); } }
@keyframes rpc-spin-r { to { transform: rotate(-360deg); } }
@keyframes rpc-twinkle { 0%, 100% { opacity: 0.55; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes rpc-play { 0% { left: 2%; } 100% { left: 96%; } }
@keyframes rpc-packet { 0% { left: 0; opacity: 0; } 20% { opacity: 1; } 100% { left: 100%; opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .rpc-sheen, .rpc-bar, .rpc-fuel-spent, .rpc-fuel-comm, .rpc-arc, .rpc-needle, .rr, .rpc-star, .rt-head, .rp-link i { animation: none !important; }
  .rpc-arc { stroke-dashoffset: 64; } .rpc-fuel-spent { width: 52%; } .rpc-fuel-comm { width: 22%; }
}
</style>
