<template>
  <div class="asel" :class="{ open }" ref="rootEl">
    <button type="button" class="asel-trigger" :class="{ open, placeholder: !selected }" @click="toggle"
      @keydown="onTriggerKey" :aria-expanded="open" aria-haspopup="listbox">
      <span v-if="selected && selected.dot" class="asel-dot" :style="{ background: selected.dot, boxShadow: `0 0 7px ${selected.dot}` }" />
      <component v-if="selected && selected.icon" :is="selected.icon" :size="15" class="asel-ic" :style="selected.accent ? { color: selected.accent } : null" />
      <span class="asel-val">{{ selected ? selected.label : placeholder }}</span>
      <ChevronDown :size="14" class="asel-caret" />
      <span class="asel-glow" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="asel-pop">
        <div v-if="open" class="asel-menu" :style="menuStyle" ref="menuEl" role="listbox"
          tabindex="-1" @mousedown.stop @click.stop @keydown="onMenuKey">
          <div v-if="showSearch" class="asel-search">
            <Search :size="13" />
            <input ref="searchEl" v-model="query" :placeholder="searchPlaceholder" type="text" @keydown="onMenuKey" />
          </div>
          <div class="asel-scroll">
            <button v-for="(o, i) in filtered" :key="o.value" type="button" class="asel-opt"
              :class="{ on: o.value === modelValue, active: i === activeIdx }" :style="{ '--i': i }"
              role="option" :aria-selected="o.value === modelValue"
              @click="pick(o)" @mousemove="activeIdx = i">
              <span v-if="o.dot" class="asel-opt-dot" :style="{ background: o.dot, boxShadow: `0 0 7px ${o.dot}` }" />
              <component v-if="o.icon" :is="o.icon" :size="15" class="asel-opt-ic" :style="o.accent ? { color: o.accent } : null" />
              <span class="asel-opt-lab">{{ o.label }}</span>
              <Check v-if="o.value === modelValue" :size="14" class="asel-opt-tick" />
            </button>
            <div v-if="!filtered.length" class="asel-empty"><SearchX :size="14" /> No matches</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { ChevronDown, Check, Search, SearchX } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: '' },
  options: { type: Array, default: () => [] },   // [{value,label,icon?,dot?,accent?}] | ['A','B']
  placeholder: { type: String, default: 'Select…' },
  // 'auto' (default) shows a filter box once the list grows past 8; true/false force it.
  searchable: { type: [Boolean, String], default: 'auto' },
  searchPlaceholder: { type: String, default: 'Search…' },
})
const emit = defineEmits(['update:modelValue'])

const rootEl = ref(null)
const menuEl = ref(null)
const searchEl = ref(null)
const open = ref(false)
const menuStyle = ref({})
const query = ref('')
const activeIdx = ref(0)

const normOptions = computed(() => props.options.map(o =>
  (o && typeof o === 'object') ? o : { value: o, label: String(o) }))
const selected = computed(() => normOptions.value.find(o => o.value === props.modelValue) || null)

const showSearch = computed(() =>
  props.searchable === true || (props.searchable === 'auto' && normOptions.value.length > 8))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return normOptions.value
  return normOptions.value.filter(o => String(o.label).toLowerCase().includes(q))
})

function recalc() {
  const el = rootEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxH = 300
  const below = window.innerHeight - r.bottom
  const placeBelow = below >= 220 || below >= r.top
  menuStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    top: placeBelow ? `${r.bottom + 6}px` : 'auto',
    bottom: placeBelow ? 'auto' : `${window.innerHeight - r.top + 6}px`,
    maxHeight: `${maxH}px`,
    '--origin': placeBelow ? 'top' : 'bottom',
  }
}
function toggle() { open.value ? close() : openIt() }
function openIt() {
  open.value = true
  query.value = ''
  recalc()
  // start the highlight on the current selection (or the top of the list)
  const sel = filtered.value.findIndex(o => o.value === props.modelValue)
  activeIdx.value = sel >= 0 ? sel : 0
  window.addEventListener('resize', recalc)
  window.addEventListener('scroll', recalc, true)
  // Capture phase: fire even when an ancestor (e.g. AssetModal panel via
  // @mousedown.stop) halts bubbling — the teleported menu is excluded below.
  document.addEventListener('mousedown', onDocDown, true)
  nextTick(() => { (searchEl.value || menuEl.value)?.focus?.() })
}
function close() {
  open.value = false
  query.value = ''
  window.removeEventListener('resize', recalc)
  window.removeEventListener('scroll', recalc, true)
  document.removeEventListener('mousedown', onDocDown, true)
}
function onDocDown(e) {
  if (rootEl.value && rootEl.value.contains(e.target)) return
  if (menuEl.value && menuEl.value.contains(e.target)) return
  close()
}
function pick(o) { emit('update:modelValue', o.value); close() }

function move(delta) {
  const n = filtered.value.length
  if (!n) return
  activeIdx.value = (activeIdx.value + delta + n) % n
  nextTick(() => {
    const opts = menuEl.value?.querySelectorAll('.asel-opt')
    opts && opts[activeIdx.value]?.scrollIntoView({ block: 'nearest' })
  })
}
function onTriggerKey(e) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault()
    if (!open.value) openIt()
    else if (e.key === 'Enter' || e.key === ' ') pickActive()
    else move(e.key === 'ArrowDown' ? 1 : -1)
  } else if (e.key === 'Escape' && open.value) { close() }
}
function onMenuKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Home') { e.preventDefault(); activeIdx.value = 0 }
  else if (e.key === 'End') { e.preventDefault(); activeIdx.value = filtered.value.length - 1 }
  else if (e.key === 'Enter') { e.preventDefault(); pickActive() }
  else if (e.key === 'Escape') { e.preventDefault(); close(); rootEl.value?.querySelector('.asel-trigger')?.focus() }
}
function pickActive() {
  const o = filtered.value[activeIdx.value]
  if (o) pick(o)
}
onBeforeUnmount(close)
</script>

<style scoped>
.asel { position: relative; }
.asel-trigger { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;
  font: inherit; font-size: 13.5px; color: var(--as-text); cursor: pointer; text-align: left;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 11px; padding: 9px 12px;
  transition: border-color 0.22s, box-shadow 0.22s, background 0.22s; }
.asel-trigger:hover { border-color: var(--as-border-strong); }
.asel-trigger.open { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.asel-trigger:focus-visible { outline: none; border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.asel-trigger.placeholder .asel-val { color: var(--as-text-dim); }
.asel-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.asel-ic { color: var(--as-amber); flex-shrink: 0; }
.asel-val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asel-caret { color: var(--as-text-dim); flex-shrink: 0; transition: transform 0.25s var(--as-spring), color 0.25s; }
.asel-trigger.open .asel-caret { transform: rotate(180deg); color: var(--as-amber); }
.asel-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--as-amber) 10%, transparent), transparent 60%); transition: opacity 0.3s; }
.asel-trigger.open .asel-glow { opacity: 1; }

.asel-menu { z-index: 5200; display: flex; flex-direction: column; padding: 6px; border-radius: 13px; overflow: hidden;
  background: var(--as-glass-deep); border: 1px solid var(--as-border-strong); box-shadow: var(--as-glass-shadow);
  backdrop-filter: var(--as-glass-blur); -webkit-backdrop-filter: var(--as-glass-blur); transform-origin: var(--origin, top) center; }
.asel-search { display: flex; align-items: center; gap: 7px; padding: 7px 9px; margin-bottom: 5px; border-radius: 9px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.asel-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--as-text); }
.asel-scroll { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.asel-opt { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; text-align: left;
  background: transparent; border: none; color: var(--as-text-secondary); transition: background 0.16s, color 0.16s, transform 0.16s;
  animation: as-deal-row 0.26s var(--as-spring) both; animation-delay: calc(var(--i) * 0.018s); }
.asel-opt:hover, .asel-opt.active { background: var(--as-surface-elevated); color: var(--as-text); transform: translateX(2px); }
.asel-opt.on { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 12%, transparent); }
.asel-opt.on.active { background: color-mix(in srgb, var(--as-amber) 18%, transparent); }
.asel-opt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.asel-opt-ic { color: var(--as-text-muted); flex-shrink: 0; }
.asel-opt.on .asel-opt-ic { color: var(--as-amber); }
.asel-opt-lab { flex: 1; min-width: 0; }
.asel-opt-tick { color: var(--as-amber); flex-shrink: 0; }
.asel-empty { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 18px; font-size: 12.5px; color: var(--as-text-dim); }

.asel-pop-enter-active, .asel-pop-leave-active { transition: opacity 0.22s var(--as-ease), transform 0.22s var(--as-spring); }
.asel-pop-enter-from, .asel-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }

@media (prefers-reduced-motion: reduce) { .asel-opt { animation: none; } }
</style>
