<template>
  <span class="trv-pill" :class="`tone-${meta.tone || 'draft'}`" :style="{ '--c': meta.hex }">
    <component :is="meta.icon" v-if="meta.icon && icon" :size="12" />
    <span>{{ meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta } from '@/composables/useTravel'

const props = defineProps({
  status: { type: String, required: true },
  icon: { type: Boolean, default: true },
})
const meta = computed(() => statusMeta(props.status))
</script>

<style scoped>
.trv-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
}
</style>
