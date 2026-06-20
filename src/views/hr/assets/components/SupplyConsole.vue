<template>
  <Motion as="section" class="sc" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="sc-aura" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />

    <div class="sc-top">
      <div class="sc-lead">
        <span class="sc-eyebrow"><Network :size="13" /> Supply Constellation · Vendor Network</span>
        <h1 class="sc-title">Supply <span class="sc-title-accent">Web</span></h1>
        <p class="sc-sub">Every supplier in orbit around procurement — sized by what they've put into the fleet, rated by how well they deliver. Keep the network sharp.</p>
        <div class="sc-cta">
          <Motion as="button" type="button" class="as-btn as-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="14" /> New vendor
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-steel" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'inventory')">
            <Boxes :size="14" /> Sourced fleet
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'maintenance')">
            <Wrench :size="14" /> Service bay
          </Motion>
        </div>
      </div>

      <div class="sc-stage" ref="stageEl">
        <VendorConstellation :vendors="vendors" @focus="(id) => $emit('focus', id)" />
      </div>
    </div>

    <!-- stat lenses -->
    <div class="sc-lenses" ref="lensEl">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="sc-lens"
        :class="{ on: l.filter && activeFilter === l.filter, stat: !l.filter }" :data-tone="l.tone"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="l.filter ? { y: -3 } : {}" :whileTap="l.filter ? { scale: 0.97 } : {}"
        :title="l.hint" @click="l.filter && $emit('pick', l.filter)">
        <span class="sc-lens-ic"><component :is="l.icon" :size="15" /></span>
        <span class="sc-lens-val">
          <AssetCountUp :value="l.value" :start="lensIn" :duration="1 + i * 0.07" :decimals="l.decimals || 0" :suffix="l.suffix || ''" />
        </span>
        <span class="sc-lens-lab">{{ l.label }}</span>
        <VendorStars v-if="l.key === 'rating' && counts.avgRating" class="sc-lens-stars" :model-value="Math.round(counts.avgRating)" readonly :size="9" />
      </Motion>
    </div>

    <!-- supply-concentration mix bar -->
    <div class="sc-mix" ref="mixEl">
      <div class="sc-mix-head">
        <span class="sc-mix-title"><Layers :size="13" /> Supply concentration</span>
        <span class="sc-mix-sub">{{ counts.assetsSourced }} assets across {{ counts.withAssets }} sourcing vendors</span>
      </div>
      <div class="sc-mix-bar">
        <span v-for="(s, i) in mix" :key="i" class="sc-mix-seg" :style="{ width: mixIn ? s.pct + '%' : '0%', background: s.color, '--di': i }" :title="`${s.name} · ${s.val} assets`" />
        <span v-if="!mix.length" class="sc-mix-empty">No assets sourced yet</span>
      </div>
      <div v-if="mix.length" class="sc-mix-legend">
        <span v-for="(s, i) in mix" :key="i" class="sc-mix-leg"><i :style="{ background: s.color }" />{{ s.name }} <b>{{ Math.round(s.pct) }}%</b></span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Network, Plus, Boxes, Wrench, Building2, CircleCheck, Power, Star, Layers } from 'lucide-vue-next'
import VendorConstellation from './VendorConstellation.vue'
import VendorStars from './VendorStars.vue'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  vendors: { type: Array, default: () => [] },
  activeFilter: { type: String, default: '' },
})
defineEmits(['new', 'go', 'pick', 'focus'])

const root = ref(null)
const stageEl = ref(null)
const lensEl = ref(null)
const mixEl = ref(null)
const reduced = prefersReduced()
const { visible: lensIn } = useInView(lensEl, { threshold: 0.2 })
const { visible: mixIn } = useInView(mixEl, { threshold: 0.3 })

const counts = computed(() => {
  const vs = props.vendors
  const active = vs.filter(v => v.is_active !== false).length
  const rated = vs.filter(v => v.rating)
  const withAssets = vs.filter(v => (v.asset_count || 0) > 0).length
  return {
    total: vs.length,
    active,
    inactive: vs.length - active,
    assetsSourced: vs.reduce((s, v) => s + (v.asset_count || 0), 0),
    avgRating: rated.length ? rated.reduce((s, v) => s + v.rating, 0) / rated.length : 0,
    withAssets,
  }
})

const lenses = computed(() => [
  { key: 'total',  label: 'Vendors',  value: counts.value.total,    tone: 'amber', icon: Building2, hint: 'All suppliers' },
  { key: 'active', label: 'Active',   value: counts.value.active,   tone: 'gain',  icon: CircleCheck, filter: 'active', hint: 'Filter active suppliers' },
  { key: 'inact',  label: 'Inactive', value: counts.value.inactive, tone: 'steel', icon: Power, filter: 'inactive', hint: 'Filter inactive suppliers' },
  { key: 'assets', label: 'Sourced',  value: counts.value.assetsSourced, tone: 'ember', icon: Boxes, hint: 'Assets sourced from vendors' },
  { key: 'rating', label: 'Avg rating', value: counts.value.avgRating, decimals: 1, tone: 'gold', icon: Star, hint: 'Average supplier rating' },
])

const RAMP = ['var(--as-amber-bright)', 'var(--as-amber)', 'var(--as-ember)', 'var(--as-ember-deep)', 'var(--as-steel)']
const mix = computed(() => {
  const total = counts.value.assetsSourced
  if (!total) return []
  const ranked = [...props.vendors].filter(v => (v.asset_count || 0) > 0).sort((a, b) => b.asset_count - a.asset_count)
  const top = ranked.slice(0, 5)
  const topSum = top.reduce((s, v) => s + v.asset_count, 0)
  const segs = top.map((v, i) => ({ name: v.name, val: v.asset_count, pct: (v.asset_count / total) * 100, color: RAMP[i] }))
  const others = total - topSum
  if (others > 0) segs.push({ name: 'Others', val: others, pct: (others / total) * 100, color: 'var(--as-steel-dim)' })
  return segs
})
</script>

<style scoped>
.sc { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px; border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.sc-aura { position: absolute; inset: -45% -15% auto -15%; height: 90%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }

.sc-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 30px; flex-wrap: wrap; }
.sc-lead { max-width: 470px; min-width: 270px; flex: 1; }
.sc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.sc-title { margin: 14px 0 0; font-size: clamp(28px, 3.6vw, 42px); font-weight: 850; letter-spacing: -0.025em; color: var(--as-text); line-height: 1.02; }
.sc-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sc-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 450px; }
.sc-cta { display: flex; gap: 9px; margin-top: 17px; flex-wrap: wrap; }
.sc-stage { flex: 0 0 auto; width: min(360px, 100%); }

/* lenses */
.sc-lenses { position: relative; z-index: 1; margin-top: 22px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px; }
.sc-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2px; padding: 12px 13px 11px; border-radius: 15px; text-align: left; cursor: pointer;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: border-color 0.25s, box-shadow 0.25s; }
.sc-lens.stat { cursor: default; }
.sc-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85; background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.sc-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.sc-lens.on { border-color: color-mix(in srgb, var(--lc) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--lc) 30%, transparent), var(--as-card-shadow-hover); }
.sc-lens[data-tone="amber"] { --lc: var(--as-amber); }
.sc-lens[data-tone="gain"]  { --lc: var(--as-st-available); }
.sc-lens[data-tone="steel"] { --lc: var(--as-steel); }
.sc-lens[data-tone="ember"] { --lc: var(--as-ember); }
.sc-lens[data-tone="gold"]  { --lc: var(--as-amber-bright); }
.sc-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.sc-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.sc-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.sc-lens-stars { margin-top: 4px; }

/* supply mix */
.sc-mix { position: relative; z-index: 1; margin-top: 18px; padding: 14px 16px; border-radius: 16px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.sc-mix-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 11px; }
.sc-mix-title { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text); }
.sc-mix-title :deep(svg) { color: var(--as-amber); }
.sc-mix-sub { font-size: 11.5px; color: var(--as-text-muted); }
.sc-mix-bar { position: relative; display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--as-steel) 16%, transparent); gap: 2px; }
.sc-mix-seg { height: 100%; min-width: 2px; transition: width 1s var(--as-ease); transition-delay: calc(var(--di) * 0.08s); }
.sc-mix-seg:first-child { border-radius: 999px 0 0 999px; }
.sc-mix-seg:last-child { border-radius: 0 999px 999px 0; }
.sc-mix-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10.5px; color: var(--as-text-dim); }
.sc-mix-legend { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 11px; }
.sc-mix-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--as-text-secondary); max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-mix-leg i { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.sc-mix-leg b { color: var(--as-text); font-weight: 800; }

@media (max-width: 1080px) { .sc-lenses { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 680px) { .sc-lenses { grid-template-columns: repeat(3, 1fr); } .sc-stage { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .sc-mix-seg { transition: none; } }
</style>
