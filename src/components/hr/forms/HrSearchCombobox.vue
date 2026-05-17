<template>
  <div ref="rootEl" class="hr-cb" :class="{ open, error, disabled, focused }">
    <div class="hr-cb-shell" :class="{ focused, error, disabled }">
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="cb-ic">
        <circle cx="7.2" cy="7.2" r="4.6" />
        <line x1="10.8" y1="10.8" x2="14" y2="14" />
      </svg>
      <input
        ref="inputEl"
        :value="display"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="hr-cb-input"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKey"
      />
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="cb-clear"
        @click="clear"
        aria-label="Clear"
      >
        <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
      <span v-if="loading" class="cb-spin">
        <svg viewBox="0 0 16 16" width="13" height="13"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-dasharray="20 14" /></svg>
      </span>
    </div>

    <teleport to="body">
      <transition name="hr-pop">
        <div
          v-if="open && (results.length || loading || (query && !loading))"
          class="hr-cb-popover"
          :style="popoverStyle"
        >
          <ul class="cb-list" role="listbox">
            <li v-if="loading" class="cb-empty">Searching…</li>
            <li
              v-for="(item, idx) in results"
              :key="item.id"
              :class="['cb-item', { active: idx === activeIdx, selected: item.id === modelValue }]"
              role="option"
              @click="select(item)"
              @mouseenter="activeIdx = idx"
            >
              <span class="cb-avatar" :style="{ background: avatarColor(item) }">
                <img v-if="item.avatar_url" :src="item.avatar_url" :alt="item.full_name" />
                <span v-else>{{ initials(item) }}</span>
              </span>
              <span class="cb-text">
                <span class="cb-name">{{ item.full_name || item.label || '—' }}</span>
                <span class="cb-meta">{{ item.email || item.employee_id || '' }}</span>
              </span>
              <svg v-if="item.id === modelValue" class="cb-check" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3.2,8.6 6.6,12 13,5.2" />
              </svg>
            </li>
            <li v-if="!loading && !results.length && query" class="cb-empty">No matches for "{{ query }}"</li>
          </ul>
        </div>
      </transition>
    </teleport>
  </div>
  <div v-if="error && errorText" class="hr-input-error-text">{{ errorText }}</div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null }, // selected id
  selectedLabel: { type: String, default: '' }, // current label to show in input when value present
  placeholder: { type: String, default: 'Search…' },
  search: { type: Function, required: true }, // async (query) => results[]
  disabled: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  errorText: { type: String, default: '' },
  minChars: { type: Number, default: 1 },
  debounceMs: { type: Number, default: 220 },
})
const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const inputEl = ref(null)
const open = ref(false)
const focused = ref(false)
const query = ref('')
const results = ref([])
const loading = ref(false)
const activeIdx = ref(0)
const popoverStyle = ref({})
let debounceTimer = null

// What we show in the input:
//   - if user is typing (query non-empty), show query
//   - else if a value is selected, show selectedLabel
//   - else empty
const display = ref('')
watch([() => props.modelValue, () => props.selectedLabel, query], () => {
  if (focused.value && query.value !== '') display.value = query.value
  else if (props.modelValue) display.value = props.selectedLabel || ''
  else display.value = query.value
}, { immediate: true })

const onInput = (e) => {
  const v = e.target.value
  display.value = v
  query.value = v
  if (debounceTimer) clearTimeout(debounceTimer)
  if (v.trim().length < props.minChars) {
    results.value = []
    open.value = false
    return
  }
  loading.value = true
  open.value = true
  positionPopover()
  debounceTimer = setTimeout(async () => {
    try {
      const r = await props.search(v.trim())
      results.value = Array.isArray(r) ? r : []
      activeIdx.value = 0
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, props.debounceMs)
}

const onFocus = () => {
  focused.value = true
  if (query.value || results.value.length) {
    open.value = true
    positionPopover()
  }
}
const onBlur = () => {
  focused.value = false
  // Defer so click on a list item still fires
  setTimeout(() => {
    open.value = false
    if (props.modelValue) display.value = props.selectedLabel || ''
    else display.value = ''
    query.value = ''
  }, 140)
}

const select = (item) => {
  emit('update:modelValue', item.id)
  emit('change', item)
  display.value = item.full_name || item.label || ''
  query.value = ''
  open.value = false
  inputEl.value?.blur()
}

const clear = () => {
  emit('update:modelValue', null)
  emit('change', null)
  display.value = ''
  query.value = ''
}

const onKey = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!open.value) { open.value = true; positionPopover() }
    activeIdx.value = (activeIdx.value + 1) % Math.max(1, results.value.length)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = (activeIdx.value - 1 + results.value.length) % Math.max(1, results.value.length)
  } else if (e.key === 'Enter') {
    if (results.value[activeIdx.value]) {
      e.preventDefault()
      select(results.value[activeIdx.value])
    }
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

const positionPopover = () => {
  const t = inputEl.value?.parentElement
  if (!t) return
  const r = t.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  const placeBelow = below >= 220 || below >= r.top
  popoverStyle.value = {
    position: 'fixed',
    left: r.left + 'px',
    top: placeBelow ? (r.bottom + 4) + 'px' : 'auto',
    bottom: placeBelow ? 'auto' : (window.innerHeight - r.top + 4) + 'px',
    width: r.width + 'px',
    maxHeight: '260px',
    '--hr-pop-origin': placeBelow ? 'top' : 'bottom',
  }
}

const initials = (item) => {
  const s = item.full_name || item.label || item.email || '?'
  return s.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}
const avatarColor = (item) => {
  const s = String(item.id || item.email || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xfff
  return `hsl(${h % 360}, 60%, 38%)`
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.hr-cb { display: block; position: relative; }
.hr-cb-shell {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--hr-input-height);
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 10px;
  padding: 0 12px;
  transition: background 200ms var(--hr-spring),
              border-color 200ms var(--hr-spring),
              box-shadow 220ms var(--hr-spring);
}
.hr-cb-shell:hover:not(.disabled):not(.focused) {
  background: var(--hr-input-bg-hover);
  border-color: var(--hr-input-border-hover);
}
.hr-cb-shell.focused {
  background: var(--hr-input-bg-focus);
  border-color: var(--hr-input-border-focus);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.10);
}
.hr-cb-shell.error { border-color: var(--hr-input-error); background: var(--hr-input-error-soft); }
.hr-cb-shell.disabled { opacity: 0.6; cursor: not-allowed; }

.cb-ic { color: var(--hr-text-muted); flex-shrink: 0; }
.hr-cb-shell.focused .cb-ic { color: var(--hr-accent-gold); }

.hr-cb-input {
  flex: 1; min-width: 0;
  background: transparent;
  border: 0; outline: none;
  color: var(--hr-input-text);
  font-size: 13px;
  font-family: inherit;
}
.hr-cb-input::placeholder { color: var(--hr-input-placeholder); }

.cb-clear {
  width: 18px; height: 18px;
  background: rgba(255,255,255,0.06);
  border: 0; border-radius: 6px;
  color: var(--hr-text-muted);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 150ms;
}
.cb-clear:hover { background: rgba(239, 68, 68, 0.18); color: #ef4444; }

.cb-spin { color: var(--hr-accent-gold); animation: hr-rotate-conic 0.8s linear infinite; flex-shrink: 0; }

/* Popover */
.hr-cb-popover {
  z-index: 1400;
  background: var(--hr-surface-deep);
  border: 1px solid var(--hr-border-strong);
  border-radius: 12px;
  box-shadow: 0 22px 56px -22px rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  overflow: hidden;
  transform-origin: var(--hr-pop-origin, top) left;
}
.cb-list { list-style: none; margin: 0; padding: 4px; overflow-y: auto; max-height: inherit; }
.cb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 120ms;
}
.cb-item:hover, .cb-item.active { background: rgba(251, 191, 36, 0.08); }
.cb-item.selected { background: var(--hr-accent-gold-soft); }

.cb-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}
.cb-avatar img { width: 100%; height: 100%; object-fit: cover; }

.cb-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.cb-name { font-size: 12.5px; font-weight: 600; color: var(--hr-text); }
.cb-meta { font-size: 11px; color: var(--hr-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cb-check { color: var(--hr-accent-gold); flex-shrink: 0; }

.cb-empty {
  padding: 14px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--hr-text-dim);
}

.hr-pop-enter-active, .hr-pop-leave-active {
  transition: opacity 180ms var(--hr-spring), transform 220ms var(--hr-spring);
}
.hr-pop-enter-from, .hr-pop-leave-to { opacity: 0; transform: scale(0.96); }

.hr-input-error-text {
  color: var(--hr-input-error);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 4px;
  font-weight: 500;
}
</style>
