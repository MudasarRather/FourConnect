<template>
  <Motion
    as="section" class="ohh" ref="heroRef"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="resetMove"
  >
    <!-- ambient layer: dormant stone + ember lamps; slow chain-link silhouettes -->
    <div class="ohh-atm" aria-hidden="true">
      <span class="orb a1" :style="orbStyle(1)" />
      <span class="orb a2" :style="orbStyle(0.6)" />
      <span class="orb a3" :style="orbStyle(0.32)" />
      <span class="orb a4" :style="orbStyle(-0.4)" />
      <span class="ohh-grain" />
      <span class="ohh-grid" />
      <svg class="ohh-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <path class="ml" d="M-40,60 C300,120 520,40 760,110 C980,175 1100,90 1260,150" />
        <path class="ml m2" d="M-40,140 C260,196 480,110 720,190 C940,258 1120,170 1260,238" />
        <line class="cbl" x1="180" y1="0" x2="180" y2="150" /><line class="cbl" x1="640" y1="0" x2="640" y2="110" /><line class="cbl" x1="1020" y1="0" x2="1020" y2="170" />
      </svg>
    </div>

    <div class="ohh-row">
      <!-- LEFT — lead -->
      <div class="ohh-lead">
        <Motion as="span" class="ohh-eyebrow sd-mono"
          :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <span class="eb-glyph"><PauseCircle :size="13" /></span>
          SUPPORT · STASIS CONTROL
          <span class="eb-sep" /><span class="eb-frozen"><i class="eb-dot" /> CLOCKS FROZEN</span>
        </Motion>

        <h1 class="ohh-title">
          <Motion as="span" class="ht-line"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">Held,</Motion>
          <Motion as="span" class="ht-line grad"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.13, ease: [0.16, 1, 0.3, 1] }">not forgotten.</Motion>
        </h1>

        <Motion as="p" class="ohh-sub"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.24 }">
          Every ticket parked here hangs with a reason, a release date and a frozen SLA clock —
          reviewed on cadence, auto-released on schedule, never lost in the dark.
        </Motion>

        <!-- CTA row -->
        <Motion as="div" class="ohh-cta"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.3 }">
          <Motion as="button" type="button" class="obtn primary" :disabled="!nextRelease"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
            :title="nextRelease ? `Resume ${nextRelease.ticket_number}` : 'Nothing to resume'"
            @click="$emit('resume-next')">
            <Play :size="15" /> Resume next
          </Motion>
          <Motion as="button" type="button" class="obtn ghost" :class="{ pulse: staleCount > 0 }" :disabled="!staleCount"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
            title="Review holds parked past the review threshold" @click="$emit('extend-stale')">
            <CalendarClock :size="14" /> Review stale <span v-if="staleCount" class="cta-badge">{{ staleCount }}</span>
          </Motion>
          <Motion as="button" type="button" class="obtn ghost" :class="{ on: advCount > 0 }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('filters')">
            <SlidersHorizontal :size="15" /> Filters
            <span v-if="advCount" class="cta-badge">{{ advCount }}</span>
          </Motion>
          <Motion as="button" type="button" class="obtn ghost icon" :class="{ spinning: loading }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" title="Refresh" @click="$emit('refresh')">
            <RefreshCw :size="15" />
          </Motion>
        </Motion>

        <!-- stasis readout line -->
        <Motion as="div" class="ohh-scan"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.42 }">
          <span class="scan-run"><Anchor :size="13" /> <b>{{ heldTotal }}</b> in suspension</span>
          <span class="scan-div" />
          <span class="scan-chip"><i class="c-dot ember" /> <b>{{ bankedLabel }}</b> SLA time banked</span>
          <span class="scan-chip" v-if="nextRelease"><i class="c-dot good" /> next release <b>{{ nextReleaseLabel }}</b></span>
        </Motion>
      </div>

      <!-- RIGHT — signature instrument (the Suspension Dock, injected by the section) -->
      <Motion as="div" class="ohh-instrument"
        :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
        :style="tilt">
        <slot name="instrument" />
      </Motion>
    </div>

    <!-- TELEMETRY LENSES -->
    <div class="ohh-lenses">
      <Motion
        as="button" v-for="(l, i) in lenses" :key="l.key" type="button"
        class="lens" :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        :initial="{ opacity: 0, y: 18, filter: 'blur(7px)' }"
        :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :transition="{ duration: 0.5, delay: 0.34 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="l.stat ? {} : { y: -3 }" :whileTap="l.stat ? {} : { scale: 0.97 }"
        @click="!l.stat && $emit('pick', l)"
      >
        <span class="lens-ic"><component :is="l.icon" :size="15" /></span>
        <span class="lens-body">
          <span class="lens-n"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value || 0" /><template v-else>{{ l.value }}</template></span>
          <span class="lens-lbl">{{ l.label }}</span>
        </span>
        <span class="lens-bar" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/*
  SdOnHoldHero — the "Stasis Control" console hero for the On-Hold Suspension Dock.
  Same proven shell as SdActiveOpsHero (parallax orbs + grain + mesh + #instrument slot +
  telemetry lenses) but a distinct identity: dormant-stone/ember dock palette, hanging-cable
  silhouettes in the mesh, a CLOCKS FROZEN eyebrow, and hold-governance CTAs
  (Resume next / Review stale). Section owns data; hero owns layout.
*/
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Play, CalendarClock, RefreshCw, SlidersHorizontal, Anchor, PauseCircle } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  heldTotal: { type: Number, default: 0 },
  bankedMs: { type: Number, default: 0 },
  staleCount: { type: Number, default: 0 },
  nextRelease: { type: Object, default: null },   // the soonest-releasing held ticket
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['resume-next', 'extend-stale', 'refresh', 'filters', 'pick'])

const HOUR = 3600000, DAY = 86400000, MIN = 60000
const bankedLabel = computed(() => {
  const m = props.bankedMs || 0
  if (m < MIN) return '0m'
  if (m < HOUR) return `${Math.round(m / MIN)}m`
  if (m < DAY) return `${Math.round(m / HOUR)}h`
  return `${Math.floor(m / DAY)}d ${Math.round((m % DAY) / HOUR)}h`
})
const nextReleaseLabel = computed(() => {
  const v = props.nextRelease?.auto_resume_at || props.nextRelease?.hold_until
  if (!v) return ''
  const d = new Date(v).getTime() - Date.now()
  if (d <= 0) return 'now'
  if (d < HOUR) return `in ${Math.max(1, Math.round(d / MIN))}m`
  if (d < DAY) return `in ${Math.round(d / HOUR)}h`
  return `in ${Math.round(d / DAY)}d`
})

/* pointer parallax */
const heroRef = ref(null)
const mx = ref(0)
const my = ref(0)
const onMove = (e) => {
  const r = heroRef.value?.$el?.getBoundingClientRect?.() || heroRef.value?.getBoundingClientRect?.()
  if (!r) return
  mx.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  my.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const resetMove = () => { mx.value = 0; my.value = 0 }
const orbStyle = (d) => ({ transform: `translate3d(${(mx.value * d * 20).toFixed(1)}px, ${(my.value * d * 16).toFixed(1)}px, 0)` })
const tilt = computed(() => ({ transform: `perspective(1200px) rotateX(${(my.value * -3.2).toFixed(2)}deg) rotateY(${(mx.value * 4.2).toFixed(2)}deg)` }))
</script>

<style scoped>
.ohh { position: relative; overflow: hidden; border-radius: 24px; padding: 30px 30px 22px;
  background: var(--sd-dock-grad), var(--sd-panel); background-blend-mode: overlay, normal;
  border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); isolation: isolate; }
.ohh::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg, rgba(10, 9, 7, 0.88), rgba(12, 11, 9, 0.8)); }
[data-theme="light"] .ohh::before { background: linear-gradient(135deg, rgba(255, 251, 245, 0.85), rgba(253, 246, 234, 0.73)); }

/* ambient */
.ohh-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 380px; height: 380px; top: -140px; left: -90px; background: radial-gradient(circle, color-mix(in srgb, var(--sd-dock-stone) 44%, transparent), transparent 65%); animation: ohh-orb 24s ease-in-out infinite; }
.orb.a2 { width: 300px; height: 300px; top: -60px; right: 12%; background: radial-gradient(circle, color-mix(in srgb, var(--sd-dock-ember) 32%, transparent), transparent 66%); animation: ohh-orb 29s ease-in-out infinite reverse; }
.orb.a3 { width: 240px; height: 240px; bottom: -120px; left: 28%; background: radial-gradient(circle, color-mix(in srgb, var(--sd-dock-ember) 24%, transparent), transparent 68%); animation: ohh-orb 33s ease-in-out infinite; }
.orb.a4 { width: 300px; height: 300px; bottom: -150px; right: -80px; background: radial-gradient(circle, color-mix(in srgb, var(--sd-dock-release) 18%, transparent), transparent 67%); animation: ohh-orb 27s ease-in-out infinite reverse; }
.ohh-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(214, 178, 94, 0.5) 1px, transparent 1px), radial-gradient(rgba(181, 158, 125, 0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px; background-position: 0 0, 2px 3px; }
.ohh-grid { position: absolute; inset: 0; opacity: 0.4; background-image: radial-gradient(color-mix(in srgb, var(--sd-dock-stone) 10%, transparent) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 75%); mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 75%); }
.ohh-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.44; }
.ml { fill: none; stroke: color-mix(in srgb, var(--sd-dock-stone) 34%, transparent); stroke-width: 1.4; stroke-dasharray: 6 11; animation: ohh-mesh 30s linear infinite; }
.ml.m2 { stroke: color-mix(in srgb, var(--sd-dock-ember) 26%, transparent); animation-duration: 38s; }
.cbl { stroke: color-mix(in srgb, var(--sd-dock-cable) 42%, transparent); stroke-width: 1.2; stroke-dasharray: 2 6; animation: ohh-mesh 44s linear infinite reverse; }

.ohh-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1.16fr; gap: 26px; align-items: center; }

/* lead */
.ohh-lead { display: flex; flex-direction: column; min-width: 0; }
.ohh-eyebrow { display: inline-flex; align-items: center; gap: 9px; width: fit-content; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: var(--sd-dock-ember); padding: 6px 13px; border-radius: 999px; background: var(--sd-dock-ember-soft); border: 1px solid color-mix(in srgb, var(--sd-dock-ember) 30%, transparent); }
.eb-glyph { display: grid; place-items: center; animation: ohh-tick 6s steps(12) infinite; }
.eb-sep { width: 1px; height: 11px; background: color-mix(in srgb, var(--sd-dock-ember) 30%, transparent); }
.eb-frozen { display: inline-flex; align-items: center; gap: 5px; color: var(--sd-dock-stone); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-dock-stone); box-shadow: 0 0 8px var(--sd-dock-stone); animation: ohh-blip 3.2s ease-in-out infinite; }

.ohh-title { margin: 14px 0 0; display: flex; flex-direction: column; line-height: 1.02; font-weight: 850; letter-spacing: -0.03em; font-size: clamp(30px, 4.2vw, 48px); }
.ht-line { color: var(--sd-text); }
.ht-line.grad { background: var(--sd-dock-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ohh-sub { margin: 13px 0 0; font-size: 14px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 46ch; }

.ohh-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-top: 20px; }
.obtn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.obtn:disabled { opacity: 0.5; cursor: not-allowed; }
.obtn.primary { color: #06281c; background: linear-gradient(135deg, #6ee7b7, #34d399 55%, #059669); box-shadow: 0 10px 26px rgba(52, 211, 153, 0.3); }
.obtn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.obtn.ghost:hover:not(:disabled), .obtn.ghost.on { color: var(--sd-text); border-color: color-mix(in srgb, var(--sd-dock-ember) 40%, transparent); }
.obtn.ghost.pulse { animation: ohh-ctapulse 3s ease-in-out infinite; }
.obtn.icon { padding: 10px 12px; }
.obtn.spinning svg { animation: ohh-spin 1s linear infinite; }
.cta-badge { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #1a1206; background: var(--sd-dock-ember); }
[data-theme="light"] .cta-badge { color: #fff8ec; }

.ohh-scan { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.scan-run { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); }
.scan-run svg { color: var(--sd-dock-ember); }
.scan-run b, .scan-chip b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.scan-div { width: 1px; height: 15px; background: var(--sd-border-strong); }
.scan-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.c-dot { width: 7px; height: 7px; border-radius: 50%; }
.c-dot.ember { background: var(--sd-dock-ember); box-shadow: 0 0 7px var(--sd-dock-ember); }
.c-dot.good { background: var(--sd-dock-release); box-shadow: 0 0 7px var(--sd-dock-release); }

/* instrument */
.ohh-instrument { min-height: 236px; transition: transform 0.4s var(--sd-spring); transform-style: preserve-3d; }

/* lenses */
.ohh-lenses { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; margin-top: 22px; }
.lens { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 15px; cursor: pointer; font-family: inherit; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); position: relative; overflow: hidden; transition: border-color 0.2s, background 0.2s; }
.lens.stat { cursor: default; }
.lens:hover:not(.stat) { border-color: color-mix(in srgb, var(--lc) 45%, transparent); }
.lens.on { background: color-mix(in srgb, var(--lc) 12%, transparent); border-color: color-mix(in srgb, var(--lc) 50%, transparent); }
.lens-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); flex-shrink: 0; }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-n { font-size: 21px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; white-space: nowrap; }
.lens-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); margin-top: 3px; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--lc); transition: transform 0.3s var(--sd-spring); }
.lens.on .lens-bar, .lens:hover:not(.stat) .lens-bar { transform: scaleX(1); }

@keyframes ohh-orb { 0%, 100% { translate: 0 0; } 50% { translate: 24px -18px; } }
@keyframes ohh-mesh { to { stroke-dashoffset: -200; } }
@keyframes ohh-spin { to { transform: rotate(360deg); } }
@keyframes ohh-blip { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.82); } }
@keyframes ohh-tick { to { transform: rotate(360deg); } }
@keyframes ohh-ctapulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 18px 0 color-mix(in srgb, var(--sd-dock-ember) 35%, transparent); } }

@media (max-width: 1080px) {
  .ohh-row { grid-template-columns: 1fr; }
  .ohh-instrument { order: -1; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .ml,
  html:not([data-cinematic="on"]) .cbl,
  html:not([data-cinematic="on"]) .eb-glyph,
  html:not([data-cinematic="on"]) .eb-dot,
  html:not([data-cinematic="on"]) .obtn.ghost.pulse,
  html:not([data-cinematic="on"]) .obtn.spinning svg { animation: none !important; }
}
</style>
