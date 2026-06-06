<template>
  <div class="sec">
    <div v-if="loading" class="rows"><div v-for="i in 3" :key="i" class="pay-skel" style="height:96px;border-radius:18px" /></div>
    <PayEmptyState v-else-if="!eligible.length" :icon="FileSpreadsheet" title="No payable runs yet"
      sub="Approve or release a monthly run to export its bank file." />

    <template v-else>
      <!-- run rail -->
      <div class="rail-wrap">
        <span class="rail-eyebrow"><Landmark :size="12" /> Payable runs</span>
        <div class="rail">
          <Motion v-for="(b, i) in eligible" :key="b.id" as="button" class="rchip" :class="{ on: b.id === selectedId }"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.38, delay: Math.min(i*0.05,0.4), ease: [0.16,1,0.3,1] }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="select(b)">
            <span class="rc-no">{{ b.batch_no }}</span>
            <span class="rc-per">{{ monthLabel(b.period_month) }} {{ b.period_year }}</span>
            <PayMoneyValue class="rc-net" tone="net" :value="b.total_net" :short="true" :animate="false" />
            <PayStatusChip :status="b.status" />
          </Motion>
        </div>
      </div>

      <!-- ══════════ DISBURSEMENT CONSOLE ══════════ -->
      <Motion class="console" as="section" :key="selectedId"
        :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.55, ease: [0.16,1,0.3,1] }">
        <span class="cs-foil-edge" aria-hidden="true" />
        <span class="cs-aura" aria-hidden="true" />
        <span class="cs-grid" aria-hidden="true" />

        <div class="cs-main">
          <!-- left: amount + transfer pipeline + exports -->
          <div class="cs-left">
            <span class="cs-eyebrow"><Banknote :size="13" /> Bank disbursement</span>
            <h2 class="cs-headline">Treasury transfer</h2>
            <div class="cs-amount">
              <span class="amt-lbl">Total to disburse</span>
              <PayMoneyValue class="amt-val" tone="net" :value="summary ? summary.total_net : (selected?.total_net || 0)" :duration="1000" />
              <span class="amt-sub">{{ selected?.batch_no }} · {{ monthLabel(selected?.period_month) }} {{ selected?.period_year }}</span>
            </div>

            <!-- animated transfer pipeline -->
            <div class="pipe">
              <div class="pnode src"><span class="pn-ico"><Coins :size="16" /></span><span class="pn-lbl">Payroll</span></div>
              <div class="pwire">
                <span class="pw-base" /><span class="pw-fill" />
                <i v-for="n in 6" :key="n" class="pw-dot" :style="dotStyle(n)" />
              </div>
              <div class="pnode dst"><span class="pn-ico bank"><Landmark :size="16" /></span>
                <span class="pn-lbl">{{ summary ? summary.by_bank.length : '…' }} bank{{ (summary && summary.by_bank.length === 1) ? '' : 's' }}</span></div>
            </div>

            <div class="cs-exports">
              <Motion as="button" class="ex-btn primary" :disabled="busy"
                :whileHover="busy ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="dl('csv')">
                <span class="ex-sheen" /><FileText :size="15" /> NEFT CSV
              </Motion>
              <Motion as="button" class="ex-btn ghost" :disabled="busy"
                :whileHover="busy ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="dl('xlsx')">
                <FileSpreadsheet :size="15" /> Excel advice
              </Motion>
              <Motion as="button" class="ex-btn pdf" :disabled="busy"
                :whileHover="busy ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="dl('pdf')">
                <FileDown :size="15" /> PDF advice
              </Motion>
            </div>
          </div>

          <!-- right: readiness gauge + KPIs -->
          <div class="cs-right">
            <div class="gauge">
              <svg viewBox="0 0 150 150" class="g-svg">
                <circle class="g-track" cx="75" cy="75" r="60" />
                <circle class="g-fill" cx="75" cy="75" r="60" :stroke-dasharray="gaugeCirc" :stroke-dashoffset="gaugeOffset"
                  :class="{ warn: missing > 0 }" />
              </svg>
              <span class="g-orbit" aria-hidden="true" />
              <div class="g-mid">
                <span class="g-pct">{{ readyPct }}<i>%</i></span>
                <span class="g-cap">ready</span>
              </div>
            </div>
            <div class="cs-kpis">
              <div class="kpi"><span class="k-dot ok" /><PayCountUp :value="ready" class="k-n" /><span class="k-l">payees ready</span></div>
              <div class="kpi" :class="{ warn: missing }"><span class="k-dot warn" /><PayCountUp :value="missing" class="k-n" /><span class="k-l">missing details</span></div>
            </div>
          </div>
        </div>

        <!-- missing-details warning -->
        <transition name="cs-fade">
          <div v-if="summary && summary.missing" class="cs-warn">
            <AlertTriangle :size="14" />
            <span><b>{{ summary.missing }}</b> payee{{ summary.missing > 1 ? 's are' : ' is' }} missing bank account / IFSC and will be flagged in the file —
              {{ summary.missing_codes.slice(0,6).join(', ') }}{{ summary.missing_codes.length > 6 ? '…' : '' }}. Fix their profile before uploading to the bank.</span>
          </div>
        </transition>

        <!-- bank-wise breakdown -->
        <div v-if="summary && summary.by_bank.length" class="banks">
          <span class="banks-h">Bank-wise breakdown</span>
          <Motion v-for="(bk, i) in summary.by_bank" :key="bk.bank" as="div" class="brow"
            :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.4, delay: 0.1 + i*0.06, ease: [0.16,1,0.3,1] }">
            <span class="bk-name"><Building2 :size="13" /> {{ bk.bank }}</span>
            <span class="bk-count">{{ bk.count }} payee{{ bk.count > 1 ? 's' : '' }}</span>
            <div class="bk-bar"><Motion as="i" :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
              :transition="{ duration: 0.7, delay: 0.2 + i*0.06, ease: [0.16,1,0.3,1] }"
              :style="{ width: bankPct(bk) + '%' }" /></div>
            <PayMoneyValue class="bk-amt" tone="net" :value="bk.amount" :animate="false" />
          </Motion>
        </div>
      </Motion>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { FileSpreadsheet, FileText, FileDown, Landmark, Banknote, Coins, Building2, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayStatusChip from '../components/PayStatusChip.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import { monthLabel } from '@/composables/usePayroll'
import { fetchBatches } from '@/composables/usePayrollBatch'
import { downloadBankFile, fetchBankFileSummary } from '@/composables/usePayrollExtra'

const toast = useToast()
const batches = ref([]); const loading = ref(false); const busy = ref(false)
const selectedId = ref(null); const summary = ref(null)

const eligible = computed(() => batches.value.filter(b => ['APPROVED', 'RELEASED', 'LOCKED'].includes(b.status)))
const selected = computed(() => eligible.value.find(b => b.id === selectedId.value) || null)
const ready = computed(() => summary.value?.ready || 0)
const missing = computed(() => summary.value?.missing || 0)
const totalPayees = computed(() => summary.value?.total_payees || 0)
const readyPct = computed(() => totalPayees.value ? Math.round(ready.value / totalPayees.value * 100) : 0)
const gaugeCirc = 2 * Math.PI * 60
const gaugeOffset = computed(() => gaugeCirc * (1 - readyPct.value / 100))
const bankPct = (bk) => {
  const t = summary.value?.total_net || 0
  return t ? Math.max(3, Math.round(bk.amount / t * 100)) : 0
}
const dotStyle = (n) => ({ animationDelay: `${(n - 1) * 0.55}s`, animationDuration: '3.3s' })

const reload = async () => {
  loading.value = true
  try {
    batches.value = (await fetchBatches({ limit: 30 })).items || []
    const first = eligible.value[0]
    if (first) await select(first)
  } catch { toast.error('Failed to load runs') }
  finally { loading.value = false }
}
const select = async (b) => {
  selectedId.value = b.id; summary.value = null
  try { summary.value = await fetchBankFileSummary(b.id) }
  catch { summary.value = null }
}
const dl = async (fmt) => {
  if (!selected.value) return
  busy.value = true
  try {
    await downloadBankFile(selected.value.id, selected.value.batch_no, fmt)
    toast.success(fmt === 'xlsx' ? 'Excel advice downloaded' : fmt === 'pdf' ? 'PDF advice downloaded' : 'NEFT file downloaded')
  }
  catch (e) { toast.error(e?.response?.data?.detail || 'Export failed') }
  finally { busy.value = false }
}
onMounted(reload)
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }
.rows { display: flex; flex-direction: column; gap: 8px; }

/* run rail */
.rail-wrap { display: flex; flex-direction: column; gap: 9px; }
.rail-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-text-muted); }
.rail { display: flex; gap: 11px; overflow-x: auto; padding: 4px 2px 8px; }
.rail::-webkit-scrollbar { height: 6px; } .rail::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 6px; }
.rchip { flex: 0 0 auto; width: 176px; display: flex; flex-direction: column; gap: 5px; align-items: flex-start; text-align: left;
  padding: 13px 15px; border-radius: 15px; cursor: pointer; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s; }
.rchip.on { border-color: var(--pay-treasury); background: radial-gradient(120% 90% at 0% 0%, rgba(251,191,36,0.14), transparent 60%), var(--pay-surface);
  box-shadow: 0 14px 34px -18px rgba(245,158,11,0.5); }
.rc-no { font-family: var(--pay-mono); font-size: 12px; color: var(--pay-text); font-weight: 700; }
.rc-per { font-size: 11px; color: var(--pay-text-muted); }
.rc-net { font-size: 16px; }

/* ══════════ CONSOLE ══════════ */
.console { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid var(--pay-border); padding: 26px 28px 22px;
  background:
    radial-gradient(120% 130% at 6% -10%, rgba(251,191,36,0.16), transparent 52%),
    radial-gradient(120% 120% at 100% 110%, rgba(52,211,153,0.12), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 28px 80px -42px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); }
.cs-foil-edge { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent); }
.cs-foil-edge::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 40%;
  background: linear-gradient(90deg, transparent, var(--pay-mint-bright), var(--pay-amber), transparent); animation: pay-foil-sweep 4s var(--pay-ease) infinite; }
.cs-aura { position: absolute; inset: -30% auto auto -10%; width: 70%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 30% 20%, rgba(251,191,36,0.2), transparent 60%); filter: blur(16px); animation: pay-aurora-drift 12s ease-in-out infinite; }
.cs-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(80% 80% at 50% 0%, #000, transparent 75%); }

.cs-main { position: relative; z-index: 1; display: flex; gap: 30px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.cs-left { flex: 1; min-width: 300px; }
.cs-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.13em; color: var(--pay-treasury); }
.cs-headline { margin: 9px 0 14px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;
  background: linear-gradient(100deg, var(--pay-text) 30%, var(--pay-mint-bright) 50%, var(--pay-text) 70%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: pay-foil-text 6s linear infinite; }
.cs-amount { display: flex; flex-direction: column; gap: 2px; margin-bottom: 18px; }
.amt-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-net-strong); }
.amt-val { font-size: 38px; line-height: 1; }
.amt-sub { font-family: var(--pay-mono); font-size: 11.5px; color: var(--pay-text-muted); margin-top: 4px; }

/* transfer pipeline */
.pipe { display: flex; align-items: center; gap: 0; margin-bottom: 18px; max-width: 440px; }
.pnode { display: flex; flex-direction: column; align-items: center; gap: 5px; flex-shrink: 0; }
.pn-ico { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; color: #1a1206;
  background: var(--pay-grad-coin); box-shadow: 0 8px 20px -8px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.4); }
.pn-ico.bank { background: linear-gradient(135deg, #34d399, #047857); color: #04231a; box-shadow: 0 8px 20px -8px rgba(16,185,129,0.55); }
.pn-lbl { font-size: 10px; color: var(--pay-text-muted); }
.pwire { position: relative; flex: 1; height: 4px; margin: 0 6px; align-self: flex-start; margin-top: 19px; }
.pw-base { position: absolute; inset: 0; border-radius: 999px; background: var(--pay-border-soft); }
.pw-fill { position: absolute; inset: 0; border-radius: 999px; background: linear-gradient(90deg, var(--pay-treasury), var(--pay-net)); opacity: 0.5; }
.pw-dot { position: absolute; top: 50%; left: 0; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%;
  background: radial-gradient(circle, var(--pay-mint-bright), var(--pay-amber)); box-shadow: 0 0 8px 1px rgba(251,191,36,0.7);
  animation: bf-flow linear infinite; }
@keyframes bf-flow { 0% { left: 0; opacity: 0; transform: scale(0.6); } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 100%; opacity: 0; transform: scale(0.9); } }

.cs-exports { display: flex; gap: 10px; flex-wrap: wrap; }
.ex-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 13px; border: 1px solid transparent;
  transition: transform 0.16s var(--pay-spring), box-shadow 0.2s, border-color 0.18s, color 0.18s; }
.ex-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ex-btn.primary { background: var(--pay-grad-cta); color: #1a1206; box-shadow: 0 10px 26px -12px rgba(245,158,11,0.7); }
.ex-btn.ghost { background: transparent; border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.ex-btn.ghost:hover:not(:disabled) { border-color: var(--pay-net); color: var(--pay-net-strong); background: var(--pay-net-soft); }
.ex-btn.pdf { background: transparent; border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.ex-btn.pdf:hover:not(:disabled) { border-color: var(--pay-treasury); color: var(--pay-treasury); background: rgba(251,191,36,0.10); }
.ex-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 36%; transform: translateX(-220%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
.ex-btn.primary:hover:not(:disabled) .ex-sheen { animation: pay-foil-sweep 0.9s var(--pay-ease); }

/* readiness gauge */
.cs-right { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
.gauge { position: relative; width: 150px; height: 150px; flex-shrink: 0; }
.g-svg { width: 150px; height: 150px; transform: rotate(-90deg); }
.g-track { fill: none; stroke: var(--pay-border-soft); stroke-width: 11; }
.g-fill { fill: none; stroke: var(--pay-net); stroke-width: 11; stroke-linecap: round; transition: stroke-dashoffset 1.2s var(--pay-ease); filter: drop-shadow(0 0 8px rgba(52,211,153,0.5)); }
.g-fill.warn { stroke: var(--pay-amber); filter: drop-shadow(0 0 8px rgba(245,158,11,0.5)); }
.g-orbit { position: absolute; inset: 6px; border-radius: 50%; border: 1.5px dashed rgba(251,191,36,0.4); animation: pay-orbit 18s linear infinite; pointer-events: none; }
.g-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.g-pct { font-family: var(--pay-mono); font-size: 32px; font-weight: 800; color: var(--pay-text); line-height: 1; }
.g-pct i { font-style: normal; font-size: 15px; color: var(--pay-net); }
.g-cap { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-net-strong); margin-top: 3px; }
.cs-kpis { display: flex; flex-direction: column; gap: 12px; }
.kpi { display: flex; align-items: baseline; gap: 8px; }
.k-dot { width: 8px; height: 8px; border-radius: 50%; align-self: center; flex-shrink: 0; }
.k-dot.ok { background: var(--pay-net); box-shadow: 0 0 8px rgba(52,211,153,0.6); }
.k-dot.warn { background: var(--pay-amber); }
.k-n { font-family: var(--pay-mono); font-size: 20px; font-weight: 800; color: var(--pay-text); }
.kpi.warn .k-n { color: var(--pay-amber); }
.k-l { font-size: 11px; color: var(--pay-text-muted); }

/* warning */
.cs-warn { position: relative; z-index: 1; display: flex; gap: 9px; align-items: flex-start; margin-top: 18px; padding: 11px 14px; border-radius: 12px;
  font-size: 12px; line-height: 1.5; color: var(--pay-text-2); background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.32); }
.cs-warn svg { color: var(--pay-amber); flex-shrink: 0; margin-top: 1px; } .cs-warn b { color: var(--pay-text); }
.cs-fade-enter-active { transition: opacity 0.4s var(--pay-ease), transform 0.4s var(--pay-ease); }
.cs-fade-enter-from { opacity: 0; transform: translateY(-6px); }

/* bank breakdown */
.banks { position: relative; z-index: 1; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--pay-border-soft); display: flex; flex-direction: column; gap: 9px; }
.banks-h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); margin-bottom: 2px; }
.brow { display: grid; grid-template-columns: 1.4fr 0.8fr 1.6fr auto; align-items: center; gap: 14px; }
.bk-name { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--pay-text); font-weight: 600; }
.bk-name svg { color: var(--pay-treasury); }
.bk-count { font-size: 11px; color: var(--pay-text-muted); }
.bk-bar { height: 8px; border-radius: 999px; background: var(--pay-surface); overflow: hidden; border: 1px solid var(--pay-border-soft); }
.bk-bar i { display: block; height: 100%; border-radius: 999px; transform-origin: left; background: linear-gradient(90deg, var(--pay-treasury), var(--pay-net)); }
.bk-amt { font-size: 13px; justify-self: end; }

@media (max-width: 820px) {
  .cs-main { flex-direction: column; align-items: stretch; }
  .cs-right { justify-content: center; }
  .brow { grid-template-columns: 1fr auto; row-gap: 4px; } .bk-bar { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .cs-foil-edge::after, .cs-aura, .cs-headline, .g-orbit, .pw-dot, .ex-btn.primary:hover .ex-sheen { animation: none !important; }
  .cs-headline { -webkit-text-fill-color: var(--pay-text); }
}

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .console {
  background:
    radial-gradient(120% 130% at 6% -10%, rgba(245,158,11,0.14), transparent 52%),
    radial-gradient(120% 120% at 100% 110%, rgba(5,150,105,0.10), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 24px 60px -40px rgba(40,25,10,0.3), inset 0 1px 0 rgba(255,255,255,0.6); }
[data-theme="light"] .cs-headline {
  background: linear-gradient(100deg, var(--pay-text) 35%, #d97706 50%, var(--pay-text) 65%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
[data-theme="light"] .g-fill { filter: drop-shadow(0 0 6px rgba(5,150,105,0.35)); }
[data-theme="light"] .cs-grid { opacity: 0.4;
  background-image: linear-gradient(rgba(184,134,11,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(184,134,11,0.07) 1px, transparent 1px); }
[data-theme="light"] .rchip { background: rgba(255,250,240,0.72); }
</style>
