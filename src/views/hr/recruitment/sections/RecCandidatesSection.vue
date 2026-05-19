<template>
  <div class="rec-section rec-fade-up">
    <!-- KPI status filter row -->
    <RecKpiRow
      :chips="kpiChips"
      :active="filters.status || 'all'"
      @select="setStatus"
    />

    <!-- Toolbar -->
    <RecToolbar
      :search="filters.search"
      :search-placeholder="'Search name, email, mobile…'"
      :primary="{ label: 'Add Candidate', icon: UserPlus }"
      :loading="loading"
      :can-clear="hasFilters"
      :filters="toolbarFilters"
      @update:search="(v) => (filters.search = v)"
      @search-submit="fetchList"
      @filter-change="onFilterChange"
      @refresh="fetchList"
      @clear="onClearFilters"
      @primary="openCreate"
    />

    <!-- Candidate cards -->
    <div v-if="loading" class="cand-grid rec-stagger">
      <div v-for="i in 6" :key="i" class="rec-skel" style="height: 200px; border-radius: 16px" />
    </div>
    <RecEmptyState
      v-else-if="!items.length"
      :icon="UserSearch"
      title="No candidates yet"
      body="Build your candidate database to start hiring. Add candidates manually or import a resume."
      cta-label="Add First Candidate"
      :cta-icon="UserPlus"
      @cta="openCreate"
    />
    <div v-else class="cand-grid">
      <article
        v-for="(c, i) in items"
        :key="c.id"
        class="cand-card"
        :style="{ '--i': i }"
        @click="openEdit(c)"
      >
        <div class="cand-head">
          <div class="cand-avatar" :style="{ background: avatarGradient(c.full_name) }">
            {{ initials(c.full_name) }}
          </div>
          <div class="cand-id-block">
            <div class="cand-code rec-mono">{{ c.candidate_code }}</div>
            <span :class="['cand-status', `cand-status-${c.status.toLowerCase()}`]">
              {{ humanStatus(c.status) }}
            </span>
          </div>
        </div>
        <h3 class="cand-name">{{ c.full_name }}</h3>
        <div class="cand-meta">
          <span v-if="c.current_designation">{{ c.current_designation }}</span>
          <span v-if="c.current_company">· {{ c.current_company }}</span>
        </div>
        <div class="cand-contacts">
          <span v-if="c.email" class="contact"><Mail :size="12" /> {{ c.email }}</span>
          <span v-if="c.mobile" class="contact"><Phone :size="12" /> {{ c.mobile }}</span>
        </div>
        <div class="cand-stats">
          <div class="stat">
            <span class="label">Exp</span>
            <span class="value">{{ c.total_experience_years || 0 }}y</span>
          </div>
          <div class="stat">
            <span class="label">Notice</span>
            <span class="value">{{ c.notice_period_days || '—' }}{{ c.notice_period_days ? 'd' : '' }}</span>
          </div>
          <div class="stat">
            <span class="label">Applies</span>
            <span class="value">{{ c.applications_count }}</span>
          </div>
        </div>
        <div v-if="(c.skills || []).length" class="cand-skills">
          <span v-for="s in (c.skills || []).slice(0, 4)" :key="s" class="skill-pill">{{ s }}</span>
          <span v-if="(c.skills || []).length > 4" class="skill-more">+{{ c.skills.length - 4 }}</span>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && total > filters.limit" class="rec-pagination-bar">
      <span class="page-info">Page {{ filters.page }} / {{ totalPages }} · {{ total }} candidates</span>
      <div class="page-chips">
        <button class="page-chip" :disabled="filters.page <= 1" @click="goPage(filters.page - 1)">‹</button>
        <button class="page-chip" :disabled="filters.page >= totalPages" @click="goPage(filters.page + 1)">›</button>
      </div>
    </div>

    <!-- Add/Edit modal (centred glass) -->
    <CandidateModal
      :open="modal.open"
      :initial="modal.data"
      :submitting="modal.submitting"
      @close="closeModal"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  UserPlus, UserSearch, Mail, Phone, Layers, Star, CheckCircle, XCircle, Clock, Sparkles,
} from 'lucide-vue-next'

import RecKpiRow from '../components/RecKpiRow.vue'
import RecToolbar from '../components/RecToolbar.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import CandidateModal from '../modals/CandidateModal.vue'

import { useCandidates } from '../../../../composables/useRecruitment'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()

const {
  items, total, loading, filters, totalPages, setFilters, setPage,
  fetchList, create, update,
} = useCandidates()

// KPI status chips
const kpiChips = computed(() => [
  { key: 'all',         label: 'All',         value: total.value || 0, tone: 'neutral', icon: Layers },
  { key: 'NEW',         label: 'New',         value: null, tone: 'gold',    icon: Star },
  { key: 'SHORTLISTED', label: 'Shortlisted', value: null, tone: 'orange',  icon: CheckCircle },
  { key: 'INTERVIEW',   label: 'Interview',   value: null, tone: 'orange',  icon: Clock },
  { key: 'SELECTED',    label: 'Selected',    value: null, tone: 'orange',  icon: CheckCircle },
  { key: 'REJECTED',    label: 'Rejected',    value: null, tone: 'red',     icon: XCircle },
])

const setStatus = async (key) => {
  const v = key === 'all' ? null : key
  setFilters({ status: v })
  await fetchList()
}

const toolbarFilters = computed(() => [
  {
    key: 'talentpool',
    label: 'Talent pool',
    value: filters.value.in_talent_pool ?? null,
    options: [
      { value: true,  label: 'In talent pool' },
      { value: false, label: 'Not in talent pool' },
    ],
  },
  {
    key: 'source',
    label: 'Source',
    value: filters.value.source ?? null,
    options: [
      { value: 'PORTAL',   label: 'Portal' },
      { value: 'REFERRAL', label: 'Referral' },
      { value: 'LINKEDIN', label: 'LinkedIn' },
      { value: 'NAUKRI',   label: 'Naukri' },
      { value: 'INDEED',   label: 'Indeed' },
      { value: 'AGENCY',   label: 'Agency' },
      { value: 'WALK_IN',  label: 'Walk-in' },
      { value: 'CAMPUS',   label: 'Campus' },
      { value: 'DIRECT',   label: 'Direct' },
      { value: 'OTHER',    label: 'Other' },
    ],
  },
])

const hasFilters = computed(() =>
  !!filters.value.search ||
  !!filters.value.status ||
  filters.value.in_talent_pool !== null && filters.value.in_talent_pool !== undefined ||
  !!filters.value.source
)

const onFilterChange = async (key, value) => {
  if (key === 'talentpool') {
    setFilters({ in_talent_pool: value })
  } else if (key === 'source') {
    setFilters({ source: value })
  }
  await fetchList()
}
const onClearFilters = async () => {
  setFilters({ search: '', status: null, in_talent_pool: null, source: null })
  await fetchList()
}
const goPage = async (p) => { setPage(p); await fetchList() }

// ─── Modal ───
const modal = ref({ open: false, id: null, data: null, submitting: false })
const openCreate = () => { modal.value = { open: true, id: null, data: null, submitting: false } }
const openEdit = (c) => { modal.value = { open: true, id: c.id, data: { ...c }, submitting: false } }
const closeModal = () => { modal.value = { open: false, id: null, data: null, submitting: false } }

const onSubmit = async (payload) => {
  modal.value.submitting = true
  try {
    if (modal.value.id) {
      await update(modal.value.id, payload)
      success('Candidate updated')
    } else {
      await create(payload)
      success('Candidate added')
    }
    closeModal()
    await fetchList()
    emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to save candidate')
  } finally {
    modal.value.submitting = false
  }
}

// ─── UI helpers ───
const initials = (name) => {
  const p = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const avatarGradient = (name) => {
  const palettes = [
    'linear-gradient(135deg, #fbbf24, #fb923c)',
    'linear-gradient(135deg, #f59e0b, #ea580c)',
    'linear-gradient(135deg, #fde68a, #f59e0b)',
    'linear-gradient(135deg, #fb923c, #f97316)',
    'linear-gradient(135deg, #fbbf24, #f59e0b)',
    'linear-gradient(135deg, #f97316, #ea580c)',
  ]
  let h = 0
  for (const ch of (name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return palettes[h % palettes.length]
}
const humanStatus = (s) => ({
  NEW: 'New', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview',
  SELECTED: 'Selected', OFFERED: 'Offered', JOINED: 'Joined', REJECTED: 'Rejected',
  ON_HOLD: 'On Hold', TALENT_POOL: 'Talent Pool', ARCHIVED: 'Archived',
}[s] || s)

onMounted(fetchList)
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 12px; }

.cand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.cand-card {
  position: relative;
  display: flex; flex-direction: column; gap: 12px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  transition: transform 220ms var(--hr-spring),
              border-color 220ms var(--hr-spring),
              box-shadow 220ms var(--hr-spring);
  animation: rec-rise 0.42s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 40ms);
}
.cand-card::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--hr-accent-gold);
  opacity: 0;
  transform: scaleY(0.3);
  transition: opacity 220ms var(--hr-spring), transform 280ms var(--hr-spring);
  border-radius: 16px 0 0 16px;
}
.cand-card:hover {
  transform: translateY(-2px);
  border-color: var(--hr-accent-gold-border);
  box-shadow: 0 14px 32px -16px rgba(251, 146, 60, 0.32);
}
.cand-card:hover::before { opacity: 1; transform: scaleY(1); }

.cand-head { display: flex; align-items: center; gap: 12px; }
.cand-avatar {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-weight: 700;
  font-size: 15px;
  color: #1a1a1c;
  box-shadow: 0 4px 12px rgba(251, 146, 60, 0.28);
}
.cand-id-block { display: flex; flex-direction: column; gap: 3px; }
.cand-code { font-size: 11px; color: var(--hr-accent-gold); letter-spacing: 0.4px; }
.cand-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  width: max-content;
}
.cand-status-new         { background: rgba(253,230,138,0.14); color: var(--rec-stage-applied); }
.cand-status-screening   { background: rgba(251,191,36,0.14);  color: var(--rec-stage-screening); }
.cand-status-shortlisted { background: rgba(245,158,11,0.14);  color: var(--rec-stage-shortlisted); }
.cand-status-interview   { background: rgba(251,146,60,0.14);  color: var(--rec-stage-interview); }
.cand-status-selected    { background: rgba(234,88,12,0.16);   color: var(--rec-stage-selected); }
.cand-status-offered     { background: rgba(249,115,22,0.16);  color: var(--rec-stage-offer); }
.cand-status-joined      { background: rgba(52,211,153,0.14);  color: var(--rec-stage-joined); }
.cand-status-rejected    { background: rgba(248,113,113,0.14); color: var(--rec-stage-rejected); }
.cand-status-on_hold     { background: rgba(156,163,175,0.14); color: var(--rec-stage-withdrawn); }
.cand-status-talent_pool { background: rgba(251,146,60,0.14);  color: var(--hr-orange); }
.cand-status-archived    { background: rgba(156,163,175,0.14); color: var(--rec-stage-withdrawn); }

.cand-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.cand-meta { font-size: 12px; color: var(--hr-text-muted); }
.cand-contacts { display: flex; flex-wrap: wrap; gap: 10px; }
.contact {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px;
  color: var(--hr-text-secondary);
}

.cand-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.cand-stats .stat { display: flex; flex-direction: column; gap: 2px; }
.cand-stats .label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}
.cand-stats .value {
  font-size: 14px;
  font-weight: 700;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
}

.cand-skills { display: flex; flex-wrap: wrap; gap: 4px; }
.skill-pill {
  padding: 2px 7px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  font-size: 10px; font-weight: 600;
  color: var(--hr-accent-gold);
}
.skill-more { font-size: 10px; color: var(--hr-text-muted); font-weight: 600; }

.page-info { font-size: 11px; color: var(--hr-text-muted); }
.page-chips { display: flex; gap: 4px; }
.page-chip {
  min-width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid var(--hr-border-strong);
  background: transparent;
  color: var(--hr-text-secondary);
  font-size: 14px;
  cursor: pointer;
}
.page-chip:hover:not(:disabled) {
  background: rgba(255,255,255,0.04);
  border-color: var(--hr-accent-gold-border);
}
.page-chip:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
