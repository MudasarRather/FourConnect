<template>
  <div class="gb-wrap">
    <div ref="stageEl" class="gb-stage" :class="{ focused: !!effectiveActive }">
      <!-- substrate -->
      <span class="gb-substrate" aria-hidden="true" />
      <span class="gb-corner tl" aria-hidden="true" /><span class="gb-corner tr" aria-hidden="true" />
      <span class="gb-corner bl" aria-hidden="true" /><span class="gb-corner br" aria-hidden="true" />

      <!-- ambient continuous motion — data-independent, so the board is always alive -->
      <span class="gb-scan" aria-hidden="true" />
      <span v-for="m in motes" :key="m.id" class="gb-mote" aria-hidden="true"
        :style="{ '--mx': m.x + '%', '--my': m.y + '%', '--md': m.d + 's', '--ml': m.l + 's' }" />

      <!-- trace overlay -->
      <svg class="gb-traces" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g class="gb-base">
          <path v-for="c in chipLayout" :key="'b' + c.slug" :d="c.path" />
          <path v-for="p in padLayout" :key="'bp' + p.slug" :d="p.path" />
        </g>
        <!-- a slow faint current through every trace so the whole bus breathes -->
        <g class="gb-idle">
          <path v-for="c in chipLayout" :key="'i' + c.slug" :d="c.path" />
          <path v-for="p in padLayout" :key="'ip' + p.slug" :d="p.path" />
        </g>
        <g class="gb-hot">
          <path v-if="activeChip" :d="activeChip.path" class="gb-trace" :style="{ '--tc': activeChip.domain.accent }" data-flow />
          <path v-for="p in hotPads" :key="'h' + p.slug" :d="p.path" class="gb-trace"
            :style="{ '--tc': activeChip ? activeChip.domain.accent : 'var(--set-gold)' }" data-flow />
        </g>
      </svg>

      <!-- core -->
      <div class="gb-core-wrap" :style="coreStyle">
        <BoardCore :pct="corePct" :active="!!effectiveActive" />
      </div>

      <!-- domain chips · slot = staggered deal-in entrance, chip = hover tilt (never conflicting) -->
      <div v-for="(c, ci) in chipLayout" :key="c.slug" class="gb-chip-slot"
        :style="{ left: c.leftPct + '%', top: c.topPct + '%', width: c.wPct + '%', height: c.hPct + '%', '--ci': ci }">
        <BoardChip :domain="c.domain" :style="{ left: 0, top: 0, width: '100%', height: '100%' }"
          :active="c.slug === effectiveActive" :dim="!!effectiveActive && c.slug !== effectiveActive"
          :led-state="stateOf(c.slug)" :count="countOf(c.slug)"
          @focus="onFocus" @blur="onBlur" @pick="(s) => $emit('pick', s)" />
      </div>

      <!-- module pads (the bus the core powers) -->
      <button v-for="p in padLayout" :key="p.slug" type="button" class="gb-pad"
        :class="{ hot: hotPadSet.has(p.slug), dim: !!effectiveActive && !hotPadSet.has(p.slug) }"
        :style="{ left: p.leftPct + '%', top: p.topPct + '%', width: p.wPct + '%' }"
        :title="`Open ${p.module.label}`" @click="$emit('open-module', p.module.to)">
        <component :is="p.module.icon" :size="13" />
        <span>{{ p.module.label }}</span>
      </button>
    </div>

    <p class="gb-hint">
      <Sparkles :size="12" />
      Hover a domain to trace the modules it powers · click to configure
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import BoardCore from './BoardCore.vue'
import BoardChip from './BoardChip.vue'
import { DOMAINS, MODULES, BOARD_MODULES } from './connectivity'

const props = defineProps({
  states: { type: Object, default: () => ({}) }, // slug -> { state, count }
  externalActive: { type: String, default: null },
})
const emit = defineEmits(['pick', 'open-module', 'focus', 'blur'])

const VW = 1000, VH = 600
const CHIP_W = 150, CHIP_H = 44
const stageEl = ref(null)
const hoverSlug = ref(null)

// Deterministic ambient motes drifting over the board (varied by index, no RNG).
const motes = Array.from({ length: 7 }, (_, i) => ({
  id: i, x: (i * 53 + 11) % 92, y: (i * 31 + 18) % 84,
  d: 8 + (i % 4) * 2, l: (i % 6) * 0.8,
}))
const effectiveActive = computed(() => hoverSlug.value || props.externalActive || null)

// ── chip layout: 18 config domains in two 9-row columns flanking the core ────
const configDomains = DOMAINS.filter(d => d.slug !== 'dashboard')
const chipLayout = computed(() => {
  const left = configDomains.slice(0, 9)
  const right = configDomains.slice(9, 18)
  const out = []
  const place = (list, side) => list.forEach((d, r) => {
    const cy = 36 + r * 54
    const leftEdge = side === 'L' ? 20 : 830
    // Manhattan trace: chip port → side bus → core mid-line. Verticals overlap
    // into a clean comb of stubs rather than one overdrawn line.
    const path = side === 'L'
      ? `M 170 ${cy} H 300 V 250 H 430`
      : `M 830 ${cy} H 700 V 250 H 570`
    out.push({
      slug: d.slug, domain: d, side, cy,
      leftPct: (leftEdge / VW) * 100,
      topPct: ((cy - CHIP_H / 2) / VH) * 100,
      wPct: (CHIP_W / VW) * 100,
      hPct: (CHIP_H / VH) * 100,
      path,
    })
  })
  place(left, 'L'); place(right, 'R')
  return out
})

// ── module pad bus along the bottom ─────────────────────────────────────────
const padLayout = computed(() => {
  const mods = BOARD_MODULES
  const n = mods.length
  const padW = 66
  return mods.map((slug, i) => {
    const cx = 70 + i * ((930 - 70) / (n - 1))
    return {
      slug, module: MODULES[slug], cx,
      leftPct: ((cx - padW / 2) / VW) * 100,
      topPct: ((548 - 15) / VH) * 100,
      wPct: (padW / VW) * 100,
      path: `M 500 325 V 508 H ${cx.toFixed(1)} V 532`,
    }
  })
})

const activeChip = computed(() => chipLayout.value.find(c => c.slug === effectiveActive.value) || null)
const activeGoverns = computed(() => {
  const d = DOMAINS.find(x => x.slug === effectiveActive.value)
  return new Set(d?.governs || [])
})
const hotPads = computed(() => padLayout.value.filter(p => activeGoverns.value.has(p.slug)))
const hotPadSet = computed(() => new Set(hotPads.value.map(p => p.slug)))

const stateOf = (slug) => props.states?.[slug]?.state || 'unset'
const countOf = (slug) => props.states?.[slug]?.count ?? null
const corePct = computed(() => {
  const total = configDomains.length
  if (!total) return 0
  const ok = configDomains.filter(d => (props.states?.[d.slug]?.state) === 'ok').length
  const partial = configDomains.filter(d => (props.states?.[d.slug]?.state) === 'partial').length
  return Math.round(((ok + partial * 0.5) / total) * 100)
})

const coreStyle = {
  left: '42.5%', top: '29.17%', width: '15%', height: '25%',
}

const onFocus = (slug) => { hoverSlug.value = slug; emit('focus', slug) }
const onBlur = () => { hoverSlug.value = null; emit('blur') }
</script>

<style scoped>
.gb-wrap { display: flex; flex-direction: column; gap: 10px; overflow-x: auto; }
.gb-stage { position: relative; width: 100%; min-width: 760px; aspect-ratio: 1000 / 600; border-radius: 20px;
  background:
    radial-gradient(120% 120% at 50% 40%, rgba(251,191,36,0.05), transparent 60%),
    var(--set-panel);
  border: 1px solid var(--set-border); overflow: hidden; box-shadow: var(--set-card-shadow); }
.gb-substrate { position: absolute; inset: 0; pointer-events: none; opacity: 0.6;
  background-image:
    linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(120% 120% at 50% 50%, #000 50%, transparent 92%);
  -webkit-mask-image: radial-gradient(120% 120% at 50% 50%, #000 50%, transparent 92%); }
.gb-corner { position: absolute; width: 16px; height: 16px; border: 2px solid var(--set-border-warm); pointer-events: none; }
.gb-corner.tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
.gb-corner.tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
.gb-corner.bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
.gb-corner.br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }

.gb-traces { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.gb-base path { fill: none; stroke: var(--set-trace-idle); stroke-width: 1.4; }
.gb-idle path { fill: none; stroke: color-mix(in srgb, var(--set-gold) 30%, transparent); stroke-width: 1.4;
  stroke-linecap: round; stroke-dasharray: 3 27; opacity: 0.45; animation: set-trace-flow 26s linear infinite; }
.gb-hot .gb-trace { fill: none; stroke: var(--tc, var(--set-gold)); stroke-width: 2.2; stroke-linecap: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--tc, var(--set-gold)) 70%, transparent));
  stroke-dasharray: 7 10; animation: set-trace-flow 1.1s linear infinite; }

/* ambient: a read-head sweeping the board + drifting motes */
.gb-scan { position: absolute; top: 0; bottom: 0; left: -22%; width: 22%; pointer-events: none; z-index: 1; mix-blend-mode: screen;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold) 11%, transparent), transparent);
  animation: gb-scan-move 9s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
.gb-mote { position: absolute; left: var(--mx); top: var(--my); width: 3px; height: 3px; border-radius: 50%; z-index: 1;
  background: var(--set-gold); box-shadow: 0 0 8px var(--set-gold); opacity: 0; pointer-events: none;
  animation: gb-mote-rise var(--md, 9s) ease-in-out var(--ml, 0s) infinite; }

/* entrance: each chip slot deals in; the hover-tilt lives on the chip inside → no fill conflict */
.gb-chip-slot { position: absolute; z-index: 2; animation: gb-pop 0.55s var(--set-spring) both;
  animation-delay: calc(0.25s + var(--ci, 0) * 0.038s); }

@keyframes gb-pop { from { opacity: 0; transform: translateY(10px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes gb-scan-move { 0% { left: -22%; } 100% { left: 100%; } }
@keyframes gb-mote-rise {
  0% { opacity: 0; transform: translateY(8px) scale(0.5); }
  35%, 65% { opacity: 0.7; }
  100% { opacity: 0; transform: translateY(-16px) scale(1); }
}

.gb-core-wrap { position: absolute; z-index: 3; }

.gb-pad { position: absolute; z-index: 2; display: inline-flex; align-items: center; gap: 5px; justify-content: center;
  height: 28px; padding: 0 8px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 10px; font-weight: 700;
  white-space: nowrap; overflow: hidden;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border);
  transition: all 0.25s var(--set-spring); }
.gb-pad :deep(svg) { flex-shrink: 0; }
.gb-pad span { overflow: hidden; text-overflow: ellipsis; }
.gb-pad:hover { color: var(--set-text); border-color: var(--set-border-warm); transform: translateY(-2px); }
.gb-pad.hot { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 50%, transparent);
  background: color-mix(in srgb, var(--set-gold) 14%, var(--set-surface-elevated));
  box-shadow: 0 0 16px -4px color-mix(in srgb, var(--set-gold) 60%, transparent); }
.gb-pad.dim { opacity: 0.34; }

.gb-hint { margin: 0; display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--set-text-dim); padding-left: 4px; }
.gb-hint :deep(svg) { color: var(--set-gold); }

@media (prefers-reduced-motion: reduce) {
  .gb-hot .gb-trace, .gb-idle path, .gb-chip-slot { animation: none; }
  .gb-scan, .gb-mote { animation: none; display: none; }
  .gb-chip-slot { opacity: 1; transform: none; }
}
</style>
