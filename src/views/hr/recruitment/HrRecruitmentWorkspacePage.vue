<template>
  <div class="rec-workspace">
    <RecHeroCanvas
      :metrics="heroMetrics"
      :loading="loadingStats"
      @go="selectTab"
    />

    <RecTabBar
      v-model="activeTab"
      :tabs="TABS"
      aria-label="Recruitment sections"
    />

    <main class="rec-canvas">
      <transition :name="`canvas-${slideDir}`" mode="out-in">
        <section :key="activeTab" class="canvas-inner">
          <RecDashboardSection
            v-if="activeTab === 'dashboard'"
            :dashboard="dashboard"
            :loading="loadingStats"
            @refresh="loadDashboard"
            @go="selectTab"
          />
          <RecRequisitionsSection
            v-else-if="activeTab === 'requisitions'"
            @refresh-counts="loadDashboard"
          />
          <RecPositionsSection
            v-else-if="activeTab === 'positions'"
            @refresh-counts="loadDashboard"
          />
          <RecCandidatesSection
            v-else-if="activeTab === 'candidates'"
            @refresh-counts="loadDashboard"
          />
          <RecApplicationsSection
            v-else-if="activeTab === 'applications'"
            @refresh-counts="loadDashboard"
          />
          <RecScreeningSection
            v-else-if="activeTab === 'screening'"
            @refresh-counts="loadDashboard"
          />
          <RecInterviewsSection
            v-else-if="activeTab === 'interviews'"
            @refresh-counts="loadDashboard"
          />
          <RecPanelsSection v-else-if="activeTab === 'panels'" />
          <RecOffersSection
            v-else-if="activeTab === 'offers'"
            @refresh-counts="loadDashboard"
          />
          <RecPipelineSection
            v-else-if="activeTab === 'pipeline'"
            @refresh-counts="loadDashboard"
          />
          <RecAnalyticsSection
            v-else-if="activeTab === 'analytics'"
            :dashboard="dashboard"
            :loading="loadingStats"
          />
        </section>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, FileText, Briefcase, UserSearch, ClipboardList,
  ScanSearch, CalendarClock, UsersRound, Mail, GitBranch, BarChart3,
  UserPlus, CalendarDays, FileBadge,
} from 'lucide-vue-next'

import '../../../styles/recruitment-theme.css'

import RecHeroCanvas from './components/RecHeroCanvas.vue'
import RecTabBar from './components/RecTabBar.vue'

import RecDashboardSection from './sections/RecDashboardSection.vue'
import RecRequisitionsSection from './sections/RecRequisitionsSection.vue'
import RecPositionsSection from './sections/RecPositionsSection.vue'
import RecCandidatesSection from './sections/RecCandidatesSection.vue'
import RecApplicationsSection from './sections/RecApplicationsSection.vue'
import RecScreeningSection from './sections/RecScreeningSection.vue'
import RecInterviewsSection from './sections/RecInterviewsSection.vue'
import RecPanelsSection from './sections/RecPanelsSection.vue'
import RecOffersSection from './sections/RecOffersSection.vue'
import RecPipelineSection from './sections/RecPipelineSection.vue'
import RecAnalyticsSection from './sections/RecAnalyticsSection.vue'

import { fetchRecruitmentDashboard } from '../../../composables/useRecruitment'
import { useHrReference } from '../../../composables/useEmployees'
import { useToast } from '../../../composables/useToast'

const route = useRoute()
const router = useRouter()
const { error } = useToast()
const { loadReferenceData } = useHrReference()

const TABS = [
  { key: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { key: 'requisitions',  label: 'Requisitions',   icon: FileText },
  { key: 'positions',     label: 'Open Positions', icon: Briefcase },
  { key: 'candidates',    label: 'Candidates',     icon: UserSearch },
  { key: 'applications',  label: 'Applications',   icon: ClipboardList },
  { key: 'screening',     label: 'Screening',      icon: ScanSearch },
  { key: 'interviews',    label: 'Interviews',     icon: CalendarClock },
  { key: 'panels',        label: 'Panels',         icon: UsersRound },
  { key: 'offers',        label: 'Offers',         icon: Mail },
  { key: 'pipeline',      label: 'Pipeline',       icon: GitBranch },
  { key: 'analytics',     label: 'Analytics',      icon: BarChart3 },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrRecruitmentTab', params: { tab: key } })
}

watch(() => route.params.tab, (newTab) => {
  if (!newTab || !VALID.has(newTab)) return
  const prevIdx = TAB_KEYS.indexOf(activeTab.value)
  const nextIdx = TAB_KEYS.indexOf(newTab)
  slideDir.value = nextIdx >= prevIdx ? 'forward' : 'back'
  activeTab.value = newTab
})
watch(activeTab, (key) => {
  // Keep URL in sync when activeTab is mutated by RecTabBar v-model
  if (route.params.tab !== key && VALID.has(key)) {
    router.replace({ name: 'HrRecruitmentTab', params: { tab: key } })
  }
})

// Shared dashboard data
const dashboard = ref(null)
const loadingStats = ref(false)
const loadDashboard = async () => {
  loadingStats.value = true
  try { dashboard.value = await fetchRecruitmentDashboard() }
  catch (e) { error(e?.response?.data?.detail || 'Failed to load recruitment dashboard') }
  finally { loadingStats.value = false }
}

const heroMetrics = computed(() => {
  const s = dashboard.value?.stats || {}
  return [
    { key: 'positions',    label: 'Open',         icon: Briefcase,     value: s.open_positions || 0,         color: '#fbbf24', go: 'positions' },
    { key: 'applications', label: 'Applications', icon: ClipboardList, value: s.applications_received || 0,  color: '#f59e0b', go: 'applications' },
    { key: 'pipeline',     label: 'Pipeline',     icon: GitBranch,     value: s.candidates_in_pipeline || 0, color: '#fb923c', go: 'pipeline' },
    { key: 'interviews',   label: 'Interviews',   icon: CalendarDays,  value: s.pending_interviews || 0,     color: '#fb923c', go: 'interviews' },
    { key: 'offers',       label: 'Offers',       icon: FileBadge,     value: s.offers_pending || 0,         color: '#ea580c', go: 'offers' },
    { key: 'hires',        label: 'Hires/mo',     icon: UserPlus,      value: s.hires_this_month || 0,       color: '#34d399', go: 'pipeline' },
  ]
})

onMounted(async () => {
  loadReferenceData()
  await loadDashboard()
})
</script>

<style scoped>
@import '../../../styles/recruitment-theme.css';

.rec-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 100px);
  color: var(--hr-text);
}

.rec-canvas {
  flex: 1;
  padding: 4px 4px 32px;
}
.canvas-inner { min-height: 360px; }

.canvas-forward-enter-active, .canvas-forward-leave-active,
.canvas-back-enter-active, .canvas-back-leave-active {
  transition: opacity 0.26s var(--hr-spring), transform 0.26s var(--hr-spring);
}
.canvas-forward-enter-from { opacity: 0; transform: translateX(14px); }
.canvas-forward-leave-to   { opacity: 0; transform: translateX(-10px); }
.canvas-back-enter-from    { opacity: 0; transform: translateX(-14px); }
.canvas-back-leave-to      { opacity: 0; transform: translateX(10px); }
</style>
