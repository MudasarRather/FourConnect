<template>
  <div class="perf-workspace perf-scope">
    <div class="pw-body">
      <SectionRail :model-value="activeTab" :groups="railGroups" :collapsed="railCollapsed" title="Performance"
        @update:model-value="selectTab" @toggle-collapsed="toggleRail" />

      <main class="pw-canvas">
        <transition :name="`perf-slide-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="pw-section">
            <PerfDashboardSection v-if="activeTab === 'dashboard'" @go="selectTab" />
            <PerfInsightsSection v-else-if="activeTab === 'insights'" :key="'insights'" @go="selectTab" />
            <PerfReviewsSection v-else-if="activeTab === 'reviews'" :key="'reviews'" @go="selectTab" />
            <PerfCyclesSection v-else-if="activeTab === 'cycles'" :key="'cycles'" @go="selectTab" />
            <PerfCalibrationSection v-else-if="activeTab === 'calibration'" :key="'calibration'" @go="selectTab" />
            <PerfMeritSection v-else-if="activeTab === 'merit'" :key="'merit'" @go="selectTab" />
            <PerfGoalsSection v-else-if="activeTab === 'goals'" :key="'goals'" @go="selectTab" />
            <PerfFeedbackSection v-else-if="activeTab === 'feedback'" :key="'feedback'" @go="selectTab" />
            <PerfPipSection v-else-if="activeTab === 'pips'" :key="'pips'" @go="selectTab" />
          </section>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/styles/performance-theme.css'
import SectionRail from '@/components/hr/SectionRail.vue'
import PerfDashboardSection from './sections/PerfDashboardSection.vue'
import PerfInsightsSection from './sections/PerfInsightsSection.vue'
import PerfReviewsSection from './sections/PerfReviewsSection.vue'
import PerfCyclesSection from './sections/PerfCyclesSection.vue'
import PerfCalibrationSection from './sections/PerfCalibrationSection.vue'
import PerfMeritSection from './sections/PerfMeritSection.vue'
import PerfGoalsSection from './sections/PerfGoalsSection.vue'
import PerfFeedbackSection from './sections/PerfFeedbackSection.vue'
import PerfPipSection from './sections/PerfPipSection.vue'
import { PERFORMANCE_TABS, PERFORMANCE_TAB_KEYS, PERFORMANCE_GROUPS } from '@/composables/usePerformance'

const route = useRoute()
const router = useRouter()
const VALID = new Set(PERFORMANCE_TAB_KEYS)
const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const railCollapsed = ref(typeof localStorage !== 'undefined' && localStorage.getItem('hr.perf.rail.collapsed') === '1')
const toggleRail = () => { railCollapsed.value = !railCollapsed.value; try { localStorage.setItem('hr.perf.rail.collapsed', railCollapsed.value ? '1' : '0') } catch {} }

const selectTab = (payload) => {
  const key = typeof payload === 'string' ? payload : payload?.tab
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrPerformanceTab', params: { tab: key } })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = PERFORMANCE_TAB_KEYS.indexOf(t) >= PERFORMANCE_TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})

const railGroups = computed(() => {
  const groups = {}
  for (const g of PERFORMANCE_GROUPS) groups[g.key] = { title: g.title, items: [] }
  for (const t of PERFORMANCE_TABS) {
    if (!groups[t.group]) groups[t.group] = { title: t.group, items: [] }
    groups[t.group].items.push({ key: t.key, label: t.label, icon: t.icon })
  }
  return PERFORMANCE_GROUPS.map(g => groups[g.key]).filter(g => g && g.items.length)
})
</script>

<style scoped>
.perf-workspace { display: flex; flex-direction: column; height: 100%; min-height: calc(100vh - 100px); background: transparent; color: var(--perf-text); }
.pw-body { display: flex; align-items: flex-start; gap: 0; }
.pw-canvas { flex: 1; min-width: 0; padding: 16px 4px 32px 8px; }
.pw-section { min-height: 100%; }
.perf-slide-forward-enter-active, .perf-slide-forward-leave-active, .perf-slide-back-enter-active, .perf-slide-back-leave-active {
  transition: opacity 0.28s var(--perf-spring), transform 0.28s var(--perf-spring); }
.perf-slide-forward-enter-from { opacity: 0; transform: translateX(18px); }
.perf-slide-forward-leave-to { opacity: 0; transform: translateX(-14px); }
.perf-slide-back-enter-from { opacity: 0; transform: translateX(-18px); }
.perf-slide-back-leave-to { opacity: 0; transform: translateX(14px); }
@media (max-width: 900px) { .pw-canvas { padding: 16px 12px 24px; } }
@media (prefers-reduced-motion: reduce) {
  .perf-slide-forward-enter-active, .perf-slide-forward-leave-active, .perf-slide-back-enter-active, .perf-slide-back-leave-active { transition: opacity 0.2s; }
  .perf-slide-forward-enter-from, .perf-slide-back-enter-from { transform: none; }
}
</style>
