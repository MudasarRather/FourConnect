<template>
  <SetModal :open="open" :title="blocked ? 'Type is protected' : 'Delete asset type'"
    :subtitle="target?.label || ''" :icon="blocked ? ShieldAlert : Trash2"
    :accent-color="blocked ? 'var(--set-partial)' : 'var(--set-conflict)'" :width="620"
    aside-placement="bottom" mode="delete" @close="$emit('close')">
    <div class="atd">
      <Motion as="div" class="atd-target" :class="{ blocked }"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="atd-ic"><component :is="iconComp" :size="18" /></span>
        <div class="atd-id">
          <b>{{ target?.label || '—' }}</b>
          <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
        </div>
        <span class="atd-stamp" :class="{ blocked }">{{ reasonTag }}</span>
      </Motion>

      <Motion v-if="blocked" as="div" class="atd-guard"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        <span class="atd-guard-ic"><ShieldAlert :size="16" /></span>
        <div class="atd-guard-tx">
          <b v-if="system">This is a built-in type.</b>
          <b v-else>{{ count }} asset{{ count === 1 ? '' : 's' }} use{{ count === 1 ? 's' : '' }} this type.</b>
          <span v-if="system">Built-ins back core asset behaviour and can't be deleted — <i>deactivate</i> it to hide it from new registrations instead.</span>
          <span v-else>It can't be deleted while assets reference it — re-type those assets in Inventory first, or <i>deactivate</i> it to hide it from new registrations.</span>
        </div>
      </Motion>

      <Motion as="div" class="atd-note" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.4, delay: 0.14 }">
        <Info :size="13" />
        <span v-if="blocked">Deactivating is reversible — re-activate any time. No asset is touched.</span>
        <span v-else>This is a soft-delete — the type is tombstoned and hidden from pickers. Assets are never deleted with it.</span>
      </Motion>
    </div>

    <template #aside>
      <SetWorkflowRail :accent="blocked ? 'var(--set-partial)' : 'var(--set-conflict)'" :icon="blocked ? ShieldCheck : Trash2"
        :title="blocked ? 'Why it\'s protected' : 'What removal does'" :summary="summary" :steps="steps"
        :affects="affects" :danger="!blocked" :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn atd-deact"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="loading" @click="$emit('deactivate', target)">
        <PowerOff :size="14" /> Deactivate instead
      </Motion>
      <Motion v-if="!blocked" as="button" type="button" class="set-btn atd-del" :class="{ disabled: loading }"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="loading" @click="$emit('confirm', target)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" /> Delete type
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, ShieldAlert, ShieldCheck, Info, PowerOff, Loader, Archive, RotateCcw, Workflow } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'
import { iconForTypeName } from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
})
defineEmits(['close', 'confirm', 'deactivate'])

const actor = useActor()
const count = computed(() => Number(props.target?.asset_count || 0))
const system = computed(() => !!props.target?.is_system)
const blocked = computed(() => system.value || count.value > 0)
const iconComp = computed(() => iconForTypeName(props.target?.icon))
const reasonTag = computed(() => system.value ? 'Built-in' : (count.value > 0 ? `${count.value} in use` : 'Pending removal'))

const affects = [MODULES.assets].filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const summary = computed(() => blocked.value
  ? 'A type that is built-in or still in use is protected so asset records never break. Here is the safe path.'
  : 'Removing an unused custom type retires it from new selections. It is a soft-delete — nothing is erased.')
const steps = computed(() => blocked.value ? [
  { icon: ShieldCheck, title: 'Guarded', text: system.value ? 'Built-in types are delete-protected.' : `${count.value} asset(s) reference this type.` },
  { icon: Workflow, title: 'Re-type / deactivate', text: 'Re-type the assets in Inventory, or deactivate the type to hide it from new registrations.' },
  { icon: PowerOff, title: 'Deactivate', text: 'Hides it from pickers without deleting — assets keep their tag.' },
] : [
  { icon: Archive, title: 'Soft-delete', text: 'The type is tombstoned — hidden from pickers, the row is retained.' },
  { icon: ShieldCheck, title: 'Guarded', text: 'If an asset later uses it, deletion would be blocked until re-typed.' },
  { icon: RotateCcw, title: 'Reversible', text: 'A super administrator can restore it from the recovery view.' },
])
</script>

<style scoped>
.atd { display: flex; flex-direction: column; gap: 14px; }
.atd-target { display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.atd-target.blocked { border-color: color-mix(in srgb, var(--set-partial) 26%, transparent); }
.atd-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.atd-target.blocked .atd-ic { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 32%, transparent); }
.atd-id { flex: 1; min-width: 0; }
.atd-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); }
.atd-id span { font-size: 11px; color: var(--set-text-muted); }
.atd-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); }
.atd-stamp.blocked { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 30%, transparent); }

.atd-guard { display: flex; align-items: flex-start; gap: 12px; padding: 13px 14px; border-radius: 13px;
  background: var(--set-partial-soft); border: 1px solid color-mix(in srgb, var(--set-partial) 28%, transparent); }
.atd-guard-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--set-partial);
  background: color-mix(in srgb, var(--set-partial) 16%, transparent); }
.atd-guard-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.atd-guard-tx b { font-size: 13px; font-weight: 800; color: var(--set-text); }
.atd-guard-tx span { font-size: 11.5px; line-height: 1.5; color: var(--set-text-muted); }
.atd-guard-tx i { font-style: italic; color: var(--set-text-secondary); }

.atd-note { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.atd-note :deep(svg) { color: var(--set-text-dim); flex-shrink: 0; }

.atd-deact { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); background: var(--set-ok-soft); }
.atd-deact:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 55%, transparent); }
.atd-del { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.atd-del:hover { color: #fff; }
</style>
