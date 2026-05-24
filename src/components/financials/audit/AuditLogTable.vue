<template>
  <div class="audit-table-wrap glass-panel">
     <div class="header-actions">
        <h3>System Audit Trail</h3>
     </div>
     
     <table class="data-table">
        <thead>
           <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
           </tr>
        </thead>
        <tbody>
           <!-- Mock Data for Audit since we didn't implement full audit backend endpoint -->
           <tr v-for="log in logs" :key="log.id">
              <td class="date-col">{{ new Date(log.timestamp).toLocaleString() }}</td>
              <td class="user-cell"><div class="u-avatar">U</div> {{ log.user }}</td>
              <td><span class="action-badge" :class="log.action.toLowerCase()">{{ log.action }}</span></td>
              <td>{{ log.entity }}</td>
              <td class="details-col">{{ log.details }}</td>
           </tr>
           <tr v-if="logs.length === 0">
               <td colspan="5" class="empty-state">No audit logs available</td>
           </tr>
        </tbody>
     </table>
  </div>
</template>

<script setup>
// Mock props for now as we don't have a dedicated audit endpoint yet
const logs = [
   { id: 1, timestamp: new Date(), user: 'Admin', action: 'CREATE', entity: 'Budget', details: 'Created OPEX budget $50k' },
   { id: 2, timestamp: new Date(Date.now() - 86400000), user: 'Manager', action: 'UPDATE', entity: 'Payment', details: 'Updated payment #123 status' },
]
</script>

<style scoped>
.glass-panel { background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; padding: 0; }
.header-actions { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
h3 { margin: 0; color: white; font-size: 14px; font-weight: 600; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 12px 20px; color: rgba(255,255,255,0.4); font-weight: 500; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
td { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e4e4e7; }
tr:last-child td { border-bottom: none; }

.date-col { font-family: 'SF Mono', monospace; opacity: 0.6; font-size: 11px; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.u-avatar { width: 20px; height: 20px; background: #27272a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; }

.action-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; text-transform: uppercase; }
.create { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.update { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.delete { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }

.details-col { opacity: 0.7; font-style: italic; }
.empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); }

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .glass-panel {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .header-actions {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] h3 { color: #1a1410; }
[data-theme="light"] th {
  color: #b45309;
  font-weight: 700;
  border-bottom: 1px solid rgba(40, 25, 10, 0.16);
}
[data-theme="light"] td {
  color: #1a1410;
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .date-col { color: #6b5840; opacity: 1; }
[data-theme="light"] .u-avatar {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #fff;
  font-weight: 700;
}
[data-theme="light"] .create {
  background: rgba(5, 150, 105, 0.14);
  color: #047857;
}
[data-theme="light"] .update {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .delete {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
}
[data-theme="light"] .details-col { color: #6b5840; opacity: 1; }
[data-theme="light"] .empty-state { color: #92400e; }
</style>
