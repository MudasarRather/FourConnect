<template>
  <div class="grid-wrap sd-card">
    <span class="gw-accent" aria-hidden="true" />

    <!-- grid toolbar -->
    <div class="grid-bar">
      <div class="gb-left">
        <span v-if="selected.length" class="sel-count"><CheckCheck :size="13" /> {{ selected.length }} selected</span>
        <span v-else class="sel-count muted">{{ sorted.length }} {{ sorted.length === 1 ? 'ticket' : 'tickets' }}</span>
        <span class="gb-live"><i /> live</span>
      </div>
      <div class="gb-right">
        <button class="gb-btn" :class="{ on: density === 'compact' }" @click="toggleDensity" title="Row density">
          <Rows3 :size="14" /> {{ density === 'compact' ? 'Compact' : 'Comfortable' }}
        </button>
        <div class="gb-cols" ref="colsRef">
          <button class="gb-btn" :class="{ on: colsOpen }" @click="colsOpen = !colsOpen"><Columns3 :size="14" /> Columns</button>
          <Presence>
            <Motion v-if="colsOpen" class="cols-pop" :initial="{ opacity: 0, y: -6, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: -6 }" :transition="{ duration: 0.18 }">
              <p class="cp-h">Optional columns</p>
              <button v-for="k in OPTIONAL_KEYS" :key="k" class="col-opt" :class="{ on: visible.has(k) }" @click="toggleCol(k)">
                <span class="col-chk"><Check v-if="visible.has(k)" :size="12" /></span>{{ COLUMN_DEFS[k].label }}
              </button>
            </Motion>
          </Presence>
        </div>
      </div>
    </div>

    <div class="grid-scroll">
      <!-- CSS-Grid lattice: header + every row share the SAME `--cols` track list,
           so a value can only ever sit under its own heading. No <table> column
           inference, no drift. -->
      <div class="lattice" :class="density" :style="{ '--cols': templateColumns }">
        <!-- header -->
        <div class="lat-head">
          <div
            v-for="col in cols" :key="col.key"
            class="lh-cell" :class="['lh-' + col.render, { sortable: col.sortable, sorted: sort.key === col.key }]"
            @click="col.sortable && setSort(col.key)"
          >
            <label v-if="col.render === 'sel'" class="sel-all" :class="{ some: someSelected && !allSelected }" @click.stop>
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              <span class="cbx"><Check :size="11" /></span>
            </label>
            <span v-else-if="col.render === 'act'" class="th-act-lbl">Actions</span>
            <span v-else class="th-in">{{ col.label }}
              <component v-if="col.sortable" :is="sort.key === col.key ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown" :size="12" class="th-sort" />
            </span>
          </div>
        </div>

        <!-- rows -->
        <div
          v-for="(t, i) in sorted" :key="t.id"
          class="lat-row row" :class="{ sel: selSet.has(t.id), flash: flashId === t.id, crit: t.priority === 'critical' && !isTerminal(t), esc: t.is_escalated }"
          :style="{ '--sc': statusColor(t.status), '--pc': priColor(t.priority), '--i': i }"
          @click="$emit('open', t.id)"
        >
          <div v-for="col in cols" :key="col.key" class="lc-cell" :class="'lc-' + col.render">
            <!-- select -->
            <label v-if="col.render === 'sel'" class="row-cbx" :class="{ on: selSet.has(t.id) }" @click.stop>
              <input type="checkbox" :checked="selSet.has(t.id)" @change="toggle(t.id)" />
              <span class="cbx"><Check :size="11" /></span>
            </label>
            <!-- hover quick actions -->
            <div v-else-if="col.render === 'act'" class="row-acts" @click.stop>
              <button class="ra" title="Open ticket" @click="$emit('open', t.id)"><Maximize2 :size="13" /></button>
              <template v-if="caps.agent && !isTerminal(t)">
                <button v-if="!t.assigned_agent_id" class="ra" title="Assign to me" @click="$emit('action', { id: t.id, kind: 'assignMe' })"><UserCheck :size="13" /></button>
                <button v-if="!t.is_escalated" class="ra warn" title="Escalate" @click="$emit('action', { id: t.id, kind: 'escalate' })"><Flame :size="13" /></button>
                <button class="ra" title="Internal note" @click="$emit('action', { id: t.id, kind: 'note' })"><StickyNote :size="13" /></button>
                <button class="ra ok" title="Resolve" @click="$emit('action', { id: t.id, kind: 'resolve' })"><CircleCheck :size="13" /></button>
              </template>
            </div>
            <!-- ticket number -->
            <template v-else-if="col.render === 'number'">
              <span class="tn sd-mono">{{ t.ticket_number || '—' }}</span>
              <span v-if="t.merged_into_id" class="merged" title="Merged into another ticket"><GitMerge :size="10" /></span>
            </template>
            <!-- subject -->
            <template v-else-if="col.render === 'subject'">
              <span class="subj">{{ t.subject || 'Untitled ticket' }}</span>
              <span class="subj-meta">
                <span v-if="t.is_escalated" class="sm esc"><Flame :size="9" />L{{ t.escalation_level }}</span>
                <span v-if="t.reopened_count" class="sm" title="Reopened"><RotateCcw :size="9" />{{ t.reopened_count }}</span>
                <span v-if="t.comment_count" class="sm" title="Messages"><MessageSquare :size="9" />{{ t.comment_count }}</span>
                <span v-for="tag in (t.tags || []).slice(0, 2)" :key="tag" class="sm tag">{{ tag }}</span>
              </span>
            </template>
            <!-- priority / status -->
            <SdPill v-else-if="col.render === 'priority'" kind="priority" :value="t.priority" />
            <SdPill v-else-if="col.render === 'status'" kind="status" :value="t.status" />
            <!-- requester -->
            <span v-else-if="col.render === 'requester'" class="who">
              <span class="ava">{{ initials(t.raised_by_name || t.contact_name || t.organization_name) }}</span>
              <span class="who-txt">{{ t.raised_by_name || t.contact_name || t.organization_name || '—' }}</span>
            </span>
            <!-- agent -->
            <span v-else-if="col.render === 'agent'" class="who">
              <template v-if="t.assigned_agent_name"><span class="ava agent">{{ initials(t.assigned_agent_name) }}</span><span class="who-txt">{{ t.assigned_agent_name }}</span></template>
              <span v-else class="unassigned">Unassigned</span>
            </span>
            <!-- impact / urgency -->
            <span v-else-if="col.render === 'impact'" class="cap">{{ cap(t.impact) }}</span>
            <span v-else-if="col.render === 'urgency'" class="cap">{{ cap(t.urgency) }}</span>
            <!-- category / team -->
            <span v-else-if="col.render === 'category'" class="cap">{{ t.category_name || '—' }}</span>
            <span v-else-if="col.render === 'team'" class="cap">{{ t.support_team || t.team_name || '—' }}</span>
            <!-- time -->
            <span v-else-if="col.render === 'time'" class="cap mono">{{ fmtMins(t.time_spent_minutes) }}</span>
            <!-- sla -->
            <span v-else-if="col.render === 'sla'" class="sla-chip" :class="slaCell(t).state">
              <span class="sla-ring" :style="{ '--sd-p': slaCell(t).angle }" aria-hidden="true" />
              <span class="sla-txt">{{ slaCell(t).label }}</span>
            </span>
            <!-- updated / created -->
            <span v-else-if="col.render === 'updated'" class="age">{{ ago(t.updated_at) }}</span>
            <span v-else-if="col.render === 'created'" class="age">{{ ago(t.created_at) }}</span>
            <!-- defensive fallback -->
            <span v-else class="cap">{{ t[col.key] ?? '—' }}</span>
          </div>
        </div>
      </div>

      <!-- empty -->
      <div v-if="!sorted.length" class="grid-empty">
        <span class="ge-orb"><Inbox :size="26" /></span>
        <p class="ge-t">No tickets in this view</p>
        <p class="ge-s">Clear a filter or switch lens — anything matching will surface here instantly.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Check, CheckCheck, Rows3, Columns3, ChevronUp, ChevronDown, ChevronsUpDown, Flame, RotateCcw, MessageSquare,
  Maximize2, UserCheck, StickyNote, CircleCheck, GitMerge, Inbox,
} from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { statusColor as stColor, priorityColor as prColor } from '@/composables/useSupportDesk'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  caps: { type: Object, default: () => ({ agent: false, manage: false }) },
  panel: { type: String, default: 'employee' },
  selected: { type: Array, default: () => [] },
})
const emit = defineEmits(['open', 'action', 'update:selected'])

const statusColor = (s) => stColor(s)
const priColor = (p) => prColor(p)
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)

/* ── ONE column dictionary — headers and cells both iterate the same `cols`,
   so a column label and its data can never drift apart. ── */
const COLUMN_DEFS = {
  number: { label: 'Ticket', sortable: true, render: 'number' },
  subject: { label: 'Subject', sortable: true, render: 'subject' },
  priority: { label: 'Priority', sortable: true, render: 'priority' },
  status: { label: 'Status', sortable: true, render: 'status' },
  requester: { label: 'Requester', sortable: false, render: 'requester' },
  agent: { label: 'Agent', sortable: false, render: 'agent' },
  category: { label: 'Category', sortable: false, render: 'category' },
  impact: { label: 'Impact', sortable: false, render: 'impact' },
  urgency: { label: 'Urgency', sortable: false, render: 'urgency' },
  team: { label: 'Team', sortable: false, render: 'team' },
  time: { label: 'Time spent', sortable: false, render: 'time' },
  sla: { label: 'SLA', sortable: true, render: 'sla' },
  updated: { label: 'Updated', sortable: true, render: 'updated' },
  created: { label: 'Created', sortable: true, render: 'created' },
}
const BASE_ORDER = ['number', 'subject', 'priority', 'status', 'requester', 'sla', 'updated']
const OPTIONAL_KEYS = ['agent', 'category', 'impact', 'urgency', 'team', 'time', 'created']

const STORE = 'sd.wb.cols'
const loadVisible = () => {
  try { const v = JSON.parse(localStorage.getItem(STORE)); if (Array.isArray(v)) return new Set(v.filter(k => OPTIONAL_KEYS.includes(k))) } catch { /* */ }
  return new Set(['agent', 'category'])
}
const visible = ref(loadVisible())
const colsOpen = ref(false)
const colsRef = ref(null)
const toggleCol = (k) => {
  const s = new Set(visible.value); s.has(k) ? s.delete(k) : s.add(k); visible.value = s
  try { localStorage.setItem(STORE, JSON.stringify([...s])) } catch { /* */ }
}
// Build ONE ordered list — select + data columns + actions all live in `cols`, so the
// header `<th v-for>` and body `<td v-for>` iterate the exact same array (no static cells
// around the loop → header & body can never fall out of step). Mirrors SdTicketTable.
const cols = computed(() => {
  const out = [{ key: '__sel', render: 'sel', label: '', sortable: false }]
  for (const key of BASE_ORDER) {
    out.push({ key, ...COLUMN_DEFS[key] })
    if (key === 'requester') {
      for (const ok of OPTIONAL_KEYS) {
        if (ok === 'created') continue
        if (visible.value.has(ok)) out.push({ key: ok, ...COLUMN_DEFS[ok] })
      }
    }
  }
  if (visible.value.has('created')) out.push({ key: 'created', ...COLUMN_DEFS.created })
  return out
})

// One width per render type — header row and data rows share this SAME track list
// (via --cols). Flexible columns use minmax(MINpx, fr): they grow to fill width but NEVER
// shrink below a readable minimum — so on a narrow container (rail eats width) the grid
// overflows and `.grid-scroll` scrolls horizontally instead of crushing cells into each
// other. Same behaviour as the /all <table min-width> — clean, no overlap.
const COL_W = {
  sel: '40px', number: '116px', subject: 'minmax(240px, 2fr)', priority: '110px', status: '128px',
  requester: 'minmax(160px, 1.2fr)', agent: 'minmax(150px, 1.1fr)', category: 'minmax(130px, 1fr)',
  impact: '92px', urgency: '92px', team: 'minmax(130px, 1fr)', time: '96px', sla: '110px', updated: '86px', created: '86px',
}
const templateColumns = computed(() => cols.value.map(c => COL_W[c.render] || 'minmax(0, 1fr)').join(' '))

const onColsOutside = (e) => { if (colsRef.value && !colsRef.value.contains(e.target)) colsOpen.value = false }
onMounted(() => window.addEventListener('mousedown', onColsOutside))
onBeforeUnmount(() => window.removeEventListener('mousedown', onColsOutside))

/* ── density ── */
const density = ref(localStorage.getItem('sd.wb.density') || 'comfortable')
const toggleDensity = () => { density.value = density.value === 'compact' ? 'comfortable' : 'compact'; try { localStorage.setItem('sd.wb.density', density.value) } catch { /* */ } }

/* ── sort ── */
const sort = ref({ key: 'updated', dir: 'desc' })
const setSort = (key) => {
  if (sort.value.key === key) sort.value = { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
  else sort.value = { key, dir: key === 'subject' || key === 'number' ? 'asc' : 'desc' }
}
const PRI_RANK = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const ST_RANK = { open: 1, in_progress: 2, escalated: 3, pending_customer: 4, pending_vendor: 5, on_hold: 6, resolved: 7, closed: 8 }
const sortVal = (t, key) => {
  switch (key) {
    case 'number': return t.ticket_number || ''
    case 'subject': return (t.subject || '').toLowerCase()
    case 'priority': return PRI_RANK[t.priority] || 0
    case 'status': return ST_RANK[t.status] || 0
    case 'sla': return t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 9e15
    case 'created': return new Date(t.created_at).getTime()
    default: return new Date(t.updated_at).getTime()
  }
}
const sorted = computed(() => {
  const arr = [...props.rows]
  const { key, dir } = sort.value
  arr.sort((a, b) => {
    const va = sortVal(a, key), vb = sortVal(b, key)
    const c = va < vb ? -1 : va > vb ? 1 : 0
    return dir === 'asc' ? c : -c
  })
  return arr
})

/* ── selection ── */
const selSet = computed(() => new Set(props.selected))
const allSelected = computed(() => sorted.value.length > 0 && sorted.value.every(t => selSet.value.has(t.id)))
const someSelected = computed(() => props.selected.length > 0)
const toggle = (id) => { const s = new Set(props.selected); s.has(id) ? s.delete(id) : s.add(id); emit('update:selected', [...s]) }
const toggleAll = () => { allSelected.value ? emit('update:selected', []) : emit('update:selected', sorted.value.map(t => t.id)) }

/* ── row-flash on live update ── */
const seen = new Map()
const flashId = ref(null)
let flashTimer = null
watch(() => props.rows, (rows) => {
  for (const t of rows) {
    const prev = seen.get(t.id)
    if (prev && prev !== t.updated_at) { flashId.value = t.id; if (flashTimer) clearTimeout(flashTimer); flashTimer = setTimeout(() => { flashId.value = null }, 1400) }
    seen.set(t.id, t.updated_at)
  }
}, { deep: false })
onBeforeUnmount(() => { if (flashTimer) clearTimeout(flashTimer) })

/* ── cell helpers ── */
const cap = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '—')
const initials = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—'
const fmtMins = (m) => { if (!m) return '—'; if (m < 60) return `${m}m`; return `${Math.floor(m / 60)}h ${m % 60}m` }
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'; if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`
}
const slaCell = (t) => {
  if (isTerminal(t)) { const met = !t.sla_resolution_breached; return { state: met ? 'met' : 'breached', angle: '360deg', label: met ? 'Met' : 'Late' } }
  if (!t.resolution_due_at) return { state: 'none', angle: '0deg', label: 'No SLA' }
  const due = new Date(t.resolution_due_at).getTime(), created = new Date(t.created_at).getTime()
  const total = Math.max(1, due - created), remain = due - props.now
  const frac = Math.max(0, Math.min(1, remain / total)), breached = remain <= 0
  const state = breached ? 'breached' : (frac < 0.25 ? 'due-soon' : 'ok')
  const abs = Math.abs(remain), h = abs / 3600000
  let label
  if (h >= 48) label = `${Math.round(h / 24)}d`
  else if (h >= 1) label = `${Math.round(h)}h`
  else label = `${Math.max(1, Math.round(abs / 60000))}m`
  label = breached ? `${label} over` : `${label} left`
  return { state, angle: `${(breached ? 1 : frac) * 360}deg`, label }
}
</script>

<style scoped>
.grid-wrap { position: relative; overflow: hidden; }
.gw-accent { position: absolute; inset: 0 0 auto 0; height: 2px; background: var(--sd-grad-rail); background-size: 200% 100%; opacity: 0.55; animation: sd-rail-flow 6s linear infinite; }

/* toolbar */
.grid-bar { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 15px; border-bottom: 1px solid var(--sd-border); }
.gb-left { display: flex; align-items: center; gap: 13px; }
.sel-count { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--sd-amber); }
.sel-count.muted { color: var(--sd-text-muted); font-weight: 600; }
.gb-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-success); }
.gb-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); animation: sd-breathe 2s ease-in-out infinite; }
.gb-right { display: flex; align-items: center; gap: 8px; }
.gb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.18s; }
.gb-btn:hover, .gb-btn.on { color: var(--sd-text); border-color: var(--sd-amber-border); }
.gb-cols { position: relative; }
.cols-pop { position: absolute; right: 0; top: calc(100% + 6px); z-index: 40; display: flex; flex-direction: column; gap: 2px; padding: 7px; border-radius: 12px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); min-width: 184px; }
.cp-h { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-dim); margin: 4px 8px 4px; }
.col-opt { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 8px; font-size: 12.5px; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: none; border: none; text-align: left; }
.col-opt:hover { background: var(--sd-amber-soft); color: var(--sd-text); }
.col-chk { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--sd-border-strong); color: var(--sd-amber); flex-shrink: 0; }
.col-opt.on .col-chk { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }

/* ── CSS-Grid lattice — header + rows share one --cols track list ── */
.grid-scroll { overflow-x: auto; }
.lattice { width: 100%; }
.lat-head, .lat-row { display: grid; grid-template-columns: var(--cols); align-items: center; }

/* header */
.lat-head { position: sticky; top: 0; z-index: 2; background: var(--sd-surface-glass); backdrop-filter: blur(10px); border-bottom: 1px solid var(--sd-border); }
.lh-cell { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; padding: 11px 12px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-muted); white-space: nowrap; }
.lh-cell .th-in { overflow: hidden; text-overflow: ellipsis; }
.lh-cell.sortable { cursor: pointer; user-select: none; transition: color 0.16s; }
.lh-cell.sortable:hover { color: var(--sd-text-secondary); }
.lh-cell.sorted { color: var(--sd-amber); }
.lh-sel { justify-content: center; padding-left: 0; padding-right: 0; }
.lh-act { justify-content: flex-end; }
.th-act-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-dim); }
.th-in { display: inline-flex; align-items: center; gap: 5px; }
.th-sort { opacity: 0.55; }
.lh-cell.sorted .th-sort { opacity: 1; }

/* rows */
.lat-row { position: relative; cursor: pointer; border-bottom: 1px solid var(--sd-border); transition: background 0.16s;
  animation: sd-deal 0.5s var(--sd-spring) both; animation-delay: min(calc(var(--i, 0) * 0.022s), 0.5s); }
.lat-row::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sc); opacity: 0.5; transition: opacity 0.18s, width 0.18s; z-index: 1; }
.lat-row::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--pc) 8%, transparent) 45%, transparent); transition: opacity 0.24s; }
.lat-row:hover { background: color-mix(in srgb, var(--sd-amber) 5%, transparent); }
.lat-row:hover::before { opacity: 1; width: 4px; }
.lat-row:hover::after { opacity: 1; }
.lat-row.sel { background: var(--sd-amber-soft); }
.lat-row.crit::before { animation: sd-breach-flash 2.2s ease-out infinite; opacity: 1; }
.lat-row.flash { animation: row-flash 1.4s var(--sd-spring); }
@keyframes row-flash { 0% { background: color-mix(in srgb, var(--sd-success) 26%, transparent); } 100% { background: transparent; } }

.lc-cell { display: flex; align-items: center; min-width: 0; overflow: hidden; padding: 12px; font-size: 13px; color: var(--sd-text); }
.lattice.compact .lc-cell { padding: 7px 12px; font-size: 12.5px; }
.lattice.compact .lh-cell { padding: 7px 12px; }
.lc-sel { justify-content: center; padding-left: 0; padding-right: 0; }
.lc-act { justify-content: flex-end; }
.lc-subject { display: block; }

.row-cbx, .sel-all { position: relative; display: inline-grid; place-items: center; cursor: pointer; }
.row-cbx input, .sel-all input { position: absolute; opacity: 0; width: 0; height: 0; }
.cbx { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; color: transparent; background: var(--sd-surface); border: 1.5px solid var(--sd-border-strong); transition: all 0.18s var(--sd-spring); }
.row-cbx.on .cbx, .sel-all input:checked + .cbx { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .row-cbx.on .cbx, [data-theme="light"] .sel-all input:checked + .cbx { color: #fff8ec; }
.sel-all.some .cbx { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }

.tn { font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.merged { display: inline-flex; margin-left: 5px; color: var(--sd-text-dim); vertical-align: middle; }
.td-subject { max-width: 320px; }
.subj { display: block; font-weight: 650; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.subj-meta { display: inline-flex; flex-wrap: wrap; gap: 7px; margin-top: 3px; }
.sm { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; color: var(--sd-text-muted); }
.sm.esc { color: var(--sd-st-escalated); }
.sm.tag { color: var(--sd-amber); background: var(--sd-amber-soft); padding: 1px 6px; border-radius: 999px; }
.cap { color: var(--sd-text-secondary); white-space: nowrap; }
.cap.mono { font-family: var(--sd-mono); }
.who { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; min-width: 0; max-width: 100%; }
.ava { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; font-size: 10px; font-weight: 800; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); flex-shrink: 0; }
.ava.agent { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .ava.agent { color: #fff8ec; }
.who-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 0 1 auto; font-size: 12.5px; }
.unassigned { font-size: 12px; color: var(--sd-text-dim); font-style: italic; }

.sla-chip { display: inline-flex; align-items: center; gap: 7px; --rc: var(--sd-steel); color: var(--rc); font-size: 12px; font-weight: 700; font-family: var(--sd-mono); white-space: nowrap; }
.sla-chip.ok { --rc: var(--sd-success); } .sla-chip.due-soon { --rc: var(--sd-warning); } .sla-chip.breached { --rc: var(--sd-danger); } .sla-chip.met { --rc: var(--sd-success); } .sla-chip.none { --rc: var(--sd-steel); }
.sla-ring { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(from -90deg, var(--rc) 0 var(--sd-p), color-mix(in srgb, var(--sd-text) 12%, transparent) var(--sd-p) 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent 55%, #000 56%); mask: radial-gradient(farthest-side, transparent 55%, #000 56%); }
.sla-chip.breached .sla-ring { animation: sd-breach-flash 2.4s ease-out infinite; }
.age { color: var(--sd-text-muted); font-family: var(--sd-mono); font-size: 11.5px; white-space: nowrap; }

.row-acts { display: flex; align-items: center; justify-content: flex-end; gap: 4px; opacity: 0; transform: translateX(6px); transition: opacity 0.2s, transform 0.2s var(--sd-spring); }
.row:hover .row-acts, .row:focus-within .row-acts { opacity: 1; transform: translateX(0); }
.ra { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.16s; }
.ra:hover { color: var(--sd-text); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.ra.warn:hover { color: var(--sd-st-escalated); border-color: color-mix(in srgb, var(--sd-st-escalated) 40%, transparent); background: var(--sd-st-escalated-soft); }
.ra.ok:hover { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 40%, transparent); background: var(--sd-success-soft); }

/* empty */
.grid-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 54px 24px 60px; text-align: center; }
.ge-orb { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); margin-bottom: 4px; }
.ge-t { font-size: 15px; font-weight: 700; color: var(--sd-text); margin: 0; }
.ge-s { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; max-width: 38ch; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .gw-accent,
  html:not([data-cinematic="on"]) .gb-live i,
  html:not([data-cinematic="on"]) .row,
  html:not([data-cinematic="on"]) .row.crit::before,
  html:not([data-cinematic="on"]) .row.flash,
  html:not([data-cinematic="on"]) .sla-chip.breached .sla-ring { animation: none; }
}
</style>
