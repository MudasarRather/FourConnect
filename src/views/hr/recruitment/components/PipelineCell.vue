<template>
  <button
    type="button"
    :class="[
      'pipe-cell',
      `stage-${stage.toLowerCase()}`,
      empty && 'is-empty',
      active && 'is-active',
      isDragOver && 'is-drag-over',
      isDragSource && 'is-drag-source',
      clickable && 'is-clickable',
    ]"
    :style="{ '--stage-color': color }"
    :draggable="draggable && !empty"
    :tabindex="empty && !clickable ? -1 : 0"
    @click="$emit('click')"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <span class="pipe-count">{{ count }}</span>
    <ChevronRight :size="11" class="pipe-arrow" />
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  stage:     { type: String, required: true },
  count:     { type: Number, default: 0 },
  positionId:{ type: String, default: '' },
  active:    { type: Boolean, default: false },     // user-current focus (gold pill)
  draggable: { type: Boolean, default: true },
  clickable: { type: Boolean, default: true },
})
const emit = defineEmits(['click', 'drag-start', 'drag-end', 'drop'])

const empty = computed(() => !props.count)

const COLORS = {
  APPLIED: '#fde68a', SCREENING: '#fbbf24', SHORTLISTED: '#f59e0b',
  INTERVIEW: '#fb923c', TECH: '#fb923c', ASSESSMENT: '#ea580c',
  SELECTED: '#ea580c', OFFER: '#f97316', ONBOARDING: '#34d399',
  JOINED: '#34d399', REJECTED: '#f87171', WITHDRAWN: '#9ca3af',
}
const color = computed(() => COLORS[props.stage] || '#9ca3af')

const isDragOver = ref(false)
const isDragSource = ref(false)

const onDragStart = (e) => {
  if (empty.value || !props.draggable) return
  isDragSource.value = true
  try {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      positionId: props.positionId,
      stage: props.stage,
      count: props.count,
    }))
    e.dataTransfer.effectAllowed = 'move'
  } catch {}
  emit('drag-start', { positionId: props.positionId, stage: props.stage })
}
const onDragEnd = () => {
  isDragSource.value = false
  emit('drag-end')
}
const onDragOver = (e) => {
  if (!props.draggable) return
  isDragOver.value = true
  e.dataTransfer.dropEffect = 'move'
}
const onDragLeave = () => { isDragOver.value = false }
const onDrop = (e) => {
  isDragOver.value = false
  let payload = {}
  try {
    payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}')
  } catch {}
  if (!payload?.stage || payload.stage === props.stage) return
  emit('drop', {
    from: payload,
    to: { positionId: props.positionId, stage: props.stage },
  })
}
</script>

<style scoped>
.pipe-cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 64px;
  padding: 7px 12px 7px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  color: var(--hr-text);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    transform 220ms var(--hr-spring),
    background 220ms var(--hr-spring),
    border-color 220ms var(--hr-spring),
    box-shadow 220ms var(--hr-spring);
  user-select: none;
}

.pipe-cell.is-clickable:not(.is-empty):hover {
  transform: translateY(-1px);
  border-color: var(--stage-color);
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 6px 16px -4px color-mix(in srgb, var(--stage-color) 40%, transparent),
              inset 0 0 0 1px color-mix(in srgb, var(--stage-color) 25%, transparent);
}

/* Empty cells: dashed outline, no count */
.pipe-cell.is-empty {
  background: transparent;
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.18);
  cursor: default;
}
.pipe-cell.is-empty .pipe-arrow { opacity: 0.2; }

/* Active "next-action" cell — gold filled */
.pipe-cell.is-active {
  background: var(--hr-gradient-rail-active);
  color: #0a0a0c;
  border-color: transparent;
  box-shadow: 0 8px 22px -6px rgba(251, 146, 60, 0.55);
}
.pipe-cell.is-active .pipe-arrow { color: #0a0a0c; }

/* Drag states */
.pipe-cell.is-drag-source { opacity: 0.4; transform: scale(0.96); }
.pipe-cell.is-drag-over {
  border-color: var(--stage-color);
  background: color-mix(in srgb, var(--stage-color) 14%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--stage-color) 22%, transparent);
  transform: scale(1.03);
}

.pipe-arrow { color: var(--hr-text-muted); transition: color 220ms; }
.pipe-cell:hover .pipe-arrow:not(.is-empty *) { color: var(--stage-color); }

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .pipe-cell {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #1a1410;
}
[data-theme="light"] .pipe-cell.is-clickable:not(.is-empty):hover {
  background: rgba(255, 244, 220, 0.85);
}
/* Empty cells: a clearly visible dashed amber outline on cream so the
   stage "slot" reads as a placeholder, with a faint amber zero. */
[data-theme="light"] .pipe-cell.is-empty {
  background: rgba(255, 250, 240, 0.40);
  border-color: rgba(217, 119, 6, 0.28);
  color: rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .pipe-cell.is-empty .pipe-arrow { color: rgba(180, 83, 9, 0.32); }
/* Active pill: the gold gradient stays vivid — match the dark-theme
   contrast model with dark text instead of white, so the yellow reads. */
[data-theme="light"] .pipe-cell.is-active {
  color: #1a1410;
  box-shadow: 0 8px 22px -6px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .pipe-cell.is-active .pipe-arrow { color: #1a1410; }
[data-theme="light"] .pipe-arrow { color: #6b5840; }
</style>
