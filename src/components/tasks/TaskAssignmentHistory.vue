<template>
  <div class="assignment-history">
    <div class="history-header">
      <div class="header-left">
        <Activity :size="16" class="icon" />
        <h3 class="title">Assignment Timeline</h3>
      </div>
      <div class="history-badge">{{ logs.length }} Events</div>
    </div>

    <div class="timeline-container">
      <div v-if="loading" class="timeline-loader">
        <Loader2 class="spin" :size="24" />
      </div>
      <div v-else-if="logs.length === 0" class="timeline-empty">
        <div class="empty-orb"></div>
        <History :size="32" class="empty-icon" />
        <p>No assignment records yet.</p>
      </div>
      <div v-else class="timeline-list">
        <div v-for="(log, index) in logs" :key="log.id" class="timeline-item" :style="{ '--delay': index * 0.1 + 's' }">
          <div class="item-line"></div>
          <div class="item-dot"></div>
          
          <div class="item-card">
            <div class="card-header">
              <span class="action-type">{{ formatAction(log.assignment_type) }}</span>
              <span class="timestamp">{{ timeAgo(log.assigned_at) }}</span>
            </div>
            
            <div class="card-content">
              <div class="flow-preview">
                <span class="user">{{ log.previous_assignee_name || 'Unassigned' }}</span>
                <ArrowRight :size="12" class="arrow" />
                <span class="user highlight">{{ log.new_assignee_name }}</span>
              </div>
              
              <div v-if="log.notes" class="notes-block">
                <Quote :size="12" class="quote-icon" />
                <p>{{ log.notes }}</p>
              </div>
            </div>
            
            <div class="card-footer">
              <div class="assigned-by">
                <div class="meta-label">BY</div>
                <div class="meta-val">{{ log.assigned_by_name }}</div>
              </div>
              <div class="role-badge" v-if="log.role">
                {{ log.role }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Activity, Loader2, History, ArrowRight, Quote } from 'lucide-vue-next'
import axios from 'axios'

const props = defineProps({
  taskId: { type: String, required: true }
})

const logs = ref([])
const loading = ref(false)

const fetchHistory = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    const res = await axios.get(`http://localhost:8000/api/tasks/${props.taskId}/assignments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    logs.value = res.data
  } catch (e) {
    console.error('Failed to fetch history:', e)
  } finally {
    loading.value = false
  }
}

const formatAction = (type) => {
  return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
  } catch (e) {
    return dateStr
  }
}

onMounted(fetchHistory)

defineExpose({ refresh: fetchHistory })
</script>

<style scoped>
.assignment-history {
  width: 100%;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  overflow: hidden;
}

.history-header {
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left .icon { color: #facc15; }
.title { font-size: 15px; font-weight: 700; color: white; margin: 0; }

.history-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.timeline-container {
  padding: 24px;
  max-height: 500px;
  overflow-y: auto;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  animation: slideFadeIn 0.5s ease backwards;
  animation-delay: var(--delay);
}

.item-line {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: -44px;
  width: 2px;
  background: linear-gradient(to bottom, #facc15, transparent);
  opacity: 0.1;
}

.timeline-item:last-child .item-line { display: none; }

.item-dot {
  position: absolute;
  left: -4px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #facc15;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
}

.item-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.3s;
}

.item-card:hover { border-color: rgba(250, 204, 21, 0.2); transform: translateX(4px); }

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.action-type { font-size: 11px; font-weight: 700; color: #facc15; letter-spacing: 1px; }
.timestamp { font-size: 10px; color: rgba(255, 255, 255, 0.3); }

.flow-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.user { color: rgba(255, 255, 255, 0.5); }
.user.highlight { color: white; }
.arrow { color: #facc15; opacity: 0.5; }

.notes-block {
  margin-top: 12px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  gap: 10px;
}

.quote-icon { color: rgba(255, 255, 255, 0.1); flex-shrink: 0; }
.notes-block p { font-size: 12px; font-style: italic; color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.4; }

.card-footer {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assigned-by { display: flex; align-items: center; gap: 8px; }
.meta-label { font-size: 8px; color: rgba(255, 255, 255, 0.2); font-weight: 800; }
.meta-val { font-size: 12px; color: rgba(255, 255, 255, 0.6); font-weight: 600; }

.role-badge {
  font-size: 9px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
}

.timeline-empty {
  padding: 60px 20px;
  text-align: center;
  position: relative;
}

.empty-icon { color: rgba(255, 255, 255, 0.05); margin-bottom: 12px; }
.timeline-empty p { font-size: 13px; color: rgba(255, 255, 255, 0.3); }

@keyframes slideFadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
