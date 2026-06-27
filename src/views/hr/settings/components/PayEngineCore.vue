<template>
  <!-- "The Pay Engine" — a live calculation turbine. A sample salary flows
       left→right through the configured rules: intake → attendance/LOP gate →
       overtime turbine → tax filter → net output. Continuous ambient motion
       (flowing capital, spinning turbine, breathing aura) is the point —
       entrance-only motion reads as static. -->
  <div ref="root" class="pe" :class="{ reduced }">
    <span class="pe-grain" aria-hidden="true" />
    <span class="pe-aura" aria-hidden="true" />
    <span class="pe-floor" aria-hidden="true" />

    <header class="pe-head">
      <span class="pe-eyebrow"><Cpu :size="12" /> Calculation engine · live</span>
      <span class="pe-cycle set-mono">{{ cycleLabel }}</span>
    </header>

    <!-- the flow rail -->
    <div class="pe-rail">
      <span class="pe-pipe" aria-hidden="true" />
      <span class="pe-pipe-flow" aria-hidden="true" />
      <!-- flowing capital -->
      <span class="pe-track" aria-hidden="true">
        <span v-for="m in motes" :key="m" class="pe-mote"
          :style="{ '--d': `${(m * 0.7).toFixed(2)}s`, '--dur': `${(3.4 + (m % 4) * 0.5).toFixed(2)}s`, '--y': `${(m % 3 - 1) * 6}px` }" />
      </span>

      <!-- chambers -->
      <div v-for="(c, i) in chambers" :key="c.key" class="pe-chamber" :data-tone="c.tone">
        <span class="pe-ch-glow" aria-hidden="true" />
        <div class="pe-ch-disc" :class="{ spin: c.spin && !reduced }">
          <span v-if="c.spin" class="pe-turbine" aria-hidden="true">
            <i v-for="b in 6" :key="b" :style="{ transform: `rotate(${b * 60}deg)` }" />
          </span>
          <span class="pe-ch-ring" :style="{ '--pe-ring': `${Math.round((c.gauge || 0) * 360)}deg` }" aria-hidden="true" />
          <component :is="c.icon" :size="17" class="pe-ch-ic" />
        </div>
        <div class="pe-ch-meta">
          <span class="pe-ch-label">{{ c.label }}</span>
          <b class="pe-ch-value set-mono">{{ c.value }}</b>
          <span v-if="c.sub" class="pe-ch-sub">{{ c.sub }}</span>
        </div>
        <span v-if="i < chambers.length - 1" class="pe-arrow" aria-hidden="true"><ChevronRight :size="13" /></span>
      </div>
    </div>

    <!-- net output odometer -->
    <div class="pe-output">
      <div class="pe-out-left">
        <span class="pe-out-lab"><Banknote :size="12" /> Net of loss-of-pay</span>
        <div class="pe-odo" :class="{ pulse: pulsing }">
          <span class="pe-odo-cur">₹</span>
          <span v-for="(ch, i) in netChars" :key="i" class="pe-odo-cell" :class="{ sep: ch.sep }">
            <template v-if="ch.sep">{{ ch.v }}</template>
            <span v-else class="pe-odo-reel" :style="{ transform: `translateY(${-ch.v * 10}%)` }">
              <i v-for="n in 10" :key="n">{{ n - 1 }}</i>
            </span>
          </span>
        </div>
      </div>
      <div class="pe-out-right">
        <div class="pe-stat"><span>Per-day</span><b class="set-mono">₹{{ fmt(perDay) }}</b></div>
        <div class="pe-stat warn"><span>LOP −</span><b class="set-mono">₹{{ fmt(lopDeduction) }}</b></div>
        <div class="pe-stat"><span>OT / hr</span><b class="set-mono">₹{{ fmt(otPerHour) }}</b></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Cpu, ChevronRight, Banknote, Wallet, CalendarClock, Timer, Landmark } from 'lucide-vue-next'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  gross: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  perDay: { type: Number, default: 0 },
  lopDeduction: { type: Number, default: 0 },
  otPerHour: { type: Number, default: 0 },
  workingDays: { type: Number, default: 30 },
  lopDays: { type: Number, default: 0 },
  basisLabel: { type: String, default: 'Calendar 30' },
  lopLabel: { type: String, default: 'Per calendar day' },
  otMult: { type: [Number, String], default: 1.5 },
  taxRegime: { type: String, default: 'NEW' },
  cycleLabel: { type: String, default: 'Monthly' },
})

const root = ref(null)
usePointerSpotlight(root)   // sets --mx/--my on root; children inherit
const reduced = prefersReduced()
const motes = Array.from({ length: 11 }, (_, i) => i + 1)

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('en-IN')

// gauge helpers (0..1) — how "loaded" each chamber is
const chambers = computed(() => {
  const g = Number(props.gross) || 1
  return [
    { key: 'in', label: 'Gross intake', value: `₹${fmt(props.gross)}`, sub: 'monthly', icon: Wallet, tone: 'gold', gauge: 1, spin: false },
    { key: 'att', label: 'Attendance', value: props.basisLabel, sub: `${props.workingDays} working days`, icon: CalendarClock, tone: 'gold', gauge: Math.min(1, props.workingDays / 31), spin: false },
    { key: 'ot', label: 'Overtime', value: `${props.otMult}×`, sub: 'turbine', icon: Timer, tone: 'orange', gauge: Math.min(1, (Number(props.otMult) || 1.5) / 3), spin: true },
    { key: 'tax', label: 'Tax regime', value: props.taxRegime, sub: 'default', icon: Landmark, tone: 'ok', gauge: 0.66, spin: false },
  ]
})

const netChars = computed(() => {
  const s = fmt(props.net)
  return s.split('').map((c) => /\d/.test(c) ? { sep: false, v: Number(c) } : { sep: true, v: c })
})

// flash a recompute pulse whenever the net changes
const pulsing = ref(false)
let t = null
watch(() => props.net, () => {
  if (reduced) return
  pulsing.value = false
  clearTimeout(t)
  requestAnimationFrame(() => { pulsing.value = true; t = setTimeout(() => (pulsing.value = false), 700) })
})
</script>

<style scoped>
.pe {
  position: relative; overflow: hidden; border-radius: 20px;
  padding: 18px 20px 20px;
  background: linear-gradient(160deg, var(--set-surface-elevated), var(--set-panel));
  border: 1px solid var(--set-border-strong);
  box-shadow: var(--set-card-shadow);
}
.pe-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.04) 0.5px, transparent 1.4px),
                    radial-gradient(circle at 75% 60%, rgba(0,0,0,0.18) 0.5px, transparent 1.4px);
  background-size: 30px 30px, 38px 38px; }
.pe-aura { position: absolute; inset: -40% 30% auto -10%; height: 150%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-amber) 22%, transparent), transparent 68%);
  filter: blur(40px);
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 26px), calc((var(--my,0.5) - 0.5) * 18px), 0); }
.pe-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--set-trace-idle) 1px, transparent 1px), linear-gradient(90deg, var(--set-trace-idle) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(circle at 50% 60%, #000 30%, transparent 80%); }

.pe-head { position: relative; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.pe-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-amber); }
.pe-cycle { font-size: 11px; color: var(--set-text-muted); padding: 3px 9px; border-radius: 999px; background: var(--set-surface); border: 1px solid var(--set-border); }

/* ── flow rail ── */
.pe-rail { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 6px 4px 22px;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 8px), 0, 0); }
.pe-pipe { position: absolute; left: 28px; right: 28px; top: 31px; height: 4px; border-radius: 4px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--set-amber) 30%, transparent), color-mix(in srgb, var(--set-deep) 30%, transparent)); opacity: 0.5; }
.pe-pipe-flow { position: absolute; left: 28px; right: 28px; top: 31px; height: 4px; border-radius: 4px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--set-trace-flow), transparent); background-size: 38% 100%;
  animation: pe-pipe 2.6s linear infinite; opacity: 0.9; }
@keyframes pe-pipe { 0% { background-position: -40% 0; } 100% { background-position: 140% 0; } }

.pe-track { position: absolute; left: 28px; right: 28px; top: 28px; height: 8px; pointer-events: none; }
.pe-mote { position: absolute; top: 1px; left: 0; width: 6px; height: 6px; border-radius: 50%;
  background: radial-gradient(circle, var(--set-gold-bright), var(--set-amber)); box-shadow: 0 0 8px 1px color-mix(in srgb, var(--set-amber) 60%, transparent);
  transform: translateY(var(--y, 0)); animation: pe-flow var(--dur, 4s) linear infinite; animation-delay: var(--d, 0s); opacity: 0; }
@keyframes pe-flow {
  0% { left: 0%; opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}

.pe-chamber { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 7px; flex: 1; min-width: 0; }
.pe-ch-glow { position: absolute; top: -6px; width: 70px; height: 70px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--ct, var(--set-amber)) 28%, transparent), transparent 70%); opacity: 0.5; filter: blur(8px); }
.pe-chamber[data-tone="gold"] { --ct: var(--set-amber); }
.pe-chamber[data-tone="orange"] { --ct: var(--set-orange); }
.pe-chamber[data-tone="ok"] { --ct: var(--set-ok); }

.pe-ch-disc { position: relative; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px;
  background: var(--set-surface); border: 1px solid color-mix(in srgb, var(--ct) 34%, var(--set-border)); }
.pe-ch-ic { position: relative; z-index: 3; color: var(--ct); }
.pe-ch-ring { position: absolute; inset: -1px; border-radius: 16px; padding: 1.5px; pointer-events: none;
  background: conic-gradient(var(--ct) var(--pe-ring, 180deg), transparent 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0.8; transition: background 0.6s var(--set-spring); }
.pe-turbine { position: absolute; inset: 8px; pointer-events: none; }
.pe-turbine i { position: absolute; left: 50%; top: 50%; width: 2px; height: 16px; margin: -16px 0 0 -1px; transform-origin: 50% 100%; border-radius: 2px;
  background: linear-gradient(var(--ct), transparent); opacity: 0.7; }
.pe-ch-disc.spin { animation: pe-spin 5.5s linear infinite; }
@keyframes pe-spin { to { transform: rotate(360deg); } }
.pe-ch-disc.spin .pe-ch-ic { animation: pe-spin-rev 5.5s linear infinite; }
@keyframes pe-spin-rev { to { transform: rotate(-360deg); } }

.pe-ch-meta { display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; min-width: 0; width: 100%; }
.pe-ch-label { font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.pe-ch-value { font-size: 12.5px; font-weight: 800; color: var(--set-text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pe-ch-sub { font-size: 9.5px; color: var(--set-text-muted); }
.pe-arrow { position: absolute; right: -7px; top: 20px; color: var(--set-text-dim); z-index: 3; }

/* ── output odometer ── */
.pe-output { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin-top: 6px; padding: 14px 16px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.pe-out-left { display: flex; flex-direction: column; gap: 6px; }
.pe-out-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.pe-out-lab :deep(svg) { color: var(--set-ok); }
.pe-odo { display: inline-flex; align-items: center; gap: 1px; font-family: var(--set-mono); font-size: 30px; font-weight: 800; color: var(--set-ok); line-height: 1; transition: filter 0.3s; }
.pe-odo.pulse { animation: pe-odo-pulse 0.7s var(--set-spring); }
@keyframes pe-odo-pulse { 0% { filter: brightness(1.7) drop-shadow(0 0 10px color-mix(in srgb, var(--set-ok) 60%, transparent)); } 100% { filter: none; } }
.pe-odo-cur { font-size: 18px; opacity: 0.7; margin-right: 2px; }
.pe-odo-cell { position: relative; display: inline-block; height: 1em; overflow: hidden; }
.pe-odo-cell.sep { width: auto; overflow: visible; }
.pe-odo-reel { display: inline-flex; flex-direction: column; transition: transform 0.7s var(--set-spring); }
.pe-odo-reel i { height: 1em; font-style: normal; display: flex; align-items: center; justify-content: center; }

.pe-out-right { display: flex; gap: 18px; flex-wrap: wrap; }
.pe-stat { display: flex; flex-direction: column; gap: 2px; }
.pe-stat span { font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.pe-stat b { font-size: 14px; font-weight: 800; color: var(--set-text); }
.pe-stat.warn b { color: var(--set-orange); }

@media (max-width: 720px) {
  .pe-ch-sub { display: none; }
  .pe-out-right { gap: 12px; }
  .pe-odo { font-size: 24px; }
}

/* ════════ reduced motion ════════ */
.pe.reduced .pe-pipe-flow, .pe.reduced .pe-mote, .pe.reduced .pe-ch-disc.spin,
.pe.reduced .pe-ch-disc.spin .pe-ch-ic { animation: none !important; }
.pe.reduced .pe-mote { display: none; }
@media (prefers-reduced-motion: reduce) {
  .pe-pipe-flow, .pe-mote, .pe-ch-disc.spin, .pe-ch-disc.spin .pe-ch-ic, .pe-odo.pulse { animation: none !important; }
  .pe-mote { display: none; }
}
</style>
