<template>
  <span class="trn-type-badge" :style="{ '--c': `var(${meta.cssVar})` }">
    <span class="tb-dot" aria-hidden="true" />{{ meta.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { typeMeta } from '@/composables/useTraining'
const props = defineProps({ type: { type: String, default: 'OTHER' } })
const meta = computed(() => typeMeta(props.type))
</script>

<style scoped>
.trn-type-badge {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
}
.tb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
</style>
