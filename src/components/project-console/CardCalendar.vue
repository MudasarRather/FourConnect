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
  background: linear-gradient(135deg, rgba(40, 40, 45, 0.50), rgba(28, 28, 32, 0.45));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 18px;
  min-width: 240px;
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  display: flex; flex-direction: column; gap: 12px;
  position: relative; overflow: hidden;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.30s ease, box-shadow 0.30s ease, border-color 0.30s ease;
}
.calendar-card:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 158, 11, 0.25);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.calendar-card::before {
  content: "";
  position: absolute;
  top: -60px; right: -60px;
  width: 160px; height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.22), transparent 70%);
  filter: blur(30px);
  pointer-events: none;
  animation: cal-orb 12s ease-in-out infinite;
}
.calendar-card > * { position: relative; z-index: 1; }

@keyframes cal-orb {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-15px, 25px); }
}

.cal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.cal-month { font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.10em; }

.nav-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 7px;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}
.nav-btn:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}
.nav-btn:active { transform: scale(0.92); }

.days-left-badge-row { display: flex; justify-content: center; margin-bottom: 2px; }
.days-left-badge {
  font-size: 9px; padding: 4px 10px; border-radius: 20px;
  font-weight: 700; letter-spacing: 0.05em;
  position: relative;
  animation: badge-breathe 3s ease-in-out infinite;
}
.days-left-badge.good {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(245, 158, 11, 0.08));
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.18);
}
.days-left-badge.warning {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(251, 191, 36, 0.08));
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.35);
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.18);
}
.days-left-badge.critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.20), rgba(239, 68, 68, 0.08));
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.35);
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.20);
}

@keyframes badge-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
.day-head { font-size: 9px; color: rgba(245, 158, 11, 0.55); font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }

.day-cell {
  height: 26px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: rgba(255, 255, 255, 0.85);
  border-radius: 7px; position: relative;
  transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease, box-shadow 0.20s ease;
}
.day-cell.today {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff; font-weight: 700;
  box-shadow: 0 4px 16px rgba(249, 115, 22, 0.50);
  animation: today-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  z-index: 2;
}
.day-cell.today::before {
  content: "";
  position: absolute; inset: -3px;
  border-radius: 9px;
  border: 1.5px solid rgba(245, 158, 11, 0.50);
  animation: today-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}
.day-cell.pre-start { opacity: 0.25; }
.day-cell:not(.today):not(.empty):hover {
  background: rgba(245, 158, 11, 0.14);
  color: #fff;
  transform: scale(1.06);
}

@keyframes today-pulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(249, 115, 22, 0.50); }
  50% { box-shadow: 0 6px 22px rgba(249, 115, 22, 0.75); }
}
@keyframes today-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.35); opacity: 0; }
}

.marker-overlay {
  position: absolute; display: flex; align-items: center; justify-content: center;
  color: #fb923c; opacity: 0.9;
  transform: rotate(-10deg);
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .calendar-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.82), rgba(255, 247, 230, 0.70));
  border-color: rgba(217, 119, 6, 0.20);
  box-shadow:
    0 10px 30px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .calendar-card:hover {
  border-color: rgba(217, 119, 6, 0.45);
  box-shadow:
    0 16px 40px rgba(40, 25, 10, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.60);
}
[data-theme="light"] .calendar-card::before {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.28), transparent 70%);
}

[data-theme="light"] .cal-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .cal-month { color: var(--text-primary); }

[data-theme="light"] .nav-btn {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .nav-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.45);
  color: #92400e;
}

[data-theme="light"] .days-left-badge.good {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20), rgba(217, 119, 6, 0.08));
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 0 14px rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .days-left-badge.warning {
  background: linear-gradient(135deg, rgba(234, 88, 12, 0.18), rgba(234, 88, 12, 0.06));
  color: #c2410c;
  border-color: rgba(234, 88, 12, 0.40);
  box-shadow: 0 0 14px rgba(234, 88, 12, 0.20);
}
[data-theme="light"] .days-left-badge.critical {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.14), rgba(220, 38, 38, 0.04));
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.40);
  box-shadow: 0 0 14px rgba(220, 38, 38, 0.20);
}

[data-theme="light"] .day-head { color: #b45309; }
[data-theme="light"] .day-cell { color: var(--text-primary); }
[data-theme="light"] .day-cell.today {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 4px 16px rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .day-cell.today::before {
  border-color: rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .day-cell.pre-start { opacity: 0.30; color: #92400e; }
[data-theme="light"] .day-cell:not(.today):not(.empty):hover {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}
[data-theme="light"] .marker-overlay { color: #c2410c; }
</style>
