<template>
  <div class="mr" ref="root" :data-status="asset.status" :style="{ '--i': index }" @click="$emit('detail', asset)">
    <span class="mr-accent" aria-hidden="true" />
    <span class="mr-sweep" aria-hidden="true" />
    <span class="as-spotlight mr-spot" aria-hidden="true" />

    <!-- asset -->
    <div class="mr-c mr-asset">
      <span class="mr-med" :style="{ '--accent': `var(${typeVar})` }"><component :is="typeIcon" :size="15" /></span>
      <div class="mr-id">
        <span class="mr-code as-mono">{{ asset.asset_code }}</span>
        <span class="mr-name">{{ asset.brand || '' }} {{ asset.model || typeLabel }}</span>
      </div>
    </div>

    <!-- type -->
    <div class="mr-c mr-type"><span class="mr-type-tag" :style="{ '--accent': `var(${typeVar})` }">{{ typeLabel }}</span></div>

    <!-- status -->
    <div class="mr-c"><AssetStatusStamp :value="asset.status" /></div>

    <!-- condition -->
    <div class="mr-c mr-cond">
      <span v-for="n in 4" :key="n" class="mr-seg" :class="{ on: n <= condMeta.level }" :style="{ '--seg': condColors[n - 1] }" />
      <span class="mr-cond-lab">{{ condMeta.label }}</span>
    </div>

    <!-- holder -->
    <div class="mr-c mr-holder">
      <template v-if="asset.assigned_employee_name"><UserRound :size="12" /> {{ asset.assigned_employee_name }}</template>
      <span v-else class="mr-dash">—</span>
    </div>

    <!-- value -->
    <div class="mr-c mr-value as-mono">{{ asset.purchase_cost ? money(asset.purchase_cost) : '—' }}</div>

    <!-- actions -->
    <div class="mr-c mr-actions">
      <button v-if="asset.status === 'AVAILABLE'" class="mr-act primary" @click.stop="$emit('allocate', asset)" title="Allocate"><Send :size="13" /></button>
      <button class="mr-act" @click.stop="$emit('edit', asset)" title="Edit asset"><Pencil :size="13" /></button>
      <button class="mr-act" @click.stop="$emit('detail', asset)" title="History"><Eye :size="13" /></button>
      <button class="mr-act danger" @click.stop="$emit('delete', asset)" title="Delete"><Trash2 :size="13" /></button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  UserRound, Send, Eye, Pencil, Trash2,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import AssetStatusStamp from './AssetStatusStamp.vue'
import { typeMeta, conditionMeta } from '@/composables/useAssets'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  asset: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['allocate', 'edit', 'detail', 'delete'])

const root = ref(null)
usePointerSpotlight(root)

const TYPE_ICONS = {
  LAPTOP: Laptop, DESKTOP: HardDrive, MONITOR: Monitor, MOBILE: Smartphone,
  SIM: CreditCard, RFID_CARD: CreditCard, ID_CARD: CreditCard, HEADSET: Headphones,
  KEYBOARD: Keyboard, MOUSE: Mouse, VEHICLE: Car, KEYS: KeyRound, OTHER: Package,
}
const typeIcon = computed(() => TYPE_ICONS[props.asset.asset_type] || Package)
const typeLabel = computed(() => typeMeta(props.asset.asset_type).label)
const typeVar = computed(() => typeMeta(props.asset.asset_type).cssVar)
const condMeta = computed(() => conditionMeta(props.asset.condition))
const condColors = ['var(--as-cond-poor)', 'var(--as-cond-fair)', 'var(--as-cond-good)', 'var(--as-cond-new)']

const money = (v) => {
  const n = Number(v || 0)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`
  return `₹${n.toLocaleString()}`
}
</script>

<style scoped>
.mr { position: relative; display: grid; grid-template-columns: var(--manifest-cols); align-items: center; gap: 12px;
  padding: 11px 16px 11px 18px; border-radius: 13px; cursor: pointer; overflow: hidden;
  background: var(--as-surface); border: 1px solid var(--as-border-soft);
  transition: transform 0.26s var(--as-spring), border-color 0.26s, background 0.26s;
  animation: as-deal-row 0.45s var(--as-spring) both; animation-delay: calc(var(--i) * 0.04s); }
.mr:hover { transform: translateX(3px); border-color: var(--as-border-strong); background: var(--as-surface-elevated); }

.mr-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; transform: scaleY(0.4); transform-origin: center; opacity: 0.6;
  background: var(--st, var(--as-steel-dim)); box-shadow: 0 0 10px var(--st, transparent); transition: transform 0.3s var(--as-spring), opacity 0.3s; }
.mr:hover .mr-accent { transform: scaleY(1); opacity: 1; }
.mr[data-status="AVAILABLE"]   { --st: var(--as-st-available); }
.mr[data-status="ALLOCATED"]   { --st: var(--as-st-allocated); }
.mr[data-status="RESERVED"]    { --st: var(--as-st-reserved); }
.mr[data-status="MAINTENANCE"] { --st: var(--as-st-maintenance); }
.mr[data-status="RETIRED"]     { --st: var(--as-st-retired); }

.mr-sweep { position: absolute; top: 0; bottom: 0; left: 0; width: 100%; pointer-events: none;
  background: linear-gradient(90deg, transparent 38%, color-mix(in srgb, var(--st, var(--as-amber)) 24%, transparent) 50%, transparent 62%);
  animation: as-row-sweep 0.9s ease both; animation-delay: calc(var(--i) * 0.04s + 0.15s); }
.mr-spot { background: radial-gradient(320px 120px at calc(var(--mx,0.5)*100%) 50%, color-mix(in srgb, var(--as-amber) 13%, transparent), transparent 65%); }

.mr-c { min-width: 0; }
.mr-asset { display: flex; align-items: center; gap: 10px; }
.mr-med { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); }
.mr-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.mr-code { font-size: 13px; font-weight: 800; color: var(--as-text); }
.mr-name { font-size: 11.5px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.mr-type-tag { font-size: 11px; font-weight: 700; color: var(--accent); padding: 3px 8px; border-radius: 7px;
  background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent); white-space: nowrap; }

.mr-cond { display: flex; align-items: center; gap: 3px; }
.mr-seg { width: 11px; height: 5px; border-radius: 3px; background: var(--as-st-retired-soft); }
.mr-seg.on { background: var(--seg); box-shadow: 0 0 5px color-mix(in srgb, var(--seg) 60%, transparent); }
.mr-cond-lab { margin-left: 5px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); }

.mr-holder { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--as-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mr-holder :deep(svg) { color: var(--as-amber); flex-shrink: 0; }
.mr-dash { color: var(--as-text-dim); }
.mr-value { font-size: 12.5px; font-weight: 700; color: var(--as-text); text-align: right; }

.mr-actions { display: flex; gap: 6px; justify-content: flex-end; }
.mr-act { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface-elevated); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.mr-act:hover { color: var(--as-text); transform: translateY(-2px); }
.mr-act.primary { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 30%, transparent); background: color-mix(in srgb, var(--as-amber) 10%, transparent); }
.mr-act.danger:hover { color: var(--as-cond-poor); border-color: color-mix(in srgb, var(--as-cond-poor) 34%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .mr, .mr-sweep { animation: none; }
}
</style>
