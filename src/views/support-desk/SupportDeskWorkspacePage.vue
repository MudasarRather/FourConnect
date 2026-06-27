<template>
  <div class="sd-workspace">
    <SdLiquidBasin
      eyebrow="SUPPORT DESK"
      title="Triage Basin"
      :subtitle="heroSubtitle"
      :metrics="heroMetrics"
      :actions="heroActions"
      :priority-counts="priorityCounts"
      :breach="breach"
      :loading="loading"
      @go="selectTab"
      @action="onAction"
    />

    <SdTabBar v-model="activeTab" :tabs="TABS" aria-label="Support Desk sections" />

    <main class="sd-canvas">
      <transition :name="`sd-slide-${slideDir}`" mode="out-in">
        <component
          v-if="builtComp"
          :is="builtComp"
          :key="activeTab"
          :dashboard="dashboard"
          :loading="loading"
          :create-signal="createSignal"
          @go="selectTab"
          @changed="loadDashboard"
        />
        <SdSectionPlaceholder
          v-else
          :key="activeTab"
          :label="activeMeta.label"
          :icon="activeMeta.icon"
          :blurb="activeMeta.blurb"
          :phase="activeMeta.phase"
        />
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, Ticket, Building2, Users, FileSignature, Gauge,
  BookOpen, LayoutGrid, GitPullRequest, Bug, Server, Megaphone,
  BarChart3, Zap, Settings, ScrollText, Plus, AlertTriangle, CheckCircle2, Timer,
} from 'lucide-vue-next'

import '../../styles/support-desk-theme.css'

import SdLiquidBasin from './components/SdLiquidBasin.vue'
import SdTabBar from './components/SdTabBar.vue'
import SdSectionPlaceholder from './sections/SdSectionPlaceholder.vue'
import SdDashboardSection from './sections/SdDashboardSection.vue'
import SdTicketsSection from './sections/SdTicketsSection.vue'
import SdOrganizationsSection from './sections/SdOrganizationsSection.vue'
import SdCustomersSection from './sections/SdCustomersSection.vue'
import SdContractsSection from './sections/SdContractsSection.vue'
import SdCustomerAssetsSection from './sections/SdCustomerAssetsSection.vue'
import SdKnowledgeBaseSection from './sections/SdKnowledgeBaseSection.vue'
import SdServiceCatalogSection from './sections/SdServiceCatalogSection.vue'
import SdSlaSection from './sections/SdSlaSection.vue'
import SdSettingsSection from './sections/SdSettingsSection.vue'
import SdChangeRequestsSection from './sections/SdChangeRequestsSection.vue'
import SdProblemsSection from './sections/SdProblemsSection.vue'
import SdAnnouncementsSection from './sections/SdAnnouncementsSection.vue'
import SdAutomationSection from './sections/SdAutomationSection.vue'
import SdReportsSection from './sections/SdReportsSection.vue'
import SdAuditLogsSection from './sections/SdAuditLogsSection.vue'

import { fetchSupportDashboard } from '@/composables/useSupportDesk'

const route = useRoute()
const router = useRouter()

const TABS = [
  { key: 'dashboard',          label: 'Dashboard',          icon: LayoutDashboard, blurb: 'KPI cards, distributions and recent tickets around the live Triage Basin.', phase: 'PHASE 3 · OVERVIEW' },
  { key: 'tickets',            label: 'Tickets',            icon: Ticket,          blurb: 'The full ticket lifecycle.', phase: 'PHASE 3 · CORE' },
  { key: 'organizations',      label: 'Organizations',      icon: Building2,       blurb: 'Client companies.', phase: 'PHASE 3 · MASTERS' },
  { key: 'customers',          label: 'Customers',          icon: Users,           blurb: 'Contacts within organizations.', phase: 'PHASE 3 · MASTERS' },
  { key: 'contracts',          label: 'Contracts',          icon: FileSignature,   blurb: 'Support contracts — packages, hours, renewals, SLAs.', phase: 'PHASE 3 · MASTERS' },
  { key: 'sla',                label: 'SLA Management',     icon: Gauge,           blurb: 'Priority → response/resolution matrices + escalation ladders.', phase: 'PHASE 3 · MASTERS' },
  { key: 'knowledge-base',     label: 'Knowledge Base',     icon: BookOpen,        blurb: 'Self-service articles by category and visibility.', phase: 'PHASE 3 · ADVANCED' },
  { key: 'service-catalog',    label: 'Service Catalog',    icon: LayoutGrid,      blurb: 'Pre-defined service requests with approval flows.', phase: 'PHASE 3 · ADVANCED' },
  { key: 'change-requests',    label: 'Change Requests',    icon: GitPullRequest,  blurb: 'ITIL change workflow.', phase: 'PHASE 3 · ITIL' },
  { key: 'problem-management', label: 'Problem Management', icon: Bug,             blurb: 'Root-cause management linking tickets, changes, assets.', phase: 'PHASE 3 · ITIL' },
  { key: 'customer-assets',    label: 'Customer Assets',    icon: Server,          blurb: 'Client infrastructure with warranty/AMC tracking.', phase: 'PHASE 3 · ADVANCED' },
  { key: 'announcements',      label: 'Announcements',      icon: Megaphone,       blurb: 'Portal notifications targeted at clients.', phase: 'PHASE 3 · ADVANCED' },
  { key: 'reports',            label: 'Reports',            icon: BarChart3,       blurb: 'Operational, customer and executive reporting.', phase: 'PHASE 3 · OPS' },
  { key: 'automation',         label: 'Automation Rules',   icon: Zap,             blurb: 'Condition → action rule builder.', phase: 'PHASE 3 · OPS' },
  { key: 'settings',           label: 'Settings',           icon: Settings,        blurb: 'Numbering, email, SLA defaults, branding, CSAT.', phase: 'PHASE 3 · OPS' },
  { key: 'audit-logs',         label: 'Audit Logs',         icon: ScrollText,      blurb: 'A hash-sealed record of every action.', phase: 'PHASE 3 · OPS' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

// Tabs with real sections built; others fall back to the cinematic placeholder.
const BUILT = {
  dashboard: SdDashboardSection,
  tickets: SdTicketsSection,
  organizations: SdOrganizationsSection,
  customers: SdCustomersSection,
  contracts: SdContractsSection,
  'customer-assets': SdCustomerAssetsSection,
  'knowledge-base': SdKnowledgeBaseSection,
  'service-catalog': SdServiceCatalogSection,
  sla: SdSlaSection,
  settings: SdSettingsSection,
  'change-requests': SdChangeRequestsSection,
  'problem-management': SdProblemsSection,
  announcements: SdAnnouncementsSection,
  automation: SdAutomationSection,
  reports: SdReportsSection,
  'audit-logs': SdAuditLogsSection,
}
const activeMeta = computed(() => TABS.find(t => t.key === activeTab.value) || TABS[0])
const builtComp = computed(() => BUILT[activeTab.value] || null)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')
const createSignal = ref(0)

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'SupportDeskTab', params: { tab: key } })
}
const onAction = (key) => {
  if (key === 'new-ticket') { selectTab('tickets'); createSignal.value++ }
  else if (key === 'knowledge-base') selectTab('knowledge-base')
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
    router.replace({ name: 'SupportDeskTab', params: { tab: key } })
  }
})

// ── Live dashboard data (drives hero + basin + dashboard section) ──
const dashboard = ref(null)
const loading = ref(true)
const loadDashboard = async () => {
  loading.value = true
  try { dashboard.value = await fetchSupportDashboard() }
  catch { dashboard.value = null }
  finally { loading.value = false }
}
onMounted(loadDashboard)

const priorityCounts = computed(() => dashboard.value?.priority_counts || {})
const breach = computed(() => dashboard.value?.sla_breached || 0)
const heroSubtitle = 'Every ticket, in motion — from intake to resolution.'
const heroActions = [
  { key: 'new-ticket', label: 'New Ticket', icon: Plus },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
]
const heroMetrics = computed(() => {
  const d = dashboard.value || {}
  return [
    { key: 'open',       label: 'Open',          icon: Ticket,        value: d.open_tickets ?? 0,  color: 'var(--sd-st-open)',      go: 'tickets' },
    { key: 'unassigned', label: 'Unassigned',    icon: Users,         value: d.unassigned ?? 0,    color: 'var(--sd-steel)',        go: 'tickets' },
    { key: 'critical',   label: 'Critical',      icon: AlertTriangle, value: d.critical ?? 0,      color: 'var(--sd-pri-critical)', go: 'tickets' },
    { key: 'breached',   label: 'SLA Breached',  icon: Timer,         value: d.sla_breached ?? 0,  color: 'var(--sd-st-breached)',  go: 'sla' },
    { key: 'resolved',   label: 'Resolved (24h)', icon: CheckCircle2, value: d.resolved_today ?? 0, color: 'var(--sd-success)',     go: 'tickets' },
    { key: 'csat',       label: 'CSAT',          icon: Gauge,         value: d.csat != null ? `${d.csat}%` : '—', color: 'var(--sd-amber)', go: 'reports' },
  ]
})
</script>

<style scoped>
@import '../../styles/support-desk-theme.css';

.sd-workspace {
  position: relative; display: flex; flex-direction: column;
  min-height: calc(100vh - 100px); color: var(--sd-text);
}
.sd-canvas { flex: 1; padding: 4px 4px 32px; }

.sd-slide-forward-enter-active, .sd-slide-forward-leave-active,
.sd-slide-back-enter-active, .sd-slide-back-leave-active {
  transition: opacity 0.26s var(--sd-spring), transform 0.26s var(--sd-spring);
}
.sd-slide-forward-enter-from { opacity: 0; transform: translateX(14px); }
.sd-slide-forward-leave-to   { opacity: 0; transform: translateX(-10px); }
.sd-slide-back-enter-from    { opacity: 0; transform: translateX(-14px); }
.sd-slide-back-leave-to      { opacity: 0; transform: translateX(10px); }

@media (prefers-reduced-motion: reduce) {
  .sd-slide-forward-enter-active, .sd-slide-forward-leave-active,
  .sd-slide-back-enter-active, .sd-slide-back-leave-active { transition: opacity 0.2s linear; }
  .sd-slide-forward-enter-from, .sd-slide-back-enter-from { transform: none; }
}
</style>
