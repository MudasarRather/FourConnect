<template>
  <div class="apps">
    <!-- ═════════ Dispatch console — horizontal-flow hero ═════════ -->
    <Motion class="apps-hero" as="section"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- Corner terminal brackets -->
      <span class="hb tl" aria-hidden="true" />
      <span class="hb tr" aria-hidden="true" />
      <span class="hb bl" aria-hidden="true" />
      <span class="hb br" aria-hidden="true" />

      <!-- Horizontal flow lanes — animated SVG paths with traveling glyphs -->
      <svg class="flow-lanes" viewBox="0 0 1200 360" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="laneG1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#fde047" stop-opacity="0" />
            <stop offset="40%"  stop-color="#fbbf24" stop-opacity="0.55" />
            <stop offset="80%"  stop-color="#ea580c" stop-opacity="0.42" />
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="laneG2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#f97316" stop-opacity="0" />
            <stop offset="50%"  stop-color="#fbbf24" stop-opacity="0.50" />
            <stop offset="100%" stop-color="#fde047" stop-opacity="0" />
          </linearGradient>
          <filter id="laneGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <!-- 5 lanes with tail glow + traveling glyph -->
        <g class="lane-stack">
          <path id="lane1" d="M -40 80  Q 300 60  600 90  T 1240 70"  fill="none" stroke="url(#laneG1)" stroke-width="1.4" />
          <path id="lane2" d="M -40 140 Q 320 130 640 160 T 1240 130" fill="none" stroke="url(#laneG2)" stroke-width="1.2" />
          <path id="lane3" d="M -40 200 Q 280 220 600 200 T 1240 220" fill="none" stroke="url(#laneG1)" stroke-width="1.6" />
          <path id="lane4" d="M -40 260 Q 340 240 680 280 T 1240 270" fill="none" stroke="url(#laneG2)" stroke-width="1.1" />
          <path id="lane5" d="M -40 320 Q 300 310 600 320 T 1240 310" fill="none" stroke="url(#laneG1)" stroke-width="1.3" />

          <!-- Traveling glyphs (mini "document cards") -->
          <g class="lane-glyph g1" filter="url(#laneGlow)">
            <rect x="-8" y="-5" width="16" height="11" rx="2" />
            <line x1="-5" y1="-2" x2="5" y2="-2" stroke-width="1" />
            <line x1="-5" y1="1" x2="3" y2="1" stroke-width="1" />
            <animateMotion dur="11s" repeatCount="indefinite" rotate="auto">
              <mpath href="#lane1" />
            </animateMotion>
          </g>
          <g class="lane-glyph g2" filter="url(#laneGlow)">
            <rect x="-7" y="-4" width="14" height="9" rx="2" />
            <line x1="-4" y1="-1" x2="4" y2="-1" stroke-width="1" />
            <animateMotion dur="14s" begin="-3s" repeatCount="indefinite" rotate="auto">
              <mpath href="#lane2" />
            </animateMotion>
          </g>
          <g class="lane-glyph g3" filter="url(#laneGlow)">
            <rect x="-9" y="-6" width="18" height="13" rx="2" />
            <line x1="-6" y1="-3" x2="6" y2="-3" stroke-width="1" />
            <line x1="-6" y1="0" x2="4" y2="0" stroke-width="1" />
            <animateMotion dur="9s" begin="-1.5s" repeatCount="indefinite" rotate="auto">
              <mpath href="#lane3" />
            </animateMotion>
          </g>
          <g class="lane-glyph g4" filter="url(#laneGlow)">
            <rect x="-6" y="-4" width="12" height="8" rx="2" />
            <animateMotion dur="13s" begin="-5s" repeatCount="indefinite" rotate="auto">
              <mpath href="#lane4" />
            </animateMotion>
          </g>
          <g class="lane-glyph g5" filter="url(#laneGlow)">
            <rect x="-8" y="-5" width="16" height="11" rx="2" />
            <line x1="-5" y1="-2" x2="3" y2="-2" stroke-width="1" />
            <animateMotion dur="10s" begin="-2.5s" repeatCount="indefinite" rotate="auto">
              <mpath href="#lane5" />
            </animateMotion>
          </g>

          <!-- Pulse dots traveling along the same lanes for extra depth -->
          <circle class="lane-pulse" r="2.5">
            <animateMotion dur="6s" begin="-1s" repeatCount="indefinite"><mpath href="#lane1" /></animateMotion>
          </circle>
          <circle class="lane-pulse" r="2">
            <animateMotion dur="8s" begin="-2s" repeatCount="indefinite"><mpath href="#lane3" /></animateMotion>
          </circle>
          <circle class="lane-pulse" r="2.5">
            <animateMotion dur="7s" begin="-4s" repeatCount="indefinite"><mpath href="#lane5" /></animateMotion>
          </circle>
        </g>
      </svg>

      <!-- LEFT: dispatch readout + headline -->
      <div class="apps-copy">
        <Motion as="div" class="dispatch-bar"
          :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5 }"
        >
          <span class="db-led" />
          <span class="db-lbl leave-mono">DISPATCH · OPERATIONAL</span>
          <span class="db-sep">/</span>
          <span class="db-fy leave-mono">FY {{ fyLabel }}</span>
          <span class="db-sep">/</span>
          <span class="db-clock leave-mono">{{ clockNow }}</span>
        </Motion>

        <h1 class="apps-title">
          Every leave request <em>flowing</em>
          <span class="t-arrow" aria-hidden="true">
            <svg viewBox="0 0 60 18"><path d="M2 9 L52 9 M44 3 L52 9 L44 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          through the building.
        </h1>
        <p class="apps-sub">
          Filter by stage, scan the queue at a glance, and open any row for the
          full chain pipeline + day breakdown.
        </p>
      </div>

      <!-- RIGHT: ticker-strip stats — single horizontal row, terminal aesthetic -->
      <Motion class="dispatch-ticker" as="div"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="dt-rail">
          <Motion v-for="(s, i) in stripStats" :key="s.key" as="div"
            class="dt-cell" :data-tone="s.tone"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.42, delay: 0.24 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -3 }"
          >
            <header class="dt-head">
              <component :is="s.icon" :size="11" class="dt-ic" />
              <span class="dt-lbl">{{ s.label }}</span>
            </header>
            <div class="dt-val leave-mono">{{ s.value }}<span v-if="s.suffix">{{ s.suffix }}</span></div>
            <div class="dt-foot leave-mono">{{ s.foot }}</div>
            <div class="dt-spark">
              <span v-for="b in 14" :key="b" class="dt-bar" :style="sparkStyle(s, b)" />
            </div>
          </Motion>
        </div>
      </Motion>
    </Motion>

    <!-- ═════════ Filter rail ═════════ -->
    <Motion class="apps-rail" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.2 }"
    >
      <div class="rail-search">
        <Search :size="14" class="ic" />
        <input
          v-model="api.filters.value.q"
          placeholder="Search reference no, employee, reason…"
          @keyup.enter="reload"
        />
        <button v-if="api.filters.value.q" class="rail-clear" @click="clearSearch" aria-label="Clear">
          <X :size="11" />
        </button>
      </div>
      <div class="rail-pills">
        <Motion v-for="(s, i) in STATUSES" :key="s.key || 'all'" as="button"
          class="rail-pill"
          :class="{ 'is-active': api.filters.value.status === s.key }"
          :data-tone="s.tone"
          :initial="{ opacity: 0, scale: 0.9 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.32, delay: 0.25 + i * 0.035, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -2 }"
          :whileTap="{ scale: 0.96 }"
          @click="setStatus(s.key)"
        >
          <span class="pill-dot" :data-tone="s.tone" />
          {{ s.label }}
          <span v-if="counts[s.key || 'all']" class="pill-count leave-mono">{{ counts[s.key || 'all'] }}</span>
        </Motion>
      </div>
    </Motion>

    <!-- ═════════ Data — loading ═════════ -->
    <div v-if="api.loading.value && !api.items.value.length" class="apps-loading">
      <div v-for="i in 6" :key="i" class="leave-skel skel-card" />
    </div>

    <!-- ═════════ Data — empty ═════════ -->
    <Motion v-else-if="!api.items.value.length" as="div" class="apps-empty leave-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
    >
      <div class="empty-glow" />
      <Inbox :size="42" class="empty-icon" />
      <h3>Nothing waiting on the queue</h3>
      <p>As soon as an employee submits a request matching your filters, it lands here in real-time.</p>
    </Motion>

    <!-- ═════════ Data — rows ═════════ -->
    <ol v-else class="apps-list">
      <Motion v-for="(r, i) in api.items.value" :key="r.id" as="li"
        class="row" :data-status="r.status"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: Math.min(i * 0.035, 0.36), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }"
        @click="openDrawer(r)"
      >
        <span class="row-stripe" />

        <div class="cell ref">
          <span class="ref-no leave-mono">{{ r.reference_no }}</span>
          <span class="ref-time leave-mono">{{ relTime(r.created_at) }}</span>
        </div>

        <div class="cell emp">
          <div class="emp-avatar" :style="avatarTint(r)">
            {{ initials(r.employee_name) }}
          </div>
          <div class="emp-body">
            <div class="emp-name">{{ r.employee_name || '—' }}</div>
            <div class="emp-meta leave-mono">
              <span v-if="r.employee_code">{{ r.employee_code }}</span>
              <span v-if="r.department_name"> · {{ r.department_name }}</span>
            </div>
          </div>
        </div>

        <div class="cell type">
          <div class="type-icon">
            <LeaveTypeIcon :type="r.leave_type" :size="14" ambient />
          </div>
          <div class="type-body">
            <div class="t-lbl">{{ typeMeta(r.leave_type).label }}</div>
            <div class="t-dates leave-mono">
              {{ fmtRange(r.from_date, r.to_date) }}
              <span v-if="r.is_half_day" class="t-half">· half</span>
            </div>
          </div>
        </div>

        <div class="cell days">
          <span class="days-num">{{ r.total_days }}</span>
          <span class="days-suf leave-mono">d</span>
        </div>

        <div class="cell stage">
          <ChainBeads :steps="r.approval_steps" :current="r.current_step" :status="r.status" />
        </div>

        <div class="cell status">
          <LeaveStatusChip :status="r.status" :pulse="r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR'" />
        </div>

        <div class="cell action">
          <ChevronRight :size="15" class="row-chev" />
        </div>
      </Motion>
    </ol>

    <!-- ═════════ Pager — ultra-modern 3D carousel ═════════ -->
    <LeavePagination
      v-if="!api.loading.value"
      :page="api.filters.value.page"
      :page-size="api.filters.value.limit"
      :total-items="api.total.value"
      :page-size-options="[10, 25, 50, 100]"
      @update:page="go($event)"
      @update:pageSize="onLimitChange($event)"
    />

    <LeaveDetailDrawer
      :open="drawer.open"
      :leave-id="drawer.id"
      @close="drawer.open = false"
      @changed="onDrawerChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Search, ChevronLeft, ChevronRight, Inbox, X, Hourglass, CheckCircle2, CircleX, Sparkles,
} from 'lucide-vue-next'
import LeaveStatusChip from '../components/LeaveStatusChip.vue'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveDetailDrawer from '../drawers/LeaveDetailDrawer.vue'
import LeavePagination from '../components/LeavePagination.vue'
import { useLeaves, typeMeta, fetchLeaveStats } from '@/composables/useLeaves'

const emit = defineEmits(['refresh-stats'])

const STATUSES = [
  { key: null,                label: 'All',         tone: 'all' },
  { key: 'PENDING_MANAGER',   label: 'Mgr review',  tone: 'warn' },
  { key: 'PENDING_HR',        label: 'HR review',   tone: 'warn' },
  { key: 'APPROVED',          label: 'Approved',    tone: 'success' },
  { key: 'REJECTED',          label: 'Rejected',    tone: 'danger' },
  { key: 'MANAGER_REJECTED',  label: 'Mgr-rejected', tone: 'danger' },
  { key: 'WITHDRAWN',         label: 'Withdrawn',   tone: 'neutral' },
  { key: 'CANCELLED',         label: 'Cancelled',   tone: 'neutral' },
]

const api = useLeaves()
const drawer = ref({ open: false, id: null })
const stats = ref(null)

const reload = async () => { await api.fetchList(); emit('refresh-stats') }
const setStatus = (s) => { api.setFilters({ status: s }); reload() }
const clearSearch = () => { api.setFilters({ q: '' }); reload() }
const go = (p) => { api.setPage(p); reload() }
const onLimitChange = (n) => { api.setFilters({ limit: n }); reload() }
const openDrawer = (r) => { drawer.value = { open: true, id: r.id } }
const onDrawerChange = () => { reload(); refreshStats() }

const refreshStats = async () => {
  try { stats.value = await fetchLeaveStats() } catch { /* non-fatal */ }
}

const fyLabel = computed(() => {
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}–${String(y + 1).slice(-2)}`
})

const counts = computed(() => {
  const s = stats.value || {}
  return {
    'all': 0,
    'PENDING_MANAGER': s.pending_manager || 0,
    'PENDING_HR': s.pending_hr || 0,
    'APPROVED': s.approved_this_month || 0,
    'REJECTED': s.rejected_this_month || 0,
    'MANAGER_REJECTED': 0,
    'WITHDRAWN': 0,
    'CANCELLED': 0,
  }
})

const stripStats = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'pending', icon: Hourglass,    label: 'Awaiting decisions', value: (s.pending_manager || 0) + (s.pending_hr || 0), suffix: '', tone: 'warn',    foot: `${s.pending_manager || 0} mgr · ${s.pending_hr || 0} HR` },
    { key: 'today',   icon: Sparkles,     label: 'On leave today',     value: s.on_leave_today || 0, suffix: '', tone: 'info',    foot: 'team availability' },
    { key: 'month',   icon: CheckCircle2, label: 'Approved · month',   value: s.approved_this_month || 0, suffix: '', tone: 'success', foot: `${s.upcoming_30d || 0} upcoming 30d` },
    { key: 'rejected',icon: CircleX,      label: 'Rejected · month',   value: s.rejected_this_month || 0, suffix: '', tone: 'danger',  foot: 'this month' },
  ]
})

const initials = (name) => {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || '?'
}

const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}
const avatarTint = (r) => ({ '--tint': TYPE_HEX[r.leave_type] || '#fbbf24' })

const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtRange = (a, b) => a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`
const relTime = (v) => {
  if (!v) return ''
  const d = new Date(v); const m = (Date.now() - d.getTime()) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

// ─── Inline tiny "chain beads" indicator for the row ──────────────────
const ChainBeads = {
  name: 'ChainBeads',
  props: ['steps', 'current', 'status'],
  setup(p) {
    return () => {
      const steps = Array.isArray(p.steps) && p.steps.length ? p.steps : [{}, {}]
      const cur = p.current ?? 0
      const isApproved = p.status === 'APPROVED'
      const isFailed = ['REJECTED', 'MANAGER_REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(p.status)
      return h('div', { class: 'beads' }, steps.map((s, i) => {
        let state = 'idle'
        if (isApproved) state = 'done'
        else if (s?.decision === 'APPROVED') state = 'done'
        else if (s?.decision === 'REJECTED') state = 'failed'
        else if (s?.decision === 'SKIPPED') state = 'skipped'
        else if (i === cur && !isFailed) state = 'active'
        else if (isFailed && i === cur) state = 'failed'
        return h('span', { class: 'bead', 'data-state': state, 'data-type': s?.approver_type || '' })
      }))
    }
  },
}

// Live dispatch clock — ticks every 30s
const clockNow = ref('')
const tickClock = () => {
  clockNow.value = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST'
}
let clockTimer = null

// Mini sparkline bars — pseudo-randomised but deterministic per stat
const sparkStyle = (s, b) => {
  const base = (Number(s.value) || 1) % 7
  const seed = (b * 13 + (s.key.charCodeAt(0) || 1) * 3 + base) % 100
  const h = 30 + (seed * 70 / 100)
  return { height: `${Math.max(12, h)}%`, '--delay': `${b * 0.04}s` }
}

onMounted(() => {
  api.setFilters({ status: null, limit: 30 })
  reload()
  refreshStats()
  tickClock(); clockTimer = setInterval(tickClock, 30_000)
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ════════════════════════════════════════════════════════════════════════
   Dispatch console hero — completely different language from lv-hero
   (no sun, no orbital motifs, no 4-up stat strip)
   → horizontal flow lanes, ticker-style readout, terminal aesthetic
   ──────────────────────────────────────────────────────────────────────── */
.apps { display: flex; flex-direction: column; gap: 20px; }

.apps-hero {
  position: relative; overflow: hidden;
  padding: 28px 32px;
  border-radius: 22px;
  background:
    linear-gradient(110deg, rgba(234, 88, 12, 0.10) 0%, transparent 40%),
    linear-gradient(245deg, rgba(251, 191, 36, 0.08) 0%, transparent 50%),
    linear-gradient(180deg, #0a0604 0%, #110805 100%);
  border: 1px solid var(--leave-border);
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
  min-height: 220px;
}
[data-theme="light"] .apps-hero {
  background:
    linear-gradient(110deg, rgba(234, 88, 12, 0.10) 0%, transparent 40%),
    linear-gradient(245deg, rgba(251, 191, 36, 0.18) 0%, transparent 50%),
    linear-gradient(180deg, #fffdf5, #fff5e3);
}
@media (max-width: 1100px) {
  .apps-hero { grid-template-columns: 1fr; gap: 22px; }
}

/* Terminal corner brackets */
.hb {
  position: absolute; width: 14px; height: 14px;
  border-color: var(--leave-brand);
  border-style: solid;
  z-index: 2;
  opacity: 0.85;
}
.hb.tl { top: 14px; left: 14px; border-width: 1.5px 0 0 1.5px; }
.hb.tr { top: 14px; right: 14px; border-width: 1.5px 1.5px 0 0; }
.hb.bl { bottom: 14px; left: 14px; border-width: 0 0 1.5px 1.5px; }
.hb.br { bottom: 14px; right: 14px; border-width: 0 1.5px 1.5px 0; }

/* Flow lanes — fills the whole hero, sits beneath content */
.flow-lanes {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  opacity: 0.85;
}
[data-theme="light"] .flow-lanes { opacity: 0.55; }

.lane-glyph rect {
  fill: rgba(251, 191, 36, 0.22);
  stroke: var(--w-gold-200);
  stroke-width: 1;
}
.lane-glyph line {
  stroke: var(--w-gold-200);
  opacity: 0.7;
}
.lane-glyph.g3 rect { fill: rgba(234, 88, 12, 0.24); stroke: var(--w-orange-300); }
.lane-glyph.g3 line { stroke: var(--w-orange-300); }
.lane-glyph.g5 rect { fill: rgba(253, 224, 71, 0.20); stroke: #fde047; }
.lane-pulse {
  fill: var(--w-gold-200);
  filter: drop-shadow(0 0 6px var(--w-gold-300));
}

/* Left — dispatch readout + headline */
.apps-copy {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}

.dispatch-bar {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 6px 12px; border-radius: 8px;
  background: rgba(20, 12, 6, 0.62);
  border: 1px solid var(--leave-border-strong);
  width: max-content; max-width: 100%;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.16em;
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}
[data-theme="light"] .dispatch-bar { background: rgba(255, 250, 235, 0.85); }
.dispatch-bar::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.14), transparent);
  background-size: 200% 100%;
  animation: leave-gradient-pan 3.6s linear infinite;
  pointer-events: none;
}
.db-led {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--leave-approved);
  box-shadow: 0 0 10px var(--leave-approved), 0 0 18px var(--leave-approved);
  animation: leave-eyebrow-pulse 1.4s ease-in-out infinite;
}
.db-lbl { color: var(--leave-approved); }
.db-sep { color: var(--leave-text-muted); opacity: 0.5; font-weight: 400; }
.db-fy { color: var(--leave-text); }
.db-clock { color: var(--w-gold-200); font-variant-numeric: tabular-nums; letter-spacing: 0.08em; }
[data-theme="light"] .db-clock { color: var(--w-gold-700); }

.apps-title {
  margin: 0;
  font-size: clamp(30px, 4.0vw, 48px);
  font-weight: 800;
  letter-spacing: -0.028em;
  line-height: 1.04;
  color: #fff8dc;
  text-wrap: balance;
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 14px;
}
[data-theme="light"] .apps-title { color: #2a1100; }
.apps-title em {
  font-style: italic; font-weight: 800;
  background: linear-gradient(135deg, #fde047 0%, #f59e0b 50%, #ea580c 100%);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
  position: relative;
}
.apps-title em::after {
  content: ""; position: absolute; left: 1%; right: 1%; bottom: 6%;
  height: 8px; border-radius: 8px;
  background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.55), transparent);
  filter: blur(5px);
  z-index: -1;
}
.t-arrow {
  display: inline-grid; place-items: center;
  width: 56px; height: 16px;
  color: var(--w-gold-200);
  align-self: center;
  animation: t-arrow-glide 2.4s ease-in-out infinite;
}
[data-theme="light"] .t-arrow { color: var(--w-gold-600); }
.t-arrow svg { width: 100%; height: 100%; overflow: visible; }
@keyframes t-arrow-glide {
  0%, 100% { transform: translateX(0); opacity: 0.85; }
  50%      { transform: translateX(4px); opacity: 1; }
}

.apps-sub {
  margin: 0; max-width: 56ch;
  font-size: 13.5px; line-height: 1.62;
  color: var(--w-gold-100); opacity: 0.85;
}
[data-theme="light"] .apps-sub { color: #6b3d12; opacity: 1; }

/* Right — dispatch ticker (4 cells in one horizontal strip) */
.dispatch-ticker {
  position: relative; z-index: 1;
  min-width: 0;
}
.dt-rail {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  padding: 1px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.32), rgba(234, 88, 12, 0.18));
  position: relative;
}
@media (max-width: 640px) { .dt-rail { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.dt-cell {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px 14px 10px;
  background: rgba(14, 8, 4, 0.92);
  cursor: default;
  transition: background .22s, transform .22s;
}
[data-theme="light"] .dt-cell { background: rgba(255, 250, 235, 0.97); }
.dt-cell:first-child { border-top-left-radius: 13px; border-bottom-left-radius: 13px; }
.dt-cell:last-child  { border-top-right-radius: 13px; border-bottom-right-radius: 13px; }
@media (max-width: 640px) {
  .dt-cell:nth-child(1) { border-radius: 13px 0 0 0; }
  .dt-cell:nth-child(2) { border-radius: 0 13px 0 0; }
  .dt-cell:nth-child(3) { border-radius: 0 0 0 13px; }
  .dt-cell:nth-child(4) { border-radius: 0 0 13px 0; }
}
.dt-cell:hover { background: rgba(28, 18, 10, 0.95); }
[data-theme="light"] .dt-cell:hover { background: rgba(255, 244, 220, 1); }

.dt-head { display: flex; align-items: center; gap: 6px; }
.dt-ic { color: var(--w-gold-200); opacity: 0.85; }
.dt-cell[data-tone="danger"]  .dt-ic { color: var(--w-ember-300); }
.dt-cell[data-tone="success"] .dt-ic { color: var(--leave-approved); }
.dt-cell[data-tone="warn"]    .dt-ic { color: var(--leave-pending-mgr); }
.dt-lbl {
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.dt-val {
  font-size: 26px; font-weight: 800;
  letter-spacing: -0.022em; line-height: 1;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 55%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.dt-cell[data-tone="danger"]  .dt-val { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.dt-cell[data-tone="success"] .dt-val { background: linear-gradient(135deg, #fde047, #fbbf24); background-clip: text; -webkit-background-clip: text; color: transparent; }

.dt-foot {
  font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.10em;
  color: var(--leave-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Mini sparkline bars per cell */
.dt-spark {
  display: flex; align-items: flex-end; gap: 2px;
  height: 22px; margin-top: 2px;
}
.dt-bar {
  flex: 1;
  background: linear-gradient(180deg, var(--w-gold-200), var(--w-orange-400));
  border-radius: 1px;
  opacity: 0.65;
  transform-origin: bottom center;
  animation: dt-bar-grow 0.6s var(--leave-spring) backwards;
  animation-delay: var(--delay, 0s);
}
.dt-cell[data-tone="danger"]  .dt-bar { background: linear-gradient(180deg, #ff8a4c, #e34a0a); }
.dt-cell[data-tone="success"] .dt-bar { background: linear-gradient(180deg, #fde047, #fbbf24); }
.dt-cell[data-tone="warn"]    .dt-bar { background: linear-gradient(180deg, #fbbf24, #f59e0b); }
@keyframes dt-bar-grow {
  0%   { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 0.65; }
}

/* ════════════════════════════════════════════════════════════════════════
   Filter rail
   ──────────────────────────────────────────────────────────────────────── */
.apps-rail {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px);
}
.rail-search {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 38px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--leave-border);
  flex: 1; min-width: 260px; max-width: 420px;
  transition: border-color .22s, box-shadow .22s;
}
.rail-search:focus-within { border-color: var(--leave-brand); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.16); }
[data-theme="light"] .rail-search { background: rgba(255, 248, 225, 0.92); }
.rail-search .ic { color: var(--leave-text-muted); flex-shrink: 0; }
.rail-search input {
  flex: 1; min-width: 0; height: 100%;
  background: transparent; border: 0; outline: 0;
  font: inherit; font-size: 13px; color: var(--leave-text);
}
.rail-search input::placeholder { color: var(--leave-text-placeholder); }
.rail-clear {
  width: 20px; height: 20px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: 50%; border: 1px solid var(--leave-border);
  background: transparent; color: var(--leave-text-muted);
  cursor: pointer; transition: color .15s, border-color .15s;
}
.rail-clear:hover { color: var(--leave-text); border-color: var(--leave-brand); }

.rail-pills {
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
}
.rail-pill {
  display: inline-flex; align-items: center; gap: 7px;
  height: 32px; padding: 0 12px;
  font-size: 11.5px; font-weight: 700;
  border-radius: 999px;
  background: transparent;
  border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary);
  cursor: pointer;
  transition: background .22s, color .22s, border-color .22s, box-shadow .22s, transform .15s;
  position: relative;
}
.rail-pill:hover { color: var(--leave-text); border-color: var(--leave-brand); }
.rail-pill .pill-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--leave-text-muted);
  transition: background .22s, box-shadow .22s;
}
.rail-pill[data-tone="all"]     .pill-dot { background: var(--leave-brand); }
.rail-pill[data-tone="warn"]    .pill-dot { background: var(--leave-pending-mgr); }
.rail-pill[data-tone="success"] .pill-dot { background: var(--leave-approved); }
.rail-pill[data-tone="danger"]  .pill-dot { background: var(--leave-rejected); }
.rail-pill[data-tone="neutral"] .pill-dot { background: var(--leave-cancelled); }
.rail-pill.is-active {
  border-color: var(--leave-brand);
  background: rgba(251, 191, 36, 0.14);
  color: var(--w-gold-100);
  box-shadow: 0 6px 18px -10px rgba(251, 191, 36, 0.55);
}
[data-theme="light"] .rail-pill.is-active { color: var(--w-gold-700); }
.rail-pill.is-active[data-tone="warn"]    { border-color: var(--leave-pending-mgr); background: var(--leave-pending-mgr-soft); color: var(--leave-pending-mgr); }
.rail-pill.is-active[data-tone="success"] { border-color: var(--leave-approved);    background: var(--leave-approved-soft);    color: var(--leave-approved); }
.rail-pill.is-active[data-tone="danger"]  { border-color: var(--leave-rejected);    background: var(--leave-rejected-soft);    color: var(--leave-rejected); }
.rail-pill.is-active .pill-dot { box-shadow: 0 0 10px currentColor; }
.rail-pill .pill-count {
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.16);
  color: var(--w-gold-100);
  font-weight: 800;
}
[data-theme="light"] .rail-pill .pill-count { background: rgba(217, 119, 6, 0.18); color: var(--w-gold-700); }

/* ════════════════════════════════════════════════════════════════════════
   Loading + empty
   ──────────────────────────────────────────────────────────────────────── */
.apps-loading { display: flex; flex-direction: column; gap: 8px; }
.skel-card { height: 78px; border-radius: 16px; }

.apps-empty {
  position: relative; overflow: hidden;
  padding: 64px 24px;
}
.apps-empty .empty-glow {
  position: absolute; inset: -20%;
  background: radial-gradient(40% 30% at 50% 30%, rgba(251, 191, 36, 0.30), transparent 65%);
  pointer-events: none; animation: leave-glow-breathe 7s ease-in-out infinite;
}
.apps-empty .empty-icon {
  position: relative; z-index: 1;
  color: var(--w-gold-300);
  opacity: 0.7;
  animation: leave-glow-breathe 4s ease-in-out infinite;
}
.apps-empty h3 {
  position: relative; z-index: 1;
  margin: 8px 0 0;
  font-size: 17px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.012em;
}
.apps-empty p {
  position: relative; z-index: 1;
  margin: 4px 0 0; max-width: 46ch;
  font-size: 12.5px; line-height: 1.5;
  color: var(--leave-text-muted);
}

/* ════════════════════════════════════════════════════════════════════════
   Application rows
   ──────────────────────────────────────────────────────────────────────── */
.apps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

.row {
  position: relative; overflow: hidden;
  display: grid;
  grid-template-columns: 130px 1.4fr 1.6fr 80px 110px 130px 28px;
  gap: 14px;
  align-items: center;
  padding: 14px 18px 14px 22px;
  border-radius: 16px;
  background: var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px) saturate(140%);
  cursor: pointer;
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease), transform .22s;
  will-change: transform;
}
[data-theme="light"] .row { background: var(--leave-surface); }
.row:hover {
  border-color: var(--leave-brand);
  box-shadow: var(--leave-shadow-lift);
}
.row:hover .row-chev { transform: translateX(4px); color: var(--leave-brand); }

.row-stripe {
  position: absolute; left: 0; top: 8px; bottom: 8px;
  width: 4px; border-radius: 0 4px 4px 0;
  background: var(--leave-text-muted);
  opacity: 0.7;
  transition: opacity .22s, box-shadow .22s;
}
.row:hover .row-stripe { opacity: 1; box-shadow: 0 0 14px var(--leave-brand); }
.row[data-status="PENDING_MANAGER"]   .row-stripe { background: var(--leave-pending-mgr); }
.row[data-status="PENDING_HR"]        .row-stripe { background: var(--leave-pending-hr); }
.row[data-status="APPROVED"]          .row-stripe { background: var(--leave-approved); }
.row[data-status="REJECTED"]          .row-stripe { background: var(--leave-rejected); }
.row[data-status="MANAGER_REJECTED"]  .row-stripe { background: var(--leave-mgr-rejected); }
.row[data-status="WITHDRAWN"]         .row-stripe { background: var(--leave-withdrawn); }
.row[data-status="CANCELLED"]         .row-stripe { background: var(--leave-cancelled); }

.cell { min-width: 0; }
.cell.ref { display: flex; flex-direction: column; gap: 2px; }
.ref-no { font-size: 12.5px; font-weight: 800; color: var(--leave-brand); letter-spacing: 0.02em; }
.ref-time { font-size: 10px; color: var(--leave-text-muted); }

.cell.emp { display: flex; align-items: center; gap: 10px; min-width: 0; }
.emp-avatar {
  --tint: var(--leave-brand);
  flex-shrink: 0;
  width: 36px; height: 36px; border-radius: 12px;
  display: grid; place-items: center;
  font-size: 12.5px; font-weight: 800;
  color: #1a0a00;
  background: linear-gradient(135deg, var(--tint), color-mix(in srgb, var(--tint) 70%, #ea580c));
  box-shadow:
    0 8px 18px -10px color-mix(in srgb, var(--tint) 60%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  letter-spacing: -0.01em;
}
.emp-body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.emp-name {
  font-size: 13.5px; font-weight: 700;
  color: var(--leave-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.emp-meta { font-size: 10.5px; color: var(--leave-text-muted); }

.cell.type { display: flex; align-items: center; gap: 10px; min-width: 0; }
.type-icon {
  flex-shrink: 0;
  width: 28px; height: 28px; border-radius: 10px;
  display: grid; place-items: center;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .type-icon { background: rgba(251, 191, 36, 0.16); border-color: rgba(217, 119, 6, 0.30); }
.type-body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.t-lbl { font-size: 12.5px; font-weight: 700; color: var(--leave-text); }
.t-dates { font-size: 10.5px; color: var(--leave-text-muted); }
.t-half { color: var(--leave-brand); }

.cell.days {
  display: flex; align-items: baseline; gap: 2px;
  font-variant-numeric: tabular-nums;
}
.days-num {
  font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fde047, #fbbf24 60%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.days-suf { font-size: 10.5px; color: var(--leave-text-muted); }

.cell.stage .beads { display: flex; gap: 4px; }
.cell.stage .bead {
  width: 14px; height: 8px; border-radius: 4px;
  background: rgba(251, 191, 36, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.28);
  transition: background .22s, border-color .22s, box-shadow .22s;
}
.cell.stage .bead[data-state="done"]    { background: var(--leave-approved); border-color: var(--leave-approved); box-shadow: 0 0 10px color-mix(in srgb, var(--leave-approved) 60%, transparent); }
.cell.stage .bead[data-state="active"]  { background: var(--leave-brand); border-color: var(--leave-brand); box-shadow: 0 0 12px color-mix(in srgb, var(--leave-brand) 70%, transparent); animation: leave-pulse 1.6s ease-in-out infinite; }
.cell.stage .bead[data-state="failed"]  { background: var(--leave-rejected); border-color: var(--leave-rejected); }
.cell.stage .bead[data-state="skipped"] { background: rgba(133, 77, 14, 0.4); border-color: rgba(133, 77, 14, 0.5); }

.row-chev { color: var(--leave-text-muted); transition: transform .22s, color .22s; }

/* ════════════════════════════════════════════════════════════════════════
   Pager
   ──────────────────────────────────────────────────────────────────────── */
.apps-pager {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 4px;
  font-size: 12px; color: var(--leave-text-muted);
}
.apps-pager b { color: var(--leave-text); font-weight: 800; }
.pg { display: flex; gap: 6px; align-items: center; }
.pg-pages {
  font-size: 11.5px; font-weight: 700;
  color: var(--leave-text-secondary);
  padding: 0 6px;
}

@media (max-width: 1100px) {
  .row { grid-template-columns: 110px 1.6fr 1.6fr 60px 100px 110px 22px; gap: 10px; }
}
@media (max-width: 900px) {
  .row { grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 16px; }
  .row > .cell.stage, .row > .cell.action { display: none; }
}
</style>
