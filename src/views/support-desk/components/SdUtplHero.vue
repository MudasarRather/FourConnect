<template>
  <Motion as="section" class="uph" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Holo-Lantern IS the hero backdrop) ── -->
    <div class="uph-bleed">
      <slot name="instrument">
        <div class="uph-idle" aria-hidden="true"><Film :size="42" class="uph-idle-core" /></div>
      </slot>
    </div>
    <div class="uph-grain" aria-hidden="true" />
    <div class="uph-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="uph-console">
      <div class="uph-eyebrow sd-mono">
        <span class="uph-live" aria-hidden="true" />
        MY TEMPLATES · THE CASSETTE EXCHANGE
      </div>
      <h2 class="uph-title">Pick a tape. <em>Press play.</em></h2>
      <p class="uph-sub">
        Your working rack of response tapes — the desk's shared library plus the
        personal ones only you carry. Play one into a fresh intake, or run it
        straight onto a ticket you're working as a note or reply.
      </p>

      <div class="uph-ctas">
        <Motion as="button" class="uph-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Forge a personal template — only you see and use it" @click="$emit('new')">
          <Plus :size="15" /> New personal template
        </Motion>
        <Motion as="button" class="uph-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Type-to-apply any slide (Ctrl+K)" @click="$emit('palette')">
          <Command :size="14" /> Quick apply <kbd class="uph-kbd sd-mono">⌘K</kbd>
        </Motion>
        <Motion as="button" class="uph-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'uph-spin': loading }" />
        </Motion>
      </div>

      <!-- deck readouts -->
      <div class="uph-readouts sd-mono">
        <span class="uph-ro hot"><i>MY PLAYS · 30D</i><b><SdCountUp :value="stats.my_use_30d ?? 0" /></b></span>
        <span class="uph-ro"><i>MY PLAYS · ALL TIME</i><b><SdCountUp :value="stats.my_use_total ?? 0" /></b></span>
        <span class="uph-ro use"><i>DESK PROOFS · 30D</i><b><SdCountUp :value="stats.tickets_from_templates_30d ?? 0" /></b></span>
        <span v-if="topName" class="uph-ro top"><i>MY TOP TAPE</i><b class="uph-ro-name">{{ topName }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the projection-room floor ── -->
    <div class="uph-lensdock" role="tablist" aria-label="Template lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="uph-lens"
        :class="{ on: activeLens === l.key }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -3 }" :while-tap="{ scale: 0.97 }" @click="$emit('pick', l)">
        <span class="ul-ic"><component :is="l.icon" :size="14" /></span>
        <span class="ul-body">
          <span class="ul-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="ul-lb">{{ l.label }}</span>
        </span>
        <span class="ul-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdUtplHero — the Cassette Exchange banner (agent Template Desk). Same layout
   contract as SdTemplateHero / SdTeamOpsHero (full-bleed #instrument backdrop,
   glass console over the calm left air, staggered lens dock along the deck) with
   the tape identity: filament amber = live tapes, graphite = unlabeled drafts,
   develop-green = a play put to work, star-gold = my mixtape favorites.
   THEME-NATIVE stage: studio black on dark, daylight vellum on light.
   Accent = --sd-utpl-*. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Film, Plus, RefreshCw, Command } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'new', 'palette', 'refresh'])

const topName = computed(() => {
  const top = (props.stats.my_top_used || [])[0]
  if (!top) return ''
  return top.name.length > 22 ? `${top.name.slice(0, 21)}…` : top.name
})
</script>

<style scoped>
.uph {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-utpl-brd); border-radius: 22px;
  background: var(--sd-utpl-stage); min-height: clamp(450px, 41vw, 560px);
  display: flex; flex-direction: column; justify-content: flex-end;
}
.uph-bleed { position: absolute; inset: 0; z-index: 0; }
.uph-grain {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.4; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 0.6px, transparent 0.7px);
  background-size: 3px 3px;
}
.uph-scrim {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--sd-utpl-stage) 92%, transparent) 0%, color-mix(in srgb, var(--sd-utpl-stage) 55%, transparent) 38%, transparent 62%),
    linear-gradient(0deg, color-mix(in srgb, var(--sd-utpl-stage) 90%, transparent) 0%, transparent 34%);
}
.uph-idle { position: absolute; inset: 0; display: grid; place-items: center; }
.uph-idle-core { color: var(--sd-utpl-core); opacity: 0.4; }

/* ── console ── */
.uph-console { position: relative; z-index: 2; padding: 26px 28px 10px; max-width: 560px; }
.uph-eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.2em; color: var(--sd-utpl-core);
  margin-bottom: 10px;
}
.uph-live {
  width: 8px; height: 8px; border-radius: 50%; background: var(--sd-utpl-core);
  box-shadow: 0 0 12px var(--sd-utpl-soft); animation: uph-pulse 2.6s infinite;
}
@keyframes uph-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.uph-title {
  margin: 0 0 8px; font-size: clamp(24px, 2.6vw, 33px); font-weight: 800; letter-spacing: -0.02em;
  color: var(--sd-text); line-height: 1.12; text-wrap: balance;
}
.uph-title em {
  font-style: normal;
  background: var(--sd-utpl-grad); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.uph-sub { margin: 0 0 16px; font-size: 13.5px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 52ch; }

.uph-ctas { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 16px; }
.uph-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-utpl-brd); background: color-mix(in srgb, var(--sd-utpl-stage) 60%, transparent);
  color: var(--sd-text); backdrop-filter: blur(6px);
}
.uph-btn.primary { border: none; background: var(--sd-utpl-grad); color: #1b0f04; box-shadow: var(--sd-utpl-glow); }
[data-theme="light"] .uph-btn.primary { color: #fff7e9; }
.uph-btn.ghost { color: var(--sd-text-secondary); }
.uph-btn.icon { padding: 10px 11px; }
.uph-kbd {
  font-size: 9px; padding: 1.5px 6px; border-radius: 5px;
  border: 1px solid var(--sd-utpl-brd); color: var(--sd-text-muted);
}
.uph-spin { animation: sd-spin-slow 1.1s linear infinite; }

.uph-readouts { display: flex; flex-wrap: wrap; gap: 8px 18px; padding-bottom: 8px; }
.uph-ro { display: flex; flex-direction: column; gap: 2px; }
.uph-ro i { font-style: normal; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.uph-ro b { font-size: 17px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.uph-ro.hot b { color: var(--sd-utpl-hi); }
[data-theme="light"] .uph-ro.hot b { color: var(--sd-utpl-core); }
.uph-ro.use b { color: var(--sd-utpl-use); }
.uph-ro-name { font-size: 12.5px !important; letter-spacing: 0.02em; align-self: flex-start; padding-top: 3px; }

/* ── lens dock ── */
.uph-lensdock {
  position: relative; z-index: 2; display: flex; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px 16px;
  border-top: 1px solid color-mix(in srgb, var(--sd-utpl-brd) 60%, transparent);
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--sd-utpl-stage) 55%, transparent));
}
.uph-lens {
  position: relative; display: flex; align-items: center; gap: 9px; min-width: 118px;
  padding: 9px 13px 11px; border-radius: 12px; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--lc, var(--sd-utpl-core)) 26%, transparent);
  background: color-mix(in srgb, var(--sd-utpl-stage) 62%, transparent);
  color: var(--sd-text); backdrop-filter: blur(6px);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.uph-lens.on {
  border-color: var(--lc, var(--sd-utpl-core));
  box-shadow: 0 0 20px color-mix(in srgb, var(--lc, var(--sd-utpl-core)) 26%, transparent);
}
.ul-ic {
  width: 28px; height: 28px; display: grid; place-items: center; border-radius: 9px;
  background: color-mix(in srgb, var(--lc, var(--sd-utpl-core)) 15%, transparent);
  color: var(--lc, var(--sd-utpl-core));
}
.ul-body { display: flex; flex-direction: column; align-items: flex-start; }
.ul-val { font-size: 15px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.ul-lb { font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-muted); }
.ul-bar {
  position: absolute; left: 12px; right: 12px; bottom: 5px; height: 2px; border-radius: 99px;
  background: var(--lc, var(--sd-utpl-core)); opacity: 0; transform: scaleX(0.4); transform-origin: left;
  transition: opacity 0.25s, transform 0.35s var(--sd-spring);
}
.uph-lens.on .ul-bar { opacity: 1; transform: scaleX(1); }

@media (max-width: 720px) {
  .uph-console { max-width: none; }
  .uph { min-height: 520px; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .uph-live { animation: none; }
}
</style>
