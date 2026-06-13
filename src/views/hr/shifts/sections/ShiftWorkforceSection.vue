<template>
  <section class="wf">
    <Motion as="header" class="wf-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><TrendingUp :size="12" /> Forecast &amp; capacity</span>
        <h2>Workforce Planning</h2>
        <p>Declare required headcount per shift over a window, then project it against assigned capacity day-by-day. Shortfalls surface before they happen.</p>
      </div>
      <div class="banner-actions">
        <button class="btn-primary" @click="openCreate"><Plus :size="14" />New demand</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <!-- controls -->
    <div class="controls">
      <div class="horizon">
        <button v-for="h in HORIZONS" :key="h" class="hbtn" :class="{ on: horizon === h }" @click="horizon = h; loadForecast()">{{ h }}d</button>
      </div>
      <select v-model="deptFilter" class="wf-select" @change="reload"><option value="">All departments</option><option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option></select>
      <span class="flex-spacer" />
    </div>

    <!-- summary -->
    <div class="kpis" v-if="forecast">
      <div class="kpi" :class="coverTone(forecast.summary.coverage_pct)"><b>{{ forecast.summary.coverage_pct }}%</b><span>Projected coverage</span></div>
      <div class="kpi"><b>{{ forecast.summary.total_shortfall }}</b><span>Total shortfall (heads·days)</span></div>
      <div class="kpi" :class="forecast.summary.shortfall_days ? 'warn' : 'ok'"><b>{{ forecast.summary.shortfall_days }}</b><span>Shortfall days</span></div>
      <div class="kpi"><b class="sm">{{ forecast.summary.worst_shift || '—' }}</b><span>Most understaffed</span></div>
    </div>

    <!-- forecast heatmap -->
    <div class="heat-card" v-if="rows.length">
      <div class="heat-head">
        <h3>Coverage forecast</h3>
        <div class="legend"><span class="lg ok">≥100%</span><span class="lg warn">60–99%</span><span class="lg alert">&lt;60%</span><span class="lg off">off</span></div>
      </div>
      <div class="heat-scroll">
        <div class="heat-grid" :style="{ gridTemplateColumns: `180px repeat(${days.length}, minmax(34px, 1fr))` }">
          <span class="hg-corner">Demand</span>
          <span v-for="d in days" :key="'h'+d.date" class="hg-day" :class="{ wknd: d.weekday >= 5 }">
            <small>{{ DOW[d.weekday] }}</small>{{ dayNum(d.date) }}
          </span>
          <template v-for="r in rows" :key="r.demand_id">
            <span class="hg-row-label" :title="r.label">{{ r.label }}</span>
            <span v-for="d in days" :key="r.demand_id + d.date" class="hg-cell" :class="cellClass(r, d.date)"
              :title="cellTip(r, d.date)">{{ cellText(r, d.date) }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- demand list -->
    <div class="dem-card">
      <div class="dc-head"><h3>Demand entries <span class="dc-count">{{ demands.length }}</span></h3></div>
      <div v-if="demands.length" class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Shift</th><th>Department</th><th>Required</th><th>Window</th><th>Skill</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in demands" :key="d.id">
              <td><span class="st-code">{{ d.shift_code }}</span> {{ d.shift_name }}</td>
              <td>{{ d.department_name || 'All' }}</td>
              <td class="mono">{{ d.required_headcount }}</td>
              <td class="mono">{{ d.valid_from }} → {{ d.valid_to || 'open' }}</td>
              <td>{{ d.skill || '—' }}</td>
              <td class="ta-act">
                <button class="ic" @click="openEdit(d)"><Pencil :size="13" /></button>
                <button class="ic danger" @click="del(d)"><Trash2 :size="13" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ShiftEmptyState v-else :icon="TrendingUp" title="No demand declared yet"
        sub="Add a demand entry — e.g. ‘Night shift needs 10 heads, Jun 1–30’ — to project staffing gaps.">
        <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />New demand</button></template>
      </ShiftEmptyState>
    </div>

    <ShiftDemandModal :open="showModal" :demand="editTarget" @close="showModal = false" @saved="reload" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { TrendingUp, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftDemandModal from '../modals/ShiftDemandModal.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchWorkforceDemands, deleteWorkforceDemand, fetchWorkforceForecast, fetchDepartments, todayIso, isoOffsetDays } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const demands = ref([])
const forecast = ref(null)
const departments = ref([])
const loading = ref(false)
const horizon = ref(14)
const deptFilter = ref('')
const showModal = ref(false)
const editTarget = ref(null)

const HORIZONS = [7, 14, 30]
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const dayNum = (iso) => Number(iso.split('-')[2])

const days = computed(() => forecast.value?.days || [])
// pivot: unique demands → row with per-date cell
const rows = computed(() => {
  const map = {}
  for (const day of days.value) {
    for (const c of day.cells) {
      if (!map[c.demand_id]) map[c.demand_id] = { demand_id: c.demand_id, label: c.label, byDate: {} }
      map[c.demand_id].byDate[day.date] = c
    }
  }
  return Object.values(map)
})
const cellOf = (r, dateIso) => r.byDate[dateIso] || null
const cellText = (r, dateIso) => { const c = cellOf(r, dateIso); return c ? `${c.assigned}/${c.required}` : '' }
const cellTip = (r, dateIso) => { const c = cellOf(r, dateIso); return c ? `${dateIso} · ${c.assigned} of ${c.required} (${Math.round(c.ratio*100)}%)` : `${dateIso} · off` }
const cellClass = (r, dateIso) => {
  const c = cellOf(r, dateIso)
  if (!c) return 'off'
  if (c.ratio >= 1) return 'ok'
  if (c.ratio >= 0.6) return 'warn'
  return 'alert'
}
const coverTone = (pct) => pct >= 100 ? 'ok' : (pct >= 60 ? 'warn' : 'alert')

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
onMounted(async () => { try { departments.value = await fetchDepartments() } catch { /* */ } ; await reload() })

const openCreate = () => { editTarget.value = null; showModal.value = true }
const openEdit = (d) => { editTarget.value = d; showModal.value = true }
const del = async (d) => {
  if (!window.confirm(`Delete demand for ${d.shift_name}?`)) return
  try { await deleteWorkforceDemand(d.id); toast.success('Demand deleted'); await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
}
</script>

<style scoped>
.wf { display: flex; flex-direction: column; gap: 16px; }
.wf-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 660px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.banner-actions { position: relative; z-index: 1; display: flex; gap: 8px; flex-shrink: 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.controls { display: flex; align-items: center; gap: 12px; }
.horizon { display: inline-flex; gap: 4px; padding: 4px; border-radius: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.hbtn { padding: 6px 12px; border-radius: 8px; border: 0; background: transparent; color: var(--shift-text-muted); cursor: pointer; font-size: 12px; font-weight: 600; font-family: var(--shift-mono); }
.hbtn.on { background: var(--shift-grad-cta); color: #1f1408; }
.wf-select { padding: 8px 12px; border-radius: 9px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; }
.flex-spacer { flex: 1; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi { padding: 14px 16px; border-radius: 14px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.kpi b { display: block; font-family: var(--shift-mono); font-size: 24px; font-weight: 800; color: var(--shift-text); }
.kpi b.sm { font-size: 14px; }
.kpi span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-muted); }
.kpi.ok b { color: var(--shift-ok); } .kpi.warn b { color: var(--shift-ember-strong); } .kpi.alert b { color: var(--shift-alert); }
@media (max-width: 900px) { .kpis { grid-template-columns: 1fr 1fr; } }

.heat-card, .dem-card { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 16px 18px; }
.heat-head, .dc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.heat-head h3, .dc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); display: inline-flex; align-items: center; gap: 8px; }
.legend { display: flex; gap: 10px; }
.lg { font-size: 10px; color: var(--shift-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.lg::before { content: ''; width: 9px; height: 9px; border-radius: 3px; }
.lg.ok::before { background: var(--shift-ok); } .lg.warn::before { background: var(--shift-ember); } .lg.alert::before { background: var(--shift-alert); } .lg.off::before { background: rgba(148,163,184,0.25); }

.heat-scroll { overflow-x: auto; }
.heat-grid { display: grid; gap: 4px; min-width: 600px; }
.hg-corner { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-text-dim); align-self: end; padding-bottom: 4px; }
.hg-day { text-align: center; font-family: var(--shift-mono); font-size: 11px; color: var(--shift-text-2); display: flex; flex-direction: column; }
.hg-day small { font-size: 8px; color: var(--shift-text-dim); }
.hg-day.wknd { color: var(--shift-text-dim); }
.hg-row-label { font-size: 11.5px; color: var(--shift-text-2); display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
.hg-cell { aspect-ratio: 1; min-height: 30px; border-radius: 7px; display: grid; place-items: center; font-family: var(--shift-mono); font-size: 9.5px; font-weight: 700; border: 1px solid transparent; }
.hg-cell.ok { background: var(--shift-ok-soft); color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 24%, transparent); }
.hg-cell.warn { background: var(--shift-warn-soft); color: var(--shift-ember-strong); border-color: color-mix(in srgb, var(--shift-ember) 26%, transparent); }
.hg-cell.alert { background: var(--shift-alert-soft); color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 30%, transparent); }
.hg-cell.off { background: rgba(148,163,184,0.07); color: transparent; }

.tbl-wrap { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); padding: 10px 14px; border-bottom: 1px solid var(--shift-border-soft); }
.tbl td { padding: 10px 14px; border-bottom: 1px solid var(--shift-border-soft); font-size: 13px; color: var(--shift-text-2); }
.tbl tbody tr:hover td { background: rgba(251,191,36,0.04); }
.st-code { font-family: var(--shift-mono); font-size: 10px; padding: 2px 7px; border-radius: 6px; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.mono { font-family: var(--shift-mono); font-size: 12px; color: var(--shift-text-muted); }
.dc-count { font-family: var(--shift-mono); font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.ta-act { text-align: right; white-space: nowrap; }
.ic { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: inline-grid; place-items: center; margin-left: 5px; }
.ic:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.ic.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }
</style>
