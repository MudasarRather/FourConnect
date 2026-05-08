<template>
  <div class="project-card" @click="handleCardClick" @mouseenter="playHoverSound">
    <div class="card-header">
       <div class="status-pill" :class="statusClass">
         {{ displayStatus }}
       </div>
       
       <div class="card-actions" v-if="showActions">
          <button 
            class="action-btn view"
            @click.stop="$emit('view', project, $event)"
            title="View Project"
          >
            <Eye :size="14" />
          </button>
          <button 
            v-if="canEdit" 
            class="action-btn"
            @click.stop="$emit('edit', project, $event)"
            title="Edit Project"
          >
            <Edit2 :size="14" />
          </button>
          <button 
             v-if="canDelete" 
             class="action-btn delete"
             @click.stop="$emit('remove', project)"
             title="Delete Project"
          >
            <Trash2 :size="14" style="pointer-events: none;" />
          </button>
       </div>
    </div>

    <div class="card-body">
       <h3 class="project-title">{{ project.project_name || 'Untitled Project' }}</h3>
       <p class="project-desc">{{ truncate(project.description, 80) }}</p>
       
       <div class="meta-row">
         <div class="meta-item">
           <Calendar :size="14" class="icon-subtle" />
           <span>{{ formatDate(project.start_date) }}</span>
         </div>
         <div class="meta-item ml-auto">
             <CreditCard :size="14" class="icon-subtle" />
             <span class="currency-text">{{ formatCurrency(project.estimated_budget, project.currency) }}</span>
         </div>
       </div>
    </div>

    <div class="card-footer">
       <div class="user-info">
            <div class="user-avatar" :title="project.owner_id || 'User'">
                {{ getInitials(project.project_name) }}
            </div>
            <span class="created-at">Created {{ formatDate(project.created_at) }}</span>
       </div>
       <ArrowRight :size="16" class="arrow-icon" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Edit2, Trash2, Calendar, CreditCard, ArrowRight, Eye } from 'lucide-vue-next'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  currentUserId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['click', 'edit', 'remove', 'view'])

// Handle card click - for admin, open preview
const handleCardClick = (event) => {
  if (props.isAdmin) {
    emit('view', props.project, event)
  } else {
    emit('click', props.project)
  }
}

const handleDeleteClick = () => {
  console.log('ProjectCard: Delete button clicked for project', props.project.id)
  emit('delete-project', props.project)
}

// Hover sound effect - iOS-style tick
const playHoverSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 1200
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.03, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.05)
  } catch (e) {
    // Ignore audio errors
  }
}

// Computed
const displayStatus = computed(() => {
    return props.project.status || 'Draft'
})

const statusClass = computed(() => {
    return (props.project.status || 'draft').toLowerCase().replace(' ', '-')
})

// Check if current user owns this project
const isOwner = computed(() => {
  if (!props.currentUserId || !props.project.owner_id) return false
  return String(props.currentUserId) === String(props.project.owner_id)
})

// Show actions for admin OR for users on their own drafts
const showActions = computed(() => {
  return props.isAdmin || (isOwner.value && displayStatus.value === 'Draft')
})

const canEdit = computed(() => {
  if (props.isAdmin) return true
  return isOwner.value && displayStatus.value === 'Draft'
})

const canDelete = computed(() => {
  if (props.isAdmin) return true
  return isOwner.value && displayStatus.value === 'Draft'
})

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatCurrency = (amount, currency) => {
  const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥' }
  const symbol = symbols[currency] || '$'
  return `${symbol} ${Number(amount).toLocaleString()}`
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getInitials = (name) => {
  return name ? name.substring(0, 2).toUpperCase() : 'PR'
}
</script>

<style scoped>
.project-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  height: 100%;
  animation: slideUpFade 0.4s ease-out forwards;
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.project-card:hover {
  transform: translateY(-2px);
  border-color: #3f3f46;
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.3);
  background: #1c1c1e;
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px; /* Reduced from 20px */
}

.status-pill {
  font-size: 10px; /* Reduced from 11px */
  font-weight: 600;
  padding: 4px 8px; /* Reduced padding */
  border-radius: 6px; /* Squarer pill */
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
}

/* Status Colors (Subtle/Modern) */
.status-pill.draft { background: rgba(113, 113, 122, 0.2); color: #a1a1aa; border: 1px solid rgba(113, 113, 122, 0.3); }
.status-pill.pending { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.2); }
.status-pill.approved { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
.status-pill.rejected { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

.card-actions {
  display: flex;
  gap: 6px;
  opacity: 0; /* Hidden by default */
  transform: translateX(5px);
  transition: all 0.2s ease;
  position: relative;
  z-index: 20;
}

.project-card:hover .card-actions,
.card-actions:focus-within { /* Accessibility: Show on focus */
  opacity: 1;
  transform: translateX(0);
}

.action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #a1a1aa;
  width: 24px; /* Smaller buttons */
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
.action-btn.view:hover { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.action-btn.delete:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* Body */
.project-title {
  font-size: 15px; /* Reduced from 18px */
  font-weight: 600;
  color: #f4f4f5; /* Zinc 100 */
  margin-bottom: 6px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-desc {
  font-size: 12px; /* Reduced from 13px */
  color: #a1a1aa; /* Zinc 400 */
  line-height: 1.5;
  margin-bottom: 16px; /* Reduced from 24px */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 36px; /* Reduced height */
}

.meta-row {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #d4d4d8; /* Zinc 300 */
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #27272a;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-auto { margin-left: auto; }

.icon-subtle { color: #71717a; } /* Zinc 500 */
.currency-text { font-weight: 500; font-family: 'Inter', sans-serif; }

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto; /* Push to bottom */
}

.user-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.user-avatar {
  width: 24px; /* Smaller avatar */
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #18181b; /* Thinner border */
}

.created-at {
  font-size: 11px;
  color: #71717a;
}

.arrow-icon {
    color: #52525b;
    opacity: 0;
    transform: translateX(-5px);
    transition: all 0.3s ease;
}

.project-card:hover .arrow-icon {
    opacity: 1;
    transform: translateX(0);
    color: #3b82f6;
}
</style>
