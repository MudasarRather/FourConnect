<template>
  <Motion as="section" class="deck trv-grain"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
    <span class="deck-aura" aria-hidden="true" />
    <span class="deck-floor" aria-hidden="true" />

    <!-- ░░ lead ░░ -->
    <div class="deck-lead">
      <span class="deck-eyebrow"><Plane :size="13" /> My travel · Flight deck</span>
      <h1 class="deck-title">{{ greeting }}, <span class="grad">{{ firstName }}</span></h1>
      <p class="deck-sub">Raise tours, book your own seats, request advances and file expenses — every trip tracked from request to settlement.</p>

      <div class="deck-cta">
        <Motion as="button" class="dbtn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          @click="$emit('new')" :disabled="disabled">
          <Plus :size="15" /> New travel request
        </Motion>
        <Motion v-if="actionable" as="button" class="dbtn steel" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
          @click="$emit('expense')">
          <Scale :size="14" /> File an expense
        </Motion>
      </div>

      <div class="deck-mini">
        <div class="mini">
          <span class="mini-ic" style="--mc:var(--trv-ember)"><Wallet :size="14" /></span>
          <div><b class="trv-mono"><TrvCountUp :value="summary.advance_outstanding || 0" :format="fmtCompactINR" /></b><span>Advance out</span></div>
        </div>
        <div class="mini">
          <span class="mini-ic" style="--mc:var(--trv-st-approved)"><Scale :size="14" /></span>
          <div><b class="trv-mono"><TrvCountUp :value="summary.pending_settlement || 0" /></b><span>To settle</span></div>
        </div>
        <div class="mini">
          <span class="mini-ic" style="--mc:var(--trv-amber)"><Gauge :size="14" /></span>
          <div><b class="trv-mono"><TrvCountUp :value="summary.estimated_spend_year || 0" :format="fmtCompactINR" /></b><span>Spend (FY)</span></div>
        </div>
      </div>
    </div>

    <!-- ░░ signature instrument — Live Departures Sky ░░ -->
    <div class="deck-instrument">
      <div class="sky-stage" :class="skyClass" ref="stage">
        <!-- atmosphere -->
        <span class="sky-bg" aria-hidden="true" />
        <span v-if="!reduced" class="sky-stars" aria-hidden="true" />
        <span class="sky-sun" aria-hidden="true" />
        <span v-if="!reduced" class="cloud c1" aria-hidden="true" />
        <span v-if="!reduced" class="cloud c2" aria-hidden="true" />
        <span v-if="!reduced" class="cloud c3" aria-hidden="true" />

        <!-- HUD frame -->
        <span class="hud tl" aria-hidden="true" /><span class="hud tr" aria-hidden="true" />
        <span class="hud bl" aria-hidden="true" /><span class="hud br" aria-hidden="true" />
        <span class="hud-tag trv-mono"><i class="hud-led" :class="{ live: airborne > 0 }" />{{ airborne > 0 ? `${airborne} airborne` : 'Departure deck' }}</span>
        <span class="hud-cruise trv-mono">CRUISE · FL{{ cruiseLevel }}</span>

        <svg class="sky-svg" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="jp-curve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--trv-amber-bright)" stop-opacity="0.95" />
              <stop offset="100%" stop-color="var(--trv-ember)" stop-opacity="0.35" />
            </linearGradient>
            <linearGradient id="jp-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--trv-amber)" stop-opacity="0.2" />
              <stop offset="100%" stop-color="var(--trv-amber)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- ghost flight path (depth) -->
          <path :d="ghostPath" fill="none" stroke="var(--trv-amber)" stroke-width="0.5" stroke-dasharray="1 2.4" opacity="0.22" />
          <!-- cruise flight-level guide -->
          <line x1="34" y1="13" x2="66" y2="13" stroke="var(--trv-amber)" stroke-width="0.3" stroke-dasharray="1.5 2.5" opacity="0.4" />
          <!-- fill under curve -->
          <path :d="areaPath" fill="url(#jp-fill)" />
          <!-- the flight-phase curve -->
          <path id="jp-path" class="jp-curve" :d="curvePath" fill="none" stroke="url(#jp-curve)" stroke-width="1.2" stroke-linecap="round" />
          <!-- gliding plane tracing the route -->
          <g v-if="!reduced" class="jp-plane">
            <circle r="2.4" fill="var(--trv-amber-bright)" opacity="0.18" />
            <path d="M0,0 L-2.8,1.2 L-1,0 L-2.8,-1.2 Z" fill="var(--trv-amber-bright)" />
            <animateMotion dur="8s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath href="#jp-path" />
            </animateMotion>
          </g>
        </svg>

        <!-- runway -->
        <span class="runway" aria-hidden="true"><i v-if="!reduced" class="runway-line" /></span>
        <!-- NOW playhead -->
        <span class="now-line" aria-hidden="true" />
        <span class="now-tag trv-mono">NOW</span>

        <!-- trip beacons on the curve -->
        <span v-for="d in dots" :key="d.id" class="beacon" :class="{ live: d.live }"
          :style="{ left: d.x + '%', top: (d.y / 50 * 100) + '%', '--dc': d.hex, '--di': d.i }"
          :title="`${d.ref} · ${d.label}`">
          <i class="beacon-core" /><i v-if="d.live && !reduced" class="beacon-ping" />
        </span>

        <!-- empty-sky hint -->
        <span v-if="!dots.length" class="sky-empty trv-mono">No trips in the sky yet</span>
      </div>

      <!-- phase lenses (clickable filters) -->
      <div class="sky-lenses">
        <button class="lens all" :class="{ on: filter === '' }" @click="$emit('pick', '')">
          <span class="lens-n trv-mono"><TrvCountUp :value="total" /></span>
          <span class="lens-l">All trips</span>
          <span class="lens-bar" />
        </button>
        <button v-for="p in phases" :key="p.key" class="lens" :class="{ on: filter === p.key }"
          :style="{ '--lc': p.hex }" @click="$emit('pick', filter === p.key ? '' : p.key)">
          <span class="lens-dot" :class="{ beat: p.key === 'travelling' && p.count }" />
          <span class="lens-n trv-mono"><TrvCountUp :value="p.count" /></span>
          <span class="lens-l">{{ p.label }}</span>
          <span class="lens-bar" />
        </button>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Plane, Plus, Scale, Wallet, Gauge } from 'lucide-vue-next'
import TrvCountUp from '../components/TrvCountUp.vue'
import { fmtCompactINR } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  requests: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({}) },
  filter: { type: String, default: '' },
  firstName: { type: String, default: 'there' },
  greeting: { type: String, default: 'Hello' },
  actionable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
defineEmits(['new', 'pick', 'expense'])

const stage = ref(null)
const reduced = prefersReduced()

// time-of-day sky palette (stays in the warm brand range — dawn/day/dusk/night)
const hour = new Date().getHours()
const skyClass = computed(() => hour < 6 ? 'night' : hour < 11 ? 'dawn' : hour < 16 ? 'day' : hour < 20 ? 'dusk' : 'night')
const cruiseLevel = 370   // playful flight-level readout

// smooth side-profile flight curve: taxi → rotate → climb → cruise → descend → land
const curvePath = 'M3,44 L13,44 C22,44 24,13 37,13 L63,13 C76,13 78,44 87,44 L97,44'
const areaPath = `${curvePath} L97,48 L3,48 Z`
// a fainter parallel path for depth
const ghostPath = 'M3,47 L13,47 C24,47 26,19 39,19 L61,19 C74,19 76,47 87,47 L97,47'

// lifecycle phases mapped onto anchor points along the curve
const PHASES = [
  { key: 'planning', label: 'Planning', statuses: ['DRAFT', 'RETURNED'], hex: '#9ca3af', x: 9, y: 44 },
  { key: 'review', label: 'In review', statuses: ['PENDING_APPROVAL'], hex: '#fbbf24', x: 22, y: 30 },
  { key: 'approved', label: 'Approved', statuses: ['APPROVED'], hex: '#34d399', x: 36, y: 14 },
  { key: 'travelling', label: 'Travelling', statuses: ['IN_PROGRESS'], hex: '#fb923c', x: 50, y: 13 },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'], hex: '#60d394', x: 90, y: 43 },
]

const phaseOf = (status) => PHASES.find(p => p.statuses.includes(status))

const phases = computed(() => PHASES.map(p => ({
  ...p, count: props.requests.filter(r => p.statuses.includes(r.status)).length,
})))

const total = computed(() => props.requests.length)
const airborne = computed(() => props.requests.filter(r => r.status === 'IN_PROGRESS').length)

// plot up to 26 trips as glowing beacons along the curve, jittered around the phase anchor
const dots = computed(() => {
  const out = []
  const seen = {}
  for (const r of props.requests) {
    const p = phaseOf(r.status)
    if (!p) continue
    const n = (seen[p.key] = (seen[p.key] || 0) + 1) - 1
    if (out.length >= 26) break
    const jx = ((n % 5) - 2) * 2.4 + (n > 4 ? 1.1 : 0)
    const jy = (n % 3) * -2.2
    out.push({
      id: r.id, ref: r.travel_reference_number, label: PHASES.find(x => x.key === p.key).label,
      hex: p.hex, x: Math.max(4, Math.min(96, p.x + jx)), y: Math.max(8, Math.min(46, p.y + jy)),
      live: r.status === 'IN_PROGRESS', i: out.length,
    })
  }
  return out
})
</script>

<style scoped>
.deck {
  position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr 1.05fr; gap: 26px; align-items: center;
  padding: 28px 30px; border-radius: 26px; background: var(--trv-surface-elevated);
  border: 1px solid var(--trv-border); box-shadow: var(--trv-shadow);
}
.deck-aura { position: absolute; inset: -40% 30% 30% -12%; background: radial-gradient(60% 80% at 28% 6%, rgba(251,191,36,0.18), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; pointer-events: none; }
.deck-floor {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px);
  background-size: 34px 34px; mask-image: radial-gradient(80% 70% at 70% 60%, #000, transparent 75%);
}

/* lead */
.deck-lead { position: relative; }
.deck-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.deck-title { font-size: clamp(25px, 3.6vw, 38px); font-weight: 850; margin: 13px 0 7px; line-height: 1.04; color: var(--trv-text); }
.deck-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.deck-sub { font-size: 13.5px; color: var(--trv-text-secondary); margin: 0 0 18px; max-width: 440px; line-height: 1.55; }
.deck-cta { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.dbtn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; }
.dbtn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.dbtn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.dbtn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

.deck-mini { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mini { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.mini-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--mc); background: color-mix(in srgb, var(--mc) 14%, transparent); flex-shrink: 0; }
.mini b { display: block; font-size: 15px; font-weight: 800; color: var(--trv-text); line-height: 1.1; }
.mini span { font-size: 9.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trv-text-dim); }

/* ░░ instrument — Live Departures Sky ░░ */
.deck-instrument { position: relative; }
.sky-stage {
  position: relative; width: 100%; aspect-ratio: 100 / 50; border-radius: 18px; overflow: hidden;
  border: 1px solid var(--trv-border-strong); background: var(--trv-flap);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -30px 50px -20px rgba(0,0,0,0.6);
}
/* vertical sky gradient — warm tones, time-of-day tinted */
.sky-bg { position: absolute; inset: 0; }
.sky-stage.night .sky-bg { background: linear-gradient(180deg, #0a0807 0%, #14100b 48%, #2a1c0e 100%); }
.sky-stage.dawn  .sky-bg { background: linear-gradient(180deg, #1a130d 0%, #3a2410 45%, #6b3d12 100%); }
.sky-stage.day   .sky-bg { background: linear-gradient(180deg, #17120c 0%, #3a2a12 42%, #7a4d12 100%); }
.sky-stage.dusk  .sky-bg { background: linear-gradient(180deg, #130d0a 0%, #3a1c0e 44%, #7a2f0e 100%); }
/* horizon sun/moon glow rising from the runway */
.sky-sun { position: absolute; left: 50%; bottom: -34%; width: 62%; aspect-ratio: 1; transform: translateX(-50%); border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(252,211,77,0.4), rgba(251,146,60,0.14) 45%, transparent 70%); }
.sky-stage.night .sky-sun { background: radial-gradient(circle, rgba(252,211,77,0.22), transparent 68%); }

/* starfield (warm-white pinpricks) — visibility driven by inherited --star-op per sky-class */
.sky-stage { --star-op: 0; }
.sky-stage.night { --star-op: 0.7; }
.sky-stage.dusk { --star-op: 0.35; }
.sky-stars { position: absolute; inset: 0; opacity: var(--star-op); pointer-events: none; animation: sky-twinkle 5s ease-in-out infinite;
  background-image:
    radial-gradient(1px 1px at 12% 24%, rgba(255,248,235,0.9), transparent),
    radial-gradient(1px 1px at 28% 14%, rgba(255,248,235,0.6), transparent),
    radial-gradient(1.4px 1.4px at 46% 30%, rgba(255,248,235,0.8), transparent),
    radial-gradient(1px 1px at 64% 12%, rgba(255,248,235,0.55), transparent),
    radial-gradient(1px 1px at 78% 26%, rgba(255,248,235,0.75), transparent),
    radial-gradient(1.2px 1.2px at 88% 16%, rgba(255,248,235,0.6), transparent),
    radial-gradient(1px 1px at 36% 8%, rgba(255,248,235,0.5), transparent);
}

/* drifting cloud wisps */
.cloud { position: absolute; height: 22%; border-radius: 50%; filter: blur(9px); pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(251,191,36,0.14), transparent 70%); animation: cloud-drift linear infinite; }
.cloud.c1 { top: 22%; width: 46%; opacity: 0.8; animation-duration: 26s; }
.cloud.c2 { top: 44%; width: 60%; opacity: 0.55; animation-duration: 38s; animation-delay: -12s; }
.cloud.c3 { top: 10%; width: 36%; opacity: 0.5; animation-duration: 46s; animation-delay: -6s; }

/* HUD frame */
.hud { position: absolute; width: 14px; height: 14px; border: 1.5px solid var(--trv-amber-border); pointer-events: none; }
.hud.tl { top: 9px; left: 9px; border-right: 0; border-bottom: 0; border-top-left-radius: 4px; }
.hud.tr { top: 9px; right: 9px; border-left: 0; border-bottom: 0; border-top-right-radius: 4px; }
.hud.bl { bottom: 9px; left: 9px; border-right: 0; border-top: 0; border-bottom-left-radius: 4px; }
.hud.br { bottom: 9px; right: 9px; border-left: 0; border-top: 0; border-bottom-right-radius: 4px; }
.hud-tag { position: absolute; top: 11px; left: 18px; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-amber-bright); }
.hud-led { width: 6px; height: 6px; border-radius: 50%; background: var(--trv-steel); }
.hud-led.live { background: var(--trv-ember); box-shadow: 0 0 8px var(--trv-ember); animation: trv-beacon 1.6s ease-in-out infinite; }
.hud-cruise { position: absolute; top: 11px; right: 18px; font-size: 9px; letter-spacing: 0.1em; color: var(--trv-text-dim); }

.sky-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.jp-curve { filter: drop-shadow(0 0 2.2px rgba(251,191,36,0.55)); }
.jp-plane { filter: drop-shadow(0 0 1.8px var(--trv-amber)); }

/* runway slab + flowing centre line */
.runway { position: absolute; left: 0; right: 0; bottom: 0; height: 12%; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.32)); overflow: hidden; }
.runway-line { position: absolute; left: 6%; right: 6%; top: 50%; height: 2px; transform: translateY(-50%); border-radius: 2px;
  background: repeating-linear-gradient(90deg, var(--trv-amber) 0 10px, transparent 10px 22px); background-size: 22px 100%; opacity: 0.5; animation: trv-runway-flow 0.9s linear infinite; }
.now-line { position: absolute; left: 50%; top: 8%; bottom: 12%; width: 1px; transform: translateX(-50%); background: linear-gradient(180deg, transparent, var(--trv-amber), transparent); opacity: 0.5; }
.now-tag { position: absolute; left: 50%; top: 6%; transform: translateX(-50%); font-size: 8px; letter-spacing: 0.16em; color: var(--trv-amber); opacity: 0.75; }

/* trip beacons */
.beacon { position: absolute; transform: translate(-50%, -50%); }
.beacon-core { display: block; width: 11px; height: 11px; border-radius: 50%; background: var(--dc); border: 2px solid var(--trv-flap);
  box-shadow: 0 0 11px color-mix(in srgb, var(--dc) 75%, transparent); animation: beacon-pop 0.5s var(--trv-spring) backwards; animation-delay: calc(var(--di) * 0.04s + 0.2s); }
.beacon-ping { position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid var(--dc); animation: beacon-ring 1.8s ease-out infinite; }
@keyframes beacon-pop { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
@keyframes beacon-ring { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }
.sky-empty { position: absolute; left: 50%; top: 40%; transform: translateX(-50%); font-size: 10px; letter-spacing: 0.08em; color: var(--trv-text-dim); }

@keyframes sky-twinkle { 0%, 100% { opacity: var(--star-op, 0); } 50% { opacity: calc(var(--star-op, 0) * 0.45); } }
@keyframes cloud-drift { 0% { transform: translateX(-60%); } 100% { transform: translateX(170%); } }

/* lenses */
.sky-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; margin-top: 12px; }
.lens { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 11px 4px 12px; border-radius: 14px; cursor: pointer; overflow: hidden;
  background: var(--trv-panel); border: 1px solid var(--trv-border); transition: border-color 0.22s, background 0.22s, transform 0.22s; }
.lens:hover { transform: translateY(-3px); border-color: var(--trv-border-strong); }
.lens.on { border-color: color-mix(in srgb, var(--lc, var(--trv-amber)) 55%, transparent); background: color-mix(in srgb, var(--lc, var(--trv-amber)) 13%, transparent); }
.lens.all.on { border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.lens-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lc); box-shadow: 0 0 9px color-mix(in srgb, var(--lc) 65%, transparent); }
.lens-dot.beat { animation: trv-beacon 1.6s ease-in-out infinite; }
.lens.all .lens-n { margin-top: 4px; }
.lens-n { font-size: 18px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.lens.on .lens-n { color: var(--lc, var(--trv-amber)); }
.lens.all.on .lens-n { color: var(--trv-amber); }
.lens-l { font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--trv-text-dim); text-align: center; }
.lens-bar { position: absolute; left: 18%; right: 18%; bottom: 0; height: 2.5px; border-radius: 3px 3px 0 0; background: var(--lc, var(--trv-amber)); transform: scaleX(0); transform-origin: center; transition: transform 0.3s var(--trv-spring); }
.lens.on .lens-bar { transform: scaleX(1); }

@media (max-width: 940px) { .deck { grid-template-columns: 1fr; } .sky-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .deck-mini { grid-template-columns: 1fr; } }

/* ─── light theme — daytime cream sky ─── */
[data-theme="light"] .sky-stage { background: #fff7e9; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -28px 46px -22px rgba(180,120,30,0.28); }
[data-theme="light"] .sky-stage.night .sky-bg { background: linear-gradient(180deg, #fbeccb 0%, #f6d99e 50%, #f0bf73 100%); }
[data-theme="light"] .sky-stage.dawn .sky-bg  { background: linear-gradient(180deg, #fff6e4 0%, #ffe6b8 48%, #ffcf8a 100%); }
[data-theme="light"] .sky-stage.day .sky-bg   { background: linear-gradient(180deg, #fff9ec 0%, #ffeaba 46%, #ffd486 100%); }
[data-theme="light"] .sky-stage.dusk .sky-bg  { background: linear-gradient(180deg, #fff0dd 0%, #ffd6a0 46%, #ffb877 100%); }
[data-theme="light"] .sky-stars { display: none; }
[data-theme="light"] .sky-sun { background: radial-gradient(circle, rgba(255,238,180,0.85), rgba(251,146,60,0.2) 45%, transparent 72%); }
[data-theme="light"] .beacon-core { border-color: #fff7e9; }
[data-theme="light"] .cloud { background: radial-gradient(ellipse at center, rgba(255,255,255,0.7), transparent 70%); }
[data-theme="light"] .runway { background: linear-gradient(180deg, transparent, rgba(180,120,30,0.16)); }

@media (prefers-reduced-motion: reduce) {
  .deck-aura, .sky-stars, .cloud, .runway-line, .now-line, .hud-led.live, .beacon-core, .beacon-ping, .lens-dot.beat { animation: none; }
}
</style>
