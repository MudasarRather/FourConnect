<template>
  <div class="tds">
    <!-- ░░░░░░░░░░ DEPOSIT CONSOLE (hero) ░░░░░░░░░░ -->
    <div class="console">
      <span class="console-grid" aria-hidden="true" />
      <div class="con-info">
        <span class="eyebrow"><Landmark :size="12" /> TDS · WITHHOLDING · FY {{ fy }}</span>
        <h2 class="con-title pay-foil-text">Remittance Manifest</h2>
        <p class="con-sub">Tax deducted at source from each payslip, pooled for deposit to the government via challan ITNS-281 — due by the <b>7th of {{ nextMonthLabel }}</b>.</p>
        <div class="con-stats">
          <div class="cs"><span>TDS this period</span><b class="cs-ded"><PayMoneyValue tone="deduction" :value="totalPeriod" short /></b></div>
          <div class="cs"><span>TDS year-to-date</span><b><PayMoneyValue :value="ytdTotal" short /></b></div>
          <div class="cs"><span>On manifest</span><b>{{ count }}</b></div>
        </div>
      </div>

      <!-- deposit-deadline ring -->
      <div class="due" :class="dueState">
        <svg class="due-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle class="due-track" cx="32" cy="32" r="27" />
          <circle class="due-arc" cx="32" cy="32" r="27" :style="{ strokeDashoffset: dueOffset }" />
        </svg>
        <div class="due-face">
          <span class="due-n">{{ dueState === 'passed' ? '—' : daysLeft }}</span>
          <span class="due-u">{{ dueState === 'passed' ? 'closed' : (daysLeft === 1 ? 'day left' : 'days left') }}</span>
        </div>
        <div class="due-foot"><ArrowDownToLine :size="12" /> Deposit by 7 {{ nextMonthShort }}</div>
      </div>
    </div>

    <!-- ░░░░░░░░░░ WITHHOLDING DISTRIBUTION ░░░░░░░░░░ -->
    <div v-if="!loading && distribution.length" class="dist">
      <div class="dist-head"><Receipt :size="13" /> Where the {{ inrShort(totalPeriod) }} comes from</div>
      <div class="dist-bar">
        <span v-for="(d, i) in distribution" :key="d.id" class="dist-seg" :style="{ width: d.pct + '%', '--c': SEG[i % SEG.length], '--i': i }" :title="`${d.name} · ${inr(d.value)}`" />
      </div>
      <div class="dist-legend">
        <span v-for="(d, i) in distribution.slice(0, 6)" :key="d.id" class="dl"><i :style="{ background: SEG[i % SEG.length] }" /> {{ d.name }} · {{ Math.round(d.pct) }}%</span>
      </div>
    </div>

    <!-- ░░░░░░░░░░ CONTROL BAR ░░░░░░░░░░ -->
    <div class="deck">
      <div class="period">
        <div class="sel-wrap">
          <select v-model.number="month" @change="reload"><option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option></select>
          <ChevronDown :size="14" class="sel-caret" />
        </div>
        <input v-model.number="year" type="number" class="yr" @change="reload" />
      </div>
      <div class="search" :class="{ on: searchFocused }">
        <Search :size="15" />
        <input v-model="q" placeholder="Find employee or PAN…" @focus="searchFocused = true" @blur="searchFocused = false" />
      </div>
    </div>

    <!-- ░░░░░░░░░░ MANIFEST ░░░░░░░░░░ -->
    <div v-if="loading" class="manifest">
      <div v-for="i in 6" :key="i" class="slip skel"><div class="pay-skel" style="height:48px;border-radius:12px" /></div>
    </div>

    <PayEmptyState v-else-if="!filtered.length" :icon="Landmark"
      :title="q ? 'No match on the manifest' : 'No TDS for this period'"
      :sub="q ? 'Clear the search to see all entries.' : 'TDS appears once payroll is generated for the month — it is summed from each payslip\'s TDS line.'" />

    <template v-else>
      <div class="manifest">
        <article v-for="(r, i) in pageItems" :key="r.employee_id" class="slip" :style="{ '--i': i }"
          @pointermove="spot" @pointerleave="unspot">
          <span class="slip-spot" aria-hidden="true" />
          <div class="slip-who">
            <span class="slip-av">{{ initials(r) }}</span>
            <div class="slip-meta">
              <span class="slip-name">{{ r.employee_name || r.employee_code }}</span>
              <span class="slip-sub"><span class="slip-code">{{ r.employee_code }}</span><span class="slip-pan">PAN {{ r.pan || '—' }}</span></span>
            </div>
          </div>

          <div class="slip-bar-wrap">
            <div class="slip-bar"><span class="slip-fill" :style="{ width: sharePct(r) + '%', '--i': i }" /></div>
            <span class="slip-share">{{ totalPeriod ? Math.round((Number(r.tds_period) / totalPeriod) * 100) : 0 }}% of pool</span>
          </div>

          <div class="slip-amts">
            <div class="amt period"><span>This month</span><PayMoneyValue tone="deduction" :value="r.tds_period" :animate="false" /></div>
            <div class="amt ytd"><span>YTD</span><PayMoneyValue :value="r.tds_ytd" :animate="false" /></div>
          </div>
        </article>
      </div>

      <!-- pagination -->
      <nav v-if="totalPages > 1" class="pager">
        <span class="pg-readout">ENTRIES <strong>{{ rangeLabel }}</strong> / {{ filtered.length }}</span>
        <div class="pg-mid">
          <button class="pg-stamp nav" :disabled="page <= 1" @click="go(page - 1)"><ChevronLeft :size="16" /></button>
          <button v-for="p in windowPages" :key="p" class="pg-stamp" :class="{ on: p === page }" @click="go(p)">{{ p }}</button>
          <button class="pg-stamp nav" :disabled="page >= totalPages" @click="go(page + 1)"><ChevronRight :size="16" /></button>
        </div>
        <div class="pg-size"><span>per page</span>
          <button v-for="n in sizes" :key="n" class="sz" :class="{ on: n === pageSize }" @click="setSize(n)">{{ n }}</button>
        </div>
      </nav>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Landmark, Receipt, Search, ChevronDown, ChevronLeft, ChevronRight, ArrowDownToLine } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { monthLabel, inr, inrShort, fyLabel } from '@/composables/usePayroll'
import { fetchTdsSummary } from '@/composables/usePayrollExtra'

const toast = useToast()
const now = new Date()
const month = ref(now.getMonth() + 1); const year = ref(now.getFullYear())
const data = ref(null); const loading = ref(false)
const q = ref(''); const searchFocused = ref(false)
const page = ref(1); const pageSize = ref(10); const sizes = [10, 25, 50]
const fy = fyLabel()
const SEG = ['#fbbf24', '#f59e0b', '#ea580c', '#b8860b', '#d97706', '#92400e', '#fde68a']

const initials = (r) => (r.employee_name || r.employee_code || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const items = computed(() => data.value?.items || [])
const totalPeriod = computed(() => Number(data.value?.total_tds_period || 0))
const ytdTotal = computed(() => items.value.reduce((s, r) => s + Number(r.tds_ytd || 0), 0))
const count = computed(() => data.value?.total || 0)
const maxPeriod = computed(() => items.value.reduce((m, r) => Math.max(m, Number(r.tds_period || 0)), 0))
const sharePct = (r) => { const m = maxPeriod.value; return m ? Math.max(3, (Number(r.tds_period || 0) / m) * 100) : 0 }

/* distribution — top contributors by period TDS */
const distribution = computed(() => {
  if (!totalPeriod.value) return []
  return [...items.value]
    .filter(r => Number(r.tds_period) > 0)
    .sort((a, b) => Number(b.tds_period) - Number(a.tds_period))
    .slice(0, 7)
    .map(r => ({ id: r.employee_id, name: r.employee_name || r.employee_code, value: Number(r.tds_period),
      pct: (Number(r.tds_period) / totalPeriod.value) * 100 }))
})

/* statutory deposit deadline — 7th of the month AFTER the selected period */
const dueDate = computed(() => new Date(month.value === 12 ? year.value + 1 : year.value, month.value % 12, 7))
const nextMonthLabel = computed(() => monthLabel(month.value === 12 ? 1 : month.value + 1))
const nextMonthShort = computed(() => nextMonthLabel.value.slice(0, 3))
const daysLeft = computed(() => Math.max(0, Math.ceil((dueDate.value - now) / 86400000)))
const dueState = computed(() => (now > dueDate.value ? 'passed' : (daysLeft.value <= 3 ? 'urgent' : 'ok')))
const RING_C = 2 * Math.PI * 27
const dueOffset = computed(() => {
  // progress = elapsed of the deposit window (period-month start → due) toward the due date
  const start = new Date(year.value, month.value - 1, 1)
  const total = dueDate.value - start
  const elapsed = Math.min(total, Math.max(0, now - start))
  const p = total > 0 ? elapsed / total : 1
  return RING_C * (1 - (dueState.value === 'passed' ? 1 : p))
})

/* filter + paginate */
const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  if (!t) return items.value
  return items.value.filter(r => (r.employee_name || '').toLowerCase().includes(t) ||
    (r.employee_code || '').toLowerCase().includes(t) || (r.pan || '').toLowerCase().includes(t))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const windowStart = computed(() => Math.max(1, Math.min(page.value - 2, totalPages.value - 4)))
const windowPages = computed(() => { const end = Math.min(totalPages.value, windowStart.value + 4); const out = []; for (let i = windowStart.value; i <= end; i++) out.push(i); return out })
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const rangeLabel = computed(() => { const tot = filtered.value.length; if (!tot) return '0'; const a = (page.value - 1) * pageSize.value + 1; return `${a}–${Math.min(page.value * pageSize.value, tot)}` })
const go = (p) => { if (p < 1 || p > totalPages.value || p === page.value) return; page.value = p }
const setSize = (n) => { pageSize.value = n; page.value = 1 }
watch(q, () => { page.value = 1 })

/* spotlight */
const spot = (e) => { const el = e.currentTarget, b = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); el.style.setProperty('--sp', '1') }
const unspot = (e) => e.currentTarget.style.setProperty('--sp', '0')

const reload = async () => {
  loading.value = true; page.value = 1
  try { data.value = await fetchTdsSummary(year.value, month.value) }
  catch { toast.error('Failed to load TDS summary') }
  finally { loading.value = false }
}
onMounted(reload)
</script>

<style scoped>
.tds { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }

/* ░░░░░░░░░░ DEPOSIT CONSOLE ░░░░░░░░░░ */
.console { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; gap: 26px;
  flex-wrap: wrap; justify-content: space-between; padding: 24px 26px; border-radius: 22px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8);
  animation: pay-rise 0.55s var(--pay-ease) both; }
.console::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; opacity: 0.7;
  background: linear-gradient(140deg, rgba(146,64,14,0.5), transparent 38%, transparent 62%, rgba(184,134,11,0.32));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.console-grid { position: absolute; inset: 0; z-index: -1; opacity: 0.4; pointer-events: none;
  background-image: linear-gradient(var(--pay-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--pay-border-soft) 1px, transparent 1px);
  background-size: 24px 24px; -webkit-mask: radial-gradient(130% 90% at 100% 50%, #000, transparent 72%); mask: radial-gradient(130% 90% at 100% 50%, #000, transparent 72%); }
.con-info { min-width: 0; flex: 1; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.13em; color: var(--pay-statutory); }
.eyebrow svg { color: var(--pay-amber); }
.con-title { margin: 7px 0 0; font-size: 27px; font-weight: 850; letter-spacing: -0.01em; }
.con-sub { margin: 8px 0 16px; font-size: 12.5px; color: var(--pay-text-2); max-width: 58ch; line-height: 1.5; } .con-sub b { color: var(--pay-text); }
.con-stats { display: flex; flex-wrap: wrap; gap: 22px; }
.cs { display: flex; flex-direction: column; gap: 3px; }
.cs span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.cs b { font-family: var(--pay-mono); font-size: 18px; font-weight: 800; color: var(--pay-text); }
.cs b.cs-ded { color: var(--pay-deduction); }

/* deadline ring */
.due { position: relative; flex: none; width: 150px; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 16px; border-radius: 16px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.due-ring { width: 96px; height: 96px; transform: rotate(-90deg); }
.due-track { fill: none; stroke: var(--pay-border-soft); stroke-width: 6; }
.due-arc { fill: none; stroke: var(--pay-amber); stroke-width: 6; stroke-linecap: round;
  stroke-dasharray: 169.6; transition: stroke-dashoffset 1.1s var(--pay-ease); animation: due-draw 1.1s var(--pay-ease) both; }
.due.urgent .due-arc { stroke: var(--pay-deduction); }
.due.passed .due-arc { stroke: var(--pay-st-cancelled); }
.due-face { position: absolute; top: 30px; display: flex; flex-direction: column; align-items: center; }
.due-n { font-family: var(--pay-mono); font-size: 26px; font-weight: 850; color: var(--pay-text); line-height: 1; }
.due.urgent .due-n { color: var(--pay-deduction); }
.due-u { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); margin-top: 2px; }
.due-foot { display: inline-flex; align-items: center; gap: 5px; font-family: var(--pay-mono); font-size: 10px; color: var(--pay-treasury); }
.due-foot svg { color: var(--pay-amber); }

/* ░░░░░░░░░░ DISTRIBUTION ░░░░░░░░░░ */
.dist { padding: 16px 18px; border-radius: 16px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  animation: pay-rise 0.5s var(--pay-ease) 0.06s both; }
.dist-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--pay-text-muted); margin-bottom: 11px; } .dist-head svg { color: var(--pay-treasury); }
.dist-bar { display: flex; height: 16px; border-radius: 99px; overflow: hidden; background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.dist-seg { height: 100%; background: var(--c); transform-origin: left; animation: seg-grow 0.7s var(--pay-ease) both; animation-delay: calc(var(--i) * 0.07s);
  box-shadow: inset -1px 0 0 rgba(0,0,0,0.15); }
.dist-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 11px; }
.dl { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pay-text-2); }
.dl i { width: 9px; height: 9px; border-radius: 3px; }

/* ░░░░░░░░░░ CONTROL BAR ░░░░░░░░░░ */
.deck { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.period { display: flex; gap: 8px; }
.sel-wrap { position: relative; }
.period select, .yr { background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 11px; padding: 9px 12px; color: var(--pay-text); font-size: 13px; outline: none; }
.period select { appearance: none; padding-right: 32px; cursor: pointer; }
.sel-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--pay-text-muted); pointer-events: none; }
.yr { width: 92px; }
.search { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease); min-width: 220px; }
.search.on { border-color: var(--pay-amber); box-shadow: 0 0 0 4px rgba(245,158,11,0.12); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 100%; }

/* ░░░░░░░░░░ MANIFEST ░░░░░░░░░░ */
.manifest { display: flex; flex-direction: column; gap: 9px; }
.slip { position: relative; overflow: hidden; isolation: isolate; display: grid; grid-template-columns: minmax(180px, 1.2fr) 1.4fr auto;
  align-items: center; gap: 18px; padding: 13px 16px; border-radius: 14px;
  background: linear-gradient(100deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 26px -22px rgba(0,0,0,0.7);
  transition: transform 0.3s var(--pay-ease), border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease);
  animation: pay-rise 0.45s var(--pay-ease) both; animation-delay: calc(var(--i) * 0.04s); }
.slip.skel { display: block; animation: none; }
.slip:hover { transform: translateY(-3px); border-color: var(--pay-border); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 40px -24px rgba(146,64,14,0.4); }
.slip-spot { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; opacity: var(--sp, 0); transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(146,64,14,0.16), transparent 60%); }
.slip-who { display: flex; align-items: center; gap: 11px; min-width: 0; }
.slip-av { flex: none; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-family: var(--pay-mono);
  font-size: 12px; font-weight: 800; color: var(--pay-statutory); background: var(--pay-statutory-soft); border: 1px solid var(--pay-border-soft); }
.slip-meta { min-width: 0; }
.slip-name { display: block; color: var(--pay-text); font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slip-sub { display: flex; align-items: center; gap: 9px; margin-top: 3px; }
.slip-code { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); }
.slip-pan { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-2); padding: 1px 7px; border-radius: 5px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.slip-bar-wrap { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.slip-bar { height: 8px; border-radius: 99px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); overflow: hidden; }
.slip-fill { display: block; height: 100%; border-radius: 99px; transform-origin: left;
  background: linear-gradient(90deg, var(--pay-amber), var(--pay-deduction)); box-shadow: 0 0 10px -3px rgba(194,65,12,0.5);
  animation: seg-grow 0.8s var(--pay-ease) both; animation-delay: calc(var(--i) * 0.04s + 0.2s); }
.slip-share { font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); }
.slip-amts { display: flex; gap: 18px; }
.amt { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.amt span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.amt.period :deep(.pay-money) { font-size: 16px; }
.amt.ytd :deep(.pay-money) { font-size: 13px; color: var(--pay-text-2); }

/* ░░░░░░░░░░ PAGINATION (deposit stamps) ░░░░░░░░░░ */
.pager { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 4px;
  padding: 12px 18px; border-radius: 16px; background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2)); border: 1px solid var(--pay-border-soft); }
.pg-readout { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); } .pg-readout strong { color: var(--pay-text); }
.pg-mid { display: inline-flex; align-items: center; gap: 6px; }
.pg-stamp { min-width: 34px; height: 34px; padding: 0 9px; display: grid; place-items: center; border-radius: 9px;
  border: 1px dashed var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer;
  font-family: var(--pay-mono); font-size: 12px; font-weight: 700; transition: 0.2s var(--pay-ease); }
.pg-stamp.nav { border-style: solid; border-radius: 50%; }
.pg-stamp:hover:not(:disabled):not(.on) { border-color: var(--pay-border); color: var(--pay-text); }
.pg-stamp:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-stamp.on { color: var(--pay-statutory); border-color: var(--pay-statutory); border-style: solid; background: var(--pay-statutory-soft);
  transform: rotate(-3deg); box-shadow: 0 4px 12px -6px rgba(146,64,14,0.5); }
.pg-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.sz { padding: 5px 10px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; font-family: var(--pay-mono); font-size: 11px; }
.sz.on { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }

/* keyframes */
@keyframes seg-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes due-draw { from { stroke-dashoffset: 169.6; } }

/* ░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░ */
@media (max-width: 820px) { .console { justify-content: center; } .due { width: 100%; } }
@media (max-width: 640px) {
  .slip { grid-template-columns: 1fr; gap: 12px; }
  .slip-amts { justify-content: space-between; }
}

/* ░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░ */
[data-theme="light"] .due-track { stroke: rgba(40,25,10,0.12); }
[data-theme="light"] .pg-stamp.on { color: #78350f; }

/* ░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .console, .dist, .slip, .dist-seg, .slip-fill, .due-arc { animation: none !important; }
  .due-arc { transition: none !important; }
  .slip:hover { transform: none; }
}
</style>
