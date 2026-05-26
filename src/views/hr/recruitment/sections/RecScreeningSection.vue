<template>
  <div class="rec-section rec-fade-up">
    <div class="screening-head rec-card hr-spotlight" ref="headRef">
      <div class="header-aurora" aria-hidden="true" />
      <div class="head-info">
        <div class="head-icon"><ScanSearch :size="22" /></div>
        <div>
          <h2><span class="rec-text-gradient">Resume Screening</span></h2>
          <p>Quickly screen applications: skill match, experience, qualification filters.
             Shortlist or reject in one click.</p>
        </div>
      </div>
      <div class="head-actions">
        <button class="rec-btn-ghost" @click="reload">
          <RefreshCw :size="14" /> Refresh
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="screen-filters rec-card">
      <div class="filter-grp">
        <HrFieldLabel label="Position" />
        <HrSelect v-model="positionId" :options="positionOptions" placeholder="All positions"
                  searchable @update:modelValue="reload" />
      </div>
      <div class="filter-grp">
        <HrFieldLabel label="Match Skill" />
        <HrInput v-model="skillFilter" placeholder="e.g. Python" />
      </div>
      <div class="filter-grp">
        <HrFieldLabel label="Min Experience (years)" />
        <HrNumberInput v-model="minExp" :step-by="0.5" :min="0" />
      </div>
      <button class="rec-btn-primary apply-btn" @click="reload">
        <Filter :size="14" /> Apply
      </button>
    </div>

    <div v-if="loading" class="screen-grid">
      <div v-for="i in 4" :key="i" class="rec-skel" style="height: 180px; border-radius: 16px" />
    </div>
    <div v-else-if="!filteredApps.length" class="rec-card rec-empty">
      <div class="rec-empty-icon"><ScanSearch :size="22" /></div>
      <h4>No applications to screen</h4>
      <p>Try widening the filters or wait for new applications.</p>
    </div>
    <div v-else class="screen-grid">
      <article
        v-for="(a, i) in filteredApps"
        :key="a.id"
        v-tilt
        class="screen-card rec-card rec-card-glow"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 260, delay: i * 40 } }"
      >
        <div class="card-head">
          <div class="card-info">
            <div class="rec-mono dim">{{ a.application_code }}</div>
            <h3>{{ a.candidate_name }}</h3>
            <div class="dim">applying for <strong>{{ a.position_title }}</strong></div>
          </div>
          <span :class="['stage-pill', `stage-pill-${a.current_stage.toLowerCase()}`]">
            <span class="dot" /> {{ humanStage(a.current_stage) }}
          </span>
        </div>

        <div class="match-bar">
          <div class="match-label">Skill match</div>
          <div class="match-track">
            <div class="match-fill" :style="{ width: matchPct(a) + '%' }" />
          </div>
          <div class="match-pct rec-mono">{{ matchPct(a) }}%</div>
        </div>

        <div class="card-actions">
          <button class="rec-btn-ghost" @click="shortlist(a)">
            <CheckCircle :size="13" /> Shortlist
          </button>
          <button class="rec-btn-danger" @click="reject(a)">
            <XCircle :size="13" /> Reject
          </button>
          <button class="rec-btn-primary" v-if="a.current_stage === 'APPLIED'" @click="moveToScreening(a)">
            <Activity :size="13" /> Screen
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ScanSearch, RefreshCw, Filter, CheckCircle, XCircle, Activity,
} from 'lucide-vue-next'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrNumberInput from '../../../../components/hr/forms/HrNumberInput.vue'
import { useApplications, usePositions } from '../../../../composables/useRecruitment'
import { useToast } from '../../../../composables/useToast'
import { useSpotlight } from '../../../../composables/useSpotlight'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()

const apps = useApplications()
const positions = usePositions()
const headRef = ref(null)
useSpotlight(headRef)

const positionOptions = computed(() =>
  (positions.items.value || []).map(p => ({ value: p.id, label: `${p.job_title} (${p.job_code})` }))
)

const positionId = ref(null)
const skillFilter = ref('')
const minExp = ref(null)

const loading = computed(() => apps.loading.value)

// Applications past the screening funnel — JOINED, REJECTED, WITHDRAWN —
// have no business showing up in the resume-screening view (you can't
// shortlist someone who already joined, and rejected/withdrawn are out).
const TERMINAL_STAGES = new Set(['JOINED', 'REJECTED', 'WITHDRAWN'])

const filteredApps = computed(() => {
  const skill = (skillFilter.value || '').toLowerCase().trim()
  const min = minExp.value || 0
  return (apps.items.value || []).filter(a => {
    if (TERMINAL_STAGES.has(a.current_stage)) return false
    if (skill) {
      const cands = (a.skills || []).join(',').toLowerCase()
      if (!cands.includes(skill)) return false
    }
    if (min && (a.relevant_experience_years || 0) < min) return false
    return true
  })
})

const matchPct = (a) => {
  let score = 30
  if (a.rating) score += a.rating * 10
  if (a.current_stage === 'SHORTLISTED') score += 20
  if (a.current_stage === 'INTERVIEW') score += 30
  if (a.current_stage === 'SELECTED') score += 40
  return Math.min(100, score)
}

const reload = async () => {
  apps.setFilters({ position_id: positionId.value, limit: 30, stage: null })
  await apps.fetchList()
}

const shortlist = async (a) => {
  try {
    await apps.changeStage(a.id, 'SHORTLISTED')
    success(`${a.candidate_name} shortlisted`)
    await reload(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Action failed') }
}
const reject = async (a) => {
  const reason = prompt('Rejection reason (optional):') || null
  try {
    await apps.changeStage(a.id, 'REJECTED', null, reason)
    success(`${a.candidate_name} rejected`)
    await reload(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Action failed') }
}
const moveToScreening = async (a) => {
  try {
    await apps.changeStage(a.id, 'SCREENING')
    success(`${a.candidate_name} moved to Screening`)
    await reload()
  } catch (e) { error(e?.response?.data?.detail || 'Action failed') }
}

const humanStage = (s) => ({
  APPLIED: 'Applied', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', SELECTED: 'Selected', OFFER: 'Offer',
  JOINED: 'Joined', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}[s] || s)

onMounted(async () => {
  positions.setFilters({ limit: 100, status: null })
  await Promise.all([positions.fetchList(), reload()])
})
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 14px; }

.screening-head {
  position: relative;
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px;
  gap: 16px;
  overflow: hidden;
}
.header-aurora {
  position: absolute; inset: 0;
  background:
    radial-gradient(60% 80% at 20% 0%, rgba(251, 191, 36, 0.16), transparent 60%),
    radial-gradient(50% 70% at 80% 100%, rgba(251, 146, 60, 0.14), transparent 60%);
  pointer-events: none;
  z-index: 0;
}
.head-info, .head-actions { position: relative; z-index: 1; }
.head-info { display: flex; align-items: center; gap: 16px; }
.head-icon {
  width: 48px; height: 48px;
  display: grid; place-items: center;
  border-radius: 14px;
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  border: 1px solid var(--hr-accent-gold-border);
}
.screening-head h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.screening-head p { margin: 4px 0 0; font-size: 12.5px; color: var(--hr-text-muted); max-width: 540px; }

.screen-filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 12px;
  padding: 14px;
  align-items: end;
}
.filter-grp { display: flex; flex-direction: column; gap: 4px; }
.apply-btn { height: 40px; }

.screen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}
.screen-card {
  padding: 18px;
  display: flex; flex-direction: column; gap: 12px;
  transition: transform 220ms var(--hr-spring);
}
.screen-card:hover { transform: translateY(-3px); }

.card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
}
.card-info h3 { margin: 4px 0 2px; font-size: 16px; font-weight: 700; color: var(--hr-text); }
.dim { color: var(--hr-text-muted); font-size: 11px; }

.stage-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  border: 1px solid currentColor;
}
.stage-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }
.stage-pill-applied     { color: #fde68a; }
.stage-pill-screening   { color: #fbbf24; }
.stage-pill-shortlisted { color: #f59e0b; }
.stage-pill-interview   { color: #fb923c; }
.stage-pill-selected    { color: #ea580c; }
.stage-pill-offer       { color: #f97316; }
.stage-pill-joined      { color: #34d399; }
.stage-pill-rejected    { color: #f87171; }

.match-bar {
  display: grid;
  grid-template-columns: 90px 1fr 48px;
  align-items: center;
  gap: 10px;
}
.match-label { font-size: 11px; color: var(--hr-text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.match-track { height: 6px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; }
.match-fill {
  height: 100%;
  background: var(--hr-gradient-hero);
  border-radius: 4px;
  transition: width 600ms var(--hr-spring);
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.4);
}
.match-pct { font-size: 12px; font-weight: 700; color: var(--hr-text); text-align: right; }

.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.card-actions button { font-size: 12px; padding: 6px 12px; }

@media (max-width: 720px) {
  .screen-filters { grid-template-columns: 1fr; }
}

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .header-aurora {
  background:
    radial-gradient(60% 80% at 20% 0%, rgba(251, 191, 36, 0.30), transparent 60%),
    radial-gradient(50% 70% at 80% 100%, rgba(251, 146, 60, 0.26), transparent 60%);
}
[data-theme="light"] .head-icon {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.42);
  color: #b45309;
}
[data-theme="light"] .screening-head h2 { color: #1a1410; }
[data-theme="light"] .screening-head p { color: #6b5840; }
[data-theme="light"] .card-info h3 { color: #1a1410; }
[data-theme="light"] .dim { color: #6b5840; }
[data-theme="light"] .stage-pill-applied     { color: #b45309; }
[data-theme="light"] .stage-pill-screening   { color: #b45309; }
[data-theme="light"] .stage-pill-shortlisted { color: #b45309; }
[data-theme="light"] .stage-pill-interview   { color: #c2410c; }
[data-theme="light"] .stage-pill-selected    { color: #c2410c; }
[data-theme="light"] .stage-pill-offer       { color: #c2410c; }
[data-theme="light"] .stage-pill-joined      {
  color: #065f46;
  background: rgba(16, 185, 129, 0.24);
}
[data-theme="light"] .stage-pill-rejected    { color: #b91c1c; }
[data-theme="light"] .match-label { color: #92400e; }
[data-theme="light"] .match-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .match-pct { color: #1a1410; }
</style>
