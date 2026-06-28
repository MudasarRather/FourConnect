<template>
  <div class="sd-tw">
    <div class="ws-body">
      <SdTicketRail
        :model-value="activeTab"
        :groups="railGroups"
        :counts="railCounts"
        :collapsed="collapsed"
        @update:model-value="selectTab"
        @toggle-collapsed="toggleRail"
        @new="openCreate"
      />

      <main class="ws-canvas">
        <transition :name="`tw-slide-${slideDir}`" mode="out-in">
          <!-- Real section where one exists; cinematic placeholder otherwise. -->
          <component
            v-if="activeComp"
            :is="activeComp"
            :key="activeTab"
            v-bind="tabProps"
            @go="goModule"
            @changed="onChanged"
            @open="openDrawer"
          />
          <SdTicketComingSoon v-else :key="activeTab" :tab="activeMeta" />
        </transition>
      </main>
    </div>

    <!-- Rail "New Ticket" + ?new= deep-link; ?ticket= drawer for feed-opened tickets. -->
    <SdTicketCreateModal :open="createOpen" @close="createOpen = false" @created="onCreated" />
    <SdTicketDrawer :ticket-id="drawerId" @close="drawerId = null" @changed="onChanged" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/styles/support-desk-theme.css'
import SdTicketRail from '../components/SdTicketRail.vue'
import SdTicketComingSoon from './SdTicketComingSoon.vue'
import SdTicketCreateModal from '../modals/SdTicketCreateModal.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdDashboardSection from '../sections/SdDashboardSection.vue'
import SdTicketsSection from '../sections/SdTicketsSection.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdReportsSection from '../sections/SdReportsSection.vue'
import SdAuditLogsSection from '../sections/SdAuditLogsSection.vue'
import { TICKET_TAB_KEYS, ticketRailGroups, getTicketTab } from './ticketsMenu.js'
import { fetchSupportDashboard, listTickets } from '@/composables/useSupportDesk'

const route = useRoute()
const router = useRouter()

const VALID = new Set(TICKET_TAB_KEYS)
const railGroups = ticketRailGroups()

const panel = computed(() => (route.path.startsWith('/user') ? 'employee' : 'admin'))
const base = computed(() => (panel.value === 'employee' ? '/user/support' : '/admin/support-desk'))

const activeTab = computed(() => (VALID.has(route.params.tab) ? route.params.tab : 'dashboard'))
const activeMeta = computed(() => getTicketTab(activeTab.value))

/* ── slug → how to render. Tabs not listed fall back to the cinematic placeholder. ── */
const RENDER = {
  dashboard: { kind: 'dashboard', comp: SdDashboardSection },
  all: { kind: 'tickets', scope: 'all' },
  my: { kind: 'tickets', scope: 'my' },
  unassigned: { kind: 'tickets', scope: 'unassigned' },
  critical: { kind: 'tickets', scope: 'critical' },
  escalated: { kind: 'tickets', scope: 'escalated' },
  'sla-breached': { kind: 'tickets', scope: 'sla_breached' },
  'pending-customer': { kind: 'tickets', scope: 'pending_customer' },
  'pending-vendor': { kind: 'tickets', scope: 'pending_vendor' },
  resolved: { kind: 'tickets', scope: 'resolved' },
  closed: { kind: 'tickets', scope: 'closed' },
  kanban: { kind: 'tickets', scope: 'all', view: 'board' },
  workload: { kind: 'feed', comp: SdWorkloadMonitor },
  'sla-monitor': { kind: 'feed', comp: SdSlaPulse },
  reports: { kind: 'self', comp: SdReportsSection },
  'audit-logs': { kind: 'self', comp: SdAuditLogsSection },
}
const descriptor = computed(() => RENDER[activeTab.value] || null)
const activeComp = computed(() => {
  const d = descriptor.value
  if (!d) return null
  return d.kind === 'tickets' ? SdTicketsSection : d.comp
})
const tabProps = computed(() => {
  const d = descriptor.value
  if (!d) return {}
  switch (d.kind) {
    case 'dashboard': return { dashboard: dashboard.value, loading: dashLoading.value }
    case 'tickets': return { dashboard: dashboard.value, scope: d.scope || 'all', initialView: d.view || 'stream' }
    case 'feed': return { tickets: workingSet.value, now: now.value, loading: wsLoading.value }
    default: return {}
  }
})

/* ── URL canonicalisation + slide direction ── */
const slideDir = ref('forward')
const ensureRoute = () => {
  if (route.params.tab !== activeTab.value) router.replace(`${base.value}/tickets/${activeTab.value}`)
}
watch(() => route.params.tab, (t, prev) => {
  ensureRoute()
  if (t && prev && VALID.has(t) && VALID.has(prev)) {
    slideDir.value = TICKET_TAB_KEYS.indexOf(t) >= TICKET_TAB_KEYS.indexOf(prev) ? 'forward' : 'back'
  }
}, { immediate: true })

const selectTab = (slug) => { if (VALID.has(slug) && slug !== activeTab.value) router.push(`${base.value}/tickets/${slug}`) }
const goModule = (key) => { if (key) router.push(`${base.value}/${key}`) }

/* ── rail collapse (persisted) ── */
const collapsed = ref(typeof localStorage !== 'undefined' && localStorage.getItem('sd.tickets.rail.collapsed') === '1')
const toggleRail = () => {
  collapsed.value = !collapsed.value
  try { localStorage.setItem('sd.tickets.rail.collapsed', collapsed.value ? '1' : '0') } catch { /* private */ }
}

/* ── data ── */
const dashboard = ref(null)
const dashLoading = ref(false)
const myCount = ref(null)
const workingSet = ref([])
const wsLoading = ref(false)
const now = ref(Date.now())
let tick = null

const railCounts = computed(() => ({
  ...(dashboard.value || {}),
  ...((dashboard.value && dashboard.value.status_counts) || {}),
  my: myCount.value,
}))

const loadDashboard = async () => {
  dashLoading.value = true
  try { dashboard.value = await fetchSupportDashboard() } catch { /* keep last */ } finally { dashLoading.value = false }
  try { myCount.value = (await listTickets({ scope: 'my', limit: 1 })).total ?? null } catch { /* keep */ }
}
const loadWorkingSet = async () => {
  wsLoading.value = true
  try { workingSet.value = (await listTickets({ page: 1, limit: 100 })).items || [] } catch { workingSet.value = [] } finally { wsLoading.value = false }
}
watch(() => descriptor.value?.kind, (kind) => { if (kind === 'feed') loadWorkingSet() }, { immediate: true })

/* ── create modal (rail "New Ticket" + ?new=1) ── */
const createOpen = ref(false)
const openCreate = () => { createOpen.value = true }
const onCreated = () => { createOpen.value = false; loadDashboard(); if (descriptor.value?.kind === 'feed') loadWorkingSet() }
const fireNew = () => {
  createOpen.value = true
  const q = { ...route.query }; delete q.new; router.replace({ path: route.path, query: q })
}
watch(() => route.query.new, (v) => { if (v) fireNew() })

/* ── drawer (feed @open) ── */
const drawerId = ref(null)
const openDrawer = (id) => { drawerId.value = String(id) }
const onChanged = () => { loadDashboard(); if (descriptor.value?.kind === 'feed') loadWorkingSet() }

onMounted(() => {
  loadDashboard()
  if (route.query.new) fireNew()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(tick))
</script>

<style scoped>
.sd-tw { position: relative; display: flex; flex-direction: column; min-height: calc(100vh - 84px); color: var(--sd-text); }
.ws-body { display: flex; align-items: flex-start; gap: 0; }
.ws-canvas { flex: 1; min-width: 0; padding: 4px 2px 36px 8px; }

.tw-slide-forward-enter-active, .tw-slide-forward-leave-active,
.tw-slide-back-enter-active, .tw-slide-back-leave-active {
  transition: opacity 0.3s var(--sd-spring), transform 0.3s var(--sd-spring);
}
.tw-slide-forward-enter-from { opacity: 0; transform: translateX(20px); }
.tw-slide-forward-leave-to { opacity: 0; transform: translateX(-16px); }
.tw-slide-back-enter-from { opacity: 0; transform: translateX(-20px); }
.tw-slide-back-leave-to { opacity: 0; transform: translateX(16px); }

@media (max-width: 640px) { .ws-canvas { padding: 4px 0 28px; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tw-slide-forward-enter-active, html:not([data-cinematic="on"]) .tw-slide-forward-leave-active,
  html:not([data-cinematic="on"]) .tw-slide-back-enter-active, html:not([data-cinematic="on"]) .tw-slide-back-leave-active { transition: opacity 0.18s linear; }
  html:not([data-cinematic="on"]) .tw-slide-forward-enter-from, html:not([data-cinematic="on"]) .tw-slide-forward-leave-to,
  html:not([data-cinematic="on"]) .tw-slide-back-enter-from, html:not([data-cinematic="on"]) .tw-slide-back-leave-to { transform: none; }
}
</style>
