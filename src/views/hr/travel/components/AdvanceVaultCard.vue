<template>
  <div class="av-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="av" :class="{ live: gate.live, terminal: !!gate.terminal }" :style="{ '--c': meta.hex }">
      <span class="av-glare" aria-hidden="true" />
      <span class="av-spine" />

      <!-- header -->
      <header class="av-head">
        <button class="av-num trv-mono" @click="$emit('detail', a)" title="Open advance">{{ a.advance_number }}</button>
        <span class="av-pill" :style="{ '--c': meta.hex }">
          <component :is="meta.icon" :size="11" /> {{ meta.label }}
        </span>
      </header>

      <!-- body: liquid gauge + amount -->
      <div class="av-body">
        <div class="av-gauge" :class="{ live: gate.live }">
          <span class="avg-fill" :style="{ height: drawn ? fillPct + '%' : '0%', '--c': meta.hex }">
            <i v-if="gate.live" class="avg-bubble b1" /><i v-if="gate.live" class="avg-bubble b2" />
            <span class="avg-meniscus" />
          </span>
          <span v-if="trimmed" class="avg-ghost" title="Originally requested" />
        </div>
        <div class="av-amt-wrap">
          <span class="av-amt trv-mono">{{ fmtINR(effective) }}</span>
          <span v-if="trimmed" class="av-trim">
            <Scissors :size="10" /> trimmed from {{ fmtCompactINR(a.advance_amount) }}
          </span>
          <span v-else-if="a.status === 'REQUESTED'" class="av-req">requested</span>
          <span v-else class="av-req">approved in full</span>
        </div>
      </div>

      <!-- who -->
      <div class="av-who">
        <span class="aw-name" :title="a.employee_name">{{ a.employee_name || '—' }}</span>
        <button class="aw-ref trv-mono" @click="$emit('go', { tab: 'requests', filter: { q: a.travel_reference_number } })"
          :title="`Open tour ${a.travel_reference_number}`">
          {{ a.travel_reference_number }} <ArrowUpRight :size="10" />
        </button>
      </div>

      <!-- lifecycle gate stepper -->
      <div class="av-gates" :class="{ rejected: gate.terminal === 'REJECTED', cancelled: gate.terminal === 'CANCELLED' }">
        <template v-for="(g, i) in gates" :key="g.key">
          <div class="gate" :class="g.cls">
            <span class="gate-node"><component :is="g.icon" :size="11" /></span>
            <span class="gate-lab">{{ g.label }}</span>
          </div>
          <span v-if="i < gates.length - 1" class="gate-link" :class="{ on: gates[i + 1].cls.done || gates[i + 1].cls.current }" />
        </template>
      </div>

      <!-- footer: payroll / recovery + actions -->
      <footer class="av-foot">
        <div class="av-meta">
          <span v-if="a.payroll_ref" class="av-tag pay" :title="`Posted to payroll · ${a.payroll_ref}`"><Wallet :size="10" /> {{ a.payroll_ref }}</span>
          <span v-if="a.status === 'RECOVERED' && a.recovered_amount" class="av-tag rec"><RotateCcw :size="10" /> recovered {{ fmtCompactINR(a.recovered_amount) }}</span>
          <span v-if="a.status === 'REJECTED' && a.reject_reason" class="av-tag rej" :title="a.reject_reason"><Ban :size="10" /> rejected</span>
        </div>
        <div class="av-actions">
          <Motion v-if="a.status === 'REQUESTED'" as="button" class="mini primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('approve', a)"><Check :size="13" /> Approve</Motion>
          <Motion v-if="a.status === 'APPROVED'" as="button" class="mini primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('release', a)"><Wallet :size="13" /> Release</Motion>
          <button v-if="['REQUESTED','APPROVED'].includes(a.status)" class="mini ghost danger" @click="$emit('reject', a)"><X :size="13" /></button>
          <button class="mini ghost" @click="$emit('detail', a)" title="Details"><FileText :size="13" /></button>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { ArrowUpRight, Wallet, RotateCcw, Ban, Check, X, FileText, Scissors } from 'lucide-vue-next'
import { fmtINR, fmtCompactINR, advanceMeta, advanceGateState, advanceEffective, ADVANCE_GATES } from '@/composables/useTravel'
import { usePointerSpotlight, useInView, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ a: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['approve', 'release', 'reject', 'detail', 'go'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const meta = computed(() => advanceMeta(props.a.status))
const effective = computed(() => advanceEffective(props.a))
const trimmed = computed(() => props.a.approved_amount != null && Number(props.a.approved_amount) < Number(props.a.advance_amount))
const fillPct = computed(() => {
  if (['REJECTED', 'CANCELLED'].includes(props.a.status)) return 12
  const req = Number(props.a.advance_amount) || 0
  if (props.a.status === 'REQUESTED' || !req) return 100
  return Math.max(8, Math.min(100, (effective.value / req) * 100))
})

const gate = computed(() => advanceGateState(props.a))
const gates = computed(() => ADVANCE_GATES.map((g, i) => {
  const r = gate.value
  let cls
  if (r.terminal && i > r.reached) cls = { failed: true }
  else if (r.reached === 3) cls = { done: true }
  else if (i < r.reached) cls = { done: true }
  else if (i === r.reached && !r.terminal) cls = { current: true }
  else if (i === r.reached && r.terminal) cls = { done: true }
  else cls = { pending: true }
  // closure gate gets a recovery flavour
  const label = (i === 3 && r.recovered) ? 'Recovered' : g.label
  return { ...g, label, cls }
}))

// draw-on gauge
const drawn = ref(false)
const { visible } = useInView(cardEl, { threshold: 0.3 })
watch(visible, (v) => { if (v) requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true })) })
onMounted(() => { if (prefersReduced()) drawn.value = true })
</script>

<style scoped>
.av-shell { animation: trv-deal 0.5s var(--trv-spring) both; animation-delay: calc(var(--i, 0) * 0.045s); }
.av {
  position: relative; overflow: hidden; padding: 15px 17px 14px; border-radius: 17px;
  background: var(--trv-surface); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-card-shadow);
  transition: transform 0.3s var(--trv-spring), border-color 0.3s, box-shadow 0.3s;
  will-change: transform;
}
.av:hover {
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 38%, var(--trv-border-strong));
  box-shadow: var(--trv-shadow-hover);
}
.av-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 16%, transparent), transparent 60%); }
.av-spine { position: absolute; top: 12px; bottom: 12px; left: 0; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 60%, transparent); }
.av.live .av-spine { animation: trv-spine-pulse 2s ease-in-out infinite; }

.av-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.av-num { font-size: 11.5px; font-weight: 800; color: var(--trv-amber-bright); background: none; border: none; padding: 0; cursor: pointer; letter-spacing: 0.02em; }
.av-num:hover { text-decoration: underline; }
.av-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

.av-body { display: flex; align-items: center; gap: 14px; }
.av-gauge { position: relative; width: 28px; height: 54px; border-radius: 8px; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(100deg, rgba(0,0,0,0.4), rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.4));
  border: 1px solid var(--trv-border-strong); box-shadow: inset 0 1px 6px rgba(0,0,0,0.5); }
.avg-fill { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 0 0 7px 7px; transition: height 1s var(--trv-spring);
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 85%, transparent), color-mix(in srgb, var(--c) 45%, transparent));
  box-shadow: inset 0 0 12px color-mix(in srgb, var(--c) 50%, transparent); }
.avg-meniscus { position: absolute; top: -1px; left: 0; right: 0; height: 2px; background: color-mix(in srgb, var(--c) 90%, #fff 30%); box-shadow: 0 0 6px var(--c); }
.avg-bubble { position: absolute; bottom: 2px; width: 3px; height: 3px; border-radius: 50%; background: rgba(255,247,220,0.85); animation: avg-rise linear infinite; }
.avg-bubble.b1 { left: 30%; animation-duration: 3.2s; }
.avg-bubble.b2 { left: 64%; animation-duration: 4.1s; animation-delay: 1.2s; }
.avg-ghost { position: absolute; left: 0; right: 0; top: 0; height: 1px; border-top: 1px dashed var(--trv-amber-border); }
.av-amt-wrap { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.av-amt { font-size: 25px; font-weight: 860; color: var(--trv-text); line-height: 1; letter-spacing: -0.01em; }
.av-trim { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--trv-st-returned); }
.av-req { font-size: 10px; color: var(--trv-text-dim); }

.av-who { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 12px 0 13px; }
.aw-name { font-size: 12.5px; font-weight: 650; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aw-ref { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--trv-amber); background: none; border: none; padding: 0; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.aw-ref:hover { text-decoration: underline; }

/* gate stepper */
.av-gates { display: flex; align-items: flex-start; gap: 0; margin-bottom: 13px; }
.gate { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; width: 46px; }
.gate-node { display: inline-flex; padding: 5px; border-radius: 50%; color: var(--trv-text-dim);
  background: var(--trv-panel); border: 1px solid var(--trv-border); transition: all 0.3s; }
.gate-lab { font-size: 8.5px; font-weight: 650; color: var(--trv-text-dim); text-align: center; }
.gate-link { flex: 1; height: 2px; margin-top: 12px; border-radius: 2px; background: var(--trv-border); transition: background 0.5s; }
.gate-link.on { background: var(--trv-st-approved); }
.gate.done .gate-node { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); border-color: color-mix(in srgb, var(--trv-st-approved) 40%, transparent); }
.gate.done .gate-lab { color: var(--trv-text-secondary); }
.gate.current .gate-node { color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 12%, transparent); }
.gate.current .gate-lab { color: var(--c); font-weight: 750; }
.av-gates.rejected .gate.failed .gate-node, .av-gates.cancelled .gate.failed .gate-node { opacity: 0.4; }
.av.live .gate.current .gate-node { animation: trv-board-pulse 2.2s ease-in-out infinite; }

/* footer */
.av-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding-top: 11px; border-top: 1px solid var(--trv-border); }
.av-meta { display: flex; gap: 5px; flex-wrap: wrap; min-height: 18px; }
.av-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 650; padding: 2px 7px; border-radius: 6px; }
.av-tag.pay { color: var(--trv-st-completed); background: var(--trv-st-completed-soft); }
.av-tag.rec { color: #c084fc; background: rgba(192,132,252,0.12); }
.av-tag.rej { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }
.av-actions { display: flex; gap: 6px; align-items: center; }
.mini { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.mini.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.mini.ghost { background: var(--trv-panel); border-color: var(--trv-border-strong); color: var(--trv-text-secondary); padding: 7px 9px; }
.mini.ghost:hover { color: var(--trv-text); }
.mini.ghost.danger:hover { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }

@keyframes avg-rise { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 0.9; } 100% { transform: translateY(-44px); opacity: 0; } }

[data-theme="light"] .av-gauge { background: linear-gradient(100deg, rgba(120,90,30,0.1), rgba(255,255,255,0.55) 50%, rgba(120,90,30,0.1)); }

@media (prefers-reduced-motion: reduce) {
  .av-shell { animation: none; }
  .av:hover { transform: translateY(-3px); }
  .avg-fill, .gate-link, .gate-node { transition: none; }
  .av.live .av-spine, .av.live .gate.current .gate-node, .avg-bubble { animation: none; }
}
</style>
