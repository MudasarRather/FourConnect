<template>
  <OnbModal
    :open="open"
    :title="shift ? `Assign · ${shift.name}` : 'Assign shift'"
    :subtitle="shift ? `Roll ${shift.code} out to one or more employees over a date range` : ''"
    :icon="UsersRound"
    :width="720"
    @close="$emit('close')"
  >
    <div class="as-stack" v-if="shift">
      <div class="as-grid-2">
        <label class="as-field">
          <span>Effective from <em>*</em></span>
          <input v-model="form.effective_from" type="date" class="as-input" />
        </label>
        <label class="as-field">
          <span>Effective until <em>*</em></span>
          <input v-model="form.effective_until" type="date" class="as-input" />
        </label>
      </div>

      <div v-if="conflicts.length" class="as-conflict">
        <div class="as-conflict-head"><ShieldAlert :size="13" /> {{ conflicts.length }} conflict{{ conflicts.length === 1 ? '' : 's' }} block this assignment</div>
        <ul>
          <li v-for="c in conflicts" :key="c.assignment_id">
            <b>{{ c.employee_name }}</b> already on <span class="mono">{{ c.conflicting_shift_code }}</span>
            from <span class="mono">{{ c.conflicting_from }}</span><span v-if="c.conflicting_until"> → <span class="mono">{{ c.conflicting_until }}</span></span><span v-else> (open-ended)</span>.
          </li>
        </ul>
      </div>

      <div class="as-search">
        <Search :size="14" />
        <input v-model="search" placeholder="Search by name, code or department…" @input="onSearch" />
        <span v-if="form.employee_ids.length" class="as-count">{{ form.employee_ids.length }} selected</span>
      </div>

      <div class="as-emps" v-if="filtered.length">
        <button v-for="e in filtered" :key="e.id" type="button" class="as-emp"
          :class="{ on: form.employee_ids.includes(e.id), assigned: assignedIds.has(e.id) }"
          @click="toggle(e.id)">
          <span class="ae-av">{{ initials(e.full_name) }}</span>
          <span class="ae-meta"><b>{{ e.full_name }}</b><small>{{ e.employee_code }} · {{ e.department_name || '—' }}</small></span>
          <Check v-if="form.employee_ids.includes(e.id)" :size="14" class="ae-ck" />
          <span v-else-if="assignedIds.has(e.id)" class="ae-tag">on shift</span>
        </button>
      </div>
      <div v-else class="as-empty"><Loader2 v-if="loadingEmps" :size="14" class="spin" /> {{ loadingEmps ? 'Loading employees…' : 'No employees match this filter.' }}</div>

      <div v-if="current.length" class="as-current">
        <div class="as-current-head"><UsersRound :size="12" /> Currently on this shift ({{ current.length }})</div>
        <div class="as-current-list">
          <span v-for="a in current" :key="a.id" class="as-chip">
            {{ a.employee_name || 'Employee' }}
            <button @click="remove(a)" :disabled="removingId === a.id" title="Remove"><X :size="12" /></button>
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="as-foot-note">{{ form.employee_ids.length }} selected</span>
      <button class="as-ghost" @click="$emit('close')">Close</button>
      <button class="as-primary" :disabled="!form.employee_ids.length || assigning" @click="submit">
        <CheckCircle2 v-if="!assigning" :size="14" /><Loader2 v-else :size="14" class="spin" />
        {{ assigning ? 'Assigning…' : 'Assign shift' }}
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { UsersRound, Search, Check, X, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import {
  fetchEmployeesLite, fetchShiftAssignments, assignShiftBulk, unassignShift,
  todayIso, isoOffsetDays,
} from '@/composables/useShifts'

const props = defineProps({
  open: { type: Boolean, default: false },
  shift: { type: Object, default: null },
})
const emit = defineEmits(['close', 'assigned'])
const toast = useToast()

const employees = ref([])
const current = ref([])
const search = ref('')
const loadingEmps = ref(false)
const assigning = ref(false)
const removingId = ref(null)
const conflicts = ref([])

const form = reactive({ employee_ids: [], effective_from: todayIso(), effective_until: isoOffsetDays(30) })

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = !q ? employees.value : employees.value.filter(e =>
    (e.full_name || '').toLowerCase().includes(q) ||
    (e.employee_code || '').toLowerCase().includes(q) ||
    (e.department_name || '').toLowerCase().includes(q))
  return list.slice(0, 100)
})
const assignedIds = computed(() => new Set(current.value.map(a => a.employee_id)))

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

watch(() => props.open, async (o) => {
  if (!o || !props.shift) return
  form.employee_ids = []
  form.effective_from = todayIso()
  form.effective_until = isoOffsetDays(30)
  search.value = ''
  conflicts.value = []
  await Promise.all([loadEmps(), loadCurrent()])
})

const loadEmps = async (q = '') => {
  loadingEmps.value = true
  try { employees.value = await fetchEmployeesLite(q) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load employees') }
  finally { loadingEmps.value = false }
}
let timer = null
const onSearch = () => { clearTimeout(timer); timer = setTimeout(() => loadEmps(search.value.trim()), 280) }

const loadCurrent = async () => {
  try {
    const data = await fetchShiftAssignments({ shift_id: props.shift.id, active_on: todayIso() })
    current.value = Array.isArray(data) ? data : (data?.items || [])
  } catch { current.value = [] }
}

const toggle = (id) => {
  if (assignedIds.value.has(id) && !form.employee_ids.includes(id)) {
    toast.warning('Already on this shift — remove the row first to re-date.')
    return
  }
  const i = form.employee_ids.indexOf(id)
  if (i >= 0) form.employee_ids.splice(i, 1); else form.employee_ids.push(id)
}

const remove = async (a) => {
  if (removingId.value) return
  removingId.value = a.id
  try {
    await unassignShift(a.id)
    toast.success(`${a.employee_name || 'Employee'} removed`)
    current.value = current.value.filter(x => x.id !== a.id)
    emit('assigned')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not remove') }
  finally { removingId.value = null }
}

const submit = async () => {
  if (!form.employee_ids.length) return
  if (!form.effective_from || !form.effective_until) { toast.warning('Both dates are required'); return }
  assigning.value = true
  conflicts.value = []
  try {
    const res = await assignShiftBulk(props.shift.id, {
      employee_ids: form.employee_ids, effective_from: form.effective_from,
      effective_until: form.effective_until, is_default: false,
    })
    const a = res?.assigned || 0, ext = res?.extended || 0
    toast.success(`${a} assigned${ext ? `, ${ext} extended` : ''}`)
    form.employee_ids = []
    await loadCurrent()
    emit('assigned')
  } catch (e) {
    const d = e?.response?.data?.detail
    if (e?.response?.status === 409 && d?.conflicts) {
      conflicts.value = d.conflicts
      toast.error(d.message || 'Assignment conflicts')
    } else {
      toast.error((typeof d === 'string' && d) || 'Could not assign')
    }
  } finally { assigning.value = false }
}
</script>

<style scoped>
.as-stack { display: flex; flex-direction: column; gap: 14px; }
.as-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.as-field { display: flex; flex-direction: column; gap: 5px; }
.as-field > span { font-size: 11px; color: var(--shift-text-muted); }
.as-field em { color: var(--shift-amber); font-style: normal; }
.as-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.as-input:focus { outline: none; border-color: var(--shift-amber); }
.as-conflict { border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); border-radius: 12px; padding: 10px 12px; }
.as-conflict-head { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--shift-alert); margin-bottom: 6px; }
.as-conflict ul { margin: 0; padding-left: 16px; }
.as-conflict li { font-size: 12px; color: var(--shift-text-2); line-height: 1.6; }
.mono { font-family: var(--shift-mono); color: var(--shift-text); }
.as-search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); }
.as-search input { flex: 1; background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 13px; }
.as-count { font-size: 11px; font-family: var(--shift-mono); color: var(--shift-amber); white-space: nowrap; }
.as-emps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 260px; overflow-y: auto; padding-right: 4px; }
.as-emp { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 11px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.18s; }
.as-emp:hover { border-color: var(--shift-border); }
.as-emp.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.as-emp.assigned:not(.on) { opacity: 0.6; }
.ae-av { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 11px; font-weight: 700;
  background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.ae-meta { display: flex; flex-direction: column; min-width: 0; }
.ae-meta b { font-size: 12.5px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ae-meta small { font-size: 10.5px; color: var(--shift-text-muted); }
.ae-ck { margin-left: auto; color: var(--shift-amber); }
.ae-tag { margin-left: auto; font-size: 9px; font-family: var(--shift-mono); text-transform: uppercase; color: var(--shift-text-dim); }
.as-empty { padding: 24px; text-align: center; color: var(--shift-text-dim); font-size: 12.5px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.as-current { border-top: 1px dashed var(--shift-border-soft); padding-top: 12px; }
.as-current-head { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--shift-text-muted); margin-bottom: 8px; }
.as-current-list { display: flex; flex-wrap: wrap; gap: 7px; }
.as-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 10px; border-radius: 999px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); font-size: 11.5px; color: var(--shift-text-2); }
.as-chip button { width: 18px; height: 18px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center;
  background: var(--shift-alert-soft); color: var(--shift-alert); }
.as-foot-note { flex: 1; font-size: 11px; color: var(--shift-text-dim); }
.as-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.as-primary { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700;
  background: var(--shift-grad-cta); color: #1f1408; display: inline-flex; align-items: center; gap: 7px; }
.as-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }
@media (max-width: 600px) { .as-emps { grid-template-columns: 1fr; } .as-grid-2 { grid-template-columns: 1fr; } }
</style>
