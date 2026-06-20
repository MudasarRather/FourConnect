<template>
  <div class="vc" ref="root" :class="{ empty: !nodes.length }">
    <!-- decorative orbit rings -->
    <span class="vc-orbit o1" aria-hidden="true" />
    <span class="vc-orbit o2" aria-hidden="true" />
    <span class="vc-grid" aria-hidden="true" />

    <!-- connection beams + supply-inflow pulses -->
    <svg class="vc-beams" viewBox="0 0 100 100" aria-hidden="true">
      <line v-for="n in nodes" :key="'b' + n.id" :x1="n.x" :y1="n.y" x2="50" y2="50"
        :stroke="n.color" :stroke-width="n.beamW" :stroke-opacity="hoverId === n.id ? 0.95 : n.beamOpacity" stroke-linecap="round" />
      <template v-if="!reduced">
        <circle v-for="n in nodes" :key="'p' + n.id" :r="n.pulseR" :fill="n.color">
          <animateMotion :dur="n.dur + 's'" :begin="n.delay + 's'" repeatCount="indefinite" :path="`M ${n.x} ${n.y} L 50 50`" />
        </circle>
      </template>
    </svg>

    <!-- procurement hub -->
    <div class="vc-hub" :title="`${totalAssets} assets across ${nodes.length} suppliers`">
      <span class="vc-hub-ring" aria-hidden="true" />
      <span class="vc-hub-core"><Boxes :size="20" /></span>
      <span class="vc-hub-lab">Procurement</span>
    </div>

    <!-- vendor nodes -->
    <button v-for="n in nodes" :key="n.id" type="button" class="vc-node" :data-tone="n.tone"
      :class="{ hot: hoverId === n.id, off: !n.active }"
      :style="{ left: n.x + '%', top: n.y + '%', '--size': n.size + 'px', '--nc': n.color, '--d': n.floatDelay + 's' }"
      @mouseenter="hoverId = n.id" @mouseleave="hoverId = null" @focus="hoverId = n.id" @blur="hoverId = null"
      @click="$emit('focus', n.id)" :title="n.name">
      <span class="vc-node-glow" aria-hidden="true" />
      <span class="vc-node-mono">{{ n.initials }}</span>
      <span v-if="!n.active" class="vc-node-off" aria-hidden="true" />
    </button>

    <!-- hover tooltip -->
    <Transition name="vc-tip">
      <div v-if="hovered" class="vc-tip" :style="tipStyle">
        <b>{{ hovered.name }}</b>
        <span class="vc-tip-row"><VendorStars :model-value="hovered.rating" readonly :size="11" /><i v-if="!hovered.active" class="vc-tip-off">inactive</i></span>
        <span class="vc-tip-assets"><Boxes :size="11" /> {{ hovered.assets }} {{ hovered.assets === 1 ? 'asset' : 'assets' }} sourced</span>
      </div>
    </Transition>

    <p v-if="!nodes.length" class="vc-emptylab">No suppliers in orbit yet</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Boxes } from 'lucide-vue-next'
import VendorStars from './VendorStars.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  vendors: { type: Array, default: () => [] },
  max: { type: Number, default: 12 },
})
defineEmits(['focus'])

const root = ref(null)
const reduced = prefersReduced()
const hoverId = ref(null)

const TONES = {
  gold:  'var(--as-amber-bright)',
  amber: 'var(--as-amber)',
  ember: 'var(--as-ember)',
  steel: 'var(--as-steel)',
  none:  'var(--as-steel-dim)',
}
function tierOf(r) {
  if (r >= 5) return 'gold'
  if (r >= 4) return 'amber'
  if (r >= 3) return 'ember'
  if (r >= 1) return 'steel'
  return 'none'
}
const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const totalAssets = computed(() => props.vendors.reduce((s, v) => s + (v.asset_count || 0), 0))

const nodes = computed(() => {
  const ranked = [...props.vendors]
    .sort((a, b) => (b.asset_count || 0) - (a.asset_count || 0))
    .slice(0, props.max)
  const n = ranked.length
  if (!n) return []
  const maxA = Math.max(1, ...ranked.map(v => v.asset_count || 0))

  // single ring for small sets, two rings (high-volume inner) for larger
  const twoRing = n > 7
  const innerN = twoRing ? Math.min(5, Math.ceil(n / 2)) : n
  const innerR = twoRing ? 26 : 37
  const outerR = 43

  return ranked.map((v, i) => {
    const inner = i < innerN
    const ringList = inner ? innerN : (n - innerN)
    const idxInRing = inner ? i : (i - innerN)
    const r = inner ? innerR : outerR
    // start at top (-90deg); offset outer ring by half a step so rings interleave
    const step = 360 / Math.max(1, ringList)
    const ang = (-90 + idxInRing * step + (inner ? 0 : step / 2)) * Math.PI / 180
    const ratio = (v.asset_count || 0) / maxA
    const tone = tierOf(v.rating || 0)
    return {
      id: v.id,
      name: v.name,
      initials: initials(v.name),
      rating: v.rating || null,
      assets: v.asset_count || 0,
      active: v.is_active !== false,
      x: +(50 + r * Math.cos(ang)).toFixed(2),
      y: +(50 + r * Math.sin(ang)).toFixed(2),
      size: Math.round(20 + ratio * 24),
      tone,
      color: TONES[tone],
      beamW: +(0.3 + ratio * 1.5).toFixed(2),
      beamOpacity: +(0.22 + ratio * 0.5).toFixed(2),
      pulseR: +(0.7 + ratio * 1.0).toFixed(2),
      dur: +(3.4 - ratio * 1.4).toFixed(2),
      delay: +(-(i * 0.34)).toFixed(2),
      floatDelay: +(-(i * 0.5)).toFixed(2),
    }
  })
})

const hovered = computed(() => nodes.value.find(n => n.id === hoverId.value) || null)
const tipStyle = computed(() => {
  if (!hovered.value) return {}
  const above = hovered.value.y > 30
  return {
    left: hovered.value.x + '%',
    top: hovered.value.y + '%',
    transform: `translate(-50%, ${above ? 'calc(-100% - 22px)' : '22px'})`,
  }
})
</script>

<style scoped>
.vc { position: relative; width: 100%; max-width: 360px; aspect-ratio: 1; margin: 0 auto; flex-shrink: 0; }

/* decorative orbit rings */
.vc-orbit { position: absolute; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--as-steel) 26%, transparent);
  top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
.vc-orbit.o1 { width: 52%; height: 52%; animation: vc-spin 48s linear infinite; }
.vc-orbit.o2 { width: 86%; height: 86%; border-color: color-mix(in srgb, var(--as-steel) 16%, transparent); animation: vc-spin 80s linear infinite reverse; }
.vc-grid { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; opacity: 0.5;
  background: radial-gradient(closest-side, transparent 62%, color-mix(in srgb, var(--as-amber) 7%, transparent) 100%); }

/* beams + pulses */
.vc-beams { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 1; }
.vc-beams line { transition: stroke-opacity 0.3s; }

/* hub */
.vc-hub { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.vc-hub-ring { position: absolute; top: 4px; left: 50%; transform: translateX(-50%); width: 64px; height: 64px; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--as-amber) 40%, transparent); animation: vc-pulsering 3s ease-out infinite; }
.vc-hub-core { position: relative; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; color: #1a1206;
  background: radial-gradient(circle at 35% 30%, var(--as-amber-bright), var(--as-amber-strong));
  box-shadow: 0 0 26px -2px color-mix(in srgb, var(--as-amber) 70%, transparent), inset 0 2px 6px rgba(255,255,255,0.4); }
[data-theme="light"] .vc-hub-core { color: #2a1a06; }
.vc-hub-lab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--as-text-dim); }

/* nodes */
.vc-node { position: absolute; transform: translate(-50%, -50%); z-index: 4; width: var(--size); height: var(--size);
  display: grid; place-items: center; border-radius: 50%; cursor: pointer; padding: 0; border: 1.5px solid color-mix(in srgb, var(--nc) 60%, transparent);
  color: var(--as-text); background: radial-gradient(circle at 36% 30%, color-mix(in srgb, var(--nc) 38%, var(--as-surface-elevated)), var(--as-surface-elevated));
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--nc) 40%, transparent), 0 6px 16px -8px rgba(0,0,0,0.6);
  transition: transform 0.25s var(--as-spring), box-shadow 0.3s, border-color 0.3s; animation: vc-float 6s ease-in-out var(--d, 0s) infinite; }
.vc-node-glow { position: absolute; inset: -4px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--nc) 30%, transparent), transparent 70%); opacity: 0.7; }
.vc-node-mono { position: relative; z-index: 1; font-size: 11px; font-weight: 800; letter-spacing: 0.02em; color: var(--as-text); }
.vc-node.off { filter: grayscale(0.5); opacity: 0.62; border-style: dashed; }
.vc-node-off { position: absolute; right: -2px; top: -2px; width: 8px; height: 8px; border-radius: 50%; background: var(--as-st-retired); border: 1.5px solid var(--as-surface-elevated); }
.vc-node:hover, .vc-node.hot { transform: translate(-50%, -50%) scale(1.18); border-color: var(--nc);
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--nc) 55%, transparent), 0 8px 22px -8px rgba(0,0,0,0.7); z-index: 6; animation-play-state: paused; }

/* tooltip */
.vc-tip { position: absolute; z-index: 7; display: flex; flex-direction: column; gap: 5px; padding: 9px 11px; border-radius: 12px; min-width: 130px; pointer-events: none;
  background: var(--as-glass-deep); border: 1px solid var(--as-border-strong); box-shadow: var(--as-glass-shadow); backdrop-filter: var(--as-glass-blur); }
.vc-tip b { font-size: 12.5px; font-weight: 800; color: var(--as-text); white-space: nowrap; }
.vc-tip-row { display: flex; align-items: center; gap: 7px; }
.vc-tip-off { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-st-retired); font-style: normal; }
.vc-tip-assets { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
.vc-tip-assets :deep(svg) { color: var(--as-amber); }

.vc-emptylab { position: absolute; left: 50%; bottom: 8%; transform: translateX(-50%); margin: 0; font-size: 11px; color: var(--as-text-dim); white-space: nowrap; }

.vc-tip-enter-active, .vc-tip-leave-active { transition: opacity 0.18s var(--as-ease), transform 0.18s var(--as-ease); }
.vc-tip-enter-from, .vc-tip-leave-to { opacity: 0; }

@keyframes vc-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes vc-float { 0%, 100% { margin-top: 0; } 50% { margin-top: -5px; } }
@keyframes vc-pulsering { 0% { transform: translateX(-50%) scale(0.85); opacity: 0.8; } 100% { transform: translateX(-50%) scale(1.5); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .vc-orbit, .vc-node, .vc-hub-ring { animation: none !important; }
}
</style>
