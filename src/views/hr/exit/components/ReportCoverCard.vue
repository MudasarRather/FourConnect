<template>
  <div class="rcc-shell" :style="{ '--i': index }">
    <div ref="card" class="rcc" :class="{ focused }" @click="$emit('focus', report)">
      <ReportCoverArt :report="report" size="sm" :live="true" />
      <span class="rcc-glare" aria-hidden="true" />

      <!-- cross-link to the source tab -->
      <button v-if="sourceTab" class="rcc-go" type="button" title="Open source tab"
        @click.stop="$emit('go', { tab: sourceTab })">
        <ArrowUpRight :size="13" />
      </button>

      <!-- hover action rail -->
      <div class="rcc-actions" @click.stop>
        <Motion as="button" class="rcc-btn pdf" :disabled="busy" @click="$emit('export', { key: report.key, fmt: 'pdf' })"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" type="button"><FileText :size="13" /> PDF</Motion>
        <Motion as="button" class="rcc-btn" :disabled="busy" @click="$emit('export', { key: report.key, fmt: 'excel' })"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" type="button"><Sheet :size="13" /> Excel</Motion>
        <Motion as="button" class="rcc-btn" :disabled="busy" @click="$emit('export', { key: report.key, fmt: 'csv' })"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" type="button"><Download :size="13" /> CSV</Motion>
      </div>

      <span v-if="busy" class="rcc-busy"><Loader2 :size="15" class="spin" /></span>
      <span class="rcc-open"><Maximize2 :size="12" /> Open</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { FileText, Sheet, Download, Loader2, ArrowUpRight, Maximize2 } from 'lucide-vue-next'
import ReportCoverArt from './ReportCoverArt.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  report: { type: Object, required: true },
  index: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
  focused: { type: Boolean, default: false },
  sourceTab: { type: String, default: '' },
})
defineEmits(['focus', 'export', 'go'])
const card = ref(null)
usePointerSpotlight(card)
</script>

<style scoped>
.rcc-shell { animation: ex-deal 0.5s var(--ex-spring) both; animation-delay: calc(var(--i) * 0.05s); }
@media (prefers-reduced-motion: reduce) { .rcc-shell { animation: none; } }

.rcc { position: relative; cursor: pointer; border-radius: 18px; overflow: hidden;
  box-shadow: var(--ex-card-shadow);
  transition: transform 0.4s var(--ex-spring), box-shadow 0.4s var(--ex-spring);
  transform: perspective(1100px) rotateX(calc((var(--my,.5) - .5) * -7deg)) rotateY(calc((var(--mx,.5) - .5) * 9deg)); }
.rcc:hover { box-shadow: var(--ex-shadow-hover); transform: perspective(1100px)
  rotateX(calc((var(--my,.5) - .5) * -7deg)) rotateY(calc((var(--mx,.5) - .5) * 9deg)) translateY(-4px); }
.rcc.focused { box-shadow: 0 0 0 2px var(--ex-violet), var(--ex-shadow-hover); }

.rcc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; border-radius: inherit;
  background: radial-gradient(360px 360px at calc(var(--mx,.5) * 100%) calc(var(--my,.5) * 100%), rgba(255,255,255,0.22), transparent 60%);
  mix-blend-mode: overlay; z-index: 4; }

.rcc-go { position: absolute; top: 10px; right: 10px; z-index: 5; display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: 9px; cursor: pointer; color: #fff; background: rgba(0,0,0,0.32); border: 1px solid rgba(255,255,255,0.28);
  opacity: 0; transform: translateY(-4px); transition: all 0.25s var(--ex-spring); backdrop-filter: blur(4px); }
.rcc:hover .rcc-go { opacity: 1; transform: translateY(0); }
.rcc-go:hover { background: rgba(0,0,0,0.5); }

.rcc-actions { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; display: flex; gap: 6px; justify-content: center;
  padding: 10px; background: linear-gradient(to top, rgba(0,0,0,0.55), transparent);
  opacity: 0; transform: translateY(10px); transition: all 0.3s var(--ex-spring); }
.rcc:hover .rcc-actions { opacity: 1; transform: translateY(0); }
.rcc-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; font-size: 11px; font-weight: 700;
  cursor: pointer; color: #fff; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.28); backdrop-filter: blur(8px); }
.rcc-btn.pdf { background: rgba(255,255,255,0.92); color: #1a1208; border-color: transparent; }
.rcc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rcc-busy { position: absolute; inset: 0; z-index: 6; display: grid; place-items: center; background: rgba(0,0,0,0.32); color: #fff; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
.rcc-open { position: absolute; top: 10px; left: 50%; transform: translateX(-50%) translateY(-6px); z-index: 5;
  display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: #fff; padding: 4px 9px; border-radius: 999px; background: rgba(0,0,0,0.34); border: 1px solid rgba(255,255,255,0.24);
  opacity: 0; transition: all 0.25s var(--ex-spring); backdrop-filter: blur(4px); }
.rcc:hover .rcc-open { opacity: 1; transform: translateX(-50%) translateY(0); }
@media (prefers-reduced-motion: reduce) { .rcc, .rcc:hover { transform: none; } }
</style>
