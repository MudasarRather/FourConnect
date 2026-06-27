<template>
  <SetModal :open="open" title="Delete interview panel" :subtitle="panel?.name || ''"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="500" mode="delete" @close="$emit('close')">

    <div class="pd">
      <div class="pd-target">
        <span class="pd-target-ic"><UsersRound :size="18" /></span>
        <div class="pd-target-txt">
          <b>{{ panel?.name }}</b>
          <span>{{ memberCount }} {{ memberCount === 1 ? 'panelist' : 'panelists' }} · {{ expertiseCount }} expertise tags</span>
        </div>
      </div>

      <ul class="pd-facts">
        <li><CircleX :size="14" /> The panel is removed from the picker when scheduling new interviews.</li>
        <li><CircleCheck :size="14" /> Interviews already scheduled keep their interviewer snapshot — they won't break.</li>
        <li><Info :size="14" /> This can't be undone. Prefer keeping it for the record? Deactivate it instead.</li>
      </ul>
    </div>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <div class="pd-grow" />
      <button v-if="panel?.is_active !== false" class="set-btn pd-deact" type="button" :disabled="busy" @click="$emit('deactivate')">
        <Pause :size="14" /> Deactivate instead
      </button>
      <button class="set-btn pd-del" type="button" :disabled="busy" @click="$emit('confirm')">
        <Loader2 v-if="busy" :size="14" class="set-spin" />
        <Trash2 v-else :size="14" />
        Delete panel
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { computed } from 'vue'
import { Trash2, UsersRound, CircleX, CircleCheck, Info, Pause, Loader2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  panel: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm', 'deactivate'])

const memberCount = computed(() => props.panel?.members?.length || 0)
const expertiseCount = computed(() => props.panel?.expertise?.length || 0)
</script>

<style scoped>
.pd { display: flex; flex-direction: column; gap: 15px; }
.pd-target { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 13px;
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 26%, transparent); }
.pd-target-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 14%, transparent); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.pd-target-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pd-target-txt b { font-size: 14px; font-weight: 800; color: var(--set-text); }
.pd-target-txt span { font-size: 11.5px; color: var(--set-text-muted); }

.pd-facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.pd-facts li { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; line-height: 1.5; color: var(--set-text-secondary); }
.pd-facts li :deep(svg) { flex-shrink: 0; margin-top: 1px; color: var(--set-text-muted); }
.pd-facts li:first-child :deep(svg) { color: var(--set-conflict); }
.pd-facts li:nth-child(2) :deep(svg) { color: var(--set-ok); }

.pd-grow { flex: 1; }
.pd-deact { color: var(--set-text-secondary); }
.pd-deact:hover { color: var(--set-gold); border-color: var(--set-border-warm); }
.pd-del { color: #fff; border: none; background: linear-gradient(135deg, #f87171, var(--set-conflict)); }
.pd-del:hover:not(:disabled) { box-shadow: 0 10px 26px -12px var(--set-conflict); }
[data-theme="light"] .pd-del { color: #fff; }
</style>
