<template>
  <div class="sla-select-wrapper" ref="wrapperRef">
    <div 
      class="sla-select-trigger" 
      :class="{ 'is-open': isOpen }" 
      @click="toggle"
    >
      <span class="selected-text" :class="{'is-placeholder': !displayLabel}">
        {{ displayLabel || placeholder }}
      </span>
      <ChevronDown class="chevron" :class="{ 'rotate': isOpen }" :size="16" />
    </div>

    <!-- Teleport dropdown to body to prevent clipping -->
    <Teleport to="body">
      <transition name="fade-slide">
        <div 
          v-if="isOpen" 
          class="sla-select-dropdown" 
          :style="dropdownStyles"
          ref="dropdownRef"
        >
          <ul class="sla-options-list">
            <li 
              v-for="(option, index) in normalizedOptions" 
              :key="index"
              class="sla-option-item"
              :class="{ 'selected': isSelected(option) }"
              @click.stop="selectOption(option)"
            >
              {{ option.label }}
              <Check v-if="isSelected(option)" class="check-icon" :size="14" />
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true }, // Array of strings or objects {label, value}
  placeholder: { type: String, default: 'Select an option' }
})
const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const wrapperRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyles = ref({})

const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { label: String(opt), value: opt }
    }
    return opt
  })
})

const displayLabel = computed(() => {
  const selected = normalizedOptions.value.find(opt => opt.value === props.modelValue)
  return selected ? selected.label : ''
})

const isSelected = (option) => option.value === props.modelValue

const toggle = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    calculatePosition()
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)
  } else {
    cleanup()
  }
}

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
  cleanup()
}

const calculatePosition = () => {
  if (!wrapperRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  dropdownStyles.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`
  }
}

const handleClickOutside = (event) => {
  if (
    wrapperRef.value && !wrapperRef.value.contains(event.target) &&
    dropdownRef.value && !dropdownRef.value.contains(event.target)
  ) {
    isOpen.value = false
    cleanup()
  }
}

const cleanup = () => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', calculatePosition, true)
  window.removeEventListener('resize', calculatePosition)
}

onUnmounted(cleanup)
</script>

<style scoped>
.sla-select-wrapper {
  position: relative;
  width: 100%;
}

.sla-select-trigger {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

/* Specific adjustment for when it's used as `.design-select` in header */
.design-select .sla-select-trigger {
  background: rgba(255, 255, 255, 0.05);
  min-height: 38px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 6px;
}

.sla-select-trigger:hover {
  border-color: rgba(255, 235, 59, 0.3);
}

.sla-select-trigger.is-open {
  border-color: #ffeb3b;
  box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.1);
}

/* Specific adjustment for when it's used as `.table-select` in a matrix grid */
.table-select .sla-select-trigger {
  background: transparent;
  border: 1px solid transparent;
  min-height: 38px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  box-sizing: border-box;
}

.table-select .sla-select-trigger:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: transparent;
}

.table-select .sla-select-trigger.is-open {
  background: rgba(0, 0, 0, 0.5);
  border-color: #ffeb3b;
  box-shadow: none;
}

.selected-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 12px;
}

.is-placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.chevron {
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.3s;
  flex-shrink: 0;
}

.chevron.rotate {
  transform: rotate(180deg);
  color: #ffeb3b;
}

/* Teleported Dropdown Global Styles */
.sla-select-dropdown {
  position: fixed;
  z-index: 999999;
  background: #000;
  border: 1px solid rgba(255, 235, 59, 0.2);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 6px;
  max-height: 250px;
  overflow-y: auto;
}

/* Scrollbar styling */
.sla-select-dropdown::-webkit-scrollbar { width: 4px; }
.sla-select-dropdown::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }

.sla-options-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sla-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.1s;
}

.sla-option-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.sla-option-item.selected {
  background: rgba(255, 235, 59, 0.1);
  color: #ffeb3b;
  font-weight: 500;
}

.check-icon {
  color: #ffeb3b;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ═══════════ LIGHT THEME OVERRIDES — trigger ═══════════ */
[data-theme="light"] .sla-select-trigger {
  background: rgba(255, 250, 240, 0.92);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #1a1410;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .sla-select-trigger:hover {
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .sla-select-trigger.is-open {
  border-color: #d97706;
  background: #fffaf0;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .is-placeholder { color: rgba(120, 53, 15, 0.45); }
[data-theme="light"] .chevron { color: #92400e; }
[data-theme="light"] .chevron.rotate { color: #b45309; }

[data-theme="light"] .design-select .sla-select-trigger {
  background: rgba(255, 250, 240, 0.85);
}
[data-theme="light"] .table-select .sla-select-trigger {
  background: transparent;
  color: #1a1410;
}
[data-theme="light"] .table-select .sla-select-trigger:hover {
  background: rgba(245, 158, 11, 0.10);
}
[data-theme="light"] .table-select .sla-select-trigger.is-open {
  background: rgba(255, 250, 240, 0.92);
  border-color: #d97706;
}
</style>

<!--
  NON-SCOPED block: the dropdown popup is <Teleport>'d to <body>, so
  scoped CSS won't reach it. Theme it globally via :root[data-theme="light"].
-->
<style>
:root[data-theme="light"] .sla-select-dropdown {
  background: rgba(255, 250, 240, 0.96) !important;
  border: 1px solid rgba(217, 119, 6, 0.28) !important;
  box-shadow:
    0 10px 40px rgba(180, 83, 9, 0.22),
    0 0 0 1px rgba(217, 119, 6, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
}
:root[data-theme="light"] .sla-select-dropdown::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.32) !important;
}
:root[data-theme="light"] .sla-select-dropdown .sla-option-item {
  color: #1a1410 !important;
}
:root[data-theme="light"] .sla-select-dropdown .sla-option-item:hover {
  background: rgba(245, 158, 11, 0.16) !important;
  color: #78350f !important;
}
:root[data-theme="light"] .sla-select-dropdown .sla-option-item.selected {
  background: rgba(245, 158, 11, 0.22) !important;
  color: #92400e !important;
  font-weight: 600 !important;
}
:root[data-theme="light"] .sla-select-dropdown .check-icon {
  color: #b45309 !important;
}
</style>
