<template>
  <div ref="root" class="whx" :data-reduced="reduced">
    <!-- ambient strand backdrop -->
    <svg class="whx-svg" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="whxUp" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--hr-accent-gold)" stop-opacity="0.05" />
          <stop offset="45%" stop-color="var(--hr-orange)" stop-opacity="0.85" />
          <stop offset="100%" stop-color="var(--hr-accent-gold)" stop-opacity="0.05" />
        </linearGradient>
        <linearGradient id="whxLo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--hr-active)" stop-opacity="0.05" />
          <stop offset="50%" stop-color="var(--hr-accent-gold-strong)" stop-opacity="0.7" />
          <stop offset="100%" stop-color="var(--hr-active)" stop-opacity="0.05" />
        </linearGradient>
        <radialGradient id="whxPulse">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.95" />
          <stop offset="40%" stop-color="var(--hr-accent-gold)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--hr-orange)" stop-opacity="0" />
        </radialGradient>
        <filter id="whxGlow" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <!-- centre rail -->
      <line class="whx-rail" x1="20" y1="150" x2="980" y2="150" />

      <!-- weaving rungs -->
      <g class="whx-rungs">
        <line v-for="(r, i) in rungs" :key="i" :x1="r.x" :y1="r.y1" :x2="r.x" :y2="r.y2"
          :style="{ '--d': (i * 0.05) + 's' }" />
      </g>

      <!-- twin strands -->
      <path class="whx-strand up" :d="upper" filter="url(#whxGlow)" />
      <path class="whx-strand lo" :d="lower" filter="url(#whxGlow)" />

      <!-- travelling lifecycle pulses -->
      <template v-if="!reduced">
        <circle class="whx-spark" r="7" fill="url(#whxPulse)">
          <animateMotion :path="upper" dur="8s" repeatCount="indefinite" rotate="auto" />
        </circle>
        <circle class="whx-spark" r="5" fill="url(#whxPulse)">
          <animateMotion :path="lower" dur="11s" begin="-4s" repeatCount="indefinite" rotate="auto" />
        </circle>
      </template>
    </svg>

    <!-- lifecycle loci -->
    <div class="whx-loci">
      <div v-for="(l, i) in loci" :key="l.key" class="whx-lo" :data-active="l.key === 'active'"
        :style="{ left: l.x + '%', '--sz': l.size + 'px', '--tone': l.color }">
        <Motion as="button" type="button" class="whx-lo-btn"
          :initial="reduced ? false : { opacity: 0, scale: 0.6, y: 14 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.6, delay: 0.15 + i * 0.13, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="reduced ? {} : { y: -4 }" :whileTap="{ scale: 0.95 }"
          @click="$emit('go', l.target)">
          <span class="whx-orb">
            <span class="whx-orb-ring" aria-hidden="true" />
            <span class="whx-orb-core" aria-hidden="true" />
            <component :is="l.icon" :size="l.key === 'active' ? 22 : 17" />
            <span v-if="i < loci.length - 1" class="whx-flow" aria-hidden="true"><ChevronRight :size="14" /></span>
          </span>
          <span class="whx-meta">
            <span class="whx-val"><HrCountUp :value="l.value" :duration="1.5" /></span>
            <span class="whx-lab">{{ l.label }}</span>
          </span>
        </Motion>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { UserPlus, PackageCheck, Users, LogOut, ChevronRight } from 'lucide-vue-next'
import HrCountUp from '@/components/hr/HrCountUp.vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
defineEmits(['go'])
const reduced = prefersReduced()
const root = ref(null)
usePointerSpotlight(root)

// ── deterministic helix geometry (viewBox 0 0 1000 300) ──
const MID = 150, AMP = 70, K = (Math.PI * 2 * 2.3) / 1000
const buildStrand = (phase) => {
  let d = ''
  for (let x = 0; x <= 1000; x += 8) {
    const y = (MID + AMP * Math.sin(K * x + phase)).toFixed(1)
    d += (x === 0 ? 'M' : 'L') + x + ',' + y + ' '
  }
  return d.trim()
}
const upper = buildStrand(0)
const lower = buildStrand(Math.PI)
const rungs = (() => {
  const out = []
  for (let x = 36; x <= 964; x += 40) {
    out.push({ x, y1: +(MID + AMP * Math.sin(K * x)).toFixed(1), y2: +(MID + AMP * Math.sin(K * x + Math.PI)).toFixed(1) })
  }
  return out
})()

// ── lifecycle loci, sized by headcount (sqrt scale) ──
const num = (v) => Number(v) || 0
const loci = computed(() => {
  const rec = props.data.recruitment?.stats || props.data.recruitment || {}
  const onb = props.data.onboarding || {}
  const core = props.data.core || {}
  const ex = props.data.exit || {}
  const raw = [
    { key: 'intake', label: 'Open Roles', value: num(rec.open_positions), icon: UserPlus,
      color: 'var(--hr-accent-gold)', soft: 'var(--hr-accent-gold-soft)', target: '/admin/hr/recruitment/positions', x: 11 },
    { key: 'onboard', label: 'Joining', value: num(onb.pending_joinings) + num(onb.today_joining), icon: PackageCheck,
      color: 'var(--hr-orange)', soft: 'var(--hr-orange-soft)', target: '/admin/hr/onboarding/dashboard', x: 37 },
    { key: 'active', label: 'Active Workforce', value: num(core.active_employees), icon: Users,
      color: 'var(--hr-active)', soft: 'var(--hr-active-soft)', target: '/admin/hr/employees/all', x: 63 },
    { key: 'exit', label: 'Exiting', value: num(ex.kpis?.serving_notice ?? ex.serving_notice ?? core.upcoming_exits_30d), icon: LogOut,
      color: 'var(--hr-notice)', soft: 'var(--hr-notice-soft)', target: '/admin/hr/exit/dashboard', x: 89 },
  ]
  const max = Math.max(1, ...raw.map((r) => r.value))
  return raw.map((r) => ({ ...r, size: Math.round(48 + 30 * Math.sqrt(r.value / max)) }))
})
</script>

<style scoped>
.whx {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 184px;
  border-radius: 18px;
  overflow: hidden;
  --mx: 0.5; --my: 0.5;
}
.whx-svg { position: absolute; inset: 0; width: 100%; height: 100%;
  transform: translate(calc((var(--mx) - 0.5) * -14px), calc((var(--my) - 0.5) * -10px));
  transition: transform 0.5s var(--hr-spring); }

.whx-rail { stroke: var(--hr-border-strong); stroke-width: 1; stroke-dasharray: 2 7; opacity: 0.5; }
.whx-rungs line { stroke: var(--hr-accent-gold); stroke-width: 1.4; opacity: 0.14;
  animation: whx-rung 4.5s var(--hr-spring) infinite; animation-delay: var(--d); }
@keyframes whx-rung { 0%, 100% { opacity: 0.06; } 50% { opacity: 0.26; } }

.whx-strand { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 14 16; }
.whx-strand.up { stroke: url(#whxUp); animation: whx-flow 3.4s linear infinite; }
.whx-strand.lo { stroke: url(#whxLo); animation: whx-flow-rev 4.6s linear infinite; }
@keyframes whx-flow { to { stroke-dashoffset: -300; } }
@keyframes whx-flow-rev { to { stroke-dashoffset: 300; } }
.whx-spark { filter: drop-shadow(0 0 6px var(--hr-accent-gold)); }

/* loci overlay — wrapper does stable centering, inner button owns motion-v transforms */
.whx-loci { position: absolute; inset: 0; pointer-events: none; }
.whx-lo { position: absolute; top: 50%; transform: translate(-50%, -50%); }
.whx-lo-btn {
  pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 9px;
  background: none; border: none; cursor: pointer; font: inherit; padding: 4px;
}
.whx-orb {
  position: relative; width: var(--sz); height: var(--sz); border-radius: 50%;
  display: grid; place-items: center; color: var(--tone);
  background: radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--tone) 34%, transparent), var(--hr-surface-deep) 72%);
  border: 1.5px solid color-mix(in srgb, var(--tone) 50%, transparent);
  box-shadow: 0 10px 28px -10px color-mix(in srgb, var(--tone) 60%, transparent), inset 0 0 18px color-mix(in srgb, var(--tone) 16%, transparent);
  transition: box-shadow 0.3s var(--hr-spring), border-color 0.3s;
}
.whx-orb-core { position: absolute; inset: 18%; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone) 22%, transparent), transparent 70%); }
.whx-orb-ring { position: absolute; inset: -6px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent); opacity: 0; }
.whx-lo:hover .whx-orb { box-shadow: 0 14px 34px -8px color-mix(in srgb, var(--tone) 78%, transparent), inset 0 0 22px color-mix(in srgb, var(--tone) 24%, transparent); border-color: var(--tone); }
.whx-lo[data-active="true"] .whx-orb-ring { opacity: 1; animation: whx-ping 2.8s ease-out infinite; }
@keyframes whx-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
.whx-lo[data-active="true"] .whx-orb { animation: whx-breathe 3.4s var(--hr-spring) infinite; }
@keyframes whx-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

.whx-meta { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.whx-val { font-size: 18px; font-weight: 850; color: var(--hr-text); letter-spacing: -0.02em; line-height: 1; }
.whx-lo[data-active="true"] .whx-val { font-size: 23px; color: var(--tone); }
.whx-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--hr-text-muted); white-space: nowrap; }

.whx-flow { position: absolute; left: 100%; top: 50%; margin-left: 7px; transform: translateY(-50%); color: var(--hr-text-dim);
  opacity: 0.5; animation: whx-drift 2.6s ease-in-out infinite; }
@keyframes whx-drift { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.72; } }

.whx-tag { position: absolute; right: 14px; bottom: 10px; font-size: 9px; letter-spacing: 0.22em; color: var(--hr-text-dim); opacity: 0.6; }

@media (max-width: 560px) { .whx-lab { display: none; } .whx-flow { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .whx-strand, .whx-rungs line, .whx-lo[data-active="true"] .whx-orb, .whx-lo[data-active="true"] .whx-orb-ring, .whx-flow { animation: none !important; }
  .whx-svg { transform: none !important; }
}
</style>
