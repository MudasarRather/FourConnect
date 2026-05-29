<template>
  <Motion
    as="div"
    class="edoc-empty"
    :initial="{ opacity: 0, y: 14 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
  >
    <div class="empty-orb">
      <component :is="icon" :size="26" />
      <span class="ring" />
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-body">{{ body }}</p>
    <Motion
      v-if="ctaLabel"
      as="button"
      type="button"
      class="edoc-btn edoc-btn-primary"
      :whileHover="{ y: -2, scale: 1.02 }"
      :whileTap="{ scale: 0.97 }"
      @click="$emit('cta')"
    >
      <component :is="ctaIcon" v-if="ctaIcon" :size="14" />
      {{ ctaLabel }}
    </Motion>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { FileX } from 'lucide-vue-next'

defineProps({
  icon: { type: [Object, Function], default: FileX },
  title: { type: String, default: 'Nothing here yet' },
  body: { type: String, default: '' },
  ctaLabel: { type: String, default: '' },
  ctaIcon: { type: [Object, Function], default: null },
})
defineEmits(['cta'])
</script>

<style scoped>
.empty-orb {
  position: relative;
  display: grid; place-items: center;
  width: 72px; height: 72px; border-radius: 50%;
  color: var(--hr-accent-gold);
  background: radial-gradient(circle, rgba(251,191,36,0.16), transparent 70%);
}
.empty-orb .ring {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 1px solid var(--hr-accent-gold-border);
  border-top-color: var(--hr-accent-gold);
  animation: edoc-ring-rotate 3.6s linear infinite;
}
.empty-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--hr-text); }
.empty-body { margin: 0; font-size: 13px; color: var(--hr-text-muted); max-width: 360px; }
</style>
