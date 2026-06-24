<template>
  <div ref="el" class="rca" :class="[size, { live }]"
    :style="{ '--a': report.accent, '--soft': report.soft, '--deep': report.deep }">
    <!-- gradient cover stock + morphing ink blobs (the reference-magazine feel) -->
    <span class="rca-stock" aria-hidden="true" />
    <span class="rca-blob b1" aria-hidden="true" />
    <span class="rca-blob b2" aria-hidden="true" />
    <span class="rca-grain" aria-hidden="true" />

    <!-- per-report signature glyph -->
    <svg class="rca-glyph" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <!-- gateway -->
      <g v-if="m==='gateway'">
        <circle cx="100" cy="92" r="52" class="g-halo" />
        <path d="M52 132 L52 92 Q100 44 148 92 L148 132" fill="none" stroke="#fff" stroke-width="5" stroke-opacity="0.9" />
        <rect class="g-beam" x="96" y="58" width="8" height="78" rx="4" fill="#fff" />
        <rect v-for="i in 3" :key="i" :x="100-(18+i*16)" :y="150-i*0" :width="(18+i*16)*2" height="9" rx="3"
          fill="#fff" :fill-opacity="0.14+i*0.12" :style="{ transform:`translateY(${(3-i)*-14}px)` }" />
      </g>
      <!-- compass -->
      <g v-else-if="m==='compass'">
        <circle cx="100" cy="100" r="64" fill="none" stroke="#fff" stroke-width="2" stroke-opacity="0.45" />
        <circle cx="100" cy="100" r="42" fill="none" stroke="#fff" stroke-width="2" stroke-opacity="0.3" />
        <g class="g-spin">
          <line v-for="i in 12" :key="i" x1="100" y1="100"
            :x2="100+62*Math.cos(i*Math.PI/6)" :y2="100+62*Math.sin(i*Math.PI/6)"
            stroke="#fff" :stroke-opacity="i%3===0?0.4:0.14" :stroke-width="i%3===0?2:1" />
        </g>
        <path class="g-needle" d="M100 50 L108 100 L100 92 L92 100 Z" fill="#fff" />
        <circle cx="100" cy="100" r="7" fill="#fff" />
      </g>
      <!-- strata (tree rings) -->
      <g v-else-if="m==='strata'">
        <circle v-for="i in 7" :key="i" class="g-ring" cx="100" cy="100" :r="14+i*12" fill="none"
          stroke="#fff" :stroke-opacity="0.6-i*0.06" :stroke-width="i%2?3:1.5" :style="{ animationDelay:`${i*0.18}s` }" />
        <circle cx="100" cy="100" r="7" fill="#fff" />
      </g>
      <!-- boomerang (return) -->
      <g v-else-if="m==='boomerang'">
        <rect x="62" y="56" width="56" height="92" rx="5" fill="#fff" fill-opacity="0.12" stroke="#fff" stroke-opacity="0.45" stroke-width="2" />
        <rect x="118" y="50" width="40" height="100" rx="4" fill="#fff" fill-opacity="0.06" transform="skewY(-8 118 50)" />
        <circle cx="110" cy="104" r="4" fill="#fff" />
        <path class="g-flow" d="M44 168 Q12 96 116 88" fill="none" stroke="#fff" stroke-width="4"
          stroke-opacity="0.85" stroke-dasharray="3 9" stroke-linecap="round" />
        <path d="M104 80 l14 8 l-12 11 z" fill="#fff" />
      </g>
      <!-- pulse (ECG) -->
      <g v-else-if="m==='pulse'">
        <line v-for="i in 4" :key="i" x1="20" :y1="60+i*24" x2="180" :y2="60+i*24" stroke="#fff" stroke-opacity="0.1" />
        <polyline points="20,112 56,112 74,72 92,148 110,92 128,112 180,112" fill="none" stroke="#fff"
          stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.92" />
        <circle class="g-ping" cx="92" cy="148" r="6" fill="#fff" />
        <rect class="g-scan-x" x="0" y="40" width="3" height="120" fill="#fff" fill-opacity="0.5" />
      </g>
      <!-- atlas (skyline) -->
      <g v-else-if="m==='atlas'">
        <line x1="24" y1="156" x2="176" y2="156" stroke="#fff" stroke-opacity="0.4" stroke-width="2" />
        <rect v-for="(h,i) in [44,78,58,100,52,84]" :key="i" class="g-bar" :x="30+i*24" :y="156-h"
          width="16" :height="h" rx="3" fill="#fff" :fill-opacity="0.35+h/260" :style="{ animationDelay:`${i*0.15}s`, transformOrigin:'center bottom' }" />
      </g>
      <!-- prism -->
      <g v-else-if="m==='prism'">
        <line x1="20" y1="76" x2="84" y2="100" stroke="#fff" stroke-width="4" stroke-opacity="0.7" />
        <path d="M100 60 L128 130 L72 130 Z" fill="#fff" fill-opacity="0.16" stroke="#fff" stroke-opacity="0.6" stroke-width="2" />
        <line class="g-ray r1" x1="100" y1="100" x2="184" y2="68" stroke="#34d399" stroke-width="4" />
        <line class="g-ray r2" x1="100" y1="100" x2="184" y2="100" stroke="#fcd34d" stroke-width="4" />
        <line class="g-ray r3" x1="100" y1="100" x2="184" y2="132" stroke="#f87171" stroke-width="4" />
      </g>
      <!-- voiceprint -->
      <g v-else-if="m==='voiceprint'">
        <circle cx="100" cy="100" r="30" fill="#fff" fill-opacity="0.16" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2" />
        <line v-for="i in 28" :key="i" class="g-vb"
          :x1="100+34*Math.cos(i*Math.PI/14)" :y1="100+34*Math.sin(i*Math.PI/14)"
          :x2="100+(34+vbH(i))*Math.cos(i*Math.PI/14)" :y2="100+(34+vbH(i))*Math.sin(i*Math.PI/14)"
          stroke="#fff" stroke-width="3" stroke-linecap="round" :stroke-opacity="0.4+vbH(i)/60"
          :style="{ animationDelay:`${(i%7)*0.12}s` }" />
      </g>
      <!-- hourglass -->
      <g v-else-if="m==='hourglass'">
        <path d="M62 50 L138 50 L108 100 L138 150 L62 150 L92 100 Z" fill="none" stroke="#fff" stroke-width="4" stroke-opacity="0.85" />
        <path d="M70 56 L130 56 L100 100 Z" fill="#fff" fill-opacity="0.5" />
        <path d="M76 144 L124 144 L100 102 Z" fill="#fff" fill-opacity="0.7" />
        <circle v-for="i in 5" :key="i" class="g-grain" :cx="98+(i%2)*4" :cy="98" r="2.4" fill="#fff"
          :style="{ animationDelay:`${i*0.32}s` }" />
      </g>
      <!-- lattice -->
      <g v-else-if="m==='lattice'">
        <g v-for="(st,i) in latState" :key="i">
          <rect :x="44+(i%3)*42" :y="44+Math.floor(i/3)*42" width="34" height="34" rx="8"
            :fill="latCol(st)" fill-opacity="0.22" :stroke="latCol(st)" stroke-opacity="0.6" stroke-width="2" />
          <path v-if="st===1" :d="`M${52+(i%3)*42} ${62+Math.floor(i/3)*42} l5 5 l9 -11`" fill="none"
            stroke="#34d399" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-else-if="st===2" :cx="61+(i%3)*42" :cy="63+Math.floor(i/3)*42" r="4" fill="none" stroke="#f87171" stroke-width="2.4" />
        </g>
        <rect class="g-scan-y" x="34" y="40" width="132" height="2.5" fill="#fff" fill-opacity="0.5" />
      </g>
      <!-- mint -->
      <g v-else-if="m==='mint'">
        <g class="g-rock">
          <line x1="100" y1="58" x2="100" y2="150" stroke="#fff" stroke-width="4" stroke-opacity="0.75" />
          <line x1="56" y1="74" x2="144" y2="74" stroke="#fff" stroke-width="4" stroke-opacity="0.75" />
          <path d="M56 74 L40 108 A18 18 0 0 0 72 108 Z" fill="#fff" fill-opacity="0.2" stroke="#fff" stroke-opacity="0.55" />
          <path d="M144 74 L128 104 A18 18 0 0 0 160 104 Z" fill="#fff" fill-opacity="0.32" stroke="#fff" stroke-opacity="0.55" />
          <circle cx="100" cy="58" r="6" fill="#fff" />
        </g>
        <rect x="84" y="150" width="32" height="9" rx="3" fill="#fff" fill-opacity="0.85" />
        <ellipse v-for="i in 4" :key="i" class="g-coin" cx="46" :cy="146-i*9" rx="22" ry="6"
          fill="#fff" :fill-opacity="0.2+i*0.12" :style="{ animationDelay:`${i*0.2}s` }" />
      </g>
    </svg>

    <!-- editorial overlay (crest · group · title · hero stat · stat trio) -->
    <div class="rca-veil" aria-hidden="true" />
    <div class="rca-top">
      <span class="rca-crest">F</span>
      <span class="rca-grp">{{ report.group }}</span>
    </div>
    <div class="rca-foot">
      <div class="rca-kick">{{ report.tagline }}</div>
      <h3 class="rca-name">{{ report.name }}</h3>
      <div v-if="report.stats?.length" class="rca-stats">
        <div v-for="(s,i) in report.stats" :key="i" class="rca-stat">
          <span class="rca-sv">{{ fmtStat(s) }}</span>
          <span class="rca-sl">{{ s.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  report: { type: Object, required: true },
  size: { type: String, default: 'sm' },   // 'sm' (card) | 'lg' (stage)
  live: { type: Boolean, default: true },
})
const el = ref(null)
const m = computed(() => props.report.motif || 'gateway')

const latState = [1, 1, 0, 1, 2, 1, 1, 0, 1]
const latCol = (st) => (st === 1 ? '#34d399' : st === 2 ? '#f87171' : '#ffffff')
const vbH = (i) => 14 + 22 * Math.abs(Math.sin(i * 1.3)) * (0.55 + 0.45 * Math.cos(i * 0.6))

const fmtCompact = (v) => {
  const a = Math.abs(Number(v) || 0)
  if (a >= 1e7) return '₹' + (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr'
  if (a >= 1e5) return '₹' + (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L'
  if (a >= 1e3) return '₹' + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
  return '₹' + Math.round(v)
}
const fmtStat = (s) => {
  if (s.kind === 'inr') return fmtCompact(s.value)
  if (s.kind === 'pct') return `${s.value}%`
  if (s.kind === 'num1') return Number(s.value).toFixed(1)
  return Number(s.value).toLocaleString('en-IN')
}
</script>

<style scoped>
.rca {
  position: relative; overflow: hidden; border-radius: 16px;
  aspect-ratio: 3 / 4; width: 100%; isolation: isolate;
  background: var(--deep); color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
}
.rca.lg { aspect-ratio: 3 / 3.55; border-radius: 20px; }

.rca-stock { position: absolute; inset: 0; background: linear-gradient(155deg, var(--a) 0%, var(--deep) 115%); }
.rca-blob { position: absolute; border-radius: 50%; filter: blur(18px); mix-blend-mode: screen; opacity: 0.85; pointer-events: none; }
.rca-blob.b1 { width: 75%; height: 55%; left: -12%; top: 30%;
  background: radial-gradient(circle, color-mix(in srgb, var(--soft) 90%, #fff) 0%, transparent 70%);
  animation: rca-drift1 13s ease-in-out infinite; }
.rca-blob.b2 { width: 60%; height: 50%; right: -10%; top: -8%;
  background: radial-gradient(circle, color-mix(in srgb, var(--a) 80%, #fff) 0%, transparent 70%);
  animation: rca-drift2 16s ease-in-out infinite; }
.rca-grain { position: absolute; inset: 0; opacity: 0.3; pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.12) 0.6px, transparent 0.6px); background-size: 3px 3px; }
.rca-veil { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.18) 100%); }

.rca-glyph { position: absolute; inset: 8% 6% 30%; width: 88%; height: 60%; margin: auto; opacity: 0.95; z-index: 1; }

@keyframes rca-drift1 { 0%,100%{ transform: translate(0,0) scale(1);} 50%{ transform: translate(8%,-6%) scale(1.12);} }
@keyframes rca-drift2 { 0%,100%{ transform: translate(0,0) scale(1);} 50%{ transform: translate(-7%,8%) scale(1.1);} }
.g-spin { transform-origin: 100px 100px; animation: rca-spin 26s linear infinite; }
.g-needle { transform-origin: 100px 100px; animation: rca-needle 9s ease-in-out infinite; }
.g-ring { transform-origin: 100px 100px; animation: rca-ringpulse 4.5s ease-in-out infinite; }
.g-beam { transform-origin: center; animation: rca-beam 3.4s ease-in-out infinite; }
.g-flow { animation: rca-dash 2.6s linear infinite; }
.g-ping { transform-origin: 92px 148px; animation: rca-ping 2.2s ease-out infinite; }
.g-scan-x, .g-scan-y { transform-box: view-box; }
.g-scan-x { animation: rca-scanx 3.4s ease-in-out infinite; }
.g-scan-y { animation: rca-scany 3.8s ease-in-out infinite; }
.g-bar { animation: rca-breathe 3.2s ease-in-out infinite; }
.g-ray { transform-origin: 100px 100px; animation: rca-shimmer 3.6s ease-in-out infinite; }
.g-ray.r2 { animation-delay: 0.4s; } .g-ray.r3 { animation-delay: 0.8s; }
.g-vb { transform-origin: 100px 100px; animation: rca-vb 2.4s ease-in-out infinite; }
.g-grain { animation: rca-fall 1.9s ease-in infinite; }
.g-rock { transform-origin: 100px 58px; animation: rca-rock 5.5s ease-in-out infinite; }
.g-coin { animation: rca-coin 3s ease-in-out infinite; }
.g-halo { fill: #fff; fill-opacity: 0.1; transform-origin: 100px 92px; animation: rca-halo 4s ease-in-out infinite; }

@keyframes rca-spin { to { transform: rotate(360deg); } }
@keyframes rca-needle { 0%,100%{ transform: rotate(-8deg);} 50%{ transform: rotate(8deg);} }
@keyframes rca-ringpulse { 0%,100%{ opacity: 0.55; } 50%{ opacity: 1; transform: scale(1.015);} }
@keyframes rca-beam { 0%,100%{ opacity: 0.45; } 50%{ opacity: 1; } }
@keyframes rca-dash { to { stroke-dashoffset: -48; } }
@keyframes rca-ping { 0%{ transform: scale(1); opacity: 1;} 70%,100%{ transform: scale(2.6); opacity: 0;} }
@keyframes rca-scanx { 0%{ transform: translateX(-6px); opacity: 0.2; } 50%{ transform: translateX(200px); opacity: 0.6; } 100%{ transform: translateX(-6px); opacity: 0.2; } }
@keyframes rca-scany { 0%{ transform: translateY(0); opacity: 0.15; } 50%{ transform: translateY(120px); opacity: 0.5; } 100%{ transform: translateY(0); opacity: 0.15; } }
@keyframes rca-breathe { 0%,100%{ transform: scaleY(0.82);} 50%{ transform: scaleY(1.06);} }
@keyframes rca-shimmer { 0%,100%{ opacity: 0.5;} 50%{ opacity: 0.95;} }
@keyframes rca-vb { 0%,100%{ transform: scale(0.78);} 50%{ transform: scale(1.06);} }
@keyframes rca-fall { 0%{ transform: translateY(0); opacity: 0.9;} 100%{ transform: translateY(44px); opacity: 0;} }
@keyframes rca-rock { 0%,100%{ transform: rotate(-3deg);} 50%{ transform: rotate(3deg);} }
@keyframes rca-coin { 0%,100%{ transform: translateY(0); opacity: 0.85;} 50%{ transform: translateY(-2px); opacity: 1;} }
@keyframes rca-halo { 0%,100%{ transform: scale(1); opacity: 0.1;} 50%{ transform: scale(1.08); opacity: 0.2;} }

.rca-top { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 11px 12px; z-index: 2; }
.rca-crest { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; font-weight: 900; font-size: 14px;
  color: #fff; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); }
.rca-grp { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #fff;
  padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.3); }
.rca-foot { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 13px 13px; z-index: 2; }
.rca-kick { font-size: 8px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.82); margin-bottom: 4px; }
.rca-name { font-size: 16px; font-weight: 880; line-height: 1.05; margin: 0; letter-spacing: -0.3px; color: #fff;
  text-shadow: 0 2px 14px rgba(0,0,0,0.32); }
.rca-stats { display: flex; gap: 9px; margin-top: 11px; }
.rca-stat { display: flex; flex-direction: column; min-width: 0; }
.rca-stat + .rca-stat { border-left: 1px solid rgba(255,255,255,0.28); padding-left: 9px; }
.rca-sv { font-size: 15px; font-weight: 850; color: #fff; font-variant-numeric: tabular-nums; line-height: 1; }
.rca-sl { font-size: 7.5px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.78); margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* large (stage) sizing */
.rca.lg .rca-crest { width: 34px; height: 34px; border-radius: 10px; font-size: 18px; }
.rca.lg .rca-grp { font-size: 10px; padding: 5px 12px; }
.rca.lg .rca-kick { font-size: 10px; }
.rca.lg .rca-name { font-size: 27px; }
.rca.lg .rca-sv { font-size: 22px; }
.rca.lg .rca-sl { font-size: 9px; }
.rca.lg .rca-glyph { inset: 9% 8% 32%; }
.rca.lg .rca-top { padding: 16px 18px; }
.rca.lg .rca-foot { padding: 18px 18px 20px; }
.rca.lg .rca-stats { gap: 14px; margin-top: 15px; }

/* the cover stock is a colour panel by design — readable in BOTH themes; only
   soften the screen-blended blobs so they don't blow out on cream. */
[data-theme="light"] .rca-blob { mix-blend-mode: soft-light; opacity: 0.95; }

@media (prefers-reduced-motion: reduce) {
  .rca-blob, .g-spin, .g-needle, .g-ring, .g-beam, .g-flow, .g-ping, .g-scan-x, .g-scan-y,
  .g-bar, .g-ray, .g-vb, .g-grain, .g-rock, .g-coin, .g-halo { animation: none !important; }
}
.rca:not(.live) .rca-blob, .rca:not(.live) [class^="g-"] { animation-play-state: paused; }
</style>
