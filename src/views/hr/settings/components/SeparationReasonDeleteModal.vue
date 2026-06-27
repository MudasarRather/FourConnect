<template>
  <SetModal :open="open" :title="`Remove ${target?.label || 'reason'}`" subtitle="Workforce · Exit lexicon"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="layout === 'cols' ? 800 : 720" mode="delete" @close="$emit('close')">
    <div class="srd" :class="layout">
      <!-- ░ DOSSIER — the voided boarding pass (left when ≤3 facts, bottom when more) ░ -->
      <section class="srd-info">
        <div class="srd-pass" :class="{ tearing: loading }" :data-nat="nat">
          <span class="srd-pass-grid" aria-hidden="true" />
          <span class="srd-stampmark" :class="{ slam: loading }" aria-hidden="true">VOID</span>
          <div class="srd-pass-body">
            <div class="srd-pass-top">
              <span class="srd-pass-gate" :data-vocab="target?.category"><b>{{ gate }}</b>{{ vocabLabel }}</span>
              <span class="srd-pass-state">Pending removal</span>
            </div>
            <b class="srd-pass-label">{{ target?.label || '—' }}</b>
            <div class="srd-fields">
              <div v-for="f in fields" :key="f.k" class="srd-field" :data-tone="f.tone">
                <span class="srd-field-lab"><component :is="f.icon" :size="11" /> {{ f.lab }}</span>
                <b :class="{ mono: f.mono }">{{ f.val }}</b>
              </div>
            </div>
          </div>
          <div class="srd-pass-stub">
            <span class="srd-stub-eyebrow">Cited</span>
            <b class="srd-stub-num">{{ cited }}</b>
            <span class="srd-pass-barcode" aria-hidden="true" />
          </div>
        </div>
      </section>

      <!-- ░ ACTION — pre-flight + reason + nudge ░ -->
      <section class="srd-action">
        <div class="srd-checks">
          <span class="srd-checks-lab">Removal pre-flight</span>

          <Motion as="div" class="srd-check" :data-state="cited > 0 ? 'fail' : 'pass'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.06 }">
            <span class="srd-check-ic"><component :is="cited > 0 ? XCircle : CheckCircle2" :size="15" /></span>
            <div class="srd-check-body">
              <b>{{ cited > 0 ? `${cited} exit case${cited === 1 ? '' : 's'} cite this reason` : 'No exit case cites this reason' }}</b>
              <span>{{ cited > 0 ? 'The server refuses removal (409) until those cases are re-classified — their attrition reporting depends on it.' : 'No live exit case references this code — safe to remove.' }}</span>
            </div>
            <button v-if="cited > 0" class="srd-check-go" @click="$emit('view-exits', target)">Exit cases <ArrowRight :size="12" /></button>
          </Motion>

          <Motion v-if="target?.is_system" as="div" class="srd-check" data-state="fail"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
            <span class="srd-check-ic"><Lock :size="15" /></span>
            <div class="srd-check-body">
              <b>Built-in reason — deletion locked</b>
              <span>This code backs the exit enum, so cases can always resolve it. It can be relabelled or deactivated, never deleted.</span>
            </div>
          </Motion>

          <Motion as="div" class="srd-check" :data-state="target?.is_active ? 'warn' : 'info'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
            <span class="srd-check-ic"><component :is="target?.is_active ? AlertTriangle : Info" :size="15" /></span>
            <div class="srd-check-body">
              <b>{{ target?.is_active ? 'Active — on the departures board' : 'Already off the board' }}</b>
              <span>{{ target?.is_active ? 'Removal pulls it from the Exit resignation & interview pickers immediately.' : 'It is already hidden from every Exit picker.' }}</span>
            </div>
          </Motion>
        </div>

        <!-- non-destructive nudge -->
        <Motion v-if="target?.is_active" as="div" class="srd-soft"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
          <div class="srd-soft-txt"><PowerOff :size="14" /><span>Prefer <b>deactivating</b>? It stays in the lexicon and audit trail — just hidden from new selections. Fully reversible.</span></div>
          <button type="button" class="srd-soft-btn" :disabled="loading" @click="$emit('deactivate', target)">Deactivate instead</button>
        </Motion>

        <!-- reason -->
        <div class="srd-reason">
          <span class="srd-reason-lab">Reason for removal <i>*</i></span>
          <div class="srd-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="srd-preset" :class="{ on: reason === p }" @click="reason = reason === p ? '' : p">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="srd-textarea" placeholder="Recorded in the settings ledger — e.g. merged 'Career growth' into 'Better opportunity' after the taxonomy review…" />
        </div>

        <Motion v-if="blocked && (cited > 0 || target?.is_system)" as="div" class="srd-blocked"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
          <ShieldAlert :size="14" /> {{ target?.is_system ? 'Built-in reasons can only be deactivated.' : `Locked while ${cited} exit case${cited === 1 ? '' : 's'} still cite this reason.` }}
        </Motion>
      </section>
    </div>

    <!-- process strip (always full width, bottom) -->
    <div class="srd-process">
      <span class="srd-process-lab"><Workflow :size="12" /> What removal does</span>
      <div class="srd-steps">
        <div v-for="(s, i) in STEPS" :key="i" class="srd-step"><span class="srd-step-n">{{ i + 1 }}</span><div><b>{{ s.t }}</b><span>{{ s.d }}</span></div></div>
      </div>
    </div>

    <template #footer>
      <span class="srd-foot-actor"><span class="srd-foot-av">{{ initials }}</span> Removing as {{ name }}</span>
      <span class="srd-foot-sp" />
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn srd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="confirm">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ loading ? 'Voiding…' : confirmLabel }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Hash, FileText, Info, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Workflow, PowerOff, Power, Users, Lock, LogOut, ArrowUpRight, ShieldX, Minus, Archive, History, RotateCcw } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import { useActor, actorName, actorInitials } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  cited: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'confirm', 'deactivate', 'view-exits'])

const actor = useActor()
const name = computed(() => actorName(actor.value))
const initials = computed(() => actorInitials(actor.value))

const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Consolidated into another reason', 'Duplicate', 'Policy change', 'No longer used', 'Created in error']
const STEPS = [
  { t: 'Reason logged', d: 'Your note is sealed into the settings audit ledger.' },
  { t: 'Soft-delete', d: 'is_deleted flips — the reason leaves every Exit picker.' },
  { t: 'Guarded', d: 'Refused (409) while any exit case still cites it.' },
  { t: 'Reversible', d: 'A super admin can restore it from the recovery view.' },
]

const vol = computed(() => props.target?.is_voluntary === true)
const invol = computed(() => props.target?.is_voluntary === false)
const nat = computed(() => (vol.value ? 'vol' : invol.value ? 'invol' : 'neutral'))
const gate = computed(() => (props.target?.category === 'RESIGNATION_TYPE' ? 'R' : 'E'))
const vocabLabel = computed(() => (props.target?.category === 'RESIGNATION_TYPE' ? 'Resignation type' : 'Exit reason'))

// Dossier facts — only meaningful ones; the COUNT drives the layout.
const fields = computed(() => {
  const t = props.target || {}
  const out = [
    { k: 'code', lab: 'Code', icon: Hash, val: t.code || '—', mono: true, tone: 'gold' },
    { k: 'vocab', lab: 'Vocabulary', icon: t.category === 'RESIGNATION_TYPE' ? LogOut : FileText, val: vocabLabel.value, tone: 'gold' },
    { k: 'status', lab: 'Status', icon: t.is_active ? Power : PowerOff, val: t.is_active ? 'Active' : 'Inactive', tone: t.is_active ? 'ok' : 'warn' },
  ]
  if (t.is_voluntary === true || t.is_voluntary === false) {
    out.push({ k: 'nat', lab: 'Nature', icon: vol.value ? ArrowUpRight : ShieldX, val: vol.value ? 'Voluntary' : 'Involuntary', tone: vol.value ? 'ok' : 'danger' })
  }
  if (props.cited > 0) out.push({ k: 'cited', lab: 'Cited by', icon: Users, val: `${props.cited} exit${props.cited === 1 ? '' : 's'}`, tone: 'danger' })
  if (t.description) out.push({ k: 'desc', lab: 'Notes', icon: FileText, val: t.description, tone: 'gold' })
  return out
})
// ≤3 facts → dossier on the LEFT (cols); more → drop it to a BOTTOM strip (stacked).
const layout = computed(() => (fields.value.length > 3 ? 'stacked' : 'cols'))

const blocked = computed(() => !reason.value.trim() || props.cited > 0 || !!props.target?.is_system)
const confirmLabel = computed(() => {
  if (props.target?.is_system) return 'Built-in — deactivate only'
  if (props.cited > 0) return 'Reassign exits first'
  if (!reason.value.trim()) return 'Add a reason'
  return 'Void & remove'
})
const confirm = () => { if (!blocked.value && !props.loading) emit('confirm', reason.value.trim()) }
</script>

<style scoped>
.srd { display: grid; gap: 16px; }
.srd.cols { grid-template-columns: 290px minmax(0, 1fr); align-items: start; }
.srd.stacked { display: flex; flex-direction: column; }
.srd.stacked .srd-action { order: 1; }
.srd.stacked .srd-info { order: 2; }

/* ── dossier: the voided boarding pass ── */
.srd-pass { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(0,1fr) 70px; border-radius: 15px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); transition: filter 0.6s, opacity 0.6s; }
.srd-pass-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 76%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 76%); }
.srd-stampmark { position: absolute; top: 46%; left: 38%; z-index: 5; transform: translate(-50%, -50%) rotate(-16deg) scale(1.6);
  font-size: 30px; font-weight: 900; letter-spacing: 0.12em; color: color-mix(in srgb, var(--set-conflict) 0%, transparent);
  border: 4px solid transparent; border-radius: 9px; padding: 1px 12px; pointer-events: none; opacity: 0; transition: opacity 0.3s; }
.srd-stampmark.slam { animation: srd-slam 0.5s cubic-bezier(0.3,1.4,0.5,1) forwards; }
@keyframes srd-slam { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(-16deg) scale(2.4); }
  60% { opacity: 1; transform: translate(-50%,-50%) rotate(-16deg) scale(0.92); color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); }
  100% { opacity: 1; transform: translate(-50%,-50%) rotate(-16deg) scale(1); color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); } }

.srd-pass-spine { display: none; }
.srd-pass-body { position: relative; padding: 14px 15px; display: flex; flex-direction: column; gap: 9px; min-width: 0; transition: transform 0.6s var(--set-spring), opacity 0.6s; }
.srd-pass.tearing .srd-pass-body { transform: translateX(-9px) rotate(-2deg); opacity: 0.55; filter: grayscale(0.6); }
.srd-pass-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.srd-pass-gate { display: inline-flex; align-items: center; gap: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.srd-pass-gate b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; font-family: var(--set-mono); font-size: 11px; color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); }
.srd-pass-state { font-size: 8.5px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px;
  color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); }
.srd-pass-label { font-size: 16px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.srd-fields { display: grid; gap: 8px; }
.srd.stacked .srd-fields { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.srd-field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.srd-field-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.srd-field-lab :deep(svg) { color: var(--set-text-muted); }
.srd-field b { font-size: 12.5px; font-weight: 700; color: var(--set-text-secondary); word-break: break-word; }
.srd-field b.mono { font-family: var(--set-mono); }
.srd-field[data-tone="danger"] b { color: var(--set-conflict); }
.srd-field[data-tone="ok"] b { color: var(--set-ok); }

.srd-pass-stub { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 12px 6px;
  background: var(--set-surface); border-left: 2px dashed color-mix(in srgb, var(--set-conflict) 30%, transparent); transition: transform 0.6s var(--set-spring), opacity 0.6s; }
.srd-pass.tearing .srd-pass-stub { transform: translateX(11px) rotate(3deg); opacity: 0.4; }
.srd-stub-eyebrow { font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.srd-stub-num { font-family: var(--set-mono); font-size: 20px; font-weight: 850; line-height: 1; color: var(--set-conflict); }
.srd-pass-barcode { width: 100%; height: 22px; margin-top: 5px; border-radius: 3px; opacity: 0.55;
  background: repeating-linear-gradient(90deg, var(--set-text) 0 1px, transparent 1px 3px, var(--set-text) 3px 4px, transparent 4px 7px); }

/* ── action ── */
.srd-action { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.srd-checks { display: flex; flex-direction: column; gap: 8px; }
.srd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.srd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.srd-check[data-state="pass"] { border-left-color: var(--set-ok); }
.srd-check[data-state="fail"] { border-left-color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 6%, var(--set-surface)); }
.srd-check[data-state="warn"] { border-left-color: var(--set-partial); }
.srd-check[data-state="info"] { border-left-color: var(--set-gold); }
.srd-check-ic { flex-shrink: 0; margin-top: 1px; }
.srd-check[data-state="pass"] .srd-check-ic :deep(svg) { color: var(--set-ok); }
.srd-check[data-state="fail"] .srd-check-ic :deep(svg) { color: var(--set-conflict); }
.srd-check[data-state="warn"] .srd-check-ic :deep(svg) { color: var(--set-partial); }
.srd-check[data-state="info"] .srd-check-ic :deep(svg) { color: var(--set-gold); }
.srd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.srd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.srd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.srd-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 32%, transparent); transition: all 0.2s; }
.srd-check-go:hover { background: color-mix(in srgb, var(--set-conflict) 18%, transparent); }

.srd-soft { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px;
  background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.srd-soft-txt { display: flex; align-items: center; gap: 8px; font-size: 11.5px; line-height: 1.4; color: var(--set-text-secondary); }
.srd-soft-txt b { color: var(--set-text); }
.srd-soft-txt :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.srd-soft-btn { flex-shrink: 0; padding: 7px 13px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700;
  color: var(--set-ok); background: transparent; border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); transition: all 0.2s; }
.srd-soft-btn:hover { background: color-mix(in srgb, var(--set-ok) 14%, transparent); transform: translateY(-1px); }
.srd-soft-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.srd-reason { display: flex; flex-direction: column; gap: 7px; }
.srd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.srd-reason-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.srd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.srd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.srd-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.srd-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.srd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.srd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.srd-textarea::placeholder { color: var(--hr-input-placeholder); }

.srd-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.srd-blocked :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

/* process strip */
.srd-process { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--set-border); display: flex; flex-direction: column; gap: 10px; }
.srd-process-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.srd-process-lab :deep(svg) { color: var(--set-conflict); }
.srd-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 9px; }
.srd-step { display: flex; align-items: flex-start; gap: 9px; padding: 10px 11px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border);
  border-top: 2px solid color-mix(in srgb, var(--set-conflict) 50%, transparent); }
.srd-step-n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; font-size: 10px; font-weight: 850; color: var(--set-conflict);
  background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.srd-step div { display: flex; flex-direction: column; gap: 1px; }
.srd-step b { font-size: 11.5px; font-weight: 750; color: var(--set-text); }
.srd-step span { font-size: 10px; line-height: 1.4; color: var(--set-text-muted); }

/* footer */
.srd-foot-actor { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--set-text-muted); }
.srd-foot-av { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; font-size: 9.5px; font-weight: 850; color: #1a1206; background: var(--set-grad-hero); }
.srd-foot-sp { flex: 1; }
.srd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.srd-confirm:hover { color: #fff; }
.srd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 720px) { .srd.cols { grid-template-columns: 1fr; } .srd-soft { flex-direction: column; align-items: stretch; } }
@media (prefers-reduced-motion: reduce) {
  .srd-pass, .srd-pass-body, .srd-pass-stub { transition: none; }
  .srd-stampmark.slam { animation: none; opacity: 1; color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); }
}
</style>
