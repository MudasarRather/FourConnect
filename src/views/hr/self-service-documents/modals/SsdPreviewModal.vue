<template>
  <Teleport to="body">
    <div class="ssd-modal-overlay preview" @click.self="$emit('close')">
      <Motion as="div"
        class="ssd-modal-card preview-card"
        :initial="{ opacity: 0, y: 20, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="modal-head">
          <div class="head-meta">
            <span class="modal-eyebrow"><span class="modal-eyebrow-dot" />{{ doc.category.replace(/_/g, ' ') }}</span>
            <h3 class="modal-title">{{ doc.title }}</h3>
            <p class="modal-sub">{{ doc.file_name || doc.doc_type }} · {{ doc.file_type?.toUpperCase() || 'FILE' }}</p>
          </div>
          <div class="head-actions">
            <Motion as="button"
              class="head-btn"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }"
              :disabled="!previewUrl"
              @click="onDownload"
              title="Download"
            >
              <Download :size="14" />
            </Motion>
            <button class="modal-close" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </div>
        </header>

        <div class="preview-body">
          <div v-if="loading" class="preview-state">
            <span class="spinner-big" />
            <p>Loading preview…</p>
          </div>
          <div v-else-if="error" class="preview-state error">
            <FileX :size="32" />
            <p>{{ error }}</p>
          </div>
          <template v-else-if="previewUrl">
            <iframe v-if="isPdf" :src="previewUrl" class="preview-frame"
              referrerpolicy="no-referrer" />
            <img v-else-if="isImage" :src="previewUrl" class="preview-img" :alt="doc.title" />
            <div v-else class="preview-state">
              <FileText :size="32" />
              <p>This file type isn't previewable in browser.</p>
              <Motion as="button"
                class="head-btn primary"
                :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }"
                @click="onDownload"
              >
                <Download :size="13" />
                <span>Download to view</span>
              </Motion>
            </div>
          </template>
        </div>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { X, Download, FileText, FileX } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useSelfServiceDocuments } from '@/composables/useSelfServiceDocuments'

const props = defineProps({
  doc: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const toast = useToast()
const { downloadUrlMine } = useSelfServiceDocuments()
const previewUrl = ref('')
const loading = ref(true)
const error = ref('')

const isPdf   = computed(() => (props.doc.file_type || '').toLowerCase() === 'pdf')
const isImage = computed(() => ['jpg', 'jpeg', 'png', 'webp'].includes((props.doc.file_type || '').toLowerCase()))

const downloadUrl = ref('')

onMounted(async () => {
  try {
    if (!props.doc.has_file) {
      error.value = 'No file attached to this document'
      return
    }
    // Two separate signed URLs: inline=true for iframe preview, default
    // (attachment) for the explicit download button. Each call mints a
    // distinct 5-minute token — they're cheap.
    const [previewSignedUrl, downloadSignedUrl] = await Promise.all([
      downloadUrlMine(props.doc.id, { inline: true }),
      downloadUrlMine(props.doc.id),
    ])
    previewUrl.value = previewSignedUrl
    downloadUrl.value = downloadSignedUrl
  } catch (e) {
    error.value = 'Could not load preview'
  } finally {
    loading.value = false
  }
})

function onDownload() {
  if (!downloadUrl.value) return
  // Force a download by appending to anchor
  const a = document.createElement('a')
  a.href = downloadUrl.value
  a.download = props.doc.file_name || props.doc.title
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  toast.success('Download started')
}
</script>

<style>
@import '../../../../styles/self-service-documents-theme.css';
</style>

<style scoped>
@import './ssd-modal-shared.css';

.ssd-modal-overlay.preview { padding: 16px; }
.preview-card {
  max-width: 1100px;
  width: 100%;
  height: calc(100vh - 32px);
  max-height: calc(100vh - 32px);
}

.head-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.head-actions { display: flex; gap: 6px; }
.head-btn {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .2s;
}
.head-btn:hover { background: rgba(251, 191, 36, 0.24); }
.head-btn.primary {
  width: auto; gap: 6px; padding: 8px 14px;
  font: inherit; font-size: 12px; font-weight: 800;
  background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
  color: #1f1408;
  border-color: rgba(251, 191, 36, 0.55);
}
[data-theme="light"] .head-btn { background: rgba(251, 191, 36, 0.22); color: var(--hr-text); border-color: rgba(180, 83, 9, 0.30); }

.preview-body {
  flex: 1;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  background: rgba(0, 0, 0, 0.30);
}
[data-theme="light"] .preview-body { background: rgba(120, 53, 15, 0.06); }

.preview-frame {
  width: 100%; height: 100%;
  border: 0;
  background: #fff;
}
.preview-img {
  max-width: 100%; max-height: 100%;
  border-radius: 12px;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.7);
}

.preview-state {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  color: var(--hr-text-muted);
  padding: 40px;
  text-align: center;
}
.preview-state.error { color: #fca5a5; }
[data-theme="light"] .preview-state.error { color: #b91c1c; }
.preview-state p { margin: 0; font-size: 13px; font-weight: 700; color: var(--hr-text); }
[data-theme="light"] .preview-state p { color: var(--hr-text); }
.spinner-big {
  width: 38px; height: 38px;
  border: 3px solid rgba(251, 191, 36, 0.20);
  border-top-color: #fbbf24;
  border-radius: 50%;
  animation: ssd-glow-orbit 0.9s linear infinite;
}
</style>
