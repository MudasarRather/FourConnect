<template>
  <section class="sd-field sd-grain" :class="{ idle: !nodes.length }" aria-label="Triage field — live SLA frontier">
    <!-- Ambient layers -->
    <div class="fld-lattice" />
    <div class="fld-aura" />
    <div class="fld-motes">
      <span v-for="m in 18" :key="m" class="mote" :style="moteStyle(m)" />
    </div>

    <!-- Breach zone + advancing frontier -->
    <div class="fld-breachzone" />
    <div class="fld-frontier"><span class="fr-line" /><span class="fr-scan" /><span class="fr-label">SLA</span></div>

    <!-- Lane labels -->
    <div class="fld-lanes">
      <div v-for="l in LANES" :key="l.key" class="lane" :style="{ '--lc': l.color }">
        <span class="lane-tag">{{ l.label }}</span>
        <span class="lane-rule" />
      </div>
    </div>

    <!-- Plotted ticket nodes -->
    <div class="fld-plot">
      <button
        v-for="n in nodes"
        :key="n.id"
        type="button"
        class="node"
        :class="{ breached: n.breached, hot: n.dueSoon }"
        :style="n.style"
        :title="n.title"
        @click="$emit('open', n.id)"
      >
        <span class="node-core" />
        <span class="node-ring" />
      </button>
    </div>

    <!-- HUD -->
    <header class="fld-hud">
      <div class="hud-lead">
        <Radar :size="15" />
        <span class="hud-title">Triage Field</span>
        <span class="hud-sub">live SLA frontier</span>
      </div>
      <div class="hud-stats">
        <span class="hud-stat"><b>{{ inFlight }}</b> in flight</span>
        <span class="hud-stat danger" v-if="breaching"><b>{{ breaching }}</b> breaching</span>
        <span class="hud-stat warn" v-if="dueSoonCount"><b>{{ dueSoonCount }}</b> due soon</span>
        <span v-if="overflow" class="hud-stat dim">+{{ overflow }} more</span>
      </div>
    </header>

    <p v-if="!nodes.length && !loading" class="fld-empty">All clear — no active tickets in the field.</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Radar } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})
defineEmits(['open'])

const LANES = [
  { key: 'critical', label: 'CRIT', color: 'var(--sd-pri-critical)' },
  { key: 'urgent', label: 'URG', color: 'var(--sd-pri-urgent)' },
  { key: 'high', label: 'HIGH', color: 'var(--sd-pri-high)' },
  { key: 'medium', label: 'MED', color: 'var(--sd-pri-medium)' },
  { key: 'low', label: 'LOW', color: 'var(--sd-pri-low)' },
]
const LANE_IX = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 }
const CAP = 46
const MAX_AGE_H = 48 // tickets w/o an SLA clock map age→x against this horizon

// cheap deterministic hash → stable jitter per ticket
const hash = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) & 0xffff; return h }

const active = computed(() => props.tickets.filter(t => !['closed', 'resolved'].includes(t.status)))

const scored = computed(() => active.value.map(t => {
  const created = t.created_at ? new Date(t.created_at).getTime() : props.now
  const dueRaw = t.resolution_due_at || t.response_due_at
  const due = dueRaw ? new Date(dueRaw).getTime() : null
  let frac
  if (due != null && due > created) frac = (props.now - created) / (due - created)
  else frac = ((props.now - created) / 3600000) / MAX_AGE_H
  frac = Math.max(0, frac)
  const breached = t.sla_resolution_breached || t.sla_resolution_state === 'breached' || (due != null && props.now > due)
  const dueSoon = !breached && (t.sla_resolution_state === 'due-soon' || frac >= 0.82)
  return { t, created, due, frac, breached, dueSoon, lane: LANE_IX[t.priority] ?? 3 }
}))

// keep the most urgent CAP nodes so the field never overcrowds
const ordered = computed(() => [...scored.value].sort((a, b) =>
  (b.breached - a.breached) || (b.dueSoon - a.dueSoon) || (b.frac - a.frac)))

const overflow = computed(() => Math.max(0, ordered.value.length - CAP))
const inFlight = computed(() => active.value.length)
const breaching = computed(() => scored.value.filter(s => s.breached).length)
const dueSoonCount = computed(() => scored.value.filter(s => s.dueSoon).length)

const nodes = computed(() => ordered.value.slice(0, CAP).map(s => {
  const j = hash(s.t.id)
  const xClamped = Math.min(s.frac, 1.06)            // a touch past the frontier when breached
  const x = 9 + Math.min(xClamped, 1.02) * 78        // 9%..~88% maps to before the frontier (~88%)
  const yJit = ((j % 100) / 100 - 0.5) * 9           // ±4.5% jitter within lane band
  const y = 12 + s.lane * 16.4 + yJit                // 5 lanes across the plot height
  const sz = s.t.priority === 'critical' ? 16 : s.t.priority === 'urgent' ? 14 : s.t.priority === 'low' ? 9 : 12
  const color = `var(--sd-pri-${s.t.priority})`
  return {
    id: s.t.id,
    breached: s.breached,
    dueSoon: s.dueSoon,
    title: `${s.t.ticket_number} · ${s.t.subject}`,
    style: {
      left: `${x}%`, top: `${y}%`,
      '--nc': s.breached ? 'var(--sd-danger)' : color,
      '--sz': `${sz}px`,
      '--d': `${(j % 40) / 10}s`,
    },
  }
}))

const moteStyle = (i) => {
  const j = hash('m' + i)
  return {
    left: `${(j % 100)}%`, top: `${(hash('y' + i) % 90) + 4}%`,
    '--md': `${6 + (j % 60) / 10}s`, '--delay': `${(j % 50) / 10}s`,
    '--ms': `${1 + (j % 20) / 10}px`,
  }
}
</script>

<style scoped>
.sd-field {
  position: relative; height: 224px; border-radius: 20px; overflow: hidden;
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(251, 146, 60, 0.07), transparent 55%),
    linear-gradient(180deg, var(--sd-basin), var(--sd-canvas));
  border: 1px solid var(--sd-border); box-shadow: var(--sd-card-shadow);
}
.fld-lattice {
  position: absolute; inset: 0; opacity: 0.5; pointer-events: none;
  background-image:
    linear-gradient(var(--sd-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--sd-border) 1px, transparent 1px);
  background-size: 46px 100%, 64px 56px;
  mask-image: linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent);
  transform: perspective(620px) rotateX(34deg) scale(1.25); transform-origin: bottom;
}
.fld-aura { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(70% 90% at 50% 120%, var(--sd-fluid-glow), transparent 70%); opacity: 0.35; }

.fld-motes { position: absolute; inset: 0; pointer-events: none; }
.mote {
  position: absolute; width: var(--ms); height: var(--ms); border-radius: 50%;
  background: var(--sd-amber); opacity: 0.4; box-shadow: 0 0 6px var(--sd-fluid-glow);
  animation: fld-mote var(--md) ease-in-out var(--delay) infinite;
}
@keyframes fld-mote {
  0%, 100% { transform: translate(0, 0); opacity: 0.18; }
  50% { transform: translate(8px, -12px); opacity: 0.5; }
}

.fld-breachzone {
  position: absolute; top: 0; bottom: 0; right: 0; width: 13%; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--sd-danger-soft) 60%, color-mix(in srgb, var(--sd-danger) 18%, transparent));
}
.fld-frontier { position: absolute; top: 0; bottom: 0; left: 87%; width: 0; pointer-events: none; }
.fr-line { position: absolute; top: 8%; bottom: 8%; left: 0; width: 2px; background: linear-gradient(180deg, transparent, var(--sd-danger), transparent); box-shadow: 0 0 12px var(--sd-danger); opacity: 0.8; }
.fr-label { position: absolute; top: 6px; left: -10px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-danger); font-family: var(--sd-mono); }
.fr-scan { position: absolute; top: 0; bottom: 0; left: -100%; width: 100%; }
.sd-field::after { /* sweeping read-head across the whole field */
  content: ""; position: absolute; top: 0; bottom: 0; left: -30%; width: 22%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.07), transparent);
  animation: fld-sweep 7s linear infinite;
}
@keyframes fld-sweep { 0% { left: -30%; } 100% { left: 100%; } }

.fld-lanes { position: absolute; inset: 30px 0 8px; pointer-events: none; }
.lane { position: relative; height: 16.4%; }
.lane-tag { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 8px; font-weight: 800; letter-spacing: 0.08em; color: var(--lc); font-family: var(--sd-mono); opacity: 0.7; }
.lane-rule { position: absolute; left: 44px; right: 13%; top: 50%; height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--lc) 22%, transparent), transparent); }

.fld-plot { position: absolute; inset: 30px 0 8px; }
.node {
  position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%;
  transform: translate(-50%, -50%); cursor: pointer; background: none; border: none; padding: 0;
  transition: transform 0.2s var(--sd-spring);
}
.node-core { position: absolute; inset: 0; border-radius: 50%; background: var(--nc); box-shadow: 0 0 10px var(--nc), inset 0 0 4px rgba(255, 255, 255, 0.4); }
.node-ring { position: absolute; inset: -5px; border-radius: 50%; border: 1px solid var(--nc); opacity: 0; }
.node:hover { transform: translate(-50%, -50%) scale(1.5); z-index: 4; }
.node:hover .node-ring { opacity: 0.55; }
.node.hot .node-ring { opacity: 0.4; animation: sd-pulse-ring 2s ease-in-out infinite; }
.node.breached .node-core { animation: sd-breach-flash 1.4s ease-in-out infinite; }

.fld-hud { position: absolute; top: 12px; left: 14px; right: 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; z-index: 5; }
.hud-lead { display: inline-flex; align-items: center; gap: 8px; color: var(--sd-amber); }
.hud-title { font-size: 13px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.hud-sub { font-size: 10px; color: var(--sd-text-dim); font-family: var(--sd-mono); text-transform: uppercase; letter-spacing: 0.08em; }
.hud-stats { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.hud-stat { font-size: 11px; color: var(--sd-text-muted); padding: 3px 9px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.hud-stat b { color: var(--sd-text); font-weight: 800; font-variant-numeric: tabular-nums; }
.hud-stat.danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 30%, transparent); }
.hud-stat.danger b { color: var(--sd-danger); }
.hud-stat.warn { color: var(--sd-warning); border-color: var(--sd-amber-border); }
.hud-stat.dim { color: var(--sd-text-dim); }

.fld-empty { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: var(--sd-text-dim); font-size: 13px; }

@media (max-width: 640px) { .sd-field { height: 196px; } .hud-sub { display: none; } }
/* Respect OS Reduce Motion unless the in-app Cinematic mode is on. */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .mote,
  html:not([data-cinematic="on"]) .sd-field::after,
  html:not([data-cinematic="on"]) .node.hot .node-ring,
  html:not([data-cinematic="on"]) .node.breached .node-core { animation: none; }
}
</style>
