<template>
  <div class="rd-shell" :style="{ '--i': index, '--ac': report.accent, '--soft': report.soft, '--deep': report.deep }">
    <article class="rd" ref="cardEl">
      <span class="rd-spine" />
      <span class="rd-glare" aria-hidden="true" />

      <header class="rd-top">
        <span class="rd-ico"><component :is="icon" :size="19" /></span>
        <div class="rd-head">
          <span class="rd-grp">{{ report.group }}</span>
          <h4 class="rd-name">{{ report.name }}</h4>
        </div>
        <span class="rd-tag">{{ report.icon }}</span>
      </header>

      <p class="rd-desc">{{ report.tagline }}</p>

      <div class="rd-metric">
        <div class="rd-count">
          <span class="rd-count-v"><TrvCountUp :value="count" /></span>
          <span class="rd-count-l">records</span>
        </div>
        <svg class="rd-spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
          <polygon :points="areaPoints" :fill="report.accent" opacity="0.12" />
          <polyline :points="linePoints" fill="none" :stroke="report.accent" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" />
          <circle :cx="lastPt.x" :cy="lastPt.y" r="2.6" :fill="report.accent" />
        </svg>
      </div>

      <footer class="rd-foot">
        <div class="rd-fmts">
          <Motion as="button" type="button" class="rd-fmt pdf" :disabled="!!busy"
            :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('download', report.key, 'pdf')">
            <Loader2 v-if="busy === 'pdf'" :size="12" class="spin" /><FileType2 v-else :size="12" /> PDF
          </Motion>
          <Motion as="button" type="button" class="rd-fmt" :disabled="!!busy"
            :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('download', report.key, 'excel')">
            <Loader2 v-if="busy === 'excel'" :size="12" class="spin" /><Sheet v-else :size="12" /> Excel
          </Motion>
          <Motion as="button" type="button" class="rd-fmt" :disabled="!!busy"
            :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('download', report.key, 'csv')">
            <Loader2 v-if="busy === 'csv'" :size="12" class="spin" /><FileSpreadsheet v-else :size="12" /> CSV
          </Motion>
        </div>
        <div class="rd-acts">
          <Motion as="button" type="button" class="rd-compose" :whileHover="{ y: -2, scale: 1.03 }"
            :whileTap="{ scale: 0.96 }" @click="$emit('compose', report)">
            <Wand2 :size="13" /> Compose
          </Motion>
          <button v-if="linkTab" type="button" class="rd-go" :title="`Open ${linkTab}`" @click="$emit('go', linkTab)">
            <ArrowUpRight :size="14" />
          </button>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { FileType2, Sheet, FileSpreadsheet, Wand2, ArrowUpRight, Loader2 } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { usePointerSpotlight, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  report: { type: Object, required: true },
  icon: { type: [Object, Function], default: null },
  count: { type: Number, default: 0 },
  index: { type: Number, default: 0 },
  busy: { type: String, default: '' },          // '' | 'pdf' | 'excel' | 'csv'
  linkTab: { type: String, default: '' },
})
defineEmits(['compose', 'download', 'go'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

// Deterministic sparkline shaped by the report + its record count so it reads
// as "alive" without inventing fake time-series on the backend.
const wave = computed(() => {
  const seed = (props.report.key.length * 3 + props.count) % 97 + 1
  return seededWave(seed, 16)
})
const pts = computed(() => wave.value.map((v, i) => ({
  x: (i / (wave.value.length - 1)) * 120,
  y: 30 - v * 26,
})))
const linePoints = computed(() => pts.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const areaPoints = computed(() => `0,34 ${linePoints.value} 120,34`)
const lastPt = computed(() => pts.value[pts.value.length - 1] || { x: 120, y: 16 })
</script>

<style scoped>
.rd-shell { opacity: 0; animation: trv-deal 0.55s var(--trv-spring) forwards; animation-delay: calc(var(--i) * 0.05s); }
.rd { position: relative; overflow: hidden; display: flex; flex-direction: column; height: 100%;
  padding: 16px 16px 14px 19px; border-radius: 18px; background: var(--trv-surface);
  border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
  transition: transform 0.4s var(--trv-spring), box-shadow 0.4s, border-color 0.3s; }
.rd:hover { transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 7deg)) translateY(-3px);
  box-shadow: var(--trv-shadow-hover); border-color: color-mix(in srgb, var(--ac) 40%, transparent); }
.rd-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--ac), var(--deep)); }
.rd-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.4s;
  background: radial-gradient(280px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), color-mix(in srgb, var(--ac) 16%, transparent), transparent 60%); }

.rd-top { display: flex; align-items: center; gap: 11px; }
.rd-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--ac); background: color-mix(in srgb, var(--ac) 14%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 30%, transparent); }
.rd-head { flex: 1; min-width: 0; }
.rd-grp { font-size: 9px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--ac); }
.rd-name { font-size: 14.5px; font-weight: 760; color: var(--trv-text); margin: 2px 0 0; line-height: 1.2; }
.rd-tag { font-family: var(--trv-mono); font-size: 10px; font-weight: 700; color: var(--trv-text-dim);
  padding: 3px 7px; border-radius: 6px; border: 1px solid var(--trv-border); }
.rd-desc { font-size: 12px; color: var(--trv-text-muted); margin: 11px 0 0; line-height: 1.45; flex: 1; }

.rd-metric { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 12px 0 13px; }
.rd-count { line-height: 1; }
.rd-count-v { font-size: 24px; font-weight: 850; color: var(--trv-text); font-variant-numeric: tabular-nums; }
.rd-count-l { display: block; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); margin-top: 3px; }
.rd-spark { width: 120px; height: 34px; flex-shrink: 0; }

.rd-foot { display: flex; flex-direction: column; gap: 9px; }
.rd-fmts { display: flex; gap: 6px; }
.rd-fmt { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 4px;
  border-radius: 9px; cursor: pointer; font-size: 11px; font-weight: 650; background: var(--trv-panel);
  border: 1px solid var(--trv-border); color: var(--trv-text-secondary); transition: border-color 0.2s, color 0.2s; }
.rd-fmt:hover:not(:disabled) { border-color: var(--trv-amber-border); color: var(--trv-text); }
.rd-fmt:disabled { opacity: 0.55; cursor: progress; }
.rd-fmt.pdf { color: var(--ac); }
.rd-acts { display: flex; gap: 8px; }
.rd-compose { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px;
  border-radius: 10px; cursor: pointer; font-size: 12.5px; font-weight: 750; border: 1px solid transparent;
  color: #1a1205; background: linear-gradient(135deg, var(--ac), var(--deep)); box-shadow: 0 8px 22px -10px var(--ac); }
.rd-go { display: grid; place-items: center; width: 38px; border-radius: 10px; cursor: pointer; flex-shrink: 0;
  color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); transition: all 0.2s; }
.rd-go:hover { color: var(--ac); border-color: color-mix(in srgb, var(--ac) 45%, transparent); transform: translateY(-2px); }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

[data-theme="light"] .rd-compose { color: #fff; }
[data-theme="light"] .rd-tag { color: var(--trv-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .rd-shell { animation: none; opacity: 1; }
  .rd:hover { transform: translateY(-2px); }
  .spin { animation: none; }
}
</style>
