<template>
  <div class="trn-sec">
    <!-- ─────────── command bar ─────────── -->
    <Motion as="header" class="cal-cmd" ref="cmdRef"
      :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="cal-cmd-aurora" aria-hidden="true" />
      <span class="trn-spotlight" aria-hidden="true" />
      <span class="trn-grain" aria-hidden="true" />

      <div class="cal-cmd-lead">
        <span class="cal-eyebrow"><CalendarRange :size="13" /> Learning Timeline</span>
        <div class="cal-monthnav">
          <button class="cal-nav-btn" @click="shift(-1)" aria-label="Previous month"><ChevronLeft :size="17" /></button>
          <Motion :key="monthKey" as="h1" class="cal-month"
            :initial="reduced ? false : { opacity: 0, x: dir * 18, filter: 'blur(4px)' }"
            :animate="{ opacity: 1, x: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
            {{ MONTHS[cursor.getMonth()] }} <i>{{ cursor.getFullYear() }}</i>
          </Motion>
          <button class="cal-nav-btn" @click="shift(1)" aria-label="Next month"><ChevronRight :size="17" /></button>
          <button class="cal-today" :class="{ off: isCurrentMonth }" @click="goToday"><Crosshair :size="13" /> Today</button>
        </div>
      </div>

      <div class="cal-cmd-right">
        <div class="cal-seg" :style="{ '--i': view === 'agenda' ? 1 : 0 }">
          <span class="cal-seg-pill" aria-hidden="true" />
          <button class="cal-seg-btn" :class="{ on: view === 'month' }" @click="setView('month')"><LayoutGrid :size="14" /> Month</button>
          <button class="cal-seg-btn" :class="{ on: view === 'agenda' }" @click="setView('agenda')"><GanttChartSquare :size="14" /> Timeline</button>
        </div>
      </div>
    </Motion>

    <!-- ─────────── stat capsules (filters) ─────────── -->
    <div class="cal-stats">
      <Motion v-for="(s, i) in stats" :key="s.key" as="button" type="button" class="cal-stat"
        :class="{ on: typeFilter === s.filter }" :style="{ '--c': s.color }"
        :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { y: -3 }" @click="toggleFilter(s.filter)">
        <span class="cal-stat-ic"><component :is="s.icon" :size="15" /></span>
        <div class="cal-stat-body">
          <strong class="cal-stat-val"><TrnCountUp :value="s.value" :duration="1.2" /></strong>
          <span class="cal-stat-lab">{{ s.label }}</span>
        </div>
        <span class="cal-stat-glow" aria-hidden="true" />
      </Motion>
    </div>

    <div class="cal-wrap">
      <!-- ─────────── main: month grid OR timeline ─────────── -->
      <section class="cal-main trn-card" @mouseleave="hideTip">
        <div class="cal-legend">
          <span><i class="d due" /> Training due</span>
          <span><i class="d cert" /> Cert expiry</span>
          <span><i class="d soon" /> Due soon</span>
          <span><i class="d over" /> Overdue</span>
          <span><i class="d done" /> Completed</span>
        </div>

        <!-- loading -->
        <div v-if="loading" class="cal-skel">
          <div v-for="n in 42" :key="n" class="trn-skel" style="height: 92px; border-radius: 12px" />
        </div>

        <!-- MONTH GRID -->
        <template v-else-if="view === 'month'">
          <div class="cal-grid">
            <span v-for="d in WEEKDAYS" :key="d" class="cal-dow">{{ d }}</span>
            <Motion v-for="(cell, i) in cells" :key="cell.key" as="button"
              class="cal-cell" :class="{ muted: !cell.inMonth, today: cell.isToday, sel: cell.key === selectedKey, has: cell.events.length }"
              :initial="reduced ? false : { opacity: 0, scale: 0.9, y: 8 }" :animate="{ opacity: cell.inMonth ? 1 : 0.42, scale: 1, y: 0 }"
              :transition="{ duration: 0.4, delay: Math.min((i % 7 + Math.floor(i / 7)) * 0.022, 0.34), ease: [0.16, 1, 0.3, 1] }"
              :whileHover="reduced ? {} : { y: -3 }"
              @click="select(cell)" @mouseenter="showTip($event, cell)" @focus="showTip($event, cell)">
              <span class="cc-top">
                <span class="cc-num">{{ cell.day }}</span>
                <span v-if="cell.isToday" class="cc-today-dot" aria-hidden="true" />
              </span>
              <span class="cc-chips">
                <span v-for="(e, j) in cell.events.slice(0, 2)" :key="j" class="cc-chip" :style="{ '--c': e.color }">
                  <i class="cc-chip-dot" />
                  <span class="cc-chip-txt">{{ e.title }}</span>
                </span>
                <span v-if="cell.events.length > 2" class="cc-more">+{{ cell.events.length - 2 }} more</span>
              </span>
              <span v-if="cell.isToday" class="cc-today-ring" aria-hidden="true" />
            </Motion>
          </div>
        </template>

        <!-- TIMELINE / AGENDA -->
        <template v-else>
          <div v-if="agendaGroups.length" class="cal-agenda">
            <Motion v-for="(g, gi) in agendaGroups" :key="g.key" as="div" class="ag-group"
              :initial="reduced ? false : { opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.45, delay: Math.min(gi * 0.07, 0.5), ease: [0.16, 1, 0.3, 1] }">
              <div class="ag-node" :class="{ today: g.isToday, past: g.isPast }">
                <span class="ag-dnum trn-mono">{{ g.dnum }}</span>
                <span class="ag-dow">{{ g.dow }}</span>
                <span class="ag-pip" aria-hidden="true" />
              </div>
              <div class="ag-content">
                <span class="ag-rel" :class="g.relTone">{{ g.relLabel }}</span>
                <div class="ag-events">
                  <Motion v-for="(e, j) in g.events" :key="j" as="button" type="button" class="cal-ev"
                    :style="{ '--c': e.color }" :whileHover="reduced ? {} : { y: -2, scale: 1.01 }"
                    :whileTap="{ scale: 0.99 }" @click="goFor(e)">
                    <span class="cal-ev-rail" aria-hidden="true" />
                    <span class="cal-ev-ic"><component :is="iconFor(e)" :size="15" /></span>
                    <div class="cal-ev-body">
                      <span class="cal-ev-title">{{ e.title }}</span>
                      <span class="cal-ev-meta"><span class="cal-ev-avatar">{{ initials(e.employee_name) }}</span>{{ e.employee_name || 'Unassigned' }} · {{ e.typeLabel }}</span>
                    </div>
                    <span class="cal-ev-pill">{{ e.statusLabel }}</span>
                    <ArrowUpRight :size="14" class="cal-ev-go" />
                  </Motion>
                </div>
              </div>
            </Motion>
          </div>
          <div v-else class="cal-agenda-empty">
            <CalendarX2 :size="26" />
            <p>No {{ filterLabel }} in {{ MONTHS[cursor.getMonth()] }}.</p>
          </div>
        </template>
      </section>

      <!-- ─────────── rail ─────────── -->
      <aside class="cal-rail">
        <!-- month composition -->
        <Motion as="section" class="trn-card cal-pulse" ref="pulseRef" :class="{ 'is-in': pulseIn }"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }">
          <header class="cal-card-head">
            <h3><Activity :size="15" /> Month pulse</h3>
            <span class="cal-card-sub">{{ MONTHS[cursor.getMonth()].slice(0, 3) }} {{ cursor.getFullYear() }}</span>
          </header>
          <div class="cal-pulse-total">
            <span class="cal-pulse-num trn-mono"><TrnCountUp :value="decorated.length" :duration="1.3" /></span>
            <span class="cal-pulse-lab">events on the calendar</span>
          </div>
          <div class="cal-pulse-bar">
            <span v-for="(seg, i) in segments" :key="seg.key" class="cal-pulse-seg" v-show="seg.value"
              :style="{ width: pulseIn ? seg.pct + '%' : '0%', background: seg.color, transitionDelay: (i * 0.1) + 's' }"
              :title="`${seg.label}: ${seg.value}`" />
            <span v-if="!decorated.length" class="cal-pulse-empty" />
          </div>
          <ul class="cal-pulse-legend">
            <li v-for="seg in segments" :key="seg.key">
              <span class="cps-dot" :style="{ background: seg.color }" />
              <span class="cps-lab">{{ seg.label }}</span>
              <span class="cps-n trn-mono">{{ seg.value }}</span>
            </li>
          </ul>
        </Motion>

        <!-- selected day -->
        <section class="trn-card cal-day">
          <header class="cal-card-head">
            <h3><CalendarDays :size="15" /> {{ selectedLabel }}</h3>
            <span v-if="selectedRel" class="cal-day-rel" :class="selectedRelTone">{{ selectedRel }}</span>
          </header>
          <div v-if="loading" class="trn-skel" style="height: 60px; border-radius: 12px" />
          <TransitionGroup v-else-if="selectedEvents.length" name="trn-list" tag="div" class="cal-day-list">
            <Motion v-for="(e, i) in selectedEvents" :key="e.ref || i" as="button" type="button" class="cal-ev"
              :style="{ '--c': e.color }" :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }"
              :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.99 }" @click="goFor(e)">
              <span class="cal-ev-rail" aria-hidden="true" />
              <span class="cal-ev-ic"><component :is="iconFor(e)" :size="15" /></span>
              <div class="cal-ev-body">
                <span class="cal-ev-title">{{ e.title }}</span>
                <span class="cal-ev-meta"><span class="cal-ev-avatar">{{ initials(e.employee_name) }}</span>{{ e.employee_name || 'Unassigned' }}</span>
              </div>
              <span class="cal-ev-pill">{{ e.statusLabel }}</span>
            </Motion>
          </TransitionGroup>
          <div v-else class="cal-day-empty">
            <CalendarCheck :size="22" />
            <span>Nothing scheduled.</span>
          </div>
        </section>
      </aside>
    </div>

    <!-- hover tooltip -->
    <CalEventTooltip :show="tip.show" :day-key="tip.dayKey" :events="tip.events" :style="tip.style" :placement="tip.placement" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange, CalendarCheck, CalendarX2,
  Award, GraduationCap, AlertTriangle, BadgeCheck, Crosshair, LayoutGrid, GanttChartSquare,
  Activity, ArrowUpRight, Layers,
} from 'lucide-vue-next'
import TrnCountUp from '../components/TrnCountUp.vue'
import CalEventTooltip from '../components/CalEventTooltip.vue'
import { fetchTrainingCalendar } from '@/composables/useTraining'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const emit = defineEmits(['go'])
const toast = useToast()
const reduced = prefersReduced()

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const cmdRef = ref(null)
usePointerSpotlight(cmdRef)
const pulseRef = ref(null)
const { visible: pulseIn } = useInView(pulseRef, { threshold: 0.3 })

const cursor = ref(new Date())
const events = ref([])
const loading = ref(true)
const view = ref('month')
const dir = ref(1)
const typeFilter = ref('all')

// ── local-date ISO (avoid UTC roll-back in IST etc.) ──────────────────────────
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayKey = iso(new Date())
const selectedKey = ref(todayKey)
const monthKey = computed(() => `${cursor.value.getFullYear()}-${cursor.value.getMonth()}`)
const isCurrentMonth = computed(() => cursor.value.getMonth() === new Date().getMonth() && cursor.value.getFullYear() === new Date().getFullYear())

const gridStart = computed(() => {
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
  const s = new Date(first); s.setDate(first.getDate() - first.getDay())
  return s
})

// ── decorate events with tone + labels ────────────────────────────────────────
const decorate = (e) => {
  const isCert = e.type === 'cert_expiry'
  let color, statusLabel
  if (e.status === 'overdue') { color = 'var(--trn-st-failed)'; statusLabel = 'Overdue' }
  else if (e.status === 'done') { color = 'var(--trn-st-completed)'; statusLabel = 'Completed' }
  else if (e.status === 'soon') { color = 'var(--trn-amber-strong)'; statusLabel = 'Due soon' }
  else { color = isCert ? 'var(--trn-ember)' : 'var(--trn-amber)'; statusLabel = isCert ? 'Expiring' : 'Due' }
  return { ...e, color, statusLabel, typeLabel: isCert ? 'Certification' : 'Training', kind: isCert ? 'cert' : 'due' }
}
const decorated = computed(() => events.value.map(decorate))

const filteredEvents = computed(() => {
  if (typeFilter.value === 'all') return decorated.value
  if (typeFilter.value === 'overdue') return decorated.value.filter(e => e.status === 'overdue')
  return decorated.value.filter(e => e.type === typeFilter.value)
})
const eventsByDay = computed(() => {
  const map = {}
  for (const e of filteredEvents.value) (map[e.date] ||= []).push(e)
  return map
})

const cells = computed(() => {
  const out = []
  const m = cursor.value.getMonth()
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.value); d.setDate(gridStart.value.getDate() + i)
    const key = iso(d)
    out.push({ key, day: d.getDate(), inMonth: d.getMonth() === m, isToday: key === todayKey, events: eventsByDay.value[key] || [] })
  }
  return out
})

// ── stats / filters ───────────────────────────────────────────────────────────
const countType = (t) => decorated.value.filter(e => e.type === t).length
const countOverdue = computed(() => decorated.value.filter(e => e.status === 'overdue').length)
const stats = computed(() => [
  { key: 'all', filter: 'all', label: 'All events', value: decorated.value.length, icon: Layers, color: 'var(--trn-amber)' },
  { key: 'due', filter: 'training_due', label: 'Training due', value: countType('training_due'), icon: GraduationCap, color: 'var(--trn-amber-strong)' },
  { key: 'cert', filter: 'cert_expiry', label: 'Cert expiry', value: countType('cert_expiry'), icon: Award, color: 'var(--trn-ember)' },
  { key: 'over', filter: 'overdue', label: 'Overdue', value: countOverdue.value, icon: AlertTriangle, color: 'var(--trn-st-failed)' },
])
const filterLabel = computed(() => ({ all: 'events', training_due: 'training due-dates', cert_expiry: 'certificate expiries', overdue: 'overdue items' }[typeFilter.value]))
const toggleFilter = (f) => { typeFilter.value = (typeFilter.value === f || f === 'all') ? 'all' : f; hideTip() }

// ── month composition segments ─────────────────────────────────────────────────
const segCounts = computed(() => {
  const s = { overdue: 0, training: 0, cert: 0, done: 0 }
  for (const e of decorated.value) {
    if (e.status === 'overdue') s.overdue++
    else if (e.status === 'done') s.done++
    else if (e.type === 'cert_expiry') s.cert++
    else s.training++
  }
  return s
})
const segments = computed(() => {
  const s = segCounts.value
  const total = s.overdue + s.training + s.cert + s.done || 1
  return [
    { key: 'overdue', label: 'Overdue', value: s.overdue, color: 'var(--trn-st-failed)' },
    { key: 'training', label: 'Training due', value: s.training, color: 'var(--trn-amber)' },
    { key: 'cert', label: 'Cert expiry', value: s.cert, color: 'var(--trn-ember)' },
    { key: 'done', label: 'Completed', value: s.done, color: 'var(--trn-st-completed)' },
  ].map(seg => ({ ...seg, pct: (seg.value / total) * 100 }))
})

// ── selected day ────────────────────────────────────────────────────────────────
const selectedEvents = computed(() => eventsByDay.value[selectedKey.value] || [])
const selectedLabel = computed(() => {
  const d = new Date(selectedKey.value + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
})
const relInfo = (key) => {
  const d = new Date(key + 'T00:00:00'); const t = new Date(); t.setHours(0, 0, 0, 0)
  const diff = Math.round((d - t) / 86400000)
  let label, tone
  if (diff === 0) { label = 'Today'; tone = 'now' }
  else if (diff === 1) { label = 'Tomorrow'; tone = 'future' }
  else if (diff === -1) { label = 'Yesterday'; tone = 'past' }
  else if (diff > 0) { label = `In ${diff} days`; tone = 'future' }
  else { label = `${-diff} days ago`; tone = 'past' }
  return { label, tone, diff }
}
const selectedRel = computed(() => relInfo(selectedKey.value).label)
const selectedRelTone = computed(() => relInfo(selectedKey.value).tone)

// ── agenda groups ─────────────────────────────────────────────────────────────
const agendaGroups = computed(() => {
  const map = {}
  for (const e of filteredEvents.value) (map[e.date] ||= []).push(e)
  return Object.keys(map).sort().map(key => {
    const d = new Date(key + 'T00:00:00'); const r = relInfo(key)
    return { key, dnum: d.getDate(), dow: WEEKDAYS[d.getDay()], isToday: key === todayKey, isPast: r.diff < 0, relLabel: r.label, relTone: r.tone, events: map[key] }
  })
})

// ── load ────────────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  try {
    const end = new Date(gridStart.value); end.setDate(gridStart.value.getDate() + 41)
    const data = await fetchTrainingCalendar({ from: iso(gridStart.value), to: iso(end) })
    events.value = data.events || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load calendar') }
  finally { loading.value = false }
}
onMounted(load)

const shift = (n) => { dir.value = n; cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + n, 1); hideTip(); load() }
const goToday = () => { dir.value = isCurrentMonth.value ? 1 : (cursor.value > new Date() ? -1 : 1); cursor.value = new Date(); selectedKey.value = todayKey; hideTip(); load() }
const setView = (v) => { view.value = v; hideTip() }
const select = (cell) => { selectedKey.value = cell.key }
const goFor = (e) => emit('go', e.type === 'cert_expiry' ? 'certification-expiry' : 'enrollment')

const iconFor = (e) => e.status === 'overdue' ? AlertTriangle : e.status === 'done' ? BadgeCheck : e.type === 'cert_expiry' ? Award : GraduationCap
const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'

// ── hover tooltip ───────────────────────────────────────────────────────────────
const tip = reactive({ show: false, dayKey: '', events: [], style: {}, placement: 'right' })
const showTip = (ev, cell) => {
  const evs = cell.events
  if (!evs.length || !ev.currentTarget) { hideTip(); return }
  const r = ev.currentTarget.getBoundingClientRect()
  const W = 290, GAP = 12
  const toRight = r.right + GAP + W <= window.innerWidth - 8
  const placement = toRight ? 'right' : 'left'
  const left = toRight ? r.right + GAP : Math.max(8, r.left - GAP - W)
  const estH = Math.min(380, 96 + Math.min(evs.length, 6) * 48 + (evs.length > 6 ? 26 : 0))
  const top = Math.min(Math.max(r.top + r.height / 2 - estH / 2, 12), window.innerHeight - estH - 12)
  tip.style = { left: `${left}px`, top: `${Math.max(12, top)}px` }
  tip.placement = placement
  tip.dayKey = cell.key
  tip.events = evs
  tip.show = true
}
const hideTip = () => { tip.show = false }
const onScroll = () => { if (tip.show) hideTip() }
onMounted(() => window.addEventListener('scroll', onScroll, true))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll, true))
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* ── command bar ── */
.cal-cmd { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; justify-content: space-between;
  gap: 18px; flex-wrap: wrap; padding: 18px 22px; border-radius: 20px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.cal-cmd-aurora { position: absolute; inset: -50% -20% auto -20%; height: 120%; z-index: 0; pointer-events: none;
  background: radial-gradient(50% 70% at 18% 0%, color-mix(in srgb, var(--trn-amber) 20%, transparent), transparent 60%),
    radial-gradient(50% 70% at 82% 10%, color-mix(in srgb, var(--trn-ember) 12%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.8; animation: cal-drift 18s ease-in-out infinite alternate; }
.cal-cmd-lead, .cal-cmd-right { position: relative; z-index: 1; }
.cal-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.cal-eyebrow :deep(svg) { color: var(--trn-amber); }
.cal-monthnav { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.cal-nav-btn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 11px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer;
  transition: all 0.22s var(--trn-spring); }
.cal-nav-btn:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); transform: translateY(-1px); }
.cal-month { margin: 0; min-width: 184px; font-size: 28px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 40%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cal-month i { font-style: normal; font-weight: 400; opacity: 0.7; }
.cal-today { display: inline-flex; align-items: center; gap: 6px; margin-left: 4px; font: inherit; font-size: 12px; font-weight: 600;
  padding: 8px 13px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--trn-amber) 38%, transparent);
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); color: var(--trn-amber-strong); cursor: pointer; transition: all 0.2s; }
.cal-today :deep(svg) { color: var(--trn-amber); }
.cal-today:hover { background: color-mix(in srgb, var(--trn-amber) 20%, transparent); }
.cal-today.off { opacity: 0.65; border-color: var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); }
.cal-today.off :deep(svg) { color: var(--trn-text-dim); }

.cal-seg { position: relative; display: inline-flex; padding: 4px; border-radius: 13px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.cal-seg-pill { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 10px;
  background: var(--hr-gradient-hero, linear-gradient(120deg, var(--trn-amber), var(--trn-ember))); box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--trn-amber) 70%, transparent);
  transform: translateX(calc(var(--i) * 100%)); transition: transform 0.4s var(--trn-spring); }
.cal-seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12.5px; font-weight: 650;
  padding: 8px 16px; border: 0; background: transparent; color: var(--trn-text-muted); cursor: pointer; transition: color 0.25s; white-space: nowrap; }
.cal-seg-btn.on { color: #1a1206; }
[data-theme="light"] .cal-seg-btn.on { color: #2a1a06; }

/* ── stat capsules ── */
.cal-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.cal-stat { position: relative; display: flex; align-items: center; gap: 12px; padding: 13px 16px; text-align: left; font: inherit; overflow: hidden;
  border-radius: 16px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); cursor: pointer;
  transition: border-color 0.25s, box-shadow 0.25s; }
.cal-stat:hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.cal-stat.on { border-color: color-mix(in srgb, var(--c) 60%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--trn-surface-elevated)); }
.cal-stat-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.cal-stat.on .cal-stat-ic { box-shadow: 0 0 16px -3px var(--c); }
.cal-stat-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cal-stat-val { font-family: var(--trn-mono); font-size: 24px; font-weight: 850; line-height: 1; color: var(--trn-text); }
.cal-stat-lab { font-size: 11px; color: var(--trn-text-muted); }
.cal-stat-glow { position: absolute; right: -30px; top: -30px; width: 90px; height: 90px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%); opacity: 0; transition: opacity 0.3s; }
.cal-stat:hover .cal-stat-glow, .cal-stat.on .cal-stat-glow { opacity: 1; }

/* ── layout ── */
.cal-wrap { display: grid; grid-template-columns: 1fr 312px; gap: 14px; align-items: start; }
.cal-main { padding: 16px 18px; min-height: 560px; }
.cal-legend { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; font-size: 11px; color: var(--trn-text-muted); }
.cal-legend span { display: inline-flex; align-items: center; gap: 6px; }
.cal-legend .d { width: 9px; height: 9px; border-radius: 3px; }
.d.due { background: var(--trn-amber); } .d.cert { background: var(--trn-ember); }
.d.soon { background: var(--trn-amber-strong); } .d.over { background: var(--trn-st-failed); } .d.done { background: var(--trn-st-completed); }

.cal-skel, .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-dow { text-align: center; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--trn-text-dim); padding-bottom: 6px; }

.cal-cell { position: relative; min-height: 92px; padding: 8px; border-radius: 13px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 6px; overflow: hidden;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; }
.cal-cell:hover { border-color: color-mix(in srgb, var(--trn-amber) 42%, transparent); box-shadow: var(--trn-card-shadow-hover); z-index: 2; }
.cal-cell.has { background: var(--trn-surf-card); }
.cal-cell.sel { border-color: color-mix(in srgb, var(--trn-amber) 60%, transparent); background: color-mix(in srgb, var(--trn-amber) 11%, transparent); }
.cal-cell.today { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); }
.cc-top { display: flex; align-items: center; justify-content: space-between; }
.cc-num { font-size: 13px; font-weight: 700; color: var(--trn-text-secondary); }
.cal-cell.today .cc-num { color: var(--trn-amber-strong); }
.cc-today-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-amber); box-shadow: 0 0 8px var(--trn-amber); }
.cc-today-ring { position: absolute; inset: 0; border-radius: 13px; border: 1.5px solid var(--trn-amber); pointer-events: none;
  animation: cc-pulse 2.6s ease-in-out infinite; }
/* outward box-shadow would be clipped by the cell's overflow:hidden — pulse via opacity + inset glow */
.cc-chips { display: flex; flex-direction: column; gap: 3px; }
.cc-chip { display: flex; align-items: center; gap: 5px; padding: 2px 6px; border-radius: 6px; max-width: 100%;
  background: color-mix(in srgb, var(--c) 14%, transparent); border-left: 2px solid var(--c); animation: cc-chip-in 0.4s var(--trn-spring) backwards; }
.cc-chip-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
.cc-chip-txt { font-size: 10px; font-weight: 600; color: var(--trn-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-more { font-size: 9.5px; font-weight: 600; color: var(--trn-text-dim); padding-left: 2px; }

/* ── agenda / timeline ── */
.cal-agenda { position: relative; padding: 4px 0 4px 4px; }
.cal-agenda::before { content: ''; position: absolute; left: 24px; top: 14px; bottom: 14px; width: 2px; border-radius: 2px;
  background: linear-gradient(180deg, var(--trn-amber), color-mix(in srgb, var(--trn-ember) 50%, transparent), transparent); }
.ag-group { position: relative; display: flex; gap: 16px; padding: 8px 0 18px; }
.ag-node { position: relative; z-index: 1; flex-shrink: 0; width: 40px; display: flex; flex-direction: column; align-items: center; gap: 1px; }
.ag-node .ag-dnum { font-size: 17px; font-weight: 850; color: var(--trn-text); line-height: 1; }
.ag-node .ag-dow { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--trn-text-dim); }
.ag-pip { position: absolute; left: 50%; top: -10px; width: 11px; height: 11px; border-radius: 50%; transform: translateX(-50%);
  background: var(--trn-surface-elevated); border: 2px solid var(--trn-border-strong); }
.ag-node.today .ag-dnum { color: var(--trn-amber-strong); }
.ag-node.today .ag-pip { background: var(--trn-amber); border-color: var(--trn-amber); box-shadow: 0 0 0 4px color-mix(in srgb, var(--trn-amber) 22%, transparent); }
.ag-node.past { opacity: 0.7; }
.ag-content { flex: 1; min-width: 0; }
.ag-rel { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 9px; border-radius: 999px; margin-bottom: 8px; }
.ag-rel.now { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 16%, transparent); }
.ag-rel.future { color: var(--trn-text-muted); background: var(--trn-surface); }
.ag-rel.past { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.ag-events { display: flex; flex-direction: column; gap: 8px; }
.cal-agenda-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; text-align: center;
  color: var(--trn-text-muted); }
.cal-agenda-empty :deep(svg) { color: var(--trn-text-dim); }
.cal-agenda-empty p { margin: 0; font-size: 13px; }

/* ── shared event card ── */
.cal-ev { position: relative; display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; font: inherit; cursor: pointer;
  padding: 11px 12px 11px 15px; border-radius: 13px; border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card);
  overflow: hidden; transition: border-color 0.25s, box-shadow 0.25s; }
.cal-ev:hover { border-color: color-mix(in srgb, var(--c) 40%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.cal-ev-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); }
.cal-ev-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.cal-ev-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cal-ev-title { font-size: 13px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal-ev-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--trn-text-muted); min-width: 0; }
.cal-ev-avatar { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 8.5px; font-weight: 700; color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.cal-ev-pill { font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; flex-shrink: 0; white-space: nowrap;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.cal-ev-go { color: var(--trn-text-dim); flex-shrink: 0; transition: color 0.2s, transform 0.2s; }
.cal-ev:hover .cal-ev-go { color: var(--c); transform: translate(2px, -2px); }

/* ── rail ── */
.cal-rail { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }
.cal-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.cal-card-head h3 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; font-weight: 750; color: var(--trn-text); }
.cal-card-head h3 :deep(svg) { color: var(--trn-amber-strong); }
.cal-card-sub { font-size: 11px; color: var(--trn-text-dim); }

.cal-pulse { padding: 16px 18px; }
.cal-pulse-total { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.cal-pulse-num { font-size: 30px; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); }
.cal-pulse-lab { font-size: 11px; color: var(--trn-text-muted); }
.cal-pulse-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.cal-pulse-seg { height: 100%; width: 0; transition: width 1s var(--trn-spring); }
.cal-pulse-seg:not(:last-child) { border-right: 2px solid var(--trn-canvas); }
.cal-pulse-empty { flex: 1; background: linear-gradient(90deg, var(--trn-border-soft), transparent); }
.cal-pulse-legend { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.cal-pulse-legend li { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.cps-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.cps-lab { flex: 1; color: var(--trn-text-secondary); }
.cps-n { font-weight: 700; color: var(--trn-text); }

.cal-day { padding: 16px 18px; }
.cal-day-rel { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.cal-day-rel.now { color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 16%, transparent); }
.cal-day-rel.future { color: var(--trn-text-muted); background: var(--trn-surface); }
.cal-day-rel.past { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.cal-day-list { display: flex; flex-direction: column; gap: 8px; }
.cal-day-empty { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 30px 16px; text-align: center;
  font-size: 12.5px; color: var(--trn-text-dim); }
.cal-day-empty :deep(svg) { color: var(--trn-text-dim); opacity: 0.7; }

/* list transitions */
.trn-list-move { transition: transform 0.4s var(--trn-spring); }
.trn-list-enter-active { transition: all 0.4s var(--trn-spring); }
.trn-list-leave-active { transition: all 0.3s var(--trn-spring); position: absolute; }
.trn-list-enter-from { opacity: 0; transform: translateX(12px); }
.trn-list-leave-to { opacity: 0; transform: scale(0.96); }

@keyframes cal-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes cc-pulse { 0%, 100% { opacity: 0.95; box-shadow: inset 0 0 13px -5px var(--trn-amber); } 50% { opacity: 0.4; box-shadow: inset 0 0 5px -5px var(--trn-amber); } }
@keyframes cc-chip-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }

@media (max-width: 900px) {
  .cal-wrap { grid-template-columns: 1fr; }
  .cal-rail { position: static; }
  .cal-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 540px) {
  .cal-stats { grid-template-columns: 1fr; }
  .cal-month { font-size: 23px; min-width: 0; }
  .cal-cell { min-height: 64px; }
  .cc-chip-txt { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cal-cmd-aurora, .cc-today-ring, .cc-chip { animation: none !important; }
  .cal-pulse-seg, .cal-seg-pill { transition: none !important; }
}
</style>
