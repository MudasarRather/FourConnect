<template>
  <span class="leave-chip" :class="meta.pillClass" role="status">
    <span class="chip-dot" :class="{ pulse: pulse }" />
    <span class="chip-label">{{ meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusMeta } from '@/composables/useLeaves'

const props = defineProps({
  status: { type: String, required: true },
  // Pulse the dot for in-flight statuses (manager/HR review)
  pulse: { type: Boolean, default: undefined },
})
const meta = computed(() => statusMeta(props.status))
</script>

<style scoped>
.leave-chip {
  --chip-fg: currentColor;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid currentColor;
  line-height: 1.2;
  isolation: isolate;
  white-space: nowrap;
}
.leave-chip .chip-label {
  color: var(--chip-fg);
}
.leave-chip .chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.leave-chip .chip-dot.pulse {
  animation: leave-chip-dot 1.6s ease-in-out infinite;
}
@keyframes leave-chip-dot {
  0%, 100% { transform: scale(1);   opacity: 0.7; }
  50%      { transform: scale(1.45); opacity: 1; }
}

.leave-chip.draft        { color: var(--leave-draft);        background: var(--leave-draft-soft); }
.leave-chip.pending-mgr  { color: var(--leave-pending-mgr);  background: var(--leave-pending-mgr-soft); }
.leave-chip.pending-hr   { color: var(--leave-pending-hr);   background: var(--leave-pending-hr-soft); }
.leave-chip.approved     { color: var(--leave-approved);     background: var(--leave-approved-soft); }
.leave-chip.rejected     { color: var(--leave-rejected);     background: var(--leave-rejected-soft); }
.leave-chip.mgr-rejected { color: var(--leave-mgr-rejected); background: var(--leave-mgr-rejected-soft); }
.leave-chip.cancelled    { color: var(--leave-cancelled);    background: var(--leave-cancelled-soft); }
.leave-chip.withdrawn    { color: var(--leave-withdrawn);    background: var(--leave-withdrawn-soft); }
/* Lapsed — a faded ember/amber to read "expired, never actioned" */
.leave-chip.lapsed       { color: #b45309;                   background: rgba(180, 83, 9, 0.12); }
[data-theme="light"] .leave-chip.lapsed { color: #92400e; background: rgba(146, 64, 14, 0.12); }
</style>
