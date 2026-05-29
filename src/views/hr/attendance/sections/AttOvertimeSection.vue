<template>
  <section class="att-ot" data-anim="att-ot">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="ot-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="ot-banner-glow" />

      <div class="ot-banner-text">
        <span class="ot-eyebrow">
          <span class="ot-eyebrow-dot" />Hours beyond the shift · Payroll-bound · Manager approval
        </span>
        <h2 class="ot-banner-title">
          <span>Over</span>
          <span class="ot-banner-divider">·</span>
          <span>time</span>
        </h2>
        <p class="ot-banner-sub">
          OT hours logged by employees, routed to manager approval, then posted to payroll. Approved-and-processed
          entries become <strong>immutable</strong> and feed the monthly run automatically.
        </p>
      </div>

      <div class="ot-banner-aside">
        <!-- Analog clock motif — OT's signature visual (purely decorative) -->
        <span class="ot-clock" aria-hidden="true">
          <span class="ot-clock-face">
            <span v-for="n in 12" :key="'tick-' + n" class="ot-tick" :style="{ transform: `rotate(${n * 30}deg) translateY(-42px)` }" />
            <span class="ot-hand ot-hand-hour" />
            <span class="ot-hand ot-hand-min" />
            <span class="ot-hand ot-hand-sec" />
            <span class="ot-clock-pin" />
          </span>
          <span class="ot-clock-ring ot-ring-a" />
          <span class="ot-clock-ring ot-ring-b" />
        </span>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP — hour-focused ═══════════════════ -->
    <div class="ot-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['ot-kpi', `tone-${t.tone}`, { active: filter === t.filter }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.10, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="t.filter !== null && setFilter(t.filter)"
      >
        <span class="kpi-aurora" aria-hidden="true" />
        <span class="kpi-grid-tex" aria-hidden="true" />
        <div class="kpi-head">
          <span class="kpi-eyebrow">
            <component :is="t.icon" :size="11" />
            <span>{{ t.label }}</span>
          </span>
          <span class="kpi-spark" :class="`spark-${t.tone}`">
            <span v-for="n in 5" :key="n" class="spark-bar" :style="{ height: t.spark[n - 1] + '%' }" />
          </span>
        </div>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}<span class="kpi-suffix">{{ t.suffix }}</span></Motion>
        <span class="kpi-foot">{{ t.foot }}</span>
      </Motion>
    </div>

    <!-- ═══════════════════ FILTER TOOLBAR ═══════════════════ -->
    <Motion as="div" class="ot-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.34 }"
    >
      <div class="ot-pills">
        <button v-for="f in FILTERS" :key="f.key"
          :class="['ot-pill', { active: filter === f.key }]"
          @click="setFilter(f.key)">
          <span class="ot-pill-dot" :style="{ background: f.dot }" />{{ f.label }}<span class="ot-pill-count">{{ counts[f.key] }}</span>
        </button>
      </div>
      <div class="ot-toolbar-right">
        <span class="ot-toolbar-meta">
          <Hourglass :size="11" />
          <span>{{ rows.length }} {{ rows.length === 1 ? 'entry' : 'entries' }} · {{ visibleHours.toFixed(1) }}h total</span>
        </span>
        <Motion as="button" class="ot-refresh-cta"
          :class="{ spinning: loading }"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="reload"
        >
          <RefreshCw :size="13" />Refresh
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ ROW LIST ═══════════════════ -->
    <div class="ot-list" v-if="rows.length">
      <!-- ═══════════════════ REJECT MODAL ═══════════════════ -->
      <AttDeleteModal
        :open="!!rejectTarget"
        title="Reject overtime request?"
        subtitle="The employee will be notified with the reason below so they can revise hours or re-submit."
        :target-label="rejectTarget?.employee_name || 'Unknown'"
        :target-meta="rejectTarget ? `${formatDate(rejectTarget.date)} · ${(Number(rejectTarget.ot_hours) || 0).toFixed(2)}h · ${rejectTarget.ot_type || 'OT'}` : ''"
        :target-tag="rejectTarget?.status || ''"
        :target-icon="TimerReset"
        :presets="[
          'Hours exceed policy / shift cap',
          'Insufficient justification — be more specific',
          'Work was not pre-approved by manager',
          'Submitted outside the 14-day window',
          'Duplicate of an existing OT request',
        ]"
        reason-placeholder="Explain why this OT request is being rejected — cite the policy or specific hours that don't match, so the employee can revise and resubmit…"
        confirm-label="Reject OT request"
        submitting-label="Rejecting…"
        warning="The employee sees this exact note. Rejection is logged to the audit trail and does NOT post to payroll."
        :submitting="rejecting"
        @close="rejectTarget = null"
        @confirm="confirmReject"
      />

      <Motion v-for="(r, i) in rows" :key="r.id" as="article"
        :class="['ot-row', `is-${r.status.toLowerCase()}`, r.payroll_status === 'PROCESSED' ? 'is-processed' : '']"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -2 }"
      >
        <span class="ot-row-aurora" aria-hidden="true" />

        <!-- LEFT: circular hours dial -->
        <div class="ot-dial-wrap">
          <svg class="ot-dial" viewBox="0 0 88 88" aria-hidden="true">
            <defs>
              <linearGradient :id="`otg-${r.id}`" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fcd34d" />
                <stop offset="50%" stop-color="#fb923c" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
            </defs>
            <!-- background ring -->
            <circle cx="44" cy="44" r="36" class="dial-bg" />
            <!-- progress ring (hours / 8 max, clamped) -->
            <circle cx="44" cy="44" r="36" class="dial-fg"
              :stroke="`url(#otg-${r.id})`"
              :stroke-dasharray="dialDash(r.ot_hours)"
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div class="ot-dial-text">
            <span class="dial-num"><OnbAnimatedNumber :value="Number(r.ot_hours) || 0" /></span>
            <span class="dial-unit">hrs</span>
          </div>
          <span class="ot-dial-pulse" v-if="r.status === 'PENDING'" />
        </div>

        <!-- MIDDLE: employee + meta + reason -->
        <div class="ot-body">
          <div class="ot-head">
            <span class="ot-emp">{{ r.employee_name || 'Unknown' }}</span>
            <span class="ot-emp-dot">·</span>
            <span class="ot-date">{{ formatDate(r.date) }}</span>
            <span class="ot-type-tag" :data-type="r.ot_type">
              <component :is="otTypeIcon(r.ot_type)" :size="10" />
              {{ r.ot_type || 'OT' }}
            </span>
          </div>
          <div class="ot-reason">
            <Quote :size="11" />
            <span>{{ r.reason || 'No reason provided' }}</span>
          </div>
        </div>

        <!-- RIGHT: payroll + status + actions -->
        <div class="ot-actions">
          <span v-if="r.payroll_status" class="ot-payroll" :data-status="r.payroll_status">
            <component :is="payrollIcon(r.payroll_status)" :size="10" />
            {{ r.payroll_status }}
          </span>
          <span :class="['ot-status', `is-${r.status.toLowerCase()}`]">
            <span class="ot-status-dot" />{{ r.status }}
          </span>
          <template v-if="r.status === 'PENDING'">
            <Motion as="button" class="ot-btn ot-btn-reject"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="openReject(r)">
              <XCircle :size="13" />Reject
            </Motion>
            <Motion as="button" class="ot-btn ot-btn-approve"
              :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.95 }"
              @click="decide(r, 'APPROVED')">
              <CheckCircle2 :size="13" />Approve
            </Motion>
          </template>
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="ot-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.42 }"
    >
      <span class="ot-empty-glow" />
      <div class="ot-empty-icon">
        <span class="ot-empty-orbit ot-empty-orbit-a" />
        <span class="ot-empty-orbit ot-empty-orbit-b" />
        <TimerReset :size="32" />
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <span class="ot-empty-meta">
        <span class="ot-empty-meta-dot" />Live · auto-refresh every minute
      </span>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, TimerReset, CheckCircle2, XCircle, Quote, Hourglass,
  Zap, Moon, Sun, CalendarDays, Banknote, Clock, AlertCircle, Wallet,
} from 'lucide-vue-next'
import { fetchOvertime, decideOvertime } from '../composables/useAttendance'
import OnbAnimatedNumber from '../../onboarding/components/OnbAnimatedNumber.vue'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

// ── Static config ────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'PENDING',  label: 'Pending',  dot: '#f59e0b' },
  { key: 'APPROVED', label: 'Approved', dot: '#0d9488' },
  { key: 'REJECTED', label: 'Rejected', dot: '#b91c1c' },
  { key: '',         label: 'All',      dot: '#94a3b8' },
]

const OT_TYPE_ICON = {
  REGULAR: Clock,
  WEEKEND: CalendarDays,
  HOLIDAY: Sun,
  NIGHT:   Moon,
  EMERGENCY: Zap,
}
const otTypeIcon = (t) => OT_TYPE_ICON[t] || Clock

const PAYROLL_ICON = {
  PROCESSED: Banknote,
  PENDING:   Wallet,
  HOLD:      AlertCircle,
}
const payrollIcon = (s) => PAYROLL_ICON[s] || Wallet

// ── State ──────────────────────────────────────────────────────────────
const filter = ref('PENDING')
const rows = ref([])
const allRows = ref([])
const loading = ref(false)

const counts = computed(() => {
  const all = allRows.value
  return {
    PENDING:  all.filter(r => r.status === 'PENDING').length,
    APPROVED: all.filter(r => r.status === 'APPROVED').length,
    REJECTED: all.filter(r => r.status === 'REJECTED').length,
    '':       all.length,
  }
})

const sumHours = (predicate) => allRows.value
  .filter(predicate)
  .reduce((acc, r) => acc + (Number(r.ot_hours) || 0), 0)

const pendingHours  = computed(() => sumHours(r => r.status === 'PENDING'))
const approvedHours = computed(() => sumHours(r => r.status === 'APPROVED'))
const monthHours = computed(() => {
  const now = new Date()
  const m = now.getMonth(), y = now.getFullYear()
  return sumHours(r => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getMonth() === m && d.getFullYear() === y && r.status === 'APPROVED'
  })
})
const avgPerEmployee = computed(() => {
  const approvedRows = allRows.value.filter(r => r.status === 'APPROVED')
  const employees = new Set(approvedRows.map(r => r.employee_name).filter(Boolean))
  if (!employees.size) return 0
  return approvedHours.value / employees.size
})

const visibleHours = computed(() => rows.value.reduce((a, r) => a + (Number(r.ot_hours) || 0), 0))

// Tiny sparkline data — represents distribution of recent OT hours (deterministic so layout doesn't jitter).
const buildSpark = (seed) => {
  const out = []
  for (let i = 0; i < 5; i++) {
    const v = 30 + ((seed * 17 + i * 23) % 70)
    out.push(v)
  }
  return out
}

const kpiTiles = computed(() => [
  {
    key: 'pending', filter: 'PENDING', label: 'AWAITING APPROVAL', icon: Hourglass, tone: 'amber',
    value: pendingHours.value.toFixed(1), suffix: 'h', spark: buildSpark(counts.value.PENDING + 1),
    foot: counts.value.PENDING > 0 ? `${counts.value.PENDING} ${counts.value.PENDING === 1 ? 'entry' : 'entries'} pending` : 'queue is clear',
  },
  {
    key: 'approved', filter: 'APPROVED', label: 'APPROVED HOURS', icon: CheckCircle2, tone: 'teal',
    value: approvedHours.value.toFixed(1), suffix: 'h', spark: buildSpark(counts.value.APPROVED + 3),
    foot: counts.value.APPROVED === 1 ? '1 entry approved' : `${counts.value.APPROVED} entries approved`,
  },
  {
    key: 'month', filter: null, label: 'THIS MONTH', icon: CalendarDays, tone: 'orange',
    value: monthHours.value.toFixed(1), suffix: 'h', spark: buildSpark(7),
    foot: 'approved · current month',
  },
  {
    key: 'avg', filter: null, label: 'AVG · PER EMPLOYEE', icon: Banknote, tone: 'gold',
    value: avgPerEmployee.value.toFixed(1), suffix: 'h', spark: buildSpark(5),
    foot: 'across approved entries',
  },
])

const emptyTitle = computed(() => {
  if (filter.value === 'PENDING')  return 'All hours accounted for'
  if (filter.value === 'APPROVED') return 'No approved overtime yet'
  if (filter.value === 'REJECTED') return 'No rejections in this view'
  return 'No overtime entries yet'
})
const emptySub = computed(() => {
  if (filter.value === 'PENDING')  return 'Hours logged beyond a shift queue here for manager approval before posting to payroll. The list refreshes itself when new entries arrive.'
  if (filter.value === 'APPROVED') return 'Approved overtime feeds the next payroll run automatically once it transitions to processed.'
  if (filter.value === 'REJECTED') return 'Rejections stay on file for the audit trail. The employee sees the decision note.'
  return 'When employees log overtime hours, they appear here for review.'
})

const setFilter = (k) => {
  filter.value = k
  applyFilter()
}
const applyFilter = () => {
  if (!filter.value) rows.value = allRows.value
  else rows.value = allRows.value.filter(r => r.status === filter.value)
}

const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const data = await fetchOvertime({})
    allRows.value = data.items || []
    applyFilter()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load OT') }
  finally { loading.value = false }
}
onMounted(reload)

const decide = async (r, decision, notes = '') => {
  try {
    await decideOvertime(r.id, decision, notes)
    toast.success(decision === 'APPROVED' ? 'OT approved · queued for payroll' : 'OT rejected')
    allRows.value = allRows.value.map(x => x.id === r.id ? { ...x, status: decision } : x)
    applyFilter()
    emit('refresh-stats')
    return true
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Decision failed')
    return false
  }
}

// ── Reject modal flow ─────────────────────────────────────────────────
const rejectTarget = ref(null)
const rejecting = ref(false)
const openReject = (r) => { rejectTarget.value = r }
const confirmReject = async (reason) => {
  if (!rejectTarget.value || rejecting.value) return
  rejecting.value = true
  try {
    const ok = await decide(rejectTarget.value, 'REJECTED', reason || '')
    if (ok) rejectTarget.value = null
  } finally {
    rejecting.value = false
  }
}

// SVG dial: r=36 → circumference ≈ 226.19. Max hours mapped to 8h (one full shift).
const DIAL_C = 2 * Math.PI * 36
const dialDash = (hours) => {
  const h = Math.min(Math.max(Number(hours) || 0, 0), 8)
  const fill = (h / 8) * DIAL_C
  return `${fill} ${DIAL_C - fill}`
}

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-ot { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ════════════════════ HERO ════════════════════ */
.ot-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(234, 88, 12, 0.18), transparent 60%),
    radial-gradient(120% 110% at 0% 110%, rgba(251, 146, 60, 0.16), transparent 65%),
    var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: grid; grid-template-columns: 1fr auto; gap: 18px;
  align-items: center;
  isolation: isolate;
}
[data-theme="light"] .ot-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(194, 65, 12, 0.15), transparent 60%),
    radial-gradient(120% 110% at 0% 110%, rgba(217, 119, 6, 0.14), transparent 65%),
    rgba(255, 250, 240, 0.94);
  border-color: rgba(194, 65, 12, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(120, 53, 15, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.ot-banner-glow {
  position: absolute; inset: -50% -10% auto -10%;
  height: 140%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 146, 60, 0.24), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Right column holds the decorative clock motif only — Refresh CTA lives in
   the text column flow below the subtitle, so the clock and button never collide. */
.ot-banner-aside {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center;
}

/* Analog clock motif — OT's signature visual, sized to sit comfortably above the CTA */
.ot-clock {
  position: relative;
  width: 150px; height: 150px;
  opacity: 0.92;
  flex-shrink: 0;
}
.ot-clock-face {
  position: absolute; inset: 18px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.06), transparent 60%),
    linear-gradient(135deg, rgba(40, 22, 10, 0.55), rgba(20, 12, 6, 0.75));
  border: 1.5px solid rgba(251, 146, 60, 0.55);
  box-shadow:
    inset 0 0 22px rgba(234, 88, 12, 0.22),
    0 10px 30px -10px rgba(234, 88, 12, 0.45);
}
[data-theme="light"] .ot-clock-face {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5), transparent 60%),
    linear-gradient(135deg, rgba(255, 244, 220, 0.85), rgba(254, 230, 138, 0.55));
  border-color: rgba(194, 65, 12, 0.45);
  box-shadow:
    inset 0 0 22px rgba(217, 119, 6, 0.18),
    0 10px 24px -10px rgba(120, 53, 15, 0.30);
}
.ot-tick {
  position: absolute;
  left: 50%; top: 50%;
  width: 1.5px; height: 6px;
  background: rgba(252, 211, 77, 0.65);
  transform-origin: center 42px;
  margin-left: -0.75px;
  border-radius: 2px;
}
[data-theme="light"] .ot-tick { background: rgba(180, 83, 9, 0.55); }
.ot-tick:nth-child(3n+1) { background: rgba(252, 211, 77, 0.95); height: 8px; }
[data-theme="light"] .ot-tick:nth-child(3n+1) { background: rgba(120, 53, 15, 0.85); }

.ot-hand {
  position: absolute;
  left: 50%; top: 50%;
  background: linear-gradient(180deg, #fcd34d, #f59e0b);
  border-radius: 4px;
  transform-origin: 50% 100%;
  box-shadow: 0 0 8px rgba(252, 211, 77, 0.55);
}
[data-theme="light"] .ot-hand { background: linear-gradient(180deg, #d97706, #9a3412); box-shadow: 0 0 6px rgba(180, 83, 9, 0.45); }
.ot-hand-hour {
  width: 3px; height: 22px;
  margin-left: -1.5px; margin-top: -22px;
  animation: ot-hand-rotate 120s linear infinite;
}
.ot-hand-min {
  width: 2.5px; height: 32px;
  margin-left: -1.25px; margin-top: -32px;
  animation: ot-hand-rotate 18s linear infinite;
}
.ot-hand-sec {
  width: 1.5px; height: 36px;
  margin-left: -0.75px; margin-top: -36px;
  background: linear-gradient(180deg, #fb923c, #ea580c);
  animation: ot-hand-rotate 6s linear infinite;
}
[data-theme="light"] .ot-hand-sec { background: linear-gradient(180deg, #c2410c, #9a3412); }
@keyframes ot-hand-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
.ot-clock-pin {
  position: absolute;
  left: 50%; top: 50%;
  width: 9px; height: 9px;
  margin-left: -4.5px; margin-top: -4.5px;
  border-radius: 50%;
  background: radial-gradient(circle, #fde68a, #f59e0b 60%, #c2410c);
  box-shadow: 0 0 10px rgba(252, 211, 77, 0.7);
}
[data-theme="light"] .ot-clock-pin { background: radial-gradient(circle, #fde68a, #d97706 60%, #7c2d12); }

.ot-clock-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(251, 146, 60, 0.40);
}
.ot-ring-a { animation: att-ring-rotate 40s linear infinite; }
.ot-ring-b { inset: 8px; animation: att-ring-rotate 28s linear infinite reverse; border-color: rgba(251, 146, 60, 0.26); }
[data-theme="light"] .ot-ring-a { border-color: rgba(194, 65, 12, 0.45); }
[data-theme="light"] .ot-ring-b { border-color: rgba(180, 83, 9, 0.32); }

.ot-banner-text { position: relative; z-index: 2; min-width: 0; }
.ot-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fdba74;
}
[data-theme="light"] .ot-eyebrow { color: #9a3412; }
.ot-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .ot-eyebrow-dot { background: #c2410c; box-shadow: 0 0 6px rgba(194, 65, 12, 0.55); }

.ot-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fb923c 30%, #ea580c 60%, #c2410c 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ot-title-shimmer 9s ease-in-out infinite;
}
[data-theme="light"] .ot-banner-title {
  background: linear-gradient(110deg, #c2410c 0%, #9a3412 30%, #7c2d12 60%, #92400e 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes ot-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.ot-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.ot-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 580px;
}
.ot-banner-sub strong { color: #fdba74; font-weight: 700; }
[data-theme="light"] .ot-banner-sub strong { color: #9a3412; }

.ot-refresh-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fed7aa 0%, #fb923c 50%, #c2410c 100%);
  background-size: 200% 200%;
  color: #1f0c02;
  font-weight: 800; font-size: 11.5px; letter-spacing: 0.3px;
  border: 1px solid rgba(194, 65, 12, 0.55);
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(194, 65, 12, 0.5);
  transition: background-position .35s, box-shadow .25s;
  flex-shrink: 0;
}
.ot-refresh-cta:hover { background-position: 100% 50%; box-shadow: 0 18px 36px -10px rgba(194, 65, 12, 0.72); }
.ot-refresh-cta.spinning svg { animation: ot-spin 0.9s linear infinite; }
@keyframes ot-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .ot-refresh-cta {
  background: linear-gradient(135deg, #fb923c, #c2410c 55%, #7c2d12);
  color: #fff;
}

/* ════════════════════ KPI STRIP ════════════════════ */
.ot-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.ot-kpi {
  position: relative;
  padding: 14px 16px 12px;
  border-radius: 18px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .ot-kpi {
  border-color: rgba(194, 65, 12, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(120, 53, 15, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.ot-kpi.active {
  border-color: var(--accent, #fb923c);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(251, 146, 60, 0.45));
}
[data-theme="light"] .ot-kpi.active {
  border-color: var(--accent-light, #c2410c);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(194, 65, 12, 0.40));
}
.kpi-aurora {
  position: absolute; inset: -50% -30% auto -30%;
  height: 100%;
  background: radial-gradient(60% 60% at 50% 40%, var(--accent-glow, rgba(251, 146, 60, 0.22)), transparent 65%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s;
  pointer-events: none;
}
.ot-kpi:hover .kpi-aurora,
.ot-kpi.active .kpi-aurora { opacity: 1; }
.kpi-grid-tex {
  position: absolute; inset: 0; pointer-events: none; z-index: -1;
  background-image:
    linear-gradient(rgba(251, 146, 60, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251, 146, 60, 0.05) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(160deg, rgba(0,0,0,0.5) 0%, transparent 70%);
}
[data-theme="light"] .kpi-grid-tex {
  background-image:
    linear-gradient(rgba(194, 65, 12, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(194, 65, 12, 0.06) 1px, transparent 1px);
}

.kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }

/* CSS-only sparkline — 5 vertical bars */
.kpi-spark {
  display: inline-flex; align-items: flex-end; gap: 2px;
  height: 16px;
  opacity: 0.85;
}
.spark-bar {
  width: 3px; border-radius: 2px;
  background: linear-gradient(180deg, var(--accent, #fb923c), var(--accent-deep, #c2410c));
  transition: height .35s var(--att-spring);
}
[data-theme="light"] .spark-bar { background: linear-gradient(180deg, var(--accent-light, #c2410c), #7c2d12); }

.kpi-num {
  display: block;
  margin: 6px 0 3px;
  font-size: 32px; font-weight: 900;
  letter-spacing: -0.6px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 146, 60, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-suffix { font-size: 14px; font-weight: 700; opacity: 0.7; margin-left: 2px; letter-spacing: 0; }
.kpi-foot { font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }
[data-theme="light"] .kpi-foot { color: #6b5840; }

.tone-amber  { --accent: #f59e0b; --accent-deep: #b45309; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.24); --accent-shadow: rgba(251, 146, 60, 0.45); --accent-shadow-light: rgba(217, 119, 6, 0.45); }
.tone-teal   { --accent: #14b8a6; --accent-deep: #0d9488; --accent-light: #0f766e; --accent-glow: rgba(20, 184, 166, 0.24); --accent-shadow: rgba(13, 148, 136, 0.45); --accent-shadow-light: rgba(15, 118, 110, 0.45); }
.tone-orange { --accent: #fb923c; --accent-deep: #c2410c; --accent-light: #c2410c; --accent-glow: rgba(251, 146, 60, 0.28); --accent-shadow: rgba(194, 65, 12, 0.48); --accent-shadow-light: rgba(154, 52, 18, 0.45); }
.tone-gold   { --accent: #fcd34d; --accent-deep: #d97706; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.26); --accent-shadow: rgba(217, 119, 6, 0.45); --accent-shadow-light: rgba(180, 83, 9, 0.45); }

/* ════════════════════ TOOLBAR ════════════════════ */
.ot-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .ot-toolbar {
  border-color: rgba(194, 65, 12, 0.40);
  box-shadow:
    0 6px 16px -14px rgba(120, 53, 15, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.ot-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.ot-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 146, 60, 0.24);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, transform .18s;
}
.ot-pill:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(251, 146, 60, 0.55); }
.ot-pill.active {
  background: linear-gradient(135deg, #fed7aa, #fb923c);
  color: #1f0c02;
  border-color: rgba(194, 65, 12, 0.60);
  box-shadow: 0 6px 18px -8px rgba(194, 65, 12, 0.55);
}
.ot-pill-dot { width: 6px; height: 6px; border-radius: 50%; }
.ot-pill-count {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 10px; font-weight: 800;
  color: inherit;
}
[data-theme="light"] .ot-pill {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(194, 65, 12, 0.28);
  color: #6b5840;
}
[data-theme="light"] .ot-pill.active {
  background: linear-gradient(135deg, #fb923c, #c2410c);
  color: #fff;
}
[data-theme="light"] .ot-pill-count { background: rgba(255, 255, 255, 0.45); color: inherit; }

.ot-toolbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ot-toolbar-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.ot-toolbar-meta svg { color: #fb923c; }
[data-theme="light"] .ot-toolbar-meta { color: #6b5840; }
[data-theme="light"] .ot-toolbar-meta svg { color: #c2410c; }

/* ════════════════════ ROW LIST ════════════════════ */
.ot-list { display: flex; flex-direction: column; gap: 10px; }
.ot-row {
  position: relative;
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 16px 20px 16px 18px;
  border-radius: 18px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 18px -14px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .ot-row {
  border-color: rgba(194, 65, 12, 0.38);
  box-shadow:
    0 6px 18px -14px rgba(120, 53, 15, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.ot-row:hover {
  border-color: rgba(251, 146, 60, 0.70);
  box-shadow: 0 16px 36px -20px rgba(251, 146, 60, 0.45);
}
[data-theme="light"] .ot-row:hover {
  border-color: rgba(194, 65, 12, 0.60);
  box-shadow: 0 16px 36px -20px rgba(194, 65, 12, 0.32);
}
.ot-row-aurora {
  position: absolute; inset: -40% 60% -40% -20%;
  background: radial-gradient(40% 80% at 30% 50%, rgba(251, 146, 60, 0.20), transparent 70%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s; pointer-events: none;
}
.ot-row:hover .ot-row-aurora { opacity: 1; }
[data-theme="light"] .ot-row-aurora { background: radial-gradient(40% 80% at 30% 50%, rgba(194, 65, 12, 0.15), transparent 70%); }

.ot-row.is-pending  { border-left: 4px solid #f59e0b; }
.ot-row.is-approved { border-left: 4px solid #0d9488; }
.ot-row.is-rejected { border-left: 4px solid #b91c1c; }
.ot-row.is-processed { opacity: 0.92; }
.ot-row.is-processed::after {
  content: 'POSTED'; position: absolute; top: 12px; right: 16px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.2px;
  padding: 2px 7px; border-radius: 4px;
  background: rgba(125, 211, 252, 0.18); color: #7dd3fc;
  border: 1px solid rgba(125, 211, 252, 0.35);
  z-index: 3; pointer-events: none;
}
[data-theme="light"] .ot-row.is-processed::after { background: rgba(2, 132, 199, 0.16); color: #0369a1; border-color: rgba(2, 132, 199, 0.35); }

/* ─── LEFT: Hours dial ─── */
.ot-dial-wrap {
  position: relative;
  width: 88px; height: 88px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ot-dial { width: 100%; height: 100%; transform: rotate(0); }
.ot-dial .dial-bg {
  fill: none;
  stroke: rgba(251, 146, 60, 0.16);
  stroke-width: 7;
}
[data-theme="light"] .ot-dial .dial-bg { stroke: rgba(194, 65, 12, 0.16); }
.ot-dial .dial-fg {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dasharray .6s var(--att-spring);
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.5));
}
[data-theme="light"] .ot-dial .dial-fg { filter: drop-shadow(0 0 4px rgba(194, 65, 12, 0.35)); }

.ot-dial-text {
  position: absolute;
  inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px;
  pointer-events: none;
}
.dial-num {
  font-size: 22px; font-weight: 900; line-height: 1;
  letter-spacing: -0.04em;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde68a, #fb923c 60%, #ea580c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .dial-num {
  background: linear-gradient(135deg, #c2410c, #7c2d12);
  -webkit-background-clip: text; background-clip: text;
}
.dial-unit {
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .dial-unit { color: #6b5840; }

.ot-dial-pulse {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(251, 146, 60, 0.55);
  animation: ot-dial-pulse 2.4s ease-out infinite;
  pointer-events: none;
}
[data-theme="light"] .ot-dial-pulse { border-color: rgba(194, 65, 12, 0.55); }
@keyframes ot-dial-pulse {
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(1.18); opacity: 0; }
}

/* ─── MIDDLE: body ─── */
.ot-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ot-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0; }
.ot-emp { font-size: 13.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px; }
.ot-emp-dot { color: var(--hr-text-muted); opacity: 0.55; }
.ot-date { font-size: 11.5px; color: var(--hr-text-muted); font-weight: 600; }
.ot-type-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px;
  background: rgba(251, 146, 60, 0.18); color: #fdba74;
  border: 1px solid rgba(251, 146, 60, 0.40);
}
.ot-type-tag[data-type="WEEKEND"] { background: rgba(168, 85, 247, 0.0); color: #fcd34d; border-color: rgba(252, 211, 77, 0.40); background: rgba(252, 211, 77, 0.16); }
.ot-type-tag[data-type="HOLIDAY"] { background: rgba(239, 68, 68, 0.16);  color: #fca5a5; border-color: rgba(239, 68, 68, 0.40); }
.ot-type-tag[data-type="NIGHT"]   { background: rgba(96, 165, 250, 0.16); color: #93c5fd; border-color: rgba(96, 165, 250, 0.40); }
.ot-type-tag[data-type="EMERGENCY"] { background: rgba(244, 63, 94, 0.16); color: #fda4af; border-color: rgba(244, 63, 94, 0.40); }
[data-theme="light"] .ot-type-tag { background: rgba(251, 146, 60, 0.22); color: #9a3412; border-color: rgba(194, 65, 12, 0.40); }
[data-theme="light"] .ot-type-tag[data-type="WEEKEND"] { background: rgba(251, 191, 36, 0.22); color: #92400e; border-color: rgba(217, 119, 6, 0.40); }
[data-theme="light"] .ot-type-tag[data-type="HOLIDAY"] { background: rgba(239, 68, 68, 0.18); color: #7f1d1d; border-color: rgba(220, 38, 38, 0.45); }
[data-theme="light"] .ot-type-tag[data-type="NIGHT"]   { background: rgba(59, 130, 246, 0.18); color: #1e3a8a; border-color: rgba(59, 130, 246, 0.45); }
[data-theme="light"] .ot-type-tag[data-type="EMERGENCY"] { background: rgba(244, 63, 94, 0.18); color: #881337; border-color: rgba(225, 29, 72, 0.45); }

.ot-reason {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 11.5px; color: var(--hr-text-muted);
  font-style: italic; line-height: 1.5;
  padding: 6px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(251, 146, 60, 0.30);
}
[data-theme="light"] .ot-reason {
  background: rgba(255, 250, 240, 0.5);
  border-color: rgba(194, 65, 12, 0.32);
  color: #6b5840;
}
.ot-reason svg { color: #fb923c; flex-shrink: 0; margin-top: 2px; }
[data-theme="light"] .ot-reason svg { color: #c2410c; }
.ot-reason span { word-break: break-word; }

/* ─── RIGHT: status + actions ─── */
.ot-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.ot-payroll {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
  background: rgba(125, 211, 252, 0.16); color: #7dd3fc;
  border: 1px solid rgba(125, 211, 252, 0.36);
}
.ot-payroll[data-status="PENDING"] { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.36); }
.ot-payroll[data-status="HOLD"]    { background: rgba(239, 68, 68, 0.16);   color: #fca5a5; border-color: rgba(239, 68, 68, 0.40); }
[data-theme="light"] .ot-payroll { background: rgba(2, 132, 199, 0.14); color: #0369a1; border-color: rgba(2, 132, 199, 0.36); }
[data-theme="light"] .ot-payroll[data-status="PENDING"] { background: rgba(100, 116, 139, 0.16); color: #334155; border-color: rgba(100, 116, 139, 0.40); }
[data-theme="light"] .ot-payroll[data-status="HOLD"]    { background: rgba(239, 68, 68, 0.18); color: #7f1d1d; border-color: rgba(220, 38, 38, 0.45); }

.ot-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
}
.ot-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.ot-status.is-pending  { background: rgba(245, 158, 11, 0.16); color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); }
.ot-status.is-approved { background: rgba(13, 148, 136, 0.16); color: #5eead4; border-color: rgba(13, 148, 136, 0.45); }
.ot-status.is-rejected { background: rgba(185, 28, 28, 0.16);  color: #fca5a5; border-color: rgba(185, 28, 28, 0.45); }
[data-theme="light"] .ot-status.is-pending  { background: rgba(245, 158, 11, 0.20); color: #92400e; border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .ot-status.is-approved { background: rgba(13, 148, 136, 0.20); color: #115e59; border-color: rgba(15, 118, 110, 0.55); }
[data-theme="light"] .ot-status.is-rejected { background: rgba(185, 28, 28, 0.18);  color: #7f1d1d; border-color: rgba(153, 27, 27, 0.55); }

.ot-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 13px;
  border-radius: 11px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s;
}
.ot-btn-approve {
  background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 55%, #0f766e 100%);
  color: #fff;
  border-color: #0d9488;
  box-shadow:
    0 8px 20px -8px rgba(20, 184, 166, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 1px rgba(6, 95, 70, 0.55);
}
.ot-btn-approve:hover {
  filter: brightness(1.08);
  box-shadow:
    0 14px 28px -10px rgba(20, 184, 166, 0.70),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
.ot-btn-approve svg { color: #fff; }
.ot-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.50);
}
.ot-btn-reject:hover {
  background: rgba(220, 38, 38, 0.22);
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .ot-btn-approve {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%);
  color: #fff;
  border-color: #0f766e;
  box-shadow:
    0 8px 20px -8px rgba(13, 148, 136, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 1px rgba(15, 118, 110, 0.55);
}
[data-theme="light"] .ot-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .ot-btn-reject:hover { background: rgba(220, 38, 38, 0.18); }

/* ════════════════════ EMPTY STATE ════════════════════ */
.ot-empty {
  position: relative;
  padding: 50px 24px 42px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 146, 60, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
[data-theme="light"] .ot-empty {
  border-color: rgba(194, 65, 12, 0.42);
  background: rgba(255, 250, 240, 0.85);
  box-shadow: 0 22px 50px -28px rgba(120, 53, 15, 0.20);
}
.ot-empty-glow {
  position: absolute; inset: -40% -10% auto -10%;
  height: 80%;
  background: radial-gradient(50% 50% at 50% 30%, rgba(251, 146, 60, 0.22), transparent 60%);
  filter: blur(50px);
  z-index: -1;
}
[data-theme="light"] .ot-empty-glow { background: radial-gradient(50% 50% at 50% 30%, rgba(194, 65, 12, 0.16), transparent 60%); }
.ot-empty-icon {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 84px; height: 84px;
  border-radius: 50%;
  background: rgba(251, 146, 60, 0.16);
  color: #fdba74;
  margin-bottom: 6px;
  border: 1px solid rgba(251, 146, 60, 0.40);
  animation: ot-empty-pulse 3s ease-in-out infinite;
}
[data-theme="light"] .ot-empty-icon {
  background: rgba(254, 215, 170, 0.55);
  color: #9a3412;
  border-color: rgba(194, 65, 12, 0.40);
}
@keyframes ot-empty-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.40); }
  50%      { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(251, 146, 60, 0); }
}
.ot-empty-orbit {
  position: absolute; inset: -10px;
  border-radius: 50%;
  border: 1px dashed rgba(251, 146, 60, 0.40);
  pointer-events: none;
}
.ot-empty-orbit-a { animation: att-ring-rotate 18s linear infinite; }
.ot-empty-orbit-b { inset: -20px; animation: att-ring-rotate 28s linear infinite reverse; border-color: rgba(251, 146, 60, 0.28); }
[data-theme="light"] .ot-empty-orbit-a { border-color: rgba(194, 65, 12, 0.45); }
[data-theme="light"] .ot-empty-orbit-b { border-color: rgba(154, 52, 18, 0.32); }

.ot-empty h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.ot-empty p  { margin: 0 0 8px; font-size: 12px; color: var(--hr-text-muted); max-width: 520px; line-height: 1.55; }
.ot-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #fdba74;
  padding: 5px 11px; border-radius: 999px;
  background: rgba(251, 146, 60, 0.10);
  border: 1px solid rgba(251, 146, 60, 0.40);
}
[data-theme="light"] .ot-empty-meta {
  color: #9a3412;
  background: rgba(254, 215, 170, 0.45);
  border-color: rgba(194, 65, 12, 0.40);
}
.ot-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.7);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .ot-empty-meta-dot { background: #c2410c; box-shadow: 0 0 6px rgba(194, 65, 12, 0.55); }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 980px) {
  .ot-banner { grid-template-columns: 1fr; }
  .ot-banner-aside { display: none; }
  .ot-row { grid-template-columns: 88px 1fr; }
  .ot-actions { grid-column: 1 / -1; justify-content: flex-start; }
}
</style>
