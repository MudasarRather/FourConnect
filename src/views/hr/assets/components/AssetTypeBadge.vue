<template>
  <span class="atb" :class="{ medallion }" :style="{ '--accent': `var(${cssVar})` }" :title="label">
    <span class="atb-ring" aria-hidden="true" />
    <component :is="icon" :size="medallion ? 18 : 14" />
    <span v-if="showLabel" class="atb-label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import {
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package,
} from 'lucide-vue-next'
import { typeMeta } from '@/composables/useAssets'

const props = defineProps({
  type: { type: String, default: 'OTHER' },
  showLabel: { type: Boolean, default: false },
  medallion: { type: Boolean, default: false },
})
const ICONS = {
  LAPTOP: Laptop, DESKTOP: HardDrive, MONITOR: Monitor, MOBILE: Smartphone,
  SIM: CreditCard, RFID_CARD: CreditCard, ID_CARD: CreditCard, HEADSET: Headphones,
  KEYBOARD: Keyboard, MOUSE: Mouse, VEHICLE: Car, KEYS: KeyRound, OTHER: Package,
}
const icon = computed(() => ICONS[props.type] || Package)
const meta = computed(() => typeMeta(props.type))
const label = computed(() => meta.value.label)
const cssVar = computed(() => meta.value.cssVar)
</script>

<style scoped>
.atb { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); }
.atb-label { font-size: 12px; font-weight: 600; color: var(--as-text-secondary); }
.atb.medallion {
  position: relative; display: inline-grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0;
  border-radius: 13px; background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}
.atb.medallion .atb-ring {
  position: absolute; inset: -3px; border-radius: 16px; pointer-events: none;
  background: var(--as-bezel-ring); opacity: 0.18; -webkit-mask: linear-gradient(#000,#000) content-box, linear-gradient(#000,#000);
  -webkit-mask-composite: xor; mask-composite: exclude; padding: 1px;
}
</style>
