<template>
  <div class="rec-toolbar">
    <!-- Search -->
    <div v-if="!hideSearch" class="rec-search-pill">
      <Search :size="13" class="ic" />
      <input
        :value="search"
        :placeholder="searchPlaceholder"
        @input="onSearchInput"
        @keyup.enter="$emit('search-submit')"
      />
    </div>

    <!-- Filter pills (popover-driven) -->
    <FilterPill
      v-for="f in filters"
      :key="f.key"
      :label="f.label"
      :options="f.options"
      :model-value="f.value"
      @change="(v) => $emit('filter-change', f.key, v)"
    />

    <div class="grow" />

    <button
      v-if="!hideRefresh"
      class="rec-ghost-mini"
      :disabled="loading"
      @click="$emit('refresh')"
    >
      <RefreshCw :size="13" :class="{ 'is-spinning': loading }" />
      Refresh
    </button>

    <button
      v-if="canClear"
      class="rec-ghost-mini"
      :disabled="!hasFilters"
      @click="$emit('clear')"
    >
      <X :size="13" /> Clear
    </button>

    <button
      v-if="primary"
      class="rec-btn-primary"
      @click="$emit('primary')"
    >
      <component :is="primary.icon || Plus" :size="14" />
      {{ primary.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Search, RefreshCw, X, Plus } from 'lucide-vue-next'
import FilterPill from '../../../../components/hr/FilterPill.vue'

const props = defineProps({
  search:            { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Search…' },
  hideSearch:        { type: Boolean, default: false },
  hideRefresh:       { type: Boolean, default: false },
  filters:           { type: Array, default: () => [] }, // [{ key, label, options, value }]
  primary:           { type: Object, default: null },   // { label, icon }
  loading:           { type: Boolean, default: false },
  canClear:          { type: Boolean, default: true },
})

const emit = defineEmits([
  'update:search',
  'search-submit',
  'filter-change',
  'refresh',
  'clear',
  'primary',
])

const hasFilters = computed(() =>
  (props.search && props.search.length) ||
  (props.filters || []).some(f => f.value !== null && f.value !== undefined && f.value !== '')
)

let timer = null
const onSearchInput = (e) => {
  const v = e.target.value
  emit('update:search', v)
  clearTimeout(timer)
  timer = setTimeout(() => emit('search-submit'), 240)
}
</script>

<style scoped>
.rec-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 0;
}
.grow { flex: 1; min-width: 0; }

.is-spinning { animation: rec-orbit-spin 1s linear infinite; }
@keyframes rec-orbit-spin { to { transform: rotate(360deg); } }
</style>
