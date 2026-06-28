<template>
  <Motion as="section" class="sdcs" :style="{ '--ac': tab.accent || 'var(--sd-amber)' }"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ambient -->
    <span class="sdcs-grid" aria-hidden="true" />
    <span class="sdcs-aura" aria-hidden="true" />
    <span class="sdcs-scan" aria-hidden="true" />

    <div class="sdcs-inner">
      <span class="sdcs-icon" aria-hidden="true">
        <span class="ic-ring" />
        <component :is="tab.icon" :size="34" :stroke-width="1.6" />
      </span>

      <span class="sdcs-eyebrow">{{ (tab.group || '').toUpperCase() }}</span>
      <h2 class="sdcs-title">{{ tab.label }}</h2>
      <p class="sdcs-blurb">{{ tab.blurb }}</p>

      <span class="sdcs-phase">
        <span class="ph-dot" />
        {{ phaseLabel }}
      </span>

      <div class="sdcs-bar" aria-hidden="true"><span class="bar-fill" /></div>
      <p class="sdcs-note">This view is mapped and routed — the page lands in a later phase. The menu structure is live now.</p>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { PHASE_LABEL } from './ticketsMenu.js'

const props = defineProps({ tab: { type: Object, required: true } })
const phaseLabel = computed(() => PHASE_LABEL[props.tab.phase] || 'Coming soon')
</script>

<style scoped>
.sdcs {
  position: relative; overflow: hidden; border-radius: 22px; min-height: 460px;
  display: grid; place-items: center; padding: 48px 24px;
  background:
    radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--ac) 9%, transparent), transparent 60%),
    var(--sd-surface);
  border: 1px solid var(--sd-border); box-shadow: var(--sd-card-shadow);
}
.sdcs-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--sd-border) 1px, transparent 1px), linear-gradient(90deg, var(--sd-border) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: radial-gradient(70% 60% at 50% 40%, #000, transparent 75%);
  -webkit-mask-image: radial-gradient(70% 60% at 50% 40%, #000, transparent 75%);
}
.sdcs-aura {
  position: absolute; left: 50%; top: -10%; width: 460px; height: 460px; transform: translateX(-50%); pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--ac) 26%, transparent), transparent 68%);
  filter: blur(14px); opacity: 0.5; mix-blend-mode: screen; animation: sdcs-breathe 7s ease-in-out infinite;
}
.sdcs-scan {
  position: absolute; left: 0; right: 0; height: 140px; pointer-events: none; opacity: 0.5;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ac) 14%, transparent), transparent);
  animation: sdcs-sweep 6s ease-in-out infinite;
}

.sdcs-inner { position: relative; z-index: 1; max-width: 440px; text-align: center; display: flex; flex-direction: column; align-items: center; }

.sdcs-icon { position: relative; width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; color: var(--ac);
  background: color-mix(in srgb, var(--ac) 12%, var(--sd-surface-elevated)); border: 1px solid color-mix(in srgb, var(--ac) 30%, transparent);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--ac) 22%, transparent); margin-bottom: 22px; }
.ic-ring { position: absolute; inset: -6px; border-radius: 26px; border: 1.5px dashed color-mix(in srgb, var(--ac) 40%, transparent); opacity: 0.6; animation: sdcs-spin 14s linear infinite; }

.sdcs-eyebrow { font-family: var(--sd-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em; color: var(--ac); }
.sdcs-title { font-size: clamp(24px, 4vw, 34px); font-weight: 800; color: var(--sd-text); margin: 8px 0 10px; letter-spacing: -0.02em; }
.sdcs-blurb { font-size: 14px; line-height: 1.55; color: var(--sd-text-muted); margin: 0 0 20px; }

.sdcs-phase { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
  color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.ph-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ac); box-shadow: 0 0 0 0 var(--ac); animation: sdcs-pulse 2.2s ease-out infinite; }

.sdcs-bar { width: 220px; height: 4px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; margin: 24px 0 14px; border: 1px solid var(--sd-border); }
.bar-fill { display: block; height: 100%; width: 40%; border-radius: 999px; background: var(--sd-grad-rail); animation: sdcs-load 2.4s var(--sd-ease) infinite; }

.sdcs-note { font-size: 12px; color: var(--sd-text-dim); margin: 0; max-width: 360px; }

@keyframes sdcs-breathe { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.42; } 50% { transform: translateX(-50%) scale(1.08); opacity: 0.58; } }
@keyframes sdcs-sweep { 0% { top: -20%; } 50% { top: 80%; } 100% { top: -20%; } }
@keyframes sdcs-spin { to { transform: rotate(360deg); } }
@keyframes sdcs-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ac) 55%, transparent); } 70%, 100% { box-shadow: 0 0 0 8px transparent; } }
@keyframes sdcs-load { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }

/* Respect OS Reduce Motion unless the in-app Cinematic mode is on. */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sdcs-aura,
  html:not([data-cinematic="on"]) .sdcs-scan,
  html:not([data-cinematic="on"]) .ic-ring,
  html:not([data-cinematic="on"]) .ph-dot,
  html:not([data-cinematic="on"]) .bar-fill { animation: none; }
  html:not([data-cinematic="on"]) .bar-fill { width: 100%; }
}
</style>
