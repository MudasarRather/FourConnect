<template>
  <Motion as="section" class="pw" :style="{ '--tc': meta.accent }" :initial="{ opacity: 0, y: 14 }"
    :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <!-- ── carbon stage + start-light gantry ── -->
    <div class="pw-stage" aria-hidden="true">
      <div class="pw-carbon" />
      <div class="pw-apex" />
      <canvas ref="teleCanvas" class="pw-tele" />
      <div class="pw-gantry" :class="{ done: lightsOut }">
        <span v-for="i in 5" :key="i" class="pw-lamp" :class="{ lit: litCount >= i && !lightsOut }" />
      </div>
      <span class="pw-tiermark sd-mono">{{ meta.short }}</span>
      <span class="pw-kerb" />
    </div>
    <div class="pw-grain" aria-hidden="true" />
    <div class="pw-scrim" aria-hidden="true" />

    <div class="pw-grid" :class="{ ready: lightsOut }">
      <!-- ── race-engineer console ── -->
      <div class="pw-console">
        <div class="pw-eyebrow">
          <span class="pw-live" :class="{ hot: (stats.breached || 0) > 0 }" aria-hidden="true" />
          QUEUES · {{ meta.short }} GRID · PIT WALL
        </div>
        <h2 class="pw-title">{{ titleLead }} <em>{{ titleAccent }}</em></h2>
        <p class="pw-sub">{{ subLine }}</p>

        <div class="pw-ctas">
          <Motion as="button" class="pw-btn primary" :class="{ on: playing }" :disabled="loading || stats.no_queues || meAway"
            :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
            :title="meAway ? 'You are set Away — go Online to serve' : playing ? 'Play mode live — serving by serve order' : 'Claim the next ticket per serve order'"
            @click="$emit('serve')">
            <Play :size="15" /> {{ playing ? 'Serving · on' : 'Serve next' }}
          </Motion>
          <Motion v-if="(stats.unassigned || 0) > 0" as="button" class="pw-btn tinted"
            :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
            title="Jump to the unowned pool at this tier" @click="$emit('unowned')">
            <HandHelping :size="15" /> {{ stats.unassigned }} unowned
          </Motion>
          <Motion as="button" class="pw-btn ghost icon" title="Stewards' report — skip governance"
            :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('stewards')">
            <ScrollText :size="14" />
          </Motion>
          <Motion as="button" class="pw-btn ghost icon" title="Refresh telemetry" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" @click="$emit('refresh')">
            <RefreshCw :size="14" :class="{ 'pw-spin': loading }" />
          </Motion>
        </div>

        <!-- race-control readouts -->
        <div class="pw-readouts sd-mono">
          <span class="pw-ro" :class="{ hot: breachTense }"><i>NEXT BREACH</i><b>{{ nextBreachIn }}</b></span>
          <span class="pw-ro"><i>QUEUE DRAIN</i><b>{{ fmtMin(stats.drain_eta_mins) }}</b></span>
          <span class="pw-ro"><i>PACE / HR</i><b>{{ stats.burn_rate_hr ?? '—' }}</b></span>
          <span class="pw-ro"><i>OLDEST WAIT</i><b>{{ fmtMin(stats.oldest_wait_mins) }}</b></span>
          <span class="pw-ro"><i>MY RESOLVES · TEAM</i><b>{{ stats.my_resolved_today ?? 0 }}<em class="pw-of">/{{ stats.resolved_today ?? 0 }}</em></b></span>
        </div>

        <!-- availability plate -->
        <div class="pw-plate" role="radiogroup" aria-label="My availability">
          <span class="pw-plate-lb sd-mono">MY STATUS</span>
          <button v-for="(sm, key) in STATUSES" :key="key" class="pw-st" :class="{ on: myStatus === key }"
            :style="{ '--sc': sm.color }" role="radio" :aria-checked="myStatus === key" :title="sm.blurb"
            @click="$emit('status', key)">
            <i class="pw-st-dot" />{{ sm.label }}
          </button>
          <span v-if="advisory" class="pw-advice sd-mono" :title="advisory.long"><Radio :size="11" /> {{ advisory.short }}</span>
        </div>
      </div>

      <!-- ── timing tower ── -->
      <div class="pw-tower" role="list" :aria-label="`${meta.short} timing tower — serve order`">
        <header class="pw-tw-head sd-mono">
          <span class="pw-tw-flag" aria-hidden="true" />
          TIMING TOWER · SERVE ORDER
          <b>{{ towerRows.length ? `TOP ${towerRows.length}` : 'CLEAR' }}</b>
        </header>
        <TransitionGroup name="tw" tag="div" class="pw-tw-body">
          <button v-for="(t, i) in towerRows" :key="t.id" class="pw-row" :style="{ '--i': i }" role="listitem"
            :title="`Open ${t.ticket_number}`" @click="$emit('open', t)">
            <span class="pw-pos sd-mono">{{ i + 1 }}</span>
            <span class="pw-car sd-mono"><b>{{ carOf(t) }}</b><i>{{ t.ticket_number }}</i></span>
            <span class="pw-rowmain">
              <span class="pw-subj">{{ t.subject }}</span>
              <span class="pw-rowsub sd-mono">
                <em :class="`p-${priBand(t)}`">P{{ priBand(t) }}</em>
                · {{ laneOf(t) }} · {{ t.assigned_agent_name || 'UNOWNED' }}
              </span>
            </span>
            <span class="pw-tyre" :class="tyreTone(t)" aria-hidden="true">
              <svg viewBox="0 0 20 20" width="20" height="20">
                <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-opacity="0.22" stroke-width="2.6" />
                <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="2.6"
                  stroke-linecap="round" :stroke-dasharray="`${tyreLeft(t) * 47.1} 47.1`"
                  transform="rotate(-90 10 10)" />
              </svg>
            </span>
            <span class="pw-rowright">
              <span class="pw-gap sd-mono" :class="gapTone(t)">{{ gapOf(t) }}</span>
              <span class="pw-chip sd-mono" :class="chipOf(t).cls">{{ chipOf(t).label }}</span>
            </span>
          </button>
          <p v-if="!towerRows.length" key="empty" class="pw-tw-empty sd-mono">QUEUE CLEAR — NOTHING WAITING</p>
        </TransitionGroup>

        <!-- sector bars: page-level SLA health -->
        <div v-if="towerRows.length" class="pw-sectors sd-mono" aria-label="Sector health">
          <span v-for="s in sectors" :key="s.key" class="pw-sector">
            <i>{{ s.label }}</i>
            <span class="pw-sec-bar"><b :style="{ transform: `scaleX(${s.fill})`, background: s.color }" /></span>
            <em :class="{ hot: s.hot }">{{ s.note }}</em>
          </span>
        </div>
        <div class="pw-tele-legend sd-mono" aria-hidden="true">
          <span class="lg intake">— INTAKE</span><span class="lg breach">— BREACH LOAD</span>
        </div>
      </div>
    </div>

    <!-- ── telemetry lenses: pit-wall dials ── -->
    <div class="pw-lensdock" role="tablist" :aria-label="`${meta.short} lenses`">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="pw-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" :style="{ '--lc': l.color }"
        role="tab" :aria-selected="activeLens === l.key"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.2 + i * 0.045, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? undefined : { y: -3 }" :while-tap="l.stat ? undefined : { scale: 0.97 }"
        @click="$emit('pick', l)">
        <span class="pl-ring" :style="{ '--fill': lensFill(l) }" aria-hidden="true">
          <span class="pl-ic"><component :is="l.icon" :size="13" /></span>
        </span>
        <span class="pl-body">
          <span class="pl-val"><SdCountUp v-if="typeof l.value === 'number'" :value="l.value" /><template v-else>{{ l.value }}</template></span>
          <span class="pl-lb">{{ l.label }}</span>
        </span>
        <span class="pl-bar" aria-hidden="true" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdPitWallHero — the L-tier working queue as an F1 pit wall: start-light gantry
   gates the entrance, a FLIP-animated TIMING TOWER shows the serve order live
   (tyre arc = SLA remaining, gap = time to due), a canvas telemetry trace hums
   along the track edge, and the race-engineer console carries race control
   readouts (next breach ticker, drain ETA, burn rate) + the DRIVER STATUS plate
   (availability — serve-next now refuses away/offline). Same emit contract as the
   old platform hero + `status`, `stewards`, `open`. */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Play, RefreshCw, HandHelping, ScrollText, Radio } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { TIER_META, AGENT_STATUS_META } from '@/composables/useSupportDesk'

const props = defineProps({
  tier: { type: Number, required: true },
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  queues: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  advisory: { type: Object, default: null },
  playing: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
})
defineEmits(['pick', 'serve', 'unowned', 'refresh', 'status', 'stewards', 'open'])

const meta = computed(() => TIER_META[props.tier] || TIER_META[1])
const STATUSES = AGENT_STATUS_META
const myStatus = computed(() => props.stats.my_status || 'online')
const meAway = computed(() => ['away', 'offline'].includes(myStatus.value))

const TITLES = {
  1: ['Read the track.', 'Call the box.'],
  2: ['Hard compounds,', 'harder problems.'],
  3: ['Final stint before', 'the factory.'],
}
const titleLead = computed(() => TITLES[props.tier]?.[0] || 'Work the')
const titleAccent = computed(() => TITLES[props.tier]?.[1] || 'grid.')
const subLine = computed(() => (props.stats.no_queues
  ? 'No lanes are laid at this tier yet — an admin can add one in Queue Config.'
  : `${meta.value.blurb} Serve in order, skip with a reason, escalate with a record.`))

/* ── timing tower ── */
// 20 deep now that the tower scrolls internally (height is capped in CSS — more
// traffic scrolls instead of stretching the hero).
const towerRows = computed(() => (props.rows || []).slice(0, 20))
const carOf = (t) => {
  const digits = String(t.ticket_number || '').replace(/\D/g, '')
  return digits.slice(-2).padStart(2, '0') || '—'
}
const laneById = computed(() => Object.fromEntries((props.queues || []).map(q => [String(q.id), q.name])))
const laneOf = (t) => laneById.value[String(t.queue_id)] || 'Lane'
const PRI_BAND = { urgent: 1, critical: 1, high: 2, medium: 3, low: 4 }
const priBand = (t) => PRI_BAND[t.priority] || 3
const chipOf = (t) => {
  if ((t.viewing || []).length) return { label: 'VIEWED', cls: 'ghost' }
  if (t.sla_resolution_state === 'breached' || t.sla_response_state === 'breached') return { label: 'BREACHED', cls: 'bad' }
  if (t.is_escalated) return { label: `ESC · L${Math.min(3, (t.escalation_level || 1) + 1)}`, cls: 'esc' }
  if (t.sla_resolution_state === 'due-soon' || t.sla_response_state === 'due-soon') return { label: 'DUE SOON', cls: 'warn' }
  return { label: 'HEALTHY', cls: 'ok' }
}

/* sector bars — page-level SLA health across the visible rows */
const sectors = computed(() => {
  const rs = props.rows || []
  const n = Math.max(1, rs.length)
  const respBad = rs.filter(t => t.sla_response_state === 'breached').length
  const owned = rs.filter(t => t.assigned_agent_id).length
  const resBad = rs.filter(t => t.sla_resolution_state === 'breached').length
  const tone = (bad) => (bad === 0 ? 'var(--sd-qs-go)' : bad <= 2 ? 'var(--sd-qs-warn)' : 'var(--sd-qs-halt)')
  return [
    { key: 's1', label: 'S1 · FIRST RESPONSE', fill: (n - respBad) / n, color: tone(respBad), hot: respBad > 0, note: respBad ? `${respBad} breached` : 'on target' },
    { key: 's2', label: 'S2 · OWNERSHIP', fill: owned / n, color: owned === n ? 'var(--sd-qs-go)' : 'var(--sd-qs-warn)', hot: owned < n, note: owned < n ? `${n - owned} unowned` : 'all claimed' },
    { key: 's3', label: 'S3 · RESOLUTION', fill: (n - resBad) / n, color: tone(resBad), hot: resBad > 0, note: resBad ? `${resBad} breached` : 'on target' },
  ]
})

/* lens dials — ring fill = share of all work */
const lensFill = (l) => {
  const total = Math.max(1, (props.lenses.find(x => x.key === 'all')?.value) || 0)
  const v = typeof l.value === 'number' ? l.value : 0
  return `${Math.round(Math.min(1, v / total) * 360)}deg`
}
const tyreLeft = (t) => {
  const created = t.created_at ? new Date(t.created_at).getTime() : 0
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 0
  if (!created || !due || due <= created) return 1
  return Math.max(0, Math.min(1, (due - props.now) / (due - created)))
}
const tyreTone = (t) => {
  const left = tyreLeft(t)
  const breached = t.sla_resolution_state === 'breached' || left <= 0
  return breached ? 'flat' : left < 0.25 ? 'worn' : 'fresh'
}
const gapOf = (t) => {
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 0
  if (!due) return '· · ·'
  const s = Math.round((due - props.now) / 1000)
  const a = Math.abs(s)
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), ss = a % 60
  const core = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`
  return (s < 0 ? '−' : '+') + core
}
const gapTone = (t) => {
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 0
  if (!due) return ''
  const s = due - props.now
  return s < 0 ? 'bad' : s < 4 * 3600e3 ? 'warn' : 'ok'
}

/* ── race-control tickers ── */
const nextBreachIn = computed(() => {
  const at = props.stats.next_breach_at ? new Date(props.stats.next_breach_at).getTime() : 0
  if (!at) return (props.stats.breached || 0) > 0 ? 'ON TRACK' : '—'
  const s = Math.max(0, Math.round((at - props.now) / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
})
const breachTense = computed(() => {
  const at = props.stats.next_breach_at ? new Date(props.stats.next_breach_at).getTime() : 0
  return (props.stats.breached || 0) > 0 || (at && at - props.now < 3600e3)
})
const fmtMin = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${(m / 60).toFixed(1)}h` : `${(m / 1440).toFixed(1)}d`)

/* ── start-light gantry: five ambers, then lights out ── */
const litCount = ref(0)
const lightsOut = ref(false)
let gantryTimers = []
const runGantry = () => {
  if (props.reduced) { litCount.value = 5; lightsOut.value = true; return }
  for (let i = 1; i <= 5; i++) gantryTimers.push(setTimeout(() => { litCount.value = i }, 140 + i * 190))
  gantryTimers.push(setTimeout(() => { lightsOut.value = true }, 1650))
}

/* ── telemetry trace canvas (ambient throttle/delta lines) ── */
const teleCanvas = ref(null)
let raf = 0
const runTele = () => {
  const cv = teleCanvas.value
  if (!cv || props.reduced) return
  const ctx = cv.getContext('2d')
  let w = 0, h = 0
  const size = () => {
    const r = cv.getBoundingClientRect()
    w = cv.width = Math.max(1, Math.floor(r.width * devicePixelRatio))
    h = cv.height = Math.max(1, Math.floor(r.height * devicePixelRatio))
  }
  size()
  const N = 140
  const a = new Array(N).fill(0.5), b = new Array(N).fill(0.14)
  let va = 0, t0 = 0, spike = 0
  const step = (ts) => {
    if (ts - t0 > 42) {
      t0 = ts
      // intake: smooth random-walk (amber)
      va = Math.max(-0.05, Math.min(0.05, va + (Math.random() - 0.5) * 0.03))
      a.push(Math.max(0.08, Math.min(0.92, a[a.length - 1] + va))); a.shift()
      // breach load: ECG-style spikes, more frequent when the tier carries breaches
      const p = 0.012 + Math.min(0.08, (props.stats.breached || 0) * 0.02)
      if (spike > 0) { b.push(spike === 2 ? 0.85 : 0.3); spike-- }
      else if (Math.random() < p) { spike = 2; b.push(0.5) }
      else b.push(0.12 + Math.random() * 0.04)
      b.shift()
      ctx.clearRect(0, 0, w, h)
      const draw = (arr, color, alpha) => {
        ctx.beginPath()
        arr.forEach((v, i) => {
          const x = (i / (N - 1)) * w, y = h - v * h
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        })
        ctx.strokeStyle = color
        ctx.globalAlpha = alpha
        ctx.lineWidth = 1.6 * devicePixelRatio
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      draw(a, '#f5b942', 0.55)
      draw(b, '#ef4444', 0.5)
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  window.addEventListener('resize', size)
}

onMounted(() => { runGantry(); runTele() })
onBeforeUnmount(() => { gantryTimers.forEach(clearTimeout); cancelAnimationFrame(raf) })
</script>

<style scoped>
.pw { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent);
  background: var(--sd-qs-deep-bg); min-height: clamp(400px, 36vw, 470px);
  display: flex; flex-direction: column; justify-content: flex-end; }
[data-theme="light"] .pw { background: #14100a; }

/* ── stage: carbon weave + apex glow + kerb + telemetry ── */
.pw-stage { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.pw-carbon { position: absolute; inset: 0; opacity: 0.5;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.028) 0 2px, transparent 2px 6px),
    repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.02) 0 2px, transparent 2px 6px); }
.pw-apex { position: absolute; right: -10%; top: -30%; width: 60%; height: 120%;
  background: radial-gradient(ellipse at center, color-mix(in srgb, var(--tc) 18%, transparent), transparent 65%); }
.pw-tele { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 84px; opacity: 0.8; }
.pw-kerb { position: absolute; left: 0; right: 0; bottom: 84px; height: 6px;
  background: repeating-linear-gradient(90deg, var(--sd-qs-halt) 0 26px, #f6efdf 26px 52px); opacity: 0.24; }
.pw-tiermark { position: absolute; right: 4%; bottom: 14%; font-size: clamp(70px, 10vw, 140px); font-weight: 800;
  font-style: italic; letter-spacing: -0.06em; color: color-mix(in srgb, var(--tc) 15%, transparent); user-select: none; }

/* start-light gantry */
.pw-gantry { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); z-index: 3;
  display: flex; gap: 10px; padding: 9px 13px; border-radius: 12px;
  border: 1px solid rgba(246, 239, 223, 0.14); background: rgba(9, 7, 4, 0.66);
  transition: opacity 0.6s ease 0.25s, transform 0.6s ease 0.25s; }
.pw-gantry.done { opacity: 0; transform: translateX(-50%) translateY(-8px); pointer-events: none; }
.pw-lamp { width: 13px; height: 13px; border-radius: 50%; background: rgba(246, 239, 223, 0.1);
  transition: background 0.12s, box-shadow 0.12s; }
.pw-lamp.lit { background: var(--sd-qs-core, #f5b942); box-shadow: 0 0 12px var(--sd-qs-core, #f5b942); }

.pw-grain { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); }
.pw-scrim { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(105deg, rgba(8, 6, 3, 0.72) 0%, rgba(8, 6, 3, 0.34) 44%, transparent 70%),
    linear-gradient(0deg, rgba(8, 6, 3, 0.66) 0%, transparent 34%); }

/* ── layout grid: console + tower, revealed at lights-out ── */
.pw-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(320px, 500px) minmax(280px, 1fr);
  gap: 18px; align-items: start; padding: 22px 22px 0; opacity: 0; transform: translateY(10px);
  transition: opacity 0.5s var(--sd-spring, ease), transform 0.5s var(--sd-spring, ease); }
.pw-grid.ready { opacity: 1; transform: none; }

/* console — dark glass, light ink in BOTH themes (sits on the night stage) */
.pw-console { padding: 18px 20px; border-radius: 18px; border: 1px solid var(--sd-border-strong);
  background: rgba(9, 7, 4, 0.58); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.pw-console, [data-theme="light"] .pw-console { color: #f6efdf; }
.pw-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.22em; color: var(--tc); font-family: var(--sd-font-mono, ui-monospace); }
.pw-live { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-qs-go); }
.pw-live.hot { background: var(--sd-qs-halt); animation: pw-pulse 1.4s ease-out infinite; }
.pw-title { margin: 10px 0 6px; font-size: clamp(23px, 2.6vw, 33px); line-height: 1.05; font-weight: 800;
  letter-spacing: -0.02em; text-transform: uppercase; font-style: italic; color: #f8f2e2 !important; }
.pw-title em { font-style: italic; background: linear-gradient(122deg, #fff3d4 0%, var(--tc) 70%);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.pw-sub { margin: 0 0 13px; max-width: 52ch; font-size: 12.5px; line-height: 1.55; color: rgba(246, 239, 223, 0.72); }

.pw-ctas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pw-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.2); background: rgba(246, 239, 223, 0.06); color: #f6efdf; }
.pw-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-qs-go));
  box-shadow: 0 8px 22px -10px var(--sd-qs-go); }
.pw-btn.primary.on { box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-qs-go) 60%, transparent), 0 8px 22px -10px var(--sd-qs-go); }
.pw-btn.tinted { border-color: color-mix(in srgb, var(--tc) 60%, transparent); color: var(--tc);
  background: color-mix(in srgb, var(--tc) 12%, transparent); }
.pw-btn.ghost { background: transparent; }
.pw-btn.icon { padding: 9px 10px; }
.pw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pw-spin { animation: pw-rot 0.9s linear infinite; }

.pw-readouts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 13px; }
.pw-ro { display: flex; flex-direction: column; gap: 3px; }
.pw-ro i { font-style: normal; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(246, 239, 223, 0.45); }
.pw-ro b { font-size: 15px; font-weight: 800; color: #f6efdf; font-variant-numeric: tabular-nums; }
.pw-ro.hot b { color: var(--sd-qs-halt); }
.pw-of { font-style: normal; font-size: 11px; font-weight: 700; color: rgba(246, 239, 223, 0.45); }

/* driver plate */
.pw-plate { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 13px; padding-top: 12px;
  border-top: 1px dashed rgba(246, 239, 223, 0.16); }
.pw-plate-lb { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: rgba(246, 239, 223, 0.45); margin-right: 4px; }
.pw-st { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px;
  font-size: 10.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.18); background: transparent; color: rgba(246, 239, 223, 0.66);
  transition: border-color 0.2s, background 0.2s, color 0.2s; }
.pw-st:hover { border-color: color-mix(in srgb, var(--sc) 60%, transparent); }
.pw-st.on { border-color: var(--sc); color: #f6efdf; background: color-mix(in srgb, var(--sc) 16%, transparent); }
.pw-st-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sc); }
.pw-advice { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 5px 10px;
  border-radius: 999px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--sd-qs-warn); border: 1px dashed color-mix(in srgb, var(--sd-qs-warn) 50%, transparent); }

/* ── timing tower ── */
.pw-tower { border-radius: 16px; border: 1px solid rgba(246, 239, 223, 0.14); overflow: hidden;
  background: rgba(9, 7, 4, 0.62); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: #f6efdf; max-width: 640px; justify-self: end; width: 100%; }
.pw-tw-head { display: flex; align-items: center; gap: 9px; padding: 10px 14px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.2em; color: rgba(246, 239, 223, 0.55); border-bottom: 1px solid rgba(246, 239, 223, 0.1); }
.pw-tw-head b { margin-left: auto; color: var(--tc); }
.pw-tw-flag { width: 14px; height: 10px; border-radius: 2px;
  background: repeating-conic-gradient(#f6efdf 0% 25%, #0d0a06 0% 50%) 0 0 / 7px 5px; opacity: 0.8; }
/* Capped + inner scroll: more traffic must never stretch the hero — the tower
   holds ~5 rows and the rest scroll behind a slim rail (half-row peek = scroll hint). */
.pw-tw-body { display: flex; flex-direction: column; padding: 6px; position: relative;
  max-height: 296px; overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--tc) 40%, transparent) transparent; }
.pw-tw-body::-webkit-scrollbar { width: 5px; }
.pw-tw-body::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--tc) 35%, transparent); border-radius: 999px; }
.pw-tw-body::-webkit-scrollbar-track { background: transparent; }
.pw-row { display: grid; grid-template-columns: 22px 56px 1fr 24px 96px; align-items: center; gap: 10px;
  padding: 8px 10px; border: none; border-radius: 10px; background: transparent; cursor: pointer;
  text-align: left; font-family: inherit; color: #f6efdf;
  border-bottom: 1px solid rgba(246, 239, 223, 0.06);
  animation: pw-slide 0.45s var(--sd-spring, ease) both; animation-delay: calc(min(var(--i), 8) * 0.055s + 0.15s);
  transition: background 0.18s, transform 0.18s; }
.pw-row:hover { background: color-mix(in srgb, var(--tc) 12%, transparent); transform: translateX(3px); }
.pw-pos { font-size: 11px; font-weight: 800; font-style: italic; color: var(--tc);
  border-right: 2px solid color-mix(in srgb, var(--tc) 45%, transparent); }
.pw-car { display: flex; flex-direction: column; line-height: 1.1; }
.pw-car b { font-size: 17px; font-weight: 800; font-style: italic; color: #f6efdf; letter-spacing: -0.02em; }
.pw-car i { font-style: normal; font-size: 8px; font-weight: 700; letter-spacing: 0.06em; color: rgba(246, 239, 223, 0.5);
  white-space: nowrap; }
.pw-rowmain { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pw-subj { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: rgba(246, 239, 223, 0.92); }
.pw-rowsub { font-size: 9px; color: rgba(246, 239, 223, 0.52); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pw-rowsub em { font-style: normal; font-weight: 800; padding: 0 4px; border-radius: 4px; }
.pw-rowsub em.p-1 { color: #fff; background: var(--sd-qs-halt); }
.pw-rowsub em.p-2 { color: #241703; background: var(--sd-qs-warn); }
.pw-rowsub em.p-3 { color: #241703; background: var(--sd-qs-core, #f5b942); }
.pw-rowsub em.p-4 { color: rgba(246, 239, 223, 0.8); border: 1px solid rgba(246, 239, 223, 0.3); }
.pw-tyre { display: grid; place-items: center; }
.pw-tyre.fresh { color: var(--sd-qs-go); }
.pw-tyre.worn { color: var(--sd-qs-warn); }
.pw-tyre.flat { color: var(--sd-qs-halt); animation: pw-flat 0.9s ease-in-out infinite; }
.pw-rowright { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.pw-gap { font-size: 11px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pw-gap.ok { color: rgba(246, 239, 223, 0.72); }
.pw-gap.warn { color: var(--sd-qs-warn); }
.pw-gap.bad { color: var(--sd-qs-halt); }
.pw-chip { font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em; padding: 2px 6px; border-radius: 5px;
  border: 1px solid rgba(246, 239, 223, 0.24); color: rgba(246, 239, 223, 0.7); }
.pw-chip.ok { color: var(--sd-qs-go); border-color: color-mix(in srgb, var(--sd-qs-go) 55%, transparent); }
.pw-chip.warn { color: #241703; background: var(--sd-qs-warn); border-color: transparent; }
.pw-chip.bad { color: #fff; background: var(--sd-qs-halt); border-color: transparent; animation: pw-flat 1.1s ease-in-out infinite; }
.pw-chip.esc { color: var(--sd-qs-warn); border-color: color-mix(in srgb, var(--sd-qs-warn) 60%, transparent); }
.pw-chip.ghost { color: rgba(246, 239, 223, 0.55); border-style: dashed;
  background: repeating-linear-gradient(45deg, transparent 0 4px, rgba(246, 239, 223, 0.06) 4px 8px); }
.pw-tw-empty { margin: 14px; text-align: center; font-size: 10px; letter-spacing: 0.18em; color: rgba(246, 239, 223, 0.4); }

/* sector bars */
.pw-sectors { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 10px 14px 11px;
  border-top: 1px solid rgba(246, 239, 223, 0.1); }
.pw-sector { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pw-sector i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: rgba(246, 239, 223, 0.5); }
.pw-sec-bar { height: 5px; border-radius: 3px; overflow: hidden; background: rgba(246, 239, 223, 0.1); }
.pw-sec-bar b { display: block; height: 100%; border-radius: 3px; transform-origin: left;
  transition: transform 0.6s var(--sd-spring, ease); }
.pw-sector em { font-style: normal; font-size: 8.5px; font-weight: 700; color: rgba(246, 239, 223, 0.55); }
.pw-sector em.hot { color: var(--sd-qs-halt); }
.pw-tele-legend { display: flex; gap: 12px; justify-content: flex-end; padding: 0 14px 9px; font-size: 8px;
  font-weight: 800; letter-spacing: 0.14em; }
.pw-tele-legend .lg.intake { color: var(--sd-qs-core, #f5b942); }
.pw-tele-legend .lg.breach { color: var(--sd-qs-halt); }

/* FLIP re-order (TransitionGroup move) */
.tw-move { transition: transform 0.55s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)); }
.tw-enter-active { transition: all 0.4s var(--sd-spring, ease); }
.tw-enter-from { opacity: 0; transform: translateX(-14px); }
.tw-leave-active { position: absolute; transition: all 0.3s ease; width: calc(100% - 12px); }
.tw-leave-to { opacity: 0; transform: translateX(16px); }

/* ── lenses ── */
.pw-lensdock { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px; margin: 16px 16px 14px; }
.pw-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; text-align: left;
  padding: 9px 11px; border-radius: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(246, 239, 223, 0.16); color: #f6efdf;
  background: rgba(9, 7, 4, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, background 0.2s; }
.pw-lens:hover { border-color: color-mix(in srgb, var(--lc) 55%, transparent); }
.pw-lens.on { border-color: var(--lc); background: color-mix(in srgb, var(--lc) 16%, rgba(9, 7, 4, 0.62)); }
.pw-lens.stat { cursor: default; }
.pl-ring { flex-shrink: 0; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
  background: conic-gradient(var(--lc) var(--fill, 0deg), color-mix(in srgb, var(--lc) 18%, transparent) 0); }
.pl-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
  color: var(--lc); background: rgba(9, 7, 4, 0.85); }
.pl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pl-val { font-size: 16px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.pl-lb { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: rgba(246, 239, 223, 0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pl-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); opacity: 0.4;
  transform-origin: left; transform: scaleX(0.25); transition: transform 0.3s var(--sd-spring), opacity 0.3s; }
.pw-lens.on .pl-bar, .pw-lens:hover .pl-bar { transform: scaleX(1); opacity: 0.9; }

@keyframes pw-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qs-halt) 55%, transparent); } 100% { box-shadow: 0 0 0 10px transparent; } }
@keyframes pw-rot { to { transform: rotate(360deg); } }
@keyframes pw-slide { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
@keyframes pw-flat { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

@media (max-width: 1080px) {
  .pw { min-height: 0; }
  .pw-grid { grid-template-columns: 1fr; }
  .pw-tower { max-width: none; justify-self: stretch; }
}
@media (max-width: 640px) {
  .pw-row { grid-template-columns: 22px 66px 1fr 60px; }
  .pw-tyre, .pw-pri { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pw-row,
  html:not([data-cinematic="on"]) .pw-live.hot,
  html:not([data-cinematic="on"]) .pw-tyre.flat { animation: none; }
  html:not([data-cinematic="on"]) .tw-move { transition: none; }
}
</style>
