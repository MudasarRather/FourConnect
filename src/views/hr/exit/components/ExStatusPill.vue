<template>
  <span class="ex-pill" :style="{ '--c': meta.hex }">
    <component :is="meta.icon" v-if="meta.icon && icon" :size="12" />
    <span>{{ meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import {
  caseStatusMeta, clearanceStatusMeta, settlementStatusMeta,
  letterStatusMeta, interviewStatusMeta,
} from '@/composables/useExit'

const props = defineProps({
  status: { type: String, required: true },
  kind: { type: String, default: 'case' }, // case | clearance | settlement | letter | interview
  icon: { type: Boolean, default: true },
})
const RESOLVERS = {
  case: caseStatusMeta, clearance: clearanceStatusMeta, settlement: settlementStatusMeta,
  letter: letterStatusMeta, interview: interviewStatusMeta,
}
const meta = computed(() => (RESOLVERS[props.kind] || caseStatusMeta)(props.status))
</script>

<style scoped>
.ex-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
}
</style>
