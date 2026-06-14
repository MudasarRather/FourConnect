<template>
  <div class="radar" :class="{ 'is-empty': !blips.length }">
    <!-- static grid scope -->
    <svg class="scope-grid" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient :id="`${uid}-floor`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--shift-alert)" stop-opacity="0.10" />
          <stop offset="34%" stop-color="var(--shift-amber)" stop-opacity="0.05" />
          <stop offset="100%" stop-color="transparent" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" :fill="`url(#${uid}-floor)`" />
      <!-- range rings -->
      <circle v-for="r in rings" :key="'ring'+r" cx="50" cy="50" :r="r"
        fill="none" stroke="var(--shift-grid-line)" stroke-width="0.4" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--shift-border)" stroke-width="0.6"
        stroke-dasharray="1.4 2.4" class="scope-rim" />
      <!-- crosshair -->
      <line x1="50" y1="6" x2="50" y2="94" stroke="var(--shift-grid-line)" stroke-width="0.35" />
      <line x1="6" y1="50" x2="94" y2="50" stroke="var(--shift-grid-line)" stroke-width="0.35" />
      <!-- quadrant clock labels (00 top → 06 right → 12 bottom → 18 left) -->
      <g font-family="var(--shift-mono)" font-size="3.4" fill="var(--shift-text-dim)" text-anchor="middle">
        <text x="50" y="11">00</text>
        <text x="89.5" y="51.4">06</text>
        <text x="50" y="91.5">12</text>
        <text x="10.5" y="51.4">18</text>
      </g>
    </svg>

    <!-- emitted sonar rings -->
    <span class="sonar" aria-hidden="true" />
    <span class="sonar s2" aria-hidden="true" />

    <!-- rotating sweep beam -->
    <span class="beam" aria-hidden="true" />

    <!-- blips -->
    <div class="blip-layer">
      <div v-for="b in placed" :key="b.id" class="blip" :data-status="b.status"
        :style="{ left: b.x + '%', top: b.y + '%' }" :title="b.label">
        <span class="blip-halo" :style="{ animationDelay: b.pingDelay }" />
        <span class="blip-core" />
        <span v-if="b.critical" class="blip-crit" />
      </div>
    </div>

    <!-- center readiness hub -->
    <div class="hub" :data-tone="tone">
      <span class="hub-arc" aria-hidden="true">
        <svg viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="19" fill="none" stroke="var(--shift-grid-line)" stroke-width="2.5" />
          <circle cx="22" cy="22" r="19" fill="none" :stroke="ringStroke" stroke-width="2.5"
            stroke-linecap="round" :stroke-dasharray="dash.arc" :stroke-dashoffset="dash.off"
            transform="rotate(-90 22 22)" class="hub-ring" />
        </svg>
      </span>
      <b class="hub-val"><ShiftCountUp v-if="blips.length" :value="readiness" suffix="%" /><template v-else>—</template></b>
      <small class="hub-label">{{ blips.length ? 'Readiness' : 'Standby' }}</small>
    </div>
  </div>
</template>

<script>
let _radarUid = 0
</script>

<script setup>
import { computed } from 'vue'
import ShiftCountUp from './ShiftCountUp.vue'

const props = defineProps({
  // blips: [{ id, label, angleDeg, status:'OK'|'WARN'|'CRITICAL', critical }]
  blips: { type: Array, default: () => [] },
  readiness: { type: Number, default: 100 },
})

const uid = `radar-${_radarUid++}`
const PERIOD = 4.2 // seconds — must match .beam / .blip-halo animation duration
const rings = [12, 24, 35, 46]

// radius band per status: critical pulled to the hot core, covered on the safe rim
const radiusFor = (status, i) => {
  const base = status === 'CRITICAL' ? 17 : status === 'WARN' ? 29 : 40
  return base + ((i % 3) - 1) * 3.2 // gentle deterministic spread so co-timed rules don't stack
}

const placed = computed(() => props.blips.map((b, i) => {
  const ang = (Number(b.angleDeg) || 0) + ((i % 5) - 2) * 4 // de-stack same-time blips
  const rad = radiusFor(b.status, i)
  const rcss = (ang - 90) * Math.PI / 180
  return {
    ...b,
    x: 50 + rad * Math.cos(rcss),
    y: 50 + rad * Math.sin(rcss),
    // negative delay so each blip's ping peaks exactly when the beam crosses its angle
    pingDelay: `-${(PERIOD * (1 - ((((ang % 360) + 360) % 360) / 360))).toFixed(3)}s`,
  }
}))

const tone = computed(() => props.readiness >= 100 ? 'ok' : props.readiness >= 70 ? 'warn' : 'alert')
const ringStroke = computed(() => tone.value === 'ok' ? 'var(--shift-ok)' : tone.value === 'warn' ? 'var(--shift-amber)' : 'var(--shift-alert)')
const dash = computed(() => {
  const circ = 2 * Math.PI * 19
  return { arc: circ.toFixed(2), off: (circ * (1 - Math.min(1, props.readiness / 100))).toFixed(2) }
})
</script>

<style scoped>
.radar { position: relative; width: 100%; aspect-ratio: 1; max-width: 270px; margin: 0 auto; display: grid; place-items: center; }
.scope-grid { position: absolute; inset: 0; width: 100%; height: 100%; }
.scope-rim { animation: radar-rim 22s linear infinite; transform-origin: 50% 50%; }

/* rotating sweep — GPU-composited, perfectly periodic so blip pings stay in sync */
.beam {
  position: absolute; inset: 4%; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg,
    color-mix(in srgb, var(--shift-amber) 0%, transparent) 0deg,
    color-mix(in srgb, var(--shift-amber) 0%, transparent) 288deg,
    color-mix(in srgb, var(--shift-amber) 8%, transparent) 320deg,
    color-mix(in srgb, var(--shift-amber) 34%, transparent) 352deg,
    color-mix(in srgb, var(--shift-amber-bright) 62%, transparent) 360deg);
  -webkit-mask: radial-gradient(circle at 50% 50%, transparent 16%, #000 30%, #000 97%, transparent 100%);
  mask: radial-gradient(circle at 50% 50%, transparent 16%, #000 30%, #000 97%, transparent 100%);
  animation: radar-spin var(--radar-period, 4.2s) linear infinite;
  will-change: transform;
}
/* leading-edge glow line of the beam */
.beam::after {
  content: ''; position: absolute; left: 50%; top: 4%; bottom: 50%; width: 1.4px;
  background: linear-gradient(180deg, var(--shift-amber-bright), transparent);
  transform-origin: bottom center; filter: drop-shadow(0 0 3px var(--shift-amber));
}

.sonar { position: absolute; width: 30%; height: 30%; border-radius: 50%; border: 1px solid var(--shift-amber);
  opacity: 0; animation: radar-sonar var(--radar-period, 4.2s) ease-out infinite; pointer-events: none; }
.sonar.s2 { animation-delay: calc(var(--radar-period, 4.2s) / 2); }

.blip-layer { position: absolute; inset: 0; pointer-events: none; }
.blip { position: absolute; transform: translate(-50%, -50%); color: var(--shift-ok); }
.blip[data-status="WARN"] { color: var(--shift-ember); }
.blip[data-status="CRITICAL"] { color: var(--shift-alert); }
.blip-core { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; border-radius: 50%;
  transform: translate(-50%, -50%); background: currentColor;
  box-shadow: 0 0 7px 1px currentColor, 0 0 0 2px color-mix(in srgb, currentColor 22%, transparent);
  animation: radar-float 3.6s ease-in-out infinite; }
.blip-halo { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px;
  border-radius: 50%; border: 1.5px solid currentColor; opacity: 0;
  animation: radar-ping var(--radar-period, 4.2s) linear infinite; }
.blip-crit { position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px;
  border-radius: 50%; border: 1px dashed currentColor; opacity: 0.55;
  animation: radar-spin 7s linear infinite reverse; }

.hub { position: absolute; display: grid; place-items: center; text-align: center; width: 30%; height: 30%; }
.hub-arc { position: absolute; inset: 0; display: grid; place-items: center; }
.hub-arc svg { width: 100%; height: 100%; }
.hub-ring { transition: stroke-dashoffset 1.1s var(--shift-ease); }
.hub-val { font-family: var(--shift-mono); font-size: clamp(15px, 5.5vw, 22px); font-weight: 900; line-height: 1;
  color: var(--shift-text); z-index: 1; }
.hub[data-tone="ok"] .hub-val { color: var(--shift-ok); }
.hub[data-tone="warn"] .hub-val { color: var(--shift-amber); }
.hub[data-tone="alert"] .hub-val { color: var(--shift-alert); }
.hub-label { font-family: var(--shift-mono); font-size: 7.5px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--shift-text-muted); margin-top: 2px; z-index: 1; }

@keyframes radar-spin { to { transform: rotate(360deg); } }
@keyframes radar-rim { to { transform: rotate(360deg); } }
@keyframes radar-sonar {
  0% { transform: scale(0.5); opacity: 0; }
  12% { opacity: 0.5; }
  100% { transform: scale(3.05); opacity: 0; }
}
@keyframes radar-ping {
  0% { transform: scale(0.5); opacity: 0.95; }
  16% { opacity: 0; }
  100% { transform: scale(3.4); opacity: 0; }
}
@keyframes radar-float {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -52%) scale(1.12); }
}

@media (prefers-reduced-motion: reduce) {
  .beam, .sonar, .blip-halo, .blip-core, .blip-crit, .scope-rim { animation: none !important; }
  .beam { opacity: 0.4; }
  .blip-halo { display: none; }
}
</style>
