<template>
  <span class="trn-stamp" :class="{ 'is-fresh': fresh }" :data-status="status">
    <span class="dot" aria-hidden="true" />{{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta, certStatusMeta } from '@/composables/useTraining'

const props = defineProps({
  status: { type: String, required: true },
  fresh: { type: Boolean, default: false },
  kind: { type: String, default: 'assignment' }, // assignment | cert | request | raw
  labelOverride: { type: String, default: '' },
})

const label = computed(() => {
  if (props.labelOverride) return props.labelOverride
  if (props.kind === 'cert') return certStatusMeta(props.status).label
  if (props.kind === 'assignment') return statusMeta(props.status).label
  // request / raw — humanise
  return props.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
})
</script>

<style scoped>
.trn-stamp .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.trn-stamp.is-fresh { animation: trn-stamp-press 0.5s var(--trn-spring) both; }
@keyframes trn-stamp-press {
  0% { transform: scale(1.4); opacity: 0; }
  60% { transform: scale(0.94); opacity: 1; }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .trn-stamp.is-fresh { animation: none; } }
</style>
