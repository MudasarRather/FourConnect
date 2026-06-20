<template>
  <article class="alc" ref="root" :data-mode="reserved ? 'reserved' : 'ready'" :class="{ launching, reduced }"
    :style="{ '--i': index, '--accent': `var(${typeVar})` }">
    <span class="alc-scan" aria-hidden="true" />
    <span class="alc-launch-beam" aria-hidden="true" />

    <div class="alc-tilt">
      <span class="alc-edge" aria-hidden="true" />
      <span class="alc-grid" aria-hidden="true" />
      <span class="alc-sheen" aria-hidden="true" />
      <span class="as-spotlight" aria-hidden="true" />

      <div class="alc-body">
        <span class="alc-medallion">
          <span class="alc-medallion-ring" aria-hidden="true" />
          <component :is="typeIcon" :size="19" />
        </span>
        <div class="alc-id">
          <span class="alc-code as-mono">{{ asset.asset_code }}</span>
          <span class="alc-name">{{ asset.brand || '' }} {{ asset.model || typeLabel }}</span>
          <span class="alc-cond" :title="`Condition: ${condMeta.label}`">
            <span v-for="n in 4" :key="n" class="alc-seg" :class="{ on: n <= condMeta.level }"
              :style="{ '--seg': condColors[n - 1], '--sd': `${0.12 * n + index * 0.03}s` }" />
            <span class="alc-cond-lab">{{ condMeta.label }}</span>
          </span>
        </div>
        <span v-if="reserved" class="alc-flag">Reserved</span>
      </div>

      <div class="alc-foot">
        <span v-if="asset.serial_number" class="alc-chip"><Barcode :size="10" />{{ asset.serial_number }}</span>
        <span v-else-if="asset.tag" class="alc-chip"><QrCode :size="10" />{{ asset.tag }}</span>
        <span v-else class="alc-chip muted"><Boxes :size="10" />{{ typeLabel }}</span>

        <div class="alc-actions">
          <button class="alc-ghost" title="Movement log" @click.stop="$emit('detail', asset.id)"><Eye :size="13" /></button>
          <button v-if="reserved" class="as-btn as-btn-steel alc-deploy" :disabled="busy" @click.stop="$emit('release', asset)" title="Release back to ready bay">
            <Loader v-if="busy" :size="13" class="spin" /><Unlock v-else :size="13" /> Release
          </button>
          <button v-else class="as-btn as-btn-primary alc-deploy" @click.stop="onDeploy" title="Deploy to employee">
            <Send :size="13" /> Deploy
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Barcode, QrCode, Boxes, Send, Eye, Unlock, Loader,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import { typeMeta, conditionMeta } from '@/composables/useAssets'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  asset: { type: Object, required: true },
  index: { type: Number, default: 0 },
  reserved: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['deploy', 'release', 'detail'])

const root = ref(null)
usePointerSpotlight(root)
const reduced = prefersReduced()
const launching = ref(false)

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

function onDeploy() {
  if (!reduced) {
    launching.value = true
    setTimeout(() => { launching.value = false }, 460)
  }
  emit('deploy', props.asset)
}
</script>

<style scoped>
.alc { position: relative; perspective: 1000px; border-radius: 18px;
  animation: as-deal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.05s); }
.alc.launching { animation: alc-launch 0.46s cubic-bezier(0.36, 0, 0.66, -0.2) both; }

.alc-tilt { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 14px 14px 12px; border-radius: 18px;
  transform-style: preserve-3d; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: rotateX(calc((0.5 - var(--my, 0.5)) * 6deg * var(--spot, 0))) rotateY(calc((var(--mx, 0.5) - 0.5) * 9deg * var(--spot, 0))) translateY(var(--lift, 0px));
  transition: transform 0.34s var(--as-spring), box-shadow 0.34s var(--as-spring), border-color 0.34s; }
.alc:hover .alc-tilt { --lift: -5px; box-shadow: var(--as-card-shadow-hover); border-color: var(--as-border-strong); }

/* left status edge */
.alc-edge { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; transform: translateZ(2px);
  background: var(--as-st-available); box-shadow: 0 0 10px 0 var(--as-st-available); opacity: 0.9; }
.alc[data-mode="reserved"] .alc-edge { background: var(--as-st-reserved); box-shadow: 0 0 10px 0 var(--as-st-reserved); }
.alc:hover .alc-edge { animation: as-bay-pulse 2.4s ease-in-out infinite; }

.alc-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.4s ease;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 90% at 92% 0%, #000, transparent 70%); -webkit-mask-image: radial-gradient(120% 90% at 92% 0%, #000, transparent 70%); }
.alc:hover .alc-grid { opacity: 1; }
.alc-sheen { position: absolute; inset: 0; pointer-events: none; background: var(--as-chrome-sheen); background-size: 240% 100%; background-position: 180% 0; opacity: 0; }
.alc:hover .alc-sheen { opacity: 0.13; animation: as-chrome-sheen 0.95s ease; }

/* one-shot scanline on deal-in */
.alc-scan { position: absolute; left: 7%; right: 7%; top: 0; height: 2px; z-index: 2; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--accent, var(--as-amber)), transparent); box-shadow: 0 0 14px 1px var(--accent, var(--as-amber));
  opacity: 0; animation: as-scanline 1s ease both; animation-delay: calc(var(--i) * 0.05s + 0.2s); }
/* launch beam flares when deploying */
.alc-launch-beam { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: 0; border-radius: 18px;
  background: radial-gradient(120% 60% at 50% 120%, color-mix(in srgb, var(--as-amber) 55%, transparent), transparent 60%); }
.alc.launching .alc-launch-beam { animation: alc-beam 0.46s ease both; }

.alc-body { position: relative; display: flex; align-items: center; gap: 11px; transform: translateZ(22px); }
.alc-medallion { position: relative; display: inline-grid; place-items: center; width: 42px; height: 42px; flex-shrink: 0; border-radius: 12px; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent); }
.alc-medallion-ring { position: absolute; inset: -4px; border-radius: 15px; pointer-events: none; opacity: 0; transition: opacity 0.4s ease;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--accent) 60%, transparent), transparent 55%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px)); }
.alc:hover .alc-medallion-ring { opacity: 0.9; animation: as-holo-spin 3.4s linear infinite; }
.alc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.alc-code { font-size: 13.5px; font-weight: 800; color: var(--as-text); letter-spacing: 0.02em; }
.alc-name { font-size: 11.5px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alc-cond { display: inline-flex; align-items: center; gap: 3px; margin-top: 2px; }
.alc-seg { width: 12px; height: 4px; border-radius: 2px; background: var(--as-st-retired-soft); transform-origin: bottom; }
.alc-seg.on { background: var(--seg); box-shadow: 0 0 6px color-mix(in srgb, var(--seg) 60%, transparent); animation: as-seg-ignite 0.4s var(--as-spring) both; animation-delay: var(--sd); }
.alc-cond-lab { margin-left: 5px; font-size: 10.5px; font-weight: 600; color: var(--as-text-dim); }

.alc-flag { flex-shrink: 0; align-self: flex-start; font-family: var(--as-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-st-reserved); background: var(--as-st-reserved-soft); padding: 3px 8px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--as-st-reserved) 30%, transparent); }

.alc-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px solid var(--as-border-soft); transform: translateZ(16px); }
.alc-chip { display: inline-flex; align-items: center; gap: 4px; font-family: var(--as-mono); font-size: 10px; font-weight: 600; color: var(--as-text-muted);
  padding: 3px 8px; border-radius: 7px; background: var(--as-tag-bg); border: 1px solid var(--as-border-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.alc-chip.muted :deep(svg), .alc-chip :deep(svg) { color: var(--as-steel-dim); flex-shrink: 0; }
.alc-actions { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
.alc-ghost { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, transform 0.2s; }
.alc-ghost:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: translateY(-2px); }
.alc-deploy { padding: 8px 13px; font-size: 12.5px; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes alc-launch { 0% { transform: none; } 100% { opacity: 0; transform: translateY(-26px) scale(0.96); filter: blur(3px); } }
@keyframes alc-beam { 0% { opacity: 0; } 35% { opacity: 1; } 100% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .alc, .alc.launching { animation: none; }
  .alc-scan, .alc-medallion-ring { display: none; }
  .alc-seg.on { animation: none; }
  .alc:hover .alc-edge, .alc:hover .alc-sheen { animation: none; }
}
</style>
