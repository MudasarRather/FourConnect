<template>
  <Motion as="div" class="lpg"
    :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
    <!-- summary -->
    <div class="lpg-sum">
      <span class="lpg-sum-line">
        <span class="as-mono lpg-range"><AssetCountUp :value="rangeStart" /><i>–</i><AssetCountUp :value="rangeEnd" /></span>
        <span class="lpg-of">of <b class="as-mono"><AssetCountUp :value="total" /></b></span>
      </span>
      <!-- scrubber -->
      <span class="lpg-track" aria-hidden="true">
        <span class="lpg-fill" :style="{ width: fillPct }" />
        <span class="lpg-thumb" :style="{ left: fillPct }" />
      </span>
    </div>

    <!-- controls -->
    <div v-if="totalPages > 1" class="lpg-ctrl">
      <Motion as="button" type="button" class="lpg-arr" :disabled="page <= 1 || loading"
        :whileHover="(page <= 1 || loading) ? {} : { x: -2 }" :whileTap="{ scale: 0.9 }" @click="emitGo(1)" title="First page">
        <ChevronsLeft :size="15" />
      </Motion>
      <Motion as="button" type="button" class="lpg-arr" :disabled="page <= 1 || loading"
        :whileHover="(page <= 1 || loading) ? {} : { x: -2 }" :whileTap="{ scale: 0.9 }" @click="emitGo(page - 1)" title="Previous">
        <ChevronLeft :size="15" />
      </Motion>

      <div class="lpg-pills">
        <template v-for="(p, i) in pills" :key="`${p}-${i}`">
          <span v-if="p === '…'" class="lpg-gap">·· ·</span>
          <Motion v-else as="button" type="button" class="lpg-pill" :class="{ on: p === page }"
            :initial="reduced ? false : { opacity: 0, scale: 0.6 }" :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.3, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="p === page ? {} : { y: -2 }" :whileTap="{ scale: 0.92 }" @click="emitGo(p)">
            <span class="lpg-pill-n as-mono">{{ p }}</span>
            <span v-if="p === page" class="lpg-pill-glow" aria-hidden="true" />
          </Motion>
        </template>
      </div>

      <Motion as="button" type="button" class="lpg-arr" :disabled="page >= totalPages || loading"
        :whileHover="(page >= totalPages || loading) ? {} : { x: 2 }" :whileTap="{ scale: 0.9 }" @click="emitGo(page + 1)" title="Next">
        <ChevronRight :size="15" />
      </Motion>
      <Motion as="button" type="button" class="lpg-arr" :disabled="page >= totalPages || loading"
        :whileHover="(page >= totalPages || loading) ? {} : { x: 2 }" :whileTap="{ scale: 0.9 }" @click="emitGo(totalPages)" title="Last page">
        <ChevronsRight :size="15" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 10 },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:page'])
const reduced = prefersReduced()

const rangeStart = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))
const fillPct = computed(() => `${props.totalPages > 1 ? (props.page / props.totalPages) * 100 : 100}%`)

const pills = computed(() => {
  const tp = props.totalPages, p = props.page
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const out = [1]
  const start = Math.max(2, p - 1), end = Math.min(tp - 1, p + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < tp - 1) out.push('…')
  out.push(tp)
  return out
})

function emitGo(p) {
  const next = Math.min(props.totalPages, Math.max(1, p))
  if (next !== props.page && !props.loading) emit('update:page', next)
}
</script>

<style scoped>
.lpg { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 6px 4px 2px; }

.lpg-sum { display: flex; flex-direction: column; gap: 7px; min-width: 180px; }
.lpg-sum-line { display: inline-flex; align-items: baseline; gap: 7px; font-size: 12px; color: var(--as-text-muted); }
.lpg-range { font-size: 13.5px; font-weight: 800; color: var(--as-text); }
.lpg-range i { font-style: normal; color: var(--as-text-dim); margin: 0 1px; }
.lpg-of b { color: var(--as-text-secondary); font-weight: 800; }
.lpg-track { position: relative; height: 4px; width: 100%; max-width: 220px; border-radius: 999px; background: var(--as-border-soft); overflow: visible; }
.lpg-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: var(--as-grad-rail); transition: width 0.5s var(--as-spring); box-shadow: 0 0 10px -1px color-mix(in srgb, var(--as-amber) 60%, transparent); }
.lpg-thumb { position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 50%; transform: translate(-50%, -50%); background: var(--as-amber-bright);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 22%, transparent), 0 0 10px 1px var(--as-amber); transition: left 0.5s var(--as-spring); }

.lpg-ctrl { display: flex; align-items: center; gap: 6px; }
.lpg-arr { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; font: inherit; color: var(--as-text-secondary);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.lpg-arr:hover:not(:disabled) { color: var(--as-text); border-color: var(--as-border-strong); background: var(--as-surface-elevated); }
.lpg-arr:disabled { opacity: 0.35; cursor: not-allowed; }

.lpg-pills { display: flex; align-items: center; gap: 5px; margin: 0 3px; }
.lpg-gap { font-family: var(--as-mono); font-size: 12px; letter-spacing: -1px; color: var(--as-text-dim); padding: 0 2px; user-select: none; }
.lpg-pill { position: relative; overflow: hidden; display: grid; place-items: center; min-width: 32px; height: 32px; padding: 0 7px; border-radius: 10px; cursor: pointer; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.lpg-pill-n { font-size: 12.5px; font-weight: 700; color: var(--as-text-secondary); position: relative; z-index: 1; }
.lpg-pill:hover:not(.on) { border-color: color-mix(in srgb, var(--as-amber) 40%, transparent); }
.lpg-pill:hover:not(.on) .lpg-pill-n { color: var(--as-text); }
.lpg-pill.on { background: var(--hr-gradient-hero, linear-gradient(135deg, #fbbf24, #f59e0b)); border-color: transparent; box-shadow: 0 8px 20px -10px color-mix(in srgb, var(--as-amber) 80%, transparent); }
.lpg-pill.on .lpg-pill-n { color: #1a1206; font-weight: 800; }
.lpg-pill-glow { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 2.2s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .lpg-fill, .lpg-thumb { transition: none; }
  .lpg-pill-glow { animation: none; }
}
[data-theme="light"] .lpg-pill.on .lpg-pill-n { color: #2a1a06; }
</style>
