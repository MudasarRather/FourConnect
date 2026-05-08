<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container" @click.stop>
        
        <!-- Header -->
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Note' : 'New Note' }}</h2>
          <button class="close-btn" @click="$emit('close')"><X :size="18" /></button>
        </div>

        <!-- Form -->
        <div class="modal-body">
          
          <!-- Type Selector -->
          <div class="form-group">
            <label>Note Type</label>
            <div class="type-selector">
              <button 
                v-for="t in noteTypes" :key="t.id"
                class="type-chip"
                :class="{ active: form.note_type === t.id, [t.id]: true }"
                @click="form.note_type = t.id"
              >
                <component :is="t.icon" :size="14" />
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Title -->
          <div class="form-group">
            <label>Title</label>
            <input v-model="form.title" placeholder="Note title..." class="form-input" />
          </div>

          <!-- Content Editor -->
          <div class="form-group">
            <label>Content</label>
            <div class="editor-toolbar">
              <button @click="execCmd('bold')" title="Bold" class="fmt-btn"><strong>B</strong></button>
              <button @click="execCmd('italic')" title="Italic" class="fmt-btn"><em>I</em></button>
              <button @click="execCmd('insertUnorderedList')" title="List" class="fmt-btn">☰</button>
              <button @click="execCmd('insertOrderedList')" title="Numbered List" class="fmt-btn">1.</button>
              <button @click="execCmd('formatBlock', 'h3')" title="Heading" class="fmt-btn">H</button>
              <button @click="insertLink" title="Link" class="fmt-btn">🔗</button>
            </div>
            <div 
              ref="editorRef"
              class="rich-editor"
              contenteditable="true"
              @input="onContentInput"
              @keydown="onEditorKeydown"
              :innerHTML="form.content"
            ></div>
          </div>

          <!-- Mentions -->
          <div class="form-group">
            <label>Mentions</label>
            <div class="mentions-area">
              <div class="selected-mentions">
                <span class="mention-chip" v-for="m in selectedMentions" :key="m.id">
                  @{{ m.name }}
                  <button @click="removeMention(m)" class="chip-remove"><X :size="10" /></button>
                </span>
              </div>
              <div class="mention-input-wrap">
                <input 
                  v-model="mentionQuery" 
                  placeholder="Type @username to mention..."
                  @input="filterMentions"
                  @focus="showMentionDropdown = true"
                  class="form-input small"
                />
                <div class="mention-dropdown" v-if="showMentionDropdown && filteredMentions.length">
                  <button 
                    v-for="u in filteredMentions" :key="u.id"
                    class="mention-option"
                    @click="addMention(u)"
                  >
                    <span class="mention-avatar">{{ u.name.charAt(0) }}</span>
                    {{ u.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Attachments -->
          <div class="form-group">
            <label>Attachments</label>
            <div class="attachments-area">
              <div class="attachment-list" v-if="form.attachment_urls?.length">
                <div class="attachment-item" v-for="(a, i) in form.attachment_urls" :key="i">
                  <Paperclip :size="12" />
                  <span>{{ a.name || 'File' }}</span>
                  <button @click="form.attachment_urls.splice(i, 1)" class="chip-remove"><X :size="10" /></button>
                </div>
              </div>
              <label class="upload-btn">
                <input type="file" multiple @change="handleFileUpload" style="display:none" />
                <Paperclip :size="14" /> Attach Files
              </label>
            </div>
          </div>

          <!-- Pin & Lock Toggles -->
          <div class="toggle-row">
            <label class="toggle-item" @click="form.is_pinned = !form.is_pinned">
              <div class="toggle-switch" :class="{ on: form.is_pinned }"><div class="toggle-knob"></div></div>
              <span>📌 Pin this note</span>
            </label>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button class="btn-save" @click="saveNote" :disabled="!form.title || saving">
            {{ saving ? 'Saving...' : (isEditing ? 'Update Note' : 'Create Note') }}
          </button>
        </div>

      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { X, Paperclip, FileText, DollarSign, Lock, MoreHorizontal } from 'lucide-vue-next'

const props = defineProps({
  note: { type: Object, default: null },
  projectId: { type: String, required: true },
  token: { type: String, required: true },
  mentionsList: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'saved'])

const isEditing = computed(() => !!props.note)
const editorRef = ref(null)
const saving = ref(false)
const mentionQuery = ref('')
const showMentionDropdown = ref(false)
const selectedMentions = ref([])

const noteTypes = [
  { id: 'general', label: 'General', icon: FileText },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'private', label: 'Private', icon: Lock },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]

const form = reactive({
  title: '',
  content: '',
  note_type: 'general',
  is_pinned: false,
  attachment_urls: [],
})

const filteredMentions = computed(() => {
  const q = mentionQuery.value.toLowerCase()
  const already = new Set(selectedMentions.value.map(m => m.id))
  return props.mentionsList.filter(u => !already.has(u.id) && u.name.toLowerCase().includes(q))
})

const filterMentions = () => { showMentionDropdown.value = true }
const addMention = (user) => {
  selectedMentions.value.push(user)
  mentionQuery.value = ''
  showMentionDropdown.value = false
}
const removeMention = (user) => {
  selectedMentions.value = selectedMentions.value.filter(m => m.id !== user.id)
}

const execCmd = (cmd, val = null) => {
  document.execCommand(cmd, false, val)
  editorRef.value?.focus()
}
const insertLink = () => {
  const url = prompt('Enter URL:')
  if (url) execCmd('createLink', url)
}
const onContentInput = () => {
  form.content = editorRef.value?.innerHTML || ''
}
const onEditorKeydown = (e) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    execCmd('insertText', '    ')
  }
}

const handleFileUpload = async (event) => {
  const files = event.target.files
  if (!files?.length) return

  for (const file of files) {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post('http://localhost:8000/api/uploads/file', fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${props.token}` }
      })
      form.attachment_urls.push({
        name: file.name,
        url: res.data.url || res.data.file_url || '',
        size: file.size,
      })
    } catch (e) {
      // Fallback: store reference without upload
      form.attachment_urls.push({ name: file.name, url: '', size: file.size })
    }
  }
}

const saveNote = async () => {
  if (!form.title) return
  saving.value = true

  const payload = {
    title: form.title,
    content: form.content,
    note_type: form.note_type,
    mentions: selectedMentions.value.map(m => m.id),
    is_pinned: form.is_pinned,
    attachment_urls: form.attachment_urls,
  }

  try {
    if (isEditing.value) {
      await axios.put(
        `http://localhost:8000/api/project-notes/${props.projectId}/notes/${props.note.id}`,
        payload,
        { params: { token: props.token } }
      )
    } else {
      await axios.post(
        `http://localhost:8000/api/project-notes/${props.projectId}/notes`,
        payload,
        { params: { token: props.token } }
      )
    }
    emit('saved')
  } catch (e) {
    alert(e.response?.data?.detail || 'Failed to save note')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (props.note) {
    form.title = props.note.title
    form.content = props.note.content || ''
    form.note_type = props.note.note_type
    form.is_pinned = props.note.is_pinned
    form.attachment_urls = [...(props.note.attachment_urls || [])]
    // Restore mentions
    if (props.note.mentions?.length) {
      selectedMentions.value = props.mentionsList.filter(u => 
        props.note.mentions.map(String).includes(String(u.id))
      )
    }
  }
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = form.content
    }
  })
})
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease;
}

.modal-container {
  background: #18181b; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px; width: 640px; max-height: 85vh; overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 40px 100px rgba(0,0,0,0.5);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.modal-header h2 { font-size: 18px; font-weight: 700; color: #f5f5f7; margin: 0; }
.close-btn {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.5);
  width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: all 0.15s;
}
.close-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.modal-body { padding: 24px; overflow-y: auto; flex: 1; }

.form-group { margin-bottom: 20px; }
.form-group label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block; }

.form-input {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: white; padding: 10px 14px; border-radius: 10px; font-size: 14px; outline: none;
  transition: border-color 0.2s; box-sizing: border-box;
}
.form-input:focus { border-color: rgba(245,158,11,0.4); }
.form-input.small { font-size: 13px; padding: 8px 12px; }

/* Type Selector */
.type-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.type-chip {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5); padding: 6px 14px; border-radius: 12px;
  font-size: 12px; font-weight: 500; cursor: pointer; display: flex;
  align-items: center; gap: 6px; transition: all 0.2s;
}
.type-chip:hover { border-color: rgba(255,255,255,0.2); color: white; }
.type-chip.active.general { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); color: #60a5fa; }
.type-chip.active.financial { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
.type-chip.active.private { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); color: #a78bfa; }
.type-chip.active.other { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #fbbf24; }

/* Editor */
.editor-toolbar {
  display: flex; gap: 4px; margin-bottom: 8px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.fmt-btn {
  background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.5);
  width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.fmt-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.rich-editor {
  min-height: 160px; max-height: 300px; overflow-y: auto;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 14px; color: #e5e5e5; font-size: 14px;
  line-height: 1.6; outline: none; transition: border-color 0.2s;
}
.rich-editor:focus { border-color: rgba(245,158,11,0.3); }

/* Mentions */
.mentions-area { position: relative; }
.selected-mentions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.mention-chip {
  background: rgba(99,102,241,0.12); color: #818cf8; padding: 4px 10px;
  border-radius: 8px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;
}
.chip-remove { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; display: flex; }
.chip-remove:hover { opacity: 1; }

.mention-input-wrap { position: relative; }
.mention-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px;
  background: #27272a; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 6px; max-height: 160px; overflow-y: auto; z-index: 10;
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}
.mention-option {
  width: 100%; background: none; border: none; color: #e5e5e5; padding: 8px 10px;
  border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px;
  font-size: 13px; text-align: left; transition: background 0.15s;
}
.mention-option:hover { background: rgba(255,255,255,0.05); }
.mention-avatar {
  width: 24px; height: 24px; background: rgba(99,102,241,0.2); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
  color: #818cf8;
}

/* Attachments */
.attachments-area { display: flex; flex-direction: column; gap: 8px; }
.attachment-list { display: flex; flex-wrap: wrap; gap: 6px; }
.attachment-item {
  background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 8px;
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.6);
}
.upload-btn {
  background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.5); padding: 10px; border-radius: 10px; text-align: center;
  cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
  gap: 6px; transition: all 0.2s;
}
.upload-btn:hover { border-color: rgba(245,158,11,0.4); color: #f59e0b; }

/* Toggle */
.toggle-row { display: flex; gap: 20px; }
.toggle-item { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.6); }
.toggle-switch {
  width: 36px; height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px;
  position: relative; transition: background 0.2s;
}
.toggle-switch.on { background: #f59e0b; }
.toggle-knob {
  width: 16px; height: 16px; background: white; border-radius: 8px;
  position: absolute; top: 2px; left: 2px; transition: transform 0.2s;
}
.toggle-switch.on .toggle-knob { transform: translateX(16px); }

/* Footer */
.modal-footer {
  padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: flex-end; gap: 10px;
}
.btn-cancel {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); padding: 8px 20px; border-radius: 10px;
  font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.btn-cancel:hover { color: white; border-color: rgba(255,255,255,0.2); }
.btn-save {
  background: linear-gradient(135deg, #f59e0b, #ef4444); border: none; color: white;
  padding: 8px 24px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.btn-save:hover { box-shadow: 0 4px 16px rgba(245,158,11,0.4); transform: translateY(-1px); }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
