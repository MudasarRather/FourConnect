<template>
  <div class="stage" ref="cardRef" :class="[`phase-${phase}`, verdict ? `v-${verdict.toLowerCase()}` : '']">
    <!-- ambient -->
    <span class="rmb-grain" aria-hidden="true" />
    <span class="stage-aura" aria-hidden="true" />
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="stage-scan" aria-hidden="true" />

    <div class="stage-inner" :key="claim.id">
      <!-- header: who -->
      <div class="s-head">
        <span class="s-avatar" :style="{ '--c': catColor }">{{ initials }}</span>
        <div class="s-who">
          <b>{{ claim.employee_name || 'Employee' }}</b>
          <small>{{ [claim.designation, claim.department].filter(Boolean).join(' · ') || claim.employee_code || '—' }}</small>
        </div>
        <div class="s-id">
          <span class="rmb-mono num">{{ claim.claim_number }}</span>
          <span class="wait" :data-tone="waitTone"><Hourglass :size="11" /> {{ waitLabel }}</span>
        </div>
      </div>

      <!-- the amount, stamped large -->
      <div class="s-amount">
        <RmbMoneyValue class="amt" :value="claim.amount" :decimals="0" tone="pending" />
        <div class="s-tags">
          <span class="chip cat" :style="{ '--c': catColor }"><span class="dot" />{{ claim.category_name || claim.category_code }}</span>
          <span class="chip"><Calendar :size="12" /> {{ fmtDate(claim.expense_date) }}</span>
          <span v-if="claim.vendor" class="chip"><Store :size="12" /> {{ claim.vendor }}</span>
        </div>
      </div>

      <!-- justification -->
      <p v-if="claim.description" class="s-desc">“{{ claim.description }}”</p>

      <!-- meta chips -->
      <div class="s-meta">
        <span v-if="claim.project_name" class="mchip"><FolderKanban :size="12" /> {{ claim.project_name }}</span>
        <span class="mchip" :class="{ glow: attCount }"><Paperclip :size="12" /> {{ attCount }} receipt{{ attCount === 1 ? '' : 's' }}</span>
        <span class="mchip stage-now"><Radio :size="12" /> Now at {{ currentStage }}</span>
      </div>

      <!-- pipeline -->
      <div class="s-track">
        <RmbStageTracker :claim="claim" />
      </div>

      <!-- decision bar -->
      <div class="s-actions">
        <button class="big approve" :disabled="locked" @click="$emit('decide', 'approve')">
          <span class="big-glow" aria-hidden="true" />
          <CheckCircle2 :size="17" /> Approve <kbd>A</kbd>
        </button>
        <button class="big return" :disabled="locked" @click="$emit('decide', 'return')">
          <Undo2 :size="16" /> Return <kbd>T</kbd>
        </button>
        <button class="big reject" :disabled="locked" @click="$emit('decide', 'reject')">
          <XCircle :size="16" /> Reject <kbd>R</kbd>
        </button>
        <button class="ghost-act" :disabled="locked" @click="$emit('details')" title="Open full dossier (Enter)"><FileSearch :size="16" /></button>
        <button class="ghost-act" :disabled="locked || !canSkip" @click="$emit('skip')"
          :title="canSkip ? 'Skip to next claim (S)' : 'No other claims to skip to'"><SkipForward :size="16" /></button>
      </div>
    </div>

    <!-- verdict stamp overlay -->
    <div v-if="phase !== 'idle'" class="verdict" aria-hidden="true">
      <span class="verdict-word">{{ verdictWord }}</span>
      <span v-if="verdict === 'APPROVED'" class="sparks">
        <i v-for="n in 7" :key="n" :style="sparkStyle(n)" />
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  CheckCircle2, XCircle, Undo2, Calendar, Store, Paperclip, FolderKanban,
  Radio, Hourglass, FileSearch, SkipForward,
} from 'lucide-vue-next'
import RmbMoneyValue from './RmbMoneyValue.vue'
import RmbStageTracker from './RmbStageTracker.vue'
import { categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  claim: { type: Object, required: true },
  phase: { type: String, default: 'idle' },     // idle | stamping | ejecting
  verdict: { type: String, default: '' },        // APPROVED | REJECTED | RETURNED
  busy: { type: Boolean, default: false },
  canSkip: { type: Boolean, default: true },
})
defineEmits(['decide', 'details', 'skip'])

const cardRef = ref(null)
usePointerSpotlight(cardRef)

const locked = computed(() => props.busy || props.phase !== 'idle')
const catColor = computed(() => props.claim.category_color || categoryMeta(props.claim.category_code).hex)

const initials = computed(() => {
  const n = (props.claim.employee_name || '').trim()
  if (!n) return '–'
  return n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
})
const attCount = computed(() => (props.claim.attachments || []).length)

const currentStage = computed(() => {
  const steps = props.claim.approval_steps || []
  const cur = steps[props.claim.current_step ?? 0]
  const label = cur?.label || cur?.approver_type || 'approval'
  return String(label).replace(/_/g, ' ').toLowerCase()
})

const waitDays = computed(() => {
  const t = props.claim.submitted_at
  if (!t) return 0
  const ms = Date.now() - new Date(t).getTime()
  return Math.max(0, Math.floor(ms / 86400000))
})
const waitLabel = computed(() => {
  const d = waitDays.value
  if (d <= 0) return 'today'
  return `${d}d waiting`
})
const waitTone = computed(() => (waitDays.value >= 7 ? 'hot' : waitDays.value >= 3 ? 'warm' : 'cool'))

const verdictWord = computed(() =>
  ({ APPROVED: 'APPROVED', REJECTED: 'REJECTED', RETURNED: 'RETURNED' }[props.verdict] || ''))

const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(d) }
}

const sparkStyle = (n) => ({
  left: ((n * 14.3) % 80 + 10) + '%',
  animationDelay: ((n * 0.07) % 0.5).toFixed(2) + 's',
  '--sp-scale': (0.7 + (n % 3) * 0.3).toFixed(2),
})
</script>

<style scoped>
.stage { position: relative; border-radius: 22px; overflow: hidden; padding: 1px;
  background: linear-gradient(160deg, var(--rmb-border-strong), transparent 40%), var(--rmb-surf-card);
  border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow-hover);
  will-change: transform, opacity; }

/* ambient layers */
.stage-aura { position: absolute; inset: -30%; z-index: 0; pointer-events: none; opacity: 0.7;
  background: radial-gradient(60% 60% at 80% 0%, color-mix(in srgb, var(--rmb-amber) 16%, transparent), transparent 60%),
              radial-gradient(60% 70% at 0% 100%, color-mix(in srgb, var(--rmb-st-settled) 12%, transparent), transparent 62%);
  animation: rmb-aura-breathe 7s ease-in-out infinite; }
.stage-scan { position: absolute; left: 0; right: 0; top: 0; height: 26%; z-index: 0; pointer-events: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--rmb-amber) 7%, transparent), transparent); }

.stage-inner { position: relative; z-index: 2; padding: 22px 24px 18px; display: flex; flex-direction: column; gap: 14px;
  transform-style: preserve-3d; transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -3deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 4deg));
  transition: transform 0.4s var(--rmb-ease); animation: stage-in 0.6s var(--rmb-spring) backwards; }

/* header */
.s-head { display: flex; align-items: center; gap: 12px; }
.s-avatar { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; flex-shrink: 0;
  font-family: var(--rmb-mono); font-weight: 800; font-size: 15px; color: #1a1206;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 90%, #fff), var(--c));
  box-shadow: 0 8px 18px -8px var(--c), inset 0 1px 0 rgba(255,255,255,0.4); }
.s-who { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.s-who b { font-size: 15px; color: var(--rmb-text); font-weight: 700; }
.s-who small { font-size: 11.5px; color: var(--rmb-text-muted); }
.s-id { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.s-id .num { font-size: 12px; font-weight: 700; color: var(--rmb-text-secondary); }
.wait { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
  font-family: var(--rmb-mono); }
.wait[data-tone="cool"] { color: var(--rmb-st-submitted); background: var(--rmb-st-submitted-soft); }
.wait[data-tone="warm"] { color: var(--rmb-st-pending); background: var(--rmb-st-pending-soft); }
.wait[data-tone="hot"] { color: var(--rmb-st-rejected); background: var(--rmb-st-rejected-soft); animation: rmb-pulse-dot 2s ease-in-out infinite; }

/* amount */
.s-amount { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.amt { font-size: 40px; letter-spacing: -1px; }
.amt :deep(.cur) { font-size: 0.5em; }
.s-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--rmb-text-secondary);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); padding: 5px 10px; border-radius: 999px; }
.chip.cat { color: var(--c); border-color: color-mix(in srgb, var(--c) 30%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.chip.cat .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); }

.s-desc { margin: 0; font-size: 13px; line-height: 1.5; color: var(--rmb-text-secondary); font-style: italic;
  padding: 10px 14px; border-left: 2px solid color-mix(in srgb, var(--rmb-amber) 50%, transparent);
  background: color-mix(in srgb, var(--rmb-amber) 5%, transparent); border-radius: 0 10px 10px 0; }

.s-meta { display: flex; flex-wrap: wrap; gap: 8px; }
.mchip { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--rmb-text-muted);
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); padding: 4px 9px; border-radius: 8px; }
.mchip.glow { color: var(--rmb-st-submitted); border-color: color-mix(in srgb, var(--rmb-st-submitted) 30%, transparent); }
.mchip.stage-now { color: var(--rmb-st-pending); border-color: color-mix(in srgb, var(--rmb-st-pending) 28%, transparent); text-transform: capitalize; }

.s-track { padding: 2px 0; }

/* decision bar */
.s-actions { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 2px; }
.big { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 13px; cursor: pointer;
  font-size: 13.5px; font-weight: 700; border: 1px solid transparent; overflow: hidden;
  transition: transform 0.2s var(--rmb-spring), box-shadow 0.25s, filter 0.2s; }
.big kbd { font-family: var(--rmb-mono); font-size: 9.5px; padding: 1px 5px; border-radius: 5px; opacity: 0.7;
  background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.18); }
.big:disabled { opacity: 0.45; cursor: not-allowed; }
.big:not(:disabled):hover { transform: translateY(-2px); }
.big:not(:disabled):active { transform: translateY(0) scale(0.97); }
.big.approve { flex: 1; min-width: 150px; color: #14210c; background: linear-gradient(135deg, #6ee7b7, var(--rmb-st-approved) 60%, #10b981);
  box-shadow: 0 12px 26px -12px var(--rmb-st-approved); }
.big.approve .big-glow { position: absolute; inset: 0; opacity: 0;
  background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%); background-size: 220% 100%; }
.big.approve:not(:disabled):hover .big-glow { opacity: 1; animation: rmb-amount-shimmer 1s linear; }
.big.return { color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft); border-color: color-mix(in srgb, var(--rmb-st-returned) 32%, transparent); }
.big.reject { color: var(--rmb-st-rejected); background: var(--rmb-st-rejected-soft); border-color: color-mix(in srgb, var(--rmb-st-rejected) 32%, transparent); }
.ghost-act { width: 42px; display: inline-grid; place-items: center; border-radius: 12px; cursor: pointer;
  color: var(--rmb-text-muted); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: 0.2s; }
.ghost-act:not(:disabled):hover { color: var(--rmb-text); border-color: var(--rmb-border-strong); transform: translateY(-2px); }
.ghost-act:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── verdict stamp overlay ── */
.verdict { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; pointer-events: none;
  background: color-mix(in srgb, var(--rmb-canvas) 30%, transparent); backdrop-filter: blur(1px); }
.verdict-word { font-family: var(--rmb-mono); font-weight: 800; font-size: clamp(34px, 7vw, 64px); letter-spacing: 4px;
  padding: 10px 26px; border-radius: 12px; border: 4px solid currentColor; text-transform: uppercase;
  animation: rmb-stamp-press 0.55s var(--rmb-spring) both; }
.v-approved .verdict-word { color: var(--rmb-st-approved); text-shadow: 0 0 30px color-mix(in srgb, var(--rmb-st-approved) 60%, transparent); }
.v-rejected .verdict-word { color: var(--rmb-st-rejected); text-shadow: 0 0 30px color-mix(in srgb, var(--rmb-st-rejected) 60%, transparent); }
.v-returned .verdict-word { color: var(--rmb-st-returned); text-shadow: 0 0 30px color-mix(in srgb, var(--rmb-st-returned) 60%, transparent); }
.sparks { position: absolute; inset: 0; }
.sparks i { position: absolute; bottom: 38%; width: 5px; height: 5px; border-radius: 50%; background: var(--rmb-st-approved);
  box-shadow: 0 0 10px 2px color-mix(in srgb, var(--rmb-st-approved) 70%, transparent); transform: scale(var(--sp-scale, 1));
  animation: rmb-spark-rise 0.9s ease-out forwards; }

/* ── eject choreography (root flies away) ── */
.phase-ejecting.v-approved { animation: eject-approve 0.5s var(--rmb-ease) forwards; }
.phase-ejecting.v-rejected { animation: eject-reject 0.5s var(--rmb-ease) forwards; }
.phase-ejecting.v-returned { animation: eject-return 0.5s var(--rmb-ease) forwards; }

@keyframes stage-in { from { transform: translateY(22px) scale(0.985); } to { transform: none; } }
@keyframes eject-approve { to { opacity: 0; transform: translateY(-44px) rotate(2deg) scale(0.95); } }
@keyframes eject-reject { to { opacity: 0; transform: translateY(46px) rotate(-3deg) scale(0.93); } }
@keyframes eject-return { to { opacity: 0; transform: translateX(-70px) rotate(-2deg) scale(0.96); } }

@media (prefers-reduced-motion: reduce) {
  .stage-aura, .wait[data-tone="hot"] { animation: none !important; }
  .stage-inner { animation: none; transform: none; }
  .verdict-word { animation: none; }
  .sparks { display: none; }
  .phase-ejecting.v-approved, .phase-ejecting.v-rejected, .phase-ejecting.v-returned { animation: none; opacity: 0; }
}
</style>
