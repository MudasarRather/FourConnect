<template>
  <div class="motif" :class="[`k-${kind}`, `tone-${tone.toLowerCase()}`, { reduced }]"
    :style="{ '--c': c, width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <!-- ambient backdrop shared by every motif -->
    <span class="m-aura" />
    <span class="m-grid" />
    <span class="m-orbit" />
    <span v-if="!reduced" class="m-ping" />
    <span v-if="!reduced" class="m-ping d2" />

    <svg class="m-svg" viewBox="0 0 120 120" fill="none">
      <!-- ACCESS REVOKE — shield + lock + sweeping revoke beam -->
      <g v-if="kind === 'access-revoke'" class="g-access">
        <path class="shield" d="M60 22 L86 32 V58 C86 76 74 90 60 98 C46 90 34 76 34 58 V32 Z" />
        <rect class="lockbody" x="50" y="58" width="20" height="17" rx="3" />
        <path class="lockshackle" d="M53 58 V51 a7 7 0 0 1 14 0 V58" />
        <circle class="lockpin" cx="60" cy="66" r="2.4" />
        <line class="revoke-beam" x1="30" y1="92" x2="90" y2="28" />
        <line class="slash" x1="44" y1="44" x2="76" y2="80" />
      </g>

      <!-- ERP REVOKE — credential token + turning key -->
      <g v-else-if="kind === 'erp-revoke'" class="g-erp">
        <rect class="card" x="28" y="40" width="64" height="42" rx="7" />
        <rect class="card-strip" x="28" y="50" width="64" height="6" />
        <rect class="card-chip" x="37" y="62" width="13" height="11" rx="2" />
        <line class="card-l1" x1="57" y1="64" x2="83" y2="64" />
        <line class="card-l2" x1="57" y1="70" x2="76" y2="70" />
        <g class="keywrap">
          <circle class="key-bow" cx="60" cy="34" r="9" />
          <rect class="key-stem" x="58" y="40" width="4" height="16" rx="1.5" />
          <rect class="key-tooth" x="62" y="50" width="5" height="3" rx="1" />
          <rect class="key-tooth2" x="62" y="44" width="4" height="3" rx="1" />
        </g>
        <line class="slash" x1="34" y1="44" x2="86" y2="80" />
      </g>

      <!-- DEVICE — hardware recalled into a dock -->
      <g v-else-if="kind === 'device'" class="g-device">
        <rect class="lid" x="38" y="40" width="44" height="30" rx="3" />
        <rect class="screen" x="42" y="44" width="36" height="22" rx="1.5" />
        <path class="base" d="M30 78 L90 78 L86 70 L34 70 Z" />
        <g class="parcel"><rect x="50" y="20" width="20" height="20" rx="3" /><line x1="50" y1="30" x2="70" y2="30" /><line x1="60" y1="20" x2="60" y2="40" /></g>
        <circle class="dock-ring" cx="60" cy="60" r="30" />
      </g>

      <!-- LEDGER — coin stack settling on a balance -->
      <g v-else-if="kind === 'ledger'" class="g-ledger">
        <ellipse class="coin c3" cx="60" cy="42" rx="22" ry="7" />
        <ellipse class="coin c2" cx="60" cy="52" rx="22" ry="7" />
        <ellipse class="coin c1" cx="60" cy="62" rx="22" ry="7" />
        <rect class="bar-track" x="30" y="80" width="60" height="6" rx="3" />
        <rect class="bar-fill" x="30" y="80" width="60" height="6" rx="3" />
        <text class="rupee" x="60" y="46" text-anchor="middle">₹</text>
      </g>

      <!-- BADGE — ID card deactivating -->
      <g v-else-if="kind === 'badge'" class="g-badge">
        <line class="lanyard" x1="60" y1="14" x2="60" y2="34" />
        <rect class="badge-card" x="36" y="34" width="48" height="58" rx="7" />
        <circle class="badge-photo" cx="60" cy="52" r="9" />
        <rect class="badge-strip" x="36" y="68" width="48" height="6" />
        <line class="badge-l1" x1="46" y1="80" x2="74" y2="80" />
        <line class="deact" x1="34" y1="40" x2="86" y2="86" />
        <circle class="badge-chip" cx="76" cy="44" r="2.6" />
      </g>

      <!-- BIOMETRIC — face scan -->
      <g v-else-if="kind === 'biometric'" class="g-bio">
        <ellipse class="face" cx="60" cy="58" rx="22" ry="27" />
        <circle class="eye" cx="52" cy="54" r="2.2" /><circle class="eye" cx="68" cy="54" r="2.2" />
        <path class="mouth" d="M52 68 Q60 73 68 68" />
        <path class="br tl" d="M36 40 V32 H44" /><path class="br tr" d="M84 40 V32 H76" />
        <path class="br bl" d="M36 76 V84 H44" /><path class="br br2" d="M84 76 V84 H76" />
        <line class="scanline" x1="36" y1="58" x2="84" y2="58" />
      </g>

      <!-- HANDOVER — packet glides from FROM to TO -->
      <g v-else-if="kind === 'handover'" class="g-hand">
        <rect class="pillar from" x="26" y="46" width="22" height="34" rx="4" />
        <rect class="pillar to" x="72" y="46" width="22" height="34" rx="4" />
        <path class="track" id="hand-track" d="M48 60 H72" />
        <circle class="packet" r="5">
          <animateMotion v-if="!reduced" dur="2.4s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#hand-track" />
          </animateMotion>
        </circle>
        <path class="arrowhead" d="M68 55 L74 60 L68 65" />
      </g>

      <!-- SEAL — wax/authority seal pressing -->
      <g v-else-if="kind === 'seal'" class="g-seal">
        <circle class="seal-dash" cx="60" cy="58" r="32" />
        <circle class="seal-core" cx="60" cy="58" r="22" />
        <circle class="seal-inner" cx="60" cy="58" r="16" />
        <path class="seal-star" d="M60 46 l3.2 7.6 8.2 .6 -6.3 5.3 2 8 -7.1 -4.3 -7.1 4.3 2 -8 -6.3 -5.3 8.2 -.6 Z" />
      </g>

      <!-- GENERIC — clipboard check -->
      <g v-else class="g-generic">
        <rect class="clip-body" x="36" y="34" width="48" height="58" rx="6" />
        <rect class="clip-top" x="50" y="28" width="20" height="10" rx="3" />
        <line class="clip-l" x1="46" y1="56" x2="74" y2="56" /><line class="clip-l" x1="46" y1="66" x2="74" y2="66" />
        <path class="clip-check" d="M46 78 l7 7 14 -16" />
      </g>

      <!-- shared status emblem (cleared / blocked) -->
      <g v-if="tone === 'CLEARED'" class="emblem ok">
        <circle cx="92" cy="30" r="14" /><path d="M85 30 l5 5 9 -10" />
      </g>
      <g v-else-if="tone === 'BLOCKED'" class="emblem bad">
        <circle cx="92" cy="30" r="14" /><line x1="87" y1="25" x2="97" y2="35" /><line x1="97" y1="25" x2="87" y2="35" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  kind: { type: String, default: 'generic' },
  hex: { type: String, default: '#fb923c' },
  tone: { type: String, default: 'PENDING' },   // PENDING | IN_PROGRESS | CLEARED | BLOCKED | NA
  size: { type: Number, default: 116 },
})
const reduced = prefersReduced()
const c = computed(() => {
  if (props.tone === 'CLEARED') return '#34d399'
  if (props.tone === 'BLOCKED') return '#ef4444'
  if (props.tone === 'NA') return '#9ca3af'
  return props.hex
})
</script>

<style scoped>
.motif { position: relative; display: grid; place-items: center; flex-shrink: 0; }
.m-svg { position: relative; z-index: 2; width: 100%; height: 100%; overflow: visible; }

/* ── ambient backdrop ── */
.m-aura { position: absolute; inset: 6%; border-radius: 50%;
  background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--c) 34%, transparent), transparent 68%);
  filter: blur(2px); animation: m-breathe 4.2s ease-in-out infinite; }
.m-grid { position: absolute; inset: 12%; border-radius: 18px; opacity: 0.35;
  background-image: linear-gradient(color-mix(in srgb, var(--c) 24%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--c) 24%, transparent) 1px, transparent 1px);
  background-size: 11px 11px; mask: radial-gradient(circle, #000 35%, transparent 72%); -webkit-mask: radial-gradient(circle, #000 35%, transparent 72%); }
.m-orbit { position: absolute; inset: 4%; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--c) 38%, transparent);
  animation: m-spin 16s linear infinite; }
.m-ping { position: absolute; inset: 0; margin: auto; width: 52%; height: 52%; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--c) 50%, transparent);
  animation: m-ping 3s ease-out infinite; }
.m-ping.d2 { animation-delay: 1.5s; }

/* ── shared stroke language ── */
.m-svg [class] { vector-effect: non-scaling-stroke; }
.m-svg path, .m-svg rect, .m-svg circle, .m-svg ellipse, .m-svg line {
  stroke: color-mix(in srgb, var(--c) 88%, #fff 6%); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.m-svg .rupee { fill: color-mix(in srgb, var(--c) 92%, #fff 8%); stroke: none; font: 800 13px var(--ex-mono, monospace); }

/* ACCESS-REVOKE */
.shield { fill: color-mix(in srgb, var(--c) 14%, transparent); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 35%, transparent)); }
.lockbody { fill: color-mix(in srgb, var(--c) 22%, transparent); }
.lockpin { fill: var(--c); stroke: none; }
.revoke-beam { stroke: #fff; stroke-width: 3; opacity: 0; filter: drop-shadow(0 0 6px var(--c));
  animation: m-sweep 3.2s ease-in-out infinite; }
.slash { stroke: #ef4444; stroke-width: 0; opacity: 0; }
.tone-blocked .slash { stroke-width: 3; opacity: 0.9; animation: m-draw-slash 0.5s ease-out both; }
.g-access .lockshackle { stroke-dasharray: 30; animation: m-shackle 3.2s ease-in-out infinite; }

/* ERP-REVOKE */
.card { fill: color-mix(in srgb, var(--c) 12%, transparent); }
.card-strip { fill: color-mix(in srgb, var(--c) 40%, transparent); stroke: none; }
.card-chip { fill: color-mix(in srgb, var(--c) 30%, transparent); }
.keywrap { transform-origin: 60px 34px; animation: m-keyturn 3.4s ease-in-out infinite; }
.key-bow { fill: color-mix(in srgb, var(--c) 20%, transparent); }
.key-stem, .key-tooth, .key-tooth2 { fill: var(--c); stroke: none; }
.g-erp .slash { animation: none; }
.tone-blocked .g-erp .slash { stroke: #ef4444; stroke-width: 3; opacity: 0.9; }

/* DEVICE */
.lid { fill: color-mix(in srgb, var(--c) 10%, transparent); }
.screen { fill: color-mix(in srgb, var(--c) 26%, transparent); animation: m-screen 2.6s ease-in-out infinite; }
.base { fill: color-mix(in srgb, var(--c) 16%, transparent); }
.parcel { transform-origin: 60px 30px; animation: m-recall 3s ease-in-out infinite; }
.parcel rect { fill: color-mix(in srgb, var(--c) 20%, transparent); }
.dock-ring { opacity: 0.4; stroke-dasharray: 4 7; animation: m-spin 9s linear infinite reverse; }

/* LEDGER */
.coin { fill: color-mix(in srgb, var(--c) 18%, transparent); }
.c1 { animation: m-coin 2.8s ease-in-out infinite; }
.c2 { animation: m-coin 2.8s ease-in-out infinite 0.18s; }
.c3 { animation: m-coin 2.8s ease-in-out infinite 0.36s; }
.bar-track { stroke: color-mix(in srgb, var(--c) 30%, transparent); }
.bar-fill { stroke: none; fill: var(--c); transform-origin: 30px 83px; animation: m-fill 3.2s ease-in-out infinite; filter: drop-shadow(0 0 5px var(--c)); }

/* BADGE */
.badge-card { fill: color-mix(in srgb, var(--c) 12%, transparent); }
.badge-photo { fill: color-mix(in srgb, var(--c) 28%, transparent); }
.badge-strip { fill: color-mix(in srgb, var(--c) 36%, transparent); stroke: none; }
.badge-chip { fill: var(--c); stroke: none; animation: m-blink 1.6s steps(1) infinite; }
.lanyard { stroke-width: 1.5; opacity: 0.6; }
.deact { stroke: #fff; stroke-width: 2.5; opacity: 0; filter: drop-shadow(0 0 5px var(--c)); animation: m-sweep 3.4s ease-in-out infinite; }

/* BIOMETRIC */
.face { fill: color-mix(in srgb, var(--c) 10%, transparent); }
.eye, .mouth { stroke-width: 2.4; }
.eye { fill: var(--c); stroke: none; }
.br { stroke: color-mix(in srgb, var(--c) 70%, transparent); stroke-width: 2; }
.scanline { stroke: #fff; stroke-width: 2; opacity: 0.85; filter: drop-shadow(0 0 6px var(--c)); animation: m-scan 2.6s ease-in-out infinite; }

/* HANDOVER */
.pillar { fill: color-mix(in srgb, var(--c) 14%, transparent); }
.pillar.to { fill: color-mix(in srgb, var(--c) 8%, transparent); animation: m-arrive 2.4s ease-out infinite; }
.track { stroke: color-mix(in srgb, var(--c) 36%, transparent); stroke-dasharray: 3 4; }
.packet { fill: var(--c); stroke: none; filter: drop-shadow(0 0 6px var(--c)); }
.arrowhead { stroke: var(--c); }

/* SEAL */
.seal-dash { fill: none; stroke-dasharray: 5 8; opacity: 0.55; animation: m-spin 12s linear infinite; }
.seal-core { fill: color-mix(in srgb, var(--c) 16%, transparent); animation: m-press 3s ease-in-out infinite; transform-origin: 60px 58px; }
.seal-inner { fill: none; opacity: 0.6; }
.seal-star { fill: var(--c); stroke: none; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 60%, transparent)); }

/* GENERIC */
.clip-body { fill: color-mix(in srgb, var(--c) 10%, transparent); }
.clip-top { fill: color-mix(in srgb, var(--c) 30%, transparent); }
.clip-l { stroke: color-mix(in srgb, var(--c) 45%, transparent); }
.clip-check { stroke: var(--c); stroke-width: 3; stroke-dasharray: 40; stroke-dashoffset: 40; animation: m-check 3s ease-in-out infinite; }

/* STATUS EMBLEM */
.emblem circle { fill: color-mix(in srgb, var(--c) 90%, #000 8%); stroke: none; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 70%, transparent)); }
.emblem path, .emblem line { stroke: #07160f; stroke-width: 3; }
.emblem.bad path, .emblem.bad line { stroke: #2a0707; }
.emblem { animation: m-stamp 0.5s var(--ex-spring, cubic-bezier(.16,1,.3,1)) both; transform-origin: 92px 30px; }

/* ── keyframes ── */
@keyframes m-breathe { 0%,100% { opacity: 0.62; transform: scale(0.97); } 50% { opacity: 0.95; transform: scale(1.04); } }
@keyframes m-spin { to { transform: rotate(360deg); } }
@keyframes m-ping { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes m-sweep { 0%,55% { opacity: 0; } 62% { opacity: 1; } 78% { opacity: 0.9; } 100% { opacity: 0; } }
@keyframes m-shackle { 0%,60% { transform: translateY(0); } 72% { transform: translateY(-3px) rotate(-7deg); } 100% { transform: translateY(0); } }
@keyframes m-draw-slash { 0% { stroke-dasharray: 0 60; } 100% { stroke-dasharray: 60 0; } }
@keyframes m-keyturn { 0%,55% { transform: rotate(0deg); } 75% { transform: rotate(40deg); } 100% { transform: rotate(0deg); } }
@keyframes m-screen { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes m-recall { 0% { transform: translateY(0) scale(1); opacity: 1; } 70% { transform: translateY(26px) scale(0.6); opacity: 0.5; } 71%,100% { opacity: 0; } }
@keyframes m-coin { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes m-fill { 0% { transform: scaleX(0.1); } 60%,100% { transform: scaleX(1); } }
@keyframes m-blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0.25; } }
@keyframes m-scan { 0%,100% { transform: translateY(-16px); opacity: 0.3; } 50% { transform: translateY(18px); opacity: 0.9; } }
@keyframes m-arrive { 0%,60% { opacity: 0.55; } 75% { opacity: 1; filter: drop-shadow(0 0 8px var(--c)); } 100% { opacity: 0.55; } }
@keyframes m-press { 0%,100% { transform: scale(1); } 60% { transform: scale(0.93); } 72% { transform: scale(1.02); } }
@keyframes m-check { 0%,30% { stroke-dashoffset: 40; } 60%,100% { stroke-dashoffset: 0; } }
@keyframes m-stamp { 0% { transform: scale(0) rotate(-25deg); opacity: 0; } 60% { transform: scale(1.2) rotate(6deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }

.reduced .m-aura, .reduced .m-orbit, .reduced .m-ping, .reduced .m-svg * { animation: none !important; }
.reduced .clip-check { stroke-dashoffset: 0; }
.reduced .bar-fill { transform: scaleX(1); }
@media (prefers-reduced-motion: reduce) {
  .m-aura, .m-orbit, .m-ping, .m-svg * { animation: none !important; }
  .clip-check { stroke-dashoffset: 0; }
}
</style>
