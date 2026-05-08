<template>
  <div class="data-table-wrap glass-panel">
    <table class="budget-table">
       <thead>
          <tr>
             <th>Ref #</th>
             <th>Type</th>
             <th>Funding Source</th>
             <th>Status</th>
             <th>Allocated</th>
             <th>Effective Date</th>
             <th>Actions</th>
          </tr>
       </thead>
       <tbody>
          <tr v-for="b in budgets" :key="b.id">
             <td class="mono-text">REV-{{ b.revision_number }}</td>
             <td><span class="type-pill">{{ b.budget_type }}</span></td>
             <td class="main-text">{{ b.funding_source }}</td>
             <td>
                <span class="status-badge" :class="b.status.toLowerCase()">{{ b.status }}</span>
             </td>
             <td class="amount-text">${{ b.allocated_amount.toLocaleString() }}</td>
             <td class="date-text">{{ b.effective_date ? new Date(b.effective_date).toLocaleDateString() : '-' }}</td>
             <td>
                <button class="action-icon" v-if="!b.is_locked" @click="$emit('edit', b)">
                   <Edit3 :size="14" />
                </button>
                <Lock v-else :size="14" class="lock-icon" />
             </td>
          </tr>
       </tbody>
    </table>
  </div>
</template>

<script setup>
import { Edit3, Lock } from 'lucide-vue-next'
defineProps({ budgets: Array })
defineEmits(['edit'])
</script>

<style scoped>
.glass-panel { background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
.budget-table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 14px 20px; color: rgba(255,255,255,0.4); font-weight: 600; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
td { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e4e4e7; }
tr:last-child td { border-bottom: none; }

.mono-text { font-family: 'SF Mono', monospace; color: rgba(255,255,255,0.5); font-size: 12px; }
.type-pill { background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 11px; }
.main-text { font-weight: 500; }
.amount-text { font-family: 'SF Mono', monospace; font-weight: 600; color: white; }
.date-text { opacity: 0.6; }

.status-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
.approved { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
.draft { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
.locked { color: #94a3b8; background: rgba(148, 163, 184, 0.1); }

.action-icon { background: transparent; border: none; color: #a1a1aa; cursor: pointer; transition: color 0.2s; }
.action-icon:hover { color: white; }
.lock-icon { color: rgba(255,255,255,0.2); }
</style>
