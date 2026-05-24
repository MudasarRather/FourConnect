<template>
  <div>
    <!-- Top Row: Author + Badge -->
    <div class="card-top">
      <div class="author-info">
        <div class="avatar" :style="avatarStyle">
          {{ note.note_type === 'audit' ? '⚙️' : initials }}
        </div>
        <div class="author-meta">
          <span class="author-name">{{ note.note_type === 'audit' ? 'System' : note.author_name }}</span>
          <span class="timestamp">{{ timeAgoText }}</span>
        </div>
      </div>
      <div class="card-badges">
        <span class="type-badge" :class="note.note_type">{{ typeLabel }}</span>
      </div>
    </div>

    <!-- Title -->
    <h3 class="card-title">{{ note.title }}</h3>

    <!-- Preview -->
    <div class="card-preview" v-html="note.content"></div>

    <!-- Bottom Row -->
    <div class="card-bottom">
      <div class="footer-meta">
        <!-- Attachments -->
        <div class="attachments-footer-row" v-if="note.attachment_urls?.length">
          <template v-if="!showAllAttachments">
            <a 
              v-for="(att, i) in note.attachment_urls.slice(0,2)" 
              :key="i" 
              :href="att.url ? (att.url.startsWith('http') ? att.url : `${API_BASE}${att.url}`) : '#'" 
              target="_blank"
              class="att-pill-mini" 
              :title="att.name"
              @click.stop
            >
              <Paperclip :size="10" /> {{ att.name.length > 10 ? att.name.substring(0,10)+'...' : att.name }}
            </a>
            <button v-if="note.attachment_urls.length > 2" class="att-more-btn" @click.stop="showAllAttachments = true">
              +{{ note.attachment_urls.length - 2 }}
            </button>
          </template>
          <template v-else>
            <div class="att-list-expanded">
              <a 
                v-for="(att, i) in note.attachment_urls" 
                :key="i" 
                :href="att.url ? (att.url.startsWith('http') ? att.url : `${API_BASE}${att.url}`) : '#'" 
                target="_blank"
                class="att-pill-mini" 
                :title="att.name"
                @click.stop
              >
                <Paperclip :size="10" /> {{ att.name }}
              </a>
              <button class="att-collapse-btn" @click.stop="showAllAttachments = false">Collapse</button>
            </div>
          </template>
        </div>
      </div>
      
      <!-- Actions Bar (Status + buttons) -->
      <div class="action-bar">
         <div class="status-icons">
           <span class="icon-indicator pinned-icon" v-if="note.is_pinned" title="Pinned">📌</span>
           <span class="icon-indicator locked-icon" v-if="note.is_locked" title="Locked">🔒</span>
           <span class="updated-text-mini" v-if="note.updated_at">{{ updatedAgoText }}</span>
         </div>
         <div class="card-actions" @click.stop>
           <button class="action-icon" @click.stop="$emit('pin')" title="Toggle pin" :class="{ active: note.is_pinned }"><Pin :size="14" /></button>
           <button class="action-icon" @click.stop="$emit('lock')" title="Toggle lock" v-if="isAdmin || !note.is_locked"><component :is="note.is_locked ? Unlock : Lock" :size="14" /></button>
           <button 
             class="action-icon danger" 
             @click.stop="$emit('delete')" 
             title="Delete"
             :disabled="(note.is_locked || note.note_type === 'audit') && !isAdmin"
           ><Trash2 :size="14" /></button>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Pin, Lock, Unlock, Trash2, Paperclip } from 'lucide-vue-next'
import { API_BASE } from '@/utils/api'

const props = defineProps({
  note: { type: Object, required: true },
  isAdmin: { type: Boolean, default: false },
  now: { type: Number, required: true },
})

defineEmits(['pin', 'lock', 'delete'])

const showAllAttachments = ref(false)

const initials = computed(() => {
  const name = props.note.author_name || ''
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
})

const typeLabel = computed(() => {
  const map = { general: 'General', financial: 'Financial', private: 'Private', audit: 'Audit', other: 'Other' }
  return map[props.note.note_type] || props.note.note_type
})

const avatarStyle = computed(() => {
  if (props.note.note_type === 'audit') return { background: 'rgba(161, 161, 170, 0.2)' }
  if (props.note.author_avatar) return { backgroundImage: `url(${props.note.author_avatar})`, backgroundSize: 'cover' }
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']
  const idx = (props.note.author_name || '').charCodeAt(0) % colors.length
  return { background: colors[idx] }
})

const timeAgoText = computed(() => {
  if (!props.note.created_at) return ''
  const diff = props.now - new Date(props.note.created_at).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(props.note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const updatedAgoText = computed(() => {
  if (!props.note.updated_at) return ''
  const diff = props.now - new Date(props.note.updated_at).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(props.note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
</script>

<style scoped>
.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.author-info { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.author-meta { display: flex; flex-direction: column; gap: 2px; }
.author-name { font-size: 13px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.01em; }
.timestamp { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500; }

.type-badge {
  font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 6px;
  text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;
}
.type-badge.general { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
.type-badge.financial { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.2); }
.type-badge.private { background: rgba(249, 115, 22, 0.15); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); }
.type-badge.other { background: rgba(251, 146, 60, 0.15); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.2); }
.type-badge.audit { background: rgba(161, 161, 170, 0.15); color: #a1a1aa; border: 1px solid rgba(161, 161, 170, 0.2); }

.card-title {
  font-size: 17px; font-weight: 700; margin: 0 0 12px; color: white;
  line-height: 1.35; font-family: 'Inter', sans-serif; letter-spacing: -0.01em;
}

.card-preview {
  font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.7; margin-bottom: 20px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  font-weight: 400;
}
/* Revert specific markdown styling inside preview */
.card-preview :deep(ul), .card-preview :deep(ol) { padding-left: 20px; margin: 0; }
.card-preview :deep(table) { width: 100%; border-collapse: collapse; margin: 6px 0; border: 1px solid rgba(255,255,255,0.1); }
.card-preview :deep(table td) { border: 1px solid rgba(255,255,255,0.08); padding: 4px 8px; font-size: 12px; }

.card-bottom { 
  margin-top: auto; 
  padding-top: 14px; 
  border-top: 1px solid rgba(255,255,255,0.06); 
  display: flex; flex-direction: column; gap: 10px;
}

.footer-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 24px; }


.attachments-footer-row { display: flex; gap: 6px; align-items: center; }
.att-pill-mini { 
  font-size: 10px; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 6px;
  display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,0.7); white-space: nowrap; transition: background 0.2s;
  text-decoration: none;
}
.att-pill-mini:hover { background: rgba(255,255,255,0.1); color: white; }
.att-more-btn { font-size: 10px; color: rgba(255,255,255,0.5); background: none; border: none; cursor: pointer; }
.att-collapse-btn {
  font-size: 10px; color: #f59e0b; background: none; border: none; cursor: pointer; margin-left: 4px; padding: 0 4px; font-weight: 500;
}
.att-collapse-btn:hover { text-decoration: underline; }
.att-list-expanded { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }

.action-bar { display: flex; align-items: center; justify-content: space-between; }
.status-icons { font-size: 12px; opacity: 0.8; display: flex; gap: 8px; align-items: center; }
.updated-text-mini { font-size: 10px; color: rgba(255,255,255,0.3); }

.card-actions { 
  display: flex; align-items: center; gap: 4px; opacity: 0; transform: translateY(5px); transition: all 0.2s; margin-left: auto; 
}

/* Parent hover triggers visibility */
.action-icon {
  background: transparent; border: none; color: rgba(255,255,255,0.4);
  width: 28px; height: 28px; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.action-icon:hover { background: rgba(255,255,255,0.1); color: white; }
.action-icon.danger:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.action-icon.active { color: #f59e0b; background: rgba(245,158,11,0.1); }
.action-icon:disabled { opacity: 0.2; cursor: not-allowed; pointer-events: none; }

/* Mentions Styling */
/* Mentions Styling */
:deep(.mention-pill) {
  display: inline-flex;
  align-items: center;
  background: rgba(59, 130, 246, 0.15); /* Blue-500 alpha */
  color: #60a5fa; /* Blue-400 */
  padding: 0 6px;
  border-radius: 6px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  font-size: 0.9em; /* Match view scale */
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin: 0 1px;
  white-space: nowrap;
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .author-name { color: var(--text-primary); }
[data-theme="light"] .timestamp { color: #92400e; }

/* Type badges — preserve gold/amber/orange family on cream */
[data-theme="light"] .type-badge.general {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.36);
}
[data-theme="light"] .type-badge.financial {
  background: rgba(234, 179, 8, 0.18);
  color: #854d0e;
  border-color: rgba(234, 179, 8, 0.36);
}
[data-theme="light"] .type-badge.private {
  background: rgba(249, 115, 22, 0.16);
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.36);
}
[data-theme="light"] .type-badge.other {
  background: rgba(251, 146, 60, 0.16);
  color: #c2410c;
  border-color: rgba(251, 146, 60, 0.36);
}
[data-theme="light"] .type-badge.audit {
  background: rgba(40, 25, 10, 0.06);
  color: #6b5840;
  border-color: rgba(40, 25, 10, 0.18);
}

/* Title + preview */
[data-theme="light"] .card-title { color: var(--text-primary); }
[data-theme="light"] .card-preview { color: #6b5840; }
[data-theme="light"] .card-preview :deep(table) { border-color: rgba(40, 25, 10, 0.12); }
[data-theme="light"] .card-preview :deep(table td) { border-color: rgba(40, 25, 10, 0.10); }

/* Bottom border separator */
[data-theme="light"] .card-bottom { border-top-color: rgba(40, 25, 10, 0.10); }

/* Attachment pills */
[data-theme="light"] .att-pill-mini {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
}
[data-theme="light"] .att-pill-mini:hover {
  background: rgba(217, 119, 6, 0.20);
  color: #b45309;
}
[data-theme="light"] .att-more-btn { color: #92400e; }
[data-theme="light"] .att-collapse-btn { color: #b45309; }

/* Status icons + updated time */
[data-theme="light"] .updated-text-mini { color: #92400e; }

/* Action buttons (pin / lock / delete) — visible amber on cream */
[data-theme="light"] .action-icon {
  color: #6b5840;
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .action-icon:hover {
  background: rgba(217, 119, 6, 0.16);
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
}
[data-theme="light"] .action-icon.active {
  color: #b45309;
  background: rgba(217, 119, 6, 0.18);
  border-color: rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .action-icon.danger:hover {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.32);
  color: #b91c1c;
}

/* Mention pill — recolor from blue to amber to stay on palette */
[data-theme="light"] :deep(.mention-pill) {
  background: rgba(217, 119, 6, 0.16);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.36);
  box-shadow: 0 1px 2px rgba(40, 25, 10, 0.10);
}
</style>
