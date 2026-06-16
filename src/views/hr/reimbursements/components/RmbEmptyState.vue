<template>
  <div class="rmb-empty-card">
    <Motion
      as="div" class="ico"
      :initial="{ scale: 0.4, opacity: 0, rotate: -12 }"
      :animate="{ scale: 1, opacity: 1, rotate: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
    >
      <component :is="icon" :size="30" :stroke-width="1.6" />
    </Motion>
    <h4>{{ title }}</h4>
    <p v-if="subtitle">{{ subtitle }}</p>
    <slot />
  </div>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Receipt } from 'lucide-vue-next'
defineProps({
  icon: { type: [Object, Function], default: () => Receipt },
  title: { type: String, default: 'Nothing here yet' },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.rmb-empty-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ico { color: var(--rmb-st-pending); margin-bottom: 4px;
  width: 64px; height: 64px; display: grid; place-items: center; border-radius: 18px;
  background: var(--rmb-st-pending-soft); }
.rmb-empty-card h4 { margin: 0; font-size: 15px; color: var(--rmb-text); }
.rmb-empty-card p { margin: 0; font-size: 12.5px; color: var(--rmb-text-muted); max-width: 320px; }
</style>
