<template>
  <div class="due-date-adjustment">
    <div class="adjustment-tabs">
      <button 
        class="adj-tab" 
        :class="{ active: !isAdjusting }" 
        @click="setAdjusting(false)"
      >
        Keep Original
      </button>
      <button 
        class="adj-tab" 
        :class="{ active: isAdjusting }" 
        @click="setAdjusting(true)"
      >
        Set New Date
      </button>
    </div>

    <div class="adjustment-content" :class="{ 'is-new': isAdjusting }">
      <div v-if="!isAdjusting" class="original-date-preview">
        <div class="preview-label">Maintaining current deadline</div>
        <div class="preview-value">
          <Calendar :size="16" class="icon" />
          <span>{{ formatDate(originalDate) }}</span>
        </div>
      </div>
      <div v-else class="date-picker-wrap">
        <CompactDatePicker 
          v-model="internalDate" 
          placeholder="Select new deadline"
        />
        <div class="date-warning" v-if="isPastStartDate">
          Caution: New date is earlier than start date
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Calendar } from 'lucide-vue-next'
import CompactDatePicker from '../ui/CompactDatePicker.vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  originalDate: { type: String, default: null },
  startDate: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

const isAdjusting = ref(!!props.modelValue && props.modelValue !== props.originalDate)
const internalDate = ref(props.modelValue || props.originalDate)

const setAdjusting = (val) => {
  isAdjusting.value = val
  if (!val) {
    internalDate.value = props.originalDate
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', internalDate.value)
  }
}

watch(internalDate, (newVal) => {
  if (isAdjusting.value) {
    emit('update:modelValue', newVal)
  }
})

const formatDate = (dateStr) => {
  if (!dateStr) return 'No date'
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const isPastStartDate = computed(() => {
  if (!internalDate.value || !props.startDate) return false
  return new Date(internalDate.value) < new Date(props.startDate)
})
</script>

<style scoped>
.due-date-adjustment {
  width: 100%;
}

.adjustment-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.adj-tab {
  flex: 1;
  border: none;
  background: none;
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;
}

.adj-tab.active {
  background: #facc15;
  color: #1c1c1e;
  box-shadow: 0 4px 12px rgba(250, 204, 21, 0.2);
}

.adjustment-content {
  min-height: 80px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  transition: all 0.3s;
}

.adjustment-content.is-new {
  border-color: rgba(250, 204, 21, 0.2);
}

.original-date-preview {
  text-align: center;
}

.preview-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 4px;
}

.preview-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #facc15;
}

.date-picker-wrap {
  width: 100%;
}

.date-warning {
  margin-top: 8px;
  font-size: 11px;
  color: #fb923c;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
