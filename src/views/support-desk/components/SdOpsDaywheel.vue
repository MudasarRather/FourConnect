<template>
  <div class="dw">
    <!-- ambient instrument floor — faint radial engraving -->
    <span class="dw-floor" aria-hidden="true" />

    <!-- ═══ instrument bar — slim console strip (the hero above owns the headline) ═══ -->
    <header class="dw-bar">
      <span class="dw-bar-sig sd-mono" title="Every crew's operating window on one live 24-hour dial — the hand sweeps in the selected crew's own timezone.">
        <Clock3 :size="12" /> THE DAYWHEEL
      </span>
      <span class="dw-bar-note sd-mono">CREW OPERATING WINDOWS · LIVE DESK TIME · DRIVES THE BUSINESS-HOURS GATE</span>
      <span class="dw-sp" />
      <span class="dw-bar-tele sd-mono" aria-label="Hours telemetry">
        <em><b><SdCountUp :value="teams.length" /></b> CREWS</em>
        <em class="on"><b><SdCountUp :value="onShiftCount" /></b> ON SHIFT NOW</em>
        <em class="hol"><b><SdCountUp :value="holidaysAhead" /></b> ECLIPSES AHEAD</em>
        <em v-if="nextHoliday" class="next"><b>{{ nextHoliday.inDays === 0 ? 'TODAY' : `${nextHoliday.inDays}d` }}</b> {{ nextHoliday.label.toUpperCase() }}</em>
      </span>
    </header>

    <div v-if="teams.length" class="dw-main">
      <!-- ═══ the daywheel ═══ -->
      <div class="dw-wheelwrap">
        <svg class="dw-svg" viewBox="0 0 340 340" role="img" aria-label="24-hour crew coverage dial">
          <!-- night wash 18:00 → 06:00 -->
          <path :d="arcPath(0.75, 1.25, 104)" class="dw-night" :style="{ strokeWidth: nightWidth }" />
          <!-- hour ticks -->
          <g v-for="h in 24" :key="'t' + h" class="dw-tickg" :style="{ '--td': (h * 0.03) + 's' }">
            <line :x1="tick(h - 1, 150).x" :y1="tick(h - 1, 150).y"
              :x2="tick(h - 1, (h - 1) % 6 === 0 ? 142 : 146).x" :y2="tick(h - 1, (h - 1) % 6 === 0 ? 142 : 146).y"
              class="dw-tick" :class="{ major: (h - 1) % 6 === 0 }" />
          </g>
          <text v-for="h in [0, 6, 12, 18]" :key="'l' + h" :x="tick(h, 160).x" :y="tick(h, 160).y"
            class="dw-hlabel sd-mono" text-anchor="middle" dominant-baseline="central">{{ String(h).padStart(2, '0') }}</text>

          <!-- crew rings -->
          <g v-for="(c, i) in rings" :key="c.id" class="dw-ringg" :style="{ '--rd': (0.15 + i * 0.12) + 's' }"
            :class="{ sel: String(c.id) === String(selId), dim: selId && String(c.id) !== String(selId) }"
            @click="selectCrew(c.id)">
            <circle cx="170" cy="170" :r="c.r" class="dw-track" :style="{ strokeWidth: c.w }" />
            <!-- the operating window arc (draws itself in) -->
            <path v-if="c.arc && !c.overnight" :d="arcPath(c.arc.a, c.arc.b, c.r)" class="dw-window" pathLength="100"
              :style="{ stroke: c.color, strokeWidth: c.w, '--glow': c.color }" :class="{ open: c.openNow }" />
            <!-- an overnight (invalid) window renders as a dashed hazard arc -->
            <path v-else-if="c.arc" :d="arcPath(c.arc.a, c.arc.b + 1, c.r)" class="dw-window bad" pathLength="100"
              :style="{ strokeWidth: c.w }" />
          </g>

          <!-- NOW hand (selected crew's timezone) -->
          <g class="dw-handg" :style="{ transform: `rotate(${handAngle}deg)` }">
            <line x1="170" y1="170" x2="170" y2="36" class="dw-hand" />
            <circle cx="170" cy="36" r="4" class="dw-hand-tip" />
          </g>
          <circle cx="170" cy="170" r="52" class="dw-hub" />
        </svg>

        <!-- live core readout -->
        <div class="dw-core" :class="coreState.kind">
          <b class="dw-core-name">{{ selCrew ? selCrew.name : '—' }}</b>
          <span class="dw-core-time sd-mono">{{ coreClock }}</span>
          <span class="dw-core-lamp sd-mono"><i aria-hidden="true" /> {{ coreState.label }}</span>
          <span v-if="coreState.sub" class="dw-core-sub sd-mono">{{ coreState.sub }}</span>
        </div>

        <!-- ring legend -->
        <div class="dw-legend">
          <button v-for="c in rings" :key="'lg' + c.id" class="dw-lg sd-mono" :class="{ on: String(c.id) === String(selId) }"
            @click="selectCrew(c.id)">
            <i :style="{ background: c.color, boxShadow: `0 0 8px ${c.color}` }" aria-hidden="true" />
            {{ c.name }}
            <em v-if="c.openNow" class="live">LIVE</em>
          </button>
        </div>
      </div>

      <!-- ═══ shift plates — the crew editors ═══ -->
      <div class="dw-rail">
        <article v-for="(tm, i) in teams" :key="tm.id" class="dw-plate" :style="{ '--i': i, '--pc': ringColor(i) }"
          :class="{ sel: String(tm.id) === String(selId), dirty: isDirty(tm) }" @click="selectCrew(tm.id)">
          <span class="dw-plate-spine" aria-hidden="true" />
          <header class="dw-plate-h">
            <i class="dw-plate-dot" aria-hidden="true" />
            <b>{{ tm.name }}</b>
            <span class="dw-sp" />
            <span class="dw-state sd-mono" :class="stateOf(tm).kind"><i aria-hidden="true" /> {{ stateOf(tm).short }}</span>
          </header>

          <div class="dw-days" @click.stop>
            <Motion v-for="(d, di) in DAY_LABELS" :key="di" as="button" class="dw-day sd-mono"
              :class="{ on: draftOf(tm).days.includes(di) }" :while-tap="{ scale: 0.85 }"
              :title="draftOf(tm).days.includes(di) ? 'On shift' : 'Off'" @click="toggleDay(tm, di)">{{ d }}</Motion>
            <span v-if="!draftOf(tm).days.length" class="dw-allday sd-mono" title="An empty day selection means the window runs EVERY day — the desk gate skips the day check entirely.">= EVERY DAY</span>
          </div>

          <div class="dw-times" @click.stop>
            <label class="dw-t sd-mono"><span>OPEN</span>
              <input v-model="draftOf(tm).start" class="dw-inp" type="time" /></label>
            <span class="dw-t-arrow" aria-hidden="true"><ChevronRight :size="11" /></span>
            <label class="dw-t sd-mono"><span>CLOSE</span>
              <input v-model="draftOf(tm).end" class="dw-inp" type="time" /></label>
            <label class="dw-t tz sd-mono"><span>TIMEZONE</span>
              <input v-model.trim="draftOf(tm).tz" class="dw-inp tz" :class="{ bad: !tzOk(draftOf(tm).tz) }"
                list="dw-zones" placeholder="Asia/Kolkata" /></label>
            <span class="dw-wk sd-mono" :title="'Coverage per week with this window'">{{ weeklyOf(tm) }}</span>
          </div>

          <div v-if="plateWarns(tm).length" class="dw-warns" @click.stop>
            <span v-for="w in plateWarns(tm)" :key="w.k" class="dw-warn sd-mono" :class="w.tone">
              <TriangleAlert :size="10" /> {{ w.text }}</span>
          </div>

          <footer v-if="isDirty(tm)" class="dw-plate-f" @click.stop>
            <button class="dw-undo sd-mono" title="Discard edits" @click="resetDraft(tm)"><Undo2 :size="11" /> RESET</button>
            <Motion as="button" class="dw-save" :disabled="!!busySet[String(tm.id)] || !plateValid(tm)"
              :while-hover="plateValid(tm) ? { y: -2 } : {}" :while-tap="plateValid(tm) ? { scale: 0.96 } : {}"
              @click="save(tm)">
              <Loader v-if="busySet[String(tm.id)]" :size="12" class="dw-spin" /><Save v-else :size="12" /> Commit window
            </Motion>
          </footer>
        </article>
        <datalist id="dw-zones">
          <option v-for="z in ZONES" :key="z" :value="z" />
        </datalist>
      </div>
    </div>

    <!-- no crews yet -->
    <div v-else class="dw-empty">
      <span class="dw-empty-core" aria-hidden="true"><span class="e1" /><span class="e2" /><span class="e3" /></span>
      <p class="sd-mono">THE DIAL IS UNWOUND — NO CREWS TO SCHEDULE</p>
      <span>Operating windows live on support crews. Forge a team in Team Command and its ring appears here.</span>
    </div>

    <!-- ═══ the eclipse belt — desk holidays ═══ -->
    <div class="dw-belt">
      <header class="dw-belt-h">
        <span class="dw-belt-sig sd-mono" title="A desk holiday puts the WHOLE desk out-of-hours for the business-hours gate — every crew, all day.">
          <CalendarDays :size="11" /> ECLIPSE BELT
        </span>
        <span class="dw-belt-note sd-mono">DESK HOLIDAYS · WHOLE DESK OUT-OF-HOURS</span>
        <span class="dw-sp" />
        <div class="dw-belt-add" @click.stop>
          <SdDatePicker v-model="holidayDraft.date" placeholder="Date" />
          <input v-model.trim="holidayDraft.label" class="dw-inp label" placeholder="e.g. Diwali" @keyup.enter="commitHoliday" />
          <Motion as="button" class="dw-save" :disabled="!holidayOk" :while-hover="holidayOk ? { y: -2 } : {}"
            :while-tap="holidayOk ? { scale: 0.96 } : {}" @click="commitHoliday">
            <Plus :size="12" /> Chart it
          </Motion>
        </div>
      </header>
      <p v-if="holidayDup" class="dw-belt-warn sd-mono"><TriangleAlert :size="10" /> ALREADY CHARTED — {{ holidayDraft.date }} · {{ holidayDraft.label }}</p>
      <p v-else-if="holidayPast" class="dw-belt-warn info sd-mono"><TriangleAlert :size="10" /> THAT DATE IS ALREADY BEHIND US — it will chart as a past eclipse.</p>

      <div v-if="beltItems.length" class="dw-orbit">
        <span class="dw-orbit-line" aria-hidden="true" />
        <div v-for="(h, i) in beltItems" :key="h.date + h.label" class="dw-ecl" :style="{ '--i': i }"
          :class="{ past: h.past, today: h.today, next: h.isNext }">
          <span class="dw-ecl-disc" aria-hidden="true"><i /></span>
          <div class="dw-ecl-body">
            <b>{{ h.label }}</b>
            <span class="sd-mono">{{ h.pretty }}</span>
            <em class="sd-mono">{{ h.today ? 'TODAY — DESK DARK' : h.past ? 'PASSED' : `IN ${h.inDays}d` }}</em>
          </div>
          <button class="dw-ecl-x" title="Strike this holiday" @click="$emit('remove-holiday', h.index)"><X :size="11" /></button>
        </div>
      </div>
      <p v-else class="dw-belt-none sd-mono">CLEAR SKIES — no holidays charted. The desk gate only rests when you chart one.</p>
    </div>
  </div>
</template>

<script setup>
/*
  SdOpsDaywheel — "THE DAYWHEEL", the Hours & Holidays panel as a live 24-hour
  radial observatory. Signature instrument: concentric crew rings on one dial —
  each ring's operating-window arc draws itself in, a NOW hand sweeps in real time
  in the selected crew's timezone, and the hub reads OPEN / OFF SHIFT / DESK DARK
  with a closes-in/opens-at countdown. Editing is live: the shift plates on the
  right reshape the wheel as you type. Below, desk holidays ride the ECLIPSE BELT
  (next eclipse haloed, countdowns, strike-to-remove).
  Truth-telling against the backend gate (team_on_shift + _business_hours_state):
  windows are `start <= now < end` string-compares, so an overnight window NEVER
  matches — surfaced as a dashed hazard arc + blocked save; an EMPTY day set means
  EVERY day (the gate skips the check) — labelled, not hidden; a holiday darkens
  the whole desk. Timezones are validated with Intl before save.
  Theme-aware stage (no second dark void under the hero), presentational only —
  drafts live here, writes stay in the section via save / add-holiday /
  remove-holiday. The desk's only radial instrument.
*/
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Clock3, CalendarDays, ChevronRight, Plus, Save, Undo2, Loader, TriangleAlert, X,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import SdDatePicker from './SdDatePicker.vue'

const props = defineProps({
  teams: { type: Array, default: () => [] },        // raw SdTeam rows (business_hours)
  holidays: { type: Array, default: () => [] },     // [{date:'YYYY-MM-DD', label}]
  busySet: { type: Object, default: () => ({}) },   // { [teamId]: true } while saving
})
const emit = defineEmits(['save', 'add-holiday', 'remove-holiday'])

const DAY_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const ZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'America/New_York',
  'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC',
]
/* ring palette — house ambers + steel, vivid in both themes */
const RING_COLORS = ['#f2b64d', '#fb923c', '#e8c47f', '#d97706', '#ffd98a', '#9ca3af']
const ringColor = (i) => RING_COLORS[i % RING_COLORS.length]

/* ── drafts (edit state) ── */
const drafts = reactive({})
const draftOf = (tm) => {
  const k = String(tm.id)
  if (!drafts[k]) {
    const bh = tm.business_hours || {}
    drafts[k] = {
      tz: bh.tz || 'Asia/Kolkata',
      days: Array.isArray(bh.days) ? [...bh.days].filter(d => Number.isInteger(d)) : [0, 1, 2, 3, 4],
      start: bh.start || '09:00', end: bh.end || '18:00',
    }
  }
  return drafts[k]
}
const baselineOf = (tm) => {
  const bh = tm.business_hours || {}
  return JSON.stringify({
    tz: bh.tz || 'Asia/Kolkata',
    days: Array.isArray(bh.days) ? [...bh.days].filter(d => Number.isInteger(d)) : [0, 1, 2, 3, 4],
    start: bh.start || '09:00', end: bh.end || '18:00',
  })
}
const isDirty = (tm) => JSON.stringify({ ...draftOf(tm), days: [...draftOf(tm).days] }) !== baselineOf(tm)
const resetDraft = (tm) => { delete drafts[String(tm.id)]; draftOf(tm) }
const toggleDay = (tm, d) => {
  const days = draftOf(tm).days
  const i = days.indexOf(d)
  if (i >= 0) days.splice(i, 1); else { days.push(d); days.sort((a, b) => a - b) }
}

/* ── validation (mirrors the backend gate exactly) ── */
const tzOk = (tz) => {
  if (!tz) return false
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}
const overnight = (d) => !!(d.start && d.end && d.end <= d.start)
const plateWarns = (tm) => {
  const d = draftOf(tm)
  const out = []
  if (overnight(d)) out.push({ k: 'wrap', tone: 'danger', text: 'CLOCK CAN’T WRAP MIDNIGHT — the gate tests open ≤ now < close; end by 23:59 or split crews' })
  if (!tzOk(d.tz)) out.push({ k: 'tz', tone: 'danger', text: 'UNKNOWN TIMEZONE — use an IANA zone like Asia/Kolkata' })
  return out
}
const plateValid = (tm) => {
  const d = draftOf(tm)
  return !!(d.start && d.end && !overnight(d) && tzOk(d.tz))
}
const save = (tm) => { if (plateValid(tm)) emit('save', tm.id, { ...draftOf(tm), days: [...draftOf(tm).days] }) }

/* ── live clock ── */
const nowTick = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { nowTick.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))

/* local wall-clock parts in a tz — defensive against bad zones */
const localParts = (tz) => {
  const safe = tzOk(tz) ? tz : 'Asia/Kolkata'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: safe, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(nowTick.value))
  const get = (t) => parts.find(p => p.type === t)?.value || '00'
  const wd = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[get('weekday')] ?? 0
  const h = Number(get('hour')) % 24, m = Number(get('minute')), s = Number(get('second'))
  return { wd, h, m, s, hm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
}
const localDateStr = (tz) => {
  const safe = tzOk(tz) ? tz : 'Asia/Kolkata'
  return new Intl.DateTimeFormat('en-CA', { timeZone: safe, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(nowTick.value))
}

/* on-shift, mirroring team_on_shift: empty days = every day; start <= hm < end */
const dayHit = (days, wd) => !days.length || days.includes(wd)
const onShiftDraft = (tm) => {
  const d = draftOf(tm)
  if (!d.start || !d.end || overnight(d)) return false
  const lp = localParts(d.tz)
  return dayHit(d.days, lp.wd) && d.start <= lp.hm && lp.hm < d.end
}
const todayIsHoliday = (tz) => {
  const today = localDateStr(tz)
  return props.holidays.find(h => String(h.date) === today) || null
}

/* per-plate state chip */
const stateOf = (tm) => {
  const hol = todayIsHoliday(draftOf(tm).tz)
  if (hol) return { kind: 'hol', short: 'DESK DARK' }
  return onShiftDraft(tm) ? { kind: 'on', short: 'ON SHIFT' } : { kind: 'off', short: 'OFF SHIFT' }
}
const onShiftCount = computed(() => props.teams.filter(tm => !todayIsHoliday(draftOf(tm).tz) && onShiftDraft(tm)).length)

const weeklyOf = (tm) => {
  const d = draftOf(tm)
  if (!d.start || !d.end || overnight(d)) return '0h/wk'
  const [sh, sm] = d.start.split(':').map(Number)
  const [eh, em] = d.end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  const days = d.days.length || 7
  return `${Math.round((mins * days) / 60)}h/wk`
}

/* ── the wheel ── */
const selId = ref(null)
const selectCrew = (id) => { selId.value = String(id) }
const selCrew = computed(() => props.teams.find(t => String(t.id) === String(selId.value)) || props.teams[0] || null)

const frac = (hm) => {
  const [h, m] = String(hm || '0:0').split(':').map(Number)
  return ((h * 60 + m) / 1440)
}
/* rings sized to crew count (display cap 6 — beyond that the legend still lists all) */
const rings = computed(() => {
  const n = Math.min(props.teams.length, 6)
  const gap = Math.min(20, Math.max(13, Math.round(76 / Math.max(n, 1))))
  return props.teams.slice(0, 6).map((tm, i) => {
    const d = draftOf(tm)
    const hasWin = !!(d.start && d.end)
    return {
      id: tm.id, name: tm.name, color: ringColor(i),
      r: 136 - i * gap, w: Math.min(9, gap - 5),
      arc: hasWin ? { a: frac(d.start), b: frac(d.end) } : null,
      overnight: overnight(d),
      openNow: !todayIsHoliday(d.tz) && onShiftDraft(tm),
    }
  })
})
const nightWidth = computed(() => {
  const n = Math.min(props.teams.length, 6)
  const gap = Math.min(20, Math.max(13, Math.round(76 / Math.max(n, 1))))
  return `${n * gap + 14}px`
})

/* svg helpers — 00:00 at top, clockwise */
const pt = (f, r) => {
  const a = (f * 360 - 90) * (Math.PI / 180)
  return { x: 170 + r * Math.cos(a), y: 170 + r * Math.sin(a) }
}
const tick = (h, r) => pt(h / 24, r)
const arcPath = (a, b, r) => {
  if (b <= a) b += 1
  const span = Math.min(b - a, 0.9999)
  const p0 = pt(a, r), p1 = pt(a + span, r)
  const large = span > 0.5 ? 1 : 0
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
}

/* NOW hand + hub readout track the selected crew */
const handAngle = computed(() => {
  if (!selCrew.value) return 0
  const lp = localParts(draftOf(selCrew.value).tz)
  return ((lp.h * 3600 + lp.m * 60 + lp.s) / 86400) * 360
})
const coreClock = computed(() => {
  if (!selCrew.value) return '--:--'
  const lp = localParts(draftOf(selCrew.value).tz)
  return `${String(lp.h).padStart(2, '0')}:${String(lp.m).padStart(2, '0')}:${String(lp.s).padStart(2, '0')}`
})

/* countdown to close / next opening (walks up to a week of days) */
const fmtDur = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : `${mins}m`)
const coreState = computed(() => {
  const tm = selCrew.value
  if (!tm) return { kind: 'off', label: 'NO CREW', sub: '' }
  const d = draftOf(tm)
  const hol = todayIsHoliday(d.tz)
  if (hol) return { kind: 'hol', label: 'DESK DARK', sub: `HOLIDAY — ${hol.label.toUpperCase()}` }
  if (overnight(d)) return { kind: 'bad', label: 'WINDOW INVALID', sub: 'OVERNIGHT WRAP — GATE NEVER OPENS' }
  const lp = localParts(d.tz)
  const nowM = lp.h * 60 + lp.m
  const [sh, sm] = (d.start || '0:0').split(':').map(Number)
  const [eh, em] = (d.end || '0:0').split(':').map(Number)
  const sM = sh * 60 + sm, eM = eh * 60 + em
  if (dayHit(d.days, lp.wd) && nowM >= sM && nowM < eM) {
    return { kind: 'on', label: 'OPEN', sub: `CLOSES IN ${fmtDur(eM - nowM)}` }
  }
  for (let k = 0; k < 8; k++) {
    const wd = (lp.wd + k) % 7
    if (!dayHit(d.days, wd)) continue
    if (k === 0 && nowM >= sM) continue
    const label = k === 0 ? 'TODAY' : k === 1 ? 'TOMORROW' : DAY_LABELS[wd]
    return { kind: 'off', label: 'OFF SHIFT', sub: `OPENS ${label} ${d.start}` }
  }
  return { kind: 'off', label: 'OFF SHIFT', sub: 'NO OPEN DAY IN SIGHT' }
})

/* ── the eclipse belt ── */
const holidayDraft = reactive({ date: '', label: '' })
const holidayDup = computed(() => !!holidayDraft.date && !!holidayDraft.label && props.holidays.some(h =>
  String(h.date) === holidayDraft.date && (h.label || '').trim().toLowerCase() === holidayDraft.label.trim().toLowerCase()))
const todayLocal = computed(() => localDateStr(selCrew.value ? draftOf(selCrew.value).tz : 'Asia/Kolkata'))
const holidayPast = computed(() => !!holidayDraft.date && holidayDraft.date < todayLocal.value)
const holidayOk = computed(() => !!holidayDraft.date && !!holidayDraft.label && !holidayDup.value)
const commitHoliday = () => {
  if (!holidayOk.value) return
  emit('add-holiday', { date: holidayDraft.date, label: holidayDraft.label })
  holidayDraft.date = ''; holidayDraft.label = ''
}
const beltItems = computed(() => {
  const today = todayLocal.value
  const t0 = new Date(today + 'T00:00:00')
  let nextFound = false
  return props.holidays.map((h, index) => {
    const past = h.date < today
    const isToday = h.date === today
    const inDays = Math.max(0, Math.round((new Date(h.date + 'T00:00:00') - t0) / 86400000))
    let pretty = h.date
    try {
      pretty = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(h.date + 'T00:00:00'))
    } catch { /* keep ISO */ }
    const isNext = !past && !isToday && !nextFound ? (nextFound = true) : false
    return { ...h, index, past, today: isToday, inDays, pretty, isNext }
  })
})
const holidaysAhead = computed(() => beltItems.value.filter(h => !h.past).length)
const nextHoliday = computed(() => beltItems.value.find(h => h.today) || beltItems.value.find(h => h.isNext) || null)

onMounted(() => { if (props.teams.length) selId.value = String(props.teams[0].id) })
</script>

<style scoped>
/* ═══ shell — theme-aware instrument bay (the hero above owns the dark void) ═══ */
.dw {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-border); border-radius: 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated);
  padding: 0 18px 18px;
}
.dw-sp { flex: 1; }
.dw-floor {
  position: absolute; inset: -40% -20%; z-index: 0; pointer-events: none; opacity: 0.35;
  background: repeating-radial-gradient(circle at 28% 42%, color-mix(in srgb, var(--sd-qc-core) 7%, transparent) 0 1px, transparent 1px 52px);
  mask-image: radial-gradient(70% 70% at 30% 45%, #000, transparent 75%);
  -webkit-mask-image: radial-gradient(70% 70% at 30% 45%, #000, transparent 75%);
}

/* ═══ instrument bar ═══ */
.dw-bar {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin: 0 -18px 16px; padding: 11px 18px;
  border-bottom: 1px solid var(--sd-border);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 60%);
}
.dw-bar-sig {
  display: inline-flex; align-items: center; gap: 7px; cursor: help;
  font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: var(--sd-qc-core);
}
.dw-bar-note { font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.dw-bar-tele { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.dw-bar-tele em { font-style: normal; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.dw-bar-tele em b { font-size: 13px; letter-spacing: 0; color: var(--sd-qc-hi); margin-right: 3px; }
.dw-bar-tele em.on b { color: var(--sd-qc-go); }
.dw-bar-tele em.hol b { color: var(--sd-qc-spill); }
.dw-bar-tele em.next b { color: var(--sd-qc-core); }

/* ═══ main split ═══ */
.dw-main {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: minmax(340px, 420px) minmax(0, 1fr); gap: 18px;
  align-items: start;
}

/* ═══ the wheel ═══ */
.dw-wheelwrap { position: relative; animation: dw-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes dw-rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } }
.dw-svg { width: 100%; height: auto; display: block; }

.dw-night { fill: none; stroke: color-mix(in srgb, var(--sd-text-dim) 10%, transparent); }
.dw-tickg { animation: dw-tick-in 0.4s ease both; animation-delay: var(--td, 0s); }
@keyframes dw-tick-in { from { opacity: 0; } }
.dw-tick { stroke: color-mix(in srgb, var(--sd-text-dim) 45%, transparent); stroke-width: 1; }
.dw-tick.major { stroke: color-mix(in srgb, var(--sd-qc-core) 65%, transparent); stroke-width: 1.6; }
.dw-hlabel { font-size: 9px; letter-spacing: 0.1em; fill: var(--sd-text-muted); }

.dw-ringg { cursor: pointer; transition: opacity 0.3s; animation: dw-ring-in 0.6s ease both; animation-delay: var(--rd, 0s); }
@keyframes dw-ring-in { from { opacity: 0; } }
.dw-ringg.dim { opacity: 0.35; }
.dw-ringg.sel .dw-window:not(.bad) { filter: drop-shadow(0 0 7px var(--glow)); }
.dw-track { fill: none; stroke: color-mix(in srgb, var(--sd-text-dim) 16%, transparent); }
.dw-window {
  fill: none; stroke-linecap: round;
  stroke-dasharray: 100; stroke-dashoffset: 100;
  animation: dw-draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: inherit;
}
@keyframes dw-draw { to { stroke-dashoffset: 0; } }
.dw-window.open { animation: dw-draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards, dw-open-breathe 3s ease-in-out 1.2s infinite; }
@keyframes dw-open-breathe { 50% { opacity: 0.72; } }
.dw-window.bad { stroke: var(--sd-qc-halt); stroke-dasharray: 3 5; animation: none; stroke-dashoffset: 0; opacity: 0.7; }

.dw-handg { transform-origin: 170px 170px; transition: transform 0.9s linear; }
.dw-hand { stroke: var(--sd-qc-hi); stroke-width: 1.6; opacity: 0.85; }
.dw-hand-tip { fill: var(--sd-qc-hi); animation: dw-tip-pulse 1.4s ease-in-out infinite; }
@keyframes dw-tip-pulse { 50% { r: 5.5; } }
.dw-hub { fill: color-mix(in srgb, var(--sd-qc-core) 7%, transparent); stroke: var(--sd-qc-brd); stroke-width: 1; }

/* live core readout (HTML overlay over the hub) */
.dw-core {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  width: 120px; text-align: center; pointer-events: none;
}
.dw-core-name { font-size: 10px; font-weight: 800; color: var(--sd-text); max-width: 104px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dw-core-time { font-size: 15px; font-weight: 900; letter-spacing: 0.06em; color: var(--sd-qc-hi); font-variant-numeric: tabular-nums; }
.dw-core-lamp { display: inline-flex; align-items: center; gap: 4px; font-size: 7.5px; font-weight: 900; letter-spacing: 0.2em; }
.dw-core-lamp i { width: 6px; height: 6px; border-radius: 50%; }
.dw-core.on .dw-core-lamp { color: var(--sd-qc-go); }
.dw-core.on .dw-core-lamp i { background: var(--sd-qc-go); box-shadow: 0 0 8px var(--sd-qc-go); animation: dw-lamp 2s ease-in-out infinite; }
.dw-core.off .dw-core-lamp { color: var(--sd-text-muted); }
.dw-core.off .dw-core-lamp i { background: var(--sd-text-dim); }
.dw-core.hol .dw-core-lamp { color: var(--sd-qc-spill); }
.dw-core.hol .dw-core-lamp i { background: var(--sd-qc-spill); box-shadow: 0 0 8px var(--sd-qc-spill); }
.dw-core.bad .dw-core-lamp { color: var(--sd-qc-halt); }
.dw-core.bad .dw-core-lamp i { background: var(--sd-qc-halt); box-shadow: 0 0 8px var(--sd-qc-halt); }
@keyframes dw-lamp { 50% { box-shadow: 0 0 14px var(--sd-qc-go); } }
.dw-core-sub { font-size: 7px; letter-spacing: 0.14em; color: var(--sd-text-muted); max-width: 116px; }

.dw-legend { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 6px; }
.dw-lg {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; cursor: pointer; font-family: inherit;
  color: var(--sd-text-secondary); background: transparent; border: 1px solid var(--sd-border);
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.dw-lg:hover { transform: translateY(-1px); }
.dw-lg.on { border-color: var(--sd-qc-brd); background: var(--sd-qc-soft); color: var(--sd-text); }
.dw-lg i { width: 7px; height: 7px; border-radius: 50%; }
.dw-lg em.live { font-style: normal; font-size: 7px; font-weight: 900; letter-spacing: 0.16em; color: var(--sd-qc-go); }

/* ═══ shift plates ═══ */
.dw-rail { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.dw-plate {
  position: relative; overflow: hidden; cursor: pointer;
  border: 1px solid var(--sd-border); border-radius: 14px; padding: 11px 13px 11px 16px;
  background: var(--sd-surface-elevated);
  animation: dw-deal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.07s);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
}
@keyframes dw-deal { from { opacity: 0; transform: translateX(18px); } }
.dw-plate:hover { transform: translateY(-2px); border-color: var(--sd-qc-brd); }
.dw-plate.sel { border-color: var(--sd-qc-brd); box-shadow: var(--sd-qc-glow); }
.dw-plate.dirty { border-style: dashed; }
.dw-plate-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--pc); opacity: 0.85; }
.dw-plate-h { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dw-plate-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 8px var(--pc); flex-shrink: 0; }
.dw-plate-h b { font-size: 13px; font-weight: 800; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dw-state { display: inline-flex; align-items: center; gap: 5px; font-size: 7.5px; font-weight: 900; letter-spacing: 0.18em; }
.dw-state i { width: 6px; height: 6px; border-radius: 50%; }
.dw-state.on { color: var(--sd-qc-go); } .dw-state.on i { background: var(--sd-qc-go); box-shadow: 0 0 7px var(--sd-qc-go); animation: dw-lamp 2s ease-in-out infinite; }
.dw-state.off { color: var(--sd-text-muted); } .dw-state.off i { background: var(--sd-text-dim); }
.dw-state.hol { color: var(--sd-qc-spill); } .dw-state.hol i { background: var(--sd-qc-spill); }

.dw-days { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-bottom: 9px; }
.dw-day {
  width: 30px; height: 24px; border-radius: 8px; cursor: pointer; font-family: inherit;
  font-size: 8px; font-weight: 900; letter-spacing: 0.08em;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border);
  transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.dw-day.on {
  color: #241703; background: var(--sd-qc-grad); border-color: transparent;
  box-shadow: 0 0 10px color-mix(in srgb, var(--sd-qc-core) 35%, transparent);
}
.dw-allday {
  font-size: 7.5px; font-weight: 900; letter-spacing: 0.14em; color: var(--sd-qc-warn); cursor: help;
  border: 1px dashed color-mix(in srgb, var(--sd-qc-warn) 45%, transparent); border-radius: 6px; padding: 3px 7px;
  background: var(--sd-qc-warn-soft);
}

.dw-times { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }
.dw-t { display: flex; flex-direction: column; gap: 3px; }
.dw-t > span { font-size: 7px; font-weight: 900; letter-spacing: 0.18em; color: var(--sd-text-muted); }
.dw-t-arrow { color: var(--sd-text-dim); padding-bottom: 7px; }
.dw-inp {
  height: 30px; padding: 0 8px; border-radius: 8px; font-size: 12px; font-family: inherit;
  color: var(--sd-text); background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dw-inp:focus { outline: none; border-color: var(--sd-qc-brd); box-shadow: 0 0 0 3px var(--sd-qc-soft); }
.dw-inp.tz { width: 150px; font-size: 11px; }
.dw-inp.bad { border-color: var(--sd-qc-halt); box-shadow: 0 0 0 3px var(--sd-qc-halt-soft); }
.dw-inp.label { width: 170px; }
.dw-wk {
  margin-left: auto; align-self: center; font-size: 9px; font-weight: 900; letter-spacing: 0.1em;
  color: var(--sd-qc-hi); border: 1px solid var(--sd-qc-brd); border-radius: 999px; padding: 4px 9px;
  background: var(--sd-qc-soft);
}

.dw-warns { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.dw-warn {
  display: inline-flex; align-items: center; gap: 5px; width: fit-content;
  font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px;
}
.dw-warn.danger { color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft); border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 40%, transparent); }

.dw-plate-f { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.dw-undo {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-family: inherit;
  font-size: 8px; font-weight: 900; letter-spacing: 0.12em; padding: 6px 10px; border-radius: 8px;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border);
}
.dw-save {
  display: inline-flex; align-items: center; gap: 6px; margin-left: auto; cursor: pointer;
  padding: 7px 13px; border-radius: 10px; font-size: 11px; font-weight: 800;
  border: 1px solid transparent; color: #241703;
  background: var(--sd-qc-grad); box-shadow: var(--sd-qc-glow);
  animation: dw-save-pulse 2.2s ease-in-out infinite;
}
.dw-save:disabled { opacity: 0.45; cursor: not-allowed; animation: none; }
@keyframes dw-save-pulse { 50% { box-shadow: 0 0 22px color-mix(in srgb, var(--sd-qc-core) 45%, transparent); } }
.dw-spin { animation: dw-rot 0.9s linear infinite; }
@keyframes dw-rot { to { transform: rotate(360deg); } }

/* ═══ empty ═══ */
.dw-empty {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 44px 20px 40px; text-align: center; border-radius: 14px;
  border: 1px dashed var(--sd-qc-brd);
  background: radial-gradient(90% 120% at 50% 0%, var(--sd-qc-soft), transparent 55%);
}
.dw-empty p { margin: 0; font-size: 10.5px; font-weight: 900; letter-spacing: 0.24em; color: var(--sd-qc-core); }
.dw-empty > span { font-size: 11.5px; color: var(--sd-text-muted); max-width: 420px; line-height: 1.6; }
.dw-empty-core { position: relative; width: 46px; height: 46px; display: grid; place-items: center; margin-bottom: 4px; }
.dw-empty-core span {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--sd-qc-core) 55%, transparent);
  animation: dw-emit 3.4s ease-out infinite;
}
.dw-empty-core .e2 { animation-delay: 1.15s; }
.dw-empty-core .e3 { animation-delay: 2.3s; }
@keyframes dw-emit { from { transform: scale(0.35); opacity: 0.9; } to { transform: scale(1.7); opacity: 0; } }

/* ═══ the eclipse belt ═══ */
.dw-belt {
  position: relative; z-index: 1; margin-top: 16px; padding: 12px 14px 14px;
  border: 1px solid var(--sd-border); border-radius: 14px;
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 55%);
}
.dw-belt-h { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dw-belt-sig {
  display: inline-flex; align-items: center; gap: 6px; cursor: help;
  font-size: 9px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-core);
}
.dw-belt-note { font-size: 8px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.dw-belt-add { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dw-belt-add .dw-save { animation: none; }
.dw-belt-warn {
  display: inline-flex; align-items: center; gap: 5px; margin: 8px 0 0;
  font-size: 8px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px;
  color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft);
  border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 40%, transparent);
}
.dw-belt-warn.info { color: var(--sd-qc-warn); background: var(--sd-qc-warn-soft); border-color: color-mix(in srgb, var(--sd-qc-warn) 40%, transparent); }
.dw-belt-none { margin: 12px 0 0; font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); }

.dw-orbit { position: relative; display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; padding-top: 10px; }
.dw-orbit-line {
  position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 2px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 45%, transparent) 0 6px, transparent 6px 12px);
  animation: dw-orbit-flow 1.4s linear infinite;
}
@keyframes dw-orbit-flow { to { background-position: 12px 0; } }
.dw-ecl {
  position: relative; display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 12px; min-width: 0;
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated);
  animation: dw-deal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.05s);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.dw-ecl:hover { transform: translateY(-2px); border-color: var(--sd-qc-brd); }
.dw-ecl.past { opacity: 0.45; }
.dw-ecl.next { border-color: var(--sd-qc-brd); box-shadow: var(--sd-qc-glow); }
.dw-ecl.today { border-color: color-mix(in srgb, var(--sd-qc-spill) 60%, transparent); }
.dw-ecl-disc { position: relative; width: 26px; height: 26px; flex-shrink: 0; display: grid; place-items: center; }
.dw-ecl-disc i {
  width: 16px; height: 16px; border-radius: 50%;
  background: radial-gradient(circle at 62% 36%, color-mix(in srgb, var(--sd-qc-core) 85%, transparent) 0 38%, color-mix(in srgb, var(--sd-text-dim) 55%, transparent) 42%);
  box-shadow: 0 0 10px color-mix(in srgb, var(--sd-qc-core) 30%, transparent);
}
.dw-ecl.today .dw-ecl-disc i { background: color-mix(in srgb, var(--sd-text) 82%, transparent); box-shadow: 0 0 0 2px var(--sd-qc-core), 0 0 16px color-mix(in srgb, var(--sd-qc-core) 55%, transparent); }
.dw-ecl.next .dw-ecl-disc::after {
  content: ''; position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--sd-qc-core) 60%, transparent);
  animation: dw-emit 2.6s ease-out infinite;
}
.dw-ecl-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dw-ecl-body b { font-size: 11.5px; font-weight: 800; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.dw-ecl-body span { font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.dw-ecl-body em { font-style: normal; font-size: 7px; font-weight: 900; letter-spacing: 0.16em; color: var(--sd-qc-hi); }
.dw-ecl.past .dw-ecl-body em { color: var(--sd-text-dim); }
.dw-ecl.today .dw-ecl-body em { color: var(--sd-qc-spill); }
.dw-ecl-x {
  display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer;
  color: var(--sd-text-dim); background: transparent; border: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.dw-ecl-x:hover { color: var(--sd-qc-halt); border-color: color-mix(in srgb, var(--sd-qc-halt) 40%, transparent); }

/* ═══ responsive ═══ */
@media (max-width: 1000px) {
  .dw-main { grid-template-columns: 1fr; }
  .dw-wheelwrap { max-width: 420px; margin: 0 auto; }
}

/* ═══ reduced motion — ambient loops off unless cinematic mode forces them on ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .dw-wheelwrap,
  html:not([data-cinematic="on"]) .dw-tickg,
  html:not([data-cinematic="on"]) .dw-ringg,
  html:not([data-cinematic="on"]) .dw-hand-tip,
  html:not([data-cinematic="on"]) .dw-core-lamp i,
  html:not([data-cinematic="on"]) .dw-state i,
  html:not([data-cinematic="on"]) .dw-plate,
  html:not([data-cinematic="on"]) .dw-save,
  html:not([data-cinematic="on"]) .dw-orbit-line,
  html:not([data-cinematic="on"]) .dw-ecl,
  html:not([data-cinematic="on"]) .dw-ecl-disc::after,
  html:not([data-cinematic="on"]) .dw-empty-core span { animation: none; }
  html:not([data-cinematic="on"]) .dw-window { animation: none; stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .dw-handg { transition: none; }
  html:not([data-cinematic="on"]) .dw-plate:hover, html:not([data-cinematic="on"]) .dw-ecl:hover { transform: none; }
}

/* ═══ light theme — deepen what reads too pale on cream ═══ */
[data-theme="light"] .dw { background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated); }
[data-theme="light"] .dw-plate, [data-theme="light"] .dw-ecl { box-shadow: 0 2px 10px rgba(60, 42, 8, 0.05); }
[data-theme="light"] .dw-night { stroke: rgba(60, 45, 20, 0.07); }
[data-theme="light"] .dw-hand { stroke: var(--sd-qc-core); }
[data-theme="light"] .dw-hand-tip { fill: var(--sd-qc-core); }
[data-theme="light"] .dw-core-time { color: var(--sd-qc-core); }
</style>
