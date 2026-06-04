<template>
  <div class="lv-root lv-workspace">
    <LeaveHeroCanvas :metrics="heroMetrics" :loading="loadingStats" :fyLabel="fyLabel" @go="selectTab" />

    <div class="ws-body">
      <LeaveTabBar v-model="activeTab" :tabs="tabsWithCounts" :fyLabel="fyLabel" />

      <main class="lv-canvas">
        <transition :name="`lv-slide-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-inner">
            <LeaveDashboardSection
              v-if="activeTab === 'dashboard'"
              :stats="stats" :loading="loadingStats" @go="selectTab"
              @refresh="loadDashboard"
            />
            <LeaveApplicationsSection v-else-if="activeTab === 'applications'" @refresh-stats="loadDashboard" />
            <LeaveMyApprovalsSection  v-else-if="activeTab === 'my-approvals'" @refresh-stats="loadDashboard" />
            <LeaveHrQueueSection      v-else-if="activeTab === 'hr-queue'"     @refresh-stats="loadDashboard" />
            <LeaveManagerQueueSection v-else-if="activeTab === 'manager-queue'" @refresh-stats="loadDashboard" />
            <LeaveCalendarSection     v-else-if="activeTab === 'calendar'" />
            <LeaveBalancesSection     v-else-if="activeTab === 'balances'" />
            <LeavePoliciesSection     v-else-if="activeTab === 'policies'" />
            <LeaveHolidaysSection     v-else-if="activeTab === 'holidays'" />
            <LeaveCompOffSection      v-else-if="activeTab === 'comp-off'" />
            <LeaveEncashmentSection   v-else-if="activeTab === 'encashment'" />
            <LeaveReportsSection      v-else-if="activeTab === 'reports'" />
            <LeaveAuditLogsSection    v-else-if="activeTab === 'audit-logs'" />
            <LeaveComingSoonSection   v-else :section-key="activeTab" />
          </section>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, ListChecks, Inbox, UserCheck, CalendarRange,
  Wallet, BookOpen, PartyPopper, Coffee, IndianRupee, BarChart3, ScrollText,
  ShieldCheck,
} from 'lucide-vue-next'

import '@/styles/leave-theme.css'

import LeaveHeroCanvas from './components/LeaveHeroCanvas.vue'
import LeaveTabBar from './components/LeaveTabBar.vue'
import LeaveDashboardSection from './sections/LeaveDashboardSection.vue'
import LeaveApplicationsSection from './sections/LeaveApplicationsSection.vue'
import LeaveMyApprovalsSection from './sections/LeaveMyApprovalsSection.vue'
import LeaveHrQueueSection from './sections/LeaveHrQueueSection.vue'
import LeaveManagerQueueSection from './sections/LeaveManagerQueueSection.vue'
import LeaveCalendarSection from './sections/LeaveCalendarSection.vue'
import LeaveBalancesSection from './sections/LeaveBalancesSection.vue'
import LeavePoliciesSection from './sections/LeavePoliciesSection.vue'
import LeaveHolidaysSection from './sections/LeaveHolidaysSection.vue'
import LeaveCompOffSection from './sections/LeaveCompOffSection.vue'
import LeaveEncashmentSection from './sections/LeaveEncashmentSection.vue'
import LeaveReportsSection from './sections/LeaveReportsSection.vue'
import LeaveAuditLogsSection from './sections/LeaveAuditLogsSection.vue'
import LeaveComingSoonSection from './components/LeaveComingSoonSection.vue'

import { fetchLeaveStats } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = [
  { key: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard, group: 'overview' },
  { key: 'applications',  label: 'Applications',  icon: ListChecks,      group: 'ops' },
  { key: 'my-approvals',  label: 'My approvals',  icon: ShieldCheck,     group: 'ops' },
  { key: 'hr-queue',      label: 'HR queue',      icon: Inbox,           group: 'ops' },
  { key: 'manager-queue', label: 'Manager queue', icon: UserCheck,       group: 'ops' },
  { key: 'calendar',      label: 'Calendar',      icon: CalendarRange,   group: 'ops' },
  { key: 'balances',      label: 'Balances',      icon: Wallet,          group: 'ops' },
  { key: 'policies',      label: 'Policies',      icon: BookOpen,        group: 'configuration' },
  { key: 'holidays',      label: 'Holidays',      icon: PartyPopper,     group: 'configuration' },
  { key: 'comp-off',      label: 'Comp-Off',      icon: Coffee,          group: 'system' },
  { key: 'encashment',    label: 'Encashment',    icon: IndianRupee,     group: 'system' },
  { key: 'reports',       label: 'Reports',       icon: BarChart3,       group: 'system' },
  { key: 'audit-logs',    label: 'Audit logs',    icon: ScrollText,      group: 'system' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrLeaveTab', params: { tab: key } })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TAB_KEYS.indexOf(t) >= TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})
watch(activeTab, (k) => {
  if (route.params.tab !== k && VALID.has(k)) router.replace({ name: 'HrLeaveTab', params: { tab: k } })
})

// ─── Live dashboard data ────────────────────────────────────────────────
const stats = ref(null)
const loadingStats = ref(false)

const fyLabel = computed(() => {
  // April fiscal year — derive from today
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}–${String(y + 1).slice(-2)}`
})

const loadDashboard = async () => {
  loadingStats.value = true
  try { stats.value = await fetchLeaveStats() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load leave stats') }
  finally { loadingStats.value = false }
}

const tabsWithCounts = computed(() => {
  const s = stats.value || {}
  const counts = {
    'hr-queue': s.pending_hr,
    'manager-queue': s.pending_manager,
  }
  return TABS.map(t => counts[t.key] ? { ...t, count: counts[t.key] } : t)
})

const heroMetrics = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'pending-hr',  label: 'HR review',       icon: Inbox,          value: s.pending_hr || 0,        tone: 'warn',    go: 'hr-queue', foot: 'awaiting decision' },
    { key: 'on-leave',    label: 'On leave today',  icon: UserCheck,      value: s.on_leave_today || 0,   tone: 'info',    go: 'calendar', foot: 'currently away' },
    { key: 'approved-mo', label: 'Approved · month',icon: ListChecks,     value: s.approved_this_month || 0, tone: 'success', go: 'applications', foot: 'this month' },
    { key: 'upcoming',    label: 'Upcoming · 30d',  icon: CalendarRange,  value: s.upcoming_30d || 0,     tone: 'neutral', go: 'calendar', foot: 'starts soon' },
  ]
})

onMounted(loadDashboard)
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.lv-workspace {
  display: flex; flex-direction: column;
  min-height: calc(100vh - 100px);
  background: transparent;
}

.ws-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.lv-canvas {
  flex: 1;
  min-width: 0;
  padding: 0 0 24px;
}
.canvas-inner { min-height: 360px; }

.lv-slide-forward-enter-active, .lv-slide-forward-leave-active,
.lv-slide-back-enter-active,    .lv-slide-back-leave-active {
  transition: opacity 0.26s var(--leave-ease), transform 0.26s var(--leave-ease);
}
.lv-slide-forward-enter-from { opacity: 0; transform: translateX(16px); }
.lv-slide-forward-leave-to   { opacity: 0; transform: translateX(-12px); }
.lv-slide-back-enter-from    { opacity: 0; transform: translateX(-16px); }
.lv-slide-back-leave-to      { opacity: 0; transform: translateX(12px); }

@media (max-width: 1024px) {
  .ws-body { flex-direction: column; }
  .lv-canvas { padding: 16px 0 24px; }
}
</style>
