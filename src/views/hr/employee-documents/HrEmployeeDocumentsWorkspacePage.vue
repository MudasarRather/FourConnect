<template>
  <div class="edoc-root edoc-workspace">
    <EdocHeroCanvas :metrics="heroMetrics" :loading="loadingStats" @go="selectTab" />

    <div class="ws-body">
      <EdocTabBar v-model="activeTab" :tabs="tabsWithCounts" />

      <main class="edoc-canvas">
        <transition :name="`edoc-slide-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-inner">
            <EdocDashboardSection
              v-if="activeTab === 'dashboard'"
              :data="dashboard" :loading="loadingStats" @go="selectTab"
            />
            <EdocDocumentsSection
              v-else-if="categoryForTab[activeTab]"
              :key="activeTab" :category="categoryForTab[activeTab]"
              @refresh-counts="loadDashboard"
            />
            <EdocVerificationSection
              v-else-if="activeTab === 'verification'"
              @refresh-counts="loadDashboard"
            />
            <EdocRequestsSection v-else-if="activeTab === 'requests'" />
            <EdocExpirySection v-else-if="activeTab === 'expiry'" />
            <EdocTemplatesSection v-else-if="activeTab === 'templates'" />
            <EdocReportsSection v-else-if="activeTab === 'reports'" />
            <EdocArchiveSection v-else-if="activeTab === 'archive'" />
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
  LayoutDashboard, IdCard, FileSignature, Award, ReceiptIndianRupee, ScrollText,
  Fingerprint, GraduationCap, ShieldCheck, ClipboardCheck, CalendarClock,
  LayoutTemplate, BarChart3, Archive, Files, FileX2, ShieldAlert,
  Inbox,
} from 'lucide-vue-next'

import '../../../styles/employee-documents-theme.css'

import EdocHeroCanvas from './components/EdocHeroCanvas.vue'
import EdocTabBar from './components/EdocTabBar.vue'
import EdocDashboardSection from './sections/EdocDashboardSection.vue'
import EdocDocumentsSection from './sections/EdocDocumentsSection.vue'
import EdocVerificationSection from './sections/EdocVerificationSection.vue'
import EdocExpirySection from './sections/EdocExpirySection.vue'
import EdocArchiveSection from './sections/EdocArchiveSection.vue'
import EdocTemplatesSection from './sections/EdocTemplatesSection.vue'
import EdocReportsSection from './sections/EdocReportsSection.vue'
import EdocRequestsSection from './sections/EdocRequestsSection.vue'

import { fetchEdocDashboard, fetchAdminRequests } from '@/composables/useEmployeeDocuments'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const { error } = useToast()

const TABS = [
  { key: 'dashboard',          label: 'Dashboard',          icon: LayoutDashboard,    group: 'overview' },
  { key: 'kyc',                label: 'KYC',                icon: IdCard,             group: 'docs' },
  { key: 'contracts',          label: 'Contracts',          icon: FileSignature,      group: 'docs' },
  { key: 'certificates',       label: 'Certificates',       icon: Award,              group: 'docs' },
  { key: 'salary-slips',       label: 'Salary Slips',       icon: ReceiptIndianRupee, group: 'docs' },
  { key: 'experience-letters', label: 'Experience Letters', icon: ScrollText,         group: 'docs' },
  { key: 'id-proofs',          label: 'ID Proofs',          icon: Fingerprint,        group: 'docs' },
  { key: 'education',          label: 'Education',          icon: GraduationCap,      group: 'docs' },
  { key: 'compliance',         label: 'Compliance',         icon: ShieldCheck,        group: 'docs' },
  { key: 'verification',       label: 'Verification',       icon: ClipboardCheck,     group: 'ops' },
  { key: 'requests',           label: 'Requests',           icon: Inbox,              group: 'ops' },
  { key: 'expiry',             label: 'Expiry Tracking',    icon: CalendarClock,      group: 'ops' },
  { key: 'templates',          label: 'Templates',          icon: LayoutTemplate,     group: 'system' },
  { key: 'reports',            label: 'Reports',            icon: BarChart3,          group: 'system' },
  { key: 'archive',            label: 'Archive',            icon: Archive,            group: 'system' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const categoryForTab = {
  kyc: 'KYC', contracts: 'CONTRACT', certificates: 'CERTIFICATE',
  'salary-slips': 'SALARY_SLIP', 'experience-letters': 'EXPERIENCE_LETTER',
  'id-proofs': 'ID_PROOF', education: 'EDUCATION', compliance: 'COMPLIANCE',
}

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrEmployeeDocumentsTab', params: { tab: key } })
}
watch(() => route.params.tab, (t) => {
  if (!t || !VALID.has(t)) return
  slideDir.value = TAB_KEYS.indexOf(t) >= TAB_KEYS.indexOf(activeTab.value) ? 'forward' : 'back'
  activeTab.value = t
})
watch(activeTab, (k) => {
  if (route.params.tab !== k && VALID.has(k)) router.replace({ name: 'HrEmployeeDocumentsTab', params: { tab: k } })
})

const dashboard = ref(null)
const loadingStats = ref(false)
const pendingRequestCount = ref(0)

const loadDashboard = async () => {
  loadingStats.value = true
  try {
    const [d, reqs] = await Promise.all([
      fetchEdocDashboard(),
      fetchAdminRequests({ status: 'PENDING', page: 1, limit: 1 }).catch(() => ({ total: 0 })),
    ])
    dashboard.value = d
    pendingRequestCount.value = reqs?.total || 0
  } catch (e) { error(e?.response?.data?.detail || 'Failed to load documents dashboard') }
  finally { loadingStats.value = false }
}

const tabsWithCounts = computed(() => {
  const d = dashboard.value || {}
  const counts = {
    verification: d.pending_verification,
    requests:     pendingRequestCount.value,
    expiry:       d.expiring_soon,
    archive:      d.archived_documents,
  }
  return TABS.map(t => (counts[t.key] ? { ...t, count: counts[t.key] } : t))
})

const heroMetrics = computed(() => {
  const d = dashboard.value || {}
  return [
    { key: 'total',      label: 'Total',      icon: Files,          value: d.total_documents || 0,     color: '#fbbf24', go: 'kyc' },
    { key: 'pending',    label: 'Pending',    icon: ClipboardCheck, value: d.pending_verification || 0, color: '#fb923c', go: 'verification' },
    { key: 'requests',   label: 'Requests',   icon: Inbox,          value: pendingRequestCount.value,  color: '#facc15', go: 'requests' },
    { key: 'expiring',   label: 'Expiring',   icon: CalendarClock,  value: d.expiring_soon || 0,        color: '#f59e0b', go: 'expiry' },
    { key: 'missing',    label: 'Missing',    icon: FileX2,         value: d.missing_documents || 0,    color: '#f87171', go: 'dashboard' },
    { key: 'archived',   label: 'Archived',   icon: Archive,        value: d.archived_documents || 0,   color: '#9ca3af', go: 'archive' },
  ]
})

onMounted(loadDashboard)
</script>

<style scoped>
@import '../../../styles/employee-documents-theme.css';

/* The workspace sits directly on the dashboard background — no painted surface here. */
.edoc-workspace {
  display: flex; flex-direction: column;
  min-height: calc(100vh - 100px);
  background: transparent;
}

.ws-body {
  display: flex;
  align-items: flex-start;
  gap: 0;
  /* Important: no flex:1 or min-height:0 here so the rail's `position: sticky`
     anchors to the window scroll, not to a captive inner scroller. */
}

.edoc-canvas {
  flex: 1;
  min-width: 0;
  padding: 12px 4px 28px 8px;
}
.canvas-inner { min-height: 360px; }

.edoc-slide-forward-enter-active, .edoc-slide-forward-leave-active,
.edoc-slide-back-enter-active, .edoc-slide-back-leave-active {
  transition: opacity 0.26s var(--edoc-spring), transform 0.26s var(--edoc-spring);
}
.edoc-slide-forward-enter-from { opacity: 0; transform: translateX(16px); }
.edoc-slide-forward-leave-to   { opacity: 0; transform: translateX(-12px); }
.edoc-slide-back-enter-from     { opacity: 0; transform: translateX(-16px); }
.edoc-slide-back-leave-to       { opacity: 0; transform: translateX(12px); }

@media (max-width: 900px) {
  .ws-body { flex-direction: column; }
  .edoc-canvas { padding: 14px 12px 24px; }
}
</style>
