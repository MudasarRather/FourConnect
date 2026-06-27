<template>
  <!-- ═══════════ PERF SELECT ═══════════
       Perf-scoped modern dropdown — teleported, keyboard-navigable, animated.
       Mirrors the Assets AsSelect API ({value,label,icon?,dot?,accent?}) but
       themed entirely on --perf-* tokens so it lives natively inside the Arena. -->
  <div class="psel" :class="{ open }" ref="rootEl">
    <button type="button" class="psel-trigger" :class="{ open, placeholder: !selected, disabled }"
      :disabled="disabled" @click="toggle" @keydown="onTriggerKey" :aria-expanded="open" aria-haspopup="listbox">
      <span v-if="selected && selected.dot" class="psel-dot" :style="{ background: selected.dot, boxShadow: `0 0 8px ${selected.dot}` }" />
      <component v-if="selected && selected.icon" :is="selected.icon" :size="15" class="psel-ic" :style="selected.accent ? { color: selected.accent } : null" />
      <span class="psel-val">{{ selected ? selected.label : placeholder }}</span>
      <ChevronDown :size="14" class="psel-caret" />
      <span class="psel-glow" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="psel-pop">
        <div v-if="open" class="psel-menu perf-scope" :style="menuStyle" ref="menuEl" role="listbox"
          tabindex="-1" @mousedown.stop @click.stop @keydown="onMenuKey">
          <div v-if="showSearch" class="psel-search">
            <Search :size="13" />
            <input ref="searchEl" v-model="query" :placeholder="searchPlaceholder" type="text" @keydown="onMenuKey" />
          </div>
          <div class="psel-scroll">
            <button v-for="(o, i) in filtered" :key="o.value ?? o.label" type="button" class="psel-opt"
              :class="{ on: o.value === modelValue, active: i === activeIdx }" :style="{ '--i': i }"
              role="option" :aria-selected="o.value === modelValue" @click="pick(o)" @mousemove="activeIdx = i">
              <span v-if="o.dot" class="psel-opt-dot" :style="{ background: o.dot, boxShadow: `0 0 8px ${o.dot}` }" />
              <component v-if="o.icon" :is="o.icon" :size="15" class="psel-opt-ic" :style="o.accent ? { color: o.accent } : null" />
              <span class="psel-opt-lab">{{ o.label }}<i v-if="o.sub">{{ o.sub }}</i></span>
              <Check v-if="o.value === modelValue" :size="14" class="psel-opt-tick" />
            </button>
            <div v-if="!filtered.length" class="psel-empty"><SearchX :size="14" /> No matches</div>
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
  options: { type: Array, default: () => [] },     // [{value,label,sub?,icon?,dot?,accent?}] | ['A','B']
  placeholder: { type: String, default: 'Select…' },
  disabled: { type: Boolean, default: false },
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
function toggle() { if (props.disabled) return; open.value ? close() : openIt() }
function openIt() {
  open.value = true
  query.value = ''
  recalc()
  const sel = filtered.value.findIndex(o => o.value === props.modelValue)
  activeIdx.value = sel >= 0 ? sel : 0
  window.addEventListener('resize', recalc)
  window.addEventListener('scroll', recalc, true)
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
    const opts = menuEl.value?.querySelectorAll('.psel-opt')
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
  else if (e.key === 'Escape') { e.preventDefault(); close(); rootEl.value?.querySelector('.psel-trigger')?.focus() }
}
function pickActive() {
  const o = filtered.value[activeIdx.value]
  if (o) pick(o)
}
onBeforeUnmount(close)
</script>

<style scoped>
.psel { position: relative; }
.psel-trigger { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;
  height: 42px; font: inherit; font-size: 13px; color: var(--perf-text); cursor: pointer; text-align: left;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 11px; padding: 0 12px;
  transition: border-color 0.22s var(--perf-spring), box-shadow 0.22s, background 0.22s; }
.psel-trigger:hover:not(.disabled) { border-color: var(--perf-border-warm); }
.psel-trigger.open { border-color: color-mix(in srgb, var(--perf-gold) 60%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--perf-gold) 12%, transparent); }
.psel-trigger:focus-visible { outline: none; border-color: color-mix(in srgb, var(--perf-gold) 60%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--perf-gold) 12%, transparent); }
.psel-trigger.placeholder .psel-val { color: var(--perf-text-dim); }
.psel-trigger.disabled { opacity: 0.55; cursor: not-allowed; }
.psel-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.psel-ic { color: var(--perf-gold); flex-shrink: 0; }
.psel-val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.psel-caret { color: var(--perf-text-dim); flex-shrink: 0; transition: transform 0.28s var(--perf-spring), color 0.25s; }
.psel-trigger.open .psel-caret { transform: rotate(180deg); color: var(--perf-gold); }
.psel-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--perf-gold) 12%, transparent), transparent 60%); transition: opacity 0.3s; }
.psel-trigger.open .psel-glow { opacity: 1; }

.psel-menu { z-index: 5200; display: flex; flex-direction: column; padding: 6px; border-radius: 13px; overflow: hidden;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong);
  box-shadow: 0 30px 70px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.1);
  backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%);
  transform-origin: var(--origin, top) center; }
.psel-search { display: flex; align-items: center; gap: 7px; padding: 7px 9px; margin-bottom: 5px; border-radius: 9px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--perf-text-dim); }
.psel-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--perf-text); }
.psel-scroll { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.psel-opt { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; text-align: left;
  background: transparent; border: none; color: var(--perf-text-secondary); transition: background 0.16s, color 0.16s, transform 0.16s;
  animation: psel-deal 0.26s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.02s); }
.psel-opt:hover, .psel-opt.active { background: var(--perf-surface); color: var(--perf-text); transform: translateX(2px); }
.psel-opt.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.psel-opt.on.active { background: color-mix(in srgb, var(--perf-gold) 19%, transparent); }
.psel-opt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.psel-opt-ic { color: var(--perf-text-muted); flex-shrink: 0; }
.psel-opt.on .psel-opt-ic { color: var(--perf-gold); }
.psel-opt-lab { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; overflow: hidden; }
.psel-opt-lab i { font-style: normal; font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.psel-opt-tick { color: var(--perf-gold); flex-shrink: 0; }
.psel-empty { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 18px; font-size: 12.5px; color: var(--perf-text-dim); }

@keyframes psel-deal { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.psel-pop-enter-active, .psel-pop-leave-active { transition: opacity 0.22s var(--perf-ease), transform 0.22s var(--perf-spring); }
.psel-pop-enter-from, .psel-pop-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }

@media (prefers-reduced-motion: reduce) { .psel-opt { animation: none; } .psel-opt:hover, .psel-opt.active { transform: none; } }
</style>
