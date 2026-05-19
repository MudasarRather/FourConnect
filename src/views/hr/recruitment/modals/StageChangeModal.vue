<template>
  <RecModal
    :open="open"
    title="Move Application Stage"
    :subtitle="application ? `${application.candidate_name} · ${application.position_code}` : ''"
    :icon="GitBranch"
    :width="520"
    @close="$emit('close')"
  >
    <form @submit.prevent="onSubmit" class="stage-form">
      <div class="current-row">
        <span class="lbl">Current</span>
        <span :class="['rec-stage-chip', `rec-stage-${(application?.current_stage || '').toLowerCase()}`]">
          <span class="dot" /> {{ humanStage(application?.current_stage) }}
        </span>
      </div>

      <HrFieldLabel label="Move to" required />
      <div class="stage-grid">
        <button
          v-for="s in stages"
          :key="s.key"
          type="button"
          :class="['stage-tile', form.stage === s.key && 'is-selected']"
          @click="form.stage = s.key"
        >
          <span class="stage-dot" :style="{ background: stageColor(s.key) }" />
          <span class="stage-name">{{ s.label }}</span>
        </button>
      </div>

      <div v-if="form.stage === 'REJECTED'" class="field-block">
        <HrFieldLabel label="Rejection Reason" />
        <HrTextarea v-model="form.rejection_reason" :rows="2" placeholder="Brief reason for the candidate's record" />
      </div>

      <div v-else class="field-block">
        <HrFieldLabel label="Notes (optional)" />
        <HrTextarea v-model="form.notes" :rows="2" placeholder="Any context worth saving…" />
      </div>
    </form>

    <template #footer>
      <button class="ghost" @click="$emit('close')">Cancel</button>
      <div class="grow" />
      <button class="primary" :disabled="!form.stage || submitting" @click="onSubmit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Check v-else :size="14" />
        Move to {{ humanStage(form.stage) || '—' }}
      </button>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { GitBranch, Check, Loader2 } from 'lucide-vue-next'
import RecModal from '../components/RecModal.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  application: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const stages = [
  { key: 'SCREENING',   label: 'Screening' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'INTERVIEW',   label: 'Interview' },
  { key: 'SELECTED',    label: 'Selected' },
  { key: 'OFFER',       label: 'Offer' },
  { key: 'JOINED',      label: 'Joined' },
  { key: 'REJECTED',    label: 'Rejected' },
  { key: 'WITHDRAWN',   label: 'Withdrawn' },
]

const form = ref({ stage: null, notes: '', rejection_reason: '' })

watch(() => props.open, (v) => {
  if (v) form.value = { stage: null, notes: '', rejection_reason: '' }
})

const onSubmit = () => {
  if (!form.value.stage) return
  emit('submit', {
    stage: form.value.stage,
    notes: form.value.notes || null,
    rejection_reason: form.value.rejection_reason || null,
  })
}

const stageColor = (s) => ({
  APPLIED: '#fde68a', SCREENING: '#fbbf24', SHORTLISTED: '#f59e0b',
  INTERVIEW: '#fb923c', SELECTED: '#ea580c', OFFER: '#f97316',
  JOINED: '#34d399', REJECTED: '#f87171', WITHDRAWN: '#9ca3af',
}[s] || '#9ca3af')

const humanStage = (s) =>
  ({ APPLIED:'Applied', SCREENING:'Screening', SHORTLISTED:'Shortlisted',
    INTERVIEW:'Interview', SELECTED:'Selected', OFFER:'Offer',
    JOINED:'Joined', REJECTED:'Rejected', WITHDRAWN:'Withdrawn' }[s] || '')
</script>

<style scoped>
.stage-form { display: flex; flex-direction: column; gap: 14px; }

.current-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hr-border);
  border-radius: 10px;
}
.lbl {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--hr-text-muted);
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}
.stage-tile {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--hr-border);
  border-radius: 10px;
  color: var(--hr-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.stage-tile:hover {
  border-color: var(--hr-accent-gold-border);
  background: rgba(251, 191, 36, 0.06);
  color: var(--hr-text);
}
.stage-tile.is-selected {
  border-color: var(--hr-accent-gold);
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
}
.stage-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.field-block { display: flex; flex-direction: column; gap: 4px; }

.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.grow { flex: 1; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
