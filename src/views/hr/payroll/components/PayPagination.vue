<template>
  <div v-if="totalPages > 1 || totalItems > pageSize" class="pay-pg">
    <div class="pg-range">
      <span class="pg-led" /> SHOWING <strong>{{ rangeLabel }}</strong> · {{ totalItems }} total
    </div>
    <div class="pg-nav">
      <button class="pg-arrow" :disabled="page <= 1" @click="$emit('update:page', page - 1)">
        <ChevronLeft :size="15" />
      </button>
      <button v-for="p in windowPages" :key="p" class="pg-tile" :class="{ active: p === page }"
        @click="$emit('update:page', p)">{{ p }}</button>
      <button class="pg-arrow" :disabled="page >= totalPages" @click="$emit('update:page', page + 1)">
        <ChevronRight :size="15" />
      </button>
    </div>
    <div class="pg-size">
      <span>per page</span>
      <button v-for="n in sizes" :key="n" class="pg-sz" :class="{ active: n === pageSize }"
        @click="$emit('update:pageSize', n)">{{ n }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  sizes: { type: Array, default: () => [10, 25, 50, 100] },
})
defineEmits(['update:page', 'update:pageSize'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))
const rangeLabel = computed(() => {
  const a = (props.page - 1) * props.pageSize + 1
  const b = Math.min(props.page * props.pageSize, props.totalItems)
  return props.totalItems ? `${a}–${b}` : '0'
})
const windowPages = computed(() => {
  const tp = totalPages.value, p = props.page
  const start = Math.max(1, Math.min(p - 2, tp - 4))
  const end = Math.min(tp, start + 4)
  const out = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
})
</script>

<style scoped>
.pay-pg { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  margin-top: 18px; padding: 12px 16px; border-radius: 14px; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); }
.pg-range { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted);
  display: inline-flex; align-items: center; gap: 8px; }
.pg-range strong { color: var(--pay-text); }
.pg-led { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-net); box-shadow: 0 0 8px var(--pay-net); }
.pg-nav { display: inline-flex; align-items: center; gap: 4px; }
.pg-arrow, .pg-tile, .pg-sz { border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; border-radius: 9px; transition: 0.2s; font-family: var(--pay-mono); }
.pg-arrow { width: 32px; height: 32px; display: grid; place-items: center; }
.pg-tile { min-width: 32px; height: 32px; padding: 0 8px; font-size: 12px; font-weight: 600; }
.pg-arrow:hover:not(:disabled), .pg-tile:hover { border-color: var(--pay-border); color: var(--pay-text); }
.pg-arrow:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-tile.active { background: var(--pay-grad-cta); color: #1a1206; border-color: transparent; font-weight: 700; }
.pg-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.pg-sz { padding: 4px 9px; font-size: 11px; }
.pg-sz.active { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }
</style>
