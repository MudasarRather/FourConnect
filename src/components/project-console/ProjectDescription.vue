<template>
  <div class="project-description">
    <div class="header">
      <FileText :size="16" class="icon" />
      <span class="label">ABOUT THIS PROJECT</span>
    </div>
    
    <div v-if="description" class="description-text">
      {{ description }}
    </div>
    
    <div v-else class="empty-state">
      <span class="text-muted">No description provided.</span>
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
.project-description {
  margin-bottom: 24px;
  animation: fadeIn 0.5s ease-out;
  /* Optional: Very subtle structure if needed, or keeping it clean */
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  opacity: 0.7;
}

.icon {
  color: #a1a1aa;
}

.label {
  font-size: 11px;
  font-weight: 600;
  color: #f5f5f7;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.description-text {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
  white-space: pre-wrap;
}

.empty-state {
  font-style: italic;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .project-description { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .header { opacity: 1; }
[data-theme="light"] .icon { color: #b45309; }
[data-theme="light"] .label { color: #b45309; font-weight: 700; }
[data-theme="light"] .description-text { color: var(--text-primary); }
[data-theme="light"] .empty-state { color: #92400e; }
[data-theme="light"] .text-muted { color: #6b5840; }
</style>
