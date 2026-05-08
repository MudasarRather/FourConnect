<template>
  <div class="compact-date-picker" ref="triggerRef" :class="{ 'has-error': error, 'is-disabled': disabled }">
    <!-- Input Trigger -->
    <div 
      v-if="!iconOnly"
      class="compact-input" 
      :class="{ 'is-open': isOpen, 'has-value': !!modelValue }" 
      @click="!disabled && toggleCalendar()"
    >
      <div class="icon-wrapper">
        <Calendar :size="12" class="date-icon" />
      </div>
      <span class="date-text">{{ formattedDate || placeholder }}</span>
    </div>
    <button 
      v-else
      type="button"
      class="icon-trigger-btn"
      :class="{ 'is-open': isOpen }"
      @click="!disabled && toggleCalendar()"
    >
      <Calendar :size="14" />
    </button>

    <!-- Teleported Dropdown -->
    <Teleport to="body">
      <Transition name="fade-scale">
        <div 
          v-if="isOpen" 
          class="compact-dropdown"
          :style="dropdownStyle"
          ref="dropdownRef"
          @click.stop
        >
          <!-- Header -->
          <div class="calendar-header">
            <button type="button" class="nav-btn" @click="prevMonth">
              <ChevronLeft :size="14" />
            </button>
            <span class="month-label">{{ monthYearDisplay }}</span>
            <button type="button" class="nav-btn" @click="nextMonth">
              <ChevronRight :size="14" />
            </button>
          </div>

          <!-- Days Header -->
          <div class="weekdays-row">
            <span v-for="d in weekdays" :key="d">{{ d }}</span>
          </div>

          <!-- Days Grid -->
          <div class="days-grid">
            <div
              v-for="(day, i) in calendarDays"
              :key="i"
              class="day-cell-wrapper"
            >
              <button
                type="button"
                class="day-cell"
                :class="{
                  'today': day.isToday,
                  'selected': day.isSelected,
                  'other-month': !day.isCurrentMonth,
                  'disabled': day.isDisabled,
                  'has-marker': day.hasMarker
                }"
                :disabled="day.isDisabled"
                @click="selectDate(day)"
              >
                {{ day.date }}
                <span v-if="day.hasMarker && !day.isSelected" class="marker-dot"></span>
              </button>
              
              <!-- Tooltip for marker -->
              <div v-if="day.hasMarker && day.markerTasks && day.markerTasks.length > 0" class="marker-tooltip">
                <div class="tooltip-header">Upcoming on this day</div>
                <div class="tooltip-list">
                  <div v-for="(task, idx) in day.markerTasks" :key="idx" class="tooltip-item">
                    <span class="dot"></span>
                    {{ task }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: String,
  placeholder: { type: String, default: 'Select Date' },
  minDate: String,
  maxDate: String,
  error: Boolean,
  disabled: Boolean,
  markers: { type: Array, default: () => [] },
  iconOnly: Boolean
})

const emit = defineEmits(['update:modelValue'])

const triggerRef = ref(null)
const dropdownRef = ref(null)
const isOpen = ref(false)
const dropdownStyle = ref({})

// Date Logic
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())
const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Formatters
const formattedDate = computed(() => {
  if (!props.modelValue) return ''
  return new Date(props.modelValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

const monthYearDisplay = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startPadding = firstDay.getDay()
  
  const today = new Date()
  today.setHours(0,0,0,0)
  
  const selected = props.modelValue ? new Date(props.modelValue) : null
  if(selected) selected.setHours(0,0,0,0)
  
  const min = props.minDate ? new Date(props.minDate) : null
  if(min) min.setHours(0,0,0,0)
  
  const max = props.maxDate ? new Date(props.maxDate) : null
  if(max) max.setHours(23,59,59,999)

  // Previous Month Padding
  const prevLast = new Date(currentYear.value, currentMonth.value, 0).getDate()
  for (let i = startPadding - 1; i >= 0; i--) {
     const d = new Date(currentYear.value, currentMonth.value - 1, prevLast - i)
     days.push({ date: prevLast - i, fullDate: d, isCurrentMonth: false, isDisabled: true })
  }

  // Current Month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(currentYear.value, currentMonth.value, i)
    d.setHours(0,0,0,0)
    
    let isDisabled = false
    if (min && d < min) isDisabled = true
    if (max && d > max) isDisabled = true

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayMarkers = props.markers.filter(m => {
       const mDate = typeof m === 'string' ? m : m.date
       return mDate === dateKey
    })
    const hasMarker = dayMarkers.length > 0
    const markerTasks = dayMarkers.map(m => typeof m === 'string' ? 'Task' : m.title).filter(Boolean)

    days.push({
      date: i,
      fullDate: d,
      isCurrentMonth: true,
      isToday: d.getTime() === today.getTime(),
      isSelected: selected && d.getTime() === selected.getTime(),
      isDisabled,
      hasMarker,
      markerTasks
    })
  }
  
  // Next Month Padding
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
     days.push({ date: i, fullDate: new Date(currentYear.value, currentMonth.value + 1, i), isCurrentMonth: false, isDisabled: true })
  }

  return days
})

// Positioning
const updatePosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  
  let top = rect.bottom + 8
  let left = rect.left
  
  // Bounds check (Flip up if at bottom) - Estimate height ~260px if dropdownRef missing
  const height = dropdownRef.value ? dropdownRef.value.offsetHeight : 260
  
  if (top + height > window.innerHeight) {
     top = rect.top - height - 8 // Flip up
  }

  // Prevent right overflow
  if (left + 220 > window.innerWidth) {
      left = window.innerWidth - 230
  }

  dropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 99999
  }
}

// Actions
// Actions
const toggleCalendar = async () => {
  if (props.disabled) return
  if (!isOpen.value) {
    // Pre-calc position to prevent jumping
    updatePosition()
    isOpen.value = true
    
    await nextTick()
    // Re-calc with actual dimensions
    updatePosition()
    
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    document.addEventListener('click', handleClickOutside)
  } else {
    close()
  }
}

const close = () => {
  isOpen.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('click', handleClickOutside)
}

const selectDate = (day) => {
  if (day.isDisabled) return
  const d = day.fullDate
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  emit('update:modelValue', `${year}-${month}-${date}`)
  close()
}

const prevMonth = () => {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value--; } 
  else { currentMonth.value--; }
}

const nextMonth = () => {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++; } 
  else { currentMonth.value++; }
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target) && !triggerRef.value.contains(e.target)) {
    close()
  }
}
</script>

<style scoped>
.compact-date-picker {
  position: relative;
  width: auto;
  flex-shrink: 0;
  display: inline-block;
}

.compact-input {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  height: 48px;
}
.compact-input:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }
.compact-input.is-open { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); box-shadow: 0 0 20px rgba(245, 158, 11, 0.1); }

.icon-wrapper { color: rgba(255,255,255,0.5); display: flex; }
.date-text { font-size: 12px; font-weight: 500; color: #f5f5f7; }

/* Dropdown */
.compact-dropdown {
  width: 220px;
  background: #1e1e21; /* Solid dark grey */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  padding: 12px;
  user-select: none;
}

/* Header */
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.month-label { font-size: 13px; font-weight: 600; color: white; }
.nav-btn {
  background: transparent; border: none; color: rgba(255,255,255,0.4);
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer;
}
.nav-btn:hover { background: rgba(255,255,255,0.1); color: white; }

/* Grid */
.weekdays-row { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.weekdays-row span { text-align: center; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); }

.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }

.day-cell {
  background: transparent; border: none;
  height: 24px; width: 100%;
  border-radius: 4px;
  color: #e4e4e7; font-size: 11px;
  cursor: pointer;
}
.day-cell:hover:not(.disabled):not(.selected) { background: rgba(255,255,255,0.1); }
.day-cell.other-month { color: rgba(255,255,255,0.1); }
.day-cell.today { color: #f59e0b; font-weight: 700; }
.day-cell.selected { background: #f59e0b; color: #000; font-weight: 700; }
.day-cell.disabled { color: rgba(255,255,255,0.1); cursor: not-allowed; }

.icon-trigger-btn {
  background: rgba(250, 204, 21, 0.2);
  border: 1px solid #facc15;
  border-radius: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc15;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-trigger-btn:hover, .icon-trigger-btn.is-open {
  background: #facc15;
  color: white;
}


.day-cell-wrapper {
  position: relative;
}

.marker-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  width: 160px;
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  pointer-events: none;
}

.day-cell-wrapper:hover .marker-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-12px);
}

.marker-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1c1c1e;
}

.marker-tooltip .tooltip-header {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 4px;
}

.marker-tooltip .tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.marker-tooltip .tooltip-item {
  font-size: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marker-tooltip .dot {
  width: 4px;
  height: 4px;
  background: #facc15;
  border-radius: 50%;
  flex-shrink: 0;
}

.marker-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  background: #facc15;
  border-radius: 50%;
}
</style>
