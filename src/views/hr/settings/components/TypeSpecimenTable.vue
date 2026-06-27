<template>
  <div ref="root" class="tst">
    <span class="tst-grain" aria-hidden="true" />
    <span class="tst-aura" aria-hidden="true" />
    <span class="tst-scan" aria-hidden="true" />
    <i v-for="m in motes" :key="'m' + m.i" class="tst-mote" :style="m.style" aria-hidden="true" />

    <header class="tst-head">
      <div class="tst-title">
        <span class="tst-title-ic"><Shapes :size="14" /></span>
        <div class="tst-title-tx">
          <b>The Specimen Table</b>
          <span>Every kind of asset your fleet can hold</span>
        </div>
      </div>
      <div class="tst-readout" :data-hot="!!hovered">
        <template v-if="hoveredTile">
          <span class="tst-ro-ic" :data-custom="!hoveredTile.is_system"><component :is="hoveredTile.iconComp" :size="16" /></span>
          <div class="tst-ro-body">
            <b>{{ hoveredTile.label }}</b>
            <span><em class="set-mono">{{ hoveredTile.asset_count || 0 }}</em> asset{{ (hoveredTile.asset_count || 0) === 1 ? '' : 's' }} · {{ hoveredTile.is_system ? 'built-in' : 'custom' }}<i v-if="!hoveredTile.is_active" class="tst-ro-off"> · inactive</i></span>
          </div>
        </template>
        <template v-else>
          <span class="tst-ro-ic agg"><Boxes :size="16" /></span>
          <div class="tst-ro-body">
            <b><SetCountUp :value="total" /> kinds</b>
            <span><em class="set-mono">{{ classified }}</em> assets classified · hover a tile</span>
          </div>
        </template>
      </div>
    </header>

    <div class="tst-grid">
      <button v-for="(t, i) in tiles" :key="t.id" type="button" class="tst-tile"
        :class="{ custom: !t.is_system, off: !t.is_active, hot: hovered === t.id }" :style="{ '--i': i }"
        @mouseenter="hovered = t.id" @mouseleave="hovered = null" @click="$emit('select', t)"
        :title="`${t.label} · ${t.asset_count || 0} assets`">
        <span class="tst-glare" aria-hidden="true" />
        <span class="tst-idx set-mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="tst-flag" :data-custom="!t.is_system">
          <Sparkles v-if="!t.is_system" :size="9" /><Lock v-else :size="9" />
        </span>
        <span class="tst-ic"><component :is="t.iconComp" :size="22" /></span>
        <span class="tst-sym set-mono">{{ t.sym }}</span>
        <span class="tst-label">{{ t.label }}</span>
        <span class="tst-meter"><i :style="{ width: t.share + '%' }" /></span>
        <span class="tst-count set-mono"><SetCountUp :value="t.asset_count || 0" /></span>
      </button>
    </div>

    <footer class="tst-legend">
      <span class="tst-leg"><i class="d sys" /> built-in</span>
      <span class="tst-leg"><i class="d cust" /> custom</span>
      <span class="tst-leg"><i class="d off" /> inactive</span>
      <span class="tst-leg note">Bar = share of classified fleet · click a tile to edit</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Shapes, Boxes, Sparkles, Lock } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { iconForTypeName } from '@/composables/useAssets'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ types: { type: Array, default: () => [] } })
defineEmits(['select'])

const root = ref(null)
usePointerSpotlight(root)
const hovered = ref(null)

const symOf = (code) => String(code || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '—'
const total = computed(() => props.types.length)
const classified = computed(() => props.types.reduce((a, t) => a + Number(t.asset_count || 0), 0))
const maxCount = computed(() => Math.max(1, ...props.types.map(t => Number(t.asset_count || 0))))

const tiles = computed(() => props.types.map(t => ({
  ...t,
  iconComp: iconForTypeName(t.icon),
  sym: symOf(t.code),
  share: Math.round((Number(t.asset_count || 0) / maxCount.value) * 100),
})))
const hoveredTile = computed(() => tiles.value.find(t => t.id === hovered.value) || null)

const motes = computed(() => {
  if (prefersReduced()) return []
  return Array.from({ length: 16 }, (_, i) => {
    const s = (i * 9301 + 49297) % 233280 / 233280
    const s2 = ((i + 5) * 9301 + 49297) % 233280 / 233280
    return { i, style: {
      left: (5 + s * 90).toFixed(1) + '%', top: (8 + s2 * 80).toFixed(1) + '%',
      '--dur': (10 + s * 9).toFixed(1) + 's', '--dly': (-s2 * 10).toFixed(1) + 's',
      '--dx': (s2 * 18 - 9).toFixed(1) + 'px',
    } }
  })
})
</script>

<style scoped>
.tst { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 16px 18px;
  border-radius: 18px; border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); min-height: 372px;
  background: radial-gradient(135% 90% at 88% -10%, color-mix(in srgb, var(--set-deep) 12%, transparent), transparent 58%),
    linear-gradient(180deg, var(--set-surface-glass), var(--set-panel)); }
.tst-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 30px 30px; transform: translate(calc((var(--mx,.5) - .5) * -10px), calc((var(--my,.5) - .5) * -10px));
  mask-image: radial-gradient(120% 120% at 100% 0%, #000 12%, transparent 74%); -webkit-mask-image: radial-gradient(120% 120% at 100% 0%, #000 12%, transparent 74%); }
.tst-aura { position: absolute; inset: -40% -10% auto auto; width: 60%; height: 70%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-orange) 16%, transparent), transparent 70%); filter: blur(46px); }
.tst-scan { position: absolute; top: -30%; left: -30%; width: 40%; height: 160%; z-index: 1; pointer-events: none; opacity: 0.5;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold-bright) 16%, transparent), transparent);
  transform: rotate(18deg); animation: tst-scan 8s ease-in-out infinite; }
.tst-mote { position: absolute; z-index: 1; width: 3px; height: 3px; border-radius: 50%; pointer-events: none;
  background: var(--set-gold); box-shadow: 0 0 6px var(--set-gold); animation: tst-mote var(--dur,12s) linear var(--dly,0s) infinite; opacity: 0; }

.tst-head { position: relative; z-index: 3; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.tst-title { display: flex; align-items: center; gap: 10px; }
.tst-title-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--set-deep);
  background: color-mix(in srgb, var(--set-deep) 14%, transparent); border: 1px solid color-mix(in srgb, var(--set-deep) 30%, transparent); }
.tst-title-tx { display: flex; flex-direction: column; line-height: 1.3; }
.tst-title-tx b { font-size: 14px; font-weight: 850; color: var(--set-text); }
.tst-title-tx span { font-size: 10.5px; color: var(--set-text-muted); }
.tst-readout { display: flex; align-items: center; gap: 10px; padding: 7px 13px 7px 8px; border-radius: 12px; min-width: 196px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: border-color 0.25s, box-shadow 0.25s; }
.tst-readout[data-hot="true"] { border-color: var(--set-border-warm); box-shadow: 0 0 22px -12px var(--set-gold); }
.tst-ro-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--set-steel, var(--set-text-secondary));
  background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.tst-ro-ic.agg, .tst-ro-ic[data-custom="true"] { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 14%, transparent); border-color: color-mix(in srgb, var(--set-deep) 30%, transparent); }
.tst-ro-body { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.tst-ro-body b { font-size: 13px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tst-ro-body span { font-size: 10px; color: var(--set-text-muted); }
.tst-ro-body em { font-style: normal; color: var(--set-text-secondary); font-weight: 700; }
.tst-ro-off { color: var(--set-unset); font-style: normal; }

.tst-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fill, minmax(94px, 1fr)); gap: 9px; }
.tst-tile { position: relative; overflow: hidden; aspect-ratio: 1 / 1.08; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: 8px 6px 6px; border-radius: 13px; cursor: pointer; font: inherit; text-align: center;
  background: var(--set-surface); border: 1px solid var(--set-border-strong);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.035s);
  transition: transform 0.28s var(--set-spring), border-color 0.28s, box-shadow 0.28s, filter 0.28s; }
.tst-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(180px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--set-gold) 22%, transparent), transparent 60%); }
.tst-tile.custom { border-color: color-mix(in srgb, var(--set-deep) 30%, transparent); background: color-mix(in srgb, var(--set-deep) 7%, var(--set-surface)); }
.tst-tile:hover, .tst-tile.hot { transform: translateY(-4px) scale(1.03); z-index: 4; border-color: color-mix(in srgb, var(--set-gold) 50%, transparent);
  box-shadow: 0 16px 34px -18px color-mix(in srgb, var(--set-gold) 60%, transparent); }
.tst-tile.off { filter: grayscale(0.6) brightness(0.84); opacity: 0.7; }
.tst-tile.off::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--set-unset) 14%, transparent) 0 5px, transparent 5px 10px); }

.tst-idx { position: absolute; top: 6px; left: 8px; font-size: 8px; font-weight: 700; color: var(--set-text-dim); }
.tst-flag { position: absolute; top: 5px; right: 6px; display: grid; place-items: center; width: 15px; height: 15px; border-radius: 5px; color: var(--set-text-dim); }
.tst-flag[data-custom="true"] { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 14%, transparent); }
.tst-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--set-gold); margin-top: 4px;
  background: color-mix(in srgb, var(--set-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); }
.tst-tile.custom .tst-ic { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 14%, transparent); border-color: color-mix(in srgb, var(--set-deep) 30%, transparent); }
.tst-sym { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: var(--set-text-secondary); margin-top: 4px; }
.tst-label { font-size: 9.5px; font-weight: 600; color: var(--set-text-muted); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tst-meter { width: 64%; height: 3px; border-radius: 2px; background: var(--set-border); overflow: hidden; margin-top: 5px; }
.tst-meter i { display: block; height: 100%; border-radius: 2px; background: var(--set-grad-hero); transition: width 0.9s var(--set-spring); }
.tst-count { position: absolute; bottom: 5px; right: 8px; font-size: 9px; font-weight: 800; color: var(--set-text-secondary); }

.tst-legend { position: relative; z-index: 2; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.tst-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; color: var(--set-text-dim); }
.tst-leg .d { width: 9px; height: 9px; border-radius: 3px; }
.tst-leg .d.sys { background: var(--set-gold); }
.tst-leg .d.cust { background: var(--set-deep); }
.tst-leg .d.off { background: var(--set-unset); }
.tst-leg.note { margin-left: auto; color: var(--set-text-muted); font-weight: 600; }

@keyframes tst-scan { 0%, 100% { left: -34%; opacity: 0; } 12% { opacity: 0.5; } 50% { left: 96%; opacity: 0.35; } 88% { opacity: 0; } }
@keyframes tst-mote { 0% { transform: translate(0,0); opacity: 0; } 18% { opacity: 0.7; } 82% { opacity: 0.6; } 100% { transform: translate(var(--dx,8px), -52px); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .tst-scan, .tst-mote, .tst-tile { animation: none; }
  .tst-meter i { transition: none; }
}
</style>
