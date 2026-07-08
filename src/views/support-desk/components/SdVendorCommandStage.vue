<template>
  <Motion as="section" class="vcs"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <!-- full-bleed instrument backdrop -->
    <div class="vcs-stage"><slot name="instrument" /></div>
    <div class="vcs-scrim" aria-hidden="true" />

    <!-- overlaid console -->
    <div class="vcs-console">
      <Motion as="span" class="vcs-eyebrow sd-mono"
        :initial="{ y: -8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.5 }">
        <Satellite :size="12" /> OFF-NETWORK · WITH A THIRD PARTY
        <span class="vcs-sep" /><span class="vcs-pause"><Pause :size="9" /> SLA PAUSED</span>
      </Motion>

      <Motion as="h1" class="vcs-title"
        :initial="{ y: 18, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        Vendor <span class="g">Dispatch Control</span>
      </Motion>
      <Motion as="p" class="vcs-sub"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.5, delay: 0.18 }">
        Every ticket you’ve handed off-network — the desk listens for the return signal while the customer SLA stays frozen.
      </Motion>

      <Motion as="div" class="vcs-cta"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.26 }">
        <Motion as="button" type="button" class="cbtn primary" :class="{ dim: !overdue }"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('chase')">
          <Send :size="15" /> Chase overdue <span v-if="overdue" class="cbadge">{{ overdue }}</span>
        </Motion>
        <Motion as="button" type="button" class="cbtn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('commands')">
          <Command :size="14" /> Commands <kbd>⌘K</kbd>
        </Motion>
        <Motion as="button" type="button" class="cbtn ghost" :class="{ on: advCount > 0 }" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('filters')">
          <SlidersHorizontal :size="14" /> Filters <span v-if="advCount" class="cbadge alt">{{ advCount }}</span>
        </Motion>
        <Motion as="button" type="button" class="cbtn ghost icon" :class="{ spinning: loading }" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" title="Refresh" @click="$emit('refresh')"><RefreshCw :size="15" /></Motion>
        <Motion as="button" type="button" class="cbtn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')"><Plus :size="15" /> New</Motion>
      </Motion>
    </div>

    <!-- bottom telemetry rail (lenses) -->
    <div class="vcs-rail">
      <Motion as="button" v-for="(l, i) in lenses" :key="l.key" type="button"
        class="lens" :class="{ on: activeLens === l.key, nav: l.nav }" :style="{ '--lc': l.color }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }" @click="$emit('pick', l)">
        <span class="lens-ic"><component :is="l.icon" :size="14" /></span>
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
import { Motion } from 'motion-v'
import { Satellite, Pause, Send, Command, SlidersHorizontal, RefreshCw, Plus, ArrowUpRight } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  overdue: { type: Number, default: 0 },
  advCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['new', 'refresh', 'filters', 'commands', 'pick', 'chase'])
</script>

<style scoped>
.vcs { position: relative; border-radius: 24px; overflow: hidden; border: 1px solid var(--sd-border-strong);
  background: var(--sd-panel); box-shadow: var(--sd-shadow); isolation: isolate; min-height: 360px; display: flex; flex-direction: column; }

/* instrument fills the stage as a backdrop */
.vcs-stage { position: absolute; inset: 0; z-index: 0; }
.vcs-stage :deep(.upl), .vcs-stage :deep(.orb) { height: 100% !important; }
.vcs-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(105deg, color-mix(in srgb, var(--sd-panel) 92%, transparent) 0%, color-mix(in srgb, var(--sd-panel) 70%, transparent) 34%, transparent 62%),
    linear-gradient(0deg, color-mix(in srgb, var(--sd-panel) 90%, transparent) 0%, transparent 40%); }
[data-theme="light"] .vcs-scrim {
  background:
    linear-gradient(105deg, color-mix(in srgb, var(--sd-panel) 94%, transparent) 0%, color-mix(in srgb, var(--sd-panel) 74%, transparent) 36%, transparent 64%),
    linear-gradient(0deg, color-mix(in srgb, var(--sd-panel) 92%, transparent) 0%, transparent 42%); }

/* console — top-left, floats over the stage */
.vcs-console { position: relative; z-index: 2; padding: 30px 30px 0; max-width: 640px; }
.vcs-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: var(--sd-vendor-signal); padding: 6px 13px; border-radius: 999px; background: color-mix(in srgb, var(--sd-vendor-signal) 14%, transparent); border: 1px solid color-mix(in srgb, var(--sd-vendor-signal) 30%, transparent); }
.vcs-sep { width: 1px; height: 11px; background: color-mix(in srgb, var(--sd-vendor-signal) 30%, transparent); }
.vcs-pause { display: inline-flex; align-items: center; gap: 4px; color: var(--sd-amber-strong); }
.vcs-title { margin: 16px 0 0; font-size: clamp(30px, 4.4vw, 50px); line-height: 1.0; letter-spacing: -0.03em; font-weight: 850; color: var(--sd-text); text-wrap: balance; }
.vcs-title .g { background: var(--sd-vendor-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.vcs-sub { margin: 12px 0 0; font-size: 14px; line-height: 1.5; color: var(--sd-text-secondary); max-width: 46ch; }
.vcs-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-top: 20px; }
.cbtn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.cbtn.primary { color: #22160a; background: var(--sd-vendor-grad); box-shadow: 0 10px 26px rgba(251,146,60,0.3); }
.cbtn.primary.dim { filter: grayscale(0.45) brightness(0.92); }
.cbtn.ghost { color: var(--sd-text-secondary); background: color-mix(in srgb, var(--sd-surface) 80%, transparent); border-color: var(--sd-border-strong); backdrop-filter: blur(6px); }
.cbtn.ghost:hover, .cbtn.ghost.on { color: var(--sd-text); border-color: var(--sd-vendor-signal-soft); }
.cbtn.icon { padding: 10px 12px; }
.cbtn.spinning svg { animation: vcs-spin 1s linear infinite; }
.cbtn kbd { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; color: var(--sd-text-dim); padding: 2px 5px; border-radius: 5px; border: 1px solid var(--sd-border); }
.cbadge { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #22160a; background: color-mix(in srgb, var(--sd-vendor-signal) 88%, #fff); }
.cbadge.alt { background: var(--sd-vendor-signal); }

/* telemetry rail — bottom, glass, horizontal-scrolling lenses */
.vcs-rail { position: relative; z-index: 2; margin-top: auto; display: flex; gap: 10px; padding: 16px 22px 18px; overflow-x: auto;
  background: linear-gradient(0deg, color-mix(in srgb, var(--sd-panel) 80%, transparent), transparent); scrollbar-width: none; }
.vcs-rail::-webkit-scrollbar { display: none; }
.lens { flex: 0 0 auto; min-width: 132px; display: flex; align-items: center; gap: 11px; padding: 11px 14px; border-radius: 14px; cursor: pointer; font-family: inherit; text-align: left; position: relative; overflow: hidden;
  background: color-mix(in srgb, var(--sd-surface) 82%, transparent); border: 1px solid var(--sd-border); backdrop-filter: blur(8px); transition: border-color 0.2s, background 0.2s; }
.lens.nav { cursor: alias; }
.lens:hover { border-color: color-mix(in srgb, var(--lc) 45%, transparent); }
.lens.on { background: color-mix(in srgb, var(--lc) 14%, transparent); border-color: color-mix(in srgb, var(--lc) 50%, transparent); }
.lens-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--lc); background: color-mix(in srgb, var(--lc) 15%, transparent); flex-shrink: 0; }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-n { font-size: 20px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.lens-lbl { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 600; color: var(--sd-text-muted); margin-top: 3px; white-space: nowrap; }
.lens-go { opacity: 0.6; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--lc); transition: transform 0.3s var(--sd-spring); }
.lens.on .lens-bar, .lens:hover .lens-bar { transform: scaleX(1); }

@keyframes vcs-spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) { .vcs-console { padding: 22px 20px 0; } .vcs-rail { padding: 14px 16px 16px; } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .cbtn.spinning svg { animation: none !important; } }
</style>
