<template>
  <span class="pay-chip" :class="meta.pillClass" role="status">
    <span class="chip-dot" :class="{ pulse: pulse }" />
    <span>{{ meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta } from '@/composables/usePayroll'

const props = defineProps({
  status: { type: String, required: true },
  pulse: { type: Boolean, default: false },
})
const meta = computed(() => statusMeta(props.status))
</script>
