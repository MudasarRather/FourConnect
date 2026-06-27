<template>
  <div ref="rootEl" class="gs" :class="{ ready: pct >= 100 }">
    <!-- ambient substrate -->
    <span class="gs-grid" aria-hidden="true" />
    <span class="gs-aura" aria-hidden="true" />
    <span v-for="m in motes" :key="m.id" class="gs-mote" aria-hidden="true"
      :style="{ '--mx': m.x + '%', '--my': m.y + '%', '--md': m.d + 's', '--ml': m.l + 's' }" />

    <!-- readout -->
    <div class="gs-readout">
      <span class="gs-eyebrow"><Activity :size="11" /> Governance readiness</span>
      <div class="gs-figure">
        <span class="gs-pct"><SetCountUp :value="pct" suffix="%" /></span>
        <span class="gs-figure-meta">
          <b>{{ configuredTotal }}<i>/{{ cells.length }}</i></b>
          <span>domains live</span>
        </span>
      </div>
      <p class="gs-sub">{{ headline }}</p>
    </div>

    <!-- the spectrum equalizer -->
    <div class="gs-spectrum">
      <span class="gs-readhead" aria-hidden="true" />
      <span class="gs-baseline" aria-hidden="true" />
      <span v-for="(c, i) in cells" :key="c.slug" class="gs-pylon" :data-state="c.state"
        :title="`${c.label} · ${labelFor(c.state)}`"
        :style="{ '--acc': c.accent, '--i': i, '--h': heightFor(c.state) + '%', '--ph': (i % 5) }" />
    </div>

    <!-- legend -->
    <div class="gs-legend">
      <button v-for="s in segments" :key="s.key" type="button" class="gs-seg" :style="{ '--acc': s.color }"
        :class="{ on: active === s.key }"
        @mouseenter="$emit('hover', s.key)" @mouseleave="$emit('leave')" @click="$emit('pick', s.key)">
        <span class="gs-seg-dot" />
        <b><SetCountUp :value="s.value" /></b>
        <span class="gs-seg-lab">{{ s.label }}</span>
      </button>
      <span class="gs-modules">
        <Boxes :size="12" /><b><SetCountUp :value="modules" /></b> modules powered
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Activity, Boxes } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'

const props = defineProps({
  // per-domain cells: { slug, label, accent, state }
  cells: { type: Array, default: () => [] },
  // legend segments: { key, label, value, color }
  segments: { type: Array, default: () => [] },
  modules: { type: Number, default: 0 },
  active: { type: String, default: null },
})
defineEmits(['pick', 'hover', 'leave'])

const rootEl = ref(null)

const configuredTotal = computed(() => props.cells.filter(c => c.state === 'ok').length)
const pct = computed(() => {
  const n = props.cells.length
  if (!n) return 0
  const ok = props.cells.filter(c => c.state === 'ok').length
  const partial = props.cells.filter(c => c.state === 'partial').length
  return Math.round(((ok + partial * 0.5) / n) * 100)
})
const headline = computed(() => {
  if (pct.value >= 100) return 'Every governance domain is configured and powering its modules.'
  if (pct.value >= 70) return 'Most domains are live — a few remain on the roadmap.'
  return 'Configure the remaining domains to fully power the HR modules.'
})

// Deterministic ambient motes (no Math.random — varied by index).
const motes = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: (i * 37 + 8) % 96,
  y: (i * 53 + 12) % 88,
  d: 7 + (i % 5) * 1.6,
  l: (i % 7) * 0.9,
}))

const heightFor = (s) => (s === 'ok' ? 100 : s === 'partial' ? 60 : 32)
const labelFor = (s) => (s === 'ok' ? 'Configured' : s === 'partial' ? 'Partial' : 'On roadmap')
</script>

<style scoped>
.gs {
  position: relative; overflow: hidden; border-radius: 18px; padding: 18px 20px 16px;
  background:
    radial-gradient(130% 120% at 12% 0%, color-mix(in srgb, var(--set-gold) 8%, transparent), transparent 60%),
    var(--set-panel);
  border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  display: grid; grid-template-columns: minmax(150px, 0.7fr) 1.6fr; grid-template-rows: 1fr auto;
  grid-template-areas: "readout spectrum" "legend legend"; gap: 14px 20px;
}
.gs-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(120% 130% at 80% 0%, #000, transparent 78%);
  -webkit-mask-image: radial-gradient(120% 130% at 80% 0%, #000, transparent 78%); }
.gs-aura { position: absolute; inset: -40% 30% auto -10%; height: 120%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 16%, transparent), transparent 70%); filter: blur(34px); }
.gs-mote { position: absolute; left: var(--mx); top: var(--my); width: 3px; height: 3px; border-radius: 50%;
  background: var(--set-gold); opacity: 0; box-shadow: 0 0 8px var(--set-gold); pointer-events: none;
  animation: gs-mote-float var(--md, 9s) ease-in-out var(--ml, 0s) infinite; }

/* readout */
.gs-readout { grid-area: readout; position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.gs-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.gs-eyebrow :deep(svg) { color: var(--set-gold); }
.gs-figure { display: flex; align-items: baseline; gap: 12px; }
.gs-pct { font-size: clamp(34px, 5vw, 52px); font-weight: 850; line-height: 0.9; letter-spacing: -0.03em;
  background: var(--set-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.gs-figure-meta { display: flex; flex-direction: column; line-height: 1.05; }
.gs-figure-meta b { font-size: 16px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.gs-figure-meta b i { font-style: normal; font-size: 12px; color: var(--set-text-dim); }
.gs-figure-meta span { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.gs-sub { margin: 2px 0 0; font-size: 11.5px; line-height: 1.45; color: var(--set-text-muted); max-width: 30ch; }

/* spectrum equalizer */
.gs-spectrum { grid-area: spectrum; position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 0.55%;
  height: 118px; padding: 0 2px 2px; }
.gs-baseline { position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--set-border-strong), transparent); }
.gs-readhead { position: absolute; top: 0; bottom: 1px; width: 16%; pointer-events: none; z-index: 2; mix-blend-mode: screen;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold) 36%, transparent), transparent);
  animation: gs-sweep 5.5s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
.gs-pylon { position: relative; flex: 1 1 0; min-width: 0; height: var(--h, 40%); border-radius: 4px 4px 2px 2px;
  transform-origin: bottom; transform: scaleY(0);
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 22%, transparent));
  box-shadow: 0 0 12px -3px color-mix(in srgb, var(--acc) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.25);
  animation: gs-rise 0.7s var(--set-spring) forwards;
  animation-delay: calc(var(--i) * 0.045s);
  transition: height 0.7s var(--set-ease), background 0.4s, box-shadow 0.4s, opacity 0.4s; }
.gs-pylon::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.4), transparent 40%); opacity: 0.5; }
.gs-pylon[data-state="partial"] { background: linear-gradient(180deg, var(--set-partial), color-mix(in srgb, var(--set-partial) 20%, transparent)); box-shadow: 0 0 10px -4px var(--set-partial); }
.gs-pylon[data-state="unset"] { background: linear-gradient(180deg, var(--set-unset), color-mix(in srgb, var(--set-unset) 12%, transparent)); box-shadow: none; opacity: 0.55; }
.gs-pylon[data-state="unset"]::after { opacity: 0.2; }

/* legend */
.gs-legend { grid-area: legend; position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  padding-top: 12px; border-top: 1px solid var(--set-border); }
.gs-seg { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px 6px 10px; border-radius: 11px; cursor: pointer; font: inherit;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.gs-seg:hover { border-color: color-mix(in srgb, var(--acc) 40%, transparent); transform: translateY(-2px); }
.gs-seg.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 12%, var(--set-surface-elevated)); }
.gs-seg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 9px var(--acc); flex-shrink: 0; }
.gs-seg b { font-size: 15px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.gs-seg-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--set-text-muted); }
.gs-modules { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--set-text-muted); }
.gs-modules :deep(svg) { color: var(--set-gold); }
.gs-modules b { font-size: 14px; font-weight: 850; color: var(--set-text); }

@keyframes gs-rise { to { transform: scaleY(1); } }
@keyframes gs-sweep { 0% { left: -16%; } 100% { left: 100%; } }
@keyframes gs-mote-float {
  0% { opacity: 0; transform: translateY(6px) scale(0.6); }
  30%, 70% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(-14px) scale(1); }
}

@media (max-width: 720px) {
  .gs { grid-template-columns: 1fr; grid-template-areas: "readout" "spectrum" "legend"; }
  .gs-spectrum { height: 92px; }
}
@media (prefers-reduced-motion: reduce) {
  .gs-mote, .gs-readhead { animation: none; display: none; }
  .gs-pylon { animation: none; transform: scaleY(1); }
}
</style>
