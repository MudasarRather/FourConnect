<template>
  <div class="profiles-section">
    <!-- Search + stats strip -->
    <header class="ps-head">
      <div class="ps-title-row">
        <div>
          <h3>Employee Profiles</h3>
          <p>Browse every employee in one place. Click a card to open the full profile.</p>
        </div>
        <div class="ps-stats">
          <div class="stat">
            <span class="stat-label">Total</span>
            <span class="stat-value">{{ total }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Showing</span>
            <span class="stat-value">{{ results.length }}</span>
          </div>
        </div>
      </div>

      <div class="ps-toolbar">
        <div class="search-cell">
          <HrInput
            v-model="q"
            placeholder="Search by name, email, or employee ID…"
            @update:modelValue="onInput"
          >
            <template #left><Search :size="14" /></template>
          </HrInput>
        </div>
        <div class="filter-cell">
          <HrSelect
            v-model="filterState"
            :options="stateOptions"
            placeholder="All states"
            @update:modelValue="onFilterChange"
          />
        </div>
        <div class="view-toggle">
          <button :class="['vt-btn', { active: view === 'grid' }]" @click="view = 'grid'" title="Grid view">
            <LayoutGrid :size="14" />
          </button>
          <button :class="['vt-btn', { active: view === 'list' }]" @click="view = 'list'" title="List view">
            <Rows3 :size="14" />
          </button>
        </div>
      </div>
    </header>

    <div v-if="loading && !results.length" class="quiet">
      <Loader2 class="spin" :size="14" /> Loading employees…
    </div>

    <!-- ─── Grid view (cards) ─── -->
    <ul v-else-if="results.length && view === 'grid'" class="ps-grid">
      <li
        v-for="(e, i) in results"
        :key="e.id"
        class="ps-card"
        :style="{ '--i': i }"
        @click="openProfile(e.id)"
        @mousemove="onCardMove"
        @mouseleave="onCardLeave"
      >
        <span class="ps-card-spot" aria-hidden="true" />
        <span class="ps-card-shine" aria-hidden="true" />
        <div class="ps-card-inner">
          <div class="ps-card-top">
            <EmployeeAvatar :name="e.full_name" :avatar-url="e.avatar_url" :seed="e.employee_id" size="lg" aurora />
            <LifecycleBadge :state="e.lifecycle_state" size="sm" />
          </div>
          <div class="ps-card-text">
            <strong>{{ e.full_name || '—' }}</strong>
            <span class="mono">{{ e.employee_id }}</span>
          </div>
          <div class="ps-card-meta">
            <span class="meta-line">
              <Briefcase :size="11" /> {{ e.designation_name || '—' }}
            </span>
            <span class="meta-line">
              <Building2 :size="11" /> {{ e.department_name || '—' }}
            </span>
            <span v-if="e.email" class="meta-line truncate">
              <Mail :size="11" /> {{ e.email }}
            </span>
          </div>
          <span class="ps-card-cta">
            Open profile <ArrowRight :size="11" />
          </span>
        </div>
      </li>
    </ul>

    <!-- ─── List view ─── -->
    <ul v-else-if="results.length" class="ps-list">
      <li
        v-for="(e, i) in results"
        :key="e.id"
        class="ps-row"
        :style="{ '--i': i }"
        @click="openProfile(e.id)"
      >
        <EmployeeAvatar :name="e.full_name" :avatar-url="e.avatar_url" :seed="e.employee_id" size="sm" />
        <div class="row-text">
          <strong>{{ e.full_name || '—' }}</strong>
          <span>{{ e.designation_name || '—' }} · {{ e.department_name || '—' }}</span>
        </div>
        <span class="row-emp-id mono">{{ e.employee_id }}</span>
        <LifecycleBadge :state="e.lifecycle_state" size="sm" />
        <ArrowRight class="row-arrow" :size="14" />
      </li>
    </ul>

    <div v-else class="empty-state">
      <UserSearch :size="32" />
      <p v-if="q.trim()">No employees match "<strong>{{ q }}</strong>".</p>
      <p v-else>No employees yet — onboard one via Add Employee.</p>
    </div>

    <!-- Pagination chips -->
    <div v-if="results.length && totalPages > 1" class="ps-pagination">
      <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
      <div class="page-chips">
        <button class="page-chip" :disabled="page <= 1" @click="setPage(page - 1)">
          <ChevronLeft :size="14" />
        </button>
        <button class="page-chip" :disabled="page >= totalPages" @click="setPage(page + 1)">
          <ChevronRight :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, Loader2, ArrowRight, Briefcase, Building2, Mail,
  LayoutGrid, Rows3, UserSearch, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'
import EmployeeAvatar from '../../../../components/hr/EmployeeAvatar.vue'
import LifecycleBadge from '../../../../components/hr/LifecycleBadge.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import axios from 'axios'

const router = useRouter()
const emit = defineEmits(['open-profile'])

const q = ref('')
const filterState = ref(null)
const view = ref('grid')
const results = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const limit = 20

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

const stateOptions = [
  { value: null,           label: 'All states' },
  { value: 'ACTIVE',       label: 'Active' },
  { value: 'ON_PROBATION', label: 'On Probation' },
  { value: 'ON_NOTICE',    label: 'On Notice' },
  { value: 'SUSPENDED',    label: 'Suspended' },
  { value: 'INACTIVE',     label: 'Inactive' },
  { value: 'EXITED',       label: 'Exited' },
  { value: 'ARCHIVED',     label: 'Archived' },
]

// Cursor-following spotlight — writes --mx / --my as percentages of the
// card's bounding box. CSS reads them into a radial-gradient under the
// content layer. No JS animation loop; relies entirely on requestAnimation-
// less mousemove + GPU compositing on the gradient.
const onCardMove = (e) => {
  const el = e.currentTarget
  if (!el) return
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height) return
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}
const onCardLeave = (e) => {
  const el = e.currentTarget
  if (!el) return
  el.style.removeProperty('--mx')
  el.style.removeProperty('--my')
}

const openProfile = (id) => {
  // Prefer the full-page route; fall back to the legacy drawer emit.
  if (router.hasRoute('HrEmployeeProfile')) {
    router.push({ name: 'HrEmployeeProfile', params: { id } })
  } else {
    emit('open-profile', id)
  }
}

let timer = null
const onInput = () => {
  clearTimeout(timer)
  loading.value = true
  timer = setTimeout(() => { page.value = 1; fetchAll() }, 240)
}
const onFilterChange = () => { page.value = 1; fetchAll() }
const setPage = (p) => { page.value = p; fetchAll() }

const fetchAll = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const params = {
      page: page.value, limit,
      include_deleted: true,
    }
    const search = q.value.trim()
    if (search) params.search = search
    if (filterState.value) params.lifecycle_state = filterState.value
    const res = await axios.get('http://localhost:8000/api/hr/employees/', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    results.value = res.data.items || []
    total.value = res.data.total || 0
  } catch {
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.profiles-section { display: flex; flex-direction: column; gap: 16px; }

/* Head */
.ps-head {
  display: flex; flex-direction: column; gap: 14px;
  padding: 16px 18px;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.55), rgba(18, 18, 22, 0.5));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
}
.ps-title-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.ps-title-row h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.02em;
}
.ps-title-row p { margin: 4px 0 0; color: var(--hr-text-muted); font-size: 12.5px; }
.ps-stats { display: inline-flex; gap: 10px; }
.stat {
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.stat-label { font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted); text-transform: uppercase; letter-spacing: 0.7px; }
.stat-value { font-size: 16px; font-weight: 700; color: var(--hr-accent-gold); font-family: var(--hr-mono); }

.ps-toolbar {
  display: grid;
  grid-template-columns: 1fr 200px auto;
  gap: 10px;
  align-items: center;
}
.search-cell, .filter-cell { min-width: 0; }
.view-toggle {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 3px;
}
.vt-btn {
  width: 32px; height: 32px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  color: var(--hr-text-muted);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 180ms var(--hr-spring);
}
.vt-btn:hover { color: var(--hr-text); }
.vt-btn.active { background: var(--hr-accent-gold); color: #1a1a1c; box-shadow: 0 0 14px rgba(251, 191, 36, 0.35); }

/* Grid view */
.ps-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.ps-card {
  position: relative;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.62), rgba(18, 18, 22, 0.52));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  animation: hr-fade-up 320ms var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 34ms);
  transition:
    transform 320ms var(--hr-spring),
    border-color 320ms var(--hr-spring),
    box-shadow 320ms var(--hr-spring),
    background 320ms var(--hr-spring);
  will-change: transform;
}
.ps-card-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 18px 16px;
}

/* Cursor-following soft spotlight — sits beneath the content. The CSS vars
   --mx / --my are written by the @mousemove handler in JS as percentages. */
.ps-card-spot {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
  background: radial-gradient(
    260px circle at var(--mx, 50%) var(--my, 0%),
    rgba(251, 191, 36, 0.18),
    rgba(251, 146, 60, 0.06) 40%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 280ms var(--hr-spring);
}
.ps-card:hover .ps-card-spot { opacity: 1; }

/* Diagonal sheen — single sweep on hover, no infinite loop. */
.ps-card-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(
    115deg,
    transparent 32%,
    rgba(255, 255, 255, 0.06) 50%,
    transparent 68%
  );
  transform: translateX(-120%);
  transition: transform 900ms var(--hr-spring);
}
.ps-card:hover .ps-card-shine { transform: translateX(120%); }

/* Gold seam along the top — fades in on hover, signals interactivity. */
.ps-card::before {
  content: '';
  position: absolute;
  top: 0; left: 14%; right: 14%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--hr-accent-gold), transparent);
  opacity: 0;
  transition: opacity 320ms var(--hr-spring), left 320ms var(--hr-spring), right 320ms var(--hr-spring);
  z-index: 3;
  pointer-events: none;
}
.ps-card:hover::before { opacity: 0.9; left: 4%; right: 4%; }

.ps-card:hover {
  transform: translateY(-4px);
  border-color: rgba(251, 191, 36, 0.28);
  background: linear-gradient(180deg, rgba(32, 32, 36, 0.72), rgba(22, 22, 26, 0.62));
  box-shadow:
    0 24px 48px -22px rgba(0, 0, 0, 0.78),
    0 0 0 1px rgba(251, 191, 36, 0.12) inset,
    0 0 36px -10px rgba(251, 191, 36, 0.22);
}

@media (prefers-reduced-motion: reduce) {
  .ps-card,
  .ps-card-spot,
  .ps-card-shine,
  .ps-card::before {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
}

.ps-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.ps-card-text { display: flex; flex-direction: column; gap: 2px; }
.ps-card-text strong {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ps-card-text .mono { font-family: var(--hr-mono); color: var(--hr-accent-gold); font-size: 11px; font-weight: 600; }

.ps-card-meta {
  display: flex; flex-direction: column; gap: 4px;
  margin-top: 4px;
}
.meta-line {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px;
  color: var(--hr-text-muted);
}
.meta-line.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ps-card-cta {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
  font-size: 11px;
  font-weight: 700;
  color: var(--hr-accent-gold);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.65;
  transition: opacity 200ms var(--hr-spring), transform 200ms var(--hr-spring);
}
.ps-card:hover .ps-card-cta {
  opacity: 1;
  transform: translateX(2px);
}

/* List view */
.ps-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.ps-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  gap: 14px;
  align-items: center;
  padding: 10px 14px;
  background: var(--hr-surface);
  border: 1px solid var(--hr-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
  animation: hr-fade-up 280ms var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 22ms);
}
.ps-row:hover {
  border-color: var(--hr-accent-gold-border);
  transform: translateX(3px);
}
.row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row-text strong { color: var(--hr-text); font-size: 13.5px; font-weight: 600; }
.row-text span { color: var(--hr-text-muted); font-size: 11.5px; }
.row-emp-id { color: var(--hr-accent-gold); font-size: 11px; font-weight: 600; }
.mono { font-family: var(--hr-mono); }
.row-arrow { color: var(--hr-text-muted); transition: transform 200ms var(--hr-spring), color 200ms; }
.ps-row:hover .row-arrow { color: var(--hr-accent-gold); transform: translateX(2px); }

/* Empty / loading */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; gap: 10px;
  color: var(--hr-text-muted);
  background: rgba(28, 28, 32, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}
.quiet {
  color: var(--hr-text-muted);
  font-size: 12px;
  text-align: center;
  padding: 24px;
  display: flex; align-items: center; gap: 8px; justify-content: center;
}

/* Pagination */
.ps-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
}
.page-info { font-size: 11px; color: var(--hr-text-muted); }
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
.page-chip:hover:not(:disabled) { background: rgba(255,255,255,0.04); border-color: var(--hr-accent-gold-border); color: var(--hr-accent-gold); }
.page-chip:disabled { opacity: 0.4; cursor: not-allowed; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .ps-toolbar { grid-template-columns: 1fr; }
  .ps-stats { width: 100%; }
}
</style>
