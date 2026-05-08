<template>
  <div class="calendar-card">
    <div class="cal-header">
       <button class="nav-btn" @click="prevMonth"><ChevronLeft :size="16" /></button>
       <span class="cal-month">{{ currentMonthName }}</span>
       <button class="nav-btn" @click="nextMonth"><ChevronRight :size="16" /></button>
       
       <!-- Moved badged to right or keep absolute? Let's keep it simple -->
       <!-- If spacing is tight, maybe move badge to bottom or just keep header fluid -->
    </div>
    <div class="days-left-badge-row">
         <div class="days-left-badge" :class="statusColor">
           {{ daysRemainingLabel }}
         </div>
    </div>
    
    <div class="cal-body">
      <div class="cal-grid">
         <div class="day-head" v-for="d in ['S','M','T','W','T','F','S']" :key="d">{{ d }}</div>
         
         <!-- Empty Start -->
         <div v-for="n in startOffset" :key="'e'+n" class="day-cell empty"></div>

         <!-- Days -->
         <div v-for="day in daysInMonth" :key="day" 
              class="day-cell" 
              :class="getDayClass(day)">
            
            <span class="day-num">{{ day }}</span>
            <div v-if="isPassed(day)" class="marker-overlay">
               <Slash :size="16" stroke-width="3" />
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Slash, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  startDate: String,
  endDate: String
})

const today = new Date()
// View state
const viewDate = ref(new Date())

const currentYear = computed(() => viewDate.value.getFullYear())
const currentMonth = computed(() => viewDate.value.getMonth())

const prevMonth = () => {
  viewDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}
const nextMonth = () => {
  viewDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate())
const startOffset = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay())
const currentMonthName = computed(() => viewDate.value.toLocaleString('default', { month: 'long', year: 'numeric' }))

const daysRemainingLabel = computed(() => {
  if (!props.endDate) return 'No Deadline'
  const end = new Date(props.endDate)
  // Fix time diff
  const todayReset = new Date().setHours(0,0,0,0)
  const endReset = new Date(end).setHours(0,0,0,0)
  
  const diffTime = endReset - todayReset
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
  
  if (diffDays < 0) return `${Math.abs(diffDays)} Days Overdue`
  return `${diffDays} Days Left`
})

const statusColor = computed(() => {
  const lbl = daysRemainingLabel.value
  if (lbl.includes('Overdue') || parseInt(lbl) < 3) return 'critical'
  if (parseInt(lbl) < 10) return 'warning'
  return 'good'
})

const getDayClass = (day) => {
  const d = new Date(currentYear.value, currentMonth.value, day)
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return 'today'
  
  // Optional: Visually dim days outside range
  if (props.startDate) {
     const start = new Date(props.startDate)
     start.setHours(0,0,0,0)
     if (d < start) return 'pre-start'
  }
  
  return ''
}

const isPassed = (day) => {
  const d = new Date(currentYear.value, currentMonth.value, day)
  d.setHours(0,0,0,0) // Normalize
  
  const now = new Date()
  now.setHours(0,0,0,0)
  
  // Rule 1: Must be in the past relative to REAL today
  if (d >= now) return false
  
  // Rule 2: Must be within Project Range [Start, End]
  // We don't cross out days before project starts
  if (props.startDate) {
     const start = new Date(props.startDate)
     start.setHours(0,0,0,0)
     if (d < start) return false
  }
  
  // Rule 3: Must be before or on End Date (if exists)
  // We don't cross out days AFTER the deadline.
  // "cross will be on 19th and 20th only" for Jan 19-20 project.
  if (props.endDate) {
     const end = new Date(props.endDate)
     end.setHours(0,0,0,0)
     if (d > end) return false
  }
  
  return true
}
</script>

<style scoped>
.calendar-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px; /* Compact padding */
  min-width: 220px; /* Reduced width */
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column; gap: 10px;
}

.cal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.cal-month { font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; letter-spacing: 0.05em; }

.nav-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); 
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 5px; transition: all 0.2s;
}
.nav-btn:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.1); }

.days-left-badge-row { display: flex; justify-content: center; margin-bottom: 2px; }
.days-left-badge {
  font-size: 9px; padding: 3px 8px; border-radius: 20px; font-weight: 600; letter-spacing: 0.02em;
}
/* Subtle, flat colors - no neon */
.days-left-badge.good { background: rgba(74, 222, 128, 0.15); color: #86efac; border: 1px solid rgba(74, 222, 128, 0.1); }
.days-left-badge.warning { background: rgba(251, 191, 36, 0.15); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.1); }
.days-left-badge.critical { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.1); }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
.day-head { font-size: 9px; color: rgba(255,255,255,0.4); font-weight: 600; margin-bottom: 2px; }

.day-cell { 
  height: 24px; /* Compact Height */
  display: flex; align-items: center; justify-content: center; 
  font-size: 11px; color: rgba(255,255,255,0.8); border-radius: 6px; position: relative;
  transition: all 0.2s;
}
.day-cell.today { background: rgba(59, 130, 246, 0.8); color: white; font-weight: 600; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2); }
.day-cell.pre-start { opacity: 0.2; } 
.day-cell:not(.today):not(.empty):hover { background: rgba(255,255,255,0.08); color: white; }

.marker-overlay {
  position: absolute; display: flex; align-items: center; justify-content: center;
  color: #fb923c; opacity: 0.9; 
  transform: rotate(-10deg);
}
</style>
