<template>
  <Motion as="article"
    class="ssd-doc-card"
    :class="[
      `status-${(doc.verification_status || 'PENDING').toLowerCase()}`,
      { 'is-flagged-rejected': isRejected }
    ]"
    :style="{ '--cat-tone': categoryTone }"
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: 0.04 * (index || 0), ease: [0.22, 1, 0.36, 1] }"
  >
    <div class="card-flip">
      <!-- ─── FRONT ─── -->
      <div class="card-face card-front">
        <header class="card-head">
          <span class="card-thumb" :style="{ '--cat-tone': categoryTone }">
            <component :is="thumbIcon" :size="20" />
          </span>
          <span class="status-pill" :style="{
            '--p-fg': statusTone.fg,
            '--p-bg': statusTone.bg,
            '--p-ring': statusTone.ring,
          }">
            <span class="pill-dot" />
            {{ statusTone.label }}
          </span>
        </header>

        <h4 class="card-title">{{ doc.title }}</h4>
        <p class="card-meta">
          <span class="meta-type">{{ formatDocType(doc.doc_type) }}</span>
          <span class="meta-dot">·</span>
          <span>{{ formatDate(doc.created_at) }}</span>
        </p>

        <div v-if="doc.expiry_date" class="card-expiry" :class="expiryClass">
          <Clock :size="11" />
          <span v-if="daysToExpiry < 0">Expired {{ Math.abs(daysToExpiry) }}d ago</span>
          <span v-else-if="daysToExpiry === 0">Expires today</span>
          <span v-else-if="daysToExpiry <= 30">Expires in {{ daysToExpiry }}d</span>
          <span v-else>Valid until {{ formatDate(doc.expiry_date) }}</span>
        </div>

        <div v-if="doc.document_number" class="card-numline">
          <Hash :size="11" />
          <span class="mono">{{ doc.document_number }}</span>
        </div>

        <div class="card-front-foot">
          <span v-if="doc.has_file" class="file-badge">
            <FileText :size="11" />
            {{ doc.file_type?.toUpperCase() || 'FILE' }}
            <span v-if="formatSize(doc.file_size)" class="file-size">{{ formatSize(doc.file_size) }}</span>
          </span>
          <span v-else class="file-badge no-file">
            <FileX :size="11" />
            No file
          </span>
          <span class="card-flip-hint" aria-hidden="true">Hover</span>
        </div>
      </div>

      <!-- ─── BACK ─── -->
      <div class="card-face card-back">
        <header class="back-head">
          <span class="back-eyebrow"><span class="back-eyebrow-dot" />{{ statusTone.label.toUpperCase() }}</span>
          <h4 class="back-title">{{ doc.title }}</h4>
        </header>

        <div v-if="isRejected && doc.rejection_reason" class="back-reject-note">
          <AlertOctagon :size="13" />
          <div>
            <strong>Reason:</strong>
            <span>{{ doc.rejection_reason }}</span>
          </div>
        </div>

        <dl class="back-meta">
          <div v-if="doc.issued_by" class="meta-row">
            <dt>Issued by</dt>
            <dd>{{ doc.issued_by }}</dd>
          </div>
          <div v-if="doc.issue_date" class="meta-row">
            <dt>Issue date</dt>
            <dd>{{ formatDate(doc.issue_date) }}</dd>
          </div>
          <div v-if="doc.expiry_date" class="meta-row">
            <dt>Expiry</dt>
            <dd>{{ formatDate(doc.expiry_date) }}</dd>
          </div>
          <div v-if="doc.verified_at" class="meta-row">
            <dt>Verified</dt>
            <dd>{{ formatDate(doc.verified_at) }} <span v-if="doc.verified_by_name" class="dim">· {{ doc.verified_by_name }}</span></dd>
          </div>
          <div v-if="doc.source" class="meta-row">
            <dt>Source</dt>
            <dd>{{ formatSource(doc.source) }}</dd>
          </div>
        </dl>

        <div class="back-actions">
          <Motion as="button"
            v-if="doc.has_file"
            class="action-btn primary"
            :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }"
            :disabled="downloading"
            @click="onDownload"
          >
            <span v-if="downloading" class="btn-spinner" />
            <Download v-else :size="13" />
            <span>{{ downloading ? 'Preparing…' : 'Download' }}</span>
          </Motion>
          <Motion as="button"
            v-if="doc.has_file"
            class="action-btn"
            :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }"
            @click="$emit('preview', doc)"
          >
            <Eye :size="13" />
            <span>Preview</span>
          </Motion>
          <Motion as="button"
            v-if="isRejectedOrResubmit"
            class="action-btn warn"
            :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }"
            @click="$emit('resubmit', doc)"
          >
            <Upload :size="13" />
            <span>Resubmit</span>
          </Motion>
        </div>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import {
  FileText, FileX, Download, Eye, Upload, Hash, Clock, AlertOctagon,
  IdCard, Fingerprint, FileSignature, GraduationCap, Award, Mail,
  ShieldCheck, Wallet, Folder,
} from 'lucide-vue-next'
import { STATUS_TONE, DOC_CATEGORIES } from '@/composables/useSelfServiceDocuments'

const props = defineProps({
  doc:   { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const emit = defineEmits(['download', 'preview', 'resubmit'])

const downloading = ref(false)

const CATEGORY_ICONS = { IdCard, Fingerprint, FileSignature, GraduationCap, Award, Mail, ShieldCheck, Wallet, Folder }

const categoryMeta = computed(() =>
  DOC_CATEGORIES.find(c => c.key === props.doc.category) || DOC_CATEGORIES[DOC_CATEGORIES.length - 1]
)
const categoryTone = computed(() => categoryMeta.value.tone)
const thumbIcon = computed(() => CATEGORY_ICONS[categoryMeta.value.icon] || Folder)

const statusTone = computed(() =>
  STATUS_TONE[props.doc.verification_status] || STATUS_TONE.PENDING
)
const isRejected = computed(() =>
  props.doc.verification_status === 'REJECTED'
)
const isRejectedOrResubmit = computed(() =>
  ['REJECTED', 'RESUBMIT_REQUIRED'].includes(props.doc.verification_status)
)

const daysToExpiry = computed(() => {
  if (!props.doc.expiry_date) return null
  const d = new Date(props.doc.expiry_date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
})

const expiryClass = computed(() => {
  const d = daysToExpiry.value
  if (d == null) return ''
  if (d < 0) return 'is-expired'
  if (d <= 30) return 'is-soon'
  if (d <= 90) return 'is-warn'
  return 'is-ok'
})

function formatDocType(s) {
  if (!s) return '—'
  return String(s).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function formatSource(s) {
  if (!s) return '—'
  return String(s).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatSize(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

async function onDownload() {
  if (downloading.value) return
  downloading.value = true
  try {
    await emit('download', props.doc)
  } finally {
    setTimeout(() => { downloading.value = false }, 600)
  }
}
</script>

<style scoped>
.ssd-doc-card {
  position: relative;
  perspective: 1100px;
  --cat-tone: #fbbf24;
}

.card-flip {
  position: relative;
  width: 100%;
  min-height: 220px;
  transform-style: preserve-3d;
  transition: transform 0.55s var(--ssd-spring);
}
.ssd-doc-card:hover .card-flip { transform: rotateY(180deg); }
.ssd-doc-card:focus-within .card-flip { transform: rotateY(180deg); }

.card-face {
  position: absolute; inset: 0;
  border-radius: 18px;
  padding: 18px 18px 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex; flex-direction: column; gap: 10px;
  overflow: hidden;
  isolation: isolate;
}
.card-face::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  border-radius: inherit;
  background:
    radial-gradient(80% 60% at 100% 0%, color-mix(in srgb, var(--cat-tone) 18%, transparent), transparent 60%),
    rgba(20, 15, 12, 0.78);
  border: var(--ssd-glass-stroke);
}
[data-theme="light"] .card-face::before {
  background:
    radial-gradient(80% 60% at 100% 0%, color-mix(in srgb, var(--cat-tone) 22%, transparent), transparent 60%),
    rgba(255, 250, 240, 0.96);
}
.card-face::after {
  content: ''; position: absolute; inset: -1px; z-index: -1;
  border-radius: inherit;
  border: 1px solid transparent;
  background: linear-gradient(135deg, color-mix(in srgb, var(--cat-tone) 50%, transparent), transparent 60%) border-box;
  -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity .3s;
}
.ssd-doc-card:hover .card-face::after { opacity: 1; }

.card-back {
  transform: rotateY(180deg);
}

/* ───── FRONT ───── */
.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-thumb {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--cat-tone) 35%, transparent),
    color-mix(in srgb, var(--cat-tone) 8%, transparent));
  color: var(--cat-tone);
  border: 1px solid color-mix(in srgb, var(--cat-tone) 40%, transparent);
  box-shadow: 0 6px 18px -10px color-mix(in srgb, var(--cat-tone) 70%, transparent);
}

.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
  background: var(--p-bg);
  color: var(--p-fg);
  border: 1px solid var(--p-ring);
  position: relative; overflow: hidden;
}
.pill-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--p-fg);
}
.status-verified .status-pill { animation: ssd-verified-breathe 2.6s ease-in-out infinite; }
.status-rejected .status-pill { animation: ssd-rejected-shake 0.7s var(--ssd-bouncy) 0.2s; }
.status-pending .status-pill,
.status-resubmit_required .status-pill {
  background:
    linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.45), transparent) 0% 0% / 200% 2px no-repeat,
    var(--p-bg);
  background-position: 0% 0%;
  animation: ssd-pending-scan 3s linear infinite;
}

.card-title {
  margin: 2px 0 0; font-size: 14.5px; font-weight: 800; letter-spacing: -0.01em;
  color: var(--hr-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-meta {
  margin: 0; font-size: 11px;
  color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 5px;
}
.meta-type { font-weight: 700; color: var(--hr-text); letter-spacing: 0.2px; }
[data-theme="light"] .meta-type { color: var(--ssd-amber-800); }
.meta-dot { opacity: 0.5; }

.card-expiry {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700;
  padding: 4px 9px;
  border-radius: 999px;
  width: max-content;
}
.card-expiry.is-ok { background: rgba(13, 148, 136, 0.14); color: #5eead4; border: 1px solid rgba(13, 148, 136, 0.35); }
.card-expiry.is-warn { background: rgba(202, 138, 4, 0.18); color: #fde68a; border: 1px solid rgba(202, 138, 4, 0.40); }
.card-expiry.is-soon { background: rgba(234, 88, 12, 0.18); color: #fb923c; border: 1px solid rgba(234, 88, 12, 0.45); }
.card-expiry.is-expired { background: rgba(220, 38, 38, 0.18); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.45); }
[data-theme="light"] .card-expiry.is-ok { color: #0f766e; }
[data-theme="light"] .card-expiry.is-warn { color: #854d0e; }
[data-theme="light"] .card-expiry.is-soon { color: #9a3412; }
[data-theme="light"] .card-expiry.is-expired { color: #991b1b; }

.card-numline {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px;
  color: var(--hr-text-muted);
  margin-top: -2px;
}
.mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10.5px; letter-spacing: 0.5px;
  color: var(--hr-text);
}
[data-theme="light"] .mono { color: var(--ssd-amber-800); }

.card-front-foot {
  margin-top: auto; padding-top: 10px;
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .card-front-foot { border-top-color: rgba(180, 83, 9, 0.25); }
.file-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.22);
  font-size: 10px; font-weight: 800; letter-spacing: 0.4px;
  color: var(--hr-text);
}
.file-badge.no-file { color: var(--hr-text-muted); background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.06); }
[data-theme="light"] .file-badge { background: rgba(251, 191, 36, 0.18); border-color: rgba(180, 83, 9, 0.30); color: var(--ssd-amber-800); }
[data-theme="light"] .file-badge.no-file { background: rgba(255, 250, 240, 0.7); border-color: rgba(180, 83, 9, 0.15); color: #6b5840; }
.file-size {
  font-weight: 600; opacity: 0.7;
  font-family: ui-monospace, monospace;
}
.card-flip-hint {
  font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--hr-text-dim);
  opacity: 0.55;
  transition: opacity .25s;
}
.ssd-doc-card:hover .card-flip-hint { opacity: 0; }

/* ───── BACK ───── */
.back-head { display: flex; flex-direction: column; gap: 2px; }
.back-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: var(--cat-tone);
}
.back-eyebrow-dot {
  width: 4px; height: 4px; border-radius: 50%; background: var(--cat-tone);
  box-shadow: 0 0 6px var(--cat-tone);
}
.back-title {
  margin: 0; font-size: 13.5px; font-weight: 800; letter-spacing: -0.01em;
  color: var(--hr-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.back-reject-note {
  display: flex; gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.14);
  border: 1px solid rgba(220, 38, 38, 0.35);
  color: #fca5a5;
  font-size: 11px; line-height: 1.4;
}
.back-reject-note svg { flex-shrink: 0; margin-top: 1px; }
.back-reject-note strong { display: block; font-weight: 800; letter-spacing: 0.3px; font-size: 9.5px; text-transform: uppercase; margin-bottom: 2px; }
[data-theme="light"] .back-reject-note { color: #991b1b; background: rgba(254, 226, 226, 0.85); }

.back-meta { display: flex; flex-direction: column; gap: 5px; margin: 0; }
.meta-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 11px; }
.meta-row dt {
  color: var(--hr-text-muted);
  font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; font-size: 9.5px;
}
.meta-row dd {
  margin: 0; color: var(--hr-text); font-weight: 600; font-size: 11px;
  text-align: right;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.meta-row dd .dim { color: var(--hr-text-muted); font-weight: 500; }

.back-actions {
  margin-top: auto; padding-top: 8px;
  display: flex; gap: 6px; flex-wrap: wrap;
  border-top: 1px dashed rgba(251, 191, 36, 0.20);
}
[data-theme="light"] .back-actions { border-top-color: rgba(180, 83, 9, 0.25); }
.action-btn {
  flex: 1; min-width: 80px;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 8px 10px;
  border-radius: 10px;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid rgba(251, 191, 36, 0.25);
  background: rgba(40, 30, 22, 0.55);
  color: var(--hr-text);
  cursor: pointer;
  transition: transform .2s var(--ssd-spring), border-color .22s, color .22s, background .22s;
}
.action-btn:hover {
  border-color: rgba(251, 146, 60, 0.55);
  background: rgba(251, 191, 36, 0.12);
  color: #fef3c7;
}
[data-theme="light"] .action-btn { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.25); color: var(--ssd-amber-800); }
[data-theme="light"] .action-btn:hover { background: rgba(251, 191, 36, 0.20); color: var(--ssd-orange-700); border-color: rgba(194, 65, 12, 0.45); }
.action-btn.primary {
  background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
  color: #1f1408;
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 8px 20px -10px rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .action-btn.primary {
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c);
  color: #fff; border-color: rgba(180, 83, 9, 0.50);
}
.action-btn.warn {
  background: rgba(220, 38, 38, 0.18);
  color: #fca5a5;
  border-color: rgba(220, 38, 38, 0.45);
}
.action-btn.warn:hover { background: rgba(220, 38, 38, 0.28); color: #fecaca; }
[data-theme="light"] .action-btn.warn { background: rgba(254, 226, 226, 0.85); color: #b91c1c; border-color: rgba(185, 28, 28, 0.40); }
.btn-spinner {
  width: 11px; height: 11px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ssd-glow-orbit 0.7s linear infinite;
}
.action-btn:disabled { opacity: 0.7; cursor: progress; }
</style>
