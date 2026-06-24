<template>
  <Motion ref="rootRef" as="header" class="cc ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="cc-spot" aria-hidden="true" />
    <span class="cc-aura" aria-hidden="true" />
    <component :is="KeyRound" class="cc-ghost" :size="220" aria-hidden="true" />

    <!-- lead -->
    <div class="cc-lead">
      <span class="cc-eyebrow"><ClipboardCheck :size="12" /> Exit Management · Offboarding</span>
      <h2 class="cc-title">Clearance <span class="grad">Gatehouse</span></h2>
      <p class="cc-sub">Department gate-keepers sign off the no-dues before a record may pass the threshold to final settlement.</p>
    </div>
    <div class="cc-actions">
      <Motion as="button" type="button" class="cc-btn ghost" :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }"
        :disabled="loading" @click="$emit('refresh')">
        <RefreshCw :size="15" :class="{ spin: loading }" /> Refresh
      </Motion>
    </div>

    <!-- telemetry lenses -->
    <div class="cc-lenses">
      <button v-for="l in lenses" :key="l.key" type="button"
        class="lens" :class="{ on: l.filter && (l.key === 'all' ? activeLens === '' : activeLens === l.key), alert: l.alert, link: !l.filter }"
        @click="l.filter ? $emit('pick', l.key) : $emit('go', { tab: l.go })">
        <span class="lens-ico" :style="{ '--c': l.hex }"><component :is="l.icon" :size="15" /></span>
        <span class="lens-body">
          <span class="lens-val ex-mono">
            <template v-if="l.money">{{ l.value }}</template>
            <ExCountUp v-else :value="l.value" />
          </span>
          <span class="lens-lab">{{ l.label }}</span>
        </span>
        <span class="lens-bar" :style="{ '--c': l.hex }" />
      </button>
    </div>

    <!-- department gate-keepers aggregate -->
    <div v-if="deptAgg.length" class="cc-depts">
      <span class="cd-cap"><ShieldCheck :size="12" /> Gate-keepers · sign-off load</span>
      <div class="cd-row">
        <div v-for="d in deptAgg" :key="d.key" class="cd-chip" :style="{ '--c': d.hex }" :title="`${d.label}: ${d.cleared}/${d.total} cleared${d.blocked ? ' · ' + d.blocked + ' blocked' : ''}`">
          <component :is="d.icon" :size="13" class="cd-ico" />
          <span class="cd-name">{{ d.label }}</span>
          <span class="cd-bar"><span class="cd-fill" :style="{ width: d.pct + '%' }" /></span>
          <span class="cd-frac ex-mono">{{ d.cleared }}/{{ d.total }}</span>
          <span v-if="d.blocked" class="cd-blk" :title="`${d.blocked} blocked`">{{ d.blocked }}</span>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ClipboardCheck, KeyRound, RefreshCw, ShieldCheck, ShieldX, Hourglass, Gauge, HandCoins,
} from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { CLEARANCE_DEPTS, clearanceDeptMeta, fmtCompactINR } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  roster: { type: Array, default: () => [] },
  activeLens: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'refresh', 'go'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const total = computed(() => props.roster.length)
const blockedCases = computed(() => props.roster.filter(r => r.blocked > 0).length)
const awaiting = computed(() => props.roster.filter(r => (r.progress || 0) === 0).length)
const near = computed(() => props.roster.filter(r => (r.progress || 0) >= 75 && !r.allMandatory).length)
const ready = computed(() => props.roster.filter(r => r.allMandatory && !['SETTLEMENT', 'COMPLETED'].includes(r.status)).length)
const totalRec = computed(() => props.roster.reduce((s, r) => s + (r.recoveries || 0), 0))

const lenses = computed(() => ([
  { key: 'all', label: 'In clearance', value: total.value, icon: ClipboardCheck, hex: '#d97706', filter: true },
  { key: 'blocked', label: 'Blocked', value: blockedCases.value, icon: ShieldX, hex: '#ef4444', filter: true, alert: blockedCases.value > 0 },
  { key: 'awaiting', label: 'Not started', value: awaiting.value, icon: Hourglass, hex: '#9ca3af', filter: true },
  { key: 'near', label: 'Near complete', value: near.value, icon: Gauge, hex: '#fb923c', filter: true },
  { key: 'ready', label: 'Ready to pass', value: ready.value, icon: ShieldCheck, hex: '#34d399', filter: true },
  { key: 'recoveries', label: 'Recoveries → F&F', value: fmtCompactINR(totalRec.value), money: true, icon: HandCoins, hex: '#60d394', go: 'settlement' },
]))

const deptAgg = computed(() => {
  const map = {}
  for (const r of props.roster) {
    for (const g of (r.clr?.groups || [])) {
      const e = map[g.department] || (map[g.department] = { cleared: 0, total: 0, blocked: 0 })
      e.cleared += g.cleared || 0
      e.total += g.total || 0
      e.blocked += (g.items || []).filter(it => it.status === 'BLOCKED').length
    }
  }
  return CLEARANCE_DEPTS.filter(d => map[d.key]?.total).map(d => {
    const e = map[d.key]
    const m = clearanceDeptMeta(d.key)
    return { key: d.key, label: m.label, icon: m.icon, hex: m.hex,
      cleared: e.cleared, total: e.total, blocked: e.blocked,
      pct: e.total ? Math.round(e.cleared * 100 / e.total) : 0 }
  })
})
</script>

<style scoped>
.cc {
  position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: start;
  padding: 20px 22px 18px; border-radius: 22px; margin-bottom: 14px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
}
.cc-spot { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(560px 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.13), transparent 62%); }
.cc-aura { position: absolute; inset: -40% 50% 30% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 20% 0%, rgba(251,146,60,0.16), transparent 70%); animation: ex-aura-drift 11s ease-in-out infinite; }
.cc-ghost { position: absolute; right: -40px; top: 50%; transform: translateY(-50%); color: var(--ex-violet); opacity: 0.05; pointer-events: none;
  animation: cc-ghost-spin 90s linear infinite; }
@keyframes cc-ghost-spin { to { transform: translateY(-50%) rotate(360deg); } }

.cc-lead { position: relative; }
.cc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-violet);
  padding: 4px 10px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.cc-title { font-size: clamp(20px, 3vw, 28px); font-weight: 820; margin: 10px 0 4px; color: var(--ex-text); line-height: 1.1; }
.cc-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cc-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0; max-width: 560px; }
.cc-actions { position: relative; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.cc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--ex-border-strong); background: transparent; color: var(--ex-text); }
.cc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

.cc-lenses { grid-column: 1 / -1; position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 4px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; cursor: pointer; text-align: left;
  padding: 10px 11px; border-radius: 14px; background: var(--ex-surface); border: 1px solid var(--ex-border); font-family: inherit;
  transition: transform 0.2s var(--ex-spring), border-color 0.2s, background 0.2s; }
.lens:hover { transform: translateY(-2px); border-color: var(--ex-violet-border); }
.lens.on { border-color: var(--ex-violet); background: var(--ex-violet-soft); }
.lens.alert { border-color: color-mix(in srgb, var(--ex-blocked) 38%, transparent); }
.lens.link { border-style: dashed; }
.lens-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-val { font-size: 17px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.lens-lab { font-size: 10px; font-weight: 600; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); opacity: 0.5; }

.cc-depts { grid-column: 1 / -1; position: relative; margin-top: 4px; }
.cd-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-text-dim); margin-bottom: 7px; }
.cd-row { display: flex; flex-wrap: wrap; gap: 8px; }
.cd-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 11px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.cd-ico { color: var(--c); flex-shrink: 0; }
.cd-name { font-size: 11px; font-weight: 750; color: var(--ex-text-secondary); }
.cd-bar { width: 48px; height: 5px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); }
.cd-fill { display: block; height: 100%; background: var(--c); transition: width 0.7s var(--ex-spring); }
.cd-frac { font-size: 10px; font-weight: 800; color: var(--ex-text-muted); }
.cd-blk { display: grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 6px; font-size: 9.5px; font-weight: 800;
  color: #fff; background: var(--ex-blocked); box-shadow: 0 0 6px color-mix(in srgb, var(--ex-blocked) 50%, transparent); }

[data-theme="light"] .cc-ghost { opacity: 0.06; }

@media (max-width: 1100px) { .cc-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .cc { grid-template-columns: 1fr; } .cc-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .cc-aura, .cc-ghost { animation: none; } }
</style>
