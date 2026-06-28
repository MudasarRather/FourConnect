<template>
  <div class="sw-page">
    <div :class="vertical ? 'sw-vert' : 'sw-stack'">
      <!-- Vertical in-page menu (e.g. Tickets) — the rail carries the brand header -->
      <SdWorkspaceRail
        v-if="vertical"
        :model-value="activeTabKey"
        :tabs="activeModule.tabs"
        :mod="activeModule"
        :icons="TICKET_ICONS"
        :collapsed="railCollapsed"
        @update:modelValue="selectTab"
        @toggle-collapsed="toggleRail"
        @new="onNew"
      />
      <!-- Horizontal layout — module header + tab bar -->
      <template v-else>
        <SdModuleHeader :mod="activeModule" />
        <SdWorkspaceTabBar
          :tabs="activeModule.tabs"
          :model-value="activeTabKey"
          :accent="activeModule.accent"
          @update:modelValue="selectTab"
        />
      </template>

      <main class="sw-main">
        <transition name="sw-fade" mode="out-in">
          <SdSectionPlaceholder
            v-if="activeTab && activeTab.kind === 'placeholder'"
            :key="tabKeyId + ':ph'"
            v-bind="tabProps"
          />
          <component
            v-else-if="activeTab && activeTab.comp"
            :is="activeTab.comp"
            :key="tabKeyId"
            v-bind="tabProps"
            @go="goModule"
            @changed="onChanged"
            @open="openDrawer"
          />
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
import {
  LayoutDashboard, UserCheck, Layers, Inbox, Activity, Hourglass, Truck, AlertTriangle, Flame, Timer,
  CircleCheck, CircleSlash, Plus, Users, UserPlus, Pause, RotateCcw, AlarmClock, Archive,
  CalendarDays, ClipboardList,
} from 'lucide-vue-next'
import '../../styles/support-desk-theme.css'
import SdModuleHeader from './components/SdModuleHeader.vue'
import SdWorkspaceTabBar from './components/SdWorkspaceTabBar.vue'
import SdWorkspaceRail from './components/SdWorkspaceRail.vue'
import SdSectionPlaceholder from './sections/SdSectionPlaceholder.vue'
import SdTicketDrawer from './drawers/SdTicketDrawer.vue'
import SdTicketCreateModal from './modals/SdTicketCreateModal.vue'
import { getSupportModule, defaultTabKey } from './supportModules.js'
import { fetchSupportDashboard, listTickets } from '@/composables/useSupportDesk'

// Per-tab icons for the vertical Tickets rail (registry tabs carry no icon of their own).
const TICKET_ICONS = {
  dashboard: LayoutDashboard,
  my: UserCheck, all: Layers, unassigned: Inbox, open: Activity,
  'pending-customer': Hourglass, 'pending-vendor': Truck, critical: AlertTriangle,
  escalated: Flame, breached: Timer, resolved: CircleCheck, closed: CircleSlash,
  new: Plus, team: Users, assigned: UserPlus, 'on-hold': Pause, reopened: RotateCcw,
  overdue: AlarmClock, archived: Archive, calendar: CalendarDays, templates: ClipboardList,
}

const route = useRoute()
const router = useRouter()

const panel = computed(() => (route.path.startsWith('/user') ? 'employee' : 'admin'))
const base = computed(() => (panel.value === 'employee' ? '/user/support' : '/admin/support-desk'))

const activeModule = computed(() => getSupportModule(panel.value, route.params.module))
const vertical = computed(() => !!activeModule.value.verticalRail)
const activeTabKey = computed(() => {
  const t = route.params.tab
  return activeModule.value.tabs.some(x => x.key === t) ? t : defaultTabKey(activeModule.value)
})
const activeTab = computed(() => activeModule.value.tabs.find(t => t.key === activeTabKey.value) || activeModule.value.tabs[0])
const tabKeyId = computed(() => `${activeModule.value.key}:${activeTabKey.value}`)

/* ── Canonicalise the URL (valid module + explicit tab) ── */
const ensureRoute = () => {
  const m = activeModule.value
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
const dashboard = ref(null)
const dashLoading = ref(false)
const workingSet = ref([])
const wsLoading = ref(false)
const now = ref(Date.now())
const drawerId = ref(null)
let tick = null

const loadDashboard = async () => {
  dashLoading.value = true
  try { dashboard.value = await fetchSupportDashboard() } catch { dashboard.value = null } finally { dashLoading.value = false }
}
const loadWorkingSet = async () => {
  wsLoading.value = true
  try { workingSet.value = (await listTickets({ page: 1, limit: 100 })).items || [] } catch { workingSet.value = [] } finally { wsLoading.value = false }
}

watch(() => activeTab.value?.kind, (kind) => {
  if (kind === 'dashboard' || kind === 'tickets') loadDashboard()
  if (kind === 'feed') loadWorkingSet()
}, { immediate: true })

const tabProps = computed(() => {
  const t = activeTab.value
  if (!t) return {}
  switch (t.kind) {
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
  if (['dashboard', 'tickets'].includes(activeTab.value?.kind)) loadDashboard()
  if (activeTab.value?.kind === 'feed') loadWorkingSet()
}
const openDrawer = (id) => { drawerId.value = String(id) }

/* ── create modal (rail "New Ticket" + ?new=1) ── */
const createOpen = ref(false)
const onNew = () => { createOpen.value = true }
const onCreated = () => { createOpen.value = false; onChanged() }
const fireCreate = () => {
  createOpen.value = true
  const q = { ...route.query }; delete q.new
  router.replace({ path: route.path, query: q })
}
watch(() => route.query.new, (v) => { if (v) fireCreate() })

onMounted(() => {
  if (route.query.new) fireCreate()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(tick))
</script>

<style scoped>
.sw-page { position: relative; min-height: calc(100vh - 100px); color: var(--sd-text); }
.sw-stack { display: flex; flex-direction: column; gap: 16px; }
.sw-vert { display: flex; align-items: flex-start; gap: 0; }
.sw-main { flex: 1; min-width: 0; }
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
