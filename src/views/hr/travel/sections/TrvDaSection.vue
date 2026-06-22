<template>
  <div class="da">
    <!-- ══ Console hero ══ -->
    <Motion as="section" class="da-hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <span class="hero-runway" aria-hidden="true" />

      <div class="hero-grid">
        <div class="hero-lead">
          <span class="hero-eyebrow"><Calculator :size="13" /> Travel · Per-Diem Treasury</span>
          <h1 class="hero-title">Daily Allowance <span class="grad">Ledger</span></h1>
          <p class="hero-sub">Every per-diem accrues from grade × destination tier — compute it, approve it, settle it to payroll.</p>
          <div class="hero-cta">
            <Motion as="button" type="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="showCompute = true">
              <Calculator :size="16" /> Compute DA
            </Motion>
            <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="showRates = true">
              <Table2 :size="14" /> Rate card
            </Motion>
            <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="reloadAll">
              <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
            </Motion>
          </div>
        </div>
        <div class="hero-meter">
          <DaPerDiemMeter :total="totalPayable" :segments="segments" :pending="countBy('COMPUTED')" :tiers="tierRates" />
        </div>
      </div>

      <div class="hero-lenses">
        <button class="lens" :class="{ on: !statusFilter }" @click="statusFilter = ''">
          <Layers :size="13" /> <span>All</span> <b><TrvCountUp :value="records.length" /></b>
        </button>
        <button v-for="s in lensDefs" :key="s.key" class="lens" :class="{ on: statusFilter === s.key }"
          :style="{ '--c': s.hex }" @click="statusFilter = s.key">
          <component :is="s.icon" :size="13" /> <span>{{ s.label }}</span> <b><TrvCountUp :value="countBy(s.key)" /></b>
        </button>
        <span class="lens stat">
          <Banknote :size="13" /> <span>Payable</span> <b class="trv-mono">{{ fmtCompactINR(totalPayable) }}</b>
        </span>
      </div>
    </Motion>

    <!-- ══ Command bar ══ -->
    <div class="da-bar">
      <div class="search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="q" placeholder="Search traveller or tour ref…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="search-x" @click="q = ''"><X :size="13" /></button>
      </div>
      <HrSelect v-model="tierFilter" :options="tierOpts" placeholder="All tiers" class="bar-sel" />
      <HrSelect v-model="sortMode" :options="sortOpts" class="bar-sel" />
    </div>

    <!-- ══ Results ══ -->
    <div v-if="loading" class="grid"><div v-for="n in 4" :key="n" class="skel" /></div>
    <div v-else-if="filtered.length" class="grid">
      <DaCard v-for="(d, i) in filtered" :key="d.id" :rec="d" :index="i" @approve="openApprove" @view="openView" @go="$emit('go', $event)" />
    </div>
    <TrvEmptyState v-else :icon="Calculator"
      :title="records.length ? 'No DA in this view' : 'No DA computed yet'"
      :subtitle="records.length ? 'Try clearing filters.' : 'Compute a daily allowance for any approved tour to get the first reading on the meter.'"
      cta="Compute DA" :cta-icon="Calculator" @cta="showCompute = true" />

    <DaComputeModal :open="showCompute" @close="showCompute = false" @computed="onChanged" @go="$emit('go', $event)" />
    <DaApproveModal :open="showApprove" :rec="activeRec" @close="showApprove = false" @approved="onChanged" />
    <DaDetailModal :open="showView" :rec="activeRec" @close="showView = false" @approve="onViewApprove" @go="onViewGo" />
    <DaRateCardDrawer :open="showRates" @close="showRates = false" @go="$emit('go', $event)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Calculator, RefreshCw, Table2, Search, X, Layers, Banknote,
  CheckCircle2, BadgeCheck, RotateCcw,
} from 'lucide-vue-next'
import DaPerDiemMeter from '../components/DaPerDiemMeter.vue'
import DaCard from '../components/DaCard.vue'
import DaRateCardDrawer from '../components/DaRateCardDrawer.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import DaComputeModal from '../modals/DaComputeModal.vue'
import DaApproveModal from '../modals/DaApproveModal.vue'
import DaDetailModal from '../modals/DaDetailModal.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { useToast } from 'vue-toastification'
import { fmtCompactINR, errText, fetchDa, fetchDaRates, cityMeta, CITY_CATEGORIES } from '@/composables/useTravel'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()

const records = ref([])
const rates = ref([])
const loading = ref(false)
const statusFilter = ref('')
const tierFilter = ref('')
const sortMode = ref('recent')
const q = ref('')
const searchFocus = ref(false)
const showCompute = ref(false)
const showApprove = ref(false)
const showView = ref(false)
const showRates = ref(false)
const activeRec = ref(null)

const lensDefs = [
  { key: 'COMPUTED', label: 'Computed', icon: Calculator, hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2, hex: '#34d399' },
  { key: 'PAID', label: 'Paid', icon: BadgeCheck, hex: '#60d394' },
  { key: 'REVERSED', label: 'Reversed', icon: RotateCcw, hex: '#c084fc' },
]
const tierOpts = [{ value: '', label: 'All tiers' }, ...CITY_CATEGORIES.map(c => ({ value: c.key, label: c.label }))]
const sortOpts = [
  { value: 'recent', label: 'Most recent' },
  { value: 'amount', label: 'Amount — high to low' },
  { value: 'days', label: 'Days — most first' },
]

const countBy = (k) => records.value.filter(r => r.status === k).length
const amt = (r) => Number(r.approved_da ?? r.eligible_da ?? 0)
const sumStatus = (k) => records.value.filter(r => r.status === k).reduce((a, r) => a + amt(r), 0)

const totalPayable = computed(() => sumStatus('APPROVED'))
const segments = computed(() => [
  { key: 'computed', label: 'Computed', val: sumStatus('COMPUTED'), hex: '#fbbf24' },
  { key: 'approved', label: 'Approved', val: sumStatus('APPROVED'), hex: '#34d399' },
  { key: 'paid', label: 'Paid', val: sumStatus('PAID'), hex: '#60d394' },
])

const today = new Date().toISOString().slice(0, 10)
const tierRates = computed(() => CITY_CATEGORIES.map(c => {
  const pool = rates.value.filter(r => r.city_category === c.key && r.is_active && (!r.effective_date || r.effective_date <= today))
  const wild = pool.filter(r => !r.grade_id).sort((a, b) => String(b.effective_date || '').localeCompare(String(a.effective_date || '')))[0]
  const any = pool.sort((a, b) => Number(b.daily_rate) - Number(a.daily_rate))[0]
  const row = wild || any
  return { key: c.key, label: c.label, hex: c.hex, rate: row ? Math.round(Number(row.daily_rate)) : 0 }
}))

const filtered = computed(() => {
  let arr = records.value
  if (statusFilter.value) arr = arr.filter(r => r.status === statusFilter.value)
  if (tierFilter.value) arr = arr.filter(r => r.city_category === tierFilter.value)
  const term = q.value.trim().toLowerCase()
  if (term) arr = arr.filter(r => (r.travel_reference_number || '').toLowerCase().includes(term) || (r.employee_name || '').toLowerCase().includes(term))
  arr = [...arr]
  if (sortMode.value === 'amount') arr.sort((a, b) => amt(b) - amt(a))
  else if (sortMode.value === 'days') arr.sort((a, b) => (b.travel_days || 0) - (a.travel_days || 0))
  else arr.sort((a, b) => String(b.computed_at || '').localeCompare(String(a.computed_at || '')))
  return arr
})

const load = async () => {
  loading.value = true
  try {
    const [d, r] = await Promise.all([fetchDa({ limit: 200 }), fetchDaRates({}).catch(() => ({ items: [] }))])
    records.value = d.items || []
    rates.value = r.items || []
  } catch (e) { toast.error(errText(e, 'Failed to load DA records')) }
  finally { loading.value = false }
}
const reloadAll = () => load()
const openApprove = (rec) => { activeRec.value = rec; showApprove.value = true }
const openView = (rec) => { activeRec.value = rec; showView.value = true }
// Approving from inside the detail modal hands off to the dedicated approve modal.
const onViewApprove = (rec) => { showView.value = false; openApprove(rec) }
// A cross-link from the detail modal should close it before navigating away.
const onViewGo = (target) => { showView.value = false; emit('go', target) }
const onChanged = () => { load(); emit('refresh-stats') }

onMounted(load)
</script>

<style scoped>
.da { display: flex; flex-direction: column; gap: 16px; }

/* hero */
.da-hero { position: relative; overflow: hidden; border-radius: 22px; padding: 24px 26px 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-shadow); }
.hero-aura { position: absolute; inset: -30% 30% 50% -10%; pointer-events: none; background: radial-gradient(60% 80% at 28% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 9s ease-in-out infinite; }
.hero-runway { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--trv-grad-runway); background-size: 200% 100%; animation: trv-runway-flow 4s linear infinite; }
.hero-grid { position: relative; display: grid; grid-template-columns: 1.25fr 0.85fr; gap: 24px; align-items: center; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-title { font-size: clamp(24px, 3.6vw, 36px); font-weight: 850; margin: 11px 0 5px; line-height: 1.05; color: var(--trv-text); }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 13.5px; color: var(--trv-text-secondary); margin: 0 0 18px; max-width: 460px; }
.hero-cta { display: flex; gap: 10px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.spin { animation: da-spin 0.9s linear infinite; }
@keyframes da-spin { to { transform: rotate(360deg); } }

.hero-lenses { position: relative; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.lens { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lens:hover { border-color: var(--c, var(--trv-amber-border)); color: var(--trv-text-secondary); }
.lens.on { color: var(--c, var(--trv-amber)); border-color: var(--c, var(--trv-amber-border)); background: color-mix(in srgb, var(--c, #fbbf24) 13%, transparent); }
.lens b { color: var(--trv-text); font-variant-numeric: tabular-nums; }
.lens.stat { cursor: default; margin-left: auto; color: var(--trv-text-muted); }
.lens.stat b { color: var(--trv-amber-bright); }

/* command bar */
.da-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 12px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: border-color 0.2s, box-shadow 0.2s; }
.search.focus { border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }
.search input { flex: 1; background: none; border: none; outline: none; padding: 11px 0; font-size: 13px; color: var(--trv-text); }
.search-x { display: grid; place-items: center; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; padding: 2px; }
.bar-sel { width: 196px; }

/* results */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.skel { height: 200px; border-radius: 16px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

@media (max-width: 820px) { .hero-grid { grid-template-columns: 1fr; } .hero-meter { max-width: 420px; } .lens.stat { margin-left: 0; } }
@media (max-width: 720px) { .bar-sel { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .hero-aura, .hero-runway { animation: none; } .spin { animation: none; } }
</style>
