<template>
  <button class="table-manage-btn" @click.stop="$emit('click', $event)">
    <Settings :size="14" />
    <span>Manage</span>
  </button>
</template>

<script setup>
import { Settings } from 'lucide-vue-next'

defineEmits(['click'])
</script>

<style scoped>
.table-manage-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white !important; /* Force White */
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.table-manage-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  color: white !important;
}

.table-manage-btn:hover {
  background: rgba(249, 115, 22, 0.2);
  border-color: rgba(249, 115, 22, 0.3);
  transform: translateY(-1px);
}

.table-manage-btn:active {
  transform: translateY(0);
}
</style>
