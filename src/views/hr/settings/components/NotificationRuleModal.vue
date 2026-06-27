<template>
  <SetModal :open="open" :title="event?.label || 'Notification rule'" subtitle="Automation · Alert composer"
    :icon="BellRing" accent-color="var(--set-gold)" :width="940" :mode="ruleExists ? 'edit' : 'create'" @close="$emit('close')">
    <div class="nrm">
      <!-- live notification preview -->
      <div class="nrm-stage">
        <span class="nrm-stage-grid" aria-hidden="true" />
        <span class="nrm-stage-lab">Live preview · how the alert lands</span>
        <div class="nrm-toast" :key="previewKey">
          <span class="nrm-toast-ic"><component :is="moduleIcon(event?.module)" :size="16" /></span>
          <div class="nrm-toast-body">
            <div class="nrm-toast-top">
              <b>{{ previewTitle }}</b>
              <span class="nrm-toast-now">now</span>
            </div>
            <p>{{ previewBody }}</p>
            <div class="nrm-toast-foot">
              <span class="nrm-toast-aud"><component :is="audMeta.icon" :size="10" /> {{ audMeta.label }}</span>
              <span class="nrm-toast-chs">
                <span v-for="c in selectedChannels" :key="c.key" class="nrm-toast-ch" :style="{ '--cc': c.color }"><component :is="c.icon" :size="11" /></span>
                <i v-if="!selectedChannels.length" class="nrm-toast-empty">no channel — silent</i>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- audience -->
      <div class="nrm-sect">
        <span class="nrm-sect-lab"><Users :size="12" /> Audience</span>
        <SetSelect v-model="form.audience" :options="audienceOptions" accent-color="var(--set-gold)" />
      </div>

      <!-- channels -->
      <div class="nrm-sect">
        <span class="nrm-sect-lab"><Send :size="12" /> Delivery channels</span>
        <div class="nrm-chs">
          <button v-for="c in CHANNELS" :key="c.key" type="button" class="nrm-ch" :class="{ on: form.channels.includes(c.key), locked: !c.live }"
            :style="{ '--cc': c.color }" @click="toggleChannel(c)">
            <span v-if="c.live" class="nrm-ch-tick"><Check :size="12" /></span>
            <component :is="c.icon" :size="15" />
            <span class="nrm-ch-lab">{{ c.label }}</span>
            <Lock v-if="!c.live" :size="11" class="nrm-ch-lockic" />
          </button>
        </div>
        <Presence>
          <Motion v-if="lockedHint" key="lh" as="div" class="nrm-locknote" :style="{ '--cc': lockedHint.color }"
            :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -4 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
            <span class="nrm-locknote-ic"><Lock :size="13" /></span>
            <span><b>{{ lockedHint.label }}</b> isn’t wired yet — it can’t be switched on. It activates automatically once the transport is connected.</span>
          </Motion>
        </Presence>
        <p class="nrm-hint"><Info :size="11" /> In-app delivers today. Email, SMS, Push & WhatsApp stay locked until their transport is connected — then they switch on automatically.</p>
      </div>

      <!-- templates (previously hidden capability) -->
      <div class="nrm-sect">
        <span class="nrm-sect-lab"><Pencil :size="12" /> Message template <i class="nrm-opt">optional · overrides the default copy</i></span>
        <HrInput v-model="form.template_title" :placeholder="defaultTitle" :maxlength="160" />
        <textarea v-model="form.template_body" rows="2" class="nrm-textarea" :placeholder="`Defaults to the title when blank — e.g. “Your ${(event?.label||'event').toLowerCase()} was processed.”`" />
      </div>

      <!-- active -->
      <div class="nrm-active" :class="{ on: form.is_active }">
        <div class="nrm-active-txt">
          <component :is="form.is_active ? BellRing : BellOff" :size="15" />
          <div>
            <b>{{ form.is_active ? 'Active — this rule fires' : 'Muted — event falls back to default in-app' }}</b>
            <span>{{ form.is_active ? 'Matching events dispatch to the channels above.' : 'The rule is kept but ignored until re-activated.' }}</span>
          </div>
        </div>
        <button type="button" class="nrm-toggle" :class="{ on: form.is_active }" @click="form.is_active = !form.is_active"><span class="nrm-knob" /></button>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-gold)" :icon="BellRing" title="How an alert is dispatched"
        :summary="summary" :steps="STEPS" :affects="affects" :note="adoptionNote" :actor="actor" :mode="ruleExists ? 'edit' : 'create'" />
    </template>

    <template #footer>
      <button v-if="ruleExists" class="set-btn set-btn-ghost nrm-reset" @click="$emit('reset', currentRule)"><RotateCcw :size="14" /> Reset to default</button>
      <span class="nrm-foot-sp" />
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: saving }"
        :whileHover="saving ? {} : { y: -2, scale: 1.02 }" :whileTap="saving ? {} : { scale: 0.97 }" :disabled="saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" /> Save rule
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { BellRing, BellOff, Users, Send, Check, Info, Pencil, RotateCcw, Loader, Megaphone, Inbox, Lock } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetSelect from './SetSelect.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { useActor } from '../composables/useActor'
import { CHANNELS, CHANNEL_BY_KEY, AUDIENCES, AUDIENCE_BY_VALUE, moduleIcon, moduleLabel, eventDefaultTitle } from '../composables/notifyMeta'

const props = defineProps({
  open: { type: Boolean, default: false },
  event: { type: Object, default: null },              // { event, label, module }
  rulesByKey: { type: Object, default: () => ({}) },   // "EVENT|AUD" -> rule row
  initialAudience: { type: String, default: 'EMPLOYEE' },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save', 'reset'])

const actor = useActor()
const audienceOptions = AUDIENCES

const form = ref({ audience: 'EMPLOYEE', channels: ['IN_APP'], template_title: '', template_body: '', is_active: true })

function hydrate() {
  const aud = props.initialAudience || 'EMPLOYEE'
  loadFor(aud)
}
function loadFor(aud) {
  const key = `${props.event?.event}|${aud}`
  const r = props.rulesByKey[key]
  form.value = {
    audience: aud,
    channels: r?.channels ? [...r.channels] : (r ? [] : ['IN_APP']),
    template_title: r?.template_title || '',
    template_body: r?.template_body || '',
    is_active: r ? r.is_active !== false : true,
  }
}
watch(() => props.open, (v) => { if (v) hydrate() })
watch(() => form.value.audience, (aud, prev) => { if (props.open && aud !== prev) loadFor(aud) })

const currentRule = computed(() => props.rulesByKey[`${props.event?.event}|${form.value.audience}`] || null)
const ruleExists = computed(() => !!currentRule.value)

const audMeta = computed(() => AUDIENCE_BY_VALUE[form.value.audience] || AUDIENCE_BY_VALUE.EMPLOYEE)
const selectedChannels = computed(() => form.value.channels.map(k => CHANNEL_BY_KEY[k]).filter(Boolean))
const defaultTitle = computed(() => eventDefaultTitle(props.event?.event || ''))
const previewTitle = computed(() => form.value.template_title?.trim() || props.event?.label || defaultTitle.value)
const previewBody = computed(() => form.value.template_body?.trim() || `${previewTitle.value} — view the details in your workspace.`)
const previewKey = computed(() => `${previewTitle.value}|${previewBody.value}|${form.value.channels.join(',')}|${form.value.audience}`)

const lockedHint = ref(null)
let lockTimer = null
function toggleChannel(c) {
  if (!c.live) {
    lockedHint.value = c
    clearTimeout(lockTimer)
    lockTimer = setTimeout(() => { lockedHint.value = null }, 3200)
    return
  }
  const i = form.value.channels.indexOf(c.key)
  if (i >= 0) form.value.channels.splice(i, 1)
  else form.value.channels.push(c.key)
}
onBeforeUnmount(() => clearTimeout(lockTimer))

const affects = computed(() => (props.event?.module ? [{ icon: moduleIcon(props.event.module), label: moduleLabel(props.event.module) }] : []))
const summary = computed(() => `When ${props.event?.label || 'this event'} is raised, the dispatcher looks up the active rule for the chosen audience and fans the alert out to every enabled channel.`)
const adoptionNote = 'In-app alerts are delivered live. EMAIL / SMS / PUSH / WhatsApp are stored as the contract — they go live the moment those transports are wired.'
const STEPS = [
  { icon: Megaphone, title: 'Event fires', text: 'A module raises the event (e.g. a leave is approved).' },
  { icon: Users, title: 'Resolve audience', text: 'The dispatcher matches the active rule for this event + audience.' },
  { icon: Send, title: 'Fan out', text: 'It delivers to each enabled channel; unset events default to in-app so nothing is dropped.' },
  { icon: Inbox, title: 'Land', text: 'The recipient sees it in-app today; other transports replay once wired.' },
]

function submit() {
  if (props.saving) return
  emit('save', {
    event: props.event?.event,
    audience: form.value.audience,
    channels: [...form.value.channels],
    template_title: form.value.template_title?.trim() || '',
    template_body: form.value.template_body?.trim() || '',
    is_active: !!form.value.is_active,
  })
}
</script>

<style scoped>
.nrm { display: flex; flex-direction: column; gap: 16px; }

/* live toast preview */
.nrm-stage { position: relative; overflow: hidden; padding: 16px; border-radius: 16px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--set-gold) 11%, var(--set-panel)), var(--set-panel));
  border: 1px solid color-mix(in srgb, var(--set-gold) 24%, transparent); display: flex; flex-direction: column; gap: 10px; }
.nrm-stage-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 8%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 100% 0%, #000 16%, transparent 80%); -webkit-mask-image: radial-gradient(120% 100% at 100% 0%, #000 16%, transparent 80%); }
.nrm-stage-lab { position: relative; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }
.nrm-toast { position: relative; display: flex; gap: 12px; padding: 13px 14px; border-radius: 13px; background: var(--set-surface-elevated);
  border: 1px solid var(--set-border-strong); box-shadow: 0 16px 36px -22px rgba(0,0,0,0.6); animation: nrm-pop 0.4s var(--set-spring); }
@keyframes nrm-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.nrm-toast-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: #1a1206; background: var(--set-grad-hero); box-shadow: 0 0 18px -6px color-mix(in srgb, var(--set-gold) 70%, transparent); }
.nrm-toast-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.nrm-toast-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.nrm-toast-top b { font-size: 13.5px; font-weight: 800; color: var(--set-text); }
.nrm-toast-now { font-size: 10px; color: var(--set-text-dim); flex-shrink: 0; }
.nrm-toast-body p { margin: 0; font-size: 12px; line-height: 1.45; color: var(--set-text-muted); }
.nrm-toast-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 3px; }
.nrm-toast-aud { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.nrm-toast-chs { display: inline-flex; align-items: center; gap: 5px; }
.nrm-toast-ch { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--cc); background: color-mix(in srgb, var(--cc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 30%, transparent); }
.nrm-toast-empty { font-style: normal; font-size: 10px; color: var(--set-text-dim); }

/* sections */
.nrm-sect { display: flex; flex-direction: column; gap: 9px; }
.nrm-sect-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nrm-sect-lab :deep(svg) { color: var(--set-gold); }
.nrm-opt { font-style: normal; font-size: 9px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--set-text-dim); opacity: 0.85; }

.nrm-chs { display: flex; flex-wrap: wrap; gap: 8px; }
.nrm-ch { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 9px 13px 9px 11px; border-radius: 11px; cursor: pointer; font: inherit;
  font-size: 12.5px; font-weight: 650; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); overflow: hidden; }
.nrm-ch:hover { border-color: color-mix(in srgb, var(--cc) 40%, transparent); transform: translateY(-1px); }
.nrm-ch :deep(svg) { color: var(--set-text-muted); transition: color 0.25s; }
.nrm-ch-tick { display: grid; place-items: center; width: 0; overflow: hidden; transition: width 0.25s var(--set-spring); }
.nrm-ch-tick :deep(svg) { color: var(--cc); }
.nrm-ch.on { color: var(--set-text); background: color-mix(in srgb, var(--cc) 12%, transparent); border-color: color-mix(in srgb, var(--cc) 42%, transparent); box-shadow: 0 0 16px -6px var(--cc); }
.nrm-ch.on .nrm-ch-tick { width: 14px; }
.nrm-ch.on :deep(svg) { color: var(--cc); }
.nrm-ch-soon { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); padding: 2px 5px; border-radius: 999px; background: var(--set-surface-elevated); }
.nrm-ch.locked { cursor: help; border-style: dashed; color: var(--set-text-muted);
  background: repeating-linear-gradient(45deg, var(--set-surface) 0 7px, color-mix(in srgb, var(--set-unset) 7%, var(--set-surface)) 7px 14px); }
.nrm-ch.locked:hover { border-color: color-mix(in srgb, var(--cc) 42%, transparent); transform: translateY(-1px); }
.nrm-ch-lockic { color: var(--set-text-dim); }
.nrm-ch.locked:hover .nrm-ch-lockic { color: var(--cc); }
.nrm-locknote { display: flex; align-items: flex-start; gap: 9px; padding: 10px 12px; border-radius: 11px;
  background: color-mix(in srgb, var(--cc) 10%, transparent); border: 1px solid color-mix(in srgb, var(--cc) 30%, transparent); }
.nrm-locknote-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0; color: var(--cc); background: color-mix(in srgb, var(--cc) 14%, transparent); }
.nrm-locknote span { font-size: 11.5px; line-height: 1.45; color: var(--set-text-secondary); }
.nrm-locknote b { color: var(--set-text); }
.nrm-hint { display: flex; align-items: flex-start; gap: 7px; margin: 0; font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.nrm-hint :deep(svg) { color: var(--set-gold); flex-shrink: 0; margin-top: 1px; }

.nrm-textarea { width: 100%; resize: vertical; min-height: 52px; padding: 10px 12px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.nrm-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.nrm-textarea::placeholder { color: var(--hr-input-placeholder); }

.nrm-active { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 15px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s; }
.nrm-active.on { border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.nrm-active-txt { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.nrm-active-txt > :deep(svg) { color: var(--set-unset); flex-shrink: 0; margin-top: 1px; }
.nrm-active.on .nrm-active-txt > :deep(svg) { color: var(--set-ok); }
.nrm-active-txt b { display: block; font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.nrm-active-txt span { font-size: 11px; line-height: 1.4; color: var(--set-text-muted); }
.nrm-toggle { padding: 0; background: transparent; border: 0; cursor: pointer; flex-shrink: 0; }
.nrm-knob { position: relative; display: block; width: 38px; height: 21px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); }
.nrm-knob::after { content: ''; position: absolute; top: 1px; left: 1px; width: 17px; height: 17px; border-radius: 50%; background: var(--set-unset); transition: all 0.25s var(--set-spring); }
.nrm-toggle.on .nrm-knob { background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 40%, transparent); }
.nrm-toggle.on .nrm-knob::after { left: 18px; background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

.nrm-reset { color: var(--set-conflict); }
.nrm-reset:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.nrm-foot-sp { flex: 1; }

@media (prefers-reduced-motion: reduce) { .nrm-toast { animation: none; } }
</style>
