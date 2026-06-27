<template>
  <div class="sd-reports">
    <!-- Header / export bar -->
    <div class="sd-toolbar">
      <div class="sd-rep-intro">
        <h2 class="sd-rep-title">Analytics console</h2>
        <p class="sd-rep-sub">Live operational, customer &amp; executive metrics — derived client-side.</p>
      </div>
      <button class="sd-btn sd-btn-primary" :disabled="exporting" @click="exportCsv">
        <component :is="exporting ? Loader2 : Download" :size="15" :class="{ 'sd-spin': exporting }" />
        {{ exporting ? 'Exporting…' : 'Export tickets (CSV)' }}
      </button>
    </div>

    <p v-if="exportNote" class="sd-export-note">{{ exportNote }}</p>

    <!-- Operational -->
    <section class="sd-card sd-panel">
      <header class="sd-panel-head">
        <h3>Operational</h3>
        <span class="sd-panel-sub">live queue health</span>
      </header>
      <div class="sd-metric-grid">
        <Motion
          v-for="(m, i) in operational"
          :key="m.key"
          as="div"
          class="sd-metric"
          :style="{ '--acc': m.color }"
          :initial="{ opacity: 0, y: 12 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="sd-metric-val">{{ loadingData ? '—' : m.value }}</span>
          <span class="sd-metric-label">{{ m.label }}</span>
        </Motion>
      </div>
    </section>

    <div class="sd-rep-grid">
      <!-- Customer -->
      <section class="sd-card sd-panel">
        <header class="sd-panel-head">
          <h3>Customer</h3>
          <span class="sd-panel-sub">satisfaction &amp; throughput</span>
        </header>
        <div class="sd-vitals">
          <div class="sd-vital">
            <span class="sd-vital-val" :style="{ color: 'var(--sd-success)' }">{{ d.csat != null ? d.csat + '%' : '—' }}</span>
            <span class="sd-vital-label">CSAT</span>
          </div>
          <div class="sd-vital">
            <span class="sd-vital-val">{{ loadingData ? '—' : (d.resolved_today ?? 0) }}</span>
            <span class="sd-vital-label">Resolved today</span>
          </div>
          <div class="sd-vital">
            <span class="sd-vital-val">{{ loadingData ? '—' : (d.closed_today ?? 0) }}</span>
            <span class="sd-vital-label">Closed today</span>
          </div>
        </div>
      </section>

      <!-- Executive — total -->
      <section class="sd-card sd-panel sd-exec-total">
        <header class="sd-panel-head">
          <h3>Executive</h3>
          <span class="sd-panel-sub">portfolio</span>
        </header>
        <div class="sd-total-block">
          <span class="sd-total-val">{{ loadingData ? '—' : (d.total_tickets ?? 0) }}</span>
          <span class="sd-total-label">Total tickets</span>
        </div>
      </section>
    </div>

    <div class="sd-rep-grid">
      <!-- Executive — priority distribution -->
      <section class="sd-card sd-panel">
        <header class="sd-panel-head">
          <h3>Priority distribution</h3>
          <span class="sd-panel-sub">open tickets</span>
        </header>
        <div class="sd-bars">
          <div v-for="p in priorityBars" :key="p.key" class="sd-bar-row">
            <span class="sd-bar-label">{{ p.label }}</span>
            <div class="sd-bar-track">
              <div class="sd-bar-fill" :style="{ width: p.pct + '%', '--c': p.color }" />
            </div>
            <span class="sd-bar-val">{{ p.value }}</span>
          </div>
          <p v-if="!priorityTotal" class="sd-empty">{{ loadingData ? 'Loading…' : 'No open tickets.' }}</p>
        </div>
      </section>

      <!-- Executive — status distribution -->
      <section class="sd-card sd-panel">
        <header class="sd-panel-head">
          <h3>Status mix</h3>
          <span class="sd-panel-sub">all tickets</span>
        </header>
        <div class="sd-bars">
          <div v-for="s in statusBars" :key="s.key" class="sd-bar-row">
            <SdPill kind="status" :value="s.key" />
            <div class="sd-bar-track">
              <div class="sd-bar-fill" :style="{ width: s.pct + '%', '--c': s.color }" />
            </div>
            <span class="sd-bar-val">{{ s.value }}</span>
          </div>
          <p v-if="!statusTotal" class="sd-empty">{{ loadingData ? 'Loading…' : 'No tickets yet.' }}</p>
        </div>
      </section>
    </div>

    <p class="sd-future-note">Branded PDF / Excel report generation lands in a later phase.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Download, Loader2 } from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import { fetchSupportDashboard, listTickets } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
defineEmits(['go', 'changed'])

/* ── data ── */
const local = ref(null)
const loadingLocal = ref(false)
const d = computed(() => props.dashboard || local.value || {})
const loadingData = computed(() => props.loading || loadingLocal.value)

onMounted(async () => {
  if (props.dashboard) return
  loadingLocal.value = true
  try { local.value = await fetchSupportDashboard() }
  catch { local.value = {} }
  finally { loadingLocal.value = false }
})

/* ── formatting ── */
const fmtMins = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}

/* ── operational metrics ── */
const operational = computed(() => ([
  { key: 'open',       label: 'Open',            color: 'var(--sd-st-open)',       value: d.value.open_tickets ?? 0 },
  { key: 'unassigned', label: 'Unassigned',      color: 'var(--sd-steel)',         value: d.value.unassigned ?? 0 },
  { key: 'pending',    label: 'Pending',         color: 'var(--sd-st-pending)',    value: d.value.pending ?? 0 },
  { key: 'escalated',  label: 'Escalated',       color: 'var(--sd-st-escalated)',  value: d.value.escalated ?? 0 },
  { key: 'overdue',    label: 'Overdue',         color: 'var(--sd-danger)',        value: d.value.overdue ?? 0 },
  { key: 'breached',   label: 'SLA breached',    color: 'var(--sd-st-breached)',   value: d.value.sla_breached ?? 0 },
  { key: 'response',   label: 'Avg first reply', color: 'var(--sd-amber)',         value: fmtMins(d.value.avg_response_mins) },
  { key: 'resolution', label: 'Avg resolution',  color: 'var(--sd-ember)',         value: fmtMins(d.value.avg_resolution_mins) },
]))

/* ── distributions (mirror SdDashboardSection bar style) ── */
const PRI = [
  ['critical', 'Critical', 'var(--sd-pri-critical)'],
  ['urgent', 'Urgent', 'var(--sd-pri-urgent)'],
  ['high', 'High', 'var(--sd-pri-high)'],
  ['medium', 'Medium', 'var(--sd-pri-medium)'],
  ['low', 'Low', 'var(--sd-pri-low)'],
]
const priorityTotal = computed(() => Object.values(d.value.priority_counts || {}).reduce((a, b) => a + b, 0))
const priorityBars = computed(() => PRI.map(([key, label, color]) => {
  const value = (d.value.priority_counts || {})[key] || 0
  return { key, label, color, value, pct: priorityTotal.value ? Math.round(value / priorityTotal.value * 100) : 0 }
}))

const statusTotal = computed(() => Object.values(d.value.status_counts || {}).reduce((a, b) => a + b, 0))
const ST_COLOR = {
  open: 'var(--sd-st-open)', in_progress: 'var(--sd-st-progress)',
  pending_customer: 'var(--sd-st-pending)', pending_vendor: 'var(--sd-st-pending)',
  escalated: 'var(--sd-st-escalated)', resolved: 'var(--sd-st-resolved)', closed: 'var(--sd-st-closed)',
}
const statusBars = computed(() => Object.entries(d.value.status_counts || {})
  .sort((a, b) => b[1] - a[1])
  .map(([key, value]) => ({ key, value, color: ST_COLOR[key] || 'var(--sd-steel)', pct: statusTotal.value ? Math.round(value / statusTotal.value * 100) : 0 })))

/* ── CSV export ── */
const CAP = 500
const exporting = ref(false)
const exportNote = ref('')

const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const exportCsv = async () => {
  if (exporting.value) return
  exporting.value = true
  exportNote.value = ''
  const rows = []
  let capped = false
  try {
    let page = 1
    while (rows.length < CAP) {
      const res = await listTickets({ page, limit: 100 })
      const items = (res && res.items) || []
      for (const t of items) {
        if (rows.length >= CAP) { capped = true; break }
        rows.push(t)
      }
      if (!items.length || items.length < 100) break
      if (rows.length >= CAP) { capped = true; break }
      page += 1
    }

    const header = ['ticket_number', 'subject', 'priority', 'status', 'organization_name', 'assigned_agent_name', 'created_at']
    const lines = [header.join(',')]
    for (const t of rows) {
      lines.push([
        csvCell(t.ticket_number),
        csvCell(t.subject),
        csvCell(t.priority),
        csvCell(t.status),
        csvCell(t.organization_name),
        csvCell(t.assigned_agent_name),
        csvCell(t.created_at),
      ].join(','))
    }
    const csv = lines.join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportNote.value = capped
      ? `Exported ${rows.length} tickets — showing first ${CAP}.`
      : `Exported ${rows.length} ticket${rows.length === 1 ? '' : 's'}.`
  } catch {
    exportNote.value = 'Export failed — please try again.'
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.sd-reports { display: flex; flex-direction: column; gap: 16px; }

.sd-toolbar { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.sd-rep-intro { display: flex; flex-direction: column; gap: 3px; }
.sd-rep-title { font-size: 17px; font-weight: 700; color: var(--sd-text); margin: 0; letter-spacing: -0.01em; }
.sd-rep-sub { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }

.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
.sd-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-spin { animation: sd-spin-slow 0.9s linear infinite; }

.sd-export-note { font-size: 12.5px; color: var(--sd-text-secondary); margin: 0; }

.sd-panel { padding: 18px 20px; }
.sd-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.sd-panel-head h3 { font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.sd-panel-sub { font-size: 11px; color: var(--sd-text-dim); font-family: var(--sd-mono); }

.sd-metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; }
.sd-metric {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border-radius: 14px; text-align: left;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  border-left: 3px solid var(--acc);
}
.sd-metric-val { font-size: 22px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.sd-metric-label { font-size: 11.5px; color: var(--sd-text-muted); font-weight: 500; }

.sd-rep-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }

.sd-vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sd-vital { display: flex; flex-direction: column; gap: 4px; align-items: center; padding: 14px 10px; border-radius: 12px; background: var(--sd-surface-glass); }
.sd-vital-val { font-size: 22px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; }
.sd-vital-label { font-size: 11px; color: var(--sd-text-muted); text-align: center; }

.sd-exec-total { display: flex; flex-direction: column; }
.sd-total-block { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px 0; }
.sd-total-val { font-size: 42px; font-weight: 800; color: var(--sd-amber); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1; }
.sd-total-label { font-size: 12px; color: var(--sd-text-muted); }

.sd-bars { display: flex; flex-direction: column; gap: 11px; }
.sd-bar-row { display: grid; grid-template-columns: 96px 1fr 32px; align-items: center; gap: 10px; }
.sd-bar-label { font-size: 12.5px; color: var(--sd-text-secondary); }
.sd-bar-track { height: 8px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.sd-bar-fill { height: 100%; border-radius: 999px; background: var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent); transition: width 0.6s var(--sd-spring); }
.sd-bar-val { font-size: 12.5px; font-weight: 700; color: var(--sd-text); text-align: right; font-variant-numeric: tabular-nums; }

.sd-empty { text-align: center; color: var(--sd-text-dim); font-size: 12.5px; padding: 16px; margin: 0; }
.sd-future-note { text-align: center; color: var(--sd-text-dim); font-size: 12px; margin: 4px 0 0; font-style: italic; }

@media (max-width: 640px) {
  .sd-bar-row { grid-template-columns: 80px 1fr 28px; }
}
</style>
