<template>
  <span class="lt-wrap" :class="{ ambient: ambient }" :style="vars">
    <span class="lt-glow" aria-hidden="true" />
    <span class="lt-icon">
      <component :is="meta.icon" :size="size" />
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  type: { type: String, required: true },
  size: { type: Number, default: 16 },
  // When true, the icon plays a slow ambient loop (used in policy cards).
  ambient: { type: Boolean, default: false },
})
const meta = computed(() => typeMeta(props.type))
const vars = computed(() => ({ '--lt-c': meta.value.hex || 'var(--hr-accent-gold)' }))
</script>

<style scoped>
.lt-wrap {
  position: relative;
  display: inline-grid; place-items: center;
  width: 30px; height: 30px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--lt-c) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--lt-c) 34%, transparent);
  color: var(--lt-c);
  isolation: isolate;
}
.lt-glow {
  position: absolute; inset: -8px; border-radius: 14px;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--lt-c) 32%, transparent), transparent 70%);
  z-index: -1;
  opacity: 0;
  transition: opacity .22s var(--leave-ease);
}
.lt-wrap:hover .lt-glow { opacity: 1; }
.lt-icon { display: inline-flex; }

/* Ambient loops — subtle, 2.4–3s */
.lt-wrap.ambient .lt-icon { animation: lt-bob 3s ease-in-out infinite; }
@keyframes lt-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
.lt-wrap.ambient .lt-glow {
  opacity: 0.45;
  animation: leave-glow-breathe 3.4s ease-in-out infinite;
}
</style>
