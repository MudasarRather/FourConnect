<template>
  <span class="status-badge" :class="status.toLowerCase()">
    <span class="status-dot"></span>
    {{ status }}
  </span>
</template>

<script setup>
defineProps({
  status: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  border: 1px solid transparent;
  transition: transform 0.2s ease;
  cursor: default;
}

.status-badge:hover {
  transform: scale(1.05);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Approved / Completed (Cobalt Blue) */
.status-badge.approved, .status-badge.completed {
  background: rgba(37, 99, 235, 0.2); 
  color: #3b82f6; /* Cobalt/Royal Blue */
  border-color: rgba(37, 99, 235, 0.3);
  text-shadow: 0 0 10px rgba(37, 99, 235, 0.2);
}
.status-badge.approved .status-dot, .status-badge.completed .status-dot { background: #3b82f6; box-shadow: 0 0 4px #3b82f6; }

/* In Progress (Orange) */
.status-badge.in_progress {
  background: rgba(249, 115, 22, 0.15); 
  color: #f97316; /* Orange */
  border-color: rgba(249, 115, 22, 0.2);
}
.status-badge.in_progress .status-dot { background: #f97316; box-shadow: 0 0 4px #f97316; }

/* Pending / Draft (Yellow) */
.status-badge.draft, .status-badge.pending {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308; /* Yellow */
  border-color: rgba(234, 179, 8, 0.2);
}
.status-badge.draft .status-dot, .status-badge.pending .status-dot { background: #eab308; }

/* Rejected/Declined */
.status-badge.rejected, .status-badge.declined {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.15);
}
.status-badge.rejected .status-dot, .status-badge.declined .status-dot { background: #ef4444; }
</style>
