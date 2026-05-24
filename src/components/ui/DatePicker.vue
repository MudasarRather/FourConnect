<template>
  <div class="date-picker-wrapper" :class="{ 'has-error': error, 'is-disabled': disabled }">
    <!-- Trigger -->
    <div 
        ref="triggerRef"
        class="date-input" 
        :class="{ 'is-open': isOpen, 'has-value': !!modelValue }" 
        @click="toggleCalendar"
    >
      <Calendar :size="14" class="date-icon" :class="{ 'active': !!modelValue }" />
      <span class="date-display" :class="{ 'placeholder': !modelValue }">{{ displayValue || placeholder }}</span>
      <ChevronDown :size="12" class="chevron" :class="{ open: isOpen }" />
    </div>
    
    <!-- Teleported Dropdown -->
    <Teleport to="body">
      <transition name="dropdown-fade">
        <div 
            v-if="isOpen" 
            class="calendar-dropdown"
            :style="dropdownStyle"
            ref="dropdownRef"
            @click.stop
        >
          <div class="calendar-header">
            <button type="button" class="nav-btn" @click="prevMonth">
              <ChevronLeft :size="16" />
            </button>
            <span class="month-year">{{ monthYearDisplay }}</span>
            <button type="button" class="nav-btn" @click="nextMonth">
              <ChevronRight :size="16" />
            </button>
          </div>
          
          <div class="weekdays">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          
          <div class="days-grid">
            <button
              v-for="(day, index) in calendarDays"
              :key="index"
              type="button"
              class="day-btn"
              :class="{ 
                'other-month': !day.isCurrentMonth,
                'today': day.isToday,
                'selected': day.isSelected,
                'disabled': day.isDisabled
              }"
              :disabled="day.isDisabled"
              @click="selectDate(day)"
            >
              {{ day.date }}
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Select date' },
  minDate: { type: String, default: null },
  maxDate: { type: String, default: null },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

const triggerRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const date = new Date(props.modelValue)
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
})

const monthYearDisplay = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startPadding = firstDay.getDay()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const minDateObj = props.minDate ? new Date(props.minDate) : null
  if (minDateObj) minDateObj.setHours(0, 0, 0, 0)
  
  const maxDateObj = props.maxDate ? new Date(props.maxDate) : null
  if (maxDateObj) maxDateObj.setHours(0, 0, 0, 0)
  
  const selectedDate = props.modelValue ? new Date(props.modelValue) : null
  if (selectedDate) selectedDate.setHours(0, 0, 0, 0)
  
  // Previous month padding
  const prevMonthLast = new Date(currentYear.value, currentMonth.value, 0).getDate()
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(currentYear.value, currentMonth.value - 1, prevMonthLast - i)
    days.push({
      date: prevMonthLast - i,
      fullDate: d,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isDisabled: true
    })
  }
  
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(currentYear.value, currentMonth.value, i)
    d.setHours(0, 0, 0, 0)
    
    let isDisabled = false
    if (minDateObj && d < minDateObj) isDisabled = true
    if (maxDateObj && d > maxDateObj) isDisabled = true
    
    days.push({
      date: i,
      fullDate: d,
      isCurrentMonth: true,
      isToday: d.getTime() === today.getTime(),
      isSelected: selectedDate && d.getTime() === selectedDate.getTime(),
      isDisabled
    })
  }
  
  // Next month padding
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      fullDate: new Date(currentYear.value, currentMonth.value + 1, i),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isDisabled: true
    })
  }
  
  return days
})

const updatePosition = () => {
  if (!isOpen.value || !triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  
  // Default: Bottom aligned
  let top = rect.bottom + 6
  let left = rect.left
  
  // Bounds check (Flip up if at bottom)
  if (top + 320 > window.innerHeight) {
    top = rect.top - 320 - 6 
  }

  dropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 99999,
  }
}

const toggleCalendar = async () => {
  if (props.disabled) return
  
  if (isOpen.value) {
    close()
  } else {
    // Close other pickers
    document.dispatchEvent(new CustomEvent('datepicker-open', { detail: { id: pickerId.value } }))
    
    isOpen.value = true
    await nextTick()
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('click', handleClickOutside)
  }
}

const close = () => {
  isOpen.value = false
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  document.removeEventListener('click', handleClickOutside)
}

// Unique ID for this picker instance
const pickerId = ref(Math.random().toString(36).substring(7))

const handleOtherPickerOpen = (e) => {
  if (e.detail.id !== pickerId.value) {
    close()
  }
}

const selectDate = (day) => {
  if (day.isDisabled) return
  const d = day.fullDate
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  const formatted = `${year}-${month}-${date}`
  emit('update:modelValue', formatted)
  close()
}

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const handleClickOutside = (e) => {
  if (
    dropdownRef.value && !dropdownRef.value.contains(e.target) && 
    triggerRef.value && !triggerRef.value.contains(e.target)
  ) {
    close()
  }
}

onUnmounted(() => {
  close()
  document.removeEventListener('datepicker-open', handleOtherPickerOpen)
})

onMounted(() => {
  document.addEventListener('datepicker-open', handleOtherPickerOpen)
})
</script>

<style scoped>
.date-picker-wrapper {
  position: relative;
  min-width: 150px;
}

.date-picker-wrapper.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-picker-wrapper.is-disabled .date-input {
  pointer-events: none;
  background: #27272a;
}

.date-input {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 0 14px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.date-input.is-open {
  border-color: #F59E0B;
  background: rgba(255,255,255,0.06);
}

.date-input:hover:not(.is-disabled) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
}

.date-icon { color: rgba(255,255,255,0.4); }
.date-icon.active { color: #F59E0B; }

.date-display {
  flex: 1;
  font-size: 13px;
  color: #f5f5f5;
}

.date-display.placeholder {
  color: rgba(255,255,255,0.3);
}

.date-display:empty::before {
  content: attr(data-placeholder);
  color: #6e6e73;
}

.chevron {
  color: rgba(255,255,255,0.3);
  transition: transform 0.2s;
}
.chevron.open { transform: rotate(180deg); color: #F59E0B; }

/* Calendar Dropdown */
.calendar-dropdown {
  width: 280px;
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.month-year {
  font-size: 14px;
  font-weight: 600;
  color: #f5f5f5;
}

.nav-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  transition: all 0.2s;
}
.nav-btn:hover {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #F59E0B;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}
.weekdays span {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #f5f5f5;
  cursor: pointer;
  transition: all 0.15s;
}

.day-btn:hover:not(.disabled):not(.selected) {
  background: rgba(255, 255, 255, 0.1);
}

.day-btn.other-month {
  color: rgba(255,255,255,0.15);
}

.day-btn.today {
  background: rgba(245, 158, 11, 0.12);
  color: #F59E0B;
  font-weight: 600;
}

.day-btn.selected {
  background: #F59E0B;
  color: #000;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.day-btn.disabled {
  color: rgba(255,255,255,0.12);
  cursor: not-allowed;
}

/* Transition */
.dropdown-fade-enter-active { transition: all 0.2s ease-out; }
.dropdown-fade-leave-active { transition: all 0.15s ease-in; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Error state */
.has-error .date-input {
  border-color: #ef4444;
}

/* ─── Light theme overrides ───────────────────────────────────────────── */
[data-theme="light"] .date-input {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .date-input:focus {
  background: rgba(255, 246, 226, 0.95);
  border-color: var(--input-focus);
}
[data-theme="light"] .date-input.is-open {
  background: rgba(255, 246, 226, 0.95);
  border-color: var(--input-focus);
}
[data-theme="light"] .date-input:hover:not(.is-disabled) {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .date-display { color: var(--text-primary); }
[data-theme="light"] .date-display.placeholder { color: rgba(26, 20, 16, 0.55); }
[data-theme="light"] .date-display:empty::before { color: rgba(26, 20, 16, 0.55); }
[data-theme="light"] .date-icon { color: #92400e; }
[data-theme="light"] .date-icon.active { color: #b45309; }
[data-theme="light"] .chevron { color: #92400e; }
[data-theme="light"] .chevron.open { color: #b45309; }
[data-theme="light"] .month-year { color: var(--text-primary); }
[data-theme="light"] .calendar-dropdown {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow: 0 20px 50px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .calendar-header { color: var(--text-primary); }
[data-theme="light"] .nav-btn {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .nav-btn:hover {
  background: rgba(40, 25, 10, 0.08);
  color: var(--text-primary);
}
[data-theme="light"] .weekdays span { color: var(--text-tertiary); }
[data-theme="light"] .day-btn { color: var(--text-primary); }
[data-theme="light"] .day-btn:hover:not(:disabled):not(.selected) {
  background: rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .day-btn.today {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}
[data-theme="light"] .day-btn.selected {
  background: #d97706;
  color: #fff;
}
[data-theme="light"] .day-btn.disabled,
[data-theme="light"] .day-btn:disabled {
  color: rgba(26, 20, 16, 0.20);
}
[data-theme="light"] .day-btn.other-month {
  color: rgba(26, 20, 16, 0.30);
}
</style>
