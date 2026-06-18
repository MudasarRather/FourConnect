<template>
  <div class="traj" :class="[`s-${status.toLowerCase()}`, { overdue, compact }]" :style="{ '--c': color }">
    <span class="traj-node start" :class="{ lit: true }" aria-hidden="true" />
    <span class="traj-track" aria-hidden="true">
      <span class="traj-fill" :style="{ width: (ready ? pct : 0) + '%' }">
        <span v-if="moving" class="traj-comet" />
      </span>
      <span v-if="status === 'IN_PROGRESS' && !overdue" class="traj-sweep" />
    </span>
    <span class="traj-node end" :class="{ lit: pct >= 99 }" aria-hidden="true">
      <Check v-if="status === 'COMPLETED'" :size="9" />
      <X v-else-if="status === 'FAILED'" :size="9" />
    </span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Check, X } from 'lucide-vue-next'

const props = defineProps({
  status: { type: String, default: 'NOT_STARTED' },
  overdue: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const MAP = {
  NOT_STARTED: { pct: 5, color: 'var(--trn-st-not-started)' },
  IN_PROGRESS: { pct: 52, color: 'var(--trn-st-in-progress)' },
  COMPLETED: { pct: 100, color: 'var(--trn-st-completed)' },
  FAILED: { pct: 64, color: 'var(--trn-st-failed)' },
  WAIVED: { pct: 100, color: 'var(--trn-st-waived)' },
}
const meta = computed(() => MAP[props.status] || MAP.NOT_STARTED)
const pct = computed(() => meta.value.pct)
const color = computed(() => props.overdue ? 'var(--trn-st-failed)' : meta.value.color)
const moving = computed(() => props.status === 'IN_PROGRESS')

const ready = ref(false)
onMounted(async () => { await nextTick(); requestAnimationFrame(() => { ready.value = true }) })
</script>

<style scoped>
.traj { display: flex; align-items: center; gap: 0; width: 100%; min-width: 90px; }
.traj-track { position: relative; flex: 1; height: 4px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface-elevated); box-shadow: inset 0 0 0 1px var(--trn-border-soft); }
.traj-fill { position: relative; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, transparent), var(--c));
  transition: width 1.1s var(--trn-spring); box-shadow: 0 0 10px -2px var(--c); }
.traj-comet { position: absolute; right: -2px; top: 50%; width: 7px; height: 7px; border-radius: 50%; transform: translateY(-50%);
  background: var(--c); box-shadow: 0 0 10px 1px var(--c); animation: trn-pulse-dot 2s ease-out infinite; }
.traj-sweep { position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, color-mix(in srgb, var(--c) 60%, #fff) 50%, transparent 70%);
  background-size: 220% 100%; animation: trn-sheen 2.4s linear infinite; }
.traj-node { display: grid; place-items: center; width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; z-index: 1;
  background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); color: #1a1206; }
.traj-node.start { margin-right: -2px; }
.traj-node.end { margin-left: -2px; }
.traj-node.lit { background: var(--c); border-color: var(--c); box-shadow: 0 0 9px -1px var(--c); }
.traj-node :deep(svg) { stroke-width: 3; }
.traj.compact .traj-track { height: 3px; }
.traj.overdue .traj-comet { animation-duration: 1s; }
@media (prefers-reduced-motion: reduce) {
  .traj-fill { transition: none; }
  .traj-comet, .traj-sweep { animation: none; }
}
</style>
