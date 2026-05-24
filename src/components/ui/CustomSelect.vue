<template>
  <div class="cs-select-container" ref="triggerRef">
    
    <!-- Trigger Button -->
    <div 
      class="cs-trigger" 
      :class="{ 'is-open': isOpen, 'has-error': error }"
      @click="toggle"
    >
      <span v-if="modelValue || modelValue === 0" class="cs-selected-text">{{ getLabel(modelValue, true) }}</span>
      <span v-else class="cs-placeholder">{{ placeholder }}</span>
      <ChevronDown class="cs-chevron" :class="{ rotate: isOpen }" :size="16" />
    </div>

    <!-- Teleported Options Menu -->
    <Teleport to="body">
      <transition name="dropdown">
        <div 
          v-if="isOpen" 
          class="cs-options-menu" 
          :style="dropdownStyle"
          ref="dropdownRef"
          @click.stop
        >
          <!-- Search -->
          <div v-if="searchable" class="cs-search-box">
            <Search :size="14" class="cs-search-icon" />
            <input 
              ref="searchInput"
              v-model="searchQuery" 
              placeholder="Search..." 
              class="cs-search-input"
            />
          </div>

          <!-- List -->
          <ul class="cs-options-list">
            <li 
              v-for="option in filteredOptions" 
              :key="getKey(option)" 
              class="cs-option-item"
              :class="{ selected: isSelected(option) }"
              @click="select(option)"
            >
              {{ getLabel(option) }}
              <Check v-if="isSelected(option)" :size="14" class="cs-check-icon" />
            </li>
            <li v-if="filteredOptions.length === 0" class="cs-no-results">
              No results found
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ChevronDown, Search, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: [String, Number, Object],
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
  labelKey: { type: String, default: 'name' },
  triggerLabelKey: { type: String, default: null }, // Optional: use different key for trigger
  valueKey: { type: String, default: 'isoCode' }, 
  searchable: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const triggerRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})

const getKey = (option) => {
  if (option === null || option === undefined) return null
  if (typeof option === 'object') return option[props.valueKey]
  return option
}

const getLabel = (optionOrValue, isTrigger = false) => {
  if (optionOrValue === null || optionOrValue === undefined) return ''
  
  // Determine which key to use for identifying labels
  const labelKey = (isTrigger && props.triggerLabelKey) ? props.triggerLabelKey : props.labelKey

  // Case 1: Simple Array of primitives (e.g. [0, 5, 12, 18])
  if (props.options.length && typeof props.options[0] !== 'object') {
     return optionOrValue 
  }

  // Case 2: Input is the Object itself
  if (typeof optionOrValue === 'object') {
    return optionOrValue[labelKey]
  }

  // Case 3: Input is a primitive value (ID/Code) -> Find it in options
  // Use loose equality (==) for string/number safety
  const found = props.options.find(o => o[props.valueKey] == optionOrValue)
  if (found) return found[labelKey]

  // Fallback: If not found, show the value or placeholder behavior (usually shouldn't happen if valid)
  return optionOrValue
}

const isSelected = (option) => {
  const optVal = getKey(option)
  if (optVal === undefined || props.modelValue === undefined) return false
  return props.modelValue == optVal
}

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(opt => {
    const label = typeof opt === 'object' ? opt[props.labelKey] : String(opt)
    return label.toLowerCase().includes(q)
  })
})

// Positioning Logic
const updatePosition = () => {
  if (!isOpen.value || !triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  
  // Default: Bottom Left aligned with trigger, width matching trigger
  let top = rect.bottom + 6
  let left = rect.left
  let width = rect.width
  
  // Bounds check (Flip up if at bottom)
  const dropdownHeight = dropdownRef.value ? dropdownRef.value.offsetHeight : 200
  if (top + dropdownHeight > window.innerHeight) {
    top = rect.top - dropdownHeight - 6 
  }


  // Adjust z-index to be super high
  dropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    zIndex: 99999,
    maxHeight: '220px'
  }
}

const toggle = async () => {
  if (isOpen.value) {
    close()
  } else {
    isOpen.value = true
    await nextTick()
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('click', handleClickOutside)
    if (props.searchable) searchInput.value?.focus()
  }
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  document.removeEventListener('click', handleClickOutside)
}

const select = (option) => {
  const val = getKey(option)
  emit('update:modelValue', val)
  emit('change', option)
  close()
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target) && !triggerRef.value.contains(e.target)) {
    close()
  }
}
</script>

<style>
/* Global Styles for Teleported Dropdown (Not Scoped) */
.cs-select-container {
  position: relative;
  width: 100%;
}

.cs-trigger {
  width: 100%;
  height: 42px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.cs-trigger.is-open {
  border-color: #F59E0B;
  background: rgba(255,255,255,0.05);
}

.cs-trigger.has-error {
  border-color: #ff453a;
}

.cs-selected-text {
  font-size: 14px;
  color: #f5f5f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cs-placeholder {
  font-size: 14px;
  color: #6e6e73;
}

.cs-chevron {
  color: rgba(255,255,255,0.4);
  transition: transform 0.2s;
}

.cs-chevron.rotate {
  transform: rotate(180deg);
}

/* Dropdown Menu (Fixed Position in Body) */
.cs-options-menu {
  background: #18181b; /* Zinc-950 - Dark Theme */
  border: 1px solid #27272a; /* Zinc-800 */
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.7);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 99999 !important;
  color: #f4f4f5; /* Zinc-100 Text */
}

.cs-search-box {
  padding: 10px;
  border-bottom: 1px solid #27272a;
  position: relative;
  background: #18181b;
}

.cs-search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #71717a; /* Zinc-500 */
}

.cs-search-input {
  width: 100%;
  background: #27272a;
  border: none;
  padding: 8px 8px 8px 32px;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 13px;
  outline: none;
}

.cs-options-list {
  list-style: none;
  overflow-y: auto;
  padding: 6px;
  max-height: 220px;
  background: #18181b;
}

.cs-options-list::-webkit-scrollbar { width: 4px; }
.cs-options-list::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }

.cs-option-item {
  padding: 10px 12px;
  font-size: 13px;
  color: #a1a1aa; /* Zinc-400 */
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.1s;
}

.cs-option-item:hover {
  background: #27272a; /* Zinc-800 */
  color: #ffffff;
}

.cs-option-item.selected {
  background: rgba(245, 158, 11, 0.15); /* Amber with opacity */
  color: #F59E0B; /* Amber-500 */
}

.cs-check-icon {
  color: #F59E0B;
}

.cs-no-results {
  padding: 12px;
  font-size: 13px;
  color: #52525b;
  text-align: center;
}

/* Animations */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ─── Light theme overrides ─────────────────────────────────────────────
   <style> is non-scoped so these selectors are global. The popover is
   teleported to body but [data-theme] sits on <html> so the cascade reaches it.
   ─────────────────────────────────────────────────────────────────────── */
[data-theme="light"] .cs-trigger {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .cs-trigger:hover {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .cs-trigger.is-open {
  background: rgba(255, 246, 226, 0.95);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .cs-selected-text { color: var(--text-primary); }
[data-theme="light"] .cs-chevron { color: #92400e; }
[data-theme="light"] .cs-placeholder { color: rgba(26, 20, 16, 0.65); }
[data-theme="light"] .cs-options-menu,
[data-theme="light"] .cs-options-list {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow: 0 22px 56px rgba(40, 25, 10, 0.28);
  color: var(--text-primary);
}
[data-theme="light"] .cs-search-box {
  background: rgba(40, 25, 10, 0.04);
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .cs-search-input {
  background: transparent;
  color: var(--text-primary);
}
[data-theme="light"] .cs-search-input::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .cs-option-item {
  color: var(--text-secondary);
}
[data-theme="light"] .cs-option-item:hover {
  background: rgba(217, 119, 6, 0.12);
  color: var(--text-primary);
}
[data-theme="light"] .cs-option-item.selected,
[data-theme="light"] .cs-option-item.is-selected {
  background: rgba(217, 119, 6, 0.18);
  color: #92400e;
}
[data-theme="light"] .cs-empty { color: var(--text-secondary); }
</style>
