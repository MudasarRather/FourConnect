<template>
  <!-- Incident-module pager: windowed pills + live readout + progress rail
       (the TrvPager/LedgerPager family shape; 10/page module default). -->
  <nav v-if="pages > 1" class="incp" aria-label="Pagination">
    <button class="incp-btn" :disabled="page <= 1" aria-label="Previous page" @click="go(page - 1)">
      <ChevronLeft :size="14" />
    </button>
    <div class="incp-pills">
      <template v-for="(p, i) in pills" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="incp-gap">…</span>
        <Motion v-else as="button" class="incp-pill" :class="{ on: p === page }"
          :whileHover="{ y: -1.5 }" :whileTap="{ scale: 0.92 }" @click="go(p)">
          {{ p }}
          <span v-if="p === page" class="pill-ring" aria-hidden="true" />
        </Motion>
      </template>
    </div>
    <button class="incp-btn" :disabled="page >= pages" aria-label="Next page" @click="go(page + 1)">
      <ChevronRight :size="14" />
    </button>
    <span class="incp-read sd-mono">{{ from }}–{{ to }} of {{ total }}</span>
    <span class="incp-rail" aria-hidden="true"><i :style="{ width: `${(page / pages) * 100}%` }" /></span>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  page: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 10 },
})
const emit = defineEmits(['update:page'])

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
const from = computed(() => (props.total ? (props.page - 1) * props.limit + 1 : 0))
const to = computed(() => Math.min(props.total, props.page * props.limit))
const pills = computed(() => {
  const n = pages.value, c = props.page, out = []
  const push = (v) => { if (out[out.length - 1] !== v) out.push(v) }
  push(1)
  if (c - 1 > 2) push('…')
  for (let p = Math.max(2, c - 1); p <= Math.min(n - 1, c + 1); p++) push(p)
  if (c + 1 < n - 1) push('…')
  if (n > 1) push(n)
  return out
})
const go = (p) => { if (p >= 1 && p <= pages.value && p !== props.page) emit('update:page', p) }
</script>

<style scoped>
.incp { position: relative; display: flex; align-items: center; gap: 8px; padding: 10px 14px 14px;
  flex-wrap: wrap; }
.incp-btn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px;
  cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.incp-btn:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.incp-btn:disabled { opacity: 0.35; cursor: default; }
.incp-pills { display: inline-flex; align-items: center; gap: 4px; }
.incp-pill { position: relative; min-width: 28px; height: 28px; padding: 0 8px; border-radius: 9px;
  cursor: pointer; background: transparent; border: 1px solid transparent;
  color: var(--sd-text-muted); font-size: 12px; font-weight: 700; font-family: var(--sd-mono); }
.incp-pill:hover { color: var(--sd-text); background: var(--sd-surface-elevated); }
.incp-pill.on { color: #1a1206; background: var(--sd-inc-grad); font-weight: 800; }
[data-theme="light"] .incp-pill.on { color: #fff8ec; }
.pill-ring { position: absolute; inset: -4px; border-radius: 12px; pointer-events: none;
  border: 1px solid var(--sd-inc-brd); animation: incp-ring 0.5s var(--sd-spring) both; }
@keyframes incp-ring { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.incp-gap { color: var(--sd-text-muted); font-size: 11px; padding: 0 2px; }
.incp-read { margin-left: auto; font-size: 10.5px; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.incp-rail { position: absolute; left: 14px; right: 14px; bottom: 6px; height: 2px; border-radius: 2px;
  background: var(--sd-border); overflow: hidden; }
.incp-rail i { display: block; height: 100%; border-radius: 2px; background: var(--sd-inc-grad);
  transition: width 0.4s var(--sd-spring); }
</style>
