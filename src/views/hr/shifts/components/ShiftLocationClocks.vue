<template>
  <div v-if="coverage && coverage.length" class="loc-grid">
    <article v-for="loc in cards" :key="loc.key" class="loc-card" :class="{ untz: !loc.tzOk, biz: loc.businessHours }">
      <header class="lc-head">
        <span class="lc-name"><MapPin :size="12" /> {{ loc.name }}</span>
        <span v-if="loc.place" class="lc-place">{{ loc.place }}</span>
      </header>

      <!-- live local clock -->
      <template v-if="loc.tzOk">
        <div class="lc-clock-row">
          <span class="lc-clock shift-mono">{{ loc.clock }}<small>{{ loc.ss }}</small></span>
          <span class="lc-dn" :class="{ day: loc.daylight }">
            <component :is="loc.daylight ? Sun : Moon" :size="13" />
          </span>
        </div>
        <div class="lc-meta shift-mono">{{ loc.tz }} · {{ loc.offset }}<template v-if="loc.weekday"> · {{ loc.weekday }}</template></div>
        <div v-if="loc.weeklyOff" class="lc-off">{{ loc.weeklyOff }}</div>
      </template>
      <div v-else class="lc-notz">
        <Clock :size="12" />
        <span>No timezone set —
          <router-link class="lc-link" to="/admin/hr/settings/work-locations">configure in Settings</router-link>
        </span>
      </div>

      <!-- on-shift-now readout -->
      <div class="lc-on" :class="{ live: loc.tzOk && loc.onNow > 0 }">
        <span class="lc-on-num">{{ loc.tzOk ? loc.onNow : '—' }}</span>
        <span class="lc-on-lbl">on shift now</span>
        <span class="lc-on-tot">/ {{ loc.total }} assigned</span>
      </div>

      <!-- shift windows (local wall-clock) -->
      <ul class="lc-shifts">
        <li v-for="s in loc.shifts" :key="s.shift_id" class="lc-shift" :class="{ active: s.active }">
          <span class="lc-sdot" :style="{ background: s.color }" />
          <span class="lc-sname">{{ s.name }}</span>
          <span class="lc-swin shift-mono">{{ s.window }}</span>
          <span class="lc-scount">{{ s.count }}</span>
        </li>
      </ul>
    </article>
  </div>
  <p v-else class="lc-empty">
    No scheduled employees yet — place them in
    <button class="lc-link" @click="$emit('go', 'assignment')">Assignment</button>.
  </p>
</template>

<script setup>
// Per-office "local time & who's-on-shift-now" panel for the Shifts dashboard.
// Shift times are treated as LOCAL to each office's timezone (the corporate
// norm — a 9–6 shift means 9–6 wherever the office is). The backend supplies
// each location's timezone + shift windows; this renders a live clock and
// computes on-shift-now client-side against each office's wall clock.
import { computed } from 'vue'
import { MapPin, Sun, Moon, Clock } from 'lucide-vue-next'
import {
  useNow, tzLocal, tzOffsetMinutes, offsetLabel, isDaylight, isBusinessHours,
  isValidTz, weeklyOffSummary,
} from '../../settings/composables/useLocationClock'
import { shortTime, shiftTypeMeta } from '@/composables/useShifts'

const props = defineProps({
  coverage: { type: Array, default: () => [] },
})
defineEmits(['go'])

const now = useNow()
const pad = (n) => String(n).padStart(2, '0')
const minOf = (t) => {
  if (!t) return null
  const [h, m] = String(t).split(':')
  return Number(h) * 60 + Number(m)
}
// Is `min` inside the shift window [s, e)? Handles overnight wrap (e <= s).
const within = (min, s, e) => {
  if (s == null || e == null || min == null) return false
  if (s === e) return true                 // 24-hour shift
  return e > s ? (min >= s && min < e) : (min >= s || min < e)
}

const cards = computed(() => (props.coverage || []).map((loc, idx) => {
  const tzOk = !!loc.timezone && isValidTz(loc.timezone)
  const local = tzOk ? tzLocal(loc.timezone, now.value) : null
  const min = local?.minutes ?? null
  const shifts = (loc.shifts || []).map((s) => ({
    ...s,
    color: shiftTypeMeta(s.shift_type).color,
    window: `${shortTime(s.start_time)} – ${shortTime(s.end_time)}`,
    active: tzOk && within(min, minOf(s.start_time), minOf(s.end_time)),
  }))
  return {
    key: loc.location_id || `unmapped-${idx}`,
    name: loc.name,
    place: [loc.city, loc.country].filter(Boolean).join(', '),
    tzOk,
    tz: loc.timezone,
    clock: local?.label || '—',
    ss: local ? `:${pad(local.ss)}` : '',
    offset: tzOk ? offsetLabel(tzOffsetMinutes(loc.timezone, now.value)) : '',
    weekday: local?.weekday || '',
    daylight: isDaylight(local?.hh),
    businessHours: isBusinessHours(min),
    weeklyOff: weeklyOffSummary(loc.weekly_off_pattern),
    onNow: tzOk ? shifts.reduce((a, s) => a + (s.active ? (s.count || 0) : 0), 0) : 0,
    total: loc.total_assigned || 0,
    shifts,
  }
}))
</script>

<style scoped>
.loc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: 12px;
}

.loc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 13px 14px;
  border: 1px solid var(--shift-border-soft);
  border-radius: 14px;
  background: var(--shift-glass);
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}
.loc-card:hover { border-color: var(--shift-border); transform: translateY(-2px); }
.loc-card.biz { box-shadow: inset 3px 0 0 var(--shift-amber); }
.loc-card.untz { opacity: 0.92; }

.lc-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lc-name {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; color: var(--shift-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lc-name svg { color: var(--shift-amber); flex-shrink: 0; }
.lc-place { font-size: 10.5px; color: var(--shift-text-muted); }

.lc-clock-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lc-clock { font-size: 26px; font-weight: 700; color: var(--shift-text); letter-spacing: 0.5px; line-height: 1; }
.lc-clock small { font-size: 13px; color: var(--shift-text-muted); margin-left: 1px; }
.lc-dn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  color: var(--shift-text-muted); background: rgba(120, 130, 150, 0.14);
}
.lc-dn.day { color: var(--shift-amber); background: rgba(251, 191, 36, 0.15); }

.lc-meta { font-size: 10.5px; color: var(--shift-text-2); letter-spacing: 0.2px; }
.lc-off { font-size: 10px; color: var(--shift-text-muted); }

.lc-notz {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 10.5px; line-height: 1.45; color: var(--shift-text-muted);
}
.lc-notz svg { flex-shrink: 0; margin-top: 1px; }

.lc-on {
  display: flex; align-items: baseline; gap: 6px;
  padding: 6px 0 2px; border-top: 1px solid var(--shift-border-soft); margin-top: 2px;
}
.lc-on-num { font-size: 19px; font-weight: 800; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.lc-on.live .lc-on-num { color: var(--shift-ok); }
.lc-on-lbl { font-size: 11px; font-weight: 600; color: var(--shift-text-2); }
.lc-on-tot { font-size: 10.5px; color: var(--shift-text-muted); margin-left: auto; }

.lc-shifts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.lc-shift {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 6px; border-radius: 8px;
  font-size: 11px; color: var(--shift-text-muted);
  transition: background 0.2s, color 0.2s;
}
.lc-shift.active { background: var(--shift-ok-soft); color: var(--shift-text); }
.lc-sdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; opacity: 0.7; }
.lc-shift.active .lc-sdot { opacity: 1; box-shadow: 0 0 8px -1px currentColor; }
.lc-sname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lc-swin { font-size: 10px; color: var(--shift-text-2); }
.lc-scount {
  min-width: 20px; text-align: center; font-weight: 700; font-size: 10.5px;
  color: var(--shift-text-2); font-family: var(--shift-mono);
}

.lc-empty { color: var(--shift-text-muted); font-size: 13px; padding: 14px 6px 4px; text-align: center; }
.lc-link { background: none; border: 0; color: var(--shift-amber); cursor: pointer; font: inherit; text-decoration: underline; }

/* ═════════════════════ LIGHT THEME OVERRIDES ═════════════════════ */
[data-theme="light"] .loc-card {
  background: rgba(255, 250, 240, 0.70);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .loc-card:hover { border-color: rgba(217, 119, 6, 0.35); }
[data-theme="light"] .lc-name { color: #2a1c0c; }
[data-theme="light"] .lc-name svg,
[data-theme="light"] .lc-dn.day { color: #d97706; }
[data-theme="light"] .lc-place,
[data-theme="light"] .lc-off,
[data-theme="light"] .lc-notz,
[data-theme="light"] .lc-on-tot { color: #6b5840; }
[data-theme="light"] .lc-clock { color: #1a1410; }
[data-theme="light"] .lc-clock small { color: #6b5840; }
[data-theme="light"] .lc-meta,
[data-theme="light"] .lc-on-lbl,
[data-theme="light"] .lc-swin,
[data-theme="light"] .lc-scount { color: #44362a; }
[data-theme="light"] .lc-on-num { color: #a89a86; }
[data-theme="light"] .lc-on.live .lc-on-num { color: #047857; }
[data-theme="light"] .lc-shift { color: #6b5840; }
[data-theme="light"] .lc-shift.active { background: rgba(4, 120, 87, 0.12); color: #1a1410; }
[data-theme="light"] .lc-link { color: #b45309; }
</style>
