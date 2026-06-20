<template>
  <div class="au">
    <AuditConsole :counts="counts" :recon="aggRecon" :active-status="statusFilter"
      @pick="onPick" @new="openCreate" @go="(t) => $emit('go', t)" />

    <!-- filter strip -->
    <div class="au-bar">
      <div class="au-chips">
        <button v-for="f in FILTERS" :key="f.v" class="au-chip" :class="{ on: statusFilter === f.v }" :data-tone="f.tone" @click="statusFilter = f.v">
          {{ f.l }}<span v-if="countFor(f.v)" class="au-chip-n">{{ countFor(f.v) }}</span>
        </button>
      </div>
      <button v-if="statusFilter" class="as-btn as-btn-ghost mini" @click="statusFilter = ''"><FilterX :size="13" /> Clear</button>
    </div>

    <!-- loading -->
    <div v-if="loading" class="au-grid">
      <div v-for="n in 4" :key="n" class="au-skel" :style="{ '--i': n }"><span class="au-skel-beam" /></div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!filtered.length" :icon="ClipboardCheck"
      :title="statusFilter ? 'No counts in this lane' : 'No audits yet'"
      :sub="statusFilter ? 'Nothing matches this filter.' : 'Run a physical reconciliation over a location, department or category — muster the fleet against the books.'">
      <button v-if="statusFilter" class="as-btn as-btn-ghost" @click="statusFilter = ''"><FilterX :size="14" /> Clear filter</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> New audit</button>
    </AssetEmptyState>

    <!-- campaign grid -->
    <div v-else class="au-grid" :key="gridNonce">
      <AuditCampaignCard v-for="(a, i) in filtered" :key="a.id" :audit="a" :index="i"
        :scope-label="scopeFor(a).label" :scope-kind="scopeFor(a).kind"
        @action="(act2) => onAction(a, act2)" @scan="openScan(a)" />
    </div>

    <!-- ════════ New audit modal ════════ -->
    <AssetModal :open="formOpen" title="New audit" subtitle="Scope a physical reconciliation count" :icon="ClipboardCheck" :width="600" @close="formOpen = false">
      <div class="nf">
        <!-- live muster ticket -->
        <Motion as="div" class="nf-ticket" :data-ready="!!form.name" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
          <span class="nf-tk-grid" aria-hidden="true" />
          <span class="nf-tk-crosshair" aria-hidden="true"><Crosshair :size="92" :stroke-width="0.6" /></span>
          <span class="nf-tk-stamp" :data-ready="!!form.name">{{ form.name ? 'READY' : 'DRAFT' }}</span>
          <div class="nf-tk-head">
            <span class="nf-tk-ic"><ScanSearch :size="18" /></span>
            <div class="nf-tk-id">
              <b>{{ form.name || '— name your count —' }}</b>
              <span>{{ scopeSummary }}</span>
            </div>
          </div>
          <div class="nf-tk-rows">
            <span class="nf-tk-row"><CalendarClock :size="12" /> {{ form.scheduled_date ? fmtLong(form.scheduled_date) : 'Unscheduled' }}</span>
            <span class="nf-tk-row"><Boxes :size="12" /> Snapshots in-scope assets on start</span>
          </div>
        </Motion>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(0)">
          <AssetField v-model="form.name" label="Audit name" required placeholder="e.g. Q2 IT inventory check" />
        </Motion>

        <Motion as="div" class="nf-scope" :initial="fIn" :animate="fOn" :transition="fT(1)">
          <span class="nf-lab">Scope <i class="nf-opt">— leave “All” to count everything; combine to narrow</i></span>
          <div class="nf-scope-grid">
            <div class="nf-field"><span class="nf-sub"><MapPin :size="12" /> Location</span>
              <AsSelect v-model="form.scope_location_id" :options="locationOptions" placeholder="All locations" /></div>
            <div class="nf-field"><span class="nf-sub"><Building2 :size="12" /> Department</span>
              <AsSelect v-model="form.scope_department_id" :options="departmentOptions" placeholder="All departments" /></div>
            <div class="nf-field"><span class="nf-sub"><FolderTree :size="12" /> Category</span>
              <AsSelect v-model="form.scope_category_id" :options="categoryOptions" placeholder="All categories" /></div>
          </div>
        </Motion>

        <Motion as="div" class="nf-field" :initial="fIn" :animate="fOn" :transition="fT(2)">
          <span class="nf-lab">Scheduled date</span>
          <HrDatePicker v-model="form.scheduled_date" placeholder="dd / mm / yyyy" />
        </Motion>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(3)">
          <AssetField v-model="form.notes" type="textarea" label="Notes" placeholder="Purpose, team, or instructions…" :rows="2" full />
        </Motion>
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="formOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !form.name || saving }"
          :whileHover="(!form.name || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="!form.name || saving" @click="submit">
          <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> Create audit
        </Motion>
      </template>
    </AssetModal>

    <!-- ════════ Scan / muster modal ════════ -->
    <AssetModal :open="scanOpen" :title="scanAudit?.name || 'Audit'" :subtitle="readOnly ? 'Reconciliation · read-only' : 'Tap a result for each asset'" :icon="ScanLine" :width="760" @close="onScanClose">
      <AuditScanDeck :audit="scanAudit" :items="scanItems" :read-only="readOnly" :loading="itemsLoading" :bulk-busy="bulkBusy"
        @scan="onScan" @scan-all-found="scanAllFound" @detail="onDeckDetail" @go="onDeckGo" />
      <template #footer>
        <button class="as-btn as-btn-ghost" @click="onScanClose">{{ readOnly ? 'Close' : 'Done' }}</button>
        <Motion v-if="!readOnly && scanAudit" as="button" type="button" class="as-btn as-btn-primary"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="completeFromScan">
          <CircleCheck :size="14" /> Close count
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
  ClipboardCheck, Plus, Check, Loader, FilterX, ScanLine, ScanSearch, CircleCheck,
  Crosshair, CalendarClock, Boxes, MapPin, Building2, FolderTree,
} from 'lucide-vue-next'
import AuditConsole from '../components/AuditConsole.vue'
import AuditCampaignCard from '../components/AuditCampaignCard.vue'
import AuditScanDeck from '../components/AuditScanDeck.vue'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import AsSelect from '../components/AsSelect.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  fetchAudits, createAudit, auditAction, fetchAuditItems, scanAuditItem,
  fetchCategories, fetchLocations, fetchDepartments, errText,
} from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

const FILTERS = [
  { v: '', l: 'All', tone: '' },
  { v: 'DRAFT', l: 'Drafts', tone: 'draft' },
  { v: 'IN_PROGRESS', l: 'Mustering', tone: 'prog' },
  { v: 'COMPLETED', l: 'Closed', tone: 'done' },
  { v: 'CANCELLED', l: 'Cancelled', tone: 'canc' },
]

// ── data ──
const all = ref([])
const loading = ref(true)
const gridNonce = ref(0)
const statusFilter = ref('')

const locations = ref([])
const departments = ref([])
const categories = ref([])
const locMap = computed(() => Object.fromEntries(locations.value.map(l => [l.id, l.name])))
const deptMap = computed(() => Object.fromEntries(departments.value.map(d => [d.id, d.name])))
const catMap = computed(() => Object.fromEntries(categories.value.map(c => [c.id, c.name])))
const locationOptions = computed(() => [{ value: '', label: 'All locations' }, ...locations.value.map(l => ({ value: l.id, label: l.name, icon: MapPin }))])
const departmentOptions = computed(() => [{ value: '', label: 'All departments' }, ...departments.value.map(d => ({ value: d.id, label: d.name, icon: Building2 }))])
const categoryOptions = computed(() => [{ value: '', label: 'All categories' }, ...categories.value.map(c => ({ value: c.id, label: c.name, icon: FolderTree }))])

async function reload() {
  loading.value = true
  try { all.value = (await fetchAudits({ limit: 200 })).items || []; gridNonce.value++ }
  catch (e) { toast.error(errText(e, 'Failed to load audits')) }
  finally { loading.value = false }
}
async function loadMasters() {
  try {
    const [cats, locs, depts] = await Promise.all([fetchCategories({ limit: 200 }), fetchLocations(), fetchDepartments()])
    categories.value = (cats?.items) || []
    locations.value = Array.isArray(locs) ? locs : []
    departments.value = Array.isArray(depts) ? depts : []
  } catch { /* dropdowns stay All-only */ }
}
onMounted(() => { reload(); loadMasters() })

// ── telemetry ──
const counts = computed(() => {
  const c = { draft: 0, inProgress: 0, completed: 0, cancelled: 0, total: all.value.length }
  const map = { DRAFT: 'draft', IN_PROGRESS: 'inProgress', COMPLETED: 'completed', CANCELLED: 'cancelled' }
  for (const a of all.value) { const k = map[a.status]; if (k) c[k]++ }
  return c
})
const aggRecon = computed(() => {
  let found = 0, mismatch = 0, missing = 0, pending = 0
  for (const a of all.value) {
    // only count audits that have a snapshot (started or beyond)
    found += a.total_found || 0
    mismatch += a.total_mismatched || 0
    missing += a.total_missing || 0
    pending += Math.max(0, (a.total_expected || 0) - (a.total_found || 0) - (a.total_mismatched || 0) - (a.total_missing || 0))
  }
  return { found, mismatch, damaged: 0, missing, pending }
})
const countFor = (v) => v ? all.value.filter(a => a.status === v).length : all.value.length
const filtered = computed(() => statusFilter.value ? all.value.filter(a => a.status === statusFilter.value) : all.value)
const onPick = (s) => { statusFilter.value = statusFilter.value === s ? '' : s }

// scope resolution for cards
function scopeFor(a) {
  const parts = []
  if (a.scope_location_id) parts.push({ kind: 'location', label: locMap.value[a.scope_location_id] || 'Location' })
  if (a.scope_department_id) parts.push({ kind: 'department', label: deptMap.value[a.scope_department_id] || 'Department' })
  if (a.scope_category_id) parts.push({ kind: 'category', label: catMap.value[a.scope_category_id] || 'Category' })
  if (!parts.length) return { kind: '', label: 'All assets' }
  if (parts.length === 1) return parts[0]
  return { kind: '', label: parts.map(p => p.label).join(' · ') }
}

// ── campaign actions ──
async function onAction(a, action) {
  try {
    await auditAction(a.id, action)
    const past = { start: 'started', complete: 'closed', cancel: 'cancelled' }
    toast.success(`Audit ${past[action] || action}`)
    reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, `Failed to ${action}`)) }
}

// ── New audit modal ──
const formOpen = ref(false)
const saving = ref(false)
const blank = () => ({ name: '', scope_location_id: '', scope_department_id: '', scope_category_id: '', scheduled_date: '', notes: '' })
const form = ref(blank())
const openCreate = () => { form.value = blank(); formOpen.value = true }

const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })

const scopeSummary = computed(() => {
  const parts = []
  if (form.value.scope_location_id) parts.push(locMap.value[form.value.scope_location_id] || 'location')
  if (form.value.scope_department_id) parts.push(deptMap.value[form.value.scope_department_id] || 'department')
  if (form.value.scope_category_id) parts.push(catMap.value[form.value.scope_category_id] || 'category')
  return parts.length ? `Scope: ${parts.join(' · ')}` : 'Scope: all assets'
})
function fmtLong(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

async function submit() {
  if (!form.value.name) return
  saving.value = true
  try {
    await createAudit({
      name: form.value.name,
      scope_location_id: form.value.scope_location_id || null,
      scope_department_id: form.value.scope_department_id || null,
      scope_category_id: form.value.scope_category_id || null,
      scheduled_date: form.value.scheduled_date || null,
      notes: form.value.notes || null,
    })
    toast.success('Audit created'); formOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to create audit')) }
  finally { saving.value = false }
}

// ── Scan modal ──
const scanOpen = ref(false)
const scanAudit = ref(null)
const readOnly = ref(false)
const scanItems = ref([])
const itemsLoading = ref(false)
const bulkBusy = ref(false)
let scanDirty = false

async function openScan(a) {
  scanAudit.value = a
  readOnly.value = a.status !== 'IN_PROGRESS'
  scanOpen.value = true
  itemsLoading.value = true
  scanDirty = false
  try { scanItems.value = await fetchAuditItems(a.id) }
  catch (e) { toast.error(errText(e, 'Failed to load items')) }
  finally { itemsLoading.value = false }
}

async function onScan({ item, body }) {
  try {
    const updated = await scanAuditItem(scanAudit.value.id, item.id, body)
    const idx = scanItems.value.findIndex(x => x.id === item.id)
    if (idx >= 0) scanItems.value[idx] = updated
    scanDirty = true
  } catch (e) { toast.error(errText(e, 'Scan failed')) }
}

async function scanAllFound() {
  const pending = scanItems.value.filter(it => it.result === 'PENDING')
  if (!pending.length) return
  bulkBusy.value = true
  try {
    for (const it of pending) {
      const updated = await scanAuditItem(scanAudit.value.id, it.id, { result: 'FOUND' })
      const idx = scanItems.value.findIndex(x => x.id === it.id)
      if (idx >= 0) scanItems.value[idx] = updated
    }
    scanDirty = true
    toast.success(`Marked ${pending.length} asset${pending.length > 1 ? 's' : ''} found`)
  } catch (e) { toast.error(errText(e, 'Bulk scan failed')) }
  finally { bulkBusy.value = false }
}

async function completeFromScan() {
  if (!scanAudit.value) return
  try {
    await auditAction(scanAudit.value.id, 'complete')
    toast.success('Audit closed')
    scanOpen.value = false; scanDirty = false
    reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to close count')) }
}

function onDeckDetail(assetId) { scanOpen.value = false; emit('detail', assetId) }
function onDeckGo(tab) { scanOpen.value = false; emit('go', tab) }

// refresh card tallies after scanning when the modal closes
function onScanClose() {
  scanOpen.value = false
  if (scanDirty) { reload(); emit('refresh-stats'); scanDirty = false }
}
</script>

<style scoped>
.au { display: flex; flex-direction: column; gap: 16px; }

/* filter strip */
.au-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.au-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.au-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.au-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.au-chip[data-tone="draft"] { --c: var(--as-st-reserved); }
.au-chip[data-tone="prog"] { --c: var(--as-amber); }
.au-chip[data-tone="done"] { --c: var(--as-st-available); }
.au-chip[data-tone="canc"] { --c: var(--as-st-retired); }
.au-chip.on { color: var(--c, var(--as-amber)); background: color-mix(in srgb, var(--c, var(--as-amber)) 12%, transparent); border-color: color-mix(in srgb, var(--c, var(--as-amber)) 32%, transparent); }
.au-chip-n { font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--as-text) 8%, transparent); color: var(--as-text-secondary); font-variant-numeric: tabular-nums; }
.au-chip.on .au-chip-n { background: color-mix(in srgb, var(--c, var(--as-amber)) 22%, transparent); color: var(--c, var(--as-amber)); }
.as-btn.mini { padding: 7px 13px; font-size: 12.5px; }

/* grid */
.au-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .au-grid { grid-template-columns: 1fr; } }

/* skeleton */
.au-skel { position: relative; overflow: hidden; height: 210px; border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.au-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

/* ════ New audit modal ════ */
.nf { display: flex; flex-direction: column; gap: 15px; }
.nf-field { display: flex; flex-direction: column; gap: 6px; }
.nf-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.nf-opt { font-style: normal; font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--as-text-dim); opacity: 0.8; }
.nf-sub { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }
.nf-sub :deep(svg) { color: var(--as-steel-dim); }
.nf-scope { display: flex; flex-direction: column; gap: 8px; }
.nf-scope-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 560px) { .nf-scope-grid { grid-template-columns: 1fr; } }

/* muster ticket preview */
.nf-ticket { position: relative; overflow: hidden; padding: 15px 16px; border-radius: 15px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.3s; }
.nf-ticket[data-ready="true"] { border-color: color-mix(in srgb, var(--as-amber) 32%, transparent); }
.nf-tk-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 18px 18px; mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); }
.nf-tk-crosshair { position: absolute; right: -16px; bottom: -16px; color: var(--as-amber); opacity: 0.12; pointer-events: none; }
.nf-tk-stamp { position: absolute; top: 12px; right: 14px; font-family: var(--as-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.16em; padding: 3px 9px; border-radius: 6px; border: 1.5px solid var(--as-text-dim); color: var(--as-text-dim); opacity: 0.7; transform: rotate(4deg); }
.nf-tk-stamp[data-ready="true"] { color: var(--as-st-available); border-color: var(--as-st-available); opacity: 0.9; }
.nf-tk-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.nf-tk-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 28%, transparent); }
.nf-tk-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.nf-tk-id b { font-size: 14px; font-weight: 800; color: var(--as-text); }
.nf-tk-id span { font-size: 11.5px; color: var(--as-text-muted); }
.nf-tk-rows { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 14px; margin-top: 11px; }
.nf-tk-row { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--as-text-secondary); }
.nf-tk-row :deep(svg) { color: var(--as-amber); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) { .au-skel, .au-skel-beam { animation: none; } }
</style>
