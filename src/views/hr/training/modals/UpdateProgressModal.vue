<template>
  <TrnModal :open="open" title="Update progress"
    :subtitle="assignment ? assignment.program_name : ''" :icon="ClipboardCheck" @close="$emit('close')">
    <template v-if="assignment">
      <!-- who + live trajectory -->
      <Motion as="div" class="up-who"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
        <span class="up-avatar" aria-hidden="true">{{ initial }}</span>
        <div class="up-who-meta">
          <strong>{{ assignment.employee_name || '—' }}</strong>
          <span>{{ assignment.program_name || '—' }}</span>
        </div>
        <TrnStatusStamp :status="form.status" kind="assignment" :fresh="true" />
      </Motion>

      <Motion as="div" class="up-traj"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.5, delay: 0.08 }">
        <TrnTrajectory :key="form.status" :status="form.status" />
      </Motion>

      <Motion as="div" class="up-grid"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
        <div class="span2">
          <TrnSelect v-model="form.status" label="Status" :options="statusOptions" />
          <span class="up-hint"><Sparkles :size="11" /> Marking Completed auto-issues a certificate when the program awards one.</span>
        </div>
        <TrnField v-model="form.score" label="Score" type="number" step="0.1" placeholder="optional, e.g. 86" />
        <label class="up-date">
          <span class="up-date-lab">Completion date</span>
          <HrDatePicker v-model="form.completion_date" :max="todayIso" placeholder="Pick a date" />
        </label>
        <TrnField v-model="form.certification_url" label="Certificate URL" placeholder="https://…" class="span2" />
        <TrnField v-model="form.notes" label="Notes" type="textarea" placeholder="Optional notes on this update…" class="span2" />
      </Motion>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="trn-btn trn-btn-primary" :disabled="saving"
        :whileHover="saving ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="15" />Save progress
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ClipboardCheck, Loader, Sparkles, Check } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import TrnTrajectory from '../components/TrnTrajectory.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { patchTrainingAssignment, ASSIGNMENT_STATUSES, statusMeta } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  assignment: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)

const STATUS_DOTS = {
  NOT_STARTED: 'var(--trn-st-not-started)', IN_PROGRESS: 'var(--trn-st-in-progress)',
  COMPLETED: 'var(--trn-st-completed)', FAILED: 'var(--trn-st-failed)', WAIVED: 'var(--trn-st-waived)',
}
const statusOptions = ASSIGNMENT_STATUSES.map(s => ({ value: s, label: statusMeta(s).label, dot: STATUS_DOTS[s] }))
const todayIso = new Date().toISOString().slice(0, 10)

const blank = () => ({ status: 'NOT_STARTED', score: null, certification_url: '', completion_date: '', notes: '' })
const form = ref(blank())

const initial = computed(() => {
  const n = props.assignment?.employee_name || ''
  return n ? n.trim().charAt(0).toUpperCase() : '?'
})

watch(() => props.open, (o) => {
  if (o) {
    const a = props.assignment
    form.value = a
      ? {
          status: a.status || 'NOT_STARTED',
          score: a.score ?? null,
          certification_url: a.certification_url || '',
          completion_date: (a.completion_date || '').slice(0, 10),
          notes: a.notes || '',
        }
      : blank()
  }
})

const save = async () => {
  if (!props.assignment) return
  saving.value = true
  try {
    const payload = { status: form.value.status }
    if (form.value.score !== null && form.value.score !== '') payload.score = form.value.score
    if (form.value.certification_url) payload.certification_url = form.value.certification_url
    if (form.value.completion_date) payload.completion_date = form.value.completion_date
    if (form.value.notes) payload.notes = form.value.notes
    await patchTrainingAssignment(props.assignment.id, payload)
    toast.success('Progress updated')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update progress')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.up-who { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px 14px; border-radius: 12px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.up-avatar { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%;
  font-family: var(--trn-mono); font-size: 15px; font-weight: 700; color: #1a1206; flex-shrink: 0;
  background: var(--trn-grad-rail); box-shadow: 0 4px 12px -4px rgba(251, 146, 60, 0.5); }
.up-who-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.up-who-meta strong { font-size: 14px; font-weight: 700; color: var(--trn-text); }
.up-who-meta span { font-size: 12px; color: var(--trn-text-muted); }
.up-traj { padding: 4px 4px 16px; }
.up-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.span2 { grid-column: span 2; }
.up-hint { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 11px; color: var(--trn-text-dim); }
.up-hint :deep(svg) { color: var(--trn-amber-strong); }
.up-date { display: flex; flex-direction: column; gap: 6px; }
.up-date-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@media (max-width: 520px) { .up-grid { grid-template-columns: 1fr; } .span2 { grid-column: span 1; } }
</style>
