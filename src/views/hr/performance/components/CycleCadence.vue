<template>
  <!-- ═══════════════════ THE CADENCE DECK · Cycle maturation timeline ═══════════════════
       Each review cycle is a LANE on a shared 0→100% maturation track. A progress comet
       rides each lane, the filled run flows amber→gold→emerald as the cohort matures, and
       a maturation seal fires when a cycle hits 100%. A NOW playhead sweeps the deck.
       Unique within Performance (vs the dashboard orrery, insights bell-curve, merit
       oscilloscope, reviews flux-pipeline). Continuous motion, parallax, dark+light, a11y. -->
  <div ref="rootEl" class="cc" :class="{ ready }">
    <span class="cc-floor" aria-hidden="true" />
    <span class="cc-aura" aria-hidden="true" />
    <div class="cc-motes" aria-hidden="true">
      <span v-for="m in motes" :key="m.i" class="cc-mote" :style="{ left: m.x + '%', top: m.y + '%', '--d': m.d + 's', '--dl': m.dl + 's', '--sz': m.sz + 'px' }" />
    </div>
    <span class="cc-playhead" aria-hidden="true"><i /></span>

    <div class="cc-head">
      <span class="cc-head-k"><Activity :size="12" /> Maturation cadence</span>
      <span class="cc-axis"><i>launched</i><b>0%</b><span class="cc-axis-line" /><b>matured</b><i>100%</i></span>
    </div>

    <div class="cc-lanes">
      <button v-for="(c, i) in lanes" :key="c.key" class="cc-lane" :class="{ matured: c.matured, picked: c.key === activeKey }"
        :style="{ '--i': i, '--tone': c.tone, '--p': c.progress + '%' }" type="button" @click="$emit('pick', c.raw)" :title="`${c.label} — ${Math.round(c.progress)}% complete`">
        <span class="cc-lane-spine" />
        <div class="cc-lane-id">
          <b>{{ c.label }}</b>
          <span><component :is="CalendarRange" :size="10" />{{ c.cycleLabel }}{{ c.started ? ' · ' + c.started : '' }}</span>
        </div>
        <div class="cc-track">
          <div class="cc-ticks">
            <span v-for="t in c.ticks" :key="t" class="cc-tick" :class="{ lit: t <= c.litTicks }" :style="{ '--ti': t }" />
          </div>
          <div class="cc-fill" :style="{ width: ready ? c.progress + '%' : '0%' }"><span class="cc-fill-flow" /></div>
          <span class="cc-comet" :style="{ left: ready ? c.progress + '%' : '0%' }"><i /></span>
          <span v-if="c.matured" class="cc-seal"><Check :size="11" /></span>
        </div>
        <div class="cc-lane-meta">
          <span class="cc-count">{{ c.completed }}<i>/{{ c.total }}</i></span>
          <span class="cc-avg" :style="{ '--ac': c.avgTone }">{{ c.avg != null ? c.avg.toFixed(1) : '—' }}<i>avg</i></span>
        </div>
      </button>
      <div v-if="overflow > 0" class="cc-overflow">+{{ overflow }} more cycle{{ overflow === 1 ? '' : 's' }} below</div>
    </div>

    <!-- HUD -->
    <div class="cc-hud">
      <div class="cc-hud-cell"><span><Layers :size="11" /> Cycles</span><b><SetCountUp :value="total" /></b></div>
      <div class="cc-hud-cell"><span><Loader :size="11" /> In progress</span><b><SetCountUp :value="inProgress" /></b></div>
      <div class="cc-hud-cell"><span><BadgeCheck :size="11" /> Matured</span><b><SetCountUp :value="matured" /></b></div>
      <div class="cc-hud-cell"><span><Gauge :size="11" /> Avg done</span><b><SetCountUp :value="avgDone" :decimals="0" suffix="%" /></b></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Activity, CalendarRange, Check, Layers, Loader, BadgeCheck, Gauge } from 'lucide-vue-next'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { scoreTone } from '@/composables/usePerformance'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

const props = defineProps({
  cycles: { type: Array, default: () => [] },
  activeKey: { type: String, default: null },
  max: { type: Number, default: 5 },
  limit: { type: Number, default: 6 },
})
defineEmits(['pick', 'go'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const ready = ref(false)
onMounted(() => { requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })) })

const cycleKey = (c) => `${c.cycle || ''}::${c.period_label || ''}`
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) } catch { return '' } }

const sorted = computed(() => [...props.cycles].sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0)))
const lanes = computed(() => sorted.value.slice(0, props.limit).map((c, i) => {
  const progress = Math.max(0, Math.min(100, Number(c.progress || 0)))
  const total = c.total || 0
  const ticks = Math.min(24, Math.max(6, total))
  return {
    raw: c, key: cycleKey(c), i,
    label: c.period_label || cycleMeta(c.cycle).label,
    cycleLabel: cycleMeta(c.cycle).label,
    started: c.started_at ? fmtDate(c.started_at) : '',
    progress, total, completed: c.completed || 0, avg: c.avg ?? null,
    ticks, litTicks: Math.round((c.completed || 0) / Math.max(1, total) * ticks),
    matured: progress >= 100 && total > 0,
    tone: progress >= 100 ? 'var(--perf-ok)' : (progress >= 50 ? 'var(--perf-gold)' : 'var(--perf-amber)'),
    avgTone: c.avg != null ? scoreTone(c.avg, props.max) : 'var(--perf-unset)',
  }
}))
const overflow = computed(() => Math.max(0, props.cycles.length - props.limit))

const total = computed(() => props.cycles.length)
const matured = computed(() => props.cycles.filter(c => Number(c.progress || 0) >= 100 && (c.total || 0) > 0).length)
const inProgress = computed(() => total.value - matured.value)
const avgDone = computed(() => total.value ? Math.round(props.cycles.reduce((a, c) => a + Number(c.progress || 0), 0) / total.value) : 0)

const seed = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1
const motes = Array.from({ length: 18 }, (_, i) => ({
  i, x: Math.round(seed(i * 3.1) * 100), y: Math.round(seed(i * 5.7) * 100),
  d: (5 + seed(i * 2.3) * 6).toFixed(1), dl: (seed(i * 8.9) * 6).toFixed(1), sz: 1 + Math.round(seed(i) * 2),
}))
</script>

<style scoped>
.cc { position: relative; overflow: hidden; padding: 16px 18px; border-radius: 20px;
  background: radial-gradient(120% 130% at 100% 0%, color-mix(in srgb, var(--perf-gold) 11%, transparent), transparent 58%), var(--perf-panel);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.cc-floor { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 11.11% 100%; mask-image: linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent);
  transform: translateX(calc((var(--mx, 0.5) - 0.5) * -14px)); }
.cc-aura { position: absolute; inset: -40% -10% auto 30%; height: 110%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 14%, transparent), transparent 70%); filter: blur(46px);
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 20px), calc((var(--my, 0.5) - 0.5) * 14px)); }
.cc-motes { position: absolute; inset: 0; z-index: 1; pointer-events: none; transform: translate(calc((var(--mx, 0.5) - 0.5) * 24px), calc((var(--my, 0.5) - 0.5) * 18px)); }
.cc-mote { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 6px var(--perf-gold); opacity: 0; animation: cc-mote var(--d) ease-in-out var(--dl) infinite; }
@keyframes cc-mote { 0%, 100% { opacity: 0; transform: translateY(6px); } 50% { opacity: 0.55; transform: translateY(-8px); } }
.cc-playhead { position: absolute; top: 56px; bottom: 70px; left: 0; z-index: 4; width: 2px; pointer-events: none;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--perf-gold) 60%, transparent), transparent); animation: cc-sweep 7s ease-in-out infinite; }
.cc-playhead i { position: absolute; top: -4px; left: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 12px var(--perf-gold); }
@keyframes cc-sweep { 0%, 100% { left: 24%; opacity: 0; } 10% { opacity: 1; } 50% { left: 84%; opacity: 1; } 90% { opacity: 1; } }

.cc-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.cc-head-k { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-text-secondary); }
.cc-head-k :deep(svg) { color: var(--perf-gold); }
.cc-axis { display: inline-flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 700; color: var(--perf-text-dim); }
.cc-axis b { color: var(--perf-text-muted); }
.cc-axis i { font-style: normal; text-transform: uppercase; letter-spacing: 0.06em; }
.cc-axis-line { width: 56px; height: 1px; background: linear-gradient(90deg, var(--perf-amber), var(--perf-ok)); opacity: 0.5; }

.cc-lanes { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 9px; }
.cc-lane { position: relative; display: grid; grid-template-columns: 150px 1fr 78px; align-items: center; gap: 13px; padding: 9px 12px 9px 14px; border-radius: 13px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.22s, transform 0.22s, background 0.22s;
  animation: cc-lane-in 0.5s var(--perf-spring) both; animation-delay: calc(0.08s + var(--i) * 0.07s); }
@keyframes cc-lane-in { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
.cc-lane:hover { transform: translateX(3px); border-color: color-mix(in srgb, var(--tone) 35%, var(--perf-border)); }
.cc-lane.picked { border-color: color-mix(in srgb, var(--tone) 50%, transparent); background: color-mix(in srgb, var(--tone) 8%, var(--perf-surface)); }
.cc-lane.matured { background: color-mix(in srgb, var(--perf-ok) 7%, var(--perf-surface)); }
.cc-lane-spine { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: var(--tone); }
.cc-lane.matured .cc-lane-spine { box-shadow: 0 0 10px var(--perf-ok); }
.cc-lane-id { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cc-lane-id b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-lane-id span { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-lane-id span :deep(svg) { flex-shrink: 0; }

.cc-track { position: relative; height: 22px; }
.cc-ticks { position: absolute; inset: 0; display: flex; gap: 2px; align-items: center; }
.cc-tick { flex: 1; height: 8px; border-radius: 2px; background: var(--perf-track); transition: background 0.4s var(--perf-spring), box-shadow 0.4s; transition-delay: calc(var(--ti) * 0.02s); }
.cc-lane.matured .cc-tick.lit { background: var(--perf-ok); }
.cc-tick.lit { background: var(--tone); box-shadow: 0 0 6px -1px var(--tone); }
.cc-fill { position: absolute; top: 7px; left: 0; height: 8px; border-radius: 999px; overflow: hidden; pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--perf-amber) 80%, transparent), var(--tone)); opacity: 0.25; transition: width 1s var(--perf-spring); }
.cc-fill-flow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: cc-flow 2.4s linear infinite; }
@keyframes cc-flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
.cc-comet { position: absolute; top: 11px; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; pointer-events: none;
  background: var(--tone); box-shadow: 0 0 12px var(--tone), 0 0 0 3px color-mix(in srgb, var(--tone) 22%, transparent); transition: left 1s var(--perf-spring); }
.cc-comet i { position: absolute; inset: 3px; border-radius: 50%; background: #fff; opacity: 0.85; }
.cc-lane.matured .cc-comet { animation: cc-pulse 2.2s ease-in-out infinite; }
@keyframes cc-pulse { 0%, 100% { box-shadow: 0 0 10px var(--perf-ok), 0 0 0 3px color-mix(in srgb, var(--perf-ok) 22%, transparent); } 50% { box-shadow: 0 0 18px var(--perf-ok), 0 0 0 6px color-mix(in srgb, var(--perf-ok) 18%, transparent); } }
.cc-seal { position: absolute; right: -2px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; color: #06281c; background: var(--perf-ok); box-shadow: 0 0 12px var(--perf-ok); animation: cc-seal-pop 0.5s var(--perf-spring) both; }
@keyframes cc-seal-pop { from { transform: translateY(-50%) scale(0); } to { transform: translateY(-50%) scale(1); } }

.cc-lane-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.cc-count { font-size: 13px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.cc-count i { font-size: 10px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.cc-avg { font-size: 13px; font-weight: 850; color: var(--ac); font-variant-numeric: tabular-nums; }
.cc-avg i { font-size: 8px; font-weight: 700; font-style: normal; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-dim); margin-left: 3px; }
.cc-overflow { text-align: center; font-size: 10.5px; font-weight: 650; color: var(--perf-text-dim); padding: 4px; }

.cc-hud { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-top: 13px; }
.cc-hud-cell { display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 11px; background: var(--perf-glass); border: 1px solid var(--perf-border); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.cc-hud-cell span { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.cc-hud-cell span :deep(svg) { color: var(--perf-gold); }
.cc-hud-cell b { font-size: 17px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }

@media (max-width: 720px) {
  .cc-lane { grid-template-columns: 110px 1fr 64px; }
  .cc-hud { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .cc-mote, .cc-playhead, .cc-fill-flow, .cc-lane, .cc-comet, .cc-seal { animation: none !important; }
  .cc-fill, .cc-comet, .cc-tick { transition: none; }
}
</style>
