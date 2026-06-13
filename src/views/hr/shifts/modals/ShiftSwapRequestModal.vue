<template>
  <OnbModal :open="open" title="New shift swap" subtitle="Propose a swap between two employees for a date. Manager approval exchanges their shifts."
    :icon="ArrowLeftRight" :width="640" @close="$emit('close')">
    <div class="sw-grid" v-if="open">
      <div class="sw-pair">
        <div class="sw-side">
          <span class="sw-side-label">Requester</span>
          <select v-model="form.requester_employee_id" class="sw-input"><option value="">Select…</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option></select>
          <select v-model="form.requester_shift_id" class="sw-input"><option value="">Their shift…</option><option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option></select>
        </div>
        <span class="sw-swap-ic"><ArrowLeftRight :size="16" /></span>
        <div class="sw-side">
          <span class="sw-side-label">Counterparty</span>
          <select v-model="form.counterparty_employee_id" class="sw-input"><option value="">Select…</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option></select>
          <select v-model="form.counterparty_shift_id" class="sw-input"><option value="">Their shift…</option><option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option></select>
        </div>
      </div>
      <div class="sw-row">
        <label class="sw-field"><span>Swap date <em>*</em></span><input v-model="form.swap_date" type="date" class="sw-input" /></label>
        <label class="sw-field grow"><span>Reason</span><input v-model="form.reason" placeholder="Why the swap?" class="sw-input" /></label>
      </div>
    </div>
    <template #footer>
      <span class="sw-foot">Creates in “awaiting peer” — accept &amp; approve from the queue.</span>
      <button class="sw-ghost" @click="$emit('close')">Cancel</button>
      <button class="sw-primary" :disabled="!valid || saving" @click="submit">
        <CheckCircle2 v-if="!saving" :size="14" /><Loader2 v-else :size="14" class="spin" /> Create swap
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { ArrowLeftRight, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { createSwap, fetchEmployeesLite, fetchShifts, todayIso } from '@/composables/useShifts'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const employees = ref([])
const shifts = ref([])
const saving = ref(false)
const form = reactive({ requester_employee_id: '', counterparty_employee_id: '', requester_shift_id: '', counterparty_shift_id: '', swap_date: todayIso(), reason: '' })

watch(() => props.open, async (o) => {
  if (!o) return
  Object.assign(form, { requester_employee_id: '', counterparty_employee_id: '', requester_shift_id: '', counterparty_shift_id: '', swap_date: todayIso(), reason: '' })
  try { [employees.value, shifts.value] = await Promise.all([fetchEmployeesLite(''), fetchShifts({ limit: 100 }).then(d => d.items || [])]) } catch { /* */ }
})

const valid = computed(() => form.requester_employee_id && form.counterparty_employee_id && form.requester_employee_id !== form.counterparty_employee_id && form.swap_date)

const submit = async () => {
  if (!valid.value) { toast.warning('Pick two different employees and a date'); return }
  saving.value = true
  try {
    await createSwap({
      requester_employee_id: form.requester_employee_id, counterparty_employee_id: form.counterparty_employee_id,
      swap_date: form.swap_date, requester_shift_id: form.requester_shift_id || null,
      counterparty_shift_id: form.counterparty_shift_id || null, reason: form.reason || null,
    })
    toast.success('Swap request created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not create swap') }
  finally { saving.value = false }
}
</script>

<style scoped>
.sw-grid { display: flex; flex-direction: column; gap: 16px; }
.sw-pair { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: center; }
.sw-side { display: flex; flex-direction: column; gap: 8px; }
.sw-side-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-amber-strong); font-family: var(--shift-mono); }
.sw-swap-ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.sw-row { display: flex; gap: 12px; }
.sw-field { display: flex; flex-direction: column; gap: 5px; }
.sw-field.grow { flex: 1; }
.sw-field > span { font-size: 11px; color: var(--shift-text-muted); }
.sw-field em { color: var(--shift-amber); font-style: normal; }
.sw-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.sw-input:focus { outline: none; border-color: var(--shift-amber); }
.sw-foot { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.sw-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.sw-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.sw-primary:disabled { opacity: 0.5; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
@media (max-width: 560px) { .sw-pair { grid-template-columns: 1fr; } .sw-swap-ic { transform: rotate(90deg); justify-self: center; } .sw-row { flex-direction: column; } }
</style>
