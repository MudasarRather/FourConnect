<template>
  <div class="cal">
    <!-- ══ Console hero — "Flight Schedule" ══ -->
    <Motion as="section" class="cal-hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <Navigation class="hero-motif" :size="230" aria-hidden="true" />

      <div class="hero-top">
        <div class="hero-lead">
          <span class="hero-eyebrow"><CalendarDays :size="13" /> Travel · Operations planning</span>
          <h1 class="hero-title">Flight <span class="grad">Schedule</span></h1>
          <p class="hero-sub">Every approved tour on one board — departures, returns and journeys in motion across the organisation.</p>
        </div>
        <div class="hero-cta">
          <div class="cal-nav">
            <button class="navic" title="Previous month" @click="shift(-1)"><ChevronLeft :size="16" /></button>
            <button class="cal-month trv-mono" :class="{ now: isThisMonth }" @click="jumpToday">{{ monthLabel }}</button>
            <button class="navic" title="Next month" @click="shift(1)"><ChevronRight :size="16" /></button>
          </div>
          <Motion as="button" class="btn ghost sm" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="jumpToday"><LocateFixed :size="13" /> Today</Motion>
          <div class="view-seg">
            <button :class="{ on: view === 'grid' }" title="Month grid" @click="view = 'grid'"><LayoutGrid :size="15" /></button>
            <button :class="{ on: view === 'timeline' }" title="Schedule runway" @click="view = 'timeline'"><CalendarRange :size="15" /></button>
          </div>
        </div>
      </div>

      <!-- departure-density heat-strip (signature ambient instrument) -->
      <div class="hero-strip" aria-hidden="true">
        <span v-for="d in density" :key="d.day" class="hs-bar" :class="{ today: d.today, hot: d.n > 0 }"
          :style="{ '--h': d.h + '%', '--i': d.day }" :title="`${d.n} departure${d.n === 1 ? '' : 's'} on the ${d.day}`" />
      </div>

      <div class="hero-lenses">
        <button v-for="l in LENSES" :key="l.key" class="lens" :class="{ on: lens === l.key }" :style="{ '--c': l.hex }"
          @click="lens = lens === l.key ? '' : l.key">
          <component :is="l.icon" :size="13" /> <span>{{ l.label }}</span> <b><TrvCountUp :value="lensCount(l.key)" /></b>
        </button>
        <div class="lens-spacer" />
        <TrvSelect v-model="deptId" :options="deptOpts" placeholder="All departments" class="dept-sel" @change="load" />
      </div>
    </Motion>

    <!-- ══ Body ══ -->
    <div class="cal-wrap" :class="{ wide: view === 'timeline' }">
      <div class="cal-main">
        <!-- GRID view -->
        <transition name="cal-fade" mode="out-in">
          <div v-if="view === 'grid'" key="grid" class="cal-grid-wrap">
            <div class="cal-grid">
              <span v-for="d in dows" :key="d" class="dow">{{ d }}</span>
              <div v-for="(cell, i) in cells" :key="i" class="cell" :class="{ blank: !cell.day, today: cell.isToday }"
                :style="{ '--i': i }">
                <template v-if="cell.day">
                  <span class="cell-day" :class="{ on: cell.isToday }">{{ cell.day }}</span>
                  <span v-if="cell.isToday" class="cell-today-ring" aria-hidden="true" />
                  <div class="cell-events">
                    <button v-for="e in cell.events.slice(0, 3)" :key="e.id" class="evt" :style="{ '--c': statusMeta(e.status).hex }"
                      @mouseenter="setHover(e, $event)" @mouseleave="clearHover" @focus="setHover(e, $event)" @blur="clearHover"
                      @click="openDetail(e)">
                      <component :is="phaseIcon(e, cell.iso)" :size="9" class="evt-ic" />
                      <span class="evt-tx">{{ e.to_location }}</span>
                    </button>
                    <span v-if="cell.events.length > 3" class="evt more">+{{ cell.events.length - 3 }} more</span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- TIMELINE view -->
          <div v-else key="tl">
            <CalScheduleTimeline :events="filtered" :month-start="monthStart" :today="todayIso"
              @hover="(e, r) => setHoverRect(e, r)" @leave="clearHover" @open="openDetail" />
          </div>
        </transition>
      </div>

      <!-- Agenda rail -->
      <aside class="cal-agenda">
        <header class="ag-head">
          <h4><PlaneTakeoff :size="13" /> Departures</h4>
          <span class="ag-count">{{ agenda.length }}</span>
        </header>
        <div v-if="agenda.length" class="ag-list">
          <Motion v-for="(e, i) in agenda" :key="e.id" as="button" class="ag-row" :style="{ '--c': statusMeta(e.status).hex }"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.34, delay: Math.min(i * 0.035, 0.4), ease: [0.16, 1, 0.3, 1] }"
            @mouseenter="setHover(e, $event)" @mouseleave="clearHover" @click="openDetail(e)">
            <span class="ag-date"><b class="trv-mono">{{ dayNum(e.departure_date) }}</b><small>{{ monShort(e.departure_date) }}</small></span>
            <div class="ag-body">
              <span class="ag-route trv-mono">{{ e.from_location }} → {{ e.to_location }}</span>
              <span class="ag-emp">{{ e.employee_name || '—' }}</span>
            </div>
            <span class="ag-dot" />
          </Motion>
        </div>
        <div v-else class="ag-empty"><CalendarRange :size="20" /><span>No tours match this view.</span>
          <button class="ag-link" @click="$emit('go', 'requests')">Open requests <ArrowRight :size="12" /></button>
        </div>
      </aside>
    </div>

    <!-- hover detail -->
    <CalEventPopover :event="hovered" :anchor="anchorRect" />
    <!-- full detail drawer -->
    <TravelDetailDrawer :open="showDetail" :request-id="detailId" @close="showDetail = false" @go="$emit('go', $event)" @changed="load" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  CalendarDays, CalendarRange, CalendarCheck, ChevronLeft, ChevronRight, Plane, PlaneTakeoff, PlaneLanding,
  LayoutGrid, LocateFixed, Navigation, Layers, Hourglass, BadgeCheck, ArrowRight,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import TrvSelect from '../components/TrvSelect.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import CalEventPopover from '../components/CalEventPopover.vue'
import CalScheduleTimeline from '../components/CalScheduleTimeline.vue'
import TravelDetailDrawer from '../components/TravelDetailDrawer.vue'
import { errText, fetchCalendar, statusMeta, fetchDepartments } from '@/composables/useTravel'

defineEmits(['go'])
const toast = useToast()

const events = ref([])
const cursor = ref(new Date())
const view = ref('grid')
const lens = ref('')
const deptId = ref('')
const deptOpts = ref([{ value: '', label: 'All departments' }])
const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LENSES = [
  { key: '', label: 'All', icon: Layers, hex: '#fbbf24' },
  { key: 'PENDING_APPROVAL', label: 'Pending', icon: Hourglass, hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Scheduled', icon: CalendarCheck, hex: '#34d399' },
  { key: 'IN_PROGRESS', label: 'In-flight', icon: PlaneTakeoff, hex: '#fb923c' },
  { key: 'COMPLETED', label: 'Completed', icon: BadgeCheck, hex: '#60d394' },
]

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = iso(new Date())
const monthStart = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1))
const monthLabel = computed(() => cursor.value.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))
const isThisMonth = computed(() => { const n = new Date(); return n.getFullYear() === cursor.value.getFullYear() && n.getMonth() === cursor.value.getMonth() })

const load = async () => {
  const y = cursor.value.getFullYear(), m = cursor.value.getMonth()
  const from = iso(new Date(y, m, 1)), to = iso(new Date(y, m + 1, 0))
  try { events.value = (await fetchCalendar({ date_from: from, date_to: to, department_id: deptId.value || undefined })).items || [] }
  catch (e) { toast.error(errText(e, 'Failed to load calendar')) }
}
const shift = (n) => { cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + n, 1); load() }
const jumpToday = () => { cursor.value = new Date(); load() }

const filtered = computed(() => lens.value ? events.value.filter(e => e.status === lens.value) : events.value)
const lensCount = (k) => k ? events.value.filter(e => e.status === k).length : events.value.length

const cells = computed(() => {
  const y = cursor.value.getFullYear(), m = cursor.value.getMonth()
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const out = []
  for (let i = 0; i < first; i++) out.push({ day: null })
  for (let d = 1; d <= days; d++) {
    const cellIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const evs = filtered.value.filter(e => cellIso >= e.departure_date && cellIso <= e.return_date)
    out.push({ day: d, iso: cellIso, isToday: cellIso === todayIso, events: evs })
  }
  return out
})

const density = computed(() => {
  const y = cursor.value.getFullYear(), m = cursor.value.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  const counts = Array.from({ length: days }, (_, i) => {
    const di = `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return filtered.value.filter(e => e.departure_date === di).length
  })
  const max = Math.max(1, ...counts)
  return counts.map((n, i) => ({ day: i + 1, n, h: Math.round(14 + (n / max) * 86), today: `${y}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}` === todayIso }))
})

const agenda = computed(() => [...filtered.value].sort((a, b) => a.departure_date.localeCompare(b.departure_date)))
const dayNum = (d) => String(d || '').slice(8, 10)
const monShort = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { month: 'short' }) } catch { return '' } }
const phaseIcon = (e, cellIso) => {
  if (e.departure_date === cellIso) return PlaneTakeoff
  if (e.return_date === cellIso) return PlaneLanding
  return Plane
}

// ── hover popover ──
const hovered = ref(null)
const anchorRect = ref(null)
let hideT = null
const setHoverRect = (e, rect) => { clearTimeout(hideT); hovered.value = e; anchorRect.value = rect }
const setHover = (e, ev) => setHoverRect(e, ev.currentTarget.getBoundingClientRect())
const clearHover = () => { clearTimeout(hideT); hideT = setTimeout(() => { hovered.value = null }, 90) }
const killHover = () => { clearTimeout(hideT); hovered.value = null }

// ── detail drawer ──
const showDetail = ref(false)
const detailId = ref(null)
const openDetail = (e) => { killHover(); detailId.value = e.id; showDetail.value = true }

onMounted(async () => {
  load()
  window.addEventListener('scroll', killHover, true)
  try { const d = await fetchDepartments(); deptOpts.value = [{ value: '', label: 'All departments' }, ...(d.items || []).map(x => ({ value: x.id, label: x.name }))] } catch { /* keep default */ }
})
onBeforeUnmount(() => window.removeEventListener('scroll', killHover, true))
</script>

<style scoped>
.cal { display: flex; flex-direction: column; gap: 16px; }

/* ── hero ── */
.cal-hero { position: relative; overflow: hidden; isolation: isolate; padding: 22px 24px; border-radius: 22px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.hero-aura { position: absolute; inset: -50% 40% 30% -10%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }
.hero-motif { position: absolute; top: -50px; right: -36px; color: var(--trv-amber); opacity: 0.05; z-index: 0; animation: cal-spin 80s linear infinite; }
@keyframes cal-spin { to { transform: rotate(360deg); } }
.hero-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 4px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-title { font-size: clamp(22px, 3vw, 30px); font-weight: 830; margin: 11px 0 5px; color: var(--trv-text); line-height: 1.08; }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 13px; color: var(--trv-text-secondary); margin: 0; max-width: 540px; line-height: 1.5; }
.hero-cta { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.cal-nav { display: flex; align-items: center; gap: 4px; padding: 3px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.navic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: transparent; border: none; color: var(--trv-text-secondary); transition: background 0.2s, color 0.2s; }
.navic:hover { background: var(--trv-amber-soft); color: var(--trv-amber); }
.cal-month { min-width: 138px; text-align: center; font-size: 13px; font-weight: 750; color: var(--trv-text); background: none; border: none; cursor: pointer; padding: 0 6px; border-radius: 8px; }
.cal-month.now { color: var(--trv-amber); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.sm { padding: 8px 12px; }
.btn.ghost { background: var(--trv-panel); border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.view-seg { display: flex; gap: 3px; padding: 3px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.view-seg button { display: grid; place-items: center; width: 32px; height: 30px; border-radius: 9px; cursor: pointer; background: transparent; border: none; color: var(--trv-text-muted); transition: all 0.2s; }
.view-seg button.on { color: #1a1205; background: var(--trv-grad-hero); box-shadow: var(--trv-amber-glow); }

.hero-strip { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 2px; height: 34px; margin-top: 16px; padding: 0 2px; }
.hs-bar { flex: 1; min-width: 0; height: var(--h, 14%); border-radius: 3px 3px 1px 1px; background: var(--trv-steel-soft);
  animation: cal-strip 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay: calc(var(--i) * 0.012s); transform-origin: bottom; }
.hs-bar.hot { background: linear-gradient(180deg, var(--trv-amber), color-mix(in srgb, var(--trv-amber) 30%, transparent)); box-shadow: 0 0 8px -2px rgba(251,191,36,0.5); }
.hs-bar.today { outline: 1px solid var(--trv-amber-border); }
@keyframes cal-strip { from { transform: scaleY(0.05); opacity: 0.2; } to { transform: scaleY(1); opacity: 1; } }

.hero-lenses { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 9px; align-items: center; margin-top: 16px; }
.lens { --c: var(--trv-amber); display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 12px; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border);
  position: relative; overflow: hidden; transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.lens::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--trv-spring); }
.lens:hover { transform: translateY(-2px); color: var(--trv-text); }
.lens.on { color: var(--trv-text); border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.lens.on::after { transform: scaleX(1); }
.lens b { font-weight: 800; color: var(--c); font-variant-numeric: tabular-nums; }
.lens :deep(svg) { color: var(--c); }
.lens-spacer { flex: 1; min-width: 12px; }
.dept-sel { width: 200px; }

/* ── body ── */
.cal-wrap { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
.cal-wrap.wide { grid-template-columns: 1fr 300px; }
.cal-main { min-width: 0; }
.cal-fade-enter-active, .cal-fade-leave-active { transition: opacity 0.28s var(--trv-spring), transform 0.28s var(--trv-spring); }
.cal-fade-enter-from { opacity: 0; transform: translateY(8px); }
.cal-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* grid */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.dow { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); text-align: center; padding: 4px 0; }
.cell { position: relative; min-height: 92px; border-radius: 12px; padding: 7px; background: var(--trv-surface); border: 1px solid var(--trv-border); overflow: hidden;
  animation: cal-cell 0.42s cubic-bezier(0.16,1,0.3,1) both; animation-delay: calc(var(--i) * 0.012s); transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; }
.cell:not(.blank):hover { border-color: var(--trv-border-strong); transform: translateY(-2px); box-shadow: var(--trv-card-shadow); }
.cell.blank { background: transparent; border: none; animation: none; }
.cell.today { border-color: var(--trv-amber-border); background: color-mix(in srgb, var(--trv-amber) 6%, var(--trv-surface)); }
@keyframes cal-cell { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
.cell-day { position: relative; z-index: 1; font-size: 11px; font-weight: 700; color: var(--trv-text-muted); }
.cell-day.on { color: var(--trv-amber); }
.cell-today-ring { position: absolute; top: 5px; left: 5px; width: 19px; height: 19px; border-radius: 50%; border: 1.5px solid var(--trv-amber-border); animation: cal-ring 2.4s ease-out infinite; }
@keyframes cal-ring { 0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.4); } 70%, 100% { box-shadow: 0 0 0 7px rgba(251,191,36,0); } }
.cell-events { display: flex; flex-direction: column; gap: 3px; margin-top: 5px; }
.evt { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 6px; font-size: 9.5px; font-weight: 650; cursor: pointer; border: 1px solid color-mix(in srgb, var(--c) 26%, transparent);
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); overflow: hidden; transition: transform 0.18s, background 0.2s; text-align: left; }
.evt:hover { transform: translateX(2px); background: color-mix(in srgb, var(--c) 22%, transparent); }
.evt-ic { flex-shrink: 0; }
.evt-tx { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.evt.more { color: var(--trv-text-dim); background: var(--trv-steel-soft); border-color: transparent; cursor: default; }
.evt.more:hover { transform: none; }

/* agenda */
.cal-agenda { padding: 15px; border-radius: 18px; background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.ag-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ag-head h4 { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 750; color: var(--trv-amber); margin: 0; }
.ag-count { font-size: 10.5px; font-weight: 750; color: var(--trv-amber); padding: 2px 9px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.ag-list { display: flex; flex-direction: column; gap: 7px; max-height: 460px; overflow-y: auto; }
.ag-row { display: flex; align-items: center; gap: 11px; padding: 9px 11px; border-radius: 12px; cursor: pointer; text-align: left; width: 100%;
  background: var(--trv-panel); border: 1px solid var(--trv-border); border-left: 3px solid var(--c); transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
.ag-row:hover { transform: translateX(-3px); box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--c) 60%, transparent); }
.ag-date { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 30px; }
.ag-date b { font-size: 15px; font-weight: 800; color: var(--trv-text); line-height: 1; }
.ag-date small { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trv-text-dim); }
.ag-body { flex: 1; min-width: 0; }
.ag-route { display: block; font-size: 11.5px; font-weight: 650; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ag-emp { font-size: 10px; color: var(--trv-text-muted); }
.ag-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--c); box-shadow: 0 0 8px var(--c); }
.ag-empty { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 28px 10px; text-align: center; font-size: 12px; color: var(--trv-text-dim); }
.ag-empty :deep(svg) { color: var(--trv-amber); opacity: 0.7; }
.ag-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 650; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); border-radius: 9px; padding: 6px 11px; cursor: pointer; }

@media (max-width: 920px) { .cal-wrap, .cal-wrap.wide { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .hero-aura, .hero-motif, .hs-bar, .cell, .cell-today-ring { animation: none !important; }
}
</style>
