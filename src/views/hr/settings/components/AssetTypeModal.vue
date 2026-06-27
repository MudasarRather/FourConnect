<template>
  <SetModal :open="open" :title="editTarget ? 'Edit asset type' : 'New asset type'"
    subtitle="Modules · Assets" :icon="Shapes" accent-color="var(--set-deep)"
    :width="900" aside-placement="side" :mode="editTarget ? 'edit' : 'create'" @close="$emit('close')">
    <div class="atm">
      <!-- live specimen preview -->
      <Motion as="div" class="atm-pv" :data-ready="ready"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="atm-pv-grid" aria-hidden="true" />
        <span class="atm-pv-aura" aria-hidden="true" />
        <div class="atm-tile" :class="{ cust: !editTarget?.is_system }">
          <span class="atm-tile-ic"><component :is="iconComp" :size="24" /></span>
          <span class="atm-tile-sym set-mono">{{ sym }}</span>
        </div>
        <div class="atm-pv-id">
          <span class="atm-pv-eyebrow">{{ editTarget?.is_system ? 'Built-in type' : 'Custom type' }}</span>
          <b>{{ form.label || '— type name —' }}</b>
          <span class="set-mono atm-pv-code"><Hash :size="9" />{{ form.code || 'CODE' }}</span>
        </div>
        <span class="atm-pv-stamp" :data-ready="ready">{{ ready ? 'Ready' : 'Draft' }}</span>
      </Motion>

      <div class="atm-grid">
        <Motion as="div" class="atm-f" :initial="fI" :animate="fA" :transition="fT(0)">
          <span class="atm-lab">Type name <i>*</i></span>
          <HrInput v-model="form.label" placeholder="e.g. Bicycle" @update:model-value="onLabel" />
        </Motion>
        <Motion as="div" class="atm-f" :initial="fI" :animate="fA" :transition="fT(1)">
          <span class="atm-lab">Code <i>*</i></span>
          <HrInput v-model="form.code" mono placeholder="e.g. BICYCLE" :disabled="lockCode" @update:model-value="codeTouched = true" />
          <span v-if="lockCode" class="atm-locknote"><Lock :size="10" /> Built-in code is locked</span>
        </Motion>

        <Motion as="div" class="atm-f full" :initial="fI" :animate="fA" :transition="fT(2)">
          <span class="atm-lab">Icon</span>
          <div class="atm-icons">
            <button v-for="name in ICON_CHOICES" :key="name" type="button" class="atm-icon"
              :class="{ on: form.icon === name }" :title="name" @click="form.icon = name">
              <component :is="iconFor(name)" :size="16" />
            </button>
          </div>
        </Motion>

        <Motion as="div" class="atm-f full" :initial="fI" :animate="fA" :transition="fT(3)">
          <span class="atm-lab">Status</span>
          <div class="atm-seg">
            <button type="button" class="atm-seg-btn" :class="{ on: form.is_active === true }" @click="form.is_active = true"><Power :size="13" />Active</button>
            <button type="button" class="atm-seg-btn" :class="{ on: form.is_active === false }" @click="form.is_active = false"><PowerOff :size="13" />Inactive</button>
          </div>
        </Motion>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-deep)" :icon="Shapes" title="The asset-type lifecycle"
        :summary="summary" :steps="steps" :affects="affects" :actor="actor"
        :mode="editTarget ? 'edit' : 'create'" orientation="vertical" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !ready || saving }"
        :whileHover="(!ready || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!ready || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" />
        {{ editTarget ? 'Save changes' : 'Create type' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Shapes, Hash, Lock, Power, PowerOff, Check, Loader, Boxes, PackagePlus, Database, Share2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'
import { ASSET_TYPE_ICON_CHOICES, iconForTypeName } from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  editTarget: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()
const ICON_CHOICES = ASSET_TYPE_ICON_CHOICES
const iconFor = iconForTypeName
const codeTouched = ref(false)

const blank = () => ({ label: '', code: '', icon: 'Package', is_active: true })
const form = ref(blank())

const normCode = (s) => String(s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase().slice(0, 40)

watch(() => props.open, (v) => {
  if (!v) return
  codeTouched.value = false
  if (props.editTarget) {
    const t = props.editTarget
    form.value = { label: t.label || '', code: t.code || '', icon: t.icon || 'Package', is_active: t.is_active !== false }
    codeTouched.value = true
  } else {
    form.value = blank()
  }
}, { immediate: true })

const onLabel = (v) => {
  form.value.label = v
  if (!props.editTarget && !codeTouched.value) form.value.code = normCode(v)
}

const lockCode = computed(() => !!props.editTarget?.is_system)
const iconComp = computed(() => iconForTypeName(form.value.icon))
const sym = computed(() => String(form.value.code || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '—')
const ready = computed(() => !!form.value.label.trim() && !!form.value.code.trim())

const affects = [MODULES.assets].filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const summary = 'An asset type is the physical-kind tag every asset carries. It feeds the register form, the icons, and the "by type" reports.'
const steps = computed(() => props.editTarget ? [
  { icon: PackagePlus, title: 'Adjust', text: 'Rename or re-icon the type — assets already tagged with it keep the link (a code rename re-points them).' },
  { icon: Boxes, title: 'Catalog', text: 'It stays selectable when registering assets and inside category allow-lists.' },
  { icon: Database, title: 'Update', text: 'The catalog entry is rewritten in place.' },
  { icon: Share2, title: 'Reflect', text: 'Inventory icons and the by-type report pick up the change live.' },
] : [
  { icon: PackagePlus, title: 'Define', text: 'Name the kind, give it a short code and an icon.' },
  { icon: Boxes, title: 'Register', text: 'It joins the type catalog and becomes selectable when registering assets.' },
  { icon: Database, title: 'Store', text: 'Saved as a manageable type — deactivate any time, delete when unused.' },
  { icon: Share2, title: 'Power Assets', text: 'Drives the register form, asset icons and the by-type distribution.' },
])

const fI = { opacity: 0, y: 10 }
const fA = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] })

const submit = () => { if (ready.value && !props.saving) emit('save', { ...form.value, code: normCode(form.value.code) }) }
</script>

<style scoped>
.atm { display: flex; flex-direction: column; gap: 16px; }
.atm-pv { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 15px 16px; border-radius: 15px;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s, box-shadow 0.3s; --acc: var(--set-deep); }
.atm-pv[data-ready="true"] { border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: 0 0 26px -10px color-mix(in srgb, var(--acc) 60%, transparent); }
.atm-pv-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); }
.atm-pv-aura { position: absolute; inset: -50% 30% auto -10%; height: 90%; background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%); filter: blur(22px); pointer-events: none; }
.atm-tile { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; width: 64px; height: 68px; flex-shrink: 0;
  border-radius: 13px; background: var(--set-surface); border: 1px solid color-mix(in srgb, var(--set-gold) 26%, transparent); }
.atm-tile.cust { border-color: color-mix(in srgb, var(--acc) 30%, transparent); background: color-mix(in srgb, var(--acc) 8%, var(--set-surface)); }
.atm-tile-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--set-gold);
  background: color-mix(in srgb, var(--set-gold) 12%, transparent); }
.atm-tile.cust .atm-tile-ic { color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); }
.atm-tile-sym { font-size: 9px; font-weight: 800; letter-spacing: 0.05em; color: var(--set-text-secondary); }
.atm-pv-id { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.atm-pv-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: color-mix(in srgb, var(--acc) 62%, var(--set-text-dim)); }
.atm-pv-id b { font-size: 16px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.atm-pv-code { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--set-text-muted); }
.atm-pv-stamp { position: relative; align-self: flex-start; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; flex-shrink: 0; color: var(--set-unset); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.atm-pv-stamp[data-ready="true"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }

.atm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 560px) { .atm-grid { grid-template-columns: 1fr; } }
.atm-f { display: flex; flex-direction: column; gap: 6px; }
.atm-f.full { grid-column: 1 / -1; }
.atm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.atm-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.atm-locknote { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--set-text-dim); }
.atm-locknote :deep(svg) { color: var(--set-text-dim); }

.atm-icons { display: flex; flex-wrap: wrap; gap: 7px; }
.atm-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; cursor: pointer; color: var(--set-text-muted);
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.18s var(--set-spring); }
.atm-icon:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-2px); }
.atm-icon.on { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 14%, transparent); border-color: color-mix(in srgb, var(--set-deep) 42%, transparent);
  box-shadow: 0 0 18px -6px color-mix(in srgb, var(--set-deep) 60%, transparent); }

.atm-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 7px; max-width: 320px; }
.atm-seg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 10px; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.atm-seg-btn.on { color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); }
</style>
