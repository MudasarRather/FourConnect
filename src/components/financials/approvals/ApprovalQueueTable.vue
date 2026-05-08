<template>
  <div class="table-container glass-panel">
     <h3>Approval Queue</h3>
     <table class="data-table">
        <thead>
           <tr>
              <th>Request Type</th>
              <th>Requested By</th>
              <th>Amount</th>
              <th>Justification</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
           </tr>
        </thead>
        <tbody>
           <tr v-for="req in approvals" :key="req.id">
              <td>
                 <div class="type-badge" :class="getTypeClass(req.request_type)">
                    {{ req.request_type }}
                 </div>
              </td>
              <td class="user-cell">
                 <div class="u-avatar">U</div> {{ req.requested_by_id.substring(0,4) }}...
              </td>
              <td class="mono-font">${{ req.requested_amount }}</td>
              <td class="trunc-text">{{ req.justification }}</td>
              <td class="date-cell">{{ new Date(req.requested_at).toLocaleDateString() }}</td>
              <td>
                 <span class="status-dot" :class="req.status.toLowerCase()"></span> {{ req.status }}
              </td>
              <td>
                 <div class="actions" v-if="req.status === 'Pending'">
                    <button class="icon-btn check" @click="$emit('decision', req.id, 'Approved')"><Check :size="16" /></button>
                    <button class="icon-btn x" @click="$emit('decision', req.id, 'Rejected')"><X :size="16" /></button>
                 </div>
                 <span v-else class="done-lbl">Done</span>
              </td>
           </tr>
           <tr v-if="approvals.length === 0">
              <td colspan="7" class="empty-msg">No approval requests found</td>
           </tr>
        </tbody>
     </table>
  </div>
</template>

<script setup>
import { Check, X } from 'lucide-vue-next'

defineProps({ approvals: Array })
defineEmits(['decision'])

const getTypeClass = (type) => {
   if (type === 'Budget Revision') return 'purple'
   if (type === 'Payment Release') return 'blue'
   return 'gray'
}
</script>

<style scoped>
.glass-panel { background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
h3 { padding: 20px; margin: 0; font-size: 14px; color: white; border-bottom: 1px solid rgba(255,255,255,0.05); }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 12px 20px; color: rgba(255,255,255,0.4); font-weight: 500; font-size: 11px; text-transform: uppercase; }
td { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e4e4e7; }
tr:last-child td { border-bottom: none; }

.type-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.purple { background: rgba(139, 92, 246, 0.1); color: #a78bfa; }
.blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
.gray { background: rgba(255, 255, 255, 0.1); color: #d4d4d8; }

.user-cell { display: flex; align-items: center; gap: 8px; }
.u-avatar { width: 24px; height: 24px; background: #27272a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }

.mono-font { font-family: 'SF Mono', monospace; }
.trunc-text { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.7; }
.date-cell { opacity: 0.5; }

.status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; }
.pending { background: #fbbf24; }
.approved { background: #22c55e; }
.rejected { background: #f43f5e; }

.actions { display: flex; gap: 8px; }
.icon-btn { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.check { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.check:hover { background: #22c55e; color: white; }
.x { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.x:hover { background: #f43f5e; color: white; }
.done-lbl { opacity: 0.3; font-style: italic; }
.empty-msg { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); }
</style>
