<template>
  <Motion as="section" class="bvh" ref="rootRef"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="bvh-aurora" aria-hidden="true" />
    <span class="trn-spotlight" aria-hidden="true" />
    <span class="trn-grain" aria-hidden="true" />

    <div class="bvh-top">
      <div class="bvh-lead">
        <span class="bvh-eyebrow"><Landmark :size="13" /> Treasury · L&amp;D</span>
        <h1 class="bvh-title">Training Budget</h1>
        <p class="bvh-sub">Allocate learning spend by period and department — and watch committed vs spent burn down against every allocation in real time.</p>
        <div class="bvh-tools">
          <div class="bvh-fy"><TrnSelect :model-value="year" @update:modelValue="$emit('update:year', $event)" :options="yearOptions" /></div>
          <Motion as="button" type="button" class="trn-btn trn-btn-primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('create')">
            <Plus :size="15" /> New budget
          </Motion>
          <span class="bvh-count trn-mono"><Wallet :size="13" /> {{ budgetCount }} {{ budgetCount === 1 ? 'allocation' : 'allocations' }}</span>
        </div>
      </div>

      <!-- vault gauge -->
      <div class="bvh-vault" :class="{ over }">
        <span class="bvh-vault-aura" aria-hidden="true" />
        <span class="bvh-vault-sweep" aria-hidden="true" />
        <svg class="bvh-vault-svg" :viewBox="`0 0 ${SZ} ${SZ}`" aria-hidden="true">
          <circle class="bvh-track" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="SW" />
          <circle v-if="!over" class="bvh-arc spent" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="SW" stroke-linecap="round"
            :stroke-dasharray="`${vis ? spentLen : 0} ${CIRC}`" transform="rotate(-90 95 95)" />
          <circle v-if="!over" class="bvh-arc committed" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="SW" stroke-linecap="round"
            :stroke-dasharray="`${vis ? commLen : 0} ${CIRC}`" :transform="`rotate(${spentDeg - 90} 95 95)`" />
          <circle v-else class="bvh-arc over" :cx="C" :cy="C" :r="R" fill="none" :stroke-width="SW" stroke-linecap="round"
            :stroke-dasharray="`${vis ? CIRC : 0} ${CIRC}`" transform="rotate(-90 95 95)" />
        </svg>
        <div class="bvh-vault-c">
          <Vault :size="16" class="bvh-vault-ic" />
          <span class="bvh-vault-val"><TrnCountUp :value="utilPct" :duration="1.6" suffix="%" /></span>
          <span class="bvh-vault-lab">utilised</span>
        </div>
        <span class="bvh-health" :class="health.key"><span class="bvh-health-dot" /> {{ health.label }}</span>
      </div>
    </div>

    <!-- allocation rail -->
    <div class="bvh-rail-wrap" ref="railRef" :class="{ 'is-in': railIn }">
      <div class="bvh-rail">
        <span class="bvh-seg spent" :style="{ width: railIn ? segPct('spent') + '%' : '0%' }"><span class="bvh-seg-glow" /></span>
        <span class="bvh-seg committed" :style="{ width: railIn ? segPct('committed') + '%' : '0%', transitionDelay: '0.12s' }" />
        <span class="bvh-rail-mark" :style="{ left: '100%' }" />
      </div>
      <div class="bvh-legend">
        <div class="bvh-leg" v-for="(l, i) in legend" :key="l.key" :class="l.key" :style="{ '--d': (i * 0.06) + 's' }">
          <span class="bvh-leg-dot" />
          <div class="bvh-leg-txt">
            <span class="bvh-leg-v"><TrnCountUp :value="l.value" prefix="₹" :duration="1.5" /></span>
            <span class="bvh-leg-l">{{ l.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Landmark, Plus, Wallet, Vault } from 'lucide-vue-next'
import TrnSelect from './TrnSelect.vue'
import TrnCountUp from './TrnCountUp.vue'
import { prefersReduced, usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  summary: { type: Object, default: null },
  year: { type: Number, default: () => new Date().getFullYear() },
  years: { type: Array, default: () => [] },
  budgetCount: { type: Number, default: 0 },
})
defineEmits(['update:year', 'create'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible: vis } = useInView(rootRef, { threshold: 0.2 })
const railRef = ref(null)
const { visible: railIn } = useInView(railRef, { threshold: 0.3 })

const n = (v) => Number(v || 0)
const allocated = computed(() => n(props.summary?.total_allocated))
const spent = computed(() => n(props.summary?.total_spent))
const committed = computed(() => n(props.summary?.total_committed))
const remaining = computed(() => n(props.summary?.total_remaining))
const used = computed(() => spent.value + committed.value)
const utilPct = computed(() => allocated.value > 0 ? Math.round((used.value / allocated.value) * 100) : 0)
const over = computed(() => used.value > allocated.value && allocated.value > 0)

const yearOptions = computed(() => props.years.map(y => ({ value: y, label: `FY ${y}` })))

const health = computed(() => {
  const u = utilPct.value
  if (over.value) return { key: 'over', label: 'Over budget' }
  if (!allocated.value) return { key: 'none', label: 'Unallocated' }
  if (u >= 90) return { key: 'tight', label: 'Tight' }
  if (u >= 70) return { key: 'watch', label: 'On watch' }
  return { key: 'healthy', label: 'Healthy' }
})

const legend = computed(() => [
  { key: 'allocated', label: 'Allocated', value: allocated.value },
  { key: 'spent', label: 'Spent', value: spent.value },
  { key: 'committed', label: 'Committed', value: committed.value },
  { key: 'remaining', label: 'Remaining', value: remaining.value },
])
const segPct = (k) => {
  if (!allocated.value) return 0
  const v = k === 'spent' ? spent.value : committed.value
  return Math.min(100, (v / allocated.value) * 100)
}

// gauge geometry
const SZ = 190, C = SZ / 2, SW = 14, R = C - SW / 2 - 6
const CIRC = 2 * Math.PI * R
const spentFrac = computed(() => allocated.value > 0 ? Math.min(1, spent.value / allocated.value) : 0)
const commFrac = computed(() => allocated.value > 0 ? Math.min(1 - spentFrac.value, committed.value / allocated.value) : 0)
const spentLen = computed(() => Math.max(spentFrac.value > 0 ? 2 : 0, spentFrac.value * CIRC - 4))
const commLen = computed(() => Math.max(commFrac.value > 0 ? 2 : 0, commFrac.value * CIRC - 4))
const spentDeg = computed(() => spentFrac.value * 360)
</script>

<style scoped>
.bvh { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 28px 22px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-grad-hero), var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.bvh-aurora { position: absolute; inset: -40% -20% auto -20%; height: 92%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(56% 66% at 82% 6%, color-mix(in srgb, var(--trn-st-completed) 14%, transparent), transparent 60%),
    radial-gradient(54% 64% at 20% 0%, color-mix(in srgb, var(--trn-amber) 20%, transparent), transparent 60%);
  filter: blur(14px); opacity: 0.85; animation: bvh-drift 18s ease-in-out infinite alternate; }

.bvh-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
.bvh-lead { min-width: 0; flex: 1; }
.bvh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--trn-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.bvh-eyebrow :deep(svg) { color: var(--trn-amber); }
.bvh-title { margin: 9px 0 0; font-size: 34px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; color: var(--trn-text);
  background: linear-gradient(120deg, var(--trn-text) 34%, var(--trn-amber-strong)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.bvh-sub { margin: 10px 0 0; font-size: 13px; color: var(--trn-text-muted); max-width: 52ch; }
.bvh-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
.bvh-fy { width: 130px; }
.bvh-count { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--trn-text-muted); padding: 8px 12px;
  border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.bvh-count :deep(svg) { color: var(--trn-amber-strong); }

/* vault gauge */
.bvh-vault { position: relative; flex-shrink: 0; width: 190px; height: 190px; display: grid; place-items: center; }
.bvh-vault-aura { position: absolute; inset: 18px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--trn-amber) 22%, transparent), transparent 68%); animation: bvh-breathe 5.6s ease-in-out infinite; }
.bvh-vault.over .bvh-vault-aura { background: radial-gradient(circle, color-mix(in srgb, var(--trn-st-failed) 26%, transparent), transparent 68%); }
.bvh-vault-sweep { position: absolute; inset: 8px; border-radius: 50%; pointer-events: none; opacity: 0.5;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--trn-amber) 60%, transparent) 38deg, transparent 80deg);
  -webkit-mask: radial-gradient(circle, transparent 56%, #000 58%, #000 74%, transparent 76%); mask: radial-gradient(circle, transparent 56%, #000 58%, #000 74%, transparent 76%);
  mix-blend-mode: screen; animation: trn-radar-sweep 8s linear infinite; }
[data-theme="light"] .bvh-vault-sweep { mix-blend-mode: multiply; opacity: 0.4; }
.bvh-vault-svg { position: relative; width: 100%; height: 100%; }
.bvh-track { stroke: var(--trn-border-strong); opacity: 0.4; }
.bvh-arc { transition: stroke-dasharray 1.15s var(--trn-spring); }
.bvh-arc.spent { stroke: var(--trn-amber); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--trn-amber) 55%, transparent)); }
.bvh-arc.committed { stroke: var(--trn-ember); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--trn-ember) 55%, transparent)); }
.bvh-arc.over { stroke: var(--trn-st-failed); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--trn-st-failed) 60%, transparent)); }
.bvh-vault-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.bvh-vault-ic { color: var(--trn-amber); margin-bottom: 3px; }
.bvh-vault.over .bvh-vault-ic { color: var(--trn-st-failed); }
.bvh-vault-val { font-family: var(--trn-mono); font-size: 36px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.bvh-vault.over .bvh-vault-val { color: var(--trn-st-failed); }
.bvh-vault-lab { font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-text-dim); }
.bvh-health { position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); white-space: nowrap; }
.bvh-health-dot { width: 6px; height: 6px; border-radius: 50%; }
.bvh-health.healthy { color: var(--trn-st-completed); } .bvh-health.healthy .bvh-health-dot { background: var(--trn-st-completed); box-shadow: 0 0 6px var(--trn-st-completed); }
.bvh-health.watch { color: var(--trn-amber-strong); } .bvh-health.watch .bvh-health-dot { background: var(--trn-amber-strong); }
.bvh-health.tight { color: var(--trn-ember); } .bvh-health.tight .bvh-health-dot { background: var(--trn-ember); }
.bvh-health.over { color: var(--trn-st-failed); } .bvh-health.over .bvh-health-dot { background: var(--trn-st-failed); animation: bvh-blink 1.2s ease-in-out infinite; }
.bvh-health.none { color: var(--trn-text-dim); } .bvh-health.none .bvh-health-dot { background: var(--trn-text-dim); }

/* allocation rail */
.bvh-rail-wrap { position: relative; z-index: 1; margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--trn-border-soft); }
.bvh-rail { position: relative; display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--trn-st-completed) 16%, var(--trn-surface)); border: 1px solid var(--trn-border-soft); }
.bvh-seg { position: relative; display: block; height: 100%; transition: width 1.1s var(--trn-spring); }
.bvh-seg.spent { background: linear-gradient(90deg, color-mix(in srgb, var(--trn-amber) 60%, transparent), var(--trn-amber)); }
.bvh-seg.committed { background: repeating-linear-gradient(45deg, var(--trn-ember) 0, var(--trn-ember) 5px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 5px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 10px); }
.bvh-seg-glow { position: absolute; right: 0; top: 0; bottom: 0; width: 24px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4)); }
[data-theme="light"] .bvh-seg-glow { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7)); }
.bvh-rail-mark { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--trn-text-dim); transform: translateX(-1px); opacity: 0.5; }
.bvh-legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.bvh-leg { display: flex; align-items: center; gap: 9px; opacity: 0; transform: translateY(8px); animation: bvh-rise 0.5s var(--trn-spring) forwards; animation-delay: var(--d); }
.bvh-leg-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.bvh-leg.allocated .bvh-leg-dot { background: var(--trn-text-muted); }
.bvh-leg.spent .bvh-leg-dot { background: var(--trn-amber); }
.bvh-leg.committed .bvh-leg-dot { background: var(--trn-ember); }
.bvh-leg.remaining .bvh-leg-dot { background: var(--trn-st-completed); }
.bvh-leg-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.bvh-leg-v { font-family: var(--trn-mono); font-size: 17px; font-weight: 800; color: var(--trn-text); }
.bvh-leg.spent .bvh-leg-v { color: var(--trn-amber-strong); } .bvh-leg.committed .bvh-leg-v { color: var(--trn-ember); } .bvh-leg.remaining .bvh-leg-v { color: var(--trn-st-completed); }
.bvh-leg-l { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-dim); }

@keyframes bvh-drift { 0% { transform: translate3d(-3%, -2%, 0) scale(1); } 100% { transform: translate3d(4%, 3%, 0) scale(1.07); } }
@keyframes bvh-breathe { 0%, 100% { opacity: 0.45; transform: scale(0.93); } 50% { opacity: 0.85; transform: scale(1.07); } }
@keyframes bvh-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes bvh-rise { to { opacity: 1; transform: translateY(0); } }

@media (max-width: 880px) {
  .bvh-top { flex-direction: column-reverse; align-items: stretch; gap: 16px; }
  .bvh-vault { justify-self: center; margin: 0 auto; }
  .bvh-fy { width: 100%; flex: 1; }
  .bvh-legend { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .bvh-aurora, .bvh-vault-aura, .bvh-vault-sweep, .bvh-health.over .bvh-health-dot { animation: none !important; }
  .bvh-arc, .bvh-seg { transition: none !important; }
  .bvh-leg { animation: none; opacity: 1; transform: none; }
}
</style>
