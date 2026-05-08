<template>
  <div class="dashboard-separator">
    <div class="line"></div>
    <div class="sep-pill" v-if="icon || label">
      <component :is="icon" v-if="icon" :size="14" class="sep-icon" />
      <span v-if="label" class="sep-label">{{ label }}</span>
    </div>
    <div class="line"></div>
  </div>
</template>

<script setup>
defineProps({
  icon: [Object, Function],
  label: String
})
</script>

<style scoped>
.dashboard-separator {
  display: flex; align-items: center; justify-content: center;
  gap: 0; /* Pill handles spacing logic via borders/margins if needed, but flex gap is cleaner. */
  gap: 16px;
  margin: 40px 0;
  width: 100%;
}

.line {
  height: 1px; flex: 1;
  background: rgba(255, 255, 255, 0.1); /* Solid, no gradient */
}

.sep-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03); /* Glassy pill */
  color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
}

.sep-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
}
</style>
