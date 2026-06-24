<template>
  <div class="ret-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="ret ex-grain" :class="`p${a.phase}`">
      <span class="ret-glare" aria-hidden="true" />
      <span class="ret-spine" aria-hidden="true" />

      <header class="ret-head">
        <span class="ret-ico"><component :is="a.icon" :size="18" /></span>
        <div class="ret-id">
          <span class="ret-name">{{ a.name || a.tag || 'Asset' }}</span>
          <span class="ret-tag ex-mono">{{ a.tag || '—' }} · {{ a.typeLabel || 'Asset' }}</span>
        </div>
        <span class="ret-pill">{{ a.statusLabel }}</span>
      </header>

      <!-- recovery lifecycle stepper (held → recovered) -->
      <div v-if="a.phase !== 4" class="ret-step">
        <div class="step-line"><span class="step-fill" :style="{ width: fillPct + '%' }" /></div>
        <div class="step-nodes">
          <div v-for="(s, i) in STEPS" :key="s.key" class="node" :class="{ done: i < a.phase, on: i === a.phase }">
            <span class="node-dot"><component :is="s.icon" :size="11" /></span>
            <span class="node-lab">{{ s.label }}</span>
          </div>
        </div>
      </div>
      <!-- off-path terminal: lost / damaged -->
      <div v-else class="ret-short">
        <PackageX :size="14" /> <span>Not recovered — written off to the final settlement as a recovery charge.</span>
      </div>

      <footer class="ret-foot">
        <span class="ret-hint">
          <component :is="hint.icon" :size="12" /> {{ hint.text }}
        </span>
        <button class="ret-track" type="button" @click="$emit('fleet')">Track in Fleet <ArrowUpRight :size="12" /></button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Package, Hourglass, Truck, PackageCheck, PackageX, ArrowUpRight, AlertTriangle } from 'lucide-vue-next'
import { fmtDate } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  a: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['fleet'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const STEPS = [
  { key: 'held', label: 'Held', icon: Package },
  { key: 'requested', label: 'Requested', icon: Hourglass },
  { key: 'transit', label: 'Transit', icon: Truck },
  { key: 'recovered', label: 'Recovered', icon: PackageCheck },
]
const fillPct = computed(() => (Math.min(props.a.phase, 3) / (STEPS.length - 1)) * 100)
const hint = computed(() => {
  const a = props.a
  switch (a.phase) {
    case 4: return { icon: PackageX, text: `${a.statusLabel}${a.condition ? ' · ' + a.condition : ''}` }
    case 3: return { icon: PackageCheck, text: a.returnedDate ? `Returned ${fmtDate(a.returnedDate)}${a.condition ? ' · ' + a.condition : ''}` : 'Returned to store — recovered' }
    case 2: return { icon: Truck, text: 'Approved — in transit to store' }
    case 1: return { icon: Hourglass, text: 'Return requested — awaiting handover' }
    default: return { icon: AlertTriangle, text: 'Still held — flag a return task' }
  }
})
const reduced = prefersReduced()
</script>

<style scoped>
.ret-shell { animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.ret { position: relative; overflow: hidden; border-radius: 18px; padding: 14px; background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.3s var(--ex-spring), box-shadow 0.3s, border-color 0.3s; --c: var(--ex-steel); }
.ret.p0 { --c: var(--ex-steel); }
.ret.p1 { --c: var(--ex-amber); }
.ret.p2 { --c: var(--ex-ember); }
.ret.p3 { --c: var(--ex-cleared); }
.ret.p4 { --c: var(--ex-blocked); }
.ret:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px);
  box-shadow: var(--ex-shadow-hover); border-color: color-mix(in srgb, var(--c) 34%, transparent); }
.ret-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 3;
  background: radial-gradient(260px 180px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 22%, transparent), transparent 60%); }
.ret-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 50%, transparent); }

.ret-head { display: flex; align-items: center; gap: 11px; }
.ret-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.ret-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ret-name { font-size: 13.5px; font-weight: 750; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ret-tag { font-size: 10.5px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ret-pill { flex-shrink: 0; font-size: 10px; font-weight: 750; padding: 3px 9px; border-radius: 999px; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

.ret-step { position: relative; margin: 16px 4px 12px; }
.step-line { position: absolute; left: 7%; right: 7%; top: 9px; height: 3px; border-radius: 999px; background: var(--ex-steel-soft); overflow: hidden; }
.step-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--ex-amber), var(--ex-ember) 60%, var(--ex-cleared)); transition: width 0.7s var(--ex-spring); }
.step-nodes { position: relative; display: flex; justify-content: space-between; }
.node { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.node-dot { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 50%; color: var(--ex-text-dim);
  background: var(--ex-surface-elevated); border: 1.5px solid var(--ex-border-strong); transition: all 0.3s var(--ex-spring); }
.node.done .node-dot { color: #06281b; background: var(--ex-cleared); border-color: var(--ex-cleared); }
.node.on .node-dot { color: var(--c); border-color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 14%, transparent); }
.ret.p3 .node.on .node-dot { color: #06281b; background: var(--ex-cleared); border-color: var(--ex-cleared); }
.node-lab { font-size: 9px; font-weight: 700; color: var(--ex-text-dim); }
.node.done .node-lab, .node.on .node-lab { color: var(--ex-text-secondary); }

.ret-short { display: flex; align-items: center; gap: 8px; margin: 14px 2px 12px; padding: 9px 11px; border-radius: 11px; font-size: 11px; font-weight: 600; line-height: 1.4;
  color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 26%, transparent); }
.ret-short svg { flex-shrink: 0; }
.ret-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ret-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--ex-text-muted); min-width: 0; }
.ret-hint svg { color: var(--c); flex-shrink: 0; }
.ret-track { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 6px 10px; border-radius: 9px; cursor: pointer; font-size: 10.5px; font-weight: 750; font-family: inherit;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.ret-track:hover { border-color: var(--ex-violet-border); color: var(--ex-violet); }

[data-theme="light"] .node-dot { background: var(--ex-surface-elevated); }
@media (prefers-reduced-motion: reduce) { .ret-shell { animation: none; } .ret:hover { transform: none; } .step-fill, .node-dot { transition: none; } }
</style>
