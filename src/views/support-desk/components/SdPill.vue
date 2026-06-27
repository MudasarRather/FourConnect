<template>
  <span class="sd-pill" :style="{ '--pc': color }" :title="title || label">
    <span class="sd-pill-dot" />
    <span class="sd-pill-label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  kind: { type: String, default: 'status' }, // status | priority | sla
  value: { type: String, default: '' },
  title: { type: String, default: '' },
})

const STATUS = {
  open: ['--sd-st-open', 'Open'],
  in_progress: ['--sd-st-progress', 'In Progress'],
  pending_customer: ['--sd-st-pending', 'Pending Customer'],
  pending_vendor: ['--sd-st-pending', 'Pending Vendor'],
  escalated: ['--sd-st-escalated', 'Escalated'],
  resolved: ['--sd-st-resolved', 'Resolved'],
  closed: ['--sd-st-closed', 'Closed'],
}
const PRIORITY = {
  low: ['--sd-pri-low', 'Low'],
  medium: ['--sd-pri-medium', 'Medium'],
  high: ['--sd-pri-high', 'High'],
  urgent: ['--sd-pri-urgent', 'Urgent'],
  critical: ['--sd-pri-critical', 'Critical'],
}
const SLA = {
  ok: ['--sd-steel', 'On track'],
  'due-soon': ['--sd-warning', 'Due soon'],
  breached: ['--sd-danger', 'Breached'],
  met: ['--sd-success', 'Met'],
}

const map = computed(() => (props.kind === 'priority' ? PRIORITY : props.kind === 'sla' ? SLA : STATUS))
const entry = computed(() => map.value[props.value] || ['--sd-steel', props.value || '—'])
const color = computed(() => `var(${entry.value[0]})`)
const label = computed(() => entry.value[1])
</script>

<style scoped>
.sd-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.01em;
  color: var(--pc);
  background: color-mix(in srgb, var(--pc) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--pc) 32%, transparent);
  white-space: nowrap;
}
.sd-pill-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--pc);
  box-shadow: 0 0 8px color-mix(in srgb, var(--pc) 60%, transparent);
}
</style>
