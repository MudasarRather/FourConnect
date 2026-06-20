<template>
  <div class="alr" ref="root">
    <div v-for="(s, i) in stages" :key="s.key" class="alr-stage" :class="{ active: s.key === current, passed: i < currentIndex }">
      <span class="alr-node">
        <component :is="s.icon" :size="14" />
        <span class="alr-pulse" v-if="s.key === current" aria-hidden="true" />
      </span>
      <span class="alr-label">{{ s.label }}</span>
      <span v-if="i < stages.length - 1" class="alr-link" aria-hidden="true"><span class="alr-link-fill" /></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PackagePlus, Send, Wrench, Undo2, Archive } from 'lucide-vue-next'

const props = defineProps({
  status: { type: String, default: 'AVAILABLE' },
})
const root = ref(null)
// Linear lifecycle backbone the asset travels along.
const stages = [
  { key: 'AVAILABLE', label: 'In stock', icon: PackagePlus },
  { key: 'ALLOCATED', label: 'In use', icon: Send },
  { key: 'MAINTENANCE', label: 'Service', icon: Wrench },
  { key: 'RETURNED', label: 'Returned', icon: Undo2 },
  { key: 'RETIRED', label: 'Retired', icon: Archive },
]
const ORDER = { AVAILABLE: 0, RESERVED: 0, ALLOCATED: 1, MAINTENANCE: 2, RETIRED: 4 }
const current = computed(() => (props.status === 'RESERVED' ? 'AVAILABLE' : props.status))
const currentIndex = computed(() => ORDER[props.status] ?? 0)
</script>

<style scoped>
.alr { display: flex; align-items: flex-start; gap: 0; width: 100%; }
.alr-stage { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; }
.alr-node { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; z-index: 1;
  color: var(--as-text-dim); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.4s var(--as-spring); }
.alr-stage.passed .alr-node { color: var(--as-st-available); border-color: color-mix(in srgb, var(--as-st-available) 40%, transparent); background: var(--as-st-available-soft); }
.alr-stage.active .alr-node { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 50%, transparent);
  background: color-mix(in srgb, var(--as-amber) 14%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--as-amber) 10%, transparent); transform: scale(1.08); }
.alr-pulse { position: absolute; inset: -4px; border-radius: 15px; border: 1.5px solid color-mix(in srgb, var(--as-amber) 50%, transparent); animation: as-pulse-dot 2s ease-out infinite; }
.alr-label { font-size: 10.5px; font-weight: 600; color: var(--as-text-muted); text-align: center; }
.alr-stage.active .alr-label { color: var(--as-text); }
.alr-link { position: absolute; top: 19px; left: 50%; width: 100%; height: 2px; background: var(--as-border-soft); z-index: 0; overflow: hidden; }
.alr-link-fill { position: absolute; inset: 0; width: 0; background: var(--as-st-available); transition: width 0.5s var(--as-spring); }
.alr-stage.passed .alr-link .alr-link-fill { width: 100%; }
@media (prefers-reduced-motion: reduce) { .alr-pulse { animation: none; } }
</style>
