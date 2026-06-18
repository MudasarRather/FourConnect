<template>
  <TrnModal :open="open" title="Archive program" subtitle="Soft-deletes the program and removes it from the catalog." :icon="Trash2" @close="close">
    <template v-if="program">
      <!-- what's being removed -->
      <Motion as="div" class="dp-target"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="dp-orbit" aria-hidden="true"><span class="dp-star" /></span>
        <div class="dp-target-meta">
          <span class="dp-name">{{ program.name }}</span>
          <span class="dp-sub"><TrnTypeBadge :type="program.training_type" /><span v-if="program.code" class="trn-mono dp-code">{{ program.code }}</span></span>
        </div>
      </Motion>

      <!-- ── BLOCKED: program has in-flight learners ── -->
      <Motion v-if="blocked" as="div" class="dp-block-warn"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.06 }">
        <span class="dpw-ic"><Lock :size="18" /></span>
        <div>
          <h4>Can't archive — {{ activeEnrolled }} learner{{ activeEnrolled === 1 ? '' : 's' }} still in progress</h4>
          <p>
            Mark them <strong>complete</strong> or <strong>waived</strong>, or un-enrol them first — then this program can be archived.
            <template v-if="finishedEnrolled">Finished records ({{ finishedEnrolled }}) are kept either way.</template>
          </p>
          <button class="trn-btn trn-btn-ghost" @click="$emit('assign', program)"><Users :size="14" /> Manage enrollees</button>
        </div>
      </Motion>

      <!-- ── reason workflow ── -->
      <template v-else>
        <Motion as="div" class="dp-warn"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.05 }">
          <AlertTriangle :size="15" class="dpw-pulse" />
          <span>This removes the program from the catalog and the onboarding picker. It's reversible only from the database.</span>
        </Motion>

        <!-- preserved-history note when finished enrollments exist -->
        <Motion v-if="finishedEnrolled" as="div" class="dp-keep"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.09 }">
          <Archive :size="15" />
          <span><strong>{{ finishedEnrolled }} finished enrollment{{ finishedEnrolled === 1 ? '' : 's' }}</strong> will be preserved as training history — completion dates and scores stay intact.</span>
        </Motion>

        <Motion as="div" class="dp-fields"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.12 }">
          <TrnSelect v-model="reason" label="Reason for archiving" required :options="REASONS" placeholder="Choose a reason…" />
          <label class="dp-note">
            <span class="dp-note-label">Note <i>(optional)</i></span>
            <textarea v-model="note" rows="2" maxlength="240" placeholder="Add context for the audit trail…" />
          </label>
          <label class="dp-confirm">
            <span class="dp-note-label">Type <b>{{ program.name }}</b> to confirm</span>
            <input v-model="confirmText" :placeholder="program.name" autocomplete="off" spellcheck="false"
              :class="{ ok: nameMatches }" />
          </label>
        </Motion>
      </template>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="close">{{ blocked ? 'Close' : 'Cancel' }}</button>
      <Motion v-if="!blocked" as="button" class="trn-btn trn-btn-danger dp-go" :class="{ armed: canDelete }"
        :disabled="!canDelete || deleting" :whileHover="canDelete && !deleting ? { y: -2 } : {}" :whileTap="{ scale: 0.97 }"
        @click="confirm">
        <Loader v-if="deleting" :size="14" class="spin" /><Trash2 v-else :size="14" />
        Archive program
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Trash2, AlertTriangle, Lock, Users, Loader, Archive } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnTypeBadge from '../components/TrnTypeBadge.vue'
import { deleteTrainingProgram, fetchTrainingAssignments } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  program: { type: Object, default: null },
})
const emit = defineEmits(['close', 'deleted', 'assign'])
const toast = useToast()

const REASONS = [
  { value: 'Duplicate of another program', label: 'Duplicate of another program' },
  { value: 'Outdated / no longer offered', label: 'Outdated / no longer offered' },
  { value: 'Replaced by a newer program', label: 'Replaced by a newer program' },
  { value: 'Created in error', label: 'Created in error' },
  { value: 'Other', label: 'Other reason' },
]

const reason = ref('')
const note = ref('')
const confirmText = ref('')
const deleting = ref(false)
const enrolled = ref(0)        // total enrollments
const activeEnrolled = ref(0)  // NOT_STARTED + IN_PROGRESS — these block archiving
const finishedEnrolled = ref(0) // COMPLETED / FAILED / WAIVED — preserved as history

const ACTIVE_STATUSES = new Set(['NOT_STARTED', 'IN_PROGRESS'])

watch(() => props.open, async (o) => {
  if (!o) return
  reason.value = ''; note.value = ''; confirmText.value = ''; deleting.value = false
  // Trust the list count first for an instant verdict, then confirm live.
  enrolled.value = Number(props.program?.enrollment_count) || 0
  activeEnrolled.value = enrolled.value  // pessimistic until confirmed
  finishedEnrolled.value = 0
  if (props.program?.id) {
    try {
      const rows = await fetchTrainingAssignments({ program_id: props.program.id })
      enrolled.value = rows.length
      activeEnrolled.value = rows.filter(r => ACTIVE_STATUSES.has(r.status)).length
      finishedEnrolled.value = rows.length - activeEnrolled.value
    } catch { /* keep the optimistic count */ }
  }
})

// Only learners still in flight block archiving. Completed/failed/waived records
// are training history and are preserved on the (soft-deleted) program.
const blocked = computed(() => activeEnrolled.value > 0)
const nameMatches = computed(() => (confirmText.value || '').trim() === (props.program?.name || '').trim())
const canDelete = computed(() => !blocked.value && !!reason.value && nameMatches.value)

const close = () => emit('close')
const confirm = async () => {
  if (!canDelete.value) return
  deleting.value = true
  try {
    await deleteTrainingProgram(props.program.id, { reason: reason.value, note: note.value })
    toast.success('Program archived')
    emit('deleted')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not archive program')
    deleting.value = false
  }
}
</script>

<style scoped>
.dp-target { display: flex; align-items: center; gap: 13px; padding: 13px 14px; border-radius: 14px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); margin-bottom: 16px; }
.dp-orbit { position: relative; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--trn-amber) 32%, transparent); animation: trn-orbit-spin 8s linear infinite; }
.dp-star { position: absolute; top: -2px; left: 50%; width: 5px; height: 5px; border-radius: 50%; transform: translateX(-50%);
  background: var(--trn-star); box-shadow: 0 0 9px var(--trn-amber); }
.dp-target-meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.dp-name { font-size: 14.5px; font-weight: 700; color: var(--trn-text); }
.dp-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dp-code { font-size: 11px; color: var(--trn-text-dim); }

/* blocked */
.dp-block-warn { display: flex; gap: 12px; padding: 16px; border-radius: 14px;
  background: var(--trn-st-failed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-failed) 30%, transparent); }
.dpw-ic { display: inline-flex; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; align-items: center; justify-content: center;
  color: var(--trn-st-failed); background: color-mix(in srgb, var(--trn-st-failed) 16%, transparent); }
.dp-block-warn h4 { margin: 0 0 4px; font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.dp-block-warn p { margin: 0 0 11px; font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }

/* warn banner */
.dp-warn { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; margin-bottom: 16px;
  background: var(--trn-cert-pending-soft); border: 1px solid color-mix(in srgb, var(--trn-ember) 26%, transparent);
  font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }
.dp-warn :deep(svg) { color: var(--trn-ember); flex-shrink: 0; margin-top: 1px; }
.dpw-pulse { animation: trn-pulse-dot 2.2s ease-out infinite; border-radius: 50%; }

/* preserved-history note */
.dp-keep { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; margin-bottom: 16px;
  background: color-mix(in srgb, var(--trn-st-completed) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--trn-st-completed) 28%, transparent);
  font-size: 12.5px; line-height: 1.5; color: var(--trn-text-secondary); }
.dp-keep :deep(svg) { color: var(--trn-st-completed); flex-shrink: 0; margin-top: 1px; }
.dp-keep strong { color: var(--trn-text); font-weight: 700; }

.dp-fields { display: flex; flex-direction: column; gap: 13px; }
.dp-note, .dp-confirm { display: flex; flex-direction: column; gap: 6px; }
.dp-note-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.dp-note-label i { font-weight: 400; color: var(--trn-text-dim); font-style: normal; }
.dp-note-label b { color: var(--trn-amber-strong); font-weight: 700; }
.dp-note textarea, .dp-confirm input { width: 100%; font: inherit; font-size: 13.5px; color: var(--trn-text);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); border-radius: 11px; padding: 9px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.dp-note textarea { resize: vertical; min-height: 52px; }
.dp-note textarea:focus, .dp-confirm input:focus { outline: none; border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.dp-confirm input.ok { border-color: color-mix(in srgb, var(--trn-st-completed) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-st-completed) 14%, transparent); }

.dp-go { margin-left: 0; opacity: 0.6; transition: opacity 0.25s, box-shadow 0.25s; }
.dp-go.armed { opacity: 1; box-shadow: 0 0 20px -6px color-mix(in srgb, var(--trn-st-failed) 60%, transparent); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@media (prefers-reduced-motion: reduce) { .dp-orbit, .dpw-pulse { animation: none; } }
</style>
