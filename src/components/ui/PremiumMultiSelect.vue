<template>
  <div class="premium-multi-select">
    <div 
      v-for="option in options" 
      :key="option.id"
      class="select-item"
      :class="{ 'selected': modelValue.includes(option.id) }"
      @click="toggle(option.id)"
    >
       <div class="item-left">
          <!-- Avatar Ring -->
          <div class="avatar-ring" :class="{ 'active': modelValue.includes(option.id) }">
            <div class="avatar-sm" :style="{ background: getColor(option.label) }">
               {{ getInitials(option.label) }}
            </div>
          </div>
          
          <div class="item-details">
             <span class="item-label">{{ getLabel(option) }}</span>
             <span class="item-sub" v-if="option.role">{{ option.role }}</span>
          </div>
       </div>
       
       <!-- Check Indicator -->
       <div class="selection-indicator">
          <transition name="scale-fade">
              <div v-if="modelValue.includes(option.id)" class="check-circle-filled">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div v-else class="check-circle-empty"></div>
          </transition>
       </div>
    </div>
    
    <div v-if="options.length === 0" class="empty-state">
       {{ emptyText }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'No options available' }
})

const emit = defineEmits(['update:modelValue'])

const toggle = (id) => {
  const newValue = [...props.modelValue]
  const index = newValue.indexOf(id)
  if (index === -1) {
    newValue.push(id)
  } else {
    newValue.splice(index, 1)
  }
  emit('update:modelValue', newValue)
}

const getLabel = (opt) => opt.label.split('(')[0].trim()

const getInitials = (name) => {
    if (!name) return '??'
    // Strip role if present in label for initials
    const cleanName = name.split('(')[0].trim()
    return cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

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
.premium-multi-select {
  display: flex; flex-direction: column; gap: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 8px;
  max-height: 220px; overflow-y: auto;
}

.select-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid transparent;
}

.select-item:hover {
  background: rgba(255,255,255,0.04);
}

.select-item.selected {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.2);
}

.item-left { display: flex; align-items: center; gap: 12px; }

/* Avatar Ring */
.avatar-ring {
  padding: 2px; border-radius: 50%; border: 2px solid transparent; transition: 0.2s;
}
.avatar-ring.active { border-color: #3b82f6; }

.avatar-sm {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.item-details { display: flex; flex-direction: column; gap: 2px; }
.item-label { font-size: 13px; font-weight: 600; color: #f5f5f7; }
.item-sub { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 500; }

/* Indicators */
.selection-indicator { display: flex; align-items: center; justify-content: center; }

.check-circle-empty {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  transition: 0.2s;
}

.select-item:hover .check-circle-empty { border-color: rgba(255,255,255,0.4); }

.check-circle-filled {
  width: 20px; height: 20px; border-radius: 50%;
  background: #3b82f6; border: 2px solid #3b82f6;
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 2px 5px rgba(59, 130, 246, 0.4);
}

.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.scale-fade-enter-from, .scale-fade-leave-to { transform: scale(0.5); opacity: 0; }

/* Scrollbar */
.premium-multi-select::-webkit-scrollbar { width: 4px; }
.premium-multi-select::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.premium-multi-select::-webkit-scrollbar-track { background: transparent; }
</style>
