<template>
  <SetModal :open="open" :title="`Decommission ${moduleMeta?.label || 'series'}`" subtitle="Pay & Statutory · Sequences"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="820" mode="delete" @close="$emit('close')">
    <div class="nd">
      <!-- ░ DOSSIER — the die plate, struck VOID on confirm ░ -->
      <section class="nd-info">
        <div class="nd-plate" :class="{ striking: loading }">
          <span class="nd-plate-grid" aria-hidden="true" />
          <span class="nd-void" :class="{ slam: loading }" aria-hidden="true">VOID</span>
          <span class="nd-plate-rivet tl" /><span class="nd-plate-rivet tr" />
          <span class="nd-plate-rivet bl" /><span class="nd-plate-rivet br" />

          <div class="nd-plate-top">
            <span class="nd-plate-mod set-mono">{{ target?.module || '—' }}</span>
            <span class="nd-plate-state" :data-on="target?.is_active">{{ target?.is_active ? 'Active' : 'Paused' }}</span>
          </div>
          <span class="nd-plate-lab">Current next identifier</span>
          <b class="nd-plate-id set-mono">{{ preview }}</b>

          <div class="nd-facts">
            <div v-for="f in facts" :key="f.k" class="nd-fact" :data-tone="f.tone">
              <span class="nd-fact-lab"><component :is="f.icon" :size="11" /> {{ f.lab }}</span>
              <b :class="{ mono: f.mono }">{{ f.val }}</b>
            </div>
          </div>
          <div class="nd-toks">
            <span v-for="t in tokens" :key="t.key" class="nd-tok" :class="{ on: t.on }">{{ t.label }}</span>
          </div>
        </div>
      </section>

      <!-- ░ ACTION — pre-flight + nudge + reason ░ -->
      <section class="nd-action">
        <div class="nd-checks">
          <span class="nd-checks-lab">Decommission pre-flight</span>

          <Motion as="div" class="nd-check" data-state="info"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.06 }">
            <span class="nd-check-ic"><RotateCcw :size="15" /></span>
            <div class="nd-check-body">
              <b>Reverts to the built-in auto-ID</b>
              <span>{{ moduleMeta?.label || 'This module' }} goes back to the legacy sequence — IDs will look like <i class="set-mono">{{ sample }}</i> again.</span>
            </div>
          </Motion>

          <Motion as="div" class="nd-check" data-state="warn"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
            <span class="nd-check-ic"><AlertTriangle :size="15" /></span>
            <div class="nd-check-body">
              <b>The counter ({{ target?.current_number ?? 0 }}) is forgotten</b>
              <span>If you re-configure this module later, run <b>Sync</b> so the new series continues from the highest ID in the database — otherwise it may re-issue numbers that already exist.</span>
            </div>
          </Motion>

          <Motion v-if="target?.is_active" as="div" class="nd-check" data-state="fail"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
            <span class="nd-check-ic"><Zap :size="15" /></span>
            <div class="nd-check-body">
              <b>Active series — format changes immediately</b>
              <span>The very next record created in this module will use the built-in format instead of <i class="set-mono">{{ preview }}</i>.</span>
            </div>
          </Motion>
        </div>

        <!-- non-destructive nudge -->
        <Motion as="div" class="nd-soft"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
          <div class="nd-soft-txt"><PowerOff :size="14" /><span>Just want to stop minting? <b>Pause</b> it instead — the format and counter ({{ target?.current_number ?? 0 }}) are kept, IDs fall back to built-in, and it's reversible in one click.</span></div>
          <button type="button" class="nd-soft-btn" :disabled="loading" @click="$emit('deactivate', target)">Pause instead</button>
        </Motion>

        <!-- reason -->
        <div class="nd-reason">
          <span class="nd-reason-lab">Reason for decommissioning <i>*</i></span>
          <div class="nd-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="nd-preset" :class="{ on: reason === p }" @click="reason = reason === p ? '' : p">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="nd-textarea" placeholder="Sealed into the settings audit ledger — e.g. switching back to the auto-sequence after the format trial…" />
        </div>

        <Motion v-if="!reason.trim()" as="div" class="nd-blocked"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
          <ShieldAlert :size="14" /> A reason is required — it's written to the audit trail.
        </Motion>
      </section>
    </div>

    <!-- process strip -->
    <div class="nd-process">
      <span class="nd-process-lab"><Workflow :size="12" /> What decommissioning does</span>
      <div class="nd-steps">
        <div v-for="(s, i) in STEPS" :key="i" class="nd-step"><span class="nd-step-n">{{ i + 1 }}</span><div><b>{{ s.t }}</b><span>{{ s.d }}</span></div></div>
      </div>
    </div>

    <template #footer>
      <span class="nd-foot-actor"><span class="nd-foot-av">{{ initials }}</span> Decommissioning as {{ name }}</span>
      <span class="nd-foot-sp" />
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn nd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="confirm">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ loading ? 'Striking VOID…' : confirmLabel }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Hash, RotateCcw, AlertTriangle, Zap, PowerOff, ShieldAlert, Workflow, Ruler, Share2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import { useActor, actorName, actorInitials } from '../composables/useActor'
import { nextId, builtinSample, tokenAnatomy, downstreamOf } from '../composables/numberingFormat'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },        // series row
  moduleMeta: { type: Object, default: null },     // { module, label, sample_prefix }
})
const emit = defineEmits(['close', 'confirm', 'deactivate'])

const actor = useActor()
const name = computed(() => actorName(actor.value))
const initials = computed(() => actorInitials(actor.value))

const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Reverting to auto-sequence', 'Wrong format configured', 'Format trial ended', 'Created in error', 'Consolidating numbering']
const STEPS = [
  { t: 'Reason logged', d: 'Your note is sealed into the settings audit ledger.' },
  { t: 'Soft-delete', d: 'is_deleted flips — the series stops minting at once.' },
  { t: 'Reverts', d: 'The module falls back to its built-in auto-ID sequence.' },
  { t: 'Reversible', d: 'A super admin can restore it; re-Sync before re-use.' },
]

const preview = computed(() => (props.target ? nextId(props.target) : '—'))
const sample = computed(() => builtinSample(props.moduleMeta || {}))
const down = computed(() => downstreamOf(props.moduleMeta?.module || ''))
const tokens = computed(() => (props.target ? tokenAnatomy(props.target) : []))

const facts = computed(() => {
  const t = props.target || {}
  return [
    { k: 'counter', lab: 'Counter', icon: Hash, val: String(t.current_number ?? 0), mono: true, tone: 'gold' },
    { k: 'width', lab: 'Width', icon: Ruler, val: String(t.padding ?? 0), mono: true, tone: 'gold' },
    { k: 'reset', lab: 'Reset', icon: RotateCcw, val: t.financial_year_reset ? 'Each FY' : 'Never', tone: 'gold' },
    { k: 'powers', lab: 'Powers', icon: Share2, val: down.value.label, tone: 'gold' },
  ]
})

const blocked = computed(() => !reason.value.trim())
const confirmLabel = computed(() => (!reason.value.trim() ? 'Add a reason' : 'Decommission die'))
const confirm = () => { if (!blocked.value && !props.loading) emit('confirm', reason.value.trim()) }
</script>

<style scoped>
.nd { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 16px; align-items: start; }

/* ── dossier: the die plate ── */
.nd-plate { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 16px;
  border-radius: 15px; background: linear-gradient(150deg, color-mix(in srgb, var(--set-conflict) 8%, var(--set-panel)), var(--set-panel));
  border: 1px solid color-mix(in srgb, var(--set-conflict) 24%, transparent); transition: filter 0.6s; }
.nd-plate.striking { filter: grayscale(0.5) brightness(0.85); }
.nd-plate-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 78%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 78%); }
.nd-void { position: absolute; top: 46%; left: 50%; z-index: 5; transform: translate(-50%, -50%) rotate(-15deg) scale(1.6);
  font-size: 34px; font-weight: 900; letter-spacing: 0.16em; color: transparent; border: 4px solid transparent; border-radius: 9px; padding: 2px 14px;
  pointer-events: none; opacity: 0; }
.nd-void.slam { animation: nd-slam 0.55s cubic-bezier(0.3, 1.4, 0.5, 1) forwards; }
@keyframes nd-slam {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(-15deg) scale(2.6); }
  60% { opacity: 1; transform: translate(-50%, -50%) rotate(-15deg) scale(0.9); color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-15deg) scale(1); color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); }
}
.nd-plate-rivet { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: color-mix(in srgb, var(--set-conflict) 50%, var(--set-text-dim)); opacity: 0.5; }
.nd-plate-rivet.tl { top: 7px; left: 7px; } .nd-plate-rivet.tr { top: 7px; right: 7px; }
.nd-plate-rivet.bl { bottom: 7px; left: 7px; } .nd-plate-rivet.br { bottom: 7px; right: 7px; }
.nd-plate-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.nd-plate-mod { font-size: 9px; color: var(--set-text-dim); }
.nd-plate-state { font-size: 8.5px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; color: var(--set-unset); background: var(--set-unset-soft); }
.nd-plate-state[data-on="true"] { color: var(--set-ok); background: var(--set-ok-soft); }
.nd-plate-lab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nd-plate-id { font-size: 21px; font-weight: 850; letter-spacing: 0.06em; color: var(--set-conflict); word-break: break-all; }
.nd-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 2px; }
.nd-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nd-fact-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.nd-fact-lab :deep(svg) { color: var(--set-text-muted); }
.nd-fact b { font-size: 12px; font-weight: 750; color: var(--set-text-secondary); word-break: break-word; }
.nd-fact b.mono { font-family: var(--set-mono); }
.nd-toks { display: flex; flex-wrap: wrap; gap: 4px; }
.nd-tok { font-family: var(--set-mono); font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 5px; color: var(--set-text-dim); background: var(--set-surface-elevated); border: 1px solid var(--set-border); opacity: 0.5; }
.nd-tok.on { color: var(--set-conflict); opacity: 1; border-color: color-mix(in srgb, var(--set-conflict) 30%, transparent); }

/* ── action ── */
.nd-action { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.nd-checks { display: flex; flex-direction: column; gap: 8px; }
.nd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.nd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px; background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.nd-check[data-state="info"] { border-left-color: var(--set-gold); }
.nd-check[data-state="warn"] { border-left-color: var(--set-partial); }
.nd-check[data-state="fail"] { border-left-color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 6%, var(--set-surface)); }
.nd-check-ic { flex-shrink: 0; margin-top: 1px; }
.nd-check[data-state="info"] .nd-check-ic :deep(svg) { color: var(--set-gold); }
.nd-check[data-state="warn"] .nd-check-ic :deep(svg) { color: var(--set-partial); }
.nd-check[data-state="fail"] .nd-check-ic :deep(svg) { color: var(--set-conflict); }
.nd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.nd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.nd-check-body i { font-style: normal; color: var(--set-text-secondary); }

.nd-soft { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px; background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.nd-soft-txt { display: flex; align-items: center; gap: 8px; font-size: 11.5px; line-height: 1.4; color: var(--set-text-secondary); }
.nd-soft-txt b { color: var(--set-text); }
.nd-soft-txt :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.nd-soft-btn { flex-shrink: 0; padding: 7px 13px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--set-ok); background: transparent; border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); transition: all 0.2s; }
.nd-soft-btn:hover { background: color-mix(in srgb, var(--set-ok) 14%, transparent); transform: translateY(-1px); }
.nd-soft-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.nd-reason { display: flex; flex-direction: column; gap: 7px; }
.nd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.nd-reason-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.nd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.nd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.nd-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.nd-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.nd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.nd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.nd-textarea::placeholder { color: var(--hr-input-placeholder); }

.nd-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5; color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.nd-blocked :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

/* process strip */
.nd-process { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--set-border); display: flex; flex-direction: column; gap: 10px; }
.nd-process-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nd-process-lab :deep(svg) { color: var(--set-conflict); }
.nd-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 9px; }
.nd-step { display: flex; align-items: flex-start; gap: 9px; padding: 10px 11px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); border-top: 2px solid color-mix(in srgb, var(--set-conflict) 50%, transparent); }
.nd-step-n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; font-size: 10px; font-weight: 850; color: var(--set-conflict); background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.nd-step div { display: flex; flex-direction: column; gap: 1px; }
.nd-step b { font-size: 11.5px; font-weight: 750; color: var(--set-text); }
.nd-step span { font-size: 10px; line-height: 1.4; color: var(--set-text-muted); }

/* footer */
.nd-foot-actor { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--set-text-muted); }
.nd-foot-av { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; font-size: 9.5px; font-weight: 850; color: #1a1206; background: var(--set-grad-hero); }
.nd-foot-sp { flex: 1; }
.nd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220, 38, 38, 0.6); }
.nd-confirm:hover { color: #fff; }
.nd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 720px) { .nd { grid-template-columns: 1fr; } .nd-soft { flex-direction: column; align-items: stretch; } }
@media (prefers-reduced-motion: reduce) {
  .nd-plate { transition: none; }
  .nd-void.slam { animation: none; opacity: 1; color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); }
}
</style>
