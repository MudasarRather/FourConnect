<template>
  <div class="glass-card">
    <div class="card-header">
      <div class="header-left">
        <div class="icon-box"><Users :size="16" /></div>
        <h3>Team Members</h3>
        <span class="counter">{{ team.length }}</span>
      </div>
    </div>

    <!-- Scrollable Team List -->
    <div class="team-list-scroll">
      <!-- Owner Top (if ownerName is separate, but usually owner is part of team or we show explicitly) -->
      <!-- We will just list the team members passed in props which includes details now -->
      
      <div v-for="member in team" :key="member.id" class="team-member-row">
        <!-- Avatar -->
        <div class="member-avatar">
           <img v-if="member.user_avatar" :src="member.user_avatar" alt="av" class="av-img" />
           <div v-else class="av-placeholder">{{ getInitials(member.user_name) }}</div>
        </div>

        <!-- Details -->
        <div class="member-info">
           <div class="info-top">
              <span class="member-name">{{ member.user_name || 'Unknown User' }}</span>
              <span v-if="member.role" class="role-badge">{{ member.role }}</span>
           </div>
           
           <div class="contact-grid">
              <div v-if="member.user_email" class="contact-item" title="Email">
                 <Mail :size="10" class="c-icon" />
                 <span>{{ member.user_email }}</span>
              </div>
              <div v-if="member.user_phone" class="contact-item" title="Phone">
                 <Phone :size="10" class="c-icon" />
                 <span>{{ member.user_phone }}</span>
              </div>
           </div>
        </div>
      </div>

      <div v-if="team.length === 0" class="empty-state">
         <span>No team members assigned yet.</span>
      </div>
    </div>
    
    <!-- Optional: Explicit Project Owner footer if needed, but list is better -->
    <div v-if="ownerName && !isOwnerInTeam" class="owner-footer">
       <span class="ft-label">Project Owner:</span>
       <span class="ft-val">{{ ownerName }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Users, Mail, Phone } from 'lucide-vue-next'

const props = defineProps({
  team: { type: Array, default: () => [] },
  ownerName: { type: String, default: '' }
})

// Check if owner is already in the team list to avoid duplication if we were to show them separately
const isOwnerInTeam = computed(() => {
  return props.team.some(m => m.user_name === props.ownerName)
})

const getInitials = (name) => name ? name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'
</script>

<style scoped>
.glass-card {
  background: rgba(30, 30, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 0; /* Padding moved to children for scroll headers */
  backdrop-filter: blur(12px);
  display: flex; flex-direction: column;
  height: 100%; min-height: 200px;
  overflow: hidden;
}

.card-header { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.header-left { display: flex; align-items: center; gap: 10px; }
.icon-box { 
  width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); 
  border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #a1a1aa;
}
h3 { font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin: 0; }
.counter { font-size: 11px; font-weight: 700; background: rgba(255, 255, 255, 0.1); padding: 2px 8px; border-radius: 10px; color: #d4d4d8; }

.team-list-scroll {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 16px;
  max-height: 190px; /* Approx 3 items + padding */
}
/* Custom Scrollbar (Premium Glass) */
.team-list-scroll::-webkit-scrollbar { width: 4px; }
.team-list-scroll::-webkit-scrollbar-track { background: transparent; }
.team-list-scroll::-webkit-scrollbar-thumb { 
  background: rgba(255, 255, 255, 0.1); border-radius: 2px; 
}
.team-list-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

.team-member-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
}
.team-member-row:last-child { border-bottom: none; padding-bottom: 0; }

.member-avatar {
  flex-shrink: 0; width: 36px; height: 36px;
}
.av-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.av-placeholder {
  width: 100%; height: 100%; border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: white;
}

.member-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }

.info-top { display: flex; justify-content: space-between; align-items: center; }
.member-name { font-size: 13px; font-weight: 600; color: #f5f5f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-badge {
  font-size: 9px; text-transform: uppercase; font-weight: 700; 
  background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: rgba(255,255,255,0.6);
}

.contact-grid { display: flex; flex-direction: column; gap: 2px; }
.contact-item { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.4); font-size: 11px; }
.c-icon { opacity: 0.7; }

.empty-state { text-align: center; color: rgba(255,255,255,0.3); font-size: 12px; padding: 20px 0; }

.owner-footer {
  padding: 12px 24px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; align-items: center; gap: 8px;
}
.ft-label { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.ft-val { font-size: 12px; font-weight: 600; color: white; }

/* ═════════════════ LIGHT THEME OVERRIDES — CardTeam ═════════════════ */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 4px 20px rgba(40, 25, 10, 0.04);
}
[data-theme="light"] .card-header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .icon-box {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
}
[data-theme="light"] h3 {
  color: var(--text-primary);
}
[data-theme="light"] .counter {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  font-weight: 700;
}
[data-theme="light"] .team-list-scroll::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .team-list-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(40, 25, 10, 0.30);
}
[data-theme="light"] .team-member-row {
  border-bottom: 1px solid rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .av-placeholder {
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.30);
  color: #fff;
}
[data-theme="light"] .member-name {
  color: var(--text-primary);
}
[data-theme="light"] .role-badge {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
  font-weight: 700;
}
[data-theme="light"] .contact-item {
  color: #6b5840;
}
[data-theme="light"] .c-icon {
  opacity: 0.8;
  color: #b45309;
}
[data-theme="light"] .empty-state {
  color: #92400e;
}
[data-theme="light"] .owner-footer {
  background: rgba(40, 25, 10, 0.04);
  border-top: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .ft-label {
  color: #6b5840;
  font-weight: 700;
}
[data-theme="light"] .ft-val {
  color: var(--text-primary);
}
</style>
