<template>
  <button
    ref="btnRef"
    type="button"
    class="theme-toggle"
    :class="{ 'is-light': !isDark }"
    :aria-label="label"
    :title="label"
    data-theme-toggle
    @click="onClick"
  >
    <span class="tt-disc">
      <Sun v-if="!isDark" :size="14" class="tt-icon tt-sun" />
      <Moon v-else :size="14" class="tt-icon tt-moon" />
    </span>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '../../composables/useTheme'

const { isDark, toggle } = useTheme()
const btnRef = ref(null)

const label = computed(() => isDark.value ? 'Switch to light theme' : 'Switch to dark theme')

function onClick() {
  toggle(btnRef.value)
}
</script>

<style scoped>
.theme-toggle {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--input-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--input-border, rgba(255, 255, 255, 0.10));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 220ms var(--ease, cubic-bezier(0.16, 1, 0.3, 1)),
    border-color 220ms var(--ease, cubic-bezier(0.16, 1, 0.3, 1)),
    transform 180ms var(--ease, cubic-bezier(0.16, 1, 0.3, 1)),
    box-shadow 220ms var(--ease, cubic-bezier(0.16, 1, 0.3, 1));
  color: var(--text-primary, #fff);
  outline: none;
  view-transition-name: theme-toggle;
}

.theme-toggle:hover {
  border-color: var(--input-focus, #f59e0b);
  background: var(--input-bg-focus, rgba(255, 255, 255, 0.08));
  transform: translateY(-1px);
  box-shadow:
    0 6px 18px -10px rgba(245, 158, 11, 0.55),
    0 0 0 1px rgba(245, 158, 11, 0.18);
}
.theme-toggle:active { transform: translateY(0); }

.theme-toggle:focus-visible {
  box-shadow: 0 0 0 2px var(--bg-color, #000),
              0 0 0 4px var(--input-focus, #f59e0b);
}

.tt-disc {
  position: relative;
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: inherit;
}

.tt-icon {
  position: absolute;
  inset: 0;
  margin: auto;
  transition:
    transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 240ms ease;
}

.tt-moon { color: var(--accent-gold, #ffb900); }
.tt-sun  { color: var(--accent-gold, #d97706); }

/* Enter animation when icon swaps — only triggers on the icon visible after click */
.theme-toggle .tt-icon {
  animation: tt-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes tt-pop {
  0%   { transform: rotate(-90deg) scale(0.4); opacity: 0; }
  60%  { transform: rotate(8deg) scale(1.08); opacity: 1; }
  100% { transform: rotate(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .tt-icon { animation: none; }
  .theme-toggle:hover { transform: none; }
}
</style>
