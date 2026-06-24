<template>
  <div class="tf">
    <TransferRelayConsole :counts="counts" :active-status="statusFilter" :active-type="typeFilter" :types="consoleTypes"
      @pick-status="onStatus" @pick-type="onType" @reset="clearFilters" @new="openCreate" />

    <!-- loading -->
    <div v-if="loading" class="tf-list">
      <div v-for="n in 4" :key="n" class="tf-skel" :style="{ '--i': n }"><span class="tf-skel-beam" /></div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!filteredRows.length" :icon="ArrowLeftRight"
      :title="hasFilter ? 'No transfers match' : 'No transfers yet'"
      :sub="hasFilter ? 'Try a different lane or clear the filters.' : 'Relay an asset between employees, the store, locations or departments.'">
      <button v-if="hasFilter" class="as-btn as-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear filters</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> New transfer</button>
    </AssetEmptyState>

    <!-- route cards -->
    <div v-else class="tf-list" :key="gridNonce">
      <TransferRouteCard v-for="(t, i) in filteredRows" :key="t.id" :transfer="t" :index="i"
        :from-node="nodeFor(t, 'from')" :to-node="nodeFor(t, 'to')"
        @action="(a) => onAction(t, a)" @detail="$emit('detail', t.asset_id)" />
    </div>

    <!-- ════ New transfer modal ════ -->
    <AssetModal :open="formOpen" title="New transfer" subtitle="Relay an asset to a new custodian"
      :icon="ArrowLeftRight" :width="600" @close="formOpen = false">
      <div class="nt">
        <!-- live route preview -->
        <Motion as="div" class="nt-preview" :data-ready="canSubmit"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
          <span class="nt-pv-grid" aria-hidden="true" />
          <div class="nt-pv-node">
            <span class="nt-pv-ic" :data-kind="previewFrom.kind">
              <span v-if="previewFrom.kind === 'employee'" class="nt-pv-av">{{ initials(previewFrom.label) }}</span>
              <component v-else :is="nodeIcon(previewFrom.kind)" :size="16" />
            </span>
            <span class="nt-pv-lab">{{ previewFrom.label }}</span>
            <span class="nt-pv-tag">from</span>
          </div>
          <div class="nt-pv-beam">
            <span class="nt-pv-line" aria-hidden="true" />
            <span class="nt-pv-cargo" :class="{ filled: pickedAsset }">
              <Package :size="11" /><span class="as-mono">{{ pickedAsset ? pickedAsset.asset_code : 'select asset' }}</span>
            </span>
            <span v-if="canSubmit" class="nt-pv-packet" aria-hidden="true" />
          </div>
          <div class="nt-pv-node to">
            <span class="nt-pv-ic" :data-kind="previewTo.kind">
              <span v-if="previewTo.kind === 'employee'" class="nt-pv-av">{{ initials(previewTo.label) }}</span>
              <component v-else :is="nodeIcon(previewTo.kind)" :size="16" />
            </span>
            <span class="nt-pv-lab">{{ previewTo.label }}</span>
            <span class="nt-pv-tag">to</span>
          </div>
        </Motion>

        <!-- transfer type -->
        <Motion as="div" class="nt-field" :initial="fIn" :animate="fOn" :transition="fT(0)">
          <span class="nt-lab">Transfer type</span>
          <AsSelect v-model="form.transfer_type" :options="typeSelOptions" @update:modelValue="onTypeChange" />
        </Motion>

        <!-- asset -->
        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(1)">
          <AssetPicker v-model="pickedAsset" label="Asset" :status-filter="assetStatusFilter" required />
        </Motion>

        <!-- destination (conditional) -->
        <Motion as="div" class="nt-field" :initial="fIn" :animate="fOn" :transition="fT(2)">
          <template v-if="needsEmployee">
            <EmployeePicker :model-value="form.to_employee_id" label="To employee" required employable-only
              @update:modelValue="form.to_employee_id = $event" @change="toEmpName = $event.full_name" />
          </template>
          <template v-else-if="form.transfer_type === 'LOCATION'">
            <span class="nt-lab">To location <i>*</i></span>
            <AsSelect v-model="form.to_location_id" :options="locationOptions" placeholder="Select destination location…" />
          </template>
          <template v-else-if="form.transfer_type === 'DEPARTMENT'">
            <span class="nt-lab">To department <i>*</i></span>
            <AsSelect v-model="form.to_department_id" :options="departmentOptions" placeholder="Select destination department…" />
          </template>
          <div v-else class="nt-store">
            <span class="nt-store-ic"><Warehouse :size="16" /></span>
            <div><b>Returns to store</b><span>Asset is released back into available inventory.</span></div>
          </div>
        </Motion>

        <!-- effective date + reason -->
        <Motion as="div" class="nt-grid2" :initial="fIn" :animate="fOn" :transition="fT(3)">
          <div class="nt-field">
            <span class="nt-lab">Effective date</span>
            <HrDatePicker v-model="form.effective_date" placeholder="dd / mm / yyyy" />
          </div>
          <AssetField v-model="form.reason" type="textarea" label="Reason" placeholder="Why is this moving?" :rows="2" />
        </Motion>
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="formOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !canSubmit || saving }"
          :whileHover="(!canSubmit || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="!canSubmit || saving" @click="submit">
          <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> Request transfer
        </Motion>
      </template>
    </AssetModal>

    <!-- ════ Reject / Cancel decision modal ════ -->
    <TransferDecisionModal :open="decisionOpen" :mode="decisionMode" :transfer="decisionTarget || {}"
      :from-node="decisionFrom" :to-node="decisionTo" :loading="decisionLoading"
      @close="decisionOpen = false" @confirm="onDecisionConfirm" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ArrowLeftRight, Plus, Check, Loader, FilterX, Package,
  Warehouse, MapPin, Building2, UserRound,
} from 'lucide-vue-next'
import TransferRelayConsole from '../components/TransferRelayConsole.vue'
import TransferRouteCard from '../components/TransferRouteCard.vue'
import AssetModal from '../components/AssetModal.vue'
import TransferDecisionModal from '../modals/TransferDecisionModal.vue'
import AssetField from '../components/AssetField.vue'
import AssetPicker from '../components/AssetPicker.vue'
import EmployeePicker from '../components/EmployeePicker.vue'
import AsSelect from '../components/AsSelect.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  fetchTransfers, createTransfer, transferAction, fetchLocations, fetchDepartments,
  TRANSFER_TYPES, titleCase, errText,
} from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

// ── data ──
const all = ref([])
const loading = ref(true)
const gridNonce = ref(0)
const statusFilter = ref('')
const typeFilter = ref('')

const locations = ref([])
const departments = ref([])
const locMap = computed(() => Object.fromEntries(locations.value.map(l => [l.id, l.name])))
const deptMap = computed(() => Object.fromEntries(departments.value.map(d => [d.id, d.name])))
const locName = (id) => (id && locMap.value[id]) || ''
const deptName = (id) => (id && deptMap.value[id]) || ''
const locationOptions = computed(() => locations.value.map(l => ({ value: l.id, label: l.name, icon: MapPin })))
const departmentOptions = computed(() => departments.value.map(d => ({ value: d.id, label: d.name, icon: Building2 })))

async function reload() {
  loading.value = true
  try {
    const res = await fetchTransfers({ limit: 200 })
    all.value = res.items || []
    gridNonce.value++
  } catch (e) {
    toast.error(errText(e, 'Failed to load transfers'))
  } finally {
    loading.value = false
  }
}
async function loadMasters() {
  try {
    const [locs, depts] = await Promise.all([fetchLocations(), fetchDepartments()])
    locations.value = Array.isArray(locs) ? locs : []
    departments.value = Array.isArray(depts) ? depts : []
  } catch { /* dropdowns just stay empty */ }
}
onMounted(() => { reload(); loadMasters() })

// ── telemetry ──
const counts = computed(() => {
  const c = { requested: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0, total: all.value.length }
  const map = { REQUESTED: 'requested', APPROVED: 'approved', COMPLETED: 'completed', REJECTED: 'rejected', CANCELLED: 'cancelled' }
  for (const t of all.value) { const k = map[t.status]; if (k) c[k]++ }
  return c
})
const typeCount = computed(() => {
  const m = {}
  for (const t of all.value) m[t.transfer_type] = (m[t.transfer_type] || 0) + 1
  return m
})
const TYPE_SHORT = { EMPLOYEE_TO_EMPLOYEE: 'Emp → Emp', EMPLOYEE_TO_STORE: 'Emp → Store', STORE_TO_EMPLOYEE: 'Store → Emp', LOCATION: 'Location', DEPARTMENT: 'Department' }
const TYPE_ICON = { EMPLOYEE_TO_EMPLOYEE: ArrowLeftRight, EMPLOYEE_TO_STORE: Warehouse, STORE_TO_EMPLOYEE: UserRound, LOCATION: MapPin, DEPARTMENT: Building2 }
const consoleTypes = computed(() => TRANSFER_TYPES.map(t => ({ value: t, label: TYPE_SHORT[t] || titleCase(t), icon: TYPE_ICON[t] || ArrowLeftRight, count: typeCount.value[t] || 0 })))

const hasFilter = computed(() => !!(statusFilter.value || typeFilter.value))
const filteredRows = computed(() => all.value.filter(t =>
  (!statusFilter.value || t.status === statusFilter.value) &&
  (!typeFilter.value || t.transfer_type === typeFilter.value)))

const onStatus = (s) => { statusFilter.value = statusFilter.value === s ? '' : s }
const onType = (t) => { typeFilter.value = typeFilter.value === t ? '' : t }
const clearFilters = () => { statusFilter.value = ''; typeFilter.value = '' }

// ── from/to node resolution for route cards ──
const NODE_ICONS = { store: Warehouse, location: MapPin, department: Building2, employee: UserRound }
const nodeIcon = (k) => NODE_ICONS[k] || Warehouse
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
function nodeFor(t, side) {
  const ty = t.transfer_type
  if (side === 'from') {
    if (ty === 'STORE_TO_EMPLOYEE') return { kind: 'store', label: 'Store' }
    if (ty === 'LOCATION') return { kind: 'location', label: locName(t.from_location_id) || '—' }
    if (ty === 'DEPARTMENT') return { kind: 'department', label: deptName(t.from_department_id) || '—' }
    return { kind: 'employee', label: t.from_employee_name || '—' }
  }
  if (ty === 'EMPLOYEE_TO_STORE') return { kind: 'store', label: 'Store' }
  if (ty === 'LOCATION') return { kind: 'location', label: locName(t.to_location_id) || '—' }
  if (ty === 'DEPARTMENT') return { kind: 'department', label: deptName(t.to_department_id) || '—' }
  return { kind: 'employee', label: t.to_employee_name || '—' }
}

// ── actions ──
// Positive transitions (approve/complete) are one-click; reject/cancel require a
// reason via the decision modal (corporate audit trail).
function onAction(t, action) {
  if (action === 'reject' || action === 'cancel') openDecision(t, action)
  else act(t, action)
}
async function act(t, action, body = {}) {
  try {
    await transferAction(t.id, action, body)
    const past = { approve: 'approved', complete: 'completed', reject: 'rejected', cancel: 'cancelled' }
    toast.success(`Transfer ${past[action] || action}`)
    reload(); emit('refresh-stats')
    return true
  } catch (e) {
    toast.error(errText(e, `Failed to ${action} transfer`))
    return false
  }
}

// ── reject / cancel decision modal ──
const decisionOpen = ref(false)
const decisionMode = ref('reject')
const decisionTarget = ref(null)
const decisionLoading = ref(false)
const decisionFrom = computed(() => decisionTarget.value ? nodeFor(decisionTarget.value, 'from') : { label: '—', kind: 'store' })
const decisionTo = computed(() => decisionTarget.value ? nodeFor(decisionTarget.value, 'to') : { label: '—', kind: 'store' })
function openDecision(t, mode) { decisionTarget.value = t; decisionMode.value = mode; decisionOpen.value = true }
async function onDecisionConfirm({ notes }) {
  if (!decisionTarget.value) return
  decisionLoading.value = true
  try {
    const ok = await act(decisionTarget.value, decisionMode.value, { notes: notes || null })
    if (ok) decisionOpen.value = false
  } finally {
    decisionLoading.value = false
  }
}

// ── New transfer modal ──
const formOpen = ref(false)
const saving = ref(false)
const pickedAsset = ref(null)
const toEmpName = ref('')
const blank = () => ({ transfer_type: 'EMPLOYEE_TO_EMPLOYEE', to_employee_id: '', to_location_id: '', to_department_id: '', effective_date: '', reason: '' })
const form = ref(blank())

const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.06 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

const typeSelOptions = TRANSFER_TYPES.map(t => ({ value: t, label: TYPE_SHORT[t] || titleCase(t), icon: TYPE_ICON[t] || ArrowLeftRight }))
const needsEmployee = computed(() => ['EMPLOYEE_TO_EMPLOYEE', 'STORE_TO_EMPLOYEE'].includes(form.value.transfer_type))
const assetStatusFilter = computed(() => {
  const ty = form.value.transfer_type
  if (ty === 'STORE_TO_EMPLOYEE') return 'AVAILABLE'
  if (['EMPLOYEE_TO_EMPLOYEE', 'EMPLOYEE_TO_STORE'].includes(ty)) return 'ALLOCATED'
  return ''
})
const canSubmit = computed(() => {
  if (!pickedAsset.value) return false
  const ty = form.value.transfer_type
  if (needsEmployee.value) return !!form.value.to_employee_id
  if (ty === 'LOCATION') return !!form.value.to_location_id
  if (ty === 'DEPARTMENT') return !!form.value.to_department_id
  return true // EMPLOYEE_TO_STORE
})

function onTypeChange() {
  // changing type invalidates incompatible selections
  form.value.to_employee_id = ''; form.value.to_location_id = ''; form.value.to_department_id = ''
  toEmpName.value = ''
  pickedAsset.value = null
}
const openCreate = () => { form.value = blank(); pickedAsset.value = null; toEmpName.value = ''; formOpen.value = true }

const previewFrom = computed(() => {
  const ty = form.value.transfer_type
  if (ty === 'STORE_TO_EMPLOYEE') return { kind: 'store', label: 'Store' }
  if (ty === 'LOCATION') return { kind: 'location', label: (pickedAsset.value && locName(pickedAsset.value.location_id)) || 'Current location' }
  if (ty === 'DEPARTMENT') return { kind: 'department', label: (pickedAsset.value && deptName(pickedAsset.value.department_id)) || 'Current dept' }
  return { kind: 'employee', label: (pickedAsset.value && pickedAsset.value.assigned_employee_name) || 'Current holder' }
})
const previewTo = computed(() => {
  const ty = form.value.transfer_type
  if (ty === 'EMPLOYEE_TO_STORE') return { kind: 'store', label: 'Store' }
  if (ty === 'LOCATION') return { kind: 'location', label: locName(form.value.to_location_id) || 'Destination' }
  if (ty === 'DEPARTMENT') return { kind: 'department', label: deptName(form.value.to_department_id) || 'Destination' }
  return { kind: 'employee', label: toEmpName.value || 'Recipient' }
})

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await createTransfer({
      asset_id: pickedAsset.value.id,
      transfer_type: form.value.transfer_type,
      to_employee_id: needsEmployee.value ? form.value.to_employee_id : null,
      to_location_id: form.value.transfer_type === 'LOCATION' ? form.value.to_location_id : null,
      to_department_id: form.value.transfer_type === 'DEPARTMENT' ? form.value.to_department_id : null,
      effective_date: form.value.effective_date || null,
      reason: form.value.reason || null,
    })
    toast.success('Transfer requested')
    formOpen.value = false
    reload(); emit('refresh-stats')
  } catch (e) {
    toast.error(errText(e, 'Failed to request transfer'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.tf { display: flex; flex-direction: column; gap: 16px; }
.tf-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .tf-list { grid-template-columns: 1fr; } }

/* skeleton */
.tf-skel { position: relative; overflow: hidden; height: 168px; border-radius: 17px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.tf-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

/* ════ modal ════ */
.nt { display: flex; flex-direction: column; gap: 16px; }
.nt-field { display: flex; flex-direction: column; gap: 6px; }
.nt-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.nt-lab i { color: var(--as-amber); font-style: normal; }
.nt-grid2 { display: grid; grid-template-columns: 1fr 1.2fr; gap: 13px; }
@media (max-width: 520px) { .nt-grid2 { grid-template-columns: 1fr; } }

/* live route preview */
.nt-preview { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr 1.6fr 1fr; align-items: center; gap: 8px; padding: 16px 14px;
  border-radius: 15px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.nt-pv-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.45;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 75%); -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000, transparent 75%); }
.nt-pv-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; min-width: 0; }
.nt-pv-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.nt-pv-ic[data-kind="store"] { color: var(--as-steel); }
.nt-pv-ic[data-kind="location"] { color: var(--as-ember); }
.nt-pv-ic[data-kind="department"] { color: var(--as-amber); }
.nt-pv-node.to .nt-pv-ic { color: var(--as-st-available); border-color: color-mix(in srgb, var(--as-st-available) 32%, transparent); background: var(--as-st-available-soft); }
.nt-pv-av { font-size: 12px; font-weight: 800; }
.nt-pv-lab { font-size: 11.5px; font-weight: 600; color: var(--as-text); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nt-pv-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--as-text-dim); }
.nt-pv-beam { position: relative; height: 40px; display: flex; align-items: center; }
.nt-pv-line { position: absolute; left: 0; right: 0; top: 50%; height: 2.5px; transform: translateY(-50%); border-radius: 3px;
  background: repeating-linear-gradient(90deg, var(--as-amber) 0 7px, transparent 7px 14px); background-size: 200% 100%; opacity: 0.6; animation: as-beam-flow 0.9s linear infinite; }
.nt-pv-cargo { position: absolute; left: 50%; top: -2px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 8px;
  font-size: 10.5px; font-weight: 700; color: var(--as-text-muted); background: var(--as-surface-elevated); border: 1px dashed var(--as-border-strong); white-space: nowrap; }
.nt-pv-cargo.filled { color: var(--as-text); border-style: solid; }
.nt-pv-cargo :deep(svg) { color: var(--as-amber); }
.nt-pv-packet { position: absolute; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: var(--as-amber); box-shadow: 0 0 9px 2px var(--as-amber); animation: as-packet 1.6s ease-in-out infinite; }

.nt-store { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 12px; background: var(--as-surface); border: 1px dashed var(--as-border-strong); }
.nt-store-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; color: var(--as-steel); background: var(--as-surface-elevated); }
.nt-store b { display: block; font-size: 13px; color: var(--as-text); }
.nt-store span { font-size: 11.5px; color: var(--as-text-muted); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .tf-skel, .tf-skel-beam, .nt-pv-line, .nt-pv-packet { animation: none; }
  .nt-pv-packet { display: none; }
}
</style>
