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
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px 14px;
  cursor: pointer;
  transition: transform 0.30s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.25s ease, border-color 0.25s ease, box-shadow 0.30s ease;
  height: 48px;
  position: relative;
  overflow: hidden;
}
.compact-input:hover {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(245, 158, 11, 0.04));
  border-color: rgba(245, 158, 11, 0.30);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.20);
}
.compact-input.is-open {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.05));
  box-shadow: 0 8px 28px rgba(245, 158, 11, 0.22), 0 0 0 3px rgba(245, 158, 11, 0.10);
}

.icon-wrapper {
  color: rgba(245, 158, 11, 0.75);
  display: flex;
  transition: transform 0.30s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.25s ease;
}
.compact-input:hover .icon-wrapper { color: #fbbf24; transform: scale(1.10); }
.compact-input.is-open .icon-wrapper { color: #fbbf24; transform: rotate(-8deg) scale(1.10); }
.date-text { font-size: 12px; font-weight: 600; color: #f5f5f7; letter-spacing: 0.01em; }
.compact-input:not(.has-value) .date-text { color: rgba(255, 255, 255, 0.40); font-weight: 500; }

/* Dropdown — frosted glass with ambient glow */
.compact-dropdown {
  width: 240px;
  background: linear-gradient(180deg, rgba(36, 36, 40, 0.92), rgba(24, 24, 28, 0.90));
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 16px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  padding: 14px;
  user-select: none;
  position: relative;
  overflow: hidden;
  transform-origin: top center;
}
.compact-dropdown::before {
  content: "";
  position: absolute;
  top: -50px; right: -30px;
  width: 140px; height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.18), transparent 70%);
  filter: blur(24px);
  pointer-events: none;
  animation: cdp-orb 10s ease-in-out infinite;
}
.compact-dropdown > * { position: relative; z-index: 1; }

@keyframes cdp-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-10px, 12px) scale(1.10); }
}

/* Entrance transition */
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity 0.22s ease, transform 0.30s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

/* Header */
.calendar-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.month-label {
  font-size: 13px; font-weight: 700; color: #fff;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, #fff 30%, #fde68a 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.nav-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.60);
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; cursor: pointer;
  transition: background 0.20s ease, color 0.20s ease, border-color 0.20s ease, transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nav-btn:hover {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.40);
  color: #fbbf24;
}
.nav-btn:active { transform: scale(0.90); }

/* Grid */
.weekdays-row { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; gap: 2px; }
.weekdays-row span {
  text-align: center; font-size: 10px; font-weight: 700;
  color: rgba(245, 158, 11, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }

.day-cell {
  background: transparent; border: none;
  height: 28px; width: 100%;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px; font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.day-cell:hover:not(.disabled):not(.selected) {
  background: rgba(245, 158, 11, 0.14);
  color: #fff;
  transform: scale(1.08);
}
.day-cell.other-month { color: rgba(255, 255, 255, 0.16); }
.day-cell.today {
  color: #fbbf24;
  font-weight: 800;
  background: rgba(245, 158, 11, 0.10);
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.30);
}
.day-cell.today::after {
  content: "";
  position: absolute; inset: -2px;
  border-radius: 10px;
  border: 1.5px solid rgba(245, 158, 11, 0.45);
  animation: cdp-today-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}
.day-cell.selected {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #000;
  font-weight: 800;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45);
  z-index: 1;
}
.day-cell.selected::after {
  content: "";
  position: absolute; inset: -2px;
  border-radius: 10px;
  border: 1.5px solid rgba(245, 158, 11, 0.55);
  animation: cdp-selected-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}
.day-cell.disabled { color: rgba(255, 255, 255, 0.10); cursor: not-allowed; }

@keyframes cdp-today-ring {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(1.30); opacity: 0; }
}
@keyframes cdp-selected-ring {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(1.40); opacity: 0; }
}

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

/* ═════ LIGHT THEME OVERRIDES ════════════════════════════════════════════ */
[data-theme="light"] .compact-input {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.70), rgba(255, 246, 226, 0.50));
  border-color: rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .compact-input:hover {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(217, 119, 6, 0.04));
  border-color: rgba(217, 119, 6, 0.50);
  box-shadow: 0 8px 20px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .compact-input.is-open {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.16), rgba(217, 119, 6, 0.06));
  border-color: #d97706;
  box-shadow: 0 8px 28px rgba(217, 119, 6, 0.25), 0 0 0 3px rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .compact-input .icon-wrapper { color: #b45309; }
[data-theme="light"] .compact-input:hover .icon-wrapper { color: #92400e; }
[data-theme="light"] .compact-input.is-open .icon-wrapper { color: #92400e; }
[data-theme="light"] .compact-input .date-text { color: var(--text-primary); }
[data-theme="light"] .compact-input:not(.has-value) .date-text { color: rgba(26, 20, 16, 0.45); }

[data-theme="light"] .icon-trigger-btn {
  background: rgba(217, 119, 6, 0.12);
  border-color: #d97706;
  color: #b45309;
}
[data-theme="light"] .icon-trigger-btn:hover,
[data-theme="light"] .icon-trigger-btn.is-open {
  background: #d97706;
  color: #fff;
}

/* Calendar dropdown popover — frosted cream with amber accents */
[data-theme="light"] .compact-dropdown {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 246, 226, 0.88));
  border-color: rgba(217, 119, 6, 0.28);
  box-shadow:
    0 20px 50px rgba(40, 25, 10, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.50) inset;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
}
[data-theme="light"] .compact-dropdown::before {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.22), transparent 70%);
}
[data-theme="light"] .calendar-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .calendar-header .month-label {
  background: linear-gradient(135deg, #92400e 30%, #d97706 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .nav-btn {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .nav-btn:hover {
  background: rgba(217, 119, 6, 0.18);
  border-color: rgba(217, 119, 6, 0.45);
  color: #92400e;
}
[data-theme="light"] .weekdays-row span { color: #b45309; }

[data-theme="light"] .day-cell { color: var(--text-primary); }
[data-theme="light"] .day-cell:hover:not(.disabled):not(.selected) {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}
[data-theme="light"] .day-cell.other-month { color: rgba(26, 20, 16, 0.20); }
[data-theme="light"] .day-cell.today {
  color: #92400e;
  background: rgba(217, 119, 6, 0.14);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .day-cell.today::after {
  border-color: rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .day-cell.selected {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .day-cell.selected::after {
  border-color: rgba(217, 119, 6, 0.65);
}
[data-theme="light"] .day-cell.disabled { color: rgba(26, 20, 16, 0.18); }

/* Marker tooltip — light variant */
[data-theme="light"] .marker-tooltip {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(217, 119, 6, 0.20);
  box-shadow: 0 4px 20px rgba(40, 25, 10, 0.25);
}
[data-theme="light"] .marker-tooltip::after { border-top-color: rgba(255, 250, 240, 0.98); }
[data-theme="light"] .marker-tooltip .tooltip-header {
  color: #6b5840;
  border-bottom-color: rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .marker-tooltip .tooltip-item { color: var(--text-primary); }
[data-theme="light"] .marker-tooltip .dot { background: #d97706; }
[data-theme="light"] .marker-dot { background: #d97706; }
</style>
