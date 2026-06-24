<template>
  <div class="forge" :class="`st-${status.toLowerCase()}`">
    <svg viewBox="0 0 140 140" class="forge-svg" role="img" aria-label="Document seal">
      <circle cx="70" cy="70" r="58" class="forge-track" />
      <circle cx="70" cy="70" r="58" class="forge-ring" :style="{ '--p': progress + '%' }" pathLength="100" />
      <g class="forge-seal" :class="{ pressed: status !== 'NOT_GENERATED' }">
        <circle cx="70" cy="70" r="40" class="seal-wax" />
        <circle cx="70" cy="70" r="33" class="seal-inner" />
        <component :is="icon" :size="30" class="seal-glyph" x="55" y="55" />
      </g>
    </svg>
    <div class="forge-cap">
      <span class="fc-state" :style="{ color: hex }">{{ label }}</span>
      <span class="fc-sub">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FileClock, FileCheck2, BadgeCheck, FileX2 } from 'lucide-vue-next'
import { letterStatusMeta } from '@/composables/useExit'

const props = defineProps({
  status: { type: String, default: 'NOT_GENERATED' },
  caption: { type: String, default: '' },
})
const meta = computed(() => letterStatusMeta(props.status))
const label = computed(() => meta.value.label)
const hex = computed(() => meta.value.hex)
const progress = computed(() => ({ NOT_GENERATED: 12, GENERATED: 60, ISSUED: 100, REVOKED: 100 }[props.status] || 0))
const icon = computed(() => ({ NOT_GENERATED: FileClock, GENERATED: FileCheck2, ISSUED: BadgeCheck, REVOKED: FileX2 }[props.status] || FileClock))
</script>

<style scoped>
.forge { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.forge-svg { width: 150px; height: 150px; }
.forge-track { fill: none; stroke: var(--ex-steel-soft); stroke-width: 4; }
.forge-ring { fill: none; stroke: var(--ex-violet); stroke-width: 4; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 70px 70px;
  stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--p, 0)); transition: stroke-dashoffset 1s var(--ex-spring); filter: drop-shadow(0 0 5px var(--ex-violet)); }
.st-issued .forge-ring { stroke: var(--ex-cleared); filter: drop-shadow(0 0 6px var(--ex-cleared)); }
.st-revoked .forge-ring { stroke: var(--ex-blocked); }
.forge-seal { transform-origin: 70px 70px; transform: scale(0.7); opacity: 0.4; transition: transform 0.6s var(--ex-spring), opacity 0.6s; }
.forge-seal.pressed { transform: scale(1); opacity: 1; }
.seal-wax { fill: var(--ex-violet-soft); stroke: var(--ex-violet-border); stroke-width: 1.5; }
.st-issued .seal-wax { fill: var(--ex-cleared-soft); stroke: color-mix(in srgb,var(--ex-cleared) 30%, transparent); }
.seal-inner { fill: none; stroke: var(--ex-violet); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.5; }
.seal-glyph { color: var(--ex-violet); }
.st-issued .seal-glyph { color: var(--ex-cleared); }
.st-revoked .seal-glyph { color: var(--ex-blocked); }
.forge-cap { display: flex; flex-direction: column; align-items: center; }
.fc-state { font-size: 14px; font-weight: 800; }
.fc-sub { font-size: 11px; color: var(--ex-text-muted); }
@media (prefers-reduced-motion: reduce) { .forge-ring, .forge-seal { transition: none; } }
</style>
