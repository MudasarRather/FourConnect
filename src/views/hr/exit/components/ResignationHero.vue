<template>
  <Motion as="header" class="rh ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="rh-aura" aria-hidden="true" />

    <div class="rh-top">
      <div class="rh-lead">
        <span class="rh-eyebrow"><DoorOpen :size="12" /> Exit Management · Separation</span>
        <h2 class="rh-title">Resignation <span class="grad">Ledger</span></h2>
        <p class="rh-sub">Every separation request — review, accept, and walk it onto the gateway toward a dignified relief.</p>
      </div>

      <div class="rh-cta">
        <Motion as="button" class="rh-btn primary" type="button" @click="$emit('new')"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
          <Plus :size="15" /> New separation
        </Motion>
        <Motion as="button" class="rh-btn steel" type="button" @click="$emit('go', 'notice')"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }">
          <CalendarClock :size="14" /> Notice board
        </Motion>
        <Motion as="button" class="rh-btn ghost" type="button" @click="$emit('refresh')" :title="'Refresh'"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94, rotate: 90 }">
          <RefreshCw :size="14" :class="{ spin: loading }" />
        </Motion>
      </div>
    </div>

    <DepartureHorizon :cases="cases" :by-status="byStatus" :kpis="kpis" :active-status="activeStatus"
      @pick="$emit('pick', $event)" @focus="$emit('focus', $event)" @go="$emit('go', $event)" />

    <div class="rh-lenses">
      <button class="lens all" :class="{ on: !activeStatus }" type="button" @click="$emit('pick', '')">
        <span class="lens-ic" :style="{ '--c': 'var(--ex-violet)' }"><Layers :size="13" /></span>
        <span class="lens-meta"><b><ExCountUp :value="kpis.total_cases || 0" /></b><i>All cases</i></span>
        <span class="lens-bar" />
      </button>
      <button v-for="l in lenses" :key="l.status" class="lens" :class="{ on: activeStatus === l.status }"
        type="button" @click="$emit('pick', l.status)" :style="{ '--c': l.hex }">
        <span class="lens-ic"><component :is="l.icon" :size="13" /></span>
        <span class="lens-meta"><b><ExCountUp :value="l.count" /></b><i>{{ l.label }}</i></span>
        <span class="lens-bar" />
      </button>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { DoorOpen, Plus, CalendarClock, RefreshCw, Layers } from 'lucide-vue-next'
import DepartureHorizon from './DepartureHorizon.vue'
import ExCountUp from './ExCountUp.vue'
import { caseStatusMeta } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  cases: { type: Array, default: () => [] },
  byStatus: { type: Object, default: () => ({}) },
  kpis: { type: Object, default: () => ({}) },
  activeStatus: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['new', 'refresh', 'pick', 'go', 'focus'])
const reduced = prefersReduced()

const LENS_KEYS = ['SUBMITTED', 'MANAGER_REVIEW', 'ACCEPTED', 'NOTICE_PERIOD', 'SETTLEMENT', 'COMPLETED']
const lenses = computed(() => LENS_KEYS.map(k => {
  const m = caseStatusMeta(k)
  return { status: k, label: m.label, icon: m.icon, hex: m.hex, count: Number(props.byStatus?.[k] || 0) }
}))
</script>

<style scoped>
.rh {
  position: relative; overflow: hidden; padding: 20px 22px 18px; border-radius: 24px; margin-bottom: 16px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-shadow);
}
.rh-aura { position: absolute; inset: -50% 30% 40% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251, 146, 60, 0.16), transparent 70%); animation: ex-aura-drift 11s ease-in-out infinite; }

.rh-top { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.rh-lead { min-width: 0; }
.rh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ex-violet); padding: 4px 11px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.rh-title { font-size: clamp(22px, 3.2vw, 30px); font-weight: 850; margin: 11px 0 4px; color: var(--ex-text); line-height: 1.08; }
.rh-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rh-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0; max-width: 560px; }

.rh-cta { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.rh-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; font-family: inherit; }
.rh-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(234, 88, 12, 0.7); }
.rh-btn.steel { background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text); }
.rh-btn.ghost { padding: 9px 11px; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.rh-btn.ghost:hover { color: var(--ex-violet); border-color: var(--ex-violet-border); }
.spin { animation: ex-spin-slow 0.9s linear infinite; }

.rh-lenses { position: relative; display: grid; grid-template-columns: repeat(7, 1fr); gap: 9px; margin-top: 15px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 10px 11px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: transform 0.28s var(--ex-spring), border-color 0.28s, background 0.28s; }
.lens:hover { transform: translateY(-3px); border-color: var(--ex-border-strong); }
.lens.on { border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--ex-surface)); }
.lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.lens-meta { display: flex; flex-direction: column; line-height: 1.12; min-width: 0; }
.lens-meta b { font-size: 17px; font-weight: 850; color: var(--ex-text); font-family: var(--ex-mono); }
.lens-meta i { font-size: 9.5px; font-style: normal; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.35s var(--ex-spring); }
.lens.on .lens-bar, .lens:hover .lens-bar { transform: scaleX(1); }

@media (max-width: 1100px) { .rh-lenses { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 760px) {
  .rh-top { flex-direction: column; }
  .rh-cta { width: 100%; }
  .rh-btn.primary { flex: 1; justify-content: center; }
  .rh-lenses { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .rh-aura, .spin { animation: none; } .lens:hover { transform: none; } }
</style>
