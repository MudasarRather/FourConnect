<template>
  <Motion as="section" class="aco" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />
    <span class="aco-radar" aria-hidden="true" />
    <span class="aco-aura" aria-hidden="true" />

    <div class="aco-top">
      <div class="aco-lead">
        <span class="aco-eyebrow"><Radar :size="13" /> Allocation Bay · Deployment Console</span>
        <h1 class="aco-title">Deploy <span class="aco-title-accent">&amp; Track</span></h1>
        <p class="aco-sub">Dispatch ready equipment to the field, confirm receipt, then bring it home — every movement, live.</p>
        <div class="aco-cta">
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'returns')">
            <Undo2 :size="14" /> Returns desk
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'history')">
            <History :size="14" /> Movement log
          </Motion>
        </div>
      </div>

      <div class="aco-lenses" ref="lensesEl">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="aco-lens" :data-tone="l.tone"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
          :title="l.hint" @click="$emit('pick', l.pick)">
          <span class="aco-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="aco-lens-val">
            <AssetCountUp :value="l.value" :start="lensesIn" :duration="1.1 + i * 0.08" :suffix="l.suffix || ''" />
          </span>
          <span class="aco-lens-lab">{{ l.label }}</span>
          <span v-if="l.live && l.value" class="aco-lens-live" aria-hidden="true" />
        </Motion>
      </div>
    </div>

    <!-- Deployment pipeline -->
    <div class="aco-flow" :class="{ idle: reduced }" role="img" aria-label="Deployment pipeline">
      <span class="aco-track" aria-hidden="true">
        <span class="aco-rail" />
        <template v-if="!reduced">
          <span v-for="p in 4" :key="p" class="aco-pkt" :style="{ '--pd': `${p * 1.7}s` }" />
        </template>
      </span>
      <div v-for="(st, i) in stations" :key="st.key" class="aco-station" :data-tone="st.tone">
        <span class="aco-st-ring" :style="{ '--sd': `${0.2 + i * 0.12}s` }">
          <span class="aco-st-ring-glow" aria-hidden="true" />
          <component :is="st.icon" :size="16" />
        </span>
        <span class="aco-st-val as-mono"><AssetCountUp :value="st.value" :start="lensesIn" :duration="1.2" /></span>
        <span class="aco-st-lab">{{ st.label }}</span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Radar, Warehouse, Send, BadgeCheck, Clock, Undo2, History, Gauge } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  ready: { type: Number, default: 0 },
  deployed: { type: Number, default: 0 },
  acknowledged: { type: Number, default: 0 },
  awaitingAck: { type: Number, default: 0 },
  overdue: { type: Number, default: 0 },
  ackRate: { type: Number, default: 0 },
})
defineEmits(['go', 'pick'])

const root = ref(null)
const lensesEl = ref(null)
const reduced = prefersReduced()
const { visible: lensesIn } = useInView(lensesEl, { threshold: 0.25 })

const lenses = computed(() => [
  { key: 'ready', label: 'Ready', value: props.ready, tone: 'ready', icon: Warehouse, pick: 'all', hint: 'Assets ready to deploy' },
  { key: 'deployed', label: 'Deployed', value: props.deployed, tone: 'deployed', icon: Send, pick: 'all', live: true, hint: 'Active allocations in the field' },
  { key: 'awaiting', label: 'Awaiting', value: props.awaitingAck, tone: 'awaiting', icon: Clock, pick: 'pending', hint: 'Awaiting employee acknowledgement' },
  { key: 'overdue', label: 'Overdue', value: props.overdue, tone: 'overdue', icon: Undo2, pick: 'overdue', hint: 'Past expected return date' },
  { key: 'ackrate', label: 'Confirmed', value: props.ackRate, suffix: '%', tone: 'rate', icon: Gauge, pick: 'all', hint: 'Acknowledgement rate' },
])

const stations = computed(() => [
  { key: 'ready', label: 'Hangar', value: props.ready, tone: 'ready', icon: Warehouse },
  { key: 'deployed', label: 'Field', value: props.deployed, tone: 'deployed', icon: Send },
  { key: 'acked', label: 'Confirmed', value: props.acknowledged, tone: 'acked', icon: BadgeCheck },
  { key: 'due', label: 'Due back', value: props.overdue, tone: 'overdue', icon: Undo2 },
])
</script>

<style scoped>
.aco {
  position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow);
}
.aco-aura { position: absolute; inset: -45% -15% auto -15%; height: 85%; pointer-events: none; z-index: 0;
  background: var(--as-grad-hero); filter: blur(10px); }
/* slow radar sweep anchored top-right */
.aco-radar { position: absolute; top: -160px; right: -160px; width: 460px; height: 460px; border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0.5;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--as-amber) 22%, transparent) 26deg, transparent 60deg);
  -webkit-mask: radial-gradient(closest-side, transparent 38%, #000 39%, #000 99%, transparent);
  mask: radial-gradient(closest-side, transparent 38%, #000 39%, #000 99%, transparent);
  animation: aco-sweep 7s linear infinite; }

.aco-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.aco-lead { max-width: 460px; min-width: 260px; flex: 1; }
.aco-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.aco-title { margin: 14px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1.04; }
.aco-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.aco-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 430px; }
.aco-cta { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }

.aco-lenses { display: grid; grid-template-columns: repeat(5, minmax(78px, 1fr)); gap: 9px; min-width: 0; }
.aco-lens { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px 13px 11px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px);
  transition: border-color 0.25s, box-shadow 0.25s; overflow: hidden; }
.aco-lens::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; opacity: 0.85;
  background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.aco-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.aco-lens[data-tone="ready"]    { --lc: var(--as-st-available); }
.aco-lens[data-tone="deployed"] { --lc: var(--as-st-allocated); }
.aco-lens[data-tone="awaiting"] { --lc: var(--as-st-reserved); }
.aco-lens[data-tone="overdue"]  { --lc: var(--as-al-lost); }
.aco-lens[data-tone="rate"]     { --lc: var(--as-steel); }
.aco-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc);
  background: color-mix(in srgb, var(--lc) 14%, transparent); }
.aco-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.aco-lens-lab { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.aco-lens-live { position: absolute; top: 11px; right: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--as-st-allocated);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-st-allocated) 60%, transparent); animation: aco-blip 1.8s ease-in-out infinite; }

/* ── deployment pipeline ── */
.aco-flow { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: 22px; padding: 18px 22px 6px; }
.aco-track { position: absolute; left: 46px; right: 46px; top: 35px; height: 2px; pointer-events: none; }
.aco-rail { position: absolute; inset: 0; border-radius: 2px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--as-amber) 32%, transparent) 0 7px, transparent 7px 16px);
  background-size: 200% 100%; animation: aco-rail-flow 2.4s linear infinite; opacity: 0.55; }
.aco-pkt { position: absolute; top: 50%; left: 0; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%;
  background: radial-gradient(circle, #fff, var(--as-amber) 60%, transparent);
  box-shadow: 0 0 10px 2px color-mix(in srgb, var(--as-amber) 70%, transparent);
  animation: aco-pkt-travel 6.8s linear infinite; animation-delay: var(--pd); }

.aco-station { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 64px; }
.aco-st-ring { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: var(--sc, var(--as-amber));
  background: color-mix(in srgb, var(--sc, var(--as-amber)) 13%, var(--as-surface));
  border: 1px solid color-mix(in srgb, var(--sc, var(--as-amber)) 34%, transparent);
  animation: aco-st-pop 0.5s var(--as-spring) both; animation-delay: var(--sd); }
.aco-st-ring-glow { position: absolute; inset: -5px; border-radius: 15px; pointer-events: none; opacity: 0.5;
  background: radial-gradient(circle, color-mix(in srgb, var(--sc, var(--as-amber)) 45%, transparent), transparent 70%); }
.aco-station[data-tone="ready"]    { --sc: var(--as-st-available); }
.aco-station[data-tone="deployed"] { --sc: var(--as-st-allocated); }
.aco-station[data-tone="acked"]    { --sc: var(--as-st-available); }
.aco-station[data-tone="overdue"]  { --sc: var(--as-al-lost); }
.aco-st-val { font-size: 16px; font-weight: 800; color: var(--as-text); }
.aco-st-lab { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }

@keyframes aco-sweep { to { transform: rotate(360deg); } }
@keyframes aco-rail-flow { to { background-position: 200% 0; } }
@keyframes aco-pkt-travel { 0% { left: 0; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
@keyframes aco-blip { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-st-allocated) 55%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--as-st-allocated) 0%, transparent); } }
@keyframes aco-st-pop { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }

@media (max-width: 980px) {
  .aco-lenses { grid-template-columns: repeat(5, 1fr); width: 100%; }
  .aco-lens-val { font-size: 19px; }
}
@media (max-width: 620px) {
  .aco-lenses { grid-template-columns: repeat(3, 1fr); }
  .aco-flow { overflow-x: auto; justify-content: flex-start; gap: 28px; }
  .aco-track { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .aco-radar, .aco-rail, .aco-pkt, .aco-lens-live, .aco-st-ring { animation: none; }
  .aco-radar { opacity: 0.25; }
}
</style>
