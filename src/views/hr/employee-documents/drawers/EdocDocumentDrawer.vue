<template>
  <Teleport to="body">
    <transition name="edoc-drawer">
      <div v-if="open" class="edoc-drawer-scrim" @click.self="$emit('close')">
        <aside class="edoc-drawer" :data-status="d?.verification_status || 'PENDING'">
          <!-- Ambient layer: aurora orbs + faint grid + accent line -->
          <div class="dr-aurora" aria-hidden="true">
            <span class="aurora-orb a1" />
            <span class="aurora-orb a2" />
            <span class="aurora-orb a3" />
          </div>
          <div class="dr-grid" aria-hidden="true" />
          <div class="dr-accent" aria-hidden="true" />

          <!-- ═══════════════════════════════════════════════════════════════
               HERO — status-themed header
               ═══════════════════════════════════════════════════════════════ -->
          <header class="dr-hero">
            <button class="dr-close" @click="$emit('close')" aria-label="Close drawer"><X :size="15" /></button>

            <div class="dr-hero-row">
              <Motion as="div" class="dr-hero-icon"
                :initial="{ scale: 0.6, opacity: 0, rotate: -12 }"
                :animate="{ scale: 1, opacity: 1, rotate: 0 }"
                :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
              >
                <component :is="catIcon" :size="22" />
                <span class="icon-ring" />
                <span class="icon-glow" />
              </Motion>

              <Motion as="div" class="dr-hero-text"
                :initial="{ x: -10, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
                :transition="{ duration: 0.45, delay: 0.08 }"
              >
                <span class="dr-hero-eyebrow edoc-mono">
                  <span class="eyebrow-dot" />
                  {{ (d?.doc_type || 'document').replace(/_/g, ' ') }}
                </span>
                <h3 class="dr-hero-title">{{ d?.title || 'Document' }}</h3>
              </Motion>
            </div>

            <Motion v-if="d" as="div" class="dr-hero-pills"
              :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.4, delay: 0.18 }"
            >
              <EdocStatusChip :status="d.verification_status" />
              <span v-if="d.is_confidential" class="dr-mini-pill conf"><Lock :size="10" /> Confidential</span>
              <span v-if="d.source === 'ONBOARDING'" class="dr-mini-pill src"><Sparkles :size="10" /> From onboarding</span>
              <span v-if="d.is_archived" class="dr-mini-pill arc"><Archive :size="10" /> Archived</span>
            </Motion>
          </header>

          <!-- ═══════════════════════════════════════════════════════════════
               LOADING SKELETON
               ═══════════════════════════════════════════════════════════════ -->
          <div v-if="loading" class="dr-loading">
            <div class="edoc-skel sk-card" />
            <div class="edoc-skel sk-card-tall" />
            <div class="edoc-skel sk-card" />
            <div class="edoc-skel sk-card-tall" />
          </div>

          <!-- ═══════════════════════════════════════════════════════════════
               BODY — structured sections
               ═══════════════════════════════════════════════════════════════ -->
          <div v-else-if="d" class="dr-body">
            <!-- Employee -->
            <Motion as="section" class="dr-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.22, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-section-head">
                <UserRound :size="11" />
                <span>Employee</span>
              </div>
              <div class="dr-employee">
                <div class="emp-avatar">
                  <span>{{ initials(d.employee_name) }}</span>
                  <span class="avatar-ring" />
                </div>
                <div class="emp-info">
                  <div class="emp-name">{{ d.employee_name || 'Unknown employee' }}</div>
                  <div class="emp-sub edoc-mono">
                    <span v-if="d.employee_code">{{ d.employee_code }}</span>
                    <span v-if="d.department_name" class="emp-dept"><Briefcase :size="10" /> {{ d.department_name }}</span>
                  </div>
                </div>
              </div>
            </Motion>

            <!-- File -->
            <Motion as="section" class="dr-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.30, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-section-head">
                <Paperclip :size="11" />
                <span>File</span>
                <span v-if="d.has_file" class="head-tag ok">Attached</span>
                <span v-else class="head-tag warn">Missing</span>
              </div>
              <div class="dr-file" :data-has="d.has_file">
                <div class="file-thumb">
                  <component :is="d.has_file ? FileText : FileWarning" :size="26" />
                  <span v-if="d.has_file" class="file-type edoc-mono">{{ (d.file_type || '').toUpperCase() }}</span>
                  <span class="thumb-sheen" />
                </div>
                <div class="file-info">
                  <div class="file-name">{{ d.file_name || 'No file attached' }}</div>
                  <div class="file-sub edoc-mono">
                    {{ d.has_file ? prettySize(d.file_size) : 'Upload an original to enable verification' }}
                  </div>
                </div>
                <div class="file-actions">
                  <Motion v-if="d.has_file" as="button" class="dr-icon-btn" :disabled="dl"
                    :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" @click="download" :title="'Download'">
                    <Loader2 v-if="dl" :size="14" class="spin" /><Download v-else :size="14" />
                  </Motion>
                  <label class="dr-icon-btn replace-btn" :title="d.has_file ? 'Replace' : 'Upload'">
                    <UploadCloud :size="14" />
                    <input type="file" class="hidden-input" :accept="ACCEPT" @change="onReplace" />
                  </label>
                </div>
              </div>
            </Motion>

            <!-- Rejection notice -->
            <Motion v-if="d.rejection_reason" as="div" class="dr-reject-card"
              :initial="{ y: 10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.4, delay: 0.34 }"
            >
              <AlertTriangle :size="14" />
              <div>
                <div class="reject-label">Rejected</div>
                <div class="reject-text">{{ d.rejection_reason }}</div>
              </div>
            </Motion>

            <!-- Details -->
            <Motion as="section" class="dr-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.38, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-section-head">
                <ListChecks :size="11" />
                <span>Details</span>
              </div>
              <div class="dr-details">
                <div class="detail-cell" :data-empty="!d.document_number">
                  <span class="cell-label">Number</span>
                  <span v-if="d.document_number" class="cell-value edoc-mono">
                    {{ d.document_number }}
                    <button v-if="d.is_confidential && d.document_number_masked" class="cell-reveal" @click="reveal" title="Reveal">
                      <Eye :size="11" />
                    </button>
                  </span>
                  <span v-else class="cell-empty">Not provided</span>
                </div>
                <div class="detail-cell" :data-empty="!d.issued_by">
                  <span class="cell-label">Issued by</span>
                  <span v-if="d.issued_by" class="cell-value">{{ d.issued_by }}</span>
                  <span v-else class="cell-empty">Not provided</span>
                </div>
                <div class="detail-cell" :data-empty="!d.issue_date">
                  <span class="cell-label">Issue date</span>
                  <span v-if="d.issue_date" class="cell-value">{{ fmt(d.issue_date) }}</span>
                  <span v-else class="cell-empty">Not provided</span>
                </div>
                <div class="detail-cell" :data-empty="!d.expiry_date">
                  <span class="cell-label">Expiry</span>
                  <span v-if="d.expiry_date" class="cell-value" :class="expiryCls">
                    {{ fmt(d.expiry_date) }}
                    <span v-if="d.days_to_expiry != null" class="cell-dd">({{ d.days_to_expiry }}d)</span>
                  </span>
                  <span v-else class="cell-empty">No expiry</span>
                </div>
              </div>
            </Motion>

            <!-- Renew expiry -->
            <Motion as="section" class="dr-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.46, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-section-head">
                <CalendarClock :size="11" />
                <span>Update expiry</span>
                <span class="head-hint">on renewal</span>
              </div>
              <div class="dr-renew">
                <div class="renew-input"><HrDatePicker v-model="newExpiry" /></div>
                <Motion as="button" class="dr-btn dr-btn-sm" :disabled="!newExpiry || saving"
                  :whileHover="newExpiry ? { y: -1 } : {}" :whileTap="newExpiry ? { scale: 0.96 } : {}" @click="renew">
                  <RefreshCw :size="13" /> Apply
                </Motion>
              </div>
            </Motion>

            <!-- Audit timeline -->
            <Motion as="section" class="dr-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.54, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-section-head">
                <History :size="11" />
                <span>Audit trail</span>
                <span v-if="d.events?.length" class="head-tag">{{ d.events.length }}</span>
              </div>
              <ul class="dr-timeline" v-if="d.events?.length">
                <Motion as="li" v-for="(e, i) in d.events" :key="e.id" class="tl-item" :data-action="e.action"
                  :initial="{ x: -8, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
                  :transition="{ duration: 0.32, delay: 0.58 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
                >
                  <span class="tl-line" v-if="i < d.events.length - 1" />
                  <span class="tl-dot">
                    <span class="tl-dot-pulse" v-if="i === 0" />
                  </span>
                  <div class="tl-body">
                    <div class="tl-action">{{ actionLabel(e.action) }}</div>
                    <div class="tl-meta edoc-mono">
                      <span class="tl-actor">{{ e.actor_name || 'system' }}</span>
                      <span class="tl-sep">·</span>
                      <span>{{ fmtTime(e.created_at) }}</span>
                    </div>
                    <div v-if="e.note" class="tl-note">{{ e.note }}</div>
                  </div>
                </Motion>
              </ul>
              <div v-else class="dr-timeline-empty">No activity yet.</div>
            </Motion>
          </div>

          <!-- ═══════════════════════════════════════════════════════════════
               ACTION FOOTER
               ═══════════════════════════════════════════════════════════════ -->
          <footer v-if="d" class="dr-foot">
            <transition name="foot-mode" mode="out-in">
              <div v-if="rejectMode" key="reject" class="foot-reject">
                <HrTextarea v-model="rejectReason" :rows="2" placeholder="Reason for rejection / resubmission…" />
                <div class="foot-row">
                  <button class="dr-btn ghost" @click="rejectMode = false">Cancel</button>
                  <div class="foot-spacer" />
                  <Motion as="button" class="dr-btn dr-btn-sm" :disabled="!rejectReason || saving"
                    :whileHover="rejectReason ? { y: -1 } : {}" :whileTap="rejectReason ? { scale: 0.96 } : {}" @click="doResubmit">
                    <RefreshCw :size="13" /> Request resubmit
                  </Motion>
                  <Motion as="button" class="dr-btn danger dr-btn-sm" :disabled="!rejectReason || saving"
                    :whileHover="rejectReason ? { y: -1 } : {}" :whileTap="rejectReason ? { scale: 0.96 } : {}" @click="doReject">
                    <XCircle :size="13" /> Reject
                  </Motion>
                </div>
              </div>
              <div v-else key="actions" class="foot-row">
                <Motion as="button" v-if="!d.is_archived" class="dr-btn ghost dr-btn-sm"
                  :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="archive">
                  <Archive :size="13" /> Archive
                </Motion>
                <Motion as="button" v-else class="dr-btn ghost dr-btn-sm"
                  :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="restore">
                  <ArchiveRestore :size="13" /> Restore
                </Motion>
                <Motion as="button" class="dr-btn ghost dr-btn-sm danger-ghost" :disabled="saving"
                  :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="deleteModal = true">
                  <Trash2 :size="13" /> Delete
                </Motion>
                <div class="foot-spacer" />
                <Motion as="button" class="dr-btn dr-btn-sm" :disabled="saving"
                  :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }" @click="rejectMode = true">
                  <XCircle :size="13" /> Reject
                </Motion>
                <Motion as="button" class="dr-btn primary dr-btn-sm" :disabled="!canVerify || saving"
                  :whileHover="canVerify ? { y: -2 } : {}" :whileTap="canVerify ? { scale: 0.95 } : {}" @click="doVerify">
                  <Loader2 v-if="saving" :size="13" class="spin" /><CheckCircle2 v-else :size="13" />
                  <span>Verify</span>
                </Motion>
              </div>
            </transition>
          </footer>
        </aside>

        <!-- ═══════════════════════════════════════════════════════════════
             DELETE CONFIRMATION MODAL — Teleports to body itself
             ═══════════════════════════════════════════════════════════════ -->
        <EdocDeleteModal
          :open="deleteModal"
          :doc="d"
          :busy="deleting"
          @cancel="deleteModal = false"
          @confirm="doDelete"
        />
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, UserRound, FileText, FileWarning, Download, UploadCloud, Eye, AlertTriangle,
  RefreshCw, History, Archive, ArchiveRestore, XCircle, CheckCircle2, Loader2, Lock, Trash2,
  IdCard, FileSignature, Award, ReceiptIndianRupee, ScrollText, Fingerprint, GraduationCap, ShieldCheck,
  Paperclip, ListChecks, CalendarClock, Briefcase, Sparkles,
} from 'lucide-vue-next'
import EdocStatusChip from '../components/EdocStatusChip.vue'
import EdocDeleteModal from '../modals/EdocDeleteModal.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { useEmployeeDocuments } from '@/composables/useEmployeeDocuments'
import { useToast } from '@/composables/useToast'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx'
const props = defineProps({
  open: { type: Boolean, default: false },
  docId: { type: String, default: null },
})
const emit = defineEmits(['close', 'changed'])

const { success, error } = useToast()
const api = useEmployeeDocuments()

const d = ref(null)
const loading = ref(false)
const saving = ref(false)
const dl = ref(false)
const rejectMode = ref(false)
const rejectReason = ref('')
const newExpiry = ref(null)
const deleteModal = ref(false)
const deleting = ref(false)

const CAT_ICON = { KYC: IdCard, CONTRACT: FileSignature, CERTIFICATE: Award, SALARY_SLIP: ReceiptIndianRupee, EXPERIENCE_LETTER: ScrollText, ID_PROOF: Fingerprint, EDUCATION: GraduationCap, COMPLIANCE: ShieldCheck }
const catIcon = computed(() => CAT_ICON[d.value?.category] || FileText)
const canVerify = computed(() => d.value?.has_file && d.value?.verification_status !== 'VERIFIED')
const expiryCls = computed(() => {
  const x = d.value?.days_to_expiry
  if (x == null) return ''
  if (x < 0) return 'is-expired'
  if (x <= 30) return 'is-soon'
  return ''
})

const initials = (name) => {
  if (!name) return '—'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
const actionLabel = (a) => {
  const map = {
    UPLOADED: 'Uploaded', VERIFIED: 'Verified', REJECTED: 'Rejected',
    RESUBMIT_REQUESTED: 'Resubmit requested', RESUBMITTED: 'Resubmitted',
    DOWNLOADED: 'Downloaded', VIEWED: 'Viewed', REVEALED: 'Number revealed',
    RENEWED: 'Renewed', ARCHIVED: 'Archived', RESTORED: 'Restored',
    EXPIRED: 'Expired', DELETED: 'Deleted', CREATED: 'Created', UPDATED: 'Updated',
  }
  return map[a] || (a || '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
}
const fmt = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtTime = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
const prettySize = (b) => {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

const load = async () => {
  if (!props.docId) return
  loading.value = true; rejectMode.value = false; rejectReason.value = ''; newExpiry.value = null
  try { d.value = await api.getOne(props.docId) }
  catch (e) { error(e?.response?.data?.detail || 'Failed to load document') }
  finally { loading.value = false }
}
watch(() => [props.open, props.docId], () => { if (props.open && props.docId) load() })

const after = async () => { await load(); emit('changed') }
const reveal = async () => { try { d.value = await api.getOne(props.docId, true) } catch {} }
const download = async () => { dl.value = true; try { const url = await api.downloadUrl(props.docId); window.open(url, '_blank') } catch (e) { error('Download failed') } finally { dl.value = false } }
const onReplace = async (e) => { const f = e.target.files?.[0]; if (!f) return; saving.value = true; try { await api.uploadFile(props.docId, f); success('File uploaded'); await after() } catch (er) { error(er?.response?.data?.detail || 'Upload failed') } finally { saving.value = false } }
const doVerify = async () => { saving.value = true; try { await api.verify(props.docId); success('Verified'); await after() } catch (e) { error(e?.response?.data?.detail || 'Verify failed') } finally { saving.value = false } }
const doReject = async () => { saving.value = true; try { await api.reject(props.docId, rejectReason.value); success('Rejected'); rejectMode.value = false; await after() } catch (e) { error('Reject failed') } finally { saving.value = false } }
const doResubmit = async () => { saving.value = true; try { await api.requestResubmit(props.docId, rejectReason.value); success('Resubmit requested'); rejectMode.value = false; await after() } catch (e) { error('Failed') } finally { saving.value = false } }
const renew = async () => { saving.value = true; try { await api.update(props.docId, { expiry_date: newExpiry.value }); success('Expiry updated'); await after() } catch (e) { error('Update failed') } finally { saving.value = false } }
const archive = async () => { saving.value = true; try { await api.archive(props.docId); success('Archived'); await after() } catch (e) { error('Archive failed') } finally { saving.value = false } }
const restore = async () => { saving.value = true; try { await api.restore(props.docId); success('Restored'); await after() } catch (e) { error('Restore failed') } finally { saving.value = false } }
const doDelete = async (payload) => {
  if (!props.docId) return
  deleting.value = true
  try {
    await api.remove(props.docId, payload)
    success('Document deleted')
    deleteModal.value = false
    emit('changed')
    emit('close')
  } catch (e) {
    error(e?.response?.data?.detail || 'Delete failed')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   SCRIM
   ═══════════════════════════════════════════════════════════════════════════ */
.edoc-drawer-scrim {
  position: fixed; inset: 0; z-index: 1090;
  display: flex; justify-content: flex-end;
  background: radial-gradient(60% 80% at 100% 50%, rgba(120, 53, 15, 0.42), rgba(6, 6, 8, 0.62) 70%);
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DRAWER SHELL
   ═══════════════════════════════════════════════════════════════════════════ */
.edoc-drawer {
  position: relative; width: 520px; max-width: 96vw; height: 100%;
  display: flex; flex-direction: column;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 55%),
    radial-gradient(80% 50% at 0% 100%, rgba(180, 83, 9, 0.12), transparent 60%),
    rgba(14, 12, 14, 0.92);
  border-left: 1px solid rgba(251, 191, 36, 0.22);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  box-shadow:
    -40px 0 100px -30px rgba(0, 0, 0, 0.85),
    inset 1px 0 0 rgba(251, 191, 36, 0.08);
  overflow: hidden;
  isolation: isolate;
}

/* Aurora — slow drifting orbs behind everything */
.dr-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.aurora-orb {
  position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5;
}
.aurora-orb.a1 {
  width: 380px; height: 380px; top: -120px; right: -80px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 70%);
  animation: dr-orb-drift-a 22s ease-in-out infinite;
}
.aurora-orb.a2 {
  width: 320px; height: 320px; bottom: 120px; left: -100px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.40), transparent 70%);
  animation: dr-orb-drift-b 28s ease-in-out infinite;
}
.aurora-orb.a3 {
  width: 260px; height: 260px; top: 45%; right: -60px;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.30), transparent 70%);
  animation: dr-orb-drift-c 32s ease-in-out infinite;
}
@keyframes dr-orb-drift-a {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(-20px,30px,0) scale(1.06); }
}
@keyframes dr-orb-drift-b {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(30px,-20px,0) scale(1.08); }
}
@keyframes dr-orb-drift-c {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(-18px,18px,0) scale(0.95); }
}

/* Faint grid texture */
.dr-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 40%, transparent 80%);
  opacity: 0.7;
}

/* Vertical accent rail (status-themed) */
.dr-accent {
  position: absolute; top: 0; left: 0; bottom: 0; width: 3px; z-index: 1;
  background: linear-gradient(180deg, #fbbf24, #fb923c 50%, #ea580c);
}
.edoc-drawer[data-status="VERIFIED"] .dr-accent { background: linear-gradient(180deg, #34d399, #10b981 50%, #047857); }
.edoc-drawer[data-status="REJECTED"] .dr-accent { background: linear-gradient(180deg, #f87171, #ef4444 50%, #b91c1c); }
.edoc-drawer[data-status="RESUBMIT_REQUIRED"] .dr-accent { background: linear-gradient(180deg, #fb923c, #ea580c 50%, #c2410c); }
.edoc-drawer[data-status="EXPIRED"] .dr-accent { background: linear-gradient(180deg, #6b7280, #4b5563 50%, #374151); }

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */
.dr-hero {
  position: relative; z-index: 2;
  padding: 26px 26px 22px;
  border-bottom: 1px solid rgba(251, 191, 36, 0.10);
}
.dr-close {
  position: absolute; top: 18px; right: 18px;
  display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(251, 191, 36, 0.18);
  color: var(--hr-text-secondary); cursor: pointer;
  transition: transform .4s var(--edoc-spring), background .25s, border-color .25s, color .25s;
}
.dr-close:hover {
  transform: rotate(90deg) scale(1.05);
  background: rgba(251, 146, 60, 0.14);
  border-color: rgba(251, 146, 60, 0.45);
  color: #fef3c7;
}
.dr-hero-row { display: flex; align-items: center; gap: 14px; padding-right: 40px; }
.dr-hero-icon {
  position: relative;
  display: grid; place-items: center;
  width: 52px; height: 52px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(234, 88, 12, 0.20));
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: #fef3c7;
  box-shadow: 0 8px 28px -10px rgba(251, 146, 60, 0.5);
  flex-shrink: 0;
}
.edoc-drawer[data-status="VERIFIED"] .dr-hero-icon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(4, 120, 87, 0.22));
  border-color: rgba(52, 211, 153, 0.45);
  color: #d1fae5;
  box-shadow: 0 8px 28px -10px rgba(16, 185, 129, 0.55);
}
.edoc-drawer[data-status="REJECTED"] .dr-hero-icon {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.22));
  border-color: rgba(248, 113, 113, 0.45);
  color: #fecaca;
}
.icon-ring {
  position: absolute; inset: -5px; border-radius: 19px; pointer-events: none;
  background:
    conic-gradient(from 0deg,
      transparent, rgba(251, 191, 36, 0.45), transparent 25%,
      transparent 50%, rgba(251, 146, 60, 0.45), transparent 75%);
  -webkit-mask: radial-gradient(transparent 56%, #000 58%);
          mask: radial-gradient(transparent 56%, #000 58%);
  animation: dr-icon-ring 8s linear infinite;
  opacity: 0.85;
}
.edoc-drawer[data-status="VERIFIED"] .icon-ring {
  background: conic-gradient(from 0deg, transparent, rgba(52, 211, 153, 0.5), transparent 25%, transparent 50%, rgba(16, 185, 129, 0.5), transparent 75%);
}
@keyframes dr-icon-ring { to { transform: rotate(360deg); } }
.icon-glow {
  position: absolute; inset: -16px; border-radius: 30px; pointer-events: none;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.20), transparent 65%);
  z-index: -1;
  animation: dr-icon-pulse 3.4s ease-in-out infinite;
}
.edoc-drawer[data-status="VERIFIED"] .icon-glow {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.22), transparent 65%);
}
@keyframes dr-icon-pulse {
  0%,100% { opacity: 0.6; transform: scale(1); }
  50%     { opacity: 1;   transform: scale(1.1); }
}

.dr-hero-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.dr-hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--hr-accent-gold);
  width: max-content;
}
.eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%; background: #fb923c;
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.7);
  animation: dr-eyebrow-pulse 2.2s ease-in-out infinite;
}
@keyframes dr-eyebrow-pulse {
  0%,100% { opacity: 0.85; transform: scale(1); }
  50%     { opacity: 1;    transform: scale(1.35); }
}
.dr-hero-title {
  margin: 0;
  font-size: 21px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.18;
  color: var(--hr-text);
  background: linear-gradient(135deg, #fff 0%, #fef3c7 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  word-break: break-word;
}
.dr-hero-pills {
  display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  margin-top: 16px;
}
.dr-mini-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
}
.dr-mini-pill.conf {
  background: rgba(180, 83, 9, 0.20); color: #fed7aa;
  border: 1px solid rgba(251, 146, 60, 0.35);
}
.dr-mini-pill.src {
  background: rgba(124, 58, 237, 0.0); color: var(--hr-text-muted);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.dr-mini-pill.arc {
  background: rgba(75, 85, 99, 0.18); color: #d1d5db;
  border: 1px solid rgba(156, 163, 175, 0.30);
}

/* ═══════════════════════════════════════════════════════════════════════════
   BODY
   ═══════════════════════════════════════════════════════════════════════════ */
.dr-body, .dr-loading {
  position: relative; z-index: 2;
  padding: 22px 26px 26px;
  display: flex; flex-direction: column; gap: 22px;
  overflow-y: auto; flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 191, 36, 0.3) transparent;
}
.dr-body::-webkit-scrollbar { width: 6px; }
.dr-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.25); border-radius: 3px; }

/* Skeleton */
.sk-card { height: 80px; border-radius: 14px; }
.sk-card-tall { height: 120px; border-radius: 14px; }
.edoc-skel {
  background: linear-gradient(110deg,
    rgba(40, 30, 22, 0.55) 0%, rgba(40, 30, 22, 0.55) 35%,
    rgba(251, 191, 36, 0.10) 50%,
    rgba(40, 30, 22, 0.55) 65%, rgba(40, 30, 22, 0.55) 100%);
  background-size: 280% 100%;
  animation: dr-skel-sweep 1.6s linear infinite;
}
@keyframes dr-skel-sweep { from { background-position: 100% 0; } to { background-position: -100% 0; } }

/* Section structure */
.dr-section { display: flex; flex-direction: column; gap: 9px; }
.dr-section-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--hr-text-muted);
  padding-left: 2px;
}
.dr-section-head > svg { color: var(--hr-accent-gold); }
.head-tag {
  display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.05em;
  background: rgba(251, 191, 36, 0.14); color: var(--hr-accent-gold);
  border: 1px solid rgba(251, 191, 36, 0.25);
  margin-left: auto;
}
.head-tag.ok { background: rgba(16, 185, 129, 0.16); color: #34d399; border-color: rgba(52, 211, 153, 0.3); }
.head-tag.warn { background: rgba(239, 68, 68, 0.14); color: #fca5a5; border-color: rgba(248, 113, 113, 0.3); }
.head-hint { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--hr-text-muted); }

/* Employee card */
.dr-employee {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 14px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(40, 30, 22, 0.65), rgba(28, 22, 18, 0.55));
  border: 1px solid rgba(251, 191, 36, 0.14);
  transition: border-color .3s, transform .3s;
}
.dr-employee:hover { border-color: rgba(251, 191, 36, 0.32); transform: translateY(-1px); }
.emp-avatar {
  position: relative;
  display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px;
  background: linear-gradient(135deg, #fbbf24 0%, #ea580c 100%);
  color: #1a0e02; font-size: 14px; font-weight: 800; letter-spacing: 0.02em;
  flex-shrink: 0;
  box-shadow: 0 6px 18px -6px rgba(234, 88, 12, 0.55);
}
.avatar-ring {
  position: absolute; inset: -3px; border-radius: 16px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  pointer-events: none;
}
.emp-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.emp-name { font-size: 14px; font-weight: 700; color: var(--hr-text); }
.emp-sub {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 11px; color: var(--hr-text-muted);
}
.emp-dept { display: inline-flex; align-items: center; gap: 4px; }

/* File card */
.dr-file {
  position: relative;
  display: flex; align-items: center; gap: 13px;
  padding: 13px 14px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(40, 30, 22, 0.65), rgba(28, 22, 18, 0.55));
  border: 1px solid rgba(251, 191, 36, 0.14);
  overflow: hidden; isolation: isolate;
  transition: border-color .3s, transform .3s;
}
.dr-file:hover { border-color: rgba(251, 191, 36, 0.32); transform: translateY(-1px); }
.dr-file[data-has="false"] {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(28, 22, 18, 0.55));
  border-color: rgba(248, 113, 113, 0.22);
}
.file-thumb {
  position: relative;
  display: grid; place-items: center;
  width: 48px; height: 56px; border-radius: 9px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.18), rgba(180, 83, 9, 0.10));
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: var(--edoc-verified, #34d399);
  flex-shrink: 0;
  overflow: hidden;
}
.dr-file[data-has="false"] .file-thumb {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.12), rgba(127, 29, 29, 0.08));
  border-color: rgba(248, 113, 113, 0.32);
  color: #f87171;
}
.file-type {
  position: absolute; bottom: 4px; left: 3px; right: 3px;
  text-align: center;
  font-size: 8px; font-weight: 800; letter-spacing: 0.06em;
  padding: 1px 3px; border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fef3c7;
}
.thumb-sheen {
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%);
  transform: translateX(-100%);
  transition: transform 0.8s var(--edoc-spring);
  pointer-events: none;
}
.dr-file:hover .thumb-sheen { transform: translateX(120%); }
.file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.file-name { font-size: 12.5px; font-weight: 700; color: var(--hr-text); word-break: break-all; line-height: 1.3; }
.file-sub { font-size: 10.5px; color: var(--hr-text-muted); }
.file-actions { display: flex; gap: 6px; flex-shrink: 0; }
.dr-icon-btn {
  position: relative;
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-accent-gold); cursor: pointer;
  transition: background .25s, border-color .25s, color .25s, box-shadow .25s;
}
.dr-icon-btn:hover {
  background: rgba(251, 146, 60, 0.18);
  border-color: rgba(251, 146, 60, 0.55);
  color: #fef3c7;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.45);
}
.dr-icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.hidden-input { display: none; }
.replace-btn input { display: none; }

/* Rejection card */
.dr-reject-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 11px 13px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(127, 29, 29, 0.10));
  border: 1px solid rgba(248, 113, 113, 0.32);
  color: #fca5a5;
}
.dr-reject-card > svg { flex-shrink: 0; margin-top: 2px; color: #f87171; }
.reject-label { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #f87171; margin-bottom: 2px; }
.reject-text { font-size: 12px; color: #fecaca; line-height: 1.4; }

/* Details grid */
.dr-details { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.detail-cell {
  display: flex; flex-direction: column; gap: 4px;
  padding: 11px 12px; border-radius: 11px;
  background: linear-gradient(135deg, rgba(40, 30, 22, 0.45), rgba(28, 22, 18, 0.35));
  border: 1px solid rgba(251, 191, 36, 0.10);
  transition: border-color .25s, background .25s;
}
.detail-cell:hover { border-color: rgba(251, 191, 36, 0.24); }
.detail-cell[data-empty="true"] {
  background: linear-gradient(135deg, rgba(40, 30, 22, 0.25), rgba(28, 22, 18, 0.20));
  border-color: rgba(255, 255, 255, 0.05);
}
.cell-label {
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.cell-value {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 600; color: var(--hr-text);
  word-break: break-word;
}
.cell-value.is-soon { color: var(--hr-orange, #fb923c); }
.cell-value.is-expired { color: #f87171; }
.cell-dd { font-size: 10px; color: var(--hr-text-muted); font-weight: 600; }
.cell-empty { font-size: 12px; color: var(--hr-text-muted); font-style: italic; opacity: 0.7; }
.cell-reveal {
  display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px;
  background: rgba(251, 191, 36, 0.14); border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-accent-gold); cursor: pointer;
  transition: all .2s var(--edoc-spring);
}
.cell-reveal:hover { background: rgba(251, 146, 60, 0.30); border-color: rgba(251, 146, 60, 0.55); transform: scale(1.08); }

/* Renew */
.dr-renew { display: flex; gap: 8px; align-items: stretch; }
.renew-input { flex: 1; }

/* Timeline */
.dr-timeline { list-style: none; margin: 0; padding: 2px 0; display: flex; flex-direction: column; gap: 0; }
.tl-item {
  position: relative;
  display: flex; gap: 12px;
  padding: 8px 0 8px 4px;
  margin-left: 6px;
}
.tl-line {
  position: absolute; left: 9px; top: 24px; bottom: -8px;
  width: 1px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.30), rgba(251, 191, 36, 0.06));
}
.tl-dot {
  position: relative;
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--hr-accent-gold);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.14), 0 0 12px rgba(251, 146, 60, 0.5);
  margin-top: 4px;
  flex-shrink: 0;
}
.tl-dot-pulse {
  position: absolute; inset: -4px; border-radius: 50%;
  background: var(--hr-accent-gold);
  animation: dr-tl-pulse 2s ease-out infinite;
  opacity: 0;
}
@keyframes dr-tl-pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(2.4); opacity: 0; }
}
.tl-item[data-action="VERIFIED"] .tl-dot { background: #34d399; box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.16), 0 0 12px rgba(16, 185, 129, 0.6); }
.tl-item[data-action="VERIFIED"] .tl-dot-pulse { background: #34d399; }
.tl-item[data-action="REJECTED"] .tl-dot,
.tl-item[data-action="EXPIRED"] .tl-dot { background: #f87171; box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.16), 0 0 12px rgba(239, 68, 68, 0.6); }
.tl-item[data-action="REJECTED"] .tl-dot-pulse,
.tl-item[data-action="EXPIRED"] .tl-dot-pulse { background: #f87171; }
.tl-item[data-action="ARCHIVED"] .tl-dot,
.tl-item[data-action="DELETED"] .tl-dot { background: #9ca3af; box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.16); }
.tl-body { flex: 1; padding-bottom: 4px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tl-action { font-size: 12.5px; font-weight: 700; color: var(--hr-text); letter-spacing: -0.005em; }
.tl-meta { font-size: 10px; color: var(--hr-text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tl-actor { color: var(--hr-accent-gold); font-weight: 600; }
.tl-sep { opacity: 0.5; }
.tl-note {
  font-size: 11.5px; color: var(--hr-text-secondary); margin-top: 4px;
  padding: 5px 8px; border-radius: 7px;
  background: rgba(251, 191, 36, 0.06);
  border-left: 2px solid rgba(251, 191, 36, 0.30);
}
.dr-timeline-empty {
  text-align: center; padding: 16px 0;
  font-size: 12px; color: var(--hr-text-muted); font-style: italic;
  border-radius: 10px;
  background: rgba(40, 30, 22, 0.25);
  border: 1px dashed rgba(251, 191, 36, 0.16);
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */
.dr-foot {
  position: relative; z-index: 2;
  padding: 14px 20px;
  background: linear-gradient(180deg, rgba(14, 12, 14, 0.6), rgba(20, 14, 10, 0.85));
  border-top: 1px solid rgba(251, 191, 36, 0.18);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.foot-row { display: flex; align-items: center; gap: 8px; }
.foot-spacer { flex: 1; }
.foot-reject { display: flex; flex-direction: column; gap: 10px; }

/* Buttons */
.dr-btn {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 14px; border-radius: 10px;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.01em;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text); cursor: pointer;
  overflow: hidden; isolation: isolate;
  transition: background .25s, border-color .25s, color .25s, box-shadow .25s, letter-spacing .3s;
}
.dr-btn:hover:not(:disabled) {
  background: rgba(251, 146, 60, 0.14);
  border-color: rgba(251, 146, 60, 0.55);
  color: #fef3c7;
  letter-spacing: 0.04em;
}
.dr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dr-btn-sm { padding: 8px 13px; font-size: 12px; }
.dr-btn.ghost {
  background: transparent; border-color: rgba(255, 255, 255, 0.10);
  color: var(--hr-text-secondary);
}
.dr-btn.ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
}
.dr-btn.primary {
  background:
    linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  background-size: 200% 200%;
  border-color: rgba(251, 146, 60, 0.60);
  color: #1f1408;
  box-shadow:
    0 10px 28px -10px rgba(251, 146, 60, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(180, 83, 9, 0.30);
}
.dr-btn.primary:hover:not(:disabled) {
  color: #1f1408;
  box-shadow:
    0 16px 38px -10px rgba(251, 146, 60, 0.85),
    inset 0 1px 0 rgba(255, 255, 255, 0.70);
  background-position: 100% 0%;
}
.dr-btn.primary::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.30) 50%, transparent 70%);
  transform: translateX(-110%);
  transition: transform .8s var(--edoc-spring);
}
.dr-btn.primary:hover:not(:disabled)::after { transform: translateX(110%); }
.dr-btn.danger {
  background: rgba(239, 68, 68, 0.12); border-color: rgba(248, 113, 113, 0.36);
  color: #fca5a5;
}
.dr-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.22); border-color: rgba(248, 113, 113, 0.65);
  color: #fecaca; box-shadow: 0 8px 22px -8px rgba(239, 68, 68, 0.5);
}
/* Danger-tinted ghost variant — sits between archive (neutral) and reject (loud). */
.dr-btn.ghost.danger-ghost {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.22);
}
.dr-btn.ghost.danger-ghost:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(248, 113, 113, 0.45);
  color: #fee2e2;
}
.spin { animation: dr-spin 0.9s linear infinite; }
@keyframes dr-spin { to { transform: rotate(360deg); } }

/* Drawer transitions */
.edoc-drawer-enter-active, .edoc-drawer-leave-active { transition: opacity 0.32s var(--edoc-spring, cubic-bezier(0.16,1,0.3,1)); }
.edoc-drawer-enter-from, .edoc-drawer-leave-to { opacity: 0; }
.edoc-drawer-enter-active .edoc-drawer { transition: transform 0.42s cubic-bezier(0.16,1,0.3,1); }
.edoc-drawer-leave-active .edoc-drawer { transition: transform 0.32s cubic-bezier(0.4,0,0.6,1); }
.edoc-drawer-enter-from .edoc-drawer, .edoc-drawer-leave-to .edoc-drawer { transform: translateX(100%); }

/* Reject-mode footer swap */
.foot-mode-enter-active, .foot-mode-leave-active { transition: opacity 0.22s var(--edoc-spring), transform 0.22s var(--edoc-spring); }
.foot-mode-enter-from { opacity: 0; transform: translateY(6px); }
.foot-mode-leave-to { opacity: 0; transform: translateY(-6px); }

/* ═══════════════════════════════════════════════════════════════════════════
   LIGHT THEME
   ═══════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .edoc-drawer-scrim {
  background: radial-gradient(60% 80% at 100% 50%, rgba(180, 83, 9, 0.20), rgba(40, 25, 10, 0.28) 70%);
}
[data-theme="light"] .edoc-drawer {
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 55%),
    radial-gradient(80% 50% at 0% 100%, rgba(180, 83, 9, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.94);
  border-left-color: rgba(180, 83, 9, 0.22);
  box-shadow:
    -40px 0 80px -30px rgba(120, 53, 15, 0.35),
    inset 1px 0 0 rgba(180, 83, 9, 0.10);
}
[data-theme="light"] .aurora-orb { opacity: 0.35; }
[data-theme="light"] .dr-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.12) 1px, transparent 1px);
  opacity: 0.5;
}
[data-theme="light"] .dr-hero { border-bottom-color: rgba(180, 83, 9, 0.14); }
[data-theme="light"] .dr-close {
  background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.22);
  color: #6b5840;
}
[data-theme="light"] .dr-close:hover {
  background: rgba(251, 146, 60, 0.18); border-color: rgba(194, 65, 12, 0.50);
  color: #7c2d12;
}
[data-theme="light"] .dr-hero-title {
  background: linear-gradient(135deg, #1a1410 0%, #7c2d12 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .dr-hero-icon { color: #7c2d12; background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(234, 88, 12, 0.18)); }
[data-theme="light"] .dr-mini-pill.conf { color: #7c2d12; background: rgba(251, 191, 36, 0.20); border-color: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .dr-mini-pill.src { color: #6b5840; border-color: rgba(120, 53, 15, 0.18); }
[data-theme="light"] .dr-mini-pill.arc { color: #4b5563; background: rgba(120, 113, 108, 0.16); border-color: rgba(120, 113, 108, 0.28); }

[data-theme="light"] .dr-section-head { color: #6b5840; }
[data-theme="light"] .dr-section-head > svg { color: #b45309; }
[data-theme="light"] .head-tag { background: rgba(251, 191, 36, 0.20); color: #92400e; border-color: rgba(180, 83, 9, 0.28); }
[data-theme="light"] .head-tag.ok { background: rgba(16, 185, 129, 0.16); color: #047857; border-color: rgba(16, 185, 129, 0.30); }
[data-theme="light"] .head-tag.warn { background: rgba(239, 68, 68, 0.14); color: #b91c1c; border-color: rgba(239, 68, 68, 0.32); }
[data-theme="light"] .head-hint { color: #6b5840; }

[data-theme="light"] .dr-employee,
[data-theme="light"] .dr-file {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 220, 0.80));
  border-color: rgba(180, 83, 9, 0.16);
}
[data-theme="light"] .dr-employee:hover,
[data-theme="light"] .dr-file:hover { border-color: rgba(180, 83, 9, 0.38); }
[data-theme="light"] .dr-file[data-has="false"] { background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(255, 250, 240, 0.85)); border-color: rgba(239, 68, 68, 0.22); }
[data-theme="light"] .emp-name, [data-theme="light"] .file-name { color: #1a1410; }
[data-theme="light"] .emp-sub, [data-theme="light"] .file-sub { color: #6b5840; }
[data-theme="light"] .file-thumb { background: linear-gradient(180deg, rgba(251, 191, 36, 0.22), rgba(180, 83, 9, 0.08)); border-color: rgba(180, 83, 9, 0.28); color: #047857; }
[data-theme="light"] .dr-file[data-has="false"] .file-thumb { background: linear-gradient(180deg, rgba(239, 68, 68, 0.14), rgba(239, 68, 68, 0.04)); border-color: rgba(239, 68, 68, 0.32); color: #b91c1c; }
[data-theme="light"] .file-type { background: rgba(120, 53, 15, 0.85); color: #fef3c7; }

[data-theme="light"] .dr-icon-btn { background: rgba(255, 250, 240, 0.8); border-color: rgba(180, 83, 9, 0.24); color: #b45309; }
[data-theme="light"] .dr-icon-btn:hover { background: rgba(251, 146, 60, 0.22); border-color: rgba(194, 65, 12, 0.55); color: #7c2d12; }

[data-theme="light"] .detail-cell {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.75), rgba(255, 244, 220, 0.55));
  border-color: rgba(180, 83, 9, 0.12);
}
[data-theme="light"] .detail-cell[data-empty="true"] {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.55), rgba(255, 244, 220, 0.35));
  border-color: rgba(180, 83, 9, 0.06);
}
[data-theme="light"] .detail-cell:hover { border-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .cell-label { color: #6b5840; }
[data-theme="light"] .cell-value { color: #1a1410; }
[data-theme="light"] .cell-value.is-soon { color: #c2410c; }
[data-theme="light"] .cell-value.is-expired { color: #b91c1c; }
[data-theme="light"] .cell-empty { color: #a8895c; }
[data-theme="light"] .cell-dd { color: #6b5840; }
[data-theme="light"] .cell-reveal { background: rgba(251, 191, 36, 0.22); border-color: rgba(180, 83, 9, 0.30); color: #b45309; }
[data-theme="light"] .cell-reveal:hover { background: rgba(251, 146, 60, 0.38); border-color: rgba(194, 65, 12, 0.55); }

[data-theme="light"] .tl-line { background: linear-gradient(180deg, rgba(180, 83, 9, 0.30), rgba(180, 83, 9, 0.08)); }
[data-theme="light"] .tl-dot { background: #b45309; box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.14), 0 0 10px rgba(194, 65, 12, 0.4); }
[data-theme="light"] .tl-action { color: #1a1410; }
[data-theme="light"] .tl-meta { color: #6b5840; }
[data-theme="light"] .tl-actor { color: #b45309; }
[data-theme="light"] .tl-note {
  color: #4b3a2a; background: rgba(251, 191, 36, 0.12);
  border-left-color: rgba(180, 83, 9, 0.45);
}
[data-theme="light"] .dr-timeline-empty {
  color: #8a7556; background: rgba(255, 250, 240, 0.55);
  border-color: rgba(180, 83, 9, 0.16);
}

[data-theme="light"] .dr-reject-card { background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.06)); border-color: rgba(220, 38, 38, 0.30); color: #b91c1c; }
[data-theme="light"] .dr-reject-card > svg { color: #b91c1c; }
[data-theme="light"] .reject-label { color: #991b1b; }
[data-theme="light"] .reject-text { color: #7f1d1d; }

[data-theme="light"] .dr-foot {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.7), rgba(255, 244, 220, 0.92));
  border-top-color: rgba(180, 83, 9, 0.18);
}
[data-theme="light"] .dr-btn { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.24); color: #1a1410; }
[data-theme="light"] .dr-btn:hover:not(:disabled) { background: rgba(251, 146, 60, 0.18); border-color: rgba(194, 65, 12, 0.55); color: #7c2d12; }
[data-theme="light"] .dr-btn.ghost { background: transparent; border-color: rgba(120, 53, 15, 0.18); color: #6b5840; }
[data-theme="light"] .dr-btn.ghost:hover:not(:disabled) { background: rgba(255, 244, 220, 0.6); border-color: rgba(180, 83, 9, 0.32); color: #1a1410; }
[data-theme="light"] .dr-btn.primary {
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c);
  color: #fff;
  border-color: rgba(194, 65, 12, 0.4);
  box-shadow: 0 10px 26px -10px rgba(194, 65, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
[data-theme="light"] .dr-btn.danger { background: rgba(239, 68, 68, 0.10); border-color: rgba(220, 38, 38, 0.32); color: #b91c1c; }
[data-theme="light"] .dr-btn.danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.18); border-color: rgba(220, 38, 38, 0.55); color: #991b1b; }
[data-theme="light"] .dr-btn.ghost.danger-ghost { color: #b91c1c; border-color: rgba(220, 38, 38, 0.22); background: rgba(255, 250, 240, 0.6); }
[data-theme="light"] .dr-btn.ghost.danger-ghost:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.10); border-color: rgba(220, 38, 38, 0.48); color: #7f1d1d;
}
</style>
