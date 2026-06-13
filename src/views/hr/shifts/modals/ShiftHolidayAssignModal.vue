<template>
  <OnbModal :open="open" :title="holiday ? `Assign · ${holiday.name}` : 'Assign holiday shift'"
    :subtitle="holiday ? `${holiday.date} · pick staff working this holiday and their compensation` : ''"
    :icon="Palmtree" :width="680" @close="$emit('close')">
    <div class="hm-stack" v-if="holiday">
      <div class="hm-row">
        <label class="hm-field"><span>Compensation</span>
          <select v-model="form.compensation" class="hm-input" @change="syncMult">
            <option v-for="c in HOLIDAY_COMP_TYPES" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </label>
        <label class="hm-field"><span>Multiplier (×)</span><input v-model.number="form.pay_multiplier" type="number" min="0" step="0.25" class="hm-input" /></label>
        <label class="hm-field grow"><span>Shift (optional)</span>
          <select v-model="form.shift_id" class="hm-input"><option value="">—</option><option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option></select>
        </label>
      </div>
      <div class="hm-search"><Search :size="13" /><input v-model="search" placeholder="Search employees…" @input="onSearch" /><span v-if="form.employee_ids.length" class="hm-count">{{ form.employee_ids.length }} selected</span></div>
      <div class="hm-emps" v-if="filtered.length">
        <button v-for="e in filtered" :key="e.id" type="button" class="hm-emp" :class="{ on: form.employee_ids.includes(e.id) }" @click="toggle(e.id)">
          <span class="he-av">{{ initials(e.full_name) }}</span>
          <span class="he-meta"><b>{{ e.full_name }}</b><small>{{ e.department_name || '—' }}</small></span>
          <Check v-if="form.employee_ids.includes(e.id)" :size="14" class="he-ck" />
        </button>
      </div>
      <div v-else class="hm-empty">{{ loadingEmps ? 'Loading…' : 'No employees match' }}</div>
    </div>
    <template #footer>
      <span class="hm-foot">{{ form.employee_ids.length }} selected</span>
      <button class="hm-ghost" @click="$emit('close')">Cancel</button>
      <button class="hm-primary" :disabled="!form.employee_ids.length || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" /> Assign
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Palmtree, Search, Check, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { HOLIDAY_COMP_TYPES, compMeta, fetchEmployeesLite, fetchShifts, bulkHolidayShift } from '@/composables/useShifts'

const props = defineProps({ open: Boolean, holiday: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const employees = ref([])
const shifts = ref([])
const loadingEmps = ref(false)
const saving = ref(false)
const search = ref('')
const form = reactive({ employee_ids: [], compensation: 'DOUBLE_PAY', pay_multiplier: 2.0, shift_id: '' })

watch(() => props.open, async (o) => {
  if (!o || !props.holiday) return
  Object.assign(form, { employee_ids: [], compensation: 'DOUBLE_PAY', pay_multiplier: 2.0, shift_id: '' })
  search.value = ''
  try { [employees.value, shifts.value] = await Promise.all([fetchEmployeesLite(''), fetchShifts({ limit: 100 }).then(d => d.items || [])]) } catch { /* */ }
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = !q ? employees.value : employees.value.filter(e => (e.full_name || '').toLowerCase().includes(q) || (e.department_name || '').toLowerCase().includes(q))
  return list.slice(0, 100)
})
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const syncMult = () => { form.pay_multiplier = compMeta(form.compensation).mult }
const toggle = (id) => { const i = form.employee_ids.indexOf(id); if (i >= 0) form.employee_ids.splice(i, 1); else form.employee_ids.push(id) }
let timer = null
const onSearch = () => { clearTimeout(timer); timer = setTimeout(async () => { try { employees.value = await fetchEmployeesLite(search.value.trim()) } catch { /* */ } }, 260) }

const submit = async () => {
  if (!form.employee_ids.length) return
  saving.value = true
  try {
    const res = await bulkHolidayShift({ holiday_id: props.holiday.id, employee_ids: form.employee_ids, shift_id: form.shift_id || null, compensation: form.compensation, pay_multiplier: form.pay_multiplier })
    toast.success(`${res.assigned} assigned${res.skipped ? `, ${res.skipped} already on` : ''}`)
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign') }
  finally { saving.value = false }
}
</script>

<style scoped>
.hm-stack { display: flex; flex-direction: column; gap: 14px; }
.hm-row { display: flex; gap: 12px; }
.hm-field { display: flex; flex-direction: column; gap: 5px; }
.hm-field.grow { flex: 1; }
.hm-field > span { font-size: 11px; color: var(--shift-text-muted); }
.hm-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.hm-search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); }
.hm-search input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.hm-count { font-size: 11px; font-family: var(--shift-mono); color: var(--shift-amber); }
.hm-emps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px; }
.hm-emp { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; cursor: pointer; text-align: left; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.hm-emp.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.he-av { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 11px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.he-meta { display: flex; flex-direction: column; min-width: 0; }
.he-meta b { font-size: 12.5px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.he-meta small { font-size: 10.5px; color: var(--shift-text-muted); }
.he-ck { margin-left: auto; color: var(--shift-amber); }
.hm-empty { padding: 22px; text-align: center; color: var(--shift-text-dim); font-size: 12.5px; }
.hm-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.hm-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.hm-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.hm-primary:disabled { opacity: 0.5; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
@media (max-width: 600px) { .hm-row { flex-direction: column; } .hm-emps { grid-template-columns: 1fr; } }
</style>
