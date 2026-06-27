<template>
  <div class="hr-workspace set-scope">
    <div class="ws-body">
      <SectionRail
        :model-value="activeTab"
        :groups="railGroups"
        :collapsed="railCollapsed"
        title="Settings"
        @update:model-value="onRailSelect"
        @toggle-collapsed="toggleRail"
      />

      <main class="ws-canvas">
        <transition :name="`set-slide-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-section">
            <SetDashboardSection v-if="activeTab === 'dashboard'" @go="selectTab" />
            <SetDepartmentsSection v-else-if="activeTab === 'departments'" :key="activeTab" />
            <SetGradesSection v-else-if="activeTab === 'grades'" :key="activeTab" />
            <SetDesignationsSection v-else-if="activeTab === 'designations'" :key="activeTab" />
            <SetWorkLocationsSection v-else-if="activeTab === 'work-locations'" :key="activeTab" />
            <SetEmploymentTypesSection v-else-if="activeTab === 'employment-types'" :key="activeTab" />
            <SetEmployeeCategoriesSection v-else-if="activeTab === 'employee-categories'" :key="activeTab" />
            <SetSeparationReasonsSection v-else-if="activeTab === 'separation-reasons'" :key="activeTab" />
            <SetRecruitmentSection v-else-if="activeTab === 'recruitment'" :key="activeTab" @go="selectTab" />
            <SetOnboardingSection v-else-if="activeTab === 'onboarding'" :key="activeTab" @go="selectTab" />
            <SetTrainingSection v-else-if="activeTab === 'training'" :key="activeTab" @go="selectTab" />
            <SetAssetCategoriesSection v-else-if="activeTab === 'asset-categories'" :key="activeTab" />
            <SetAssetTypesSection v-else-if="activeTab === 'asset-types'" :key="activeTab" />
            <MasterManager v-else-if="masterDomain" :key="activeTab" :domain="masterDomain" />
            <SetComplianceSection v-else-if="activeTab === 'compliance'" :key="activeTab" />
            <SetNotificationRulesSection v-else-if="activeTab === 'notification-rules'" :key="activeTab" />
            <SetApprovalWorkflowsSection v-else-if="activeTab === 'approval-workflows'" :key="activeTab" @go="selectTab" />
            <SetNumberingSeriesSection v-else-if="activeTab === 'numbering-series'" :key="activeTab" />
            <SetPayrollRulesSection v-else-if="activeTab === 'payroll-rules'" :key="activeTab" />
            <SetAppraisalTemplatesSection v-else-if="activeTab === 'appraisal-templates'" :key="activeTab" />
            <SetMeritPolicySection v-else-if="activeTab === 'merit-policy'" :key="activeTab" @go="selectTab" />
            <SetAuditLogsSection v-else-if="activeTab === 'audit-logs'" :key="activeTab" />
            <SetSectionStub v-else :key="activeTab" :domain="currentDomain" />
          </section>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import '@/styles/hr-settings-theme.css'
import SectionRail from '@/components/hr/SectionRail.vue'
import SetDashboardSection from './sections/SetDashboardSection.vue'
import MasterManager from './components/MasterManager.vue'
import SetDepartmentsSection from './sections/SetDepartmentsSection.vue'
import SetGradesSection from './sections/SetGradesSection.vue'
import SetDesignationsSection from './sections/SetDesignationsSection.vue'
import SetWorkLocationsSection from './sections/SetWorkLocationsSection.vue'
import SetEmploymentTypesSection from './sections/SetEmploymentTypesSection.vue'
import SetEmployeeCategoriesSection from './sections/SetEmployeeCategoriesSection.vue'
import SetSeparationReasonsSection from './sections/SetSeparationReasonsSection.vue'
import SetRecruitmentSection from './sections/SetRecruitmentSection.vue'
import SetOnboardingSection from './sections/SetOnboardingSection.vue'
import SetTrainingSection from './sections/SetTrainingSection.vue'
import SetAssetCategoriesSection from './sections/SetAssetCategoriesSection.vue'
import SetAssetTypesSection from './sections/SetAssetTypesSection.vue'
import SetComplianceSection from './sections/SetComplianceSection.vue'
import SetNotificationRulesSection from './sections/SetNotificationRulesSection.vue'
import SetApprovalWorkflowsSection from './sections/SetApprovalWorkflowsSection.vue'
import SetNumberingSeriesSection from './sections/SetNumberingSeriesSection.vue'
import SetPayrollRulesSection from './sections/SetPayrollRulesSection.vue'
import SetAppraisalTemplatesSection from './sections/SetAppraisalTemplatesSection.vue'
import SetMeritPolicySection from './sections/SetMeritPolicySection.vue'
import SetAuditLogsSection from './sections/SetAuditLogsSection.vue'
import SetSectionStub from './components/SetSectionStub.vue'
import { DOMAINS, DOMAIN_BY_SLUG, RAIL_GROUP_ORDER } from './components/connectivity'
import { MASTER_DOMAINS } from './components/masterDomains'

const route = useRoute()
const router = useRouter()

const TAB_KEYS = DOMAINS.map(d => d.slug)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const railCollapsed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('hr.settings.rail.collapsed') === '1'
)
const toggleRail = () => {
  railCollapsed.value = !railCollapsed.value
  try { localStorage.setItem('hr.settings.rail.collapsed', railCollapsed.value ? '1' : '0') } catch {}
}

const selectTab = (payload) => {
  const key = typeof payload === 'string' ? payload : payload?.tab
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrSettingsTab', params: { tab: key } })
}
const onRailSelect = (key) => selectTab(key)

watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TAB_KEYS.indexOf(t) >= TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})

const currentDomain = computed(() => DOMAIN_BY_SLUG[activeTab.value] || DOMAIN_BY_SLUG.dashboard)
const masterDomain = computed(() => MASTER_DOMAINS[activeTab.value] || null)

const railGroups = computed(() => {
  const groups = {}
  for (const g of RAIL_GROUP_ORDER) groups[g] = { title: g, items: [] }
  for (const d of DOMAINS) {
    if (!groups[d.group]) groups[d.group] = { title: d.group, items: [] }
    groups[d.group].items.push({ key: d.slug, label: d.label, icon: d.icon })
  }
  return RAIL_GROUP_ORDER.map(g => groups[g]).filter(g => g && g.items.length)
})
</script>

<style scoped>
.hr-workspace { display: flex; flex-direction: column; height: 100%; min-height: calc(100vh - 100px);
  background: transparent; color: var(--set-text); }
.ws-body { display: flex; align-items: flex-start; gap: 0; }
.ws-canvas { flex: 1; min-width: 0; padding: 16px 4px 32px 8px; }
.canvas-section { min-height: 100%; }

.set-slide-forward-enter-active, .set-slide-forward-leave-active,
.set-slide-back-enter-active, .set-slide-back-leave-active {
  transition: opacity 0.28s var(--set-spring), transform 0.28s var(--set-spring);
}
.set-slide-forward-enter-from { opacity: 0; transform: translateX(18px); }
.set-slide-forward-leave-to { opacity: 0; transform: translateX(-14px); }
.set-slide-back-enter-from { opacity: 0; transform: translateX(-18px); }
.set-slide-back-leave-to { opacity: 0; transform: translateX(14px); }

@media (max-width: 900px) { .ws-canvas { padding: 16px 12px 24px; } }
@media (prefers-reduced-motion: reduce) {
  .set-slide-forward-enter-active, .set-slide-forward-leave-active,
  .set-slide-back-enter-active, .set-slide-back-leave-active { transition: opacity 0.2s; }
  .set-slide-forward-enter-from, .set-slide-back-enter-from { transform: none; }
}
</style>
