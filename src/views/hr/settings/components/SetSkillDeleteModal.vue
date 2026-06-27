<template>
  <SetModal :open="open" title="Delete skill" :subtitle="skill?.name || ''"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="500" mode="delete" @close="$emit('close')">

    <div class="skd">
      <div class="skd-target">
        <span class="skd-target-ic"><component :is="cat.icon" :size="18" /></span>
        <div class="skd-target-txt">
          <b>{{ skill?.name }}</b>
          <span>{{ cat.label }} · scale 1–{{ skill?.max_level || 5 }}{{ requirementCount ? ` · ${requirementCount} requirement(s)` : '' }}</span>
        </div>
      </div>

      <ul class="skd-facts">
        <li><CircleX :size="14" /> The skill is removed from new requirements, assessments and the skill picker.</li>
        <li v-if="requirementCount" class="warn"><TriangleAlert :size="14" /> {{ requirementCount }} role requirement(s) reference it — they'll be orphaned.</li>
        <li><CircleCheck :size="14" /> Existing matrix rows keep their recorded level for history — they won't break.</li>
        <li><Info :size="14" /> This can't be undone. Want to keep it for the record? Deactivate it instead.</li>
      </ul>
    </div>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <div class="skd-grow" />
      <button v-if="skill?.is_active !== false" class="set-btn skd-deact" type="button" :disabled="busy" @click="$emit('deactivate')">
        <Pause :size="14" /> Deactivate instead
      </button>
      <button class="set-btn skd-del" type="button" :disabled="busy" @click="$emit('confirm')">
        <Loader2 v-if="busy" :size="14" class="set-spin" />
        <Trash2 v-else :size="14" />
        Delete skill
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { computed } from 'vue'
import { Trash2, CircleX, CircleCheck, Info, Pause, Loader2, TriangleAlert } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import { skillCategoryMeta } from '../composables/trainingVocab'

const props = defineProps({
  open: { type: Boolean, default: false },
  skill: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  requirementCount: { type: Number, default: 0 },
})
defineEmits(['close', 'confirm', 'deactivate'])

const cat = computed(() => skillCategoryMeta(props.skill?.category))
</script>

<style scoped>
.skd { display: flex; flex-direction: column; gap: 15px; }
.skd-target { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 13px;
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 26%, transparent); }
.skd-target-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 14%, transparent); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.skd-target-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.skd-target-txt b { font-size: 14px; font-weight: 800; color: var(--set-text); }
.skd-target-txt span { font-size: 11.5px; color: var(--set-text-muted); }

.skd-facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.skd-facts li { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; line-height: 1.5; color: var(--set-text-secondary); }
.skd-facts li :deep(svg) { flex-shrink: 0; margin-top: 1px; color: var(--set-text-muted); }
.skd-facts li:first-child :deep(svg) { color: var(--set-conflict); }
.skd-facts li.warn { color: var(--set-text); }
.skd-facts li.warn :deep(svg) { color: var(--set-partial); }
.skd-facts li:nth-last-child(2) :deep(svg) { color: var(--set-ok); }

.skd-grow { flex: 1; }
.skd-deact { color: var(--set-text-secondary); }
.skd-deact:hover { color: var(--set-gold); border-color: var(--set-border-warm); }
.skd-del { color: #fff; border: none; background: linear-gradient(135deg, #f87171, var(--set-conflict)); }
.skd-del:hover:not(:disabled) { box-shadow: 0 10px 26px -12px var(--set-conflict); }
[data-theme="light"] .skd-del { color: #fff; }
</style>
