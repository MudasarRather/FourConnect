<template>
  <Motion as="section" class="qch sd-grain" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- instrument stage — bottom edge tracks the lens row so the graph canvas
         (lane cards, edges) never lays out underneath the telemetry tiles -->
    <div class="qch-stage" :style="{ bottom: stageBottom + 'px' }" aria-hidden="true">
      <SdDecisionGraph :queues="graphQueues" :rules="graphRules" :probe="probe" @pick="onGraphPick" />
      <span class="qch-vignette" />
      <span class="qch-scan" />
    </div>

    <!-- glass console -->
    <div class="qch-console">
      <Motion as="p" class="qch-eyebrow sd-mono" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
        <GitBranch :size="12" /> QUEUES · THE DECISION GRAPH
      </Motion>
      <Motion as="h2" class="qch-title" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
        Wire the desk. <em>Route by design.</em>
      </Motion>
      <Motion as="p" class="qch-sub" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
        The live routing engine — every lane, rule, clock and skill on one canvas.
        Packets you see are real work moving through the graph you configure below.
      </Motion>
      <Motion as="div" class="qch-ctas" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <Motion as="button" class="qch-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('new')"><Plus :size="14" /> Lay a lane</Motion>
        <Motion as="button" class="qch-btn" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('backfill')"><Route :size="14" /> Route the backlog</Motion>
        <Motion as="button" class="qch-btn ghost" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('pick', 'rules')"><FlaskConical :size="14" /> Dry-run</Motion>
      </Motion>
    </div>

    <!-- telemetry lenses -->
    <div ref="lensesEl" class="qch-lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="qch-lens" :class="{ warn: l.warn && l.value > 0 }"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.3 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -3 }" :while-tap="{ scale: 0.97 }" @click="$emit('pick', l.panel)">
        <span class="qch-lens-ic"><component :is="l.icon" :size="14" /></span>
        <b class="qch-lens-v sd-mono">{{ l.value }}</b>
        <span class="qch-lens-lb sd-mono">{{ l.label }}</span>
        <i class="qch-lens-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdQueueConfigHero — the Decision Graph console. Full-bleed SdDecisionGraph stage
   (the live routing DAG) under a glass console + clickable telemetry lenses that
   jump straight to a config panel. `probe` is forwarded to the instrument so the
   Signal-Box dry-run visibly travels the graph. Graph lane/rule clicks bubble up
   as `edit` so the canvas is a working surface, not a poster. */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  GitBranch, Plus, Route, FlaskConical, Inbox, Zap, Timer, Sparkles, Gauge, ScrollText,
} from 'lucide-vue-next'
import SdDecisionGraph from './SdDecisionGraph.vue'

const props = defineProps({
  queues: { type: Array, default: () => [] },
  rules: { type: Array, default: () => [] },      // on_create rules with target_queue_id resolved
  slas: { type: Array, default: () => [] },
  skills: { type: Array, default: () => [] },
  ledgerTotal: { type: Number, default: 0 },
  probe: { type: Object, default: null },
})
const emit = defineEmits(['pick', 'new', 'backfill', 'edit'])

const graphQueues = computed(() => props.queues.filter(q => q.is_active).map(q => ({
  id: q.id, name: q.name, color: q.color, tier: q.tier, open: q.open_ticket_count || 0,
  capacity_limit: q.capacity_limit, overflow_queue_id: q.overflow_queue_id,
  at_capacity: !!(q.capacity_limit && (q.open_ticket_count || 0) >= q.capacity_limit),
  is_default: q.is_default,
})))
const graphRules = computed(() => props.rules.filter(r => r.is_active))

const atCapacity = computed(() => graphQueues.value.filter(q => q.at_capacity).length)
const fires = computed(() => props.rules.reduce((s, r) => s + (r.run_count || 0), 0))

const lenses = computed(() => [
  { key: 'lanes', panel: 'queues', icon: Inbox, value: props.queues.length, label: 'LANES' },
  { key: 'rules', panel: 'rules', icon: Zap, value: props.rules.filter(r => r.is_active).length, label: 'LIVE RULES' },
  { key: 'fires', panel: 'rules', icon: GitBranch, value: fires.value, label: 'RULE FIRES' },
  { key: 'sla', panel: 'sla', icon: Timer, value: props.slas.length, label: 'SLA POLICIES' },
  { key: 'skills', panel: 'skills', icon: Sparkles, value: props.skills.length, label: 'SKILLS' },
  { key: 'cap', panel: 'queues', icon: Gauge, value: atCapacity.value, label: 'AT CAPACITY', warn: true },
  { key: 'ledger', panel: 'ledger', icon: ScrollText, value: props.ledgerTotal, label: 'LEDGER' },
])

const onGraphPick = (hit) => emit('edit', hit)

/* The lens grid wraps (7 → 4 → 2 columns), so its height is dynamic — track it and
   keep the stage's bottom pinned above it. SdDecisionGraph's own ResizeObserver
   picks up the resulting stage resize and relays out the canvas. */
const lensesEl = ref(null)
const stageBottom = ref(0)
let lensRo = null
onMounted(() => {
  lensRo = new ResizeObserver(() => { stageBottom.value = lensesEl.value?.offsetHeight || 0 })
  if (lensesEl.value) lensRo.observe(lensesEl.value)
})
onBeforeUnmount(() => lensRo?.disconnect())
</script>

<style scoped>
.qch {
  position: relative; overflow: hidden;
  border: 1px solid var(--sd-qc-brd); border-radius: 22px;
  min-height: 330px;
  display: flex; flex-direction: column; justify-content: space-between;
  isolation: isolate;
  background: var(--sd-qc-stage);
}
.qch-stage { position: absolute; inset: 0; z-index: 0; }
.qch-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(8, 6, 4, 0.9) 0%, rgba(8, 6, 4, 0.55) 30%, transparent 55%),
    linear-gradient(0deg, rgba(8, 6, 4, 0.94) 0%, rgba(8, 6, 4, 0.6) 24%, transparent 44%);
}
.qch-scan {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(0, 0, 0, 0.12) 3px 4px);
}

.qch-console { position: relative; z-index: 1; max-width: 500px; padding: 26px 28px 0; }
.qch-eyebrow {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.22em; margin: 0 0 10px;
  color: var(--sd-qc-hi); padding: 5px 11px; border-radius: 999px;
  border: 1px solid var(--sd-qc-brd); background: rgba(8, 6, 4, 0.55);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.qch-title {
  margin: 0 0 8px; font-size: clamp(26px, 3.4vw, 38px); font-weight: 800;
  letter-spacing: -0.02em; line-height: 1.04;
  /* !important defeats theme-light-rescue’s [class*="page"] h2 repaint — this h2 lives on the dark stage in BOTH themes */
  color: var(--sd-qc-ink) !important;
  text-wrap: balance;
}
.qch-title em {
  font-style: normal;
  background: var(--sd-qc-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.qch-sub { margin: 0; font-size: 13.5px; line-height: 1.6; color: rgba(245, 234, 214, 0.66); max-width: 46ch; }
.qch-ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }

.qch-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 12px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; letter-spacing: 0.01em;
  border: 1px solid var(--sd-qc-brd);
  background: rgba(8, 6, 4, 0.6); color: var(--sd-qc-ink);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.qch-btn.primary {
  background: var(--sd-qc-grad); color: #241703; border-color: transparent;
  box-shadow: var(--sd-qc-glow);
}
.qch-btn.ghost { background: transparent; }

.qch-lenses {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;
  padding: 20px 22px 22px;
}
@media (max-width: 1080px) { .qch-lenses { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 680px) { .qch-lenses { grid-template-columns: repeat(2, 1fr); } }
.qch-lens {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
  padding: 11px 13px 13px; border-radius: 14px; cursor: pointer; text-align: left;
  border: 1px solid rgba(242, 182, 77, 0.18);
  background: rgba(10, 8, 5, 0.84); color: var(--sd-qc-ink); min-width: 0;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: border-color 0.25s var(--sd-spring, ease);
}
.qch-lens:hover { border-color: var(--sd-qc-brd); }
.qch-lens-ic { color: var(--sd-qc-core); display: grid; place-items: center; }
.qch-lens-v { font-size: 19px; font-weight: 800; line-height: 1; color: var(--sd-qc-hi); font-variant-numeric: tabular-nums; }
.qch-lens-lb { font-size: 9px; letter-spacing: 0.18em; color: rgba(245, 234, 214, 0.55); }
.qch-lens-bar {
  position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: var(--sd-qc-grad); opacity: 0.45; transform: scaleX(0.25); transform-origin: left;
  transition: transform 0.35s var(--sd-spring, ease), opacity 0.35s;
}
.qch-lens:hover .qch-lens-bar { transform: scaleX(1); opacity: 0.9; }
.qch-lens.warn .qch-lens-v { color: var(--sd-qc-halt); }
.qch-lens.warn .qch-lens-bar { background: var(--sd-qc-halt); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qch-lens-bar { transition: none; }
}
</style>
