<template>
  <div ref="wrapEl" class="rsi" :style="height ? { height: height + 'px' } : null" :class="{ fill: !height }">
    <!-- vault air + blueprint fold-grid + entry spotlight -->
    <div class="rsi-air" aria-hidden="true" />
    <div class="rsi-grid" aria-hidden="true" />
    <div class="rsi-spot" aria-hidden="true" />
    <span v-for="m in 12" :key="'m' + m" class="rsi-mote" aria-hidden="true"
      :style="{ left: (38 + ((m * 53) % 58)) + '%', animationDelay: (m * 0.9) + 's', animationDuration: (9 + (m % 5) * 2.2) + 's' }" />

    <!-- ── flying sheets (drop → crease → compact → glide to the shelf / unfold away) ── -->
    <button v-for="s in flying" :key="s.key" class="ori" :class="[s.phase, 'c-' + s.tone]"
      :style="{ left: s.x + '%', top: s.y, '--slot-x': s.slotX + '%' }"
      :title="tipOf(s.ticket)" @click="s.ticket && $emit('open', s.ticket)">
      <span class="half h1">
        <span class="face f">
          <i class="no sd-mono">{{ s.ticket?.ticket_number || '—' }}</i>
          <i class="ln l1" /><i class="ln l2" /><i class="ln l3" />
        </span>
        <span class="face b" />
      </span>
      <span class="half h2">
        <span class="face f">
          <i class="ln l1" /><i class="ln l2" />
          <i class="code sd-mono">{{ codeShort(s.ticket) }}</i>
        </span>
        <span class="face b" />
      </span>
      <span class="seam" aria-hidden="true" />
    </button>

    <!-- ── archive shelf ── -->
    <div class="shelf" aria-label="Archive shelf — today's sealed fixes">
      <span class="shelf-rail" aria-hidden="true" />
      <span class="shelf-glow" aria-hidden="true" />
      <span class="shelf-tag sd-mono">ARCHIVE · <b>{{ stats.resolved_today ?? shelf.length }}</b> SEALED TODAY</span>
      <TransitionGroup name="parked">
        <button v-for="p in shelf" :key="p.key" class="parked" :class="['c-' + p.tone, { landed: p.landed, ghost: p.ghost }]"
          :style="{ left: p.slotX + '%' }" :title="tipOf(p.ticket)"
          @click="p.ticket && $emit('open', p.ticket)">
          <span class="pk-body"><i class="pk-no sd-mono">{{ shortNo(p.ticket) }}</i></span>
          <span class="pk-shadow" aria-hidden="true" />
        </button>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
/* SdResolutionInstrument — "THE ORIGAMI FOLD-DOWN" (gallery pick 04 of 8).
   The fold IS the resolve ceremony: real resolved tickets descend as open paper sheets
   into the vault, crease themselves shut in two folds (true CSS 3D — no canvas), compact,
   and glide onto the brass ARCHIVE shelf as sealed forms. A bounced fix (reopened_count>0)
   lifts off the shelf, unfolds mid-air in rose, and climbs back out of the archive.
   Every sheet and parked form is a real ticket — click → the console drawer.

   Contract (FROZEN): { tickets[], stats, now, reduced, height } + emit('open', ticket).
   Discipline: Vue state machine (no raw DOM), spawn timers gated by IntersectionObserver
   + visibilitychange, reduced-motion renders a static shelved scene (data-cinematic="on"
   overrides upstream via the `reduced` prop), all timers cleared on unmount. The stage
   stays dark in BOTH themes (--sd-res-deep-bg) so the paper glow reads; colors ride the
   --sd-res-* tokens natively (DOM, not canvas — no MutationObserver needed). */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 380 },
})
const emit = defineEmits(['open'])

const wrapEl = ref(null)
const flying = ref([])   // {key, ticket, phase, x, y, slotX, tone}
const shelf = ref([])    // {key, ticket, slotX, tone, landed}
let keySeq = 0
let cycleIdx = 0
let visible = false
let io = null
const timers = new Set()

/* crease color = resolution code family */
const TONE = {
  solved: 'em', workaround: 'br', configuration: 'br', known_error: 'st',
  no_fault_found: 'st', not_reproducible: 'st', duplicate: 'st',
  cancelled: 'st', no_response: 'cl',
}
const toneOf = (t) => TONE[t?.resolution_code] || 'em'
const codeShort = (t) => (t?.resolution_code || 'SEALED').replace(/_/g, ' ').toUpperCase().slice(0, 12)
const shortNo = (t) => {
  const n = t?.ticket_number || ''
  return n.length > 6 ? n.slice(-4) : n || '·'
}
const tipOf = (t) => (t ? `${t.ticket_number} · ${t.subject}` : 'Sealed fix')

const later = (fn, ms) => {
  const id = setTimeout(() => { timers.delete(id); fn() }, ms)
  timers.add(id)
  return id
}

/* the shelf lives in the right air (console owns the left); 10 stable slots */
const SLOTS = Array.from({ length: 10 }, (_, i) => 45 + i * 5.2)
const freeSlot = () => {
  const used = new Set([...shelf.value.map(p => p.slotX), ...flying.value.map(s => s.slotX)])
  return SLOTS.find(s => !used.has(s)) ?? SLOTS[(Math.random() * SLOTS.length) | 0]
}

const nextTicket = () => {
  const pool = props.tickets || []
  if (!pool.length) return null
  cycleIdx = (cycleIdx + 1) % pool.length
  return pool[cycleIdx]
}

/* ── the fold ceremony ── */
const spawn = () => {
  if (!visible || document.hidden || props.reduced) { schedule(); return }
  // never-empty rule: with a clear desk the ceremony still plays as dim GHOST sheets —
  // unlabeled, non-navigating — and real tickets take over the moment they exist.
  const ticket = nextTicket()
  const key = 'f' + (++keySeq)
  const slotX = freeSlot()
  const s = { key, ticket, phase: ticket ? 'enter' : 'enter ghost', x: 46 + Math.random() * 42, y: '-90px', slotX, tone: toneOf(ticket) }
  flying.value.push(s)
  const g = ticket ? '' : ' ghost'
  later(() => { s.phase = 'fall' + g; s.y = '34%' }, 60)     // descend into the vault
  later(() => { s.phase = 'fall folded' + g }, 1500)         // crease one
  later(() => { s.phase = 'fall folded compact' + g }, 2500) // crease two → sealed form
  later(() => { s.phase = 'fall folded compact shelve' + g; s.x = s.slotX; s.y = 'calc(100% - 132px)' }, 3050)
  later(() => {                                              // touch down → park it
    flying.value = flying.value.filter(v => v.key !== s.key)
    shelf.value.push({ key: 'p' + (++keySeq), ticket, slotX, tone: s.tone, landed: true, ghost: !ticket })
    const parked = shelf.value[shelf.value.length - 1]
    later(() => { parked.landed = false }, 900)
    if (shelf.value.length > 10) shelf.value.shift()         // oldest leaves the shelf
  }, 4050)
  schedule()
}
let spawnScheduled = false
const schedule = () => {
  if (spawnScheduled) return
  spawnScheduled = true
  later(() => { spawnScheduled = false; spawn() }, 2300 + Math.random() * 1600)
}

/* ── the bounce: a fix that didn't hold unfolds and leaves the archive ── */
const unfoldLoop = () => {
  later(() => {
    if (visible && !document.hidden && !props.reduced && shelf.value.length > 2) {
      const idx = shelf.value.findIndex(p => (p.ticket?.reopened_count || 0) > 0)
      const pick = idx >= 0 ? idx : (Math.random() < 0.35 ? 0 : -1)
      if (pick >= 0) {
        const p = shelf.value[pick]
        shelf.value.splice(pick, 1)
        const key = 'u' + (++keySeq)
        const s = { key, ticket: p.ticket, phase: 'fall folded compact unfold-hold', x: p.slotX, y: 'calc(100% - 132px)', slotX: p.slotX, tone: 'rk' }
        flying.value.push(s)
        later(() => { s.phase = 'fall unfolding'; s.y = '26%' }, 80)   // rise + unfold
        later(() => { s.phase = 'fall unfolding away'; s.y = '-140px' }, 1500)
        later(() => { flying.value = flying.value.filter(v => v.key !== s.key) }, 2600)
      }
    }
    unfoldLoop()
  }, 10000 + Math.random() * 6000)
}

/* reduced-motion / first paint: a quiet, already-sealed shelf */
const seedShelf = () => {
  if (shelf.value.length) return
  const pool = (props.tickets || []).slice(0, 6)
  shelf.value = pool.map((ticket, i) => ({
    key: 'seed' + i, ticket, slotX: SLOTS[i], tone: toneOf(ticket), landed: false,
  }))
}

onMounted(() => {
  seedShelf()
  io = new IntersectionObserver((es) => {
    es.forEach((e) => { visible = e.isIntersecting })
  }, { threshold: 0.05 })
  io.observe(wrapEl.value)
  if (!props.reduced) { schedule(); unfoldLoop() }
})
onBeforeUnmount(() => {
  io?.disconnect()
  timers.forEach(clearTimeout)
  timers.clear()
})
watch(() => props.tickets, () => { if (!shelf.value.length) seedShelf() })
</script>

<style scoped>
.rsi { position: relative; width: 100%; overflow: hidden; background: var(--sd-res-deep-bg); perspective: 1000px; }
.rsi.fill { position: absolute; inset: 0; height: 100%; }

/* ── vault atmosphere ── */
.rsi-air { position: absolute; inset: 0;
  background:
    radial-gradient(60% 46% at 72% 108%, color-mix(in srgb, var(--sd-res-brass) 14%, transparent), transparent 70%),
    radial-gradient(46% 40% at 70% -8%, color-mix(in srgb, var(--sd-res-core) 12%, transparent), transparent 70%),
    linear-gradient(180deg, var(--sd-res-deep-bg), #071009); }
/* faint blueprint fold-grid — the paper's world */
.rsi-grid { position: absolute; inset: 0; opacity: 0.05;
  background:
    repeating-linear-gradient(45deg, transparent 0 34px, var(--sd-res-hi) 34px 35px),
    repeating-linear-gradient(-45deg, transparent 0 34px, var(--sd-res-hi) 34px 35px); }
/* entry spotlight over the drop zone */
.rsi-spot { position: absolute; top: -18%; left: 44%; right: -6%; height: 70%;
  background: radial-gradient(48% 60% at 55% 0%, rgba(234, 252, 242, 0.07), transparent 72%); }
.rsi-mote { position: absolute; bottom: -6px; width: 3px; height: 3px; border-radius: 50%;
  background: var(--sd-res-core); opacity: 0; animation: rsi-rise linear infinite; }

/* ── the origami sheet ── */
.ori { position: absolute; width: 104px; height: 70px; padding: 0; border: none; background: none;
  transform-style: preserve-3d; cursor: pointer; z-index: 3; font-family: inherit;
  filter: drop-shadow(0 16px 22px rgba(0, 0, 0, 0.55));
  transition: top 2.4s cubic-bezier(0.3, 0.6, 0.35, 1), left 1s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease; }
.ori.enter { opacity: 0; }
.ori.fall { opacity: 1; animation: rsi-sway 3.4s ease-in-out infinite; }
.ori .half { position: absolute; top: 0; bottom: 0; width: 50%; transform-style: preserve-3d;
  transition: transform 0.95s cubic-bezier(0.16, 1, 0.3, 1); }
.ori .h1 { left: 0; transform-origin: right center; }
.ori .h2 { left: 50%; transform-origin: left center; }
.ori .face { position: absolute; inset: 0; border-radius: 6px; backface-visibility: hidden; overflow: hidden;
  background: linear-gradient(150deg, #eefaf3, #cfe9db 58%, #b7dcc8);
  border: 1px solid color-mix(in srgb, var(--sd-res-deep) 45%, transparent); }
.ori .face.b { transform: rotateY(180deg);
  background: linear-gradient(150deg, #0e3d2c, #0a2c21); border-color: color-mix(in srgb, var(--sd-res-core) 40%, transparent); }
.ori .h1 .face { border-right-width: 0; border-radius: 6px 0 0 6px; }
.ori .h2 .face { border-left-width: 0; border-radius: 0 6px 6px 0; }
.ori .seam { position: absolute; left: 50%; top: 7%; bottom: 7%; width: 1px;
  background: color-mix(in srgb, var(--sd-res-deep) 40%, transparent); }
.ori .no { position: absolute; top: 6px; left: 8px; font-size: 8px; font-weight: 800; letter-spacing: 0.06em;
  font-style: normal; color: #14543c; }
.ori .code { position: absolute; right: 6px; bottom: 5px; font-size: 6.5px; font-weight: 800; letter-spacing: 0.1em;
  font-style: normal; color: #1a6b4c; }
.ori .ln { position: absolute; left: 12%; height: 3px; border-radius: 2px; background: rgba(6, 60, 42, 0.30); }
.ori .h1 .ln.l1 { top: 38%; width: 62%; } .ori .h1 .ln.l2 { top: 54%; width: 74%; } .ori .h1 .ln.l3 { top: 70%; width: 48%; }
.ori .h2 .ln.l1 { top: 38%; width: 58%; } .ori .h2 .ln.l2 { top: 54%; width: 40%; }
/* crease tones — the fold edge carries the resolution code */
.ori.c-br .face.b { background: linear-gradient(150deg, #4a3a12, #33270b); }
.ori.c-st .face.b { background: linear-gradient(150deg, #2b3236, #1d2326); }
.ori.c-cl .face.b { background: linear-gradient(150deg, #4d3a0c, #382a08); }
.ori.c-rk .face.b { background: linear-gradient(150deg, #55212e, #3a1620); }

/* the ceremony */
.ori.folded .h1 { transform: rotateY(-178deg); }
.ori.compact { transform: scale(0.46) rotateZ(-7deg); animation: none; }
.ori.shelve { transition-duration: 1.05s, 1.05s, 0.9s, 0.7s; }
/* the bounce — unfold + rise in rose */
.ori.unfold-hold { transform: scale(0.46) rotateZ(-7deg); animation: none; }
.ori.unfolding { transform: scale(1) rotateZ(3deg); animation: none; }
.ori.unfolding .h1 { transform: rotateY(0deg); }
.ori.unfolding .face { border-color: color-mix(in srgb, var(--sd-res-risk) 55%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--sd-res-risk) 35%, transparent); }
.ori.away { opacity: 0; }
/* ghost ceremony (empty desk) — dim, unlabeled, cursor stays quiet */
.ori.ghost { opacity: 0.42; cursor: default; filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.4)) saturate(0.6); }
.ori.enter.ghost { opacity: 0; }
.parked.ghost { opacity: 0.4; cursor: default; }
.parked.ghost:hover { transform: none; }

/* ── the archive shelf ── */
.shelf { position: absolute; left: 0; right: 0; bottom: 84px; height: 46px; z-index: 2; }
.shelf-rail { position: absolute; left: 42%; right: 4%; bottom: 0; height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-res-brass) 75%, transparent) 12%,
    color-mix(in srgb, var(--sd-res-brass) 75%, transparent) 88%, transparent); }
.shelf-glow { position: absolute; left: 42%; right: 4%; bottom: -14px; height: 26px;
  background: radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--sd-res-brass) 22%, transparent), transparent 75%); }
.shelf-tag { position: absolute; right: 4.5%; bottom: 8px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.26em; color: color-mix(in srgb, var(--sd-res-brass) 72%, transparent); }
.shelf-tag b { color: var(--sd-res-brass); }

.parked { position: absolute; bottom: 3px; width: 46px; height: 31px; padding: 0; margin-left: -23px;
  border: none; background: none; cursor: pointer; font-family: inherit;
  transition: transform 0.25s var(--sd-spring), left 0.6s var(--sd-spring); }
.parked:hover { transform: translateY(-4px); }
.parked .pk-body { position: absolute; inset: 0; border-radius: 5px; display: grid; place-items: center;
  background: linear-gradient(150deg, #dff2e7, #b7dcc8 65%, #9ccdb6);
  border: 1px solid color-mix(in srgb, var(--sd-res-deep) 50%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 6px 14px rgba(0, 0, 0, 0.45);
  transform: rotateZ(-4deg); transition: box-shadow 0.25s; }
.parked:hover .pk-body { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 8px 18px rgba(0, 0, 0, 0.5), var(--sd-res-glow); }
.parked.c-br .pk-body { background: linear-gradient(150deg, #f0e3c2, #dcc48c 65%, #c9ac6d); }
.parked.c-st .pk-body { background: linear-gradient(150deg, #dbe3e6, #b9c5ca 65%, #a0aeb4); }
.parked.c-cl .pk-body { background: linear-gradient(150deg, #f4e6bf, #e3ca8a 65%, #d0b169); }
.parked .pk-no { font-size: 7.5px; font-weight: 800; letter-spacing: 0.06em; font-style: normal; color: #14543c; }
.parked .pk-shadow { position: absolute; left: 8%; right: 8%; bottom: -5px; height: 5px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); filter: blur(2px); }
.parked.landed .pk-body { animation: rsi-land 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
.parked-enter-from, .parked-leave-to { opacity: 0; }
.parked-enter-active, .parked-leave-active { transition: opacity 0.5s ease; }

@keyframes rsi-rise { 0% { opacity: 0; transform: translateY(0); } 12% { opacity: 0.5; }
  100% { opacity: 0; transform: translateY(-360px); } }
@keyframes rsi-sway { 0%, 100% { rotate: -2.4deg; } 50% { rotate: 2.4deg; } }
@keyframes rsi-land { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-res-brass) 60%, transparent); }
  100% { box-shadow: 0 0 0 22px transparent; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rsi-mote,
  html:not([data-cinematic="on"]) .ori.fall,
  html:not([data-cinematic="on"]) .parked.landed .pk-body { animation: none; }
}
</style>
