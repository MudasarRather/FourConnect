<template>
  <div ref="sceneEl" class="gds-scene" @mousemove="onMove" @mouseleave="onLeave">
    <div class="gds-hint">Move the pointer · the dossier tilts</div>
    <div class="gds-floorline" aria-hidden="true" />
    <div class="gds-stack-viewport">
      <div ref="stackEl" class="gds-stack">
        <div v-for="(p, i) in panes" :key="p.k" ref="paneEls" class="gds-pane"
             :class="{ lit: p.lit }" @click="$emit('pane', p.k)">
          <div class="gds-pane-in" :style="{ '--bd': (i * 0.55) + 's', '--sd': (i * 0.4) + 's' }">
            <span class="gds-edge-light" />
            <span class="gds-pane-tag">{{ p.label }}</span>
            <span class="gds-pane-state">{{ p.lit ? 'etched' : 'empty' }}</span>
            <span class="gds-etch">
              <i style="--w:82%" /><i style="--w:64%" /><i style="--w:74%" /><i style="--w:48%" />
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="gds-flash" :class="{ go: flashOn }" />
    <div class="gds-seal" :class="{ on: fused }">
      <svg viewBox="0 0 180 180">
        <circle class="ring" cx="90" cy="90" r="82" />
        <circle class="ring2" cx="90" cy="90" r="70" />
        <text x="90" y="86" text-anchor="middle">Sealed</text>
        <text x="90" y="102" text-anchor="middle">{{ sealLine }}</text>
      </svg>
    </div>
    <div class="gds-scene-cap">
      <span><b>{{ capPir }}</b> · <span>{{ capInc }}</span></span>
      <span v-if="fused">FUSED · <b>SEALED FOR REVIEW</b></span>
      <span v-else>{{ panes.length }} PANES · <b>{{ litCount }}</b> ETCHED</span>
    </div>
  </div>
</template>

<script setup>
/* SdPirPaneStack — THE GLASS DOSSIER's signature instrument (artifact A8, 1:1).
   Eight translucent panes (one per document section, back→front) floating in true
   pointer-tilt parallax; a filled section etches its pane with amber edge light;
   `fused` collapses the fan into one slab behind a flash + self-drawing seal ring.
   Pure presentation — the section computes pane lit-states from the live document. */
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  panes: { type: Array, default: () => [] },   // [{ k, label, lit }] back → front
  capPir: { type: String, default: '' },
  capInc: { type: String, default: '' },
  fused: { type: Boolean, default: false },
  sealLine: { type: String, default: 'In Review' },
})
defineEmits(['pane'])

const sceneEl = ref(null)
const stackEl = ref(null)
const paneEls = ref([])
const flashOn = ref(false)
const litCount = computed(() => props.panes.filter(p => p.lit).length)

const RM = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.getAttribute('data-cinematic') !== 'on'

let tx = 0, ty = 0, ctx = 0, cty = 0, fuse = 0, fuseTarget = 0, raf = null

const onMove = (e) => {
  if (RM || !sceneEl.value) return
  const r = sceneEl.value.getBoundingClientRect()
  const nx = (e.clientX - r.left) / r.width * 2 - 1
  const ny = (e.clientY - r.top) / r.height * 2 - 1
  ty = nx * 11; tx = -ny * 9
}
const onLeave = () => { tx = 0; ty = 0 }

const staticLayout = () => {
  const N = props.panes.length
  paneEls.value.forEach((el, i) => {
    if (!el) return
    const back = props.fused ? 0 : N - 1 - i
    el.style.transform = `translate3d(0, ${-back * 26}px, ${-back * 46}px)`
    el.style.opacity = '1'
  })
  if (stackEl.value) stackEl.value.style.transform = 'rotateX(12deg)'
}

const layout = () => {
  ctx += (tx - ctx) * 0.07
  cty += (ty - cty) * 0.07
  fuse += (fuseTarget - fuse) * 0.05
  const N = props.panes.length
  if (stackEl.value) {
    stackEl.value.style.transform = `rotateX(${(12 + ctx).toFixed(2)}deg) rotateY(${cty.toFixed(2)}deg)`
  }
  const inv = 1 - fuse
  for (let i = 0; i < N; i++) {
    const el = paneEls.value[i]
    if (!el) continue
    const back = N - 1 - i
    const z = (-back * 46) * inv
    const y = (-back * 26) * inv
    const px = (cty * back * 1.1) * inv
    const py = (-ctx * back * 0.7) * inv
    el.style.transform = `translate3d(${px.toFixed(2)}px, ${(y + py).toFixed(2)}px, ${z.toFixed(1)}px)`
    el.style.opacity = (fuse > 0.6 && i < N - 1) ? String(1 - ((fuse - 0.6) / 0.4) * 0.92) : '1'
  }
  raf = requestAnimationFrame(layout)
}

watch(() => props.fused, (v) => {
  fuseTarget = v ? 1 : 0
  if (v) {
    flashOn.value = false
    requestAnimationFrame(() => { flashOn.value = true })
  } else {
    flashOn.value = false
  }
  if (RM) staticLayout()
})

onMounted(() => {
  fuseTarget = props.fused ? 1 : 0
  fuse = fuseTarget
  if (RM) staticLayout()
  else raf = requestAnimationFrame(layout)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
.gds-scene { position: relative; border-radius: 20px; overflow: hidden; min-height: 520px;
  background: radial-gradient(620px 340px at 50% 22%, var(--sd-pir-core-soft), transparent 62%),
    linear-gradient(165deg, var(--sd-pir-stage2), var(--sd-pir-stage));
  border: 1px solid var(--sd-pir-brd); box-shadow: var(--sd-pir-shadow); }
.gds-floorline { position: absolute; left: 8%; right: 8%; bottom: 74px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(232, 176, 75, 0.25), transparent); }
.gds-stack-viewport { position: absolute; inset: 0; display: grid; place-items: center; perspective: 1500px; }
.gds-stack { position: relative; width: 430px; height: 264px; transform-style: preserve-3d; will-change: transform; }
@media (max-width: 900px) { .gds-stack { width: 320px; height: 200px; } }
.gds-pane { position: absolute; inset: 0; transform-style: preserve-3d; will-change: transform; cursor: pointer; }
.gds-pane-in { position: absolute; inset: 0; border-radius: 16px; overflow: hidden;
  background: var(--sd-pir-glass); backdrop-filter: blur(14px) saturate(150%); -webkit-backdrop-filter: blur(14px) saturate(150%);
  border: 1px dashed var(--sd-pir-brd);
  box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 16px 40px rgba(0, 0, 0, 0.35);
  transition: border-color 0.5s, box-shadow 0.5s, background 0.5s;
  animation: gds-bob 6.5s ease-in-out infinite alternate; animation-delay: var(--bd, 0s); }
@keyframes gds-bob { from { transform: translateY(-3px); } to { transform: translateY(3px); } }
.gds-pane.lit .gds-pane-in { border-style: solid; border-color: var(--sd-pir-brd2);
  background: var(--sd-pir-glass-strong);
  box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 0 0 1px rgba(232, 176, 75, 0.18),
    0 0 30px rgba(232, 176, 75, 0.14), 0 16px 40px rgba(0, 0, 0, 0.35); }
.gds-pane-in::after { content: ''; position: absolute; top: 0; bottom: 0; width: 90px; left: -120px;
  background: linear-gradient(100deg, transparent, rgba(255, 252, 240, 0.13), transparent);
  animation: gds-spec 7s ease-in-out infinite; animation-delay: var(--sd, 0s); }
@keyframes gds-spec { 0%, 64% { transform: translateX(0); } 88%, 100% { transform: translateX(660px); } }
.gds-edge-light { position: absolute; left: 14px; right: 14px; top: 0; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--sd-pir-core), transparent); opacity: 0; transition: opacity 0.6s; }
.gds-pane.lit .gds-edge-light { opacity: 0.9; }
.gds-pane-tag { position: absolute; left: 18px; top: 12px; font-family: var(--sd-mono); font-size: 9px;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--sd-pir-ink3); transition: color 0.5s;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35); }
[data-theme="light"] .gds-pane-tag { text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6); }
.gds-pane.lit .gds-pane-tag { color: var(--sd-pir-core); }
.gds-pane-state { position: absolute; right: 18px; top: 12px; font-family: var(--sd-mono); font-size: 8.5px;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--sd-pir-ink3); }
.gds-pane.lit .gds-pane-state { color: var(--sd-pir-em); }
.gds-etch { position: absolute; left: 18px; right: 18px; top: 38px; display: flex; flex-direction: column;
  gap: 8px; opacity: 0.25; transition: opacity 0.6s; }
.gds-pane.lit .gds-etch { opacity: 1; }
.gds-etch i { display: block; height: 5px; border-radius: 3px; width: var(--w, 80%);
  background: linear-gradient(90deg, rgba(232, 176, 75, 0.4), rgba(232, 176, 75, 0.08)); }
[data-theme="light"] .gds-etch i { background: linear-gradient(90deg, rgba(180, 83, 9, 0.4), rgba(180, 83, 9, 0.08)); }
.gds-flash { position: absolute; inset: 0; opacity: 0; pointer-events: none; z-index: 5;
  background: radial-gradient(circle at 50% 46%, rgba(255, 244, 214, 0.9), transparent 60%); }
.gds-flash.go { animation: gds-flash 0.9s ease-out forwards; }
@keyframes gds-flash { 0% { opacity: 0; } 22% { opacity: 0.85; } 100% { opacity: 0; } }
.gds-seal { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
  z-index: 6; opacity: 0; transition: opacity 0.6s 0.5s; }
.gds-seal.on { opacity: 1; }
.gds-seal svg { width: 180px; height: 180px; }
.gds-seal .ring { fill: none; stroke: var(--sd-pir-core); stroke-width: 2; stroke-dasharray: 540; stroke-dashoffset: 540; }
.gds-seal.on .ring { animation: gds-ring 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; }
@keyframes gds-ring { to { stroke-dashoffset: 0; } }
.gds-seal .ring2 { fill: none; stroke: var(--sd-pir-core); stroke-width: 0.8; stroke-dasharray: 2 5; opacity: 0.7; }
.gds-seal text { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.4em; fill: var(--sd-pir-core); text-transform: uppercase; }
.gds-scene-cap { position: absolute; left: 24px; right: 24px; bottom: 18px; display: flex;
  justify-content: space-between; align-items: center; font-family: var(--sd-mono); font-size: 9.5px;
  letter-spacing: 0.22em; text-transform: uppercase; color: var(--sd-pir-ink3); z-index: 4; }
.gds-scene-cap b { color: var(--sd-pir-core); }
.gds-hint { position: absolute; top: 18px; left: 24px; font-family: var(--sd-mono); font-size: 9px;
  letter-spacing: 0.24em; color: var(--sd-pir-ink3); text-transform: uppercase; z-index: 4;
  display: flex; align-items: center; gap: 8px; }
.gds-hint::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--sd-pir-core);
  animation: gds-pulse 2.4s infinite; }
@keyframes gds-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .gds-pane-in { animation: none; }
  html:not([data-cinematic="on"]) .gds-pane-in::after { animation: none; }
  html:not([data-cinematic="on"]) .gds-hint::before { animation: none; }
}
</style>
