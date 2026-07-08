<template>
  <div class="kpi-deck">
    <!-- Workload Reactor — the signature instrument -->
    <Motion
      as="div" class="kpi-reactor" :class="loadTone"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
    >
      <span class="rx-aura" aria-hidden="true" />
      <div class="rx-gauge">
        <span class="rx-ring r1" aria-hidden="true" />
        <span class="rx-ring r2" aria-hidden="true" />
        <span class="rx-arc" :style="{ '--sd-p': loadAngle }" aria-hidden="true" />
        <span class="rx-core" aria-hidden="true" />
        <div class="rx-read">
          <span class="rx-val"><SdCountUp :value="stats.workload_score || 0" /></span>
          <span class="rx-of">/100</span>
        </div>
      </div>
      <div class="rx-meta">
        <span class="rx-eyebrow"><Gauge :size="12" /> Workload</span>
        <span class="rx-label">{{ loadLabel }}</span>
        <span class="rx-sub">{{ stats.total_active || 0 }} active · {{ stats.critical || 0 }} critical</span>
      </div>
    </Motion>

    <!-- KPI tiles -->
    <button
      v-for="(k, i) in tiles" :key="k.key"
      type="button" class="kpi" :class="[{ on: k.lens && k.lens === activeLens }, k.pulse ? 'pulse' : '']"
      :style="{ '--kc': k.color, '--i': i }"
      :disabled="!k.lens" @click="k.lens && $emit('pick', k.lens)"
    >
      <span class="kpi-sheen" aria-hidden="true" />
      <div class="kpi-head">
        <span class="kpi-ic"><component :is="k.icon" :size="16" /></span>
        <ArrowUpRight v-if="k.lens" :size="13" class="kpi-go" />
      </div>
      <span class="kpi-val"><SdCountUp :value="k.value" /></span>
      <span class="kpi-lbl">{{ k.label }}</span>
      <span class="kpi-sub">{{ k.sub }}</span>
      <span class="kpi-bar" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Gauge, Activity, Hourglass, Timer, AlertOctagon, CircleCheck, ArrowUpRight } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  activeLens: { type: String, default: 'all' },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const fmtMins = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m avg`
  if (m < 1440) return `${(m / 60).toFixed(1)}h avg`
  return `${(m / 1440).toFixed(1)}d avg`
}

const tiles = computed(() => {
  const s = props.stats || {}
  return [
    { key: 'open', lens: 'open', icon: Activity, color: 'var(--sd-st-progress)', value: (s.open || 0) + (s.in_progress || 0), label: 'Open', sub: `${s.in_progress || 0} in progress` },
    { key: 'pending', lens: 'pending', icon: Hourglass, color: 'var(--sd-st-pending)', value: s.pending_total || 0, label: 'Pending', sub: `${s.pending_customer || 0} cust · ${s.pending_vendor || 0} vend` },
    { key: 'risk', lens: 'risk', icon: Timer, color: 'var(--sd-warning)', value: s.sla_risk || 0, label: 'SLA Risk', sub: 'approaching target' },
    { key: 'breached', lens: 'breached', icon: AlertOctagon, color: 'var(--sd-danger)', value: s.sla_breached || 0, label: 'SLA Breached', sub: 'past target', pulse: (s.sla_breached || 0) > 0 },
    { key: 'resolved', lens: 'resolved', icon: CircleCheck, color: 'var(--sd-success)', value: s.resolved_today || 0, label: 'Resolved Today', sub: fmtMins(s.avg_resolution_minutes) },
  ]
})

const score = computed(() => props.stats.workload_score || 0)
const loadAngle = computed(() => `${Math.max(0, Math.min(100, score.value)) * 3.6}deg`)
const loadTone = computed(() => score.value >= 85 ? 'crit' : score.value >= 70 ? 'hot' : score.value >= 40 ? 'warm' : 'calm')
const loadLabel = computed(() => score.value >= 85 ? 'Overloaded' : score.value >= 70 ? 'Heavy' : score.value >= 40 ? 'Busy' : 'Balanced')
</script>

<style scoped>
.kpi-deck { display: grid; grid-template-columns: 1.35fr repeat(5, 1fr); gap: 12px; }

/* Workload Reactor */
.kpi-reactor {
  position: relative; overflow: hidden; display: flex; align-items: center; gap: 16px;
  padding: 16px 18px; border-radius: 18px; --rc: var(--sd-success);
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.kpi-reactor.warm { --rc: var(--sd-amber); } .kpi-reactor.hot { --rc: var(--sd-ember); } .kpi-reactor.crit { --rc: var(--sd-danger); }
.rx-aura { position: absolute; inset: -40% auto auto -20%; width: 240px; height: 240px; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--rc) 30%, transparent), transparent 65%); filter: blur(8px); opacity: 0.5; }
.rx-gauge { position: relative; width: 96px; height: 96px; flex-shrink: 0; display: grid; place-items: center; }
.rx-ring { position: absolute; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--sd-text) 10%, transparent); }
.rx-ring.r1 { inset: 6px; } .rx-ring.r2 { inset: 16px; border-style: dashed; animation: sd-spin-slow 24s linear infinite; }
.rx-arc { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from -90deg, var(--rc) 0 var(--sd-p), color-mix(in srgb, var(--sd-text) 10%, transparent) var(--sd-p) 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  transition: --sd-p 1.1s var(--sd-spring); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--rc) 50%, transparent)); }
.rx-core { position: absolute; inset: 24px; border-radius: 50%; background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--rc) 24%, var(--sd-surface)), var(--sd-panel));
  box-shadow: inset 0 0 14px color-mix(in srgb, var(--rc) 30%, transparent); animation: sd-breathe 3.4s ease-in-out infinite; }
.rx-read { position: relative; display: flex; flex-direction: column; align-items: center; line-height: 1; z-index: 1; }
.rx-val { font-family: var(--sd-mono); font-size: 26px; font-weight: 800; color: var(--sd-text); }
.rx-of { font-size: 9px; font-weight: 700; color: var(--sd-text-muted); margin-top: 2px; }
.rx-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rx-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-family: var(--sd-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rc); }
.rx-label { font-size: 19px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.rx-sub { font-size: 11.5px; color: var(--sd-text-muted); }

/* KPI tiles */
.kpi { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 14px 14px 16px; border-radius: 16px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: transform 0.24s var(--sd-spring), border-color 0.22s, background 0.22s;
  animation: sd-deal 0.5s var(--sd-spring) both; animation-delay: calc(0.06s + var(--i, 0) * 0.05s); }
.kpi:disabled { cursor: default; }
.kpi:not(:disabled):hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--kc) 45%, transparent); }
.kpi.on { border-color: color-mix(in srgb, var(--kc) 60%, transparent); background: color-mix(in srgb, var(--kc) 10%, var(--sd-surface)); }
.kpi.pulse { animation: sd-deal 0.5s var(--sd-spring) both, sd-breach-flash 2.4s ease-out infinite; }
.kpi-sheen { position: absolute; top: 0; left: 0; width: 45%; height: 100%; pointer-events: none;
  background: linear-gradient(105deg, transparent, color-mix(in srgb, var(--kc) 9%, transparent), transparent); transform: translateX(-150%) skewX(-18deg); }
.kpi:not(:disabled):hover .kpi-sheen { animation: sd-tile-sheen 0.9s ease-out; }
.kpi-head { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 6px; }
.kpi-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--kc); background: color-mix(in srgb, var(--kc) 14%, transparent); }
.kpi-go { color: var(--sd-text-dim); opacity: 0; transition: opacity 0.2s, transform 0.2s; }
.kpi:hover .kpi-go { opacity: 1; transform: translate(2px, -2px); }
.kpi-val { font-size: 26px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; }
.kpi-lbl { font-size: 12px; font-weight: 700; color: var(--sd-text-secondary); }
.kpi-sub { font-size: 10.5px; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.kpi-bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--kc); transition: transform 0.3s var(--sd-spring); }
.kpi.on .kpi-bar { transform: scaleX(1); }

@media (max-width: 1100px) { .kpi-deck { grid-template-columns: repeat(3, 1fr); } .kpi-reactor { grid-column: span 3; } }
@media (max-width: 620px) { .kpi-deck { grid-template-columns: repeat(2, 1fr); } .kpi-reactor { grid-column: span 2; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rx-ring.r2, html:not([data-cinematic="on"]) .rx-core,
  html:not([data-cinematic="on"]) .kpi.pulse, html:not([data-cinematic="on"]) .kpi { animation: none; }
}
</style>
