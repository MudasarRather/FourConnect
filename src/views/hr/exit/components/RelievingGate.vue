<template>
  <!-- ════════════════════════════════════════════════════════════════════
       The Liberation Gate — signature instrument for the Relieving Letter.
       A mechanical IRIS APERTURE that OPENS with the release: eight blades
       retract toward the rim as clearance + F&F + the letter progress, a
       conic mintage gauge tracks the rim, a sunburst core brightens through
       the widening hole, and on ISSUE the aperture blooms fully open with
       light streaming OUTWARD (the employee passing through, free). Sealed
       shut while blocked; struck red on revoke. Deliberately NOT the wax-seal
       MINT die of the Experience letter — this is an opening passage, not a
       pressed stamp. Continuously alive, RM-guarded.
       ════════════════════════════════════════════════════════════════════ -->
  <div ref="el" class="rg" :class="[`st-${statusKey}`, { open: openLevel > 0.55, pressed }]">
    <span class="rg-aura" aria-hidden="true" />
    <span class="rg-glare" aria-hidden="true" />

    <div class="rg-stage" :style="{ '--ex-p': progressAngle + 'deg', '--rg-close': closeLevel, '--rg-open': openLevel }">
      <!-- ambient orbit + mintage gauge -->
      <span class="rg-orbit" aria-hidden="true" />
      <span class="rg-track" aria-hidden="true" />
      <span class="rg-prog" aria-hidden="true" />

      <!-- sunburst horizon behind the aperture -->
      <svg class="rg-rays" viewBox="0 0 240 240" aria-hidden="true">
        <line v-for="(r, i) in rays" :key="i" :x1="r.x1" :y1="r.y1" :x2="r.x2" :y2="r.y2"
          :style="{ animationDelay: (i * 0.18) + 's' }" />
      </svg>

      <!-- the glowing core revealed through the opening hole -->
      <span class="rg-core" aria-hidden="true">
        <span class="rg-core-glow" />
        <component :is="coreIcon" :size="30" class="rg-core-ic" :stroke-width="1.7" />
      </span>

      <!-- the iris — eight retracting blades -->
      <div class="rg-iris" aria-hidden="true">
        <span v-for="i in blades" :key="i" class="rg-arm" :style="{ transform: `rotate(${(i - 1) * 45}deg)` }">
          <span class="rg-leaf"><span class="rg-leaf-edge" /></span>
        </span>
      </div>

      <!-- light streaming outward on issue -->
      <span v-if="!reduced" class="rg-stream" aria-hidden="true">
        <span v-for="m in motes" :key="m.i" class="rg-mote"
          :style="{ '--a': m.a + 'deg', animationDelay: m.delay + 's', animationDuration: m.dur + 's' }" />
      </span>

      <!-- press / passage pulses -->
      <span class="rg-ping p1" aria-hidden="true" />
      <span class="rg-ping p2" aria-hidden="true" />

      <!-- rim ticks -->
      <svg class="rg-ticks" viewBox="0 0 240 240" aria-hidden="true">
        <line v-for="(tk, i) in ticks" :key="i" :x1="tk.x1" :y1="tk.y1" :x2="tk.x2" :y2="tk.y2" />
      </svg>
    </div>

    <div class="rg-cap">
      <span class="rg-state">{{ label }}</span>
      <span class="rg-sub">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DoorOpen, Footprints, BadgeCheck, FileX, Lock } from 'lucide-vue-next'
import { letterStatusMeta } from '@/composables/useExit'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  status: { type: String, default: 'NOT_GENERATED' },
  blocked: { type: Boolean, default: false },
  caption: { type: String, default: '' },
})

const el = ref(null)
usePointerSpotlight(el)
const reduced = prefersReduced()

const blades = 8
const statusKey = computed(() => (props.status || 'NOT_GENERATED').toLowerCase())
const label = computed(() =>
  props.status === 'NOT_GENERATED' && props.blocked ? 'Sealed shut'
    : props.status === 'ISSUED' ? 'Passage granted'
    : letterStatusMeta(props.status).label)
const pressed = computed(() => props.status !== 'NOT_GENERATED')

// the aperture open level (0 shut → 1 fully open)
const openLevel = computed(() => {
  if (props.status === 'ISSUED') return 1
  if (props.status === 'REVOKED') return 0.18
  if (props.status === 'GENERATED') return 0.72
  if (props.blocked) return 0.05
  return 0.42 // eligible, not yet minted
})
const closeLevel = computed(() => Math.max(0.04, 1 - openLevel.value))
const progressAngle = computed(() => Math.round(openLevel.value * 360))

const coreIcon = computed(() =>
  props.status === 'REVOKED' ? FileX
    : props.status === 'ISSUED' ? Footprints
    : props.status === 'NOT_GENERATED' && props.blocked ? Lock
    : props.status === 'GENERATED' ? DoorOpen
    : BadgeCheck)

// sunburst rays
const rays = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2
  const inner = 64, outer = i % 2 ? 110 : 96
  return { x1: 120 + Math.cos(a) * inner, y1: 120 + Math.sin(a) * inner, x2: 120 + Math.cos(a) * outer, y2: 120 + Math.sin(a) * outer }
})
// fine rim ticks
const ticks = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2
  const inner = i % 5 ? 112 : 107, outer = 117
  return { x1: 120 + Math.cos(a) * inner, y1: 120 + Math.sin(a) * inner, x2: 120 + Math.cos(a) * outer, y2: 120 + Math.sin(a) * outer }
})
// outward-streaming motes (deterministic)
const motes = Array.from({ length: 14 }, (_, i) => ({
  i, a: (i * 360 / 14), delay: (i % 7) * 0.34, dur: 2.6 + (i % 4) * 0.5,
}))
</script>

<style scoped>
.rg { position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; --cs: var(--ex-ember); }
.rg.st-issued { --cs: var(--ex-cleared); }
.rg.st-revoked { --cs: var(--ex-blocked); }

.rg-aura { position: absolute; top: -6%; width: 252px; height: 252px; max-width: 70vw; aspect-ratio: 1; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--cs) 30%, transparent), transparent 64%);
  filter: blur(10px); opacity: calc(0.4 + var(--rg-open, 0) * 0.5); animation: rg-breathe 5.6s ease-in-out infinite; transition: opacity 0.9s var(--ex-spring); }
.rg-glare { position: absolute; top: -6%; width: 252px; height: 252px; max-width: 70vw; aspect-ratio: 1; border-radius: 50%; pointer-events: none;
  opacity: var(--spot, 0); transition: opacity 0.3s; mix-blend-mode: overlay;
  background: radial-gradient(180px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), rgba(255,255,255,0.4), transparent 55%); }

.rg-stage { position: relative; width: 240px; height: 240px; max-width: 70vw; aspect-ratio: 1; }

/* outer slow-spin dashed orbit */
.rg-orbit { position: absolute; inset: 2px; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--cs) 30%, transparent); opacity: 0.5; animation: rg-spin 60s linear infinite; }

/* mintage gauge ring (conic) */
.rg-track, .rg-prog { position: absolute; inset: 14px; border-radius: 50%;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px)); }
.rg-track { background: color-mix(in srgb, var(--ex-steel) 24%, transparent); }
.rg-prog { background: conic-gradient(from -90deg, var(--cs) var(--ex-p, 0deg), transparent 0);
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--cs) 60%, transparent)); transition: --ex-p 1.2s var(--ex-spring); }

/* sunburst rays behind the aperture */
.rg-rays { position: absolute; inset: 0; width: 100%; height: 100%; opacity: calc(0.16 + var(--rg-open, 0) * 0.5); transition: opacity 0.9s var(--ex-spring); }
.rg-rays line { stroke: color-mix(in srgb, var(--cs) 55%, transparent); stroke-width: 1.3; stroke-linecap: round; transform-origin: 120px 120px; animation: rg-ray 3.4s ease-in-out infinite; }

/* the glowing core seen through the hole */
.rg-core { position: absolute; inset: 50%; width: 78px; height: 78px; transform: translate(-50%, -50%) scale(calc(0.5 + var(--rg-open, 0) * 0.6));
  display: grid; place-items: center; border-radius: 50%; transition: transform 1s var(--ex-spring); }
.rg-core-glow { position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--cs) 80%, #fff), color-mix(in srgb, var(--cs) 40%, transparent) 64%, transparent 76%);
  opacity: calc(0.25 + var(--rg-open, 0) * 0.75); box-shadow: 0 0 24px color-mix(in srgb, var(--cs) 50%, transparent); transition: opacity 0.9s var(--ex-spring); animation: rg-core-pulse 4s ease-in-out infinite; }
.rg-core-ic { position: relative; z-index: 1; color: #fff7ec; opacity: calc(0.35 + var(--rg-open, 0) * 0.65); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); transition: opacity 0.9s; }
.st-revoked .rg-core-ic { color: #fff; }

/* the iris blades */
.rg-iris { position: absolute; inset: 0; }
.rg-arm { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.rg-leaf { position: absolute; left: -23px; bottom: 0; width: 46px; height: 110px; transform-origin: 50% 0; transform: scaleY(var(--rg-close, 1));
  transition: transform 1s var(--ex-spring);
  background: linear-gradient(to top, color-mix(in srgb, var(--cs) 16%, var(--ex-surface-elevated)), color-mix(in srgb, var(--cs) 40%, var(--ex-panel)) 86%);
  border-top: 1px solid color-mix(in srgb, var(--cs) 60%, transparent);
  clip-path: polygon(42% 0%, 100% 5%, 66% 100%, 50% 100%, 0% 16%);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.32); }
.rg-leaf-edge { position: absolute; inset: 0; clip-path: inherit; pointer-events: none;
  background: linear-gradient(95deg, transparent 60%, color-mix(in srgb, var(--cs) 55%, transparent) 86%, transparent); opacity: 0.7; }

/* outward light stream (issued) */
.rg-stream { position: absolute; inset: 0; pointer-events: none; opacity: 0; }
.st-issued .rg-stream { opacity: 1; }
.rg-mote { position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px; border-radius: 50%;
  background: color-mix(in srgb, var(--cs) 80%, #fff); box-shadow: 0 0 8px var(--cs); opacity: 0;
  transform: rotate(var(--a)) translateY(0); }
.st-issued .rg-mote { animation: rg-stream linear infinite; }

/* passage pulses */
.rg-ping { position: absolute; inset: 30%; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--cs) 55%, transparent); opacity: 0; pointer-events: none; }
.pressed .rg-ping.p1 { animation: rg-ping 3.6s ease-out infinite; }
.pressed .rg-ping.p2 { animation: rg-ping 3.6s ease-out infinite 1.8s; }

/* rim ticks */
.rg-ticks { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.4; }
.rg-ticks line { stroke: color-mix(in srgb, var(--cs) 40%, transparent); stroke-width: 1; }

.rg-cap { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.rg-state { font-size: 14.5px; font-weight: 850; letter-spacing: 0.04em; color: var(--cs); }
.st-issued .rg-state { color: var(--ex-cleared); text-shadow: 0 0 18px color-mix(in srgb, var(--ex-cleared) 40%, transparent); }
.st-revoked .rg-state { color: var(--ex-blocked); }
.rg-sub { font-size: 11px; color: var(--ex-text-muted); font-family: var(--ex-mono); letter-spacing: 0.03em; }

@keyframes rg-spin { to { transform: rotate(360deg); } }
@keyframes rg-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes rg-core-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes rg-ray { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes rg-ping { 0% { transform: scale(0.6); opacity: 0.7; } 80%, 100% { transform: scale(1.7); opacity: 0; } }
@keyframes rg-stream {
  0% { transform: rotate(var(--a)) translateY(-30px) scale(0.6); opacity: 0; }
  18% { opacity: 0.9; }
  100% { transform: rotate(var(--a)) translateY(-128px) scale(1.1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .rg-orbit, .rg-rays line, .rg-core-glow, .rg-ping, .rg-aura { animation: none; }
  .rg-prog, .rg-leaf, .rg-core, .rg-core-glow, .rg-core-ic, .rg-rays { transition: none; }
}
</style>
