<template>
  <div class="milestones-container">
    <div class="section-header">
      <div class="header-content">
        <h3>Milestones</h3>
        <p>Key events and deliverables</p>
      </div>
      <button v-if="canCreate" class="btn-create" @click="$emit('create')">
        <Plus :size="16" />
        <span>Add Milestone</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <Loader2 :size="24" class="spinner" />
      <span>Loading milestones...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="milestones.length === 0" class="empty-state">
      <Flag :size="32" class="empty-icon" />
      <h4>No Milestones</h4>
      <p>Create your first milestone to track progress.</p>
    </div>

    <!-- Table View -->
    <div v-else class="ms-table">
      <!-- Header -->
      <div class="ms-row header">
        <div class="col-status"></div>
        <div class="col-name">Name</div>
        <div class="col-prio">Priority</div>
        <div class="col-assign">Assigned</div>
        <div class="col-due">Due Date</div>
        <div class="col-est">Est. Time</div>
        <div class="col-badge">Status</div>
      </div>

      <!-- Items -->
      <div 
        v-for="m in milestones" 
        :key="m.id" 
        class="ms-row item"
        @click="$emit('select', m)"
      >
        <!-- Status Dot -->
        <div class="col-status">
          <div class="status-indicator" :class="m.status">
            <Check v-if="m.status === 'completed'" :size="10" stroke-width="4" />
            <div v-else class="pulse-dot"></div>
          </div>
        </div>

        <!-- Name & Desc -->
        <div class="col-name">
          <span class="ms-title" :class="{ 'strikethrough': isExpired(m) }">{{ m.name }}</span>
          <span class="ms-desc" v-if="m.description">{{ m.description }}</span>
        </div>

        <!-- Priority -->
        <div class="col-prio">
          <span class="prio-badge" :class="m.priority">
             <Flag :size="12" /> {{ m.priority }}
          </span>
        </div>

        <!-- Assigned To (Avatar Stack) -->
        <div class="col-assign">
          <div class="avatar-stack" v-if="getVisibleAssignments(m.assignments).length > 0">
             <div 
                v-for="(assign, idx) in getVisibleAssignments(m.assignments).slice(0, 3)" 
                :key="assign.id" 
                class="stack-avatar"
                :style="{ left: `${idx * 14}px`, zIndex: 10 - idx, background: getAvatarBackground(assign), color: isLight(getAvatarBackground(assign)) ? '#000' : '#fff' }"
                :title="`${assign.user?.full_name} (${formatStatus(assign.status)})`"
             >
                {{ getInitials(assign.user?.full_name) }}
             </div>
             <div 
                v-if="getVisibleAssignments(m.assignments).length > 3" 
                class="stack-more" 
                :style="{ left: `${3 * 14}px` }"
                :title="getVisibleAssignments(m.assignments).slice(3).map(a => a.user?.full_name).join(', ')"
             >
                +{{ getVisibleAssignments(m.assignments).length - 3 }}
             </div>
          </div>
          <span v-else class="text-muted">—</span>
        </div>

        <!-- Due Date -->
        <div class="col-due">
          <span :class="{ 'expired': isExpired(m), 'near-due': isNearDue(m) }">{{ formatDate(m.due_date) }}</span>
        </div>

        <!-- Est Time -->
         <div class="col-est">
           <span class="text-muted">{{ formatHours(m.estimated_hours) }}</span>
         </div>

        <!-- Status Badge -->
        <div class="col-badge">
           <span class="ms-badge" :class="m.status">{{ formatStatus(m.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, Loader2, Flag, Check, Calendar } from 'lucide-vue-next'

const props = defineProps({
  milestones: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  canCreate: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false }
})

defineEmits(['create', 'select'])

const getVisibleAssignments = (assignments) => {
    if (!assignments) return []
    // Show if count < 2 OR if they are actively assigned (Admin Override)
    return assignments.filter(a => ((a.decline_count || 0) < 2 || a.status === 'in_progress') && a.status !== 'removed')
}


const formatStatus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : 'Pending')

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  return diffDays <= 2 // Red if due within 2 days
}

const formatHours = (h) => {
    if (!h) return '—'
    const totalMins = Math.round(h * 60)
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
}

const getInitials = (n) => {
  if (!n) return '??'
  const clean = n.split('(')[0].trim()
  return clean.split(' ').map(c => c[0]).filter(x => x).join('').slice(0, 2).toUpperCase()
}

const getColor = (name) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']
    let hash = 0
    if (name) {
        for(let i=0; i<name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

const getAvatarBackground = (assign) => {
  if (assign.status) {
      if (assign.status === 'pending') return '#fbbf24' // Yellow
      if (assign.status === 'in_progress') return '#f97316' // Orange
      if (assign.status === 'declined') return '#ef4444' // Red
      if (assign.status === 'completed') return '#10b981' // Green
  }
  return getColor(assign.user?.full_name)
}

const isLight = (color) => {
    return color === '#fbbf24'
}
</script>

<style scoped>
.milestones-container {
  /* Using shared card background from parent or transparent */
  background: transparent;
  padding: 0;
  border: none;
}

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
}
.header-content h3 { font-size: 16px; font-weight: 600; color: #f5f5f7; margin-bottom: 2px; }
.header-content p { font-size: 13px; color: rgba(255,255,255,0.5); }

.btn-create {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #f5f5f7; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.btn-create:hover { background: rgba(255,255,255,0.1); }

.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 0; color: rgba(255,255,255,0.4);
}
.spinner { animation: spin 1s linear infinite; margin-bottom: 12px; }
.empty-icon { margin-bottom: 12px; opacity: 0.2; }
.empty-state h4 { font-size: 14px; font-weight: 600; color: #f5f5f7; margin-bottom: 4px; }
.empty-state p { font-size: 12px; color: rgba(255,255,255,0.5); }

/* Table */
.ms-table { display: flex; flex-direction: column; width: 100%; }

.ms-row {
   display: grid; 
  grid-template-columns: 32px 2.5fr 0.8fr 1.2fr 1fr 0.8fr 1fr;
  align-items: center; padding: 12px 0;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ms-row.header {
  padding-bottom: 8px; 
  border-bottom: 1px solid rgba(255,255,255,0.1);
  font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
}

.ms-row.item { 
  transition: background 0.2s; 
  border-radius: 8px; 
  margin: 0 -8px; 
  padding: 12px 8px; 
  cursor: pointer;
}
.ms-row.item:hover { background: rgba(255,255,255,0.03); }

/* Columns */
.col-status { display: flex; justify-content: center; }
.status-indicator {
  width: 16px; height: 16px; border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.status-indicator.completed { background: #4ade80; border-color: #4ade80; color: #000; }
.status-indicator.pending { border-color: #fbbf24; }
.status-indicator.pending .pulse-dot { width: 5px; height: 5px; background: #fbbf24; border-radius: 50%; }

.col-name { display: flex; flex-direction: column; padding-right: 16px; min-width: 0; }
.ms-title { font-size: 13px; font-weight: 500; color: #f5f5f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-title.strikethrough { text-decoration: line-through; opacity: 0.6; color: #f87171; }
.ms-desc { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-due { font-size: 12px; color: rgba(255,255,255,0.8); font-family: 'SF Mono', monospace; }
.col-due .expired { color: #f87171; }
.col-due .near-due { color: #fbbf24; }

.col-est { font-size: 12px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; }

.col-created { font-size: 12px; }
.user-pill { display: flex; align-items: center; gap: 8px; }
.tiny-avatar { 
  width: 24px; height: 24px; border-radius: 50%; 
  background: #3f3f46; color: white; font-size: 9px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.user-meta { display: flex; flex-direction: column; line-height: 1.1; }
.u-name { font-size: 11px; color: #f5f5f7; font-weight: 500; }
.u-date { font-size: 10px; color: rgba(255,255,255,0.4); }

.col-badge { display: flex; justify-content: flex-end; }
.ms-badge { 
  font-size: 10px; padding: 2px 8px; border-radius: 10px; 
  text-transform: capitalize; border: 1px solid transparent; 
}
.ms-badge.completed { background: rgba(74, 222, 128, 0.1); color: #4ade80; border-color: rgba(74, 222, 128, 0.2); }
.ms-badge.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-color: rgba(251, 191, 36, 0.2); }
.ms-badge.expired { background: rgba(248, 113, 113, 0.1); color: #f87171; border-color: rgba(248, 113, 113, 0.2); }

.col-prio { display: flex; }
.prio-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; text-transform: capitalize; font-weight: 500; color: rgba(255,255,255,0.7); }
.prio-badge.urgent { color: #ef4444; }
.prio-badge.high { color: #f97316; }

.col-assign { display: flex; align-items: center; }
.user-pill { background: rgba(255,255,255,0.05); padding: 2px 8px 2px 2px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }

/* Avatar Stack */
.avatar-stack { position: relative; height: 24px; min-width: 60px; /* reserve space */ }
.stack-avatar {
  position: absolute; top: 0;
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid #18181b; /* Match table bg */
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; color: white;
  transition: transform 0.2s;
}
.stack-avatar:hover { transform: translateY(-2px); z-index: 20 !important; }
.stack-more {
  position: absolute; top: 0;
  width: 24px; height: 24px; border-radius: 50%;
  background: #333; color: rgba(255,255,255,0.7);
  border: 2px solid #18181b;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 600;
  z-index: 20; /* Ensure on top */
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
