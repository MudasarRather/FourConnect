<template>
  <div class="rmb-policies" ref="rootRef">
    <!-- cinematic backdrop -->
    <div class="pl-atmos" aria-hidden="true">
      <span class="pl-orb o1" /><span class="pl-orb o2" />
      <span class="pl-grid" /><span class="pl-scan" />
      <span class="rmb-spotlight" />
      <span class="rmb-grain" />
    </div>

    <!-- ── console header ── -->
    <Motion as="header" class="pl-head"
      :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <div class="pl-head-l">
        <span class="pl-eyebrow"><ShieldCheck :size="12" /> Governance · rules &amp; limits</span>
        <h2>Policy <span class="ink">Engine</span></h2>
        <span class="pl-meta rmb-mono">
          <span class="pl-live" />
          <RmbCountUp :value="total" /> spend categor{{ total === 1 ? 'y' : 'ies' }}
          <span class="pl-sep">·</span> <RmbCountUp :value="governedCount" /> governed
        </span>
      </div>
      <div class="pl-head-r">
        <span class="pl-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{ animationDelay: `${(n * 0.13).toFixed(2)}s` }" /></span>
        <button class="pl-refresh" :class="{ spin: refreshing }" @click="refresh" aria-label="Refresh policies"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ── governance console ── -->
    <Motion as="section" class="pl-console"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <span class="plc-sheen" aria-hidden="true" />
      <div class="plc-grid">
        <div class="plc-lead">
          <span class="plc-lbl">Policy coverage</span>
          <div class="plc-big"><RmbCountUp :value="coverage" /><span class="pct">%</span></div>
          <span class="plc-sub rmb-mono">{{ governedCount }} of {{ total }} categories governed</span>
        </div>
        <div class="plc-kpis">
          <div class="plc-kpi"><span class="kpi-lbl">Active policies</span><b><RmbCountUp :value="governedCount" /></b></div>
          <div class="plc-kpi"><span class="kpi-lbl">Avg stages</span><b><RmbCountUp :value="avgStages" :decimals="1" /></b></div>
          <div class="plc-kpi"><span class="kpi-lbl">Tightest cap</span><b class="rmb-mono">{{ tightestCap == null ? '—' : '₹' + short(tightestCap) }}</b></div>
        </div>
      </div>
      <!-- coverage meter -->
      <div class="plc-meter">
        <div class="meter-bar">
          <span class="meter-seg governed" :style="{ width: coverage + '%' }"><i class="seg-flow" /></span>
          <span class="meter-seg default" :style="{ width: (100 - coverage) + '%' }" />
        </div>
        <div class="meter-legend">
          <span class="legend"><i class="dot governed" /> Governed <b class="rmb-mono">{{ governedCount }}</b></span>
          <span class="legend"><i class="dot default" /> Using defaults <b class="rmb-mono">{{ total - governedCount }}</b></span>
        </div>
      </div>
    </Motion>

    <!-- ── filter chips ── -->
    <div class="pl-chips">
      <button v-for="f in FILTERS" :key="f.key" class="pl-chip" :class="{ on: filter === f.key }" @click="filter = f.key">
        <span class="pl-chip-dot" :data-k="f.key" /> {{ f.label }}
        <span class="pl-chip-n rmb-mono">{{ f.count() }}</span>
      </button>
    </div>

    <!-- ── rule cards ── -->
    <div v-if="loading" class="pl-grid-cards">
      <div v-for="i in 4" :key="i" class="rmb-skel card-skel"></div>
    </div>
    <div v-else-if="shownCats.length" :key="filter + '-' + seq" class="pl-grid-cards" @pointermove="onGridMove">
      <Motion v-for="(c, i) in shownCats" :key="c.id" as="article" class="pol-card"
        :style="{ '--cat': polColor(i) }"
        :data-governed="!!byCat[c.id]"
        :initial="{ opacity: 0, y: 20, filter: 'blur(6px)' }"
        :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :whileHover="{ y: -4 }"
        :transition="{ duration: 0.5, delay: Math.min(i, 9) * 0.05, ease: [0.16, 1, 0.3, 1] }">
        <span class="card-glow" aria-hidden="true" />
        <span class="card-sheen" aria-hidden="true" />
        <span class="card-spine" aria-hidden="true" />

        <header class="pc-head">
          <span class="pc-ic"><component :is="meta(c.code).icon" :size="17" /></span>
          <div class="pc-id">
            <div class="pc-name">{{ c.name }}</div>
            <div class="pc-code rmb-mono">{{ c.code || '—' }}</div>
          </div>
          <span class="pc-badge" :class="byCat[c.id] ? 'gov' : 'def'">
            <component :is="byCat[c.id] ? ShieldCheck : ShieldOff" :size="11" />
            {{ byCat[c.id] ? 'Governed' : 'Defaults' }}
          </span>
          <button v-if="byCat[c.id]" class="pc-del" @click.stop="askDelete(c)" aria-label="Remove policy" title="Remove policy"><Trash2 :size="13" /></button>
        </header>

        <!-- limits -->
        <div class="pc-caps">
          <div v-for="cap in capsOf(byCat[c.id])" :key="cap.label" class="cap" :class="{ inf: cap.infinite }">
            <span class="cap-lbl">{{ cap.label }}</span>
            <b class="rmb-mono">{{ cap.value }}</b>
          </div>
        </div>

        <!-- approval route -->
        <div class="pc-route-wrap">
          <span class="route-eyebrow rmb-mono">APPROVAL ROUTE</span>
          <div class="pc-route">
            <template v-for="(s, si) in chainOf(byCat[c.id])" :key="si">
              <span v-if="si > 0" class="route-link" aria-hidden="true" />
              <span class="route-pill">
                <span class="route-ic"><component :is="approverIcon(s.approver_type)" :size="11" /></span>
                <span class="route-lbl">{{ s.label || approverLabel(s.approver_type) }}</span>
                <span v-if="s.min_amount" class="route-thr rmb-mono">≥₹{{ short(s.min_amount) }}</span>
              </span>
            </template>
          </div>
        </div>

        <Motion as="button" class="pc-cta" :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="edit(c)">
          <Settings2 :size="14" /> {{ byCat[c.id] ? 'Configure policy' : 'Set up policy' }}
        </Motion>
      </Motion>
    </div>
    <RmbEmptyState v-else :icon="ShieldCheck" title="No categories match"
                   subtitle="Switch the filter above, or add spend categories to govern." />

    <PolicyEditModal v-if="modal" :policy="editPolicy" :category-id="editCatId" :category-name="editCatName"
                     @close="modal = false" @saved="load" />
    <PolicyDeleteModal v-if="delModal && delPolicy" :policy="delPolicy" @close="delModal = false" @done="onDeleted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Settings2, RefreshCw, ShieldCheck, ShieldOff, UserCheck, Landmark, Users, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchCategories, fetchPolicies, categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbCountUp from '../components/RmbCountUp.vue'
import RmbEmptyState from '../components/RmbEmptyState.vue'
import PolicyEditModal from '../modals/PolicyEditModal.vue'
import PolicyDeleteModal from '../modals/PolicyDeleteModal.vue'

const toast = useToast()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

const categories = ref([])
const byCat = ref({})
const loading = ref(false)
const refreshing = ref(false)
const modal = ref(false)
const editPolicy = ref(null)
const editCatId = ref(null)
const editCatName = ref('')
const delModal = ref(false)
const delPolicy = ref(null)
const filter = ref('all')
const seq = ref(0)

const meta = (code) => categoryMeta(code)
// Warm governance palette — golden / yellow / teal only (no blue/violet), readable in both themes.
const POL_PALETTE = ['#f59e0b', '#eab308', '#14b8a6', '#f97316', '#0d9488', '#d97706']
const polColor = (i) => POL_PALETTE[i % POL_PALETTE.length]
const total = computed(() => categories.value.length)
const governedCount = computed(() => categories.value.filter(c => byCat.value[c.id]).length)
const coverage = computed(() => total.value ? Math.round((governedCount.value / total.value) * 100) : 0)

const avgStages = computed(() => {
  const pols = Object.values(byCat.value)
  if (!pols.length) return 0
  const sum = pols.reduce((a, p) => a + ((p.approval_chain || []).length || 0), 0)
  return sum / pols.length
})
const tightestCap = computed(() => {
  const caps = Object.values(byCat.value).map(p => p.max_amount_per_claim).filter(v => v != null && v !== '')
  return caps.length ? Math.min(...caps.map(Number)) : null
})

const FILTERS = [
  { key: 'all', label: 'All', count: () => total.value },
  { key: 'governed', label: 'Governed', count: () => governedCount.value },
  { key: 'default', label: 'Using defaults', count: () => total.value - governedCount.value },
]
const shownCats = computed(() => {
  if (filter.value === 'governed') return categories.value.filter(c => byCat.value[c.id])
  if (filter.value === 'default') return categories.value.filter(c => !byCat.value[c.id])
  return categories.value
})

const short = (n) => {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(Math.round(v))
}

const capsOf = (p) => ([
  { label: 'Per claim', value: p?.max_amount_per_claim ? '₹' + short(p.max_amount_per_claim) : '∞', infinite: !p?.max_amount_per_claim },
  { label: 'Per month', value: p?.max_amount_per_month ? '₹' + short(p.max_amount_per_month) : '∞', infinite: !p?.max_amount_per_month },
  { label: 'Claims / mo', value: p?.max_claims_per_month ? String(p.max_claims_per_month) : '∞', infinite: !p?.max_claims_per_month },
  { label: 'Receipt >', value: p?.attachment_required_above ? '₹' + short(p.attachment_required_above) : 'Always', infinite: false },
])

const DEFAULT_CHAIN = [
  { approver_type: 'MANAGER', label: 'Manager' },
  { approver_type: 'FINANCE', label: 'Finance' },
  { approver_type: 'HR', label: 'HR' },
]
const chainOf = (p) => (p?.approval_chain && p.approval_chain.length ? p.approval_chain : DEFAULT_CHAIN)
const APPROVER_ICON = { MANAGER: UserCheck, FINANCE: Landmark, HR: Users }
const approverIcon = (t) => APPROVER_ICON[t] || UserCheck
const APPROVER_LABEL = { MANAGER: 'Manager', FINANCE: 'Finance', HR: 'HR' }
const approverLabel = (t) => APPROVER_LABEL[t] || t

const onGridMove = (e) => {
  const card = e.target.closest?.('.pol-card')
  if (!card) return
  const r = card.getBoundingClientRect()
  if (!r.width || !r.height) return
  card.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  card.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
}

async function load() {
  loading.value = true
  try {
    const [cats, pols] = await Promise.all([fetchCategories(), fetchPolicies()])
    categories.value = cats.items || []
    byCat.value = Object.fromEntries((pols.items || []).map(p => [p.category_id, p]))
    seq.value++
  } catch { toast.error('Failed to load policies') }
  finally { loading.value = false }
}
const refresh = () => { refreshing.value = true; load().finally(() => setTimeout(() => { refreshing.value = false }, 700)) }
function edit(c) {
  editPolicy.value = byCat.value[c.id] || null
  editCatId.value = c.id; editCatName.value = c.name; modal.value = true
}
function askDelete(c) {
  const pol = byCat.value[c.id]
  if (!pol) return
  delPolicy.value = { ...pol, category_name: pol.category_name || c.name }
  delModal.value = true
}
function onDeleted() { delModal.value = false; load() }
onMounted(load)
</script>

<style scoped>
.rmb-policies { position: relative; display: flex; flex-direction: column; gap: 16px;
  --pol: var(--rmb-amber); --pol-soft: color-mix(in srgb, var(--rmb-amber) 16%, transparent); }
.rmb-policies > :not(.pl-atmos) { position: relative; z-index: 1; }

/* ── backdrop (violet governance skin) ── */
.pl-atmos { position: absolute; inset: -12px; z-index: 0; overflow: hidden; border-radius: 24px; pointer-events: none; }
.pl-orb { position: absolute; border-radius: 50%; filter: blur(66px); }
.pl-orb.o1 { width: 400px; height: 400px; top: -130px; left: -50px; opacity: 0.17;
  background: radial-gradient(circle, rgba(251,191,36,0.85), transparent 68%); animation: pl-drift 25s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -30px), calc((var(--my,0.5) - 0.5) * -18px), 0); }
.pl-orb.o2 { width: 340px; height: 340px; bottom: -120px; right: -30px; opacity: 0.13;
  background: radial-gradient(circle, rgba(45,212,191,0.8), transparent 70%); animation: pl-drift 30s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 26px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.pl-grid { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; -webkit-mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); mask: radial-gradient(150% 110% at 50% 0%, #000, transparent 74%); }
.pl-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.045), transparent); }
.rmb-policies .rmb-spotlight { background: radial-gradient(420px 320px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--pol) 16%, transparent), transparent 60%); }

/* ── header ── */
.pl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.pl-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--pol); }
.pl-head h2 { margin: 4px 0 5px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--rmb-text); }
.pl-head h2 .ink { background: linear-gradient(120deg, var(--rmb-amber), var(--rmb-st-settled)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.pl-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); flex-wrap: wrap; }
.pl-live { width: 6px; height: 6px; border-radius: 50%; background: var(--pol); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.pl-sep { opacity: 0.5; }
.pl-head-r { display: flex; align-items: center; gap: 12px; }
.pl-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.pl-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--rmb-amber), var(--rmb-st-settled)); animation: pl-eq 1.1s ease-in-out infinite; }
.pl-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.pl-refresh:hover { color: var(--pol); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.pl-refresh.spin :deep(svg) { animation: pl-spin 0.8s var(--rmb-ease); }

/* ── governance console ── */
.pl-console { position: relative; overflow: hidden; padding: 18px 20px 16px; border-radius: 18px;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow); }
.plc-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; border-radius: inherit;
  background: radial-gradient(120% 120% at 8% -20%, color-mix(in srgb, var(--pol) 14%, transparent), transparent 60%); }
.plc-grid { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.plc-lead { display: flex; flex-direction: column; gap: 3px; }
.plc-lbl { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-text-muted); }
.plc-big { font-family: var(--rmb-mono); font-size: 40px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; color: var(--pol);
  display: inline-flex; align-items: baseline; }
.plc-big .pct { font-size: 22px; margin-left: 2px; opacity: 0.7; }
.plc-sub { font-size: 11px; color: var(--rmb-text-muted); }
.plc-kpis { display: flex; gap: 22px; }
.plc-kpi { display: flex; flex-direction: column; gap: 2px; }
.kpi-lbl { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.plc-kpi b { font-size: 16px; font-weight: 800; color: var(--rmb-text); }

.plc-meter { position: relative; margin-top: 16px; }
.meter-bar { display: flex; height: 11px; border-radius: 999px; overflow: hidden; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.meter-seg { height: 100%; transition: width 0.8s var(--rmb-spring); position: relative; overflow: hidden; }
.meter-seg.governed { background: linear-gradient(90deg, var(--rmb-amber), var(--rmb-st-settled)); min-width: 2px; }
.meter-seg.default { background: var(--rmb-perf-color); }
.seg-flow { position: absolute; inset: 0; opacity: 0.5; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); background-size: 220% 100%; animation: rmb-amount-shimmer 2.4s linear infinite; }
.meter-legend { display: flex; gap: 18px; margin-top: 10px; }
.legend { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--rmb-text-muted); }
.legend .dot { width: 8px; height: 8px; border-radius: 3px; }
.legend .dot.governed { background: var(--pol); }
.legend .dot.default { background: var(--rmb-text-muted); opacity: 0.5; }
.legend b { color: var(--rmb-text); }

/* ── filter chips ── */
.pl-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.pl-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.25s var(--rmb-spring); }
.pl-chip:hover { border-color: var(--rmb-border-strong); transform: translateY(-1px); }
.pl-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pol); }
.pl-chip-dot[data-k="default"] { background: var(--rmb-text-muted); opacity: 0.6; }
.pl-chip-dot[data-k="all"] { background: linear-gradient(135deg, var(--rmb-amber), var(--rmb-st-settled)); }
.pl-chip-n { font-size: 10.5px; padding: 1px 7px; border-radius: 999px; background: var(--rmb-surface-elevated); color: var(--rmb-text-muted); }
.pl-chip.on { color: var(--pol); background: var(--pol-soft); border-color: color-mix(in srgb, var(--pol) 50%, transparent); }
.pl-chip.on .pl-chip-n { background: color-mix(in srgb, var(--pol) 18%, transparent); color: var(--pol); }

/* ── rule cards ── */
.pl-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 14px; }
.card-skel { height: 230px; border-radius: 16px; }
.pol-card { position: relative; padding: 16px 18px 18px 22px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; gap: 14px;
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-paper));
  border: 1px solid var(--rmb-border-soft); box-shadow: 0 10px 28px -18px rgba(0,0,0,0.6);
  transition: border-color 0.3s, box-shadow 0.3s; will-change: transform; }
.pol-card:hover { border-color: color-mix(in srgb, var(--pol) 38%, var(--rmb-border-soft));
  box-shadow: 0 24px 48px -24px color-mix(in srgb, var(--pol) 42%, rgba(0,0,0,0.5)); }
.pol-card[data-governed="false"] { opacity: 0.92; }
.card-glow { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0; border-radius: inherit; transition: opacity 0.4s ease;
  background: radial-gradient(360px 280px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--pol) 18%, transparent), transparent 60%); }
.pol-card:hover .card-glow { opacity: 1; }
.card-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 1; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--pol) 16%, transparent) 50%, transparent 56%); background-size: 240% 100%; }
.pol-card:hover .card-sheen { opacity: 1; animation: rmb-amount-shimmer 1.1s var(--rmb-ease) 1; }
.card-spine { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--cat), color-mix(in srgb, var(--cat) 30%, transparent)); box-shadow: 0 0 12px -1px var(--cat); }
.pol-card > :not(.card-glow):not(.card-sheen):not(.card-spine) { position: relative; z-index: 2; }

.pc-head { display: flex; align-items: center; gap: 11px; }
.pc-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto;
  background: color-mix(in srgb, var(--cat) 16%, transparent); color: var(--cat); }
.pc-id { flex: 1; min-width: 0; }
.pc-name { font-size: 14.5px; font-weight: 700; color: var(--rmb-text); }
.pc-code { font-size: 10px; color: var(--rmb-text-muted); letter-spacing: 0.04em; }
.pc-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em;
  padding: 4px 9px; border-radius: 999px; }
.pc-badge.gov { color: var(--pol); background: var(--pol-soft); border: 1px solid color-mix(in srgb, var(--pol) 30%, transparent); }
.pc-badge.def { color: var(--rmb-text-muted); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.pc-del { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; flex: 0 0 auto;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  opacity: 0; transform: translateX(4px); transition: opacity 0.3s, transform 0.3s var(--rmb-spring), color 0.2s, border-color 0.2s; }
.pol-card:hover .pc-del { opacity: 1; transform: translateX(0); }
.pc-del:hover { color: var(--rmb-st-rejected); border-color: color-mix(in srgb, var(--rmb-st-rejected) 45%, transparent); }

.pc-caps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cap { display: flex; flex-direction: column; gap: 2px; padding: 9px 11px; border-radius: 11px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: border-color 0.25s; }
.pol-card:hover .cap { border-color: color-mix(in srgb, var(--pol) 20%, var(--rmb-border-soft)); }
.cap-lbl { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--rmb-text-muted); }
.cap b { font-size: 14px; font-weight: 800; color: var(--rmb-text); }
.cap.inf b { color: var(--rmb-text-muted); opacity: 0.7; }

.pc-route-wrap { display: flex; flex-direction: column; gap: 7px; }
.route-eyebrow { font-size: 8.5px; letter-spacing: 0.14em; color: var(--rmb-text-muted); }
.pc-route { display: flex; align-items: center; gap: 0; flex-wrap: wrap; }
.route-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 999px; white-space: nowrap;
  font-size: 11px; font-weight: 600; color: var(--rmb-text-secondary);
  background: var(--pol-soft); border: 1px solid color-mix(in srgb, var(--pol) 26%, transparent); }
.route-ic { display: grid; place-items: center; color: var(--pol); }
.route-lbl { color: var(--rmb-text); }
.route-thr { font-size: 9px; padding: 1px 5px; border-radius: 6px; background: color-mix(in srgb, var(--pol) 16%, transparent); color: var(--pol); }
.route-link { width: 16px; height: 2px; flex: 0 0 auto; border-radius: 2px; overflow: hidden;
  background-image: linear-gradient(90deg, transparent, color-mix(in srgb, var(--pol) 0%, white) 50%, transparent), linear-gradient(var(--pol), var(--pol));
  background-size: 220% 100%, 100% 100%; opacity: 0.7; animation: rmb-amount-shimmer 2s linear infinite; }

.pc-cta { margin-top: auto; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 14px; border-radius: 11px; cursor: pointer; font-size: 12.5px; font-weight: 700;
  color: var(--pol); background: var(--pol-soft); border: 1px solid color-mix(in srgb, var(--pol) 32%, transparent); transition: background 0.25s, color 0.25s; }
.pol-card[data-governed="false"] .pc-cta { color: #2a1a06; background: linear-gradient(135deg, var(--rmb-amber), var(--rmb-st-settled)); border: none;
  box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--pol) 70%, transparent); }
.pc-cta:hover { background: color-mix(in srgb, var(--pol) 22%, transparent); }
.pol-card[data-governed="false"] .pc-cta:hover { background: linear-gradient(135deg, var(--rmb-amber), var(--rmb-st-settled)); filter: brightness(1.05); }

/* ── keyframes ── */
@keyframes pl-drift { 0%, 100% { translate: 0 0; } 50% { translate: 40px 30px; } }
@keyframes pl-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes pl-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* ── light theme ── */
:root[data-theme="light"] .pl-orb.o1 { opacity: 0.12; }
:root[data-theme="light"] .pl-orb.o2 { opacity: 0.08; }
[data-theme="light"] .pol-card[data-governed="false"] .pc-cta { color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .pl-orb, .pl-eq i, .pl-live, .seg-flow, .route-link { animation: none !important; }
  .pl-orb { transform: none !important; }
  .pol-card:hover .card-sheen { animation: none; }
}
@media (max-width: 620px) {
  .pl-head h2 { font-size: 22px; }
  .plc-grid { align-items: flex-start; }
  .plc-kpis { gap: 16px; }
}
</style>
