<template>
  <!-- Clearing-House Reconciliation River — the settlement signature instrument.
       Advance + Approved-expense + DA converge into a reconciliation reactor that
       splits into a Payable (→ traveller) or Recoverable (→ company) outflow.
       Distinct from radar (dashboard), runway (approvals), sky-arcs (requests),
       odometer/accrual-donut (DA). -->
  <section ref="root" class="sflow trv-grain" :class="{ shown }">
    <span class="sf-aura" aria-hidden="true" />

    <!-- ── the river ── -->
    <div class="sf-stage">
      <svg class="sf-svg" viewBox="0 0 960 300" role="img"
        :aria-label="`Net clearing position ${fmtINR(Math.abs(agg.net))} ${dirLabel}`">
        <defs>
          <linearGradient id="sf-grad-adv" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#9ca3af" stop-opacity="0.05" />
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.55" />
          </linearGradient>
          <linearGradient id="sf-grad-exp" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.55" />
          </linearGradient>
          <linearGradient id="sf-grad-da" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fb923c" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#fb923c" stop-opacity="0.5" />
          </linearGradient>
          <linearGradient id="sf-grad-pay" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#34d399" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#34d399" stop-opacity="0.05" />
          </linearGradient>
          <linearGradient id="sf-grad-rec" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.05" />
          </linearGradient>
          <radialGradient id="sf-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" :stop-color="coreHex" stop-opacity="0.9" />
            <stop offset="55%" :stop-color="coreHex" stop-opacity="0.35" />
            <stop offset="100%" :stop-color="coreHex" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- inflow + outflow streams -->
        <g class="sf-streams">
          <template v-for="s in streams" :key="s.id">
            <!-- soft ribbon -->
            <path :d="s.d" fill="none" :stroke="`url(#sf-grad-${s.grad})`"
              :stroke-width="s.w" stroke-linecap="round" class="sf-ribbon" />
            <!-- bright flowing dashes -->
            <path :d="s.d" fill="none" :stroke="s.hex" :stroke-width="Math.max(1.4, s.w * 0.18)"
              stroke-linecap="round" class="sf-line" :class="`dir-${s.dir}`"
              :style="{ '--len': s.len }" />
            <!-- travelling money motes -->
            <template v-if="shown && !reduced">
              <circle v-for="m in 2" :key="m" :r="Math.max(1.8, s.w * 0.16)" :fill="s.hex" class="sf-mote">
                <animateMotion :dur="`${s.dur}s`" :begin="`${(m - 1) * (s.dur / 2)}s`"
                  repeatCount="indefinite" :path="s.d" :keyPoints="s.reverse ? '1;0' : '0;1'"
                  keyTimes="0;1" calcMode="linear" />
              </circle>
            </template>
          </template>
        </g>

        <!-- source nodes -->
        <g v-for="n in sourceNodes" :key="n.id" class="sf-node src">
          <circle :cx="n.x" :cy="n.y" :r="n.r" class="sf-node-glow" :style="{ fill: n.hex }" />
          <circle :cx="n.x" :cy="n.y" :r="n.r" class="sf-node-ring" :style="{ stroke: n.hex }" />
          <text :x="n.x" :y="n.y - 2" class="sf-node-val" text-anchor="middle">{{ n.disp }}</text>
          <text :x="n.x" :y="n.y + n.r + 16" class="sf-node-lab" text-anchor="middle">{{ n.label }}</text>
        </g>

        <!-- reconciliation reactor core -->
        <g class="sf-reactor" :style="{ '--cx': '482px', '--cy': '150px' }">
          <circle cx="482" cy="150" r="60" fill="url(#sf-core)" class="sf-core-halo" />
          <g class="sf-core-spin">
            <circle cx="482" cy="150" r="44" fill="none" :stroke="coreHex" stroke-width="1.4"
              stroke-dasharray="4 10" stroke-opacity="0.6" />
          </g>
          <circle cx="482" cy="150" r="33" class="sf-core-disc" :style="{ stroke: coreHex }" />
          <circle cx="482" cy="150" r="33" class="sf-core-pulse" :style="{ stroke: coreHex }" />
          <text x="482" y="146" class="sf-core-cap" text-anchor="middle">{{ dirShort }}</text>
          <text x="482" y="163" class="sf-core-num trv-mono" text-anchor="middle" :style="{ fill: coreHex }">{{ fmtCompactINR(Math.abs(agg.net)) }}</text>
        </g>

        <!-- outflow nodes -->
        <g v-for="n in outNodes" :key="n.id" class="sf-node out">
          <circle :cx="n.x" :cy="n.y" :r="n.r" class="sf-node-glow" :style="{ fill: n.hex }" />
          <circle :cx="n.x" :cy="n.y" :r="n.r" class="sf-node-ring" :style="{ stroke: n.hex }" />
          <text :x="n.x" :y="n.y - 2" class="sf-node-val" text-anchor="middle">{{ n.disp }}</text>
          <text :x="n.x" :y="n.y + n.r + 16" class="sf-node-lab" text-anchor="middle">{{ n.label }}</text>
        </g>
      </svg>
    </div>

    <!-- ── verdict panel ── -->
    <div class="sf-verdict">
      <span class="sf-eyebrow"><GitMerge :size="12" /> Net clearing position</span>
      <div class="sf-net" :style="{ '--c': coreHex }">
        <span class="sf-sign">{{ agg.net > 0 ? '+' : agg.net < 0 ? '−' : '' }}</span>
        <TrvCountUp :value="Math.abs(agg.net)" :format="fmtINR" class="sf-net-val" />
      </div>
      <p class="sf-dir">
        <component :is="dirIcon" :size="13" /> {{ dirLabel }}
      </p>

      <!-- recovery balance meter -->
      <div class="sf-meter" :title="`Payable ${fmtINR(agg.payable)} · Recoverable ${fmtINR(agg.recoverable)}`">
        <div class="sf-meter-track">
          <span class="sf-meter-pay" :style="{ width: payPct + '%' }" />
          <span class="sf-meter-rec" :style="{ width: recPct + '%' }" />
        </div>
      </div>

      <div class="sf-totals">
        <div class="sf-tot pay">
          <span class="st-dot" /><span class="st-lab">Payable</span>
          <b class="trv-mono"><TrvCountUp :value="agg.payable" :format="fmtCompactINR" /></b>
        </div>
        <div class="sf-tot rec">
          <span class="st-dot" /><span class="st-lab">Recoverable</span>
          <b class="trv-mono"><TrvCountUp :value="agg.recoverable" :format="fmtCompactINR" /></b>
        </div>
        <div class="sf-tot rim">
          <span class="st-dot" /><span class="st-lab">In reconciliation</span>
          <b class="trv-mono">{{ agg.count }}</b>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GitMerge, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { fmtINR, fmtCompactINR } from '@/composables/useTravel'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ items: { type: Array, default: () => [] } })

const root = ref(null)
const reduced = prefersReduced()
const { visible: shown } = useInView(root, { threshold: 0.2 })

const agg = computed(() => {
  let advance = 0, expense = 0, da = 0, payable = 0, recoverable = 0
  for (const s of props.items || []) {
    advance += Number(s.advance_received) || 0
    expense += Number(s.approved_expense || s.total_expense) || 0
    da += Number(s.da_amount) || 0
    payable += Number(s.payable_amount) || 0
    recoverable += Number(s.recoverable_amount) || 0
  }
  return { advance, expense, da, payable, recoverable, net: payable - recoverable, count: (props.items || []).length }
})

// Brand/status colours are theme-invariant, so SVG parts use literal hex —
// var() does NOT resolve inside SVG presentation attributes (only in style/CSS).
const HEX = { steel: '#9ca3af', amber: '#fbbf24', amberStrong: '#f59e0b', ember: '#fb923c', approved: '#34d399', rejected: '#ef4444' }
const dir = computed(() => agg.value.net > 0 ? 'payable' : agg.value.net < 0 ? 'recoverable' : 'balanced')
const coreHex = computed(() => dir.value === 'payable' ? HEX.approved : dir.value === 'recoverable' ? HEX.rejected : HEX.amber)
const dirLabel = computed(() => dir.value === 'payable' ? 'Company owes travellers' : dir.value === 'recoverable' ? 'Travellers owe company' : 'Books are balanced')
const dirShort = computed(() => dir.value === 'payable' ? 'PAYABLE' : dir.value === 'recoverable' ? 'RECOVER' : 'EVEN')
const dirIcon = computed(() => dir.value === 'payable' ? ArrowUpRight : dir.value === 'recoverable' ? ArrowDownRight : Scale)

const payPct = computed(() => { const t = agg.value.payable + agg.value.recoverable; return t ? Math.round((agg.value.payable / t) * 100) : 50 })
const recPct = computed(() => 100 - payPct.value)

// scale stroke widths against one common max so proportions read truthfully
const maxV = computed(() => Math.max(agg.value.advance, agg.value.expense, agg.value.da, agg.value.payable, agg.value.recoverable, 1))
const w = (v) => Math.max(5, 5 + (v / maxV.value) * 28)

const PATHS = {
  advIn: 'M196,72 C322,72 372,150 442,150',
  expIn: 'M196,150 C300,150 372,150 442,150',
  daIn: 'M196,228 C322,228 372,150 442,150',
  payOut: 'M522,150 C616,150 660,96 766,96',
  recOut: 'M522,150 C616,150 660,204 766,204',
}

const streams = computed(() => [
  { id: 'adv', d: PATHS.advIn, grad: 'adv', hex: HEX.amber, w: w(agg.value.advance), dir: 'in', reverse: false, len: 360, dur: 3.4 },
  { id: 'exp', d: PATHS.expIn, grad: 'exp', hex: HEX.amberStrong, w: w(agg.value.expense), dir: 'in', reverse: false, len: 300, dur: 3.0 },
  { id: 'da', d: PATHS.daIn, grad: 'da', hex: HEX.ember, w: w(agg.value.da), dir: 'in', reverse: false, len: 360, dur: 3.6 },
  { id: 'pay', d: PATHS.payOut, grad: 'pay', hex: HEX.approved, w: w(agg.value.payable), dir: 'out', reverse: false, len: 320, dur: 3.2 },
  { id: 'rec', d: PATHS.recOut, grad: 'rec', hex: HEX.rejected, w: w(agg.value.recoverable), dir: 'out', reverse: false, len: 320, dur: 3.2 },
])

const sourceNodes = computed(() => [
  { id: 'adv', x: 150, y: 72, r: 30, hex: HEX.amber, label: 'Advance', disp: fmtCompactINR(agg.value.advance) },
  { id: 'exp', x: 150, y: 150, r: 30, hex: HEX.amberStrong, label: 'Expense', disp: fmtCompactINR(agg.value.expense) },
  { id: 'da', x: 150, y: 228, r: 30, hex: HEX.ember, label: 'DA', disp: fmtCompactINR(agg.value.da) },
])
const outNodes = computed(() => [
  { id: 'pay', x: 812, y: 96, r: 30, hex: HEX.approved, label: 'Payable', disp: fmtCompactINR(agg.value.payable) },
  { id: 'rec', x: 812, y: 204, r: 30, hex: HEX.rejected, label: 'Recoverable', disp: fmtCompactINR(agg.value.recoverable) },
])
</script>

<style scoped>
.sflow {
  position: relative; overflow: hidden; display: grid; grid-template-columns: 1.55fr 0.95fr; gap: 18px;
  align-items: center; padding: 18px 22px; border-radius: 20px; margin-bottom: 16px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
}
.sf-aura { position: absolute; inset: -50% 30% 30% -10%; pointer-events: none;
  background: radial-gradient(55% 75% at 30% 30%, rgba(251,191,36,0.12), transparent 70%); animation: trv-aura-drift 12s ease-in-out infinite; }

.sf-stage { position: relative; min-width: 0; }
.sf-svg { width: 100%; height: auto; display: block; overflow: visible; }

/* streams */
.sf-ribbon { opacity: 0; transition: opacity 0.9s var(--trv-ease) 0.1s; }
.shown .sf-ribbon { opacity: 0.85; }
.sf-line { stroke-dasharray: var(--len) var(--len); stroke-dashoffset: var(--len);
  transition: stroke-dashoffset 1.1s var(--trv-ease) 0.15s; opacity: 0.9; }
.shown .sf-line { stroke-dashoffset: 0; }
.shown .sf-line.dir-in { animation: sf-flow-in 1.4s linear 1.3s infinite; }
.shown .sf-line.dir-out { animation: sf-flow-out 1.4s linear 1.3s infinite; }
.sf-mote { opacity: 0.85; filter: drop-shadow(0 0 4px currentColor); }

@keyframes sf-flow-in { from { stroke-dasharray: 3 13; stroke-dashoffset: 32; } to { stroke-dasharray: 3 13; stroke-dashoffset: 0; } }
@keyframes sf-flow-out { from { stroke-dasharray: 3 13; stroke-dashoffset: 0; } to { stroke-dasharray: 3 13; stroke-dashoffset: 32; } }

/* nodes */
.sf-node-glow { opacity: 0; transform-box: fill-box; transform-origin: center; transform: scale(0.4); transition: opacity 0.6s var(--trv-spring), transform 0.6s var(--trv-spring); filter: blur(7px); }
.shown .sf-node-glow { opacity: 0.22; transform: scale(1); }
.sf-node-ring { fill: var(--trv-flap); stroke-width: 1.6; opacity: 0; transform-box: fill-box; transform-origin: center; transform: scale(0.6); transition: opacity 0.5s var(--trv-spring), transform 0.5s var(--trv-spring); }
.shown .sf-node-ring { opacity: 1; transform: scale(1); }
.sf-node.src .sf-node-glow, .sf-node.src .sf-node-ring { transition-delay: 0.05s; }
.sf-node.out .sf-node-glow, .sf-node.out .sf-node-ring { transition-delay: 0.4s; }
.sf-node-val { font-family: var(--trv-mono); font-size: 13px; font-weight: 800; fill: #f4f3f0; opacity: 0; transition: opacity 0.5s ease 0.5s; }
.shown .sf-node-val { opacity: 1; }
.sf-node-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; fill: var(--trv-text-dim); opacity: 0; transition: opacity 0.5s ease 0.55s; }
.shown .sf-node-lab { opacity: 1; }

/* reactor */
.sf-core-halo { opacity: 0; transform-box: fill-box; transform-origin: center; transform: scale(0.3); transition: opacity 0.8s var(--trv-spring) 0.5s, transform 0.8s var(--trv-spring) 0.5s; }
.shown .sf-core-halo { opacity: 1; transform: scale(1); }
.sf-core-spin { transform-origin: 482px 150px; animation: sf-spin 18s linear infinite; }
.sf-core-disc { fill: var(--trv-flap); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; transform: scale(0.4); transition: opacity 0.6s var(--trv-spring) 0.55s, transform 0.6s var(--trv-spring) 0.55s; }
.shown .sf-core-disc { opacity: 1; transform: scale(1); }
.sf-core-pulse { fill: none; stroke-width: 2; opacity: 0; transform-origin: 482px 150px; }
.shown .sf-core-pulse { animation: sf-core-pulse 2.6s ease-out 1.2s infinite; }
.sf-core-cap { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; fill: rgba(244,243,240,0.55); opacity: 0; transition: opacity 0.5s ease 0.9s; }
.shown .sf-core-cap { opacity: 1; }
.sf-core-num { font-size: 15px; font-weight: 850; opacity: 0; transition: opacity 0.5s ease 1s; }
.shown .sf-core-num { opacity: 1; }

@keyframes sf-spin { to { transform: rotate(360deg); } }
@keyframes sf-core-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.85); opacity: 0; } }

/* verdict panel */
.sf-verdict { position: relative; display: flex; flex-direction: column; gap: 9px; padding-left: 16px; border-left: 1px solid var(--trv-border); }
.sf-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-text-muted); }
.sf-net { display: flex; align-items: baseline; gap: 2px; color: var(--c); }
.sf-sign { font-size: 26px; font-weight: 850; }
.sf-net-val { font-size: clamp(26px, 4vw, 40px); font-weight: 850; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.sf-dir { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; font-weight: 650; color: var(--trv-text-secondary); }

.sf-meter { margin-top: 2px; }
.sf-meter-track { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.sf-meter-pay { background: linear-gradient(90deg, var(--trv-st-approved), color-mix(in srgb, var(--trv-st-approved) 55%, transparent)); transition: width 0.9s var(--trv-spring); }
.sf-meter-rec { background: linear-gradient(90deg, color-mix(in srgb, var(--trv-st-rejected) 55%, transparent), var(--trv-st-rejected)); transition: width 0.9s var(--trv-spring); }

.sf-totals { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; }
.sf-tot { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; font-size: 12px; }
.st-dot { width: 8px; height: 8px; border-radius: 50%; }
.sf-tot.pay .st-dot { background: var(--trv-st-approved); }
.sf-tot.rec .st-dot { background: var(--trv-st-rejected); }
.sf-tot.rim .st-dot { background: var(--trv-amber); }
.st-lab { color: var(--trv-text-muted); }
.sf-tot b { color: var(--trv-text); font-size: 13px; }

@media (max-width: 900px) { .sflow { grid-template-columns: 1fr; } .sf-verdict { border-left: none; border-top: 1px solid var(--trv-border); padding-left: 0; padding-top: 14px; } }
@media (prefers-reduced-motion: reduce) {
  .sf-aura, .sf-core-spin, .sf-core-pulse, .sf-line.dir-in, .sf-line.dir-out { animation: none !important; }
  .sf-ribbon, .sf-line, .sf-node-glow, .sf-node-ring, .sf-node-val, .sf-node-lab, .sf-core-halo, .sf-core-disc, .sf-core-cap, .sf-core-num { transition: none !important; }
}
</style>
