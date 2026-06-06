<template>
  <div class="reel" :class="{ reduced }">
    <header class="reel-head">
      <div>
        <span class="reel-eyebrow"><Clapperboard :size="13" /> Cinema reel</span>
        <h3 class="reel-title">Roll through your pay</h3>
      </div>
      <div class="reel-meta">
        <span class="timecode">{{ timecode }}</span>
        <div class="reel-nav">
          <button class="rnav" @click="step(-1)" aria-label="Rewind"><ChevronLeft :size="16" /></button>
          <button class="rnav" @click="step(1)" aria-label="Forward"><ChevronRight :size="16" /></button>
        </div>
      </div>
    </header>

    <div class="reel-stage">
      <!-- projector gate / viewfinder -->
      <div class="gate" aria-hidden="true">
        <span class="gate-br tl" /><span class="gate-br tr" />
        <span class="gate-br bl" /><span class="gate-br br" />
        <span class="gate-line" />
      </div>

      <div class="film" ref="filmEl" @scroll="onScroll">
        <div class="strip">
          <i class="pad" />
          <div
            v-for="(p, i) in items" :key="p.id"
            class="frame" :class="{ focus: i === focusIdx }"
            :ref="el => setFrameRef(el, i)"
            :style="frameStyle(i)"
            @click="pick(i)"
          >
            <div class="cell" :class="statusMeta(p.status).pillClass">
              <span class="cell-sheen" aria-hidden="true" />
              <span class="frame-no">{{ String(i + 1).padStart(2, '0') }} · {{ shortNo(p.payslip_no) }}</span>
              <div class="cell-body">
                <span class="cell-mon">{{ monthLabel(p.period_month).slice(0, 3) }}</span>
                <span class="cell-yr">{{ p.period_year }}</span>
              </div>
              <PayMoneyValue class="cell-net" :value="Number(p.net_pay || 0)" short tone="net" :animate="false" />
              <span class="cell-bar"><i :style="{ '--h': barH(p) + '%' }" /></span>
              <span class="pay-chip cell-status" :class="statusMeta(p.status).pillClass">{{ statusMeta(p.status).label }}</span>
            </div>
          </div>
          <i class="pad" />
        </div>
      </div>

      <div class="grain" aria-hidden="true" />
      <div class="flicker" aria-hidden="true" />
    </div>

    <p class="reel-hint">Scrub the reel · the centred frame mints above</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Clapperboard, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import PayMoneyValue from '../payroll/components/PayMoneyValue.vue'
import { monthLabel, statusMeta, inrShort } from '@/composables/usePayroll'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: null },
})
const emit = defineEmits(['select'])

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const filmEl = ref(null)
const frameEls = ref([])
const setFrameRef = (el, i) => { if (el) frameEls.value[i] = el }
const focusIdx = ref(0)
const metrics = ref([])

const maxNet = computed(() => Math.max(1, ...props.items.map(p => Number(p.net_pay || 0))))
const barH = (p) => Math.max(10, Math.round((Number(p.net_pay || 0) / maxNet.value) * 100))
const shortNo = (no) => (no ? String(no).split('-').slice(0, 2).join('-') : '—')

const focused = computed(() => props.items[focusIdx.value] || null)
const timecode = computed(() => focused.value
  ? `${monthLabel(focused.value.period_month).slice(0, 3).toUpperCase()} ${focused.value.period_year} · ${inrShort(Number(focused.value.net_pay || 0))}`
  : '--')

/* ── scrub-driven focus (depth: centred frame scales up, others dim/desaturate) ── */
let raf = 0
const recompute = () => {
  const el = filmEl.value
  if (!el) return
  const cRect = el.getBoundingClientRect()
  const cx = cRect.left + cRect.width / 2
  const half = cRect.width / 2 || 1
  let bestI = 0, bestD = Infinity
  const out = []
  for (let i = 0; i < frameEls.value.length; i++) {
    const f = frameEls.value[i]
    if (!f) { out.push({ scale: 0.86, opacity: 0.5, sat: 0.5, blur: 1.4 }); continue }
    const r = f.getBoundingClientRect()
    const fx = r.left + r.width / 2
    const d = Math.abs(fx - cx)
    const norm = Math.min(d / half, 1)
    if (d < bestD) { bestD = d; bestI = i }
    out.push({
      scale: 1 - norm * 0.18,
      opacity: 1 - norm * 0.5,
      sat: 0.35 + (1 - norm) * 0.65,
      blur: norm * 1.6,
    })
  }
  metrics.value = out
  focusIdx.value = bestI
}
const frameStyle = (i) => {
  const m = metrics.value[i]
  if (!m || reduced) return {}
  return { transform: `scale(${m.scale.toFixed(3)})`, opacity: m.opacity.toFixed(2),
    filter: `saturate(${m.sat.toFixed(2)}) blur(${m.blur.toFixed(2)}px)` }
}

let scrollEndT = 0
const onScroll = () => {
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; recompute() })
  clearTimeout(scrollEndT)
  scrollEndT = setTimeout(() => {
    const p = props.items[focusIdx.value]
    if (p && String(p.id) !== String(props.selectedId)) emit('select', p.id)
  }, 160)
}

const centerFrame = (i, behavior = 'smooth') => {
  frameEls.value[i]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior })
}
const pick = (i) => { centerFrame(i); emit('select', props.items[i]?.id) }
const step = (dir) => { centerFrame(Math.max(0, Math.min(props.items.length - 1, focusIdx.value + dir))) }

watch(() => props.selectedId, async (id) => {
  const i = props.items.findIndex(p => String(p.id) === String(id))
  if (i >= 0 && i !== focusIdx.value) { await nextTick(); centerFrame(i) }
})

const onResize = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; recompute() }) }
onMounted(async () => {
  await nextTick()
  const i = props.items.findIndex(p => String(p.id) === String(props.selectedId))
  if (i > 0) centerFrame(i, 'auto')
  recompute()
  setTimeout(recompute, 60)
  window.addEventListener('resize', onResize, { passive: true })
})
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); clearTimeout(scrollEndT) })
</script>

<style scoped>
.reel { background: var(--pay-surface); border: 1px solid var(--pay-border); border-radius: 20px; padding: 18px 18px 16px; }
.reel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.reel-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--pay-treasury); }
.reel-title { margin: 4px 0 0; font-size: 16px; font-weight: 800; color: var(--pay-text); letter-spacing: -0.01em; }
.reel-meta { display: flex; align-items: center; gap: 12px; }
.timecode { font-family: var(--pay-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--pay-mint);
  padding: 5px 10px; border-radius: 8px; background: rgba(251,191,36,0.10); border: 1px solid var(--pay-border-soft); white-space: nowrap; }
.reel-nav { display: flex; gap: 7px; }
.rnav { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2);
  transition: color 0.18s, border-color 0.18s, transform 0.18s var(--pay-spring); }
.rnav:hover { color: var(--pay-treasury); border-color: var(--pay-border); transform: translateY(-1px); }

/* ── stage ── */
.reel-stage { position: relative; border-radius: 16px; overflow: hidden;
  background: linear-gradient(180deg, #0b0805, #161009); border: 1px solid var(--pay-border-soft); }

.gate { position: absolute; left: 50%; top: 16px; bottom: 16px; width: 168px; transform: translateX(-50%); z-index: 4; pointer-events: none; }
.gate-br { position: absolute; width: 16px; height: 16px; border: 2px solid var(--pay-mint); opacity: 0.85; filter: drop-shadow(0 0 4px rgba(251,191,36,0.5)); }
.gate-br.tl { top: 0; left: 0; border-right: 0; border-bottom: 0; border-radius: 4px 0 0 0; }
.gate-br.tr { top: 0; right: 0; border-left: 0; border-bottom: 0; border-radius: 0 4px 0 0; }
.gate-br.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; border-radius: 0 0 0 4px; }
.gate-br.br { bottom: 0; right: 0; border-left: 0; border-top: 0; border-radius: 0 0 4px 0; }
.gate-line { position: absolute; left: 50%; top: -6px; bottom: -6px; width: 1px; transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.5), transparent); }

.film { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.film::-webkit-scrollbar { display: none; }
.strip { position: relative; display: flex; align-items: center; gap: 16px; padding: 30px 0; }
/* film perforations top + bottom, scroll with the strip */
.strip::before, .strip::after { content: ''; position: absolute; left: 0; right: 0; height: 12px; pointer-events: none;
  background-image: repeating-linear-gradient(90deg, transparent 0 12px, rgba(0,0,0,0.55) 12px 20px, transparent 20px 32px);
  background-size: 32px 12px; mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
.strip::before { top: 6px; } .strip::after { bottom: 6px; }
.pad { flex: 0 0 calc(50% - 78px); }

.frame { flex: 0 0 148px; scroll-snap-align: center; cursor: pointer; transform-origin: center;
  transition: transform 0.2s var(--pay-ease), opacity 0.2s var(--pay-ease), filter 0.2s var(--pay-ease);
  animation: reel-in 0.5s var(--pay-ease) both; }
@keyframes reel-in { from { opacity: 0; transform: translateY(16px) scale(0.9); } to { opacity: 1; transform: none; } }

.cell { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 7px; padding: 13px 13px 11px;
  border-radius: 12px; height: 158px;
  background: linear-gradient(165deg, rgba(255,255,255,0.06), transparent 55%), #1c140b;
  border: 1px solid var(--pay-border-soft); box-shadow: inset 0 1px 0 rgba(255,236,179,0.08); }
.cell-sheen { position: absolute; inset: 0; pointer-events: none; }
.frame.focus .cell { border-color: var(--pay-mint); box-shadow: 0 0 0 1px var(--pay-mint), 0 20px 40px -22px var(--pay-mint); }
.frame.focus .cell-sheen::after { content: ''; position: absolute; top: -30%; left: -40%; width: 40%; height: 160%;
  background: linear-gradient(90deg, transparent, rgba(255,247,224,0.18), transparent); transform: skewX(-18deg);
  animation: pay-foil-sweep 3.4s ease-in-out infinite; }
.frame-no { font-family: var(--pay-mono); font-size: 8.5px; letter-spacing: 0.08em; color: var(--pay-text-muted); }
.cell-body { display: flex; align-items: baseline; gap: 5px; }
.cell-mon { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; color: var(--pay-text); line-height: 1; }
.cell-yr { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.cell-net { font-size: 15px; }
.cell-bar { display: flex; align-items: flex-end; height: 34px; margin-top: auto; }
.cell-bar i { display: block; width: 100%; height: var(--h); border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, var(--pay-net), rgba(52,211,153,0.12)); transform-origin: bottom;
  animation: pay-bar-grow 0.7s var(--pay-ease) 0.2s both; }
.cell-status { align-self: flex-start; font-size: 9px !important; padding: 2px 7px !important; }

/* film grain + flicker (cinematic atmosphere) */
.grain { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: 0.06; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(255,255,255,0.8) 0.5px, transparent 0.7px); background-size: 3px 3px;
  animation: grain-shift 0.5s steps(3) infinite; }
@keyframes grain-shift { 0% { transform: translate(0,0); } 33% { transform: translate(-1px,1px); } 66% { transform: translate(1px,-1px); } }
.flicker { position: absolute; inset: 0; z-index: 3; pointer-events: none; background: rgba(251,191,36,0.04);
  animation: flick 4s steps(1) infinite; }
@keyframes flick { 0%,97%,100% { opacity: 0; } 98% { opacity: 0.5; } 99% { opacity: 0.15; } }

.reel-hint { margin: 10px 0 0; text-align: center; font-size: 10.5px; font-style: italic; color: var(--pay-text-muted); }

/* ── light theme ── */
[data-theme="light"] .reel-stage { background: linear-gradient(180deg, #efe6d2, #f7efdd); }
[data-theme="light"] .cell { background: linear-gradient(165deg, rgba(184,134,11,0.08), transparent 55%), #fffdf7; }
[data-theme="light"] .strip::before, [data-theme="light"] .strip::after {
  background-image: repeating-linear-gradient(90deg, transparent 0 12px, rgba(120,90,20,0.4) 12px 20px, transparent 20px 32px); }
[data-theme="light"] .grain { mix-blend-mode: multiply; opacity: 0.04; }
[data-theme="light"] .timecode { color: #a9760a; }

/* ── reduced motion ── */
.reel.reduced .grain, .reel.reduced .flicker, .reel.reduced .cell-bar i,
.reel.reduced .frame, .reel.reduced .frame.focus .cell-sheen::after { animation: none !important; }
.reel.reduced .frame { opacity: 1 !important; transform: none !important; filter: none !important; }
</style>
