<template>
  <div class="hr-dashboard">
    <header class="page-header">
      <div class="header-title">
        <div class="title-icon">
          <UserCog :size="28" />
        </div>
        <div>
          <h1>HR Dashboard</h1>
          <p class="header-subtitle">Workforce overview · {{ today }}</p>
        </div>
      </div>
    </header>

    <section class="stats-grid">
      <div v-for="card in cards" :key="card.key" class="stat-card">
        <div class="stat-card-head">
          <component :is="card.icon" :size="18" class="stat-icon" />
          <span class="stat-label">{{ card.label }}</span>
        </div>
        <div class="stat-value">
          <span v-if="loading" class="value-placeholder">—</span>
          <span v-else>{{ card.value }}</span>
        </div>
        <div v-if="card.helper" class="stat-helper">{{ card.helper }}</div>
      </div>
    </section>

    <section class="info-panel">
      <div class="info-head">
        <Info :size="16" />
        <span>Phased rollout</span>
      </div>
      <p>
        The HR module is being delivered in phases. The cards above will activate as their backing modules go live —
        Attendance & Leave in Phase 2, Payroll in Phase 3, Recruitment in Phase 4, Exit Management in Phase 5.
      </p>
      <div class="phase-chips">
        <span class="chip done">Phase 0 · Scaffolding</span>
        <span class="chip pending">Phase 1 · Foundation</span>
        <span class="chip pending">Phase 2 · Time</span>
        <span class="chip pending">Phase 3 · Pay</span>
        <span class="chip pending">Phase 4 · Hiring</span>
        <span class="chip pending">Phase 5 · Growth</span>
        <span class="chip pending">Phase 6 · Reports & Hardening</span>
      </div>
    </section>

    <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { UserCog, Users, CalendarOff, UserPlus, Fingerprint, LogOut, Info } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const { error } = useToast()

const loading = ref(true)
const errorMsg = ref('')
const stats = ref({
  active_employees: 0,
  pending_leave_approvals: 0,
  open_positions: 0,
  todays_attendance_pct: 0,
  upcoming_exits_30d: 0
})

const today = computed(() =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
)

const cards = computed(() => [
  { key: 'active', icon: Users, label: 'Active Employees', value: stats.value.active_employees, helper: 'Live count' },
  { key: 'leave', icon: CalendarOff, label: 'Pending Leave Approvals', value: stats.value.pending_leave_approvals, helper: 'Phase 2' },
  { key: 'hiring', icon: UserPlus, label: 'Open Positions', value: stats.value.open_positions, helper: 'Phase 4' },
  { key: 'att', icon: Fingerprint, label: "Today's Attendance %", value: stats.value.todays_attendance_pct + '%', helper: 'Phase 2' },
  { key: 'exit', icon: LogOut, label: 'Upcoming Exits (30d)', value: stats.value.upcoming_exits_30d, helper: 'Phase 5' }
])

const fetchStats = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get('http://localhost:8000/api/hr/dashboard-stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    stats.value = { ...stats.value, ...res.data }
  } catch (e) {
    errorMsg.value = 'Could not load HR dashboard stats.'
    error('Failed to load HR dashboard stats')
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<style scoped>
.hr-dashboard {
  padding: 32px 40px;
  max-width: 1300px;
  margin: 0 auto;
}

.page-header { margin-bottom: 28px; }
.header-title { display: flex; align-items: flex-start; gap: 16px; }
.title-icon {
  width: 48px; height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #a5b4fc;
}
.header-title h1 { font-size: 26px; font-weight: 700; color: #f5f5f5; margin-bottom: 4px; }
.header-subtitle { color: #8e8e93; font-size: 13px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  background: rgba(26, 26, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: rgba(255, 255, 255, 0.12); }
.stat-card-head { display: flex; align-items: center; gap: 8px; color: #8e8e93; }
.stat-icon { color: #a5b4fc; }
.stat-label {
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.stat-value { font-size: 30px; font-weight: 700; color: #f5f5f5; }
.value-placeholder { color: #38383a; }
.stat-helper { font-size: 11px; color: #6b6b70; }

.info-panel {
  background: rgba(26, 26, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px;
  color: #c5c5c8;
  font-size: 13px;
  line-height: 1.6;
}
.info-head {
  display: flex; align-items: center; gap: 8px;
  color: #fbbf24; font-weight: 600; font-size: 12px;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.phase-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.chip.done { background: rgba(52, 211, 153, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.25); }
.chip.pending { background: rgba(255, 255, 255, 0.04); color: #8e8e93; border: 1px solid rgba(255, 255, 255, 0.08); }

.error-text { margin-top: 16px; color: #ef4444; font-size: 13px; }
</style>
