<template>
  <div class="sd-dash">
    <!-- KPI grid -->
    <div class="sd-kpis">
      <Motion
        v-for="(k, i) in kpis"
        :key="k.key"
        as="button"
        type="button"
        class="sd-kpi"
        :style="{ '--acc': k.color }"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :while-hover="{ y: -3 }"
        :transition="{ duration: 0.4, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }"
        @click="k.go && $emit('go', k.go)"
      >
        <span class="sd-kpi-ico"><component :is="k.icon" :size="17" /></span>
        <span class="sd-kpi-val">{{ loading ? '—' : k.value }}</span>
        <span class="sd-kpi-label">{{ k.label }}</span>
      </Motion>
    </div>

    <div class="sd-dash-grid">
      <!-- Priority distribution -->
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
          <p v-if="!priorityTotal" class="sd-empty">No open tickets.</p>
        </div>
      </section>

      <!-- Status distribution -->
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
          <p v-if="!statusTotal" class="sd-empty">No tickets yet.</p>
        </div>
      </section>

      <!-- Service vitals -->
      <section class="sd-card sd-panel">
        <header class="sd-panel-head"><h3>Service vitals</h3></header>
        <div class="sd-vitals">
          <div class="sd-vital">
            <span class="sd-vital-val">{{ fmtMins(d.avg_response_mins) }}</span>
            <span class="sd-vital-label">Avg first response</span>
          </div>
          <div class="sd-vital">
            <span class="sd-vital-val">{{ fmtMins(d.avg_resolution_mins) }}</span>
            <span class="sd-vital-label">Avg resolution</span>
          </div>
          <div class="sd-vital">
            <span class="sd-vital-val" :style="{ color: 'var(--sd-success)' }">{{ d.csat != null ? d.csat + '%' : '—' }}</span>
            <span class="sd-vital-label">CSAT</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Recent tickets -->
    <section class="sd-card sd-panel">
      <header class="sd-panel-head">
        <h3>Recent tickets</h3>
        <button class="sd-link" @click="$emit('go', 'tickets')">View all →</button>
      </header>
      <div v-if="recent.length" class="sd-recent">
        <button v-for="t in recent" :key="t.id" class="sd-recent-row" @click="$emit('go', 'tickets')">
          <span class="sd-recent-no sd-mono">{{ t.ticket_number }}</span>
          <span class="sd-recent-subj">{{ t.subject }}</span>
          <SdPill kind="priority" :value="t.priority" />
          <SdPill kind="status" :value="t.status" />
        </button>
      </div>
      <p v-else class="sd-empty">{{ loadingRecent ? 'Loading…' : 'No tickets yet — create your first from the Tickets tab.' }}</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Ticket, Users, AlertTriangle, Timer, CheckCircle2, Layers,
  TrendingUp, Inbox, CircleSlash, Flame,
} from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import { listTickets } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
defineEmits(['go', 'changed'])

const d = computed(() => props.dashboard || {})

const kpis = computed(() => ([
  { key: 'open',       label: 'Open',           icon: Ticket,        value: d.value.open_tickets ?? 0,  color: 'var(--sd-st-open)' },
  { key: 'unassigned', label: 'Unassigned',     icon: Inbox,         value: d.value.unassigned ?? 0,    color: 'var(--sd-steel)' },
  { key: 'pending',    label: 'Pending',        icon: Timer,         value: d.value.pending ?? 0,       color: 'var(--sd-st-pending)' },
  { key: 'critical',   label: 'Critical',       icon: AlertTriangle, value: d.value.critical ?? 0,      color: 'var(--sd-pri-critical)', go: 'tickets' },
  { key: 'escalated',  label: 'Escalated',      icon: Flame,         value: d.value.escalated ?? 0,     color: 'var(--sd-st-escalated)' },
  { key: 'overdue',    label: 'Overdue',        icon: CircleSlash,   value: d.value.overdue ?? 0,       color: 'var(--sd-danger)' },
  { key: 'breached',   label: 'SLA Breached',   icon: TrendingUp,    value: d.value.sla_breached ?? 0,  color: 'var(--sd-st-breached)', go: 'sla' },
  { key: 'resolved',   label: 'Resolved Today', icon: CheckCircle2,  value: d.value.resolved_today ?? 0, color: 'var(--sd-success)' },
  { key: 'closed',     label: 'Closed Today',   icon: CheckCircle2,  value: d.value.closed_today ?? 0,  color: 'var(--sd-steel)' },
  { key: 'total',      label: 'Total',          icon: Layers,        value: d.value.total_tickets ?? 0, color: 'var(--sd-amber)' },
]))

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

const fmtMins = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}

// Recent tickets
const recent = ref([])
const loadingRecent = ref(true)
onMounted(async () => {
  try { recent.value = (await listTickets({ limit: 6, page: 1 })).items || [] }
  catch { recent.value = [] }
  finally { loadingRecent.value = false }
})
</script>

<style scoped>
.sd-dash { display: flex; flex-direction: column; gap: 16px; }

.sd-kpis {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(124px, 1fr)); gap: 10px;
}
.sd-kpi {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border-radius: 16px; text-align: left; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring);
}
.sd-kpi:hover { border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: 0 8px 22px rgba(0,0,0,0.25); }
.sd-kpi-ico { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); }
.sd-kpi-val { font-size: 24px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; margin-top: 4px; }
.sd-kpi-label { font-size: 11.5px; color: var(--sd-text-muted); font-weight: 500; }

.sd-dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }

.sd-panel { padding: 18px 20px; }
.sd-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.sd-panel-head h3 { font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.sd-panel-sub { font-size: 11px; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.sd-link { background: none; border: none; color: var(--sd-amber); font-size: 12.5px; font-weight: 600; cursor: pointer; }

.sd-bars { display: flex; flex-direction: column; gap: 11px; }
.sd-bar-row { display: grid; grid-template-columns: 96px 1fr 32px; align-items: center; gap: 10px; }
.sd-bar-label { font-size: 12.5px; color: var(--sd-text-secondary); }
.sd-bar-track { height: 8px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.sd-bar-fill { height: 100%; border-radius: 999px; background: var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent); transition: width 0.6s var(--sd-spring); }
.sd-bar-val { font-size: 12.5px; font-weight: 700; color: var(--sd-text); text-align: right; font-variant-numeric: tabular-nums; }

.sd-vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sd-vital { display: flex; flex-direction: column; gap: 4px; align-items: center; padding: 10px; border-radius: 12px; background: var(--sd-surface-glass); }
.sd-vital-val { font-size: 22px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; }
.sd-vital-label { font-size: 11px; color: var(--sd-text-muted); text-align: center; }

.sd-recent { display: flex; flex-direction: column; gap: 6px; }
.sd-recent-row {
  display: grid; grid-template-columns: 110px 1fr auto auto; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 11px; cursor: pointer; text-align: left;
  background: transparent; border: 1px solid transparent;
  transition: background 0.18s, border-color 0.18s;
}
.sd-recent-row:hover { background: var(--sd-surface-glass); border-color: var(--sd-border); }
.sd-recent-no { font-size: 12px; color: var(--sd-amber); font-weight: 700; }
.sd-recent-subj { font-size: 13.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-empty { text-align: center; color: var(--sd-text-dim); font-size: 12.5px; padding: 16px; margin: 0; }

@media (max-width: 640px) {
  .sd-recent-row { grid-template-columns: 1fr auto; }
  .sd-recent-no, .sd-bar-row { display: none; }
}
</style>
