<template>
  <div 
    class="file-upload-container"
    :class="{ 
      'is-dragging': isDragging, 
      'has-error': error,
      'is-disabled': disabled
    }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInputRef"
      type="file"
      class="hidden-input"
      :accept="accept"
      @change="handleFileSelect"
      :disabled="disabled"
    />

    <!-- Upload State: Empty -->
    <div v-if="!modelValue && !isUploading" class="upload-content">
      <div class="icon-circle">
        <!-- Icon: UploadCloud -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="upload-icon"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
      </div>
      <div class="text-content">
        <p class="primary-text">
          <span class="highlight">Click to upload</span> or drag and drop
        </p>
        <p class="secondary-text">{{ helperText }}</p>
      </div>
    </div>

    <!-- Upload State: Uploading -->
    <div v-else-if="isUploading" class="upload-content uploading">
      <div class="spinner-container">
        <!-- Icon: Loader -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin text-accent"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      <div class="text-content">
        <p class="primary-text">Uploading file...</p>
        <p class="secondary-text">{{ currentFileName }}</p>
      </div>
    </div>

    <!-- Upload State: Success -->
    <div v-else class="upload-content success">
      <div class="file-info">
        <div class="file-icon-wrapper">
          <!-- Icon: FileText -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
        </div>
        <div class="file-details">
          <p class="file-name">{{ currentFileName }}</p>
          <p class="file-size" v-if="formattedFileSize">{{ formattedFileSize }}</p>
        </div>
      </div>
      <button 
        type="button" 
        class="remove-btn" 
        @click.stop="removeFile"
        title="Remove file"
      >
        <!-- Icon: X -->
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  accept: {
    type: String,
    default: '.pdf'
  },
  maxSizeMB: {
    type: Number,
    default: 5
  },
  label: {
    type: String,
    default: 'Project Order (PDF)'
  },
  helperText: {
    type: String,
    default: 'PDF (max. 5MB)'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fileName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'update:fileName', 'file-selected', 'error', 'remove'])

const fileInputRef = ref(null)
const isDragging = ref(false)
const isUploading = ref(false)
const error = ref('')
const currentFileName = ref(props.fileName)
const currentFileSize = ref(0)

const formattedFileSize = computed(() => {
  if (!currentFileSize.value) return ''
  return (currentFileSize.value / (1024 * 1024)).toFixed(2) + ' MB'
})

const triggerFileInput = () => {
  if (props.disabled || isUploading.value) return
  fileInputRef.value.click()
}

const handleDragOver = (e) => {
  if (props.disabled || isUploading.value) return
  isDragging.value = true
}

const handleDragLeave = (e) => {
  isDragging.value = false
}

const handleDrop = async (e) => {
  isDragging.value = false
  if (props.disabled || isUploading.value) return
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    validateAndEmit(files[0])
  }
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    validateAndEmit(files[0])
  }
}

const validateAndEmit = async (file) => {
  error.value = ''
  
  // NOTE: We must reset the input value *before* any returns, or use a finally-like flow.
  // Actually, easiest is to just reset it right now. We have the 'file' object.
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  // Validate Type
  if (props.accept === '.pdf' && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    error.value = 'Only PDF files are allowed'
    emit('error', error.value)
    return
  }

  // Validate Size
  if (file.size > props.maxSizeMB * 1024 * 1024) {
    error.value = `File size must be less than ${props.maxSizeMB}MB`
    emit('error', error.value)
    return
  }

  // Validate Content (Magic Number)
  if (props.accept === '.pdf') {
      try {
          const header = await readFileHeader(file)
          // %PDF = 0x25 0x50 0x44 0x46
          const isPdf = header.startsWith('25504446')
          
          if (!isPdf) {
              error.value = 'Invalid PDF file (Content mismatch)'
              emit('error', error.value)
              return
          }
      } catch (e) {
          error.value = 'Failed to verify file'
          emit('error', error.value)
          return
      }
  }

  currentFileName.value = file.name
  currentFileSize.value = file.size
  emit('update:fileName', file.name)
  
  // Emit file for parent to handle upload
  emit('file-selected', {
    file,
    setUploading: (val) => isUploading.value = val,
    setError: (msg) => error.value = msg
  })
}

const readFileHeader = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = (e) => {
      const arr = (new Uint8Array(e.target.result)).subarray(0, 4)
      let header = ''
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).toUpperCase() // No padding needed for hex like 25
      }
      resolve(header)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file.slice(0, 4))
  })
}

const removeFile = () => {
  currentFileName.value = ''
  currentFileSize.value = 0
  error.value = ''
  emit('update:modelValue', '')
  emit('update:fileName', '')
  emit('remove')
  if (fileInputRef.value) fileInputRef.value.value = ''
}
</script>

<style scoped>
.file-upload-container {
  width: 100%;
  min-height: 140px;
  position: relative;
  background-color: #121214; /* Dark refined bg */
  border: 2px dashed #3a3a3c;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.file-upload-container:hover:not(.is-disabled) {
  border-color: #6366f1; /* Indigo-500 */
  background-color: #18181b;
}

.file-upload-container.is-dragging {
  border-color: #6366f1;
  background-color: rgba(99, 102, 241, 0.08);
  transform: scale(1.01);
}

.file-upload-container.has-error {
  border-color: #ef4444;
  background-color: rgba(239, 68, 68, 0.05);
}

.file-upload-container.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  border-style: solid;
}

.hidden-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  transition: transform 0.3s ease;
}

.file-upload-container:hover .icon-circle {
  transform: translateY(-2px);
  background-color: #3f3f46;
}

.upload-icon {
  color: #a1a1aa;
}

.file-upload-container:hover .upload-icon {
  color: #e4e4e7;
}

.text-content {
  text-align: center;
}

.primary-text {
  font-size: 14px;
  font-weight: 500;
  color: #e4e4e7;
  margin: 0;
}

.highlight {
  color: #6366f1;
  font-weight: 600;
}

.secondary-text {
  font-size: 12px;
  color: #71717a;
  margin: 4px 0 0 0;
}

/* Success State */
.success .file-info {
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: #18181b;
  padding: 12px 16px;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  border: 1px solid #27272a;
}

.file-icon-wrapper {
  color: #6366f1;
  display: flex;
  align-items: center;
}

.file-details {
  flex: 1;
  overflow: hidden;
  text-align: left;
}

.file-name {
  font-size: 14px;
  color: #f4f4f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  font-weight: 500;
}

.file-size {
  font-size: 11px;
  color: #a1a1aa;
  margin: 2px 0 0 0;
}

.remove-btn {
  background: transparent;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Loading State */
.uploading .spinner-container {
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.text-accent {
  color: #6366f1;
}

.error-message {
  position: absolute;
  bottom: -24px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ef4444;
}
</style>
