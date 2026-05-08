<template>
  <div class="compact-user-grid">
    <div 
      v-for="user in users" 
      :key="user.id" 
      class="user-item"
      :class="{ 
         'interactive': !readonly && !user.disabled, 
         'selected': isSelected(user.id),
         'dimmed': !readonly && !isSelected(user.id) && !user.disabled,
         'disabled': user.disabled,
         'permanent-lock': user.isPermanentLock,
         [user.status]: readonly // Apply status class if readonly (pending/in_progress/declined)
      }"
      @click="!readonly && handleClick(user)"
      :title="user.disabled ? (user.isPermanentLock ? 'Permanently Removed (Declined Twice)' : (user.isPendingLocked ? 'This member has not accepted the milestone invitation yet' : 'Cannot remove Admin')) : (modelValue ? user.label : `${user.label} (${formatStatus(user.status)})`)"
    >
      <div class="avatar-wrapper">
         <div class="avatar" :style="{ background: getAvatarBackground(user), color: isLight(getAvatarBackground(user)) ? '#000' : '#fff' }">
            {{ user.initials || getInitials(user.label) }}
            <div v-if="user.disabled" class="lock-overlay">
               <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
         </div>
         
         <!-- Status Dot (View Mode) -->
         <div v-if="readonly && user.status" class="status-dot" :class="user.status"></div>

         <!-- Checkmark (Edit Mode) -->
         <div v-if="!readonly && isSelected(user.id)" class="check-badge">
            <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" stroke-width="4" fill="none">
               <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
         </div>
      </div>
      
      <!-- Name Label (Optional mode) -->
      <!-- For ultra-compact, we might skip the name or truncate it heavily below the avatar -->
      <!-- User asked for "compact component... handle 10 team members". Grid is best. -->
    </div>
    
    <!-- Empty State for Edit Mode -->
    <div v-if="!readonly && users.length === 0" class="text-muted text-xs italic">
       No members available.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  users: { type: Array, default: () => [] }, // Array of { id, label, status? }
  modelValue: { type: Array, default: () => [] }, // For v-model of selected IDs (Edit Mode)
  readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'disabled-click'])

const isSelected = (id) => props.modelValue.includes(id)

const handleClick = (user) => {
  if (user.disabled) {
      emit('disabled-click', user)
      return
  }
  toggle(user.id)
}

const toggle = (id) => {
  const newVal = [...props.modelValue]
  if (newVal.includes(id)) {
    newVal.splice(newVal.indexOf(id), 1)
  } else {
    newVal.push(id)
  }
  emit('update:modelValue', newVal)
}

const getInitials = (n) => {
  if (!n) return '??'
  const clean = n.split('(')[0].trim()
  return clean.split(' ').map(c => c[0]).filter(x => x).join('').slice(0, 2).toUpperCase()
}
const getColor = (name) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']
    let hash = 0
    if (name) {
        const clean = name.split('(')[0].trim()
        for(let i=0; i<clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

const getAvatarBackground = (user) => {
  // Readonly Mode: Use Status Color
  if (props.readonly && user.status) {
      if (user.status === 'pending') return '#fbbf24' // Yellow
      if (user.status === 'in_progress') return '#f97316' // Orange
      if (user.status === 'declined') return '#ef4444' // Red
      if (user.status === 'completed') return '#10b981' // Green
  }
  
  // Edit Mode: Selected = Pending = Yellow
  if (!props.readonly && isSelected(user.id)) {
      return '#fbbf24'
  }
  
  return getColor(user.label)
}

const isLight = (color) => {
    // Simple check for yellow to force black text
    return color === '#fbbf24'
}

const formatStatus = (s) => s ? s.replace('_', ' ') : ''
</script>

<style scoped>
.compact-user-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
  /* Fixed height + Scroll */
  max-height: 80px; /* ~2 Rows visible (32px + gap) */
  overflow-y: auto;
  padding: 8px 0; /* Removing horizontal padding as no border */
}

/* Custom Scrollbar */
.compact-user-grid::-webkit-scrollbar { width: 4px; }
.compact-user-grid::-webkit-scrollbar-track { background: transparent; }
.compact-user-grid::-webkit-scrollbar-thumb { 
  background: rgba(255,255,255,0.15); 
  border-radius: 4px; 
}
.compact-user-grid::-webkit-scrollbar-thumb:hover { 
  background: rgba(255,255,255,0.25); 
}

.user-item {
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.avatar-wrapper {
  position: relative;
  width: 32px; height: 32px;
}

.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: white;
  border: 2px solid #18181b; /* Default border matching bg */
  transition: transform 0.2s;
  cursor: default;
}

/* Interactive (Edit Mode) */
.user-item.interactive .avatar { cursor: pointer; }
.user-item.interactive:hover .avatar { transform: scale(1.1); }
.user-item.dimmed .avatar { opacity: 0.4; filter: grayscale(0.5); }
/* Selected = Pending = Yellow */
.user-item.selected .avatar { border-color: #fbbf24; opacity: 1; filter: none; } 

/* Readonly Status Styles */
.user-item.pending .avatar { border-color: #fbbf24; } /* Yellow */
.user-item.in_progress .avatar { border-color: #f97316; } /* Orange */
.user-item.declined .avatar { border-color: #ef4444; opacity: 1; filter: grayscale(0.2); } /* Red, visible */

.user-item.declined::after {
   content: "Declined"; position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%);
   font-size: 8px; color: #ef4444; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.2s;
}
.user-item.declined:hover::after { opacity: 1; }

/* Indicators */
.status-dot {
  position: absolute; bottom: 0; right: 0;
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #18181b;
}
.status-dot.pending { background: #fbbf24; }
.status-dot.in_progress { background: #f97316; } /* Orange */
.status-dot.completed { background: #10b981; }
.status-dot.declined { background: #ef4444; }

.check-badge {
  position: absolute; -top: 2px; -right: 2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fbbf24; color: black; /* Yellow bg, black check */
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #18181b;
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

.lock-overlay {
   position: absolute; top: 0; left: 0; width: 100%; height: 100%;
   background: rgba(0,0,0,0.4);
   display: flex; align-items: center; justify-content: center;
   border-radius: 50%;
   color: rgba(255,255,255,0.9);
}
.user-item.permanent-lock .avatar { border: 2px solid #ef4444; opacity: 0.6; cursor: not-allowed; }
.user-item.permanent-lock .lock-overlay { color: #ef4444; background: rgba(0,0,0,0.6); }
.user-item.disabled .avatar { cursor: not-allowed; opacity: 0.8; border-style: dashed; }

</style>
