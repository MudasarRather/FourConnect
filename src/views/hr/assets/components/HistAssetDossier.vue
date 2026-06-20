<template>
  <Motion as="section" class="hd as-card" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="hd-grid" aria-hidden="true" />
    <span class="as-spotlight" aria-hidden="true" />
    <span v-if="!reduced" class="hd-scan" aria-hidden="true" />

    <div class="hd-top">
      <div class="hd-medal">
        <AssetTypeBadge :type="asset.asset_type" medallion />
        <span class="hd-medal-glow" aria-hidden="true" />
      </div>
      <div class="hd-id">
        <span class="hd-code as-mono">{{ asset.asset_code }}</span>
        <span class="hd-meta">{{ [asset.brand, asset.model].filter(Boolean).join(' ') || typeLabel(asset.asset_type) }}</span>
        <div class="hd-tags">
          <span v-if="asset.serial_number" class="hd-tag as-mono"><Barcode :size="11" /> {{ asset.serial_number }}</span>
          <span v-if="asset.category_name" class="hd-tag"><FolderTree :size="11" /> {{ asset.category_name }}</span>
          <span class="hd-tag hd-loc" :data-tone="locTone"><component :is="loc.icon" :size="11" /> {{ loc.label }}</span>
        </div>
      </div>
      <div class="hd-actions">
        <AssetStatusStamp :value="asset.status" />
        <Motion as="button" type="button" class="as-btn as-btn-ghost mini"
          :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="$emit('clear')"><X :size="13" /> Clear</Motion>
      </div>
    </div>

    <AssetLifecycleRibbon :status="asset.status" />

    <!-- provenance vitals -->
    <div class="hd-vitals" ref="vitalsEl">
      <Motion v-for="(v, i) in vitals" :key="v.key" class="hd-vital" :style="{ '--c': v.color }"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }">
        <span class="hd-vital-ic"><component :is="v.icon" :size="14" /></span>
        <span class="hd-vital-num">
          <AssetCountUp :value="v.value" :start="vitalsIn" :duration="1 + i * 0.08" :suffix="v.suffix || ''" />
        </span>
        <span class="hd-vital-lab">{{ v.label }}</span>
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Barcode, FolderTree, Layers, Send, Wrench, ShieldAlert, CalendarClock,
  PackageCheck, Archive, MapPin,
} from 'lucide-vue-next'
import AssetTypeBadge from './AssetTypeBadge.vue'
import AssetStatusStamp from './AssetStatusStamp.vue'
import AssetLifecycleRibbon from './AssetLifecycleRibbon.vue'
import AssetCountUp from './AssetCountUp.vue'
import { typeMeta } from '@/composables/useAssets'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  asset: { type: Object, required: true },
  events: { type: Array, default: () => [] },
})
defineEmits(['clear'])

const root = ref(null)
const vitalsEl = ref(null)
const reduced = prefersReduced()
usePointerSpotlight(root)
const { visible: vitalsIn } = useInView(vitalsEl, { threshold: 0.3 })

const typeLabel = (t) => typeMeta(t).label

const count = (...types) => props.events.filter(e => types.includes(e.event_type)).length

// genesis = oldest event (events arrive newest-first); fall back to purchase/created
const genesis = computed(() => {
  const ev = props.events.length ? props.events[props.events.length - 1].created_at : null
  return ev || props.asset.purchase_date || props.asset.created_at || null
})
const endpoint = computed(() => {
  const retired = props.events.find(e => ['RETIRED', 'DISPOSAL_COMPLETED', 'DELETED'].includes(e.event_type))
  return retired ? retired.created_at : null
})
const daysTracked = computed(() => {
  if (!genesis.value) return 0
  const end = endpoint.value ? new Date(endpoint.value) : new Date()
  return Math.max(0, Math.round((end - new Date(genesis.value)) / 86400000))
})

const vitals = computed(() => [
  { key: 'events', label: 'Events', value: props.events.length, icon: Layers, color: 'var(--as-amber)' },
  { key: 'days', label: 'Days tracked', value: daysTracked.value, icon: CalendarClock, color: 'var(--as-steel)' },
  { key: 'deploy', label: 'Deployments', value: count('ALLOCATED'), icon: Send, color: 'var(--as-st-allocated)' },
  { key: 'service', label: 'Services', value: count('MAINTENANCE_SCHEDULED', 'MAINTENANCE_COMPLETED'), icon: Wrench, color: 'var(--as-st-maintenance)' },
  { key: 'incidents', label: 'Incidents', value: count('DAMAGE_REPORTED', 'MARKED_DAMAGED', 'MARKED_LOST'), icon: ShieldAlert, color: 'var(--as-al-damaged)' },
])

const LOC = {
  AVAILABLE: { label: 'Available bay', icon: PackageCheck, tone: 'ok' },
  RESERVED: { label: 'Reserved', icon: PackageCheck, tone: 'soon' },
  ALLOCATED: { label: 'In the field', icon: Send, tone: 'field' },
  MAINTENANCE: { label: 'In service', icon: Wrench, tone: 'svc' },
  RETIRED: { label: 'Retired', icon: Archive, tone: 'retired' },
}
const loc = computed(() => LOC[props.asset.status] || { label: 'Tracked', icon: MapPin, tone: 'field' })
const locTone = computed(() => loc.value.tone)
</script>

<style scoped>
.hd { position: relative; overflow: hidden; padding: 18px 20px 16px; display: flex; flex-direction: column; gap: 18px; }
.hd-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(130% 100% at 90% 0%, #000, transparent 70%); -webkit-mask-image: radial-gradient(130% 100% at 90% 0%, #000, transparent 70%); }
.hd-scan { position: absolute; left: 0; right: 0; top: 0; height: 120px; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-amber) 16%, transparent), transparent); animation: hd-scan 1.1s ease-out 1 both; }
.hd > *:not(.hd-grid):not(.hd-scan):not(.as-spotlight) { position: relative; z-index: 1; }

.hd-top { display: flex; align-items: flex-start; gap: 14px; }
.hd-medal { position: relative; }
.hd-medal-glow { position: absolute; inset: -6px; border-radius: 18px; pointer-events: none; background: radial-gradient(circle, color-mix(in srgb, var(--as-amber) 24%, transparent), transparent 70%); animation: hd-breathe 3.5s ease-in-out infinite; }
.hd-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.hd-code { font-size: 18px; font-weight: 850; letter-spacing: 0.01em; color: var(--as-text); }
.hd-meta { font-size: 13px; color: var(--as-text-muted); }
.hd-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.hd-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.hd-tag :deep(svg) { color: var(--as-text-dim); }
.hd-loc { font-weight: 700; }
.hd-loc[data-tone="ok"] { color: var(--as-st-available); border-color: color-mix(in srgb, var(--as-st-available) 30%, transparent); }
.hd-loc[data-tone="field"] { color: var(--as-st-allocated); border-color: color-mix(in srgb, var(--as-st-allocated) 30%, transparent); }
.hd-loc[data-tone="svc"] { color: var(--as-st-maintenance); border-color: color-mix(in srgb, var(--as-st-maintenance) 36%, transparent); }
.hd-loc[data-tone="soon"] { color: var(--as-st-reserved); border-color: color-mix(in srgb, var(--as-st-reserved) 30%, transparent); }
.hd-loc[data-tone="retired"] { color: var(--as-st-retired); border-color: color-mix(in srgb, var(--as-st-retired) 30%, transparent); }
.hd-loc :deep(svg) { color: inherit; }
.hd-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 9px; flex-shrink: 0; }
.as-btn.mini { padding: 6px 11px; font-size: 12px; }

/* vitals */
.hd-vitals { display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px; }
.hd-vital { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 11px 12px; border-radius: 14px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.hd-vital::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.8;
  background: linear-gradient(90deg, transparent, var(--c), transparent); }
.hd-vital-ic { display: inline-grid; place-items: center; width: 25px; height: 25px; border-radius: 8px; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); }
.hd-vital-num { font-size: 21px; font-weight: 850; color: var(--as-text); margin-top: 6px; line-height: 1; }
.hd-vital-lab { font-size: 9.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }

@keyframes hd-scan { 0% { transform: translateY(-120px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(360px); opacity: 0; } }
@keyframes hd-breathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.9; } }

@media (max-width: 760px) { .hd-vitals { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 460px) { .hd-vitals { grid-template-columns: repeat(2, 1fr); } .hd-vital-num { font-size: 18px; } }
@media (prefers-reduced-motion: reduce) { .hd-scan, .hd-medal-glow { animation: none; } }
</style>
