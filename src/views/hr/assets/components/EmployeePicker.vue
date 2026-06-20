<template>
  <div class="ep">
    <span class="af-lab">{{ label }} <i v-if="required">*</i></span>
    <div class="ep-search">
      <Search :size="14" />
      <input v-model="q" :placeholder="placeholder" @focus="load" />
    </div>
    <div v-if="loading" class="ep-hint">Loading…</div>
    <div v-else-if="filtered.length" class="ep-list">
      <button v-for="e in filtered.slice(0, 30)" :key="e.id" type="button" class="ep-row" :class="{ on: modelValue === e.id }" @click="$emit('update:modelValue', e.id); $emit('change', e)">
        <span class="ep-av">{{ initials(e.full_name) }}</span>
        <span class="ep-name">{{ e.full_name || 'Unnamed' }}</span>
        <span v-if="e.employee_id" class="ep-code as-mono">{{ e.employee_id }}</span>
        <Check v-if="modelValue === e.id" :size="14" class="ep-tick" />
      </button>
    </div>
    <div v-else class="ep-hint">{{ q ? 'No matches.' : 'Type to search…' }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { Search, Check } from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Employee' },
  placeholder: { type: String, default: 'Search employee…' },
  required: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'change'])

const q = ref('')
const employees = ref([])
const loading = ref(false)
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return employees.value
  return employees.value.filter(e => (e.full_name || '').toLowerCase().includes(s) || (e.employee_id || '').toLowerCase().includes(s))
})
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

async function load() {
  if (employees.value.length || loading.value) return
  loading.value = true
  try {
    const all = []
    let page = 1, total = Infinity
    while (all.length < total && page <= 60) {
      const { data } = await axios.get(`${API}/hr/employees/`, { headers: authHeader(), params: { page, limit: 100 } })
      const items = data.items || []
      all.push(...items)
      total = data.total ?? all.length
      if (!items.length) break
      page++
    }
    employees.value = all
  } finally { loading.value = false }
}
</script>

<style scoped>
.ep { display: flex; flex-direction: column; gap: 6px; }
.af-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.af-lab i { color: var(--as-amber); font-style: normal; }
.ep-search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.ep-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); }
.ep-search input { flex: 1; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); }
.ep-hint { font-size: 12px; color: var(--as-text-muted); padding: 6px 2px; }
.ep-list { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.ep-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit; background: transparent; border: 1px solid transparent; color: var(--as-text-secondary); transition: all 0.16s; }
.ep-row:hover { background: var(--as-surface); }
.ep-row.on { background: color-mix(in srgb, var(--as-amber) 12%, transparent); border-color: color-mix(in srgb, var(--as-amber) 30%, transparent); color: var(--as-text); }
.ep-av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; font-size: 10.5px; font-weight: 700; color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); }
.ep-name { flex: 1; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ep-code { font-size: 10.5px; color: var(--as-text-dim); }
.ep-tick { color: var(--as-amber); }
</style>
