<template>
  <section class="ps" ref="root">
    <span class="as-grain" aria-hidden="true" />
    <div class="ps-top">
      <div class="ps-lead">
        <span class="ps-eyebrow"><Activity :size="12" /> Fleet pulse</span>
        <span class="ps-total">
          <AssetCountUp :value="total" :start="visible" :duration="1.1" />
          <i>units tracked</i>
        </span>
      </div>
      <div class="ps-health" :data-tone="healthTone">
        <span class="ps-health-ring" :style="ringStyle" aria-hidden="true">
          <span class="ps-health-num as-mono"><AssetCountUp :value="availablePct" :start="visible" :duration="1.2" suffix="%" /></span>
        </span>
        <span class="ps-health-lab">ready to deploy</span>
      </div>
    </div>

    <div class="ps-track" :class="{ empty: !total }">
      <button v-for="(s, i) in segments" :key="s.key" class="ps-seg" :data-status="s.key"
        :class="{ dim: activeStatus && activeStatus !== s.key }"
        :style="{ flexGrow: s.count, '--cd': `${0.12 + i * 0.08}s` }"
        :title="`${s.label}: ${s.count}`" @click="$emit('pick', s.key)">
        <span class="ps-seg-fill" />
        <span class="ps-seg-sheen" aria-hidden="true" />
      </button>
      <span v-if="!total" class="ps-track-idle">calibrating fleet telemetry…</span>
    </div>

    <div class="ps-legend">
      <button v-for="s in segments" :key="s.key" class="ps-leg" :class="{ on: activeStatus === s.key, dim: activeStatus && activeStatus !== s.key }"
        @click="$emit('pick', s.key)">
        <span class="ps-leg-dot" :data-status="s.key" />
        <span class="ps-leg-lab">{{ s.label }}</span>
        <span class="ps-leg-num as-mono"><AssetCountUp :value="s.count" :start="visible" :duration="0.9" /></span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Activity } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { statusMeta, ASSET_STATUSES } from '@/composables/useAssets'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  activeStatus: { type: String, default: '' },
})
defineEmits(['pick'])

const root = ref(null)
const { visible } = useInView(root, { threshold: 0.25 })

const byStatus = computed(() => props.stats?.by_status || {})
const total = computed(() => ASSET_STATUSES.reduce((a, k) => a + (byStatus.value[k] || 0), 0))
const segments = computed(() => ASSET_STATUSES
  .map(k => ({ key: k, label: statusMeta(k).label, count: byStatus.value[k] || 0 }))
  .filter(s => s.count > 0))
const availablePct = computed(() => total.value ? Math.round(((byStatus.value.AVAILABLE || 0) / total.value) * 100) : 0)
const healthTone = computed(() => availablePct.value >= 50 ? 'good' : availablePct.value >= 25 ? 'warn' : 'low')
const ringStyle = computed(() => ({
  background: `conic-gradient(var(--ring-c) ${availablePct.value * 3.6}deg, var(--as-border-soft) 0)`,
}))
</script>

<style scoped>
.ps { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 16px 18px;
  border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  animation: as-deal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ps-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.ps-lead { display: flex; flex-direction: column; gap: 4px; }
.ps-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-amber); }
.ps-total { font-size: 26px; font-weight: 850; color: var(--as-text); display: inline-flex; align-items: baseline; gap: 8px; }
.ps-total i { font-size: 11px; font-weight: 600; font-style: normal; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }

.ps-health { display: flex; flex-direction: column; align-items: center; gap: 5px; --ring-c: var(--as-st-available); }
.ps-health[data-tone="warn"] { --ring-c: var(--as-st-reserved); }
.ps-health[data-tone="low"] { --ring-c: var(--as-al-lost); }
.ps-health-ring { position: relative; display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; }
.ps-health-ring::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--as-surface-elevated); }
.ps-health-num { position: relative; z-index: 1; font-size: 14px; font-weight: 800; color: var(--as-text); }
.ps-health-lab { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }

.ps-track { position: relative; display: flex; gap: 4px; height: 16px; border-radius: 8px; overflow: hidden; }
.ps-track.empty { background: var(--as-surface); }
.ps-seg { position: relative; flex-basis: 0; min-width: 8px; border: none; padding: 0; border-radius: 5px; overflow: hidden; cursor: pointer; background: transparent; transition: opacity 0.3s, transform 0.3s var(--as-spring); }
.ps-seg:hover { transform: translateY(-1px); }
.ps-seg.dim { opacity: 0.32; }
.ps-seg-fill { position: absolute; inset: 0; border-radius: 5px; transform: scaleX(0); transform-origin: left; animation: as-charge 0.85s var(--as-spring) both; animation-delay: var(--cd); }
.ps-seg[data-status="AVAILABLE"]   .ps-seg-fill { background: linear-gradient(180deg, color-mix(in srgb, var(--as-st-available) 80%, white), var(--as-st-available)); }
.ps-seg[data-status="ALLOCATED"]   .ps-seg-fill { background: linear-gradient(180deg, color-mix(in srgb, var(--as-st-allocated) 80%, white), var(--as-st-allocated)); }
.ps-seg[data-status="RESERVED"]    .ps-seg-fill { background: linear-gradient(180deg, color-mix(in srgb, var(--as-st-reserved) 80%, white), var(--as-st-reserved)); }
.ps-seg[data-status="MAINTENANCE"] .ps-seg-fill { background: linear-gradient(180deg, color-mix(in srgb, var(--as-st-maintenance) 85%, white), var(--as-st-maintenance)); }
.ps-seg[data-status="RETIRED"]     .ps-seg-fill { background: linear-gradient(180deg, color-mix(in srgb, var(--as-st-retired) 85%, white), var(--as-st-retired)); }
.ps-seg-sheen { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%); background-size: 220% 100%; background-position: 180% 0; animation: as-sheen 3.4s ease-in-out infinite; }
.ps-track-idle { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; color: var(--as-text-dim); letter-spacing: 0.04em; }

.ps-legend { display: flex; flex-wrap: wrap; gap: 7px; }
.ps-leg { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 9px; cursor: pointer; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-secondary); transition: all 0.2s var(--as-spring); }
.ps-leg:hover { border-color: var(--as-border-strong); transform: translateY(-1px); }
.ps-leg.on { border-color: color-mix(in srgb, var(--as-amber) 40%, transparent); background: color-mix(in srgb, var(--as-amber) 10%, transparent); color: var(--as-text); }
.ps-leg.dim { opacity: 0.5; }
.ps-leg-dot { width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }
.ps-leg-dot[data-status="AVAILABLE"]   { background: var(--as-st-available); color: var(--as-st-available); }
.ps-leg-dot[data-status="ALLOCATED"]   { background: var(--as-st-allocated); color: var(--as-st-allocated); }
.ps-leg-dot[data-status="RESERVED"]    { background: var(--as-st-reserved); color: var(--as-st-reserved); }
.ps-leg-dot[data-status="MAINTENANCE"] { background: var(--as-st-maintenance); color: var(--as-st-maintenance); }
.ps-leg-dot[data-status="RETIRED"]     { background: var(--as-st-retired); color: var(--as-st-retired); }
.ps-leg-lab { font-size: 11.5px; font-weight: 600; }
.ps-leg-num { font-size: 12px; font-weight: 800; color: var(--as-text); }

@media (prefers-reduced-motion: reduce) {
  .ps, .ps-seg-fill { animation: none; }
  .ps-seg-fill { transform: scaleX(1); }
  .ps-seg-sheen { animation: none; }
}
</style>
