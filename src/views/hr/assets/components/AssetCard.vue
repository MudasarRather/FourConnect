<template>
  <article class="ac" ref="root" :data-status="asset.status" :class="{ reduced }"
    :style="{ '--i': index, '--accent': `var(${typeVar})` }"
    @click="$emit('detail', asset)">
    <div class="ac-tilt">
      <!-- one-shot vertical scanline (inside the clipped surface so it never bleeds out) -->
      <span class="ac-scan" aria-hidden="true" />
      <span class="ac-light" aria-hidden="true" />
      <span class="ac-bezel" aria-hidden="true" />
      <span class="ac-grid" aria-hidden="true" />
      <span class="ac-sheen" aria-hidden="true" />
      <span class="as-spotlight" aria-hidden="true" />

      <header class="ac-head">
        <span class="ac-medallion" :style="{ '--accent': `var(${typeVar})` }">
          <span class="ac-medallion-ring" aria-hidden="true" />
          <component :is="typeIcon" :size="19" />
        </span>
        <div class="ac-id">
          <span class="ac-code as-mono">{{ asset.asset_code }}</span>
          <span class="ac-name">{{ asset.brand || '' }} {{ asset.model || typeLabel }}</span>
        </div>
        <AssetStatusStamp :value="asset.status" />
      </header>

      <div class="ac-meta">
        <span v-if="asset.serial_number" class="ac-chip"><Barcode :size="11" />{{ asset.serial_number }}</span>
        <span v-if="asset.tag" class="ac-chip"><QrCode :size="11" />{{ asset.tag }}</span>
        <span v-if="asset.category_name" class="ac-chip"><FolderTree :size="11" />{{ asset.category_name }}</span>
      </div>

      <div class="ac-foot">
        <div class="ac-foot-left">
          <span class="ac-cond" :title="`Condition: ${condMeta.label}`">
            <span v-for="n in 4" :key="n" class="ac-seg" :class="{ on: n <= condMeta.level }"
              :style="{ '--seg': condColors[n - 1], '--sd': `${0.14 * n + index * 0.04}s` }" />
            <span class="ac-cond-lab">{{ condMeta.label }}</span>
          </span>
          <span v-if="asset.assigned_employee_name" class="ac-holder" :title="asset.assigned_employee_name">
            <UserRound :size="11" />{{ asset.assigned_employee_name }}
          </span>
        </div>
        <div class="ac-actions">
          <button v-if="asset.status === 'AVAILABLE'" class="ac-act primary" @click.stop="$emit('allocate', asset)" title="Allocate">
            <Send :size="13" />
          </button>
          <button class="ac-act" @click.stop="$emit('edit', asset)" title="Edit asset"><Pencil :size="13" /></button>
          <button class="ac-act" @click.stop="$emit('detail', asset)" title="History"><Eye :size="13" /></button>
          <button class="ac-act danger" @click.stop="$emit('delete', asset)" title="Delete"><Trash2 :size="13" /></button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Barcode, QrCode, FolderTree, UserRound, Send, Eye, Pencil, Trash2,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import AssetStatusStamp from './AssetStatusStamp.vue'
import { typeMeta, conditionMeta } from '@/composables/useAssets'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  asset: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['allocate', 'edit', 'detail', 'delete'])

const root = ref(null)
usePointerSpotlight(root)
const reduced = prefersReduced()

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
</script>

<style scoped>
/* ── perspective wrapper (owns the deal-in entry; never the tilt) ── */
.ac {
  position: relative; perspective: 1100px; cursor: pointer;
  border-radius: 19px;
  animation: as-deal 0.62s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i) * 0.045s);
}

/* ── the tilting machined surface ── */
.ac-tilt {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px;
  padding: 16px 16px 14px; border-radius: 19px; transform-style: preserve-3d;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform:
    rotateX(calc((0.5 - var(--my, 0.5)) * 8deg * var(--spot, 0)))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 11deg * var(--spot, 0)))
    translateY(var(--lift, 0px));
  transition: transform 0.34s var(--as-spring), box-shadow 0.34s var(--as-spring), border-color 0.34s;
}
.ac:hover .ac-tilt { --lift: -6px; box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }

/* machined top edge — tinted by status */
.ac-bezel { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--as-bezel-ring); opacity: 0.5; transform: translateZ(1px); }
.ac[data-status="AVAILABLE"]   .ac-bezel { background: linear-gradient(90deg, transparent, var(--as-st-available), transparent); opacity: 0.78; }
.ac[data-status="ALLOCATED"]   .ac-bezel { background: linear-gradient(90deg, transparent, var(--as-st-allocated), transparent); opacity: 0.78; }
.ac[data-status="RESERVED"]    .ac-bezel { background: linear-gradient(90deg, transparent, var(--as-st-reserved), transparent); opacity: 0.78; }
.ac[data-status="MAINTENANCE"] .ac-bezel { background: linear-gradient(90deg, transparent, var(--as-st-maintenance), transparent); opacity: 0.7; }
.ac[data-status="RETIRED"]     .ac-bezel { background: linear-gradient(90deg, transparent, var(--as-st-retired), transparent); opacity: 0.6; }

/* left status light-strip — glows + breathes */
.ac-light { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; transform: translateZ(2px);
  background: var(--st, var(--as-steel-dim)); box-shadow: 0 0 10px 0 var(--st, transparent); opacity: 0.85; }
.ac[data-status="AVAILABLE"]   .ac-light { --st: var(--as-st-available); }
.ac[data-status="ALLOCATED"]   .ac-light { --st: var(--as-st-allocated); }
.ac[data-status="RESERVED"]    .ac-light { --st: var(--as-st-reserved); }
.ac[data-status="MAINTENANCE"] .ac-light { --st: var(--as-st-maintenance); }
.ac[data-status="RETIRED"]     .ac-light { --st: var(--as-st-retired); }
.ac:hover .ac-light { animation: as-bay-pulse 2.4s ease-in-out infinite; }

/* faint blueprint grid sunk into the surface */
.ac-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.4s ease;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 90% at 90% 0%, #000, transparent 70%);
  -webkit-mask-image: radial-gradient(120% 90% at 90% 0%, #000, transparent 70%); }
.ac:hover .ac-grid { opacity: 1; }

/* chrome sheen sweep on hover */
.ac-sheen { position: absolute; inset: 0; pointer-events: none; background: var(--as-chrome-sheen); background-size: 240% 100%; background-position: 180% 0; opacity: 0; }
.ac:hover .ac-sheen { opacity: 0.14; animation: as-chrome-sheen 0.95s ease; }

/* one-shot scanline */
.ac-scan { position: absolute; left: 8%; right: 8%; top: 0; height: 2px; z-index: 2; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--accent, var(--as-amber)), transparent);
  box-shadow: 0 0 14px 1px var(--accent, var(--as-amber)); opacity: 0;
  animation: as-scanline 1.05s ease both; animation-delay: calc(var(--i) * 0.045s + 0.22s); }

/* ── header (depth layer) ── */
.ac-head { position: relative; display: flex; align-items: center; gap: 11px; transform: translateZ(26px); }
.ac-medallion { position: relative; display: inline-grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 13px; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent); }
.ac-medallion-ring { position: absolute; inset: -4px; border-radius: 16px; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--accent) 60%, transparent), transparent 55%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px));
  opacity: 0; transition: opacity 0.4s ease; }
.ac:hover .ac-medallion-ring { opacity: 0.9; animation: as-holo-spin 3.4s linear infinite; }
.ac-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ac-code { font-size: 13.5px; font-weight: 800; color: var(--as-text); letter-spacing: 0.02em; }
.ac-name { font-size: 12px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── meta chips (depth layer) ── */
.ac-meta { position: relative; display: flex; flex-wrap: wrap; gap: 6px; transform: translateZ(16px); }
.ac-chip { display: inline-flex; align-items: center; gap: 4px; font-family: var(--as-mono); font-size: 10.5px; font-weight: 600; color: var(--as-text-muted);
  padding: 3px 8px; border-radius: 7px; background: var(--as-tag-bg); border: 1px solid var(--as-border-soft); }
.ac-chip :deep(svg) { color: var(--as-steel-dim); }

/* ── footer (depth layer) ── */
.ac-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px solid var(--as-border-soft); transform: translateZ(22px); }
.ac-foot-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ac-cond { display: inline-flex; align-items: center; gap: 3px; }
.ac-seg { width: 13px; height: 5px; border-radius: 3px; background: var(--as-st-retired-soft); transform-origin: bottom; }
.ac-seg.on { background: var(--seg); box-shadow: 0 0 7px color-mix(in srgb, var(--seg) 65%, transparent); animation: as-seg-ignite 0.4s var(--as-spring) both; animation-delay: var(--sd); }
.ac-cond-lab { margin-left: 5px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
.ac-holder { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--as-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.ac-holder :deep(svg) { color: var(--as-amber); flex-shrink: 0; }

.ac-actions { display: flex; gap: 6px; flex-shrink: 0; }
.ac-act { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, transform 0.2s, opacity 0.3s; }
.ac-act:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: translateY(-2px); }
.ac-act.primary { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 30%, transparent); background: color-mix(in srgb, var(--as-amber) 10%, transparent); }
.ac-act.danger:hover { color: var(--as-cond-poor); border-color: color-mix(in srgb, var(--as-cond-poor) 34%, transparent); }

/* actions stay docked until hover on precise pointers (clean grid, reveals on intent) */
@media (hover: hover) and (pointer: fine) {
  .ac-act { opacity: 0; transform: translateX(8px); }
  .ac:hover .ac-act, .ac:focus-within .ac-act { opacity: 1; transform: translateX(0); }
  .ac:hover .ac-act:nth-child(1) { transition-delay: 0.02s; }
  .ac:hover .ac-act:nth-child(2) { transition-delay: 0.06s; }
  .ac:hover .ac-act:nth-child(3) { transition-delay: 0.1s; }
}

@media (prefers-reduced-motion: reduce) {
  .ac { animation: none; }
  .ac-scan, .ac-medallion-ring { display: none; }
  .ac-seg.on { animation: none; }
  .ac:hover .ac-light, .ac:hover .ac-sheen { animation: none; }
  .ac-act { opacity: 1 !important; transform: none !important; }
}
</style>
