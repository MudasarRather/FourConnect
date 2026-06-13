<template>
  <section class="ros">
    <Motion as="header" class="ros-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><CalendarRange :size="12" /> Weekly manpower plan</span>
        <h2>Weekly Rosters</h2>
        <p>Lay out who works which shift across a week, then publish — published entries become one-day assignments the attendance rollup honours.</p>
      </div>
      <div class="banner-actions">
        <button class="btn-primary" @click="newRoster"><Plus :size="14" />New roster</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <div class="ros-toolbar">
      <select v-model="selectedId" class="ros-select" @change="loadRoster">
        <option value="">Select a roster…</option>
        <option v-for="r in rosters" :key="r.id" :value="r.id">
          Week of {{ r.week_start }} · {{ r.department_name || 'All depts' }} · {{ r.status }}
        </option>
      </select>
      <template v-if="roster">
        <ShiftStatusPill :tone="roster.status === 'PUBLISHED' ? 'ok' : 'gold'">{{ roster.status }}</ShiftStatusPill>
        <span class="flex-spacer" />
        <button v-if="roster.status === 'DRAFT'" class="btn-ghost" :disabled="saving" @click="saveGrid"><Save :size="13" /> Save grid</button>
        <button v-if="roster.status === 'DRAFT'" class="btn-primary" :disabled="publishing" @click="publish">
          <Loader2 v-if="publishing" :size="13" class="spin" /><Send v-else :size="13" /> Publish
        </button>
      </template>
    </div>

    <div v-if="roster" class="grid-card">
      <div class="grid-scroll">
        <table class="rgrid">
          <thead>
            <tr>
              <th class="rg-emp-head">Employee</th>
              <th v-for="d in weekDays" :key="d.iso" :class="{ wknd: d.weekday >= 5 }">
                <span class="dh-dow">{{ d.dow }}</span><span class="dh-num">{{ d.num }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.employee_id">
              <td class="rg-emp"><span class="rg-av">{{ initials(row.full_name) }}</span>{{ row.full_name }}</td>
              <td v-for="d in weekDays" :key="d.iso" class="rg-cell">
                <select :value="cellVal(row.employee_id, d.iso)" :disabled="roster.status !== 'DRAFT'"
                  class="cell-select" :class="cellClass(row.employee_id, d.iso)"
                  @change="setCell(row.employee_id, d.iso, $event.target.value)">
                  <option value="">—</option>
                  <option value="OFF">OFF</option>
                  <option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.code }}</option>
                </select>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="8" class="rg-empty">Add employees to start building the roster.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="roster.status === 'DRAFT'" class="add-row">
        <Search :size="13" />
        <input v-model="empSearch" placeholder="Add employee to roster…" @input="onSearch" />
        <div v-if="empSearch && empResults.length" class="add-results">
          <button v-for="e in empResults" :key="e.id" @click="addRow(e)">
            <span class="ar-av">{{ initials(e.full_name) }}</span>{{ e.full_name }} <small>{{ e.department_name }}</small>
          </button>
        </div>
      </div>
    </div>

    <ShiftEmptyState v-else-if="!loading" :icon="CalendarRange"
      title="No roster selected"
      sub="Create a new weekly roster or pick an existing one to lay out the manpower plan.">
      <template #actions><button class="btn-primary" @click="newRoster"><Plus :size="14" />Create this week's roster</button></template>
    </ShiftEmptyState>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { CalendarRange, RefreshCw, Plus, Save, Send, Search, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import {
  fetchRosters, fetchRoster, createRoster, upsertRosterEntries, publishRoster,
  fetchShifts, fetchEmployeesLite, mondayOf, DOW_FULL,
} from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const rosters = ref([])
const roster = ref(null)
const selectedId = ref('')
const shifts = ref([])
const loading = ref(false)
const saving = ref(false)
const publishing = ref(false)

// grid state: map `${emp}|${dayIso}` -> shiftId | 'OFF' | ''  (in-memory edits)
const cells = reactive({})
const rows = ref([])           // [{ employee_id, full_name }]
const empSearch = ref('')
const empResults = ref([])

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const weekDays = computed(() => {
  if (!roster.value) return []
  const start = new Date(roster.value.week_start + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i)
    return { iso: iso(d), dow: DOW_FULL[i], num: d.getDate(), weekday: i }
  })
})

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const cellKey = (emp, day) => `${emp}|${day}`
const cellVal = (emp, day) => cells[cellKey(emp, day)] ?? ''
const cellClass = (emp, day) => {
  const v = cells[cellKey(emp, day)]
  if (v === 'OFF') return 'is-off'
  if (v) return 'is-set'
  return ''
}
const setCell = (emp, day, val) => { cells[cellKey(emp, day)] = val }

const reload = async () => {
  loading.value = true
  try {
    const [rs, sh] = await Promise.all([fetchRosters({ limit: 100 }), fetchShifts({ limit: 100 })])
    rosters.value = rs.items || []
    shifts.value = sh.items || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rosters') }
  finally { loading.value = false }
}
onMounted(reload)

const hydrateGrid = (r) => {
  for (const k of Object.keys(cells)) delete cells[k]
  const seen = {}
  const rws = []
  for (const e of (r.entries || [])) {
    cells[cellKey(e.employee_id, e.day)] = e.shift_id || 'OFF'
    if (!seen[e.employee_id]) { seen[e.employee_id] = true; rws.push({ employee_id: e.employee_id, full_name: e.employee_name || 'Employee' }) }
  }
  rows.value = rws
}

const loadRoster = async () => {
  if (!selectedId.value) { roster.value = null; return }
  try {
    const r = await fetchRoster(selectedId.value)
    roster.value = r
    hydrateGrid(r)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load roster') }
}

const newRoster = async () => {
  try {
    const ws = iso(mondayOf(new Date()))
    const r = await createRoster({ week_start: ws, name: `Week of ${ws}` })
    toast.success('Draft roster created')
    await reload()
    selectedId.value = r.id
    await loadRoster()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not create roster') }
}

let timer = null
const onSearch = () => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (!empSearch.value.trim()) { empResults.value = []; return }
    try { empResults.value = (await fetchEmployeesLite(empSearch.value.trim())).slice(0, 8) } catch { empResults.value = [] }
  }, 250)
}
const addRow = (e) => {
  if (!rows.value.find(r => r.employee_id === e.id)) rows.value.push({ employee_id: e.id, full_name: e.full_name })
  empSearch.value = ''; empResults.value = []
}

const saveGrid = async () => {
  if (!roster.value) return
  saving.value = true
  try {
    const entries = []
    for (const row of rows.value) {
      for (const d of weekDays.value) {
        const v = cells[cellKey(row.employee_id, d.iso)]
        if (v === undefined || v === '') continue
        entries.push({ employee_id: row.employee_id, day: d.iso, shift_id: v === 'OFF' ? null : v })
      }
    }
    const r = await upsertRosterEntries(roster.value.id, entries)
    roster.value = r; hydrateGrid(r)
    toast.success(`Saved ${entries.length} cell${entries.length === 1 ? '' : 's'}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save grid') }
  finally { saving.value = false }
}

const publish = async () => {
  if (!roster.value) return
  publishing.value = true
  try {
    await saveGrid()
    const res = await publishRoster(roster.value.id)
    toast.success(`Published · ${res.assignments_written} assignment${res.assignments_written === 1 ? '' : 's'} written`)
    await reload(); await loadRoster(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not publish') }
  finally { publishing.value = false }
}
</script>

<style scoped>
.ros { display: flex; flex-direction: column; gap: 16px; }
.ros-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.banner-actions { position: relative; z-index: 1; display: flex; gap: 8px; flex-shrink: 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; }
.btn-primary:disabled { opacity: 0.6; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; }
.btn-ghost:disabled { opacity: 0.6; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.ros-toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.ros-select { padding: 8px 12px; border-radius: 9px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; min-width: 280px; }
.flex-spacer { flex: 1; }

.grid-card { border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); overflow: hidden; }
.grid-scroll { overflow-x: auto; }
.rgrid { width: 100%; border-collapse: collapse; min-width: 680px; }
.rgrid th { padding: 10px 8px; border-bottom: 1px solid var(--shift-border-soft); text-align: center; }
.rg-emp-head { text-align: left !important; padding-left: 16px !important; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); }
.rgrid th.wknd { background: rgba(148,163,184,0.05); }
.dh-dow { display: block; font-size: 9px; text-transform: uppercase; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.dh-num { font-size: 13px; font-weight: 700; color: var(--shift-text-2); }
.rg-emp { display: flex; align-items: center; gap: 8px; padding: 9px 16px; font-size: 12.5px; color: var(--shift-text); border-bottom: 1px solid var(--shift-border-soft); white-space: nowrap; }
.rg-av { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); flex-shrink: 0; }
.rg-cell { padding: 6px; border-bottom: 1px solid var(--shift-border-soft); text-align: center; }
.cell-select { width: 70px; padding: 6px 4px; border-radius: 8px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); font: inherit; font-size: 11px; cursor: pointer; text-align: center; }
.cell-select.is-set { border-color: var(--shift-amber); color: var(--shift-amber); background: rgba(251,191,36,0.08); }
.cell-select.is-off { color: var(--shift-text-dim); }
.cell-select:disabled { opacity: 0.7; cursor: default; }
.rg-empty { text-align: center; padding: 28px; color: var(--shift-text-dim); font-size: 12.5px; }

.add-row { position: relative; display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); }
.add-row input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.add-results { position: absolute; left: 16px; right: 16px; bottom: calc(100% - 4px); z-index: 5; background: var(--shift-surface-2); border: 1px solid var(--shift-border); border-radius: 12px; overflow: hidden; box-shadow: 0 -10px 30px -12px rgba(0,0,0,0.5); }
.add-results button { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 9px 12px; background: transparent; border: 0; cursor: pointer; color: var(--shift-text-2); font-size: 12.5px; }
.add-results button:hover { background: rgba(251,191,36,0.08); }
.add-results small { margin-left: auto; color: var(--shift-text-dim); font-size: 10.5px; }
.ar-av { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
</style>
