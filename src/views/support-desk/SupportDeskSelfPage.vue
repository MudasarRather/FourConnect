<template>
  <div class="sd-workspace">
    <SdLiquidBasin
      eyebrow="HELP & SUPPORT"
      title="My Support"
      subtitle="Raise a request, track its progress, and find answers — all in one place."
      variant="user"
      :metrics="heroMetrics"
      :actions="heroActions"
      :priority-counts="priorityCounts"
      :loading="loading"
      @go="onGo"
      @action="onAction"
    />

    <main class="sd-canvas">
      <transition :name="`sd-slide-${slideDir}`" mode="out-in">
        <component
          v-if="builtComp"
          :is="builtComp"
          :key="renderKey"
          :dashboard="dashboard"
          :loading="loading"
          @go="onGo"
          @changed="loadDashboard"
        />
        <SdSectionPlaceholder
          v-else :key="activeTab"
          :label="activeMeta.label" :icon="activeMeta.icon" :blurb="activeMeta.blurb" :phase="activeMeta.phase"
        />
      </transition>
    </main>

    <!-- Raise a ticket — self-service action (modal), like HR's Apply-modal pattern. -->
    <SdModalShell :open="createOpen" eyebrow="HELP & SUPPORT" title="Raise a ticket" width="600px" @close="createOpen = false">
      <SdNewTicketSection embedded @changed="onTicketCreated" @go="onCreateGo" />
    </SdModalShell>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Ticket, Plus, BookOpen, Megaphone, CheckCircle2, Clock } from 'lucide-vue-next'

import '../../styles/support-desk-theme.css'

import SdLiquidBasin from './components/SdLiquidBasin.vue'
import SdSectionPlaceholder from './sections/SdSectionPlaceholder.vue'
import SdModalShell from './components/SdModalShell.vue'
import SdMyTicketsSection from './sections/SdMyTicketsSection.vue'
import SdNewTicketSection from './sections/SdNewTicketSection.vue'
import SdMyKnowledgeBaseSection from './sections/SdMyKnowledgeBaseSection.vue'
import SdMyAnnouncementsSection from './sections/SdMyAnnouncementsSection.vue'

import { fetchSelfDashboard } from '@/composables/useSupportDesk'

const route = useRoute()
const router = useRouter()

// Self-service surfaces — navigated via the TopNav "Support" menu (no in-page
// tab bar). "New" is an action (Raise-a-ticket modal), not a surface.
const TABS = [
  { key: 'tickets',        label: 'My Support',     icon: Ticket,    blurb: 'Your requests with live status, conversation and resolution.', phase: 'SELF-SERVICE' },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen,  blurb: 'Searchable guides and answers.', phase: 'SELF-SERVICE' },
  { key: 'announcements',  label: 'Announcements',  icon: Megaphone, blurb: 'Service notices and updates.', phase: 'SELF-SERVICE' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)
const BUILT = {
  tickets: SdMyTicketsSection,
  'knowledge-base': SdMyKnowledgeBaseSection,
  announcements: SdMyAnnouncementsSection,
}

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'tickets')
const slideDir = ref('forward')
const activeMeta = computed(() => TABS.find(t => t.key === activeTab.value) || TABS[0])
const builtComp = computed(() => BUILT[activeTab.value] || null)

// Re-key the My Support surface after a ticket is raised so its list refetches.
const listRefreshKey = ref(0)
const renderKey = computed(() => activeTab.value === 'tickets' ? `tickets-${listRefreshKey.value}` : activeTab.value)

// Raise-a-ticket modal
const createOpen = ref(false)
const onTicketCreated = () => { loadDashboard(); listRefreshKey.value++ }
const onCreateGo = (key) => { createOpen.value = false; if (key === 'tickets') selectTab('tickets') }

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'SupportSelfTab', params: { tab: key } })
}
// `new` is intercepted into the modal; everything else is a surface switch.
const onGo = (key) => {
  if (key === 'new' || key === 'new-ticket') { createOpen.value = true; return }
  selectTab(key)
}
const onAction = (key) => {
  if (key === 'new-ticket') createOpen.value = true
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
  if (route.params.tab !== key && VALID.has(key)) router.replace({ name: 'SupportSelfTab', params: { tab: key } })
})

// Live self dashboard (drives hero + basin)
const dashboard = ref(null)
const loading = ref(true)
const loadDashboard = async () => {
  loading.value = true
  try { dashboard.value = await fetchSelfDashboard() }
  catch { dashboard.value = null }
  finally { loading.value = false }
}
onMounted(loadDashboard)

const priorityCounts = computed(() => dashboard.value?.priority_counts || {})
const heroActions = [
  { key: 'new-ticket', label: 'Raise a Ticket', icon: Plus },
  { key: 'knowledge-base', label: 'Browse Knowledge Base', icon: BookOpen },
]
const heroMetrics = computed(() => {
  const d = dashboard.value || {}
  return [
    { key: 'open',     label: 'Open',        icon: Ticket,       value: d.open ?? 0,        color: 'var(--sd-st-open)',     go: 'tickets' },
    { key: 'progress', label: 'In Progress', icon: Clock,        value: d.in_progress ?? 0, color: 'var(--sd-st-progress)', go: 'tickets' },
    { key: 'resolved', label: 'Resolved',    icon: CheckCircle2, value: d.resolved ?? 0,    color: 'var(--sd-success)',     go: 'tickets' },
  ]
})
</script>

<style scoped>
@import '../../styles/support-desk-theme.css';

.sd-workspace { position: relative; display: flex; flex-direction: column; min-height: calc(100vh - 100px); color: var(--sd-text); }
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
