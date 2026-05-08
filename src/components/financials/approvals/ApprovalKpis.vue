<template>
  <div class="k-grid">
     <div class="k-card">
        <span class="lbl">Pending Requests</span>
        <span class="val text-orange-400">{{ counts.pending || 0 }}</span>
     </div>
     <div class="k-div"></div>
     <div class="k-card">
        <span class="lbl">Approved</span>
        <span class="val text-emerald-400">{{ counts.approved || 0 }}</span>
     </div>
     <div class="k-div"></div>
     <div class="k-card">
        <span class="lbl">Rejected</span>
        <span class="val text-rose-400">{{ counts.rejected || 0 }}</span>
     </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ approvals: Array })

const counts = computed(() => {
   if (!props.approvals) return {}
   return {
      pending: props.approvals.filter(a => a.status === 'Pending').length,
      approved: props.approvals.filter(a => a.status === 'Approved').length,
      rejected: props.approvals.filter(a => a.status === 'Rejected').length
   }
})
</script>

<style scoped>
.k-grid {
   display: flex; align-items: center; gap: 24px; padding: 20px;
   background: #18181b; border: 1px solid rgba(255,255,255,0.08);
   border-radius: 12px; margin-bottom: 24px;
}
.k-card { display: flex; flex-direction: column; gap: 4px; }
.lbl { font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; }
.val { font-size: 24px; font-weight: 700; font-family: 'SF Mono', monospace; }
.k-div { width: 1px; height: 32px; background: rgba(255,255,255,0.1); }
</style>
