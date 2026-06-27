<template>
  <div class="nb">
    <!-- y axis -->
    <div class="nb-yaxis">
      <span class="nb-axis-cap"><ArrowUp :size="11" /> Potential</span>
    </div>

    <div class="nb-main">
      <div class="nb-grid">
        <div v-for="cell in ordered" :key="cell.box" class="nb-cell" :style="{ '--c': boxMeta(cell.box).color }"
          :class="{ drop: dragOverBox === cell.box }"
          @dragover.prevent="dragOverBox = cell.box" @dragleave="dragOverBox = null"
          @drop.prevent="onDrop(cell)">
          <div class="nb-cell-head">
            <span class="nb-cell-ic"><component :is="boxMeta(cell.box).icon" :size="12" /></span>
            <span class="nb-cell-label">{{ boxMeta(cell.box).label }}</span>
            <span class="nb-cell-n">{{ cell.members.length }}</span>
          </div>
          <div class="nb-chips">
            <button v-for="m in cell.members" :key="m.id" class="nb-chip" :class="{ done: m.status === 'CALIBRATED', sel: selectedId === m.id }"
              draggable="true" @dragstart="onDragStart(m, $event)" @dragend="dragOverBox = null"
              @click="$emit('select', m)" :title="m.employee_name">
              <span class="nb-chip-av">{{ initials(m.employee_name) }}</span>
              <span class="nb-chip-name">{{ firstName(m.employee_name) }}</span>
              <span v-if="m.status === 'CALIBRATED'" class="nb-chip-seal"><Check :size="9" /></span>
            </button>
            <span v-if="!cell.members.length" class="nb-chip-empty">—</span>
          </div>
        </div>
      </div>
      <!-- x axis -->
      <div class="nb-xaxis">
        <span>Low</span><span>Medium</span><span>High</span>
        <span class="nb-axis-cap right">Performance <ArrowRight :size="11" /></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowUp, ArrowRight, Check } from 'lucide-vue-next'
import { boxMeta } from '@/composables/usePerformance'

const props = defineProps({ cells: { type: Array, default: () => [] }, selectedId: { type: String, default: null } })
const emit = defineEmits(['select', 'move'])

const dragOverBox = ref(null)
let dragging = null

// rows top→bottom = potential High(3)→Low(1); cols left→right = perf Low(1)→High(3)
const byBox = computed(() => {
  const m = {}
  for (const c of props.cells) m[c.box] = c
  return m
})
const ordered = computed(() => {
  const out = []
  for (const q of [3, 2, 1]) for (const p of [1, 2, 3]) {
    const box = (q - 1) * 3 + p
    out.push(byBox.value[box] || { box, members: [] })
  }
  return out
})

function onDragStart(m, e) { dragging = m; try { e.dataTransfer.effectAllowed = 'move' } catch {} }
function onDrop(cell) {
  dragOverBox.value = null
  if (!dragging) return
  const box = cell.box
  const perf = ((box - 1) % 3) + 1
  const pot = Math.floor((box - 1) / 3) + 1
  if (dragging.box !== box) emit('move', { member: dragging, performance_band: perf, potential_band: pot })
  dragging = null
}

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const firstName = (n) => (n || '—').trim().split(/\s+/)[0]
</script>

<style scoped>
.nb { display: flex; gap: 8px; }
.nb-yaxis { display: flex; align-items: center; }
.nb-axis-cap { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-text-muted); writing-mode: vertical-rl; transform: rotate(180deg); }
.nb-axis-cap :deep(svg) { color: var(--perf-gold); }
.nb-axis-cap.right { writing-mode: horizontal-tb; transform: none; margin-left: auto; }
.nb-main { flex: 1; min-width: 0; }
.nb-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, minmax(118px, 1fr)); gap: 8px; }
.nb-cell { position: relative; display: flex; flex-direction: column; gap: 7px; padding: 9px; border-radius: 12px; overflow: hidden;
  background: color-mix(in srgb, var(--c) 7%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--c) 22%, transparent); transition: all 0.2s var(--perf-spring); }
.nb-cell.drop { border-color: var(--c); background: color-mix(in srgb, var(--c) 16%, var(--perf-surface)); box-shadow: inset 0 0 0 1px var(--c); }
.nb-cell-head { display: flex; align-items: center; gap: 6px; }
.nb-cell-ic { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.nb-cell-label { flex: 1; min-width: 0; font-size: 10.5px; font-weight: 800; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nb-cell-n { font-size: 11px; font-weight: 850; color: var(--c); font-variant-numeric: tabular-nums; }
.nb-chips { display: flex; flex-wrap: wrap; gap: 5px; align-content: flex-start; overflow-y: auto; }
.nb-chip { position: relative; display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px 3px 3px; border-radius: 999px; cursor: grab; font: inherit;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.16s; }
.nb-chip:hover { border-color: var(--c); transform: translateY(-1px); }
.nb-chip:active { cursor: grabbing; }
.nb-chip.sel { border-color: var(--c); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 35%, transparent); }
.nb-chip.done { background: color-mix(in srgb, var(--c) 12%, var(--perf-surface-elevated)); }
.nb-chip-av { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; font-size: 8.5px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.nb-chip-name { font-size: 10.5px; font-weight: 650; color: var(--perf-text); max-width: 64px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nb-chip-seal { display: grid; place-items: center; width: 13px; height: 13px; border-radius: 50%; color: #fff; background: var(--perf-ok); }
.nb-chip-empty { font-size: 11px; color: var(--perf-text-dim); }
.nb-xaxis { display: grid; grid-template-columns: repeat(3, 1fr); align-items: center; margin-top: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.nb-xaxis > span { text-align: center; }
.nb-xaxis .nb-axis-cap { grid-column: 1 / -1; justify-content: center; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .nb-cell, .nb-chip { transition: none; } }
</style>
