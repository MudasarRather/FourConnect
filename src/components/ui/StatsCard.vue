<template>
  <div class="stats-card">
    <div class="card-content">
      <div class="icon-wrapper">
        <slot name="icon"></slot>
      </div>
      <div class="info-wrapper">
        <span class="card-value">{{ value }}</span>
        <span class="card-label">{{ label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true }
})
</script>

<style scoped>
.stats-card {
  position: relative;
  background: rgba(30, 30, 35, 0.6); /* Semi-transparent dark */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08); /* Subtle border */
  border-radius: 20px; /* Apple-style rounded corners */
  padding: 20px; /* Reduced from 24px */
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.stats-card:hover {
  transform: translateY(-4px) scale(1.02);
  background: rgba(40, 40, 45, 0.7);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.12);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 16px; /* Reduced gap */
  position: relative;
  z-index: 1;
}

.icon-wrapper {
  width: 48px; /* Reduced from 56px */
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f5f5f7;
  font-size: 20px; /* Reduced from 24px */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.stats-card:hover .icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.info-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #f5f5f7;
  letter-spacing: -0.02em;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.1;
}

.card-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
