<template>
  <div class="user-filter-select" v-click-outside="close">
    <!-- Trigger Button -->
    <div 
      class="filter-trigger" 
      :class="{ 'is-open': isOpen }"
      @click="toggle"
    >
      <User :size="14" class="user-icon" />
      <span v-if="selectedUser" class="selected-text">{{ selectedUser.full_name }}</span>
      <span v-else class="placeholder">All Project Owners</span>
      <ChevronDown class="chevron" :class="{ rotate: isOpen }" :size="14" />
    </div>

    <!-- Options Menu -->
    <transition name="dropdown">
      <div v-if="isOpen" class="options-menu">
        <!-- Search -->
        <div class="search-box">
          <Search :size="14" class="search-icon" />
          <input 
            ref="searchInput"
            v-model="searchQuery" 
            placeholder="Search owners..." 
            class="search-input"
            @click.stop
          />
        </div>

        <!-- List -->
        <ul class="options-list">
          <!-- All Users Option -->
          <li 
            class="option-item all-users"
            :class="{ selected: !modelValue }"
            @click="selectUser(null)"
          >
            <span>All Project Owners</span>
            <Check v-if="!modelValue" :size="14" class="check-icon" />
          </li>
          
          <li 
            v-for="user in filteredUsers" 
            :key="user.id" 
            class="option-item"
            :class="{ selected: modelValue === user.id }"
            @click="selectUser(user)"
          >
            <div class="user-info">
              <span class="user-name">{{ user.full_name }}</span>
            </div>
            <Check v-if="modelValue === user.id" :size="14" class="check-icon" />
          </li>
          
          <li v-if="filteredUsers.length === 0 && searchQuery" class="no-results">
            No users found
          </li>
          
          <li v-if="isLoading" class="loading-state">
            <Loader2 :size="16" class="spin" />
            <span>Loading owners...</span>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ChevronDown, Search, Check, User, Loader2 } from 'lucide-vue-next'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const users = ref([])
const isLoading = ref(false)

// Computed
const selectedUser = computed(() => {
  if (!props.modelValue) return null
  return users.value.find(u => u.id === props.modelValue)
})

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u => 
    u.full_name.toLowerCase().includes(q)
  )
})

// Actions
const fetchUsers = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token')
    // Corrected endpoint for Owners
    const res = await axios.get(`${API}/team/owners`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = res.data
  } catch (e) {
    console.error('Failed to fetch project owners:', e)
  } finally {
    isLoading.value = false
  }
}

const toggle = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => searchInput.value?.focus())
  }
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const selectUser = (user) => {
  const userId = user ? user.id : null
  emit('update:modelValue', userId)
  emit('change', user)
  close()
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

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-filter-select {
  position: relative;
  min-width: 180px;
}

.filter-trigger {
  height: 36px; /* Matched height */
  background: #1c1c1e;
  border: 1px solid #3a3a3c;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.filter-trigger:hover {
  background: #2c2c2e;
  border-color: #52525b;
}

.filter-trigger.is-open {
  border-color: #3b82f6;
  background: #1a1a1c;
}

.user-icon {
  color: #8e8e93;
}

.selected-text {
  font-size: 13px;
  color: #f5f5f5;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.placeholder {
  font-size: 13px;
  color: #8e8e93;
}

.chevron {
  color: #6e6e73;
  transition: transform 0.2s;
  margin-left: auto;
}

.chevron.rotate {
  transform: rotate(180deg);
}

/* Options Menu */
.options-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 240px;
  background: #1c1c1e;
  border: 1px solid #3a3a3c;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  z-index: 200;
  overflow: hidden;
  max-height: 320px;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 10px;
  border-bottom: 1px solid #3a3a3c;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #6e6e73;
}

.search-input {
  width: 100%;
  background: #2c2c2e;
  border: none;
  padding: 8px 8px 8px 32px;
  border-radius: 6px;
  color: #f5f5f5;
  font-size: 13px;
  outline: none;
}

.search-input::placeholder {
  color: #6e6e73;
}

.options-list {
  list-style: none;
  overflow-y: auto;
  padding: 6px;
  margin: 0;
}

/* Scrollbar */
.options-list::-webkit-scrollbar {
  width: 6px;
}
.options-list::-webkit-scrollbar-thumb {
  background: #3a3a3c;
  border-radius: 3px;
}

.option-item {
  padding: 10px 12px;
  font-size: 13px;
  color: #f5f5f5;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.15s;
}

.option-item:hover {
  background: #2c2c2e;
}

.option-item.selected {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.option-item.all-users {
  border-bottom: 1px solid #3a3a3c;
  margin-bottom: 4px;
  padding-bottom: 10px;
  font-weight: 500;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
}

.check-icon {
  color: #3b82f6;
}

.no-results, .loading-state {
  padding: 16px;
  font-size: 13px;
  color: #6e6e73;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Animations */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ─── Light theme overrides ─────────────────────────────────────────────── */
[data-theme="light"] .filter-trigger {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .filter-trigger:hover {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .filter-trigger.is-open {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(217, 119, 6, 0.45);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .options-menu {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.12);
  box-shadow: 0 20px 50px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .search-box { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .search-input {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
}
[data-theme="light"] .search-input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .search-icon { color: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .option-item { color: var(--text-primary); }
[data-theme="light"] .option-item:hover { background: rgba(217, 119, 6, 0.10); }
[data-theme="light"] .option-item.selected {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .option-item.all-users { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .check-icon { color: #d97706; }
[data-theme="light"] .selected-text { color: var(--text-primary); }
[data-theme="light"] .placeholder { color: var(--text-placeholder); }
[data-theme="light"] .user-icon { color: var(--text-secondary); }
[data-theme="light"] .chevron { color: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .no-results,
[data-theme="light"] .loading-state { color: #6b5840; }
</style>
