<template>
  <div class="participant-selector">
    <div class="selector-header">
      <div class="header-main">
        <Users :size="16" class="icon" />
        <span>{{ label }}</span>
      </div>
      <div class="participant-count" v-if="selectedUsers.length > 0">
        {{ selectedUsers.length }} Selected
      </div>
    </div>

    <div class="selection-grid">
      <div v-for="user in selectedUsers" :key="user.id" class="participant-chip">
        <div class="chip-avatar">
          <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.full_name" />
          <div v-else class="chip-placeholder">{{ user.full_name.charAt(0) }}</div>
        </div>
        <span class="chip-name">{{ user.full_name }}</span>
        <button class="remove-btn" @click.stop="remove(user.id)">
          <X :size="14" />
        </button>
      </div>
      
      <button class="add-participant-btn" @click.stop="toggleMenu">
        <Plus :size="16" />
        <span>Add</span>
      </button>
    </div>

    <transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu" v-click-outside="close">
        <div class="search-box">
          <Search :size="14" />
          <input 
            ref="searchInput"
            v-model="searchQuery" 
            placeholder="Search users..." 
            @click.stop
          />
        </div>
        
        <div class="user-list">
          <div v-if="loading" class="list-status"><Loader2 class="spin" :size="16" /></div>
          <div v-else-if="filteredUsers.length === 0" class="list-status">No users found</div>
          <div 
            v-for="user in filteredUsers" 
            :key="user.id" 
            class="user-row"
            :class="{ 'is-selected': modelValue.includes(user.id) }"
            @click="toggleSelection(user.id)"
          >
            <div class="row-avatar">
              <img v-if="user.avatar_url" :src="user.avatar_url" />
              <div v-else class="row-placeholder">{{ user.full_name.charAt(0) }}</div>
            </div>
            <div class="row-info">
              <div class="row-name">{{ user.full_name }}</div>
              <div class="row-email">{{ user.email }}</div>
            </div>
            <div v-if="modelValue.includes(user.id)" class="row-check">
              <Check :size="14" />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Users, X, Plus, Search, Loader2, Check } from 'lucide-vue-next'
import axios from 'axios'
import { API } from '@/utils/api'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: 'Participants' },
  excludeIds: { type: Array, default: () => [] },
  excludeAdmins: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const users = ref([])
const loading = ref(false)
const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)

const selectedUsers = computed(() => {
  return users.value.filter(u => props.modelValue.includes(u.id))
})

const filteredUsers = computed(() => {
  let list = users.value.filter(u => !props.excludeIds.includes(u.id))
  if (props.excludeAdmins) {
    list = list.filter(u => !u.is_superuser)
  }
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(u => u.full_name.toLowerCase().includes(q))
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
    console.error(e)
  } finally {
    loading.value = false
  }
}

const toggleMenu = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => searchInput.value?.focus())
  }
}

const close = () => { isOpen.value = false }

const toggleSelection = (id) => {
  const newValue = [...props.modelValue]
  const index = newValue.indexOf(id)
  if (index === -1) {
    newValue.push(id)
  } else {
    newValue.splice(index, 1)
  }
  emit('update:modelValue', newValue)
}

const remove = (id) => {
  const newValue = props.modelValue.filter(v => v !== id)
  emit('update:modelValue', newValue)
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
.participant-selector {
  position: relative;
  width: 100%;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

.header-main .icon {
  color: #facc15;
}

.participant-count {
  font-size: 11px;
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
  padding: 2px 8px;
  border-radius: 10px;
}

.selection-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 48px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.participant-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideIn 0.3s ease;
}

.chip-avatar, .chip-placeholder {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  background: #facc15;
  color: #1c1c1e;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chip-name {
  font-size: 12px;
  color: white;
  white-space: nowrap;
}

.remove-btn {
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.3);
  padding: 0;
  cursor: pointer;
  display: flex;
  transition: color 0.2s;
}

.remove-btn:hover {
  color: #f87171;
}

.add-participant-btn {
  background: rgba(250, 204, 21, 0.1);
  border: 1px dashed rgba(250, 204, 21, 0.3);
  border-radius: 10px;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #facc15;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.add-participant-btn:hover {
  background: rgba(250, 204, 21, 0.2);
  border-style: solid;
  transform: scale(1.05);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  z-index: 100;
  overflow: hidden;
  backdrop-filter: blur(15px);
}

.search-box {
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.search-box input {
  background: none;
  border: none;
  color: white;
  font-size: 13px;
  outline: none;
  width: 100%;
}

.user-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 6px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.user-row.is-selected {
  background: rgba(250, 204, 21, 0.08);
}

.row-avatar, .row-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #2c2c2e;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #facc15;
}

.row-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-info {
  flex: 1;
}

.row-name {
  font-size: 13px;
  font-weight: 500;
  color: white;
}

.row-email {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}

.row-check {
  color: #facc15;
}

.list-status {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideIn { 
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.dropdown-enter-active, .dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* ═════════ LIGHT THEME — preserves yellow accent palette ═════════ */
[data-theme="light"] .header-main { color: var(--text-secondary); }
[data-theme="light"] .header-main .icon { color: #b45309; }
[data-theme="light"] .participant-count {
  background: rgba(250, 204, 21, 0.18);
  color: #92400e;
}
[data-theme="light"] .selection-grid {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .participant-chip {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .chip-avatar,
[data-theme="light"] .chip-placeholder { background: #facc15; color: #1a0f00; }
[data-theme="light"] .chip-name { color: var(--text-primary); }
[data-theme="light"] .remove-btn { color: rgba(60, 45, 30, 0.50); }
[data-theme="light"] .remove-btn:hover { color: #b91c1c; }

[data-theme="light"] .add-participant-btn {
  background: rgba(250, 204, 21, 0.12);
  border: 1px dashed rgba(217, 119, 6, 0.40);
  color: #b45309;
}
[data-theme="light"] .add-participant-btn:hover {
  background: rgba(250, 204, 21, 0.22);
}

/* Dropdown — was solid #1c1c1e, now cream glass */
[data-theme="light"] .dropdown-menu {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.95), rgba(252, 240, 220, 0.85));
  border: 1px solid rgba(217, 119, 6, 0.24);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: 0 20px 50px rgba(40, 25, 10, 0.25);
}
[data-theme="light"] .search-box { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .search-box input { color: var(--text-primary); }
[data-theme="light"] .search-box input::placeholder { color: rgba(26, 20, 16, 0.40); }
[data-theme="light"] .user-row:hover { background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .user-row.is-selected { background: rgba(250, 204, 21, 0.14); }
[data-theme="light"] .row-avatar,
[data-theme="light"] .row-placeholder { background: rgba(40, 25, 10, 0.10); color: #b45309; }
[data-theme="light"] .row-name { color: var(--text-primary); }
[data-theme="light"] .row-email { color: var(--text-tertiary); }
[data-theme="light"] .row-check { color: #b45309; }
[data-theme="light"] .list-status { color: var(--text-secondary); }
</style>
