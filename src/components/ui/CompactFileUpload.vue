<template>
  <div class="compact-upload">
    <input
      ref="fileInput"
      type="file"
      accept=".pdf"
      class="hidden"
      @change="handleFileSelect"
    />
    
    <div class="upload-row">
      <!-- Trigger Button -->
      <button type="button" class="btn-compact" @click="triggerUrl">
         <UploadCloud :size="14" />
         <span>{{ label }}</span>
      </button>

      <!-- Status / Filename -->
      <div v-if="selectedFileName" class="file-status success">
         <FileText :size="14" />
         <span class="fname">{{ selectedFileName }}</span>
         <button type="button" class="btn-icon" @click.stop="clearFile">
            <X :size="12" />
         </button>
      </div>
      <div v-else class="file-status empty">
         <span>{{ placeholder }}</span>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UploadCloud, FileText, X } from 'lucide-vue-next'

const props = defineProps({
  label: { type: String, default: 'Upload PDF' },
  placeholder: { type: String, default: 'No file selected' }
})

const emit = defineEmits(['file-selected', 'error', 'clear'])

const fileInput = ref(null)
const selectedFileName = ref('')

const triggerUrl = () => {
  fileInput.value.click()
}

const handleFileSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Reset input immediately to allow re-selection of same bad file
  e.target.value = ''

  // 1. Type Check
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      emit('error', 'Only PDF files are allowed')
      return
  }

  // 2. Size Check (5MB)
  if (file.size > 5 * 1024 * 1024) {
      emit('error', 'File size must be less than 5MB')
      return
  }

  // 3. Magic Number Check
  try {
      const header = await readFileHeader(file)
      // %PDF = 0x25 0x50 0x44 0x46
      if (!header.startsWith('25504446')) {
          emit('error', 'Invalid PDF file (Content mismatch)')
          return
      }
  } catch (err) {
      emit('error', 'Failed to verify file')
      return
  }

  // Success
  selectedFileName.value = file.name
  emit('file-selected', file)
}

const clearFile = () => {
  selectedFileName.value = ''
  emit('clear')
}

const readFileHeader = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = (e) => {
      const arr = (new Uint8Array(e.target.result)).subarray(0, 4)
      let header = ''
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).toUpperCase()
      }
      resolve(header)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file.slice(0, 4))
  })
}
</script>

<style scoped>
.compact-upload {
  width: 100%;
}
.hidden { display: none; }

.upload-row {
  display: flex; align-items: center; gap: 10px;
}

.btn-compact {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.08); 
  border: 1px solid rgba(255,255,255,0.1);
  color: #f5f5f7;
  padding: 6px 12px; border-radius: 6px;
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-compact:hover {
  background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.2);
}

.file-status {
  flex: 1; display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,0.5);
  overflow: hidden;
}

.file-status.success {
  color: #818cf8; background: rgba(99, 102, 241, 0.1);
  padding: 4px 8px; border-radius: 4px;
}

.fname {
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.btn-icon {
  background: none; border: none; color: inherit; cursor: pointer;
  display: flex; align-items: center; padding: 2px;
  opacity: 0.7;
}
.btn-icon:hover { opacity: 1; }

.empty { font-style: italic; }
</style>
