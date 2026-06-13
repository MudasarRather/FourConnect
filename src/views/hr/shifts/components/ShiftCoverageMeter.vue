<template>
  <div class="cov-meter" :data-status="status">
    <div class="cm-head">
      <span class="cm-label">
        <span v-if="critical" class="cm-crit" title="Critical position"><AlertTriangle :size="11" /></span>
        {{ label }}
      </span>
      <span class="cm-count">
        <b>{{ assigned }}</b><span class="cm-sep">/</span>{{ required }}
      </span>
    </div>
    <div class="cm-track">
      <div class="cm-fill" :style="{ width: pct + '%' }" />
      <span class="cm-req-marker" />
    </div>
    <div class="cm-foot">
      <ShiftStatusPill :tone="status === 'OK' ? 'ok' : (status === 'CRITICAL' ? 'alert' : 'warn')">
        {{ status === 'OK' ? 'Covered' : (shortfall + ' short') }}
      </ShiftStatusPill>
      <span v-if="sub" class="cm-sub">{{ sub }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import ShiftStatusPill from './ShiftStatusPill.vue'

const props = defineProps({
  label: { type: String, default: '' },
  required: { type: Number, default: 0 },
  assigned: { type: Number, default: 0 },
  critical: { type: Boolean, default: false },
  sub: { type: String, default: '' },
})
const shortfall = computed(() => Math.max(0, props.required - props.assigned))
const pct = computed(() => props.required ? Math.min(100, (props.assigned / props.required) * 100) : 100)
const status = computed(() => {
  if (shortfall.value <= 0) return 'OK'
  return props.critical ? 'CRITICAL' : 'WARN'
})
</script>

<style scoped>
.cov-meter { display: flex; flex-direction: column; gap: 8px; padding: 13px 14px; border-radius: 14px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.cm-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cm-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--shift-text); }
.cm-crit { color: var(--shift-alert); display: inline-flex; }
.cm-count { font-family: var(--shift-mono); font-size: 12px; color: var(--shift-text-muted); }
.cm-count b { color: var(--shift-text); font-size: 14px; }
.cm-sep { margin: 0 2px; opacity: 0.5; }
.cm-track { position: relative; height: 8px; border-radius: 999px; background: rgba(148,163,184,0.14); overflow: hidden; }
.cm-fill { height: 100%; border-radius: 999px; transition: width 0.9s var(--shift-ease); }
.cm-foot { display: flex; align-items: center; gap: 10px; }
.cm-sub { font-size: 10.5px; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.cov-meter[data-status="OK"] .cm-fill { background: linear-gradient(90deg, var(--shift-ok-strong), var(--shift-ok)); }
.cov-meter[data-status="WARN"] .cm-fill { background: linear-gradient(90deg, var(--shift-amber-strong), var(--shift-ember)); }
.cov-meter[data-status="CRITICAL"] .cm-fill { background: linear-gradient(90deg, var(--shift-alert), #f87171); }
.cov-meter[data-status="CRITICAL"] { border-color: color-mix(in srgb, var(--shift-alert) 30%, transparent); }
@media (prefers-reduced-motion: reduce) { .cm-fill { transition: none; } }
</style>
