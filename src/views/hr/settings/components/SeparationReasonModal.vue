<template>
  <SetModal :open="open" :title="editTarget ? 'Edit separation reason' : 'New separation reason'"
    subtitle="Workforce · Exit lexicon" :icon="DoorOpen" accent-color="var(--set-rust)" :width="940"
    aside-placement="side" :mode="editTarget ? 'edit' : 'create'" @close="$emit('close')">
    <div class="srm">
      <!-- live boarding-pass preview -->
      <Motion as="div" class="srm-pass" :data-ready="ready" :data-tone="tone"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="srm-pass-grid" aria-hidden="true" />
        <span class="srm-pass-spine" :data-nat="nat" aria-hidden="true" />
        <div class="srm-pass-body">
          <div class="srm-pass-top">
            <span class="srm-pass-gate" :data-vocab="form.category"><b>{{ gate }}</b>{{ vocabLabel }}</span>
            <span class="srm-pass-stamp" :data-ready="ready">{{ ready ? 'Ready' : 'Draft' }}</span>
          </div>
          <b class="srm-pass-label">{{ form.label || '— reason label —' }}</b>
          <span class="srm-pass-code set-mono"><Hash :size="10" />{{ form.code || 'CODE' }}</span>
          <div class="srm-pass-tags">
            <span class="srm-pass-nat" :data-nat="nat"><component :is="natIcon" :size="11" /> {{ natLabel }}</span>
            <span class="srm-pass-act" :data-on="form.is_active !== false">{{ form.is_active !== false ? 'Active' : 'Inactive' }}</span>
          </div>
        </div>
        <div class="srm-pass-stub">
          <span class="srm-pass-barcode" aria-hidden="true" />
          <span class="srm-pass-stub-tag set-mono">{{ gate }}-{{ (form.code || 'XXX').slice(0, 4) }}</span>
        </div>
      </Motion>

      <!-- fields -->
      <div class="srm-grid">
        <Motion as="div" class="srm-field" :initial="fi(0).i" :animate="fi(0).a" :transition="fi(0).t">
          <span class="srm-lab">Label<i>*</i></span>
          <HrInput v-model="form.label" placeholder="e.g. Better Opportunity" />
        </Motion>
        <Motion as="div" class="srm-field" :initial="fi(1).i" :animate="fi(1).a" :transition="fi(1).t">
          <span class="srm-lab">Code<i>*</i></span>
          <HrInput v-model="form.code" mono :disabled="lockCode" placeholder="e.g. BETTER_OPPORTUNITY" />
          <span v-if="lockCode" class="srm-lock"><Lock :size="10" /> Built-in code is locked</span>
        </Motion>

        <Motion as="div" class="srm-field full" :initial="fi(2).i" :animate="fi(2).a" :transition="fi(2).t">
          <span class="srm-lab">Vocabulary</span>
          <div class="srm-seg srm-seg-2">
            <button v-for="o in VOCAB" :key="o.value" type="button" class="srm-seg-btn"
              :class="{ on: form.category === o.value }" @click="form.category = o.value">
              <component :is="o.icon" :size="13" /><span><b>{{ o.label }}</b><small>{{ o.hint }}</small></span>
            </button>
          </div>
        </Motion>

        <Motion as="div" class="srm-field" :initial="fi(3).i" :animate="fi(3).a" :transition="fi(3).t">
          <span class="srm-lab">Nature</span>
          <div class="srm-seg srm-seg-3">
            <button v-for="o in NATURE" :key="String(o.value)" type="button" class="srm-seg-btn nat" :data-nat="o.nat"
              :class="{ on: form.is_voluntary === o.value }" @click="form.is_voluntary = o.value">
              <component :is="o.icon" :size="13" /> {{ o.label }}
            </button>
          </div>
        </Motion>
        <Motion as="div" class="srm-field" :initial="fi(4).i" :animate="fi(4).a" :transition="fi(4).t">
          <span class="srm-lab">Status</span>
          <div class="srm-seg srm-seg-2">
            <button type="button" class="srm-seg-btn" :class="{ on: form.is_active !== false }" @click="form.is_active = true">
              <Power :size="13" /> Active
            </button>
            <button type="button" class="srm-seg-btn" :class="{ on: form.is_active === false }" @click="form.is_active = false">
              <PowerOff :size="13" /> Inactive
            </button>
          </div>
        </Motion>

        <Motion as="div" class="srm-field full" :initial="fi(5).i" :animate="fi(5).a" :transition="fi(5).t">
          <span class="srm-lab">Description <i class="opt">optional</i></span>
          <textarea v-model="form.description" rows="2" class="srm-textarea" placeholder="When is this reason used? Add guidance for HR." />
        </Motion>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-rust)" :icon="DoorOpen" title="The separation-reason lifecycle"
        :summary="summary" :steps="steps" :affects="affects" :note="note" :actor="actor"
        :mode="editTarget ? 'edit' : 'create'" orientation="vertical" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !ready || saving }"
        :whileHover="(!ready || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!ready || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" />
        {{ editTarget ? 'Save changes' : 'Add to lexicon' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { DoorOpen, Hash, Lock, Check, Loader, Power, PowerOff, LogOut, FileText,
  ArrowUpRight, ShieldX, Minus, PencilLine, ShieldCheck, Database, Share2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  editTarget: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  lockCode: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()

const VOCAB = [
  { value: 'EXIT_REASON', label: 'Exit reason', hint: 'Cited in cases + interviews', icon: FileText },
  { value: 'RESIGNATION_TYPE', label: 'Resignation type', hint: 'How the exit is initiated', icon: LogOut },
]
const NATURE = [
  { value: true, label: 'Voluntary', nat: 'vol', icon: ArrowUpRight },
  { value: false, label: 'Involuntary', nat: 'invol', icon: ShieldX },
  { value: null, label: 'Unspecified', nat: 'neutral', icon: Minus },
]

const blank = () => ({ label: '', code: '', category: 'EXIT_REASON', is_voluntary: true, is_active: true, description: '' })
const form = ref(blank())
watch(() => props.open, (v) => {
  if (!v) return
  if (props.editTarget) {
    const t = props.editTarget
    form.value = { label: t.label || '', code: t.code || '', category: t.category || 'EXIT_REASON',
      is_voluntary: t.is_voluntary === undefined ? null : t.is_voluntary, is_active: t.is_active !== false, description: t.description || '' }
  } else form.value = blank()
}, { immediate: true })

const ready = computed(() => !!String(form.value.label).trim() && !!String(form.value.code).trim())
const gate = computed(() => (form.value.category === 'RESIGNATION_TYPE' ? 'R' : 'E'))
const vocabLabel = computed(() => (form.value.category === 'RESIGNATION_TYPE' ? 'Resignation' : 'Exit reason'))
const vol = computed(() => form.value.is_voluntary === true)
const invol = computed(() => form.value.is_voluntary === false)
const nat = computed(() => (vol.value ? 'vol' : invol.value ? 'invol' : 'neutral'))
const natLabel = computed(() => (vol.value ? 'Voluntary' : invol.value ? 'Involuntary' : 'Unspecified'))
const natIcon = computed(() => (vol.value ? ArrowUpRight : invol.value ? ShieldX : Minus))
const tone = computed(() => (form.value.is_active === false ? 'off' : invol.value ? 'divert' : 'board'))

const fi = (i) => ({ i: { opacity: 0, y: 10 }, a: { opacity: 1, y: 0 }, t: { duration: 0.4, delay: 0.06 + i * 0.05, ease: [0.16, 1, 0.3, 1] } })

const affects = [{ icon: MODULES.exit.icon, label: 'Exit Management' }]
const summary = computed(() => (props.editTarget
  ? 'Update the wording or nature. Existing exit cases keep their stored value; new selections use the new label.'
  : 'Add a reason to the controlled vocabulary the Exit module draws from.'))
const steps = computed(() => props.editTarget ? [
  { icon: PencilLine, title: 'Adjust', text: 'Edit the label, nature or status — the code stays as the stable key.' },
  { icon: ShieldCheck, title: 'Validate', text: 'Code uniqueness is re-checked per vocabulary at the API boundary.' },
  { icon: Database, title: 'Update', text: 'Rewritten in place and sealed into the settings audit ledger.' },
  { icon: Share2, title: 'Reflect', text: 'Exit resignation & interview pickers show the new wording live.' },
] : [
  { icon: PencilLine, title: 'Define', text: 'Name the reason and give it a unique code per vocabulary.' },
  { icon: ShieldCheck, title: 'Validate', text: 'Required fields enforced; duplicate codes rejected at the boundary.' },
  { icon: Database, title: 'Register', text: 'It joins the lexicon and the creation is written to the audit ledger.' },
  { icon: Share2, title: 'Propagate', text: 'When active, it becomes selectable across Exit Management.' },
])
const note = computed(() => (props.lockCode
  ? 'Built-in reasons back the exit enum — their code is locked. You can still relabel, change nature or deactivate them.'
  : 'New custom codes are stored in the lexicon; built-in (enum-backed) reasons are what exit cases persist today.'))

const submit = () => { if (ready.value && !props.saving) emit('save', { ...form.value }) }
</script>

<style scoped>
.srm { display: flex; flex-direction: column; gap: 16px; }

/* boarding-pass live preview */
.srm-pass { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(0,1fr) 80px;
  border-radius: 15px; background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s, box-shadow 0.3s; }
.srm-pass[data-ready="true"] { border-color: color-mix(in srgb, var(--set-rust) 40%, transparent); box-shadow: 0 0 26px -10px color-mix(in srgb, var(--set-rust) 60%, transparent); }
.srm-pass-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-rust) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-rust) 8%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); }
.srm-pass-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--set-unset); }
.srm-pass-spine[data-nat="vol"] { background: linear-gradient(180deg, #fbbf24, #fb923c); }
.srm-pass-spine[data-nat="invol"] { background: linear-gradient(180deg, #f87171, #dc2626); }
.srm-pass-body { position: relative; padding: 14px 16px; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.srm-pass-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.srm-pass-gate { display: inline-flex; align-items: center; gap: 7px; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.srm-pass-gate b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; font-family: var(--set-mono); font-size: 12px; color: #1a1206; background: var(--set-grad-hero); }
.srm-pass-gate[data-vocab="EXIT_REASON"] b { background: linear-gradient(135deg, #34d399, #059669); color: #04130d; }
.srm-pass-stamp { font-size: 9px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--set-unset); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.srm-pass-stamp[data-ready="true"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }
.srm-pass-label { font-size: 18px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.srm-pass-code { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--set-text-muted); }
.srm-pass-tags { display: flex; gap: 6px; margin-top: 2px; }
.srm-pass-nat { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); }
.srm-pass-nat[data-nat="vol"] { color: var(--set-ok); background: var(--set-ok-soft); }
.srm-pass-nat[data-nat="invol"] { color: var(--set-conflict); background: var(--set-conflict-soft); }
.srm-pass-act { padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; color: var(--set-text-dim); background: var(--set-unset-soft); }
.srm-pass-act[data-on="true"] { color: var(--set-ok); background: var(--set-ok-soft); }
.srm-pass-stub { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 12px 6px; background: var(--set-surface); border-left: 2px dashed var(--set-border-strong); }
.srm-pass-barcode { width: 100%; height: 30px; border-radius: 3px; opacity: 0.7;
  background: repeating-linear-gradient(90deg, var(--set-text) 0 1px, transparent 1px 3px, var(--set-text) 3px 4px, transparent 4px 7px); }
.srm-pass-stub-tag { font-size: 9px; font-weight: 700; color: var(--set-text-muted); }

/* fields */
.srm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 560px) { .srm-grid { grid-template-columns: 1fr; } }
.srm-field { display: flex; flex-direction: column; gap: 6px; }
.srm-field.full { grid-column: 1 / -1; }
.srm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.srm-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.srm-lab i.opt { color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.srm-lock { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--set-text-dim); }
.srm-lock :deep(svg) { color: var(--set-text-dim); }

.srm-seg { display: grid; gap: 7px; }
.srm-seg-2 { grid-template-columns: 1fr 1fr; }
.srm-seg-3 { grid-template-columns: 1fr 1fr 1fr; }
.srm-seg-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 11px; border-radius: 11px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); text-align: left; }
.srm-seg-btn span { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.srm-seg-btn small { font-size: 9px; font-weight: 600; color: var(--set-text-dim); }
.srm-seg-btn.on { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); }
.srm-seg-btn.on small { color: color-mix(in srgb, var(--set-gold) 70%, var(--set-text-dim)); }
.srm-seg-btn.nat.on[data-nat="vol"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 38%, transparent); }
.srm-seg-btn.nat.on[data-nat="invol"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 38%, transparent); }
.srm-seg-btn.nat.on[data-nat="neutral"] { color: var(--set-text-secondary); background: var(--set-unset-soft); border-color: var(--set-border-strong); }

.srm-textarea { width: 100%; resize: vertical; min-height: 60px; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.srm-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.srm-textarea::placeholder { color: var(--hr-input-placeholder); }
</style>
