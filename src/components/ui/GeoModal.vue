<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-backdrop" @click.self="close">
        <Transition name="panel">
          <div v-if="modelValue" class="modal-panel" :class="position">
            <!-- Panel Header -->
            <div class="panel-header">
              <div class="header-content">
                <div class="header-icon" :style="{ background: iconBg }">
                  <slot name="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                  </slot>
                </div>
                <div class="header-text">
                  <h2>{{ title }}</h2>
                  <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
                </div>
              </div>
              <button class="close-btn" @click="close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- Panel Body -->
            <div class="panel-body">
              <slot></slot>
            </div>

            <!-- Panel Footer -->
            <div v-if="$slots.footer" class="panel-footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Details' },
  subtitle: { type: String, default: '' },
  position: { type: String, default: 'right' }, // 'right', 'left', 'center'
  iconBg: { type: String, default: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' },
  width: { type: String, default: '480px' }
})

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
}

/* Geometric Background */
.modal-geo-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.geo-line {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
  animation: lineSweep 3s ease-in-out infinite;
}

.line-1 {
  top: 20%;
  left: 0;
  width: 60%;
  animation-delay: 0s;
}

.line-2 {
  top: 50%;
  right: 0;
  width: 40%;
  animation-delay: -1s;
}

.line-3 {
  bottom: 30%;
  left: 10%;
  width: 50%;
  animation-delay: -2s;
}

@keyframes lineSweep {
  0%, 100% { opacity: 0; transform: scaleX(0); }
  50% { opacity: 1; transform: scaleX(1); }
}

.geo-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(139, 92, 246, 0.2);
  animation: circleExpand 4s ease-out infinite;
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: 10%;
  right: 30%;
  animation-delay: -2s;
}

@keyframes circleExpand {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 0.5; }
  100% { opacity: 0; transform: scale(1.5); }
}

/* Modal Panel */
.modal-panel {
  width: v-bind(width); /* Dynamic width */
  max-width: 90vw;
  height: 100%;
  background: linear-gradient(180deg, #141417 0%, #0f0f12 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.modal-panel.left {
  margin-right: auto;
  border-left: none;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-panel.center {
  margin: auto;
  max-height: 90vh;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Panel Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08); /* Added border */
}

.header-text h2 {
  font-size: 18px;
  font-weight: 700;
  color: #f5f5f7;
  margin-bottom: 4px;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1); /* Added border */
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: rotate(90deg);
}

/* Panel Body */
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Panel Footer */
.panel-footer {
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.panel-enter-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.modal-panel.right.panel-enter-from,
.modal-panel.right.panel-leave-to {
  transform: translateX(100%);
}

.modal-panel.left.panel-enter-from,
.modal-panel.left.panel-leave-to {
  transform: translateX(-100%);
}

.modal-panel.center.panel-enter-from,
.modal-panel.center.panel-leave-to {
  transform: scale(0.9) translateY(20px);
}

/* Scrollbar */
.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
