<template>
  <OnbModal :open="open" :title="editing ? 'Update demand' : 'New workforce demand'"
    subtitle="Required headcount for a shift over a dated window — the forecast projects it against capacity."
    :icon="TrendingUp" :width="620" @close="$emit('close')">
    <div class="dm-grid" v-if="open">
      <div class="dm-row">
        <label class="dm-field grow"><span>Shift <em>*</em></span>
          <HrSelect :model-value="form.shift_id" :options="shiftOptions" placeholder="Select a shift…"
            @update:model-value="v => form.shift_id = v" />
        </label>
        <label class="dm-field"><span>Required (heads)</span><input v-model.number="form.required_headcount" type="number" min="0" class="dm-input" /></label>
      </div>
      <div class="dm-row">
        <label class="dm-field grow"><span>Department (optional)</span>
          <HrSelect :model-value="form.department_id" :options="deptOptions" placeholder="All departments"
            @update:model-value="v => form.department_id = v" />
        </label>
        <label class="dm-field"><span>Skill (optional)</span><input v-model="form.skill" placeholder="e.g. Ops" class="dm-input" /></label>
      </div>
      <div class="dm-row">
        <label class="dm-field"><span>Valid from <em>*</em></span>
          <HrDatePicker :model-value="form.valid_from" :clearable="false" @update:model-value="v => form.valid_from = v" />
        </label>
        <label class="dm-field"><span>Valid to</span>
          <HrDatePicker :model-value="form.valid_to" :min="form.valid_from" placeholder="open-ended" @update:model-value="v => form.valid_to = v" />
        </label>
        <label class="dm-field grow"><span>Notes</span><input v-model="form.notes" placeholder="Optional" class="dm-input" /></label>
      </div>
    </div>
    <template #footer>
      <span class="dm-foot">{{ editing ? 'Editing demand' : 'New demand' }}</span>
      <button class="dm-ghost" @click="$emit('close')">Cancel</button>
      <button class="dm-primary" :disabled="!valid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" /> {{ editing ? 'Save' : 'Create demand' }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { TrendingUp, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fetchShifts, fetchDepartments, createWorkforceDemand, updateWorkforceDemand, todayIso } from '@/composables/useShifts'

const props = defineProps({ open: Boolean, demand: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const shifts = ref([])
const departments = ref([])
const saving = ref(false)
const editing = computed(() => !!props.demand?.id)
const blank = () => ({ shift_id: '', department_id: '', required_headcount: 3, skill: '', valid_from: todayIso(), valid_to: '', notes: '' })
const form = reactive(blank())

watch(() => props.open, async (o) => {
  if (!o) return
  if (props.demand?.id) {
    const d = props.demand
    Object.assign(form, { shift_id: d.shift_id, department_id: d.department_id || '', required_headcount: d.required_headcount, skill: d.skill || '', valid_from: d.valid_from, valid_to: d.valid_to || '', notes: d.notes || '' })
  } else { Object.assign(form, blank()) }
  try { [shifts.value, departments.value] = await Promise.all([fetchShifts({ limit: 100 }).then(d => d.items || []), fetchDepartments()]) } catch { /* */ }
})

const shiftOptions = computed(() => shifts.value.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` })))
const deptOptions = computed(() => [{ value: '', label: 'All departments' }, ...departments.value.map(d => ({ value: d.id, label: d.name }))])

const valid = computed(() => form.shift_id && form.valid_from && form.required_headcount >= 0)

const submit = async () => {
  if (!valid.value) return
  saving.value = true
  try {
    const payload = { shift_id: form.shift_id, department_id: form.department_id || null, required_headcount: form.required_headcount, skill: form.skill || null, valid_from: form.valid_from, valid_to: form.valid_to || null, notes: form.notes || null }
    if (editing.value) { await updateWorkforceDemand(props.demand.id, payload); toast.success('Demand updated') }
    else { await createWorkforceDemand(payload); toast.success('Demand created') }
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save demand') }
  finally { saving.value = false }
}
</script>

<style scoped>
.dm-grid { display: flex; flex-direction: column; gap: 12px; }
.dm-row { display: flex; gap: 12px; }
.dm-field { display: flex; flex-direction: column; gap: 5px; }
.dm-field.grow { flex: 1; }
.dm-field > span { font-size: 11px; color: var(--shift-text-muted); }
.dm-field em { color: var(--shift-amber); font-style: normal; }
.dm-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.dm-input:focus { outline: none; border-color: var(--shift-amber); }
.dm-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.dm-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.dm-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.dm-primary:disabled { opacity: 0.5; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
@media (max-width: 560px) { .dm-row { flex-direction: column; } }
</style>
