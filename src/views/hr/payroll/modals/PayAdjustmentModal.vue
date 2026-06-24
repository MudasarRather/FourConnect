<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal entry" as="div"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero">
            <div class="paym-coin"><span class="paym-coin-ring" /><Wallet :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow">{{ kindMeta.label }}</p>
              <h2 class="paym-title">New {{ kindMeta.label.toLowerCase() }}</h2>
              <p class="paym-sub">This one-off amount is queued onto the employee's next eligible pay run and shown on their payslip.</p>
            </div>
          </header>

          <div class="paym-body">
            <label class="paym-field" :style="{'--i':0}"><span>Employee</span>
              <select v-model="f.employee_id">
                <option :value="null" disabled>Select employee…</option>
                <option v-for="e in selectableEmps" :key="e.id" :value="e.id">{{ empName(e) }} ({{ e.employee_id }})</option>
              </select>
              <small v-if="hiddenEmpCount" class="paym-note">{{ hiddenEmpCount }} exited employee{{ hiddenEmpCount > 1 ? 's' : '' }} hidden — their records are closed.</small>
            </label>

            <div class="paym-grid2">
              <label class="paym-field" :style="{'--i':1}"><span>Type</span>
                <select v-model="f.sub_type"><option v-for="s in kindMeta.subTypes" :key="s" :value="s">{{ s }}</option></select>
              </label>
              <label class="paym-field" :style="{'--i':2}"><span>Amount (₹)</span>
                <input v-model.number="f.amount" type="number" min="0" />
              </label>
            </div>

            <label class="paym-field" :style="{'--i':3}"><span>Title</span>
              <input v-model="f.title" :placeholder="`${f.sub_type || kindMeta.label}`" />
            </label>

            <div class="paym-grid2">
              <label class="paym-field" :style="{'--i':4}"><span>Pay-run month</span>
                <select v-model="f.period_month"><option :value="null">Next available</option>
                  <option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option></select>
              </label>
              <label class="paym-field" :style="{'--i':5}"><span>Year</span>
                <input v-model.number="f.period_year" type="number" />
              </label>
            </div>

            <div v-if="kind === 'ARREAR'" class="paym-grid2">
              <label class="paym-field" :style="{'--i':6}"><span>From</span><HrDatePicker v-model="f.from_date" /></label>
              <label class="paym-field" :style="{'--i':7}"><span>To</span><HrDatePicker v-model="f.to_date" /></label>
            </div>

            <label class="paym-field" :style="{'--i':8}"><span>Reason</span>
              <input v-model="f.reason" placeholder="Optional" />
            </label>

            <div class="paym-toggles row">
              <label class="paym-tg"><input type="checkbox" v-model="f.is_taxable" /> <span>Taxable</span></label>
              <label class="paym-tg"><input type="checkbox" v-model="f.is_deduction" /> <span>Deduct from net</span></label>
            </div>
          </div>

          <footer class="paym-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn primary" :disabled="saving || !f.employee_id || !f.amount" @click="save">
              {{ saving ? 'Saving…' : 'Add' }}</button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { X, Wallet } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { API, authHeader } from '@/utils/api'
import { monthLabel } from '@/composables/usePayroll'
import { ADJUSTMENT_KINDS, createAdjustment } from '@/composables/usePayrollExtra'
import { selectableEmployees } from '@/utils/hr/employable'

const props = defineProps({ open: Boolean, kind: { type: String, default: 'BONUS' } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const kindMeta = computed(() => ADJUSTMENT_KINDS[props.kind] || ADJUSTMENT_KINDS.BONUS)
const employees = ref([])
const saving = ref(false)
const now = new Date()
const blank = () => ({ employee_id: null, sub_type: kindMeta.value.subTypes[0], title: '', amount: null,
  period_month: now.getMonth() + 1, period_year: now.getFullYear(), from_date: '', to_date: '', reason: '',
  is_taxable: props.kind !== 'DEDUCTION', is_deduction: props.kind === 'DEDUCTION' })
const f = ref(blank())
const empName = (e) => e.user?.full_name || e.full_name || e.employee_id
// A one-off pay adjustment can still post for an employee serving notice (final
// dues), so keep ON_NOTICE — hide only the fully-separated, mirroring the
// backend guard_settleable() on the create endpoint.
const selectableEmps = computed(() => selectableEmployees(employees.value, 'not-separated'))
const hiddenEmpCount = computed(() => (employees.value?.length || 0) - selectableEmps.value.length)

watch(() => props.open, async (o) => {
  if (!o) return
  f.value = blank()
  if (!employees.value.length) {
    try { employees.value = (await axios.get(`${API}/hr/employees/`, { headers: authHeader(), params: { limit: 100 } })).data.items || [] } catch {}
  }
})

const save = async () => {
  saving.value = true
  try {
    await createAdjustment({
      employee_id: f.value.employee_id, adjustment_type: props.kind, sub_type: f.value.sub_type,
      title: f.value.title || `${f.value.sub_type} ${kindMeta.value.label}`, amount: f.value.amount,
      is_taxable: f.value.is_taxable, is_deduction: f.value.is_deduction,
      period_month: f.value.period_month, period_year: f.value.period_year,
      from_date: f.value.from_date || null, to_date: f.value.to_date || null, reason: f.value.reason || null,
    })
    toast.success(`${kindMeta.value.label} added`)
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { saving.value = false }
}
</script>

<style scoped>
/* Title keeps lowercase source text but reads as a sentence-case heading */
.paym-title { text-transform: capitalize; }
.paym-note { display: block; margin-top: 5px; font-size: 11px; opacity: 0.7; }
</style>
