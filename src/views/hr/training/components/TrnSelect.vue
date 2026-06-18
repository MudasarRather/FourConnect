<template>
  <div class="trn-select" :class="{ open, disabled }" ref="rootRef">
    <span v-if="label" class="ts-label">{{ label }}<i v-if="required" class="req">*</i></span>

    <button type="button" class="ts-trigger" ref="triggerRef" :disabled="disabled"
      :aria-expanded="open" aria-haspopup="listbox" @click="toggle" @keydown="onTriggerKey">
      <span v-if="selected?.dot" class="ts-dot" :style="{ '--c': selected.dot }" aria-hidden="true" />
      <component v-if="selected?.icon" :is="selected.icon" :size="15" class="ts-ic" />
      <span class="ts-val" :class="{ placeholder: !selected }">{{ selected ? selected.label : placeholder }}</span>
      <Motion as="span" class="ts-chev" aria-hidden="true"
        :animate="{ rotate: open ? 180 : 0 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <ChevronDown :size="15" />
      </Motion>
    </button>

    <Teleport to="body">
      <Presence>
        <Motion v-if="open" class="ts-pop" as="div" role="listbox" ref="popRef"
          :style="popStyle"
          :initial="{ opacity: 0, y: dropUp ? 8 : -8, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }"
          :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop @click.stop>
          <div v-if="searchable" class="ts-search">
            <Search :size="14" />
            <input ref="searchEl" v-model="query" :placeholder="searchPlaceholder" @keydown="onTriggerKey" />
          </div>
          <div class="ts-list">
            <Motion v-for="(o, i) in visibleOptions" :key="o.value" as="button" type="button"
              class="ts-opt" :class="{ active: o.value === modelValue, focus: i === focusIdx }"
              role="option" :aria-selected="o.value === modelValue"
              :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.2, delay: Math.min(i * 0.018, 0.16), ease: [0.16, 1, 0.3, 1] }"
              @mouseenter="focusIdx = i" @click="choose(o)">
              <span v-if="o.dot" class="ts-dot" :style="{ '--c': o.dot }" aria-hidden="true" />
              <component v-if="o.icon" :is="o.icon" :size="15" class="ts-ic" />
              <span class="ts-opt-label">{{ o.label }}<i v-if="o.hint" class="ts-opt-hint">{{ o.hint }}</i></span>
              <Check v-if="o.value === modelValue" :size="14" class="ts-check" />
            </Motion>
            <div v-if="!visibleOptions.length" class="ts-nomatch">No matches</div>
          </div>
        </Motion>
      </Presence>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { ChevronDown, Check, Search } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  // [string] OR [{ value, label?, dot?, hint?, icon? }]
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select…' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: 'Search…' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const normalized = computed(() => props.options.map(o => (
  typeof o === 'object'
    ? { value: o.value, label: o.label ?? String(o.value).replace(/_/g, ' '), dot: o.dot, hint: o.hint, icon: o.icon }
    : { value: o, label: String(o).replace(/_/g, ' ') }
)))
const selected = computed(() => normalized.value.find(o => o.value === props.modelValue) || null)

const query = ref('')
const visibleOptions = computed(() => {
  if (!props.searchable || !query.value.trim()) return normalized.value
  const q = query.value.trim().toLowerCase()
  return normalized.value.filter(o =>
    String(o.label).toLowerCase().includes(q) || (o.hint && String(o.hint).toLowerCase().includes(q)))
})

const rootRef = ref(null)
const triggerRef = ref(null)
const popRef = ref(null)
const searchEl = ref(null)
const open = ref(false)
const dropUp = ref(false)
const focusIdx = ref(-1)
const popStyle = ref({})

const recalc = () => {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const wantUp = below < 260 && r.top > below
  dropUp.value = wantUp
  const maxH = Math.min(300, Math.max(160, (wantUp ? r.top : below) - 16))
  popStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    maxHeight: `${maxH}px`,
    ...(wantUp ? { bottom: `${window.innerHeight - r.top + 6}px` } : { top: `${r.bottom + 6}px` }),
    zIndex: 2400,
  }
}

const onDocDown = (e) => {
  if (rootRef.value?.contains(e.target)) return
  // The popover is teleported to <body>; a motion-v component ref doesn't
  // reliably expose $el, so detect "inside the popover" via the DOM. Only the
  // open select renders a .ts-pop, so closest() can't match a different one.
  if (e.target?.closest?.('.ts-pop')) return
  close()
}
const onScroll = () => { if (open.value) recalc() }

const addListeners = () => {
  // Capture phase: the select is often used inside a modal whose panel stops
  // mousedown propagation (@mousedown.stop) to avoid backdrop-close — a bubble
  // listener would never fire, so the popover wouldn't close on outside clicks.
  document.addEventListener('mousedown', onDocDown, true)
  window.addEventListener('resize', recalc)
  window.addEventListener('scroll', onScroll, true)
}
const removeListeners = () => {
  document.removeEventListener('mousedown', onDocDown, true)
  window.removeEventListener('resize', recalc)
  window.removeEventListener('scroll', onScroll, true)
}

const openMenu = async () => {
  if (props.disabled) return
  query.value = ''
  open.value = true
  focusIdx.value = Math.max(0, visibleOptions.value.findIndex(o => o.value === props.modelValue))
  await nextTick()
  recalc()
  addListeners()
  // preventScroll: the popover is teleported to <body> and only becomes
  // position:fixed once recalc() flushes; focusing it without this flag makes
  // the browser scroll the page to the not-yet-pinned input.
  if (props.searchable) searchEl.value?.focus({ preventScroll: true })
}
const close = () => { open.value = false; removeListeners() }
const toggle = () => (open.value ? close() : openMenu())

const choose = (o) => {
  emit('update:modelValue', o.value)
  emit('change', o.value)
  close()
}

watch(query, () => { focusIdx.value = 0 })

const onTriggerKey = (e) => {
  // open on Enter/Arrow when closed (space stays typeable inside the search box)
  if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
    if (!open.value) { e.preventDefault(); openMenu(); return }
  }
  if (!open.value) return
  if (e.key === 'Escape') { close(); return }
  const n = visibleOptions.value.length
  if (!n) return
  if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx.value = (focusIdx.value + 1) % n }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx.value = (focusIdx.value - 1 + n) % n }
  else if (e.key === 'Enter') {
    e.preventDefault()
    const o = visibleOptions.value[focusIdx.value]
    if (o) choose(o)
  }
}

onBeforeUnmount(removeListeners)
</script>

<style scoped>
.trn-select { display: flex; flex-direction: column; gap: 6px; position: relative; }
.ts-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.ts-label .req { color: var(--trn-st-failed); margin-left: 2px; font-style: normal; }

.ts-trigger {
  display: flex; align-items: center; gap: 8px; width: 100%; font: inherit; font-size: 13.5px;
  padding: 9px 12px; border-radius: 11px; cursor: pointer; text-align: left;
  color: var(--trn-text); background: var(--trn-surface); border: 1px solid var(--trn-border-soft);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.ts-trigger:hover:not(:disabled) { border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); }
.trn-select.open .ts-trigger {
  border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent);
}
.ts-trigger:disabled { opacity: 0.55; cursor: not-allowed; }
.ts-val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: capitalize; }
.ts-val.placeholder { color: var(--trn-text-dim); text-transform: none; }
.ts-ic { color: var(--trn-amber-strong); flex-shrink: 0; }
.ts-chev { display: inline-flex; color: var(--trn-text-muted); flex-shrink: 0; }
.ts-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--c, var(--trn-amber)); box-shadow: 0 0 7px var(--c, var(--trn-amber)); }
</style>

<!-- Popover lives at <body> (teleported) — styles must be global to reach it. -->
<style>
.ts-pop {
  /* Always fixed (coords come from inline popStyle after recalc) so the teleported
     popover never lays out in <body> flow on first open — which extended the page
     and made focus()/click scroll-jump. No top/left here: inline sets either top
     (drop-down) or bottom (drop-up), so a base top:0 would stretch the drop-up box. */
  position: fixed;
  display: flex; flex-direction: column; gap: 4px; padding: 6px; overflow: hidden;
  border-radius: 14px; border: 1px solid var(--trn-border-strong);
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  box-shadow: var(--trn-glass-shadow); transform-origin: top center;
}
.ts-search { display: flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 0 9px; border-radius: 9px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted); }
.ts-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 8px 0; color: var(--trn-text); font: inherit; font-size: 13px; }
.ts-search input:focus { outline: none; }
.ts-list { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; min-height: 0; }
.ts-nomatch { padding: 14px 10px; text-align: center; font-size: 12px; color: var(--trn-text-dim); }
.ts-opt {
  display: flex; align-items: center; gap: 9px; width: 100%; font: inherit; font-size: 13px; font-weight: 500;
  padding: 9px 10px; border-radius: 10px; cursor: pointer; text-align: left; border: 0;
  color: var(--trn-text-secondary); background: transparent; transition: background 0.16s, color 0.16s;
}
.ts-opt.focus { background: color-mix(in srgb, var(--trn-amber) 12%, transparent); color: var(--trn-text); }
.ts-opt.active { color: var(--trn-amber-strong); font-weight: 700; }
.ts-opt-label { flex: 1; min-width: 0; text-transform: capitalize; display: flex; flex-direction: column; gap: 1px; }
.ts-opt-hint { font-size: 10.5px; font-weight: 500; color: var(--trn-text-dim); text-transform: none; font-style: normal; }
.ts-opt .ts-check { color: var(--trn-amber); flex-shrink: 0; }
.ts-opt .ts-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--c, var(--trn-amber)); box-shadow: 0 0 7px var(--c, var(--trn-amber)); }
.ts-opt .ts-ic { color: var(--trn-amber-strong); flex-shrink: 0; }
</style>
