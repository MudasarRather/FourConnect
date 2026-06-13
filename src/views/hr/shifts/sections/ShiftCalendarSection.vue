<template>
  <section class="cal">
    <Motion as="header" class="cal-head" :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45 }">
      <div class="ch-left">
        <span class="eyebrow"><CalendarDays :size="12" /> Shift Calendar</span>
        <div class="ch-nav">
          <button @click="shiftMonth(-1)"><ChevronLeft :size="16" /></button>
          <h2>{{ monthLabel }}</h2>
          <button @click="shiftMonth(1)"><ChevronRight :size="16" /></button>
          <button class="today-btn" @click="goToday">Today</button>
        </div>
      </div>
      <div class="ch-right">
        <select v-model="deptFilter" class="cal-select" @change="reload">
          <option value="">All departments</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <div class="cal-body">
      <div class="cal-grid-wrap">
        <div class="dow-head"><span v-for="d in DOW_FULL" :key="d">{{ d }}</span></div>
        <div class="cal-grid">
          <span v-for="b in leadingBlanks" :key="'b'+b" class="cell empty" />
          <Motion v-for="(day, i) in monthDays" :key="day.date" as="button" class="cell"
            :class="{ today: day.date === todayStr, weekend: day.weekday >= 5, holiday: day.is_holiday, active: selected === day.date }"
            :initial="{ opacity: 0, scale: 0.96 }" :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.25, delay: Math.min(i * 0.008, 0.25) }"
            @click="select(day)">
            <span class="cell-top">
              <span class="cell-num">{{ dayNum(day.date) }}</span>
              <span v-if="day.count" class="cell-badge">{{ day.count }}</span>
            </span>
            <span v-if="day.is_holiday" class="cell-hol" :title="day.holiday_name"><Palmtree :size="9" />{{ day.holiday_name }}</span>
            <span class="cell-dots">
              <span v-for="(t, ti) in typeDots(day)" :key="ti" class="cdot" :style="{ background: t.color }" :title="`${t.label}: ${t.count}`" />
            </span>
          </Motion>
        </div>
      </div>

      <aside class="cal-detail">
        <div v-if="selectedDay">
          <h3>{{ prettyDate(selectedDay.date) }}</h3>
          <span v-if="selectedDay.is_holiday" class="detail-hol"><Palmtree :size="12" /> {{ selectedDay.holiday_name }}</span>
          <div v-if="selectedDay.assignments.length" class="detail-list">
            <div v-for="(a, i) in selectedDay.assignments" :key="i" class="detail-row">
              <span class="dr-dot" :style="{ background: shiftTypeMeta(a.shift_type).color }" />
              <div class="dr-meta"><b>{{ a.employee_name || '—' }}</b><small>{{ a.shift_name }} · {{ shortTime(a.start_time) }}–{{ shortTime(a.end_time) }}</small></div>
            </div>
          </div>
          <p v-else class="detail-empty">No one scheduled on this day.</p>
        </div>
        <div v-else class="detail-hint"><CalendarDays :size="22" /><p>Select a day to see who's on shift.</p></div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Palmtree } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchShiftCalendar, fetchDepartments, shiftTypeMeta, shortTime, DOW_FULL } from '@/composables/useShifts'

const toast = useToast()
const cursor = ref(new Date())
const days = ref([])
const departments = ref([])
const deptFilter = ref('')
const loading = ref(false)
const selected = ref('')

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = iso(new Date())

const monthLabel = computed(() => cursor.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))
const firstOfMonth = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1))
const lastOfMonth = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 0))
const leadingBlanks = computed(() => (firstOfMonth.value.getDay() + 6) % 7) // Monday-based
const monthDays = computed(() => days.value)
const selectedDay = computed(() => days.value.find(d => d.date === selected.value) || null)

const dayNum = (dstr) => Number(dstr.split('-')[2])
const prettyDate = (dstr) => new Date(dstr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

const typeDots = (day) => {
  const map = {}
  for (const a of day.assignments) {
    const t = a.shift_type || 'GENERAL'
    map[t] = (map[t] || 0) + 1
  }
  return Object.entries(map).slice(0, 4).map(([t, count]) => ({ label: shiftTypeMeta(t).label, color: shiftTypeMeta(t).color, count }))
}

const reload = async () => {
  loading.value = true
  try {
    const params = { from: iso(firstOfMonth.value), to: iso(lastOfMonth.value) }
    if (deptFilter.value) params.department_id = deptFilter.value
    const data = await fetchShiftCalendar(params)
    days.value = data.days || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load calendar')
    days.value = []
  } finally { loading.value = false }
}

const shiftMonth = (delta) => {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
  selected.value = ''
  reload()
}
const goToday = () => { cursor.value = new Date(); selected.value = todayStr; reload() }
const select = (day) => { selected.value = day.date }

onMounted(async () => {
  try { departments.value = await fetchDepartments() } catch { /* optional */ }
  await reload()
})
</script>

<style scoped>
.cal { display: flex; flex-direction: column; gap: 16px; }
.cal-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.ch-nav { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.ch-nav h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--shift-text); min-width: 180px; }
.ch-nav button { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); cursor: pointer; display: grid; place-items: center; }
.ch-nav button:hover { border-color: var(--shift-border); color: var(--shift-amber); }
.today-btn { width: auto !important; padding: 0 12px; font-size: 12px; font-weight: 600; }
.ch-right { display: flex; align-items: center; gap: 8px; }
.cal-select { padding: 8px 12px; border-radius: 9px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; }
.btn-ghost { width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); cursor: pointer; display: grid; place-items: center; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.cal-body { display: grid; grid-template-columns: 1fr 280px; gap: 16px; }
@media (max-width: 920px) { .cal-body { grid-template-columns: 1fr; } }
.cal-grid-wrap { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 14px; }
.dow-head { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 8px; }
.dow-head span { text-align: center; font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cell { aspect-ratio: 1 / 0.92; border-radius: 11px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); padding: 6px 7px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; text-align: left; transition: 0.15s; overflow: hidden; }
.cell:hover { border-color: var(--shift-border); transform: translateY(-1px); }
.cell.empty { background: transparent; border: 0; cursor: default; }
.cell.weekend { background: rgba(148,163,184,0.05); }
.cell.today { border-color: var(--shift-amber); box-shadow: inset 0 0 0 1px var(--shift-amber); }
.cell.holiday { background: var(--shift-warn-soft); }
.cell.active { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.cell-top { display: flex; align-items: center; justify-content: space-between; }
.cell-num { font-family: var(--shift-mono); font-size: 12px; font-weight: 700; color: var(--shift-text-2); }
.cell.today .cell-num { color: var(--shift-amber); }
.cell-badge { font-family: var(--shift-mono); font-size: 9px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: rgba(251,191,36,0.18); color: var(--shift-amber); display: grid; place-items: center; }
.cell-hol { display: inline-flex; align-items: center; gap: 3px; font-size: 8px; color: var(--shift-ember-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-dots { margin-top: auto; display: flex; gap: 3px; }
.cdot { width: 6px; height: 6px; border-radius: 50%; }

.cal-detail { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 18px; min-height: 200px; }
.cal-detail h3 { margin: 0 0 8px; font-size: 14px; color: var(--shift-text); }
.detail-hol { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-ember-strong); background: var(--shift-warn-soft); padding: 3px 9px; border-radius: 999px; margin-bottom: 10px; }
.detail-list { display: flex; flex-direction: column; gap: 9px; margin-top: 8px; max-height: 420px; overflow-y: auto; }
.detail-row { display: flex; align-items: center; gap: 9px; }
.dr-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dr-meta { display: flex; flex-direction: column; min-width: 0; }
.dr-meta b { font-size: 12.5px; color: var(--shift-text); }
.dr-meta small { font-size: 10.5px; color: var(--shift-text-muted); }
.detail-empty { color: var(--shift-text-dim); font-size: 12.5px; }
.detail-hint { display: grid; place-items: center; gap: 8px; height: 100%; color: var(--shift-text-dim); text-align: center; }
.detail-hint p { margin: 0; font-size: 12.5px; }
</style>
