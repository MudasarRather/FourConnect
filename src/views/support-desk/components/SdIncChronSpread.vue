<template>
  <!-- SdIncChronSpread — the ANNUAL REPORT front spread, set LIVE. The mock's
       print-grade hero rendered from the spine: oversized day numeral (newest
       bucket), ruled two-column day spread of the DEFINING events, KPI margin
       notes from the pulse, the fine-line contents rail, and the milestone
       pull-quote. Data-rich at zero rows: the ghost spread + legend plate. -->
  <section class="csp" aria-label="The day, set in print">

    <!-- ═══ hero row: the day's numbers · the oversized numeral ═══ -->
    <div class="csp-hero">
      <div class="csp-stats rise" style="--d: 0.16s">
        <div v-for="(s, i) in statRow" :key="s.k" class="stat" :style="{ '--d': `${0.2 + i * 0.06}s` }">
          <div class="stat-k">{{ s.k }}</div>
          <div class="stat-v sd-mono" :class="{ accent: s.accent }">
            {{ s.v }}<span v-if="s.unit" class="unit">{{ s.unit }}</span>
          </div>
        </div>
      </div>

      <div class="csp-day rise" :class="{ flash }" style="--d: 0.1s">
        <div class="day-month">{{ monthLine }}</div>
        <div class="day-figure">
          <span class="day-num sd-mono">{{ dayNumDisplay }}</span>
          <span class="day-ord">{{ ordinal }}</span>
        </div>
        <div class="day-caption">{{ weekdayName }} · <b>{{ todayCount }} {{ todayCount === 1 ? 'ENTRY' : 'ENTRIES' }}</b> ON THE RECORD · WHOLE DESK</div>
      </div>
    </div>

    <!-- ═══ THE SPREAD: marginalia · defining events · contents ═══ -->
    <div class="csp-spread">
      <div class="spread-kicker rise" style="--d: 0.2s" :class="{ flash }">
        <h2>{{ kicker }}</h2>
        <span>DEFINING EVENTS · {{ weekdayName }} {{ dayLong }}</span>
        <span class="rule draw" style="--d: 0.26s" />
      </div>

      <!-- KPI marginalia (from the pulse) -->
      <aside class="mnotes rise" style="--d: 0.26s" aria-label="The day's numbers, noted in the margin">
        <div v-for="(m, i) in marginalia" :key="m.k" class="mnote">
          <div class="mnote-k">{{ m.k }}</div>
          <div class="mnote-v sd-mono">{{ m.v }}<span v-if="m.unit" class="unit">{{ m.unit }}</span><span
            v-if="m.delta" class="delta" :class="m.deltaTone">{{ m.delta }}</span></div>
          <div class="meter"><i :style="{ '--w': m.w, '--d': `${0.5 + i * 0.12}s` }" /></div>
          <div class="mnote-cap">{{ m.cap }}</div>
        </div>
      </aside>

      <!-- the ruled two-column day spread -->
      <div v-if="defining.length" class="dayspread rise" style="--d: 0.3s">
        <article v-for="e in defining" :key="String(e.id)" class="lead-entry"
                 :class="{ fresh: isFresh(e) }">
          <div class="lead-init" :class="toneCls(e)">{{ initOf(e) }}</div>
          <div class="lead-body">
            <div class="lead-meta">
              <span class="lead-time sd-mono">{{ hhmm(e.at) }}</span>
              <span class="lead-verb" :class="toneCls(e)">{{ verbOf(e).toUpperCase() }}</span>
              <span class="tkt sd-mono">{{ e.ticket_number }}</span>
              <span class="sevdot" :class="`sev${e.sev || 4}`" :title="`SEV${e.sev || 4}`" />
            </div>
            <h3 class="lead-h">{{ e.subject }}</h3>
            <p class="lead-p">{{ narrative(e) }}</p>
            <div class="lead-actor">{{ actorLine(e) }}</div>
          </div>
        </article>
      </div>

      <!-- ghost spread — the record before its first entry -->
      <div v-else class="dayspread ghost rise" style="--d: 0.3s">
        <div class="legend-plate">
          <div class="lp-cap">— THE RECORD OF THE DESK —</div>
          <p class="lp-line">Every acknowledgement, decision and restore is set here in ruled
            columns the moment it happens. {{ loading ? 'The presses are running…'
              : 'Nothing in this window yet — widen the dates, or clear the index.' }}</p>
        </div>
        <article v-for="n in 6" :key="`g-${n}`" class="lead-entry ghost-entry" aria-hidden="true">
          <div class="lead-init">·</div>
          <div class="lead-body">
            <span class="g-rule" :style="{ width: `${86 - (n % 3) * 14}%` }" />
            <span class="g-rule wide" :style="{ width: `${64 - (n % 4) * 8}%` }" />
            <span class="g-rule" :style="{ width: `${38 + (n % 3) * 10}%` }" />
          </div>
        </article>
      </div>

      <!-- contents rail -->
      <aside class="toc rise" style="--d: 0.34s" aria-label="Contents — the window">
        <div class="toc-k">CONTENTS — THE WINDOW</div>
        <button v-for="(t, i) in toc" :key="t.key" type="button" class="toc-row"
                @click="$emit('day', t.key)">
          <div class="toc-day sd-mono">{{ t.num }}</div>
          <div class="toc-info">
            <div class="toc-name">{{ t.name }}</div>
            <div class="toc-lead">
              <span class="toc-count">{{ t.count }} {{ t.count === 1 ? 'ENTRY' : 'ENTRIES' }}</span>
              <span class="toc-dots" />
              <span class="toc-folio sd-mono">{{ String(i + 1).padStart(2, '0') }}</span>
            </div>
          </div>
        </button>
        <div v-if="!toc.length" class="toc-empty">THE WINDOW IS UNWRITTEN — NO DAYS BOUND YET.</div>
        <div class="toc-note">
          PLATES — {{ stones.length }} PINNED {{ stones.length === 1 ? 'MOMENT' : 'MOMENTS' }}.<br>
          {{ windowEvents }} {{ windowEvents === 1 ? 'EVENT' : 'EVENTS' }} SET IN THE WINDOW.<br>
          <template v-if="busiest">LOUDEST RECORD — {{ busiest.ticket_number }}, {{ busiest.events }} ENTRIES.</template>
        </div>
      </aside>
    </div>

    <!-- milestone pull-quote — the line that turned the day -->
    <figure v-if="pull" class="pull rise" style="--d: 0.4s">
      <blockquote>“{{ pull.q }}”</blockquote>
      <figcaption>{{ pull.cap }} <span>— {{ pull.num }}</span></figcaption>
    </figure>
  </section>
</template>

<script setup>
/*
  Props are the spine's raw surfaces — this component only composes them:
    days      · server day buckets, newest-first
    pulse     · /incidents/timeline/pulse (+ host-attached `prev` window for deltas)
    stones    · pinned milestones (filter-proof)
    arrivals  · { count, ids } — live-mode arrivals for the one-cycle highlight
    metaFor   · merged-catalog lookup (verb, tone, category per action)
  flashArrivals() is exposed for the host to strike when the buffer flushes.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  days: { type: Array, default: () => [] },
  pulse: { type: Object, default: null },
  stones: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  metaFor: { type: Function, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['day'])

const reduced = () => prefersReduced()
  && document.documentElement.getAttribute('data-cinematic') !== 'on'

/* ── the day on the masthead: the newest bucket (or today, pre-data) ── */
const newest = computed(() => props.days[0] || null)
const dayDate = computed(() => (newest.value
  ? new Date(`${newest.value.day}T00:00:00`) : new Date(props.now)))
const dayNum = computed(() => dayDate.value.getDate())
const ordinal = computed(() => {
  const n = dayNum.value, m = n % 10, h = n % 100
  if (h >= 11 && h <= 13) return 'TH'
  return m === 1 ? 'ST' : m === 2 ? 'ND' : m === 3 ? 'RD' : 'TH'
})
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
const roman = (n) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v } return s }, '')
const monthLine = computed(() => `${dayDate.value.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase()} — ${roman(dayDate.value.getFullYear())}`)
const weekdayName = computed(() => dayDate.value.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase())
const dayLong = computed(() => dayDate.value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase())
const todayCount = computed(() => newest.value?.events?.length || 0)

/* ── numerals count up on first ink (never on the poll) ── */
const crank = ref(0)
let raf = null
let cranked = false
const runCrank = () => {
  if (reduced()) { crank.value = 1; return }
  const t0 = performance.now()
  const step = (t) => {
    const p = Math.min(1, (t - t0) / 1000)
    crank.value = 1 - Math.pow(1 - p, 3)
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
watch([() => props.days.length, () => props.pulse], () => {
  if (!cranked && (props.days.length || props.pulse)) { cranked = true; runCrank() }
}, { immediate: true })
onMounted(() => { if (!cranked) { cranked = true; runCrank() } })
onBeforeUnmount(() => cancelAnimationFrame(raf))
const dayNumDisplay = computed(() =>
  String(Math.max(1, Math.round(dayNum.value * crank.value))).padStart(2, '0'))
const up = (v) => Math.round((v || 0) * crank.value)

/* ── stat row + margin notes (pulse; `prev` is the host-attached prior window) ── */
const windowEvents = computed(() => props.pulse?.total_events || 0)
const flow = computed(() => props.pulse?.flow || { created: 0, resolved: 0 })
const busiest = computed(() => props.pulse?.busiest || null)
const prev = computed(() => props.pulse?.prev || null)

const clock = (mins) => {
  if (mins == null) return { v: '—', unit: '' }
  return mins >= 90
    ? { v: (mins / 60).toFixed(1), unit: 'h' }
    : { v: Number(mins).toFixed(1), unit: 'm' }
}
const statRow = computed(() => {
  const mtta = clock(props.pulse?.mtta_minutes)
  const mttr = clock(props.pulse?.mttr_minutes)
  return [
    { k: "TODAY'S ENTRIES", v: up(todayCount.value) },
    { k: 'WINDOW EVENTS', v: up(windowEvents.value), accent: true },
    { k: 'MTTA', v: mtta.v === '—' ? '—' : (Number(mtta.v) * crank.value).toFixed(1), unit: mtta.unit },
    { k: 'MTTR', v: mttr.v === '—' ? '—' : (Number(mttr.v) * crank.value).toFixed(1), unit: mttr.unit },
    { k: 'MILESTONES', v: up(props.pulse?.milestones || 0) },
  ]
})

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null)
const marginalia = computed(() => {
  const p = props.pulse || {}
  const pv = prev.value || {}
  const mtta = clock(p.mtta_minutes)
  const mttr = clock(p.mttr_minutes)
  const maxDay = Math.max(1, ...props.days.map((d) => d.events?.length || 0))
  const mttaDelta = (p.mtta_minutes != null && pv.mtta_minutes != null)
    ? p.mtta_minutes - pv.mtta_minutes : null
  const mttrPct = (p.mttr_minutes != null && pv.mttr_minutes != null)
    ? pct(p.mttr_minutes, pv.mttr_minutes) : null
  return [
    {
      k: 'MTTA', v: mtta.v, unit: mtta.unit,
      delta: mttaDelta == null ? '' : `${mttaDelta <= 0 ? '▼' : '▲'} ${Math.abs(mttaDelta).toFixed(1)}`,
      deltaTone: mttaDelta == null ? '' : (mttaDelta <= 0 ? 'down' : 'up'),
      w: Math.min(1, (p.mtta_minutes || 0) / 60).toFixed(2),
      cap: 'median acknowledgement, whole desk',
    },
    {
      k: 'MTTR', v: mttr.v, unit: mttr.unit,
      delta: mttrPct == null ? '' : `${mttrPct <= 0 ? '▼' : '▲'} ${Math.abs(mttrPct)}%`,
      deltaTone: mttrPct == null ? '' : (mttrPct <= 0 ? 'down' : 'up'),
      w: Math.min(1, (p.mttr_minutes || 0) / 480).toFixed(2),
      cap: 'restore time, window on window',
    },
    {
      k: 'RESTORED', v: String(flow.value.resolved || 0),
      w: (flow.value.created ? Math.min(1, flow.value.resolved / flow.value.created) : 0).toFixed(2),
      cap: `closed against ${flow.value.created || 0} raised`,
    },
    {
      k: 'EVENTS TODAY', v: String(todayCount.value),
      w: Math.min(1, todayCount.value / maxDay).toFixed(2),
      cap: "entries on today's record",
    },
    {
      k: 'BUSIEST', v: busiest.value ? String(busiest.value.events) : '—',
      w: (busiest.value && windowEvents.value
        ? Math.min(1, busiest.value.events / windowEvents.value) : 0).toFixed(2),
      cap: busiest.value ? `loudest record, ${busiest.value.ticket_number}` : 'no record leads the window yet',
    },
  ]
})

/* ── the defining entries: milestones first, then SEV1, then command ── */
const metaOfE = (e) => props.metaFor?.(e.action) || {}
const verbOf = (e) => metaOfE(e).verb || metaOfE(e).label || String(e.action || '').replace(/_/g, ' ')
const defining = computed(() => {
  const evs = newest.value?.events || []
  const rank = (e) => {
    if (e.is_milestone) return 0
    if ((e.sev || 4) === 1) return 1
    if (metaOfE(e).category === 'command') return 2
    if (metaOfE(e).tone === 'live' || metaOfE(e).tone === 'arc') return 3
    return 4
  }
  return [...evs]
    .sort((a, b) => rank(a) - rank(b) || new Date(a.at) - new Date(b.at))
    .slice(0, 6)
    .sort((a, b) => new Date(a.at) - new Date(b.at))
})
const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE']
const kicker = computed(() => (defining.value.length
  ? `THE DAY IN ${WORDS[defining.value.length] || defining.value.length} ${defining.value.length === 1 ? 'ENTRY' : 'ENTRIES'}`
  : 'THE DAY, AWAITING ITS FIRST ENTRY'))

const initOf = (e) => (verbOf(e) || '·').charAt(0).toUpperCase()
const toneCls = (e) => {
  const t = metaOfE(e).tone
  return t === 'live' ? 'ok' : (t === 'arc' ? 'bad' : '')
}
const hhmm = (at) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const narrative = (e) => {
  const d = e.detail || {}
  const label = metaOfE(e).label || verbOf(e)
  if (d.decision) return `“${d.decision}” — logged with its rationale, on the record.`
  if (d.from && d.to) return `${label} — ${String(d.from).replace(/_/g, ' ')} to ${String(d.to).replace(/_/g, ' ')}.`
  if (d.note) return `${label} — ${String(d.note).slice(0, 140)}`
  return `${label}, entered into the record of ${e.ticket_number}.`
}
const actorLine = (e) => {
  const who = (e.actor || 'SYSTEM').toUpperCase()
  if (!e.actor) return 'SYSTEM — AUTOMATED ENTRY'
  if (e.action === 'decision_logged') return `${who} — ON THE RECORD`
  if (e.is_milestone) return `${who} — STRUCK AS A PLATE`
  return who
}

/* ── contents rail (up to four bound days) ── */
const toc = computed(() => props.days.slice(0, 4).map((d) => {
  const dt = new Date(`${d.day}T00:00:00`)
  return {
    key: String(d.day),
    num: String(dt.getDate()).padStart(2, '0'),
    name: dt.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
    count: d.events?.length || 0,
  }
}))

/* ── the pull-quote: the newest plate that carries a decision ── */
const pull = computed(() => {
  const pool = [...(newest.value?.events || []).filter((e) => e.is_milestone), ...props.stones]
  const hit = pool.find((e) => e.detail?.decision)
  if (!hit) return null
  return {
    q: hit.detail.decision,
    cap: `${verbOf(hit).toUpperCase()} · ${hhmm(hit.at)} · ${(hit.actor || 'SYSTEM').toUpperCase()}`,
    num: hit.ticket_number,
  }
})

/* ── arrivals: the host strikes the flash when the buffer folds in ── */
const flash = ref(false)
let flashTimer = null
const flashArrivals = () => {
  if (reduced()) return
  flash.value = false
  requestAnimationFrame(() => { flash.value = true })
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = false }, 1700)
}
const isFresh = (e) => (props.arrivals?.ids || []).includes(String(e.id))
onBeforeUnmount(() => clearTimeout(flashTimer))
defineExpose({ flashArrivals })
</script>

<style scoped>
.csp { display: flex; flex-direction: column; }

/* ── reveal primitives (the mock's rise + draw, delay-driven) ── */
.rise { opacity: 0; transform: translateY(14px);
  animation: csp-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: var(--d, 0s); }
@keyframes csp-rise { to { opacity: 1; transform: none; } }
.rule { height: 1px; background: color-mix(in srgb, var(--sd-text) 12%, transparent); }
.draw { transform: scaleX(0); transform-origin: left center;
  animation: csp-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: var(--d, 0s); }
@keyframes csp-draw { to { transform: scaleX(1); } }

/* ── hero row: stats column · the day numeral ── */
.csp-hero { display: grid; grid-template-columns: 1.35fr 0.9fr; gap: clamp(24px, 4vw, 64px);
  padding: 8px 0 30px; align-items: end; }
.csp-stats { display: flex; gap: 0; flex-wrap: wrap; align-self: end; }
.stat { padding: 0 26px; border-left: 1px solid color-mix(in srgb, var(--sd-text) 12%, transparent); }
.stat:first-child { padding-left: 0; border-left: none; }
.stat-k { font-size: 9.5px; letter-spacing: 0.26em; color: var(--sd-text-dim); font-weight: 700;
  margin-bottom: 4px; white-space: nowrap; }
.stat-v { font-size: 26px; font-weight: 200; letter-spacing: -0.02em; color: var(--sd-text);
  font-variant-numeric: tabular-nums; }
.stat-v .unit { font-size: 13px; color: var(--sd-text-muted); margin-left: 2px; }
.stat-v.accent { color: var(--tl-core, var(--sd-fun-core)); font-weight: 700; }

.csp-day { text-align: right; position: relative; }
.day-month { font-size: 12px; letter-spacing: 0.5em; font-weight: 200; color: var(--sd-text-muted); }
.day-figure { display: flex; align-items: flex-start; justify-content: flex-end; gap: 6px; }
.day-num { font-size: clamp(120px, 15vw, 210px); font-weight: 800; line-height: 0.82;
  letter-spacing: -0.05em; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.day-ord { font-size: 20px; font-weight: 200; letter-spacing: 0.2em; color: var(--sd-text-muted);
  margin-top: 22px; }
.day-caption { margin-top: 12px; font-size: 10px; letter-spacing: 0.28em; color: var(--sd-text-dim);
  font-weight: 700; }
.day-caption b { color: var(--tl-core, var(--sd-fun-core)); }
.csp-day.flash .day-num { animation: csp-foil-flash 1.6s cubic-bezier(0.16, 1, 0.3, 1) 1; }
@keyframes csp-foil-flash {
  0% { color: var(--tl-core, var(--sd-fun-core)); text-shadow: 0 0 34px color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 40%, transparent); }
  100% { color: var(--sd-text); text-shadow: none; }
}

/* ── THE SPREAD grid ── */
.csp-spread { display: grid; grid-template-columns: 172px 1fr 208px; gap: clamp(20px, 3vw, 44px);
  padding: 30px 0 34px; border-top: 1px solid color-mix(in srgb, var(--sd-text) 14%, transparent); }
.spread-kicker { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 16px;
  margin-bottom: 2px; }
.spread-kicker h2 { margin: 0; font-size: 11px; letter-spacing: 0.32em; font-weight: 800;
  color: var(--sd-text); }
.spread-kicker > span:not(.rule) { font-size: 10px; letter-spacing: 0.2em; color: var(--sd-text-dim);
  font-weight: 200; }
.spread-kicker .rule { flex: 1; align-self: center; }
.spread-kicker.flash h2 { animation: csp-kick-flash 1.6s ease-out 1; }
@keyframes csp-kick-flash { 0% { color: var(--tl-core, var(--sd-fun-core)); } 100% { color: var(--sd-text); } }

/* margin notes */
.mnotes { display: flex; flex-direction: column; gap: 22px; padding-top: 8px; }
.mnote-k { font-size: 9.5px; letter-spacing: 0.3em; color: var(--sd-text-dim); font-weight: 800; }
.mnote-v { font-size: 30px; font-weight: 200; letter-spacing: -0.02em; margin-top: 2px;
  color: var(--sd-text); font-variant-numeric: tabular-nums; }
.mnote-v .unit { font-size: 14px; color: var(--sd-text-muted); }
.mnote-v .delta { font-size: 11px; font-weight: 700; margin-left: 6px; letter-spacing: 0.06em; }
.delta.down { color: var(--tl-live, var(--sd-fun-resolved)); }
.delta.up { color: var(--tl-arc, var(--sd-fun-esc)); }
.meter { height: 2px; background: color-mix(in srgb, var(--sd-text) 9%, transparent);
  margin-top: 8px; overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--tl-core, var(--sd-fun-core));
  transform: scaleX(var(--w, 0.5)); transform-origin: left;
  animation: csp-draw-w 1.1s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--d, 0.5s); }
@keyframes csp-draw-w { from { transform: scaleX(0); } to { transform: scaleX(var(--w, 0.5)); } }
.mnote-cap { font-size: 10px; color: var(--sd-text-dim); font-weight: 300; margin-top: 6px;
  letter-spacing: 0.04em; font-style: italic; }

/* the ruled two-column editorial day spread */
.dayspread { position: relative; columns: 2; column-gap: 44px;
  column-rule: 1px solid color-mix(in srgb, var(--sd-text) 12%, transparent); }
.lead-entry { break-inside: avoid; padding: 16px 0 20px; display: flex; gap: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--sd-text) 6%, transparent);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.lead-entry:hover { transform: translateX(4px); }
.lead-entry.fresh { animation: csp-fresh 2.4s ease-out 1; }
@keyframes csp-fresh {
  0% { background: color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 12%, transparent); }
  100% { background: transparent; }
}
.lead-init { font-size: 44px; font-weight: 800; line-height: 1; letter-spacing: -0.03em;
  color: var(--tl-core, var(--sd-fun-core)); min-width: 40px; }
.lead-init.ok { color: var(--tl-live, var(--sd-fun-resolved)); }
.lead-init.bad { color: var(--tl-arc, var(--sd-fun-esc)); }
.lead-body { min-width: 0; }
.lead-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 10px;
  letter-spacing: 0.2em; font-weight: 700; }
.lead-time { color: var(--sd-text-secondary); font-size: 11px; letter-spacing: 0.1em; }
.lead-verb { color: var(--tl-core, var(--sd-fun-core)); }
.lead-verb.ok { color: var(--tl-live, var(--sd-fun-resolved)); }
.lead-verb.bad { color: var(--tl-arc, var(--sd-fun-esc)); }
.lead-h { margin: 6px 0 5px; font-size: 19px; font-weight: 800; letter-spacing: -0.01em;
  color: var(--sd-text); line-height: 1.25; }
.lead-p { margin: 0; font-size: 12.5px; font-weight: 300; color: var(--sd-text-muted);
  line-height: 1.55; }
.lead-actor { margin-top: 8px; font-size: 9.5px; letter-spacing: 0.26em; color: var(--sd-text-dim);
  font-weight: 700; }

.tkt { font-size: 9.5px; letter-spacing: 0.08em; padding: 2px 7px; border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--sd-text) 14%, transparent);
  color: var(--sd-text-muted); font-variant-numeric: tabular-nums; font-weight: 500; }
.sevdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex: none; }
.sevdot.sev1 { background: var(--sd-pri-critical, #ef4444);
  animation: csp-sev-breathe 2.2s ease-in-out infinite; }
.sevdot.sev2 { background: var(--tl-core, var(--sd-fun-core)); }
.sevdot.sev3 { background: var(--tl-warn, var(--sd-amber)); }
.sevdot.sev4 { background: var(--sd-text-dim); }
@keyframes csp-sev-breathe {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-pri-critical, #ef4444) 45%, transparent); }
  50% { box-shadow: 0 0 0 6px transparent; }
}

/* the ghost spread */
.dayspread.ghost { position: relative; }
.ghost-entry { opacity: 0.4; }
.ghost-entry .lead-init { color: var(--sd-text-dim); }
.g-rule { display: block; height: 1px; margin: 12px 0;
  background: color-mix(in srgb, var(--sd-text) 12%, transparent); }
.g-rule.wide { height: 7px; background: color-mix(in srgb, var(--sd-text) 7%, transparent); }
.legend-plate { column-span: all; margin-bottom: 18px; padding: 22px 26px; text-align: center;
  border-top: 1px solid color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 38%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 38%, transparent); }
.lp-cap { font-size: 10px; letter-spacing: 0.34em; font-weight: 800;
  color: var(--tl-core, var(--sd-fun-core)); margin-bottom: 10px; }
.lp-line { margin: 0 auto; max-width: 44em; font-size: 13px; font-weight: 300; line-height: 1.6;
  color: var(--sd-text-muted); }

/* contents rail */
.toc { padding-top: 8px; padding-left: clamp(14px, 2vw, 26px);
  border-left: 1px solid color-mix(in srgb, var(--sd-text) 12%, transparent); }
.toc-k { font-size: 9.5px; letter-spacing: 0.3em; color: var(--sd-text-dim); font-weight: 800;
  margin-bottom: 8px; }
.toc-row { display: flex; align-items: baseline; gap: 10px; width: 100%; padding: 11px 0;
  cursor: pointer; background: none; border: 0; text-align: left; font: inherit; color: inherit;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.toc-row + .toc-row { border-top: 1px solid color-mix(in srgb, var(--sd-text) 6%, transparent); }
.toc-row:hover { transform: translateX(4px); }
.toc-row:hover .toc-day { color: var(--tl-core, var(--sd-fun-core)); }
.toc-row:focus-visible { outline: 2px solid var(--tl-core, var(--sd-fun-core)); outline-offset: 2px; }
.toc-day { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;
  min-width: 44px; color: var(--sd-text); transition: color 0.25s; }
.toc-info { flex: 1; min-width: 0; }
.toc-name { font-size: 9.5px; letter-spacing: 0.24em; font-weight: 700;
  color: var(--sd-text-secondary); }
.toc-lead { display: flex; align-items: baseline; gap: 6px; }
.toc-count { font-size: 9.5px; letter-spacing: 0.14em; color: var(--sd-text-dim); font-weight: 300;
  margin-top: 2px; white-space: nowrap; }
.toc-dots { flex: 1; border-bottom: 1px dotted var(--sd-text-dim); opacity: 0.55;
  transform: translateY(-3px); }
.toc-folio { font-size: 11px; color: var(--tl-core, var(--sd-fun-core)); font-weight: 700; }
.toc-empty { padding: 14px 0; font-size: 9.5px; letter-spacing: 0.18em; font-weight: 300;
  color: var(--sd-text-dim); line-height: 1.7; }
.toc-note { margin-top: 20px; font-size: 9.5px; line-height: 1.7; letter-spacing: 0.12em;
  color: var(--sd-text-dim); font-weight: 300; }

/* pull-quote */
.pull { position: relative; margin: 0 0 8px; padding: 26px 34px 24px 58px;
  border-top: 1px solid color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 38%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--tl-core, var(--sd-fun-core)) 38%, transparent); }
.pull::before { content: '\201C'; position: absolute; left: 2px; top: 8px; font-size: 74px;
  font-weight: 800; line-height: 1;
  background: linear-gradient(120deg, var(--chr-foil-b, var(--tl-core, #fb923c)), var(--chr-foil-c, #ffe3c4));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.pull blockquote { margin: 0; font-size: clamp(20px, 2.4vw, 29px); font-weight: 200;
  letter-spacing: -0.01em; line-height: 1.25; color: var(--sd-text); }
.pull figcaption { margin-top: 12px; font-size: 9.5px; letter-spacing: 0.28em; font-weight: 800;
  color: var(--tl-core, var(--sd-fun-core)); }
.pull figcaption span { color: var(--sd-text-dim); font-weight: 300; letter-spacing: 0.18em; }

/* ── responsive ── */
@media (max-width: 1040px) {
  .csp-hero { grid-template-columns: 1fr; }
  .csp-day { text-align: left; }
  .day-figure { justify-content: flex-start; }
  .csp-spread { grid-template-columns: 1fr; }
  .toc { border-left: none; padding-left: 0; padding-top: 18px;
    border-top: 1px solid color-mix(in srgb, var(--sd-text) 12%, transparent); }
  .mnotes { flex-direction: row; flex-wrap: wrap; gap: 26px; }
  .dayspread { columns: 1; column-rule: none; }
  .stat { padding: 0 18px; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .sevdot.sev1 { background: #dc2626; }
[data-theme="light"] .pull::before {
  background: linear-gradient(120deg, var(--chr-foil-b, #b05f14), var(--chr-foil-c, #e2955a));
  -webkit-background-clip: text; background-clip: text; }

/* ── reduced motion: the record simply is ── */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rise { animation: none; opacity: 1; transform: none; }
  html:not([data-cinematic="on"]) .draw { animation: none; transform: scaleX(1); }
  html:not([data-cinematic="on"]) .meter i { animation: none; transform: scaleX(var(--w, 0.5)); }
  html:not([data-cinematic="on"]) .sevdot.sev1,
  html:not([data-cinematic="on"]) .csp-day.flash .day-num,
  html:not([data-cinematic="on"]) .spread-kicker.flash h2,
  html:not([data-cinematic="on"]) .lead-entry.fresh { animation: none; }
  html:not([data-cinematic="on"]) .lead-entry:hover,
  html:not([data-cinematic="on"]) .toc-row:hover { transform: none; }
}
</style>
