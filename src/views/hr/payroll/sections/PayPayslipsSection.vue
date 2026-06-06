<template>
  <div class="sec">
    <!-- ══════════ DISBURSEMENT REGISTER — hero ══════════ -->
    <Motion class="dreg" as="section"
      :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
      <span class="dr-aura" aria-hidden="true" />
      <span class="dr-grid" aria-hidden="true" />

      <div class="dr-left">
        <span class="dr-eyebrow"><ReceiptText :size="13" /> Disbursement register</span>
        <h2 class="dr-foil">Payslips</h2>
        <p>Every minted statement for {{ monthLabel(month) }} {{ year }} — track what's released, what's held, and pull any PDF on demand.</p>
        <div class="dr-kpis">
          <div class="kpi"><span class="k-dot rel" /><PayCountUp :value="counts.released" class="k-n" /><span class="k-l">released</span></div>
          <div class="kpi"><span class="k-dot held" /><PayCountUp :value="counts.held" class="k-n" /><span class="k-l">held</span></div>
          <div class="kpi"><span class="k-dot gen" /><PayCountUp :value="counts.generated" class="k-n" /><span class="k-l">generated</span></div>
          <div class="kpi net"><span class="k-dot netd" /><PayMoneyValue :value="netOnPage" tone="net" short class="k-n" /><span class="k-l">net on page</span></div>
        </div>
      </div>

      <!-- released gauge -->
      <div class="dr-gauge">
        <svg viewBox="0 0 150 150" class="g-svg">
          <circle class="g-track" cx="75" cy="75" r="62" />
          <circle class="g-fill" cx="75" cy="75" r="62" :stroke-dasharray="gaugeCirc" :stroke-dashoffset="gaugeOffset" />
        </svg>
        <span class="g-orbit" aria-hidden="true" />
        <div class="g-mid">
          <span class="g-pct">{{ releasedPct }}<i>%</i></span>
          <span class="g-cap">released</span>
          <span class="g-sub">{{ counts.released }} / {{ counts.total }} slips</span>
        </div>
      </div>
    </Motion>

    <!-- ══════════ TOOLBAR ══════════ -->
    <div class="toolbar">
      <div class="tb-period">
        <select v-model.number="month" @change="reloadAll"><option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option></select>
        <input v-model.number="year" type="number" class="yr" @change="reloadAll" />
      </div>
      <div class="chips">
        <button class="chip" :class="{ on: !status }" @click="setStatus(null)">All</button>
        <button v-for="s in ['GENERATED','RELEASED','HELD']" :key="s" class="chip" :class="[{ on: status === s }, s.toLowerCase()]" @click="setStatus(s)">{{ s }}</button>
      </div>
      <div class="tb-search"><Search :size="14" /><input v-model="q" placeholder="Filter by employee…" /></div>
    </div>

    <!-- ══════════ PAYOUT CARDS ══════════ -->
    <div v-if="loading" class="grid"><div v-for="i in 6" :key="i" class="pay-skel" style="height:168px;border-radius:18px" /></div>
    <PayEmptyState v-else-if="!filtered.length" :icon="ReceiptText" title="No payslips"
      sub="Generate and release a pay run to see payslips here." />

    <div v-else class="grid">
      <Motion v-for="(p, i) in filtered" :key="p.id" as="article" class="slip"
        :initial="{ opacity: 0, y: 18, rotateX: -12 }" :animate="{ opacity: 1, y: 0, rotateX: 0 }"
        :transition="{ duration: 0.44, delay: Math.min(i*0.045,0.5), ease: [0.16,1,0.3,1] }"
        :whileHover="{ y: -4 }" @click="open(p)">
        <span class="slip-sheen" aria-hidden="true" />
        <span class="slip-spine" :class="p.status.toLowerCase()" />

        <div class="slip-head">
          <span class="slip-avatar" :style="avatarStyle(p)">{{ initials(p) }}</span>
          <div class="slip-id">
            <b>{{ p.employee_name || p.employee_code }}</b>
            <span>{{ p.employee_code }}</span>
          </div>
          <span class="slip-seal" :class="p.status.toLowerCase()">{{ p.status }}</span>
        </div>

        <div class="slip-no"><Hash :size="11" />{{ p.payslip_no }}</div>

        <div class="slip-net">
          <span class="sn-lbl">Net pay</span>
          <PayMoneyValue class="sn-val" tone="net" :value="p.net_pay" :animate="false" />
        </div>
        <div class="slip-bar" :title="`Take-home ${pct(p.net_pay, p.gross_earnings)}%`">
          <Motion as="span" class="seg" :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
            :transition="{ duration: 0.7, delay: 0.2 + Math.min(i*0.04,0.4), ease: [0.16,1,0.3,1] }"
            :style="{ width: pct(p.net_pay, p.gross_earnings) + '%' }" />
        </div>
        <div class="slip-meta">
          <span>Gross <b><PayMoneyValue :value="p.gross_earnings" :animate="false" /></b></span>
          <span>Ded <b><PayMoneyValue tone="deduction" :value="p.total_deductions" :animate="false" /></b></span>
        </div>

        <div class="slip-acts" @click.stop>
          <button class="sic" title="View" @click="open(p)"><Eye :size="14" /></button>
          <button class="sic" title="Download PDF" @click="download(p)"><Download :size="14" /></button>
          <button v-if="canRelease(p.status)" class="sic ok" title="Release" @click="release(p)"><Check :size="14" /></button>
          <button v-if="canHold(p.status)" class="sic hold" title="Hold" @click="hold(p)"><Pause :size="14" /></button>
        </div>
      </Motion>
    </div>

    <PayPagination v-if="!loading && filtered.length" :page="page" :page-size="limit" :total-items="total"
      @update:page="p => { page = p; reload() }" @update:page-size="s => { limit = s; page = 1; reload() }" />

    <PayslipPreviewDrawer :open="drawer.open" :payslip-id="drawer.id" mode="admin" variant="modal" @close="drawer.open = false" @updated="reloadAll" />
    <PayHoldModal :open="!!holdTarget" :payslip="holdTarget" :busy="holdBusy"
      @close="holdTarget = null" @confirm="confirmHold" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, ReceiptText, Eye, Download, Check, Pause, Hash } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayPagination from '../components/PayPagination.vue'
import PayslipPreviewDrawer from '../drawers/PayslipPreviewDrawer.vue'
import PayHoldModal from '../modals/PayHoldModal.vue'
import { monthLabel } from '@/composables/usePayroll'
import { fetchPayslips, releasePayslip, holdPayslip, downloadPayslipPdf } from '@/composables/usePayslip'

const props = defineProps({ period: { type: Object, required: true } })
const toast = useToast()
const items = ref([]); const total = ref(0); const loading = ref(false)
const month = ref(props.period.month); const year = ref(props.period.year)
const status = ref(null); const q = ref(''); const page = ref(1); const limit = ref(25)
const drawer = ref({ open: false, id: null })
const counts = ref({ total: 0, released: 0, held: 0, generated: 0 })

const filtered = computed(() => {
  if (!q.value) return items.value
  const t = q.value.toLowerCase()
  return items.value.filter(p => (p.employee_name || '').toLowerCase().includes(t) || (p.employee_code || '').toLowerCase().includes(t))
})
const netOnPage = computed(() => items.value.reduce((a, p) => a + Number(p.net_pay || 0), 0))
const releasedPct = computed(() => counts.value.total ? Math.round(counts.value.released / counts.value.total * 100) : 0)
const gaugeCirc = 2 * Math.PI * 62
const gaugeOffset = computed(() => gaugeCirc * (1 - releasedPct.value / 100))

const pct = (v, g) => { const G = Number(g || 0); return G ? Math.max(0, Math.min(100, Math.round(Number(v || 0) / G * 100))) : 0 }
const initials = (p) => {
  const n = p.employee_name || p.employee_code || '?'
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
const avatarStyle = (p) => {
  const seed = ((p.employee_code || 'x').charCodeAt(0) || 0) % 3
  const grads = ['linear-gradient(135deg,#fbbf24,#b8860b)', 'linear-gradient(135deg,#f59e0b,#ea580c)', 'linear-gradient(135deg,#fde68a,#d97706)']
  return { background: grads[seed] }
}
const canRelease = (s) => ['GENERATED', 'APPROVED', 'HELD'].includes(s)
const canHold = (s) => ['GENERATED', 'APPROVED'].includes(s)

const reload = async () => {
  loading.value = true
  try {
    const res = await fetchPayslips({ year: year.value, month: month.value, status: status.value || undefined,
      skip: (page.value-1)*limit.value, limit: limit.value })
    items.value = res.items || []; total.value = res.total || 0
  } catch { toast.error('Failed to load payslips') }
  finally { loading.value = false }
}
const loadCounts = async () => {
  try {
    const [all, rel, held, gen] = await Promise.all([
      fetchPayslips({ year: year.value, month: month.value, limit: 1 }),
      fetchPayslips({ year: year.value, month: month.value, status: 'RELEASED', limit: 1 }),
      fetchPayslips({ year: year.value, month: month.value, status: 'HELD', limit: 1 }),
      fetchPayslips({ year: year.value, month: month.value, status: 'GENERATED', limit: 1 }),
    ])
    counts.value = { total: all.total || 0, released: rel.total || 0, held: held.total || 0, generated: gen.total || 0 }
  } catch { /* counts are decorative — ignore */ }
}
const reloadAll = () => { page.value = 1; reload(); loadCounts() }
const setStatus = (s) => { status.value = s; page.value = 1; reload() }
const open = (p) => { drawer.value = { open: true, id: p.id } }
const download = async (p) => {
  try { await downloadPayslipPdf(p.id, p.payslip_no) }
  catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine unavailable on server (GTK)' : 'Download failed') }
}
const release = async (p) => { try { await releasePayslip(p.id); toast.success('Released'); reloadAll() } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') } }

// Hold requires a reason — route through the modal (corporate audit trail).
const holdTarget = ref(null); const holdBusy = ref(false)
const hold = (p) => { holdTarget.value = p }
const confirmHold = async (payload) => {
  holdBusy.value = true
  try { await holdPayslip(holdTarget.value.id, payload); toast.success('Payslip held'); holdTarget.value = null; reloadAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to hold') }
  finally { holdBusy.value = false }
}
onMounted(() => { reload(); loadCounts() })
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ══════════ DISBURSEMENT REGISTER HERO ══════════ */
.dreg { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid var(--pay-border);
  padding: 26px 28px; display: flex; gap: 28px; align-items: center; justify-content: space-between; flex-wrap: wrap;
  background:
    radial-gradient(120% 130% at 6% -10%, rgba(251,191,36,0.16), transparent 52%),
    radial-gradient(120% 120% at 100% 110%, rgba(52,211,153,0.12), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 28px 80px -42px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); }
.dr-aura { position: absolute; inset: -30% auto auto -10%; width: 70%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 30% 20%, rgba(251,191,36,0.2), transparent 60%); filter: blur(16px); animation: pay-aurora-drift 12s ease-in-out infinite; }
.dr-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(80% 80% at 50% 0%, #000, transparent 75%); }

.dr-left { position: relative; z-index: 1; flex: 1; min-width: 300px; }
.dr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.13em; color: var(--pay-treasury); }
.dr-foil { margin: 9px 0 7px; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;
  background: linear-gradient(100deg, var(--pay-text) 30%, var(--pay-mint-bright) 50%, var(--pay-text) 70%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: pay-foil-text 6s linear infinite; }
.dr-left p { margin: 0 0 18px; color: var(--pay-text-2); font-size: 13.5px; line-height: 1.55; max-width: 460px; }
.dr-kpis { display: flex; gap: 22px; flex-wrap: wrap; }
.kpi { display: flex; align-items: baseline; gap: 7px; }
.k-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; align-self: center; }
.k-dot.rel { background: var(--pay-net); box-shadow: 0 0 8px rgba(52,211,153,0.6); }
.k-dot.held { background: var(--pay-danger); }
.k-dot.gen { background: var(--pay-amber); }
.k-dot.netd { background: var(--pay-net); box-shadow: 0 0 8px rgba(52,211,153,0.6); }
.k-n { font-family: var(--pay-mono); font-size: 18px; font-weight: 800; color: var(--pay-text); }
.kpi.net .k-n { color: var(--pay-net); }
.k-l { font-size: 11px; color: var(--pay-text-muted); }

/* released gauge */
.dr-gauge { position: relative; z-index: 1; width: 150px; height: 150px; flex-shrink: 0; }
.g-svg { width: 150px; height: 150px; transform: rotate(-90deg); }
.g-track { fill: none; stroke: var(--pay-border-soft); stroke-width: 11; }
.g-fill { fill: none; stroke: var(--pay-net); stroke-width: 11; stroke-linecap: round;
  transition: stroke-dashoffset 1.2s var(--pay-ease); filter: drop-shadow(0 0 8px rgba(52,211,153,0.5)); }
.g-orbit { position: absolute; inset: 6px; border-radius: 50%; border: 1.5px dashed rgba(251,191,36,0.4); animation: pay-orbit 18s linear infinite; pointer-events: none; }
.g-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.g-pct { font-family: var(--pay-mono); font-size: 34px; font-weight: 800; color: var(--pay-text); line-height: 1; }
.g-pct i { font-style: normal; font-size: 16px; color: var(--pay-net); margin-left: 1px; }
.g-cap { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-net-strong); margin-top: 3px; }
.g-sub { font-size: 10px; color: var(--pay-text-muted); margin-top: 2px; }

/* ══════════ TOOLBAR ══════════ */
.toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tb-period { display: flex; gap: 8px; }
.tb-period select, .yr { background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 10px; padding: 9px 12px; color: var(--pay-text); font-size: 13px; outline: none; }
.yr { width: 92px; }
.chips { display: flex; gap: 6px; }
.chip { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); font-size: 12px; cursor: pointer; transition: 0.18s; }
.chip:hover { color: var(--pay-text); }
.chip.on { background: rgba(251,191,36,0.14); color: var(--pay-treasury); border-color: var(--pay-border); }
.chip.released.on { background: var(--pay-net-soft); color: var(--pay-net-strong); border-color: rgba(52,211,153,0.4); }
.chip.held.on { background: var(--pay-danger-soft); color: var(--pay-danger); border-color: rgba(239,68,68,0.4); }
.tb-search { display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted); margin-left: auto; }
.tb-search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 180px; }

/* ══════════ PAYOUT CARDS ══════════ */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; perspective: 1100px; }
.slip { position: relative; overflow: hidden; cursor: pointer; border-radius: 18px; padding: 16px 17px 14px 20px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  transition: border-color 0.25s, box-shadow 0.25s; transform-style: preserve-3d; }
.slip:hover { border-color: var(--pay-border); box-shadow: 0 22px 50px -28px rgba(0,0,0,0.6); }
.slip-sheen { position: absolute; top: 0; left: 0; width: 55%; height: 100%; pointer-events: none; z-index: 0;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.10), transparent); transform: translateX(-160%); }
.slip:hover .slip-sheen { animation: pay-ingot-sheen 2.4s var(--pay-ease); }
.slip-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--pay-treasury); }
.slip-spine.released { background: var(--pay-net); }
.slip-spine.held { background: var(--pay-danger); }
.slip-spine.generated { background: var(--pay-amber); }
.slip-spine.cancelled { background: var(--pay-st-cancelled); }

.slip-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.slip-avatar { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0; color: #1a1206; font-weight: 800; font-size: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.4); }
.slip-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.slip-id b { font-size: 13.5px; color: var(--pay-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slip-id span { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); }
.slip-seal { flex-shrink: 0; font-family: var(--pay-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 7px; border: 1.5px solid currentColor; color: var(--pay-treasury); }
.slip-seal.released { color: var(--pay-net); } .slip-seal.held { color: var(--pay-danger); }
.slip-seal.generated { color: var(--pay-amber); } .slip-seal.cancelled { color: var(--pay-st-cancelled); }

.slip-no { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 4px; font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); margin: 11px 0 8px; }
.slip-net { position: relative; z-index: 1; display: flex; align-items: baseline; justify-content: space-between; }
.sn-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-net-strong); }
.sn-val { font-size: 22px; }
.slip-bar { position: relative; z-index: 1; height: 7px; border-radius: 999px; overflow: hidden; margin: 8px 0; background: var(--pay-deduction-soft); }
.slip-bar .seg { display: block; height: 100%; border-radius: 999px; transform-origin: left; background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.slip-meta { position: relative; z-index: 1; display: flex; gap: 16px; }
.slip-meta span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pay-text-muted); }
.slip-meta b { display: block; margin-top: 1px; }
.slip-meta b :deep(.pay-money) { font-size: 12px; }

.slip-acts { position: relative; z-index: 2; display: flex; gap: 6px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--pay-border-soft); }
.sic { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2);
  cursor: pointer; display: grid; place-items: center; transition: transform 0.16s var(--pay-spring), color 0.18s, border-color 0.18s, background 0.18s; }
.sic:hover { color: var(--pay-text); border-color: var(--pay-border); transform: translateY(-2px); }
.sic.ok:hover { color: var(--pay-net); border-color: rgba(52,211,153,0.4); background: var(--pay-net-soft); }
.sic.hold:hover { color: var(--pay-deduction); border-color: rgba(194,65,12,0.4); background: var(--pay-deduction-soft); }

@media (max-width: 760px) {
  .dreg { flex-direction: column; align-items: stretch; }
  .dr-gauge { align-self: center; }
  .tb-search { margin-left: 0; width: 100%; } .tb-search input { width: 100%; }
  .grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .dr-aura, .dr-foil, .g-orbit, .slip:hover .slip-sheen { animation: none !important; }
  .dr-foil { -webkit-text-fill-color: var(--pay-text); }
}

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .dreg {
  background:
    radial-gradient(120% 130% at 6% -10%, rgba(245,158,11,0.14), transparent 52%),
    radial-gradient(120% 120% at 100% 110%, rgba(5,150,105,0.10), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 24px 60px -40px rgba(40,25,10,0.3), inset 0 1px 0 rgba(255,255,255,0.6); }
[data-theme="light"] .dr-foil {
  background: linear-gradient(100deg, var(--pay-text) 35%, #d97706 50%, var(--pay-text) 65%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
[data-theme="light"] .g-fill { filter: drop-shadow(0 0 6px rgba(5,150,105,0.35)); }
[data-theme="light"] .dr-grid { opacity: 0.4;
  background-image: linear-gradient(rgba(184,134,11,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(184,134,11,0.07) 1px, transparent 1px); }
[data-theme="light"] .slip { background: rgba(255,250,240,0.72); }
</style>
