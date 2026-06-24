<template>
  <Motion ref="rootRef" as="section" class="ex-pass ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="pass-spot" aria-hidden="true" />

    <div class="pass-head">
      <span class="pass-eyebrow"><Sparkles :size="12" /> The current of departure</span>
      <span class="pass-meta"><b>{{ totalCases }}</b> lifetime separations · <b>{{ activeNow }}</b> in&nbsp;flight</span>
    </div>

    <!-- full-bleed flowing scene: a current of light streaming toward the threshold -->
    <div class="pass-stage" :style="{ '--glow': sunGlow, '--seal': sealed ? 1 : 0 }">
      <span class="stage-field" aria-hidden="true" />
      <span class="stage-sun" aria-hidden="true" />
      <span class="stage-vignette" aria-hidden="true" />

      <svg class="pass-svg" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice"
        role="img" aria-label="The current of departure">
        <defs>
          <linearGradient id="exFlowA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fcd34d" stop-opacity="0" />
            <stop offset="35%" stop-color="#fbbf24" stop-opacity="0.9" />
            <stop offset="75%" stop-color="#fb923c" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0.2" />
          </linearGradient>
          <linearGradient id="exFlowB" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fb923c" stop-opacity="0" />
            <stop offset="40%" stop-color="#ea580c" stop-opacity="0.85" />
            <stop offset="78%" stop-color="#fcd34d" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#fde68a" stop-opacity="0.25" />
          </linearGradient>
          <radialGradient id="exThreshGrad" cx="100%" cy="50%" r="60%">
            <stop offset="0%" stop-color="#fff7e6" stop-opacity="0.9" />
            <stop offset="45%" stop-color="#fcd34d" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#fb923c" stop-opacity="0" />
          </radialGradient>
          <!-- deeper ribbon gradient so the current reads on the cream light theme -->
          <linearGradient id="exFlowLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0" />
            <stop offset="38%" stop-color="#ea580c" stop-opacity="0.8" />
            <stop offset="78%" stop-color="#c2410c" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#b45309" stop-opacity="0.2" />
          </linearGradient>
          <filter id="exFlowBlur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
        </defs>

        <!-- ambient drift specks -->
        <g class="cur-stars">
          <circle v-for="(s, i) in stars" :key="i" :cx="s.x" :cy="s.y" :r="s.r"
            :style="{ animationDelay: s.delay + 's' }" />
        </g>

        <!-- flowing aurora-silk ribbons (full width) -->
        <g class="cur-ribbons">
          <path v-for="(rb, i) in ribbons" :key="i" class="cur-ribbon" :d="rb.d" fill="none"
            :stroke="`url(#${rb.grad})`" :style="{
              strokeWidth: rb.w, strokeDasharray: rb.dash, opacity: rb.op,
              animationDuration: rb.dur, '--flow': rb.flow + 'px',
            }" />
        </g>

        <!-- particle current — souls streaming toward the threshold -->
        <g class="cur-parts" v-if="!reduced">
          <circle v-for="(p, i) in particles" :key="i" class="cur-part" cx="0" cy="0" :r="p.r"
            :style="{ offsetPath: p.path, animationDelay: p.delay, animationDuration: p.dur }" />
        </g>

        <!-- the threshold of light at the right horizon -->
        <g class="cur-threshold">
          <rect class="thr-seam" x="978" y="36" width="10" height="228" rx="5" fill="url(#exThreshGrad)" />
          <circle class="thr-ring" cx="992" cy="150" r="44" />
          <circle class="thr-ring" cx="992" cy="150" r="44" style="animation-delay:-1.6s" />
          <circle class="thr-ring" cx="992" cy="150" r="44" style="animation-delay:-3.2s" />
        </g>
      </svg>

      <!-- full-width journey meridian -->
      <div class="pass-rail">
        <span class="pr-lab">Journey</span>
        <span class="pr-track">
          <span class="pr-fill" :style="{ width: avgCompletion + '%' }"><i class="pr-head" /></span>
        </span>
        <span class="pr-pct"><ExCountUp :value="avgCompletion" :suffix="'%'" /></span>
      </div>
    </div>

    <!-- telemetry lenses -->
    <div class="pass-lenses">
      <Motion v-for="(lns, i) in lenses" :key="lns.key" as="button" class="lens" :class="{ alert: lns.alert }"
        :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.14 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
        @click="$emit('go', lns.go)" type="button">
        <span class="lens-ico" :style="{ '--c': lns.hex }"><component :is="lns.icon" :size="15" /></span>
        <span class="lens-body">
          <span class="lens-val"><ExCountUp :value="lns.value" /></span>
          <span class="lens-lab">{{ lns.label }}</span>
        </span>
        <span class="lens-bar" :style="{ '--c': lns.hex }" />
        <span v-if="lns.alert" class="lens-ping" :style="{ '--c': lns.hex }" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import {
  Sparkles, DoorOpen, CalendarClock, ClipboardCheck, Scale, MessagesSquare, BadgeCheck, Activity,
} from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  stats: { type: Object, default: null },
})
defineEmits(['go'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const k = computed(() => props.stats?.kpis || {})
const byStatus = computed(() => props.stats?.by_status || {})
const totalCases = computed(() => Number(k.value.total_cases || 0))
const activeNow = computed(() => Number(k.value.active_resignations || 0))

// average lifecycle progress across all open + relieved cases (weighted by count),
// so a single case serving notice reads ~48%, not 0% (relieved-only was misleading).
const STATUS_PROGRESS = {
  DRAFT: 5, SUBMITTED: 12, MANAGER_REVIEW: 22, ACCEPTED: 32,
  NOTICE_PERIOD: 48, CLEARANCE: 66, SETTLEMENT: 84, COMPLETED: 100,
}
const avgCompletion = computed(() => {
  const s = byStatus.value || {}
  let num = 0, den = 0
  for (const [st, p] of Object.entries(STATUS_PROGRESS)) {
    const c = Number(s[st] || 0)
    num += c * p; den += c
  }
  return den ? Math.round(num / den) : 0
})
const sunGlow = computed(() => +(0.42 + (avgCompletion.value / 100) * 0.5).toFixed(3))
const sealed = computed(() =>
  avgCompletion.value >= 60 ||
  (Number(k.value.pending_clearances || 0) === 0 && Number(k.value.active_resignations || 0) > 0))

// ── ambient (data-independent) geometry, computed once ────────────────────────
let _seed = 20240624
const rnd = () => { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280 }

const stars = (() => Array.from({ length: 22 }, (_, i) => ({
  x: Math.round(20 + rnd() * 940),
  y: Math.round(18 + rnd() * 264),
  r: +(0.6 + (i % 3) * 0.5).toFixed(2),
  delay: +(rnd() * 4).toFixed(2),
})))()

// five smooth currents spanning the full width, bleeding past both edges
const ribbons = [
  { d: 'M -60 96 C 200 44 360 150 560 112 S 880 58 1060 120', w: 17, dur: '8.5s', dash: '70 46', flow: -116, op: 0.5, grad: 'exFlowA' },
  { d: 'M -60 152 C 220 116 430 220 630 168 S 900 128 1060 178', w: 22, dur: '11s', dash: '90 56', flow: -146, op: 0.42, grad: 'exFlowB' },
  { d: 'M -60 212 C 180 256 430 150 650 220 S 880 252 1060 200', w: 15, dur: '9.5s', dash: '60 44', flow: -104, op: 0.45, grad: 'exFlowA' },
  { d: 'M -60 64 C 260 120 520 60 760 108 S 940 78 1060 92', w: 13, dur: '13s', dash: '54 40', flow: -94, op: 0.34, grad: 'exFlowB' },
  { d: 'M -60 250 C 250 208 480 282 720 240 S 920 222 1060 252', w: 19, dur: '10.5s', dash: '80 50', flow: -130, op: 0.38, grad: 'exFlowA' },
]

// dense particle current riding the ribbons toward the threshold
const particles = (() => {
  const out = []
  ribbons.forEach((rb, i) => {
    const per = 6
    const base = 6 + i * 0.7
    for (let j = 0; j < per; j++) {
      out.push({
        path: `path('${rb.d}')`,
        r: +(1.6 + rnd() * 1.9).toFixed(2),
        dur: +(base + rnd() * 3).toFixed(2) + 's',
        delay: -(+((j / per) * base + rnd() * 1.4).toFixed(2)) + 's',
      })
    }
  })
  return out
})()

const lenses = computed(() => ([
  { key: 'active', label: 'Active exits', value: Number(k.value.active_resignations || 0), icon: DoorOpen, hex: '#fbbf24', go: 'resignation' },
  { key: 'notice', label: 'Serving notice', value: Number(k.value.serving_notice || 0), icon: CalendarClock, hex: '#ea580c', go: 'notice' },
  { key: 'clearance', label: 'Pending clearance', value: Number(k.value.pending_clearances || 0), icon: ClipboardCheck, hex: '#d97706', go: 'clearance', alert: Number(k.value.pending_clearances || 0) > 0 },
  { key: 'settlement', label: 'Pending F&F', value: Number(k.value.pending_settlements || 0), icon: Scale, hex: '#34d399', go: 'settlement', alert: Number(k.value.pending_settlements || 0) > 0 },
  { key: 'interview', label: 'Interviews due', value: Number(k.value.pending_interviews || 0), icon: MessagesSquare, hex: '#fb923c', go: 'interviews' },
  { key: 'relieved', label: 'Relieved (mo.)', value: Number(k.value.relieved_this_month || 0), icon: BadgeCheck, hex: '#60d394', go: 'reports' },
  { key: 'tat', label: 'Avg TAT (days)', value: Number(k.value.avg_processing_days || 0), icon: Activity, hex: '#f59e0b', go: 'reports' },
]))
</script>

<style scoped>
.ex-pass {
  position: relative; overflow: hidden; border-radius: 24px; padding: 16px 20px 16px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-shadow);
}
.pass-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 4;
  background: radial-gradient(620px 320px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 240, 214, 0.12), transparent 64%); }

.pass-head { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.pass-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet); }
.pass-meta { font-size: 11.5px; color: var(--ex-text-muted); }
.pass-meta b { color: var(--ex-text-secondary); font-weight: 800; font-family: var(--ex-mono); }

/* ── full-bleed flowing stage ─────────────────────────────────────────────── */
.pass-stage { position: relative; height: clamp(228px, 26vw, 300px); border-radius: 18px; overflow: hidden;
  background:
    radial-gradient(120% 150% at 4% 12%, rgba(251, 146, 60, 0.10), transparent 52%),
    radial-gradient(90% 120% at 100% 55%, rgba(234, 88, 12, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(252, 211, 77, 0.05), rgba(234, 88, 12, 0.03));
  border: 1px solid var(--ex-border); }
.stage-field { position: absolute; inset: -10%; pointer-events: none; z-index: 0; background-size: 220% 220%;
  background-image: radial-gradient(40% 60% at 25% 30%, rgba(251, 146, 60, 0.10), transparent 60%),
    radial-gradient(50% 70% at 70% 70%, rgba(252, 211, 77, 0.08), transparent 60%);
  animation: ex-tide-flow 26s ease-in-out infinite alternate; }
.stage-sun { position: absolute; top: 0; bottom: 0; right: -8%; width: 46%; pointer-events: none; z-index: 1; opacity: var(--glow, 0.5);
  background: radial-gradient(58% 72% at 100% 50%, rgba(255, 247, 230, 0.55), rgba(251, 146, 60, 0.30) 34%, transparent 66%);
  transform-origin: right center; animation: cur-sun 6.5s ease-in-out infinite; transition: opacity 1s var(--ex-spring); }
.stage-vignette { position: absolute; inset: 0; pointer-events: none; z-index: 3;
  box-shadow: inset 0 0 60px 14px rgba(10, 8, 7, 0.4); border-radius: inherit; }
@keyframes cur-sun { 0%, 100% { transform: scale(1); opacity: var(--glow, 0.5); } 50% { transform: scale(1.06); opacity: calc(var(--glow, 0.5) + 0.12); } }

.pass-svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; }

.cur-ribbons { transform: translate(calc((var(--mx, 0.5) - 0.5) * -16px), calc((var(--my, 0.5) - 0.5) * -10px)); transition: transform 0.4s var(--ex-ease); }
.cur-parts { transform: translate(calc((var(--mx, 0.5) - 0.5) * -26px), calc((var(--my, 0.5) - 0.5) * -16px)); transition: transform 0.4s var(--ex-ease); }
.cur-stars { transform: translate(calc((var(--mx, 0.5) - 0.5) * -7px), calc((var(--my, 0.5) - 0.5) * -4px)); transition: transform 0.4s var(--ex-ease); }

.cur-stars circle { fill: var(--ex-amber-bright); opacity: 0.45; animation: ex-twinkle 4s ease-in-out infinite; }
@keyframes ex-twinkle { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.7; } }

.cur-ribbon { stroke-linecap: round; filter: url(#exFlowBlur); mix-blend-mode: screen;
  animation-name: cur-flow; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes cur-flow { to { stroke-dashoffset: var(--flow, -110px); } }

.cur-part { fill: var(--ex-amber-bright); filter: drop-shadow(0 0 5px var(--ex-amber)); mix-blend-mode: screen; opacity: 0;
  offset-rotate: 0deg; animation-name: cur-drift; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes cur-drift {
  0% { offset-distance: 0%; opacity: 0; }
  9% { opacity: 0.95; }
  86% { opacity: 0.8; }
  100% { offset-distance: 100%; opacity: 0; }
}

.cur-threshold { transform: translate(calc((var(--mx, 0.5) - 0.5) * -4px), 0); transition: transform 0.4s var(--ex-ease); }
.thr-seam { opacity: calc(0.4 + var(--glow, 0.5) * 0.5); animation: cur-seam 4s ease-in-out infinite; }
@keyframes cur-seam { 0%, 100% { opacity: calc(0.35 + var(--glow, 0.5) * 0.4); } 50% { opacity: calc(0.6 + var(--glow, 0.5) * 0.45); } }
.thr-ring { fill: none; stroke: var(--ex-amber-bright); stroke-width: 1.5; opacity: 0;
  transform-box: fill-box; transform-origin: center; animation: cur-ring 4.6s ease-out infinite; }
@keyframes cur-ring { 0% { transform: scale(0.4); opacity: 0.5; } 100% { transform: scale(3.6); opacity: 0; } }

/* ── full-width journey meridian ──────────────────────────────────────────── */
.pass-rail { position: absolute; left: 18px; right: 18px; bottom: 13px; z-index: 3; display: flex; align-items: center; gap: 12px; }
.pr-lab { font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ex-text-muted); flex-shrink: 0; }
.pr-track { flex: 1; height: 5px; border-radius: 999px; background: var(--ex-steel-soft); position: relative; }
.pr-fill { position: relative; display: block; height: 100%; border-radius: 999px; overflow: visible;
  background: var(--ex-grad-hero); box-shadow: 0 0 14px rgba(251, 146, 60, 0.5); transition: width 1.1s var(--ex-spring); }
.pr-fill::after { content: ""; position: absolute; inset: 0; border-radius: 999px; overflow: hidden;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent); animation: ex-sheen-pass 3s ease-in-out infinite; }
.pr-head { position: absolute; right: -3px; top: 50%; width: 9px; height: 9px; border-radius: 50%; transform: translateY(-50%);
  background: #fff7e6; box-shadow: 0 0 10px 2px rgba(252, 211, 77, 0.9); }
.pr-pct { font-family: var(--ex-mono); font-size: 13px; font-weight: 850; flex-shrink: 0; line-height: 1;
  background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }

/* ── lenses ───────────────────────────────────────────────────────────────── */
.pass-lenses { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-top: 12px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; cursor: pointer;
  padding: 10px 11px; border-radius: 14px; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, box-shadow 0.2s; }
.lens:hover { border-color: var(--ex-violet-border); box-shadow: 0 10px 26px rgba(0, 0, 0, 0.3); }
.lens.alert { border-color: color-mix(in srgb, var(--c, var(--ex-violet)) 42%, transparent); }
.lens-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-val { font-family: var(--ex-mono); font-size: 18px; font-weight: 820; color: var(--ex-text); line-height: 1; }
.lens-lab { font-size: 10px; font-weight: 600; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); opacity: 0.55; }
.lens-ping { position: absolute; top: 9px; right: 9px; width: 7px; height: 7px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 60%, transparent); animation: ex-node-ping 2s ease-out infinite; }

@media (max-width: 1100px) { .pass-lenses { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 680px) { .pass-lenses { grid-template-columns: repeat(2, 1fr); } }

/* ── light theme — gentle the dusk for cream ──────────────────────────────── */
[data-theme="light"] .pass-stage { background:
    radial-gradient(120% 150% at 4% 12%, rgba(234, 88, 12, 0.08), transparent 52%),
    radial-gradient(90% 120% at 100% 55%, rgba(234, 88, 12, 0.09), transparent 60%),
    linear-gradient(180deg, rgba(245, 158, 11, 0.05), rgba(234, 88, 12, 0.02)); }
[data-theme="light"] .stage-vignette { box-shadow: inset 0 0 50px 10px rgba(120, 90, 30, 0.08); }
[data-theme="light"] .cur-stars circle { fill: var(--ex-ember); }
/* screen blend lightens → invisible on cream; use normal blend + deeper colors in light */
[data-theme="light"] .cur-ribbon { mix-blend-mode: normal; stroke: url(#exFlowLight) !important; }
[data-theme="light"] .cur-part { mix-blend-mode: normal; fill: var(--ex-ember); filter: drop-shadow(0 0 5px var(--ex-ember)); }
[data-theme="light"] .thr-ring { stroke: var(--ex-ember); }

@media (prefers-reduced-motion: reduce) {
  .stage-field, .stage-sun, .cur-stars circle, .cur-ribbon, .cur-part, .thr-seam, .thr-ring, .pr-fill::after, .lens-ping { animation: none; }
  .cur-ribbons, .cur-parts, .cur-stars, .cur-threshold { transform: none; transition: none; }
  .pr-fill, .stage-sun { transition: none; }
  .cur-ribbon { stroke-dasharray: none; }
  .thr-ring { opacity: 0.25; }
}
</style>
