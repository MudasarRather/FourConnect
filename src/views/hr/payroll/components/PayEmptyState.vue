<template>
  <Motion class="pay-empty" as="div"
    :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <div class="empty-orb"><component :is="icon" :size="34" /></div>
    <h3>{{ title }}</h3>
    <p v-if="sub">{{ sub }}</p>
    <slot />
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Inbox } from 'lucide-vue-next'
defineProps({
  icon: { type: [Object, Function], default: () => Inbox },
  title: { type: String, default: 'Nothing here yet' },
  sub: { type: String, default: '' },
})
</script>

<style scoped>
.pay-empty { display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 56px 24px; text-align: center; }
.empty-orb { width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center;
  color: var(--pay-treasury); background: rgba(251,191,36,0.08);
  border: 1px solid var(--pay-border); box-shadow: inset 0 0 30px rgba(251,191,36,0.06); }
.pay-empty h3 { margin: 6px 0 0; color: var(--pay-text); font-size: 16px; font-weight: 700; }
.pay-empty p { margin: 0; color: var(--pay-text-muted); font-size: 13px; max-width: 360px; }
</style>
