<template>
  <article class="cn-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="cn" :class="{ off: !category.is_active }" :style="{ '--cc': color }">
      <span class="cn-glare" aria-hidden="true" />
      <span class="cn-spine" aria-hidden="true" />

      <header class="cn-head">
        <button type="button" class="cn-ring" :title="`${share}% of classified fleet`" @click="$emit('view')">
          <span class="cn-ring-track" :style="{ '--p': shareDeg }" />
          <span class="cn-ring-core">
            <b><AssetCountUp :value="category.asset_count || 0" :start="inView" :duration="1.2" /></b>
            <small>assets</small>
          </span>
        </button>
        <div class="cn-id">
          <span class="cn-name">{{ category.name }}</span>
          <span class="cn-code as-mono"><Hash :size="10" />{{ category.code }}</span>
          <span v-if="parentName" class="cn-parent"><GitBranch :size="10" /> under {{ parentName }}</span>
        </div>
        <button type="button" class="cn-toggle" :class="{ on: category.is_active }" role="switch" :aria-checked="category.is_active"
          :title="category.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'" @click="$emit('toggle')">
          <span class="cn-toggle-knob" />
        </button>
      </header>

      <div class="cn-meta">
        <span v-if="category.default_asset_type" class="cn-chip type" :style="{ '--tc': typeColor }">
          <component :is="Tag" :size="11" />{{ typeLabel }}
        </span>
        <span v-if="category.useful_life_months" class="cn-chip"><Clock :size="11" />{{ category.useful_life_months }}mo life</span>
        <span class="cn-chip" :data-dep="depreciates ? 'on' : 'off'"><TrendingDown :size="11" />{{ depLabel }}</span>
      </div>

      <!-- depreciation decay spark -->
      <div class="cn-decay" :title="depreciates ? `Straight-line over ${category.useful_life_months || '—'} months` : 'No depreciation'">
        <svg viewBox="0 0 120 26" preserveAspectRatio="none" class="cn-decay-svg">
          <defs>
            <linearGradient :id="`cnd-${uid}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
              <stop offset="100%" :stop-color="color" stop-opacity="0" />
            </linearGradient>
          </defs>
          <polygon :points="`0,24 ${decayLine} 120,24`" :fill="`url(#cnd-${uid})`" />
          <polyline :points="decayLine" fill="none" :stroke="color" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="cn-decay-path" />
          <circle :cx="depreciates ? 118 : 2" :cy="depreciates ? 22 : 4" r="2.4" :fill="color" class="cn-decay-dot" />
        </svg>
        <span class="cn-decay-cap">{{ depreciates ? 'value → residual' : 'value held' }}</span>
      </div>

      <p v-if="category.description" class="cn-desc">{{ category.description }}</p>

      <footer class="cn-foot">
        <Motion as="button" type="button" class="as-btn as-btn-ghost mini" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('view')">
          <Eye :size="13" /> {{ category.asset_count ? 'View assets' : 'No assets' }}
        </Motion>
        <span class="cn-foot-sp" />
        <Motion as="button" type="button" class="as-btn as-btn-ghost mini icon" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" title="Edit category" @click="$emit('edit')">
          <Pencil :size="13" />
        </Motion>
        <button v-if="(category.asset_count || 0) > 0" type="button" class="as-btn mini icon locked" :title="`Reassign ${category.asset_count} asset${category.asset_count > 1 ? 's' : ''} before deleting`" disabled>
          <Lock :size="13" />
        </button>
        <Motion v-else as="button" type="button" class="as-btn as-btn-danger mini icon" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" title="Delete category" @click="$emit('delete')">
          <Trash2 :size="13" />
        </Motion>
      </footer>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Hash, GitBranch, Tag, Clock, TrendingDown, Eye, Pencil, Trash2, Lock } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { typeMeta, titleCase } from '@/composables/useAssets'
import { usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  category: { type: Object, required: true },
  index: { type: Number, default: 0 },
  color: { type: String, default: 'var(--as-amber)' },
  share: { type: Number, default: 0 },        // 0..100 of classified fleet
  parentName: { type: String, default: '' },
})
defineEmits(['edit', 'delete', 'toggle', 'view'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)
const { visible: inView } = useInView(cardEl, { threshold: 0.25 })

let _seq = 0
const uid = (() => { _seq += 1; return `${Date.now().toString(36).slice(-3)}${_seq}` })()

const shareDeg = computed(() => `${Math.max(0, Math.min(100, props.share)) * 3.6}deg`)

const typeLabel = computed(() => props.category.default_asset_type ? typeMeta(props.category.default_asset_type).label : '')
const typeColor = computed(() => props.category.default_asset_type ? `var(${typeMeta(props.category.default_asset_type).cssVar})` : 'var(--as-steel)')

const depreciates = computed(() => {
  const m = (props.category.depreciation_method || '').toUpperCase()
  return m && m !== 'NONE'
})
const depLabel = computed(() => {
  const m = props.category.depreciation_method
  if (!m || m.toUpperCase() === 'NONE') return 'No depreciation'
  return titleCase(m)
})
// straight-line decay → diagonal; none → flat at top
const decayLine = computed(() => depreciates.value ? '0,4 118,22' : '2,4 118,4')
</script>

<style scoped>
.cn-shell { min-width: 0; animation: as-deal 0.5s var(--as-spring) both; animation-delay: calc(var(--i, 0) * 0.045s); }
.cn { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px 16px 14px 19px; border-radius: 18px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: perspective(1100px) rotateX(0) rotateY(0); transform-style: preserve-3d;
  transition: transform 0.4s var(--as-spring), box-shadow 0.4s var(--as-spring), border-color 0.3s, opacity 0.3s; }
.cn:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -6deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 8deg)) translateY(-2px); }
.cn.off { opacity: 0.72; }
.cn-glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: var(--spot, 0); transition: opacity 0.4s ease;
  background: radial-gradient(320px 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--cc, var(--as-amber)) 16%, transparent), transparent 60%); }
.cn-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--cc), color-mix(in srgb, var(--cc) 30%, transparent)); box-shadow: 0 0 14px -2px var(--cc); }

.cn-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.cn-ring { position: relative; flex-shrink: 0; width: 52px; height: 52px; border-radius: 50%; border: 0; background: none; cursor: pointer; display: grid; place-items: center; }
.cn-ring-track { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--cc) var(--p, 0deg), color-mix(in srgb, var(--as-steel-dim) 20%, transparent) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px)); mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px)); transition: --p 1s var(--as-ease); }
.cn-ring-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.cn-ring-core b { font-size: 15px; font-weight: 850; color: var(--as-text); }
.cn-ring-core small { font-size: 7px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 1px; }
.cn-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cn-name { font-size: 14.5px; font-weight: 800; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cn-code { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--as-text-muted); }
.cn-code :deep(svg) { opacity: 0.6; }
.cn-parent { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--as-text-dim); }
.cn-parent :deep(svg) { color: var(--cc); }

.cn-toggle { position: relative; flex-shrink: 0; width: 38px; height: 22px; border-radius: 999px; cursor: pointer; padding: 0; border: 1px solid var(--as-border-strong);
  background: var(--as-surface); transition: background 0.25s, border-color 0.25s; }
.cn-toggle.on { background: color-mix(in srgb, var(--as-st-available) 24%, transparent); border-color: color-mix(in srgb, var(--as-st-available) 45%, transparent); }
.cn-toggle-knob { position: absolute; top: 50%; left: 3px; width: 16px; height: 16px; margin-top: -8px; border-radius: 50%; background: var(--as-steel-dim);
  transition: transform 0.28s var(--as-spring), background 0.25s; }
.cn-toggle.on .cn-toggle-knob { transform: translateX(15px); background: var(--as-st-available); }

.cn-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; }
.cn-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--as-text-secondary); padding: 4px 9px; border-radius: 8px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.cn-chip :deep(svg) { color: var(--as-steel-dim); }
.cn-chip.type { color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 28%, transparent); }
.cn-chip.type :deep(svg) { color: var(--tc); }
.cn-chip[data-dep="on"] :deep(svg) { color: var(--as-ember); }

.cn-decay { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; }
.cn-decay-svg { width: 110px; height: 26px; flex-shrink: 0; }
.cn-decay-path { stroke-dasharray: 160; stroke-dashoffset: 160; animation: cn-draw 1.1s var(--as-ease) 0.25s forwards; }
.cn-decay-dot { opacity: 0; animation: cn-dot 0.4s ease 1.2s forwards; }
.cn-decay-cap { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }

.cn-desc { position: relative; z-index: 1; margin: 0; font-size: 12px; line-height: 1.5; color: var(--as-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.cn-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 7px; margin-top: 2px; padding-top: 11px; border-top: 1px solid var(--as-border-soft); }
.cn-foot-sp { flex: 1; }
.as-btn.mini { padding: 7px 12px; font-size: 12.5px; }
.as-btn.mini.icon { padding: 7px 9px; }
.as-btn.locked { background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); cursor: not-allowed; opacity: 0.7; }

@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes cn-draw { to { stroke-dashoffset: 0; } }
@keyframes cn-dot { to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .cn-shell { animation: none; }
  .cn, .cn:hover { transform: none; }
  .cn-decay-path { stroke-dashoffset: 0; animation: none; }
  .cn-decay-dot { opacity: 1; animation: none; }
}
</style>
