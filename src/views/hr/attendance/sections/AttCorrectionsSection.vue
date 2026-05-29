<template>
  <section class="att-cor" data-anim="att-cor">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="cor-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <!-- Perforated ticket edge on the left -->
      <span class="cor-banner-perforation" aria-hidden="true" />
      <span class="cor-banner-glow" />

      <!-- Dual-clock motif on the right — before clock → edit → after clock -->
      <div class="cor-clocks" aria-hidden="true">
        <div class="cor-clock cor-clock-before">
          <span class="cor-clock-tag">BEFORE</span>
          <div class="cor-clock-face">
            <span v-for="i in 12" :key="`b-${i}`" class="cor-clock-tick" :style="{ transform: `rotate(${i * 30}deg)` }" />
            <span class="cor-clock-hand cor-clock-hand-min cor-clock-before-min" />
            <span class="cor-clock-hand cor-clock-hand-hr cor-clock-before-hr" />
            <span class="cor-clock-center" />
          </div>
        </div>
        <Motion class="cor-clock-arrow"
          :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="cor-arrow-stem" />
          <span class="cor-arrow-tip" />
          <Pencil :size="11" class="cor-arrow-pencil" />
        </Motion>
        <div class="cor-clock cor-clock-after">
          <span class="cor-clock-tag">AFTER</span>
          <div class="cor-clock-face">
            <span v-for="i in 12" :key="`a-${i}`" class="cor-clock-tick" :style="{ transform: `rotate(${i * 30}deg)` }" />
            <span class="cor-clock-hand cor-clock-hand-min cor-clock-after-min" />
            <span class="cor-clock-hand cor-clock-hand-hr cor-clock-after-hr" />
            <span class="cor-clock-center" />
          </div>
        </div>
      </div>

      <div class="cor-banner-text">
        <span class="cor-eyebrow">
          <span class="cor-eyebrow-dot" />
          Manual fix queue · Manager → HR · Two-level approval
        </span>
        <h2 class="cor-banner-title">
          <span>Attendance</span>
          <span class="cor-banner-divider">·</span>
          <span>Corrections</span>
        </h2>
        <p class="cor-banner-sub">
          Employees dispute punches; approving applies the <strong>requested in/out</strong> and writes
          an <em>immutable audit row</em>. Reject with a note and the employee can re-submit.
        </p>
      </div>

    </Motion>

    <!-- ═══════════════════ KPI STRIP — stat ribbons w/ progress meters ═══════════════════ -->
    <div class="cor-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['cor-kpi', `tone-${t.tone}`, { active: filter === t.filter }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="t.filter !== null ? setFilter(t.filter) : null"
      >
        <!-- Scanning bar on hover -->
        <span class="kpi-scan" aria-hidden="true" />
        <!-- Vertical accent rule on the left edge -->
        <span class="kpi-rule" aria-hidden="true" />

        <div class="kpi-head">
          <span class="kpi-eyebrow">
            <component :is="t.icon" :size="11" />
            <span>{{ t.label }}</span>
          </span>
          <span v-if="t.badge" class="kpi-badge">{{ t.badge }}</span>
        </div>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}</Motion>
        <span class="kpi-foot">{{ t.foot }}</span>

        <!-- Progress meter at the bottom -->
        <div class="kpi-meter" v-if="t.pct != null">
          <Motion class="kpi-meter-fill"
            :initial="{ scaleX: 0 }"
            :animate="{ scaleX: Math.max(0.03, t.pct / 100) }"
            :transition="{ duration: 0.85, delay: 0.3 + 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
          />
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ SEGMENTED FILTER CONTROL ═══════════════════ -->
    <Motion as="div" class="cor-segctrl-wrap"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.32 }"
    >
      <div ref="segctrlRef" class="cor-segctrl">
        <Motion class="cor-segctrl-slider"
          :animate="{ x: `${activeIdx * 100}%`, width: `${100 / FILTERS.length}%` }"
          :transition="{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }"
        />
        <button v-for="f in FILTERS" :key="f.key"
          :class="['cor-segctrl-tab', { active: filter === f.key }]"
          @click="setFilter(f.key)">
          <span class="cor-tab-dot" :style="{ background: f.dot }" />
          <span class="cor-tab-label">{{ f.label }}</span>
          <span class="cor-tab-count">{{ counts[f.key] }}</span>
        </button>
      </div>
      <div class="cor-segctrl-right">
        <span class="cor-segctrl-meta">
          <ListChecks :size="11" />
          {{ rows.length }} {{ rows.length === 1 ? 'item' : 'items' }} shown
        </span>
        <Motion as="button" class="cor-refresh-cta"
          :class="{ spinning: loading }"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="reload"
        >
          <RefreshCw :size="13" />Refresh queue
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ REJECT MODAL ═══════════════════ -->
    <AttRejectModal
      :open="rejectModal.open"
      :target-label="rejectModal.target?.employee_name || '—'"
      :target-meta="rejectModal.target ? `${formatDate(rejectModal.target.attendance_date)} · requested ${relative(rejectModal.target.created_at)}` : ''"
      :target-tag="rejectModal.target?.reason?.startsWith('[LATE_PUNCH]') ? 'LATE PUNCH' : rejectModal.target?.reason?.startsWith('[EARLY_EXIT]') ? 'EARLY EXIT' : 'CORRECTION'"
      :target-icon="Pencil"
      :submitting="rejectModal.submitting"
      @close="closeRejectModal"
      @confirm="confirmReject"
    />

    <!-- ═══════════════════ ROW LIST — time-diff cards ═══════════════════ -->
    <div class="cor-list" v-if="rows.length">
      <Motion v-for="(r, i) in rows" :key="r.id" as="article"
        :class="['cor-row', `is-${r.status.toLowerCase()}`]"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -2 }"
      >
        <!-- Ambient hover aurora -->
        <span class="cor-row-aurora" aria-hidden="true" />

        <!-- COLUMN 1: Identity pillar -->
        <div class="cor-identity">
          <div class="cor-avatar">
            <span class="cor-avatar-ring" aria-hidden="true" />
            <span class="cor-avatar-text">{{ initials(r.employee_name) }}</span>
          </div>
          <div class="cor-identity-meta">
            <div class="cor-emp-name">{{ r.employee_name || '—' }}</div>
            <div class="cor-emp-sub">
              <Calendar :size="10" />
              <span>{{ formatDate(r.attendance_date) }}</span>
              <span class="cor-meta-dot">·</span>
              <Clock3 :size="10" />
              <span>{{ relative(r.created_at) }}</span>
            </div>
            <div class="cor-tag-row">
              <span class="cor-type-tag" :data-type="reasonType(r.reason)">
                <component :is="typeIcon(r.reason)" :size="10" />
                {{ typeLabel(r.reason) }}
              </span>
            </div>
          </div>
        </div>

        <!-- COLUMN 2: Time-diff visualizer -->
        <div class="cor-diff">
          <div class="cor-diff-line cor-diff-original">
            <span class="cor-diff-label">ORIGINAL</span>
            <div class="cor-time-bar">
              <span class="cor-time-stamp left">{{ r.original_check_in ? formatTime(r.original_check_in) : '—:—' }}</span>
              <span class="cor-time-track">
                <span class="cor-time-fill is-original" />
              </span>
              <span class="cor-time-stamp right">{{ r.original_check_out ? formatTime(r.original_check_out) : '—:—' }}</span>
            </div>
          </div>
          <div class="cor-diff-line cor-diff-requested">
            <span class="cor-diff-label">REQUESTED</span>
            <div class="cor-time-bar">
              <span class="cor-time-stamp left">{{ formatTime(r.requested_check_in) }}</span>
              <Motion class="cor-time-track"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: 0.5, delay: 0.18 + 0.04 * i }"
              >
                <Motion class="cor-time-fill is-requested"
                  :initial="{ scaleX: 0 }"
                  :animate="{ scaleX: 1 }"
                  :transition="{ duration: 0.7, delay: 0.24 + 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
                />
              </Motion>
              <span class="cor-time-stamp right">{{ formatTime(r.requested_check_out) }}</span>
            </div>
          </div>
          <div class="cor-diff-summary">
            <span class="cor-diff-chip" :data-direction="diffInfo(r).direction">
              <component :is="diffInfo(r).icon" :size="10" />
              {{ diffInfo(r).label }}
            </span>
          </div>
        </div>

        <!-- COLUMN 3: Status + actions -->
        <div class="cor-actions">
          <span :class="['cor-status', `is-${r.status.toLowerCase()}`]">
            <span class="cor-status-dot" />{{ r.status }}
          </span>
          <template v-if="r.status === 'PENDING'">
            <Motion as="button" class="cor-btn cor-btn-reject"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="decide(r, 'REJECTED')">
              <XCircle :size="13" />Reject
            </Motion>
            <Motion as="button" class="cor-btn cor-btn-approve"
              :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.95 }"
              @click="decide(r, 'APPROVED')">
              <CheckCircle2 :size="13" />Approve
            </Motion>
          </template>
        </div>

        <!-- BOTTOM-SPAN: Reason in a quote panel -->
        <div class="cor-reason">
          <Quote :size="11" />
          <span>{{ stripReasonPrefix(r.reason) || 'No reason provided' }}</span>
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="cor-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45 }"
    >
      <span class="cor-empty-aurora" />
      <div class="cor-empty-illustration">
        <svg viewBox="0 0 80 80" class="cor-empty-ticket">
          <defs>
            <linearGradient id="corTicketGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fde68a" />
              <stop offset="50%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#fb923c" />
            </linearGradient>
          </defs>
          <rect x="14" y="20" width="52" height="40" rx="4" fill="url(#corTicketGrad)"
            stroke="rgba(180, 83, 9, 0.55)" stroke-width="1.2" />
          <g fill="rgba(180, 83, 9, 0.55)">
            <circle cx="20" cy="26" r="1" /><circle cx="20" cy="32" r="1" />
            <circle cx="20" cy="38" r="1" /><circle cx="20" cy="44" r="1" />
            <circle cx="20" cy="50" r="1" /><circle cx="20" cy="56" r="1" />
          </g>
          <line x1="28" y1="30" x2="58" y2="30" stroke="rgba(120, 53, 15, 0.45)" stroke-width="1.4" />
          <line x1="28" y1="36" x2="50" y2="36" stroke="rgba(120, 53, 15, 0.45)" stroke-width="1.4" />
          <line x1="28" y1="42" x2="54" y2="42" stroke="rgba(120, 53, 15, 0.45)" stroke-width="1.4" />
          <circle cx="60" cy="52" r="6" fill="rgba(255, 255, 255, 0.55)" stroke="#1f1408" stroke-width="0.8" />
          <line class="ce-clock-min" x1="60" y1="52" x2="60" y2="48" stroke="#1f1408" stroke-width="1.2" stroke-linecap="round" />
          <line class="ce-clock-hr"  x1="60" y1="52" x2="63" y2="52" stroke="#1f1408" stroke-width="0.9" stroke-linecap="round" />
          <circle cx="60" cy="52" r="0.7" fill="#1f1408" />
        </svg>
        <span class="cor-empty-particle p1" />
        <span class="cor-empty-particle p2" />
        <span class="cor-empty-particle p3" />
        <span class="cor-empty-ring r1" />
        <span class="cor-empty-ring r2" />
        <span class="cor-empty-ring r3" />
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <div class="cor-empty-meta">
        <span class="cor-empty-meta-dot" />
        Live · auto-refresh when a new dispute lands
      </div>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, CheckCircle2, XCircle, Quote, Pencil, Calendar, Clock3,
  ListChecks, Hourglass, ArrowUpRight, ArrowDownRight, Equal,
  AlertTriangle, LogIn, LogOut, FilePenLine,
} from 'lucide-vue-next'
import { fetchCorrections, decideCorrection } from '../composables/useAttendance'
import { useToast } from 'vue-toastification'
import AttRejectModal from '../components/AttRejectModal.vue'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

// ── Static config ────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'PENDING',  label: 'Pending',  dot: '#f59e0b' },
  { key: 'APPROVED', label: 'Approved', dot: '#0d9488' },
  { key: 'REJECTED', label: 'Rejected', dot: '#b91c1c' },
  { key: '',         label: 'All',      dot: '#94a3b8' },
]

// ── State ──────────────────────────────────────────────────────────────
const filter = ref('PENDING')
const rows = ref([])
const allRows = ref([])
const loading = ref(false)
const counts = reactive({ PENDING: 0, APPROVED: 0, REJECTED: 0, '': 0 })

const activeIdx = computed(() => FILTERS.findIndex(f => f.key === filter.value))

const todayApproved = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return allRows.value.filter(r =>
    r.status === 'APPROVED' && r.updated_at && r.updated_at.slice(0, 10) === today
  ).length
})

const totalCount = computed(() => allRows.value.length)
const safePct = (n) => totalCount.value === 0 ? 0 : Math.round((n / totalCount.value) * 100)

const kpiTiles = computed(() => [
  {
    key: 'pending', filter: 'PENDING', label: 'AWAITING DECISION',
    icon: Hourglass, tone: 'amber',
    value: counts.PENDING,
    foot: counts.PENDING > 0 ? 'needs review' : 'all caught up',
    badge: counts.PENDING > 5 ? 'high' : null,
    pct: safePct(counts.PENDING),
  },
  {
    key: 'approved', filter: 'APPROVED', label: 'APPROVED',
    icon: CheckCircle2, tone: 'teal',
    value: counts.APPROVED,
    foot: counts.APPROVED === 1 ? '1 correction applied' : `${counts.APPROVED} corrections applied`,
    pct: safePct(counts.APPROVED),
  },
  {
    key: 'today', filter: 'APPROVED', label: 'CLOSED TODAY',
    icon: FilePenLine, tone: 'gold',
    value: todayApproved.value,
    foot: 'approvals this calendar day',
    pct: counts.APPROVED ? Math.round((todayApproved.value / counts.APPROVED) * 100) : 0,
  },
  {
    key: 'rejected', filter: 'REJECTED', label: 'REJECTED',
    icon: XCircle, tone: 'red',
    value: counts.REJECTED,
    foot: 'audit trail kept',
    pct: safePct(counts.REJECTED),
  },
])

const emptyTitle = computed(() => {
  if (filter.value === 'PENDING')  return 'All clear · no pending corrections'
  if (filter.value === 'APPROVED') return 'No approved corrections in this view'
  if (filter.value === 'REJECTED') return 'No rejections recorded'
  return 'No corrections yet'
})
const emptySub = computed(() => {
  if (filter.value === 'PENDING')  return 'When an employee disputes a punch — wrong in/out, missed biometric, manual override — the request lands here for two-level approval.'
  if (filter.value === 'APPROVED') return 'Approved corrections rewrite the attendance row with the requested in/out values and write an immutable audit log.'
  if (filter.value === 'REJECTED') return 'Rejections stay on file with your decision note. The employee can re-submit if the issue is genuine.'
  return 'Punch disputes appear here for two-level approval. Manager review first, then HR final sign-off.'
})

const setFilter = (k) => {
  if (k === null || k === undefined) return
  filter.value = k
  applyFilter()
}

const applyFilter = () => {
  rows.value = filter.value
    ? allRows.value.filter(r => r.status === filter.value)
    : allRows.value
}

const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const data = await fetchCorrections({})
    allRows.value = data.items || []
    counts.PENDING  = allRows.value.filter(r => r.status === 'PENDING').length
    counts.APPROVED = allRows.value.filter(r => r.status === 'APPROVED').length
    counts.REJECTED = allRows.value.filter(r => r.status === 'REJECTED').length
    counts[''] = allRows.value.length
    applyFilter()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load corrections')
  } finally {
    loading.value = false
  }
}
onMounted(reload)

// ── Reject + Approve flow ──────────────────────────────────────────────
const rejectModal = reactive({ open: false, target: null, submitting: false })

const decide = async (r, decision) => {
  if (decision === 'REJECTED') {
    rejectModal.target = r
    rejectModal.open = true
    return
  }
  try {
    await decideCorrection(r.id, 'APPROVED', '')
    toast.success('Correction approved · attendance row rewritten')
    allRows.value = allRows.value.map(x => x.id === r.id ? { ...x, status: 'APPROVED' } : x)
    counts.PENDING  = allRows.value.filter(x => x.status === 'PENDING').length
    counts.APPROVED = allRows.value.filter(x => x.status === 'APPROVED').length
    applyFilter()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Decision failed')
  }
}

const closeRejectModal = () => {
  if (rejectModal.submitting) return
  rejectModal.open = false
  rejectModal.target = null
}

const confirmReject = async (reason) => {
  const r = rejectModal.target
  if (!r) return
  rejectModal.submitting = true
  try {
    await decideCorrection(r.id, 'REJECTED', reason)
    toast.success('Correction rejected — employee will be notified')
    allRows.value = allRows.value.map(x => x.id === r.id ? { ...x, status: 'REJECTED' } : x)
    counts.PENDING  = allRows.value.filter(x => x.status === 'PENDING').length
    counts.REJECTED = allRows.value.filter(x => x.status === 'REJECTED').length
    applyFilter()
    rejectModal.open = false
    rejectModal.target = null
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Decision failed')
  } finally {
    rejectModal.submitting = false
  }
}

// ── Diff helpers ───────────────────────────────────────────────────────
// Tagging that the backend stores as `[LATE_PUNCH]` / `[EARLY_EXIT]` prefixes
// in the reason. We surface those as a typed chip on the row card.
const reasonType = (raw) => {
  if (!raw) return 'CORRECTION'
  if (raw.startsWith('[LATE_PUNCH]')) return 'LATE_PUNCH'
  if (raw.startsWith('[EARLY_EXIT]')) return 'EARLY_EXIT'
  return 'CORRECTION'
}
const typeLabel = (raw) => {
  const t = reasonType(raw)
  if (t === 'LATE_PUNCH') return 'Late punch'
  if (t === 'EARLY_EXIT') return 'Early exit'
  return 'Correction'
}
const typeIcon = (raw) => {
  const t = reasonType(raw)
  if (t === 'LATE_PUNCH') return LogIn
  if (t === 'EARLY_EXIT') return LogOut
  return AlertTriangle
}
const stripReasonPrefix = (raw) => (raw || '').replace(/^\[[A-Z_]+\]\s*/, '')

// Computes the dominant diff between original and requested punches and returns
// a short human-readable label like "+15 min earlier in" or "-30 min later out".
const diffInfo = (r) => {
  const oi = r.original_check_in  ? new Date(r.original_check_in).getTime()  : null
  const oo = r.original_check_out ? new Date(r.original_check_out).getTime() : null
  const ri = r.requested_check_in  ? new Date(r.requested_check_in).getTime()  : null
  const ro = r.requested_check_out ? new Date(r.requested_check_out).getTime() : null

  // If we have no original at all, this is a fresh-punch request.
  if (oi == null && oo == null) {
    return { label: 'New punch entry', direction: 'new', icon: ArrowUpRight }
  }

  let inDeltaMin = null
  let outDeltaMin = null
  if (oi != null && ri != null) inDeltaMin  = Math.round((ri - oi) / 60000)
  if (oo != null && ro != null) outDeltaMin = Math.round((ro - oo) / 60000)

  const dominant = (() => {
    if (inDeltaMin != null && outDeltaMin == null) return { side: 'in',  delta: inDeltaMin }
    if (outDeltaMin != null && inDeltaMin == null) return { side: 'out', delta: outDeltaMin }
    if (inDeltaMin != null && outDeltaMin != null) {
      return Math.abs(inDeltaMin) >= Math.abs(outDeltaMin)
        ? { side: 'in',  delta: inDeltaMin }
        : { side: 'out', delta: outDeltaMin }
    }
    return null
  })()

  if (!dominant) return { label: 'No change', direction: 'same', icon: Equal }
  if (dominant.delta === 0) return { label: 'No change', direction: 'same', icon: Equal }

  const abs = Math.abs(dominant.delta)
  const human = abs >= 60 ? `${Math.floor(abs / 60)}h ${abs % 60 ? `${abs % 60}m` : ''}`.trim() : `${abs}m`
  if (dominant.side === 'in') {
    // Earlier in = negative delta (requested is earlier than original)
    if (dominant.delta < 0) return { label: `${human} earlier in`, direction: 'earlier', icon: ArrowUpRight }
    return { label: `${human} later in`, direction: 'later', icon: ArrowDownRight }
  }
  // Out side: positive delta = later out, negative = earlier out
  if (dominant.delta > 0) return { label: `${human} later out`, direction: 'later', icon: ArrowDownRight }
  return { label: `${human} earlier out`, direction: 'earlier', icon: ArrowUpRight }
}

// ── Formatters ─────────────────────────────────────────────────────────
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const formatDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'
const formatTime = (iso) => {
  if (!iso) return '—:—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const relative = (iso) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-cor { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ═══════════════════════════════════════════════════════════════════════
   HERO BANNER — dual-clock motif, perforated ticket edge
   ═══════════════════════════════════════════════════════════════════════ */
.cor-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px 26px 38px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 191, 36, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(234, 88, 12, 0.14), transparent 70%),
    var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: block;
  isolation: isolate;
}
[data-theme="light"] .cor-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(217, 119, 6, 0.16), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(194, 65, 12, 0.14), transparent 70%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* Perforated ticket-tear edge on the left */
.cor-banner-perforation {
  position: absolute; left: 14px; top: 20px; bottom: 20px; width: 5px;
  background:
    radial-gradient(circle at 50% 5px,  rgba(251, 191, 36, 0.65) 1.6px, transparent 2.0px),
    radial-gradient(circle at 50% 13px, rgba(251, 191, 36, 0.65) 1.6px, transparent 2.0px),
    radial-gradient(circle at 50% 21px, rgba(251, 191, 36, 0.65) 1.6px, transparent 2.0px),
    radial-gradient(circle at 50% 29px, rgba(251, 191, 36, 0.65) 1.6px, transparent 2.0px);
  background-repeat: repeat-y; background-size: 5px 14px;
  opacity: 0.65;
  z-index: 1; pointer-events: none;
}
[data-theme="light"] .cor-banner-perforation {
  background:
    radial-gradient(circle at 50% 5px,  rgba(180, 83, 9, 0.60) 1.6px, transparent 2.0px),
    radial-gradient(circle at 50% 13px, rgba(180, 83, 9, 0.60) 1.6px, transparent 2.0px),
    radial-gradient(circle at 50% 21px, rgba(180, 83, 9, 0.60) 1.6px, transparent 2.0px),
    radial-gradient(circle at 50% 29px, rgba(180, 83, 9, 0.60) 1.6px, transparent 2.0px);
  background-repeat: repeat-y; background-size: 5px 14px;
}

.cor-banner-glow {
  position: absolute; inset: -50% -10% auto auto;
  width: 60%; height: 240%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.22), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Dual-clock motif */
.cor-clocks {
  position: absolute; top: 50%; right: 18px;
  transform: translateY(-50%);
  display: flex; align-items: center; gap: 10px;
  z-index: 1; pointer-events: none;
  opacity: 0.95;
}
.cor-clock {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.cor-clock-tag {
  font-size: 8.5px; letter-spacing: 1.6px; font-weight: 800;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--hr-text-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
.cor-clock-before .cor-clock-tag { color: var(--hr-text-muted); }
.cor-clock-after  .cor-clock-tag {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .cor-clock-tag { color: #6b5840; background: rgba(255, 250, 240, 0.75); border-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .cor-clock-after .cor-clock-tag { color: #b45309; background: rgba(251, 191, 36, 0.20); border-color: rgba(180, 83, 9, 0.45); }
.cor-clock-face {
  position: relative;
  width: 72px; height: 72px;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, rgba(20, 16, 14, 0.55), rgba(20, 16, 14, 0.30));
  border: 1.5px solid rgba(251, 191, 36, 0.35);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35);
}
.cor-clock-before .cor-clock-face {
  opacity: 0.65;
  filter: grayscale(0.35);
}
.cor-clock-after .cor-clock-face {
  border-color: rgba(251, 191, 36, 0.70);
  background:
    radial-gradient(closest-side, rgba(251, 191, 36, 0.10), rgba(20, 16, 14, 0.35));
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.25),
    0 0 16px -4px rgba(251, 191, 36, 0.55);
}
[data-theme="light"] .cor-clock-face {
  background:
    radial-gradient(closest-side, rgba(255, 250, 240, 0.85), rgba(254, 230, 138, 0.45));
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow: inset 0 2px 6px rgba(120, 53, 15, 0.18);
}
[data-theme="light"] .cor-clock-after .cor-clock-face {
  background:
    radial-gradient(closest-side, rgba(254, 243, 199, 0.95), rgba(251, 191, 36, 0.35));
  border-color: rgba(217, 119, 6, 0.65);
  box-shadow:
    inset 0 2px 6px rgba(120, 53, 15, 0.18),
    0 0 16px -4px rgba(217, 119, 6, 0.45);
}
.cor-clock-tick {
  position: absolute; top: 2px; left: calc(50% - 0.8px);
  width: 1.6px; height: 4px;
  border-radius: 1px;
  background: rgba(251, 191, 36, 0.50);
  transform-origin: 50% 34px;
}
[data-theme="light"] .cor-clock-tick { background: rgba(180, 83, 9, 0.55); }
.cor-clock-hand {
  position: absolute; left: 50%; top: 50%;
  background: #fcd34d;
  border-radius: 999px;
  transform-origin: 0 50%;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
}
[data-theme="light"] .cor-clock-hand { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.4); }
.cor-clock-hand-min { width: 24px; height: 2px; margin-top: -1px; }
.cor-clock-hand-hr  { width: 16px; height: 2.5px; margin-top: -1.25px; }
.cor-clock-before-min { animation: cor-hand-spin 28s linear infinite; transform: rotate(-90deg); }
.cor-clock-before-hr  { animation: cor-hand-spin 360s linear infinite; transform: rotate(-130deg); }
.cor-clock-after-min  { animation: cor-hand-spin 18s linear infinite; transform: rotate(-50deg); }
.cor-clock-after-hr   { animation: cor-hand-spin 220s linear infinite; transform: rotate(-70deg); }
@keyframes cor-hand-spin { to { transform: rotate(270deg); } }
.cor-clock-center {
  position: absolute; left: calc(50% - 2.5px); top: calc(50% - 2.5px);
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
}
[data-theme="light"] .cor-clock-center { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.5); }

.cor-clock-arrow {
  position: relative;
  display: flex; align-items: center;
  width: 48px; height: 28px;
}
.cor-arrow-stem {
  position: absolute; left: 0; right: 12px; top: 50%;
  height: 2px; margin-top: -1px;
  background: linear-gradient(90deg, transparent, #fbbf24 30%, #fb923c 100%);
  background-size: 200% 100%;
  animation: cor-arrow-flow 1.8s linear infinite;
}
@keyframes cor-arrow-flow {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.cor-arrow-tip {
  position: absolute; right: 6px; top: 50%; margin-top: -5px;
  width: 0; height: 0;
  border-left: 8px solid #fb923c;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  filter: drop-shadow(0 0 4px rgba(251, 146, 60, 0.7));
}
.cor-arrow-pencil {
  position: absolute; left: 50%; top: -16px;
  margin-left: -7px;
  padding: 3px;
  border-radius: 6px;
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.45);
  animation: cor-pencil-bob 2.5s ease-in-out infinite;
}
[data-theme="light"] .cor-arrow-pencil {
  color: #b45309;
  background: rgba(254, 230, 138, 0.70);
  border-color: rgba(180, 83, 9, 0.45);
}
@keyframes cor-pencil-bob {
  0%, 100% { transform: translateY(0) rotate(-8deg); }
  50%      { transform: translateY(-3px) rotate(8deg); }
}

.cor-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 240px; }
.cor-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fcd34d;
}
[data-theme="light"] .cor-eyebrow { color: #b45309; }
.cor-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .cor-eyebrow-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.55); }

.cor-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fbbf24 35%, #fb923c 70%, #fde68a 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: cor-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .cor-banner-title {
  background: linear-gradient(110deg, #b45309 0%, #d97706 35%, #c2410c 70%, #b45309 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes cor-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.cor-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.cor-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 540px;
}
.cor-banner-sub strong { color: #fcd34d; font-weight: 700; }
.cor-banner-sub em { color: #fb923c; font-style: normal; font-weight: 600; }
[data-theme="light"] .cor-banner-sub strong { color: #b45309; }
[data-theme="light"] .cor-banner-sub em { color: #9a3412; }

.cor-refresh-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(234, 88, 12, 0.10));
  color: #fcd34d;
  font-weight: 800; font-size: 11.5px; letter-spacing: 0.3px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  cursor: pointer;
  box-shadow: 0 8px 20px -10px rgba(234, 88, 12, 0.45);
  transition: background .25s, border-color .25s, box-shadow .25s;
}
.cor-refresh-cta:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(234, 88, 12, 0.18));
  border-color: rgba(251, 191, 36, 0.70);
  box-shadow: 0 14px 32px -10px rgba(234, 88, 12, 0.62);
}
.cor-refresh-cta.spinning svg { animation: cor-spin 0.9s linear infinite; }
@keyframes cor-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .cor-refresh-cta {
  background: linear-gradient(135deg, rgba(254, 230, 138, 0.85), rgba(251, 191, 36, 0.55));
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.45);
  box-shadow: 0 8px 22px -10px rgba(180, 83, 9, 0.40);
}
[data-theme="light"] .cor-refresh-cta:hover {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.65);
}

/* ═══════════════════════════════════════════════════════════════════════
   KPI STRIP — stat ribbons w/ scanning bar + meter
   ═══════════════════════════════════════════════════════════════════════ */
.cor-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.cor-kpi {
  position: relative;
  padding: 16px 18px 14px 22px;
  border-radius: 16px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .cor-kpi {
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.cor-kpi.active {
  border-color: var(--accent, #fbbf24);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(251, 191, 36, 0.45));
}
[data-theme="light"] .cor-kpi.active {
  border-color: var(--accent-light, #d97706);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(217, 119, 6, 0.40));
}
/* Vertical accent rule on the left edge */
.kpi-rule {
  position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px;
  background: linear-gradient(180deg, var(--accent, #fbbf24), transparent);
  border-radius: 0 2px 2px 0;
  opacity: 0.85;
}
[data-theme="light"] .kpi-rule { background: linear-gradient(180deg, var(--accent-light, #d97706), transparent); }
/* Scanning bar that sweeps left→right on hover */
.kpi-scan {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.10) 50%, transparent 60%);
  transform: translateX(-100%);
  pointer-events: none;
  transition: transform 0.85s var(--att-spring);
}
.cor-kpi:hover .kpi-scan { transform: translateX(100%); }
[data-theme="light"] .kpi-scan {
  background: linear-gradient(115deg, transparent 40%, rgba(180, 83, 9, 0.10) 50%, transparent 60%);
}

.kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }
.kpi-badge {
  display: inline-flex; align-items: center;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 8px; letter-spacing: 1.2px;
  font-weight: 800; text-transform: uppercase;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  box-shadow: 0 4px 10px -4px rgba(185, 28, 28, 0.7);
  animation: cor-pulse-badge 2.2s ease-in-out infinite;
}
@keyframes cor-pulse-badge {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}
.kpi-num {
  display: block;
  margin: 10px 0 3px;
  font-size: 30px; font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 191, 36, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { display: block; font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

/* Progress meter at the bottom */
.kpi-meter {
  margin-top: 10px;
  height: 4px; width: 100%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.16);
  overflow: hidden;
}
[data-theme="light"] .kpi-meter {
  background: rgba(255, 250, 240, 0.75);
  border-color: rgba(180, 83, 9, 0.18);
}
.kpi-meter-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--accent, #fbbf24), var(--accent-light, #d97706));
  border-radius: 999px;
  transform-origin: left center;
  box-shadow: 0 0 8px var(--accent-glow, rgba(251, 191, 36, 0.45));
}

.tone-amber  { --accent: #f59e0b; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.30); --accent-shadow: rgba(251, 146, 60, 0.45); --accent-shadow-light: rgba(217, 119, 6, 0.45); }
.tone-teal   { --accent: #0d9488; --accent-light: #0f766e; --accent-glow: rgba(20, 184, 166, 0.30); --accent-shadow: rgba(13, 148, 136, 0.45); --accent-shadow-light: rgba(15, 118, 110, 0.45); }
.tone-gold   { --accent: #fbbf24; --accent-light: #d97706; --accent-glow: rgba(251, 191, 36, 0.32); --accent-shadow: rgba(217, 119, 6, 0.45); --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.tone-red    { --accent: #b91c1c; --accent-light: #991b1b; --accent-glow: rgba(185, 28, 28, 0.26); --accent-shadow: rgba(185, 28, 28, 0.45); --accent-shadow-light: rgba(153, 27, 27, 0.45); }

/* ═══════════════════════════════════════════════════════════════════════
   SEGMENTED FILTER CONTROL — sliding indicator
   ═══════════════════════════════════════════════════════════════════════ */
.cor-segctrl-wrap {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
}
.cor-segctrl {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 4px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.20),
    0 6px 16px -14px rgba(0, 0, 0, 0.35);
  min-width: 480px;
  flex: 1;
  max-width: 720px;
}
[data-theme="light"] .cor-segctrl {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    inset 0 2px 6px rgba(120, 53, 15, 0.10),
    0 6px 16px -14px rgba(40, 25, 10, 0.18);
}
.cor-segctrl-slider {
  position: absolute;
  top: 4px; bottom: 4px;
  left: 4px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fde68a, #fbbf24 50%, #f59e0b);
  box-shadow:
    0 6px 16px -6px rgba(234, 88, 12, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
  z-index: 0;
  /* Slider X is set via Motion :animate. The width = 100%/N controls how far
     across the strip each step moves, since X is in slider-width units. */
}
[data-theme="light"] .cor-segctrl-slider {
  background: linear-gradient(135deg, #fbbf24, #f59e0b 50%, #c2410c);
  box-shadow:
    0 6px 16px -6px rgba(180, 83, 9, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.cor-segctrl-tab {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 8px 10px;
  border: 0; background: transparent;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: color .25s;
  text-transform: uppercase;
  border-radius: 10px;
}
.cor-segctrl-tab:hover { color: var(--hr-text); }
.cor-segctrl-tab.active { color: #1f1408; }
[data-theme="light"] .cor-segctrl-tab { color: #6b5840; }
[data-theme="light"] .cor-segctrl-tab.active { color: #1f1408; }
.cor-tab-dot {
  width: 6px; height: 6px; border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}
.cor-tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px; font-weight: 800;
  background: rgba(0, 0, 0, 0.24);
  color: inherit;
}
.cor-segctrl-tab.active .cor-tab-count { background: rgba(31, 20, 8, 0.20); }
[data-theme="light"] .cor-tab-count { background: rgba(255, 255, 255, 0.55); }
[data-theme="light"] .cor-segctrl-tab.active .cor-tab-count { background: rgba(255, 255, 255, 0.45); }

.cor-segctrl-right { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cor-segctrl-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted); text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.32);
}
.cor-segctrl-meta svg { color: #fcd34d; }
[data-theme="light"] .cor-segctrl-meta { background: rgba(255, 250, 240, 0.78); border-color: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .cor-segctrl-meta svg { color: #b45309; }

/* ═══════════════════════════════════════════════════════════════════════
   ROW LIST — time-diff cards
   ═══════════════════════════════════════════════════════════════════════ */
.cor-list { display: flex; flex-direction: column; gap: 10px; }
.cor-row {
  position: relative;
  display: grid;
  grid-template-columns: 220px 1fr auto;
  grid-template-rows: auto auto;
  grid-template-areas:
    "identity diff actions"
    "reason   reason actions";
  column-gap: 18px;
  row-gap: 10px;
  align-items: center;
  padding: 16px 20px;
  border-radius: 18px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 18px -14px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .cor-row {
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 6px 18px -14px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.cor-row:hover {
  border-color: rgba(251, 191, 36, 0.75);
  box-shadow: 0 16px 36px -20px rgba(234, 88, 12, 0.42);
}
[data-theme="light"] .cor-row:hover {
  border-color: rgba(180, 83, 9, 0.65);
  box-shadow: 0 16px 36px -20px rgba(180, 83, 9, 0.30);
}
.cor-row-aurora {
  position: absolute; inset: -30% 60% -30% -20%;
  background: radial-gradient(50% 80% at 30% 50%, rgba(251, 191, 36, 0.18), transparent 70%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s; pointer-events: none;
}
.cor-row:hover .cor-row-aurora { opacity: 1; }
[data-theme="light"] .cor-row-aurora { background: radial-gradient(50% 80% at 30% 50%, rgba(217, 119, 6, 0.16), transparent 70%); }
.cor-row.is-pending  { border-left: 4px solid #f59e0b; }
.cor-row.is-approved { border-left: 4px solid #0d9488; }
.cor-row.is-rejected { border-left: 4px solid #b91c1c; }

/* Identity pillar */
.cor-identity {
  grid-area: identity;
  display: flex; align-items: center; gap: 12px; min-width: 0;
}
.cor-avatar {
  position: relative;
  width: 46px; height: 46px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #fb923c 100%);
  color: #1f1408;
  font-size: 14px; font-weight: 900; letter-spacing: 0.4px;
  border: 2px solid rgba(251, 191, 36, 0.65);
  box-shadow:
    0 8px 20px -8px rgba(234, 88, 12, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.30);
}
[data-theme="light"] .cor-avatar {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #c2410c 100%);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.60);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.40);
}
.cor-avatar-ring {
  position: absolute; inset: -5px;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.45);
  animation: att-ring-rotate 22s linear infinite;
  pointer-events: none;
}
[data-theme="light"] .cor-avatar-ring { border-color: rgba(180, 83, 9, 0.45); }
.cor-avatar-text { position: relative; z-index: 1; }

.cor-identity-meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cor-emp-name {
  font-size: 13.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 160px;
}
.cor-emp-sub {
  display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;
  font-size: 10.5px; color: var(--hr-text-muted); font-weight: 600;
}
.cor-emp-sub svg { color: var(--hr-text-muted); }
.cor-meta-dot { margin: 0 3px; opacity: 0.55; }
.cor-tag-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.cor-type-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.7px;
  text-transform: uppercase;
  border: 1px solid;
}
.cor-type-tag[data-type="LATE_PUNCH"]  { background: rgba(245, 158, 11, 0.18); color: #fcd34d; border-color: rgba(245, 158, 11, 0.50); }
.cor-type-tag[data-type="EARLY_EXIT"]  { background: rgba(234, 88, 12, 0.18);  color: #fdba74; border-color: rgba(234, 88, 12, 0.50); }
.cor-type-tag[data-type="CORRECTION"]  { background: rgba(251, 191, 36, 0.16); color: #fde68a; border-color: rgba(251, 191, 36, 0.45); }
[data-theme="light"] .cor-type-tag[data-type="LATE_PUNCH"]  { background: rgba(245, 158, 11, 0.22); color: #92400e; border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .cor-type-tag[data-type="EARLY_EXIT"]  { background: rgba(234, 88, 12, 0.22);  color: #9a3412; border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .cor-type-tag[data-type="CORRECTION"]  { background: rgba(251, 191, 36, 0.28); color: #b45309; border-color: rgba(180, 83, 9, 0.55); }

/* Time-diff visualizer */
.cor-diff {
  grid-area: diff;
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 4px;
  min-width: 0;
}
.cor-diff-line {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}
.cor-diff-label {
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
.cor-diff-requested .cor-diff-label { color: #fcd34d; }
[data-theme="light"] .cor-diff-requested .cor-diff-label { color: #b45309; }
.cor-time-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  font-family: var(--hr-mono); font-variant-numeric: tabular-nums;
}
.cor-time-stamp {
  font-size: 12px; font-weight: 800;
  color: var(--hr-text-muted);
  letter-spacing: 0.2px;
}
.cor-diff-requested .cor-time-stamp { color: var(--hr-text); }
.cor-time-track {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.25);
  overflow: hidden;
}
[data-theme="light"] .cor-time-track {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.28);
}
.cor-time-fill {
  display: block;
  position: absolute; inset: 0;
  border-radius: 999px;
  transform-origin: left center;
}
.cor-time-fill.is-original {
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.55), rgba(100, 116, 139, 0.30));
}
[data-theme="light"] .cor-time-fill.is-original {
  background: linear-gradient(90deg, rgba(100, 116, 139, 0.45), rgba(148, 163, 184, 0.25));
}
.cor-time-fill.is-requested {
  background: linear-gradient(90deg, #fde68a 0%, #fbbf24 45%, #fb923c 100%);
  background-size: 200% 100%;
  animation: cor-fill-flow 3s linear infinite;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .cor-time-fill.is-requested {
  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 45%, #c2410c 100%);
  background-size: 200% 100%;
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.40);
}
@keyframes cor-fill-flow {
  0%   { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

.cor-diff-summary { display: flex; padding-top: 2px; }
.cor-diff-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.4px;
  border: 1px solid;
}
.cor-diff-chip[data-direction="earlier"] { background: rgba(251, 191, 36, 0.16); color: #fcd34d; border-color: rgba(251, 191, 36, 0.50); }
.cor-diff-chip[data-direction="later"]   { background: rgba(234, 88, 12, 0.16);  color: #fdba74; border-color: rgba(234, 88, 12, 0.50); }
.cor-diff-chip[data-direction="same"]    { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.50); }
.cor-diff-chip[data-direction="new"]     { background: rgba(13, 148, 136, 0.16); color: #5eead4; border-color: rgba(13, 148, 136, 0.50); }
[data-theme="light"] .cor-diff-chip[data-direction="earlier"] { background: rgba(251, 191, 36, 0.24); color: #92400e; border-color: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .cor-diff-chip[data-direction="later"]   { background: rgba(234, 88, 12, 0.22);  color: #9a3412; border-color: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .cor-diff-chip[data-direction="same"]    { background: rgba(148, 163, 184, 0.20); color: #334155; border-color: rgba(100, 116, 139, 0.55); }
[data-theme="light"] .cor-diff-chip[data-direction="new"]     { background: rgba(13, 148, 136, 0.20); color: #115e59; border-color: rgba(15, 118, 110, 0.55); }

/* Status + actions column */
.cor-actions {
  grid-area: actions;
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  justify-content: flex-end;
}
.cor-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
}
.cor-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.cor-status.is-pending  { background: rgba(245, 158, 11, 0.16); color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); }
.cor-status.is-approved { background: rgba(13, 148, 136, 0.16); color: #5eead4; border-color: rgba(13, 148, 136, 0.45); }
.cor-status.is-rejected { background: rgba(185, 28, 28, 0.16);  color: #fca5a5; border-color: rgba(185, 28, 28, 0.45); }
[data-theme="light"] .cor-status.is-pending  { background: rgba(245, 158, 11, 0.20); color: #92400e; border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .cor-status.is-approved { background: rgba(13, 148, 136, 0.20); color: #115e59; border-color: rgba(15, 118, 110, 0.55); }
[data-theme="light"] .cor-status.is-rejected { background: rgba(185, 28, 28, 0.18);  color: #7f1d1d; border-color: rgba(153, 27, 27, 0.55); }

.cor-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 13px;
  border-radius: 11px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s;
}
.cor-btn-approve {
  background: linear-gradient(135deg, #10b981 0%, #059669 55%, #047857 100%);
  color: #fff;
  border-color: #047857;
  box-shadow:
    0 8px 22px -8px rgba(5, 150, 105, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  text-shadow: 0 1px 1px rgba(0, 60, 40, 0.4);
}
.cor-btn-approve:hover {
  background: linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%);
  border-color: #065f46;
  box-shadow:
    0 14px 30px -10px rgba(5, 150, 105, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.cor-btn-approve svg { color: #fff; stroke-width: 2.6; }
.cor-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.55);
}
.cor-btn-reject:hover {
  background: rgba(220, 38, 38, 0.22);
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .cor-btn-approve {
  background: linear-gradient(135deg, #059669 0%, #047857 55%, #065f46 100%);
  border-color: #065f46;
  box-shadow:
    0 10px 24px -10px rgba(5, 150, 105, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
}
[data-theme="light"] .cor-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .cor-btn-reject:hover { background: rgba(220, 38, 38, 0.18); }

/* Reason spanning the bottom */
.cor-reason {
  grid-area: reason;
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 11.5px; color: var(--hr-text-muted);
  font-style: italic; line-height: 1.5;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(251, 191, 36, 0.30);
}
[data-theme="light"] .cor-reason {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(180, 83, 9, 0.32);
  color: #6b5840;
}
.cor-reason svg { color: #fcd34d; flex-shrink: 0; margin-top: 2px; }
[data-theme="light"] .cor-reason svg { color: #b45309; }
.cor-reason span { word-break: break-word; }

/* ═══════════════════════════════════════════════════════════════════════
   EMPTY STATE — preserved ticket+clock illustration with extra particles
   ═══════════════════════════════════════════════════════════════════════ */
.cor-empty {
  position: relative;
  padding: 56px 30px 44px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
[data-theme="light"] .cor-empty {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
.cor-empty-aurora {
  position: absolute; inset: -40%;
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(251, 146, 60, 0.16), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(20, 184, 166, 0.12), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: att-warm-aurora 20s ease-in-out infinite;
  z-index: 0;
}
[data-theme="light"] .cor-empty-aurora {
  background:
    radial-gradient(50% 30% at 50% 30%, rgba(217, 119, 6, 0.16), transparent 60%),
    radial-gradient(40% 25% at 30% 70%, rgba(234, 88, 12, 0.14), transparent 60%),
    radial-gradient(40% 25% at 70% 70%, rgba(13, 148, 136, 0.10), transparent 60%);
}
.cor-empty > *:not(.cor-empty-aurora) { position: relative; z-index: 1; }

.cor-empty-illustration {
  position: relative;
  width: 130px; height: 130px;
  display: flex; align-items: center; justify-content: center;
}
.cor-empty-ticket {
  width: 100%; height: 100%;
  animation: cor-ticket-float 6s ease-in-out infinite;
  filter: drop-shadow(0 8px 16px rgba(234, 88, 12, 0.35));
}
@keyframes cor-ticket-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-6px) rotate(3deg); }
}
.ce-clock-min {
  transform-origin: 60px 52px;
  animation: att-hand-sweep-slow 30s linear infinite;
}
.ce-clock-hr {
  transform-origin: 60px 52px;
  animation: att-hand-sweep-slow 360s linear infinite;
}
.cor-empty-ring {
  position: absolute; top: 50%; left: 50%;
  width: 110px; height: 110px; border-radius: 50%;
  border: 1.4px solid rgba(251, 191, 36, 0.45);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: att-pulse-emanate 4s ease-out infinite;
  pointer-events: none;
}
.cor-empty-ring.r1 { animation-delay: 0s; }
.cor-empty-ring.r2 { animation-delay: 1.3s; }
.cor-empty-ring.r3 { animation-delay: 2.6s; }
[data-theme="light"] .cor-empty-ring { border-color: rgba(180, 83, 9, 0.45); }

/* Floating tick particles that drift up */
.cor-empty-particle {
  position: absolute;
  width: 4px; height: 4px; border-radius: 50%;
  background: #fcd34d;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.65);
  opacity: 0;
  pointer-events: none;
}
.cor-empty-particle.p1 { left: 28px; bottom: 20px; animation: cor-particle-drift 4.5s ease-in-out infinite 0.4s; }
.cor-empty-particle.p2 { right: 30px; bottom: 28px; animation: cor-particle-drift 5.2s ease-in-out infinite 1.6s; }
.cor-empty-particle.p3 { left: 50%; bottom: 16px; animation: cor-particle-drift 4.0s ease-in-out infinite 2.8s; }
@keyframes cor-particle-drift {
  0%   { transform: translateY(0) scale(0.8);  opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translateY(-90px) scale(1.4); opacity: 0; }
}
[data-theme="light"] .cor-empty-particle { background: #b45309; box-shadow: 0 0 8px rgba(180, 83, 9, 0.45); }

.cor-empty h3 { margin: 6px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.cor-empty p {
  margin: 0 0 4px; font-size: 12px; color: var(--hr-text-muted);
  max-width: 480px; line-height: 1.55; text-align: center;
}
.cor-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 4px;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.14);
  border: 1px solid rgba(13, 148, 136, 0.45);
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  color: #5eead4; text-transform: uppercase;
}
[data-theme="light"] .cor-empty-meta {
  background: rgba(13, 148, 136, 0.16);
  border-color: rgba(15, 118, 110, 0.55);
  color: #115e59;
}
.cor-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #5eead4;
  box-shadow: 0 0 6px #5eead4;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .cor-empty-meta-dot { background: #0f766e; box-shadow: 0 0 6px #0f766e; }

/* ═══════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════════ */
@media (max-width: 1100px) {
  .cor-banner-text { padding-right: 0; }
  .cor-clocks { position: relative; right: auto; top: auto; transform: none; justify-self: end; }
}
@media (max-width: 880px) {
  .cor-clocks { display: none; }
  .cor-segctrl { min-width: 0; width: 100%; max-width: 100%; }
  .cor-row {
    grid-template-columns: 1fr;
    grid-template-areas:
      "identity"
      "diff"
      "actions"
      "reason";
  }
  .cor-actions { justify-content: flex-start; }
  .cor-diff-line { grid-template-columns: 70px 1fr; gap: 8px; }
}
</style>
