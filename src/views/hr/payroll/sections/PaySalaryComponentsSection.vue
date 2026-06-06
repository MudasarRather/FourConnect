<template>
  <div class="sec">
    <!-- ── category command band ── -->
    <div class="reg-band">
      <Motion as="button" class="cat-tile" :class="{ on: !filter }" @click="setFilter(null)"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16,1,0.3,1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }">
        <span class="ct-ic all"><Boxes :size="16" /></span>
        <span class="ct-meta"><b><PayCountUp :value="all.length" /></b><small>All heads</small></span>
        <span class="ct-rail" />
      </Motion>
      <Motion v-for="(c, i) in CATS" :key="c.key" as="button" class="cat-tile" :class="[c.cat, { on: filter === c.key }]"
        @click="setFilter(c.key)"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: (i+1)*0.06, ease: [0.16,1,0.3,1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }">
        <span class="ct-ic" :class="c.cat"><component :is="c.icon" :size="16" /></span>
        <span class="ct-meta"><b><PayCountUp :value="countOf(c.key)" /></b><small>{{ c.label }}</small></span>
        <span class="ct-rail" />
      </Motion>
    </div>

    <!-- ── toolbar ── -->
    <div class="reg-tools">
      <span class="reg-eyebrow"><FlaskConical :size="13" /> Component registry · {{ filtered.length }} {{ filtered.length === 1 ? 'head' : 'heads' }}</span>
      <div class="rt-right">
        <label class="search"><Search :size="14" /><input v-model="q" type="text" placeholder="Search code or name…" /></label>
        <Motion as="button" class="add-btn" @click="openCreate" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
          <Plus :size="15" /> Add component
        </Motion>
      </div>
    </div>

    <!-- ── states ── -->
    <div v-if="loading" class="lab-skel"><div v-for="i in 6" :key="i" class="pay-skel" style="height:66px" /></div>
    <PayEmptyState v-else-if="!all.length" :icon="ListTree" title="No components yet"
      sub="Define earning, deduction and statutory heads to build salary structures.">
      <button class="add-btn" @click="openCreate"><Plus :size="15" /> Add your first component</button>
    </PayEmptyState>
    <PayEmptyState v-else-if="!filtered.length" :icon="Search" title="Nothing here"
      :sub="q ? `No component matches “${q}”.` : 'No components in this category.'" />

    <!-- ── registry matrix ── -->
    <div v-else class="matrix">
      <div class="mhead">
        <span class="mh-el">#</span>
        <span>Component</span>
        <span>Calculation</span>
        <span class="mh-flags">Wage treatment</span>
        <span class="mh-acts" />
      </div>
      <Motion v-for="(c, i) in filtered" :key="c.id" as="div" class="mrow" :class="catOf(c)"
        :initial="{ opacity: 0, x: -18 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.42, delay: Math.min(i*0.035, 0.5), ease: [0.16,1,0.3,1] }">
        <span class="mr-stripe" aria-hidden="true" />
        <span class="mr-sheen" aria-hidden="true" />

        <!-- element tile -->
        <span class="elem" :class="catOf(c)">
          <span class="elem-seq">{{ c.sequence }}</span>
          <span class="elem-sym">{{ symbol(c) }}</span>
          <span class="elem-ic"><component :is="typeIcon(c)" :size="11" /></span>
        </span>

        <!-- identity -->
        <div class="mr-id">
          <div class="mr-name">{{ c.name }}<Lock v-if="c.is_system" :size="11" class="sys" /></div>
          <div class="mr-sub"><code>{{ c.code }}</code><span class="dot">·</span>{{ categoryMeta(c.component_type).label }}</div>
        </div>

        <!-- calc visualization -->
        <div class="mr-calc">
          <template v-if="calcView(c).kind === 'pct'">
            <svg class="ring" viewBox="0 0 34 34">
              <circle class="ring-bg" cx="17" cy="17" r="14" />
              <circle class="ring-arc" :class="catOf(c)" cx="17" cy="17" r="14" transform="rotate(-90 17 17)"
                :style="ringStyle(calcView(c).pct)" />
            </svg>
            <div class="calc-txt"><b>{{ fmtPct(calcView(c).pct) }}%</b><small>of {{ calcView(c).base }}</small></div>
          </template>
          <template v-else-if="calcView(c).kind === 'flat'">
            <span class="calc-ic"><Banknote :size="15" /></span>
            <div class="calc-txt"><b>{{ inr(calcView(c).amount) }}</b><small>{{ calcView(c).note || 'flat' }}</small></div>
          </template>
          <template v-else-if="calcView(c).kind === 'stat'">
            <span class="calc-ic statutory"><Landmark :size="15" /></span>
            <div class="calc-txt"><b>{{ calcView(c).label }}</b><small>statutory</small></div>
          </template>
          <template v-else-if="calcView(c).kind === 'formula'">
            <span class="calc-ic formula"><Sigma :size="15" /></span>
            <div class="calc-txt"><b class="fx">{{ calcView(c).text }}</b><small>formula</small></div>
          </template>
          <template v-else>
            <span class="calc-ic"><Scale :size="15" /></span>
            <div class="calc-txt"><b>{{ calcView(c).label || 'Balance' }}</b><small>derived</small></div>
          </template>
        </div>

        <!-- wage-treatment flag matrix (all six, active vs dimmed) -->
        <div class="mr-flags">
          <span v-for="fl in flagsOf(c)" :key="fl.k" class="flag" :class="[fl.k, { on: fl.on }]" :title="`${fl.title}: ${fl.on ? 'yes' : 'no'}`">{{ fl.label }}</span>
        </div>

        <!-- actions -->
        <div class="mr-acts">
          <Motion as="button" class="ic" @click="openEdit(c)" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Edit"><Pencil :size="14" /></Motion>
          <Motion v-if="!c.is_system" as="button" class="ic danger" @click="remove(c)" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" title="Delete"><Trash2 :size="14" /></Motion>
        </div>
      </Motion>
    </div>

    <PayComponentModal :open="modal.open" :component="modal.component"
      @close="modal.open = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Search, Plus, Lock, Pencil, Trash2, ListTree, Boxes, FlaskConical,
  ArrowUpRight, ArrowDownRight, Landmark, Building2, Receipt, Banknote, Sigma, Scale,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayComponentModal from '../modals/PayComponentModal.vue'
import { COMPONENT_CATEGORIES, categoryMeta, calcMeta, inr, fetchComponents, deleteComponent } from '@/composables/usePayroll'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const all = ref([])
const loading = ref(false)
const q = ref('')
const filter = ref(null)
const modal = ref({ open: false, component: null })

const TYPE_ICON = {
  EARNING: ArrowUpRight, DEDUCTION: ArrowDownRight, STATUTORY_DEDUCTION: Landmark,
  EMPLOYER_CONTRIBUTION: Building2, REIMBURSEMENT: Receipt,
}
const CATS = COMPONENT_CATEGORIES.map(c => ({ ...c, icon: TYPE_ICON[c.key] || Boxes }))
const catOf = (c) => categoryMeta(c.component_type).cat
const typeIcon = (c) => TYPE_ICON[c.component_type] || Boxes
const symbol = (c) => (c.code || '??').replace(/[^A-Za-z]/g, '').slice(0, 2) || (c.code || '?').slice(0, 2)

const countOf = (key) => all.value.filter(c => c.component_type === key).length

const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  return all.value.filter(c => {
    if (filter.value && c.component_type !== filter.value) return false
    if (t && !((c.name || '').toLowerCase().includes(t) || (c.code || '').toLowerCase().includes(t))) return false
    return true
  })
})

const calcView = (c) => {
  switch (c.calc_type) {
    case 'PERCENT_OF': return { kind: 'pct', pct: Number(c.percent_value || 0) * 100, base: c.percent_of_code || 'BASIC' }
    case 'FLAT': return { kind: 'flat', amount: c.flat_amount || 0 }
    case 'ATTENDANCE_PRORATED': return { kind: 'flat', amount: c.flat_amount || 0, note: 'attendance' }
    case 'STATUTORY': return { kind: 'stat', label: (c.statutory_kind || 'Statutory').replace(/_/g, ' ') }
    case 'FORMULA': return { kind: 'formula', text: c.formula || 'formula' }
    case 'BALANCE': return { kind: 'balance', label: 'Balance → gross' }
    default: return { kind: 'other', label: calcMeta(c.calc_type).label }
  }
}
const FLAG_DEFS = [
  { k: 'tax', key: 'is_taxable', label: 'TAX', title: 'Taxable' },
  { k: 'gross', key: 'is_part_of_gross', label: 'GROSS', title: 'Part of gross' },
  { k: 'pf', key: 'affects_pf_wage', label: 'PF', title: 'Affects PF wage' },
  { k: 'esi', key: 'affects_esi_wage', label: 'ESI', title: 'Affects ESI wage' },
  { k: 'lop', key: 'prorate_on_lop', label: 'LOP', title: 'Pro-rated on loss of pay' },
  { k: 'empr', key: 'is_employer_cost', label: 'EMPR', title: 'Employer cost' },
]
// Always return all six so the column stays uniform across rows (active vs. dimmed).
const flagsOf = (c) => FLAG_DEFS.map(f => ({ ...f, on: !!c[f.key] }))

const C = 2 * Math.PI * 14
// Round to 2 dp and drop only *decimal* trailing zeros (40 → "40", 33.50 → "33.5").
const fmtPct = (p) => String(Math.round(Number(p) * 100) / 100)
const ringStyle = (pct) => ({
  '--ring-circ': C.toFixed(2),
  strokeDasharray: C.toFixed(2),
  strokeDashoffset: (C * (1 - Math.min(100, pct) / 100)).toFixed(2),
})

const reload = async () => {
  loading.value = true
  try { all.value = (await fetchComponents({ limit: 200 })).items || [] }
  catch { toast.error('Failed to load components') }
  finally { loading.value = false }
}
const setFilter = (k) => { filter.value = k }
const openCreate = () => { modal.value = { open: true, component: null } }
const openEdit = (c) => { modal.value = { open: true, component: c } }
const onSaved = () => { reload(); emit('refresh-stats') }
const remove = async (c) => {
  if (!confirm(`Delete component "${c.name}"?`)) return
  try { await deleteComponent(c.id); toast.success('Component deleted'); reload(); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
}
onMounted(reload)
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }

/* category colours */
.earning  { --c: var(--pay-mint); }
.deduction{ --c: var(--pay-deduction); }
.statutory{ --c: var(--pay-statutory); }
.employer { --c: var(--pay-net); }

/* ════════ category command band ════════ */
.reg-band { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.cat-tile { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; cursor: pointer;
  padding: 14px 16px; border-radius: 16px; text-align: left;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); transition: border-color 0.25s, background 0.25s; }
.cat-tile:hover { border-color: var(--pay-border); }
.cat-tile.on { border-color: color-mix(in srgb, var(--c, var(--pay-treasury)) 55%, transparent);
  background: linear-gradient(150deg, color-mix(in srgb, var(--c, var(--pay-treasury)) 14%, transparent), var(--pay-surface)); }
.ct-ic { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0;
  color: var(--c, var(--pay-treasury)); background: color-mix(in srgb, var(--c, var(--pay-treasury)) 16%, transparent); }
.ct-ic.all { --c: var(--pay-treasury); }
.ct-meta { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
.ct-meta b { font-family: var(--pay-mono); font-size: 22px; font-weight: 800; color: var(--pay-text); }
.ct-meta small { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.ct-rail { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; transform: scaleX(0); transform-origin: left;
  background: var(--c, var(--pay-treasury)); transition: transform 0.4s var(--pay-spring); }
.cat-tile.on .ct-rail { transform: scaleX(1); }

/* ════════ toolbar ════════ */
.reg-tools { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.reg-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--pay-mono); font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-treasury); }
.rt-right { display: flex; align-items: center; gap: 10px; }
.search { display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 11px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted); transition: border-color 0.2s; }
.search:focus-within { border-color: var(--pay-border); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 170px; }
.add-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px;
  border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 13px;
  box-shadow: 0 10px 26px -12px rgba(245,158,11,0.7); }

.lab-skel { display: flex; flex-direction: column; gap: 8px; }

/* ════════ registry matrix ════════
   Shared, FIXED column track so every row aligns regardless of content.
   --grid: element | identity(flex) | calculation | wage-treatment | actions */
.matrix { display: flex; flex-direction: column; gap: 8px; }
.matrix { --mcols: 54px minmax(0, 1fr) 232px 184px 76px; }
.mhead { display: grid; grid-template-columns: var(--mcols); gap: 16px; align-items: center;
  padding: 2px 16px 4px 18px; }
.mhead span { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-text-muted); }
.mhead .mh-el { text-align: center; }
.mhead .mh-flags { text-align: left; }
.mrow { position: relative; overflow: hidden; display: grid; align-items: center; gap: 16px;
  grid-template-columns: var(--mcols);
  padding: 12px 16px 12px 18px; border-radius: 15px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  transition: border-color 0.25s, box-shadow 0.3s, transform 0.25s; }
.mrow:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); transform: translateX(3px);
  box-shadow: 0 18px 44px -28px color-mix(in srgb, var(--c) 80%, black); }
.mr-stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c);
  box-shadow: 0 0 10px -1px var(--c); transform: scaleY(0.4); opacity: 0.6; transition: transform 0.3s, opacity 0.3s; }
.mrow:hover .mr-stripe { transform: scaleY(1); opacity: 1; }
.mr-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 32%; transform: translateX(-220%); pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); }
.mrow:hover .mr-sheen { animation: pay-foil-sweep 0.9s var(--pay-ease); }

/* element tile */
.elem { position: relative; width: 50px; height: 50px; border-radius: 13px; display: grid; place-items: center;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 30%, transparent), color-mix(in srgb, var(--c) 8%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); overflow: hidden;
  transition: transform 0.4s var(--pay-spring); }
.mrow:hover .elem { transform: rotate(-4deg) scale(1.06); }
.elem-sym { font-family: var(--pay-mono); font-size: 17px; font-weight: 800; color: var(--pay-text); line-height: 1; }
.elem-seq { position: absolute; top: 3px; left: 5px; font-family: var(--pay-mono); font-size: 8px; color: var(--pay-text-muted); }
.elem-ic { position: absolute; bottom: 3px; right: 4px; color: var(--c); display: grid; place-items: center; }

/* identity */
.mr-id { min-width: 0; }
.mr-name { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--pay-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mr-name .sys { color: var(--pay-text-muted); flex-shrink: 0; }
.mr-sub { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--pay-text-muted); margin-top: 2px; }
.mr-sub code { font-family: var(--pay-mono); color: var(--pay-treasury); }
.mr-sub .dot { opacity: 0.5; }

/* calc viz */
.mr-calc { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ring { width: 34px; height: 34px; flex-shrink: 0; }
.ring-bg { fill: none; stroke: var(--pay-border-soft); stroke-width: 4; }
.ring-arc { fill: none; stroke: var(--c); stroke-width: 4; stroke-linecap: round;
  animation: pay-ring-sweep 0.9s var(--pay-ease) both; }
.calc-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.calc-ic.statutory { color: var(--pay-statutory); background: var(--pay-statutory-soft); }
.calc-ic.formula { color: var(--pay-treasury); background: rgba(251,191,36,0.12); }
.calc-txt { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.calc-txt b { font-family: var(--pay-mono); font-size: 14px; font-weight: 700; color: var(--pay-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calc-txt b.fx { font-size: 11.5px; color: var(--pay-text-2); }
.calc-txt small { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }

/* wage-treatment flag matrix — fixed 3×2 grid, all six always shown */
.mr-flags { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.flag { font-family: var(--pay-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.03em; text-align: center;
  padding: 3px 4px; border-radius: 6px; background: transparent; color: var(--pay-text-muted);
  border: 1px solid var(--pay-border-soft); opacity: 0.42; transition: opacity 0.2s; }
.flag.on { opacity: 1; }
.flag.on.tax { color: var(--pay-mint); background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); }
.flag.on.gross { color: var(--pay-net); background: var(--pay-net-soft); border-color: rgba(52,211,153,0.3); }
.flag.on.pf, .flag.on.esi { color: var(--pay-statutory); background: var(--pay-statutory-soft); border-color: rgba(146,64,14,0.3); }
.flag.on.lop { color: var(--pay-deduction); background: var(--pay-deduction-soft); border-color: rgba(194,65,12,0.3); }
.flag.on.empr { color: var(--pay-treasury); background: rgba(184,134,11,0.14); border-color: rgba(184,134,11,0.3); }

/* actions */
.mr-acts { display: flex; gap: 6px; opacity: 0.45; transition: opacity 0.25s; }
.mrow:hover .mr-acts { opacity: 1; }
.ic { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; transition: color 0.2s, border-color 0.2s; }
.ic:hover { color: var(--pay-treasury); border-color: var(--pay-border); }
.ic.danger:hover { color: var(--pay-deduction); border-color: rgba(194,65,12,0.4); }

@media (max-width: 880px) {
  .matrix { --mcols: 46px 1fr auto; }
  .mhead { display: none; }
  .mrow { row-gap: 10px; }
  .elem { grid-row: span 2; }
  .mr-calc { grid-column: 2 / -1; }
  .mr-flags { grid-column: 2 / -1; grid-template-columns: repeat(6, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  .mr-sheen, .ring-arc { animation: none !important; }
  .ct-rail { transition: none; }
}

/* ════════════════════════════════ LIGHT THEME ════════════════════════════════ */
[data-theme="light"] .ring-bg { stroke: rgba(120,53,15,0.16); }
[data-theme="light"] .mr-sheen { background: linear-gradient(90deg, transparent, rgba(217,119,6,0.16), transparent); }
[data-theme="light"] .flag { background: rgba(255,250,240,0.85); }
[data-theme="light"] .search,
[data-theme="light"] .ic { background: rgba(255,250,240,0.85); }
[data-theme="light"] .elem-sym { color: #2a1c06; }
</style>
