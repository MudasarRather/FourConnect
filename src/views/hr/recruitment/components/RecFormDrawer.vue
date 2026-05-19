<template>
  <ProfileDrawer
    :model-value="open"
    wide
    @update:model-value="onClose"
    :aria-label="title"
  >
    <header class="rec-drawer-header hr-spotlight" ref="headerRef">
      <div class="aurora-bg" aria-hidden="true" />
      <button class="close-btn" @click="onClose" aria-label="Close">
        <X :size="18" />
      </button>
      <div class="title-row">
        <div class="title-icon">
          <component :is="icon" :size="20" />
        </div>
        <div class="title-block">
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}<template v-if="stepLabel"> · <span class="step-tag">{{ stepLabel }}</span></template></p>
        </div>
      </div>
      <WizardStepper
        v-if="steps && steps.length > 1"
        :steps="steps"
        :current-index="stepIndex"
        @step="$emit('step', $event)"
      />
      <Confetti :fire="confettiTick" />
    </header>

    <div class="rec-drawer-body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="rec-drawer-footer">
      <slot name="footer" />
    </footer>
  </ProfileDrawer>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import ProfileDrawer from '../../../../components/hr/ProfileDrawer.vue'
import WizardStepper from '../../../../components/hr/WizardStepper.vue'
import Confetti from '../../../../components/hr/Confetti.vue'
import { useSpotlight } from '../../../../composables/useSpotlight'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], required: true },
  steps: { type: Array, default: () => [] },
  stepIndex: { type: Number, default: 0 },
  stepLabel: { type: String, default: '' },
  confettiTick: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'step'])

const headerRef = ref(null)
useSpotlight(headerRef)

const onClose = () => emit('close')
</script>

<style scoped>
.rec-drawer-header {
  position: relative;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--hr-border);
  overflow: hidden;
}
.aurora-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 100% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(60% 80% at 100% 30%, rgba(251, 146, 60, 0.18), transparent 60%);
  background-size: 200% 200%;
  animation: hr-aurora 14s ease-in-out infinite;
  pointer-events: none;
}
.close-btn {
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--hr-border-strong);
  border-radius: 10px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  z-index: 2;
  transition: all 220ms var(--hr-spring);
}
.close-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--hr-text);
  transform: rotate(90deg);
}

.title-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.title-icon {
  width: 40px; height: 40px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-accent-gold);
}
.title-block h2 {
  font-size: 19px;
  font-weight: 700;
  margin: 0;
  color: var(--hr-text);
  letter-spacing: -0.015em;
}
.title-block p {
  font-size: 12px;
  color: var(--hr-text-muted);
  margin: 2px 0 0;
}
.step-tag {
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border: 1px solid var(--hr-accent-gold-border);
  margin-left: 4px;
}

.rec-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 28px;
}
.rec-drawer-body::-webkit-scrollbar { width: 8px; }
.rec-drawer-body::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
}

.rec-drawer-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid var(--hr-border);
  background: rgba(14, 14, 16, 0.85);
}
</style>
