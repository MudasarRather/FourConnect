<template>
  <Motion as="div" ref="boardEl" class="db" :class="{ reduced }"
    :initial="reduced ? false : { opacity: 0, y: 16, scale: 0.985 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <!-- ambient terminal layers -->
    <span class="db-bezel" aria-hidden="true" />
    <span class="db-grain" aria-hidden="true" />
    <span class="db-aura" aria-hidden="true" />
    <span class="db-scan" aria-hidden="true" />
    <span class="db-motes" aria-hidden="true"><i v-for="n in 7" :key="n" :style="moteStyle(n)" /></span>

    <!-- marquee header -->
    <header class="db-top">
      <span class="db-brand">
        <span class="db-brand-ic"><LogOut :size="14" /></span>
        <b>DEPARTURES</b>
        <span class="db-brand-sub">Separation Lexicon</span>
      </span>
      <div class="db-top-right">
        <span class="db-live"><i /> LIVE</span>
        <span class="db-clock set-mono">{{ clock }}</span>
      </div>
    </header>

    <!-- column headers -->
    <div class="db-colhead">
      <span>Gate</span><span>Code</span><span>Reason</span>
      <span class="db-c-nat">Nature</span><span class="db-c-cit">Cited</span><span>Status</span>
    </div>

    <!-- the split-flap rows -->
    <div class="db-rows" :class="{ scrollable: rows.length > 8 }">
      <button v-for="(r, i) in rows" :key="r.id || r.code" type="button" class="db-row"
        :class="{ off: !r.active, sweeping: sweepRow === i }" :style="{ '--ri': i }"
        @click="$emit('select', r.raw)" :title="`Edit ${r.label}`">
        <span class="db-rail" :data-tone="r.tone" />
        <!-- gate -->
        <span class="db-gate"><span class="db-flap" :class="{ flapping: flips.has(i) }" :style="{ '--ci': 0 }">{{ r.gate }}</span></span>
        <!-- code -->
        <span class="db-code">
          <span v-for="(ch, ci) in r.codeChars" :key="ci" class="db-flap"
            :class="{ flapping: flips.has(i) }" :style="{ '--ci': ci }">{{ ch }}</span>
        </span>
        <!-- reason -->
        <span class="db-reason">{{ r.label }}<i v-if="r.system" class="db-sys" title="Built-in"><Lock :size="9" /></i></span>
        <!-- nature -->
        <span class="db-nature db-c-nat" :data-nat="r.nat"><component :is="r.natIcon" :size="11" />{{ r.natLabel }}</span>
        <!-- cited -->
        <span class="db-cited db-c-cit"><b>{{ r.cited }}</b><small>exit{{ r.cited === 1 ? '' : 's' }}</small></span>
        <!-- status -->
        <span class="db-status" :data-tone="r.tone"><i class="db-led" />{{ r.status }}</span>
      </button>

      <div v-if="!rows.length" class="db-empty"><PlaneTakeoff :size="22" /><span>No reasons on the board yet</span></div>
    </div>

    <!-- footer telemetry -->
    <footer class="db-foot">
      <span class="db-foot-seg"><b>{{ rows.length }}</b> on board</span>
      <span class="db-foot-dot" />
      <span class="db-foot-seg ok"><b>{{ activeCount }}</b> active</span>
      <span class="db-foot-dot" />
      <span class="db-foot-seg"><b>{{ totalCited }}</b> exits classified</span>
      <span class="db-foot-spring" />
      <span class="db-foot-tag">Solari · live board</span>
    </footer>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import { LogOut, Lock, PlaneTakeoff, ArrowUpRight, ShieldX, Minus } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  reasons: { type: Array, default: () => [] },
  usage: { type: Object, default: () => ({}) },   // { RESIGNATION_TYPE:{code:n}, EXIT_REASON:{code:n} }
})
defineEmits(['select'])

const reduced = prefersReduced()
const boardEl = ref(null)
usePointerSpotlight(boardEl)

// ── row model ────────────────────────────────────────────────────────────────
const citedOf = (r) => Number(props.usage?.[r.category]?.[r.code] || 0)
const rows = computed(() => {
  const list = [...(props.reasons || [])]
  // active first, then by vocabulary, then by sort_order / code
  list.sort((a, b) =>
    (b.is_active === false ? 0 : 1) - (a.is_active === false ? 0 : 1) ||
    String(a.category).localeCompare(String(b.category)) ||
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    String(a.code).localeCompare(String(b.code)))
  return list.map((r) => {
    const active = r.is_active !== false
    const invol = r.is_voluntary === false
    const vol = r.is_voluntary === true
    const tone = !active ? 'off' : (invol ? 'divert' : 'board')
    return {
      raw: r, id: r.id, code: r.code, label: r.label || r.code,
      category: r.category, system: !!r.is_system, active,
      gate: r.category === 'RESIGNATION_TYPE' ? 'R' : 'E',
      codeChars: String(r.code || '').slice(0, 16).split(''),
      nat: vol ? 'vol' : invol ? 'invol' : 'neutral',
      natLabel: vol ? 'Voluntary' : invol ? 'Involuntary' : '—',
      natIcon: vol ? ArrowUpRight : invol ? ShieldX : Minus,
      cited: citedOf(r),
      status: !active ? 'CANCELLED' : invol ? 'DIVERTED' : 'ON TIME',
      tone,
    }
  })
})
const activeCount = computed(() => rows.value.filter(r => r.active).length)
const totalCited = computed(() => rows.value.reduce((a, r) => a + r.cited, 0))

// ── live terminal clock ───────────────────────────────────────────────────────
const clock = ref('--:--:--')
let clockTimer = null
const tickClock = () => {
  const d = new Date()
  clock.value = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

// ── split-flap ambient refresh + sweeping highlight ───────────────────────────
const flips = ref(new Set())
const sweepRow = ref(-1)
let flipTimer = null, sweepTimer = null, introTimer = null, sweepLoop = null

const flapRows = (idxs, dur = 720) => {
  const next = new Set(flips.value)
  idxs.forEach(i => next.add(i))
  flips.value = next
  setTimeout(() => {
    const n = new Set(flips.value)
    idxs.forEach(i => n.delete(i))
    flips.value = n
  }, dur)
}
const intro = () => {
  const n = rows.value.length
  if (!n) return
  // cascade a one-time flap across the whole board
  for (let i = 0; i < n; i++) setTimeout(() => flapRows([i], 700), i * 70)
}
const ambient = () => {
  const n = rows.value.length
  if (!n) return
  const a = Math.floor(Math.random() * n)
  const b = Math.floor(Math.random() * n)
  flapRows(a === b ? [a] : [a, b])
}
const sweep = () => {
  const n = rows.value.length
  if (!n) return
  sweepRow.value = -1
  let i = 0
  const step = () => {
    sweepRow.value = i
    i += 1
    if (i <= n) sweepTimer = setTimeout(step, 90)
    else sweepRow.value = -1
  }
  step()
}

onMounted(() => {
  tickClock()
  if (reduced) return
  clockTimer = setInterval(tickClock, 1000)
  introTimer = setTimeout(intro, 240)
  flipTimer = setInterval(ambient, 2600)
  sweepLoop = setInterval(sweep, 9000)
})
watch(() => rows.value.length, (n, o) => { if (!reduced && n && n !== o) setTimeout(intro, 120) })
onBeforeUnmount(() => {
  clearInterval(clockTimer); clearInterval(flipTimer); clearInterval(sweepLoop)
  clearTimeout(introTimer); clearTimeout(sweepTimer)
})

const moteStyle = (n) => {
  const seed = (n * 47) % 100
  return { '--mx': `${8 + seed}%`, '--dur': `${7 + (n % 4) * 1.6}s`, '--delay': `${(n * 0.7).toFixed(1)}s`, '--size': `${2 + (n % 3)}px` }
}
</script>

<style scoped>
/* The board is a physical "device": a dark slatted display in both themes,
   warm-tinted on cream so it harmonises with the light shell. */
.db {
  --db-board: #0c0c0f; --db-slat: #16161a; --db-cell-a: #1c1c21; --db-cell-b: #121215;
  --db-line: rgba(255,255,255,0.06); --db-flap-ink: var(--set-gold-bright);
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; min-height: 380px;
  border-radius: 20px; padding: 0; color: #e9e6df;
  background: var(--db-board);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 30px 70px -34px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05);
}
[data-theme="light"] .db {
  --db-board: #211a13; --db-slat: #2b2219; --db-cell-a: #312619; --db-cell-b: #241c13;
  --db-line: rgba(255,255,255,0.05); --db-flap-ink: #fcd34d;
  border-color: rgba(40,25,10,0.25);
  box-shadow: 0 30px 64px -32px rgba(40,25,10,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
}

.db-bezel { position: absolute; inset: 0; border-radius: 20px; pointer-events: none; z-index: 5;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 60px -20px rgba(0,0,0,0.9); }
.db-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 100% 3px; mix-blend-mode: overlay; }
.db-aura { position: absolute; inset: -40% 30% auto -10%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, rgba(251,146,60,0.22), transparent 70%); filter: blur(40px);
  transform: translate(calc((var(--mx,0.5) - 0.5) * 18px), calc((var(--my,0.5) - 0.5) * 14px)); }
.db-scan { position: absolute; left: 0; right: 0; top: 0; height: 38%; pointer-events: none; z-index: 1;
  background: linear-gradient(180deg, rgba(251,191,36,0.10), transparent); animation: db-scan 7s ease-in-out infinite; }
@keyframes db-scan { 0%,100% { transform: translateY(-10%); opacity: 0.4; } 50% { transform: translateY(230%); opacity: 0.8; } }
.db-motes { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.db-motes i { position: absolute; bottom: -6px; left: var(--mx); width: var(--size); height: var(--size); border-radius: 50%;
  background: rgba(252,211,77,0.7); box-shadow: 0 0 8px rgba(252,211,77,0.7);
  animation: db-mote var(--dur) linear infinite; animation-delay: var(--delay); opacity: 0; }
@keyframes db-mote { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.8; } 88% { opacity: 0.7; } 100% { transform: translateY(-360px); opacity: 0; } }

/* header */
.db-top { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 15px 18px 12px; border-bottom: 1px solid var(--db-line); }
.db-brand { display: inline-flex; align-items: center; gap: 9px; min-width: 0; }
.db-brand-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  color: #1a1206; background: linear-gradient(135deg, #fbbf24, #fb923c); box-shadow: 0 4px 12px -4px rgba(251,146,60,0.7); }
.db-brand b { font-size: 16px; font-weight: 900; letter-spacing: 0.16em; color: #fbbf24; text-shadow: 0 0 16px rgba(251,191,36,0.45); }
.db-brand-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(233,230,223,0.5); padding-left: 6px; }
.db-top-right { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }
.db-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 850; letter-spacing: 0.12em; color: #34d399; }
.db-live i { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; animation: db-blink 1.6s ease-in-out infinite; }
@keyframes db-blink { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
.db-clock { font-size: 15px; font-weight: 800; letter-spacing: 0.08em; color: #fcd34d; text-shadow: 0 0 14px rgba(252,211,77,0.4);
  padding: 3px 9px; border-radius: 7px; background: rgba(0,0,0,0.35); border: 1px solid rgba(252,211,77,0.18); }

/* columns */
.db-colhead, .db-row { display: grid; grid-template-columns: 30px 150px minmax(0,1fr) 102px 60px 94px; align-items: center; gap: 10px; }
.db-colhead { position: relative; z-index: 3; padding: 9px 18px; font-size: 8.5px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(233,230,223,0.4); border-bottom: 1px solid var(--db-line); }

.db-rows { position: relative; z-index: 2; flex: 1; min-height: 0; padding: 6px 10px 8px; display: flex; flex-direction: column; gap: 4px; }
.db-rows.scrollable { overflow-y: auto; max-height: 360px; scrollbar-width: thin; scrollbar-color: rgba(252,211,77,0.3) transparent;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%); }
.db-rows.scrollable::-webkit-scrollbar { width: 6px; }
.db-rows.scrollable::-webkit-scrollbar-thumb { background: rgba(252,211,77,0.3); border-radius: 3px; }

.db-row { position: relative; width: 100%; padding: 8px 8px 8px 14px; border: none; cursor: pointer; text-align: left;
  border-radius: 10px; background: rgba(255,255,255,0.015); font: inherit; color: inherit;
  transition: background 0.2s var(--set-spring), transform 0.2s var(--set-spring);
  animation: db-rowin 0.5s var(--set-spring) both; animation-delay: calc(var(--ri) * 0.045s); }
@keyframes db-rowin { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
.db-row:hover { background: rgba(252,211,77,0.07); transform: translateX(3px); }
.db-row.off { opacity: 0.46; }
.db-row.sweeping { background: rgba(252,211,77,0.12); box-shadow: inset 0 0 0 1px rgba(252,211,77,0.2); }
.db-rail { position: absolute; left: 0; top: 7px; bottom: 7px; width: 3px; border-radius: 0 3px 3px 0; background: #6b7280; }
.db-rail[data-tone="board"] { background: linear-gradient(180deg, #fbbf24, #fb923c); box-shadow: 0 0 10px -1px rgba(251,191,36,0.7); }
.db-rail[data-tone="divert"] { background: linear-gradient(180deg, #f87171, #dc2626); box-shadow: 0 0 10px -1px rgba(248,113,113,0.6); }
.db-rail[data-tone="off"] { background: #4b5563; }

/* split-flap cells */
.db-gate, .db-code { display: inline-flex; gap: 1px; perspective: 320px; min-width: 0; }
/* Long codes (e.g. CONTRACT_COMPLETION) are wider than the track — clip them to
   the column with a soft right-fade instead of letting flaps bleed into REASON. */
.db-code { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, #000 86%, transparent); mask-image: linear-gradient(90deg, #000 86%, transparent); }
.db-flap { position: relative; flex: 0 0 auto; display: inline-grid; place-items: center; min-width: 0.72em; height: 1.5em; padding: 0 1.5px;
  font-family: var(--set-mono); font-size: 11.5px; font-weight: 800; color: var(--db-flap-ink); border-radius: 3px;
  background: linear-gradient(180deg, var(--db-cell-a) 0 49.5%, var(--db-cell-b) 50.5% 100%);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.5);
  transform-style: preserve-3d; backface-visibility: hidden; }
.db-flap::after { content: ''; position: absolute; left: 2px; right: 2px; top: 50%; height: 1px; transform: translateY(-0.5px);
  background: rgba(0,0,0,0.62); z-index: 1; }
.db-flap.flapping { animation: db-flap 0.62s cubic-bezier(0.4,0.04,0.2,1) both; animation-delay: calc(var(--ci,0) * 0.035s); }
@keyframes db-flap { 0% { transform: rotateX(0deg); } 49% { transform: rotateX(-90deg); } 51% { transform: rotateX(90deg); } 100% { transform: rotateX(0deg); } }
.db-gate .db-flap { color: #fff; background: linear-gradient(180deg, #2a2118 0 49.5%, #1d160e 50.5% 100%); }

.db-reason { font-size: 13px; font-weight: 650; color: #e9e6df; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: inline-flex; align-items: center; gap: 6px; }
.db-sys { display: inline-grid; place-items: center; color: rgba(252,211,77,0.7); }
.db-row.off .db-reason { color: rgba(233,230,223,0.55); }

.db-nature { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: rgba(233,230,223,0.55); }
.db-nature[data-nat="vol"] { color: #34d399; }
.db-nature[data-nat="invol"] { color: #f87171; }
.db-nature :deep(svg) { flex-shrink: 0; }

.db-cited { display: inline-flex; align-items: baseline; gap: 4px; }
.db-cited b { font-family: var(--set-mono); font-size: 14px; font-weight: 800; color: #fcd34d; }
.db-cited small { font-size: 8.5px; color: rgba(233,230,223,0.4); }

.db-status { display: inline-flex; align-items: center; gap: 6px; justify-self: start; padding: 4px 10px; border-radius: 999px;
  font-size: 9.5px; font-weight: 850; letter-spacing: 0.08em; }
.db-led { width: 6px; height: 6px; border-radius: 50%; }
.db-status[data-tone="board"] { color: #fcd34d; background: rgba(251,191,36,0.12); }
.db-status[data-tone="board"] .db-led { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: db-blink 2s ease-in-out infinite; }
.db-status[data-tone="divert"] { color: #f87171; background: rgba(248,113,113,0.13); }
.db-status[data-tone="divert"] .db-led { background: #f87171; box-shadow: 0 0 8px #f87171; }
.db-status[data-tone="off"] { color: rgba(233,230,223,0.5); background: rgba(255,255,255,0.05); }
.db-status[data-tone="off"] .db-led { background: #6b7280; }

.db-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 0; color: rgba(233,230,223,0.4); }
.db-empty :deep(svg) { color: rgba(252,211,77,0.5); }
.db-empty span { font-size: 12px; }

/* footer */
.db-foot { position: relative; z-index: 3; display: flex; align-items: center; gap: 10px; padding: 11px 18px;
  border-top: 1px solid var(--db-line); font-size: 10.5px; color: rgba(233,230,223,0.5); }
.db-foot-seg b { color: #fcd34d; font-weight: 800; font-family: var(--set-mono); }
.db-foot-seg.ok b { color: #34d399; }
.db-foot-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(233,230,223,0.3); }
.db-foot-spring { flex: 1; }
.db-foot-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(233,230,223,0.35); }

@media (max-width: 860px) {
  .db-colhead, .db-row { grid-template-columns: 28px 92px minmax(0,1fr) 84px; }
  .db-c-nat { display: none; } .db-c-cit { display: none; }
  .db-status { font-size: 8.5px; padding: 3px 7px; }
}
@media (prefers-reduced-motion: reduce) {
  .db-scan, .db-motes i, .db-row, .db-flap.flapping, .db-live i, .db-status .db-led { animation: none !important; }
  .db-row { opacity: 1; }
}
</style>
