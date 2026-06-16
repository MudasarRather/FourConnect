<template>
  <Motion as="div" class="kt-shell"
    :initial="{ opacity: 0, y: 22, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.62, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }">
    <article
      ref="cardRef"
      class="kpi-tile"
      :class="[`tone-${effectiveTone}`]"
      :style="{ '--accent': accent }">
      <!-- pointer-reactive (flat) parallax aura + instrument grid -->
      <span class="kt-aura" :style="auraStyle" aria-hidden="true" />
      <span class="kt-grid" aria-hidden="true" />
      <span class="kt-glare" aria-hidden="true" />
      <!-- tracing light that runs the border on hover -->
      <span class="kt-edge" aria-hidden="true" />
      <span class="kt-bracket tl" aria-hidden="true" /><span class="kt-bracket br" aria-hidden="true" />

      <div class="kt-top">
        <span class="kt-ic" :style="{ color: accent, background: `color-mix(in srgb, ${accent} 15%, transparent)`, boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 28%, transparent)` }">
          <span class="kt-ic-ping" aria-hidden="true" />
          <component :is="icon" :size="16" />
        </span>
        <span class="kt-lbl">{{ label }}</span>
      </div>

      <div class="kt-mid">
        <ShiftCountUp class="kt-val" :value="Number(value) || 0" :decimals="decimals" :suffix="suffix" />
      </div>

      <div class="kt-foot">
        <svg class="kt-spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
          <polyline :points="sparkArea" :fill="`url(#${uid}-fill)`" stroke="none" class="kt-spark-area" />
          <polyline :points="sparkLine" fill="none" :stroke="accent" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="kt-spark-line"
            :style="{ animationDelay: (index * 0.07 + 0.35) + 's' }" />
          <circle :cx="sparkLast.x" :cy="sparkLast.y" r="1.9" :fill="accent" class="kt-spark-head" />
          <defs>
            <linearGradient :id="`${uid}-fill`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="accent" stop-opacity="0.30" />
              <stop offset="100%" :stop-color="accent" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <span v-if="hint" class="kt-hint">{{ hint }}</span>
      </div>

      <span v-if="effectiveTone !== 'neutral'" class="kt-ring" aria-hidden="true" />
    </article>
  </Motion>
</template>

<script>
let _ktUid = 0
</script>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Hash } from 'lucide-vue-next'
import ShiftCountUp from './ShiftCountUp.vue'
import { seededWave, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  icon: { type: [Object, Function], default: Hash },
  color: { type: String, default: 'var(--shift-amber)' },
  tone: { type: String, default: 'neutral' },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  hint: { type: String, default: '' },
  index: { type: Number, default: 0 },
})

const uid = `kt-${_ktUid++}`
const cardRef = ref(null)
usePointerSpotlight(cardRef)
const accent = computed(() => props.color)

// Only escalate the tone styling when there is something to flag.
const effectiveTone = computed(() => {
  if ((props.tone === 'alert' || props.tone === 'warn') && Number(props.value) > 0) return props.tone
  return 'neutral'
})

const auraStyle = computed(() => ({
  background: `radial-gradient(120% 90% at 82% 6%, color-mix(in srgb, ${accent.value} 24%, transparent), transparent 62%)`,
}))

// Deterministic instrument sparkline (stable across renders).
const wave = computed(() => seededWave((props.index + 1) * 1.7 + (Number(props.value) || 0) % 7, 12))
const pts = computed(() => wave.value.map((v, i) => ({
  x: (i / (wave.value.length - 1)) * 100,
  y: 24 - v * 20,
})))
const sparkLine = computed(() => pts.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const sparkArea = computed(() => `0,26 ${sparkLine.value} 100,26`)
const sparkLast = computed(() => pts.value[pts.value.length - 1] || { x: 100, y: 12 })
</script>

<style scoped>
/* angle prop powers the tracing border light (graceful no-op where unsupported) */
@property --kt-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }

.kt-shell { will-change: transform, opacity, filter; }
.kpi-tile { position: relative; display: flex; flex-direction: column; gap: 9px; padding: 15px 16px 13px;
  border-radius: 18px; min-height: 132px;
  background: linear-gradient(165deg, var(--shift-surface-2), var(--shift-surface));
  border: 1px solid var(--shift-border-soft); overflow: hidden;
  box-shadow: 0 14px 36px -22px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04);
  transition: transform 0.5s var(--shift-spring), border-color 0.3s, box-shadow 0.35s; }
.kpi-tile:hover { transform: translateY(-6px); border-color: var(--shift-border);
  box-shadow: 0 30px 56px -24px rgba(0,0,0,0.8), 0 0 34px -12px color-mix(in srgb, var(--accent) 40%, transparent),
    inset 0 1px 0 rgba(255,255,255,0.08); }

/* layered atmosphere — flat pointer parallax (no rotation) */
.kt-aura { position: absolute; inset: -10%; pointer-events: none; opacity: 0.6; transition: opacity 0.35s, transform 0.35s ease;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * -16px), calc((var(--my, 0.5) - 0.5) * -12px), 0); }
.kpi-tile:hover .kt-aura { opacity: 1; }
.kt-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px),
                    linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 18px 18px; -webkit-mask: radial-gradient(120% 80% at 50% 0%, #000, transparent 75%);
  mask: radial-gradient(120% 80% at 50% 0%, #000, transparent 75%); }
.kt-glare { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  opacity: calc(var(--spot, 0) * 1); transition: opacity 0.3s;
  background: radial-gradient(150px 150px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    var(--shift-glare, rgba(255,255,255,0.10)), transparent 60%); }

/* tracing border light */
.kt-edge { position: absolute; inset: 0; border-radius: 18px; padding: 1.4px; pointer-events: none;
  opacity: 0; transition: opacity 0.4s;
  background: conic-gradient(from var(--kt-angle), transparent 0%, transparent 60%,
    color-mix(in srgb, var(--accent) 70%, transparent) 80%, #fff 90%,
    color-mix(in srgb, var(--accent) 70%, transparent) 96%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; }
.kpi-tile:hover .kt-edge { opacity: 0.95; animation: kt-edge-spin 2.6s linear infinite; }

.kt-bracket { position: absolute; width: 14px; height: 14px; pointer-events: none; opacity: 0;
  border-color: var(--accent); transition: opacity 0.3s, transform 0.4s var(--shift-spring); }
.kt-bracket.tl { top: 9px; left: 9px; border-top: 1.5px solid; border-left: 1.5px solid; border-top-left-radius: 5px; transform: translate(4px, 4px); }
.kt-bracket.br { bottom: 9px; right: 9px; border-bottom: 1.5px solid; border-right: 1.5px solid; border-bottom-right-radius: 5px; transform: translate(-4px, -4px); }
.kpi-tile:hover .kt-bracket { opacity: 0.75; transform: translate(0, 0); }

.kt-top { display: flex; align-items: center; gap: 9px; position: relative; z-index: 2; }
.kt-ic { position: relative; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  transition: transform 0.4s var(--shift-spring); }
.kpi-tile:hover .kt-ic { transform: scale(1.12); }
.kt-ic-ping { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
.kpi-tile:hover .kt-ic-ping { animation: kt-ic-ping 1.5s ease-out infinite; }
.kt-lbl { font-size: 10.5px; color: var(--shift-text-muted); text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2; }

.kt-mid { position: relative; z-index: 2; }
.kt-val { font-size: 27px; font-weight: 800; color: var(--shift-text); line-height: 1; letter-spacing: -0.01em;
  display: inline-block; transition: transform 0.4s var(--shift-spring), text-shadow 0.35s; transform-origin: left center; }
.kpi-tile:hover .kt-val { transform: scale(1.05); text-shadow: 0 2px 18px color-mix(in srgb, var(--accent) 40%, transparent); }

.kt-foot { position: relative; z-index: 2; margin-top: auto; height: 26px; display: flex; align-items: flex-end; }
.kt-spark { width: 100%; height: 26px; display: block; overflow: visible; transition: filter 0.35s; }
.kpi-tile:hover .kt-spark { filter: brightness(1.25); }
.kt-spark-area { opacity: 0; animation: kt-fade 0.9s ease both; animation-delay: 0.6s; }
.kt-spark-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: shift-draw 1.2s var(--shift-ease) both;
  filter: drop-shadow(0 1px 4px color-mix(in srgb, currentColor 30%, transparent)); }
.kt-spark-head { animation: kt-head-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.kt-hint { position: absolute; right: 0; bottom: 2px; font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-dim); }

/* status ring — pulses only for active warn/alert tiles */
.kt-ring { position: absolute; inset: 0; border-radius: 18px; pointer-events: none; }
.tone-alert { background: linear-gradient(165deg, var(--shift-alert-soft), var(--shift-surface));
  border-color: color-mix(in srgb, var(--shift-alert) 34%, transparent); }
.tone-alert .kt-ring { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--shift-alert) 40%, transparent);
  animation: kt-ring-alert 2.2s ease-in-out infinite; }
.tone-warn { border-color: color-mix(in srgb, var(--shift-ember) 30%, transparent); }
.tone-warn .kt-ring { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--shift-ember) 32%, transparent);
  animation: kt-ring-warn 2.8s ease-in-out infinite; }

@keyframes kt-edge-spin { to { --kt-angle: 360deg; } }
@keyframes kt-fade { to { opacity: 1; } }
@keyframes kt-ic-ping { 0% { opacity: 0.8; box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
  100% { opacity: 0; box-shadow: 0 0 0 10px color-mix(in srgb, var(--accent) 0%, transparent); } }
@keyframes kt-head-pulse { 0%, 100% { transform: scale(0.85); opacity: 0.7; } 50% { transform: scale(1.5); opacity: 1; } }
@keyframes kt-ring-alert { 0%, 100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--shift-alert) 22%, transparent); }
  50% { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--shift-alert) 60%, transparent), 0 0 24px -6px color-mix(in srgb, var(--shift-alert) 50%, transparent); } }
@keyframes kt-ring-warn { 0%, 100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--shift-ember) 18%, transparent); }
  50% { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--shift-ember) 44%, transparent); } }

/* light theme: warmer, softer glare */
:root[data-theme="light"] .kpi-tile {
  --shift-glare: rgba(255, 214, 140, 0.30);
  box-shadow: 0 16px 36px -26px rgba(120, 80, 20, 0.45), inset 0 1px 0 rgba(255,255,255,0.6); }
:root[data-theme="light"] .kt-glare { mix-blend-mode: multiply; }

@media (prefers-reduced-motion: reduce) {
  .kt-spark-line, .kt-spark-area, .kt-spark-head, .kt-ring, .kt-ic-ping { animation: none !important; }
  .kpi-tile:hover .kt-edge { animation: none; }
  .kt-spark-line { stroke-dashoffset: 0; }
  .kt-spark-area { opacity: 1; }
  .kt-aura { transform: none !important; }
  .kpi-tile { transition: border-color 0.3s, box-shadow 0.3s; }
  .kpi-tile:hover { transform: none; }
}
</style>
