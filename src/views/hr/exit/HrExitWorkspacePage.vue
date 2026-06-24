<template>
  <div class="hr-workspace">
    <div class="ws-body">
      <SectionRail
        :model-value="activeTab"
        :groups="railGroups"
        :collapsed="railCollapsed"
        title="Exit"
        @update:model-value="onRailSelect"
        @toggle-collapsed="toggleRail"
      />

      <main class="ws-canvas">
        <transition :name="`ex-slide-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-section">
            <ExDashboardSection v-if="activeTab === 'dashboard'" :stats="stats" :loading="loadingStats"
              @go="selectTab" @refresh="loadStats" />
            <ExResignationSection v-else-if="activeTab === 'resignation'" :initial-filter="pendingFilter"
              @go="selectTab" @refresh-stats="loadStats" @consumed="pendingFilter = null" />
            <ExNoticeSection v-else-if="activeTab === 'notice'" :initial-filter="pendingFilter"
              @go="selectTab" @refresh-stats="loadStats" @consumed="pendingFilter = null" />
            <ExInterviewsSection v-else-if="activeTab === 'interviews'" @go="selectTab" @refresh-stats="loadStats" />
            <ExClearanceSection v-else-if="activeTab === 'clearance'" @go="selectTab" @refresh-stats="loadStats" />
            <ExAssetReturnSection v-else-if="activeTab === 'asset-return'" @go="selectTab" @refresh-stats="loadStats" />
            <ExSettlementSection v-else-if="activeTab === 'settlement'" @go="selectTab" @refresh-stats="loadStats" />
            <ExLetterSection v-else-if="activeTab === 'experience-letter'" letter-type="experience-letter"
              @go="selectTab" @refresh-stats="loadStats" />
            <ExRelievingSection v-else-if="activeTab === 'relieving-letter'"
              @go="selectTab" @refresh-stats="loadStats" />
            <ExPoliciesSection v-else-if="activeTab === 'policies'" @go="selectTab" />
            <ExReportsSection v-else-if="activeTab === 'reports'" @go="selectTab" />
            <ExAuditLogsSection v-else-if="activeTab === 'audit-logs'" @go="selectTab" />
            <ExSectionStub v-else :icon="stubMeta.icon" :eyebrow="stubMeta.eyebrow"
              :title="stubMeta.title" :accent="stubMeta.accent" :subtitle="stubMeta.subtitle" />
          </section>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  LayoutDashboard, DoorOpen, CalendarClock, MessagesSquare, ClipboardCheck,
  PackageCheck, Scale, ScrollText, BadgeCheck, FileBadge, FileBarChart2, History,
} from 'lucide-vue-next'

import '@/styles/exit-theme.css'
import SectionRail from '@/components/hr/SectionRail.vue'
import ExDashboardSection from './sections/ExDashboardSection.vue'
import ExResignationSection from './sections/ExResignationSection.vue'
import ExNoticeSection from './sections/ExNoticeSection.vue'
import ExInterviewsSection from './sections/ExInterviewsSection.vue'
import ExClearanceSection from './sections/ExClearanceSection.vue'
import ExAssetReturnSection from './sections/ExAssetReturnSection.vue'
import ExSettlementSection from './sections/ExSettlementSection.vue'
import ExLetterSection from './sections/ExLetterSection.vue'
import ExRelievingSection from './sections/ExRelievingSection.vue'
import ExPoliciesSection from './sections/ExPoliciesSection.vue'
import ExReportsSection from './sections/ExReportsSection.vue'
import ExAuditLogsSection from './sections/ExAuditLogsSection.vue'
import ExSectionStub from './components/ExSectionStub.vue'
import { fetchStats, errText } from '@/composables/useExit'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Command', accent: 'Threshold' },
  { key: 'resignation', label: 'Resignation', icon: DoorOpen, group: 'Separation', accent: 'Ledger' },
  { key: 'notice', label: 'Notice Period', icon: CalendarClock, group: 'Separation', accent: 'Countdown' },
  { key: 'interviews', label: 'Exit Interviews', icon: MessagesSquare, group: 'Separation', accent: 'Insights' },
  { key: 'clearance', label: 'Clearance', icon: ClipboardCheck, group: 'Offboarding', accent: 'Gatehouse' },
  { key: 'asset-return', label: 'Asset Return', icon: PackageCheck, group: 'Offboarding', accent: 'Recovery' },
  { key: 'settlement', label: 'Final Settlement', icon: Scale, group: 'Treasury', accent: 'F&F' },
  { key: 'experience-letter', label: 'Experience Letter', icon: ScrollText, group: 'Documents', accent: 'Seal' },
  { key: 'relieving-letter', label: 'Relieving Letter', icon: BadgeCheck, group: 'Documents', accent: 'Release' },
  { key: 'policies', label: 'Policies', icon: FileBadge, group: 'Configuration', accent: 'Charter' },
  { key: 'reports', label: 'Reports', icon: FileBarChart2, group: 'Insights', accent: 'Bureau' },
  { key: 'audit-logs', label: 'Audit logs', icon: History, group: 'Insights', accent: 'Recorder' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)
const TAB_BY_KEY = Object.fromEntries(TABS.map(t => [t.key, t]))

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')
const pendingFilter = ref(null)

const railCollapsed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('hr.exit.rail.collapsed') === '1'
)
const toggleRail = () => {
  railCollapsed.value = !railCollapsed.value
  try { localStorage.setItem('hr.exit.rail.collapsed', railCollapsed.value ? '1' : '0') } catch {}
}

const selectTab = (payload) => {
  const key = typeof payload === 'string' ? payload : payload?.tab
  if (!VALID.has(key)) return
  if (typeof payload === 'object' && payload.filter) pendingFilter.value = payload.filter
  if (key === activeTab.value) return
  router.replace({ name: 'HrExitTab', params: { tab: key } })
}
const onRailSelect = (key) => selectTab(key)

watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TAB_KEYS.indexOf(t) >= TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})

const stubMeta = computed(() => {
  const t = TAB_BY_KEY[activeTab.value] || {}
  return { icon: t.icon, eyebrow: `Exit Management · ${t.group || ''}`, title: t.label || 'Section',
    accent: t.accent || '', subtitle: '' }
})

const stats = ref(null)
const loadingStats = ref(false)
const loadStats = async () => {
  loadingStats.value = true
  try { stats.value = await fetchStats() }
  catch (e) { toast.error(errText(e, 'Failed to load exit stats')) }
  finally { loadingStats.value = false }
}
// Silent background refresh — keeps the dashboard live without flipping the
// loading flag or spamming toasts on a transient network blip (the last good
// snapshot is kept on error).
const refreshStatsSilently = async () => {
  try { stats.value = await fetchStats() } catch { /* keep last good snapshot */ }
}

// ── keep the Command dashboard live ──────────────────────────────────────────
// Stats load once on mount (this also feeds the rail badges on every tab). On
// top of that, while the Dashboard tab is active we (a) re-fetch on entry,
// (b) poll every 30s, and (c) re-fetch when the window regains focus — so cases
// advanced elsewhere (self-service, a manager's login, the cron) appear without
// a manual Refresh. The poll skips ticks while the browser tab is hidden.
const POLL_MS = 30000
let pollId = null
const stopPoll = () => { if (pollId) { clearInterval(pollId); pollId = null } }
const startPoll = () => {
  stopPoll()
  pollId = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') refreshStatsSilently()
  }, POLL_MS)
}
const onWindowFocus = () => { if (activeTab.value === 'dashboard') refreshStatsSilently() }

watch(activeTab, (t) => {
  if (t === 'dashboard') { refreshStatsSilently(); startPoll() }
  else stopPoll()
})

const railGroups = computed(() => {
  const kp = stats.value?.kpis || {}
  const counts = {
    resignation: kp.active_resignations, notice: kp.serving_notice,
    clearance: kp.pending_clearances, settlement: kp.pending_settlements,
    interviews: kp.pending_interviews,
  }
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

onMounted(() => {
  loadStats()
  if (activeTab.value === 'dashboard') startPoll()
  if (typeof window !== 'undefined') window.addEventListener('focus', onWindowFocus)
})
onBeforeUnmount(() => {
  stopPoll()
  if (typeof window !== 'undefined') window.removeEventListener('focus', onWindowFocus)
})
</script>

<style scoped>
.hr-workspace { display: flex; flex-direction: column; height: 100%; min-height: calc(100vh - 100px);
  background: transparent; color: var(--ex-text); }
.ws-body { display: flex; align-items: flex-start; gap: 0; }
.ws-canvas { flex: 1; min-width: 0; padding: 16px 4px 32px 8px; }
.canvas-section { min-height: 100%; }

.ex-slide-forward-enter-active, .ex-slide-forward-leave-active,
.ex-slide-back-enter-active, .ex-slide-back-leave-active {
  transition: opacity 0.28s var(--ex-spring), transform 0.28s var(--ex-spring);
}
.ex-slide-forward-enter-from { opacity: 0; transform: translateX(18px); }
.ex-slide-forward-leave-to { opacity: 0; transform: translateX(-14px); }
.ex-slide-back-enter-from { opacity: 0; transform: translateX(-18px); }
.ex-slide-back-leave-to { opacity: 0; transform: translateX(14px); }

@media (max-width: 900px) { .ws-canvas { padding: 16px 12px 24px; } }
@media (prefers-reduced-motion: reduce) {
  .ex-slide-forward-enter-active, .ex-slide-forward-leave-active,
  .ex-slide-back-enter-active, .ex-slide-back-leave-active { transition: opacity 0.2s; }
  .ex-slide-forward-enter-from, .ex-slide-back-enter-from { transform: none; }
}
</style>
