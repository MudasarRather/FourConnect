<template>
  <section class="onb-docs">
    <Motion as="header" class="onb-section-banner docs-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Collect · verify · file</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Document</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Collection</span>
        </h2>
        <p class="onb-banner-sub">Upload, verify, and manage every joiner document. Verified files glow emerald and ship to the secure drive.</p>
      </div>
      <div class="onb-banner-aside" v-if="processId && slots.length">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ summary[0]?.count || 0 }}</span>
          <span class="onb-banner-stat-label">Verified</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ summary[1]?.count || 0 }}</span>
          <span class="onb-banner-stat-label">Review</span>
        </div>
      </div>
    </Motion>

    <OnbProcessPicker v-model="processId" @change="reload" />

    <div v-if="!processId" class="onb-empty-card">
      <div class="onb-empty-mark"><FileCheck2 :size="22" /></div>
      <p>Pick a joiner to load their document slots.</p>
    </div>

    <template v-else>
      <!-- Summary -->
      <Motion as="div" class="docs-summary"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <div v-for="s in summary" :key="s.key" class="summary-tile" :style="{ '--accent': s.color }">
          <span class="summary-icon"><component :is="s.icon" :size="14" /></span>
          <div>
            <div class="summary-num">{{ s.count }}</div>
            <div class="summary-label">{{ s.label }}</div>
          </div>
        </div>
      </Motion>

      <!-- Document tile grid -->
      <div class="docs-grid">
        <Motion v-for="(d, i) in slots" :key="d.id"
          as="article" class="doc-tile" :data-status="d.status"
          :initial="{ opacity: 0, y: 14 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
          :whileHover="{ y: -3, transition: { duration: 0.2 } }"
        >
          <!-- ribbon edge -->
          <span class="tile-edge" :data-status="d.status"></span>

          <header class="tile-head">
            <div class="tile-meta">
              <span class="tile-key">{{ d.doc_type_key.toUpperCase() }}</span>
              <span class="tile-label">{{ d.doc_type_label }}</span>
            </div>
            <div class="tile-flags">
              <span v-if="d.is_mandatory" class="flag-must">REQUIRED</span>
              <span class="flag-state" :data-status="d.status">
                <span class="state-dot" :data-status="d.status"></span>
                {{ d.status }}
              </span>
            </div>
          </header>

          <div class="tile-body">
            <!-- Empty -->
            <div v-if="d.status === 'PENDING'" class="tile-drop">
              <input :id="`file-${d.id}`" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden @change="onSelect($event, d)" />
              <label :for="`file-${d.id}`" class="drop-zone">
                <span class="drop-mark"><Upload :size="18" /></span>
                <span class="drop-line">Drop file or click to browse</span>
                <span class="drop-hint">PDF / JPG / PNG · 10 MB max</span>
              </label>
            </div>
            <!-- Uploaded / verified -->
            <div v-else class="tile-file">
              <a v-if="d.drive_file_url" :href="resolveFileUrl(d.drive_file_url)" target="_blank" rel="noopener" class="file-card">
                <span class="file-mark"><FileText :size="16" /></span>
                <div class="file-text">
                  <span class="file-name">{{ d.drive_file_name || 'Document' }}</span>
                  <span class="file-sub">click to preview</span>
                </div>
                <ArrowUpRight :size="13" class="file-link-arrow" />
              </a>

              <div v-if="d.status === 'VERIFIED'" class="verify-line">
                <CheckCircle2 :size="13" />
                Verified by {{ d.verified_by_name || 'admin' }}
                <span v-if="d.verified_at"> · {{ formatDateTime(d.verified_at) }}</span>
              </div>
              <div v-else-if="d.status === 'REJECTED'" class="reject-line">
                <XCircle :size="13" />
                {{ d.rejection_reason || 'Rejected' }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <footer class="tile-foot" v-if="d.status === 'UPLOADED' || d.status === 'REJECTED'">
            <button v-if="d.status === 'UPLOADED'" class="onb-btn-primary" @click="verify(d)"><CheckCircle2 :size="12" />Verify</button>
            <button v-if="d.status === 'UPLOADED'" class="onb-btn-danger" @click="reject(d)"><XCircle :size="12" />Reject</button>
            <label v-if="d.status === 'REJECTED'" class="onb-btn-ghost" :for="`refile-${d.id}`">
              <Upload :size="12" /> Re-upload
              <input :id="`refile-${d.id}`" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden @change="onSelect($event, d)" />
            </label>
          </footer>
        </Motion>
      </div>
    </template>

    <!-- ════════ Rejection modal ════════ -->
    <OnbModal
      :open="rejectModalOpen"
      title="Reject document"
      subtitle="Tell the joiner exactly what to fix so they can re-upload."
      :icon="ShieldAlert"
      :width="520"
      @close="cancelReject"
    >
      <div class="rej-stack">
        <!-- Slot summary -->
        <div class="rej-summary" v-if="rejectingSlot">
          <div class="rej-summary-icon"><FileText :size="16" /></div>
          <div class="rej-summary-body">
            <div class="rej-summary-name">{{ rejectingSlot.document_label || rejectingSlot.document_type || 'Document' }}</div>
            <div class="rej-summary-meta">
              <span v-if="rejectingSlot.file_name">{{ rejectingSlot.file_name }}</span>
              <span v-else>Uploaded file</span>
              <span class="rej-summary-sep">·</span>
              <span class="rej-summary-tag">UPLOADED</span>
            </div>
          </div>
        </div>

        <!-- Preset chips -->
        <div class="rej-presets">
          <span class="rej-presets-label">Quick reasons</span>
          <div class="rej-chips">
            <MotionEl
              v-for="p in REJECT_PRESETS"
              :key="p"
              as="button"
              type="button"
              class="rej-chip"
              :whileHover="{ y: -2 }"
              :whileTap="{ scale: 0.96 }"
              @click="pickPreset(p)"
            >
              <Plus :size="11" /> {{ p }}
            </MotionEl>
          </div>
        </div>

        <!-- Reason -->
        <div class="rej-field">
          <label class="rej-field-label">
            Rejection reason <span class="rej-req">*</span>
          </label>
          <textarea
            v-model="rejectReason"
            class="rej-textarea"
            :class="{ 'has-error': rejectError }"
            rows="4"
            placeholder="Explain what's wrong with this document and how to fix it..."
            @input="rejectError = false"
          ></textarea>
          <span v-if="rejectError" class="rej-field-error">
            <AlertTriangle :size="11" /> Reason is required.
          </span>
        </div>

        <!-- Warning -->
        <div class="rej-warn">
          <ShieldAlert :size="13" />
          <span>The joiner will be notified and can re-upload a corrected file.</span>
        </div>
      </div>

      <template #footer>
        <button class="onb-btn-ghost" :disabled="rejectSubmitting" @click="cancelReject">Cancel</button>
        <button
          class="onb-btn-danger rej-confirm-btn"
          :disabled="rejectSubmitting || !rejectReason.trim()"
          @click="confirmReject"
        >
          <Loader2 v-if="rejectSubmitting" :size="13" class="rej-spin" />
          <XCircle v-else :size="13" />
          {{ rejectSubmitting ? 'Rejecting…' : 'Reject document' }}
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { FileCheck2, Upload, FileText, CheckCircle2, XCircle, ArrowUpRight, Clock, AlertTriangle, ShieldAlert, Loader2, Plus } from 'lucide-vue-next'
import { Motion as MotionEl } from 'motion-v'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import { fetchSlots, uploadToSlot, verifySlot, rejectSlot } from '../composables/useOnbDocuments'
import { useToast } from 'vue-toastification'
import { API_BASE } from '@/utils/api'

defineEmits(['refresh-stats'])

const toast = useToast()
const processId = ref('')
const slots = ref([])

const reload = async () => {
  if (!processId.value) return
  try { slots.value = await fetchSlots(processId.value) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load documents') }
}

const summary = computed(() => {
  const verified = slots.value.filter(s => s.status === 'VERIFIED').length
  const pending = slots.value.filter(s => s.status === 'PENDING').length
  const uploaded = slots.value.filter(s => s.status === 'UPLOADED').length
  const rejected = slots.value.filter(s => s.status === 'REJECTED').length
  return [
    { key: 'verified', label: 'Verified', count: verified, color: '#34d399', icon: CheckCircle2 },
    { key: 'uploaded', label: 'Awaiting review', count: uploaded, color: '#fb923c', icon: Clock },
    { key: 'pending', label: 'Pending', count: pending, color: '#fbbf24', icon: AlertTriangle },
    { key: 'rejected', label: 'Rejected', count: rejected, color: '#f87171', icon: XCircle },
  ]
})

const onSelect = async (evt, slot) => {
  const file = evt.target.files?.[0]
  if (!file) return
  try {
    const updated = await uploadToSlot(slot.id, file)
    const idx = slots.value.findIndex(s => s.id === slot.id)
    if (idx >= 0) slots.value[idx] = updated
    toast.success('Uploaded')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Upload failed') }
}
const verify = async (slot) => {
  try {
    const updated = await verifySlot(slot.id)
    const idx = slots.value.findIndex(s => s.id === slot.id)
    if (idx >= 0) slots.value[idx] = updated
    toast.success('Verified')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not verify') }
}
// ── Rejection modal state ──
const rejectModalOpen = ref(false)
const rejectingSlot = ref(null)
const rejectReason = ref('')
const rejectError = ref(false)
const rejectSubmitting = ref(false)

const REJECT_PRESETS = [
  'Document is blurry / illegible',
  'Wrong document type uploaded',
  'Information mismatch with employee record',
  'Document has expired',
  'Missing signature or stamp',
]

const reject = (slot) => {
  rejectingSlot.value = slot
  rejectReason.value = ''
  rejectError.value = false
  rejectModalOpen.value = true
}

const pickPreset = (preset) => {
  rejectReason.value = rejectReason.value ? `${rejectReason.value}\n${preset}` : preset
  rejectError.value = false
}

const cancelReject = () => {
  if (rejectSubmitting.value) return
  rejectModalOpen.value = false
  rejectingSlot.value = null
  rejectReason.value = ''
  rejectError.value = false
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    rejectError.value = true
    return
  }
  const slot = rejectingSlot.value
  if (!slot) return
  rejectSubmitting.value = true
  try {
    const updated = await rejectSlot(slot.id, rejectReason.value.trim())
    const idx = slots.value.findIndex(s => s.id === slot.id)
    if (idx >= 0) slots.value[idx] = updated
    toast.success('Document rejected')
    rejectModalOpen.value = false
    rejectingSlot.value = null
    rejectReason.value = ''
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not reject')
  } finally {
    rejectSubmitting.value = false
  }
}
const formatDateTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// Backend serves uploads via `/storage/...` — but the Vite proxy only forwards
// `/api/*`. So we prepend the backend origin to make the link work in dev.
// In production these resolve from the same host and the prefix is harmless.
const BACKEND_ORIGIN = `${API_BASE}`
const resolveFileUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${BACKEND_ORIGIN}${url}`
}
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-docs { display: flex; flex-direction: column; gap: 16px; }

.docs-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}

/* Summary */
.docs-summary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
@media (max-width: 880px) { .docs-summary { grid-template-columns: repeat(2, 1fr); } }
.summary-tile {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 16px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  transition: border-color .25s var(--hr-spring), transform .3s var(--hr-spring), box-shadow .3s var(--hr-spring);
}
.summary-tile::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 80% at 0% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%);
  pointer-events: none;
}
.summary-tile:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow: 0 24px 50px -28px color-mix(in srgb, var(--accent) 50%, transparent);
}
.summary-icon {
  width: 36px; height: 36px; border-radius: 11px;
  background: color-mix(in srgb, var(--accent) 22%, transparent); color: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 20px -10px color-mix(in srgb, var(--accent) 60%, transparent);
}
.summary-num {
  font-size: 26px; font-weight: 800; line-height: 1; color: var(--hr-text);
  font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
}
.summary-label { font-size: 10.5px; color: var(--hr-text-muted); margin-top: 4px; letter-spacing: 0.6px; text-transform: uppercase; font-weight: 600; }

/* Document tiles — translucent glass */
.docs-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;
}
.doc-tile {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 20px;
  padding: 16px 18px 14px;
  display: flex; flex-direction: column; gap: 14px;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  transition: border-color .25s var(--hr-spring), box-shadow .3s var(--hr-spring), transform .3s var(--hr-spring);
}
.doc-tile::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%),
    radial-gradient(70% 50% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 70%);
  pointer-events: none; z-index: -1;
}
.doc-tile[data-status="VERIFIED"] {
  border-color: rgba(52, 211, 153, 0.45);
  box-shadow:
    inset 0 0 0 1px rgba(52, 211, 153, 0.22),
    0 24px 60px -32px rgba(52, 211, 153, 0.5);
  animation: onb-doc-verified 1.4s ease-out 1;
}
.doc-tile[data-status="REJECTED"] { border-color: rgba(248, 113, 113, 0.45); }
.doc-tile[data-status="UPLOADED"] { border-color: rgba(251, 146, 60, 0.45); }
.doc-tile:hover {
  transform: translateY(-3px);
  box-shadow: 0 30px 70px -32px rgba(251, 146, 60, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.2);
}

.tile-edge {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--hr-gradient-hero);
}
.tile-edge[data-status="VERIFIED"] { background: linear-gradient(90deg, #34d399, #2dd4bf); }
.tile-edge[data-status="REJECTED"] { background: linear-gradient(90deg, #f87171, #ef4444); }
.tile-edge[data-status="UPLOADED"] { background: linear-gradient(90deg, #fb923c, #f97316); }

.tile-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding-top: 6px; }
.tile-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tile-key   { font-size: 9.5px; font-weight: 700; letter-spacing: 1.4px; color: var(--hr-text-muted); font-family: var(--hr-mono); }
.tile-label { font-size: 14px; font-weight: 700; color: var(--hr-text); }
.tile-flags { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.flag-must {
  font-size: 8.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
}
.flag-state {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.06); color: var(--hr-text-muted);
}
.flag-state[data-status="VERIFIED"] { background: rgba(52, 211, 153, 0.18); color: #34d399; }
.flag-state[data-status="UPLOADED"] { background: rgba(251, 146, 60, 0.18); color: #fb923c; }
.flag-state[data-status="REJECTED"] { background: rgba(248, 113, 113, 0.18); color: #f87171; }
.state-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

/* drop zone */
.tile-drop { padding-top: 4px; }
.drop-zone {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 22px 14px;
  border: 1.5px dashed var(--hr-border-strong); border-radius: 12px;
  cursor: pointer; color: var(--hr-text-muted); text-align: center;
  transition: border-color .25s var(--hr-spring), background .25s var(--hr-spring);
}
.drop-zone:hover { border-color: var(--hr-accent-gold-border); background: var(--hr-accent-gold-soft); }
.drop-mark {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
}
.drop-line { font-size: 12.5px; font-weight: 700; color: var(--hr-text); margin-top: 2px; }
.drop-hint { font-size: 10.5px; }

/* uploaded */
.tile-file { display: flex; flex-direction: column; gap: 10px; }
.file-card {
  display: flex; align-items: center; gap: 12px;
  background: rgba(14, 11, 9, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 14px;
  padding: 11px 14px;
  text-decoration: none; color: var(--hr-text);
  backdrop-filter: blur(10px);
  transition: border-color .25s var(--hr-spring), background .25s var(--hr-spring), transform .2s var(--hr-spring);
}
.file-card:hover { transform: translateX(2px); }
.file-card:hover { border-color: var(--hr-accent-gold-border); background: var(--hr-accent-gold-soft); }
.file-mark {
  width: 30px; height: 30px; border-radius: 9px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  display: inline-flex; align-items: center; justify-content: center;
}
.file-text { display: flex; flex-direction: column; gap: 0; min-width: 0; flex: 1; }
.file-name { font-size: 12.5px; font-weight: 700; color: var(--hr-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-sub  { font-size: 10px; color: var(--hr-text-muted); }
.file-link-arrow { color: var(--hr-text-muted); transition: color .2s var(--hr-spring); }
.file-card:hover .file-link-arrow { color: var(--hr-accent-gold); }

.verify-line { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #34d399; }
.reject-line {
  font-size: 11.5px; color: #f87171;
  background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.22);
  padding: 8px 10px; border-radius: 10px;
  display: inline-flex; align-items: center; gap: 6px;
}

.tile-foot { display: flex; gap: 8px; padding-top: 4px; }

/* ═════════════════════════════════════════════════════════════════════
   Rejection modal — premium gold/cream glass, status-aware accents
   ═════════════════════════════════════════════════════════════════════ */
.rej-stack { display: flex; flex-direction: column; gap: 16px; }

/* Slot summary card */
.rej-summary {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(251, 146, 60, 0.10), rgba(251, 191, 36, 0.04)),
    rgba(20, 16, 12, 0.30);
  border: 1px solid rgba(251, 146, 60, 0.22);
  backdrop-filter: blur(12px);
}
.rej-summary-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(251, 146, 60, 0.18);
  color: #fb923c;
  flex-shrink: 0;
}
.rej-summary-body { min-width: 0; }
.rej-summary-name { font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.rej-summary-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; color: var(--hr-text-muted);
  margin-top: 2px;
}
.rej-summary-sep { opacity: 0.5; }
.rej-summary-tag {
  font-weight: 700; letter-spacing: 0.5px;
  padding: 1px 6px; border-radius: 4px;
  background: rgba(251, 146, 60, 0.18); color: #fb923c;
}

/* Preset chips */
.rej-presets { display: flex; flex-direction: column; gap: 8px; }
.rej-presets-label {
  font-size: 10px; font-weight: 700; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.rej-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rej-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 10px;
  font-size: 11px; font-weight: 600;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: border-color .18s var(--hr-spring), background .18s var(--hr-spring), color .18s var(--hr-spring);
}
.rej-chip:hover {
  border-color: rgba(251, 191, 36, 0.40);
  background: rgba(251, 191, 36, 0.10);
  color: var(--hr-accent-gold);
}

/* Reason textarea */
.rej-field { display: flex; flex-direction: column; gap: 6px; }
.rej-field-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.rej-req { color: #f87171; }
.rej-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px; line-height: 1.55;
  color: var(--hr-text);
  font-family: inherit;
  resize: vertical;
  min-height: 92px;
  outline: none;
  transition: border-color .2s var(--hr-spring), box-shadow .2s var(--hr-spring), background .2s var(--hr-spring);
}
.rej-textarea::placeholder { color: rgba(255, 255, 255, 0.35); }
.rej-textarea:focus {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(248, 113, 113, 0.05);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.14);
}
.rej-textarea.has-error {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.18);
}
.rej-field-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #f87171;
}

/* Warning footer line */
.rej-warn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11.5px; color: var(--hr-text-muted);
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.22);
}
.rej-warn svg { color: var(--hr-accent-gold); }

/* Submit button — red gradient when active */
.rej-confirm-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  color: #fff !important;
  border-color: transparent !important;
  box-shadow: 0 8px 22px -8px rgba(220, 38, 38, 0.55);
}
.rej-confirm-btn:hover:not(:disabled) {
  filter: brightness(1.05);
  box-shadow: 0 12px 30px -8px rgba(220, 38, 38, 0.70);
}
.rej-confirm-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.rej-spin { animation: rej-spin 0.8s linear infinite; }
@keyframes rej-spin { to { transform: rotate(360deg); } }

/* ── Light theme overrides for the rejection modal ── */
[data-theme="light"] .rej-summary {
  background:
    linear-gradient(135deg, rgba(251, 146, 60, 0.14), rgba(251, 191, 36, 0.06)),
    rgba(255, 250, 240, 0.80);
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .rej-summary-icon {
  background: rgba(217, 119, 6, 0.18);
  color: #b45309;
}
[data-theme="light"] .rej-summary-tag {
  background: rgba(217, 119, 6, 0.18);
  color: #b45309;
}
[data-theme="light"] .rej-chip {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.12);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .rej-chip:hover {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
}
[data-theme="light"] .rej-textarea {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text);
}
[data-theme="light"] .rej-textarea::placeholder { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .rej-textarea:focus {
  border-color: rgba(220, 38, 38, 0.55);
  background: rgba(255, 246, 226, 0.95);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .rej-textarea.has-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .rej-field-error { color: #b91c1c; }
[data-theme="light"] .rej-req { color: #b91c1c; }
[data-theme="light"] .rej-warn {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.32);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .rej-warn svg { color: #b45309; }
[data-theme="light"] .rej-confirm-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
  box-shadow: 0 8px 22px -8px rgba(220, 38, 38, 0.60);
}
</style>
