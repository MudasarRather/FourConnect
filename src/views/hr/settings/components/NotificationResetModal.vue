<template>
  <SetModal :open="open" :title="`Reset ${event?.label || 'rule'} to default`" subtitle="Automation · Alerts"
    :icon="RotateCcw" accent-color="var(--set-gold)" :width="800" @close="$emit('close')">
    <div class="nrd">
      <!-- transmission dossier — fades to default on confirm -->
      <section class="nrd-info">
        <div class="nrd-card" :class="{ fading: loading }">
          <span class="nrd-card-grid" aria-hidden="true" />
          <span class="nrd-stamp" :class="{ slam: loading }" aria-hidden="true">DEFAULT</span>
          <div class="nrd-card-top">
            <span class="nrd-card-ic"><component :is="moduleIcon(event?.module)" :size="15" /></span>
            <div class="nrd-card-id">
              <b>{{ event?.label || '—' }}</b>
              <span class="nrd-card-aud"><component :is="audMeta.icon" :size="10" /> {{ audMeta.label }}</span>
            </div>
            <span class="nrd-card-state" :data-on="target?.is_active">{{ target?.is_active ? 'Active' : 'Muted' }}</span>
          </div>
          <span class="nrd-card-lab">Currently routes to</span>
          <div class="nrd-chs">
            <span v-for="c in chans" :key="c.key" class="nrd-ch" :style="{ '--cc': c.color }"><component :is="c.icon" :size="12" /> {{ c.label }}</span>
            <span v-if="!chans.length" class="nrd-ch-empty">silent — no channel set</span>
          </div>
          <div v-if="target?.template_title || target?.template_body" class="nrd-tpl">
            <span class="nrd-tpl-lab"><Pencil :size="10" /> Custom template</span>
            <b v-if="target?.template_title">{{ target.template_title }}</b>
            <span v-if="target?.template_body" class="nrd-tpl-body">{{ target.template_body }}</span>
          </div>
        </div>
      </section>

      <!-- pre-flight + reason -->
      <section class="nrd-action">
        <div class="nrd-checks">
          <span class="nrd-checks-lab">What reset does</span>
          <Motion as="div" class="nrd-check" data-state="ok"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.06 }">
            <span class="nrd-check-ic"><Bell :size="15" /></span>
            <div class="nrd-check-body"><b>In-app alerts keep working</b><span>The dispatcher defaults to in-app when no rule exists — the event is never silenced, it just stops following this custom routing.</span></div>
          </Motion>
          <Motion v-if="multi" as="div" class="nrd-check" data-state="info"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
            <span class="nrd-check-ic"><Send :size="15" /></span>
            <div class="nrd-check-body"><b>Multi-channel routing dropped</b><span>The {{ chans.length }}-channel fan-out for this audience reverts to the in-app default.</span></div>
          </Motion>
          <Motion v-if="hasTpl" as="div" class="nrd-check" data-state="warn"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
            <span class="nrd-check-ic"><AlertTriangle :size="15" /></span>
            <div class="nrd-check-body"><b>Custom template is removed</b><span>The override copy is deleted — alerts go back to the built-in default message.</span></div>
          </Motion>
        </div>

        <div class="nrd-reason">
          <span class="nrd-reason-lab">Reason <i>*</i></span>
          <div class="nrd-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="nrd-preset" :class="{ on: reason === p }" @click="reason = reason === p ? '' : p">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="nrd-textarea" placeholder="Sealed into the settings audit ledger — e.g. consolidating alert policy after the channel review…" />
        </div>

        <Motion v-if="!reason.trim()" as="div" class="nrd-blocked" :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
          <ShieldAlert :size="14" /> A reason is required — it's written to the audit trail.
        </Motion>
      </section>
    </div>

    <div class="nrd-process">
      <span class="nrd-process-lab"><Workflow :size="12" /> Process</span>
      <div class="nrd-steps">
        <div v-for="(s, i) in STEPS" :key="i" class="nrd-step"><span class="nrd-step-n">{{ i + 1 }}</span><div><b>{{ s.t }}</b><span>{{ s.d }}</span></div></div>
      </div>
    </div>

    <template #footer>
      <span class="nrd-foot-actor"><span class="nrd-foot-av">{{ initials }}</span> Resetting as {{ name }}</span>
      <span class="nrd-foot-sp" />
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn nrd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="confirm">
        <Loader v-if="loading" :size="14" class="set-spin" /><RotateCcw v-else :size="14" />
        {{ loading ? 'Resetting…' : (reason.trim() ? 'Reset to default' : 'Add a reason') }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { RotateCcw, Bell, Send, AlertTriangle, ShieldAlert, Workflow, Pencil, Loader } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import { useActor, actorName, actorInitials } from '../composables/useActor'
import { CHANNEL_BY_KEY, AUDIENCE_BY_VALUE, moduleIcon } from '../composables/notifyMeta'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },     // rule row
  event: { type: Object, default: null },       // { event, label, module }
})
const emit = defineEmits(['close', 'confirm'])

const actor = useActor()
const name = computed(() => actorName(actor.value))
const initials = computed(() => actorInitials(actor.value))

const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Consolidating alert policy', 'Channel no longer used', 'Configured by mistake', 'Reverting a trial']
const STEPS = [
  { t: 'Reason logged', d: 'Sealed into the settings audit ledger.' },
  { t: 'Rule removed', d: 'The custom (event · audience) row is soft-deleted.' },
  { t: 'Default restored', d: 'The event reverts to built-in in-app delivery.' },
  { t: 'Reversible', d: 'Re-configure the rule any time to route it again.' },
]

const audMeta = computed(() => AUDIENCE_BY_VALUE[props.target?.audience] || AUDIENCE_BY_VALUE.EMPLOYEE)
const chans = computed(() => (props.target?.channels || []).map(k => CHANNEL_BY_KEY[k]).filter(Boolean))
const multi = computed(() => chans.value.length > 1)
const hasTpl = computed(() => !!(props.target?.template_title || props.target?.template_body))

const blocked = computed(() => !reason.value.trim())
const confirm = () => { if (!blocked.value && !props.loading) emit('confirm', reason.value.trim()) }
</script>

<style scoped>
.nrd { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 16px; align-items: start; }

.nrd-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 9px; padding: 15px; border-radius: 15px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--set-gold) 9%, var(--set-panel)), var(--set-panel));
  border: 1px solid color-mix(in srgb, var(--set-gold) 22%, transparent); transition: filter 0.6s, opacity 0.6s; }
.nrd-card.fading { filter: grayscale(0.55) brightness(0.9); opacity: 0.7; }
.nrd-card-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 78%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 78%); }
.nrd-stamp { position: absolute; top: 44%; left: 50%; z-index: 5; transform: translate(-50%, -50%) rotate(-13deg) scale(1.5); font-size: 26px; font-weight: 900; letter-spacing: 0.14em;
  color: transparent; border: 3px solid transparent; border-radius: 9px; padding: 2px 12px; pointer-events: none; opacity: 0; }
.nrd-stamp.slam { animation: nrd-slam 0.55s cubic-bezier(0.3, 1.4, 0.5, 1) forwards; }
@keyframes nrd-slam { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(-13deg) scale(2.4); } 60% { opacity: 1; transform: translate(-50%,-50%) rotate(-13deg) scale(0.9); color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 55%, transparent); } 100% { opacity: 1; transform: translate(-50%,-50%) rotate(-13deg) scale(1); color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 55%, transparent); } }
.nrd-card-top { display: flex; align-items: center; gap: 9px; }
.nrd-card-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.nrd-card-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.nrd-card-id b { font-size: 13px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrd-card-aud { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.nrd-card-state { flex-shrink: 0; font-size: 8.5px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; color: var(--set-unset); background: var(--set-unset-soft); }
.nrd-card-state[data-on="true"] { color: var(--set-ok); background: var(--set-ok-soft); }
.nrd-card-lab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nrd-chs { display: flex; flex-wrap: wrap; gap: 6px; }
.nrd-ch { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 650; color: var(--cc); padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--cc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 28%, transparent); }
.nrd-ch-empty { font-size: 10.5px; color: var(--set-text-dim); }
.nrd-tpl { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 10px; background: var(--set-surface); border: 1px solid var(--set-border); }
.nrd-tpl-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 8px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.nrd-tpl b { font-size: 12px; font-weight: 750; color: var(--set-text); }
.nrd-tpl-body { font-size: 11px; line-height: 1.4; color: var(--set-text-muted); }

.nrd-action { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.nrd-checks { display: flex; flex-direction: column; gap: 8px; }
.nrd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.nrd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px; background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.nrd-check[data-state="ok"] { border-left-color: var(--set-ok); }
.nrd-check[data-state="info"] { border-left-color: var(--set-gold); }
.nrd-check[data-state="warn"] { border-left-color: var(--set-partial); }
.nrd-check-ic { flex-shrink: 0; margin-top: 1px; }
.nrd-check[data-state="ok"] .nrd-check-ic :deep(svg) { color: var(--set-ok); }
.nrd-check[data-state="info"] .nrd-check-ic :deep(svg) { color: var(--set-gold); }
.nrd-check[data-state="warn"] .nrd-check-ic :deep(svg) { color: var(--set-partial); }
.nrd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nrd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.nrd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }

.nrd-reason { display: flex; flex-direction: column; gap: 7px; }
.nrd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.nrd-reason-lab i { color: var(--set-gold); font-style: normal; margin-left: 2px; }
.nrd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.nrd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.nrd-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.nrd-preset.on { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 13%, transparent); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); }
.nrd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.nrd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.nrd-textarea::placeholder { color: var(--hr-input-placeholder); }
.nrd-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5; color: var(--set-text-secondary); background: color-mix(in srgb, var(--set-gold) 10%, transparent); border: 1px solid color-mix(in srgb, var(--set-gold) 28%, transparent); }
.nrd-blocked :deep(svg) { color: var(--set-gold); flex-shrink: 0; }

.nrd-process { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--set-border); display: flex; flex-direction: column; gap: 10px; }
.nrd-process-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nrd-process-lab :deep(svg) { color: var(--set-gold); }
.nrd-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 9px; }
.nrd-step { display: flex; align-items: flex-start; gap: 9px; padding: 10px 11px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); border-top: 2px solid color-mix(in srgb, var(--set-gold) 50%, transparent); }
.nrd-step-n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; font-size: 10px; font-weight: 850; color: var(--set-gold); background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-gold) 36%, transparent); }
.nrd-step div { display: flex; flex-direction: column; gap: 1px; }
.nrd-step b { font-size: 11.5px; font-weight: 750; color: var(--set-text); }
.nrd-step span { font-size: 10px; line-height: 1.4; color: var(--set-text-muted); }

.nrd-foot-actor { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--set-text-muted); }
.nrd-foot-av { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; font-size: 9.5px; font-weight: 850; color: #1a1206; background: var(--set-grad-hero); }
.nrd-foot-sp { flex: 1; }
.nrd-confirm { color: #1a1206; background: var(--set-grad-hero); border: none; box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--set-orange) 60%, transparent); }
.nrd-confirm:hover { color: #1a1206; }
.nrd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 720px) { .nrd { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .nrd-card { transition: none; } .nrd-stamp.slam { animation: none; opacity: 1; color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 55%, transparent); } }
</style>
