<template>
  <Motion
    as="section" class="pvh" ref="heroRef"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="resetMove"
  >
    <!-- ambient layer -->
    <div class="pvh-atm" aria-hidden="true">
      <span class="orb a1" :style="orbStyle(1)" />
      <span class="orb a2" :style="orbStyle(0.6)" />
      <span class="orb a3" :style="orbStyle(0.34)" />
      <span class="orb a4" :style="orbStyle(-0.42)" />
      <span class="pvh-grain" />
      <span class="pvh-grid" />
      <svg class="pvh-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <path class="ml" d="M-40,300 C300,236 520,330 760,242 C980,150 1100,214 1260,150" />
        <path class="ml m2" d="M-40,240 C260,176 480,280 720,186 C940,96 1120,168 1260,92" />
      </svg>
    </div>

    <div class="pvh-row">
      <!-- LEFT — lead -->
      <div class="pvh-lead">
        <Motion as="span" class="pvh-eyebrow sd-mono"
          :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <span class="eb-glyph"><Satellite :size="12" /></span>
          OFF-NETWORK · WITH A THIRD PARTY
          <span class="eb-sep" /><span class="eb-pause"><Pause :size="9" /> SLA PAUSED</span>
        </Motion>

        <h1 class="pvh-title">
          <Motion as="span" class="ht-line"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">Handed off to</Motion>
          <Motion as="span" class="ht-line grad"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.13, ease: [0.16, 1, 0.3, 1] }">the vendor</Motion>
        </h1>

        <Motion as="p" class="pvh-sub"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.24 }">
          Tickets blocked on an external vendor — the customer SLA is frozen while the desk waits for the return signal. Chase the ones past their promised date and bring them back the moment the vendor replies.
        </Motion>

        <!-- CTA row -->
        <Motion as="div" class="pvh-cta"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.3 }">
          <Motion as="button" type="button" class="pbtn primary" :class="{ dim: !overdue }"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('chase')">
            <Send :size="15" /> Chase overdue <span v-if="overdue" class="cta-badge">{{ overdue }}</span>
          </Motion>
          <Motion as="button" type="button" class="pbtn ghost"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('commands')">
            <Command :size="14" /> <span>Commands</span> <kbd>⌘K</kbd>
          </Motion>
          <Motion as="button" type="button" class="pbtn ghost icon" :class="{ spinning: loading }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" title="Refresh" @click="$emit('refresh')">
            <RefreshCw :size="15" />
          </Motion>
          <Motion as="button" type="button" class="pbtn ghost" :class="{ on: advCount > 0 }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('filters')">
            <SlidersHorizontal :size="15" /> Filters
            <span v-if="advCount" class="cta-badge">{{ advCount }}</span>
          </Motion>
          <Motion as="button" type="button" class="pbtn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="15" /> New
          </Motion>
        </Motion>

        <!-- relay scan line -->
        <Motion as="div" class="pvh-scan"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.42 }">
          <span class="scan-run"><Truck :size="13" /> Waiting on <b>{{ pending }}</b> hand-off{{ pending === 1 ? '' : 's' }}</span>
          <span class="scan-div" />
          <span class="scan-chip"><i class="c-dot danger" /> <b>{{ overdue }}</b> overdue</span>
          <span class="scan-chip"><i class="c-dot warn" /> <b>{{ neverChased }}</b> never chased</span>
          <span class="scan-chip good"><i class="c-dot good" /> <b>{{ reactivated }}</b> came back</span>
        </Motion>
      </div>

      <!-- RIGHT — signature instrument (relay station injected by the section) -->
      <Motion as="div" class="pvh-instrument"
        :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
        :style="tilt">
        <slot name="instrument" />
      </Motion>
    </div>

    <!-- TELEMETRY LENSES -->
    <div class="pvh-lenses">
      <Motion
        as="button" v-for="(l, i) in lenses" :key="l.key" type="button"
        class="lens" :class="{ on: activeLens === l.key, nav: l.nav }" :style="{ '--lc': l.color }"
        :initial="{ opacity: 0, y: 18, filter: 'blur(7px)' }"
        :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :transition="{ duration: 0.5, delay: 0.34 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
        @click="$emit('pick', l)"
      >
        <span class="lens-ic"><component :is="l.icon" :size="15" /></span>
        <span class="lens-body">
          <span class="lens-n"><SdCountUp :value="l.value || 0" /></span>
          <span class="lens-lbl">{{ l.label }}<ArrowUpRight v-if="l.nav" :size="10" class="lens-go" /></span>
        </span>
        <span class="lens-bar" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Satellite, Pause, Send, Command, RefreshCw, SlidersHorizontal, Plus, ArrowUpRight, Truck } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  pending: { type: Number, default: 0 },
  overdue: { type: Number, default: 0 },
  neverChased: { type: Number, default: 0 },
  reactivated: { type: Number, default: 0 },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['new', 'refresh', 'filters', 'commands', 'pick', 'chase'])

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
const tilt = computed(() => ({ transform: `perspective(1200px) rotateX(${(my.value * -3).toFixed(2)}deg) rotateY(${(mx.value * 4).toFixed(2)}deg)` }))
</script>

<style scoped>
.pvh { --pvh-accent: var(--sd-vendor-signal); --pvh-steel: var(--sd-vendor-steel);
  --pvh-grad: var(--sd-vendor-grad);
  position: relative; overflow: hidden; border-radius: 24px; padding: 30px 30px 22px;
  background: var(--sd-panel); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); isolation: isolate; }
.pvh::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg, rgba(9,11,13,0.88), rgba(13,12,11,0.78)); }
[data-theme="light"] .pvh::before { background: linear-gradient(135deg, rgba(255,251,243,0.86), rgba(250,247,240,0.72)); }

.pvh-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 360px; height: 360px; top: -120px; left: -80px; background: radial-gradient(circle, rgba(251,146,60,0.34), transparent 65%); animation: pvh-orb 24s ease-in-out infinite; }
.orb.a2 { width: 300px; height: 300px; top: -60px; right: 12%; background: radial-gradient(circle, rgba(154,163,172,0.28), transparent 66%); animation: pvh-orb 29s ease-in-out infinite reverse; }
.orb.a3 { width: 240px; height: 240px; bottom: -120px; left: 28%; background: radial-gradient(circle, rgba(251,146,60,0.2), transparent 68%); animation: pvh-orb 33s ease-in-out infinite; }
.orb.a4 { width: 300px; height: 300px; bottom: -140px; right: -80px; background: radial-gradient(circle, rgba(52,211,153,0.15), transparent 67%); animation: pvh-orb 27s ease-in-out infinite reverse; }
.pvh-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(251,146,60,0.5) 1px, transparent 1px), radial-gradient(rgba(154,163,172,0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px; background-position: 0 0, 2px 3px; }
.pvh-grid { position: absolute; inset: 0; opacity: 0.4; background-image: radial-gradient(rgba(154,163,172,0.07) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); }
.pvh-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.4; }
.ml { fill: none; stroke: rgba(154,163,172,0.3); stroke-width: 1.4; stroke-dasharray: 6 11; animation: pvh-mesh 28s linear infinite; }
.ml.m2 { stroke: rgba(251,146,60,0.24); animation-duration: 34s; }

.pvh-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1.12fr; gap: 26px; align-items: center; }

.pvh-lead { display: flex; flex-direction: column; min-width: 0; }
.pvh-eyebrow { display: inline-flex; align-items: center; gap: 9px; width: fit-content; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: var(--pvh-accent); padding: 6px 13px; border-radius: 999px; background: color-mix(in srgb, var(--pvh-accent) 14%, transparent); border: 1px solid color-mix(in srgb, var(--pvh-accent) 32%, transparent); }
.eb-glyph { display: grid; place-items: center; color: var(--pvh-accent); animation: pvh-float 4.4s ease-in-out infinite; }
.eb-sep { width: 1px; height: 11px; background: color-mix(in srgb, var(--pvh-accent) 30%, transparent); }
.eb-pause { display: inline-flex; align-items: center; gap: 4px; color: var(--sd-amber-strong); }

.pvh-title { margin: 14px 0 0; display: flex; flex-direction: column; line-height: 1.02; font-weight: 850; letter-spacing: -0.03em; font-size: clamp(30px, 4.1vw, 47px); }
.ht-line { color: var(--sd-text); }
.ht-line.grad { background: var(--pvh-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pvh-sub { margin: 13px 0 0; font-size: 14px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 54ch; }

.pvh-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-top: 20px; }
.pbtn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.pbtn.primary { color: #22160a; background: var(--pvh-grad); box-shadow: 0 10px 26px rgba(251,146,60,0.3); }
.pbtn.primary.dim { filter: grayscale(0.45) brightness(0.92); }
.pbtn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.pbtn.ghost:hover, .pbtn.ghost.on { color: var(--sd-text); border-color: var(--sd-vendor-signal-soft); }
.pbtn.icon { padding: 10px 12px; }
.pbtn.spinning svg { animation: pvh-spin 1s linear infinite; }
.pbtn kbd { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; color: var(--sd-text-dim); padding: 2px 5px; border-radius: 5px; border: 1px solid var(--sd-border); }
.cta-badge { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #22160a; background: color-mix(in srgb, var(--pvh-accent) 88%, #fff); }
.pbtn.ghost .cta-badge { background: var(--sd-vendor-signal); }

.pvh-scan { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.scan-run { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); }
.scan-run svg { color: var(--pvh-accent); }
.scan-run b, .scan-chip b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.scan-div { width: 1px; height: 15px; background: var(--sd-border-strong); }
.scan-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.scan-chip.good b { color: var(--sd-vendor-return); }
.c-dot { width: 7px; height: 7px; border-radius: 50%; }
.c-dot.warn { background: var(--sd-amber-strong); box-shadow: 0 0 7px var(--sd-amber-strong); }
.c-dot.danger { background: var(--sd-vendor-overdue); box-shadow: 0 0 7px var(--sd-vendor-overdue); }
.c-dot.good { background: var(--sd-vendor-return); box-shadow: 0 0 7px var(--sd-vendor-return); }

.pvh-instrument { min-height: 300px; transition: transform 0.4s var(--sd-spring); transform-style: preserve-3d; }

.pvh-lenses { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; margin-top: 22px; }
.lens { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 15px; cursor: pointer; font-family: inherit; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); position: relative; overflow: hidden; transition: border-color 0.2s, background 0.2s; }
.lens.nav { cursor: alias; }
.lens:hover { border-color: color-mix(in srgb, var(--lc) 45%, transparent); }
.lens.on { background: color-mix(in srgb, var(--lc) 12%, transparent); border-color: color-mix(in srgb, var(--lc) 50%, transparent); }
.lens-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); flex-shrink: 0; }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-n { font-size: 21px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.lens-lbl { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; color: var(--sd-text-muted); margin-top: 3px; }
.lens-go { opacity: 0.6; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--lc); transition: transform 0.3s var(--sd-spring); }
.lens.on .lens-bar, .lens:hover .lens-bar { transform: scaleX(1); }

@keyframes pvh-orb { 0%, 100% { translate: 0 0; } 50% { translate: 22px -16px; } }
@keyframes pvh-mesh { to { stroke-dashoffset: -200; } }
@keyframes pvh-spin { to { transform: rotate(360deg); } }
@keyframes pvh-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

@media (max-width: 1080px) {
  .pvh-row { grid-template-columns: 1fr; }
  .pvh-instrument { order: -1; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .ml,
  html:not([data-cinematic="on"]) .eb-glyph,
  html:not([data-cinematic="on"]) .pbtn.spinning svg { animation: none !important; }
}
</style>
