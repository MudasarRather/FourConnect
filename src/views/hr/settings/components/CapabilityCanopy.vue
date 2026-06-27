<template>
  <!-- ═══════════ THE CAPABILITY CANOPY ═══════════
       A living tree of capability: the trunk is the org's learning
       foundation, branches are the seven training families (sized by
       live program counts), blooms are the knowledge each one bears,
       and a "sun of mastery" overhead brightens with completion. The
       signature instrument for Training governance — distinct from every
       sibling's funnel / rocket / relay / turbine / shield motif. -->
  <div ref="rootEl" class="cc" :class="{ grown }">
    <span class="cc-grain" aria-hidden="true" />

    <div class="cc-stage">
      <svg class="cc-svg" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="ccTrunk" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="var(--cc-trunk-base)" />
            <stop offset="100%" stop-color="var(--cc-trunk-tip)" />
          </linearGradient>
          <radialGradient id="ccSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--cc-sun-core)" />
            <stop offset="45%" stop-color="var(--cc-sun-mid)" />
            <stop offset="100%" stop-color="transparent" />
          </radialGradient>
          <radialGradient id="ccFoliage" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stop-color="var(--cc-foliage)" />
            <stop offset="100%" stop-color="transparent" />
          </radialGradient>
        </defs>

        <!-- blueprint floor -->
        <g class="cc-floor" aria-hidden="true">
          <line v-for="gx in 11" :key="'gx'+gx" :x1="(gx-1)*100" y1="0" :x2="(gx-1)*100" y2="480" />
          <line v-for="gy in 6" :key="'gy'+gy" x1="0" :y1="(gy-1)*96" x2="1000" :y2="(gy-1)*96" />
        </g>

        <!-- sun of mastery -->
        <g class="cc-sun-layer" :style="{ '--depth': 26 }">
          <circle class="cc-sun" cx="500" cy="120" :r="120" fill="url(#ccSun)" :style="{ '--glow': sunGlow }" />
          <circle class="cc-sun-ring r1" cx="500" cy="120" r="70" />
          <circle class="cc-sun-ring r2" cx="500" cy="120" r="70" />
          <circle class="cc-sun-core" cx="500" cy="120" :r="22 + sunGlow*10" :style="{ '--glow': sunGlow }" />
        </g>

        <!-- canopy foliage mass -->
        <ellipse class="cc-foliage" cx="500" cy="240" rx="330" ry="150" fill="url(#ccFoliage)" />

        <!-- the tree -->
        <g class="cc-tree" :style="{ '--depth': 8 }">
          <!-- roots -->
          <path class="cc-root" d="M 500 442 C 470 450 440 452 410 460" />
          <path class="cc-root" d="M 500 442 C 530 450 560 452 590 460" />
          <path class="cc-root" d="M 500 444 L 500 466" />

          <!-- trunk -->
          <path class="cc-trunk" fill="url(#ccTrunk)"
            d="M 485 448 C 489 386 495 322 495 252 L 505 252 C 505 322 511 386 515 448 Z" />
          <!-- rising sap spark -->
          <circle class="cc-sap" cx="500" cy="446" r="3.2" />

          <!-- branches + blooms -->
          <g v-for="(b, i) in branches" :key="b.key" class="cc-arm" :style="{ '--bi': i, '--c': b.color }">
            <path class="cc-branch" :d="b.path" :style="{ strokeWidth: b.width }" pathLength="1" />
            <g class="cc-bloom" :transform="`translate(${b.tx} ${b.ty})`">
              <g class="cc-bloom-inner" :style="{ '--phase': b.phase }">
                <circle class="cc-bloom-glow" :r="Number(b.r) + 9" />
                <circle class="cc-bloom-core" :r="b.r" />
                <circle class="cc-bloom-rim" :r="b.r" />
                <text v-if="b.count > 0" class="cc-bloom-num" x="0" :y="0.5">{{ b.count }}</text>
              </g>
            </g>
          </g>
        </g>

        <!-- rising knowledge motes (data-independent → never empty) -->
        <g class="cc-motes" :style="{ '--depth': 16 }">
          <circle v-for="m in motes" :key="m.id" class="cc-mote"
            :cx="m.x" cy="470" :r="m.r"
            :style="{ '--dur': m.dur + 's', '--delay': m.delay + 's', '--rise': m.rise + 'px', '--drift': m.drift + 'px' }" />
        </g>
      </svg>

      <!-- floating glass HUD -->
      <div class="cc-hud">
        <span class="cc-hud-eyebrow"><Sprout :size="11" /> Capability canopy</span>
        <div class="cc-hud-stats">
          <div class="cc-hud-stat">
            <span class="cc-hud-val"><SetCountUp :value="programs" /></span>
            <span class="cc-hud-lab">Programs</span>
          </div>
          <div class="cc-hud-stat">
            <span class="cc-hud-val"><SetCountUp :value="employees" /></span>
            <span class="cc-hud-lab">Trained</span>
          </div>
          <div class="cc-hud-stat accent">
            <span class="cc-hud-val"><SetCountUp :value="completion" :decimals="0" suffix="%" /></span>
            <span class="cc-hud-lab">Completion</span>
          </div>
        </div>
      </div>
    </div>

    <!-- canopy legend (color → training family) -->
    <div class="cc-legend">
      <span v-for="b in branches" :key="b.key" class="cc-leg" :class="{ dim: b.count === 0 }" :style="{ '--c': b.color }">
        <span class="cc-leg-dot" />
        <component :is="b.icon" :size="12" class="cc-leg-ic" />
        <span class="cc-leg-lab">{{ b.label }}</span>
        <b class="cc-leg-n">{{ b.count }}</b>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Sprout } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { useInView, usePointerSpotlight, prefersReduced, seededWave } from '@/composables/useShiftMotion'
import { TRAINING_TYPE_ORDER, TRAINING_TYPE_META, toneColor } from '../composables/trainingVocab'

const props = defineProps({
  byType: { type: Array, default: () => [] },     // [{ type, count }]
  completion: { type: Number, default: 0 },        // completion_rate 0..100
  programs: { type: Number, default: 0 },
  employees: { type: Number, default: 0 },
})

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const { visible } = useInView(rootEl, { threshold: 0.2 })
const grown = ref(false)
onMounted(() => {
  if (prefersReduced()) { grown.value = true; return }
  const stop = () => requestAnimationFrame(() => requestAnimationFrame(() => { grown.value = true }))
  if (visible.value) stop()
  else {
    const unwatch = setInterval(() => { if (visible.value) { stop(); clearInterval(unwatch) } }, 120)
    setTimeout(() => clearInterval(unwatch), 4000)
  }
})

const sunGlow = computed(() => Math.max(0.18, Math.min(1, (props.completion || 0) / 100)))

const branches = computed(() => {
  const counts = {}
  for (const r of (props.byType || [])) counts[r.type] = r.count || 0
  const max = Math.max(1, ...TRAINING_TYPE_ORDER.map(k => counts[k] || 0))
  const N = TRAINING_TYPE_ORDER.length
  const F = { x: 500, y: 250 }
  return TRAINING_TYPE_ORDER.map((k, i) => {
    const meta = TRAINING_TYPE_META[k]
    const count = counts[k] || 0
    const t = N === 1 ? 0.5 : i / (N - 1)
    const ang = (-74 + 148 * t) * Math.PI / 180
    const share = count / max
    const len = 128 + 104 * share
    const tx = F.x + Math.sin(ang) * len
    const ty = F.y - Math.cos(ang) * len * 0.9
    const cx = F.x + Math.sin(ang) * len * 0.42
    const cy = F.y - Math.cos(ang) * len * 0.56 - 8
    return {
      key: k, label: meta.label, icon: meta.icon, color: toneColor(meta.tone),
      count, share,
      path: `M ${F.x} ${F.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`,
      tx: tx.toFixed(1), ty: ty.toFixed(1),
      width: (3 + 7 * share).toFixed(1),
      r: (10 + 22 * share).toFixed(1),
      phase: (i * 0.65).toFixed(2),
    }
  })
})

// ambient rising motes — seeded so they're deterministic and never "empty"
const motes = computed(() => {
  const w = seededWave(7, 18)
  return w.map((n, i) => ({
    id: i,
    x: (60 + n * 880).toFixed(0),
    r: (1.2 + (i % 3) * 0.9).toFixed(1),
    dur: (7 + n * 7).toFixed(1),
    delay: (-(i * 0.9)).toFixed(1),
    rise: (-260 - n * 120).toFixed(0),
    drift: ((i % 2 ? 1 : -1) * (16 + n * 40)).toFixed(0),
  }))
})
</script>

<style scoped>
.cc {
  position: relative; overflow: hidden; border-radius: 20px;
  background:
    radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--set-gold) 12%, transparent), transparent 60%),
    var(--set-surface);
  border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  display: flex; flex-direction: column;
  --cc-trunk-base: #7c4a18; --cc-trunk-tip: #b45309;
  --cc-sun-core: rgba(252, 211, 77, 0.95); --cc-sun-mid: rgba(251, 146, 60, 0.4);
  --cc-foliage: rgba(217, 119, 6, 0.16);
  --mx: 0.5; --my: 0.5;
}
[data-theme="light"] .cc { --cc-trunk-base: #92400e; --cc-trunk-tip: #c2410c;
  --cc-sun-core: rgba(234, 179, 8, 0.85); --cc-sun-mid: rgba(234, 88, 12, 0.34);
  --cc-foliage: rgba(194, 65, 12, 0.14); }

.cc-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(130% 120% at 50% 0%, #000 20%, transparent 78%);
  -webkit-mask-image: radial-gradient(130% 120% at 50% 0%, #000 20%, transparent 78%); }

.cc-stage { position: relative; z-index: 1; width: 100%; aspect-ratio: 1000 / 480; }
.cc-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

/* parallax depth — each layer shifts opposite the pointer */
.cc-sun-layer, .cc-tree, .cc-motes {
  transform: translate(calc((var(--mx) - 0.5) * var(--depth) * -1px), calc((var(--my) - 0.5) * var(--depth) * -0.5px));
  transition: transform 0.4s var(--set-spring);
}

/* floor grid */
.cc-floor line { stroke: var(--set-trace-idle); stroke-width: 1;
  mask-image: linear-gradient(180deg, transparent, #000 60%); }

/* sun */
.cc-sun { opacity: calc(0.35 + var(--glow) * 0.55); transform-box: fill-box; transform-origin: center;
  animation: cc-sun-breathe 7s ease-in-out infinite; }
.cc-sun-core { fill: var(--cc-sun-core); opacity: calc(0.4 + var(--glow) * 0.6);
  filter: blur(2px); transform-box: fill-box; transform-origin: center; animation: cc-sun-breathe 5s ease-in-out infinite; }
.cc-sun-ring { fill: none; stroke: color-mix(in srgb, var(--set-gold) 50%, transparent); stroke-width: 1.4;
  transform-box: fill-box; transform-origin: center; opacity: 0; }
.cc-sun-ring.r1 { animation: cc-emit 4.5s ease-out infinite; }
.cc-sun-ring.r2 { animation: cc-emit 4.5s ease-out infinite 2.25s; }

.cc-foliage { opacity: 0; transition: opacity 1.1s ease 0.2s; }
.cc.grown .cc-foliage { opacity: 1; }

/* roots */
.cc-root { fill: none; stroke: var(--cc-trunk-base); stroke-width: 4; stroke-linecap: round; opacity: 0;
  transition: opacity 0.7s ease; }
.cc.grown .cc-root { opacity: 0.7; }

/* trunk */
.cc-trunk { opacity: 0; transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(0.2);
  transition: opacity 0.6s ease, transform 0.8s var(--set-spring); }
.cc.grown .cc-trunk { opacity: 1; transform: scaleY(1); }

/* sap spark riding up the trunk */
.cc-sap { fill: var(--set-gold-bright); opacity: 0; transform-box: fill-box; transform-origin: center;
  filter: drop-shadow(0 0 5px var(--set-gold)); animation: cc-sap 4.4s ease-in-out infinite 0.6s; }

/* branches */
.cc-branch { fill: none; stroke: var(--c); stroke-linecap: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0.92;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 45%, transparent));
  transition: stroke-dashoffset 0.9s var(--set-spring); transition-delay: calc(0.25s + var(--bi) * 0.09s); }
.cc.grown .cc-branch { stroke-dashoffset: 0; }

/* blooms */
.cc-bloom { opacity: 0; transition: opacity 0.5s ease; transition-delay: calc(0.7s + var(--bi) * 0.09s); }
.cc.grown .cc-bloom { opacity: 1; }
.cc-bloom-inner { transform-box: fill-box; transform-origin: center;
  animation: cc-breathe 4.6s ease-in-out infinite; animation-delay: calc(var(--phase) * -1s); }
.cc-bloom-glow { fill: var(--c); opacity: 0.16; filter: blur(5px); }
.cc-bloom-core { fill: var(--c); opacity: 0.9; }
.cc-bloom-rim { fill: none; stroke: color-mix(in srgb, #fff 55%, var(--c)); stroke-width: 1.3; opacity: 0.5; }
.cc-bloom-num { fill: #fff; font: 800 14px var(--set-mono, ui-monospace); text-anchor: middle; dominant-baseline: middle;
  paint-order: stroke; }
[data-theme="light"] .cc-bloom-num { fill: #fff8ef; }

/* motes */
.cc-mote { fill: var(--set-gold-bright); opacity: 0; transform-box: fill-box; transform-origin: center;
  animation: cc-rise var(--dur, 9s) linear infinite; animation-delay: var(--delay, 0s);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--set-gold) 60%, transparent)); }

/* HUD */
.cc-hud { position: absolute; left: 16px; bottom: 14px; z-index: 3;
  display: flex; flex-direction: column; gap: 9px; padding: 12px 14px; border-radius: 15px;
  background: var(--set-surface-glass); border: 1px solid var(--set-border-strong);
  backdrop-filter: blur(14px) saturate(140%); -webkit-backdrop-filter: blur(14px) saturate(140%);
  box-shadow: 0 18px 40px -26px rgba(0, 0, 0, 0.7); }
.cc-hud-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.cc-hud-eyebrow :deep(svg) { color: var(--set-ok); }
.cc-hud-stats { display: flex; gap: 16px; }
.cc-hud-stat { display: flex; flex-direction: column; gap: 1px; }
.cc-hud-val { font-size: 19px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.cc-hud-stat.accent .cc-hud-val { color: var(--set-gold); }
.cc-hud-lab { font-size: 9.5px; font-weight: 650; color: var(--set-text-muted); letter-spacing: 0.02em; }

/* legend */
.cc-legend { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 7px;
  padding: 12px 16px 14px; border-top: 1px solid var(--set-border); }
.cc-leg { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 999px;
  font-size: 11px; font-weight: 650; color: var(--set-text-secondary);
  background: color-mix(in srgb, var(--c) 8%, var(--set-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--c) 22%, transparent); transition: all 0.2s var(--set-spring); }
.cc-leg:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--c) 44%, transparent); }
.cc-leg.dim { opacity: 0.5; }
.cc-leg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 70%, transparent); flex-shrink: 0; }
.cc-leg-ic { color: var(--c); flex-shrink: 0; }
.cc-leg-n { font-size: 11.5px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }

@keyframes cc-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes cc-sun-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes cc-emit {
  0% { transform: scale(0.5); opacity: 0.6; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes cc-sap {
  0% { transform: translateY(0); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(-196px); opacity: 0; } }
@keyframes cc-rise {
  0% { transform: translate(0, 0); opacity: 0; }
  12% { opacity: 0.85; }
  85% { opacity: 0.7; }
  100% { transform: translate(var(--drift, 12px), var(--rise, -280px)); opacity: 0; } }

@media (max-width: 720px) {
  .cc-hud-stats { gap: 12px; } .cc-hud-val { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .cc-sun, .cc-sun-core, .cc-sun-ring, .cc-bloom-inner, .cc-sap, .cc-mote { animation: none !important; }
  .cc-sun-layer, .cc-tree, .cc-motes { transition: none; }
  .cc-trunk, .cc-branch, .cc-bloom, .cc-foliage, .cc-root { transition: none; }
}
</style>
