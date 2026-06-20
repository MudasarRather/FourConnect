<template>
  <!-- Signature instrument: a fanned 3D deck of report "dossier plates" that
       slowly cycles its front card. Parallax-tilts to the hero's pointer
       (--mx/--my inherited), breathes on idle, and sweeps a sheen across the
       front plate. Click a back plate to bring it forward; click the front
       plate to open it. -->
  <div class="deck" :class="{ reduced }" role="group" aria-label="Report dossier deck">
    <div class="deck-stage">
      <div class="deck-float">
        <Motion v-for="(p, i) in plates" :key="p.key" as="button" type="button"
          class="deck-plate" :class="{ front: i === front }"
          :style="{ zIndex: zOf(i), '--a': p.accent, '--ad': p.accent_deep || p.accent }"
          :animate="plateAnim(i)"
          :transition="{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="i === front ? { scale: scaleOf(i) * 1.03 } : {}"
          @click="onPlate(i, p)">
          <span class="dp-sheen" aria-hidden="true" />
          <header class="dp-band">
            <span class="dp-crest">{{ p.icon }}</span>
            <span class="dp-eyebrow">{{ p.eyebrow || 'FOURCONNECT · DOSSIER' }}</span>
            <span class="dp-chip">{{ fmtKind(p) }}</span>
          </header>
          <div class="dp-body">
            <h4 class="dp-name">{{ p.name }}</h4>
            <div class="dp-metrics">
              <div class="dp-metric">
                <b>{{ p.count != null ? compact(p.count) : '—' }}</b>
                <span>records</span>
              </div>
              <div class="dp-metric" v-if="p.headline">
                <b>{{ p.headline.value }}</b>
                <span>{{ p.headline.label }}</span>
              </div>
            </div>
            <div class="dp-spark" aria-hidden="true">
              <span v-for="(h, bi) in p.wave" :key="bi" class="dp-bar" :style="{ height: (14 + h * 24) + 'px', opacity: 0.35 + h * 0.5 }" />
            </div>
          </div>
          <footer class="dp-foot">
            <span class="dp-barcode" aria-hidden="true" />
            <span class="dp-fmt">PDF · XLSX · CSV</span>
          </footer>
        </Motion>
      </div>
    </div>

    <!-- deck pager dots -->
    <div class="deck-dots" role="tablist" aria-label="Active dossier">
      <button v-for="(p, i) in plates" :key="p.key" class="deck-dot" :class="{ on: i === front }"
        :style="{ '--a': p.accent }" :aria-label="p.name" @click="goTo(i)" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  plates: { type: Array, default: () => [] }, // [{key,name,eyebrow,icon,accent,accent_deep,count,headline?,wave}]
})
const emit = defineEmits(['open', 'focus'])

const reduced = prefersReduced()
const front = ref(Math.floor((props.plates.length || 1) / 2))
let timer = null

const N = () => props.plates.length || 1

// signed offset of plate i from the front, wrapped to a centred fan
function relOffset(i) {
  const n = N()
  let d = i - front.value
  const half = n / 2
  while (d > half) d -= n
  while (d < -half) d += n
  return d
}
const scaleOf = (i) => 1 - Math.min(2, Math.abs(relOffset(i))) * 0.1
function plateAnim(i) {
  const o = relOffset(i)
  const ao = Math.abs(o)
  return {
    x: o * 48,
    y: ao * 16 + (o === 0 ? -8 : 0),
    rotate: o * 8,
    scale: 1 - Math.min(2, ao) * 0.1,
    opacity: ao > 2 ? 0 : 1 - ao * 0.14,
  }
}
const zOf = (i) => 60 - Math.abs(relOffset(i)) * 12

function advance() { front.value = (front.value + 1) % N() }
function goTo(i) { front.value = i }
function onPlate(i, p) {
  if (i === front.value) emit('open', p)
  else { front.value = i; emit('focus', p) }
}

function compact(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return String(v)
}
const fmtKind = (p) => (p.group || 'report').toUpperCase()

onMounted(() => {
  if (reduced || N() <= 1) return
  timer = setInterval(advance, 3600)
})
onBeforeUnmount(() => timer && clearInterval(timer))
</script>

<style scoped>
.deck { position: relative; height: 268px; display: grid; place-items: center; perspective: 1400px; }
.deck-stage {
  position: relative; width: 230px; height: 230px; transform-style: preserve-3d;
  transform: rotateY(calc((var(--mx, 0.5) - 0.5) * 14deg)) rotateX(calc((var(--my, 0.5) - 0.5) * -11deg));
  transition: transform 0.32s ease;
}
.deck-float { position: absolute; inset: 0; animation: deck-breathe 7s ease-in-out infinite; }

.deck-plate {
  position: absolute; left: 0; top: 0; width: 218px; height: 230px; cursor: pointer; text-align: left;
  border-radius: 17px; padding: 0; overflow: hidden; font: inherit; color: var(--as-text);
  background:
    linear-gradient(170deg, color-mix(in srgb, var(--a) 9%, var(--as-surface-elevated)), var(--as-surface));
  border: 1px solid color-mix(in srgb, var(--a) 26%, var(--as-border-soft));
  box-shadow: 0 26px 52px -26px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column;
}
.deck-plate.front { box-shadow: 0 36px 64px -22px color-mix(in srgb, var(--a) 30%, rgba(0,0,0,0.8)), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
.deck-plate:focus-visible { outline: 2px solid var(--a); outline-offset: 2px; }

.dp-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.22) 48%, transparent 64%);
  background-size: 250% 100%; }
.deck-plate.front .dp-sheen { opacity: 1; animation: deck-sheen 4.8s ease-in-out infinite; }

.dp-band { position: relative; display: flex; align-items: center; gap: 8px; padding: 12px 13px; color: #fff;
  background: linear-gradient(135deg, var(--a), var(--ad)); }
.dp-crest { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  font-size: 15px; font-weight: 900; color: #fff; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255,255,255,0.3); }
.dp-eyebrow { flex: 1; min-width: 0; font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; line-height: 1.3;
  text-transform: uppercase; opacity: 0.92; overflow: hidden; }
.dp-chip { font-size: 7px; font-weight: 800; letter-spacing: 0.08em; padding: 2px 6px; border-radius: 6px;
  background: rgba(0, 0, 0, 0.22); white-space: nowrap; }

.dp-body { position: relative; flex: 1; padding: 13px 14px 6px; display: flex; flex-direction: column; gap: 10px; }
.dp-name { margin: 0; font-size: 15px; font-weight: 850; letter-spacing: -0.01em; line-height: 1.15; color: var(--as-text); }
.dp-metrics { display: flex; gap: 16px; }
.dp-metric { display: flex; flex-direction: column; gap: 1px; }
.dp-metric b { font-family: var(--as-mono); font-size: 17px; font-weight: 800; color: color-mix(in srgb, var(--a) 70%, var(--as-text)); }
.dp-metric span { font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.dp-spark { display: flex; align-items: flex-end; gap: 3px; height: 38px; margin-top: auto; }
.dp-bar { flex: 1; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, var(--a), color-mix(in srgb, var(--a) 30%, transparent)); }

.dp-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 14px 12px; }
.dp-barcode { flex: 1; height: 14px; border-radius: 3px;
  background: repeating-linear-gradient(90deg, var(--as-text-dim) 0 1px, transparent 1px 3px, var(--as-text-dim) 3px 4px, transparent 4px 8px);
  opacity: 0.4; }
.dp-fmt { font-family: var(--as-mono); font-size: 7.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--as-text-dim); white-space: nowrap; }

.deck-dots { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 80; }
.deck-dot { width: 7px; height: 7px; border-radius: 50%; cursor: pointer; padding: 0; border: none;
  background: var(--as-border-strong); transition: all 0.3s var(--as-spring); }
.deck-dot.on { width: 20px; border-radius: 4px; background: var(--a, var(--as-amber)); }

@keyframes deck-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes deck-sheen { 0% { background-position: 180% 0; } 55%, 100% { background-position: -80% 0; } }

@media (prefers-reduced-motion: reduce) {
  .deck-stage { transform: none; }
  .deck-float { animation: none; }
  .deck-plate.front .dp-sheen { animation: none; opacity: 0; }
}
</style>
