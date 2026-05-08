<template>
  <teleport to="body">
    <div class="drawer-overlay" @click.self="$emit('close')">
      <transition name="slide-in">
        <div class="drawer-panel" @click.stop>
          
          <!-- Drawer Header -->
          <div class="drawer-header">
            <div class="drawer-title-area">
              <span class="type-badge" :class="note.note_type">{{ typeLabel }}</span>
              <h2>{{ note.title }}</h2>
            </div>
            <div class="drawer-actions">
              <button class="action-icon" @click="$emit('pin')" title="Toggle pin">
                <span>{{ note.is_pinned ? '📌' : '' }}</span>
                <Pin :size="14" />
              </button>
              <button class="action-icon" @click="$emit('lock')" :title="note.is_locked ? 'Unlock' : 'Lock'" v-if="isAdmin || !note.is_locked">
                <component :is="note.is_locked ? Unlock : Lock" :size="14" />
              </button>
              <button 
                class="action-icon edit-icon" 
                @click="$emit('edit')" 
                title="Edit"
                :disabled="note.is_locked || note.note_type === 'audit'"
                v-if="note.note_type !== 'audit'"
              >
                <Pencil :size="14" />
              </button>
              <button class="close-btn" @click="$emit('close')"><X :size="18" /></button>
            </div>
          </div>

          <!-- Drawer Body -->
          <div class="drawer-body">
            
            <!-- Author Info -->
            <div class="info-section">
              <div class="author-row">
                <div class="avatar" :style="avatarStyle">
                  {{ note.note_type === 'audit' ? '⚙️' : initials }}
                </div>
                <div>
                  <div class="author-name">{{ note.note_type === 'audit' ? 'System' : note.author_name }}</div>
                  <div class="author-date">{{ formatDate(note.created_at) }}</div>
                </div>
              </div>
            </div>

            <!-- Status Badges -->
            <div class="status-row">
              <span class="status-chip pinned" v-if="note.is_pinned">📌 Pinned</span>
              <span class="status-chip locked" v-if="note.is_locked">
                🔒 Locked by {{ note.locked_by_name || 'Admin' }}
                <span class="lock-date" v-if="note.locked_at"> · {{ formatDate(note.locked_at) }}</span>
              </span>
            </div>

            <!-- Full Content -->
            <div class="content-section">
              <label>Content</label>
              <div class="full-content" v-html="note.content || '<em>No content</em>'"></div>
            </div>

            <!-- Mentions -->
            <div class="content-section" v-if="note.mentioned_names?.length">
              <label>Mentions</label>
              <div class="mentions-list">
                <span class="mention-chip" v-for="name in note.mentioned_names" :key="name">
                  @{{ name }}
                </span>
              </div>
            </div>

            <!-- Attachments -->
            <div class="content-section" v-if="note.attachment_urls?.length">
              <label>Attachments</label>
              <div class="attachments-list">
                <a 
                  class="attachment-card" 
                  v-for="(att, i) in note.attachment_urls" :key="i"
                  :href="att.url" target="_blank"
                >
                  <Paperclip :size="14" />
                  <span>{{ att.name || 'Attachment' }}</span>
                  <span class="att-size" v-if="att.size">{{ formatSize(att.size) }}</span>
                </a>
              </div>
            </div>

            <!-- Metadata -->
            <div class="content-section meta-section">
              <label>Details</label>
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Created</span>
                  <span class="meta-value">{{ formatDate(note.created_at) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Updated</span>
                  <span class="meta-value">{{ formatDate(note.updated_at) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Type</span>
                  <span class="meta-value">{{ typeLabel }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Note ID</span>
                  <span class="meta-value mono">{{ String(note.id).slice(0, 8) }}...</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'
import { X, Pencil, Pin, Lock, Unlock, Paperclip } from 'lucide-vue-next'

const props = defineProps({
  note: { type: Object, required: true },
  isAdmin: { type: Boolean, default: false },
})

defineEmits(['close', 'edit', 'pin', 'lock'])

const typeLabel = computed(() => {
  const map = { general: 'General', financial: 'Financial', private: 'Private', audit: 'Audit', other: 'Other' }
  return map[props.note.note_type] || props.note.note_type
})

const initials = computed(() => {
  const name = props.note.author_name || ''
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
})

const avatarStyle = computed(() => {
  if (props.note.note_type === 'audit') return { background: 'rgba(161, 161, 170, 0.2)' }
  if (props.note.author_avatar) return { backgroundImage: `url(${props.note.author_avatar})`, backgroundSize: 'cover' }
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']
  const idx = (props.note.author_name || '').charCodeAt(0) % colors.length
  return { background: colors[idx] }
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
  display: flex; justify-content: flex-end;
  animation: fadeIn 0.2s ease;
}

.drawer-panel {
  width: 520px; max-width: 90vw; height: 100vh;
  background: #0f0f11; border-left: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: -20px 0 60px rgba(0,0,0,0.4);
}

.drawer-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.drawer-title-area { flex: 1; }
.drawer-title-area h2 { font-size: 20px; font-weight: 700; margin: 8px 0 0; color: #f5f5f7; }
.drawer-actions { display: flex; gap: 6px; }
.action-icon {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.5);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.action-icon:hover { background: rgba(255,255,255,0.1); color: white; }
.action-icon:disabled { opacity: 0.25; cursor: not-allowed; }
.close-btn {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.5);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.close-btn:hover { background: rgba(239,68,68,0.15); color: #f87171; }

.type-badge {
  font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 12px;
  text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;
}
.type-badge.general { background: rgba(59,130,246,0.15); color: #60a5fa; }
.type-badge.financial { background: rgba(16,185,129,0.15); color: #34d399; }
.type-badge.private { background: rgba(139,92,246,0.15); color: #a78bfa; }
.type-badge.audit { background: rgba(161,161,170,0.12); color: #a1a1aa; }
.type-badge.other { background: rgba(245,158,11,0.15); color: #fbbf24; }

.drawer-body { flex: 1; overflow-y: auto; padding: 0; }

.info-section { padding: 20px 24px; }
.author-row { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: white; flex-shrink: 0;
}
.author-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.author-date { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }

.status-row { display: flex; gap: 8px; padding: 0 24px 16px; }
.status-chip {
  font-size: 11px; padding: 4px 12px; border-radius: 8px; font-weight: 500;
}
.status-chip.pinned { background: rgba(245,158,11,0.12); color: #fbbf24; }
.status-chip.locked { background: rgba(239,68,68,0.12); color: #f87171; }
.lock-date { font-size: 10px; opacity: 0.6; }

.content-section {
  padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.04);
}
.content-section label {
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase;
  letter-spacing: 0.08em; margin-bottom: 12px; display: block;
}

.full-content {
  font-size: 14px; color: #d4d4d8; line-height: 1.7;
}
.full-content :deep(h1), .full-content :deep(h2), .full-content :deep(h3) {
  color: #f5f5f7; margin: 16px 0 8px; font-weight: 700;
}
.full-content :deep(a) { color: #60a5fa; text-decoration: underline; }
.full-content :deep(ul), .full-content :deep(ol) { padding-left: 20px; }

.mentions-list { display: flex; flex-wrap: wrap; gap: 6px; }
.mention-chip {
  background: rgba(99,102,241,0.12); color: #818cf8; padding: 4px 10px;
  border-radius: 8px; font-size: 12px; font-weight: 500;
}

.attachments-list { display: flex; flex-direction: column; gap: 6px; }
.attachment-card {
  display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 10px;
  color: #d4d4d8; text-decoration: none; font-size: 13px; transition: all 0.15s;
}
.attachment-card:hover { border-color: rgba(245,158,11,0.3); background: rgba(255,255,255,0.05); }
.att-size { margin-left: auto; font-size: 11px; color: rgba(255,255,255,0.3); }

.meta-section { padding-bottom: 40px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-label { font-size: 11px; color: rgba(255,255,255,0.3); }
.meta-value { font-size: 13px; color: #d4d4d8; font-weight: 500; }
.meta-value.mono { font-family: 'SF Mono', monospace; font-size: 12px; }

/* Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.slide-in-enter-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-in-leave-active { transition: transform 0.2s ease; }
.slide-in-enter-from { transform: translateX(100%); }
.slide-in-leave-to { transform: translateX(100%); }
</style>
