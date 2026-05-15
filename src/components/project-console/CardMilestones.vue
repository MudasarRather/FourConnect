<template>
  <div class="glass-card full-span">
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><Flag :size="16" /></div>
        <h3>Milestones</h3>
      </div>
      <button class="view-all-btn">View All</button>
    </div>

    <!-- Removed overflow-y:auto container, simplified structure -->
    <div class="ms-list-container">
      <div v-if="!milestones || milestones.length === 0" class="empty-state">
        <Flag :size="24" />
        <p>No milestones yet</p>
      </div>

      <div class="ms-list" v-else>
        <!-- Header Row -->
        <div class="ms-row header">
           <div class="col-status"></div>
           <div class="col-name">Name</div>
           <div class="col-date">Due Date</div>
           <div class="col-flag">Status</div>
        </div>

        <!-- Render top 5 only, no scroll -->
        <div v-for="m in sortedMilestones" :key="m.id" class="ms-row item">
           <!-- Status Dot/Icon -->
           <div class="col-status">
              <div class="status-indicator" :class="m.status">
                 <Check v-if="m.status === 'completed'" :size="10" stroke-width="4" />
                 <div v-else class="pulse-dot"></div>
              </div>
           </div>

           <!-- Name -->
           <div class="col-name">
              <span class="ms-title" :title="m.name">{{ m.name }}</span>
              <span class="ms-desc" v-if="m.description">{{ truncate(m.description) }}</span>
           </div>

           <!-- Date -->
           <div class="col-date">
              <span :class="{ 'expired': isExpired(m) }">{{ formatShortDate(m.due_date) }}</span>
           </div>

           <!-- Status Tag -->
           <div class="col-flag">
              <span class="ms-tag" :class="m.status">{{ formatStatus(m.status) }}</span>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Flag, Check } from 'lucide-vue-next'

const props = defineProps({
  milestones: { type: Array, default: () => [] }
})

const sortedMilestones = computed(() => {
  // Strict limit of 5 to fit in card without scrolling
  return [...props.milestones].sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5)
})

const formatShortDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'
const truncate = (str) => str.length > 30 ? str.substring(0, 30) + '...' : str

const formatStatus = (s) => {
  if (!s) return 'Pending'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const isExpired = (m) => {
  return m.status !== 'completed' && new Date(m.due_date) < new Date()
}
</script>

<style scoped>
.glass-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
  /* Removed fixed height constraint or allowed flex growth naturally without inner scroll */
  min-height: 380px; 
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.icon-box { 
  width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); 
  border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #a1a1aa;
}
h3 { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin: 0; }

.view-all-btn {
  background: none; border: none; font-size: 12px; color: #fbbf24;
  cursor: pointer; font-weight: 500; transition: opacity 0.2s;
}
.view-all-btn:hover { opacity: 0.8; }

.ms-list-container { flex: 1; display: flex; flex-direction: column; }
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #71717a; gap: 8px; font-size: 13px; }

/* Table-like List Layout */
.ms-list { display: flex; flex-direction: column; width: 100%; }
.ms-row { 
  display: grid; grid-template-columns: 32px 3fr 1.5fr 1.2fr; 
  align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03); 
}
.ms-row:last-child { border-bottom: none; }

.header { font-size: 11px; text-transform: uppercase; color: rgba(255, 255, 255, 0.3); font-weight: 600; letter-spacing: 0.05em; padding-bottom: 8px; }
.item { transition: background 0.2s; border-radius: 8px; padding: 14px 6px; margin: 0 -6px; }
.item:hover { background: rgba(255, 255, 255, 0.03); }

/* Column Styles */
.col-status { display: flex; justify-content: center; }
.status-indicator {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
}
.status-indicator.completed { background: #fbbf24; border-color: #fbbf24; color: #000; }
.status-indicator.pending { border-color: #fbbf24; }
.status-indicator.pending .pulse-dot { width: 6px; height: 6px; background: #fbbf24; border-radius: 50%; }

.col-name { display: flex; flex-direction: column; overflow: hidden; }
.ms-title { font-size: 13px; font-weight: 500; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-desc { font-size: 11px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

.col-date { font-size: 12px; color: #a1a1aa; font-family: 'SF Mono', monospace; text-align: right; padding-right: 12px; }
.expired { color: #f87171; font-weight: 600; }

.col-flag { display: flex; justify-content: flex-end; }
.ms-tag { 
  font-size: 10px; padding: 2px 8px; border-radius: 10px; 
  text-transform: capitalize; border: 1px solid transparent; 
}
.ms-tag.completed { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border-color: rgba(245, 158, 11, 0.28); }
.ms-tag.pending { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-color: rgba(251, 191, 36, 0.2); }
.ms-tag.blocked { background: rgba(248, 113, 113, 0.1); color: #f87171; border-color: rgba(248, 113, 113, 0.2); }
</style>
