<template>
  <div class="trn-root">
    <div class="trn-shell">
      <TrnObservatoryRail v-model="activeTab" :tabs="TABS" :groups="GROUPS" :counts="tabCounts" />

      <div class="trn-main">
        <main class="trn-canvas">
          <transition :name="`trn-slide-${slideDir}`" mode="out-in">
            <section :key="activeTab" class="canvas-inner">
              <TrnDashboardSection      v-if="activeTab === 'dashboard'"            :stats="stats" :loading="loadingStats" @go="selectTab" @refresh="loadStats" />
              <TrnProgramsSection       v-else-if="activeTab === 'programs'"        @refresh-stats="onMutate" @go="selectTab" />
              <TrnTrainersSection       v-else-if="activeTab === 'trainers'"        @refresh-stats="onMutate" />
              <TrnMaterialsSection      v-else-if="activeTab === 'materials'"       @refresh-stats="onMutate" />
              <TrnEnrollmentSection     v-else-if="activeTab === 'enrollment'"      @refresh-stats="onMutate" />
              <TrnSkillMatrixSection    v-else-if="activeTab === 'skill-matrix'"    @refresh-stats="onMutate" @go="selectTab" />
              <TrnCertificationsSection v-else-if="activeTab === 'certifications'"  @refresh-stats="onMutate" @go="selectTab" />
              <TrnCertExpirySection     v-else-if="activeTab === 'certification-expiry'" @refresh-stats="onMutate" @go="selectTab" />
              <TrnComplianceSection     v-else-if="activeTab === 'compliance'"      @refresh-stats="onMutate" @go="selectTab" />
              <TrnRequestsSection       v-else-if="activeTab === 'requests'"        @refresh-stats="onMutate" @go="selectTab" />
              <TrnFeedbackSection       v-else-if="activeTab === 'feedback'"        @go="selectTab" />
              <TrnAssessmentsSection    v-else-if="activeTab === 'assessments'"  @refresh-stats="onMutate" @go="selectTab" />
              <TrnCalendarSection       v-else-if="activeTab === 'calendar'"     @go="selectTab" />
              <TrnBudgetSection         v-else-if="activeTab === 'budget'"       @refresh-stats="onMutate" @go="selectTab" />
              <TrnReportsSection        v-else-if="activeTab === 'reports'" @go="selectTab" />
              <TrnAuditLogsSection      v-else-if="activeTab === 'audit-logs'" @go="selectTab" />
              <TrnComingSoonSection     v-else :section-key="activeTab" :teaser="comingSoonTeaser" />
            </section>
          </transition>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import '@/styles/training-theme.css'

import TrnObservatoryRail from './components/TrnObservatoryRail.vue'
import TrnComingSoonSection from './components/TrnComingSoonSection.vue'
import TrnDashboardSection from './sections/TrnDashboardSection.vue'
import TrnProgramsSection from './sections/TrnProgramsSection.vue'
import TrnTrainersSection from './sections/TrnTrainersSection.vue'
import TrnMaterialsSection from './sections/TrnMaterialsSection.vue'
import TrnEnrollmentSection from './sections/TrnEnrollmentSection.vue'
import TrnSkillMatrixSection from './sections/TrnSkillMatrixSection.vue'
import TrnCertificationsSection from './sections/TrnCertificationsSection.vue'
import TrnCertExpirySection from './sections/TrnCertExpirySection.vue'
import TrnComplianceSection from './sections/TrnComplianceSection.vue'
import TrnRequestsSection from './sections/TrnRequestsSection.vue'
import TrnFeedbackSection from './sections/TrnFeedbackSection.vue'
import TrnAssessmentsSection from './sections/TrnAssessmentsSection.vue'
import TrnCalendarSection from './sections/TrnCalendarSection.vue'
import TrnBudgetSection from './sections/TrnBudgetSection.vue'
import TrnReportsSection from './sections/TrnReportsSection.vue'
import TrnAuditLogsSection from './sections/TrnAuditLogsSection.vue'

import { TRAINING_TABS, TRAINING_TAB_KEYS, TRAINING_GROUPS, fetchTrainingStats } from '@/composables/useTraining'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = TRAINING_TABS
const GROUPS = TRAINING_GROUPS
const VALID = new Set(TRAINING_TAB_KEYS)
const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (payload) => {
  // payload is either a tab key string, or { tab, programId, programName } for
  // deep-links that carry filter context (e.g. "Manage enrollees" → enrollment).
  const key = typeof payload === 'string' ? payload : payload?.tab
  if (!VALID.has(key)) return
  const query = {}
  if (payload && typeof payload === 'object') {
    if (payload.programId) query.program = payload.programId
    if (payload.programName) query.programName = payload.programName
  }
  if (key === activeTab.value && !Object.keys(query).length) return
  router.replace({ name: 'HrTrainingTab', params: { tab: key }, query })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TRAINING_TAB_KEYS.indexOf(t) >= TRAINING_TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})
watch(activeTab, (key) => {
  if (VALID.has(key) && route.params.tab !== key) {
    router.replace({ name: 'HrTrainingTab', params: { tab: key } })
  }
})

const stats = ref({})
const loadingStats = ref(false)
const loadStats = async () => {
  loadingStats.value = true
  try { stats.value = await fetchTrainingStats() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load training stats') }
  finally { loadingStats.value = false }
}
const onMutate = () => { loadStats() }
onMounted(loadStats)

const tabCounts = computed(() => ({
  requests: stats.value.pending_requests || null,
  'certification-expiry': stats.value.certs_expiring_90 || null,
  enrollment: stats.value.active_assignments || null,
}))

const comingSoonTeaser = computed(() => {
  const s = stats.value || {}
  switch (activeTab.value) {
    case 'assessments': return s.completed_count ?? null
    case 'budget': return s.total_programs ?? null
    case 'calendar': return (s.upcoming_trainings || 0) + (s.certs_expiring_90 || 0)
    case 'reports': return s.completed_count ?? null
    default: return null
  }
})
</script>

<style scoped>
.trn-root { min-height: 100%; padding: 16px 20px 60px; color: var(--trn-text); background: var(--trn-canvas); }
.trn-shell { display: flex; align-items: flex-start; gap: 18px; }
.trn-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.canvas-inner { will-change: transform, opacity; min-height: 420px; }
@media (max-width: 900px) { .trn-shell { flex-direction: column; gap: 12px; } }

.trn-slide-forward-enter-active, .trn-slide-back-enter-active,
.trn-slide-forward-leave-active, .trn-slide-back-leave-active {
  transition: opacity 0.26s var(--trn-ease), transform 0.26s var(--trn-ease);
}
.trn-slide-forward-enter-from { opacity: 0; transform: translateX(22px); }
.trn-slide-forward-leave-to { opacity: 0; transform: translateX(-22px); }
.trn-slide-back-enter-from { opacity: 0; transform: translateX(-22px); }
.trn-slide-back-leave-to { opacity: 0; transform: translateX(22px); }
@media (prefers-reduced-motion: reduce) {
  .trn-slide-forward-enter-active, .trn-slide-back-enter-active,
  .trn-slide-forward-leave-active, .trn-slide-back-leave-active { transition: opacity 0.2s; }
  .trn-slide-forward-enter-from, .trn-slide-back-enter-from,
  .trn-slide-forward-leave-to, .trn-slide-back-leave-to { transform: none; }
}
</style>
