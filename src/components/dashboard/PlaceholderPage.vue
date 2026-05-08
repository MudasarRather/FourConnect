<template>
  <div class="page-view">
    <div class="empty-state">
      <div class="icon-circle">
        <component :is="icon" :size="32" />
      </div>
      <h3>{{ title }}</h3>
      <p>This module is under development.</p>
      <button class="btn-primary">Create New {{ item }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CheckSquare, FileText, DollarSign, Files, Settings } from 'lucide-vue-next'

const props = defineProps({
  type: String
})

const icon = computed(() => {
  switch(props.type) {
    case 'tasks': return CheckSquare
    case 'notes': return FileText
    case 'expenses': return DollarSign
    case 'documents': return Files
    case 'settings': return Settings
    default: return CheckSquare
  }
})

const title = computed(() => props.type.charAt(0).toUpperCase() + props.type.slice(1))
const item = computed(() => props.type.slice(0, -1)) // simple singularization
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
  gap: 16px;
  max-width: 400px;
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

h3 { font-size: 18px; font-weight: 600; color: #f5f5f7; }
p { color: #86868b; font-size: 14px; }

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
