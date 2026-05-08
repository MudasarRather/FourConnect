<template>
  <div class="dashboard-home">
    <!-- Hero Section -->
    <header class="hero-section mb-10">
      <div class="hero-content">
        <h1 class="hero-greeting animate-text">Good morning, <span class="text-highlight">{{ user.name }}</span>.</h1>
        <p class="hero-subtitle animate-text-delayed">Here's the pulse of your ecosystem for {{ today }}.</p>
      </div>
      <div class="hero-stats">
        <div v-for="metric in quickMetrics" :key="metric.label" class="mini-metric">
          <span class="metric-label">{{ metric.label }}</span>
          <span class="metric-value">{{ metric.value }}</span>
        </div>
      </div>
    </header>

    <!-- Project Health Matrix -->
    <section class="mb-12">
      <div class="section-header flex justify-between items-end mb-6">
        <div>
          <h2 class="section-title">Project Health Matrix</h2>
          <p class="section-desc">Active lifecycles and performance indicators.</p>
        </div>
        <router-link to="/dashboard/projects" class="view-all-link">View Portfolio <ArrowUpRight :size="14" /></router-link>
      </div>

      <div class="project-grid">
        <div v-for="project in projects" :key="project.id" class="project-noir-card">
          <div class="project-card-header">
            <div class="status-indicator" :class="project.status.toLowerCase()"></div>
            <span class="project-code">{{ project.code }}</span>
          </div>
          <h3 class="project-name">{{ project.name }}</h3>
          <div class="project-meta">
            <Users :size="12" /> <span>{{ project.teamCount }} members</span>
          </div>
          <div class="project-health mt-4">
            <div class="health-meta flex justify-between text-[10px] mb-1">
              <span class="text-tertiary uppercase tracking-widest">Velocity</span>
              <span class="text-highlight">{{ project.progress }}%</span>
            </div>
            <div class="health-bar-bg">
              <div class="health-bar" :style="{ width: project.progress + '%' }"></div>
            </div>
          </div>
        </div>

        <button class="add-project-ghost-card">
          <Plus :size="24" />
          <span>Initiate Module</span>
        </button>
      </div>
    </section>

    <!-- Analytics & Activity Intelligence -->
    <div class="analytics-layout">
      <!-- Efficiency Radar -->
      <div class="analytics-card radar-cluster">
        <h3 class="card-title mb-4">Ecosystem Efficiency</h3>
        <div class="h-[240px] relative">
          <Radar :data="radarData" :options="radarOptions" />
        </div>
      </div>

      <!-- Timeline Widget -->
      <div class="analytics-card timeline-cluster">
        <h3 class="card-title mb-4">Critical Vectors</h3>
        <div class="timeline-stack">
          <div v-for="event in timelineEvents" :key="event.id" class="timeline-item">
            <div class="event-time">
              <span class="time-digit">{{ event.date }}</span>
              <span class="time-month uppercase">{{ event.month }}</span>
            </div>
            <div class="event-line"></div>
            <div class="event-content">
              <h4 class="event-title">{{ event.title }}</h4>
              <p class="event-desc">{{ event.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribution Doughnut -->
      <div class="analytics-card distribution-cluster">
        <h3 class="card-title mb-4">Fiscal Load</h3>
        <div class="h-[180px] relative mb-4">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
        </div>
        <div class="distribution-legend">
          <div v-for="item in distributionItems" :key="item.label" class="legend-item">
            <span class="legend-color" :style="{ background: item.color }"></span>
            <span class="legend-label">{{ item.label }}</span>
            <span class="legend-value">{{ item.value }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { 
  ArrowUpRight, Users, Plus, 
} from 'lucide-vue-next'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Radar, Doughnut } from 'vue-chartjs'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement
)

const dashboardData = ref({
  total_projects: 0,
  active_projects: 0,
  total_tasks: 0,
  pending_tasks: 0,
  completed_tasks: 0,
  total_expenses: 0,
  recent_activities: []
})

const user = ref({ name: 'Admin' })
const projects = ref([])
const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const quickMetrics = computed(() => [
  { label: 'Active Tasks', value: dashboardData.value.pending_tasks },
  { label: 'Burn Rate', value: `$${dashboardData.value.total_expenses.toLocaleString()}` },
  { label: 'Uptime', value: '99.9%' }
])

const timelineEvents = [
  { id: 1, title: 'Quarterly Audit', desc: 'Financial compliance review.', date: '21', month: 'Jan' },
  { id: 2, title: 'Sprint X-Ray', desc: 'Full architectural teardown.', date: '24', month: 'Jan' },
  { id: 3, title: 'Mainnet Shift', desc: 'Migration of synthetic assets.', date: '02', month: 'Feb' },
]

const distributionItems = [
  { label: 'Infrastructure', value: 45, color: '#3b82f6' },
  { label: 'R&D', value: 30, color: '#10b981' },
  { label: 'Operations', value: 25, color: '#f59e0b' },
]

// -- Radar Chart --
const radarData = {
  labels: ['Speed', 'Stability', 'Revenue', 'Adoption', 'Security', 'Cost'],
  datasets: [{
    label: 'Current System',
    data: [70, 85, 60, 45, 95, 40],
    fill: true,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    pointBackgroundColor: '#3b82f6',
    pointBorderColor: '#fff',
  }]
}

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      pointLabels: { color: '#888', font: { size: 10 } },
      ticks: { display: false }
    }
  },
  plugins: { legend: { display: false } }
}

// -- Doughnut Chart --
const doughnutData = {
  labels: ['Infra', 'R&D', 'Ops'],
  datasets: [{
    data: [45, 30, 25],
    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
    borderWidth: 0,
    cutout: '80%'
  }]
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
}

const fetchDashboardData = async () => {
  try {
    const isAdmin = window.location.pathname.startsWith('/admin')
    const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    
    if (!token) return

    const config = { headers: { Authorization: `Bearer ${token}` } }
    
    // Fetch User
    const userRes = await axios.get('http://localhost:8000/api/auth/me', config)
    user.value = { name: userRes.data.full_name || 'Admin' }

    // Fetch Summary
    const summaryRes = await axios.get('http://localhost:8000/api/dashboard/summary', config)
    dashboardData.value = summaryRes.data

    // Fetch Projects
    const projectsRes = await axios.get('http://localhost:8000/api/projects', config)
    const items = projectsRes.data.items || []
    projects.value = items.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || `PRJ-${p.id}`,
      progress: p.progress || 0,
      status: p.status || 'active',
      teamCount: 0 // Mock for now
    }))

  } catch (err) {
    console.error('Failed to fetch dashboard data:', err)
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard-home {
  padding: 40px 0;
  max-width: 1400px;
  margin: 0 auto;
}

/* Hero Section */
.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--divider-color);
  padding-bottom: 40px;
}

.hero-greeting {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.04em;
  margin-bottom: 8px;
}

.text-highlight { color: var(--accent-noir); }

.hero-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.hero-stats {
  display: flex;
  gap: 48px;
}

.mini-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.metric-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  letter-spacing: 0.15em;
  font-weight: 700;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

/* Section Styling */
.section-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.view-all-link {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;
}

.view-all-link:hover { color: #fff; text-decoration: none; }

/* Grid Layouts */
.project-grid {
  display: grid;
  grid-template-cols: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.project-noir-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: all 0.4s var(--ease-in-out);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.project-noir-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.02);
}

.project-noir-card::after {
  content: "";
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at top right, rgba(255,255,255,0.03), transparent);
  pointer-events: none;
}

.status-indicator {
  width: 6px; height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}
.status-indicator.active { color: var(--accent-emerald); background: currentColor; }
.status-indicator.warning { color: var(--accent-gold); background: currentColor; }
.status-indicator.completed { color: var(--accent-noir); background: currentColor; }

.project-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.project-code {
  font-size: 10px;
  font-weight: 800;
  color: var(--text-tertiary);
  letter-spacing: 0.1em;
}

.project-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.health-bar-bg {
  width: 100%; height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
}

.health-bar {
  height: 100%;
  background: #fff;
  border-radius: 4px;
}

.add-project-ghost-card {
  border: 2px dashed rgba(255,255,255,0.05);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-tertiary);
  transition: all 0.3s;
  background: none;
}

.add-project-ghost-card:hover {
  border-color: rgba(255,255,255,0.15);
  color: var(--text-secondary);
  background: rgba(255,255,255,0.01);
}

.add-project-ghost-card span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Analytics Cluster */
.analytics-layout {
  display: grid;
  grid-template-cols: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.analytics-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 32px;
}

.card-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 800;
  color: var(--text-tertiary);
}

/* Timeline */
.timeline-stack {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 20px;
  padding-bottom: 24px;
}

.event-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.time-digit { font-size: 18px; font-weight: 800; }
.time-month { font-size: 9px; font-weight: 800; color: var(--text-tertiary); }

.event-line {
  width: 1px;
  background: var(--divider-color);
  position: relative;
}

.event-line::after {
  content: "";
  position: absolute;
  top: 8px; left: -2px;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #fff;
}

.event-title { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
.event-desc { font-size: 11px; color: var(--text-tertiary); }

/* Legend */
.distribution-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.legend-color { width: 8px; height: 8px; border-radius: 2px; }
.legend-label { flex: 1; color: var(--text-secondary); }
.legend-value { font-weight: 700; }

/* Animations */
.animate-text { animation: slideUp 0.6s var(--ease-in-out) forwards; opacity: 0; }
.animate-text-delayed { animation: slideUp 0.6s 0.2s var(--ease-in-out) forwards; opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
