<template>
  <!-- Ultra-modern desk pager: windowed page pills with a morphing gradient active state,
       magnetic prev/next orbs, a live range readout, and a progress rail whose glowing
       comet tracks the current page. Hidden entirely for a single page. -->
  <Motion v-if="pages > 1" as="nav" class="sdp" :style="{ '--ac': accent }" aria-label="Pagination"
    :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">

    <!-- range readout + progress rail -->
    <div class="sdp-meta">
      <span class="sdp-range sd-mono" :key="page">
        <b>{{ from }}–{{ to }}</b><i>of</i><b>{{ total }}</b>
      </span>
      <span class="sdp-rail" aria-hidden="true">
        <i class="sdp-fill" :style="{ width: pct + '%' }" />
        <em class="sdp-comet" :style="{ left: `calc(${pct}% - 4px)` }" />
      </span>
      <span class="sdp-pageline sd-mono">PAGE {{ page }} / {{ pages }}</span>
    </div>

    <!-- controls -->
    <div class="sdp-ctrl">
      <Motion as="button" type="button" class="sdp-nav" :disabled="page <= 1" aria-label="Previous page"
        :while-hover="page > 1 ? { x: -2, scale: 1.06 } : {}" :while-tap="page > 1 ? { scale: 0.92 } : {}"
        @click="page > 1 && $emit('go', page - 1)">
        <ChevronLeft :size="15" />
      </Motion>

      <div class="sdp-pills">
        <template v-for="(it, i) in items" :key="it.gap ? 'g' + i : 'p' + it.n">
          <span v-if="it.gap" class="sdp-gap sd-mono">···</span>
          <Motion v-else as="button" type="button" class="sdp-pill" :class="{ on: it.n === page }"
            :aria-current="it.n === page ? 'page' : undefined"
            :initial="{ opacity: 0, y: 8, scale: 0.9 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.35, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }"
            :while-hover="it.n !== page ? { y: -2 } : {}" :while-tap="{ scale: 0.92 }"
            @click="it.n !== page && $emit('go', it.n)">
            <span class="sdp-pill-glow" aria-hidden="true" />
            <span class="sdp-pill-n" :key="it.n === page ? 'on' + it.n : 'off' + it.n">{{ it.n }}</span>
          </Motion>
        </template>
      </div>

      <Motion as="button" type="button" class="sdp-nav" :disabled="page >= pages" aria-label="Next page"
        :while-hover="page < pages ? { x: 2, scale: 1.06 } : {}" :while-tap="page < pages ? { scale: 0.92 } : {}"
        @click="page < pages && $emit('go', page + 1)">
        <ChevronRight :size="15" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  page: { type: Number, default: 1 },
  pages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  limit: { type: Number, default: 10 },
  accent: { type: String, default: 'var(--sd-amber)' },
})
defineEmits(['go'])

const from = computed(() => (props.total ? (props.page - 1) * props.limit + 1 : 0))
const to = computed(() => Math.min(props.page * props.limit, props.total))
const pct = computed(() => (props.pages > 1 ? Math.round(((props.page - 1) / (props.pages - 1)) * 100) : 100))

/* windowed pills: 1 … (page−1 page page+1) … last — always ≤ 7 slots */
const items = computed(() => {
  const p = props.page, n = props.pages
  if (n <= 7) return Array.from({ length: n }, (_, i) => ({ n: i + 1 }))
  const out = [{ n: 1 }]
  const lo = Math.max(2, p - 1), hi = Math.min(n - 1, p + 1)
  if (lo > 2) out.push({ gap: true })
  for (let i = lo; i <= hi; i++) out.push({ n: i })
  if (hi < n - 1) out.push({ gap: true })
  out.push({ n })
  return out
})
</script>

<style scoped>
.sdp { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 20px;
  padding: 12px 16px; border-radius: 16px; background: var(--sd-surface); border: 1px solid var(--sd-border); }

/* meta: range + rail + page line */
.sdp-meta { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
.sdp-range { display: inline-flex; align-items: baseline; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted);
  animation: sdp-pop 0.4s var(--sd-spring); white-space: nowrap; }
.sdp-range b { color: var(--sd-text); font-weight: 800; }
.sdp-range i { font-style: normal; font-size: 10.5px; color: var(--sd-text-dim); }
.sdp-rail { position: relative; flex: 1; max-width: 220px; height: 4px; border-radius: 999px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); overflow: visible; }
.sdp-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ac) 40%, transparent), var(--ac));
  transition: width 0.55s cubic-bezier(0.16, 1, 0.3, 1); }
.sdp-comet { position: absolute; top: 50%; width: 8px; height: 8px; margin-top: -4px; border-radius: 50%;
  background: var(--ac); box-shadow: 0 0 10px var(--ac), 0 0 22px color-mix(in srgb, var(--ac) 55%, transparent);
  transition: left 0.55s cubic-bezier(0.16, 1, 0.3, 1); animation: sdp-breathe 1.8s ease-in-out infinite; }
.sdp-pageline { font-size: 9.5px; letter-spacing: 0.14em; color: var(--sd-text-dim); white-space: nowrap; }

/* controls */
.sdp-ctrl { display: flex; align-items: center; gap: 8px; }
.sdp-nav { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 11px; cursor: pointer;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, color 0.2s, box-shadow 0.25s var(--sd-spring); }
.sdp-nav:hover:not(:disabled) { color: var(--ac); border-color: color-mix(in srgb, var(--ac) 45%, transparent);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2); }
.sdp-nav:disabled { opacity: 0.35; cursor: default; }

.sdp-pills { display: flex; align-items: center; gap: 5px; }
.sdp-gap { font-size: 10px; color: var(--sd-text-dim); padding: 0 3px; letter-spacing: 0.1em; }
.sdp-pill { position: relative; min-width: 32px; height: 32px; padding: 0 6px; border-radius: 11px; cursor: pointer;
  display: grid; place-items: center; overflow: hidden; font-family: var(--sd-mono); font-size: 12px; font-weight: 700;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  transition: border-color 0.2s, color 0.2s, background 0.25s, box-shadow 0.3s var(--sd-spring); }
.sdp-pill:hover:not(.on) { color: var(--sd-text); border-color: color-mix(in srgb, var(--ac) 40%, transparent); }
.sdp-pill.on { color: var(--pulse-ink, #2a1a05); border-color: transparent; cursor: default;
  background: linear-gradient(135deg, color-mix(in srgb, var(--ac) 78%, #fff 10%), var(--ac));
  box-shadow: 0 6px 18px color-mix(in srgb, var(--ac) 45%, transparent); }
[data-theme="light"] .sdp-pill.on { color: #fff8ec; }
.sdp-pill-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(80% 80% at 50% 0%, rgba(255, 255, 255, 0.45), transparent 60%); transition: opacity 0.3s; }
.sdp-pill.on .sdp-pill-glow { opacity: 1; }
.sdp-pill-n { position: relative; animation: sdp-pop 0.35s var(--sd-spring); }

@keyframes sdp-pop { 0% { opacity: 0; transform: translateY(4px) scale(0.8); } 100% { opacity: 1; transform: none; } }
@keyframes sdp-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.35); } }

@media (max-width: 640px) { .sdp { flex-direction: column; align-items: stretch; } .sdp-ctrl { justify-content: center; } .sdp-rail { max-width: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sdp-comet { animation: none; }
  html:not([data-cinematic="on"]) .sdp-range, html:not([data-cinematic="on"]) .sdp-pill-n { animation: none; }
}
</style>
