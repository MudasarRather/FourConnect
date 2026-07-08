<template>
  <span class="sd-flapline" :class="[`sz-${size}`, { dim: dimmed }]" role="text" :aria-label="String(value)">
    <span
      v-for="(c, i) in cells"
      :key="`${i}-${c.gen}`"
      class="sd-flap"
      :class="{ flipping: c.gen > 0 && animate, [tone]: true }"
    >{{ c.ch }}</span>
  </span>
</template>

<script setup>
/* SdIntelFlap — one split-flap (Solari) character group.
   The Concourse's atomic unit: every digit lives on a mechanical flap that
   physically flips when its value changes. On first mount the group "boots"
   with the classic cascade (each cell rolls through a few characters before
   settling); afterwards only changed cells flip. Reduced-motion (without
   cinematic override) snaps values with no flips. */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: [String, Number], default: '' },
  /* pad the rendered string to at least this many cells */
  minCells: { type: Number, default: 0 },
  padChar: { type: String, default: '0' },
  size: { type: String, default: 'md' },       // sm | md | lg | xl
  tone: { type: String, default: '' },          // '' | up | dn | amber
  dimmed: { type: Boolean, default: false },
  /* stagger offset for the boot cascade (row index on a board) */
  bootDelay: { type: Number, default: 0 },
})

const ROLL = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ—·%+'
const animate = ref(true)
const cells = ref([])
const timers = new Set()
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn() }, ms); timers.add(t) }
// Monotonic run token. The boot cascade and every value-change render each own a run id;
// a render bumps it so any still-queued timers from an EARLIER run become no-ops. Without
// this, when the value lands mid-boot (data arrives after mount), the boot's trailing
// timers overwrite the new value and the flap sticks — and it never self-corrects because
// the watch only fires on a prop *change* (a later poll returning the same number is a
// no-op). This was the "board shows 000 while data is really 15" bug.
let runId = 0
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear() }

const target = () => {
  let s = String(props.value ?? '')
  if (props.minCells && s.length < props.minCells) s = s.padStart(props.minCells, props.padChar)
  return s.toUpperCase()
}
const reduced = () => {
  if (typeof window === 'undefined') return true
  if (document.documentElement.dataset.cinematic === 'on') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* flip one cell through `steps` intermediate characters, landing on `ch`. `myRun`
   ties every step to the render that scheduled it — a superseded run stops mutating. */
const flipCell = (i, ch, steps, myRun) => {
  const cell = cells.value[i]
  if (!cell || myRun !== runId) return
  let n = 0
  const step = () => {
    if (myRun !== runId) return        // a newer render took over — abandon this chain
    n += 1
    const landing = n >= steps
    cell.ch = landing ? ch : ROLL[Math.floor(Math.random() * 36)]
    cell.gen += 1                      // :key swap → CSS flip animation re-runs
    if (!landing) later(step, 170)
  }
  step()
}

const setCells = (s) => {
  cells.value = Array.from(s, (ch) => ({ ch, gen: 0 }))
}

onMounted(() => {
  const s = target()
  if (reduced()) { animate.value = false; setCells(s); return }
  /* boot cascade: start blank, roll each cell into place left→right */
  const myRun = ++runId
  setCells(' '.repeat(s.length))
  Array.from(s).forEach((ch, i) => {
    later(() => flipCell(i, ch, 2 + Math.floor(Math.random() * 3), myRun), props.bootDelay + i * 90)
  })
})

watch(() => [props.value, props.minCells], () => {
  const s = target()
  // Supersede any in-flight run (boot or prior value change) so its trailing timers
  // can't clobber this target, and drop its pending timers.
  const myRun = ++runId
  clearTimers()
  if (reduced() || !animate.value) { setCells(s); return }
  /* length change → rebuild, preserving untouched cells so only real changes flip */
  if (s.length !== cells.value.length) {
    const old = cells.value.map(c => c.ch)
    setCells(s)
    cells.value.forEach((c, i) => { if (old[i] !== undefined && old[i] !== c.ch) { c.ch = old[i] } })
  }
  Array.from(s).forEach((ch, i) => {
    const cell = cells.value[i]
    if (cell && cell.ch !== ch) later(() => flipCell(i, ch, 1 + Math.floor(Math.random() * 2), myRun), i * 55)
  })
})

onBeforeUnmount(() => { runId++; clearTimers() })
</script>

<style scoped>
.sd-flapline { display: inline-flex; gap: 2px; vertical-align: middle; }
.sd-flapline.dim { opacity: 0.55; }

.sd-flap {
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--sd-mono); font-weight: 700; color: var(--intel-board-txt);
  background: linear-gradient(180deg, var(--intel-flap) 0%, var(--intel-flap) 47%, var(--intel-flap-edge) 50%, var(--intel-flap) 53%, var(--intel-flap) 100%);
  border-radius: 3px; position: relative;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px rgba(0, 0, 0, 0.45);
  transform-style: preserve-3d; backface-visibility: hidden;
}
/* flaps always live on the black machine — signage constants, not hall tokens */
.sd-flap.up { color: var(--intel-sig-up, var(--intel-up)); }
.sd-flap.dn { color: var(--intel-sig-dn, var(--intel-dn)); }
.sd-flap.amber { color: var(--intel-sig, var(--intel)); }

.sz-sm .sd-flap { width: 14px; height: 21px; font-size: 11.5px; border-radius: 2.5px; }
.sz-md .sd-flap { width: 17px; height: 26px; font-size: 14px; }
.sz-lg .sd-flap { width: 23px; height: 34px; font-size: 19px; border-radius: 4px; }
.sz-xl .sd-flap { width: 31px; height: 46px; font-size: 27px; border-radius: 5px; }

.sd-flap.flipping { animation: sd-intel-flip 0.34s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes sd-intel-flip {
  0%   { transform: rotateX(0deg); }
  49%  { transform: rotateX(-86deg); background: linear-gradient(180deg, var(--intel-flap-hi) 0%, var(--intel-flap-hi) 47%, var(--intel-flap-edge) 50%, var(--intel-flap-hi) 53%, var(--intel-flap-hi) 100%); }
  51%  { transform: rotateX(86deg); }
  100% { transform: rotateX(0deg); }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sd-flap.flipping { animation: none; }
}
</style>
