<template>
  <div class="sd-select" ref="triggerRef">
    <button
      type="button"
      class="sd-select-btn"
      :class="{ open, disabled }"
      :disabled="disabled"
      @click="toggle"
    >
      <span v-if="selected && (selected.icon || selected.dot)" class="sd-select-lead" :style="selected.dot ? { '--dot': selected.dot } : null">
        <component v-if="selected.icon" :is="selected.icon" :size="15" />
        <span v-else class="sd-select-dot" />
      </span>
      <span class="sd-select-val" :class="{ placeholder: !selected }">
        {{ selected ? selected.label : placeholder }}
      </span>
      <ChevronDown :size="15" class="sd-select-chev" :class="{ open }" />
    </button>

    <Teleport to="body">
      <Presence>
        <Motion
          v-if="open"
          class="sd-select-pop sd-grain"
          :style="popStyle"
          :initial="{ opacity: 0, y: -8, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: -6, scale: 0.98 }"
          :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop
          @click.stop
        >
          <button
            v-for="(opt, i) in normalized"
            :key="opt.value"
            type="button"
            class="sd-select-opt"
            :class="{ active: opt.value === modelValue }"
            :style="{ '--i': i, '--dot': opt.dot || 'var(--sd-amber)' }"
            @click="pick(opt.value)"
          >
            <span v-if="opt.icon || opt.dot" class="opt-lead">
              <component v-if="opt.icon" :is="opt.icon" :size="15" />
              <span v-else class="opt-dot" />
            </span>
            <span class="opt-body">
              <span class="opt-label">{{ opt.label }}</span>
              <span v-if="opt.desc" class="opt-desc">{{ opt.desc }}</span>
            </span>
            <Check v-if="opt.value === modelValue" :size="14" class="opt-check" />
          </button>
          <p v-if="!normalized.length" class="sd-select-empty">No options</p>
        </Motion>
      </Presence>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
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
  (typeof o === 'object'
    ? { value: o.value, label: o.label ?? String(o.value), icon: o.icon || null, dot: o.dot || null, desc: o.desc || null }
    : { value: o, label: String(o), icon: null, dot: null, desc: null })
))
const selected = computed(() => normalized.value.find(o => o.value === props.modelValue) || null)

const recalc = () => {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  // Flip above if there isn't room below (keeps long menus on-screen).
  const below = window.innerHeight - r.bottom
  const openUp = below < 260 && r.top > below
  popStyle.value = {
    position: 'fixed',
    [openUp ? 'bottom' : 'top']: `${openUp ? (window.innerHeight - r.top + 6) : (r.bottom + 6)}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    zIndex: 5200,
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
  display: flex; align-items: center; gap: 9px;
  padding: 11px 13px; border-radius: 12px;
  background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border-strong);
  color: var(--sd-text);
  font-size: 14px; cursor: pointer; font-family: inherit;
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring), background 0.2s;
}
.sd-select-btn:hover { border-color: var(--sd-amber-border); background: var(--sd-surface); }
.sd-select-btn.open { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-select-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.sd-select-lead { display: inline-grid; place-items: center; flex-shrink: 0; color: var(--sd-amber); }
.sd-select-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--dot, var(--sd-amber)); box-shadow: 0 0 8px color-mix(in srgb, var(--dot, var(--sd-amber)) 60%, transparent); }
.sd-select-val { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-select-val.placeholder { color: var(--sd-text-dim); }
.sd-select-chev { flex-shrink: 0; color: var(--sd-text-muted); transition: transform 0.25s var(--sd-spring); }
.sd-select-chev.open { transform: rotate(180deg); }
</style>

<!-- Popover is teleported to <body>; its styles must be global (unscoped). -->
<style>
.sd-select-pop {
  position: relative;
  background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border-strong);
  border-radius: 14px;
  box-shadow: var(--sd-shadow);
  padding: 6px;
  max-height: 300px; overflow-y: auto;
  backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%);
}
.sd-select-pop::before { opacity: 0.5; }
.sd-select-opt {
  position: relative;
  width: 100%;
  display: flex; align-items: center; gap: 10px;
  padding: 9px 11px; border-radius: 10px;
  background: transparent; border: none; cursor: pointer;
  color: var(--sd-text-secondary); font-size: 13.5px; text-align: left; font-family: inherit;
  transition: background 0.16s, color 0.16s, transform 0.16s var(--sd-spring);
  animation: sd-opt-in 0.32s var(--sd-spring) both;
  animation-delay: calc(var(--i, 0) * 0.022s);
}
.sd-select-opt:hover { background: color-mix(in srgb, var(--dot, var(--sd-amber)) 13%, transparent); color: var(--sd-text); transform: translateX(2px); }
.sd-select-opt.active { color: var(--sd-text); background: color-mix(in srgb, var(--dot, var(--sd-amber)) 9%, transparent); font-weight: 600; }
.sd-select-opt .opt-lead { display: inline-grid; place-items: center; flex-shrink: 0; width: 18px; color: var(--dot, var(--sd-amber)); }
.sd-select-opt .opt-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--dot, var(--sd-amber)); box-shadow: 0 0 8px color-mix(in srgb, var(--dot, var(--sd-amber)) 55%, transparent); }
.sd-select-opt .opt-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.sd-select-opt .opt-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-select-opt .opt-desc { font-size: 11px; color: var(--sd-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-select-opt .opt-check { flex-shrink: 0; color: var(--dot, var(--sd-amber)); }
.sd-select-empty { padding: 12px; text-align: center; color: var(--sd-text-dim); font-size: 12.5px; margin: 0; }
@keyframes sd-opt-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sd-select-opt { animation: none; }
}
</style>
