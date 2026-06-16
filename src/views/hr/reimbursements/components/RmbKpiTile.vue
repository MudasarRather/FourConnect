<template>
  <Motion as="div" class="kt-shell"
    :initial="{ opacity: 0, y: 22, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.62, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }">
    <article ref="cardRef" class="kpi-tile" :class="[`tone-${effectiveTone}`, { clickable: !!go }]"
      :style="{ '--accent': accent }"
      :role="go ? 'button' : null" :tabindex="go ? 0 : null"
      @click="go && $emit('go', go)" @keydown.enter="go && $emit('go', go)">
      <!-- pointer-reactive parallax aura + perforation grid + glare -->
      <span class="kt-aura" :style="auraStyle" aria-hidden="true" />
      <span class="kt-grid" aria-hidden="true" />
      <span class="kt-glare" aria-hidden="true" />
      <span class="kt-edge" aria-hidden="true" />
      <span class="kt-bracket tl" aria-hidden="true" /><span class="kt-bracket br" aria-hidden="true" />

      <div class="kt-top">
        <span class="kt-ic" :style="{ color: accent, background: `color-mix(in srgb, ${accent} 15%, transparent)`, boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 28%, transparent)` }">
          <span class="kt-ic-ping" aria-hidden="true" />
          <component :is="icon" :size="15" />
        </span>
        <span class="kt-lbl">{{ label }}</span>
        <ArrowUpRight v-if="go" :size="13" class="kt-go" aria-hidden="true" />
      </div>

      <div class="kt-mid">
        <RmbMoneyValue v-if="money" class="kt-val" :value="Number(value) || 0" :decimals="decimals" :tone="moneyTone" />
        <RmbCountUp v-else class="kt-val" :value="Number(value) || 0" :decimals="decimals" :prefix="prefix" />
        <span v-if="suffix && !money" class="kt-suffix">{{ suffix }}</span>
      </div>

      <div class="kt-foot">
        <svg class="kt-spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
          <polyline :points="sparkArea" :fill="`url(#${uid}-fill)`" stroke="none" class="kt-spark-area" />
          <polyline :points="sparkLine" fill="none" :stroke="accent" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" pathLength="1" class="kt-spark-line"
            :style="{ animationDelay: (index * 0.06 + 0.35) + 's' }" />
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
let _rktUid = 0
</script>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Hash, ArrowUpRight } from 'lucide-vue-next'
import RmbCountUp from './RmbCountUp.vue'
import RmbMoneyValue from './RmbMoneyValue.vue'
import { seededWave, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  icon: { type: [Object, Function], default: Hash },
  color: { type: String, default: 'var(--rmb-amber)' },
  tone: { type: String, default: 'neutral' },   // neutral | warn | alert
  money: { type: Boolean, default: false },
  moneyTone: { type: String, default: '' },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  hint: { type: String, default: '' },
  go: { type: String, default: '' },
  index: { type: Number, default: 0 },
})
defineEmits(['go'])

const uid = `rkt-${_rktUid++}`
const cardRef = ref(null)
usePointerSpotlight(cardRef)
const accent = computed(() => props.color)

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
@property --kt-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }

.kt-shell { will-change: transform, opacity, filter; }
.kpi-tile { position: relative; display: flex; flex-direction: column; gap: 9px; padding: 15px 16px 13px;
  border-radius: 16px; min-height: 132px; background: var(--rmb-surf-card);
  border: 1px solid var(--rmb-border-soft); overflow: hidden; box-shadow: var(--rmb-card-shadow);
  transition: transform 0.5s var(--rmb-spring), border-color 0.3s, box-shadow 0.35s; }
.kpi-tile.clickable { cursor: pointer; }
.kpi-tile:hover { transform: translateY(-6px); border-color: var(--rmb-border-strong);
  box-shadow: 0 30px 56px -24px rgba(0,0,0,0.8), 0 0 34px -12px color-mix(in srgb, var(--accent) 40%, transparent),
    inset 0 1px 0 rgba(255,255,255,0.08); }

.kt-aura { position: absolute; inset: -10%; pointer-events: none; opacity: 0.6; transition: opacity 0.35s, transform 0.35s ease;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * -16px), calc((var(--my, 0.5) - 0.5) * -12px), 0); }
.kpi-tile:hover .kt-aura { opacity: 1; }
.kt-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px),
                    linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 18px 18px; -webkit-mask: radial-gradient(120% 80% at 50% 0%, #000, transparent 75%);
  mask: radial-gradient(120% 80% at 50% 0%, #000, transparent 75%); }
.kt-glare { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  opacity: calc(var(--spot, 0) * 1); transition: opacity 0.3s;
  background: radial-gradient(150px 150px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    var(--rmb-glare), transparent 60%); }

.kt-edge { position: absolute; inset: 0; border-radius: 16px; padding: 1.4px; pointer-events: none;
  opacity: 0; transition: opacity 0.4s;
  background: conic-gradient(from var(--kt-angle), transparent 0%, transparent 60%,
    color-mix(in srgb, var(--accent) 70%, transparent) 80%, #fff 90%,
    color-mix(in srgb, var(--accent) 70%, transparent) 96%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; }
.kpi-tile:hover .kt-edge { opacity: 0.95; animation: kt-edge-spin 2.6s linear infinite; }

.kt-bracket { position: absolute; width: 13px; height: 13px; pointer-events: none; opacity: 0;
  border-color: var(--accent); transition: opacity 0.3s, transform 0.4s var(--rmb-spring); }
.kt-bracket.tl { top: 9px; left: 9px; border-top: 1.5px solid; border-left: 1.5px solid; border-top-left-radius: 5px; transform: translate(4px, 4px); }
.kt-bracket.br { bottom: 9px; right: 9px; border-bottom: 1.5px solid; border-right: 1.5px solid; border-bottom-right-radius: 5px; transform: translate(-4px, -4px); }
.kpi-tile:hover .kt-bracket { opacity: 0.7; transform: translate(0, 0); }

.kt-top { display: flex; align-items: center; gap: 9px; position: relative; z-index: 2; }
.kt-ic { position: relative; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  transition: transform 0.4s var(--rmb-spring); }
.kpi-tile:hover .kt-ic { transform: scale(1.12) rotate(-4deg); }
.kt-ic-ping { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
.kpi-tile:hover .kt-ic-ping { animation: kt-ic-ping 1.5s ease-out infinite; }
.kt-lbl { font-size: 10.5px; color: var(--rmb-text-muted); text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2; }
.kt-go { margin-left: auto; color: var(--accent); opacity: 0; transform: translate(-3px, 3px); transition: opacity 0.25s, transform 0.25s; }
.kpi-tile:hover .kt-go { opacity: 0.85; transform: translate(0, 0); }

.kt-mid { position: relative; z-index: 2; display: flex; align-items: baseline; gap: 4px; color: var(--rmb-text); }
.kt-val { font-size: 26px; font-weight: 800; line-height: 1; letter-spacing: -0.01em;
  display: inline-block; transition: transform 0.4s var(--rmb-spring), text-shadow 0.35s; transform-origin: left center; }
.kpi-tile:hover .kt-val { transform: scale(1.05); text-shadow: 0 2px 18px color-mix(in srgb, var(--accent) 40%, transparent); }
.kt-suffix { font-family: var(--rmb-mono); font-size: 12px; color: var(--rmb-text-muted); }

.kt-foot { position: relative; z-index: 2; margin-top: auto; height: 26px; display: flex; align-items: flex-end; }
.kt-spark { width: 100%; height: 26px; display: block; overflow: visible; transition: filter 0.35s; }
.kpi-tile:hover .kt-spark { filter: brightness(1.25); }
.kt-spark-area { opacity: 0; animation: kt-fade 0.9s ease both; animation-delay: 0.6s; }
.kt-spark-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: kt-draw 1.2s var(--rmb-ease) both;
  filter: drop-shadow(0 1px 4px color-mix(in srgb, currentColor 30%, transparent)); }
.kt-spark-head { animation: kt-head-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.kt-hint { position: absolute; right: 0; bottom: 2px; font-family: var(--rmb-mono); font-size: 9.5px; color: var(--rmb-text-muted); }

.kt-ring { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; }
.tone-alert { background: linear-gradient(165deg, var(--rmb-st-rejected-soft), var(--rmb-paper));
  border-color: color-mix(in srgb, var(--rmb-st-rejected) 34%, transparent); }
.tone-alert .kt-ring { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rmb-st-rejected) 40%, transparent);
  animation: kt-ring-alert 2.2s ease-in-out infinite; }
.tone-warn { border-color: color-mix(in srgb, var(--rmb-st-pending) 30%, transparent); }
.tone-warn .kt-ring { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rmb-st-pending) 32%, transparent);
  animation: kt-ring-warn 2.8s ease-in-out infinite; }

@keyframes kt-edge-spin { to { --kt-angle: 360deg; } }
@keyframes kt-fade { to { opacity: 1; } }
@keyframes kt-draw { to { stroke-dashoffset: 0; } }
@keyframes kt-ic-ping { 0% { opacity: 0.8; box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
  100% { opacity: 0; box-shadow: 0 0 0 10px color-mix(in srgb, var(--accent) 0%, transparent); } }
@keyframes kt-head-pulse { 0%, 100% { transform: scale(0.85); opacity: 0.7; } 50% { transform: scale(1.5); opacity: 1; } }
@keyframes kt-ring-alert { 0%, 100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rmb-st-rejected) 22%, transparent); }
  50% { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--rmb-st-rejected) 60%, transparent), 0 0 24px -6px color-mix(in srgb, var(--rmb-st-rejected) 50%, transparent); } }
@keyframes kt-ring-warn { 0%, 100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rmb-st-pending) 18%, transparent); }
  50% { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--rmb-st-pending) 44%, transparent); } }

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
