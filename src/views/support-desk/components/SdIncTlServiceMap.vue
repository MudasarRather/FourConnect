<template>
  <!-- SdIncTlServiceMap — the SERVICE DIAGRAM: every incident drawn as a live
       metro line (A3 artifact, 1:1). One line per incident, stations = events
       positioned on a left→right hour scale, milestones = interchange double
       rings, resolved lines terminate at an emerald terminus, in-service lines
       project dashed to the NOW cursor. Palette rides the host-set (--)tl-*
       tokens so the instrument recolors with the desk identity. -->
  <section class="svm" :class="{ flash: flashing }" aria-label="Incident service diagram">
    <div class="svm-head">
      <div class="svm-title sd-mono"><b>SERVICE MAP</b> — {{ headLine }}</div>
      <div class="svm-note sd-mono">{{ headNote }}</div>
    </div>

    <div ref="stageEl" class="svm-stage">
      <svg :viewBox="`0 0 1440 ${H}`" role="img" aria-label="Incident service diagram — one line per incident, stations are events">
        <!-- ── hour axis ── -->
        <g>
          <template v-for="tk in ticks" :key="`tk-${tk.t}`">
            <line class="axis-tick" :x1="tk.x" y1="22" :x2="tk.x" :y2="tk.major ? 27 : 25" />
            <text v-if="tk.label" class="axis-lbl" :x="tk.x" y="15" text-anchor="middle">{{ tk.label }}</text>
            <line v-if="tk.grid" class="axis-grid" :x1="tk.x" y1="30" :x2="tk.x" :y2="gridBottom" />
          </template>
          <line class="axis-tick" :x1="PL - 8" y1="27" :x2="PR + 8" y2="27" />
        </g>

        <!-- ── GHOST DIAGRAM — the instrument at zero rows ── -->
        <g v-if="isGhost" class="ghosts" aria-hidden="true">
          <g v-for="(gh, gi) in ghosts" :key="`gh-${gi}`" class="ghost-line">
            <rect :x="10" :y="gh.y - 19" width="262" height="38" rx="7" class="ghost-plate" />
            <text :x="26" :y="gh.y - 4.5" class="ghost-num sd-svg-mono">STANDBY LINE {{ gi + 1 }}</text>
            <text :x="26" :y="gh.y + 11" class="ghost-sub">awaiting record</text>
            <line :x1="gh.x0" :y1="gh.y" :x2="gh.x1" :y2="gh.y" class="ghost-rail" />
            <rect v-for="(sx, si) in gh.st" :key="`ghs-${si}`" :x="sx - 1.2" :y="gh.y - 13" width="2.4" height="9" class="ghost-tick" />
            <circle v-if="gh.ms" :cx="gh.st[2]" :cy="gh.y" r="6" class="ghost-ring" />
          </g>
        </g>

        <!-- ── the lines ── -->
        <g v-for="(l, i) in shown" :key="l.id" class="lineg"
           :class="{ hot: hotId === l.id, cold: hotId && hotId !== l.id, express: l.sev === 1 }"
           @mouseenter="hotId = l.id" @mouseleave="hotId = null">
          <!-- name plate (the line cartouche) — click opens the incident -->
          <g class="plate" role="button" tabindex="0"
             :aria-label="`Open ${l.number} — ${l.subject}`"
             @click="$emit('open', l.ticketId)" @keydown.enter="$emit('open', l.ticketId)">
            <rect x="10" :y="l.y - 19" width="262" height="38" rx="7" class="plate-rect" />
            <rect x="10" :y="l.y - 19" width="4.5" height="38" rx="2" :style="{ fill: l.color }" />
            <text x="26" :y="l.y - 4.5" class="plate-num sd-svg-mono">{{ l.number }}</text>
            <text x="232" :y="l.y - 4.5" class="plate-sev sd-svg-mono" :style="{ fill: l.color }">SEV{{ l.sev }}</text>
            <text x="26" :y="l.y + 11" class="plate-sub">{{ l.sub }}</text>
          </g>

          <!-- the running rail — draws in via stroke-dashoffset -->
          <line class="rail" :x1="l.x0" :y1="l.y" :x2="l.x1" :y2="l.y" stroke-linecap="round"
                :stroke-dasharray="l.len" :stroke-dashoffset="drawn ? 0 : l.len"
                :style="{ stroke: l.color, strokeWidth: l.sev === 1 ? 7.5 : 4.5,
                          opacity: l.sev >= 3 ? 0.72 : 1, transitionDelay: `${i * 0.06}s` }" />

          <!-- terminus vs in-service projection -->
          <template v-if="l.resolved">
            <rect :x="l.x1 - 2.5" :y="l.y - 10" width="5" height="20" rx="2" class="term-bar" />
            <rect :x="l.x1 + 12" :y="l.y - 10" width="118" height="20" rx="10" class="term-chip" />
            <text :x="l.x1 + 71" :y="l.y + 3.5" class="term-txt sd-svg-mono" text-anchor="middle">RESOLVED {{ l.endLabel }}</text>
          </template>
          <template v-else-if="nowVisible && nowX - l.x1 > 16">
            <line :x1="l.x1 + 7" :y1="l.y" :x2="nowX - 8" :y2="l.y" stroke-linecap="round"
                  class="proj" :style="{ stroke: l.color }" />
            <circle :cx="nowX - 2" :cy="l.y" r="3.4" class="live-cap" :style="{ fill: l.color }" />
          </template>

          <!-- stations -->
          <g class="stations" :class="{ on: drawn }" :style="{ transitionDelay: `${0.22 + i * 0.055}s` }">
            <g v-for="ev in l.st" :key="String(ev.id)" class="stg">
              <template v-if="ev.ms">
                <circle :cx="ev.x" :cy="l.y" r="6.4" class="st-ring-o" />
                <circle :cx="ev.x" :cy="l.y" r="2.2" class="st-ring-i" />
                <text :x="ev.x" :y="l.y - (l.sev === 1 ? 18 : 15)" class="ms-lbl sd-svg-mono" text-anchor="middle">{{ ev.msLabel }}</text>
              </template>
              <rect v-else :x="ev.x - 1.3" :y="l.y - (l.sev === 1 ? 3.75 : 2.25) - 9" width="2.6" height="9"
                    class="st-tick" :style="{ fill: ev.bad ? 'var(--tl-arc, #f0564a)' : l.color }" />
              <circle :cx="ev.x" :cy="l.y" r="12" class="hover-halo"
                      @mouseenter="onStation($event, ev.raw)" @click="onStation($event, ev.raw)" />
            </g>
          </g>
        </g>

        <!-- overflow plate -->
        <g v-if="moreCount">
          <rect x="10" :y="moreY - 14" width="380" height="28" rx="7" class="more-plate" />
          <text x="26" :y="moreY + 4" class="more-txt sd-svg-mono">+{{ moreCount }} MORE {{ moreCount === 1 ? 'LINE' : 'LINES' }} BELOW — THE BOARD CARRIES EVERY EVENT</text>
        </g>

        <!-- the express traveler -->
        <g v-if="train" aria-hidden="true" :transform="`translate(${train.x}, ${train.y})`" :opacity="train.o">
          <circle r="7" class="train-halo" />
          <circle r="3.1" class="train-core" />
        </g>

        <!-- NOW cursor -->
        <g v-if="nowVisible">
          <line class="now-line" :x1="nowX" y1="34" :x2="nowX" :y2="gridBottom + 4" />
          <circle class="now-beacon" :cx="nowX" cy="34" r="4" />
          <rect :x="nowX - 34" :y="gridBottom + 8" width="68" height="17" rx="8" class="now-plate" />
          <text :x="nowX" :y="gridBottom + 20" class="now-lbl sd-svg-mono" text-anchor="middle">NOW {{ nowLabel }}</text>
        </g>
      </svg>

      <!-- zero-row legend plate: what this desk records -->
      <div v-if="isGhost" class="svm-ghostcard" role="note">
        <span class="gc-eyebrow sd-mono">WHAT THIS DESK RECORDS</span>
        <p class="gc-copy">No events in this window. The desk writes every beat as it lands —
          widen the filters or arm LIVE and the map draws itself.</p>
        <div class="gc-cats">
          <span v-for="c in ghostCats" :key="c.key" class="gc-cat sd-mono">
            <i :style="{ background: `var(${c.token})` }" />{{ c.label }}
          </span>
        </div>
      </div>

      <!-- cold-load skeleton: first fetch in flight, no rows yet — the ghost card
           only shows once loading resolves empty, so cover the bare axis here. -->
      <div v-if="loading && !events.length" class="svm-booting sd-mono" aria-live="polite">
        <span class="svm-booting-dot" aria-hidden="true" /> PLOTTING THE SERVICE LINES…
      </div>
    </div>

    <!-- diagram legend -->
    <div class="svm-legend sd-mono">
      <span class="lg"><span class="g-tick" /> EVENT STATION</span>
      <span class="lg"><span class="g-ring" /> MILESTONE INTERCHANGE</span>
      <span class="lg"><span class="g-express" /> SEV1 — EXPRESS</span>
      <span class="lg"><span class="g-dash" /> IN SERVICE → NOW</span>
      <span class="lg"><span class="g-term">RESOLVED</span> TERMINUS</span>
      <span class="lg"><span class="g-now" /> NOW CURSOR</span>
    </div>
  </section>
</template>

<script setup>
/*
  Geometry follows the artifact: viewBox width 1440, plates end at x=272, the
  scale runs PL=286 → PR=1396. Lines are ranked busiest-first and capped at 8
  (a "+N more" plate hands the rest to the departures board). Stations hover →
  emit('station', event, rect) so the HOST anchors SdIncEventPeek — the map
  never owns a popover. flashArrivals() (defineExpose) pulses the NOW cursor
  edge when live arrivals land. All continuous motion (beacon, live caps, the
  express traveler) is prefersReduced-gated.
*/
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { prefersReduced, useInView, seededWave } from '@/composables/useShiftMotion'
import { CATEGORY_META, CATEGORY_ORDER } from '../composables/incidentTaxonomy'

const props = defineProps({
  events: { type: Array, default: () => [] },
  pulse: { type: Object, default: null },
  stones: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  metaFor: { type: Function, default: null },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['station', 'open'])

/* ── geometry constants (artifact 1:1) ── */
const PL = 286
const PR = 1396
const ROW0 = 58
const ROWH = 47
const MAX_LINES = 8
const HOUR = 3600000
const TERMINAL = new Set(['resolved', 'closed', 'archived', 'merged'])

const hotId = ref(null)

/* ── the time window: start of the earliest event's local day → end of the
      latest day (or today when NOW rides inside the window) ── */
const win = computed(() => {
  const ts = props.events
    .map((e) => new Date(e.at).getTime())
    .filter(Number.isFinite)
  const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
  if (!ts.length) {
    const t0 = dayStart(props.now)
    return { t0, t1: t0 + 24 * HOUR }
  }
  const minAt = Math.min(...ts)
  const maxAt = Math.max(...ts)
  const t0 = dayStart(minAt)
  // live view when NOW sits within 12h past the newest event; else historical
  const liveEnd = props.now >= maxAt && props.now - maxAt <= 12 * HOUR ? props.now : maxAt
  const t1 = dayStart(liveEnd) + 24 * HOUR
  return { t0, t1 }
})
const X = (t) => {
  const { t0, t1 } = win.value
  const r = (t - t0) / Math.max(1, t1 - t0)
  return PL + Math.min(1, Math.max(0, r)) * (PR - PL)
}
const spanHours = computed(() => Math.round((win.value.t1 - win.value.t0) / HOUR))

/* ── hour axis ticks ── */
const ticks = computed(() => {
  const { t0, t1 } = win.value
  const hours = (t1 - t0) / HOUR
  const step = [1, 2, 3, 6, 12, 24].find((s) => hours / s <= 26) || 48
  const out = []
  for (let t = t0, i = 0; t <= t1 + 1; t += step * HOUR, i++) {
    const d = new Date(t)
    const isMid = d.getHours() === 0
    const major = i % 2 === 0
    let label = null
    if (major || isMid) {
      label = isMid && hours > 26
        ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase()
        : String(d.getHours()).padStart(2, '0')
    }
    out.push({ t, x: X(t), major, label, grid: isMid ? t > t0 && t < t1 : (i % 4 === 0 && i > 0) })
  }
  return out
})

/* ── group events into lines, busiest first, cap 8 ── */
const sevColor = (s) => (s === 1 ? 'var(--tl-arc, #f0564a)'
  : s === 2 ? 'var(--tl-core, #f5a623)'
    : s === 3 ? 'var(--tl-hi, #ffd166)' : 'var(--sd-text-dim)')

const allLines = computed(() => {
  const by = new Map()
  for (const e of props.events) {
    const k = String(e.ticket_id)
    if (!by.has(k)) {
      by.set(k, { id: k, ticketId: e.ticket_id, number: e.ticket_number || '—',
                  subject: e.subject || '', sev: Number(e.sev) || 4, status: e.status, ev: [] })
    }
    by.get(k).ev.push(e)
  }
  const list = [...by.values()]
  for (const l of list) l.ev.sort((a, b) => new Date(a.at) - new Date(b.at))
  list.sort((a, b) => b.ev.length - a.ev.length || a.sev - b.sev)
  return list
})

const hhmm = (t) => {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const msLabelOf = (e) => {
  const m = props.metaFor?.(e.action)
  const v = (m?.verb || m?.label || String(e.action || '').replace(/_/g, ' ')).toUpperCase()
  return v.length > 16 ? `${v.slice(0, 15)}…` : v
}

const shown = computed(() => allLines.value.slice(0, MAX_LINES).map((l, i) => {
  const y = ROW0 + i * ROWH
  const first = new Date(l.ev[0].at).getTime()
  const lastT = new Date(l.ev[l.ev.length - 1].at).getTime()
  const x0 = X(first)
  const x1 = Math.max(x0 + 2, X(lastT))
  const st = l.ev.map((e) => {
    const m = props.metaFor?.(e.action)
    return {
      id: e.id, raw: e, x: X(new Date(e.at).getTime()),
      ms: !!e.is_milestone, msLabel: e.is_milestone ? msLabelOf(e) : '',
      bad: m?.tone === 'arc',
    }
  })
  const sub = l.subject.length > 36 ? `${l.subject.slice(0, 35)}…` : l.subject
  return {
    ...l, y, x0, x1, len: Math.max(1, x1 - x0), st, sub,
    color: sevColor(l.sev),
    resolved: TERMINAL.has(String(l.status)),
    endLabel: hhmm(lastT),
  }
}))
const moreCount = computed(() => Math.max(0, allLines.value.length - MAX_LINES))
const moreY = computed(() => ROW0 + shown.value.length * ROWH)

/* ── stage height ── */
const rowsN = computed(() => (isGhost.value ? 6 : Math.max(1, shown.value.length)) + (moreCount.value ? 1 : 0))
const gridBottom = computed(() => ROW0 + (rowsN.value - 1) * ROWH + 26)
const H = computed(() => gridBottom.value + 48)

/* ── NOW cursor ── */
const nowVisible = computed(() => props.now >= win.value.t0 && props.now <= win.value.t1)
const nowX = computed(() => X(props.now))
const nowLabel = computed(() => hhmm(props.now))

/* ── header copy ── */
const headLine = computed(() => {
  if (isGhost.value) return `STANDBY · ${spanHours.value}H SCALE`
  const n = shown.value.length
  return `${n} ${n === 1 ? 'LINE' : 'LINES'} IN OPERATION · ${spanHours.value}H SCALE`
})
const headNote = computed(() => {
  const d = new Date(props.now)
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
  return `${day} · HOVER A STATION FOR ROUTE INFO`
})

/* ── ghost diagram at zero rows ── */
const isGhost = computed(() => !props.loading && !props.events.length)
const ghosts = computed(() => {
  if (!isGhost.value) return []
  const out = []
  for (let i = 0; i < 6; i++) {
    const w = seededWave(i + 3, 8)
    const y = ROW0 + i * ROWH
    const x0 = PL + 20 + w[0] * 90
    const x1 = PR - 60 - w[7] * 220
    const st = w.slice(1, 7).map((v) => x0 + 14 + v * (x1 - x0 - 28))
    out.push({ y, x0, x1, st, ms: i % 3 === 0 })
  }
  return out
})
const ghostCats = CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_META[key].label.toUpperCase(), token: CATEGORY_META[key].token }))

/* ── draw-in choreography (inView + first-data gated) ── */
const stageEl = ref(null)
const { visible } = useInView(stageEl, { threshold: 0.12 })
const drawn = ref(false)
watch([visible, () => shown.value.length], ([vis, n], [, oldN] = []) => {
  if (!vis) return
  if (n && !oldN) {
    // first data after mount — restart the draw so rails sweep in
    drawn.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))
  } else if (!drawn.value) {
    requestAnimationFrame(() => { drawn.value = true })
  }
}, { immediate: true })

/* ── the express traveler — rAF dot gliding along the first SEV1 line ── */
const train = ref(null)
let raf = null
const stopTrain = () => { if (raf) cancelAnimationFrame(raf); raf = null; train.value = null }
const startTrain = () => {
  stopTrain()
  if (prefersReduced()) return
  const l = shown.value.find((x) => x.sev === 1 && x.st.length > 1)
  if (!l || l.len < 60) return
  const { x0, x1, y } = l
  const PERIOD = 15000
  const step = (ts) => {
    const p = (ts % PERIOD) / PERIOD
    const o = p < 0.05 ? p / 0.05 : p > 0.95 ? (1 - p) / 0.05 : 1
    train.value = { x: x0 + p * (x1 - x0), y, o: o.toFixed(2) }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
watch(() => shown.value.map((l) => `${l.id}:${l.x0}:${l.x1}`).join('|'), startTrain, { immediate: true })
onBeforeUnmount(stopTrain)

/* ── arrivals flash — the host calls this when the live buffer lands ── */
const flashing = ref(false)
let flashT = null
const flashArrivals = () => {
  flashing.value = false
  requestAnimationFrame(() => { flashing.value = true })
  clearTimeout(flashT)
  flashT = setTimeout(() => { flashing.value = false }, 1400)
}
onBeforeUnmount(() => clearTimeout(flashT))
defineExpose({ flashArrivals })

/* ── station hover → hand the event + anchor rect to the host peek ── */
const onStation = (domEvent, ev) => {
  const rect = domEvent.currentTarget?.getBoundingClientRect?.()
  emit('station', ev, rect || null)
}
</script>

<style scoped>
.svm {
  border: 1px solid var(--tl-brd, var(--sd-border));
  background: color-mix(in srgb, var(--sd-surface) 66%, transparent);
  backdrop-filter: blur(12px);
  border-radius: 4px;
}
.svm-head {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 11px 16px; border-bottom: 1px solid var(--tl-brd, var(--sd-border));
}
.svm-title { font-size: 10.5px; letter-spacing: 0.26em; color: var(--sd-text-secondary); text-transform: uppercase; }
.svm-title b { color: var(--tl-core, var(--sd-inc-core)); font-weight: 600; }
.svm-note { font-size: 9.5px; letter-spacing: 0.14em; color: var(--sd-text-dim); text-transform: uppercase; }
.svm-stage { position: relative; padding: 6px 10px 2px; }
.svm-stage svg { display: block; width: 100%; height: auto; }
.svm-booting {
  position: absolute; inset: 30px 0 0; display: flex; align-items: center; justify-content: center;
  gap: 10px; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--sd-text-dim);
}
.svm-booting-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--tl-core, var(--sd-inc-core)); animation: svm-boot 1.1s ease-in-out infinite;
}
@keyframes svm-boot { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .svm-booting-dot { animation: none; }
}

.sd-svg-mono { font-family: var(--sd-mono); font-variant-numeric: tabular-nums; }

/* axis */
.axis-lbl { font-family: var(--sd-mono); font-size: 10px; fill: var(--sd-text-dim); letter-spacing: 0.08em; }
.axis-tick { stroke: var(--sd-border-strong); }
.axis-grid { stroke: var(--sd-border); stroke-dasharray: 1 5; }

/* line groups — hover dims the rest */
.lineg { transition: opacity 0.25s; }
.lineg.cold { opacity: 0.22; }
.plate { cursor: pointer; }
.plate:focus-visible { outline: 2px solid var(--tl-core, var(--sd-inc-core)); outline-offset: 2px; }
.plate-rect {
  fill: color-mix(in srgb, var(--sd-surface-elevated) 88%, transparent);
  stroke: var(--sd-border-strong); transition: stroke 0.2s;
}
.lineg:hover .plate-rect { stroke: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 45%, transparent); }
.plate-num { font-size: 11px; font-weight: 600; fill: var(--sd-text); letter-spacing: 0.04em; }
.plate-sub { font-size: 10.5px; fill: var(--sd-text-muted); }
.plate-sev { font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; }

/* rails + projections */
.rail { transition: stroke-dashoffset 0.8s cubic-bezier(0.3, 0.9, 0.3, 1); }
.lineg.express .rail { filter: drop-shadow(0 0 6px rgba(240, 86, 74, 0.45)); }
.proj { stroke-width: 2; stroke-dasharray: 2 6; opacity: 0.5; }
.term-bar { fill: var(--tl-live, var(--sd-success)); }
.term-chip {
  fill: color-mix(in srgb, var(--tl-live, var(--sd-success)) 12%, transparent);
  stroke: var(--tl-live, var(--sd-success)); stroke-width: 1;
}
.term-txt { font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em; fill: var(--tl-live, var(--sd-success)); }

/* stations */
.stations { opacity: 0; transition: opacity 0.6s ease; }
.stations.on { opacity: 1; }
.st-ring-o { fill: var(--sd-canvas); stroke: var(--sd-text); stroke-width: 2.2; transition: stroke-width 0.15s; }
.st-ring-i { fill: var(--sd-text); }
.stg:hover .st-ring-o { stroke-width: 3.2; }
.ms-lbl { font-size: 8.5px; letter-spacing: 0.1em; fill: var(--sd-text-muted); text-transform: uppercase; }
.st-tick { transition: transform 0.15s; transform-box: fill-box; transform-origin: center; }
.stg:hover .st-tick { transform: scale(1.35); }
.hover-halo { fill: transparent; cursor: pointer; }

/* overflow plate */
.more-plate { fill: color-mix(in srgb, var(--sd-surface-elevated) 70%, transparent); stroke: var(--sd-border); }
.more-txt { font-size: 9.5px; letter-spacing: 0.14em; fill: var(--sd-text-muted); }

/* express traveler */
.train-halo { fill: var(--tl-hi, var(--sd-inc-hi)); opacity: 0.22; }
.train-core { fill: var(--tl-hi, var(--sd-inc-hi)); }

/* NOW cursor */
.now-line {
  stroke: var(--tl-core, var(--sd-inc-core)); stroke-width: 1.4;
  stroke-dasharray: 3 4; stroke-opacity: 0.6; transition: stroke-opacity 0.3s, stroke-width 0.3s;
}
.now-beacon { fill: var(--tl-core, var(--sd-inc-core)); animation: svm-now-pulse 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes svm-now-pulse { 0%, 100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 0.35; transform: scale(1.7); } }
.now-plate { fill: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 12%, transparent); stroke: color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 32%, transparent); }
.now-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; fill: var(--tl-core, var(--sd-inc-core)); }
.live-cap { animation: svm-cap-pulse 2.6s ease-in-out infinite; }
@keyframes svm-cap-pulse { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.3; } }

/* arrivals flash — edge glow + a brightened NOW line, one cycle */
.svm.flash { animation: svm-edge 1.3s ease-out 1; }
.svm.flash .now-line { stroke-opacity: 1; stroke-width: 2.5; }
@keyframes svm-edge {
  0% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 65%, transparent), 0 0 26px color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 30%, transparent); }
  100% { box-shadow: inset 0 0 0 0 transparent, 0 0 0 transparent; }
}

/* ghosts */
.ghost-plate { fill: color-mix(in srgb, var(--sd-surface-elevated) 44%, transparent); stroke: var(--sd-border); stroke-dasharray: 3 4; }
.ghost-num { font-size: 10.5px; font-weight: 600; fill: var(--sd-text-dim); letter-spacing: 0.06em; }
.ghost-sub { font-size: 10px; fill: var(--sd-text-dim); opacity: 0.7; }
.ghost-rail { stroke: var(--sd-text-dim); stroke-width: 3.5; stroke-linecap: round; opacity: 0.25; }
.ghost-tick { fill: var(--sd-text-dim); opacity: 0.35; }
.ghost-ring { fill: var(--sd-canvas); stroke: var(--sd-text-dim); stroke-width: 2; opacity: 0.45; }
.svm-ghostcard {
  position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%);
  width: min(430px, 84%); padding: 16px 20px 15px;
  border: 1px solid var(--tl-brd, var(--sd-border-strong)); border-radius: 12px;
  background: color-mix(in srgb, var(--sd-surface-elevated) 90%, transparent);
  backdrop-filter: blur(14px); text-align: center;
}
.gc-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.26em; color: var(--tl-core, var(--sd-inc-core)); }
.gc-copy { margin: 8px 0 10px; font-size: 12px; line-height: 1.55; color: var(--sd-text-secondary); }
.gc-cats { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.gc-cat {
  display: inline-flex; align-items: center; gap: 6px; font-size: 8.5px; letter-spacing: 0.16em;
  color: var(--sd-text-muted); border: 1px solid var(--sd-border); border-radius: 999px; padding: 3.5px 9px;
}
.gc-cat i { width: 6px; height: 6px; border-radius: 50%; }

/* diagram legend */
.svm-legend {
  display: flex; flex-wrap: wrap; align-items: center; gap: 22px; padding: 10px 18px 13px;
  border-top: 1px solid var(--tl-brd, var(--sd-border));
  font-size: 9.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); text-transform: uppercase;
}
.lg { display: flex; align-items: center; gap: 8px; }
.lg .g-tick { width: 2.5px; height: 10px; background: var(--tl-core, var(--sd-inc-core)); }
.lg .g-ring { width: 11px; height: 11px; border-radius: 50%; border: 2.5px solid var(--sd-text); background: var(--sd-canvas); }
.lg .g-express { width: 22px; height: 7px; border-radius: 4px; background: var(--tl-arc, var(--sd-pri-critical)); }
.lg .g-dash { width: 24px; height: 0; border-top: 2.5px dashed var(--sd-text-dim); }
.lg .g-term {
  padding: 1.5px 7px; border: 1px solid var(--tl-live, var(--sd-success)); color: var(--tl-live, var(--sd-success));
  border-radius: 8px; font-size: 8.5px;
  background: color-mix(in srgb, var(--tl-live, var(--sd-success)) 12%, transparent);
}
.lg .g-now { width: 2px; height: 12px; background: var(--tl-core, var(--sd-inc-core)); box-shadow: 0 0 12px color-mix(in srgb, var(--tl-core, var(--sd-inc-core)) 45%, transparent); }

@media (max-width: 860px) { .svm-note { display: none; } }

/* reduced motion — every loop dies; the diagram lands pre-drawn */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .now-beacon,
  html:not([data-cinematic="on"]) .live-cap,
  html:not([data-cinematic="on"]) .svm.flash { animation: none; }
  html:not([data-cinematic="on"]) .rail { transition: none; stroke-dasharray: none !important; stroke-dashoffset: 0 !important; }
  html:not([data-cinematic="on"]) .stations { opacity: 1 !important; transition: none; }
}

/* ═════════════════ LIGHT THEME OVERRIDES ═════════════════ */
[data-theme="light"] .lineg.express .rail { filter: drop-shadow(0 0 6px rgba(194, 53, 43, 0.32)); }
[data-theme="light"] .plate-rect { fill: rgba(255, 253, 249, 0.92); }
[data-theme="light"] .svm-ghostcard { background: rgba(255, 251, 243, 0.92); }
</style>
