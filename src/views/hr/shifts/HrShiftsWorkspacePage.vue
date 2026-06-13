<template>
  <div class="shift-root">
    <div class="shift-shell">
      <ShiftTowerRail v-model="activeTab" :tabs="TABS" :groups="GROUPS" :counts="tabCounts" />

      <div class="shift-main">
        <ShiftHeroCanvas v-if="activeTab === 'dashboard'" :stats="stats" :arcs="arcs" @go="selectTab" />

        <main class="shift-canvas">
          <transition :name="`shift-slide-${slideDir}`" mode="out-in">
            <section :key="activeTab" class="canvas-inner">
              <ShiftDashboardSection   v-if="activeTab === 'dashboard'"   :stats="stats" :loading="loadingStats" @go="selectTab" @refresh="loadDashboard" />
              <ShiftManagementSection  v-else-if="activeTab === 'management'"  @refresh-stats="onMutate" />
              <ShiftAssignmentSection  v-else-if="activeTab === 'assignment'"  @refresh-stats="onMutate" />
              <ShiftRotationSection    v-else-if="activeTab === 'rotation'"    @refresh-stats="onMutate" />
              <ShiftRostersSection     v-else-if="activeTab === 'rosters'"     @refresh-stats="onMutate" />
              <ShiftCalendarSection    v-else-if="activeTab === 'calendar'" />
              <ShiftCoverageSection    v-else-if="activeTab === 'coverage'"    @refresh-stats="onMutate" />
              <ShiftOvertimeRulesSection v-else-if="activeTab === 'overtime-rules'" @refresh-stats="onMutate" />
              <ShiftSwapSection          v-else-if="activeTab === 'swap'" @refresh-stats="onMutate" />
              <ShiftHolidaySection       v-else-if="activeTab === 'holidays'" @refresh-stats="onMutate" />
              <ShiftNightSection         v-else-if="activeTab === 'night'" />
              <ShiftWorkforceSection     v-else-if="activeTab === 'workforce'" @refresh-stats="onMutate" />
              <ShiftReportsSection     v-else-if="activeTab === 'reports'" />
              <ShiftAuditLogsSection   v-else-if="activeTab === 'audit-logs'" />
              <ShiftComingSoonSection  v-else :section-key="activeTab" />
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

import '@/styles/shifts-theme.css'

import ShiftTowerRail from './components/ShiftTowerRail.vue'
import ShiftHeroCanvas from './components/ShiftHeroCanvas.vue'
import ShiftDashboardSection from './sections/ShiftDashboardSection.vue'
import ShiftManagementSection from './sections/ShiftManagementSection.vue'
import ShiftAssignmentSection from './sections/ShiftAssignmentSection.vue'
import ShiftRotationSection from './sections/ShiftRotationSection.vue'
import ShiftRostersSection from './sections/ShiftRostersSection.vue'
import ShiftCalendarSection from './sections/ShiftCalendarSection.vue'
import ShiftCoverageSection from './sections/ShiftCoverageSection.vue'
import ShiftReportsSection from './sections/ShiftReportsSection.vue'
import ShiftAuditLogsSection from './sections/ShiftAuditLogsSection.vue'
import ShiftOvertimeRulesSection from './sections/ShiftOvertimeRulesSection.vue'
import ShiftSwapSection from './sections/ShiftSwapSection.vue'
import ShiftHolidaySection from './sections/ShiftHolidaySection.vue'
import ShiftNightSection from './sections/ShiftNightSection.vue'
import ShiftWorkforceSection from './sections/ShiftWorkforceSection.vue'
import ShiftComingSoonSection from './components/ShiftComingSoonSection.vue'

import {
  SHIFT_TABS, SHIFT_TAB_KEYS, SHIFT_GROUPS, shiftTypeMeta,
  fetchShiftStats, fetchShifts,
} from '@/composables/useShifts'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = SHIFT_TABS
const GROUPS = SHIFT_GROUPS
const VALID = new Set(SHIFT_TAB_KEYS)
const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrShiftsTab', params: { tab: key } })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = SHIFT_TAB_KEYS.indexOf(t) >= SHIFT_TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})
watch(activeTab, (key) => {
  if (VALID.has(key) && route.params.tab !== key) {
    router.replace({ name: 'HrShiftsTab', params: { tab: key } })
  }
})

// dashboard stats + shift arcs for the hero dial
const stats = ref(null)
const loadingStats = ref(false)
const shiftsList = ref([])

const arcs = computed(() => shiftsList.value.slice(0, 8).map(s => ({
  start_time: (s.start_time || '').slice(0, 5),
  end_time: (s.end_time || '').slice(0, 5),
  color: shiftTypeMeta(s.shift_type).color,
  label: `${s.name} (${s.code})`,
})))

const tabCounts = computed(() => ({
  management: shiftsList.value.length || null,
}))

const loadDashboard = async () => {
  loadingStats.value = true
  try { stats.value = await fetchShiftStats() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load shift stats') }
  finally { loadingStats.value = false }
}
const loadShifts = async () => {
  try { const d = await fetchShifts({ limit: 100 }); shiftsList.value = d.items || [] }
  catch { shiftsList.value = [] }
}
const onMutate = () => { loadDashboard(); loadShifts() }

onMounted(() => { loadDashboard(); loadShifts() })
</script>

<style scoped>
.shift-root { min-height: 100%; padding: 16px 20px 60px; color: var(--shift-text); background: var(--shift-canvas); }
.shift-shell { display: flex; align-items: flex-start; gap: 18px; }
.shift-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.shift-canvas { margin-top: 0; }
.canvas-inner { will-change: transform, opacity; min-height: 360px; }
@media (max-width: 900px) { .shift-shell { flex-direction: column; gap: 12px; } }

.shift-slide-forward-enter-active, .shift-slide-back-enter-active,
.shift-slide-forward-leave-active, .shift-slide-back-leave-active {
  transition: opacity 0.26s var(--shift-ease), transform 0.26s var(--shift-ease);
}
.shift-slide-forward-enter-from { opacity: 0; transform: translateX(22px); }
.shift-slide-forward-leave-to { opacity: 0; transform: translateX(-22px); }
.shift-slide-back-enter-from { opacity: 0; transform: translateX(-22px); }
.shift-slide-back-leave-to { opacity: 0; transform: translateX(22px); }
@media (prefers-reduced-motion: reduce) {
  .shift-slide-forward-enter-active, .shift-slide-back-enter-active,
  .shift-slide-forward-leave-active, .shift-slide-back-leave-active { transition: opacity 0.2s; }
  .shift-slide-forward-enter-from, .shift-slide-back-enter-from,
  .shift-slide-forward-leave-to, .shift-slide-back-leave-to { transform: none; }
}
</style>
