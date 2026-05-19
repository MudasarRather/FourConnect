<template>
  <div class="rec-section rec-fade-up">
    <div class="rec-toolbar-surface">
      <div class="toolbar-left">
        <div v-for="f in statusFilters" :key="f.key"
          :class="['rec-filter-pill', filters.status === f.value && 'is-active']"
          @click="setStatus(f.value)">
          <component :is="f.icon" :size="13" />
          <span>{{ f.label }}</span>
        </div>
      </div>
      <div class="toolbar-divider" />
      <div class="toolbar-right">
        <div class="rec-search-pill toolbar-search">
          <Search :size="14" class="ic" />
          <input v-model="filters.search" placeholder="Search position or code…" @keyup.enter="onSearch" />
        </div>
        <button class="rec-btn-primary" @click="openCreate">
          <Plus :size="15" /> New Position
        </button>
      </div>
    </div>

    <div v-if="loading" class="pos-grid rec-stagger">
      <div v-for="i in 6" :key="i" class="rec-skel" style="height: 220px; border-radius: 16px" />
    </div>
    <RecEmptyState
      v-else-if="!items.length"
      :icon="Briefcase"
      title="No open positions"
      body="Convert an approved requisition or create a position directly."
      cta-label="Create Position"
      :cta-icon="Plus"
      @cta="openCreate"
    />
    <div v-else class="pos-grid">
      <article
        v-for="(p, i) in items"
        :key="p.id"
        v-tilt
        class="pos-card rec-card rec-card-glow"
        v-motion
        :initial="{ opacity: 0, y: 14 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 360, delay: i * 55 } }"
      >
        <div class="card-top">
          <div class="card-code rec-mono">{{ p.job_code }}</div>
          <span :class="['status', `status-${p.status.toLowerCase()}`]">
            <span class="dot" /> {{ humanStatus(p.status) }}
          </span>
        </div>
        <h3 class="card-title">{{ p.job_title }}</h3>
        <div class="card-meta">
          <span v-if="p.department_name"><Building2 :size="13" /> {{ p.department_name }}</span>
          <span v-if="p.location_name"><MapPin :size="13" /> {{ p.location_name }}</span>
          <span><Briefcase :size="13" /> {{ humanWorkMode(p.work_mode) }}</span>
        </div>

        <div class="card-stats">
          <div class="stat">
            <span class="label">Openings</span>
            <span class="value rec-mono">{{ p.openings_count }}</span>
          </div>
          <div class="stat">
            <span class="label">Filled</span>
            <span class="value rec-mono">{{ p.filled_count }}</span>
          </div>
          <div class="stat">
            <span class="label">Applies</span>
            <span class="value rec-mono">{{ p.applications_count }}</span>
          </div>
        </div>

        <div v-if="(p.skills_required || []).length" class="card-skills">
          <span v-for="s in (p.skills_required || []).slice(0, 4)" :key="s" class="skill-pill">{{ s }}</span>
          <span v-if="(p.skills_required || []).length > 4" class="skill-more">+{{ p.skills_required.length - 4 }}</span>
        </div>

        <div class="card-actions">
          <button v-if="p.status === 'DRAFT'" class="rec-btn-primary" @click="publishOne(p)">
            <Send :size="13" /> Publish
          </button>
          <button v-if="p.status === 'ON_HOLD'" class="rec-btn-primary" @click="resumeOne(p)">
            <Play :size="13" /> Resume
          </button>
          <button v-if="p.status === 'OPEN'" class="rec-btn-ghost" @click="holdOne(p)">
            <Pause :size="13" /> Hold
          </button>
          <button v-if="p.status === 'OPEN' || p.status === 'ON_HOLD'" class="rec-btn-ghost" @click="closeOne(p)">
            <Lock :size="13" /> Close
          </button>
          <button class="rec-btn-ghost" @click="openEdit(p)">
            <Pencil :size="13" /> Edit
          </button>
        </div>
      </article>
    </div>

    <div v-if="!loading && total > filters.limit" class="rec-pagination">
      <span class="rec-mono">Page {{ filters.page }} / {{ totalPages }} · {{ total }} positions</span>
      <div class="pg-controls">
        <button class="rec-btn-ghost" :disabled="filters.page <= 1" @click="goPage(filters.page - 1)">
          <ChevronLeft :size="14" /> Prev
        </button>
        <button class="rec-btn-ghost" :disabled="filters.page >= totalPages" @click="goPage(filters.page + 1)">
          Next <ChevronRight :size="14" />
        </button>
      </div>
    </div>

    <PositionDrawer
      :open="drawer.open"
      :reference="reference"
      :initial="drawer.data"
      @close="drawer.open = false"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  Plus, Search, Briefcase, Building2, MapPin, Send, Pause, Play, Lock, Pencil,
  ChevronLeft, ChevronRight, Layers, FileText, CheckCircle, PauseCircle, Archive,
} from 'lucide-vue-next'

import PositionDrawer from '../drawers/PositionDrawer.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import { usePositions } from '../../../../composables/useRecruitment'
import { useHrReference } from '../../../../composables/useEmployees'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()
const { reference } = useHrReference()

const {
  items, total, loading, filters, totalPages, setFilters, setPage,
  fetchList, create, update, publish, hold, close,
} = usePositions()

const statusFilters = [
  { key: 'all',    label: 'All',     value: null,        icon: Layers },
  { key: 'draft',  label: 'Draft',   value: 'DRAFT',     icon: FileText },
  { key: 'open',   label: 'Open',    value: 'OPEN',      icon: CheckCircle },
  { key: 'hold',   label: 'On Hold', value: 'ON_HOLD',   icon: PauseCircle },
  { key: 'closed', label: 'Closed',  value: 'CLOSED',    icon: Archive },
]

const setStatus = async (v) => { setFilters({ status: v }); await fetchList() }
const onSearch = async () => { setFilters({ search: filters.value.search }); await fetchList() }
const goPage = async (p) => { setPage(p); await fetchList() }

const drawer = ref({ open: false, id: null, data: null })
const openCreate = () => { drawer.value = { open: true, id: null, data: null } }
const openEdit = (p) => { drawer.value = { open: true, id: p.id, data: { ...p } } }

const onSubmit = async (payload) => {
  try {
    if (drawer.value.id) { await update(drawer.value.id, payload); success('Position updated') }
    else { await create(payload); success('Position created (Draft)') }
    drawer.value.open = false
    await fetchList(); emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to save position')
  }
}

const publishOne = async (p) => {
  try { await publish(p.id); success(`${p.job_code} published`); await fetchList(); emit('refresh-counts') }
  catch (e) { error(e?.response?.data?.detail || 'Publish failed') }
}
const holdOne = async (p) => {
  try { await hold(p.id); success(`${p.job_code} put on hold`); await fetchList(); emit('refresh-counts') }
  catch (e) { error(e?.response?.data?.detail || 'Hold failed') }
}
const resumeOne = async (p) => {
  // publish() sets status to OPEN (it's a generic open transition; backend allows from ON_HOLD)
  try { await publish(p.id); success(`${p.job_code} resumed`); await fetchList(); emit('refresh-counts') }
  catch (e) { error(e?.response?.data?.detail || 'Resume failed') }
}
const closeOne = async (p) => {
  if (!confirm(`Close position ${p.job_code}? Applications will remain visible.`)) return
  try { await close(p.id); success(`${p.job_code} closed`); await fetchList(); emit('refresh-counts') }
  catch (e) { error(e?.response?.data?.detail || 'Close failed') }
}

const humanStatus = (s) => ({
  DRAFT: 'Draft', OPEN: 'Open', ON_HOLD: 'On Hold', CLOSED: 'Closed', ARCHIVED: 'Archived',
}[s] || s)
const humanWorkMode = (m) => ({ ONSITE: 'Onsite', REMOTE: 'Remote', HYBRID: 'Hybrid' }[m] || m)

onMounted(fetchList)
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 14px; }

.pos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  /* All grid rows align to the tallest card in the row */
  grid-auto-rows: 1fr;
  align-items: stretch;
  gap: 14px;
}
.pos-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;        /* fill grid track so all cards match the tallest */
  min-height: 320px;   /* floor so short cards stay balanced */
  transition: transform 220ms var(--hr-spring);
}
.pos-card:hover { transform: translateY(-3px); }

/* Push the skills row + action row to the bottom so the upper region stays
   aligned across cards regardless of skill/badge variability. */
.pos-card .card-skills { margin-top: auto; }

.card-top {
  display: flex; align-items: center; justify-content: space-between;
}
.card-code { font-size: 11px; color: var(--hr-accent-gold); letter-spacing: 0.04em; }
.card-title {
  margin: 0; font-size: 17px; font-weight: 700;
  color: var(--hr-text); line-height: 1.3;
  letter-spacing: -0.01em;
}
.card-meta {
  display: flex; flex-wrap: wrap; gap: 10px;
  font-size: 12px; color: var(--hr-text-muted);
}
.card-meta span { display: inline-flex; align-items: center; gap: 4px; }

.card-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.card-stats .stat { display: flex; flex-direction: column; gap: 2px; }
.card-stats .label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
.card-stats .value { font-size: 18px; font-weight: 700; color: var(--hr-text); }

.card-skills { display: flex; flex-wrap: wrap; gap: 6px; }
.skill-pill {
  padding: 2px 8px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  font-size: 10px; font-weight: 600;
  color: var(--hr-accent-gold);
}
.skill-more {
  font-size: 10px; color: var(--hr-text-muted); font-weight: 600;
}

.card-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.card-actions button { font-size: 12px; padding: 6px 12px; }

.status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  border: 1px solid currentColor;
}
.status .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.status-draft     { color: #9ca3af; }
.status-open      { color: #34d399; }
.status-on_hold   { color: #fbbf24; }
.status-closed    { color: #6b7280; }
.status-archived  { color: #6b7280; }

.rec-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 4px;
  font-size: 12px;
  color: var(--hr-text-muted);
}
.pg-controls { display: flex; gap: 6px; }
</style>
