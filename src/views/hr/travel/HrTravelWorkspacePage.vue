<template>
  <div class="hr-workspace">
    <div class="ws-body">
      <SectionRail
        :model-value="activeTab"
        :groups="railGroups"
        :collapsed="railCollapsed"
        title="Travel"
        @update:model-value="onRailSelect"
        @toggle-collapsed="toggleRail"
      />

      <main class="ws-canvas">
        <transition :name="`trv-slide-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-section">
            <TrvDashboardSection v-if="activeTab === 'dashboard'" :stats="stats" :loading="loadingStats"
              @go="selectTab" @refresh="loadStats" />
            <TrvRequestsSection v-else-if="activeTab === 'requests'" :initial-filter="pendingFilter"
              @go="selectTab" @refresh-stats="loadStats" @consumed="pendingFilter = null" />
            <TrvApprovalsSection v-else-if="activeTab === 'approvals'" @go="selectTab" @refresh-stats="loadStats" />
            <TrvBookingSection v-else-if="activeTab === 'booking'" @go="selectTab" @refresh-stats="loadStats" />
            <TrvDaSection v-else-if="activeTab === 'da'" @go="selectTab" @refresh-stats="loadStats" />
            <TrvSettlementSection v-else-if="activeTab === 'settlement'" @go="selectTab" @refresh-stats="loadStats" />
            <TrvAdvancesSection v-else-if="activeTab === 'advances'" @go="selectTab" @refresh-stats="loadStats" />
            <TrvPoliciesSection v-else-if="activeTab === 'policies'" @go="selectTab" />
            <TrvCategoriesSection v-else-if="activeTab === 'categories'" @go="selectTab" />
            <TrvCalendarSection v-else-if="activeTab === 'calendar'" @go="selectTab" />
            <TrvReportsSection v-else-if="activeTab === 'reports'" @go="selectTab" />
            <TrvAuditLogsSection v-else-if="activeTab === 'audit-logs'" @go="selectTab" />
          </section>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  LayoutDashboard, Plane, ShieldCheck, Ticket, Calculator, Scale,
  Coins, FileBadge, Tags, CalendarDays, FileBarChart2, History,
} from 'lucide-vue-next'

import '@/styles/travel-theme.css'
import SectionRail from '@/components/hr/SectionRail.vue'
import TrvDashboardSection from './sections/TrvDashboardSection.vue'
import TrvRequestsSection from './sections/TrvRequestsSection.vue'
import TrvApprovalsSection from './sections/TrvApprovalsSection.vue'
import TrvBookingSection from './sections/TrvBookingSection.vue'
import TrvDaSection from './sections/TrvDaSection.vue'
import TrvSettlementSection from './sections/TrvSettlementSection.vue'
import TrvAdvancesSection from './sections/TrvAdvancesSection.vue'
import TrvPoliciesSection from './sections/TrvPoliciesSection.vue'
import TrvCategoriesSection from './sections/TrvCategoriesSection.vue'
import TrvCalendarSection from './sections/TrvCalendarSection.vue'
import TrvReportsSection from './sections/TrvReportsSection.vue'
import TrvAuditLogsSection from './sections/TrvAuditLogsSection.vue'
import { fetchStats, errText } from '@/composables/useTravel'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Operations' },
  { key: 'requests', label: 'Requests', icon: Plane, group: 'Operations' },
  { key: 'approvals', label: 'Approvals', icon: ShieldCheck, group: 'Operations' },
  { key: 'booking', label: 'Booking', icon: Ticket, group: 'Operations' },
  { key: 'da', label: 'Daily Allowance', icon: Calculator, group: 'Treasury' },
  { key: 'settlement', label: 'Settlement', icon: Scale, group: 'Treasury' },
  { key: 'advances', label: 'Advances', icon: Coins, group: 'Treasury' },
  { key: 'policies', label: 'Policies', icon: FileBadge, group: 'Configuration' },
  { key: 'categories', label: 'Categories', icon: Tags, group: 'Configuration' },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays, group: 'Insights' },
  { key: 'reports', label: 'Reports', icon: FileBarChart2, group: 'Insights' },
  { key: 'audit-logs', label: 'Audit logs', icon: History, group: 'Insights' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')
const pendingFilter = ref(null)

// Rail collapsed state — persisted, mirrors the Employees workspace.
const railCollapsed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('hr.travel.rail.collapsed') === '1'
)
const toggleRail = () => {
  railCollapsed.value = !railCollapsed.value
  try { localStorage.setItem('hr.travel.rail.collapsed', railCollapsed.value ? '1' : '0') } catch {}
}

const selectTab = (payload) => {
  const key = typeof payload === 'string' ? payload : payload?.tab
  if (!VALID.has(key)) return
  if (typeof payload === 'object' && payload.filter) pendingFilter.value = payload.filter
  if (key === activeTab.value) return
  router.replace({ name: 'HrTravelTab', params: { tab: key } })
}
const onRailSelect = (key) => selectTab(key)

watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TAB_KEYS.indexOf(t) >= TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})

const stats = ref(null)
const loadingStats = ref(false)
const loadStats = async () => {
  loadingStats.value = true
  try { stats.value = await fetchStats() }
  catch (e) { toast.error(errText(e, 'Failed to load travel stats')) }
  finally { loadingStats.value = false }
}

// Build the rail groups from TABS + live counts (mirrors the Employees rail shape).
const railGroups = computed(() => {
  const s = stats.value || {}
  const counts = { approvals: s.pending_approvals, settlement: s.settlements_pending }
  const groups = {}
  for (const t of TABS) {
    if (!groups[t.group]) groups[t.group] = { title: t.group, items: [] }
    const c = counts[t.key]
    groups[t.group].items.push({
      key: t.key, label: t.label, icon: t.icon,
      count: typeof c === 'number' && c > 0 ? c : null,
    })
  }
  return Object.values(groups)
})

onMounted(loadStats)
</script>

<style scoped>
.hr-workspace {
  display: flex; flex-direction: column; height: 100%;
  min-height: calc(100vh - 100px);
  background: transparent; color: var(--trv-text);
}
.ws-body { display: flex; align-items: flex-start; gap: 0; }
.ws-canvas { flex: 1; min-width: 0; padding: 16px 4px 32px 8px; }
.canvas-section { min-height: 100%; }

.trv-slide-forward-enter-active, .trv-slide-forward-leave-active,
.trv-slide-back-enter-active, .trv-slide-back-leave-active {
  transition: opacity 0.28s var(--trv-spring), transform 0.28s var(--trv-spring);
}
.trv-slide-forward-enter-from { opacity: 0; transform: translateX(18px); }
.trv-slide-forward-leave-to { opacity: 0; transform: translateX(-14px); }
.trv-slide-back-enter-from { opacity: 0; transform: translateX(-18px); }
.trv-slide-back-leave-to { opacity: 0; transform: translateX(14px); }

@media (max-width: 900px) { .ws-canvas { padding: 16px 12px 24px; } }
@media (prefers-reduced-motion: reduce) {
  .trv-slide-forward-enter-active, .trv-slide-forward-leave-active,
  .trv-slide-back-enter-active, .trv-slide-back-leave-active { transition: opacity 0.2s; }
  .trv-slide-forward-enter-from, .trv-slide-back-enter-from { transform: none; }
}
</style>
