<template>
  <RecModal
    :open="open"
    :title="initial ? 'Edit Interview Feedback' : 'Submit Interview Feedback'"
    :subtitle="interview ? `${interview.candidate_name || ''} · ${interview.interview_type} · ${interview.round}` : ''"
    :icon="MessageSquare"
    :width="600"
    @close="$emit('close')"
  >
    <form @submit.prevent="onSubmit" class="form">
      <div class="rating-row">
        <div class="rating-grp">
          <HrFieldLabel label="Technical" />
          <RatingInput v-model="form.technical_rating" />
        </div>
        <div class="rating-grp">
          <HrFieldLabel label="Communication" />
          <RatingInput v-model="form.communication_rating" />
        </div>
        <div class="rating-grp">
          <HrFieldLabel label="Cultural Fit" />
          <RatingInput v-model="form.cultural_fit_rating" />
        </div>
        <div class="rating-grp">
          <HrFieldLabel label="Overall" />
          <RatingInput v-model="form.overall_rating" />
        </div>
      </div>

      <div class="field-block">
        <HrFieldLabel label="Recommendation" required />
        <div class="rec-grid">
          <button
            v-for="r in recommendations"
            :key="r.key"
            type="button"
            :class="['rec-tile', `tone-${r.tone}`, form.recommendation === r.key && 'is-selected']"
            @click="form.recommendation = r.key"
          >
            <component :is="r.icon" :size="14" />
            <span>{{ r.label }}</span>
          </button>
        </div>
      </div>

      <div class="field-block">
        <HrFieldLabel label="Strengths" />
        <HrTextarea v-model="form.strengths" :rows="2" placeholder="What stood out positively…" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Areas of Concern" />
        <HrTextarea v-model="form.weaknesses" :rows="2" placeholder="What gaps or risks exist…" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Detailed Feedback" />
        <HrTextarea v-model="form.detailed_feedback" :rows="3" placeholder="Anything else worth recording…" />
      </div>
    </form>

    <template #footer>
      <button class="ghost" @click="$emit('close')">Cancel</button>
      <div class="grow" />
      <button class="primary" :disabled="submitting" @click="onSubmit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Send v-else :size="14" />
        {{ initial ? 'Update Feedback' : 'Submit Feedback' }}
      </button>
    </template>
  </RecModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  MessageSquare, Send, Loader2, Sparkles, ThumbsUp, Minus, ThumbsDown, X,
} from 'lucide-vue-next'
import RecModal from '../components/RecModal.vue'
import RatingInput from '../components/RatingInput.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  interview: { type: Object, default: null },
  initial: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const recommendations = [
  { key: 'STRONG_HIRE',    label: 'Strong Hire',    icon: Sparkles,   tone: 'gold-strong' },
  { key: 'HIRE',           label: 'Hire',           icon: ThumbsUp,   tone: 'positive' },
  { key: 'HOLD',           label: 'Hold',           icon: Minus,      tone: 'neutral' },
  { key: 'NO_HIRE',        label: 'No Hire',        icon: ThumbsDown, tone: 'negative' },
  { key: 'STRONG_NO_HIRE', label: 'Strong No Hire', icon: X,          tone: 'negative-strong' },
]

const blank = () => ({
  technical_rating: null,
  communication_rating: null,
  cultural_fit_rating: null,
  overall_rating: null,
  recommendation: 'HOLD',
  strengths: '',
  weaknesses: '',
  detailed_feedback: '',
})
const form = ref(blank())

const hydrate = () => {
  const i = props.initial
  if (!i) { form.value = blank(); return }
  form.value = {
    technical_rating: i.technical_rating ?? null,
    communication_rating: i.communication_rating ?? null,
    cultural_fit_rating: i.cultural_fit_rating ?? null,
    overall_rating: i.overall_rating ?? null,
    recommendation: i.recommendation || 'HOLD',
    strengths: i.strengths || '',
    weaknesses: i.weaknesses || '',
    detailed_feedback: i.detailed_feedback || '',
  }
}

watch(() => props.open, (v) => { if (v) hydrate() })
watch(() => props.initial, () => { if (props.open) hydrate() })

const onSubmit = () => {
  const payload = { ...form.value }
  for (const [k, v] of Object.entries(payload)) {
    if (v === '' || v === null || v === undefined) delete payload[k]
  }
  emit('submit', payload)
}
</script>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px; }

.rating-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--hr-border);
  border-radius: 12px;
}
.rating-grp { display: flex; flex-direction: column; gap: 6px; }
.field-block { display: flex; flex-direction: column; gap: 4px; }

.rec-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.rec-tile {
  display: inline-flex; align-items: center; gap: 5px;
  justify-content: center;
  padding: 8px 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--hr-border);
  border-radius: 9px;
  color: var(--hr-text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.rec-tile:hover { background: rgba(255,255,255,0.06); color: var(--hr-text); }
.rec-tile.is-selected {
  box-shadow: 0 0 0 2px currentColor inset, 0 0 14px rgba(0,0,0,0.2);
}
.rec-tile.tone-gold-strong.is-selected { color: var(--hr-accent-gold); background: rgba(251, 191, 36, 0.14); }
.rec-tile.tone-positive.is-selected    { color: #34d399; background: rgba(52, 211, 153, 0.12); }
.rec-tile.tone-neutral.is-selected     { color: #9ca3af; background: rgba(156, 163, 175, 0.12); }
.rec-tile.tone-negative.is-selected    { color: #f87171; background: rgba(248, 113, 113, 0.12); }
.rec-tile.tone-negative-strong.is-selected {
  color: #dc2626; background: rgba(220, 38, 38, 0.14);
}

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

@media (max-width: 600px) {
  .rating-row { grid-template-columns: 1fr; }
  .rec-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
