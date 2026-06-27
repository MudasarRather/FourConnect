<template>
  <div class="sac">
    <SetSectionHead eyebrow="Modules · Assets" title="Asset" accent="Categories"
      accent-color="var(--set-ember)" :icon="Boxes"
      sub="The asset taxonomy — every class an asset can belong to, and the depreciation clock it inherits. Nest classes into a tree, set straight-line useful life (or mark a class permanent), and the Assets module reads it on every registration, valuation and category report. Tune the cellar here; the fleet reads it live.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New class
        </Motion>
      </template>

      <template #lenses>
        <div class="sac-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-ember)" @click="lens = 'all'">
            <Boxes :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'active' }" style="--acc: var(--set-ok)" @click="setLens('active')">
            <Power :size="12" /> Active <b>{{ activeCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'inactive' }" style="--acc: var(--set-unset)" @click="setLens('inactive')">
            <PowerOff :size="12" /> Inactive <b>{{ rows.length - activeCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'depreciating' }" style="--acc: var(--set-gold)" @click="setLens('depreciating')">
            <TrendingDown :size="12" /> Depreciating <b>{{ depreciatingCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'permanent' }" style="--acc: var(--set-ok)" @click="setLens('permanent')">
            <Infinity :size="12" /> Permanent <b>{{ rows.length - depreciatingCount }}</b>
          </button>
          <span class="set-chip sac-stat"><Boxes :size="12" /> {{ classified }} asset{{ classified === 1 ? '' : 's' }} classified</span>
          <span v-if="avgLife" class="set-chip sac-stat"><CalendarClock :size="12" /> {{ avgLife }} mo avg life</span>
        </div>
      </template>

      <div class="sac-powers">
        <Share2 :size="12" /><span class="sac-powers-lab">Powers</span>
        <button class="sac-mod" @click="$router.push('/admin/hr/assets/dashboard')"><Boxes :size="12" /> Assets</button>
        <button class="sac-mod alt" @click="$router.push('/admin/hr/assets/categories')"><ExternalLink :size="12" /> Full taxonomy atlas</button>
        <button class="sac-mod alt" @click="$router.push('/admin/hr/assets/inventory')"><ExternalLink :size="12" /> Fleet inventory</button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + depreciation intelligence -->
    <div class="sac-hero">
      <Motion as="div" class="sac-cellar-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="sac-cellar-skel"><span class="sac-skel-beam" /></div>
        <LifespanColumns v-else-if="rows.length" :categories="rows" @select="openEdit" />
        <div v-else class="sac-cellar-empty"><Boxes :size="26" /><p>No asset classes yet — define how your fleet is grouped and depreciated.</p></div>
      </Motion>

      <Motion as="aside" class="sac-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="sac-insight-head"><Activity :size="14" /> Depreciation intelligence</header>
        <div class="sac-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="sac-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="sac-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="sac-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="sac-bar">
      <div class="sac-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search classes, codes…" />
      </div>
      <span v-if="lens !== 'all'" class="sac-lenspill" @click="lens = 'all'">{{ lensLabel }} <X :size="11" /></span>
      <span class="sac-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="sac-grid">
      <div v-for="n in 6" :key="n" class="sac-card-skel" :style="{ '--i': n }"><span class="sac-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="Boxes" accent-color="var(--set-ember)"
      :title="hasFilter ? 'No classes match' : 'No asset categories yet'"
      :sub="hasFilter ? 'Try a different search or lens.' : 'Categories group assets and drive depreciation + useful-life across the fleet.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New class</button>
    </SetEmptyState>
    <div v-else class="sac-grid">
      <AssetCategoryCard v-for="(c, i) in visible" :key="c.id" :category="c" :index="i"
        :parent="parentOf(c)" :max-count="maxCount"
        @edit="openEdit" @delete="openDelete" @toggle="toggleActive" @view="viewAssets" />
    </div>

    <AssetCategoryModal :open="formOpen" :edit-target="editTarget" :categories="rows" :saving="saving"
      @close="formOpen = false" @save="save" />
    <AssetCategoryDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      @close="delOpen = false" @confirm="doDelete" @deactivate="doDeactivate" @view-assets="viewAssets" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import {
  Boxes, RefreshCw, Plus, Power, PowerOff, TrendingDown, Infinity, CalendarClock,
  Share2, ExternalLink, Search, FilterX, X, Activity, ArrowRight,
  Crown, Gauge, GitBranch, Lock, Sparkles,
} from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import LifespanColumns from '../components/LifespanColumns.vue'
import AssetCategoryCard from '../components/AssetCategoryCard.vue'
import AssetCategoryModal from '../components/AssetCategoryModal.vue'
import AssetCategoryDeleteModal from '../components/AssetCategoryDeleteModal.vue'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'

const BASE = 'asset-categories'
const toast = useToast()
const router = useRouter()

const rows = ref([])
const loading = ref(false)
const q = ref('')
const lens = ref('all')

async function reload() {
  loading.value = true
  try {
    rows.value = await listMaster(BASE, { limit: 200 })
  } catch (e) {
    toast.error(errText(e, 'Failed to load asset categories'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const isPermanent = (c) => c.depreciation_method === 'NONE' || (!c.depreciation_method && !c.useful_life_months)
const countOf = (c) => Number(c.asset_count || 0)
const activeCount = computed(() => rows.value.filter((c) => c.is_active !== false).length)
const depreciatingCount = computed(() => rows.value.filter((c) => !isPermanent(c)).length)
const classified = computed(() => rows.value.reduce((a, c) => a + countOf(c), 0))
const maxCount = computed(() => Math.max(1, ...rows.value.map(countOf)))
const avgLife = computed(() => {
  const lives = rows.value.map((c) => Number(c.useful_life_months || 0)).filter((m) => m > 0)
  return lives.length ? Math.round(lives.reduce((a, b) => a + b, 0) / lives.length) : 0
})
const byId = computed(() => Object.fromEntries(rows.value.map((c) => [c.id, c])))
const parentOf = (c) => (c.parent_category_id ? byId.value[c.parent_category_id] || { name: 'removed parent', is_active: false } : null)
const isOrphan = (c) => {
  if (!c.parent_category_id) return false
  const p = byId.value[c.parent_category_id]
  return !p || p.is_active === false
}
const isGap = (c) => c.is_active !== false && c.depreciation_method === 'STRAIGHT_LINE' && !c.useful_life_months

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const LENS_LABELS = { active: 'Active', inactive: 'Inactive', depreciating: 'Depreciating', permanent: 'Permanent', gaps: 'Missing useful-life', orphans: 'Orphaned classes' }
const lensLabel = computed(() => LENS_LABELS[lens.value] || '')
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter((c) => {
    if (lens.value === 'active' && c.is_active === false) return false
    if (lens.value === 'inactive' && c.is_active !== false) return false
    if (lens.value === 'depreciating' && isPermanent(c)) return false
    if (lens.value === 'permanent' && !isPermanent(c)) return false
    if (lens.value === 'gaps' && !isGap(c)) return false
    if (lens.value === 'orphans' && !isOrphan(c)) return false
    if (term && ![c.name, c.code, c.description].some((v) => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

// ── depreciation intelligence ──
const insights = computed(() => {
  const out = []
  // dominant class
  let dom = null, max = -1
  for (const c of rows.value) { const u = countOf(c); if (u > max) { max = u; dom = c } }
  if (dom && classified.value > 0) {
    out.push({ key: 'dom', icon: Crown, tone: 'gold', value: `${dom.name} · ${Math.round((countOf(dom) / classified.value) * 100)}%`, label: 'largest asset class by population', action: () => viewAssets(dom) })
  } else {
    out.push({ key: 'dom', icon: Boxes, tone: 'warn', value: '0', label: 'no assets classified yet — assign a class when registering assets', action: () => router.push('/admin/hr/assets/inventory') })
  }
  // config gap — depreciating classes with no useful life (the loophole now fixable here)
  const gaps = rows.value.filter(isGap).length
  out.push({ key: 'gap', icon: Gauge, tone: gaps ? 'warn' : 'ok', value: gaps,
    label: gaps ? 'straight-line classes with no useful-life set — depreciation can’t compute' : 'every depreciating class has a useful-life set',
    action: gaps ? () => setLens('gaps') : null })
  // permanent classes
  const perm = rows.value.length - depreciatingCount.value
  out.push({ key: 'perm', icon: Infinity, tone: 'ok', value: perm,
    label: perm ? `permanent class${perm === 1 ? '' : 'es'} — never depreciate` : 'no permanent classes — all depreciate',
    action: perm ? () => setLens('permanent') : null })
  // orphan watch
  const orphans = rows.value.filter(isOrphan).length
  out.push({ key: 'orphan', icon: GitBranch, tone: orphans ? 'warn' : 'ok', value: orphans,
    label: orphans ? `sub-class${orphans === 1 ? '' : 'es'} under an inactive/removed parent` : 'no orphaned sub-classes',
    action: orphans ? () => setLens('orphans') : null })
  // protected (hold assets, can't delete)
  const locked = rows.value.filter((c) => countOf(c) > 0).length
  out.push({ key: 'lock', icon: locked ? Lock : Sparkles, tone: 'steel', value: locked,
    label: locked ? `class${locked === 1 ? '' : 'es'} hold assets — protected from deletion` : 'no class is holding assets yet' })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (c) => { editTarget.value = c; formOpen.value = true }

function buildPayload(form) {
  const permanent = form.depreciation_method === 'NONE'
  const allowed = Array.isArray(form.allowed_asset_types) ? form.allowed_asset_types.filter(Boolean) : []
  return {
    name: form.name, code: form.code,
    parent_category_id: form.parent_category_id || null,
    allowed_asset_types: allowed.length ? allowed : null,
    // default pre-fill = first allowed type (kept in sync so the register form pre-selects it)
    default_asset_type: allowed.length ? allowed[0] : null,
    depreciation_method: form.depreciation_method || null,
    useful_life_months: permanent ? null : (form.useful_life_months === '' || form.useful_life_months == null ? null : Number(form.useful_life_months)),
    is_active: form.is_active !== false,
    description: form.description || null,
  }
}
async function save(form) {
  saving.value = true
  try {
    const payload = buildPayload(form)
    if (editTarget.value) await updateMaster(BASE, editTarget.value.id, payload)
    else await createMaster(BASE, payload)
    toast.success(editTarget.value ? 'Asset class updated' : 'Asset class created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save class')) }
  finally { saving.value = false }
}

async function toggleActive(c) {
  const next = c.is_active === false
  c.is_active = next
  try { await updateMaster(BASE, c.id, { is_active: next }) }
  catch (e) { c.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

// ── delete + deactivate ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (c) => { delTarget.value = c; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteMaster(BASE, delTarget.value.id, reason)
    toast.success('Asset class removed')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Re-categorise the assets first, or deactivate instead')) }
  finally { deleting.value = false }
}
async function doDeactivate(c) {
  deleting.value = true
  try {
    await updateMaster(BASE, c.id, { is_active: false })
    toast.success(`${c.name} deactivated — hidden from new asset registrations`)
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { deleting.value = false }
}

// ── connectivity ──
const viewAssets = (c) => router.push({ path: '/admin/hr/assets/inventory', query: { category_id: c.id, categoryLabel: c.name } })
</script>

<style scoped>
.sac { display: flex; flex-direction: column; gap: 16px; }
.sac-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.sac-lenses .set-chip b { color: var(--set-text); }
.sac-stat { cursor: default; }

.sac-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.sac-powers > svg { color: var(--set-text-dim); }
.sac-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.sac-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.sac-mod:hover { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 36%, transparent); transform: translateY(-1px); }
.sac-mod :deep(svg) { color: var(--set-ember); }
.sac-mod.alt { color: var(--set-text-muted); }
.sac-mod.alt :deep(svg) { color: var(--set-text-muted); }

.sac-hero { display: grid; grid-template-columns: 1.62fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 960px) { .sac-hero { grid-template-columns: 1fr; } }
.sac-cellar-wrap { min-width: 0; }
.sac-cellar-skel { position: relative; overflow: hidden; width: 100%; min-height: 392px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.sac-cellar-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 392px;
  border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); text-align: center; padding: 20px; }
.sac-cellar-empty :deep(svg) { color: var(--set-ember); }
.sac-cellar-empty p { margin: 0; font-size: 12.5px; max-width: 28ch; }

.sac-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.sac-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-ember); margin-bottom: 4px; }
.sac-insight-head :deep(svg) { color: var(--set-ember); }
.sac-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.sac-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.sac-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.sac-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.sac-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.sac-insight-ic[data-tone="steel"] { color: var(--set-text-secondary); background: var(--set-unset-soft); }
.sac-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.sac-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sac-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.sac-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.sac-insight-go:hover { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 36%, transparent); transform: translateX(2px); }

.sac-bar { display: flex; align-items: center; gap: 12px; }
.sac-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.sac-search:focus-within { border-color: var(--set-border-warm); }
.sac-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.sac-lenspill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; cursor: pointer; padding: 5px 10px; border-radius: 999px;
  color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 32%, transparent); }
.sac-lenspill :deep(svg) { opacity: 0.8; }
.sac-count { font-size: 11px; color: var(--set-text-dim); }

.sac-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(322px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .sac-grid { grid-template-columns: 1fr; } }
.sac-card-skel { position: relative; overflow: hidden; height: 168px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.sac-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(217,119,6,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .sac-insight-row, .sac-card-skel, .sac-skel-beam { animation: none; }
}
</style>
