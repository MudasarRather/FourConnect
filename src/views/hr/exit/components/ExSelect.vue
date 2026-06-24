<template>
  <div ref="rootEl" class="exs" :class="{ open, disabled, sm: size === 'sm' }">
    <button ref="trigEl" type="button" class="exs-trig" :disabled="disabled" :aria-expanded="open"
      aria-haspopup="listbox" @click="toggle" @keydown="onTrigKey">
      <span class="exs-sheen" aria-hidden="true" />
      <span class="exs-val" :class="{ ph: !selected }">
        <span v-if="selected?.dot" class="exs-dot" :style="{ background: selected.dot }" />
        <component v-else-if="selected?.icon" :is="selected.icon" :size="14" class="exs-ic" />
        <span class="exs-lab">{{ selected ? selected.label : placeholder }}</span>
      </span>
      <svg class="exs-chev" :class="{ up: open }" viewBox="0 0 10 6" width="11" height="7" fill="none"
        stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 5,5 9,1" /></svg>
    </button>

    <Teleport to="body">
      <Presence>
        <Motion v-if="open" ref="popEl" as="div" class="exs-pop" :style="popStyle"
          :initial="{ opacity: 0, y: -6, scaleY: 0.94 }" :animate="{ opacity: 1, y: 0, scaleY: 1 }"
          :exit="{ opacity: 0, y: -6, scaleY: 0.96 }" :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop @keydown="onPopKey" tabindex="-1">
          <div v-if="useSearch" class="exs-search">
            <Search :size="13" />
            <input ref="searchEl" v-model="q" type="text" :placeholder="searchPlaceholder" @keydown="onPopKey" />
          </div>
          <ul class="exs-list" role="listbox">
            <Motion v-for="(o, i) in filtered" :key="o.value ?? i" as="li" role="option"
              class="exs-item" :class="{ active: i === activeIdx, on: o.value === modelValue, dis: o.disabled }"
              :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.22, delay: Math.min(i * 0.022, 0.2), ease: [0.16, 1, 0.3, 1] }"
              @click="pick(o)" @mouseenter="activeIdx = i">
              <span v-if="o.dot" class="exs-dot" :style="{ background: o.dot }" />
              <component v-else-if="o.icon" :is="o.icon" :size="14" class="exs-ic" />
              <span class="exs-il">
                <span class="exs-itxt">{{ o.label }}</span>
                <span v-if="o.hint" class="exs-ihint">{{ o.hint }}</span>
              </span>
              <svg v-if="o.value === modelValue" class="exs-chk" viewBox="0 0 16 16" width="13" height="13" fill="none"
                stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.2,8.6 6.6,12 13,5.2" /></svg>
            </Motion>
            <li v-if="!filtered.length" class="exs-empty">No matches</li>
          </ul>
        </Motion>
      </Presence>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Search } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: null },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select…' },
  searchable: { type: Boolean, default: null },
  searchPlaceholder: { type: String, default: 'Search…' },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null); const trigEl = ref(null); const popEl = ref(null); const searchEl = ref(null)
const open = ref(false); const q = ref(''); const activeIdx = ref(0); const popStyle = ref({})

const useSearch = computed(() => props.searchable ?? props.options.length > 7)
const selected = computed(() => props.options.find(o => o.value === props.modelValue) || null)
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter(o => String(o.label).toLowerCase().includes(term))
})

const reposition = () => {
  const t = trigEl.value; if (!t) return
  const r = t.getBoundingClientRect()
  const below = window.innerHeight - r.bottom; const above = r.top
  const placeBelow = below >= 200 || below >= above
  popStyle.value = {
    position: 'fixed', left: r.left + 'px', width: r.width + 'px',
    top: placeBelow ? (r.bottom + 6) + 'px' : 'auto',
    bottom: placeBelow ? 'auto' : (window.innerHeight - r.top + 6) + 'px',
    maxHeight: (placeBelow ? Math.max(180, below - 16) : Math.max(180, above - 16)) + 'px',
    transformOrigin: placeBelow ? 'top center' : 'bottom center',
  }
}
const toggle = () => { if (props.disabled) return; open.value ? close() : openIt() }
const openIt = async () => {
  open.value = true; reposition()
  activeIdx.value = Math.max(0, filtered.value.findIndex(o => o.value === props.modelValue))
  await nextTick()
  if (useSearch.value) searchEl.value?.focus(); else popEl.value?.$el?.focus?.()
  window.addEventListener('mousedown', onDoc, true)
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)
}
const close = () => {
  if (!open.value) return
  open.value = false; q.value = ''
  window.removeEventListener('mousedown', onDoc, true)
  window.removeEventListener('scroll', reposition, true)
  window.removeEventListener('resize', reposition)
}
const onDoc = (e) => {
  if (rootEl.value?.contains(e.target)) return
  const pop = popEl.value?.$el || popEl.value
  if (pop?.contains?.(e.target)) return
  close()
}
const pick = (o) => { if (o.disabled) return; emit('update:modelValue', o.value); emit('change', o.value); close() }
const onTrigKey = (e) => { if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); openIt() } }
const onPopKey = (e) => {
  const n = filtered.value.length
  if (e.key === 'Escape') { e.preventDefault(); close(); trigEl.value?.focus() }
  else if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx.value = (activeIdx.value + 1) % Math.max(1, n) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx.value = (activeIdx.value - 1 + n) % Math.max(1, n) }
  else if (e.key === 'Enter') { e.preventDefault(); const o = filtered.value[activeIdx.value]; if (o) pick(o) }
}
watch(q, () => { activeIdx.value = 0 })
onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onDoc, true)
  window.removeEventListener('scroll', reposition, true)
  window.removeEventListener('resize', reposition)
})
defineExpose({ open: openIt, close })
</script>

<style scoped>
.exs { position: relative; display: block; }
.exs-trig { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 10px 12px; border-radius: 10px; cursor: pointer; text-align: left;
  background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); font-size: 13px; font-family: inherit;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.3s; }
.exs.sm .exs-trig { padding: 8px 10px; font-size: 12.5px; }
.exs-trig:hover:not(:disabled) { border-color: var(--ex-border-strong); }
.exs.open .exs-trig { border-color: var(--ex-violet-border); background: var(--ex-violet-soft);
  box-shadow: 0 0 0 3px rgba(251,146,60,0.13), 0 0 22px -8px rgba(234,88,12,0.4); }
.exs.disabled .exs-trig { opacity: 0.55; cursor: not-allowed; }
.exs-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: linear-gradient(120deg, transparent 30%, rgba(251,146,60,0.1) 50%, transparent 70%); }
.exs.open .exs-sheen { opacity: 1; }
.exs-val { display: inline-flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.exs-val.ph { color: var(--ex-text-dim); }
.exs-lab { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.exs-ic { color: var(--ex-violet); flex-shrink: 0; }
.exs-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
.exs-chev { color: var(--ex-text-muted); flex-shrink: 0; transition: transform 0.25s var(--ex-spring), color 0.2s; }
.exs-chev.up { transform: rotate(180deg); color: var(--ex-violet); }
[data-theme="light"] .exs-trig { background: rgba(255, 250, 242, 0.72); }
[data-theme="light"] .exs.open .exs-trig { background: var(--ex-violet-soft); }
</style>

<style>
/* unscoped — teleported popover lives on <body> */
.exs-pop { z-index: 5200; display: flex; flex-direction: column; overflow: hidden; border-radius: 13px;
  background: var(--ex-surface-glass); border: 1px solid var(--ex-border-strong);
  box-shadow: 0 24px 60px -18px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,146,60,0.05);
  backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%); }
.exs-search { display: flex; align-items: center; gap: 7px; padding: 9px 11px; border-bottom: 1px solid var(--ex-border); color: var(--ex-text-dim); }
.exs-search input { flex: 1; background: none; border: none; outline: none; color: var(--ex-text); font-size: 12.5px; font-family: inherit; }
.exs-search input::placeholder { color: var(--ex-text-dim); }
.exs-list { list-style: none; margin: 0; padding: 5px; overflow-y: auto; min-height: 0; }
.exs-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 9px; cursor: pointer;
  font-size: 12.5px; color: var(--ex-text-secondary); position: relative; }
.exs-item.active, .exs-item:hover { background: rgba(251,146,60,0.1); color: var(--ex-text); }
.exs-item.on { background: var(--ex-violet-soft); color: var(--ex-violet); }
.exs-item.dis { opacity: 0.45; cursor: not-allowed; }
.exs-item .exs-ic { color: var(--ex-violet); flex-shrink: 0; }
.exs-item .exs-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.exs-il { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.exs-itxt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.exs-ihint { font-size: 10px; color: var(--ex-text-dim); }
.exs-chk { color: var(--ex-violet); flex-shrink: 0; }
.exs-empty { padding: 14px; text-align: center; font-size: 12px; color: var(--ex-text-dim); }
[data-theme="light"] .exs-pop { background: rgba(255,250,242,0.96); border-color: rgba(60,45,20,0.16);
  box-shadow: 0 24px 60px -18px rgba(60,45,20,0.28); }
[data-theme="light"] .exs-item.active, [data-theme="light"] .exs-item:hover { background: rgba(234,88,12,0.1); }
[data-theme="light"] .exs-item.on { background: rgba(234,88,12,0.16); color: #b45309; }
@media (prefers-reduced-motion: reduce) { .exs-chev { transition: none; } }
</style>
