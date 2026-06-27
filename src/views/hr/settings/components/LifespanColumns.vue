<template>
  <div ref="root" class="lc" :class="{ empty: !hasAssets }">
    <span class="lc-grain" aria-hidden="true" />
    <span class="lc-aura" aria-hidden="true" />
    <span class="lc-sweep" aria-hidden="true" />
    <i v-for="m in motes" :key="'m' + m.i" class="lc-mote" :style="m.style" aria-hidden="true" />

    <header class="lc-head">
      <div class="lc-title">
        <span class="lc-title-ic"><Hourglass :size="14" /></span>
        <div class="lc-title-tx">
          <b>The Lifespan Cellar</b>
          <span>Asset classes, metered by their depreciation clock</span>
        </div>
      </div>

      <!-- live readout: hovered class, else aggregate -->
      <div class="lc-readout" :data-hot="!!hovered">
        <template v-if="hoveredCol">
          <span class="lc-ro-swatch" :style="{ background: hoveredCol.hue }" />
          <div class="lc-ro-body">
            <b>{{ hoveredCol.cat.name }}</b>
            <span>
              <em class="set-mono">{{ hoveredCol.count }}</em> asset{{ hoveredCol.count === 1 ? '' : 's' }}
              · {{ hoveredCol.permanent ? 'permanent' : hoveredCol.lifeLabel }}
              <i v-if="!hoveredCol.active" class="lc-ro-off">· inactive</i>
            </span>
          </div>
        </template>
        <template v-else>
          <span class="lc-ro-swatch agg" />
          <div class="lc-ro-body">
            <b><SetCountUp :value="totalAssets" /> classified</b>
            <span><em class="set-mono">{{ cols.length }}</em> class{{ cols.length === 1 ? '' : 'es' }} · hover a column</span>
          </div>
        </template>
      </div>
    </header>

    <div class="lc-core">
      <!-- population depth rail -->
      <div class="lc-rail" aria-hidden="true">
        <span v-for="t in railTicks" :key="t" class="lc-rail-tick" :style="{ bottom: t + '%' }">
          <em>{{ Math.round((t / 100) * maxCount) }}</em>
        </span>
        <span class="lc-rail-cap">assets</span>
      </div>

      <!-- the cellar floor of glass columns -->
      <div class="lc-floor">
        <button v-for="(c, i) in cols" :key="c.cat.id" type="button" class="lc-col"
          :class="{ off: !c.active, perm: c.permanent, hot: hovered === c.cat.id }"
          :style="{ '--hue': c.hue, '--fill': c.fill, '--cad': c.cad + 's', '--i': i }"
          @mouseenter="hovered = c.cat.id" @mouseleave="hovered = null"
          @click="$emit('select', c.cat)" :title="`${c.cat.name} · ${c.count} assets · ${c.permanent ? 'permanent' : c.lifeLabel}`">
          <span class="lc-cap" aria-hidden="true">
            <span v-if="c.permanent" class="lc-cap-inf"><Infinity :size="11" /></span>
          </span>
          <span class="lc-cyl" aria-hidden="true">
            <span class="lc-cyl-glass" />
            <span v-if="!c.permanent && c.active" class="lc-stream" />
            <span class="lc-fluid">
              <span class="lc-fluid-sheen" />
              <span class="lc-meniscus" />
              <span v-if="!c.permanent && c.active" class="lc-splash" />
            </span>
            <span class="lc-cyl-glare" />
          </span>
          <span class="lc-base" aria-hidden="true" />
          <span class="lc-foot">
            <b class="set-mono"><SetCountUp :value="c.count" /></b>
            <em>{{ c.cat.code }}</em>
            <i class="lc-life" :class="{ perm: c.permanent }">{{ c.permanent ? '∞' : c.lifeShort }}</i>
          </span>
        </button>

        <div v-if="overflow > 0" class="lc-more">
          <Boxes :size="16" />
          <b>+{{ overflow }}</b>
          <span>more classes below</span>
        </div>
      </div>
    </div>

    <footer class="lc-legend">
      <span class="lc-leg"><i class="d fast" /> fast clock · short life</span>
      <span class="lc-leg"><i class="d slow" /> slow clock · long life</span>
      <span class="lc-leg"><i class="d perm" /> permanent · no depreciation</span>
      <span class="lc-leg"><i class="d off" /> inactive</span>
      <span v-if="!hasAssets" class="lc-leg note">No assets filed yet — columns idle until the fleet fills.</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Hourglass, Infinity, Boxes } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  maxColumns: { type: Number, default: 12 },
})
defineEmits(['select'])

const root = ref(null)
usePointerSpotlight(root)
const hovered = ref(null)

const RAMP = ['#fbbf24', '#f59e0b', '#fb923c', '#d97706', '#ea580c', '#b45309']
const PERM = '#34d399'

const countOf = (c) => Number(c.asset_count || 0)
const isPermanent = (c) => c.depreciation_method === 'NONE' || (!c.depreciation_method && !c.useful_life_months)
const totalAssets = computed(() => props.categories.reduce((a, c) => a + countOf(c), 0))
const hasAssets = computed(() => totalAssets.value > 0)
const maxCount = computed(() => Math.max(1, ...props.categories.map(countOf)))

// Depreciation cadence: short useful-life → fast metering stream (1.3s),
// long life → slow (7s). Permanent classes don't meter at all.
const cadenceOf = (c) => {
  const life = Number(c.useful_life_months || 0)
  if (!life) return 4
  return Math.min(7, Math.max(1.3, life / 9))
}
const lifeShortOf = (c) => {
  const m = Number(c.useful_life_months || 0)
  if (!m) return '—'
  return m % 12 === 0 ? `${m / 12}y` : `${m}m`
}
const lifeLabelOf = (c) => {
  const m = Number(c.useful_life_months || 0)
  if (!m) return 'no life set'
  return `${m} mo useful life`
}

const cols = computed(() => {
  const list = props.categories.map((cat) => {
    const count = countOf(cat)
    const active = cat.is_active !== false
    const permanent = isPermanent(cat)
    return { cat, count, active, permanent,
      lifeShort: lifeShortOf(cat), lifeLabel: lifeLabelOf(cat), cad: cadenceOf(cat) }
  })
  // active classes sink to the floor (biggest first); inactive float to the right
  list.sort((a, b) => (a.active === b.active ? b.count - a.count : a.active ? -1 : 1))
  const shown = list.slice(0, props.maxColumns)
  return shown.map((c, i) => ({
    ...c,
    hue: c.permanent ? PERM : RAMP[i % RAMP.length],
    // fluid fill = population share with a visible floor so empty classes still read
    fill: Math.round(Math.max(hasAssets.value ? 9 : 18, (c.count / maxCount.value) * 100)),
  }))
})
const overflow = computed(() => Math.max(0, props.categories.length - props.maxColumns))
const hoveredCol = computed(() => cols.value.find((c) => c.cat.id === hovered.value) || null)

const railTicks = [0, 25, 50, 75, 100]

// data-independent drifting motes (never an empty stage)
const motes = computed(() => {
  if (prefersReduced()) return []
  return Array.from({ length: 14 }, (_, i) => {
    const s = (i * 9301 + 49297) % 233280 / 233280
    const s2 = ((i + 7) * 9301 + 49297) % 233280 / 233280
    return { i, style: {
      left: (6 + s * 88).toFixed(1) + '%',
      bottom: (4 + s2 * 70).toFixed(1) + '%',
      '--dur': (9 + s * 8).toFixed(1) + 's',
      '--dly': (-s2 * 9).toFixed(1) + 's',
      '--dx': (s2 * 16 - 8).toFixed(1) + 'px',
    } }
  })
})
</script>

<style scoped>
.lc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 16px 18px;
  border-radius: 18px; border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); min-height: 392px;
  background:
    radial-gradient(135% 90% at 12% -10%, color-mix(in srgb, var(--set-ember) 13%, transparent), transparent 58%),
    linear-gradient(180deg, var(--set-surface-glass), var(--set-panel)); }
.lc-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 26px 26px;
  transform: translate(calc((var(--mx, .5) - .5) * -10px), calc((var(--my, .5) - .5) * -10px));
  mask-image: radial-gradient(120% 120% at 0% 100%, #000 12%, transparent 74%);
  -webkit-mask-image: radial-gradient(120% 120% at 0% 100%, #000 12%, transparent 74%); }
.lc-aura { position: absolute; inset: auto -10% -45% 5%; height: 80%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 16%, transparent), transparent 70%); filter: blur(44px); }
.lc-sweep { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.5;
  background: linear-gradient(100deg, transparent 38%, color-mix(in srgb, var(--set-gold-bright) 12%, transparent) 50%, transparent 62%);
  background-size: 260% 100%; animation: lc-sweep 9s ease-in-out infinite; }
.lc-mote { position: absolute; z-index: 1; width: 3px; height: 3px; border-radius: 50%; pointer-events: none;
  background: var(--set-gold); box-shadow: 0 0 6px var(--set-gold);
  animation: lc-mote var(--dur, 11s) linear var(--dly, 0s) infinite; opacity: 0; }

.lc-head { position: relative; z-index: 3; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.lc-title { display: flex; align-items: center; gap: 10px; }
.lc-title-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-ember);
  background: color-mix(in srgb, var(--set-ember) 14%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 30%, transparent); }
.lc-title-tx { display: flex; flex-direction: column; line-height: 1.3; }
.lc-title-tx b { font-size: 14px; font-weight: 850; color: var(--set-text); }
.lc-title-tx span { font-size: 10.5px; color: var(--set-text-muted); }

.lc-readout { display: flex; align-items: center; gap: 10px; padding: 7px 13px 7px 9px; border-radius: 12px; min-width: 188px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: border-color 0.25s, box-shadow 0.25s; }
.lc-readout[data-hot="true"] { border-color: var(--set-border-warm); box-shadow: 0 0 22px -12px var(--set-gold); }
.lc-ro-swatch { width: 12px; height: 24px; border-radius: 5px; flex-shrink: 0; box-shadow: 0 0 12px -2px currentColor; }
.lc-ro-swatch.agg { background: var(--set-grad-hero); }
.lc-ro-body { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.lc-ro-body b { font-size: 13px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lc-ro-body span { font-size: 10px; color: var(--set-text-muted); }
.lc-ro-body em { font-style: normal; color: var(--set-text-secondary); font-weight: 700; }
.lc-ro-off { color: var(--set-unset); font-style: normal; }

/* ── cellar core ── */
.lc-core { position: relative; z-index: 2; display: flex; gap: 8px; flex: 1; min-height: 250px; }
.lc-rail { position: relative; width: 30px; flex-shrink: 0; }
.lc-rail-tick { position: absolute; right: 0; transform: translateY(50%); display: flex; align-items: center; gap: 4px; }
.lc-rail-tick::after { content: ''; width: 5px; height: 1px; background: var(--set-border-strong); }
.lc-rail-tick em { font-style: normal; font-size: 8px; font-family: var(--set-mono); color: var(--set-text-dim); }
.lc-rail-cap { position: absolute; left: -2px; top: -2px; font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--set-text-dim); writing-mode: vertical-rl; }

.lc-floor { position: relative; flex: 1; min-width: 0; display: flex; align-items: flex-end; gap: 10px;
  padding: 0 4px 0 6px; border-bottom: 1px solid var(--set-border-strong); }
.lc-floor::before { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 14px; pointer-events: none;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--set-gold) 10%, transparent)); }

.lc-col { position: relative; flex: 1 1 0; min-width: 26px; max-width: 78px; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: flex-end; gap: 0; padding: 0; border: 0; background: transparent; cursor: pointer; font: inherit;
  animation: lc-rise 0.7s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.lc-cap { position: relative; width: 60%; height: 7px; border-radius: 4px 4px 0 0; flex-shrink: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--hue) 60%, transparent), transparent);
  border: 1px solid color-mix(in srgb, var(--hue) 36%, transparent); border-bottom: 0; }
.lc-cap-inf { position: absolute; left: 50%; top: -16px; transform: translateX(-50%); display: grid; place-items: center;
  width: 18px; height: 18px; border-radius: 50%; color: var(--set-ok); background: var(--set-ok-soft);
  border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); }

.lc-cyl { position: relative; width: 100%; flex: 1; min-height: 0; border-radius: 7px 7px 4px 4px; overflow: hidden;
  border: 1px solid var(--set-border-strong); border-top: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01) 40%, rgba(0,0,0,0.12)); }
.lc-cyl-glass { position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent 0, transparent 23px, color-mix(in srgb, var(--set-border-strong) 60%, transparent) 23px, transparent 24px); opacity: 0.5; }
.lc-cyl-glare { position: absolute; left: 14%; top: 0; bottom: 0; width: 22%; pointer-events: none;
  background: linear-gradient(90deg, rgba(255,255,255,0.16), transparent); opacity: 0.5; }

.lc-fluid { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--fill, 30) * 1%);
  background: linear-gradient(180deg, color-mix(in srgb, var(--hue) 78%, transparent), color-mix(in srgb, var(--hue) 42%, #1a1206 30%));
  box-shadow: inset 0 2px 10px -3px color-mix(in srgb, var(--hue) 70%, transparent);
  transition: height 1s var(--set-spring); }
.lc-fluid-sheen { position: absolute; inset: 0; opacity: 0.5;
  background: linear-gradient(100deg, transparent 35%, color-mix(in srgb, var(--hue) 55%, white 18%) 50%, transparent 65%);
  background-size: 220% 100%; animation: lc-sheen 4.5s ease infinite; }
.lc-meniscus { position: absolute; left: -6%; right: -6%; top: -3px; height: 6px; border-radius: 50%;
  background: color-mix(in srgb, var(--hue) 70%, white 20%); filter: blur(0.4px);
  box-shadow: 0 0 10px -1px var(--hue); animation: lc-ripple 3.4s ease-in-out infinite; }
.lc-stream { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 2px; height: calc((100 - var(--fill, 30)) * 1%);
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--hue) 75%, transparent));
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 30%); mask-image: linear-gradient(180deg, transparent, #000 30%); overflow: hidden; }
.lc-stream::after { content: ''; position: absolute; left: -1px; right: -1px; top: -40%; height: 40%;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--hue) 90%, white 30%), transparent);
  animation: lc-meter var(--cad, 4s) linear infinite; }
.lc-splash { position: absolute; left: 50%; top: -2px; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--hue) 80%, white 10%); opacity: 0; animation: lc-splash var(--cad, 4s) ease-out infinite; }

.lc-col.perm .lc-cyl { border-color: color-mix(in srgb, var(--set-ok) 26%, var(--set-border-strong)); }
.lc-col.perm .lc-fluid { background: linear-gradient(180deg, color-mix(in srgb, var(--set-ok) 40%, transparent), color-mix(in srgb, var(--set-ok) 18%, transparent));
  box-shadow: inset 0 2px 10px -3px color-mix(in srgb, var(--set-ok) 50%, transparent); }
.lc-col.perm .lc-cyl::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--set-ok) 14%, transparent) 0 5px, transparent 5px 10px); }

.lc-col.off { filter: grayscale(0.65) brightness(0.84); opacity: 0.72; }
.lc-col.off .lc-fluid { background: linear-gradient(180deg, color-mix(in srgb, var(--set-unset) 42%, transparent), color-mix(in srgb, var(--set-unset) 20%, transparent)); box-shadow: none; }
.lc-col.off .lc-cap { border-color: var(--set-border); background: var(--set-unset-soft); }

.lc-col:hover, .lc-col.hot { transform: translateY(-4px); z-index: 5; }
.lc-col:hover .lc-cyl, .lc-col.hot .lc-cyl { border-color: color-mix(in srgb, var(--hue) 55%, transparent);
  box-shadow: 0 0 22px -6px color-mix(in srgb, var(--hue) 65%, transparent); }

.lc-base { width: 84%; height: 5px; border-radius: 0 0 5px 5px; flex-shrink: 0; margin-top: 1px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--hue) 40%, transparent), transparent);
  border: 1px solid color-mix(in srgb, var(--hue) 24%, transparent); border-top: 0; }
.lc-foot { display: flex; flex-direction: column; align-items: center; gap: 1px; padding-top: 6px; min-width: 0; width: 100%; }
.lc-foot b { font-size: 13px; font-weight: 850; color: var(--set-text); line-height: 1; }
.lc-foot em { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--set-text-muted);
  max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lc-foot .lc-life { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.04em; padding: 1px 6px; border-radius: 999px; margin-top: 2px;
  color: var(--hue); background: color-mix(in srgb, var(--hue) 14%, transparent); }
.lc-foot .lc-life.perm { color: var(--set-ok); background: var(--set-ok-soft); }

.lc-more { align-self: flex-end; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 4px 26px; color: var(--set-text-dim); }
.lc-more :deep(svg) { color: var(--set-text-muted); }
.lc-more b { font-size: 14px; font-weight: 850; color: var(--set-text-secondary); }
.lc-more span { font-size: 8.5px; text-align: center; max-width: 9ch; line-height: 1.2; }

.lc-legend { position: relative; z-index: 2; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.lc-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--set-text-dim); }
.lc-leg .d { width: 9px; height: 9px; border-radius: 3px; }
.lc-leg .d.fast { background: var(--set-gold); }
.lc-leg .d.slow { background: var(--set-rust); }
.lc-leg .d.perm { background: var(--set-ok); }
.lc-leg .d.off { background: var(--set-unset); }
.lc-leg.note { margin-left: auto; color: var(--set-text-muted); font-weight: 600; }

@keyframes lc-rise { from { opacity: 0; transform: translateY(26px) scaleY(0.6); transform-origin: bottom; } to { opacity: 1; transform: none; } }
@keyframes lc-sweep { 0%, 100% { background-position: 200% 0; } 50% { background-position: -80% 0; } }
@keyframes lc-sheen { 0% { background-position: 220% 0; } 100% { background-position: -120% 0; } }
@keyframes lc-ripple { 0%, 100% { transform: scaleX(1); opacity: 0.85; } 50% { transform: scaleX(0.92); opacity: 1; } }
@keyframes lc-meter { 0% { top: -40%; } 100% { top: 100%; } }
@keyframes lc-splash { 0%, 70% { transform: translateX(-50%) scale(0.4); opacity: 0; } 78% { opacity: 0.8; } 100% { transform: translateX(-50%) scale(1.8); opacity: 0; } }
@keyframes lc-mote { 0% { transform: translate(0, 0); opacity: 0; } 18% { opacity: 0.7; } 82% { opacity: 0.6; } 100% { transform: translate(var(--dx, 8px), -54px); opacity: 0; } }

/* ── light theme: deeper fluid + dark grain (no pale stops) ── */
[data-theme="light"] .lc-cyl { background: linear-gradient(90deg, rgba(40,25,10,0.04), rgba(40,25,10,0.02) 40%, rgba(40,25,10,0.08)); }
[data-theme="light"] .lc-cyl-glare { background: linear-gradient(90deg, rgba(255,255,255,0.45), transparent); }
[data-theme="light"] .lc-fluid { background: linear-gradient(180deg, color-mix(in srgb, var(--hue) 82%, transparent), color-mix(in srgb, var(--hue) 50%, white 6%)); }
[data-theme="light"] .lc-meniscus { background: color-mix(in srgb, var(--hue) 80%, white 8%); }

@media (prefers-reduced-motion: reduce) {
  .lc-sweep, .lc-fluid-sheen, .lc-meniscus, .lc-stream::after, .lc-splash, .lc-col { animation: none; }
  .lc-fluid { transition: none; }
}
</style>
