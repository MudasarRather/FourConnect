<template>
  <div class="notification-settings">
    <div class="settings-grid">
      <div 
        v-for="option in options" 
        :key="option.key" 
        class="notify-card"
        :class="{ 'is-active': modelValue[option.key] }"
        @click="toggle(option.key)"
      >
        <div class="card-icon" :style="{ color: option.color }">
          <component :is="option.icon" :size="20" />
        </div>
        <div class="card-info">
          <div class="card-label">{{ option.label }}</div>
          <div class="card-desc">{{ option.description }}</div>
        </div>
        <div class="card-toggle">
          <div class="toggle-track">
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { User, Users, Glasses, UserCog } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])

const options = [
  { key: 'notify_assignee', label: 'Assignee', description: 'Immediate alert to executor', icon: User, color: '#facc15' },
  { key: 'notify_reviewers', label: 'Reviewers', description: 'Alert to code/quality team', icon: Users, color: '#fb923c' },
  { key: 'notify_watchers', label: 'Watchers', description: 'Alert to all observers', icon: Glasses, color: '#60a5fa' },
  { key: 'notify_manager', label: 'Project Manager', description: 'Report to project lead', icon: UserCog, color: '#a78bfa' }
]

const toggle = (key) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: !props.modelValue[key]
  })
}
</script>

<style scoped>
.notification-settings {
  width: 100%;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.notify-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notify-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.notify-card.is-active {
  background: rgba(250, 204, 21, 0.05);
  border-color: rgba(250, 204, 21, 0.2);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.card-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 2px;
}

.card-toggle {
  width: 32px;
}

.toggle-track {
  width: 32px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  position: relative;
  transition: all 0.3s;
}

.toggle-thumb {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.is-active .toggle-track {
  background: #facc15;
}

.is-active .toggle-thumb {
  left: 16px;
  background: #1c1c1e;
}

@media (max-width: 600px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
