<template>
  <SetModal :open="open" :title="`Remove ${label}`" subtitle="Pay & Statutory · Compliance"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="layout === 'cols' ? 800 : 720" mode="delete" @close="$emit('close')">
    <div class="cd" :class="layout">
      <!-- ░ DOSSIER — the revoked statute plate (left when ≤3 facts, bottom when more) ░ -->
      <section class="cd-info">
        <div class="cd-plate" :class="{ revoking: loading }" :style="{ '--c': hex }">
          <span class="cd-plate-grid" aria-hidden="true" />
          <span class="cd-stampmark" :class="{ slam: loading }" aria-hidden="true">REVOKED</span>
          <div class="cd-plate-head">
            <span class="cd-plate-seal"><component :is="icon" :size="16" /></span>
            <div class="cd-plate-id">
              <span class="cd-plate-eyebrow">{{ familyLabel }}</span>
              <b>{{ label }}</b>
              <span class="cd-plate-key set-mono">{{ target?.key }}</span>
            </div>
          </div>
          <div class="cd-facts">
            <div v-for="f in facts" :key="f.k" class="cd-fact" :data-tone="f.tone">
              <span class="cd-fact-lab"><component :is="f.icon" :size="11" /> {{ f.lab }}</span>
              <b :class="{ mono: f.mono }">{{ f.val }}</b>
            </div>
          </div>
        </div>
      </section>

      <!-- ░ ACTION — impact + reason + nudge ░ -->
      <section class="cd-action">
        <div class="cd-checks">
          <span class="cd-checks-lab">Impact check</span>

          <Motion as="div" class="cd-check" :data-state="mapped ? 'warn' : 'info'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.06 }">
            <span class="cd-check-ic"><component :is="mapped ? AlertTriangle : Info" :size="15" /></span>
            <div class="cd-check-body">
              <b>{{ mapped ? `Payroll reverts to the statutory default` : 'Ignored by the engine anyway' }}</b>
              <span>{{ mapped ? `Future ${familyLabel} runs in scope use the built-in fallback the moment this is removed.` : 'This key is not one load_config() reads, so removing it is pure housekeeping.' }}</span>
            </div>
          </Motion>

          <Motion as="div" class="cd-check" data-state="pass"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.12 }">
            <span class="cd-check-ic"><ShieldCheck :size="15" /></span>
            <div class="cd-check-body">
              <b>Processed payslips are safe</b>
              <span>Each payroll batch freezes its own config snapshot — removing a rate never rewrites a payslip that already ran.</span>
            </div>
          </Motion>

          <Motion as="div" class="cd-check" data-state="info"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.18 }">
            <span class="cd-check-ic"><History :size="15" /></span>
            <div class="cd-check-body">
              <b>Hard delete · logged</b>
              <span>Config rows aren't transactional, so this row is permanently removed — the deletion + your reason are sealed into the payroll audit ledger.</span>
            </div>
          </Motion>
        </div>

        <Motion v-if="target?.is_active !== false" as="div" class="cd-soft"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.22 }">
          <div class="cd-soft-txt"><PowerOff :size="14" /><span>Prefer <b>deactivating</b>? It stays on file and in history — just stops being picked by the engine. Fully reversible.</span></div>
          <button type="button" class="cd-soft-btn" :disabled="loading" @click="$emit('deactivate', target)">Deactivate instead</button>
        </Motion>

        <div class="cd-reason">
          <span class="cd-reason-lab">Reason for removal <i>*</i></span>
          <div class="cd-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="cd-preset" :class="{ on: reason === p }" @click="reason = reason === p ? '' : p">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="cd-textarea" placeholder="Recorded in the payroll audit ledger — e.g. superseded by the FY2026-27 revision after the Union Budget…" />
        </div>
      </section>
    </div>

    <!-- process strip (full width, bottom) -->
    <div class="cd-process">
      <span class="cd-process-lab"><Workflow :size="12" /> What removal does</span>
      <div class="cd-steps">
        <div v-for="(s, i) in STEPS" :key="i" class="cd-step"><span class="cd-step-n">{{ i + 1 }}</span><div><b>{{ s.t }}</b><span>{{ s.d }}</span></div></div>
      </div>
    </div>

    <template #footer>
      <span class="cd-foot-actor"><span class="cd-foot-av">{{ initials }}</span> Removing as {{ name }}</span>
      <span class="cd-foot-sp" />
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn cd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="confirm">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" /> {{ loading ? 'Removing…' : (blocked ? 'Add a reason' : 'Revoke rate') }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Info, AlertTriangle, ShieldCheck, History, PowerOff, Workflow,
  Hash, SlidersHorizontal, MapPin, Globe2, CalendarRange, CalendarOff, Power, Plug, Unplug,
  PiggyBank, HeartPulse, Landmark, Receipt, ShieldQuestion } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import { useActor, actorName, actorInitials } from '../composables/useActor'
import { catalogFor, FAMILY_HEX, familyMeta, displayValue } from './complianceCatalog'
import { titleCase } from '../composables/useHrSettings'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
})
const emit = defineEmits(['close', 'confirm', 'deactivate'])

const actor = useActor()
const name = computed(() => actorName(actor.value))
const initials = computed(() => actorInitials(actor.value))
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Superseded by a new rate', 'Duplicate', 'Wrong key / created in error', 'Policy change', 'No longer applicable']
const STEPS = [
  { t: 'Reason logged', d: 'Your note is sealed into the payroll audit ledger.' },
  { t: 'Row removed', d: 'The config row is permanently deleted from this fiscal year.' },
  { t: 'Engine fallback', d: 'Future runs in scope use the statutory default for this key.' },
  { t: 'Past untouched', d: 'Processed payslips kept their own frozen snapshot.' },
]

const ICONS = { pf: PiggyBank, esi: HeartPulse, pt: Landmark, tax: Receipt }
const cat = computed(() => catalogFor(props.target?.key))
const mapped = computed(() => !!cat.value)
const family = computed(() => cat.value?.family || null)
const hex = computed(() => FAMILY_HEX[family.value] || '#9ca3af')
const icon = computed(() => ICONS[family.value] || ShieldQuestion)
const familyLabel = computed(() => (family.value ? familyMeta(family.value).label : 'Unmapped key'))
const label = computed(() => cat.value?.label || titleCase(props.target?.key || 'rate'))

const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return String(d).slice(0, 10) } }

// facts — count drives the dynamic layout (≤3 → left dossier, >3 → bottom strip)
const facts = computed(() => {
  const t = props.target || {}
  const out = [
    { k: 'val', lab: 'Value', icon: SlidersHorizontal, val: displayValue(t), tone: 'gold' },
    { k: 'scope', lab: 'Scope', icon: t.state_code ? MapPin : Globe2, val: t.state_code || 'National', tone: 'gold' },
    { k: 'from', lab: 'Effective from', icon: CalendarRange, val: fmtDate(t.effective_from), tone: 'gold' },
  ]
  if (t.effective_to) out.push({ k: 'to', lab: 'Effective to', icon: CalendarOff, val: fmtDate(t.effective_to), tone: 'warn' })
  if (t.is_active === false) out.push({ k: 'status', lab: 'Status', icon: Power, val: 'Inactive', tone: 'warn' })
  out.push({ k: 'engine', lab: 'Engine', icon: mapped.value ? Plug : Unplug, val: mapped.value ? 'Read' : 'Ignored', tone: mapped.value ? 'ok' : 'danger' })
  if (t.description) out.push({ k: 'desc', lab: 'Note', icon: Hash, val: t.description, tone: 'gold' })
  return out
})
const layout = computed(() => (facts.value.length > 3 ? 'stacked' : 'cols'))

const blocked = computed(() => !reason.value.trim())
const confirm = () => { if (!blocked.value && !props.loading) emit('confirm', reason.value.trim()) }
</script>

<style scoped>
.cd { display: grid; gap: 16px; }
.cd.cols { grid-template-columns: 290px minmax(0, 1fr); align-items: start; }
.cd.stacked { display: flex; flex-direction: column; }
.cd.stacked .cd-action { order: 1; }
.cd.stacked .cd-info { order: 2; }

/* dossier — the revoked statute plate */
.cd-plate { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px; border-radius: 15px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); transition: filter 0.6s, opacity 0.6s; }
.cd-plate.revoking { filter: grayscale(0.6) brightness(0.85); opacity: 0.6; }
.cd-plate-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: linear-gradient(color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px); background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 76%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 76%); }
.cd-stampmark { position: absolute; top: 44%; left: 50%; z-index: 5; transform: translate(-50%, -50%) rotate(-14deg) scale(1.5); font-size: 26px; font-weight: 900; letter-spacing: 0.1em; color: transparent; border: 4px solid transparent; border-radius: 9px; padding: 1px 12px; pointer-events: none; opacity: 0; }
.cd-stampmark.slam { animation: cd-slam 0.5s cubic-bezier(0.3,1.4,0.5,1) forwards; }
@keyframes cd-slam { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(-14deg) scale(2.4); } 60% { opacity: 1; transform: translate(-50%,-50%) rotate(-14deg) scale(0.92); color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); } 100% { opacity: 1; transform: translate(-50%,-50%) rotate(-14deg) scale(1); color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); } }
.cd-plate-head { position: relative; display: flex; align-items: center; gap: 11px; }
.cd-plate-seal { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.cd-plate-id { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cd-plate-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.cd-plate-id b { font-size: 14px; font-weight: 850; color: var(--set-text); line-height: 1.15; }
.cd-plate-key { font-size: 9.5px; color: var(--set-text-dim); }
.cd-facts { position: relative; display: grid; gap: 9px; }
.cd.stacked .cd-facts { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.cd-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cd-fact-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.cd-fact-lab :deep(svg) { color: var(--set-text-muted); }
.cd-fact b { font-size: 12.5px; font-weight: 700; color: var(--set-text-secondary); word-break: break-word; }
.cd-fact b.mono { font-family: var(--set-mono); }
.cd-fact[data-tone="ok"] b { color: var(--set-ok); } .cd-fact[data-tone="warn"] b { color: var(--set-partial); } .cd-fact[data-tone="danger"] b { color: var(--set-conflict); }

/* action */
.cd-action { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.cd-checks { display: flex; flex-direction: column; gap: 8px; }
.cd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.cd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px; background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.cd-check[data-state="pass"] { border-left-color: var(--set-ok); } .cd-check[data-state="pass"] .cd-check-ic :deep(svg) { color: var(--set-ok); }
.cd-check[data-state="warn"] { border-left-color: var(--set-partial); background: color-mix(in srgb, var(--set-partial) 5%, var(--set-surface)); } .cd-check[data-state="warn"] .cd-check-ic :deep(svg) { color: var(--set-partial); }
.cd-check[data-state="info"] { border-left-color: var(--set-ok); } .cd-check[data-state="info"] .cd-check-ic :deep(svg) { color: var(--set-ok); }
.cd-check-ic { flex-shrink: 0; margin-top: 1px; }
.cd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.cd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }

.cd-soft { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px; background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.cd-soft-txt { display: flex; align-items: center; gap: 8px; font-size: 11.5px; line-height: 1.4; color: var(--set-text-secondary); }
.cd-soft-txt b { color: var(--set-text); } .cd-soft-txt :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.cd-soft-btn { flex-shrink: 0; padding: 7px 13px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--set-ok); background: transparent; border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); transition: all 0.2s; }
.cd-soft-btn:hover { background: color-mix(in srgb, var(--set-ok) 14%, transparent); transform: translateY(-1px); }
.cd-soft-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cd-reason { display: flex; flex-direction: column; gap: 7px; }
.cd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.cd-reason-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.cd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.cd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.cd-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.cd-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.cd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.cd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.cd-textarea::placeholder { color: var(--hr-input-placeholder); }

.cd-process { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--set-border); display: flex; flex-direction: column; gap: 10px; }
.cd-process-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.cd-process-lab :deep(svg) { color: var(--set-conflict); }
.cd-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 9px; }
.cd-step { display: flex; align-items: flex-start; gap: 9px; padding: 10px 11px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); border-top: 2px solid color-mix(in srgb, var(--set-conflict) 50%, transparent); }
.cd-step-n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; font-size: 10px; font-weight: 850; color: var(--set-conflict); background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.cd-step div { display: flex; flex-direction: column; gap: 1px; }
.cd-step b { font-size: 11.5px; font-weight: 750; color: var(--set-text); }
.cd-step span { font-size: 10px; line-height: 1.4; color: var(--set-text-muted); }

.cd-foot-actor { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--set-text-muted); }
.cd-foot-av { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; font-size: 9.5px; font-weight: 850; color: #1a1206; background: var(--set-grad-hero); }
.cd-foot-sp { flex: 1; }
.cd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.cd-confirm:hover { color: #fff; } .cd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 720px) { .cd.cols { grid-template-columns: 1fr; } .cd-soft { flex-direction: column; align-items: stretch; } }
@media (prefers-reduced-motion: reduce) { .cd-plate { transition: none; } .cd-stampmark.slam { animation: none; opacity: 1; color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 55%, transparent); } }
</style>
