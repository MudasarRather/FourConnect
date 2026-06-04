<template>
  <Teleport to="body">
    <transition name="pum">
      <div v-if="open" class="pum-scrim" @click.self="onScrimClick">
        <Motion class="pum-card" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.94, rotateX: -6 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :exit="{ opacity: 0, y: 14, scale: 0.96 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ════════════════════════ Ambient ════════════════════════ -->
          <div class="pum-atm" aria-hidden="true">
            <span class="pum-orb a1" />
            <span class="pum-orb a2" />
            <span class="pum-orb a3" />
            <span class="pum-grid" />
            <span class="pum-scan" />
          </div>

          <!-- ════════════════════════ HEADER ════════════════════════ -->
          <header class="pum-head">
            <div class="pum-head-l">
              <span class="pum-eye leave-mono">
                <span class="pum-eye-dot" />
                Action needed
              </span>
              <h2 class="pum-title">HR requested supporting documents</h2>
              <p v-if="leave" class="pum-sub">
                <span class="pum-sub-ref leave-mono">{{ leave.reference_no || '—' }}</span>
                <span class="pum-sub-dot" />
                <span class="pum-sub-type">{{ leaveTypeLabel }}</span>
                <span class="pum-sub-dot" />
                <span class="pum-sub-range leave-mono">{{ leaveRange }}</span>
              </p>
            </div>
            <button class="pum-close" @click="close" aria-label="Close">
              <X :size="15" />
            </button>
          </header>

          <!-- ════════════════════════ BODY ════════════════════════ -->
          <main class="pum-body">

            <!-- ───────────── SECTION 01 — HR Note ───────────── -->
            <section class="pum-section" v-if="hrNote || proofRequestedAt">
              <span class="sec-eye leave-mono">
                <span class="sec-eye-num">01</span>
                <span>HR's note</span>
              </span>

              <Motion as="div" class="hr-note"
                :initial="{ opacity: 0, x: -10 }"
                :animate="{ opacity: 1, x: 0 }"
                :transition="{ duration: 0.5, delay: 0.1 }"
              >
                <span class="hr-note-rail" />
                <span class="hr-note-quote">
                  <Quote :size="16" />
                </span>
                <div class="hr-note-body">
                  <p v-if="hrNote" class="hr-note-text">{{ hrNote }}</p>
                  <p v-else class="hr-note-text hr-note-text-empty">
                    HR has requested documents but did not leave a specific note.
                    Upload anything that supports your reason for leave.
                  </p>
                  <span v-if="proofRequestedAt" class="hr-note-meta leave-mono">
                    <Clock :size="10" />
                    <span>asked {{ relTime(proofRequestedAt) }}</span>
                  </span>
                </div>
              </Motion>
            </section>

            <!-- ───────────── SECTION 02 — Drop zone ───────────── -->
            <section class="pum-section">
              <span class="sec-eye leave-mono">
                <span class="sec-eye-num">02</span>
                <span>Attach documents</span>
                <span class="sec-counter" :class="{ 'is-full': files.length >= MAX_FILES }">
                  {{ files.length }} / {{ MAX_FILES }} attachments
                </span>
              </span>

              <Motion as="label" class="dropzone"
                :class="{ 'is-drag': dragOver, 'is-full': files.length >= MAX_FILES }"
                :initial="{ opacity: 0, y: 12 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.55, delay: 0.18 }"
                @dragenter.prevent="onDragEnter"
                @dragover.prevent="onDragEnter"
                @dragleave.prevent="onDragLeave"
                @drop.prevent="onDrop"
              >
                <input ref="fileInputRef" type="file" multiple
                  :accept="ACCEPT_ATTR"
                  :disabled="files.length >= MAX_FILES"
                  @change="onPick"
                  class="dropzone-input"
                />

                <!-- Ring waves on hover/drag -->
                <span class="dz-ring dz-ring-1" />
                <span class="dz-ring dz-ring-2" />
                <span class="dz-ring dz-ring-3" />

                <Motion as="span" class="dz-ico"
                  :animate="dragOver ? { y: -6, scale: 1.12 } : { y: 0, scale: 1 }"
                  :transition="{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }"
                >
                  <CloudUpload :size="36" />
                </Motion>

                <div class="dz-copy">
                  <strong class="dz-title">
                    {{ dragOver ? 'Release to upload' : 'Drag &amp; drop files here' }}
                  </strong>
                  <span class="dz-or">or click to choose</span>
                </div>

                <span class="dz-hint leave-mono">
                  {{ ALLOWED_LABEL }} · up to 10&nbsp;MB each
                </span>
              </Motion>
            </section>

            <!-- ───────────── SECTION 03 — File list ───────────── -->
            <section class="pum-section">
              <span class="sec-eye leave-mono">
                <span class="sec-eye-num">03</span>
                <span>Your uploads</span>
              </span>

              <!-- Loading state -->
              <div v-if="loading && !files.length" class="files-skel">
                <div v-for="i in 2" :key="`fsk-${i}`" class="file-skel leave-skel" />
              </div>

              <!-- Empty state -->
              <div v-else-if="!files.length" class="files-empty">
                <svg viewBox="0 0 200 110" class="empty-svg" aria-hidden="true">
                  <defs>
                    <radialGradient id="pumEmptyG" cx="50%" cy="50%" r="50%">
                      <stop offset="0%"  stop-color="#fbbf24" stop-opacity="0.32" />
                      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="100" cy="55" r="48" fill="url(#pumEmptyG)" />
                  <g class="empty-orbit empty-orbit-a">
                    <ellipse cx="100" cy="55" rx="66" ry="22"
                      fill="none" stroke="rgba(251,191,36,0.32)" stroke-width="1.1"
                      stroke-dasharray="3 4" />
                  </g>
                  <g class="empty-orbit empty-orbit-b">
                    <ellipse cx="100" cy="55" rx="50" ry="14"
                      fill="none" stroke="rgba(6,182,212,0.36)" stroke-width="1.1"
                      stroke-dasharray="3 4" />
                  </g>
                  <g class="empty-doc">
                    <rect x="86" y="38" width="28" height="34" rx="4"
                      fill="rgba(28,18,10,0.85)"
                      stroke="rgba(251,191,36,0.6)" stroke-width="1.2" />
                    <line x1="91" y1="46" x2="109" y2="46" stroke="rgba(251,191,36,0.45)" stroke-width="1.2" stroke-linecap="round" />
                    <line x1="91" y1="52" x2="105" y2="52" stroke="rgba(251,191,36,0.30)" stroke-width="1.2" stroke-linecap="round" />
                    <line x1="91" y1="58" x2="107" y2="58" stroke="rgba(251,191,36,0.30)" stroke-width="1.2" stroke-linecap="round" />
                  </g>
                </svg>
                <strong>No documents yet</strong>
                <span>Drop a file above or pick one to get started.</span>
              </div>

              <!-- File rows -->
              <div v-else class="file-list">
                <Motion v-for="(f, i) in files" :key="f.localKey" as="div"
                  class="file-row" :data-status="f.status"
                  :initial="{ opacity: 0, x: -14 }"
                  :animate="{ opacity: 1, x: 0 }"
                  :exit="{ opacity: 0, x: 14 }"
                  :transition="{ duration: 0.4, delay: 0.04 + Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }"
                >
                  <!-- Preview / icon -->
                  <span class="fr-thumb">
                    <img v-if="f.previewUrl" :src="f.previewUrl" alt="" class="fr-thumb-img" />
                    <component v-else :is="iconFor(f.mime, f.name)" :size="18" />
                  </span>

                  <!-- Meta -->
                  <div class="fr-meta">
                    <strong class="fr-name" :title="f.name">{{ f.name }}</strong>
                    <span class="fr-sub leave-mono">
                      <span>{{ fmtSize(f.size) }}</span>
                      <span class="fr-sub-dot" />
                      <span>{{ f.mime || 'unknown' }}</span>
                    </span>

                    <!-- Progress bar (during upload) -->
                    <div v-if="f.status === 'uploading'" class="fr-progress">
                      <div class="fr-progress-rail">
                        <Motion as="div" class="fr-progress-fill"
                          :initial="{ width: '0%' }"
                          :animate="{ width: f.progress + '%' }"
                          :transition="{ duration: 0.25, ease: 'linear' }"
                        />
                      </div>
                      <span class="fr-progress-pct leave-mono">{{ f.progress }}%</span>
                    </div>

                    <!-- Error message -->
                    <p v-else-if="f.status === 'error'" class="fr-error">
                      <AlertCircle :size="11" />
                      <span>{{ f.error || 'Upload failed' }}</span>
                    </p>
                  </div>

                  <!-- Trailing controls -->
                  <div class="fr-tail">
                    <!-- Success check (SVG draw) -->
                    <Motion v-if="f.status === 'uploaded'" as="span" class="fr-check" aria-label="Uploaded"
                      :initial="{ scale: 0, rotate: -90 }"
                      :animate="{ scale: 1, rotate: 0 }"
                      :transition="{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }"
                    >
                      <svg viewBox="0 0 24 24" class="check-svg" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"
                          fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.4" />
                        <path d="M7 12.5 L10.5 16 L17 9"
                          fill="none" stroke="currentColor" stroke-width="2.2"
                          stroke-linecap="round" stroke-linejoin="round"
                          class="check-tick" />
                      </svg>
                    </Motion>

                    <Motion v-else-if="f.status === 'uploading'" as="span" class="fr-spinner" aria-label="Uploading"
                      :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                    >
                      <span class="spinner-ring" />
                    </Motion>

                    <!-- Retry on error -->
                    <button v-if="f.status === 'error'" class="fr-btn fr-btn-retry"
                      @click="retry(f)" aria-label="Retry upload">
                      <RefreshCw :size="13" />
                    </button>

                    <!-- Delete (only when on server) -->
                    <button v-if="f.status === 'uploaded' && f.serverId"
                      class="fr-btn fr-btn-del" :disabled="f.deleting"
                      @click="onDelete(f)" aria-label="Remove attachment">
                      <Trash2 :size="13" />
                    </button>

                    <!-- Discard local-only error row -->
                    <button v-else-if="f.status === 'error'" class="fr-btn fr-btn-del"
                      @click="discard(f)" aria-label="Discard">
                      <X :size="13" />
                    </button>
                  </div>
                </Motion>
              </div>
            </section>
          </main>

          <!-- ════════════════════════ FOOTER ════════════════════════ -->
          <footer class="pum-foot">
            <div class="pum-foot-l">
              <span v-if="uploadedCount" class="foot-ok">
                <CheckCircle2 :size="13" />
                <strong>{{ uploadedCount }}</strong>
                <span>file{{ uploadedCount === 1 ? '' : 's' }} attached</span>
              </span>
              <span v-else class="foot-ko leave-mono">
                <AlertCircle :size="12" />
                <span>No documents uploaded yet</span>
              </span>
            </div>
            <div class="pum-foot-r">
              <button class="leave-btn" @click="close" :disabled="isUploading">
                Cancel
              </button>
              <Motion as="button" class="leave-btn leave-btn-primary"
                :disabled="!uploadedCount || isUploading"
                :whileHover="(uploadedCount && !isUploading) ? { y: -2, scale: 1.02 } : {}"
                :whileTap="(uploadedCount && !isUploading) ? { scale: 0.97 } : {}"
                @click="close"
              >
                <Check :size="13" />
                <span>{{ uploadedCount ? 'All set — close' : 'Mark as submitted' }}</span>
              </Motion>
            </div>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>

  <!-- Delete-attachment confirmation modal (ultra-modern, reason capture) -->
  <ProofAttachmentDeleteModal
    :open="deleteModal.open"
    :attachment="deleteAttachment"
    @cancel="onDeleteCancel"
    @confirm="onDeleteConfirm"
  />
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  CloudUpload, FileText, Image as ImageIcon, FileType, Trash2,
  Check, X, Quote, Clock, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import {
  fetchLeaveProofs, uploadLeaveProof, deleteLeaveProof, typeMeta,
} from '@/composables/useLeaves'
import ProofAttachmentDeleteModal from './ProofAttachmentDeleteModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  leave: { type: Object, default: null },
})
const emit = defineEmits(['close', 'updated'])

const toast = useToast()

// ─── Constants ────────────────────────────────────────────────────────
const MAX_FILES = 10
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx']
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const ACCEPT_ATTR = ALLOWED_EXT.map(e => '.' + e).join(',')
const ALLOWED_LABEL = ALLOWED_EXT.map(e => '.' + e).join(' · ')

// ─── State ────────────────────────────────────────────────────────────
const files = ref([])      // see schema below
const dragOver = ref(false)
const loading = ref(false)
const hrNote = ref('')
const proofRequestedAt = ref(null)
const fileInputRef = ref(null)

let dragCounter = 0
let nextKey = 0

/* File row schema:
   {
     localKey:   number (stable across renders),
     file:       File | null  (null once persisted),
     name:       string,
     size:       number,
     mime:       string,
     previewUrl: string | null  (object-URL for images),
     status:     'pending' | 'uploading' | 'uploaded' | 'error',
     progress:   0..100,
     error:      string | null,
     serverId:   string | null  (uuid once persisted),
     fileUrl:    string | null,
     deleting:   boolean,
   }
*/

// ─── Derived ──────────────────────────────────────────────────────────
const leaveTypeLabel = computed(() =>
  props.leave?.leave_type ? (typeMeta(props.leave.leave_type)?.label || props.leave.leave_type) : ''
)
const leaveRange = computed(() => {
  if (!props.leave?.from_date) return ''
  return props.leave.from_date === props.leave.to_date
    ? fmtDate(props.leave.from_date)
    : `${fmtDate(props.leave.from_date)} → ${fmtDate(props.leave.to_date)}`
})
const uploadedCount = computed(() => files.value.filter(f => f.status === 'uploaded').length)
const isUploading = computed(() => files.value.some(f => f.status === 'uploading'))

// ─── Lifecycle ────────────────────────────────────────────────────────
watch(() => [props.open, props.leave?.id], async ([isOpen, _id]) => {
  if (isOpen && props.leave?.id) {
    await hydrate()
  } else if (!isOpen) {
    // Defer cleanup so the leave-out animation has data to render against
    setTimeout(() => {
      if (!props.open) revokePreviews()
      // Keep file rows briefly so the close transition is smooth; the next
      // open() call calls hydrate() which resets them.
    }, 400)
  }
})

onBeforeUnmount(() => { revokePreviews() })

const revokePreviews = () => {
  for (const f of files.value) {
    if (f.previewUrl) {
      try { URL.revokeObjectURL(f.previewUrl) } catch {}
    }
  }
}

const hydrate = async () => {
  loading.value = true
  revokePreviews()
  files.value = []
  hrNote.value = ''
  proofRequestedAt.value = null

  try {
    const data = await fetchLeaveProofs(props.leave.id)
    hrNote.value = data?.proof_request_note || props.leave?.proof_request_note || ''
    proofRequestedAt.value = data?.proof_requested_at || props.leave?.proof_requested_at || null
    const items = data?.items || []
    files.value = items.map((it) => ({
      localKey: ++nextKey,
      file: null,
      name: it.file_name || it.original_filename || 'document',
      size: Number(it.file_size || it.size || 0),
      mime: it.mime_type || it.content_type || '',
      previewUrl: null,
      status: 'uploaded',
      progress: 100,
      error: null,
      serverId: it.id,
      fileUrl: it.file_url || null,
      deleting: false,
    }))
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load existing attachments')
  } finally {
    loading.value = false
  }
}

// ─── Drag and drop ────────────────────────────────────────────────────
const onDragEnter = (e) => {
  if (files.value.length >= MAX_FILES) return
  dragCounter++
  dragOver.value = true
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}
const onDragLeave = () => {
  dragCounter = Math.max(0, dragCounter - 1)
  if (dragCounter === 0) dragOver.value = false
}
const onDrop = (e) => {
  dragCounter = 0
  dragOver.value = false
  const list = e?.dataTransfer?.files
  if (!list || !list.length) return
  enqueue(Array.from(list))
}
const onPick = (e) => {
  const list = e?.target?.files
  if (list && list.length) enqueue(Array.from(list))
  // Reset so picking the same file twice still fires change
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// ─── Queue + upload ───────────────────────────────────────────────────
const validate = (file) => {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIMES.has(file.type)) {
    return `Unsupported file type (.${ext || '?'})`
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Too large (${fmtSize(file.size)}) — max 10 MB`
  }
  return null
}

const enqueue = (raws) => {
  const room = MAX_FILES - files.value.length
  if (room <= 0) {
    toast.error(`You can attach at most ${MAX_FILES} files.`)
    return
  }
  const slice = raws.slice(0, room)
  if (raws.length > room) {
    toast.warning(`Only the first ${room} file${room === 1 ? '' : 's'} were queued.`)
  }
  for (const raw of slice) {
    const err = validate(raw)
    if (err) {
      toast.error(`${raw.name}: ${err}`)
      continue
    }
    const isImage = (raw.type || '').startsWith('image/')
    // IMPORTANT: wrap the row in reactive() before pushing.
    // If we push a plain object then keep the same reference for startUpload,
    // mutations like `row.status = 'uploaded'` go to the RAW object and bypass
    // the array proxy's set trap — so Vue never re-renders. The UI would stay
    // stuck on the initial 0% / pending state until another reactive write
    // (e.g. the user picking a second file) forced a re-evaluation of the list.
    const row = reactive({
      localKey: ++nextKey,
      file: raw,
      name: raw.name,
      size: raw.size,
      mime: raw.type || '',
      previewUrl: isImage ? URL.createObjectURL(raw) : null,
      status: 'pending',
      progress: 0,
      error: null,
      serverId: null,
      fileUrl: null,
      deleting: false,
    })
    files.value.push(row)
    startUpload(row)
  }
}

const startUpload = async (row) => {
  if (!props.leave?.id) {
    row.status = 'error'
    row.error = 'Missing leave context'
    return
  }
  row.status = 'uploading'
  row.progress = 0
  row.error = null
  try {
    const res = await uploadLeaveProof(props.leave.id, row.file, (pct) => {
      row.progress = pct
    })
    row.status = 'uploaded'
    row.progress = 100
    row.serverId = res?.id || null
    row.fileUrl = res?.file_url || null
    row.mime = res?.mime_type || row.mime
    row.size = Number(res?.file_size || row.size)
    emit('updated')
  } catch (e) {
    row.status = 'error'
    row.error = e?.response?.data?.detail || 'Upload failed'
  }
}

const retry = (row) => {
  if (!row.file) {
    toast.error('Original file is no longer available — re-pick it.')
    return
  }
  startUpload(row)
}

const discard = (row) => {
  const idx = files.value.indexOf(row)
  if (idx >= 0) {
    if (row.previewUrl) { try { URL.revokeObjectURL(row.previewUrl) } catch {} }
    files.value.splice(idx, 1)
  }
}

// ─── Delete confirmation modal (ultra-modern, with reason capture) ───────
const deleteModal = ref({ open: false, row: null })

// Snapshot the row into a serializable attachment-preview for the delete modal.
// The modal only needs the fields it displays — we don't pass the whole reactive
// row to keep the modal's surface decoupled from the upload-row schema.
const deleteAttachment = computed(() => {
  const r = deleteModal.value.row
  if (!r) return null
  return {
    id: r.serverId || r.localKey,
    serverId: r.serverId,
    name: r.name,
    size: r.size,
    mime: r.mime,
    previewUrl: r.previewUrl,
    fileUrl: r.fileUrl,
  }
})

const onDelete = (row) => {
  if (!row.serverId || row.deleting) return
  deleteModal.value = { open: true, row }
}

const onDeleteCancel = () => {
  deleteModal.value = { open: false, row: null }
}

const onDeleteConfirm = async ({ reason, note }) => {
  const row = deleteModal.value.row
  if (!row || !row.serverId || row.deleting) {
    deleteModal.value = { open: false, row: null }
    return
  }
  row.deleting = true
  try {
    await deleteLeaveProof(props.leave.id, row.serverId, { reason, note })
    const idx = files.value.indexOf(row)
    if (idx >= 0) {
      if (row.previewUrl) { try { URL.revokeObjectURL(row.previewUrl) } catch {} }
      files.value.splice(idx, 1)
    }
    toast.success('Attachment removed')
    emit('updated')
    deleteModal.value = { open: false, row: null }
  } catch (e) {
    row.deleting = false
    toast.error(e?.response?.data?.detail || 'Delete failed')
    // Keep the modal open so the user can retry / cancel after seeing the toast.
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
const iconFor = (mime, name) => {
  const lower = (mime || '').toLowerCase()
  if (lower.startsWith('image/')) return ImageIcon
  if (lower === 'application/pdf' || /\.pdf$/i.test(name || '')) return FileType
  if (/word|doc/i.test(lower) || /\.docx?$/i.test(name || '')) return FileText
  return FileText
}

const fmtSize = (n) => {
  const v = Number(n) || 0
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  return `${(v / 1024 / 1024).toFixed(2)} MB`
}

const fmtDate = (v) => v
  ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  : '—'

const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 1)    return 'just now'
  if (m < 60)   return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

const onScrimClick = () => { if (!isUploading.value) close() }
const close = () => {
  if (isUploading.value) {
    toast.info('Wait for uploads to finish before closing.')
    return
  }
  emit('close')
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ════════════════════════════════════════════════════════════════════
   SCRIM — cyan + gold radial blend behind a 16px blur
   ════════════════════════════════════════════════════════════════ */
.pum-scrim {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  perspective: 1500px;
  background:
    radial-gradient(50% 50% at 70% 30%, rgba(6, 182, 212, 0.22), transparent 60%),
    radial-gradient(60% 60% at 30% 70%, rgba(251, 146, 60, 0.28), transparent 65%),
    radial-gradient(60% 60% at 50% 50%, rgba(20, 14, 8, 0.65), rgba(0, 0, 0, 0.78));
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
}
[data-theme="light"] .pum-scrim {
  background:
    radial-gradient(50% 50% at 70% 30%, rgba(6, 182, 212, 0.20), transparent 60%),
    radial-gradient(60% 60% at 30% 70%, rgba(217, 119, 6, 0.30), transparent 65%),
    radial-gradient(60% 60% at 50% 50%, rgba(40, 25, 10, 0.40), rgba(20, 14, 8, 0.55));
}

/* Enter / leave (transition group around the scrim) */
.pum-enter-active, .pum-leave-active { transition: opacity .35s ease; }
.pum-enter-from, .pum-leave-to { opacity: 0; }

/* ════════════════════════════════════════════════════════════════════
   CARD
   ════════════════════════════════════════════════════════════════ */
.pum-card {
  position: relative;
  width: 720px; max-width: calc(100vw - 32px);
  max-height: 90vh;
  border-radius: 26px;
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(6, 182, 212, 0.16), transparent 55%),
    radial-gradient(80% 60% at 0% 100%, rgba(251, 191, 36, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 10, 0.97), rgba(14, 10, 6, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.28);
  box-shadow:
    0 60px 120px -40px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(6, 182, 212, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
}
[data-theme="light"] .pum-card {
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(6, 182, 212, 0.18), transparent 55%),
    radial-gradient(80% 60% at 0% 100%, rgba(251, 191, 36, 0.24), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(255, 244, 218, 0.98));
  border-color: rgba(180, 83, 9, 0.30);
  box-shadow:
    0 50px 100px -36px rgba(120, 53, 15, 0.40),
    0 0 0 1px rgba(6, 182, 212, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* ════════════════════════════════════════════════════════════════════
   AMBIENT LAYERS
   ════════════════════════════════════════════════════════════════ */
.pum-atm { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.pum-orb { position: absolute; border-radius: 50%; filter: blur(64px); }
.pum-orb.a1 {
  width: 380px; height: 380px; top: -160px; right: -120px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.55), transparent 70%);
  opacity: 0.55;
  animation: pum-orb-a 22s ease-in-out infinite;
}
.pum-orb.a2 {
  width: 320px; height: 320px; bottom: -120px; left: -100px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.45), transparent 70%);
  opacity: 0.55;
  animation: pum-orb-b 26s ease-in-out infinite;
}
.pum-orb.a3 {
  width: 220px; height: 220px; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(253, 224, 71, 0.16), transparent 70%);
  opacity: 0.5;
  animation: pum-orb-c 18s ease-in-out infinite;
}
@keyframes pum-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,40px) scale(1.08); } }
@keyframes pum-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(36px,-30px) scale(1.10); } }
@keyframes pum-orb-c { 0%,100% { transform: translate(-50%,-50%) scale(0.9); } 50% { transform: translate(-50%,-50%) scale(1.12); } }

.pum-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 80%);
  opacity: 0.7;
}
[data-theme="light"] .pum-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}
.pum-scan {
  position: absolute; left: 0; right: 0; height: 140px;
  background: linear-gradient(180deg, transparent, rgba(6, 182, 212, 0.14), transparent);
  filter: blur(18px);
  transform: translateY(-100%);
  animation: pum-scan 1.8s 0.2s cubic-bezier(0.16,1,0.3,1) forwards;
}
@keyframes pum-scan { to { transform: translateY(110vh); opacity: 0; } }

/* ════════════════════════════════════════════════════════════════════
   HEADER
   ════════════════════════════════════════════════════════════════ */
.pum-head {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;
  padding: 22px 26px 14px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .pum-head { border-bottom-color: rgba(180, 83, 9, 0.22); }

.pum-head-l { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pum-eye {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.20em; text-transform: uppercase;
  color: #fda4af;
  padding: 4px 10px;
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.32);
  border-radius: 999px;
  align-self: flex-start;
}
[data-theme="light"] .pum-eye {
  color: #b91c1c;
  background: rgba(244, 63, 94, 0.16);
  border-color: rgba(185, 28, 28, 0.32);
}
.pum-eye-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.85);
  animation: pum-eye-pulse 1.4s ease-in-out infinite;
}
@keyframes pum-eye-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
  50%      { opacity: 1; transform: scale(1.3); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
}

.pum-title {
  margin: 0;
  font-size: 22px; font-weight: 900; letter-spacing: -0.018em;
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #fb923c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.15;
}
[data-theme="light"] .pum-title {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}

.pum-sub {
  margin: 2px 0 0;
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px;
  color: var(--leave-text-secondary);
  flex-wrap: wrap;
}
.pum-sub-ref { color: #fde68a; font-weight: 700; }
[data-theme="light"] .pum-sub-ref { color: #b45309; }
.pum-sub-type { color: var(--leave-text-secondary); font-weight: 700; }
.pum-sub-range { color: var(--leave-text-muted); }
.pum-sub-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--leave-text-muted); opacity: 0.6;
}

.pum-close {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--leave-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, color .25s, border-color .25s;
}
.pum-close:hover {
  transform: rotate(90deg);
  background: rgba(251, 146, 60, 0.18);
  border-color: rgba(251, 146, 60, 0.55);
  color: #fef3c7;
}
[data-theme="light"] .pum-close {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}

/* ════════════════════════════════════════════════════════════════════
   BODY
   ════════════════════════════════════════════════════════════════ */
.pum-body {
  position: relative; z-index: 2;
  padding: 18px 26px 8px;
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.28) transparent;
}
.pum-body::-webkit-scrollbar { width: 5px; }
.pum-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.28), rgba(217, 119, 6, 0.42));
  border-radius: 3px;
}

.pum-section { display: flex; flex-direction: column; gap: 10px; }
.sec-eye {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.sec-eye-num {
  display: inline-grid; place-items: center;
  width: 18px; height: 18px; border-radius: 6px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.32);
  color: #fbbf24;
  font-weight: 800; font-size: 9.5px;
}
[data-theme="light"] .sec-eye-num {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(180, 83, 9, 0.32);
  color: #b45309;
}
.sec-counter {
  margin-left: auto;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.34);
  color: #67e8f9;
  font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
}
[data-theme="light"] .sec-counter {
  background: rgba(6, 182, 212, 0.16);
  border-color: rgba(8, 145, 178, 0.36);
  color: #0e7490;
}
.sec-counter.is-full {
  background: rgba(244, 63, 94, 0.14);
  border-color: rgba(244, 63, 94, 0.34);
  color: #fda4af;
}
[data-theme="light"] .sec-counter.is-full { color: #b91c1c; }

/* ─────────────── HR Note ─────────────── */
.hr-note {
  position: relative;
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 18px 14px 22px;
  border-radius: 14px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(245, 158, 11, 0.16), transparent 55%),
    linear-gradient(180deg, rgba(40, 28, 14, 0.7), rgba(28, 20, 10, 0.78));
  border: 1px solid rgba(245, 158, 11, 0.30);
  overflow: hidden;
}
[data-theme="light"] .hr-note {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(245, 158, 11, 0.22), transparent 55%),
    rgba(255, 248, 232, 0.95);
  border-color: rgba(180, 83, 9, 0.28);
}
.hr-note-rail {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: 3px;
  background: linear-gradient(180deg, #fde047 0%, #fbbf24 50%, #f59e0b 100%);
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.55);
}
.hr-note-quote {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.10));
  border: 1px solid rgba(251, 191, 36, 0.40);
  color: #fbbf24;
  flex-shrink: 0;
}
[data-theme="light"] .hr-note-quote {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(255, 248, 232, 0.7));
  border-color: rgba(180, 83, 9, 0.30);
  color: #b45309;
}
.hr-note-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.hr-note-text {
  margin: 0;
  font-size: 13px; line-height: 1.55;
  color: var(--leave-text);
  font-style: italic;
}
.hr-note-text-empty { color: var(--leave-text-muted); font-style: normal; }
.hr-note-meta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--leave-text-muted);
}

/* ════════════════════════════════════════════════════════════════════
   DROPZONE — cyan accents
   ════════════════════════════════════════════════════════════════ */
.dropzone {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px;
  padding: 28px 22px;
  border-radius: 18px;
  background:
    radial-gradient(50% 60% at 50% 0%, rgba(6, 182, 212, 0.10), transparent 70%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.55), rgba(14, 10, 6, 0.65));
  border: 2px dashed rgba(6, 182, 212, 0.40);
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  text-align: center;
  transition: background .25s, border-color .25s, transform .25s;
  animation: dz-idle 4.5s ease-in-out infinite;
}
@keyframes dz-idle {
  0%, 100% { border-color: rgba(6, 182, 212, 0.36); }
  50%      { border-color: rgba(6, 182, 212, 0.65); }
}
[data-theme="light"] .dropzone {
  background:
    radial-gradient(50% 60% at 50% 0%, rgba(6, 182, 212, 0.14), transparent 70%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(8, 145, 178, 0.45);
}
.dropzone:hover {
  border-color: rgba(6, 182, 212, 0.78);
  background:
    radial-gradient(50% 60% at 50% 0%, rgba(6, 182, 212, 0.18), transparent 70%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.65), rgba(14, 10, 6, 0.75));
}
.dropzone.is-drag {
  border-color: #06b6d4;
  background:
    radial-gradient(60% 70% at 50% 50%, rgba(6, 182, 212, 0.28), transparent 70%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.75), rgba(14, 10, 6, 0.85));
  box-shadow:
    0 0 0 4px rgba(6, 182, 212, 0.18),
    0 24px 60px -30px rgba(6, 182, 212, 0.65);
  transform: translateY(-2px);
}
.dropzone.is-full {
  cursor: not-allowed; opacity: 0.55;
  border-color: rgba(244, 63, 94, 0.42);
}
.dropzone-input {
  position: absolute; inset: 0;
  opacity: 0;
  cursor: pointer;
}
.dropzone.is-full .dropzone-input { cursor: not-allowed; }

.dz-ring {
  position: absolute; left: 50%; top: 50%;
  border: 1.5px solid rgba(6, 182, 212, 0.30);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity .25s;
}
.dropzone.is-drag .dz-ring { opacity: 1; }
.dz-ring-1 { width: 80px; height: 80px;  animation: dz-ring-out 1.6s ease-out infinite; }
.dz-ring-2 { width: 80px; height: 80px;  animation: dz-ring-out 1.6s ease-out infinite 0.5s; }
.dz-ring-3 { width: 80px; height: 80px;  animation: dz-ring-out 1.6s ease-out infinite 1s; }
@keyframes dz-ring-out {
  0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
}

.dz-ico {
  display: grid; place-items: center;
  width: 64px; height: 64px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.30), rgba(8, 145, 178, 0.10));
  border: 1px solid rgba(6, 182, 212, 0.55);
  color: #67e8f9;
  position: relative;
  z-index: 2;
}
[data-theme="light"] .dz-ico {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.28), rgba(255, 250, 240, 0.7));
  border-color: rgba(8, 145, 178, 0.50);
  color: #0e7490;
}
.dz-copy {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.dz-title {
  font-size: 14.5px; font-weight: 800; color: var(--leave-text);
  letter-spacing: -0.008em;
}
.dz-or {
  font-size: 11.5px; color: var(--leave-text-muted);
}
.dz-hint {
  position: relative; z-index: 2;
  font-size: 10px; letter-spacing: 0.08em;
  color: var(--leave-text-muted);
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.22);
}
[data-theme="light"] .dz-hint {
  background: rgba(6, 182, 212, 0.10);
  border-color: rgba(8, 145, 178, 0.26);
  color: #0e7490;
}

/* ════════════════════════════════════════════════════════════════════
   FILES LIST
   ════════════════════════════════════════════════════════════════ */
.files-skel {
  display: flex; flex-direction: column; gap: 8px;
}
.file-skel {
  height: 56px;
  border-radius: 14px;
}

.files-empty {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 24px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(251, 191, 36, 0.22);
  text-align: center;
}
[data-theme="light"] .files-empty {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(180, 83, 9, 0.22);
}
.files-empty strong {
  font-size: 13px; font-weight: 800; color: var(--leave-text);
  margin-top: 6px;
}
.files-empty span { font-size: 11.5px; color: var(--leave-text-muted); }
.empty-svg {
  width: 200px; height: 110px;
}
.empty-orbit { transform-origin: 100px 55px; }
.empty-orbit-a { animation: empty-orbit-a 14s linear infinite; }
.empty-orbit-b { animation: empty-orbit-b 10s linear infinite reverse; }
@keyframes empty-orbit-a { to { transform: rotate(360deg); } }
@keyframes empty-orbit-b { to { transform: rotate(360deg); } }
.empty-doc { animation: empty-doc-float 4.5s ease-in-out infinite; transform-origin: 100px 55px; }
@keyframes empty-doc-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}

.file-list {
  display: flex; flex-direction: column; gap: 8px;
}

.file-row {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.78));
  border: 1px solid rgba(251, 191, 36, 0.18);
  transition: border-color .25s, background .25s, transform .25s;
  overflow: hidden;
}
[data-theme="light"] .file-row {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.18);
}
.file-row:hover {
  border-color: rgba(6, 182, 212, 0.45);
  transform: translateX(2px);
}
.file-row[data-status="uploaded"] {
  border-color: rgba(74, 222, 128, 0.28);
  background:
    radial-gradient(50% 100% at 0% 50%, rgba(74, 222, 128, 0.08), transparent 70%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.78));
}
[data-theme="light"] .file-row[data-status="uploaded"] {
  background:
    radial-gradient(50% 100% at 0% 50%, rgba(74, 222, 128, 0.10), transparent 70%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(4, 120, 87, 0.28);
}
.file-row[data-status="uploading"] {
  border-color: rgba(6, 182, 212, 0.45);
}
.file-row[data-status="error"] {
  border-color: rgba(244, 63, 94, 0.42);
  background:
    radial-gradient(50% 100% at 0% 50%, rgba(244, 63, 94, 0.10), transparent 70%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.62), rgba(20, 14, 8, 0.78));
}
[data-theme="light"] .file-row[data-status="error"] {
  background:
    radial-gradient(50% 100% at 0% 50%, rgba(244, 63, 94, 0.10), transparent 70%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
}

.fr-thumb {
  display: grid; place-items: center;
  width: 40px; height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.20), rgba(8, 145, 178, 0.05));
  border: 1px solid rgba(6, 182, 212, 0.35);
  color: #67e8f9;
  flex-shrink: 0;
  overflow: hidden;
}
[data-theme="light"] .fr-thumb {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.20), rgba(255, 250, 240, 0.7));
  border-color: rgba(8, 145, 178, 0.36);
  color: #0e7490;
}
.fr-thumb-img {
  width: 100%; height: 100%; object-fit: cover;
}

.fr-meta {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 3px;
}
.fr-name {
  font-size: 13px; font-weight: 700; color: var(--leave-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fr-sub {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; color: var(--leave-text-muted);
  font-weight: 600;
}
.fr-sub-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--leave-text-muted); opacity: 0.55;
}

.fr-progress {
  display: flex; align-items: center; gap: 8px;
  margin-top: 6px;
}
.fr-progress-rail {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  position: relative;
}
[data-theme="light"] .fr-progress-rail { background: rgba(180, 83, 9, 0.10); }
.fr-progress-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #06b6d4, #0891b2 50%, #67e8f9);
  background-size: 200% 100%;
  animation: fr-progress-pan 2.4s linear infinite;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.45);
}
@keyframes fr-progress-pan {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
.fr-progress-pct {
  font-size: 10px; font-weight: 700; color: #67e8f9;
  min-width: 32px; text-align: right;
}
[data-theme="light"] .fr-progress-pct { color: #0e7490; }

.fr-error {
  margin: 4px 0 0;
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700;
  color: #fda4af;
}
[data-theme="light"] .fr-error { color: #b91c1c; }

.fr-tail {
  display: flex; align-items: center; gap: 6px;
  flex-shrink: 0;
}

/* Success check — SVG draw */
.fr-check {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(74, 222, 128, 0.16);
  border: 1px solid rgba(74, 222, 128, 0.40);
  color: #4ade80;
}
[data-theme="light"] .fr-check {
  background: rgba(74, 222, 128, 0.20);
  border-color: rgba(4, 120, 87, 0.40);
  color: #047857;
}
.check-svg { width: 18px; height: 18px; }
.check-tick {
  stroke-dasharray: 22;
  stroke-dashoffset: 22;
  animation: check-draw 0.55s cubic-bezier(0.65, 0, 0.45, 1) 0.1s forwards;
}
@keyframes check-draw { to { stroke-dashoffset: 0; } }

/* Spinner */
.fr-spinner {
  display: grid; place-items: center;
  width: 30px; height: 30px;
}
.spinner-ring {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(6, 182, 212, 0.20);
  border-top-color: #06b6d4;
  animation: fr-spin 0.8s linear infinite;
}
@keyframes fr-spin { to { transform: rotate(360deg); } }

/* Action buttons */
.fr-btn {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--leave-text-muted);
  cursor: pointer;
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1),
              background .22s, color .22s, border-color .22s;
}
.fr-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.fr-btn-del:hover:not(:disabled) {
  transform: rotate(90deg);
  background: rgba(244, 63, 94, 0.16);
  border-color: rgba(244, 63, 94, 0.45);
  color: #fda4af;
}
.fr-btn-retry:hover:not(:disabled) {
  transform: rotate(180deg);
  background: rgba(6, 182, 212, 0.16);
  border-color: rgba(6, 182, 212, 0.45);
  color: #67e8f9;
}
[data-theme="light"] .fr-btn {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.20);
  color: #6b5840;
}
[data-theme="light"] .fr-btn-del:hover:not(:disabled) { color: #b91c1c; }
[data-theme="light"] .fr-btn-retry:hover:not(:disabled) { color: #0e7490; }

/* ════════════════════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════════════════ */
.pum-foot {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  gap: 14px;
  padding: 16px 26px 18px;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
  flex-wrap: wrap;
}
[data-theme="light"] .pum-foot { border-top-color: rgba(180, 83, 9, 0.22); }

.pum-foot-l {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px;
}
.foot-ok {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.36);
  color: #86efac;
  font-weight: 700;
}
.foot-ok strong { font-weight: 800; }
[data-theme="light"] .foot-ok {
  background: rgba(74, 222, 128, 0.18);
  border-color: rgba(4, 120, 87, 0.36);
  color: #047857;
}
.foot-ko {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--leave-text-muted);
  font-size: 11px;
}
[data-theme="light"] .foot-ko {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(180, 83, 9, 0.28);
}

.pum-foot-r {
  display: inline-flex; align-items: center; gap: 8px;
}
.pum-foot-r .leave-btn {
  height: 38px;
  padding: 0 16px;
}

/* ════════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .pum-orb, .pum-scan, .dropzone, .check-tick, .fr-progress-fill,
  .empty-orbit, .empty-doc, .spinner-ring, .dz-ring, .pum-eye-dot {
    animation: none !important;
  }
}
</style>
