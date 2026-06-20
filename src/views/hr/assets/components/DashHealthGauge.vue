<template>
  <Motion as="section" class="hg as-card" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <header class="hg-head">
      <span class="hg-eyebrow"><HeartPulse :size="13" /> Fleet health</span>
      <span class="hg-verdict" :style="{ '--c': verdict.color }">{{ verdict.label }}</span>
    </header>

    <div class="hg-dial">
      <svg viewBox="0 0 200 108" class="hg-svg" role="img" aria-label="Fleet condition health">
        <defs>
          <linearGradient id="hg-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" class="hg-s0" /><stop offset="34%" class="hg-s1" />
            <stop offset="68%" class="hg-s2" /><stop offset="100%" class="hg-s3" />
          </linearGradient>
        </defs>
        <path class="hg-track" d="M 15 100 A 85 85 0 0 1 185 100" />
        <path class="hg-scale" :class="{ on: draw }" d="M 15 100 A 85 85 0 0 1 185 100" pathLength="100"
          :stroke-dasharray="draw ? '100 100' : '0 100'" />
        <!-- ticks -->
        <g class="hg-ticks">
          <line v-for="t in 11" :key="t" :transform="`rotate(${-90 + (t - 1) * 18} 100 100)`" x1="100" y1="22" x2="100" y2="28" />
        </g>
        <!-- needle -->
        <g class="hg-needle" :class="{ on: draw }" :style="{ transform: `rotate(${draw ? needleAngle : -90}deg)` }">
          <line x1="100" y1="100" x2="100" y2="34" />
          <circle cx="100" cy="34" r="4" class="hg-needle-tip" />
        </g>
        <circle cx="100" cy="100" r="7" class="hg-hub" />
      </svg>
      <div class="hg-readout">
        <b class="hg-score"><AssetCountUp :value="score" :start="draw" :duration="1.5" /><i>%</i></b>
        <span class="hg-score-lab">health index</span>
      </div>
    </div>

    <!-- condition tiers -->
    <div class="hg-tiers">
      <Motion v-for="(t, i) in tiers" :key="t.key" as="button" type="button" class="hg-tier" :style="{ '--c': t.color }"
        :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, delay: 0.2 + i * 0.05 }"
        :whileHover="reduced ? {} : { y: -3 }" :whileTap="{ scale: 0.96 }" @click="$emit('pick', t.key)" :title="`${t.label} · view in inventory`">
        <span class="hg-tier-dot" />
        <span class="hg-tier-val as-mono"><AssetCountUp :value="t.value" :start="draw" /></span>
        <span class="hg-tier-lab">{{ t.label }}</span>
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { HeartPulse } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { conditionMeta, ASSET_CONDITIONS } from '@/composables/useAssets'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: () => ({}) } })
defineEmits(['pick'])

const COND_COLOR = {
  NEW: 'var(--as-cond-new)', GOOD: 'var(--as-cond-good)', FAIR: 'var(--as-cond-fair)',
  POOR: 'var(--as-cond-poor)', RETIRED: 'var(--as-cond-retired)',
}
const root = ref(null)
const reduced = prefersReduced()
const { visible } = useInView(root, { threshold: 0.3 })
const draw = ref(false)
onMounted(() => { nextTick(() => requestAnimationFrame(() => { draw.value = true })) })

const byCond = computed(() => props.stats.by_condition || {})
const tiers = computed(() => ASSET_CONDITIONS.map(k => ({
  key: k, label: conditionMeta(k).label, color: COND_COLOR[k] || 'var(--as-steel)', value: byCond.value[k] || 0,
})))
const total = computed(() => tiers.value.reduce((s, t) => s + t.value, 0))
// weighted condition score (NEW=4 … RETIRED=0) → 0..100
const score = computed(() => {
  if (!total.value) return 0
  const sum = ASSET_CONDITIONS.reduce((s, k) => s + (byCond.value[k] || 0) * conditionMeta(k).level, 0)
  return Math.round((sum / (total.value * 4)) * 100)
})
const needleAngle = computed(() => ((score.value - 50) / 50) * 90)
const verdict = computed(() => {
  const s = score.value
  if (!total.value) return { label: 'No data', color: 'var(--as-steel)' }
  if (s >= 80) return { label: 'Excellent', color: 'var(--as-cond-new)' }
  if (s >= 60) return { label: 'Healthy', color: 'var(--as-cond-good)' }
  if (s >= 40) return { label: 'Fair', color: 'var(--as-cond-fair)' }
  if (s >= 20) return { label: 'Ageing', color: 'var(--as-cond-poor)' }
  return { label: 'Critical', color: 'var(--as-al-lost)' }
})
</script>

<style scoped>
.hg { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.hg-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hg-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); }
.hg-eyebrow :deep(svg) { color: var(--as-amber); }
.hg-verdict { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: var(--c); padding: 3px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }

.hg-dial { position: relative; display: flex; flex-direction: column; align-items: center; }
.hg-svg { width: 100%; max-width: 240px; height: auto; }
.hg-track { fill: none; stroke: var(--as-border-soft); stroke-width: 9; stroke-linecap: round; }
.hg-scale { fill: none; stroke: url(#hg-grad); stroke-width: 9; stroke-linecap: round; transition: stroke-dasharray 1.5s var(--as-spring); }
.hg-s0 { stop-color: var(--as-cond-poor); } .hg-s1 { stop-color: var(--as-cond-fair); }
.hg-s2 { stop-color: var(--as-cond-good); } .hg-s3 { stop-color: var(--as-cond-new); }
.hg-ticks line { stroke: var(--as-border-strong); stroke-width: 1.4; opacity: 0.55; }
.hg-needle { transform-box: view-box; transform-origin: 100px 100px; transition: transform 1.5s var(--as-spring); }
.hg-needle line { stroke: var(--as-text); stroke-width: 2.4; stroke-linecap: round; }
.hg-needle-tip { fill: var(--as-amber-bright); filter: drop-shadow(0 0 5px var(--as-amber)); }
.hg-hub { fill: var(--as-surface-elevated); stroke: var(--as-border-strong); stroke-width: 1.5; }

.hg-readout { text-align: center; margin-top: -6px; }
.hg-score { font-size: 32px; font-weight: 850; color: var(--as-text); letter-spacing: -0.02em; line-height: 1; }
.hg-score i { font-style: normal; font-size: 16px; color: var(--as-text-muted); margin-left: 1px; }
.hg-score-lab { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 2px; }

.hg-tiers { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.hg-tier { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; cursor: pointer; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, background 0.2s; }
.hg-tier:hover { border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 9%, transparent); }
.hg-tier-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px var(--c); }
.hg-tier-val { font-size: 14px; font-weight: 800; color: var(--as-text); }
.hg-tier-lab { font-size: 9px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }

@media (prefers-reduced-motion: reduce) { .hg-needle, .hg-scale { transition: none; } }
</style>
