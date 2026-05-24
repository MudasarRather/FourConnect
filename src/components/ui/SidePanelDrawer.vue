<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isOpen"
        class="spd-overlay"
        @click.self="onClose"
        @keydown.esc="onClose"
      >
        <Transition name="drawer-slide" appear>
          <aside v-if="isOpen" class="spd-panel" :style="panelStyle" @click.stop>
            <header class="spd-header">
              <div class="spd-header__top">
                <div class="spd-id-badge" v-if="subtitle">
                  <span class="spd-id-badge__label">REF</span>
                  <span class="spd-id-badge__value">{{ subtitle }}</span>
                </div>
                <div class="spd-header__actions">
                  <slot name="header-actions"></slot>
                  <button
                    class="spd-close"
                    @click="onClose"
                    :aria-label="'Close ' + (title || 'panel')"
                  >
                    <X :size="16" />
                  </button>
                </div>
              </div>
              <div class="spd-header__main">
                <div class="spd-icon" v-if="$slots.icon || icon">
                  <slot name="icon">
                    <component :is="icon" v-if="icon" :size="18" />
                  </slot>
                </div>
                <div class="spd-title-wrap">
                  <h2 class="spd-title">{{ title || ' ' }}</h2>
                  <p v-if="metaLine" class="spd-meta">{{ metaLine }}</p>
                </div>
                <div class="spd-status" v-if="$slots.status">
                  <slot name="status"></slot>
                </div>
              </div>
            </header>

            <div class="spd-body custom-scroll">
              <slot></slot>
            </div>

            <footer v-if="$slots.footer" class="spd-footer">
              <slot name="footer"></slot>
            </footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  isOpen:   { type: Boolean, required: true },
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  metaLine: { type: String, default: '' },
  width:    { type: [Number, String], default: 540 },
  icon:     { type: [Object, Function], default: null },
  closeOnEscape: { type: Boolean, default: true }
})
const emit = defineEmits(['close', 'update:isOpen'])

const onClose = () => {
  emit('close')
  emit('update:isOpen', false)
}

const panelStyle = computed(() => {
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width
  return { maxWidth: w }
})

// Lock body scroll while open + ESC handling
const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.isOpen && props.closeOnEscape) onClose()
}
const lockScroll = (lock) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = lock ? 'hidden' : ''
}
watch(() => props.isOpen, (v) => lockScroll(v), { immediate: true })
onMounted(() => { document.addEventListener('keydown', onKeyDown) })
onUnmounted(() => { document.removeEventListener('keydown', onKeyDown); lockScroll(false) })
</script>

<style scoped>
.spd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.40);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.spd-panel {
  width: 100%;
  height: 100%;
  background: rgba(20, 18, 14, 0.62);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border-left: 1px solid rgba(245, 158, 11, 0.16);
  box-shadow: -18px 0 60px rgba(0, 0, 0, 0.55), inset 1px 0 0 rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.spd-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 100% 0%, rgba(245, 158, 11, 0.10), transparent 55%),
              radial-gradient(ellipse at 0% 100%, rgba(249, 115, 22, 0.06), transparent 55%);
  pointer-events: none;
}

/* ===== Header ===== */
.spd-header {
  padding: 22px 28px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.04), transparent);
  position: relative;
}
.spd-header__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.spd-id-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(245, 158, 11, 0.18);
}
.spd-id-badge__label {
  font: 700 9px/1 'Inter', sans-serif;
  color: rgba(251, 191, 36, 0.65);
  letter-spacing: 0.12em;
}
.spd-id-badge__value {
  font: 600 11px/1 ui-monospace, 'SF Mono', monospace;
  color: #fbbf24;
  letter-spacing: 0.04em;
}
.spd-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.spd-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.spd-close:hover {
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.30);
  color: #fbbf24;
}

.spd-header__main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.spd-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(249, 115, 22, 0.10));
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #fde68a;
  flex-shrink: 0;
}
.spd-title-wrap {
  flex: 1;
  min-width: 0;
}
.spd-title {
  font-family: 'Outfit', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spd-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.50);
}
.spd-status {
  flex-shrink: 0;
}

/* ===== Body ===== */
.spd-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px 28px;
  scroll-behavior: smooth;
  position: relative;
}
.spd-body.custom-scroll::-webkit-scrollbar { width: 6px; }
.spd-body.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.spd-body.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.18);
  border-radius: 10px;
}
.spd-body.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.32); }

/* ===== Footer ===== */
.spd-footer {
  padding: 16px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* ===== Transitions ===== */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.32s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
  opacity: 0.6;
}

/* ===== Responsive ===== */
@media (max-width: 720px) {
  .spd-panel { max-width: 100% !important; }
}

/* ─── Light theme overrides ─────────────────────────────────────────────── */
[data-theme="light"] .spd-overlay {
  background: rgba(26, 20, 16, 0.40);
}
[data-theme="light"] .spd-panel {
  background: rgba(255, 250, 240, 0.62);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border-left: 1px solid rgba(217, 119, 6, 0.22);
  box-shadow: -18px 0 60px rgba(40, 25, 10, 0.22), inset 1px 0 0 rgba(255, 255, 255, 0.5);
  color: var(--text-primary);
}
[data-theme="light"] .spd-panel::before {
  background: radial-gradient(ellipse at 100% 0%, rgba(217, 119, 6, 0.12), transparent 55%),
              radial-gradient(ellipse at 0% 100%, rgba(249, 115, 22, 0.08), transparent 55%);
}
[data-theme="light"] .spd-title { color: var(--text-primary); }
[data-theme="light"] .spd-meta { color: var(--text-secondary); }
[data-theme="light"] .spd-id-badge {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .spd-id-badge__label { color: #b45309; }
[data-theme="light"] .spd-id-badge__value { color: #92400e; }
[data-theme="light"] .spd-icon {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(249, 115, 22, 0.12));
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
}
[data-theme="light"] .spd-close {
  background: rgba(255, 250, 240, 0.50);
  border-color: rgba(40, 25, 10, 0.10);
  color: #6b5840;
}
[data-theme="light"] .spd-close:hover {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.36);
  color: #92400e;
}
[data-theme="light"] .spd-header {
  border-bottom-color: rgba(40, 25, 10, 0.10);
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.06), transparent);
}
[data-theme="light"] .spd-footer {
  border-top-color: rgba(40, 25, 10, 0.10);
  background: rgba(255, 250, 240, 0.30);
}
[data-theme="light"] .spd-body.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .spd-body.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(217, 119, 6, 0.50);
}
</style>
