<template>
  <Motion as="section" class="pipe trv-grain"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="pipe-aura" aria-hidden="true" />

    <header class="pipe-head">
      <div class="pipe-h-lead">
        <span class="pipe-eyebrow"><Route :size="12" /> Live operations</span>
        <h3 class="pipe-title">Travel lifecycle pipeline</h3>
      </div>
      <span class="pipe-total trv-mono"><TrvCountUp :value="total" /> tours in motion</span>
    </header>

    <div class="pipe-track">
      <div class="pipe-line"><span class="pipe-flow" /></div>
      <template v-if="!reduced">
        <span v-for="p in 3" :key="'pl' + p" class="pipe-plane" :style="{ '--pd': (p * 2.4) + 's' }" />
      </template>

      <div class="pipe-gates">
        <button v-for="(g, i) in gates" :key="g.key" type="button" class="gate"
          :class="{ lead: g.key === leadKey, idle: !g.count }" :style="{ '--c': g.hex, '--gd': (0.1 + i * 0.08) + 's' }"
          :title="`${g.label} · ${g.count} tour${g.count === 1 ? '' : 's'}`"
          @click="$emit('go', { tab: 'requests', filter: { status: g.status } })">
          <span class="gate-node">
            <component :is="g.icon" :size="16" />
            <span class="gate-ping" />
          </span>
          <span class="gate-count trv-mono"><TrvCountUp :value="g.count" /></span>
          <span class="gate-label">{{ g.label }}</span>
        </button>
      </div>
    </div>

    <footer class="pipe-foot">
      <span class="pipe-legend"><PlaneTakeoff :size="11" /> Requested → reviewed → cleared → flown → landed</span>
      <button v-if="diverted > 0" class="pipe-divert" @click="$emit('go', { tab: 'requests', filter: { status: 'REJECTED' } })">
        <CornerDownRight :size="12" /> {{ diverted }} diverted
      </button>
    </footer>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Route, PlaneTakeoff, CornerDownRight, FileText, Hourglass, CheckCircle2, Plane, BadgeCheck,
} from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ byStatus: { type: Array, default: () => [] } })
defineEmits(['go'])

const reduced = prefersReduced()
const map = computed(() => Object.fromEntries((props.byStatus || []).map(s => [s.status, Number(s.count) || 0])))

const STAGES = [
  { key: 'DRAFT', status: 'DRAFT', label: 'Drafting', icon: FileText, hex: '#9ca3af' },
  { key: 'PENDING_APPROVAL', status: 'PENDING_APPROVAL', label: 'In review', icon: Hourglass, hex: '#fbbf24' },
  { key: 'APPROVED', status: 'APPROVED', label: 'Cleared', icon: CheckCircle2, hex: '#34d399' },
  { key: 'IN_PROGRESS', status: 'IN_PROGRESS', label: 'In flight', icon: Plane, hex: '#fb923c' },
  { key: 'COMPLETED', status: 'COMPLETED', label: 'Landed', icon: BadgeCheck, hex: '#60d394' },
]
const gates = computed(() => STAGES.map(s => ({ ...s, count: map.value[s.status] || 0 })))
const total = computed(() => gates.value.reduce((a, g) => a + g.count, 0))
const diverted = computed(() => (map.value.REJECTED || 0) + (map.value.CANCELLED || 0) + (map.value.RETURNED || 0))
const leadKey = computed(() => {
  let best = null, max = -1
  for (const g of gates.value) if (g.count > max) { max = g.count; best = g.key }
  return max > 0 ? best : null
})
</script>

<style scoped>
.pipe {
  position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 20px 24px 18px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--trv-amber) 6%, var(--trv-surface-elevated)), var(--trv-panel));
  border: 1px solid var(--trv-border-strong); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), var(--trv-shadow);
}
.pipe-aura { position: absolute; inset: -40% 20% 40% -10%; pointer-events: none; z-index: 0;
  background: radial-gradient(55% 70% at 30% 0%, rgba(251,146,60,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }

.pipe-head { position: relative; z-index: 1; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
.pipe-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-ember); }
.pipe-title { font-size: 17px; font-weight: 850; color: var(--trv-text); margin: 6px 0 0; }
.pipe-total { font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); }

/* track */
.pipe-track { position: relative; z-index: 1; padding: 4px 0 2px; }
.pipe-line { position: absolute; top: 22px; left: 9%; right: 9%; height: 2px; border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--trv-amber) 26%, transparent); }
.pipe-flow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--trv-amber-bright), transparent);
  background-size: 40% 100%; animation: pipe-flow 3.4s linear infinite; }
.pipe-plane { position: absolute; top: 17px; left: 9%; width: 0; height: 0;
  border-left: 10px solid var(--trv-amber-bright); border-top: 5px solid transparent; border-bottom: 5px solid transparent;
  filter: drop-shadow(0 0 6px var(--trv-amber)); animation: pipe-fly 7.2s linear infinite; animation-delay: var(--pd, 0s); opacity: 0; }

.pipe-gates { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
.gate { position: relative; z-index: 2; flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: none; border: none; padding: 0; cursor: pointer; font-family: inherit;
  animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: var(--gd); }
.gate-node { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, var(--trv-surface)); border: 1.5px solid color-mix(in srgb, var(--c) 40%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 8%, transparent); transition: transform 0.25s var(--trv-spring), box-shadow 0.25s; }
.gate:hover .gate-node { transform: translateY(-3px) scale(1.06); box-shadow: 0 8px 22px -8px var(--c), 0 0 0 4px color-mix(in srgb, var(--c) 14%, transparent); }
.gate.idle .gate-node { color: var(--trv-text-dim); background: var(--trv-steel-soft); border-color: var(--trv-border); box-shadow: none; }
.gate-ping { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--c); opacity: 0; }
.gate.lead .gate-ping { animation: gate-ping 2.8s ease-out infinite; }
.gate-count { font-size: 19px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.gate.idle .gate-count { color: var(--trv-text-dim); }
.gate-label { font-size: 10.5px; font-weight: 650; color: var(--trv-text-muted); text-align: center; }

.pipe-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 18px; padding-top: 13px; border-top: 1px solid var(--trv-border); }
.pipe-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--trv-text-dim); }
.pipe-divert { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px; cursor: pointer;
  color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 28%, transparent); }
.pipe-divert:hover { background: color-mix(in srgb, var(--trv-st-rejected) 16%, transparent); }

@keyframes pipe-flow { 0% { background-position: -40% 0; } 100% { background-position: 140% 0; } }
@keyframes pipe-fly { 0% { left: 9%; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { left: 91%; opacity: 0; } }
@keyframes gate-ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.9); opacity: 0; } }

@media (max-width: 640px) { .gate-label { font-size: 9px; } .gate-node { width: 38px; height: 38px; } }
@media (prefers-reduced-motion: reduce) {
  .pipe-aura, .pipe-flow, .pipe-plane, .gate, .gate.lead .gate-ping { animation: none; }
  .pipe-plane { display: none; }
}
</style>
