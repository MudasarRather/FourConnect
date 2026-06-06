<template>
  <div class="roster">
    <!-- ░░ INSIGHT STRIP ░░ -->
    <div class="insight-strip">
      <Motion v-for="(tile, i) in insightTiles" :key="tile.key" as="div"
        class="ins-tile" v-tilt
        :initial="{ opacity: 0, y: 16, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.55, delay: 0.06 + i * 0.08, ease: [0.16, 1, 0.3, 1] }">
        <div class="ins-glyph" :class="`g-${tile.key}`"><component :is="tile.icon" :size="16" /></div>
        <div class="ins-body">
          <span class="ins-label">{{ tile.label }} <em v-if="tile.scoped">· this page</em></span>
          <div class="ins-value">
            <PayMoneyValue v-if="tile.money" :value="tile.value" short tone="net" />
            <template v-else><PayCountUp :value="tile.value" :decimals="tile.decimals || 0" /><span v-if="tile.suffix" class="ins-suffix">{{ tile.suffix }}</span></template>
          </div>
        </div>
        <span class="ins-sheen" aria-hidden="true" />
      </Motion>
    </div>

    <!-- ░░ CONTROL BAR ░░ -->
    <Motion as="header" class="ctrl-bar"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.34, ease: [0.16, 1, 0.3, 1] }">
      <div class="search" :class="{ focused: searchFocused }">
        <Search :size="15" />
        <input v-model="q" placeholder="Search the roster…"
          @focus="searchFocused = true" @blur="searchFocused = false" @keyup.enter="() => { page = 1; reload() }" />
        <span class="search-glow" aria-hidden="true" />
      </div>
      <div class="ctrl-right">
        <div class="seg" role="tablist">
          <button v-for="opt in regimeOpts" :key="opt.v" class="seg-btn" :class="{ on: regimeFilter === opt.v }"
            @click="regimeFilter = opt.v">{{ opt.label }}</button>
        </div>
        <button class="sort-btn" @click="toggleSort" :title="`Sort by CTC ${sortDir === 'desc' ? 'high→low' : 'low→high'}`">
          <ArrowUpDown :size="14" /><span>CTC</span>
          <ChevronDown :size="13" class="sort-caret" :class="{ up: sortDir === 'asc' }" />
        </button>
      </div>
    </Motion>

    <!-- ░░ LOADING ░░ -->
    <div v-if="loading" class="grid">
      <div v-for="i in 8" :key="i" class="card-skel">
        <div class="pay-skel" style="height:54px; border-radius:14px" />
        <div class="pay-skel" style="height:30px; width:62%; margin-top:14px" />
        <div class="pay-skel" style="height:8px; width:100%; margin-top:16px; border-radius:99px" />
        <div class="pay-skel" style="height:32px; width:100%; margin-top:14px; border-radius:10px" />
      </div>
    </div>

    <!-- ░░ EMPTY ░░ -->
    <PayEmptyState v-else-if="!visibleItems.length" :icon="Wallet" title="No employees on the roster"
      :sub="q || regimeFilter !== 'all' ? 'No matches for your current filters. Try clearing the search or regime filter.' : 'Add employees in the HR module, then mint their compensation here.'" />

    <!-- ░░ ROSTER CARDS ░░ -->
    <div v-else class="grid">
      <Motion v-for="(e, i) in visibleItems" :key="e.id" as="article" class="emp-card" v-tilt
        :initial="{ opacity: 0, y: 22, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9, delay: Math.min(i * 0.045, 0.4) }">
        <span class="card-foil" aria-hidden="true" />

        <div class="card-head">
          <div class="av-wrap">
            <span class="av-ring" aria-hidden="true" />
            <span class="av">{{ initials(e) }}</span>
          </div>
          <div class="head-meta">
            <div class="en">{{ name(e) }}</div>
            <div class="sub-line">
              <span class="ec">{{ e.employee_id }}</span>
              <span class="dot" aria-hidden="true">·</span>
              <span class="dep">{{ dept(e) }}</span>
            </div>
          </div>
          <span class="regime" :class="isNew(e) ? 'r-new' : 'r-old'">{{ isNew(e) ? 'NEW' : 'OLD' }}</span>
        </div>

        <div class="ctc-block">
          <div class="ctc-line">
            <PayMoneyValue v-if="e.annual_ctc" :value="e.annual_ctc" tone="net" />
            <span v-else class="ctc-empty">Not set</span>
            <span v-if="e.annual_ctc" class="per">/yr</span>
          </div>
          <div class="monthly" v-if="e.annual_ctc">≈ {{ monthly(e) }}/mo</div>
          <div class="monthly placeholder" v-else>Awaiting compensation</div>
        </div>

        <div class="band" :class="{ empty: !e.annual_ctc }">
          <Motion class="band-fill" as="span"
            :initial="{ scaleX: 0 }" :animate="{ scaleX: bandPct(e) }"
            :transition="{ duration: 0.9, delay: 0.25 + Math.min(i * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }" />
        </div>

        <Motion as="button" class="manage" @click="manage(e)"
          :whileHover="{ y: -2, scale: 1.015 }" :whileTap="{ scale: 0.96 }"
          :transition="{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }">
          <Coins :size="14" />
          <span>Manage compensation</span>
          <ChevronRight :size="14" class="m-caret" />
        </Motion>
      </Motion>
    </div>

    <PayPagination v-if="!loading && items.length" :page="page" :page-size="limit" :total-items="total"
      @update:page="p => { page = p; reload() }" @update:page-size="s => { limit = s; page = 1; reload() }" />

    <PayCompensationDrawer :open="drawer.open" :employee="drawer.employee"
      @close="drawer.open = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { Search, Wallet, ChevronRight, ChevronDown, Coins, Users, IndianRupee, TrendingUp, Sparkles, ArrowUpDown } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { API, authHeader } from '@/utils/api'
import { inr } from '@/composables/usePayroll'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayPagination from '../components/PayPagination.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayCompensationDrawer from '../drawers/PayCompensationDrawer.vue'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const items = ref([]); const total = ref(0); const loading = ref(false)
const q = ref(''); const page = ref(1); const limit = ref(25)
const drawer = ref({ open: false, employee: null })
const searchFocused = ref(false)
const regimeFilter = ref('all')   // 'all' | 'new' | 'old'
const sortDir = ref('')           // '' | 'desc' | 'asc'

const regimeOpts = [
  { v: 'all', label: 'All' },
  { v: 'new', label: 'New' },
  { v: 'old', label: 'Old' },
]

const name = (e) => e.user?.full_name || e.full_name || e.employee_id
const dept = (e) => e.department?.name || e.department_name || '—'
const initials = (e) => (name(e) || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
const isNew = (e) => String(e.tax_regime || 'NEW').toUpperCase() !== 'OLD'
const monthly = (e) => inr(Math.round(Number(e.annual_ctc || 0) / 12))

// comparative pay band — width relative to the richest CTC in the loaded set
const maxCtc = computed(() => items.value.reduce((m, e) => Math.max(m, Number(e.annual_ctc || 0)), 0))
const bandPct = (e) => {
  const m = maxCtc.value
  if (!m || !e.annual_ctc) return 0
  return Math.max(0.06, Number(e.annual_ctc) / m)
}

// page-scoped aggregates (honest about being this-page only)
const loadedCount = computed(() => items.value.length)
const totalCtc = computed(() => items.value.reduce((s, e) => s + Number(e.annual_ctc || 0), 0))
const avgCtc = computed(() => loadedCount.value ? Math.round(totalCtc.value / loadedCount.value) : 0)
const pctNew = computed(() => loadedCount.value ? Math.round((items.value.filter(isNew).length / loadedCount.value) * 100) : 0)

const insightTiles = computed(() => [
  { key: 'head', label: 'On payroll', icon: Users, value: total.value },
  { key: 'total', label: 'Total annual CTC', icon: IndianRupee, value: totalCtc.value, money: true, scoped: true },
  { key: 'avg', label: 'Avg CTC', icon: TrendingUp, value: avgCtc.value, money: true, scoped: true },
  { key: 'regime', label: 'On new regime', icon: Sparkles, value: pctNew.value, suffix: '%', scoped: true },
])

// client-side view layer (filter + sort) — never mutates the fetched set or pagination contract
const visibleItems = computed(() => {
  let list = items.value
  if (regimeFilter.value === 'new') list = list.filter(isNew)
  else if (regimeFilter.value === 'old') list = list.filter(e => !isNew(e))
  if (sortDir.value) {
    list = [...list].sort((a, b) => {
      const d = Number(a.annual_ctc || 0) - Number(b.annual_ctc || 0)
      return sortDir.value === 'asc' ? d : -d
    })
  }
  return list
})
const toggleSort = () => { sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc' }

const reload = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API}/hr/employees/`, { headers: authHeader(),
      params: { page: page.value, limit: limit.value, search: q.value || undefined } })
    items.value = res.data.items || []
    total.value = res.data.total || 0
  } catch { toast.error('Failed to load employees') }
  finally { loading.value = false }
}
const manage = (e) => { drawer.value = { open: true, employee: e } }
// Reload the roster so a just-activated CTC replaces "Not set" immediately,
// and bubble up for the workspace hero stats.
const onSaved = () => { reload(); emit('refresh-stats') }
onMounted(reload)
</script>

<style scoped>
.roster { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ░░░░░░░░░░ INSIGHT STRIP ░░░░░░░░░░ */
.insight-strip {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.ins-tile {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 16px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -18px rgba(0,0,0,0.6);
  transform-style: preserve-3d;
}
.ins-tile::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: linear-gradient(140deg, rgba(251,191,36,0.4), transparent 38%, transparent 62%, rgba(184,134,11,0.28));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; opacity: 0.7;
}
.ins-sheen {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 2;
  background: linear-gradient(105deg, transparent 30%, rgba(253,230,138,0.18) 48%, transparent 64%);
  transform: translateX(-120%); transition: transform 0.85s var(--pay-ease);
}
.ins-tile:hover .ins-sheen { transform: translateX(120%); }
.ins-glyph {
  width: 38px; height: 38px; flex: none; border-radius: 11px; display: grid; place-items: center;
  color: var(--pay-treasury); background: rgba(251,191,36,0.12); border: 1px solid var(--pay-border-soft);
}
.ins-glyph.g-total, .ins-glyph.g-avg { color: var(--pay-net); background: color-mix(in srgb, var(--pay-net) 12%, transparent); }
.ins-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ins-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); white-space: nowrap; }
.ins-label em { font-style: normal; opacity: 0.6; text-transform: none; letter-spacing: 0; font-size: 10px; }
.ins-value { font-family: var(--pay-mono); font-variant-numeric: tabular-nums; font-weight: 800; font-size: 19px; color: var(--pay-text); line-height: 1.1; }
.ins-suffix { font-size: 13px; margin-left: 1px; color: var(--pay-text-2); }

/* ░░░░░░░░░░ CONTROL BAR ░░░░░░░░░░ */
.ctrl-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.search {
  position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 14px; border-radius: 12px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease); min-width: 260px; flex: 1; max-width: 420px;
}
.search.focused { border-color: var(--pay-amber); box-shadow: 0 0 0 4px rgba(245,158,11,0.12); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 100%; }
.search-glow {
  position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(120px 60px at 14px 50%, rgba(245,158,11,0.16), transparent 70%);
  transition: opacity 0.3s var(--pay-ease);
}
.search.focused .search-glow { opacity: 1; }

.ctrl-right { display: flex; align-items: center; gap: 10px; }
.seg { display: inline-flex; padding: 3px; border-radius: 11px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); gap: 2px; }
.seg-btn {
  padding: 6px 13px; border-radius: 8px; border: none; background: transparent; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--pay-text-muted); transition: color 0.2s, background 0.25s var(--pay-ease);
}
.seg-btn.on { color: #1a1206; background: var(--pay-grad-cta); box-shadow: 0 4px 12px -6px rgba(234,88,12,0.5); }
.sort-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2);
  cursor: pointer; font-size: 12px; font-weight: 600; transition: border-color 0.25s, color 0.25s;
}
.sort-btn:hover { border-color: var(--pay-amber); color: var(--pay-text); }
.sort-caret { transition: transform 0.3s var(--pay-spring); }
.sort-caret.up { transform: rotate(180deg); }

/* ░░░░░░░░░░ GRID ░░░░░░░░░░ */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }

/* ░░ skeleton ░░ */
.card-skel { padding: 16px; border-radius: 18px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }

/* ░░░░░░░░░░ EMPLOYEE CARD ░░░░░░░░░░ */
.emp-card {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; gap: 14px; padding: 16px 16px 15px;
  border-radius: 18px; background: linear-gradient(165deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); transform-style: preserve-3d;
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 30px -22px rgba(0,0,0,0.7);
  transition: border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease);
}
.emp-card:hover { border-color: var(--pay-border); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 44px -24px rgba(234,88,12,0.4); }
.card-foil {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 3;
  background: linear-gradient(110deg, transparent 32%, rgba(253,230,138,0.16) 47%, rgba(255,255,255,0.08) 50%, rgba(253,230,138,0.14) 53%, transparent 68%);
  transform: translateX(-130%); transition: transform 1s var(--pay-ease);
}
.emp-card:hover .card-foil { transform: translateX(130%); }

.card-head { display: flex; align-items: center; gap: 12px; }
.av-wrap { position: relative; width: 46px; height: 46px; flex: none; display: grid; place-items: center; }
.av-ring {
  position: absolute; inset: 0; border-radius: 14px; padding: 2px;
  background: conic-gradient(from 0deg, var(--pay-treasury), var(--pay-mint), var(--pay-amber), var(--pay-ember), var(--pay-treasury));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  transition: transform 0.6s var(--pay-ease); opacity: 0.85;
}
.emp-card:hover .av-ring { transform: rotate(120deg); opacity: 1; }
.av {
  position: relative; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center;
  font-size: 13px; font-weight: 800; font-family: var(--pay-mono);
  background: rgba(251,191,36,0.14); color: var(--pay-treasury); z-index: 1;
}
.head-meta { min-width: 0; flex: 1; }
.en { color: var(--pay-text); font-weight: 700; font-size: 14px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub-line { display: flex; align-items: center; gap: 6px; margin-top: 3px; min-width: 0; }
.ec { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); flex: none; }
.dot { color: var(--pay-text-muted); opacity: 0.5; }
.dep { font-size: 11px; color: var(--pay-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.regime { flex: none; font-family: var(--pay-mono); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 7px; letter-spacing: 0.04em; }
.r-new { background: rgba(251,191,36,0.12); color: var(--pay-treasury); border: 1px solid var(--pay-border-soft); }
.r-old { background: color-mix(in srgb, var(--pay-statutory) 14%, transparent); color: var(--pay-statutory); border: 1px solid var(--pay-border-soft); }

.ctc-block { display: flex; flex-direction: column; gap: 2px; }
.ctc-line { display: flex; align-items: baseline; gap: 6px; }
.ctc-line :deep(.pay-money) { font-size: 26px; letter-spacing: -0.01em; }
.per { font-family: var(--pay-mono); font-size: 12px; color: var(--pay-text-muted); }
.ctc-empty { font-size: 18px; font-weight: 700; color: var(--pay-text-muted); font-family: var(--pay-mono); }
.monthly { font-family: var(--pay-mono); font-size: 11.5px; color: var(--pay-text-2); }
.monthly.placeholder { color: var(--pay-text-muted); font-style: italic; }

/* ░░ comparative pay band ░░ */
.band { height: 7px; border-radius: 99px; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); overflow: hidden; }
.band.empty { opacity: 0.5; }
.band-fill {
  display: block; height: 100%; width: 100%; transform-origin: left center;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--pay-treasury), var(--pay-amber) 60%, var(--pay-ember));
  box-shadow: 0 0 14px -3px rgba(245,158,11,0.5);
}

.manage {
  margin-top: auto; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 14px; border-radius: 11px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); color: var(--pay-text); cursor: pointer; font-size: 12.5px; font-weight: 600;
  position: relative; z-index: 4; overflow: hidden;
}
.manage::before {
  content: ''; position: absolute; inset: 0; opacity: 0; background: var(--pay-grad-cta);
  transition: opacity 0.3s var(--pay-ease); z-index: -1;
}
.manage:hover { color: #1a1206; border-color: transparent; box-shadow: 0 8px 22px -10px rgba(234,88,12,0.6); }
.manage:hover::before { opacity: 1; }
.m-caret { transition: transform 0.3s var(--pay-spring); }
.manage:hover .m-caret { transform: translateX(3px); }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 920px) {
  .insight-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 540px) {
  .insight-strip { grid-template-columns: 1fr; }
  .ctrl-bar { flex-direction: column; align-items: stretch; }
  .search { max-width: none; }
  .ctrl-right { justify-content: space-between; }
}

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .seg-btn.on { color: #2a1a06; }
[data-theme="light"] .manage:hover { color: #2a1a06; }
[data-theme="light"] .av { color: var(--pay-ember); }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .ins-sheen, .card-foil { transition: none; transform: none; }
  .ins-tile:hover .ins-sheen, .emp-card:hover .card-foil { transform: none; }
  .av-ring, .emp-card:hover .av-ring { transition: none; transform: none; }
  .sort-caret, .m-caret { transition: none; }
}
</style>
