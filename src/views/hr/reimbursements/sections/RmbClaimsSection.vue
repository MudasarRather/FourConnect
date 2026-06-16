<template>
  <div class="rmb-claims" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="rc-atmos" aria-hidden="true">
      <span class="rc-orb o1" /><span class="rc-orb o2" />
      <span class="rc-grid" /><span class="rc-scan" />
      <span class="rmb-spotlight" />
      <span class="rmb-grain" />
    </div>

    <!-- ── console header ── -->
    <Motion as="header" class="rc-head"
      :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <div class="rc-head-l">
        <span class="rc-eyebrow"><ScrollText :size="12" /> Ledger · live feed</span>
        <h2>Claims <span class="ink">feed</span></h2>
        <span class="rc-meta rmb-mono">
          <span class="rc-live" />
          <RmbCountUp :value="total" /> claim{{ total === 1 ? '' : 's' }} on the tape
          <span class="rc-sep">·</span> page {{ filters.page }} / {{ totalPages }}
        </span>
      </div>
      <div class="rc-head-r">
        <span class="rc-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
        <button class="rc-refresh" :class="{ spin: refreshing }" @click="refresh" aria-label="Refresh ledger"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ── filter command rail ── -->
    <Motion as="div" class="rc-filters"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <div class="rc-search" :class="{ focused: searchFocus, filled: q }">
        <Search :size="15" class="rc-search-ic" />
        <input v-model="q" placeholder="Search claim #, vendor, notes…"
               @focus="searchFocus = true" @blur="searchFocus = false"
               @keyup.enter="applyFilters" @input="onSearchInput" />
        <button v-if="q" class="rc-clear" @click="clearSearch" aria-label="Clear search"><X :size="13" /></button>
      </div>

      <label class="rc-select">
        <Tags :size="14" />
        <select v-model="category_id" @change="applyFilters">
          <option :value="null">All categories</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <ChevronDown :size="14" class="rc-select-arr" />
      </label>

      <div class="rc-view" role="tablist" aria-label="View mode">
        <span class="rc-view-pill" :style="{ transform: `translateX(${view === 'grid' ? '100%' : '0'})` }" aria-hidden="true" />
        <button :class="{ on: view === 'tape' }" @click="view = 'tape'" aria-label="Tape view"><Rows3 :size="15" /></button>
        <button :class="{ on: view === 'grid' }" @click="view = 'grid'" aria-label="Grid view"><LayoutGrid :size="15" /></button>
      </div>
    </Motion>

    <!-- ── status chip rail ── -->
    <div class="rc-chips">
      <button class="rc-chip" :class="{ on: status === null }" @click="setStatus(null)">
        <span class="rc-chip-dot all" /> All
      </button>
      <button v-for="s in CHIP_STATUSES" :key="s.key" class="rc-chip"
              :class="{ on: status === s.key }"
              :style="{ '--chip': `var(--rmb-st-${s.tone})`, '--chip-soft': `var(--rmb-st-${s.tone}-soft)` }"
              @click="setStatus(s.key)">
        <span class="rc-chip-dot" /> {{ s.label }}
      </button>
    </div>

    <!-- ── summary ribbon ── -->
    <Motion as="div" class="rc-summary"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
      <div class="rc-stat">
        <span class="rc-stat-lbl">Matching</span>
        <b class="rmb-mono"><RmbCountUp :value="total" /></b>
      </div>
      <div class="rc-stat">
        <span class="rc-stat-lbl">Value on this page</span>
        <b class="money"><RmbMoneyValue :value="pageValue" :decimals="0" /></b>
      </div>
      <div class="rc-mix" :title="`${items.length} claims on this page`">
        <div class="rc-mix-bar">
          <span v-for="seg in statusMix" :key="seg.key" class="rc-mix-seg"
                :style="{ width: seg.pct + '%', background: seg.hex }" :title="`${seg.label}: ${seg.count}`" />
        </div>
        <div class="rc-mix-legend">
          <span v-for="seg in statusMix.slice(0, 4)" :key="seg.key" class="rc-mix-leg">
            <i :style="{ background: seg.hex }" />{{ seg.label }}
          </span>
        </div>
      </div>
    </Motion>

    <!-- ── ledger ── -->
    <div class="rc-ledger rmb-ribbon" :class="view">
      <div v-if="loading" class="rc-feed" :class="view">
        <div v-for="i in (view === 'grid' ? 6 : 4)" :key="i" class="rmb-skel slip-skel"></div>
      </div>
      <div v-else-if="items.length" :key="feedSeq + '-' + view" class="rc-feed" :class="view">
        <RmbReceiptSlip v-for="(c, i) in items" :key="c.id" :claim="c" :index="i" @open="openClaim" />
      </div>
      <RmbEmptyState v-else :icon="Receipt" title="No claims match"
                     subtitle="Adjust the filters above, or wait for claims to stream onto the tape.">
        <button v-if="hasActiveFilters" class="rmb-btn rmb-btn-ghost" style="margin-top:14px" @click="resetFilters">
          <X :size="14" /> Clear filters
        </button>
      </RmbEmptyState>
    </div>

    <RmbPagination :page="filters.page" :total-pages="totalPages" @page="goPage" />

    <ClaimDetailDrawer :claim="active" surface="admin" :can-act="activeCanAct"
                       @close="active = null" @action="onAction" />
    <ClaimActionModal v-if="actionModal" :claim="active" :action="actionModal" surface="admin"
                      @close="actionModal = null" @done="refreshAll" />
    <SettleModal v-if="settleModal" :claim="active" @close="settleModal = false" @done="refreshAll" />
    <ReverseModal v-if="reverseModal" :claim="active" @close="reverseModal = false" @done="refreshAll" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Search, Receipt, ScrollText, RefreshCw, Tags, ChevronDown, X, Rows3, LayoutGrid,
} from 'lucide-vue-next'
import {
  useReimbursements, fetchCategories, fetchClaim, statusMeta,
  CLAIM_STATUS,
} from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbReceiptSlip from '../components/RmbReceiptSlip.vue'
import RmbEmptyState from '../components/RmbEmptyState.vue'
import RmbPagination from '../components/RmbPagination.vue'
import RmbCountUp from '../components/RmbCountUp.vue'
import RmbMoneyValue from '../components/RmbMoneyValue.vue'
import ClaimDetailDrawer from '../drawers/ClaimDetailDrawer.vue'
import ClaimActionModal from '../modals/ClaimActionModal.vue'
import SettleModal from '../modals/SettleModal.vue'
import ReverseModal from '../modals/ReverseModal.vue'

const emit = defineEmits(['refresh-stats'])
const { items, total, loading, filters, totalPages, setFilters, setPage, fetchList } = useReimbursements()

// Status chips shown in this feed. DRAFT and CANCELLED are intentionally hidden —
// they aren't used in this workflow. (CLAIM_STATUS stays whole so status stamps,
// audit logs, etc. can still render any state that does occur.)
const CHIP_STATUSES = CLAIM_STATUS.filter(s => !['DRAFT', 'CANCELLED'].includes(s.key))

const rootRef = ref(null)
usePointerSpotlight(rootRef)

const q = ref('')
const status = ref(null)
const category_id = ref(null)
const categories = ref([])
const active = ref(null)
const activeCanAct = ref(true)
const actionModal = ref(null)
const settleModal = ref(false)
const reverseModal = ref(false)
const view = ref('tape')
const searchFocus = ref(false)
const refreshing = ref(false)
const feedSeq = ref(0)

// re-stagger the feed whenever the underlying list actually changes
watch(items, () => { feedSeq.value++ })

let searchTimer = null
const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 420)
}
const clearSearch = () => { q.value = ''; applyFilters() }

const hasActiveFilters = computed(() => !!q.value || status.value !== null || category_id.value !== null)
const resetFilters = () => { q.value = ''; status.value = null; category_id.value = null; applyFilters() }

const applyFilters = () => {
  clearTimeout(searchTimer)
  setFilters({ q: q.value, status: status.value, category_id: category_id.value })
  fetchList()
}
const setStatus = (k) => { status.value = k; applyFilters() }
const goPage = (p) => { setPage(p); fetchList() }

const refresh = () => {
  refreshing.value = true
  fetchList().finally(() => setTimeout(() => { refreshing.value = false }, 700))
  emit('refresh-stats')
}

// ── derived page metrics ──
const displayAmt = (c) =>
  ['SETTLED', 'PAID'].includes(c.status) && c.approved_amount != null ? c.approved_amount : c.amount
const pageValue = computed(() => items.value.reduce((a, c) => a + (Number(displayAmt(c)) || 0), 0))

const statusMix = computed(() => {
  const map = new Map()
  for (const c of items.value) {
    const m = statusMeta(c.status)
    const cur = map.get(c.status) || { key: c.status, label: m.label, hex: m.hex, count: 0 }
    cur.count++; map.set(c.status, cur)
  }
  const arr = [...map.values()].sort((a, b) => b.count - a.count)
  const tot = arr.reduce((a, s) => a + s.count, 0) || 1
  return arr.map(s => ({ ...s, pct: (s.count / tot) * 100 }))
})

async function openClaim(c) {
  try { active.value = await fetchClaim(c.id); activeCanAct.value = true }
  catch { active.value = c }
}
function onAction({ action }) {
  if (action === 'settle') { settleModal.value = true }
  else if (action === 'reverse') { reverseModal.value = true }
  else { actionModal.value = action }
}
async function refreshAll() {
  await fetchList()
  if (active.value) { try { active.value = await fetchClaim(active.value.id) } catch {} }
  emit('refresh-stats')
}

onMounted(async () => {
  fetchList()
  try { categories.value = (await fetchCategories()).items || [] } catch {}
})
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<style scoped>
.rmb-claims { position: relative; display: flex; flex-direction: column; gap: 16px; }
.rmb-claims > :not(.rc-atmos) { position: relative; z-index: 1; }

/* ── backdrop ── */
.rc-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.rc-orb { position: absolute; border-radius: 50%; filter: blur(66px); }
.rc-orb.o1 { width: 380px; height: 380px; top: -120px; left: -40px; opacity: 0.16;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: rc-drift 24s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -28px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.rc-orb.o2 { width: 340px; height: 340px; bottom: -130px; right: -30px; opacity: 0.12;
  background: radial-gradient(circle, rgba(45,212,191,0.85), transparent 70%); animation: rc-drift 29s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 24px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.rc-grid { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.rc-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.035), transparent); }

/* ── header ── */
.rc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.rc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--rmb-st-returned); }
.rc-head h2 { margin: 4px 0 5px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--rmb-text); }
.rc-head h2 .ink { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rc-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); flex-wrap: wrap; }
.rc-live { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.rc-sep { opacity: 0.5; }
.rc-head-r { display: flex; align-items: center; gap: 12px; }
.rc-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.rc-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--rmb-amber-bright), var(--rmb-amber-strong)); animation: rc-eq 1.1s ease-in-out infinite; }
.rc-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.rc-refresh:hover { color: var(--rmb-amber); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.rc-refresh.spin :deep(svg) { animation: rc-spin 0.8s var(--rmb-ease); }

/* ── filters ── */
.rc-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.rc-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px; position: relative;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); border-radius: 12px; padding: 0 12px;
  color: var(--rmb-text-muted); transition: border-color 0.25s, box-shadow 0.25s, background 0.25s; }
.rc-search.focused { border-color: color-mix(in srgb, var(--rmb-amber) 55%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--rmb-amber) 12%, transparent); background: var(--rmb-surface-elevated); }
.rc-search-ic { flex: 0 0 auto; transition: color 0.25s, transform 0.25s; }
.rc-search.focused .rc-search-ic { color: var(--rmb-amber); transform: scale(1.08); }
.rc-search input { flex: 1; background: none; border: none; outline: none; padding: 11px 0; color: var(--rmb-text); font-size: 13px; }
.rc-clear { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer;
  background: var(--rmb-surface-elevated); border: none; color: var(--rmb-text-muted); transition: 0.2s; }
.rc-clear:hover { color: var(--rmb-st-rejected); }

.rc-select { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 0 10px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); border-radius: 12px; color: var(--rmb-text-muted);
  transition: border-color 0.25s; }
.rc-select:hover { border-color: var(--rmb-border-strong); }
.rc-select select { appearance: none; background: none; border: none; outline: none; cursor: pointer;
  padding: 11px 20px 11px 0; color: var(--rmb-text); font-size: 13px; }
.rc-select-arr { position: absolute; right: 10px; pointer-events: none; }

.rc-view { position: relative; display: inline-flex; padding: 4px; gap: 2px; border-radius: 12px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.rc-view-pill { position: absolute; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px); border-radius: 8px;
  background: var(--hr-gradient-hero); box-shadow: 0 6px 16px -8px rgba(251,146,60,0.6); transition: transform 0.32s var(--rmb-spring); }
.rc-view button { position: relative; z-index: 1; width: 38px; height: 30px; display: grid; place-items: center;
  background: none; border: none; cursor: pointer; color: var(--rmb-text-muted); border-radius: 8px; transition: color 0.25s; }
.rc-view button.on { color: #2a1a06; }

/* ── status chips ── */
.rc-chips { display: flex; gap: 8px; flex-wrap: wrap; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
.rc-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 600; white-space: nowrap; color: var(--rmb-text-secondary);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.25s var(--rmb-spring); }
.rc-chip:hover { border-color: var(--rmb-border-strong); transform: translateY(-1px); }
.rc-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--chip, var(--rmb-amber)); flex: 0 0 auto;
  box-shadow: 0 0 7px -1px var(--chip, var(--rmb-amber)); }
.rc-chip-dot.all { background: linear-gradient(135deg, var(--rmb-amber), var(--rmb-st-settled)); box-shadow: none; }
.rc-chip.on { color: var(--chip, var(--rmb-amber)); background: var(--chip-soft, rgba(251,191,36,0.14));
  border-color: color-mix(in srgb, var(--chip, var(--rmb-amber)) 50%, transparent); }
.rc-chip.on .rc-chip-dot { animation: rmb-pulse-dot 1.8s ease-in-out infinite; }

/* ── summary ribbon ── */
.rc-summary { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 14px; flex-wrap: wrap;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.rc-stat { display: flex; flex-direction: column; gap: 2px; }
.rc-stat-lbl { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.rc-stat b { font-size: 19px; font-weight: 800; color: var(--rmb-text); }
.rc-stat b.money { font-size: 17px; }
.rc-mix { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 7px; }
.rc-mix-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: var(--rmb-surface);
  border: 1px solid var(--rmb-border-soft); }
.rc-mix-seg { height: 100%; transition: width 0.7s var(--rmb-spring); min-width: 2px; }
.rc-mix-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.rc-mix-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--rmb-text-muted); }
.rc-mix-leg i { width: 7px; height: 7px; border-radius: 2px; }

/* ── ledger ── */
.rc-ledger { border-radius: 16px; padding: 14px; border: 1px solid var(--rmb-border-soft); min-height: 160px; }
.rc-feed { display: flex; flex-direction: column; gap: 12px; }
.rc-feed.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 13px; }
.slip-skel { height: 120px; }

/* ── keyframes ── */
@keyframes rc-drift { 0%, 100% { translate: 0 0; } 50% { translate: 40px 30px; } }
@keyframes rc-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes rc-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* ── light theme ── */
:root[data-theme="light"] .rc-orb.o1 { opacity: 0.12; }
:root[data-theme="light"] .rc-orb.o2 { opacity: 0.09; }

@media (prefers-reduced-motion: reduce) {
  .rc-orb, .rc-eq i, .rc-live { animation: none !important; }
  .rc-orb { transform: none !important; }
}
@media (max-width: 620px) {
  .rc-head h2 { font-size: 22px; }
  .rc-filters { flex-direction: column; align-items: stretch; }
  .rc-view { align-self: flex-start; }
}
</style>
