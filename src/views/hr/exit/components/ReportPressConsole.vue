<template>
  <Motion as="section" ref="el" class="rpc ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="rpc-aura" aria-hidden="true" />

    <div class="rpc-grid">
      <!-- lead -->
      <div class="rpc-lead">
        <span class="rpc-eyebrow"><FileBarChart2 :size="12" /> Exit Management · Insights</span>
        <h2 class="rpc-title">The Reporting <span class="grad">Bureau</span></h2>
        <p class="rpc-sub">Branded exit registers, attrition intelligence & F&amp;F ledgers — composed live,
          pressed to PDF, Excel or CSV. Every issue is its own cover.</p>

        <div class="rpc-kpis">
          <span v-for="k in kpiChips" :key="k.label" class="rpc-kpi">
            <span class="rk-v"><ExCountUp :value="k.value" :format="k.format" /></span>
            <span class="rk-l">{{ k.label }}</span>
          </span>
        </div>
      </div>

      <!-- signature instrument: the publication press -->
      <div ref="scene" class="rpc-press" aria-hidden="true">
        <span class="press-blob pb1" /><span class="press-blob pb2" />
        <div class="press-belt" :class="{ paused: !belt.length }">
          <div class="belt-track">
            <div v-for="(r, i) in beltReports" :key="`${r.key}-${i}`" class="belt-cover" :style="beltStyle(i)">
              <ReportCoverArt :report="r" size="sm" :live="false" />
            </div>
          </div>
        </div>
        <span class="press-head" />
        <span class="press-floor" />
        <div class="press-tag"><Printer :size="12" /> {{ reports.length }} issues · live press</div>
      </div>
    </div>

    <!-- group filters + scope bar -->
    <div class="rpc-bar">
      <div class="rpc-groups">
        <button v-for="g in groupChips" :key="g.key" type="button" class="grp-pill" :class="{ on: activeGroup === g.key }"
          @click="$emit('update:group', g.key)">
          {{ g.label }}<span class="grp-n">{{ g.n }}</span>
        </button>
      </div>

      <div class="rpc-scope">
        <span class="scope-lab"><CalendarRange :size="12" /> Scope</span>
        <HrDatePicker v-model="df" placeholder="From" :clearable="true" @update:modelValue="emitScope" />
        <span class="scope-arrow">→</span>
        <HrDatePicker v-model="dt" placeholder="To" :clearable="true" @update:modelValue="emitScope" />
        <ExSelect v-model="dept" :options="deptOptions" placeholder="All departments" size="sm" class="scope-dept"
          @change="emitScope" />
        <button v-if="scopeActive" type="button" class="scope-reset" @click="reset"><RotateCcw :size="13" /> Reset</button>
        <Loader2 v-if="loading" :size="15" class="scope-spin spin" />
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { FileBarChart2, Printer, CalendarRange, RotateCcw, Loader2 } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import ExSelect from './ExSelect.vue'
import ReportCoverArt from './ReportCoverArt.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fmtCompactINR } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  reports: { type: Array, default: () => [] },
  kpis: { type: Object, default: () => ({}) },
  departments: { type: Array, default: () => [] },
  activeGroup: { type: String, default: 'all' },
  scope: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:group', 'update:scope'])
const reduced = prefersReduced()
const el = ref(null)
const scene = ref(null)
usePointerSpotlight(scene)

const df = ref(props.scope.date_from || null)
const dt = ref(props.scope.date_to || null)
const dept = ref(props.scope.department_id || '')

const deptOptions = computed(() => [
  { value: '', label: 'All departments' },
  ...props.departments.map(d => ({ value: d.id, label: d.name })),
])
const scopeActive = computed(() => !!(df.value || dt.value || dept.value))

const emitScope = () => emit('update:scope', {
  date_from: df.value || null, date_to: dt.value || null, department_id: dept.value || null,
})
const reset = () => { df.value = null; dt.value = null; dept.value = ''; emitScope() }

const kpiChips = computed(() => {
  const k = props.kpis || {}
  return [
    { label: 'Cases', value: k.total_cases || 0 },
    { label: 'Relieved', value: k.relieved || 0 },
    { label: 'In process', value: k.active || 0 },
    { label: 'Serving notice', value: k.serving_notice || 0 },
    { label: 'Net F&F', value: k.net_fnf || 0, format: fmtCompactINR },
    { label: 'Avg tenure', value: k.avg_tenure_months || 0, format: (v) => `${Math.round(v)}mo` },
    { label: 'Interviews', value: k.interviews_done || 0 },
  ]
})

const GROUPS = [
  { key: 'all', label: 'All' }, { key: 'Registry', label: 'Registry' },
  { key: 'Analytics', label: 'Analytics' }, { key: 'Offboarding', label: 'Offboarding' },
  { key: 'Finance', label: 'Finance' },
]
const groupChips = computed(() => GROUPS.map(g => ({
  ...g, n: g.key === 'all' ? props.reports.length : props.reports.filter(r => r.group === g.key).length,
})))

// belt = reports repeated twice for a seamless marquee loop
const belt = computed(() => props.reports)
const beltReports = computed(() => [...props.reports, ...props.reports])
const beltStyle = (i) => ({ '--i': i })
</script>

<style scoped>
.rpc { position: relative; overflow: hidden; border-radius: 22px; margin-bottom: 16px;
  padding: 22px 24px 18px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border);
  box-shadow: var(--ex-card-shadow); }
.rpc-aura { position: absolute; inset: -50% 30% 30% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 25% 0%, rgba(251,146,60,0.16), transparent 70%);
  animation: ex-aura-drift 11s ease-in-out infinite; }
.rpc-grid { position: relative; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 26px; align-items: stretch; }
@media (max-width: 980px) { .rpc-grid { grid-template-columns: 1fr; } }

.rpc-lead { min-width: 0; }
.rpc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ex-violet); padding: 4px 10px; border-radius: 999px;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.rpc-title { font-size: clamp(24px, 3.4vw, 34px); font-weight: 850; margin: 12px 0 6px; color: var(--ex-text); line-height: 1.04; letter-spacing: -0.5px; }
.rpc-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rpc-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0 0 16px; max-width: 480px; line-height: 1.5; }

.rpc-kpis { display: flex; flex-wrap: wrap; gap: 8px; }
.rpc-kpi { display: inline-flex; flex-direction: column; gap: 1px; padding: 7px 12px; border-radius: 12px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.rk-v { font-size: 16px; font-weight: 820; color: var(--ex-text); font-family: var(--ex-mono); font-variant-numeric: tabular-nums; }
.rk-l { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); }

/* ── signature press instrument ── */
.rpc-press { position: relative; overflow: hidden; border-radius: 18px; min-height: 230px;
  background: radial-gradient(120% 120% at 80% 0%, rgba(251,146,60,0.12), transparent 60%), var(--ex-panel);
  border: 1px solid var(--ex-border); perspective: 1100px; }
.press-blob { position: absolute; border-radius: 50%; filter: blur(34px); mix-blend-mode: screen; pointer-events: none; opacity: 0.7;
  transform: translate(calc((var(--mx,.5) - .5) * 26px), calc((var(--my,.5) - .5) * 18px)); transition: transform 0.5s ease; }
.press-blob.pb1 { width: 60%; height: 70%; left: -8%; top: 10%; background: radial-gradient(circle, #fcd34d, transparent 70%); animation: rpc-blob 14s ease-in-out infinite; }
.press-blob.pb2 { width: 50%; height: 60%; right: -6%; bottom: -10%; background: radial-gradient(circle, #ea580c, transparent 70%); animation: rpc-blob 17s ease-in-out infinite reverse; }
@keyframes rpc-blob { 0%,100%{ transform: translate(0,0) scale(1);} 50%{ transform: translate(6%,-5%) scale(1.16);} }

.press-belt { position: absolute; inset: 22px 0 40px; display: flex; align-items: center;
  transform: rotateY(-22deg) rotateX(6deg) translateX(calc((var(--mx,.5) - .5) * -18px)); transform-style: preserve-3d; transition: transform 0.5s ease; }
.belt-track { display: flex; gap: 18px; padding: 0 24px; animation: press-feed 26s linear infinite; }
.rpc-press:hover .belt-track { animation-play-state: paused; }
@keyframes press-feed { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.belt-cover { flex: 0 0 118px; width: 118px; border-radius: 14px; overflow: hidden;
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.55); transform: translateZ(calc(var(--i) * 0 + 0px)); }

.press-head { position: absolute; top: 0; bottom: 28px; width: 14px; pointer-events: none; z-index: 3;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); mix-blend-mode: screen;
  filter: blur(2px); animation: press-sweep 4.2s ease-in-out infinite; }
@keyframes press-sweep { 0%{ left: -3%; opacity: 0; } 15%{ opacity: 1; } 85%{ opacity: 1; } 100%{ left: 100%; opacity: 0; } }
.press-floor { position: absolute; left: 0; right: 0; bottom: 26px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent); }
.press-tag { position: absolute; left: 14px; bottom: 9px; z-index: 4; display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted);
  font-family: var(--ex-mono); }

/* ── bar: groups + scope ── */
.rpc-bar { position: relative; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;
  margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ex-border); }
.rpc-groups { display: flex; flex-wrap: wrap; gap: 7px; }
.grp-pill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 700; color: var(--ex-text-secondary); background: var(--ex-surface);
  border: 1px solid var(--ex-border); transition: all 0.22s var(--ex-spring); }
.grp-pill:hover { border-color: var(--ex-border-strong); color: var(--ex-text); transform: translateY(-1px); }
.grp-pill.on { color: #fff; background: var(--ex-grad-hero); border-color: transparent; box-shadow: var(--ex-violet-glow); }
.grp-n { font-size: 10px; font-family: var(--ex-mono); padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.16); }
.grp-pill:not(.on) .grp-n { background: var(--ex-panel); color: var(--ex-text-muted); }

.rpc-scope { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.scope-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ex-text-muted); }
.scope-arrow { color: var(--ex-text-dim); font-size: 13px; }
.scope-dept { min-width: 168px; }
.scope-reset { display: inline-flex; align-items: center; gap: 5px; padding: 8px 11px; border-radius: 9px; cursor: pointer;
  font-size: 11.5px; font-weight: 700; color: var(--ex-violet); background: var(--ex-violet-soft);
  border: 1px solid var(--ex-violet-border); }
.scope-spin { color: var(--ex-violet); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

[data-theme="light"] .press-blob { mix-blend-mode: normal; opacity: 0.4; }
[data-theme="light"] .press-head { mix-blend-mode: normal; background: linear-gradient(90deg, transparent, rgba(234,88,12,0.4), transparent); }

@media (prefers-reduced-motion: reduce) {
  .rpc-aura, .press-blob, .belt-track, .press-head { animation: none !important; }
  .belt-track { transform: none; }
}
</style>
