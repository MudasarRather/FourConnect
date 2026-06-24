<template>
  <div class="rk ex-grain" :class="dir" :style="{ '--c': dirColor }">
    <span class="rk-aura" aria-hidden="true" />
    <Scale class="rk-ghost" :size="220" aria-hidden="true" />

    <!-- ── the tilting balance ── -->
    <div class="rk-stage">
      <svg class="rk-svg" viewBox="0 0 360 168" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <!-- static stand -->
        <ellipse cx="180" cy="150" rx="52" ry="7" class="rk-base" />
        <line x1="180" y1="64" x2="180" y2="150" class="rk-post" />
        <path d="M160,150 L200,150 L180,112 Z" class="rk-tri" />
        <!-- swinging group -->
        <g class="rk-beam-g" :style="{ '--tilt': tilt + 'deg' }">
          <rect x="46" y="60" width="268" height="8" rx="4" class="rk-beam" />
          <circle cx="180" cy="64" r="7" class="rk-pivot" />
          <!-- left arm = earnings -->
          <line x1="70" y1="64" x2="62" y2="98" class="rk-chain" />
          <line x1="70" y1="64" x2="78" y2="98" class="rk-chain" />
          <path d="M48,98 Q70,128 92,98" class="rk-bowl earn" />
          <line x1="48" y1="98" x2="92" y2="98" class="rk-bowl-rim earn" />
          <!-- right arm = recoveries -->
          <line x1="290" y1="64" x2="282" y2="98" class="rk-chain" />
          <line x1="290" y1="64" x2="298" y2="98" class="rk-chain" />
          <path d="M268,98 Q290,128 312,98" class="rk-bowl rec" />
          <line x1="268" y1="98" x2="312" y2="98" class="rk-bowl-rim rec" />
        </g>
      </svg>

      <!-- net reactor ring over the stand -->
      <div class="rk-net">
        <div class="rk-ring" :style="{ '--ex-p': ringDeg + 'deg' }">
          <div class="rk-core">
            <span class="rk-eyebrow">{{ dirLabel }}</span>
            <span class="rk-val ex-mono"><ExCountUp :value="Math.abs(net)" :format="fmtINR" /></span>
            <span class="rk-sub ex-mono">{{ settlementNumber || '—' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── pan readouts ── -->
    <div class="rk-sides">
      <div class="rk-side earn">
        <div class="rk-side-top"><span class="rk-dot" /><TrendingUp :size="12" /> Earnings</div>
        <div class="rk-side-val ex-mono"><ExCountUp :value="num(earnings)" :format="fmtINR" /></div>
        <div class="rk-bar"><span class="rk-bar-fill earn" :style="{ width: earnPct + '%' }" /></div>
      </div>
      <div class="rk-side rec">
        <div class="rk-side-top"><span class="rk-dot" /><TrendingDown :size="12" /> Recoveries</div>
        <div class="rk-side-val ex-mono"><ExCountUp :value="num(recoveries)" :format="fmtINR" /></div>
        <div class="rk-bar"><span class="rk-bar-fill rec" :style="{ width: recPct + '%' }" /></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Scale, TrendingUp, TrendingDown } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { fmtINR } from '@/composables/useExit'

const props = defineProps({
  earnings: { type: Number, default: 0 },
  recoveries: { type: Number, default: 0 },
  settlementNumber: { type: String, default: '' },
})

const num = (v) => Number(v || 0)
const net = computed(() => num(props.earnings) - num(props.recoveries))
const maxSide = computed(() => Math.max(num(props.earnings), num(props.recoveries), 1))
const earnPct = computed(() => Math.round((num(props.earnings) / maxSide.value) * 100))
const recPct = computed(() => Math.round((num(props.recoveries) / maxSide.value) * 100))

// recoveries heavier ⇒ right pan drops ⇒ positive rotation; earnings heavier ⇒ left drops ⇒ negative.
const tilt = computed(() => {
  const t = ((num(props.recoveries) - num(props.earnings)) / maxSide.value) * 8
  return Math.max(-8, Math.min(8, t)).toFixed(2)
})

const dir = computed(() => (net.value > 0 ? 'payable' : net.value < 0 ? 'recoverable' : 'balanced'))
const dirLabel = computed(() => (
  dir.value === 'payable' ? 'NET PAYABLE' : dir.value === 'recoverable' ? 'NET RECOVERABLE' : 'BALANCED'
))
const dirColor = computed(() => (
  dir.value === 'payable' ? 'var(--ex-cleared)' : dir.value === 'recoverable' ? 'var(--ex-blocked)' : 'var(--ex-steel, #9ca3af)'
))
// ring sweep ∝ how lopsided the reckoning is (|net| / gross flow), min visible arc.
const ringDeg = computed(() => {
  const gross = num(props.earnings) + num(props.recoveries)
  if (gross <= 0) return 8
  const p = Math.min(1, Math.abs(net.value) / gross)
  return Math.round(Math.max(0.05, p) * 360)
})
</script>

<style scoped>
@property --ex-p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }

.rk {
  position: relative; overflow: hidden; border-radius: 18px; padding: 18px 18px 16px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
}
.rk-aura { position: absolute; inset: -50% 30% 40% -20%; pointer-events: none;
  background: radial-gradient(60% 70% at 30% 10%, color-mix(in srgb, var(--c) 22%, transparent), transparent 72%);
  animation: rk-aura 11s ease-in-out infinite; }
.rk-ghost { position: absolute; right: -54px; bottom: -54px; color: var(--c); opacity: 0.05;
  animation: rk-spin 80s linear infinite; pointer-events: none; }

.rk-stage { position: relative; }
.rk-svg { display: block; width: 100%; height: auto; overflow: visible; }
.rk-base { fill: color-mix(in srgb, var(--ex-text) 8%, transparent); }
.rk-post { stroke: var(--ex-border-strong); stroke-width: 4; stroke-linecap: round; }
.rk-tri { fill: color-mix(in srgb, var(--ex-text-muted) 40%, transparent); }
.rk-beam-g { transform: rotate(var(--tilt, 0deg)); transform-origin: 180px 64px; transition: transform 1.15s var(--ex-spring); }
.rk-beam { fill: url(#none); fill: color-mix(in srgb, var(--ex-amber) 70%, var(--ex-text)); }
.rk-pivot { fill: var(--ex-amber-bright); filter: drop-shadow(0 0 6px var(--ex-amber)); }
.rk-chain { stroke: var(--ex-border-strong); stroke-width: 1.6; }
.rk-bowl { fill: none; stroke-width: 5; stroke-linecap: round; }
.rk-bowl.earn { stroke: var(--ex-cleared); filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--ex-cleared) 40%, transparent)); }
.rk-bowl.rec { stroke: var(--ex-blocked); filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--ex-blocked) 40%, transparent)); }
.rk-bowl-rim { stroke-width: 2; opacity: 0.5; }
.rk-bowl-rim.earn { stroke: var(--ex-cleared); }
.rk-bowl-rim.rec { stroke: var(--ex-blocked); }

.rk-net { position: absolute; left: 50%; bottom: -6px; transform: translateX(-50%); }
.rk-ring { width: 124px; height: 124px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(from -90deg, var(--c) var(--ex-p), color-mix(in srgb, var(--ex-text) 9%, transparent) 0);
  transition: --ex-p 1.15s var(--ex-spring); }
.rk-ring::after { content: ''; position: absolute; inset: -3px; border-radius: 50%;
  box-shadow: 0 0 26px -4px color-mix(in srgb, var(--c) 55%, transparent); pointer-events: none; }
.rk-core { position: relative; width: 102px; height: 102px; border-radius: 50%; display: grid; place-content: center; text-align: center;
  background: var(--ex-surface-elevated); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
.rk-eyebrow { font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--c); }
.rk-val { font-size: 18px; font-weight: 850; color: var(--ex-text); line-height: 1.05; margin-top: 2px; }
.rk-sub { font-size: 8.5px; color: var(--ex-text-dim); margin-top: 2px; }

.rk-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.rk-side { padding: 9px 11px; border-radius: 12px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.rk-side-top { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.rk-side.earn .rk-side-top { color: var(--ex-cleared); }
.rk-side.rec .rk-side-top { color: var(--ex-blocked); }
.rk-dot { width: 7px; height: 7px; border-radius: 50%; }
.rk-side.earn .rk-dot { background: var(--ex-cleared); box-shadow: 0 0 7px var(--ex-cleared); }
.rk-side.rec .rk-dot { background: var(--ex-blocked); box-shadow: 0 0 7px var(--ex-blocked); }
.rk-side-val { font-size: 16px; font-weight: 820; color: var(--ex-text); margin: 5px 0 7px; }
.rk-bar { height: 5px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--ex-text) 8%, transparent); }
.rk-bar-fill { display: block; height: 100%; border-radius: 3px; transition: width 1.1s var(--ex-spring); }
.rk-bar-fill.earn { background: linear-gradient(90deg, #34d399, #059669); }
.rk-bar-fill.rec { background: linear-gradient(90deg, #f87171, #b91c1c); }

@media (prefers-reduced-motion: reduce) {
  .rk-aura, .rk-ghost { animation: none; }
  .rk-beam-g, .rk-ring, .rk-bar-fill { transition: none; }
}
@keyframes rk-aura { 0%,100% { transform: translate(0,0) scale(1); opacity: 0.85; } 50% { transform: translate(8%,4%) scale(1.08); opacity: 1; } }
@keyframes rk-spin { to { transform: rotate(360deg); } }
</style>
