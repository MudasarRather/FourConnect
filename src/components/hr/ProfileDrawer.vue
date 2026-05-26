<template>
  <Teleport to="body">
    <transition name="drawer-backdrop">
      <div v-if="modelValue" class="drawer-backdrop" @click.self="onBackdropClick" />
    </transition>
    <transition name="drawer-slide">
      <aside
        v-if="modelValue"
        ref="drawerRef"
        class="drawer"
        :class="{ wide }"
        role="dialog"
        :aria-label="ariaLabel"
        aria-modal="true"
      >
        <slot />
      </aside>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useEscape } from '../../composables/useEscape'
import { useFocusTrap } from '../../composables/useFocusTrap'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  ariaLabel: { type: String, default: 'Details' },
  closeOnBackdrop: { type: Boolean, default: true },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'close'])

const drawerRef = ref(null)
const { activate, deactivate } = useFocusTrap(drawerRef)

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

useEscape(() => close(), { enabled: () => props.modelValue })

const onBackdropClick = () => {
  if (props.closeOnBackdrop) close()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick()
      activate()
      document.body.style.overflow = 'hidden'
    } else {
      deactivate()
      document.body.style.overflow = ''
    }
  }
)
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 8, 10, 0.35);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  z-index: 1100;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 520px;
  max-width: 100vw;
  background: rgba(15, 15, 17, 0.62);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -32px 0 80px -20px rgba(0, 0, 0, 0.55);
  z-index: 1101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(38px) saturate(170%);
  -webkit-backdrop-filter: blur(38px) saturate(170%);
}
.drawer.wide { width: 680px; }

/* Backdrop fade */
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.28s var(--hr-spring);
}
.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to { opacity: 0; }

/* Slide-in */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.32s var(--hr-spring), opacity 0.32s var(--hr-spring);
}
.drawer-slide-enter-from {
  transform: translateX(110%);
  opacity: 0;
}
.drawer-slide-leave-to {
  transform: translateX(110%);
  opacity: 0;
}

@media (max-width: 640px) {
  .drawer, .drawer.wide { width: 100vw; }
}

/* ═════════ LIGHT THEME OVERRIDES — warm cream frosted surface ═════════ */
[data-theme="light"] .drawer-backdrop {
  background: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .drawer {
  background: rgba(255, 250, 240, 0.72);
  border-left-color: rgba(40, 25, 10, 0.14);
  box-shadow: -32px 0 80px -20px rgba(40, 25, 10, 0.28);
}
</style>
