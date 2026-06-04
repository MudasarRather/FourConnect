<template>
  <section class="edoc-section edoc-req">
    <!-- ═══════════════ HERO BANNER ═══════════════ -->
    <Motion as="header" class="req-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="req-banner-glow" />
      <span class="req-banner-orbit" aria-hidden="true">
        <span class="orbit-a" />
        <span class="orbit-b" />
      </span>
      <div class="banner-text">
        <span class="banner-eyebrow">
          <span class="banner-eyebrow-dot" />
          Inbound · Employee Requests · Letter Queue
        </span>
        <h2 class="banner-title">
          <span>Document</span><span class="t-divider">·</span><span>Request Queue</span>
        </h2>
        <p class="banner-sub">
          Every letter or certificate an employee has asked HR to issue — experience letters, salary certificates,
          NDAs, address proofs, custom requests. Mark in-progress, fulfil with the issued document, or reject with a reason.
        </p>
      </div>
      <div class="banner-kpis">
        <Motion v-for="(k, i) in kpis" :key="k.key"
          as="article" class="bk-tile" :class="`tone-${k.tone}`"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.12 + i * 0.06, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="bk-icon"><component :is="k.icon" :size="14" /></span>
          <span class="bk-num">{{ k.value }}</span>
          <span class="bk-lab">{{ k.label }}</span>
        </Motion>
      </div>
    </Motion>

    <!-- ═══════════════ FILTER BAR ═══════════════ -->
    <Motion as="div" class="req-toolbar"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }"
    >
      <div class="filter-cluster">
        <span class="filter-label"><Filter :size="11" />Status</span>
        <div class="chip-row">
          <button v-for="s in STATUSES" :key="s.key"
            class="filter-chip" :class="{ active: filters.status === s.key, [`tone-${s.tone}`]: true }"
            @click="setStatus(s.key)"
          >
            <span class="chip-dot" />
            {{ s.label }}
            <span v-if="countsByStatus[s.key] !== undefined" class="chip-count">{{ countsByStatus[s.key] }}</span>
          </button>
        </div>
      </div>

      <div class="filter-cluster">
        <span class="filter-label"><Layers :size="11" />Type</span>
        <select v-model="filters.request_type" class="type-select" @change="refresh">
          <option :value="''">All types</option>
          <option v-for="t in REQUEST_TYPE_META" :key="t.key" :value="t.key">{{ t.label }}</option>
        </select>
      </div>

      <div class="filter-cluster">
        <span class="filter-label"><User :size="11" />Employee</span>
        <EdocEmployeeFilter v-model="filters.employee_id" @update:modelValue="onEmployeeChange" />
      </div>

      <div class="filter-cluster grow">
        <span class="filter-label"><Search :size="11" />Search</span>
        <div class="search-wrap">
          <input v-model="searchQ" placeholder="Reason, purpose, custom title…"
            class="search-input" @keydown.enter="refresh" />
          <button v-if="searchQ" class="search-clear" @click="searchQ = ''; refresh()">
            <X :size="13" />
          </button>
        </div>
      </div>

      <Motion as="button" class="refresh-btn"
        :whileTap="{ scale: 0.95 }"
        :disabled="loading"
        @click="refresh"
      >
        <RefreshCcw :size="13" :class="{ spinning: loading }" />
        Refresh
      </Motion>
    </Motion>

    <!-- ═══════════════ REQUEST GRID ═══════════════ -->
    <div v-if="loading && !items.length" class="loading-grid">
      <div v-for="i in 4" :key="'s-' + i" class="skeleton-card" />
    </div>

    <Motion v-else-if="!items.length"
      as="article" class="empty-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="empty-icon"><Inbox :size="32" /></span>
      <h3>The queue is clear</h3>
      <p>No employee document requests match the current filters. Try widening the status filter or clearing the search.</p>
    </Motion>

    <div v-else class="req-grid">
      <Motion v-for="(r, i) in items" :key="r.id"
        as="article"
        class="req-card"
        :class="[`status-${r.status.toLowerCase()}`, { 'is-fresh': isFresh(r) }]"
        :initial="{ opacity: 0, y: 16, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.42, delay: 0.04 * (i % 8), ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="card-aurora" aria-hidden="true" />
        <span class="card-rail" aria-hidden="true" />

        <!-- ── Card head ── -->
        <header class="card-head">
          <div class="emp-avatar">
            {{ initials(r.employee_name) }}
            <span class="avatar-ring" />
          </div>
          <div class="head-text">
            <strong class="emp-name">{{ r.employee_name || 'Unknown employee' }}</strong>
            <span class="emp-meta">
              <span v-if="r.employee_code">{{ r.employee_code }}</span>
              <span v-if="r.department_name" class="mt-dot">·</span>
              <span v-if="r.department_name">{{ r.department_name }}</span>
            </span>
          </div>
          <span class="status-pill" :style="{
            '--p-fg': statusMeta(r.status).fg,
            '--p-bg': statusMeta(r.status).bg,
            '--p-ring': statusMeta(r.status).ring,
          }">
            <span class="pill-dot" />
            {{ statusMeta(r.status).label }}
          </span>
        </header>

        <!-- ── Request type ── -->
        <div class="req-type">
          <span class="rt-icon"><component :is="typeIcon(r.request_type)" :size="14" /></span>
          <div class="rt-text">
            <strong class="rt-label">{{ requestTitle(r) }}</strong>
            <span class="rt-tag">{{ typeMeta(r.request_type).tag }} · {{ relTime(r.created_at) }} ago</span>
          </div>
        </div>

        <!-- ── Reason / purpose ── -->
        <p class="req-reason">{{ r.reason }}</p>
        <div v-if="r.purpose || r.notes" class="req-extras">
          <span v-if="r.purpose" class="extra-chip"><Target :size="10" />{{ r.purpose }}</span>
          <span v-if="r.notes" class="extra-chip note" :title="r.notes">
            <StickyNote :size="10" />{{ truncate(r.notes, 38) }}
          </span>
        </div>

        <!-- ── Decision note shown for terminal/in-progress states ── -->
        <div v-if="r.decision_notes && ['FULFILLED', 'REJECTED', 'IN_PROGRESS'].includes(r.status)"
             class="decision-note" :class="r.status.toLowerCase()">
          <strong>{{ r.status === 'FULFILLED' ? 'Fulfilled' : r.status === 'REJECTED' ? 'Rejection reason' : 'HR note' }}:</strong>
          <span>{{ r.decision_notes }}</span>
          <span v-if="r.decided_by_name" class="dec-by">— {{ r.decided_by_name }}</span>
        </div>

        <!-- ── Action row ── -->
        <footer class="card-foot">
          <span class="foot-time">
            <Clock :size="10" />
            <span>{{ formatDate(r.created_at) }}</span>
          </span>
          <div class="card-actions" v-if="r.status === 'PENDING' || r.status === 'IN_PROGRESS'">
            <Motion as="button"
              v-if="r.status === 'PENDING'"
              class="act-btn ghost"
              :whileTap="{ scale: 0.96 }"
              @click="openDecide(r, 'IN_PROGRESS')"
            >
              <PlayCircle :size="13" /> <span>Mark In-Progress</span>
            </Motion>
            <Motion as="button"
              class="act-btn primary"
              :whileTap="{ scale: 0.96 }"
              @click="openDecide(r, 'FULFILLED')"
            >
              <CheckCircle2 :size="13" /> <span>Fulfil</span>
            </Motion>
            <Motion as="button"
              class="act-btn danger"
              :whileTap="{ scale: 0.96 }"
              @click="openDecide(r, 'REJECTED')"
            >
              <XCircle :size="13" /> <span>Reject</span>
            </Motion>
          </div>
          <div v-else class="card-actions terminal">
            <span class="terminal-label">
              <Lock :size="10" />
              {{ r.status === 'CANCELLED' ? 'Cancelled by employee' : 'Closed' }}
            </span>
          </div>
        </footer>
      </Motion>
    </div>

    <!-- ═══════════════ DECISION MODAL ═══════════════ -->
    <EdocDecideRequestModal
      v-if="decideTarget"
      :request="decideTarget"
      :initial-action="decideAction"
      @close="decideTarget = null"
      @decided="onDecided"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Filter, Layers, Search, X, RefreshCcw, Inbox, Clock, Target, StickyNote,
  Mail, FileSignature, Award, Briefcase, Wallet, Shield, FileText, MapPin, Plane, Stamp,
  PlayCircle, CheckCircle2, XCircle, Lock,
  Send, AlertCircle, ClipboardCheck, Hourglass, User,
} from 'lucide-vue-next'
import {
  fetchAdminRequests, REQUEST_TYPE_META, REQUEST_STATUS_META,
} from '@/composables/useEmployeeDocuments'
import { useToast } from '@/composables/useToast'
import EdocDecideRequestModal from '../modals/EdocDecideRequestModal.vue'
import EdocEmployeeFilter from '../components/EdocEmployeeFilter.vue'

const { success, error } = useToast()

// ─── State ─────────────────────────────────────────────────────────────────
const items = ref([])
const total = ref(0)
const loading = ref(false)
const searchQ = ref('')

const filters = reactive({
  status: 'PENDING',
  request_type: '',
  employee_id: null,
  q: '',
  page: 1,
  limit: 50,
})

const STATUSES = [
  { key: '',            label: 'All',         tone: 'neutral' },
  { key: 'PENDING',     label: 'Pending',     tone: 'amber'   },
  { key: 'IN_PROGRESS', label: 'In progress', tone: 'sky'     },
  { key: 'FULFILLED',   label: 'Fulfilled',   tone: 'emerald' },
  { key: 'REJECTED',    label: 'Rejected',    tone: 'red'     },
  { key: 'CANCELLED',   label: 'Cancelled',   tone: 'slate'   },
]

// ─── Static catalogue exposed to template ──────────────────────────────────
const TYPE_ICON_MAP = {
  EXPERIENCE_LETTER: Mail,
  RELIEVING_LETTER:  FileSignature,
  CONFIRMATION_LETTER: Award,
  APPOINTMENT_LETTER: Briefcase,
  SALARY_CERTIFICATE: Wallet,
  NDA: Shield,
  OFFER_LETTER: FileText,
  ADDRESS_PROOF: MapPin,
  NO_OBJECTION: Plane,
  CUSTOM: Stamp,
}
const typeIcon = (k) => TYPE_ICON_MAP[k] || Mail
const typeMeta = (k) => REQUEST_TYPE_META.find(t => t.key === k) || REQUEST_TYPE_META[REQUEST_TYPE_META.length - 1]
const statusMeta = (k) => REQUEST_STATUS_META[k] || REQUEST_STATUS_META.PENDING
function requestTitle(r) {
  if (r.request_type === 'CUSTOM' && r.custom_title) return r.custom_title
  return typeMeta(r.request_type).label
}

// ─── KPI tiles for the banner ─────────────────────────────────────────────
const countsByStatus = ref({})

const kpis = computed(() => [
  { key: 'pending',     label: 'Awaiting review', icon: Send,           value: countsByStatus.value.PENDING || 0,     tone: 'amber'   },
  { key: 'in_progress', label: 'In progress',     icon: Hourglass,      value: countsByStatus.value.IN_PROGRESS || 0, tone: 'sky'     },
  { key: 'fulfilled',   label: 'Fulfilled',       icon: ClipboardCheck, value: countsByStatus.value.FULFILLED || 0,   tone: 'emerald' },
  { key: 'rejected',    label: 'Rejected',        icon: AlertCircle,    value: countsByStatus.value.REJECTED || 0,    tone: 'red'     },
])

async function loadCounts() {
  // Pull tiny per-status counts for the KPI strip — five small queries.
  const queries = ['PENDING', 'IN_PROGRESS', 'FULFILLED', 'REJECTED', 'CANCELLED']
  const out = {}
  await Promise.all(queries.map(async (s) => {
    try {
      const data = await fetchAdminRequests({ status: s, page: 1, limit: 1 })
      out[s] = data.total || 0
    } catch { out[s] = 0 }
  }))
  countsByStatus.value = out
}

// ─── Fetch ────────────────────────────────────────────────────────────────
async function refresh() {
  loading.value = true
  try {
    filters.q = searchQ.value || ''
    const data = await fetchAdminRequests({
      status: filters.status || undefined,
      request_type: filters.request_type || undefined,
      employee_id: filters.employee_id || undefined,
      q: filters.q || undefined,
      page: filters.page,
      limit: filters.limit,
    })
    items.value = data.items || []
    total.value = data.total || 0
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to load requests')
    items.value = []; total.value = 0
  } finally {
    loading.value = false
  }
  loadCounts()
}

function setStatus(s) {
  filters.status = s
  filters.page = 1
  refresh()
}

function onEmployeeChange() {
  filters.page = 1
  refresh()
}

// ─── Decision modal ───────────────────────────────────────────────────────
const decideTarget = ref(null)
const decideAction = ref('FULFILLED')
function openDecide(r, action) {
  decideTarget.value = r
  decideAction.value = action
}
function onDecided(updated) {
  success('Request updated')
  const idx = items.value.findIndex(x => x.id === updated.id)
  if (idx !== -1) items.value[idx] = updated
  loadCounts()
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()
}
function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function relTime(d) {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day}d`
  return `${Math.floor(day / 30)}mo`
}
function isFresh(r) {
  if (r.status !== 'PENDING') return false
  return (Date.now() - new Date(r.created_at).getTime()) < 24 * 3600 * 1000
}

onMounted(refresh)
</script>

<style scoped>
@import '../../../../styles/employee-documents-theme.css';

/* ════════════════════════════════════════════════════════════════════════
   BANNER
   ════════════════════════════════════════════════════════════════════════ */
.req-banner {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  padding: 28px 32px;
  border-radius: 24px;
  background:
    radial-gradient(110% 80% at 100% 0%, rgba(251, 146, 60, 0.16), transparent 65%),
    radial-gradient(80% 60% at 0% 100%, rgba(251, 191, 36, 0.14), transparent 65%),
    rgba(20, 15, 12, 0.78);
  border: 1px solid rgba(251, 191, 36, 0.26);
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 30px 70px -30px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transform: translateZ(0);
}
[data-theme="light"] .req-banner {
  background:
    radial-gradient(110% 80% at 100% 0%, rgba(251, 146, 60, 0.22), transparent 65%),
    radial-gradient(80% 60% at 0% 100%, rgba(251, 191, 36, 0.18), transparent 65%),
    rgba(255, 250, 240, 0.96);
  border-color: rgba(180, 83, 9, 0.30);
}
.req-banner-glow {
  position: absolute; inset: -40% -10% auto auto;
  width: 50%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 146, 60, 0.35), transparent 70%);
  filter: blur(60px); pointer-events: none;
}
.req-banner-orbit {
  position: absolute; right: 10%; top: 50%;
  transform: translateY(-50%);
  width: 240px; height: 240px;
  pointer-events: none; opacity: 0.45;
}
.orbit-a, .orbit-b {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.40);
}
.orbit-b { inset: 22%; border-color: rgba(251, 146, 60, 0.32); }
[data-theme="light"] .orbit-a { border-color: rgba(180, 83, 9, 0.35); }
[data-theme="light"] .orbit-b { border-color: rgba(194, 65, 12, 0.30); }

.banner-text { display: flex; flex-direction: column; gap: 6px; position: relative; z-index: 1; }
.banner-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .banner-eyebrow { color: #b45309; }
.banner-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fb923c; box-shadow: 0 0 8px rgba(251, 146, 60, 0.7);
  animation: edoc-glow-breathe 2.4s ease-in-out infinite;
}
.banner-title {
  margin: 4px 0 0;
  font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.02em;
  display: inline-flex; gap: 8px; align-items: baseline; flex-wrap: wrap;
  background: linear-gradient(110deg, #fde68a, #fbbf24, #f59e0b, #fb923c);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: edoc-shimmer 7s ease-in-out infinite;
}
.t-divider { color: var(--hr-text-dim); -webkit-text-fill-color: var(--hr-text-dim); font-weight: 400; }
.banner-sub {
  margin: 4px 0 0;
  font-size: 13px; line-height: 1.55;
  color: var(--hr-text-muted);
  max-width: 640px;
}
[data-theme="light"] .banner-sub { color: #6b5840; }

.banner-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(110px, 1fr));
  gap: 10px;
  align-self: center;
  position: relative; z-index: 1;
}
.bk-tile {
  display: flex; flex-direction: column; gap: 3px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(40, 30, 22, 0.65);
  border: 1px solid rgba(251, 191, 36, 0.22);
  position: relative; overflow: hidden;
  transition: border-color .3s var(--edoc-spring), transform .3s var(--edoc-spring), box-shadow .3s;
}
[data-theme="light"] .bk-tile { background: rgba(255, 250, 240, 0.92); border-color: rgba(180, 83, 9, 0.22); }
.bk-tile:hover {
  border-color: color-mix(in srgb, var(--bk-tone, #fbbf24) 60%, transparent);
  box-shadow: 0 16px 32px -18px color-mix(in srgb, var(--bk-tone, #fbbf24) 60%, transparent);
}
.bk-tile::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bk-tone, #fbbf24);
}
.bk-tile.tone-amber   { --bk-tone: #ca8a04; }
.bk-tile.tone-sky     { --bk-tone: #0284c7; }
.bk-tile.tone-emerald { --bk-tone: #0d9488; }
.bk-tile.tone-red     { --bk-tone: #b91c1c; }
.bk-icon {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--bk-tone) 22%, transparent);
  color: var(--bk-tone);
  border: 1px solid color-mix(in srgb, var(--bk-tone) 38%, transparent);
}
.bk-num {
  font-size: 24px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text); font-variant-numeric: tabular-nums;
  animation: edoc-count-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.bk-lab {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.9px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .bk-lab { color: #6b5840; }

@media (max-width: 980px) {
  .req-banner { grid-template-columns: 1fr; }
  .banner-kpis { grid-template-columns: repeat(4, 1fr); }
}

/* ════════════════════════════════════════════════════════════════════════
   TOOLBAR
   ════════════════════════════════════════════════════════════════════════ */
.req-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-end;
  padding: 16px 20px;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    rgba(20, 15, 12, 0.72);
  border: 1px solid rgba(251, 191, 36, 0.20);
  transform: translateZ(0);
}
[data-theme="light"] .req-toolbar {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    rgba(255, 250, 240, 0.96);
  border-color: rgba(180, 83, 9, 0.22);
}
@media (max-width: 1100px) { .filter-cluster { flex: 1 1 100%; } }

.filter-cluster { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 0 1 auto; }
.filter-cluster.grow { flex: 1 1 240px; min-width: 220px; }
.filter-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .filter-label { color: #b45309; }

.chip-row { display: flex; gap: 5px; flex-wrap: wrap; }
.filter-chip {
  position: relative;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px;
  border-radius: 999px;
  font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  background: rgba(40, 30, 22, 0.45);
  color: var(--hr-text-muted);
  border: 1px solid rgba(251, 191, 36, 0.18);
  cursor: pointer;
  --chip-tone: #fbbf24;
  transition: background .25s, border-color .25s, color .25s, transform .25s var(--edoc-spring);
}
.filter-chip:hover { transform: translateY(-1px); color: var(--hr-text); border-color: rgba(251, 191, 36, 0.45); }
[data-theme="light"] .filter-chip { background: rgba(255, 250, 240, 0.65); color: #786c5c; border-color: rgba(180, 83, 9, 0.20); }
[data-theme="light"] .filter-chip:hover { color: var(--hr-text); border-color: rgba(194, 65, 12, 0.45); }
.chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--chip-tone);
  box-shadow: 0 0 6px color-mix(in srgb, var(--chip-tone) 55%, transparent);
}
.filter-chip.tone-amber   { --chip-tone: #ca8a04; }
.filter-chip.tone-sky     { --chip-tone: #0284c7; }
.filter-chip.tone-emerald { --chip-tone: #0d9488; }
.filter-chip.tone-red     { --chip-tone: #b91c1c; }
.filter-chip.tone-slate   { --chip-tone: #475569; }
.filter-chip.tone-neutral { --chip-tone: #fbbf24; }
.filter-chip.active {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--chip-tone) 25%, transparent),
    color-mix(in srgb, var(--chip-tone) 10%, transparent));
  border-color: color-mix(in srgb, var(--chip-tone) 55%, transparent);
  color: var(--hr-text);
  box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--chip-tone) 60%, transparent);
}
.chip-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800;
  background: color-mix(in srgb, var(--chip-tone) 28%, transparent);
  color: color-mix(in srgb, var(--chip-tone) 90%, white);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
[data-theme="light"] .chip-count {
  color: color-mix(in srgb, var(--chip-tone) 70%, black);
}

.type-select {
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(40, 30, 22, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
  font: inherit; font-size: 12.5px;
  color-scheme: dark;
  cursor: pointer;
  min-width: 180px;
}
[data-theme="light"] .type-select {
  background: rgba(255, 250, 240, 0.92);
  color: var(--hr-text); color-scheme: light;
  border-color: rgba(180, 83, 9, 0.22);
}

.search-wrap { position: relative; }
.search-input {
  width: 100%;
  padding: 9px 32px 9px 12px;
  border-radius: 10px;
  background: rgba(40, 30, 22, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
  font: inherit; font-size: 12.5px;
  color-scheme: dark;
}
[data-theme="light"] .search-input {
  background: rgba(255, 250, 240, 0.92);
  color-scheme: light; color: var(--hr-text);
  border-color: rgba(180, 83, 9, 0.22);
}
.search-input::placeholder { color: var(--hr-text-dim); }
.search-input:focus {
  outline: none;
  border-color: rgba(251, 146, 60, 0.55);
  background: rgba(251, 191, 36, 0.06);
}
.search-clear {
  position: absolute; right: 6px; top: 50%;
  transform: translateY(-50%);
  width: 22px; height: 22px;
  border-radius: 7px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.search-clear:hover { background: rgba(251, 191, 36, 0.28); }

.refresh-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  flex: 1 0 100%;
  padding: 10px 18px;
  border-radius: 11px;
  font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.4px;
  color: #1f1408;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%);
  background-size: 200% 200%;
  border: 1px solid rgba(251, 191, 36, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 26px -10px rgba(251, 146, 60, 0.55);
  transition: background-position .35s, letter-spacing .35s var(--edoc-spring);
}
.refresh-btn:hover { background-position: 100% 50%; letter-spacing: 0.7px; }
.refresh-btn:disabled { opacity: 0.7; cursor: progress; }
[data-theme="light"] .refresh-btn { color: #fff; background: linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c); }
.spinning { animation: edoc-ring-rotate 0.9s linear infinite; }

/* ════════════════════════════════════════════════════════════════════════
   REQUEST CARD
   ════════════════════════════════════════════════════════════════════════ */
.req-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}
.skeleton-card {
  height: 280px;
  border-radius: 18px;
  background:
    linear-gradient(110deg, rgba(40, 30, 22, 0.50) 30%, rgba(251, 191, 36, 0.10) 50%, rgba(40, 30, 22, 0.50) 70%);
  background-size: 200% 100%;
  border: 1px solid rgba(251, 191, 36, 0.16);
  animation: edoc-shimmer 1.8s linear infinite;
}
[data-theme="light"] .skeleton-card {
  background:
    linear-gradient(110deg, rgba(255, 250, 240, 0.95) 30%, rgba(251, 191, 36, 0.30) 50%, rgba(255, 250, 240, 0.95) 70%);
  background-size: 200% 100%;
}

.req-card {
  position: relative;
  padding: 16px 18px 14px 24px;
  border-radius: 18px;
  background: rgba(20, 15, 12, 0.78);
  border: 1px solid rgba(251, 191, 36, 0.20);
  display: flex; flex-direction: column; gap: 12px;
  isolation: isolate; overflow: hidden;
  transition: border-color .35s var(--edoc-spring), transform .35s var(--edoc-spring), box-shadow .35s;
  --c-tone: #fbbf24;
}
.req-card.status-pending     { --c-tone: #ca8a04; }
.req-card.status-in_progress { --c-tone: #0284c7; }
.req-card.status-fulfilled   { --c-tone: #0d9488; }
.req-card.status-rejected    { --c-tone: #b91c1c; }
.req-card.status-cancelled   { --c-tone: #475569; opacity: 0.78; }
[data-theme="light"] .req-card {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(180, 83, 9, 0.22);
}
.req-card:hover {
  border-color: color-mix(in srgb, var(--c-tone) 60%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 20px 40px -22px color-mix(in srgb, var(--c-tone) 65%, transparent);
}

.card-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(180deg, var(--c-tone), color-mix(in srgb, var(--c-tone) 40%, transparent));
}
.req-card.status-pending .card-rail::before,
.req-card.is-fresh .card-rail::before {
  content: ''; position: absolute; left: 4px; top: 50%; width: 6px; height: 30%;
  transform: translateY(-50%);
  background: var(--c-tone);
  filter: blur(8px);
  animation: edoc-glow-breathe 2.2s ease-in-out infinite;
}
.card-aurora {
  position: absolute; inset: 0; z-index: -1;
  background: radial-gradient(80% 60% at 100% 0%, color-mix(in srgb, var(--c-tone) 12%, transparent), transparent 60%);
  opacity: 0;
  transition: opacity .35s var(--edoc-spring);
}
.req-card:hover .card-aurora { opacity: 1; }

/* Card head */
.card-head { display: flex; gap: 12px; align-items: center; }
.emp-avatar {
  position: relative;
  width: 38px; height: 38px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; letter-spacing: 0.5px;
  background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
  color: #1f1408;
  border: 2px solid rgba(251, 191, 36, 0.40);
  flex-shrink: 0;
  box-shadow: 0 4px 12px -4px rgba(251, 146, 60, 0.50);
}
.avatar-ring {
  position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--c-tone) 50%, transparent);
  opacity: 0;
  transition: opacity .35s var(--edoc-spring);
}
.req-card:hover .avatar-ring { opacity: 1; animation: edoc-ring-rotate 8s linear infinite; }

.head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.emp-name {
  font-size: 13.5px; font-weight: 800; letter-spacing: -0.005em;
  color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.emp-meta {
  font-size: 10.5px; color: var(--hr-text-muted);
  display: inline-flex; gap: 4px;
}
.mt-dot { opacity: 0.5; }

.status-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--p-bg);
  color: var(--p-fg);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px;
  border: 1px solid var(--p-ring);
  flex-shrink: 0;
}
.pill-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--p-fg);
}
.req-card.status-pending .status-pill { animation: edoc-glow-breathe 2.4s ease-in-out infinite; }

/* Request type */
.req-type {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--c-tone) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-tone) 20%, transparent);
}
.rt-icon {
  width: 32px; height: 32px;
  border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c-tone) 30%, transparent),
    color-mix(in srgb, var(--c-tone) 8%, transparent));
  color: var(--c-tone);
  border: 1px solid color-mix(in srgb, var(--c-tone) 38%, transparent);
}
.rt-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rt-label {
  font-size: 12.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.005em;
}
.rt-tag {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;
  color: color-mix(in srgb, var(--c-tone) 80%, var(--hr-text-muted));
}

/* Reason */
.req-reason {
  margin: 0; font-size: 12.5px; line-height: 1.55;
  color: var(--hr-text);
  display: -webkit-box;
  -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}
[data-theme="light"] .req-reason { color: #2a1e15; }
.req-extras { display: flex; flex-wrap: wrap; gap: 5px; }
.extra-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
}
[data-theme="light"] .extra-chip { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.22); color: var(--hr-text); }
.extra-chip.note { color: var(--hr-text-muted); }

/* Decision note */
.decision-note {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 11px; line-height: 1.45;
  background: color-mix(in srgb, var(--c-tone) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-tone) 28%, transparent);
  color: var(--hr-text);
}
.decision-note strong {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--c-tone);
}
.dec-by { font-size: 10px; color: var(--hr-text-muted); margin-top: 2px; }

/* Footer + actions */
.card-foot {
  margin-top: auto; padding-top: 12px;
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .card-foot { border-top-color: rgba(180, 83, 9, 0.24); }
.foot-time {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; color: var(--hr-text-muted);
  letter-spacing: 0.2px;
}
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.act-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 11px;
  border-radius: 9px;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  overflow: hidden; isolation: isolate; position: relative;
  transition: letter-spacing .3s var(--edoc-spring), box-shadow .3s, border-color .3s, background .3s;
}
.act-btn::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.20) 50%, transparent 70%);
  transform: translateX(-110%);
  transition: transform .6s var(--edoc-ease);
  pointer-events: none;
}
.act-btn:hover::after { transform: translateX(110%); }
.act-btn:hover { letter-spacing: 0.55px; }
.act-btn.ghost {
  background: rgba(2, 132, 199, 0.15); color: #7dd3fc; border-color: rgba(2, 132, 199, 0.45);
}
.act-btn.ghost:hover { background: rgba(2, 132, 199, 0.25); border-color: rgba(2, 132, 199, 0.65); }
.act-btn.primary {
  color: #1f1408;
  background: linear-gradient(135deg, #6ee7b7, #34d399, #10b981);
  border-color: rgba(13, 148, 136, 0.55);
  box-shadow: 0 10px 22px -10px rgba(13, 148, 136, 0.55);
}
.act-btn.primary:hover { box-shadow: 0 16px 32px -12px rgba(13, 148, 136, 0.75); }
.act-btn.danger {
  background: rgba(220, 38, 38, 0.16); color: #fca5a5; border-color: rgba(220, 38, 38, 0.45);
}
.act-btn.danger:hover { background: rgba(220, 38, 38, 0.28); border-color: rgba(220, 38, 38, 0.65); }
[data-theme="light"] .act-btn.ghost { background: rgba(2, 132, 199, 0.15); color: #075985; border-color: rgba(2, 132, 199, 0.40); }
[data-theme="light"] .act-btn.danger { background: rgba(220, 38, 38, 0.14); color: #b91c1c; border-color: rgba(220, 38, 38, 0.40); }

.card-actions.terminal { font-size: 10.5px; color: var(--hr-text-muted); }
.terminal-label {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
}

/* Empty state */
.empty-card {
  padding: 50px 32px;
  text-align: center;
  border-radius: 20px;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    rgba(20, 15, 12, 0.72);
  border: 1px dashed rgba(251, 191, 36, 0.32);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  color: var(--hr-text-muted);
}
[data-theme="light"] .empty-card {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.32);
}
.empty-icon {
  width: 64px; height: 64px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
  color: #1f1408;
  box-shadow: 0 20px 44px -20px rgba(251, 146, 60, 0.55);
}
.empty-card h3 { margin: 4px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); }
.empty-card p { margin: 0; font-size: 12.5px; line-height: 1.5; max-width: 460px; }
</style>
