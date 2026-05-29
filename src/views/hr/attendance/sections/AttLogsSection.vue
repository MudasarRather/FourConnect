<template>
  <section class="att-logs" data-anim="att-logs">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="logs-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="logs-banner-grid" aria-hidden="true" />
      <span class="logs-banner-glow" />

      <!-- Live audit stream visualization on the right -->
      <div class="logs-stream-mock" aria-hidden="true">
        <div class="logs-stream-frame">
          <span class="logs-stream-frame-corner tl" />
          <span class="logs-stream-frame-corner tr" />
          <span class="logs-stream-frame-corner bl" />
          <span class="logs-stream-frame-corner br" />
          <div class="logs-stream-track">
            <div v-for="(line, idx) in TICKER_LINES.concat(TICKER_LINES)" :key="idx" class="logs-stream-line">
              <span class="logs-stream-ts">{{ line.ts }}</span>
              <span class="logs-stream-action" :data-tone="line.tone">{{ line.action }}</span>
              <span class="logs-stream-payload">{{ line.payload }}</span>
            </div>
          </div>
          <span class="logs-stream-scan" />
          <span class="logs-stream-live">
            <span class="logs-stream-live-dot" />LIVE
          </span>
        </div>
      </div>

      <div class="logs-banner-text">
        <span class="logs-eyebrow">
          <span class="logs-eyebrow-dot" />
          Immutable audit trail · Append-only · Compliance-ready
        </span>
        <h2 class="logs-banner-title">
          <span>Attendance</span>
          <span class="logs-banner-divider">·</span>
          <span>Logs</span>
        </h2>
        <p class="logs-banner-sub">
          Every punch, edit, approval and lock — <strong>append-only</strong>. The trail
          payroll auditors and compliance teams will <em>ask for</em>.
        </p>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP ═══════════════════ -->
    <div class="logs-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['logs-kpi', `tone-${t.tone}`]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
      >
        <span class="kpi-stripe" aria-hidden="true" />
        <span class="kpi-scan" aria-hidden="true" />
        <div class="kpi-head">
          <span class="kpi-eyebrow">
            <component :is="t.icon" :size="11" />
            <span>{{ t.label }}</span>
          </span>
        </div>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}</Motion>
        <span class="kpi-foot">{{ t.foot }}</span>
        <!-- Mini bar-graph (sparkline) at the bottom -->
        <div class="kpi-bars">
          <span v-for="(b, idx) in 8" :key="idx"
            :class="['kpi-bar', { lit: idx < t.barCount }]"
            :style="{ height: `${20 + ((idx * 7 + i * 11) % 60)}%` }"
          />
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ ACTION FILTER STRIP ═══════════════════ -->
    <Motion as="div" class="logs-filter-wrap"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.28 }"
    >
      <div class="logs-filter-row">
        <span class="logs-filter-label">
          <Filter :size="11" />ACTION
        </span>
        <div class="logs-filter-pills">
          <Motion as="button" type="button"
            :class="['logs-pill', { active: action === '' }]"
            :whileHover="{ y: -1, scale: 1.04 }" :whileTap="{ scale: 0.96 }"
            @click="action = ''; page = 1; reload()"
          >
            <Asterisk :size="10" />ALL<span class="logs-pill-count">{{ rows.length }}</span>
          </Motion>
          <Motion v-for="a in ACTIONS" :key="a"
            as="button" type="button"
            :class="['logs-pill', `tone-${actionTone(a)}`, { active: action === a }]"
            :whileHover="{ y: -1, scale: 1.04 }" :whileTap="{ scale: 0.96 }"
            @click="action = a; page = 1; reload()"
          >
            <component :is="iconForAction(a)" :size="10" />
            {{ a.replace(/_/g, ' ') }}
            <span class="logs-pill-count">{{ actionCount(a) }}</span>
          </Motion>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════ TOOLBAR ═══════════════════ -->
    <Motion as="div" class="logs-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.34 }"
    >
      <span class="logs-toolbar-meta">
        <Activity :size="11" />
        Showing <strong>{{ rows.length }}</strong> entries
        <span v-if="action" class="logs-toolbar-chip">
          <component :is="iconForAction(action)" :size="9" />{{ action.replace(/_/g, ' ') }}
        </span>
      </span>
      <div class="logs-toolbar-right">
        <label class="logs-page-size">
          <span>ROWS</span>
          <select v-model.number="limit" @change="page = 1; reload()" class="logs-mini-select">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="200">200</option>
          </select>
        </label>
        <Motion as="button" class="logs-btn logs-btn-ghost"
          :disabled="loading"
          :whileHover="!loading ? { y: -1, scale: 1.02 } : {}"
          :whileTap="!loading ? { scale: 0.96 } : {}"
          @click="reload"
        >
          <RefreshCw :size="13" :class="{ spinning: loading }" />
          {{ loading ? 'Loading…' : 'Refresh' }}
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ LOGS STREAM ═══════════════════ -->
    <Motion v-if="rows.length" as="article" class="logs-stream"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <header class="logs-stream-head">
        <span class="logs-stream-head-cell head-when">When</span>
        <span class="logs-stream-head-cell head-action">Action</span>
        <span class="logs-stream-head-cell head-actor">Actor</span>
        <span class="logs-stream-head-cell head-target">Target</span>
        <span class="logs-stream-head-cell head-payload">Payload</span>
      </header>
      <div class="logs-stream-body">
        <Motion v-for="(l, i) in rows" :key="l.id" as="div"
          :class="['logs-stream-row', `tone-${actionTone(l.action)}`, { expanded: expandedId === l.id }]"
          :initial="{ opacity: 0, x: -6 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.28, delay: 0.018 * i, ease: [0.22, 1, 0.36, 1] }"
          @click="expandedId = expandedId === l.id ? null : l.id"
        >
          <span class="logs-row-stripe" aria-hidden="true" />
          <span class="logs-when">
            <span class="logs-when-date onb-mono">{{ formatStampDate(l.created_at) }}</span>
            <span class="logs-when-time onb-mono">{{ formatStampTime(l.created_at) }}</span>
          </span>
          <span class="logs-action-cell">
            <span class="logs-action-icon">
              <component :is="iconForAction(l.action)" :size="11" />
            </span>
            <span class="logs-action-name">{{ l.action.replace(/_/g, ' ') }}</span>
          </span>
          <span class="logs-actor">
            <span class="logs-actor-avatar">{{ actorInitials(l.actor_name) }}</span>
            <span class="logs-actor-name">{{ l.actor_name || 'SYSTEM' }}</span>
          </span>
          <span class="logs-target">
            <Database :size="10" />
            <span class="onb-mono">{{ targetLabel(l) }}</span>
          </span>
          <span class="logs-payload">
            <code class="onb-mono">{{ shortPayload(l.payload) }}</code>
          </span>

          <!-- Expanded payload (hover/click reveal) -->
          <div v-if="expandedId === l.id" class="logs-payload-full" @click.stop>
            <div class="logs-payload-full-head">
              <span class="logs-payload-dot dot-r" />
              <span class="logs-payload-dot dot-y" />
              <span class="logs-payload-dot dot-g" />
              <span class="logs-payload-title"><Braces :size="10" />payload.json</span>
              <span class="logs-payload-action-tag" :data-tone="actionTone(l.action)">{{ l.action.replace(/_/g, ' ') }}</span>
            </div>
            <pre class="logs-payload-code" v-html="highlightJson(l.payload || {})"></pre>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="logs-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45 }"
    >
      <span class="logs-empty-aurora" />
      <div class="logs-empty-illustration">
        <span class="logs-empty-grid-bg" aria-hidden="true" />
        <ScrollText :size="42" class="logs-empty-icon" />
        <span class="logs-empty-ring r1" />
        <span class="logs-empty-ring r2" />
        <span class="logs-empty-ring r3" />
        <span class="logs-empty-scan" />
      </div>
      <h3>No log entries match this filter</h3>
      <p>Every status change, punch, approval and correction writes an immutable row here.
         Pick a wider window or clear the action filter to see history.</p>
      <Motion as="button" class="logs-btn logs-btn-primary"
        :whileHover="{ y: -1, scale: 1.03 }" :whileTap="{ scale: 0.96 }"
        @click="action = ''; page = 1; reload()"
      >
        <Filter :size="13" />Clear filters
      </Motion>
      <div class="logs-empty-meta">
        <span class="logs-empty-meta-dot" />Live · auto-refresh on demand
      </div>
    </Motion>

    <!-- ═══════════════════ PAGINATION ═══════════════════ -->
    <Motion v-if="totalPages > 1" as="div" class="logs-pager"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.4 }"
    >
      <Motion as="button" class="logs-pager-btn"
        :disabled="page <= 1"
        :whileHover="page > 1 ? { x: -2 } : {}"
        :whileTap="page > 1 ? { scale: 0.96 } : {}"
        @click="page--; reload()"
      >
        <ChevronLeft :size="13" />Prev
      </Motion>
      <div class="logs-pager-pages">
        <span class="logs-pager-current">{{ page }}</span>
        <span class="logs-pager-divider">/</span>
        <span class="logs-pager-total">{{ totalPages }}</span>
      </div>
      <Motion as="button" class="logs-pager-btn"
        :disabled="page >= totalPages"
        :whileHover="page < totalPages ? { x: 2 } : {}"
        :whileTap="page < totalPages ? { scale: 0.96 } : {}"
        @click="page++; reload()"
      >
        Next<ChevronRight :size="13" />
      </Motion>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, ScrollText, Fingerprint, Pencil, CheckCircle2, XCircle,
  Lock, Unlock, ScanFace, ShieldAlert, AlertTriangle, BookOpenCheck,
  CalendarClock, Home, TimerReset, Filter, Activity, Database, Braces,
  Asterisk, ChevronLeft, ChevronRight, Zap,
} from 'lucide-vue-next'
import { fetchAttendanceLogs } from '../composables/useAttendance'
import { useToast } from 'vue-toastification'

defineEmits([])
const toast = useToast()

const ACTIONS = [
  'PUNCH', 'MANUAL_EDIT', 'CORRECTION_REQUESTED', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED',
  'BIOMETRIC_SYNC', 'POLICY_CHANGE', 'SHIFT_ASSIGNED', 'WFH_APPROVED', 'WFH_REJECTED',
  'OT_APPROVED', 'ABSENTEE_MARKED', 'DAY_LOCKED', 'DAY_UNLOCKED',
]

// Tone mapping — keeps to warm gold/amber + teal-success + red-danger + slate.
// No blue/purple/cyan/indigo anywhere.
const ACTION_TONE = {
  PUNCH:                'teal',
  MANUAL_EDIT:          'amber',
  CORRECTION_REQUESTED: 'gold',
  CORRECTION_APPROVED:  'teal',
  CORRECTION_REJECTED:  'red',
  BIOMETRIC_SYNC:       'amber',
  POLICY_CHANGE:        'orange',
  SHIFT_ASSIGNED:       'gold',
  WFH_APPROVED:         'teal',
  WFH_REJECTED:         'red',
  OT_APPROVED:          'teal',
  ABSENTEE_MARKED:      'red',
  DAY_LOCKED:           'slate',
  DAY_UNLOCKED:         'gold',
}
const actionTone = (a) => ACTION_TONE[a] || 'slate'

const action = ref('')
const rows = ref([])
const page = ref(1)
const limit = ref(50)
const totalPages = ref(1)
const loading = ref(false)
const expandedId = ref(null)

// Ticker lines for the banner stream visualization. Pure decoration —
// fake but plausible log entries so the live-stream feel is conveyed
// before any real data is loaded.
const TICKER_LINES = [
  { ts: '23:39:02', action: 'PUNCH',                tone: 'teal',   payload: '{ emp: 0418, dir: IN }' },
  { ts: '23:37:48', action: 'CORRECTION_APPROVED',  tone: 'teal',   payload: '{ id: 0x42a9 }' },
  { ts: '23:31:15', action: 'BIOMETRIC_SYNC',       tone: 'amber',  payload: '{ device: ZKT-MUM-01 }' },
  { ts: '23:24:09', action: 'DAY_LOCKED',           tone: 'slate',  payload: '{ date: 2026-05-29 }' },
  { ts: '23:18:33', action: 'WFH_APPROVED',         tone: 'teal',   payload: '{ emp: 0571 }' },
  { ts: '23:14:50', action: 'POLICY_CHANGE',        tone: 'orange', payload: '{ pol: LATE_RULE }' },
  { ts: '23:08:21', action: 'ABSENTEE_MARKED',      tone: 'red',    payload: '{ marked: 3 }' },
]

// ── KPI calculations from the current page's rows ────────────────────────
const isToday = (iso) => {
  if (!iso) return false
  const t = new Date(iso)
  const n = new Date()
  return t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth() && t.getDate() === n.getDate()
}
const todayRows = computed(() => rows.value.filter(r => isToday(r.created_at)))
const todayPunches = computed(() => todayRows.value.filter(r => r.action === 'PUNCH').length)
const todayApprovals = computed(() =>
  todayRows.value.filter(r =>
    r.action === 'CORRECTION_APPROVED' ||
    r.action === 'WFH_APPROVED' ||
    r.action === 'OT_APPROVED'
  ).length
)
const todayOverrides = computed(() =>
  todayRows.value.filter(r =>
    r.action === 'MANUAL_EDIT' ||
    r.action === 'DAY_LOCKED' ||
    r.action === 'DAY_UNLOCKED' ||
    r.action === 'POLICY_CHANGE'
  ).length
)

const kpiTiles = computed(() => [
  {
    key: 'today', label: 'TODAY · TOTAL', icon: Activity, tone: 'gold',
    value: todayRows.value.length,
    foot: todayRows.value.length === 1 ? '1 entry on the audit trail' : `${todayRows.value.length} entries on the audit trail`,
    barCount: Math.min(8, Math.max(1, Math.ceil(todayRows.value.length / 6))),
  },
  {
    key: 'punches', label: 'PUNCHES TODAY', icon: Fingerprint, tone: 'teal',
    value: todayPunches.value,
    foot: 'in/out events',
    barCount: Math.min(8, Math.max(0, Math.ceil(todayPunches.value / 3))),
  },
  {
    key: 'approvals', label: 'APPROVALS TODAY', icon: CheckCircle2, tone: 'teal',
    value: todayApprovals.value,
    foot: 'corrections · WFH · OT',
    barCount: Math.min(8, Math.max(0, Math.ceil(todayApprovals.value / 2))),
  },
  {
    key: 'overrides', label: 'OVERRIDES · LOCKS', icon: Zap, tone: 'orange',
    value: todayOverrides.value,
    foot: 'manual interventions',
    barCount: Math.min(8, Math.max(0, Math.ceil(todayOverrides.value / 2))),
  },
])

const actionCount = (a) => rows.value.filter(r => r.action === a).length

const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (action.value) params.action = action.value
    const data = await fetchAttendanceLogs(params)
    rows.value = data.items || []
    totalPages.value = data.total_pages || 1
    expandedId.value = null
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load logs')
  } finally {
    loading.value = false
  }
}
onMounted(reload)

const formatStampDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const formatStampTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const shortPayload = (p) => {
  if (!p || typeof p !== 'object') return ''
  const s = JSON.stringify(p)
  return s.length > 90 ? s.slice(0, 87) + '…' : s
}

const targetLabel = (l) => {
  if (!l.target_table) return '—'
  // strip the redundant "hr_" prefix on attendance tables to keep the cell tight
  return l.target_table.replace(/^hr_/, '')
}

const actorInitials = (n) => {
  if (!n) return 'SY'
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
}

const iconForAction = (a) => ({
  PUNCH: Fingerprint, MANUAL_EDIT: Pencil,
  CORRECTION_REQUESTED: Pencil, CORRECTION_APPROVED: CheckCircle2, CORRECTION_REJECTED: XCircle,
  BIOMETRIC_SYNC: ScanFace, POLICY_CHANGE: BookOpenCheck,
  SHIFT_ASSIGNED: CalendarClock, WFH_APPROVED: Home, WFH_REJECTED: XCircle,
  OT_APPROVED: TimerReset, ABSENTEE_MARKED: AlertTriangle,
  DAY_LOCKED: Lock, DAY_UNLOCKED: Unlock,
}[a] || ShieldAlert)

// Lightweight JSON syntax highlighter, same pattern as the policies code block.
const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const highlightJson = (payload) => {
  let raw
  try { raw = JSON.stringify(payload || {}, null, 2) } catch { return '' }
  raw = escapeHtml(raw)
  return raw.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'lg-tok-num'
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'lg-tok-key' : 'lg-tok-str'
      else if (/true|false/.test(match)) cls = 'lg-tok-bool'
      else if (/null/.test(match)) cls = 'lg-tok-null'
      return `<span class="${cls}">${match}</span>`
    }
  )
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-logs { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ═══════════════════════════════════════════════════════════════════════
   HERO BANNER — terminal/data-stream motif
   ═══════════════════════════════════════════════════════════════════════ */
.logs-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 191, 36, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(20, 184, 166, 0.10), transparent 70%),
    var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: block;
  isolation: isolate;
}
[data-theme="light"] .logs-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(217, 119, 6, 0.16), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(13, 148, 136, 0.10), transparent 70%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.logs-banner-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  z-index: 0; pointer-events: none;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.55));
}
[data-theme="light"] .logs-banner-grid {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}

.logs-banner-glow {
  position: absolute; inset: -50% -10% auto auto;
  width: 60%; height: 240%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.22), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Streaming "terminal window" mock on the right side */
.logs-stream-mock {
  position: absolute;
  top: 50%; right: 24px;
  transform: translateY(-50%);
  width: 320px; height: 200px;
  z-index: 1; pointer-events: none;
}
@media (max-width: 1100px) {
  .logs-stream-mock { display: none; }
}
.logs-stream-frame {
  position: relative;
  width: 100%; height: 100%;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(8, 6, 4, 0.92), rgba(14, 10, 8, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.42);
  box-shadow:
    inset 0 0 24px rgba(0, 0, 0, 0.40),
    0 14px 30px -16px rgba(234, 88, 12, 0.45);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .logs-stream-frame {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(254, 243, 199, 0.65));
  border-color: rgba(180, 83, 9, 0.45);
  box-shadow:
    inset 0 0 24px rgba(120, 53, 15, 0.10),
    0 14px 30px -16px rgba(180, 83, 9, 0.35);
}
.logs-stream-frame-corner {
  position: absolute;
  width: 14px; height: 14px;
  border: 2px solid rgba(251, 191, 36, 0.75);
  pointer-events: none;
}
[data-theme="light"] .logs-stream-frame-corner { border-color: rgba(180, 83, 9, 0.65); }
.logs-stream-frame-corner.tl { top: 4px; left: 4px;  border-right: 0; border-bottom: 0; border-radius: 6px 0 0 0; }
.logs-stream-frame-corner.tr { top: 4px; right: 4px; border-left: 0;  border-bottom: 0; border-radius: 0 6px 0 0; }
.logs-stream-frame-corner.bl { bottom: 4px; left: 4px;  border-right: 0; border-top: 0; border-radius: 0 0 0 6px; }
.logs-stream-frame-corner.br { bottom: 4px; right: 4px; border-left: 0;  border-top: 0; border-radius: 0 0 6px 0; }

.logs-stream-track {
  position: absolute; inset: 14px 12px 14px 12px;
  display: flex; flex-direction: column; gap: 4px;
  animation: logs-stream-scroll 18s linear infinite;
}
@keyframes logs-stream-scroll {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
.logs-stream-line {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--hr-mono);
  font-size: 10px;
  white-space: nowrap;
  opacity: 0.9;
}
.logs-stream-ts {
  color: rgba(251, 191, 36, 0.65);
  letter-spacing: 0.4px;
}
[data-theme="light"] .logs-stream-ts { color: rgba(180, 83, 9, 0.65); }
.logs-stream-action {
  font-weight: 800; letter-spacing: 0.5px;
  padding: 1px 5px; border-radius: 4px;
  font-size: 8.5px;
}
.logs-stream-action[data-tone="teal"]   { background: rgba(16, 185, 129, 0.18); color: #5eead4; }
.logs-stream-action[data-tone="amber"]  { background: rgba(251, 191, 36, 0.18); color: #fcd34d; }
.logs-stream-action[data-tone="gold"]   { background: rgba(252, 211, 77, 0.18); color: #fde68a; }
.logs-stream-action[data-tone="red"]    { background: rgba(239, 68, 68, 0.18);  color: #fca5a5; }
.logs-stream-action[data-tone="orange"] { background: rgba(234, 88, 12, 0.18);  color: #fdba74; }
.logs-stream-action[data-tone="slate"]  { background: rgba(148, 163, 184, 0.18); color: #cbd5e1; }
[data-theme="light"] .logs-stream-action[data-tone="teal"]   { background: rgba(16, 185, 129, 0.22); color: #065f46; }
[data-theme="light"] .logs-stream-action[data-tone="amber"]  { background: rgba(251, 191, 36, 0.26); color: #92400e; }
[data-theme="light"] .logs-stream-action[data-tone="gold"]   { background: rgba(252, 211, 77, 0.26); color: #b45309; }
[data-theme="light"] .logs-stream-action[data-tone="red"]    { background: rgba(239, 68, 68, 0.20);  color: #7f1d1d; }
[data-theme="light"] .logs-stream-action[data-tone="orange"] { background: rgba(234, 88, 12, 0.22);  color: #9a3412; }
[data-theme="light"] .logs-stream-action[data-tone="slate"]  { background: rgba(148, 163, 184, 0.22); color: #334155; }
.logs-stream-payload { color: var(--hr-text-muted); }
[data-theme="light"] .logs-stream-payload { color: #6b5840; }

/* Scanning beam over the stream */
.logs-stream-scan {
  position: absolute; left: 0; right: 0;
  top: 0;
  height: 60px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(94, 234, 212, 0.18) 50%,
    transparent 100%);
  pointer-events: none;
  animation: logs-stream-scan-beam 4s ease-in-out infinite;
}
[data-theme="light"] .logs-stream-scan {
  background: linear-gradient(180deg, transparent, rgba(13, 148, 136, 0.16) 50%, transparent);
}
@keyframes logs-stream-scan-beam {
  0%, 100% { top: -60px; opacity: 0.5; }
  50%      { top: 100%;  opacity: 0.95; }
}

.logs-stream-live {
  position: absolute; top: 8px; right: 10px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.55);
  font-size: 8.5px; font-weight: 900; letter-spacing: 1.4px;
  color: #fca5a5;
  z-index: 2;
}
[data-theme="light"] .logs-stream-live { background: rgba(239, 68, 68, 0.18); color: #7f1d1d; border-color: rgba(185, 28, 28, 0.55); }
.logs-stream-live-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
  animation: att-live-pulse 1.6s ease-in-out infinite;
}

.logs-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 340px; }
.logs-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fcd34d;
}
[data-theme="light"] .logs-eyebrow { color: #b45309; }
.logs-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .logs-eyebrow-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.55); }

.logs-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fbbf24 30%, #fb923c 60%, #fde68a 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: logs-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .logs-banner-title {
  background: linear-gradient(110deg, #b45309 0%, #d97706 30%, #c2410c 60%, #b45309 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes logs-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.logs-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.logs-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 560px;
}
.logs-banner-sub strong { color: #fcd34d; font-weight: 700; }
.logs-banner-sub em { color: #5eead4; font-style: normal; font-weight: 600; }
[data-theme="light"] .logs-banner-sub strong { color: #b45309; }
[data-theme="light"] .logs-banner-sub em { color: #115e59; }

/* ═══════════════════════════════════════════════════════════════════════
   KPI STRIP — bar-chart accent + scanning sheen
   ═══════════════════════════════════════════════════════════════════════ */
.logs-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.logs-kpi {
  position: relative;
  padding: 14px 18px 12px;
  border-radius: 16px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .logs-kpi {
  border-color: rgba(180, 83, 9, 0.40);
  background: rgba(255, 250, 240, 0.92);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
.logs-kpi:hover {
  border-color: rgba(251, 191, 36, 0.75);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(234, 88, 12, 0.42));
}
[data-theme="light"] .logs-kpi:hover {
  border-color: rgba(180, 83, 9, 0.65);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(180, 83, 9, 0.30));
}

/* Vertical stripe on the left edge */
.kpi-stripe {
  position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(180deg, var(--accent, #fbbf24), transparent);
}
[data-theme="light"] .kpi-stripe { background: linear-gradient(180deg, var(--accent-light, #d97706), transparent); }

/* Scanning sheen sweeps across on hover */
.kpi-scan {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.10) 50%, transparent 60%);
  transform: translateX(-100%);
  pointer-events: none;
  transition: transform 0.85s var(--att-spring);
}
.logs-kpi:hover .kpi-scan { transform: translateX(100%); }
[data-theme="light"] .kpi-scan {
  background: linear-gradient(115deg, transparent 40%, rgba(180, 83, 9, 0.10) 50%, transparent 60%);
}

.kpi-head { display: flex; align-items: center; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }
.kpi-num {
  display: block;
  margin: 8px 0 3px;
  font-size: 28px; font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 191, 36, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { display: block; font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

/* Mini bar-graph */
.kpi-bars {
  margin-top: 10px;
  display: inline-flex; align-items: flex-end; gap: 3px;
  height: 18px;
}
.kpi-bar {
  width: 5px;
  border-radius: 1px;
  background: rgba(148, 163, 184, 0.22);
  border: 1px solid rgba(148, 163, 184, 0.30);
}
.kpi-bar.lit {
  background: linear-gradient(180deg, var(--accent, #fbbf24), var(--accent-light, #d97706));
  border-color: var(--accent, #fbbf24);
  box-shadow: 0 0 4px var(--accent-glow, rgba(251, 191, 36, 0.45));
}
[data-theme="light"] .kpi-bar { background: rgba(120, 53, 15, 0.10); border-color: rgba(120, 53, 15, 0.20); }
[data-theme="light"] .kpi-bar.lit {
  background: linear-gradient(180deg, var(--accent-light, #d97706), var(--accent-light, #b45309));
  border-color: var(--accent-light, #d97706);
}

.tone-gold   { --accent: #fbbf24; --accent-light: #d97706; --accent-glow: rgba(251, 191, 36, 0.32); --accent-shadow: rgba(217, 119, 6, 0.45); --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.tone-teal   { --accent: #10b981; --accent-light: #047857; --accent-glow: rgba(16, 185, 129, 0.30); --accent-shadow: rgba(5, 150, 105, 0.45);  --accent-shadow-light: rgba(4, 120, 87, 0.45); }
.tone-amber  { --accent: #f59e0b; --accent-light: #b45309; --accent-glow: rgba(245, 158, 11, 0.30); --accent-shadow: rgba(217, 119, 6, 0.45); --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.tone-orange { --accent: #fb923c; --accent-light: #c2410c; --accent-glow: rgba(251, 146, 60, 0.30); --accent-shadow: rgba(194, 65, 12, 0.45); --accent-shadow-light: rgba(154, 52, 18, 0.45); }
.tone-red    { --accent: #ef4444; --accent-light: #991b1b; --accent-glow: rgba(239, 68, 68, 0.30);  --accent-shadow: rgba(185, 28, 28, 0.45); --accent-shadow-light: rgba(153, 27, 27, 0.45); }
.tone-slate  { --accent: #94a3b8; --accent-light: #475569; --accent-glow: rgba(148, 163, 184, 0.26); --accent-shadow: rgba(71, 85, 105, 0.40);  --accent-shadow-light: rgba(71, 85, 105, 0.35); }

/* ═══════════════════════════════════════════════════════════════════════
   ACTION FILTER STRIP
   ═══════════════════════════════════════════════════════════════════════ */
.logs-filter-wrap {
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .logs-filter-wrap {
  border-color: rgba(180, 83, 9, 0.40);
  background: rgba(255, 250, 240, 0.85);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.logs-filter-row {
  display: flex; align-items: flex-start; gap: 12px;
}
.logs-filter-label {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.45);
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  color: #fcd34d;
  margin-top: 1px;
}
[data-theme="light"] .logs-filter-label {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(180, 83, 9, 0.45);
  color: #b45309;
}
.logs-filter-pills {
  flex: 1;
  display: flex; flex-wrap: wrap; gap: 5px;
}
.logs-pill {
  position: relative;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: var(--hr-text-muted);
  font: inherit; font-size: 10px; font-weight: 800;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
[data-theme="light"] .logs-pill {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(180, 83, 9, 0.28);
  color: #6b5840;
}
.logs-pill:hover {
  border-color: var(--accent, #fbbf24);
  color: var(--accent, #fcd34d);
}
[data-theme="light"] .logs-pill:hover { color: var(--accent-light, #b45309); }
.logs-pill.active {
  background: linear-gradient(135deg, var(--accent-light, #fbbf24), var(--accent, #fcd34d));
  color: #1f1408;
  border-color: var(--accent, #fbbf24);
  box-shadow: 0 4px 12px -4px var(--accent-shadow, rgba(217, 119, 6, 0.50));
}
[data-theme="light"] .logs-pill.active {
  background: linear-gradient(135deg, var(--accent-light, #d97706), var(--accent, #fbbf24));
  color: #fff;
}
.logs-pill svg { color: inherit; }
.logs-pill-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 14px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800;
  background: rgba(0, 0, 0, 0.22);
  color: inherit;
}
.logs-pill.active .logs-pill-count {
  background: rgba(31, 20, 8, 0.20);
  color: inherit;
}
[data-theme="light"] .logs-pill-count {
  background: rgba(120, 53, 15, 0.10);
}
[data-theme="light"] .logs-pill.active .logs-pill-count {
  background: rgba(255, 255, 255, 0.30);
  color: inherit;
}

/* ═══════════════════════════════════════════════════════════════════════
   TOOLBAR — meta + page-size + refresh
   ═══════════════════════════════════════════════════════════════════════ */
.logs-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .logs-toolbar {
  border-color: rgba(180, 83, 9, 0.40);
  background: rgba(255, 250, 240, 0.85);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.logs-toolbar-meta {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.logs-toolbar-meta strong { color: #fcd34d; font-weight: 800; }
.logs-toolbar-meta svg { color: #fcd34d; }
[data-theme="light"] .logs-toolbar-meta strong { color: #b45309; }
[data-theme="light"] .logs-toolbar-meta svg { color: #b45309; }
.logs-toolbar-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fcd34d;
  font-size: 9px;
}
[data-theme="light"] .logs-toolbar-chip {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.45);
  color: #b45309;
}
.logs-toolbar-right { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.logs-page-size {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
[data-theme="light"] .logs-page-size { color: #6b5840; }
.logs-mini-select {
  background: rgba(0, 0, 0, 0.20);
  border: 1px solid rgba(251, 191, 36, 0.40);
  color: var(--hr-text);
  border-radius: 8px; padding: 4px 8px;
  font: inherit; font-size: 11px; font-weight: 700;
  color-scheme: dark;
  cursor: pointer;
}
[data-theme="light"] .logs-mini-select {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.40);
  color: var(--hr-text);
  color-scheme: light;
}
.logs-mini-select:focus {
  outline: none;
  border-color: rgba(251, 191, 36, 0.75);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.20);
}

.logs-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s, transform .2s;
}
.logs-btn-primary {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%);
  background-size: 200% 200%;
  color: #1f1408;
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 8px 20px -10px rgba(217, 119, 6, 0.60);
}
.logs-btn-primary:hover:not(:disabled) {
  background-position: 100% 50%;
  box-shadow: 0 14px 30px -10px rgba(217, 119, 6, 0.75);
}
[data-theme="light"] .logs-btn-primary {
  background: linear-gradient(135deg, #fbbf24, #d97706 50%, #c2410c);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
}
.logs-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text-secondary);
  border-color: rgba(251, 191, 36, 0.40);
}
.logs-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 191, 36, 0.60);
  color: var(--hr-text);
}
.logs-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="light"] .logs-btn-ghost {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.40);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .logs-btn-ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(180, 83, 9, 0.60);
  color: var(--hr-text);
}
.spinning { animation: logs-spin 0.9s linear infinite; }
@keyframes logs-spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════════════════════
   LOGS STREAM — terminal-style audit feed
   ═══════════════════════════════════════════════════════════════════════ */
.logs-stream {
  position: relative;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(20, 16, 14, 0.86), rgba(14, 10, 8, 0.94));
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 12px 32px -18px rgba(0, 0, 0, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .logs-stream {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 12px 32px -18px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.logs-stream-head {
  display: grid;
  grid-template-columns: 130px 1.4fr 1.3fr 1fr 2fr;
  gap: 12px;
  padding: 10px 18px;
  background: rgba(251, 191, 36, 0.06);
  border-bottom: 1px solid rgba(251, 191, 36, 0.32);
}
[data-theme="light"] .logs-stream-head {
  background: rgba(251, 191, 36, 0.14);
  border-bottom-color: rgba(180, 83, 9, 0.32);
}
.logs-stream-head-cell {
  font-size: 9px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
[data-theme="light"] .logs-stream-head-cell { color: #6b5840; }

.logs-stream-body { display: flex; flex-direction: column; }

.logs-stream-row {
  position: relative;
  display: grid;
  grid-template-columns: 130px 1.4fr 1.3fr 1fr 2fr;
  gap: 12px; align-items: center;
  padding: 11px 18px;
  border-top: 1px solid rgba(251, 191, 36, 0.14);
  font-size: 11.5px; color: var(--hr-text);
  cursor: pointer;
  transition: background .25s;
}
[data-theme="light"] .logs-stream-row { border-top-color: rgba(180, 83, 9, 0.18); }
.logs-stream-row:nth-child(even) { background: rgba(251, 191, 36, 0.03); }
[data-theme="light"] .logs-stream-row:nth-child(even) { background: rgba(251, 191, 36, 0.08); }
.logs-stream-row:hover { background: rgba(251, 191, 36, 0.10); }
[data-theme="light"] .logs-stream-row:hover { background: rgba(251, 191, 36, 0.16); }
.logs-stream-row.expanded {
  background: rgba(251, 191, 36, 0.14);
  border-top-color: var(--accent, rgba(251, 191, 36, 0.65));
}
[data-theme="light"] .logs-stream-row.expanded {
  background: rgba(251, 191, 36, 0.22);
  border-top-color: var(--accent-light, rgba(180, 83, 9, 0.65));
}

/* Tone-tinted vertical stripe on the left edge of each row */
.logs-row-stripe {
  position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px;
  background: var(--accent, #fbbf24);
  opacity: 0;
  border-radius: 0 2px 2px 0;
  transition: opacity .25s;
}
.logs-stream-row:hover .logs-row-stripe,
.logs-stream-row.expanded .logs-row-stripe { opacity: 1; }
[data-theme="light"] .logs-row-stripe { background: var(--accent-light, #d97706); }

/* Timestamp cell — two-line stack: date / time */
.logs-when {
  display: flex; flex-direction: column; gap: 1px;
}
.logs-when-date {
  font-size: 10px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.3px;
}
.logs-when-time {
  font-size: 12px; font-weight: 800;
  color: var(--hr-text);
  letter-spacing: 0.5px;
}
[data-theme="light"] .logs-when-date { color: #6b5840; }

/* Action cell — icon + name */
.logs-action-cell {
  display: inline-flex; align-items: center; gap: 7px;
  min-width: 0;
}
.logs-action-icon {
  width: 22px; height: 22px;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent-soft, rgba(251, 191, 36, 0.16));
  color: var(--accent, #fcd34d);
  border: 1px solid var(--accent-border, rgba(251, 191, 36, 0.45));
  flex-shrink: 0;
}
.logs-stream-row.tone-teal   { --accent: #5eead4; --accent-light: #047857; --accent-soft: rgba(16, 185, 129, 0.18); --accent-border: rgba(16, 185, 129, 0.50); }
.logs-stream-row.tone-amber  { --accent: #fcd34d; --accent-light: #b45309; --accent-soft: rgba(251, 191, 36, 0.18); --accent-border: rgba(251, 191, 36, 0.50); }
.logs-stream-row.tone-gold   { --accent: #fde68a; --accent-light: #b45309; --accent-soft: rgba(252, 211, 77, 0.18); --accent-border: rgba(252, 211, 77, 0.50); }
.logs-stream-row.tone-red    { --accent: #fca5a5; --accent-light: #991b1b; --accent-soft: rgba(239, 68, 68, 0.16);  --accent-border: rgba(239, 68, 68, 0.50); }
.logs-stream-row.tone-orange { --accent: #fdba74; --accent-light: #9a3412; --accent-soft: rgba(234, 88, 12, 0.16);  --accent-border: rgba(234, 88, 12, 0.50); }
.logs-stream-row.tone-slate  { --accent: #cbd5e1; --accent-light: #334155; --accent-soft: rgba(148, 163, 184, 0.16); --accent-border: rgba(148, 163, 184, 0.50); }
[data-theme="light"] .logs-stream-row.tone-teal   .logs-action-icon { color: #115e59; }
[data-theme="light"] .logs-stream-row.tone-amber  .logs-action-icon { color: #92400e; }
[data-theme="light"] .logs-stream-row.tone-gold   .logs-action-icon { color: #b45309; }
[data-theme="light"] .logs-stream-row.tone-red    .logs-action-icon { color: #7f1d1d; }
[data-theme="light"] .logs-stream-row.tone-orange .logs-action-icon { color: #9a3412; }
[data-theme="light"] .logs-stream-row.tone-slate  .logs-action-icon { color: #334155; }
.logs-action-name {
  font-family: var(--hr-mono);
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--accent, #fcd34d);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
[data-theme="light"] .logs-stream-row.tone-teal   .logs-action-name { color: #115e59; }
[data-theme="light"] .logs-stream-row.tone-amber  .logs-action-name { color: #92400e; }
[data-theme="light"] .logs-stream-row.tone-gold   .logs-action-name { color: #b45309; }
[data-theme="light"] .logs-stream-row.tone-red    .logs-action-name { color: #7f1d1d; }
[data-theme="light"] .logs-stream-row.tone-orange .logs-action-name { color: #9a3412; }
[data-theme="light"] .logs-stream-row.tone-slate  .logs-action-name { color: #334155; }

/* Actor cell — initials avatar + name */
.logs-actor {
  display: inline-flex; align-items: center; gap: 7px;
  min-width: 0;
}
.logs-actor-avatar {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  color: #1f1408;
  font-size: 9.5px; font-weight: 900; letter-spacing: 0.5px;
  border: 1.5px solid rgba(217, 119, 6, 0.50);
  flex-shrink: 0;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
}
[data-theme="light"] .logs-actor-avatar {
  background: linear-gradient(135deg, #f59e0b, #c2410c);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.60);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.40);
}
.logs-actor-name {
  font-size: 11px; font-weight: 700; color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Target cell */
.logs-target {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px dashed rgba(251, 191, 36, 0.32);
  font-size: 10px; font-weight: 700;
  color: var(--hr-text-muted);
  width: fit-content;
}
[data-theme="light"] .logs-target {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.32);
  color: #6b5840;
}
.logs-target svg { color: #fcd34d; }
[data-theme="light"] .logs-target svg { color: #b45309; }

/* Payload preview */
.logs-payload {
  font-size: 10.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.logs-payload code {
  color: var(--hr-text-muted);
  background: rgba(0, 0, 0, 0.20);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(251, 191, 36, 0.18);
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
[data-theme="light"] .logs-payload code {
  color: #6b5840;
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.20);
}

.onb-mono { font-family: var(--hr-mono); font-variant-numeric: tabular-nums; }

/* Expanded payload view (shown when row is clicked) */
.logs-payload-full {
  grid-column: 1 / -1;
  margin-top: 8px;
  border-radius: 10px;
  background: radial-gradient(closest-side, rgba(8, 6, 4, 0.90), rgba(14, 10, 8, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.32);
  overflow: hidden;
  font-family: var(--hr-mono);
}
[data-theme="light"] .logs-payload-full {
  background: radial-gradient(closest-side, rgba(255, 250, 240, 0.96), rgba(254, 243, 199, 0.65));
  border-color: rgba(180, 83, 9, 0.32);
}
.logs-payload-full-head {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  background: rgba(251, 191, 36, 0.06);
  border-bottom: 1px solid rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .logs-payload-full-head {
  background: rgba(251, 191, 36, 0.16);
  border-bottom-color: rgba(180, 83, 9, 0.22);
}
.logs-payload-dot {
  width: 8px; height: 8px; border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.30);
}
.logs-payload-dot.dot-r { background: #ef4444; }
.logs-payload-dot.dot-y { background: #fbbf24; }
.logs-payload-dot.dot-g { background: #10b981; }
.logs-payload-title {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
  color: var(--hr-text-muted);
  margin-left: 6px;
}
.logs-payload-title svg { color: #fcd34d; }
[data-theme="light"] .logs-payload-title { color: #6b5840; }
[data-theme="light"] .logs-payload-title svg { color: #b45309; }
.logs-payload-action-tag {
  margin-left: auto;
  font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid;
}
.logs-payload-action-tag[data-tone="teal"]   { background: rgba(16, 185, 129, 0.18); color: #5eead4; border-color: rgba(16, 185, 129, 0.50); }
.logs-payload-action-tag[data-tone="amber"]  { background: rgba(251, 191, 36, 0.18); color: #fcd34d; border-color: rgba(251, 191, 36, 0.50); }
.logs-payload-action-tag[data-tone="gold"]   { background: rgba(252, 211, 77, 0.18); color: #fde68a; border-color: rgba(252, 211, 77, 0.50); }
.logs-payload-action-tag[data-tone="red"]    { background: rgba(239, 68, 68, 0.18);  color: #fca5a5; border-color: rgba(239, 68, 68, 0.50); }
.logs-payload-action-tag[data-tone="orange"] { background: rgba(234, 88, 12, 0.18);  color: #fdba74; border-color: rgba(234, 88, 12, 0.50); }
.logs-payload-action-tag[data-tone="slate"]  { background: rgba(148, 163, 184, 0.18); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.50); }
[data-theme="light"] .logs-payload-action-tag[data-tone="teal"]   { color: #115e59; }
[data-theme="light"] .logs-payload-action-tag[data-tone="amber"]  { color: #92400e; }
[data-theme="light"] .logs-payload-action-tag[data-tone="gold"]   { color: #b45309; }
[data-theme="light"] .logs-payload-action-tag[data-tone="red"]    { color: #7f1d1d; }
[data-theme="light"] .logs-payload-action-tag[data-tone="orange"] { color: #9a3412; }
[data-theme="light"] .logs-payload-action-tag[data-tone="slate"]  { color: #334155; }

.logs-payload-code {
  margin: 0;
  padding: 10px 12px;
  font-size: 11px; line-height: 17px;
  color: var(--hr-text);
  white-space: pre-wrap;
  max-height: 240px;
  overflow: auto;
}
[data-theme="light"] .logs-payload-code { color: #1f1408; }
.logs-payload-code :deep(.lg-tok-key)  { color: #fbbf24; font-weight: 700; }
.logs-payload-code :deep(.lg-tok-str)  { color: #5eead4; }
.logs-payload-code :deep(.lg-tok-num)  { color: #fb923c; font-weight: 700; }
.logs-payload-code :deep(.lg-tok-bool) { color: #10b981; font-weight: 700; }
.logs-payload-code :deep(.lg-tok-null) { color: #94a3b8; font-style: italic; }
[data-theme="light"] .logs-payload-code :deep(.lg-tok-key)  { color: #b45309; }
[data-theme="light"] .logs-payload-code :deep(.lg-tok-str)  { color: #115e59; }
[data-theme="light"] .logs-payload-code :deep(.lg-tok-num)  { color: #9a3412; }
[data-theme="light"] .logs-payload-code :deep(.lg-tok-bool) { color: #047857; }
[data-theme="light"] .logs-payload-code :deep(.lg-tok-null) { color: #475569; }

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════ */
.logs-empty {
  position: relative;
  padding: 56px 28px 44px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
[data-theme="light"] .logs-empty {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
.logs-empty-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(20, 184, 166, 0.12), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(251, 146, 60, 0.14), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
  z-index: 0;
}
.logs-empty > *:not(.logs-empty-aurora) { position: relative; z-index: 1; }

.logs-empty-illustration {
  position: relative;
  width: 140px; height: 140px;
  display: flex; align-items: center; justify-content: center;
}
.logs-empty-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(251, 191, 36, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 191, 36, 0.16) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 80%);
  border-radius: 50%;
  pointer-events: none;
}
[data-theme="light"] .logs-empty-grid-bg {
  background-image:
    linear-gradient(rgba(180, 83, 9, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 83, 9, 0.18) 1px, transparent 1px);
}
.logs-empty-icon {
  color: #fbbf24;
  filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.55));
  z-index: 2;
  animation: logs-empty-pulse 3.5s ease-in-out infinite;
}
@keyframes logs-empty-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}
[data-theme="light"] .logs-empty-icon { color: #b45309; filter: drop-shadow(0 0 14px rgba(217, 119, 6, 0.45)); }
.logs-empty-ring {
  position: absolute; top: 50%; left: 50%;
  border-radius: 50%;
  border: 1.4px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4s ease-out infinite;
  pointer-events: none;
}
.logs-empty-ring.r1 { width: 120px; height: 120px; animation-delay: 0s; }
.logs-empty-ring.r2 { width: 120px; height: 120px; animation-delay: 1.3s; }
.logs-empty-ring.r3 { width: 120px; height: 120px; animation-delay: 2.6s; }
[data-theme="light"] .logs-empty-ring { border-color: rgba(180, 83, 9, 0.45); }
.logs-empty-scan {
  position: absolute; left: 14px; right: 14px;
  top: 14px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.75) 50%, transparent);
  box-shadow: 0 0 10px rgba(94, 234, 212, 0.6);
  animation: logs-empty-scan-beam 3s ease-in-out infinite;
  z-index: 1;
}
[data-theme="light"] .logs-empty-scan {
  background: linear-gradient(90deg, transparent, rgba(13, 148, 136, 0.7) 50%, transparent);
  box-shadow: 0 0 10px rgba(13, 148, 136, 0.45);
}
@keyframes logs-empty-scan-beam {
  0%, 100% { top: 14px; opacity: 0.4; }
  50%      { top: calc(100% - 16px); opacity: 0.95; }
}
.logs-empty h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.logs-empty p  { margin: 0 0 4px; font-size: 12px; color: var(--hr-text-muted); max-width: 480px; line-height: 1.55; }
.logs-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 6px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(13, 148, 136, 0.45);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  color: #5eead4; text-transform: uppercase;
}
[data-theme="light"] .logs-empty-meta {
  background: rgba(13, 148, 136, 0.16);
  border-color: rgba(15, 118, 110, 0.55);
  color: #115e59;
}
.logs-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .logs-empty-meta-dot { background: #0f766e; box-shadow: 0 0 6px #0f766e; }

/* ═══════════════════════════════════════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════════════════════════════════════ */
.logs-pager {
  display: flex; align-items: center; justify-content: center;
  gap: 14px;
  padding: 12px 18px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .logs-pager {
  border-color: rgba(180, 83, 9, 0.40);
  background: rgba(255, 250, 240, 0.85);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.logs-pager-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.40);
  color: var(--hr-text-secondary);
  font: inherit; font-size: 11px; font-weight: 800;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.logs-pager-btn:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.14);
  color: #fcd34d;
  border-color: rgba(251, 191, 36, 0.65);
}
.logs-pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
[data-theme="light"] .logs-pager-btn {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.40);
  color: #6b5840;
}
[data-theme="light"] .logs-pager-btn:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.14);
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.65);
}
.logs-pager-pages {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-family: var(--hr-mono);
  font-size: 12px; font-weight: 700;
  color: var(--hr-text-muted);
}
.logs-pager-current {
  font-size: 16px; font-weight: 900;
  color: #fcd34d;
  text-shadow: 0 0 14px rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .logs-pager-current {
  color: #b45309;
  text-shadow: none;
}
.logs-pager-divider { opacity: 0.55; }

/* Responsive */
@media (max-width: 1100px) {
  .logs-banner-text { padding-right: 0; }
}
@media (max-width: 900px) {
  .logs-stream-head { grid-template-columns: 110px 1fr 1fr; gap: 8px; }
  .logs-stream-head .head-target,
  .logs-stream-head .head-payload { display: none; }
  .logs-stream-row { grid-template-columns: 110px 1fr 1fr; gap: 8px; }
  .logs-stream-row .logs-target,
  .logs-stream-row .logs-payload { display: none; }
}
</style>
