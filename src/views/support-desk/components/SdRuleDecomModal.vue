<template>
  <SdModalShell :open="open" :eyebrow="isBurn ? 'DECOMMISSION POLICY' : 'DECOMMISSION GATE'"
    :title="isBurn ? 'Retire this escalation policy?' : 'Pull this gate off the line?'" width="600px" @close="$emit('close')">
    <div v-if="rule" class="rdx" :style="{ '--dp': holdP }">
      <span class="rdx-vignette" aria-hidden="true" />

      <!-- ═══ the dossier plate ═══ -->
      <div class="rdx-plate" :class="{ off: !rule.is_active }">
        <span class="rdx-lamp" :class="{ on: rule.is_active }" aria-hidden="true" />
        <div class="rdx-plate-b">
          <b>{{ rule.name }}</b>
          <div class="rdx-tags sd-mono">
            <span class="rdx-tag">{{ isBurn ? `BURN · T+${fmtMins(rule.time_threshold_mins)}` : 'INTERCEPT GATE' }}</span>
            <span class="rdx-tag" :class="rule.is_active ? 'go' : ''">{{ rule.is_active ? 'LIVE ON THE LINE' : 'PARKED' }}</span>
            <span v-if="rule.stop_processing && !isBurn" class="rdx-tag halt">SEALS CHAIN</span>
            <span class="rdx-tag dim">{{ (rule.conditions || []).length }} COND · {{ (rule.actions || []).length }} ACT</span>
          </div>
        </div>
        <div class="rdx-fires sd-mono">
          <b>×<SdCountUp :value="rule.run_count || 0" /></b>
          <span>{{ rule.last_run_at ? `LAST ${ago(rule.last_run_at)}` : 'NEVER FIRED' }}</span>
        </div>
      </div>

      <!-- ═══ impact readout ═══ -->
      <div class="rdx-impact">
        <Motion v-for="(row, i) in impact" :key="row.key" as="div" class="rdx-row" :class="row.kind"
          :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.4, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }">
          <span class="rdx-row-ic"><component :is="row.icon" :size="12" /></span>
          <p v-html="row.html" />
          <button v-if="row.key === 'history'" class="rdx-mini" @click="$emit('history')">
            <History :size="11" /> Open
          </button>
        </Motion>
      </div>

      <!-- ═══ park instead — the reversible alternative ═══ -->
      <Motion v-if="rule.is_active" as="div" class="rdx-park"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <PauseCircle :size="14" />
        <p><b>Only want it out of the chain?</b> Park it — the {{ isBurn ? 'policy' : 'gate' }} keeps its config
          and history but never runs, and one switch brings it back.</p>
        <Motion as="button" class="rdx-park-btn" :disabled="busy" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
          @click="$emit('park')"><PauseCircle :size="12" /> Park instead</Motion>
      </Motion>

      <!-- ═══ the verdict — a reason is part of the record ═══ -->
      <div class="rdx-verdict">
        <span class="rdx-vh sd-mono"><ScrollText :size="11" /> REASON FOR DECOMMISSION <em>· required — lands in the Ledger</em></span>
        <div class="rdx-reasons">
          <button v-for="r in REASONS" :key="r.v" type="button" class="rdx-reason"
            :class="{ on: reason === r.v }" @click="reason = reason === r.v ? '' : r.v">
            <Check v-if="reason === r.v" :size="10" class="tick" />{{ r.label }}
          </button>
        </div>
        <textarea v-model.trim="note" class="rdx-note" rows="2" maxlength="220"
          :placeholder="reason === 'other' ? 'What happened? (required for “Other”)' : 'Optional note — context for whoever reads the ledger later'" />
      </div>
    </div>

    <template #footer>
      <button class="qcf-btn" @click="$emit('close')">Keep it</button>
      <span style="flex:1" />
      <!-- hold-to-decommission (two-step arm under reduced motion) -->
      <button v-if="reduced" class="qcf-btn danger" :disabled="!canDelete || busy"
        @click="armed ? fire() : (armed = true)">
        <TriangleAlert v-if="armed" :size="13" /><Trash2 v-else :size="13" />
        {{ armed ? 'Really decommission?' : 'Decommission' }}
      </button>
      <button v-else class="rdx-hold" :class="{ ready: canDelete, holding: holdP > 0 }" :disabled="!canDelete || busy"
        :title="canDelete ? 'Press and hold to decommission' : 'Pick a reason first'"
        @pointerdown.prevent="startHold" @pointerup="endHold" @pointerleave="endHold" @pointercancel="endHold"
        @keydown.enter.prevent="armed ? fire() : (armed = true)">
        <span class="rdx-hold-fill" :style="{ transform: `scaleX(${holdP})` }" aria-hidden="true" />
        <Loader v-if="busy" :size="13" class="rdx-spin" />
        <Trash2 v-else :size="13" />
        <span class="rdx-hold-lb">{{ busy ? 'Decommissioning…' : holdP > 0 ? 'HOLD…' : armed ? 'Really decommission?' : 'Hold to decommission' }}</span>
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/*
  SdRuleDecomModal — "THE DECOMMISSION CHAMBER", the rule/policy delete confirm
  rebuilt as a process, not a yes/no box:
    1. the DOSSIER PLATE — what exactly is being pulled (live lamp, fire count,
       seals-chain flag, T+ threshold for burns)
    2. the IMPACT READOUT — what actually changes: placements never unwind,
       captured traffic falls through to the NEXT live gate (named) or the
       category router, version history survives (jump to it)
    3. PARK INSTEAD — the reversible alternative, first-class, recommended when
       the rule is live
    4. the VERDICT — a coded reason (required; "Other" demands a note) that is
       sent with the DELETE and lands in the audit Ledger
    5. HOLD-TO-DECOMMISSION — a 1.2s press-and-hold with a filling danger sweep
       and a deepening red vignette (two-step arm under reduced motion)
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Trash2, TriangleAlert, History, Check, Loader, ScrollText, PauseCircle,
  ShieldCheck, GitBranch, TrendingUp,
} from 'lucide-vue-next'
import SdModalShell from './SdModalShell.vue'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  rule: { type: Object, default: null },
  nextCatcher: { type: String, default: '' },   // who inherits this gate's traffic
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm', 'park', 'history'])

const REASONS = [
  { v: 'obsolete', label: 'Obsolete — no longer needed' },
  { v: 'replaced', label: 'Replaced by another rule' },
  { v: 'misrouting', label: 'Was misrouting traffic' },
  { v: 'duplicate', label: 'Duplicate of an existing rule' },
  { v: 'cleanup', label: 'Config cleanup' },
  { v: 'other', label: 'Other' },
]
const reason = ref('')
const note = ref('')
const armed = ref(false)
watch(() => [props.open, props.rule], () => { reason.value = ''; note.value = ''; armed.value = false; holdP.value = 0 })

const isBurn = computed(() => (props.rule?.trigger || 'on_create') === 'time_based')
const canDelete = computed(() => !!reason.value && (reason.value !== 'other' || !!note.value))

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const impact = computed(() => {
  if (!props.rule) return []
  const rows = [
    {
      key: 'safe', kind: 'go', icon: ShieldCheck,
      html: 'Tickets it already routed <b>stay exactly where they are</b> — placements are never unwound.',
    },
  ]
  if (isBurn.value) {
    rows.push({
      key: 'fall', kind: (props.rule.run_count || 0) > 0 ? 'warn' : 'dim', icon: TrendingUp,
      html: 'Aged tickets it would have lifted <b>stop escalating on this clock</b> — only other burns and the built-in SLA-breach auto-lift still raise them.',
    })
  } else {
    rows.push({
      key: 'fall', kind: (props.rule.run_count || 0) > 0 ? 'warn' : 'dim', icon: GitBranch,
      html: `Traffic this gate captured <b>falls through to ${esc(props.nextCatcher || 'the category router')}</b> from the moment it leaves the line.`,
    })
  }
  rows.push({
    key: 'history', kind: 'dim', icon: History,
    html: 'Every version survives in the <b>Ledger</b> — the config can be rebuilt from its history.',
  })
  return rows
})

/* ── hold-to-decommission ── */
const HOLD_MS = 1200
const holdP = ref(0)
let raf = 0
let t0 = 0
const fire = () => {
  const code = REASONS.find(r => r.v === reason.value)?.label || reason.value
  emit('confirm', { reason: note.value ? `${code} — ${note.value}` : code })
}
const startHold = () => {
  if (!canDelete.value || props.busy) return
  t0 = performance.now()
  const step = (t) => {
    holdP.value = Math.min(1, (t - t0) / HOLD_MS)
    if (holdP.value >= 1) { cancelAnimationFrame(raf); raf = 0; holdP.value = 0; fire(); return }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
const endHold = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } holdP.value = 0 }
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })

const reduced = ref(false)
onMounted(() => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    reduced.value = !cine && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { reduced.value = false }
})

const fmtMins = (m) => (m == null || m === '' ? '—' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round((m / 60) * 10) / 10}h` : `${Math.round((m / 1440) * 10) / 10}d`)
const ago = (iso) => {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'JUST NOW'
  if (s < 3600) return `${Math.floor(s / 60)}M AGO`
  if (s < 86400) return `${Math.floor(s / 3600)}H AGO`
  return `${Math.floor(s / 86400)}D AGO`
}
</script>

<style scoped>
.rdx { position: relative; display: flex; flex-direction: column; gap: 13px;
  --rdx-ink: var(--sd-text); --rdx-dim: var(--sd-text-muted); --rdx-core: var(--sd-qc-core);
  --rdx-brd: var(--sd-qc-brd); --rdx-soft: var(--sd-qc-soft);
  --rdx-go: var(--sd-qc-go); --rdx-warn: var(--sd-qc-warn); --rdx-halt: var(--sd-qc-halt); }
/* the room reddens as the hold progresses */
.rdx-vignette { position: fixed; inset: 0; pointer-events: none; z-index: 0;
  opacity: calc(var(--dp, 0) * 0.5); transition: opacity 0.15s linear;
  background: radial-gradient(120% 120% at 50% 110%, color-mix(in srgb, var(--rdx-halt) 30%, transparent), transparent 60%); }

/* ═══ dossier plate ═══ */
.rdx-plate { position: relative; display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 13px; background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border);
  animation: rdx-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes rdx-in { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: none; } }
.rdx-plate.off { opacity: 0.8; }
.rdx-lamp { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  background: var(--rdx-dim); }
.rdx-lamp.on { background: var(--rdx-go); box-shadow: 0 0 10px color-mix(in srgb, var(--rdx-go) 70%, transparent);
  animation: rdx-lamp 2.2s ease-in-out infinite; }
@keyframes rdx-lamp { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
.rdx-plate-b { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
.rdx-plate-b > b { font-size: 14px; color: var(--rdx-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rdx-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.rdx-tag { font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em; padding: 2px 7px; border-radius: 5px;
  color: var(--rdx-core); border: 1px solid var(--rdx-brd); }
.rdx-tag.go { color: var(--rdx-go); border-color: color-mix(in srgb, var(--rdx-go) 45%, transparent); }
.rdx-tag.halt { color: var(--rdx-halt); border-color: color-mix(in srgb, var(--rdx-halt) 45%, transparent); }
.rdx-tag.dim { color: var(--rdx-dim); border-color: color-mix(in srgb, var(--rdx-ink) 16%, transparent); }
.rdx-fires { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.rdx-fires b { font-size: 16px; color: var(--rdx-core); }
.rdx-fires span { font-size: 7px; letter-spacing: 0.14em; color: var(--rdx-dim); }

/* ═══ impact readout ═══ */
.rdx-impact { display: flex; flex-direction: column; gap: 6px; }
.rdx-row { display: flex; align-items: flex-start; gap: 9px; padding: 8px 11px; border-radius: 10px;
  background: color-mix(in srgb, var(--rdx-ink) 3%, transparent); }
.rdx-row-ic { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px;
  flex-shrink: 0; margin-top: 1px; }
.rdx-row.go .rdx-row-ic { color: var(--rdx-go); background: color-mix(in srgb, var(--rdx-go) 10%, transparent); }
.rdx-row.warn .rdx-row-ic { color: var(--rdx-warn); background: color-mix(in srgb, var(--rdx-warn) 10%, transparent); }
.rdx-row.dim .rdx-row-ic { color: var(--rdx-dim); background: color-mix(in srgb, var(--rdx-ink) 6%, transparent); }
.rdx-row p { margin: 0; flex: 1; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-secondary); }
.rdx-row p :deep(b) { color: var(--rdx-ink); }
.rdx-row.warn p :deep(b) { color: var(--rdx-warn); }
.rdx-mini { display: inline-flex; align-items: center; gap: 5px; align-self: center; flex-shrink: 0;
  padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; font-family: inherit;
  cursor: pointer; color: var(--rdx-core); background: transparent; border: 1px solid var(--rdx-brd);
  transition: background 0.2s, transform 0.2s; }
.rdx-mini:hover { background: var(--rdx-soft); transform: translateY(-1px); }

/* ═══ park instead ═══ */
.rdx-park { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed color-mix(in srgb, var(--rdx-go) 40%, transparent);
  background: color-mix(in srgb, var(--rdx-go) 5%, transparent); }
.rdx-park > svg { color: var(--rdx-go); flex-shrink: 0; }
.rdx-park p { margin: 0; flex: 1; font-size: 11px; line-height: 1.5; color: var(--sd-text-secondary); }
.rdx-park p b { color: var(--rdx-ink); }
.rdx-park-btn { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  padding: 7px 12px; border-radius: 10px; font-size: 11.5px; font-weight: 800; font-family: inherit;
  cursor: pointer; color: var(--rdx-go); background: color-mix(in srgb, var(--rdx-go) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--rdx-go) 45%, transparent); }
.rdx-park-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═══ the verdict ═══ */
.rdx-verdict { display: flex; flex-direction: column; gap: 8px; }
.rdx-vh { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.13em; color: var(--rdx-halt); }
.rdx-vh em { font-style: normal; font-weight: 600; letter-spacing: 0.06em; color: var(--rdx-dim); }
.rdx-reasons { display: flex; flex-wrap: wrap; gap: 6px; }
.rdx-reason { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 999px;
  font-size: 11px; font-weight: 600; font-family: inherit; cursor: pointer; color: var(--sd-text-secondary);
  background: color-mix(in srgb, var(--rdx-ink) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--rdx-ink) 14%, transparent);
  transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.2s; }
.rdx-reason:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--rdx-halt) 40%, transparent); }
.rdx-reason.on { color: var(--rdx-halt); font-weight: 700;
  border-color: color-mix(in srgb, var(--rdx-halt) 55%, transparent);
  background: color-mix(in srgb, var(--rdx-halt) 9%, transparent); }
.rdx-reason .tick { animation: rdx-tick 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes rdx-tick { from { transform: scale(0.3); } to { transform: scale(1); } }
.rdx-note { width: 100%; padding: 9px 11px; border-radius: 10px; font-size: 11.5px; font-family: inherit;
  resize: vertical; color: var(--rdx-ink); background: var(--sd-surface);
  border: 1px solid color-mix(in srgb, var(--rdx-ink) 14%, transparent); }
.rdx-note:focus { outline: none; border-color: color-mix(in srgb, var(--rdx-halt) 45%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rdx-halt) 10%, transparent); }
.rdx-note::placeholder { color: var(--rdx-dim); opacity: 0.75; }

/* ═══ hold-to-decommission ═══ */
.rdx-hold { position: relative; display: inline-flex; align-items: center; gap: 7px; overflow: hidden;
  padding: 9px 16px; border-radius: 11px; font-size: 12px; font-weight: 800; font-family: inherit;
  cursor: pointer; user-select: none; touch-action: none; color: var(--sd-qc-halt);
  background: var(--sd-qc-halt-soft, color-mix(in srgb, var(--sd-qc-halt) 10%, transparent));
  border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 45%, transparent);
  transition: box-shadow 0.2s, opacity 0.2s; }
.rdx-hold:disabled { opacity: 0.45; cursor: not-allowed; }
.rdx-hold.ready:not(:disabled):hover { box-shadow: 0 0 16px color-mix(in srgb, var(--sd-qc-halt) 30%, transparent); }
.rdx-hold.holding { box-shadow: 0 0 22px color-mix(in srgb, var(--sd-qc-halt) 50%, transparent); }
.rdx-hold-fill { position: absolute; inset: 0; transform-origin: left center; pointer-events: none;
  background: color-mix(in srgb, var(--sd-qc-halt) 30%, transparent); }
.rdx-hold-lb, .rdx-hold > svg { position: relative; }
.rdx-spin { animation: rdx-rot 0.8s linear infinite; }
@keyframes rdx-rot { to { transform: rotate(360deg); } }

/* footer buttons — section-scoped .qcf-btn can't reach in here; mirrored locally */
.qcf-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 11px;
  font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-elevated); color: var(--sd-text);
  transition: border-color 0.2s; }
.qcf-btn:hover { border-color: var(--sd-qc-brd); }
.qcf-btn.danger { border-color: color-mix(in srgb, var(--sd-qc-halt) 40%, transparent);
  color: var(--sd-qc-halt); background: color-mix(in srgb, var(--sd-qc-halt) 9%, transparent); }
.qcf-btn:disabled { opacity: 0.45; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rdx-plate { animation-duration: 0.01s; }
  html:not([data-cinematic="on"]) .rdx-lamp.on,
  html:not([data-cinematic="on"]) .rdx-reason .tick { animation: none; }
}
</style>
