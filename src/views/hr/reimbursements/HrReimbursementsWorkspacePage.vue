<template>
  <div class="rmb-root rmb-workspace">
    <RmbHeroCanvas :metrics="heroMetrics" :fyLabel="fyLabel" :context="activeTab" @go="selectTab" />

    <RmbTabBar :modelValue="activeTab" :tabs="tabsWithCounts" @update:modelValue="selectTab" />

    <main class="rmb-canvas">
      <transition :name="`rmb-slide-${slideDir}`" mode="out-in">
        <section :key="activeTab" class="canvas-inner">
          <RmbDashboardSection v-if="activeTab === 'dashboard'" :stats="stats" @go="selectTab" @refresh="loadStats" />
          <RmbClaimsSection v-else-if="activeTab === 'claims'" @refresh-stats="loadStats" />
          <RmbApprovalsSection v-else-if="activeTab === 'approvals'" @refresh-stats="loadStats" />
          <RmbSettlementSection v-else-if="activeTab === 'settlement'" @refresh-stats="loadStats" />
          <RmbPoliciesSection v-else-if="activeTab === 'policies'" />
          <RmbCategoriesSection v-else-if="activeTab === 'categories'" />
          <RmbAuditLogsSection v-else-if="activeTab === 'audit-logs'" />
          <RmbReportsSection v-else-if="activeTab === 'reports'" />
          <RmbComingSoonSection v-else :section-key="activeTab" />
        </section>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, ScrollText, Inbox, Wallet, Settings2, Tags, FileBarChart2, History,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

import '@/styles/reimbursements-theme.css'

import RmbHeroCanvas from './components/RmbHeroCanvas.vue'
import RmbTabBar from './components/RmbTabBar.vue'
import RmbComingSoonSection from './components/RmbComingSoonSection.vue'
import RmbDashboardSection from './sections/RmbDashboardSection.vue'
import RmbClaimsSection from './sections/RmbClaimsSection.vue'
import RmbApprovalsSection from './sections/RmbApprovalsSection.vue'
import RmbSettlementSection from './sections/RmbSettlementSection.vue'
import RmbPoliciesSection from './sections/RmbPoliciesSection.vue'
import RmbCategoriesSection from './sections/RmbCategoriesSection.vue'
import RmbAuditLogsSection from './sections/RmbAuditLogsSection.vue'
import RmbReportsSection from './sections/RmbReportsSection.vue'

import { fetchReimbStats, errText } from '@/composables/useReimbursements'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = [
  { key: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'claims',     label: 'Claims',     icon: ScrollText },
  { key: 'approvals',  label: 'Approvals',  icon: Inbox },
  { key: 'settlement', label: 'Settlement', icon: Wallet },
  { key: 'policies',   label: 'Policies',   icon: Settings2 },
  { key: 'categories', label: 'Categories', icon: Tags },
  { key: 'audit-logs', label: 'Audit logs', icon: History },
  { key: 'reports',    label: 'Reports',    icon: FileBarChart2 },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrReimbursementsTab', params: { tab: key } })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TAB_KEYS.indexOf(t) >= TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})

const stats = ref(null)
const loadStats = async () => {
  try { stats.value = await fetchReimbStats() }
  catch (e) { toast.error(errText(e, 'Failed to load reimbursement stats')) }
}

const fyLabel = computed(() => {
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}–${String(y + 1).slice(-2)}`
})

const heroMetrics = computed(() => {
  const s = stats.value || {}
  // Settled/Paid claim count drives the hero pipeline gauge's "settled" segment.
  const settledCount = (s.by_status || [])
    .filter(r => r.status === 'SETTLED' || r.status === 'PAID')
    .reduce((a, r) => a + (Number(r.count) || 0), 0)
  // Pending-approval value powers the approvals-variant hero.
  const pendingAmount = (s.by_status || [])
    .find(r => r.status === 'PENDING_APPROVAL')?.amount || 0
  // Approved-but-unsettled value powers the settlement-variant hero.
  const approvedAmount = (s.by_status || [])
    .find(r => r.status === 'APPROVED')?.amount || 0
  return {
    total: s.total_reimbursed_fy || s.settled_amount || 0,
    pending: s.pending_approval || 0,
    approved_unsettled: s.approved_unsettled || 0,
    settled_count: settledCount,
    total_claims: s.total_claims || 0,
    settled_month: s.claims_this_month || 0,
    avg_days: s.avg_processing_days || 0,
    pending_amount: Number(pendingAmount) || 0,
    approved_amount: Number(approvedAmount) || 0,
    settled_amount: Number(s.settled_amount) || 0,
    rejected_count: s.rejected || 0,
    category_count: (s.by_category || []).length,
  }
})

const tabsWithCounts = computed(() => {
  const s = stats.value || {}
  const counts = { approvals: s.pending_approval, settlement: s.approved_unsettled }
  return TABS.map(t => counts[t.key] ? { ...t, count: counts[t.key] } : t)
})

onMounted(loadStats)
</script>

<style scoped>
@import '@/styles/reimbursements-theme.css';

.rmb-workspace { display: flex; flex-direction: column; min-height: calc(100vh - 100px); background: transparent; }
.rmb-canvas { padding: 8px 0 28px; }
.canvas-inner { min-height: 360px; }

.rmb-slide-forward-enter-active, .rmb-slide-forward-leave-active,
.rmb-slide-back-enter-active, .rmb-slide-back-leave-active {
  transition: opacity 0.26s var(--rmb-spring), transform 0.26s var(--rmb-spring);
}
.rmb-slide-forward-enter-from { opacity: 0; transform: translateX(16px); }
.rmb-slide-forward-leave-to { opacity: 0; transform: translateX(-12px); }
.rmb-slide-back-enter-from { opacity: 0; transform: translateX(-16px); }
.rmb-slide-back-leave-to { opacity: 0; transform: translateX(12px); }
</style>
