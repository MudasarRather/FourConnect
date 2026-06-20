<template>
  <Motion as="section" class="cc" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="cc-aura" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />
    <span class="cc-orbit" aria-hidden="true"><Network :size="280" :stroke-width="0.5" /></span>

    <div class="cc-top">
      <div class="cc-lead">
        <span class="cc-eyebrow"><FolderTree :size="13" /> Taxonomy Atlas · Classification Control</span>
        <h1 class="cc-title">Classify the <span class="cc-title-accent">Fleet</span></h1>
        <p class="cc-sub">Group every asset into a living taxonomy — drive depreciation, useful-life and reporting from one classification spine.</p>
        <div class="cc-cta">
          <Motion as="button" type="button" class="as-btn as-btn-primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="14" /> New category
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'inventory')">
            <Boxes :size="14" /> Fleet bay
          </Motion>
        </div>
      </div>

      <div class="cc-lenses" ref="lensesEl">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="cc-lens"
          :class="{ on: l.filter && activeStatus === l.filter, stat: !l.filter }" :data-tone="l.tone"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="l.filter ? { y: -3 } : {}" :whileTap="l.filter ? { scale: 0.97 } : {}"
          :title="l.hint" @click="l.filter && $emit('pick', l.filter)">
          <span class="cc-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="cc-lens-val"><AssetCountUp :value="l.value" :start="lensesIn" :duration="1.0 + i * 0.07" :suffix="l.suffix || ''" /></span>
          <span class="cc-lens-lab">{{ l.label }}</span>
        </Motion>
      </div>
    </div>

    <!-- ════ Classification spectrum ════ -->
    <div class="cc-spectrum-wrap" ref="specEl">
      <div class="cc-spec-head">
        <span class="cc-spec-tag"><Layers :size="13" /> Fleet composition</span>
        <span class="cc-spec-meta">{{ classified }} classified · {{ unclassified }} unclassified</span>
      </div>
      <div class="cc-spectrum" :class="{ empty: !totalFleet }">
        <Motion v-for="(s, i) in segments" :key="s.id" as="button" type="button" class="cc-seg"
          :style="{ '--w': pct(s.count) + '%', '--sc': s.color }" :data-empty="!s.count"
          :initial="reduced ? false : { scaleX: 0 }" :animate="{ scaleX: 1 }"
          :transition="{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
          :title="`${s.name} · ${s.count} assets`" @click="$emit('focus', s.id)">
          <span class="cc-seg-fill" />
          <span v-if="!reduced" class="cc-seg-sheen" />
        </Motion>
        <Motion v-if="unclassified > 0" as="div" class="cc-seg unclassified" :style="{ '--w': pct(unclassified) + '%' }"
          :initial="reduced ? false : { scaleX: 0 }" :animate="{ scaleX: 1 }"
          :transition="{ duration: 0.7, delay: 0.1 + segments.length * 0.05, ease: [0.16, 1, 0.3, 1] }"
          :title="`Unclassified · ${unclassified} assets`">
          <span class="cc-seg-fill" />
        </Motion>
        <span v-if="!totalFleet" class="cc-spec-idle">no assets to classify yet</span>
      </div>
      <div class="cc-legend">
        <button v-for="s in legendTop" :key="s.id" type="button" class="cc-leg" :style="{ '--sc': s.color }" @click="$emit('focus', s.id)">
          <i /><b>{{ s.name }}</b><span>{{ s.count }}</span>
        </button>
        <span v-if="segments.length > legendTop.length" class="cc-leg more">+{{ segments.length - legendTop.length }} more</span>
        <span v-if="unclassified > 0" class="cc-leg unclassified"><i /><b>Unclassified</b><span>{{ unclassified }}</span></span>
      </div>
    </div>

    <!-- coverage ring (floating, top-right of spectrum block) -->
    <div class="cc-coverage">
      <span class="cc-cov-ring" :style="{ '--p': coverageDeg }">
        <span class="cc-cov-core"><b><AssetCountUp :value="coverage" :start="lensesIn" :duration="1.4" suffix="%" /></b><small>classified</small></span>
      </span>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { FolderTree, Plus, Boxes, Network, Layers, SquareStack, Sigma, CircleDashed } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({ total: 0, active: 0, inactive: 0 }) },
  segments: { type: Array, default: () => [] },   // [{ id, name, count, color }] sorted desc
  classified: { type: Number, default: 0 },
  unclassified: { type: Number, default: 0 },
  avgLife: { type: Number, default: 0 },
  activeStatus: { type: String, default: '' },     // '' | 'active' | 'inactive'
})
defineEmits(['pick', 'new', 'go', 'focus'])

const root = ref(null)
const lensesEl = ref(null)
const specEl = ref(null)
const reduced = prefersReduced()
const { visible: lensesIn } = useInView(lensesEl, { threshold: 0.2 })

const c = computed(() => props.counts || {})
const totalFleet = computed(() => props.classified + props.unclassified)
const pct = (n) => totalFleet.value ? (n / totalFleet.value) * 100 : 0
const coverage = computed(() => totalFleet.value ? Math.round((props.classified / totalFleet.value) * 100) : 0)
const coverageDeg = computed(() => `${coverage.value * 3.6}deg`)
const legendTop = computed(() => props.segments.slice(0, 6))

const lenses = computed(() => [
  { key: 'tot', filter: '', label: 'Categories', value: c.value.total || 0, tone: 'amber', icon: FolderTree, hint: 'Total categories' },
  { key: 'act', filter: 'active', label: 'Active', value: c.value.active || 0, tone: 'green', icon: SquareStack, hint: 'Filter to active categories' },
  { key: 'ina', filter: 'inactive', label: 'Inactive', value: c.value.inactive || 0, tone: 'steel', icon: CircleDashed, hint: 'Filter to inactive categories' },
  { key: 'cls', filter: '', label: 'Classified', value: props.classified, tone: 'ember', icon: Boxes, hint: 'Assets assigned to a category' },
  { key: 'life', filter: '', label: 'Avg life (mo)', value: props.avgLife, tone: 'steel', icon: Sigma, hint: 'Average useful life across categories' },
])
</script>

<style scoped>
.cc { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.cc-aura { position: absolute; inset: -45% -15% auto -15%; height: 85%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.cc-orbit { position: absolute; top: -60px; right: -50px; pointer-events: none; z-index: 0; color: var(--as-amber); opacity: 0.08; animation: cc-rotate 80s linear infinite; }
[data-theme="light"] .cc-orbit { opacity: 0.1; }

.cc-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.cc-lead { max-width: 460px; min-width: 270px; flex: 1; }
.cc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.cc-title { margin: 14px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1.04; }
.cc-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cc-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 440px; }
.cc-cta { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }

.cc-lenses { display: grid; grid-template-columns: repeat(5, minmax(72px, 1fr)); gap: 9px; min-width: 0; }
.cc-lens { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px 12px 11px; border-radius: 15px; text-align: left; cursor: pointer;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s; overflow: hidden; }
.cc-lens.stat { cursor: default; }
.cc-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85; background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.cc-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.cc-lens.on { border-color: color-mix(in srgb, var(--lc) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--lc) 30%, transparent), var(--as-card-shadow-hover); }
.cc-lens[data-tone="amber"] { --lc: var(--as-amber); }
.cc-lens[data-tone="green"] { --lc: var(--as-st-available); }
.cc-lens[data-tone="steel"] { --lc: var(--as-steel); }
.cc-lens[data-tone="ember"] { --lc: var(--as-ember); }
.cc-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.cc-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.cc-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }

/* ════ spectrum ════ */
.cc-spectrum-wrap { position: relative; z-index: 1; margin-top: 24px; padding: 16px 18px; padding-right: 130px; border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-surface-elevated) 70%, transparent), var(--as-surface)); border: 1px solid var(--as-border-soft); }
.cc-spec-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.cc-spec-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-secondary); }
.cc-spec-tag :deep(svg) { color: var(--as-amber); }
.cc-spec-meta { font-size: 11.5px; font-weight: 700; color: var(--as-text-muted); font-variant-numeric: tabular-nums; }
.cc-spectrum { position: relative; display: flex; gap: 3px; height: 30px; border-radius: 9px; overflow: hidden; }
.cc-spectrum.empty { background: var(--as-surface); }
.cc-seg { position: relative; width: var(--w, 0%); min-width: 0; height: 100%; border: 0; padding: 0; cursor: pointer; transform-origin: left center; background: none; border-radius: 5px; overflow: hidden; }
.cc-seg[data-empty="true"] { display: none; }
.cc-seg-fill { position: absolute; inset: 0; background: color-mix(in srgb, var(--sc, var(--as-amber)) 78%, transparent); transition: filter 0.2s, transform 0.2s; }
.cc-seg:hover .cc-seg-fill { filter: brightness(1.18); }
.cc-seg-sheen { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); background-size: 250% 100%; animation: as-sheen 3.6s ease infinite; }
.cc-seg.unclassified .cc-seg-fill { background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--as-steel-dim) 22%, transparent) 0 6px, transparent 6px 12px); }
.cc-spec-idle { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11.5px; letter-spacing: 0.04em; color: var(--as-text-dim); }

.cc-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.cc-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; cursor: pointer; padding: 4px 9px; border-radius: 8px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-secondary); transition: border-color 0.2s, transform 0.2s; }
.cc-leg:hover { border-color: var(--as-border-strong); transform: translateY(-1px); }
.cc-leg i { width: 9px; height: 9px; border-radius: 3px; background: var(--sc, var(--as-amber)); flex-shrink: 0; }
.cc-leg b { font-weight: 700; color: var(--as-text); }
.cc-leg span { color: var(--as-text-muted); font-variant-numeric: tabular-nums; }
.cc-leg.more { color: var(--as-text-dim); cursor: default; }
.cc-leg.unclassified i { background: var(--as-steel-dim); }

/* coverage ring */
.cc-coverage { position: absolute; right: 30px; bottom: 24px; z-index: 2; }
.cc-cov-ring { position: relative; display: grid; place-items: center; width: 92px; height: 92px; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--as-amber) var(--p, 0deg), color-mix(in srgb, var(--as-steel-dim) 22%, transparent) 0); transition: --p 1s var(--as-ease); }
.cc-cov-ring::before { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); }
.cc-cov-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.cc-cov-core b { font-size: 18px; font-weight: 850; color: var(--as-text); }
.cc-cov-core small { font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 2px; }

@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes cc-rotate { to { transform: rotate(360deg); } }

@media (max-width: 1080px) { .cc-lenses { grid-template-columns: repeat(5, 1fr); width: 100%; } }
@media (max-width: 760px) {
  .cc-lenses { grid-template-columns: repeat(3, 1fr); }
  .cc-spectrum-wrap { padding-right: 18px; }
  .cc-coverage { position: static; margin-top: 14px; display: flex; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .cc-orbit, .cc-seg-sheen { animation: none; } }
</style>
