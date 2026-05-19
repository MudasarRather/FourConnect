<template>
  <div class="rec-section rec-fade-up">
    <!-- KPI status filter -->
    <RecKpiRow
      :chips="kpiChips"
      :active="filters.status || 'all'"
      @select="setStatus"
    />

    <!-- Toolbar -->
    <RecToolbar
      :search="filters.search"
      :search-placeholder="'Search title or REQ-code…'"
      :primary="{ label: 'New Requisition', icon: Plus }"
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

    <!-- Table-card -->
    <RecTableCard
      :loading="loading"
      :rows="items"
      :total="total"
      :page="filters.page"
      :total-pages="totalPages"
      :page-size="filters.limit"
      grid-css="130px 1fr 170px 130px 110px 110px 140px 130px 130px"
      @page="goPage"
    >
      <template #header>
        <th>Requisition</th>
        <th>Title</th>
        <th>Department</th>
        <th>Hiring</th>
        <th>Openings</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Created</th>
        <th></th>
      </template>
      <template #row="{ item, idx }">
        <tr class="rec-row" :style="{ '--i': idx }" @click="openEdit(item)">
          <td class="cell-code">{{ item.requisition_number }}</td>
          <td class="cell-title">{{ item.job_title }}</td>
          <td>{{ item.department_name || '—' }}</td>
          <td>{{ humanHiring(item.hiring_type) }}</td>
          <td class="rec-mono">{{ item.number_of_openings }}</td>
          <td>
            <span :class="['prio', `prio-${item.priority.toLowerCase()}`]">{{ item.priority }}</span>
          </td>
          <td>
            <span :class="['status', `status-${item.status.toLowerCase()}`]">
              <span class="dot" /> {{ humanStatus(item.status) }}
            </span>
          </td>
          <td class="cell-dim">{{ formatDate(item.created_at) }}</td>
          <td class="cell-actions" @click.stop>
            <button v-if="item.status === 'DRAFT'" class="row-act submit"
                    @click="submitOne(item)" title="Submit for approval">
              <Send :size="14" />
            </button>
            <button v-if="item.status === 'PENDING_APPROVAL'" class="row-act approve"
                    @click="decideOne(item, true)" title="Approve">
              <Check :size="14" />
            </button>
            <button v-if="item.status === 'PENDING_APPROVAL'" class="row-act reject"
                    @click="onReject(item)" title="Reject">
              <X :size="14" />
            </button>
            <button v-if="item.status === 'APPROVED'" class="row-act convert"
                    @click="convertOne(item)" title="Convert to Open Position">
              <ArrowRightCircle :size="14" />
            </button>
            <button class="row-act" @click="openEdit(item)" title="Edit">
              <Pencil :size="14" />
            </button>
          </td>
        </tr>
      </template>
      <template #empty>
        <RecEmptyState
          :icon="FileText"
          title="No requisitions yet"
          body="Create your first hiring requisition to start the approval workflow."
          cta-label="Create Requisition"
          :cta-icon="Plus"
          @cta="openCreate"
        />
      </template>
    </RecTableCard>

    <RequisitionDrawer
      :open="drawer.open"
      :reference="reference"
      :initial="drawer.data"
      @close="drawer.open = false"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Plus, FileText, Send, Check, X, ArrowRightCircle, Pencil,
  Layers, Hourglass, CheckCircle, XCircle,
} from 'lucide-vue-next'

import RecKpiRow from '../components/RecKpiRow.vue'
import RecToolbar from '../components/RecToolbar.vue'
import RecTableCard from '../components/RecTableCard.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import RequisitionDrawer from '../drawers/RequisitionDrawer.vue'

import { useRequisitions } from '../../../../composables/useRecruitment'
import { useHrReference } from '../../../../composables/useEmployees'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()
const { reference } = useHrReference()

const {
  items, total, loading, filters, totalPages, setFilters, setPage,
  fetchList, create, update, submit, decide, convert,
} = useRequisitions()

const kpiChips = computed(() => [
  { key: 'all',              label: 'All',       value: total.value || 0, tone: 'neutral', icon: Layers },
  { key: 'DRAFT',            label: 'Draft',     value: null, tone: 'gold',    icon: FileText },
  { key: 'PENDING_APPROVAL', label: 'Pending',   value: null, tone: 'orange',  icon: Hourglass },
  { key: 'APPROVED',         label: 'Approved',  value: null, tone: 'green',   icon: CheckCircle },
  { key: 'REJECTED',         label: 'Rejected',  value: null, tone: 'red',     icon: XCircle },
])

const setStatus = async (key) => {
  const v = key === 'all' ? null : key
  setFilters({ status: v })
  await fetchList()
}

const toolbarFilters = computed(() => [
  {
    key: 'department',
    label: 'Department',
    value: filters.value.department_id ?? null,
    options: (reference?.departments || []).map(d => ({ value: d.id, label: d.name })),
  },
  {
    key: 'priority',
    label: 'Priority',
    value: filters.value.priority ?? null,
    options: [
      { value: 'LOW',    label: 'Low' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'HIGH',   label: 'High' },
      { value: 'URGENT', label: 'Urgent' },
    ],
  },
])

const hasFilters = computed(() =>
  !!filters.value.search || !!filters.value.status ||
  !!filters.value.department_id || !!filters.value.priority
)

const onFilterChange = async (key, value) => {
  if (key === 'department') setFilters({ department_id: value })
  else if (key === 'priority') setFilters({ priority: value })
  await fetchList()
}
const onClearFilters = async () => {
  setFilters({ search: '', status: null, department_id: null, priority: null })
  await fetchList()
}
const goPage = async (p) => { setPage(p); await fetchList() }

// ─── Drawer ───
const drawer = ref({ open: false, id: null, data: null })
const openCreate = () => { drawer.value = { open: true, id: null, data: null } }
const openEdit = (r) => { drawer.value = { open: true, id: r.id, data: { ...r } } }

const onSubmit = async (payload) => {
  try {
    if (drawer.value.id) {
      await update(drawer.value.id, payload)
      success('Requisition updated')
    } else {
      await create(payload)
      success('Requisition created as DRAFT')
    }
    drawer.value.open = false
    await fetchList()
    emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to save requisition')
  }
}

const submitOne = async (r) => {
  try {
    await submit(r.id)
    success(`${r.requisition_number} submitted for approval`)
    await fetchList(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Submit failed') }
}
const decideOne = async (r, approve) => {
  try {
    await decide(r.id, approve, approve ? null : 'No reason provided')
    success(approve ? `${r.requisition_number} approved` : `${r.requisition_number} rejected`)
    await fetchList(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Action failed') }
}
const onReject = async (r) => {
  const reason = prompt('Rejection reason (optional):') || null
  try {
    await decide(r.id, false, reason)
    success(`${r.requisition_number} rejected`)
    await fetchList(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Action failed') }
}
const convertOne = async (r) => {
  try {
    await convert(r.id)
    success(`${r.requisition_number} converted to an Open Position`)
    await fetchList(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Convert failed') }
}

const humanHiring = (h) => ({ NEW: 'New role', REPLACEMENT: 'Replacement', BACKFILL: 'Backfill' }[h] || h)
const humanStatus = (s) => ({
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending', APPROVED: 'Approved',
  REJECTED: 'Rejected', CONVERTED: 'Converted', ARCHIVED: 'Archived',
}[s] || s)
const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(fetchList)
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 12px; }

/* Status pill */
.status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid currentColor;
  white-space: nowrap;
}
.status .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.status-draft             { color: #9ca3af; }
.status-pending_approval  { color: var(--hr-accent-gold); }
.status-approved          { color: #34d399; }
.status-rejected          { color: #f87171; }
.status-converted         { color: var(--hr-orange); }
.status-archived          { color: #6b7280; }

.prio {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.prio-low      { background: rgba(253,230,138,0.10); color: var(--rec-stage-applied); }
.prio-medium   { background: rgba(251,191,36,0.12);  color: var(--hr-accent-gold); }
.prio-high     { background: rgba(251,146,60,0.14);  color: var(--hr-orange); }
.prio-urgent   { background: rgba(248,113,113,0.14); color: #f87171; }

/* Row actions */
.cell-actions { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.row-act {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--hr-text-muted);
  cursor: pointer;
  transition: background 180ms var(--hr-spring), color 180ms var(--hr-spring);
}
.row-act:hover { background: rgba(255,255,255,0.06); color: var(--hr-text); }
.row-act.submit:hover  { background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); }
.row-act.approve:hover { background: rgba(52,211,153,0.12);  color: #34d399; }
.row-act.reject:hover  { background: rgba(248,113,113,0.12); color: #f87171; }
.row-act.convert:hover { background: rgba(251,146,60,0.12);  color: var(--hr-orange); }
</style>
