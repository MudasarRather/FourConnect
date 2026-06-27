<template>
  <div class="sd-select" ref="triggerRef">
    <button
      type="button"
      class="sd-select-btn"
      :class="{ open, disabled }"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="sd-select-val" :class="{ placeholder: !selected }">
        {{ selected ? selected.label : placeholder }}
      </span>
      <ChevronDown :size="15" class="sd-select-chev" :class="{ open }" />
    </button>

    <Teleport to="body">
      <Motion
        v-if="open"
        class="sd-select-pop"
        :style="popStyle"
        :initial="{ opacity: 0, y: -6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }"
        @mousedown.stop
        @click.stop
      >
        <button
          v-for="opt in normalized"
          :key="opt.value"
          type="button"
          class="sd-select-opt"
          :class="{ active: opt.value === modelValue }"
          @click="pick(opt.value)"
        >
          <span class="opt-label">{{ opt.label }}</span>
          <Check v-if="opt.value === modelValue" :size="14" class="opt-check" />
        </button>
        <p v-if="!normalized.length" class="sd-select-empty">No options</p>
      </Motion>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select…' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const triggerRef = ref(null)
const open = ref(false)
const popStyle = ref({})

const normalized = computed(() => props.options.map(o =>
  (typeof o === 'object' ? { value: o.value, label: o.label ?? String(o.value) } : { value: o, label: String(o) })
))
const selected = computed(() => normalized.value.find(o => o.value === props.modelValue) || null)

const recalc = () => {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  popStyle.value = {
    position: 'fixed',
    top: `${r.bottom + 6}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    zIndex: 3000,
  }
}

const onOutside = (e) => {
  if (triggerRef.value && !triggerRef.value.contains(e.target)) close()
}
const onScrollResize = () => { if (open.value) recalc() }

const addListeners = () => {
  window.addEventListener('mousedown', onOutside)
  window.addEventListener('resize', onScrollResize)
  window.addEventListener('scroll', onScrollResize, true)
}
const removeListeners = () => {
  window.removeEventListener('mousedown', onOutside)
  window.removeEventListener('resize', onScrollResize)
  window.removeEventListener('scroll', onScrollResize, true)
}

const toggle = () => {
  if (props.disabled) return
  open.value ? close() : openMenu()
}
const openMenu = () => {
  open.value = true
  nextTick(recalc)
  addListeners()
}
const close = () => {
  open.value = false
  removeListeners()
}
const pick = (v) => {
  emit('update:modelValue', v)
  close()
}
onBeforeUnmount(removeListeners)
</script>

<style scoped>
.sd-select { position: relative; width: 100%; }
.sd-select-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 11px 13px; border-radius: 11px;
  background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border-strong);
  color: var(--sd-text);
  font-size: 14px; cursor: pointer;
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring);
}
.sd-select-btn:hover { border-color: var(--sd-amber-border); }
.sd-select-btn.open { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-select-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.sd-select-val { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-select-val.placeholder { color: var(--sd-text-dim); }
.sd-select-chev { color: var(--sd-text-muted); transition: transform 0.25s var(--sd-spring); }
.sd-select-chev.open { transform: rotate(180deg); }
</style>

<!-- Popover is teleported to <body>; its styles must be global (unscoped). -->
<style>
.sd-select-pop {
  background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border-strong);
  border-radius: 12px;
  box-shadow: var(--sd-shadow);
  padding: 6px;
  max-height: 280px; overflow-y: auto;
}
.sd-select-opt {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 11px; border-radius: 8px;
  background: transparent; border: none; cursor: pointer;
  color: var(--sd-text-secondary); font-size: 13.5px; text-align: left;
  transition: background 0.15s, color 0.15s;
}
.sd-select-opt:hover { background: var(--sd-amber-soft); color: var(--sd-text); }
.sd-select-opt.active { color: var(--sd-amber); font-weight: 600; }
.sd-select-opt .opt-check { color: var(--sd-amber); }
.sd-select-empty { padding: 12px; text-align: center; color: var(--sd-text-dim); font-size: 12.5px; margin: 0; }
</style>
