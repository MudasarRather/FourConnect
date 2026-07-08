<template>
  <!-- Squad Telemetry — per-agent live load across the team. Each agent is a console
       tile: a conic load-ring (avatar core) + a segmented tick meter (open vs busiest) +
       critical/breach pips. Tone = balanced(emerald)/busy(amber)/overloaded(red). Click a
       tile → filter the board/list to that agent. The whole-team distribution at a glance. -->
  <section class="sqd">
    <header class="sqd-head">
      <span class="sqd-title"><span class="sqd-ic"><Users :size="13" /></span> Squad telemetry</span>
      <div class="sqd-meta">
        <span class="sqd-balance" :class="balanceTone"><i /> {{ balanceLabel }}</span>
        <span class="sqd-sub sd-mono">{{ squad.length }} active · {{ totalOpen }} open</span>
      </div>
    </header>

    <p v-if="!squad.length" class="sqd-empty"><ShieldCheck :size="15" /> No assigned load on the team right now — the basin is calm.</p>

    <div v-else class="sqd-grid">
      <Motion v-for="(a, i) in rows" :key="a.agent_id" as="button" type="button"
        class="sqt" :class="[a.tone, { on: active === String(a.agent_id) }]"
        :style="{ '--tc': a.col }"
        :initial="reduced ? false : { opacity: 0, y: 14, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, delay: reduced ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="reduced ? {} : { y: -3 }" :while-tap="{ scale: 0.98 }"
        @click="emit('pick', String(a.agent_id))">
        <span class="sqt-glow" aria-hidden="true" />
        <!-- load ring -->
        <span class="sqt-ring" :style="{ '--sd-p': (a.pct * 3.6) + 'deg' }">
          <span class="sqt-ring-core">{{ a.initials }}</span>
        </span>
        <!-- identity + meter -->
        <span class="sqt-body">
          <span class="sqt-top">
            <span class="sqt-name">{{ a.name }}</span>
            <span class="sqt-n sd-mono">{{ a.open }}</span>
          </span>
          <span class="sqt-state">{{ a.label }}</span>
          <span class="sqt-meter" :aria-label="`${a.open} open`">
            <i v-for="seg in SEGMENTS" :key="seg" class="seg" :class="{ lit: seg <= a.litSegs }" />
          </span>
          <span v-if="a.critical || a.breaching" class="sqt-pips">
            <span v-if="a.critical" class="pip crit" :title="`${a.critical} critical`"><AlertTriangle :size="9" /> {{ a.critical }}</span>
            <span v-if="a.breaching" class="pip brc" :title="`${a.breaching} breaching`"><Timer :size="9" /> {{ a.breaching }}</span>
          </span>
        </span>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Users, ShieldCheck, AlertTriangle, Timer } from 'lucide-vue-next'

const props = defineProps({
  squad: { type: Array, default: () => [] },
  active: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])

const SEGMENTS = 10
const BUSY = 4, OVER = 8

const maxOpen = computed(() => Math.max(1, ...props.squad.map(a => a.open || 0)))
const totalOpen = computed(() => props.squad.reduce((s, a) => s + (a.open || 0), 0))

const initials = (n) => (n || 'A').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'A'
const toneOf = (open) => (open <= BUSY ? 'balanced' : open <= OVER ? 'busy' : 'over')
const colOf = (tone) => ({ balanced: 'var(--sd-success)', busy: 'var(--sd-warning)', over: 'var(--sd-danger)' }[tone])
const labelOf = (tone) => ({ balanced: 'Balanced', busy: 'Busy', over: 'Overloaded' }[tone])

const rows = computed(() => props.squad.map(a => {
  const open = a.open || 0
  const tone = toneOf(open)
  const pct = Math.round((open / maxOpen.value) * 100)
  return {
    ...a, open, tone, pct, col: colOf(tone), label: labelOf(tone),
    initials: initials(a.name),
    litSegs: Math.max(open > 0 ? 1 : 0, Math.round((open / maxOpen.value) * SEGMENTS)),
  }
}))

const avgOpen = computed(() => (props.squad.length ? totalOpen.value / props.squad.length : 0))
const balanceTone = computed(() => (avgOpen.value > OVER ? 'over' : avgOpen.value > BUSY ? 'busy' : 'balanced'))
const balanceLabel = computed(() => ({ over: 'Heavy load', busy: 'Steady', balanced: 'Balanced' }[balanceTone.value]))
</script>

<style scoped>
.sqd { display: flex; flex-direction: column; gap: 13px; }
.sqd-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.sqd-title { display: inline-flex; align-items: center; gap: 9px; font-size: 12.5px; font-weight: 800; letter-spacing: 0.02em; color: var(--sd-text); }
.sqd-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--sd-amber);
  background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.sqd-meta { display: inline-flex; align-items: center; gap: 12px; }
.sqd-balance { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--bc, var(--sd-border-strong)); color: var(--bcl, var(--sd-text-secondary)); }
.sqd-balance i { width: 6px; height: 6px; border-radius: 50%; background: var(--bcl, var(--sd-steel)); box-shadow: 0 0 7px var(--bcl, transparent); }
.sqd-balance.balanced { --bcl: var(--sd-success); --bc: color-mix(in srgb, var(--sd-success) 32%, transparent); }
.sqd-balance.busy { --bcl: var(--sd-warning); --bc: color-mix(in srgb, var(--sd-warning) 32%, transparent); }
.sqd-balance.over { --bcl: var(--sd-danger); --bc: color-mix(in srgb, var(--sd-danger) 36%, transparent); }
.sqd-sub { font-size: 10.5px; color: var(--sd-text-dim); }
.sqd-empty { display: inline-flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--sd-text-muted); padding: 14px 4px; }
.sqd-empty svg { color: var(--sd-success); }

.sqd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 10px; }

.sqt {
  position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 13px 14px; border-radius: 15px;
  text-align: left; cursor: pointer; font-family: inherit;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.22s var(--sd-spring), box-shadow 0.22s var(--sd-spring), background 0.22s;
}
.sqt:hover { border-color: color-mix(in srgb, var(--tc) 46%, var(--sd-border-strong)); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3); }
.sqt.on { border-color: var(--tc); box-shadow: 0 0 0 1px var(--tc), 0 14px 34px rgba(0, 0, 0, 0.34); background: color-mix(in srgb, var(--tc) 8%, var(--sd-surface)); }
.sqt-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, var(--tc) 16%, transparent), transparent 60%); }
.sqt:hover .sqt-glow, .sqt.on .sqt-glow { opacity: 1; }

.sqt-ring { position: relative; width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  background: conic-gradient(var(--tc) var(--sd-p, 0deg), color-mix(in srgb, var(--sd-text-dim) 22%, transparent) 0);
  transition: --sd-p 0.7s var(--sd-spring); }
.sqt-ring::before { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--sd-surface-elevated); }
.sqt-ring-core { position: relative; z-index: 1; font-size: 13px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.sqt.over .sqt-ring { box-shadow: 0 0 16px color-mix(in srgb, var(--sd-danger) 40%, transparent); }

.sqt-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.sqt-top { display: flex; align-items: baseline; gap: 8px; }
.sqt-name { font-size: 12.5px; font-weight: 700; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.sqt-n { font-size: 14px; font-weight: 800; color: var(--tc); letter-spacing: -0.02em; }
.sqt-state { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tc); }
.sqt-meter { display: flex; gap: 2.5px; margin-top: 2px; }
.sqt-meter .seg { flex: 1; height: 5px; border-radius: 2px; background: color-mix(in srgb, var(--sd-text-dim) 20%, transparent); transition: background 0.4s var(--sd-spring), box-shadow 0.4s; }
.sqt-meter .seg.lit { background: var(--tc); box-shadow: 0 0 6px color-mix(in srgb, var(--tc) 60%, transparent); }
.sqt-pips { display: inline-flex; gap: 5px; margin-top: 3px; }
.pip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 6px; font-size: 9.5px; font-weight: 800; font-family: var(--sd-mono); }
.pip.crit { color: var(--sd-pri-critical); background: color-mix(in srgb, var(--sd-pri-critical) 14%, transparent); }
.pip.brc { color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 14%, transparent); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sqt-ring { transition: none; }
}
</style>
