<template>
  <div class="all-section">
    <!-- ════════ KPI chip row ════════ -->
    <div class="kpi-row">
      <KpiChip
        label="Total"
        :value="stats.total_employees"
        tone="neutral"
        :active="!filters.lifecycle_state"
        @click="toggleLifecycle(null)"
      >
        <template #icon><Users :size="14" /></template>
      </KpiChip>
      <KpiChip
        label="Active"
        :value="stats.active_employees"
        tone="green"
        :active="filters.lifecycle_state === 'ACTIVE'"
        @click="toggleLifecycle('ACTIVE')"
      >
        <template #icon><CheckCircle :size="14" /></template>
      </KpiChip>
      <KpiChip
        label="On Probation"
        :value="stats.employees_on_probation"
        tone="gold"
        :active="filters.lifecycle_state === 'ON_PROBATION'"
        @click="toggleLifecycle('ON_PROBATION')"
      >
        <template #icon><Hourglass :size="14" /></template>
      </KpiChip>
      <KpiChip
        label="On Notice"
        :value="stats.employees_on_notice"
        tone="orange"
        :active="filters.lifecycle_state === 'ON_NOTICE'"
        @click="toggleLifecycle('ON_NOTICE')"
      >
        <template #icon><Briefcase :size="14" /></template>
      </KpiChip>
      <KpiChip
        label="Hires (30d)"
        :value="stats.recent_hires_30d"
        tone="violet"
      >
        <template #icon><UserPlus :size="14" /></template>
      </KpiChip>
    </div>

    <!-- ════════ Filter bar ════════ -->
    <div class="filter-bar">
      <div class="search-wrap">
        <HrInput
          v-model="searchInput"
          placeholder="Search by name, email, employee ID or code…"
          @update:modelValue="onSearchInput"
        >
          <template #left><Search :size="13" /></template>
        </HrInput>
      </div>

      <FilterPill
        label="Department"
        :options="reference.departments.map(d => ({ value: d.id, label: d.name }))"
        :model-value="filters.department_id"
        @change="v => applyFilter('department_id', v)"
      />
      <FilterPill
        label="Designation"
        :options="reference.designations.map(d => ({ value: d.id, label: d.name }))"
        :model-value="filters.designation_id"
        @change="v => applyFilter('designation_id', v)"
      />
      <FilterPill
        label="Location"
        :options="reference.locations.map(l => ({ value: l.id, label: l.name }))"
        :model-value="filters.work_location_id"
        @change="v => applyFilter('work_location_id', v)"
      />
      <FilterPill
        label="Lifecycle"
        :options="LIFECYCLE_OPTIONS"
        :model-value="filters.lifecycle_state"
        @change="v => applyFilter('lifecycle_state', v)"
      />
      <FilterPill
        label="Type"
        :options="EMPLOYMENT_TYPE_OPTIONS"
        :model-value="filters.employment_type"
        @change="v => applyFilter('employment_type', v)"
      />

      <div class="grow" />

      <button class="ghost-mini" @click="refresh">
        <RefreshCw :size="13" /> Refresh
      </button>
      <button class="ghost-mini" @click="clearFilters" :disabled="!hasFilters">
        <X :size="13" /> Clear
      </button>
    </div>

    <!-- ════════ Selection toolbar ════════ -->
    <transition name="select-slide">
      <div v-if="selectedIds.length" class="bulk-bar">
        <span class="bulk-count">{{ selectedIds.length }} selected</span>
        <button class="bulk-btn" @click="clearSelection">Deselect</button>
        <div class="grow" />
        <span class="muted">Bulk actions land in Phase 1.1</span>
      </div>
    </transition>

    <!-- ════════ Table ════════ -->
    <div class="table-card">
      <div v-if="loading && !employees.length" class="loading-grid">
        <div v-for="i in 6" :key="i" class="skel-row">
          <Skeleton width="40px" height="40px" radius="50%" />
          <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
            <Skeleton width="40%" height="12px" />
            <Skeleton width="20%" height="10px" />
          </div>
          <Skeleton width="100px" height="10px" />
          <Skeleton width="80px" height="20px" radius="999px" />
        </div>
      </div>

      <table v-else class="emp-table">
        <thead>
          <tr>
            <th class="th-check">
              <HrCheckbox
                :model-value="allOnPageSelected"
                @change="toggleAllOnPage"
              />
            </th>
            <th @click="sort('full_name')">Name <SortIcon :col="'full_name'" :active="filters.sort_by" :dir="filters.sort_dir" /></th>
            <th @click="sort('employee_id')">Employee ID <SortIcon :col="'employee_id'" :active="filters.sort_by" :dir="filters.sort_dir" /></th>
            <th>Designation</th>
            <th>Department</th>
            <th @click="sort('joining_date')">Joined <SortIcon :col="'joining_date'" :active="filters.sort_by" :dir="filters.sort_dir" /></th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(e, idx) in employees"
            :key="e.id"
            class="emp-row hr-animate"
            :class="{ selected: isSelected(e.id) }"
            :style="{ '--i': idx }"
            @click="onRowClick($event, e)"
          >
            <td class="td-check" @click.stop>
              <HrCheckbox :model-value="isSelected(e.id)" @change="toggleOne(e.id)" />
            </td>
            <td class="td-name">
              <EmployeeAvatar :name="e.full_name" :avatar-url="e.avatar_url" :seed="e.employee_id" size="sm" />
              <div class="name-block">
                <span class="full-name">{{ e.full_name || '—' }}</span>
                <span class="email">{{ e.email }}</span>
              </div>
            </td>
            <td><span class="mono emp-id">{{ e.employee_id }}</span></td>
            <td>{{ e.designation_name || '—' }}</td>
            <td>{{ e.department_name || '—' }}</td>
            <td class="mono date">{{ fmtDate(e.joining_date) }}</td>
            <td>
              <LifecycleBadge :state="e.lifecycle_state" size="sm" />
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && employees.length === 0" class="empty-state">
        <UsersIcon :size="36" />
        <p>No employees match the current filters.</p>
        <button class="ghost-mini" @click="clearFilters" v-if="hasFilters">
          <X :size="13" /> Clear filters
        </button>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar">
        <span class="page-info">
          {{ rangeStart }}–{{ rangeEnd }} of {{ total }}
        </span>
        <div class="page-chips">
          <button class="page-chip" :disabled="filters.page <= 1" @click="goPage(filters.page - 1)">
            <ChevronLeft :size="14" />
          </button>
          <button
            v-for="p in pageRange"
            :key="p.key"
            class="page-chip"
            :class="{ active: p.value === filters.page, ellipsis: p.value === '...' }"
            :disabled="p.value === '...'"
            @click="p.value !== '...' && goPage(p.value)"
          >{{ p.value }}</button>
          <button class="page-chip" :disabled="filters.page >= totalPages" @click="goPage(filters.page + 1)">
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h, ref, computed, watch, onMounted } from 'vue'
import {
  Users, UserPlus, CheckCircle, Hourglass, Briefcase,
  Search, RefreshCw, X, ChevronLeft, ChevronRight, Users as UsersIcon,
  ArrowUp, ArrowDown,
} from 'lucide-vue-next'

import KpiChip from '../../../../components/hr/KpiChip.vue'
import FilterPill from '../../../../components/hr/FilterPill.vue'
import EmployeeAvatar from '../../../../components/hr/EmployeeAvatar.vue'
import LifecycleBadge from '../../../../components/hr/LifecycleBadge.vue'
import Skeleton from '../../../../components/hr/Skeleton.vue'
import HrCheckbox from '../../../../components/hr/forms/HrCheckbox.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'

const props = defineProps({
  employees: { type: Array, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  totalPages: { type: Number, default: 1 },
  reference: { type: Object, required: true },
  stats: { type: Object, default: () => ({}) },
})
const emit = defineEmits([
  'open-profile', 'set-filters', 'set-page', 'refresh',
])

const LIFECYCLE_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_PROBATION', label: 'On Probation' },
  { value: 'ON_NOTICE', label: 'On Notice' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXITED', label: 'Exited' },
  { value: 'ARCHIVED', label: 'Archived' },
]
const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'PART_TIME', label: 'Part-Time' },
]

const searchInput = ref(props.filters.search || '')
let searchTimer = null
const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => applyFilter('search', searchInput.value), 220)
}
watch(() => props.filters.search, (v) => { if (v !== searchInput.value) searchInput.value = v || '' })

const applyFilter = (key, value) => {
  emit('set-filters', { [key]: value === '' ? null : value })
}
const toggleLifecycle = (state) => {
  if (state === null) {
    // Click on Total clears the filter regardless of current state
    if (props.filters.lifecycle_state !== null) applyFilter('lifecycle_state', null)
    return
  }
  applyFilter('lifecycle_state', props.filters.lifecycle_state === state ? null : state)
}
const clearFilters = () => {
  emit('set-filters', {
    search: '',
    department_id: null,
    designation_id: null,
    work_location_id: null,
    lifecycle_state: null,
    employment_type: null,
    grade_id: null,
  })
  searchInput.value = ''
}
const hasFilters = computed(() =>
  !!(props.filters.search || props.filters.department_id || props.filters.designation_id ||
     props.filters.work_location_id || props.filters.lifecycle_state || props.filters.employment_type)
)
const refresh = () => emit('refresh')

// Sort
const sort = (col) => {
  if (props.filters.sort_by === col) {
    emit('set-filters', { sort_dir: props.filters.sort_dir === 'desc' ? 'asc' : 'desc' })
  } else {
    emit('set-filters', { sort_by: col, sort_dir: 'desc' })
  }
}

// Selection (in-memory; bulk actions defer to 1.1)
const selectedIds = ref([])
const isSelected = (id) => selectedIds.value.includes(id)
const toggleOne = (id) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}
const allOnPageSelected = computed(() =>
  props.employees.length > 0 && props.employees.every(e => selectedIds.value.includes(e.id))
)
const toggleAllOnPage = () => {
  if (allOnPageSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !props.employees.find(e => e.id === id))
  } else {
    const next = new Set(selectedIds.value)
    props.employees.forEach(e => next.add(e.id))
    selectedIds.value = [...next]
  }
}
const clearSelection = () => { selectedIds.value = [] }

const onRowClick = (event, e) => {
  // If the click came from inside a checkbox/td-check, skip
  if (event.target?.tagName === 'INPUT') return
  emit('open-profile', e.id)
}

// Pagination
const rangeStart = computed(() => props.total === 0 ? 0 : (props.filters.page - 1) * props.filters.limit + 1)
const rangeEnd = computed(() => Math.min(props.total, props.filters.page * props.filters.limit))
const pageRange = computed(() => {
  const total = props.totalPages
  const cur = props.filters.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => ({ key: i + 1, value: i + 1 }))
  const pages = []
  const push = (v) => pages.push({ key: typeof v === 'number' ? v : `e-${pages.length}`, value: v })
  push(1)
  if (cur > 4) push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) push(p)
  if (cur < total - 3) push('...')
  push(total)
  return pages
})
const goPage = (p) => { emit('set-page', p) }

// Date formatting
const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d }
}

// SortIcon mini component (inline) — chevron showing the active sort
const SortIcon = {
  props: { col: String, active: String, dir: String },
  setup(p) {
    return () => p.col === p.active
      ? h(p.dir === 'asc' ? ArrowUp : ArrowDown, { size: 11, class: 'sort-ic active' })
      : null
  },
}
</script>

<style scoped>
.all-section { display: flex; flex-direction: column; gap: 16px; }

/* KPI chips */
.kpi-row {
  display: flex; gap: 10px;
  flex-wrap: wrap;
}

/* Filter bar */
.filter-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 0;
  background: transparent;
  border: 0;
  border-radius: 0;
}
.grow { flex: 1; min-width: 0; }
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  min-width: 240px;
}
.search-ic {
  position: absolute;
  left: 10px;
  color: var(--hr-text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 34px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--hr-border-strong);
  border-radius: 999px;
  padding: 0 12px 0 30px;
  color: var(--hr-text);
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: var(--hr-accent-gold-border); }

.ghost-mini {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent;
  border: 1px solid var(--hr-border-strong);
  border-radius: 999px;
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 600;
  padding: 5px 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.ghost-mini:hover:not(:disabled) {
  background: rgba(255,255,255,0.06);
  color: var(--hr-text);
  border-color: var(--hr-accent-gold-border);
}
.ghost-mini:disabled { opacity: 0.5; cursor: not-allowed; }

/* Bulk bar */
.bulk-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 12px;
  color: var(--hr-accent-gold);
}
.bulk-count { font-size: 12px; font-weight: 700; }
.bulk-btn {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  color: var(--hr-accent-gold);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
}
.bulk-btn:hover { background: rgba(0,0,0,0.5); }
.muted { color: var(--hr-text-muted); font-size: 11px; }

.select-slide-enter-active, .select-slide-leave-active {
  transition: transform 0.22s var(--hr-spring), opacity 0.22s var(--hr-spring);
}
.select-slide-enter-from, .select-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ──────────── Table — Mission Control modern ──────────── */
.table-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.emp-table { width: 100%; border-collapse: separate; border-spacing: 0; }

.emp-table th {
  background: transparent;
  padding: 14px 16px 12px;
  text-align: left;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.4px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: color 180ms var(--hr-spring);
}
.emp-table th:hover { color: var(--hr-text-secondary); }
.emp-table th:first-child, .emp-table td:first-child { padding-left: 20px; }
.emp-table th:last-child, .emp-table td:last-child { padding-right: 20px; }
.th-check { width: 36px; cursor: default; }
.td-check { width: 36px; }

.emp-row {
  cursor: pointer;
  position: relative;
  transition: background 200ms var(--hr-spring);
  animation: hr-fade-up 0.3s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 28ms);
}

/* Left accent bar — appears on hover/selected (no glow on the row itself) */
.emp-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--hr-accent-gold);
  opacity: 0;
  transform: scaleY(0.3);
  transition: opacity 220ms var(--hr-spring), transform 280ms var(--hr-spring);
}
.emp-row:hover::before { opacity: 0.5; transform: scaleY(1); }
.emp-row.selected::before { opacity: 1; transform: scaleY(1); }

.emp-row:hover { background: rgba(255, 255, 255, 0.025); }
.emp-row.selected { background: rgba(251, 191, 36, 0.04); }

.emp-table td {
  padding: 13px 16px;
  font-size: 12.5px;
  color: var(--hr-text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.emp-row:last-child td { border-bottom: 0; }

.td-name { display: flex; align-items: center; gap: 12px; }
.name-block { display: flex; flex-direction: column; gap: 1px; }
.full-name { font-weight: 600; color: var(--hr-text); font-size: 13px; letter-spacing: -0.005em; }
.email { font-size: 10.5px; color: var(--hr-text-muted); }
.mono { font-family: var(--hr-mono); }
.emp-id { color: var(--hr-accent-gold); font-weight: 600; font-size: 11.5px; letter-spacing: 0.4px; }
.date { color: var(--hr-text-muted); font-size: 11.5px; letter-spacing: 0.3px; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: var(--hr-text-muted);
}

/* Skeleton rows */
.loading-grid { padding: 8px; }
.skel-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--hr-border);
}

/* Pagination */
.pagination-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: transparent;
}
.page-info { font-size: 11px; color: var(--hr-text-muted); }
.page-chips { display: flex; gap: 4px; align-items: center; }
.page-chip {
  min-width: 28px; height: 28px;
  border-radius: 8px;
  border: 1px solid var(--hr-border-strong);
  background: transparent;
  color: var(--hr-text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 6px;
  transition: all 0.2s;
}
.page-chip:hover:not(:disabled):not(.active):not(.ellipsis) {
  background: rgba(255,255,255,0.04);
  border-color: var(--hr-accent-gold-border);
}
.page-chip.active {
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  border-color: var(--hr-accent-gold-border);
}
.page-chip.ellipsis { cursor: default; border-color: transparent; }
.page-chip:disabled { opacity: 0.4; cursor: not-allowed; }

:deep(.sort-ic.active) { color: var(--hr-accent-gold); display: inline; margin-left: 4px; vertical-align: middle; }
</style>
