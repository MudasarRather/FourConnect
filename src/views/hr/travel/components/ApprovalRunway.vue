<template>
  <div class="runway" :class="{ compact }">
    <div class="rw-strip">
      <span class="rw-centerline" aria-hidden="true" />
      <!-- gates -->
      <div class="rw-gates">
        <div v-for="(g, i) in gates" :key="i" class="rw-gate" :class="g.state">
          <span class="rw-node">
            <component :is="g.ico" :size="13" />
          </span>
          <span class="rw-glabel">{{ g.typeLabel }}</span>
          <span v-if="g.decided_by_name" class="rw-gby">{{ g.decided_by_name }}</span>
        </div>
        <!-- takeoff terminal -->
        <div class="rw-gate" :class="terminalState">
          <span class="rw-node takeoff"><PlaneTakeoff :size="13" /></span>
          <span class="rw-glabel">Takeoff</span>
        </div>
      </div>
      <!-- taxiing plane -->
      <span class="rw-plane" :style="{ left: planeLeft + '%' }" aria-hidden="true"><Plane :size="16" /></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plane, PlaneTakeoff, CheckCircle2, XCircle, Undo2, Hourglass, MinusCircle } from 'lucide-vue-next'
import { runwayStateFor } from '@/composables/useTravel'

const props = defineProps({ req: { type: Object, required: true }, compact: { type: Boolean, default: false } })

const ICO = { done: CheckCircle2, rejected: XCircle, returned: Undo2, current: Hourglass, skipped: MinusCircle, pending: Hourglass }

const gates = computed(() => runwayStateFor(props.req).map(g => ({ ...g, ico: ICO[g.state] || Hourglass })))

const terminalState = computed(() => {
  if (props.req.status === 'APPROVED' || props.req.status === 'IN_PROGRESS' || props.req.status === 'COMPLETED') return 'done'
  if (props.req.status === 'REJECTED') return 'rejected'
  return 'pending'
})

const planeLeft = computed(() => {
  const n = gates.value.length + 1 // include terminal
  if (n <= 1) return 0
  let idx = Number(props.req.current_step || 0)
  if (terminalState.value === 'done') idx = n - 1
  return Math.min(100, (idx / (n - 1)) * 100)
})
</script>

<style scoped>
.runway { width: 100%; }
.rw-strip { position: relative; padding: 22px 6px 6px; }
.runway.compact .rw-strip { padding: 16px 4px 2px; }
.rw-centerline {
  position: absolute; left: 4%; right: 4%; top: 34px; height: 2px;
  background: repeating-linear-gradient(90deg, var(--trv-amber) 0 10px, transparent 10px 22px);
  opacity: 0.4;
}
.rw-gates { display: flex; justify-content: space-between; gap: 4px; position: relative; }
.rw-gate { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 0; }
.rw-node {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: var(--trv-surface-elevated); border: 1.5px solid var(--trv-border-strong); color: var(--trv-text-muted);
  z-index: 1; transition: all 0.3s var(--trv-spring);
}
.rw-gate.done .rw-node { border-color: var(--trv-st-approved); color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.rw-gate.current .rw-node { border-color: var(--trv-amber); color: var(--trv-amber); background: var(--trv-amber-soft); animation: trv-board-pulse 2.2s ease-in-out infinite; }
.rw-gate.rejected .rw-node { border-color: var(--trv-st-rejected); color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }
.rw-gate.returned .rw-node { border-color: var(--trv-st-returned); color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.rw-gate.skipped .rw-node { opacity: 0.5; border-style: dashed; }
.rw-node.takeoff { border-radius: 8px; }
.rw-glabel { font-size: 9.5px; font-weight: 650; color: var(--trv-text-muted); text-align: center; line-height: 1.15; max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rw-gate.current .rw-glabel, .rw-gate.done .rw-glabel { color: var(--trv-text-secondary); }
.rw-gby { font-size: 8.5px; color: var(--trv-text-dim); max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rw-plane {
  position: absolute; top: 6px; transform: translateX(-50%); color: var(--trv-amber);
  filter: drop-shadow(0 0 8px rgba(251,191,36,0.5)); transition: left 0.8s var(--trv-spring); z-index: 2;
}
@media (prefers-reduced-motion: reduce) { .rw-gate.current .rw-node { animation: none; } .rw-plane { transition: none; } }
</style>
