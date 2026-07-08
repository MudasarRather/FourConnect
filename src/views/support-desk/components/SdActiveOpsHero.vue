<template>
  <Motion
    as="section" class="aoh" ref="heroRef"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="resetMove"
  >
    <!-- ambient layer -->
    <div class="aoh-atm" aria-hidden="true">
      <span class="orb a1" :style="orbStyle(1)" />
      <span class="orb a2" :style="orbStyle(0.62)" />
      <span class="orb a3" :style="orbStyle(0.34)" />
      <span class="orb a4" :style="orbStyle(-0.42)" />
      <span class="aoh-grain" />
      <span class="aoh-grid" />
      <svg class="aoh-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <path class="ml" d="M-40,300 C300,230 520,340 760,235 C980,140 1100,215 1260,140" />
        <path class="ml m2" d="M-40,236 C260,168 480,286 720,180 C940,86 1120,168 1260,84" />
        <path class="ml m3" d="M-40,360 C320,300 560,384 820,300 C1020,232 1160,290 1260,222" />
      </svg>
    </div>

    <div class="aoh-row">
      <!-- LEFT — lead -->
      <div class="aoh-lead">
        <Motion as="span" class="aoh-eyebrow sd-mono"
          :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <span class="eb-glyph"><span class="eb-ring" /><span class="eb-core" /></span>
          SUPPORT · LIVE OPERATIONS FLOOR
          <span class="eb-sep" /><span class="eb-live"><i class="eb-dot" /> LIVE</span>
        </Motion>

        <h1 class="aoh-title">
          <Motion as="span" class="ht-line"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">Active work,</Motion>
          <Motion as="span" class="ht-line grad"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.13, ease: [0.16, 1, 0.3, 1] }">in motion</Motion>
        </h1>

        <Motion as="p" class="aoh-sub"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.24 }">
          Everything open and in progress right now — advance it stage by stage and keep every SLA clock in the green.
        </Motion>

        <!-- CTA row -->
        <Motion as="div" class="aoh-cta"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.3 }">
          <Motion as="button" type="button" class="abtn primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="15" /> New ticket
          </Motion>
          <Motion as="button" type="button" class="abtn ghost"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('commands')">
            <Command :size="14" /> <span>Commands</span> <kbd>⌘K</kbd>
          </Motion>
          <Motion as="button" type="button" class="abtn ghost icon" :class="{ spinning: loading }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" title="Refresh" @click="$emit('refresh')">
            <RefreshCw :size="15" />
          </Motion>
          <Motion as="button" type="button" class="abtn ghost" :class="{ on: advCount > 0 }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('filters')">
            <SlidersHorizontal :size="15" /> Filters
            <span v-if="advCount" class="cta-badge">{{ advCount }}</span>
          </Motion>
        </Motion>

        <!-- live scan line -->
        <Motion as="div" class="aoh-scan"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.42 }">
          <span class="scan-run"><Radar :size="13" /> Tracking <b>{{ activeTotal }}</b> in flight</span>
          <span class="scan-div" />
          <span class="scan-chip"><i class="c-dot warn" /> <b>{{ stats.due_soon ?? stats.sla_risk ?? 0 }}</b> due soon</span>
          <span class="scan-chip"><i class="c-dot danger" /> <b>{{ breaching }}</b> breaching</span>
        </Motion>
      </div>

      <!-- RIGHT — signature instrument (pipeline injected by the section) -->
      <Motion as="div" class="aoh-instrument"
        :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
        :style="tilt">
        <slot name="instrument" />
      </Motion>
    </div>

    <!-- TELEMETRY LENSES -->
    <div class="aoh-lenses">
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
import { Plus, Command, RefreshCw, SlidersHorizontal, Radar, ArrowUpRight } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['new', 'refresh', 'filters', 'commands', 'pick'])

const num = (v) => Number(v) || 0
const activeTotal = computed(() => num(props.stats?.open) + num(props.stats?.in_progress) + (num(props.stats?.pending_total) || num(props.stats?.pending_customer) + num(props.stats?.pending_vendor)) + num(props.stats?.on_hold))
const breaching = computed(() => num(props.stats?.breaching) || num(props.stats?.sla_breached))

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
const tilt = computed(() => ({ transform: `perspective(1200px) rotateX(${(my.value * -3.4).toFixed(2)}deg) rotateY(${(mx.value * 4.6).toFixed(2)}deg)` }))
</script>

<style scoped>
.aoh { position: relative; overflow: hidden; border-radius: 24px; padding: 30px 30px 22px;
  background: var(--sd-grad-hero), var(--sd-panel); background-blend-mode: overlay, normal;
  border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); isolation: isolate; }
.aoh::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg, rgba(8,10,12,0.87), rgba(10,12,14,0.79)); }
[data-theme="light"] .aoh::before { background: linear-gradient(135deg, rgba(255,251,245,0.83), rgba(255,248,238,0.71)); }

/* ambient */
.aoh-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 380px; height: 380px; top: -130px; left: -90px; background: radial-gradient(circle, rgba(251,146,60,0.42), transparent 65%); animation: aoh-orb 22s ease-in-out infinite; }
.orb.a2 { width: 300px; height: 300px; top: -60px; right: 10%; background: radial-gradient(circle, rgba(251,191,36,0.32), transparent 66%); animation: aoh-orb 27s ease-in-out infinite reverse; }
.orb.a3 { width: 240px; height: 240px; bottom: -120px; left: 26%; background: radial-gradient(circle, rgba(234,88,12,0.28), transparent 68%); animation: aoh-orb 31s ease-in-out infinite; }
.orb.a4 { width: 320px; height: 320px; bottom: -150px; right: -90px; background: radial-gradient(circle, rgba(52,211,153,0.2), transparent 67%); animation: aoh-orb 25s ease-in-out infinite reverse; }
.aoh-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), radial-gradient(rgba(234,88,12,0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px; background-position: 0 0, 2px 3px; }
.aoh-grid { position: absolute; inset: 0; opacity: 0.4; background-image: radial-gradient(rgba(251,191,36,0.06) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); }
.aoh-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.48; }
.ml { fill: none; stroke: rgba(251,146,60,0.3); stroke-width: 1.4; stroke-dasharray: 6 11; animation: aoh-mesh 26s linear infinite; }
.ml.m2 { stroke: rgba(251,191,36,0.26); animation-duration: 32s; }
.ml.m3 { stroke: rgba(234,88,12,0.2); animation-duration: 38s; }

.aoh-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1.16fr; gap: 26px; align-items: center; }

/* lead */
.aoh-lead { display: flex; flex-direction: column; min-width: 0; }
.aoh-eyebrow { display: inline-flex; align-items: center; gap: 9px; width: fit-content; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: var(--sd-ember); padding: 6px 13px; border-radius: 999px; background: color-mix(in srgb, var(--sd-ember) 12%, transparent); border: 1px solid color-mix(in srgb, var(--sd-ember) 30%, transparent); }
.eb-glyph { position: relative; width: 13px; height: 13px; }
.eb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.4px solid var(--sd-ember); border-top-color: transparent; animation: aoh-spin 2.6s linear infinite; }
.eb-core { position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-ember); animation: aoh-blip 2s ease-in-out infinite; }
.eb-sep { width: 1px; height: 11px; background: color-mix(in srgb, var(--sd-ember) 30%, transparent); }
.eb-live { display: inline-flex; align-items: center; gap: 5px; color: var(--sd-success); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); animation: aoh-blip 1.6s ease-in-out infinite; }

.aoh-title { margin: 14px 0 0; display: flex; flex-direction: column; line-height: 1.02; font-weight: 850; letter-spacing: -0.03em; font-size: clamp(30px, 4.2vw, 48px); }
.ht-line { color: var(--sd-text); }
.ht-line.grad { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
.aoh-sub { margin: 13px 0 0; font-size: 14px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 46ch; }

.aoh-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-top: 20px; }
.abtn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.abtn.primary { color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 10px 26px rgba(251,146,60,0.32); }
[data-theme="light"] .abtn.primary { color: #fff8ec; }
.abtn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.abtn.ghost:hover, .abtn.ghost.on { color: var(--sd-text); border-color: var(--sd-amber-border); }
.abtn.icon { padding: 10px 12px; }
.abtn.spinning svg { animation: aoh-spin 1s linear infinite; }
.abtn kbd { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; color: var(--sd-text-dim); padding: 2px 5px; border-radius: 5px; border: 1px solid var(--sd-border); }
.cta-badge { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #1a1206; background: var(--sd-amber); }
[data-theme="light"] .cta-badge { color: #fff8ec; }

.aoh-scan { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.scan-run { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); }
.scan-run svg { color: var(--sd-ember); }
.scan-run b, .scan-chip b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.scan-div { width: 1px; height: 15px; background: var(--sd-border-strong); }
.scan-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.c-dot { width: 7px; height: 7px; border-radius: 50%; }
.c-dot.warn { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.c-dot.danger { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }

/* instrument */
.aoh-instrument { min-height: 236px; transition: transform 0.4s var(--sd-spring); transform-style: preserve-3d; }

/* lenses */
.aoh-lenses { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; margin-top: 22px; }
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

@keyframes aoh-orb { 0%, 100% { translate: 0 0; } 50% { translate: 24px -18px; } }
@keyframes aoh-mesh { to { stroke-dashoffset: -200; } }
@keyframes aoh-spin { to { transform: rotate(360deg); } }
@keyframes aoh-blip { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.82); } }

@media (max-width: 1080px) {
  .aoh-row { grid-template-columns: 1fr; }
  .aoh-instrument { order: -1; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .ml,
  html:not([data-cinematic="on"]) .eb-ring,
  html:not([data-cinematic="on"]) .eb-core,
  html:not([data-cinematic="on"]) .eb-dot,
  html:not([data-cinematic="on"]) .abtn.spinning svg { animation: none !important; }
}
</style>
