<template>
  <div ref="fieldEl" class="cm" :class="{ reduced }">
    <!-- ─── ambient sector backdrop ─── -->
    <div class="cm-sky" aria-hidden="true">
      <span class="cm-grain" />
      <span class="cm-northstar" />
      <span class="cm-vignette" />
      <svg class="cm-stars" viewBox="0 0 100 100" preserveAspectRatio="none">
        <circle v-for="s in stars" :key="s.k" :cx="s.x" :cy="s.y" :r="s.r"
          :style="{ '--tw': s.dur + 's', '--dl': s.delay + 's', '--op': s.op }" class="cm-star" />
      </svg>
      <!-- aspirational talent vector: Risk (bottom-left) → Star (top-right) -->
      <svg class="cm-vector" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cmVec" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="var(--cm-vec-a)" />
            <stop offset="100%" stop-color="var(--cm-vec-b)" />
          </linearGradient>
        </defs>
        <line x1="6" y1="94" x2="94" y2="6" stroke="url(#cmVec)" stroke-width="0.7"
          stroke-linecap="round" stroke-dasharray="2.4 3.2" class="cm-vec-line" />
      </svg>
    </div>

    <!-- ─── grid + axes ─── -->
    <div class="cm-stage">
      <div class="cm-yaxis"><span class="cm-axis-cap"><ArrowUp :size="11" /> Potential</span></div>

      <div class="cm-main">
        <div class="cm-grid">
          <div v-for="(cell, i) in ordered" :key="cell.box" class="cm-cell"
            :style="{ '--c': boxMeta(cell.box).color, '--di': diagDelay(i) }"
            :class="{ drop: dragOverBox === cell.box, focus: focusBox === cell.box, peak: cell.box === 9, lit: hoverCell === cell.box }"
            @dragover.prevent="dragOverBox = cell.box" @dragleave="dragOverBox = null" @drop.prevent="onDrop(cell)"
            @mouseenter="hoverCell = cell.box" @mouseleave="hoverCell = null">
            <span class="cm-cell-glow" aria-hidden="true" />
            <div class="cm-cell-head">
              <span class="cm-cell-ic"><component :is="boxMeta(cell.box).icon" :size="12" /></span>
              <span class="cm-cell-label">{{ boxMeta(cell.box).label }}</span>
              <span class="cm-cell-n" :class="{ active: cell.members.length }">{{ cell.members.length }}</span>
            </div>

            <TransitionGroup name="cm-pop" tag="div" class="cm-orbs">
              <button v-for="m in cell.members" :key="m.id" type="button" class="cm-orb"
                :class="{ sel: selectedId === m.id, done: m.status === 'CALIBRATED', dragging: draggingId === m.id }"
                :style="orbStyle(m, cell.box)" draggable="true"
                @dragstart="onDragStart(m, $event)" @dragend="onDragEnd"
                @click="$emit('select', m)"
                @mouseenter="showTip(m, $event)" @mousemove="trackTip" @mouseleave="hideTip" @focus="showTip(m, $event)" @blur="hideTip">
                <span class="cm-orb-ring" aria-hidden="true" :style="{ '--perf-p': (fracOf(m) * 360).toFixed(1) + 'deg' }" />
                <span class="cm-orb-core">{{ initials(m.employee_name) }}</span>
                <span v-if="m.status === 'CALIBRATED'" class="cm-orb-seal"><Check :size="9" /></span>
              </button>
            </TransitionGroup>

            <span v-if="!cell.members.length" class="cm-cell-empty" aria-hidden="true" />
          </div>
        </div>

        <div class="cm-xaxis">
          <span>Low</span><span>Medium</span><span>High</span>
          <span class="cm-axis-cap bottom">Performance <ArrowRight :size="11" /></span>
        </div>
      </div>
    </div>

    <!-- ─── teleported scouting readout (hover info) ─── -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="tip" :key="tip.id" class="cm-tip perf-scope" :style="tipStyle"
          :initial="reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.94, filter: 'blur(6px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96, filter: 'blur(4px)' }"
          :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
          <span class="cm-tip-arrow" :style="{ left: tip.arrow + 'px' }" />
          <div class="cm-tip-top" :style="{ '--c': boxMeta(tip.box).color }">
            <span class="cm-tip-av">{{ initials(tip.employee_name) }}</span>
            <div class="cm-tip-id">
              <b>{{ tip.employee_name }}</b>
              <span>{{ tip.designation_name || tip.department_name || tip.employee_code || '—' }}</span>
            </div>
            <span class="cm-tip-status" :class="tip.status === 'CALIBRATED' ? 'ok' : 'draft'">
              <component :is="tip.status === 'CALIBRATED' ? BadgeCheck : CircleDashed" :size="11" />
              {{ tip.status === 'CALIBRATED' ? 'Sealed' : 'Draft' }}
            </span>
          </div>

          <div class="cm-tip-gauge">
            <div class="cm-tip-ring" :style="{ '--perf-p': tipFrac(tip) * 360 + 'deg', '--g': scoreTone(tipScore(tip), tip.rating_max) }">
              <span class="cm-tip-ring-val">{{ fmtScore(tipScore(tip)) }}<i>/{{ tip.rating_max }}</i></span>
            </div>
            <div class="cm-tip-readout">
              <div class="cm-tip-box" :style="{ '--c': boxMeta(tip.box).color }">
                <component :is="boxMeta(tip.box).icon" :size="13" />
                <b>{{ boxMeta(tip.box).label }}</b>
              </div>
              <div class="cm-tip-bands">
                <span class="cm-tip-band"><i>Perf</i>{{ BAND_LABELS[tip.performance_band] }}</span>
                <span class="cm-tip-band"><i>Potential</i>{{ BAND_LABELS[tip.potential_band] }}</span>
              </div>
              <div v-if="tip.calibrated_score != null && Number(tip.calibrated_score) !== Number(tip.performance_score)" class="cm-tip-override">
                <Scale :size="10" /> Committee {{ fmtScore(tip.calibrated_score) }} · review {{ fmtScore(tip.performance_score) }}
              </div>
            </div>
          </div>

          <!-- the calibration → reward link, made visible -->
          <div v-if="meritFor(tip)" class="cm-tip-merit" :style="{ '--c': meritFor(tip).color }">
            <span class="cm-tip-merit-ic"><Coins :size="12" /></span>
            <div class="cm-tip-merit-tx">
              <span class="cm-tip-merit-lab">Implied merit band</span>
              <b>{{ meritFor(tip).label }} · {{ meritFor(tip).hike }} hike</b>
            </div>
          </div>

          <p class="cm-tip-hint"><MousePointer2 :size="10" /> {{ tip.status === 'CALIBRATED' ? 'Click to review · drag to recalibrate' : 'Click to set potential & seal' }}</p>
        </Motion>
      </Presence>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ArrowUp, ArrowRight, Check, BadgeCheck, CircleDashed, Scale, Coins, MousePointer2 } from 'lucide-vue-next'
import { boxMeta, BAND_LABELS, scoreTone } from '@/composables/usePerformance'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  cells: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  focusBox: { type: Number, default: null },
  meritFor: { type: Function, default: () => null },
})
const emit = defineEmits(['select', 'move'])

const reduced = prefersReduced()
const fieldEl = ref(null)
usePointerSpotlight(fieldEl)

const dragOverBox = ref(null)
const hoverCell = ref(null)
const draggingId = ref(null)
let dragging = null

// rows top→bottom = potential High(3)→Low(1); cols left→right = perf Low(1)→High(3)
const byBox = computed(() => { const m = {}; for (const c of props.cells) m[c.box] = c; return m })
const ordered = computed(() => {
  const out = []
  for (const q of [3, 2, 1]) for (const p of [1, 2, 3]) {
    const box = (q - 1) * 3 + p
    out.push(byBox.value[box] || { box, members: [] })
  }
  return out
})
// diagonal stagger: cells light from Risk(bottom-left) toward Star(top-right)
const diagDelay = (i) => { const r = Math.floor(i / 3), c = i % 3; return (((2 - r) + c) * 0.07).toFixed(2) + 's' }

// data-independent starfield so a sparse grid still reads alive
const stars = computed(() => {
  const out = []
  let s = 1337
  for (let i = 0; i < 26; i++) {
    s = (s * 9301 + 49297) % 233280; const x = (s / 233280) * 100
    s = (s * 9301 + 49297) % 233280; const y = (s / 233280) * 100
    s = (s * 9301 + 49297) % 233280; const r = 0.18 + (s / 233280) * 0.42
    s = (s * 9301 + 49297) % 233280; const dur = 2.4 + (s / 233280) * 4
    s = (s * 9301 + 49297) % 233280; const delay = (s / 233280) * 5
    s = (s * 9301 + 49297) % 233280; const op = 0.18 + (s / 233280) * 0.5
    out.push({ k: i, x: x.toFixed(2), y: y.toFixed(2), r: r.toFixed(2), dur: dur.toFixed(2), delay: delay.toFixed(2), op: op.toFixed(2) })
  }
  return out
})

const scoreOf = (m) => (m.calibrated_score != null ? Number(m.calibrated_score) : (m.performance_score != null ? Number(m.performance_score) : null))
const fracOf = (m) => { const s = scoreOf(m); const mx = m.rating_max || 5; return s == null ? 0 : Math.max(0, Math.min(1, s / mx)) }
const orbStyle = (m, box) => ({ '--c': boxMeta(box).color, '--perf-p': (fracOf(m) * 360).toFixed(1) + 'deg' })

function onDragStart(m, e) { dragging = m; draggingId.value = m.id; try { e.dataTransfer.effectAllowed = 'move' } catch {} }
function onDragEnd() { dragOverBox.value = null; draggingId.value = null }
function onDrop(cell) {
  dragOverBox.value = null
  if (!dragging) return
  const box = cell.box
  const perf = ((box - 1) % 3) + 1
  const pot = Math.floor((box - 1) / 3) + 1
  if (dragging.box !== box) emit('move', { member: dragging, performance_band: perf, potential_band: pot })
  dragging = null; draggingId.value = null
}

// ── teleported hover readout ──
const tip = ref(null)
const tipPos = reactive({ x: 0, y: 0, arrow: 130 })
let hideTimer = null
const TIP_W = 268

const place = (rect) => {
  const cx = rect.left + rect.width / 2
  let left = cx - TIP_W / 2
  left = Math.max(12, Math.min(left, window.innerWidth - TIP_W - 12))
  const top = rect.top - 14 // tooltip sits above, translateY(-100%) in CSS
  tipPos.x = left; tipPos.y = top
  tipPos.arrow = Math.max(18, Math.min(cx - left, TIP_W - 18))
}
function showTip(m, e) {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  const el = e.currentTarget
  if (el && el.getBoundingClientRect) place(el.getBoundingClientRect())
  tip.value = m
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', hideTip)
}
function trackTip(e) { if (tip.value && e.currentTarget?.getBoundingClientRect) place(e.currentTarget.getBoundingClientRect()) }
function onScroll() { hideTip() }
function hideTip() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    tip.value = null
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', hideTip)
  }, 60)
}
onBeforeUnmount(() => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', hideTip); if (hideTimer) clearTimeout(hideTimer) })

const tipStyle = computed(() => ({ left: tipPos.x + 'px', top: tipPos.y + 'px' }))
const tipScore = (m) => scoreOf(m)
const tipFrac = (m) => fracOf(m)

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const fmtScore = (s) => s != null ? Number(s).toFixed(1) : '—'
</script>

<style scoped>
.cm { position: relative; border-radius: 16px; overflow: hidden; isolation: isolate;
  background: radial-gradient(130% 120% at 100% 0%, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent 60%), var(--perf-panel);
  border: 1px solid var(--perf-border); padding: 14px; --cm-vec-a: color-mix(in srgb, var(--perf-conflict) 60%, transparent); --cm-vec-b: var(--perf-ok); }

/* ambient backdrop layers */
.cm-sky { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.cm-grain { position: absolute; inset: 0; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 130% at 100% 0%, #000 8%, transparent 70%); -webkit-mask-image: radial-gradient(120% 130% at 100% 0%, #000 8%, transparent 70%); }
.cm-northstar { position: absolute; top: -22%; right: -10%; width: 56%; height: 70%;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-ok) 22%, transparent), transparent 66%); filter: blur(34px); animation: cm-breathe 7s ease-in-out infinite; }
.cm-vignette { position: absolute; inset: 0; background: radial-gradient(140% 120% at 18% 100%, color-mix(in srgb, var(--perf-conflict) 8%, transparent), transparent 52%); }
.cm-stars { position: absolute; inset: 0; width: 100%; height: 100%; }
.cm-star { fill: var(--perf-gold-bright); opacity: var(--op); transform-box: fill-box; transform-origin: center;
  animation: cm-tw var(--tw) ease-in-out var(--dl) infinite; }
.cm-vector { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; }
.cm-vec-line { animation: cm-flow 3.4s linear infinite; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--perf-ok) 50%, transparent)); }

@keyframes cm-breathe { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes cm-tw { 0%, 100% { opacity: calc(var(--op) * 0.35); } 50% { opacity: var(--op); } }
@keyframes cm-flow { to { stroke-dashoffset: -28; } }

/* stage */
.cm-stage { position: relative; z-index: 1; display: flex; gap: 8px; }
.cm-yaxis { display: flex; align-items: center; }
.cm-axis-cap { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-text-muted); writing-mode: vertical-rl; transform: rotate(180deg); }
.cm-axis-cap :deep(svg) { color: var(--perf-gold); }
.cm-axis-cap.bottom { writing-mode: horizontal-tb; transform: none; grid-column: 1 / -1; justify-content: center; margin-top: 4px; }
.cm-main { flex: 1; min-width: 0; }
.cm-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, minmax(120px, 1fr)); gap: 8px;
  transform: perspective(1400px) rotateX(calc((var(--my, .5) - .5) * -3deg)) rotateY(calc((var(--mx, .5) - .5) * 4deg)); transition: transform 0.4s var(--perf-spring); }

.cm-cell { position: relative; display: flex; flex-direction: column; gap: 7px; padding: 9px; border-radius: 13px; overflow: hidden;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 11%, var(--perf-surface)), color-mix(in srgb, var(--c) 4%, var(--perf-surface)));
  border: 1px solid color-mix(in srgb, var(--c) 24%, transparent); transition: transform 0.22s var(--perf-spring), border-color 0.22s, box-shadow 0.28s;
  opacity: 0; animation: cm-deal 0.55s var(--perf-spring) forwards; animation-delay: var(--di); }
.cm-cell::after { content: ''; position: absolute; top: 0; right: 0; width: 46px; height: 46px; pointer-events: none;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--c) 40%, transparent), transparent 70%); }
.cm-cell-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(80% 80% at 50% 30%, color-mix(in srgb, var(--c) 16%, transparent), transparent 70%); }
.cm-cell.lit { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 44%, transparent); box-shadow: 0 14px 30px -20px color-mix(in srgb, var(--c) 70%, transparent); }
.cm-cell.lit .cm-cell-glow { opacity: 1; }
.cm-cell.peak { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent), 0 0 26px -14px color-mix(in srgb, var(--c) 80%, transparent); }
.cm-cell.drop { border-color: var(--c); box-shadow: inset 0 0 0 1.5px var(--c), 0 0 28px -10px color-mix(in srgb, var(--c) 90%, transparent); transform: scale(1.012); }
.cm-cell.focus { animation: cm-focus 1.4s var(--perf-spring); border-color: color-mix(in srgb, var(--c) 60%, transparent); }
@keyframes cm-deal { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes cm-focus { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 35% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 55%, transparent), 0 0 40px -6px color-mix(in srgb, var(--c) 85%, transparent); } }

.cm-cell-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; }
.cm-cell-ic { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }
.cm-cell-label { flex: 1; min-width: 0; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-cell-n { display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 6px; font-size: 10.5px; font-weight: 850; font-variant-numeric: tabular-nums;
  color: var(--perf-text-dim); background: color-mix(in srgb, var(--c) 9%, transparent); }
.cm-cell-n.active { color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }
.cm-cell-empty { position: absolute; bottom: 9px; left: 50%; width: 5px; height: 5px; border-radius: 50%; transform: translateX(-50%); background: color-mix(in srgb, var(--c) 30%, transparent); }

.cm-orbs { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; overflow-y: auto; }
.cm-orb { position: relative; display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: none; background: none; cursor: grab; flex-shrink: 0;
  transition: transform 0.18s var(--perf-spring), filter 0.18s; }
.cm-orb:hover { transform: translateY(-3px) scale(1.12); z-index: 3; filter: drop-shadow(0 6px 12px color-mix(in srgb, var(--c) 60%, transparent)); }
.cm-orb:active { cursor: grabbing; }
.cm-orb.dragging { opacity: 0.4; }
.cm-orb-ring { position: absolute; inset: 0; border-radius: 50%; transition: --perf-p 0.6s var(--perf-spring);
  background: conic-gradient(from -90deg, var(--c) var(--perf-p, 0deg), var(--perf-track) 0);
  -webkit-mask: radial-gradient(closest-side, transparent 64%, #000 67%); mask: radial-gradient(closest-side, transparent 64%, #000 67%); }
.cm-orb-core { position: relative; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; font-size: 9px; font-weight: 850; color: #1a1206;
  background: var(--perf-grad-hero); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2); }
.cm-orb.done .cm-orb-core { background: linear-gradient(135deg, var(--perf-ok), color-mix(in srgb, var(--perf-ok) 60%, #047857)); color: #04261b; }
.cm-orb.sel { transform: translateY(-2px) scale(1.14); }
.cm-orb.sel .cm-orb-ring { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 55%, transparent), 0 0 16px -2px var(--c); }
.cm-orb.sel::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1.5px dashed color-mix(in srgb, var(--c) 65%, transparent); animation: cm-spin 9s linear infinite; }
.cm-orb-seal { position: absolute; right: -2px; bottom: -2px; display: grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; color: #fff; background: var(--perf-ok); box-shadow: 0 0 0 2px var(--perf-panel); }
@keyframes cm-spin { to { transform: rotate(360deg); } }

/* pop-in for orbs (move between cells) */
.cm-pop-enter-active { transition: transform 0.4s var(--perf-spring), opacity 0.4s; }
.cm-pop-leave-active { transition: transform 0.25s, opacity 0.25s; position: absolute; }
.cm-pop-enter-from { opacity: 0; transform: scale(0.4) translateY(8px); }
.cm-pop-leave-to { opacity: 0; transform: scale(0.5); }

.cm-xaxis { display: grid; grid-template-columns: repeat(3, 1fr); align-items: center; margin-top: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.cm-xaxis > span { text-align: center; }
</style>

<style>
/* ── teleported scouting readout (unscoped: lives on <body>) ── */
.cm-tip { position: fixed; z-index: 5300; width: 268px; transform: translateY(-100%); pointer-events: none;
  border-radius: 15px; padding: 13px 14px 11px; background: var(--perf-glass); border: 1px solid var(--perf-border-strong);
  box-shadow: 0 26px 60px -24px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 0, 0, 0.2); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.cm-tip-arrow { position: absolute; bottom: -6px; width: 12px; height: 12px; transform: translateX(-50%) rotate(45deg);
  background: var(--perf-glass); border-right: 1px solid var(--perf-border-strong); border-bottom: 1px solid var(--perf-border-strong); }
.cm-tip-top { display: flex; align-items: center; gap: 9px; }
.cm-tip-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206;
  background: var(--perf-grad-hero); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 40%, transparent); }
.cm-tip-id { min-width: 0; flex: 1; }
.cm-tip-id b { display: block; font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-tip-id span { font-size: 10.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.cm-tip-status { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; padding: 3px 7px; border-radius: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; }
.cm-tip-status.ok { color: var(--perf-ok); background: var(--perf-ok-soft); }
.cm-tip-status.draft { color: var(--perf-text-muted); background: var(--perf-unset-soft); }

.cm-tip-gauge { display: flex; align-items: center; gap: 13px; margin-top: 12px; }
.cm-tip-ring { position: relative; display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; flex-shrink: 0; transition: --perf-p 0.6s var(--perf-spring);
  background: conic-gradient(from -90deg, var(--g) var(--perf-p, 0deg), var(--perf-track) 0); }
.cm-tip-ring::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-panel); }
.cm-tip-ring-val { position: relative; font-size: 14px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.cm-tip-ring-val i { font-size: 8px; font-style: normal; color: var(--perf-text-muted); }
.cm-tip-readout { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.cm-tip-box { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 800; color: var(--c); }
.cm-tip-bands { display: flex; gap: 6px; }
.cm-tip-band { display: flex; flex-direction: column; gap: 1px; flex: 1; padding: 4px 7px; border-radius: 8px; font-size: 11px; font-weight: 750; color: var(--perf-text); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); }
.cm-tip-band i { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.cm-tip-override { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 650; color: var(--perf-amber); }

.cm-tip-merit { display: flex; align-items: center; gap: 9px; margin-top: 11px; padding: 8px 10px; border-radius: 11px;
  background: color-mix(in srgb, var(--c) 10%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.cm-tip-merit-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }
.cm-tip-merit-tx { min-width: 0; }
.cm-tip-merit-lab { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.cm-tip-merit-tx b { font-size: 12px; font-weight: 800; color: var(--perf-text); }
.cm-tip-hint { display: flex; align-items: center; gap: 4px; margin: 9px 0 0; font-size: 9.5px; color: var(--perf-text-dim); }
.cm-tip-hint :deep(svg), .cm-tip-hint svg { color: var(--perf-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .cm-northstar, .cm-star, .cm-vec-line, .cm-orb.sel::after { animation: none !important; }
  .cm-cell { animation: none !important; opacity: 1; }
  .cm-grid { transform: none !important; }
  .cm-orb-ring, .cm-tip-ring { transition: none; }
}
</style>
