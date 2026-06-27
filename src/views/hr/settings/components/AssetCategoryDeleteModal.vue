<template>
  <SetModal :open="open" :title="blocked ? 'Class is protected' : 'Delete asset class'"
    :subtitle="target?.name || ''" :icon="blocked ? ShieldAlert : Trash2"
    :accent-color="blocked ? 'var(--set-partial)' : 'var(--set-conflict)'" :width="640"
    aside-placement="bottom" mode="delete" @close="$emit('close')">
    <div class="ad">
      <!-- target -->
      <Motion as="div" class="ad-target" :class="{ blocked }"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="ad-ic"><Boxes :size="18" /></span>
        <div class="ad-target-id">
          <b>{{ target?.name || '—' }}</b>
          <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
        </div>
        <span class="ad-target-stamp" :class="{ blocked }">{{ blocked ? `${count} assets` : 'Pending removal' }}</span>
      </Motion>

      <!-- guard banner -->
      <Motion v-if="blocked" as="div" class="ad-guard"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        <span class="ad-guard-ic"><ShieldAlert :size="16" /></span>
        <div class="ad-guard-tx">
          <b>{{ count }} asset{{ count === 1 ? '' : 's' }} {{ count === 1 ? 'is' : 'are' }} filed under this class.</b>
          <span>The taxonomy won't let a populated class be deleted — re-categorise those assets in Inventory first, or simply <i>deactivate</i> the class to hide it from new pickers while keeping the history intact.</span>
        </div>
        <button type="button" class="ad-guard-go" @click="$emit('view-assets', target)">
          <Boxes :size="13" /> View {{ count }} asset{{ count === 1 ? '' : 's' }}<ArrowUpRight :size="12" />
        </button>
      </Motion>

      <!-- reason (only meaningful for a real delete) -->
      <Motion v-if="!blocked" as="label" class="ad-reason"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
        <span class="ad-reason-lab">Reason for removal <i>(optional)</i></span>
        <textarea v-model="reason" rows="2" class="ad-textarea" placeholder="e.g. Merged into another class / no longer used…" />
      </Motion>

      <Motion as="div" class="ad-note" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.4, delay: 0.16 }">
        <Info :size="13" />
        <span v-if="blocked">Deactivating is reversible — re-activate the class any time. No asset is ever touched.</span>
        <span v-else>This is a soft-delete — the class is tombstoned and hidden from pickers; a super-admin can restore it. Assets are never deleted with it.</span>
      </Motion>
    </div>

    <template #aside>
      <SetWorkflowRail :accent="blocked ? 'var(--set-partial)' : 'var(--set-conflict)'" :icon="blocked ? ShieldCheck : Trash2"
        :title="blocked ? 'Why it\'s protected' : 'What removal does'" :summary="summary" :steps="steps"
        :affects="affects" :danger="!blocked" :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn ad-deact"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="loading" @click="$emit('deactivate', target)">
        <PowerOff :size="14" /> Deactivate instead
      </Motion>
      <Motion v-if="!blocked" as="button" type="button" class="set-btn ad-del" :class="{ disabled: loading }"
        :whileHover="loading ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" /> Delete class
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Trash2, ShieldAlert, ShieldCheck, Boxes, ArrowUpRight, Info, PowerOff, Loader,
  Archive, RotateCcw, Workflow,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
})
defineEmits(['close', 'confirm', 'deactivate', 'view-assets'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const count = computed(() => Number(props.target?.asset_count || 0))
const blocked = computed(() => count.value > 0)

const affects = [MODULES.assets].filter(Boolean).map((m) => ({ icon: m.icon, label: m.label }))
const summary = computed(() => blocked.value
  ? 'A class that still holds assets is protected from deletion so book-value and reports never break. Here is the safe path.'
  : 'Removing an empty asset class retires it from new selections. It is a soft-delete — nothing is erased.')
const steps = computed(() => blocked.value ? [
  { icon: ShieldCheck, title: 'Guarded', text: `The API blocks the delete while ${count.value} asset(s) reference this class (409).` },
  { icon: Workflow, title: 'Re-categorise', text: 'Move those assets to another class from Inventory, then the class becomes deletable.' },
  { icon: PowerOff, title: 'Or deactivate', text: 'Hide it from new pickers without deleting — assets keep their link and history.' },
] : [
  { icon: Archive, title: 'Soft-delete', text: 'The class is tombstoned — hidden from every picker, the row is retained.' },
  { icon: ShieldCheck, title: 'Guarded', text: 'If an asset later references it, the delete would be blocked until reassigned.' },
  { icon: RotateCcw, title: 'Reversible', text: 'A super administrator can restore it from the recovery view.' },
])
</script>

<style scoped>
.ad { display: flex; flex-direction: column; gap: 14px; }
.ad-target { display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.ad-target.blocked { border-color: color-mix(in srgb, var(--set-partial) 26%, transparent); }
.ad-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ad-target.blocked .ad-ic { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 32%, transparent); }
.ad-target-id { flex: 1; min-width: 0; }
.ad-target-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); }
.ad-target-id span { font-size: 11px; color: var(--set-text-muted); }
.ad-target-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); }
.ad-target-stamp.blocked { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 30%, transparent); }

.ad-guard { display: flex; align-items: flex-start; gap: 12px; padding: 13px 14px; border-radius: 13px;
  background: var(--set-partial-soft); border: 1px solid color-mix(in srgb, var(--set-partial) 28%, transparent); }
.ad-guard-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--set-partial);
  background: color-mix(in srgb, var(--set-partial) 16%, transparent); }
.ad-guard-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ad-guard-tx b { font-size: 13px; font-weight: 800; color: var(--set-text); }
.ad-guard-tx span { font-size: 11.5px; line-height: 1.5; color: var(--set-text-muted); }
.ad-guard-tx i { font-style: italic; color: var(--set-text-secondary); }
.ad-guard-go { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; flex-shrink: 0; margin-top: 2px; padding: 6px 11px; border-radius: 9px;
  cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--set-ember);
  background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-ember) 30%, transparent); transition: all 0.2s; }
.ad-guard-go:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--set-ember) 55%, transparent); }

.ad-reason { display: flex; flex-direction: column; gap: 6px; }
.ad-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.ad-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.ad-textarea { width: 100%; resize: vertical; min-height: 58px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.ad-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.ad-textarea::placeholder { color: var(--hr-input-placeholder); }

.ad-note { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.ad-note :deep(svg) { color: var(--set-text-dim); flex-shrink: 0; }

.ad-deact { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 34%, transparent); background: var(--set-ok-soft); }
.ad-deact:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 55%, transparent); }
.ad-del { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.ad-del:hover { color: #fff; }
</style>
