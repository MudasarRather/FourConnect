<template>
  <div class="tf sd-card">
    <header class="tf-head">
      <h3 class="tf-title"><TrendingUp :size="15" /> Escalation flow <span class="tf-days sd-mono">· {{ days }}D</span></h3>
      <p class="tf-sub">How work climbs (and returns down) the tier ladder. Ribbon weight = moves.</p>
    </header>

    <svg class="tf-svg" viewBox="0 0 640 190" preserveAspectRatio="xMidYMid meet" role="img"
      aria-label="Tier escalation flow diagram">
      <defs>
        <linearGradient v-for="e in edges" :id="`tfg-${e.key}`" :key="e.key" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="e.fromColor" stop-opacity="0.55" />
          <stop offset="100%" :stop-color="e.toColor" stop-opacity="0.75" />
        </linearGradient>
      </defs>

      <!-- ribbons under the platforms -->
      <path v-for="e in edges" :key="`p-${e.key}`" :d="e.path" :fill="`url(#tfg-${e.key})`" class="tf-ribbon">
        <title>{{ e.title }}</title>
      </path>
      <!-- riding pulses along each ribbon -->
      <circle v-for="e in edges" :key="`c-${e.key}`" r="3" :fill="e.toColor" class="tf-pulse">
        <animateMotion :dur="`${e.dur}s`" repeatCount="indefinite" :path="e.mid" />
      </circle>

      <!-- the three platforms -->
      <g v-for="p in platforms" :key="p.tier">
        <rect :x="p.x" y="44" width="86" height="102" rx="13" class="tf-plat" :style="{ '--pc': p.accent }" />
        <text :x="p.x + 43" y="72" text-anchor="middle" class="tf-plat-tier sd-mono" :fill="p.accent">{{ p.short }}</text>
        <text :x="p.x + 43" y="103" text-anchor="middle" class="tf-plat-open">{{ p.open }}</text>
        <text :x="p.x + 43" y="118" text-anchor="middle" class="tf-plat-lb">OPEN</text>
        <text :x="p.x + 43" y="137" text-anchor="middle" class="tf-plat-q sd-mono">{{ p.queues }} lane{{ p.queues === 1 ? '' : 's' }}</text>
      </g>
    </svg>

    <footer v-if="hasFlow" class="tf-foot sd-mono">
      <span v-for="e in edges" :key="`f-${e.key}`" class="tf-leg" :style="{ '--lc': e.toColor }">
        <i />{{ e.label }} <b>{{ e.count }}</b>
      </span>
    </footer>
    <footer v-else class="tf-foot quiet sd-mono">
      <ArrowUpDown :size="12" /> NO TIER MOVES IN THIS WINDOW — WORK IS RESOLVING ON THE TIER IT LANDED ON
    </footer>
  </div>
</template>

<script setup>
/* SdTierFlow — the L1→L2→L3 ladder as a mini-Sankey: three platform blocks with the
   live open depth, and animated ribbons whose thickness = tier moves in range
   (escalations climb, descends return). Pure SVG — no canvas needed at this size. */
import { computed } from 'vue'
import { TrendingUp, ArrowUpDown } from 'lucide-vue-next'
import { TIER_META } from '@/composables/useSupportDesk'

const props = defineProps({
  flow: { type: Array, default: () => [] },        // TierFlowEdge[] {from_tier,to_tier,count}
  rollup: { type: Object, default: () => ({}) },   // tier_rollup
  days: { type: Number, default: 7 },
})

const X = { 1: 40, 2: 277, 3: 514 }
const platforms = computed(() => [1, 2, 3].map(t => ({
  tier: t, x: X[t], short: TIER_META[t].short, accent: TIER_META[t].accent,
  open: (props.rollup[String(t)] || {}).open ?? 0,
  queues: (props.rollup[String(t)] || {}).queues ?? 0,
})))

const hasFlow = computed(() => props.flow.some(e => e.count > 0))

const edges = computed(() => {
  const max = Math.max(1, ...props.flow.map(e => e.count))
  return props.flow.filter(e => e.count > 0).map(e => {
    const up = e.to_tier > e.from_tier
    const x0 = X[e.from_tier] + (up ? 86 : 0)
    const x1 = X[e.to_tier] + (up ? 0 : 86)
    const y = up ? 82 : 118                          // climbs ride high, returns ride low
    const w = 3 + (e.count / max) * 13
    const cx = (x0 + x1) / 2
    const cy = up ? y - 26 : y + 26
    const path = `M ${x0} ${y - w / 2} Q ${cx} ${cy - w / 2} ${x1} ${y - w / 2} L ${x1} ${y + w / 2} Q ${cx} ${cy + w / 2} ${x0} ${y + w / 2} Z`
    const mid = `M ${x0} ${y} Q ${cx} ${cy} ${x1} ${y}`
    return {
      key: `${e.from_tier}-${e.to_tier}`,
      path, mid, count: e.count,
      dur: Math.max(2.2, 5 - (e.count / max) * 2.5),
      fromColor: cssColor(TIER_META[e.from_tier].accent),
      toColor: cssColor(TIER_META[e.to_tier].accent),
      label: `${TIER_META[e.from_tier].short}→${TIER_META[e.to_tier].short}`,
      title: `${e.count} move(s) ${TIER_META[e.from_tier].short} → ${TIER_META[e.to_tier].short} in the last ${props.days} days`,
    }
  })
})

// SVG gradients can't resolve var() in every engine — resolve to literal hex once.
const cssColor = (v) => {
  if (!v.startsWith('var(')) return v
  const name = v.slice(4, -1).trim()
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#edb249'
}
</script>

<style scoped>
.tf { padding: 16px 18px; border-radius: 16px; }
.tf-head { margin-bottom: 4px; }
.tf-title { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 13.5px; font-weight: 800; color: var(--sd-text); }
.tf-days { font-size: 10px; color: var(--sd-text-dim); letter-spacing: 0.12em; }
.tf-sub { margin: 3px 0 0; font-size: 11px; color: var(--sd-text-muted); }

.tf-svg { width: 100%; height: auto; margin-top: 6px; }
.tf-plat { fill: color-mix(in srgb, var(--pc) 8%, var(--sd-surface)); stroke: color-mix(in srgb, var(--pc) 38%, transparent); stroke-width: 1; }
.tf-plat-tier { font-size: 12px; font-weight: 800; letter-spacing: 0.14em; }
.tf-plat-open { font-size: 23px; font-weight: 800; fill: var(--sd-text); font-variant-numeric: tabular-nums; }
.tf-plat-lb { font-size: 7.5px; font-weight: 800; letter-spacing: 0.22em; fill: var(--sd-text-dim); }
.tf-plat-q { font-size: 9px; fill: var(--sd-text-muted); }
.tf-ribbon { opacity: 0.9; }
.tf-pulse { filter: drop-shadow(0 0 4px currentColor); }

.tf-foot { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 4px; }
.tf-foot.quiet { align-items: center; gap: 7px; font-size: 9px; letter-spacing: 0.12em;
  color: var(--sd-text-dim); font-weight: 700; }
.tf-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.tf-leg i { width: 14px; height: 4px; border-radius: 3px; background: var(--lc); }
.tf-leg b { color: var(--sd-text); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tf-pulse { display: none; }
}
</style>
