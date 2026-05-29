<template>
  <section class="att-wfh" data-anim="att-wfh">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="wfh-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="wfh-banner-glow" />

      <!-- Orbiting WFH iconography on the right -->
      <span class="wfh-orbit" aria-hidden="true">
        <span class="wfh-orbit-ring wfh-ring-a"></span>
        <span class="wfh-orbit-ring wfh-ring-b"></span>
        <span class="wfh-orbit-ring wfh-ring-c"></span>
        <span class="wfh-orbit-pill wfh-pill-house">
          <Home :size="13" />
        </span>
        <span class="wfh-orbit-pill wfh-pill-cloud">
          <Cloud :size="13" />
        </span>
        <span class="wfh-orbit-pill wfh-pill-laptop">
          <Laptop :size="13" />
        </span>
        <span class="wfh-orbit-pill wfh-pill-wifi">
          <Wifi :size="13" />
        </span>
      </span>

      <div class="wfh-banner-text">
        <span class="wfh-eyebrow">
          <span class="wfh-eyebrow-dot" />Off-site approvals · Geo waivers · Forward-looking
        </span>
        <h2 class="wfh-banner-title">
          <span>Work from</span>
          <span class="wfh-banner-divider">·</span>
          <span>Home</span>
        </h2>
        <p class="wfh-banner-sub">
          Forward-looking WFH and remote authorisations. Approving applies <strong>status=WFH</strong>
          for the day so geo-fence checks are <em>automatically waived</em>.
        </p>
      </div>

    </Motion>

    <!-- ═══════════════════ KPI STRIP ═══════════════════ -->
    <div class="wfh-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['wfh-kpi', `tone-${t.tone}`, { active: filter === t.filter }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.1, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="setFilter(t.filter)"
      >
        <span class="kpi-aurora" aria-hidden="true" />
        <span class="kpi-eyebrow">
          <component :is="t.icon" :size="11" />
          <span>{{ t.label }}</span>
        </span>
        <Motion as="span" class="kpi-num"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.18 + 0.06 * i }"
        >{{ t.value }}</Motion>
        <span class="kpi-foot">{{ t.foot }}</span>
      </Motion>
    </div>

    <!-- ═══════════════════ FILTER + REFRESH BAR ═══════════════════ -->
    <Motion as="div" class="wfh-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.32 }"
    >
      <div class="wfh-pills">
        <button v-for="f in FILTERS" :key="f.key"
          :class="['wfh-pill', { active: filter === f.key }]"
          @click="setFilter(f.key)">
          <span class="wfh-pill-dot" :style="{ background: f.dot }" />{{ f.label }}<span class="wfh-pill-count">{{ counts[f.key] }}</span>
        </button>
      </div>
      <div class="wfh-toolbar-right">
        <span class="wfh-toolbar-meta">
          <Sparkles :size="11" /> Showing {{ rows.length }} {{ rows.length === 1 ? 'request' : 'requests' }}
        </span>
        <Motion as="button" class="wfh-refresh-cta"
          :class="{ spinning: loading }"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="reload"
        >
          <RefreshCw :size="13" />Refresh
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ REJECT MODAL ═══════════════════ -->
    <AttDeleteModal
      :open="!!rejectTarget"
      title="Reject WFH request?"
      subtitle="The employee will be notified with the reason below so they can re-submit if needed."
      :target-label="rejectTarget?.employee_name || ''"
      :target-meta="rejectTarget ? `${formatDate(rejectTarget.wfh_date)} · ${rejectTarget.request_type}` : ''"
      :target-tag="rejectTarget?.status || ''"
      :target-icon="Home"
      :presets="[
        'Insufficient justification',
        'Date/time outside policy',
        'Missing supporting evidence',
        'Already on approved leave',
      ]"
      reason-placeholder="Explain why this WFH request is being rejected — be specific so the employee can adjust and resubmit…"
      confirm-label="Reject request"
      submitting-label="Rejecting…"
      warning="The employee sees this exact note. Rejection is logged to the audit trail."
      :submitting="rejecting"
      @close="rejectTarget = null"
      @confirm="confirmReject"
    />

    <!-- ═══════════════════ ROW LIST ═══════════════════ -->
    <div class="wfh-list" v-if="rows.length">
      <Motion v-for="(r, i) in rows" :key="r.id" as="article"
        :class="['wfh-row', `is-${r.status.toLowerCase()}`]"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -2 }"
      >
        <span class="wfh-row-aurora" aria-hidden="true" />

        <!-- LEFT: date stack + icon -->
        <div class="wfh-when">
          <div class="wfh-icon-wrap">
            <span class="wfh-icon-glow" aria-hidden="true" />
            <Home :size="18" />
          </div>
          <div class="wfh-date-stack">
            <span class="wfh-day">{{ formatDay(r.wfh_date) }}</span>
            <span class="wfh-mon">{{ formatMonth(r.wfh_date) }}</span>
            <span class="wfh-yr">{{ formatYear(r.wfh_date) }}</span>
          </div>
          <div v-if="r.wfh_date_until && r.wfh_date_until !== r.wfh_date" class="wfh-range">
            <ArrowRight :size="11" />
            <div class="wfh-range-stack">
              <span class="wfh-day">{{ formatDay(r.wfh_date_until) }}</span>
              <span class="wfh-mon">{{ formatMonth(r.wfh_date_until) }}</span>
            </div>
          </div>
        </div>

        <!-- MIDDLE: employee + reason -->
        <div class="wfh-body">
          <div class="wfh-emp">
            <span class="wfh-emp-name">{{ r.employee_name || 'Unknown' }}</span>
            <span class="wfh-emp-dot">·</span>
            <span class="wfh-type-tag" :data-type="r.request_type">
              <component :is="typeIcon(r.request_type)" :size="10" />
              {{ r.request_type }}
            </span>
          </div>
          <div class="wfh-reason">
            <Quote :size="11" />
            <span>{{ r.reason || 'No reason provided' }}</span>
          </div>
        </div>

        <!-- RIGHT: status + actions -->
        <div class="wfh-actions">
          <span :class="['wfh-status', `is-${r.status.toLowerCase()}`]">
            <span class="wfh-status-dot" />{{ r.status }}
          </span>
          <template v-if="r.status === 'PENDING'">
            <Motion as="button" class="wfh-btn wfh-btn-reject"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="openReject(r)">
              <XCircle :size="13" />Reject
            </Motion>
            <Motion as="button" class="wfh-btn wfh-btn-approve"
              :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.95 }"
              @click="approveRow(r)">
              <CheckCircle2 :size="13" />Approve
            </Motion>
          </template>
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="wfh-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.42 }"
    >
      <div class="wfh-empty-glow"></div>
      <div class="wfh-empty-icon">
        <span class="wfh-empty-orbit wfh-empty-orbit-a"></span>
        <span class="wfh-empty-orbit wfh-empty-orbit-b"></span>
        <Home :size="32" />
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <span class="wfh-empty-meta">
        <span class="wfh-empty-meta-dot" />Live · check back when employees submit
      </span>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Home, CheckCircle2, XCircle, Quote, Cloud, Laptop, Wifi,
  ArrowRight, Sparkles, Hourglass, Briefcase, Coffee,
} from 'lucide-vue-next'
import { fetchWfhRequests, decideWfh } from '../composables/useAttendance'
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

const TYPE_ICON_MAP = {
  WFH:    Home,
  REMOTE: Cloud,
  HYBRID: Laptop,
  OD:     Briefcase,
  LEAVE:  Coffee,
}
const typeIcon = (t) => TYPE_ICON_MAP[t] || Home

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

const thisWeekCount = computed(() => {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return allRows.value.filter(r => {
    if (!r.wfh_date) return false
    const d = new Date(r.wfh_date)
    return d >= monday && d <= sunday && r.status === 'APPROVED'
  }).length
})

const kpiTiles = computed(() => [
  { key: 'pending',  filter: 'PENDING',  label: 'AWAITING REVIEW', icon: Hourglass,    tone: 'amber',
    value: counts.value.PENDING,  foot: counts.value.PENDING > 0 ? 'needs your decision' : 'all caught up' },
  { key: 'approved', filter: 'APPROVED', label: 'APPROVED',        icon: CheckCircle2, tone: 'teal',
    value: counts.value.APPROVED, foot: counts.value.APPROVED === 1 ? '1 employee remote' : `${counts.value.APPROVED} employees remote` },
  { key: 'week',     filter: 'APPROVED', label: 'THIS WEEK',       icon: Sparkles,     tone: 'gold',
    value: thisWeekCount.value,   foot: 'Mon → Sun · approved' },
  { key: 'rejected', filter: 'REJECTED', label: 'REJECTED',        icon: XCircle,      tone: 'red',
    value: counts.value.REJECTED, foot: 'audit trail kept' },
])

const emptyTitle = computed(() => {
  if (filter.value === 'PENDING')  return 'All clear · no pending WFH requests'
  if (filter.value === 'APPROVED') return 'No approved WFH days yet'
  if (filter.value === 'REJECTED') return 'No rejections in this view'
  return 'No WFH requests yet'
})
const emptySub = computed(() => {
  if (filter.value === 'PENDING')  return 'Forward-looking remote authorisations will land here for approval. Approving applies status=WFH for the day so geo checks are waived.'
  if (filter.value === 'APPROVED') return 'Approved WFH rows mark the date as WFH in the daily roster — geo-fence checks are bypassed for those employees.'
  if (filter.value === 'REJECTED') return 'Rejections stay on file for the audit trail. The employee sees your decision note.'
  return 'Once employees start submitting WFH requests, they appear here.'
})

const setFilter = async (k) => {
  filter.value = k
  applyFilter()
}

const applyFilter = () => {
  if (!filter.value) {
    rows.value = allRows.value
  } else {
    rows.value = allRows.value.filter(r => r.status === filter.value)
  }
}

const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    // Load EVERYTHING so the KPI counts reflect the whole queue, then filter
    // client-side. The WFH endpoint returns both WFH and REMOTE — Remote tab
    // owns REMOTE rows so we exclude them here.
    const data = await fetchWfhRequests({})
    allRows.value = (data.items || []).filter(r => r.request_type !== 'REMOTE')
    applyFilter()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load WFH requests')
  } finally {
    loading.value = false
  }
}
onMounted(reload)

const rejectTarget = ref(null)
const rejecting = ref(false)
const openReject = (r) => { rejectTarget.value = r }

const confirmReject = async (reason) => {
  if (!rejectTarget.value) return
  rejecting.value = true
  try {
    await decideWfh(rejectTarget.value.id, 'REJECTED', reason || '')
    toast.success('WFH request rejected')
    const id = rejectTarget.value.id
    allRows.value = allRows.value.map(x => x.id === id ? { ...x, status: 'REJECTED' } : x)
    applyFilter()
    rejectTarget.value = null
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not reject WFH request')
  } finally { rejecting.value = false }
}

const approveRow = async (r) => {
  try {
    await decideWfh(r.id, 'APPROVED', '')
    toast.success('WFH approved · geo checks waived for the date')
    allRows.value = allRows.value.map(x => x.id === r.id ? { ...x, status: 'APPROVED' } : x)
    applyFilter()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not approve WFH request')
  }
}

// ── Formatters ─────────────────────────────────────────────────────────
const formatDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
  : '—'
const formatDay = (iso) => iso ? String(new Date(iso).getDate()).padStart(2, '0') : '--'
const formatMonth = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { month: 'short' }).toUpperCase() : '--'
const formatYear = (iso) => iso ? new Date(iso).getFullYear() : ''
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-wfh { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ════════════════════ HERO ════════════════════ */
.wfh-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 191, 36, 0.16), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(251, 191, 36, 0.14), transparent 70%),
    var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: block;
  isolation: isolate;
}
[data-theme="light"] .wfh-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(217, 119, 6, 0.14), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(217, 119, 6, 0.14), transparent 70%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(217, 119, 6, 0.42);
  box-shadow:
    0 22px 50px -28px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.wfh-banner-glow {
  position: absolute; inset: -50% -10% auto -10%;
  height: 140%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.22), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Orbiting WFH iconography */
.wfh-orbit {
  position: absolute;
  top: -28px; right: -28px;
  width: 260px; height: 260px;
  z-index: 1; pointer-events: none;
  opacity: 0.75;
}
.wfh-orbit-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.38);
}
.wfh-ring-a { animation: att-ring-rotate 60s linear infinite; }
.wfh-ring-b { inset: 14%; animation: att-ring-rotate 42s linear infinite reverse; border-color: rgba(251, 191, 36, 0.30); }
.wfh-ring-c { inset: 28%; animation: att-ring-rotate 32s linear infinite; border-color: rgba(251, 191, 36, 0.22); }
[data-theme="light"] .wfh-ring-a { border-color: rgba(217, 119, 6, 0.42); }
[data-theme="light"] .wfh-ring-b { border-color: rgba(180, 83, 9, 0.36); }
[data-theme="light"] .wfh-ring-c { border-color: rgba(217, 119, 6, 0.28); }

.wfh-orbit-pill {
  position: absolute;
  width: 30px; height: 30px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 8px 16px -6px rgba(0, 0, 0, 0.45);
}
.wfh-pill-house {
  top: 6px; left: 50%; margin-left: -15px;
  background: linear-gradient(135deg, #fcd34d, #d97706);
  animation: wfh-pill-orbit-a 18s linear infinite;
}
.wfh-pill-cloud {
  top: 50%; right: 6px; margin-top: -15px;
  background: linear-gradient(135deg, #fcd34d, #f59e0b);
  animation: wfh-pill-orbit-b 22s linear infinite;
}
.wfh-pill-laptop {
  bottom: 6px; left: 50%; margin-left: -15px;
  background: linear-gradient(135deg, #2dd4bf, #0d9488);
  animation: wfh-pill-orbit-c 26s linear infinite;
}
.wfh-pill-wifi {
  top: 50%; left: 6px; margin-top: -15px;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  animation: wfh-pill-orbit-d 20s linear infinite;
}
@keyframes wfh-pill-orbit-a {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(18px, 6px); }
  50%  { transform: translate(0, 14px); }
  75%  { transform: translate(-18px, 6px); }
  100% { transform: translate(0, 0); }
}
@keyframes wfh-pill-orbit-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-10px, 8px) scale(1.08); }
}
@keyframes wfh-pill-orbit-c {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(0, -8px) rotate(6deg); }
}
@keyframes wfh-pill-orbit-d {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
  50%      { transform: translate(8px, -4px) scale(1.06); opacity: 1; }
}

.wfh-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 240px; }
@media (max-width: 980px) {
  .wfh-banner-text { padding-right: 0; }
}
.wfh-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #fcd34d;
}
[data-theme="light"] .wfh-eyebrow { color: #b45309; }
.wfh-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fcd34d;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .wfh-eyebrow-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.6); }

.wfh-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #fde68a 0%, #fbbf24 30%, #fcd34d 60%, #f59e0b 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: wfh-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .wfh-banner-title {
  background: linear-gradient(110deg, #b45309 0%, #d97706 30%, #b45309 60%, #92400e 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes wfh-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.wfh-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.wfh-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 680px;
}
.wfh-banner-sub strong { color: #fcd34d; font-weight: 700; }
.wfh-banner-sub em { color: var(--att-teal-200); font-style: normal; font-weight: 600; }
[data-theme="light"] .wfh-banner-sub strong { color: #b45309; }
[data-theme="light"] .wfh-banner-sub em { color: var(--att-amber-600); }

.wfh-refresh-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 50%, #f59e0b 100%);
  background-size: 200% 200%;
  color: #1f1408;
  font-weight: 800; font-size: 11.5px; letter-spacing: 0.3px;
  border: 1px solid rgba(217, 119, 6, 0.55);
  cursor: pointer;
  box-shadow: 0 8px 20px -10px rgba(217, 119, 6, 0.55);
  transition: background-position .35s, box-shadow .25s;
}
.wfh-refresh-cta:hover { background-position: 100% 50%; box-shadow: 0 14px 28px -10px rgba(217, 119, 6, 0.72); }
.wfh-refresh-cta.spinning svg { animation: wfh-spin 0.9s linear infinite; }
@keyframes wfh-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .wfh-refresh-cta {
  background: linear-gradient(135deg, #fbbf24, #d97706 55%, #92400e);
  color: #fff;
}

/* ════════════════════ KPI STRIP ════════════════════ */
.wfh-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.wfh-kpi {
  position: relative;
  padding: 16px 18px;
  border-radius: 18px;
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
[data-theme="light"] .wfh-kpi {
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.wfh-kpi.active {
  border-color: var(--accent, #fcd34d);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(251, 191, 36, 0.45));
}
[data-theme="light"] .wfh-kpi.active {
  border-color: var(--accent-light, #d97706);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(217, 119, 6, 0.40));
}
.kpi-aurora {
  position: absolute; inset: -50% -30% auto -30%;
  height: 100%;
  background: radial-gradient(60% 60% at 50% 40%, var(--accent-glow, rgba(251, 191, 36, 0.22)), transparent 65%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s;
  pointer-events: none;
}
.wfh-kpi:hover .kpi-aurora,
.wfh-kpi.active .kpi-aurora { opacity: 1; }
.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
}
[data-theme="light"] .kpi-eyebrow { color: #6b5840; }
.kpi-num {
  display: block;
  margin: 8px 0 3px;
  font-size: 30px; font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(251, 191, 36, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

.tone-amber  { --accent: #f59e0b; --accent-light: #b45309; --accent-glow: rgba(251, 191, 36, 0.24); --accent-shadow: rgba(251, 146, 60, 0.45); --accent-shadow-light: rgba(217, 119, 6, 0.45); }
.tone-teal   { --accent: #0d9488; --accent-light: #0f766e; --accent-glow: rgba(20, 184, 166, 0.24); --accent-shadow: rgba(13, 148, 136, 0.45); --accent-shadow-light: rgba(15, 118, 110, 0.45); }
.tone-gold   { --accent: #fcd34d; --accent-light: #d97706; --accent-glow: rgba(251, 191, 36, 0.26); --accent-shadow: rgba(217, 119, 6, 0.45); --accent-shadow-light: rgba(180, 83, 9, 0.45); }
.tone-red    { --accent: #b91c1c; --accent-light: #991b1b; --accent-glow: rgba(185, 28, 28, 0.22); --accent-shadow: rgba(185, 28, 28, 0.45); --accent-shadow-light: rgba(153, 27, 27, 0.45); }

/* ════════════════════ TOOLBAR ════════════════════ */
.wfh-toolbar {
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
[data-theme="light"] .wfh-toolbar {
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow:
    0 6px 16px -14px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.wfh-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.wfh-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, transform .18s;
}
.wfh-pill:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(251, 191, 36, 0.50); }
.wfh-pill.active {
  background: linear-gradient(135deg, #fde68a, #fcd34d);
  color: #1f1408;
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 6px 18px -8px rgba(217, 119, 6, 0.55);
}
.wfh-pill-dot { width: 6px; height: 6px; border-radius: 50%; }
.wfh-pill-count {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 10px; font-weight: 800;
  color: inherit;
}
[data-theme="light"] .wfh-pill {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(217, 119, 6, 0.28);
  color: #6b5840;
}
[data-theme="light"] .wfh-pill.active {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #fff;
}
[data-theme="light"] .wfh-pill-count { background: rgba(255, 255, 255, 0.45); color: inherit; }

.wfh-toolbar-right { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wfh-toolbar-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.wfh-toolbar-meta svg { color: #fcd34d; }
[data-theme="light"] .wfh-toolbar-meta svg { color: #d97706; }

/* ════════════════════ ROW LIST ════════════════════ */
.wfh-list { display: flex; flex-direction: column; gap: 10px; }
.wfh-row {
  position: relative;
  display: grid;
  grid-template-columns: 280px 1fr auto;
  gap: 18px;
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
[data-theme="light"] .wfh-row {
  border-color: rgba(217, 119, 6, 0.38);
  box-shadow:
    0 6px 18px -14px rgba(40, 25, 10, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.wfh-row:hover {
  border-color: rgba(251, 191, 36, 0.70);
  box-shadow: 0 16px 36px -20px rgba(251, 191, 36, 0.45);
}
[data-theme="light"] .wfh-row:hover {
  border-color: rgba(217, 119, 6, 0.60);
  box-shadow: 0 16px 36px -20px rgba(217, 119, 6, 0.32);
}
/* Aurora glow that fades in on hover */
.wfh-row-aurora {
  position: absolute; inset: -40% 60% -40% -20%;
  background: radial-gradient(40% 80% at 30% 50%, rgba(251, 191, 36, 0.18), transparent 70%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s; pointer-events: none;
}
.wfh-row:hover .wfh-row-aurora { opacity: 1; }
[data-theme="light"] .wfh-row-aurora { background: radial-gradient(40% 80% at 30% 50%, rgba(217, 119, 6, 0.15), transparent 70%); }

/* Status accent on the left edge — thicker than the original 3px so it reads
   as part of the chrome, not a hairline. */
.wfh-row.is-pending  { border-left: 4px solid #f59e0b; }
.wfh-row.is-approved { border-left: 4px solid #0d9488; }
.wfh-row.is-rejected { border-left: 4px solid #b91c1c; }
.wfh-row.is-cancelled { border-left: 4px solid #64748b; opacity: 0.78; }

/* Date stack — left of the row */
.wfh-when { display: flex; gap: 12px; align-items: center; }
.wfh-icon-wrap {
  position: relative;
  width: 44px; height: 44px;
  border-radius: 13px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.18));
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.45);
  flex-shrink: 0;
  overflow: hidden;
}
[data-theme="light"] .wfh-icon-wrap {
  background: linear-gradient(135deg, rgba(254, 230, 138, 0.85), rgba(251, 191, 36, 0.50));
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.45);
}
.wfh-icon-glow {
  position: absolute; inset: -25%;
  background: radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.45), transparent 60%);
  filter: blur(8px);
  animation: att-glow-drift 5s ease-in-out infinite;
}
[data-theme="light"] .wfh-icon-glow { background: radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.45), transparent 60%); }

.wfh-date-stack {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  min-width: 56px;
}
.wfh-day { font-size: 26px; font-weight: 900; line-height: 1; color: var(--hr-text); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.wfh-mon { font-size: 9.5px; letter-spacing: 1.5px; font-weight: 800; color: #fcd34d; }
.wfh-yr  { font-size: 9px; color: var(--hr-text-muted); font-weight: 600; }
[data-theme="light"] .wfh-mon { color: #b45309; }

.wfh-range { display: inline-flex; align-items: center; gap: 8px; padding-left: 4px; }
.wfh-range > svg { color: var(--hr-text-muted); flex-shrink: 0; }
.wfh-range-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
.wfh-range-stack .wfh-day { font-size: 20px; }
.wfh-range-stack .wfh-mon { font-size: 9px; }

/* Middle column — body */
.wfh-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.wfh-emp { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0; }
.wfh-emp-name { font-size: 13.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px; }
.wfh-emp-dot { color: var(--hr-text-muted); opacity: 0.55; }
.wfh-type-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px;
}
.wfh-type-tag[data-type="WFH"]    { background: rgba(251, 191, 36, 0.18); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.40); }
.wfh-type-tag[data-type="REMOTE"] { background: rgba(45, 212, 191, 0.18);  color: #5eead4; border: 1px solid rgba(45, 212, 191, 0.40); }
.wfh-type-tag[data-type="HYBRID"] { background: rgba(251, 146, 60, 0.18); color: #fdba74; border: 1px solid rgba(251, 146, 60, 0.40); }
.wfh-type-tag[data-type="OD"]     { background: rgba(245, 158, 11, 0.18);  color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.40); }
.wfh-type-tag[data-type="LEAVE"]  { background: rgba(251, 191, 36, 0.18);  color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.40); }
[data-theme="light"] .wfh-type-tag[data-type="WFH"]    { background: rgba(251, 191, 36, 0.22); color: #92400e; border-color: rgba(217, 119, 6, 0.40); }
[data-theme="light"] .wfh-type-tag[data-type="REMOTE"] { background: rgba(45, 212, 191, 0.22);  color: #115e59; border-color: rgba(13, 148, 136, 0.40); }
[data-theme="light"] .wfh-type-tag[data-type="HYBRID"] { background: rgba(251, 146, 60, 0.22); color: #9a3412; border-color: rgba(194, 65, 12, 0.40); }
[data-theme="light"] .wfh-type-tag[data-type="OD"]     { background: rgba(245, 158, 11, 0.22);  color: #92400e; border-color: rgba(217, 119, 6, 0.40); }
[data-theme="light"] .wfh-type-tag[data-type="LEAVE"]  { background: rgba(251, 191, 36, 0.30);  color: #92400e; border-color: rgba(217, 119, 6, 0.40); }

.wfh-reason {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 11.5px; color: var(--hr-text-muted);
  font-style: italic; line-height: 1.5;
  padding: 6px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(251, 191, 36, 0.28);
}
[data-theme="light"] .wfh-reason {
  background: rgba(255, 250, 240, 0.5);
  border-color: rgba(217, 119, 6, 0.32);
  color: #6b5840;
}
.wfh-reason svg { color: #fcd34d; flex-shrink: 0; margin-top: 2px; }
[data-theme="light"] .wfh-reason svg { color: #b45309; }
.wfh-reason span { word-break: break-word; }

/* Right column — actions */
.wfh-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.wfh-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
}
.wfh-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.wfh-status.is-pending   { background: rgba(245, 158, 11, 0.16); color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); }
.wfh-status.is-approved  { background: rgba(13, 148, 136, 0.16); color: #5eead4; border-color: rgba(13, 148, 136, 0.45); }
.wfh-status.is-rejected  { background: rgba(185, 28, 28, 0.16);  color: #fca5a5; border-color: rgba(185, 28, 28, 0.45); }
.wfh-status.is-cancelled { background: rgba(100, 116, 139, 0.16); color: #cbd5e1; border-color: rgba(100, 116, 139, 0.45); }
[data-theme="light"] .wfh-status.is-pending   { background: rgba(245, 158, 11, 0.20); color: #92400e; border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .wfh-status.is-approved  { background: rgba(13, 148, 136, 0.20); color: #115e59; border-color: rgba(15, 118, 110, 0.55); }
[data-theme="light"] .wfh-status.is-rejected  { background: rgba(185, 28, 28, 0.18);  color: #7f1d1d; border-color: rgba(153, 27, 27, 0.55); }
[data-theme="light"] .wfh-status.is-cancelled { background: rgba(100, 116, 139, 0.20); color: #334155; border-color: rgba(71, 85, 105, 0.55); }

.wfh-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 13px;
  border-radius: 11px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s;
}
.wfh-btn-approve {
  background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 55%, #0f766e 100%);
  color: #ffffff;
  border-color: #0d9488;
  box-shadow:
    0 8px 20px -8px rgba(20, 184, 166, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 1px rgba(6, 95, 70, 0.55);
}
.wfh-btn-approve:hover {
  filter: brightness(1.08);
  box-shadow:
    0 14px 28px -10px rgba(20, 184, 166, 0.70),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
.wfh-btn-approve svg { color: #fff; }
.wfh-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.50);
}
.wfh-btn-reject:hover {
  background: rgba(220, 38, 38, 0.22);
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .wfh-btn-approve {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%);
  color: #ffffff;
  border-color: #0f766e;
  box-shadow:
    0 8px 20px -8px rgba(13, 148, 136, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 1px rgba(15, 118, 110, 0.55);
}
[data-theme="light"] .wfh-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .wfh-btn-reject:hover {
  background: rgba(220, 38, 38, 0.18);
}

/* ════════════════════ EMPTY STATE ════════════════════ */
.wfh-empty {
  position: relative;
  padding: 50px 24px 42px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
[data-theme="light"] .wfh-empty {
  border-color: rgba(217, 119, 6, 0.42);
  background: rgba(255, 250, 240, 0.85);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
.wfh-empty-glow {
  position: absolute; inset: -40% -10% auto -10%;
  height: 80%;
  background: radial-gradient(50% 50% at 50% 30%, rgba(251, 191, 36, 0.20), transparent 60%);
  filter: blur(50px);
  z-index: -1;
}
[data-theme="light"] .wfh-empty-glow { background: radial-gradient(50% 50% at 50% 30%, rgba(217, 119, 6, 0.14), transparent 60%); }
.wfh-empty-icon {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 84px; height: 84px;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.16);
  color: #fcd34d;
  margin-bottom: 6px;
  border: 1px solid rgba(251, 191, 36, 0.40);
  animation: wfh-empty-pulse 3s ease-in-out infinite;
}
[data-theme="light"] .wfh-empty-icon {
  background: rgba(254, 230, 138, 0.55);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.40);
}
@keyframes wfh-empty-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50%      { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(251, 191, 36, 0); }
}
.wfh-empty-orbit {
  position: absolute; inset: -10px;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.40);
  pointer-events: none;
}
.wfh-empty-orbit-a { animation: att-ring-rotate 18s linear infinite; }
.wfh-empty-orbit-b { inset: -20px; animation: att-ring-rotate 28s linear infinite reverse; border-color: rgba(251, 191, 36, 0.30); }
[data-theme="light"] .wfh-empty-orbit-a { border-color: rgba(217, 119, 6, 0.45); }
[data-theme="light"] .wfh-empty-orbit-b { border-color: rgba(180, 83, 9, 0.36); }

.wfh-empty h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.wfh-empty p  { margin: 0 0 8px; font-size: 12px; color: var(--hr-text-muted); max-width: 520px; line-height: 1.55; }
.wfh-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #fcd34d;
  padding: 5px 11px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.40);
}
[data-theme="light"] .wfh-empty-meta {
  color: #b45309;
  background: rgba(254, 230, 138, 0.45);
  border-color: rgba(217, 119, 6, 0.40);
}
.wfh-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fcd34d;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .wfh-empty-meta-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.65); }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 980px) {
  .wfh-orbit { display: none; }
  .wfh-row { grid-template-columns: 1fr; gap: 12px; }
  .wfh-actions { justify-content: flex-start; }
}
</style>
