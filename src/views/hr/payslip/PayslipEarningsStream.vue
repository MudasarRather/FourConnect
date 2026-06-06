<template>
  <div class="es card">
    <header class="es-head">
      <div>
        <span class="es-eyebrow"><Activity :size="13" /> Earnings stream</span>
        <h3 class="es-title">Twelve months of pay</h3>
      </div>
      <div class="es-legend">
        <span><i class="ln gross"></i> Gross</span>
        <span><i class="ln net"></i> Net</span>
      </div>
    </header>

    <div class="es-plot" :class="{ reduced }">
      <svg class="es-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="esNetFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--pay-net)" stop-opacity="0.34" />
            <stop offset="100%" stop-color="var(--pay-net)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <!-- gridlines -->
        <line v-for="g in gridY" :key="g" class="es-grid" :x1="0" :y1="g" :x2="W" :y2="g" vector-effect="non-scaling-stroke" />
        <!-- net area + lines (revealed left→right) -->
        <g class="es-reveal">
          <path class="es-area" :d="netArea" fill="url(#esNetFill)" />
          <path class="es-line net" :d="netLine" fill="none" vector-effect="non-scaling-stroke" />
          <path class="es-line gross" :d="grossLine" fill="none" vector-effect="non-scaling-stroke" />
        </g>
      </svg>

      <!-- DOM beads (kept out of SVG so non-uniform scale can't distort them) -->
      <button
        v-for="(p, i) in pts" :key="'b' + i" type="button"
        class="es-bead" :class="{ on: p.key === selectedKey, has: p.has }"
        :style="{ left: pctX(p.x) + '%', top: pctY(p.gy) + '%', '--d': (0.34 + i * 0.05) + 's' }"
        @mouseenter="hover = i" @mouseleave="hover = -1"
        @click="p.has && $emit('select', { year: p.year, month: p.month })"
        :title="p.label"
      ></button>

      <!-- tooltip -->
      <transition name="es-tip">
        <div v-if="hover >= 0" class="es-tip" :style="tipStyle">
          <span class="tip-m">{{ pts[hover].label }} {{ pts[hover].year }}</span>
          <span class="tip-r"><i class="d gross"></i> Gross <b>{{ inr(pts[hover].gross) }}</b></span>
          <span class="tip-r"><i class="d net"></i> Net <b>{{ inr(pts[hover].net) }}</b></span>
          <span class="tip-r"><i class="d ded"></i> Deductions <b>{{ inr(pts[hover].deductions) }}</b></span>
          <span v-if="!pts[hover].has" class="tip-none">No payslip released</span>
        </div>
      </transition>

      <!-- x labels -->
      <div class="es-x">
        <span v-for="(p, i) in pts" :key="'x' + i" :class="{ on: p.key === selectedKey }">{{ p.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Activity } from 'lucide-vue-next'
import { inr } from '@/composables/usePayroll'

const props = defineProps({
  months: { type: Array, default: () => [] },
  selectedKey: { type: String, default: '' },
})
defineEmits(['select'])

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const hover = ref(-1)

const W = 1000, H = 230
const PADX = 26, PADT = 20, PADB = 26

const num = (v) => Number(v || 0)
const max = computed(() => Math.max(1, ...props.months.map(m => num(m.gross))))
const xFor = (i, n) => n <= 1 ? W / 2 : PADX + (i / (n - 1)) * (W - 2 * PADX)
const yFor = (v) => (H - PADB) - (num(v) / max.value) * (H - PADT - PADB)

const pts = computed(() => {
  const n = props.months.length
  return props.months.map((m, i) => ({
    x: xFor(i, n),
    gy: yFor(m.gross),
    ny: yFor(m.net),
    gross: num(m.gross), net: num(m.net), deductions: num(m.deductions),
    label: m.label, month: m.month, year: m.year,
    key: `${m.year}-${m.month}`,
    has: num(m.gross) > 0 || num(m.net) > 0,
  }))
})

const _path = (key) => pts.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${(key === 'g' ? p.gy : p.ny).toFixed(1)}`).join(' ')
const grossLine = computed(() => _path('g'))
const netLine = computed(() => _path('n'))
const netArea = computed(() => {
  const p = pts.value; if (p.length < 2) return ''
  return `M${p[0].x.toFixed(1)} ${H - PADB} ` + p.map(q => `L${q.x.toFixed(1)} ${q.ny.toFixed(1)}`).join(' ') + ` L${p[p.length - 1].x.toFixed(1)} ${H - PADB} Z`
})
const gridY = [PADT, (H - PADB + PADT) / 2, H - PADB]
const pctX = (x) => (x / W) * 100
const pctY = (y) => (y / H) * 100

const tipStyle = computed(() => {
  if (hover.value < 0) return {}
  const p = pts.value[hover.value]
  const left = pctX(p.x)
  return { left: left + '%', top: pctY(p.gy) + '%', transform: `translate(${left > 70 ? '-100%' : left < 30 ? '0' : '-50%'}, calc(-100% - 12px))` }
})
</script>

<style scoped>
.es { background: var(--pay-surface); border: 1px solid var(--pay-border); border-radius: 20px; padding: 18px 20px 14px; }
.es-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
.es-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--pay-treasury); }
.es-title { margin: 4px 0 0; font-size: 16px; font-weight: 800; color: var(--pay-text); letter-spacing: -0.01em; }
.es-legend { display: flex; gap: 14px; font-size: 11px; color: var(--pay-text-2); }
.es-legend i.ln { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
.es-legend i.ln.gross { background: var(--pay-mint); } .es-legend i.ln.net { background: var(--pay-net); }

.es-plot { position: relative; height: 230px; }
.es-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.es-grid { stroke: var(--pay-border-soft); stroke-width: 1; }
.es-area { opacity: 0.9; }
.es-line { stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
.es-line.gross { stroke: var(--pay-mint); filter: drop-shadow(0 0 4px rgba(251,191,36,0.4)); }
.es-line.net { stroke: var(--pay-net); }
/* left→right reveal = "draws itself" */
.es-reveal { animation: pay-area-grow 1.3s var(--pay-ease) 0.1s both; }

.es-bead { position: absolute; width: 9px; height: 9px; margin: -4.5px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 2px solid var(--pay-canvas); background: var(--pay-mint); z-index: 3;
  transform: scale(0); animation: pay-spark-pop 0.4s var(--pay-spring) var(--d) both;
  transition: box-shadow 0.2s, background 0.2s; }
.es-bead.has { background: var(--pay-net); }
.es-bead:not(.has) { background: var(--pay-text-muted); cursor: default; }
.es-bead:hover { box-shadow: 0 0 0 4px rgba(52,211,153,0.18); }
.es-bead.on { background: var(--pay-mint-bright); box-shadow: 0 0 0 4px rgba(251,191,36,0.22), 0 0 12px 2px var(--pay-mint);
  animation: pay-spark-pop 0.4s var(--pay-spring) var(--d) both, pay-node-halo 1.8s ease-out infinite 0.8s; }
.es-plot.reduced .es-reveal, .es-plot.reduced .es-bead { animation: none !important; opacity: 1; transform: none; }

.es-tip { position: absolute; z-index: 5; min-width: 150px; padding: 9px 11px; border-radius: 11px; pointer-events: none;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border); backdrop-filter: var(--pay-glass-blur);
  box-shadow: 0 16px 40px -22px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 3px; }
.tip-m { font-size: 11px; font-weight: 800; color: var(--pay-text); margin-bottom: 2px; }
.tip-r { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pay-text-2); }
.tip-r b { margin-left: auto; font-family: var(--pay-mono); color: var(--pay-text); }
.tip-r i.d { width: 7px; height: 7px; border-radius: 50%; }
.tip-r i.d.gross { background: var(--pay-mint); } .tip-r i.d.net { background: var(--pay-net); } .tip-r i.d.ded { background: var(--pay-deduction); }
.tip-none { font-size: 10px; font-style: italic; color: var(--pay-text-muted); }
.es-tip-enter-active, .es-tip-leave-active { transition: opacity 0.18s, transform 0.18s; }
.es-tip-enter-from, .es-tip-leave-to { opacity: 0; }

.es-x { position: absolute; left: 0; right: 0; bottom: -2px; display: flex; justify-content: space-between; padding: 0 18px; }
.es-x span { flex: 1; text-align: center; font-size: 9px; font-family: var(--pay-mono); color: var(--pay-text-muted); }
.es-x span.on { color: var(--pay-treasury); font-weight: 800; }
</style>
