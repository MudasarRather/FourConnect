<template>
  <div class="milestone-selector">
    <div 
      v-for="m in milestones" 
      :key="m.id"
      class="milestone-item"
      :class="{ 
          selected: selectedIds.includes(m.id),
          disabled: disabledIds.includes(m.id)
      }"
      @click="toggle(m)"
    >
      <!-- Content (Left) -->
      <div class="ms-info">
        <span class="ms-name">{{ m.name }}</span>
        <div class="ms-values">
           <span class="main-amount">
            {{ formatCurrency(getAmount(m), projectCurrency) }}
           </span>
           <span v-if="m.currency !== projectCurrency" class="sub-amount">
             ({{ formatCurrency(m.budget_amount, m.currency) }})
           </span>
        </div>
      </div>

      <!-- Selection Indicator (Right) -->
      <div class="selection-indicator">
        <Check class="check-icon" :size="12" />
      </div>
       
       <!-- Disabled Badge -->
       <div v-if="disabledIds.includes(m.id)" class="paid-badge">Paid</div>
    </div>
    
    <div v-if="!milestones.length" class="empty-state">
       <div class="empty-icon-wrapper">
         <PackageOpen :size="20" class="empty-icon"/>
       </div>
       <span class="empty-title">No milestones found</span>
       <span class="empty-sub">Only completed milestones appear here</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PackageOpen, Check } from 'lucide-vue-next'

const props = defineProps({
  milestones: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] }, // selected IDs
  projectCurrency: { type: String, default: 'USD' },
  projectBudget: { type: Number, default: 0 },
  disabledIds: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const selectedIds = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const toggle = (m) => {
  if (props.disabledIds.includes(m.id)) return // Prevent selection
  
  const newIds = [...selectedIds.value]
  const idx = newIds.indexOf(m.id)
  if (idx === -1) {
    newIds.push(m.id)
  } else {
    newIds.splice(idx, 1)
  }
  emit('update:modelValue', newIds)
}

const getAmount = (m) => {
  // Prefer the converted amount if available
  return m.budget_amount_converted || m.budget_amount || 0
}

const formatCurrency = (val, currency) => {
   return new Intl.NumberFormat('en-US', {
     style: 'currency',
     currency: currency || 'USD',
     minimumFractionDigits: 0,
     maximumFractionDigits: 0
   }).format(val || 0)
}
</script>

<style scoped>
.milestone-selector {
  display: flex;
  flex-wrap: wrap; /* Next to each other */
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 2px;
}

.milestone-item {
  display: flex;
  flex-direction: column; /* Stack name and amount for compactness */
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  min-width: 140px; /* Ensure uniform size */
  flex: 1 0 auto; /* Grow to fill gaps */
  position: relative;
}

.milestone-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.milestone-item.selected {
  background: rgba(245, 158, 11, 0.15); /* Yellow Tint */
  border-color: #F59E0B; /* Yellow Border */
  box-shadow: none; /* Removed Shadow */
}

.milestone-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.01);
    border-color: rgba(255, 255, 255, 0.05);
}
.milestone-item.disabled:hover { transform: none; }

.paid-badge {
    position: absolute; bottom: 8px; right: 8px;
    font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.3);
    text-transform: uppercase; letter-spacing: 0.05em;
    border: 1px solid rgba(255,255,255,0.1);
    padding: 2px 4px; border-radius: 4px;
}

/* Info Layout */
.ms-info {
  display: flex; flex-direction: column; gap: 2px; width: 100%;
}

.ms-name {
  font-size: 13px; font-weight: 500; color: #f5f5f7;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;
}

.ms-values {
  display: flex; align-items: baseline; gap: 4px;
}

.main-amount {
  font-size: 12px; font-weight: 600; color: #d4d4d8;
}

.sub-amount {
  font-size: 10px; color: rgba(255,255,255,0.4);
}

.milestone-item.selected .ms-name,
.milestone-item.selected .main-amount {
  color: #FBBF24; /* Yellow Text when selected */
}

/* Checkmark Indicator */
.selection-indicator {
  position: absolute; top: 8px; right: 8px;
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  background: rgba(0,0,0,0.2);
}

.milestone-item.selected .selection-indicator {
  background: #F59E0B;
  border-color: #F59E0B;
}

.check-icon {
  width: 10px; height: 10px; color: black; /* Black check on yellow */
  opacity: 0; transform: scale(0.5);
  transition: all 0.2s;
}

.milestone-item.selected .check-icon {
  opacity: 1; transform: scale(1);
}

/* Empty State */
.empty-state {
  width: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px;
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 12px;
  gap: 8px;
  min-height: 120px;
}
.empty-icon-wrapper {
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.05);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.empty-icon { color: rgba(255,255,255,0.3); }
.empty-title { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); }
.empty-sub { font-size: 11px; color: rgba(255,255,255,0.3); }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .milestone-item {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .milestone-item:hover {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .milestone-item.selected {
  background: rgba(217, 119, 6, 0.14);
  border-color: #d97706;
}
[data-theme="light"] .milestone-item.disabled {
  background: rgba(255, 250, 240, 0.40);
  border-color: rgba(40, 25, 10, 0.06);
  opacity: 0.55;
}
[data-theme="light"] .paid-badge {
  color: #047857;
  background: rgba(5, 150, 105, 0.12);
  border: 1px solid rgba(5, 150, 105, 0.30);
  font-weight: 700;
}
[data-theme="light"] .ms-name { color: #1a1410; }
[data-theme="light"] .main-amount { color: #6b5840; }
[data-theme="light"] .sub-amount { color: #92400e; }
[data-theme="light"] .milestone-item.selected .ms-name,
[data-theme="light"] .milestone-item.selected .main-amount {
  color: #b45309;
  font-weight: 600;
}
[data-theme="light"] .selection-indicator {
  border: 1.5px solid rgba(217, 119, 6, 0.32);
  background: rgba(255, 250, 240, 0.75);
}
[data-theme="light"] .milestone-item.selected .selection-indicator {
  background: #d97706;
  border-color: #d97706;
}
[data-theme="light"] .check-icon { color: #fff; }
[data-theme="light"] .empty-state {
  background: rgba(255, 250, 240, 0.55);
  border: 1px dashed rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .empty-icon-wrapper {
  background: rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .empty-icon { color: #b45309; }
[data-theme="light"] .empty-title { color: #1a1410; }
[data-theme="light"] .empty-sub { color: #92400e; }
[data-theme="light"] ::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.30); }
</style>
