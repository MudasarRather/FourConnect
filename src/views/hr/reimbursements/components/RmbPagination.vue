<template>
  <div v-if="totalPages > 1" class="rmb-pager">
    <button class="rmb-btn rmb-btn-ghost" :disabled="page <= 1" @click="$emit('page', page - 1)">
      <ChevronLeft :size="15" /> Prev
    </button>
    <span class="rmb-mono pg">{{ page }} / {{ totalPages }}</span>
    <button class="rmb-btn rmb-btn-ghost" :disabled="page >= totalPages" @click="$emit('page', page + 1)">
      Next <ChevronRight :size="15" />
    </button>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
defineProps({ page: { type: Number, default: 1 }, totalPages: { type: Number, default: 1 } })
defineEmits(['page'])
</script>

<style scoped>
.rmb-pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; }
.pg { font-size: 12px; color: var(--rmb-text-muted); }
</style>
