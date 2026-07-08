<template>
  <div class="sd-mx" :class="{ live: chosen }">
    <!-- column (impact) axis -->
    <div class="mx-colhead" aria-hidden="true">
      <span class="mx-corner"><Crosshair :size="12" /></span>
      <span
        v-for="(im, c) in IMPACT_AXIS" :key="'c' + im.value"
        class="mx-chead" :class="{ lit: impact === im.value }"
      >{{ im.label }}<i>{{ im.hint }}</i></span>
    </div>

    <div class="mx-body">
      <!-- urgency (row) axis -->
      <div class="mx-rowhead" aria-hidden="true">
        <span
          v-for="(ur, r) in URGENCY_AXIS" :key="'r' + ur.value"
          class="mx-rhead" :class="{ lit: urgency === ur.value }"
        >{{ ur.label }}<i>{{ ur.hint }}</i></span>
      </div>

      <!-- the charged grid -->
      <div class="mx-grid" :style="gridVars">
        <!-- crosshair beams sweep to the chosen intersection -->
        <span v-if="chosen" class="mx-beam-h" :style="{ '--pc': derivedColor }" aria-hidden="true" />
        <span v-if="chosen" class="mx-beam-v" :style="{ '--pc': derivedColor }" aria-hidden="true" />
        <span class="mx-scan" aria-hidden="true" />

        <button
          v-for="cell in cells" :key="cell.key" type="button"
          class="mx-cell" :class="['p-' + cell.p, { on: cell.on, dim: chosen && !cell.on }]"
          :style="{ '--r': cell.r, '--c': cell.c }"
          @click="pick(cell.impact, cell.urgency)"
          @mouseenter="hover = cell.key" @mouseleave="hover = ''"
        >
          <span class="cell-p">{{ priorityP(cell.p) }}</span>
          <span class="cell-glow" aria-hidden="true" />
          <span v-if="cell.on" class="cell-ping" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- derived priority readout -->
    <Motion
      class="mx-out" :class="{ ph: !chosen }"
      :style="chosen ? { '--pc': derivedColor } : null"
      :animate="chosen ? { scale: [0.96, 1] } : {}"
      :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
    >
      <template v-if="chosen">
        <span class="out-code">{{ priorityP(derived) }}</span>
        <span class="out-body">
          <b>{{ cap(derived) }} priority</b>
          <i>{{ cap(impact) }} impact &times; {{ cap(urgency) }} urgency</i>
        </span>
        <span class="out-pulse" aria-hidden="true" />
      </template>
      <template v-else>
        <Crosshair :size="14" /> <span>Plot impact against urgency — the priority computes itself.</span>
      </template>
    </Motion>
  </div>
</template>

<script setup>
/*
  SdPriorityMatrix — the charged ITIL Impact × Urgency engine.
  A 4×4 grid where the priority is COMPUTED, not chosen: pick a cell and a
  crosshair of light sweeps to the intersection, the cell ignites in its
  priority tone, and the derived P-code pulses out. Controlled component:
  parent owns impact/urgency, we emit `pick({ impact, urgency, priority })`.
  Mirrors the backend IMPACT_URGENCY_MATRIX exactly.
*/
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Crosshair } from 'lucide-vue-next'
import { priorityFromMatrix, priorityP, priorityColor } from '@/composables/useSupportDesk'

const props = defineProps({
  impact: { type: String, default: '' },
  urgency: { type: String, default: '' },
})
const emit = defineEmits(['pick'])

// Columns = impact (severity of blast radius); rows = urgency (how fast it bites).
const IMPACT_AXIS = [
  { value: 'critical', label: 'Critical', hint: 'Org-wide' },
  { value: 'high', label: 'High', hint: 'Many users' },
  { value: 'medium', label: 'Moderate', hint: 'Some users' },
  { value: 'low', label: 'Low', hint: 'One user' },
]
const URGENCY_AXIS = [
  { value: 'critical', label: 'Immediate', hint: 'Now' },
  { value: 'high', label: 'High', hint: '1–2 days' },
  { value: 'medium', label: 'Moderate', hint: '~ a week' },
  { value: 'low', label: 'Low', hint: 'Flexible' },
]

const hover = ref('')
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

const cells = computed(() => {
  const out = []
  URGENCY_AXIS.forEach((ur, r) => {
    IMPACT_AXIS.forEach((im, c) => {
      out.push({
        key: ur.value + '|' + im.value,
        impact: im.value, urgency: ur.value, r, c,
        p: priorityFromMatrix(im.value, ur.value),
        on: props.impact === im.value && props.urgency === ur.value,
      })
    })
  })
  return out
})

const chosen = computed(() => !!props.impact && !!props.urgency)
const derived = computed(() => priorityFromMatrix(props.impact, props.urgency))
const derivedColor = computed(() => priorityColor(derived.value))

// Drive the crosshair position from the selected row/col indices.
const selRow = computed(() => URGENCY_AXIS.findIndex(u => u.value === props.urgency))
const selCol = computed(() => IMPACT_AXIS.findIndex(i => i.value === props.impact))
const gridVars = computed(() => ({ '--sel-r': selRow.value, '--sel-c': selCol.value }))

const pick = (impact, urgency) => {
  emit('pick', { impact, urgency, priority: priorityFromMatrix(impact, urgency) })
}
</script>

<style scoped>
.sd-mx { display: flex; flex-direction: column; gap: 10px; }

/* column (impact) header row, aligned to the grid's 4 columns + a corner */
.mx-colhead { display: grid; grid-template-columns: var(--rh, 78px) repeat(4, 1fr); gap: 6px; align-items: end; }
.mx-corner { display: grid; place-items: center; color: var(--sd-text-dim); }
.mx-chead { display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; font-size: 10.5px; font-weight: 700; color: var(--sd-text-secondary); transition: color 0.25s; }
.mx-chead i { font-style: normal; font-size: 8.5px; font-weight: 500; color: var(--sd-text-dim); }
.mx-chead.lit { color: var(--sd-amber); }
.mx-chead.lit i { color: var(--sd-amber-strong); }

.mx-body { display: grid; grid-template-columns: var(--rh, 78px) 1fr; gap: 6px; align-items: stretch; }
.mx-rowhead { display: grid; grid-template-rows: repeat(4, 1fr); gap: 6px; }
.mx-rhead { display: flex; flex-direction: column; justify-content: center; gap: 1px; padding-right: 6px; text-align: right; font-size: 10.5px; font-weight: 700; color: var(--sd-text-secondary); transition: color 0.25s; }
.mx-rhead i { font-style: normal; font-size: 8.5px; font-weight: 500; color: var(--sd-text-dim); }
.mx-rhead.lit { color: var(--sd-amber); }
.mx-rhead.lit i { color: var(--sd-amber-strong); }

/* the grid + the crosshair overlay live in the same 4×4 space */
.mx-grid {
  position: relative;
  display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr);
  gap: 6px; min-height: 188px;
}

/* crosshair beams — positioned by the selected row/col, animate as they move */
.mx-beam-h, .mx-beam-v { position: absolute; pointer-events: none; z-index: 3; border-radius: 2px; transition: transform 0.5s var(--sd-spring), opacity 0.4s; }
.mx-beam-h {
  left: -2px; right: -2px; height: 2px;
  top: calc((var(--sel-r, 0) + 0.5) * 25%); transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, var(--pc), transparent);
  box-shadow: 0 0 14px 1px color-mix(in srgb, var(--pc) 60%, transparent);
}
.mx-beam-v {
  top: -2px; bottom: -2px; width: 2px;
  left: calc((var(--sel-c, 0) + 0.5) * 25%); transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, var(--pc), transparent);
  box-shadow: 0 0 14px 1px color-mix(in srgb, var(--pc) 60%, transparent);
}

/* one-shot scanline that flickers across when the grid first charges */
.mx-scan { position: absolute; inset: 0; pointer-events: none; z-index: 2; border-radius: 12px; overflow: hidden; opacity: 0; }
.sd-mx.live .mx-scan { animation: mx-scan 1.1s var(--sd-ease) 1; }
.mx-scan::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -45%; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-amber) 22%, transparent), transparent); }

.mx-cell {
  position: relative; display: grid; place-items: center;
  border-radius: 11px; cursor: pointer; font-family: var(--sd-mono);
  font-size: 13px; font-weight: 800; color: #fff;
  border: 1px solid transparent; overflow: hidden;
  transition: transform 0.2s var(--sd-spring), filter 0.2s, box-shadow 0.25s, opacity 0.3s;
}
.mx-cell .cell-p { position: relative; z-index: 2; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
.mx-cell.p-critical { background: color-mix(in srgb, var(--sd-pri-critical) 82%, #1a0808); }
.mx-cell.p-high { background: color-mix(in srgb, var(--sd-ember-deep) 80%, #1a0d05); }
.mx-cell.p-medium { background: color-mix(in srgb, var(--sd-amber-strong) 84%, #1c1305); color: #2a1c04; }
.mx-cell.p-low { background: color-mix(in srgb, var(--sd-success) 70%, #06150f); color: #042118; }
.mx-cell:hover { transform: translateY(-2px); filter: brightness(1.12) saturate(1.1); z-index: 4; }
.mx-cell.dim { opacity: 0.4; filter: saturate(0.6); }
.mx-cell.on {
  opacity: 1; transform: translateY(-2px) scale(1.05); z-index: 5;
  border-color: rgba(255,255,255,0.85);
  box-shadow: 0 0 0 2px var(--sd-canvas), 0 0 0 4px rgba(255,255,255,0.9), 0 10px 26px rgba(0,0,0,0.5);
}
.cell-glow { position: absolute; inset: 0; opacity: 0; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 70%); transition: opacity 0.3s; }
.mx-cell.on .cell-glow { opacity: 1; }
.cell-ping { position: absolute; inset: 0; border-radius: 11px; border: 2px solid rgba(255,255,255,0.9); animation: mx-ping 0.7s var(--sd-ease) 1; }

.mx-out {
  display: flex; align-items: center; gap: 11px; position: relative; overflow: hidden;
  padding: 9px 14px; border-radius: 13px;
  background: color-mix(in srgb, var(--pc, var(--sd-steel)) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--pc, var(--sd-steel)) 34%, transparent);
}
.mx-out.ph { gap: 8px; color: var(--sd-text-dim); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); font-size: 12px; }
.out-code { display: grid; place-items: center; min-width: 36px; height: 30px; padding: 0 9px; border-radius: 9px; font-family: var(--sd-mono); font-weight: 800; font-size: 14px; color: #fff; background: var(--pc); box-shadow: 0 0 16px color-mix(in srgb, var(--pc) 55%, transparent); }
[data-theme="light"] .out-code { color: #fff8ec; }
.out-body { display: flex; flex-direction: column; gap: 1px; }
.out-body b { font-size: 13px; font-weight: 750; color: var(--sd-text); }
.out-body i { font-style: normal; font-size: 10.5px; color: var(--sd-text-muted); }
.out-pulse { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--pc); animation: mx-edge 2.4s ease-in-out infinite; }

@keyframes mx-ping { 0% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.35); } }
@keyframes mx-scan { 0% { opacity: 1; } 100% { opacity: 1; } }
.sd-mx.live .mx-scan::after { animation: mx-scan-sweep 1.1s var(--sd-ease) 1; }
@keyframes mx-scan-sweep { 0% { left: -45%; } 100% { left: 115%; } }
@keyframes mx-edge { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

@media (max-width: 460px) {
  .mx-colhead, .mx-body { --rh: 60px; }
  .mx-chead, .mx-rhead { font-size: 9.5px; }
  .mx-chead i, .mx-rhead i { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .mx-beam-h,
  html:not([data-cinematic="on"]) .mx-beam-v { transition: none; }
  html:not([data-cinematic="on"]) .mx-scan,
  html:not([data-cinematic="on"]) .cell-ping,
  html:not([data-cinematic="on"]) .out-pulse,
  html:not([data-cinematic="on"]) .mx-scan::after { animation: none; }
}
</style>
