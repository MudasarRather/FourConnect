<template>
  <div ref="rootEl" class="hr-select" :class="{ open, error, disabled, focused }">
    <button
      ref="triggerEl"
      type="button"
      class="hr-select-trigger"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="trig-value" :class="{ placeholder: !selectedOption && !loading }">
        <span v-if="loading && !selectedOption" class="trig-loading">
          <span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" />
          <span class="loading-text">Loading options…</span>
        </span>
        <template v-else>
          <component v-if="selectedOption?.icon" :is="selectedOption.icon" :size="13" class="opt-ic" />
          {{ selectedOption ? selectedOption.label : placeholder }}
        </template>
      </span>
      <svg class="chevron" :class="{ flipped: open }" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1,1 5,5 9,1" />
      </svg>
    </button>

    <teleport to="body">
      <transition name="hr-pop">
        <div
          v-if="open"
          class="hr-select-popover"
          :style="popoverStyle"
          @keydown="onPopKey"
          tabindex="-1"
          ref="popoverEl"
        >
          <div class="pop-inner">
            <div v-if="searchable" class="pop-search">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="search-ic">
                <circle cx="7.2" cy="7.2" r="4.6" />
                <line x1="10.8" y1="10.8" x2="14" y2="14" />
              </svg>
              <input
                ref="searchEl"
                v-model="query"
                type="text"
                class="pop-search-input"
                :placeholder="searchPlaceholder"
                @keydown="onPopKey"
              />
            </div>
            <ul class="pop-list" role="listbox" :aria-activedescendant="activeId">
              <li
                v-for="(opt, idx) in filtered"
                :key="opt.value ?? idx"
                :id="`hrsel-opt-${uid}-${idx}`"
                :class="['pop-item', { active: idx === activeIdx, selected: opt.value === modelValue, disabled: opt.disabled }]"
                role="option"
                :aria-selected="opt.value === modelValue"
                @click="select(opt)"
                @mouseenter="activeIdx = idx"
              >
                <component v-if="opt.icon" :is="opt.icon" :size="13" class="opt-ic" />
                <span class="opt-label">{{ opt.label }}</span>
                <svg v-if="opt.value === modelValue" class="opt-check" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3.2,8.6 6.6,12 13,5.2" />
                </svg>
              </li>
              <li v-if="!filtered.length" class="pop-empty">No options{{ query ? ` match "${query}"` : '' }}</li>
            </ul>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
  <div v-if="error && errorText" class="hr-input-error-text">{{ errorText }}</div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true }, // [{ value, label, icon?, disabled? }]
  placeholder: { type: String, default: 'Select…' },
  searchable: { type: Boolean, default: null }, // auto = > 8 options
  searchPlaceholder: { type: String, default: 'Search…' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const uid = Math.random().toString(36).slice(2, 8)
const rootEl = ref(null)
const triggerEl = ref(null)
const popoverEl = ref(null)
const searchEl = ref(null)
const open = ref(false)
const focused = ref(false)
const query = ref('')
const activeIdx = ref(0)
const popoverStyle = ref({})

const searchable = computed(() => props.searchable ?? (props.options.length > 8))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => String(o.label).toLowerCase().includes(q))
})

const selectedOption = computed(() => props.options.find(o => o.value === props.modelValue) || null)

const activeId = computed(() => `hrsel-opt-${uid}-${activeIdx.value}`)

const toggle = () => {
  if (props.disabled) return
  open.value ? close() : openIt()
}

const openIt = async () => {
  if (open.value) return
  open.value = true
  focused.value = true
  positionPopover()
  // ensure current selection is highlighted
  activeIdx.value = Math.max(0, filtered.value.findIndex(o => o.value === props.modelValue))
  await nextTick()
  if (searchable.value) searchEl.value?.focus()
  else popoverEl.value?.focus()
  window.addEventListener('mousedown', onDocClick, true)
  window.addEventListener('scroll', positionPopover, true)
  window.addEventListener('resize', positionPopover)
}

const close = () => {
  if (!open.value) return
  open.value = false
  focused.value = false
  query.value = ''
  window.removeEventListener('mousedown', onDocClick, true)
  window.removeEventListener('scroll', positionPopover, true)
  window.removeEventListener('resize', positionPopover)
  triggerEl.value?.focus()
}

const onDocClick = (e) => {
  if (rootEl.value?.contains(e.target)) return
  if (popoverEl.value?.contains(e.target)) return
  close()
}

const select = (opt) => {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  close()
}

const positionPopover = () => {
  const t = triggerEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const vpH = window.innerHeight
  const below = vpH - r.bottom
  const above = r.top
  // Strongly prefer opening downward — only flip when there is essentially
  // no room below at all. The popover scrolls internally up to maxHeight,
  // so even a tight 140px below is fine.
  const placeBelow = below >= 140 || below >= above
  popoverStyle.value = {
    position: 'fixed',
    left: r.left + 'px',
    top: placeBelow ? (r.bottom + 6) + 'px' : 'auto',
    bottom: placeBelow ? 'auto' : (vpH - r.top + 6) + 'px',
    width: r.width + 'px',
    maxHeight: (placeBelow ? Math.max(160, below - 14) : Math.max(160, above - 14)) + 'px',
    '--hr-pop-origin': placeBelow ? 'top' : 'bottom',
  }
}

const onTriggerKey = (e) => {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault()
    openIt()
  }
}

const onPopKey = (e) => {
  if (e.key === 'Escape') { e.preventDefault(); close(); return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = (activeIdx.value + 1) % Math.max(1, filtered.value.length)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = (activeIdx.value - 1 + filtered.value.length) % Math.max(1, filtered.value.length)
  } else if (e.key === 'Home') {
    e.preventDefault(); activeIdx.value = 0
  } else if (e.key === 'End') {
    e.preventDefault(); activeIdx.value = Math.max(0, filtered.value.length - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = filtered.value[activeIdx.value]
    if (opt) select(opt)
  }
}

watch(query, () => { activeIdx.value = 0 })

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onDocClick, true)
  window.removeEventListener('scroll', positionPopover, true)
  window.removeEventListener('resize', positionPopover)
})

defineExpose({ open: openIt, close })
</script>

<style scoped>
.hr-select { display: block; position: relative; }
.hr-select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: var(--hr-input-height);
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 10px;
  padding: 0 12px;
  color: var(--hr-input-text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: background 220ms var(--hr-spring),
              border-color 220ms var(--hr-spring),
              box-shadow 280ms var(--hr-spring);
}
.hr-select-trigger::after {
  content: '';
  position: absolute;
  left: 12px; right: 12px;
  bottom: 0;
  height: 2px;
  background: var(--hr-gradient-hero);
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: center;
  opacity: 0;
  transition: transform 320ms var(--hr-spring), opacity 220ms var(--hr-spring);
  pointer-events: none;
}
.hr-select-trigger:hover:not(:disabled) {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.hr-select.open .hr-select-trigger,
.hr-select.focused .hr-select-trigger {
  background: var(--hr-input-bg-focus);
  border-color: var(--hr-input-border-focus);
  box-shadow:
    0 0 0 3px rgba(251, 191, 36, 0.14),
    0 0 24px -8px rgba(251, 146, 60, 0.4);
}
.hr-select.open .hr-select-trigger::after,
.hr-select.focused .hr-select-trigger::after {
  transform: scaleX(1);
  opacity: 0.85;
}
.hr-select.error .hr-select-trigger {
  border-color: var(--hr-input-error);
  background: var(--hr-input-error-soft);
}
.hr-select.disabled .hr-select-trigger { opacity: 0.6; cursor: not-allowed; }

.trig-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trig-value.placeholder { color: var(--hr-input-placeholder); }

.trig-loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--hr-text-muted);
  font-size: 12px;
}
.loading-text {
  margin-left: 6px;
  font-style: italic;
}
.loading-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--hr-accent-gold);
  animation: hr-loading-bounce 1.2s ease-in-out infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.16s; }
.loading-dot:nth-child(3) { animation-delay: 0.32s; }
@keyframes hr-loading-bounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.opt-ic { color: var(--hr-text-muted); flex-shrink: 0; }
.hr-select.open .opt-ic,
.trig-value:not(.placeholder) .opt-ic { color: var(--hr-accent-gold); }

.chevron {
  color: var(--hr-text-muted);
  transition: transform 220ms var(--hr-spring), color 200ms;
  flex-shrink: 0;
  margin-left: 8px;
}
.chevron.flipped { transform: rotate(180deg); color: var(--hr-accent-gold); }

.hr-select-popover {
  z-index: 1400;
  display: flex;
  flex-direction: column;
  background: var(--hr-surface-deep);
  border: 1px solid var(--hr-border-strong);
  border-radius: 12px;
  box-shadow: 0 22px 56px -22px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(251,191,36,0.05);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  overflow: hidden;
  transform-origin: var(--hr-pop-origin, top) left;
}
.pop-inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: inherit;
  overflow: hidden;
}

.pop-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--hr-border);
  background: rgba(255, 255, 255, 0.015);
}
.search-ic { color: var(--hr-text-muted); flex-shrink: 0; }
.pop-search-input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--hr-text);
  font-size: 12.5px;
  font-family: inherit;
}
.pop-search-input::placeholder { color: var(--hr-input-placeholder); }

.pop-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  flex: 1;
}
.pop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: background 120ms, color 120ms;
  position: relative;
}
.pop-item:hover, .pop-item.active {
  background: rgba(251, 191, 36, 0.08);
  color: var(--hr-text);
}
.pop-item.selected {
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
}
.pop-item.disabled { opacity: 0.5; cursor: not-allowed; }
.opt-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opt-check { color: var(--hr-accent-gold); flex-shrink: 0; }

.pop-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--hr-text-dim);
}

/* Popover transition */
.hr-pop-enter-active, .hr-pop-leave-active {
  transition: opacity 180ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.hr-pop-enter-from, .hr-pop-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.hr-input-error-text {
  color: var(--hr-input-error);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 4px;
  font-weight: 500;
}

/* ─── Light theme overrides ───────────────────────────────────────────── */
[data-theme="light"] .hr-select.open .hr-select-trigger,
[data-theme="light"] .hr-select.focused .hr-select-trigger {
  box-shadow:
    0 0 0 3px rgba(217, 119, 6, 0.18),
    0 0 24px -8px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .hr-select-popover {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow:
    0 22px 56px -22px rgba(40, 25, 10, 0.28),
    0 0 0 1px rgba(217, 119, 6, 0.12);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
[data-theme="light"] .pop-search {
  background: rgba(40, 25, 10, 0.03);
  border-bottom-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .pop-item:hover,
[data-theme="light"] .pop-item.active {
  background: rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .pop-item.selected {
  background: rgba(217, 119, 6, 0.20);
  color: #92400e;
}
</style>
