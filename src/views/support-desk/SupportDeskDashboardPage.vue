<template>
  <div class="sd-page">
    <SdLiquidBasin
      eyebrow="SUPPORT DESK"
      title="Triage Basin"
      :subtitle="heroSubtitle"
      :metrics="heroMetrics"
      :actions="heroActions"
      :priority-counts="priorityCounts"
      :breach="breach"
      :loading="loading"
      @go="goModule"
      @action="onAction"
    />

    <main class="sd-page-body">
      <SdDashboardSection :dashboard="dashboard" :loading="loading" @go="goModule" @changed="loadDashboard" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Ticket, Users, AlertTriangle, Timer, CheckCircle2, Gauge, Plus, BookOpen } from 'lucide-vue-next'
import '../../styles/support-desk-theme.css'
import SdLiquidBasin from './components/SdLiquidBasin.vue'
import SdDashboardSection from './sections/SdDashboardSection.vue'
import { fetchSupportDashboard } from '@/composables/useSupportDesk'

const route = useRoute()
const router = useRouter()
const base = computed(() => (route.path.startsWith('/user') ? '/user/support-desk' : '/admin/support-desk'))

const dashboard = ref(null)
const loading = ref(true)
const loadDashboard = async () => {
  loading.value = true
  try { dashboard.value = await fetchSupportDashboard() } catch { dashboard.value = null } finally { loading.value = false }
}
onMounted(loadDashboard)

const priorityCounts = computed(() => dashboard.value?.priority_counts || {})
const breach = computed(() => dashboard.value?.sla_breached || 0)
const heroSubtitle = 'Every ticket, in motion — from intake to resolution.'
const heroActions = [
  { key: 'new-ticket', label: 'New Ticket', icon: Plus },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
]
const heroMetrics = computed(() => {
  const d = dashboard.value || {}
  return [
    { key: 'open', label: 'Open', icon: Ticket, value: d.open_tickets ?? 0, color: 'var(--sd-st-open)', go: 'tickets' },
    { key: 'unassigned', label: 'Unassigned', icon: Users, value: d.unassigned ?? 0, color: 'var(--sd-steel)', go: 'tickets' },
    { key: 'critical', label: 'Critical', icon: AlertTriangle, value: d.critical ?? 0, color: 'var(--sd-pri-critical)', go: 'tickets' },
    { key: 'breached', label: 'SLA Breached', icon: Timer, value: d.sla_breached ?? 0, color: 'var(--sd-st-breached)', go: 'sla' },
    { key: 'resolved', label: 'Resolved (24h)', icon: CheckCircle2, value: d.resolved_today ?? 0, color: 'var(--sd-success)', go: 'tickets' },
    { key: 'csat', label: 'CSAT', icon: Gauge, value: d.csat != null ? `${d.csat}%` : '—', color: 'var(--sd-amber)', go: 'reports' },
  ]
})

const goModule = (key) => { if (key) router.push(`${base.value}/${key}`) }
const onAction = (key) => {
  if (key === 'new-ticket') router.push(`${base.value}/tickets?new=1`)
  else if (key === 'knowledge-base') router.push(`${base.value}/knowledge-base`)
}
</script>

<style scoped>
.sd-page { position: relative; display: flex; flex-direction: column; gap: 16px; min-height: calc(100vh - 100px); color: var(--sd-text); }
.sd-page-body { flex: 1; }
</style>
