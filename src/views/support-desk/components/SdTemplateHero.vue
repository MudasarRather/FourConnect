<template>
  <Motion as="section" class="tph" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── full-bleed signature stage (the Letterpress IS the hero backdrop) ── -->
    <div class="tph-bleed">
      <slot name="instrument">
        <div class="tph-idle" aria-hidden="true">
          <Stamp :size="42" class="tph-idle-core" />
        </div>
      </slot>
    </div>
    <div class="tph-grain" aria-hidden="true" />
    <div class="tph-scrim" aria-hidden="true" />

    <!-- ── glass console over the calm left air ── -->
    <div class="tph-console">
      <div class="tph-eyebrow sd-mono">
        <span class="tph-live" :class="{ hot: (stats.draft || 0) > 0 }" aria-hidden="true" />
        TEMPLATES · COPPERPLATE STUDIO
      </div>
      <h2 class="tph-title">Struck once. <em>Faithful forever.</em></h2>
      <p class="tph-sub">
        Every template is an engraved master plate — locked defaults, a subject and body
        with live variables, a checklist, an SLA. One strike prefills the whole intake,
        and every proof it pulls is counted.
      </p>

      <div class="tph-ctas">
        <Motion as="button" class="tph-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          title="Cut a new master plate" @click="$emit('new')">
          <Plus :size="15" /> New template
        </Motion>
        <Motion v-if="(stats.unused || 0) > 0" as="button" class="tph-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          title="Active plates that have never been struck — retire them or put them to work" @click="$emit('pick', { key: 'unused' })">
          <CircleDashed :size="14" /> {{ stats.unused }} never used
        </Motion>
        <Motion as="button" class="tph-btn icon ghost" title="Refresh" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ 'tph-spin': loading }" />
        </Motion>
      </div>

      <!-- press-shop readouts -->
      <div class="tph-readouts sd-mono">
        <span class="tph-ro copper"><i>ACTIVE PLATES</i><b><SdCountUp :value="stats.active ?? 0" /></b></span>
        <span class="tph-ro"><i>STRIKES · ALL TIME</i><b><SdCountUp :value="stats.usage_total ?? 0" /></b></span>
        <span class="tph-ro use"><i>PROOFS · 30D</i><b><SdCountUp :value="stats.tickets_from_templates_30d ?? 0" /></b></span>
        <span v-if="topName" class="tph-ro top"><i>TOP PLATE</i><b class="tph-ro-name">{{ topName }}</b></span>
      </div>
    </div>

    <!-- ── telemetry lenses docked along the press-room floor ── -->
    <div class="tph-lensdock" role="tablist" aria-label="Template lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="tph-lens"
        :class="{ on: activeLens === l.key }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.18 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -3 }" :while-tap="{ scale: 0.97 }" @click="$emit('pick', l)">
        <span class="tl-ic"><component :is="l.icon" :size="14" /></span>
        <span class="tl-body">
          <span class="tl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="tl-lb">{{ l.label }}</span>
        </span>
        <span class="tl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdTemplateHero — the Copperplate Studio banner. Same layout contract as
   SdArchivedHero / SdClosedHero (full-bleed #instrument backdrop, glass console
   over the calm left air, lens dock along the bottom) with the press identity:
   copper = the struck plate, graphite ink = drafts, umber = the archive drawer,
   emerald = a strike put to work. THEME-NATIVE stage: press-room obsidian on
   dark, proofing paper on light. Accent = --sd-tpl-*. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Stamp, Plus, RefreshCw, CircleDashed } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'new', 'refresh'])

const topName = computed(() => {
  const top = (props.stats.top_used || [])[0]
  if (!top) return ''
  return top.name.length > 22 ? `${top.name.slice(0, 21)}…` : top.name
})
</script>

<style scoped>
.tph {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-tpl-brd); border-radius: 22px;
  background: var(--sd-tpl-stage); min-height: clamp(450px, 41vw, 560px);
  display: flex; flex-direction: column; justify-content: flex-end;
}
.tph-bleed { position: absolute; inset: 0; z-index: 0; }
.tph-grain {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.4; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 0.6px, transparent 0.7px);
  background-size: 3px 3px;
}
.tph-scrim {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--sd-tpl-stage) 92%, transparent) 0%, color-mix(in srgb, var(--sd-tpl-stage) 55%, transparent) 38%, transparent 62%),
    linear-gradient(0deg, color-mix(in srgb, var(--sd-tpl-stage) 90%, transparent) 0%, transparent 34%);
}
.tph-idle { position: absolute; inset: 0; display: grid; place-items: center; }
.tph-idle-core { color: var(--sd-tpl-core); opacity: 0.4; }

/* ── console ── */
.tph-console { position: relative; z-index: 2; padding: 26px 28px 10px; max-width: 560px; }
.tph-eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.2em; color: var(--sd-tpl-core);
  margin-bottom: 10px;
}
.tph-live {
  width: 8px; height: 8px; border-radius: 50%; background: var(--sd-tpl-core);
  box-shadow: 0 0 12px var(--sd-tpl-soft); animation: tph-pulse 2.6s infinite;
}
.tph-live.hot { background: var(--sd-tpl-ink); }
@keyframes tph-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.tph-title {
  margin: 0 0 8px; font-size: clamp(24px, 2.6vw, 33px); font-weight: 800; letter-spacing: -0.02em;
  color: var(--sd-text); line-height: 1.12; text-wrap: balance;
}
.tph-title em {
  font-style: normal;
  background: var(--sd-tpl-grad); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.tph-sub { margin: 0 0 16px; font-size: 13.5px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 52ch; }

.tph-ctas { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 16px; }
.tph-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-tpl-brd); background: color-mix(in srgb, var(--sd-tpl-stage) 60%, transparent);
  color: var(--sd-text); backdrop-filter: blur(6px);
}
.tph-btn.primary { border: none; background: var(--sd-tpl-grad); color: #180d05; box-shadow: var(--sd-tpl-glow); }
[data-theme="light"] .tph-btn.primary { color: #fff6ea; }
.tph-btn.ghost { color: var(--sd-text-secondary); }
.tph-btn.icon { padding: 10px 11px; }
.tph-spin { animation: sd-spin-slow 1.1s linear infinite; }

.tph-readouts { display: flex; flex-wrap: wrap; gap: 8px 18px; padding-bottom: 8px; }
.tph-ro { display: flex; flex-direction: column; gap: 2px; }
.tph-ro i { font-style: normal; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.tph-ro b { font-size: 17px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.tph-ro.copper b { color: var(--sd-tpl-hi); }
[data-theme="light"] .tph-ro.copper b { color: var(--sd-tpl-core); }
.tph-ro.use b { color: var(--sd-tpl-use); }
.tph-ro-name { font-size: 12.5px !important; letter-spacing: 0.02em; align-self: flex-start; padding-top: 3px; }

/* ── lens dock ── */
.tph-lensdock {
  position: relative; z-index: 2; display: flex; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px 16px;
  border-top: 1px solid color-mix(in srgb, var(--sd-tpl-brd) 60%, transparent);
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--sd-tpl-stage) 55%, transparent));
}
.tph-lens {
  position: relative; display: flex; align-items: center; gap: 9px; min-width: 118px;
  padding: 9px 13px 11px; border-radius: 12px; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--lc, var(--sd-tpl-core)) 26%, transparent);
  background: color-mix(in srgb, var(--sd-tpl-stage) 62%, transparent);
  color: var(--sd-text); backdrop-filter: blur(6px);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tph-lens.on {
  border-color: var(--lc, var(--sd-tpl-core));
  box-shadow: 0 0 20px color-mix(in srgb, var(--lc, var(--sd-tpl-core)) 26%, transparent);
}
.tl-ic {
  width: 28px; height: 28px; display: grid; place-items: center; border-radius: 9px;
  background: color-mix(in srgb, var(--lc, var(--sd-tpl-core)) 15%, transparent);
  color: var(--lc, var(--sd-tpl-core));
}
.tl-body { display: flex; flex-direction: column; align-items: flex-start; }
.tl-val { font-size: 15px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.tl-lb { font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-muted); }
.tl-bar {
  position: absolute; left: 12px; right: 12px; bottom: 5px; height: 2px; border-radius: 99px;
  background: var(--lc, var(--sd-tpl-core)); opacity: 0; transform: scaleX(0.4); transform-origin: left;
  transition: opacity 0.25s, transform 0.35s var(--sd-spring);
}
.tph-lens.on .tl-bar { opacity: 1; transform: scaleX(1); }

@media (max-width: 720px) {
  .tph-console { max-width: none; }
  .tph { min-height: 520px; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tph-live { animation: none; }
}
</style>
