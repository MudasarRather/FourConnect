<template>
  <div ref="rootEl" class="trvs" :class="{ open, disabled, sm: size === 'sm' }">
    <button ref="trigEl" type="button" class="trvs-trig" :disabled="disabled" :aria-expanded="open"
      aria-haspopup="listbox" @click="toggle" @keydown="onTrigKey">
      <span class="trvs-sheen" aria-hidden="true" />
      <span class="trvs-val" :class="{ ph: !selected }">
        <span v-if="selected?.dot" class="trvs-dot" :style="{ background: selected.dot }" />
        <component v-else-if="selected?.icon" :is="selected.icon" :size="14" class="trvs-ic" />
        <span class="trvs-lab">{{ selected ? selected.label : placeholder }}</span>
      </span>
      <svg class="trvs-chev" :class="{ up: open }" viewBox="0 0 10 6" width="11" height="7" fill="none"
        stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 5,5 9,1" /></svg>
    </button>

    <Teleport to="body">
      <Presence>
        <Motion v-if="open" ref="popEl" as="div" class="trvs-pop" :style="popStyle"
          :initial="{ opacity: 0, y: -6, scaleY: 0.94 }" :animate="{ opacity: 1, y: 0, scaleY: 1 }"
          :exit="{ opacity: 0, y: -6, scaleY: 0.96 }" :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop @keydown="onPopKey" tabindex="-1">
          <div v-if="useSearch" class="trvs-search">
            <Search :size="13" />
            <input ref="searchEl" v-model="q" type="text" :placeholder="searchPlaceholder" @keydown="onPopKey" />
          </div>
          <ul class="trvs-list" role="listbox">
            <Motion v-for="(o, i) in filtered" :key="o.value ?? i" as="li" role="option"
              class="trvs-item" :class="{ active: i === activeIdx, on: o.value === modelValue, dis: o.disabled }"
              :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.22, delay: Math.min(i * 0.022, 0.2), ease: [0.16, 1, 0.3, 1] }"
              @click="pick(o)" @mouseenter="activeIdx = i">
              <span v-if="o.dot" class="trvs-dot" :style="{ background: o.dot }" />
              <component v-else-if="o.icon" :is="o.icon" :size="14" class="trvs-ic" />
              <span class="trvs-il">
                <span class="trvs-itxt">{{ o.label }}</span>
                <span v-if="o.hint" class="trvs-ihint">{{ o.hint }}</span>
              </span>
              <svg v-if="o.value === modelValue" class="trvs-chk" viewBox="0 0 16 16" width="13" height="13" fill="none"
                stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.2,8.6 6.6,12 13,5.2" /></svg>
            </Motion>
            <li v-if="!filtered.length" class="trvs-empty">No matches</li>
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
  options: { type: Array, default: () => [] },   // [{ value, label, icon?, dot?, hint?, disabled? }]
  placeholder: { type: String, default: 'Select…' },
  searchable: { type: Boolean, default: null },   // auto when > 7 options
  searchPlaceholder: { type: String, default: 'Search…' },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const trigEl = ref(null)
const popEl = ref(null)
const searchEl = ref(null)
const open = ref(false)
const q = ref('')
const activeIdx = ref(0)
const popStyle = ref({})

const useSearch = computed(() => props.searchable ?? props.options.length > 7)
const selected = computed(() => props.options.find(o => o.value === props.modelValue) || null)
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter(o => String(o.label).toLowerCase().includes(term))
})

const reposition = () => {
  const t = trigEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const above = r.top
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
  open.value = true
  reposition()
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
.trvs { position: relative; display: block; }
.trvs-trig { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 10px 12px; border-radius: 10px; cursor: pointer; text-align: left;
  background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); font-size: 13px; font-family: inherit;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.3s; }
.trvs.sm .trvs-trig { padding: 8px 10px; font-size: 12.5px; }
.trvs-trig:hover:not(:disabled) { border-color: var(--trv-border-strong); }
.trvs.open .trvs-trig { border-color: var(--trv-amber-border); background: var(--trv-amber-soft);
  box-shadow: 0 0 0 3px rgba(251,191,36,0.13), 0 0 22px -8px rgba(251,146,60,0.4); }
.trvs.disabled .trvs-trig { opacity: 0.55; cursor: not-allowed; }
.trvs-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: linear-gradient(120deg, transparent 30%, rgba(251,191,36,0.1) 50%, transparent 70%); }
.trvs.open .trvs-sheen { opacity: 1; }
.trvs-val { display: inline-flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.trvs-val.ph { color: var(--trv-text-dim); }
.trvs-lab { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trvs-ic { color: var(--trv-amber); flex-shrink: 0; }
.trvs-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
.trvs-chev { color: var(--trv-text-muted); flex-shrink: 0; transition: transform 0.25s var(--trv-spring), color 0.2s; }
.trvs-chev.up { transform: rotate(180deg); color: var(--trv-amber); }

/* Light theme — the dark rgba(0,0,0,0.3) trigger fill reads as a grey blob on cream. */
[data-theme="light"] .trvs-trig { background: rgba(255, 250, 240, 0.72); }
[data-theme="light"] .trvs.open .trvs-trig { background: var(--trv-amber-soft); }
</style>

<style>
/* unscoped — teleported popover lives on <body> */
.trvs-pop { z-index: 5200; display: flex; flex-direction: column; overflow: hidden; border-radius: 13px;
  background: var(--trv-surface-glass); border: 1px solid var(--trv-border-strong);
  box-shadow: 0 24px 60px -18px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.05);
  backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%); }
.trvs-search { display: flex; align-items: center; gap: 7px; padding: 9px 11px; border-bottom: 1px solid var(--trv-border); color: var(--trv-text-dim); }
.trvs-search input { flex: 1; background: none; border: none; outline: none; color: var(--trv-text); font-size: 12.5px; font-family: inherit; }
.trvs-search input::placeholder { color: var(--trv-text-dim); }
.trvs-list { list-style: none; margin: 0; padding: 5px; overflow-y: auto; min-height: 0; }
.trvs-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 9px; cursor: pointer;
  font-size: 12.5px; color: var(--trv-text-secondary); position: relative; }
.trvs-item.active, .trvs-item:hover { background: rgba(251,191,36,0.1); color: var(--trv-text); }
.trvs-item.on { background: var(--trv-amber-soft); color: var(--trv-amber); }
.trvs-item.dis { opacity: 0.45; cursor: not-allowed; }
.trvs-item .trvs-ic { color: var(--trv-amber); flex-shrink: 0; }
.trvs-item .trvs-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.trvs-il { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.trvs-itxt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trvs-ihint { font-size: 10px; color: var(--trv-text-dim); }
.trvs-chk { color: var(--trv-amber); flex-shrink: 0; }
.trvs-empty { padding: 14px; text-align: center; font-size: 12px; color: var(--trv-text-dim); }
[data-theme="light"] .trvs-pop { background: rgba(255,250,240,0.96); border-color: rgba(40,25,10,0.14);
  box-shadow: 0 24px 60px -18px rgba(40,25,10,0.28); }
[data-theme="light"] .trvs-item.active, [data-theme="light"] .trvs-item:hover { background: rgba(217,119,6,0.12); }
[data-theme="light"] .trvs-item.on { background: rgba(217,119,6,0.18); color: #92400e; }
@media (prefers-reduced-motion: reduce) { .trvs-chev { transition: none; } }
</style>
