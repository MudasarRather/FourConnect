<template>
  <div class="rib">
    <header class="rib-head">
      <div>
        <span class="rib-eyebrow"><History :size="13" /> Ledger ribbon</span>
        <h3 class="rib-title">Every statement, scrub to mint</h3>
      </div>
      <div class="rib-nav">
        <button class="rnav" @click="scrollBy(-1)" aria-label="Earlier"><ChevronLeft :size="16" /></button>
        <button class="rnav" @click="scrollBy(1)" aria-label="Later"><ChevronRight :size="16" /></button>
      </div>
    </header>

    <div class="rib-track" ref="trackEl">
      <Motion
        v-for="(p, i) in items" :key="p.id" as="button"
        class="chip" :class="[statusMeta(p.status).pillClass, { on: String(p.id) === String(selectedId) }]"
        :ref="el => setChipRef(el, p.id)"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -5 }"
        :while-tap="{ scale: 0.97 }"
        @click="$emit('select', p.id)"
      >
        <span class="chip-glow" aria-hidden="true"></span>
        <span class="chip-top">
          <span class="chip-mon">{{ monthLabel(p.period_month).slice(0, 3) }}</span>
          <span class="chip-yr">'{{ String(p.period_year).slice(2) }}</span>
        </span>
        <PayMoneyValue class="chip-net" :value="Number(p.net_pay || 0)" short tone="net" :animate="false" />
        <span class="chip-bar"><i :style="{ '--h': barH(p) + '%' }"></i></span>
        <span class="pay-chip chip-status" :class="statusMeta(p.status).pillClass">
          <span class="chip-dot"></span>{{ statusMeta(p.status).label }}
        </span>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { History, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import PayMoneyValue from '../payroll/components/PayMoneyValue.vue'
import { monthLabel, statusMeta } from '@/composables/usePayroll'

const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: null },
})
defineEmits(['select'])

const trackEl = ref(null)
const chipEls = ref({})
const setChipRef = (el, id) => { if (el) chipEls.value[id] = el.$el || el }

const maxNet = computed(() => Math.max(1, ...props.items.map(p => Number(p.net_pay || 0))))
const barH = (p) => Math.max(8, Math.round((Number(p.net_pay || 0) / maxNet.value) * 100))

const scrollBy = (dir) => { trackEl.value?.scrollBy({ left: dir * 300, behavior: 'smooth' }) }

const centerSelected = async () => {
  await nextTick()
  const el = chipEls.value[props.selectedId]
  el?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' })
}
watch(() => props.selectedId, centerSelected)
onMounted(centerSelected)
</script>

<style scoped>
.rib { background: var(--pay-surface); border: 1px solid var(--pay-border); border-radius: 20px; padding: 18px 18px 20px; }
.rib-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.rib-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--pay-treasury); }
.rib-title { margin: 4px 0 0; font-size: 16px; font-weight: 800; color: var(--pay-text); letter-spacing: -0.01em; }
.rib-nav { display: flex; gap: 8px; }
.rnav { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; cursor: pointer;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); transition: color 0.18s, border-color 0.18s, transform 0.18s var(--pay-spring); }
.rnav:hover { color: var(--pay-treasury); border-color: var(--pay-border); transform: translateY(-1px); }

.rib-track { display: flex; gap: 12px; overflow-x: auto; padding: 6px 2px 10px; scroll-snap-type: x proximity; scrollbar-width: thin; }
.rib-track::-webkit-scrollbar { height: 6px; }
.rib-track::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 999px; }

.chip { position: relative; flex: 0 0 132px; scroll-snap-align: center; cursor: pointer; text-align: left;
  display: flex; flex-direction: column; gap: 8px; padding: 14px 14px 12px; border-radius: 15px; overflow: hidden;
  background: linear-gradient(160deg, rgba(255,255,255,0.05), transparent 60%), var(--pay-surface-2);
  border: 1px solid var(--pay-border-soft); color: var(--pay-text);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
.chip-glow { position: absolute; inset: 0; border-radius: 15px; pointer-events: none; opacity: 0; transition: opacity 0.3s; }
.chip.on { border-color: var(--pay-mint); box-shadow: 0 0 0 1px var(--pay-mint), 0 16px 34px -20px var(--pay-mint); transform: translateY(-2px); }
.chip.on .chip-glow { opacity: 1; animation: pay-node-halo 2s ease-out infinite; }

.chip-top { display: flex; align-items: baseline; gap: 4px; }
.chip-mon { font-size: 16px; font-weight: 900; letter-spacing: -0.01em; color: var(--pay-text); }
.chip-yr { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.chip-net { font-size: 15px; }
.chip-bar { display: block; height: 30px; display: flex; align-items: flex-end; }
.chip-bar i { display: block; width: 100%; height: var(--h); border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, var(--pay-net), rgba(52,211,153,0.15)); transform-origin: bottom;
  animation: pay-bar-grow 0.7s var(--pay-ease) 0.2s both; }
.chip-status { align-self: flex-start; font-size: 9.5px !important; padding: 2px 8px !important; }

[data-theme="light"] .chip { background: linear-gradient(160deg, rgba(184,134,11,0.06), transparent 60%), #fffdf7; }
[data-theme="light"] .rnav { background: #fffdf7; }

@media (prefers-reduced-motion: reduce) {
  .chip-bar i, .chip.on .chip-glow { animation: none !important; }
}
</style>
