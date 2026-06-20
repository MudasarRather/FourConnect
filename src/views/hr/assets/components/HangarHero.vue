<template>
  <Motion as="section" class="hh" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="hh-aura" aria-hidden="true" />

    <!-- 3D hangar (lazy WebGL) or CSS fallback -->
    <div class="hh-stage">
      <AssetHangarCanvas v-if="use3D" :reduced="reduced" :light="light" :status-counts="statusCounts" :low-power="lowPower" />
      <AssetHangarFallback v-else :status-counts="statusCounts" />
      <span class="hh-stage-fade" aria-hidden="true" />
    </div>

    <div class="hh-content">
      <div class="hh-lead">
        <span class="hh-eyebrow"><Boxes :size="13" /> Asset Hangar · Lifecycle control</span>
        <h1 class="hh-title">Equipment <span class="hh-title-accent">Registry</span></h1>
        <p class="hh-sub">Track, allocate, service, audit and retire every asset across the organization — from procurement to disposal.</p>
        <div class="hh-tools">
          <Motion as="button" type="button" class="as-btn as-btn-primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new-asset')">
            <Plus :size="15" /> Register asset
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'allocations')">
            <Send :size="14" /> Allocate
          </Motion>
        </div>
      </div>

      <div class="hh-lenses" ref="lenses">
        <button v-for="(k, i) in lensKeys" :key="k.key" class="hh-lens" :data-status="k.status" @click="$emit('go', lensTarget(k))" :title="k.label">
          <span class="hh-lens-ic"><component :is="k.icon" :size="15" /></span>
          <span class="hh-lens-val">
            <AssetCountUp :value="stats[k.key] || 0" :start="lensesIn" :duration="1.1 + i * 0.1" />
          </span>
          <span class="hh-lens-lab">{{ k.label }}</span>
        </button>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Boxes, Plus, Send, PackageCheck, Undo2, Wrench, ShieldAlert, Layers } from 'lucide-vue-next'
import AssetHangarFallback from './AssetHangarFallback.vue'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const AssetHangarCanvas = defineAsyncComponent(() => import('./AssetHangarCanvas.vue'))

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  light: { type: Boolean, default: false },
  force2d: { type: Boolean, default: false },
})
defineEmits(['new-asset', 'go'])

const root = ref(null)
const lenses = ref(null)
const reduced = prefersReduced()
const { visible: heroIn } = useInView(root, { threshold: 0.15 })
const { visible: lensesIn } = useInView(lenses, { threshold: 0.3 })

function canUseWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}
const lowPower = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4
const webgl = ref(false)
onMounted(() => { webgl.value = canUseWebGL() })
const use3D = computed(() => !props.force2d && !reduced && webgl.value && heroIn.value)

const statusCounts = computed(() => props.stats?.by_status || {})

const lensKeys = [
  { key: 'total', label: 'Total', status: '', go: 'inventory', icon: Layers },
  { key: 'available', label: 'Available', status: 'AVAILABLE', go: 'inventory', filter: { status: 'AVAILABLE' }, icon: PackageCheck },
  { key: 'allocated', label: 'Allocated', status: 'ALLOCATED', go: 'allocations', icon: Send },
  { key: 'maintenance', label: 'Service', status: 'MAINTENANCE', go: 'maintenance', icon: Wrench },
  { key: 'overdue_returns', label: 'Overdue', status: 'DAMAGED', go: 'returns', icon: Undo2 },
  { key: 'open_damages', label: 'Damage', status: 'DAMAGED', go: 'damage', icon: ShieldAlert },
]
// inventory lenses carry a filter (or clear it); workflow lenses just switch tabs.
const lensTarget = (k) => k.go === 'inventory' ? { tab: 'inventory', filter: k.filter || null } : { tab: k.go }
</script>

<style scoped>
.hh { position: relative; overflow: hidden; border-radius: 24px; min-height: 320px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.hh-aura { position: absolute; inset: -40% -20% auto -20%; height: 80%; pointer-events: none; z-index: 0;
  background: var(--as-grad-hero); filter: blur(8px); }
.hh-stage { position: absolute; inset: 0; z-index: 0; }
.hh-stage-fade { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, var(--as-dome) 8%, transparent 52%), linear-gradient(0deg, var(--as-dome), transparent 45%); opacity: 0.9; }
[data-theme="light"] .hh-stage-fade { background: linear-gradient(105deg, var(--as-canvas) 6%, transparent 54%), linear-gradient(0deg, var(--as-canvas), transparent 48%); }

.hh-content { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; padding: 26px 28px 22px; min-height: 320px; }
.hh-lead { max-width: 540px; }
.hh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.hh-title { margin: 14px 0 0; font-size: clamp(28px, 4vw, 42px); font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1.02; }
.hh-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hh-sub { margin: 10px 0 0; font-size: 14px; line-height: 1.6; color: var(--as-text-muted); max-width: 480px; }
.hh-tools { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }

.hh-lenses { display: grid; grid-template-columns: repeat(6, minmax(86px, 1fr)); gap: 10px; }
.hh-lens { display: flex; flex-direction: column; gap: 3px; padding: 12px 13px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: transform 0.25s var(--as-spring), border-color 0.25s, box-shadow 0.25s; }
.hh-lens:hover { transform: translateY(-3px); border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.hh-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 12%, transparent); }
.hh-lens[data-status="AVAILABLE"] .hh-lens-ic { color: var(--as-st-available); background: var(--as-st-available-soft); }
.hh-lens[data-status="ALLOCATED"] .hh-lens-ic { color: var(--as-st-allocated); background: var(--as-st-allocated-soft); }
.hh-lens[data-status="MAINTENANCE"] .hh-lens-ic { color: var(--as-st-maintenance); background: var(--as-st-maintenance-soft); }
.hh-lens[data-status="DAMAGED"] .hh-lens-ic { color: var(--as-al-damaged); background: var(--as-al-damaged-soft); }
.hh-lens-val { font-size: 22px; font-weight: 800; color: var(--as-text); margin-top: 6px; }
.hh-lens-lab { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }

@media (max-width: 1100px) { .hh-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .hh-lenses { grid-template-columns: repeat(2, 1fr); } }
</style>
