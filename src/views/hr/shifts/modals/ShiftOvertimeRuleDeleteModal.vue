<template>
  <OnbModal :open="open" title="Delete overtime rule"
    subtitle="Removing a rule re-scores how this OT type is paid. Review the impact before confirming."
    :icon="AlertOctagon" :width="560" @close="$emit('close')">

    <div class="otd" v-if="rule">
      <!-- rule being deleted -->
      <Motion as="div" class="otd-rule" :style="{ '--c': color }"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.04, ease: EASE }">
        <span class="otd-rule-sweep" aria-hidden="true" />
        <div class="otd-rule-mult"><b>{{ mult }}</b><span>×</span></div>
        <div class="otd-rule-info">
          <h4>{{ rule.name }}</h4>
          <div class="otd-rule-meta">
            <span class="otd-type"><i />{{ typeLabel }}</span>
            <span><Timer :size="11" />after {{ fmtNum(rule.threshold_hours) }}h</span>
            <span v-if="cap != null"><AlertTriangle :size="11" />cap {{ fmtNum(cap) }}h</span>
            <span v-else><Infinity :size="11" />uncapped</span>
            <span>priority {{ rule.priority }}</span>
          </div>
        </div>
        <span v-if="rule.is_active === false" class="otd-off">off</span>
      </Motion>

      <!-- live impact / workflow -->
      <Motion as="div" class="otd-impact" :data-tone="impact.tone"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.12, ease: EASE }">
        <span class="otd-impact-ic"><component :is="impact.icon" :size="15" /></span>
        <div class="otd-impact-body">
          <span class="otd-impact-title">{{ impact.title }}</span>
          <p class="otd-impact-text" v-html="impact.text" />
        </div>
      </Motion>

      <p class="otd-note">
        <Info :size="11" />
        Already-processed payroll is untouched — only <b>future {{ typeLabel.toLowerCase() }} OT</b> is re-priced. The rule is soft-deleted (recoverable from the database).
      </p>

      <!-- reason -->
      <Motion as="div" class="otd-reason"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.2, ease: EASE }">
        <span class="otd-reason-label">Reason <em>— optional, for the record</em></span>
        <div class="otd-presets">
          <button v-for="p in PRESETS" :key="p" type="button" class="otd-preset" :class="{ on: reason === p }"
            @click="reason = (reason === p ? '' : p)">{{ p }}</button>
        </div>
        <textarea v-model="reason" class="otd-text" rows="2" placeholder="Add context for the audit trail…" />
      </Motion>
    </div>

    <template #footer>
      <span class="otd-foot"><AlertTriangle :size="12" /> Reversible only via the database</span>
      <button class="otd-ghost" @click="$emit('close')">Cancel</button>
      <button class="otd-danger" :disabled="busy" @click="$emit('confirm', reason)">
        <Trash2 v-if="!busy" :size="14" /><Loader2 v-else :size="14" class="spin" /> Delete rule
      </button>
    </template>
  </OnbModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  AlertOctagon, Trash2, Loader2, AlertTriangle, ArrowRightLeft, ShieldCheck,
  Info, Timer, Infinity,
} from 'lucide-vue-next'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { otTypeMeta } from '@/composables/useShifts'

const props = defineProps({
  open: Boolean,
  rule: { type: Object, default: null },
  rules: { type: Array, default: () => [] }, // full rule list — used to compute the fallback
  busy: Boolean,
})
defineEmits(['close', 'confirm'])

const EASE = [0.16, 1, 0.3, 1]
const PRESETS = [
  'Superseded by a newer rule',
  'Multiplier / cap set in error',
  'Policy no longer applies',
  'Consolidating duplicate rules',
]
const reason = ref('')
watch(() => props.open, (o) => { if (o) reason.value = '' })

const fmtMult = (m) => (Number(m) || 0).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
const fmtNum = (n) => { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(1) }
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const typeKey = computed(() => props.rule?.ot_type)
const color = computed(() => otTypeMeta(typeKey.value || '').color)
const typeLabel = computed(() => otTypeMeta(typeKey.value || '').label)
const mult = computed(() => fmtMult(props.rule?.multiplier))
const cap = computed(() => (props.rule?.max_ot_hours != null && props.rule?.max_ot_hours !== '') ? Number(props.rule.max_ot_hours) : null)

// active rules of the same type, in resolver order (mirrors the backend)
const activeSameType = computed(() => (props.rules || [])
  .filter(r => r.is_active !== false && r.ot_type === typeKey.value)
  .slice()
  .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) || (new Date(b.created_at || 0) - new Date(a.created_at || 0))))
const winner = computed(() => activeSameType.value[0] || null)
const fallback = computed(() => activeSameType.value.find(r => r.id !== props.rule?.id) || null)
const isInactive = computed(() => props.rule?.is_active === false)
const isWinner = computed(() => !!props.rule && winner.value?.id === props.rule.id)

const impact = computed(() => {
  const tl = typeLabel.value || 'This'
  const tlower = tl.toLowerCase()
  if (!props.rule) return { tone: 'ok', icon: ShieldCheck, title: '', text: '' }
  if (isInactive.value) {
    return { tone: 'ok', icon: ShieldCheck, title: 'No effect on payouts',
      text: `This rule is <b>inactive</b> — it isn't resolving any OT today. Deleting it only clears it from the list.` }
  }
  if (isWinner.value) {
    if (fallback.value) {
      return { tone: 'gold', icon: ArrowRightLeft, title: `${tl} OT falls back`,
        text: `<b>${esc(fallback.value.name)}</b> takes over at <b>${fmtMult(fallback.value.multiplier)}×</b> (priority ${fallback.value.priority}).` }
    }
    return { tone: 'alert', icon: AlertTriangle, title: `${tl} OT loses its premium`,
      text: `No other active ${tlower} rule exists — these hours will pay <b>1× (base rate)</b> until you add one.` }
  }
  return { tone: 'ok', icon: ShieldCheck, title: 'No change to current payout',
    text: `<b>${esc(winner.value?.name || '—')}</b> (${fmtMult(winner.value?.multiplier)}×) keeps resolving ${tlower} OT — you're only removing a standby rule.` }
})
</script>

<style scoped>
.otd { display: flex; flex-direction: column; gap: 14px; }

/* rule being deleted */
.otd-rule { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px;
  background: var(--shift-surface-2); border: 1px solid color-mix(in srgb, var(--c) 42%, transparent); }
.otd-rule::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); opacity: 0.85; }
.otd-rule-sweep { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 32%, rgba(239,68,68,0.16) 50%, transparent 68%); background-size: 250% 100%; animation: otd-sweep 3.4s ease-in-out infinite; }
@keyframes otd-sweep { 0% { background-position: 165% 0; } 100% { background-position: -65% 0; } }
.otd-rule-mult { display: flex; align-items: baseline; gap: 1px; font-family: var(--shift-mono); flex-shrink: 0; position: relative; z-index: 1; }
.otd-rule-mult b { font-size: 30px; font-weight: 900; color: var(--c); letter-spacing: -0.02em; line-height: 1; }
.otd-rule-mult span { font-size: 15px; color: var(--shift-text-muted); }
.otd-rule-info { min-width: 0; position: relative; z-index: 1; flex: 1; }
.otd-rule-info h4 { margin: 0 0 5px; font-size: 14px; font-weight: 700; color: var(--shift-text); }
.otd-rule-meta { display: flex; flex-wrap: wrap; gap: 9px; font-size: 11px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.otd-rule-meta span { display: inline-flex; align-items: center; gap: 4px; }
.otd-rule-meta svg { opacity: 0.8; }
.otd-type { color: var(--c) !important; }
.otd-type i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); }
.otd-off { position: relative; z-index: 1; align-self: flex-start; font-family: var(--shift-mono); font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em;
  padding: 2px 7px; border-radius: 999px; color: var(--shift-text-dim); background: rgba(148,163,184,0.12); border: 1px solid var(--shift-border-soft); }

/* impact / workflow */
.otd-impact { display: flex; gap: 11px; align-items: flex-start; padding: 12px 14px; border-radius: 13px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.otd-impact[data-tone="alert"] { background: var(--shift-alert-soft); border-color: color-mix(in srgb, var(--shift-alert) 40%, transparent); }
.otd-impact[data-tone="gold"]  { background: rgba(251,191,36,0.10); border-color: color-mix(in srgb, var(--shift-amber) 40%, transparent); }
.otd-impact[data-tone="ok"]    { background: var(--shift-ok-soft); border-color: color-mix(in srgb, var(--shift-ok) 34%, transparent); }
.otd-impact-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; }
.otd-impact[data-tone="alert"] .otd-impact-ic { color: var(--shift-alert); background: color-mix(in srgb, var(--shift-alert) 16%, transparent); }
.otd-impact[data-tone="gold"] .otd-impact-ic { color: var(--shift-amber); background: rgba(251,191,36,0.16); }
.otd-impact[data-tone="ok"] .otd-impact-ic { color: var(--shift-ok); background: var(--shift-ok-soft); }
.otd-impact-body { min-width: 0; }
.otd-impact-title { display: block; font-size: 12.5px; font-weight: 700; color: var(--shift-text); }
.otd-impact-text { margin: 3px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--shift-text-muted); }
.otd-impact-text :deep(b) { color: var(--shift-text-2); font-weight: 700; }

.otd-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 10.5px; line-height: 1.5; color: var(--shift-text-dim); }
.otd-note svg { flex-shrink: 0; margin-top: 1px; }
.otd-note b { color: var(--shift-text-muted); font-weight: 700; }

/* reason */
.otd-reason { display: flex; flex-direction: column; gap: 8px; }
.otd-reason-label { font-size: 11px; color: var(--shift-text-muted); }
.otd-reason-label em { font-style: normal; color: var(--shift-text-dim); }
.otd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.otd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 600;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.18s; }
.otd-preset:hover { color: var(--shift-text-2); border-color: var(--shift-border); }
.otd-preset.on { color: var(--shift-text); background: rgba(239,68,68,0.10); border-color: color-mix(in srgb, var(--shift-alert) 42%, transparent); }
.otd-text { width: 100%; box-sizing: border-box; resize: vertical; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 9px 11px; color: var(--shift-text); font: inherit; font-size: 12.5px; }
.otd-text:focus { outline: none; border-color: var(--shift-alert); }

/* footer */
.otd-foot { flex: 1; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--shift-text-dim); }
.otd-ghost { padding: 9px 15px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: transparent; color: var(--shift-text-2); cursor: pointer; font-size: 13px; font-weight: 600; }
.otd-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.otd-danger { padding: 9px 17px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #f87171 0%, #ef4444 55%, #b91c1c 100%); display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 10px 26px -10px rgba(239,68,68,0.6); transition: box-shadow 0.25s, transform 0.2s; }
.otd-danger:hover:not(:disabled) { box-shadow: 0 14px 34px -10px rgba(239,68,68,0.85); transform: translateY(-1px); }
.otd-danger:disabled { opacity: 0.6; cursor: default; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

[data-theme="light"] .otd-rule-sweep { background: linear-gradient(100deg, transparent 32%, rgba(220,38,38,0.12) 50%, transparent 68%); background-size: 250% 100%; }
[data-theme="light"] .otd-preset.on { background: rgba(220,38,38,0.10); }
@media (prefers-reduced-motion: reduce) { .otd-rule-sweep, .spin :deep(svg), .spin { animation: none; } }
</style>
