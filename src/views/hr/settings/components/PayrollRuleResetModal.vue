<template>
  <SetModal :open="open" :title="`Reset ${rule?.label || 'rule'}`" subtitle="Pay & Statutory · Engine"
    :icon="RotateCcw" accent-color="var(--set-conflict)" :width="780" aside-placement="bottom" mode="delete" @close="$emit('close')">

    <div class="prr" :class="factsPlacement">
      <!-- ACTION ZONE -->
      <div class="prr-action">
        <!-- rollback dial: current → default -->
        <Motion as="div" class="prr-roll" :class="{ snapping: loading }"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="prr-roll-grain" aria-hidden="true" />
          <div class="prr-dial">
            <span class="prr-dial-ring" :style="{ '--prr-cur': `${curAngle}deg` }" aria-hidden="true" />
            <span class="prr-dial-def" :style="{ '--prr-def': `${defAngle}deg` }" aria-hidden="true" />
            <RotateCcw :size="18" class="prr-dial-ic" />
          </div>
          <div class="prr-roll-vals">
            <div class="prr-val cur"><span>Current</span><b class="set-mono">{{ pretty(currentValue) }}</b></div>
            <span class="prr-roll-arrow"><MoveRight :size="15" /></span>
            <div class="prr-val def"><span>Reverts to default</span><b class="set-mono">{{ pretty(defaultValue) }}</b></div>
          </div>
        </Motion>

        <!-- engine consumption banner -->
        <Motion as="div" class="prr-feed" :data-live="consumed"
          :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
          <span class="prr-feed-ic"><component :is="consumed ? Zap : CircleDashed" :size="15" /></span>
          <div class="prr-feed-body">
            <b>{{ consumed ? `Read live by ${moduleLabel}` : `Advisory — ${moduleLabel} doesn’t read it yet` }}</b>
            <span>{{ consumed
              ? `Resetting changes how ${moduleLabel} calculates from the next run. In-flight & released payslips are untouched.`
              : `This knob is recorded but the engine still uses its built-in behaviour — resetting only clears your override.` }}</span>
          </div>
          <button class="prr-feed-go" @click="$emit('go', consumedBy)">Open <ArrowUpRight :size="11" /></button>
        </Motion>

        <!-- reason -->
        <div class="prr-reason">
          <span class="prr-reason-lab">Reason for reset <i>(sealed into the settings ledger)</i></span>
          <div class="prr-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="prr-preset" :class="{ on: reason === p }" @click="pick(p)">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="prr-textarea" placeholder="Add context — e.g. reverting the LOP basis after finance review…" />
        </div>
      </div>

      <!-- FACTS ZONE (left when ≤3, bottom when >3) -->
      <aside class="prr-facts">
        <span class="prr-facts-edge" aria-hidden="true" />
        <header class="prr-facts-head"><FileText :size="12" /> Rule record</header>
        <div class="prr-facts-grid">
          <Motion v-for="(f, i) in facts" :key="f.label" as="div" class="prr-fact"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.36, delay: 0.06 + i * 0.04, ease: [0.16, 1, 0.3, 1] }">
            <span class="prr-fact-ic" :data-tone="f.tone"><component :is="f.icon" :size="13" /></span>
            <div class="prr-fact-body">
              <span class="prr-fact-lab">{{ f.label }}</span>
              <b :class="{ muted: !f.set }">{{ f.value }}</b>
            </div>
          </Motion>
        </div>
      </aside>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="RotateCcw" title="What resetting a rule does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn prr-confirm" :class="{ disabled: loading }"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="loading ? {} : { scale: 0.96 }"
        :disabled="loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><RotateCcw v-else :size="14" />
        Reset to default
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RotateCcw, Loader, FileText, MoveRight, ArrowUpRight, Zap, CircleDashed,
  Hash, Sparkles, ListChecks, Globe, SlidersHorizontal,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  rule: { type: Object, default: null },              // {key,label,group,type,options}
  currentValue: { type: [String, Number], default: '' },
  defaultValue: { type: [String, Number], default: '' },
  consumed: { type: Boolean, default: false },
  consumedBy: { type: String, default: 'payroll' },
})
defineEmits(['close', 'confirm', 'go'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Reverting a misconfiguration', 'Finance review', 'Policy change', 'Back to standard', 'Created in error']
const pick = (p) => { reason.value = reason.value === p ? '' : p }

const pretty = (o) => (o === '' || o == null) ? '—' : String(o).split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
const moduleLabel = computed(() => MODULES[props.consumedBy]?.label || 'Payroll')

// dial angles — option index (select) or normalised position (number)
const angleFor = (val) => {
  const r = props.rule || {}
  if (r.type === 'select' && Array.isArray(r.options) && r.options.length) {
    const idx = Math.max(0, r.options.findIndex(o => String(o) === String(val)))
    return Math.round((idx / Math.max(1, r.options.length - 1)) * 300) + 30
  }
  const n = Number(val) || 0
  return Math.round(Math.min(1, n / 31) * 300) + 30   // rough fill for numeric knobs
}
const curAngle = computed(() => angleFor(props.currentValue))
const defAngle = computed(() => angleFor(props.defaultValue))

const facts = computed(() => {
  const r = props.rule || {}
  const list = [
    { label: 'Current value', value: pretty(props.currentValue), set: true, icon: SlidersHorizontal, tone: 'gold' },
    { label: 'Built-in default', value: pretty(props.defaultValue), set: true, icon: Sparkles, tone: 'ok' },
    { label: 'Group', value: r.group || '—', set: !!r.group, icon: Hash, tone: 'steel' },
  ]
  if (r.type === 'select') list.push({ label: 'Choices', value: `${(r.options || []).length} options`, set: true, icon: ListChecks, tone: 'steel' })
  if (r.type === 'select') list.push({ label: 'Scope', value: 'Org-wide · all FYs', set: true, icon: Globe, tone: 'steel' })
  return list
})
// ≤3 facts → left rail; >3 → bottom strip (dynamic by field richness)
const factsPlacement = computed(() => (facts.value.length > 3 ? 'stacked' : 'side'))

const affects = ['payroll', 'payslips', 'exit'].map((s) => MODULES[s]).filter(Boolean).map((m) => ({ icon: m.icon, label: m.label }))
const summary = computed(() => `Resetting ${props.rule?.label || 'this rule'} removes your stored override so the engine falls back to its built-in default (${pretty(props.defaultValue)}).`)
const steps = computed(() => [
  { icon: SlidersHorizontal, title: 'Override cleared', text: `Your value (${pretty(props.currentValue)}) is removed from the calculation policy.` },
  { icon: Sparkles, title: 'Default restored', text: `The engine resolves ${props.rule?.label || 'the rule'} to ${pretty(props.defaultValue)} on the next computation.` },
  { icon: Zap, title: 'Forward-only', text: 'Already-released payslips & settlements are immutable — only future runs change.' },
  { icon: FileText, title: 'Audited', text: 'The reset and your reason are sealed into the settings ledger.' },
])
const note = computed(() => 'Resetting is reversible — set the value again any time to re-establish the override.')
</script>

<style scoped>
.prr { display: grid; gap: 16px; }
.prr.side { grid-template-columns: minmax(0, 232px) minmax(0, 1fr); align-items: start; }
.prr.side .prr-action { order: 2; }
.prr.side .prr-facts { order: 1; }
.prr.stacked { grid-template-columns: 1fr; }
.prr.stacked .prr-facts { order: 2; }

.prr-action { display: flex; flex-direction: column; gap: 13px; }

/* rollback dial */
.prr-roll { position: relative; overflow: hidden; display: flex; align-items: center; gap: 16px; padding: 15px 16px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); transition: opacity 0.5s, filter 0.5s; }
.prr-roll.snapping { opacity: 0.55; filter: grayscale(0.4); }
.prr-roll-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08) 0.5px, transparent 1.4px); background-size: 24px 24px; }
.prr-dial { position: relative; display: grid; place-items: center; width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%;
  background: var(--set-surface); border: 1px solid var(--set-border); }
.prr-dial-ic { position: relative; z-index: 3; color: var(--set-conflict); }
.prr-dial-ring { position: absolute; inset: -1px; border-radius: 50%; padding: 2px; pointer-events: none;
  background: conic-gradient(from 210deg, var(--set-amber) var(--prr-cur, 180deg), transparent 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0.85; transition: background 0.7s var(--set-spring); }
.prr-dial-def { position: absolute; inset: -1px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 210deg, transparent calc(var(--prr-def, 180deg) - 3deg), var(--set-ok) var(--prr-def, 180deg), transparent calc(var(--prr-def, 180deg) + 3deg)); }
.prr-roll.snapping .prr-dial-ring { background: conic-gradient(from 210deg, var(--set-ok) var(--prr-def, 180deg), transparent 0); }

.prr-roll-vals { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.prr-val { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.prr-val span { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.prr-val b { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prr-val.cur b { color: var(--set-amber); }
.prr-roll.snapping .prr-val.cur b { text-decoration: line-through; opacity: 0.5; }
.prr-val.def b { color: var(--set-ok); }
.prr-roll-arrow { color: var(--set-text-dim); flex-shrink: 0; }

/* engine feed banner */
.prr-feed { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.prr-feed[data-live="true"] { border-left-color: var(--set-ok); background: color-mix(in srgb, var(--set-ok) 6%, var(--set-surface)); }
.prr-feed-ic { flex-shrink: 0; margin-top: 1px; color: var(--set-text-muted); }
.prr-feed[data-live="true"] .prr-feed-ic { color: var(--set-ok); }
.prr-feed-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.prr-feed-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.prr-feed-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.prr-feed-go { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-amber); background: var(--set-pad);
  border: 1px solid color-mix(in srgb, var(--set-amber) 30%, transparent); transition: all 0.2s; }
.prr-feed-go:hover { background: color-mix(in srgb, var(--set-amber) 16%, transparent); }

.prr-reason { display: flex; flex-direction: column; gap: 7px; }
.prr-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.prr-reason-lab i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; }
.prr-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.prr-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.prr-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.prr-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.prr-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.prr-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.prr-textarea::placeholder { color: var(--hr-input-placeholder); }

.prr-facts { position: relative; padding: 14px 14px 12px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.prr-facts-edge { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-ember), color-mix(in srgb, var(--set-ember) 24%, transparent)); }
.prr-facts-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 11px; }
.prr-facts-head :deep(svg) { color: var(--set-ember); }
.prr-facts-grid { display: flex; flex-direction: column; gap: 8px; }
.prr.stacked .prr-facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 9px; }
.prr-fact { display: flex; align-items: center; gap: 9px; }
.prr-fact-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 12%, transparent); }
.prr-fact-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.prr-fact-ic[data-tone="gold"] { color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 12%, transparent); }
.prr-fact-ic[data-tone="steel"] { color: var(--set-text-muted); background: var(--set-surface-elevated); }
.prr-fact-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.prr-fact-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.prr-fact-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prr-fact-body b.muted { color: var(--set-text-dim); font-weight: 600; }

.prr-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.prr-confirm:hover { color: #fff; }
.prr-confirm.disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 640px) {
  .prr.side { grid-template-columns: 1fr; }
  .prr.side .prr-action { order: 1; }
  .prr.side .prr-facts { order: 2; }
  .prr-roll { flex-direction: column; align-items: stretch; text-align: center; }
  .prr-roll-vals { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .prr-dial-ring { transition: none; }
}
</style>
