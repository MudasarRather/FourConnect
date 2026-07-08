<template>
  <section class="tld sd-card">
    <header class="tld-head">
      <div class="tld-title">
        <span class="tld-ic"><Layers :size="15" /></span>
        <div>
          <h3>Tier ledger</h3>
          <p>Where the escalations sit — each lane is a tier, each blip placed by time at tier.</p>
        </div>
      </div>
      <span class="tld-tag sd-mono">DWELL AXIS · 10m → 48h+</span>
    </header>

    <!-- ── tier strata (top tier on top — heat rises) ── -->
    <div class="tld-strata">
      <Motion v-for="(lane, li) in lanes" :key="lane.key" as="button" class="tld-lane"
        :class="{ on: activeTier === lane.key, empty: !lane.items.length }"
        :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.45, delay: li * 0.07, ease: [0.16, 1, 0.3, 1] }"
        @click="$emit('pick', { kind: 'tier', value: activeTier === lane.key ? '' : lane.key })">
        <span class="lane-id sd-mono">
          <b>{{ lane.label }}</b>
          <i>{{ lane.sub }}</i>
        </span>
        <span class="lane-track">
          <span class="lane-rail" aria-hidden="true" />
          <span v-for="g in GRID" :key="g.k" class="lane-tick" :style="{ left: g.x + '%' }" aria-hidden="true" />
          <span v-for="b in lane.items" :key="b.id" class="lane-blip"
            :class="[b.state, { hot: b.overdue }]" :style="{ left: b.x + '%', '--bc': b.color }"
            :title="`${b.num} · ${b.dwell} at tier · ${b.stateLabel}`"
            @click.stop="$emit('open', b.id)">
            <i class="blip-core" /><i v-if="b.overdue" class="blip-ring" />
          </span>
          <span v-if="!lane.items.length" class="lane-cool sd-mono">COOL</span>
        </span>
        <span class="lane-count sd-mono" :style="{ '--bc': lane.color }">{{ lane.items.length }}</span>
      </Motion>
      <div class="tld-axis sd-mono" aria-hidden="true">
        <span v-for="g in GRID" :key="g.k" :style="{ left: g.x + '%' }">{{ g.k }}</span>
      </div>
    </div>

    <!-- ── escalation-reason spectrum (proportional; click to filter) ── -->
    <div v-if="spectrum.length" class="tld-spec">
      <div class="spec-bar" role="presentation">
        <Motion v-for="(s, i) in spectrum" :key="s.code" as="button" class="spec-seg"
          :class="{ on: activeReason === s.code }"
          :style="{ width: s.pct + '%', '--bc': s.color }"
          :title="`${s.label} — ${s.count} (${s.pct}%)`"
          :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
          :transition="{ duration: 0.5, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
          @click="$emit('pick', { kind: 'reason', value: activeReason === s.code ? '' : s.code })" />
      </div>
      <div class="spec-chips">
        <button v-for="s in spectrum" :key="s.code" class="spec-chip" :class="{ on: activeReason === s.code }"
          :style="{ '--bc': s.color }"
          @click="$emit('pick', { kind: 'reason', value: activeReason === s.code ? '' : s.code })">
          <i class="sc-dot" />{{ s.label }} <b class="sd-mono">{{ s.count }}</b>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
/* SdTierLedger — the Escalated desk's second instrument: horizontal TIER STRATA
   (L1 / L2 / L3+ lanes, blips positioned on the shared log-dwell axis, click a lane to
   lens that tier / a blip to open the ticket) + the proportional escalation-REASON
   spectrum below (mirrors the hold-reason spectrum mechanic; a new vertical-tier axis
   no sibling uses). Pure DOM/CSS — text-bearing, crisp, cheap. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Layers } from 'lucide-vue-next'
import { escReasonLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // ACTIVE escalations (working set, lensless)
  now: { type: Number, default: () => Date.now() },
  activeTier: { type: String, default: '' },      // '' | 't1' | 't2' | 't3'
  activeReason: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'open'])

const DWELL_MIN = 10 * 60000, DWELL_MAX = 48 * 3600000
const dwellMs = (t) => (Number.isFinite(t.time_since_escalated_ms) && t.time_since_escalated_ms != null)
  ? Math.max(0, t.time_since_escalated_ms)
  : (t.escalated_at ? Math.max(0, props.now - new Date(t.escalated_at).getTime()) : 0)
const xOf = (ms) => {
  const c = Math.min(DWELL_MAX, Math.max(DWELL_MIN, ms))
  return 3 + 94 * (Math.log(c / DWELL_MIN) / Math.log(DWELL_MAX / DWELL_MIN))
}
const GRID = [
  { k: '10m', x: 3 }, { k: '1h', x: xOf(3600000) }, { k: '4h', x: xOf(4 * 3600000) },
  { k: '12h', x: xOf(12 * 3600000) }, { k: '48h+', x: 97 },
]
const fmtDwell = (ms) => {
  const m = Math.floor(ms / 60000)
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
}
const blipOf = (t) => {
  const overdue = !!t.esc_response_overdue
  const acked = !!t.escalation_acked
  return {
    id: String(t.id), num: t.ticket_number, x: xOf(dwellMs(t)), overdue,
    state: overdue ? 'over' : (acked ? 'acked' : 'wait'),
    stateLabel: overdue ? 'ack overdue' : (acked ? 'acknowledged' : 'awaiting ack'),
    color: overdue ? 'var(--sd-danger)' : (acked ? 'var(--sd-esc-core)' : 'var(--sd-esc-auto)'),
    dwell: fmtDwell(dwellMs(t)),
  }
}
const lanes = computed(() => {
  const l1 = [], l2 = [], l3 = []
  for (const t of props.tickets) {
    const lvl = t.escalation_level || 1
    ;(lvl >= 3 ? l3 : lvl === 2 ? l2 : l1).push(blipOf(t))
  }
  return [
    { key: 't3', label: 'TIER 3+', sub: 'Engineering · Leadership', color: 'var(--sd-esc-deep)', items: l3 },
    { key: 't2', label: 'TIER 2', sub: 'Specialist', color: 'var(--sd-esc-core)', items: l2 },
    { key: 't1', label: 'TIER 1', sub: 'Front-line lift', color: 'var(--sd-esc-hi)', items: l1 },
  ]
})

/* reason-code spectrum */
const REASON_COLORS = {
  sla_risk: 'var(--sd-warning)', sla_breach: 'var(--sd-danger)', customer_request: 'var(--sd-amber)',
  complexity: 'var(--sd-esc-core)', expertise: 'var(--sd-esc-hi)', vendor_stall: 'var(--sd-steel)',
  repeat_incident: 'var(--sd-esc-deep)', vip: 'var(--sd-esc-auto)', major_incident: 'var(--sd-crit-core)',
  other: 'var(--sd-text-dim)', unset: 'var(--sd-text-dim)',
}
const spectrum = computed(() => {
  const by = {}
  for (const t of props.tickets) {
    const c = t.escalation_reason_code || 'unset'
    by[c] = (by[c] || 0) + 1
  }
  const total = props.tickets.length || 1
  return Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({
      code, count,
      pct: Math.max(3, Math.round((count / total) * 100)),
      label: code === 'unset' ? 'Uncoded' : escReasonLabel(code),
      color: REASON_COLORS[code] || 'var(--sd-esc-core)',
    }))
})
</script>

<style scoped>
.tld { padding: 16px 18px 14px; display: flex; flex-direction: column; gap: 14px; }
.tld-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.tld-title { display: flex; gap: 10px; align-items: flex-start; }
.tld-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--sd-esc-core); background: var(--sd-esc-soft); border: 1px solid color-mix(in srgb, var(--sd-esc-core) 30%, transparent); }
.tld-title h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.tld-title p { margin: 2px 0 0; font-size: 11.5px; color: var(--sd-text-muted); }
.tld-tag { margin-left: auto; font-size: 9.5px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-text-dim);
  border: 1px solid var(--sd-border); border-radius: 7px; padding: 5px 9px; align-self: center; }

/* strata */
.tld-strata { position: relative; display: flex; flex-direction: column; gap: 8px; padding-bottom: 18px; }
.tld-lane { display: grid; grid-template-columns: 128px 1fr 40px; align-items: center; gap: 12px;
  padding: 9px 12px; border-radius: 13px; cursor: pointer; text-align: left; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); color: var(--sd-text);
  transition: border-color 0.2s, background 0.2s; }
.tld-lane:hover { border-color: color-mix(in srgb, var(--sd-esc-core) 45%, transparent); }
.tld-lane.on { border-color: var(--sd-esc-core); background: var(--sd-esc-soft); }
.tld-lane.empty { opacity: 0.72; }
.lane-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.lane-id b { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-text); }
.lane-id i { font-style: normal; font-size: 9.5px; letter-spacing: 0.04em; color: var(--sd-text-dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lane-track { position: relative; height: 30px; min-width: 0; }
.lane-rail { position: absolute; left: 0; right: 0; top: 50%; height: 2px; transform: translateY(-50%);
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-esc-hi) 34%, transparent), color-mix(in srgb, var(--sd-esc-deep) 44%, transparent));
  border-radius: 2px; }
.lane-tick { position: absolute; top: 4px; bottom: 4px; width: 1px; background: var(--sd-border); }
.lane-blip { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 18px; height: 18px;
  display: grid; place-items: center; border: none; background: none; cursor: pointer; padding: 0; }
.blip-core { width: 9px; height: 9px; border-radius: 50%; background: var(--bc); box-shadow: 0 0 9px color-mix(in srgb, var(--bc) 70%, transparent); }
.lane-blip.wait .blip-core { animation: tld-flicker 1.5s ease-in-out infinite; }
.lane-blip:hover .blip-core { transform: scale(1.45); }
.blip-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.6px solid var(--bc); animation: tld-ring 1.5s ease-out infinite; }
.lane-cool { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-size: 8.5px; letter-spacing: 0.28em; color: var(--sd-text-dim); }
.lane-count { justify-self: end; font-size: 15px; font-weight: 800; color: var(--bc); font-variant-numeric: tabular-nums; }
.tld-axis { position: absolute; left: 152px; right: 64px; bottom: 0; height: 14px; }
.tld-axis span { position: absolute; transform: translateX(-50%); font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-dim); }

/* spectrum */
.tld-spec { display: flex; flex-direction: column; gap: 9px; padding-top: 12px; border-top: 1px solid var(--sd-border); }
.spec-bar { display: flex; height: 12px; border-radius: 7px; overflow: hidden; gap: 2px; }
.spec-seg { border: none; cursor: pointer; padding: 0; background: color-mix(in srgb, var(--bc) 72%, transparent);
  transform-origin: left; transition: filter 0.16s, opacity 0.16s; min-width: 8px; }
.spec-seg:hover { filter: brightness(1.2); }
.spec-seg.on { outline: 1.6px solid var(--bc); outline-offset: 1px; }
.spec-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.spec-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s; }
.spec-chip:hover { border-color: color-mix(in srgb, var(--bc) 55%, transparent); color: var(--sd-text); }
.spec-chip.on { border-color: var(--bc); color: var(--bc); background: color-mix(in srgb, var(--bc) 10%, transparent); }
.sc-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--bc); }
.spec-chip b { font-size: 10.5px; }

@keyframes tld-flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes tld-ring { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1.7); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .lane-blip.wait .blip-core,
  html:not([data-cinematic="on"]) .blip-ring { animation: none; }
}
@media (max-width: 760px) {
  .tld-lane { grid-template-columns: 84px 1fr 34px; }
  .lane-id i { display: none; }
  .tld-axis { left: 108px; }
}
</style>
