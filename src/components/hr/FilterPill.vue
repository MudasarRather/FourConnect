<template>
  <div ref="rootEl" class="filter-pill" :class="{ active: hasValue, open }">
    <button
      ref="triggerEl"
      type="button"
      class="pill-btn"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="pill-label">{{ label }}</span>
      <span class="pill-value">{{ displayLabel }}</span>
      <svg class="pill-chev" :class="{ flipped: open }" viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1,1 5,5 9,1" />
      </svg>
      <span v-if="hasValue" class="pill-dot" aria-hidden="true" />
    </button>

    <teleport to="body">
      <transition name="pill-pop">
        <div
          v-if="open"
          class="pill-popover"
          :style="popoverStyle"
          ref="popoverEl"
        >
          <ul class="pill-list" role="listbox">
            <li
              v-if="allowClear"
              :class="['pill-item', { selected: !hasValue }]"
              role="option"
              :aria-selected="!hasValue"
              @click="pick(null)"
            >
              <span class="opt-label">All</span>
              <svg v-if="!hasValue" class="opt-check" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3.2,8.6 6.6,12 13,5.2" />
              </svg>
            </li>
            <li
              v-for="opt in options"
              :key="opt.value"
              :class="['pill-item', { selected: opt.value === modelValue }]"
              role="option"
              :aria-selected="opt.value === modelValue"
              @click="pick(opt.value)"
            >
              <span class="opt-label">{{ opt.label }}</span>
              <svg v-if="opt.value === modelValue" class="opt-check" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3.2,8.6 6.6,12 13,5.2" />
              </svg>
            </li>
            <li v-if="!options.length" class="pill-empty">No options</li>
          </ul>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  allowClear: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const triggerEl = ref(null)
const popoverEl = ref(null)
const open = ref(false)
const popoverStyle = ref({})

const hasValue = computed(() => props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '')

const displayLabel = computed(() => {
  if (!hasValue.value) return 'All'
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : '—'
})

const toggle = () => open.value ? close() : openIt()

const openIt = async () => {
  if (open.value) return
  open.value = true
  positionPopover()
  await nextTick()
  window.addEventListener('mousedown', onDocClick, true)
  window.addEventListener('scroll', positionPopover, true)
  window.addEventListener('resize', positionPopover)
}

const close = () => {
  if (!open.value) return
  open.value = false
  window.removeEventListener('mousedown', onDocClick, true)
  window.removeEventListener('scroll', positionPopover, true)
  window.removeEventListener('resize', positionPopover)
}

const onDocClick = (e) => {
  if (rootEl.value?.contains(e.target)) return
  if (popoverEl.value?.contains(e.target)) return
  close()
}

const pick = (v) => {
  emit('update:modelValue', v)
  emit('change', v)
  close()
}

const positionPopover = () => {
  const t = triggerEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const vpH = window.innerHeight
  const below = vpH - r.bottom
  const placeBelow = below >= 220 || below >= r.top
  popoverStyle.value = {
    position: 'fixed',
    left: r.left + 'px',
    top: placeBelow ? (r.bottom + 6) + 'px' : 'auto',
    bottom: placeBelow ? 'auto' : (vpH - r.top + 6) + 'px',
    minWidth: Math.max(160, r.width) + 'px',
    maxHeight: '280px',
    '--hr-pop-origin': placeBelow ? 'top' : 'bottom',
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onDocClick, true)
  window.removeEventListener('scroll', positionPopover, true)
  window.removeEventListener('resize', positionPopover)
})
</script>

<style scoped>
.filter-pill {
  position: relative;
  display: inline-flex;
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  color: var(--hr-text);
  position: relative;
  transition: background 180ms var(--hr-spring),
              border-color 180ms var(--hr-spring),
              transform 220ms var(--hr-spring);
}
.pill-btn:hover {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.filter-pill.open .pill-btn {
  border-color: var(--hr-accent-gold-border);
  background: var(--hr-input-bg-focus);
}
.filter-pill.active .pill-btn {
  background: rgba(251, 191, 36, 0.06);
  border-color: rgba(251, 191, 36, 0.25);
}

.pill-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  white-space: nowrap;
}
.filter-pill.active .pill-label { color: var(--hr-orange); }

.pill-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--hr-text-secondary);
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.filter-pill.active .pill-value { color: var(--hr-accent-gold); }

.pill-chev {
  color: var(--hr-text-muted);
  transition: transform 220ms var(--hr-spring);
}
.pill-chev.flipped { transform: rotate(180deg); color: var(--hr-accent-gold); }

.pill-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--hr-orange);
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.55);
}

/* Popover */
.pill-popover {
  z-index: 1400;
  background: rgba(14, 14, 16, 0.92);
  border: 1px solid var(--hr-border-strong);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 22px 56px -22px rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  transform-origin: var(--hr-pop-origin, top) left;
}

.pill-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: inherit;
  overflow-y: auto;
}
.pill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: background 120ms;
  user-select: none;
}
.pill-item:hover {
  background: rgba(251, 191, 36, 0.08);
  color: var(--hr-text);
}
.pill-item.selected {
  background: var(--hr-accent-gold-soft);
  color: var(--hr-accent-gold);
}
.opt-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.opt-check { color: var(--hr-accent-gold); flex-shrink: 0; }

.pill-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--hr-text-dim);
}

.pill-pop-enter-active, .pill-pop-leave-active {
  transition: opacity 180ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.pill-pop-enter-from, .pill-pop-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* ═══════════ LIGHT THEME ═══════════
   The popover is teleported to body, so this rule uses [data-theme="light"]
   without depending on the SFC root. */
[data-theme="light"] .pill-popover {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(40, 25, 10, 0.14);
  box-shadow: 0 22px 56px -22px rgba(40, 25, 10, 0.42);
}
[data-theme="light"] .pill-item { color: #44362a; }
[data-theme="light"] .pill-item:hover {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}
[data-theme="light"] .pill-item.selected {
  background: rgba(217, 119, 6, 0.18);
  color: #b45309;
}
[data-theme="light"] .opt-check { color: #b45309; }
[data-theme="light"] .pill-empty { color: #8d7b62; }

[data-theme="light"] .pill-btn { color: #1a1410; }
[data-theme="light"] .pill-label { color: #92400e; }
[data-theme="light"] .pill-value { color: #44362a; }
[data-theme="light"] .filter-pill.active .pill-label { color: #c2410c; }
[data-theme="light"] .filter-pill.active .pill-value { color: #b45309; }
[data-theme="light"] .pill-chev { color: #8d7b62; }
[data-theme="light"] .pill-chev.flipped { color: #b45309; }
[data-theme="light"] .filter-pill.active .pill-btn {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
}
</style>
