<template>
  <div class="audit-tab">
     <div class="header-row">
        <h2>Audit Trail</h2>
     </div>
     <AuditLogTable />
  </div>
</template>

<script setup>
import AuditLogTable from './audit/AuditLogTable.vue'
// In future, this would fetch real audit logs
</script>

<style scoped>
.audit-tab { animation: fadeIn 0.4s ease-out; }
.header-row { margin-bottom: 24px; }
h2 { font-size: 20px; font-weight: 600; color: white; margin: 0; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
