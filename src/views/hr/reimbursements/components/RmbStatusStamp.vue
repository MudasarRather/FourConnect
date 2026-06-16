<template>
  <span class="rmb-stamp" :class="{ 'is-fresh': fresh }" :data-status="status">
    <component :is="meta.icon" :size="11" :stroke-width="2.6" />
    {{ meta.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta } from '@/composables/useReimbursements'

const props = defineProps({
  status: { type: String, default: 'DRAFT' },
  fresh: { type: Boolean, default: false },
})
const meta = computed(() => statusMeta(props.status))
</script>
