<template>
  <Motion as="section" class="rtl sd-card" :class="{ reduced }"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
    <!-- header -->
    <div class="rtl-head">
      <span class="rtl-ic"><CalendarClock :size="15" /></span>
      <div class="rtl-t">
        <b>Release runway</b>
        <span>When each hold lifts — overdue releases auto-resume on the next sweep</span>
      </div>
      <div class="rtl-legend sd-mono">
        <span><i class="lg over" /> overdue</span>
        <span><i class="lg sched" /> scheduled</span>
        <span><i class="lg none" /> no date</span>
      </div>
    </div>

    <!-- the runway: OVERDUE ← NOW gate → TODAY / THIS WEEK / LATER · NO-DATE siding -->
    <div class="runway">
      <div v-for="z in zones" :key="z.key"
        class="band" :class="[z.key, { on: activeZone === z.key, dim: activeZone && activeZone !== z.key }]"
        :style="{ flex: z.flex }" role="button" tabindex="0"
        :title="`${z.count} ticket(s) — click to filter`"
        @click="$emit('zone', activeZone === z.key ? null : z.key)"
        @keydown.enter="$emit('zone', activeZone === z.key ? null : z.key)">
        <span class="band-lbl sd-mono">{{ z.label }}</span>
        <span class="band-n sd-mono">{{ z.count }}</span>
        <div class="band-blips">
          <button v-for="b in z.blips" :key="b.t.id" type="button" class="blip"
            :class="{ over: z.key === 'overdue', stale: b.t.hold_stale }"
            :style="{ left: b.x + '%', background: priorityColor(b.t.priority) }"
            :title="`${b.t.ticket_number} · ${b.label}`"
            @click.stop="$emit('open', b.t)" />
        </div>
        <span v-if="z.key === 'overdue'" class="band-alarm" :class="{ live: z.count > 0 }" />
      </div>
      <!-- NOW gate -->
      <div class="gate" :style="{ left: gateLeft }">
        <span class="gate-beam" /><span class="gate-lbl sd-mono">NOW</span>
      </div>
      <div class="rail-flow" aria-hidden="true" />
    </div>

    <!-- hold-reason composition spectrum -->
    <div class="spec" v-if="reasonAgg.length">
      <div class="spec-bar">
        <Motion v-for="(r, i) in reasonAgg" :key="r.code" as="button" type="button" class="seg"
          :class="{ on: activeReason === r.code, dim: activeReason && activeReason !== r.code }"
          :style="{ flex: r.count, background: r.color }"
          :initial="{ scaleY: 0 }" :animate="{ scaleY: 1 }"
          :transition="{ duration: 0.45, delay: 0.25 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
          :title="`${r.label} — ${r.count} · avg ${r.avg} held`"
          @click="$emit('reason', activeReason === r.code ? null : r.code)" />
      </div>
      <div class="spec-chips">
        <button v-for="r in reasonAgg" :key="r.code" type="button" class="spec-chip"
          :class="{ on: activeReason === r.code }" :style="{ '--rc': r.color }"
          @click="$emit('reason', activeReason === r.code ? null : r.code)">
          <i class="sc-dot" /> {{ r.label }} <b class="sd-mono">{{ r.count }}</b>
          <span class="sc-avg sd-mono">~{{ r.avg }}</span>
        </button>
      </div>
    </div>
  </Motion>
</template>

<script setup>
/*
  SdReleaseTimeline — the On-Hold advanced panel. A NEW analytics axis for the desk:
  keyed on hold_until (WHEN each hold lifts), not created-age (SdAgingLadder) and not
  customer-silence (SdCadenceDeck). Left of the pulsing NOW gate sits the red OVERDUE
  zone (those auto-resume on the next sweep); to the right the schedule fans out over
  TODAY / THIS WEEK / LATER; unscheduled holds park in the dashed NO-DATE siding (where
  staleness accrues). Below, a proportional hold-reason spectrum shows WHY the queue is
  parked (click any band/segment to filter the list).
*/
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { CalendarClock } from 'lucide-vue-next'
import { priorityColor, holdReasonLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  activeZone: { type: String, default: null },
  activeReason: { type: String, default: null },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['zone', 'reason', 'open'])

const DAY = 86400000, HOUR = 3600000
const releaseAt = (t) => {
  const v = t.auto_resume_at || t.hold_until
  return v ? new Date(v).getTime() : null
}

/* zone flex widths are fixed for legibility; blips position within their band by time */
const ZONE_DEFS = [
  { key: 'overdue', label: 'OVERDUE', flex: 15 },
  { key: 'today', label: 'TODAY', flex: 18 },
  { key: 'week', label: 'THIS WEEK', flex: 30 },
  { key: 'later', label: 'LATER', flex: 18 },
  { key: 'nodate', label: 'NO DATE', flex: 15 },
]
const gateLeft = computed(() => {
  const total = ZONE_DEFS.reduce((a, z) => a + z.flex, 0)
  return (ZONE_DEFS[0].flex / total * 100).toFixed(2) + '%'
})

function zoneOf(t) {
  const r = releaseAt(t)
  if (r == null) return 'nodate'
  const d = r - props.now
  if (d <= 0) return 'overdue'
  if (d < DAY) return 'today'
  if (d < 7 * DAY) return 'week'
  return 'later'
}
function blipX(t, zone) {
  const r = releaseAt(t)
  if (r == null) return 10 + ((hashId(t) % 80))
  const d = r - props.now
  if (zone === 'overdue') return Math.max(6, 92 - Math.min(1, -d / (7 * DAY)) * 86)
  if (zone === 'today') return 8 + Math.min(1, d / DAY) * 84
  if (zone === 'week') return 8 + Math.min(1, (d - DAY) / (6 * DAY)) * 84
  return 8 + Math.min(1, (d - 7 * DAY) / (21 * DAY)) * 84
}
function hashId(t) { let h = 0; for (const c of String(t.id)) h = (h * 31 + c.charCodeAt(0)) % 997; return h }
function fmtRel(t) {
  const r = releaseAt(t)
  if (r == null) return 'no release date'
  const d = r - props.now
  if (d <= 0) return `overdue ${fmtDur(-d)}`
  return `releases in ${fmtDur(d)}`
}
function fmtDur(m) {
  if (m < HOUR) return `${Math.max(1, Math.round(m / 60000))}m`
  if (m < DAY) return `${Math.round(m / HOUR)}h`
  return `${Math.round(m / DAY)}d`
}

const zones = computed(() => ZONE_DEFS.map(z => {
  const list = props.tickets.filter(t => zoneOf(t) === z.key)
  return {
    ...z,
    count: list.length,
    blips: list.slice(0, 18).map(t => ({ t, x: blipX(t, z.key), label: fmtRel(t) })),
  }
}))

/* reason spectrum — warm taxonomy ramp (brand-safe ambers/stones/steel) */
const REASON_COLORS = {
  awaiting_approval: '#f59e0b', awaiting_change: '#fb923c', awaiting_parts: '#d6b25e',
  awaiting_third_party: '#9aa3ac', customer_requested: '#e7b95c', internal_review: '#b59e7d',
  scheduled_maintenance: '#c2803a', legal_compliance: '#8d949c', other: '#7d7465',
}
const reasonAgg = computed(() => {
  const m = new Map()
  for (const t of props.tickets) {
    const code = t.hold_reason_code || 'other'
    const cur = m.get(code) || { code, count: 0, ms: 0 }
    cur.count += 1
    cur.ms += Number(t.time_on_hold_ms) || 0
    m.set(code, cur)
  }
  return [...m.values()].sort((a, b) => b.count - a.count).map(r => ({
    ...r,
    label: holdReasonLabel(r.code),
    color: REASON_COLORS[r.code] || REASON_COLORS.other,
    avg: fmtDur(r.count ? r.ms / r.count : 0),
  }))
})
</script>

<style scoped>
.rtl { padding: 18px 20px 16px; display: flex; flex-direction: column; gap: 14px; }

.rtl-head { display: flex; align-items: center; gap: 11px; }
.rtl-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--sd-dock-ember); background: var(--sd-dock-ember-soft); flex-shrink: 0; }
.rtl-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.rtl-t b { font-size: 13.5px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.rtl-t span { font-size: 11px; color: var(--sd-text-muted); }
.rtl-legend { display: inline-flex; gap: 11px; font-size: 9px; letter-spacing: 0.08em; color: var(--sd-text-muted); }
.rtl-legend span { display: inline-flex; align-items: center; gap: 5px; }
.lg { width: 8px; height: 8px; border-radius: 3px; }
.lg.over { background: var(--sd-dock-overdue); }
.lg.sched { background: var(--sd-dock-ember); }
.lg.none { background: var(--sd-dock-stone); opacity: 0.6; }

/* runway */
.runway { position: relative; display: flex; gap: 5px; height: 92px; }
.band { position: relative; border-radius: 12px; border: 1px solid var(--sd-border); background: var(--sd-surface); cursor: pointer; overflow: hidden; transition: border-color 0.2s, background 0.2s, opacity 0.25s, flex 0.5s var(--sd-spring); }
.band:hover { border-color: color-mix(in srgb, var(--sd-dock-ember) 40%, transparent); }
.band.dim { opacity: 0.45; }
.band.on { background: color-mix(in srgb, var(--sd-dock-ember) 9%, transparent); border-color: color-mix(in srgb, var(--sd-dock-ember) 46%, transparent); }
.band.overdue { background: color-mix(in srgb, var(--sd-dock-overdue) 7%, var(--sd-surface)); }
.band.overdue.on { background: color-mix(in srgb, var(--sd-dock-overdue) 14%, transparent); border-color: color-mix(in srgb, var(--sd-dock-overdue) 50%, transparent); }
.band.nodate { border-style: dashed; }
.band-lbl { position: absolute; top: 8px; left: 10px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.13em; color: var(--sd-text-muted); }
.band.overdue .band-lbl { color: var(--sd-dock-overdue); }
.band-n { position: absolute; top: 6px; right: 9px; font-size: 12px; font-weight: 800; color: var(--sd-text); }
.band-blips { position: absolute; left: 0; right: 0; bottom: 14px; height: 34px; }
.blip { position: absolute; bottom: 8px; width: 11px; height: 11px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--sd-canvas) 80%, transparent); cursor: pointer; padding: 0; transition: transform 0.2s var(--sd-spring); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3); }
.blip:hover { transform: scale(1.45); z-index: 2; }
.blip.over { animation: rtl-overblip 1.5s ease-in-out infinite; }
.blip.stale { outline: 2px dashed color-mix(in srgb, var(--sd-warning) 60%, transparent); outline-offset: 1px; }
.band-alarm { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--sd-dock-overdue); opacity: 0.25; }
.band-alarm.live { animation: rtl-alarm 2s ease-in-out infinite; }

.gate { position: absolute; top: -6px; bottom: -6px; width: 0; z-index: 3; pointer-events: none; transform: translateX(2px); }
.gate-beam { position: absolute; top: 0; bottom: 0; left: -1px; width: 2.5px; border-radius: 2px; background: linear-gradient(180deg, transparent, var(--sd-dock-release) 24%, var(--sd-dock-release) 76%, transparent); box-shadow: 0 0 12px color-mix(in srgb, var(--sd-dock-release) 55%, transparent); animation: rtl-gate 2.6s ease-in-out infinite; }
.gate-lbl { position: absolute; top: -3px; left: 5px; font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-dock-release); }
.rail-flow { position: absolute; left: 2%; right: 2%; bottom: -7px; height: 2px; border-radius: 2px; background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-dock-ember) 45%, transparent) 0 10px, transparent 10px 20px); background-size: 40px 2px; animation: rtl-flow 1.6s linear infinite; opacity: 0.5; }

/* reason spectrum */
.spec { display: flex; flex-direction: column; gap: 9px; }
.spec-bar { display: flex; gap: 3px; height: 12px; border-radius: 7px; overflow: hidden; }
.seg { border: none; min-width: 14px; cursor: pointer; padding: 0; opacity: 0.9; transform-origin: bottom; transition: opacity 0.2s, flex 0.5s var(--sd-spring); }
.seg:hover { opacity: 1; }
.seg.dim { opacity: 0.3; }
.seg.on { opacity: 1; box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.55); }
.spec-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.spec-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 600; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); cursor: pointer; transition: border-color 0.2s, background 0.2s; }
.spec-chip:hover { border-color: color-mix(in srgb, var(--rc) 50%, transparent); }
.spec-chip.on { color: var(--sd-text); background: color-mix(in srgb, var(--rc) 13%, transparent); border-color: color-mix(in srgb, var(--rc) 52%, transparent); }
.spec-chip b { color: var(--sd-text); font-size: 10.5px; }
.sc-dot { width: 8px; height: 8px; border-radius: 3px; background: var(--rc); }
.sc-avg { font-size: 9px; color: var(--sd-text-muted); }

@keyframes rtl-gate { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes rtl-flow { to { background-position: -40px 0; } }
@keyframes rtl-overblip { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-dock-overdue) 55%, transparent); } 55% { box-shadow: 0 0 0 6px transparent; } }
@keyframes rtl-alarm { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.75; } }

.rtl.reduced .gate-beam, .rtl.reduced .rail-flow, .rtl.reduced .blip.over, .rtl.reduced .band-alarm.live { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .gate-beam,
  html:not([data-cinematic="on"]) .rail-flow,
  html:not([data-cinematic="on"]) .blip.over,
  html:not([data-cinematic="on"]) .band-alarm.live { animation: none !important; }
}
@media (max-width: 860px) {
  .rtl-legend { display: none; }
}
</style>
