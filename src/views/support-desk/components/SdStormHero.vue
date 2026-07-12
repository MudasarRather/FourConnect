<template>
  <Motion as="section" class="sbh" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── headline row: bureau desk + duty plates ── -->
    <div class="sbh-grid">
      <div class="sbh-lead">
        <Motion as="p" class="sbh-eyebrow sd-mono" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
          <CloudSun :size="12" /> QUEUES · L2 GRID · THE STORM BUREAU
        </Motion>
        <Motion as="h2" class="sbh-title" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
          Watch the pressure.<br /><em>Call the front.</em>
        </Motion>
        <Motion as="p" class="sbh-sub" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.5, delay: 0.26 }">
          Deep troubleshooting — escalated and complex work, served in order.
        </Motion>

        <!-- forecast readouts -->
        <Motion as="div" class="sbh-readouts sd-mono" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.34, ease: [0.16, 1, 0.3, 1] }">
          <span class="sbh-ro" :class="{ hot: nextBreachMs !== null && nextBreachMs < 3600000 }"
            title="Soonest resolution deadline among workable tickets">
            <AlarmClock :size="11" /> NEXT SLA BREACH <b>{{ nextBreachLabel }}</b>
          </span>
          <span class="sbh-ro" title="At the trailing 4-hour resolve pace">
            <Wind :size="11" /> QUEUE DRAIN <b>{{ drainLabel }}</b>
          </span>
          <span class="sbh-ro" title="Resolves per hour, trailing 4h">
            <Gauge :size="11" /> PACE <b>{{ stats.burn_rate_hr ?? 0 }}/hr</b>
          </span>
          <span class="sbh-ro" title="Time you logged today (worklog entries)">
            <Timer :size="11" /> MY LOG <b>{{ loggedLabel }}</b>
          </span>
        </Motion>

        <!-- CTAs -->
        <Motion as="div" class="sbh-ctas" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <Motion as="button" class="sbh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
            :disabled="playing || loading || stats.no_queues || meAway"
            :title="meAway ? 'You are set Away — go Available to take work' : 'Claim the next ticket per serve order'"
            @click="$emit('serve')">
            <Play :size="14" /> {{ playing ? 'On watch…' : 'Start the watch' }} <kbd>S</kbd>
          </Motion>
          <Motion as="button" class="sbh-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
            @click="$emit('unowned')">
            <HandHelping :size="14" /> Unowned <kbd>U</kbd>
          </Motion>
          <Motion as="button" class="sbh-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
            @click="$emit('refresh')">
            <RefreshCw :size="14" :class="{ 'sbh-spin': loading }" /> Refresh <kbd>R</kbd>
          </Motion>
          <Motion as="button" class="sbh-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
            title="Skip governance — the stewards' report" @click="$emit('stewards')">
            <Scale :size="14" /> Skips
          </Motion>
        </Motion>
      </div>

      <!-- duty status + ACK duty chip -->
      <div class="sbh-side">
        <Motion as="div" class="sbh-duty" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.3 }">
          <p class="sbh-duty-t sd-mono">MY STATUS</p>
          <div class="sbh-duty-row" role="tablist" aria-label="Availability">
            <button v-for="s in DUTY" :key="s.key" class="sbh-duty-b" :class="{ on: myStatus === s.key }"
              role="tab" :aria-selected="myStatus === s.key" :title="s.blurb" @click="$emit('status', s.key)">
              <i :style="{ background: s.color }" />{{ s.label }}
            </button>
          </div>
        </Motion>
        <Motion v-if="(stats.ack_pending || 0) > 0" as="button" class="sbh-ack" :while-hover="{ y: -2 }"
          :while-tap="{ scale: 0.97 }" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.38 }"
          title="Escalated tickets nobody has acknowledged — click to see them" @click="$emit('acks')">
          <BellRing :size="13" /> ACK PENDING <b class="sd-mono">{{ stats.ack_pending }}</b>
        </Motion>
      </div>
    </div>

    <!-- ── the stage: framed synoptic chart + barometer card ── -->
    <div class="sbh-stage">
      <Motion as="div" class="sbh-panel" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <header class="sbh-panel-h sd-mono">
          <span>SYNOPTIC CHART · L2 SECTOR</span>
          <span>{{ clock }} LOCAL</span>
        </header>
        <div class="sbh-panel-body">
          <SdStormChart :breached="stats.breached || 0" :escalated="stats.escalated || 0"
            :open="openCount" :pulse="pulse" :reduced="reduced" />
        </div>
        <footer class="sbh-legend sd-mono">
          <span><i class="lg-line" /> ISOBARS — QUEUE PRESSURE</span>
          <span><i class="lg-dot halt" /> STORM CELLS — BREACHED TICKETS</span>
          <span><i class="lg-dot front" /> FRONT — ESCALATION INFLOW</span>
        </footer>
      </Motion>

      <Motion as="div" class="sbh-baro" :initial="{ opacity: 0, scale: 0.94 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.55, delay: 0.38, ease: [0.16, 1, 0.3, 1] }"
        :title="`Board health: ${stats.health || 'green'} — pressure falls as breaches and escalations pile up`">
        <p class="sbh-baro-t sd-mono">BAROMETER · QUEUE LOAD</p>
        <svg viewBox="0 0 120 120" class="sbh-baro-svg" aria-hidden="true">
          <circle cx="60" cy="60" r="54" class="sbh-baro-rim" />
          <circle cx="60" cy="60" r="47" class="sbh-baro-face" />
          <g v-for="k in 11" :key="k" :transform="`rotate(${-120 + (k - 1) * 24} 60 60)`">
            <line x1="60" y1="17" x2="60" :y2="(k - 1) % 5 === 0 ? 24 : 21" class="sbh-baro-tick" />
          </g>
          <text x="60" y="84" text-anchor="middle" class="sbh-baro-word">MILLIBARS</text>
          <g class="sbh-baro-needle" :style="{ transform: `rotate(${baroAngle}deg)` }">
            <line x1="60" y1="60" x2="60" y2="22" />
            <circle cx="60" cy="60" r="3.4" />
          </g>
        </svg>
        <p class="sbh-baro-val sd-mono">{{ hpaLabel }} <em>hPa</em></p>
        <span class="sbh-baro-trend sd-mono" :class="trend.tone">{{ trend.label }}</span>
      </Motion>
    </div>

    <!-- ── station dials (lenses) ── -->
    <div class="sbh-lenses" role="tablist" aria-label="Board lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="sbh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lz': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.5 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? {} : { y: -3 }" :while-tap="l.stat ? {} : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="sbh-lens-val sd-mono"><SdCountUp :value="l.value" /></span>
        <span class="sbh-lens-dial" aria-hidden="true"><component :is="l.icon" :size="12" /></span>
        <span class="sbh-lens-lab">{{ l.label }}</span>
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdStormHero — the Storm Bureau chart room. Scenery is meteorological (isobars,
   barometer, fronts); every functional label stays plain queue language. Layout
   mirrors the approved Concept-6 artifact: headline block, then a FRAMED synoptic
   chart panel beside the barometer card, then the station-dial stat chips. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  CloudSun, Play, HandHelping, RefreshCw, Scale, AlarmClock, Wind, Gauge, Timer, BellRing,
} from 'lucide-vue-next'
import SdStormChart from './SdStormChart.vue'
import SdCountUp from './SdCountUp.vue'
import { AGENT_STATUS_META } from '@/composables/useSupportDesk'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  queues: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  playing: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
  pulse: { type: Number, default: 0 },
})
defineEmits(['pick', 'serve', 'unowned', 'refresh', 'status', 'stewards', 'acks'])

const DUTY = ['online', 'focus', 'away'].map(k => ({ key: k, ...AGENT_STATUS_META[k] }))
const myStatus = computed(() => props.stats.my_status || 'online')
const meAway = computed(() => ['away', 'offline'].includes(myStatus.value))
const openCount = computed(() => Object.values(props.stats.status_counts || {}).reduce((a, b) => a + b, 0))

/* chart-corner clock */
const clock = computed(() => {
  const d = new Date(props.now)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})

/* barometric pressure — an honest synthesis of queue load: every breach, escalation,
   near-due and unowned ticket pushes the needle off fair weather */
const hpa = computed(() => {
  const s = props.stats
  const p = 1013.2
    - 9 * (s.breached || 0)
    - 4 * (s.escalated || 0)
    - 1.5 * (s.due_soon || 0)
    - 0.8 * (s.unassigned || 0)
  return Math.max(948, Math.min(1031, p))
})
const hpaLabel = computed(() => hpa.value.toFixed(1))
const trend = computed(() => {
  const h = props.stats.health || 'green'
  if (h === 'red') return { label: 'FALLING', tone: 'halt' }
  if (h === 'amber') return { label: 'FALLING', tone: 'warn' }
  return { label: 'STEADY', tone: 'go' }
})
/* needle: 948 hPa (stormy, hard left) … 1031 hPa (fair, right) + slow honest wobble */
const baroAngle = computed(() => {
  const t = (hpa.value - 948) / (1031 - 948)
  const wob = ((props.now / 1000) % 4) < 2 ? 1.6 : -1.6
  return -110 + t * 180 + wob
})

/* next-breach ticker */
const nextBreachMs = computed(() => {
  if (!props.stats.next_breach_at) return null
  return new Date(props.stats.next_breach_at).getTime() - props.now
})
const nextBreachLabel = computed(() => {
  const ms = nextBreachMs.value
  if (ms === null) return '—'
  if (ms <= 0) return 'NOW'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
})
const drainLabel = computed(() => {
  const m = props.stats.drain_eta_mins
  if (m === null || m === undefined) return '—'
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`
})
const loggedLabel = computed(() => {
  const m = props.stats.my_logged_today_mins || 0
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
})
</script>

<style scoped>
/* the chart room stays a NIGHT chart room in both themes (deliberate stage) */
.sbh { position: relative; overflow: hidden; border-radius: 22px; padding: 20px 22px 16px;
  background:
    radial-gradient(1200px 420px at 78% -10%, var(--sd-l2-soft), transparent 60%),
    linear-gradient(160deg, color-mix(in srgb, var(--sd-l2-deep-bg) 92%, var(--sd-l2-core)) 0%, var(--sd-l2-deep-bg) 55%);
  border: 1px solid var(--sd-l2-brd); color: #f2e9d8; }
[data-theme="light"] .sbh { background:
    radial-gradient(1200px 420px at 78% -10%, rgba(251, 125, 60, 0.14), transparent 60%),
    linear-gradient(160deg, #1a120a 0%, #0d0805 55%); }

.sbh-grid { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 22px; align-items: start; }
@media (max-width: 980px) { .sbh-grid { grid-template-columns: 1fr; } }

.sbh-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin: 0 0 10px; padding: 6px 11px;
  border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.2em;
  color: var(--sd-l2-hi); border: 1px solid var(--sd-l2-brd); background: rgba(0, 0, 0, 0.3); }
/* !important: theme-light-rescue.css `[class*="page"] h2` catch-all paints headings
   dark ink in light mode — this hero is a night stage in BOTH themes, so the title
   must stay vellum or it vanishes into the dark backdrop. */
.sbh-title { margin: 0 0 6px; font-size: clamp(21px, 2.2vw, 30px); line-height: 1.06; font-weight: 800;
  letter-spacing: -0.015em; color: #f2e9d8 !important; }
.sbh-title em { font-style: normal; background: var(--sd-l2-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.sbh-sub { margin: 0 0 10px; max-width: 56ch; font-size: 12.5px; color: rgba(242, 233, 216, 0.72); }

.sbh-readouts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 11px; }
.sbh-ro { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 9px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; color: rgba(242, 233, 216, 0.62);
  border: 1px solid rgba(232, 220, 195, 0.16); background: rgba(0, 0, 0, 0.28);
  font-variant-numeric: tabular-nums; }
.sbh-ro b { color: var(--sd-l2-hi); }
.sbh-ro.hot b { color: var(--sd-l2-halt); }

.sbh-ctas { display: flex; flex-wrap: wrap; gap: 9px; }
.sbh-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
  font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
  border: 1px solid rgba(232, 220, 195, 0.2); background: rgba(0, 0, 0, 0.3); color: #f2e9d8; }
.sbh-btn.primary { border-color: transparent; background: var(--sd-l2-grad); color: #26120a;
  box-shadow: var(--sd-l2-glow); }
.sbh-btn:disabled { opacity: 0.6; cursor: default; }
.sbh-btn kbd { padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 800;
  border: 1px solid currentColor; opacity: 0.65; }
.sbh-spin { animation: sbh-rot 1s linear infinite; }
@keyframes sbh-rot { to { transform: rotate(360deg); } }

.sbh-side { display: flex; flex-direction: column; gap: 10px; align-items: stretch; min-width: 218px; }
.sbh-duty { padding: 11px 13px; border-radius: 14px; border: 1px solid rgba(232, 220, 195, 0.16);
  background: rgba(0, 0, 0, 0.32); }
.sbh-duty-t { margin: 0 0 8px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: rgba(242, 233, 216, 0.55); }
.sbh-duty-row { display: flex; gap: 6px; }
.sbh-duty-b { display: inline-flex; align-items: center; gap: 6px; flex: 1; justify-content: center;
  padding: 7px 8px; border-radius: 9px; font-family: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer;
  border: 1px solid rgba(232, 220, 195, 0.16); background: transparent; color: rgba(242, 233, 216, 0.6); }
.sbh-duty-b i { width: 7px; height: 7px; border-radius: 50%; }
.sbh-duty-b.on { border-color: var(--sd-l2-core); color: #f2e9d8;
  background: color-mix(in srgb, var(--sd-l2-core) 14%, transparent); }

.sbh-ack { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 12px;
  border-radius: 12px; font-family: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em;
  cursor: pointer; color: var(--sd-l2-warn); border: 1px solid color-mix(in srgb, var(--sd-l2-warn) 45%, transparent);
  background: color-mix(in srgb, var(--sd-l2-warn) 10%, rgba(0, 0, 0, 0.3));
  animation: sbh-ack-pulse 2.4s ease-in-out infinite; }
.sbh-ack b { font-size: 12px; }
@keyframes sbh-ack-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-l2-warn) 28%, transparent); }
  50% { box-shadow: 0 0 0 6px transparent; } }

/* ── the stage: chart panel + barometer ── */
.sbh-stage { position: relative; display: grid; grid-template-columns: 1fr 218px; gap: 12px; margin-top: 14px; align-items: stretch; }
@media (max-width: 860px) { .sbh-stage { grid-template-columns: 1fr; } }

.sbh-panel { display: flex; flex-direction: column; border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(232, 220, 195, 0.16); background: rgba(0, 0, 0, 0.30); }
.sbh-panel-h { display: flex; justify-content: space-between; gap: 10px; padding: 11px 14px 0;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: rgba(242, 233, 216, 0.55);
  font-variant-numeric: tabular-nums; }
.sbh-panel-body { position: relative; flex: 1; min-height: clamp(150px, 14vw, 210px); }
.sbh-legend { display: flex; flex-wrap: wrap; gap: 16px; padding: 0 14px 11px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: rgba(242, 233, 216, 0.5); }
.sbh-legend span { display: inline-flex; align-items: center; gap: 7px; }
.sbh-legend .lg-line { width: 16px; height: 0; border-top: 1.5px solid var(--sd-l2-ink); opacity: 0.7; }
.sbh-legend .lg-dot { width: 8px; height: 8px; border-radius: 50%; }
.sbh-legend .lg-dot.halt { background: var(--sd-l2-halt); }
.sbh-legend .lg-dot.front { background: var(--sd-l2-front); }

.sbh-baro { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  padding: 10px 14px; border-radius: 16px;
  border: 1px solid rgba(232, 220, 195, 0.16); background: rgba(0, 0, 0, 0.32); }
.sbh-baro-t { margin: 0; font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: rgba(242, 233, 216, 0.55); }
.sbh-baro-svg { width: 96px; height: 96px; }
.sbh-baro-rim { fill: none; stroke: var(--sd-l2-brd); stroke-width: 2.4; }
.sbh-baro-face { fill: rgba(232, 220, 195, 0.05); stroke: rgba(232, 220, 195, 0.14); }
.sbh-baro-tick { stroke: rgba(232, 220, 195, 0.4); stroke-width: 1.4; }
.sbh-baro-word { font-size: 6.5px; letter-spacing: 0.2em; fill: rgba(232, 220, 195, 0.5);
  font-family: var(--sd-mono, monospace); }
.sbh-baro-needle line { stroke: var(--sd-l2-core); stroke-width: 2.4; stroke-linecap: round; }
.sbh-baro-needle circle { fill: var(--sd-l2-core); }
.sbh-baro-needle { transform-origin: 60px 60px; transition: transform 1.6s cubic-bezier(0.34, 1.4, 0.4, 1); }
.sbh-baro-val { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums; color: #f2e9d8; }
.sbh-baro-val em { font-style: normal; font-size: 11px; color: rgba(242, 233, 216, 0.55); }
.sbh-baro-trend { padding: 4px 12px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.18em; }
.sbh-baro-trend.halt { color: var(--sd-l2-halt); border: 1px solid color-mix(in srgb, var(--sd-l2-halt) 50%, transparent); }
.sbh-baro-trend.warn { color: var(--sd-l2-warn); border: 1px solid color-mix(in srgb, var(--sd-l2-warn) 50%, transparent); }
.sbh-baro-trend.go { color: var(--sd-l2-go); border: 1px solid color-mix(in srgb, var(--sd-l2-go) 45%, transparent); }

/* ── station dials — artifact chip geometry: big value, icon top-right, label below ── */
.sbh-lenses { position: relative; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
@media (max-width: 1100px) { .sbh-lenses { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 640px) { .sbh-lenses { grid-template-columns: repeat(2, 1fr); } }
.sbh-lens { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; row-gap: 6px;
  align-items: start; padding: 13px 14px; border-radius: 14px; font-family: inherit; cursor: pointer; text-align: left;
  border: 1px solid rgba(232, 220, 195, 0.14); background: rgba(0, 0, 0, 0.3); color: #f2e9d8;
  transition: border-color 0.2s, background 0.2s; }
.sbh-lens.stat { cursor: default; }
.sbh-lens.on { border-color: var(--lz); background: color-mix(in srgb, var(--lz) 13%, rgba(0, 0, 0, 0.3)); }
.sbh-lens-val { grid-column: 1; grid-row: 1; font-size: 24px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.sbh-lens-dial { grid-column: 2; grid-row: 1; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
  color: var(--lz); border: 1px solid color-mix(in srgb, var(--lz) 55%, transparent);
  background: color-mix(in srgb, var(--lz) 10%, transparent); }
.sbh-lens-lab { grid-column: 1 / -1; grid-row: 2; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: rgba(242, 233, 216, 0.58); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sbh-ack { animation: none; }
  html:not([data-cinematic="on"]) .sbh-spin { animation: none; }
  html:not([data-cinematic="on"]) .sbh-baro-needle { transition: none; }
}
</style>
