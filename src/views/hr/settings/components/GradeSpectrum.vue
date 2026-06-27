<template>
  <div class="spec" :style="{ '--lbl': '62px' }">
    <span class="spec-bg-grid" aria-hidden="true" />
    <span class="spec-aura" aria-hidden="true" />

    <!-- salary probe -->
    <div class="spec-probe">
      <div class="spec-probe-in">
        <Crosshair :size="13" />
        <span class="spec-probe-pre">₹</span>
        <input type="number" inputmode="numeric" v-model.number="probe" placeholder="Locate an annual CTC…" />
      </div>
      <transition name="spec-fade">
        <span v-if="probe > 0" class="spec-probe-out" :data-tone="probeHit.tone">
          <component :is="probeHit.icon" :size="12" /> {{ probeHit.text }}
        </span>
      </transition>
    </div>

    <div v-if="!banded.length" class="spec-empty">
      <BarChart3 :size="22" />
      <p>No pay bands set yet. Add a min &amp; max CTC to a grade to plot it on the ladder.</p>
    </div>

    <template v-else>
      <div class="spec-plot">
        <!-- gridlines + probe marker overlay (aligned to the track area) -->
        <div class="spec-overlay" aria-hidden="true">
          <span v-for="(t, i) in ticks" :key="'g' + i" class="spec-gridline" :style="{ left: t.pct + '%' }" />
          <transition name="spec-fade">
            <span v-if="probe > 0 && probePct !== null" class="spec-marker" :style="{ left: probePct + '%' }">
              <span class="spec-marker-cap">₹{{ fmtShort(probe) }}</span>
            </span>
          </transition>
        </div>

        <!-- rows -->
        <div class="spec-rows">
          <div v-for="(g, i) in rows" :key="g.id" class="spec-row" :class="{ hot: hovered === g.id, dim: hovered && hovered !== g.id }"
            @mouseenter="hovered = g.id" @mouseleave="hovered = null" @click="$emit('select', g.raw)">
            <span class="spec-row-lbl set-mono" :data-overlap="g.overlap">{{ g.code }}</span>
            <div class="spec-track">
              <span class="spec-bar" :style="{ left: g.left + '%', width: g.width + '%', '--d': (i * 0.06) + 's' }" :data-overlap="g.overlap" :data-probe="g.inProbe">
                <span class="spec-bar-edge l" /><span class="spec-bar-edge r" />
                <span class="spec-bar-lvl" v-if="g.level != null">L{{ g.level }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- axis -->
        <div class="spec-axis">
          <span v-for="(t, i) in ticks" :key="'a' + i" class="spec-tick" :style="{ left: t.pct + '%' }">{{ t.label }}</span>
        </div>
      </div>

      <!-- tooltip -->
      <transition name="spec-fade">
        <div v-if="hoveredRow" class="spec-tip" :style="{ left: hoveredRow.mid + '%' }">
          <b>{{ hoveredRow.name }}</b>
          <span class="set-mono spec-tip-rng">₹{{ fmtShort(hoveredRow.lo) }} – ₹{{ fmtShort(hoveredRow.hi) }}</span>
          <div class="spec-tip-meta">
            <span v-if="hoveredRow.level != null">L{{ hoveredRow.level }}</span>
            <span v-if="hoveredRow.pay">{{ hoveredRow.pay }}</span>
            <span><Users :size="10" /> {{ hoveredRow.hc }}</span>
            <span v-if="hoveredRow.overlap" class="warn"><AlertTriangle :size="10" /> overlaps</span>
          </div>
        </div>
      </transition>
    </template>

    <div class="spec-foot">
      <span class="spec-legend"><i class="d band" /> Pay band</span>
      <span class="spec-legend"><i class="d ov" /> Overlap</span>
      <span v-if="unbanded.length" class="spec-unb">{{ unbanded.length }} grade{{ unbanded.length === 1 ? '' : 's' }} without a band</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Crosshair, BarChart3, Users, AlertTriangle, Target, TriangleAlert, MoveUp } from 'lucide-vue-next'

const props = defineProps({
  grades: { type: Array, default: () => [] },
  headcountById: { type: Object, default: () => ({}) },
})
defineEmits(['select'])

const hovered = ref(null)
const probe = ref(null)

const num = (v) => (v == null || v === '' ? null : Number(v))
const hc = (id) => Number(props.headcountById[id] || 0)

const banded = computed(() => props.grades
  .map(g => {
    const a = num(g.min_ctc), b = num(g.max_ctc)
    if (a == null && b == null) return null
    let lo = a ?? b, hi = b ?? a
    if (hi < lo) [lo, hi] = [hi, lo]
    return { id: g.id, raw: g, name: g.name, code: g.code, level: g.level, lo, hi,
      pay: g.default_pay_level || '', hc: hc(g.id) }
  })
  .filter(Boolean))

const unbanded = computed(() => props.grades.filter(g => num(g.min_ctc) == null && num(g.max_ctc) == null))

const axis = computed(() => {
  if (!banded.value.length) return { min: 0, max: 1 }
  const los = banded.value.map(g => g.lo), his = banded.value.map(g => g.hi)
  let min = Math.min(...los), max = Math.max(...his)
  if (max === min) { max = min + 1 }
  const pad = (max - min) * 0.06
  return { min: Math.max(0, min - pad), max: max + pad }
})
const pct = (v) => {
  const { min, max } = axis.value
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}

const overlapIds = computed(() => {
  const out = new Set()
  const arr = banded.value
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i].lo < arr[j].hi && arr[j].lo < arr[i].hi) { out.add(arr[i].id); out.add(arr[j].id) }
    }
  }
  return out
})

const rows = computed(() => [...banded.value]
  .sort((a, b) => (b.level ?? -1) - (a.level ?? -1) || b.hi - a.hi)
  .slice(0, 14)
  .map(g => {
    const left = pct(g.lo), right = pct(g.hi)
    return { ...g, left, width: Math.max(2, right - left), mid: (left + right) / 2,
      overlap: overlapIds.value.has(g.id), inProbe: probe.value > 0 && probe.value >= g.lo && probe.value <= g.hi }
  }))

const hoveredRow = computed(() => rows.value.find(r => r.id === hovered.value) || null)

const ticks = computed(() => {
  const { min, max } = axis.value
  return Array.from({ length: 5 }, (_, i) => {
    const v = min + (i / 4) * (max - min)
    return { pct: (i / 4) * 100, label: '₹' + fmtShort(v) }
  })
})

const probePct = computed(() => (probe.value > 0 ? pct(probe.value) : null))
const probeHit = computed(() => {
  const v = probe.value
  if (!v || v <= 0) return { text: '', tone: 'none', icon: Target }
  const inside = banded.value.filter(g => v >= g.lo && v <= g.hi)
  if (inside.length) return { text: `Falls in ${inside.map(g => g.code).join(', ')}`, tone: 'ok', icon: Target }
  const above = banded.value.every(g => v > g.hi)
  if (above) return { text: 'Above every band — top of the ladder', tone: 'warn', icon: MoveUp }
  return { text: 'Lands in a gap between bands', tone: 'warn', icon: TriangleAlert }
})

function fmtShort(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(v % 1e7 ? 1 : 0) + 'cr'
  if (v >= 1e5) return (v / 1e5).toFixed(v % 1e5 ? 1 : 0) + 'L'
  if (v >= 1e3) return Math.round(v / 1e3) + 'k'
  return String(Math.round(v))
}
</script>

<style scoped>
.spec { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 16px 18px;
  border-radius: 18px; background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--set-gold) 11%, transparent), transparent 60%),
    var(--set-panel);
  border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.spec-bg-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px); background-size: 48px 100%;
  mask-image: linear-gradient(180deg, #000 40%, transparent); -webkit-mask-image: linear-gradient(180deg, #000 40%, transparent); }
.spec-aura { position: absolute; inset: -30% 30% auto -10%; height: 60%; background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 18%, transparent), transparent 70%); filter: blur(34px); pointer-events: none; }

.spec-probe { position: relative; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.spec-probe-in { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); min-width: 220px; flex: 1; max-width: 320px; }
.spec-probe-in:focus-within { border-color: var(--set-border-warm); }
.spec-probe-in :deep(svg) { color: var(--set-gold); flex-shrink: 0; }
.spec-probe-pre { color: var(--set-text-dim); font-size: 13px; }
.spec-probe-in input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.spec-probe-out { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 5px 11px; border-radius: 999px; }
.spec-probe-out[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.spec-probe-out[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }

.spec-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 16px; color: var(--set-text-dim); text-align: center; }
.spec-empty :deep(svg) { color: var(--set-gold); }
.spec-empty p { margin: 0; font-size: 12.5px; max-width: 34ch; }

/* plot */
.spec-plot { position: relative; }
.spec-overlay { position: absolute; left: var(--lbl); right: 0; top: 0; bottom: 26px; pointer-events: none; z-index: 1; }
.spec-gridline { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--set-trace-idle); }
.spec-marker { position: absolute; top: -2px; bottom: -2px; width: 2px; background: linear-gradient(180deg, var(--set-gold-bright), var(--set-gold));
  box-shadow: 0 0 10px var(--set-gold); transition: left 0.5s cubic-bezier(0.16,1,0.3,1); }
.spec-marker-cap { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); white-space: nowrap;
  font-size: 9px; font-weight: 800; font-family: var(--set-mono); color: #1a1206; background: var(--set-gold); padding: 1px 6px; border-radius: 999px; }

.spec-rows { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 7px; }
.spec-row { display: grid; grid-template-columns: var(--lbl) 1fr; align-items: center; gap: 0; cursor: pointer; transition: opacity 0.25s; }
.spec-row.dim { opacity: 0.4; }
.spec-row-lbl { font-size: 11px; font-weight: 800; color: var(--set-text-secondary); white-space: nowrap; }
.spec-row-lbl[data-overlap="true"] { color: var(--set-partial); }
.spec-track { position: relative; height: 18px; border-radius: 6px; background: color-mix(in srgb, var(--set-text) 4%, transparent); }
.spec-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 5px; background: var(--set-grad-hero);
  box-shadow: 0 0 14px -4px var(--set-gold); transform-origin: left; animation: spec-grow 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: var(--d);
  display: flex; align-items: center; justify-content: flex-end; padding-right: 5px; transition: filter 0.2s, box-shadow 0.2s; }
.spec-bar[data-overlap="true"] { background: linear-gradient(90deg, var(--set-partial), var(--set-orange)); }
.spec-bar[data-probe="true"] { box-shadow: 0 0 0 2px var(--set-gold-bright), 0 0 18px -2px var(--set-gold); }
.spec-row.hot .spec-bar { filter: brightness(1.12); box-shadow: 0 0 20px -2px var(--set-gold); }
.spec-bar-edge { position: absolute; top: -1px; bottom: -1px; width: 2px; background: rgba(255,255,255,0.6); border-radius: 2px; }
.spec-bar-edge.l { left: 0; } .spec-bar-edge.r { right: 0; }
.spec-bar-lvl { font-size: 8px; font-weight: 800; color: rgba(26,18,6,0.85); letter-spacing: 0.04em; }
@keyframes spec-grow { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }

.spec-axis { position: relative; height: 22px; margin-left: var(--lbl); margin-top: 4px; }
.spec-tick { position: absolute; top: 4px; transform: translateX(-50%); font-size: 9px; font-family: var(--set-mono); color: var(--set-text-dim); white-space: nowrap; }
.spec-tick:first-child { transform: translateX(0); } .spec-tick:last-child { transform: translateX(-100%); }

.spec-tip { position: absolute; bottom: 44px; transform: translateX(-50%); z-index: 5; pointer-events: none; min-width: 120px;
  margin-left: var(--lbl); padding: 8px 11px; border-radius: 11px; background: var(--set-surface-elevated);
  border: 1px solid var(--set-border-strong); box-shadow: 0 14px 30px -16px rgba(0,0,0,0.7); }
.spec-tip b { display: block; font-size: 11.5px; font-weight: 800; color: var(--set-text); }
.spec-tip-rng { font-size: 10px; color: var(--set-gold); }
.spec-tip-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.spec-tip-meta span { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; color: var(--set-text-muted); }
.spec-tip-meta span.warn { color: var(--set-partial); }

.spec-foot { position: relative; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.spec-legend { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.spec-legend i.d { width: 14px; height: 6px; border-radius: 3px; }
.spec-legend i.band { background: var(--set-grad-hero); } .spec-legend i.ov { background: linear-gradient(90deg, var(--set-partial), var(--set-orange)); }
.spec-unb { margin-left: auto; font-size: 10px; color: var(--set-text-dim); }

.spec-fade-enter-active, .spec-fade-leave-active { transition: opacity 0.2s; }
.spec-fade-enter-from, .spec-fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .spec-bar { animation: none; transform: none; }
  .spec-marker { transition: none; }
}
</style>
