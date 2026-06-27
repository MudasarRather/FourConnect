<template>
  <span class="ps-stamp" :style="{ '--c': meta.color }">
    <component :is="meta.icon" :size="size === 'sm' ? 11 : 12" />
    {{ label || meta.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta } from '@/composables/usePerformance'
// `label` overrides the displayed text (keeps the status colour + icon) — used so the
// manager drawer can show "Awaiting your review" instead of the generic "Self-reflection".
const props = defineProps({ status: { type: String, default: 'DRAFT' }, size: { type: String, default: 'md' }, label: { type: String, default: '' } })
const meta = computed(() => statusMeta(props.status))
</script>

<style scoped>
.ps-stamp { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
</style>
