<template>
  <div class="user-selector" v-click-outside="close">
    <div class="selector-trigger" :class="{ 'is-active': isOpen, 'has-value': modelValue }" @click="toggle">
      <div class="trigger-content">
        <div v-if="selectedUser" class="selected-avatar">
          <img v-if="selectedUser.avatar_url" :src="selectedUser.avatar_url" :alt="selectedUser.full_name" />
          <div v-else class="avatar-placeholder">{{ selectedUser.full_name.charAt(0) }}</div>
        </div>
        <div v-else class="trigger-icon">
          <UserPlus :size="18" />
        </div>
        <div class="trigger-text">
          <span v-if="selectedUser" class="user-name">{{ selectedUser.full_name }}</span>
          <span v-else class="placeholder">{{ placeholder }}</span>
          <span v-if="selectedUser" class="user-email">{{ selectedUser.email }}</span>
        </div>
      </div>
      <ChevronDown class="chevron" :class="{ rotate: isOpen }" :size="16" />
    </div>

    <transition name="scale-fade">
      <div v-if="isOpen" class="selector-dropdown">
        <div class="search-wrapper">
          <Search :size="16" class="search-icon" />
          <input 
            ref="searchInput"
            v-model="searchQuery" 
            placeholder="Search team members..." 
            @click.stop
          />
        </div>

        <div class="options-container">
          <div v-if="loading" class="loading-state">
            <Loader2 :size="20" class="spin" />
          </div>
          <div v-else-if="filteredUsers.length === 0" class="empty-state">
            No users found matching "{{ searchQuery }}"
          </div>
          <div 
            v-for="user in filteredUsers" 
            :key="user.id" 
            class="user-option"
            :class="{ 'is-selected': modelValue === user.id }"
            @click="select(user)"
          >
            <div class="option-avatar">
              <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.full_name" />
              <div v-else class="avatar-placeholder">{{ user.full_name.charAt(0) }}</div>
            </div>
            <div class="option-info">
              <div class="info-name">{{ user.full_name }}</div>
              <div class="info-meta">
                <span class="meta-email">{{ user.email }}</span>
                <span v-if="user.job_title" class="meta-dot"></span>
                <span v-if="user.job_title" class="meta-job">{{ user.job_title }}</span>
              </div>
            </div>
            <div v-if="modelValue === user.id" class="selected-check">
              <Check :size="16" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { UserPlus, ChevronDown, Search, Loader2, Check } from 'lucide-vue-next'
import axios from 'axios'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: { type: String, default: null },
  placeholder: { type: String, default: 'Select assignee' },
  excludeIds: { type: Array, default: () => [] },
  excludeAdmins: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const users = ref([])
const loading = ref(false)

const selectedUser = computed(() => users.value.find(u => u.id === props.modelValue))

const filteredUsers = computed(() => {
  let list = users.value
  if (props.excludeIds.length > 0) {
    list = list.filter(u => !props.excludeIds.includes(u.id))
  }
  if (props.excludeAdmins) {
    list = list.filter(u => !u.is_superuser)
  }
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(u => 
    u.full_name.toLowerCase().includes(q) || 
    u.email.toLowerCase().includes(q)
  )
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    const res = await axios.get(`${API}/tasks/users/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = res.data
  } catch (e) {
    console.error('Failed to fetch users:', e)
  } finally {
    loading.value = false
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

const select = (user) => {
  emit('update:modelValue', user.id)
  emit('change', user)
  close()
}

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

onMounted(fetchUsers)
</script>

<style scoped>
.user-selector {
  position: relative;
  width: 100%;
}

.selector-trigger {
  height: 64px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.selector-trigger:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(250, 204, 21, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.selector-trigger.is-active {
  border-color: #facc15;
  background: rgba(250, 204, 21, 0.05);
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.1);
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-avatar, .avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #facc15;
  color: #1c1c1e;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(250, 204, 21, 0.3);
}

.selected-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.trigger-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc15;
}

.trigger-text {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #facc15;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.placeholder {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}

.chevron {
  color: rgba(255, 255, 255, 0.3);
  transition: transform 0.3s;
}

.chevron.rotate {
  transform: rotate(180deg);
  color: #facc15;
}

.selector-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  right: 0;
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.search-wrapper {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.search-icon {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: #facc15;
}

.search-wrapper input {
  width: 100%;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0 12px 0 40px;
  color: white;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-wrapper input:focus {
  border-color: rgba(250, 204, 21, 0.5);
  background: rgba(250, 204, 21, 0.02);
}

.options-container {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px;
}

.options-container::-webkit-scrollbar {
  width: 6px;
}

.options-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.user-option {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.user-option:hover {
  background: rgba(255, 255, 255, 0.05);
}

.user-option.is-selected {
  background: rgba(250, 204, 21, 0.1);
}

.option-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  background: #2c2c2e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.info-name {
  font-size: 14px;
  font-weight: 500;
  color: white;
}

.info-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.meta-job {
  font-size: 11px;
  color: #facc15;
  opacity: 0.8;
}

.selected-check {
  color: #facc15;
}

.loading-state, .empty-state {
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
  color: #facc15;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scale-fade-enter-active, .scale-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-fade-enter-from, .scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

/* ═════════ LIGHT THEME — warm cream glass, preserves yellow palette ═════════ */
[data-theme="light"] .selector-trigger {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .selector-trigger:hover {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 6px 18px rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .selector-trigger.is-active {
  border-color: #d97706;
  background: rgba(250, 204, 21, 0.10);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .selected-avatar,
[data-theme="light"] .avatar-placeholder { background: #facc15; color: #1a0f00; }
[data-theme="light"] .trigger-icon {
  background: rgba(40, 25, 10, 0.06);
  color: #b45309;
}
[data-theme="light"] .user-name { color: #b45309; }
[data-theme="light"] .user-email { color: var(--text-secondary); }
[data-theme="light"] .placeholder { color: var(--text-tertiary); }
[data-theme="light"] .chevron { color: var(--text-secondary); }
[data-theme="light"] .chevron.rotate { color: #b45309; }

/* Dropdown — was solid #1c1c1e, now cream glass */
[data-theme="light"] .selector-dropdown {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.95), rgba(252, 240, 220, 0.85));
  border: 1px solid rgba(217, 119, 6, 0.24);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: 0 20px 50px rgba(40, 25, 10, 0.25);
}
[data-theme="light"] .search-wrapper { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .search-icon { color: #b45309; }
[data-theme="light"] .search-wrapper input {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--text-primary);
}
[data-theme="light"] .search-wrapper input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .search-wrapper input:focus {
  border-color: #d97706;
  background: rgba(250, 204, 21, 0.08);
}
[data-theme="light"] .options-container::-webkit-scrollbar-thumb { background: rgba(40, 25, 10, 0.18); }
[data-theme="light"] .user-option:hover { background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .user-option.is-selected { background: rgba(250, 204, 21, 0.14); }
[data-theme="light"] .option-avatar { background: rgba(40, 25, 10, 0.10); color: var(--text-primary); }
[data-theme="light"] .info-name { color: var(--text-primary); }
[data-theme="light"] .meta-email { color: var(--text-tertiary); }
[data-theme="light"] .meta-dot { background: rgba(40, 25, 10, 0.25); }
[data-theme="light"] .meta-job { color: #b45309; }
[data-theme="light"] .selected-check { color: #b45309; }
[data-theme="light"] .loading-state,
[data-theme="light"] .empty-state { color: var(--text-secondary); }
[data-theme="light"] .spin { color: #b45309; }
</style>
