<template>
  <span class="att-status-pill" :data-status="status" :class="{ sm: size === 'sm' }">
    <span class="dot" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'PRESENT' },
  size: { type: String, default: 'md' },
})

const labels = {
  PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late', HALF_DAY: 'Half-day',
  LEAVE: 'Leave', WFH: 'WFH', REMOTE: 'Remote', HOLIDAY: 'Holiday',
  WEEK_OFF: 'Week-off', ON_DUTY: 'On duty', LWP: 'LWP',
}
const label = computed(() => labels[props.status] || props.status)
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  background: var(--att-status-present-bg);
  color: var(--att-status-present-fg);
  border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
}
.att-status-pill.sm { padding: 2px 7px; font-size: 9.5px; }
.dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; box-shadow: 0 0 6px currentColor;
}

.att-status-pill[data-status="PRESENT"]   { background: var(--att-status-present-bg);   color: var(--att-status-present-fg); }
.att-status-pill[data-status="ABSENT"]    { background: var(--att-status-absent-bg);    color: var(--att-status-absent-fg); }
.att-status-pill[data-status="LATE"]      { background: var(--att-status-late-bg);      color: var(--att-status-late-fg); }
.att-status-pill[data-status="HALF_DAY"]  { background: var(--att-status-halfday-bg);   color: var(--att-status-halfday-fg); }
.att-status-pill[data-status="LEAVE"]     { background: var(--att-status-leave-bg);     color: var(--att-status-leave-fg); }
.att-status-pill[data-status="WFH"]       { background: var(--att-status-wfh-bg);       color: var(--att-status-wfh-fg); }
.att-status-pill[data-status="REMOTE"]    { background: var(--att-status-remote-bg);    color: var(--att-status-remote-fg); }
.att-status-pill[data-status="HOLIDAY"]   { background: var(--att-status-holiday-bg);   color: var(--att-status-holiday-fg); }
.att-status-pill[data-status="WEEK_OFF"]  { background: var(--att-status-weekoff-bg);   color: var(--att-status-weekoff-fg); }
.att-status-pill[data-status="ON_DUTY"]   { background: var(--att-status-onduty-bg);    color: var(--att-status-onduty-fg); }
/* LWP — authorised unpaid leave (no clock-in, covered by LWP balance). A
   caution amber distinct from LATE so it reads as "absent-but-accounted". */
.att-status-pill[data-status="LWP"]       { background: rgba(180, 83, 9, 0.16);          color: #b45309; }
[data-theme="light"] .att-status-pill[data-status="LWP"] { background: rgba(180, 83, 9, 0.14); color: #92400e; }
</style>
