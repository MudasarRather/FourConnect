<template>
  <div class="wizard-stepper">
    <div class="track-bg" />
    <div class="track-fill" :style="{ width: `${progressPct}%` }" />
    <div class="steps">
      <button
        v-for="(step, idx) in steps"
        :key="step.key"
        type="button"
        class="step"
        :class="{
          active: idx === currentIndex,
          done: idx < currentIndex,
          clickable: idx <= currentIndex,
        }"
        :disabled="idx > currentIndex"
        @click="onStepClick(idx)"
      >
        <span class="step-marker">
          <Check v-if="idx < currentIndex" :size="14" />
          <span v-else class="step-num">{{ idx + 1 }}</span>
        </span>
        <span class="step-label">{{ step.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'

const props = defineProps({
  steps: { type: Array, required: true }, // [{ key, label }]
  currentIndex: { type: Number, required: true },
})
const emit = defineEmits(['step'])

const progressPct = computed(() => {
  if (props.steps.length <= 1) return 0
  return Math.min(100, (props.currentIndex / (props.steps.length - 1)) * 100)
})

const onStepClick = (idx) => {
  if (idx <= props.currentIndex) emit('step', idx)
}
</script>

<style scoped>
.wizard-stepper {
  position: relative;
  padding: 6px 0 18px;
}
.track-bg,
.track-fill {
  position: absolute;
  top: 22px;
  height: 2px;
  border-radius: 999px;
}
.track-bg {
  left: 22px; right: 22px;
  background: var(--hr-border);
}
.track-fill {
  left: 22px;
  background: linear-gradient(90deg, var(--hr-accent-gold), var(--hr-amber), var(--hr-orange));
  transition: width 0.4s var(--hr-spring);
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.5);
}

.steps {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: not-allowed;
  flex: 1;
  min-width: 0;
  padding: 0;
}
.step.clickable { cursor: pointer; }
.step-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--hr-surface);
  border: 2px solid var(--hr-border-strong);
  color: var(--hr-text-muted);
  font-size: 13px;
  font-weight: 700;
  transition: transform 0.25s var(--hr-spring), background 0.25s, border-color 0.25s, color 0.25s;
}
.step.active .step-marker {
  background: var(--hr-accent-gold-soft);
  border-color: var(--hr-accent-gold);
  color: var(--hr-accent-gold);
  transform: scale(1.05);
  box-shadow: var(--hr-accent-gold-glow);
}
.step.done .step-marker {
  background: var(--hr-accent-gold);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
}
.step-num { line-height: 1; }
.step-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--hr-text-muted);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.step.active .step-label { color: var(--hr-text); }
.step.done .step-label { color: var(--hr-text-secondary); }
</style>
