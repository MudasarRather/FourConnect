<template>
  <section class="att-hd" data-anim="att-half-day">
    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <Motion as="header" class="hd-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="hd-banner-glow" />
      <span class="hd-sun-arc" aria-hidden="true">
        <span class="arc-ring arc-a"></span>
        <span class="arc-ring arc-b"></span>
      </span>

      <div class="hd-banner-text">
        <span class="att-banner-eyebrow"><span class="att-banner-eyebrow-dot" />Half-day workflow · Request → Approve → Roster</span>
        <h2 class="att-banner-title">
          <span>Half-Day</span>
          <span class="att-banner-divider">·</span>
          <span>Decisions</span>
        </h2>
        <p class="att-banner-sub">
          Employees request first-half or second-half off. Approving flips that date's attendance to
          <strong>HALF_DAY</strong> automatically. Admins can also <em>manually tag</em> any day from the
          override modal.
        </p>
      </div>

      <div class="hd-banner-actions">
        <Motion as="button" class="hd-manual-cta"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
          @click="openManual()"
        >
          <Plus :size="14" /> Manual tag
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════════ KPI STRIP ═══════════════════ -->
    <div class="hd-kpis">
      <Motion v-for="(t, i) in kpiTiles" :key="t.key" as="article"
        :class="['hd-kpi', `tone-${t.tone}`, { active: filter === t.filter }]"
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
    <Motion as="div" class="hd-toolbar"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.32 }"
    >
      <div class="hd-pills">
        <button v-for="f in FILTERS" :key="f.key"
          :class="['hd-pill', { active: filter === f.key }]"
          @click="setFilter(f.key)">
          <span class="hd-pill-dot" :style="{ background: f.dot }" />{{ f.label }}<span class="hd-pill-count">{{ counts[f.key] }}</span>
        </button>
      </div>
      <button class="hd-refresh" :class="{ spinning: loading }" @click="reload">
        <RefreshCw :size="13" />Refresh
      </button>
    </Motion>

    <!-- ═══════════════════ ROW LIST ═══════════════════ -->
    <div class="hd-list" v-if="rows.length">
      <Motion v-for="(r, i) in rows" :key="r.id" as="article"
        :class="['hd-row', `is-${r.status.toLowerCase()}`, { 'is-override': r.is_admin_override }]"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -2 }"
      >
        <!-- LEFT: date + half visual -->
        <div class="hd-when">
          <div class="hd-date-stack">
            <span class="hd-day">{{ formatDay(r.half_day_date) }}</span>
            <span class="hd-mon">{{ formatMonth(r.half_day_date) }}</span>
            <span class="hd-yr">{{ formatYear(r.half_day_date) }}</span>
          </div>
          <!-- Half indicator — animated sun arc -->
          <div class="hd-half-vis" :data-half="r.which_half">
            <div class="hd-vis-track">
              <span class="hd-vis-am" :title="r.which_half === 'FIRST' ? 'Time off' : 'Working'">AM</span>
              <span class="hd-vis-divider" />
              <span class="hd-vis-pm" :title="r.which_half === 'SECOND' ? 'Time off' : 'Working'">PM</span>
              <Motion class="hd-vis-fill"
                :initial="{ scaleX: 0 }"
                :animate="{ scaleX: 1 }"
                :transition="{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }"
              />
            </div>
            <span class="hd-vis-tag">{{ r.which_half === 'FIRST' ? '1st half off' : '2nd half off' }}</span>
          </div>
        </div>

        <!-- MIDDLE: employee + reason -->
        <div class="hd-body">
          <div class="hd-emp">
            <span class="hd-emp-name">{{ r.employee_name || 'Unknown' }}</span>
            <span class="hd-emp-dot">·</span>
            <span class="hd-emp-code">{{ r.employee_code || '—' }}</span>
            <span class="hd-emp-dot">·</span>
            <span class="hd-emp-dept">{{ r.department || '—' }}</span>
          </div>
          <div class="hd-reason">
            <span class="hd-reason-tag" :data-type="r.reason_type">
              <component :is="reasonIcon(r.reason_type)" :size="10" />
              {{ r.reason_type }}
            </span>
            <span class="hd-reason-text"><Quote :size="10" />{{ r.reason }}</span>
          </div>
          <div v-if="r.decision_notes" class="hd-decision-note">
            <ScrollText :size="10" />
            <span><strong>{{ r.is_admin_override ? 'Override note' : `Decision by ${r.manager_approved_by_name || 'HR'}` }}:</strong> {{ r.decision_notes }}</span>
          </div>
        </div>

        <!-- RIGHT: status + actions -->
        <div class="hd-actions">
          <span v-if="r.is_admin_override" class="hd-badge override-badge">
            <Shield :size="9" /> Admin tag
          </span>
          <span :class="['hd-status', `is-${r.status.toLowerCase()}`]">
            <span class="hd-status-dot" />{{ r.status }}
          </span>
          <template v-if="r.status === 'PENDING'">
            <Motion as="button" class="hd-btn hd-btn-reject"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="openReject(r)">
              <XCircle :size="13" />Reject
            </Motion>
            <Motion as="button" class="hd-btn hd-btn-approve"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="approveRow(r)">
              <CheckCircle2 :size="13" />Approve
            </Motion>
          </template>
          <template v-else-if="r.status === 'APPROVED'">
            <Motion as="button" class="hd-btn hd-btn-revert"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"
              @click="revertRow(r)" title="Revert this half-day — attendance status recomputes from punches">
              <Undo2 :size="13" />Revert
            </Motion>
          </template>
        </div>
      </Motion>
    </div>

    <Motion v-else as="div" class="hd-empty"
      :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.42 }"
    >
      <div class="hd-empty-glow"></div>
      <div class="hd-empty-icon"><HalfCircle :size="32" /></div>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptySub }}</p>
      <button class="hd-manual-cta" @click="openManual()">
        <Plus :size="13" /> Tag a half-day manually
      </button>
    </Motion>

    <!-- ═══════════════════ MANUAL TAG MODAL ═══════════════════ -->
    <Teleport to="body">
      <Motion v-if="manualOpen" as="div" class="hd-modal-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        @click.self="closeManual"
      >
        <Motion as="div" class="hd-modal"
          :initial="{ opacity: 0, scale: 0.92, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
        >
          <header class="hd-modal-head">
            <div class="hd-modal-icon"><Shield :size="14" /></div>
            <div>
              <h3>Manual half-day tag</h3>
              <p>Admin override · pre-approved · the daily roster updates immediately.</p>
            </div>
            <button class="hd-modal-close" @click="closeManual"><X :size="14" /></button>
          </header>

          <div class="hd-form">
            <div class="hd-field hd-field-emp">
              <label>Employee</label>
              <div class="hd-emp-search">
                <Search :size="12" />
                <input v-model="empQuery" type="text" placeholder="Search by name or code…" autofocus />
              </div>
              <div v-if="filteredEmployees.length" class="hd-emp-options">
                <button v-for="e in filteredEmployees.slice(0, 6)" :key="e.id"
                  type="button"
                  :class="['hd-emp-option', { selected: form.employee_id === e.id }]"
                  @click="form.employee_id = e.id; empQuery = e.label">
                  <span class="hd-emp-avatar">{{ e.initials }}</span>
                  <span class="hd-emp-meta">
                    <span class="hd-emp-name">{{ e.name }}</span>
                    <span class="hd-emp-sub">{{ e.code }} · {{ e.dept }}</span>
                  </span>
                  <Check v-if="form.employee_id === e.id" :size="13" class="hd-emp-check" />
                </button>
              </div>
              <div v-else-if="empQuery" class="hd-emp-empty">No employees match "{{ empQuery }}"</div>
            </div>

            <div class="hd-field">
              <label>Date</label>
              <input v-model="form.half_day_date" type="date" class="hd-input" />
            </div>

            <div class="hd-field">
              <label>Which half is off?</label>
              <div class="hd-half-grid">
                <button type="button" v-for="h in HALVES" :key="h.value"
                  :class="['hd-half-card', { active: form.which_half === h.value }]"
                  @click="form.which_half = h.value">
                  <div class="hd-half-visual">
                    <span class="hd-half-am" :class="{ off: h.value === 'FIRST' }">AM</span>
                    <span class="hd-half-pm" :class="{ off: h.value === 'SECOND' }">PM</span>
                  </div>
                  <span class="hd-half-label">{{ h.label }}</span>
                  <span class="hd-half-desc">{{ h.desc }}</span>
                  <Check v-if="form.which_half === h.value" :size="11" class="hd-half-check" />
                </button>
              </div>
            </div>

            <div class="hd-field">
              <label>Reason type</label>
              <div class="hd-reason-grid">
                <button type="button" v-for="rt in REASON_TYPES" :key="rt.value"
                  :class="['hd-rt-chip', `tone-${rt.tone}`, { active: form.reason_type === rt.value }]"
                  @click="form.reason_type = rt.value">
                  <component :is="rt.icon" :size="11" />{{ rt.label }}
                </button>
              </div>
            </div>

            <div class="hd-field">
              <label>Reason notes <em>(visible to employee)</em></label>
              <textarea v-model="form.reason" class="hd-textarea" rows="3"
                placeholder="e.g. Quarterly off-site team meeting — second half blocked for travel."></textarea>
            </div>
          </div>

          <footer class="hd-modal-foot">
            <button class="hd-btn hd-btn-ghost" @click="closeManual">Cancel</button>
            <Motion as="button"
              class="hd-btn hd-btn-primary"
              :disabled="!manualValid || submitting"
              :whileHover="manualValid && !submitting ? { y: -1, scale: 1.02 } : {}"
              :whileTap="manualValid && !submitting ? { scale: 0.96 } : {}"
              @click="submitManual">
              <Loader2 v-if="submitting" :size="13" class="spin" />
              <Shield v-else :size="13" />
              {{ submitting ? 'Saving…' : 'Tag as half-day' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Teleport>

    <!-- Reject modal — dedicated half-day-themed component -->
    <AttHalfDayRejectModal
      :open="!!rejectTarget"
      :target="rejectTarget"
      :submitting="rejecting"
      @close="rejectTarget = null"
      @confirm="confirmReject"
    />

    <!-- Revert modal — rewinds an APPROVED half-day & recomputes attendance -->
    <AttHalfDayRevertModal
      :open="!!revertTarget"
      :target="revertTarget"
      :submitting="reverting"
      @close="revertTarget = null"
      @confirm="confirmRevert"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, RefreshCw, CheckCircle2, XCircle, Quote, ScrollText, Shield, Undo2,
  Search, Check, Loader2, X,
  Heart, Briefcase, HeartPulse, Users, Sparkles,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import {
  fetchHalfDayRequests, fetchHalfDayStats, decideHalfDay,
  adminCreateHalfDay, adminDeleteHalfDay,
} from '../composables/useAttendance'
import AttHalfDayRejectModal from '../components/AttHalfDayRejectModal.vue'
import AttHalfDayRevertModal from '../components/AttHalfDayRevertModal.vue'
import { API } from '@/utils/api'
import axios from 'axios'

// Tiny inline icon for the half-circle visual — lucide doesn't ship one
// shaped quite right, so render an SVG via a render function.
import { h } from 'vue'
const HalfCircle = (props) => h('svg', { width: props.size || 24, height: props.size || 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '12', cy: '12', r: '9' }),
  h('path', { d: 'M12 3 v18', fill: 'currentColor' }),
  h('path', { d: 'M12 3 a9 9 0 0 1 0 18 Z', fill: 'currentColor', opacity: '0.85' }),
])

defineEmits(['refresh-stats'])
const toast = useToast()

// ── Static config ────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'PENDING',   label: 'Pending',   dot: '#f59e0b' },
  { key: 'APPROVED',  label: 'Approved',  dot: '#0d9488' },
  { key: 'REJECTED',  label: 'Rejected',  dot: '#b91c1c' },
  { key: '',          label: 'All',       dot: '#94a3b8' },
]

const HALVES = [
  { value: 'FIRST',  label: '1st half off',  desc: 'Employee joins after lunch.' },
  { value: 'SECOND', label: '2nd half off',  desc: 'Employee leaves at lunch.' },
]

const REASON_TYPES = [
  { value: 'PERSONAL', label: 'Personal', icon: Heart,      tone: 'rose' },
  { value: 'MEDICAL',  label: 'Medical',  icon: HeartPulse, tone: 'red' },
  { value: 'FAMILY',   label: 'Family',   icon: Users,      tone: 'amber' },
  { value: 'OFFICIAL', label: 'Official', icon: Briefcase,  tone: 'teal' },
  { value: 'OTHER',    label: 'Other',    icon: Sparkles,   tone: 'gray' },
]

const REASON_ICON_MAP = {
  PERSONAL: Heart,
  MEDICAL:  HeartPulse,
  FAMILY:   Users,
  OFFICIAL: Briefcase,
  OTHER:    Sparkles,
}
const reasonIcon = (t) => REASON_ICON_MAP[t] || Sparkles

// ── State ──────────────────────────────────────────────────────────────
const filter = ref('PENDING')
const rows = ref([])
const loading = ref(false)
const stats = ref({ pending: 0, approved: 0, rejected: 0, upcoming: 0 })
// Sidebar counts shown on each filter pill — uses the stats summary so the
// numbers stay accurate regardless of what `filter` is currently showing.
const counts = computed(() => ({
  PENDING: stats.value.pending,
  APPROVED: stats.value.approved,
  REJECTED: stats.value.rejected,
  '': stats.value.pending + stats.value.approved + stats.value.rejected,
}))

const kpiTiles = computed(() => [
  { key: 'pending',  filter: 'PENDING',  label: 'AWAITING REVIEW', icon: Loader2,      tone: 'amber',
    value: stats.value.pending,  foot: stats.value.pending > 0 ? 'needs your decision' : 'all caught up' },
  { key: 'approved', filter: 'APPROVED', label: 'APPROVED',        icon: CheckCircle2, tone: 'teal',
    value: stats.value.approved, foot: stats.value.approved === 1 ? '1 request granted' : `${stats.value.approved} requests granted` },
  { key: 'upcoming', filter: 'APPROVED', label: 'UPCOMING',        icon: Sparkles,     tone: 'orange',
    value: stats.value.upcoming, foot: 'today or future' },
  { key: 'rejected', filter: 'REJECTED', label: 'REJECTED',        icon: XCircle,      tone: 'red',
    value: stats.value.rejected, foot: 'historical record' },
])

const emptyTitle = computed(() => {
  if (filter.value === 'PENDING')  return 'No pending half-day requests'
  if (filter.value === 'APPROVED') return 'No approved half-days yet'
  if (filter.value === 'REJECTED') return 'No rejections in this view'
  return 'No half-day requests'
})
const emptySub = computed(() => {
  if (filter.value === 'PENDING') return 'When employees submit a half-day from self-service, the request lands here. You can also tag manually below.'
  if (filter.value === 'APPROVED') return 'Approved requests automatically mark the date as HALF_DAY in the daily roster.'
  if (filter.value === 'REJECTED') return 'Rejections are kept for the audit trail — employees see your decision note.'
  return 'Once employees start using the half-day flow, requests appear here.'
})

const setFilter = async (k) => {
  filter.value = k
  await reload()
}

const reload = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const [list, statRes] = await Promise.all([
      fetchHalfDayRequests(filter.value ? { status: filter.value, limit: 200 } : { limit: 200 }),
      fetchHalfDayStats(),
    ])
    rows.value = list.items || []
    stats.value = statRes
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load half-day requests')
  } finally {
    loading.value = false
  }
}

// ── Manual override modal ──────────────────────────────────────────────
const manualOpen = ref(false)
const submitting = ref(false)
const empQuery = ref('')
const employees = ref([])
const form = reactive({
  employee_id: '',
  half_day_date: new Date().toISOString().slice(0, 10),
  which_half: 'SECOND',
  reason_type: 'OFFICIAL',
  reason: '',
})

const initials = (name) => {
  if (!name) return '?'
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
}
const filteredEmployees = computed(() => {
  if (!empQuery.value) return employees.value
  const q = empQuery.value.toLowerCase()
  return employees.value.filter(e =>
    e.name?.toLowerCase().includes(q) ||
    e.code?.toLowerCase().includes(q) ||
    e.label?.toLowerCase().includes(q)
  )
})
const manualValid = computed(() =>
  form.employee_id && form.half_day_date && form.reason.trim().length >= 4
)

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const loadEmployees = async () => {
  if (employees.value.length) return
  try {
    const { data } = await axios.get(`${API}/hr/employees/?limit=200`, { headers: authHeader() })
    const items = data.items || data || []
    employees.value = items.map(e => ({
      id: e.id,
      name: e.full_name || e.employee_name || '—',
      code: e.employee_id || '—',
      dept: e.department || e.department_name || '—',
      initials: initials(e.full_name || e.employee_name || ''),
      label: `${e.full_name || ''} ${e.employee_id || ''}`,
    }))
  } catch (e) {
    // non-fatal — the search just shows "no matches"
  }
}

const openManual = (presetEmployee = null) => {
  form.employee_id = presetEmployee?.id || ''
  form.half_day_date = new Date().toISOString().slice(0, 10)
  form.which_half = 'SECOND'
  form.reason_type = 'OFFICIAL'
  form.reason = ''
  empQuery.value = presetEmployee ? `${presetEmployee.name} ${presetEmployee.code}` : ''
  manualOpen.value = true
  loadEmployees()
}
const closeManual = () => {
  if (submitting.value) return
  manualOpen.value = false
}
const submitManual = async () => {
  if (!manualValid.value || submitting.value) return
  submitting.value = true
  try {
    await adminCreateHalfDay({
      employee_id: form.employee_id,
      half_day_date: form.half_day_date,
      which_half: form.which_half,
      reason_type: form.reason_type,
      reason: form.reason.trim(),
    })
    toast.success(`Half-day tagged — ${form.half_day_date}`)
    manualOpen.value = false
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not tag half-day')
  } finally {
    submitting.value = false
  }
}

// ── Decisions ──────────────────────────────────────────────────────────
const rejectTarget = ref(null)
const rejecting = ref(false)
const openReject = (r) => { rejectTarget.value = r }
const confirmReject = async (reason) => {
  if (!rejectTarget.value) return
  rejecting.value = true
  try {
    await decideHalfDay(rejectTarget.value.id, 'REJECTED', reason || '')
    toast.success('Half-day request rejected')
    rejectTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not reject request')
  } finally { rejecting.value = false }
}

const approveRow = async (r) => {
  try {
    await decideHalfDay(r.id, 'APPROVED', '')
    toast.success(`Half-day approved · ${formatDate(r.half_day_date)} now marked HALF_DAY`)
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not approve request')
  }
}

const revertTarget = ref(null)
const reverting = ref(false)
const revertRow = (r) => { revertTarget.value = r }
const confirmRevert = async (reason) => {
  if (!revertTarget.value) return
  reverting.value = true
  try {
    await adminDeleteHalfDay(revertTarget.value.id, reason || '')
    toast.success(`Half-day reverted · ${formatDate(revertTarget.value.half_day_date)} recomputed from punches`)
    revertTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not revert')
  } finally {
    reverting.value = false
  }
}

// ── Formatters ─────────────────────────────────────────────────────────
const formatDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  : '—'
const formatDay = (iso) => iso ? String(new Date(iso).getDate()).padStart(2, '0') : '--'
const formatMonth = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { month: 'short' }).toUpperCase() : '--'
const formatYear = (iso) => iso ? new Date(iso).getFullYear() : ''

onMounted(reload)
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-hd { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

/* ════════════════════ HERO ════════════════════ */
.hd-banner {
  position: relative; overflow: hidden;
  padding: 24px 28px;
  border-radius: 22px;
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(251, 191, 36, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(20, 184, 166, 0.12), transparent 70%),
    var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  display: grid; grid-template-columns: 1fr auto; gap: 18px;
  align-items: center;
}
[data-theme="light"] .hd-banner {
  background:
    radial-gradient(140% 110% at 100% -10%, rgba(217, 119, 6, 0.18), transparent 65%),
    radial-gradient(120% 110% at 0% 110%, rgba(13, 148, 136, 0.10), transparent 70%),
    rgba(255, 250, 240, 0.92);
}
.hd-banner-glow {
  position: absolute; inset: -50% -10% auto -10%;
  height: 140%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.20), transparent 60%);
  filter: blur(60px);
  z-index: 0; pointer-events: none;
}
.hd-sun-arc {
  position: absolute; top: -40px; right: -50px;
  width: 240px; height: 240px;
  z-index: 1; pointer-events: none;
  opacity: 0.55;
}
.arc-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.40);
  animation: hd-arc-rotate 60s linear infinite;
}
.arc-a { inset: 0; }
.arc-b { inset: 18%; animation-duration: 40s; animation-direction: reverse; border-color: rgba(20, 184, 166, 0.32); }
[data-theme="light"] .arc-a { border-color: rgba(180, 83, 9, 0.40); }
[data-theme="light"] .arc-b { border-color: rgba(13, 148, 136, 0.30); }
@keyframes hd-arc-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.hd-banner-text { position: relative; z-index: 2; min-width: 0; }
.att-banner-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.6px; text-transform: uppercase;
  font-weight: 800;
  color: var(--att-amber-200);
}
[data-theme="light"] .att-banner-eyebrow { color: var(--att-amber-700); }
.att-banner-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.7);
  animation: hd-pulse 2.5s ease-in-out infinite;
}
@keyframes hd-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(1.3); }
}
.att-banner-title {
  margin: 6px 0 4px;
  font-size: 26px; font-weight: 900; letter-spacing: -0.5px;
  color: var(--hr-text);
  display: flex; align-items: baseline; gap: 12px;
}
.att-banner-divider { color: var(--att-amber-300); font-weight: 400; }
[data-theme="light"] .att-banner-divider { color: var(--att-amber-600); }
.att-banner-sub {
  margin: 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-muted);
  max-width: 720px;
}
.att-banner-sub strong { color: var(--att-orange-300); font-weight: 700; }
.att-banner-sub em { color: var(--att-teal-200); font-style: normal; font-weight: 600; }
[data-theme="light"] .att-banner-sub strong { color: var(--att-orange-700); }
[data-theme="light"] .att-banner-sub em { color: var(--att-teal-700); }

.hd-banner-actions { position: relative; z-index: 2; }
.hd-manual-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%);
  background-size: 200% 200%;
  color: #1f1408;
  font-weight: 800; font-size: 12.5px; letter-spacing: 0.3px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 26px -10px rgba(251, 146, 60, 0.55);
  transition: background-position .35s, box-shadow .25s;
}
.hd-manual-cta:hover { background-position: 100% 50%; box-shadow: 0 18px 36px -10px rgba(251, 146, 60, 0.72); }
[data-theme="light"] .hd-manual-cta {
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c);
  color: #fff;
}

/* ════════════════════ KPI STRIP ════════════════════ */
.hd-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.hd-kpi {
  position: relative;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--att-glass);
  /* Stronger border than the global glass stroke — KPI tiles should read
     as discrete cards, not faded ghosts on the warm-cream wash. */
  border: 1px solid rgba(251, 191, 36, 0.45);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 8px 22px -14px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .hd-kpi {
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 8px 22px -14px rgba(120, 53, 15, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.hd-kpi.active {
  border-color: var(--accent, #fbbf24);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(251, 191, 36, 0.4));
}
[data-theme="light"] .hd-kpi.active {
  border-color: var(--accent, #d97706);
  box-shadow: 0 18px 36px -18px var(--accent-shadow, rgba(217, 119, 6, 0.40));
}
.kpi-aurora {
  position: absolute; inset: -50% -30% auto -30%;
  height: 100%;
  background: radial-gradient(60% 60% at 50% 40%, var(--accent-glow, rgba(251, 191, 36, 0.22)), transparent 65%);
  filter: blur(40px); z-index: -1; opacity: 0;
  transition: opacity .35s;
  pointer-events: none;
}
.hd-kpi:hover .kpi-aurora,
.hd-kpi.active .kpi-aurora { opacity: 1; }
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
}
.kpi-foot { font-size: 10px; color: var(--hr-text-muted); font-weight: 600; letter-spacing: 0.3px; }

.tone-amber  { --accent: #f59e0b; --accent-glow: rgba(251, 191, 36, 0.24); --accent-shadow: rgba(251, 146, 60, 0.45); }
.tone-teal   { --accent: #0d9488; --accent-glow: rgba(20, 184, 166, 0.24); --accent-shadow: rgba(13, 148, 136, 0.45); }
.tone-orange { --accent: #ea580c; --accent-glow: rgba(234, 88, 12, 0.22);  --accent-shadow: rgba(234, 88, 12, 0.45); }
.tone-red    { --accent: #b91c1c; --accent-glow: rgba(185, 28, 28, 0.22);  --accent-shadow: rgba(185, 28, 28, 0.45); }

/* ════════════════════ TOOLBAR ════════════════════ */
.hd-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--att-glass);
  border: 1px solid rgba(251, 191, 36, 0.40);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 16px -14px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .hd-toolbar {
  border-color: rgba(180, 83, 9, 0.36);
  box-shadow:
    0 6px 16px -14px rgba(120, 53, 15, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.hd-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.hd-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.18);
  color: var(--hr-text-muted);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, transform .18s;
}
.hd-pill:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(251, 191, 36, 0.40); }
.hd-pill.active {
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 6px 18px -8px rgba(251, 146, 60, 0.55);
}
.hd-pill-dot { width: 6px; height: 6px; border-radius: 50%; }
.hd-pill-count {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 10px; font-weight: 800;
  color: inherit;
}
[data-theme="light"] .hd-pill {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(180, 83, 9, 0.22);
  color: #6b5840;
}
[data-theme="light"] .hd-pill.active {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
}
[data-theme="light"] .hd-pill-count { background: rgba(255, 255, 255, 0.45); color: inherit; }

.hd-refresh {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
  font: inherit; font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: background .2s, border-color .2s, transform .18s;
}
.hd-refresh:hover { background: rgba(251, 191, 36, 0.10); transform: translateY(-1px); }
.hd-refresh.spinning svg { animation: hd-spin 0.9s linear infinite; }
@keyframes hd-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .hd-refresh {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(180, 83, 9, 0.22);
}

/* ════════════════════ ROW LIST ════════════════════ */
.hd-list { display: flex; flex-direction: column; gap: 10px; }
.hd-row {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 14px 18px;
  border-radius: 16px;
  background: var(--att-glass);
  /* Same reasoning as .hd-kpi — bump to 0.45 so the card outline reads
     against the warm hero gradient behind it in both themes. */
  border: 1px solid rgba(251, 191, 36, 0.42);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 6px 18px -14px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  isolation: isolate;
  transition: border-color .3s, box-shadow .3s, transform .25s;
}
[data-theme="light"] .hd-row {
  border-color: rgba(180, 83, 9, 0.38);
  box-shadow:
    0 6px 18px -14px rgba(120, 53, 15, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.hd-row:hover {
  border-color: rgba(251, 191, 36, 0.65);
}
[data-theme="light"] .hd-row:hover {
  border-color: rgba(180, 83, 9, 0.60);
}
/* Status accent on the left edge — 4 px thick so it reads as part of the
   card chrome, not a hairline. */
.hd-row.is-pending  { border-left: 4px solid #f59e0b; }
.hd-row.is-approved { border-left: 4px solid #0d9488; }
.hd-row.is-rejected { border-left: 4px solid #b91c1c; }
.hd-row.is-cancelled { border-left: 4px solid #64748b; opacity: 0.75; }
.hd-row.is-override::after {
  content: '';
  position: absolute; left: 4px; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, #fbbf24, #ea580c);
  border-radius: 2px;
}

/* Date stack — left of the row */
.hd-when { display: flex; gap: 14px; align-items: center; }
.hd-date-stack {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  min-width: 60px;
}
.hd-day { font-size: 28px; font-weight: 900; line-height: 1; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.hd-mon { font-size: 9.5px; letter-spacing: 1.5px; font-weight: 800; color: var(--att-amber-300); }
.hd-yr  { font-size: 9px; color: var(--hr-text-muted); font-weight: 600; }
[data-theme="light"] .hd-mon { color: var(--att-amber-700); }

/* Half-of-day visual */
.hd-half-vis { display: flex; flex-direction: column; gap: 4px; }
.hd-vis-track {
  position: relative;
  display: flex; align-items: center;
  width: 110px;
  height: 22px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
}
[data-theme="light"] .hd-vis-track { background: rgba(255, 250, 240, 0.7); border-color: rgba(180, 83, 9, 0.22); }
.hd-vis-am, .hd-vis-pm {
  position: relative; z-index: 2;
  flex: 1; text-align: center;
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  color: var(--hr-text-muted);
}
.hd-vis-divider {
  width: 1px; height: 100%;
  background: rgba(251, 191, 36, 0.30);
  position: relative; z-index: 2;
}
.hd-vis-fill {
  position: absolute; top: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.35), rgba(234, 88, 12, 0.30));
  transform-origin: left center;
}
.hd-half-vis[data-half="FIRST"]  .hd-vis-fill { left: 0;   right: 50%; }
.hd-half-vis[data-half="SECOND"] .hd-vis-fill { left: 50%; right: 0;   }
.hd-half-vis[data-half="FIRST"]  .hd-vis-am { color: #fbbf24; }
.hd-half-vis[data-half="SECOND"] .hd-vis-pm { color: #fbbf24; }
[data-theme="light"] .hd-half-vis[data-half="FIRST"]  .hd-vis-am { color: #b45309; }
[data-theme="light"] .hd-half-vis[data-half="SECOND"] .hd-vis-pm { color: #b45309; }
.hd-vis-tag {
  font-size: 9px; letter-spacing: 0.4px; font-weight: 700;
  color: var(--hr-text-muted);
}

/* Middle column — body */
.hd-body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.hd-emp { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0; }
.hd-emp-name { font-size: 13px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px; }
.hd-emp-code { font-size: 10.5px; font-weight: 700; color: var(--att-amber-200); }
.hd-emp-dept { font-size: 10.5px; color: var(--hr-text-muted); font-weight: 600; }
.hd-emp-dot { color: var(--hr-text-muted); opacity: 0.55; }
[data-theme="light"] .hd-emp-code { color: var(--att-amber-700); }
.hd-reason {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 11.5px; color: var(--hr-text-muted);
}
.hd-reason-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px;
}
.hd-reason-tag[data-type="PERSONAL"] { background: rgba(244, 114, 182, 0.16); color: #f9a8d4; }
.hd-reason-tag[data-type="MEDICAL"]  { background: rgba(220, 38, 38, 0.16);   color: #fca5a5; }
.hd-reason-tag[data-type="FAMILY"]   { background: rgba(251, 191, 36, 0.16);  color: #fcd34d; }
.hd-reason-tag[data-type="OFFICIAL"] { background: rgba(20, 184, 166, 0.16);  color: #5eead4; }
.hd-reason-tag[data-type="OTHER"]    { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; }
[data-theme="light"] .hd-reason-tag[data-type="PERSONAL"] { background: rgba(244, 114, 182, 0.20); color: #be185d; }
[data-theme="light"] .hd-reason-tag[data-type="MEDICAL"]  { background: rgba(220, 38, 38, 0.20);   color: #7f1d1d; }
[data-theme="light"] .hd-reason-tag[data-type="FAMILY"]   { background: rgba(251, 191, 36, 0.30);  color: #92400e; }
[data-theme="light"] .hd-reason-tag[data-type="OFFICIAL"] { background: rgba(20, 184, 166, 0.20);  color: #115e59; }
[data-theme="light"] .hd-reason-tag[data-type="OTHER"]    { background: rgba(148, 163, 184, 0.20); color: #334155; }

.hd-reason-text {
  display: inline-flex; align-items: center; gap: 5px;
  font-style: italic;
}
.hd-decision-note {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 2px;
  padding: 4px 10px;
  font-size: 10.5px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--hr-text-muted);
  align-self: flex-start;
}
[data-theme="light"] .hd-decision-note { background: rgba(180, 83, 9, 0.08); }

/* Right column — actions */
.hd-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.hd-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
}
.hd-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.hd-status.is-pending   { background: rgba(245, 158, 11, 0.16); color: #fcd34d; }
.hd-status.is-approved  { background: rgba(13, 148, 136, 0.16); color: #5eead4; }
.hd-status.is-rejected  { background: rgba(185, 28, 28, 0.16);  color: #fca5a5; }
.hd-status.is-cancelled { background: rgba(100, 116, 139, 0.16); color: #cbd5e1; }
[data-theme="light"] .hd-status.is-pending   { background: rgba(245, 158, 11, 0.18); color: #92400e; }
[data-theme="light"] .hd-status.is-approved  { background: rgba(13, 148, 136, 0.18); color: #115e59; }
[data-theme="light"] .hd-status.is-rejected  { background: rgba(185, 28, 28, 0.18);  color: #7f1d1d; }
[data-theme="light"] .hd-status.is-cancelled { background: rgba(100, 116, 139, 0.18); color: #334155; }

.hd-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
}
.override-badge {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(234, 88, 12, 0.18));
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
}
[data-theme="light"] .override-badge { color: #92400e; border-color: rgba(180, 83, 9, 0.4); }

.hd-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid; cursor: pointer;
  transition: background .2s, color .2s, border-color .2s, box-shadow .2s;
}
.hd-btn-approve {
  background: rgba(20, 184, 166, 0.10);
  color: #5eead4;
  border-color: rgba(20, 184, 166, 0.45);
}
.hd-btn-approve:hover { background: rgba(20, 184, 166, 0.22); box-shadow: 0 10px 22px -10px rgba(20, 184, 166, 0.55); }
.hd-btn-reject {
  background: rgba(220, 38, 38, 0.10);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.40);
}
.hd-btn-reject:hover { background: rgba(220, 38, 38, 0.22); box-shadow: 0 10px 22px -10px rgba(220, 38, 38, 0.55); }
.hd-btn-revert {
  background: rgba(148, 163, 184, 0.10);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.40);
}
.hd-btn-revert:hover { background: rgba(148, 163, 184, 0.22); }
[data-theme="light"] .hd-btn-approve { background: rgba(20, 184, 166, 0.14); color: #115e59; border-color: rgba(20, 184, 166, 0.50); }
[data-theme="light"] .hd-btn-reject  { background: rgba(220, 38, 38, 0.10);  color: #7f1d1d; border-color: rgba(220, 38, 38, 0.45); }
[data-theme="light"] .hd-btn-revert  { background: rgba(100, 116, 139, 0.10); color: #334155; border-color: rgba(100, 116, 139, 0.40); }

/* Empty state */
.hd-empty {
  position: relative;
  padding: 40px 24px;
  border-radius: 20px;
  background: var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  text-align: center;
  overflow: hidden;
  isolation: isolate;
}
.hd-empty-glow {
  position: absolute; inset: -40% -10% auto -10%;
  height: 80%;
  background: radial-gradient(50% 50% at 50% 30%, rgba(251, 191, 36, 0.18), transparent 60%);
  filter: blur(50px);
  z-index: -1;
}
.hd-empty-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 64px; height: 64px;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  margin-bottom: 12px;
  animation: hd-empty-pulse 3s ease-in-out infinite;
}
@keyframes hd-empty-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50%      { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
}
.hd-empty h3 { margin: 0 0 4px; font-size: 17px; font-weight: 800; color: var(--hr-text); }
.hd-empty p  { margin: 0 0 16px; font-size: 12px; color: var(--hr-text-muted); max-width: 480px; margin-inline: auto; }

/* ════════════════════ MANUAL TAG MODAL ════════════════════ */
.hd-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 11, 8, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
[data-theme="light"] .hd-modal-overlay { background: rgba(120, 53, 15, 0.40); }
.hd-modal {
  width: 100%; max-width: 560px; max-height: calc(100vh - 60px);
  overflow-y: auto;
  background: rgba(40, 30, 22, 0.92);
  border: 1px solid rgba(251, 191, 36, 0.30);
  border-radius: 22px;
  backdrop-filter: blur(20px);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
  display: flex; flex-direction: column;
}
[data-theme="light"] .hd-modal {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(180, 83, 9, 0.30);
  box-shadow: 0 30px 60px -20px rgba(120, 53, 15, 0.35);
}
.hd-modal-head {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 12px; align-items: flex-start;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(251, 191, 36, 0.16);
}
[data-theme="light"] .hd-modal-head { border-bottom-color: rgba(180, 83, 9, 0.16); }
.hd-modal-icon {
  width: 36px; height: 36px;
  border-radius: 11px;
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px -8px rgba(251, 146, 60, 0.6);
}
.hd-modal-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--hr-text); }
.hd-modal-head p { margin: 2px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.hd-modal-close {
  background: transparent;
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 8px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: background .2s, color .2s;
}
.hd-modal-close:hover { background: rgba(251, 191, 36, 0.10); color: var(--hr-text); }

.hd-form { padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; }
.hd-field { display: flex; flex-direction: column; gap: 6px; }
.hd-field label {
  font-size: 9.5px; letter-spacing: 1.2px; text-transform: uppercase;
  font-weight: 800;
  color: var(--att-amber-200);
}
.hd-field label em { color: var(--hr-text-muted); font-style: normal; font-weight: 500; text-transform: none; letter-spacing: 0; }
[data-theme="light"] .hd-field label { color: var(--att-amber-700); }
.hd-input, .hd-textarea {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 10px;
  font: inherit; font-size: 13px;
  color: var(--hr-text);
  color-scheme: dark;
  resize: vertical;
}
[data-theme="light"] .hd-input, [data-theme="light"] .hd-textarea {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.22);
  color-scheme: light;
}
.hd-input:focus, .hd-textarea:focus {
  outline: none;
  border-color: rgba(251, 146, 60, 0.55);
  background: rgba(251, 191, 36, 0.06);
}
.hd-textarea { min-height: 76px; line-height: 1.5; }

/* Employee search */
.hd-emp-search {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 10px;
  color: var(--hr-text-muted);
}
.hd-emp-search input {
  flex: 1; border: none; background: transparent;
  font: inherit; font-size: 13px; color: var(--hr-text);
  outline: none;
}
[data-theme="light"] .hd-emp-search { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.22); }
.hd-emp-options {
  display: flex; flex-direction: column; gap: 4px;
  max-height: 240px; overflow-y: auto;
  padding-top: 2px;
}
.hd-emp-option {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 10px; align-items: center;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
  transition: background .18s, border-color .18s, transform .14s;
}
.hd-emp-option:hover { background: rgba(251, 191, 36, 0.08); transform: translateX(2px); }
.hd-emp-option.selected { background: rgba(251, 191, 36, 0.16); border-color: rgba(251, 191, 36, 0.45); }
.hd-emp-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
}
.hd-emp-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.hd-emp-meta .hd-emp-name { font-size: 12px; }
.hd-emp-meta .hd-emp-sub { font-size: 10.5px; color: var(--hr-text-muted); font-weight: 600; }
.hd-emp-check { color: #5eead4; }
[data-theme="light"] .hd-emp-check { color: #115e59; }
.hd-emp-empty { font-size: 11.5px; color: var(--hr-text-muted); padding: 4px 4px; font-style: italic; }

/* Half picker */
.hd-half-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hd-half-card {
  position: relative;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(251, 191, 36, 0.18);
  text-align: left; cursor: pointer;
  transition: border-color .25s, background .25s, transform .18s;
}
.hd-half-card:hover { border-color: rgba(251, 191, 36, 0.45); transform: translateY(-1px); }
.hd-half-card.active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(234, 88, 12, 0.10));
  border-color: rgba(251, 191, 36, 0.55);
}
.hd-half-visual {
  display: flex; height: 18px;
  border-radius: 5px; overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 6px;
  border: 1px solid rgba(251, 191, 36, 0.18);
}
.hd-half-am, .hd-half-pm {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 8.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--hr-text-muted);
  transition: background .25s, color .25s;
}
.hd-half-am.off, .hd-half-pm.off {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.40), rgba(234, 88, 12, 0.30));
  color: #1f1408;
}
.hd-half-label { display: block; font-size: 12.5px; font-weight: 800; color: var(--hr-text); }
.hd-half-desc { display: block; font-size: 10px; color: var(--hr-text-muted); margin-top: 1px; }
.hd-half-check {
  position: absolute; top: 8px; right: 8px;
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  color: #fff;
  border-radius: 50%;
  padding: 2px;
}
[data-theme="light"] .hd-half-card { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.20); }
[data-theme="light"] .hd-half-visual { background: rgba(255, 255, 255, 0.50); border-color: rgba(180, 83, 9, 0.18); }

/* Reason-type chips */
.hd-reason-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.hd-rt-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid;
  cursor: pointer;
  transition: background .22s, border-color .22s, transform .18s;
}
.hd-rt-chip:hover { transform: translateY(-1px); }
.hd-rt-chip.tone-rose   { color: #f9a8d4; border-color: rgba(244, 114, 182, 0.30); }
.hd-rt-chip.tone-red    { color: #fca5a5; border-color: rgba(220, 38, 38, 0.30); }
.hd-rt-chip.tone-amber  { color: #fcd34d; border-color: rgba(251, 191, 36, 0.30); }
.hd-rt-chip.tone-teal   { color: #5eead4; border-color: rgba(20, 184, 166, 0.30); }
.hd-rt-chip.tone-gray   { color: #cbd5e1; border-color: rgba(148, 163, 184, 0.30); }
.hd-rt-chip.tone-rose.active   { background: rgba(244, 114, 182, 0.22);  color: #fbcfe8; }
.hd-rt-chip.tone-red.active    { background: rgba(220, 38, 38, 0.22);    color: #fecaca; }
.hd-rt-chip.tone-amber.active  { background: rgba(251, 191, 36, 0.22);   color: #fef08a; }
.hd-rt-chip.tone-teal.active   { background: rgba(20, 184, 166, 0.22);   color: #ccfbf1; }
.hd-rt-chip.tone-gray.active   { background: rgba(148, 163, 184, 0.22);  color: #e2e8f0; }
[data-theme="light"] .hd-rt-chip { background: rgba(255, 250, 240, 0.7); }
[data-theme="light"] .hd-rt-chip.tone-rose  { color: #be185d; }
[data-theme="light"] .hd-rt-chip.tone-red   { color: #7f1d1d; }
[data-theme="light"] .hd-rt-chip.tone-amber { color: #92400e; }
[data-theme="light"] .hd-rt-chip.tone-teal  { color: #115e59; }
[data-theme="light"] .hd-rt-chip.tone-gray  { color: #334155; }

/* Modal footer */
.hd-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(251, 191, 36, 0.16);
}
[data-theme="light"] .hd-modal-foot { border-top-color: rgba(180, 83, 9, 0.16); }
.hd-btn-ghost {
  background: transparent;
  color: var(--hr-text-muted);
  border-color: rgba(251, 191, 36, 0.22);
}
.hd-btn-ghost:hover { background: rgba(251, 191, 36, 0.08); color: var(--hr-text); }
.hd-btn-primary {
  background: linear-gradient(135deg, #fde68a, #fbbf24 55%, #f59e0b);
  color: #1f1408;
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 10px 22px -10px rgba(251, 146, 60, 0.55);
}
.hd-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
[data-theme="light"] .hd-btn-primary { background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c); color: #fff; }
.spin { animation: hd-spin 0.9s linear infinite; }

/* Responsive */
@media (max-width: 880px) {
  .hd-banner { grid-template-columns: 1fr; }
  .hd-banner-actions { justify-self: flex-start; }
  .hd-row { grid-template-columns: 1fr; gap: 12px; }
  .hd-actions { justify-content: flex-start; }
}
</style>
