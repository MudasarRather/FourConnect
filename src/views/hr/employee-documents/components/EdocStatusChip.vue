<template>
  <span class="edoc-chip" :data-s="status">
    <span class="dot" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'PENDING' },
})

const LABELS = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  RESUBMIT_REQUIRED: 'Resubmit',
  EXPIRED: 'Expired',
}
const label = computed(() => LABELS[props.status] || props.status)
</script>
