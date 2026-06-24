<template>
  <section class="studio">
    <!-- ═══════════════ COMMAND HEADER ═══════════════ -->
    <Motion as="header" class="cmd" :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, ease: [0.16,1,0.3,1] }">
      <span class="cmd-grid" aria-hidden="true" />
      <span class="cmd-ticks" aria-hidden="true" />
      <span class="cmd-playhead" aria-hidden="true" />
      <span class="cmd-scan" aria-hidden="true" />
      <span class="cmd-glow" aria-hidden="true" />

      <div class="cmd-left">
        <span class="cmd-eyebrow"><span class="eye-dot" /> ROSTER STUDIO · MANPOWER PLANNER</span>
        <h2 class="cmd-title">Weekly Rosters</h2>
        <p class="cmd-sub">Lay out who works which shift across a week, then publish — published entries become one-day assignments the attendance rollup honours.</p>
      </div>

      <div class="cmd-right">
        <div class="readouts">
          <div class="ro" v-for="r in readouts" :key="r.key" :data-tone="r.tone">
            <span class="ro-ic"><component :is="r.icon" :size="14" /></span>
            <span class="ro-meta"><ShiftCountUp class="ro-val" :value="r.value" /><small>{{ r.label }}</small></span>
          </div>
        </div>
        <div class="cmd-actions">
          <button class="btn-primary" @click="showCreate = true"><Plus :size="15" /><span>New roster</span></button>
          <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="15" /></button>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════ ROSTER RAIL ═══════════════ -->
    <Motion as="div" class="rail" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.08 }">
      <div class="rail-head">
        <span class="rail-eyebrow"><CalendarRange :size="12" /> ROSTER WEEKS</span>
        <span class="rail-hint" v-if="rosters.length">{{ rosters.length }} planned</span>
      </div>
      <div class="rail-track">
        <button class="rail-new" @click="showCreate = true">
          <span class="rn-plus"><Plus :size="18" /></span>
          <span>New week</span>
        </button>
        <Motion v-for="(r, i) in rosters" :key="r.id" as="button" type="button" class="rcard"
          :class="{ on: selectedId === r.id }"
          :initial="{ opacity: 0, y: 18, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.45, delay: 0.12 + i * 0.05, ease: [0.16,1,0.3,1] }"
          :whileHover="{ y: -4 }" :whileTap="{ scale: 0.98 }"
          @click="select(r)">
          <span class="rcard-glow" aria-hidden="true" />
          <div class="rcard-top">
            <span class="rcard-range">{{ rosterRange(r) }}</span>
            <span class="rcard-status" :data-pub="isPub(r)">{{ r.status }}</span>
          </div>
          <div class="rcard-dept">{{ r.department_name || 'All departments' }}</div>
          <div class="rcard-foot">
            <span class="rcard-cells"><LayoutGrid :size="11" /> {{ r.entry_count ?? 0 }} cells</span>
            <span class="rcard-del" @click.stop="askDelete(r)" title="Delete"><Trash2 :size="12" /></span>
          </div>
          <span class="rcard-fill" :style="{ width: fillPct(r) + '%' }" aria-hidden="true" />
        </Motion>
        <span v-if="loading && !rosters.length" v-for="n in 3" :key="'sk'+n" class="rail-skel" />
      </div>
    </Motion>

    <!-- ═══════════════ GRID ═══════════════ -->
    <transition name="studio-swap" mode="out-in">
      <div v-if="roster" :key="roster.id" class="studio-grid-wrap">
        <!-- meta bar -->
        <div class="meta-bar">
          <div class="mb-left">
            <ShiftStatusPill :tone="isDraft ? 'gold' : 'ok'">{{ roster.status }}</ShiftStatusPill>
            <span class="mb-title">{{ roster.name || ('Week of ' + roster.week_start) }}</span>
            <span class="mb-range mono">{{ rosterRange(roster) }}</span>
          </div>
          <div class="mb-right">
            <span v-if="!isDraft" class="mb-locked"><Lock :size="12" /> Published · locked</span>
            <template v-else>
              <button class="btn-ghost sm" :disabled="saving" @click="saveGrid"><Loader2 v-if="saving" :size="13" class="spin" /><Save v-else :size="13" /> Save</button>
              <button class="btn-primary sm" :disabled="publishing" @click="publish"><Loader2 v-if="publishing" :size="13" class="spin" /><Send v-else :size="13" /> Publish</button>
            </template>
            <button class="btn-danger-ghost sm" @click="askDelete(roster)" title="Delete roster"><Trash2 :size="13" /></button>
          </div>
        </div>

        <!-- brush palette (draft only) -->
        <transition name="studio-fade">
          <div v-if="isDraft" class="palette">
            <span class="pal-label"><Brush :size="12" /> Pick a brush — then click, or <b>drag across cells</b> to sweep-fill</span>
            <div class="pal-brushes">
              <button v-for="b in brushes" :key="b.key" type="button" class="brush" :class="{ on: activeBrush === b.key, erase: b.erase, off: b.off }"
                :style="b.color ? { '--c': b.color } : {}" @click="activeBrush = b.key">
                <Moon v-if="b.off" :size="12" /><Eraser v-else-if="b.erase" :size="12" /><span v-else class="brush-dot" />
                {{ b.label }}
              </button>
            </div>
          </div>
        </transition>

        <!-- the grid -->
        <div class="grid-card">
          <div class="sg-scroll">
            <div class="sg-inner" :class="{ painting: painting && isDraft }">
              <!-- header -->
              <div class="sg-rowgrid sg-head">
                <div class="sg-emp-head">Employee</div>
                <button v-for="d in weekDays" :key="d.iso" type="button" class="sg-dayhead" :class="{ wknd: d.weekday >= 5, today: d.isToday }"
                  :disabled="!isDraft" :title="isDraft ? 'Fill column with brush' : ''" @click="fillColumn(d.iso)">
                  <span class="dh-dow">{{ d.dow }}</span><span class="dh-num">{{ d.num }}</span>
                </button>
                <div class="sg-sum-head">Σ</div>
              </div>

              <!-- rows -->
              <TransitionGroup tag="div" class="sg-rows" name="rrow" appear>
                <div v-for="(row, ri) in rows" :key="row.employee_id" class="sg-rowgrid sg-row" :style="{ '--i': Math.min(ri, 16) }">
                  <div class="sg-emp">
                    <span class="sg-av">{{ initials(row.full_name) }}</span>
                    <span class="sg-name">{{ row.full_name }}</span>
                    <span v-if="isDraft" class="sg-emp-tools">
                      <button title="Fill row" @click="fillRow(row.employee_id)"><Wand2 :size="12" /></button>
                      <button title="Remove" @click="removeRow(row.employee_id)"><X :size="12" /></button>
                    </span>
                  </div>
                  <div v-for="d in weekDays" :key="d.iso" class="sg-cell"
                    :class="[cellState(row.employee_id, d.iso), { wknd: d.weekday >= 5, ro: !isDraft, painted: paintedKey === cellKey(row.employee_id, d.iso) }]"
                    @mousedown.prevent="startPaint(row.employee_id, d.iso)" @mouseenter="enterPaint(row.employee_id, d.iso)">
                    <span v-if="cellVal(row.employee_id, d.iso) === 'OFF'" class="cc-off"><Moon :size="11" /></span>
                    <span v-else-if="shiftMap[cellVal(row.employee_id, d.iso)]" class="cc-shift" :style="{ '--c': colorOf(cellVal(row.employee_id, d.iso)) }">{{ shiftMap[cellVal(row.employee_id, d.iso)].code }}</span>
                    <span v-else class="cc-empty"><Plus :size="12" /></span>
                  </div>
                  <div class="sg-sum">
                    <b>{{ rowShiftCount(row.employee_id) }}</b><small>{{ rowHours(row.employee_id) }}h</small>
                  </div>
                </div>
              </TransitionGroup>

              <!-- empty rows -->
              <div v-if="!rows.length" class="sg-empty">
                <Users :size="16" /> Add employees below to start building the roster.
              </div>

              <!-- coverage footer -->
              <div v-if="rows.length" class="sg-rowgrid sg-foot">
                <div class="sg-foot-label"><Radar :size="12" /> Coverage</div>
                <div v-for="d in weekDays" :key="d.iso" class="sg-cov" :class="{ wknd: d.weekday >= 5 }">
                  <span class="cov-num" :class="{ zero: dayCount(d.iso) === 0 }">{{ dayCount(d.iso) }}</span>
                  <span class="cov-bar"><span class="cov-fill" :style="{ height: covPct(d.iso) + '%' }" /></span>
                </div>
                <div class="sg-foot-total"><b>{{ totalShiftCells }}</b></div>
              </div>
            </div>
          </div>

          <!-- add employee -->
          <div v-if="isDraft" class="add-row">
            <Search :size="14" />
            <input v-model="empSearch" placeholder="Add employee to roster…" @input="onSearch" />
            <transition name="studio-fade">
              <div v-if="empSearch && empResults.length" class="add-results">
                <button v-for="e in empResults" :key="e.id" @click="addRow(e)">
                  <span class="ar-av">{{ initials(e.full_name) }}</span>
                  <span class="ar-meta"><b>{{ e.full_name }}</b><small>{{ e.department_name || '—' }}</small></span>
                  <Plus :size="13" />
                </button>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <ShiftEmptyState v-else-if="!loading" key="empty" :icon="CalendarRange"
        title="No roster selected"
        sub="Create a new weekly roster or pick a week above to lay out the manpower plan.">
        <template #actions><button class="btn-primary" @click="showCreate = true"><Plus :size="14" />Create this week's roster</button></template>
      </ShiftEmptyState>
    </transition>

    <ShiftRosterCreateModal :open="showCreate" @close="showCreate = false" @created="onCreated" />
    <ShiftRosterDeleteModal :open="showDelete" :roster="deleteTarget" :busy="deleteBusy"
      @cancel="showDelete = false" @confirm="confirmDelete" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  CalendarRange, RefreshCw, Plus, Save, Send, Search, Loader2, Trash2, Moon, Eraser,
  X, Brush, Wand2, Users, Radar, LayoutGrid, Lock, FileEdit, CalendarCheck, Layers3,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import ShiftRosterCreateModal from '../modals/ShiftRosterCreateModal.vue'
import ShiftRosterDeleteModal from '../modals/ShiftRosterDeleteModal.vue'
import {
  fetchRosters, fetchRoster, deleteRoster, upsertRosterEntries, publishRoster,
  fetchShifts, fetchEmployeesLite, shiftTypeMeta, DOW_FULL,
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

const cells = reactive({})       // `${emp}|${dayIso}` -> shiftId | 'OFF' | ''
const rows = ref([])             // [{ employee_id, full_name }]
const empSearch = ref('')
const empResults = ref([])

const activeBrush = ref('OFF')
const paintedKey = ref(null)

const showCreate = ref(false)
const showDelete = ref(false)
const deleteTarget = ref(null)
const deleteBusy = ref(false)

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmt = (s) => { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const isPub = (r) => String(r?.status || '').toUpperCase() === 'PUBLISHED'
const rosterRange = (r) => `${fmt(r.week_start)} – ${fmt(r.week_end || r.week_start)}`

const isDraft = computed(() => roster.value && !isPub(roster.value))
const shiftMap = computed(() => Object.fromEntries(shifts.value.map(s => [s.id, s])))
const colorOf = (id) => shiftTypeMeta(shiftMap.value[id]?.shift_type).color

const today = iso(new Date())
const weekDays = computed(() => {
  if (!roster.value) return []
  const start = new Date(roster.value.week_start + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i)
    return { iso: iso(d), dow: DOW_FULL[i], num: d.getDate(), weekday: i, isToday: iso(d) === today }
  })
})

const brushes = computed(() => [
  { key: 'OFF', label: 'OFF', off: true },
  ...shifts.value.map(s => ({ key: s.id, label: s.code, color: shiftTypeMeta(s.shift_type).color })),
  { key: 'ERASE', label: 'Erase', erase: true },
])

const readouts = computed(() => {
  const drafts = rosters.value.filter(r => !isPub(r)).length
  const pub = rosters.value.filter(r => isPub(r)).length
  const cellsPlanned = rosters.value.reduce((a, r) => a + (r.entry_count || 0), 0)
  return [
    { key: 'all', label: 'Rosters', value: rosters.value.length, icon: Layers3, tone: 'gold' },
    { key: 'draft', label: 'Drafts', value: drafts, icon: FileEdit, tone: 'warn' },
    { key: 'pub', label: 'Published', value: pub, icon: CalendarCheck, tone: 'ok' },
    { key: 'cells', label: 'Planned cells', value: cellsPlanned, icon: LayoutGrid, tone: 'gold' },
  ]
})
const fillPct = (r) => {
  const max = Math.max(1, ...rosters.value.map(x => x.entry_count || 0))
  return Math.round(((r.entry_count || 0) / max) * 100)
}

// ── cell helpers ──
const cellKey = (emp, day) => `${emp}|${day}`
const cellVal = (emp, day) => cells[cellKey(emp, day)] ?? ''
const cellState = (emp, day) => {
  const v = cells[cellKey(emp, day)]
  if (v === 'OFF') return 'is-off'
  if (v) return 'is-shift'
  return 'is-empty'
}
// Drag-to-paint: press a cell to start (the first cell decides the operation —
// Sheets/Figma style), then sweep across cells to fill the whole streak.
const painting = ref(false)
const paintMode = ref('')   // value applied for the duration of one drag
const startPaint = (emp, day) => {
  if (!isDraft.value) return
  const k = cellKey(emp, day)
  const cur = cells[k]
  if (activeBrush.value === 'ERASE') paintMode.value = ''
  else if (cur === activeBrush.value) paintMode.value = ''  // re-click clears (toggle)
  else paintMode.value = activeBrush.value
  cells[k] = paintMode.value
  paintedKey.value = k
  painting.value = true
}
const enterPaint = (emp, day) => {
  if (!painting.value || !isDraft.value) return
  const k = cellKey(emp, day)
  if (cells[k] === paintMode.value) return
  cells[k] = paintMode.value
  paintedKey.value = k
}
const stopPaint = () => { painting.value = false }
const fillColumn = (day) => {
  if (!isDraft.value) return
  const v = activeBrush.value === 'ERASE' ? '' : activeBrush.value
  rows.value.forEach(r => { cells[cellKey(r.employee_id, day)] = v })
}
const fillRow = (emp) => {
  if (!isDraft.value) return
  const v = activeBrush.value === 'ERASE' ? '' : activeBrush.value
  weekDays.value.forEach(d => { cells[cellKey(emp, d.iso)] = v })
}
const removeRow = (emp) => {
  rows.value = rows.value.filter(r => r.employee_id !== emp)
  weekDays.value.forEach(d => { delete cells[cellKey(emp, d.iso)] })
}

// ── summaries ──
const toMin = (t) => { if (!t) return 0; const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const shiftHrs = (id) => { const s = shiftMap.value[id]; if (!s) return 0; let a = toMin(s.start_time), b = toMin(s.end_time); if (b <= a) b += 1440; return (b - a) / 60 }
const rowShiftCount = (emp) => weekDays.value.reduce((a, d) => a + (cellVal(emp, d.iso) && cellVal(emp, d.iso) !== 'OFF' ? 1 : 0), 0)
const rowHours = (emp) => Math.round(weekDays.value.reduce((a, d) => { const v = cellVal(emp, d.iso); return a + (v && v !== 'OFF' ? shiftHrs(v) : 0) }, 0))
const dayCount = (day) => rows.value.reduce((a, r) => a + (cellVal(r.employee_id, day) && cellVal(r.employee_id, day) !== 'OFF' ? 1 : 0), 0)
const covPct = (day) => rows.value.length ? Math.round((dayCount(day) / rows.value.length) * 100) : 0
const totalShiftCells = computed(() => weekDays.value.reduce((a, d) => a + dayCount(d.iso), 0))

// ── data ──
const reload = async () => {
  loading.value = true
  try {
    const [rs, sh] = await Promise.all([fetchRosters({ limit: 100 }), fetchShifts({ limit: 100 })])
    rosters.value = rs.items || []
    shifts.value = (sh.items || []).filter(s => s.is_active !== false)
    if (shifts.value.length && (activeBrush.value === 'OFF' || activeBrush.value === 'ERASE')) {
      // keep OFF as default brush; leave as-is
    }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rosters') }
  finally { loading.value = false }
}
onMounted(() => { reload(); window.addEventListener('mouseup', stopPaint) })
onBeforeUnmount(() => window.removeEventListener('mouseup', stopPaint))

const hydrateGrid = (r) => {
  for (const k of Object.keys(cells)) delete cells[k]
  const seen = {}; const rws = []
  for (const e of (r.entries || [])) {
    cells[cellKey(e.employee_id, e.day)] = e.shift_id || 'OFF'
    if (!seen[e.employee_id]) { seen[e.employee_id] = true; rws.push({ employee_id: e.employee_id, full_name: e.employee_name || 'Employee' }) }
  }
  rows.value = rws
}
const loadRoster = async (id) => {
  if (!id) { roster.value = null; return }
  try { const r = await fetchRoster(id); roster.value = r; hydrateGrid(r) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load roster') }
}
const select = async (r) => {
  if (selectedId.value === r.id) return
  selectedId.value = r.id
  await loadRoster(r.id)
}

const onCreated = async (r) => {
  await reload()
  if (r?.id) { selectedId.value = r.id; await loadRoster(r.id) }
  emit('refresh-stats')
}

let timer = null
const onSearch = () => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (!empSearch.value.trim()) { empResults.value = []; return }
    try {
      const all = await fetchEmployeesLite(empSearch.value.trim(), { excludeSeparated: true })
      const have = new Set(rows.value.map(r => r.employee_id))
      empResults.value = all.filter(e => !have.has(e.id)).slice(0, 8)
    } catch { empResults.value = [] }
  }, 250)
}
const addRow = (e) => {
  if (!rows.value.find(r => r.employee_id === e.id)) rows.value.push({ employee_id: e.id, full_name: e.full_name })
  empSearch.value = ''; empResults.value = []
}

const buildEntries = () => {
  const entries = []
  for (const row of rows.value) {
    for (const d of weekDays.value) {
      const v = cells[cellKey(row.employee_id, d.iso)]
      if (v === undefined || v === '') continue
      entries.push({ employee_id: row.employee_id, day: d.iso, shift_id: v === 'OFF' ? null : v })
    }
  }
  return entries
}
const saveGrid = async () => {
  if (!roster.value) return
  saving.value = true
  try {
    const entries = buildEntries()
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
    await upsertRosterEntries(roster.value.id, buildEntries())
    const res = await publishRoster(roster.value.id)
    toast.success(`Published · ${res.assignments_written} assignment${res.assignments_written === 1 ? '' : 's'} written`)
    await reload(); await loadRoster(roster.value.id); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not publish') }
  finally { publishing.value = false }
}

// ── delete ──
const askDelete = (r) => { deleteTarget.value = r; showDelete.value = true }
const confirmDelete = async ({ reason }) => {
  const r = deleteTarget.value
  if (!r) return
  deleteBusy.value = true
  try {
    await deleteRoster(r.id)
    toast.success(`Roster "${rosterRange(r)}" deleted${reason ? ` · ${reason}` : ''}`)
    showDelete.value = false
    if (selectedId.value === r.id) { selectedId.value = ''; roster.value = null }
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete roster') }
  finally { deleteBusy.value = false }
}
</script>

<style scoped>
.studio { display: flex; flex-direction: column; gap: 16px; }

/* ═══ COMMAND HEADER ═══ */
.cmd { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 26px; border-radius: 22px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
/* Distinct "planner timeline" motif (vertical week-columns + a sweeping
   playhead) — sets Rosters apart from the dot-grid headers of the other tabs. */
.cmd-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    repeating-linear-gradient(90deg, var(--shift-grid-line) 0, var(--shift-grid-line) 1px, transparent 1px, transparent 56px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--shift-amber) 16%, transparent) 0, color-mix(in srgb, var(--shift-amber) 16%, transparent) 1px, transparent 1px, transparent 392px);
  opacity: 0.6; mask-image: linear-gradient(180deg, #000, transparent 92%); }
.cmd-ticks { position: absolute; left: 0; right: 0; top: 0; height: 7px; pointer-events: none; z-index: 0;
  background-image: repeating-linear-gradient(90deg, var(--shift-amber-strong) 0, var(--shift-amber-strong) 1px, transparent 1px, transparent 56px);
  opacity: 0.35; mask-image: linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent); }
.cmd-playhead { position: absolute; top: 0; bottom: 0; width: 2px; left: 0; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, transparent, var(--shift-amber), transparent);
  box-shadow: 0 0 14px 1px color-mix(in srgb, var(--shift-amber) 55%, transparent); opacity: 0; animation: cmd-sweep 9s linear infinite; }
@keyframes cmd-sweep { 0% { left: 0; opacity: 0; } 8% { opacity: 0.75; } 92% { opacity: 0.75; } 100% { left: 100%; opacity: 0; } }
.cmd-scan { position: absolute; left: 0; right: 0; top: 0; height: 55%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); pointer-events: none; }
.cmd-glow { position: absolute; inset: 0; pointer-events: none; background: var(--shift-grad-hero); }
.cmd-left { position: relative; z-index: 1; max-width: 600px; }
.cmd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--shift-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.13em; color: var(--shift-amber-strong); }
.eye-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.4s ease-in-out infinite; }
.cmd-title { margin: 8px 0 5px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--shift-text); }
.cmd-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.cmd-right { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.readouts { display: grid; grid-template-columns: repeat(2, auto); gap: 9px; }
.ro { display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 13px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.ro-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.ro[data-tone="ok"] .ro-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.ro[data-tone="warn"] .ro-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.ro-meta { display: flex; flex-direction: column; line-height: 1.1; }
.ro-val { font-size: 17px; font-weight: 800; color: var(--shift-text); }
.ro-meta small { font-size: 9.5px; color: var(--shift-text-muted); white-space: nowrap; }
.cmd-actions { display: flex; gap: 8px; }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 11px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; box-shadow: 0 10px 26px -10px rgba(245,158,11,0.7); transition: transform .2s, box-shadow .25s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 32px -10px rgba(245,158,11,0.85); }
.btn-primary:disabled { opacity: 0.6; }
.btn-primary.sm, .btn-ghost.sm, .btn-danger-ghost.sm { padding: 7px 13px; font-size: 12.5px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 11px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; transition: 0.2s; }
.btn-ghost:hover:not(:disabled) { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost:disabled { opacity: 0.6; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
.btn-danger-ghost { display: inline-flex; align-items: center; gap: 6px; border-radius: 11px; cursor: pointer; background: var(--shift-alert-soft); border: 1px solid color-mix(in srgb, var(--shift-alert) 28%, transparent); color: var(--shift-alert); font-weight: 600; transition: 0.2s; }
.btn-danger-ghost:hover { background: var(--shift-alert); color: #fff; }

/* ═══ ROSTER RAIL ═══ */
.rail { display: flex; flex-direction: column; gap: 11px; }
.rail-head { display: flex; align-items: center; gap: 10px; }
.rail-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--shift-amber-strong); }
.rail-hint { font-size: 11.5px; color: var(--shift-text-muted); }
.rail-track { display: flex; gap: 12px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.rail-track::-webkit-scrollbar { height: 6px; } .rail-track::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.25); border-radius: 3px; }
.rail-new { flex: 0 0 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border-radius: 16px; cursor: pointer;
  background: rgba(251,191,36,0.05); border: 1px dashed var(--shift-border); color: var(--shift-amber); font-size: 12px; font-weight: 600; transition: 0.2s; }
.rail-new:hover { background: rgba(251,191,36,0.12); transform: translateY(-3px); }
.rn-plus { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(251,191,36,0.14); }
.rcard { position: relative; flex: 0 0 220px; display: flex; flex-direction: column; gap: 9px; padding: 14px 15px 16px; border-radius: 16px; cursor: pointer; text-align: left; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s, box-shadow 0.25s; }
.rcard:hover { border-color: var(--shift-border); }
.rcard.on { border-color: var(--shift-amber); box-shadow: 0 14px 34px -18px var(--shift-amber); }
.rcard-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: var(--shift-grad-hero); transition: opacity 0.3s; }
.rcard.on .rcard-glow { opacity: 1; }
.rcard-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative; z-index: 1; }
.rcard-range { font-family: var(--shift-mono); font-size: 13px; font-weight: 800; color: var(--shift-text); }
.rcard-status { font-size: 8.5px; font-family: var(--shift-mono); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 999px; color: var(--shift-amber); background: rgba(251,191,36,0.14); border: 1px solid rgba(251,191,36,0.3); }
.rcard-status[data-pub="true"] { color: var(--shift-ok); background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 30%, transparent); }
.rcard-dept { font-size: 11.5px; color: var(--shift-text-muted); position: relative; z-index: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rcard-foot { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.rcard-cells { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-family: var(--shift-mono); color: var(--shift-text-muted); }
.rcard-del { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--shift-text-dim); transition: 0.18s; }
.rcard-del:hover { background: var(--shift-alert-soft); color: var(--shift-alert); }
.rcard-fill { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--shift-grad-cta); border-radius: 0 3px 0 0; transition: width 0.6s var(--shift-ease); }
.rail-skel { flex: 0 0 220px; height: 110px; border-radius: 16px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ═══ META BAR ═══ */
.studio-grid-wrap { display: flex; flex-direction: column; gap: 14px; }
.meta-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 18px; border-radius: 14px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); flex-wrap: wrap; }
.mb-left { display: flex; align-items: center; gap: 11px; min-width: 0; }
.mb-title { font-size: 14px; font-weight: 700; color: var(--shift-text); }
.mb-range { font-size: 12px; color: var(--shift-text-muted); }
.mb-right { display: flex; align-items: center; gap: 8px; }
.mb-locked { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--shift-ok); padding: 6px 11px; border-radius: 9px; background: var(--shift-ok-soft); border: 1px solid color-mix(in srgb, var(--shift-ok) 28%, transparent); }

/* ═══ BRUSH PALETTE ═══ */
.palette { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 14px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); flex-wrap: wrap; }
.pal-label { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: var(--shift-text-muted); flex-shrink: 0; }
.pal-label svg { color: var(--shift-amber); }
.pal-brushes { display: flex; flex-wrap: wrap; gap: 7px; }
.brush { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 700; font-family: var(--shift-mono);
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.18s; }
.brush:hover { transform: translateY(-1px); border-color: var(--shift-border); }
.brush-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c, var(--shift-amber)); box-shadow: 0 0 8px -1px var(--c, var(--shift-amber)); }
.brush.on { color: var(--shift-text); border-color: var(--c, var(--shift-amber)); background: color-mix(in srgb, var(--c, var(--shift-amber)) 14%, transparent); box-shadow: 0 4px 14px -8px var(--c, var(--shift-amber)); }
.brush.off.on { border-color: var(--shift-text-muted); background: rgba(148,163,184,0.14); }
.brush.erase.on { border-color: var(--shift-alert); background: var(--shift-alert-soft); color: var(--shift-alert); }
.brush.off svg { color: var(--shift-text-muted); } .brush.erase svg { color: var(--shift-alert); }

/* ═══ GRID ═══ */
.grid-card { border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); overflow: hidden; }
.sg-scroll { overflow-x: auto; scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.sg-scroll::-webkit-scrollbar { height: 7px; } .sg-scroll::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.25); border-radius: 4px; }
.sg-inner { min-width: 760px; }
.sg-inner.painting { user-select: none; -webkit-user-select: none; }
.sg-inner.painting .sg-cell:not(.ro) { cursor: crosshair; }
.pal-label b { color: var(--shift-amber); font-weight: 700; }
.sg-rowgrid { display: grid; grid-template-columns: 178px repeat(7, minmax(66px, 1fr)) 92px; align-items: stretch; }
.sg-head { border-bottom: 1px solid var(--shift-border-soft); }
.sg-emp-head { display: flex; align-items: center; padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); }
.sg-dayhead { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 9px 4px; background: none; border: 0; border-left: 1px solid var(--shift-border-soft); cursor: pointer; transition: background 0.18s; }
.sg-dayhead:disabled { cursor: default; }
.sg-dayhead:not(:disabled):hover { background: rgba(251,191,36,0.06); }
.sg-dayhead.wknd { background: rgba(148,163,184,0.05); }
.sg-dayhead.today { background: rgba(251,191,36,0.08); }
.dh-dow { font-size: 9px; text-transform: uppercase; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.sg-dayhead.today .dh-dow { color: var(--shift-amber); }
.dh-num { font-size: 13px; font-weight: 700; color: var(--shift-text-2); }
.sg-sum-head { display: flex; align-items: center; justify-content: center; font-family: var(--shift-mono); font-size: 12px; color: var(--shift-text-dim); border-left: 1px solid var(--shift-border-soft); }

.sg-rows { display: flex; flex-direction: column; }
.sg-row { border-bottom: 1px solid var(--shift-border-soft); }
.sg-row:hover { background: rgba(251,191,36,0.025); }
.sg-emp { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 12px 8px 16px; min-width: 0; }
.sg-av { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 10px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.sg-name { font-size: 12.5px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sg-emp-tools { margin-left: auto; display: flex; gap: 3px; opacity: 0; transition: opacity 0.2s; flex-shrink: 0; }
.sg-emp:hover .sg-emp-tools { opacity: 1; }
.sg-emp-tools button { width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; transition: 0.15s; }
.sg-emp-tools button:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.sg-emp-tools button:last-child:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }

.sg-cell { display: grid; place-items: center; padding: 6px 4px; border-left: 1px solid var(--shift-border-soft); cursor: pointer; min-height: 42px; transition: background 0.15s; }
.sg-cell.ro { cursor: default; }
.sg-cell.wknd { background: rgba(148,163,184,0.03); }
.sg-cell.is-empty:not(.ro):hover { background: rgba(251,191,36,0.07); }
.cc-empty { color: var(--shift-text-dim); opacity: 0.35; display: grid; place-items: center; transition: opacity 0.18s; }
.sg-cell:hover .cc-empty { opacity: 0.7; }
.cc-off { display: inline-grid; place-items: center; width: 28px; height: 24px; border-radius: 7px; color: var(--shift-text-dim); background: rgba(148,163,184,0.1); }
.cc-shift { display: inline-grid; place-items: center; min-width: 40px; padding: 4px 8px; border-radius: 8px; font-family: var(--shift-mono); font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
  color: var(--c, var(--shift-amber)); background: color-mix(in srgb, var(--c, var(--shift-amber)) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c, var(--shift-amber)) 36%, transparent); }
.sg-cell.painted .cc-shift, .sg-cell.painted .cc-off { animation: cell-pop 0.42s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes cell-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
.sg-sum { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; border-left: 1px solid var(--shift-border-soft); }
.sg-sum b { font-family: var(--shift-mono); font-size: 14px; font-weight: 800; color: var(--shift-text); line-height: 1.1; }
.sg-sum small { font-size: 9px; font-family: var(--shift-mono); color: var(--shift-text-dim); }

.sg-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 32px; color: var(--shift-text-dim); font-size: 12.5px; }
.sg-empty svg { color: var(--shift-amber); }

.sg-foot { border-top: 1px solid var(--shift-border); background: var(--shift-surface-2); }
.sg-foot-label { display: flex; align-items: center; gap: 7px; padding: 10px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.sg-foot-label svg { color: var(--shift-amber); }
.sg-cov { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; padding: 7px 4px; border-left: 1px solid var(--shift-border-soft); }
.sg-cov.wknd { background: rgba(148,163,184,0.04); }
.cov-num { font-family: var(--shift-mono); font-size: 13px; font-weight: 800; color: var(--shift-ok); }
.cov-num.zero { color: var(--shift-text-dim); }
.cov-bar { width: 6px; height: 22px; border-radius: 3px; background: var(--shift-border-soft); overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
.cov-fill { width: 100%; background: var(--shift-grad-rail); border-radius: 3px; transition: height 0.6s var(--shift-ease); }
.sg-foot-total { display: grid; place-items: center; border-left: 1px solid var(--shift-border-soft); font-family: var(--shift-mono); font-weight: 800; color: var(--shift-amber); }

/* add employee */
.add-row { position: relative; display: flex; align-items: center; gap: 9px; padding: 12px 16px; border-top: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); }
.add-row input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.add-results { position: absolute; left: 16px; right: 16px; bottom: calc(100% - 4px); z-index: 5; background: var(--shift-surface-2); border: 1px solid var(--shift-border); border-radius: 12px; overflow: hidden; box-shadow: 0 -12px 34px -12px rgba(0,0,0,0.55); }
.add-results button { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; padding: 9px 12px; background: transparent; border: 0; cursor: pointer; color: var(--shift-text-2); font-size: 12.5px; transition: background 0.15s; }
.add-results button:hover { background: rgba(251,191,36,0.08); }
.add-results button svg { margin-left: auto; color: var(--shift-amber); }
.ar-av { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); flex-shrink: 0; }
.ar-meta { display: flex; flex-direction: column; min-width: 0; }
.ar-meta b { color: var(--shift-text); }
.ar-meta small { font-size: 10.5px; color: var(--shift-text-dim); }

.mono { font-family: var(--shift-mono); }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

/* ═══ TRANSITIONS ═══ */
.rrow-enter-active { transition: opacity .4s var(--shift-ease), transform .4s var(--shift-ease); transition-delay: calc(var(--i, 0) * 0.03s); }
.rrow-enter-from { opacity: 0; transform: translateY(12px); }
.rrow-leave-active { transition: opacity .3s var(--shift-ease), transform .3s var(--shift-ease); }
.rrow-leave-to { opacity: 0; transform: translateX(24px); }
.rrow-move { transition: transform .4s var(--shift-ease); }
.studio-swap-enter-active { transition: opacity .3s var(--shift-ease), transform .3s var(--shift-ease); }
.studio-swap-leave-active { transition: opacity .18s ease; }
.studio-swap-enter-from { opacity: 0; transform: translateY(10px); }
.studio-swap-leave-to { opacity: 0; }
.studio-fade-enter-active { transition: opacity .3s var(--shift-ease), transform .3s var(--shift-ease); }
.studio-fade-leave-active { transition: opacity .18s ease; }
.studio-fade-enter-from { opacity: 0; transform: translateY(-6px); }
.studio-fade-leave-to { opacity: 0; }

@media (max-width: 980px) { .cmd { flex-direction: column; align-items: flex-start; } .cmd-right { width: 100%; align-items: stretch; } .readouts { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 620px) { .readouts { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .cmd-grid, .cmd-playhead, .eye-dot { animation: none; } .cmd-playhead { opacity: 0; } .sg-cell.painted .cc-shift, .sg-cell.painted .cc-off { animation: none; } }

/* ═══ LIGHT THEME ═══ */
[data-theme="light"] .cmd-scan { background: linear-gradient(180deg, transparent, rgba(217,119,6,0.06), transparent); }
[data-theme="light"] .ro-ic { background: rgba(217,119,6,0.14); color: var(--shift-amber-strong); }
[data-theme="light"] .sg-row:hover { background: rgba(217,119,6,0.04); }
[data-theme="light"] .cc-off { background: rgba(40,32,20,0.08); }
[data-theme="light"] .btn-danger-ghost { color: var(--shift-alert); }
</style>
