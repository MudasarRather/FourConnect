<template>
  <div class="gs" :class="{ idle: !items.length }">
    <!-- side-elevation approach scope: distance × altitude, NOT a top-down radar -->
    <div ref="stageEl" class="gs-stage">
      <span class="gs-sky" aria-hidden="true" />
      <span class="gs-ground" aria-hidden="true" />
      <span class="gs-scan" aria-hidden="true" />

      <svg class="gs-svg" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="gs-beam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fbbf24" stop-opacity="0" />
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.22" />
          </linearGradient>
          <linearGradient id="gs-rwy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fbbf24" stop-opacity="0" />
            <stop offset="100%" stop-color="#fcd34d" stop-opacity="0.9" />
          </linearGradient>
        </defs>

        <!-- altitude reference rungs -->
        <line v-for="r in 4" :key="'alt' + r" class="gs-rung"
          :x1="22" :y1="40 + r * 30" :x2="298" :y2="40 + r * 30" />

        <!-- the ILS beam wedge around the glide centerline -->
        <path class="gs-wedge" d="M40 38 L272 142 L272 158 L40 50 Z" fill="url(#gs-beam)" />
        <!-- glide-slope centerline -->
        <line class="gs-slope" x1="40" y1="44" x2="270" y2="150" />

        <!-- runway threshold + receding strip -->
        <path class="gs-strip" d="M268 150 L296 150 L284 168 L256 168 Z" fill="url(#gs-rwy)" />
        <line class="gs-thresh" x1="256" y1="168" x2="296" y2="168" />
      </svg>

      <!-- PAPI guidance lights at the threshold -->
      <div class="gs-papi" aria-hidden="true">
        <i v-for="p in 4" :key="'papi' + p" class="gs-papi-dot" :style="{ animationDelay: p * 0.18 + 's' }" />
      </div>

      <!-- plotted inbound traffic -->
      <button
        v-for="b in blips" :key="b.id" type="button"
        class="gs-craft" :class="{ urgent: b.urgent, hot: hoverId === b.id }"
        :style="{ left: b.x + '%', top: b.y + '%', '--d': b.delay + 's' }"
        @mouseenter="hoverId = b.id" @mouseleave="hoverId = null"
        @click="$emit('focus', b.id)"
      >
        <Plane class="gs-plane" :size="b.urgent ? 15 : 13" />
        <span class="gs-vapor" aria-hidden="true" />
      </button>

      <!-- HUD read-out -->
      <div class="gs-hud trv-mono" aria-hidden="true">
        <span class="gs-hud-l">GLIDE&nbsp;PATH · ILS</span>
        <span class="gs-hud-r"><i class="gs-live" /> {{ items.length }} INBOUND</span>
      </div>

      <!-- hover tooltip -->
      <Transition name="gs-tip">
        <div v-if="hovered" class="gs-tip" :style="tipStyle">
          <span class="gs-tip-ref trv-mono">{{ hovered.ref }}</span>
          <span class="gs-tip-route trv-mono">{{ hovered.from }} → {{ hovered.to }}</span>
          <span class="gs-tip-meta">
            <span class="gs-tip-dot" :class="hovered.urgent ? 'red' : 'amber'" />
            {{ hovered.who }} · {{ hovered.cost }}
          </span>
        </div>
      </Transition>
    </div>

    <div class="gs-cap">
      <span class="gs-cap-line"><span class="gs-cap-dot red" /> On final <b>{{ finalCount }}</b></span>
      <span class="gs-cap-line"><span class="gs-cap-dot amber" /> Inbound <b>{{ items.length - finalCount }}</b></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plane } from 'lucide-vue-next'
import { airportCode, fmtCompactINR } from '@/composables/useTravel'

const props = defineProps({
  items: { type: Array, default: () => [] },   // pending request objects
})
defineEmits(['focus'])

const stageEl = ref(null)
const hoverId = ref(null)

const URGENT = new Set(['HIGH', 'URGENT'])
const FINAL_HRS = 48

// hours a request has been waiting on the manager's desk
const hoursWaiting = (r) => {
  const t = r.submitted_at || r.created_at
  if (!t) return 0
  const h = (Date.now() - new Date(t).getTime()) / 3.6e6
  return h > 0 ? h : 0
}

// cost spread → small altitude offset so equally-aged craft don't collide
const costs = computed(() => props.items.map(r => Number(r.est_total_cost || 0)))
const maxCost = computed(() => Math.max(1, ...costs.value))

const blips = computed(() => props.items.map((r, i) => {
  const h = hoursWaiting(r)
  // aging → progress down the glide slope (newer far/high, older near threshold)
  const t = Math.min(0.94, Math.max(0.06, h / 72))
  // glide centerline: far (12.5%, 22%) → threshold (84%, 75%)
  const baseX = 12.5 + 71.5 * t
  const baseY = 22 + 53 * t
  // altitude lift by relative cost (pricier rides ride a touch higher)
  const lift = (Number(r.est_total_cost || 0) / maxCost.value) * 7
  // gentle deterministic stagger so a busy slope reads as separate craft
  const seed = (String(r.id).charCodeAt(0) || 3) + (String(r.id).charCodeAt(3) || 7)
  const jitter = ((seed % 7) - 3) * 1.1
  return {
    id: r.id,
    x: Math.min(90, Math.max(8, baseX + jitter)),
    y: Math.min(80, Math.max(14, baseY - lift + jitter * 0.4)),
    urgent: URGENT.has(r.priority) || h >= FINAL_HRS,
    delay: ((i % 6) * 0.22).toFixed(2),
    ref: r.travel_reference_number,
    from: airportCode(r.from_location),
    to: airportCode(r.to_location),
    who: (r.employee_name || '—').split(/\s+/)[0],
    cost: fmtCompactINR(r.est_total_cost),
  }
}))

const finalCount = computed(() => props.items.filter(r => hoursWaiting(r) >= FINAL_HRS || URGENT.has(r.priority)).length)
const hovered = computed(() => blips.value.find(b => b.id === hoverId.value) || null)
const tipStyle = computed(() => {
  if (!hovered.value) return {}
  const onRight = hovered.value.x > 56
  return {
    left: hovered.value.x + '%',
    top: hovered.value.y + '%',
    transform: `translate(${onRight ? '-104%' : '6%'}, -116%)`,
  }
})
</script>

<style scoped>
.gs { display: flex; flex-direction: column; gap: 11px; width: 100%; }
.gs-stage {
  position: relative; width: 100%; aspect-ratio: 16 / 10; border-radius: 18px;
  overflow: hidden; isolation: isolate;
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.05), transparent 42%),
    var(--trv-panel);
  border: 1px solid var(--trv-border-strong);
  box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.45), var(--trv-card-shadow);
}
.gs-sky {
  position: absolute; inset: 0 0 38% 0; pointer-events: none;
  background: radial-gradient(120% 130% at 84% 100%, rgba(251, 191, 36, 0.16), transparent 58%);
  animation: trv-aura-drift 12s ease-in-out infinite;
}
.gs-ground {
  position: absolute; inset: auto 0 0 0; height: 42%; pointer-events: none; opacity: 0.55;
  background:
    repeating-linear-gradient(90deg, transparent 0 36px, color-mix(in srgb, var(--trv-amber) 7%, transparent) 36px 37px),
    repeating-linear-gradient(0deg, transparent 0 22px, color-mix(in srgb, var(--trv-text) 4%, transparent) 22px 23px);
  transform: perspective(380px) rotateX(70deg); transform-origin: bottom center;
  -webkit-mask-image: linear-gradient(to top, #000, transparent); mask-image: linear-gradient(to top, #000, transparent);
}
.gs-scan {
  position: absolute; top: 0; bottom: 0; width: 22%; pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, transparent, rgba(252, 211, 77, 0.10) 60%, rgba(252, 211, 77, 0.22));
  mix-blend-mode: screen; animation: gs-scan 5.5s var(--trv-ease) infinite;
}
@keyframes gs-scan { 0% { left: -24%; } 100% { left: 102%; } }

.gs-svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
.gs-rung { stroke: var(--trv-border); stroke-width: 1; stroke-dasharray: 2 8; opacity: 0.5; }
.gs-slope { stroke: var(--trv-amber); stroke-width: 1.4; stroke-dasharray: 5 6; opacity: 0.65;
  animation: gs-slope-flow 1.6s linear infinite; }
@keyframes gs-slope-flow { to { stroke-dashoffset: -22; } }
.gs-wedge { opacity: 0.85; }
.gs-strip { opacity: 0.9; }
.gs-thresh { stroke: var(--trv-amber-bright); stroke-width: 2.4; filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.7)); }

/* PAPI lights — anchored to the threshold */
.gs-papi { position: absolute; left: 81%; top: 80%; display: flex; gap: 3px; z-index: 2; }
.gs-papi-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--trv-amber-bright);
  box-shadow: 0 0 6px var(--trv-amber); animation: gs-papi 1.8s ease-in-out infinite; }
@keyframes gs-papi { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

/* inbound craft */
.gs-craft {
  position: absolute; width: 26px; height: 26px; transform: translate(-50%, -50%);
  border: none; background: none; padding: 0; cursor: pointer; z-index: 4; color: var(--trv-amber-bright);
}
.gs-plane {
  display: block; transform: rotate(28deg); transition: transform 0.25s var(--trv-spring);
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.55));
  animation: gs-bob 3.4s ease-in-out infinite; animation-delay: var(--d);
}
.gs-vapor {
  position: absolute; right: 60%; top: 38%; width: 18px; height: 2px; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(252, 211, 77, 0.55));
  transform: rotate(28deg); transform-origin: right center; opacity: 0.6;
}
.gs-craft.urgent { color: var(--trv-st-rejected); }
.gs-craft.urgent .gs-plane { filter: drop-shadow(0 0 7px rgba(239, 68, 68, 0.75)); }
.gs-craft.urgent .gs-vapor { background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.5)); }
.gs-craft:hover .gs-plane, .gs-craft.hot .gs-plane { transform: rotate(28deg) scale(1.4); }
.gs-craft:focus-visible { outline: 2px solid var(--trv-amber); outline-offset: 2px; border-radius: 6px; }
@keyframes gs-bob { 0%, 100% { transform: rotate(28deg) translateY(0); } 50% { transform: rotate(28deg) translateY(-3px); } }

/* HUD */
.gs-hud { position: absolute; left: 12px; right: 12px; top: 10px; display: flex; justify-content: space-between;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; color: var(--trv-text-dim); z-index: 3; pointer-events: none; }
.gs-hud-r { display: inline-flex; align-items: center; gap: 5px; color: var(--trv-amber-bright); }
.gs-live { width: 5px; height: 5px; border-radius: 50%; background: var(--trv-amber-bright); box-shadow: 0 0 6px var(--trv-amber);
  animation: gs-live 1.6s ease-in-out infinite; }
@keyframes gs-live { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* tooltip */
.gs-tip {
  position: absolute; z-index: 7; pointer-events: none; min-width: 124px;
  display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 10px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow);
}
.gs-tip-ref { font-size: 10.5px; font-weight: 700; color: var(--trv-amber-bright); }
.gs-tip-route { font-size: 12px; font-weight: 700; color: var(--trv-text); }
.gs-tip-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--trv-text-muted); margin-top: 1px; }
.gs-tip-dot { width: 6px; height: 6px; border-radius: 50%; }
.gs-tip-dot.amber { background: var(--trv-amber); } .gs-tip-dot.red { background: var(--trv-st-rejected); }
.gs-tip-enter-active, .gs-tip-leave-active { transition: opacity 0.15s ease; }
.gs-tip-enter-from, .gs-tip-leave-to { opacity: 0; }

/* caption */
.gs-cap { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
.gs-cap-line { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.gs-cap-line b { color: var(--trv-text); font-weight: 800; }
.gs-cap-dot { width: 7px; height: 7px; border-radius: 50%; }
.gs-cap-dot.amber { background: var(--trv-amber); box-shadow: 0 0 6px var(--trv-amber); }
.gs-cap-dot.red { background: var(--trv-st-rejected); box-shadow: 0 0 6px var(--trv-st-rejected); }

.gs.idle .gs-scan { opacity: 0.5; }

@media (prefers-reduced-motion: reduce) {
  .gs-sky, .gs-scan, .gs-slope, .gs-papi-dot, .gs-plane, .gs-live { animation: none !important; }
}
</style>
