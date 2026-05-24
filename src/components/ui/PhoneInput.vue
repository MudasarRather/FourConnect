<template>
  <div class="phone-input-group" :class="{ 'has-error': error }">
    <!-- Country Code Select -->
    <div class="code-select" v-click-outside="close">
      <div class="code-trigger" @click="toggle">
        <span v-if="selectedCountry" class="flag">{{ selectedCountry.flag }}</span>
        <span class="curr-code">{{ selectedCountry ? selectedCountry.dial_code : '+1' }}</span>
        <ChevronDown class="chevron" :size="12" />
      </div>

      <transition name="dropdown">
        <div v-if="isOpen" class="code-dropdown">
           <div class="search-box">
             <input 
              v-model="searchQuery" 
              placeholder="Search..." 
              class="search-input"
              ref="searchInput"
             />
           </div>
           <ul class="country-list">
             <li 
               v-for="c in filteredCountries" 
               :key="c.code" 
               class="country-item"
               @click="selectCountry(c)"
             >
               <span class="flag">{{ c.flag }}</span>
               <span class="name">{{ c.name }}</span>
               <span class="code">{{ c.dial_code }}</span>
             </li>
           </ul>
        </div>
      </transition>
    </div>

    <!-- Phone Number Input -->
    <input 
      type="tel" 
      :value="modelValue"
      @input="handleInput"
      @keypress="onlyNumbers"
      :placeholder="placeholder"
      :maxlength="maxDigits"
      class="number-input"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { Country } from 'country-state-city'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: String,
  countryCode: String, // isoCode 'US', 'IN' etc
  error: Boolean
})

const emit = defineEmits(['update:modelValue', 'update:countryCode'])

const isOpen = ref(false)
const searchQuery = ref('')
const allCountries = ref([])
const selectedCountry = ref(null)
const maxDigits = ref(10)

// Country max digits mapping from API
const countryMaxDigits = ref({
  'US': 10, 'CA': 10, 'GB': 11, 'IN': 10, 'AU': 9,
  'DE': 11, 'FR': 9, 'JP': 10, 'CN': 11, 'BR': 11,
  'MX': 10, 'RU': 10, 'ZA': 9, 'AE': 9, 'SG': 8
})

const placeholder = computed(() => {
  return '0'.repeat(maxDigits.value).replace(/(.{3})/g, '$1 ').trim()
})

onMounted(async () => {
  // Try to fetch from API first
  try {
    const response = await axios.get('http://localhost:8000/api/auth/country-codes')
    const apiCountries = response.data
    
    // Merge with country-state-city for flags
    const csCountries = Country.getAllCountries()
    allCountries.value = apiCountries.map(ac => {
      const csc = csCountries.find(c => c.isoCode === ac.code)
      return {
        ...ac,
        isoCode: ac.code,
        flag: csc?.flag || '🏳️'
      }
    })
    
    // Update max digits from API
    apiCountries.forEach(c => {
      countryMaxDigits.value[c.code] = c.max_digits
    })
  } catch (err) {
    // Fallback to country-state-city
    allCountries.value = Country.getAllCountries().map(c => ({
      name: c.name,
      code: c.isoCode,
      isoCode: c.isoCode,
      dial_code: c.phonecode.startsWith('+') ? c.phonecode : `+${c.phonecode}`,
      flag: c.flag
    }))
  }
  
  // Set default or initial
  if (props.countryCode) {
    selectedCountry.value = allCountries.value.find(c => c.code === props.countryCode || c.isoCode === props.countryCode)
  }
  if (!selectedCountry.value) {
    selectedCountry.value = allCountries.value.find(c => c.code === 'US' || c.isoCode === 'US')
  }
  
  updateMaxDigits()
  emit('update:countryCode', selectedCountry.value?.code || selectedCountry.value?.isoCode || 'US')
})

const updateMaxDigits = () => {
  const code = selectedCountry.value?.code || selectedCountry.value?.isoCode || 'US'
  maxDigits.value = countryMaxDigits.value[code] || 10
}

watch(() => selectedCountry.value, () => {
  updateMaxDigits()
})

const filteredCountries = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return allCountries.value.filter(c => 
    c.name.toLowerCase().includes(q) || (c.dial_code || '').includes(q)
  )
})

const toggle = () => isOpen.value = !isOpen.value
const close = () => isOpen.value = false

const selectCountry = (c) => {
  selectedCountry.value = c
  emit('update:countryCode', c.code || c.isoCode)
  // Clear phone if longer than new max
  if (props.modelValue && props.modelValue.length > (countryMaxDigits.value[c.code] || 10)) {
    emit('update:modelValue', props.modelValue.slice(0, countryMaxDigits.value[c.code] || 10))
  }
  close()
}

// Only allow numbers
const onlyNumbers = (e) => {
  if (!/[0-9]/.test(e.key)) {
    e.preventDefault()
  }
}

// Handle input and filter non-numeric
const handleInput = (e) => {
  let value = e.target.value.replace(/\D/g, '') // Remove non-digits
  if (value.length > maxDigits.value) {
    value = value.slice(0, maxDigits.value)
  }
  emit('update:modelValue', value)
}

// Click outside directive
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  }
}
</script>

<style scoped>
.phone-input-group {
  display: flex;
  width: 100%;
  height: 40px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.phone-input-group:focus-within {
  border-color: var(--input-focus);
  background: var(--input-bg-focus);
}

.phone-input-group.has-error {
  border-color: #ff453a;
  background: rgba(255, 69, 58, 0.05);
}

.code-select {
  position: relative;
  width: 90px;
  border-right: 1px solid var(--input-border);
}

.code-trigger {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  padding: 0 6px;
  color: var(--text-primary);
  font-size: 12px;
}

.flag { font-size: 14px; }

.code-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 260px;
  background: #1c1c1e;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  z-index: 101;
  overflow: hidden;
  max-height: 220px;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 8px;
  border-bottom: 1px solid var(--input-border);
}
.search-input {
  width: 100%;
  background: #2c2c2e;
  border: none;
  padding: 6px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  outline: none;
}

.country-list {
  list-style: none;
  overflow-y: auto;
}
.country-list::-webkit-scrollbar { width: 6px; }
.country-list::-webkit-scrollbar-thumb { background: #3a3a3c; }

.country-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
}
.country-item:hover { background: #2c2c2e; }
.country-item .name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.country-item .code { color: var(--text-secondary); font-size: 11px; }

.number-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-primary);
  outline: none;
}
.number-input::placeholder { color: var(--text-placeholder); }

/* Transitions */
.dropdown-enter-active, .dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ─── Light theme overrides ────────────────────────────────────────────── */
[data-theme="light"] .phone-input-group.has-error {
  background: rgba(220, 38, 38, 0.06);
}
[data-theme="light"] .code-dropdown {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow: 0 20px 50px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .search-box {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .search-input {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
}
[data-theme="light"] .search-input::placeholder {
  color: var(--text-placeholder);
}
[data-theme="light"] .country-list::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .country-item:hover {
  background: rgba(217, 119, 6, 0.10);
}
</style>
