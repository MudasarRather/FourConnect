<template>
  <div class="decline-item-row">
     <div class="user-info">
        <span class="name">{{ user?.full_name || 'Unknown' }}</span>
     </div>
     
     <div class="message-preview">
        <span class="text-content">"{{ reason }}"</span>
     </div>

     <button class="view-btn" @click="$emit('view')">
        <Eye :size="14" />
     </button>
  </div>
</template>

<script setup>
import { Eye } from 'lucide-vue-next'

defineProps({
  user: Object,
  reason: String
})

defineEmits(['view'])
</script>

<style scoped>
.decline-item-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin-bottom: 6px;
  transition: background 0.2s;
}
.decline-item-row:hover {
  background: rgba(239, 68, 68, 0.05);
}

.user-info {
  width: 100px; /* Fixed width for alignment */
  flex-shrink: 0;
}
.name {
  font-size: 13px; font-weight: 600; color: #fca5a5; /* Light red */
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: block;
}

.message-preview {
  flex: 1;
  min-width: 0; /* Enable truncation */
  display: flex; align-items: center;
}
.text-content {
  font-size: 13px; color: rgba(255,255,255,0.7); font-style: italic;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 100%; display: block;
}

.view-btn {
  background: none; border: none; 
  color: rgba(255,255,255,0.4);
  cursor: pointer; display: flex; align-items: center;
  padding: 4px; border-radius: 4px;
  transition: all 0.2s;
}
.view-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}
</style>
