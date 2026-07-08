<template>
  <div class="sdc">
    <!-- ═══ HERO — the Chrono Desk console ═══ -->
    <SdChronoHero
      :meta="feed.meta" :kind-counts="kindCounts" :active-kinds="activeKinds"
      :range-label="rangeLabel" :loading="loading" :exporting="exporting"
      @lens="toggleKind" @today="goToday" @remind="openReminder()" @export="exportIcs"
    >
      <template #instrument>
        <SdChronoInstrument :days="feed.days" :holidays="feed.holidays" />
      </template>
    </SdChronoHero>

    <!-- ═══ CONTROL DECK ═══ -->
    <Motion
      as="section" class="sdc-deck sd-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }"
    >
      <div class="sdc-deck-row">
        <!-- view switcher -->
        <div class="sdc-views" role="tablist" aria-label="Calendar view">
          <button
            v-for="v in VIEWS" :key="v.key" class="sdc-view" :class="{ on: view === v.key }"
            role="tab" :aria-selected="view === v.key" @click="view = v.key"
          >
            <component :is="v.icon" :size="14" /> {{ v.label }}
          </button>
        </div>

        <!-- range navigation -->
        <div class="sdc-nav">
          <button class="sdc-nav-btn" aria-label="Previous" @click="shift(-1)"><ChevronLeft :size="16" /></button>
          <span class="sdc-nav-label">{{ rangeLabel }}</span>
          <button class="sdc-nav-btn" aria-label="Next" @click="shift(1)"><ChevronRight :size="16" /></button>
          <SdDatePicker :model-value="jumpDate" placeholder="Jump to…" @update:modelValue="jumpTo" />
        </div>

        <div class="sdc-spacer"></div>

        <!-- scope filters -->
        <button v-if="agentReveal || isAdmin" class="sdc-mine" :class="{ on: mine }" @click="mine = !mine">
          <UserRound :size="13" /> {{ mine ? 'My load' : 'Team desk' }}
        </button>
        <SdSelect v-model="priority" :options="priorityOptions" placeholder="Priority" class="sdc-sel" />
        <SdSelect v-model="statusF" :options="statusOptions" placeholder="Status" class="sdc-sel" />
        <button class="sdc-pins" title="Manage reminders — edit, snooze, strike or burn your pins" @click="pinRack = true">
          <BellRing :size="13" /> Pin rack
          <b v-if="kindCounts.reminder" class="sdc-pins-n sd-mono">{{ kindCounts.reminder }}</b>
        </button>
      </div>

      <!-- layer legend + range facts -->
      <div class="sdc-layers">
        <span class="sdc-layers-lbl sd-mono">LAYERS</span>
        <button
          v-for="k in allKindMeta" :key="k.value"
          class="sdc-layer" :class="[`tk-${k.token}`, { on: activeKinds.includes(k.value) }]"
          @click="toggleKind(k.value)"
        >
          <i class="sdc-layer-dot"></i>{{ k.label }}
          <b v-if="kindCounts[k.value]" class="sdc-layer-n sd-mono">{{ kindCounts[k.value] }}</b>
        </button>

        <span class="sdc-spacer"></span>
        <span v-if="feed.meta.busiest_day" class="sdc-fact sd-mono" title="Busiest day in range">
          <Flame :size="11" /> PEAK {{ shortDate(feed.meta.busiest_day) }} · {{ feed.meta.busiest_count }}
        </span>
        <span v-if="feed.meta.next_open_day" class="sdc-fact open sd-mono" title="First clear day — the next open window">
          <Wind :size="11" /> NEXT OPEN {{ shortDate(feed.meta.next_open_day) }}
        </span>
        <span v-if="feed.meta.truncated" class="sdc-fact warn sd-mono" title="The range hit the event cap — narrow the filters">
          <TriangleAlert :size="11" /> CAPPED
        </span>
      </div>
    </Motion>

    <!-- ═══ MAIN STAGE ═══ -->
    <section class="sdc-stage sd-card" :aria-busy="loading">
      <div v-if="error" class="sdc-error">
        <CloudOff :size="26" />
        <p>{{ error }}</p>
        <button class="sdc-retry" @click="load">Retry</button>
      </div>

      <transition v-else name="sdc-view" mode="out-in">
        <div :key="view + rangeKey" class="sdc-viewbox">
          <SdChronoMonth
            v-if="view === 'month'"
            :cells="monthCells"
            @peek="onPeek" @open="openEvent"
          />
          <SdChronoWeek
            v-else-if="view === 'week'"
            :days="weekDays" :business="feed.business"
            @open="openEvent" @peek="onWeekPeek"
          />
          <SdChronoDay
            v-else-if="view === 'day'"
            :day="dayData"
            @open="openEvent" @done="markDone"
          />
          <SdChronoAgenda
            v-else
            :groups="agendaGroups"
            @open="openEvent"
          />
        </div>
      </transition>
    </section>

    <!-- day peek popover (teleported) -->
    <SdChronoDayPeek
      :open="peek.open" :title="peek.title" :holiday="peek.holiday"
      :overloaded="peek.overloaded" :next-open-label="nextOpenLabel"
      :events="peek.events" :anchor="peek.anchor"
      @close="peek.open = false"
      @open-ticket="peekOpen"
      @remind="peekRemind" @day-view="peekDayView" @pins="peekPins"
    />

    <!-- pin rack — the reminder console (edit / snooze / strike / burn) -->
    <SdPinRack
      :open="pinRack" :refresh="pinsRefresh"
      @close="pinRack = false"
      @open-ticket="(id) => emit('open', id)"
      @new="openReminder()" @changed="load"
    />

    <!-- reminder modal -->
    <SdReminderModal
      :open="reminder.open" :ticket="reminder.ticket" :preset-date="reminder.presetDate"
      @close="reminder.open = false" @created="onReminderCreated"
    />
  </div>
</template>

<script setup>
/*
  Chrono Desk — /user/support/tickets/calendar (+ /admin/support-desk mirror).
  ONE sealed request per navigation (StaticPool: never fan out): typed events +
  zero-filled local-day buckets + HR holidays + business hours + meta. Layer
  toggles are client-side (the feed always carries every kind) so lens counts
  stay honest while layers hide. Tickets open through the WORKSPACE's shared
  drawer via emit('open') — this section owns no drawer of its own.
*/
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  ChevronLeft, ChevronRight, UserRound, Flame, Wind, TriangleAlert, CloudOff,
  LayoutGrid, Columns3, GalleryVertical, ListOrdered, BellRing,
} from 'lucide-vue-next'
import SdChronoHero from '../components/SdChronoHero.vue'
import SdChronoInstrument from '../components/SdChronoInstrument.vue'
import SdChronoMonth from '../components/SdChronoMonth.vue'
import SdChronoWeek from '../components/SdChronoWeek.vue'
import SdChronoDay from '../components/SdChronoDay.vue'
import SdChronoAgenda from '../components/SdChronoAgenda.vue'
import SdChronoDayPeek from '../components/SdChronoDayPeek.vue'
import SdPinRack from '../components/SdPinRack.vue'
import SdReminderModal from '../components/SdReminderModal.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  fetchMyCalendar, exportMyCalendarIcs, updateMyReminder,
  CAL_KINDS, CAL_HISTORY_KINDS, PRIORITIES, TICKET_STATUSES,
} from '@/composables/useSupportDesk'
import {
  dayKey, todayKey, addDays, startOfDay, startOfWeek, monthGridRange,
  monthLabel, dayLabel, shortDayLabel, relDayLabel, isBusinessDay, DOW,
} from '../chrono'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'go', 'changed', 'new'])
const isAdmin = computed(() => props.panel === 'admin')

/* ── state ── */
const VIEWS = [
  { key: 'month', label: 'Month', icon: LayoutGrid },
  { key: 'week', label: 'Week', icon: Columns3 },
  { key: 'day', label: 'Day', icon: GalleryVertical },
  { key: 'agenda', label: 'Agenda', icon: ListOrdered },
]
const view = ref('month')
const cursor = ref(startOfDay(new Date()))
const mine = ref(false)
const priority = ref('')
const statusF = ref('')
const loading = ref(false)
const exporting = ref(false)
const error = ref('')

const EMPTY = { events: [], days: [], holidays: [], business: null, meta: {} }
const feed = ref({ ...EMPTY })

const allKindMeta = [...CAL_KINDS, ...CAL_HISTORY_KINDS]
const ALL_KIND_VALUES = allKindMeta.map(k => k.value)
const activeKinds = ref(CAL_KINDS.map(k => k.value))   // history layers default OFF

const peek = reactive({ open: false, title: '', holiday: '', overloaded: false, events: [], anchor: null, key: '' })
const reminder = reactive({ open: false, ticket: null, presetDate: '' })
const pinRack = ref(false)
const pinsRefresh = ref(0)   // bumped after a create so an open rack refetches

/* ── range per view ── */
const range = computed(() => {
  const c = cursor.value
  if (view.value === 'month') {
    const { gridStart, gridEnd } = monthGridRange(c)
    return { from: gridStart, to: gridEnd }
  }
  if (view.value === 'week') {
    const s = startOfWeek(c)
    const e = addDays(s, 6); e.setHours(23, 59, 59, 999)
    return { from: s, to: e }
  }
  if (view.value === 'day') {
    const s = startOfDay(c)
    const e = new Date(s); e.setHours(23, 59, 59, 999)
    return { from: s, to: e }
  }
  const s = startOfDay(c)                                 // agenda: a 14-day window
  const e = addDays(s, 13); e.setHours(23, 59, 59, 999)
  return { from: s, to: e }
})
const rangeKey = computed(() => dayKey(range.value.from) + '_' + dayKey(range.value.to))

const rangeLabel = computed(() => {
  const c = cursor.value
  if (view.value === 'month') return monthLabel(c)
  if (view.value === 'week') return `${shortDayLabel(range.value.from)} — ${shortDayLabel(range.value.to)}`
  if (view.value === 'day') return dayLabel(c)
  return `${shortDayLabel(range.value.from)} +14 days`
})

/* ── data ── */
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    feed.value = await fetchMyCalendar({
      from: range.value.from.toISOString(),
      to: range.value.to.toISOString(),
      kinds: ALL_KIND_VALUES.join(','),
      mine: mine.value || undefined,
      priority: priority.value || undefined,
      status: statusF.value || undefined,
    })
  } catch (e) {
    feed.value = { ...EMPTY }
    error.value = e?.response?.status === 403
      ? 'The Chrono Desk is an agent surface — this account has no desk scope.'
      : 'Could not sound the tide — the calendar feed failed.'
  }
  loading.value = false
}
watch([view, rangeKey, mine, priority, statusF], load)
onMounted(load)

/* ── derived ── */
const kindCounts = computed(() => {
  const out = {}
  for (const e of feed.value.events) out[e.kind] = (out[e.kind] || 0) + 1
  return out
})
const filteredEvents = computed(() => {
  const on = new Set(activeKinds.value)
  return feed.value.events.filter(e => on.has(e.kind))
})
const eventsByDay = computed(() => {
  const m = new Map()
  for (const e of filteredEvents.value) {
    const k = dayKey(e.at)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(e)
  }
  return m
})
const bucketByDay = computed(() => new Map(feed.value.days.map(d => [d.date, d])))
const holidayMap = computed(() => new Map(feed.value.holidays.map(h => [h.date, h.name])))
const overloadedSet = computed(() => new Set(feed.value.meta.overloaded_days || []))
const businessDays = computed(() => feed.value.business?.days || [])
const tKey = todayKey()

const monthCells = computed(() => {
  const { gridStart } = monthGridRange(cursor.value)
  const month = cursor.value.getMonth()
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i)
    const key = dayKey(d)
    const bucket = bucketByDay.value.get(key)
    return {
      key, dayNum: d.getDate(), inMonth: d.getMonth() === month, isToday: key === tKey,
      events: eventsByDay.value.get(key) || [],
      load: bucket?.load || 0, breach: bucket?.breach || 0,
      holiday: holidayMap.value.get(key) || '',
      isBusiness: isBusinessDay(d.getDay(), businessDays.value),
      overloaded: overloadedSet.value.has(key),
    }
  })
})

const weekDays = computed(() => {
  const s = startOfWeek(cursor.value)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(s, i)
    const key = dayKey(d)
    return {
      key, dayNum: d.getDate(), dow: DOW[d.getDay()], isToday: key === tKey,
      isBusiness: isBusinessDay(d.getDay(), businessDays.value),
      holiday: holidayMap.value.get(key) || '',
      events: eventsByDay.value.get(key) || [],
    }
  })
})

const dayData = computed(() => {
  const key = dayKey(cursor.value)
  return { key, isToday: key === tKey, events: eventsByDay.value.get(key) || [] }
})

const agendaGroups = computed(() => {
  const keys = [...eventsByDay.value.keys()].sort()
  return keys.map(k => ({
    key: k, label: relDayLabel(k), isToday: k === tKey,
    events: eventsByDay.value.get(k),
  }))
})

const nextOpenLabel = computed(() =>
  feed.value.meta.next_open_day ? shortDate(feed.value.meta.next_open_day) : '')

/* ── options ── */
const priorityOptions = computed(() => [
  { value: '', label: 'All priorities' },
  ...PRIORITIES,
])
const statusOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...TICKET_STATUSES,
])

/* ── actions ── */
const toggleKind = (kind) => {
  activeKinds.value = activeKinds.value.includes(kind)
    ? activeKinds.value.filter(k => k !== kind)
    : [...activeKinds.value, kind]
}
const goToday = () => { cursor.value = startOfDay(new Date()) }
const shift = (dir) => {
  const c = new Date(cursor.value)
  if (view.value === 'month') c.setMonth(c.getMonth() + dir)
  else if (view.value === 'week') c.setDate(c.getDate() + dir * 7)
  else if (view.value === 'day') c.setDate(c.getDate() + dir)
  else c.setDate(c.getDate() + dir * 14)
  cursor.value = startOfDay(c)
}
const jumpDate = computed(() => dayKey(cursor.value))
const jumpTo = (v) => { if (v) cursor.value = startOfDay(new Date(`${v}T00:00:00`)) }

const shortDate = (key) => {
  try { return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
  catch { return key }
}

/** Every event opens its ticket in the WORKSPACE's shared drawer (reminders too —
    their ticket_id is the destination). */
const openEvent = (ev) => {
  const id = ev.ticket_id || ev.id
  if (id) emit('open', String(id))
}
const peekOpen = (ev) => { peek.open = false; openEvent(ev) }

const markDone = async (ev) => {
  if (ev.kind !== 'reminder') return
  try { await updateMyReminder(ev.id, { done: true }); await load() } catch { /* resurfaces on next load */ }
}

const onPeek = (cell, anchorEl) => {
  peek.title = dayLabel(new Date(`${cell.key}T00:00:00`))
  peek.holiday = cell.holiday || ''
  peek.overloaded = !!cell.overloaded
  peek.events = cell.events || []
  peek.anchor = anchorEl
  peek.key = cell.key
  peek.open = true
}
const onWeekPeek = (d, anchorEl) => {
  onPeek({ key: d.key, holiday: d.holiday, overloaded: overloadedSet.value.has(d.key), events: d.events }, anchorEl)
}
const peekRemind = () => { openReminder(null, peek.key); peek.open = false }
const peekPins = () => { peek.open = false; pinRack.value = true }
const onReminderCreated = () => { load(); pinsRefresh.value++ }
const peekDayView = () => {
  cursor.value = startOfDay(new Date(`${peek.key}T00:00:00`))
  view.value = 'day'
  peek.open = false
}

const openReminder = (ticket = null, presetDate = '') => {
  reminder.ticket = ticket
  reminder.presetDate = presetDate
  reminder.open = true
}

const exportIcs = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const blob = await exportMyCalendarIcs({
      from: range.value.from.toISOString(),
      to: range.value.to.toISOString(),
      kinds: activeKinds.value.join(','),
      mine: mine.value || undefined,
      priority: priority.value || undefined,
      status: statusF.value || undefined,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fourconnect-support-calendar.ics'
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* non-fatal */ }
  exporting.value = false
}
</script>

<style scoped>
.sdc { display: flex; flex-direction: column; gap: 16px; }

/* control deck */
.sdc-deck { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.sdc-deck-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sdc-spacer { flex: 1; }

.sdc-views {
  display: inline-flex; gap: 3px; padding: 3px;
  border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.sdc-view {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 7px 13px; border-radius: 9px; font-size: 11.5px; font-weight: 700;
  background: transparent; border: none; color: var(--sd-text-muted);
  transition: all 0.22s var(--sd-spring);
}
.sdc-view:hover { color: var(--sd-text); }
.sdc-view.on { background: var(--sd-cal-soft); color: var(--sd-cal-core); box-shadow: inset 0 0 0 1px var(--sd-cal-brd); }

.sdc-nav { display: inline-flex; align-items: center; gap: 8px; }
.sdc-nav-btn {
  width: 30px; height: 30px; display: grid; place-items: center; cursor: pointer;
  border-radius: 9px; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: all 0.18s;
}
.sdc-nav-btn:hover { color: var(--sd-cal-core); border-color: var(--sd-cal-brd); }
.sdc-nav-label { min-width: 150px; text-align: center; font-size: 13px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }

.sdc-mine {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 8px 13px; border-radius: 11px; font-size: 11.5px; font-weight: 700;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: all 0.2s;
}
.sdc-mine.on { background: var(--sd-cal-soft); border-color: var(--sd-cal-brd); color: var(--sd-cal-core); }
.sdc-sel { min-width: 140px; }

.sdc-pins {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 8px 13px; border-radius: 11px; font-size: 11.5px; font-weight: 700;
  background: var(--sd-cal-pin-soft); border: 1px solid color-mix(in srgb, var(--sd-cal-pin) 40%, transparent);
  color: var(--sd-cal-pin);
  transition: all 0.2s var(--sd-spring);
}
.sdc-pins:hover { transform: translateY(-1px); box-shadow: 0 0 16px color-mix(in srgb, var(--sd-cal-pin) 30%, transparent); }
.sdc-pins-n {
  font-size: 9px; padding: 1px 6px; border-radius: 999px;
  background: color-mix(in srgb, var(--sd-cal-pin) 18%, transparent);
}

.sdc-layers { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.sdc-layers-lbl { font-size: 8.5px; font-weight: 700; letter-spacing: 0.26em; color: var(--sd-text-dim); margin-right: 3px; }
.sdc-layer {
  --tk: var(--sd-cal-core);
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 4.5px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-dim);
  transition: all 0.2s var(--sd-spring);
}
.sdc-layer .sdc-layer-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tk); opacity: 0.35; transition: all 0.2s; }
.sdc-layer.on { border-color: color-mix(in srgb, var(--tk) 45%, transparent); color: var(--sd-text-secondary); background: color-mix(in srgb, var(--tk) 8%, transparent); }
.sdc-layer.on .sdc-layer-dot { opacity: 1; box-shadow: 0 0 8px var(--tk); }
.sdc-layer-n { font-size: 9px; color: var(--tk); }
.sdc-fact {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-cal-core);
  border: 1px dashed var(--sd-cal-brd); border-radius: 999px; padding: 4px 10px;
}
.sdc-fact.open { color: var(--sd-cal-pin); border-color: color-mix(in srgb, var(--sd-cal-pin) 40%, transparent); }
.sdc-fact.warn { color: var(--sd-cal-storm); border-color: color-mix(in srgb, var(--sd-cal-storm) 45%, transparent); }

/* stage */
.sdc-stage { position: relative; padding: 16px; min-height: 420px; }
.sdc-viewbox { min-width: 0; }
.sdc-view-enter-active, .sdc-view-leave-active { transition: opacity 0.22s ease, transform 0.22s var(--sd-spring); }
.sdc-view-enter-from { opacity: 0; transform: translateY(10px); }
.sdc-view-leave-to { opacity: 0; transform: translateY(-6px); }

.sdc-error {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px 0 20px; color: var(--sd-text-muted); text-align: center;
}
.sdc-error p { margin: 0; font-size: 13px; max-width: 46ch; }
.sdc-retry {
  padding: 8px 18px; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 12px;
  background: var(--sd-cal-soft); border: 1px solid var(--sd-cal-brd); color: var(--sd-cal-core);
}

.tk-core { --tk: var(--sd-cal-core); } .tk-ember { --tk: var(--sd-cal-ember); }
.tk-rose { --tk: var(--sd-cal-rose); } .tk-gold { --tk: var(--sd-cal-gold); }
.tk-resume { --tk: var(--sd-cal-resume); } .tk-stone { --tk: var(--sd-cal-stone); }
.tk-moon { --tk: var(--sd-cal-moon); } .tk-pin { --tk: var(--sd-cal-pin); }

@media (max-width: 900px) {
  .sdc-nav-label { min-width: 110px; font-size: 12px; }
  .sdc-sel { min-width: 120px; }
}
</style>
