<template>
  <!-- Animated governance pager: windowed page pills with a spring-popped
       active pill + halo, prev/next + jump-to-edge, a live range read-out and
       a progress rail. Scoped to the Settings module's --set-* tokens. -->
  <div v-if="pageCount > 1" class="spg">
    <div class="spg-range">
      <ScrollText :size="13" />
      <span>Entries <b><SetCountUp :value="rangeA" /></b>–<b><SetCountUp :value="rangeB" /></b> of <b><SetCountUp :value="total" /></b></span>
    </div>

    <div class="spg-ctrl">
      <button class="spg-edge" :disabled="page <= 1" title="First" @click="go(1)"><ChevronsLeft :size="15" /></button>
      <Motion as="button" class="spg-arrow" :disabled="page <= 1"
        :whileHover="page > 1 ? { x: -2 } : {}" :whileTap="page > 1 ? { scale: 0.9 } : {}"
        title="Previous" @click="go(page - 1)"><ChevronLeft :size="16" /></Motion>

      <div class="spg-nums">
        <Presence>
          <template v-for="(n, i) in windowed" :key="typeof n === 'number' ? 'p' + n : 'g' + i">
            <span v-if="n === '…'" class="spg-gap">⋯</span>
            <Motion v-else as="button" class="spg-num" :class="{ on: n === page }"
              :initial="{ opacity: 0, y: 6, scale: 0.8 }"
              :animate="{ opacity: 1, y: 0, scale: n === page ? 1.08 : 1 }"
              :exit="{ opacity: 0, scale: 0.8 }"
              :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }"
              :whileHover="n === page ? {} : { y: -2 }" :whileTap="{ scale: 0.9 }" @click="go(n)">
              <span v-if="n === page" class="spg-halo" aria-hidden="true" />
              {{ n }}
            </Motion>
          </template>
        </Presence>
      </div>

      <Motion as="button" class="spg-arrow" :disabled="page >= pageCount"
        :whileHover="page < pageCount ? { x: 2 } : {}" :whileTap="page < pageCount ? { scale: 0.9 } : {}"
        title="Next" @click="go(page + 1)"><ChevronRight :size="16" /></Motion>
      <button class="spg-edge" :disabled="page >= pageCount" title="Last" @click="go(pageCount)"><ChevronsRight :size="15" /></button>
    </div>

    <div class="spg-rail" aria-hidden="true"><span class="spg-fill" :style="{ width: (page / pageCount * 100) + '%' }" /></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ScrollText } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'

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

const go = (n) => { const t = Math.min(props.pageCount, Math.max(1, n)); if (t !== props.page) emit('update:page', t) }
</script>

<style scoped>
.spg { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 22px; }
.spg-range { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--set-text-muted); }
.spg-range :deep(svg) { color: var(--set-gold); }
.spg-range b { color: var(--set-text); font-weight: 750; font-variant-numeric: tabular-nums; }

.spg-ctrl { display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.spg-edge, .spg-arrow { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer;
  background: transparent; border: none; color: var(--set-text-secondary); transition: background 0.2s, color 0.2s; }
.spg-edge:hover:not(:disabled), .spg-arrow:hover:not(:disabled) { background: var(--set-partial-soft); color: var(--set-gold); }
.spg-edge:disabled, .spg-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
.spg-nums { display: flex; align-items: center; gap: 3px; padding: 0 4px; }
.spg-num { position: relative; display: grid; place-items: center; min-width: 32px; height: 32px; padding: 0 6px; border-radius: 10px; cursor: pointer;
  font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; background: transparent; border: 1px solid transparent; color: var(--set-text-secondary); }
.spg-num:hover { color: var(--set-text); background: var(--set-surface); }
.spg-num.on { color: #1a1206; background: var(--set-grad-hero); box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--set-orange) 65%, transparent); border-color: transparent; }
.spg-halo { position: absolute; inset: -3px; border-radius: 13px; border: 1px solid color-mix(in srgb, var(--set-gold) 55%, transparent); animation: spg-pulse 2.2s ease-out infinite; }
@keyframes spg-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--set-gold) 45%, transparent); } 70%, 100% { box-shadow: 0 0 0 7px transparent; } }
.spg-gap { min-width: 20px; text-align: center; color: var(--set-text-dim); font-size: 13px; letter-spacing: 1px; }

.spg-rail { width: min(280px, 70%); height: 3px; border-radius: 3px; overflow: hidden; background: var(--set-trace-idle); }
.spg-fill { display: block; height: 100%; border-radius: 3px; background: var(--set-grad-hero);
  box-shadow: 0 0 10px -1px color-mix(in srgb, var(--set-gold) 60%, transparent); transition: width 0.5s var(--set-spring); }

@media (prefers-reduced-motion: reduce) { .spg-halo { animation: none; } .spg-fill { transition: none; } }
</style>
