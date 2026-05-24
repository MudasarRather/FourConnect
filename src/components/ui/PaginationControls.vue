<template>
  <div class="pagination-controls">
    <div class="rows-per-page">
      <span class="label">Rows per page:</span>
      <div class="limit-selector">
        <CustomSelect
          :model-value="limit"
          :options="limitOptions"
          value-key="value"
          label-key="label"
          @update:model-value="$emit('update:limit', $event)"
          placeholder="10"
          placement="top"
        />
      </div>
    </div>

    <span class="page-info">
      Page {{ page }} of {{ totalPages || 1 }}
    </span>

    <div class="nav-buttons">
      <button 
        class="nav-btn" 
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        <ChevronLeft :size="16" />
      </button>
      <button 
        class="nav-btn" 
        :disabled="page >= totalPages"
        @click="$emit('update:page', page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import CustomSelect from './CustomSelect.vue'

defineProps({
  page: { type: Number, required: true },
  limit: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true }
})

defineEmits(['update:page', 'update:limit'])

const limitOptions = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' }
]
</script>

<style scoped>
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 24px;
  padding: 16px 0;
  border-top: 1px solid #27272a;
  margin-top: 24px;
  font-size: 13px;
  color: #a1a1aa;
}

.rows-per-page {
  display: flex;
  align-items: center;
  gap: 12px;
}

.limit-selector {
  width: 70px;
}

.limit-select {
  /* Removed as replaced by CustomSelect */
}

.nav-buttons {
  display: flex;
  gap: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #18181b;
  border: 1px solid #3f3f46;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #27272a;
  border-color: #52525b;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #27272a;
}

/* ─── Light theme overrides ─────────────────────────────────────────────── */
[data-theme="light"] .pagination-controls {
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .nav-btn {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .nav-btn:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .nav-btn:disabled {
  border-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .label,
[data-theme="light"] .page-info { color: var(--text-secondary); }
</style>

