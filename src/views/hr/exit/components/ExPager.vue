<template>
  <!-- Ultra-modern animated pager: windowed page pills with a spring-popped
       active pill + pulse ring, prev/next + jump-to-edge, a live range read-out
       and a progress rail. Reusable across the exit module (10 records/page). -->
  <div v-if="totalPages > 1" class="exg">
    <div class="exg-range">
      <span class="exg-pip" aria-hidden="true" />
      <span>Showing <b><ExCountUp :value="rangeA" /></b>–<b><ExCountUp :value="rangeB" /></b> of <b><ExCountUp :value="total" /></b></span>
    </div>

    <div class="exg-ctrl">
      <button class="exg-edge" :disabled="page <= 1" title="First" type="button" @click="go(1)"><ChevronsLeft :size="15" /></button>
      <Motion as="button" class="exg-arrow" :disabled="page <= 1" :whileHover="page > 1 ? { x: -2 } : {}" :whileTap="page > 1 ? { scale: 0.9 } : {}" title="Previous" type="button" @click="go(page - 1)"><ChevronLeft :size="16" /></Motion>

      <div class="exg-nums">
        <Presence>
          <template v-for="(n, i) in windowed" :key="typeof n === 'number' ? 'p' + n : 'g' + i">
            <span v-if="n === '…'" class="exg-gap">⋯</span>
            <Motion v-else as="button" class="exg-num" :class="{ on: n === page }"
              :initial="{ opacity: 0, y: 6, scale: 0.8 }" :animate="{ opacity: 1, y: 0, scale: n === page ? 1.08 : 1 }"
              :exit="{ opacity: 0, scale: 0.8 }" :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="n === page ? {} : { y: -2 }" :whileTap="{ scale: 0.9 }" type="button" @click="go(n)">
              <span v-if="n === page" class="exg-glow" aria-hidden="true" />
              {{ n }}
            </Motion>
          </template>
        </Presence>
      </div>

      <Motion as="button" class="exg-arrow" :disabled="page >= totalPages" :whileHover="page < totalPages ? { x: 2 } : {}" :whileTap="page < totalPages ? { scale: 0.9 } : {}" title="Next" type="button" @click="go(page + 1)"><ChevronRight :size="16" /></Motion>
      <button class="exg-edge" :disabled="page >= totalPages" title="Last" type="button" @click="go(totalPages)"><ChevronsRight :size="15" /></button>
    </div>

    <div class="exg-rail" aria-hidden="true"><span class="exg-fill" :style="{ width: (page / totalPages * 100) + '%' }" /></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 10 },
})
const emit = defineEmits(['update:page'])

const rangeA = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1))
const rangeB = computed(() => Math.min(props.page * props.limit, props.total))

const windowed = computed(() => {
  const c = props.totalPages, p = props.page
  if (c <= 7) return Array.from({ length: c }, (_, i) => i + 1)
  const out = [1]
  const lo = Math.max(2, p - 1), hi = Math.min(c - 1, p + 1)
  if (lo > 2) out.push('…')
  for (let i = lo; i <= hi; i++) out.push(i)
  if (hi < c - 1) out.push('…')
  out.push(c)
  return out
})
const go = (n) => { const t = Math.min(props.totalPages, Math.max(1, n)); if (t !== props.page) emit('update:page', t) }
</script>

<style scoped>
.exg { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 22px; }
.exg-range { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--ex-text-muted); }
.exg-pip { width: 7px; height: 7px; border-radius: 50%; background: var(--ex-violet); box-shadow: 0 0 8px var(--ex-violet); animation: exg-blink 2.4s ease-in-out infinite; }
.exg-range b { color: var(--ex-text); font-weight: 750; font-variant-numeric: tabular-nums; }

.exg-ctrl { display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 15px; background: var(--ex-panel); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.exg-edge, .exg-arrow { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; background: transparent; border: none; color: var(--ex-text-secondary); transition: background 0.2s, color 0.2s; }
.exg-edge:hover:not(:disabled), .exg-arrow:hover:not(:disabled) { background: var(--ex-violet-soft); color: var(--ex-violet); }
.exg-edge:disabled, .exg-arrow:disabled { opacity: 0.32; cursor: not-allowed; }
.exg-nums { display: flex; align-items: center; gap: 3px; padding: 0 4px; }
.exg-num { position: relative; display: grid; place-items: center; min-width: 32px; height: 32px; padding: 0 6px; border-radius: 10px; cursor: pointer;
  font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; background: transparent; border: 1px solid transparent; color: var(--ex-text-secondary); }
.exg-num:hover { color: var(--ex-text); background: var(--ex-surface); }
.exg-num.on { color: #1a1206; background: var(--ex-grad-hero); box-shadow: var(--ex-violet-glow); }
.exg-glow { position: absolute; inset: -3px; border-radius: 13px; border: 1px solid var(--ex-violet-border); animation: exg-pulse 2.2s ease-out infinite; }
.exg-gap { min-width: 20px; text-align: center; color: var(--ex-text-dim); font-size: 13px; letter-spacing: 1px; }

.exg-rail { width: min(300px, 72%); height: 3px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--ex-text) 9%, transparent); }
.exg-fill { display: block; height: 100%; border-radius: 3px; background: var(--ex-grad-hero); box-shadow: 0 0 10px -1px color-mix(in srgb, var(--ex-amber) 60%, transparent); transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes exg-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ex-amber) 45%, transparent); } 70%, 100% { box-shadow: 0 0 0 7px transparent; } }
@keyframes exg-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@media (prefers-reduced-motion: reduce) { .exg-glow, .exg-pip { animation: none; } .exg-fill { transition: none; } }
</style>
