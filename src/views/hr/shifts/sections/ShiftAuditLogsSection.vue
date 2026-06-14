<template>
  <section class="aud">
    <!-- ════════════════════ TELEMETRY HEADER ════════════════════ -->
    <Motion as="header" class="recorder" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: EASE }">
      <span class="rec-scan" aria-hidden="true" />
      <span class="rec-grid" aria-hidden="true" />

      <!-- live waveform monitor -->
      <div class="rec-monitor" aria-hidden="true">
        <span class="rec-rec"><i />REC</span>
        <svg class="rec-wave" viewBox="0 0 120 40" preserveAspectRatio="none">
          <polyline :points="wavePoints" />
        </svg>
      </div>

      <div class="rec-id">
        <span class="eyebrow"><span class="eyebrow-dot" /> Append-only · immutable trail</span>
        <h2 class="rec-title">Audit Logs<span class="title-sweep" aria-hidden="true" /></h2>
        <p>Every shift-module event — assignments, rotations, rosters, swaps and overtime-rule changes — recorded as it happens, across all Shifts pages. Read-only black box.</p>
      </div>

      <div class="rec-side">
        <div class="rec-stats">
          <span class="rs"><b><ShiftCountUp :value="stats.total" /></b><small>events</small></span>
          <span class="rs-div" />
          <span class="rs"><b><ShiftCountUp :value="stats.today" /></b><small>today</small></span>
          <span class="rs-div" />
          <span class="rs"><b class="mono">{{ stats.lastRel }}</b><small>latest</small></span>
        </div>
        <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ════════════════════ CATEGORY RAIL ════════════════════ -->
    <div class="cats">
      <Motion v-for="(c, i) in catChips" :key="c.key" as="button" class="cat" :class="{ on: activeCat === c.key }"
        :style="{ '--c': c.color }" @click="activeCat = c.key"
        :initial="{ opacity: 0, y: 8, scale: 0.94 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.34, delay: 0.04 * i, ease: SPRING }" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
        <span class="cat-dot" /><component :is="c.icon" :size="13" /><span class="cat-lbl">{{ c.label }}</span>
        <span class="cat-count">{{ c.count }}</span>
        <span v-if="activeCat === c.key" class="cat-ring" aria-hidden="true" />
      </Motion>
    </div>

    <!-- ════════════════════ EVENT STREAM ════════════════════ -->
    <div class="card">
      <!-- skeleton -->
      <div v-if="loading && !logs.length" class="skel">
        <div v-for="n in 6" :key="n" class="sk-row" />
      </div>

      <!-- stream -->
      <div v-else-if="grouped.length" class="stream">
        <span class="spine" aria-hidden="true"><span class="spine-flow" /></span>

        <template v-for="g in grouped" :key="g.key">
          <Motion as="div" class="day-sep" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.4 }">
            <span class="day-dot" /><span class="day-lbl">{{ g.label }}</span><span class="day-count">{{ g.items.length }}</span>
          </Motion>

          <Motion v-for="(l, i) in g.items" :key="l.id" as="article" class="ev" :class="{ live: l.isLive, open: expandedId === l.id, danger: l.meta.danger }"
            :style="{ '--c': l.accent }"
            :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.34, delay: Math.min(i * 0.025, 0.3), ease: EASE }">
            <span class="ev-node"><component :is="l.meta.icon" :size="13" /><span v-if="l.isLive" class="ev-node-pulse" /></span>

            <div class="ev-card" @click="toggle(l.id)">
              <div class="ev-top">
                <span class="ev-action">{{ l.meta.label }}<span v-if="l.isLive" class="ev-live">live</span></span>
                <span class="ev-time" :title="absTime(l.created_at)">{{ relTime(l.created_at) }}</span>
              </div>
              <div class="ev-meta">
                <span v-if="l.actor_name" class="ev-actor"><User :size="11" />{{ l.actor_name }}</span>
                <span class="ev-target">{{ prettyTable(l.target_table) }}</span>
                <span v-for="(b, bi) in l.bits" :key="bi" class="ev-bit">{{ b }}</span>
              </div>
              <div v-if="l.reason" class="ev-reason"><Quote :size="11" />{{ l.reason }}</div>

              <button v-if="l.detailRows.length" class="ev-expand" :class="{ open: expandedId === l.id }" @click.stop="toggle(l.id)">
                <ChevronDown :size="13" /><span>{{ expandedId === l.id ? 'Hide' : 'Details' }}</span>
              </button>
            </div>

            <!-- expandable console readout -->
            <div class="ev-detail-wrap" :class="{ open: expandedId === l.id }">
              <div class="ev-detail-inner">
                <div class="ev-console">
                  <div class="ec-head"><span class="ec-dot r" /><span class="ec-dot y" /><span class="ec-dot g" /><span class="ec-title"><Braces :size="10" /> event.payload</span></div>
                  <div class="ec-rows">
                    <div v-for="row in l.detailRows" :key="row.k" class="ec-row"><span class="ec-k">{{ row.k }}</span><span class="ec-v">{{ row.v }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </Motion>
        </template>
      </div>

      <!-- empty -->
      <div v-else class="empty">
        <span class="empty-glow" aria-hidden="true" />
        <div class="empty-ic">
          <span class="empty-orbit a" /><span class="empty-orbit b" />
          <Radio :size="30" />
        </div>
        <h3>{{ activeCat === 'all' ? 'Recorder on standby' : `No ${catLabel(activeCat).toLowerCase()} events` }}</h3>
        <p>{{ activeCat === 'all'
          ? 'Shift assignments, rotation advances, roster publishes, swaps and overtime-rule changes will stream in here as they happen.'
          : 'Switch category or perform an action — every event is captured automatically.' }}</p>
        <span class="empty-meta"><span class="empty-meta-dot" /> Live · append-only</span>
      </div>

      <!-- ════════════════════ PAGINATION ════════════════════ -->
      <Motion v-if="showPager" as="nav" class="pager" aria-label="Pagination"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: EASE }">
        <span class="pager-range"><b>{{ rangeStart }}–{{ rangeEnd }}</b> <em>of</em> {{ filtered.length }}</span>

        <div class="pager-ctrl">
          <Motion as="button" class="pg-arrow" :disabled="page <= 1" title="Previous"
            :whileHover="page > 1 ? { x: -2 } : {}" :whileTap="page > 1 ? { scale: 0.9 } : {}" @click="prevPage">
            <ChevronLeft :size="15" />
          </Motion>

          <div class="pg-nums">
            <button v-for="(p, i) in pageWindow" :key="`${p}-${i}`" class="pg-num"
              :class="{ on: p === page, gap: p === '…' }" :disabled="p === '…'" @click="goPage(p)">
              <span v-if="p === page" class="pg-num-bg" aria-hidden="true" />
              <span class="pg-num-lbl">{{ p }}</span>
            </button>
          </div>

          <Motion as="button" class="pg-arrow" :disabled="page >= totalPages" title="Next"
            :whileHover="page < totalPages ? { x: 2 } : {}" :whileTap="page < totalPages ? { scale: 0.9 } : {}" @click="nextPage">
            <ChevronRight :size="15" />
          </Motion>
        </div>

        <div class="pager-track" :title="`Page ${page} of ${totalPages}`">
          <span class="pager-fill" :style="{ width: (page / totalPages * 100) + '%' }" />
        </div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  ScrollText, RefreshCw, UsersRound, RefreshCcw, CalendarRange, ArrowLeftRight,
  Timer, Trash2, Plus, Pencil, ChevronDown, ChevronLeft, ChevronRight, User, Quote, Braces, Radio, Layers,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import { fetchShiftLogs, SHIFT_AUDIT_TABLES, otTypeMeta } from '@/composables/useShifts'

const EASE = [0.16, 1, 0.3, 1]
const SPRING = [0.34, 1.56, 0.64, 1]
const toast = useToast()

const logs = ref([])
const loading = ref(false)
const activeCat = ref('all')
const expandedId = ref(null)
const now = ref(Date.now())
let nowTimer = null

/* ── data ────────────────────────────────────────────────────────────────── */
const reload = async () => {
  loading.value = true
  try {
    const data = await fetchShiftLogs({ target_table: SHIFT_AUDIT_TABLES, limit: 200 })
    const rows = Array.isArray(data) ? data : (data.items || [])
    logs.value = rows
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load audit logs')
    logs.value = []
  } finally { loading.value = false }
}
onMounted(() => {
  reload()
  nowTimer = setInterval(() => { now.value = Date.now() }, 30000)
})
onBeforeUnmount(() => { if (nowTimer) clearInterval(nowTimer) })

const toggle = (id) => { expandedId.value = expandedId.value === id ? null : id }

/* ── event taxonomy ──────────────────────────────────────────────────────── */
const CATS = {
  assignment: { label: 'Assignments', icon: UsersRound,    color: 'var(--shift-ok)' },
  rotation:   { label: 'Rotations',   icon: RefreshCcw,    color: 'var(--shift-amber)' },
  roster:     { label: 'Rosters',     icon: CalendarRange, color: 'var(--shift-amber-bright)' },
  swap:       { label: 'Swaps',       icon: ArrowLeftRight,color: 'var(--shift-ember)' },
  overtime:   { label: 'OT Rules',    icon: Timer,         color: 'var(--shift-ember-strong)' },
  other:      { label: 'Other',       icon: ScrollText,    color: 'var(--shift-text-muted)' },
}
const fmtMult = (m) => (Number(m) || 0).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
const prettyAction = (a) => String(a || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())

const eventMeta = (l) => {
  const tt = l.target_table, p = l.payload || {}, op = p.op, ev = p.event, act = l.action
  if (tt === 'hr_overtime_rules') {
    const m = { created: ['OT rule created', Plus], updated: ['OT rule updated', Pencil], deleted: ['OT rule deleted', Trash2] }[op] || ['OT rule changed', Timer]
    return { cat: 'overtime', label: m[0], icon: m[1], danger: op === 'deleted' }
  }
  if (tt === 'hr_shift_rotations') {
    if (act === 'SHIFT_ASSIGNED') return { cat: 'rotation', label: 'Rotation advanced', icon: RefreshCcw }
    if (ev === 'rotation_deleted') return { cat: 'rotation', label: 'Rotation deleted', icon: Trash2, danger: true }
    return { cat: 'rotation', label: 'Rotation updated', icon: RefreshCcw }
  }
  if (tt === 'hr_shift_rosters') return { cat: 'roster', label: 'Roster published', icon: CalendarRange }
  if (tt === 'hr_shift_swap_requests') return { cat: 'swap', label: p.status ? `Swap ${String(p.status).toLowerCase()}` : 'Shift swap', icon: ArrowLeftRight }
  if (tt === 'hr_employee_shift_assignments') return { cat: 'assignment', label: 'Shift assigned', icon: UsersRound }
  return { cat: 'other', label: prettyAction(act), icon: ScrollText }
}

const summaryBits = (p) => {
  const bits = []
  if (p.name) bits.push(p.name)
  if (p.rotation) bits.push(p.rotation)
  if (p.ot_type) bits.push(otTypeMeta(p.ot_type).label)
  if (p.multiplier != null) bits.push(`${fmtMult(p.multiplier)}×`)
  if (p.max_ot_hours != null) bits.push(`cap ${p.max_ot_hours}h`)
  if (p.count != null) bits.push(`${p.count} assigned`)
  if (p.written != null) bits.push(`${p.written} written`)
  if (p.skipped) bits.push(`${p.skipped} skipped`)
  if (p.members != null) bits.push(`${p.members} members`)
  if (p.cycle != null) bits.push(`cycle ${p.cycle}`)
  if (p.week_start) bits.push(`week ${p.week_start}`)
  if (p.effective_from) bits.push(`from ${p.effective_from}`)
  if (p.swap_date) bits.push(p.swap_date)
  return bits.slice(0, 4)
}
const HIDE_KEYS = new Set(['op', 'event', 'reason'])
const detailRows = (p) => Object.entries(p || {})
  .filter(([k, v]) => !HIDE_KEYS.has(k) && v != null && v !== '')
  .map(([k, v]) => ({ k: k.replace(/_/g, ' '), v: String(v) }))

/* ── decoration + grouping ───────────────────────────────────────────────── */
const decorated = computed(() => logs.value.map((l, idx) => {
  const meta = eventMeta(l)
  const p = l.payload || {}
  return {
    ...l,
    meta,
    accent: meta.danger ? 'var(--shift-alert)' : (CATS[meta.cat]?.color || 'var(--shift-amber)'),
    bits: summaryBits(p),
    reason: p.reason || null,
    detailRows: detailRows(p),
    isLive: idx === 0,
  }
}))

const catChips = computed(() => {
  const counts = {}
  for (const l of decorated.value) counts[l.meta.cat] = (counts[l.meta.cat] || 0) + 1
  const order = ['all', 'assignment', 'rotation', 'roster', 'swap', 'overtime']
  const present = order.filter(k => k === 'all' || counts[k])
  // include 'other' only if such events exist
  if (counts.other) present.push('other')
  return present.map(k => k === 'all'
    ? { key: 'all', label: 'All', icon: Layers, color: 'var(--shift-amber)', count: decorated.value.length }
    : { key: k, label: CATS[k].label, icon: CATS[k].icon, color: CATS[k].color, count: counts[k] || 0 })
})
const catLabel = (k) => CATS[k]?.label || 'event'

const filtered = computed(() => activeCat.value === 'all'
  ? decorated.value
  : decorated.value.filter(l => l.meta.cat === activeCat.value))

/* ── pagination (client-side over the fetched window, 10/page) ───────────── */
const PAGE_SIZE = 10
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const showPager = computed(() => !loading.value && filtered.value.length > PAGE_SIZE)
const rangeStart = computed(() => filtered.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0)
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, filtered.value.length))
// windowed page numbers: 1 … 4 5 6 … N
const pageWindow = computed(() => {
  const tp = totalPages.value, cur = page.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const out = [1]
  const lo = Math.max(2, cur - 1), hi = Math.min(tp - 1, cur + 1)
  if (lo > 2) out.push('…')
  for (let i = lo; i <= hi; i++) out.push(i)
  if (hi < tp - 1) out.push('…')
  out.push(tp)
  return out
})
const goPage = (p) => {
  if (typeof p !== 'number') return
  const np = Math.min(totalPages.value, Math.max(1, p))
  if (np !== page.value) { page.value = np; expandedId.value = null }
}
const prevPage = () => goPage(page.value - 1)
const nextPage = () => goPage(page.value + 1)
// reset to page 1 on filter change; clamp if the page count shrinks
watch(activeCat, () => { page.value = 1; expandedId.value = null })
watch(totalPages, (tp) => { if (page.value > tp) page.value = tp })

const dayLabelOf = (iso) => {
  const d = new Date(iso); const t = new Date()
  const ymd = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const y = new Date(t); y.setDate(t.getDate() - 1)
  if (ymd(d) === ymd(t)) return 'Today'
  if (ymd(d) === ymd(y)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
const grouped = computed(() => {
  const out = []
  let cur = null
  for (const l of paged.value) {
    const key = new Date(l.created_at).toDateString()
    if (!cur || cur.key !== key) { cur = { key, label: dayLabelOf(l.created_at), items: [] }; out.push(cur) }
    cur.items.push(l)
  }
  return out
})

/* ── stats ───────────────────────────────────────────────────────────────── */
const stats = computed(() => {
  const total = logs.value.length
  const today = decorated.value.filter(l => dayLabelOf(l.created_at) === 'Today').length
  const lastRel = logs.value.length ? relTime(logs.value[0].created_at) : '—'
  return { total, today, lastRel }
})

/* ── waveform (deterministic, decorative) ────────────────────────────────── */
const wavePoints = computed(() => {
  const n = 32, w = 120, h = 40
  const arr = []
  for (let i = 0; i < n; i++) {
    const seed = (i * 73 % 17) / 17
    const amp = 4 + ((logs.value.length + i * 11) % 14) + seed * 8
    const y = h / 2 + (i % 2 ? -1 : 1) * amp * (0.4 + ((i * 31) % 10) / 18)
    arr.push(`${((i / (n - 1)) * w).toFixed(1)},${Math.max(3, Math.min(h - 3, y)).toFixed(1)}`)
  }
  return arr.join(' ')
})

/* ── time helpers ────────────────────────────────────────────────────────── */
const relTime = (iso) => {
  if (!iso) return ''
  const diff = (now.value - new Date(iso).getTime()) / 1000
  if (diff < 0) return 'just now'
  if (diff < 45) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return iso }
}
const absTime = (iso) => { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso } }
const prettyTable = (t) => ({
  hr_employee_shift_assignments: 'Assignment',
  hr_shift_rotations: 'Rotation',
  hr_shift_rosters: 'Roster',
  hr_shift_swap_requests: 'Swap',
  hr_overtime_rules: 'OT rule',
}[t] || (t || '').replace(/^hr_/, '').replace(/_/g, ' '))
</script>

<style scoped>
.aud { display: flex; flex-direction: column; gap: 16px; }

/* ════════════════════ TELEMETRY HEADER ════════════════════ */
.recorder { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 22px;
  padding: 20px 24px; border-radius: 24px; background: var(--shift-surface); border: 1px solid var(--shift-border);
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.rec-scan { position: absolute; left: 0; right: 0; top: 0; height: 40%; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, rgba(253,230,138,0.08), transparent); animation: shift-scanline 7s ease-in-out infinite; }
.rec-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.45;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 36px 36px; mask-image: radial-gradient(120% 90% at 20% 0%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(120% 90% at 20% 0%, #000 30%, transparent 75%); animation: shift-grid-pan 26s linear infinite; }
.recorder > *:not(.rec-scan):not(.rec-grid) { position: relative; z-index: 1; }

.rec-monitor { display: flex; flex-direction: column; gap: 7px; width: 120px; flex-shrink: 0; padding: 10px 12px; border-radius: 14px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rec-rec { display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--shift-alert); }
.rec-rec i { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-alert); box-shadow: 0 0 8px var(--shift-alert); animation: rec-blink 1.6s ease-in-out infinite; }
@keyframes rec-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.rec-wave { width: 100%; height: 30px; }
.rec-wave polyline { fill: none; stroke: var(--shift-amber); stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round;
  filter: drop-shadow(0 0 3px rgba(251,191,36,0.4)); stroke-dasharray: 400; stroke-dashoffset: 400; animation: wave-draw 1.6s var(--shift-ease) 0.2s forwards; }
@keyframes wave-draw { to { stroke-dashoffset: 0; } }

.rec-id { min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.4s ease-out infinite; }
.rec-title { position: relative; display: inline-block; margin: 7px 0 6px; font-size: 25px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.title-sweep { position: absolute; left: 0; bottom: -3px; height: 2px; width: 100%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--shift-amber), var(--shift-ember), transparent); background-size: 220% 100%; animation: title-shimmer 4.5s ease-in-out infinite; }
@keyframes title-shimmer { 0%,100% { background-position: 200% 0; opacity: 0.55; } 50% { background-position: -40% 0; opacity: 1; } }
.rec-id p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); max-width: 640px; }

.rec-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.rec-stats { display: inline-flex; align-items: center; gap: 12px; padding: 8px 14px; border-radius: 14px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rs { display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
.rs b { font-family: var(--shift-mono); font-size: 16px; font-weight: 800; color: var(--shift-text); }
.rs b.mono { font-size: 12px; }
.rs small { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-text-muted); margin-top: 2px; }
.rs-div { width: 1px; height: 22px; background: var(--shift-border-soft); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 12px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; transition: 0.2s; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

/* ════════════════════ CATEGORY RAIL ════════════════════ */
.cats { display: flex; flex-wrap: wrap; gap: 8px; }
.cat { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; cursor: pointer;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); font-size: 12px; font-weight: 600; transition: color .2s, border-color .2s, background .2s; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); transition: box-shadow .2s; }
.cat svg { color: var(--c); }
.cat-lbl { white-space: nowrap; }
.cat-count { font-family: var(--shift-mono); font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; background: var(--shift-surface-2); color: var(--shift-text-2); border: 1px solid var(--shift-border-soft); }
.cat:hover { color: var(--shift-text-2); border-color: var(--shift-border); }
.cat.on { color: var(--shift-text); border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 12%, var(--shift-surface)); }
.cat.on .cat-dot { box-shadow: 0 0 9px 1px var(--c); }
.cat.on .cat-count { background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--shift-text); }
.cat-ring { position: absolute; inset: -3px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--c) 55%, transparent); opacity: 0; animation: cat-ring 2.4s ease-out infinite; pointer-events: none; }
@keyframes cat-ring { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(1.12); } }

/* ════════════════════ STREAM ════════════════════ */
.card { position: relative; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 18px 22px; }
.skel { display: flex; flex-direction: column; gap: 12px; }
.sk-row { height: 52px; border-radius: 12px; background: linear-gradient(100deg, var(--shift-surface-2), var(--shift-surface), var(--shift-surface-2)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.stream { position: relative; }
.spine { position: absolute; left: 13px; top: 4px; bottom: 4px; width: 2px; border-radius: 2px; background: var(--shift-border-soft); overflow: hidden; }
.spine-flow { position: absolute; left: 0; right: 0; height: 40%; background: linear-gradient(180deg, transparent, var(--shift-amber), transparent); animation: spine-flow 3.6s linear infinite; }
@keyframes spine-flow { 0% { top: -40%; } 100% { top: 100%; } }

.day-sep { display: flex; align-items: center; gap: 9px; padding: 12px 0 6px 0; margin-left: 2px; position: relative; }
.day-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--shift-surface); border: 2px solid var(--shift-amber); margin-left: 8px; flex-shrink: 0; z-index: 1; }
.day-lbl { font-family: var(--shift-mono); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-text-2); }
.day-count { font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-dim); padding: 1px 7px; border-radius: 999px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }

.ev { position: relative; display: flex; gap: 14px; padding: 5px 0; }
.ev-node { position: relative; z-index: 1; width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; margin-top: 4px;
  background: var(--shift-surface-2); border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); color: var(--c); transition: box-shadow 0.25s; }
.ev.live .ev-node { box-shadow: 0 0 14px -2px var(--c); }
.ev-node-pulse { position: absolute; inset: -3px; border-radius: 50%; border: 1px solid var(--c); animation: ev-pulse 2s ease-out infinite; }
@keyframes ev-pulse { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }

.ev-card { flex: 1; min-width: 0; padding: 11px 14px; border-radius: 14px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.22s, transform 0.2s, box-shadow 0.25s; }
.ev-card:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); transform: translateX(2px); }
.ev.live .ev-card { border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.ev.danger .ev-node { color: var(--shift-alert); border-color: color-mix(in srgb, var(--shift-alert) 50%, transparent); }
.ev-top { display: flex; align-items: baseline; gap: 10px; }
.ev-action { font-size: 13px; font-weight: 700; color: var(--shift-text); display: inline-flex; align-items: center; gap: 7px; }
.ev-live { font-family: var(--shift-mono); font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 1px 6px; border-radius: 999px; color: #1f1408; background: var(--shift-grad-cta); }
.ev-time { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-dim); margin-left: auto; white-space: nowrap; }
.ev-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 5px; }
.ev-actor { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--shift-text-muted); }
.ev-target { font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 6px; background: color-mix(in srgb, var(--c) 14%, transparent); color: var(--c); }
.ev-bit { font-size: 11px; color: var(--shift-text-2); padding: 1px 8px; border-radius: 6px; background: rgba(148,163,184,0.10); }
.ev-reason { display: flex; align-items: flex-start; gap: 6px; margin-top: 8px; padding: 7px 10px; border-radius: 9px; font-size: 11.5px; font-style: italic; line-height: 1.45;
  color: var(--shift-text-2); background: var(--shift-alert-soft); border: 1px dashed color-mix(in srgb, var(--shift-alert) 32%, transparent); }
.ev-reason svg { color: var(--shift-alert); flex-shrink: 0; margin-top: 2px; }
.ev-expand { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; padding: 4px 9px; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); font-size: 10.5px; font-weight: 600; transition: 0.18s; }
.ev-expand:hover { color: var(--shift-text-2); border-color: var(--shift-border); }
.ev-expand svg { transition: transform 0.25s; }
.ev-expand.open svg { transform: rotate(180deg); }

.ev-detail-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s var(--shift-ease); margin-left: 42px; }
.ev-detail-wrap.open { grid-template-rows: 1fr; }
.ev-detail-inner { overflow: hidden; }
.ev-console { margin: 8px 0 4px; border-radius: 11px; overflow: hidden; background: var(--shift-canvas); border: 1px solid var(--shift-border-soft); }
.ec-head { display: flex; align-items: center; gap: 6px; padding: 7px 11px; border-bottom: 1px solid var(--shift-border-soft); }
.ec-dot { width: 7px; height: 7px; border-radius: 50%; }
.ec-dot.r { background: #ef4444; } .ec-dot.y { background: #f59e0b; } .ec-dot.g { background: #10b981; }
.ec-title { margin-left: 6px; display: inline-flex; align-items: center; gap: 5px; font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-muted); }
.ec-rows { padding: 9px 12px; display: flex; flex-direction: column; gap: 4px; }
.ec-row { display: flex; gap: 12px; font-family: var(--shift-mono); font-size: 11px; }
.ec-k { color: var(--shift-amber-strong); min-width: 110px; flex-shrink: 0; }
.ec-v { color: var(--shift-text-2); word-break: break-word; }

/* ════════════════════ EMPTY ════════════════════ */
.empty { position: relative; overflow: hidden; padding: 48px 24px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-glow { position: absolute; inset: -40% -10% auto -10%; height: 80%; background: radial-gradient(50% 50% at 50% 30%, rgba(251,191,36,0.16), transparent 60%); filter: blur(50px); z-index: 0; }
.empty-ic { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 82px; height: 82px; border-radius: 50%; margin-bottom: 6px;
  background: rgba(251,191,36,0.1); color: var(--shift-amber); border: 1px solid var(--shift-border); }
.empty-orbit { position: absolute; inset: -10px; border-radius: 50%; border: 1px dashed var(--shift-border); animation: shift-spin 18s linear infinite; }
.empty-orbit.b { inset: -20px; border-color: var(--shift-border-soft); animation: shift-spin 28s linear infinite reverse; }
.empty h3 { position: relative; z-index: 1; margin: 4px 0 0; font-size: 17px; font-weight: 800; color: var(--shift-text); }
.empty p { position: relative; z-index: 1; margin: 0 0 6px; font-size: 12px; color: var(--shift-text-muted); max-width: 500px; line-height: 1.55; }
.empty-meta { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--shift-amber); padding: 5px 11px; border-radius: 999px; background: rgba(251,191,36,0.08); border: 1px solid var(--shift-border); }
.empty-meta-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.2s ease-out infinite; }

/* ════════════════════ PAGINATION ════════════════════ */
.pager { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--shift-border-soft); }
.pager-range { font-family: var(--shift-mono); font-size: 11px; color: var(--shift-text-muted); white-space: nowrap; }
.pager-range b { color: var(--shift-text); }
.pager-range em { font-style: normal; color: var(--shift-text-dim); }

.pager-ctrl { display: inline-flex; align-items: center; gap: 8px; }
.pg-arrow { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: color .2s, border-color .2s, background .2s; }
.pg-arrow:hover:not(:disabled) { color: var(--shift-amber); border-color: var(--shift-border); background: rgba(251,191,36,0.08); }
.pg-arrow:disabled { opacity: 0.35; cursor: default; }

.pg-nums { display: inline-flex; align-items: center; gap: 4px; }
.pg-num { position: relative; min-width: 32px; height: 32px; padding: 0 9px; border-radius: 10px; cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--shift-text-muted);
  font-family: var(--shift-mono); font-size: 12.5px; font-weight: 700; transition: color .2s, border-color .2s, transform .15s; display: grid; place-items: center; }
.pg-num:hover:not(.on):not(.gap) { color: var(--shift-text-2); border-color: var(--shift-border-soft); transform: translateY(-1px); }
.pg-num.gap { cursor: default; color: var(--shift-text-dim); }
.pg-num.on { color: #1f1408; }
.pg-num-lbl { position: relative; z-index: 1; }
.pg-num-bg { position: absolute; inset: 0; border-radius: 10px; background: var(--shift-grad-cta);
  box-shadow: 0 8px 20px -8px rgba(245,158,11,0.7); animation: pg-pop 0.36s var(--shift-spring); }
@keyframes pg-pop { 0% { transform: scale(0.55); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
.pg-num.on::after { content: ''; position: absolute; inset: -3px; border-radius: 12px; border: 1px solid color-mix(in srgb, var(--shift-amber) 55%, transparent);
  opacity: 0; animation: pg-ring 2.4s ease-out infinite; pointer-events: none; }
@keyframes pg-ring { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(1.18); } }

.pager-track { flex: 1 1 100px; min-width: 80px; height: 3px; border-radius: 999px; background: var(--shift-surface-2); overflow: hidden; }
.pager-fill { display: block; height: 100%; border-radius: 999px; background: var(--shift-grad-rail);
  box-shadow: 0 0 8px rgba(251,191,36,0.5); transition: width 0.4s var(--shift-ease); }

[data-theme="light"] .pg-num.on { color: #2a1a05; }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 860px) {
  .recorder { grid-template-columns: 1fr; }
  .rec-monitor { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; }
  .rec-wave { width: 60%; }
  .rec-side { flex-direction: row; align-items: center; justify-content: space-between; }
}

/* ════════════════════ LIGHT THEME OVERRIDES ════════════════════ */
[data-theme="light"] .rec-scan { background: linear-gradient(180deg, rgba(217,119,6,0.08), transparent); }
[data-theme="light"] .ev-bit { background: rgba(40,32,20,0.06); }
[data-theme="light"] .ec-dot.r { background: #dc2626; } [data-theme="light"] .ec-dot.y { background: #d97706; } [data-theme="light"] .ec-dot.g { background: #059669; }
[data-theme="light"] .ev-live { color: #2a1a05; }

@media (prefers-reduced-motion: reduce) {
  .rec-scan, .rec-grid, .title-sweep, .rec-rec i, .rec-wave polyline, .spine-flow, .ev-node-pulse, .cat-ring, .empty-orbit, .eyebrow-dot, .empty-meta-dot, .pg-num-bg, .pg-num.on::after { animation: none !important; }
  .rec-wave polyline { stroke-dashoffset: 0; }
}
</style>
