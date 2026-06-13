<template>
  <OnbModal
    :open="open"
    :title="editing ? 'Update rotation' : 'New shift rotation'"
    :subtitle="'A cyclic pattern — each step is a shift (or OFF). Advance it to schedule members.'"
    :icon="RefreshCcw"
    :width="760"
    @close="$emit('close')"
  >
    <div class="rm-grid">
      <fieldset class="rm-block">
        <legend>Rotation</legend>
        <div class="rm-row tri">
          <label class="rm-field"><span>Name <em>*</em></span><input v-model="form.name" placeholder="3-week rotating" class="rm-input" /></label>
          <label class="rm-field"><span>Code</span><input v-model="form.code" placeholder="ROT-3W" class="rm-input" /></label>
          <label class="rm-field"><span>Cycle</span>
            <select v-model="form.cycle" class="rm-input">
              <option value="WEEKLY">Weekly (7d)</option>
              <option value="BIWEEKLY">Biweekly (14d)</option>
              <option value="MONTHLY">Monthly (30d)</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>
        </div>
        <div class="rm-row tri">
          <label class="rm-field" v-if="form.cycle === 'CUSTOM'"><span>Step length (days)</span><input v-model.number="form.frequency_days" type="number" min="1" class="rm-input" /></label>
          <label class="rm-field"><span>Anchor date</span><input v-model="form.anchor_date" type="date" class="rm-input" /></label>
          <label class="rm-field"><span>Description</span><input v-model="form.description" placeholder="Optional" class="rm-input" /></label>
        </div>
      </fieldset>

      <fieldset class="rm-block">
        <legend>Steps (in order)</legend>
        <div class="rm-steps">
          <div v-for="(s, i) in form.steps" :key="i" class="rm-step">
            <span class="rm-step-no">{{ i + 1 }}</span>
            <select v-model="s.shift_id" class="rm-input grow">
              <option :value="null">OFF (rest block)</option>
              <option v-for="sh in shifts" :key="sh.id" :value="sh.id">{{ sh.name }} ({{ sh.code }})</option>
            </select>
            <input v-model="s.label" placeholder="Label (optional)" class="rm-input rm-step-lbl" />
            <button type="button" class="rm-del" @click="form.steps.splice(i, 1)"><X :size="13" /></button>
          </div>
        </div>
        <button type="button" class="rm-ghost" @click="form.steps.push({ shift_id: null, label: '' })"><Plus :size="13" />Add step</button>
      </fieldset>

      <fieldset class="rm-block">
        <legend>Members ({{ form.member_employee_ids.length }})</legend>
        <div class="rm-search"><Search :size="14" /><input v-model="empSearch" placeholder="Search employees…" @input="onSearch" /></div>
        <div class="rm-emps" v-if="filteredEmps.length">
          <button v-for="e in filteredEmps" :key="e.id" type="button" class="rm-emp" :class="{ on: form.member_employee_ids.includes(e.id) }" @click="toggleEmp(e.id)">
            <span class="re-av">{{ initials(e.full_name) }}</span>
            <span class="re-meta"><b>{{ e.full_name }}</b><small>{{ e.department_name || '—' }}</small></span>
            <Check v-if="form.member_employee_ids.includes(e.id)" :size="13" class="re-ck" />
          </button>
        </div>
        <div v-else class="rm-empty">{{ loadingEmps ? 'Loading…' : 'No employees match' }}</div>
      </fieldset>
    </div>

    <template #footer>
      <span class="rm-foot-note">{{ form.steps.length }} steps · {{ form.member_employee_ids.length }} members</span>
      <button class="rm-ghost plain" @click="$emit('close')">Cancel</button>
      <button class="rm-primary" :disabled="!isValid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" />
        {{ saving ? 'Saving…' : (editing ? 'Save rotation' : 'Create rotation') }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { RefreshCcw, Plus, X, Search, Check, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { createRotation, updateRotation, fetchEmployeesLite, todayIso } from '@/composables/useShifts'

const props = defineProps({
  open: { type: Boolean, default: false },
  rotation: { type: Object, default: null },
  shifts: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const editing = computed(() => !!props.rotation?.id)
const saving = ref(false)
const employees = ref([])
const empSearch = ref('')
const loadingEmps = ref(false)

const blank = () => ({
  name: '', code: '', cycle: 'WEEKLY', frequency_days: 7, description: '',
  anchor_date: todayIso(), steps: [{ shift_id: null, label: '' }], member_employee_ids: [],
})
const form = reactive(blank())

watch(() => props.open, async (o) => {
  if (!o) return
  if (props.rotation?.id) {
    const r = props.rotation
    Object.assign(form, {
      name: r.name, code: r.code || '', cycle: r.cycle || 'WEEKLY', frequency_days: r.frequency_days || 7,
      description: r.description || '', anchor_date: r.anchor_date || todayIso(),
      steps: (r.steps || []).map(s => ({ shift_id: s.shift_id || null, label: s.label || '' })),
      member_employee_ids: (r.members || []).map(m => m.employee_id),
    })
    if (!form.steps.length) form.steps = [{ shift_id: null, label: '' }]
  } else {
    Object.assign(form, blank())
  }
  await loadEmps()
})

const loadEmps = async (q = '') => {
  loadingEmps.value = true
  try { employees.value = await fetchEmployeesLite(q) }
  catch { /* best-effort */ }
  finally { loadingEmps.value = false }
}
let timer = null
const onSearch = () => { clearTimeout(timer); timer = setTimeout(() => loadEmps(empSearch.value.trim()), 280) }

const filteredEmps = computed(() => {
  const q = empSearch.value.trim().toLowerCase()
  const list = !q ? employees.value : employees.value.filter(e => (e.full_name || '').toLowerCase().includes(q) || (e.department_name || '').toLowerCase().includes(q))
  return list.slice(0, 60)
})
const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const toggleEmp = (id) => {
  const i = form.member_employee_ids.indexOf(id)
  if (i >= 0) form.member_employee_ids.splice(i, 1); else form.member_employee_ids.push(id)
}

const isValid = computed(() => !!form.name.trim() && form.steps.length > 0)

const submit = async () => {
  if (!isValid.value) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(), code: form.code.trim() || null, cycle: form.cycle,
      frequency_days: form.cycle === 'CUSTOM' ? (Number(form.frequency_days) || 7) : null,
      description: form.description || null, anchor_date: form.anchor_date || null,
      department_ids: [],
      steps: form.steps.map((s, i) => ({ sequence: i, shift_id: s.shift_id || null, label: s.label || null })),
      member_employee_ids: form.member_employee_ids,
    }
    if (editing.value) { await updateRotation(props.rotation.id, payload); toast.success('Rotation updated') }
    else { await createRotation(payload); toast.success('Rotation created') }
    emit('saved'); emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save rotation')
  } finally { saving.value = false }
}
</script>

<style scoped>
.rm-grid { display: flex; flex-direction: column; gap: 16px; }
.rm-block { border: 1px solid var(--shift-border-soft); border-radius: 14px; padding: 14px 16px 16px; margin: 0; }
.rm-block legend { padding: 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-amber-strong); font-family: var(--shift-mono); }
.rm-row { display: grid; gap: 12px; }
.rm-row.tri { grid-template-columns: 1fr 1fr 1fr; }
.rm-field { display: flex; flex-direction: column; gap: 5px; }
.rm-field > span { font-size: 11px; color: var(--shift-text-muted); }
.rm-field em { color: var(--shift-amber); font-style: normal; }
.rm-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.rm-input:focus { outline: none; border-color: var(--shift-amber); }
.rm-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.rm-step { display: flex; align-items: center; gap: 8px; }
.rm-step-no { width: 24px; height: 24px; flex-shrink: 0; border-radius: 7px; display: grid; place-items: center; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.rm-input.grow { flex: 1; }
.rm-step-lbl { width: 150px; }
.rm-del { width: 30px; height: 30px; flex-shrink: 0; border-radius: 8px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; display: grid; place-items: center; }
.rm-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 12.5px; font-weight: 600; }
.rm-ghost:hover { border-color: var(--shift-border); color: var(--shift-text); }
.rm-search { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); margin-bottom: 10px; }
.rm-search input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.rm-emps { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; max-height: 200px; overflow-y: auto; padding-right: 4px; }
.rm-emp { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 10px; cursor: pointer; text-align: left; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.rm-emp.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.re-av { width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 10px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.re-meta { display: flex; flex-direction: column; min-width: 0; }
.re-meta b { font-size: 12px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.re-meta small { font-size: 10px; color: var(--shift-text-muted); }
.re-ck { margin-left: auto; color: var(--shift-amber); }
.rm-empty { padding: 16px; text-align: center; color: var(--shift-text-dim); font-size: 12px; }
.rm-foot-note { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.rm-ghost.plain { border-color: var(--shift-border-soft); }
.rm-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.rm-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }
@media (max-width: 600px) { .rm-row.tri { grid-template-columns: 1fr; } .rm-emps { grid-template-columns: 1fr; } }
</style>
