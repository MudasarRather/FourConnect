<template>
  <div class="glass-card timeline-wrapper">
    <!-- Header Controls -->
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><Calendar :size="16" /></div>
        <h3>Project Roadmap</h3>
      </div>
      
      <!-- Legend -->
      <div class="legend">
        <div class="l-item pending"><span class="l-dot"></span>Pending</div>
        <div class="l-item in_progress"><span class="l-dot"></span>In Progress</div>
        <div class="l-item completed"><span class="l-dot"></span>Completed</div>
      </div>
    </div>

    <!-- Main Gantt Container -->
    <div class="gantt-container" ref="timelineRef">
       
       <!-- Left Column: Milestone Info (Sticky) -->
       <div class="gantt-sidebar">
          <div class="sidebar-header">Milestones</div>
          <div class="sidebar-body">
             <div v-for="m in computedMilestones" :key="m.id" class="sidebar-row">
                <div class="m-info">
                   <span class="m-name" :title="m.name">{{ m.name }}</span>
                   <span class="m-meta">{{ formatDate(m.start_date) }}</span>
                </div>
             </div>
          </div>
       </div>

       <!-- Right Column: Timeline Bars (Scrollable) -->
       <div class="gantt-chart-area">
          <!-- Calendar Header -->
          <div class="chart-header">
             <div 
               v-for="month in months" 
               :key="month.key" 
               class="month-block"
               :style="{ left: month.left + '%', width: month.width + '%' }"
             >
                <span class="month-label">{{ month.label }}</span>
             </div>
          </div>

          <!-- Chart Body -->
          <div class="chart-body">
             <!-- Vertical Grid Lines -->
             <div class="grid-layer">
                <div v-for="line in gridLines" :key="line.key" 
                     class="grid-line" 
                     :class="{ 'current-time': line.isToday }" 
                     :style="{ left: line.left + '%' }">
                </div>
             </div>

             <!-- Rows & Bars -->
             <div class="rows-layer">
                <div v-for="m in computedMilestones" :key="m.id" class="chart-row">
                   <!-- Bar Wrapper (Positioning) -->
                   <div 
                     class="gantt-bar-wrapper" 
                     :style="{ left: m.left + '%', width: m.width + '%' }"
                     @mouseenter="(e) => showPopover(e, m)"
                     @mouseleave="hidePopover"
                   >
                      <!-- The Actual Styled Bar (Clipped) -->
                      <div class="gantt-bar-inner" :class="m.status">
                          <div class="bar-progress" v-if="getTaskProgress(m) > 0" :style="{ width: getTaskProgress(m) + '%' }"></div>
                      </div>

                      <!-- Avatars (Overlay, No Overflow Hidden) -->
                      <div class="bar-avatars">
                         <div v-for="assign in (m.assignments || []).slice(0, 4)" :key="assign.id" class="b-av">
                            <img v-if="assign.user?.avatar_url" :src="assign.user.avatar_url" />
                            <div v-else class="b-av-ph">{{ getInitials(assign.user?.full_name) }}</div>
                         </div>
                         <div v-if="(m.assignments || []).length > 4" class="b-av-more">+{{ (m.assignments || []).length - 4 }}</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- Premium Popover -->
    <Teleport to="body">
      <transition name="pop-fade">
         <div v-if="hoveredMilestone" class="popover-card" :style="popoverStyle">
            <div class="pop-header">
               <div class="ph-top">
                  <h4>{{ hoveredMilestone.name }}</h4>
                  <span class="ph-meta">{{ getTaskProgress(hoveredMilestone) }}%</span>
               </div>
               <div class="ph-bar-track">
                  <div class="ph-bar-fill" :class="hoveredMilestone.status" :style="{ width: getTaskProgress(hoveredMilestone) + '%' }"></div>
               </div>
            </div>
            
            <div class="pop-body">
               <div class="pop-tasks">
                  <div v-for="task in (hoveredMilestone.tasks || []).slice(0, 4)" :key="task.id" class="pt-row">
                     <div class="pt-check" :class="{ checked: task.is_completed }">
                        <svg v-if="task.is_completed" viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <span class="pt-name" :class="{ done: task.is_completed }">{{ task.name }}</span>
                  </div>
                  <div v-if="(hoveredMilestone.tasks || []).length === 0" class="pt-empty">No tasks defined</div>
               </div>

               <div class="pop-footer">
                  <div class="pf-stat">
                     <span class="lbl">Timeline</span>
                     <span class="val">{{ formatDate(hoveredMilestone.start_date) }} - {{ formatDate(hoveredMilestone.due_date) }}</span>
                  </div>
               </div>
            </div>
         </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue' 
import { Calendar } from 'lucide-vue-next'

const props = defineProps({
  milestones: { type: Array, default: () => [] }
})

const timelineRef = ref(null)
const hoveredMilestone = ref(null)
const anchorRect = ref(null) 

const showPopover = (e, m) => { 
  hoveredMilestone.value = m 
  const rect = e.currentTarget.getBoundingClientRect()
  anchorRect.value = {
    top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height
  }
}
const hidePopover = () => { 
  hoveredMilestone.value = null 
  anchorRect.value = null
}

const getTaskProgress = (m) => {
  if (!m.tasks || m.tasks.length === 0) return Math.round(m.contribution_percentage || 0)
  const done = m.tasks.filter(t => t.is_completed).length
  return Math.round((done / m.tasks.length) * 100)
}

const popoverStyle = computed(() => {
  if (!hoveredMilestone.value || !anchorRect.value) return {}
  const cardWidth = 280
  const cardHeight = 220 
  const gap = 12
  let left = anchorRect.value.left + (anchorRect.value.width / 2) - (cardWidth / 2)
  let top = anchorRect.value.bottom + gap
  if (left < 10) left = 10
  if (left + cardWidth > window.innerWidth - 10) left = window.innerWidth - cardWidth - 10
  if (top + cardHeight > window.innerHeight - 10) top = anchorRect.value.top - cardHeight - gap
  return { top: top + 'px', left: left + 'px', position: 'fixed' }
})

const getInitials = (n) => n ? n.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase() : 'U'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

const dateRange = computed(() => {
  if (!props.milestones.length) return { start: new Date(), end: new Date(), total: 1 }
  let min = new Date()
  let max = new Date()
  
  props.milestones.forEach(m => {
    const s = m.start_date ? new Date(m.start_date) : new Date()
    const e = m.due_date ? new Date(m.due_date) : new Date()
    if (s < min) min = s
    if (e > max) max = e
  })
  
  // Add padding
  min.setDate(min.getDate() - 7)
  max.setDate(max.getDate() + 14)
  return { start: min, end: max, total: max - min }
})

const getPercent = (dStr) => {
  const d = new Date(dStr || new Date())
  const r = dateRange.value
  return Math.max(0, Math.min(100, ((d - r.start) / r.total) * 100))
}

const computedMilestones = computed(() => {
  return props.milestones.map(m => {
    const startP = getPercent(m.start_date)
    const endP = getPercent(m.due_date)
    return { ...m, left: startP, width: Math.max(1, endP - startP) } 
  })
})

const months = computed(() => {
  const r = dateRange.value
  const ms = []
  let curr = new Date(r.start)
  curr.setDate(1) // Snap to 1st
  if (curr < r.start) curr.setMonth(curr.getMonth() + 1) // Ensure inside if needed, mostly fine to start overlap

  // Adjust loop to cover range
  const loopEnd = new Date(r.end)
  loopEnd.setMonth(loopEnd.getMonth() + 1)

  // Start iteration
  let iter = new Date(r.start)
  iter.setDate(1) 
  
  while (iter < loopEnd) {
     const next = new Date(iter)
     next.setMonth(next.getMonth() + 1)
     
     const startTs = Math.max(iter.getTime(), r.start.getTime())
     const endTs = Math.min(next.getTime(), r.end.getTime())
     
     if (startTs < endTs) {
        ms.push({
           key: iter.toISOString(),
           label: iter.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
           left: getPercent(new Date(startTs)),
           width: getPercent(new Date(endTs)) - getPercent(new Date(startTs))
        })
     }
     iter = next
  }
  return ms
})

const gridLines = computed(() => {
  // Use months for major grid lines
  const lines = months.value.map(m => ({ key: m.key, left: m.left, isToday: false }))
  const now = new Date()
  if (now >= dateRange.value.start && now <= dateRange.value.end) {
    lines.push({ key: 'today', left: getPercent(now), isToday: true })
  }
  return lines
})
</script>

<style scoped>
.glass-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
  margin-top: 24px;
}

/* Header */
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.icon-box {
  width: 32px; height: 32px; background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fbbf24;
}
h3 { font-size: 16px; font-weight: 600; color: white; margin: 0; }

.legend { display: flex; gap: 16px; }
.l-item { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 6px; }
.l-dot { width: 6px; height: 6px; border-radius: 50%; }
.l-item.pending .l-dot { background: #eab308; box-shadow: 0 0 6px rgba(234, 179, 8, 0.4); }
.l-item.in_progress .l-dot { background: #f97316; box-shadow: 0 0 6px rgba(249, 115, 22, 0.4); }
.l-item.completed .l-dot { background: #fbbf24; box-shadow: 0 0 6px rgba(251, 191, 36, 0.5); }

/* Gantt Layout */
.gantt-container {
  display: flex; 
  border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
  overflow: hidden; background: rgba(0,0,0,0.2);
}

/* Sidebar */
.gantt-sidebar {
  width: 200px; flex-shrink: 0;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: rgba(30,30,33,0.3);
}
.sidebar-header {
  height: 48px; border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; padding: 0 16px;
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase;
  background: rgba(40,40,45,0.4);
}
.sidebar-row {
  height: 48px; border-bottom: 1px solid rgba(255,255,255,0.04);
  display: flex; align-items: center; padding: 0 16px;
}
.m-info { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.m-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-meta { font-size: 11px; color: rgba(255,255,255,0.4); }

/* Chart Area */
.gantt-chart-area {
  flex: 1; overflow-x: auto; position: relative;
  /* Hide scrollbar strictly */
  scrollbar-width: none;
}
.gantt-chart-area::-webkit-scrollbar { display: none; }

.chart-header {
  height: 48px; border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative; min-width: 100%; width: 800px; /* Min scroll width */
  background: rgba(40,40,45,0.4);
}
.month-block {
  position: absolute; height: 100%; top: 0; 
  display: flex; align-items: center; padding-left: 8px;
  border-left: 1px solid rgba(255,255,255,0.04);
}
.month-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; }

.chart-body { position: relative; width: 800px; /* Match Header */ }
.chart-row { height: 48px; border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; }
.chart-row:hover { background: rgba(255,255,255,0.02); }

.grid-layer { position: absolute; inset: 0; pointer-events: none; }
.grid-line { position: absolute; height: 100%; border-left: 1px dashed rgba(255,255,255,0.04); }
.grid-line.current-time { border-left: 2px solid #ef4444; z-index: 10; }

/* Gantt Bars */
.gantt-bar-wrapper {
  position: absolute; top: 10px; height: 28px;
  cursor: pointer; z-index: 5;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.gantt-bar-wrapper:hover { transform: translateY(-1px); z-index: 10; filter: brightness(1.1); }

.gantt-bar-inner {
  width: 100%; height: 100%;
  border-radius: 6px; overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.gantt-bar-inner.pending { background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.3); }
.gantt-bar-inner.pending .bar-progress { background: #eab308; }

.gantt-bar-inner.in_progress { background: rgba(249, 115, 22, 0.2); border: 1px solid rgba(249, 115, 22, 0.3); }
.gantt-bar-inner.in_progress .bar-progress { background: #f97316; }

.gantt-bar-inner.completed { background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.32); }
.gantt-bar-inner.completed .bar-progress { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

.bar-progress { height: 100%; opacity: 0.8; }

.bar-avatars { 
  position: absolute; top: 0; right: 4px; bottom: 0; 
  display: flex; align-items: center; pointer-events: none;
}
.b-av { width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); margin-left: -8px; background: #27272a; position: relative; z-index: 2; }
.b-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.b-av-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: white; }
.b-av-more { 
  font-size: 9px; color: white; background: rgba(0,0,0,0.5); padding: 2px 4px; border-radius: 4px; margin-left: -4px; z-index: 3;
}

/* Popover Matches Previous Style */
.popover-card {
  position: fixed; z-index: 9999; width: 260px;
  background: #18181b; 
  border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6); overflow: hidden;
}
.pop-header { background: rgba(255,255,255,0.03); padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.ph-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
.ph-top h4 { font-size: 13px; font-weight: 600; color: white; margin: 0; }
.ph-meta { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); }
.ph-bar-track { height: 3px; background: rgba(255,255,255,0.1); border-radius: 1.5px; }
.ph-bar-fill { height: 100%; border-radius: 1.5px; }
.ph-bar-fill.pending { background: #eab308; }
.ph-bar-fill.in_progress { background: #f97316; }
.ph-bar-fill.completed { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

.pop-body { padding: 12px 16px; }
.pop-tasks { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.pt-row { display: flex; align-items: center; gap: 8px; }
.pt-check { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; }
.pt-check.checked { background: #f97316; border-color: #f97316; color: white; }
.pt-name { font-size: 11px; color: rgba(255,255,255,0.7); overflow: hidden; text-overflow: ellipsis; }
.pop-footer { padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
.pf-stat { display: flex; flex-direction: column; }
.lbl { font-size: 9px; text-transform: uppercase; color: rgba(255,255,255,0.4); }
.val { font-size: 11px; color: white; }

.pop-fade-enter-active, .pop-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.pop-fade-enter-from, .pop-fade-leave-to { opacity: 0; transform: scale(0.96); }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] h3 { color: var(--text-primary); }
[data-theme="light"] .icon-box {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.32);
  color: #b45309;
}
[data-theme="light"] .legend .l-item { color: #6b5840; }

/* Gantt container — preserve separators */
[data-theme="light"] .gantt-container {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .gantt-sidebar {
  background: rgba(255, 250, 240, 0.55);
  border-right-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .sidebar-header {
  background: rgba(217, 119, 6, 0.08);
  border-bottom-color: rgba(40, 25, 10, 0.10);
  color: #b45309;
}
[data-theme="light"] .sidebar-row { border-bottom-color: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .m-name { color: var(--text-primary); }
[data-theme="light"] .m-meta { color: #6b5840; }

[data-theme="light"] .chart-header {
  background: rgba(217, 119, 6, 0.08);
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .month-block { border-left-color: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .month-label { color: #92400e; }

[data-theme="light"] .chart-row { border-bottom-color: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .chart-row:hover { background: rgba(217, 119, 6, 0.05); }
[data-theme="light"] .grid-line { border-left-color: rgba(40, 25, 10, 0.06); }
[data-theme="light"] .grid-line.current-time { border-left-color: #dc2626; }

/* Gantt bars — keep the same warm palette */
[data-theme="light"] .gantt-bar-inner.pending {
  background: rgba(234, 179, 8, 0.25);
  border-color: rgba(234, 179, 8, 0.50);
}
[data-theme="light"] .gantt-bar-inner.in_progress {
  background: rgba(249, 115, 22, 0.25);
  border-color: rgba(249, 115, 22, 0.50);
}
[data-theme="light"] .gantt-bar-inner.completed {
  background: rgba(217, 119, 6, 0.22);
  border-color: rgba(217, 119, 6, 0.50);
}

[data-theme="light"] .b-av { border-color: rgba(40, 25, 10, 0.20); background: #faf7f0; }
[data-theme="light"] .b-av-ph { color: var(--text-primary); }
[data-theme="light"] .b-av-more {
  color: #fff;
  background: rgba(217, 119, 6, 0.85);
}

/* Popover — frosted cream */
[data-theme="light"] .popover-card {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow: 0 12px 40px rgba(40, 25, 10, 0.30);
  backdrop-filter: blur(20px);
}
[data-theme="light"] .pop-header {
  background: rgba(217, 119, 6, 0.06);
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .ph-top h4 { color: var(--text-primary); }
[data-theme="light"] .ph-meta { color: #6b5840; }
[data-theme="light"] .ph-bar-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .pt-check { border-color: rgba(40, 25, 10, 0.30); }
[data-theme="light"] .pt-check.checked { background: #d97706; border-color: #d97706; color: #fff; }
[data-theme="light"] .pt-name { color: #6b5840; }
[data-theme="light"] .pop-footer { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .lbl { color: #92400e; }
[data-theme="light"] .val { color: var(--text-primary); }
</style>
