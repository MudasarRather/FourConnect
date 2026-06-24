<template>
  <!-- ════════════════════════════════════════════════════════════════════
       The Mint Seal — signature instrument for the Credential Atelier.
       A guilloché authentication die: counter-rotating engraved rosettes,
       a conic mintage-progress ring, a central crest that EMBOSSES into the
       die as the document is drafted, a gold-foil sweep, expanding press
       pulses + a verification beam on ISSUE, and a struck overlay on REVOKE.
       Distinct from every sibling (gatehouse / recovery-vault / reckoning
       reactor / dusk-horizon / countdown). Continuously alive, RM-guarded.
       ════════════════════════════════════════════════════════════════════ -->
  <div class="cseal" :class="[`st-${statusKey}`, { pressed }]">
    <span class="cs-aura" aria-hidden="true" />

    <div class="cs-stage" :style="{ '--ex-p': progressAngle + 'deg' }">
      <!-- mintage-progress conic ring -->
      <span class="cs-prog" aria-hidden="true" />
      <span class="cs-track" aria-hidden="true" />

      <!-- engraved guilloché rosettes -->
      <svg class="cs-engrave" viewBox="0 0 220 220" role="img" :aria-label="`${label} seal`">
        <g class="cs-rot cw"><path :d="roseOuter" class="cs-rose r1" /></g>
        <g class="cs-rot ccw"><path :d="roseMid" class="cs-rose r2" /></g>
        <circle cx="110" cy="110" r="62" class="cs-dash" />
        <circle cx="110" cy="110" r="50" class="cs-hair" />
      </svg>

      <!-- verification beam (issued) -->
      <span class="cs-beam" aria-hidden="true" />
      <!-- press pulses -->
      <span class="cs-ping p1" aria-hidden="true" />
      <span class="cs-ping p2" aria-hidden="true" />

      <!-- central crest that embosses -->
      <div class="cs-crest">
        <span class="cs-foil" aria-hidden="true" />
        <component :is="emblem" :size="34" class="cs-emblem" :stroke-width="1.6" />
        <span class="cs-badge"><component :is="badgeIcon" :size="12" /></span>
      </div>

      <!-- relieving laurel wreath (release) -->
      <span v-if="isRelieving" class="cs-laurel" aria-hidden="true" />

      <!-- struck / void overlay -->
      <span class="cs-strike" aria-hidden="true" />
    </div>

    <div class="cs-cap">
      <span class="cs-state">{{ label }}</span>
      <span class="cs-sub">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  ScrollText, BadgeCheck, FileClock, PenLine, CircleCheckBig, FileX,
} from 'lucide-vue-next'
import { letterStatusMeta } from '@/composables/useExit'

const props = defineProps({
  status: { type: String, default: 'NOT_GENERATED' },
  letterType: { type: String, default: 'experience-letter' },
  caption: { type: String, default: '' },
})

const statusKey = computed(() => (props.status || 'NOT_GENERATED').toLowerCase())
const label = computed(() => letterStatusMeta(props.status).label)
const pressed = computed(() => props.status !== 'NOT_GENERATED')
const isRelieving = computed(() => props.letterType === 'relieving-letter')

const emblem = computed(() => (isRelieving.value ? BadgeCheck : ScrollText))
const badgeIcon = computed(() => ({
  NOT_GENERATED: FileClock, GENERATED: PenLine, ISSUED: CircleCheckBig, REVOKED: FileX,
}[props.status] || FileClock))
const progressAngle = computed(() => ({
  NOT_GENERATED: 28, GENERATED: 216, ISSUED: 360, REVOKED: 360,
}[props.status] || 0))

// ── deterministic guilloché rosette paths (radius modulated by a sine rose) ──
const rosette = (R, amp, petals, steps = 260) => {
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r = R + amp * Math.sin(petals * t)
    const x = 110 + r * Math.cos(t)
    const y = 110 + r * Math.sin(t)
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
}
const roseOuter = rosette(84, 9, 18)
const roseMid = rosette(70, 6, 30)
</script>

<style scoped>
.cseal { display: flex; flex-direction: column; align-items: center; gap: 12px; --cs: var(--ex-ember); }
.st-issued { --cs: var(--ex-cleared); }
.st-revoked { --cs: var(--ex-blocked); }

.cs-stage { position: relative; width: 224px; height: 224px; max-width: 62vw; aspect-ratio: 1; }

.cs-aura { position: absolute; width: 224px; height: 224px; max-width: 62vw; aspect-ratio: 1; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--cs) 26%, transparent), transparent 66%);
  filter: blur(6px); animation: cs-breathe 5.5s ease-in-out infinite; }

/* mintage progress + track */
.cs-prog, .cs-track { position: absolute; inset: 8px; border-radius: 50%;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px)); }
.cs-track { background: color-mix(in srgb, var(--ex-steel) 22%, transparent); }
.cs-prog { background: conic-gradient(from -90deg, var(--cs) var(--ex-p, 0deg), transparent 0);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--cs) 60%, transparent)); transition: --ex-p 1.1s var(--ex-spring); }

/* engraved rosettes */
.cs-engrave { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cs-rose { fill: none; stroke: color-mix(in srgb, var(--cs) 42%, transparent); stroke-width: 0.8; opacity: 0.55; }
.cs-rose.r2 { stroke: color-mix(in srgb, var(--ex-amber-bright) 38%, transparent); opacity: 0.4; }
.cs-dash { fill: none; stroke: color-mix(in srgb, var(--cs) 40%, transparent); stroke-width: 1; stroke-dasharray: 2 6; opacity: 0.6; }
.cs-hair { fill: none; stroke: var(--ex-border-strong); stroke-width: 0.6; opacity: 0.5; }
.cs-rot { transform-origin: 110px 110px; }
.cs-rot.cw { animation: cs-spin 64s linear infinite; }
.cs-rot.ccw { animation: cs-spin 48s linear infinite reverse; }

/* verification beam — only meaningful while issued */
.cs-beam { position: absolute; left: 50%; top: 6%; width: 3px; height: 0; transform: translateX(-50%); border-radius: 3px; pointer-events: none; opacity: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ex-cleared) 85%, transparent), transparent); }
.st-issued .cs-beam { animation: cs-beam 4.4s ease-in-out infinite; }

/* press pulses */
.cs-ping { position: absolute; inset: 26%; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--cs) 55%, transparent); opacity: 0; pointer-events: none; }
.pressed .cs-ping.p1 { animation: cs-ping 3.4s ease-out infinite; }
.pressed .cs-ping.p2 { animation: cs-ping 3.4s ease-out infinite 1.7s; }

/* central crest — embosses */
.cs-crest { position: absolute; inset: 50%; width: 92px; height: 92px; transform: translate(-50%, -50%) scale(0.62); opacity: 0.38;
  display: grid; place-items: center; border-radius: 26px; overflow: hidden;
  clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
  background: linear-gradient(150deg, color-mix(in srgb, var(--cs) 26%, var(--ex-surface-elevated)), var(--ex-surface));
  border: 1px solid color-mix(in srgb, var(--cs) 40%, transparent);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.32), inset 0 -2px 8px color-mix(in srgb, var(--cs) 20%, transparent);
  transition: transform 0.7s var(--ex-spring), opacity 0.6s, box-shadow 0.6s; }
.pressed .cs-crest { transform: translate(-50%, -50%) scale(1); opacity: 1;
  box-shadow: inset 0 3px 14px rgba(0,0,0,0.42), inset 0 -3px 10px color-mix(in srgb, var(--cs) 34%, transparent), 0 0 24px color-mix(in srgb, var(--cs) 30%, transparent); }
.cs-emblem { color: var(--cs); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); z-index: 1; }
.st-issued .cs-emblem { color: var(--ex-cleared); }

.cs-foil { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 36%, rgba(255,255,255,0.55) 50%, transparent 64%); transform: translateX(-130%); }
.pressed .cs-foil { animation: cs-foil 4.6s ease-in-out infinite 0.6s; }

.cs-badge { position: absolute; right: 8px; bottom: 8px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; z-index: 2;
  color: var(--cs); background: var(--ex-surface-elevated); border: 1.5px solid color-mix(in srgb, var(--cs) 55%, transparent); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.st-issued .cs-badge { color: var(--ex-cleared); }
.st-revoked .cs-badge { color: var(--ex-blocked); }

.cs-strike { position: absolute; inset: 18%; pointer-events: none; opacity: 0; border-radius: 50%;
  background: repeating-linear-gradient(48deg, transparent 0 9px, color-mix(in srgb, var(--ex-blocked) 30%, transparent) 9px 11px); }
.st-revoked .cs-strike { opacity: 1; }

.cs-cap { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.cs-state { font-size: 14px; font-weight: 850; letter-spacing: 0.02em; color: var(--cs); }
.st-issued .cs-state { color: var(--ex-cleared); }
.st-revoked .cs-state { color: var(--ex-blocked); }
.cs-sub { font-size: 11px; color: var(--ex-text-muted); font-family: var(--ex-mono); letter-spacing: 0.03em; }

@keyframes cs-spin { to { transform: rotate(360deg); } }
@keyframes cs-breathe { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.05); } }
@keyframes cs-foil { 0% { transform: translateX(-130%); } 38%, 100% { transform: translateX(170%); } }
@keyframes cs-ping { 0% { transform: scale(0.7); opacity: 0.65; } 80%, 100% { transform: scale(1.5); opacity: 0; } }
@keyframes cs-beam { 0%, 100% { height: 0; opacity: 0; } 50% { height: 42%; opacity: 0.8; } }

.cs-laurel { position: absolute; left: 50%; top: 50%; width: 124px; height: 124px; transform: translate(-50%, -50%); pointer-events: none; opacity: 0; transition: opacity 0.7s; }
.pressed .cs-laurel { opacity: 0.72; }
.cs-laurel::before, .cs-laurel::after { content: ''; position: absolute; top: 9%; bottom: 9%; width: 44%; border: 2px solid var(--ex-cleared); border-radius: 50%; opacity: 0.66; }
.cs-laurel::before { left: 0; border-right-color: transparent; border-top-color: transparent; }
.cs-laurel::after { right: 0; border-left-color: transparent; border-top-color: transparent; }

@media (prefers-reduced-motion: reduce) {
  .cs-rot.cw, .cs-rot.ccw, .cs-aura, .cs-foil, .cs-ping, .cs-beam { animation: none; }
  .cs-prog { transition: none; }
  .cs-crest, .cs-laurel { transition: opacity 0.3s; }
}
</style>
