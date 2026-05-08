<template>
  <div 
    class="note-card" 
    :class="{ 
      editing: isEditing,
      pinned: note.is_pinned, 
      locked: note.is_locked, 
      audit: note.note_type === 'audit', 
      private: note.note_type === 'private' 
    }"
    @click="onCardClick"
  >
    <!-- Toast -->
    <transition name="fade">
      <div class="toast-notification" v-if="toastMessage">
        {{ toastMessage }}
      </div>
    </transition>

    <!-- VIEW MODE -->
    <NoteCardView
      v-if="!isEditing"
      :note="note"
      :isAdmin="isAdmin"
      :now="now"
      @pin="togglePin"
      @lock="toggleLock"
      @delete="$emit('delete')"
    />

    <!-- EDIT MODE -->
    <NoteCardEdit
      v-else
      :note="note"
      :token="token"
      :now="now"
      @save="onSave"
      @cancel="$emit('edit-end')"
      @toast="showToast"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import NoteCardView from './NoteCardView.vue'
import NoteCardEdit from './NoteCardEdit.vue'

const props = defineProps({
  note: { type: Object, required: true },
  isAdmin: { type: Boolean, default: false },
  token: { type: String, required: true },
  isEditing: { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'delete', 'pin', 'lock', 'edit-start', 'edit-end'])

const now = ref(Date.now())
const toastMessage = ref('')
let timeInterval = null
let toastTimeout = null

const showToast = (msg) => {
  toastMessage.value = msg
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => { toastMessage.value = '' }, 3000)
}

const onCardClick = () => {
  if (props.isEditing) return
  if ((props.note.is_locked || props.note.note_type === 'audit') && !props.isAdmin) return
  emit('edit-start')
}

const onSave = (updatedNote) => {
  emit('update', updatedNote)
  emit('edit-end')
}

const togglePin = async () => {
  try {
    await axios.patch(
      `http://localhost:8000/api/project-notes/${props.note.project_id}/notes/${props.note.id}/pin`,
      null,
      { params: { token: props.token } }
    )
    emit('update', { ...props.note, is_pinned: !props.note.is_pinned })
  } catch (e) {}
}

const toggleLock = () => {
  emit('lock', props.note)
}

onMounted(() => {
  timeInterval = setInterval(() => { now.value = Date.now() }, 60000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
/* GLASSMORPHISM CARD */
.note-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.04);
  display: flex; flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.note-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.06);
}

.note-card:hover :deep(.card-actions) {
  opacity: 1; transform: translateY(0);
}

.note-card.editing {
  background: rgba(24, 24, 27, 0.97);
  border-color: rgba(245, 158, 11, 0.45);
  transform: none;
  z-index: 100;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  cursor: default;
  overflow: visible;
}

/* TOAST */
.toast-notification {
  position: absolute; top: 20px; right: 20px; z-index: 300;
  background: #ef4444; color: white; padding: 8px 12px; border-radius: 8px;
  font-size: 12px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
