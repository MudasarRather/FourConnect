<template>
  <div class="rec-empty">
    <!-- Lottie variant (heavier visual) -->
    <div v-if="lottie" class="rec-empty-lottie">
      <DotLottieVue
        :src="lottie"
        :loop="true"
        :autoplay="true"
        style="width: 140px; height: 140px;"
      />
    </div>

    <!-- Default: dotted orbit ring + lucide icon -->
    <div v-else class="rec-empty-orbit">
      <div class="orbit-ring" />
      <div class="orbit-ring orbit-ring-2" />
      <div class="orbit-pulse" />
      <div class="orbit-icon">
        <component :is="icon" :size="26" />
      </div>
    </div>

    <h4 class="rec-empty-title">{{ title }}</h4>
    <p v-if="body" class="rec-empty-body">{{ body }}</p>

    <button v-if="ctaLabel" class="rec-btn-primary rec-empty-cta" @click="$emit('cta')">
      <component :is="ctaIcon || Plus" :size="14" />
      {{ ctaLabel }}
    </button>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { Plus } from 'lucide-vue-next'

defineProps({
  icon:     { type: [Object, Function], required: true },
  title:    { type: String, required: true },
  body:     { type: String, default: '' },
  ctaLabel: { type: String, default: '' },
  ctaIcon:  { type: [Object, Function], default: null },
  lottie:   { type: String, default: '' },
})
defineEmits(['cta'])

// Lazy-load DotLottieVue only when used so empty states without a lottie URL
// don't pay for it.
const DotLottieVue = defineAsyncComponent(() =>
  import('@lottiefiles/dotlottie-vue').then(m => m.DotLottieVue || m.default)
)
</script>

<style scoped>
.rec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  gap: 14px;
  color: var(--hr-text-muted);
}

/* Orbit illustration */
.rec-empty-orbit {
  position: relative;
  width: 96px; height: 96px;
  display: grid; place-items: center;
}
.orbit-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1.5px dashed rgba(251, 191, 36, 0.35);
  animation: rec-orbit-spin 12s linear infinite;
}
.orbit-ring-2 {
  inset: 10px;
  border-color: rgba(251, 146, 60, 0.28);
  animation: rec-orbit-spin 18s linear infinite reverse;
}
.orbit-pulse {
  position: absolute; inset: 24px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(251, 191, 36, 0.18), rgba(251, 146, 60, 0.05) 70%, transparent 100%);
  animation: rec-pulse-gold 2.8s ease-out infinite;
}
.orbit-icon {
  position: relative;
  z-index: 2;
  width: 48px; height: 48px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #1a1208, #0a0805);
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
  box-shadow: 0 8px 28px -10px rgba(251, 146, 60, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.rec-empty-lottie {
  display: grid; place-items: center;
  margin-bottom: -8px;
}

.rec-empty-title {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.rec-empty-body {
  margin: 0;
  font-size: 12.5px;
  color: var(--hr-text-muted);
  max-width: 420px;
  line-height: 1.55;
}
.rec-empty-cta { margin-top: 6px; }

@keyframes rec-orbit-spin { to { transform: rotate(360deg); } }
</style>
