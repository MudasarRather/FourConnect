<template>
  <Motion ref="tileRef" as="button" class="trn-star-tile" :class="{ 'is-clickable': clickable, 'is-in': visible }"
    :style="{ '--c': accentColor }"
    :initial="{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(8px)' }"
    :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
    :transition="{ duration: 0.62, delay: 0.06 * index, ease: [0.16, 1, 0.3, 1] }"
    :whileHover="clickable ? { y: -5 } : {}" :whileTap="clickable ? { scale: 0.985 } : {}"
    @click="clickable && $emit('go')">
    <span class="st-mesh" aria-hidden="true" />
    <span class="st-spot trn-spotlight" aria-hidden="true" />
    <span class="st-sheen" aria-hidden="true" />
    <span class="st-edge" aria-hidden="true" />

    <div class="st-tilt">
      <header class="st-head">
        <span class="st-ic"><component :is="icon" :size="17" /></span>
        <span class="st-eyebrow">{{ eyebrow }}</span>
        <span v-if="badge" class="st-badge">{{ badge }}</span>
      </header>
      <div class="st-value">
        <TrnCountUp :value="Number(value) || 0" :decimals="decimals" :prefix="prefix" :suffix="suffix" />
      </div>
      <div class="st-foot">
        <svg class="st-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
          <polygon class="st-spark-area" :points="sparkArea" />
          <polyline class="st-spark-line" :points="sparkPoints" pathLength="100" fill="none"
            stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <circle class="st-spark-dot" :cx="dot.x" :cy="dot.y" r="2.6" />
        </svg>
        <span v-if="hint" class="st-hint">{{ hint }}</span>
      </div>
    </div>

    <span class="st-twinkle" aria-hidden="true" />
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Sparkles } from 'lucide-vue-next'
import TrnCountUp from './TrnCountUp.vue'
import { usePointerSpotlight, useInView, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  eyebrow: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  icon: { type: [Object, Function], default: () => Sparkles },
  accent: { type: String, default: 'amber' }, // amber | emerald | orange | grey | red | gold
  badge: { type: String, default: '' },
  hint: { type: String, default: '' },
  index: { type: Number, default: 0 },
  clickable: { type: Boolean, default: false },
  seed: { type: Number, default: 7 },
})
defineEmits(['go'])

const tileRef = ref(null)
usePointerSpotlight(tileRef)            // drives --mx/--my/--spot (glare + 3D tilt)
const { visible } = useInView(tileRef, { threshold: 0.3 })  // drives draw-on viz

const ACCENTS = {
  amber: '--trn-amber', emerald: '--trn-st-completed-hex', orange: '--trn-ember',
  grey: '--trn-st-not-started-hex', red: '--trn-st-failed-hex', gold: '--trn-star',
}
const accentColor = computed(() => `var(${ACCENTS[props.accent] || '--trn-amber'})`)

const wave = computed(() => seededWave(props.seed + props.index, 14))
const sparkPoints = computed(() => wave.value.map((v, i) => `${(i / 13) * 100},${(28 - v * 22 - 3).toFixed(1)}`).join(' '))
const sparkArea = computed(() => `0,28 ${sparkPoints.value} 100,28`)
const dot = computed(() => {
  const v = wave.value[wave.value.length - 1]
  return { x: 100, y: +(28 - v * 22 - 3).toFixed(1) }
})
</script>

<style scoped>
.trn-star-tile { position: relative; overflow: hidden; text-align: left; width: 100%;
  padding: 17px 18px 15px; border-radius: 20px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); cursor: default; color: inherit;
  transition: box-shadow 0.45s var(--trn-spring), border-color 0.45s; }
.trn-star-tile.is-clickable { cursor: pointer; }
.trn-star-tile.is-clickable:hover { box-shadow: var(--trn-card-shadow-hover), 0 0 34px -12px color-mix(in srgb, var(--c) 60%, transparent);
  border-color: color-mix(in srgb, var(--c) 40%, transparent); }

/* drifting accent gradient-mesh */
.st-mesh { position: absolute; z-index: 0; top: -45%; right: -32%; width: 180px; height: 180px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 34%, transparent), transparent 68%); filter: blur(20px); opacity: 0.5;
  animation: st-mesh-drift 14s ease-in-out infinite; }
.st-spot { z-index: 0; }
/* one-shot diagonal sheen when the card reveals */
.st-sheen { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--c) 16%, transparent) 50%, transparent 62%); background-size: 220% 100%; }
.is-in .st-sheen { animation: st-sheen 1.2s ease 0.35s 1; }
/* top accent hairline that wipes in on hover */
.st-edge { position: absolute; top: 0; left: 18px; right: 18px; height: 1px; z-index: 1; transform: scaleX(0); transform-origin: left center;
  background: linear-gradient(90deg, transparent, var(--c), transparent); opacity: 0.85; transition: transform 0.55s var(--trn-spring); }
.trn-star-tile:hover .st-edge { transform: scaleX(1); }

/* 3D tilt layer driven by --mx/--my (flat until hovered) */
.st-tilt { position: relative; z-index: 1; transform-style: preserve-3d;
  transform: perspective(860px) rotateY(calc((var(--mx, 0.5) - 0.5) * 8deg)) rotateX(calc((var(--my, 0.5) - 0.5) * -8deg));
  transition: transform 0.3s var(--trn-ease); }

.st-head { display: flex; align-items: center; gap: 10px; transform: translateZ(18px); }
.st-ic { position: relative; display: inline-flex; width: 34px; height: 34px; border-radius: 11px; align-items: center; justify-content: center;
  color: var(--c); background: linear-gradient(150deg, color-mix(in srgb, var(--c) 30%, transparent), color-mix(in srgb, var(--c) 9%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 34%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  transition: transform 0.32s var(--trn-spring), box-shadow 0.32s; }
.st-ic::before { content: ''; position: absolute; inset: -2px; border-radius: 13px; padding: 1px; pointer-events: none; opacity: 0;
  background: conic-gradient(from 0deg, transparent, var(--c), transparent 60%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  transition: opacity 0.3s; }
.trn-star-tile:hover .st-ic { transform: scale(1.12) rotate(-5deg); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 0 18px -2px color-mix(in srgb, var(--c) 62%, transparent); }
.trn-star-tile:hover .st-ic::before { opacity: 1; animation: st-ring-spin 3s linear infinite; }
.st-eyebrow { flex: 1; min-width: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--trn-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-badge { font-family: var(--trn-mono); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.st-value { margin-top: 14px; font-size: 34px; font-weight: 800; letter-spacing: -0.025em; color: var(--trn-text); line-height: 1; transform: translateZ(28px); }
.st-value :deep(span) { background: linear-gradient(120deg, var(--trn-text) 20%, color-mix(in srgb, var(--c) 70%, var(--trn-text)));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.st-foot { display: flex; align-items: center; gap: 11px; margin-top: 12px; transform: translateZ(12px); }
.st-spark { width: 72px; height: 24px; flex-shrink: 0; overflow: visible; }
.st-spark-area { fill: var(--c); opacity: 0; transition: opacity 0.5s ease 0.5s; }
.is-in .st-spark-area { opacity: 0.14; }
.st-spark-line { stroke: var(--c); opacity: 0.85; stroke-dasharray: 100; stroke-dashoffset: 100;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 50%, transparent)); transition: stroke-dashoffset 1.25s var(--trn-spring) 0.25s; }
.is-in .st-spark-line { stroke-dashoffset: 0; }
.st-spark-dot { fill: var(--c); opacity: 0; transition: opacity 0.3s ease 1.4s; filter: drop-shadow(0 0 5px var(--c)); }
.is-in .st-spark-dot { opacity: 1; animation: st-dot-pulse 2.4s ease-in-out 1.6s infinite; }
.st-hint { font-size: 11px; color: var(--trn-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.st-twinkle { position: absolute; top: 15px; right: 17px; z-index: 2; width: 4px; height: 4px; border-radius: 50%;
  background: var(--trn-star); box-shadow: 0 0 8px var(--trn-star); animation: trn-twinkle 3s ease-in-out infinite; }

@keyframes st-mesh-drift { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; } 50% { transform: translate(-20px, 18px) scale(1.2); opacity: 0.75; } }
@keyframes st-sheen { 0% { opacity: 0; background-position: 130% 0; } 25% { opacity: 1; } 100% { opacity: 0; background-position: -40% 0; } }
@keyframes st-ring-spin { to { transform: rotate(360deg); } }
@keyframes st-dot-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
@media (prefers-reduced-motion: reduce) {
  .st-twinkle, .st-mesh, .st-sheen, .st-spark-dot { animation: none; }
  .st-tilt { transform: none; transition: none; }
  .st-spark-line { stroke-dashoffset: 0; transition: none; }
  .st-spark-area, .st-spark-dot { opacity: 0.14; transition: none; }
}
</style>
