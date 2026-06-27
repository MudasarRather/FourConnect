<template>
  <div class="ccd-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="ccd" :class="{ matured, picked }" :style="{ '--tone': tone }">
      <span class="ccd-glare" aria-hidden="true" />
      <span class="ccd-spine" aria-hidden="true" />

      <div class="ccd-top">
        <div class="ccd-ring" :style="{ '--perf-p': ringDeg + 'deg' }">
          <span class="ccd-ring-glow" aria-hidden="true" />
          <span class="ccd-ring-val">{{ Math.round(progress) }}<i>%</i></span>
          <span v-if="matured" class="ccd-ring-seal"><Check :size="11" /></span>
        </div>
        <div class="ccd-id">
          <b :title="label">{{ label }}</b>
          <span>{{ cycleLabel }}</span>
        </div>
        <span class="ccd-pill" :class="statusKey">{{ statusLabel }}</span>
      </div>

      <button v-if="cycle.template_name" class="ccd-rubric" type="button" @click="$emit('rubric')" :title="`Rubric: ${cycle.template_name}`">
        <FileText :size="11" />{{ cycle.template_name }}<ArrowUpRight :size="10" />
      </button>

      <div class="ccd-stats">
        <div class="ccd-stat"><b>{{ cycle.total }}</b><span>reviews</span></div>
        <div class="ccd-stat"><b class="ok">{{ cycle.completed }}</b><span>completed</span></div>
        <div class="ccd-stat"><b :style="{ color: avgTone }">{{ cycle.avg != null ? cycle.avg.toFixed(1) : '—' }}</b><span>avg score</span></div>
      </div>

      <div class="ccd-bar"><i :style="{ width: ready ? progress + '%' : '0%' }"><span class="ccd-bar-flow" /></i></div>

      <div class="ccd-foot">
        <button class="ccd-act primary" type="button" @click="$emit('open-reviews')"><ClipboardList :size="13" /> Open reviews</button>
        <button class="ccd-act" type="button" @click="$emit('merit')" title="Merit budget for this cycle"><Coins :size="13" /></button>
        <button class="ccd-act danger" type="button" @click="$emit('retire')" title="Close or delete cycle"><Archive :size="13" /></button>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Check, FileText, ArrowUpRight, ClipboardList, Coins, Archive } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { scoreTone } from '@/composables/usePerformance'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

const props = defineProps({
  cycle: { type: Object, required: true },
  index: { type: Number, default: 0 },
  picked: { type: Boolean, default: false },
  max: { type: Number, default: 5 },
})
defineEmits(['open-reviews', 'merit', 'retire', 'rubric'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)
const ready = ref(false)
onMounted(() => { requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })) })

const progress = computed(() => Math.max(0, Math.min(100, Number(props.cycle.progress || 0))))
const ringDeg = computed(() => Math.round(progress.value / 100 * 360))
const label = computed(() => props.cycle.period_label || cycleMeta(props.cycle.cycle).label)
const cycleLabel = computed(() => cycleMeta(props.cycle.cycle).label)
const matured = computed(() => progress.value >= 100 && (props.cycle.total || 0) > 0)
const avgTone = computed(() => props.cycle.avg != null ? scoreTone(props.cycle.avg, props.max) : 'var(--perf-unset)')
const tone = computed(() => matured.value ? 'var(--perf-ok)' : (progress.value >= 50 ? 'var(--perf-gold)' : 'var(--perf-amber)'))
const statusKey = computed(() => matured.value ? 'done' : (progress.value > 0 ? 'live' : 'idle'))
const statusLabel = computed(() => matured.value ? 'Matured' : (progress.value > 0 ? 'In progress' : 'Open'))
</script>

<style scoped>
.ccd-shell { animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.ccd { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px 16px 14px; border-radius: 17px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: transform 0.28s var(--perf-spring), border-color 0.28s, box-shadow 0.28s; --mx: 0.5; --my: 0.5; --spot: 0; }
.ccd:hover { transform: perspective(1100px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--tone) 36%, var(--perf-border)); box-shadow: var(--perf-card-shadow-hover); }
.ccd.picked { border-color: color-mix(in srgb, var(--tone) 50%, transparent); }
.ccd.matured { background: linear-gradient(165deg, color-mix(in srgb, var(--perf-ok) 7%, var(--perf-surface)), var(--perf-surface)); }
.ccd-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--tone) 16%, transparent), transparent 46%); }
.ccd-spine { position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 0 3px 3px 0; background: var(--tone); }
.ccd.matured .ccd-spine { box-shadow: 0 0 10px var(--perf-ok); }

.ccd-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.ccd-ring { position: relative; width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--tone) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); }
.ccd-ring::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-surface); }
.ccd.matured .ccd-ring::after { background: color-mix(in srgb, var(--perf-ok) 7%, var(--perf-surface)); }
.ccd-ring-glow { position: absolute; inset: -4px; border-radius: 50%; pointer-events: none; opacity: 0.45; background: radial-gradient(circle, color-mix(in srgb, var(--tone) 40%, transparent), transparent 70%); filter: blur(7px); }
.ccd-ring-val { position: absolute; inset: 0; display: grid; place-items: center; font-size: 13px; font-weight: 850; color: var(--perf-text); z-index: 1; }
.ccd-ring-val i { font-size: 8px; font-style: normal; color: var(--perf-text-muted); }
.ccd-ring-seal { position: absolute; right: -2px; bottom: -2px; z-index: 2; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; color: #06281c; background: var(--perf-ok); box-shadow: 0 0 10px var(--perf-ok); }
.ccd-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ccd-id b { font-size: 14px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ccd-id span { font-size: 10.5px; color: var(--perf-text-dim); }
.ccd-pill { font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
.ccd-pill.done { color: var(--perf-ok); background: var(--perf-ok-soft); }
.ccd-pill.live { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.ccd-pill.idle { color: var(--perf-text-muted); background: var(--perf-track); }

.ccd-rubric { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer;
  padding: 4px 9px; border-radius: 8px; color: var(--perf-text-secondary); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s; max-width: 100%; overflow: hidden; }
.ccd-rubric :deep(svg:first-child) { color: var(--perf-gold); flex-shrink: 0; }
.ccd-rubric:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }

.ccd-stats { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ccd-stat { display: flex; flex-direction: column; gap: 1px; padding: 8px 10px; border-radius: 11px; background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); }
.ccd-stat b { font-size: 16px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.ccd-stat b.ok { color: var(--perf-ok); }
.ccd-stat span { font-size: 9px; font-weight: 600; color: var(--perf-text-muted); }

.ccd-bar { position: relative; z-index: 1; height: 7px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.ccd-bar i { display: block; height: 100%; border-radius: 999px; position: relative; overflow: hidden;
  background: linear-gradient(90deg, color-mix(in srgb, var(--perf-amber) 80%, transparent), var(--tone)); transition: width 1s var(--perf-spring); }
.ccd-bar-flow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: ccd-flow 2.4s linear infinite; }
@keyframes ccd-flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }

.ccd-foot { position: relative; z-index: 1; display: flex; gap: 7px; }
.ccd-act { display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
  height: 34px; padding: 0 12px; border-radius: 10px; color: var(--perf-text-secondary); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s var(--perf-spring); }
.ccd-act.primary { flex: 1; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 10%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 24%, transparent); }
.ccd-act.primary:hover { background: color-mix(in srgb, var(--perf-gold) 18%, transparent); transform: translateY(-1px); }
.ccd-act:not(.primary) { width: 34px; padding: 0; }
.ccd-act:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.ccd-act.danger:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); background: var(--perf-conflict-soft); }

@media (prefers-reduced-motion: reduce) {
  .ccd-shell { animation: none; }
  .ccd:hover { transform: translateY(-2px); }
  .ccd-bar-flow { animation: none; }
  .ccd-bar i { transition: none; }
}
</style>
