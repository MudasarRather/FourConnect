<template>
  <div class="qvm-shell" :style="{ '--i': index }">
    <div ref="card" class="qvm" :class="[`h-${q.health}`, { off: !q.is_active }]" role="button" tabindex="0"
      :aria-label="`${q.name} queue — ${q.open} open, health ${q.health}`"
      @click="$emit('inspect', q)" @keydown.enter="$emit('inspect', q)">
      <span class="qvm-glare" aria-hidden="true" />

      <!-- monitor screen (night phosphor, both themes) -->
      <div class="qvm-screen">
        <header class="qvm-head">
          <div class="qvm-id">
            <h4 class="qvm-name">{{ q.name }} <em v-if="q.is_default" title="Default fallback queue — unroutable work lands here">◈</em></h4>
            <p class="qvm-bed sd-mono">{{ laneCode }} · {{ q.team_name || 'NO CREW' }} · {{ q.agents_online }}/{{ q.agents_total }} ON
              <span v-if="q.coverage_open === false" class="offh">· OFF HOURS</span>
              <span v-if="!q.is_active" class="offh">· RETIRED</span>
            </p>
          </div>
          <span v-if="q.tier" class="qvm-tier sd-mono" :style="{ '--tc': `var(--sd-qs-t${q.tier})` }">L{{ q.tier }}</span>
        </header>

        <svg class="qvm-ekg" viewBox="0 0 340 64" preserveAspectRatio="none" aria-hidden="true">
          <path class="qvm-trace" :class="[`h-${q.health}`, { still: reduced || !q.open }]"
            :style="{ '--beat': beatSec + 's' }" :d="EKG" />
          <line v-if="!q.open" x1="0" y1="38" x2="340" y2="38" class="qvm-flat" />
        </svg>

        <div class="qvm-stats sd-mono">
          <div class="qvm-ms"><span class="l">OPEN</span><span class="v"><SdCountUp :value="q.open" /></span></div>
          <div class="qvm-ms"><span class="l">UNOWN</span><span class="v" :class="{ am: q.unassigned }">{{ q.unassigned }}</span></div>
          <div class="qvm-ms"><span class="l">BRCH</span><span class="v" :class="{ rd: q.breached }">{{ q.breached }}</span></div>
          <div class="qvm-ms"><span class="l">WAIT</span><span class="v" :class="{ rd: (q.oldest_wait_mins || 0) >= 1440 }">{{ fmtWait(q.avg_wait_mins) }}</span></div>
        </div>

        <!-- admissions age micro-strip -->
        <div class="qvm-age" :title="ageTitle" aria-hidden="true">
          <span v-for="s in ageSegs" :key="s.key" class="qvm-age-seg" :class="s.key"
            :style="{ flexGrow: s.n || 0.001 }">{{ s.n || '' }}</span>
        </div>
      </div>

      <!-- bezel footer -->
      <footer class="qvm-foot">
        <div class="qvm-spo" :title="q.sla_attainment_7d != null ? `SLA attainment over the range: ${q.sla_attainment_7d}%` : 'No SLA data yet'">
          <span class="qvm-ring" :style="ringStyle"><b class="sd-mono">{{ q.sla_attainment_7d != null ? Math.round(q.sla_attainment_7d) : '—' }}</b></span>
          <span class="qvm-spo-cap sd-mono">SLA %</span>
        </div>
        <div class="qvm-mid">
          <div v-if="q.load_pct != null" class="qvm-load" :title="`Crew load: ${q.open} open vs capacity ${q.crew_capacity}`">
            <span class="qvm-load-track"><span class="qvm-load-fill" :class="{ hot: q.load_pct >= 100, warm: q.load_pct >= 75 && q.load_pct < 100 }"
              :style="{ width: Math.min(100, q.load_pct) + '%' }" /></span>
            <span class="qvm-load-val sd-mono" :class="{ rd: q.load_pct >= 100 }">{{ Math.round(q.load_pct) }}%</span>
          </div>
          <span class="qvm-chips sd-mono">
            <span v-if="q.at_capacity" class="qvm-chip cap" title="Open work at the lane's capacity limit — new arrivals spill to the overflow lane">AT CAP</span>
            <span v-if="drainEta" class="qvm-chip" :title="`Drain ETA at the current burn rate (${q.burn_rate_hr}/hr)`"><Timer :size="10" /> {{ drainEta }}</span>
            <span v-if="q.reopens_range" class="qvm-chip warn" :title="`${q.reopens_range} reopen(s) in range — quality signal`">↺ {{ q.reopens_range }}</span>
          </span>
        </div>
        <span class="qvm-tag sd-mono" :class="tag.cls">{{ tag.label }}</span>
        <Motion v-if="q.tier" as="button" class="qvm-work" :while-hover="{ y: -1, scale: 1.04 }" :while-tap="{ scale: 0.94 }"
          :title="`Open the L${q.tier} desk filtered to this lane`" @click.stop="$emit('work', q)">
          <Play :size="11" /> Work
        </Motion>
      </footer>
    </div>
  </div>
</template>

<script setup>
/* SdVitalsMonitor — one queue as a bedside patient monitor: phosphor screen with a
   live EKG (tempo = inflow, pen colour = health, flatline when empty), OPEN/UNOWN/
   BRCH/WAIT cells, an admissions-age micro-strip, then the bezel footer: SLA SpO₂
   ring, crew-load bar (open vs crew × per-agent cap), drain-ETA + AT CAP + reopen
   chips, the rhythm tag and the Work CTA. Tilt + glare via usePointerSpotlight;
   breaching monitors run the code-red halo. */
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Play, Timer } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  q: { type: Object, required: true },      // QueueOverviewCard (+ vitals fields)
  index: { type: Number, default: 0 },
  reduced: { type: Boolean, default: false },
})
defineEmits(['inspect', 'work'])

const card = ref(null)
usePointerSpotlight(card)   // setup-level call — registers its own lifecycle hooks

const EKG = 'M0,38 L36,38 L44,34 L52,42 L60,38 L72,38 L79,16 L86,58 L93,28 L100,38 L146,38 L154,34 L162,42 L170,38 L182,38 L189,16 L196,58 L203,28 L210,38 L256,38 L264,34 L272,42 L280,38 L292,38 L299,16 L306,58 L313,28 L320,38 L340,38'

const laneCode = computed(() => props.q.code || `LANE ${String(props.index + 1).padStart(2, '0')}`)

/* EKG tempo from the lane's most recent inflow bucket (busier lane = faster rhythm) */
const beatSec = computed(() => {
  const flow = props.q.flow || []
  const last = flow.length ? (flow[flow.length - 1].inflow || 0) : 0
  const base = props.q.health === 'red' ? 2.1 : props.q.health === 'amber' ? 2.9 : 3.8
  return Math.max(1.8, base - Math.min(1.4, last * 0.12)).toFixed(2)
})

const ringStyle = computed(() => {
  const pctv = props.q.sla_attainment_7d
  const deg = pctv == null ? 0 : Math.round((pctv / 100) * 360)
  const col = pctv == null ? 'var(--sd-qs-rail)' : pctv >= 90 ? 'var(--sd-qv-go)' : pctv >= 70 ? 'var(--sd-qv-warn)' : 'var(--sd-qv-halt)'
  return { background: `conic-gradient(${col} ${deg}deg, color-mix(in srgb, var(--sd-qs-rail) 24%, transparent) ${deg}deg)` }
})

const AGE_LABELS = { lt_1h: '<1h', h1_4: '1–4h', h4_24: '4–24h', d1_3: '1–3d', gt_3d: '>3d' }
const ageSegs = computed(() => {
  const a = props.q.aging || {}
  return Object.keys(AGE_LABELS).map(k => ({ key: k, n: a[k] || 0 }))
})
const ageTitle = computed(() => {
  const a = props.q.aging || {}
  return 'Age of open work · ' + Object.entries(AGE_LABELS).map(([k, l]) => `${l}: ${a[k] || 0}`).join(' · ')
})

const drainEta = computed(() => {
  const m = props.q.drain_eta_mins
  if (m == null) return null
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h${String(Math.round(m % 60)).padStart(2, '0')}` : `${Math.round(h / 24)}d`
})

const tag = computed(() => {
  if (!props.q.is_active) return { label: 'RETIRED', cls: 'off' }
  if (props.q.health === 'red') return { label: '⚠ BREACHING', cls: 'alarm' }
  if (props.q.health === 'amber') return { label: 'WATCH', cls: 'watch' }
  if (!props.q.open) return { label: 'CLEAR', cls: 'ok' }
  return { label: 'STEADY', cls: 'ok' }
})

const fmtWait = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${(m / 60).toFixed(1)}h` : `${(m / 1440).toFixed(1)}d`)
</script>

<style scoped>
.qvm-shell { animation: qvm-deal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.05s); }
.qvm { position: relative; border-radius: 16px; padding: 9px 9px 0; cursor: pointer; overflow: hidden;
  border: 1px solid var(--sd-qv-bezel-brd); background: var(--sd-qv-bezel);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s, box-shadow 0.25s; }
.qvm:hover { transform: perspective(1100px)
  rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.32); }
.qvm:focus-visible { outline: 2px solid var(--sd-qv-core); outline-offset: 2px; }
.qvm-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); z-index: 2;
  background: radial-gradient(420px 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    rgba(255, 235, 190, 0.10), transparent 62%); transition: opacity 0.25s; }
.qvm.off { opacity: 0.62; filter: saturate(0.6); }
.qvm.h-red { border-color: color-mix(in srgb, var(--sd-qv-halt) 55%, transparent); }
.qvm.h-red::before { content: ""; position: absolute; inset: -1px; border-radius: 16px; pointer-events: none;
  border: 1px solid var(--sd-qv-halt); opacity: 0; animation: qvm-alarm 1.6s ease-in-out infinite; }

/* screen */
.qvm-screen { position: relative; border-radius: 11px; overflow: hidden;
  border: 1px solid rgba(160, 220, 160, 0.12);
  background: radial-gradient(420px 150px at 22% 0%, rgba(52, 211, 153, 0.05), transparent 60%), var(--sd-qv-screen); }
.qvm-screen::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.12;
  background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(0, 0, 0, 0.65) 2px 3px); }
.qvm-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 10px 13px 0; }
.qvm-name { margin: 0; font-size: 12.5px; font-weight: 800; letter-spacing: 0.04em; color: var(--sd-qv-screen-ink); }
.qvm-name em { color: var(--sd-qv-core); font-style: normal; }
.qvm-bed { margin: 2px 0 0; font-size: 8.5px; letter-spacing: 0.13em; color: var(--sd-qv-screen-dim); }
.qvm-bed .offh { color: var(--sd-qv-warn); }
.qvm-tier { flex: none; font-size: 8.5px; font-weight: 800; letter-spacing: 0.13em; padding: 3px 7px;
  border-radius: 5px; color: var(--tc); background: color-mix(in srgb, var(--tc) 16%, transparent); }
.qvm-ekg { display: block; width: 100%; height: 60px; }
.qvm-trace { fill: none; stroke: var(--sd-qv-go); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  filter: drop-shadow(0 0 5px rgba(52, 211, 153, 0.5));
  stroke-dasharray: 200 900; animation: qvm-run var(--beat, 3.4s) linear infinite; }
.qvm-trace.h-amber { stroke: var(--sd-qv-trace); filter: drop-shadow(0 0 5px rgba(242, 182, 77, 0.6)); }
.qvm-trace.h-red { stroke: var(--sd-qv-halt); filter: drop-shadow(0 0 6px rgba(251, 113, 133, 0.7)); }
.qvm-trace.still { animation: none; stroke-dasharray: none; }
.qvm-flat { stroke: var(--sd-qv-screen-dim); stroke-width: 1.4; opacity: 0.6; stroke-dasharray: 6 5; }
.qvm-stats { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid rgba(120, 180, 120, 0.12); }
.qvm-ms { padding: 8px 12px; border-right: 1px solid rgba(120, 180, 120, 0.1); min-width: 0; }
.qvm-ms:last-child { border-right: none; }
.qvm-ms .l { display: block; font-size: 7.5px; letter-spacing: 0.16em; color: var(--sd-qv-screen-dim); }
.qvm-ms .v { display: block; font-size: 16px; font-weight: 800; color: var(--sd-qv-screen-ink);
  font-variant-numeric: tabular-nums; }
.qvm-ms .v.am { color: var(--sd-qv-trace); }
.qvm-ms .v.rd { color: var(--sd-qv-halt); }
.qvm-age { display: flex; gap: 2px; padding: 0 10px 9px; height: 15px; }
.qvm-age-seg { display: grid; place-items: center; min-width: 4px; border-radius: 3px; overflow: hidden;
  font: 800 7.5px "Segoe UI", system-ui, sans-serif; color: #241703; flex-basis: 0; }
.qvm-age-seg.lt_1h { background: #ffe9bb; }
.qvm-age-seg.h1_4 { background: #ffd98a; }
.qvm-age-seg.h4_24 { background: #f2b64d; }
.qvm-age-seg.d1_3 { background: #d99a2b; }
.qvm-age-seg.gt_3d { background: var(--sd-qv-halt); color: #2b0508; animation: qvm-agepulse 2.4s ease-in-out infinite; }

/* bezel footer */
.qvm-foot { display: flex; align-items: center; gap: 10px; padding: 9px 5px 10px; }
.qvm-spo { display: inline-flex; align-items: center; gap: 7px; flex: none; }
.qvm-ring { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; }
.qvm-ring b { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%;
  background: var(--sd-qv-bezel); font-size: 9.5px; color: var(--sd-text); }
.qvm-spo-cap { font-size: 7.5px; letter-spacing: 0.13em; color: var(--sd-text-dim); }
.qvm-mid { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.qvm-load { display: flex; align-items: center; gap: 6px; }
.qvm-load-track { flex: 1; height: 5px; border-radius: 4px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-qs-rail) 22%, transparent); }
.qvm-load-fill { display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-qv-core), var(--sd-qv-go)); transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.qvm-load-fill.warm { background: linear-gradient(90deg, var(--sd-qv-core), var(--sd-qv-warn)); }
.qvm-load-fill.hot { background: linear-gradient(90deg, var(--sd-qv-warn), var(--sd-qv-halt)); }
.qvm-load-val { font-size: 9px; color: var(--sd-text-dim); }
.qvm-load-val.rd { color: var(--sd-qv-halt); font-weight: 800; }
.qvm-chips { display: inline-flex; gap: 5px; flex-wrap: wrap; }
.qvm-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 8.5px; letter-spacing: 0.08em;
  font-weight: 800; padding: 2px 6px; border-radius: 5px; color: var(--sd-text-muted);
  border: 1px solid var(--sd-border); }
.qvm-chip.cap { color: var(--sd-qv-halt); border-color: color-mix(in srgb, var(--sd-qv-halt) 55%, transparent);
  animation: qvm-blink 1.4s steps(2, end) infinite; }
.qvm-chip.warn { color: var(--sd-qv-warn); border-color: color-mix(in srgb, var(--sd-qv-warn) 45%, transparent); }
.qvm-tag { flex: none; font-size: 8px; letter-spacing: 0.12em; font-weight: 800; padding: 3px 7px; border-radius: 5px; }
.qvm-tag.ok { color: var(--sd-qv-go); border: 1px solid color-mix(in srgb, var(--sd-qv-go) 45%, transparent); }
.qvm-tag.watch { color: var(--sd-qv-warn); border: 1px solid color-mix(in srgb, var(--sd-qv-warn) 50%, transparent); }
.qvm-tag.alarm { color: var(--sd-qv-halt); border: 1px solid var(--sd-qv-halt); animation: qvm-blink 1s steps(2, end) infinite; }
.qvm-tag.off { color: var(--sd-text-dim); border: 1px solid var(--sd-border); }
.qvm-work { display: inline-flex; align-items: center; gap: 5px; flex: none; padding: 6px 11px; border-radius: 9px;
  font-size: 10.5px; font-weight: 800; cursor: pointer; font-family: inherit; color: #241703;
  border: none; background: linear-gradient(135deg, var(--sd-qv-hi), var(--sd-qv-core)); }

@keyframes qvm-deal { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes qvm-run { from { stroke-dashoffset: 1100; } to { stroke-dashoffset: 0; } }
@keyframes qvm-alarm { 0%, 100% { opacity: 0; } 50% { opacity: 0.85; box-shadow: 0 0 26px color-mix(in srgb, var(--sd-qv-halt) 30%, transparent); } }
@keyframes qvm-blink { 50% { opacity: 0.28; } }
@keyframes qvm-agepulse { 50% { filter: brightness(1.35); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qvm-shell,
  html:not([data-cinematic="on"]) .qvm-trace,
  html:not([data-cinematic="on"]) .qvm::before,
  html:not([data-cinematic="on"]) .qvm-chip.cap,
  html:not([data-cinematic="on"]) .qvm-tag.alarm,
  html:not([data-cinematic="on"]) .qvm-age-seg.gt_3d { animation: none; }
}
</style>
