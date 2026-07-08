<template>
  <!-- Group-by switch for the swimlane board: agent | status | priority | sla. -->
  <div class="gbc">
    <span class="gbc-label"><Layers :size="12" /> Group</span>
    <div class="gbc-seg">
      <button v-for="o in OPTS" :key="o.key" class="gbc-btn" :class="{ on: modelValue === o.key }"
        :title="o.label" @click="emit('update:modelValue', o.key)">
        <component :is="o.icon" :size="13" /><span>{{ o.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Layers, Users, Activity, Flag, Timer } from 'lucide-vue-next'
defineProps({ modelValue: { type: String, default: 'agent' } })
const emit = defineEmits(['update:modelValue'])
const OPTS = [
  { key: 'agent', label: 'Agent', icon: Users },
  { key: 'status', label: 'Status', icon: Activity },
  { key: 'priority', label: 'Priority', icon: Flag },
  { key: 'sla', label: 'SLA', icon: Timer },
]
</script>

<style scoped>
.gbc { display: inline-flex; align-items: center; gap: 8px; }
.gbc-label { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); }
.gbc-seg { display: inline-flex; gap: 3px; padding: 3px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.gbc-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.16s, background 0.16s; }
.gbc-btn:hover { color: var(--sd-text); }
.gbc-btn.on { color: var(--sd-amber); background: var(--sd-amber-soft); }
@media (max-width: 720px) { .gbc-btn span { display: none; } }
</style>
