<template>
  <AssetModal :open="open" :title="isEdit ? `Edit ${form.asset_code || 'asset'}` : 'Register asset'"
    :subtitle="isEdit ? 'Update asset master details' : 'Add a new asset to the hangar inventory'"
    :icon="PackagePlus" :width="660" @close="$emit('close')">

    <div class="up">
      <!-- live preview — mirrors the inventory bay card -->
      <Motion as="div" class="up-preview" :data-status="form.status" :style="{ '--accent': `var(${typeVar}, var(--as-amber))` }"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
        <span class="up-preview-grid" aria-hidden="true" />
        <span class="up-med">
          <span class="up-med-ring" aria-hidden="true" />
          <component :is="typeIcon" :size="22" />
        </span>
        <div class="up-pv-id">
          <span class="up-pv-code as-mono">{{ form.asset_code || 'NEW-ASSET' }}</span>
          <span class="up-pv-name">{{ (form.brand || '') + ' ' + (form.model || typeLabel) }}</span>
          <div class="up-pv-cond">
            <span v-for="n in 4" :key="n" class="up-seg" :class="{ on: n <= condLevel }" :style="{ '--seg': condColors[n - 1] }" />
            <span class="up-pv-cond-lab">{{ condLabel }}</span>
          </div>
        </div>
        <span class="as-stamp up-pv-stamp" :data-status="form.status"><span class="up-pv-dot" />{{ statusLabel }}</span>
      </Motion>

      <!-- IDENTITY -->
      <Motion as="section" class="up-sec" :initial="secIn" :animate="secOn" :transition="secT(0)">
        <header class="up-sec-h"><span class="up-sec-ic"><Fingerprint :size="14" /></span> Identity</header>
        <div class="up-grid">
          <AssetField v-model="form.asset_code" label="Asset code" placeholder="e.g. LAP-001" required />
          <AssetField v-model="form.tag" label="Asset tag / barcode" placeholder="QR / barcode" />
          <AssetField v-model="form.brand" label="Brand" placeholder="e.g. Dell" />
          <AssetField v-model="form.model" label="Model" placeholder="e.g. Latitude 7440" />
          <AssetField v-model="form.serial_number" label="Serial number" placeholder="SN…" class="up-span" />
        </div>
      </Motion>

      <!-- CLASSIFICATION -->
      <Motion as="section" class="up-sec" :initial="secIn" :animate="secOn" :transition="secT(1)">
        <header class="up-sec-h"><span class="up-sec-ic"><Layers :size="14" /></span> Classification</header>
        <div class="up-grid">
          <div class="up-field up-span">
            <span class="up-lab">Category <i class="up-lab-soft">— sets depreciation &amp; useful life</i></span>
            <AsSelect v-model="form.category_id" :options="categoryOptions" placeholder="Uncategorised"
              @update:model-value="onPickCategory" />
            <span v-if="pickedCat" class="up-cat-note">
              <Boxes :size="11" />
              {{ pickedCatPermanent ? 'Permanent — no depreciation' : (pickedCat.useful_life_months ? `Straight-line over ${pickedCat.useful_life_months} mo` : 'No useful-life set on this class') }}
            </span>
          </div>
          <div class="up-field">
            <span class="up-lab">Type <i class="up-lab-soft">— what it physically is</i></span>
            <AsSelect v-model="form.asset_type" :options="typeOptions" />
            <button v-if="allowedTypes.length" type="button" class="up-typefilter" @click="showAllTypes = !showAllTypes">
              {{ showAllTypes ? `Showing all types — limit to ${pickedCat?.name || 'class'}` : `Limited to ${pickedCat?.name || 'class'} — show all types` }}
            </button>
          </div>
          <div class="up-field"><span class="up-lab">Condition</span><AsSelect v-model="form.condition" :options="conditionOptions" /></div>
          <div v-if="!isEdit" class="up-field up-span"><span class="up-lab">Initial status</span><AsSelect v-model="form.status" :options="statusOptions" /></div>
        </div>
      </Motion>

      <!-- PROCUREMENT -->
      <Motion as="section" class="up-sec" :initial="secIn" :animate="secOn" :transition="secT(2)">
        <header class="up-sec-h"><span class="up-sec-ic"><ReceiptText :size="14" /></span> Procurement &amp; warranty</header>
        <div class="up-grid">
          <div class="up-field"><span class="up-lab">Purchase date</span>
            <HrDatePicker v-model="form.purchase_date" :max="today" placeholder="dd / mm / yyyy" /></div>
          <AssetField v-model="form.purchase_cost" type="number" label="Purchase cost" step="0.01" min="0" placeholder="0.00" />
          <AssetField v-model="form.invoice_no" label="Invoice no." placeholder="INV-…" />
          <AssetField v-model="form.purchase_order_no" label="PO no." placeholder="PO-…" />
          <div class="up-field"><span class="up-lab">Warranty start</span>
            <HrDatePicker v-model="form.warranty_start" placeholder="dd / mm / yyyy" /></div>
          <div class="up-field"><span class="up-lab">Warranty end</span>
            <HrDatePicker v-model="form.warranty_end" :min="form.warranty_start || ''" placeholder="dd / mm / yyyy" /></div>
        </div>
      </Motion>

      <!-- PLACEMENT -->
      <Motion as="section" class="up-sec" :initial="secIn" :animate="secOn" :transition="secT(3)">
        <header class="up-sec-h"><span class="up-sec-ic"><MapPin :size="14" /></span> Placement</header>
        <div class="up-grid">
          <AssetField v-model="form.building" label="Building" placeholder="e.g. HQ Tower" />
          <AssetField v-model="form.floor" label="Floor" placeholder="e.g. 4th" />
        </div>
      </Motion>

      <!-- NOTES -->
      <Motion as="section" class="up-sec" :initial="secIn" :animate="secOn" :transition="secT(4)">
        <header class="up-sec-h"><span class="up-sec-ic"><StickyNote :size="14" /></span> Notes</header>
        <AssetField v-model="form.notes" type="textarea" label="" full placeholder="Any extra detail — accessories, config, remarks…" />
      </Motion>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !form.asset_code || saving }"
        :whileHover="(!form.asset_code || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!form.asset_code || saving" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" />
        {{ isEdit ? 'Save changes' : 'Register asset' }}
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  PackagePlus, Check, Loader, Fingerprint, Layers, ReceiptText, MapPin, StickyNote,
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones,
  Keyboard, Mouse, Car, KeyRound, Package, FolderTree, Boxes,
} from 'lucide-vue-next'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import AsSelect from '../components/AsSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  createAsset, patchAsset, fetchCategories, fetchAssetTypes, iconForTypeName,
  ASSET_TYPES, ASSET_CONDITIONS, typeMeta, conditionMeta, statusMeta, errText,
} from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  asset: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)

const isEdit = computed(() => !!props.asset?.id)
const today = new Date().toISOString().slice(0, 10)

// ── section entrance choreography ──
const secIn = { opacity: 0, y: 14 }
const secOn = { opacity: 1, y: 0 }
const secT = (i) => ({ duration: 0.42, delay: 0.08 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

// ── option catalogs (icons + status/condition colour dots) ──
const TYPE_ICONS = {
  LAPTOP: Laptop, DESKTOP: HardDrive, MONITOR: Monitor, MOBILE: Smartphone,
  SIM: CreditCard, RFID_CARD: CreditCard, ID_CARD: CreditCard, HEADSET: Headphones,
  KEYBOARD: Keyboard, MOUSE: Mouse, VEHICLE: Car, KEYS: KeyRound, OTHER: Package,
}
// Built-in fallback used only until the live catalog loads (or if it's empty).
const FALLBACK_TYPE_OPTIONS = ASSET_TYPES.map(t => ({
  value: t, label: typeMeta(t).label, icon: TYPE_ICONS[t] || Package, accent: `var(${typeMeta(t).cssVar})`,
}))
// The asset-type catalog (built-ins + custom, managed in HR Settings → Asset Types).
const assetTypes = ref([])
async function loadAssetTypes() {
  try {
    const list = await fetchAssetTypes({ is_active: true })
    assetTypes.value = Array.isArray(list) ? list : []
  } catch { assetTypes.value = [] }
}
const ALL_TYPE_OPTIONS = computed(() => {
  if (!assetTypes.value.length) return FALLBACK_TYPE_OPTIONS
  return assetTypes.value.map(t => ({
    value: t.code, label: t.label, icon: iconForTypeName(t.icon),
    accent: `var(${typeMeta(t.code).cssVar}, var(--as-amber))`,
  }))
})
const CONDITION_DOT = { NEW: 'var(--as-cond-new)', GOOD: 'var(--as-cond-good)', FAIR: 'var(--as-cond-fair)', POOR: 'var(--as-cond-poor)', RETIRED: 'var(--as-cond-retired)' }
const conditionOptions = ASSET_CONDITIONS.filter(c => c !== 'RETIRED').map(c => ({ value: c, label: conditionMeta(c).label, dot: CONDITION_DOT[c] }))
const statusOptions = [
  { value: 'AVAILABLE', label: 'Available', dot: 'var(--as-st-available)' },
  { value: 'RESERVED', label: 'Reserved', dot: 'var(--as-st-reserved)' },
]

// ── Asset categories (the taxonomy from HR Settings → Asset Categories). Lets a
// registered asset be filed into a class so it inherits depreciation/useful-life
// and counts toward that class's fleet share. Active classes only. ──
const categories = ref([])
async function loadCategories() {
  try {
    const d = await fetchCategories({ is_active: true, limit: 200 })
    categories.value = Array.isArray(d) ? d : (d?.items || [])
  } catch { categories.value = [] }
}
const categoryOptions = computed(() => [
  { value: '', label: 'Uncategorised' },
  ...categories.value.map(c => ({ value: c.id, label: c.name, hint: c.code, icon: FolderTree })),
])
const pickedCat = computed(() => categories.value.find(c => c.id === form.value.category_id) || null)
const pickedCatPermanent = computed(() => !!pickedCat.value &&
  (pickedCat.value.depreciation_method === 'NONE' || (!pickedCat.value.depreciation_method && !pickedCat.value.useful_life_months)))

// The class can govern WHICH types are valid (opt-in allow-list). Empty = any
// type. The Type dropdown filters to the class's types, with a "show all" escape.
const showAllTypes = ref(false)
const allowedTypes = computed(() => (Array.isArray(pickedCat.value?.allowed_asset_types) ? pickedCat.value.allowed_asset_types : []))
const typeOptions = computed(() => {
  if (showAllTypes.value || !allowedTypes.value.length) return ALL_TYPE_OPTIONS.value
  // keep the currently-selected type visible even if it predates the allow-list
  const set = new Set([...allowedTypes.value, form.value.asset_type].filter(Boolean))
  return ALL_TYPE_OPTIONS.value.filter(o => set.has(o.value))
})

// On user pick, let the class drive the asset type + depreciation method so the
// two stay consistent (the taxonomy is the source of truth for the class).
function onPickCategory(id) {
  showAllTypes.value = false
  const c = categories.value.find(x => x.id === id)
  if (!c) return
  const allowed = Array.isArray(c.allowed_asset_types) ? c.allowed_asset_types : []
  if (allowed.length && !allowed.includes(form.value.asset_type)) form.value.asset_type = c.default_asset_type || allowed[0]
  else if (c.default_asset_type) form.value.asset_type = c.default_asset_type
  if (c.depreciation_method) form.value.depreciation_method = c.depreciation_method
}

// ── live-preview derivations ──
const catType = computed(() => assetTypes.value.find(t => t.code === form.value.asset_type) || null)
const typeIcon = computed(() => catType.value ? iconForTypeName(catType.value.icon) : (TYPE_ICONS[form.value.asset_type] || Package))
const typeLabel = computed(() => catType.value ? catType.value.label : typeMeta(form.value.asset_type).label)
const typeVar = computed(() => typeMeta(form.value.asset_type).cssVar)
const condLevel = computed(() => conditionMeta(form.value.condition).level)
const condLabel = computed(() => conditionMeta(form.value.condition).label)
const statusLabel = computed(() => statusMeta(form.value.status).label)
const condColors = ['var(--as-cond-poor)', 'var(--as-cond-fair)', 'var(--as-cond-good)', 'var(--as-cond-new)']

const blank = () => ({
  asset_code: '', asset_type: 'LAPTOP', category_id: '', brand: '', model: '', serial_number: '', tag: '',
  condition: 'NEW', status: 'AVAILABLE', purchase_date: '', purchase_cost: null,
  warranty_start: '', warranty_end: '', invoice_no: '', purchase_order_no: '',
  depreciation_method: '', building: '', floor: '', notes: '',
})
const form = ref(blank())

watch(() => props.open, (o) => {
  if (!o) return
  loadCategories()
  loadAssetTypes()
  showAllTypes.value = false
  if (props.asset) {
    const a = props.asset
    form.value = {
      ...blank(),
      asset_code: a.asset_code, asset_type: a.asset_type, category_id: a.category_id || '',
      brand: a.brand || '', model: a.model || '',
      serial_number: a.serial_number || '', tag: a.tag || '', condition: a.condition, status: a.status,
      purchase_date: a.purchase_date || '', purchase_cost: a.purchase_cost ?? null,
      warranty_start: a.warranty_start || '', warranty_end: a.warranty_end || '',
      invoice_no: a.invoice_no || '', purchase_order_no: a.purchase_order_no || '',
      depreciation_method: a.depreciation_method || '', building: a.building || '', floor: a.floor || '', notes: a.notes || '',
    }
  } else {
    form.value = blank()
  }
}, { immediate: true })

function payload() {
  const f = { ...form.value }
  for (const k of ['purchase_date', 'warranty_start', 'warranty_end']) if (!f[k]) f[k] = null
  for (const k of ['brand', 'model', 'serial_number', 'tag', 'invoice_no', 'purchase_order_no', 'building', 'floor', 'notes', 'category_id', 'depreciation_method']) {
    if (f[k] === '') f[k] = null
  }
  if (isEdit.value) delete f.status // status is driven by lifecycle actions, not free edit here
  return f
}

async function save() {
  if (!form.value.asset_code) return
  saving.value = true
  try {
    const data = isEdit.value ? await patchAsset(props.asset.id, payload()) : await createAsset(payload())
    toast.success(isEdit.value ? 'Asset updated' : 'Asset registered')
    emit('saved', data)
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to save asset'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.up { display: flex; flex-direction: column; gap: 16px; }

/* live preview */
.up-preview { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 16px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.up-preview-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 90% 0%, #000, transparent 72%); -webkit-mask-image: radial-gradient(120% 100% at 90% 0%, #000, transparent 72%); }
.up-med { position: relative; display: inline-grid; place-items: center; width: 50px; height: 50px; flex-shrink: 0; border-radius: 14px; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent); }
.up-med-ring { position: absolute; inset: -4px; border-radius: 17px; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--accent) 55%, transparent), transparent 55%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px));
  animation: as-holo-spin 5s linear infinite; }
.up-pv-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.up-pv-code { font-size: 15px; font-weight: 850; color: var(--as-text); letter-spacing: 0.02em; }
.up-pv-name { font-size: 12px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.up-pv-cond { display: flex; align-items: center; gap: 3px; margin-top: 2px; }
.up-seg { width: 14px; height: 5px; border-radius: 3px; background: var(--as-st-retired-soft); transition: background 0.4s var(--as-spring), box-shadow 0.4s; }
.up-seg.on { background: var(--seg); box-shadow: 0 0 6px color-mix(in srgb, var(--seg) 60%, transparent); }
.up-pv-cond-lab { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
.up-pv-stamp { flex-shrink: 0; align-self: flex-start; }
.up-pv-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; }

/* sections */
.up-sec { display: flex; flex-direction: column; gap: 10px; }
.up-sec-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.up-sec-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 24%, transparent); }
.up-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.up-span { grid-column: 1 / -1; }
@media (max-width: 560px) { .up-grid { grid-template-columns: 1fr; } }

.up-field { display: flex; flex-direction: column; gap: 6px; }
.up-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.up-lab-soft { font-style: normal; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--as-text-dim); opacity: 0.85; }
.up-cat-note { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
.up-cat-note :deep(svg) { color: var(--as-amber); flex-shrink: 0; }
.up-typefilter { align-self: flex-start; margin-top: 3px; padding: 0; background: none; border: 0; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 650; color: var(--as-amber); transition: opacity 0.2s; }
.up-typefilter:hover { text-decoration: underline; }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }
@media (prefers-reduced-motion: reduce) { .up-med-ring { animation: none; } }
</style>
