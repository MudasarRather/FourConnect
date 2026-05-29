<template>
  <section class="att-remote" data-anim="att-remote">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="rmt-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="rmt-banner-glow" />
      <span class="rmt-banner-mesh" aria-hidden="true" />

      <!-- Animated globe with orbiting location pins -->
      <div class="rmt-globe-cluster" aria-hidden="true">
        <span class="rmt-globe">
          <span class="rmt-globe-face">
            <!-- Latitude lines -->
            <span class="lat-line lat-1" />
            <span class="lat-line lat-2" />
            <span class="lat-line lat-3" />
            <span class="lat-line lat-4" />
            <span class="lat-line lat-5" />
            <!-- Longitude lines (rotating) -->
            <span class="long-line long-1" />
            <span class="long-line long-2" />
            <span class="long-line long-3" />
            <span class="long-line long-4" />
          </span>
          <span class="rmt-globe-shine" />
        </span>
        <!-- Orbiting GPS pins -->
        <span class="rmt-pin rmt-pin-a"><MapPin :size="11" /></span>
        <span class="rmt-pin rmt-pin-b"><MapPin :size="11" /></span>
        <span class="rmt-pin rmt-pin-c"><Navigation :size="11" /></span>
        <span class="rmt-pin rmt-pin-d"><Compass :size="11" /></span>
        <!-- Ambient signal rings -->
        <span class="rmt-signal rmt-signal-a" />
        <span class="rmt-signal rmt-signal-b" />
      </div>

      <div class="rmt-banner-text">
        <span class="rmt-eyebrow">
          <span class="rmt-eyebrow-dot" />Off-site approvals · GPS-stamped · Geo-fence waivers
        </span>
        <h2 class="rmt-banner-title">
          <span>Remote</span>
          <span class="rmt-banner-divider">·</span>
          <span>Attendance</span>
        </h2>
        <p class="rmt-banner-sub">
          Approving a remote day lets the employee punch in from any location for that date — the geo-fence
          check is <em>automatically waived</em>. Without approval, punches from outside the fence are
          <strong>blocked</strong> at the API.
        </p>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP — location-focused ═══════════════════ -->
    <div class="rmt-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['rmt-kpi', `tone-${t.tone}`, { active: filter === t.filter }]"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.06 * i + 0.10, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
        @click="t.filter !== null && setFilter(t.filter)"
      >
        <span class="kpi-aurora" aria-hidden="true" />
        <!-- Mini location-pin indicator on the top-right -->
        <span class="kpi-pin" aria-hidden="true">
          <component :is="t.pinIcon" :size="10" />
          <span class="kpi-pin-pulse" />
        </span>
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
        <!-- Dotted progress trail at the bottom -->
        <div class="kpi-trail">
          <span v-for="(d, idx) in 12" :key="idx"
            :class="['kpi-trail-dot', { lit: idx < t.trail }]" />
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ TOOLBAR — pills + refresh ═══════════════════ -->
    <Motion as="div" class="rmt-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.34 }"
    >
      <div class="rmt-pills">
        <button v-for="f in FILTERS" :key="f.key"
          :class="['rmt-pill', { active: filter === f.key }]"
          @click="setFilter(f.key)">
          <span class="rmt-pill-dot" :style="{ background: f.dot }" />{{ f.label }}<span class="rmt-pill-count">{{ counts[f.key] }}</span>
        </button>
      </div>
      <div class="rmt-toolbar-right">
        <span class="rmt-toolbar-meta">
          <Radio :size="11" />
          <span>{{ rows.length }} {{ rows.length === 1 ? 'request' : 'requests' }} · {{ uniqueLocations }} {{ uniqueLocations === 1 ? 'location' : 'locations' }}</span>
        </span>
        <Motion as="button" class="rmt-refresh-cta"
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
      title="Reject remote request?"
      subtitle="The employee will be notified with the reason below so they can re-submit if needed."
      :target-label="rejectTarget?.employee_name || ''"
      :target-meta="rejectTarget ? `${formatDate(rejectTarget.wfh_date)} · REMOTE` : ''"
      :target-tag="rejectTarget?.status || ''"
      :target-icon="Globe"
      :presets="[
        'Insufficient justification',
        'Not a valid field-work location',
        'Missing supporting evidence',
        'Conflicts with assigned shift',
      ]"
      reason-placeholder="Explain why this remote-day request is being rejected…"
      confirm-label="Reject request"
      submitting-label="Rejecting…"
      warning="The employee sees this exact note. Rejection is logged to the audit trail."
      :submitting="rejecting"
      @close="rejectTarget = null"
      @confirm="confirmReject"
    />

    <!-- ═══════════════════ ROW LIST ═══════════════════ -->
    <div class="rmt-list" v-if="rows.length">
      <Motion v-for="(r, i) in rows" :key="r.id" as="article"
        :class="['rmt-row', `is-${r.status.toLowerCase()}`]"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -2 }"
      >
        <span class="rmt-row-aurora" aria-hidden="true" />

        <!-- LEFT: pin-shaped date badge -->
        <div class="rmt-when">
          <div class="rmt-pin-badge">
            <span class="pin-stem" />
            <MapPin :size="22" class="pin-icon" />
            <span class="pin-ping" />
          </div>
          <div class="rmt-date-stack">
            <span class="rmt-day">{{ formatDay(r.wfh_date) }}</span>
            <span class="rmt-mon">{{ formatMonth(r.wfh_date) }}</span>
            <span class="rmt-yr">{{ formatYear(r.wfh_date) }}</span>
          </div>
          <div v-if="r.wfh_date_until && r.wfh_date_until !== r.wfh_date" class="rmt-range">
            <ArrowRight :size="11" />
            <div class="rmt-range-stack">
              <span class="rmt-day">{{ formatDay(r.wfh_date_until) }}</span>
              <span class="rmt-mon">{{ formatMonth(r.wfh_date_until) }}</span>
            </div>
          </div>
        </div>

        <!-- MIDDLE: employee + REMOTE tag + reason -->
        <div class="rmt-body">
          <div class="rmt-head">
            <span class="rmt-emp">{{ r.employee_name || 'Unknown' }}</span>
            <span class="rmt-emp-dot">·</span>
            <span class="rmt-tag"><Globe :size="10" />REMOTE</span>
            <span v-if="r.location" class="rmt-loc-chip"><Navigation :size="10" />{{ r.location }}</span>
          </div>
          <div class="rmt-reason">
            <Quote :size="11" />
            <span>{{ r.reason || 'No reason provided' }}</span>
          </div>
        </div>

        <!-- RIGHT: status + actions -->
        <div class="rmt-actions">
          <span :class="['rmt-status', `is-${r.status.toLowerCase()}`]">
            <span class="rmt-status-dot" />{{ r.status }}
          </span>
          <template v-if="r.status === 'PENDING'">
            <Motion as="button" class="rmt-btn rmt-btn-reject"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="openReject(r)">
              <XCircle :size="13" />Reject
            </Motion>
            <Motion as="button" class="rmt-btn rmt-btn-approve"
              :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.95 }"
              @click="approveRow(r)">
              <CheckCircle2 :size="13" />Approve
            </Motion>
          </template>
        </div>
      </Motion>
    </div>

    <!-- ═══════════════════ EMPTY STATE ═══════════════════ -->
    <Motion v-else as="div" class="rmt-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.42 }"
    >
      <span class="rmt-empty-glow" />
      <div class="rmt-empty-illustration">
        <span class="rmt-empty-orbit rmt-empty-orbit-a" />
        <span class="rmt-empty-orbit rmt-empty-orbit-b" />
        <span class="rmt-empty-orbit rmt-empty-orbit-c" />
        <Globe :size="40" class="rmt-empty-icon" />
        <span class="rmt-empty-pin rmt-empty-pin-1"><MapPin :size="10" /></span>
        <span class="rmt-empty-pin rmt-empty-pin-2"><MapPin :size="10" /></span>
        <span class="rmt-empty-pin rmt-empty-pin-3"><MapPin :size="10" /></span>
      </div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <span class="rmt-empty-meta">
        <span class="rmt-empty-meta-dot" />Live · GPS-stamped on submission
      </span>
    </Motion>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Globe, CheckCircle2, XCircle, Quote, MapPin, Navigation,
  Compass, ArrowRight, Radio, Hourglass, Plane,
} from 'lucide-vue-next'
import { fetchWfhRequests, decideWfh } from '../composables/useAttendance'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

// ── Static config ────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'PENDING',  label: 'Pending',  dot: '#f59e0b' },
  { key: 'APPROVED', label: 'Approved', dot: '#14b8a6' },
  { key: 'REJECTED', label: 'Rejected', dot: '#b91c1c' },
  { key: '',         label: 'All',      dot: '#94a3b8' },
]

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

const uniqueLocations = computed(() => {
  const set = new Set(rows.value.map(r => r.location).filter(Boolean))
  return set.size
})

const thisMonthApproved = computed(() => {
  const now = new Date()
  const m = now.getMonth(), y = now.getFullYear()
  return allRows.value.filter(r => {
    if (r.status !== 'APPROVED' || !r.wfh_date) return false
    const d = new Date(r.wfh_date)
    return d.getMonth() === m && d.getFullYear() === y
  }).length
})

const locationsCovered = computed(() => {
  const set = new Set(
    allRows.value
      .filter(r => r.status === 'APPROVED' && r.location)
      .map(r => r.location)
  )
  return set.size
})

const trailFromRatio = (n, total) => {
  if (!total || !n) return 0
  return Math.min(12, Math.max(1, Math.round((n / total) * 12)))
}

const kpiTiles = computed(() => {
  const total = Math.max(1, allRows.value.length)
  return [
    {
      key: 'pending', filter: 'PENDING', label: 'AWAITING REVIEW',
      icon: Hourglass, pinIcon: MapPin, tone: 'amber',
      value: counts.value.PENDING,
      foot: counts.value.PENDING > 0 ? 'needs your decision' : 'queue is clear',
      trail: trailFromRatio(counts.value.PENDING, total),
    },
    {
      key: 'approved', filter: 'APPROVED', label: 'APPROVED',
      icon: CheckCircle2, pinIcon: Navigation, tone: 'teal',
      value: counts.value.APPROVED,
      foot: counts.value.APPROVED === 1 ? '1 fence waived' : `${counts.value.APPROVED} fences waived`,
      trail: trailFromRatio(counts.value.APPROVED, total),
    },
    {
      key: 'month', filter: null, label: 'THIS MONTH',
      icon: Plane, pinIcon: Plane, tone: 'cyan',
      value: thisMonthApproved.value,
      foot: 'approved · current month',
      trail: trailFromRatio(thisMonthApproved.value, total),
    },
    {
      key: 'locations', filter: null, label: 'LOCATIONS COVERED',
      icon: Compass, pinIcon: Compass, tone: 'emerald',
      value: locationsCovered.value,
      foot: 'distinct field sites',
      trail: Math.min(12, locationsCovered.value),
    },
  ]
})

const emptyTitle = computed(() => {
  if (filter.value === 'PENDING')  return 'No remote requests pending'
  if (filter.value === 'APPROVED') return 'No approved remote days yet'
  if (filter.value === 'REJECTED') return 'No rejections in this view'
  return 'No remote attendance requests'
})
const emptySub = computed(() => {
  if (filter.value === 'PENDING')  return 'Field staff and off-site approvals will land here once raised. Each request is GPS-stamped and routed for your review before the day rolls up.'
  if (filter.value === 'APPROVED') return 'Approved remote days waive the geo-fence check so employees can punch in from any location for that date.'
  if (filter.value === 'REJECTED') return 'Rejections stay on file for the audit trail. The employee sees your decision note.'
  return 'When employees submit remote-attendance requests, they appear here. Each is GPS-stamped on submission and waives the geo-fence on approval.'
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
    // Single fetch covers both WFH and REMOTE; filter client-side to REMOTE only.
    const data = await fetchWfhRequests({})
    allRows.value = (data.items || []).filter(r => r.request_type === 'REMOTE')
    applyFilter()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load remote requests')
  } finally { loading.value = false }
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
    toast.success('Remote request rejected')
    const id = rejectTarget.value.id
    allRows.value = allRows.value.map(x => x.id === id ? { ...x, status: 'REJECTED' } : x)
    applyFilter()
    rejectTarget.value = null
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not reject remote request')
  } finally { rejecting.value = false }
}

const approveRow = async (r) => {
  try {
    await decideWfh(r.id, 'APPROVED', '')
    toast.success('Remote request approved · geo-fence waived')
    allRows.value = allRows.value.map(x => x.id === r.id ? { ...x, status: 'APPROVED' } : x)
    applyFilter()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not approve remote request')
  }
}

const formatDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
  : '—'
const formatDay = (iso) => iso ? String(new Date(iso).getDate()).padStart(2, '0') : '--'
const formatMonth = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { month: 'short' }).toUpperCase() : '--'
const formatYear = (iso) => iso ? new Date(iso).getFullYear() : ''
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-remote { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ════════════════════ HERO ════════════════════ */
.rmt-banner {
  position: relative; overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(20, 184, 166, 0.20), transparent 60%),
    radial-gradient(120% 110% at 0% 110%, rgba(6, 182, 212, 0.16), transparent 65%),
    var(--att-glass);
  border: 1px solid rgba(20, 184, 166, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 60px -32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
}
[data-theme="light"] .rmt-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(13, 148, 136, 0.16), transparent 60%),
    radial-gradient(120% 110% at 0% 110%, rgba(8, 145, 178, 0.12), transparent 65%),
    rgba(255, 250, 240, 0.94);
  border-color: rgba(13, 148, 136, 0.45);
  box-shadow:
    0 22px 50px -28px rgba(15, 50, 60, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.rmt-banner-glow {
  position: absolute; inset: -50% -10% auto -10%;
  height: 140%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(45, 212, 191, 0.24), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
  animation: att-aurora 14s ease-in-out infinite;
}

/* Latitude/longitude mesh in the background */
.rmt-banner-mesh {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(20, 184, 166, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 184, 166, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0;
  mask-image: radial-gradient(60% 90% at 80% 50%, #000 35%, transparent 85%);
  z-index: 0; pointer-events: none; opacity: 0.6;
}
[data-theme="light"] .rmt-banner-mesh {
  background-image:
    linear-gradient(rgba(13, 148, 136, 0.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 148, 136, 0.10) 1px, transparent 1px);
}

/* Globe cluster — rotating Earth with orbiting GPS pins */
.rmt-globe-cluster {
  position: absolute;
  top: 50%; right: 36px;
  transform: translateY(-50%);
  width: 200px; height: 200px;
  z-index: 1; pointer-events: none;
}
.rmt-globe {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 130px; height: 130px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(94, 234, 212, 0.35), transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(8, 145, 178, 0.35), transparent 50%),
    linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #155e75 75%, #083344 100%);
  border: 1.5px solid rgba(94, 234, 212, 0.50);
  box-shadow:
    inset -10px -10px 30px rgba(0, 0, 0, 0.45),
    inset 6px 6px 22px rgba(94, 234, 212, 0.18),
    0 12px 32px -8px rgba(20, 184, 166, 0.45);
  overflow: hidden;
}
[data-theme="light"] .rmt-globe {
  background:
    radial-gradient(circle at 35% 30%, rgba(165, 243, 252, 0.55), transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(8, 145, 178, 0.30), transparent 50%),
    linear-gradient(135deg, #2dd4bf 0%, #14b8a6 40%, #0d9488 75%, #0f766e 100%);
  border-color: rgba(13, 148, 136, 0.60);
  box-shadow:
    inset -10px -10px 30px rgba(15, 50, 60, 0.30),
    inset 6px 6px 22px rgba(255, 255, 255, 0.35),
    0 10px 26px -8px rgba(13, 148, 136, 0.45);
}
.rmt-globe-face { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; }
.lat-line, .long-line {
  position: absolute;
  border: 1px dashed rgba(165, 243, 252, 0.30);
  pointer-events: none;
}
[data-theme="light"] .lat-line,
[data-theme="light"] .long-line { border-color: rgba(255, 255, 255, 0.45); }
.lat-line { left: 0; right: 0; height: 0; border-top-style: solid; border-bottom: 0; border-right: 0; border-left: 0; border-top-width: 1px; opacity: 0.55; }
.lat-1 { top: 18%;  border-radius: 50% / 12%; transform: scaleY(0.4); }
.lat-2 { top: 32%;  border-radius: 50% / 16%; transform: scaleY(0.55); }
.lat-3 { top: 50%; }
.lat-4 { top: 68%;  border-radius: 50% / 16%; transform: scaleY(0.55); }
.lat-5 { top: 82%;  border-radius: 50% / 12%; transform: scaleY(0.4); }
.long-line {
  top: 0; bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(165, 243, 252, 0.30);
  border-top: 0; border-right: 0; border-bottom: 0;
  left: 50%;
  border-radius: 12% / 50%;
  animation: rmt-globe-spin 24s linear infinite;
  transform-origin: center center;
}
.long-1 { animation-delay: 0s; }
.long-2 { animation-delay: -6s;  transform: scaleX(0.5); }
.long-3 { animation-delay: -12s; transform: scaleX(0.85); }
.long-4 { animation-delay: -18s; transform: scaleX(0.3); }
@keyframes rmt-globe-spin {
  from { transform: rotateY(0deg) scaleX(1); }
  50%  { transform: rotateY(180deg) scaleX(0.05); }
  to   { transform: rotateY(360deg) scaleX(1); }
}
.rmt-globe-shine {
  position: absolute;
  top: 8%; left: 18%;
  width: 35%; height: 30%;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.45), transparent 70%);
  border-radius: 50%;
  filter: blur(6px);
  pointer-events: none;
}
[data-theme="light"] .rmt-globe-shine { background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.75), transparent 70%); }

/* Orbiting GPS pins */
.rmt-pin {
  position: absolute;
  top: 50%; left: 50%;
  width: 26px; height: 26px;
  margin-top: -13px; margin-left: -13px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 6px 14px -4px rgba(0, 0, 0, 0.45);
}
.rmt-pin-a { background: linear-gradient(135deg, #5eead4, #14b8a6); animation: rmt-pin-orbit-a 16s linear infinite; }
.rmt-pin-b { background: linear-gradient(135deg, #67e8f9, #06b6d4); animation: rmt-pin-orbit-b 22s linear infinite reverse; }
.rmt-pin-c { background: linear-gradient(135deg, #fde68a, #f59e0b); animation: rmt-pin-orbit-c 18s linear infinite; }
.rmt-pin-d { background: linear-gradient(135deg, #fb923c, #ea580c); animation: rmt-pin-orbit-d 26s linear infinite reverse; }
[data-theme="light"] .rmt-pin-a { background: linear-gradient(135deg, #14b8a6, #0d9488); }
[data-theme="light"] .rmt-pin-b { background: linear-gradient(135deg, #06b6d4, #0891b2); }
[data-theme="light"] .rmt-pin-c { background: linear-gradient(135deg, #f59e0b, #d97706); }
[data-theme="light"] .rmt-pin-d { background: linear-gradient(135deg, #ea580c, #c2410c); }
@keyframes rmt-pin-orbit-a {
  from { transform: rotate(0deg)   translateX(85px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(85px) rotate(-360deg); }
}
@keyframes rmt-pin-orbit-b {
  from { transform: rotate(120deg) translateX(95px) rotate(-120deg); }
  to   { transform: rotate(480deg) translateX(95px) rotate(-480deg); }
}
@keyframes rmt-pin-orbit-c {
  from { transform: rotate(240deg) translateX(75px) rotate(-240deg); }
  to   { transform: rotate(600deg) translateX(75px) rotate(-600deg); }
}
@keyframes rmt-pin-orbit-d {
  from { transform: rotate(60deg)  translateX(90px) rotate(-60deg); }
  to   { transform: rotate(420deg) translateX(90px) rotate(-420deg); }
}

/* Ambient signal rings emanating from the globe */
.rmt-signal {
  position: absolute;
  top: 50%; left: 50%;
  width: 140px; height: 140px;
  margin-top: -70px; margin-left: -70px;
  border-radius: 50%;
  border: 1.5px solid rgba(94, 234, 212, 0.40);
  opacity: 0;
  pointer-events: none;
  animation: rmt-signal-pulse 4s ease-out infinite;
}
[data-theme="light"] .rmt-signal { border-color: rgba(13, 148, 136, 0.50); }
.rmt-signal-a { animation-delay: 0s; }
.rmt-signal-b { animation-delay: 2s; }
@keyframes rmt-signal-pulse {
  0%   { transform: scale(0.7); opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
}

.rmt-banner-text { position: relative; z-index: 2; min-width: 0; padding-right: 220px; }
.rmt-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.7px; text-transform: uppercase;
  font-weight: 800;
  color: #5eead4;
}
[data-theme="light"] .rmt-eyebrow { color: #0f766e; }
.rmt-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 6px rgba(45, 212, 191, 0.75);
  animation: att-live-pulse 2.5s ease-in-out infinite;
}
[data-theme="light"] .rmt-eyebrow-dot { background: #0d9488; box-shadow: 0 0 6px rgba(13, 148, 136, 0.55); }

.rmt-banner-title {
  margin: 6px 0 4px;
  font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
  display: flex; align-items: baseline; gap: 12px;
  background: linear-gradient(110deg, #a7f3d0 0%, #5eead4 30%, #67e8f9 60%, #5eead4 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rmt-title-shimmer 8s ease-in-out infinite;
}
[data-theme="light"] .rmt-banner-title {
  background: linear-gradient(110deg, #0f766e 0%, #0d9488 30%, #0891b2 60%, #0f766e 100%);
  background-size: 220% 220%;
  -webkit-background-clip: text; background-clip: text;
}
@keyframes rmt-title-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.rmt-banner-divider { -webkit-text-fill-color: var(--hr-text-dim); color: var(--hr-text-dim); font-weight: 400; }
.rmt-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 580px;
}
.rmt-banner-sub strong { color: #fca5a5; font-weight: 700; }
.rmt-banner-sub em { color: #5eead4; font-style: normal; font-weight: 600; }
[data-theme="light"] .rmt-banner-sub strong { color: #b91c1c; }
[data-theme="light"] .rmt-banner-sub em { color: #0f766e; }

/* ════════════════════ KPI STRIP ════════════════════ */
.rmt-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.rmt-kpi {
  position: relative;
  padding: 14px 16px 14px;
  border-radius: 18px;
  background: var(--att-glass);
  border: 1px solid rgba(20, 184, 166, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .rmt-kpi {
  border-color: rgba(13, 148, 136, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(15, 50, 60, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.rmt-kpi.active {
  border-color: var(--accent, #14b8a6);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(20, 184, 166, 0.45));
}
[data-theme="light"] .rmt-kpi.active {
  border-color: var(--accent-light, #0f766e);
  box-shadow: 0 18px 36px -18px var(--accent-shadow-light, rgba(15, 118, 110, 0.40));
}
.kpi-aurora {
  position: absolute; inset: -50% -30% auto -30%;
  height: 100%;
  background: radial-gradient(60% 60% at 50% 40%, var(--accent-glow, rgba(20, 184, 166, 0.22)), transparent 65%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s;
  pointer-events: none;
}
.rmt-kpi:hover .kpi-aurora,
.rmt-kpi.active .kpi-aurora { opacity: 1; }

/* Mini location pin (top-right) */
.kpi-pin {
  position: absolute; top: 12px; right: 12px;
  width: 24px; height: 24px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: var(--accent-soft, rgba(20, 184, 166, 0.18));
  color: var(--accent, #14b8a6);
  border: 1px solid var(--accent-border, rgba(20, 184, 166, 0.40));
}
[data-theme="light"] .kpi-pin {
  background: var(--accent-soft-light, rgba(13, 148, 136, 0.18));
  color: var(--accent-light, #0f766e);
  border-color: var(--accent-border-light, rgba(13, 148, 136, 0.45));
}
.kpi-pin-pulse {
  position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1px solid var(--accent, #14b8a6);
  opacity: 0;
  animation: rmt-pin-pulse 2.4s ease-out infinite;
}
[data-theme="light"] .kpi-pin-pulse { border-color: var(--accent-light, #0f766e); }
@keyframes rmt-pin-pulse {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
}

.kpi-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase;
  font-weight: 800;
  color: var(--hr-text-muted);
  padding-right: 36px;
}
[data-theme="light"] .kpi-eyebrow { color: #4b5563; }
.kpi-num {
  display: block;
  margin: 10px 0 3px;
  font-size: 32px; font-weight: 900;
  letter-spacing: -0.6px;
  color: var(--accent, var(--hr-text));
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
  text-shadow: 0 2px 18px var(--accent-glow, rgba(20, 184, 166, 0.20));
}
[data-theme="light"] .kpi-num { color: var(--accent-light, var(--hr-text)); text-shadow: none; }
.kpi-foot { display: block; font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }
[data-theme="light"] .kpi-foot { color: #4b5563; }

/* Dotted progress trail */
.kpi-trail {
  margin-top: 10px;
  display: flex; gap: 3px; align-items: center;
}
.kpi-trail-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.20);
  border: 1px solid rgba(148, 163, 184, 0.30);
  transition: background .3s, border-color .3s;
}
.kpi-trail-dot.lit {
  background: var(--accent, #14b8a6);
  border-color: var(--accent, #14b8a6);
  box-shadow: 0 0 4px var(--accent-glow, rgba(20, 184, 166, 0.65));
}
[data-theme="light"] .kpi-trail-dot { background: rgba(15, 50, 60, 0.10); border-color: rgba(15, 50, 60, 0.20); }
[data-theme="light"] .kpi-trail-dot.lit {
  background: var(--accent-light, #0f766e);
  border-color: var(--accent-light, #0f766e);
}

.tone-amber {
  --accent: #f59e0b; --accent-light: #b45309;
  --accent-soft: rgba(245, 158, 11, 0.18); --accent-border: rgba(245, 158, 11, 0.40);
  --accent-soft-light: rgba(217, 119, 6, 0.18); --accent-border-light: rgba(180, 83, 9, 0.40);
  --accent-glow: rgba(251, 191, 36, 0.30); --accent-shadow: rgba(251, 146, 60, 0.45); --accent-shadow-light: rgba(217, 119, 6, 0.45);
}
.tone-teal {
  --accent: #14b8a6; --accent-light: #0f766e;
  --accent-soft: rgba(20, 184, 166, 0.18); --accent-border: rgba(20, 184, 166, 0.45);
  --accent-soft-light: rgba(13, 148, 136, 0.18); --accent-border-light: rgba(13, 148, 136, 0.50);
  --accent-glow: rgba(45, 212, 191, 0.32); --accent-shadow: rgba(13, 148, 136, 0.45); --accent-shadow-light: rgba(15, 118, 110, 0.45);
}
.tone-cyan {
  --accent: #06b6d4; --accent-light: #0e7490;
  --accent-soft: rgba(6, 182, 212, 0.18); --accent-border: rgba(6, 182, 212, 0.42);
  --accent-soft-light: rgba(8, 145, 178, 0.18); --accent-border-light: rgba(14, 116, 144, 0.42);
  --accent-glow: rgba(103, 232, 249, 0.32); --accent-shadow: rgba(8, 145, 178, 0.45); --accent-shadow-light: rgba(14, 116, 144, 0.45);
}
.tone-emerald {
  --accent: #10b981; --accent-light: #047857;
  --accent-soft: rgba(16, 185, 129, 0.18); --accent-border: rgba(16, 185, 129, 0.42);
  --accent-soft-light: rgba(4, 120, 87, 0.18); --accent-border-light: rgba(5, 150, 105, 0.42);
  --accent-glow: rgba(52, 211, 153, 0.32); --accent-shadow: rgba(5, 150, 105, 0.45); --accent-shadow-light: rgba(4, 120, 87, 0.45);
}

/* ════════════════════ TOOLBAR ════════════════════ */
.rmt-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(20, 184, 166, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .rmt-toolbar {
  border-color: rgba(13, 148, 136, 0.40);
  box-shadow:
    0 6px 16px -14px rgba(15, 50, 60, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.rmt-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.rmt-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(20, 184, 166, 0.24);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, transform .18s;
}
.rmt-pill:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(20, 184, 166, 0.55); }
.rmt-pill.active {
  background: linear-gradient(135deg, #99f6e4, #2dd4bf 60%, #14b8a6);
  color: #042f2e;
  border-color: rgba(13, 148, 136, 0.60);
  box-shadow: 0 6px 18px -8px rgba(13, 148, 136, 0.55);
}
.rmt-pill-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 4px currentColor; }
.rmt-pill-count {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 10px; font-weight: 800;
  color: inherit;
}
[data-theme="light"] .rmt-pill {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(13, 148, 136, 0.30);
  color: #4b5563;
}
[data-theme="light"] .rmt-pill.active {
  background: linear-gradient(135deg, #14b8a6, #0d9488 55%, #0f766e);
  color: #fff;
}
[data-theme="light"] .rmt-pill-count { background: rgba(255, 255, 255, 0.45); color: inherit; }

.rmt-toolbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rmt-toolbar-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.rmt-toolbar-meta svg { color: #5eead4; }
[data-theme="light"] .rmt-toolbar-meta { color: #4b5563; }
[data-theme="light"] .rmt-toolbar-meta svg { color: #0f766e; }

.rmt-refresh-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 10px;
  background: linear-gradient(135deg, #99f6e4 0%, #2dd4bf 50%, #0f766e 100%);
  background-size: 200% 200%;
  color: #042f2e;
  font-weight: 800; font-size: 11.5px; letter-spacing: 0.3px;
  border: 1px solid rgba(13, 148, 136, 0.60);
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(13, 148, 136, 0.55);
  transition: background-position .35s, box-shadow .25s;
  flex-shrink: 0;
}
.rmt-refresh-cta:hover { background-position: 100% 50%; box-shadow: 0 14px 26px -10px rgba(13, 148, 136, 0.70); }
.rmt-refresh-cta.spinning svg { animation: rmt-spin 0.9s linear infinite; }
@keyframes rmt-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .rmt-refresh-cta {
  background: linear-gradient(135deg, #14b8a6, #0d9488 55%, #0f766e);
  color: #fff;
}

/* ════════════════════ ROW LIST ════════════════════ */
.rmt-list { display: flex; flex-direction: column; gap: 10px; }
.rmt-row {
  position: relative;
  display: grid;
  grid-template-columns: 280px 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 16px 20px;
  border-radius: 18px;
  background: var(--att-glass);
  border: 1px solid rgba(20, 184, 166, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 18px -14px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .rmt-row {
  border-color: rgba(13, 148, 136, 0.38);
  box-shadow:
    0 6px 18px -14px rgba(15, 50, 60, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.rmt-row:hover {
  border-color: rgba(45, 212, 191, 0.70);
  box-shadow: 0 16px 36px -20px rgba(20, 184, 166, 0.45);
}
[data-theme="light"] .rmt-row:hover {
  border-color: rgba(13, 148, 136, 0.65);
  box-shadow: 0 16px 36px -20px rgba(13, 148, 136, 0.30);
}
.rmt-row-aurora {
  position: absolute; inset: -40% 60% -40% -20%;
  background: radial-gradient(40% 80% at 30% 50%, rgba(45, 212, 191, 0.20), transparent 70%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s; pointer-events: none;
}
.rmt-row:hover .rmt-row-aurora { opacity: 1; }
[data-theme="light"] .rmt-row-aurora { background: radial-gradient(40% 80% at 30% 50%, rgba(13, 148, 136, 0.16), transparent 70%); }

.rmt-row.is-pending  { border-left: 4px solid #f59e0b; }
.rmt-row.is-approved { border-left: 4px solid #14b8a6; }
.rmt-row.is-rejected { border-left: 4px solid #b91c1c; }
.rmt-row.is-cancelled { border-left: 4px solid #64748b; opacity: 0.78; }

/* LEFT: pin-shaped date badge */
.rmt-when { display: flex; gap: 14px; align-items: center; }
.rmt-pin-badge {
  position: relative;
  width: 46px; height: 56px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pin-stem {
  position: absolute;
  width: 36px; height: 46px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 55%, #0f766e 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.30),
    0 8px 20px -8px rgba(13, 148, 136, 0.55);
  top: 0;
  clip-path: polygon(50% 100%, 0 40%, 8% 18%, 28% 4%, 50% 0, 72% 4%, 92% 18%, 100% 40%);
}
[data-theme="light"] .pin-stem {
  background: linear-gradient(135deg, #14b8a6, #0d9488 55%, #0f766e);
}
.rmt-row.is-pending .pin-stem { background: linear-gradient(135deg, #fde68a, #f59e0b 55%, #d97706); }
.rmt-row.is-rejected .pin-stem { background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #b91c1c); }
.pin-icon { position: relative; z-index: 1; color: #042f2e; }
.rmt-row.is-pending .pin-icon { color: #451a03; }
.rmt-row.is-rejected .pin-icon { color: #fff; }
[data-theme="light"] .pin-icon { color: #fff; }
.pin-ping {
  position: absolute;
  bottom: 0;
  left: 50%; margin-left: -3px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7);
  animation: pin-ping 1.8s ease-out infinite;
}
.rmt-row.is-pending .pin-ping { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
.rmt-row.is-rejected .pin-ping { display: none; }
@keyframes pin-ping {
  0%   { transform: scale(1); opacity: 0.85; box-shadow: 0 0 0 0 currentColor; }
  100% { transform: scale(3.6); opacity: 0; box-shadow: 0 0 0 10px transparent; }
}

.rmt-date-stack {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  min-width: 56px;
}
.rmt-day {
  font-size: 26px; font-weight: 900; line-height: 1;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.rmt-mon { font-size: 9.5px; letter-spacing: 1.5px; font-weight: 800; color: #5eead4; }
.rmt-yr  { font-size: 9px; color: var(--hr-text-muted); font-weight: 600; }
[data-theme="light"] .rmt-mon { color: #0f766e; }
[data-theme="light"] .rmt-yr  { color: #4b5563; }

.rmt-range { display: inline-flex; align-items: center; gap: 8px; padding-left: 4px; }
.rmt-range > svg { color: var(--hr-text-muted); flex-shrink: 0; }
.rmt-range-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
.rmt-range-stack .rmt-day { font-size: 20px; }
.rmt-range-stack .rmt-mon { font-size: 9px; }

/* MIDDLE: body */
.rmt-body { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.rmt-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0; }
.rmt-emp { font-size: 13.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px; }
.rmt-emp-dot { color: var(--hr-text-muted); opacity: 0.55; }
.rmt-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px;
  background: rgba(20, 184, 166, 0.18); color: #5eead4;
  border: 1px solid rgba(20, 184, 166, 0.42);
}
[data-theme="light"] .rmt-tag { background: rgba(20, 184, 166, 0.22); color: #115e59; border-color: rgba(13, 148, 136, 0.45); }
.rmt-loc-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 7px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
  font-family: var(--hr-mono, monospace);
  background: rgba(6, 182, 212, 0.14); color: #67e8f9;
  border: 1px dashed rgba(6, 182, 212, 0.40);
}
[data-theme="light"] .rmt-loc-chip { background: rgba(8, 145, 178, 0.14); color: #0e7490; border-color: rgba(8, 145, 178, 0.45); }

.rmt-reason {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 11.5px; color: var(--hr-text-muted);
  font-style: italic; line-height: 1.5;
  padding: 6px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(20, 184, 166, 0.30);
}
[data-theme="light"] .rmt-reason {
  background: rgba(255, 250, 240, 0.5);
  border-color: rgba(13, 148, 136, 0.32);
  color: #4b5563;
}
.rmt-reason svg { color: #5eead4; flex-shrink: 0; margin-top: 2px; }
[data-theme="light"] .rmt-reason svg { color: #0f766e; }
.rmt-reason span { word-break: break-word; }

/* RIGHT: status + actions */
.rmt-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.rmt-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  border: 1px solid;
}
.rmt-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.rmt-status.is-pending  { background: rgba(245, 158, 11, 0.16); color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); }
.rmt-status.is-approved { background: rgba(20, 184, 166, 0.16); color: #5eead4; border-color: rgba(20, 184, 166, 0.45); }
.rmt-status.is-rejected { background: rgba(185, 28, 28, 0.16);  color: #fca5a5; border-color: rgba(185, 28, 28, 0.45); }
.rmt-status.is-cancelled { background: rgba(100, 116, 139, 0.16); color: #cbd5e1; border-color: rgba(100, 116, 139, 0.45); }
[data-theme="light"] .rmt-status.is-pending  { background: rgba(245, 158, 11, 0.20); color: #92400e; border-color: rgba(217, 119, 6, 0.55); }
[data-theme="light"] .rmt-status.is-approved { background: rgba(20, 184, 166, 0.20); color: #115e59; border-color: rgba(15, 118, 110, 0.55); }
[data-theme="light"] .rmt-status.is-rejected { background: rgba(185, 28, 28, 0.18);  color: #7f1d1d; border-color: rgba(153, 27, 27, 0.55); }
[data-theme="light"] .rmt-status.is-cancelled { background: rgba(100, 116, 139, 0.20); color: #334155; border-color: rgba(71, 85, 105, 0.55); }

.rmt-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 13px;
  border-radius: 11px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .25s;
}
.rmt-btn-approve {
  background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 55%, #0f766e 100%);
  color: #fff;
  border-color: #0d9488;
  box-shadow:
    0 8px 20px -8px rgba(20, 184, 166, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 1px rgba(6, 95, 70, 0.55);
}
.rmt-btn-approve:hover {
  filter: brightness(1.08);
  box-shadow:
    0 14px 28px -10px rgba(20, 184, 166, 0.70),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
.rmt-btn-approve svg { color: #fff; }
.rmt-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.50);
}
.rmt-btn-reject:hover {
  background: rgba(220, 38, 38, 0.22);
  box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .rmt-btn-approve {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%);
  color: #fff;
  border-color: #0f766e;
  box-shadow:
    0 8px 20px -8px rgba(13, 148, 136, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 1px rgba(15, 118, 110, 0.55);
}
[data-theme="light"] .rmt-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.55);
}
[data-theme="light"] .rmt-btn-reject:hover { background: rgba(220, 38, 38, 0.18); }

/* ════════════════════ EMPTY STATE ════════════════════ */
.rmt-empty {
  position: relative;
  padding: 50px 24px 42px;
  border-radius: 22px;
  background: var(--att-glass);
  border: 1px solid rgba(20, 184, 166, 0.42);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
[data-theme="light"] .rmt-empty {
  border-color: rgba(13, 148, 136, 0.42);
  background: rgba(255, 250, 240, 0.85);
  box-shadow: 0 22px 50px -28px rgba(15, 50, 60, 0.22);
}
.rmt-empty-glow {
  position: absolute; inset: -40% -10% auto -10%;
  height: 80%;
  background: radial-gradient(50% 50% at 50% 30%, rgba(45, 212, 191, 0.22), transparent 60%);
  filter: blur(50px);
  z-index: -1;
}
[data-theme="light"] .rmt-empty-glow { background: radial-gradient(50% 50% at 50% 30%, rgba(13, 148, 136, 0.16), transparent 60%); }
.rmt-empty-illustration {
  position: relative;
  width: 110px; height: 110px;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.rmt-empty-icon {
  color: #5eead4;
  filter: drop-shadow(0 0 14px rgba(45, 212, 191, 0.55));
  animation: rmt-empty-spin 14s linear infinite;
  z-index: 1;
}
[data-theme="light"] .rmt-empty-icon { color: #0f766e; filter: drop-shadow(0 0 10px rgba(13, 148, 136, 0.45)); }
@keyframes rmt-empty-spin { to { transform: rotate(360deg); } }
.rmt-empty-orbit {
  position: absolute; inset: -10px;
  border-radius: 50%;
  border: 1px dashed rgba(20, 184, 166, 0.45);
  pointer-events: none;
}
.rmt-empty-orbit-a { animation: att-ring-rotate 18s linear infinite; }
.rmt-empty-orbit-b { inset: -22px; animation: att-ring-rotate 26s linear infinite reverse; border-color: rgba(45, 212, 191, 0.30); }
.rmt-empty-orbit-c { inset: -36px; animation: att-ring-rotate 36s linear infinite; border-color: rgba(6, 182, 212, 0.22); }
[data-theme="light"] .rmt-empty-orbit-a { border-color: rgba(13, 148, 136, 0.45); }
[data-theme="light"] .rmt-empty-orbit-b { border-color: rgba(15, 118, 110, 0.32); }
[data-theme="light"] .rmt-empty-orbit-c { border-color: rgba(14, 116, 144, 0.24); }

.rmt-empty-pin {
  position: absolute;
  width: 22px; height: 22px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.35);
}
.rmt-empty-pin-1 {
  top: -12px; right: -6px;
  background: linear-gradient(135deg, #5eead4, #14b8a6);
  animation: rmt-empty-pin 3s ease-in-out infinite;
}
.rmt-empty-pin-2 {
  bottom: 4px; left: -16px;
  background: linear-gradient(135deg, #67e8f9, #06b6d4);
  animation: rmt-empty-pin 3.4s ease-in-out infinite 0.6s;
}
.rmt-empty-pin-3 {
  bottom: -10px; right: 4px;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  animation: rmt-empty-pin 4s ease-in-out infinite 1.2s;
}
@keyframes rmt-empty-pin {
  0%, 100% { transform: translateY(0); opacity: 0.95; }
  50%      { transform: translateY(-6px); opacity: 1; }
}

.rmt-empty h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.2px; }
.rmt-empty p  { margin: 0 0 8px; font-size: 12px; color: var(--hr-text-muted); max-width: 520px; line-height: 1.55; }
.rmt-empty-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #5eead4;
  padding: 5px 11px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.10);
  border: 1px solid rgba(20, 184, 166, 0.40);
}
[data-theme="light"] .rmt-empty-meta {
  color: #0f766e;
  background: rgba(20, 184, 166, 0.14);
  border-color: rgba(13, 148, 136, 0.45);
}
.rmt-empty-meta-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 6px rgba(45, 212, 191, 0.7);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
[data-theme="light"] .rmt-empty-meta-dot { background: #0d9488; box-shadow: 0 0 6px rgba(13, 148, 136, 0.55); }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 980px) {
  .rmt-banner-text { padding-right: 0; }
  .rmt-globe-cluster { display: none; }
  .rmt-row { grid-template-columns: 1fr; gap: 12px; }
  .rmt-actions { justify-content: flex-start; }
}
</style>
