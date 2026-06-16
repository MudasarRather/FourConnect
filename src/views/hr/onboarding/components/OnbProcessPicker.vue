<template>
  <div class="onb-picker">
    <div class="onb-picker-inner">
      <OnbField
        :model-value="modelValue"
        @update:model-value="onChange"
        :label="label"
        type="select"
        :placeholder="emptyLabel"
        :options="options"
        :option-key="o => o.id"
        :option-value="o => o.id"
        :option-label="o => labelFor(o)"
        :full="true"
      />
    </div>
    <div class="onb-picker-actions">
      <button class="onb-btn-ghost" @click="reload" :disabled="loading" title="Refresh">
        <RefreshCw :size="13" :class="{ 'is-spinning': loading }" />
        Refresh
      </button>
      <button v-if="processes.length === 0 && !loading" class="onb-btn-primary" @click="doBackfill" title="Create onboarding processes for any employee without one">
        <Sparkles :size="13" />
        Backfill
      </button>
    </div>

    <p v-if="processes.length === 0 && !loading" class="onb-picker-empty">
      No onboarding processes yet. Click <strong>Backfill</strong> to create them for existing employees, or add a new employee from
      <em>HR → Employees → Add Employee</em>.
    </p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { RefreshCw, Sparkles } from 'lucide-vue-next'
import axios from 'axios'
import { API } from '@/utils/api'
import { fetchProcesses } from '../composables/useOnboarding'
import OnbField from './OnbField.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Onboarding process' },
  emptyLabel: { type: String, default: '— Select a joiner —' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const toast = useToast()
const processes = ref([])
const loading = ref(false)

const STAGE_LABELS = {
  PRE_JOIN: 'Pre-Join', APPROVAL: 'Approval', DOCS: 'Documents',
  IDENTITY: 'Identity', ASSETS: 'Assets', TRAINING: 'Training', ACTIVE: 'Active',
}
const labelFor = (p) => `${p.employee_name || 'Joiner'} · ${p.employee_code || ''} · ${STAGE_LABELS[p.current_stage] || p.current_stage} (${p.progress_pct || 0}%)`

const options = ref([])

// Persist the picker selection across tab switches so an admin who uploads a doc,
// flips to another tab, and comes back still sees the same joiner pre-selected.
const LS_KEY = 'onb:selected-process-id'

const reload = async () => {
  loading.value = true
  try {
    const data = await fetchProcesses({ limit: 200 })
    processes.value = data.items || []
    options.value = processes.value
    if (!processes.value.length) return

    // Resolve the desired selection: caller's modelValue > localStorage > first row.
    const stored = localStorage.getItem(LS_KEY) || ''
    const desired = props.modelValue || stored || processes.value[0].id
    const exists = processes.value.some(p => p.id === desired)
    const pick = exists ? desired : processes.value[0].id

    if (pick !== props.modelValue) {
      emit('update:modelValue', pick)
      emit('change', pick)
    }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load processes')
  } finally {
    loading.value = false
  }
}

const doBackfill = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
    const { data } = await axios.post(`${API}/hr/onboarding/processes/backfill`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    toast.success(`Created ${data.created || 0} onboarding processes`)
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Backfill failed')
  } finally {
    loading.value = false
  }
}

const onChange = (v) => {
  if (v) localStorage.setItem(LS_KEY, v)
  emit('update:modelValue', v)
  emit('change', v)
}

// Persist whenever the bound value changes via any path
watch(() => props.modelValue, (v) => {
  if (v) localStorage.setItem(LS_KEY, v)
})

onMounted(reload)
defineExpose({ reload, processes })
</script>

<style scoped>
.onb-picker {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 14px;
}
.onb-picker-inner { flex: 1; }
.onb-picker-actions {
  display: flex; gap: 8px; align-items: center; justify-content: flex-end;
}
.is-spinning { animation: hr-rotate-conic 1s linear infinite; }
.onb-picker-empty {
  font-size: 12px; color: var(--hr-text-muted); margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--hr-border-strong); border-radius: 10px;
  line-height: 1.6;
}
</style>
