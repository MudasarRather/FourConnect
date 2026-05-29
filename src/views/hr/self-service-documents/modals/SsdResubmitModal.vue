<template>
  <Teleport to="body">
    <div class="ssd-modal-overlay" @click.self="$emit('close')">
      <Motion as="div"
        class="ssd-modal-card narrow"
        :initial="{ opacity: 0, y: 20, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="modal-aurora" aria-hidden="true" />

        <header class="modal-head">
          <div>
            <span class="modal-eyebrow"><span class="modal-eyebrow-dot" />Re-upload &amp; retry</span>
            <h3 class="modal-title">Resubmit Document</h3>
            <p class="modal-sub">Replace the rejected file with a corrected version. HR will re-verify.</p>
          </div>
          <button class="modal-close" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
        </header>

        <div class="modal-body">
          <!-- Original document summary + rejection reason -->
          <article class="orig-card">
            <header>
              <span class="orig-icon"><FileText :size="16" /></span>
              <div>
                <strong>{{ doc.title }}</strong>
                <span>{{ formatType(doc.doc_type) }} · {{ formatCategory(doc.category) }}</span>
              </div>
            </header>
            <div v-if="doc.rejection_reason" class="reject-note">
              <AlertOctagon :size="14" />
              <div>
                <strong>HR rejection reason</strong>
                <span>{{ doc.rejection_reason }}</span>
              </div>
            </div>
            <div v-else class="reject-note neutral">
              <Info :size="14" />
              <div>
                <strong>Resubmit requested</strong>
                <span>HR has asked you to re-upload this document.</span>
              </div>
            </div>
          </article>

          <!-- New file drop -->
          <div class="drop-zone"
            :class="{ 'has-file': !!file, 'is-dragging': isDragging }"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
            @click="$refs.fileInput.click()"
          >
            <input ref="fileInput" type="file" hidden
              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
              @change="onFileSelect" />

            <template v-if="!file">
              <div class="drop-icon"><RefreshCw :size="30" /></div>
              <p class="drop-title">Drop the new version, or <span class="link">browse</span></p>
              <p class="drop-sub">PDF · PNG · JPG · DOCX · XLSX — up to 10 MB</p>
            </template>
            <template v-else>
              <div class="file-preview">
                <span class="file-thumb"><FileText :size="24" /></span>
                <div class="file-meta">
                  <strong>{{ file.name }}</strong>
                  <span>{{ formatSize(file.size) }}</span>
                </div>
                <button class="file-clear" @click.stop="file = null"><X :size="13" /></button>
              </div>
            </template>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="btn-ghost" @click="$emit('close')" :disabled="submitting">Cancel</button>
          <Motion as="button"
            class="btn-primary"
            :whileHover="{ y: -1, scale: 1.02 }"
            :whileTap="{ scale: 0.96 }"
            :disabled="!file || submitting"
            @click="onSubmit"
          >
            <span v-if="submitting" class="spinner" />
            <RefreshCw v-else :size="13" />
            <span>{{ submitting ? 'Resubmitting…' : 'Resubmit for Review' }}</span>
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { X, FileText, RefreshCw, AlertOctagon, Info } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useSelfServiceDocuments } from '@/composables/useSelfServiceDocuments'

const props = defineProps({
  doc: { type: Object, required: true },
})
const emit = defineEmits(['close', 'resubmitted'])

const toast = useToast()
const { resubmitMine } = useSelfServiceDocuments()
const file = ref(null)
const isDragging = ref(false)
const submitting = ref(false)

function onDrop(e) {
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) file.value = f
}
function onFileSelect(e) {
  const f = e.target.files?.[0]
  if (f) file.value = f
}
function formatSize(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function formatType(s) {
  return String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function formatCategory(s) {
  return formatType(s)
}

async function onSubmit() {
  if (!file.value) return
  if (file.value.size > 10 * 1024 * 1024) {
    toast.error('File exceeds 10 MB limit')
    return
  }
  submitting.value = true
  try {
    const updated = await resubmitMine(props.doc.id, file.value)
    toast.success('Document resubmitted. HR will re-verify.')
    emit('resubmitted', updated)
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Resubmit failed.')
  } finally {
    submitting.value = false
  }
}
</script>

<!-- Theme tokens registered globally; shared modal styles imported into scoped block. -->
<style>
@import '../../../../styles/self-service-documents-theme.css';
</style>

<style scoped>
@import './ssd-modal-shared.css';

.ssd-modal-card.narrow { max-width: 540px; }

.orig-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.22);
  display: flex; flex-direction: column; gap: 10px;
}
[data-theme="light"] .orig-card { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.22); }
.orig-card header { display: flex; gap: 10px; align-items: center; }
.orig-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  display: inline-flex; align-items: center; justify-content: center;
}
.orig-card header strong { display: block; font-size: 13.5px; font-weight: 800; color: var(--hr-text); }
.orig-card header span  { display: block; font-size: 11px; color: var(--hr-text-muted); }

.reject-note {
  display: flex; gap: 9px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.16);
  border: 1px solid rgba(220, 38, 38, 0.40);
  color: #fca5a5;
}
.reject-note.neutral {
  background: rgba(2, 132, 199, 0.10);
  border-color: rgba(2, 132, 199, 0.32);
  color: #7dd3fc;
}
.reject-note svg { flex-shrink: 0; margin-top: 1px; }
.reject-note strong { display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 2px; }
.reject-note span { font-size: 12px; line-height: 1.4; }
[data-theme="light"] .reject-note { color: #991b1b; background: rgba(254, 226, 226, 0.85); border-color: rgba(185, 28, 28, 0.40); }
[data-theme="light"] .reject-note.neutral { color: #075985; background: rgba(224, 242, 254, 0.85); border-color: rgba(2, 132, 199, 0.32); }
</style>
