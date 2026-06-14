<template>
  <section class="calx">
    <!-- ════════ TEMPORAL CONSOLE ════════ -->
    <Motion as="header" class="console" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
      <span class="console-aurora" aria-hidden="true" />
      <span class="console-rings" aria-hidden="true" />
      <span class="console-scan" aria-hidden="true" />

      <div class="console-top">
        <div class="console-id">
          <span class="eyebrow"><span class="eyebrow-dot" /> Temporal map · live</span>
          <div class="month-nav">
            <button class="nav-btn" title="Previous month" @click="shiftMonth(-1)"><ChevronLeft :size="17" /></button>
            <transition :name="`mlabel-${slideDir}`" mode="out-in">
              <h2 :key="monthKey" class="month-label">{{ monthLabel }}</h2>
            </transition>
            <button class="nav-btn" title="Next month" @click="shiftMonth(1)"><ChevronRight :size="17" /></button>
            <button class="today-btn" v-magnetic="{ strength: 0.2 }" @click="goToday"><Sparkles :size="12" /> Today</button>
          </div>
          <p class="console-sub">A live density map of who's on shift — brighter cells carry more crew. Click any day to open its roster.</p>
        </div>

        <div class="console-side">
          <div class="live-clock"><span class="lc-dot" /><span class="lc-time">{{ clock }}</span></div>
          <div class="console-actions">
            <select v-model="deptFilter" class="cal-select" @change="reload">
              <option value="">All departments</option>
              <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="15" /></button>
          </div>
        </div>
      </div>

      <!-- KPI ribbon -->
      <div class="kpi-ribbon">
        <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :data-tone="k.tone"
          :initial="{ opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.12 + i * 0.07, ease: [0.16,1,0.3,1] }" :whileHover="{ y: -3 }">
          <span class="kpi-spark" aria-hidden="true" />
          <div class="kpi-ico"><component :is="k.icon" :size="16" /></div>
          <div class="kpi-body">
            <div class="kpi-val"><ShiftCountUp :value="k.value" /></div>
            <div class="kpi-label">{{ k.label }}</div>
          </div>
        </Motion>
      </div>
    </Motion>

    <div class="calx-body">
      <!-- ════════ HEATMAP MONTH GRID ════════ -->
      <div class="grid-card">
        <div class="dow-head"><span v-for="d in DOW_FULL" :key="d">{{ d }}</span></div>

        <transition :name="`cgrid-${slideDir}`" mode="out-in">
          <div class="cal-grid" :key="monthKey">
            <span v-for="b in leadingBlanks" :key="'b'+b" class="cell empty" aria-hidden="true" />
            <Motion v-for="(day, i) in monthDays" :key="day.date" as="button" type="button" class="cell"
              :class="{ today: day.date === todayStr, weekend: isWeekend(day.date), holiday: day.is_holiday, active: selected === day.date, dim: !day.count && !day.is_holiday }"
              :style="{ '--lvl': intensity(day) }"
              :initial="{ opacity: 0, scale: 0.9, y: 8 }" :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: Math.min(i * 0.012, 0.34), ease: [0.16,1,0.3,1] }"
              :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.97 }"
              @click="select(day)">
              <span class="cell-heat" aria-hidden="true" />
              <span v-if="day.date === todayStr" class="cell-pulse" aria-hidden="true" />
              <span class="cell-top">
                <span class="cell-num">{{ dayNum(day.date) }}</span>
                <span v-if="day.count" class="cell-badge">{{ day.count }}</span>
              </span>
              <span v-if="day.is_holiday" class="cell-hol" :title="day.holiday_name"><Palmtree :size="9" />{{ day.holiday_name }}</span>
              <span class="cell-dots">
                <span v-for="(t, ti) in typeDots(day)" :key="ti" class="cdot" :style="{ background: t.color }" :title="`${t.label}: ${t.count}`" />
                <span v-if="day.week_off_count" class="cell-off" :title="`${day.week_off_count} on weekly off`"><Moon :size="9" />{{ day.week_off_count }}</span>
              </span>
            </Motion>
          </div>
        </transition>

        <!-- density legend -->
        <div class="legend">
          <span class="lg-label">Less</span>
          <span v-for="n in 5" :key="n" class="lg-sq" :style="{ '--lvl': (n - 1) / 4 }" />
          <span class="lg-label">More</span>
          <span class="lg-spacer" />
          <span class="lg-meta"><CalendarClock :size="11" /> {{ scheduledDays }} of {{ monthDays.length }} days staffed</span>
        </div>
      </div>

      <!-- ════════ DETAIL / AGENDA ════════ -->
      <aside class="calx-side">
        <transition name="side-swap" mode="out-in">
          <!-- selected day -->
          <div v-if="selectedDay" :key="selectedDay.date" class="side-day">
            <div class="sd-head">
              <div class="sd-date">
                <span class="sd-dow">{{ dowLabel(selectedDay.date) }}</span>
                <span class="sd-num">{{ dayNum(selectedDay.date) }}</span>
                <span class="sd-mon">{{ monLabel(selectedDay.date) }}</span>
              </div>
              <div class="sd-dial" :title="`${selectedDay.count} on shift`">
                <svg viewBox="0 0 44 44">
                  <circle class="dial-bg" cx="22" cy="22" r="18" />
                  <circle class="dial-fg" cx="22" cy="22" r="18" :style="{ strokeDasharray: dialDash(selectedDay.count) }" />
                </svg>
                <span class="dial-num"><ShiftCountUp :value="selectedDay.count" :duration="600" /></span>
              </div>
            </div>
            <span v-if="selectedDay.is_holiday" class="sd-hol"><Palmtree :size="12" /> {{ selectedDay.holiday_name }}</span>

            <div v-if="groups.length" class="sd-groups">
              <Motion v-for="(g, gi) in groups" :key="g.key" as="div" class="sd-group"
                :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: gi * 0.05 }">
                <div class="sg-head" :style="{ '--c': g.color }">
                  <span class="sg-dot" /><b>{{ g.shift_name }}</b><span class="sg-time mono">{{ shortTime(g.start_time) }}–{{ shortTime(g.end_time) }}</span><span class="sg-count">{{ g.rows.length }}</span>
                </div>
                <div class="sg-rows">
                  <Motion v-for="(a, ai) in g.rows" :key="ai" as="div" class="sg-row"
                    :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.26, delay: gi * 0.05 + ai * 0.03 }">
                    <span class="sg-av" :style="{ '--c': g.color }">{{ initials(a.employee_name) }}</span>
                    <span class="sg-name">{{ a.employee_name || 'Employee' }}</span>
                  </Motion>
                </div>
              </Motion>
            </div>
            <div v-if="holidayOff.length" class="sd-off sd-hol-off">
              <div class="sd-off-head"><Palmtree :size="12" /> On holiday · resting · {{ holidayOff.length }}</div>
              <div class="sd-off-list">
                <Motion v-for="(a, i) in holidayOff" :key="'h'+i" as="span" class="sd-off-chip"
                  :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.25, delay: i * 0.025 }"
                  :title="a.shift_name ? `Normally on ${a.shift_name}` : ''">
                  <span class="off-av">{{ initials(a.employee_name) }}</span>{{ a.employee_name || 'Employee' }}
                </Motion>
              </div>
            </div>
            <div v-if="weekOff.length" class="sd-off">
              <div class="sd-off-head"><Moon :size="12" /> On weekly off · {{ weekOff.length }}</div>
              <div class="sd-off-list">
                <Motion v-for="(a, i) in weekOff" :key="i" as="span" class="sd-off-chip"
                  :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.25, delay: i * 0.025 }"
                  :title="a.shift_name ? `Off from ${a.shift_name}` : ''">
                  <span class="off-av">{{ initials(a.employee_name) }}</span>{{ a.employee_name || 'Employee' }}
                </Motion>
              </div>
            </div>
            <p v-if="!groups.length && !weekOff.length && !holidayOff.length" class="sd-empty"><Users :size="14" /> No one scheduled or resting on this day.</p>
          </div>

          <!-- agenda (no selection) -->
          <div v-else key="agenda" class="side-agenda">
            <div class="sa-head"><CalendarClock :size="13" /> Upcoming this month</div>
            <div v-if="upcoming.length" class="sa-list">
              <Motion v-for="(day, i) in upcoming" :key="day.date" as="button" type="button" class="sa-item"
                :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: i * 0.05 }"
                :whileHover="{ x: 3 }" @click="select(day)">
                <span class="sa-when"><b>{{ dayNum(day.date) }}</b><small>{{ dowLabel(day.date) }}</small></span>
                <span class="sa-bar"><span class="sa-fill" :style="{ width: (intensity(day) * 100) + '%' }" /></span>
                <span class="sa-dots"><span v-for="(t, ti) in typeDots(day)" :key="ti" class="cdot" :style="{ background: t.color }" /></span>
                <span class="sa-count">{{ day.count }}</span>
              </Motion>
            </div>
            <div v-else class="sa-empty"><CalendarDays :size="22" /><p>Nothing scheduled ahead this month. Pick a day to inspect.</p></div>
          </div>
        </transition>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Palmtree, Sparkles,
  Users, CalendarClock, CalendarCheck, Flame, Moon,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import { fetchShiftCalendar, fetchDepartments, shiftTypeMeta, shortTime, DOW_FULL } from '@/composables/useShifts'

const toast = useToast()
const cursor = ref(new Date())
const days = ref([])
const departments = ref([])
const deptFilter = ref('')
const loading = ref(false)
const selected = ref('')
const slideDir = ref('fwd')

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = iso(new Date())

/* live clock */
const clock = ref('--:--:--')
let clockTimer = null
const tick = () => { clock.value = new Date().toLocaleTimeString(undefined, { hour12: false }) }

const monthKey = computed(() => `${cursor.value.getFullYear()}-${cursor.value.getMonth()}`)
const monthLabel = computed(() => cursor.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))
const firstOfMonth = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1))
const lastOfMonth = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 0))
const leadingBlanks = computed(() => (firstOfMonth.value.getDay() + 6) % 7) // Monday-based
const monthDays = computed(() => days.value)
const selectedDay = computed(() => days.value.find(d => d.date === selected.value) || null)

const dayNum = (dstr) => Number(dstr.split('-')[2])
const isWeekend = (dstr) => { const wd = new Date(dstr + 'T00:00:00').getDay(); return wd === 0 || wd === 6 }
const dowLabel = (dstr) => new Date(dstr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })
const monLabel = (dstr) => new Date(dstr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

/* heatmap intensity */
const maxCount = computed(() => Math.max(1, ...days.value.map(d => d.count || 0)))
const intensity = (day) => day.count ? +(day.count / maxCount.value).toFixed(3) : 0
const dialDash = (count) => { const C = 2 * Math.PI * 18; const frac = Math.min(1, (count || 0) / maxCount.value); return `${(C * frac).toFixed(1)} ${C.toFixed(1)}` }

/* KPIs */
const totalShifts = computed(() => days.value.reduce((a, d) => a + (d.count || 0), 0))
const scheduledDays = computed(() => days.value.filter(d => d.count > 0).length)
const holidayCount = computed(() => days.value.filter(d => d.is_holiday).length)
const peakCount = computed(() => Math.max(0, ...days.value.map(d => d.count || 0)))
const kpis = computed(() => [
  { key: 'tot', label: 'Shifts this month', value: totalShifts.value, icon: CalendarDays, tone: 'gold' },
  { key: 'days', label: 'Days staffed', value: scheduledDays.value, icon: CalendarCheck, tone: 'ok' },
  { key: 'peak', label: 'Peak day', value: peakCount.value, icon: Flame, tone: 'ember' },
  { key: 'hol', label: 'Holidays', value: holidayCount.value, icon: Palmtree, tone: 'gold' },
])

const typeDots = (day) => {
  const map = {}
  for (const a of (day.assignments || [])) {
    const t = a.shift_type || 'GENERAL'
    map[t] = (map[t] || 0) + 1
  }
  return Object.entries(map).slice(0, 4).map(([t, count]) => ({ label: shiftTypeMeta(t).label, color: shiftTypeMeta(t).color, count }))
}

/* group selected day's assignments by shift */
const groups = computed(() => {
  if (!selectedDay.value) return []
  const map = {}
  for (const a of (selectedDay.value.assignments || [])) {
    const key = a.shift_name || a.shift_type || 'Shift'
    if (!map[key]) map[key] = { key, shift_name: a.shift_name || shiftTypeMeta(a.shift_type).label, start_time: a.start_time, end_time: a.end_time, color: shiftTypeMeta(a.shift_type).color, rows: [] }
    map[key].rows.push(a)
  }
  return Object.values(map)
})

const weekOff = computed(() => selectedDay.value?.week_off || [])
/* assigned employees resting because the selected day is a holiday for them
   (and they have no explicit holiday-shift override) */
const holidayOff = computed(() => selectedDay.value?.holiday_off || [])

/* agenda — upcoming staffed days */
const upcoming = computed(() =>
  days.value.filter(d => d.date >= todayStr && d.count > 0).slice(0, 7))

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
  slideDir.value = delta > 0 ? 'fwd' : 'back'
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
  selected.value = ''
  reload()
}
const goToday = () => { slideDir.value = 'fwd'; cursor.value = new Date(); selected.value = todayStr; reload() }
const select = (day) => { selected.value = selected.value === day.date ? '' : day.date }

onMounted(async () => {
  tick(); clockTimer = setInterval(tick, 1000)
  try { departments.value = await fetchDepartments() } catch { /* optional */ }
  await reload()
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<style scoped>
.calx { display: flex; flex-direction: column; gap: 20px; }

/* ════════ CONSOLE ════════ */
.console { position: relative; overflow: hidden; padding: 22px 26px 20px; border-radius: 24px;
  background: var(--shift-surface); border: 1px solid var(--shift-border); backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.console-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: var(--shift-grad-hero), radial-gradient(80% 120% at 100% 0%, rgba(251,146,60,0.10), transparent 60%); background-size: 200% 200%; animation: hr-aurora 16s ease-in-out infinite; }
/* distinct identity: concentric "orbital" rings instead of the dot/line grids of other tabs */
.console-rings { position: absolute; top: -160px; right: -120px; width: 420px; height: 420px; pointer-events: none; z-index: 0; opacity: 0.5;
  background:
    radial-gradient(circle, transparent 38%, color-mix(in srgb, var(--shift-amber) 13%, transparent) 38.6%, transparent 39.4%),
    radial-gradient(circle, transparent 56%, color-mix(in srgb, var(--shift-amber) 10%, transparent) 56.6%, transparent 57.4%),
    radial-gradient(circle, transparent 74%, color-mix(in srgb, var(--shift-ember) 9%, transparent) 74.6%, transparent 75.4%);
  animation: rings-spin 60s linear infinite; mask-image: radial-gradient(60% 60% at 70% 30%, #000, transparent 80%); }
@keyframes rings-spin { to { transform: rotate(360deg); } }
.console-scan { position: absolute; left: 0; right: 0; top: 0; height: 32%; pointer-events: none; z-index: 1;
  background: linear-gradient(180deg, rgba(253,230,138,0.10), transparent); animation: shift-scanline 7s ease-in-out infinite; }

.console-top { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.console-id { min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 0 0 var(--shift-ok); animation: shift-ring-pulse 2.4s ease-out infinite; }
.month-nav { display: flex; align-items: center; gap: 10px; margin: 9px 0 5px; }
.month-label { margin: 0; font-size: 25px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); min-width: 215px; }
.nav-btn { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); cursor: pointer; display: grid; place-items: center; transition: 0.18s; }
.nav-btn:hover { border-color: var(--shift-border); color: var(--shift-amber); transform: translateY(-1px); }
.today-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 700;
  background: var(--shift-grad-cta); color: #1f1408; border: none; box-shadow: 0 8px 20px -10px rgba(245,158,11,0.7); }
.console-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); max-width: 560px; }

.console-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.live-clock { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.lc-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 8px var(--shift-ok); animation: shift-ring-pulse 2s ease-out infinite; }
.lc-time { font-family: var(--shift-mono); font-size: 14px; font-weight: 700; color: var(--shift-text); letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
.console-actions { display: flex; gap: 8px; }
.cal-select { padding: 9px 12px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; cursor: pointer; }
.btn-ghost { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); cursor: pointer; display: grid; place-items: center; transition: 0.2s; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.kpi-ribbon { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px; }
.kpi { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.kpi:hover { border-color: var(--shift-border); }
.kpi-spark { position: absolute; right: -30%; top: -60%; width: 80%; height: 220%; pointer-events: none; background: radial-gradient(circle, color-mix(in srgb, var(--tone-c) 24%, transparent), transparent 65%); opacity: 0.5; }
.kpi[data-tone="gold"] { --tone-c: var(--shift-amber); } .kpi[data-tone="ok"] { --tone-c: var(--shift-ok); } .kpi[data-tone="ember"] { --tone-c: var(--shift-ember); }
.kpi-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; background: color-mix(in srgb, var(--tone-c) 14%, transparent); color: var(--tone-c); border: 1px solid color-mix(in srgb, var(--tone-c) 26%, transparent); }
.kpi-val { font-size: 22px; font-weight: 800; color: var(--shift-text); line-height: 1.1; letter-spacing: -0.02em; }
.kpi-label { margin-top: 2px; font-size: 10.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--shift-text-muted); }

/* ════════ BODY ════════ */
.calx-body { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
@media (max-width: 960px) { .calx-body { grid-template-columns: 1fr; } }

.grid-card { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 20px; padding: 16px; overflow: hidden; }
.dow-head { display: grid; grid-template-columns: repeat(7, 1fr); gap: 7px; margin-bottom: 9px; }
.dow-head span { text-align: center; font-family: var(--shift-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--shift-text-dim); }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 7px; }

.cell { position: relative; aspect-ratio: 1 / 0.92; border-radius: 13px; border: 1px solid var(--shift-border-soft);
  background: var(--shift-surface-2); padding: 7px 8px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; text-align: left; overflow: hidden; }
.cell.empty { background: transparent; border: 0; cursor: default; pointer-events: none; }
/* heatmap fill driven by --lvl (0..1) */
.cell-heat { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: linear-gradient(160deg, color-mix(in srgb, var(--shift-amber) calc(var(--lvl, 0) * 30%), transparent), color-mix(in srgb, var(--shift-ember) calc(var(--lvl, 0) * 22%), transparent));
  opacity: calc(0.35 + var(--lvl, 0) * 0.65); transition: opacity 0.4s var(--shift-ease); }
.cell > *:not(.cell-heat) { position: relative; z-index: 1; }
.cell.dim .cell-heat { display: none; }
.cell:hover { border-color: var(--shift-border); box-shadow: 0 12px 30px -16px rgba(0,0,0,0.5); }
.cell.weekend:not(.holiday) { background: rgba(148,163,184,0.05); }
.cell.holiday { border-color: color-mix(in srgb, var(--shift-ember) 30%, transparent); }
.cell.today { border-color: var(--shift-amber); box-shadow: inset 0 0 0 1px var(--shift-amber), 0 0 22px -10px var(--shift-amber); }
.cell.active { border-color: var(--shift-amber); box-shadow: 0 0 0 2px color-mix(in srgb, var(--shift-amber) 40%, transparent), 0 14px 34px -16px var(--shift-amber); }
.cell-pulse { position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; border: 1.5px solid var(--shift-amber); animation: cell-ring 2.4s ease-out infinite; }
@keyframes cell-ring { 0% { opacity: 0.8; transform: scale(1); } 70% { opacity: 0; transform: scale(1.06); } 100% { opacity: 0; } }
.cell-top { display: flex; align-items: center; justify-content: space-between; }
.cell-num { font-family: var(--shift-mono); font-size: 12.5px; font-weight: 700; color: var(--shift-text-2); }
.cell.today .cell-num { color: var(--shift-amber); }
.cell-badge { font-family: var(--shift-mono); font-size: 9px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: rgba(251,191,36,0.2); color: var(--shift-amber); display: grid; place-items: center; font-weight: 700; }
.cell-hol { display: inline-flex; align-items: center; gap: 3px; font-size: 8px; color: var(--shift-ember-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-dots { margin-top: auto; display: flex; align-items: center; gap: 3px; }
.cdot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 5px -1px currentColor; }
.cell-off { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; font-family: var(--shift-mono); font-size: 8.5px; font-weight: 700;
  color: var(--shift-text-muted); background: rgba(148,163,184,0.14); border-radius: 999px; padding: 1px 5px 1px 4px; }
.cell-off svg { opacity: 0.85; }

/* legend */
.legend { display: flex; align-items: center; gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--shift-border-soft); }
.lg-label { font-size: 10px; font-family: var(--shift-mono); color: var(--shift-text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
.lg-sq { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--shift-border-soft);
  background: color-mix(in srgb, var(--shift-amber) calc(var(--lvl) * 60% + 4%), var(--shift-surface-2)); }
.lg-spacer { flex: 1; }
.lg-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.lg-meta svg { color: var(--shift-amber); }

/* ════════ SIDE DETAIL / AGENDA ════════ */
.calx-side { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 20px; padding: 18px; min-height: 360px; position: sticky; top: 8px; }
.sd-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sd-date { display: flex; flex-direction: column; line-height: 1; }
.sd-dow { font-family: var(--shift-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-amber-strong); }
.sd-num { font-size: 30px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.03em; margin: 2px 0; }
.sd-mon { font-size: 11px; color: var(--shift-text-muted); }
.sd-dial { position: relative; width: 50px; height: 50px; display: grid; place-items: center; flex-shrink: 0; }
.sd-dial svg { width: 50px; height: 50px; transform: rotate(-90deg); }
.dial-bg { fill: none; stroke: var(--shift-border-soft); stroke-width: 4; }
.dial-fg { fill: none; stroke: var(--shift-amber); stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray 0.7s var(--shift-ease); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--shift-amber) 50%, transparent)); }
.dial-num { position: absolute; font-family: var(--shift-mono); font-size: 14px; font-weight: 800; color: var(--shift-text); }
.sd-hol { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-ember-strong); background: var(--shift-warn-soft); padding: 4px 10px; border-radius: 999px; margin-top: 12px; }
.sd-groups { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; max-height: 460px; overflow-y: auto; padding-right: 4px; }
.sd-groups::-webkit-scrollbar { width: 6px; } .sd-groups::-webkit-scrollbar-thumb { background: var(--shift-border-soft); border-radius: 3px; }
.sd-group { border: 1px solid var(--shift-border-soft); border-radius: 13px; padding: 10px 12px; }
.sg-head { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
.sg-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c, var(--shift-amber)); box-shadow: 0 0 8px -1px var(--c, var(--shift-amber)); flex-shrink: 0; }
.sg-head b { font-size: 12.5px; color: var(--shift-text); }
.sg-time { font-size: 10px; color: var(--shift-text-muted); }
.sg-count { margin-left: auto; font-family: var(--shift-mono); font-size: 10px; font-weight: 700; color: var(--c, var(--shift-amber)); background: color-mix(in srgb, var(--c, var(--shift-amber)) 14%, transparent); padding: 1px 8px; border-radius: 999px; }
.sg-rows { display: flex; flex-direction: column; gap: 6px; }
.sg-row { display: flex; align-items: center; gap: 8px; }
.sg-av { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 10px; font-weight: 700; font-family: var(--shift-mono);
  color: var(--c, var(--shift-amber)); background: color-mix(in srgb, var(--c, var(--shift-amber)) 16%, transparent); }
.sg-name { font-size: 12.5px; color: var(--shift-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-empty { display: flex; align-items: center; gap: 8px; margin-top: 16px; color: var(--shift-text-dim); font-size: 12.5px; }

.sd-off { margin-top: 14px; padding-top: 13px; border-top: 1px dashed var(--shift-border-soft); }
.sd-off-head { display: flex; align-items: center; gap: 7px; font-size: 10px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--shift-text-muted); margin-bottom: 9px; }
.sd-off-head svg { color: var(--shift-text-muted); }
/* holiday-rest variant — distinguish "resting due to holiday" (ember) from
   the neutral weekly-off bucket above */
.sd-hol-off .sd-off-head { color: var(--shift-ember-strong); }
.sd-hol-off .sd-off-head svg { color: var(--shift-ember-strong); }
.sd-off-list { display: flex; flex-wrap: wrap; gap: 6px; }
.sd-off-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 3px; border-radius: 999px; font-size: 11.5px; color: var(--shift-text-2);
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.off-av { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 8.5px; font-weight: 700; font-family: var(--shift-mono);
  color: var(--shift-text-muted); background: rgba(148,163,184,0.16); }

.sa-head { display: flex; align-items: center; gap: 7px; font-size: 10px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-amber-strong); margin-bottom: 12px; }
.sa-list { display: flex; flex-direction: column; gap: 8px; }
.sa-item { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.18s; }
.sa-item:hover { border-color: var(--shift-border); }
.sa-when { display: flex; flex-direction: column; align-items: center; line-height: 1; flex-shrink: 0; width: 30px; }
.sa-when b { font-size: 15px; font-weight: 800; color: var(--shift-text); }
.sa-when small { font-size: 8.5px; font-family: var(--shift-mono); text-transform: uppercase; color: var(--shift-text-dim); }
.sa-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--shift-border-soft); overflow: hidden; }
.sa-fill { display: block; height: 100%; border-radius: 999px; background: var(--shift-grad-cta); }
.sa-dots { display: flex; gap: 3px; }
.sa-count { font-family: var(--shift-mono); font-size: 12px; font-weight: 800; color: var(--shift-amber); min-width: 18px; text-align: right; }
.sa-empty { display: grid; place-items: center; gap: 10px; padding: 40px 12px; text-align: center; color: var(--shift-text-dim); }
.sa-empty p { margin: 0; font-size: 12.5px; line-height: 1.5; }
.sa-empty svg { color: var(--shift-amber); opacity: 0.6; }

.mono { font-family: var(--shift-mono); }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

/* ════════ TRANSITIONS ════════ */
.cgrid-fwd-enter-active, .cgrid-back-enter-active, .cgrid-fwd-leave-active, .cgrid-back-leave-active { transition: opacity 0.32s var(--shift-ease), transform 0.32s var(--shift-ease); }
.cgrid-fwd-enter-from { opacity: 0; transform: translateX(34px); }
.cgrid-fwd-leave-to { opacity: 0; transform: translateX(-34px); }
.cgrid-back-enter-from { opacity: 0; transform: translateX(-34px); }
.cgrid-back-leave-to { opacity: 0; transform: translateX(34px); }
.mlabel-fwd-enter-active, .mlabel-back-enter-active, .mlabel-fwd-leave-active, .mlabel-back-leave-active { transition: opacity 0.3s var(--shift-ease), transform 0.3s var(--shift-ease); }
.mlabel-fwd-enter-from { opacity: 0; transform: translateY(10px); } .mlabel-fwd-leave-to { opacity: 0; transform: translateY(-10px); }
.mlabel-back-enter-from { opacity: 0; transform: translateY(-10px); } .mlabel-back-leave-to { opacity: 0; transform: translateY(10px); }
.side-swap-enter-active { transition: opacity 0.3s var(--shift-ease), transform 0.3s var(--shift-ease); }
.side-swap-leave-active { transition: opacity 0.18s ease; }
.side-swap-enter-from { opacity: 0; transform: translateY(10px); }
.side-swap-leave-to { opacity: 0; }

@media (max-width: 1100px) { .kpi-ribbon { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .console-top { flex-direction: column; } .console-side { align-items: flex-start; width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .console-rings, .cell-pulse, .console-scan { animation: none; }
  .cgrid-fwd-enter-from, .cgrid-fwd-leave-to, .cgrid-back-enter-from, .cgrid-back-leave-to { transform: none; }
}

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .console-scan { background: linear-gradient(180deg, rgba(217,119,6,0.08), transparent); }
[data-theme="light"] .cell.weekend:not(.holiday) { background: rgba(40,32,20,0.05); }
[data-theme="light"] .cell:hover { box-shadow: 0 12px 30px -18px rgba(40,25,10,0.4); }
[data-theme="light"] .dial-bg { stroke: rgba(40,32,20,0.14); }
[data-theme="light"] .today-btn { color: #1f1408; }
</style>
