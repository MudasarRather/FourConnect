<template>
  <div class="cov-meter" :data-status="status">
    <div class="cm-head">
      <span class="cm-label">
        <span v-if="critical" class="cm-crit" title="Critical position"><AlertTriangle :size="11" /></span>
        {{ label }}
      </span>
      <span class="cm-count">
        <b><ShiftCountUp :value="assigned" /></b><span class="cm-sep">/</span>{{ required }}
      </span>
    </div>
    <div class="cm-track">
      <div class="cm-fill" :style="{ width: pct + '%' }"><span class="cm-flow" /></div>
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
import ShiftCountUp from './ShiftCountUp.vue'

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
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s, transform 0.25s; }
.cov-meter:hover { transform: translateY(-2px); border-color: var(--shift-border); }
.cm-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cm-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--shift-text); }
.cm-crit { color: var(--shift-alert); display: inline-flex; }
.cm-count { font-family: var(--shift-mono); font-size: 12px; color: var(--shift-text-muted); }
.cm-count b { color: var(--shift-text); font-size: 14px; }
.cm-sep { margin: 0 2px; opacity: 0.5; }
.cm-track { position: relative; height: 8px; border-radius: 999px; background: rgba(148,163,184,0.14); overflow: hidden; }
.cm-fill { position: relative; height: 100%; border-radius: 999px; overflow: hidden;
  transition: width 1s var(--shift-ease); animation: cm-grow 1s var(--shift-ease) both; }
.cm-flow { position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
  background-size: 220% 100%; animation: cm-flow 2.4s linear infinite; }
.cm-foot { display: flex; align-items: center; gap: 10px; }
.cm-sub { font-size: 10.5px; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.cov-meter[data-status="OK"] .cm-fill { background: linear-gradient(90deg, var(--shift-ok-strong), var(--shift-ok)); }
.cov-meter[data-status="WARN"] .cm-fill { background: linear-gradient(90deg, var(--shift-amber-strong), var(--shift-ember)); }
.cov-meter[data-status="CRITICAL"] .cm-fill { background: linear-gradient(90deg, var(--shift-alert), #f87171); }
.cov-meter[data-status="CRITICAL"] { border-color: color-mix(in srgb, var(--shift-alert) 30%, transparent); }

@keyframes cm-grow { from { transform: scaleX(0.04); transform-origin: left; } to { transform: scaleX(1); } }
@keyframes cm-flow { 0% { background-position: 130% 0; } 100% { background-position: -60% 0; } }

@media (prefers-reduced-motion: reduce) { .cm-fill, .cm-flow { transition: none; animation: none; } .cm-flow { display: none; } }
</style>
