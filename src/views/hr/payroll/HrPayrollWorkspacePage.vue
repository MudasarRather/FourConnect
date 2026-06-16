<template>
  <div class="pay-root">
    <div class="pay-shell">
      <PayVaultRail v-model="activeTab" :tabs="TABS" :stats="stats" :fy-label="fyLabel()" />

      <div class="pay-main">
        <PayHeroCanvas
          :stats="stats" :fy-label="fyLabel()" :period="period" :current-batch="currentBatch"
          @go="selectTab" @month-change="onMonthChange" />

        <main class="pay-canvas">
          <transition :name="`pay-slide-${slideDir}`" mode="out-in">
            <section :key="activeTab" class="canvas-inner">
          <PayDashboardSection      v-if="activeTab === 'dashboard'"     :stats="stats" :loading="loadingStats" @go="selectTab" @refresh="loadDashboard" />
          <PaySalaryStructuresSection v-else-if="activeTab === 'structures'" @refresh-stats="loadDashboard" />
          <PaySalaryComponentsSection v-else-if="activeTab === 'components'" @refresh-stats="loadDashboard" />
          <PayCompensationSection   v-else-if="activeTab === 'compensation'" @refresh-stats="loadDashboard" />
          <PayProcessingSection     v-else-if="activeTab === 'processing'" :period="period" @go="selectTab" @open-batch="openBatch" />
          <PayMonthlySection        v-else-if="activeTab === 'monthly'" :period="period" :focus-batch="focusBatchId" @refresh-stats="loadDashboard" />
          <PayApprovalSection       v-else-if="activeTab === 'approval'" @refresh-stats="loadDashboard" @open-batch="openBatch" />
          <PayPayslipsSection       v-else-if="activeTab === 'payslips'" :period="period" />
          <!-- Phase B/C -->
          <PayRevisionsSection      v-else-if="activeTab === 'revisions'" />
          <PayAdjustmentsSection    v-else-if="activeTab === 'arrears'" kind="ARREAR" @refresh-stats="loadDashboard" />
          <PayBonusSection          v-else-if="activeTab === 'bonus'" @refresh-stats="loadDashboard" />
          <PayIncentivesSection     v-else-if="activeTab === 'incentives'" @refresh-stats="loadDashboard" />
          <PayVariablePaySection    v-else-if="activeTab === 'variable-pay'" @refresh-stats="loadDashboard" />
          <PayTaxSection            v-else-if="activeTab === 'tax'" />
          <PayTdsSection            v-else-if="activeTab === 'tds'" />
          <PayStatutorySection      v-else-if="activeTab === 'statutory'" />
          <PayTaxDocsSection        v-else-if="activeTab === 'tax-documents'" />
          <PayBankFilesSection      v-else-if="activeTab === 'bank-files'" />
          <PayReportsSection        v-else-if="activeTab === 'reports'" />
          <PayAuditLogsSection      v-else-if="activeTab === 'audit-logs'" />
          <PayComingSoonSection     v-else :section-key="activeTab" />
            </section>
          </transition>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import '@/styles/payroll-theme.css'

import PayHeroCanvas from './components/PayHeroCanvas.vue'
import PayVaultRail from './components/PayVaultRail.vue'
import PayComingSoonSection from './components/PayComingSoonSection.vue'
import PayDashboardSection from './sections/PayDashboardSection.vue'
import PaySalaryStructuresSection from './sections/PaySalaryStructuresSection.vue'
import PaySalaryComponentsSection from './sections/PaySalaryComponentsSection.vue'
import PayCompensationSection from './sections/PayCompensationSection.vue'
import PayProcessingSection from './sections/PayProcessingSection.vue'
import PayMonthlySection from './sections/PayMonthlySection.vue'
import PayApprovalSection from './sections/PayApprovalSection.vue'
import PayPayslipsSection from './sections/PayPayslipsSection.vue'
import PayRevisionsSection from './sections/PayRevisionsSection.vue'
import PayAdjustmentsSection from './sections/PayAdjustmentsSection.vue'
import PayBonusSection from './sections/PayBonusSection.vue'
import PayIncentivesSection from './sections/PayIncentivesSection.vue'
import PayVariablePaySection from './sections/PayVariablePaySection.vue'
import PayTaxSection from './sections/PayTaxSection.vue'
import PayTdsSection from './sections/PayTdsSection.vue'
import PayStatutorySection from './sections/PayStatutorySection.vue'
import PayTaxDocsSection from './sections/PayTaxDocsSection.vue'
import PayBankFilesSection from './sections/PayBankFilesSection.vue'
import PayReportsSection from './sections/PayReportsSection.vue'
import PayAuditLogsSection from './sections/PayAuditLogsSection.vue'

import { PAYROLL_TABS, PAYROLL_TAB_KEYS, fetchPayrollStats, fyLabel } from '@/composables/usePayroll'
import { fetchBatches } from '@/composables/usePayrollBatch'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = PAYROLL_TABS
const VALID = new Set(PAYROLL_TAB_KEYS)
const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrPayrollTab', params: { tab: key } })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = PAYROLL_TAB_KEYS.indexOf(t) >= PAYROLL_TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})
// Sync the URL when the rail (v-model) changes the active tab. Guarded against
// the route watcher above so the two never loop.
watch(activeTab, (key) => {
  if (VALID.has(key) && route.params.tab !== key) {
    router.replace({ name: 'HrPayrollTab', params: { tab: key } })
  }
})

// period + dashboard + current batch
const now = new Date()
const period = ref({ year: now.getFullYear(), month: now.getMonth() + 1 })
const stats = ref(null)
const loadingStats = ref(false)
const currentBatch = ref(null)
const focusBatchId = ref(null)

const loadDashboard = async () => {
  loadingStats.value = true
  try { stats.value = await fetchPayrollStats() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load payroll stats') }
  finally { loadingStats.value = false }
}
const loadCurrentBatch = async () => {
  try {
    const res = await fetchBatches({ year: period.value.year, month: period.value.month, limit: 1 })
    currentBatch.value = (res.items && res.items[0]) || null
  } catch { currentBatch.value = null }
}
const onMonthChange = (p) => { period.value = p; loadCurrentBatch() }
const openBatch = (id) => { focusBatchId.value = id; selectTab('monthly') }

onMounted(() => { loadDashboard(); loadCurrentBatch() })
</script>

<style scoped>
.pay-root { min-height: 100%; padding: 18px 22px 60px; color: var(--pay-text); background: var(--pay-canvas); }
.pay-shell { display: flex; align-items: flex-start; gap: 18px; }
.pay-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.pay-canvas { margin-top: 2px; }
.canvas-inner { will-change: transform, opacity; min-height: 360px; }
@media (max-width: 900px) { .pay-shell { flex-direction: column; gap: 0; } }

.pay-slide-forward-enter-active, .pay-slide-back-enter-active,
.pay-slide-forward-leave-active, .pay-slide-back-leave-active {
  transition: opacity 0.26s var(--pay-ease), transform 0.26s var(--pay-ease); }
.pay-slide-forward-enter-from { opacity: 0; transform: translateX(24px); }
.pay-slide-forward-leave-to { opacity: 0; transform: translateX(-24px); }
.pay-slide-back-enter-from { opacity: 0; transform: translateX(-24px); }
.pay-slide-back-leave-to { opacity: 0; transform: translateX(24px); }
@media (prefers-reduced-motion: reduce) {
  .pay-slide-forward-enter-active, .pay-slide-back-enter-active,
  .pay-slide-forward-leave-active, .pay-slide-back-leave-active { transition: opacity 0.2s; }
  .pay-slide-forward-enter-from, .pay-slide-back-enter-from,
  .pay-slide-forward-leave-to, .pay-slide-back-leave-to { transform: none; }
}
</style>
