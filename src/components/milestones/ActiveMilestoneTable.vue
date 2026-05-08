<template>
  <div class="active-milestone-table">
    
    <!-- Header -->
    <div class="section-header">
       <div class="header-content">
          <h3>Active Milestones</h3>
          <p>Key events matching standard tracker design</p>
       </div>
    </div>

    <!-- Table -->
    <div class="ms-table">
       <div class="ms-row header">
          <div class="col-name">Name</div>
          <div class="col-type">Type</div>
          <div class="col-owner">Owner</div>
          <div class="col-prio">Priority</div>
          <div class="col-assign">Assigned</div>
          <div class="col-start">Start Date</div>
          <div class="col-due">Due Date</div>
          <div class="col-est">Est. Time</div>
          <div class="col-badge">Status</div>
          <div class="col-budget">Budget</div>
          <div class="col-contrib">Contribution</div>
       </div>

       <div v-if="milestones.length === 0" class="empty-row">
          <p>No active milestones found.</p>
       </div>

       <div 
          v-for="m in milestones" 
          :key="m.id" 
          class="ms-row item"
          @click="$emit('select', m)"
       >
          <!-- Name -->
          <div class="col-name">
             <span class="ms-title" :title="m.name" :class="{ 'strikethrough': isExpired(m) }">{{ m.name }}</span>
          </div>

          <!-- Type -->
          <div class="col-type">
             <span>{{ m.milestone_type || '—' }}</span>
          </div>

          <!-- Owner -->
          <div class="col-owner">
             <div class="owner-avatar" :title="`Owner: ${m.created_by?.full_name || 'Unknown'}`">
                 {{ (m.created_by?.full_name || '?').charAt(0) }}
             </div>
          </div>

          <!-- Priority -->
          <div class="col-prio">
             <span class="prio-badge" :class="m.priority || 'medium'">
                <Flag :size="12" /> {{ m.priority || 'Medium' }}
             </span>
          </div>

          <!-- Assigned (Filtered) -->
          <div class="col-assign">
              <div class="avatar-stack">
                  <div 
                      v-for="(assign, idx) in getActiveAssignments(m).slice(0,3)" 
                      :key="assign.id" 
                      class="assign-avatar"
                      :title="`${assign.user?.full_name || 'Unknown'} (${assign.status})`"
                      :style="{ 
                          zIndex: 10 - idx, 
                          left: `${idx * 14}px`,
                          background: getAvatarColor(assign.status),
                          borderColor: '#09090b'
                      }"
                  >
                      {{ (assign.user?.full_name || '?').charAt(0) }}
                  </div>
                  <div v-if="getActiveAssignments(m).length > 3" class="assign-more" :style="{ left: '42px' }">
                      +{{ getActiveAssignments(m).length - 3 }}
                  </div>
                  <span v-if="getActiveAssignments(m).length === 0" class="text-muted">–</span>
              </div>
          </div>

          <!-- Start Date -->
          <div class="col-start">
             <span>{{ formatDate(m.start_date) || '—' }}</span>
          </div>

          <!-- Due Date -->
          <div class="col-due">
             <span :class="{ 'expired': isExpired(m), 'near-due': isNearDue(m) }">{{ formatDate(m.due_date) }}</span>
          </div>

          <!-- Est Time -->
          <div class="col-est">
              <span class="val-text">{{ formatHours(m.estimated_hours) || '0h' }}</span>
          </div>

          <!-- Status Badge -->
          <div class="col-badge">
             <span class="ms-badge" :class="m.status">{{ formatStatus(m.status) }}</span>
          </div>

          <!-- Budget -->
          <div class="col-budget">
             <span class="val-text">{{ m.currency }} {{ (m.budget_amount || 0).toLocaleString() }}</span>
          </div>

          <!-- Contribution -->
          <div class="col-contrib" :title="`Milestone Budget: ${m.currency} ${(m.budget_amount || 0).toLocaleString()} / Project Budget: ${m.currency} ${(m.project_budget_amount || 0).toLocaleString()}`">
              <div class="contrib-bar-wrap">
                  <div class="contrib-bar" :style="{ width: `${Math.min(m.contribution_percentage || 0, 100)}%` }"></div>
              </div>
              <span class="contrib-val">{{ m.contribution_percentage }}%</span>
          </div>
       </div>
    </div>

  </div>
</template>

<script setup>
import { Flag } from 'lucide-vue-next'

const props = defineProps({
  milestones: { type: Array, default: () => [] }
})

const emit = defineEmits(['select'])

// Helpers
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const formatHours = (h) => {
  if (!h) return ''
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${Math.round(h)}h`
}
const formatStatus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : 'Pending')

// Avatar Color Logic (Matching AssignTeamPage)
const getAvatarColor = (status) => {
  if (status === 'declined') return '#a855f7' // Purple
  if (status === 'pending') return '#f59e0b' // Amber
  if (status === 'removed') return '#ef4444' // Red
  return '#f97316' // Orange (Accepted/In Progress)
}

const isExpired = (m) => {
  if (m.status === 'completed' || !m.due_date) return false
  const due = new Date(m.due_date)
  due.setHours(0,0,0,0)
  const today = new Date()
  today.setHours(0,0,0,0)
  return due < today
}

const isNearDue = (m) => {
  if (m.status === 'completed' || !m.due_date || isExpired(m)) return false
  const due = new Date(m.due_date)
  due.setHours(0,0,0,0)
  const today = new Date()
  today.setHours(0,0,0,0)
  const diffTime = Math.abs(due - today)
  const diffDays = diffTime / (1000 * 60 * 60 * 24) 
  return diffDays <= 2
}

const getActiveAssignments = (milestone) => {
    if (!milestone.assignments) return []
    // Filter out DECLINED or REMOVED
    return milestone.assignments.filter(a => 
        a.status !== 'declined' && 
        a.status !== 'removed'
    )
}
</script>

<style scoped>
.active-milestone-table {
  background: transparent;
  width: 100%;
}

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
}
.header-content h3 { font-size: 16px; font-weight: 600; color: #f5f5f7; margin-bottom: 2px; }
.header-content p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

/* Table Structure */
.ms-table { display: flex; flex-direction: column; width: 100%; }

.ms-row {
  display: grid; 
  /* Name | Type | Owner | Priority | Assigned | Start | Due | Est | Status | Budget | Contrib */
  grid-template-columns: 2fr 100px 50px 90px 80px 90px 90px 70px 100px 90px 110px;
  align-items: center; padding: 12px 0;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ms-row.header {
  padding-bottom: 12px; 
  border-bottom: 1px solid rgba(255,255,255,0.1);
  font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
}

.ms-row.item { 
  transition: all 0.2s ease; 
  border-radius: 8px; 
  margin: 0 -8px; 
  padding: 12px 8px; 
  cursor: pointer;
  border-bottom: 1px solid transparent; 
}
.ms-row.item:hover { 
    background: rgba(255,255,255,0.03); 
    transform: translateY(-1px);
}

/* Columns */
.col-name { display: flex; flex-direction: column; min-width: 0; }
.ms-title { font-size: 13px; font-weight: 500; color: #f5f5f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-title.strikethrough { text-decoration: line-through; opacity: 0.6; color: #f87171; }

.col-type { font-size: 12px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-owner { display: flex; justify-content: center; }
.owner-avatar {
    width: 24px; height: 24px; border-radius: 50%;
    background: #3f3f46; color: rgba(255,255,255,0.8);
    font-size: 10px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(255,255,255,0.1);
}

.col-prio { display: flex; }
.prio-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; text-transform: capitalize; font-weight: 500; color: rgba(255,255,255,0.7); }
.prio-badge.urgent { color: #ef4444; }
.prio-badge.high { color: #f97316; }

.col-assign { position: relative; height: 28px; display: flex; align-items: center; }
.avatar-stack { position: relative; display: flex; height: 24px; }
.assign-avatar {
    width: 24px; height: 24px; border-radius: 50%;
    color: white; font-size: 10px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    position: absolute; border: 2px solid #09090b; 
    text-transform: uppercase;
}
.assign-more {
    width: 24px; height: 24px; border-radius: 50%;
    background: #27272a; color: #a1a1aa; font-size: 9px;
    display: flex; align-items: center; justify-content: center;
    position: absolute; border: 2px solid #09090b;
}

.col-start, .col-due { font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; letter-spacing: -0.02em;}
.col-due { color: rgba(255,255,255,0.8); }
.col-due .expired { color: #f87171; }
.col-due .near-due { color: #fbbf24; }

.col-est, .col-budget { font-size: 12px; color: #d4d4d8; font-weight: 500; }
.val-text { font-variant-numeric: tabular-nums; }

.col-badge { display: flex; justify-content: flex-start; }
.ms-badge { 
  font-size: 10px; padding: 4px 8px; border-radius: 12px; 
  text-transform: capitalize; border: 1px solid transparent; 
  font-weight: 600; white-space: nowrap;
}
.ms-badge.completed { background: rgba(74, 222, 128, 0.1); color: #4ade80; border-color: rgba(74, 222, 128, 0.2); }
.ms-badge.in_progress { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
.ms-badge.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-color: rgba(251, 191, 36, 0.2); }
.ms-badge.expired { background: rgba(248, 113, 113, 0.1); color: #f87171; border-color: rgba(248, 113, 113, 0.2); }

.col-contrib { display: flex; align-items: center; gap: 8px; }
.contrib-bar-wrap { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.contrib-bar { height: 100%; background: #f97316; border-radius: 2px; }
.contrib-val { font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; min-width: 32px; text-align: right; }

.text-muted { color: rgba(255,255,255,0.2); font-size: 12px; }
.empty-row { padding: 40px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; }
</style>
