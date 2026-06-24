<template>
  <Motion ref="rootRef" as="section" class="ssj ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="ssj-aura" aria-hidden="true" />
    <span class="ssj-grid" aria-hidden="true" />
    <span v-for="m in motes" :key="'m' + m.i" class="ssj-mote" aria-hidden="true"
      :style="{ left: m.x + '%', bottom: m.y + '%', animationDuration: m.d + 's', animationDelay: m.delay + 's' }" />

    <header class="ssj-head">
      <span class="ssj-eyebrow"><Footprints :size="12" /> My passage</span>
      <span class="ssj-meta">
        <b class="ex-mono">Stage {{ Math.min(currentIndex + 1, stages.length) }}</b> of {{ stages.length }}
        <span class="ssj-prog"><span class="ssj-prog-fill" :style="{ width: pct + '%' }" /></span>
        <b class="ssj-pct ex-mono">{{ pct }}%</b>
      </span>
    </header>

    <div ref="railRef" class="ssj-rail">
      <div class="ssj-track">
        <template v-for="(s, i) in stages" :key="s.key">
          <span v-if="i > 0" class="ssj-link" :class="linkClass(i)" aria-hidden="true">
            <span class="ssj-link-flux" />
          </span>
          <div class="ssj-node" :class="nodeStatus(i)" :style="{ '--d': (i * 0.06) + 's' }"
            :ref="el => setNodeRef(el, i)">
            <span class="ssj-node-orb">
              <span class="ssj-node-ring" aria-hidden="true" />
              <component :is="i === currentIndex && !closed ? s.icon : (statusOf(i) === 'done' ? Check : s.icon)" :size="16" />
              <span v-if="statusOf(i) === 'current'" class="ssj-here" aria-hidden="true">
                <span class="ssj-here-pulse" /><span class="ssj-here-pulse p2" />
              </span>
            </span>
            <span class="ssj-node-lab">{{ shortLabel(s.key) }}</span>
            <span v-if="statusOf(i) === 'current'" class="ssj-now">You are here</span>
          </div>
        </template>

        <!-- gateway of light at the end -->
        <span class="ssj-gateway" :class="{ sealed: fullyDone }" aria-hidden="true">
          <span class="ssj-gateway-beam" />
          <DoorOpen :size="18" />
        </span>
      </div>
    </div>

    <p v-if="closed" class="ssj-closed"><Info :size="13" /> This separation is {{ closedLabel }} — the journey is closed.</p>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { Footprints, Check, DoorOpen, Info } from 'lucide-vue-next'
import { EXIT_STAGES } from '@/composables/useExit'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  // exitStageState(c) → { done:{key:bool}, currentIndex, lifecycle, closed }
  state: { type: Object, default: () => ({ done: {}, currentIndex: 0, closed: false }) },
  closedReason: { type: String, default: '' }, // 'WITHDRAWN' | 'REJECTED' | 'CANCELLED'
})

const reduced = prefersReduced()
const rootRef = ref(null)
const railRef = ref(null)
useInView(rootRef, { threshold: 0.15 })

const stages = EXIT_STAGES
const SHORT = {
  resignation: 'Resign', approval: 'Approve', notice: 'Notice', handover: 'Handover',
  interview: 'Interview', clearance: 'Clearance', assets: 'Assets', settlement: 'F&F',
  experience: 'Experience', relieving: 'Relieving', archived: 'Closed',
}
const shortLabel = (k) => SHORT[k] || k

const closed = computed(() => !!props.state?.closed)
const currentIndex = computed(() => Math.max(0, props.state?.currentIndex ?? 0))
const done = computed(() => props.state?.done || {})
const doneCount = computed(() => stages.filter(s => done.value[s.key]).length)
const pct = computed(() => Math.round((doneCount.value / stages.length) * 100))
const fullyDone = computed(() => doneCount.value >= stages.length || done.value.relieving)
const closedLabel = computed(() => ({ WITHDRAWN: 'withdrawn', REJECTED: 'not accepted', CANCELLED: 'cancelled' }[props.closedReason] || 'closed'))

const statusOf = (i) => {
  if (closed.value) return 'closed'
  if (done.value[stages[i].key]) return 'done'
  if (i === currentIndex.value) return 'current'
  return 'future'
}
const nodeStatus = (i) => `st-${statusOf(i)}`
const linkClass = (i) => {
  if (closed.value) return 'lk-closed'
  if (i <= currentIndex.value && done.value[stages[i - 1].key]) return 'lk-done'
  if (i === currentIndex.value) return 'lk-active'
  return 'lk-future'
}

// scroll the current node into view on mount
const nodeRefs = {}
const setNodeRef = (el, i) => { if (el) nodeRefs[i] = el }
onMounted(async () => {
  await nextTick()
  const el = nodeRefs[currentIndex.value]
  if (el && railRef.value) {
    const target = el.offsetLeft - railRef.value.clientWidth / 2 + el.clientWidth / 2
    railRef.value.scrollTo({ left: Math.max(0, target), behavior: reduced ? 'auto' : 'smooth' })
  }
})

const motes = Array.from({ length: 9 }, (_, i) => {
  let s = (i * 9301 + 49297) % 233280
  const x = 5 + (s / 233280) * 90
  s = (s * 9301 + 49297) % 233280
  return { i, x, y: 6 + (s / 233280) * 30, d: 6 + (i % 4) * 2, delay: (i % 5) * 0.8 }
})
</script>

<style scoped>
.ssj { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 18px 20px 20px;
  background: var(--ex-panel); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.ssj-aura { position: absolute; inset: -50% 0 30% 60%; pointer-events: none;
  background: radial-gradient(60% 80% at 80% 20%, rgba(251, 146, 60, 0.2), transparent 70%); animation: ex-aura-drift 13s ease-in-out infinite; }
.ssj-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.45;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 28px 28px, 28px 28px; -webkit-mask: linear-gradient(180deg, transparent, #000 40%, #000 80%, transparent); mask: linear-gradient(180deg, transparent, #000 40%, #000 80%, transparent); }
[data-theme="light"] .ssj-grid { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }
.ssj-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--ex-amber-bright);
  box-shadow: 0 0 6px var(--ex-ember); opacity: 0; animation: ssj-rise linear infinite; pointer-events: none; }

.ssj-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.ssj-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-violet); }
.ssj-meta { display: inline-flex; align-items: center; gap: 9px; font-size: 11.5px; color: var(--ex-text-muted); }
.ssj-meta b { color: var(--ex-text); font-weight: 800; }
.ssj-prog { width: 120px; height: 4px; border-radius: 4px; overflow: hidden; background: var(--ex-steel-soft); }
.ssj-prog-fill { display: block; height: 100%; border-radius: 4px; background: var(--ex-grad-hero); box-shadow: 0 0 10px -1px color-mix(in srgb, var(--ex-amber) 60%, transparent); transition: width 0.8s var(--ex-spring); }
.ssj-pct { color: var(--ex-text) !important; }

.ssj-rail { position: relative; z-index: 2; overflow-x: auto; padding: 8px 2px 4px; scrollbar-width: thin;
  -webkit-mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
.ssj-rail::-webkit-scrollbar { height: 5px; }
.ssj-rail::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }
.ssj-track { display: flex; align-items: flex-start; gap: 0; min-width: max-content; padding: 18px 6px 4px; }

.ssj-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; width: 80px; flex-shrink: 0;
  animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: var(--d); }
.ssj-node-orb { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; transition: all 0.4s var(--ex-spring); }
.ssj-node-ring { position: absolute; inset: -4px; border-radius: 17px; pointer-events: none; }
.ssj-node-lab { font-size: 10.5px; font-weight: 750; text-align: center; line-height: 1.15; color: var(--ex-text-muted); transition: color 0.3s; }

.st-future .ssj-node-orb { color: var(--ex-text-dim); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.st-closed .ssj-node-orb { color: var(--ex-text-dim); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); opacity: 0.6; }
.st-done .ssj-node-orb { color: #06281b; background: linear-gradient(135deg, #6ee7b7, #34d399 60%, #10b981); border: 1px solid color-mix(in srgb, var(--ex-cleared) 50%, transparent);
  box-shadow: 0 0 18px -4px color-mix(in srgb, var(--ex-cleared) 70%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
.st-done .ssj-node-lab { color: var(--ex-cleared); }
.st-current .ssj-node-orb { color: #1a1206; background: var(--ex-grad-hero); border: 1px solid var(--ex-amber-border);
  box-shadow: var(--ex-violet-glow), inset 0 1px 0 rgba(255, 255, 255, 0.25); transform: scale(1.12); animation: ssj-breathe 2.6s ease-in-out infinite; }
.st-current .ssj-node-ring { border: 1.5px solid var(--ex-amber-border); animation: ssj-ring 2.8s ease-out infinite; }
.st-current .ssj-node-lab { color: var(--ex-text); font-weight: 850; }

.ssj-here { position: absolute; inset: 0; pointer-events: none; }
.ssj-here-pulse { position: absolute; inset: 0; border-radius: 14px; border: 1.5px solid var(--ex-ember); opacity: 0; animation: ssj-here 2.4s ease-out infinite; }
.ssj-here-pulse.p2 { animation-delay: 1.2s; }
.ssj-now { font-size: 8.5px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-ember);
  padding: 2px 7px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); white-space: nowrap; }

.ssj-link { position: relative; flex-shrink: 0; width: 30px; height: 3px; margin-top: 20px; border-radius: 3px; overflow: hidden; transition: background 0.4s; }
.lk-future { background: var(--ex-border-strong); }
.lk-closed { background: var(--ex-border); opacity: 0.5; }
.lk-active { background: var(--ex-amber-border); }
.lk-active .ssj-link-flux { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--ex-amber-bright), transparent); transform: translateX(-100%); animation: ssj-flux 1.8s linear infinite; }
.lk-done { background: linear-gradient(90deg, color-mix(in srgb, var(--ex-cleared) 70%, transparent), color-mix(in srgb, var(--ex-cleared) 45%, transparent)); }
.lk-done .ssj-link-flux { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent); transform: translateX(-100%); animation: ssj-flux 3s linear infinite; }
.lk-future .ssj-link-flux, .lk-closed .ssj-link-flux { display: none; }

.ssj-gateway { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 50px; height: 50px; margin: 14px 0 0 8px; border-radius: 16px; color: var(--ex-text-dim);
  background: var(--ex-steel-soft); border: 1px dashed var(--ex-border-strong); transition: all 0.5s var(--ex-spring); }
.ssj-gateway.sealed { color: #1a1206; background: var(--ex-grad-sun); border: 1px solid var(--ex-amber-border); box-shadow: 0 0 30px -4px rgba(251, 146, 60, 0.7); }
.ssj-gateway-beam { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(circle, rgba(252, 211, 77, 0.5), transparent 70%); }
.ssj-gateway.sealed .ssj-gateway-beam { opacity: 1; animation: ssj-beam 3s ease-in-out infinite; }

.ssj-closed { position: relative; z-index: 2; display: inline-flex; align-items: center; gap: 7px; margin: 12px 2px 0; font-size: 12px; font-weight: 600; color: var(--ex-text-muted); }
.ssj-closed svg { color: var(--ex-text-dim); }

@keyframes ssj-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 14% { opacity: 0.8; } 100% { transform: translateY(-90px) scale(0.4); opacity: 0; } }
@keyframes ssj-breathe { 0%, 100% { transform: scale(1.12); } 50% { transform: scale(1.18); } }
@keyframes ssj-ring { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes ssj-here { 0% { transform: scale(1); opacity: 0.7; } 70%, 100% { transform: scale(1.7); opacity: 0; } }
@keyframes ssj-flux { 0% { transform: translateX(-100%); } 100% { transform: translateX(220%); } }
@keyframes ssj-beam { 0%, 100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.15); } }

@media (prefers-reduced-motion: reduce) {
  .ssj-aura, .ssj-mote, .ssj-node, .st-current .ssj-node-orb, .st-current .ssj-node-ring, .ssj-here-pulse, .ssj-link-flux, .ssj-gateway-beam { animation: none !important; }
  .ssj-mote { display: none; }
  .ssj-prog-fill, .ssj-node-orb, .ssj-gateway { transition: none; }
}
</style>
