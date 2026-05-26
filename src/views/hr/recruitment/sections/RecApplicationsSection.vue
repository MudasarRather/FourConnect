<template>
  <div class="rec-section rec-fade-up">
    <!-- KPI stage filter -->
    <RecKpiRow
      :chips="kpiChips"
      :active="filters.stage || 'all'"
      @select="setStage"
    />

    <!-- Toolbar -->
    <RecToolbar
      :search="filters.search"
      :search-placeholder="'Search application…'"
      :primary="{ label: 'New Application', icon: Plus }"
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

    <RecTableCard
      :loading="loading"
      :rows="items"
      :total="total"
      :page="filters.page"
      :total-pages="totalPages"
      :page-size="filters.limit"
      grid-css="120px 1.4fr 1.4fr 150px 110px 140px 110px 100px 180px"
      @page="goPage"
    >
      <template #header>
        <th>Application</th>
        <th>Candidate</th>
        <th>Position</th>
        <th>Department</th>
        <th>Source</th>
        <th>Stage</th>
        <th>Rating</th>
        <th>Applied</th>
        <th></th>
      </template>
      <template #row="{ item, idx }">
        <tr class="rec-row" :style="{ '--i': idx }">
          <td class="cell-code">{{ item.application_code }}</td>
          <td class="cell-title">{{ item.candidate_name }}</td>
          <td>
            {{ item.position_title }}
            <span class="cell-dim rec-mono"> · {{ item.position_code }}</span>
          </td>
          <td>{{ item.department_name || '—' }}</td>
          <td><span class="src-pill">{{ humanSource(item.source) }}</span></td>
          <td>
            <span :class="['rec-stage-chip', `rec-stage-${item.current_stage.toLowerCase()}`]">
              <span class="dot" /> {{ humanStage(item.current_stage) }}
            </span>
          </td>
          <td>
            <div class="rating">
              <Star v-for="n in 5" :key="n" :size="12"
                :fill="(item.rating || 0) >= n ? '#fbbf24' : 'transparent'"
                :stroke="(item.rating || 0) >= n ? '#fbbf24' : '#6b7280'" />
            </div>
          </td>
          <td class="cell-dim">{{ formatDate(item.applied_date) }}</td>
          <td class="cell-actions" @click.stop>
            <div class="stage-select-wrap">
              <HrSelect
                :model-value="item.current_stage"
                :options="stageOptions"
                placeholder="Set stage"
                @update:model-value="(v) => onStageChange(item, v)"
              />
            </div>
          </td>
        </tr>
      </template>
      <template #empty>
        <RecEmptyState
          :icon="ClipboardList"
          title="No applications yet"
          body="Applications appear here when a candidate applies to an open position."
          cta-label="Create Application"
          :cta-icon="Plus"
          @cta="openCreate"
        />
      </template>
    </RecTableCard>

    <!-- Create Application Modal (centred glass) -->
    <RecModal
      :open="modal.open"
      title="New Application"
      subtitle="Link a candidate to an open position"
      :icon="Plus"
      :width="540"
      @close="closeModal"
    >
      <div class="form-grid">
        <div class="field-block">
          <HrFieldLabel label="Candidate" required />
          <HrSelect v-model="modal.candidate_id"
                    :options="candidateOptions"
                    placeholder="Select candidate…" searchable />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Position" required />
          <HrSelect v-model="modal.position_id"
                    :options="positionOptions"
                    placeholder="Select open position…" searchable />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Source" />
          <HrSelect v-model="modal.source" :options="sourceOptions" />
        </div>
        <div class="form-hint">
          <Info :size="13" />
          A candidate can apply to multiple positions — just pick a different position each time.
        </div>
      </div>
      <template #footer>
        <button class="ghost" @click="closeModal">Cancel</button>
        <div class="grow" />
        <button class="primary"
                :disabled="modal.submitting || !modal.candidate_id || !modal.position_id"
                @click="onCreate">
          <Plus :size="14" /> Create
        </button>
      </template>
    </RecModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Plus, ClipboardList, Star, Layers, Info,
} from 'lucide-vue-next'

import RecKpiRow from '../components/RecKpiRow.vue'
import RecToolbar from '../components/RecToolbar.vue'
import RecTableCard from '../components/RecTableCard.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import RecModal from '../components/RecModal.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'

import { useApplications, useCandidates, usePositions } from '../../../../composables/useRecruitment'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()

const {
  items, total, loading, filters, totalPages, setFilters, setPage,
  fetchList, create, changeStage,
} = useApplications()

const stageList = ['APPLIED','SCREENING','SHORTLISTED','INTERVIEW','SELECTED','OFFER','JOINED','REJECTED','WITHDRAWN']
const stageOptions = stageList.map(s => ({ value: s, label: humanStageLabel(s) }))
function humanStageLabel(s) {
  return ({
    APPLIED: 'Applied', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted',
    INTERVIEW: 'Interview', SELECTED: 'Selected', OFFER: 'Offer',
    JOINED: 'Joined', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
  }[s] || s)
}

const countByStage = (stage) =>
  (items.value || []).reduce((n, it) => n + (it.current_stage === stage ? 1 : 0), 0)

const kpiChips = computed(() => [
  { key: 'all',         label: 'All',         value: total.value || 0,       tone: 'neutral', icon: Layers },
  { key: 'APPLIED',     label: 'Applied',     value: countByStage('APPLIED'),     tone: 'gold' },
  { key: 'SCREENING',   label: 'Screening',   value: countByStage('SCREENING'),   tone: 'gold' },
  { key: 'SHORTLISTED', label: 'Shortlisted', value: countByStage('SHORTLISTED'), tone: 'orange' },
  { key: 'INTERVIEW',   label: 'Interview',   value: countByStage('INTERVIEW'),   tone: 'orange' },
  { key: 'SELECTED',    label: 'Selected',    value: countByStage('SELECTED'),    tone: 'orange' },
  { key: 'OFFER',       label: 'Offer',       value: countByStage('OFFER'),       tone: 'orange' },
  { key: 'JOINED',      label: 'Joined',      value: countByStage('JOINED'),      tone: 'green' },
])

const setStage = async (key) => {
  const v = key === 'all' ? null : key
  setFilters({ stage: v })
  await fetchList()
}

const candidates = useCandidates()
const positions = usePositions()

const candidateOptions = computed(() =>
  (candidates.items.value || []).map(c => ({
    value: c.id, label: `${c.full_name} (${c.candidate_code})`,
  }))
)
const positionOptions = computed(() =>
  (positions.items.value || []).map(p => ({
    value: p.id, label: `${p.job_title} (${p.job_code})`,
  }))
)
const sourceOptions = [
  { value: 'PORTAL', label: 'Portal' }, { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' }, { value: 'NAUKRI', label: 'Naukri' },
  { value: 'DIRECT', label: 'Direct' }, { value: 'AGENCY', label: 'Agency' },
  { value: 'OTHER', label: 'Other' },
]

const toolbarFilters = computed(() => [
  {
    key: 'source',
    label: 'Source',
    value: filters.value.source ?? null,
    options: sourceOptions,
  },
])
const hasFilters = computed(() =>
  !!filters.value.search || !!filters.value.stage || !!filters.value.source
)
const onFilterChange = async (key, value) => {
  if (key === 'source') setFilters({ source: value })
  await fetchList()
}
const onClearFilters = async () => {
  setFilters({ search: '', stage: null, source: null })
  await fetchList()
}
const goPage = async (p) => { setPage(p); await fetchList() }

// ─── Modal ───
const modal = ref({ open: false, candidate_id: null, position_id: null, source: 'PORTAL', submitting: false })
const openCreate = async () => {
  candidates.setFilters({ limit: 100 })
  positions.setFilters({ limit: 100, status: 'OPEN' })
  await Promise.all([candidates.fetchList(), positions.fetchList()])
  modal.value = { open: true, candidate_id: null, position_id: null, source: 'PORTAL', submitting: false }
}
const closeModal = () => {
  modal.value = { open: false, candidate_id: null, position_id: null, source: 'PORTAL', submitting: false }
}

const onCreate = async () => {
  if (!modal.value.candidate_id || !modal.value.position_id) return
  modal.value.submitting = true
  try {
    await create({
      candidate_id: modal.value.candidate_id,
      position_id: modal.value.position_id,
      source: modal.value.source,
    })
    success('Application created')
    closeModal()
    await fetchList(); emit('refresh-counts')
  } catch (e) {
    const detail = e?.response?.data?.detail || ''
    // The backend returns this exact message when the (candidate, position) pair already exists.
    // Make the UX explicit so users know they can re-apply the candidate to a *different* position.
    if (/already applied/i.test(detail)) {
      error('This candidate has already applied to that position. Pick a different position to add another application.')
    } else {
      error(detail || 'Could not create application')
    }
  } finally {
    modal.value.submitting = false
  }
}

const onStageChange = async (a, newStage) => {
  if (!newStage || newStage === a.current_stage) return
  try {
    await changeStage(a.id, newStage)
    success(`Stage moved to ${humanStage(newStage)}`)
    await fetchList(); emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Stage change failed')
  }
}

const humanStage = (s) => ({
  APPLIED: 'Applied', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', SELECTED: 'Selected', OFFER: 'Offer',
  JOINED: 'Joined', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}[s] || s)
const humanSource = (s) => ({
  PORTAL: 'Portal', REFERRAL: 'Referral', LINKEDIN: 'LinkedIn',
  NAUKRI: 'Naukri', INDEED: 'Indeed', AGENCY: 'Agency',
  WALK_IN: 'Walk-in', CAMPUS: 'Campus', DIRECT: 'Direct', OTHER: 'Other',
}[s] || s)
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'

onMounted(fetchList)
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 12px; }

.src-pill {
  padding: 2px 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 999px;
  font-size: 10.5px;
  color: var(--hr-text-secondary);
  letter-spacing: 0.04em;
}

.rating { display: inline-flex; gap: 2px; }
.cell-actions { text-align: right; }

.stage-select-wrap {
  display: inline-block;
  min-width: 150px;
  max-width: 170px;
  text-align: left;
}
.stage-select-wrap :deep(.hr-select-trigger) {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 600;
}

.form-grid { display: grid; gap: 12px; }
.field-block { display: flex; flex-direction: column; }
.form-hint {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px;
  padding: 10px 12px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  font-size: 11.5px;
  color: var(--hr-text-secondary);
}
.form-hint svg { color: var(--hr-accent-gold); flex-shrink: 0; }

.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.grow { flex: 1; }
</style>
