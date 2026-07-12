<template>
  <div class="qc-shell" :style="{ '--i': index, '--tc': accent }">
    <div ref="card" class="qc" :class="[`h-${q.health}`, { off: !q.is_active }]" role="button" tabindex="0"
      :aria-label="`${q.name} queue — ${q.open} open, health ${q.health}`"
      @click="$emit('inspect', q)" @keydown.enter="$emit('inspect', q)">
      <span class="qc-glare" aria-hidden="true" />
      <span class="qc-spine" aria-hidden="true" />

      <!-- header: lamp + name + tier plate -->
      <header class="qc-head">
        <span class="qc-lamp" :title="`Health: ${q.health}`" />
        <div class="qc-id">
          <h4 class="qc-name">{{ q.name }}</h4>
          <p class="qc-team">
            {{ q.team_name || 'No crew' }}
            <span v-if="q.coverage_open === true" class="qc-cov on">· on shift</span>
            <span v-else-if="q.coverage_open === false" class="qc-cov off">· off hours</span>
          </p>
        </div>
        <span v-if="q.tier" class="qc-tier sd-mono">L{{ q.tier }}</span>
        <span v-else-if="q.is_default" class="qc-tier dflt sd-mono" title="Default fallback queue — unroutable work lands here">◈</span>
      </header>

      <!-- depth gauge: conic ring (SLA attainment) + wagon depth bar -->
      <div class="qc-mid">
        <div class="qc-ring" :style="ringStyle" :title="q.sla_attainment_7d != null ? `SLA attainment 7d: ${q.sla_attainment_7d}%` : 'No SLA data yet'">
          <span class="qc-ring-val"><SdCountUp :value="q.open" /></span>
          <span class="qc-ring-lb">OPEN</span>
        </div>
        <div class="qc-gauges">
          <div class="qc-g" v-for="g in gauges" :key="g.label" :title="g.title">
            <span class="qc-g-lb sd-mono">{{ g.label }}</span>
            <span class="qc-g-track"><span class="qc-g-fill" :style="{ width: g.pct + '%', background: g.color }" /></span>
            <span class="qc-g-val" :style="{ color: g.hot ? g.color : undefined }">{{ g.value }}</span>
          </div>
        </div>
      </div>

      <!-- flow spark (7d in/out) -->
      <svg class="qc-spark" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true">
        <polyline :points="sparkIn" fill="none" :stroke="accent" stroke-width="1.6" stroke-linejoin="round" opacity="0.9" />
        <polyline :points="sparkOut" fill="none" stroke="var(--sd-qs-go)" stroke-width="1.4" stroke-linejoin="round" opacity="0.75" stroke-dasharray="3 2" />
      </svg>

      <!-- footer: crew presence + wait + work CTA -->
      <footer class="qc-foot">
        <span class="qc-crew sd-mono" :title="`${q.agents_online} of ${q.agents_total} crew online`">
          <Users :size="12" /> {{ q.agents_online }}/{{ q.agents_total }}
        </span>
        <span class="qc-wait sd-mono" :title="'Average first-response wait (7d)'">
          <Timer :size="12" /> {{ fmtWait(q.avg_wait_mins) }}
        </span>
        <span class="qc-meta sd-mono" :title="`${q.rule_count} routing rule(s) · ${q.category_count} categorie(s) · ${q.skill_count} skill(s)`">
          <GitBranch :size="12" /> {{ q.rule_count }}·{{ q.category_count }}·{{ q.skill_count }}
        </span>
        <Motion v-if="q.tier" as="button" class="qc-work" :while-hover="{ y: -1, scale: 1.03 }" :while-tap="{ scale: 0.95 }"
          :title="`Open the L${q.tier} platform filtered to this lane`" @click.stop="$emit('work', q)">
          <Play :size="11" /> Work
        </Motion>
      </footer>
    </div>
  </div>
</template>

<script setup>
/* SdQueueCard — one classification lane as a cinematic card: health lamp + status
   spine, conic SLA-attainment ring around the live open count, unassigned/breached/
   due-soon gauges, a 7d inflow/outflow spark, crew presence and the Work CTA.
   Pointer-tilt + spotlight glare via usePointerSpotlight; entrance = sd-deal stagger. */
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Users, Timer, Play, GitBranch } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  q: { type: Object, required: true },      // QueueOverviewCard
  index: { type: Number, default: 0 },
})
defineEmits(['inspect', 'work'])

const card = ref(null)
usePointerSpotlight(card)   // registers its own lifecycle hooks — must be a setup-level call

const accent = computed(() => props.q.color || (props.q.tier ? `var(--sd-qs-t${props.q.tier})` : 'var(--sd-qs-core)'))

const ringStyle = computed(() => {
  const pct = props.q.sla_attainment_7d
  const deg = pct == null ? 0 : Math.round((pct / 100) * 360)
  const col = pct == null ? 'var(--sd-qs-rail)' : pct >= 90 ? 'var(--sd-qs-go)' : pct >= 70 ? 'var(--sd-qs-warn)' : 'var(--sd-qs-halt)'
  return { background: `conic-gradient(${col} ${deg}deg, color-mix(in srgb, var(--sd-qs-rail) 22%, transparent) ${deg}deg)` }
})

const gauges = computed(() => {
  const open = Math.max(1, props.q.open || 0)
  const g = (label, value, color, title) => ({
    label, value, color, title, hot: value > 0,
    pct: Math.min(100, Math.round((value / open) * 100)),
  })
  return [
    g('UNOWNED', props.q.unassigned || 0, 'var(--sd-qs-warn)', 'Waiting for a claim'),
    g('BREACH', props.q.breached || 0, 'var(--sd-qs-halt)', 'SLA breached (active)'),
    g('DUE≤4H', props.q.due_soon || 0, 'var(--sd-qs-t2)', 'Resolution due within 4 hours'),
  ]
})

const sparkPts = (key) => {
  const flow = props.q.flow || []
  if (!flow.length) return ''
  const max = Math.max(1, ...flow.map(f => Math.max(f.inflow || 0, f.outflow || 0)))
  const step = 120 / Math.max(1, flow.length - 1)
  return flow.map((f, i) => `${(i * step).toFixed(1)},${(24 - ((f[key] || 0) / max) * 20).toFixed(1)}`).join(' ')
}
const sparkIn = computed(() => sparkPts('inflow'))
const sparkOut = computed(() => sparkPts('outflow'))

const fmtWait = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${(m / 60).toFixed(1)}h` : `${(m / 1440).toFixed(1)}d`)
</script>

<style scoped>
/* outer shell runs the entrance; inner .qc holds the tilt so they never conflict */
.qc-shell { animation: sd-deal 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.qc { position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column; gap: 10px;
  padding: 14px 14px 12px 18px; border-radius: 16px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s ease-out; }
.qc:hover { border-color: color-mix(in srgb, var(--tc) 45%, var(--sd-border));
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px);
  box-shadow: 0 18px 40px -18px color-mix(in srgb, var(--tc) 45%, transparent); }
.qc.off { opacity: 0.55; filter: saturate(0.5); }
.qc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(220px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--tc) 14%, transparent), transparent 60%); }
.qc-spine { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3.5px; border-radius: 3px; background: var(--tc); opacity: 0.85; }
.qc.h-red .qc-spine { background: var(--sd-qs-halt); box-shadow: 0 0 12px var(--sd-qs-halt); }
.qc.h-amber .qc-spine { background: var(--sd-qs-warn); }

.qc-head { display: flex; align-items: flex-start; gap: 9px; }
.qc-lamp { flex-shrink: 0; width: 9px; height: 9px; margin-top: 5px; border-radius: 50%; background: var(--sd-qs-go); }
.qc.h-amber .qc-lamp { background: var(--sd-qs-warn); }
.qc.h-red .qc-lamp { background: var(--sd-qs-halt); animation: qc-lamp 1.3s ease-out infinite; }
.qc-id { min-width: 0; flex: 1; }
.qc-name { margin: 0; font-size: 14.5px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qc-team { margin: 2px 0 0; font-size: 10.5px; color: var(--sd-text-muted); }
.qc-cov.on { color: var(--sd-qs-go); }
.qc-cov.off { color: var(--sd-text-dim); }
.qc-tier { flex-shrink: 0; padding: 3px 7px; border-radius: 7px; font-size: 10px; font-weight: 800;
  color: var(--tc); background: color-mix(in srgb, var(--tc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--tc) 35%, transparent); }
.qc-tier.dflt { color: var(--sd-qs-core); }

.qc-mid { display: flex; align-items: center; gap: 13px; }
.qc-ring { flex-shrink: 0; position: relative; width: 66px; height: 66px; border-radius: 50%; display: grid; place-items: center; }
.qc-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-surface); }
.qc-ring-val { position: relative; z-index: 1; font-size: 17px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; line-height: 1; }
.qc-ring-lb { position: relative; z-index: 1; font-size: 7.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); margin-top: 1px; }
.qc-gauges { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.qc-g { display: grid; grid-template-columns: 52px 1fr 26px; align-items: center; gap: 7px; }
.qc-g-lb { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.qc-g-track { height: 4px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--sd-qs-rail) 18%, transparent); }
.qc-g-fill { display: block; height: 100%; border-radius: 3px; transition: width 0.6s var(--sd-spring); }
.qc-g-val { font-size: 11.5px; font-weight: 800; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; text-align: right; }

.qc-spark { width: 100%; height: 26px; opacity: 0.9; }

.qc-foot { display: flex; align-items: center; gap: 11px; margin-top: auto; padding-top: 9px; border-top: 1px dashed var(--sd-border); }
.qc-crew, .qc-wait, .qc-meta { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--sd-text-muted); }
.qc-work { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 5px 11px; border-radius: 9px;
  font-size: 10.5px; font-weight: 800; cursor: pointer; font-family: inherit; border: 1px solid transparent;
  color: #241703; background: linear-gradient(135deg, #ffd98a, var(--sd-qs-core)); }

@keyframes qc-lamp { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qs-halt) 55%, transparent); } 100% { box-shadow: 0 0 0 9px transparent; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qc-shell { animation: none; }
  html:not([data-cinematic="on"]) .qc.h-red .qc-lamp { animation: none; }
  html:not([data-cinematic="on"]) .qc:hover { transform: none; }
}
</style>
