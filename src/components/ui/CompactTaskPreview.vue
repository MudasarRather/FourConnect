<template>
  <div class="task-preview-container">
    <!-- Header Row -->
    <div class="preview-header">
       <span class="col-idx">#</span>
       <span class="col-name">Task Name</span>
        <div class="col-meta">
           <span class="col-time">Time</span>
        </div>
    </div>
    
    <div class="task-list-flow" v-if="tasks.length > 0">
       <div v-for="(task, index) in tasks" :key="index" class="task-row-preview">
          <div class="task-idx">{{ index + 1 }}</div>
          <div class="task-name">{{ task.name }}</div>
          <div class="task-meta-val">
             <span class="time-pill">{{ formatTime(task.estimated_minutes) }}</span>
          </div>
       </div>
    </div>
    <div v-else class="empty-state">No tasks breakdown.</div>
    
    <div class="footer-total" v-if="tasks.length > 0">
       <span>Total Estimated Time</span>
       <span class="total-val">{{ totalFormatted }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] }
})

const formatTime = (mins) => {
    if (!mins) return '0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const totalFormatted = computed(() => {
    const total = props.tasks.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0)
    return formatTime(total)
})
</script>

<style scoped>
.task-preview-container {
    display: flex; flex-direction: column; gap: 0;
    width: 100%; margin-top: 8px;
    background: rgba(255,255,255,0.02);
    border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);
    overflow: hidden; /* Contains children, no scroll */
}

.preview-header {
    display: flex; align-items: center; padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
}

.col-idx { width: 24px; font-size: 10px; color: rgba(255,255,255,0.3); font-weight: 700; }
.col-name { flex: 1; font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.col-meta { display: flex; gap: 16px; width: 100px; justify-content: flex-end; }
.col-time, .col-weight { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600; min-width: 40px; text-align: right; }

.task-list-flow {
  display: flex; flex-direction: column; 
}

.task-row-preview {
  display: flex; align-items: center; padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  transition: background 0.15s;
}
.task-row-preview:last-child { border-bottom: none; }
.task-row-preview:hover { background: rgba(255,255,255,0.02); }

.task-idx { width: 24px; font-size: 11px; color: rgba(255,255,255,0.3); font-family: 'SF Mono', monospace; }
.task-name { 
    flex: 1; 
    font-size: 13px; 
    color: #f5f5f7; 
    font-weight: 400; 
    
    /* Overflow Logic */
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis;
    min-width: 0; /* Required for flexbox truncation */
    padding-right: 12px;
}

.task-meta-val { display: flex; gap: 16px; width: 100px; justify-content: flex-end; align-items: center; }

.time-pill { 
    font-size: 12px; color: rgba(255,255,255,0.7); 
    font-family: 'SF Mono', monospace; 
    min-width: 40px; text-align: right; 
}

.weight-pill { 
    font-size: 11px; color: #3b82f6; 
    background: rgba(59, 130, 246, 0.1); 
    padding: 2px 6px; border-radius: 4px; 
    min-width: 40px; text-align: center;
}

.empty-state { padding: 16px; font-size: 13px; color: rgba(255,255,255,0.3); text-align: center; font-style: italic; }

.footer-total {
    display: flex; justify-content: space-between; padding: 10px 12px;
    background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);
    font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 500;
}
.total-val { color: #f5f5f7; font-weight: 600; font-family: 'SF Mono', monospace; }
</style>
