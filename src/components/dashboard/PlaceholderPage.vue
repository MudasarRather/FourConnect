<template>
  <div class="page-view">
    <div class="empty-state">
      <div class="icon-circle">
        <component :is="icon" :size="32" />
      </div>
      <h3>{{ displayTitle }}</h3>
      <p v-if="phase" class="phase-line">{{ phase }}</p>
      <p class="desc">{{ description }}</p>
      <button v-if="!moduleName" class="btn-primary">Create New {{ item }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  CheckSquare, FileText, DollarSign, Files, Settings,
  UserCog, IdCard
} from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, default: 'dashboard' },
  moduleName: { type: String, default: '' },
  phase: { type: String, default: '' }
})

const icon = computed(() => {
  switch (props.type) {
    case 'tasks': return CheckSquare
    case 'notes': return FileText
    case 'expenses': return DollarSign
    case 'documents': return Files
    case 'settings': return Settings
    case 'hr': return UserCog
    case 'self-service': return IdCard
    default: return CheckSquare
  }
})

const displayTitle = computed(() => {
  if (props.moduleName) return props.moduleName
  const t = props.type || 'Dashboard'
  return t.charAt(0).toUpperCase() + t.slice(1)
})

const description = computed(() => {
  if (props.moduleName) return 'This module is on the roadmap and will be built in a future phase.'
  return 'This module is under development.'
})

const item = computed(() => {
  const t = props.type || 'item'
  return t.slice(0, -1)
})
</script>

<style scoped>
.page-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 40px;
  background: #1c1c1e;
  border-radius: 16px;
  border: 1px solid #38383a;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 460px;
}

.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #2c2c2e;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0a84ff;
  margin-bottom: 8px;
}

h3 { font-size: 20px; font-weight: 600; color: #f5f5f7; margin: 0; }
.phase-line {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  padding: 4px 10px;
  border-radius: 999px;
  margin: 0;
}
.desc { color: #86868b; font-size: 13px; margin: 0; line-height: 1.5; }

.btn-primary {
  margin-top: 8px;
  padding: 10px 20px;
  background: #f5f5f7;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }
</style>
