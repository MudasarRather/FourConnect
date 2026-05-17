<template>
  <span class="lifecycle-badge" :class="tone" :title="title">
    <span class="dot" :class="{ pulse: isPulsing }" />
    <span class="label">{{ display }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  state: { type: String, required: true },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
})

const STATE_TO_TONE = {
  ACTIVE: { tone: 'active', label: 'Active' },
  ON_PROBATION: { tone: 'probation', label: 'On Probation' },
  ON_NOTICE: { tone: 'notice', label: 'On Notice' },
  SUSPENDED: { tone: 'suspended', label: 'Suspended' },
  INACTIVE: { tone: 'inactive', label: 'Inactive' },
  EXITED: { tone: 'exited', label: 'Exited' },
  ARCHIVED: { tone: 'archived', label: 'Archived' },
}

const cfg = computed(() => STATE_TO_TONE[props.state] || { tone: 'inactive', label: props.state })
const tone = computed(() => [`tone-${cfg.value.tone}`, `size-${props.size}`])
const display = computed(() => cfg.value.label)
const title = computed(() => `Lifecycle state: ${cfg.value.label}`)
const isPulsing = computed(() => ['probation', 'notice'].includes(cfg.value.tone))
</script>

<style scoped>
.lifecycle-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
  letter-spacing: 0.2px;
  white-space: nowrap;
}
.size-sm { padding: 2px 8px; font-size: 10px; }
.size-md { padding: 4px 10px; font-size: 11px; }
.size-lg { padding: 6px 14px; font-size: 12px; }

.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
}
.dot.pulse { animation: hr-pulse-dot 2s ease-in-out infinite; }

.tone-active    {
  background: linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.06));
  color: var(--hr-active); border-color: rgba(52,211,153,0.32);
  box-shadow: inset 0 0 0 1px rgba(52,211,153,0.06);
}
.tone-probation {
  background: linear-gradient(135deg, rgba(251,191,36,0.20), rgba(251,191,36,0.06));
  color: var(--hr-probation); border-color: var(--hr-accent-gold-border);
  box-shadow: inset 0 0 0 1px rgba(251,191,36,0.06);
}
.tone-notice {
  background: linear-gradient(135deg, rgba(251,146,60,0.18), rgba(251,146,60,0.06));
  color: var(--hr-notice); border-color: rgba(251,146,60,0.32);
  box-shadow: inset 0 0 0 1px rgba(251,146,60,0.06);
}
.tone-suspended {
  background: linear-gradient(135deg, rgba(248,113,113,0.18), rgba(248,113,113,0.06));
  color: var(--hr-suspended); border-color: rgba(248,113,113,0.32);
}
.tone-inactive {
  background: linear-gradient(135deg, rgba(156,163,175,0.12), rgba(156,163,175,0.04));
  color: var(--hr-inactive); border-color: rgba(156,163,175,0.22);
}
.tone-exited {
  background: linear-gradient(135deg, rgba(192,132,252,0.18), rgba(192,132,252,0.06));
  color: var(--hr-exited); border-color: rgba(192,132,252,0.32);
}
.tone-archived {
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  color: var(--hr-text-muted); border-color: var(--hr-border);
}
</style>
