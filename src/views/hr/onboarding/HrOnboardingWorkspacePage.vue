<template>
  <div class="onb-workspace">
    <OnbHeroCanvas
      :metrics="heroMetrics"
      :rings="heroRings"
      @go="selectTab"
    />

    <OnbTabBar
      v-model="activeTab"
      :tabs="TABS"
      aria-label="Onboarding sections"
    />

    <main class="onb-canvas">
      <transition :name="`canvas-${slideDir}`" mode="out-in">
        <section :key="activeTab" class="canvas-inner">
          <OnbDashboardSection
            v-if="activeTab === 'dashboard'"
            :stats="dashboard?.stats"
            :hot-tasks="dashboard?.hotTasks || []"
            :journey="dashboard?.journey"
            :loading="loadingStats"
            @refresh="loadDashboard"
            @go="selectTab"
          />
          <OnbPendingJoiningSection
            v-else-if="activeTab === 'pending-joining'"
            @refresh-stats="loadDashboard"
          />
          <OnbChecklistSection
            v-else-if="activeTab === 'checklist'"
            @refresh-stats="loadDashboard"
          />
          <OnbApprovalsSection
            v-else-if="activeTab === 'approvals'"
            @refresh-stats="loadDashboard"
          />
          <OnbDocumentsSection
            v-else-if="activeTab === 'documents'"
            @refresh-stats="loadDashboard"
          />
          <OnbIdentitySection
            v-else-if="activeTab === 'identity'"
            @refresh-stats="loadDashboard"
          />
          <OnbAssetSection
            v-else-if="activeTab === 'assets'"
            @refresh-stats="loadDashboard"
          />
          <OnbAccountSection
            v-else-if="activeTab === 'account-provisioning'"
            @refresh-stats="loadDashboard"
          />
          <OnbWelcomeKitSection
            v-else-if="activeTab === 'welcome-kit'"
            @refresh-stats="loadDashboard"
          />
          <OnbTrainingSection
            v-else-if="activeTab === 'training'"
            @refresh-stats="loadDashboard"
          />
          <OnbInductionSection
            v-else-if="activeTab === 'induction'"
            @refresh-stats="loadDashboard"
          />
          <OnbProbationSection
            v-else-if="activeTab === 'probation'"
            @refresh-stats="loadDashboard"
          />
          <OnbTasksSection
            v-else-if="activeTab === 'tasks'"
            @refresh-stats="loadDashboard"
          />
          <OnbReportsSection
            v-else-if="activeTab === 'reports'"
          />
        </section>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, Hourglass, ListChecks, Stamp, FileCheck2, IdCard,
  Laptop, KeyRound, Gift, GraduationCap, Users, Gauge, ClipboardList, BarChart3,
  Briefcase, FileText, Package, ShieldCheck,
} from 'lucide-vue-next'

import '../../../styles/onboarding-theme.css'

import OnbHeroCanvas from './components/OnbHeroCanvas.vue'
import OnbTabBar from './components/OnbTabBar.vue'

import OnbDashboardSection from './sections/OnbDashboardSection.vue'
import OnbPendingJoiningSection from './sections/OnbPendingJoiningSection.vue'
import OnbChecklistSection from './sections/OnbChecklistSection.vue'
import OnbApprovalsSection from './sections/OnbApprovalsSection.vue'
import OnbDocumentsSection from './sections/OnbDocumentsSection.vue'
import OnbIdentitySection from './sections/OnbIdentitySection.vue'
import OnbAssetSection from './sections/OnbAssetSection.vue'
import OnbAccountSection from './sections/OnbAccountSection.vue'
import OnbWelcomeKitSection from './sections/OnbWelcomeKitSection.vue'
import OnbTrainingSection from './sections/OnbTrainingSection.vue'
import OnbInductionSection from './sections/OnbInductionSection.vue'
import OnbProbationSection from './sections/OnbProbationSection.vue'
import OnbTasksSection from './sections/OnbTasksSection.vue'
import OnbReportsSection from './sections/OnbReportsSection.vue'

import { fetchDashboardStats, fetchHotTasks, fetchJourneyState } from './composables/useOnboarding'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = [
  { key: 'dashboard',            label: 'Dashboard',         icon: LayoutDashboard },
  { key: 'pending-joining',      label: 'Pending Joining',   icon: Hourglass },
  { key: 'checklist',            label: 'Joining Checklist', icon: ListChecks },
  { key: 'approvals',            label: 'Approvals',         icon: ShieldCheck },
  { key: 'documents',            label: 'Documents',         icon: FileCheck2 },
  { key: 'identity',             label: 'Identity',          icon: IdCard },
  { key: 'assets',               label: 'Assets',            icon: Laptop },
  { key: 'account-provisioning', label: 'Accounts',          icon: KeyRound },
  { key: 'welcome-kit',          label: 'Welcome Kit',       icon: Gift },
  { key: 'training',             label: 'Training',          icon: GraduationCap },
  { key: 'induction',            label: 'Induction',         icon: Users },
  { key: 'probation',            label: 'Probation',         icon: Gauge },
  { key: 'tasks',                label: 'Tasks',             icon: ClipboardList },
  { key: 'reports',              label: 'Reports',           icon: BarChart3 },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrOnboardingTab', params: { tab: key } })
}

const STAGE_TO_TAB = {
  PRE_JOIN: 'pending-joining',
  APPROVAL: 'approvals',
  DOCS: 'documents',
  IDENTITY: 'identity',
  ASSETS: 'assets',
  TRAINING: 'training',
  ACTIVE: 'dashboard',
}
const onWaypoint = (key) => {
  const tab = STAGE_TO_TAB[key]
  if (tab) selectTab(tab)
}

watch(() => route.params.tab, (newTab) => {
  if (!newTab || !VALID.has(newTab)) return
  const prevIdx = TAB_KEYS.indexOf(activeTab.value)
  const nextIdx = TAB_KEYS.indexOf(newTab)
  slideDir.value = nextIdx >= prevIdx ? 'forward' : 'back'
  activeTab.value = newTab
})
watch(activeTab, (key) => {
  if (route.params.tab !== key && VALID.has(key)) {
    router.replace({ name: 'HrOnboardingTab', params: { tab: key } })
  }
})

const dashboard = reactive({ stats: null, hotTasks: [], journey: null })
const loadingStats = ref(false)

const loadDashboard = async () => {
  loadingStats.value = true
  try {
    const [s, h, j] = await Promise.all([
      fetchDashboardStats(),
      fetchHotTasks(15),
      fetchJourneyState(),
    ])
    dashboard.stats = s
    dashboard.hotTasks = h
    dashboard.journey = j
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load onboarding dashboard')
  } finally {
    loadingStats.value = false
  }
}

const heroMetrics = computed(() => {
  const s = dashboard.stats || {}
  return [
    { key: 'pending',  label: 'Pending Joinings', sub: 'accepted offers',      icon: Hourglass,     value: s.pending_joinings || 0,         color: '#fde68a', go: 'pending-joining' },
    { key: 'today',    label: 'Today Joining',    sub: 'reporting today',      icon: Briefcase,     value: s.today_joining || 0,            color: '#fbbf24', go: 'pending-joining' },
    { key: 'docs',     label: 'Docs Pending',     sub: 'awaiting verification',icon: FileText,      value: s.pending_documents || 0,        color: '#f59e0b', go: 'documents' },
    { key: 'assets',   label: 'Assets Pending',   sub: 'unallocated joiners',  icon: Package,       value: s.pending_asset_allocation || 0, color: '#fb923c', go: 'assets' },
    { key: 'training', label: 'Training Pending', sub: 'incomplete sessions',  icon: GraduationCap, value: s.training_pending || 0,         color: '#f97316', go: 'training' },
    { key: 'inprog',   label: 'In Progress',      sub: 'open processes',       icon: Gauge,         value: s.incomplete_onboarding || 0,    color: '#ea580c', go: 'dashboard' },
  ]
})

const journeyStages = computed(() => {
  if (dashboard.journey?.stages?.length) return dashboard.journey.stages
  return [
    { key: 'PRE_JOIN', label: 'Pre-Join',  count: 0, percent: 0, is_active: true,  is_complete: false },
    { key: 'APPROVAL', label: 'Approval',  count: 0, percent: 0, is_active: false, is_complete: false },
    { key: 'DOCS',     label: 'Documents', count: 0, percent: 0, is_active: false, is_complete: false },
    { key: 'IDENTITY', label: 'Identity',  count: 0, percent: 0, is_active: false, is_complete: false },
    { key: 'ASSETS',   label: 'Assets',    count: 0, percent: 0, is_active: false, is_complete: false },
    { key: 'TRAINING', label: 'Training',  count: 0, percent: 0, is_active: false, is_complete: false },
    { key: 'ACTIVE',   label: 'Active',    count: 0, percent: 0, is_active: false, is_complete: false },
  ]
})

const heroRings = computed(() => {
  const s = dashboard.stats || {}
  const total = (s.incomplete_onboarding || 0) + (s.pending_joinings || 0) + 1
  const docsPct = Math.max(0, Math.min(100, 100 - Math.round(((s.pending_documents || 0) / total) * 100)))
  const assetsPct = Math.max(0, Math.min(100, 100 - Math.round(((s.pending_asset_allocation || 0) / total) * 100)))
  const trainPct = Math.max(0, Math.min(100, 100 - Math.round(((s.training_pending || 0) / total) * 100)))
  return [
    { key: 'docs',     label: 'Docs',     sub: 'verified', value: docsPct,   color: '#fbbf24' },
    { key: 'assets',   label: 'Assets',   sub: 'issued',   value: assetsPct, color: '#fb923c' },
    { key: 'training', label: 'Training', sub: 'complete', value: trainPct,  color: '#34d399' },
  ]
})

onMounted(loadDashboard)
</script>

<style scoped>
@import '../../../styles/onboarding-theme.css';

.onb-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 100px);
  color: var(--hr-text);
}
.onb-canvas {
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
