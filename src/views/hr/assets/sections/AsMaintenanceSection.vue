<template>
  <div class="ms">
    <MaintConsole :counts="counts" :spend="spend" :throughput="throughput" :active-status="statusFilter"
      @pick="onPick" @new="openCreate" @go="(t) => $emit('go', t)" />

    <!-- filter status strip (mirrors console; visible affordance to clear) -->
    <div class="ms-bar">
      <div class="ms-chips">
        <button v-for="f in FILTERS" :key="f.v" class="ms-chip" :class="{ on: statusFilter === f.v }" :data-tone="f.tone" @click="statusFilter = f.v">
          {{ f.l }}<span v-if="countFor(f.v)" class="ms-chip-n">{{ countFor(f.v) }}</span>
        </button>
      </div>
      <button v-if="statusFilter" class="as-btn as-btn-ghost mini" @click="statusFilter = ''"><FilterX :size="13" /> Clear</button>
    </div>

    <!-- loading -->
    <div v-if="loading" class="ms-grid">
      <div v-for="n in 4" :key="n" class="ms-skel" :style="{ '--i': n }"><span class="ms-skel-beam" /></div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!filtered.length" :icon="Wrench"
      :title="statusFilter ? 'No jobs in this lane' : 'The bay is clear'"
      :sub="statusFilter ? 'Nothing matches this filter yet.' : 'Schedule a repair, inspection, calibration or preventive job to bring it through the bay.'">
      <button v-if="statusFilter" class="as-btn as-btn-ghost" @click="statusFilter = ''"><FilterX :size="14" /> Clear filter</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> Schedule job</button>
    </AssetEmptyState>

    <!-- work-order grid -->
    <div v-else class="ms-grid" :key="gridNonce">
      <MaintWorkOrderCard v-for="(m, i) in filtered" :key="m.id" :job="m" :index="i"
        @action="(a) => onAction(m, a)" @detail="$emit('detail', m.asset_id)" />
    </div>

    <!-- ════════ Schedule maintenance modal ════════ -->
    <AssetModal :open="formOpen" title="Schedule maintenance" subtitle="Route an asset into the service bay"
      :icon="Wrench" :width="600" @close="formOpen = false">
      <div class="sf">
        <!-- live work-order ticket preview -->
        <Motion as="div" class="sf-ticket" :data-ready="!!pickedAsset"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
          <span class="sf-tk-grid" aria-hidden="true" />
          <span class="sf-tk-gear" aria-hidden="true"><MaintGear :size="78" :teeth="13" color="var(--as-steel-dark)" :duration="16" /></span>
          <span class="sf-tk-stamp" :data-ready="!!pickedAsset">{{ pickedAsset ? 'READY' : 'DRAFT' }}</span>
          <div class="sf-tk-head">
            <span class="sf-tk-ic" :style="{ color: activeType.color }"><component :is="activeType.icon" :size="18" /></span>
            <div class="sf-tk-id">
              <b class="as-mono">{{ pickedAsset ? pickedAsset.asset_code : '— select asset —' }}</b>
              <span>{{ activeType.label }} · {{ vendorLabel }}</span>
            </div>
          </div>
          <div class="sf-tk-rows">
            <span class="sf-tk-row"><CalendarClock :size="12" /> {{ form.scheduled_date ? fmtLong(form.scheduled_date) : 'Unscheduled' }}</span>
            <span class="sf-tk-row"><IndianRupee :size="12" /> {{ form.cost != null && form.cost !== '' ? Number(form.cost).toLocaleString() : 'No estimate' }}</span>
          </div>
        </Motion>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(0)">
          <AssetPicker v-model="pickedAsset" label="Asset" required />
        </Motion>

        <!-- maintenance type — segmented icon selector -->
        <Motion as="div" class="sf-field" :initial="fIn" :animate="fOn" :transition="fT(1)">
          <span class="sf-lab">Job type</span>
          <div class="sf-seg">
            <Motion v-for="t in typeOptions" :key="t.value" as="button" type="button" class="sf-seg-btn"
              :class="{ on: form.maintenance_type === t.value }" :style="{ '--tc': t.color }"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="form.maintenance_type = t.value">
              <component :is="t.icon" :size="15" />
              <span>{{ t.label }}</span>
            </Motion>
          </div>
        </Motion>

        <div class="sf-grid2">
          <Motion as="div" class="sf-field" :initial="fIn" :animate="fOn" :transition="fT(2)">
            <span class="sf-lab">Vendor</span>
            <AsSelect v-model="form.vendor_id" :options="vendorSelOptions" placeholder="Internal (no vendor)" />
          </Motion>
          <Motion as="div" class="sf-field" :initial="fIn" :animate="fOn" :transition="fT(3)">
            <span class="sf-lab">Scheduled date</span>
            <HrDatePicker v-model="form.scheduled_date" placeholder="dd / mm / yyyy" />
          </Motion>
        </div>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(4)">
          <AssetField v-model="form.cost" type="number" label="Est. cost (₹)" step="0.01" min="0" placeholder="0.00" full />
        </Motion>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(5)">
          <AssetField v-model="form.description" type="textarea" label="Description" placeholder="What needs doing?" :rows="2" full />
        </Motion>
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="formOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !pickedAsset || saving }"
          :whileHover="(!pickedAsset || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="!pickedAsset || saving" @click="submit">
          <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> Schedule
        </Motion>
      </template>
    </AssetModal>

    <!-- ════════ Complete maintenance modal ════════ -->
    <AssetModal :open="completeOpen" :title="`Complete · ${completeTarget?.asset_code || ''}`"
      subtitle="Release the asset back to spec" :icon="CheckCheck" :width="520" @close="completeOpen = false">
      <div class="sf">
        <!-- condition delta preview -->
        <Motion as="div" class="cf-delta" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
          <div class="cf-delta-node">
            <span class="cf-delta-tag">before</span>
            <AsStamp :value="completeTarget?.condition_before || 'GOOD'" />
          </div>
          <span class="cf-delta-beam" :data-changed="!!completeForm.condition_after">
            <ArrowRight :size="15" />
          </span>
          <div class="cf-delta-node">
            <span class="cf-delta-tag">after</span>
            <AsStamp v-if="completeForm.condition_after" :value="completeForm.condition_after" />
            <span v-else class="cf-delta-same">unchanged</span>
          </div>
        </Motion>

        <div v-if="completeForm.condition_after === 'RETIRED'" class="cf-warn">
          <TriangleAlert :size="15" /> Completing with <b>Retired</b> will retire this asset and release its holder.
        </div>

        <!-- condition ladder -->
        <div class="sf-field">
          <span class="sf-lab">Condition after</span>
          <div class="cf-ladder">
            <Motion as="button" type="button" class="cf-rung" :class="{ on: completeForm.condition_after === '' }"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="completeForm.condition_after = ''">Unchanged</Motion>
            <Motion v-for="cnd in CONDITIONS" :key="cnd" as="button" type="button" class="cf-rung" :data-cond="cnd"
              :class="{ on: completeForm.condition_after === cnd }" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
              @click="completeForm.condition_after = cnd">{{ titleCase(cnd) }}</Motion>
          </div>
        </div>

        <div class="sf-grid2">
          <AssetField v-model="completeForm.cost" type="number" label="Final cost (₹)" step="0.01" min="0" placeholder="0.00" />
          <div class="sf-field cf-est">
            <span class="sf-lab">Estimated</span>
            <span class="cf-est-val as-mono">{{ completeTarget?.cost != null ? '₹' + Number(completeTarget.cost).toLocaleString() : '—' }}</span>
          </div>
        </div>

        <AssetField v-model="completeForm.resolution_notes" type="textarea" label="Resolution notes" placeholder="What was done?" :rows="2" full />
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="completeOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: completing }"
          :whileHover="completing ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="completing" @click="doComplete">
          <Loader v-if="completing" :size="14" class="spin" /><Check v-else :size="14" /> Complete
        </Motion>
      </template>
    </AssetModal>

    <!-- ════════ Cancel confirm modal ════════ -->
    <AssetModal :open="cancelOpen" :title="`Cancel job · ${cancelTarget?.asset_code || ''}`" :icon="Ban" :width="420" @close="cancelOpen = false">
      <p class="cancel-copy">
        This will stand down the maintenance job<span v-if="cancelTarget?.status === 'IN_PROGRESS'"> and return the asset to its prior status</span>.
        This can't be undone.
      </p>
      <template #footer>
        <button class="as-btn as-btn-ghost" @click="cancelOpen = false">Keep job</button>
        <Motion as="button" type="button" class="as-btn as-btn-danger" :class="{ disabled: cancelling }"
          :whileHover="cancelling ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="cancelling" @click="doCancel">
          <Loader v-if="cancelling" :size="14" class="spin" /><Ban v-else :size="14" /> Stand down
        </Motion>
      </template>
    </AssetModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Wrench, Plus, Check, CheckCheck, Loader, FilterX, Ban, ArrowRight,
  CalendarClock, IndianRupee, TriangleAlert,
  Hammer, ShieldCheck, ScanSearch, ChevronsUp, Gauge,
} from 'lucide-vue-next'
import MaintConsole from '../components/MaintConsole.vue'
import MaintWorkOrderCard from '../components/MaintWorkOrderCard.vue'
import MaintGear from '../components/MaintGear.vue'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import AssetPicker from '../components/AssetPicker.vue'
import AsSelect from '../components/AsSelect.vue'
import AsStamp from '../components/AsStamp.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  fetchMaintenance, createMaintenance, maintenanceAction, fetchVendors,
  ASSET_CONDITIONS, titleCase, errText,
} from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

const CONDITIONS = ASSET_CONDITIONS // NEW GOOD FAIR POOR RETIRED
const typeOptions = [
  { value: 'REPAIR', label: 'Repair', icon: Hammer, color: 'var(--as-ember)' },
  { value: 'PREVENTIVE', label: 'Preventive', icon: ShieldCheck, color: 'var(--as-st-available)' },
  { value: 'INSPECTION', label: 'Inspection', icon: ScanSearch, color: 'var(--as-amber)' },
  { value: 'UPGRADE', label: 'Upgrade', icon: ChevronsUp, color: 'var(--as-st-reserved)' },
  { value: 'CALIBRATION', label: 'Calibration', icon: Gauge, color: 'var(--as-steel)' },
]
const FILTERS = [
  { v: '', l: 'All', tone: '' },
  { v: 'SCHEDULED', l: 'Scheduled', tone: 'sched' },
  { v: 'IN_PROGRESS', l: 'On the lift', tone: 'prog' },
  { v: 'COMPLETED', l: 'Released', tone: 'done' },
  { v: 'CANCELLED', l: 'Stood down', tone: 'canc' },
]

// ── data ──
const all = ref([])
const loading = ref(true)
const gridNonce = ref(0)
const statusFilter = ref('')
const vendorOptions = ref([])

async function reload() {
  loading.value = true
  try {
    const res = await fetchMaintenance({ limit: 200 })
    all.value = res.items || []
    gridNonce.value++
  } catch (e) { toast.error(errText(e, 'Failed to load maintenance')) }
  finally { loading.value = false }
}
onMounted(async () => {
  reload()
  try { vendorOptions.value = ((await fetchVendors({ limit: 200, is_active: true })).items || []) }
  catch { /* dropdown just stays internal-only */ }
})

// ── telemetry ──
const counts = computed(() => {
  const c = { scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, total: all.value.length }
  const map = { SCHEDULED: 'scheduled', IN_PROGRESS: 'inProgress', COMPLETED: 'completed', CANCELLED: 'cancelled' }
  for (const m of all.value) { const k = map[m.status]; if (k) c[k]++ }
  return c
})
const spend = computed(() => all.value.reduce((s, m) => s + Number(m.cost || 0), 0))
const throughput = computed(() => {
  const resolved = counts.value.completed + counts.value.cancelled
  return resolved ? Math.round((counts.value.completed / resolved) * 100) : 0
})
const countFor = (v) => {
  if (!v) return all.value.length
  return all.value.filter(m => m.status === v).length
}

const filtered = computed(() => statusFilter.value ? all.value.filter(m => m.status === statusFilter.value) : all.value)
const onPick = (s) => { statusFilter.value = statusFilter.value === s ? '' : s }

// ── actions ──
function onAction(m, action) {
  if (action === 'complete') return openComplete(m)
  if (action === 'cancel') return openCancel(m)
  act(m, action)
}
async function act(m, action, body = {}) {
  try {
    await maintenanceAction(m.id, action, body)
    const past = { start: 'started', cancel: 'stood down', complete: 'completed' }
    toast.success(`Maintenance ${past[action] || action}`)
    reload(); emit('refresh-stats')
    return true
  } catch (e) { toast.error(errText(e, `Failed to ${action}`)); return false }
}

// ── Schedule modal ──
const formOpen = ref(false)
const saving = ref(false)
const pickedAsset = ref(null)
const blank = () => ({ maintenance_type: 'REPAIR', vendor_id: '', scheduled_date: '', cost: null, description: '' })
const form = ref(blank())
const openCreate = () => { form.value = blank(); pickedAsset.value = null; formOpen.value = true }

const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })

const vendorSelOptions = computed(() => [
  { value: '', label: 'Internal (no vendor)' },
  ...vendorOptions.value.map(v => ({ value: v.id, label: v.name })),
])
const activeType = computed(() => typeOptions.find(t => t.value === form.value.maintenance_type) || typeOptions[0])
const vendorLabel = computed(() => {
  if (!form.value.vendor_id) return 'Internal'
  return vendorOptions.value.find(v => v.id === form.value.vendor_id)?.name || 'Vendor'
})
function fmtLong(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

async function submit() {
  if (!pickedAsset.value) return
  saving.value = true
  try {
    await createMaintenance({
      asset_id: pickedAsset.value.id,
      maintenance_type: form.value.maintenance_type,
      vendor_id: form.value.vendor_id || null,
      scheduled_date: form.value.scheduled_date || null,
      cost: form.value.cost,
      description: form.value.description || null,
    })
    toast.success('Maintenance scheduled'); formOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to schedule')) }
  finally { saving.value = false }
}

// ── Complete modal ──
const completeOpen = ref(false)
const completeTarget = ref(null)
const completing = ref(false)
const completeForm = ref({ condition_after: '', cost: null, resolution_notes: '' })
function openComplete(m) {
  completeTarget.value = m
  completeForm.value = { condition_after: '', cost: m.cost ?? null, resolution_notes: '' }
  completeOpen.value = true
}
async function doComplete() {
  completing.value = true
  try {
    await maintenanceAction(completeTarget.value.id, 'complete', {
      condition_after: completeForm.value.condition_after || null,
      cost: completeForm.value.cost,
      resolution_notes: completeForm.value.resolution_notes || null,
    })
    toast.success('Maintenance completed'); completeOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to complete')) }
  finally { completing.value = false }
}

// ── Cancel modal ──
const cancelOpen = ref(false)
const cancelTarget = ref(null)
const cancelling = ref(false)
function openCancel(m) { cancelTarget.value = m; cancelOpen.value = true }
async function doCancel() {
  cancelling.value = true
  try {
    const ok = await act(cancelTarget.value, 'cancel')
    if (ok) cancelOpen.value = false
  } finally { cancelling.value = false }
}
</script>

<style scoped>
.ms { display: flex; flex-direction: column; gap: 16px; }

/* filter strip */
.ms-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ms-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ms-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.ms-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.ms-chip[data-tone="sched"] { --c: var(--as-st-reserved); }
.ms-chip[data-tone="prog"] { --c: var(--as-amber); }
.ms-chip[data-tone="done"] { --c: var(--as-st-available); }
.ms-chip[data-tone="canc"] { --c: var(--as-st-retired); }
.ms-chip.on { color: var(--c, var(--as-amber)); background: color-mix(in srgb, var(--c, var(--as-amber)) 12%, transparent); border-color: color-mix(in srgb, var(--c, var(--as-amber)) 32%, transparent); }
.ms-chip-n { font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--as-text) 8%, transparent); color: var(--as-text-secondary); font-variant-numeric: tabular-nums; }
.ms-chip.on .ms-chip-n { background: color-mix(in srgb, var(--c, var(--as-amber)) 22%, transparent); color: var(--c, var(--as-amber)); }
.as-btn.mini { padding: 7px 13px; font-size: 12.5px; }

/* grid */
.ms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .ms-grid { grid-template-columns: 1fr; } }

/* skeleton */
.ms-skel { position: relative; overflow: hidden; height: 196px; border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.ms-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

/* ════ shared form ════ */
.sf { display: flex; flex-direction: column; gap: 15px; }
.sf-field { display: flex; flex-direction: column; gap: 6px; }
.sf-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.sf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .sf-grid2 { grid-template-columns: 1fr; } }

/* work-order ticket preview */
.sf-ticket { position: relative; overflow: hidden; padding: 15px 16px; border-radius: 15px; background: var(--as-surf-card);
  border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.3s; }
.sf-ticket[data-ready="true"] { border-color: color-mix(in srgb, var(--as-amber) 32%, transparent); }
.sf-tk-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); }
.sf-tk-gear { position: absolute; right: -18px; bottom: -22px; opacity: 0.16; pointer-events: none; }
.sf-tk-stamp { position: absolute; top: 12px; right: 14px; font-family: var(--as-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
  padding: 3px 9px; border-radius: 6px; border: 1.5px solid var(--as-text-dim); color: var(--as-text-dim); opacity: 0.7; transform: rotate(4deg); }
.sf-tk-stamp[data-ready="true"] { color: var(--as-st-available); border-color: var(--as-st-available); opacity: 0.9; }
.sf-tk-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.sf-tk-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; background: color-mix(in srgb, currentColor 14%, transparent); border: 1px solid color-mix(in srgb, currentColor 28%, transparent); }
.sf-tk-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sf-tk-id b { font-size: 14px; font-weight: 800; color: var(--as-text); }
.sf-tk-id span { font-size: 11.5px; color: var(--as-text-muted); }
.sf-tk-rows { position: relative; z-index: 1; display: flex; gap: 16px; margin-top: 11px; }
.sf-tk-row { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--as-text-secondary); }
.sf-tk-row :deep(svg) { color: var(--as-amber); }

/* segmented type selector */
.sf-seg { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
.sf-seg-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 11px 6px; border-radius: 12px; cursor: pointer; font: inherit;
  font-size: 10.5px; font-weight: 700; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, border-color 0.2s; }
.sf-seg-btn :deep(svg) { color: var(--as-text-dim); transition: color 0.2s; }
.sf-seg-btn:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.sf-seg-btn.on { color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 40%, transparent); }
.sf-seg-btn.on :deep(svg) { color: var(--tc); }
@media (max-width: 520px) { .sf-seg { grid-template-columns: repeat(3, 1fr); } }

/* complete — condition delta */
.cf-delta { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; border-radius: 14px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); }
.cf-delta-node { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.cf-delta-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--as-text-dim); }
.cf-delta-same { font-size: 11px; color: var(--as-text-dim); font-style: italic; }
.cf-delta-beam { display: grid; place-items: center; color: var(--as-text-dim); transition: color 0.3s, transform 0.3s; }
.cf-delta-beam[data-changed="true"] { color: var(--as-amber); transform: scale(1.15); }

.cf-warn { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 12px; line-height: 1.4;
  color: var(--as-cond-poor); background: var(--as-cond-poor-soft); border: 1px solid color-mix(in srgb, var(--as-cond-poor) 30%, transparent); }
.cf-warn :deep(svg) { flex-shrink: 0; }

/* condition ladder */
.cf-ladder { display: flex; flex-wrap: wrap; gap: 6px; }
.cf-rung { padding: 8px 13px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.cf-rung:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.cf-rung[data-cond="NEW"] { --rc: var(--as-cond-new); }
.cf-rung[data-cond="GOOD"] { --rc: var(--as-cond-good); }
.cf-rung[data-cond="FAIR"] { --rc: var(--as-cond-fair); }
.cf-rung[data-cond="POOR"] { --rc: var(--as-cond-poor); }
.cf-rung[data-cond="RETIRED"] { --rc: var(--as-cond-retired); }
.cf-rung.on { color: var(--rc, var(--as-amber)); background: color-mix(in srgb, var(--rc, var(--as-amber)) 14%, transparent); border-color: color-mix(in srgb, var(--rc, var(--as-amber)) 42%, transparent); }
.cf-est { gap: 6px; }
.cf-est-val { display: flex; align-items: center; height: 39px; padding: 0 12px; border-radius: 11px; font-size: 13.5px; font-weight: 700;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px dashed var(--as-border-strong); }

.cancel-copy { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-secondary); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .ms-skel, .ms-skel-beam { animation: none; }
}
</style>
