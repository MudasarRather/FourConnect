<template>
  <!-- Ultra-modern animated pager: windowed page pills with a spring-popped
       active pill, prev/next + jump-to-edge, a live range read-out and a
       progress rail. Reusable across the travel module. -->
  <div v-if="pageCount > 1" class="pgr">
    <div class="pgr-range">
      <CassetteTape :size="13" />
      <span>Frame <b><TrvCountUp :value="rangeA" /></b>–<b><TrvCountUp :value="rangeB" /></b> of <b><TrvCountUp :value="total" /></b></span>
    </div>

    <div class="pgr-ctrl">
      <button class="pgr-edge" :disabled="page <= 1" title="First" @click="emitGo(1)"><ChevronsLeft :size="15" /></button>
      <Motion as="button" class="pgr-arrow" :disabled="page <= 1" :whileHover="page > 1 ? { x: -2 } : {}" :whileTap="page > 1 ? { scale: 0.92 } : {}" title="Previous" @click="emitGo(page - 1)"><ChevronLeft :size="16" /></Motion>

      <div class="pgr-nums">
        <Presence>
          <template v-for="(n, i) in windowed" :key="typeof n === 'number' ? 'p' + n : 'g' + i">
            <span v-if="n === '…'" class="pgr-gap">⋯</span>
            <Motion v-else as="button" class="pgr-num" :class="{ on: n === page }"
              :initial="{ opacity: 0, y: 6, scale: 0.8 }" :animate="{ opacity: 1, y: 0, scale: n === page ? 1.08 : 1 }"
              :exit="{ opacity: 0, scale: 0.8 }" :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="n === page ? {} : { y: -2 }" :whileTap="{ scale: 0.9 }" @click="emitGo(n)">
              <span v-if="n === page" class="pgr-num-glow" aria-hidden="true" />
              {{ n }}
            </Motion>
          </template>
        </Presence>
      </div>

      <Motion as="button" class="pgr-arrow" :disabled="page >= pageCount" :whileHover="page < pageCount ? { x: 2 } : {}" :whileTap="page < pageCount ? { scale: 0.92 } : {}" title="Next" @click="emitGo(page + 1)"><ChevronRight :size="16" /></Motion>
      <button class="pgr-edge" :disabled="page >= pageCount" title="Last" @click="emitGo(pageCount)"><ChevronsRight :size="15" /></button>
    </div>

    <div class="pgr-rail" aria-hidden="true"><span class="pgr-fill" :style="{ width: (page / pageCount * 100) + '%' }" /></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CassetteTape } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 10 },
})
const emit = defineEmits(['update:page'])

const rangeA = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.limit + 1)
const rangeB = computed(() => Math.min(props.page * props.limit, props.total))

const windowed = computed(() => {
  const c = props.pageCount, p = props.page
  if (c <= 7) return Array.from({ length: c }, (_, i) => i + 1)
  const out = [1]
  const lo = Math.max(2, p - 1), hi = Math.min(c - 1, p + 1)
  if (lo > 2) out.push('…')
  for (let i = lo; i <= hi; i++) out.push(i)
  if (hi < c - 1) out.push('…')
  out.push(c)
  return out
})

const emitGo = (n) => { const t = Math.min(props.pageCount, Math.max(1, n)); if (t !== props.page) emit('update:page', t) }
</script>

<style scoped>
.pgr { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 22px; }
.pgr-range { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--trv-text-muted); }
.pgr-range :deep(svg) { color: var(--trv-amber); }
.pgr-range b { color: var(--trv-text); font-weight: 750; font-variant-numeric: tabular-nums; }

.pgr-ctrl { display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.pgr-edge, .pgr-arrow { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; background: transparent; border: none; color: var(--trv-text-secondary); transition: background 0.2s, color 0.2s; }
.pgr-edge:hover:not(:disabled), .pgr-arrow:hover:not(:disabled) { background: var(--trv-amber-soft); color: var(--trv-amber); }
.pgr-edge:disabled, .pgr-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
.pgr-nums { display: flex; align-items: center; gap: 3px; padding: 0 4px; }
.pgr-num { position: relative; display: grid; place-items: center; min-width: 32px; height: 32px; padding: 0 6px; border-radius: 10px; cursor: pointer;
  font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; background: transparent; border: 1px solid transparent; color: var(--trv-text-secondary); }
.pgr-num:hover { color: var(--trv-text); background: var(--trv-surface); }
.pgr-num.on { color: #1a1205; background: var(--trv-grad-hero); box-shadow: var(--trv-amber-glow); }
.pgr-num-glow { position: absolute; inset: -3px; border-radius: 13px; border: 1px solid var(--trv-amber-border); animation: pgr-pulse 2.2s ease-out infinite; }
@keyframes pgr-pulse { 0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.45); } 70%, 100% { box-shadow: 0 0 0 7px rgba(251,191,36,0); } }
.pgr-gap { min-width: 20px; text-align: center; color: var(--trv-text-dim); font-size: 13px; letter-spacing: 1px; }

.pgr-rail { width: min(280px, 70%); height: 3px; border-radius: 3px; overflow: hidden; background: var(--trv-steel-soft); }
.pgr-fill { display: block; height: 100%; border-radius: 3px; background: var(--trv-grad-hero); box-shadow: 0 0 10px -1px rgba(251,191,36,0.6); transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }

@media (prefers-reduced-motion: reduce) { .pgr-num-glow { animation: none; } .pgr-fill { transition: none; } }
</style>
