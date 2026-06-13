<template>
  <OnbModal :open="open" :title="editing ? 'Update OT rule' : 'New overtime rule'"
    subtitle="Thresholds, multipliers and caps that score overtime hours." :icon="Timer" :width="620" @close="$emit('close')">
    <div class="otm-grid">
      <div class="otm-row">
        <label class="otm-field grow"><span>Name <em>*</em></span><input v-model="form.name" placeholder="Weekday OT (after 8h)" class="otm-input" /></label>
        <label class="otm-field"><span>Type</span>
          <select v-model="form.ot_type" class="otm-input">
            <option v-for="t in OT_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
          </select>
        </label>
      </div>
      <div class="otm-row tri">
        <label class="otm-field"><span>Threshold (hrs)</span><input v-model.number="form.threshold_hours" type="number" min="0" step="0.5" class="otm-input" /></label>
        <label class="otm-field"><span>Multiplier (×)</span><input v-model.number="form.multiplier" type="number" min="1" step="0.25" class="otm-input" /></label>
        <label class="otm-field"><span>Max OT (hrs)</span><input v-model.number="form.max_ot_hours" type="number" min="0" step="0.5" class="otm-input" placeholder="uncapped" /></label>
      </div>
      <div class="otm-row">
        <label class="otm-field"><span>Priority</span><input v-model.number="form.priority" type="number" min="0" class="otm-input" /></label>
        <label class="otm-toggle"><input type="checkbox" v-model="form.approval_required" /> <span><ShieldCheck :size="12" /> Manager approval required</span></label>
      </div>
      <label class="otm-field"><span>Description</span><input v-model="form.description" placeholder="Optional" class="otm-input" /></label>
    </div>
    <template #footer>
      <span class="otm-foot">{{ editing ? 'Editing rule' : 'New rule' }}</span>
      <button class="otm-ghost" @click="$emit('close')">Cancel</button>
      <button class="otm-primary" :disabled="!form.name || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" /> {{ editing ? 'Save' : 'Create rule' }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { reactive, computed, watch, ref } from 'vue'
import { Timer, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { OT_TYPES, createOvertimeRule, updateOvertimeRule } from '@/composables/useShifts'

const props = defineProps({ open: Boolean, rule: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const editing = computed(() => !!props.rule?.id)
const saving = ref(false)
const blank = () => ({ name: '', ot_type: 'WEEKDAY', threshold_hours: 8, multiplier: 1.5, max_ot_hours: null, approval_required: true, priority: 0, description: '' })
const form = reactive(blank())

watch(() => props.open, (o) => {
  if (!o) return
  if (props.rule?.id) Object.assign(form, { ...blank(), ...props.rule, max_ot_hours: props.rule.max_ot_hours ?? null })
  else Object.assign(form, blank())
})

const submit = async () => {
  if (!form.name) return
  saving.value = true
  try {
    const payload = { ...form, max_ot_hours: form.max_ot_hours === '' ? null : form.max_ot_hours, department_ids: [] }
    if (editing.value) { await updateOvertimeRule(props.rule.id, payload); toast.success('Rule updated') }
    else { await createOvertimeRule(payload); toast.success('Rule created') }
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save rule') }
  finally { saving.value = false }
}
</script>

<style scoped>
.otm-grid { display: flex; flex-direction: column; gap: 12px; }
.otm-row { display: flex; gap: 12px; }
.otm-row.tri { display: grid; grid-template-columns: 1fr 1fr 1fr; }
.otm-field { display: flex; flex-direction: column; gap: 5px; }
.otm-field.grow { flex: 1; }
.otm-field > span { font-size: 11px; color: var(--shift-text-muted); }
.otm-field em { color: var(--shift-amber); font-style: normal; }
.otm-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.otm-input:focus { outline: none; border-color: var(--shift-amber); }
.otm-toggle { display: inline-flex; align-items: center; gap: 8px; align-self: flex-end; padding-bottom: 8px; font-size: 12.5px; color: var(--shift-text-2); cursor: pointer; }
.otm-toggle span { display: inline-flex; align-items: center; gap: 6px; }
.otm-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.otm-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.otm-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.otm-primary:disabled { opacity: 0.5; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
@media (max-width: 560px) { .otm-row, .otm-row.tri { flex-direction: column; grid-template-columns: 1fr; } }
</style>
