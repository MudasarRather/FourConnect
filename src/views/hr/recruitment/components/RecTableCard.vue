<template>
  <div class="rec-table-card">
    <!-- Loading skeleton -->
    <div v-if="loading && !rows.length" class="rec-loading-grid">
      <div v-for="i in 6" :key="i" class="rec-skel-row">
        <div class="rec-skel" style="width: 40px; height: 40px; border-radius: 50%;" />
        <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
          <div class="rec-skel" style="width: 40%; height: 12px;" />
          <div class="rec-skel" style="width: 20%; height: 10px;" />
        </div>
        <div class="rec-skel" style="width: 100px; height: 10px;" />
        <div class="rec-skel" style="width: 80px; height: 20px; border-radius: 999px;" />
      </div>
    </div>

    <!-- Grid-based table — CSS Grid guarantees column alignment between header
         and data cells, which the HTML `<table>` engine kept getting wrong. -->
    <div
      v-else-if="rows.length"
      class="rec-table"
      :style="gridCss ? { '--rec-grid-cols': gridCss } : null"
      role="table"
    >
      <div class="rec-thead" role="row">
        <slot name="header" />
      </div>
      <div class="rec-tbody" role="rowgroup">
        <slot
          v-for="(item, idx) in rows"
          :key="rowKey ? item[rowKey] : idx"
          name="row"
          :item="item"
          :idx="idx"
        />
      </div>
    </div>

    <!-- Empty -->
    <div v-else>
      <slot name="empty" />
    </div>

    <!-- Pagination -->
    <div v-if="rows.length && totalPages > 1" class="rec-pagination-bar">
      <span class="page-info">
        {{ rangeStart }}–{{ rangeEnd }} of {{ total }}
      </span>
      <div class="page-chips">
        <button class="page-chip" :disabled="page <= 1" @click="$emit('page', page - 1)">
          <ChevronLeft :size="14" />
        </button>
        <button
          v-for="p in pageRange"
          :key="p.key"
          class="page-chip"
          :class="{ active: p.value === page, ellipsis: p.value === '...' }"
          :disabled="p.value === '...'"
          @click="p.value !== '...' && $emit('page', p.value)"
        >{{ p.value }}</button>
        <button class="page-chip" :disabled="page >= totalPages" @click="$emit('page', page + 1)">
          <ChevronRight :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  rows:       { type: Array, default: () => [] },
  total:      { type: Number, default: 0 },
  loading:    { type: Boolean, default: false },
  page:       { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  pageSize:   { type: Number, default: 20 },
  rowKey:     { type: String, default: 'id' },
  // CSS grid-template-columns string (e.g. "130px 1fr 170px 130px 110px 110px 140px 130px 90px")
  gridCss:    { type: String, default: '' },
})
defineEmits(['page'])

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd   = computed(() => Math.min(props.total, props.page * props.pageSize))

const pageRange = computed(() => {
  const out = []
  const p = props.page, tp = props.totalPages
  const window = 1
  for (let i = 1; i <= tp; i++) {
    if (i === 1 || i === tp || (i >= p - window && i <= p + window)) {
      out.push({ key: `p-${i}`, value: i })
    } else if (i === p - window - 1 || i === p + window + 1) {
      out.push({ key: `e-${i}`, value: '...' })
    }
  }
  // de-dupe consecutive ellipsis
  return out.filter((p, i, a) => !(p.value === '...' && a[i - 1]?.value === '...'))
})
</script>

<style scoped>
.rec-loading-grid { padding: 8px; }
.rec-skel-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
</style>
