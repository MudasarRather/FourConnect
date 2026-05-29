<template>
  <Teleport to="body">
    <div class="edoc-decide-overlay" @click.self="$emit('close')">
      <Motion as="div"
        class="edoc-decide-card"
        :initial="{ opacity: 0, y: 20, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <span class="modal-aurora" aria-hidden="true" />

        <header class="modal-head">
          <div>
            <span class="modal-eyebrow"><span class="modal-eyebrow-dot" />Decide · {{ request.employee_name }}</span>
            <h3 class="modal-title">{{ titleFor(action) }}</h3>
            <p class="modal-sub">{{ subFor(action) }}</p>
          </div>
          <button class="modal-close" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
        </header>

        <div class="modal-body">
          <!-- Request summary card -->
          <article class="req-summary">
            <header>
              <span class="rs-icon" :style="{ '--c': statusTone }">
                <component :is="iconFor" :size="16" />
              </span>
              <div>
                <strong>{{ requestTitle }}</strong>
                <span>{{ relTime(request.created_at) }} ago · {{ formatDate(request.created_at) }}</span>
              </div>
            </header>
            <p class="rs-reason">{{ request.reason }}</p>
            <div v-if="request.purpose || request.notes" class="rs-extras">
              <span v-if="request.purpose" class="extra-chip"><Target :size="10" />{{ request.purpose }}</span>
              <span v-if="request.notes" class="extra-chip"><StickyNote :size="10" />{{ request.notes }}</span>
            </div>
          </article>

          <!-- Action picker — three pill toggles -->
          <div class="action-picker">
            <span class="picker-label">Decision</span>
            <div class="picker-row">
              <button class="pick-btn"
                :class="{ active: action === 'IN_PROGRESS' }"
                @click="action = 'IN_PROGRESS'"
              >
                <PlayCircle :size="14" />
                <strong>Mark In-Progress</strong>
                <span>Acknowledge but keep open</span>
              </button>
              <button class="pick-btn primary"
                :class="{ active: action === 'FULFILLED' }"
                @click="action = 'FULFILLED'"
              >
                <CheckCircle2 :size="14" />
                <strong>Fulfil</strong>
                <span>Issued — link or attach</span>
              </button>
              <button class="pick-btn danger"
                :class="{ active: action === 'REJECTED' }"
                @click="action = 'REJECTED'"
              >
                <XCircle :size="14" />
                <strong>Reject</strong>
                <span>Decline with a reason</span>
              </button>
            </div>
          </div>

          <!-- Fulfil — optional doc link -->
          <div v-if="action === 'FULFILLED'" class="form-block">
            <label class="form-label">
              <FileSignature :size="11" />
              Link to issued document (optional)
            </label>
            <div v-if="loadingDocs" class="docs-loading">Loading employee documents…</div>
            <div v-else-if="!empDocs.length" class="docs-empty">
              No documents on file for {{ request.employee_name }}. You can fulfil without a link — they'll
              still see the request as resolved.
            </div>
            <div v-else class="docs-list">
              <button v-for="d in empDocs" :key="d.id"
                class="doc-row" :class="{ selected: fulfilledDocId === d.id }"
                @click="fulfilledDocId = fulfilledDocId === d.id ? null : d.id"
              >
                <span class="doc-thumb"><FileText :size="13" /></span>
                <span class="doc-text">
                  <strong>{{ d.title }}</strong>
                  <span>{{ d.category.replace(/_/g, ' ') }} · {{ d.doc_type.replace(/_/g, ' ') }}</span>
                </span>
                <span class="doc-pick">
                  <Check v-if="fulfilledDocId === d.id" :size="14" />
                </span>
              </button>
            </div>
          </div>

          <!-- Decision notes -->
          <div class="form-block">
            <label class="form-label">
              <MessageSquare :size="11" />
              {{ action === 'REJECTED' ? 'Reason for rejection' : 'Note for employee' }}
              <span v-if="action === 'REJECTED'" class="req">*</span>
            </label>
            <textarea v-model="notes" rows="4"
              :placeholder="placeholderFor(action)"
              maxlength="2000"
            />
            <span class="char-count">{{ notes.length }} / 2000</span>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="btn-ghost" @click="$emit('close')" :disabled="submitting">Cancel</button>
          <Motion as="button"
            class="btn-primary" :class="`tone-${action.toLowerCase()}`"
            :whileTap="{ scale: 0.96 }"
            :disabled="!canSubmit || submitting"
            @click="onSubmit"
          >
            <span v-if="submitting" class="spinner" />
            <component v-else :is="footIconFor" :size="14" />
            <span>{{ ctaLabelFor }}</span>
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, FileSignature, FileText, Check, MessageSquare,
  Target, StickyNote, PlayCircle, CheckCircle2, XCircle,
  Mail, Award, Briefcase, Wallet, Shield, MapPin, Plane, Stamp,
} from 'lucide-vue-next'
import {
  decideAdminRequest, REQUEST_TYPE_META,
} from '@/composables/useEmployeeDocuments'
import { useEmployeeDocuments } from '@/composables/useEmployeeDocuments'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  request:       { type: Object, required: true },
  initialAction: { type: String, default: 'FULFILLED' },
})
const emit = defineEmits(['close', 'decided'])
const { success, error } = useToast()

const { byEmployee } = useEmployeeDocuments()

const action = ref(props.initialAction || 'FULFILLED')
const notes = ref('')
const fulfilledDocId = ref(null)
const submitting = ref(false)
const empDocs = ref([])
const loadingDocs = ref(false)

const TYPE_ICON_MAP = {
  EXPERIENCE_LETTER: Mail,
  RELIEVING_LETTER:  FileSignature,
  CONFIRMATION_LETTER: Award,
  APPOINTMENT_LETTER: Briefcase,
  SALARY_CERTIFICATE: Wallet,
  NDA: Shield,
  OFFER_LETTER: FileText,
  ADDRESS_PROOF: MapPin,
  NO_OBJECTION: Plane,
  CUSTOM: Stamp,
}
const iconFor = computed(() => TYPE_ICON_MAP[props.request.request_type] || Mail)
const requestTitle = computed(() => {
  if (props.request.request_type === 'CUSTOM' && props.request.custom_title) {
    return props.request.custom_title
  }
  return (REQUEST_TYPE_META.find(t => t.key === props.request.request_type) || {}).label || 'Document request'
})

const statusTone = computed(() => ({
  IN_PROGRESS: '#0284c7',
  FULFILLED:   '#0d9488',
  REJECTED:    '#b91c1c',
}[action.value] || '#fbbf24'))

const canSubmit = computed(() => {
  if (action.value === 'REJECTED') return notes.value.trim().length >= 3
  return true
})

function titleFor(a) {
  return ({
    IN_PROGRESS: 'Mark request in-progress',
    FULFILLED:   'Fulfil this request',
    REJECTED:    'Reject this request',
  })[a] || 'Decide'
}
function subFor(a) {
  return ({
    IN_PROGRESS: 'Acknowledge the request and let the employee know HR is working on it.',
    FULFILLED:   'The letter or certificate has been issued. Optionally link to it.',
    REJECTED:    'Decline this request with a clear, written reason.',
  })[a] || ''
}
function placeholderFor(a) {
  return ({
    IN_PROGRESS: 'Hi — we\'ve received your request and will share the letter by Friday.',
    FULFILLED:   'Letter issued. Attached to your vault under Letters.',
    REJECTED:    'We\'re unable to fulfil this request because…',
  })[a] || ''
}
const ctaLabelFor = computed(() => ({
  IN_PROGRESS: submitting.value ? 'Updating…' : 'Update Status',
  FULFILLED:   submitting.value ? 'Recording…' : 'Mark Fulfilled',
  REJECTED:    submitting.value ? 'Rejecting…' : 'Reject Request',
})[action.value] || 'Save')
const footIconFor = computed(() => ({
  IN_PROGRESS: PlayCircle,
  FULFILLED:   CheckCircle2,
  REJECTED:    XCircle,
})[action.value] || CheckCircle2)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function relTime(d) {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Lazy-load the employee's documents only when fulfilling (to populate the link picker)
watch(action, async (a) => {
  if (a === 'FULFILLED' && !empDocs.value.length && !loadingDocs.value && props.request.employee_id) {
    loadingDocs.value = true
    try {
      const docs = await byEmployee(props.request.employee_id)
      // Only show non-archived, file-bearing docs (most useful for linking)
      empDocs.value = (docs || []).filter(d => !d.is_archived && d.has_file)
    } catch {
      empDocs.value = []
    } finally {
      loadingDocs.value = false
    }
  }
}, { immediate: true })

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const payload = {
      status: action.value,
      decision_notes: notes.value.trim() || undefined,
    }
    if (action.value === 'FULFILLED' && fulfilledDocId.value) {
      payload.fulfilled_doc_id = fulfilledDocId.value
    }
    const updated = await decideAdminRequest(props.request.id, payload)
    success(({
      IN_PROGRESS: 'Marked in-progress',
      FULFILLED:   'Request fulfilled',
      REJECTED:    'Request rejected',
    })[action.value])
    emit('decided', updated)
    emit('close')
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to update request')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
@import '../../../../styles/employee-documents-theme.css';

.edoc-decide-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: radial-gradient(80% 60% at 50% 30%, rgba(120, 53, 15, 0.55), rgba(0, 0, 0, 0.78));
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: edoc-fade-in 0.3s var(--edoc-spring);
}
[data-theme="light"] .edoc-decide-overlay {
  background: radial-gradient(80% 60% at 50% 30%, rgba(217, 119, 6, 0.40), rgba(40, 25, 10, 0.62));
}
@keyframes edoc-fade-in { from { opacity: 0; } to { opacity: 1; } }

.edoc-decide-card {
  position: relative;
  width: 100%; max-width: 720px;
  max-height: calc(100vh - 48px);
  display: flex; flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(140% 80% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    radial-gradient(120% 80% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 12, 0.97), rgba(14, 10, 8, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.32);
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.78),
    0 0 0 1px rgba(251, 191, 36, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
  transform: translateZ(0);
}
[data-theme="light"] .edoc-decide-card {
  background:
    radial-gradient(140% 80% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 55%),
    radial-gradient(120% 80% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 245, 224, 0.99));
  border-color: rgba(180, 83, 9, 0.34);
}
.modal-aurora {
  position: absolute; inset: -20%; pointer-events: none; z-index: 0;
  background:
    radial-gradient(35% 25% at 30% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    radial-gradient(40% 25% at 80% 100%, rgba(251, 146, 60, 0.14), transparent 60%);
  filter: blur(22px);
}

.modal-head, .modal-body, .modal-foot { position: relative; z-index: 2; }
.modal-head {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
  padding: 22px 26px 16px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .modal-head { border-bottom-color: rgba(180, 83, 9, 0.26); }
.modal-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: #fde68a;
}
[data-theme="light"] .modal-eyebrow { color: #b45309; }
.modal-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%; background: #fb923c;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.7);
  animation: edoc-glow-breathe 2.4s ease-in-out infinite;
}
.modal-title { margin: 4px 0; font-size: 19px; font-weight: 800; letter-spacing: -0.018em; color: var(--hr-text); }
.modal-sub { margin: 0; font-size: 12.5px; color: var(--hr-text-muted); }
[data-theme="light"] .modal-sub { color: #6b5840; }
.modal-close {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); }
[data-theme="light"] .modal-close { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.18); }

.modal-body { padding: 18px 26px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }

/* Request summary */
.req-summary {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.22);
  display: flex; flex-direction: column; gap: 10px;
}
[data-theme="light"] .req-summary { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.22); }
.req-summary header { display: flex; gap: 10px; align-items: center; }
.rs-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 28%, transparent), color-mix(in srgb, var(--c) 8%, transparent));
  color: var(--c);
  border: 1px solid color-mix(in srgb, var(--c) 38%, transparent);
}
.req-summary header strong { display: block; font-size: 14px; font-weight: 800; color: var(--hr-text); }
.req-summary header span { display: block; font-size: 10.5px; color: var(--hr-text-muted); }
.rs-reason { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--hr-text); }
[data-theme="light"] .rs-reason { color: #2a1e15; }
.rs-extras { display: flex; flex-wrap: wrap; gap: 5px; }
.extra-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
}
[data-theme="light"] .extra-chip { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.22); }

/* Action picker */
.action-picker { display: flex; flex-direction: column; gap: 8px; }
.picker-label {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.picker-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
@media (max-width: 620px) { .picker-row { grid-template-columns: 1fr; } }
.pick-btn {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 2px 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(40, 30, 22, 0.55);
  border: 1.5px solid rgba(251, 191, 36, 0.20);
  color: var(--hr-text);
  cursor: pointer;
  text-align: left;
  font: inherit;
  --pb-tone: #fbbf24;
  transition: border-color .25s var(--edoc-spring), background .25s, transform .25s var(--edoc-spring), box-shadow .25s;
}
[data-theme="light"] .pick-btn { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.20); }
.pick-btn:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--pb-tone) 55%, transparent); }
.pick-btn.active {
  border-color: var(--pb-tone);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--pb-tone) 22%, transparent),
    color-mix(in srgb, var(--pb-tone) 6%, transparent));
  box-shadow: 0 14px 28px -14px color-mix(in srgb, var(--pb-tone) 55%, transparent);
}
.pick-btn:first-child  { --pb-tone: #0284c7; }
.pick-btn.primary      { --pb-tone: #0d9488; }
.pick-btn.danger       { --pb-tone: #b91c1c; }
.pick-btn :first-child { grid-row: span 2; }
.pick-btn svg { color: var(--pb-tone); }
.pick-btn strong { font-size: 12px; font-weight: 800; color: var(--hr-text); letter-spacing: 0.1px; }
.pick-btn span { font-size: 10px; color: var(--hr-text-muted); line-height: 1.3; }

/* Form blocks */
.form-block { display: flex; flex-direction: column; gap: 6px; position: relative; }
.form-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .form-label { color: #6b5840; }
.req { color: #fca5a5; margin-left: 2px; }
textarea {
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 10px;
  font: inherit; font-size: 13px; line-height: 1.5;
  color: var(--hr-text);
  color-scheme: dark;
  min-height: 90px; resize: vertical;
  font-family: inherit;
}
[data-theme="light"] textarea {
  background: rgba(255, 250, 240, 0.85); color-scheme: light;
  border-color: rgba(180, 83, 9, 0.22); color: var(--hr-text);
}
textarea:focus { outline: none; border-color: rgba(251, 146, 60, 0.55); background: rgba(251, 191, 36, 0.06); }
.char-count {
  position: absolute; right: 6px; bottom: 4px;
  font-size: 9px; font-weight: 700; color: var(--hr-text-dim);
  letter-spacing: 0.3px;
}

/* Doc picker */
.docs-loading, .docs-empty {
  padding: 14px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.26);
  font-size: 12px;
  color: var(--hr-text-muted);
}
.docs-list {
  display: flex; flex-direction: column; gap: 6px;
  max-height: 200px; overflow-y: auto;
  padding: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(251, 191, 36, 0.14);
}
[data-theme="light"] .docs-list {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.16);
}
.doc-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--hr-text);
  transition: background .2s, border-color .2s, transform .2s;
}
.doc-row:hover { background: rgba(251, 191, 36, 0.10); border-color: rgba(251, 191, 36, 0.30); }
.doc-row.selected {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.18), rgba(13, 148, 136, 0.08));
  border-color: rgba(13, 148, 136, 0.55);
}
[data-theme="light"] .doc-row:hover { background: rgba(180, 83, 9, 0.08); }
.doc-thumb {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #1f1408;
  flex-shrink: 0;
}
.doc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.doc-text strong {
  font-size: 12px; font-weight: 700; color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.doc-text span { font-size: 9.5px; color: var(--hr-text-muted); letter-spacing: 0.3px; text-transform: uppercase; font-weight: 700; }
.doc-pick {
  width: 22px; height: 22px;
  border-radius: 7px;
  background: rgba(13, 148, 136, 0.18);
  border: 1px solid rgba(13, 148, 136, 0.40);
  color: #34d399;
  display: inline-flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity .25s;
}
.doc-row.selected .doc-pick { opacity: 1; }

/* Footer */
.modal-foot {
  display: flex; gap: 8px; justify-content: flex-end; align-items: center;
  padding: 14px 26px;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .modal-foot { border-top-color: rgba(180, 83, 9, 0.26); }
.btn-ghost, .btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 11px 18px;
  border-radius: 11px;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  cursor: pointer;
  border: 1px solid;
  transition: letter-spacing .3s var(--edoc-spring), box-shadow .3s;
}
.btn-ghost {
  background: rgba(40, 30, 22, 0.55);
  color: var(--hr-text);
  border-color: rgba(251, 191, 36, 0.22);
}
.btn-ghost:hover { letter-spacing: 0.55px; border-color: rgba(251, 146, 60, 0.45); }
[data-theme="light"] .btn-ghost { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.26); color: var(--hr-text); }
.btn-primary {
  color: #fff;
  border-color: transparent;
  position: relative; overflow: hidden;
}
.btn-primary.tone-in_progress {
  background: linear-gradient(135deg, #38bdf8, #0284c7);
  box-shadow: 0 14px 28px -10px rgba(2, 132, 199, 0.55);
}
.btn-primary.tone-fulfilled {
  background: linear-gradient(135deg, #6ee7b7, #10b981, #047857);
  box-shadow: 0 14px 28px -10px rgba(13, 148, 136, 0.65);
}
.btn-primary.tone-rejected {
  background: linear-gradient(135deg, #fca5a5, #ef4444, #b91c1c);
  box-shadow: 0 14px 28px -10px rgba(220, 38, 38, 0.55);
}
.btn-primary:hover:not(:disabled) { letter-spacing: 0.55px; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.spinner {
  width: 12px; height: 12px;
  border: 1.5px solid currentColor; border-top-color: transparent;
  border-radius: 50%;
  animation: edoc-ring-rotate 0.7s linear infinite;
}
</style>
