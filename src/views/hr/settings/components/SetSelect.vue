<template>
  <div class="ss" ref="rootEl" :class="{ open, disabled }" :style="{ '--acc': accentColor }">
    <button type="button" class="ss-trigger" :disabled="disabled" @click="toggle">
      <span class="ss-trigger-face">
        <span v-if="selected?.dot" class="ss-dot" :style="{ background: selected.dot }" />
        <component v-if="selected?.icon" :is="selected.icon" :size="14" class="ss-trigger-ic" />
        <span class="ss-trigger-lab" :class="{ ph: !selected }">{{ selected ? selected.label : placeholder }}</span>
      </span>
      <ChevronDown :size="15" class="ss-chev" :class="{ flip: open }" />
    </button>

    <teleport to="body">
      <Presence>
        <Motion v-if="open" key="pop" as="div" class="ss-pop" ref="popEl"
          :style="popStyle" @mousedown.stop
          :initial="{ opacity: 0, y: -8, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: -6, scale: 0.98 }" :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }">
          <span class="ss-pop-edge" aria-hidden="true" />
          <ul class="ss-list" role="listbox">
            <Motion v-for="(o, i) in options" :key="o.value" as="li" role="option"
              class="ss-opt" :class="{ sel: o.value === modelValue }"
              :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.26, delay: 0.02 + i * 0.03, ease: [0.16, 1, 0.3, 1] }"
              @click="choose(o)">
              <span v-if="o.dot" class="ss-dot" :style="{ background: o.dot }" />
              <component v-if="o.icon" :is="o.icon" :size="14" class="ss-opt-ic" />
              <span class="ss-opt-body">
                <span class="ss-opt-lab">{{ o.label }}</span>
                <span v-if="o.hint" class="ss-opt-hint">{{ o.hint }}</span>
              </span>
              <Check v-if="o.value === modelValue" :size="14" class="ss-opt-check" />
            </Motion>
          </ul>
        </Motion>
      </Presence>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: null },
  options: { type: Array, default: () => [] },     // [{ value, label, icon?, dot?, hint? }]
  placeholder: { type: String, default: 'Select…' },
  accentColor: { type: String, default: 'var(--set-gold)' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const rootEl = ref(null)
const popEl = ref(null)
const open = ref(false)
const popStyle = ref({})

const selected = computed(() => props.options.find(o => o.value === props.modelValue) || null)

function place() {
  const t = rootEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const openUp = below < 240 && r.top > below
  popStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    ...(openUp ? { bottom: `${window.innerHeight - r.top + 6}px` } : { top: `${r.bottom + 6}px` }),
    zIndex: 5200,
  }
}
function onScroll() { if (open.value) place() }
function onDocDown(e) {
  if (rootEl.value?.contains(e.target)) return
  const pop = popEl.value?.$el || popEl.value
  if (pop?.contains?.(e.target)) return
  close()
}
function onKey(e) { if (e.key === 'Escape') close() }

function bind() {
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
  document.addEventListener('mousedown', onDocDown)
  document.addEventListener('keydown', onKey)
}
function unbind() {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
  document.removeEventListener('mousedown', onDocDown)
  document.removeEventListener('keydown', onKey)
}
function toggle() { if (props.disabled) return; open.value ? close() : openMenu() }
function openMenu() { place(); open.value = true; bind() }
function close() { open.value = false; unbind() }
function choose(o) { emit('update:modelValue', o.value); close() }

onBeforeUnmount(unbind)
</script>

<style scoped>
.ss { position: relative; width: 100%; }
.ss-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  height: var(--hr-input-height, 42px); padding: 0 12px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 13px;
  color: var(--hr-input-text, var(--set-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border);
  transition: border-color 0.2s var(--set-spring), background 0.2s var(--set-spring), box-shadow 0.25s var(--set-spring); }
.ss-trigger:hover:not(:disabled) { border-color: var(--hr-input-border-hover, var(--set-border-strong)); background: var(--hr-input-bg-hover, var(--hr-input-bg)); }
.ss.open .ss-trigger { border-color: color-mix(in srgb, var(--acc) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 14%, transparent), 0 0 24px -10px var(--acc); }
.ss-trigger:disabled { opacity: 0.55; cursor: not-allowed; }
.ss-trigger-face { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.ss-trigger-ic { color: var(--acc); flex-shrink: 0; }
.ss-trigger-lab { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.ss-trigger-lab.ph { color: var(--hr-input-placeholder, var(--set-text-dim)); font-weight: 500; }
.ss-chev { color: var(--set-text-muted); flex-shrink: 0; transition: transform 0.28s var(--set-spring), color 0.2s; }
.ss-chev.flip { transform: rotate(180deg); color: var(--acc); }
.ss-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
</style>

<style>
/* Teleported popover — unscoped (lives on <body>, above the modal overlay). */
.ss-pop { --acc: var(--set-gold); position: relative; overflow: hidden; padding: 6px; border-radius: 14px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border-strong);
  box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.86), 0 0 0 1px color-mix(in srgb, var(--acc) 10%, transparent);
  backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); max-height: 280px; overflow-y: auto; }
.ss-pop-edge { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--acc), transparent); }
.ss-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.ss-opt { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 10px; cursor: pointer;
  color: var(--set-text-secondary); transition: background 0.16s, color 0.16s; }
.ss-opt:hover { background: color-mix(in srgb, var(--acc) 12%, transparent); color: var(--set-text); }
.ss-opt.sel { background: color-mix(in srgb, var(--acc) 14%, transparent); color: var(--set-text); }
.ss-opt-ic { color: var(--acc); flex-shrink: 0; }
.ss-opt-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ss-opt-lab { font-size: 13px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ss-opt-hint { font-size: 10.5px; color: var(--set-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ss-opt-check { color: var(--acc); flex-shrink: 0; }
.ss-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
</style>
