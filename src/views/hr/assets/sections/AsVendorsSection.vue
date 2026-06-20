<template>
  <div class="vsec">
    <SupplyConsole :vendors="rows" :active-filter="activeFilter"
      @new="openCreate" @go="(t) => $emit('go', t)" @pick="onPick" @focus="focusVendor" />

    <!-- command bar -->
    <div class="vsec-bar">
      <label class="vsec-search">
        <Search :size="15" />
        <input v-model="search" type="text" placeholder="Search vendors, contacts, codes…" />
        <button v-if="search" type="button" class="vsec-search-x" @click="search = ''"><X :size="13" /></button>
      </label>
      <div class="vsec-bar-right">
        <div class="vsec-chips">
          <button v-for="f in FILTERS" :key="f.v" class="vsec-chip" :class="{ on: activeFilter === f.v }" :data-tone="f.tone" @click="activeFilter = f.v">
            {{ f.l }}<span v-if="countFor(f.v)" class="vsec-chip-n">{{ countFor(f.v) }}</span>
          </button>
        </div>
        <AsSelect v-model="sortKey" :options="SORT_OPTIONS" placeholder="Sort" class="vsec-sort" />
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="vsec-grid">
      <div v-for="n in 6" :key="n" class="vsec-skel" :style="{ '--i': n }"><span class="vsec-skel-beam" /></div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!visible.length" :icon="Building2"
      :title="search || activeFilter ? 'No matching vendors' : 'No suppliers yet'"
      :sub="search || activeFilter ? 'Try a different search or clear the filter.' : 'Add suppliers to track who sources and services your fleet.'">
      <button v-if="search || activeFilter" class="as-btn as-btn-ghost" @click="search = ''; activeFilter = ''"><FilterX :size="14" /> Clear</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> New vendor</button>
    </AssetEmptyState>

    <!-- grid -->
    <div v-else class="vsec-grid">
      <VendorNodeCard v-for="(v, i) in visible" :key="v.id" :vendor="v" :index="i" :max-assets="maxAssets" :flash="focusId === v.id"
        @edit="openEdit" @delete="openDelete" @toggle-active="toggleActive" @view-assets="viewAssets" />
    </div>

    <!-- ════════════ New / Edit vendor modal ════════════ -->
    <AssetModal :open="formOpen" :title="editTarget ? 'Edit vendor' : 'New vendor'"
      :subtitle="editTarget ? 'Update supplier record' : 'Add a supplier to the network'" :icon="Building2" :width="620" @close="formOpen = false">
      <div class="vf">
        <!-- live dossier preview -->
        <Motion as="div" class="vf-dossier" :data-tone="formTone" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
          <span class="vf-dk-grid" aria-hidden="true" />
          <span class="vf-mono"><span class="vf-mono-ring" aria-hidden="true" />{{ formInitials }}</span>
          <div class="vf-dk-id">
            <b>{{ form.name || 'New supplier' }}</b>
            <span class="vf-dk-sub">
              <span v-if="form.code" class="as-mono">{{ form.code }}</span>
              <VendorStars :model-value="form.rating" readonly :size="12" />
              <span class="vf-dk-state" :class="{ on: form.is_active }"><i />{{ form.is_active ? 'Active' : 'Inactive' }}</span>
            </span>
          </div>
        </Motion>

        <Motion as="div" class="vf-grid2" :initial="fIn" :animate="fOn" :transition="fT(0)">
          <AssetField v-model="form.name" label="Name" required placeholder="Supplier name" />
          <AssetField v-model="form.code" label="Code" placeholder="Short code" />
        </Motion>

        <!-- rating + active -->
        <Motion as="div" class="vf-quality" :initial="fIn" :animate="fOn" :transition="fT(1)">
          <div class="vf-q-rate">
            <span class="vf-lab">Supplier rating</span>
            <div class="vf-stars-row">
              <VendorStars v-model="form.rating" :size="26" />
              <button v-if="form.rating" type="button" class="vf-clear-rate" @click="form.rating = null">clear</button>
            </div>
          </div>
          <div class="vf-q-active">
            <span class="vf-lab">Status</span>
            <button type="button" class="vn-toggle" :class="{ on: form.is_active }" @click="form.is_active = !form.is_active">
              <span class="vn-toggle-knob" /><span class="vn-toggle-lab">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
            </button>
          </div>
        </Motion>

        <Motion as="div" class="vf-grid2" :initial="fIn" :animate="fOn" :transition="fT(2)">
          <AssetField v-model="form.contact_person" label="Contact person" placeholder="Primary contact" />
          <AssetField v-model="form.email" type="email" label="Email" placeholder="name@vendor.com" />
        </Motion>
        <Motion as="div" class="vf-grid2" :initial="fIn" :animate="fOn" :transition="fT(3)">
          <AssetField v-model="form.phone" label="Phone" placeholder="Phone number" />
          <AssetField v-model="form.website" label="Website" placeholder="vendor.com" />
        </Motion>
        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(4)">
          <AssetField v-model="form.gstin" label="GST / VAT no." placeholder="Tax identifier" full />
        </Motion>
        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(5)">
          <AssetField v-model="form.address" type="textarea" label="Address" placeholder="Billing / shipping address" :rows="2" full />
        </Motion>
        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(6)">
          <AssetField v-model="form.notes" type="textarea" label="Notes" placeholder="Anything worth remembering" :rows="2" full />
        </Motion>
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="formOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !form.name || saving }"
          :whileHover="(!form.name || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="!form.name || saving" @click="save">
          <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> {{ editTarget ? 'Save changes' : 'Add vendor' }}
        </Motion>
      </template>
    </AssetModal>

    <AssetDeleteModal :open="delOpen" :loading="deleting" title="Delete vendor" :item-name="delTarget?.name" :item-meta="delTarget?.code"
      :icon="Building2" :reasons="['No longer used','Duplicate record','Merged with another','Other']" require-reason
      :consequences="['Cannot delete while assets reference it — reassign them first', 'Removes it from the maintenance vendor list']"
      confirm-label="Delete vendor" @close="delOpen = false" @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Building2, Plus, Search, X, Check, Loader, FilterX } from 'lucide-vue-next'
import SupplyConsole from '../components/SupplyConsole.vue'
import VendorNodeCard from '../components/VendorNodeCard.vue'
import VendorStars from '../components/VendorStars.vue'
import AsSelect from '../components/AsSelect.vue'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import AssetDeleteModal from '../components/AssetDeleteModal.vue'
import { fetchVendors, createVendor, patchVendor, deleteVendor, errText } from '@/composables/useAssets'

const emit = defineEmits(['go'])
const toast = useToast()

const FILTERS = [
  { v: '', l: 'All', tone: '' },
  { v: 'active', l: 'Active', tone: 'gain' },
  { v: 'inactive', l: 'Inactive', tone: 'steel' },
]
const SORT_OPTIONS = [
  { value: 'name', label: 'Name A → Z' },
  { value: 'rating', label: 'Rating: high → low' },
  { value: 'assets', label: 'Assets: high → low' },
  { value: 'newest', label: 'Newest first' },
]

const rows = ref([])
const loading = ref(true)
const search = ref('')
const activeFilter = ref('')
const sortKey = ref('name')

async function reload() {
  loading.value = true
  try { rows.value = (await fetchVendors({ limit: 200 })).items || [] }
  catch (e) { toast.error(errText(e, 'Failed to load vendors')) }
  finally { loading.value = false }
}
onMounted(reload)

const isActive = (v) => v.is_active !== false
const countFor = (v) => {
  if (!v) return rows.value.length
  return rows.value.filter(x => v === 'active' ? isActive(x) : !isActive(x)).length
}
const maxAssets = computed(() => Math.max(1, ...rows.value.map(v => v.asset_count || 0)))
const onPick = (f) => { activeFilter.value = activeFilter.value === f ? '' : f }

const visible = computed(() => {
  let list = rows.value
  if (activeFilter.value) list = list.filter(v => activeFilter.value === 'active' ? isActive(v) : !isActive(v))
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(v => [v.name, v.code, v.contact_person, v.email].some(x => (x || '').toLowerCase().includes(q)))
  const arr = [...list]
  switch (sortKey.value) {
    case 'rating': arr.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break
    case 'assets': arr.sort((a, b) => (b.asset_count || 0) - (a.asset_count || 0)); break
    case 'newest': arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break
    default: arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }
  return arr
})

// ── constellation → card focus ──
const focusId = ref(null)
let focusTimer = null
function focusVendor(id) {
  search.value = ''; activeFilter.value = ''   // ensure the node's card is in view
  nextTick(() => {
    const el = document.querySelector(`[data-vid="${id}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    focusId.value = id
    clearTimeout(focusTimer)
    focusTimer = setTimeout(() => { focusId.value = null }, 1500)
  })
}

// ── active toggle (closes the is_active UI gap) ──
async function toggleActive(v) {
  const next = !isActive(v)
  try {
    await patchVendor(v.id, { is_active: next })
    const row = rows.value.find(x => x.id === v.id)
    if (row) row.is_active = next
    toast.success(next ? 'Vendor activated' : 'Vendor deactivated')
  } catch (e) { toast.error(errText(e, 'Failed to update vendor')) }
}

function viewAssets(v) {
  emit('go', { tab: 'inventory', filter: { vendor_id: v.id, vendorLabel: v.name } })
}

// ── form modal ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const blank = () => ({ name: '', code: '', contact_person: '', email: '', phone: '', gstin: '', website: '', rating: null, address: '', notes: '', is_active: true })
const form = ref(blank())
const openCreate = () => { editTarget.value = null; form.value = blank(); formOpen.value = true }
const openEdit = (v) => {
  editTarget.value = v
  form.value = {
    name: v.name || '', code: v.code || '', contact_person: v.contact_person || '', email: v.email || '',
    phone: v.phone || '', gstin: v.gstin || '', website: v.website || '', rating: v.rating ?? null,
    address: v.address || '', notes: v.notes || '', is_active: v.is_active !== false,
  }
  formOpen.value = true
}

const formInitials = computed(() => (form.value.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '·')
const formTone = computed(() => {
  const r = form.value.rating || 0
  if (r >= 5) return 'gold'; if (r >= 4) return 'amber'; if (r >= 3) return 'ember'; if (r >= 1) return 'steel'; return 'none'
})

const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] })

async function save() {
  if (!form.value.name) return
  saving.value = true
  try {
    const payload = Object.fromEntries(Object.entries(form.value).map(([k, val]) => [k, val === '' ? null : val]))
    if (editTarget.value) await patchVendor(editTarget.value.id, payload)
    else await createVendor(payload)
    toast.success(editTarget.value ? 'Vendor updated' : 'Vendor added'); formOpen.value = false; reload()
  } catch (e) { toast.error(errText(e, 'Failed to save vendor')) }
  finally { saving.value = false }
}

// ── delete ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (v) => { delTarget.value = v; delOpen.value = true }
async function doDelete() {
  deleting.value = true
  try { await deleteVendor(delTarget.value.id); toast.success('Vendor deleted'); delOpen.value = false; reload() }
  catch (e) { toast.error(errText(e, 'Reassign referencing assets first')) }
  finally { deleting.value = false }
}
</script>

<style scoped>
.vsec { display: flex; flex-direction: column; gap: 16px; }

/* command bar */
.vsec-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.vsec-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; max-width: 360px; padding: 9px 12px; border-radius: 12px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); transition: border-color 0.2s; }
.vsec-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.vsec-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); }
.vsec-search input::placeholder { color: var(--as-text-dim); }
.vsec-search-x { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; border: none; background: var(--as-surface-elevated); color: var(--as-text-muted); cursor: pointer; }
.vsec-bar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.vsec-chips { display: flex; gap: 6px; }
.vsec-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.vsec-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.vsec-chip[data-tone="gain"] { --c: var(--as-st-available); }
.vsec-chip[data-tone="steel"] { --c: var(--as-steel); }
.vsec-chip.on { color: var(--c, var(--as-amber)); background: color-mix(in srgb, var(--c, var(--as-amber)) 12%, transparent); border-color: color-mix(in srgb, var(--c, var(--as-amber)) 32%, transparent); }
.vsec-chip-n { font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--as-text) 8%, transparent); color: var(--as-text-secondary); font-variant-numeric: tabular-nums; }
.vsec-chip.on .vsec-chip-n { background: color-mix(in srgb, var(--c, var(--as-amber)) 22%, transparent); color: var(--c, var(--as-amber)); }
.vsec-sort { min-width: 168px; }

/* grid */
.vsec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .vsec-grid { grid-template-columns: 1fr; } }

/* skeleton */
.vsec-skel { position: relative; overflow: hidden; height: 196px; border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.vsec-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-amber) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

/* ════ modal ════ */
.vf { display: flex; flex-direction: column; gap: 14px; }
.vf-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.vf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .vf-grid2 { grid-template-columns: 1fr; } }

/* dossier preview */
.vf-dossier { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 15px 16px; border-radius: 15px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.vf-dossier[data-tone="gold"]  { --tc: var(--as-amber-bright); }
.vf-dossier[data-tone="amber"] { --tc: var(--as-amber); }
.vf-dossier[data-tone="ember"] { --tc: var(--as-ember); }
.vf-dossier[data-tone="steel"] { --tc: var(--as-steel); }
.vf-dossier[data-tone="none"]  { --tc: var(--as-steel-dim); }
.vf-dk-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); }
.vf-mono { position: relative; display: grid; place-items: center; width: 50px; height: 50px; flex-shrink: 0; border-radius: 14px; z-index: 1;
  font-size: 17px; font-weight: 850; color: var(--tc);
  background: radial-gradient(circle at 36% 28%, color-mix(in srgb, var(--tc) 24%, transparent), color-mix(in srgb, var(--tc) 8%, transparent));
  border: 1px solid color-mix(in srgb, var(--tc) 34%, transparent); }
.vf-mono-ring { position: absolute; inset: -4px; border-radius: 17px; border: 1px dashed color-mix(in srgb, var(--tc) 38%, transparent); animation: vn-spin 18s linear infinite; }
.vf-dk-id { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.vf-dk-id b { font-size: 16px; font-weight: 800; color: var(--as-text); }
.vf-dk-sub { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.vf-dk-sub .as-mono { font-size: 11.5px; color: var(--as-text-muted); }
.vf-dk-state { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-st-retired); }
.vf-dk-state i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.vf-dk-state.on { color: var(--as-st-available); }

/* quality row */
.vf-quality { display: grid; grid-template-columns: 1fr auto; gap: 13px; align-items: end; padding: 13px 14px; border-radius: 13px;
  background: color-mix(in srgb, var(--as-surface-elevated) 55%, transparent); border: 1px solid var(--as-border-soft); }
.vf-q-rate { display: flex; flex-direction: column; gap: 7px; }
.vf-stars-row { display: flex; align-items: center; gap: 12px; }
.vf-clear-rate { border: none; background: none; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; color: var(--as-text-dim); text-decoration: underline; }
.vf-clear-rate:hover { color: var(--as-text-secondary); }
.vf-q-active { display: flex; flex-direction: column; gap: 7px; align-items: flex-start; }

/* shared toggle (mirror of VendorNodeCard) */
.vn-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px 5px 5px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.25s var(--as-spring); }
.vn-toggle-knob { position: relative; width: 28px; height: 16px; border-radius: 999px; background: color-mix(in srgb, var(--as-steel) 30%, transparent); transition: background 0.25s; flex-shrink: 0; }
.vn-toggle-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--as-text-dim); transition: transform 0.25s var(--as-spring), background 0.25s; }
.vn-toggle.on { color: var(--as-st-available); border-color: color-mix(in srgb, var(--as-st-available) 34%, transparent); }
.vn-toggle.on .vn-toggle-knob { background: color-mix(in srgb, var(--as-st-available) 30%, transparent); }
.vn-toggle.on .vn-toggle-knob::after { transform: translateX(12px); background: var(--as-st-available); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes vn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .vsec-skel, .vsec-skel-beam { animation: none; }
  .vf-mono-ring { animation: none; }
}
</style>
