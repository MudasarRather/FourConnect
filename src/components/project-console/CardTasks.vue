<template>
  <div class="glass-card">
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><CheckSquare :size="16" /></div>
        <h3>Tasks</h3>
      </div>
      <span class="badge">Sprint 4</span>
    </div>

    <div class="tasks-content">
      <!-- Donut Chart Wrapper -->
      <div class="chart-section">
        <div class="donut-wrapper">
          <svg viewBox="0 0 36 36" class="donut-chart">
            <path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="fill" :stroke-dasharray="completion + ', 100'" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="center-text">
            <span class="num">{{ completion }}%</span>
          </div>
        </div>
      </div>

      <div class="legend-section">
        <div class="legend-item">
          <div class="dot pending"></div>
          <span>{{ stats.pending }} Pending</span>
        </div>
        <div class="legend-item">
          <div class="dot in-progress"></div>
          <span>{{ stats.inProgress }} In Progress</span>
        </div>
        <div class="legend-item">
          <div class="dot done"></div>
          <span>{{ stats.done }} Done</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CheckSquare } from 'lucide-vue-next'

// Mock Data as requested "put dummy data in that"
const stats = {
  pending: 12,
  inProgress: 8,
  done: 22
}

const total = stats.pending + stats.inProgress + stats.done
const completion = computed(() => Math.round((stats.done / total) * 100))
</script>

<style scoped>
.glass-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.icon-box { 
  width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); 
  border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #a1a1aa;
}
h3 { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin: 0; }
.badge { font-size: 10px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 4px 8px; border-radius: 6px; }

.tasks-content { display: flex; align-items: center; gap: 24px; }
.chart-section { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
.donut-chart { width: 100%; height: 100%; transform: rotate(0deg); } /* Keep simple */
.bg { fill: none; stroke: rgba(255, 255, 255, 0.05); stroke-width: 3; }
.fill { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 1s ease; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.5)); }
.center-text { 
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
  display: flex; align-items: center; justify-content: center;
}
.num { font-size: 16px; font-weight: 700; color: white; }

.legend-section { display: flex; flex-direction: column; gap: 8px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #a1a1aa; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.pending { background: #3f3f46; }
.in-progress { background: #f97316; }
.done { background: #fbbf24; }
</style>
