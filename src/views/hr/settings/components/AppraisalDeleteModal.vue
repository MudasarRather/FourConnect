<template>
  <SetModal :open="open" title="Delete appraisal template" :subtitle="template?.name || ''"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="500" mode="delete" @close="$emit('close')">

    <div class="ad">
      <div class="ad-target">
        <span class="ad-target-ic"><Target :size="18" /></span>
        <div class="ad-target-txt">
          <b>{{ template?.name }}</b>
          <span class="set-mono">{{ template?.code }} · {{ (template?.sections || []).length }} sections</span>
        </div>
      </div>

      <ul class="ad-facts">
        <li><CircleX :size="14" /> The rubric is soft-deleted and drops out of the template list.</li>
        <li><CircleCheck :size="14" /> No live reviews reference it — the Performance module that will consume templates isn't wired yet, so nothing breaks downstream.</li>
        <li><Info :size="14" /> This can't be undone from the UI. Keeping it for the record? Deactivate it instead.</li>
      </ul>
    </div>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <div class="ad-grow" />
      <button v-if="template?.is_active !== false" class="set-btn ad-deact" type="button" :disabled="busy" @click="$emit('deactivate')">
        <Pause :size="14" /> Deactivate instead
      </button>
      <button class="set-btn ad-del" type="button" :disabled="busy" @click="$emit('confirm')">
        <Loader2 v-if="busy" :size="14" class="set-spin" />
        <Trash2 v-else :size="14" />
        Delete template
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { Trash2, Target, CircleX, CircleCheck, Info, Pause, Loader2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'

defineProps({
  open: { type: Boolean, default: false },
  template: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm', 'deactivate'])
</script>

<style scoped>
.ad { display: flex; flex-direction: column; gap: 15px; }
.ad-target { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 13px;
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 26%, transparent); }
.ad-target-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 14%, transparent); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ad-target-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ad-target-txt b { font-size: 14px; font-weight: 800; color: var(--set-text); }
.ad-target-txt span { font-size: 11px; color: var(--set-text-muted); }

.ad-facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.ad-facts li { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; line-height: 1.5; color: var(--set-text-secondary); }
.ad-facts li :deep(svg) { flex-shrink: 0; margin-top: 1px; color: var(--set-text-muted); }
.ad-facts li:first-child :deep(svg) { color: var(--set-conflict); }
.ad-facts li:nth-child(2) :deep(svg) { color: var(--set-ok); }

.ad-grow { flex: 1; }
.ad-deact { color: var(--set-text-secondary); }
.ad-deact:hover { color: var(--set-gold); border-color: var(--set-border-warm); }
.ad-del { color: #fff; border: none; background: linear-gradient(135deg, #f87171, var(--set-conflict)); }
.ad-del:hover:not(:disabled) { box-shadow: 0 10px 26px -12px var(--set-conflict); }
[data-theme="light"] .ad-del { color: #fff; }
</style>
