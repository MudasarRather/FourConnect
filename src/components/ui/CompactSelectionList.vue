<template>
  <div class="compact-selection-list">
    <div class="list-header" v-if="title">
       <span class="list-title">{{ title }}</span>
       <span class="count-badge" v-if="modelValue.length > 0">{{ modelValue.length }} selected</span>
    </div>
    
    <div class="scroll-container">
      <div 
        v-for="option in options" 
        :key="option.id" 
        class="list-item"
        :class="{ 'selected': isSelected(option.id) }"
        @click="toggle(option.id)"
      >
         <div class="item-left">
            <!-- Avatar -->
            <div class="avatar-xs" :style="{ background: getColor(option.label) }">
               {{ getInitials(option.label) }}
            </div>
            
            <div class="text-info">
               <span class="name">{{ option.label.split('(')[0].trim() }}</span>
               <span class="role" v-if="option.role">{{ option.role }}</span>
            </div>
         </div>
         
         <!-- Custom Checkbox -->
         <div class="checkbox-box">
             <Check v-if="isSelected(option.id)" :size="10" stroke-width="4" />
         </div>
      </div>
      
      <div v-if="options.length === 0" class="empty-text">
         {{ emptyText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] }, // { id, label, role? }
  title: String,
  emptyText: { type: String, default: 'No options available' }
})

const emit = defineEmits(['update:modelValue'])

const isSelected = (id) => props.modelValue.includes(id)

const toggle = (id) => {
  const newVal = [...props.modelValue]
  if (newVal.includes(id)) {
    newVal.splice(newVal.indexOf(id), 1)
  } else {
    newVal.push(id)
  }
  emit('update:modelValue', newVal)
}

const getInitials = (n) => n ? n.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() : '??'

const getColor = (name) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']
    let hash = 0
    if (name) {
        for(let i=0; i<name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}
</script>

<style scoped>
.compact-selection-list {
  display: flex; flex-direction: column; 
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.list-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.5); letter-spacing: 0.05em; }
.count-badge { font-size: 10px; color: #3b82f6; background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: 4px; font-weight: 600; }

.scroll-container {
  max-height: 200px; /* Fixed height for scroll */
  overflow-y: auto;
  padding: 4px;
}

/* Custom Scrollbar (Matching App Design) */
.scroll-container::-webkit-scrollbar { width: 4px; }
.scroll-container::-webkit-scrollbar-track { background: transparent; }
.scroll-container::-webkit-scrollbar-thumb { 
  background: rgba(255,255,255,0.1); 
  border-radius: 4px; 
}
.scroll-container::-webkit-scrollbar-thumb:hover { 
  background: rgba(255,255,255,0.2); 
}

.list-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.list-item:hover { background: rgba(255,255,255,0.03); }

.list-item.selected {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.2);
}

.item-left { display: flex; align-items: center; gap: 10px; }

.avatar-xs {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: white;
  flex-shrink: 0;
}

.text-info { display: flex; flex-direction: column; line-height: 1.2; }
.name { font-size: 13px; color: #f5f5f7; font-weight: 500; }
.role { font-size: 10px; color: rgba(255,255,255,0.5); }

/* Checkbox */
.checkbox-box {
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 1.5px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  color: white;
}

.list-item.selected .checkbox-box {
  background: #3b82f6;
  border-color: #3b82f6;
}

.list-item:hover .checkbox-box { border-color: rgba(255,255,255,0.4); }

.empty-text { padding: 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; font-style: italic; }

</style>
