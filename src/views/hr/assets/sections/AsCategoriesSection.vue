<template>
  <div class="ct">
    <CategoryConsole :counts="counts" :segments="segments" :classified="classified" :unclassified="unclassified"
      :avg-life="avgLife" :active-status="statusFilter"
      @pick="onPick" @new="openCreate" @go="(t) => $emit('go', t)" @focus="openDrawerById" />

    <!-- filter strip -->
    <div class="ct-bar">
      <div class="ct-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search categories by name or code…" />
      </div>
      <div class="ct-chips">
        <button v-for="f in FILTERS" :key="f.v" class="ct-chip" :class="{ on: statusFilter === f.v }" :data-tone="f.tone" @click="statusFilter = f.v">{{ f.l }}</button>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="ct-grid">
      <div v-for="n in 6" :key="n" class="ct-skel" :style="{ '--i': n }"><span class="ct-skel-beam" /></div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!visible.length" :icon="FolderTree"
      :title="hasFilter ? 'No categories match' : 'No categories yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Categories group assets and drive depreciation + useful-life. Build your taxonomy.'">
      <button v-if="hasFilter" class="as-btn as-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> New category</button>
    </AssetEmptyState>

    <!-- card grid -->
    <div v-else class="ct-grid" :key="gridNonce">
      <CategoryNodeCard v-for="(c, i) in visible" :key="c.id" :category="c" :index="i"
        :color="colorMap[c.id]" :share="shareOf(c)" :parent-name="parentName(c)"
        @view="openDrawer(c)" @edit="openEdit(c)" @delete="openDelete(c)" @toggle="toggleActive(c)" />
    </div>

    <!-- ════════ New / Edit modal ════════ -->
    <AssetModal :open="formOpen" :title="editTarget ? 'Edit category' : 'New category'"
      :subtitle="editTarget ? 'Update taxonomy & depreciation' : 'Add a node to the taxonomy'" :icon="FolderTree" :width="600" @close="formOpen = false">
      <div class="cf">
        <!-- live cover preview (mirrors the dossier-plate aesthetic) -->
        <Motion as="div" class="cf-cover" :data-ready="!!(form.name && form.code)" :style="{ '--cc': previewColor }"
          :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
          <span class="cf-cover-grid" aria-hidden="true" />
          <span class="cf-cover-aura" aria-hidden="true" />
          <span class="cf-pv-spine" aria-hidden="true" />
          <header class="cf-cover-top">
            <span class="cf-pv-ic"><FolderTree :size="18" /></span>
            <div class="cf-pv-id">
              <span class="cf-pv-eyebrow">Asset Category · Taxonomy node</span>
              <b>{{ form.name || '— category name —' }}</b>
              <span class="as-mono cf-pv-code"><Hash :size="10" />{{ form.code || 'CODE' }}<i v-if="form.parent_category_id"> · under {{ parentNameById(form.parent_category_id) }}</i></span>
            </div>
            <span class="cf-pv-status" :data-on="form.is_active">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
          </header>
          <div class="cf-cover-foot">
            <div class="cf-curve" :data-on="depOn">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                <line class="cf-curve-base" x1="2" y1="36" x2="98" y2="36" />
                <path class="cf-curve-area" :d="curveArea" />
                <path class="cf-curve-line" :d="curveLine" />
              </svg>
              <span class="cf-curve-cap"><TrendingDown :size="10" />{{ depPreviewLabel }}<i v-if="form.useful_life_months"> · {{ form.useful_life_months }}mo life</i></span>
            </div>
            <div class="cf-pv-tags">
              <span v-if="form.default_asset_type" class="cf-pv-tag" :style="{ '--tc': typeColor(form.default_asset_type) }">{{ typeLabel(form.default_asset_type) }}</span>
              <span class="cf-pv-tag"><Layers :size="10" />{{ shareHint }}</span>
            </div>
          </div>
        </Motion>

        <div class="cf-grid2">
          <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(0)"><AssetField v-model="form.name" label="Name" required placeholder="e.g. Laptops" /></Motion>
          <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(1)"><AssetField v-model="form.code" label="Code" required placeholder="e.g. LAP" /></Motion>
        </div>

        <Motion as="div" class="cf-field" :initial="fIn" :animate="fOn" :transition="fT(2)">
          <span class="cf-lab"><GitBranch :size="11" /> Parent category</span>
          <AsSelect v-model="form.parent_category_id" :options="parentOptions" placeholder="No parent (top level)" />
        </Motion>

        <div class="cf-grid2">
          <Motion as="div" class="cf-field" :initial="fIn" :animate="fOn" :transition="fT(3)">
            <span class="cf-lab">Default asset type</span>
            <AsSelect v-model="form.default_asset_type" :options="typeOptions" placeholder="(any type)" />
          </Motion>
          <Motion as="div" class="cf-field" :initial="fIn" :animate="fOn" :transition="fT(4)">
            <span class="cf-lab">Depreciation</span>
            <AsSelect v-model="form.depreciation_method" :options="depOptions" placeholder="(none)" />
          </Motion>
        </div>

        <div class="cf-grid2">
          <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(5)"><AssetField v-model="form.useful_life_months" type="number" label="Useful life (months)" min="0" placeholder="e.g. 36" /></Motion>
          <Motion as="div" class="cf-field" :initial="fIn" :animate="fOn" :transition="fT(6)">
            <span class="cf-lab">Status</span>
            <div class="cf-seg">
              <button type="button" class="cf-seg-btn" :class="{ on: form.is_active }" data-tone="on" @click="form.is_active = true">Active</button>
              <button type="button" class="cf-seg-btn" :class="{ on: !form.is_active }" data-tone="off" @click="form.is_active = false">Inactive</button>
            </div>
          </Motion>
        </div>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(7)"><AssetField v-model="form.description" type="textarea" label="Description" placeholder="What belongs in this category?" :rows="2" full /></Motion>
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="formOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !form.name || !form.code || saving }"
          :whileHover="(!form.name || !form.code || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="!form.name || !form.code || saving" @click="save">
          <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> {{ editTarget ? 'Save changes' : 'Create' }}
        </Motion>
      </template>
    </AssetModal>

    <!-- delete -->
    <AssetDeleteModal :open="delOpen" :loading="deleting" title="Delete category" :item-name="delTarget?.name" :item-meta="delTarget?.code"
      :icon="FolderTree" :reasons="['No longer used','Duplicate','Reorganising','Other']" require-reason
      :consequences="['Cannot delete while assets reference it','Reassign those assets first']"
      confirm-label="Delete" @close="delOpen = false" @confirm="doDelete" />

    <!-- detail drawer -->
    <CategoryDetailDrawer :open="drawerOpen" :category="drawerCat" :color="drawerCat ? colorMap[drawerCat.id] : 'var(--as-amber)'"
      :share="drawerCat ? shareOf(drawerCat) : 0" :parent-name="drawerCat ? parentName(drawerCat) : ''"
      @close="drawerOpen = false" @detail="onDrawerDetail" @go-inventory="onDrawerGoInventory" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { FolderTree, Plus, Check, Loader, FilterX, Search, Hash, GitBranch, TrendingDown, Layers } from 'lucide-vue-next'
import CategoryConsole from '../components/CategoryConsole.vue'
import CategoryNodeCard from '../components/CategoryNodeCard.vue'
import CategoryDetailDrawer from '../components/CategoryDetailDrawer.vue'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import AsSelect from '../components/AsSelect.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import AssetDeleteModal from '../components/AssetDeleteModal.vue'
import {
  fetchCategories, createCategory, patchCategory, deleteCategory, fetchAssets,
  ASSET_TYPES, typeMeta, DEPRECIATION_METHODS, titleCase, errText,
} from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'go', 'detail'])
const toast = useToast()

const CAT_PALETTE = [
  'var(--as-amber)', 'var(--as-ember)', 'var(--as-st-available)', 'var(--as-amber-strong)',
  'var(--as-st-reserved)', 'var(--as-steel)', 'var(--as-ember-deep)', 'var(--as-steel-dim)',
]
const FILTERS = [
  { v: '', l: 'All', tone: '' },
  { v: 'active', l: 'Active', tone: 'green' },
  { v: 'inactive', l: 'Inactive', tone: 'steel' },
]

// ── data ──
const rows = ref([])
const loading = ref(true)
const gridNonce = ref(0)
const totalFleet = ref(0)
const q = ref('')
const statusFilter = ref('')

async function reload() {
  loading.value = true
  try {
    const [cats, fleet] = await Promise.all([
      fetchCategories({ limit: 200 }),
      fetchAssets({ limit: 1 }).catch(() => ({ total: 0 })),
    ])
    rows.value = cats.items || []
    totalFleet.value = fleet?.total ?? 0
    gridNonce.value++
  } catch (e) { toast.error(errText(e, 'Failed to load categories')) }
  finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const sortedByCount = computed(() => [...rows.value].sort((a, b) => (b.asset_count || 0) - (a.asset_count || 0)))
const colorMap = computed(() => {
  const m = {}
  sortedByCount.value.forEach((c, i) => { m[c.id] = CAT_PALETTE[i % CAT_PALETTE.length] })
  return m
})
const classified = computed(() => rows.value.reduce((s, c) => s + (c.asset_count || 0), 0))
const unclassified = computed(() => Math.max(0, totalFleet.value - classified.value))
const counts = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter(c => c.is_active).length,
  inactive: rows.value.filter(c => !c.is_active).length,
}))
const avgLife = computed(() => {
  const withLife = rows.value.filter(c => c.useful_life_months)
  if (!withLife.length) return 0
  return Math.round(withLife.reduce((s, c) => s + c.useful_life_months, 0) / withLife.length)
})
const segments = computed(() => sortedByCount.value
  .filter(c => (c.asset_count || 0) > 0)
  .map(c => ({ id: c.id, name: c.name, count: c.asset_count || 0, color: colorMap.value[c.id] })))

const shareOf = (c) => classified.value ? Math.round(((c.asset_count || 0) / classified.value) * 100) : 0
const nameById = computed(() => Object.fromEntries(rows.value.map(c => [c.id, c.name])))
const parentName = (c) => c.parent_category_id ? (nameById.value[c.parent_category_id] || '') : ''
const parentNameById = (id) => nameById.value[id] || 'parent'

// ── filtering ──
const hasFilter = computed(() => !!(q.value || statusFilter.value))
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(c => {
    if (statusFilter.value === 'active' && !c.is_active) return false
    if (statusFilter.value === 'inactive' && c.is_active) return false
    if (term && !(`${c.name} ${c.code}`.toLowerCase().includes(term))) return false
    return true
  })
})
const onPick = (f) => { statusFilter.value = statusFilter.value === f ? '' : f }
const clearFilters = () => { q.value = ''; statusFilter.value = '' }

// ── modal options ──
const typeOptions = computed(() => ASSET_TYPES.map(t => ({ value: t, label: typeMeta(t).label, dot: `var(${typeMeta(t).cssVar})` })))
const depOptions = DEPRECIATION_METHODS.map(m => ({ value: m, label: titleCase(m) }))
const parentOptions = computed(() => [
  { value: '', label: 'No parent (top level)', icon: GitBranch },
  ...rows.value
    .filter(c => !editTarget.value || c.id !== editTarget.value.id)
    .map(c => ({ value: c.id, label: c.name, icon: FolderTree })),
])
const typeLabel = (t) => typeMeta(t).label
const typeColor = (t) => `var(${typeMeta(t).cssVar})`

// ── New / Edit modal ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const blank = () => ({ name: '', code: '', parent_category_id: '', default_asset_type: '', useful_life_months: null, depreciation_method: '', is_active: true, description: '' })
const form = ref(blank())

const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] })

const previewColor = computed(() => editTarget.value ? colorMap.value[editTarget.value.id] || 'var(--as-amber)' : 'var(--as-amber)')
const depOn = computed(() => form.value.depreciation_method && form.value.depreciation_method.toUpperCase() !== 'NONE')
const depPreviewLabel = computed(() => depOn.value ? titleCase(form.value.depreciation_method) : 'No depreciation')

// depreciation-decay mini-curve for the live preview
const curveEndY = computed(() => depOn.value ? 33 : 7)
const curveLine = computed(() => `M 2 6 L 98 ${curveEndY.value}`)
const curveArea = computed(() => `M 2 6 L 98 ${curveEndY.value} L 98 40 L 2 40 Z`)
const shareHint = computed(() => editTarget.value ? `${shareOf(editTarget.value)}% of fleet` : 'New taxonomy node')

const openCreate = () => { editTarget.value = null; form.value = blank(); formOpen.value = true }
const openEdit = (c) => {
  editTarget.value = c
  form.value = {
    name: c.name, code: c.code, parent_category_id: c.parent_category_id || '',
    default_asset_type: c.default_asset_type || '', useful_life_months: c.useful_life_months ?? null,
    depreciation_method: c.depreciation_method || '', is_active: c.is_active, description: c.description || '',
  }
  formOpen.value = true
}
async function save() {
  if (!form.value.name || !form.value.code) return
  saving.value = true
  try {
    const payload = { ...form.value }
    payload.parent_category_id = payload.parent_category_id || null
    payload.default_asset_type = payload.default_asset_type || null
    payload.depreciation_method = payload.depreciation_method || null
    if (editTarget.value) await patchCategory(editTarget.value.id, payload)
    else await createCategory(payload)
    toast.success(editTarget.value ? 'Category updated' : 'Category created')
    formOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to save')) }
  finally { saving.value = false }
}

// ── quick active toggle ──
async function toggleActive(c) {
  const next = !c.is_active
  c.is_active = next // optimistic
  try { await patchCategory(c.id, { is_active: next }); emit('refresh-stats') }
  catch (e) { c.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

// ── delete ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (c) => { delTarget.value = c; delOpen.value = true }
async function doDelete() {
  deleting.value = true
  try { await deleteCategory(delTarget.value.id); toast.success('Category deleted'); delOpen.value = false; reload(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Reassign referencing assets first')) }
  finally { deleting.value = false }
}

// ── detail drawer ──
const drawerOpen = ref(false)
const drawerCat = ref(null)
const openDrawer = (c) => { drawerCat.value = c; drawerOpen.value = true }
const openDrawerById = (id) => { const c = rows.value.find(x => x.id === id); if (c) openDrawer(c) }
function onDrawerDetail(assetId) { drawerOpen.value = false; emit('detail', assetId) }
function onDrawerGoInventory() {
  const c = drawerCat.value
  drawerOpen.value = false
  if (c) emit('go', { tab: 'inventory', filter: { category_id: c.id, categoryLabel: c.name } })
}
</script>

<style scoped>
.ct { display: flex; flex-direction: column; gap: 16px; }

/* filter strip */
.ct-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ct-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.ct-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); }
.ct-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--as-text); }
.ct-chips { display: flex; gap: 6px; }
.ct-chip { padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.ct-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.ct-chip[data-tone="green"] { --c: var(--as-st-available); }
.ct-chip[data-tone="steel"] { --c: var(--as-steel); }
.ct-chip.on { color: var(--c, var(--as-amber)); background: color-mix(in srgb, var(--c, var(--as-amber)) 12%, transparent); border-color: color-mix(in srgb, var(--c, var(--as-amber)) 32%, transparent); }

/* grid */
.ct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .ct-grid { grid-template-columns: 1fr; } }

/* skeleton */
.ct-skel { position: relative; overflow: hidden; height: 200px; border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.ct-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

/* ════ modal ════ */
.cf { display: flex; flex-direction: column; gap: 15px; }
.cf-field { display: flex; flex-direction: column; gap: 6px; }
.cf-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.cf-lab :deep(svg) { color: var(--as-steel-dim); }
.cf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .cf-grid2 { grid-template-columns: 1fr; } }

/* live cover preview */
.cf-cover { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 13px; padding: 16px 17px 15px 20px; border-radius: 16px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.3s, box-shadow 0.3s; }
.cf-cover[data-ready="true"] { border-color: color-mix(in srgb, var(--cc) 38%, transparent); box-shadow: var(--as-card-shadow-hover); }
.cf-cover-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--cc) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--cc) 8%, transparent) 1px, transparent 1px);
  background-size: 24px 24px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 76%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 76%); }
.cf-cover-aura { position: absolute; inset: -40% 30% auto -10%; height: 70%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--cc) 22%, transparent), transparent 70%); filter: blur(22px); }
.cf-pv-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 1; background: linear-gradient(180deg, var(--cc), color-mix(in srgb, var(--cc) 30%, transparent)); box-shadow: 0 0 14px -2px var(--cc); }

.cf-cover-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.cf-pv-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--cc); background: color-mix(in srgb, var(--cc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 28%, transparent); }
.cf-pv-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cf-pv-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: color-mix(in srgb, var(--cc) 60%, var(--as-text-dim)); }
.cf-pv-id b { font-size: 15px; font-weight: 850; color: var(--as-text); }
.cf-pv-code { display: inline-flex; align-items: center; gap: 3px; font-size: 11.5px; color: var(--as-text-muted); }
.cf-pv-code :deep(svg) { opacity: 0.6; }
.cf-pv-id i { font-style: normal; color: var(--as-text-dim); }
.cf-pv-status { flex-shrink: 0; align-self: flex-start; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--as-st-retired); background: var(--as-st-retired-soft); border: 1px solid color-mix(in srgb, var(--as-st-retired) 36%, transparent); }
.cf-pv-status[data-on="true"] { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 36%, transparent); }

.cf-cover-foot { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 14px; }
.cf-curve { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.cf-curve svg { width: 100%; height: 42px; display: block; }
.cf-curve-base { stroke: var(--as-border-strong); stroke-width: 0.6; stroke-dasharray: 2 2; }
.cf-curve-area { fill: color-mix(in srgb, var(--cc) 16%, transparent); opacity: 0.7; transition: d 0.4s var(--as-ease); }
.cf-curve-line { fill: none; stroke: var(--cc); stroke-width: 2; stroke-linecap: round; transition: d 0.4s var(--as-ease);
  stroke-dasharray: 130; stroke-dashoffset: 130; animation: cf-draw 0.9s var(--as-ease) 0.2s forwards; }
.cf-curve[data-on="false"] .cf-curve-area { opacity: 0.35; }
.cf-curve-cap { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--as-text-muted); }
.cf-curve-cap :deep(svg) { color: var(--cc); }
.cf-curve-cap i { font-style: normal; color: var(--as-text-dim); }

.cf-pv-tags { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; flex-shrink: 0; }
.cf-pv-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--as-text-secondary); padding: 3px 8px; border-radius: 7px; background: var(--as-surface); border: 1px solid var(--as-border-soft); white-space: nowrap; }
.cf-pv-tag[style*="--tc"] { color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 28%, transparent); }
.cf-pv-tag :deep(svg) { color: var(--cc); }

@keyframes cf-draw { to { stroke-dashoffset: 0; } }

/* segmented status */
.cf-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.cf-seg-btn { padding: 9px 6px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.cf-seg-btn[data-tone="on"].on { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 40%, transparent); }
.cf-seg-btn[data-tone="off"].on { color: var(--as-st-retired); background: var(--as-st-retired-soft); border-color: color-mix(in srgb, var(--as-st-retired) 40%, transparent); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .ct-skel, .ct-skel-beam { animation: none; }
  .cf-curve-line { animation: none; stroke-dashoffset: 0; }
}
</style>
