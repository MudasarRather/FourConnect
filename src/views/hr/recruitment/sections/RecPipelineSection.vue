<template>
  <div class="rec-pipe rec-fade-up">
    <!-- KPI row -->
    <RecKpiRow :chips="kpiChips" :readonly="true" />

    <!-- Toolbar -->
    <RecToolbar
      :search="searchInput"
      :search-placeholder="'Search position or candidate…'"
      :filters="toolbarFilters"
      :loading="loading"
      :can-clear="hasFilters"
      @update:search="(v) => (searchInput = v)"
      @search-submit="loadPipeline"
      @filter-change="onFilterChange"
      @refresh="loadPipeline"
      @clear="onClearFilters"
    />

    <!-- Main HBOARD table -->
    <section class="pipe-shell">
      <div class="pipe-shell-card rec-scroll-x">
        <table class="pipe-grid">
          <colgroup>
            <col class="col-pos" />
            <col v-for="s in stages" :key="s.stage" />
          </colgroup>
          <thead>
            <tr>
              <th class="pos-th">Position</th>
              <th v-for="s in stages" :key="s.stage" class="stage-th">
                <span class="stage-h">
                  <span class="stage-dot" :style="{ background: stageColor(s.stage) }" />
                  {{ s.label }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="99">
                <div v-for="i in 5" :key="i" class="rec-skel" style="height:56px;margin:8px 0" />
              </td>
            </tr>
            <tr
              v-for="(row, ri) in rowsFiltered"
              :key="row.positionId"
              class="pipe-row"
              :style="{ '--i': ri }"
            >
              <td class="pos-cell">
                <div class="pos-title">{{ row.title }}</div>
                <div class="pos-sub">{{ row.subtitle }}</div>
                <div class="pos-meta">
                  <Briefcase :size="11" />
                  <span>{{ row._total }} candidates</span>
                </div>
              </td>
              <td v-for="s in stages" :key="s.stage" class="stage-cell">
                <PipelineCell
                  :stage="s.stage"
                  :count="row.counts[s.stage] || 0"
                  :position-id="row.positionId"
                  :active="isActive(row.counts, s.stage)"
                  :draggable="true"
                  @click="openCellDrawer(row, s.stage)"
                  @drop="onCellDrop"
                />
              </td>
            </tr>
            <tr v-if="!loading && !rowsFiltered.length">
              <td colspan="99">
                <RecEmptyState
                  :icon="GitBranch"
                  title="Pipeline is empty"
                  body="Once candidates apply to open positions they'll start flowing through these stages."
                  cta-label="Browse Positions"
                  :cta-icon="Briefcase"
                  @cta="$emit('refresh-counts')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Cell drawer: candidates in this (position, stage) -->
    <ProfileDrawer
      :model-value="drawer.open"
      :aria-label="'Candidates in stage'"
      @update:model-value="(v) => (drawer.open = v)"
    >
      <header class="cell-drawer-head">
        <div>
          <div class="cd-eyebrow">
            <span class="dot" :style="{ background: stageColor(drawer.stage) }" />
            {{ humanStage(drawer.stage) }}
          </div>
          <h3>{{ drawer.title }}</h3>
          <p class="cd-sub">{{ drawer.subtitle }} · {{ drawer.candidates.length }} candidate(s)</p>
        </div>
        <button class="close-btn" @click="drawer.open = false"><X :size="16" /></button>
      </header>
      <div class="cell-drawer-body">
        <div v-if="!drawer.candidates.length" class="empty-mini">
          <UserSearch :size="20" />
          <span>No candidates in this stage yet.</span>
        </div>
        <ul v-else class="cd-list">
          <li
            v-for="c in drawer.candidates"
            :key="c.application_id"
            class="cd-item"
          >
            <div class="cd-avatar" :style="{ background: avatarGradient(c.candidate_name) }">
              {{ c.avatar_initials || initials(c.candidate_name) }}
            </div>
            <div class="cd-body">
              <div class="cd-name">{{ c.candidate_name }}</div>
              <div class="cd-meta">
                <span v-if="c.rating">★ {{ c.rating }}</span>
                <span class="rec-mono">{{ c.position_code }}</span>
                <span>{{ relative(c.applied_date) }}</span>
              </div>
            </div>
            <div class="cd-actions">
              <select
                class="rec-select cd-stage-select"
                :value="c.stage"
                @change="onCardStageChange(c, $event.target.value)"
              >
                <option v-for="st in stages" :key="st.stage" :value="st.stage">{{ st.label }}</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </li>
        </ul>
      </div>
    </ProfileDrawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  GitBranch, Briefcase, UserSearch, Activity, Clock, Award, X,
} from 'lucide-vue-next'

import RecKpiRow from '../components/RecKpiRow.vue'
import RecToolbar from '../components/RecToolbar.vue'
import PipelineCell from '../components/PipelineCell.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import ProfileDrawer from '../../../../components/hr/ProfileDrawer.vue'

import {
  fetchPipeline, useApplications, usePositions,
} from '../../../../composables/useRecruitment'
import { useHrReference } from '../../../../composables/useEmployees'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()
const apps = useApplications()
const positions = usePositions()
const { reference } = useHrReference()

const stages = [
  { stage: 'APPLIED',     label: 'Applying' },
  { stage: 'SCREENING',   label: 'Screening' },
  { stage: 'SHORTLISTED', label: 'Shortlisted' },
  { stage: 'INTERVIEW',   label: 'Interview' },
  { stage: 'SELECTED',    label: 'Selected' },
  { stage: 'OFFER',       label: 'Offer' },
  { stage: 'JOINED',      label: 'Joined' },
]

const rawPipeline = ref([])         // raw stage blocks from API
const loading = ref(false)
const positionFilter = ref(null)
const departmentFilter = ref(null)
const searchInput = ref('')

const loadPipeline = async () => {
  loading.value = true
  try {
    rawPipeline.value = await fetchPipeline(positionFilter.value)
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to load pipeline')
    rawPipeline.value = []
  } finally {
    loading.value = false
  }
}

// Build rows from positions × stages
const rows = computed(() => {
  // Group all cards by position. Keying strategy:
  //   - Always prefer position_id (UUID); it's the only globally unique identifier.
  //   - Build a secondary lookup by position_code so cards lacking position_id can
  //     still merge into the existing row instead of creating a duplicate.
  const byPos = new Map()           // key: position_id
  const codeToId = new Map()        // key: position_code → position_id (for fallback)

  // Seed with all known positions so empty rows still show
  for (const p of (positions.items.value || [])) {
    if (!p.id) continue
    byPos.set(p.id, {
      positionId: p.id,
      title: p.job_title,
      subtitle: p.job_code,
      departmentId: p.department_id,
      departmentName: p.department_name,
      employmentType: p.employment_type,
      workMode: p.work_mode,
      counts: {},
      cardsByStage: {},
      _total: 0,
    })
    if (p.job_code) codeToId.set(p.job_code, p.id)
  }
  for (const block of rawPipeline.value) {
    for (const c of block.cards) {
      // Resolve to a stable position_id whenever possible
      let pid = c.position_id
      if (!pid && c.position_code && codeToId.has(c.position_code)) {
        pid = codeToId.get(c.position_code)
      }
      if (!pid) {
        // Card has neither position_id nor a code we can map — skip rather than
        // create a phantom row that duplicates a real position.
        continue
      }
      if (!byPos.has(pid)) {
        byPos.set(pid, {
          positionId: pid,
          title: c.position_title || '—',
          subtitle: c.position_code || '',
          counts: {},
          cardsByStage: {},
          _total: 0,
        })
        if (c.position_code) codeToId.set(c.position_code, pid)
      }
      const row = byPos.get(pid)
      row.counts[block.stage] = (row.counts[block.stage] || 0) + 1
      if (!row.cardsByStage[block.stage]) row.cardsByStage[block.stage] = []
      row.cardsByStage[block.stage].push({ ...c, stage: block.stage })
      row._total++
    }
  }
  return Array.from(byPos.values())
    .filter(r => r._total > 0 || !positionFilter.value)
    .sort((a, b) => b._total - a._total)
})

const rowsFiltered = computed(() => {
  let out = rows.value
  if (departmentFilter.value) {
    out = out.filter(r => r.departmentId === departmentFilter.value)
  }
  const q = (searchInput.value || '').trim().toLowerCase()
  if (q) {
    out = out.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.subtitle || '').toLowerCase().includes(q)
    )
  }
  return out
})

const totals = computed(() => {
  const out = { TOTAL: 0 }
  for (const st of stages) out[st.stage] = 0
  for (const row of rows.value) {
    for (const st of stages) {
      out[st.stage] += row.counts[st.stage] || 0
    }
    out.TOTAL += row._total
  }
  return out
})

const kpiChips = computed(() => {
  return [
    { key: 'total',  label: 'In flight',       value: totals.value.TOTAL,        tone: 'gold',    icon: Activity },
    { key: 'sel',    label: 'Selected',        value: totals.value.SELECTED || 0,tone: 'orange',  icon: Award },
    { key: 'offer',  label: 'In offer stage',  value: totals.value.OFFER || 0,   tone: 'orange',  icon: Briefcase },
    { key: 'join',   label: 'Joined',          value: totals.value.JOINED || 0,  tone: 'green',   icon: Clock },
  ]
})

const isActive = (counts, stage) => {
  const idx = stages.findIndex(s => s.stage === stage)
  if (idx < 0) return false
  for (let i = idx + 1; i < stages.length; i++) {
    if (counts[stages[i].stage]) return false
  }
  return (counts[stage] || 0) > 0
}

// ─── Toolbar wiring ───
const toolbarFilters = computed(() => [
  {
    key: 'position',
    label: 'Position',
    value: positionFilter.value,
    options: (positions.items.value || []).map(p => ({ value: p.id, label: `${p.job_title} (${p.job_code})` })),
  },
  {
    key: 'department',
    label: 'Department',
    value: departmentFilter.value,
    options: (reference?.departments || []).map(d => ({ value: d.id, label: d.name })),
  },
])

const hasFilters = computed(() =>
  !!positionFilter.value || !!departmentFilter.value || !!(searchInput.value || '').trim()
)

const onFilterChange = async (key, value) => {
  if (key === 'position') {
    positionFilter.value = value
    await loadPipeline()
  } else if (key === 'department') {
    departmentFilter.value = value
  }
}
const onClearFilters = async () => {
  positionFilter.value = null
  departmentFilter.value = null
  searchInput.value = ''
  await loadPipeline()
}

// ─── Cell drawer ───
const drawer = ref({ open: false, stage: '', positionId: '', title: '', subtitle: '', candidates: [] })

const openCellDrawer = (row, stage) => {
  if (!row.counts[stage]) return
  drawer.value = {
    open: true,
    stage,
    positionId: row.positionId,
    title: row.title,
    subtitle: row.subtitle,
    candidates: row.cardsByStage[stage] || [],
  }
}

const onCardStageChange = async (card, newStage) => {
  if (!newStage || newStage === card.stage) return
  try {
    await apps.changeStage(card.application_id, newStage)
    success(`${card.candidate_name} → ${humanStage(newStage)}`)
    await loadPipeline()
    emit('refresh-counts')
    drawer.value.open = false
  } catch (e) {
    error(e?.response?.data?.detail || 'Stage move failed')
  }
}

// ─── Drop handler — move every card in source cell to target stage ───
const onCellDrop = async ({ from, to }) => {
  if (!from?.positionId || from.positionId !== to.positionId) {
    error('Can only move candidates within the same position row.')
    return
  }
  if (from.stage === to.stage) return
  const row = rows.value.find(r => r.positionId === from.positionId)
  if (!row) return
  const cards = row.cardsByStage[from.stage] || []
  if (!cards.length) return

  try {
    await Promise.all(cards.map(c => apps.changeStage(c.application_id, to.stage)))
    success(`${cards.length} candidate(s) moved to ${humanStage(to.stage)}`)
    await loadPipeline()
    emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Bulk move failed')
  }
}

// ─── Helpers ───
const humanStage = (s) =>
  stages.find(x => x.stage === s)?.label
  || ({ REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' }[s] || s)

const stageColor = (s) => ({
  APPLIED: '#fde68a', SCREENING: '#fbbf24', SHORTLISTED: '#f59e0b',
  INTERVIEW: '#fb923c', SELECTED: '#ea580c', OFFER: '#f97316',
  JOINED: '#34d399', REJECTED: '#f87171',
}[s] || '#9ca3af')

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
  ]
  let h = 0
  for (const ch of (name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return palettes[h % palettes.length]
}

const relative = (iso) => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86400000)
  if (d < 1) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

onMounted(async () => {
  positions.setFilters({ limit: 100, status: null })
  await Promise.all([positions.fetchList(), loadPipeline()])
})
</script>

<style scoped>
.rec-pipe { display: flex; flex-direction: column; gap: 14px; }

.pipe-shell-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 14px 18px 18px;
  overflow-x: auto;
}

.pipe-grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
  min-width: 920px;
}
.pipe-grid .col-pos { width: 240px; }

.pipe-grid thead th {
  padding: 6px 10px 14px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--hr-text-muted);
  white-space: nowrap;
  text-align: center;
}
.pipe-grid .pos-th { text-align: left; padding-left: 4px; }
.stage-h { display: inline-flex; align-items: center; gap: 6px; }
.stage-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }

.pipe-row {
  animation: rec-rise 0.42s var(--hr-spring) backwards;
  animation-delay: calc(var(--i, 0) * 50ms);
}
.pipe-row td {
  padding: 10px 8px;
  text-align: center;
  vertical-align: middle;
}
.pipe-row .pos-cell {
  text-align: left;
  padding-left: 4px;
  border-left: 2px solid transparent;
  transition: border-color 220ms var(--hr-spring);
}
.pipe-row:hover .pos-cell { border-left-color: var(--hr-accent-gold); }

.pos-title { font-size: 13px; font-weight: 600; color: var(--hr-text); }
.pos-sub   { font-size: 10.5px; font-family: var(--rec-mono); color: var(--hr-accent-gold); letter-spacing: 0.3px; margin-top: 2px; }
.pos-meta  {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--hr-text-muted);
}

/* ─── Cell drawer ─────────────────────────────────────────────────── */
.cell-drawer-head {
  position: relative;
  padding: 22px 22px 14px;
  border-bottom: 1px solid var(--hr-border);
}
.cell-drawer-head h3 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.015em;
}
.cd-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--hr-accent-gold);
}
.cd-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }
.cd-sub { font-size: 12px; color: var(--hr-text-muted); margin: 4px 0 0; }
.close-btn {
  position: absolute; top: 16px; right: 18px;
  width: 30px; height: 30px;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--hr-border-strong);
  border-radius: 9px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: transform 200ms var(--hr-spring);
}
.close-btn:hover { transform: rotate(90deg); color: var(--hr-text); }

.cell-drawer-body { padding: 18px 22px; overflow-y: auto; flex: 1; }
.cd-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.cd-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
}
.cd-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-weight: 700;
  font-size: 13px;
  color: #1a1a1c;
}
.cd-body { flex: 1; min-width: 0; }
.cd-name { font-size: 13px; font-weight: 600; color: var(--hr-text); }
.cd-meta {
  display: flex; gap: 10px;
  font-size: 11px;
  color: var(--hr-text-muted);
  margin-top: 3px;
}
.cd-meta .rec-mono { color: var(--hr-accent-gold); }
.cd-stage-select { width: 140px; height: 34px; font-size: 12px; }

.empty-mini {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 40px 16px;
  color: var(--hr-text-muted);
  font-size: 12px;
}
</style>
