<template>
  <div class="sat">
    <SetSectionHead eyebrow="Modules · Assets" title="Asset" accent="Types"
      accent-color="var(--set-deep)" :icon="Shapes"
      sub="The catalog of asset kinds — the physical-form tag every asset carries (Laptop, Vehicle… plus any you add). Create your own types here; they appear instantly in the Register-asset form and inside category allow-lists. Distinct from Asset Categories (your depreciation/grouping classes) — this is the kind, that is the class.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New type
        </Motion>
      </template>

      <template #lenses>
        <div class="sat-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-deep)" @click="lens = 'all'">
            <Shapes :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'active' }" style="--acc: var(--set-ok)" @click="setLens('active')">
            <Power :size="12" /> Active <b>{{ activeCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'inactive' }" style="--acc: var(--set-unset)" @click="setLens('inactive')">
            <PowerOff :size="12" /> Inactive <b>{{ rows.length - activeCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'system' }" style="--acc: var(--set-gold)" @click="setLens('system')">
            <Lock :size="12" /> Built-in <b>{{ systemCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'custom' }" style="--acc: var(--set-deep)" @click="setLens('custom')">
            <Sparkles :size="12" /> Custom <b>{{ rows.length - systemCount }}</b>
          </button>
          <span class="set-chip sat-stat"><Boxes :size="12" /> {{ classified }} asset{{ classified === 1 ? '' : 's' }} typed</span>
        </div>
      </template>

      <div class="sat-powers">
        <Share2 :size="12" /><span class="sat-powers-lab">Powers</span>
        <button class="sat-mod" @click="$router.push('/admin/hr/assets/dashboard')"><Boxes :size="12" /> Assets</button>
        <button class="sat-mod alt" @click="$router.push('/admin/hr/settings/asset-categories')"><ExternalLink :size="12" /> Asset Categories</button>
        <button class="sat-mod alt" @click="$router.push('/admin/hr/assets/inventory')"><ExternalLink :size="12" /> Register / inventory</button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + catalog intelligence -->
    <div class="sat-hero">
      <Motion as="div" class="sat-table-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="sat-table-skel"><span class="sat-skel-beam" /></div>
        <TypeSpecimenTable v-else-if="rows.length" :types="rows" @select="openEdit" />
        <div v-else class="sat-table-empty"><Shapes :size="26" /><p>No asset types yet — define the kinds of equipment your fleet holds.</p></div>
      </Motion>

      <Motion as="aside" class="sat-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="sat-insight-head"><Activity :size="14" /> Catalog intelligence</header>
        <div class="sat-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="sat-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="sat-insight-body"><b>{{ ins.value }}</b><span>{{ ins.label }}</span></div>
          <button v-if="ins.action" class="sat-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter -->
    <div class="sat-bar">
      <div class="sat-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search types, codes…" />
      </div>
      <span v-if="lens !== 'all'" class="sat-lenspill" @click="lens = 'all'">{{ lensLabel }} <X :size="11" /></span>
      <span class="sat-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="sat-grid">
      <div v-for="n in 8" :key="n" class="sat-card-skel" :style="{ '--i': n }"><span class="sat-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="Shapes" accent-color="var(--set-deep)"
      :title="hasFilter ? 'No types match' : 'No asset types yet'"
      :sub="hasFilter ? 'Try a different search or lens.' : 'Define the kinds of equipment your fleet holds.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New type</button>
    </SetEmptyState>
    <div v-else class="sat-grid">
      <AssetTypeCard v-for="(t, i) in visible" :key="t.id" :type="t" :index="i"
        @edit="openEdit" @delete="openDelete" @toggle="toggleActive" />
    </div>

    <AssetTypeModal :open="formOpen" :edit-target="editTarget" :saving="saving" @close="formOpen = false" @save="save" />
    <AssetTypeDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      @close="delOpen = false" @confirm="doDelete" @deactivate="doDeactivate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import {
  Shapes, RefreshCw, Plus, Power, PowerOff, Lock, Sparkles, Boxes, Share2, ExternalLink,
  Search, FilterX, X, Activity, ArrowRight, Crown, CircleSlash, Ghost,
} from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import TypeSpecimenTable from '../components/TypeSpecimenTable.vue'
import AssetTypeCard from '../components/AssetTypeCard.vue'
import AssetTypeModal from '../components/AssetTypeModal.vue'
import AssetTypeDeleteModal from '../components/AssetTypeDeleteModal.vue'
import { fetchAssetTypes, createAssetType, patchAssetType, deleteAssetType, errText } from '@/composables/useAssets'

const toast = useToast()
const router = useRouter()

const rows = ref([])
const loading = ref(false)
const q = ref('')
const lens = ref('all')

async function reload() {
  loading.value = true
  try { rows.value = await fetchAssetTypes() }
  catch (e) { toast.error(errText(e, 'Failed to load asset types')) }
  finally { loading.value = false }
}
onMounted(reload)

const countOf = (t) => Number(t.asset_count || 0)
const activeCount = computed(() => rows.value.filter(t => t.is_active !== false).length)
const systemCount = computed(() => rows.value.filter(t => t.is_system).length)
const classified = computed(() => rows.value.reduce((a, t) => a + countOf(t), 0))

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const LENS_LABELS = { active: 'Active', inactive: 'Inactive', system: 'Built-in', custom: 'Custom', unused: 'No assets yet' }
const lensLabel = computed(() => LENS_LABELS[lens.value] || '')
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(t => {
    if (lens.value === 'active' && t.is_active === false) return false
    if (lens.value === 'inactive' && t.is_active !== false) return false
    if (lens.value === 'system' && !t.is_system) return false
    if (lens.value === 'custom' && t.is_system) return false
    if (lens.value === 'unused' && countOf(t) > 0) return false
    if (term && ![t.label, t.code].some(v => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

// ── catalog intelligence ──
const insights = computed(() => {
  const out = []
  let dom = null, max = -1
  for (const t of rows.value) { const u = countOf(t); if (u > max) { max = u; dom = t } }
  if (dom && classified.value > 0) {
    out.push({ key: 'dom', icon: Crown, tone: 'gold', value: `${dom.label} · ${dom.asset_count}`, label: 'most-used asset kind', action: () => openEdit(dom) })
  } else {
    out.push({ key: 'dom', icon: Boxes, tone: 'warn', value: '0', label: 'no assets typed yet — register one to populate', action: () => router.push('/admin/hr/assets/inventory') })
  }
  const custom = rows.value.filter(t => !t.is_system).length
  out.push({ key: 'cust', icon: Sparkles, tone: 'gold', value: custom, label: custom ? `custom type${custom === 1 ? '' : 's'} you added beyond the built-ins` : 'using the built-in types only' })
  const unused = rows.value.filter(t => countOf(t) === 0).length
  out.push({ key: 'unused', icon: CircleSlash, tone: unused ? 'steel' : 'ok', value: unused, label: unused ? `type${unused === 1 ? '' : 's'} with no assets yet` : 'every type is in use', action: unused ? () => setLens('unused') : null })
  const ghost = rows.value.filter(t => t.is_active === false && countOf(t) > 0).reduce((a, t) => a + countOf(t), 0)
  out.push({ key: 'ghost', icon: Ghost, tone: ghost ? 'warn' : 'ok', value: ghost, label: ghost ? 'assets on a deactivated type — re-type them' : 'no live asset on a deactivated type', action: ghost ? () => setLens('inactive') : null })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (t) => { editTarget.value = t; formOpen.value = true }

async function save(form) {
  saving.value = true
  try {
    const payload = { label: form.label, code: form.code, icon: form.icon || null, is_active: form.is_active !== false }
    if (editTarget.value) await patchAssetType(editTarget.value.id, payload)
    else await createAssetType(payload)
    toast.success(editTarget.value ? 'Asset type updated' : 'Asset type created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save type')) }
  finally { saving.value = false }
}

async function toggleActive(t) {
  const next = t.is_active === false
  t.is_active = next
  try { await patchAssetType(t.id, { is_active: next }) }
  catch (e) { t.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (t) => { delTarget.value = t; delOpen.value = true }
async function doDelete() {
  deleting.value = true
  try {
    await deleteAssetType(delTarget.value.id)
    toast.success('Asset type removed')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Re-type the assets first, or deactivate instead')) }
  finally { deleting.value = false }
}
async function doDeactivate(t) {
  deleting.value = true
  try {
    await patchAssetType(t.id, { is_active: false })
    toast.success(`${t.label} deactivated — hidden from new registrations`)
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { deleting.value = false }
}
</script>

<style scoped>
.sat { display: flex; flex-direction: column; gap: 16px; }
.sat-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.sat-lenses .set-chip b { color: var(--set-text); }
.sat-stat { cursor: default; }

.sat-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.sat-powers > svg { color: var(--set-text-dim); }
.sat-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.sat-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.sat-mod:hover { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); transform: translateY(-1px); }
.sat-mod :deep(svg) { color: var(--set-deep); }
.sat-mod.alt { color: var(--set-text-muted); }
.sat-mod.alt :deep(svg) { color: var(--set-text-muted); }

.sat-hero { display: grid; grid-template-columns: 1.62fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 960px) { .sat-hero { grid-template-columns: 1fr; } }
.sat-table-wrap { min-width: 0; }
.sat-table-skel { position: relative; overflow: hidden; width: 100%; min-height: 372px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.sat-table-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 372px;
  border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); text-align: center; padding: 20px; }
.sat-table-empty :deep(svg) { color: var(--set-deep); }
.sat-table-empty p { margin: 0; font-size: 12.5px; max-width: 28ch; }

.sat-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.sat-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-deep); margin-bottom: 4px; }
.sat-insight-head :deep(svg) { color: var(--set-deep); }
.sat-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.sat-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.sat-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.sat-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.sat-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.sat-insight-ic[data-tone="steel"] { color: var(--set-text-secondary); background: var(--set-unset-soft); }
.sat-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.sat-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sat-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.sat-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.sat-insight-go:hover { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); transform: translateX(2px); }

.sat-bar { display: flex; align-items: center; gap: 12px; }
.sat-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.sat-search:focus-within { border-color: var(--set-border-warm); }
.sat-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.sat-lenspill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; cursor: pointer; padding: 5px 10px; border-radius: 999px;
  color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-deep) 32%, transparent); }
.sat-lenspill :deep(svg) { opacity: 0.8; }
.sat-count { font-size: 11px; color: var(--set-text-dim); }

.sat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 13px; }
@media (max-width: 480px) { .sat-grid { grid-template-columns: 1fr; } }
.sat-card-skel { position: relative; overflow: hidden; height: 150px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.sat-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(234,88,12,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) { .sat-insight-row, .sat-card-skel, .sat-skel-beam { animation: none; } }
</style>
