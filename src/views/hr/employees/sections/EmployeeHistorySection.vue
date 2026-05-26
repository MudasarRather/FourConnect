<template>
  <div class="history-section" :class="`tone-${tone}`">
    <!-- Header panel -->
    <header class="hist-head-panel">
      <div class="hist-aurora" aria-hidden="true" />
      <div class="hist-head-row">
        <div class="hist-head-text">
          <span class="hist-eyebrow">
            <span class="dot" />
            <component v-if="accentIcon" :is="accentIcon" :size="11" class="eyebrow-ic" />
            {{ eyebrow }}
          </span>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <div class="hist-stats">
          <div class="stat">
            <span class="stat-label">Page</span>
            <span class="stat-value">{{ page }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Showing</span>
            <span class="stat-value">{{ rows.length }}</span>
          </div>
          <div class="stat" v-if="!fixedChangeType">
            <span class="stat-label">Filter</span>
            <span class="stat-value">{{ changeType ? formatType(changeType) : 'All' }}</span>
          </div>
        </div>
      </div>

      <div class="hist-filters">
        <div class="search-cell">
          <HrInput
            v-model="search"
            placeholder="Search by employee name, email or ID…"
            @update:modelValue="onSearchInput"
          >
            <template #left><SearchIcon :size="13" /></template>
          </HrInput>
        </div>
        <div class="date-cell">
          <HrDatePicker v-model="fromDate" placeholder="From date" @update:modelValue="reload" />
        </div>
        <div class="date-cell">
          <HrDatePicker v-model="toDate" placeholder="To date" @update:modelValue="reload" />
        </div>
        <FilterPill
          v-if="!fixedChangeType"
          label="Event Type"
          :options="CHANGE_OPTIONS"
          :model-value="changeType"
          @change="onChangeType"
        />
        <button v-if="hasActiveFilter" class="ghost-mini danger" @click="clearFilters">
          <X :size="12" /> Clear
        </button>
        <button class="ghost-mini" @click="refresh" :disabled="loading">
          <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
        </button>
      </div>
    </header>

    <div v-if="loading && !rows.length" class="hist-loading">
      <Loader2 class="spin" :size="20" /> Loading…
    </div>

    <!-- Grouped-by-month timeline -->
    <div v-else-if="rows.length" class="timeline-wrap">
      <section
        v-for="(group, gi) in groupedRows"
        :key="group.key"
        class="month-group"
        :style="{ '--g': gi }"
      >
        <header class="month-head">
          <span class="month-title">{{ group.label }}</span>
          <span class="month-count">{{ group.items.length }} event{{ group.items.length === 1 ? '' : 's' }}</span>
          <span class="month-rule" />
        </header>
        <ol class="timeline">
          <li
            v-for="(r, i) in group.items"
            :key="r.id"
            class="t-item"
            :style="{ '--i': i }"
          >
            <div class="t-marker" :class="`type-${r.change_type.toLowerCase()}`">
              <component :is="iconFor(r.change_type)" :size="14" />
            </div>
            <div class="t-content">
              <div class="t-head">
                <strong>{{ formatType(r.change_type) }}</strong>
                <span class="t-date">{{ fmtDate(r.effective_date) || fmtDate(r.created_at) }}</span>
              </div>
              <div class="t-target" v-if="r.employee_name || r.employee_code">
                <button class="t-link" @click="$emit('open-profile', r.employee_id)">
                  {{ r.employee_name || '—' }}
                  <span class="t-emp-id">{{ r.employee_code }}</span>
                </button>
              </div>
              <p v-if="r.reason" class="t-reason">{{ r.reason }}</p>
              <details v-if="hasDiff(r)" class="t-diff">
                <summary>View changes</summary>
                <div class="diff-grid">
                  <div v-for="k in diffKeys(r)" :key="k" class="diff-row">
                    <span class="diff-key">{{ k }}</span>
                    <span class="diff-from">{{ r.from_value_json?.[k] ?? '—' }}</span>
                    <ArrowRight :size="10" class="diff-arrow" />
                    <span class="diff-to">{{ r.to_value_json?.[k] ?? '—' }}</span>
                  </div>
                </div>
              </details>
              <p v-if="r.actioned_by_name" class="t-actor">by {{ r.actioned_by_name }}</p>
            </div>
          </li>
        </ol>
      </section>
    </div>

    <div v-else class="empty">
      <HistoryIcon :size="32" />
      <p>{{ emptyText }}</p>
    </div>

    <!-- Pagination -->
    <div v-if="rows.length" class="hist-pagination">
      <span class="page-info">Page {{ page }}</span>
      <div class="page-chips">
        <button class="page-chip" :disabled="page <= 1 || loading" @click="prevPage" aria-label="Previous page">
          <ChevronLeft :size="14" />
        </button>
        <button class="page-chip" :disabled="!hasMore || loading" @click="nextPage" aria-label="Next page">
          <ChevronRight :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  Plus, Edit, ArrowUp, ArrowRight, CheckCircle, Pause, Play,
  Briefcase, LogOut, Archive, History as HistoryIcon, Loader2, RefreshCw,
  Search as SearchIcon, X, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'

import FilterPill from '../../../../components/hr/FilterPill.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import { useEmployees } from '../../../../composables/useEmployees'

const props = defineProps({
  title: { type: String, default: 'Employee History' },
  subtitle: { type: String, default: 'Chronological log of every lifecycle event' },
  fixedChangeType: { type: String, default: '' }, // when set, hides the filter
  emptyText: { type: String, default: 'No events yet.' },
  // Visual differentiation — each page (Promotions/Transfers/etc) passes its
  // own tone + eyebrow so the underlying timeline component can re-skin.
  tone: { type: String, default: 'gold' }, // gold | green | red | orange | violet | gray
  eyebrow: { type: String, default: 'Audit Trail' },
  accentIcon: { type: Object, default: null },
})
defineEmits(['open-profile'])

const CHANGE_OPTIONS = [
  { value: 'HIRED', label: 'Hired' },
  { value: 'PROMOTED', label: 'Promoted' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REINSTATED', label: 'Reinstated' },
  { value: 'NOTICE_SERVED', label: 'Notice Served' },
  { value: 'EXITED', label: 'Exited' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'PROFILE_UPDATED', label: 'Profile Updated' },
]

const { allHistory } = useEmployees()
const loading = ref(false)
const rows = ref([])
const changeType = ref(props.fixedChangeType || null)
const search = ref('')
const fromDate = ref('')
const toDate = ref('')
const page = ref(1)
const limit = 50
const hasMore = ref(false)

const reload = async () => {
  loading.value = true
  try {
    const params = {
      change_type: changeType.value || undefined,
      employee_search: search.value?.trim() || undefined,
      from_date: fromDate.value || undefined,
      to_date: toDate.value || undefined,
      page: page.value,
      limit,
    }
    const res = await allHistory(params)
    rows.value = res || []
    hasMore.value = (res || []).length === limit
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

const onChangeType = (v) => { changeType.value = v; page.value = 1; reload() }
const refresh = () => { page.value = 1; reload() }

let qTimer = null
const onSearchInput = () => {
  clearTimeout(qTimer)
  qTimer = setTimeout(() => { page.value = 1; reload() }, 240)
}
const clearFilters = () => {
  search.value = ''
  fromDate.value = ''
  toDate.value = ''
  if (!props.fixedChangeType) changeType.value = null
  page.value = 1
  reload()
}
const prevPage = () => { if (page.value > 1) { page.value--; reload() } }
const nextPage = () => { if (hasMore.value) { page.value++; reload() } }

const hasActiveFilter = computed(() =>
  !!(search.value || fromDate.value || toDate.value ||
     (!props.fixedChangeType && changeType.value))
)

onMounted(reload)
watch(() => props.fixedChangeType, (v) => {
  changeType.value = v || null
  page.value = 1
  reload()
})

const iconFor = (t) => ({
  HIRED: Plus,
  PROFILE_UPDATED: Edit,
  PROMOTED: ArrowUp,
  TRANSFERRED: ArrowRight,
  CONFIRMED: CheckCircle,
  SUSPENDED: Pause,
  REINSTATED: Play,
  NOTICE_SERVED: Briefcase,
  EXITED: LogOut,
  ARCHIVED: Archive,
}[t] || HistoryIcon)

const formatType = (t) => ({
  HIRED: 'Hired',
  PROFILE_UPDATED: 'Profile Updated',
  PROMOTED: 'Promoted',
  TRANSFERRED: 'Transferred',
  CONFIRMED: 'Confirmed',
  SUSPENDED: 'Suspended',
  REINSTATED: 'Reinstated',
  NOTICE_SERVED: 'Notice Served',
  EXITED: 'Exited',
  ARCHIVED: 'Archived',
}[t] || t)

const fmtDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d }
}

const hasDiff = (r) => r.from_value_json && r.to_value_json
const diffKeys = (r) => {
  if (!r.from_value_json || !r.to_value_json) return []
  const keys = new Set([...Object.keys(r.from_value_json), ...Object.keys(r.to_value_json)])
  return [...keys].filter(k => r.from_value_json[k] !== r.to_value_json[k])
}

// Group rows by month for a cleaner ultra-modern timeline.
const groupedRows = computed(() => {
  const groups = {}
  for (const r of rows.value) {
    const d = r.effective_date || r.created_at
    if (!d) continue
    const dt = new Date(d)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    if (!groups[key]) {
      groups[key] = {
        key,
        label: dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        items: [],
      }
    }
    groups[key].items.push(r)
  }
  // Newest first (highest key first)
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
})
</script>

<style scoped>
.history-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  /* Critical: never let inner content bleed horizontally and shove siblings */
  max-width: 100%;
  overflow-x: hidden;
}

/* Premium header panel */
.hist-head-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 22px;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.6), rgba(18, 18, 22, 0.5));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  overflow: hidden;
  isolation: isolate;
}
.hist-aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(251, 146, 60, 0.06), transparent 60%);
  pointer-events: none;
  animation: hr-aurora 18s ease-in-out infinite;
  z-index: -1;
}

.hist-head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.hist-head-text { flex: 1; min-width: 0; }
.hist-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--hr-accent-gold);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
}
.hist-eyebrow .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--hr-accent-gold);
  box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55);
  animation: hr-pulse-dot-gold 2.4s ease-in-out infinite;
}
.hist-head-text h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--hr-text);
  letter-spacing: -0.02em;
  background: linear-gradient(180deg, #ffffff, #c5c5c8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hist-head-text p {
  margin: 4px 0 0;
  color: var(--hr-text-muted);
  font-size: 12.5px;
}
.hist-stats { display: inline-flex; gap: 10px; flex-shrink: 0; }
.stat {
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 80px;
}
.stat-label { font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted); text-transform: uppercase; letter-spacing: 0.7px; }
.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--hr-accent-gold);
  font-family: var(--hr-mono);
  letter-spacing: -0.01em;
}

.hist-filters {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}
.search-cell, .date-cell { min-width: 0; }
@media (max-width: 900px) {
  .hist-filters { grid-template-columns: 1fr 1fr; }
}

.eyebrow-ic { opacity: 0.85; }

/* Pagination */
.hist-pagination {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 4px;
}
.page-info { font-size: 11px; color: var(--hr-text-muted); font-family: var(--hr-mono); }
.page-chips { display: flex; gap: 4px; }
.page-chip {
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 1px solid var(--hr-border-strong);
  background: transparent;
  color: var(--hr-text-secondary);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.page-chip:hover:not(:disabled) {
  background: rgba(255,255,255,0.04);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.page-chip:disabled { opacity: 0.4; cursor: not-allowed; }

/* ───── Per-tone palette ─────
   Each parent page sets `tone="<key>"` to recolour the eyebrow / dot /
   stats / aurora so Promotions, Transfers, Suspended etc. look distinct
   while sharing the same component. */
.history-section.tone-gold .hist-eyebrow,
.history-section.tone-gold .stat-value { color: var(--hr-accent-gold); }
.history-section.tone-gold .hist-eyebrow .dot { background: var(--hr-accent-gold); }
.history-section.tone-gold .month-title { color: var(--hr-accent-gold); }

.history-section.tone-green .hist-eyebrow,
.history-section.tone-green .stat-value { color: var(--hr-active); }
.history-section.tone-green .hist-eyebrow .dot { background: var(--hr-active); }
.history-section.tone-green .month-title { color: var(--hr-active); }
.history-section.tone-green .hist-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(52, 211, 153, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(34, 197, 94, 0.05), transparent 60%);
}

.history-section.tone-orange .hist-eyebrow,
.history-section.tone-orange .stat-value { color: var(--hr-orange); }
.history-section.tone-orange .hist-eyebrow .dot { background: var(--hr-orange); }
.history-section.tone-orange .month-title { color: var(--hr-orange); }
.history-section.tone-orange .hist-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(251, 146, 60, 0.12), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(234, 88, 12, 0.06), transparent 60%);
}

.history-section.tone-red .hist-eyebrow,
.history-section.tone-red .stat-value { color: var(--hr-suspended); }
.history-section.tone-red .hist-eyebrow .dot { background: var(--hr-suspended); }
.history-section.tone-red .month-title { color: var(--hr-suspended); }
.history-section.tone-red .hist-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(248, 113, 113, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(220, 38, 38, 0.05), transparent 60%);
}

.history-section.tone-violet .hist-eyebrow,
.history-section.tone-violet .stat-value { color: var(--hr-exited); }
.history-section.tone-violet .hist-eyebrow .dot { background: var(--hr-exited); }
.history-section.tone-violet .month-title { color: var(--hr-exited); }
.history-section.tone-violet .hist-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(192, 132, 252, 0.10), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(168, 85, 247, 0.05), transparent 60%);
}

.history-section.tone-gray .hist-eyebrow,
.history-section.tone-gray .stat-value { color: var(--hr-text-secondary); }
.history-section.tone-gray .hist-eyebrow .dot { background: var(--hr-text-secondary); }
.history-section.tone-gray .month-title { color: var(--hr-text-secondary); }
.history-section.tone-gray .hist-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(156, 163, 175, 0.08), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(107, 114, 128, 0.04), transparent 60%);
}

.ghost-mini.danger { color: var(--hr-suspended); border-color: rgba(248, 113, 113, 0.32); }
.ghost-mini.danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.10);
  color: var(--hr-suspended);
}

.hist-loading {
  display: flex; align-items: center; gap: 10px;
  padding: 60px;
  justify-content: center;
  color: var(--hr-text-muted);
}

.ghost-mini {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border-strong);
  border-radius: 999px;
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.ghost-mini:hover:not(:disabled) {
  background: var(--hr-accent-gold-soft);
  border-color: var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.ghost-mini:disabled { opacity: 0.5; cursor: wait; }

/* Month groups */
.timeline-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  max-width: 100%;
}
.month-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: hr-fade-up 320ms var(--hr-spring) backwards;
  animation-delay: calc(var(--g, 0) * 60ms);
}
.month-head {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 6px 0 4px;
}
.month-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--hr-accent-gold);
  text-transform: uppercase;
  letter-spacing: 1.4px;
}
.month-count {
  font-family: var(--hr-mono);
  font-size: 10px;
  color: var(--hr-text-muted);
  background: rgba(255, 255, 255, 0.03);
  padding: 2px 8px;
  border-radius: 999px;
}
.month-rule {
  height: 1px;
  background: linear-gradient(90deg, var(--hr-accent-gold-border), transparent);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  min-width: 0;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 0; bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--hr-border) 12%, var(--hr-border) 88%, transparent);
}
.t-item {
  display: flex;
  gap: 14px;
  padding: 10px 0;
  position: relative;
  animation: hr-fade-up 0.32s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 32ms);
  min-width: 0;
}
.t-marker {
  width: 28px; height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-surface-elevated);
  border: 1px solid var(--hr-border-strong);
  color: var(--hr-text-muted);
  z-index: 1;
}
.t-marker.type-hired, .t-marker.type-confirmed { color: var(--hr-active); border-color: rgba(52,211,153,0.35); }
.t-marker.type-promoted { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.t-marker.type-suspended { color: var(--hr-suspended); border-color: rgba(248,113,113,0.35); }
.t-marker.type-exited { color: var(--hr-exited); border-color: rgba(192,132,252,0.35); }
.t-marker.type-archived { color: var(--hr-inactive); }
.t-marker.type-notice_served { color: var(--hr-notice); border-color: rgba(251,146,60,0.35); }
.t-marker.type-transferred { color: var(--hr-text-secondary); border-color: var(--hr-border-strong); }
.t-marker.type-reinstated { color: var(--hr-active); }
.t-marker.type-profile_updated { color: var(--hr-text-secondary); }

.t-content {
  flex: 1;
  min-width: 0; /* allow children to shrink so text wraps instead of overflowing */
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.55), rgba(18, 18, 22, 0.45));
  border: 1px solid var(--hr-border);
  border-radius: 14px;
  padding: 12px 16px;
  transition: border-color 200ms var(--hr-spring), transform 200ms var(--hr-spring);
}
.t-item:hover .t-content {
  border-color: var(--hr-accent-gold-border);
  transform: translateX(2px);
}
.t-head {
  display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
  margin-bottom: 4px;
}
.t-head strong { color: var(--hr-text); font-size: 13px; font-weight: 700; }
.t-date {
  color: var(--hr-text-muted);
  font-size: 11px;
  font-family: ui-monospace, monospace;
}
.t-target { margin-bottom: 4px; }
.t-link {
  background: transparent; border: none;
  color: var(--hr-accent-gold);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  display: inline-flex; gap: 8px; align-items: center;
}
.t-link:hover { text-decoration: underline; }
.t-emp-id { font-family: ui-monospace, monospace; color: var(--hr-text-dim); font-size: 11px; font-weight: 500; }

.t-reason { color: var(--hr-text-secondary); font-size: 12px; margin: 4px 0 0; }
.t-actor { color: var(--hr-text-dim); font-size: 11px; margin: 4px 0 0; }

.t-diff { margin-top: 8px; }
.t-diff summary {
  cursor: pointer;
  color: var(--hr-text-muted);
  font-size: 11px;
  outline: none;
}
.t-diff summary::-webkit-details-marker { display: none; }
.t-diff summary::before {
  content: '▸ ';
  display: inline-block;
  transition: transform 0.15s;
}
.t-diff[open] summary::before { transform: rotate(90deg); }
.diff-grid {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.diff-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
  min-width: 0;
}
.diff-from, .diff-to {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diff-key { color: var(--hr-text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.diff-from { color: var(--hr-text-dim); }
.diff-arrow { color: var(--hr-accent-gold); }
.diff-to { color: var(--hr-text); }

.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 20px; gap: 12px;
  color: var(--hr-text-muted);
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ─── LIGHT THEME OVERRIDES — warm cream + amber/golden palette ─────────── */
[data-theme="light"] .hist-head-panel {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.82), rgba(255, 246, 226, 0.72));
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .hist-aurora {
  background:
    radial-gradient(50% 80% at 0% 0%, rgba(217, 119, 6, 0.14), transparent 60%),
    radial-gradient(40% 60% at 100% 100%, rgba(249, 115, 22, 0.08), transparent 60%);
}
/* Title gradient — white→gray is invisible on cream */
[data-theme="light"] .hist-head-text h3 {
  background: linear-gradient(120deg, #1a1410 0%, #92400e 70%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .hist-head-text p { color: #6b5840; }

[data-theme="light"] .stat {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .stat-label { color: #92400e; }

[data-theme="light"] .hist-loading { color: #6b5840; }

[data-theme="light"] .ghost-mini {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .ghost-mini:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}
[data-theme="light"] .ghost-mini.danger {
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .ghost-mini.danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
}

/* Pagination */
[data-theme="light"] .page-info { color: #6b5840; }
[data-theme="light"] .page-chip {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .page-chip:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.36);
  color: #b45309;
}

/* Month groups */
[data-theme="light"] .month-count {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
}
[data-theme="light"] .month-rule {
  background: linear-gradient(90deg, rgba(217, 119, 6, 0.40), transparent);
}

/* Timeline */
[data-theme="light"] .timeline::before {
  background: linear-gradient(to bottom, transparent, rgba(40, 25, 10, 0.18) 12%, rgba(40, 25, 10, 0.18) 88%, transparent);
}
[data-theme="light"] .t-marker {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .t-content {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.82), rgba(255, 246, 226, 0.62));
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .t-item:hover .t-content { border-color: rgba(217, 119, 6, 0.42); }
[data-theme="light"] .t-head strong { color: #1a1410; }
[data-theme="light"] .t-date { color: #92400e; }
[data-theme="light"] .t-link { color: #b45309; }
[data-theme="light"] .t-emp-id { color: #92400e; }
[data-theme="light"] .t-reason { color: #44362a; }
[data-theme="light"] .t-actor { color: #6b5840; }
[data-theme="light"] .t-diff summary { color: #6b5840; }
[data-theme="light"] .diff-row { background: rgba(40, 25, 10, 0.05); }
[data-theme="light"] .diff-key { color: #92400e; }
[data-theme="light"] .diff-from { color: #8d7b62; }
[data-theme="light"] .diff-arrow { color: #b45309; }
[data-theme="light"] .diff-to { color: #1a1410; }

[data-theme="light"] .empty { color: #6b5840; }
</style>
