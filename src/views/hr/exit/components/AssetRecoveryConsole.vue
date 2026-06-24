<template>
  <Motion ref="rootRef" as="header" class="arc ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="arc-spot" aria-hidden="true" />
    <span class="arc-aura" aria-hidden="true" />
    <component :is="Magnet" class="arc-ghost" :size="210" aria-hidden="true" />

    <div class="arc-lead">
      <span class="arc-eyebrow"><PackageCheck :size="12" /> Exit Management · Offboarding</span>
      <h2 class="arc-title">Asset <span class="grad">Recovery Bay</span></h2>
      <p class="arc-sub">Company property walking back across the threshold — recalled, tracked, and reconciled into the final settlement.</p>
    </div>
    <div class="arc-actions">
      <Motion as="button" type="button" class="arc-btn ghost" :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('fleet')">
        <ArrowUpRight :size="15" /> Fleet Returns
      </Motion>
      <Motion as="button" type="button" class="arc-btn ghost" :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" :disabled="loading" @click="$emit('refresh')">
        <RefreshCw :size="15" :class="{ spin: loading }" /> Refresh
      </Motion>
    </div>

    <!-- lenses -->
    <div class="arc-lenses">
      <button v-for="l in lenses" :key="l.key" type="button"
        class="lens" :class="{ on: l.filter && (l.key === 'all' ? activeLens === '' : activeLens === l.key), alert: l.alert, link: !l.filter }"
        @click="l.filter ? $emit('pick', l.key) : $emit('fleet')">
        <span class="lens-ico" :style="{ '--c': l.hex }"><component :is="l.icon" :size="15" /></span>
        <span class="lens-body">
          <span class="lens-val ex-mono"><ExCountUp :value="l.value" /></span>
          <span class="lens-lab">{{ l.label }}</span>
        </span>
        <span class="lens-bar" :style="{ '--c': l.hex }" />
      </button>
    </div>

    <!-- fleet recovery ribbon -->
    <div v-if="totalOut > 0" class="arc-ribbon">
      <span class="rib-cap"><RadioTower :size="12" /> Fleet recovery · {{ recoveredTotal }}/{{ totalOut }} units back</span>
      <div class="rib-bar">
        <span v-for="seg in segments" :key="seg.key" class="rib-seg" :class="seg.key" :style="{ width: seg.pct + '%' }" :title="`${seg.label}: ${seg.n}`" />
      </div>
      <div class="rib-legend">
        <span v-for="seg in segments" :key="seg.key" class="rl"><i :class="seg.key" /> {{ seg.label }} <b>{{ seg.n }}</b></span>
        <span class="rl rate">Recovery rate <b>{{ rate }}%</b></span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { PackageCheck, Magnet, RefreshCw, ArrowUpRight, ShieldCheck, Truck, AlertTriangle, Boxes, RadioTower } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  roster: { type: Array, default: () => [] },
  activeLens: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'refresh', 'go', 'fleet'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const sum = (f) => props.roster.reduce((s, r) => s + (f(r) || 0), 0)
const totalCases = computed(() => props.roster.length)
const recoveredCases = computed(() => props.roster.filter(r => r.total > 0 && r.recovered === r.total).length)
const transitCases = computed(() => props.roster.filter(r => r.transit > 0).length)
const atRiskCases = computed(() => props.roster.filter(r => r.atRisk || r.overdue).length)
const unitsOut = computed(() => sum(r => r.unreturned))

const totalOut = computed(() => sum(r => r.total))
const recoveredTotal = computed(() => sum(r => r.recovered))
const rate = computed(() => totalOut.value ? Math.round(recoveredTotal.value * 100 / totalOut.value) : 0)

const lenses = computed(() => ([
  { key: 'all', label: 'Active recovery', value: totalCases.value, icon: PackageCheck, hex: '#fb923c', filter: true },
  { key: 'recovered', label: 'Fully recovered', value: recoveredCases.value, icon: ShieldCheck, hex: '#34d399', filter: true },
  { key: 'transit', label: 'In transit', value: transitCases.value, icon: Truck, hex: '#fbbf24', filter: true },
  { key: 'atrisk', label: 'At risk', value: atRiskCases.value, icon: AlertTriangle, hex: '#ef4444', filter: true, alert: atRiskCases.value > 0 },
  { key: 'units', label: 'Units still out', value: unitsOut.value, icon: Boxes, hex: '#d97706', filter: true },
  { key: 'fleet', label: 'Fleet Returns', value: totalOut.value, icon: RadioTower, hex: '#60d394', go: 'fleet' },
]))

const segments = computed(() => {
  const held = sum(r => r.held), requested = sum(r => r.requested), transit = sum(r => r.transit)
  const recovered = sum(r => r.recovered), shortfall = sum(r => r.shortfall || 0)
  const t = held + requested + transit + recovered + shortfall || 1
  return [
    { key: 'recovered', label: 'Recovered', n: recovered, pct: recovered * 100 / t },
    { key: 'transit', label: 'In transit', n: transit, pct: transit * 100 / t },
    { key: 'requested', label: 'Requested', n: requested, pct: requested * 100 / t },
    { key: 'held', label: 'Held', n: held, pct: held * 100 / t },
    { key: 'shortfall', label: 'Lost / damaged', n: shortfall, pct: shortfall * 100 / t },
  ].filter(s => s.n > 0 || s.key !== 'shortfall')
})
</script>

<style scoped>
.arc { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: start;
  padding: 20px 22px 18px; border-radius: 22px; margin-bottom: 14px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.arc-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(560px 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.13), transparent 62%); }
.arc-aura { position: absolute; inset: -40% 50% 30% -10%; pointer-events: none; background: radial-gradient(60% 80% at 20% 0%, rgba(251,146,60,0.16), transparent 70%); animation: ex-aura-drift 11s ease-in-out infinite; }
.arc-ghost { position: absolute; right: -36px; top: 50%; transform: translateY(-50%); color: var(--ex-violet); opacity: 0.05; pointer-events: none; animation: arc-ghost-spin 80s linear infinite; }
@keyframes arc-ghost-spin { to { transform: translateY(-50%) rotate(-360deg); } }

.arc-lead { position: relative; }
.arc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet);
  padding: 4px 10px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.arc-title { font-size: clamp(20px, 3vw, 28px); font-weight: 820; margin: 10px 0 4px; color: var(--ex-text); line-height: 1.1; }
.arc-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.arc-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0; max-width: 560px; }
.arc-actions { position: relative; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.arc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--ex-border-strong); background: transparent; color: var(--ex-text); }
.arc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.arc-btn:hover:not(:disabled) { border-color: var(--ex-violet-border); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

.arc-lenses { grid-column: 1 / -1; position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 4px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; cursor: pointer; text-align: left; padding: 10px 11px; border-radius: 14px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); font-family: inherit; transition: transform 0.2s var(--ex-spring), border-color 0.2s, background 0.2s; }
.lens:hover { transform: translateY(-2px); border-color: var(--ex-violet-border); }
.lens.on { border-color: var(--ex-violet); background: var(--ex-violet-soft); }
.lens.alert { border-color: color-mix(in srgb, var(--ex-blocked) 38%, transparent); }
.lens.link { border-style: dashed; }
.lens-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-val { font-size: 17px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.lens-lab { font-size: 10px; font-weight: 600; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); opacity: 0.5; }

.arc-ribbon { grid-column: 1 / -1; position: relative; margin-top: 4px; }
.rib-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-text-dim); margin-bottom: 7px; }
.rib-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.rib-seg { height: 100%; transition: width 0.8s var(--ex-spring); }
.rib-seg.recovered { background: linear-gradient(90deg, #34d399, #6ee7b7); }
.rib-seg.transit { background: linear-gradient(90deg, #fb923c, #fbbf24); }
.rib-seg.requested { background: var(--ex-amber); }
.rib-seg.held { background: var(--ex-steel); }
.rib-seg.shortfall { background: repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #b91c1c 4px, #b91c1c 8px); }
.rib-legend { display: flex; flex-wrap: wrap; gap: 13px; margin-top: 8px; }
.rl { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--ex-text-muted); }
.rl i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
.rl i.recovered { background: #34d399; } .rl i.transit { background: #fb923c; } .rl i.requested { background: var(--ex-amber); } .rl i.held { background: var(--ex-steel); }
.rl i.shortfall { background: repeating-linear-gradient(45deg, #ef4444, #ef4444 3px, #b91c1c 3px, #b91c1c 6px); }
.rl b { color: var(--ex-text); font-family: var(--ex-mono); }
.rl.rate { margin-left: auto; color: var(--ex-text-secondary); }
.rl.rate b { color: var(--ex-cleared); }

[data-theme="light"] .arc-ghost { opacity: 0.06; }
@media (max-width: 1100px) { .arc-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .arc { grid-template-columns: 1fr; } .arc-lenses { grid-template-columns: repeat(2, 1fr); } .rl.rate { margin-left: 0; } }
@media (prefers-reduced-motion: reduce) { .arc-aura, .arc-ghost { animation: none; } .rib-seg { transition: none; } }
</style>
