<template>
  <div class="rmb-cats" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="cs-atmos" aria-hidden="true">
      <span class="cs-orb o1" /><span class="cs-orb o2" /><span class="cs-orb o3" />
      <span class="cs-grid" /><span class="cs-scan" />
      <span class="rmb-spotlight" />
      <span class="rmb-grain" />
    </div>

    <!-- ── console header ── -->
    <Motion as="header" class="cs-head"
      :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <div class="cs-head-l">
        <span class="cs-eyebrow"><Tags :size="12" /> Taxonomy · live builder</span>
        <h2>Spend <span class="ink">buckets</span></h2>
        <span class="cs-meta rmb-mono">
          <span class="cs-live" />
          <RmbCountUp :value="categories.length" /> categor{{ categories.length === 1 ? 'y' : 'ies' }}
          <span class="cs-sep">·</span> <RmbCountUp :value="activeCount" /> live
          <span class="cs-sep">·</span> add fields, no code change
        </span>
      </div>
      <div class="cs-head-r">
        <span class="cs-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
        <button class="cs-refresh" :class="{ spin: refreshing }" @click="refresh" aria-label="Refresh categories"><RefreshCw :size="15" /></button>
        <Motion as="button" class="rmb-btn rmb-btn-primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="newCat">
          <Plus :size="15" /> New category
        </Motion>
      </div>
    </Motion>

    <!-- ── command rail ── -->
    <Motion as="div" class="cs-filters"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <div class="cs-search" :class="{ focused: searchFocus, filled: q }">
        <Search :size="15" class="cs-search-ic" />
        <input v-model="q" placeholder="Search name, code or description…"
               @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="cs-clear" @click="q = ''" aria-label="Clear search"><X :size="13" /></button>
      </div>

      <label class="cs-select">
        <ArrowDownWideNarrow :size="14" />
        <select v-model="sortBy">
          <option value="claims">Most claims</option>
          <option value="name">A — Z</option>
          <option value="fields">Most fields</option>
        </select>
        <ChevronDown :size="14" class="cs-select-arr" />
      </label>

      <div class="cs-chips" role="tablist" aria-label="State filter">
        <button class="cs-chip" :class="{ on: stateFilter === 'all' }" @click="stateFilter = 'all'">
          <span class="cs-chip-dot all" /> All
        </button>
        <button class="cs-chip live" :class="{ on: stateFilter === 'live' }" @click="stateFilter = 'live'">
          <span class="cs-chip-dot" /> Live
        </button>
        <button class="cs-chip off" :class="{ on: stateFilter === 'off' }" @click="stateFilter = 'off'">
          <span class="cs-chip-dot" /> Inactive
        </button>
      </div>
    </Motion>

    <!-- ── summary ribbon ── -->
    <Motion as="div" class="cs-summary"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
      <div class="cs-stat">
        <span class="cs-stat-ic"><Tags :size="14" /></span>
        <div><b class="rmb-mono"><RmbCountUp :value="categories.length" /></b><small>Categories</small></div>
      </div>
      <div class="cs-stat">
        <span class="cs-stat-ic ok"><Zap :size="14" /></span>
        <div><b class="rmb-mono"><RmbCountUp :value="activeCount" /></b><small>Live buckets</small></div>
      </div>
      <div class="cs-stat">
        <span class="cs-stat-ic violet"><ListTree :size="14" /></span>
        <div><b class="rmb-mono"><RmbCountUp :value="totalFields" /></b><small>Dynamic fields</small></div>
      </div>
      <div class="cs-stat">
        <span class="cs-stat-ic blue"><ScrollText :size="14" /></span>
        <div><b class="rmb-mono"><RmbCountUp :value="totalClaims" /></b><small>Claims governed</small></div>
      </div>
      <div class="cs-mix" :title="`Claim volume across ${categories.length} categories`">
        <div class="cs-mix-bar">
          <span v-if="!totalClaims" class="cs-mix-empty" />
          <span v-for="seg in claimMix" :key="seg.key" class="cs-mix-seg"
                :style="{ width: seg.pct + '%', background: seg.hex }" :title="`${seg.name}: ${seg.count}`" />
        </div>
        <div class="cs-mix-legend">
          <span v-for="seg in claimMix.slice(0, 5)" :key="seg.key" class="cs-mix-leg">
            <i :style="{ background: seg.hex }" />{{ seg.name }}
          </span>
          <span v-if="!totalClaims" class="cs-mix-leg muted">No claims booked yet</span>
        </div>
      </div>
    </Motion>

    <!-- ── grid ── -->
    <div class="cs-board rmb-ribbon">
      <div v-if="loading" class="cs-cards">
        <div v-for="i in 6" :key="i" class="rmb-skel card-skel"></div>
      </div>
      <div v-else-if="shownCategories.length" :key="gridSeq" class="cs-cards">
        <RmbCategoryCard v-for="(c, i) in shownCategories" :key="c.id" :category="c" :index="i"
                         @edit="edit" @remove="remove" />
      </div>
      <RmbEmptyState v-else :icon="Tags"
                     :title="categories.length ? 'No categories match' : 'No categories yet'"
                     :subtitle="categories.length ? 'Adjust the search or state filter above.' : 'Create your first spend bucket — define its dynamic fields once and every claim picks them up.'">
        <button v-if="hasFilters" class="rmb-btn rmb-btn-ghost" style="margin-top:14px" @click="resetFilters">
          <X :size="14" /> Clear filters
        </button>
        <Motion v-else as="button" class="rmb-btn rmb-btn-primary" style="margin-top:14px"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="newCat">
          <Plus :size="15" /> New category
        </Motion>
      </RmbEmptyState>
    </div>

    <CategoryEditModal v-if="modal" :category="editCat" @close="modal = false" @saved="load" />
    <CategoryDeleteModal v-if="delModal && delCat" :category="delCat" @close="delModal = false" @done="onDeleted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, Tags, Search, X, ChevronDown, RefreshCw, Zap, ListTree, ScrollText, ArrowDownWideNarrow,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchCategories, categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbCategoryCard from '../components/RmbCategoryCard.vue'
import RmbCountUp from '../components/RmbCountUp.vue'
import RmbEmptyState from '../components/RmbEmptyState.vue'
import CategoryEditModal from '../modals/CategoryEditModal.vue'
import CategoryDeleteModal from '../modals/CategoryDeleteModal.vue'

const toast = useToast()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const categories = ref([])
const loading = ref(false)
const refreshing = ref(false)
const modal = ref(false)
const editCat = ref(null)
const delModal = ref(false)
const delCat = ref(null)
const gridSeq = ref(0)

const q = ref('')
const searchFocus = ref(false)
const sortBy = ref('claims')
const stateFilter = ref('all')

const accent = (c) => c.color_hex || categoryMeta(c.code).hex

const activeCount = computed(() => categories.value.filter(c => c.is_active).length)
const totalFields = computed(() => categories.value.reduce((a, c) => a + (c.field_schema || []).length, 0))
const totalClaims = computed(() => categories.value.reduce((a, c) => a + (Number(c.claim_count) || 0), 0))

const claimMix = computed(() => {
  const tot = totalClaims.value || 1
  return categories.value
    .filter(c => (Number(c.claim_count) || 0) > 0)
    .map(c => ({ key: c.id, name: c.name, count: Number(c.claim_count) || 0, hex: accent(c) }))
    .sort((a, b) => b.count - a.count)
    .map(s => ({ ...s, pct: (s.count / tot) * 100 }))
})

const hasFilters = computed(() => !!q.value || stateFilter.value !== 'all')
const resetFilters = () => { q.value = ''; stateFilter.value = 'all'; bumpGrid() }

const shownCategories = computed(() => {
  let list = categories.value.slice()
  const term = q.value.trim().toLowerCase()
  if (term) {
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.code || '').toLowerCase().includes(term) ||
      (c.description || '').toLowerCase().includes(term))
  }
  if (stateFilter.value === 'live') list = list.filter(c => c.is_active)
  else if (stateFilter.value === 'off') list = list.filter(c => !c.is_active)
  if (sortBy.value === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  else if (sortBy.value === 'fields') list.sort((a, b) => (b.field_schema || []).length - (a.field_schema || []).length)
  else list.sort((a, b) => (Number(b.claim_count) || 0) - (Number(a.claim_count) || 0))
  return list
})

const bumpGrid = () => { gridSeq.value++ }

async function load() {
  loading.value = true
  try { categories.value = (await fetchCategories(true)).items || []; bumpGrid() }
  catch { toast.error('Failed to load categories') }
  finally { loading.value = false }
}
function refresh() {
  refreshing.value = true
  load().finally(() => setTimeout(() => { refreshing.value = false }, 700))
}
function newCat() { editCat.value = null; modal.value = true }
function edit(c) { editCat.value = c; modal.value = true }
function remove(c) { delCat.value = c; delModal.value = true }
function onDeleted() { delModal.value = false; load() }
onMounted(load)
</script>

<style scoped>
.rmb-cats { position: relative; display: flex; flex-direction: column; gap: 16px; }
.rmb-cats > :not(.cs-atmos) { position: relative; z-index: 1; }

/* ── backdrop ── */
.cs-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.cs-orb { position: absolute; border-radius: 50%; filter: blur(66px); }
.cs-orb.o1 { width: 360px; height: 360px; top: -120px; left: -40px; opacity: 0.16;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: cs-drift 24s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -28px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.cs-orb.o2 { width: 320px; height: 320px; bottom: -130px; right: 8%; opacity: 0.13;
  background: radial-gradient(circle, rgba(192,132,252,0.85), transparent 70%); animation: cs-drift 29s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 24px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.cs-orb.o3 { width: 280px; height: 280px; top: 24%; right: -60px; opacity: 0.1;
  background: radial-gradient(circle, rgba(45,212,191,0.8), transparent 70%); animation: cs-drift 34s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 14px), calc((var(--my,0.5) - 0.5) * -12px), 0); }
.cs-grid { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.cs-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.035), transparent); }

/* ── header ── */
.cs-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.cs-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--rmb-st-returned); }
.cs-head h2 { margin: 4px 0 5px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--rmb-text); }
.cs-head h2 .ink { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cs-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); flex-wrap: wrap; }
.cs-live { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.cs-sep { opacity: 0.5; }
.cs-head-r { display: flex; align-items: center; gap: 10px; }
.cs-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.cs-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--rmb-amber-bright), var(--rmb-amber-strong)); animation: cs-eq 1.1s ease-in-out infinite; }
.cs-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.cs-refresh:hover { color: var(--rmb-amber); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.cs-refresh.spin :deep(svg) { animation: cs-spin 0.8s var(--rmb-ease); }

/* ── filters ── */
.cs-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.cs-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px; position: relative;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); border-radius: 12px; padding: 0 12px;
  color: var(--rmb-text-muted); transition: border-color 0.25s, box-shadow 0.25s, background 0.25s; }
.cs-search.focused { border-color: color-mix(in srgb, var(--rmb-amber) 55%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--rmb-amber) 12%, transparent); background: var(--rmb-surface-elevated); }
.cs-search-ic { flex: 0 0 auto; transition: color 0.25s, transform 0.25s; }
.cs-search.focused .cs-search-ic { color: var(--rmb-amber); transform: scale(1.08); }
.cs-search input { flex: 1; background: none; border: none; outline: none; padding: 11px 0; color: var(--rmb-text); font-size: 13px; }
.cs-clear { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer;
  background: var(--rmb-surface-elevated); border: none; color: var(--rmb-text-muted); transition: 0.2s; }
.cs-clear:hover { color: var(--rmb-st-rejected); }

.cs-select { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 0 10px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); border-radius: 12px; color: var(--rmb-text-muted);
  transition: border-color 0.25s; }
.cs-select:hover { border-color: var(--rmb-border-strong); }
.cs-select select { appearance: none; background: none; border: none; outline: none; cursor: pointer;
  padding: 11px 20px 11px 0; color: var(--rmb-text); font-size: 13px; }
.cs-select-arr { position: absolute; right: 10px; pointer-events: none; }

.cs-chips { display: inline-flex; gap: 6px; }
.cs-chip { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 600; white-space: nowrap; color: var(--rmb-text-secondary);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.25s var(--rmb-spring); --chip: var(--rmb-amber); }
.cs-chip.live { --chip: var(--rmb-st-approved); }
.cs-chip.off { --chip: var(--rmb-st-cancelled); }
.cs-chip:hover { border-color: var(--rmb-border-strong); transform: translateY(-1px); }
.cs-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--chip); flex: 0 0 auto; box-shadow: 0 0 7px -1px var(--chip); }
.cs-chip-dot.all { background: linear-gradient(135deg, var(--rmb-amber), var(--rmb-st-settled)); box-shadow: none; }
.cs-chip.on { color: var(--chip); background: color-mix(in srgb, var(--chip) 14%, transparent);
  border-color: color-mix(in srgb, var(--chip) 50%, transparent); }
.cs-chip.on .cs-chip-dot { animation: rmb-pulse-dot 1.8s ease-in-out infinite; }

/* ── summary ribbon ── */
.cs-summary { display: flex; align-items: center; gap: 18px; padding: 13px 18px; border-radius: 14px; flex-wrap: wrap;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.cs-stat { display: flex; align-items: center; gap: 10px; }
.cs-stat-ic { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; flex: 0 0 auto;
  background: var(--rmb-st-pending-soft); color: var(--rmb-st-pending); }
.cs-stat-ic.ok { background: var(--rmb-st-approved-soft); color: var(--rmb-st-approved); }
.cs-stat-ic.violet { background: var(--rmb-st-finance-soft); color: var(--rmb-st-finance); }
.cs-stat-ic.blue { background: var(--rmb-st-submitted-soft); color: var(--rmb-st-submitted); }
.cs-stat div { display: flex; flex-direction: column; line-height: 1.1; }
.cs-stat b { font-size: 19px; font-weight: 800; color: var(--rmb-text); }
.cs-stat small { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--rmb-text-muted); }
.cs-mix { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 7px; }
.cs-mix-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: var(--rmb-surface);
  border: 1px solid var(--rmb-border-soft); }
.cs-mix-seg { height: 100%; transition: width 0.8s var(--rmb-spring); min-width: 2px; }
.cs-mix-empty { flex: 1; background: repeating-linear-gradient(90deg, var(--rmb-border-soft) 0 6px, transparent 6px 12px); }
.cs-mix-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.cs-mix-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--rmb-text-muted); }
.cs-mix-leg.muted { font-style: italic; }
.cs-mix-leg i { width: 7px; height: 7px; border-radius: 2px; }

/* ── board / grid ── */
.cs-board { border-radius: 16px; padding: 16px; border: 1px solid var(--rmb-border-soft); min-height: 180px; }
.cs-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card-skel { height: 200px; }

/* ── keyframes ── */
@keyframes cs-drift { 0%, 100% { translate: 0 0; } 50% { translate: 40px 30px; } }
@keyframes cs-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes cs-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* ── light theme ── */
:root[data-theme="light"] .cs-orb.o1 { opacity: 0.12; }
:root[data-theme="light"] .cs-orb.o2 { opacity: 0.1; }
:root[data-theme="light"] .cs-orb.o3 { opacity: 0.08; }

@media (prefers-reduced-motion: reduce) {
  .cs-orb, .cs-eq i, .cs-live { animation: none !important; }
  .cs-orb { transform: none !important; }
}
@media (max-width: 620px) {
  .cs-head { flex-direction: column; }
  .cs-head h2 { font-size: 22px; }
  .cs-filters { flex-direction: column; align-items: stretch; }
  .cs-chips { flex-wrap: wrap; }
}
</style>
