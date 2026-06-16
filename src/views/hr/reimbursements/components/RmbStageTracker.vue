<template>
  <!-- vertical flowing pipeline rail (drawer) -->
  <ol v-if="vertical" class="rmb-vtrack">
    <Motion
      v-for="(n, i) in nodes" :key="i"
      as="li" class="vnode" :data-state="n.state"
      :initial="{ opacity: 0, x: -10 }"
      :animate="{ opacity: 1, x: 0 }"
      :transition="{ delay: 0.05 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
    >
      <span class="vline" :data-on="n.state === 'done'" aria-hidden="true" />
      <span class="vdot">
        <component :is="iconFor(n)" :size="12" :stroke-width="2.6" />
        <span v-if="n.state === 'current'" class="vping" aria-hidden="true" />
      </span>
      <div class="vmeta">
        <b>{{ n.label }}</b>
        <span class="vstate">{{ stateLabel(n) }}</span>
      </div>
    </Motion>
  </ol>

  <!-- horizontal chip track (slips / queues) -->
  <div v-else class="rmb-track" :class="{ compact }">
    <template v-for="(n, i) in nodes" :key="i">
      <div v-if="i > 0" class="rmb-track-connector" :data-on="n.state === 'done' || nodes[i-1].state === 'done'"></div>
      <div class="rmb-stage-chip" :data-state="n.state">
        <component :is="iconFor(n)" :size="12" :stroke-width="2.4" />
        <span v-if="!compact" class="lbl">{{ n.label }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Check, X, Clock, CircleDot, MinusCircle, Send, UserCheck, Landmark, BadgeCheck } from 'lucide-vue-next'
import { pipelineStateFor } from '@/composables/useReimbursements'

const props = defineProps({
  claim: { type: Object, default: null },
  nodesProp: { type: Array, default: null },
  compact: { type: Boolean, default: false },
  vertical: { type: Boolean, default: false },
})

const nodes = computed(() => props.nodesProp || (props.claim ? pipelineStateFor(props.claim) : []))

function iconFor(n) {
  if (n.state === 'done') return Check
  if (n.state === 'rejected') return X
  if (n.state === 'skipped') return MinusCircle
  if (n.state === 'current') return CircleDot
  if (n.key === 'SUBMITTED') return Send
  if (n.key === 'MANAGER') return UserCheck
  if (n.key === 'FINANCE' || n.key === 'HR') return Landmark
  if (n.key === 'SETTLED') return BadgeCheck
  return Clock
}
const STATE_LABEL = { done: 'Cleared', current: 'In progress', rejected: 'Halted', skipped: 'Skipped', pending: 'Queued' }
const stateLabel = (n) => STATE_LABEL[n.state] || 'Queued'
</script>

<style scoped>
.rmb-track {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.rmb-track-connector {
  width: 16px; height: 2px; flex: 0 0 auto;
  background-image: linear-gradient(90deg, var(--rmb-perf-color) 0 4px, transparent 4px 8px);
  background-size: 8px 2px; background-repeat: repeat-x;
  transition: background 0.4s var(--rmb-spring);
}
.rmb-track-connector[data-on="true"] {
  background-image: linear-gradient(90deg, var(--rmb-st-approved) 0 4px, transparent 4px 8px);
  opacity: 0.8;
}
.rmb-track.compact .rmb-stage-chip { padding: 4px 6px; }
.rmb-track.compact .rmb-track-connector { width: 10px; }
.lbl { line-height: 1; }

/* ── vertical rail ── */
.rmb-vtrack { list-style: none; margin: 0; padding: 0; }
.vnode { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 0 0 18px 0; min-height: 34px; }
.vnode:last-child { padding-bottom: 0; }
/* the connector segment that climbs into this node from the one above */
.vline { position: absolute; left: 13px; top: -16px; width: 2px; height: 26px; border-radius: 2px; overflow: hidden;
  background: var(--rmb-perf-color); }
.vnode:first-child .vline { display: none; }
.vline[data-on="true"] { background: var(--rmb-st-approved);
  background-image: linear-gradient(180deg, transparent, color-mix(in srgb, var(--rmb-st-approved) 0%, white) 50%, transparent);
  background-size: 100% 220%; animation: rmb-flow-down 1.8s linear infinite; }
.vdot { position: relative; flex: 0 0 auto; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; z-index: 1;
  background: var(--rmb-surface); border: 1.5px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  transition: all 0.3s var(--rmb-spring); }
.vping { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid var(--rmb-st-pending); animation: rmb-pulse-dot 1.8s ease-out infinite; }
.vmeta { display: flex; flex-direction: column; padding-top: 4px; }
.vmeta b { font-size: 12.5px; color: var(--rmb-text); font-weight: 600; line-height: 1.1; }
.vstate { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--rmb-text-muted); margin-top: 2px; }

.vnode[data-state="done"] .vdot { background: var(--rmb-st-approved-soft); border-color: transparent; color: var(--rmb-st-approved); }
.vnode[data-state="done"] .vstate { color: var(--rmb-st-approved); }
.vnode[data-state="current"] .vdot { background: var(--rmb-st-pending-soft); border-color: var(--rmb-st-pending); color: var(--rmb-st-pending); }
.vnode[data-state="current"] .vstate { color: var(--rmb-st-pending); }
.vnode[data-state="rejected"] .vdot { background: var(--rmb-st-rejected-soft); border-color: var(--rmb-st-rejected); color: var(--rmb-st-rejected); }
.vnode[data-state="rejected"] .vstate { color: var(--rmb-st-rejected); }
.vnode[data-state="skipped"] { opacity: 0.55; }
.vnode[data-state="skipped"] .vmeta b { text-decoration: line-through; }

@media (prefers-reduced-motion: reduce) {
  .vline[data-on="true"], .vping { animation: none !important; }
}
</style>
