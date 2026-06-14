<template>
  <OnbModal :open="open" :title="editing ? 'Update OT rule' : 'New overtime rule'"
    subtitle="Thresholds, multipliers and caps that score overtime hours." :icon="Timer" :width="620" @close="$emit('close')">
    <div class="otm-grid">
      <div class="otm-row">
        <label class="otm-field grow"><span>Name <em>*</em></span><input v-model="form.name" placeholder="Weekday OT (after 8h)" class="otm-input" /></label>
        <label class="otm-field"><span>Type</span>
          <HrSelect :model-value="form.ot_type" :options="otOptions" @update:model-value="v => form.ot_type = v" />
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

      <!-- live preview -->
      <div class="otm-preview" :class="{ capped: form.max_ot_hours > 0 }">
        <span class="pv-core"><b>{{ prettyMult }}</b><span>×</span></span>
        <div class="pv-text">
          <span class="pv-line">Pays <b>{{ prettyMult }}×</b> on {{ otTypeMeta(form.ot_type).label.toLowerCase() }} OT</span>
          <span class="pv-sub">
            after {{ fmtNum(form.threshold_hours) }}h ·
            <template v-if="form.max_ot_hours > 0">capped at {{ fmtNum(form.max_ot_hours) }}h payable</template>
            <template v-else>uncapped payable</template>
            <template v-if="form.approval_required"> · needs approval</template>
          </span>
        </div>
        <span class="pv-flux" aria-hidden="true" />
      </div>
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
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { OT_TYPES, otTypeMeta, createOvertimeRule, updateOvertimeRule } from '@/composables/useShifts'

const otOptions = OT_TYPES.map(t => ({ value: t.key, label: t.label }))

const props = defineProps({
  open: Boolean,
  rule: { type: Object, default: null },
  presetType: { type: String, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const editing = computed(() => !!props.rule?.id)
const saving = ref(false)
const blank = () => ({ name: '', ot_type: 'WEEKDAY', threshold_hours: 8, multiplier: 1.5, max_ot_hours: null, approval_required: true, priority: 0, description: '' })
const form = reactive(blank())

const prettyMult = computed(() => (Number(form.multiplier) || 0).toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))
const fmtNum = (n) => { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(1) }

watch(() => props.open, (o) => {
  if (!o) return
  if (props.rule?.id) Object.assign(form, { ...blank(), ...props.rule, max_ot_hours: props.rule.max_ot_hours ?? null })
  else Object.assign(form, { ...blank(), ot_type: props.presetType || 'WEEKDAY' })
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
.otm-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.otm-field.grow { flex: 1; }
.otm-field > span { font-size: 11px; color: var(--shift-text-muted); }
.otm-field em { color: var(--shift-amber); font-style: normal; }
.otm-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.otm-input:focus { outline: none; border-color: var(--shift-amber); }
/* strip native number spinners */
.otm-input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.otm-input[type="number"]::-webkit-outer-spin-button,
.otm-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.otm-toggle { display: inline-flex; align-items: center; gap: 8px; align-self: flex-end; padding-bottom: 8px; font-size: 12.5px; color: var(--shift-text-2); cursor: pointer; }
.otm-toggle span { display: inline-flex; align-items: center; gap: 6px; }
.otm-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.otm-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.otm-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.otm-primary:disabled { opacity: 0.5; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

/* live preview */
.otm-preview { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; margin-top: 4px; padding: 13px 15px; border-radius: 14px;
  background: var(--shift-surface-2, rgba(26,29,34,0.86)); border: 1px solid color-mix(in srgb, var(--shift-amber, #fbbf24) 35%, transparent); }
.otm-preview.capped { border-color: color-mix(in srgb, var(--shift-alert, #ef4444) 40%, transparent); }
.pv-core { display: inline-flex; align-items: baseline; gap: 1px; flex-shrink: 0; font-family: var(--shift-mono); }
.pv-core b { font-size: 28px; font-weight: 900; color: var(--shift-amber, #fbbf24); letter-spacing: -0.02em; line-height: 1; }
.otm-preview.capped .pv-core b { color: var(--shift-ember-strong, #ea580c); }
.pv-core span { font-size: 15px; color: var(--shift-text-muted); }
.pv-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.pv-line { font-size: 13px; color: var(--shift-text); }
.pv-line b { color: var(--shift-amber, #fbbf24); }
.pv-sub { font-size: 11px; color: var(--shift-text-muted); line-height: 1.4; }
.pv-flux { position: absolute; left: 0; top: 0; bottom: 0; width: 60%; pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--shift-amber, #fbbf24) 10%, transparent), transparent);
  animation: pv-sweep 3.4s ease-in-out infinite; }
@keyframes pv-sweep { 0%,100% { transform: translateX(-60%); opacity: 0; } 50% { transform: translateX(180%); opacity: 1; } }

@media (max-width: 560px) { .otm-row, .otm-row.tri { flex-direction: column; grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .pv-flux { animation: none; } }
</style>
