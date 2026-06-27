<template>
  <SetModal :open="open" :title="`Revert ${policy?.label || 'policy'}`" :subtitle="`${moduleLabel} · Routing`"
    :icon="RotateCcw" accent-color="var(--set-conflict)" :width="800" aside-placement="bottom" mode="delete" @close="$emit('close')">

    <div class="arx stacked">
      <!-- ACTION ZONE -->
      <div class="arx-action">
        <!-- rollback: current chain → default chain -->
        <Motion as="div" class="arx-roll" :class="{ snapping: loading }"
          :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="arx-roll-grain" aria-hidden="true" />

          <div class="arx-lane cur">
            <header class="arx-lane-head"><Pencil :size="11" /> Current routing<b>{{ currentChain.length }} stage{{ currentChain.length === 1 ? '' : 's' }}</b></header>
            <div class="arx-chips">
              <span class="arx-origin"><User :size="12" /></span>
              <template v-for="(s, i) in currentChain" :key="'c' + i">
                <span class="arx-wire" aria-hidden="true" />
                <span class="arx-chip" :style="{ '--acc': mc(s).color }">
                  <component :is="mc(s).icon" :size="12" /><span>{{ s.label || mc(s).label }}</span>
                </span>
              </template>
              <span class="arx-wire" aria-hidden="true" />
              <span class="arx-term"><CheckCheck :size="12" /></span>
            </div>
          </div>

          <span class="arx-morph"><MoveDown :size="16" /></span>

          <div class="arx-lane def">
            <header class="arx-lane-head"><Sparkles :size="11" /> Reverts to system default<b>{{ defaultChain.length }} stage{{ defaultChain.length === 1 ? '' : 's' }}</b></header>
            <div class="arx-chips">
              <span class="arx-origin"><User :size="12" /></span>
              <template v-for="(s, i) in defaultChain" :key="'d' + i">
                <span class="arx-wire ok" aria-hidden="true" />
                <span class="arx-chip def" :style="{ '--acc': mc(s).color }">
                  <component :is="mc(s).icon" :size="12" /><span>{{ s.label || mc(s).label }}</span>
                </span>
              </template>
              <span class="arx-wire ok" aria-hidden="true" />
              <span class="arx-term ok"><CheckCheck :size="12" /></span>
            </div>
          </div>
        </Motion>

        <!-- live-consumption banner (every module here is wired) -->
        <Motion as="div" class="arx-feed"
          :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
          <span class="arx-feed-ic"><Zap :size="15" /></span>
          <div class="arx-feed-body">
            <b>Read live by {{ moduleLabel }}</b>
            <span>New {{ moduleLabel.toLowerCase() }} requests will route through the default chain from now. <strong>In-flight requests keep the chain they were submitted under</strong> — each request snapshots its routing, so nothing already moving is disturbed.</span>
          </div>
          <button class="arx-feed-go" @click="$emit('go', moduleSlug)">Open {{ moduleLabel }} <ArrowUpRight :size="11" /></button>
        </Motion>

        <!-- reason -->
        <div class="arx-reason">
          <span class="arx-reason-lab">Reason for revert <i>(sealed into the settings ledger)</i></span>
          <div class="arx-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="arx-preset" :class="{ on: reason === p }" @click="pick(p)">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="arx-textarea" placeholder="Add context — e.g. standardising routing across all leave types after policy review…" />
        </div>
      </div>

      <!-- FACTS -->
      <aside class="arx-facts">
        <span class="arx-facts-edge" aria-hidden="true" />
        <header class="arx-facts-head"><FileText :size="12" /> Policy record</header>
        <div class="arx-facts-grid">
          <Motion v-for="(f, i) in facts" :key="f.label" as="div" class="arx-fact"
            :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.36, delay: 0.06 + i * 0.04, ease: [0.16, 1, 0.3, 1] }">
            <span class="arx-fact-ic" :data-tone="f.tone"><component :is="f.icon" :size="13" /></span>
            <div class="arx-fact-body">
              <span class="arx-fact-lab">{{ f.label }}</span>
              <b :class="{ muted: !f.set }">{{ f.value }}</b>
            </div>
          </Motion>
        </div>
      </aside>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="RotateCcw" title="What reverting routing does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn arx-confirm" :class="{ disabled: loading }"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="loading ? {} : { scale: 0.96 }"
        :disabled="loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><RotateCcw v-else :size="14" />
        Revert to default routing
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RotateCcw, Loader, FileText, MoveDown, ArrowUpRight, Zap, Sparkles, Pencil,
  User, CheckCheck, Hash, Workflow, Layers, ShieldCheck,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { approverMeta } from './approverMeta'
import { useActor } from '../composables/useActor'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  policy: { type: Object, default: null },          // {id, label, is_active}
  moduleSlug: { type: String, default: 'leave' },   // leave | travel | reimbursement
  moduleLabel: { type: String, default: 'Leave' },
  currentChain: { type: Array, default: () => [] },
  defaultChain: { type: Array, default: () => [] },
})
defineEmits(['close', 'confirm', 'go'])

const reduced = prefersReduced()
const actor = useActor()
const mc = (s) => approverMeta(s?.approver_type)

const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Standardising routing', 'Created in error', 'Policy review', 'Back to standard', 'Reducing approval steps']
const pick = (p) => { reason.value = reason.value === p ? '' : p }

// connectivity.js uses the plural 'reimbursements' key for the module map
const moduleKey = computed(() => props.moduleSlug === 'reimbursement' ? 'reimbursements' : props.moduleSlug)

const facts = computed(() => [
  { label: 'Policy', value: props.policy?.label || '—', set: !!props.policy, icon: Workflow, tone: 'gold' },
  { label: 'Module', value: props.moduleLabel, set: true, icon: Layers, tone: 'steel' },
  { label: 'Current stages', value: `${props.currentChain.length} stage${props.currentChain.length === 1 ? '' : 's'}`, set: true, icon: Hash, tone: 'gold' },
  { label: 'Default stages', value: `${props.defaultChain.length} stage${props.defaultChain.length === 1 ? '' : 's'}`, set: true, icon: ShieldCheck, tone: 'ok' },
])

const affects = computed(() => [MODULES[moduleKey.value]].filter(Boolean).map((m) => ({ icon: m.icon, label: m.label })))
const summary = computed(() => `Reverting clears the custom chain on ${props.policy?.label || 'this policy'} so ${props.moduleLabel} routes new requests through the built-in default (${props.defaultChain.length} stage${props.defaultChain.length === 1 ? '' : 's'}).`)
const steps = computed(() => [
  { icon: Pencil, title: 'Custom chain cleared', text: `Your ${props.currentChain.length}-stage routing is removed from this policy.` },
  { icon: Sparkles, title: 'Default restored', text: `${props.moduleLabel} resolves the built-in ${props.defaultChain.length}-stage chain for every new request.` },
  { icon: Zap, title: 'In-flight safe', text: 'Requests already in approval keep their snapshotted chain — only future submissions change.' },
  { icon: FileText, title: 'Audited · reversible', text: 'The revert and your reason are sealed into the settings ledger; design a new chain any time.' },
])
const note = computed(() => 'Reverting is reversible — open the relay and design a fresh chain whenever you like.')
</script>

<style scoped>
.arx { display: grid; gap: 16px; }
.arx.stacked { grid-template-columns: 1fr; }
.arx-action { display: flex; flex-direction: column; gap: 13px; }

/* rollback comparison */
.arx-roll { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 15px 16px; border-radius: 15px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 20%, transparent); transition: opacity 0.5s, filter 0.5s; }
.arx-roll.snapping { opacity: 0.55; filter: grayscale(0.35); }
.arx-roll-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: radial-gradient(circle at 30% 40%, rgba(255,255,255,0.06) 0.5px, transparent 1.4px); background-size: 22px 22px; }
.arx-lane { position: relative; }
.arx-lane-head { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 8px; }
.arx-lane-head :deep(svg) { color: var(--set-text-muted); }
.arx-lane.cur .arx-lane-head :deep(svg) { color: var(--set-amber); }
.arx-lane.def .arx-lane-head :deep(svg) { color: var(--set-ok); }
.arx-lane-head b { margin-left: auto; font-size: 9.5px; font-weight: 700; color: var(--set-text-secondary); letter-spacing: 0; text-transform: none; }
.arx-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }
.arx-origin, .arx-term { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.arx-term.ok { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }
.arx-wire { flex: 0 0 16px; height: 2px; background: var(--set-trace-idle); }
.arx-wire.ok { background: linear-gradient(90deg, color-mix(in srgb, var(--set-ok) 50%, transparent), color-mix(in srgb, var(--set-ok) 22%, transparent)); }
.arx-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 8px; flex-shrink: 0;
  font-size: 11px; font-weight: 700; color: var(--set-text); background: color-mix(in srgb, var(--acc) 12%, var(--set-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--acc) 34%, transparent); }
.arx-chip :deep(svg) { color: var(--acc); }
.arx-chip.def { opacity: 0.95; }
.arx-morph { align-self: center; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }

/* live banner */
.arx-feed { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: color-mix(in srgb, var(--set-ok) 6%, var(--set-surface)); border: 1px solid var(--set-border); border-left: 3px solid var(--set-ok); }
.arx-feed-ic { flex-shrink: 0; margin-top: 1px; color: var(--set-ok); }
.arx-feed-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.arx-feed-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.arx-feed-body span { font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.arx-feed-body strong { color: var(--set-text-secondary); font-weight: 700; }
.arx-feed-go { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-ok); background: var(--set-ok-soft);
  border: 1px solid color-mix(in srgb, var(--set-ok) 30%, transparent); transition: all 0.2s; }
.arx-feed-go:hover { background: color-mix(in srgb, var(--set-ok) 16%, transparent); }

.arx-reason { display: flex; flex-direction: column; gap: 7px; }
.arx-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.arx-reason-lab i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; }
.arx-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.arx-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.arx-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.arx-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.arx-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.arx-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.arx-textarea::placeholder { color: var(--hr-input-placeholder); }

.arx-facts { position: relative; padding: 14px 14px 12px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.arx-facts-edge { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-ember), color-mix(in srgb, var(--set-ember) 24%, transparent)); }
.arx-facts-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 11px; }
.arx-facts-head :deep(svg) { color: var(--set-ember); }
.arx-facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 9px; }
.arx-fact { display: flex; align-items: center; gap: 9px; }
.arx-fact-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 12%, transparent); }
.arx-fact-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.arx-fact-ic[data-tone="gold"] { color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 12%, transparent); }
.arx-fact-ic[data-tone="steel"] { color: var(--set-text-muted); background: var(--set-surface-elevated); }
.arx-fact-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.arx-fact-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.arx-fact-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.arx-fact-body b.muted { color: var(--set-text-dim); font-weight: 600; }

.arx-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.arx-confirm:hover { color: #fff; }
.arx-confirm.disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 560px) { .arx-chips { gap: 2px 0; } }
</style>
