<template>
  <div class="sw-page">
    <div :class="vertical ? 'sw-vert' : 'sw-stack'">
      <!-- Vertical in-page menu (e.g. Tickets, Queues) — the rail carries the brand
           header. Each vertical module owns its OWN rail instrument: Tickets → the
           console rail (SdWorkspaceRail), Queues → the Switchyard lever frame
           (SdSwitchyardRail). Registry picks via `verticalRail: true | 'switchyard'`. -->
      <component
        :is="railComp"
        v-if="vertical"
        :model-value="activeTabKey"
        :tabs="visibleTabs"
        :mod="activeModule"
        :icons="railIcons"
        :collapsed="railCollapsed"
        @update:modelValue="selectTab"
        @toggle-collapsed="toggleRail"
        @new="onNew"
      />
      <!-- Horizontal layout — module header + tab bar -->
      <template v-else>
        <SdModuleHeader :mod="activeModule" />
        <SdWorkspaceTabBar
          :tabs="visibleTabs"
          :model-value="activeTabKey"
          :accent="activeModule.accent"
          @update:modelValue="selectTab"
        />
      </template>

      <main class="sw-main">
        <!-- The transition's direct child MUST be a stable element, NOT the async
             <component> itself — otherwise `mode="out-in"` animates the async loading
             placeholder (a comment node) and the resolved section never enters until a
             forced re-render (the "menu doesn't load until I reload" bug). Mirrors the
             proven HR-workspace pattern: keyed wrapper element, async section inside. -->
        <transition name="sw-fade" mode="out-in">
          <div class="sw-canvas" :key="tabKeyId">
            <SdSectionPlaceholder
              v-if="activeTab && activeTab.kind === 'placeholder'"
              v-bind="tabProps"
            />
            <component
              v-else-if="activeTab && activeTab.comp"
              :is="activeTab.comp"
              v-bind="tabProps"
              @go="goModule"
              @changed="onChanged"
              @open="openDrawer"
              @new="onNew"
            />
          </div>
        </transition>
      </main>
    </div>

    <!-- Rail "New Ticket" + ?new= deep-link; ?ticket= drawer for feed-opened tickets.
         Panel-aware: admin/agents hit createTicket; self-service employees createMyTicket. -->
    <SdTicketCreateModal :open="createOpen" :panel="panel" @close="createOpen = false" @created="onCreated" />
    <SdTicketDrawer :ticket-id="drawerId" @close="drawerId = null" @changed="onChanged" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, UserCheck, Layers, Inbox, Activity, Hourglass, Truck, AlertTriangle, Flame, Timer,
  CircleCheck, CircleSlash, Plus, Users, UserPlus, Pause, RotateCcw, AlarmClock, Archive,
  CalendarDays, ClipboardList, TowerControl, Headset, Wrench, Cpu, SlidersHorizontal,
} from 'lucide-vue-next'
import '../../styles/support-desk-theme.css'
import SdModuleHeader from './components/SdModuleHeader.vue'
import SdWorkspaceTabBar from './components/SdWorkspaceTabBar.vue'
import SdWorkspaceRail from './components/SdWorkspaceRail.vue'
import SdSwitchyardRail from './components/SdSwitchyardRail.vue'
import SdSectionPlaceholder from './sections/SdSectionPlaceholder.vue'
import SdTicketDrawer from './drawers/SdTicketDrawer.vue'
import SdTicketCreateModal from './modals/SdTicketCreateModal.vue'
import { getSupportModule, defaultTabKey } from './supportModules.js'
import { fetchSupportDashboard, fetchSelfDashboard, detectSupportAgent, listTickets } from '@/composables/useSupportDesk'

// Per-tab icons for the vertical Tickets rail (registry tabs carry no icon of their own).
const TICKET_ICONS = {
  dashboard: LayoutDashboard,
  my: UserCheck, all: Layers, unassigned: Inbox, open: Activity,
  'pending-customer': Hourglass, 'pending-vendor': Truck, critical: AlertTriangle,
  escalated: Flame, breached: Timer, resolved: CircleCheck, closed: CircleSlash,
  new: Plus, team: Users, assigned: UserPlus, 'on-hold': Pause, reopened: RotateCcw,
  overdue: AlarmClock, archived: Archive, calendar: CalendarDays, templates: ClipboardList,
}
// Per-tab icons for the vertical Queues "Switchyard" lever frame.
const QUEUE_ICONS = {
  overview: TowerControl, l1: Headset, l2: Wrench, l3: Cpu, config: SlidersHorizontal,
}
const RAIL_ICONS = { tickets: TICKET_ICONS, queues: QUEUE_ICONS }

const route = useRoute()
const router = useRouter()

const panel = computed(() => (route.path.startsWith('/user') ? 'employee' : 'admin'))
const base = computed(() => (panel.value === 'employee' ? '/user/support' : '/admin/support-desk'))

const activeModule = computed(() => getSupportModule(panel.value, route.params.module))
const vertical = computed(() => !!activeModule.value.verticalRail)
const railComp = computed(() => (activeModule.value.verticalRail === 'switchyard' ? SdSwitchyardRail : SdWorkspaceRail))
const railIcons = computed(() => RAIL_ICONS[activeModule.value.key] || {})

// Support-agent reveal (Hybrid): admin always; employee only after a successful ops probe.
const agentReveal = ref(panel.value === 'admin')
// True while the employee-panel agent probe is still in flight — ensureRoute must not
// canonicalize a deep link to an agent-only tab (e.g. /tickets/archived) away to the
// first visible tab before the reveal lands. bootDetect clears it and re-settles the URL.
const revealPending = ref(panel.value !== 'admin')

// Tabs visible for this panel + role. `adminOnly` tabs hide outside admin; `agentOnly`
// tabs (the operational ticket views) hide for self-service employees until they're a
// support agent — so a regular employee sees a slim self-service Tickets menu.
const visibleTabs = computed(() => activeModule.value.tabs.filter(t => {
  if (t.adminOnly && panel.value !== 'admin') return false
  if (t.agentOnly && !(panel.value === 'admin' || agentReveal.value)) return false
  return true
}))

const activeTabKey = computed(() => {
  const t = route.params.tab
  return visibleTabs.value.some(x => x.key === t) ? t : (visibleTabs.value[0]?.key || defaultTabKey(activeModule.value))
})
const activeTab = computed(() => visibleTabs.value.find(t => t.key === activeTabKey.value) || visibleTabs.value[0] || activeModule.value.tabs[0])
const tabKeyId = computed(() => `${activeModule.value.key}:${activeTabKey.value}`)

/* ── Canonicalise the URL (valid module + explicit tab) ── */
const ensureRoute = () => {
  const m = activeModule.value
  // Hold the URL steady while the agent probe decides whether an agent-only tab is
  // about to reveal — otherwise a deep link bounces to the first tab and never returns.
  if (revealPending.value && m.tabs.some(t => t.key === route.params.tab && t.agentOnly)) return
  const wantTab = activeTabKey.value
  if (route.params.module !== m.key || route.params.tab !== wantTab) {
    router.replace(`${base.value}/${m.key}/${wantTab}`)
  }
}
watch(() => [route.params.module, route.params.tab, panel.value], ensureRoute, { immediate: true })

/* ── rail collapse (persisted) ── */
const railCollapsed = ref(typeof localStorage !== 'undefined' && localStorage.getItem('sd.support.rail.collapsed') === '1')
const toggleRail = () => {
  railCollapsed.value = !railCollapsed.value
  try { localStorage.setItem('sd.support.rail.collapsed', railCollapsed.value ? '1' : '0') } catch { /* private */ }
}

/* ── Data (only fetched for the kinds that need it) ── */
const dashboard = ref(null)          // ops dashboard (admin) / agent-cockpit data (employee)
const selfDashboard = ref(null)      // personal dashboard (employee)
const dashLoading = ref(false)
const workingSet = ref([])
const wsLoading = ref(false)
const now = ref(Date.now())
const drawerId = ref(null)
let tick = null
let dashPoll = null

// `silent` = background re-poll: no skeleton flash, and a failed poll keeps the
// last good payload instead of blanking the board.
const loadDashboard = async (silent = false) => {
  if (!silent) dashLoading.value = true
  try { dashboard.value = await fetchSupportDashboard() } catch { if (!silent) dashboard.value = null } finally { dashLoading.value = false }
}
const loadWorkingSet = async () => {
  wsLoading.value = true
  try { workingSet.value = (await listTickets({ page: 1, limit: 100 })).items || [] } catch { workingSet.value = [] } finally { wsLoading.value = false }
}

// Ticket "Dashboard" tab — panel-aware so a non-agent employee never hits the
// superuser-only ops endpoint (which would 403 → blank). Admin → ops dashboard;
// employee → personal dashboard PLUS a shared one-time agent probe that both
// reveals the Agent Cockpit and unlocks the operational tabs.
const loadTicketDash = async (silent = false) => {
  if (!silent) dashLoading.value = true
  try {
    if (panel.value === 'admin') {
      agentReveal.value = true
      dashboard.value = await fetchSupportDashboard()
    } else {
      selfDashboard.value = await fetchSelfDashboard()
      const st = await detectSupportAgent(false)
      agentReveal.value = st.isAgent
      dashboard.value = st.ops || null
    }
  } catch { /* keep last good values */ } finally { dashLoading.value = false }
}

// Detect agent status on mount for employees, so the operational tabs reveal in
// the rail even when the user lands on a non-dashboard tab (e.g. /tickets/my).
const bootDetect = async () => {
  if (panel.value === 'admin') { agentReveal.value = true; revealPending.value = false; return }
  try { const st = await detectSupportAgent(false); agentReveal.value = st.isAgent } catch { /* self-service only */ }
  finally { revealPending.value = false; ensureRoute() }
}

watch(() => activeTab.value?.kind, (kind) => {
  if (kind === 'ticket-dashboard') loadTicketDash()
  else if (kind === 'dashboard' || kind === 'tickets') loadDashboard()
  else if (kind === 'feed') loadWorkingSet()
}, { immediate: true })

const tabProps = computed(() => {
  const t = activeTab.value
  if (!t) return {}
  switch (t.kind) {
    case 'ticket-dashboard': return { panel: panel.value, dashboard: dashboard.value, selfDashboard: selfDashboard.value, agentReveal: agentReveal.value, loading: dashLoading.value }
    case 'ticket-list': return { scope: t.scope, panel: panel.value, agentReveal: agentReveal.value, dashboard: dashboard.value }
    // `t.props` = static per-tab extras from the registry (e.g. the queue tier).
    case 'ticket-tool': return { panel: panel.value, agentReveal: agentReveal.value, ...(t.props || {}) }
    case 'dashboard': return { dashboard: dashboard.value, loading: dashLoading.value }
    case 'tickets': return { dashboard: dashboard.value, scope: t.scope || 'all' }
    case 'feed': return { tickets: workingSet.value, now: now.value, loading: wsLoading.value }
    case 'placeholder': return { label: t.label, phase: t.phase, blurb: t.blurb, icon: activeModule.value.icon }
    default: return {}
  }
})

/* ── Interactions ── */
const selectTab = (key) => { if (key !== activeTabKey.value) router.push(`${base.value}/${activeModule.value.key}/${key}`) }
const goModule = (key) => { if (key) router.push(`${base.value}/${key}`) }
const onChanged = () => {
  const kind = activeTab.value?.kind
  if (kind === 'ticket-dashboard') loadTicketDash()
  else if (['dashboard', 'tickets'].includes(kind)) loadDashboard()
  else if (kind === 'feed') loadWorkingSet()
}
const openDrawer = (id) => { drawerId.value = String(id) }

/* ── create (rail "New Ticket" + ?new=1) ── */
// Admin/agents get the full admin create modal (createTicket endpoint). A non-agent
// employee can't use it (403) — send them to the self-service "Create Ticket" tab.
const createOpen = ref(false)
// Every "raise a ticket" entry point now lands on the full-page Intelligent
// Intake console (`tickets/new`) — one canonical create experience, panel-aware
// (employee → createMyTicket, agent → createTicket). The legacy quick-create
// modal stays mounted below as an inert fallback (never auto-opened).
const onNew = () => { router.push(`${base.value}/tickets/new`) }
const onCreated = () => { createOpen.value = false; onChanged() }
const fireCreate = () => {
  const q = { ...route.query }; delete q.new
  router.replace({ path: `${base.value}/tickets/new`, query: q })
}
watch(() => route.query.new, (v) => { if (v) fireCreate() })

onMounted(() => {
  bootDetect()
  if (route.query.new) fireCreate()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  // Live board: the Concourse's Solari rows read the legacy dashboard payload, which
  // was fetched ONCE per tab activation — the intel poll inside SdIntelDashboard kept
  // half the board fresh while these rows froze. Visibility-gated 60s silent re-poll.
  dashPoll = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    const kind = activeTab.value?.kind
    if (kind === 'ticket-dashboard') loadTicketDash(true)
    else if (kind === 'dashboard' || kind === 'tickets') loadDashboard(true)
  }, 60000)
})
onUnmounted(() => { clearInterval(tick); clearInterval(dashPoll) })
</script>

<style scoped>
.sw-page { position: relative; min-height: calc(100vh - 100px); color: var(--sd-text); }
.sw-stack { display: flex; flex-direction: column; gap: 16px; }
.sw-vert { display: flex; align-items: flex-start; gap: 0; }
.sw-main { flex: 1; min-width: 0; }
.sw-canvas { min-width: 0; }
.sw-vert .sw-main { padding: 4px 2px 36px 8px; }

.sw-fade-enter-active, .sw-fade-leave-active { transition: opacity 0.26s var(--sd-spring), transform 0.26s var(--sd-spring); }
.sw-fade-enter-from { opacity: 0; transform: translateY(12px); }
.sw-fade-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 640px) { .sw-vert .sw-main { padding: 4px 0 28px; } }
@media (prefers-reduced-motion: reduce) {
  .sw-fade-enter-active, .sw-fade-leave-active { transition: opacity 0.18s linear; }
  .sw-fade-enter-from, .sw-fade-leave-to { transform: none; }
}
</style>
