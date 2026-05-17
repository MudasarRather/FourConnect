<template>
  <div
    class="hr-skeleton hr-animate"
    :style="{ width, height, borderRadius: radius }"
    :class="{ 'is-pill': pill }"
  />
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '16px' },
  radius: { type: String, default: '8px' },
  pill: { type: Boolean, default: false },
})
</script>

<style scoped>
.hr-skeleton {
  display: inline-block;
  background:
    linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.10) 50%,
      rgba(255, 255, 255, 0.04) 100%
    );
  background-size: 200% 100%;
  animation: hr-shimmer 1.4s linear infinite;
}
.hr-skeleton.is-pill {
  border-radius: 999px;
}
</style>
