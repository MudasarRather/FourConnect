<template>
  <div class="att-workspace">
    <AttHeroCanvas
      :metrics="heroMetrics"
      :heatmap="dashboard.heatmap"
      :live-shift="liveShift"
      :reduced="reduced"
      @go="selectTab"
      @cell-click="onHeatmapCell"
    />

    <div class="ws-body">
      <AttTabBar v-model="activeTab" :tabs="dockTabs" />

      <main class="att-canvas">
        <transition :name="`canvas-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-inner">
            <AttDashboardSection
              v-if="activeTab === 'dashboard'"
              :stats="dashboard.stats"
              :live-shift="liveShift"
              :loading="loadingStats"
              @refresh="loadDashboard"
              @go="selectTab"
            />
            <AttDailySection
              v-else-if="activeTab === 'daily'"
              @refresh-stats="loadDashboard"
            />
            <AttCorrectionsSection
              v-else-if="activeTab === 'corrections'"
              @refresh-stats="loadDashboard"
            />
            <AttShiftsSection
              v-else-if="activeTab === 'shifts'"
              @refresh-stats="loadDashboard"
            />
            <AttWfhSection
              v-else-if="activeTab === 'wfh'"
              @refresh-stats="loadDashboard"
            />
            <AttHalfDaySection
              v-else-if="activeTab === 'half-day'"
              @refresh-stats="loadDashboard"
            />
            <AttExcessBreaksSection
              v-else-if="activeTab === 'excess-breaks'"
              @refresh-stats="loadDashboard"
            />
            <AttBiometricSection   v-else-if="activeTab === 'biometric'"   @refresh-stats="loadDashboard" />
            <AttPoliciesSection    v-else-if="activeTab === 'policies'"    @refresh-stats="loadDashboard" />
            <AttLateRulesSection   v-else-if="activeTab === 'late-rules'"  @refresh-stats="loadDashboard" />
            <AttOvertimeSection    v-else-if="activeTab === 'overtime'"    @refresh-stats="loadDashboard" />
            <AttRemoteSection      v-else-if="activeTab === 'remote'"      @refresh-stats="loadDashboard" />
            <AttGeoSection         v-else-if="activeTab === 'geo'"         @refresh-stats="loadDashboard" />
            <AttHolidaysSection    v-else-if="activeTab === 'holidays'"    @refresh-stats="loadDashboard" />
            <AttReportsSection     v-else-if="activeTab === 'reports'" />
            <AttLogsSection        v-else-if="activeTab === 'logs'" />
            <AttExceptionsSection  v-else-if="activeTab === 'exceptions'" />
          </section>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePreferredReducedMotion } from '@vueuse/core'
import { useToast } from 'vue-toastification'
import {
  LayoutDashboard, Fingerprint, Pencil, CalendarClock, Home,
  ScanFace, BookOpenCheck, Clock4, TimerReset, Globe,
  MapPin, PartyPopper, BarChart3, ScrollText, AlertTriangle,
  Users, Package, CheckCircle2, FileText, Gauge, ArrowUpRight,
  SunMedium, Coffee,
} from 'lucide-vue-next'

import AttHeroCanvas from './components/AttHeroCanvas.vue'
import AttTabBar from './components/AttTabBar.vue'
import AttDashboardSection from './sections/AttDashboardSection.vue'
import AttDailySection from './sections/AttDailySection.vue'
import AttCorrectionsSection from './sections/AttCorrectionsSection.vue'
import AttShiftsSection from './sections/AttShiftsSection.vue'
import AttWfhSection from './sections/AttWfhSection.vue'
import AttHalfDaySection from './sections/AttHalfDaySection.vue'
import AttExcessBreaksSection from './sections/AttExcessBreaksSection.vue'
import AttBiometricSection from './sections/AttBiometricSection.vue'
import AttPoliciesSection from './sections/AttPoliciesSection.vue'
import AttLateRulesSection from './sections/AttLateRulesSection.vue'
import AttOvertimeSection from './sections/AttOvertimeSection.vue'
import AttRemoteSection from './sections/AttRemoteSection.vue'
import AttGeoSection from './sections/AttGeoSection.vue'
import AttHolidaysSection from './sections/AttHolidaysSection.vue'
import AttReportsSection from './sections/AttReportsSection.vue'
import AttLogsSection from './sections/AttLogsSection.vue'
import AttExceptionsSection from './sections/AttExceptionsSection.vue'

import {
  fetchAttendanceStats, fetchHeatmap,
} from './composables/useAttendance'
import { API } from '@/utils/api'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const prefersReduced = usePreferredReducedMotion()
const reduced = computed(() => prefersReduced.value === 'reduce')

const TABS = [
  { key: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard, type: 'full' },
  { key: 'daily',       label: 'Daily',         icon: Fingerprint,     type: 'full' },
  { key: 'corrections', label: 'Corrections',   icon: Pencil,          type: 'full' },
  { key: 'shifts',      label: 'Shifts',        icon: CalendarClock,   type: 'full' },
  { key: 'wfh',         label: 'WFH',           icon: Home,            type: 'full' },
  { key: 'half-day',    label: 'Half-Day',      icon: SunMedium,       type: 'full' },
  { key: 'excess-breaks', label: 'Excess Breaks', icon: Coffee,        type: 'full' },
  { key: 'biometric',   label: 'Biometric',     icon: ScanFace,        type: 'placeholder' },
  { key: 'policies',    label: 'Policies',      icon: BookOpenCheck,   type: 'placeholder' },
  { key: 'late-rules',  label: 'Late Rules',    icon: Clock4,          type: 'placeholder' },
  { key: 'overtime',    label: 'Overtime',      icon: TimerReset,      type: 'placeholder' },
  { key: 'remote',      label: 'Remote',        icon: Globe,           type: 'placeholder' },
  { key: 'geo',         label: 'Geo Verify',    icon: MapPin,          type: 'placeholder' },
  { key: 'holidays',    label: 'Holidays',      icon: PartyPopper,     type: 'placeholder' },
  { key: 'reports',     label: 'Reports',       icon: BarChart3,       type: 'placeholder' },
  { key: 'logs',        label: 'Logs',          icon: ScrollText,      type: 'placeholder' },
  { key: 'exceptions',  label: 'Exceptions',    icon: AlertTriangle,   type: 'placeholder' },
]
const VALID = new Set(TABS.map(t => t.key))
const TAB_KEYS = TABS.map(t => t.key)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'dashboard')
const slideDir = ref('forward')

// AttTabBar expects { key, label, icon, count?, soon?, group? }. Map our
// internal `type === 'placeholder'` to `soon: true` so the dock surfaces
// the "in development" indicator.
const dockTabs = computed(() =>
  TABS.map(t => ({ ...t, soon: t.type === 'placeholder' }))
)

const selectTab = (key) => {
  if (!VALID.has(key) || key === activeTab.value) return
  router.replace({ name: 'HrAttendanceTab', params: { tab: key } })
}

watch(() => route.params.tab, (newTab) => {
  if (!newTab || !VALID.has(newTab)) return
  const prevIdx = TAB_KEYS.indexOf(activeTab.value)
  const nextIdx = TAB_KEYS.indexOf(newTab)
  slideDir.value = nextIdx >= prevIdx ? 'forward' : 'back'
  activeTab.value = newTab
  if (newTab === 'dashboard') loadDashboard()
})
watch(activeTab, (key) => {
  if (route.params.tab !== key && VALID.has(key)) {
    router.replace({ name: 'HrAttendanceTab', params: { tab: key } })
  }
})

const dashboard = reactive({
  stats: null,
  heatmap: { cells: [] },
})
const liveShift = ref(null)
const loadingStats = ref(false)

const PLACEHOLDER_META = {
  biometric:   { title: 'Biometric Sync',         eyebrow: 'Hardware integrations', icon: ScanFace },
  policies:    { title: 'Attendance Policies',    eyebrow: 'Grace · OT · Late',     icon: BookOpenCheck },
  'late-rules':{ title: 'Late Coming Rules',      eyebrow: 'Threshold + deductions', icon: Clock4 },
  overtime:    { title: 'Overtime Workflow',      eyebrow: 'Approval → payroll',    icon: TimerReset },
  remote:      { title: 'Remote Attendance',      eyebrow: 'Field staff · GPS',     icon: Globe },
  geo:         { title: 'Geo Verification',       eyebrow: 'Geo-fences · radius',   icon: MapPin },
  holidays:    { title: 'Holiday Calendar',       eyebrow: 'National + regional',   icon: PartyPopper },
  reports:     { title: 'Attendance Reports',     eyebrow: 'Exports · analytics',   icon: BarChart3 },
  logs:        { title: 'Audit Logs',             eyebrow: 'Immutable trail',       icon: ScrollText },
  exceptions:  { title: 'Exceptions & Violations', eyebrow: 'Anomaly intelligence',  icon: AlertTriangle },
}
const placeholderMeta = computed(() => PLACEHOLDER_META[activeTab.value] || PLACEHOLDER_META.biometric)

const heroMetrics = computed(() => {
  const s = dashboard.stats || {}
  return [
    { key: 'present',   label: 'Present today',  value: s.present_today ?? 0,       color: '#14b8a6', icon: CheckCircle2, go: 'daily' },
    { key: 'late',      label: 'Late arrivals',  value: s.late_count ?? 0,          color: '#facc15', icon: Clock4,       go: 'daily' },
    { key: 'absent',    label: 'Absent',         value: s.absent_today ?? 0,        color: '#fb923c', icon: AlertTriangle,go: 'daily' },
    { key: 'wfh',       label: 'WFH today',      value: s.on_wfh ?? 0,              color: '#5eead4', icon: Home,         go: 'wfh' },
    { key: 'overtime',  label: 'On overtime',    value: s.overtime_count ?? 0,      color: '#fdba74', icon: TimerReset,   go: 'overtime' },
    { key: 'pending',   label: 'Pending fixes',  value: s.pending_corrections ?? 0, color: '#fde047', icon: Pencil,       go: 'corrections' },
  ]
})

const onHeatmapCell = ({ day, hour }) => {
  // Reserved for drill-down — open Daily tab filtered by the day-hour combo.
  selectTab('daily')
}

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const loadLiveShift = async () => {
  // Pull the current user's "my shift" so the radial timer shows something
  // sensible even for admins. The endpoint 404s for users without an
  // Employee profile (most admins) — `validateStatus` lets us accept that
  // silently so DevTools doesn't surface a red error on every page load.
  try {
    const { data, status } = await axios.get(`${API}/hr/shifts/me/current`, {
      headers: authHeader(),
      validateStatus: (s) => s < 500,
    })
    if (status >= 400 || !data) { liveShift.value = null; return }
    const today = new Date()
    const [sh, sm] = (data.start_time || '09:00:00').split(':').map(Number)
    const [eh, em] = (data.end_time   || '18:00:00').split(':').map(Number)
    const start = new Date(today); start.setHours(sh || 9, sm || 0, 0, 0)
    const end   = new Date(today); end.setHours(eh || 18, em || 0, 0, 0)
    liveShift.value = { shiftStart: start, shiftEnd: end, shiftName: data.name }
  } catch {
    liveShift.value = null
  }
}

const loadDashboard = async () => {
  loadingStats.value = true
  try {
    const [s, hm] = await Promise.all([
      fetchAttendanceStats(),
      fetchHeatmap(),
    ])
    dashboard.stats = s
    dashboard.heatmap = hm
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load attendance dashboard')
  } finally {
    loadingStats.value = false
  }
}

onMounted(() => {
  loadLiveShift()
  loadDashboard()
})
</script>

<style scoped>
@import '../../../styles/attendance-theme.css';

.att-workspace {
  position: relative;
  display: flex; flex-direction: column;
  min-height: calc(100vh - 100px);
  color: var(--hr-text);
}
.ws-body {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding-top: 16px;
  min-height: 0;
}
@media (max-width: 900px) {
  .ws-body { flex-direction: column; }
  .ws-body :deep(.att-dock) {
    position: relative;
    width: 100%;
    max-height: 320px;
    margin: 0 0 14px 0;
  }
}
.att-canvas {
  flex: 1;
  min-width: 0;
  padding: 4px 4px 32px;
}
.canvas-inner { min-height: 360px; }

.canvas-forward-enter-active, .canvas-forward-leave-active,
.canvas-back-enter-active, .canvas-back-leave-active {
  transition: opacity .26s var(--att-spring), transform .26s var(--att-spring);
}
.canvas-forward-enter-from { opacity: 0; transform: translateX(14px); }
.canvas-forward-leave-to   { opacity: 0; transform: translateX(-10px); }
.canvas-back-enter-from    { opacity: 0; transform: translateX(-14px); }
.canvas-back-leave-to      { opacity: 0; transform: translateX(10px); }
</style>
