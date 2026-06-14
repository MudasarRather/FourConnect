<template>
  <section class="wf">
    <!-- ════════════════════ COMMAND DECK ════════════════════ -->
    <Motion as="header" class="deck" :initial="{ opacity: 0, y: -16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }">
      <span class="deck-grid-bg" aria-hidden="true" />
      <span class="deck-glow" aria-hidden="true" />

      <div class="deck-layout">
        <!-- left: readout + controls + KPIs -->
        <div class="deck-main">
          <span class="eyebrow"><span class="eb-dot" /> Forecast &amp; capacity · live projection</span>
          <h2 class="deck-title">Workforce Command</h2>
          <p class="deck-sub">Declare required headcount per shift, then watch it projected against real assigned capacity — day by day. Shortfalls surface here before they reach the floor.</p>

          <div class="controls">
            <div class="seg" role="tablist">
              <span class="seg-thumb" :style="{ transform: `translateX(${HORIZONS.indexOf(horizon) * 100}%)` }" />
              <button v-for="h in HORIZONS" :key="h" class="seg-btn" :class="{ on: horizon === h }"
                @click="horizon = h; loadForecast()">{{ h }}<small>d</small></button>
            </div>
            <div class="dept-wrap">
              <Briefcase :size="13" />
              <select v-model="deptFilter" class="dept-sel" @change="reload">
                <option value="">All departments</option>
                <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <span class="ctrl-spacer" />
            <Motion as="button" class="btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="openCreate">
              <Plus :size="14" />New demand
            </Motion>
            <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="14" /></button>
          </div>

          <div class="kpis">
            <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :data-tone="k.tone"
              :initial="{ opacity: 0, y: 18, scale: 0.94 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
              :transition="{ duration: 0.5, delay: 0.25 + i * 0.08, ease: [0.16, 1, 0.3, 1] }" :whileHover="{ y: -4 }">
              <span class="kpi-shimmer" aria-hidden="true" />
              <div class="kpi-ic"><component :is="k.icon" :size="14" /></div>
              <div class="kpi-body">
                <b class="kpi-val"><ShiftCountUp :value="k.value" /></b>
                <span class="kpi-lbl">{{ k.label }}</span>
              </div>
              <span class="kpi-sub">{{ k.sub }}</span>
            </Motion>
          </div>
        </div>

        <!-- right: coverage gauge + verdict -->
        <Motion as="div" class="deck-gauge" :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }">
          <WfCoverageGauge v-if="summary" :value="summary.coverage_pct" :required="summary.total_required" :assigned="summary.total_assigned" />
          <div v-else class="gauge-skel">Loading forecast…</div>

          <transition name="verdict" mode="out-in">
            <button v-if="summary && summary.total_shortfall > 0" key="short" class="verdict alert" @click="goAssign()">
              <AlertTriangle :size="14" />
              <span><b>{{ summary.total_shortfall }}</b> heads·days short<small v-if="summary.worst_shift"> · worst {{ summary.worst_shift }}</small></span>
              <ArrowUpRight :size="14" class="v-go" />
            </button>
            <div v-else-if="summary" key="clear" class="verdict ok">
              <ShieldCheck :size="14" /><span>All declared demand is covered</span>
            </div>
          </transition>
        </Motion>
      </div>
    </Motion>

    <!-- ════════════════════ FORECAST ════════════════════ -->
    <Motion as="section" class="panel forecast" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
      <header class="p-head">
        <h3><Activity :size="15" /> Coverage forecast <span class="p-meta">{{ days.length }} days</span></h3>
        <div class="view-toggle">
          <button class="vt-btn" :class="{ on: view === 'ridge' }" @click="view = 'ridge'"><BarChart3 :size="13" />Ridge</button>
          <button class="vt-btn" :class="{ on: view === 'grid' }" @click="view = 'grid'"><LayoutGrid :size="13" />Grid</button>
        </div>
      </header>

      <transition name="swap" mode="out-in">
        <!-- RIDGE: animated capacity columns -->
        <div v-if="view === 'ridge'" key="ridge" class="ridge-wrap">
          <div v-if="columns.length" class="ridge">
            <p class="ridge-cap">Bar = assigned · dashed = required · hatched = shortfall · <Palmtree :size="10" class="cap-ic" /> = holiday (workforce rests) · peak demand <b>{{ maxReq }}</b></p>
            <div class="ridge-track">
              <Motion v-for="(c, i) in columns" :key="c.date" as="div" class="col" :class="[c.tone, { wknd: c.weekend, today: c.isToday, holiday: c.isHoliday, clickable: c.shortfall > 0 }]"
                :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: Math.min(i * 0.022, 0.6), ease: [0.16, 1, 0.3, 1] }"
                @mouseenter="onColEnter($event, c)" @mouseleave="onColLeave"
                @click="c.shortfall > 0 && (c.isHoliday ? goHolidays() : goAssign())">
                <span v-if="c.isToday" class="col-now">NOW</span>
                <span v-if="c.isHoliday" class="col-hol" :title="c.holidayName"><Palmtree :size="9" /></span>
                <div class="col-bar">
                  <span class="col-reqline" :style="{ bottom: pct(c.reqFrac) }"><i /></span>
                  <span class="col-gap" :style="{ bottom: mounted ? pct(c.fillFrac) : '0%', height: mounted ? pct(Math.max(0, c.reqFrac - c.fillFrac)) : '0%', transitionDelay: delay(i) }" />
                  <span class="col-fill" :style="{ height: mounted ? pct(c.fillFrac) : '0%', transitionDelay: delay(i) }">
                    <span class="col-shine" aria-hidden="true" />
                  </span>
                </div>
                <span class="col-num">{{ c.assigned }}<i>/{{ c.required }}</i></span>
                <span class="col-dow">{{ DOW[c.weekday] }}</span>
                <span class="col-day">{{ dayNum(c.date) }}</span>
              </Motion>
            </div>
          </div>
          <ShiftEmptyState v-else-if="!loading" :icon="TrendingUp" title="No active demand in this window"
            sub="Declare a workforce demand, then the ridge projects assigned capacity against it." />
        </div>

        <!-- GRID: per-demand heatmap -->
        <div v-else key="grid" class="grid-wrap">
          <div v-if="rows.length" class="heat-scroll">
            <div class="heat-grid" :style="{ gridTemplateColumns: `170px repeat(${days.length}, minmax(30px, 1fr))` }">
              <span class="hg-corner">Demand · skill</span>
              <span v-for="d in days" :key="'h' + d.date" class="hg-day" :class="{ wknd: d.weekday >= 5, today: d.date === todayStr, holiday: d.is_holiday }"
                :title="d.is_holiday ? d.holiday_name : ''">
                <small>{{ DOW[d.weekday] }}</small>{{ dayNum(d.date) }}
                <i v-if="d.is_holiday" class="hg-holdot" />
              </span>
              <template v-for="(r, ri) in rows" :key="r.demand_id">
                <span class="hg-row-label" :title="r.label">{{ r.label }}</span>
                <span v-for="(d, di) in days" :key="r.demand_id + d.date" class="hg-cell" :class="[cellClass(r, d.date), { hot: isHot(r, d.date), hol: d.is_holiday }]"
                  :style="{ '--ci': di }" :title="cellTip(r, d.date)" @click="isHot(r, d.date) && fixCell(r.shift_id, d.date)">{{ cellText(r, d.date) }}</span>
              </template>
            </div>
          </div>
          <ShiftEmptyState v-else-if="!loading" :icon="LayoutGrid" title="Nothing to chart yet"
            sub="Add a demand entry to see per-shift coverage across the window." />
          <div class="heat-legend">
            <span class="lg ok">≥100%</span><span class="lg warn">60–99%</span><span class="lg alert">&lt;60%</span><span class="lg off">off / closed</span><span class="lg hol">holiday</span>
            <span class="lg-hint"><ArrowUpRight :size="11" /> click a gap to staff it</span>
          </div>
        </div>
      </transition>
    </Motion>

    <!-- ════════════════════ DEMANDS + SHORTFALL FOCUS ════════════════════ -->
    <div class="cols">
      <!-- demand registry -->
      <Motion as="section" class="panel demands" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <header class="p-head">
          <h3><CalendarRange :size="15" /> Demand registry <span class="p-meta">{{ demands.length }}</span></h3>
          <button class="btn-mini" @click="openCreate"><Plus :size="13" />New</button>
        </header>
        <div v-if="demands.length" class="dem-grid">
          <Motion v-for="(d, i) in demands" :key="d.id" as="article" class="dcard" :data-tone="demTone(d)"
            :initial="{ opacity: 0, y: 16, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.45, delay: Math.min(i * 0.05, 0.5), ease: [0.16, 1, 0.3, 1] }" :whileHover="{ y: -4 }">
            <span class="dc-edge" aria-hidden="true" />
            <div class="dc-top">
              <span class="dc-code">{{ d.shift_code }}</span>
              <div class="dc-id">
                <b>{{ d.shift_name }}</b>
                <small>{{ d.department_name || 'All departments' }}<template v-if="d.skill"> · {{ d.skill }}</template></small>
              </div>
              <div class="dc-act">
                <button class="ic" title="Edit" @click="openEdit(d)"><Pencil :size="12" /></button>
                <button class="ic danger" title="Delete" @click="del(d)"><Trash2 :size="12" /></button>
              </div>
            </div>
            <div class="dc-need">
              <span class="dc-req"><b>{{ d.required_headcount }}</b> required</span>
              <span class="dc-have" v-if="statById[d.id]"><b>{{ statById[d.id].maxAsg }}</b> peak assigned</span>
              <span class="dc-have muted" v-else>outside window</span>
            </div>
            <div class="dc-meter">
              <span class="dcm-fill" :class="demTone(d)" :style="{ width: mounted ? demFillPct(d) : '0%' }" />
            </div>
            <div class="dc-foot">
              <span class="dc-win"><CalendarRange :size="11" />{{ d.valid_from }} → {{ d.valid_to || 'open' }}</span>
              <button v-if="statById[d.id] && statById[d.id].totalShort > 0" class="dc-staff" @click="goAssign(d.shift_id)">Staff <ChevronRight :size="12" /></button>
            </div>
          </Motion>
        </div>
        <ShiftEmptyState v-else :icon="TrendingUp" title="No demand declared yet"
          sub="Add a demand entry — e.g. ‘Night shift needs 10 heads, this month’ — to project staffing gaps.">
          <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />New demand</button></template>
        </ShiftEmptyState>
      </Motion>

      <!-- shortfall focus -->
      <Motion as="section" class="panel focus" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }">
        <header class="p-head">
          <h3><Zap :size="15" /> Shortfall focus</h3>
          <span class="p-meta" :class="{ alert: shortfalls.length }">{{ shortfalls.length }}</span>
        </header>
        <div v-if="shortfalls.length" class="focus-list">
          <Motion v-for="(s, i) in shortfalls" :key="s.demand_id" as="button" class="frow" type="button"
            :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.4, delay: Math.min(i * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ x: 3 }" @click="goAssign(s.shift_id)">
            <span class="fr-rank">{{ i + 1 }}</span>
            <div class="fr-body">
              <b>{{ s.label }}</b>
              <small v-if="s.worst">worst {{ dayNum(s.worst.date) }} {{ DOW[dWeekday(s.worst.date)] }} · {{ s.worst.assigned }}/{{ s.worst.required }}</small>
            </div>
            <span class="fr-gap"><b>−{{ s.total }}</b><i>heads·days</i></span>
            <ArrowUpRight :size="14" class="fr-go" />
          </Motion>
        </div>
        <div v-else-if="summary" class="focus-clear">
          <span class="fc-ring"><ShieldCheck :size="22" /></span>
          <b>Fully covered</b>
          <p>Every active demand meets its headcount across the next {{ summary.horizon_days }} days.</p>
        </div>
      </Motion>
    </div>

    <ShiftDemandModal :open="showModal" :demand="editTarget" @close="showModal = false" @saved="onSaved" />

    <!-- ════════════════════ RIDGE HOVER TOOLTIP ════════════════════ -->
    <Teleport to="body">
      <transition name="wf-tip">
        <div v-if="hoverCol" class="wf-tip" :class="hoverCol.tone" :style="tipStyle">
          <div class="wt-head">
            <span class="wt-dot" />
            <b>{{ tipFullDate }}</b>
            <span v-if="hoverCol.isHoliday" class="wt-hol"><Palmtree :size="9" /> {{ hoverCol.holidayName }}</span>
          </div>
          <div class="wt-mid">
            <span class="wt-big"><b>{{ hoverCol.assigned }}</b><i>/{{ hoverCol.required }}</i></span>
            <span class="wt-heads">heads on shift</span>
          </div>
          <div class="wt-bar"><span class="wt-fill" :style="{ width: tipFill + '%' }" /></div>
          <div class="wt-foot">
            <span v-if="!hoverCol.required" class="wt-pill off">no demand</span>
            <span v-else-if="hoverCol.shortfall > 0" class="wt-pill alert">−{{ hoverCol.shortfall }} short</span>
            <span v-else class="wt-pill ok">fully covered</span>
            <span class="wt-pct">{{ hoverCol.required ? tipPct + '%' : '—' }}</span>
          </div>
          <span v-if="hoverCol.isHoliday" class="wt-note">Workforce rests — only holiday crew count toward capacity.</span>
          <span class="wt-arrow" />
        </div>
      </transition>
    </Teleport>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { useRouter, useRoute } from 'vue-router'
import {
  TrendingUp, Plus, RefreshCw, Pencil, Trash2, Users, UserCheck, AlertTriangle,
  CalendarX, LayoutGrid, BarChart3, ArrowUpRight, ChevronRight, ShieldCheck,
  Briefcase, CalendarRange, Zap, Activity, Palmtree,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftDemandModal from '../modals/ShiftDemandModal.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import WfCoverageGauge from '../components/WfCoverageGauge.vue'
import { fetchWorkforceDemands, deleteWorkforceDemand, fetchWorkforceForecast, fetchDepartments, todayIso, isoOffsetDays } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const router = useRouter()
const route = useRoute()

const demands = ref([])
const forecast = ref(null)
const departments = ref([])
const loading = ref(false)
const horizon = ref(14)
const deptFilter = ref('')
const showModal = ref(false)
const editTarget = ref(null)
const view = ref('ridge')
const mounted = ref(false)

const HORIZONS = [7, 14, 30]
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const todayStr = todayIso()
const dayNum = (iso) => Number(iso.split('-')[2])
const dWeekday = (iso) => { const d = new Date(iso + 'T00:00:00'); return (d.getDay() + 6) % 7 }
const pct = (f) => `${Math.max(0, Math.min(1, f)) * 100}%`
const delay = (i) => `${Math.min(i * 0.022, 0.6) + 0.1}s`

const summary = computed(() => forecast.value?.summary || null)
const days = computed(() => forecast.value?.days || [])

const maxReq = computed(() => Math.max(1, ...days.value.map(d => d.required || 0)))
const colTone = (assigned, required) => {
  if (!required) return 'off'
  const r = assigned / required
  return r >= 1 ? 'ok' : r >= 0.6 ? 'warn' : 'alert'
}
const columns = computed(() => days.value.map((d, i) => ({
  date: d.date, weekday: d.weekday, assigned: d.assigned, required: d.required, shortfall: d.shortfall,
  isToday: d.date === todayStr || i === 0 && !days.value.some(x => x.date === todayStr),
  weekend: d.weekday >= 5,
  isHoliday: !!d.is_holiday,
  holidayName: d.holiday_name || 'Holiday',
  reqFrac: (d.required || 0) / maxReq.value,
  fillFrac: Math.min(maxReq.value, d.assigned || 0) / maxReq.value,
  tone: colTone(d.assigned, d.required),
})))
const colTip = (c) => {
  let t = `${c.date} · ${c.assigned} of ${c.required} assigned`
  if (c.isHoliday) t += ` · holiday: ${c.holidayName} (workforce rests; only holiday crew count)`
  else t += c.shortfall > 0 ? ` · short ${c.shortfall}` : ' · covered'
  return t
}
const holidaySet = computed(() => new Set(days.value.filter(d => d.is_holiday).map(d => d.date)))

// pivot: demand → per-date cell (+ flat cells for aggregation)
const rows = computed(() => {
  const map = {}
  for (const day of days.value) {
    for (const c of day.cells) {
      if (!map[c.demand_id]) map[c.demand_id] = { demand_id: c.demand_id, label: c.label, shift_id: c.shift_id, shift_code: c.shift_code, byDate: {}, cells: [] }
      map[c.demand_id].byDate[day.date] = c
      map[c.demand_id].cells.push({ date: day.date, ...c })
    }
  }
  return Object.values(map)
})
const cellOf = (r, dateIso) => r.byDate[dateIso] || null
const cellText = (r, dateIso) => { const c = cellOf(r, dateIso); return c ? `${c.assigned}/${c.required}` : '' }
const cellTip = (r, dateIso) => { const c = cellOf(r, dateIso); return c ? `${r.label} · ${dateIso} · ${c.assigned}/${c.required} (${Math.round(c.ratio * 100)}%)` : `${dateIso} · off` }
const cellClass = (r, dateIso) => {
  const c = cellOf(r, dateIso)
  if (!c) return 'off'
  if (c.ratio >= 1) return 'ok'
  if (c.ratio >= 0.6) return 'warn'
  return 'alert'
}
const isHot = (r, dateIso) => { const c = cellOf(r, dateIso); return c && c.shortfall > 0 }

// per-demand stats from forecast cells
const statById = computed(() => {
  const m = {}
  for (const r of rows.value) {
    let maxAsg = 0, totalShort = 0
    for (const c of r.cells) { maxAsg = Math.max(maxAsg, c.assigned); totalShort += c.shortfall || 0 }
    m[r.demand_id] = { maxAsg, totalShort }
  }
  return m
})
const demFillPct = (d) => {
  const st = statById.value[d.id]
  const req = d.required_headcount || 0
  if (!req) return '100%'
  const have = st ? st.maxAsg : 0
  return `${Math.max(0, Math.min(1, have / req)) * 100}%`
}
const demTone = (d) => {
  const st = statById.value[d.id]
  if (!st) return 'idle'
  const req = d.required_headcount || 0
  if (!req) return 'ok'
  const r = st.maxAsg / req
  return r >= 1 ? 'ok' : r >= 0.6 ? 'warn' : 'alert'
}

// worst shortfalls for the focus rail
const shortfalls = computed(() => rows.value.map(r => {
  let total = 0, worst = null
  for (const c of r.cells) {
    total += c.shortfall || 0
    if (c.shortfall > 0 && (!worst || c.shortfall > worst.shortfall)) worst = c
  }
  return { demand_id: r.demand_id, label: r.label, shift_id: r.shift_id, total, worst }
}).filter(r => r.total > 0).sort((a, b) => b.total - a.total))

const kpis = computed(() => {
  const s = summary.value || {}
  return [
    { key: 'req', label: 'Required', value: s.total_required || 0, icon: Users, tone: '', sub: 'heads·days' },
    { key: 'asg', label: 'Assigned', value: s.total_assigned || 0, icon: UserCheck, tone: 'ok', sub: 'projected' },
    { key: 'short', label: 'Shortfall', value: s.total_shortfall || 0, icon: AlertTriangle, tone: s.total_shortfall ? 'alert' : 'ok', sub: 'heads·days' },
    { key: 'sdays', label: 'Gap days', value: s.shortfall_days || 0, icon: CalendarX, tone: s.shortfall_days ? 'warn' : 'ok', sub: `of ${s.horizon_days || horizon.value}d` },
  ]
})

// ── connection: jump to where the gap is actually fixed ──
// normal-day gaps → Assignment page; holiday gaps → Holiday Shifts page.
const goAssign = (shiftId) => {
  const base = route.path.replace(/\/[^/]+$/, '/assignment')
  router.push(shiftId ? { path: base, query: { shift: shiftId } } : { path: base })
}
const goHolidays = () => router.push({ path: route.path.replace(/\/[^/]+$/, '/holidays') })
const fixCell = (shiftId, dateIso) => holidaySet.value.has(dateIso) ? goHolidays() : goAssign(shiftId)

// ── ridge column hover tooltip (teleported, so the scroll container can't clip it) ──
const hoverCol = ref(null)
const hoverPos = ref({ x: 0, top: 0 })
const onColEnter = (e, c) => {
  const r = e.currentTarget.getBoundingClientRect()
  hoverPos.value = { x: Math.max(118, Math.min(window.innerWidth - 118, r.left + r.width / 2)), top: r.top }
  hoverCol.value = c
}
const onColLeave = () => { hoverCol.value = null }
const tipStyle = computed(() => ({ left: hoverPos.value.x + 'px', top: (hoverPos.value.top - 14) + 'px' }))
const tipFullDate = computed(() => {
  const c = hoverCol.value
  if (!c) return ''
  return new Date(c.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
})
const tipPct = computed(() => { const c = hoverCol.value; return c && c.required ? Math.round(c.assigned / c.required * 100) : 100 })
const tipFill = computed(() => { const c = hoverCol.value; return c && c.required ? Math.min(100, Math.round(c.assigned / c.required * 100)) : 0 })

const loadForecast = async () => {
  try {
    const params = { from: todayIso(), to: isoOffsetDays(horizon.value - 1) }
    if (deptFilter.value) params.department_id = deptFilter.value
    forecast.value = await fetchWorkforceForecast(params)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load forecast'); forecast.value = null }
}
const reload = async () => {
  loading.value = true
  try {
    const params = { limit: 200 }
    if (deptFilter.value) params.department_id = deptFilter.value
    const d = await fetchWorkforceDemands(params)
    demands.value = d.items || []
    await loadForecast()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load workforce data') }
  finally { loading.value = false }
}

onMounted(async () => {
  try { departments.value = await fetchDepartments() } catch { /* */ }
  await reload()
  await nextTick()
  requestAnimationFrame(() => requestAnimationFrame(() => { mounted.value = true }))
})

const openCreate = () => { editTarget.value = null; showModal.value = true }
const openEdit = (d) => { editTarget.value = d; showModal.value = true }
const onSaved = async () => { await reload(); emit('refresh-stats') }
const del = async (d) => {
  if (!window.confirm(`Delete demand for ${d.shift_name}?`)) return
  try { await deleteWorkforceDemand(d.id); toast.success('Demand deleted'); await reload(); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
}
</script>

<style scoped>
.wf { display: flex; flex-direction: column; gap: 18px; }

/* ════════════════════ COMMAND DECK ════════════════════ */
.deck { position: relative; overflow: hidden; border-radius: 24px; padding: 26px 28px;
  background:
    radial-gradient(120% 120% at 82% -10%, rgba(251,146,60,0.12), transparent 55%),
    linear-gradient(165deg, #0d0f13 0%, #0a0b0f 62%, #08090c 100%);
  border: 1px solid var(--shift-border); }
.deck-grid-bg { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 40px 40px; mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 78%); animation: shift-grid-pan 18s linear infinite; }
.deck-glow { position: absolute; inset: 0; pointer-events: none; background: var(--shift-grad-hero); }
.deck-layout { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 280px; gap: 30px; align-items: center; }
.deck-main { min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eb-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }
.deck-title { margin: 9px 0 6px; font-size: 30px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.04;
  background: linear-gradient(135deg, var(--shift-amber-bright), var(--shift-amber) 45%, var(--shift-ember-strong));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.deck-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); max-width: 600px; }

.controls { display: flex; align-items: center; gap: 10px; margin: 18px 0 16px; flex-wrap: wrap; }
.seg { position: relative; display: inline-flex; padding: 4px; border-radius: 12px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.seg-thumb { position: absolute; top: 4px; left: 4px; width: calc((100% - 8px) / 3); height: calc(100% - 8px); border-radius: 9px; background: var(--shift-grad-cta); transition: transform 0.4s var(--shift-spring); }
.seg-btn { position: relative; z-index: 1; width: 48px; padding: 6px 0; border: 0; background: transparent; cursor: pointer; font-family: var(--shift-mono); font-size: 13px; font-weight: 700; color: var(--shift-text-muted); transition: color 0.25s; }
.seg-btn small { font-size: 9px; opacity: 0.8; }
.seg-btn.on { color: #1f1408; }
.dept-wrap { display: inline-flex; align-items: center; gap: 7px; padding: 0 11px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); }
.dept-sel { background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 12.5px; padding: 8px 4px; cursor: pointer; }
.ctrl-spacer { flex: 1; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 800; font-size: 12.5px; box-shadow: 0 10px 24px -12px rgba(245,158,11,0.8); }
.btn-ghost { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.btn-ghost:hover { color: var(--shift-amber); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; }
.kpi { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 9px; padding: 13px 14px; border-radius: 15px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.kpi:hover { border-color: var(--shift-border); }
.kpi-shimmer { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(120deg, transparent 40%, rgba(251,191,36,0.1) 50%, transparent 60%); transition: opacity 0.3s; }
.kpi:hover .kpi-shimmer { opacity: 1; }
.kpi-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: rgba(251,191,36,0.13); color: var(--shift-amber); }
.kpi[data-tone="ok"] .kpi-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.kpi[data-tone="warn"] .kpi-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.kpi[data-tone="alert"] .kpi-ic { background: var(--shift-alert-soft); color: var(--shift-alert); }
.kpi-val { font-family: var(--shift-mono); font-size: 22px; font-weight: 800; color: var(--shift-text); line-height: 1; }
.kpi[data-tone="alert"] .kpi-val { color: var(--shift-alert); }
.kpi-lbl { display: block; margin-top: 3px; font-size: 11px; color: var(--shift-text-2); font-weight: 600; }
.kpi-sub { font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); }

.deck-gauge { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.gauge-skel { width: 200px; height: 200px; border-radius: 50%; display: grid; place-items: center; color: var(--shift-text-dim); font-size: 12px; border: 1px dashed var(--shift-border-soft); }
.verdict { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 999px; font-size: 11.5px; font-weight: 600; border: 1px solid transparent; cursor: default; max-width: 100%; }
.verdict b { font-family: var(--shift-mono); }
.verdict small { color: var(--shift-text-muted); }
.verdict.alert { background: var(--shift-alert-soft); color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 30%, transparent); cursor: pointer; }
.verdict.alert:hover { background: color-mix(in srgb, var(--shift-alert) 20%, transparent); }
.verdict.ok { background: var(--shift-ok-soft); color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 26%, transparent); }
.v-go { opacity: 0.8; }
.verdict-enter-active, .verdict-leave-active { transition: opacity 0.3s, transform 0.3s; }
.verdict-enter-from, .verdict-leave-to { opacity: 0; transform: translateY(6px); }

/* ════════════════════ PANELS ════════════════════ */
.panel { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 20px; padding: 18px 20px;
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.p-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.p-head h3 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--shift-text); display: inline-flex; align-items: center; gap: 9px; }
.p-head h3 svg { color: var(--shift-amber); }
.p-meta { font-family: var(--shift-mono); font-size: 11px; padding: 2px 9px; border-radius: 999px; background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.p-meta.alert { background: var(--shift-alert-soft); color: var(--shift-alert); }

.view-toggle { display: inline-flex; gap: 4px; padding: 4px; border-radius: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.vt-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px; border: 0; background: transparent; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--shift-text-muted); transition: 0.2s; }
.vt-btn.on { background: var(--shift-grad-cta); color: #1f1408; }
.btn-mini { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 9px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-2); cursor: pointer; font-size: 12px; font-weight: 600; }
.btn-mini:hover { color: var(--shift-amber); border-color: var(--shift-border); }

.swap-enter-active { transition: opacity 0.35s var(--shift-ease), transform 0.35s var(--shift-ease); }
.swap-leave-active { transition: opacity 0.18s ease; }
.swap-enter-from { opacity: 0; transform: translateY(12px); }
.swap-leave-to { opacity: 0; }

/* ════════════════════ RIDGE ════════════════════ */
.ridge-wrap { min-height: 220px; }
.ridge { position: relative; }
.ridge-cap { margin: 0 0 14px; font-size: 10.5px; color: var(--shift-text-dim); }
.ridge-cap b { font-family: var(--shift-mono); color: var(--shift-text-muted); }
.ridge-track { display: flex; gap: 5px; align-items: flex-end; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
.ridge-track::-webkit-scrollbar { height: 6px; } .ridge-track::-webkit-scrollbar-thumb { background: var(--shift-border-soft); border-radius: 3px; }
.col { position: relative; flex: 1 0 24px; min-width: 24px; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: default; }
.col.clickable { cursor: pointer; }
.col-now { position: absolute; top: -14px; font-family: var(--shift-mono); font-size: 7px; font-weight: 800; letter-spacing: 0.1em; color: var(--shift-ember-strong); animation: shift-ring-pulse 2s ease-out infinite; padding: 1px 4px; border-radius: 4px; background: var(--shift-warn-soft); }
.col-hol { position: absolute; top: 1px; right: 1px; z-index: 4; display: grid; place-items: center; width: 15px; height: 15px; border-radius: 5px; color: var(--shift-amber-strong); background: var(--shift-warn-soft); border: 1px solid color-mix(in srgb, var(--shift-amber) 32%, transparent); }
.col.holiday .col-bar { border-style: dashed; border-color: color-mix(in srgb, var(--shift-amber) 38%, transparent); }
.cap-ic { vertical-align: -2px; color: var(--shift-amber); margin: 0 2px; }
.col-bar { position: relative; width: 100%; max-width: 30px; height: 150px; border-radius: 8px 8px 4px 4px; background: rgba(148,163,184,0.06); border: 1px solid var(--shift-border-soft); overflow: hidden; }
.col.today .col-bar { box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--shift-amber) 50%, transparent); }
.col.wknd .col-bar { opacity: 0.62; }
.col-reqline { position: absolute; left: -2px; right: -2px; height: 0; border-top: 1.5px dashed color-mix(in srgb, var(--shift-text-muted) 60%, transparent); z-index: 3; }
.col-reqline i { position: absolute; right: 0; top: -2px; width: 4px; height: 4px; border-radius: 50%; background: var(--shift-text-muted); }
.col-fill { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 0 0 4px 4px; transition: height 1.1s var(--shift-ease); overflow: hidden; }
.col-shine { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.28), transparent 40%); }
.col.ok .col-fill { background: linear-gradient(180deg, var(--shift-ok), color-mix(in srgb, var(--shift-ok) 60%, #065f46)); }
.col.warn .col-fill { background: linear-gradient(180deg, var(--shift-amber), var(--shift-ember-strong)); }
.col.alert .col-fill { background: linear-gradient(180deg, var(--shift-ember), var(--shift-alert)); }
.col.off .col-fill { background: rgba(148,163,184,0.18); }
.col-gap { position: absolute; left: 0; right: 0; z-index: 2; background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--shift-alert) 26%, transparent) 0 4px, transparent 4px 8px); transition: height 1.1s var(--shift-ease), bottom 1.1s var(--shift-ease); }
.col-num { font-family: var(--shift-mono); font-size: 9.5px; font-weight: 700; color: var(--shift-text-2); }
.col-num i { color: var(--shift-text-dim); font-style: normal; }
.col.alert .col-num { color: var(--shift-alert); }
.col-dow { font-family: var(--shift-mono); font-size: 8px; text-transform: uppercase; color: var(--shift-text-dim); }
.col-day { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text-muted); }
.col.today .col-day { color: var(--shift-amber); }

/* ════════════════════ GRID HEATMAP ════════════════════ */
.heat-scroll { overflow-x: auto; padding-bottom: 4px; }
.heat-grid { display: grid; gap: 4px; min-width: 560px; }
.hg-corner { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-dim); align-self: end; padding-bottom: 4px; }
.hg-day { text-align: center; font-family: var(--shift-mono); font-size: 11px; color: var(--shift-text-2); display: flex; flex-direction: column; }
.hg-day small { font-size: 8px; color: var(--shift-text-dim); }
.hg-day.wknd { color: var(--shift-text-dim); }
.hg-day.today { color: var(--shift-amber); }
.hg-day.holiday { color: var(--shift-amber-strong); }
.hg-holdot { display: block; width: 4px; height: 4px; border-radius: 50%; background: var(--shift-amber); margin: 2px auto 0; }
.hg-row-label { font-size: 11.5px; color: var(--shift-text-2); display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
.hg-cell { aspect-ratio: 1; min-height: 28px; border-radius: 7px; display: grid; place-items: center; font-family: var(--shift-mono); font-size: 9px; font-weight: 700; border: 1px solid transparent;
  animation: wf-cell-in 0.45s var(--shift-ease) backwards; animation-delay: calc(var(--ci) * 0.018s); }
.hg-cell.ok { background: var(--shift-ok-soft); color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 24%, transparent); }
.hg-cell.warn { background: var(--shift-warn-soft); color: var(--shift-ember-strong); border-color: color-mix(in srgb, var(--shift-ember) 26%, transparent); }
.hg-cell.alert { background: var(--shift-alert-soft); color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 30%, transparent); }
.hg-cell.off { background: rgba(148,163,184,0.07); color: transparent; }
.hg-cell.hot { cursor: pointer; }
.hg-cell.hot:hover { transform: scale(1.12); box-shadow: 0 0 0 2px color-mix(in srgb, var(--shift-alert) 40%, transparent); z-index: 2; }
.hg-cell.hol { box-shadow: inset 0 2.5px 0 color-mix(in srgb, var(--shift-amber) 45%, transparent); }
.heat-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 14px; }
.lg { font-size: 10px; color: var(--shift-text-muted); display: inline-flex; align-items: center; gap: 5px; }
.lg::before { content: ''; width: 9px; height: 9px; border-radius: 3px; }
.lg.ok::before { background: var(--shift-ok); } .lg.warn::before { background: var(--shift-ember); } .lg.alert::before { background: var(--shift-alert); } .lg.off::before { background: rgba(148,163,184,0.3); }
.lg.hol::before { background: var(--shift-amber-strong); border-radius: 50%; }
.lg-hint { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--shift-text-dim); }

/* ════════════════════ DEMANDS + FOCUS ════════════════════ */
.cols { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; align-items: start; }
.dem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.dcard { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 14px; border-radius: 15px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.dcard:hover { border-color: var(--shift-border); }
.dc-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--shift-text-dim); }
.dcard[data-tone="ok"] .dc-edge { background: var(--shift-ok); }
.dcard[data-tone="warn"] .dc-edge { background: var(--shift-amber); }
.dcard[data-tone="alert"] .dc-edge { background: var(--shift-alert); }
.dc-top { display: flex; align-items: center; gap: 10px; }
.dc-code { font-family: var(--shift-mono); font-size: 10px; font-weight: 800; padding: 3px 7px; border-radius: 6px; background: rgba(251,191,36,0.13); color: var(--shift-amber); flex-shrink: 0; }
.dc-id { min-width: 0; flex: 1; }
.dc-id b { display: block; font-size: 13px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-id small { font-size: 10px; color: var(--shift-text-muted); }
.dc-act { display: flex; gap: 4px; flex-shrink: 0; }
.ic { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-muted); cursor: pointer; display: inline-grid; place-items: center; }
.ic:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.ic.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); background: var(--shift-alert-soft); }
.dc-need { display: flex; align-items: baseline; justify-content: space-between; font-size: 11px; color: var(--shift-text-muted); }
.dc-need b { font-family: var(--shift-mono); font-size: 16px; font-weight: 800; color: var(--shift-text); }
.dc-have.muted b, .dc-have.muted { color: var(--shift-text-dim); font-size: 11px; }
.dc-meter { height: 7px; border-radius: 999px; background: rgba(148,163,184,0.12); overflow: hidden; }
.dcm-fill { display: block; height: 100%; border-radius: 999px; transition: width 1.1s var(--shift-ease); }
.dcm-fill.ok { background: var(--shift-ok); } .dcm-fill.warn { background: linear-gradient(90deg, var(--shift-amber), var(--shift-ember-strong)); }
.dcm-fill.alert { background: var(--shift-alert); } .dcm-fill.idle { background: var(--shift-text-dim); }
.dc-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dc-win { display: inline-flex; align-items: center; gap: 5px; font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-dim); }
.dc-staff { display: inline-flex; align-items: center; gap: 2px; padding: 4px 8px; border-radius: 7px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; font-size: 10.5px; font-weight: 700; }
.dc-staff:hover { background: color-mix(in srgb, var(--shift-alert) 22%, transparent); }

.focus { align-self: stretch; }
.focus-list { display: flex; flex-direction: column; gap: 8px; }
.frow { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.2s, background 0.2s; }
.frow:hover { border-color: color-mix(in srgb, var(--shift-alert) 36%, transparent); }
.fr-rank { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; font-family: var(--shift-mono); font-size: 11px; font-weight: 800; background: var(--shift-alert-soft); color: var(--shift-alert); }
.fr-body { flex: 1; min-width: 0; }
.fr-body b { display: block; font-size: 12.5px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-body small { font-size: 10px; color: var(--shift-text-muted); }
.fr-gap { text-align: right; flex-shrink: 0; }
.fr-gap b { display: block; font-family: var(--shift-mono); font-size: 14px; font-weight: 800; color: var(--shift-alert); line-height: 1; }
.fr-gap i { font-style: normal; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-dim); }
.fr-go { color: var(--shift-text-dim); flex-shrink: 0; }
.frow:hover .fr-go { color: var(--shift-alert); }
.focus-clear { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 26px 16px; }
.fc-ring { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; color: var(--shift-ok); background: var(--shift-ok-soft); border: 1px solid color-mix(in srgb, var(--shift-ok) 26%, transparent); animation: shift-ring-pulse 2.6s ease-out infinite; }
.focus-clear b { font-size: 14px; color: var(--shift-text); }
.focus-clear p { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--shift-text-muted); max-width: 230px; }

@keyframes wf-cell-in { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }

/* ════════════════════ RIDGE HOVER TOOLTIP ════════════════════ */
.wf-tip { position: fixed; z-index: 5500; transform: translate(-50%, -100%); width: 214px; pointer-events: none;
  display: flex; flex-direction: column; gap: 9px; padding: 12px 14px; border-radius: 15px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border);
  box-shadow: 0 22px 50px -18px rgba(0,0,0,0.72); backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.wf-tip.alert { border-color: color-mix(in srgb, var(--shift-alert) 42%, transparent); }
.wf-tip.warn { border-color: color-mix(in srgb, var(--shift-amber) 42%, transparent); }
.wf-tip.ok { border-color: color-mix(in srgb, var(--shift-ok) 38%, transparent); }
.wt-arrow { position: absolute; left: 50%; bottom: -6px; width: 11px; height: 11px; transform: translateX(-50%) rotate(45deg);
  background: var(--shift-surface-2); border-right: 1px solid var(--shift-border); border-bottom: 1px solid var(--shift-border); }
.wf-tip.alert .wt-arrow { border-color: color-mix(in srgb, var(--shift-alert) 42%, transparent); }
.wf-tip.warn .wt-arrow { border-color: color-mix(in srgb, var(--shift-amber) 42%, transparent); }
.wf-tip.ok .wt-arrow { border-color: color-mix(in srgb, var(--shift-ok) 38%, transparent); }

.wt-head { display: flex; align-items: center; gap: 7px; }
.wt-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--shift-text-dim); }
.wf-tip.alert .wt-dot { background: var(--shift-alert); box-shadow: 0 0 7px var(--shift-alert); }
.wf-tip.warn .wt-dot { background: var(--shift-amber); box-shadow: 0 0 7px var(--shift-amber); }
.wf-tip.ok .wt-dot { background: var(--shift-ok); box-shadow: 0 0 7px var(--shift-ok); }
.wt-head b { font-size: 12.5px; font-weight: 700; color: var(--shift-text); flex: 1; white-space: nowrap; }
.wt-hol { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; color: var(--shift-amber-strong); background: var(--shift-warn-soft); padding: 2px 6px; border-radius: 999px; white-space: nowrap; }

.wt-mid { display: flex; align-items: baseline; gap: 8px; }
.wt-big { font-family: var(--shift-mono); font-size: 23px; font-weight: 900; color: var(--shift-text); line-height: 1; letter-spacing: -0.02em; }
.wt-big i { font-style: normal; font-size: 13px; color: var(--shift-text-dim); }
.wt-heads { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }

.wt-bar { height: 6px; border-radius: 999px; background: rgba(148,163,184,0.16); overflow: hidden; }
.wt-fill { display: block; height: 100%; border-radius: 999px; width: 0; transition: width 0.55s var(--shift-ease) 0.06s; }
.wf-tip.alert .wt-fill { background: linear-gradient(90deg, var(--shift-ember), var(--shift-alert)); }
.wf-tip.warn .wt-fill { background: linear-gradient(90deg, var(--shift-amber), var(--shift-ember-strong)); }
.wf-tip.ok .wt-fill { background: var(--shift-ok); }

.wt-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.wt-pill { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
.wt-pill.alert { background: var(--shift-alert-soft); color: var(--shift-alert); }
.wt-pill.ok { background: var(--shift-ok-soft); color: var(--shift-ok); }
.wt-pill.off { background: rgba(148,163,184,0.14); color: var(--shift-text-muted); }
.wt-pct { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text-2); }
.wt-note { font-size: 9.5px; line-height: 1.4; color: var(--shift-text-muted); border-top: 1px dashed var(--shift-border-soft); padding-top: 7px; }

.wf-tip-enter-active { transition: opacity .2s var(--shift-ease), transform .3s var(--shift-spring); }
.wf-tip-leave-active { transition: opacity .14s ease, transform .14s ease; }
.wf-tip-enter-from, .wf-tip-leave-to { opacity: 0; transform: translate(-50%, calc(-100% + 10px)) scale(0.92); }

[data-theme="light"] .wf-tip { background: rgba(255,250,240,0.97); box-shadow: 0 22px 50px -18px rgba(40,25,10,0.3); }
[data-theme="light"] .wt-arrow { background: rgba(255,250,240,0.97); }
[data-theme="light"] .wt-bar { background: rgba(40,32,20,0.12); }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 1040px) {
  .deck-layout { grid-template-columns: 1fr; }
  .deck-gauge { order: -1; }
  .cols { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .kpis { grid-template-columns: 1fr 1fr; }
  .controls { gap: 8px; }
  .ctrl-spacer { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .deck-grid-bg, .eb-dot, .col-now, .fc-ring { animation: none !important; }
  .col-fill, .col-gap, .dcm-fill, .g-arc { transition: none !important; }
  .hg-cell { animation: none !important; }
}

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .deck {
  background:
    radial-gradient(120% 120% at 82% -10%, rgba(234,88,12,0.10), transparent 55%),
    linear-gradient(165deg, #fff8ec 0%, #fdeed8 62%, #f7e6cf 100%);
}
[data-theme="light"] .kpi { background: rgba(255,255,255,0.55); }
[data-theme="light"] .kpi-shimmer { background: linear-gradient(120deg, transparent 40%, rgba(217,119,6,0.1) 50%, transparent 60%); }
[data-theme="light"] .col-bar { background: rgba(40,32,20,0.05); }
[data-theme="light"] .dc-meter { background: rgba(40,32,20,0.1); }
[data-theme="light"] .col-shine { background: linear-gradient(180deg, rgba(255,255,255,0.4), transparent 45%); }
</style>
