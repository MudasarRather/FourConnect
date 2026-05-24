<template>
  <div class="project-details-panel">
    <!-- Header / Status -->
    <div class="panel-section header-section">
      <div class="status-row">
        <span class="status-badge" :class="project.status.toLowerCase()">
          <span class="status-dot"></span>
          {{ project.status }}
        </span>
        <span class="project-code">{{ project.code }}</span>
      </div>
      <h2 class="project-title">{{ project.name }}</h2>
      <div class="owner-info">
        <span class="label">Created by</span>
        <span class="value">{{ project.created_by_name }}</span>
      </div>
    </div>

    <!-- Description (Prominent) -->
    <div class="panel-section">
      <label class="section-label">Description</label>
      <p class="description">{{ project.description || 'No description provided.' }}</p>
    </div>

    <div class="divider"></div>

    <!-- Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Budget</span>
        <div class="metric-value-row">
           <span class="currency">{{ project.currency || 'USD' }}</span>
           <span class="amount">{{ formatNumber(project.budget_amount) }}</span>
        </div>
        <span class="metric-sub">{{ project.budget_type || 'Fixed' }}</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Duration</span>
        <div class="metric-value-row">
           <span class="amount">{{ getDuration(project.start_date, project.end_date) }}</span>
        </div>
        <div class="date-range">
           {{ formatDate(project.start_date) }} — {{ formatDate(project.end_date) }}
        </div>
      </div>
    </div>

    <!-- General Info Grid -->
    <div class="panel-section">
      <label class="section-label">General Information</label>
      <div class="info-grid">
        <div class="info-item">
          <label>Organization</label>
          <p>{{ project.organization || '—' }}</p>
        </div>
        <div class="info-item">
          <label>Focus Area</label>
          <p>{{ project.project_type || 'General' }}</p>
        </div>
        <div class="info-item">
          <label>Cost Center</label>
          <p class="mono">{{ project.cost_center || '—' }}</p>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Team Section -->
    <div class="panel-section">
      <div class="group-header">
        <label class="section-label">Team Structure</label>
        <span class="count-badge">{{ project.team_members?.length || 0 }}</span>
      </div>
      
      <div class="team-list" v-if="project.team_members?.length">
        <div 
          v-for="member in project.team_members" 
          :key="member.id"
          class="team-row"
        >
          <div class="member-avatar" :style="{ background: getAvatarColor(member) }">
            {{ getInitials(member.user_name) }}
          </div>
          <div class="member-info">
            <span class="member-name">{{ member.user_name }}</span>
            <span class="member-email">{{ member.user_email }}</span>
            <span class="member-role" :class="member.status.toLowerCase()">{{ member.status }}</span>
            <span v-if="member.status === 'declined' && member.decline_reason" class="decline-reason">
              "{{ member.decline_reason }}"
            </span>
          </div>
          <button 
            v-if="isAdmin && member.status === 'pending'" 
            class="override-btn"
            @click="overridePending(member)"
            :disabled="overriding === member.id"
          >
            <span v-if="overriding === member.id">...</span>
            <span v-else>Override</span>
          </button>
        </div>
      </div>
      <div v-else class="empty-team">
        <p>No team members assigned yet.</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { API } from '@/utils/api'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['refresh'])

const route = useRoute()
const overriding = ref(null)

const isAdmin = computed(() => route.path.startsWith('/admin'))

const getToken = () => route.path.startsWith('/admin') 
  ? localStorage.getItem('admin_token') 
  : localStorage.getItem('user_token')

const overridePending = async (member) => {
  overriding.value = member.id
  try {
    await axios.post(
      `${API}/team/${member.id}/override-pending`,
      {},
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    // Update member status locally
    member.status = 'accepted'
    emit('refresh')
  } catch (e) {
    console.error('Override failed:', e)
  } finally {
    overriding.value = null
  }
}

const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getDuration = (start, end) => {
  if (!start || !end) return '—'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = Math.abs(endDate - startDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
  
  if (diffDays > 365) {
      const years = (diffDays / 365).toFixed(1)
      return `${years} Years`
  } else if (diffDays > 30) {
      const months = (diffDays / 30).toFixed(1)
      return `${months} Months`
  }
  return `${diffDays} Days`
}

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

// Avatar color by member status — orange/amber family across the board
const getAvatarColor = (member) => {
  if (member.status === 'declined') return '#d97706' // Burnt amber for declined
  if (member.status === 'pending')  return '#fbbf24' // Amber-400 for pending
  if (member.status === 'removed')  return '#92400e' // Deep amber for removed
  if (member.status === 'accepted') return '#f97316' // Orange-500 for accepted
  return '#f97316'
}

</script>

<style scoped>
.project-details-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px;
}

/* Header */
.header-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  background: rgba(255, 255, 255, 0.05);
  color: #e5e5e5;
}

.status-badge.approved {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
}
.status-badge.approved .status-dot { background: #fbbf24; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; }

.project-code {
  font-family: 'SF Mono', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
}

.project-title {
  font-size: 20px;
  font-weight: 700;
  color: #f5f5f7;
  line-height: 1.3;
}

.owner-info {
  display: flex;
  gap: 6px;
  font-size: 12px;
}
.owner-info .label { color: rgba(255, 255, 255, 0.5); }
.owner-info .value { color: #e5e5e5; }

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 0;
}

.section-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

/* Metrics */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.currency { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.amount { font-size: 16px; font-weight: 600; color: #f5f5f7; }

.metric-sub, .date-range {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.info-item p {
  font-size: 13px;
  color: #e5e5e5;
  font-weight: 500;
}

.info-item p.mono {
  font-family: 'SF Mono', monospace;
  color: #a5b4fc;
}

.description {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

/* Team List */
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.group-header .section-label { margin-bottom: 0; }

.count-badge {
  font-size: 10px;
  color: #e5e5e5;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 6px;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid transparent;
}

.team-row:hover {
  border-color: rgba(255, 255, 255, 0.05);
}

.member-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f97316; /* Solid Orange */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.member-name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
}

.member-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 2px;
}

.member-role {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.member-role.pending {
  background: rgba(251, 191, 36, 0.1);
  color: #f59e0b;
}

.member-role.accepted {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
}

.member-role.declined {
  background: rgba(217, 119, 6, 0.12);
  color: #d97706;
}

.member-role.removed {
  background: rgba(146, 64, 14, 0.18);
  color: #b45309;
}

.empty-team {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

/* Override Button */
.override-btn {
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.3);
  color: #f97316;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.override-btn:hover:not(:disabled) {
  background: rgba(249, 115, 22, 0.2);
  border-color: #f97316;
}

.override-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Decline Reason */
.decline-reason {
  display: block;
  font-size: 11px;
  font-style: italic;
  color: rgba(168, 85, 247, 0.9);
  margin-top: 4px;
  padding: 4px 8px;
  background: rgba(168, 85, 247, 0.08);
  border-radius: 4px;
  border-left: 2px solid rgba(168, 85, 247, 0.4);
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════
   Drawer panel uses frosted-glass cream; keep inner cards translucent so the
   transparency cascade is preserved. Palette stays in the orange/amber/gold
   family — gold accents on cream, deep amber for labels.
   ════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .project-title { color: var(--text-primary); }
[data-theme="light"] .project-code { color: #6b5840; }
[data-theme="light"] .status-badge {
  background: rgba(40, 25, 10, 0.06);
  color: var(--text-secondary);
}
[data-theme="light"] .status-badge.approved {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}
[data-theme="light"] .status-badge.approved .status-dot { background: #d97706; }
[data-theme="light"] .status-badge.pending {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
}
[data-theme="light"] .status-badge.pending .status-dot { background: #f59e0b; }
[data-theme="light"] .status-badge.rejected {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
}
[data-theme="light"] .status-badge.rejected .status-dot { background: #dc2626; }
[data-theme="light"] .status-badge.completed {
  background: rgba(5, 150, 105, 0.14);
  color: #047857;
}
[data-theme="light"] .status-badge.completed .status-dot { background: #059669; }
[data-theme="light"] .status-dot { background: #92400e; }

[data-theme="light"] .owner-info .label { color: #6b5840; }
[data-theme="light"] .owner-info .value { color: var(--text-primary); }

[data-theme="light"] .divider { background: rgba(40, 25, 10, 0.10); }

[data-theme="light"] .section-label { color: #b45309; font-weight: 700; }

[data-theme="light"] .description { color: var(--text-secondary); }

[data-theme="light"] .metric-card {
  background: rgba(255, 250, 240, 0.40);
  border-color: rgba(217, 119, 6, 0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
[data-theme="light"] .metric-label { color: #6b5840; }
[data-theme="light"] .currency { color: #6b5840; }
[data-theme="light"] .amount { color: var(--text-primary); }
[data-theme="light"] .metric-sub,
[data-theme="light"] .date-range { color: #92400e; }

[data-theme="light"] .info-item label { color: #6b5840; }
[data-theme="light"] .info-item p { color: var(--text-primary); }
[data-theme="light"] .info-item p.mono { color: #b45309; }

[data-theme="light"] .count-badge {
  color: #92400e;
  background: rgba(217, 119, 6, 0.14);
}

[data-theme="light"] .team-row {
  background: rgba(255, 250, 240, 0.35);
  border: 1px solid rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .team-row:hover {
  border-color: rgba(217, 119, 6, 0.30);
  background: rgba(255, 250, 240, 0.55);
}
[data-theme="light"] .member-name { color: var(--text-primary); }
[data-theme="light"] .member-email { color: #6b5840; }
[data-theme="light"] .member-role.pending {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}
[data-theme="light"] .member-role.accepted {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}
[data-theme="light"] .member-role.declined {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .member-role.removed {
  background: rgba(146, 64, 14, 0.18);
  color: #78350f;
}

[data-theme="light"] .empty-team { color: #92400e; }

[data-theme="light"] .override-btn {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.36);
  color: #c2410c;
}
[data-theme="light"] .override-btn:hover:not(:disabled) {
  background: rgba(249, 115, 22, 0.22);
  border-color: #c2410c;
}

[data-theme="light"] .decline-reason {
  color: #92400e;
  background: rgba(217, 119, 6, 0.10);
  border-left-color: rgba(217, 119, 6, 0.45);
}
</style>
