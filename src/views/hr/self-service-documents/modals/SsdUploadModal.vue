<template>
  <Teleport to="body">
    <div class="ssd-modal-overlay" @click.self="$emit('close')">
      <Motion as="div"
        class="ssd-modal-card"
        :initial="{ opacity: 0, y: 20, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="modal-aurora" aria-hidden="true" />
        <span class="modal-perf" aria-hidden="true" />

        <header class="modal-head">
          <div>
            <span class="modal-eyebrow"><span class="modal-eyebrow-dot" />Add to your vault</span>
            <h3 class="modal-title">Upload a Document</h3>
            <p class="modal-sub">Submit a new document to HR for verification. Max 10 MB · PDF, image or doc.</p>
          </div>
          <button class="modal-close" @click="$emit('close')" aria-label="Close">
            <X :size="18" />
          </button>
        </header>

        <div class="modal-body">
          <!-- Drag-drop file zone -->
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
              <div class="drop-icon"><UploadCloud :size="34" /></div>
              <p class="drop-title">Drop your file here, or <span class="link">browse</span></p>
              <p class="drop-sub">PDF · PNG · JPG · DOCX · XLSX — up to 10 MB</p>
            </template>
            <template v-else>
              <div class="file-preview">
                <span class="file-thumb">
                  <FileText :size="28" />
                </span>
                <div class="file-meta">
                  <strong>{{ file.name }}</strong>
                  <span>{{ formatSize(file.size) }} · {{ (file.type || 'file').split('/').pop().toUpperCase() }}</span>
                </div>
                <button class="file-clear" @click.stop="file = null"><X :size="14" /></button>
              </div>
            </template>
          </div>

          <!-- Form fields -->
          <div class="form-stack">
            <div class="form-row">
              <label class="form-field">
                <span class="form-label">Category <span class="req">*</span></span>
                <select v-model="form.category" required>
                  <option v-for="c in DOC_CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
                </select>
              </label>
              <label class="form-field">
                <span class="form-label">Document Type <span class="req">*</span></span>
                <select v-model="form.doc_type" required>
                  <option v-for="t in typeOptions" :key="t" :value="t">{{ formatType(t) }}</option>
                </select>
              </label>
            </div>

            <label class="form-field">
              <span class="form-label">Title <span class="req">*</span></span>
              <input type="text" v-model="form.title" placeholder="e.g. Aadhaar Card · John Doe" required maxlength="200" />
            </label>

            <div class="form-row">
              <label class="form-field">
                <span class="form-label">Document Number <span class="req">*</span></span>
                <input
                  type="text"
                  inputmode="numeric"
                  v-model="form.document_number"
                  :placeholder="numberPlaceholder"
                  :maxlength="14"
                  required
                  @input="onDigitsOnly"
                  @keydown="blockNonDigit"
                  @paste="onPasteDigits"
                />
                <span class="form-hint">
                  <Hash :size="10" />
                  Digits only · up to 14 characters
                </span>
              </label>
              <label class="form-field">
                <span class="form-label">Issued By</span>
                <input type="text" v-model="form.issued_by" placeholder="e.g. UIDAI, Government of India" maxlength="200" />
              </label>
            </div>

            <div class="form-row">
              <div class="form-field">
                <span class="form-label">Issue Date <span class="req">*</span></span>
                <HrDatePicker
                  v-model="form.issue_date"
                  placeholder="dd / mm / yyyy"
                  :max="today"
                />
              </div>
              <div class="form-field">
                <span class="form-label">Expiry Date <span class="req">*</span></span>
                <HrDatePicker
                  v-model="form.expiry_date"
                  placeholder="dd / mm / yyyy"
                  :min="form.issue_date || today"
                />
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="btn-ghost" @click="$emit('close')" :disabled="submitting">Cancel</button>
          <Motion as="button"
            class="btn-primary"
            :whileHover="{ y: -1, scale: 1.02 }"
            :whileTap="{ scale: 0.96 }"
            :disabled="!canSubmit || submitting"
            @click="onSubmit"
          >
            <span v-if="submitting" class="spinner" />
            <UploadCloud v-else :size="14" />
            <span>{{ submitting ? 'Uploading…' : 'Submit for Verification' }}</span>
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { X, UploadCloud, FileText, Hash } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { DOC_CATEGORIES, DOC_TYPE_SUGGESTIONS, useSelfServiceDocuments } from '@/composables/useSelfServiceDocuments'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'

const props = defineProps({
  defaultCategory: { type: String, default: 'KYC' },
})
const emit = defineEmits(['close', 'uploaded'])

const toast = useToast()
const { uploadMine } = useSelfServiceDocuments()

const file = ref(null)
const isDragging = ref(false)
const submitting = ref(false)
const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  category: props.defaultCategory || 'KYC',
  doc_type: '',
  title: '',
  document_number: '',
  issued_by: '',
  issue_date: '',
  expiry_date: '',
})

const typeOptions = computed(() => DOC_TYPE_SUGGESTIONS[form.category] || ['DOCUMENT'])
watch(() => form.category, () => { form.doc_type = typeOptions.value[0] || '' }, { immediate: true })

const numberPlaceholder = computed(() => {
  if (form.category === 'KYC' && form.doc_type === 'AADHAAR') return '1234 5678 9012 (last 4 stored)'
  if (form.category === 'KYC' && form.doc_type === 'PAN')     return '10-digit PAN number'
  return 'Up to 14 digits'
})

// Required: file + category + doc_type + title + document_number + both dates.
// Optional: issued_by only.
const canSubmit = computed(() =>
  !!file.value
  && !!form.category
  && !!form.doc_type
  && !!form.title.trim()
  && !!form.document_number.trim()
  && !!form.issue_date
  && !!form.expiry_date
)

// ─── Digit-only enforcement for document_number ──────────────────────────
// v-model already binds the value; we additionally strip any non-digit
// characters that slip through (e.g. from native autofill), clamp to 14.
function sanitizeDigits(raw) {
  return String(raw || '').replace(/\D+/g, '').slice(0, 14)
}
function onDigitsOnly(e) {
  const cleaned = sanitizeDigits(e.target.value)
  if (cleaned !== e.target.value) e.target.value = cleaned
  form.document_number = cleaned
}
function blockNonDigit(e) {
  // Let control keys + Cmd/Ctrl combos through.
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const allowed = [
    'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'Home', 'End',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  ]
  if (allowed.includes(e.key)) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}
function onPasteDigits(e) {
  const text = (e.clipboardData || window.clipboardData)?.getData('text') || ''
  const cleaned = sanitizeDigits(text)
  e.preventDefault()
  // Insert at cursor position; replace selection.
  const el = e.target
  const start = el.selectionStart ?? form.document_number.length
  const end = el.selectionEnd ?? form.document_number.length
  const next = (form.document_number.slice(0, start) + cleaned + form.document_number.slice(end))
  form.document_number = sanitizeDigits(next)
}

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
  return String(s).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

async function onSubmit() {
  if (!canSubmit.value) return
  if (file.value.size > 10 * 1024 * 1024) {
    toast.error('File exceeds 10 MB limit')
    return
  }
  submitting.value = true
  try {
    const created = await uploadMine({
      file: file.value,
      category: form.category,
      doc_type: form.doc_type,
      title: form.title.trim(),
      document_number: form.document_number || undefined,
      issued_by: form.issued_by || undefined,
      issue_date: form.issue_date || undefined,
      expiry_date: form.expiry_date || undefined,
    })
    toast.success('Document uploaded. HR will review shortly.')
    emit('uploaded', created)
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Upload failed. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<!-- Unscoped: see SelfServiceDocumentsPage.vue for why scoped @import breaks tokens. -->
<style>
@import '../../../../styles/self-service-documents-theme.css';
</style>

<style scoped>
.ssd-modal-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: radial-gradient(80% 60% at 50% 30%, rgba(120, 53, 15, 0.55), rgba(0, 0, 0, 0.78));
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: ssd-overlay-fade 0.3s var(--ssd-spring);
}
[data-theme="light"] .ssd-modal-overlay {
  background: radial-gradient(80% 60% at 50% 30%, rgba(217, 119, 6, 0.38), rgba(40, 25, 10, 0.62));
}
@keyframes ssd-overlay-fade { from { opacity: 0; } to { opacity: 1; } }

.ssd-modal-card {
  position: relative;
  width: 100%; max-width: 660px;
  max-height: calc(100vh - 48px);
  display: flex; flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(140% 80% at 0% 0%,   rgba(251, 191, 36, 0.14), transparent 55%),
    radial-gradient(120% 80% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 12, 0.97), rgba(14, 10, 8, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.32);
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.78),
    0 0 0 1px rgba(251, 191, 36, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
}
[data-theme="light"] .ssd-modal-card {
  background:
    radial-gradient(140% 80% at 0% 0%,   rgba(251, 191, 36, 0.22), transparent 55%),
    radial-gradient(120% 80% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.97), rgba(255, 245, 224, 0.99));
  border-color: rgba(180, 83, 9, 0.34);
  box-shadow: 0 50px 100px -30px rgba(40, 25, 10, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.modal-aurora {
  position: absolute; inset: -20%; pointer-events: none; z-index: 0;
  background:
    radial-gradient(35% 25% at 30% 0%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(40% 25% at 80% 100%, rgba(251, 146, 60, 0.16), transparent 60%);
  filter: blur(22px);
  animation: ssd-glow-orbit 24s linear infinite;
}
.modal-perf {
  position: absolute; left: 12px; top: 20px; bottom: 20px; width: 4px;
  background:
    radial-gradient(circle at 50% 5px, rgba(251, 191, 36, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
  opacity: 0.50;
  pointer-events: none;
  z-index: 1;
}
[data-theme="light"] .modal-perf {
  background: radial-gradient(circle at 50% 5px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
}

.modal-head, .modal-body, .modal-foot { position: relative; z-index: 2; }
.modal-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 22px 26px 16px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .modal-head { border-bottom-color: rgba(180, 83, 9, 0.26); }
.modal-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--ssd-cream-100);
}
[data-theme="light"] .modal-eyebrow { color: var(--ssd-amber-600); }
.modal-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%; background: #fb923c;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.7);
  animation: ssd-eyebrow-pulse 2.4s ease-in-out infinite;
}
.modal-title {
  margin: 4px 0 4px; font-size: 20px; font-weight: 800; letter-spacing: -0.018em;
  color: var(--hr-text);
}
.modal-sub { margin: 0; font-size: 12.5px; color: var(--hr-text-muted); }
[data-theme="light"] .modal-sub { color: #6b5840; }
.modal-close {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); border-color: rgba(251, 191, 36, 0.30); }
[data-theme="light"] .modal-close { background: rgba(180, 83, 9, 0.08); color: var(--hr-text-secondary); border-color: rgba(180, 83, 9, 0.18); }
[data-theme="light"] .modal-close:hover { background: rgba(180, 83, 9, 0.16); color: var(--hr-text); }

.modal-body { padding: 18px 26px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }

.drop-zone {
  position: relative;
  padding: 28px 20px;
  border: 1.5px dashed rgba(251, 191, 36, 0.32);
  border-radius: 14px;
  background: rgba(251, 191, 36, 0.04);
  text-align: center;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  transition: background .25s, border-color .25s, transform .25s var(--ssd-spring);
}
.drop-zone:hover { background: rgba(251, 191, 36, 0.08); border-color: rgba(251, 146, 60, 0.55); }
.drop-zone.is-dragging { background: rgba(251, 191, 36, 0.14); border-color: rgba(251, 146, 60, 0.75); transform: scale(1.01); }
.drop-zone.has-file { padding: 14px 16px; background: rgba(251, 191, 36, 0.08); border-style: solid; }
[data-theme="light"] .drop-zone { background: rgba(255, 250, 240, 0.65); border-color: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .drop-zone:hover { background: rgba(251, 191, 36, 0.16); }

.drop-icon {
  width: 56px; height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 22px -10px rgba(251, 146, 60, 0.55);
}
.drop-title { margin: 4px 0 0; font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.drop-title .link { color: var(--ssd-gold-400); text-decoration: underline; }
[data-theme="light"] .drop-title .link { color: var(--ssd-amber-600); }
.drop-sub { margin: 0; font-size: 11px; color: var(--hr-text-muted); }

.file-preview {
  display: flex; align-items: center; gap: 14px; width: 100%; text-align: left;
}
.file-thumb {
  width: 48px; height: 48px;
  border-radius: 11px;
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.file-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.file-meta strong { font-size: 13px; font-weight: 700; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-meta span { font-size: 11px; color: var(--hr-text-muted); }
.file-clear {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(220, 38, 38, 0.18);
  border: 1px solid rgba(220, 38, 38, 0.38);
  color: #fca5a5;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.file-clear:hover { background: rgba(220, 38, 38, 0.30); }

.form-stack { display: flex; flex-direction: column; gap: 12px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .form-row { grid-template-columns: 1fr; } }
.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-label {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .form-label { color: #6b5840; }
.req { color: #fca5a5; margin-left: 2px; }
.form-field input, .form-field select {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 10px;
  font: inherit; font-size: 13px;
  color: var(--hr-text);
  color-scheme: dark;
  transition: border-color .2s, background .2s;
}
[data-theme="light"] .form-field input, [data-theme="light"] .form-field select {
  background: rgba(255, 250, 240, 0.85); color-scheme: light;
  border-color: rgba(180, 83, 9, 0.26); color: var(--hr-text);
}
.form-field input:focus, .form-field select:focus {
  outline: none; border-color: rgba(251, 146, 60, 0.60); background: rgba(251, 191, 36, 0.08);
}
.form-field select option { background: #1a1410; color: #fff; }
[data-theme="light"] .form-field select option { background: #fff; color: var(--hr-text); }
.form-hint {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 600; color: var(--ssd-cream-100);
  padding: 3px 8px; border-radius: 6px;
  background: rgba(251, 191, 36, 0.12);
  width: max-content;
}
[data-theme="light"] .form-hint { color: var(--ssd-amber-600); background: rgba(251, 191, 36, 0.20); }

.modal-foot {
  display: flex; gap: 8px; justify-content: flex-end; align-items: center;
  padding: 14px 26px;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .modal-foot { border-top-color: rgba(180, 83, 9, 0.26); }
.btn-ghost, .btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px;
  border-radius: 11px;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s, background .2s;
}
.btn-ghost {
  background: rgba(40, 30, 22, 0.55);
  color: var(--hr-text);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
.btn-ghost:hover { background: rgba(40, 30, 22, 0.70); border-color: rgba(251, 146, 60, 0.45); }
[data-theme="light"] .btn-ghost { background: rgba(255, 250, 240, 0.85); color: var(--hr-text); border-color: rgba(180, 83, 9, 0.26); }
.btn-primary {
  color: #1f1408;
  background: var(--ssd-gradient-display);
  background-size: 200% 200%;
  border: 1px solid rgba(251, 191, 36, 0.55);
  box-shadow: 0 12px 26px -10px rgba(251, 146, 60, 0.55);
}
.btn-primary:hover:not(:disabled) { background-position: 100% 50%; box-shadow: 0 18px 36px -10px rgba(251, 146, 60, 0.72); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
[data-theme="light"] .btn-primary { color: #fff; background: linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c); }
.spinner {
  width: 12px; height: 12px;
  border: 1.5px solid currentColor; border-top-color: transparent;
  border-radius: 50%;
  animation: ssd-glow-orbit 0.7s linear infinite;
}
</style>
