<template>
  <div class="mn-wrap">
    <!-- ════ THE NOTE ════ -->
    <article
      class="note" :class="sealKind"
      v-tilt="{ max: 6, scale: 1.008 }"
      @click="$emit('view')"
    >
      <span class="note-guilloche" aria-hidden="true"></span>
      <span class="note-engrave" aria-hidden="true"></span>
      <span class="note-sheen" aria-hidden="true"></span>

      <!-- corner denominations -->
      <span class="denom tl">₹</span>
      <span class="denom br">₹</span>

      <header class="note-top">
        <div class="note-brand">
          <span class="brand-mark">₹</span>
          <div class="brand-txt">
            <span class="bt-1">FOURRECK · PAYROLL</span>
            <span class="bt-2">Salary statement · negotiable to none</span>
          </div>
        </div>
        <span class="wax" :style="{ '--wx': sealColor }">
          <span class="wax-ring" aria-hidden="true"></span>
          <span class="wax-txt">{{ statusLabel }}</span>
        </span>
      </header>

      <div class="note-body">
        <span class="np-label">NET PAY · {{ monthLabel(payslip.period_month) }} {{ payslip.period_year }}</span>
        <span class="np-foil"><PayMoneyValue :value="net" :duration="900" /></span>
        <span class="np-words">{{ amountWords }}</span>
      </div>

      <footer class="note-foot">
        <span class="serial">{{ payslip.payslip_no }}</span>
        <span class="micro" aria-hidden="true">{{ microline }}</span>
      </footer>
    </article>

    <!-- ════ FLOW PANEL ════ -->
    <aside class="flow">
      <div class="flow-rail">
        <div class="fnode gross">
          <span class="fn-dot"></span>
          <div class="fn-txt">
            <span class="fn-l">Gross earnings</span>
            <PayMoneyValue class="fn-v" :value="gross" :duration="800" />
          </div>
        </div>

        <div class="wire" aria-hidden="true"><span class="wire-dot"></span></div>

        <div class="fnode ded">
          <span class="fn-op">−</span>
          <span class="fn-dot"></span>
          <div class="fn-txt">
            <span class="fn-l">Deductions</span>
            <PayMoneyValue class="fn-v" :value="deductions" tone="deduction" :duration="800" />
          </div>
        </div>

        <div class="wire" aria-hidden="true"><span class="wire-dot delay"></span></div>

        <div class="fnode net">
          <span class="fn-op">=</span>
          <span class="fn-dot"></span>
          <div class="fn-txt">
            <span class="fn-l">Take-home</span>
            <PayMoneyValue class="fn-v big" :value="net" tone="net" :duration="900" />
          </div>
        </div>
      </div>

      <!-- allocation meter -->
      <div class="meter">
        <div class="meter-bar">
          <span class="seg take" :style="{ '--w': takePct + '%' }"></span>
          <span class="seg cut" :style="{ '--w': cutPct + '%' }"></span>
        </div>
        <div class="meter-legend">
          <span><i class="dot take"></i> Take-home {{ takePct }}%</span>
          <span><i class="dot cut"></i> Deductions {{ cutPct }}%</span>
        </div>
      </div>

      <div class="flow-cta">
        <button class="cta primary" @click="$emit('view')"><Eye :size="15" /> View statement</button>
        <button class="cta ghost" :class="{ busy }" @click="onDownload"><Download :size="15" /> PDF</button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Eye, Download } from 'lucide-vue-next'
import PayMoneyValue from '../payroll/components/PayMoneyValue.vue'
import { monthLabel, statusMeta } from '@/composables/usePayroll'

const props = defineProps({
  payslip: { type: Object, required: true },
})
const emit = defineEmits(['view', 'download'])

const gross = computed(() => Number(props.payslip.gross_earnings || 0))
const deductions = computed(() => Number(props.payslip.total_deductions || 0))
const net = computed(() => Number(props.payslip.net_pay || 0))
const takePct = computed(() => gross.value ? Math.round((net.value / gross.value) * 100) : 0)
const cutPct = computed(() => Math.max(0, 100 - takePct.value))

const statusLabel = computed(() => statusMeta(props.payslip.status).label.toUpperCase())
const sealKind = computed(() => 'seal-' + statusMeta(props.payslip.status).pillClass)
const _SEAL = {
  released: 'var(--pay-net)', approved: 'var(--pay-mint)', verified: 'var(--pay-amber)',
  generated: 'var(--pay-amber)', draft: '#d4a017', locked: 'var(--pay-statutory)',
  cancelled: 'var(--pay-text-muted)', held: 'var(--pay-deduction)', failed: 'var(--pay-deduction)',
}
const sealColor = computed(() => _SEAL[statusMeta(props.payslip.status).pillClass] || 'var(--pay-mint)')

// decorative "amount in words" — short, for the currency-note feel
const amountWords = computed(() => {
  const n = Math.round(net.value)
  if (n >= 1e7) return `Rupees ${(n / 1e7).toFixed(2)} crore only`
  if (n >= 1e5) return `Rupees ${(n / 1e5).toFixed(2)} lakh only`
  return `Rupees ${n.toLocaleString('en-IN')} only`
})
const microline = computed(() => ('FOURRECKPAYROLL · ' + (props.payslip.payslip_no || '')).repeat(6))

const busy = ref(false)
const onDownload = async (e) => {
  e?.stopPropagation?.()
  if (busy.value) return
  busy.value = true
  try { await emitDownload() } finally { setTimeout(() => (busy.value = false), 600) }
}
const emitDownload = () => new Promise((res) => { emit('download'); res() })
</script>

<style scoped>
.mn-wrap { display: grid; grid-template-columns: 1.55fr 1fr; gap: 20px; align-items: stretch; }
@media (max-width: 880px) { .mn-wrap { grid-template-columns: 1fr; } }

/* ════ NOTE ════ */
.note {
  position: relative; overflow: hidden; cursor: pointer; isolation: isolate;
  border-radius: 22px; padding: 24px 26px; min-height: 248px;
  display: flex; flex-direction: column; justify-content: space-between;
  background:
    radial-gradient(120% 90% at 12% 8%, rgba(253,230,138,0.22), transparent 55%),
    linear-gradient(135deg, #15110a 0%, #241a0e 48%, #120d07 100%);
  border: 1px solid var(--pay-border);
  box-shadow: inset 0 1px 0 rgba(255,236,179,0.14), 0 30px 70px -42px rgba(0,0,0,0.85);
  transform-style: preserve-3d;
  animation: note-in 0.7s var(--pay-ease) both;
}
@keyframes note-in { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: none; } }

.note-guilloche {
  position: absolute; inset: 0; z-index: 0; opacity: 0.5; pointer-events: none;
  background:
    repeating-radial-gradient(circle at 80% 120%, rgba(251,191,36,0.07) 0 2px, transparent 2px 7px),
    repeating-conic-gradient(from 0deg at 18% 12%, rgba(251,191,36,0.05) 0deg 5deg, transparent 5deg 10deg);
  animation: pay-dial-spin 60s linear infinite;
}
.note-engrave { position: absolute; inset: 7px; z-index: 0; border-radius: 16px; pointer-events: none;
  border: 1px solid rgba(251,191,36,0.22);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.3), inset 0 0 22px rgba(251,191,36,0.05); }
.note-sheen { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.note-sheen::after { content: ''; position: absolute; top: -20%; left: -40%; width: 36%; height: 140%;
  background: linear-gradient(90deg, transparent, rgba(255,247,224,0.34), transparent);
  transform: skewX(-18deg); animation: pay-foil-sweep 5s ease-in-out 0.5s infinite; }

.denom { position: absolute; z-index: 1; font-size: 26px; font-weight: 900; color: rgba(253,230,138,0.5);
  text-shadow: 0 1px 0 rgba(0,0,0,0.4); }
.denom.tl { top: 12px; right: 16px; } /* offset from brand on left */
.denom.br { bottom: 12px; right: 16px; display: none; }

.note-top, .note-body, .note-foot { position: relative; z-index: 2; }
.note-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.note-brand { display: flex; align-items: center; gap: 11px; }
.brand-mark { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0;
  font-size: 20px; font-weight: 900; color: #2a1c08; background: var(--pay-grad-coin);
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 12px -4px rgba(251,191,36,0.5); }
.bt-1 { display: block; font-family: var(--pay-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--pay-mint-bright); }
.bt-2 { display: block; font-size: 10px; font-style: italic; color: rgba(201,189,166,0.7); margin-top: 2px; }

.wax { position: relative; display: inline-grid; place-items: center; width: 58px; height: 58px; flex-shrink: 0;
  border-radius: 50%; background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--wx) 80%, #fff), var(--wx) 70%);
  box-shadow: inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.3), 0 6px 16px -6px var(--wx);
  animation: pay-stamp-in 0.7s var(--pay-spring) 0.25s both; }
.wax-ring { position: absolute; inset: 5px; border-radius: 50%; border: 1.5px dashed rgba(0,0,0,0.28); }
.wax-txt { position: relative; font-family: var(--pay-mono); font-size: 7.5px; font-weight: 900; letter-spacing: 0.05em;
  color: #1c1206; text-align: center; line-height: 1; padding: 0 4px; }

.note-body { margin: 8px 0; }
.np-label { display: block; font-family: var(--pay-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--pay-text-muted); }
.np-foil { display: block; margin: 4px 0 6px; animation: pay-figure-blur-in 0.8s var(--pay-ease) 0.15s both; }
.np-foil :deep(.pay-money) { font-size: clamp(34px, 6vw, 56px); font-weight: 900; letter-spacing: -0.02em; line-height: 1;
  background: linear-gradient(100deg, #fde68a, #fbbf24 35%, #f59e0b 60%, #fde68a); background-size: 220% auto;
  -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 10px rgba(251,191,36,0.25)); animation: pay-foil-text 6s linear infinite; }
.np-words { font-size: 11px; font-style: italic; color: rgba(201,189,166,0.66); letter-spacing: 0.01em; }

.note-foot { display: flex; flex-direction: column; gap: 5px; }
.serial { font-family: var(--pay-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--pay-mint); }
.micro { font-family: var(--pay-mono); font-size: 5px; letter-spacing: 0.04em; color: rgba(251,191,36,0.28);
  white-space: nowrap; overflow: hidden; height: 8px; }

/* ════ FLOW PANEL ════ */
.flow { display: flex; flex-direction: column; gap: 14px; padding: 18px 18px 16px; border-radius: 20px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border);
  animation: note-in 0.7s var(--pay-ease) 0.1s both; }
.flow-rail { display: flex; flex-direction: column; gap: 0; }
.fnode { position: relative; display: flex; align-items: center; gap: 11px; padding: 6px 0; }
.fn-op { position: absolute; left: -2px; top: -7px; font-size: 13px; font-weight: 800; color: var(--pay-text-muted); }
.fn-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
.fnode.gross .fn-dot { background: var(--pay-mint); box-shadow: 0 0 10px var(--pay-mint); }
.fnode.ded .fn-dot { background: var(--pay-deduction); }
.fnode.net .fn-dot { background: var(--pay-net); box-shadow: 0 0 10px var(--pay-net); }
.fn-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.fn-l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.fn-v { font-size: 17px; }
.fn-v.big { font-size: 23px; }

.wire { position: relative; height: 18px; margin-left: 5px; width: 2px; background: var(--pay-border-soft); overflow: visible; }
.wire-dot { position: absolute; left: -2px; width: 6px; height: 6px; border-radius: 50%; background: var(--pay-mint);
  box-shadow: 0 0 8px var(--pay-mint); animation: wire-fall 1.6s ease-in-out infinite; }
.wire-dot.delay { animation-delay: 0.8s; background: var(--pay-net); box-shadow: 0 0 8px var(--pay-net); }
@keyframes wire-fall { 0% { top: -2px; opacity: 0; } 25% { opacity: 1; } 100% { top: 16px; opacity: 0; } }

.meter { margin-top: 2px; }
.meter-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,0.25); border: 1px solid var(--pay-border-soft); }
.seg { height: 100%; transform-origin: left; animation: pay-meter-grow 0.9s var(--pay-ease) 0.35s both; }
.seg.take { width: var(--w); background: linear-gradient(90deg, var(--pay-net), #10b981); }
.seg.cut { width: var(--w); background: linear-gradient(90deg, #c2410c, #ea580c); animation-delay: 0.5s; }
.meter-legend { display: flex; justify-content: space-between; margin-top: 7px; font-size: 10px; color: var(--pay-text-2); }
.meter-legend i { width: 7px; height: 7px; border-radius: 2px; display: inline-block; margin-right: 4px; vertical-align: middle; }
.meter-legend i.take { background: var(--pay-net); } .meter-legend i.cut { background: var(--pay-ember); }

.flow-cta { display: flex; gap: 9px; margin-top: auto; }
.cta { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 14px; border-radius: 12px;
  border: none; cursor: pointer; font-weight: 700; font-size: 13px; transition: transform 0.16s var(--pay-spring); flex: 1; }
.cta:hover { transform: translateY(-2px); }
.cta.primary { background: var(--pay-grad-cta); color: #1a1206; }
.cta.ghost { background: var(--pay-surface); color: var(--pay-text-2); border: 1px solid var(--pay-border-soft); }
.cta.ghost.busy { opacity: 0.6; cursor: progress; }

/* ════ LIGHT THEME ════ */
[data-theme="light"] .note {
  background:
    radial-gradient(120% 90% at 12% 8%, rgba(253,230,138,0.5), transparent 55%),
    linear-gradient(135deg, #fffaf0 0%, #fdf1d6 50%, #fff7e8 100%);
  border-color: rgba(184,134,11,0.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 24px 60px -42px rgba(120,90,20,0.5);
}
[data-theme="light"] .bt-1 { color: #8a5a06; }
[data-theme="light"] .bt-2, [data-theme="light"] .np-words { color: #8a734f; }
[data-theme="light"] .serial { color: #a9760a; }
[data-theme="light"] .note-sheen::after { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); }
[data-theme="light"] .denom { color: rgba(184,134,11,0.4); }
[data-theme="light"] .np-foil :deep(.pay-money) { background: linear-gradient(100deg, #b8860b, #a9760a 40%, #ea580c 70%, #b8860b);
  background-size: 220% auto; -webkit-background-clip: text; background-clip: text; }

@media (prefers-reduced-motion: reduce) {
  .note, .flow, .np-foil, .wax, .seg { animation: none !important; }
  .note-guilloche, .note-sheen::after, .wire-dot, .np-foil :deep(.pay-money) { animation: none !important; }
}
</style>
