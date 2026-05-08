<template>
  <div class="content-card description-card">
    <div class="card-header">
      <FileText :size="18" class="icon" />
      <h3>Description</h3>
    </div>
    
    <div class="card-content">
      <p v-if="description">{{ description }}</p>
      <div v-else class="empty-state">
        <span class="text-muted">No description provided for this project.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FileText } from 'lucide-vue-next'

defineProps({
  description: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.content-card {
  background: rgba(30, 30, 33, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 20px 24px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.icon {
  color: #a1a1aa;
}

h3 {
  font-size: 15px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0;
  letter-spacing: -0.01em;
}

.card-content {
  padding: 20px 24px 24px;
}

p {
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  margin: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  font-style: italic;
  opacity: 0.5;
  font-size: 14px;
}
</style>
