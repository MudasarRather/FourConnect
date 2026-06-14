<template>
  <div class="relay" :class="{ idle: !inFlight }">
    <span class="relay-grid" aria-hidden="true" />

    <!-- left node — requesters -->
    <div class="node req">
      <span class="node-ring" aria-hidden="true" />
      <span class="node-core"><UsersRound :size="18" /></span>
      <small>Requester</small>
    </div>

    <!-- conduit -->
    <div class="conduit" aria-hidden="true">
      <span class="rail top" />
      <span class="rail bottom" />
      <span v-for="t in topTokens" :key="'t'+t.i" class="token amber" :style="t.style" />
      <span v-for="t in botTokens" :key="'b'+t.i" class="token ember" :style="t.style" />
    </div>

    <!-- center swap hub -->
    <div class="hub">
      <span class="hub-pulse" aria-hidden="true" />
      <span class="hub-pulse p2" aria-hidden="true" />
      <span class="hub-core"><ArrowLeftRight :size="18" /></span>
    </div>

    <!-- conduit -->
    <div class="conduit" aria-hidden="true">
      <span class="rail top" />
      <span class="rail bottom" />
      <span v-for="t in topTokens2" :key="'t2'+t.i" class="token amber" :style="t.style" />
      <span v-for="t in botTokens2" :key="'b2'+t.i" class="token ember" :style="t.style" />
    </div>

    <!-- right node — counterparties -->
    <div class="node cpt">
      <span class="node-ring" aria-hidden="true" />
      <span class="node-core"><UsersRound :size="18" /></span>
      <small>Counterparty</small>
    </div>

    <div class="relay-readout">
      <b><ShiftCountUp :value="inFlight" /></b>
      <span>{{ inFlight === 1 ? 'swap in flight' : 'swaps in flight' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowLeftRight, UsersRound } from 'lucide-vue-next'
import ShiftCountUp from './ShiftCountUp.vue'

const props = defineProps({
  inFlight: { type: Number, default: 0 },
})

// token density scales with in-flight load (2..5 per rail), animation always runs for life
const count = computed(() => Math.max(2, Math.min(5, props.inFlight || 2)))
const PERIOD = 3.4
const build = (dir, phase) => Array.from({ length: count.value }, (_, i) => ({
  i,
  style: {
    animationDuration: `${PERIOD}s`,
    animationDelay: `-${((i / count.value) * PERIOD + phase).toFixed(2)}s`,
    animationDirection: dir,
  },
}))
const topTokens = computed(() => build('normal', 0))
const botTokens = computed(() => build('reverse', 0.7))
const topTokens2 = computed(() => build('normal', 0.35))
const botTokens2 = computed(() => build('reverse', 1.1))
</script>

<style scoped>
.relay { position: relative; display: grid; grid-template-columns: auto 1fr auto 1fr auto; align-items: center; gap: 4px;
  padding: 18px 16px 30px; border-radius: 20px; overflow: hidden; min-height: 132px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.relay-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(var(--shift-grid-line) 1px, transparent 1px); background-size: 18px 18px;
  mask-image: radial-gradient(120% 90% at 50% 40%, #000, transparent 75%); animation: shift-grid-pan 26s linear infinite; }

.node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; z-index: 2; }
.node-core { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle at 38% 32%, #fff4d6, #fbbf24 60%, #b45309); color: #2a1a05;
  box-shadow: 0 6px 18px -4px rgba(251,191,36,0.5); }
.node.cpt .node-core { background: radial-gradient(circle at 38% 32%, #ffe2c4, #fb923c 58%, #c2410c); color: #2a1205;
  box-shadow: 0 6px 18px -4px rgba(251,146,60,0.5); }
.node-ring { position: absolute; top: -5px; width: 54px; height: 54px; border-radius: 50%;
  border: 1px dashed var(--shift-amber); opacity: 0.5; animation: relay-spin 9s linear infinite; }
.node.cpt .node-ring { border-color: var(--shift-ember); animation-direction: reverse; }
.node small { font-family: var(--shift-mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--shift-text-muted); }

.conduit { position: relative; height: 44px; z-index: 1; }
.rail { position: absolute; left: -4%; right: -4%; height: 1.5px; border-radius: 2px; opacity: 0.55; }
.rail.top { top: 14px; background: linear-gradient(90deg, transparent, var(--shift-amber), transparent); background-size: 200% 100%; animation: relay-flow 2.4s linear infinite; }
.rail.bottom { bottom: 14px; background: linear-gradient(90deg, transparent, var(--shift-ember), transparent); background-size: 200% 100%; animation: relay-flow 2.4s linear infinite reverse; }
.token { position: absolute; width: 7px; height: 7px; border-radius: 50%; will-change: left; }
.token.amber { top: 11px; background: var(--shift-amber-bright); box-shadow: 0 0 8px 1px var(--shift-amber); animation: relay-travel linear infinite; }
.token.ember { bottom: 11px; background: #ffd9b3; box-shadow: 0 0 8px 1px var(--shift-ember); animation: relay-travel linear infinite; }

.hub { position: relative; display: grid; place-items: center; z-index: 3; }
.hub-core { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center;
  background: var(--shift-surface); border: 1px solid var(--shift-border); color: var(--shift-amber);
  animation: relay-rock 3.2s ease-in-out infinite; }
.hub-pulse { position: absolute; width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--shift-amber);
  opacity: 0; animation: relay-hubpulse 3.4s ease-out infinite; }
.hub-pulse.p2 { animation-delay: 1.7s; }

.relay-readout { position: absolute; bottom: 8px; left: 0; right: 0; display: flex; align-items: baseline; justify-content: center; gap: 6px; }
.relay-readout b { font-family: var(--shift-mono); font-size: 14px; font-weight: 800; color: var(--shift-text); }
.relay-readout span { font-size: 10px; color: var(--shift-text-muted); }

@keyframes relay-travel { 0% { left: -6%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: 106%; opacity: 0; } }
@keyframes relay-flow { to { background-position: -200% 0; } }
@keyframes relay-spin { to { transform: rotate(360deg); } }
@keyframes relay-rock { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-12deg); } 75% { transform: rotate(12deg); } }
@keyframes relay-hubpulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.1); opacity: 0; } }

.relay.idle .token { animation-play-state: running; opacity: 0.65; }

@media (prefers-reduced-motion: reduce) {
  .relay-grid, .node-ring, .token, .rail, .hub-core, .hub-pulse { animation: none !important; }
  .token { display: none; }
}
@media (max-width: 560px) { .relay { grid-template-columns: auto 1fr auto 1fr auto; gap: 2px; padding: 14px 8px 28px; } .node small { display: none; } }
</style>
