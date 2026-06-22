<template>
  <div class="cat">
    <!-- ══ Console hero — "Concourse Atlas" ══ -->
    <Motion as="section" class="cat-hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <Compass class="hero-motif" :size="240" aria-hidden="true" />

      <div class="hero-top">
        <div class="hero-lead">
          <span class="hero-eyebrow"><Tags :size="13" /> Travel · Master data</span>
          <h1 class="hero-title">Concourse <span class="grad">Atlas</span></h1>
          <p class="hero-sub">The master taxonomy that classifies, themes and shapes every tour — each category is a gate, fully configurable down to the fields a traveller fills.</p>
        </div>
        <div class="hero-cta">
          <Motion as="button" type="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openNew">
            <Plus :size="16" /> New category
          </Motion>
          <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="load">
            <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
          </Motion>
        </div>
      </div>

      <CategoryConcourse :categories="cats" @pick="focusCard" />

      <div class="hero-lenses">
        <button class="lens" :class="{ on: lens === 'all' }" @click="lens = 'all'">
          <Layers :size="13" /> <span>All gates</span> <b><TrvCountUp :value="cats.length" /></b>
        </button>
        <button class="lens" :class="{ on: lens === 'active' }" style="--c:#34d399" @click="lens = 'active'">
          <CircleDot :size="13" /> <span>Active</span> <b><TrvCountUp :value="counts.active" /></b>
        </button>
        <button class="lens" :class="{ on: lens === 'inactive' }" style="--c:#9ca3af" @click="lens = 'inactive'">
          <Ban :size="13" /> <span>Inactive</span> <b><TrvCountUp :value="counts.inactive" /></b>
        </button>
        <button class="lens" :class="{ on: lens === 'configured' }" style="--c:#fb923c" @click="lens = 'configured'">
          <SlidersHorizontal :size="13" /> <span>With fields</span> <b><TrvCountUp :value="counts.configured" /></b>
        </button>
        <div class="lens stat" style="--c:#fbbf24">
          <Ticket :size="13" /> <span>Tours classified</span> <b><TrvCountUp :value="totalTours" /></b>
        </div>
      </div>
    </Motion>

    <!-- ══ Command bar ══ -->
    <div class="cat-bar">
      <div class="search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="q" placeholder="Search category, code or description…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="search-x" @click="q = ''"><X :size="13" /></button>
      </div>
      <TrvSelect v-model="sortMode" :options="sortOpts" class="bar-sel" />
      <span v-if="filtered.length" class="bar-count">{{ filtered.length }} of {{ cats.length }}</span>
    </div>

    <!-- ══ Grid ══ -->
    <div v-if="loading" class="grid"><div v-for="n in 8" :key="n" class="skel" /></div>

    <div v-else-if="filtered.length" class="grid">
      <div v-for="(c, i) in filtered" :key="c.id" class="cell" :class="{ flash: flashId === c.id }" :ref="el => setCell(c.id, el)">
        <CategoryGateCard :cat="c" :index="i" :total="totalTours" :toggling="togglingId === c.id"
          @edit="openEdit" @remove="askRemove" @toggle="toggleActive" @view="viewTours" />
      </div>
    </div>

    <TrvEmptyState v-else :icon="Tags"
      :title="cats.length ? 'No gates match' : 'No categories yet'"
      :subtitle="cats.length ? 'Try a different filter or clear the search.' : 'Add travel categories like Client Visit, Audit or Conference to start the concourse.'"
      :cta="cats.length ? 'Clear filters' : 'New category'" :cta-icon="cats.length ? X : Plus"
      @cta="cats.length ? resetFilters() : openNew()" />

    <!-- ══ Modals ══ -->
    <CategoryModal :open="modalOpen" :category="editTarget" @close="modalOpen = false" @saved="load" />
    <TrvDeleteModal :open="confirmOpen" :loading="deleting" entity-label="category"
      :name="deleteTarget?.name" :meta="deleteTarget?.code" :icon="delIcon" :accent="deleteTarget?.color_hex || '#fbbf24'"
      :tags="delTags" :locked="delInUse" :lock-note="delLockNote" :reasons="CAT_REASONS"
      :deactivate-consequences="delDeactivateCons" :delete-consequences="delDeleteCons"
      deactivate-hint="Hide it, keep all config. Reversible." delete-hint="Erase the gate and its fields. Permanent."
      @close="confirmOpen = false" @confirm="doRemove" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Tags, Plus, RefreshCw, Layers, CircleDot, Ban, SlidersHorizontal, Ticket,
  Search, X, Compass, Archive, Undo2, Trash2, ShieldAlert,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import CategoryConcourse from '../components/CategoryConcourse.vue'
import CategoryGateCard from '../components/CategoryGateCard.vue'
import CategoryModal from '../modals/CategoryModal.vue'
import TrvDeleteModal from '../modals/TrvDeleteModal.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvSelect from '../components/TrvSelect.vue'
import { errText, fetchCategories, updateCategory, deleteCategory, categoryIcon } from '@/composables/useTravel'

const emit = defineEmits(['go'])
const toast = useToast()

const cats = ref([])
const loading = ref(false)
const lens = ref('all')
const q = ref('')
const searchFocus = ref(false)
const sortMode = ref('order')
const sortOpts = [
  { value: 'order', label: 'Sort · Concourse order' },
  { value: 'tours', label: 'Sort · Busiest gates' },
  { value: 'name', label: 'Sort · A → Z' },
]

const modalOpen = ref(false)
const editTarget = ref(null)
const confirmOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const togglingId = ref(null)
const flashId = ref(null)
const cellRefs = reactive({})

const load = async () => {
  loading.value = true
  try { cats.value = (await fetchCategories({ include_inactive: true })).items || [] }
  catch (e) { toast.error(errText(e)) } finally { loading.value = false }
}

const totalTours = computed(() => cats.value.reduce((a, c) => a + (Number(c.request_count) || 0), 0))
const counts = computed(() => ({
  active: cats.value.filter(c => c.is_active).length,
  inactive: cats.value.filter(c => !c.is_active).length,
  configured: cats.value.filter(c => (c.field_schema || []).length > 0).length,
}))

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  let list = cats.value.filter(c => {
    if (lens.value === 'active' && !c.is_active) return false
    if (lens.value === 'inactive' && c.is_active) return false
    if (lens.value === 'configured' && !(c.field_schema || []).length) return false
    if (term && !`${c.name} ${c.code} ${c.description || ''}`.toLowerCase().includes(term)) return false
    return true
  })
  const ord = (c) => { const n = parseInt(c.sort_order, 10); return Number.isFinite(n) ? n : 9999 }
  if (sortMode.value === 'tours') list = [...list].sort((a, b) => (b.request_count || 0) - (a.request_count || 0) || a.name.localeCompare(b.name))
  else if (sortMode.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  else list = [...list].sort((a, b) => ord(a) - ord(b) || a.name.localeCompare(b.name))
  return list
})

const resetFilters = () => { lens.value = 'all'; q.value = '' }

const openNew = () => { editTarget.value = null; modalOpen.value = true }
const openEdit = (c) => { editTarget.value = c; modalOpen.value = true }

const setCell = (id, el) => { if (el) cellRefs[id] = el; else delete cellRefs[id] }
const focusCard = (id) => {
  lens.value = 'all'; q.value = ''
  requestAnimationFrame(() => {
    const el = cellRefs[id]
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    flashId.value = id
    setTimeout(() => { if (flashId.value === id) flashId.value = null }, 1700)
  })
}

const toggleActive = async (c) => {
  if (togglingId.value) return
  togglingId.value = c.id
  const next = !c.is_active
  try { await updateCategory(c.id, { is_active: next }); c.is_active = next; toast.success(next ? `${c.name} is live` : `${c.name} hidden`) }
  catch (e) { toast.error(errText(e)) } finally { togglingId.value = null }
}

const CAT_REASONS = ['Duplicate gate', 'No longer offered', 'Created by mistake', 'Merged elsewhere', 'Policy change', 'Other']
const askRemove = (c) => { deleteTarget.value = c; confirmOpen.value = true }

const delTours = computed(() => Number(deleteTarget.value?.request_count) || 0)
const delInUse = computed(() => delTours.value > 0)
const delFieldCount = computed(() => (deleteTarget.value?.field_schema || []).length)
const delIcon = computed(() => categoryIcon(deleteTarget.value?.icon))
const delTags = computed(() => deleteTarget.value
  ? [{ icon: Ticket, text: `${delTours.value} tour${delTours.value === 1 ? '' : 's'}`, hot: delInUse.value }] : [])
const delLockNote = computed(() =>
  `${delTours.value} tour${delTours.value === 1 ? '' : 's'} reference this gate — it can't be erased, only deactivated so existing journeys stay intact.`)
const delDeactivateCons = [
  { icon: Ban, text: 'Hidden from the concourse and the new-request form immediately.' },
  { icon: Archive, text: 'All settings, custom fields and history are kept on file.' },
  { icon: Undo2, text: 'Re-activate any time from the gate card to bring it back.' },
]
const delDeleteCons = computed(() => [
  { icon: Trash2, text: 'Permanently removed from the taxonomy — no recovery.' },
  delFieldCount.value
    ? { icon: SlidersHorizontal, text: `Its ${delFieldCount.value} custom request field${delFieldCount.value === 1 ? '' : 's'} configuration is lost.` }
    : { icon: SlidersHorizontal, text: 'No custom fields are attached, so nothing else is affected.' },
  { icon: ShieldAlert, text: 'A delete entry with your reason is written to the audit log.' },
])

const doRemove = async ({ mode, reason } = {}) => {
  const c = deleteTarget.value
  if (!c) return
  deleting.value = true
  try {
    const res = await deleteCategory(c.id, { reason, deactivate: mode === 'deactivate' })
    if (res?.deactivated) toast.info(`${c.name} deactivated & hidden`)
    else toast.success(`${c.name} deleted permanently`)
    confirmOpen.value = false
    await load()
  } catch (e) { toast.error(errText(e)) } finally { deleting.value = false }
}

const viewTours = (c) => emit('go', { tab: 'requests', filter: { category_id: c.id } })

onMounted(load)
</script>

<style scoped>
.cat { display: flex; flex-direction: column; gap: 16px; }

/* ── hero ── */
.cat-hero { position: relative; overflow: hidden; isolation: isolate; padding: 22px 24px; border-radius: 22px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.hero-aura { position: absolute; inset: -50% 40% 30% -10%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }
.hero-motif { position: absolute; top: -56px; right: -46px; color: var(--trv-amber); opacity: 0.05; z-index: 0;
  animation: cat-spin 90s linear infinite; }
@keyframes cat-spin { to { transform: rotate(360deg); } }
.hero-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 4px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-title { font-size: clamp(22px, 3vw, 30px); font-weight: 830; margin: 11px 0 5px; color: var(--trv-text); line-height: 1.08; }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 13px; color: var(--trv-text-secondary); margin: 0; max-width: 560px; line-height: 1.5; }
.hero-cta { display: flex; gap: 9px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.spin { animation: cat-spin-fast 0.9s linear infinite; }
@keyframes cat-spin-fast { to { transform: rotate(360deg); } }

.hero-lenses { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
.lens { --c: var(--trv-amber); display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 12px; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border);
  position: relative; overflow: hidden; transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.lens::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--trv-spring); }
.lens:hover { transform: translateY(-2px); color: var(--trv-text); }
.lens.on { color: var(--trv-text); border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
.lens.on::after { transform: scaleX(1); }
.lens b { font-weight: 800; color: var(--c); font-variant-numeric: tabular-nums; }
.lens :deep(svg) { color: var(--c); }
.lens.stat { cursor: default; }
.lens.stat:hover { transform: none; }

/* ── command bar ── */
.cat-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; padding: 9px 12px; border-radius: 12px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: border-color 0.2s, box-shadow 0.2s; }
.search.focus { border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }
.search input { flex: 1; background: none; border: none; outline: none; color: var(--trv-text); font-size: 13px; font-family: inherit; }
.search input::placeholder { color: var(--trv-text-dim); }
.search-x { display: grid; place-items: center; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; }
.bar-sel { width: 220px; }
.bar-count { font-size: 11.5px; color: var(--trv-text-muted); margin-left: auto; }

/* ── grid ── */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(266px, 1fr)); gap: 14px; }
.cell { border-radius: 18px; transition: box-shadow 0.4s; }
.cell.flash { box-shadow: 0 0 0 2px var(--trv-amber), 0 0 30px -4px rgba(251,191,36,0.6); animation: cat-flash 1.7s ease-out; }
@keyframes cat-flash { 0% { box-shadow: 0 0 0 3px var(--trv-amber), 0 0 40px -2px rgba(251,191,36,0.8); } 100% { box-shadow: 0 0 0 0 transparent; } }
.skel { height: 184px; border-radius: 18px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .hero-aura, .hero-motif, .skel, .cell.flash { animation: none !important; }
}
</style>
