<template>
  <Motion as="section" class="qvh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="qvh-grain" aria-hidden="true" />
    <span class="qvh-aura" aria-hidden="true" />

    <!-- ── console lead + duty card ── -->
    <div class="qvh-top">
      <div class="qvh-lead">
        <span class="qvh-eyebrow sd-mono">
          <span class="qvh-cross" aria-hidden="true" /> QUEUES · THE VITALS BAY · LIVE TELEMETRY
        </span>
        <h2 class="qvh-title">{{ laneCount }} queue{{ laneCount === 1 ? '' : 's' }} on telemetry.
          <em>Keep every lane in rhythm.</em></h2>
        <p class="qvh-sub">Every queue runs on its own monitor — the trace is ticket inflow, the ring is
          SLA attainment, and a breaching lane alarms before the backlog gets away from you.</p>
        <div class="qvh-ctas">
          <Motion v-for="t in tiers" :key="t.tier" as="button" class="qvh-tier sd-mono"
            :style="{ '--tc': t.color }" :while-hover="{ y: -2, scale: 1.03 }" :while-tap="{ scale: 0.96 }"
            :title="`Open the L${t.tier} desk`" @click="$emit('tier', t.tier)">
            L{{ t.tier }} <b>{{ t.open }}</b>
          </Motion>
          <Motion v-if="isAdmin" as="button" class="qvh-btn" :while-hover="{ y: -2, scale: 1.02 }"
            :while-tap="{ scale: 0.96 }" title="Open Queue Config" @click="$emit('config')">
            <SlidersHorizontal :size="13" /> Queue config
          </Motion>
          <Motion as="button" class="qvh-btn ghost" :class="{ spin: loading }" :while-hover="{ y: -2 }"
            :while-tap="{ scale: 0.94 }" title="Refresh telemetry" aria-label="Refresh" @click="$emit('refresh')">
            <RefreshCw :size="13" />
          </Motion>
        </div>
      </div>

      <div class="qvh-duty">
        <span class="qvh-shift sd-mono"><i class="qvh-dot" /> CREW ON SHIFT · {{ totals.agents_online ?? 0 }}/{{ totals.agents_total ?? 0 }}</span>
        <div v-if="me" class="qvh-signal">
          <i class="sd-mono">MY SIGNAL</i>
          <span class="qvh-status">
            <button v-for="(m, k) in AGENT_STATUS_META" :key="k" class="qvh-st" :class="{ on: me.status === k }"
              :style="{ '--sc': m.color }" :title="`${m.label} — ${m.blurb}`" @click="$emit('status', k)">
              {{ m.label }}
            </button>
          </span>
        </div>
      </div>
    </div>

    <!-- ── the fleet monitor (night phosphor in both themes) ── -->
    <div class="qvh-monitor" :class="{ flash: loading }">
      <div class="qvh-scr-head sd-mono">
        <span>FLEET TELEMETRY · <b>ALL VISIBLE QUEUES</b></span>
        <span>{{ rangeLabel }}</span>
      </div>
      <div class="qvh-scr-body">
        <svg class="qvh-ekg" viewBox="0 0 760 150" preserveAspectRatio="none" aria-hidden="true">
          <g class="qvh-grid">
            <line v-for="y in [37, 75, 113]" :key="'h' + y" x1="0" :y1="y" x2="760" :y2="y" />
            <line v-for="x in [152, 304, 456, 608]" :key="'v' + x" :x1="x" y1="0" :x2="x" y2="150" />
          </g>
          <path class="qvh-trace" :class="{ still: reduced }" :style="{ '--beat': beatSec + 's' }" :d="EKG_MAIN" />
          <path class="qvh-trace t2" :class="{ still: reduced }" :style="{ '--beat': (beatSec * 1.35) + 's' }" :d="EKG_OUT" />
        </svg>

        <div class="qvh-vitals sd-mono">
          <div class="qvh-vt">
            <span class="l">OPEN TICKETS</span>
            <span class="v amber"><SdCountUp :value="totals.open ?? 0" /></span>
            <span class="d" :class="deltaClass(deltas.outflow, deltas.inflow)">{{ censusDelta }}</span>
          </div>
          <div class="qvh-vt">
            <span class="l">INFLOW · /HR</span>
            <span class="v">{{ pulseInHr }}</span>
            <span class="d mut">resolved {{ pulseOutHr }}/hr · {{ rhythmLabel }}</span>
          </div>
          <div class="qvh-vt">
            <span class="l">SLA · RESPONSE</span>
            <span class="v" :class="o2Class(slaSplit.response)">{{ pct(slaSplit.response) }}</span>
            <span class="d" :class="trendClass(deltas.sla_response)">{{ trendText(deltas.sla_response, 'pt') }}</span>
          </div>
          <div class="qvh-vt">
            <span class="l">SLA · RESOLUTION</span>
            <span class="v" :class="o2Class(slaSplit.resolution)">{{ pct(slaSplit.resolution) }}</span>
            <span class="d" :class="trendClass(deltas.sla_resolution)">{{ trendText(deltas.sla_resolution, 'pt') }}</span>
          </div>
          <div class="qvh-vt">
            <span class="l">BREACHED</span>
            <span class="v" :class="(totals.breached || 0) > 0 ? 'red' : 'green'"><SdCountUp :value="totals.breached ?? 0" /></span>
            <span class="d mut">{{ totals.due_soon ?? 0 }} due ≤4h · {{ totals.critical ?? 0 }} critical</span>
          </div>
          <div class="qvh-vt">
            <span class="l">DRAIN ETA</span>
            <span class="v">{{ drainEta }}</span>
            <span class="d mut">burn {{ burnRate }}/hr · {{ reopens }} reopen{{ reopens === 1 ? '' : 's' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── lens dock ── -->
    <div class="qvh-lenses">
      <button v-for="l in lenses" :key="l.key" class="qvh-lens" :class="{ on: activeLens === l.key, stat: l.stat }"
        :style="{ '--lc': l.color }" :aria-pressed="!l.stat && activeLens === l.key" @click="$emit('pick', l)">
        <span class="qvh-lens-ic"><component :is="l.icon" :size="14" /></span>
        <span class="qvh-lens-val"><SdCountUp :value="l.value" /></span>
        <span class="qvh-lens-lb">{{ l.label }}</span>
        <span class="qvh-lens-bar" aria-hidden="true" />
      </button>
    </div>
  </Motion>
</template>

<script setup>
/* SdVitalsHero — "THE VITALS BAY" console (queues module · overview tab). The fleet
   as ONE ICU monitor: a phosphor screen (night-clinical in BOTH themes) running a
   looping EKG whose tempo follows real inflow, a six-cell vitals grid (census,
   pulse, SLA O₂ split, breaches, drain ETA) with period-over-period deltas, the
   MY SIGNAL availability lever, tier chips and the lens dock. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, SlidersHorizontal } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { AGENT_STATUS_META } from '@/composables/useSupportDesk'

const props = defineProps({
  overview: { type: Object, default: () => ({}) },
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  me: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
  days: { type: Number, default: 7 },
})
defineEmits(['pick', 'tier', 'config', 'refresh', 'status'])

/* one heartbeat cell = flat · P · QRS spike · T — repeated 5× across the strip */
const EKG_MAIN = 'M0,88 L60,88 L74,84 L86,92 L98,88 L112,88 L120,50 L128,126 L136,74 L144,88 L210,88 L224,84 L236,92 L248,88 L262,88 L270,50 L278,126 L286,74 L294,88 L360,88 L374,84 L386,92 L398,88 L412,88 L420,50 L428,126 L436,74 L444,88 L510,88 L524,84 L536,92 L548,88 L562,88 L570,50 L578,126 L586,74 L594,88 L660,88 L674,84 L686,92 L698,88 L712,88 L720,50 L728,126 L736,74 L744,88 L760,88'
const EKG_OUT = 'M0,116 L90,116 L100,112 L110,120 L120,116 L200,116 L210,100 L220,132 L230,110 L240,116 L330,116 L340,112 L350,120 L360,116 L440,116 L450,100 L460,132 L470,110 L480,116 L570,116 L580,112 L590,120 L600,116 L680,116 L690,100 L700,132 L710,110 L720,116 L760,116'

const totals = computed(() => props.overview.totals || {})
const deltas = computed(() => props.overview.deltas || {})
const slaSplit = computed(() => props.overview.sla_split || {})
const burn = computed(() => props.overview.burn || {})
const laneCount = computed(() => (props.overview.queues || []).length)
const reopens = computed(() => props.overview.reopens_range ?? 0)
const rangeLabel = computed(() => (props.overview.flow_interval === 'hour' ? '24H · HOURLY' : `${props.days}D RANGE`))

const tiers = computed(() => {
  const roll = props.overview.tier_rollup || {}
  return [1, 2, 3].filter(t => roll[String(t)]).map(t => ({
    tier: t, open: roll[String(t)].open ?? 0, color: `var(--sd-qs-t${t})`,
  }))
})

/* pulse: created per hour over the range (event-based, so it survives no-snapshot) */
const pulseInHr = computed(() => rate(deltas.value.inflow?.now))
const pulseOutHr = computed(() => rate(deltas.value.outflow?.now))
const rate = (n) => {
  if (n == null) return '—'
  const hrs = Math.max(1, props.days * 24)
  return (n / hrs).toFixed(1)
}
/* EKG tempo: faster strip when admissions outpace ~2/hr; clamped so it stays readable */
const beatSec = computed(() => {
  const inHr = Number(pulseInHr.value) || 0
  return Math.max(2.2, Math.min(6.5, 5.4 - inHr * 0.8)).toFixed(2)
})
const rhythmLabel = computed(() => {
  const b = totals.value.breached || 0
  return b > 0 ? (b >= 5 ? 'under strain' : 'uneven') : 'steady'
})

const censusDelta = computed(() => {
  const i = deltas.value.inflow?.now, o = deltas.value.outflow?.now
  if (i == null || o == null) return '—'
  const net = o - i
  return net >= 0 ? `▼ draining · out ${o} / in ${i}` : `▲ filling · in ${i} / out ${o}`
})
const deltaClass = (outD, inD) => {
  if (outD?.now == null || inD?.now == null) return 'mut'
  return outD.now >= inD.now ? 'up' : 'dn'
}
const trendClass = (d) => (d?.pct == null ? 'mut' : d.pct >= 0 ? 'up' : 'dn')
const trendText = (d, unit) => {
  if (d?.pct == null) return 'no prior range'
  return `${d.pct >= 0 ? '▲' : '▼'} ${Math.abs(d.pct)}${unit === 'pt' ? 'pt' : '%'} vs prev`
}
const pct = (v) => (v == null ? '—' : `${v}%`)
const o2Class = (v) => (v == null ? 'mut' : v >= 92 ? 'green' : v >= 80 ? 'warnc' : 'red')

const drainEta = computed(() => {
  const m = burn.value.drain_eta_mins
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h${String(Math.round(m % 60)).padStart(2, '0')}` : `${Math.round(h / 24)}d`
})
const burnRate = computed(() => burn.value.burn_rate_hr ?? '—')
</script>

<style scoped>
.qvh { position: relative; border-radius: 20px; overflow: hidden; padding: 22px 22px 18px;
  border: 1px solid var(--sd-qv-bezel-brd); background: var(--sd-qv-bezel);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28); }
.qvh-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image: radial-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px); background-size: 3px 3px; }
.qvh-aura { position: absolute; inset: -40% -20% auto; height: 120%; pointer-events: none;
  background: radial-gradient(700px 320px at 18% 0%, var(--sd-qv-soft), transparent 62%); }

/* ── top: lead + duty ── */
.qvh-top { position: relative; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.qvh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10px; letter-spacing: 0.22em;
  font-weight: 800; color: var(--sd-qv-core); }
.qvh-cross { width: 13px; height: 13px; position: relative; flex: none; }
.qvh-cross::before, .qvh-cross::after { content: ""; position: absolute; background: var(--sd-qv-core); border-radius: 2px; }
.qvh-cross::before { inset: 0 4.7px; }
.qvh-cross::after { inset: 4.7px 0; }
.qvh-cross { animation: qvh-beat 2.4s ease-in-out infinite; }
.qvh-title { margin: 9px 0 0; font-size: clamp(21px, 2.6vw, 30px); line-height: 1.08; font-weight: 800;
  letter-spacing: -0.01em; color: var(--sd-text); }
.qvh-title em { font-style: normal; background: var(--sd-qv-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.qvh-sub { margin: 7px 0 0; font-size: 12.5px; color: var(--sd-text-muted); max-width: 58ch; }
.qvh-ctas { display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.qvh-tier { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 10px;
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em; cursor: pointer; font-family: inherit;
  color: var(--sd-text-secondary); border: 1px solid color-mix(in srgb, var(--tc) 45%, transparent);
  background: color-mix(in srgb, var(--tc) 10%, transparent); }
.qvh-tier b { color: var(--tc); font-size: 12.5px; }
.qvh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 11px;
  font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit; color: #241703;
  border: 1px solid transparent; background: linear-gradient(135deg, var(--sd-qv-hi), var(--sd-qv-core)); }
.qvh-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.qvh-btn.ghost.spin svg { animation: qvh-spin 0.9s linear infinite; }
.qvh-duty { display: flex; flex-direction: column; gap: 9px; align-items: flex-end; }
.qvh-shift { display: inline-flex; align-items: center; gap: 8px; padding: 7px 13px; border-radius: 999px;
  font-size: 10.5px; letter-spacing: 0.14em; color: var(--sd-text-muted);
  border: 1px solid var(--sd-border); background: var(--sd-surface); }
.qvh-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-qv-go); animation: qvh-ping 2.2s infinite; }
.qvh-signal { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.qvh-signal > i { font-style: normal; font-size: 9px; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.qvh-status { display: inline-flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.qvh-st { padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; cursor: pointer;
  font-family: inherit; color: var(--sd-text-muted); border: 1px solid var(--sd-border);
  background: var(--sd-surface); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.qvh-st.on { color: var(--sc); border-color: color-mix(in srgb, var(--sc) 55%, transparent);
  background: color-mix(in srgb, var(--sc) 12%, transparent); }

/* ── the fleet monitor screen (night phosphor, BOTH themes) ── */
.qvh-monitor { position: relative; margin-top: 16px; border-radius: 14px; overflow: hidden;
  border: 1px solid rgba(160, 220, 160, 0.14);
  background: radial-gradient(900px 260px at 20% 0%, rgba(52, 211, 153, 0.06), transparent 60%), var(--sd-qv-screen); }
.qvh-monitor::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.13;
  background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(0, 0, 0, 0.65) 2px 3px); }
.qvh-monitor.flash { animation: qvh-defib 0.7s ease-out; }
.qvh-scr-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 12px 18px 0; font-size: 9.5px; letter-spacing: 0.2em; color: var(--sd-qv-screen-dim); }
.qvh-scr-head b { color: var(--sd-qv-core); }
.qvh-scr-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 340px); gap: 0; }
.qvh-ekg { display: block; width: 100%; height: 160px; min-width: 0; }
.qvh-grid line { stroke: var(--sd-qv-grid); stroke-width: 1; }
.qvh-trace { fill: none; stroke: var(--sd-qv-trace); stroke-width: 2.6; stroke-linecap: round;
  stroke-linejoin: round; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--sd-qv-trace) 65%, transparent));
  stroke-dasharray: 300 1400; animation: qvh-run var(--beat, 4.2s) linear infinite; }
.qvh-trace.t2 { stroke: var(--sd-qv-trace2); stroke-width: 1.8; opacity: 0.8;
  filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.5)); }
.qvh-trace.still { animation: none; stroke-dasharray: none; }
.qvh-vitals { display: grid; grid-template-columns: 1fr 1fr; border-left: 1px solid rgba(120, 180, 120, 0.12); }
.qvh-vt { padding: 11px 16px; border-bottom: 1px solid rgba(120, 180, 120, 0.1); min-width: 0; }
.qvh-vt:nth-last-child(-n+2) { border-bottom: none; }
.qvh-vt .l { display: block; font-size: 8.5px; letter-spacing: 0.18em; color: var(--sd-qv-screen-dim); }
.qvh-vt .v { display: block; font-size: 22px; font-weight: 800; margin-top: 2px; color: var(--sd-qv-screen-ink);
  font-variant-numeric: tabular-nums; }
.qvh-vt .v.amber { color: var(--sd-qv-trace); }
.qvh-vt .v.green { color: #34d399; }
.qvh-vt .v.warnc { color: #fbbf24; }
.qvh-vt .v.red { color: #fb7185; animation: qvh-blink 1.4s steps(2, end) infinite; }
.qvh-vt .v.mut { color: var(--sd-qv-screen-dim); }
.qvh-vt .d { display: block; font-size: 9.5px; margin-top: 1px; color: var(--sd-qv-screen-dim); }
.qvh-vt .d.up { color: #34d399; }
.qvh-vt .d.dn { color: #fb7185; }
.qvh-vt .d.mut { color: var(--sd-qv-screen-dim); }

/* ── lens dock ── */
.qvh-lenses { position: relative; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px; margin-top: 14px; }
.qvh-lens { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  padding: 10px 13px 12px; border-radius: 12px; cursor: pointer; overflow: hidden; text-align: left;
  font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s, box-shadow 0.2s; }
.qvh-lens:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.qvh-lens.on { border-color: var(--lc); box-shadow: 0 0 0 1px var(--lc); }
.qvh-lens.stat { cursor: default; }
.qvh-lens.stat:hover { transform: none; }
.qvh-lens-ic { color: var(--lc); }
.qvh-lens-val { font-size: 20px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.qvh-lens-lb { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-dim);
  font-weight: 700; }
.qvh-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0;
  background: linear-gradient(90deg, transparent, var(--lc), transparent); transition: opacity 0.2s; }
.qvh-lens.on .qvh-lens-bar, .qvh-lens:hover .qvh-lens-bar { opacity: 1; }

@keyframes qvh-run { from { stroke-dashoffset: 1700; } to { stroke-dashoffset: 0; } }
@keyframes qvh-beat { 0%, 100% { transform: scale(1); } 12% { transform: scale(1.22); } 24% { transform: scale(1); } }
@keyframes qvh-ping { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qv-go) 50%, transparent); }
  55% { box-shadow: 0 0 0 7px transparent; } }
@keyframes qvh-blink { 50% { opacity: 0.3; } }
@keyframes qvh-spin { to { transform: rotate(360deg); } }
@keyframes qvh-defib { 0% { box-shadow: inset 0 0 0 200px rgba(255, 255, 255, 0.12); } 100% { box-shadow: none; } }

@media (max-width: 900px) {
  .qvh-scr-body { grid-template-columns: 1fr; }
  .qvh-vitals { border-left: none; border-top: 1px solid rgba(120, 180, 120, 0.12); }
  .qvh-lenses { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qvh-trace,
  html:not([data-cinematic="on"]) .qvh-cross,
  html:not([data-cinematic="on"]) .qvh-dot,
  html:not([data-cinematic="on"]) .qvh-vt .v.red,
  html:not([data-cinematic="on"]) .qvh-monitor.flash { animation: none; }
}
</style>
