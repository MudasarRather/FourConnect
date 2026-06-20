<template>
  <div class="ap">
    <span class="af-lab">{{ label }} <i v-if="required">*</i></span>
    <div v-if="selected" class="ap-selected">
      <AssetTypeBadge :type="selected.asset_type" />
      <div class="ap-sel-main">
        <span class="ap-sel-code as-mono">{{ selected.asset_code }}</span>
        <span class="ap-sel-meta">{{ selected.brand }} {{ selected.model || '' }} · {{ selected.status }}</span>
      </div>
      <button type="button" class="ap-clear" @click="clear"><X :size="14" /></button>
    </div>
    <template v-else>
      <div class="ap-search">
        <Search :size="14" />
        <input v-model="q" :placeholder="placeholder" @input="debounced" />
      </div>
      <div v-if="loading" class="ap-hint">Searching…</div>
      <div v-else-if="results.length" class="ap-list">
        <button v-for="a in results" :key="a.id" type="button" class="ap-row" @click="pick(a)">
          <AssetTypeBadge :type="a.asset_type" />
          <span class="ap-row-code as-mono">{{ a.asset_code }}</span>
          <span class="ap-row-meta">{{ a.brand }} {{ a.model || '' }}</span>
          <AssetStatusStamp :value="a.status" />
        </button>
      </div>
      <div v-else-if="q" class="ap-hint">No matching assets.</div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import AssetTypeBadge from './AssetTypeBadge.vue'
import AssetStatusStamp from './AssetStatusStamp.vue'
import { fetchAssets } from '@/composables/useAssets'

const props = defineProps({
  modelValue: { type: Object, default: null },
  label: { type: String, default: 'Asset' },
  placeholder: { type: String, default: 'Search asset by code / serial…' },
  statusFilter: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const q = ref('')
const results = ref([])
const loading = ref(false)
const selected = ref(props.modelValue)
// keep internal selection in sync when the parent resets/changes it (e.g. modal reopen)
watch(() => props.modelValue, (v) => { if (v !== selected.value) { selected.value = v; if (!v) { results.value = []; q.value = '' } } })

let deb = null
function debounced() { clearTimeout(deb); deb = setTimeout(search, 300) }
async function search() {
  if (!q.value.trim()) { results.value = []; return }
  loading.value = true
  try {
    const res = await fetchAssets({ search: q.value, limit: 10, asset_status: props.statusFilter || undefined })
    results.value = res.items || []
  } finally { loading.value = false }
}
function pick(a) { selected.value = a; results.value = []; q.value = ''; emit('update:modelValue', a) }
function clear() { selected.value = null; emit('update:modelValue', null) }
</script>

<style scoped>
.ap { display: flex; flex-direction: column; gap: 6px; }
.af-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.af-lab i { color: var(--as-amber); font-style: normal; }
.ap-search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.ap-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); }
.ap-search input { flex: 1; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); }
.ap-hint { font-size: 12px; color: var(--as-text-muted); padding: 6px 2px; }
.ap-list { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.ap-row { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surface); border: 1px solid transparent; transition: all 0.16s; }
.ap-row:hover { background: var(--as-surface-elevated); border-color: var(--as-border-strong); }
.ap-row-code { font-size: 13px; font-weight: 700; color: var(--as-text); }
.ap-row-meta { flex: 1; font-size: 11.5px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-selected { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px;
  background: color-mix(in srgb, var(--as-amber) 8%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.ap-sel-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ap-sel-code { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.ap-sel-meta { font-size: 11.5px; color: var(--as-text-muted); }
.ap-clear { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ap-clear:hover { color: var(--as-cond-poor); }
</style>
