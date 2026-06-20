<template>
  <span class="as-stamp" :data-status="value">
    <span class="dot" />{{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta, allocStatusMeta, conditionMeta } from '@/composables/useAssets'

const props = defineProps({
  value: { type: String, required: true },
  kind: { type: String, default: 'status' }, // status | allocation | condition
})
const label = computed(() => {
  if (props.kind === 'allocation') return allocStatusMeta(props.value).label
  if (props.kind === 'condition') return conditionMeta(props.value).label
  return statusMeta(props.value).label
})
</script>

<style scoped>
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
</style>
